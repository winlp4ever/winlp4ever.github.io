---
title: Red-black trees, a lesson with exercises
date: 2026-11-12T18:00:00Z
description: How a red-black tree keeps a binary search tree balanced with one colour bit, why that bounds its height, how insertion and deletion repair it, how it compares with AVL trees and B-trees, where Linux, Java, nginx and VS Code use it, and four proofs and ten judge problems to practise on.
tags: [algorithms, data-structures, competitive-programming]
category: code
glyph: rbtree
figures: 4
math: true
---

A binary search tree keeps keys in order: everything in a node's left subtree is smaller, everything in its right subtree is larger. Search, insert, delete, "next key after x" and "smallest key" all cost one step per level, so they cost O(h) for a tree of height h. With keys arriving in random order, h stays around a small multiple of $$\log_2 n$$. With keys arriving sorted, each new key becomes the right child of the previous one, the tree is a linked list, and h = n. Inserting 1, 2, …, 200,000 into a plain BST takes about 20 billion comparisons.

A balanced tree fixes the height at O(log n) whatever the order. The red-black tree is the one most standard libraries picked: C++'s `std::map` in libstdc++, Java's `TreeMap`, and the Linux kernel's generic `rbtree`. It stores one extra bit per node, a colour, and repairs itself after each change with a few recolourings and at most two or three rotations. There are companion lessons on [B-trees](/blog/b-trees/), the wide trees that red-black trees turn out to encode, and on [segment trees](/blog/segment-trees/), for range queries over arrays.

## five rules

The rules as CLRS states them<sup><a href="#src-1">1</a></sup>:

1. Every node is red or black.
2. The root is black.
3. Every leaf (the empty NIL child at the bottom) is black.
4. A red node's children are both black.
5. For each node, every path from it down to a NIL leaf passes through the same number of black nodes.

That number in rule 5, counted from a node x down to the leaves and not counting x itself, is the **black-height** bh(x). Rules 4 and 5 together give the guarantee: every path has the same number of black nodes, and red nodes can't sit next to each other, so the longest path from the root is at most twice the shortest.

### the height bound

CLRS proves that a red-black tree with n keys has height at most $$2\log_2(n+1)$$<sup><a href="#src-1">1</a></sup>. The proof is short and worth knowing by heart.

First, the subtree under any node x holds at least $$2^{\mathrm{bh}(x)} - 1$$ keys. By induction on height: a NIL leaf has bh = 0 and holds 0 keys. An internal node's two children each have black-height at least bh(x) − 1 (exactly that if the child is black, bh(x) if it is red), so they hold at least $$2^{\mathrm{bh}(x)-1} - 1$$ keys each, and with x itself that's $$2 \cdot (2^{\mathrm{bh}(x)-1} - 1) + 1 = 2^{\mathrm{bh}(x)} - 1$$.

Second, by rule 4 at least half of the nodes on any path from the root are black, so bh(root) ≥ h/2. Put together:

$$
n \ge 2^{h/2} - 1 \quad\Longrightarrow\quad h \le 2\log_2(n+1)
$$

For a million keys that's at most 40 levels, against a million for the sorted plain BST.

## a red-black tree is a 2-3-4 tree

The colours make more sense once you see where they come from. Rudolf Bayer described these trees in 1972 as "symmetric binary B-trees", a way to store a B-tree of order 4 inside a binary tree<sup><a href="#src-2">2</a></sup>. Leo Guibas and Robert Sedgewick reworked them in 1978 as a two-colour framework for balanced trees, and the red and black names come from that paper<sup><a href="#src-3">3</a></sup>. Wikipedia gives two stories for the choice of red: the colour laser printer at Xerox PARC, or the pens the authors had to hand<sup><a href="#src-4">4</a></sup>.

A **2-3-4 tree** is a search tree whose nodes hold one, two or three keys (and so have two, three or four children), with every leaf on the same level. It's the smallest [B-tree](/blog/b-trees/), with minimum degree 2. Lift each red node into its black parent and a red-black tree becomes one: a black node alone is a 2-node, a black node with one red child is a 3-node, a black node with two red children is a 4-node. Rule 4 stops a red node from having a red child, so no node gets more than three keys. Rule 5 says every leaf is the same number of black nodes down, so in the 2-3-4 tree every leaf is on the same level. Sedgewick: "All red-black trees are based on implementing 2-3 or 2-3-4 trees within a binary tree, using red links to bind together internal nodes into 3-nodes or 4-nodes"<sup><a href="#src-5">5</a></sup>.

