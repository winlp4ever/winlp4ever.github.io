---
title: B-trees, a lesson with exercises
date: 2026-11-12T20:00:00Z
description: How a B-tree keeps a huge sorted index a few page reads deep, how splits, borrows and merges keep it balanced, B+ trees and page fill, the variants from B-link trees to LSM-trees, how PostgreSQL, InnoDB, SQLite, LMDB, Btrfs and the Linux kernel use them, and eight proofs and seven problems to practise on.
tags: [algorithms, data-structures, databases]
category: code
glyph: btree
figures: 5
math: true
---

Binary search trees count comparisons. On disk, comparisons are nearly free and what costs is the read: a binary tree over a billion keys is 30 levels deep, and if every level is a separate read from a spinning disk at about 10 ms each, one lookup takes 0.3 seconds<sup><a href="#src-1">1</a></sup>. A **B-tree** puts hundreds of keys in each node and sizes the node to one disk page, so the same billion keys sit four or five levels deep, and the top levels stay in memory.

Rudolf Bayer and Edward McCreight described it at Boeing Scientific Research Laboratories in 1970. Their report kept an index of up to 100,000 keys on an IBM 360/44 with a 2311 disk, at an average of 9 transactions per second for 15,000 keys, and promised storage use "at least 50% but generally much higher"<sup><a href="#src-2">2</a></sup>. Nine years later Douglas Comer's survey was already called "The Ubiquitous B-Tree" and opened with "B-trees have become, de facto, a standard for file organization"<sup><a href="#src-3">3</a></sup>. They still are: PostgreSQL, MySQL, SQLite, MongoDB, LMDB, Btrfs, XFS and APFS all store their data in B-trees. Nobody knows for sure what the B stands for. Comer's footnote lists "balanced", "broad", "bushy" and "Boeing", and suggests thinking of them as "Bayer"-trees<sup><a href="#src-3">3</a></sup>.

This is the third lesson in a series. The [red-black tree lesson](/blog/red-black-trees/) covers the binary tree that turns out to be a B-tree in disguise, and the [segment tree lesson](/blog/segment-trees/) covers range queries over arrays.

## a node is a page

CLRS describes a B-tree by its **minimum degree** t ≥ 2<sup><a href="#src-4">4</a></sup>:

- every node except the root holds between t − 1 and 2t − 1 keys, in sorted order, and the root holds at least 1
- an internal node with k keys has k + 1 children, and the keys separate the children's ranges: everything in child i lies between key i − 1 and key i
- every leaf is at the same depth

Other books count differently. Knuth's "order m" is the most children a node can have, and Bayer, McCreight and Comer use "order d" for the fewest keys in a node. They all describe the same tree<sup><a href="#src-1">1</a></sup>.

With t = 2 a node has 2 to 4 children. That's the 2-3-4 tree from the red-black lesson, where a red-black tree is shown to be a 2-3-4 tree stored in binary nodes. Real B-trees use a t in the hundreds, chosen so a full node fills one page: 4 KB in SQLite, 8 KB in PostgreSQL, 16 KB in InnoDB.

<figure class="wide">
<bt-height data-fig data-label="fig 1 · how tall the tree gets">
<p class="fallback">Levels needed to hold a billion keys with full nodes: 30 for a binary tree, 8 with 16 children per node, 5 with 128 and 4 with 512. For a million keys the numbers are 20, 5, 3 and 3; for a trillion, 40, 10, 6 and 5. With the top two levels cached in memory, the 512-way tree needs 2 page reads per lookup over a billion keys.</p>
</bt-height>
<figcaption><b>fig 1</b>Each block is one level, so one node read per lookup. Switch the number of keys.<span class="m">Levels computed as ⌈log_f(n + 1)⌉ for full nodes with f children.</span></figcaption>
</figure>

### the height bound

The tree is tallest when every node is as empty as allowed. Then the root has 1 key and 2 children, and each level below has t times as many nodes as the one above, each with t − 1 keys. Counting keys level by level for a tree of height h<sup><a href="#src-4">4</a></sup>:

$$
n \;\ge\; 1 + (t-1)\sum_{i=1}^{h} 2t^{\,i-1} \;=\; 2t^h - 1
\quad\Longrightarrow\quad
h \le \log_t \frac{n+1}{2}
$$

For a billion keys and t = 100 that's h ≤ 4, so at most five levels including the root. Comer's table makes the same point with 1970s numbers: a B-tree of order 50 indexes a million records in at most 4 disk accesses<sup><a href="#src-3">3</a></sup>.

The cost model behind this is Aggarwal and Vitter's I/O model: memory holds M items, the disk moves blocks of B items, and an algorithm is charged per block transferred<sup><a href="#src-5">5</a></sup>. In that model a B-tree search costs $$O(\log_B N)$$ transfers, against $$O(\log_2 N)$$ for a binary tree<sup><a href="#src-6">6</a></sup>.

## search

Search works like a binary search tree with wider nodes. In each node, find the first key ≥ the target. If it's equal, done. Otherwise go down to the child just before that key. One node per level, so O(log_t n) node reads.

Inside a node there's a choice. Binary search costs $$O(\log t)$$ comparisons per node and O(log n) in total, whatever t is. Linear search costs O(t) per node but reads memory in order, which caches and prefetchers like. Rust's `BTreeMap` uses linear search with nodes of at most 11 keys, and its documentation says that's "generally worse than a BST" in comparisons, but "in practice, however, performance is excellent"<sup><a href="#src-7">7</a></sup><sup><a href="#src-8">8</a></sup>.

## insertion and splits

A new key always goes into a leaf, in sorted position. If the leaf now has 2t keys, one too many, it **splits** into two nodes of t and t − 1 keys, and the key between them moves up into the parent as their separator. If the parent is now too full, it splits the same way, and so on up. When the root splits, its middle key becomes a new root with two children. That's the only way a B-tree gets taller, which is why all leaves stay at the same depth<sup><a href="#src-3">3</a></sup>.

