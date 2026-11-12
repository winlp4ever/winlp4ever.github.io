---
title: How HNSW works, and why constant writes are hard on it
date: 2026-11-12
description: HNSW is the default vector index in almost every database. This post explains the graph and why a search touches so few vectors, then why building it costs so much, what that does to databases that take writes all day, and how Elasticsearch, Qdrant, Milvus, Weaviate, pgvector, ClickHouse and newer designs deal with it.
tags: [search, vectors, algorithms, infra]
category: code
glyph: graph
figures: 6
math: true
---

Nearly every vector database ships HNSW as its default index: Elasticsearch, OpenSearch, Qdrant, Milvus, Weaviate, pgvector, Redis, Vespa and ClickHouse all have it. It answers a nearest-neighbour query over millions of vectors by looking at a few hundred of them. Adding one vector to the graph costs more than a query: a search plus some rewiring, and a database that receives new vectors every second spends a lot of CPU on that, sometimes enough to slow its searches down. Elasticsearch is known for it, and the problem turns up in most other systems too.

This post explains the graph first, then the write problem, then what each database and the recent research do about it.

## brute force

A query vector $$q$$ and a table of $$N$$ vectors. The exact answer needs the distance from $$q$$ to every row: $$N$$ distance computations, each one $$d$$ multiply-adds. For a million 768-dimension vectors that is 768 million multiply-adds per query. It's simple and it's exact, and it gets slow in proportion to $$N$$.

An approximate index trades a little recall (the share of the true nearest neighbours it finds) for doing far fewer distance computations.

## small worlds

HNSW grew out of NSW, the navigable small world graph that Yury Malkov and three co-authors published in 2014<sup><a href="#src-1">1</a></sup>. Every vector is a node, linked to some of its near neighbours. To search, start at any node, compute the distance from the query to each of its neighbours, move to the closest one, and repeat until no neighbour is closer than where you stand. That's **greedy routing**.

Inserting into NSW is the same move: search for the new vector's nearest neighbours and link it to them. Early nodes were inserted when the graph was sparse, so their links span long distances, and later nodes add short local links. The long links let a search cross the space in a few hops; the short ones let it finish precisely.

Plain NSW is slower than it needs to be. The long links pile up on a few early hub nodes whose number of links grows with $$N$$, and a search that passes through a hub has to compute the distance to all its neighbours. Malkov and Yashunin measured the total work at polylogarithmic in $$N$$<sup><a href="#src-2">2</a></sup>.

## the layers

HNSW, from Malkov and Yashunin in 2016 (the journal version came out in 2018), sorts the links by length into layers<sup><a href="#src-2">2</a></sup>. Every vector is on layer 0. Each vector also gets a random top level, $$\lfloor -\ln(u) \cdot m_L \rfloor$$ with $$u$$ uniform in (0, 1), and it appears on every layer up to that level. With $$m_L = 1/\ln M$$, each layer holds about $$1/M$$ of the layer below, so with $$M = 16$$ a million vectors make about five layers. It's a skip list made of graphs.

A search starts at the single entry point on the top layer, routes greedily to the node closest to the query, drops to the layer below at that node and routes again. On layer 0 it switches from pure greedy to a small beam search: it keeps the best `ef` candidates found so far and stops when none of their unexplored neighbours can improve the list. A bigger `ef` (`ef_search` in most databases) means better recall and a slower query.

<figure class="wide">
<hn-search data-fig data-label="fig 1 · a search through the layers">
<p class="fallback">Three panels show layer 2, layer 1 and layer 0 of a small graph over sixty points. The query starts at a top-layer node, hops towards the query point, drops to the same node on layer 1, hops again, and drops to layer 0 where it reaches its nearest neighbour. A counter shows how many distances were computed along the way, against sixty for brute force.</p>
</hn-search>
<figcaption><b>fig 1</b>Greedy routing through three layers. Highlighted points are the ones whose distance the search computed. The graph links each point to its nearest neighbours in the layer, and layer 0 uses plain greedy routing here, where HNSW keeps a beam of <code>ef</code> candidates.<span class="m">Sixty random points, levels drawn with M = 4.</span></figcaption>
</figure>

Three parameters control the graph:

