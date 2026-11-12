---
title: Segment trees, a lesson with exercises
date: 2026-11-12T19:00:00Z
description: How a segment tree answers range queries and updates in O(log n), starting from buckets, with lazy propagation, searching inside the tree, the variants worth knowing, the sum tree inside prioritized experience replay, and sixteen problems to practise on.
tags: [algorithms, data-structures, competitive-programming]
category: code
glyph: segtree
figures: 5
math: true
---

You have an array of n numbers and two kinds of requests that keep arriving in any order: change one number, or tell me the sum (or the minimum, or the gcd) of the numbers between positions l and r. With n and the number of requests both around 200,000, which is the usual size on judges like CSES, anything that costs O(n) per request does about 40 billion steps, which is far too slow.

The two obvious structures each make one request cheap and the other expensive. A plain array updates in O(1) and sums a range by looping, O(n). A prefix-sum array answers any range sum in O(1) as $$P[r+1] - P[l]$$, but changing one number shifts every prefix after it, O(n). A segment tree pays O(log n) for both, which for n = 200,000 is about 18 steps. For ordered sets with insert and delete, see the companion lesson on [red-black trees](/blog/red-black-trees/).

## buckets first

The idea a segment tree refines is older and simpler. Cut the array into blocks of about $$\sqrt{n}$$ numbers and keep each block's sum next to it. A range sum then adds the sums of the blocks that lie fully inside the range, plus the loose numbers at the two ragged ends<sup><a href="#src-1">1</a></sup>.

<figure class="wide">
<sg-buckets data-fig data-label="fig 1 · buckets">
<p class="fallback">Sixteen numbers, 4 5 3 4 5 9 8 4 4 7 2 4 6 4 1 9, split into four buckets of four, each bucket labelled with its sum. Two sliders pick a range. For the range from 2 to 13 the two middle buckets are fully inside, so their stored sums are used, and the four loose numbers at positions 2, 3, 12 and 13 are added one by one: 6 reads instead of 12, for a total of 60.</p>
</sg-buckets>
<figcaption><b>fig 1</b>Move l and r. Outlined buckets contribute their stored sum; shaded cells are read one by one.<span class="m">The numbers are random (seeded).</span></figcaption>
</figure>

With blocks of size b, a query reads at most n/b block sums and at most 2b loose numbers. That total is smallest when $$b = \sqrt{n}$$, which gives $$O(\sqrt{n})$$ per query. A point update for sums is O(1): change the number and add the difference to its block's sum. For minimum it's $$O(\sqrt{n})$$, because the block has to be rescanned when its smallest number gets bigger.

At n = 200,000 that's about 900 reads per query, roughly 50 times worse than the tree. Buckets still earn a place. They are easy to get right under contest pressure, and Mo's algorithm, which answers range queries offline by sorting them so the window moves little between queries, is built on the same block idea and handles questions like "how many distinct values in [l, r]" that don't merge nicely<sup><a href="#src-1">1</a></sup>.

## the tree

The segment tree takes the bucket idea and repeats it. The root covers the whole array. Each node splits its range in half and gives one half to each child, down to leaves that cover one position each. Every node stores the sum of its range<sup><a href="#src-2">2</a></sup>.

Stored as an array, node 1 is the root and node v has children 2v and 2v + 1, the same numbering as a binary heap. With n a power of two the tree has exactly 2n − 1 nodes and $$\log_2 n$$ levels below the root.

A query for [l, r] starts at the root and asks three questions of each node it reaches:

- if the node's range misses [l, r] entirely, it contributes nothing (the identity, 0 for sums)
- if the node's range lies entirely inside [l, r], it contributes its stored sum and the walk stops there
- otherwise it asks both children and adds their answers

<figure class="wide">
<sg-query data-fig data-label="fig 2 · a range query">
<p class="fallback">A segment tree over the same sixteen numbers, five levels from the root (79) to the leaves. For the query [3, 12] the walk uses four nodes whose ranges fit inside: the leaf at 3, the node for 4 to 7, the node for 8 to 11 and the leaf at 12. Their sums give 53. It visits 15 of the 31 nodes in total; nodes it never reaches are faded and nodes it reaches but that miss the range are dashed.</p>
</sg-query>
<figcaption><b>fig 2</b>Green nodes are the ones whose stored sum is used. Outlined nodes are split, dashed ones are visited but miss the range. Try a range that starts at 1 and ends at 14.<span class="m">Same seeded numbers as fig 1.</span></figcaption>
</figure>

