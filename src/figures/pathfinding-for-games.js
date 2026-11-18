// Pathfinding for games: one small costed map, the searches on it, how games cut
// it up, and the block / area / door planner, all computed live in the browser.
import { S, H, attr, clamp, pills, stepper, wrap, Figure, define, STILL, REDUCED } from './core.js'

// ── the map: 96 × 60 cells, cost per cell (0 = blocked), kind per cell for drawing ──
const W = 96, HH = 60, N = W * HH, B = 12, BW = W / B, BH = HH / B
const ROAD = 10, OPEN = 13, WOOD = 22, FORD = 26, MARSH = 30
const PX = 6, X0 = 12, Y0 = 8, MAPH = HH * PX
const KIND = { 1: 'road', 3: 'wood', 4: 'marsh', 5: 'water', 6: 'ford', 7: 'house', 8: 'wall' }
const cellAt = (x, y) => y * W + x

function ground() {
  const cost = new Uint8Array(N).fill(OPEN), kind = new Uint8Array(N)
  const set = (x, y, c, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < HH) { cost[y * W + x] = c; kind[y * W + x] = k } }
  const oval = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1
  for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
    if (oval(x, y, 84, 13, 9, 6)) set(x, y, WOOD, 3)
    if (oval(x, y, 80, 49, 10, 7)) set(x, y, MARSH, 4)
  }
  // a brook two cells wide, with a ford in the north
  for (let y = 0; y < HH; y++) {
    const cx = Math.round(66 + 3 * Math.sin(y / 9))
    for (let x = cx; x <= cx + 1; x++) if (y >= 7 && y <= 10) set(x, y, FORD, 6); else set(x, y, 0, 5)
  }
  // a road three cells wide; it crosses the brook on a bridge
  const road = [[0, 41], [28, 39], [50, 31], [70, 34], [96, 31]]
  for (let i = 0; i + 1 < road.length; i++) {
    const [ax, ay] = road[i], [bx, by] = road[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2)
    for (let k = 0; k <= n; k++) for (let d = -1; d <= 1; d++) set(ax + (bx - ax) * k / n, ay + (by - ay) * k / n + d, ROAD, 1)
  }
  // houses: rotated boxes (centre, half sizes, angle)
  for (const [hx, hy, a, b, r] of [[14, 50, 4, 2.5, .3], [27, 53, 3.5, 3, -.3], [39, 47, 3, 2.5, .5], [47, 55, 4, 2.5, .1], [57, 45, 3, 2, -.4]])
    for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
      const dx = x + .5 - hx, dy = y + .5 - hy, c = Math.cos(r), s = Math.sin(r)
      if (Math.abs(dx * c + dy * s) <= a && Math.abs(-dx * s + dy * c) <= b) set(x, y, 0, 7)
    }
  // thin walls, one cell thick
  const line = (ax, ay, bx, by) => {
    let x = ax, y = ay; const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1
    for (let e = dx + dy; ;) { set(x, y, 0, 8); if (x === bx && y === by) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x += sx } if (e2 <= dx) { e += dx; y += sy } }
  }
  line(30, 36, 30, 14); line(33, 36, 33, 17); line(30, 14, 46, 14); line(33, 17, 46, 17); line(46, 14, 46, 17) // a bent lane
  line(50, 5, 60, 5); line(60, 5, 60, 14); line(60, 14, 50, 14); line(50, 14, 50, 5)                    // a garden with no gate
  line(4, 32, 22, 10)                                                                                    // a long diagonal wall
  return { cost, kind }
}
const G0 = ground(), C = G0.cost, FREE = C.reduce((s, c) => s + (c ? 1 : 0), 0)

// ── moves and searches ──
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1]
// f(next, stepCost) for each legal 8-neighbour; a diagonal step needs both cells beside it free
function eachStep(cs, i, f) {
  const x = i % W, y = (i / W) | 0, ci = cs[i]
  for (let d = 0; d < 8; d++) {
    const nx = x + DX[d], ny = y + DY[d]
    if (nx < 0 || ny < 0 || nx >= W || ny >= HH) continue
    const j = ny * W + nx, cj = cs[j]
    if (!cj || (d >= 4 && (!cs[y * W + nx] || !cs[ny * W + x]))) continue
    f(j, (ci + cj) * (d >= 4 ? 141 : 100))
  }
}
const blockOf = (i) => ((((i / W) | 0) / B) | 0) * BW + (((i % W) / B) | 0)
// the guess: octile distance at the cheapest ground cost, so it never guesses too high
const octile = (a, b) => { const dx = Math.abs(a % W - b % W), dy = Math.abs(((a / W) | 0) - ((b / W) | 0)); return ROAD * (200 * Math.max(dx, dy) + 82 * Math.min(dx, dy)) }