- `M` is how many links a node gets on each upper layer. Layer 0 allows `2M`; the paper found that capping layer 0 at `M` costs "a very strong performance penalty"<sup><a href="#src-2">2</a></sup>.
- `ef_construction` is the beam width used while inserting. Higher builds a better graph, more slowly.
- `ef_search` is the beam width at query time.

The links take memory on top of the vectors: the paper puts it at 60 to 450 bytes per vector for `M` between 6 and 48<sup><a href="#src-2">2</a></sup>.

## how many distances a search computes

The paper proves $$O(\log N)$$ search only for low-dimensional data that has an exact Delaunay graph, and it notes that on 200 million SIFT vectors the measured scaling "deviates from the pure logarithm"<sup><a href="#src-2">2</a></sup>. I couldn't find a published table of distance computations per query against $$N$$, so I wrote a small HNSW in JavaScript that follows the paper's algorithms and counted<sup><a href="#src-3">3</a></sup>. The data is 32-dimensional, drawn from 1,000 overlapping Gaussian clusters, with `M = 16`, `ef_construction = 100` and `ef_search = 64`.

<figure class="wide">
<hn-count data-fig data-label="fig 2 · distance computations, measured">
<p class="fallback">A log-log chart of distance computations against the number of vectors, from 1,000 to 300,000. Brute force is a straight line equal to N. An HNSW query stays between about 600 and 1,100 distance computations at every size, with recall@10 above 0.99. An HNSW insert costs between 1,300 and 2,300 distance computations once the index holds 10,000 vectors or more.</p>
</hn-count>
<figcaption><b>fig 2</b>Work per query and per insert as the index grows. Hover a point for the exact count and the recall.<span class="m">My measurement with scripts/hnsw-count.mjs: 32-d clustered data, 200 queries per size, recall@10 against brute force.</span></figcaption>
</figure>

**At 100,000 vectors a query computed 727 distances and found 99.8% of the true top 10.** Brute force computed 100,000. The count wanders between 600 and 1,100 because the clusters fill up as the data grows. The Faiss wiki has the same picture in wall-clock time on SIFT1M: HNSW answers in 0.033 ms at 0.978 recall@1 with `efSearch = 64`, and an IVF index needs 0.344 ms to reach 0.986<sup><a href="#src-4">4</a></sup>.

## the neighbour rule

Linking each new node to its `M` nearest neighbours works badly on clustered data. All `M` links land inside the node's own cluster and nothing points out of it. HNSW's insert uses a heuristic instead (Algorithm 4 in the paper)<sup><a href="#src-2">2</a></sup>. It goes through the candidates nearest first and keeps one only if it is closer to the new node than to every neighbour already kept. A second candidate in the same direction as a kept one gets skipped, so the links spread out in different directions and some of them reach the next cluster.

Every one of those checks is another distance computation, which is part of why inserts cost more than queries in fig 2.

## the layers may not matter

In December 2024 Blaise Munyampirwa, Vihan Lakshman and Benjamin Coleman tested a flat version of HNSW, layer 0 alone, against the full hierarchy on 13 datasets up to 100 million vectors<sup><a href="#src-5">5</a></sup>. They found "no consistent and discernable gap" in median or p99 latency at the same recall, and conclude that the hierarchy speeds up search only below about 32 dimensions. The flat graph used up to 39% less peak memory while building on the 100-million-vector datasets.

Their explanation is a **hub highway**: in high dimensions a small set of nodes (1 to 5% of them) end up linked mostly to each other, and searches use them heavily in their first 5 to 10% of steps. The hubs do the job the upper layers were designed for. Embeddings have hundreds of dimensions, so on embedding data the upper layers add memory without making search faster.

## an insert is a search

Adding a vector runs the whole search descent with `ef_construction` as the beam (100 to 500 is usual, against 40 to 100 for `ef_search`). On each layer the new node gets linked, and every neighbour whose link list is now over the cap runs the neighbour rule again to drop a link.

<figure class="wide">
<hn-insert data-fig data-label="fig 3 · one insert">
<p class="fallback">A new point appears in the middle of a graph. A greedy search walks from an entry node towards it, computing distances to every neighbour it passes. The new point then links to its three nearest nodes. One of those nodes now has one link more than its cap, and its longest link is removed.</p>
</hn-insert>
<figcaption><b>fig 3</b>The three parts of an insert. The search here is greedy and the neighbours are simply the nearest three; real HNSW uses a beam of <code>ef_construction</code> candidates and the neighbour rule.<span class="m">Thirty-four random points.</span></figcaption>
</figure>