```cpp
// t has 4n slots; node v covers [lo, hi]
long long t[4 * N];

void build(const vector<long long>& a, int v, int lo, int hi) {
    if (lo == hi) { t[v] = a[lo]; return; }
    int m = (lo + hi) / 2;
    build(a, 2 * v, lo, m);
    build(a, 2 * v + 1, m + 1, hi);
    t[v] = t[2 * v] + t[2 * v + 1];
}

long long query(int v, int lo, int hi, int l, int r) {
    if (r < lo || hi < l) return 0;            // misses: identity
    if (l <= lo && hi <= r) return t[v];       // inside: use the stored sum
    int m = (lo + hi) / 2;
    return query(2 * v, lo, m, l, r) + query(2 * v + 1, m + 1, hi, l, r);
}
```

### why a query is O(log n)

Look at the nodes the walk reaches on one level. They form a contiguous run, because [l, r] is contiguous. Every node strictly inside the run is covered completely, so it returns its sum without going further. Only the first and the last node of the run can be partly covered, and only those two make recursive calls. Two nodes with two children each means at most four nodes on the next level<sup><a href="#src-2">2</a></sup>.

So a query visits at most $$4\log_2 n$$ nodes, and at most two per level are used whole, which bounds the answer by $$2\log_2 n$$ stored sums. In fig 2 the worst range on 16 leaves uses 6 stored sums and visits 15 nodes. That's the case where l and r sit one position inside the edges of the array, like [1, 14].

Building is O(n): every node is computed once from its two children.

## updates

Changing a[i] only affects the nodes whose range contains i: the leaf and its ancestors, one per level. Set the leaf, then walk up and recompute each parent from its two children.

<figure class="wide">
<sg-update data-fig data-label="fig 3 · a point update">
<p class="fallback">The figure sets a[5] from 9 to 2 and walks up one level at a time: the leaf (9 becomes 2), the node for 4 and 5 (14 becomes 7), the node for 4 to 7 (26 becomes 19), the node for 0 to 7 (42 becomes 35) and the root (79 becomes 72). Five nodes are recomputed, each as the sum of its two children; the other 26 keep their values.</p>
</sg-update>
<figcaption><b>fig 3</b>A point update touches one node per level, log2(n) + 1 nodes in total.<span class="m">Timeline: scrub to replay.</span></figcaption>
</figure>

```cpp
void update(int v, int lo, int hi, int i, long long x) {
    if (lo == hi) { t[v] = x; return; }
    int m = (lo + hi) / 2;
    if (i <= m) update(2 * v, lo, m, i, x);
    else        update(2 * v + 1, m + 1, hi, i, x);
    t[v] = t[2 * v] + t[2 * v + 1];
}
```

The array has 4n slots because with heap numbering and n not a power of two, the deepest leaf can get an index close to 4n. The tree itself has only 2n − 1 nodes; the rest of the array is gaps<sup><a href="#src-2">2</a></sup>. Exercise P2 below asks you to prove the 4n bound.

## what a node can hold

Nothing above used anything about addition except two facts: you can combine two neighbouring answers into one, and there's a value that changes nothing when combined (0 for sums). In algebra that's a **monoid**: an associative operation with an identity. Minimum with $$+\infty$$, maximum with $$-\infty$$, gcd with 0, bitwise xor with 0 and matrix product with the identity matrix all work.

The operation doesn't have to be commutative. It has to be combined in order, left child first.

Some of the best segment tree problems are about inventing the node. For the largest sum of a contiguous run inside [l, r], a node needs four numbers: the total, the best prefix, the best suffix and the best run anywhere. Two neighbours merge like this:

$$
\begin{aligned}
\text{sum} &= L.\text{sum} + R.\text{sum} \\
\text{pre} &= \max(L.\text{pre},\ L.\text{sum} + R.\text{pre}) \\
\text{suf} &= \max(R.\text{suf},\ R.\text{sum} + L.\text{suf}) \\
\text{best} &= \max(L.\text{best},\ R.\text{best},\ L.\text{suf} + R.\text{pre})
\end{aligned}
$$

The last line says the best run is either entirely in one half or crosses the middle, in which case it's a suffix of the left half followed by a prefix of the right half. Exercises 8 and 9 use this node.

## range updates and lazy tags

Now the update itself covers a range: add 3 to every number in [2, 11]. Walking down to every leaf in the range costs O(n) again. The fix is to treat the update like a query. The walk stops at the same O(log n) nodes that fit inside the range, updates their sums (a node covering k positions gains 3k), and leaves a note on each one, a **lazy tag**, that says "my children still owe +3". The children are fixed only when a later operation has to pass through that node, and then only one level at a time<sup><a href="#src-2">2</a></sup>.

