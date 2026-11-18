---
title: Pathfinding for games, and a planner of blocks, areas and doors
date: 2026-11-18T20:00:00Z
description: How games find paths on big maps. Dijkstra and A* on a grid of cells, why they slow down, what Age of Empires, StarCraft, Supreme Commander, 0 A.D., Factorio and the Spring engine do instead, and the planner I built for large maps with costly ground and thin walls.
tags: [algorithms, games, pathfinding]
category: games
glyph: graph
figures: 14
math: true
---

A unit stands in one corner of the map and the player clicks the other. The pathfinder has to answer with a path the unit can really walk, about the cheapest one, and fast, because a game can get dozens of these orders in the same second.

Most games start from Dijkstra or A* over a grid of cells, and on a big map both get slow. Shipped games get round that with tiles, triangle meshes, flow fields, areas or quadtrees. For large maps where the ground has costs and walls can be one cell thin, I built a planner that cuts the map into blocks, the blocks into areas, and plans through doors between them. The figures run the real algorithms in your browser.

<figure class="wide">
<pf-hero data-fig data-label="fig 1 · one block, two ways">
<p class="fallback">One 8 × 8 block of 1 m cells with a garden wall running diagonally through it. Marked with one bit, the block is closed and the free ground on both sides of the wall is lost. Coloured by which free cells touch, it splits into two areas, one each side of the wall. Each area gets its own doors into the next blocks, and nothing joins the two areas, so no path can cross the wall.</p>
</pf-hero>
<figcaption><b>fig 1</b>The whole idea in one block. Step through the four stages: the cells, one mark for the block, the two areas, and their doors.<span class="m">It cycles on its own until you pick a stage.</span></figcaption>
</figure>

## the words

Think of the map as a house. The blocks are rooms, the areas are the parts of a room you can walk around in, and the doors lead from room to room. The rest of the post uses these words, and each one has a small picture:

<figure class="wide">
<pf-words data-fig data-label="fig 2 · the words, each with a picture">
<p class="fallback">Twelve small pictures. A cell is a 1 m square, free or blocked. A square is a 2 m cell of a coarser grid, closed when a wall splits it. A block is a larger square of the map. An area is the free ground of one block on one side of a wall. A door is a spot on a block edge with free ground on both sides. A region is all the ground reachable from a point; a walled garden with no gate is its own. A big unit needs more room, so a gap a small unit fits through is closed for it. Cost: a longer road can be cheaper than a short way through marsh. Search: Dijkstra spreads in all directions, A* leans toward the target. Route and steps: the doors to go through, then the exact cells. Straightening removes zigzags. The exact check is one A* over every cell, used in tests.</p>
</pf-words>
<figcaption><b>fig 2</b>Cells are free or blocked, blocks are imaginary squares over them, and areas, doors and regions come from the free cells.<span class="m">Each picture is drawn from a small grid of real cells.</span></figcaption>
</figure>

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
<pf-search data-fig data-label="fig 3 · Dijkstra and A* on the same map">
<p class="fallback">A 96 × 60 cell map with a road, a brook crossed by a bridge and a ford, a wood, a marsh, five houses, a bent lane between two thin walls, a walled garden with no gate and a long diagonal wall. Both searches go from the south-west corner to a target east of the brook. Dijkstra looks at 4,425 of the 5,341 free cells before it reaches the target. A* looks at 1,137. Both return paths of the same cost, along the road, over the bridge and round the marsh; a few cells differ where two steps cost the same.</p>
</pf-search>
<figcaption><b>fig 3</b>Pick a search and watch the cells it looks at, cheapest first. The tan band is the road, blue is the brook and its ford, the darker green patch is wood, the grey-green one marsh, and houses and walls are the solid cells.<span class="m">Both searches run on the map in your browser. The map is made up.</span></figcaption>
</figure>

Both searches return paths of the same cost; A* gets there after a quarter of the work. With a binary heap as the queue, each search costs O(n log n) for n cells looked at, and each cell checks at most 8 neighbours. Its memory is O(n): a cost and a parent per cell.

The guess is what makes A* fast, and costly ground makes the guess weak. It has to assume road all the way, or it could guess too high. On the small map open ground costs 30% more than road, so a cell off the straight line can't be ruled out until the search has spent that 30% somewhere. A* ends up looking at every cell inside an oval around the straight line. The oval gets wider as the trip gets longer, so the work grows about with the square of the distance: a trip twice as long costs about four times as much.