<figure class="wide">
<bt-insert data-fig data-label="fig 2 · inserting, with splits">
<p class="fallback">A B-tree with t = 2 after inserting 12, 3, 27, 6, 42, 48, 24, 63, 15, 60, 33 and 57. The twelfth key, 57, goes into the leaf holding 48 and 60 and 63; that leaf overflows and splits, sending 60 up; the parent now holds 12, 27, 42 and 60, which is too many, so it splits too and 42 becomes a new root: the tree grows from two levels to three. With t = 3 the same twelve keys fit in two levels.</p>
</bt-insert>
<figcaption><b>fig 2</b>Drag to insert one key at a time; switch between t = 2 and t = 3. The green outline marks where the new key landed and where a split's middle key went, ochre marks the two halves of a split.<span class="m">A real B-tree runs in the figure, with bottom-up splits. The keys are multiples of 3 in a seeded random order.</span></figcaption>
</figure>

CLRS writes insertion differently: on the way down, split every full node before stepping into it. The parent then always has room for a middle key, so one pass from root to leaf is enough and the code never walks back up<sup><a href="#src-4">4</a></sup>. The cost is that it sometimes splits a node that wouldn't have overflowed. In C++, with `t` the minimum degree:

```cpp
struct Node {
    int n = 0;                 // number of keys
    bool leaf = true;
    int key[2 * T - 1];
    Node* kid[2 * T];
};

// x->kid[i] is full (2T-1 keys) and x is not: split the child around its middle key
void split_child(Node* x, int i) {
    Node* y = x->kid[i];
    Node* z = new Node{T - 1, y->leaf};
    for (int j = 0; j < T - 1; j++) z->key[j] = y->key[j + T];
    if (!y->leaf) for (int j = 0; j < T; j++) z->kid[j] = y->kid[j + T];
    y->n = T - 1;
    for (int j = x->n; j > i; j--) x->kid[j + 1] = x->kid[j];
    x->kid[i + 1] = z;
    for (int j = x->n - 1; j >= i; j--) x->key[j + 1] = x->key[j];
    x->key[i] = y->key[T - 1];             // the middle key moves up
    x->n++;
}

void insert(Node*& root, int k) {
    if (root->n == 2 * T - 1) {            // full root: the tree grows here
        Node* s = new Node{0, false};
        s->kid[0] = root;
        split_child(s, 0);
        root = s;
    }
    Node* x = root;
    while (!x->leaf) {
        int i = x->n - 1;
        while (i >= 0 && k < x->key[i]) i--;
        i++;
        if (x->kid[i]->n == 2 * T - 1) {   // split before stepping in
            split_child(x, i);
            if (k > x->key[i]) i++;
        }
        x = x->kid[i];
    }
    int i = x->n - 1;                      // x is a leaf with room
    while (i >= 0 && k < x->key[i]) { x->key[i + 1] = x->key[i]; i--; }
    x->key[i + 1] = k;
    x->n++;
}
```

Both versions read and write O(h) nodes and do O(t·h) work moving keys inside nodes. On disk, the node reads dominate.

## deletion: borrow or merge

Deleting from a leaf can leave it with t − 2 keys, one too few. There are two fixes, tried in this order<sup><a href="#src-3">3</a></sup>:

- **borrow**: if a neighbouring sibling has more than t − 1 keys, rotate one through the parent. The separator in the parent comes down into the short node, and the sibling's nearest key goes up to replace it.
- **merge**: if both neighbours are at the minimum, glue the short node, the separator from the parent and one sibling into a single node. That has (t − 2) + 1 + (t − 1) = 2t − 2 keys, which fits. The parent lost a key, so it may now be short, and the fix repeats one level up.

If a merge takes the root's last key, the merged node becomes the root and the tree loses a level, the mirror of a root split. Deleting a key from an internal node first swaps it with its predecessor (the largest key in its left subtree, always in a leaf), so the actual removal always happens in a leaf.

<figure class="wide">
<bt-delete data-fig data-label="fig 3 · deleting, with borrows and merges">
<p class="fallback">A t = 2 B-tree with 14 keys: root 45; below it 15 and 30 on the left, 60 on the right; leaves 5 10, 20 25, 35 40, 50 and 70 80 90. Deleting 90 removes it from its leaf. Deleting 30 swaps it with its predecessor 25. Deleting 35 is a plain leaf delete. Deleting 60 swaps in 50, which empties a leaf, so it borrows 70 through the parent from its right sibling. Deleting 40 empties a leaf whose siblings are at the minimum, so it merges with 20 and pulls 25 down. Deleting 80 empties another leaf; the merge pulls 70 down, which empties the parent, whose merge pulls 45 down, which empties the root, and the tree drops from three levels to two: 15 45 over leaves 5 10, 20 25 and 50 70.</p>
</bt-delete>
<figcaption><b>fig 3</b>Step through six deletions. Green marks where the key was removed, ochre marks nodes changed by a borrow, a merge or the root shrinking.<span class="m">The same B-tree code as fig 2, with bottom-up deletion; the sequence was picked to show every case.</span></figcaption>
</figure>

CLRS again does it in one pass downwards. Before stepping into a child it makes sure the child has at least t keys, borrowing or merging in advance, so a deletion never has to come back up. Its cases are numbered 1, 2a to 2c and 3a to 3b, and exercise P5 below works through them<sup><a href="#src-4">4</a></sup>.

## B+ trees and range scans

Almost every database uses a **B+ tree**. All the records live in the leaves. The internal nodes only hold copies of separator keys, which Comer calls "a roadmap", and the leaves are linked left to right into a "sequence set"<sup><a href="#src-3">3</a></sup>. Internal nodes hold no values, so they fit more keys per page and the tree gets shallower. A range query goes down once to the first key and then reads leaves sideways until it passes the end of the range.

