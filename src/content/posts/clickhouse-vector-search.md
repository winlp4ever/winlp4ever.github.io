---
title: Vector search and BM25 in ClickHouse, compared with Postgres, Qdrant and the rest
date: 2026-11-11
description: How the ClickHouse vector index works, how to set it up, where it stands on BM25 and hybrid search, and how it compares with pgvector, Qdrant, Elasticsearch, Milvus and Weaviate. It ends on whether agents still need vector search now that they can grep.
tags: [clickhouse, search, vectors, infra]
category: code
glyph: search
figures: 4
---

ClickHouse made its vector index generally available in 25.8 (August 2025)<sup><a href="#src-1">1</a></sup> and its full-text index in 26.2 (March 2026)<sup><a href="#src-2">2</a></sup>. Both live inside the normal MergeTree table, next to the logs and events most people already keep there. This post covers how the two indexes work, how to turn them on, what they can't do yet, and how they compare with the search systems people usually pick. Versions are the ones current on 11 November 2026: ClickHouse 26.10, pgvector 0.8.7, Qdrant 1.20, Elasticsearch 9.5, OpenSearch 3.9, Milvus 3.0 and Weaviate 1.40.

## brute force first

ClickHouse has no vector type. An embedding is a column of `Array(Float32)` (or `BFloat16`), and the distance functions are ordinary SQL functions: `L2Distance`, `cosineDistance`, `dotProduct`. Exact nearest-neighbour search is a sort:

```sql
SELECT id, title
FROM docs
ORDER BY cosineDistance(embedding, {q:Array(Float32)})
LIMIT 10;
```

This reads every vector in the table. ClickHouse reads columns fast and on every core, so up to a few million rows this is often fine, and the answer is exact. I'd start here and add the index when the scan gets too slow.

## the vector_similarity index

The approximate index is HNSW, built on the usearch library<sup><a href="#src-1">1</a></sup>. It went experimental, then beta in 25.5, then GA in 25.8, which also removed the older `annoy` and `usearch` index types. Since 25.8 it needs no experimental setting.

ClickHouse stores a table as **parts**, immutable chunks written by each insert and combined later by background merges. A skip index belongs to a part, so each part gets its own small HNSW graph. A query searches every part's graph and merges the top results. When two parts merge, the new part's graph is built again from all its vectors. ClickHouse's own RFC on the next version of the index lists this rebuild-on-merge as the main cost<sup><a href="#src-3">3</a></sup>.

<figure class="wide">
<cv-parts data-fig data-label="fig 1 · one graph per part">
<p class="fallback">Three parts appear one after another, each holding nine vectors joined into a small neighbour graph. A query vector then sends a line to each part, and the two nearest points in each part light up; the results from all parts are merged. Finally parts 1 and 2 merge into one bigger part: their two graphs disappear and a new graph over all eighteen points is drawn from scratch.</p>
</cv-parts>
<figcaption><b>fig 1</b>Each part has its own graph, and a merge builds a new one. Real HNSW graphs have several layers and far more points; the points here are random and each one links to its two nearest neighbours.<span class="m">Based on the ClickHouse vector index docs and RFC #104122.</span></figcaption>
</figure>

A few things follow from that design:

- The graph of a part has to be in memory to be searched. The cache is `vector_similarity_index_cache_size`, 5 GB by default. The docs' sizing rule is vectors × dimensions × bytes per value for the vectors, plus vectors × M × 8 bytes for the graph<sup><a href="#src-1">1</a></sup>. One million 1,536-dimension vectors in bf16 with M = 64 comes to about 3.5 GB.
- Only one query shape uses the index: `ORDER BY distance(...) LIMIT k`. A threshold like `WHERE cosineDistance(...) < 0.3` scans. `k` is capped by `max_limit_for_vector_search_queries`, 100 by default.
- Parts with pending lightweight deletes or mutations are searched exactly until they're rewritten.
- The column must be a single non-Nullable array of a fixed length.

The index stores vectors in **bf16 by default**. The other options are f64, f32, f16, i8 and b1 (one bit per dimension). With i8 or b1, turn on `vector_search_with_rescoring`, which recomputes the final distances on the full-precision column. The 26.7 release added experimental quantized column codecs (int8, RaBitQ, TurboQuant, PQ and a Matryoshka truncation) behind `enable_quantized_codec`<sup><a href="#src-4">4</a></sup>.