In my measurement an insert computed between 1,300 and 2,300 distances once the index held 10,000 vectors or more, about twice as many as a query. Building the 100,000-vector index computed about 200 million distances in total, as much work as 2,000 brute-force queries over the same data. Building is slow at real scale too:

- The HNSW paper built 200 million SIFT vectors in 42 minutes with `ef_construction = 40` and in 5.6 hours with 500, on a 40-core machine<sup><a href="#src-2">2</a></sup>.
- Elastic measured 1,054 seconds to index 1 million vectors into HNSW with BBQ quantization<sup><a href="#src-6">6</a></sup>.
- pgvector 0.5.0 took 7,479 seconds to build an HNSW index on dbpedia's 1 million vectors<sup><a href="#src-7">7</a></sup>.

A brute-force query needs no preparation, so under frequent writes an index has to answer many queries before its build cost pays off.

### deletes

HNSW has no real delete. hnswlib marks a deleted node so it's left out of results while it stays in the graph to keep routes working<sup><a href="#src-8">8</a></sup>. Removing nodes for real breaks routes. Xiao and co-authors deleted and reinserted 5% of SIFT1M per round: after about 3,000 rounds, 3 to 4% of the points could no longer be reached from the entry point and recall had dropped about 3%<sup><a href="#src-9">9</a></sup>. Databases clean up marked nodes in background jobs that rewire their neighbours, and those jobs are expensive.

## the variants

| index | year | idea | headline result |
|---|---|---|---|
| NSG<sup><a href="#src-10">10</a></sup> | 2017 | one navigating entry point, pruned graph | deployed in Taobao search |
| DiskANN (Vamana)<sup><a href="#src-11">11</a></sup> | 2019 | flat graph with relaxed pruning, kept on SSD, compressed vectors in RAM | 1 billion SIFT vectors on a 64 GB machine, over 5,000 QPS at 95% recall@1 |
| FreshDiskANN<sup><a href="#src-12">12</a></sup> | 2021 | small in-memory graph for new data, merged into the SSD graph in batches | thousands of inserts and deletes per second at over 95% recall |
| SPANN<sup><a href="#src-13">13</a></sup> | 2021 | clusters: centroids in RAM, lists of vectors on SSD | 2× faster than DiskANN at 90% recall, same memory |
| SPFresh<sup><a href="#src-14">14</a></sup> | 2023 | SPANN with clusters split and reassigned in place | 1% of the DRAM and under 10% of the cores of a global rebuild |
| ACORN<sup><a href="#src-15">15</a></sup> | 2024 | HNSW that checks filters during the walk | 2 to 1,000× more throughput at fixed recall on filtered queries |
| CAGRA<sup><a href="#src-16">16</a></sup> | 2024 | graph built and searched on GPU | builds 2.2 to 27× faster than CPU HNSW |
| RaBitQ<sup><a href="#src-17">17</a></sup> | 2024 | one bit per dimension with an error bound | 32× smaller vectors; Elastic's BBQ derives from it |
| Jasper<sup><a href="#src-18">18</a></sup> | 2026 | GPU Vamana with lock-free streaming inserts | about 7× faster build than CAGRA |
| LSM-VEC<sup><a href="#src-19">19</a></sup> | 2025 | graph stored in an LSM tree on disk | up to 15× fewer bytes written per insert than FreshDiskANN and SPFresh |

The graph indexes (NSG, DiskANN, CAGRA) are all close relatives of HNSW with one flat layer. The others replace the graph with clusters, an IVF index: assign each vector to its nearest centroid, then search only the few closest clusters. IVF searches slower than a graph at very high recall, but adding a vector to IVF means one comparison against the centroids and an append, so inserts cost far less. That difference matters for the rest of this post.

## writes that keep coming

Most databases don't keep one big graph. Lucene (inside Elasticsearch and OpenSearch), Qdrant, Milvus and ClickHouse write data into immutable **segments** and merge small segments into bigger ones in the background. Each segment has its own HNSW graph, and a merge needs a graph for the new segment. The simple way is to build it again from all the vectors, so a vector that goes through two rounds of merges gets inserted into a graph three times.