<figure class="wide">
<pf-oval data-fig data-label="fig 4 · the same oval, in cells and in blocks">
<p class="fallback">Two copies of a 3.2 km map with a 4 km trip across it. On the left, the oval of cells A* looks at when open ground costs 18% more than road: about 9.3 million cells. On the right, the same oval counted in 32 m blocks, about 9,071 of them, plus a strip of cells one block wide along the route, at most 128,000 cells.</p>
</pf-oval>
<figcaption><b>fig 4</b>The oval A* searches on a large map, counted two ways. Counting in blocks and then only the cells along the route is what the planner further down does.<span class="m">Computed from the oval's area, to scale; the 18% is the extra cost of open ground over road.</span></figcaption>
</figure>

That's fine on a small map. I measured it on a made-up test map of 3.2 km × 3.2 km at 1 m per cell, 10.24 million cells, with roads, fields, woods, marshes, four streams, 16 villages with 1,120 houses, 1,200 thin walls at any angle and 96 walled gardens. Over 40 random trips of 0.5 to 3.2 km, one A* over every cell took 345 ms in the median, 879 ms at the 90th percentile and 1.27 s for the longest.

## a coarser grid, and where it breaks

The quick fix is a coarser grid. Plan on 2 m squares, each marked open or closed, and there are 4 times fewer places to look at. My first planner did that, and ten of the sixteen serious bugs a review found in it came from this one choice.

Thin walls and narrow lanes don't line up with the squares. When a wall runs through a square, the free ground in it is split in two, and one bit can't say "open on this side, closed on the other". The square has to be closed, or units walk through the wall. Closing it throws away ground a unit could use, and a lane two cells wide can disappear completely.

<figure class="wide">
<pf-cases data-fig data-label="fig 5 · three cases where one bit per square fails">
<p class="fallback">Three small maps, each shown with one mark per 2 m square and then with areas and doors. (a) A thin diagonal wall through a row of squares: one mark closes them all and the ground along the wall is lost on both sides; with areas, both sides stay usable. (b) An order into a lane three cells wide between garden walls: every square the lane crosses also holds part of a yard behind a wall, so it's closed, and the planner stops in the yard on the other side of the wall; with areas, the lane is its own area, doors join it from block to block, and the unit walks the lane to the target. (c) A unit pushed into a wall's buffer of blocked cells: the cells can't tell which side it came from, so the path may go through the wall; areas don't fix this one, remembering the last free cell the unit stood on does.</p>
</pf-cases>
<figcaption><b>fig 5</b>Switch between one mark per square and areas with doors. Case (c) is the one areas don't solve.<span class="m">Hand-made patterns of 1 m cells in 4 × 4 squares.</span></figcaption>
</figure>

Each fix I tried added a special rule somewhere: at the start, to step off a closed square; at the target, to find a nearby open one; in the smoothing, to stop a straight line from cutting through a closed corner. Every review found a new wall shape that the rules missed. Fig 5's cases (a) and (b) are two of them. Case (c) is a different problem: a unit pushed into the strip of blocked cells along a wall can't tell from the cells which side it came from, and the fix there is to remember the last free cell it stood on.

## how games do it

Shipped games mostly avoid planning long trips on one flat grid. They use one of a few ideas, often two together. Most of the drawings below use the same small ground: two houses, a diagonal garden wall and a marsh (hatched). The start is a round dot and the goal a red diamond.

### tiles, and buildings drawn to fit them

Age of Empires was built on tiles<sup><a href="#src-3">3</a></sup>. Every building covers whole tiles, so a wall is a staircase of tiles and each tile is plainly open or closed. Even with tiles, Age of Empires II used more than one planner. Its postmortem says "no fewer than three separate pathfinding and two obstruction systems were developed": a high-level one "computes general routes across the world map", and lower-level ones "thread a path through a closely packed group of units"<sup><a href="#src-4">4</a></sup>. StarCraft, the first one, worked the same way, with 32 × 32 pixel build tiles split into 8 × 8 pixel walk tiles<sup><a href="#src-5">5</a></sup>.