## setting it up

A server from Docker is enough to try it:

```bash
docker run -d --name ch -p 8123:8123 -p 9000:9000 \
  -e CLICKHOUSE_PASSWORD=dev clickhouse/clickhouse-server:26.10
docker exec -it ch clickhouse-client --password dev
```

A table with both indexes. The vector index arguments are the method, the distance, the number of dimensions, the quantization, M (links per node) and ef_construction (how hard the build searches for neighbours):

```sql
CREATE TABLE docs
(
    id        UInt64,
    title     String,
    body      String,
    body_lc   String MATERIALIZED lower(body),
    embedding Array(Float32) CODEC(NONE),
    INDEX vec_idx embedding TYPE vector_similarity('hnsw', 'cosineDistance', 1024, 'bf16', 32, 128),
    INDEX txt_idx body_lc TYPE text(tokenizer = splitByNonAlpha)
)
ENGINE = MergeTree
ORDER BY id;
```

`CODEC(NONE)` is what the docs recommend for the vector column, since float vectors barely compress. Every array you insert must have exactly 1,024 values or the insert fails. On a table that already has data, add the index and build it for the existing parts:

```sql
ALTER TABLE docs ADD INDEX vec_idx embedding TYPE vector_similarity('hnsw', 'cosineDistance', 1024);
ALTER TABLE docs MATERIALIZE INDEX vec_idx SETTINGS mutations_sync = 2;
```

Loading embeddings from Python with `clickhouse-connect` and a sentence-transformers model (BGE large gives 1,024 dimensions):

```python
import clickhouse_connect
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("BAAI/bge-large-en-v1.5")
ch = clickhouse_connect.get_client(host="localhost", password="dev")

rows = [
    (1, "ClickHouse vectors", "HNSW index inside a column store"),
    (2, "Postgres pgvector", "pgvector adds a vector type to Postgres"),
]
vecs = model.encode([body for _, _, body in rows], normalize_embeddings=True)
ch.insert(
    "docs",
    [(*row, vec.tolist()) for row, vec in zip(rows, vecs)],
    column_names=["id", "title", "body", "embedding"],
)

q = model.encode("vector search in a column store", normalize_embeddings=True).tolist()
result = ch.query(
    """SELECT id, title, cosineDistance(embedding, {q:Array(Float32)}) AS d
       FROM docs ORDER BY d LIMIT 10""",
    parameters={"q": q},
)
print(result.result_rows)
```

The query settings that matter, and the check that the index is used:

```sql
SELECT id, title, cosineDistance(embedding, {q:Array(Float32)}) AS d
FROM docs
ORDER BY d ASC              -- ASC for L2 and cosine, DESC for dotProduct
LIMIT 10
SETTINGS hnsw_candidate_list_size_for_search = 512;   -- ef_search, 256 by default: higher means better recall and slower

EXPLAIN indexes = 1
SELECT id FROM docs ORDER BY cosineDistance(embedding, {q:Array(Float32)}) LIMIT 10;
-- look for "Skip ... Name: vec_idx" in the plan
```

If writes are heavy, `materialize_skip_indexes_on_insert = 0` defers building the graph to merge time, and `materialize_skip_indexes_on_merge = 0` defers it further, until you run `MATERIALIZE INDEX` yourself. Parts without a graph are searched exactly.

## filters

The default filter strategy is **post-filtering**: the index returns the k nearest rows of each part, then the `WHERE` clause runs on them. If the filter matches few rows, most of the k get thrown away and the query returns fewer than k results. There are two settings to fix it<sup><a href="#src-1">1</a></sup>. `vector_search_index_fetch_multiplier` makes the index return more candidates (up to 1,000 times k), and `vector_search_filter_strategy = 'prefilter'` applies the filter first and computes exact distances on the rows that pass. The default `'auto'` picks between the two using the filter's estimated selectivity.