<figure class="wide">
<hn-amp data-fig data-label="fig 4 · graph insertions per vector written">
<p class="fallback">Lines show graph insertions per vector written as 990,000 vectors arrive in batches of a thousand. A single mutable graph stays at one. Rebuilding on every merge climbs in steps to 2.9. Reusing the largest input graph ends at 2.7, and joining graphs, at about 30% less merge work, ends at 2.3.</p>
</hn-amp>
<figcaption><b>fig 4</b>Write amplification of the graph under segment merges. Merges of equal-size segments gain little from reusing the largest graph, because every input is the same size.<span class="m">My simulation: one segment per thousand vectors, merges of ten same-size segments, stopped just before the merge into one segment of a million. Lucene's real merge policy picks segments by size and caps them at 5 GB.</span></figcaption>
</figure>

Three things go wrong under constant writes:

1. The CPU spent on graph building competes with searches on the same nodes.
2. New data waits for its graph. A database either searches it by brute force, which is slow, or hides it, which means the newest writes are missing from results.
3. Many small segments each have their own graph, and a query has to search all of them.

### elasticsearch

Every refresh (once per second by default) writes a new segment with a new graph, and merges combine about ten segments at a time. Elastic says it plainly: "Merging segments requires recomputing HNSW graphs, incurring index-time overhead"<sup><a href="#src-20">20</a></sup>. An update to any field of a document reindexes the whole document, vector included<sup><a href="#src-21">21</a></sup>. A user with 90 million 768-dimension vectors reported that heavy indexing pushed the graphs out of memory and kNN searches turned into "insanely high disk IO"; Elastic's advice was to build on separate nodes and switch an alias<sup><a href="#src-22">22</a></sup>.

The fixes so far, in order:

- **Reuse the biggest graph on merge** (Lucene, February 2023): the merged segment starts from the largest input's graph. Merge time fell about 42% with segments of 500,000 vectors and 3 to 5% at 100,000. It only applies to segments without deletes<sup><a href="#src-23">23</a></sup>.
- **SIMD distance code** through Java's Panama API (Lucene 9.10, Elasticsearch 8.13) raised indexing from about 900 to about 1,300 documents per second on one dataset<sup><a href="#src-20">20</a></sup>.
- **Join graphs on merge** (Lucene 10.2, April 2025) uses the smaller graphs' neighbourhoods so that only a covering subset of nodes needs a full search. Merges got a little over 30% faster on average; one int8 merge went from 536 to 279 seconds<sup><a href="#src-24">24</a></sup>.
- **DiskBBQ** (GA December 2025) drops the graph for clusters. On 1 million vectors it indexed in 94 seconds against 1,054 for HNSW with BBQ, at 91% recall against 92%<sup><a href="#src-6">6</a></sup>. Elastic still recommends HNSW when recall has to be very high and updates are rare.
- **GPU builds** through NVIDIA cuVS (technical preview in 9.3): about 12× the indexing throughput and 7× faster force-merges on 2.6 million 1,536-dimension vectors. Against a CPU machine of the same price the gains are about 5× and 6×. It needs an Enterprise licence<sup><a href="#src-25">25</a></sup>.

### opensearch

OpenSearch 3.1 made remote GPU index builds generally available. Large segments are sent to a GPU service at flush and merge time, and one benchmark went from 273.8 minutes on CPU to 29.1 on GPU<sup><a href="#src-26">26</a></sup>. The jVector plugin (3.5 and later) merges graphs incrementally "with no full graph rebuilds" and builds in parallel, 6.5× faster than one thread on 100,000 vectors<sup><a href="#src-27">27</a></sup>.

### qdrant

Qdrant indexes a segment only after its unindexed vectors pass `indexing_threshold`; until then it scans them. Its docs measure what that does on 1.76 million 1,024-dimension vectors<sup><a href="#src-28">28</a></sup>:

<figure class="wide">
<hn-drain data-fig data-label="fig 5 · qdrant latency while indexing">
<p class="fallback">Median search latency on a log scale. Fully indexed: 4.3 ms. While the optimizer indexes new data with prevent_unoptimized on, which hides unindexed points: 10.2 ms, p95 81 ms. With indexing turned off: 256.6 ms. While the optimizer indexes new data in the default mode: 780 ms, p95 2 seconds.</p>
</hn-drain>
<figcaption><b>fig 5</b>The same collection, four states. The default mode searches new data by brute force until it's indexed; <code>prevent_unoptimized</code> keeps it out of results instead.<span class="m">Qdrant docs, predictable search latency (2026).</span></figcaption>
</figure>