<figure class="wide">
<sg-lazy data-fig data-label="fig 4 · lazy tags">
<p class="fallback">Four operations on the sixteen numbers. Step 1, add 3 to [2, 11]: three nodes take a +3 tag (the node for 2 and 3, the node for 4 to 7 and the node for 8 to 11) and nine nodes are visited. Step 2, sum of [0, 5] = 42: the query passes through the node for 4 to 7, so its tag is pushed down one level to its two children; seven nodes visited. Step 3, add 1 to [6, 13]: three more tags, eleven nodes visited. Step 4, sum of [8, 8] = 8: two tags are pushed down on the way to that leaf.</p>
</sg-lazy>
<figcaption><b>fig 4</b>Pick a step. Green nodes take a new tag, ochre-outlined nodes push their tag down to their children, and the ochre badge shows what a node's children still owe. Sums in each node are always correct for its own range.<span class="m">A real lazy tree runs these four operations; the counts are computed.</span></figcaption>
</figure>

```cpp
long long tag[4 * N];   // what this node's children still owe

void apply(int v, int lo, int hi, long long x) {
    t[v] += x * (hi - lo + 1);
    tag[v] += x;
}
void push(int v, int lo, int hi) {       // settle the debt one level down
    if (!tag[v]) return;
    int m = (lo + hi) / 2;
    apply(2 * v, lo, m, tag[v]);
    apply(2 * v + 1, m + 1, hi, tag[v]);
    tag[v] = 0;
}
void add(int v, int lo, int hi, int l, int r, long long x) {
    if (r < lo || hi < l) return;
    if (l <= lo && hi <= r) { apply(v, lo, hi, x); return; }
    push(v, lo, hi);
    int m = (lo + hi) / 2;
    add(2 * v, lo, m, l, r, x);
    add(2 * v + 1, m + 1, hi, l, r, x);
    t[v] = t[2 * v] + t[2 * v + 1];
}
// query is the same as before, with push(v, lo, hi) before recursing
```

Both range add and range query now cost O(log n). The hard part in harder problems is composing tags. If the tree supports both "add x" and "set to x", a node can hold a pending set and a pending add at once, and the order matters: a new set wipes any pending add, while a new add on top of a pending set changes the set's value. Exercise 11 (CSES Range Updates and Sums) drills this.

## searching inside the tree

A segment tree can also tell you where something is in the array. To find the first index whose prefix sum reaches k (with no negative numbers), start at the root. If the left child's sum is at least k, the answer is on the left. Otherwise subtract the left sum from k and go right. One node per level, O(log n)<sup><a href="#src-2">2</a></sup>.

```cpp
int first_prefix_at_least(long long k) {   // all values >= 0
    int v = 1, lo = 0, hi = n - 1;
    while (lo < hi) {
        int m = (lo + hi) / 2;
        if (t[2 * v] >= k) { v = 2 * v; hi = m; }
        else { k -= t[2 * v]; v = 2 * v + 1; lo = m + 1; }
    }
    return lo;
}
```

A binary search over positions that calls a range query at each step would cost $$O(\log^2 n)$$. The descent gets O(log n) because the sums it needs are already sitting in the nodes it walks through. The same trick on a max tree finds the first position with a value at least x (exercise 6), and on a tree of 0s and 1s finds the k-th remaining element (exercise 7).

## complexity, next to the alternatives

| structure | point update | range query | range update | memory |
|---|---|---|---|---|
| plain array | O(1) | O(n) | O(n) | n |
| prefix sums | O(n) | O(1) | O(n) | n + 1 |
| buckets | O(1) for sums, $$O(\sqrt n)$$ for min | $$O(\sqrt n)$$ | $$O(\sqrt n)$$ | $$n + \sqrt n$$ |
| Fenwick tree | O(log n) | O(log n), invertible ops only | O(log n) with tricks | n + 1 |
| segment tree | O(log n) | O(log n), any monoid | O(log n) with lazy tags | 2n to 4n |

The **Fenwick tree** (binary indexed tree) is the segment tree's smaller cousin. Peter Fenwick published it in 1994 for the cumulative frequency tables of arithmetic coding<sup><a href="#src-3">3</a></sup>. It stores n + 1 numbers and its loops are a few lines long. The catch is that it answers prefix queries, so a range [l, r] comes from prefix(r) − prefix(l − 1), which needs subtraction. For minimum there is no subtraction, and a Fenwick tree can only answer ranges that start at 0<sup><a href="#src-4">4</a></sup>. When the operation can be undone (sums, xor), I'd write the Fenwick tree; when it can't, the segment tree.

## what you can improve

**The iterative tree.** Put the leaves at indices n to 2n − 1 and node i's children at 2i and 2i + 1, for any n. The tree takes 2n slots and needs no recursion. Al.Cash's Codeforces post "Efficient and easy segment trees" is the standard write-up<sup><a href="#src-5">5</a></sup>:

```cpp
// leaves at t[n .. 2n-1]
void set(int i, long long x) {
    for (t[i += n] = x; i > 1; i >>= 1) t[i >> 1] = t[i] + t[i ^ 1];
}
long long sum(int l, int r) {                // half-open [l, r)
    long long s = 0;
    for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
        if (l & 1) s += t[l++];
        if (r & 1) s += t[--r];
    }
    return s;
}
```