<figure class="wide">
<cv-filter data-fig data-label="fig 2 · post-filter and prefilter">
<p class="fallback">Two hundred candidate rows are drawn as squares in order of distance to the query, nearest first. Filled squares match the WHERE filter. With post-filtering the index fetches the nearest 10, and with a 20% filter only about 2 of them survive. Fetching 40 returns 8 or so. Prefiltering scans every matching row exactly and always returns 10.</p>
</cv-filter>
<figcaption><b>fig 2</b>The outlined squares are what the index fetches, and the coloured ones are the rows returned. Toggle the strategy and how much of the table the filter matches. The rows are random, seeded so every toggle shows the same table.<span class="m">k = 10. Settings from the ClickHouse vector index docs.</span></figcaption>
</figure>

```sql
SELECT id, title, cosineDistance(embedding, {q:Array(Float32)}) AS d
FROM docs
WHERE title ILIKE '%postgres%'
ORDER BY d
LIMIT 10
SETTINGS vector_search_index_fetch_multiplier = 4;
-- or, for very selective filters: vector_search_filter_strategy = 'prefilter'
```

If the filter is on a column in the table's `ORDER BY` key (a tenant id, a date), the primary index prunes whole granules before the vector search, which is the cheapest filter ClickHouse has. Qdrant and Weaviate check filters while walking the graph, so they keep returning k results under selective filters without either trick<sup><a href="#src-5">5</a></sup>.

## qbit

QBit is a column type, production-ready since 26.2, that stores a vector bit plane by bit plane: all the sign bits, then all the next bits, and so on<sup><a href="#src-6">6</a></sup>. A query picks how many planes to read, so the precision becomes a query parameter. One informal test in the announcement, on 10 million DBpedia vectors, went from 1.157 s to 0.271 s and from 6.05 GiB to 740 MiB of memory at reduced precision.

```sql
CREATE TABLE docs_q (id UInt64, vec QBit(Float32, 1024)) ENGINE = MergeTree ORDER BY id;

SELECT id
FROM docs_q
ORDER BY L2DistanceTransposed(vec, {q:Array(Float32)}, 12)   -- read 12 of the 32 bit planes
LIMIT 10;
```

QBit is a brute-force tool with no graph. It suits tables where the HNSW memory bill is too high and a few hundred milliseconds per query is acceptable. 26.7 added Int8 elements and a stride argument<sup><a href="#src-4">4</a></sup>.

## bm25

**ClickHouse has no BM25 today.** The `text` index is an inverted index: it maps each token to the rows that contain it and speeds up `hasToken`, `hasAnyTokens`, `hasAllTokens`, `hasPhrase`, `LIKE`, `match` and `=`. It finds rows; it doesn't score them. The GA post says so directly: the text index "is not a relevance engine"<sup><a href="#src-2">2</a></sup>. On 10 billion GitHub events, a token search went from 193 s to 0.42 s with the index, which took 216 GiB and cut insert throughput by about half.

BM25 is coming. Pull request #117519 adds a `bm25([k1, b])` scoring function behind `allow_experimental_text_index_scoring`, and draft #125775 stores the per-part statistics it needs (document count, average length, document frequency), pointing at 26.11<sup><a href="#src-7">7</a></sup>. Until then, the formula fits in one query. The text index narrows the candidates, and the scoring runs on them:

```sql
WITH
    ['vector', 'index'] AS q,
    (SELECT count() FROM docs) AS N,
    (SELECT avg(length(tokens(body_lc))) FROM docs) AS avgdl,     -- store this in production
    [(SELECT count() FROM docs WHERE hasToken(body_lc, 'vector')),
     (SELECT count() FROM docs WHERE hasToken(body_lc, 'index'))] AS df,
    1.2 AS k1,
    0.75 AS b
SELECT
    id,
    title,
    arraySum(arrayMap((t, n) ->
        log(1 + (N - n + 0.5) / (n + 0.5))
        * countEqual(toks, t) * (k1 + 1)
        / (countEqual(toks, t) + k1 * (1 - b + b * length(toks) / avgdl)),
        q, df)) AS bm25
FROM
(
    SELECT id, title, tokens(body_lc) AS toks
    FROM docs
    WHERE hasAnyTokens(body_lc, ['vector', 'index'])
)
ORDER BY bm25 DESC
LIMIT 50;
```

