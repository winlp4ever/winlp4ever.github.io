---
title: Elasticsearch best practices, and a few twists nobody mentions
date: 2025-07-15
updated: 2026-10-06
description: What I check first when an Elasticsearch cluster gets slow. Shards, segments, refreshes, and the profiling result that changed how we fetch ids.
tags: [elasticsearch, infra, performance]
category: infra
glyph: search
figures: 6
---

This started as an internal doc for my AI team, after a few weeks of chasing a slow Elasticsearch cluster. Searches were snappy in dev and miserable in prod, and the first few things we "fixed" were not the problem. What survived is a checklist of things I verify now, roughly in the order I'd check them, plus a couple of twists I really didn't see coming.

The snippets use the Python client. Everything here also exists as a plain REST call if that's more your thing.

## the shape of your data

Before tuning anything, I want to know what the cluster is actually holding. An **index** is split into **shards**, and each shard is a complete, self-contained Lucene index (Lucene is the search library under Elasticsearch). Shards come in two flavours:

- primary shards, where documents are written first
- replica shards, copies of a primary that live on a different node

Replicas buy you two things. If a node dies, a replica of each primary it held gets promoted, so nothing is lost and writes keep working. And searches can be served by any copy, so replicas spread the read load across more machines.

<figure class="wide">
<es-anatomy data-fig data-label="fig 1 · shards on nodes">
<p class="fallback">Three nodes hold the shards of one index. With 3 primaries and 1 replica there are 6 shards, two per node, and no replica sits on the same node as its primary. Sliders change the index size, the number of primaries and the number of replicas; each shard tile shows its size against the 10 to 50 GB sweet spot.</p>
</es-anatomy>
<figcaption><b>fig 1</b>Play with the sliders. The allocation follows the one hard rule (a replica never shares a node with its primary), and the size verdict uses the shard table further down.</figcaption>
</figure>

Here's how I check shard settings for one index:

```python
from elasticsearch import Elasticsearch

es_client = Elasticsearch(...)

settings = es_client.indices.get(index=es_index.name)

for index, config in settings.items():
    num_shards = config['settings']['index']['number_of_shards']
    num_replicas = config['settings']['index']['number_of_replicas']
    print(f"Index: {index}")
    print(f"  Primary shards: {num_shards}")
    print(f"  Replicas per shard: {num_replicas}")
```

And for every shard in the cluster at once:

```python
shards = es_client.cat.shards(format="json")

for shard in shards:
    print(f"Index: {shard['index']} | Shard: {shard['shard']} | State: {shard['state']} | Node: {shard['node']}")
```

## how many shards is too many

Each index has its own shards, and replicas count too. With *n* indices, *k* primaries each and *r* replicas, the cluster carries *n × k × (1 + r)* shards. That number creeps up faster than you'd think, because every new index brings its own set.

My rule of thumb: keep it to **50–100 shards per node**. If each index has one primary and one replica, that's only 25 to 50 indices per node.<span class="sn">This is deliberately conservative. Elasticsearch's hard default cap is 1,000 shards per node (<code>cluster.max_shards_per_node</code>), and older docs suggested at most 20 shards per GB of heap. The cap tells you when it refuses to work, not when it starts to hurt.</span>

```python
from collections import Counter

shard_counts = Counter([shard["node"] for shard in shards])
print("Shard distribution per node:")
for node, count in shard_counts.items():
    print(f"  {node}: {count} shards")
```

The second rule is about size:

| Shard size | Status | Use when… |
| --- | --- | --- |
| 10–50 GB | ideal | most general-purpose use cases |
| < 10 GB | too small | lots of overhead for very little data |
| 50–100 GB | acceptable | only if the nodes have plenty of heap |
| > 100 GB | risky | GC trouble, very slow recovery and rebalancing |

Average shard size, from the same `cat.shards` output:

```python
total_size_mb = 0
shard_count = 0

for shard in shards:
    store_size = (shard.get("store") or "0mb").lower()
    if store_size.endswith("gb"):
        size = float(store_size[:-2]) * 1024
    elif store_size.endswith("mb"):
        size = float(store_size[:-2])
    else:
        size = 0
    total_size_mb += size
    shard_count += 1

avg_size = total_size_mb / shard_count if shard_count else 0
print(f"\nAverage shard size: {avg_size:.2f} MB")
```

Tiny shards hurt because each one is a full Lucene index with its own files, caches, merges and bookkeeping in the JVM. A search also has to visit every shard of the index and then combine the answers, so a hundred little shards means a hundred little searches to coordinate.

## segments pile up

One level down, each shard is made of **segments**. A segment is a small, read-only index of some documents. Elasticsearch never edits a segment in place: new documents go into new segments, and a delete only marks a document as gone until its segment gets rewritten.