class Heap { // min-heap, ties broken by insertion order so every search is deterministic
  constructor() { this.a = []; this.n = 0 }
  less(p, q) { return p[0] < q[0] || (p[0] === q[0] && p[2] < q[2]) }
  push(k, v) {
    const a = this.a; let i = a.length; a.push([k, v, this.n++])
    while (i > 0) { const p = (i - 1) >> 1; if (!this.less(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop()
    if (a.length) {
      a[0] = last; let i = 0
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && this.less(a[l], a[m])) m = l; if (r < a.length && this.less(a[r], a[m])) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m }
    }
    return top[1]
  }
  get size() { return this.a.length }
}

const g = new Float64Array(N), par = new Int32Array(N), seen = new Uint32Array(N), done = new Uint32Array(N)
let gen = 0
// A* from s to t (Dijkstra when useH is false or t < 0), optionally inside one block.
// Afterwards g[c] holds the cost to every cell c with done[c] === gen.
function search(cs, s, t, blk = -1, useH = true) {
  gen++; const h = new Heap(), order = []
  g[s] = 0; seen[s] = gen; par[s] = -1; h.push(0, s)
  while (h.size) {
    const c = h.pop(); if (done[c] === gen) continue
    done[c] = gen; order.push(c); if (c === t) break
    eachStep(cs, c, (j, w) => {
      if (blk >= 0 && blockOf(j) !== blk) return
      const nd = g[c] + w
      if (seen[j] !== gen || nd < g[j]) { seen[j] = gen; g[j] = nd; par[j] = c; h.push(nd + (useH && t >= 0 ? octile(j, t) : 0), j) }
    })
  }
  const ok = t >= 0 && done[t] === gen, path = []
  if (ok) for (let c = t; c !== -1; c = par[c]) path.push(c)
  return { path: path.reverse(), cost: ok ? g[t] : Infinity, order }
}

// connected components with 4 neighbours, map-wide or inside each block
function label(sameBlock) {
  const lab = new Int32Array(N).fill(-1); let n = 0
  for (let i = 0; i < N; i++) {
    if (!C[i] || lab[i] >= 0) continue
    const st = [i]; lab[i] = n; const b = blockOf(i)
    while (st.length) {
      const c = st.pop(), x = c % W, y = (c / W) | 0
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= W || ny >= HH) continue
        const j = ny * W + nx
        if (C[j] && lab[j] < 0 && (!sameBlock || blockOf(j) === b)) { lab[j] = n; st.push(j) }
      }
    }
    n++
  }
  return { lab, n }
}

// ── prepare: regions, areas, doors (two nodes each), links inside every block ──
const PREP = {}
// a shade per area such that areas that touch never share one (greedy over the adjacency)
function shades(area, n) {
  const adj = Array.from({ length: n }, () => new Set())
  for (let i = 0; i < N; i++) if (C[i]) for (const j of [i + 1, i + W]) if (j < N && (j !== i + 1 || j % W) && C[j] && area[j] !== area[i]) { adj[area[i]].add(area[j]); adj[area[j]].add(area[i]) }
  const col = new Int8Array(n).fill(-1)
  for (let a = 0; a < n; a++) { let c = 0; while ([...adj[a]].some((b) => col[b] === c)) c++; col[a] = c }
  return col
}
function prepare(splitAtCost) {
  if (PREP[splitAtCost]) return PREP[splitAtCost]
  const region = label(false), area = label(true), nodes = [], opens = []
  const scan = (A, Z) => {
    let run = []
    const flush = () => { if (!run.length) return; opens.push([A[run[0]], A[run.at(-1)], Z[run[0]]]); const k = run[run.length >> 1]; nodes.push(A[k], Z[k]); run = [] }
    for (let k = 0; k < B; k++) {
      const a = A[k], z = Z[k]
      if (!C[a] || !C[z]) { flush(); continue }
      if (run.length) {
        const p = run.at(-1)
        if (area.lab[a] !== area.lab[A[p]] || area.lab[z] !== area.lab[Z[p]] || (splitAtCost && (C[a] !== C[A[p]] || C[z] !== C[Z[p]]))) flush()
      }
      run.push(k)
    }
    flush()
  }
  for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
    if (bx + 1 < BW) { const x = bx * B + B - 1, A = [], Z = []; for (let k = 0; k < B; k++) { A.push(cellAt(x, by * B + k)); Z.push(cellAt(x + 1, by * B + k)) } scan(A, Z) }
    if (by + 1 < BH) { const y = by * B + B - 1, A = [], Z = []; for (let k = 0; k < B; k++) { A.push(cellAt(bx * B + k, y)); Z.push(cellAt(bx * B + k, y + 1)) } scan(A, Z) }
  }
  const M = nodes.length, adj = nodes.map(() => []), byBlock = Array.from({ length: BW * BH }, () => []), links = []
  nodes.forEach((c, n) => byBlock[blockOf(c)].push(n))
  byBlock.forEach((ns, b) => ns.forEach((p, i) => {
    search(C, nodes[p], -1, b, false)
    for (const q of ns.slice(i + 1)) if (done[nodes[q]] === gen) { const w = g[nodes[q]]; adj[p].push([q, w]); adj[q].push([p, w]); links.push([p, q]) }
  }))
  for (let n = 0; n < M; n += 2) { const w = (C[nodes[n]] + C[nodes[n + 1]]) * 100; adj[n].push([n + 1, w]); adj[n + 1].push([n, w]) }
  return PREP[splitAtCost] = { region: region.lab, regions: region.n, area: area.lab, areas: area.n, shade: shades(area.lab, area.n), nodes, adj, byBlock, links, opens }
}