<figure class="wide">
<rb-234 data-fig data-label="fig 1 · the same tree, two ways">
<p class="fallback">A red-black tree of twelve keys built by inserting 13, 8, 17, 1, 11, 15, 25, 6, 22, 27, 20 and 3. The root 13 is black. Its children 8 and 17 are black. Under 8 sit black 3 (with red children 1 and 6) and black 11. Under 17 sit black 15 and red 25, whose children are black 22 (with red child 20) and black 27. Every path from the root down passes three black nodes. Switching to the 2-3-4 view lifts each red node onto its parent's row: the tree becomes three levels, with nodes {13}, then {8} and {17, 25}, then {1, 3, 6}, {11}, {15}, {20, 22} and {27}, and every leaf on the last level.</p>
</rb-234>
<figcaption><b>fig 1</b>Switch views. Each outlined group is one 2-3-4 node: a black node plus its red children.<span class="m">The tree is built by the insert code below; the keys are an example.</span></figcaption>
</figure>

Every red-black operation is a 2-3-4 operation in disguise. A new key is inserted red, which in 2-3-4 terms means added to an existing node. When that node already had three keys, it overflows, and a 2-3-4 tree splits it and pushes the middle key up to the parent. In the red-black tree that split is a colour flip<sup><a href="#src-5">5</a></sup>. Drawing the 2-3-4 picture next to the red-black one is the easiest way to work out an insertion case.

## rotations

The repairs need one structural operation besides recolouring. A **rotation** turns a parent-child pair upside down while keeping the in-order sequence of keys.

<figure class="wide">
<rb-rotate data-fig data-label="fig 2 · a rotation">
<p class="fallback">Node x has left subtree alpha and right child y; y has subtrees beta and gamma. A left rotation at x moves y up into x's place, makes x y's left child, and moves beta from y's left to x's right. The order alpha, x, beta, y, gamma is the same before and after. A right rotation at y undoes it.</p>
</rb-rotate>
<figcaption><b>fig 2</b>Three links change: x's right child, y's left child and whoever pointed at x. Everything else, including α and γ, stays attached where it was.<span class="m">Timeline: the left rotation, then the right rotation that undoes it.</span></figcaption>
</figure>

```cpp
struct Node { int key; bool red; Node *l, *r, *p; };

void rotate_left(Node*& root, Node* x) {
    Node* y = x->r;
    x->r = y->l;                       // β moves from y to x
    if (y->l) y->l->p = x;
    y->p = x->p;                       // y takes x's place
    if (!x->p) root = y;
    else if (x == x->p->l) x->p->l = y;
    else x->p->r = y;
    y->l = x;                          // x goes under y
    x->p = y;
}
// rotate_right is the mirror image: swap every l and r
```

A rotation is O(1) and never breaks the search order. Insertion uses at most two of them and deletion at most three.

## insertion

Insert the key as in a plain BST and colour it red. Red keeps rule 5 intact (no path gains a black node). The only rule that can break is rule 4, when the new node's parent is red too. The fix-up walks up from the new node z while z and its parent are both red. With p the parent, g the grandparent (black, since p is red) and u the uncle (g's other child), there are three cases<sup><a href="#src-1">1</a></sup>:

- **The uncle is red.** Make p and u black and g red, then continue from g, two levels up. In 2-3-4 terms, z's node had three keys (g with red p and u) and overflowed: this is the split, with g pushed up into its own parent. It's the only case that loops.
- **The uncle is black and z is an inner child** (z is a right child of a left child, or the mirror). Rotate at p so that z and p swap roles. This turns it into the next case.
- **The uncle is black and z is an outer child.** Make p black and g red, rotate at g. p is now the black top of a node holding z and g as red children, a valid 4-node. The loop ends.

Finally colour the root black. In code, with null children counting as black:

```cpp
bool is_red(Node* n) { return n && n->red; }

void insert_fixup(Node*& root, Node* z) {
    while (is_red(z->p)) {
        Node *p = z->p, *g = p->p;
        bool left = (p == g->l);
        Node* u = left ? g->r : g->l;
        if (is_red(u)) {                           // split: push the red up
            p->red = u->red = false; g->red = true;
            z = g;
            continue;
        }
        if (z == (left ? p->r : p->l)) {           // inner child: straighten
            z = p;
            left ? rotate_left(root, z) : rotate_right(root, z);
        }
        z->p->red = false; g->red = true;          // outer child: rotate g
        left ? rotate_right(root, g) : rotate_left(root, g);
    }
    root->red = false;
}
```

