---
title: Shortest paths, a lesson with exercises
date: 2026-11-18T21:00:00Z
description: How Dijkstra's algorithm finds shortest paths and why it's right, what breaks it, and its relatives, from breadth-first search and Bellman-Ford to A*, searching from both ends, landmarks, Floyd-Warshall, many starts at once and other path problems, with ten figures to play with and exercises.
tags: [algorithms, graphs, competitive-programming]
category: code
glyph: graph
figures: 10
math: true
---

In 1956 Edsger Dijkstra needed a problem for the inauguration of a new computer, the ARMAC, one that an audience of non-mathematicians could follow<sup><a href="#src-17">17</a></sup>. He picked the shortest route between two Dutch cities: "What is the shortest way to travel from Rotterdam to Groningen, in general: from given city to given city." In an interview recorded in 2001 he said he designed the algorithm one morning on a café terrace in Amsterdam, over a cup of coffee with his fiancée, in about twenty minutes, and "without pencil and paper"<sup><a href="#src-1">1</a></sup>. He published it three years later. Route planners, network routing and the path a game unit walks are built on it, and most of the faster methods are Dijkstra with something added.

Every figure below runs its algorithm in your browser, and most of them let you draw walls or change the roads. It's the fourth lesson in a series, after [red-black trees](/blog/red-black-trees/), [segment trees](/blog/segment-trees/) and [B-trees](/blog/b-trees/). The [pathfinding for games](/blog/pathfinding-for-games/) post builds a planner for large game maps on top of the searches here.

## graphs and paths

A **graph** is a set of nodes joined by edges. In a road map the nodes are towns and the edges are roads; in a game map the nodes are the cells of a grid and the edges join each cell to its neighbours. An edge has a **weight**, its length or its cost, and the cost of a path is the sum of its edge weights. The **shortest path** from s to t is the path with the smallest cost, and its cost is the **distance** d(s, t).

Most algorithms here solve a slightly bigger problem: the distance from one start s to every node, the single-source problem. They get it for free, because finding the best way to t means ruling out every other way, and that means knowing how far everything closer than t is.

Two numbers describe a graph's size: V nodes and E edges. A grid of W × H cells with moves to the 4 neighbours has V = WH and about 2V edges; a road network has a few edges per node too. Graphs like these, with E close to V, are called **sparse**, and they're the usual case.

## breadth-first search

When every edge costs 1, the distance is the number of steps, and **breadth-first search** finds it with a plain first-in, first-out queue. Start with s at distance 0 in the queue. Take the front node, and put each neighbour that hasn't been seen yet at the back, one step farther. The queue then always holds nodes of at most two neighbouring distances, d and d + 1, in order, so the nodes come out in rings: everything at distance 1, then everything at distance 2, and so on.

<figure class="wide">
<sp-bfs data-fig data-label="fig 1 · breadth-first search">
<p class="fallback">A grid of 32 × 16 cells with a few walls. Breadth-first search starts at the dot near the top left and numbers every cell with its number of steps from the dot, ring by ring. The diamond near the bottom right is 55 steps away, round the walls; 458 cells are no farther than that and get finished first. Walls can be drawn and the ends moved, and the search reruns.</p>
</sp-bfs>
<figcaption><b>fig 1</b>The search spreads in rings of equal distance; each cell shows its number of steps from the dot. Drag on the grid to draw or erase walls, or drag the dot and the diamond. On a touch screen, tap a cell to toggle a wall, or tap the dot or the diamond and then a cell to move it.<span class="m">Moves go to the 4 neighbours, every move costs 1.</span></figcaption>
</figure>

Each node goes through the queue once and each edge is looked at once from each end, so breadth-first search costs O(V + E) time and O(V) memory. That's as fast as anything can be, because a search has to read the graph.

## dijkstra's algorithm

With weights, rings of steps aren't rings of cost. A road of 140 km is one step, the same as a road of 25 km. Dijkstra's algorithm keeps the idea and changes the queue. Each node has a tentative distance, the cheapest way found to it so far, ∞ at first and 0 for the start. Then, over and over:

1. Take the unfinished node u with the smallest tentative distance. That distance is now final.
2. For each edge from u to v with weight w, if d(u) + w is less than v's tentative distance, lower it to d(u) + w and remember that the best way to v comes from u. This is called **relaxing** the edge.

The algorithm stops when the target is finished, or when no unfinished node has a finite distance left. Following the "comes from" links back from the target gives the path.

<figure class="wide">
<sp-dijkstra data-fig data-label="fig 2 · Dijkstra, step by step">
<p class="fallback">Nine Dutch towns and thirteen roads, from Rotterdam. Dijkstra finishes them in this order: Rotterdam 0 km, Den Haag 25, Utrecht 60, Amsterdam 85, Amersfoort 85, Arnhem 125, Zwolle 155, Leeuwarden 225 and Groningen 245. Each step takes the closest unfinished town off the queue and lowers the distances of its neighbours where the road through it is shorter. The shortest route to Groningen goes through Utrecht, Amersfoort and Zwolle, 245 km; the one through Den Haag, Amsterdam and Leeuwarden is 285 km.</p>
</sp-dijkstra>
<figcaption><b>fig 2</b>Rotterdam to Groningen, the problem Dijkstra first solved. Step through: ochre is the town just taken off the queue and the roads that lowered a distance, purple towns are final, the solid lines are the best way found to each town. Click a road's length to add 10 km; after 150 it goes back to 20.<span class="m">The road lengths are rough and rounded for the figure, not measured.</span></figcaption>
</figure>

In Python, with a binary heap as the queue:

```python
import heapq

def dijkstra(graph, source):
    """graph[u] is a list of (v, weight) pairs; every weight is >= 0."""
    dist = {source: 0}
    queue = [(0, source)]
    done = set()
    while queue:
        d, u = heapq.heappop(queue)
        if u in done:
            continue  # an old entry: u was finished with a smaller d
        done.add(u)
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(queue, (nd, v))
    return dist
```

Python's heap has no way to lower an entry's key, so the code pushes a new entry and skips the old one when it comes out. The queue can then hold up to E entries instead of V, which costs a little memory and nothing else.

### why it's right

The claim is that when u comes off the queue, its tentative distance is its real distance. Suppose it isn't: some path P to u is shorter. P starts at s, which is finished, and ends at u, which isn't yet, so somewhere along P there's a first node y that isn't finished, right after a finished node x. When x was finished, the edge from x to y was relaxed, so y's tentative distance is at most the cost of P up to y. All weights are at least 0, so that's at most the cost of all of P, which is less than u's tentative distance. Then y would have come off the queue before u, and it didn't. So no such path exists<sup><a href="#src-2">2</a></sup>.

The step that uses "all weights are at least 0" is the one that breaks with a negative edge, below.

### what it costs

Each node is finished once and each edge relaxed once, so the cost depends on the queue:

- **Scanning an array** for the smallest unfinished node: V scans of V entries, O(V²). Dijkstra's own version did this. It's the best choice when the graph is dense, E close to V², because then reading the edges costs that much anyway.
- **A binary heap**: each push and pop costs O(log V), so O((V + E) log V). This is what almost everyone uses on sparse graphs.
- **A Fibonacci heap** lowers a key in O(1) amortized, which brings the bound to O(E + V log V)<sup><a href="#src-9">9</a></sup>. It's rarely faster in practice, because its constants are large.
- **Buckets**, when the weights are small whole numbers up to C: one bucket per distance value, and a pointer that only moves forward. Robert Dial published this in 1969<sup><a href="#src-10">10</a></sup>. It costs O(E + V·C), with no comparisons at all. With weights of only 0 and 1 it becomes a deque, **0-1 BFS**: 0-edges go to the front, 1-edges to the back<sup><a href="#src-11">11</a></sup>.