The query walks up from both ends at once and picks up a node whenever an end is a right child (for l) or a left child (for r). For a non-commutative operation, keep two accumulators, one for each side, and combine them in order at the end.

**Memory layout.** Sergey Slotin measured segment tree layouts in *Algorithms for Modern Hardware*. Replacing the recursive query with an iterative top-down one roughly halves its time. A wide tree with 16 children per node, so one node fills one 64-byte cache line, answers prefix sums more than 10 times faster than a Fenwick tree and updates up to 4 times faster<sup><a href="#src-6">6</a></sup>. For one-off contest problems none of this matters. For a structure queried millions of times per second it's the first thing to change.

**Persistence.** An update changes only the O(log n) nodes on one path. Copy those nodes instead of overwriting them and keep the old root, and every earlier version of the array stays queryable at a cost of O(log n) new nodes per update. Building one version per prefix of the array over the sorted values gives the k-th smallest number in any range [l, r] in O(log n), by walking versions r and l − 1 side by side<sup><a href="#src-2">2</a></sup>. Exercise 14 uses persistence to copy whole arrays in O(1).

**Dynamic trees.** When positions go up to $$10^9$$, create nodes only when a walk first needs them. Each operation creates at most O(log C) nodes, where C is the coordinate range<sup><a href="#src-2">2</a></sup>. If all queries are known in advance, compressing the coordinates to 0..m−1 is simpler.

**Segment tree beats.** Ji Ruyi's technique supports "set every a[i] in [l, r] to min(a[i], x)" together with range sums. Each node keeps its maximum, its strict second maximum and how many times the maximum occurs. When x falls between the two, the node can update its sum in O(1) without going down; otherwise it recurses. The total cost amortizes to $$O((n + q)\log n)$$<sup><a href="#src-7">7</a></sup><sup><a href="#src-8">8</a></sup>.

**Other shapes.** A merge sort tree keeps each node's range sorted and counts values below x in a range in $$O(\log^2 n)$$. A 2D segment tree is a segment tree of segment trees, $$O(\log^2 n)$$ per operation. On a rooted tree, numbering nodes in DFS order turns every subtree into a contiguous range, so subtree sums become range sums<sup><a href="#src-2">2</a></sup>.

## case study: the sum tree in prioritized experience replay

Deep Q-learning trains on transitions sampled from a replay memory of past experience. Schaul, Quan, Antonoglou and Silver at DeepMind proposed sampling the surprising transitions more often: each transition gets a priority p, and it's picked with probability $$p / \sum p$$. With a memory of $$10^6$$ transitions, priorities that change after every training step and a batch of samples drawn each step, both "update one priority" and "sample proportionally" have to be fast. The paper's answer is a "sum-tree", a segment tree with priorities in the leaves and sums in the internal nodes, with O(log N) updates and sampling<sup><a href="#src-9">9</a></sup>.

Sampling is the descent from the previous section. Draw u uniformly in $$[0, \sum p)$$ and walk down: go left if u is below the left child's sum, otherwise subtract that sum and go right. Each leaf owns a slice of $$[0, \sum p)$$ as wide as its priority, so the chance of reaching it is its share of the total.

<figure class="wide">
<sg-sumtree data-fig data-label="fig 5 · sampling from a sum tree">
<p class="fallback">A sum tree over eight priorities, 3 10 1 6 2 8 4 6, with total 40. Below it a bar is cut into eight slices as wide as the priorities. For u = 23: at the root, 23 is not below the left sum 20, so go right and u becomes 3; at the next node 3 is below 10, go left; then 3 is not below 2, go right with u = 1, and land on leaf 5, whose priority is 8, so it is picked with chance 8/40.</p>
</sg-sumtree>
<figcaption><b>fig 5</b>Slide u. The path is the same descent as `first_prefix_at_least`; the bar shows each leaf's share of the total.<span class="m">Eight made-up priorities.</span></figcaption>
</figure>

OpenAI's Baselines library implements it in about a hundred lines<sup><a href="#src-10">10</a></sup>. `SegmentTree(capacity, operation, neutral_element)` is the generic monoid tree from earlier, stored in an array of 2 × capacity with leaves in the second half. `SumSegmentTree` adds `find_prefixsum_idx`, the descent. The replay buffer keeps a second tree, a `MinSegmentTree` over the same priorities, for one number: the smallest priority, which it needs to normalise the importance-sampling weights that correct for the biased sampling<sup><a href="#src-11">11</a></sup>. A batch of k samples splits $$[0, \sum p)$$ into k equal slices and draws one u in each, which the paper also describes<sup><a href="#src-9">9</a></sup>. PyTorch's TorchRL ships the same pair, `SumSegmentTree` and `MinSegmentTree`, in C++<sup><a href="#src-12">12</a></sup>.