<figure class="wide">
<pf-game data-fig data-games="aoe2" data-label="fig 6 · tiles">
<p class="fallback">A grid of 2 m tiles with two houses and a garden wall, all drawn to fill whole tiles, so the wall is a staircase. The path goes round the staircase from tile to tile.</p>
</pf-game>
<figcaption><b>fig 6</b>Buildings fill whole tiles, so each tile is plainly open or closed. The price is a blocky village.<span class="m">A drawing of the method on a small made-up ground, not the game's code.</span></figcaption>
</figure>

### triangles, and a string pulled tight

A **navigation mesh** stores the free ground as polygons, usually triangles, and searches over those. StarCraft II, according to a write-up of Blizzard's 2011 GDC talk on navigation, builds a constrained Delaunay triangulation of the free ground and rebuilds it whenever a building goes up or comes down. It runs A* over the triangles, then pulls the path tight round the corners with the funnel algorithm, like a string. Units aren't part of the mesh; they steer round each other<sup><a href="#src-6">6</a></sup>.

A mesh has very few nodes, and walls at any angle are exact. Units of different sizes need more work. Douglas Demyen and Michael Buro's TA* stores in each triangle the widest unit that can pass through it<sup><a href="#src-7">7</a></sup>, and Recast, the open-source navmesh builder used by many engines, shrinks the free ground by the unit's radius and builds one mesh per size<sup><a href="#src-8">8</a></sup>. Ground costs are harder: every edge of a marsh or a road becomes polygon edges, and a map full of roads and fields turns into a lot of small triangles.

<figure class="wide">
<pf-game data-fig data-games="sc2" data-label="fig 7 · triangles">
<p class="fallback">The free ground between two houses cut into long triangles, with the path pulled tight round the houses' corners.</p>
</pf-game>
<figcaption><b>fig 7</b>A* picks the triangles to cross, then the path is pulled tight round the corners.<span class="m">A drawing of the method on a small made-up ground, not the game's code.</span></figcaption>
</figure>

### flow fields over sectors

Supreme Commander 2 keeps a grid of 1 m cells, cut into sectors of 10 × 10. Where free cells face free cells across a sector edge it puts a **portal**. An order first runs A* over the portal graph to find which sectors to cross, then builds a **flow field** only in those sectors: a Dijkstra from the goal, then an arrow in each cell pointing downhill. Every unit in the group follows the arrows from wherever it stands<sup><a href="#src-9">9</a></sup>. Each kind of movement has its own costs and its own portal graph, and for large units the walls were made thicker so they can't fit through narrow gaps. A number per piece of connected ground answers "can it get there at all" before any search.

Age of Empires IV does the same on a 1024 × 1024 grid. Its portal graph borrows from HPA\* (below), the ground inside each tile is joined by flood fill, and the flow is made only for the tiles the A\* route goes through, in short overlapping pieces built as the units move. Making the flow for 200 horsemen took 1.11 ms<sup><a href="#src-10">10</a></sup>.

<figure class="wide">
<pf-game data-fig data-games="supcom,aoe4" data-label="fig 8 · portals and flow fields">
<p class="fallback">Left: 10 × 10 sectors with portals on their edges; the route crosses a few sectors and arrows are made only inside them. Right: the same idea where the arrows are made only for the next blocks ahead of a moving leader.</p>
</pf-game>
<figcaption><b>fig 8</b>Gold lines are sector edges with their portals, blue arrows the flow field, made only along the route. On the right the arrows follow the leader as it moves.<span class="m">A drawing of the method on a small made-up ground, not the game's code.</span></figcaption>
</figure>

### areas and regions

0 A.D., an open-source game, cuts its grid of 1 m cells into chunks of 96 × 96. Inside each chunk it flood-fills the free cells into **areas**, so a wall through a chunk gives two areas, one each side. Areas that touch across chunk edges are joined into global regions. When the target can't be reached, it moves the target to the nearest point that can. The path itself is then searched over the cells with jump point search (below), and in 0 A.D. a cell is open or closed, with no ground costs<sup><a href="#src-11">11</a></sup>.

Factorio (on chunks of 32 × 32 tiles) and OpenRA (on 10 × 10 sections, since 2022) use the same areas a different way. They search the small graph of areas first, from the goal outward, and use those distances as A*'s guess for an ordinary search over the cells<sup><a href="#src-12">12</a></sup><sup><a href="#src-13">13</a></sup>. The guess is much sharper than the octile distance, but the search goes over cells all the way. Dragon Age: Origins used sectors split into regions too, one region per connected piece of a sector, built on Nathan Sturtevant's research<sup><a href="#src-20">20</a></sup>.