<figure class="wide">
<bt-range data-fig data-label="fig 4 · a range scan in a B+ tree">
<p class="fallback">A B+ tree over keys 1 to 48: twelve leaves of four keys each (labelled by their first and last key), linked left to right, three internal nodes above them and a root. The range 7 to 30 (24 keys) goes down through the root and one internal node to the leaf holding 5 to 8, then follows the leaf links through the leaves up to 29 to 32: 2 internal nodes and 7 leaves, 9 page reads.</p>
</bt-range>
<figcaption><b>fig 4</b>Move the ends of the range. The walk down is green, the walk along the leaf links is ochre.<span class="m">A bulk-loaded tree with made-up sizes; real leaves hold hundreds of keys.</span></figcaption>
</figure>

SQLite's file format spells out both kinds. A "table b-tree" is keyed by the 64-bit rowid and stores all data in the leaves; an "index b-tree" stores only keys<sup><a href="#src-9">9</a></sup>. In InnoDB, index records are stored in the leaf pages<sup><a href="#src-10">10</a></sup>.

## how full the pages are

A split leaves two half-full nodes. If keys arrive in random order those halves fill up again later, and Andrew Yao showed that under random insertions a B-tree of high order ends up about ln 2 ≈ 69% full on average<sup><a href="#src-11">11</a></sup>. Ascending keys are the bad case. Every insert lands in the rightmost leaf, every split leaves a left half that will never receive another key, and the tree settles at half full.

Databases special-case it. PostgreSQL's split code says: "If the page is the rightmost page on its level, we instead try to arrange to leave the left split page fillfactor% full. In this way, when we are inserting successively increasing keys (consider sequences, timestamps, etc) we will end up with a tree whose pages are about fillfactor% full, instead of the 50% full result that we'd get without this special case"<sup><a href="#src-12">12</a></sup>. The default leaf fillfactor is 90<sup><a href="#src-13">13</a></sup>. InnoDB keeps 1/16 of each page free and detects a sequential pattern when the new record lands right after the previous insert on the same page. It then splits at the insertion point, and its manual says sequential inserts leave pages "about 15/16 full", random ones "from 1/2 to 15/16 full"<sup><a href="#src-10">10</a></sup><sup><a href="#src-14">14</a></sup>.

<figure class="wide">
<bt-fill data-fig data-label="fig 5 · how full the pages end up">
<p class="fallback">Average leaf fill after inserting 20,000 keys into leaves of 64 keys each. Random keys with 50/50 splits: 68%, close to Yao's ln 2. Ascending keys with 50/50 splits: 52%, so the tree needs 606 leaves. Ascending keys with PostgreSQL-style rightmost splits that keep the left page 90% full: 91%, 345 leaves.</p>
</bt-fill>
<figcaption><b>fig 5</b>Hover a bar for the number of leaves.<span class="m">A simulation of the leaf level only, run in your browser; 64 keys per leaf is illustrative.</span></figcaption>
</figure>

Fewer leaves means fewer pages to read in a scan and fewer pages to cache. The reverse problem, pages emptied by deletions, has its own knob: InnoDB tries to merge a page with a neighbour when it falls below `MERGE_THRESHOLD`, 50% by default<sup><a href="#src-15">15</a></sup>.

## complexity, next to the alternatives

Costs in block transfers for N keys with B keys per block, from the BetrFS paper's table<sup><a href="#src-6">6</a></sup>:

| structure | insert | point query | range query (k results) |
|---|---|---|---|
| binary search tree | $$\log_2 N$$ | $$\log_2 N$$ | $$\log_2 N + k$$ |
| B-tree | $$\log_B N$$ | $$\log_B N$$ | $$\log_B N + k/B$$ |
| Bε-tree, ε = 1/2 | $$\log_B N / \sqrt{B}$$ | $$\log_B N$$ | $$\log_B N + k/B$$ |
| LSM-tree with Bloom filters | $$\log_B N / (\varepsilon B^{1-\varepsilon})$$ | $$\log_B N$$ | $$\log_B^2 N / \varepsilon + k/B$$ |

The binary row is the plain count of one block per node. The B-tree's weak spot is the insert column. Every insert pays the full $$\log_B N$$ reads and then rewrites a whole page to change a few bytes. The two structures below it buffer inserts and write them out in batches, which costs less per insert and more per range query.

## what you can improve

**Fuller nodes.** Knuth's B* tree delays splits: a full node first shifts keys into a sibling, and only when two siblings are both full do they split into three, each two-thirds full. Storage use is then at least 66% instead of 50%<sup><a href="#src-3">3</a></sup>.

**Shorter keys.** An internal node only needs separators that tell its children apart, and a separator can be shorter than any real key. Bayer and Unterauer's prefix B-trees store the shortest string that separates two leaves<sup><a href="#src-16">16</a></sup>, and PostgreSQL truncates key columns it doesn't need from the separators it creates when a leaf splits<sup><a href="#src-17">17</a></sup>. Shorter separators mean more children per page and a shallower tree.

**Bulk loading.** Building an index from sorted data doesn't need inserts at all: fill leaves left to right to the target fill factor and build each level above from the first keys of the level below. PostgreSQL's index build fills pages to fillfactor%, the same result as its rightmost-split rule<sup><a href="#src-12">12</a></sup>.

**Concurrency.** A split changes two nodes and their parent, and a reader walking down at that moment can end up in the wrong half. Lehman and Yao's B-link tree adds a right-link and a "high key" to every node. A reader that finds its key above the high key just follows the right-link, and updaters lock only a small constant number of nodes<sup><a href="#src-18">18</a></sup>. PostgreSQL's B-tree is "a correct implementation of Lehman and Yao's high-concurrency B-tree management algorithm"<sup><a href="#src-17">17</a></sup>. The other classic approach, latch coupling or "crabbing", holds the parent's latch until the child is known to be safe from splits and merges. CMU's database course has students build it in their B+ tree project<sup><a href="#src-19">19</a></sup>.