`tokens()` splits on non-alphanumeric characters, the same rule as the `splitByNonAlpha` tokenizer on the index, so the counts agree with what the index matched. The `avgdl` subquery scans the whole column; in production keep it in a small table that a materialized view updates on insert. Tinybird published a repository with the same idea plus hybrid search<sup><a href="#src-8">8</a></sup>.

## hybrid search with rrf

Keyword search finds exact terms (an error code, a function name), and vector search finds paraphrases. **Reciprocal rank fusion** (RRF) combines the two rankings: each document scores the sum of 1 / (60 + rank) over the lists it appears in. A document in both lists beats one that tops only one list. In Anthropic's Contextual Retrieval tests, their contextual embeddings cut the top-20 retrieval failure rate by 35%, adding BM25 to them brought the cut to 49%, and adding a reranker brought it to 67%<sup><a href="#src-9">9</a></sup>.

<figure class="wide">
<cv-rrf data-fig data-label="fig 3 · reciprocal rank fusion">
<p class="fallback">A BM25 ranking and a vector ranking of five documents each, and their fused ranking. Three documents appear in both lists (hnsw tuning, vector index docs, merge settings) and take the top three fused places with scores near 0.031. The BM25 winner, err_42 runbook, drops to fourth with 0.0164.</p>
</cv-rrf>
<figcaption><b>fig 3</b>Dots mark the documents both lists found. Hover a fused row to see its sum. I made the documents up; the arithmetic is the real RRF formula with k = 60.<span class="m">Cormack, Clarke and Büttcher, SIGIR 2009.</span></figcaption>
</figure>