<figure class="wide">
<rb-insert data-fig data-label="fig 3 · inserting, step by step">
<p class="fallback">The tree after inserting the keys 1, 2, 3 and so on in order, with the fix-up steps of the last insertion listed below it. After 8 keys the tree has height 4 (the bound 2·log2(9) is 6.3, a plain BST would have height 8). Inserting 8 went: uncle 5 is red, recolor 7, 5 and 6 and move up to 6; then rotate left at 2, recolor 4 black and 2 red. With 15 sorted keys the height is 6. A second mode inserts the keys 1 to 15 in a fixed random order (5, 14, 10, 13, 12, 2, 9, 4, 7, 6, 1, 8, 3, 15, 11) and ends with height 5.</p>
</rb-insert>
<figcaption><b>fig 3</b>Drag the slider to insert one key at a time. The new key has a green ring, nodes recoloured or rotated by this insertion have a dashed ring, and the steps are the ones the code above takes.<span class="m">The figure runs the same insert as the code; the random order is seeded.</span></figcaption>
</figure>

The loop can climb O(log n) levels through the red-uncle case, but each rotation case ends it, so an insertion does **at most two rotations**. The recolouring is O(1) amortized over a sequence of operations, a result of Tarjan's<sup><a href="#src-6">6</a></sup><sup><a href="#src-7">7</a></sup>. Rotations are the expensive part in practice (they move pointers that other code may be holding, and in augmented trees they force recomputation), so a constant bound on them matters.

Watch the sorted sequence in fig 3, the input that turns a plain BST into a list. Every insertion lands at the right end and the outer-child case keeps firing on the right spine. 15 keys take 6 levels, against 15 for the plain BST and 4 for a perfectly balanced tree.

## deletion

Deletion is where most people give up on implementing red-black trees, and the cases are longer, but the idea is the same. Delete as in a BST (a node with two children swaps its key with its successor first, so the node that gets removed has at most one child). If the removed node was red, nothing breaks. If it was black, every path through it lost one black node, and the fix-up pushes an "extra black" up the tree until it can be absorbed. With x the node carrying the extra black and w its sibling, CLRS has four cases<sup><a href="#src-1">1</a></sup>:

1. w is red: rotate at the parent and recolour, which gives x a black sibling and moves to one of the cases below.
2. w is black with two black children: make w red and move the extra black up to the parent. This is a merge of two 2-3-4 nodes and the only case that loops. It does no rotations.
3. w is black, its near child red and far child black: rotate at w, which moves to case 4.
4. w is black with a red far child: rotate at the parent, recolour, done.

Cases 1, 3 and 4 end the loop after a constant number of steps, so a deletion does **at most three rotations**<sup><a href="#src-1">1</a></sup><sup><a href="#src-8">8</a></sup>. Exercise P2 below walks through a full sequence by hand.

## measured

<figure class="wide">
<rb-height data-fig data-label="fig 4 · height and rotations, measured">
<p class="fallback">Heights measured by inserting n keys into the red-black tree above, for n from 2 to 16,384. With sorted keys the height grows to 26 at 16,384 keys, close to the bound 2·log2(n+1) = 28, with 1.00 rotations per insertion. With the same keys in random order the height is 17, against log2(n+1) = 14 for a perfectly balanced tree, with 0.59 rotations per insertion.</p>
</rb-height>
<figcaption><b>fig 4</b>The dashed line is the 2·log2(n+1) bound, the dotted line a perfectly balanced tree. Hover a point for the rotations per insertion.<span class="m">Computed in your browser by the code above: 32,766 insertions per order.</span></figcaption>
</figure>

Sorted input gave the taller tree and stayed under the bound. It's also the case where the tree rotates on almost every insertion; random input rotates on about three insertions in five.

## next to the alternatives

| structure | height (worst) | rotations per insert / delete | guarantee |
|---|---|---|---|
| plain BST | n | 0 / 0 | none |
| AVL tree | $$1.44\log_2 n$$ | ≤ 2 / O(log n) | worst case |
| red-black tree | $$2\log_2 n$$ | ≤ 2 / ≤ 3 | worst case |
| WAVL tree | ≤ AVL with insertions only, ≤ red-black otherwise | ≤ 2 / ≤ 2 | worst case |
| treap, skip list | O(log n) expected | O(1) expected | randomised |
| B-tree | $$\log_B n$$ | splits and merges | worst case |

The AVL and WAVL rows come from Haeupler, Sen and Tarjan<sup><a href="#src-7">7</a></sup>. AVL trees are more tightly balanced, so lookups touch fewer nodes, and they pay for it with more rebalancing work on deletion. Ben Pfaff benchmarked 20 BST variants on traces from real system software in 2004 and found AVL trees faster than red-black trees by up to 20% on those traces, red-black trees doing 12% to 32% more comparisons. His advice: red-black trees for random input with occasional sorted runs, AVL when insertions are mostly sorted and followed by random lookups, and splay trees when accesses cluster<sup><a href="#src-9">9</a></sup>.