<figure class="wide">
<sp-queues data-fig data-label="fig 3 · what the queue costs">
<p class="fallback">Basic steps Dijkstra takes on square grid graphs of 64, 256, 1,024 and 4,096 nodes. At 4,096 nodes, scanning an array for the smallest takes 16,793,344 steps, a binary heap 76,388 and buckets 21,525. The array's count grows with the square of the size; the other two grow about in proportion to it.</p>
</sp-queues>
<figcaption><b>fig 3</b>Basic steps (comparisons, scans and relaxations) Dijkstra takes on grid graphs of growing size, with three kinds of queue. Hover a point for the numbers.<span class="m">Counted in your browser on square grids with random weights from 1 to 9; both scales are logarithmic.</span></figcaption>
</figure>

The array line climbs with slope 2 on the log-log chart: four times the nodes, sixteen times the work. The heap and the buckets climb with slope about 1.

## negative edges

Some problems have edges that pay back: a currency exchange with a bonus, a game move that refunds energy. Dijkstra's proof needed every weight to be at least 0, and without it the algorithm can finish a node too early.

<figure class="wide">
<sp-negative data-fig data-label="fig 4 · a negative edge">
<p class="fallback">Four nodes: S → A costs 2, S → B 5, B → A −4 and A → T 1. Dijkstra finishes A at 2, then T at 3, then B at 5; by then A is final, so the cheaper way S → B → A → T, which costs 2, is never used and Dijkstra answers 3. Bellman-Ford relaxes all four edges in each of 3 rounds and finds T = 2; a fourth round changes nothing. With an extra edge A → B costing 1, the cycle A → B → A costs −3, and the fourth round still lowers A, B and T, which shows the negative cycle.</p>
</sp-negative>
<figcaption><b>fig 4</b>Step through Dijkstra, then Bellman-Ford, on four nodes where B → A pays 4 back. The third option adds an edge from A back to B, which makes a cycle that costs less than nothing.<span class="m">Edge weights chosen to show the failure.</span></figcaption>
</figure>

**Bellman-Ford** gives up on finishing nodes. It relaxes every edge, in any order, V − 1 times over<sup><a href="#src-3">3</a></sup><sup><a href="#src-4">4</a></sup>. A shortest path with no repeated node has at most V − 1 edges, and after round k every node whose shortest path has k edges has its right distance, so V − 1 rounds are enough. That costs O(V·E), far more than Dijkstra, and a common speed-up stops as soon as a round changes nothing.

If a cycle's weights add up to less than 0, going round it again always helps, and there is no shortest path at all. Bellman-Ford notices: one extra round still lowers some distance, which can't happen otherwise<sup><a href="#src-12">12</a></sup>. To find all-pairs distances with negative edges, Johnson's algorithm runs Bellman-Ford once to compute a potential p for each node, reweights every edge as w + p(u) − p(v), which is never negative, and then runs Dijkstra from every node<sup><a href="#src-13">13</a></sup>.

## A*: a guess that leans toward the target

Dijkstra doesn't know where the target is. It finishes everything closer than the target, in every direction, including straight away from it. **A\*** ranks nodes by the cost so far plus a guess h of the cost left:

$$
f(v) = d(s, v) + h(v)
$$

and otherwise runs exactly like Dijkstra. Peter Hart, Nils Nilsson and Bertram Raphael at SRI proved in 1968 that if the guess never comes out higher than the real cost left, A* still finds a shortest path<sup><a href="#src-5">5</a></sup>. Such a guess is called **admissible**. A guess of 0 is admissible, and A* with it is Dijkstra.