So segments get added over time, every time documents are indexed and refreshed. (The first time I printed this number I said a bad word.) In the background, Lucene keeps merging small segments into bigger ones, which is where deleted documents finally disappear.

Here's how many segments each shard of an index has:

```python
segments = es_client.indices.segments(index=es_index.name)

for shard_id, shard_info in segments['indices'][es_index.name]['shards'].items():
    for replica in shard_info:
        segment_count = replica['num_search_segments']
        node = replica['routing']['node']
        print(f"Shard {shard_id} on node {node} → {segment_count} segments")
```

If an index has far too many, you can force a merge. It's heavy on I/O and it can take a while:

```python
response = es_client.indices.forcemerge(
    index=es_index.name,
    max_num_segments=2,
    only_expunge_deletes=False,
    flush=True,
    wait_for_completion=True,
    request_timeout=600,
)

print("Force merge triggered:", response)
```

Only do this on an index you're done writing to. Force-merging a live index can leave you with huge segments that the normal merge policy then avoids touching, and the deleted documents inside them stick around.<span class="sn">The Elasticsearch docs say the same thing: force merge is meant for read-only indices, for example yesterday's logs.</span>

## refresh is expensive

A **refresh** is what makes newly indexed documents visible to search. Until the next refresh, a document is indexed but not searchable: it sits in an in-memory buffer (and in the translog, so it isn't lost). A refresh turns that buffer into a brand new segment and opens it for search.

By default this happens every second, set by `index.refresh_interval`.<span class="sn">One twist: if you never set <code>refresh_interval</code> yourself, a shard that hasn't seen a search for 30 seconds goes "search idle" and stops refreshing until the next search arrives.</span> Note that a refresh doesn't fsync anything to disk. That's a flush, a separate and much rarer operation.

<figure class="wide">
<es-refresh data-fig data-label="fig 2 · refresh">
<p class="fallback">Documents arrive at a steady rate for 18 seconds. With a 1 second refresh interval, each refresh turns the buffer into a tiny new segment, and small segments keep getting merged. With 5 seconds there are fewer, bigger segments. With refresh disabled and one manual refresh at the end, nothing is searchable until the end, and then everything lands in a single segment with no merging. A chart below compares indexed and searchable documents over time.</p>
</es-refresh>
<figcaption><b>fig 2</b>The same 72 documents under three settings. The merge policy here is a toy version of Lucene's tiered one, but the shape is right: frequent refreshes mean many tiny segments, and tiny segments mean merge work.</figcaption>
</figure>

Refreshing every second is great when you need fresh results. During a big load it's pure overhead: each refresh produces a tiny segment, the tiny segments then have to be merged, and all of it burns CPU and I/O that your indexing could have used.

So during bulk indexing:

1. turn refresh off
2. do the bulk load
3. refresh once at the end
4. put the interval back

```python
from elasticsearch import Elasticsearch, helpers

es = Elasticsearch("http://localhost:9200")

INDEX_NAME = "my-index"

# 1. Disable automatic refresh
es.indices.put_settings(
    index=INDEX_NAME,
    body={"index": {"refresh_interval": "-1"}},
)

# 2. Bulk indexing
documents = [
    {"_index": INDEX_NAME, "_id": i, "_source": {"title": f"Doc {i}", "value": i}}
    for i in range(10000)
]

helpers.bulk(es, documents)

# 3. Manually trigger a refresh
es.indices.refresh(index=INDEX_NAME)

# 4. Restore the default refresh interval (optional)
es.indices.put_settings(
    index=INDEX_NAME,
    body={"index": {"refresh_interval": "1s"}},
)

print("Bulk indexing completed with optimized refresh settings.")
```

## profile your query (the important one)

If you take one thing from this post, take this section. Profiling splits a query into its phases and tells you how long each one took. It's the only honest way I know to find the bottleneck, because my guesses about where the time goes have been wrong more often than right.

A normal search runs in two phases:

- **query phase**: the request goes to every shard, each shard scores its documents and sends back only ids and scores for its best hits
- **fetch phase**: the node that coordinates the search merges those lists, keeps the overall top hits, and asks just the shards holding them for the actual documents

<figure class="wide">
<es-phases data-fig data-label="fig 3 · query then fetch">
<p class="fallback">A search arrives at the coordinating node. In the query phase it scatters to three shards; each scores its own documents and returns ids and scores. The coordinating node merges the nine candidates and keeps the top three: #12 from shard 0, and #3 and #28 from shard 1. In the fetch phase it asks only shards 0 and 1 for those three documents; shard 2 has nothing to fetch.</p>
</es-phases>
<figcaption><b>fig 3</b>Query then fetch, for a top-3 search over three shards. The query phase moves tiny packets. The fetch phase moves documents, and only for the winners.</figcaption>
</figure>

Here's how our code originally looked. The comments are what we believed at the time:

```python
# this is how we did it in our code originally
# we disable source (source=False) so the query only returns score + id
# only data from memory, so it should be fast right?

profile = es_client.search(
    index="search_185_dev_v1",
    profile=True,
    size=10000,
    source=False,
    query={
        "match": {
            "block.text.text": "AI"
        }
    },
)

print("Profile took:", profile["took"], "ms")
for shard in profile["profile"]["shards"]:
    print("Shard query time:", shard["searches"][0]["query"][0]["time_in_nanos"] / 1e6, "ms")
    print("Shard fetch time:", shard["fetch"]["time_in_nanos"] / 1e6, "ms")
```

Wrong. It was very slow. To see everything, print the whole profile:

```python
print(json.dumps(dict(profile)['profile'], indent=2))
```

<details>
<summary>a profile result, trimmed</summary>

```json
{
  "shards": [
    {
      "id": "[61N79He-S1u1hbGEXAHJAw][external_referential_rncp_dev_v1][0]",
      "node_id": "61N79He-S1u1hbGEXAHJAw",
      "shard_id": 0,
      "index": "external_referential_rncp_dev_v1",
      "cluster": "(local)",
      "searches": [
        {
          "query": [
            {
              "type": "ConstantScoreQuery",
              "description": "ConstantScore(*:*)",
              "time_in_nanos": 2606684,
              "breakdown": { "next_doc": 2566124, "next_doc_count": 10001 }
            }
          ],
          "rewrite_time": 8000,
          "collector": [
            {
              "name": "QueryPhaseCollector",
              "reason": "search_query_phase",
              "time_in_nanos": 7681516
            }
          ]
        }
      ],
      "aggregations": [],
      "fetch": {
        "type": "fetch",
        "time_in_nanos": 2911239639,
        "breakdown": {
          "load_stored_fields": 2891235809,
          "load_stored_fields_count": 10000
        }
      }
    }
  ]
}
```

</details>

Read the numbers in nanoseconds and the story jumps out. Finding the 10,000 matching documents took a couple of milliseconds. Fetching them took almost three seconds, and nearly all of that was one step, `load_stored_fields`.

<figure class="wide">
<es-profile data-fig data-label="fig 4 · where the time went">
<p class="fallback">Bars from the profile above. Rewrite took 0.008 ms, the query 2.607 ms, the collector 7.682 ms, the rest of the fetch phase 20 ms, and load_stored_fields 2,891 ms. On a linear scale only the last bar is visible. Fetch is 99.6% of the measured time, about 0.29 ms per hit.</p>
</es-profile>
<figcaption><b>fig 4</b>The real numbers from the profile above, on a linear scale and a log scale. On the linear one, everything we had been tuning is a sliver.</figcaption>
</figure>

## why fetching ids was slow

We had turned `_source` off, so why was the fetch loading anything? Because of where `_id` lives. It isn't in memory at all. `_id` is a **stored field**, which means it lives on disk next to the other stored fields, and `_source` is stored right there with it.

Lucene keeps a document's stored fields together and compresses many documents at a time into chunks. To read one value for one document, it has to decompress that document's chunk. So with `source=False`, every one of our 10,000 hits still unpacked a chunk full of `_source` just to pull out a short id.

<figure class="wide">
<es-stored data-fig data-label="fig 5 · stored fields vs doc values">
<p class="fallback">Eight hits are read one by one. With source set to False, each hit opens the compressed chunk that holds its document, decoding all six documents in it, _source included, to read one id: eight chunks and 48 documents decoded. With stored_fields set to "_none_" and the id read from doc values, each hit reads a single value from a column and no chunk is opened.</p>
</es-stored>
<figcaption><b>fig 5</b>Same eight hits, two ways to read their ids. Real chunks hold many more documents than six; the drawing keeps it small.</figcaption>
</figure>

It helps to know the four ways a search can return field values:

| Parameter | Pulls from | Best for |
| --- | --- | --- |
| `_source` | the original JSON | returning whole or partial documents |
| `stored_fields` | fields mapped with `store: true` | a few specific stored fields |
| `fields` | the mapping (via `_source` or doc values) | values formatted the way the mapping says |
| `docvalue_fields` | doc values (a column per field) | numbers, dates, keywords, sorting and aggregations |

<details>
<summary>more on each one</summary>

`_source` is the original JSON document as it was indexed. Searches and gets return it by default, and you can ask for just part of it:

```json
"_source": ["title", "author"]
```

Use it when you want the actual document content.

`stored_fields` only returns fields mapped with `store: true`. Fields aren't stored separately by default, because `_source` already keeps the whole document. Ask for a field that isn't stored and you get nothing back:

```json
"stored_fields": ["title"]
```

`fields` asks for values the way the mapping sees them. It works without `store: true`, handles multi-valued fields and runtime fields, and formats values (dates, for example) consistently:

```json
"fields": ["publish_date", "category"]
```

`docvalue_fields` reads from doc values, a columnar on-disk structure built for sorting, aggregations and scripts. Keyword, numeric and date fields have doc values by default; `text` fields don't. Handy when you want a formatted date or number without touching `_source`:

```json
"docvalue_fields": [
  { "field": "publish_date", "format": "yyyy-MM-dd" }
]
```

</details>

More in the [Elasticsearch docs on retrieving selected fields](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrieve-selected-fields).

The fix is to read the id from doc values and switch stored fields off completely. `_id` has no doc values, so you have two options.

The old way is to let `_id` load into the field data cache, on the heap:

```python
es.cluster.put_settings(body={
    "persistent": {
        "indices.id_field_data.enabled": True
    }
})

print("✅ _id fielddata enabled.")
```

It's deprecated though, and heap is exactly what you don't want to spend. What we ended up doing instead was keeping our own `id` keyword field in every document (keyword fields have doc values for free) and reading that.

Then the query changes in two small, very significant ways:

```python
profile = es_client.search(
    index="search_185_dev_v1",
    profile=True,
    size=1000,
    source=False,
    query={
        "match": {
            "block.text.text": "AI"
        }
    },
    docvalue_fields=["id"],   # or "_id" if you enabled the fielddata setting above
    stored_fields="_none_",   # not None (the default), not [], it has to be
                              # the string "_none_" to skip stored fields (wth)
)
```

`stored_fields="_none_"` is the part that kills `load_stored_fields`: it tells Elasticsearch not to load any stored field, `_id` and `_source` included. On its own, `docvalue_fields` doesn't help, because the fetch would still open every chunk to get `_id`.

## is the cluster ok?

Two boring checks that would have saved me a few evenings. First, the search thread pool on each node:

```python
thread_pool_stats = es_client.nodes.stats(metric="thread_pool")

for node_id, stats in thread_pool_stats["nodes"].items():
    thread_pools = stats["thread_pool"]
    search_pool = thread_pools.get("search", {})
    print(f"Node: {stats['name']}")
    print(f"  Active: {search_pool.get('active')}")
    print(f"  Queue: {search_pool.get('queue')}")
    print(f"  Rejected: {search_pool.get('rejected')}")
```

`rejected` is a running total of searches that found the queue full and got bounced (clients see HTTP 429). If it keeps climbing, the nodes can't keep up.

Then heap, CPU and disk:

```python
node_stats = es.nodes.stats(metric=["jvm", "fs", "os", "thread_pool"])

for node_id, node in node_stats["nodes"].items():
    name = node["name"]
    heap = node["jvm"]["mem"]
    cpu = node["os"]["cpu"]
    fs = node["fs"]["total"]

    print(f"\nNode: {name}")
    print(f"  Heap used: {heap['heap_used_percent']}%")
    print(f"  CPU load avg (1m): {cpu['load_average']['1m']}")
    print(f"  Disk free: {fs['free_in_bytes'] / fs['total_in_bytes']:.1%}")
```

What I want to see on every node: heap under 60%, a CPU that's mostly bored, and disk under 80%. The disk number isn't arbitrary. Elasticsearch starts changing its behaviour at 85%, and it gets less polite from there.

<figure class="wide">
<es-disk data-fig data-label="fig 6 · disk watermarks">
<p class="fallback">A disk usage slider for one node against the default watermarks. Below 85% nothing happens. At the low watermark, 85%, no new shards are allocated to the node. At the high watermark, 90%, shards are moved to other nodes. At the flood stage, 95%, indices with a shard on the node become read-only until usage drops below the high watermark. My own alert sits at 80%.</p>
</es-disk>
<figcaption><b>fig 6</b>Drag the disk. The thresholds are Elasticsearch's defaults (<code>cluster.routing.allocation.disk.watermark.*</code>); 80% is just where I like to get paged.</figcaption>
</figure>

## take-home

- 10–50 GB per shard, and far fewer shards per node than the cap allows
- force merge only indices you've finished writing to
- for bulk loads, set `refresh_interval` to `-1`, load, refresh once, then restore it
- run `profile=True` before changing anything; ours was 99.6% fetch
- if you only need ids, read them from doc values and set `stored_fields="_none_"`
- alert on rejected searches, heap and disk before you hit 85%