On modern hardware the bigger cost is memory. Every key in a binary tree is its own heap allocation, and every comparison can be a cache miss. Abseil's B-tree notes put libstdc++'s `std::set<int32_t>` at 40 bytes per value against 4.3 to 5.1 bytes for `absl::btree_set`. The price is pointer stability: a B-tree moves values around inside its nodes when it splits, so pointers and iterators into it don't survive inserts<sup><a href="#src-10">10</a></sup>. Rust's standard library chose a B-tree for `BTreeMap` for the same reason (the [B-tree lesson](/blog/b-trees/) covers both)<sup><a href="#src-11">11</a></sup>. The Linux rbtree is built the other way: the node is embedded inside the caller's own struct, and code keeps pointers to those structs across inserts<sup><a href="#src-8">8</a></sup>.

## what you can improve

**Fewer cases.** Sedgewick's left-leaning red-black tree (2008) only allows red links that lean left. That gives a one-to-one match with 2-3 trees and cuts the code to "less than one-fourth" of the usual size<sup><a href="#src-5">5</a></sup>. The cost is rotations: a left-leaning tree can need Ω(log n) of them per update, where the classic tree needs at most three<sup><a href="#src-7">7</a></sup>.

**Fewer rotations.** Haeupler, Sen and Tarjan's weak AVL (WAVL) trees do at most two rotations on both insertion and deletion. With insertions only, a WAVL tree is an AVL tree; with deletions mixed in, its height is never worse than a red-black tree's<sup><a href="#src-7">7</a></sup>.

**Smaller nodes.** Linux keeps the colour in the lowest bit of the parent pointer, since nodes are aligned and that bit is always 0. A node is three words: parent-and-colour, right and left<sup><a href="#src-12">12</a></sup>.

**Constant-time minimum.** Linux's `rb_root_cached` keeps a pointer to the leftmost node, so "smallest key" is one load instead of a walk down. libstdc++'s header node keeps both the leftmost and the rightmost, so `begin()` and `rbegin()` are O(1)<sup><a href="#src-8">8</a></sup><sup><a href="#src-13">13</a></sup>.

**Augmentation.** Store in each node something computed from its subtree, such as the subtree size or the largest interval end, and keep it right during rotations, which only touch two nodes. Subtree sizes give an order-statistic tree: the k-th smallest key, and the rank of a key, in O(log n). The largest end gives an interval tree. CLRS covers both (chapter 14 in the third edition)<sup><a href="#src-1">1</a></sup>, and Linux has generic support for augmented trees<sup><a href="#src-8">8</a></sup>. In C++ contests, GNU's policy-based `tree` with `tree_order_statistics_node_update` is an augmented red-black tree you can use directly<sup><a href="#src-14">14</a></sup>.

**Persistence.** Chris Okasaki's functional insertion reduces the three cases to one `balance` function with four patterns, which makes an immutable red-black tree a short program<sup><a href="#src-15">15</a></sup>. Deletion in that setting took longer to get right. Kahrs' version is the one Scala's collections use<sup><a href="#src-16">16</a></sup>.

## case studies

**The Linux scheduler.** The Completely Fair Scheduler (CFS) kept every runnable task in a red-black tree keyed by its virtual runtime, the CPU time it has used, scaled by its priority. Picking the next task meant taking the leftmost node, the one that had run least<sup><a href="#src-17">17</a></sup>, and the cached leftmost pointer made that O(1). Since kernel 6.6 the scheduler is EEVDF<sup><a href="#src-18">18</a></sup>, and it still uses a red-black tree, now an augmented one. In current kernels the tree is ordered by each task's virtual deadline and every node also stores the minimum virtual runtime in its subtree. A comment in `kernel/sched/fair.c` explains that this lets the tree "also function as a heap based on the vruntime", so the scheduler can skip whole subtrees of tasks that aren't eligible yet and find the eligible task with the earliest deadline in O(log n)<sup><a href="#src-19">19</a></sup>.

**epoll and timers.** Each epoll instance keeps the file descriptors it watches in a red-black tree keyed by the (file, fd) pair, so `epoll_ctl` can find, add and remove a watch in O(log n) among thousands<sup><a href="#src-20">20</a></sup>. The kernel's high-resolution timers sit in a `timerqueue`, a red-black tree ordered by expiry time with a cached leftmost node, so the next timer to fire is always one load away<sup><a href="#src-21">21</a></sup>. nginx does the same for its event loop: timers in a red-black tree keyed by absolute expiry in milliseconds, with the minimum giving how long the next wait can be. It also skips the delete-and-reinsert when a timer would move by less than 300 ms, "to minimize the rbtree operations for fast connections"<sup><a href="#src-22">22</a></sup>.

