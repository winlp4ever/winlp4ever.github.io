---
title: Pathfinding for games, and a planner of blocks, areas and doors
date: 2026-11-18T20:00:00Z
description: How games find paths on big maps. Dijkstra and A* on a grid of cells, why they slow down, what Age of Empires, StarCraft, Supreme Commander, 0 A.D., Factorio and the Spring engine do instead, and the planner I built for large maps with costly ground and thin walls.
tags: [algorithms, games, pathfinding]
category: games
glyph: graph
figures: 5
math: true
---

A unit stands in one corner of the map and the player clicks the other. The pathfinder has to answer with a path the unit can really walk, about the cheapest one, and fast, because a game can get dozens of these orders in the same second.

Most games start from Dijkstra or A* over a grid of cells, and on a big map both get slow. Shipped games get round that with tiles, triangle meshes, flow fields, areas or quadtrees. For large maps where the ground has costs and walls can be one cell thin, I built a planner that cuts the map into blocks, the blocks into areas, and plans through doors between them. All five figures run the real algorithms in your browser, on the same small map.

## the map as a grid of cells

The simplest way to store a map for pathfinding is a grid. Each **cell** is a small square of ground, 1 m × 1 m here, and it's either free (a unit can stand there) or blocked (a house, a wall, water). A free cell also has a **cost**, how slow it is to cross. On the small map in the figures, a road costs 10, open ground 13, a wood 22, a ford 26 and a marsh 30. The best path is the cheapest one, which isn't always the shortest: a path that goes round a marsh on the road can be longer and still cost less.

A unit moves from a cell to any of its 8 neighbours. A straight step from cell a to cell b costs the average of their two costs, and a diagonal step costs √2 times that. I keep these as integers, (cost a + cost b) × 100 for a straight step and × 141 for a diagonal, so the same order gives the same path on every machine. Games that run in lockstep need that. Age of Empires sent only the players' commands over the network and ran the whole game on every machine; its developers checksummed "the world, the objects, the pathfinding, targeting and every other system", because "the code path taken on all machines must match"<sup><a href="#src-3">3</a></sup>.

One more rule: a diagonal step is allowed only when both cells beside it are free. Without it, a unit could slip between two wall cells that touch at a corner, through a wall drawn as a diagonal line of cells.

## dijkstra and A*

**Dijkstra's algorithm** keeps a queue of cells ordered by the cost of the cheapest way found to them so far. It takes the cheapest cell off the queue, and that cell's cost is now final: every other cell in the queue costs more, so no path through them can come back cheaper. Then it looks at the cell's neighbours and puts them in the queue with their new costs. When the target comes off the queue, its path is the cheapest one<sup><a href="#src-1">1</a></sup>. The cells it finishes form rings of equal cost around the start, so it spreads evenly in every direction, including away from the target.

**A\*** ranks the cells by the cost so far plus a guess of the cost left to the target. Peter Hart, Nils Nilsson and Bertram Raphael proved in 1968 that if the guess never comes out higher than the real cost, A* still finds the cheapest path<sup><a href="#src-2">2</a></sup>. On a grid with 8 directions the usual guess is the octile distance: walk diagonally until you're level with the target, then straight. With dx and dy the distances across and down, and every cell costing the cheapest ground, the road:

$$
h = c_{\min} \cdot \big(200 \max(dx, dy) + 82 \min(dx, dy)\big)
$$

in the same units as the step costs (a straight step on road is 2 × 10 × 100 = 2,000, a diagonal 2,820).

<figure class="wide">
<pf-search data-fig data-label="fig 1 · Dijkstra and A* on the same map">
<p class="fallback">A 96 × 60 cell map with a road, a brook crossed by a bridge and a ford, a wood, a marsh, five houses, a bent lane between two thin walls, a walled garden with no gate and a long diagonal wall. Both searches go from the south-west corner to a target east of the brook. Dijkstra looks at 4,425 of the 5,341 free cells before it reaches the target. A* looks at 1,137. Both return paths of the same cost, along the road, over the bridge and round the marsh; a few cells differ where two steps cost the same.</p>
</pf-search>
<figcaption><b>fig 1</b>Pick a search and watch the cells it looks at, cheapest first. The wide grey band is the road and the winding one the brook, ochre is marsh, the faint patch is wood, and solid cells are walls and houses.<span class="m">Both searches run on the map in your browser. The map is made up.</span></figcaption>
</figure>