// the nearest free cell in region r, searching outward from cell t
function nearest(P, t, r) {
  const seenN = new Uint8Array(N), q = [t]; seenN[t] = 1
  for (let h = 0; h < q.length; h++) {
    const c = q[h]; if (C[c] && P.region[c] === r) return c
    const x = c % W, y = (c / W) | 0
    for (let d = 0; d < 8; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < W && ny < HH && !seenN[ny * W + nx]) { seenN[ny * W + nx] = 1; q.push(ny * W + nx) } }
  }
  return -1
}

// straightening: the cells a straight leg crosses, and its cost by their mean cost (-1 if blocked or cutting a corner)
function sight(a, b) {
  let x = a % W, y = (a / W) | 0; const dx = b % W - x, dy = ((b / W) | 0) - y, sx = Math.sign(dx), sy = Math.sign(dy), ax = Math.abs(dx), ay = Math.abs(dy)
  let ix = 0, iy = 0, sum = C[a], n = 1
  while (ix < ax || iy < ay) {
    const l = (1 + 2 * ix) * ay, r = (1 + 2 * iy) * ax
    if (l === r) { if (!C[y * W + x + sx] || !C[(y + sy) * W + x]) return -1; x += sx; y += sy; ix++; iy++ } else if (l < r) { x += sx; ix++ } else { y += sy; iy++ }
    const c = C[y * W + x]; if (!c) return -1; sum += c; n++
  }
  return Math.hypot(dx, dy) * (sum / n) * 200
}
const stepCost = (a, b) => (C[a] + C[b]) * (a % W !== b % W && ((a / W) | 0) !== ((b / W) | 0) ? 141 : 100)
// keep the farthest point ahead whose straight leg is clear and costs at most 5 % more than the steps it replaces
function straighten(cells) {
  const cum = [0]; for (let k = 1; k < cells.length; k++) cum.push(cum[k - 1] + stepCost(cells[k - 1], cells[k]))
  const pts = [cells[0]]; let i = 0, total = 0
  while (i < cells.length - 1) {
    let best = i + 1, bc = cum[i + 1] - cum[i]
    for (let j = cells.length - 1; j > i + 1; j--) { const lc = sight(cells[i], cells[j]); if (lc >= 0 && lc <= 1.05 * (cum[j] - cum[i])) { best = j; bc = lc; break } }
    total += bc; i = best; pts.push(cells[i])
  }
  return { pts, cost: total }
}

// the whole plan, keeping what each step did so the figure can show it
function plan(P, s, t0) {
  const out = { s, t0, t: t0 }
  if (!C[t0] || P.region[t0] !== P.region[s]) { out.t = nearest(P, t0, P.region[s]); out.moved = true }
  const t = out.t, M = P.nodes.length, SN = M, TN = M + 1, sb = blockOf(s), tb = blockOf(t)
  search(C, s, -1, sb, false)
  out.sl = P.byBlock[sb].filter((n) => done[P.nodes[n]] === gen).map((n) => [n, g[P.nodes[n]]])
  const direct = tb === sb && done[t] === gen ? g[t] : Infinity
  search(C, t, -1, tb, false)
  out.tl = P.byBlock[tb].filter((n) => done[P.nodes[n]] === gen).map((n) => [n, g[P.nodes[n]]])
  const tCost = new Map(out.tl)
  // the route: A* over the doors, START and TARGET added for this order only
  const cellOf = (n) => n === SN ? s : n === TN ? t : P.nodes[n]
  const gg = new Map([[SN, 0]]), pp = new Map([[SN, -1]]), closed = new Set(), h = new Heap()
  h.push(octile(s, t), SN); out.looked = []
  const relax = (u, v, w) => { const nd = gg.get(u) + w; if (!gg.has(v) || nd < gg.get(v)) { gg.set(v, nd); pp.set(v, u); h.push(nd + octile(cellOf(v), t), v) } }
  while (h.size) {
    const u = h.pop(); if (closed.has(u)) continue
    closed.add(u); if (u === TN) break
    if (u !== SN) out.looked.push(u)
    if (u === SN) { out.sl.forEach(([n, w]) => relax(SN, n, w)); if (direct < Infinity) relax(SN, TN, direct); continue }
    P.adj[u].forEach(([v, w]) => relax(u, v, w))
    if (tCost.has(u)) relax(u, TN, tCost.get(u))
  }
  const route = []; for (let u = TN; u !== -1 && u !== undefined; u = pp.get(u)) route.push(cellOf(u))
  out.route = route.reverse()
  // the steps: an exact cell search for each link, inside that link's one block
  out.cells = [s]; out.stepLooked = []
  for (let k = 0; k + 1 < out.route.length; k++) {
    const a = out.route[k], b = out.route[k + 1]
    if (blockOf(a) !== blockOf(b)) { out.cells.push(b); continue }
    const q = search(C, a, b, blockOf(a), true); out.stepLooked.push(...q.order); out.cells.push(...q.path.slice(1))
  }
  out.stepsCost = out.cells.reduce((sum, c, k) => k ? sum + stepCost(out.cells[k - 1], c) : 0, 0)
  out.straight = straighten(out.cells)
  out.exact = search(C, s, t, -1, true)
  return out
}