**Search was 180 times slower while the optimizer caught up (780 ms against 4.3 ms).** The `prevent_unoptimized` option (experimental since 1.17.1) brings that down to 10.2 ms by leaving the newest points out of results until their graph exists. Qdrant also builds on GPUs since 1.13, 12.4 seconds on an L4 against 97.5 on 8 CPU cores for 1 million 1,536-dimension vectors<sup><a href="#src-29">29</a></sup>, and since 1.14 a merge extends an existing graph instead of rebuilding it, though deletes and updates still trigger a full rebuild<sup><a href="#src-30">30</a></sup>.

### milvus

Milvus splits the job across node types. Fresh data sits in growing segments on streaming nodes; sealed segments get their real index built by data nodes and handed to query nodes<sup><a href="#src-31">31</a></sup>. To keep fresh data from being a full scan, an interim IVF index (128 clusters, 16 probed) is built on growing segments and on sealed segments that are still waiting, for about 15% extra memory<sup><a href="#src-32">32</a></sup>. GPU builds with CAGRA have been available since 2.4.

### weaviate

Weaviate's async indexing accepts the write first and inserts into the graph from a queue. The dynamic index starts as a flat list and switches to HNSW at 10,000 objects. Deletes are marked and cleaned up periodically, and the docs warn that cleanup on large indexes "may take longer" and need more resources<sup><a href="#src-33">33</a></sup>; users have reported 500% CPU after deleting 36,000 objects<sup><a href="#src-34">34</a></sup>. HFresh, generally available in 1.38, is an SPFresh-style index: clusters on disk with a small graph over the centroids, split and reassigned in the background with "no full rebuilds". It used 239 MB on dbpedia 1M against 6.67 GB for uncompressed HNSW, and Weaviate says HNSW still has "substantially higher throughput" at the same recall<sup><a href="#src-35">35</a></sup>.

### pgvector

pgvector keeps one graph per index with no segments, so there are no merges. The README says HNSW has "slower build times and uses more memory" than IVFFlat and recommends creating the index after the initial load<sup><a href="#src-36">36</a></sup>. Parallel builds in 0.6 cut the dbpedia 1M build from 7,479 to 252 seconds across versions<sup><a href="#src-7">7</a></sup>. Each insert still pays the full graph search inside the writing transaction, and deleted rows leave work for `VACUUM`, which "can take a while for HNSW indexes"<sup><a href="#src-36">36</a></sup>.

### clickhouse

ClickHouse builds a graph per part on insert and again on every merge, and its docs say HNSW "is known to provide slow inserts". `materialize_skip_indexes_on_insert = 0` defers the build to merges. RFC #104122, open since May 2026, aims at 100 to 10,000 new vectors every 30 seconds, searchable within 30 seconds; its long-term sketch is a global IVF index with delta lists and a compactor, after SPFresh<sup><a href="#src-37">37</a></sup>. I covered the rest of its design in [the ClickHouse post](/blog/clickhouse-vector-search/).

### one mutable graph

Vespa and Redis keep a single mutable HNSW per field and node, so no merges. Vespa documents real-time updates with the distance work spread over its indexing threads<sup><a href="#src-38">38</a></sup>. Redis 8 sustained 66,000 inserts per second into a 1-billion-vector index with `M = 16` and `ef_construction = 32`, without saying on how many machines<sup><a href="#src-39">39</a></sup>. The cost per insert is the same search as everywhere else; the design avoids paying it again at merge time.

### buffers on object storage

turbopuffer, LanceDB and Pinecone serverless keep new data in a write buffer and index it later. turbopuffer writes to a log on object storage and indexes asynchronously into an SPFresh-style index; strongly consistent queries scan the unindexed part, eventually consistent ones read at most 128 MiB of it<sup><a href="#src-40">40</a></sup>. LanceDB scans new rows until `optimize()` adds them to the index, and `fast_search()` skips them<sup><a href="#src-41">41</a></sup>. Pinecone keeps up to about 10,000 fresh vectors in memory, searched exactly, and compacts them into indexed slabs in the background<sup><a href="#src-42">42</a></sup>.

## build times