Both searches return paths of the same cost; A* gets there after a quarter of the work. With a binary heap as the queue, each search costs O(n log n) for n cells looked at, and each cell checks at most 8 neighbours. Its memory is O(n): a cost and a parent per cell.

The guess is what makes A* fast, and costly ground makes the guess weak. It has to assume road all the way, or it could guess too high. On the small map open ground costs 30% more than road, so a cell off the straight line can't be ruled out until the search has spent that 30% somewhere. A* ends up looking at every cell inside an oval around the straight line. The oval gets wider as the trip gets longer, so the work grows about with the square of the distance: a trip twice as long costs about four times as much.

That's fine on a small map. I measured it on a made-up test map of 3.2 km × 3.2 km at 1 m per cell, 10.24 million cells, with roads, fields, woods, marshes, four streams, 16 villages with 1,120 houses, 1,200 thin walls at any angle and 96 walled gardens. Over 40 random trips of 0.5 to 3.2 km, one A* over every cell took 345 ms in the median, 879 ms at the 90th percentile and 1.27 s for the longest.

## a coarser grid, and where it breaks

The quick fix is a coarser grid. Plan on 2 m squares, each marked open or closed, and there are 4 times fewer places to look at. My first planner did that, and ten of the sixteen serious bugs a review found in it came from this one choice.

Thin walls and narrow lanes don't line up with the squares. When a wall runs through a square, the free ground in it is split in two, and one bit can't say "open on this side, closed on the other". The square has to be closed, or units walk through the wall. Closing it throws away ground a unit could use, and a lane two cells wide can disappear completely.

<figure class="wide">
<pf-coarse data-fig data-label="fig 2 · one bit per square">
<p class="fallback">The same map, with a trip from south of the road to the far end of the bent lane, which is two cells wide between two thin walls. On 1 m cells A* looks at 1,144 cells and walks up the lane. On 2 m squares, a square that holds any blocked cell is closed: 317 free cells are lost, among them every cell of the lane. The target sits in a closed square, so the search looks at 4,960 cells and finds no path.</p>
</pf-coarse>
<figcaption><b>fig 2</b>Switch between 1 m cells and 2 m squares with one open or closed bit each. Ochre marks free cells that the squares close.<span class="m">The squares are computed from the same cells: closed if any of their four cells is blocked.</span></figcaption>
</figure>

Each fix I tried added a special rule somewhere: at the start, to step off a closed square; at the target, to find a nearby open one; in the smoothing, to stop a straight line from cutting through a closed corner. Every review found a new wall shape that the rules missed.

## how games do it

Shipped games mostly avoid planning long trips on one flat grid. They use one of a few ideas, often two together. Fig 3 draws four of them on the same map.

<figure class="wide">
<pf-games data-fig data-label="fig 3 · four ways to cut up the map">
<p class="fallback">Four ways of cutting up the same map. Tiles of 4 × 4 cells, each open or closed: 92 of 360 tiles are closed and 1,053 free cells go with them, the lane among them. A quadtree that splits each 12 × 12 square into four until every part is one kind of ground: 1,296 squares, big in open fields and single cells along every slanted wall. A flow field: one Dijkstra from the target over every cell, then an arrow in each cell pointing to its cheapest neighbour. Areas and regions: each 12 × 12 block is split into the ground you can walk all over without leaving it, 52 areas in 40 blocks, and the areas join into 2 regions, one of them the walled garden.</p>
</pf-games>
<figcaption><b>fig 3</b>Pick a method. The tiles, the quadtree, the flow field and the areas are all computed from the map's cells.<span class="m">These are the methods' ideas at a small size, not the games' code. Real tiles, blocks and squares are larger.</span></figcaption>
</figure>

### tiles, and buildings drawn to fit them