DeepMind's own Reverb replay server shows a detail the textbook version skips. Its sum tree stores floats, and after many updates the sums in internal nodes drift from the true sums of their leaves by rounding. Reverb checks for this and rebuilds the tree from the leaves in O(n) when the error gets above $$10^{-4}$$<sup><a href="#src-13">13</a></sup>.

Two more places where the same idea shows up under other names. Zed's text editor keeps its rope and more than 20 other structures in a `SumTree`, a B+ tree whose internal nodes store a "summary" of their subtree: a user-defined monoid such as byte length plus line count. A cursor descends by any of those dimensions to convert a byte offset to a row and column in O(log n)<sup><a href="#src-14">14</a></sup>. And the original segment tree, Jon Bentley's from 1977, was built for a geometry problem: the area of a union of rectangles. A vertical line sweeps across, and a segment tree over the y coordinates keeps track of how much of the line is covered, each edge costing O(log n)<sup><a href="#src-15">15</a></sup><sup><a href="#src-16">16</a></sup>. That geometric segment tree stores sets of intervals instead of array sums, with the same recursive halving. LeetCode 850, in the exercises, is that sweep.

## exercises

Easy ones first. Each card has the problem, a hint and a solution sketch; open them in that order.

<details class="ex">
<summary><span class="ex-n">P1</span><span class="ex-t">The four-nodes-per-level bound</span><span class="ex-d"><b>●</b>○○ proof</span></summary>
<div class="ex-b">

Prove that the recursive query visits at most 4 nodes on each level and uses at most 2 stored values per level. Conclude that a query visits at most $$4\lceil\log_2 n\rceil + 1$$ nodes.

<details><summary>hint</summary>

Induction on the level. Show that the visited nodes on one level are contiguous and that only the two at the ends can be partly covered.

</details>
<details><summary>solution sketch</summary>

The visited nodes on a level are the children of the nodes expanded one level up. If at most two nodes were expanded, at most four are visited. Among the visited nodes, those strictly between the leftmost and the rightmost lie inside [l, r] because the range is contiguous, so they are used whole and not expanded. Only the two end nodes can be partial, so at most two are expanded, which closes the induction. The root level has one node.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P2</span><span class="ex-t">Why 4n slots are enough</span><span class="ex-d"><b>●</b>○○ proof</span></summary>
<div class="ex-b">

With the root at 1 and children at 2v and 2v + 1, show that no index reaches 4n. Find an n for which 2n slots are not enough for the recursive layout. Then explain why the iterative layout (leaves at n..2n − 1) gets away with exactly 2n.

<details><summary>hint</summary>

The tree has height $$h = \lceil\log_2 n\rceil$$, so indices are below $$2^{h+1}$$. Compare $$2^h$$ with 2n. For the counterexample, compute the largest index used for n = 3, 5 and 6.

</details>
<details><summary>solution sketch</summary>

For n ≥ 2, $$2^{h-1} < n$$, so the largest index is below $$2^{h+1} = 4 \cdot 2^{h-1} < 4n$$. The smallest n that breaks 2n is 6: the root covers [0, 5], node 3 covers [3, 5], node 6 covers [3, 4] and its children are 12 and 13, so the array needs 14 slots. Small n such as 3 or 5 happen to fit, which is why a 2n array can pass small tests and fail later. The iterative layout never descends from the root: node i is only the pair (2i, 2i + 1), and the leaves sit at fixed positions n..2n − 1, so everything lives below 2n even when the "tree" is not one connected binary tree.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P3</span><span class="ex-t">Design the max-subarray node</span><span class="ex-d"><b>●●</b>○ proof</span></summary>
<div class="ex-b">

Using the four-number node from "what a node can hold", prove the merge is associative and give its identity element. Then adapt it for the case where the empty run (sum 0) is allowed.

<details><summary>hint</summary>

Associativity: show that both $$(A \cdot B) \cdot C$$ and $$A \cdot (B \cdot C)$$ compute the true (sum, pre, suf, best) of the concatenation, by arguing about where the best run can lie.

</details>
<details><summary>solution sketch</summary>