On a grid the guess is a distance that ignores the walls. With moves in 8 directions, the **octile** distance (go diagonally until you're level with the target, then straight) is exact on open ground. The straight-line distance is never larger, so it's admissible too, but it's further below the real cost and A* looks at more. Multiplying the guess by w > 1 makes A* rush at the target. That's **weighted A\***, an idea that goes back to Ira Pohl in 1970<sup><a href="#src-6">6</a></sup>: it's no longer guaranteed to find the shortest path, but the path it finds costs at most w times the shortest<sup><a href="#src-18">18</a></sup>.

<figure class="wide">
<sp-astar data-fig data-label="fig 5 · the A* playground">
<p class="fallback">A 40 × 20 grid with walls, from a dot on the left to a diamond on the right, round the walls. With no guess (Dijkstra) the search finishes 453 cells; with the straight-line guess 314; with the octile guess 275; with the octile guess doubled, 191, some of them twice, because a guess that overestimates can finish a cell before its cheapest way in turns up. All four find a path of length 44.2 here, which is the shortest; the doubled guess is only guaranteed to be within twice the shortest.</p>
</sp-astar>
<figcaption><b>fig 5</b>Pick a guess and watch the cells A* finishes, in purple, with the newest in ochre. Drag on the grid to draw or erase walls, or drag the dot and the diamond.<span class="m">Moves in 8 directions, a diagonal only past two open cells; straight moves cost 1 and diagonals √2.</span></figcaption>
</figure>

A stronger property makes A* simpler. A guess is **consistent** if for every edge from u to v with weight w, h(u) ≤ w + h(v): walking one edge never lowers the guess by more than the edge costs. A consistent guess is admissible, and with it each node comes off the queue once, with its final distance, exactly as in Dijkstra. Octile and straight-line distance are both consistent. Exercise P3 asks for the proof.

## searching from both ends

When both ends are known, one search can start at each and stop when they meet. On open ground each search covers a disc of half the radius, so together they cover about half the area. Ira Pohl studied this in 1971<sup><a href="#src-7">7</a></sup>.

The stopping rule is the part that's easy to get wrong. The first node finished by both searches isn't always on the shortest path. Keep μ, the best cost of any path found where the two searches touch, and stop when the smallest key in the forward queue plus the smallest in the backward queue is at least μ.

<figure class="wide">
<sp-bidir data-fig data-label="fig 6 · one search or two">
<p class="fallback">A 60 × 32 grid with one short wall, the two ends 20 cells apart. One Dijkstra from the dot finishes 1,270 cells, a disc out to the target's distance. Two searches, one from each end, finish 788 cells together and meet in the middle, with the same path length, 24.1.</p>
</sp-bidir>
<figcaption><b>fig 6</b>Switch between one search from the dot and two searches, one from each end (purple from the dot, ochre from the diamond). The ring marks where they met. Drag to draw walls, or move the ends.<span class="m">Both are Dijkstra; the two searches take turns, the one with the smaller key first.</span></figcaption>
</figure>

## landmarks

A guess that ignores walls can be badly wrong on a map with long walls, and A* then fills every dead end on the way. Andrew Goldberg and Chris Harrelson's **ALT** builds a better guess from a few **landmarks**<sup><a href="#src-8">8</a></sup>. In advance, compute the exact distance from each landmark L to every node. By the triangle inequality, d(L, t) ≤ d(L, v) + d(v, t), so

$$
d(v, t) \ge d(L, t) - d(L, v)
$$

and on an undirected graph the other order works too. The largest of these bounds over all landmarks is admissible and consistent, and it knows about the walls, because the landmark distances went round them.

<figure class="wide">
<sp-alt data-fig data-label="fig 7 · landmarks">
<p class="fallback">A 40 × 20 grid with four long walls, from the bottom left to the top right. A* with the octile guess finishes 516 cells, filling corridors the path never uses. With one landmark in a corner it finishes 398; with two, 189; with four, also 189. The path is the same each time, length 70.3.</p>
</sp-alt>
<figcaption><b>fig 7</b>A* across four long walls with the octile guess, then with one, two and four landmarks in the corners (ochre diamonds).<span class="m">The landmark distances are computed in your browser with one Dijkstra per landmark.</span></figcaption>
</figure>

The price is memory: one distance per node per landmark. Landmarks work best behind the start or behind the target, so that the shortest path to the target passes near the line from the landmark. Road routing went further with **contraction hierarchies**, which add shortcut edges in advance so that a query only climbs to more important roads<sup><a href="#src-14">14</a></sup>.

## all pairs at once

Sometimes the question is the distance between every pair of nodes. Running Dijkstra from each node costs O(V·(V + E) log V). **Floyd-Warshall** does it in O(V³) with three loops and a table<sup><a href="#src-15">15</a></sup>:

```python
def floyd_warshall(d):
    """d[i][j] is the edge weight, 0 on the diagonal, inf where there is no edge."""
    n = len(d)
    for k in range(n):          # now also allow k as a middle stop
        for i in range(n):
            for j in range(n):
                if d[i][k] + d[k][j] < d[i][j]:
                    d[i][j] = d[i][k] + d[k][j]
    return d
```

After round k, d[i][j] is the shortest path from i to j whose middle stops are all among the first k nodes. When every node is allowed, that's the answer. The order of the loops matters: k must be the outer one. It handles negative edges, and a negative number on the diagonal at the end means a negative cycle.

<figure class="wide">
<sp-floyd data-fig data-label="fig 8 · Floyd-Warshall">
<p class="fallback">Five nodes, A to E, and nine directed edges. The table starts with the edge weights. Allowing A as a middle stop improves 2 entries, B improves 2, C none, D 8 and E none. The final table gives every shortest distance, for example 4 from A to D through B, and 16 from C to E.</p>
</sp-floyd>
<figcaption><b>fig 8</b>Step through the five rounds. The ochre node is the middle stop being allowed; ochre cells are the distances it improves, using its shaded row and column.<span class="m">A small directed graph with weights chosen for the figure.</span></figcaption>
</figure>

For a few hundred nodes Floyd-Warshall is the simplest correct thing to write, and its inner loop is easy for the processor. For sparse graphs with thousands of nodes, V runs of Dijkstra win.

## many starts at once

Put several starts in the queue at distance 0 at once and run Dijkstra as usual. It's the same as adding a virtual start joined to all of them by edges of weight 0, so every node ends up with the distance to its nearest start, and the "comes from" links tell which start that is. The map splits into territories, one per start: the nearest shop, the nearest exit, the nearest enemy.

<figure class="wide">
<sp-multi data-fig data-label="fig 9 · nearest of many">
<p class="fallback">A 40 × 20 grid with walls and three starts. One Dijkstra with all three at distance 0 gives every cell its distance to the nearest start, and the map splits into three territories along the walls. The farthest cell from any start is 22.6 steps away. Starts can be added or removed by clicking.</p>
</sp-multi>
<figcaption><b>fig 9</b>Click an open cell to add a start or remove one, up to six. Each cell is shaded by its nearest start, and the lines are the borders between territories.<span class="m">One Dijkstra with every start at distance 0; moves in 8 directions.</span></figcaption>
</figure>

Games use the reverse: one search from the goal over every cell gives every unit on the map its distance to the goal, and each unit then steps to its cheapest neighbour. That's a **flow field**, and the [pathfinding post](/blog/pathfinding-for-games/) shows how Supreme Commander 2 and Age of Empires IV build them.

## other path problems

Nothing in Dijkstra's loop needs the costs to be added. It needs two things: a way to extend a path's value by one more edge, and a way to compare two values, such that extending a path never makes it better. Then the best unfinished node can be made final, exactly as in the proof above. Mehryar Mohri described the general version as path problems over a semiring<sup><a href="#src-16">16</a></sup>.

- **Widest path**: a route is as wide as its narrowest road; find the widest. Extend with min, compare with max.
- **Most reliable path**: each road is open with some probability; find the route most likely to be open all the way. Extend by multiplying, compare with max. Taking −log of each probability turns it into an ordinary shortest path with weights that are never negative, an exercise in CLRS<sup><a href="#src-19">19</a></sup>.
- **Fewest edges**: every edge counts 1, which is breadth-first search again.

<figure class="wide">
<sp-algebra data-fig data-label="fig 10 · same loop, other problems">
<p class="fallback">The roads of fig 2 with three numbers each: length, lanes each way and the chance the road is open. The same loop answers four questions from Rotterdam to Groningen: shortest, 245 km; widest, 2 lanes; most reliable, 89.4%; fewest roads, 4.</p>
</sp-algebra>
<figcaption><b>fig 10</b>Pick a problem. The roads show their length, their lanes each way, or the chance they're open; the purple route is the best one to Groningen, and the list gives the best value to every town.<span class="m">The same nine towns as fig 2; the lanes and the chances are made up.</span></figcaption>
</figure>

The longest path is the problem that doesn't fit. Extending a path does make it longer, so no node can ever be made final, and on a general graph finding the longest simple path is NP-hard. On a graph without cycles it's easy again: process the nodes in topological order and relax each edge once.

## which one to use

| problem | algorithm | time |
|---|---|---|
| every edge costs 1 | breadth-first search | O(V + E) |
| weights 0 or 1 | 0-1 BFS | O(V + E) |
| small whole weights up to C | Dijkstra with buckets | O(E + V·C) |
| weights ≥ 0, sparse | Dijkstra with a binary heap | O((V + E) log V) |
| weights ≥ 0, dense | Dijkstra scanning an array | O(V²) |
| one target, a good guess | A* | depends on the guess; never worse than Dijkstra with a consistent one |
| negative weights | Bellman-Ford | O(V·E) |
| all pairs, small graph | Floyd-Warshall | O(V³) |
| all pairs, sparse, negative weights | Johnson | O(V·E log V) |
| a graph without cycles | relax in topological order | O(V + E) |

For a game map or a road network, my default is A* with a consistent guess, then ALT or a hierarchy when the map gets big. The [pathfinding post](/blog/pathfinding-for-games/) does the hierarchy.

## exercises

Proofs first, then problems from the CSES problem set to practise on.

<details class="ex">
<summary><span class="ex-n">P1</span><span class="ex-t">Breadth-first search finds shortest paths</span><span class="ex-d"><b>●</b>○○ proof</span></summary>
<div class="ex-b">

Show that when every edge costs 1, breadth-first search takes nodes off the queue in order of distance, and that the distance it assigns to each node is the real one.

<details><summary>hint</summary>

Show that the queue always holds nodes of distance d followed by nodes of distance d + 1, for some d.

</details>
<details><summary>solution sketch</summary>

Induction on the number of steps. At the start the queue holds s alone. Taking a node of distance d from the front adds nodes of distance d + 1 at the back, so the invariant holds. Nodes come out in non-decreasing distance. A node v first seen from u gets d(u) + 1; any shorter path to v would pass through a neighbour finished earlier, which would have seen v first.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P2</span><span class="ex-t">The smallest counterexample</span><span class="ex-d"><b>●</b>○○ proof</span></summary>
<div class="ex-b">

Fig 4 uses four nodes. Find a graph with three nodes and one negative edge, and no negative cycle, on which Dijkstra returns a wrong distance. Then show that with two nodes it can't go wrong.

<details><summary>hint</summary>

The node that's finished too early must have a cheaper way in through the negative edge.

</details>
<details><summary>solution sketch</summary>

s → a with weight 1, s → b with weight 3, b → a with weight −3. Dijkstra finishes a at 1, but s → b → a costs 0. With two nodes the only path from s to the other node is the direct edge, so its weight is the distance whatever its sign.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P3</span><span class="ex-t">Consistent implies admissible</span><span class="ex-d"><b>●●</b>○ proof</span></summary>
<div class="ex-b">

A guess is consistent if h(u) ≤ w(u, v) + h(v) for every edge and h(t) = 0. Prove that it is admissible, and that A* with it never takes a node off the queue twice.

<details><summary>hint</summary>

Sum the inequality along a shortest path from v to t. For the second part, look at the edge weights w'(u, v) = w(u, v) + h(v) − h(u).

</details>
<details><summary>solution sketch</summary>

Along a shortest path v = v0, v1, …, vk = t, adding h(vi) ≤ w(vi, vi+1) + h(vi+1) gives h(v) ≤ d(v, t) + h(t) = d(v, t). The reweighted edges w' are never negative by consistency, and a path's reweighted cost is its real cost plus h(t) − h(s), the same shift for every path from s. A* on w is Dijkstra on w', which finishes each node once.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">P4</span><span class="ex-t">Weighted A* is at most w times worse</span><span class="ex-d"><b>●●</b>○ proof</span></summary>
<div class="ex-b">

With an admissible h and w ≥ 1, A* ranks nodes by d(s, v) + w·h(v). Show that the path it returns costs at most w times the shortest.

<details><summary>hint</summary>

When the target comes off the queue, look at the first node of an optimal path that is still in the queue.

</details>
<details><summary>solution sketch</summary>

Let P be a shortest path and n the first node of P not yet finished when t is taken off. n is in the queue with d(s, n) equal to its distance along P. t came off first, so its cost is at most d(s, n) + w·h(n) ≤ w·(d(s, n) + h(n)) ≤ w·cost(P), using w ≥ 1 and the admissibility of h.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">E1</span><span class="ex-t">Shortest Routes I</span><span class="ex-d"><b>●</b>○○ CSES 1671</span></summary>
<div class="ex-b">

[CSES 1671](https://cses.fi/problemset/task/1671): distances from city 1 to every city, up to 10⁵ cities and 2·10⁵ one-way flights. Dijkstra with a heap, as above; use 64-bit integers.

<details><summary>hint</summary>

The lazy version (skip entries whose distance is larger than the stored one) is enough.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">E2</span><span class="ex-t">Flight Discount</span><span class="ex-d"><b>●●</b>○ CSES 1195</span></summary>
<div class="ex-b">

[CSES 1195](https://cses.fi/problemset/task/1195): one flight on the way may be taken at half price. Find the cheapest trip from city 1 to city n.

<details><summary>hint</summary>

Run Dijkstra on a bigger graph: every city twice, once with the coupon unused and once with it used.

</details>
<details><summary>solution sketch</summary>

State (city, used). Each flight u → v with cost c gives (u, 0) → (v, 0) with c, (u, 1) → (v, 1) with c, and (u, 0) → (v, 1) with ⌊c/2⌋. The answer is the distance to (n, 1). Doubling the nodes is a pattern that solves a lot of "with one special move" problems.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">E3</span><span class="ex-t">Shortest Routes II</span><span class="ex-d"><b>●</b>○○ CSES 1672</span></summary>
<div class="ex-b">

[CSES 1672](https://cses.fi/problemset/task/1672): up to 500 cities and 10⁵ queries for the distance between two of them. Floyd-Warshall once, then answer each query from the table.

</div>
</details>

<details class="ex">
<summary><span class="ex-n">E4</span><span class="ex-t">Cycle Finding</span><span class="ex-d"><b>●●</b>○ CSES 1197</span></summary>
<div class="ex-b">

[CSES 1197](https://cses.fi/problemset/task/1197): find a negative cycle if there is one, and print it.

<details><summary>hint</summary>

Start every distance at 0, which is the same as a virtual start joined to every node with weight 0, and run V rounds of Bellman-Ford. With every distance starting at 0, a shortest path needs at most V − 1 edges, so a change in round V means a negative cycle. Take a node changed in round V and walk its "comes from" links V times.

</details>
<details><summary>solution sketch</summary>

A node improved in round V is reached through a negative cycle. After V steps back along the parent links you're on the cycle itself; keep walking until you come back to that node, and print the nodes in reverse.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">E5</span><span class="ex-t">Investigation</span><span class="ex-d"><b>●●</b>○ CSES 1202</span></summary>
<div class="ex-b">

[CSES 1202](https://cses.fi/problemset/task/1202): besides the shortest distance from 1 to n, find how many shortest routes there are, and the fewest and the most flights a shortest route can use.

<details><summary>hint</summary>

The nodes come off Dijkstra's queue in order of distance, so a node's counts are complete when it's finished.

</details>
<details><summary>solution sketch</summary>

Keep count, minimum flights and maximum flights per node. When relaxing u → v: if the new distance is smaller, copy u's values (plus one flight); if it's equal, add u's count and update the minimum and the maximum. Process each node once, when it's finished.

</details>
</div>
</details>

<details class="ex">
<summary><span class="ex-n">E6</span><span class="ex-t">0-1 BFS on a grid</span><span class="ex-d"><b>●●</b>○ build</span></summary>
<div class="ex-b">

On a grid of open cells and walls, moving to a neighbour costs 0, and knocking down a wall to step into it costs 1. Find the fewest walls to knock down to get from one corner to the other, in O(V).

<details><summary>hint</summary>

A deque: 0-edges go to the front, 1-edges to the back.

</details>
<details><summary>solution sketch</summary>

The deque always holds distances d at the front and d + 1 at the back, the same invariant as P1. Pop from the front, skip a cell already finished, and push each neighbour to the front if stepping in costs 0 and to the back if it costs 1.

</details>
</div>
</details>

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://doi.org/10.1145/1787234.1787249">Frana and Misa, an interview with Edsger W. Dijkstra, Communications of the ACM 53(8) (2010), recorded in 2001</a></li>
<li id="src-2"><a href="https://doi.org/10.1007/BF01386390">Dijkstra, a note on two problems in connexion with graphs, Numerische Mathematik 1 (1959)</a> (<a href="https://ir.cwi.nl/pub/9256/9256D.pdf">PDF at CWI</a>)</li>
<li id="src-3"><a href="https://doi.org/10.1090/qam/102435">Bellman, on a routing problem, Quarterly of Applied Mathematics 16(1) (1958)</a></li>
<li id="src-4"><a href="https://www.rand.org/pubs/papers/P923.html">Ford, network flow theory, RAND paper P-923 (1956)</a></li>
<li id="src-5"><a href="https://doi.org/10.1109/TSSC.1968.300136">Hart, Nilsson and Raphael, a formal basis for the heuristic determination of minimum cost paths, IEEE Transactions on Systems Science and Cybernetics 4(2) (1968)</a></li>
<li id="src-6"><a href="https://doi.org/10.1016/0004-3702(70)90007-X">Pohl, heuristic search viewed as path finding in a graph, Artificial Intelligence 1(3–4) (1970)</a></li>
<li id="src-7"><a href="https://aitopics.org/doc/classics:49B0B811">Pohl, bi-directional search, Machine Intelligence 6 (1971)</a></li>
<li id="src-8"><a href="https://www.cs.princeton.edu/courses/archive/spring06/cos423/Handouts/GH05.pdf">Goldberg and Harrelson, computing the shortest path: A* search meets graph theory, SODA 2005</a></li>
<li id="src-9"><a href="https://doi.org/10.1145/28869.28874">Fredman and Tarjan, Fibonacci heaps and their uses in improved network optimization algorithms, Journal of the ACM 34(3) (1987)</a></li>
<li id="src-10"><a href="https://doi.org/10.1145/363269.363610">Dial, algorithm 360: shortest-path forest with topological ordering, Communications of the ACM 12(11) (1969)</a></li>
<li id="src-11"><a href="https://cp-algorithms.com/graph/01_bfs.html">cp-algorithms, 0-1 BFS</a></li>
<li id="src-12"><a href="https://cp-algorithms.com/graph/bellman_ford.html">cp-algorithms, Bellman-Ford</a></li>
<li id="src-13"><a href="https://doi.org/10.1145/321992.321993">Johnson, efficient algorithms for shortest paths in sparse networks, Journal of the ACM 24(1) (1977)</a></li>
<li id="src-14"><a href="https://doi.org/10.1007/978-3-540-68552-4_24">Geisberger, Sanders, Schultes and Delling, contraction hierarchies: faster and simpler hierarchical routing in road networks, WEA 2008</a></li>
<li id="src-15"><a href="https://doi.org/10.1145/367766.368168">Floyd, algorithm 97: shortest path, Communications of the ACM 5(6) (1962)</a></li>
<li id="src-16"><a href="https://cs.nyu.edu/~mohri/pub/jalc.pdf">Mohri, semiring frameworks and algorithms for shortest-distance problems, Journal of Automata, Languages and Combinatorics 7(3) (2002)</a></li>
<li id="src-17"><a href="https://amturing.acm.org/award_winners/dijkstra_1053701.cfm">ACM Turing Award, Edsger W. Dijkstra</a></li>
<li id="src-18"><a href="https://www.cs.unh.edu/~ruml/papers/optimistic-icaps-08.pdf">Thayer and Ruml, faster than weighted A*: an optimistic approach to bounded suboptimal search, ICAPS 2008</a></li>
<li id="src-19">Cormen, Leiserson, Rivest and Stein, Introduction to Algorithms, 3rd ed., exercise 24.3-6</li>
</ol>
</details>