Age of Empires was built on tiles<sup><a href="#src-3">3</a></sup>. Every building covers whole tiles, so a wall is a staircase of tiles and each tile is plainly open or closed. The tiles view in fig 3 shows why that only works when the art is drawn to fit: on a map that wasn't, a quarter of the tiles close. Even with tiles, Age of Empires II used more than one planner. Its postmortem says "no fewer than three separate pathfinding and two obstruction systems were developed": a high-level one "computes general routes across the world map", and lower-level ones "thread a path through a closely packed group of units"<sup><a href="#src-4">4</a></sup>. StarCraft, the first one, worked the same way, with 32 × 32 pixel build tiles split into 8 × 8 pixel walk tiles<sup><a href="#src-5">5</a></sup>.

### triangles, and a string pulled tight

A **navigation mesh** stores the free ground as polygons, usually triangles, and searches over those. StarCraft II, according to a write-up of Blizzard's 2011 GDC talk on navigation, builds a constrained Delaunay triangulation of the free ground and rebuilds it whenever a building goes up or comes down. It runs A* over the triangles, then pulls the path tight round the corners with the funnel algorithm, like a string. Units aren't part of the mesh; they steer round each other<sup><a href="#src-6">6</a></sup>.

A mesh has very few nodes, and walls at any angle are exact. Units of different sizes need more work. Douglas Demyen and Michael Buro's TA* stores in each triangle the widest unit that can pass through it<sup><a href="#src-7">7</a></sup>, and Recast, the open-source navmesh builder used by many engines, shrinks the free ground by the unit's radius and builds one mesh per size<sup><a href="#src-8">8</a></sup>. Ground costs are harder: every edge of a marsh or a road becomes polygon edges, and a map full of roads and fields turns into a lot of small triangles.

### flow fields over sectors

Supreme Commander 2 keeps a grid of 1 m cells, cut into sectors of 10 × 10. Where free cells face free cells across a sector edge it puts a **portal**. An order first runs A* over the portal graph to find which sectors to cross, then builds a **flow field** only in those sectors: a Dijkstra from the goal, then an arrow in each cell pointing downhill. Every unit in the group follows the arrows from wherever it stands<sup><a href="#src-9">9</a></sup>. Each kind of movement has its own costs and its own portal graph, and for large units the walls were made thicker so they can't fit through narrow gaps. A number per piece of connected ground answers "can it get there at all" before any search.

Age of Empires IV does the same on a 1024 × 1024 grid. Its portal graph borrows from HPA\* (below), the ground inside each tile is joined by flood fill, and the flow is made only for the tiles the A\* route goes through, in short overlapping pieces built as the units move. Making the flow for 200 horsemen took 1.11 ms<sup><a href="#src-10">10</a></sup>.

### areas and regions

0 A.D., an open-source game, cuts its grid of 1 m cells into chunks of 96 × 96. Inside each chunk it flood-fills the free cells into **areas**, so a wall through a chunk gives two areas, one each side. Areas that touch across chunk edges are joined into global regions. When the target can't be reached, it moves the target to the nearest point that can. The path itself is then searched over the cells with jump point search (below), and in 0 A.D. a cell is open or closed, with no ground costs<sup><a href="#src-11">11</a></sup>.

Factorio (on chunks of 32 × 32 tiles) and OpenRA (on 10 × 10 sections, since 2022) use the same areas a different way. They search the small graph of areas first, from the goal outward, and use those distances as A*'s guess for an ordinary search over the cells<sup><a href="#src-12">12</a></sup><sup><a href="#src-13">13</a></sup>. The guess is much sharper than the octile distance, but the search goes over cells all the way. Dragon Age: Origins used sectors split into regions too, one region per connected piece of a sector, built on Nathan Sturtevant's research<sup><a href="#src-20">20</a></sup>.

### quadtrees

The Spring engine (now Recoil, which runs Beyond All Reason) uses a quadtree. A square is cut into four until each part holds one kind of ground, so no square is ever split by a wall. A* goes from square to square through the middle of their shared edges, which the engine's own comments say "causes local and global sub-optimalities" that smoothing "can only partially address"<sup><a href="#src-14">14</a></sup>. Its older planner kept a single point per block, which has the same weakness near walls as my coarse grid. In open fields the squares are big and there are few of them. Along a slanted wall or a curved marsh the squares shrink to single cells: 1,296 squares on fig 3's small map, against 5,760 cells.