**Copy-on-write.** Never modify a page: write a changed copy, which changes its parent's pointer, so copy the parent too, up to the root. Old roots stay valid, which gives snapshots and crash safety for free. Ohad Rodeh's 2008 paper worked out B-trees that shadow pages this way and still support clones<sup><a href="#src-20">20</a></sup>, and Btrfs is built on it<sup><a href="#src-21">21</a></sup>. LMDB does the same in a memory-mapped file: "Data pages use a copy-on-write strategy so no active data pages are ever overwritten", which lets readers run without locks next to a single writer<sup><a href="#src-22">22</a></sup>.

**Buffered writes.** A Bε-tree gives each internal node a buffer for pending inserts and deletes and pushes them down in batches when it fills. Brodal and Fagerberg proved the trade-off between insert and query cost, and showed B-trees with buffers sit on the optimal curve<sup><a href="#src-23">23</a></sup>. Its nodes are much larger than a B-tree's, "a few hundred kilobytes to a few megabytes"<sup><a href="#src-6">6</a></sup>. Tokutek's fractal tree index is an implementation. The **LSM-tree** goes further: O'Neil and colleagues observed that keeping a B-tree index up to date can "effectively double the I/O cost of the transaction", and proposed collecting changes in memory and merging them into sorted runs on disk, like a merge sort<sup><a href="#src-24">24</a></sup>. RocksDB is the best-known descendant. Its tuning guide works through a leveled example with a write amplification of 33, meaning every byte written by the application is written 33 times to disk<sup><a href="#src-25">25</a></sup>. LSM-trees trade B-tree read performance for cheap writes.

**Latch-free pages.** Microsoft's Bw-tree never updates a page in place. It prepends delta records and swaps a pointer in a mapping table with compare-and-swap, so no thread ever waits on a latch. On an Xbox workload the paper measured 10.4 million operations per second against BerkeleyDB's 555,000<sup><a href="#src-26">26</a></sup>. SQL Server's in-memory engine, Hekaton, uses it.

**No page size at all.** Cache-oblivious B-trees by Bender, Demaine and Farach-Colton match the B-tree's $$O(\log_B N)$$ transfers without knowing B, so the same layout is efficient at every level of the memory hierarchy at once<sup><a href="#src-27">27</a></sup>.

**In memory.** B-trees win in RAM too, because RAM has its own blocks: 64-byte cache lines. Rust's documentation explains its choice of a B-tree for `BTreeMap`: in a binary tree "every single insertion triggers a heap-allocation, and every comparison is a potential cache-miss"<sup><a href="#src-7">7</a></sup>. Abseil measured libstdc++'s red-black `std::set<int32_t>` at 40 bytes per value and its own `btree_set<int32_t>` at 4.3 to 5.1<sup><a href="#src-28">28</a></sup>.

## case studies

**PostgreSQL.** `CREATE INDEX` builds a B-tree unless told otherwise<sup><a href="#src-13">13</a></sup>, stored in 8 KB pages<sup><a href="#src-29">29</a></sup>. On top of Lehman and Yao it adds left-links for backward scans, page-level read locks and a simplified version of Lanin and Shasha's deletion<sup><a href="#src-17">17</a></sup>. Since version 13 duplicate keys are stored once, followed by a sorted list of the rows that have them<sup><a href="#src-30">30</a></sup><sup><a href="#src-31">31</a></sup>. Since version 14 it can remove old row versions from a leaf before deciding to split it, which keeps update-heavy indexes from bloating<sup><a href="#src-31">31</a></sup>. A fast path caches the rightmost leaf so ascending inserts skip the walk from the root<sup><a href="#src-17">17</a></sup>.

**MySQL InnoDB.** The table itself is a B+ tree, the **clustered index**, keyed by the primary key with the whole row in the leaf. A table without a suitable key gets a hidden 6-byte row id that increases monotonically. Every secondary index stores the primary key columns as its pointer, so a lookup by a secondary index walks two B-trees: the secondary one to find the primary key, then the clustered one to find the row<sup><a href="#src-32">32</a></sup>. Pages are 16 KB by default<sup><a href="#src-10">10</a></sup>. This is why a random UUID makes a poor InnoDB primary key: inserts land on random pages all over the clustered index, which then fill to the half-to-15/16 range of random inserts. An auto-increment key appends to the rightmost page, which fills to 15/16.

**SQLite.** The whole database is one file of fixed-size pages, 4096 bytes by default since 2016<sup><a href="#src-33">33</a></sup>. Each table is a B+ tree keyed by rowid and each index is another B-tree. The file format is documented down to the byte: page type 13 is a table leaf, 5 a table interior page, 10 an index leaf and 2 an index interior page, and index keys are capped so every interior page holds at least 4 keys<sup><a href="#src-9">9</a></sup>. Exercise EX 5 decodes a database by hand.

**Filesystems.** Btrfs keeps everything in copy-on-write B-trees keyed by (object id, type, offset): file extents, checksums, directory entries, the extent allocation tree. Nodes are 16 KiB by default<sup><a href="#src-34">34</a></sup><sup><a href="#src-35">35</a></sup>. XFS uses B+ trees for free space (twice, by block number and by size), inodes, file extents, reverse mappings and reference counts<sup><a href="#src-36">36</a></sup>. ext4 indexes large directories with an HTree, which looks up "basically the same as it would in a B-Tree keyed by the hash value" of the file name, at most 2 or 3 levels deep<sup><a href="#src-37">37</a></sup>. Apple's APFS is copy-on-write with 4 KB B-tree nodes<sup><a href="#src-38">38</a></sup>.