<figure class="wide">
<pf-game data-fig data-games="zeroad,factorio" data-label="fig 9 · areas and regions">
<p class="fallback">Left: blocks split into areas by the diagonal wall, tinted; the path is searched cell by cell and, with no ground costs, walks straight through the marsh. Right: one gold dot per area, joined to its neighbours, shaded by how far each area is from the goal; that distance guides an ordinary cell search.</p>
</pf-game>
<figcaption><b>fig 9</b>Left, 0 A.D.: areas, and a cell search that ignores ground cost and crosses the marsh. Right, Factorio and OpenRA: the graph of areas as a guess for the cell search.<span class="m">A drawing of the method on a small made-up ground, not the game's code.</span></figcaption>
</figure>

### quadtrees

The Spring engine (now Recoil, which runs Beyond All Reason) uses a quadtree. A square is cut into four until each part holds one kind of ground, so no square is ever split by a wall. A* goes from square to square through the middle of their shared edges, which the engine's own comments say "causes local and global sub-optimalities" that smoothing "can only partially address"<sup><a href="#src-14">14</a></sup>. Its older planner kept a single point per block, which has the same weakness near walls as my coarse grid. In open fields the squares are big and there are few of them. Along a slanted wall or a curved marsh the squares shrink to single cells.

<figure class="wide">
<pf-game data-fig data-games="spring" data-label="fig 10 · a quadtree">
<p class="fallback">The small ground cut into squares of many sizes: big squares in the open, tiny ones along the houses and the diagonal wall, 275 squares for 1,440 cells.</p>
</pf-game>
<figcaption><b>fig 10</b>Count the squares round the diagonal wall.<span class="m">A drawing of the method on a small made-up ground, not the game's code.</span></figcaption>
</figure>

### one point for a whole group

Every game above plans for one point. A group follows it: Age of Empires IV gives a formation an invisible leader that follows the flow, and each unit walks to its place beside it<sup><a href="#src-10">10</a></sup>. Grand Tactician goes further on long trips: "when ordering a group to move long distances, that group's units will automatically form into march columns", and "if a road leads to the selected destination, the group will form a marching column on the road"<sup><a href="#src-21">21</a></sup>. The pathfinder still plans one route; the column is how a wide group fits through it.

<figure class="wide">
<pf-game data-fig data-games="gt" data-label="fig 11 · one route for a group">
<p class="fallback">A line of units in the open turns into a column to pass through a gap between two houses, then spreads out again.</p>
</pf-game>
<figcaption><b>fig 11</b>A wide group narrows to a column to follow one route through a gap.<span class="m">A drawing of the method on a small made-up ground, not the game's code.</span></figcaption>
</figure>

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

My planner is closest to Supreme Commander 2 and 0 A.D. together, and its core is HPA\*, "near optimal hierarchical path-finding", which Adi Botea, Martin Müller and Jonathan Schaeffer published in 2004<sup><a href="#src-19">19</a></sup>. It keeps the 1 m cells, which are exact, and never plans long trips on them. Fig 12 shows the whole idea on four blocks: doors on the block edges, links between the doors of one block, START and TARGET added for one order, and the shortest path over that small graph.

<figure class="wide">
<pf-idea data-fig data-label="fig 12 · a graph of doors">
<p class="fallback">Four blocks of 12 m with a long wall. The wall cuts blocks 1 to 3 in two, so each has two areas; in block 4 the wall stops short of the top, so block 4 is one area. Doors sit where free cells face free cells across a block edge. Links join the doors inside each block that can walk to each other, and none crosses the wall. START, below the wall, links to the doors of its own area; TARGET, above it, to its own. The shortest chain goes along the bottom into block 4, round the end of the wall, and back. With the wall reaching the top edge, START and TARGET are in different regions and the unit goes to the nearest point it can reach.</p>
</pf-idea>
<figcaption><b>fig 12</b>Step through the six stages. Tick the box to make the wall reach the top edge, and the target can't be reached.<span class="m">A real small grid: the areas, doors, links and the route are computed.</span></figcaption>
</figure>

Two things differ from the HPA\* paper. Doors are joined only within an area, so a wall through a block never needs special handling. And a door is also placed wherever the ground cost changes along an edge, so every road that crosses a block edge gets a door on the road.