ClickHouse has no fusion operator yet (RFC #105781 proposes a `hybridSearch` function<sup><a href="#src-10">10</a></sup>), so RRF is two CTEs and a `GROUP BY`:

```sql
WITH
    vec AS (
        SELECT id, row_number() OVER (ORDER BY d) AS r
        FROM (SELECT id, cosineDistance(embedding, {q:Array(Float32)}) AS d
              FROM docs ORDER BY d LIMIT 50)
    ),
    kw AS (
        SELECT id, row_number() OVER (ORDER BY bm25 DESC) AS r
        FROM ( /* the BM25 query above */ )
    )
SELECT id, sum(1 / (60 + r)) AS rrf
FROM (SELECT id, r FROM vec UNION ALL SELECT id, r FROM kw)
GROUP BY id
ORDER BY rrf DESC
LIMIT 10;
```

## how the others do it

| | ClickHouse 26.10 | Postgres + pgvector 0.8.7 | Qdrant 1.20 | Elasticsearch 9.5 / OpenSearch 3.9 | Milvus 3.0 | Weaviate 1.40 |
|---|---|---|---|---|---|---|
| ANN index | HNSW per part, in RAM | HNSW, IVFFlat; DiskANN through pgvectorscale | HNSW | HNSW, DiskBBQ (ES); Faiss, Lucene, JVector (OS) | HNSW, IVF, DiskANN, GPU CAGRA and more | HNSW, flat, dynamic, HFresh |
| compression | bf16, i8, b1; QBit | halfvec, bit with re-rank | int8, binary, PQ, TurboQuant | int8, int4, BBQ (ES); 32× on disk (OS) | SQ, PQ, RaBitQ | PQ, BQ, SQ, RQ |
| filtered search | post-filter or exact prefilter | post-filter plus iterative scans | filters inside the graph walk | filters inside the graph walk | filters inside the graph walk | filters inside the graph walk |
| BM25 | no (PR open) | not in core; pg_textsearch, ParadeDB pg_search, VectorChord-bm25 | yes, native since 1.20 | yes, the default ranking | yes, BM25 function | yes, BM25F |
| hybrid | RRF by hand in SQL | RRF by hand in SQL | server-side RRF or DBSF | RRF retriever (ES), hybrid query (OS) | `hybrid_search`, RRF or weighted | built in, alpha-weighted |
| scale-out | sharded, columnar | one primary plus replicas | sharded | sharded | sharded on Kubernetes | sharded |
| licence | Apache-2.0 | PostgreSQL | Apache-2.0 | ELv2/AGPL (ES), Apache-2.0 (OS) | Apache-2.0 | BSD-3 |

Sources for the table: each project's docs and release notes<sup><a href="#src-11">11</a></sup><sup><a href="#src-12">12</a></sup><sup><a href="#src-13">13</a></sup><sup><a href="#src-14">14</a></sup><sup><a href="#src-15">15</a></sup><sup><a href="#src-16">16</a></sup>.

Postgres's built-in `ts_rank` is not BM25: it has no inverse document frequency and no length normalisation of the BM25 kind<sup><a href="#src-17">17</a></sup>. For real BM25 there are three extensions. Tiger Data's pg_textsearch (PostgreSQL licence) is on Google's AlloyDB and Cloud SQL since September 2026<sup><a href="#src-18">18</a></sup>. ParadeDB's pg_search wraps the Tantivy engine and is AGPL<sup><a href="#src-19">19</a></sup>. VectorChord-bm25 comes from the VectorChord team<sup><a href="#src-20">20</a></sup>.

Until 1.20, Qdrant did BM25 through sparse vectors with an IDF modifier (October 2026), which added native BM25 scoring on a text payload index. The statistics are per shard, so scores across shards are approximate<sup><a href="#src-13">13</a></sup>.

A few more worth knowing:

- Vespa has had BM25 and HNSW in one ranking expression for years, with the most control over ranking of anything here, and the steepest learning curve<sup><a href="#src-21">21</a></sup>.
- turbopuffer keeps vectors and a BM25 index on object storage. Cold queries take around 900 ms and warm ones around 14 ms<sup><a href="#src-22">22</a></sup>.
- Pinecone made full-text BM25 search GA in September 2026; hybrid fusion is mostly done in the client<sup><a href="#src-23">23</a></sup>.
- Redis 8.4 added `FT.HYBRID` with server-side fusion<sup><a href="#src-24">24</a></sup>, and MongoDB 8 has `$rankFusion` in the aggregation pipeline<sup><a href="#src-25">25</a></sup>.
- LanceDB has BM25 and vectors in an embedded library, with the fusion in the client<sup><a href="#src-26">26</a></sup>.
- DuckDB's VSS extension has HNSW, but persisting the index is still experimental<sup><a href="#src-27">27</a></sup>.

## the same hybrid query on three other systems

Postgres with pgvector and pg_textsearch. `<@>` returns a negative BM25 score, so ascending order puts the best match first:

```sql
CREATE EXTENSION vector;
CREATE EXTENSION pg_textsearch;

CREATE TABLE docs (id bigserial PRIMARY KEY, body text, embedding vector(1024));
CREATE INDEX ON docs USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX ON docs USING bm25 (body) WITH (text_config = 'english');

SET hnsw.ef_search = 100;
SET hnsw.iterative_scan = relaxed_order;   -- keep scanning when a WHERE filter drops rows

WITH v AS (
    SELECT id, row_number() OVER (ORDER BY embedding <=> $1) AS r
    FROM docs ORDER BY embedding <=> $1 LIMIT 50
), k AS (
    SELECT id, row_number() OVER (ORDER BY body <@> 'vector index') AS r
    FROM docs ORDER BY body <@> 'vector index' LIMIT 50
)
SELECT id, sum(1.0 / (60 + r)) AS rrf
FROM (SELECT * FROM v UNION ALL SELECT * FROM k) u
GROUP BY id
ORDER BY rrf DESC
LIMIT 10;
```

Qdrant, with a dense vector and a BM25 sparse vector fused on the server. `pip install "qdrant-client[fastembed]"` and `docker run -p 6333:6333 qdrant/qdrant`:

```python
from qdrant_client import QdrantClient, models

client = QdrantClient("localhost", port=6333)
client.create_collection(
    "docs",
    vectors_config={"dense": models.VectorParams(size=1024, distance=models.Distance.COSINE)},
    sparse_vectors_config={"bm25": models.SparseVectorParams(modifier=models.Modifier.IDF)},
)

client.upsert("docs", points=[
    models.PointStruct(
        id=1,
        vector={
            "dense": dense_vec,  # your 1,024-d embedding
            "bm25": models.Document(text="HNSW index inside a column store", model="Qdrant/bm25"),
        },
        payload={"title": "ClickHouse vectors"},
    ),
])

hits = client.query_points(
    "docs",
    prefetch=[
        models.Prefetch(query=dense_query, using="dense", limit=50),
        models.Prefetch(query=models.Document(text="vector index", model="Qdrant/bm25"), using="bm25", limit=50),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    limit=10,
)
```

Elasticsearch, with BBQ-quantized HNSW and the RRF retriever:

```json
PUT docs
{
  "mappings": {
    "properties": {
      "body": { "type": "text" },
      "vec":  { "type": "dense_vector", "dims": 1024, "similarity": "cosine",
                "index_options": { "type": "bbq_hnsw" } }
    }
  }
}

GET docs/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        { "standard": { "query": { "match": { "body": "vector index" } } } },
        { "knn": { "field": "vec", "query_vector": [0.12, -0.03], "k": 10, "num_candidates": 100 } }
      ]
    }
  }
}
```

The `query_vector` is cut to two numbers here; send all 1,024.

## benchmarks

**No public benchmark includes the ClickHouse vector index.** It's absent from Zilliz's VDBBench leaderboard and from ann-benchmarks, and the ClickHouse docs publish no recall/QPS table for 25.8 or later. The closest number is in a pull request: 0.985 recall at about 2,750 QPS on Deep10M<sup><a href="#src-28">28</a></sup>. Every comparison below was run by a company selling one of the systems.

<figure class="wide">
<cv-bench data-fig data-label="fig 4 · VDBBench, Cohere 1M">
<p class="fallback">Queries per second against recall on VDBBench's Cohere 1M × 768 case. Zilliz Cloud: 13,316 QPS at 0.938 recall, p99 2.0 ms. Milvus on 16 cores: 5,973 at 0.919. OpenSearch: 3,055 at 0.907. Elastic Cloud: 2,354 at 0.914. Qdrant Cloud: 1,242 at 0.947, the highest recall. Pinecone: 1,147 at 0.926. ClickHouse is not on the board.</p>
</cv-bench>
<figcaption><b>fig 4</b>Throughput against recall. Recall is not matched across systems, so a point further right is doing a harder job. The two dark points are Zilliz's own products. ClickHouse isn't on the board. Hover a point for p99 latency.<span class="m">Zilliz VDBBench leaderboard, read on 11 November 2026. Zilliz makes Milvus and Zilliz Cloud.</span></figcaption>
</figure>

Other published comparisons:

- Tiger Data compared Postgres and Qdrant on 50 million 768-dimension vectors: at 99% recall, Postgres with pgvectorscale served 471 QPS and Qdrant 41, but Qdrant's p99 latency was lower (38.7 ms against 74.6 ms) and its index built in 3.3 hours against 11.1<sup><a href="#src-29">29</a></sup>.
- MariaDB ran ann-benchmarks on 1 million 1,536-dimension vectors: at 94% recall Redis and MariaDB did 850 to 1,000 QPS, pgvectorscale and Weaviate about 500, pgvector about 250, and Qdrant, Milvus and OpenSearch 90 to 150. Several competitors ran old versions<sup><a href="#src-30">30</a></sup>.
- Elastic reports BBQ up to 5 times faster than OpenSearch with Faiss, at recall levels that don't match<sup><a href="#src-31">31</a></sup>.
- ClickHouse reports cold log queries 4 to 6 times faster than Elasticsearch with about 5 times less disk. The queries match and aggregate, and rank nothing<sup><a href="#src-32">32</a></sup>.
- For BM25, Tiger Data measured pg_textsearch at 40.6 ms p50 against ParadeDB's 94.4 ms on MS MARCO's 138 million passages<sup><a href="#src-18">18</a></sup>.

Each vendor wins its own benchmark. VDBBench is open source and runs against your own data, which is the only result I'd trust for a decision.

## do agents still need vector search

Claude Code started with a RAG index built on Voyage embeddings and replaced it with plain glob and grep. Boris Cherny gave two reasons on Latent Space: the index has to be stored and secured somewhere, and it drifts out of date while the code changes. He called the evidence "mostly vibes" plus internal benchmarks<sup><a href="#src-33">33</a></sup>. Augment found grep and find enough for their SWE-bench agent<sup><a href="#src-34">34</a></sup>, and Letta's agent scored 74.0% on the LoCoMo memory benchmark keeping its memory in plain files<sup><a href="#src-35">35</a></sup>.

Other measurements go the other way. Cursor added semantic search next to grep and measured 12.5% higher answer accuracy on their internal benchmark, and 2.6% more of the agent's code kept by users on codebases over 1,000 files<sup><a href="#src-36">36</a></sup>. On BrowseComp-Plus, a deep-research benchmark with a fixed corpus, GPT-5 answered 55.9% of questions with a BM25 retriever and 70.1% with Qwen3-Embedding-8B, and made fewer search calls with the embeddings<sup><a href="#src-37">37</a></sup>. Anthropic's own guide to context engineering recommends just-in-time retrieval with tools, and says a hybrid of that and up-front retrieval may work best<sup><a href="#src-38">38</a></sup>.

Both results hold for their setting. Code is full of exact identifiers that grep finds in one call, and the files change while the agent works. A document collection written in many words for the same idea is the opposite case, and that's where embeddings win. The Contextual Retrieval post also gives the small-corpus rule: under about 200,000 tokens, put the whole thing in the prompt and skip retrieval<sup><a href="#src-9">9</a></sup>.

My view is that vector search stopped being the fixed first step of every pipeline and became one tool the agent calls, next to grep and keyword search. For an agent over code, grep first. Over a large document collection, I'd give it a hybrid search tool with BM25, embeddings and RRF. If the data already sits in ClickHouse I'd build that tool there with the SQL above and move to native BM25 when the PR lands. If it doesn't, I'd start with Postgres, pgvector and pg_textsearch, and move to Qdrant once filtered queries or scale need a dedicated service.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes">ClickHouse docs, exact and approximate vector search (read 11 November 2026)</a></li>
<li id="src-2"><a href="https://clickhouse.com/blog/full-text-search-ga-release">ClickHouse, full-text search is generally available (10 March 2026)</a></li>
<li id="src-3"><a href="https://github.com/ClickHouse/ClickHouse/issues/104122">ClickHouse issue #104122, RFC for the next vector index</a></li>
<li id="src-4"><a href="https://presentations.clickhouse.com/2026-release-26.7/">ClickHouse 26.7 release call slides</a></li>
<li id="src-5"><a href="https://qdrant.tech/documentation/manage-data/indexing/">Qdrant docs, indexing and filterable HNSW</a></li>
<li id="src-6"><a href="https://clickhouse.com/blog/qbit-vector-search">ClickHouse, QBit vector search (27 October 2025)</a> and <a href="https://clickhouse.com/docs/sql-reference/data-types/qbit">QBit type docs</a></li>
<li id="src-7"><a href="https://github.com/ClickHouse/ClickHouse/pull/117519">ClickHouse PR #117519, BM25 scoring for the text index</a> and <a href="https://github.com/ClickHouse/ClickHouse/pull/125775">draft PR #125775, text index statistics</a></li>
<li id="src-8"><a href="https://github.com/tinybirdco/tinybird-synthetic-hybrid-search">Tinybird, hybrid search example repository</a></li>
<li id="src-9"><a href="https://www.anthropic.com/news/contextual-retrieval">Anthropic, Introducing Contextual Retrieval (19 September 2024)</a></li>
<li id="src-10"><a href="https://github.com/ClickHouse/ClickHouse/issues/105781">ClickHouse issue #105781, RFC for hybrid search</a></li>
<li id="src-11"><a href="https://github.com/pgvector/pgvector">pgvector README and changelog</a></li>
<li id="src-12"><a href="https://github.com/timescale/pgvectorscale">pgvectorscale</a></li>
<li id="src-13"><a href="https://qdrant.tech/blog/qdrant-1.20.x/">Qdrant 1.20 release post</a> and <a href="https://qdrant.tech/documentation/concepts/hybrid-queries/">hybrid queries docs</a></li>
<li id="src-14"><a href="https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector">Elasticsearch dense_vector docs</a>, <a href="https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rrf-retriever">RRF retriever docs</a> and <a href="https://docs.opensearch.org/latest/vector-search/optimizing-storage/disk-based-vector-search/">OpenSearch disk-based vector search</a></li>
<li id="src-15"><a href="https://milvus.io/docs/full-text-search.md">Milvus full-text search docs</a> and <a href="https://milvus.io/docs/index-explained.md">index types</a></li>
<li id="src-16"><a href="https://docs.weaviate.io/weaviate/concepts/search/hybrid-search">Weaviate hybrid search</a> and <a href="https://docs.weaviate.io/weaviate/concepts/vector-quantization">vector quantization docs</a></li>
<li id="src-17"><a href="https://www.postgresql.org/docs/current/textsearch-controls.html">PostgreSQL docs, ranking search results</a></li>
<li id="src-18"><a href="https://www.tigerdata.com/blog/pg-textsearch-bm25-full-text-search-postgres">Tiger Data, pg_textsearch</a> and <a href="https://www.tigerdata.com/newsroom/google-cloud-brings-native-bm25-full-text-search-to-alloydb-and-cloud-sql-via-tiger-datas-pg_textsearch">AlloyDB and Cloud SQL announcement</a></li>
<li id="src-19"><a href="https://github.com/paradedb/paradedb/releases">ParadeDB releases</a> and <a href="https://www.paradedb.com/docs/documentation/hybrid/rrf.md">RRF docs</a></li>
<li id="src-20"><a href="https://github.com/tensorchord/VectorChord-bm25">VectorChord-bm25</a></li>
<li id="src-21"><a href="https://docs.vespa.ai/en/reference/bm25.html">Vespa BM25 reference</a></li>
<li id="src-22"><a href="https://turbopuffer.com/docs/architecture">turbopuffer architecture</a> and <a href="https://turbopuffer.com/docs/hybrid">hybrid search docs</a></li>
<li id="src-23"><a href="https://www.pinecone.io/blog/full-text-search-generally-available/">Pinecone, full-text search is generally available (9 September 2026)</a></li>
<li id="src-24"><a href="https://redis.io/docs/latest/commands/ft.hybrid">Redis FT.HYBRID</a></li>
<li id="src-25"><a href="https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankFusion/">MongoDB $rankFusion</a></li>
<li id="src-26"><a href="https://docs.lancedb.com/search/hybrid-search">LanceDB hybrid search</a></li>
<li id="src-27"><a href="https://duckdb.org/docs/2.0/core_extensions/vss.html">DuckDB VSS extension</a></li>
<li id="src-28"><a href="https://github.com/ClickHouse/ClickHouse/pull/130214">ClickHouse PR #130214</a></li>
<li id="src-29"><a href="https://www.tigerdata.com/blog/pgvector-vs-qdrant">Tiger Data, pgvector vs Qdrant</a></li>
<li id="src-30"><a href="https://mariadb.org/big-vector-search-benchmark-10-databases-comparison/">MariaDB, vector search benchmark of 10 databases (11 March 2026)</a></li>
<li id="src-31"><a href="https://www.elastic.co/search-labs/blog/elasticsearch-bbq-vs-opensearch-faiss">Elastic, BBQ vs OpenSearch FAISS</a></li>
<li id="src-32"><a href="https://clickhouse.com/blog/elasticsearch-log-analytics-clickhouse">ClickHouse, log analytics against Elasticsearch (22 May 2026)</a></li>
<li id="src-33"><a href="https://www.latent.space/p/claude-code">Latent Space, Claude Code with Boris Cherny and Cat Wu (7 May 2025)</a></li>
<li id="src-34"><a href="https://jxnl.co/writing/2025/09/11/why-grep-beat-embeddings-in-our-swe-bench-agent-lessons-from-augment/">Jason Liu, why grep beat embeddings in Augment's SWE-bench agent (11 September 2025)</a></li>
<li id="src-35"><a href="https://www.letta.com/blog/benchmarking-ai-agent-memory">Letta, benchmarking AI agent memory</a></li>
<li id="src-36"><a href="https://cursor.com/blog/semsearch">Cursor, improving agent with semantic search (6 November 2025)</a></li>
<li id="src-37"><a href="https://arxiv.org/abs/2508.06600">Chen et al., BrowseComp-Plus (arXiv 2508.06600)</a></li>
<li id="src-38"><a href="https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents">Anthropic, effective context engineering for AI agents (29 September 2025)</a></li>
</ol>
</details>