**The Linux kernel's maple tree.** The red-black lesson ends with Linux replacing the red-black tree of virtual memory areas in 6.1. Its replacement is a B-tree "optimized for storing non-overlapping ranges", with nodes of about 256 bytes (four cache lines) holding up to 16 entries in a leaf, and safe to read under RCU while another thread writes<sup><a href="#src-39">39</a></sup><sup><a href="#src-40">40</a></sup>. The LWN article lists why the red-black tree lost: "rbtrees do not support ranges well, they are difficult to handle in a lockless manner", and walking them was slow enough that a separate linked list existed alongside<sup><a href="#src-40">40</a></sup>.

**Sorted sets in memory.** Redis's sorted sets were skip lists, and its development branch now stores large ones in "the packed B+ tree … implemented in zset_btree.c"<sup><a href="#src-41">41</a></sup>. Dragonfly made the same move and reports 2 to 3 bytes of overhead per entry for its B+ tree against about 37 for Redis's skip list<sup><a href="#src-42">42</a></sup>.

**More.** MongoDB's WiredTiger engine keeps keys and values only in leaf pages, 32 KB by default<sup><a href="#src-43">43</a></sup><sup><a href="#src-44">44</a></sup>. CouchDB uses an append-only B+ tree, so the root is rewritten on every update and readers always see a consistent snapshot<sup><a href="#src-45">45</a></sup>.

## exercises