**Java.** `TreeMap` is a red-black tree with guaranteed log(n) `get`, `put` and `remove`, adapted from CLRS<sup><a href="#src-23">23</a></sup>. Since JDK 8, `HashMap` uses them too: when one bucket collects 8 entries (and the table has at least 64 buckets), its linked list turns into a red-black tree, so a flood of colliding keys costs O(log n) per lookup in that bucket instead of O(n)<sup><a href="#src-24">24</a></sup><sup><a href="#src-25">25</a></sup>. The source comment notes that with a good hash function a bucket of 8 has a probability of about 0.00000006<sup><a href="#src-25">25</a></sup>, so the tree exists for adversarial or broken hash codes.

**C++.** In libstdc++, `std::map`, `std::set`, `std::multimap` and `std::multiset` are all one `_Rb_tree` class, "based on those in Cormen, Leiserson, and Rivest"<sup><a href="#src-13">13</a></sup>.

**VS Code.** In 2018 VS Code replaced its array of lines with a piece table stored in a red-black tree. Each node points at a piece of a text buffer and stores the length and line-break count of its left subtree, so finding the text at an offset or a line number is a walk down the tree. The old model used about 600 MB for a 35 MB file with 13.7 million lines; the new one stays close to the file size. The team's reason for the red-black tree: it is "more 'editing' friendly"<sup><a href="#src-26">26</a></sup>.