### prepare, once per map

My maps don't change during play, so each map is prepared once when it loads. Units of different sizes get their own cells, with the walls widened by the unit's radius, and their own doors, like the per-movement-type portal graphs in Supreme Commander 2 and the per-size meshes in Recast.

1. **Regions**: one flood fill over all the free cells of the map. Cells that touch get the same number.
2. **Areas**: the same flood fill inside each block, as if the block's edges were walls.
3. **Doors**: walk along every edge between two blocks. A run of free cells facing free cells is an opening. It ends at a blocked cell, at a change of area on either side, or at a change of ground cost on either side. Each opening gets one door in its middle.
4. **Links**: inside each block, a Dijkstra from each door over that block's cells only. Every other door it reaches gets a link with that walk's cost. Each door's two nodes are also linked, with the cost of one step.

A link that would need to leave its block to be cheap isn't that link's job. That cheaper way is a chain of other links through the next block, and the route search finds it there. And a door behind a wall is never reached by a Dijkstra that starts on the other side, so no link ever crosses a wall.

Regions and areas cost O(n) for n cells. The links cost one Dijkstra per door over one block of k² cells: with d doors per block, that's O(n · d · log k) in all. On the big map that was 69 million cell visits.

### plan, each order

1. **Can it get there?** If the target is blocked, or its region isn't the start's, move the target to the nearest free cell in the start's region, searching outward from the target. 0 A.D. does the same<sup><a href="#src-11">11</a></sup>. When the target can't be reached, the planner knows in one lookup, without searching the map.
2. **Join the start and the target to the graph.** A Dijkstra from the start inside its block finds the doors of its own area and what each costs to reach. The same from the target. These two nodes exist for this order only.
3. **The route**: A* over the doors, from START to TARGET, with the octile guess.
4. **The steps**: for each link of the route, an exact A* over cells from one door to the next, inside that one block. Crossing a door is one step.
5. **Straighten**: walk the steps and skip points while the straight line to a later point is clear on the cells and costs at most 5% more than the steps it replaces. The 5% keeps a path on a road that bends round a marsh.

<figure class="wide">
<pf-lab data-fig data-label="fig 13 · the planner on a village">
<p class="fallback">A 160 × 100 m village with a brook, a ford, a bridge, a marsh, a bent lane and a walled garden, in 10 m blocks. Each order is planned with blocks, areas and doors (red), with a coarse planner that keeps one mark per 4 m square (violet dashes), and with one exact A* over every cell (in the numbers). Into the bent lane: the new planner looks at 168 doors and 726 cells against 1,863 cells for exact A*, and its path is 2.7% longer than the best; the coarse planner stops 6 m from the target, behind a wall. Into the walled garden: the target is in another region, so one check says no path exists and the unit goes to the nearest point it can reach.</p>
</pf-lab>
<figcaption><b>fig 13</b>Pick a case, or click the map: the first click sets the start, the second the target. The bar along the bottom lights up each of the five steps as the plan replays.<span class="m">The village has 16,000 cells, so the numbers show how the planner works, not how fast it is on a big map.</span></figcaption>
</figure>

The route search looks at doors, a few per block, so it's fast at any distance. The step searches look only at cells in the blocks along the route, one block at a time: about the length of the trip times the block's side, the strip in fig 4, instead of an oval of the whole map.

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

The planner was 46 times faster in the median and 18 times faster on the slowest tenth of trips. It agreed with the exact search on whether a path exists for all 40 trips.

<figure class="wide">
<pf-bars data-fig data-label="fig 14 · time per order">
<p class="fallback">On a log scale: A* over every cell, 345 ms per order in the median; blocks, areas and doors on the same orders, 8 ms; a target it can't reach, 0.02 ms, one region check and no search.</p>
</pf-bars>
<figcaption><b>fig 14</b>Time per order on the 3.2 km test map. Hover a bar for the numbers.<span class="m">Measured on a busy machine, both planners back to back; the scale is logarithmic.</span></figcaption>
</figure> Doubling the map's side from 1.6 to 3.2 km made the exact search 4.6 times slower and the new planner 2.2 times slower.

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
<li id="src-21"><a href="https://cdn.cloudflare.steamstatic.com/steam/apps/654890/manuals/Grand_Tactician_Manual.pdf">Grand Tactician: The Civil War manual, movement of the units</a></li>
</ol>
</details>