Proofs and by-hand exercises first, then problems and two projects. The [USFCA B-tree visualizer](https://www.cs.usfca.edu/~galles/visualization/BTree.html) is handy for checking the by-hand ones.

<details class="ex">
<summary><span class="ex-n">P1</span><span class="ex-t">How tall can it get?</span><span class="ex-d"><b>●</b>○○ proof</span></summary>
<div class="ex-b">

Use $$h \le \log_t \frac{n+1}{2}$$ to bound the height for n = 10^6 and 10^9 with t = 2, 50 and 100. Then show that a tree of height h holds at most $$(2t)^{h+1} - 1$$ keys (CLRS 18.1-4).

<details><summary>hint</summary>

For the maximum, every node is full with 2t − 1 keys and 2t children.

</details>
<details><summary>solution sketch</summary>

n = 10^9: t = 2 gives h ≤ 28.9, t = 50 gives 5.1, t = 100 gives 4.35, so 28, 5 and 4. Maximum: level i has $$(2t)^i$$ nodes of 2t − 1 keys, and the sum over i = 0..h is $$(2t-1)\frac{(2t)^{h+1}-1}{2t-1} = (2t)^{h+1} - 1$$.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P2</span><span class="ex-t">Legal trees</span><span class="ex-d"><b>●</b>○○ by hand</span></summary>
<div class="ex-b">

Why does CLRS require t ≥ 2 (18.1-1)? Draw every valid t = 2 B-tree holding the keys 1 to 5 (18.1-3).

<details><summary>hint</summary>

With t = 1 a node could hold 0 keys. For the drawing, go by how many keys the root has.

</details>
<details><summary>solution sketch</summary>

t = 1 would allow empty non-root nodes, so internal nodes with one child and no bound on height. For keys 1 to 5 the root can't hold all five (max 3), so the root has 1 or 2 keys over leaves of 1 to 3 keys each: root 2 over [1] [3 4 5]; root 3 over [1 2] [4 5]; root 4 over [1 2 3] [5]; root 2 4 over [1] [3] [5]. Four trees.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P3</span><span class="ex-t">Fanout from a page</span><span class="ex-d"><b>●</b>○○ by hand</span></summary>
<div class="ex-b">

A PostgreSQL page is 8 KB with a 24-byte header and a 4-byte line pointer per entry<sup><a href="#src-29">29</a></sup>. Suppose an index entry on a bigint column takes 16 bytes plus its line pointer. Estimate the fanout and the number of levels for 10^9 rows. Repeat for a 16 KB InnoDB page with 1/16 kept free.

<details><summary>hint</summary>

Fanout ≈ usable bytes / bytes per entry. Levels ≈ ⌈log_f(N)⌉ when leaves hold about f entries too.

</details>
<details><summary>solution sketch</summary>

(8192 − 24) / (16 + 4) ≈ 408 entries; at 90% fill about 367. $$367^3 \approx 4.9 \cdot 10^7$$ and $$367^4 \approx 1.8 \cdot 10^{10}$$, so 4 levels. InnoDB: 16384 · 15/16 = 15360 usable bytes; with the same 20 bytes per entry that's about 768 entries, and again 4 levels for 10^9 rows. The top two levels are a few hundred pages, small enough to stay cached.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P4</span><span class="ex-t">Insert by hand</span><span class="ex-d"><b>●●</b>○ by hand</span></summary>
<div class="ex-b">

CLRS 18.2-1: insert F S Q K C L H T V W M R N P A B X Y D Z E into an empty t = 2 B-tree, using the split-on-the-way-down rule. Draw the tree after each split. Then redo it with bottom-up splits as in fig 2 and compare the final trees.

<details><summary>hint</summary>

The top-down rule splits a full node you pass through even when the new key wouldn't overflow it.

</details>
<details><summary>solution sketch</summary>

Check each step in the visualizer. The two final trees can differ: top-down splitting splits full nodes early, so it tends to leave more half-full nodes. Both are valid B-trees of the same height here.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P5</span><span class="ex-t">Delete cases</span><span class="ex-d"><b>●●</b>○ by hand</span></summary>
<div class="ex-b">

CLRS 18.3-1: delete C, P and V, in that order, from the tree in figure 18.8(f), and name the case used at each step. Then replay fig 3's six deletions and match each one to a CLRS case.

<details><summary>hint</summary>

The CLRS rule: before stepping into a child, make sure it has at least t keys.

</details>
<details><summary>solution sketch</summary>

Fig 3's first and third deletions are case 1 (leaf). The second is an internal key replaced by its predecessor, case 2a. The fourth and fifth need a borrow (3a) and a merge (3b), but bottom-up, after the fact. The last cascades two merges and shrinks the root, which CLRS would do on the way down by merging before descending.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P6</span><span class="ex-t">2-3-4 trees and red-black trees</span><span class="ex-d"><b>●●</b>○ proof</span></summary>
<div class="ex-b">

Show that absorbing every red node of a red-black tree into its black parent gives a t = 2 B-tree, and give the reverse mapping (CLRS 18.1-5). Fig 1 of the [red-black lesson](/blog/red-black-trees/) draws it.

<details><summary>hint</summary>

Black-height in the red-black tree becomes depth in the B-tree.

</details>
<details><summary>solution sketch</summary>

A black node absorbs at most two red children (rule 4 forbids red-red), so a node gets 1 to 3 keys. Every root-to-leaf path has the same number of black nodes, so every B-tree leaf is at the same depth. Reverse: a 2-node becomes a black node, a 3-node a black node with one red child (either side), a 4-node a black node with two red children.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P7</span><span class="ex-t">Ascending inserts</span><span class="ex-d"><b>●●</b>○ proof</span></summary>
<div class="ex-b">

Insert 1, 2, …, n into an empty t = 2 B-tree with bottom-up splits. How full are the leaves at the end? Then explain why PostgreSQL's 90% rightmost split and InnoDB's split at the insertion point fix it, and what each would do with descending keys.

<details><summary>hint</summary>

After a split of the rightmost leaf, which half will ever see another key?

</details>
<details><summary>solution sketch</summary>

Each split of the rightmost leaf leaves a left half of t − 1 keys that never grows again, so almost every leaf ends at the minimum: half full. Leaving the left page 90% full (or full, for InnoDB) puts the waste only in the one page still receiving keys. PostgreSQL's rule only triggers on the rightmost page, so descending keys get 50/50 splits. InnoDB's heuristic checks whether the insert lands next to the previous one, so it detects both directions; its manual says ascending or descending.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P8</span><span class="ex-t">Choosing the page size</span><span class="ex-d"><b>●●●</b> proof</span></summary>
<div class="ex-b">

CLRS 18.2-7: reading a node with minimum degree t takes a + b·t time, with a = 5 ms of seek and b = 10 µs per key. Which t minimises the time of a search?

<details><summary>hint</summary>

The search reads about $$\log_t n$$ nodes. Minimise $$(a + bt)/\ln t$$.

</details>
<details><summary>solution sketch</summary>

Setting the derivative to zero gives $$\ln t = 1 + a/(bt)$$, that is $$t(\ln t - 1) = a/b = 500$$. That's t ≈ 130. The curve is flat around it, so anything from about 100 to 200 is within a few percent, which is why page sizes don't need fine tuning.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 1</span><span class="ex-t">Time Based Key-Value Store</span><span class="ex-d"><b>●</b>○○ LeetCode 981</span></summary>
<div class="ex-b">

[leetcode.com/problems/time-based-key-value-store](https://leetcode.com/problems/time-based-key-value-store/). `set(key, value, timestamp)`, and `get(key, t)` returns the value with the largest timestamp ≤ t.

<details><summary>hint</summary>

A per-key ordered map and a predecessor query, the same thing a database does with an index on (key, timestamp).

</details>
<details><summary>solution sketch</summary>

Map each key to a `BTreeMap` (or `std::map`) from timestamp to value; `get` is `upper_bound(t)` then one step back. O(log n) per call. Timestamps arrive increasing here, so a plain array with binary search also works, which is the "append to the rightmost leaf" case.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 2</span><span class="ex-t">Data Stream as Disjoint Intervals</span><span class="ex-d"><b>●●</b>○ LeetCode 352</span></summary>
<div class="ex-b">

[leetcode.com/problems/data-stream-as-disjoint-intervals](https://leetcode.com/problems/data-stream-as-disjoint-intervals/). Numbers arrive one at a time; at any point, report the stream as a sorted list of disjoint intervals.

<details><summary>hint</summary>

Store intervals keyed by their start, like the maple tree stores ranges. A new number can only touch its predecessor and successor interval.

</details>
<details><summary>solution sketch</summary>

Ordered map start → end. For x: find the interval starting at or before x; if it covers x, done. Otherwise check whether x extends it (end = x − 1), whether the next interval starts at x + 1, merge the ones that touch and insert [x, x] otherwise. O(log n) per number, O(k) to list.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 3</span><span class="ex-t">Range Module</span><span class="ex-d"><b>●●●</b> LeetCode 715</span></summary>
<div class="ex-b">

[leetcode.com/problems/range-module](https://leetcode.com/problems/range-module/). Add, remove and query half-open ranges [l, r) over coordinates up to 10^9.

<details><summary>hint</summary>

Keep disjoint intervals in an ordered map. Adding and removing both start by finding the first interval that could overlap.

</details>
<details><summary>solution sketch</summary>

Add: find all intervals overlapping or touching [l, r), erase them and insert their union. Remove: cut overlapping intervals, keeping the parts left of l and right of r. Query: the interval starting at or before l must cover r. Each operation erases intervals it has to touch, so O(log n) amortized. The segment tree lesson's dynamic tree is the other approach.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 4</span><span class="ex-t">Salary Queries with your own B-tree</span><span class="ex-d"><b>●●●</b> CSES 1144</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1144](https://cses.fi/problemset/task/1144). Salaries change; count employees with a salary in [a, b]. Solve it with a B-tree you write yourself, storing in each internal node the number of keys under each child.

<details><summary>hint</summary>

A counted B-tree: rank(x) adds up the counts of the children left of the path, plus the keys passed in each node.

</details>
<details><summary>solution sketch</summary>

Key = (salary, id) to allow duplicates. Insert and delete update the counts along the path, and splits and merges recompute the counts of the nodes they touch. The answer is rank(b + 1) − rank(a). With t around 16 the tree is 4 or 5 levels deep for 4·10^5 keys. The same tree answers CSES 2163 Josephus Problem II by selecting the k-th key.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 5</span><span class="ex-t">Decode a SQLite file by hand</span><span class="ex-d"><b>●●</b>○ project</span></summary>
<div class="ex-b">

Create a database with one table and a few thousand rows, then read it with `xxd`: check the magic string "SQLite format 3", read the page size at offset 16, decode page 1's B-tree header at offset 100 (page type, cell count, cell pointers) and follow one interior page down to a leaf<sup><a href="#src-9">9</a></sup>.

<details><summary>hint</summary>

Page 1 is the schema table, a table B-tree whose rows give the root page number of every table and index.

</details>
<details><summary>solution sketch</summary>

Read the root page number of your table from the schema table, jump to offset (page − 1) × page size, read the type byte (5 interior, 13 leaf), then the cells. An interior cell is a 4-byte child page number followed by a varint rowid. Compare your count of pages per level with SQLite's `dbstat` virtual table.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 6</span><span class="ex-t">Build a database with a B-tree</span><span class="ex-d"><b>●●●</b> project</span></summary>
<div class="ex-b">

Follow [Let's Build a Simple Database](https://cstack.github.io/db_tutorial/), a SQLite clone in C that stores a table in a B-tree of 4 KB pages, then add what the tutorial leaves out: deletion with merges.

<details><summary>hint</summary>

Write the P1-style validator from the red-black lesson for B-trees first: key order, key counts per node and equal leaf depth.

</details>
<details><summary>solution sketch</summary>

Deletion: remove the cell from the leaf; if the leaf drops below half, borrow from a sibling through the parent or merge, then fix the parent the same way, and free the merged page. Run the validator after every operation in a randomized test against `std::map`.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 7</span><span class="ex-t">A concurrent B+ tree</span><span class="ex-d"><b>●●●</b> project</span></summary>
<div class="ex-b">

CMU 15-445's [BusTub B+ tree project](https://15445.courses.cs.cmu.edu/fall2025/project2/): a disk-backed B+ tree with insert, delete with borrow and merge, an iterator for range scans, and latch crabbing so many threads can use it at once<sup><a href="#src-19">19</a></sup>.

<details><summary>hint</summary>

For latch crabbing, a node is "safe" for an insert if it isn't full and for a delete if it's above the minimum; once the child is safe, release every latch above it.

</details>
<details><summary>solution sketch</summary>

Readers take shared latches hand over hand. Writers take exclusive latches down the path and release the ancestors whenever the current node is safe, so splits and merges only touch latched nodes. Always latch top-down and left-to-right to avoid deadlocks. Compare with the B-link approach in "what you can improve", which needs fewer latches.

</details>
</div>
</details>

Comer's survey is 17 pages and still the best short introduction to the whole family<sup><a href="#src-3">3</a></sup>. For the database side, PostgreSQL's nbtree README explains how a production B-tree handles concurrency, deletion and duplicates<sup><a href="#src-17">17</a></sup>.

My recommendation: write insertion with bottom-up splits once, with a validator, and read fig 2 next to the red-black tree's insertion to see the same split from two sides. After that, the variants worth knowing first are the B+ tree, the rightmost-split rule and the B-link tree.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://en.wikipedia.org/wiki/B-tree">Wikipedia, B-tree (read 12 November 2026)</a></li>
<li id="src-2"><a href="https://infolab.usc.edu/csci585/Spring2010/den_ar/indexing.pdf">Bayer and McCreight, organization and maintenance of large ordered indices, Boeing Scientific Research Laboratories report 20 (July 1970)</a></li>
<li id="src-3"><a href="https://users.cs.utah.edu/~pandey/courses/cs6530/fall24/papers/trees/p121-comer.pdf">Comer, the ubiquitous B-tree, ACM Computing Surveys 11(2) (1979)</a></li>
<li id="src-4"><a href="https://www.cs.rochester.edu/u/gildea/csc282/slides/C18-BTree.pdf">Gildea, B-trees lecture slides following CLRS chapter 18, University of Rochester</a></li>
<li id="src-5"><a href="https://www.cs.dartmouth.edu/~dfk/research/project/pario/archive/bib/bibtex/aggarwal-sorting.bib">Aggarwal and Vitter, the input/output complexity of sorting and related problems, CACM 31(9) (1988)</a></li>
<li id="src-6"><a href="https://www.cs.unc.edu/~porter/pubs/a18-jannen.pdf">Jannen et al., BetrFS: write-optimization in a kernel file system, ACM Transactions on Storage 11(4) (2015)</a></li>
<li id="src-7"><a href="https://doc.rust-lang.org/std/collections/struct.BTreeMap.html">Rust standard library, BTreeMap documentation (read 12 November 2026)</a></li>
<li id="src-8"><a href="https://github.com/rust-lang/rust/blob/master/library/alloc/src/collections/btree/node.rs">Rust source, library/alloc/src/collections/btree/node.rs (read 12 November 2026)</a></li>
<li id="src-9"><a href="https://www.sqlite.org/fileformat.html">SQLite, database file format (read 12 November 2026)</a></li>
<li id="src-10"><a href="https://dev.mysql.com/doc/refman/8.0/en/innodb-physical-structure.html">MySQL 8.0 reference manual, the physical structure of an InnoDB index (read 12 November 2026)</a></li>
<li id="src-11"><a href="https://link.springer.com/article/10.1007/BF00289075">Yao, on random 2-3 trees, Acta Informatica 9 (1978)</a></li>
<li id="src-12"><a href="https://github.com/postgres/postgres/blob/master/src/backend/access/nbtree/nbtsplitloc.c">PostgreSQL source, src/backend/access/nbtree/nbtsplitloc.c (read 12 November 2026)</a></li>
<li id="src-13"><a href="https://www.postgresql.org/docs/current/sql-createindex.html">PostgreSQL documentation, CREATE INDEX (read 12 November 2026)</a></li>
<li id="src-14"><a href="https://github.com/mysql/mysql-server/blob/trunk/storage/innobase/btr/btr0btr.cc">MySQL source, storage/innobase/btr/btr0btr.cc (read 12 November 2026)</a></li>
<li id="src-15"><a href="https://dev.mysql.com/doc/refman/8.0/en/index-page-merge-threshold.html">MySQL 8.0 reference manual, configuring the merge threshold for index pages (read 12 November 2026)</a></li>
<li id="src-16"><a href="https://dblp.org/rec/journals/tods/BayerU77.html">Bayer and Unterauer, prefix B-trees, ACM Transactions on Database Systems 2(1) (1977)</a></li>
<li id="src-17"><a href="https://github.com/postgres/postgres/blob/master/src/backend/access/nbtree/README">PostgreSQL source, src/backend/access/nbtree/README (read 12 November 2026)</a></li>
<li id="src-18"><a href="https://www.csd.uoc.gr/~hy460/pdf/p650-lehman.pdf">Lehman and Yao, efficient locking for concurrent operations on B-trees, ACM Transactions on Database Systems 6(4) (1981)</a></li>
<li id="src-19"><a href="https://15445.courses.cs.cmu.edu/fall2025/project2/">CMU 15-445/645, project 2: B+ tree index (fall 2025)</a></li>
<li id="src-20"><a href="https://www.usenix.org/conference/2007-linux-storage-filesystem-workshop/b-trees-shadowing-and-clones">Rodeh, B-trees, shadowing, and clones (2007 talk; ACM Transactions on Storage 3(4), 2008)</a></li>
<li id="src-21"><a href="https://btrfs.readthedocs.io/en/latest/dev/dev-btrfs-design.html">Btrfs documentation, design (read 12 November 2026)</a></li>
<li id="src-22"><a href="https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/lmdb.h">LMDB source, libraries/liblmdb/lmdb.h (read 12 November 2026)</a></li>
<li id="src-23"><a href="https://cs.au.dk/~gerth/papers/soda03.pdf">Brodal and Fagerberg, lower bounds for external memory dictionaries, SODA 2003</a></li>
<li id="src-24"><a href="https://www.cs.umb.edu/~poneil/lsmtree.pdf">O'Neil, Cheng, Gawlick and O'Neil, the log-structured merge-tree, Acta Informatica 33 (1996)</a></li>
<li id="src-25"><a href="https://github.com/facebook/rocksdb/wiki/RocksDB-Tuning-Guide">RocksDB wiki, tuning guide (read 12 November 2026)</a></li>
<li id="src-26"><a href="https://faculty.cc.gatech.edu/~jarulraj/courses/4420-s19/papers/08-oltpindexes1/bwtree-icde2013.pdf">Levandoski, Lomet and Sengupta, the Bw-tree: a B-tree for new hardware platforms, ICDE 2013</a></li>
<li id="src-27"><a href="https://erikdemaine.org/papers/FOCS2000b/">Bender, Demaine and Farach-Colton, cache-oblivious B-trees, FOCS 2000</a></li>
<li id="src-28"><a href="https://abseil.io/about/design/btree">Abseil, B-tree containers design note (read 12 November 2026)</a></li>
<li id="src-29"><a href="https://www.postgresql.org/docs/current/storage-page-layout.html">PostgreSQL documentation, database page layout (read 12 November 2026)</a></li>
<li id="src-30"><a href="https://www.postgresql.org/docs/release/13.0/">PostgreSQL 13 release notes</a></li>
<li id="src-31"><a href="https://www.postgresql.org/docs/current/btree.html">PostgreSQL documentation, B-tree indexes (read 12 November 2026)</a></li>
<li id="src-32"><a href="https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html">MySQL 8.0 reference manual, clustered and secondary indexes (read 12 November 2026)</a></li>
<li id="src-33"><a href="https://www.sqlite.org/pgszchng2016.html">SQLite, the default page size change of 2016</a></li>
<li id="src-34"><a href="https://btrfs.readthedocs.io/en/latest/dev/On-disk-format.html">Btrfs documentation, on-disk format (read 12 November 2026)</a></li>
<li id="src-35"><a href="https://btrfs.readthedocs.io/en/latest/mkfs.btrfs.html">Btrfs documentation, mkfs.btrfs (read 12 November 2026)</a></li>
<li id="src-36"><a href="https://www.kernel.org/doc/html/latest/filesystems/xfs/xfs-online-fsck-design.html">Linux kernel documentation, XFS online fsck design (read 12 November 2026)</a></li>
<li id="src-37"><a href="https://www.kernel.org/doc/html/latest/filesystems/ext4/directory.html">Linux kernel documentation, ext4 directory entries (read 12 November 2026)</a></li>
<li id="src-38"><a href="https://developer.apple.com/support/apple-file-system/Apple-File-System-Reference.pdf">Apple, Apple File System reference</a></li>
<li id="src-39"><a href="https://docs.kernel.org/core-api/maple_tree.html">Linux kernel documentation, maple tree (read 12 November 2026)</a></li>
<li id="src-40"><a href="https://lwn.net/Articles/845507/">LWN, introducing maple trees (12 February 2021)</a></li>
<li id="src-41"><a href="https://github.com/redis/redis/blob/unstable/src/t_zset.c">Redis source, src/t_zset.c on the unstable branch (read 12 November 2026)</a></li>
<li id="src-42"><a href="https://www.dragonflydb.io/blog/dragonfly-new-sorted-set">Dragonfly blog, Dragonfly's new sorted set implementation</a></li>
<li id="src-43"><a href="https://source.wiredtiger.com/develop/arch-btree.html">WiredTiger documentation, B-tree architecture (read 12 November 2026)</a></li>
<li id="src-44"><a href="https://source.wiredtiger.com/develop/tune_page_size_and_comp.html">WiredTiger documentation, tuning page size and compression (read 12 November 2026)</a></li>
<li id="src-45"><a href="https://guide.couchdb.org/draft/btree.html">CouchDB: the definitive guide, the power of B-trees</a></li>
</ol>
</details>