Each field of the merge equals the true value for the concatenated range: a best run lies in one part or crosses a boundary. Since both bracketings compute the true values of the same range, they are equal. Identity: $$(0, -\infty, -\infty, -\infty)$$. With empty runs allowed, use (0, 0, 0, 0) and the same merge, since every field is then at least 0.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 1</span><span class="ex-t">Dynamic Range Sum Queries</span><span class="ex-d"><b>●</b>○○ CSES 1648</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1648](https://cses.fi/problemset/task/1648). n numbers, q requests: set a[k] = u, or print the sum of [a, b]. n, q ≤ 2·10^5.

<details><summary>hint</summary>

The tree from "the tree" section, or a Fenwick tree, since sums can be subtracted.

</details>
<details><summary>solution sketch</summary>

Build in O(n), each request O(log n). Use 64-bit sums. Total O((n + q) log n).

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 2</span><span class="ex-t">Dynamic Range Minimum Queries</span><span class="ex-d"><b>●</b>○○ CSES 1649</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1649](https://cses.fi/problemset/task/1649). Same as EX 1 with minimum instead of sum. Then compare with [CSES 1650 Range Xor Queries](https://cses.fi/problemset/task/1650), which has no updates.

<details><summary>hint</summary>

Swap the operation and the identity. Ask yourself why the Fenwick tree from EX 1 doesn't work here but a plain prefix array does work for 1650.

</details>
<details><summary>solution sketch</summary>

Segment tree with min and identity $$+\infty$$, O(log n) per request. Minimum has no inverse, so prefix answers can't be subtracted. Xor is its own inverse, so for 1650 a prefix xor array answers each query in O(1).

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 3</span><span class="ex-t">Range Sum Query, Mutable</span><span class="ex-d"><b>●</b>○○ LeetCode 307</span></summary>
<div class="ex-b">

[leetcode.com/problems/range-sum-query-mutable](https://leetcode.com/problems/range-sum-query-mutable/). Implement `update(i, val)` and `sumRange(l, r)`.

<details><summary>hint</summary>

A good place to write the iterative 2n tree from "what you can improve" and check it against the recursive one.

</details>
<details><summary>solution sketch</summary>

Iterative tree: `set` and the half-open `sum(l, r + 1)`. O(log n) each, 2n memory.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 4</span><span class="ex-t">Range Update Queries</span><span class="ex-d"><b>●</b>○○ CSES 1651</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1651](https://cses.fi/problemset/task/1651). Add u to every number in [a, b], or print a[k].

<details><summary>hint</summary>

No lazy tags needed. Store differences instead of values.

</details>
<details><summary>solution sketch</summary>

Keep d with d[a] += u and d[b + 1] −= u for each range add. Then a[k] = original a[k] + (d[0] + … + d[k]), a prefix sum. A Fenwick or segment tree over d gives O(log n) for both.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 5</span><span class="ex-t">Xenia and Bit Operations</span><span class="ex-d"><b>●●</b>○ Codeforces 339D</span></summary>
<div class="ex-b">

[codeforces.com/problemset/problem/339/D](https://codeforces.com/problemset/problem/339/D). An array of $$2^n$$ numbers is reduced level by level: OR of neighbours on the first level, XOR on the next, alternating. After each point update print the final value.

<details><summary>hint</summary>

The tree is already drawn for you. What decides which operation a node uses?

</details>
<details><summary>solution sketch</summary>

A node's operation depends on its height above the leaves: OR at odd heights, XOR at even ones. Point update and recompute up the path, O(n) per update with n ≤ 17. The answer is the root.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 6</span><span class="ex-t">Hotel Queries</span><span class="ex-d"><b>●●</b>○ CSES 1143</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1143](https://cses.fi/problemset/task/1143). Hotels in a row with free rooms. Each group of r people takes the first hotel with at least r free rooms (print 0 if none).

<details><summary>hint</summary>

Max tree, then the descent from "searching inside the tree" with "max of the left child ≥ r".

</details>
<details><summary>solution sketch</summary>

If the root's max is below r, print 0. Otherwise go left whenever the left child's max is at least r, else right. At the leaf, subtract r and update the path. O(log n) per group.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 7</span><span class="ex-t">List Removals</span><span class="ex-d"><b>●●</b>○ CSES 1749</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1749](https://cses.fi/problemset/task/1749). Remove the element at position p from a list, n times, printing each removed value.

<details><summary>hint</summary>

Put a 1 at every position still in the list. The p-th remaining element is the first index whose prefix sum reaches p.

</details>
<details><summary>solution sketch</summary>

Count tree with the `first_prefix_at_least(p)` descent, then set that leaf to 0. O(n log n). This is the same structure as an order-statistic set over fixed positions.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 8</span><span class="ex-t">Subarray Sum Queries</span><span class="ex-d"><b>●●</b>○ CSES 1190</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1190](https://cses.fi/problemset/task/1190). After each point update, print the largest sum of a contiguous subarray (the empty one counts, with sum 0).

<details><summary>hint</summary>

The four-number node from P3, with empty runs allowed.

</details>
<details><summary>solution sketch</summary>

Each node keeps (sum, pre, suf, best), leaves are (x, max(x, 0), max(x, 0), max(x, 0)), merge as in the formulas. Print the root's best after each update. O(log n) per update. SPOJ GSS1 and GSS3 ask the same over a range [l, r]: merge the O(log n) nodes of the query in order.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 9</span><span class="ex-t">Prefix Sum Queries</span><span class="ex-d"><b>●●</b>○ CSES 2166</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/2166](https://cses.fi/problemset/task/2166). Point updates; the query asks for the largest prefix sum of the subarray [a, b] (the empty prefix counts).

<details><summary>hint</summary>

Half of the node from EX 8 is enough.

</details>
<details><summary>solution sketch</summary>

Node = (sum, pre) with pre = max(L.pre, L.sum + R.pre), leaf pre = max(x, 0). Combine the query's nodes left to right. O(log n).

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 10</span><span class="ex-t">Sereja and Brackets</span><span class="ex-d"><b>●●</b>○ Codeforces 380C</span></summary>
<div class="ex-b">

[codeforces.com/problemset/problem/380/C](https://codeforces.com/problemset/problem/380/C). A bracket string of length up to $$10^6$$. For each query [l, r], the length of the longest correct bracket subsequence inside it.

<details><summary>hint</summary>

Inside a range, greedily matched pairs never need to be undone. What's left over is some unmatched ')' followed by some unmatched '('.

</details>
<details><summary>solution sketch</summary>

Node = (matched, open, close). Merging L then R matches $$t = \min(L.\text{open}, R.\text{close})$$ new pairs: matched = L.matched + R.matched + t, open = L.open − t + R.open, close = L.close + R.close − t. The order matters, so combine the query's nodes left to right. Answer 2 · matched. O(log n) per query; use fast input.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 11</span><span class="ex-t">Range Updates and Sums</span><span class="ex-d"><b>●●●</b> CSES 1735</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1735](https://cses.fi/problemset/task/1735). Three requests: add x to [a, b], set every number in [a, b] to x, and print the sum of [a, b].

<details><summary>hint</summary>

Two tags per node. Write down what happens when a set lands on a node that already has an add pending, and the other way round.

</details>
<details><summary>solution sketch</summary>

A node holds (set or none, add). Applying "set x": sum = x · len, tag = (x, 0). Applying "add x": sum += x · len; if a set is pending, it becomes set + x, else add += x. Push both down in that order. O(log n) per request.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 12</span><span class="ex-t">Polynomial Queries</span><span class="ex-d"><b>●●●</b> CSES 1736</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1736](https://cses.fi/problemset/task/1736). Add 1 to a[a], 2 to a[a + 1], 3 to a[a + 2] and so on up to b; print range sums.

<details><summary>hint</summary>

The pending update on a node is an arithmetic progression: a first term and a step. Two progressions add up to a progression.

</details>
<details><summary>solution sketch</summary>

Tag = (first, step). On a node of length len, the sum grows by len · first + step · len(len − 1)/2. Pushing down: the left child gets (first, step), the right child gets (first + step · len_left, step). Tags add field by field. O(log n).

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 13</span><span class="ex-t">Distinct Values Queries</span><span class="ex-d"><b>●●●</b> CSES 1734</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1734](https://cses.fi/problemset/task/1734). For each query [a, b], the number of distinct values in that range. No updates.

<details><summary>hint</summary>

Answer the queries offline, sorted by their right end. For a fixed right end r, count each value only at its last occurrence up to r.

</details>
<details><summary>solution sketch</summary>

Sweep r from left to right. When a[r] appears, put 1 at r and remove the 1 at its previous occurrence. Every query with right end r is then the range sum [a, r]. O((n + q) log n) with a Fenwick tree. Mo's algorithm, $$O((n + q)\sqrt n)$$, is the bucket alternative.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 14</span><span class="ex-t">Range Queries and Copies</span><span class="ex-d"><b>●●●</b> CSES 1737</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1737](https://cses.fi/problemset/task/1737). A list of arrays. Set a value in array k, print a range sum in array k, or append a copy of array k.

<details><summary>hint</summary>

A copy that costs O(n) times 2·10^5 copies is too slow. What does an array look like in a persistent tree?

</details>
<details><summary>solution sketch</summary>

Each array is a root pointer into a persistent segment tree. A copy pushes the same root again, O(1). An update copies the O(log n) nodes on one path and replaces that array's root. Queries are normal. Allocate about 2n + q · (log n + 1) nodes.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 15</span><span class="ex-t">Rectangle Area II</span><span class="ex-d"><b>●●●</b> LeetCode 850</span></summary>
<div class="ex-b">

[leetcode.com/problems/rectangle-area-ii](https://leetcode.com/problems/rectangle-area-ii/). The total area covered by a list of axis-aligned rectangles, counting overlaps once.

<details><summary>hint</summary>

Bentley's sweep from the case study. Sort the x edges. Between two consecutive x values, the area added is the width times the covered length of the sweep line.

</details>
<details><summary>solution sketch</summary>

Compress the y coordinates into elementary intervals. Each node stores how many rectangles cover its whole range and the covered length below it: if the count is positive, the full length, else the sum of its children. A left edge adds 1 on its y range, a right edge subtracts 1. No pushes are needed because counts never go negative. O(n log n).

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 16</span><span class="ex-t">William The Oblivious</span><span class="ex-d"><b>●●●</b> Codeforces 1609E</span></summary>
<div class="ex-b">

[codeforces.com/problemset/problem/1609/E](https://codeforces.com/problemset/problem/1609/E). A string of a, b and c with point changes. After each change, print the fewest characters to change so that "abc" doesn't appear as a subsequence.

<details><summary>hint</summary>

For each node, store the cheapest way to make the range avoid "a", "b", "c", "ab", "bc" and "abc" as subsequences. Merge like a small min-plus product.

</details>
<details><summary>solution sketch</summary>

If L + R contains "abc", the subsequence starts in one half and may cross into the other. So the cheapest fix is to pick where the split falls: min(L.a + R.abc, L.ab + R.bc, L.abc + R.c). The same rule gives ab = min(L.a + R.ab, L.ab + R.b) and bc = min(L.b + R.bc, L.bc + R.c), while a, b and c just add. Six numbers per node, O(log n) per change.

</details>
</div>
</details>

For more, the CSES "Range Queries" section has 20+ problems in rough order of difficulty, and cp-algorithms' segment tree article covers every variant above with code<sup><a href="#src-2">2</a></sup>.

If I had to pick one version to memorise, it would be the iterative tree with a generic combine function: 2n memory, no recursion, and it covers everything up to EX 10. I'd switch to the recursive one only when the problem needs lazy tags or a descent, because both are easier to get right when the node's range is passed down explicitly.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://cp-algorithms.com/data_structures/sqrt_decomposition.html">cp-algorithms, sqrt decomposition (read 12 November 2026)</a></li>
<li id="src-2"><a href="https://cp-algorithms.com/data_structures/segment_tree.html">cp-algorithms, segment tree (read 12 November 2026)</a></li>
<li id="src-3"><a href="https://doi.org/10.1002/spe.4380240306">Fenwick, a new data structure for cumulative frequency tables, Software: Practice and Experience 24(3) (1994)</a></li>
<li id="src-4"><a href="https://cp-algorithms.com/data_structures/fenwick.html">cp-algorithms, Fenwick tree (read 12 November 2026)</a></li>
<li id="src-5"><a href="https://codeforces.com/blog/entry/18051">Al.Cash, efficient and easy segment trees, Codeforces (2015)</a></li>
<li id="src-6"><a href="https://en.algorithmica.org/hpc/data-structures/segment-trees/">Slotin, Algorithms for Modern Hardware, segment trees (read 12 November 2026)</a></li>
<li id="src-7"><a href="https://codeforces.com/blog/entry/57319">Ji Ruyi (jiry_2), a simple introduction to "segment tree beats", Codeforces</a></li>
<li id="src-8"><a href="https://usaco.guide/adv/segtree-beats?lang=cpp">USACO Guide, segment tree beats (read 12 November 2026)</a></li>
<li id="src-9"><a href="https://arxiv.org/abs/1511.05952">Schaul, Quan, Antonoglou and Silver, prioritized experience replay, ICLR 2016</a></li>
<li id="src-10"><a href="https://github.com/openai/baselines/blob/master/baselines/common/segment_tree.py">OpenAI Baselines, baselines/common/segment_tree.py</a></li>
<li id="src-11"><a href="https://github.com/openai/baselines/blob/master/baselines/deepq/replay_buffer.py">OpenAI Baselines, baselines/deepq/replay_buffer.py</a></li>
<li id="src-12"><a href="https://github.com/pytorch/rl/blob/main/torchrl/csrc/segment_tree.h">TorchRL, torchrl/csrc/segment_tree.h (read 12 November 2026)</a></li>
<li id="src-13"><a href="https://github.com/google-deepmind/reverb/blob/master/reverb/cc/selectors/prioritized.h">DeepMind Reverb, reverb/cc/selectors/prioritized.h (read 12 November 2026)</a></li>
<li id="src-14"><a href="https://zed.dev/blog/zed-decoded-rope-sumtree">Zed blog, Zed decoded: rope and SumTree</a></li>
<li id="src-15"><a href="https://en.wikipedia.org/wiki/Klee%27s_measure_problem">Wikipedia, Klee's measure problem (cites Bentley's unpublished 1977 CMU notes) (read 12 November 2026)</a></li>
<li id="src-16"><a href="https://jeffe.cs.illinois.edu/open/klee.html">Erickson, Klee's measure problem, open problems page</a></li>
</ol>
</details>