### faster searches on even ground

**Jump point search** speeds A* up "by an order of magnitude and more" on grids where every cell costs the same, with no preparation at all<sup><a href="#src-15">15</a></sup>. It skips over runs of open cells that can't change the answer. JPS+ stores "eight numbers" per cell to make the skips cheaper, for maps that never change<sup><a href="#src-16">16</a></sup>. Both need even ground: a road through a field is exactly the kind of cell they can't skip. JPSW, published in 2023, extends the idea to a cost per cell and reports being "up to orders of magnitude faster" than A*<sup><a href="#src-17">17</a></sup>. It's newer and more complex, and I haven't tried it.

### tables computed ahead

At the far end, some methods compute nearly all the answers in advance. Contraction hierarchies add shortcut edges, and compressed path databases store the first move from every cell to every other. They answer the fastest. In the 2014 grid pathfinding competition, over 132 maps far smaller than 10 million cells, the contraction hierarchy entry needed 2.4 GB and 969 minutes of preprocessing, and a compressed path database 28 GB and 11,650 minutes on several cores. JPS+ needed 947 MB and one minute<sup><a href="#src-18">18</a></sup>.

| method | used by | ground costs | thin walls at any angle | prepared ahead | work per order |
|---|---|---|---|---|---|
| A* over every cell | most small games | yes | yes | nothing | all cells in an oval |
| tiles, art drawn to fit | Age of Empires II, StarCraft | yes | no, walls follow tiles | nothing | tiles in an oval |
| navigation mesh | StarCraft II, Recast | hard | yes | the mesh | few triangles |
| sectors, portals, flow fields | Supreme Commander 2, Age of Empires IV | yes | yes | portals | portals, then cells in a few sectors |
| areas as a guess | Factorio, OpenRA | yes | yes | areas | cells all the way |
| areas, cells searched | 0 A.D. | no | yes | areas, regions | cells all the way |
| quadtree | Spring, Recoil | yes | many tiny squares | the tree | squares |
| jump points | 0 A.D.'s cell search | no | yes | nothing, or 8 numbers a cell | few cells |

## my planner: blocks, areas and doors

My planner is closest to Supreme Commander 2 and 0 A.D. together, and its core is HPA\*, "near optimal hierarchical path-finding", which Adi Botea, Martin Müller and Jonathan Schaeffer published in 2004<sup><a href="#src-19">19</a></sup>. It keeps the 1 m cells, which are exact, and never plans long trips on them. The words, which the figures use too:

- a **block** is a 12 × 12 square of the map in the figures, 32 m × 32 m on the big map. Blocks cut the map like a chessboard; the lines between them are imaginary.
- an **area** is the free ground inside one block that a unit can walk all over without leaving the block. A block with no wall has one area. A wall through it makes two.
- a **door** is a spot on the edge between two blocks where free cells face free cells. It has two nodes, one cell on each side.
- a **region** is all the ground a unit can reach from where it stands, over the whole map.
- a **link** joins two doors inside one block, with the cost of the cheapest walk between them.
- the **route** is the chain of doors an order goes through, and the **steps** are the exact 1 m path that walks it.

Two things differ from the HPA\* paper. Doors are joined only within an area, so a wall through a block never needs special handling. And a door is also placed wherever the ground cost changes along an edge, so every road that crosses a block edge gets a door on the road.

### prepare, once per map

My maps don't change during play, so each map is prepared once when it loads. Units of different sizes get their own cells, with the walls widened by the unit's radius, and their own doors, like the per-movement-type portal graphs in Supreme Commander 2 and the per-size meshes in Recast.

1. **Regions**: one flood fill over all the free cells of the map. Cells that touch get the same number.
2. **Areas**: the same flood fill inside each block, as if the block's edges were walls.
3. **Doors**: walk along every edge between two blocks. A run of free cells facing free cells is an opening. It ends at a blocked cell, at a change of area on either side, or at a change of ground cost on either side. Each opening gets one door in its middle.
4. **Links**: inside each block, a Dijkstra from each door over that block's cells only. Every other door it reaches gets a link with that walk's cost. Each door's two nodes are also linked, with the cost of one step.