<figure class="wide">
<hn-build data-fig data-label="fig 6 · build and merge times, before and after">
<p class="fallback">Five before-and-after build times on a log scale. pgvector 0.5.0 to 0.6.2 on dbpedia 1M: 7,479 to 252 seconds, 29.7 times faster. OpenSearch CPU to remote GPU build: 273.8 to 29.1 minutes, 9.4 times. Elasticsearch HNSW-BBQ to DiskBBQ on 1M vectors: 1,054 to 94 seconds, 11.2 times. Lucene merge on gist int8, rebuild to join: 536 to 279 seconds, 1.9 times. Qdrant on 1M 1,536-dimension vectors, 8 CPU cores to an L4 GPU: 97.5 to 12.4 seconds, 7.9 times.</p>
</hn-build>
<figcaption><b>fig 6</b>What each fix bought. The rows use different data and hardware, so compare the ratios, not the positions across rows.<span class="m">Vendor numbers: Supabase/jkatz for pgvector, OpenSearch 3.1 release post, Elastic Search Labs, Qdrant 1.13 release post.</span></figcaption>
</figure>

The biggest gains come from three places: parallel and SIMD code, GPUs, and dropping the graph for clusters. Graph reuse and joins inside Lucene save 30 to 40% of merge time.

## research on fresh data

The research since 2021 attacks the same problem from both sides:

- FreshDiskANN (2021) keeps a small in-memory graph for new vectors and merges it into the SSD graph in batches. It sustained 1,800 inserts and 1,800 deletes per second with searches under 20 ms at 95% recall<sup><a href="#src-12">12</a></sup>.
- SPFresh (SOSP 2023) updates clusters in place: when one grows too big it splits, and only the vectors near the new boundary are reassigned<sup><a href="#src-14">14</a></sup>. turbopuffer, Weaviate's HFresh and the ClickHouse RFC all borrow this.
- IP-DiskANN (2025) deletes in place by finding a node's incoming links with a search, which removes the batch clean-up step<sup><a href="#src-43">43</a></sup>.
- LSM-VEC (2025) spreads a graph across the levels of an LSM tree, so updates are appends<sup><a href="#src-19">19</a></sup>.
- UBIS (January 2026) balances updatable clusters and schedules updates concurrently: 45% more update throughput on average<sup><a href="#src-44">44</a></sup>.
- Jasper (2026) and Slipstream (June 2026) build graphs for streaming data on GPUs and by insertion locality; Slipstream reports up to 30.8× more throughput at 0.95 recall@10<sup><a href="#src-18">18</a></sup><sup><a href="#src-45">45</a></sup>.

The NeurIPS 2023 Big-ANN competition had a streaming track with inserts, deletes and searches under 8 GB of RAM. The winner, PyANNS, used DiskANN-style streaming with 8-bit quantization and reached 0.887 recall against the baseline's 0.722<sup><a href="#src-46">46</a></sup>.

## where it stands

The problem isn't solved. Every database has made the rebuild cheaper or moved it somewhere else, and each move costs something:

| approach | who | what it costs |
|---|---|---|
| faster rebuilds: graph reuse and joins, SIMD, quantization, GPUs | Lucene, OpenSearch, Qdrant, Milvus | GPUs and licences; merges still rebuild most of the graph |
| scan new data, or hide it | Qdrant, LanceDB, Pinecone, turbopuffer, Milvus interim index | slow queries while indexing catches up, or results without the newest writes |
| clusters instead of a graph | Elasticsearch DiskBBQ, Weaviate HFresh, turbopuffer, ClickHouse RFC | lower throughput at very high recall |
| one mutable graph | Vespa, Redis, pgvector | every insert still runs a graph search; deletes need clean-up |

Deletes are the weakest part everywhere. Qdrant's incremental merge skips segments with deletes, Weaviate needs tombstone clean-up, and in-place graph deletes exist only in papers. There is also no neutral benchmark that measures ingest rate, latency during ingest and recall together; VDBBench's streaming case is the closest and it's run by Zilliz.