// ── drawing ──
const px = (i) => X0 + (i % W) * PX + PX / 2, py = (i) => Y0 + ((i / W) | 0) * PX + PX / 2
const sq = (i, inset = 0) => `M${X0 + (i % W) * PX + inset} ${Y0 + ((i / W) | 0) * PX + inset}h${PX - 2 * inset}v${PX - 2 * inset}h${2 * inset - PX}z`
const cellsD = (list) => list.map((i) => sq(i)).join('')
const polyD = (cells) => cells.length ? 'M' + cells.map((c) => `${px(c)} ${py(c)}`).join('L') : ''
const fmtN = (n) => Math.round(n).toLocaleString('en-US')
// '3.1 % more than' / '1.5 % less than' / 'the same as'
const pctOf = (a, b) => { if (!b) return 'the same as'; const d = (a / b - 1) * 100; return Math.abs(d) < .05 ? 'the same as' : d > 0 ? `${d.toFixed(1)} % more than` : `${(-d).toFixed(1)} % less than` }
const metres = (c) => (c / (OPEN * 200)).toFixed(0) // a cost in "metres of open ground"

// the ground, one path per kind of cell (runs merged along each row)
function base(svg) {
  const runs = {}
  for (let y = 0; y < HH; y++) for (let x = 0; x < W;) {
    const k = G0.kind[y * W + x]; let e = x + 1; while (e < W && G0.kind[y * W + e] === k) e++
    if (k) (runs[k] = runs[k] || []).push(`M${X0 + x * PX} ${Y0 + y * PX}h${(e - x) * PX}v${PX}h${-(e - x) * PX}z`)
    x = e
  }
  S('rect', { x: X0, y: Y0, width: W * PX, height: MAPH, class: 'f-none s-rule' }, svg)
  const g0 = S('g', {}, svg)
  for (const k in runs) S('path', { d: runs[k].join(''), class: 'pf-' + KIND[k] }, g0)
  return g0
}
function marks(svg) {
  const s = S('circle', { r: 4.5, class: 'f-ink' }, svg), t = S('path', { class: 'f-bg s-ink', 'stroke-width': 2 }, svg)
  return (a, b) => {
    attr(s, { cx: px(a), cy: py(a) })
    attr(t, { d: `M${px(b)} ${py(b) - 6}l6 6l-6 6l-6-6z` })
  }
}
const textRows = (svg, y, n) => Array.from({ length: n }, (_, i) => S('text', { x: X0, y: y + i * 17, class: 't2', 'font-size': 12.5 }, svg))
const say = (rows, text) => { const r = wrap(text, 75); rows.forEach((t, j) => { t.textContent = r[j] || '' }) }
// map coordinates of a click, or -1
function cellFromEvent(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY
  const q = p.matrixTransform(svg.getScreenCTM().inverse()), x = Math.floor((q.x - X0) / PX), y = Math.floor((q.y - Y0) / PX)
  return x >= 0 && y >= 0 && x < W && y < HH ? y * W + x : -1
}

const START = cellAt(5, 52), FAR = cellAt(90, 24), LANE = cellAt(44, 15), GARDEN = cellAt(55, 9), SOUTH = cellAt(20, 44)