<figure class="wide">
<pf-prepare data-fig data-label="fig 4 · preparing the map">
<p class="fallback">The four stages of preparing the small map. Its 5,760 cells hold 5,341 free ones. Regions: one flood fill finds 2 regions; the walled garden, with no gate, is one of them. Blocks and areas: 40 blocks of 12 × 12 hold 52 areas, and 10 blocks have more than one because a wall, a house or the brook cuts them. Doors: the openings along the block edges get 117 doors, 234 nodes. Links: a Dijkstra from every door inside its own block gives 568 links between doors of the same block.</p>
</pf-prepare>
<figcaption><b>fig 4</b>Step through the four stages. Dashed lines are block edges. Shades of orange tell neighbouring areas apart, ochre marks openings, small squares are doors.<span class="m">Links are drawn as straight lines; each one stands for a real walk inside its block.</span></figcaption>
</figure>

A link that would need to leave its block to be cheap isn't that link's job. That cheaper way is a chain of other links through the next block, and the route search finds it there. And a door behind a wall is never reached by a Dijkstra that starts on the other side, so no link ever crosses a wall.

Regions and areas cost O(n) for n cells. The links cost one Dijkstra per door over one block of k² cells: with d doors per block, that's O(n · d · log k) in all. On the big map that was 69 million cell visits.

### plan, each order

1. **Can it get there?** If the target is blocked, or its region isn't the start's, move the target to the nearest free cell in the start's region, searching outward from the target. 0 A.D. does the same<sup><a href="#src-11">11</a></sup>. When the target can't be reached, the planner knows in one lookup, without searching the map.
2. **Join the start and the target to the graph.** A Dijkstra from the start inside its block finds the doors of its own area and what each costs to reach. The same from the target. These two nodes exist for this order only.
3. **The route**: A* over the doors, from START to TARGET, with the octile guess.
4. **The steps**: for each link of the route, an exact A* over cells from one door to the next, inside that one block. Crossing a door is one step.
5. **Straighten**: walk the steps and skip points while the straight line to a later point is clear on the cells and costs at most 5% more than the steps it replaces. The 5% keeps a path on a road that bends round a marsh.

<figure class="wide">
<pf-plan data-fig data-label="fig 5 · one order, step by step">
<p class="fallback">One order planned in five steps, from the south-west corner to east of the brook. The start and target are in the same region. A Dijkstra inside the start's block finds 2 doors of its area, and one inside the target's block finds 6. A* over the doors takes 99 doors off its queue and picks a chain of 18 door nodes along the road and over the bridge. The exact steps, searched one link at a time inside each block, look at 222 cells, against 1,137 for one A* over the whole map. After straightening the path has 3 legs and costs 3.1% more than the exact cell path. An order into the walled garden moves its target to the nearest reachable cell, just north of the garden wall. With one door per opening, the doors miss the road and the steps cost 15.9% more before straightening.</p>
</pf-plan>
<figcaption><b>fig 5</b>Pick an order or click the map twice (start, then target), and step through the plan. Grey dots are doors the route search took off its queue, the orange line is the route and then the steps, the dashed line is the exact path from one A* over every cell. Switch the door rule to see the route miss the road.<span class="m">The planner, the exact search and the costs all run on the map in your browser.</span></figcaption>
</figure>

The route search looks at doors, a few per block, so it's fast at any distance. The step searches look only at cells in the blocks along the route, one block at a time: about the length of the trip times the block's side, the strip in fig 5, instead of an oval of the whole map.

### why it can't go wrong

These hold because of how the graph is built, with no rule per wall shape:

- **No route through a wall.** Two doors are linked only if prepare step 4 walked from one to the other on free cells, so every route can be walked.
- **No ground lost.** Every free cell belongs to one area. To get from one block to the next a unit must cross an opening, and every opening has a door. If a unit can get somewhere, the route search finds a way.
- **No wrong turn.** A route ends only at TARGET, and TARGET is linked only to the doors of its own area. A door on the wrong side of a wall may be looked at, but no chain through it reaches TARGET. If there are several ways, every link carries a real cost and the cheapest chain wins.
- **One answer.** Regions, areas, doors, steps and straightening all read the same cells with the same diagonal rule, so nothing can disagree about where a unit may stand.