For a table that takes writes all day I'd start with a cluster index (DiskBBQ on Elasticsearch, HFresh on Weaviate, or turbopuffer) and keep HNSW for collections that change rarely and need recall above 95%. On Qdrant I'd turn on `prevent_unoptimized` when a few seconds of staleness is fine, which is most search features.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://publications.hse.ru/en/articles/110622363">Malkov, Ponomarenko, Logvinov, Krylov, Approximate nearest neighbor algorithm based on navigable small world graphs, Information Systems 45 (2014)</a></li>
<li id="src-2"><a href="https://arxiv.org/abs/1603.09320">Malkov and Yashunin, Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs (arXiv 1603.09320, 2016; IEEE TPAMI 2018)</a></li>
<li id="src-3"><a href="https://github.com/winlp4ever/winlp4ever.github.io/blob/main/scripts/hnsw-count.mjs">scripts/hnsw-count.mjs, the measurement behind fig 2</a></li>
<li id="src-4"><a href="https://github.com/facebookresearch/faiss/wiki/Indexing-1M-vectors">Faiss wiki, indexing 1M vectors</a></li>
<li id="src-5"><a href="https://arxiv.org/abs/2412.01940">Munyampirwa, Lakshman, Coleman, Down with the Hierarchy: The 'H' in HNSW Stands for "Hubs" (arXiv 2412.01940, December 2024)</a></li>
<li id="src-6"><a href="https://www.elastic.co/search-labs/blog/diskbbq-elasticsearch-introduction">Elastic, introducing DiskBBQ (23 October 2025)</a></li>
<li id="src-7"><a href="https://jkatz05.com/post/postgres/pgvector-performance-150x-speedup/">Jonathan Katz, pgvector 150x speedup (30 April 2024)</a> and <a href="https://supabase.com/blog/pgvector-fast-builds">Supabase, pgvector 0.6.0 fast builds (30 January 2024)</a></li>
<li id="src-8"><a href="https://github.com/nmslib/hnswlib">hnswlib README</a></li>
<li id="src-9"><a href="https://arxiv.org/abs/2407.07871">Xiao et al., Enhancing HNSW Index for Real-Time Updates (arXiv 2407.07871, July 2024)</a></li>
<li id="src-10"><a href="https://arxiv.org/abs/1707.00143">Fu, Xiang, Wang, Cai, Fast approximate nearest neighbor search with the navigating spreading-out graph (arXiv 1707.00143)</a></li>
<li id="src-11"><a href="https://proceedings.neurips.cc/paper/2019/hash/09853c7fb1d3f8ee67a61b6bf4a7f8e6-Abstract.html">Subramanya et al., DiskANN (NeurIPS 2019)</a></li>
<li id="src-12"><a href="https://arxiv.org/abs/2105.09613">Singh et al., FreshDiskANN (arXiv 2105.09613, May 2021)</a></li>
<li id="src-13"><a href="https://arxiv.org/abs/2111.08566">Chen et al., SPANN (NeurIPS 2021)</a></li>
<li id="src-14"><a href="https://www.microsoft.com/en-us/research/publication/spfresh-incremental-in-place-update-for-billion-scale-vector-search/">Xu et al., SPFresh (SOSP 2023)</a></li>
<li id="src-15"><a href="https://arxiv.org/abs/2403.04871">Patel, Kraft, Guestrin, Zaharia, ACORN (SIGMOD 2024)</a></li>
<li id="src-16"><a href="https://arxiv.org/abs/2308.15136">Ootomo et al., CAGRA (ICDE 2024)</a></li>
<li id="src-17"><a href="https://arxiv.org/abs/2405.12497">Gao and Long, RaBitQ (SIGMOD 2024)</a> and <a href="https://www.elastic.co/search-labs/blog/better-binary-quantization-lucene-elasticsearch">Elastic, BBQ (11 November 2024)</a></li>
<li id="src-18"><a href="https://arxiv.org/abs/2601.07048">McCoy, Wang, Pandey, Jasper (arXiv 2601.07048, v5 July 2026)</a></li>
<li id="src-19"><a href="https://arxiv.org/abs/2505.17152">Mo et al., LSM-VEC (arXiv 2505.17152, v3 October 2026)</a></li>
<li id="src-20"><a href="https://www.elastic.co/search-labs/blog/elasticsearch-lucene-vector-database-gains">Elastic, Lucene and Elasticsearch vector database gains (26 April 2024)</a></li>
<li id="src-21"><a href="https://discuss.elastic.co/t/indexing-performance-on-indices-with-vector-fields/359135">Elastic forum, indexing performance on indices with vector fields (2024)</a></li>
<li id="src-22"><a href="https://discuss.elastic.co/t/manage-heavy-indexing-in-knn-indexes/344840">Elastic forum, manage heavy indexing in kNN indexes (11 October 2023)</a></li>
<li id="src-23"><a href="https://github.com/apache/lucene/pull/12050">Lucene PR #12050, reuse HNSW graph on merge (February 2023)</a></li>
<li id="src-24"><a href="https://www.elastic.co/search-labs/blog/hnsw-graphs-speed-up-merging">Elastic, speeding up HNSW graph merging (7 April 2025)</a></li>
<li id="src-25"><a href="https://www.elastic.co/search-labs/blog/elasticsearch-gpu-accelerated-vector-indexing-nvidia">Elastic, GPU-accelerated vector indexing with NVIDIA (3 December 2025)</a></li>
<li id="src-26"><a href="https://opensearch.org/blog/get-started-with-opensearch-3-1/">OpenSearch, get started with 3.1</a></li>
<li id="src-27"><a href="https://opensearch.org/blog/breaking-the-single-thread-bottleneck-concurrent-vector-graph-construction-in-opensearch">OpenSearch, concurrent vector graph construction</a> and <a href="https://docs.opensearch.org/latest/install-and-configure/additional-plugins/opensearch-jvector/">jVector plugin docs</a></li>
<li id="src-28"><a href="https://qdrant.tech/documentation/operate-and-maintain/predictable-search-latency/">Qdrant docs, predictable search latency</a> and <a href="https://qdrant.tech/documentation/ops-optimization/optimizer/">optimizer docs</a></li>
<li id="src-29"><a href="https://qdrant.tech/blog/qdrant-1.13.x/">Qdrant 1.13 release (23 January 2025)</a></li>
<li id="src-30"><a href="https://qdrant.tech/blog/qdrant-1.14.x/">Qdrant 1.14 release (22 April 2025)</a></li>
<li id="src-31"><a href="https://milvus.io/docs/architecture_overview.md">Milvus architecture overview</a></li>
<li id="src-32"><a href="https://milvus.io/docs/configure_querynode.md">Milvus query node configuration</a></li>
<li id="src-33"><a href="https://docs.weaviate.io/weaviate/config-refs/indexing/vector-index">Weaviate vector index configuration</a></li>
<li id="src-34"><a href="https://forum.weaviate.io/t/weaviate-using-tons-of-cpu-during-tombstone-cleanup-begin/7290">Weaviate forum, CPU during tombstone cleanup</a></li>
<li id="src-35"><a href="https://weaviate.io/blog/hfresh">Weaviate, HFresh (9 September 2026)</a></li>
<li id="src-36"><a href="https://github.com/pgvector/pgvector">pgvector README (0.8.7)</a></li>
<li id="src-37"><a href="https://github.com/ClickHouse/ClickHouse/issues/104122">ClickHouse RFC #104122, vector similarity index 2.0 (May 2026)</a> and <a href="https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes">vector index docs</a></li>
<li id="src-38"><a href="https://docs.vespa.ai/en/querying/approximate-nn-hnsw.html">Vespa, approximate nearest neighbor search using HNSW</a></li>
<li id="src-39"><a href="https://redis.io/blog/searching-1-billion-vectors-with-redis-8/">Redis, searching 1 billion vectors with Redis 8 (7 March 2025)</a></li>
<li id="src-40"><a href="https://turbopuffer.com/docs/architecture">turbopuffer architecture</a></li>
<li id="src-41"><a href="https://docs.lancedb.com/indexing/reindexing">LanceDB, reindexing</a></li>
<li id="src-42"><a href="https://docs.pinecone.io/guides/core-concepts/architecture">Pinecone architecture</a></li>
<li id="src-43"><a href="https://arxiv.org/abs/2502.13826">IP-DiskANN, in-place deletes (arXiv 2502.13826, February 2025)</a></li>
<li id="src-44"><a href="https://arxiv.org/abs/2602.00563">UBIS (arXiv 2602.00563, January 2026)</a></li>
<li id="src-45"><a href="https://arxiv.org/abs/2606.02992">Slipstream (arXiv 2606.02992, June 2026)</a></li>
<li id="src-46"><a href="https://arxiv.org/abs/2409.17424">Simhadri et al., Results of the Big ANN NeurIPS'23 competition (arXiv 2409.17424)</a></li>
</ol>
</details>