// ── fig 1: Dijkstra and A* spreading over the map ──
class PfSearch extends Figure {
  constructor() { super(); this.duration = 7; this.poster = 7 }
  build() {
    const svg = this.svgRoot(600, MAPH + 70, 'Dijkstra and A* searching the map from the south-west corner to a target east of the brook')
    base(svg)
    this.vis = S('g', { class: 'f-green', opacity: .3 }, svg)
    this.line = S('path', { class: 'f-none s-green', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, svg)
    marks(svg)(START, FAR)
    this.rows = textRows(svg, MAPH + Y0 + 20, 3)
    this.mode = 'astar'
    pills(this, [['dijkstra', 'Dijkstra'], ['astar', 'A*']], 'astar', (v) => { this.mode = v; this.load(); if (STILL || REDUCED) this.seek(this.duration); else { this.seek(0); this.play() } })
    this.load()
  }
  load() {
    const r = search(C, START, FAR, -1, this.mode === 'astar')
    this.vis.replaceChildren(); this.chunks = []
    for (let k = 0; k < r.order.length; k += 120) { const d = cellsD(r.order.slice(k, k + 120)); this.chunks.push([S('path', { d }, this.vis), d]) }
    this.r = r; this.line.setAttribute('d', polyD(r.path))
  }
  label(t) { return `${fmtN(this.shown || 0)} cells` }
  render(t) {
    if (!this.r) return
    const n = this.r.order.length, k = Math.round(clamp(t / (this.duration - 1)) * n)
    // every chunk is set from k alone, so any frame draws the same whatever came before
    this.chunks.forEach(([p, full], i) => {
      const a = i * 120, want = k >= a + 120 || k >= n ? 'full' : k > a ? 'part' : 'none'
      p.style.display = want === 'none' ? 'none' : ''
      if (want === 'full' && p._k !== 'full') { p.setAttribute('d', full); p._k = 'full' }
      if (want === 'part' && p._k !== k) { p.setAttribute('d', cellsD(this.r.order.slice(a, k))); p._k = k }
    })
    this.shown = k
    this.line.style.display = k >= n ? '' : 'none'
    const name = this.mode === 'astar' ? 'A*' : 'Dijkstra'
    say(this.rows, k >= n
      ? `${name} looked at ${fmtN(n)} of the ${fmtN(FREE)} free cells. The path costs as much as ${metres(this.r.cost)} m of open ground; it takes the road, the bridge and goes round the marsh.`
      : `${name}: ${fmtN(k)} cells looked at so far, cheapest first${this.mode === 'astar' ? ', each ranked by its cost so far plus a guess of the cost left' : ''}.`)
  }
}

// ── fig 2: one open/closed bit per 2 × 2 square loses the lane ──
const COARSE = (() => {
  const cs = C.slice()
  for (let y = 0; y < HH; y += 2) for (let x = 0; x < W; x += 2) {
    const q = [cellAt(x, y), cellAt(x + 1, y), cellAt(x, y + 1), cellAt(x + 1, y + 1)]
    if (q.some((c) => !C[c])) q.forEach((c) => { cs[c] = 0 })
  }
  return cs
})()
class PfCoarse extends Figure {
  build() {
    const svg = this.svgRoot(600, MAPH + 70, 'The map planned on 1 m cells and on 2 m squares with one open or closed bit each')
    base(svg)
    this.lost = S('path', { class: 'f-ochre', opacity: .55 }, svg)
    this.vis = S('path', { class: 'f-green', opacity: .25 }, svg)
    this.line = S('path', { class: 'f-none s-green', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, svg)
    marks(svg)(SOUTH, LANE)
    this.rows = textRows(svg, MAPH + Y0 + 20, 3)
    const lost = []; for (let i = 0; i < N; i++) if (C[i] && !COARSE[i]) lost.push(i)
    this.lostD = cellsD(lost); this.lostN = lost.length
    pills(this, [['fine', '1 m cells'], ['coarse', '2 m squares, one bit each']], 'fine', (v) => this.show(v))
    this.show('fine')
  }
  show(v) {
    const coarse = v === 'coarse', r = search(coarse ? COARSE : C, SOUTH, LANE, -1, true)
    this.lost.setAttribute('d', coarse ? this.lostD : '')
    this.vis.setAttribute('d', cellsD(r.order)); this.line.setAttribute('d', polyD(r.path))
    say(this.rows, coarse
      ? `A square holding any wall cell is closed: ${fmtN(this.lostN)} free cells are lost (ochre), the whole lane among them. The target sits in a closed square, so there is no path. ${fmtN(r.order.length)} cells looked at.`
      : `On 1 m cells the lane is two cells wide and open: the path goes up the lane to its end, costing ${metres(r.cost)} m of open ground. ${fmtN(r.order.length)} cells looked at.`)
  }
}

// ── fig 3: four ways games cut the same map ──
function quads(x, y, w, h, out) {
  const k0 = C[cellAt(x, y)] ? G0.kind[cellAt(x, y)] : 99 // all blocked counts as one kind
  let same = true
  for (let j = y; j < y + h && same; j++) for (let i = x; i < x + w; i++) { const c = cellAt(i, j); if ((C[c] ? G0.kind[c] : 99) !== k0) { same = false; break } }
  if (same || (w === 1 && h === 1)) return out.push([x, y, w, h])
  const w1 = Math.ceil(w / 2), h1 = Math.ceil(h / 2)
  for (const [a, b, c, d] of [[x, y, w1, h1], [x + w1, y, w - w1, h1], [x, y + h1, w1, h - h1], [x + w1, y + h1, w - w1, h - h1]]) if (c > 0 && d > 0) quads(a, b, c, d, out)
}
class PfGames extends Figure {
  build() {
    const svg = this.svgRoot(600, MAPH + 88, 'Four ways games cut up the same map')
    base(svg)
    this.layer = S('g', {}, svg)
    this.rows = textRows(svg, MAPH + Y0 + 20, 4)
    this.mark = marks(svg)
    pills(this, [['tiles', 'tiles'], ['quad', 'quadtree'], ['flow', 'flow field'], ['areas', 'areas and regions']], 'tiles', (v) => this.show(v))
    this.show('tiles')
  }
  show(v) {
    const L = this.layer; L.replaceChildren(); this.mark(SOUTH, FAR)
    if (v === 'tiles') {
      const d = []; let shut = 0, lost = 0
      for (let y = 0; y < HH; y += 4) for (let x = 0; x < W; x += 4) {
        const q = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) q.push(cellAt(x + i, y + j))
        if (q.some((c) => !C[c])) { shut++; lost += q.filter((c) => C[c]).length; d.push(`M${X0 + x * PX} ${Y0 + y * PX}h${4 * PX}v${4 * PX}h${-4 * PX}z`) }
      }
      S('path', { d: d.join(''), class: 'f-ink3', opacity: .45 }, L)
      say(this.rows, `Tiles of 4 × 4 cells, each open or closed: ${shut} of ${(W / 4) * (HH / 4)} tiles are closed, and ${fmtN(lost)} free cells go with them. Games built on tiles draw their houses and walls to fill whole tiles, so nothing is lost.`)
    } else if (v === 'quad') {
      const out = []; for (let y = 0; y < HH; y += 12) for (let x = 0; x < W; x += 12) quads(x, y, 12, 12, out)
      S('path', { d: out.map(([x, y, w, h]) => `M${X0 + x * PX} ${Y0 + y * PX}h${w * PX}v${h * PX}h${-w * PX}z`).join(''), class: 'f-none s-ink3', 'stroke-width': .6 }, L)
      say(this.rows, `A quadtree splits each 12 × 12 square into four until every part is one kind of ground: ${fmtN(out.length)} squares. Open fields stay big; every slanted wall and every edge of the marsh is cut down to single cells.`)
    } else if (v === 'flow') {
      search(C, FAR, -1, -1, false)
      const d = []
      for (let y = 1; y < HH; y += 3) for (let x = 1; x < W; x += 3) {
        const c = cellAt(x, y); if (done[c] !== gen || c === FAR) continue
        let best = -1, bv = g[c]; eachStep(C, c, (j) => { if (done[j] === gen && g[j] < bv) { bv = g[j]; best = j } })
        if (best < 0) continue
        const ux = (best % W) - x, uy = ((best / W) | 0) - y, l = Math.hypot(ux, uy), ax = px(c), ay = py(c), bx = ax + ux / l * 7, by = ay + uy / l * 7
        d.push(`M${ax - ux / l * 3} ${ay - uy / l * 3}L${bx} ${by}`, `M${bx - ux / l * 3 - uy / l * 2} ${by - uy / l * 3 + ux / l * 2}L${bx} ${by}L${bx - ux / l * 3 + uy / l * 2} ${by - uy / l * 3 - ux / l * 2}`)
      }
      S('path', { d: d.join(''), class: 'f-none s-green', 'stroke-width': 1.1 }, L)
      say(this.rows, `A flow field: one Dijkstra from the target over every cell, then each cell points to its cheapest neighbour. Any number of units can follow it from anywhere. One in nine arrows drawn; the garden gets none.`)
    } else {
      const P = prepare(true), d = [[], [], [], []], garden = []
      for (let i = 0; i < N; i++) if (C[i]) (P.region[i] !== P.region[START] ? garden : d[P.shade[P.area[i]]]).push(sq(i))
      d.forEach((x, k) => S('path', { d: x.join(''), class: 'f-green', opacity: .08 + .1 * k }, L))
      S('path', { d: garden.join(''), class: 'f-ochre', opacity: .6 }, L)
      grid(L)
      say(this.rows, `Each 12 × 12 block is split into areas, the ground you can walk all over without leaving the block: ${P.areas} areas in ${BW * BH} blocks. Joined across block edges they make ${P.regions} regions; the garden (ochre) is its own, so "can't get there" is one lookup.`)
    }
  }
}
function grid(L) {
  const d = []; for (let x = 1; x < BW; x++) d.push(`M${X0 + x * B * PX} ${Y0}v${MAPH}`); for (let y = 1; y < BH; y++) d.push(`M${X0} ${Y0 + y * B * PX}h${W * PX}`)
  S('path', { d: d.join(''), class: 'f-none s-ink3', 'stroke-width': .8, 'stroke-dasharray': '3 3' }, L)
}
const doorsD = (P, half = 2.2) => P.nodes.map((c) => `M${px(c) - half} ${py(c) - half}h${2 * half}v${2 * half}h${-2 * half}z`).join('')

// ── fig 4: prepare, one stage at a time ──
class PfPrepare extends Figure {
  build() {
    const svg = this.svgRoot(600, MAPH + 88, 'Preparing the map: regions, blocks and areas, doors, links')
    base(svg)
    this.layer = S('g', {}, svg)
    this.rows = textRows(svg, MAPH + Y0 + 20, 4)
    this.idleText = 'interactive'
    this.step = stepper(this, (i) => this.show(i))
    this.step.set(5, 0)
  }
  show(i) {
    const L = this.layer, P = prepare(true); L.replaceChildren()
    if (i === 0) return say(this.rows, `The input: ${fmtN(N)} cells, ${fmtN(FREE)} of them free. Each free cell has a cost: road 10, open ground 13, wood 22, ford 26, marsh 30. A diagonal step needs both cells beside it free, so no one squeezes between two wall cells.`)
    if (i === 1) {
      const d = []; for (let c = 0; c < N; c++) if (C[c] && P.region[c] !== P.region[START]) d.push(sq(c))
      S('path', { d: d.join(''), class: 'f-ochre', opacity: .6 }, L)
      return say(this.rows, `1. Regions: one flood fill over the whole map. Cells that touch get the same number. There are ${P.regions}; the walled garden (ochre) has no gate, so it is a region of its own and no order from outside can reach it.`)
    }
    grid(L)
    if (i === 2) {
      const d = [[], [], [], []], split = new Set()
      for (let c = 0; c < N; c++) if (C[c]) d[P.shade[P.area[c]]].push(sq(c))
      d.forEach((x, k) => S('path', { d: x.join(''), class: 'f-green', opacity: .08 + .1 * k }, L))
      P.byBlock.forEach((_, b) => { const seenA = new Set(); for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) { const c = cellAt((b % BW) * B + x, ((b / BW) | 0) * B + y); if (C[c]) seenA.add(P.area[c]) } if (seenA.size > 1) split.add(b) })
      S('path', { d: [...split].map((b) => `M${X0 + (b % BW) * B * PX} ${Y0 + ((b / BW) | 0) * B * PX}h${B * PX}v${B * PX}h${-B * PX}z`).join(''), class: 'f-none s-ochre', 'stroke-width': 1.6 }, L)
      return say(this.rows, `2. Blocks and areas: the map is cut into 12 × 12 blocks, and each block is flood-filled on its own, as if its edges were walls. ${P.areas} areas in ${BW * BH} blocks; the ${split.size} outlined blocks hold more than one, because a wall, a house or the brook cuts them.`)
    }
    if (i === 3) {
      S('path', { d: P.opens.map(([a, b, z]) => { const v = z - a === 1; const mx = (px(a) + px(z)) / 2, my = (py(a) + py(z)) / 2; return v ? `M${mx} ${my - PX / 2}V${py(b) + PX / 2}` : `M${mx - PX / 2} ${my}H${px(b) + PX / 2}` }).join(''), class: 'f-none s-ochre', 'stroke-width': 3, opacity: .8 }, L)
      S('path', { d: doorsD(P), class: 'f-ink' }, L)
      return say(this.rows, `3. Doors: along every block edge, a run of free cells facing free cells is an opening (ochre). It ends at a blocked cell, a change of area, or a change of ground cost. Each opening gets one door in its middle: ${P.nodes.length / 2} doors, two nodes each.`)
    }
    S('path', { d: P.links.map(([p, q]) => `M${px(P.nodes[p])} ${py(P.nodes[p])}L${px(P.nodes[q])} ${py(P.nodes[q])}`).join(''), class: 'f-none s-green', 'stroke-width': .8, opacity: .8 }, L)
    S('path', { d: doorsD(P), class: 'f-ink' }, L)
    say(this.rows, `4. Links: inside each block, a Dijkstra from every door over that block's cells only; each other door it reaches gets a link with the cost of that walk. A door behind a wall is never reached, so no link crosses a wall. ${fmtN(P.links.length)} links, drawn straight here.`)
  }
}