The route isn't always the cheapest path. A door sits in the middle of its opening, so a route through a wide opening may bend a little to reach it, and a link's cost is the best walk inside its block only. HPA\*'s authors report paths within 1% of optimal after smoothing on their test maps<sup><a href="#src-19">19</a></sup>. On my big map the straightened paths came out slightly shorter than exact cell search, because straight legs can run at any angle and cell steps only in 8 directions.

## measured on a big map

On the 3.2 km test map, the same 40 trips, planned by the new planner and by A* over every cell, back to back. The machine was busy (a load of 20 to 27 on 10 cores), so the times are high, but both planners ran under the same load. The benchmark is a standalone JavaScript program.

| | blocks, areas, doors | A* over every cell |
|---|---|---|
| order time, median | 8.0 ms | 345 ms |
| order time, 90th percentile | 13.6 ms | 879 ms |
| order time, longest | 26.5 ms | 1,265 ms |
| path cost against exact, after straightening | 1.2% less in the median, 3.5% more at worst | exact |
| unreachable target | 13 to 24 µs | a search over the whole region |
| prepared ahead | 6.4 s, 37,000 doors, 540,000 links | nothing |

The planner was 46 times faster in the median and 18 times faster on the slowest tenth of trips. It agreed with the exact search on whether a path exists for all 40 trips. Doubling the map's side from 1.6 to 3.2 km made the exact search 4.6 times slower and the new planner 2.2 times slower.

I tried other door rules and block sizes on the same trips:

| door rule, block size | doors | prepare | order, median | faster than exact | path cost against exact |
|---|---|---|---|---|---|
| one per opening, plus cost changes, 32 m | 37 k | 6.4 s | 8.0 ms | 46× | −1.2% median, +3.5% worst |
| two on openings 6 cells or wider, plus cost changes, 32 m | 64 k | 10.3 s | 9.9 ms | 36× | −1.2% median, +3.9% worst |
| one per opening, 32 m | 23 k | 3.9 s | 7.7 ms | 44× | +5.4% median, +19% worst |
| two on wide openings, plus cost changes, 64 m | 23 k | 17 s | 12 ms | 27× | −1.4% median |
| two on wide openings, plus cost changes, 16 m | 195 k | 9 s | 25 ms | 20× | −1.2% median |

The split at cost changes is what keeps routes on roads. Without it a door sits in the middle of each opening, which on a block edge crossed by a road is usually in the field beside it, and paths came out 5.4% longer in the median and 19% at worst. HPA\*'s two doors on wide openings cost more time and didn't help once the cost split was in. 32 m blocks beat both 16 m (too many doors) and 64 m (too many cells per step search).

One detail mattered more than I expected. My first version searched the steps over all the route's blocks at once, and spent 30 ms there. Searched one link at a time, door to door inside one block, the steps took 6 ms.

## what it costs to prepare

6.4 s is too slow to wait for when a map loads, and almost all of it is the links: a Dijkstra from every door across its block. I tried preparing blocks lazily, the first time an order needs them, and it was bad for the first orders: one had to prepare 2,820 blocks and took 1.9 s. Blocks don't depend on each other, so the links can be built on several cores and merged in block order, which gives the same graph whatever the number of threads. If that is still slow, the graph can be saved with the map, since the ground never changes.

For maps much bigger than 3.2 km, the standard next step is a second level: districts of blocks, with doors between districts, so the route search itself stays small. At 3.2 km I don't need it.