**Where it was replaced.** Linux used a red-black tree (plus a linked list) for the virtual memory areas of each process until 6.1, when the maple tree, a B-tree variant built for ranges and lockless reads, took over<sup><a href="#src-27">27</a></sup><sup><a href="#src-28">28</a></sup>. The B-tree lesson has [the maple tree's side of the story](/blog/b-trees/#case-studies). Redis never used one: its sorted sets were skip lists, which antirez chose because they are simpler to implement and debug and walk ranges well<sup><a href="#src-29">29</a></sup>. Redis's development branch now stores large sorted sets in a packed B+ tree<sup><a href="#src-30">30</a></sup>.

## exercises

Proofs first, then problems where an ordered set is the intended tool. For those you can use `std::set` or `TreeMap`; the last one asks you to write the tree yourself.

<details class="ex">
<summary><span class="ex-n">P1</span><span class="ex-t">Which trees are valid?</span><span class="ex-d"><b>●</b>○○ by hand</span></summary>
<div class="ex-b">

Write a function that checks all five rules in O(n) and returns the black-height, or reports the first violation. Then insert 36 into the tree of fig 1 by hand: what colour does it get, and does anything change?

<details><summary>hint</summary>

Compute the black-height bottom-up and compare left and right at each node. Rule 4 is a check between a node and its children.

</details>
<details><summary>solution sketch</summary>

`check(n)`: return 1 for null; if n is red and a child is red, fail; recurse on both children; if the two black-heights differ, fail; return that height plus 1 if n is black. Also check the root is black and the BST order. For 36: it goes right of 27 as a red leaf, its parent 27 is black, so nothing else happens.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P2</span><span class="ex-t">A full insert and delete sequence</span><span class="ex-d"><b>●●</b>○ by hand</span></summary>
<div class="ex-b">

From CLRS (exercises 13.3-2 and 13.4-3): insert 41, 38, 31, 12, 19, 8 into an empty tree, then delete 8, 12, 19, 31, 38, 41. Draw the tree after each step and name the case used.

<details><summary>hint</summary>

Draw the 2-3-4 tree next to it. Each split is a red-uncle recolouring; each merge in deletion is case 2.

</details>
<details><summary>solution sketch</summary>

Inserting 31 triggers the outer-child case (rotate at 41); 12 is a red-uncle recolour; 19 is an inner child followed by the outer-child rotation; 8 is a red-uncle recolour. You can check every insertion step with fig 3's code. For the deletions, check each intermediate tree with your P1 validator.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P3</span><span class="ex-t">Prove the bounds</span><span class="ex-d"><b>●●</b>○ proof</span></summary>
<div class="ex-b">

(a) Prove that the longest root-to-leaf path is at most twice the shortest. (b) For black-height k, what are the fewest and the most keys a red-black tree can hold? (CLRS 13.1-5 and 13.1-6.)

<details><summary>hint</summary>

For (b), the fewest is when every node is black; the most is when black and red levels alternate.

</details>
<details><summary>solution sketch</summary>

(a) Every path has bh black nodes, and at most one red node per black node, so lengths are between bh and 2·bh. (b) Fewest: a complete all-black tree, $$2^k - 1$$ keys. Most: alternate black and red levels for 2k levels, $$2^{2k} - 1 = 4^k - 1$$ keys.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P4</span><span class="ex-t">Count the rotations</span><span class="ex-d"><b>●●●</b> proof</span></summary>
<div class="ex-b">

Show that an insertion does at most 2 rotations and a deletion at most 3. Then explain why sorted insertion in fig 4 does about one rotation per key in the long run.

<details><summary>hint</summary>

Which cases end the loop? For the second part, look at the logs in fig 3 for sorted input: count rotations over keys 8 to 15.

</details>
<details><summary>solution sketch</summary>

Only the red-uncle case (insertion) and case 2 (deletion) loop, and neither rotates. Every other case leads to termination after at most 2 rotations (inner, then outer) or 3 (cases 1, 3 and 4). For sorted keys, the log in fig 3 shows the pattern: an odd key lands as the outer child of a red parent at the bottom of the right spine and does one rotation; an even key splits a 4-node, pushes a key up the spine, and the push ends in one rotation higher up. Counting with the figure's code, 16,358 of 16,384 sorted insertions do exactly one rotation and 26 do none.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 1</span><span class="ex-t">Concert Tickets</span><span class="ex-d"><b>●</b>○○ CSES 1091</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1091](https://cses.fi/problemset/task/1091). n tickets with prices. Customers arrive in order, each with a maximum price, and buys the most expensive remaining ticket they can afford (or prints −1). n, m ≤ 2·10^5.

<details><summary>hint</summary>

You need "largest price ≤ t" and removal, with duplicates.

</details>
<details><summary>solution sketch</summary>

A `multiset`. For each customer, `it = upper_bound(t)`; if it's `begin()`, print −1, else step back, print and erase that one element. O((n + m) log n).

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 2</span><span class="ex-t">My Calendar I</span><span class="ex-d"><b>●</b>○○ LeetCode 729</span></summary>
<div class="ex-b">

[leetcode.com/problems/my-calendar-i](https://leetcode.com/problems/my-calendar-i/). Accept a booking [start, end) only if it overlaps no accepted booking.

<details><summary>hint</summary>

Only two existing bookings can overlap the new one: the last one starting before it and the first one starting at or after it.

</details>
<details><summary>solution sketch</summary>

A map from start to end. Check the first booking with start ≥ new start (it must start at or after the new end) and the one before it (it must end at or before the new start). O(log n) per booking.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 3</span><span class="ex-t">Traffic Lights</span><span class="ex-d"><b>●●</b>○ CSES 1163</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1163](https://cses.fi/problemset/task/1163). A street of length x. Lights are added one by one; after each, print the longest stretch without a light.

<details><summary>hint</summary>

Two ordered structures: one of positions, one of gap lengths.

</details>
<details><summary>solution sketch</summary>

A set of positions starting with {0, x} and a multiset of gaps starting with {x}. For a new light p, find its neighbours a < p < b, erase one copy of b − a, insert p − a and b − p, and print the multiset's largest element. O(n log n).

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 4</span><span class="ex-t">Room Allocation</span><span class="ex-d"><b>●●</b>○ CSES 1164</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1164](https://cses.fi/problemset/task/1164). Customers with arrival and departure days; give each a room so that nobody shares a room on a day, using as few rooms as possible, and print the assignment.

<details><summary>hint</summary>

Process customers by arrival. Which room should a new customer take?

</details>
<details><summary>solution sketch</summary>

Keep a set of (departure day, room) for occupied rooms. For each arrival, if the earliest departure is before the arrival day, reuse that room; otherwise open a new one. O(n log n). A priority queue works too; a set also lets you print the assignment easily.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 5</span><span class="ex-t">Contains Duplicate III</span><span class="ex-d"><b>●●</b>○ LeetCode 220</span></summary>
<div class="ex-b">

[leetcode.com/problems/contains-duplicate-iii](https://leetcode.com/problems/contains-duplicate-iii/). Are there i ≠ j with |i − j| ≤ indexDiff and |a[i] − a[j]| ≤ valueDiff?

<details><summary>hint</summary>

Slide a window of the last indexDiff values and ask the window for its smallest value ≥ a[i] − valueDiff.

</details>
<details><summary>solution sketch</summary>

A set holding the window. For each i, `lower_bound(a[i] − valueDiff)`; if it exists and is ≤ a[i] + valueDiff, answer true. Insert a[i], erase a[i − indexDiff]. O(n log k). Buckets of width valueDiff + 1 give an O(n) solution as a follow-up.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 6</span><span class="ex-t">Sliding Window Median</span><span class="ex-d"><b>●●</b>○ CSES 1076</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1076](https://cses.fi/problemset/task/1076). Print the median of every window of k consecutive numbers.

<details><summary>hint</summary>

Two multisets, a low half and a high half, kept balanced in size.

</details>
<details><summary>solution sketch</summary>

Low holds the smaller ⌈k/2⌉ values, high the rest; the median is low's largest. Insert into the right half, erase the outgoing value from whichever half holds it, then move one element across if the sizes are off. O(n log k). An order-statistic tree answers "k/2-th smallest" directly.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 7</span><span class="ex-t">Josephus Problem II</span><span class="ex-d"><b>●●</b>○ CSES 2163</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/2163](https://cses.fi/problemset/task/2163). n children in a circle; repeatedly skip k and remove the next one. Print the removal order. n ≤ 2·10^5, k up to 10^9.

<details><summary>hint</summary>

If you know the current position as an index among the remaining children, the next one is a modular jump. You need "the i-th remaining child".

</details>
<details><summary>solution sketch</summary>

An order-statistic tree (or GNU `tree` with `find_by_order`). Position = (position + k) mod size, print and erase the element at that index, and the position now points at the next child. O(n log n). The count segment tree from the segment tree post's EX 7 works too.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 8</span><span class="ex-t">Salary Queries</span><span class="ex-d"><b>●●</b>○ CSES 1144</span></summary>
<div class="ex-b">

[cses.fi/problemset/task/1144](https://cses.fi/problemset/task/1144). Salaries change; count employees whose salary is in [a, b]. Salaries up to 10^9.

<details><summary>hint</summary>

Count in [a, b] = rank of b + 1 minus rank of a, where rank(x) is the number of salaries below x.

</details>
<details><summary>solution sketch</summary>

An order-statistic multiset of (salary, id) pairs, with `order_of_key` giving ranks. O((n + q) log n). Offline: compress all salaries and use a Fenwick tree.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 9</span><span class="ex-t">Count of Smaller Numbers After Self</span><span class="ex-d"><b>●●●</b> LeetCode 315</span></summary>
<div class="ex-b">

[leetcode.com/problems/count-of-smaller-numbers-after-self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/). For each i, how many later elements are smaller than a[i]?

<details><summary>hint</summary>

Walk from the right and keep everything you've seen in a structure that answers "how many are below x".

</details>
<details><summary>solution sketch</summary>

Insert from right to left into an order-statistic tree and record the rank of a[i] before inserting it. Use (value, index) pairs so duplicates are counted correctly. O(n log n). Merge sort counting inversions or a Fenwick tree over compressed values also work.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">EX 10</span><span class="ex-t">Order statistic set, by hand</span><span class="ex-d"><b>●●●</b> SPOJ ORDERSET</span></summary>
<div class="ex-b">

[spoj.com/problems/ORDERSET](https://www.spoj.com/problems/ORDERSET/). Operations: insert x, delete x, the k-th smallest element, and how many elements are below x. Write the red-black tree yourself this time.

<details><summary>hint</summary>

Add a `size` field to each node. Which nodes' sizes change during a rotation?

</details>
<details><summary>solution sketch</summary>

Start from this post's insert code. Keep size(n) = size(l) + size(r) + 1. During a rotation only x and y change; recompute x first (it's now lower), then y. Insertion adds 1 along the search path; deletion subtracts 1 along the path to the removed node. k-th: compare k with size(left) + 1 and go left, stop or go right with k reduced. Rank: sum size(left) + 1 every time the search goes right. O(log n) each. This is CLRS's OS-SELECT and OS-RANK.

</details>
</div>
</details>

The CSES "Sorting and Searching" section has more problems where `std::set` or `std::multiset` is the intended tool, and Sedgewick's left-leaning paper is the shortest correct implementation to read after CLRS<sup><a href="#src-5">5</a></sup>.

My recommendation: learn the insertion cases through the 2-3-4 picture, write insertion and the P1 validator once, and use the library's tree for everything else. For deletion I'd read the Linux implementation, which has the CLRS case numbers in its comments<sup><a href="#src-12">12</a></sup>.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://khoury.northeastern.edu/home/vip/teach/Algorithms/7_hash_RBtree_simpleDS/CLRS_RBtrees.pdf">Cormen, Leiserson, Rivest and Stein, Introduction to Algorithms, 3rd ed., chapter 13, red-black trees (excerpt)</a></li>
<li id="src-2"><a href="https://link.springer.com/doi/10.1007/BF00289509">Bayer, symmetric binary B-trees: data structure and maintenance algorithms, Acta Informatica 1 (1972)</a></li>
<li id="src-3"><a href="https://sedgewick.io/wp-content/themes/sedgewick/papers/1978Dichromatic.pdf">Guibas and Sedgewick, a dichromatic framework for balanced trees, FOCS 1978</a></li>
<li id="src-4"><a href="https://en.wikipedia.org/wiki/Red%E2%80%93black_tree">Wikipedia, red-black tree (read 12 November 2026)</a></li>
<li id="src-5"><a href="https://sedgewick.io/wp-content/themes/sedgewick/papers/2008LLRB.pdf">Sedgewick, left-leaning red-black trees (2008)</a></li>
<li id="src-6"><a href="https://collaborate.princeton.edu/en/publications/updating-a-balanced-search-tree-in-o1-rotations/">Tarjan, updating a balanced search tree in O(1) rotations, Information Processing Letters 16 (1983)</a></li>
<li id="src-7"><a href="https://rtheunissen.github.io/bst/docs/references/2013_rank_balanced_trees.pdf">Haeupler, Sen and Tarjan, rank-balanced trees (preprint of ACM Transactions on Algorithms 11(4), 2015)</a></li>
<li id="src-8"><a href="https://www.kernel.org/doc/html/latest/core-api/rbtree.html">Linux kernel documentation, red-black trees (rbtree) in Linux (read 12 November 2026)</a></li>
<li id="src-9"><a href="https://benpfaff.org/papers/libavl.pdf">Pfaff, performance analysis of BSTs in system software, SIGMETRICS 2004</a></li>
<li id="src-10"><a href="https://abseil.io/about/design/btree">Abseil, B-tree containers design note (read 12 November 2026)</a></li>
<li id="src-11"><a href="https://doc.rust-lang.org/std/collections/struct.BTreeMap.html">Rust standard library, BTreeMap documentation (read 12 November 2026)</a></li>
<li id="src-12"><a href="https://github.com/torvalds/linux/blob/master/lib/rbtree.c">Linux source, lib/rbtree.c and include/linux/rbtree_augmented.h (read 12 November 2026)</a></li>
<li id="src-13"><a href="https://github.com/gcc-mirror/gcc/blob/master/libstdc%2B%2B-v3/include/bits/stl_tree.h">GCC libstdc++ source, bits/stl_tree.h (read 12 November 2026)</a></li>
<li id="src-14"><a href="https://gcc.gnu.org/onlinedocs/libstdc++/manual/policy_data_structures.html">GCC libstdc++ manual, policy-based data structures (read 12 November 2026)</a></li>
<li id="src-15"><a href="https://www.cambridge.org/core/services/aop-cambridge-core/content/view/62BC5EA75A2C95E3F6EE95AE3DADF0E5/S0956796899003494a.pdf/redblack_trees_in_a_functional_setting.pdf">Okasaki, red-black trees in a functional setting, Journal of Functional Programming 9(4) (1999)</a></li>
<li id="src-16"><a href="https://www.cs.cornell.edu/courses/cs3110/2019fa/a5/deletion.pdf">Germane and Might, deletion: the curse of the red-black tree, Journal of Functional Programming 24(4) (2014)</a></li>
<li id="src-17"><a href="https://docs.kernel.org/scheduler/sched-design-CFS.html">Linux kernel documentation, CFS scheduler (read 12 November 2026)</a></li>
<li id="src-18"><a href="https://docs.kernel.org/scheduler/sched-eevdf.html">Linux kernel documentation, EEVDF scheduler (read 12 November 2026)</a></li>
<li id="src-19"><a href="https://github.com/torvalds/linux/blob/master/kernel/sched/fair.c">Linux source, kernel/sched/fair.c (read 12 November 2026)</a></li>
<li id="src-20"><a href="https://github.com/torvalds/linux/blob/master/fs/eventpoll.c">Linux source, fs/eventpoll.c (read 12 November 2026)</a></li>
<li id="src-21"><a href="https://github.com/torvalds/linux/blob/master/include/linux/timerqueue.h">Linux source, include/linux/timerqueue.h (read 12 November 2026)</a></li>
<li id="src-22"><a href="https://github.com/nginx/nginx/blob/master/src/event/ngx_event_timer.h">nginx source, src/event/ngx_event_timer.h and ngx_event_timer.c (read 12 November 2026)</a></li>
<li id="src-23"><a href="https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeMap.html">Java SE 21 API, TreeMap (read 12 November 2026)</a></li>
<li id="src-24"><a href="https://openjdk.org/jeps/180">OpenJDK, JEP 180: handle frequent HashMap collisions with balanced trees</a></li>
<li id="src-25"><a href="https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/HashMap.java">OpenJDK source, java/util/HashMap.java (read 12 November 2026)</a></li>
<li id="src-26"><a href="https://code.visualstudio.com/blogs/2018/03/23/text-buffer-reimplementation">Lyu, text buffer reimplementation, VS Code blog (23 March 2018)</a></li>
<li id="src-27"><a href="https://lwn.net/Articles/845507/">LWN, introducing maple trees (12 February 2021)</a></li>
<li id="src-28"><a href="https://lwn.net/Articles/910608/">LWN, the 6.1 merge window, part 1 (2022)</a></li>
<li id="src-29"><a href="https://news.ycombinator.com/item?id=1171423">antirez on why Redis sorted sets use skip lists, Hacker News</a></li>
<li id="src-30"><a href="https://github.com/redis/redis/blob/unstable/src/t_zset.c">Redis source, src/t_zset.c on the unstable branch (read 12 November 2026)</a></li>
</ol>
</details>