// ── fig 5: the planner, step by step ──
const PRESETS = { far: [START, FAR], lane: [SOUTH, LANE], garden: [START, GARDEN] }
class PfPlan extends Figure {
  build() {
    const svg = this.svgRoot(600, MAPH + 88, 'Planning one order with blocks, areas and doors, step by step. Click the map to set a start, then a target.')
    base(svg); grid(svg)
    this.layer = S('g', {}, svg)
    this.mark = marks(svg)
    this.rows = textRows(svg, MAPH + Y0 + 20, 4)
    this.split = true; this.pick = null; [this.s, this.t] = PRESETS.far
    pills(this, [['far', 'across the brook'], ['lane', 'into the lane'], ['garden', 'into the garden']], 'far', (v) => { [this.s, this.t] = PRESETS[v]; this.load() })
    pills(this, [[true, 'doors split at cost changes'], [false, 'one door per opening']], true, (v) => { this.split = v; this.load() }, H('div', { class: 'fc' }, this))
    this.step = stepper(this, (i) => this.show(i))
    svg.style.cursor = 'crosshair'
    svg.addEventListener('click', (e) => {
      const c = cellFromEvent(svg, e); if (c < 0) return
      if (this.pick == null) { this.pick = c; this.mark(c, this.t); say(this.rows, 'Start set. Click again to set the target.'); return }
      this.s = this.pick; this.t = c; this.pick = null; this.load()
    })
    this.load()
  }
  load() {
    if (!C[this.s]) this.s = nearest(prepare(this.split), this.s, prepare(this.split).region[START])
    this.pick = null; this.P = prepare(this.split); this.r = plan(this.P, this.s, this.t); this.step.set(5, 4)
  }
  show(i) {
    this.pick = null
    const L = this.layer, P = this.P, r = this.r; L.replaceChildren(); this.mark(r.s, r.t0)
    const node = (n) => P.nodes[n], dot = (c, cls, rad = 2.6) => `M${px(c) - rad} ${py(c)}a${rad} ${rad} 0 1 0 ${2 * rad} 0a${rad} ${rad} 0 1 0 ${-2 * rad} 0`
    if (r.moved) S('path', { d: dot(r.t, '', 4) + `M${px(r.t0)} ${py(r.t0)}L${px(r.t)} ${py(r.t)}`, class: 'f-none s-ochre', 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }, L)
    if (i === 0) return say(this.rows, r.moved
      ? `1. Can it get there? The target's region is not the start's, so the target moves to the nearest free cell in the start's region (ochre), found by searching outward from the target. This is one lookup per cell.`
      : `1. Can it get there? The start and the target are in the same region, so yes. Had they not been, the answer would be one lookup: no search over the map.`)
    if (i >= 1) {
      const links = [...r.sl.map(([n]) => [r.s, node(n)]), ...r.tl.map(([n]) => [r.t, node(n)])]
      S('path', { d: links.map(([a, b]) => `M${px(a)} ${py(a)}L${px(b)} ${py(b)}`).join(''), class: 'f-none s-ink2', 'stroke-width': 1, 'stroke-dasharray': i === 1 ? '' : '2 3' }, L)
    }
    S('path', { d: doorsD(P, 1.6), class: 'f-ink3' }, L)
    if (i === 1) return say(this.rows, `2. A Dijkstra from the start, inside its block only, finds the ${r.sl.length} doors of the start's own area and what each costs to reach; the same from the target finds ${r.tl.length}. Doors behind a wall are never reached, so the right side is chosen by itself.`)
    if (i === 2) {
      S('path', { d: r.looked.map((n) => dot(node(n))).join(''), class: 'f-ink2' }, L)
      S('path', { d: polyD(r.route), class: 'f-none s-green', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, L)
      return say(this.rows, `3. The route: A* over the doors only. It took ${r.looked.length} doors off its queue (grey dots) and picked a chain of ${r.route.length - 2} door nodes. Every link carries the real walking cost, so the cheapest chain wins.`)
    }
    if (i === 3) {
      S('path', { d: cellsD(r.stepLooked), class: 'f-green', opacity: .25 }, L)
      S('path', { d: polyD(r.cells), class: 'f-none s-green', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, L)
      return say(this.rows, `4. The steps: for each link of the route, an exact A* over cells from door to door, inside that one block. ${fmtN(r.stepLooked.length)} cells looked at in all, against ${fmtN(r.exact.order.length)} for one A* over the whole map. Before straightening the steps cost ${pctOf(r.stepsCost, r.exact.cost)} the exact path.`)
    }
    const pts = r.straight.pts
    S('path', { d: polyD(r.exact.path), class: 'f-none s-ink2', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, L)
    S('path', { d: polyD(pts), class: 'f-none s-green', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, L)
    say(this.rows, r.exact.cost === 0 ? '5. The start and the target are the same cell: nothing to walk.'
      : `5. Straighten: skip points while the straight line is clear and costs at most 5 % more than the steps it replaces. ${pts.length - 1} straight legs, costing ${pctOf(r.straight.cost, r.exact.cost)} the exact cell path (dashed), which can only move in 8 directions.`)
  }
}

define({ 'pf-search': PfSearch, 'pf-coarse': PfCoarse, 'pf-games': PfGames, 'pf-prepare': PfPrepare, 'pf-plan': PfPlan })