I'm going with links built on worker threads at load, 32 m blocks, one door per opening plus a split at every cost change, and the steps searched one link at a time.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://doi.org/10.1007/BF01386390">Dijkstra, a note on two problems in connexion with graphs, Numerische Mathematik 1 (1959)</a></li>
<li id="src-2"><a href="https://doi.org/10.1109/TSSC.1968.300136">Hart, Nilsson and Raphael, a formal basis for the heuristic determination of minimum cost paths, IEEE Transactions on Systems Science and Cybernetics 4(2) (1968)</a></li>
<li id="src-3"><a href="https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond">Bettner and Terrano, 1500 archers on a 28.8: network programming in Age of Empires and beyond, GDC 2001</a></li>
<li id="src-4"><a href="https://www.gamedeveloper.com/design/postmortem-ensemble-studio-s-age-of-empires-ii-age-of-kings">Pritchard, postmortem: Ensemble Studios' Age of Empires II: Age of Kings, Game Developer (March 2000)</a></li>
<li id="src-5"><a href="https://javabwapi.github.io/JBWAPI/bwem/MiniTile.html">BWEM documentation, MiniTile (community library for StarCraft: Brood War)</a></li>
<li id="src-6"><a href="https://tchayen.com/open-problems-of-a-star-for-any-angle-pathfinding">Czajecki, open problems of A* for any-angle pathfinding (May 2024)</a>, a second-hand summary of <a href="https://www.gdcvault.com/play/1014514/AI-Navigation-It-s-Not">Anhalt, Kring and Sturtevant, AI navigation: it's not a solved problem, yet, GDC 2011</a></li>
<li id="src-7"><a href="https://cdn.aaai.org/AAAI/2006/AAAI06-148.pdf">Demyen and Buro, efficient triangulation-based pathfinding, AAAI 2006</a></li>
<li id="src-8"><a href="https://recastnav.com/md_Docs_2__1__Introduction.html">Recast Navigation documentation, introduction</a></li>
<li id="src-9"><a href="http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter23_Crowd_Pathfinding_and_Steering_Using_Flow_Field_Tiles.pdf">Emerson, crowd pathfinding and steering using flow field tiles, Game AI Pro, chapter 23 (2013)</a></li>
<li id="src-10"><a href="https://media.gdcvault.com/GDC+2022/Speaker+Slides/Pathing+In+Age_Cheng_Frank+2022-03-29+00.16.38.pdf">Cheng, pathing in Age of Empires IV: flow fields and steering behaviors, GDC 2022 slides</a></li>
<li id="src-11"><a href="https://gitea.wildfiregames.com/0ad/0ad/src/branch/main/source/simulation2/helpers/HierarchicalPathfinder.h">0 A.D. source, HierarchicalPathfinder.h and LongPathfinder.h</a></li>
<li id="src-12"><a href="https://factorio.com/blog/post/fff-317">Factorio Friday Facts #317, new pathfinding algorithm (October 2019)</a></li>
<li id="src-13"><a href="https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Mods.Common/Pathfinder/HierarchicalPathFinder.cs">OpenRA source, HierarchicalPathFinder.cs</a></li>
<li id="src-14"><a href="https://github.com/beyond-all-reason/RecoilEngine/tree/master/rts/Sim/Path/QTPFS">Recoil engine source, QTPFS (and HAPFS for the older planner)</a></li>
<li id="src-15"><a href="https://ojs.aaai.org/index.php/AAAI/article/view/7994">Harabor and Grastien, online graph pruning for pathfinding on grid maps, AAAI 2011</a></li>
<li id="src-16"><a href="http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter14_JPS_Plus_An_Extreme_A_Star_Speed_Optimization_for_Static_Uniform_Cost_Grids.pdf">Rabin and Silva, JPS+: an extreme A* speed optimization for static uniform cost grids, Game AI Pro 2, chapter 14 (2015)</a></li>
<li id="src-17"><a href="https://ojs.aaai.org/index.php/AAAI/article/view/26458">Carlson, Moghadam, Harabor, Stuckey and Ebrahimi, optimal pathfinding on weighted grid maps, AAAI 2023</a></li>
<li id="src-18"><a href="https://ojs.aaai.org/index.php/SOCS/article/view/18364">Sturtevant et al., the grid-based path planning competition: 2014 entries and results, SoCS 2015</a></li>
<li id="src-19"><a href="https://web.archive.org/web/2020id_/https://webdocs.cs.ualberta.ca/~mmueller/ps/hpastar.pdf">Botea, Müller and Schaeffer, near optimal hierarchical path-finding, Journal of Game Development 1(1) (2004), archived copy</a></li>
<li id="src-20"><a href="https://ojs.aaai.org/index.php/AIIDE/article/view/18778">Sturtevant, memory-efficient abstractions for pathfinding, AIIDE 2007</a></li>
</ol>
</details>
