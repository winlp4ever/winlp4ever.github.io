// Pathfinding for games. Most figures are the explainer page's own drawings
// (pathfinding-viz: core.js and app.js), run unchanged apart from wording, fonts
// and where each one sits; the animated Dijkstra / A* figure is this blog's.
// Pathfinding for games: one small costed map, the searches on it, how games cut
// it up, and the block / area / door planner, all computed live in the browser.
import { S, H, attr, clamp, pills, wrap, Figure, define, STILL, REDUCED } from './core.js'

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

// ── drawing ──
const px = (i) => X0 + (i % W) * PX + PX / 2, py = (i) => Y0 + ((i / W) | 0) * PX + PX / 2
const sq = (i, inset = 0) => `M${X0 + (i % W) * PX + inset} ${Y0 + ((i / W) | 0) * PX + inset}h${PX - 2 * inset}v${PX - 2 * inset}h${2 * inset - PX}z`
const cellsD = (list) => list.map((i) => sq(i)).join('')
const polyD = (cells) => cells.length ? 'M' + cells.map((c) => `${px(c)} ${py(c)}`).join('L') : ''
const fmtN = (n) => Math.round(n).toLocaleString('en-US')
const metres = (c) => (c / (OPEN * 200)).toFixed(0) // a cost in "metres of open ground"

// the ground, one path per kind of cell (runs merged along each row)
function base(svg) {
  const runs = {}
  for (let y = 0; y < HH; y++) for (let x = 0; x < W;) {
    const k = G0.kind[y * W + x]; let e = x + 1; while (e < W && G0.kind[y * W + e] === k) e++
    if (k) (runs[k] = runs[k] || []).push(`M${X0 + x * PX} ${Y0 + y * PX}h${(e - x) * PX}v${PX}h${-(e - x) * PX}z`)
    x = e
  }
  S('rect', { x: X0, y: Y0, width: W * PX, height: MAPH, class: 'pf-open' }, svg)
  const g0 = S('g', {}, svg)
  for (const k in runs) S('path', { d: runs[k].join(''), class: 'pf-' + KIND[k] }, g0)
  return g0
}
function marks(svg) {
  const s = S('circle', { r: 4.5, class: 'pf-start' }, svg), t = S('path', { class: 'pf-goal' }, svg)
  return (a, b) => {
    attr(s, { cx: px(a), cy: py(a) })
    attr(t, { d: `M${px(b)} ${py(b) - 6}l6 6l-6 6l-6-6z` })
  }
}
const textRows = (svg, y, n) => Array.from({ length: n }, (_, i) => S('text', { x: X0, y: y + i * 17, class: 't2', 'font-size': 12.5 }, svg))
const say = (rows, text) => { const r = wrap(text, 75); rows.forEach((t, j) => { t.textContent = r[j] || '' }) }

const START = cellAt(5, 52), FAR = cellAt(90, 24)

// ── fig 1: Dijkstra and A* spreading over the map ──
class PfSearch extends Figure {
  constructor() { super(); this.duration = 7; this.poster = 7 }
  build() {
    this.classList.add('pv')
    const svg = this.svgRoot(600, MAPH + 70, 'Dijkstra and A* searching the map from the south-west corner to a target east of the brook')
    base(svg)
    this.vis = S('g', { class: 'pf-work' }, svg)
    this.line = S('path', { class: 'pf-path', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, svg)
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


// ── the explainer page's figures ──
const PV_CSS = '.pv {--paper: #E8ECE3; --paper-2: #DCE2D5; --plate: #F3F5EF; --ink: #1B2430; --ink-2: #4B5664; --ink-3: #7A8590; --rule: #B8C1B2;\n  --carmine: #B0263D; --carmine-wash: rgba(176, 38, 61, .14); --violet: #5E4F8F; --gold: #A87A1E; --prussian: #2A5B88;\n  --t-open: #C8D3AE; --t-road: #DCC795; --t-crops: #DACB86; --t-wood: #8DA477; --t-marsh: #A3B6A6; --t-water: #4F7EA6; --t-ford: #8DB0C8; --t-house: #6C5647; --t-wall: #33291F;\n  --tint-1: rgba(42, 91, 136, .42); --tint-2: rgba(168, 122, 30, .46); --tint-3: rgba(94, 79, 143, .42); --plate: var(--panel); --paper: var(--bg); --paper-2: var(--panel); --rule: var(--rule-2); --f-display: var(--display); --f-italic: var(--sans); --f-body: var(--sans); --f-mono: var(--mono);}\n@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .pv {--paper: #10151A; --paper-2: #171E25; --plate: #0B0F13; --ink: #DDE3D8; --ink-2: #A3AEA8; --ink-3: #6F7B80; --rule: #2C3640;\n  --carmine: #F2667D; --carmine-wash: rgba(242, 102, 125, .16); --violet: #AE9EE6; --gold: #E3B552; --prussian: #7EAEDB;\n  --t-open: #36432F; --t-road: #6C5D3E; --t-crops: #5D5532; --t-wood: #263822; --t-marsh: #33463F; --t-water: #1E3D5A; --t-ford: #36586F; --t-house: #8B7360; --t-wall: #D7C8B1;\n  --tint-1: rgba(126, 174, 219, .38); --tint-2: rgba(227, 181, 82, .38); --tint-3: rgba(174, 158, 230, .38); color-scheme: dark; --plate: var(--panel); --paper: var(--bg); --paper-2: var(--panel); --rule: var(--rule-2);} }\n:root[data-theme="dark"] .pv {--paper: #10151A; --paper-2: #171E25; --plate: #0B0F13; --ink: #DDE3D8; --ink-2: #A3AEA8; --ink-3: #6F7B80; --rule: #2C3640;\n  --carmine: #F2667D; --carmine-wash: rgba(242, 102, 125, .16); --violet: #AE9EE6; --gold: #E3B552; --prussian: #7EAEDB;\n  --t-open: #36432F; --t-road: #6C5D3E; --t-crops: #5D5532; --t-wood: #263822; --t-marsh: #33463F; --t-water: #1E3D5A; --t-ford: #36586F; --t-house: #8B7360; --t-wall: #D7C8B1;\n  --tint-1: rgba(126, 174, 219, .38); --tint-2: rgba(227, 181, 82, .38); --tint-3: rgba(174, 158, 230, .38); color-scheme: dark; --plate: var(--panel); --paper: var(--bg); --paper-2: var(--panel); --rule: var(--rule-2);}\n.prose .pv { font-family: var(--f-body); color: var(--ink); font-size: 15px; line-height: 1.5; }\n.prose .pv p, .prose .pv h3, .prose .pv h4, .prose .pv dl, .prose .pv dd, .prose .pv dt, .prose .pv figure { margin: 0; }\n.prose .pv h3 { font-family: var(--f-display); font-weight: 600; font-size: 19px; line-height: 1.2; }\n.prose .pv b { font-weight: 600; }\n.prose .pv .plate {background: var(--plate); border: 1px solid var(--rule); border-radius: 3px; position: relative;}\n.prose .pv .plate-cap {display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 10px 14px; border-top: 1px solid var(--rule);\n  font-family: var(--f-mono); font-size: 11.5px; color: var(--ink-2); letter-spacing: .04em;}\n.prose .pv canvas {display: block; width: 100%;}\n.prose .pv .steps {display: flex; gap: 6px; flex-wrap: wrap;}\n.prose .pv .chip {font-family: var(--f-mono); font-size: 12px; border: 1px solid var(--rule); background: transparent; color: var(--ink-2); padding: 5px 10px;\n  border-radius: 999px; cursor: pointer;}\n.prose .pv .chip[aria-pressed="true"] {background: var(--ink); color: var(--paper); border-color: var(--ink);}\n.prose .pv .chip:hover {border-color: var(--ink-2);}\n.prose .pv .hero-label {font-family: var(--f-italic); font-style: italic; font-size: 19px; min-height: 2.6em; color: var(--ink);}\n.prose .pv .cases {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px;}\n@media (max-width: 860px) { .prose .pv .cases {grid-template-columns: 1fr;} }\n.prose .pv .case {display: flex; flex-direction: column;}\n.prose .pv .case .body {padding: 14px; display: flex; flex-direction: column; gap: 8px; font-size: 15px; line-height: 1.5;}\n.prose .pv .verdict {font-family: var(--f-mono); font-size: 11.5px; letter-spacing: .05em;}\n.prose .pv .bad {color: var(--carmine);}\n.prose .pv .lab {display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 0;}\n@media (max-width: 900px) { .prose .pv .lab {grid-template-columns: 1fr;} }\n.prose .pv .lab-map {position: relative; border-right: 1px solid var(--rule); min-width: 0;}\n@media (max-width: 900px) { .prose .pv .lab-map {border-right: 0; border-bottom: 1px solid var(--rule);} }\n.prose .pv .lab-map canvas {cursor: crosshair; touch-action: manipulation;}\n.prose .pv .lab-side {padding: 16px; display: flex; flex-direction: column; gap: 18px; font-size: 14.5px;}\n.prose .pv .lab-side h4 {margin: 0 0 8px; font-family: var(--f-mono); font-weight: 500; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3);}\n.prose .pv .presets {display: flex; flex-direction: column; gap: 6px;}\n.prose .pv .preset {text-align: left; font-family: var(--f-body); font-size: 14.5px; border: 1px solid var(--rule); background: transparent; color: var(--ink);\n  padding: 7px 10px; border-radius: 3px; cursor: pointer; line-height: 1.3;}\n.prose .pv .preset small {display: block; color: var(--ink-3); font-size: 12.5px;}\n.prose .pv .preset[aria-pressed="true"] {border-color: var(--carmine); box-shadow: inset 3px 0 0 var(--carmine);}\n.prose .pv .toggles {display: flex; flex-direction: column; gap: 6px;}\n.prose .pv .toggles label {display: flex; gap: 8px; align-items: center; cursor: pointer;}\n.prose .pv .toggles input {accent-color: var(--carmine);}\n.prose .pv .sw {width: 18px; height: 10px; border-radius: 2px; flex: none;}\n.prose .pv .stats {display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; font-size: 13.5px;}\n.prose .pv .stats dt {color: var(--ink-2);}\n.prose .pv .stats dd {margin: 0; font-family: var(--f-mono); font-variant-numeric: tabular-nums; text-align: right;}\n.prose .pv .stats .big {font-size: 15px; color: var(--ink);}\n.prose .pv .verdicts {display: flex; flex-direction: column; gap: 8px; font-size: 14px; line-height: 1.4;}\n.prose .pv .verdicts div {padding-left: 10px; border-left: 3px solid var(--rule);}\n.prose .pv .verdicts .v-new {border-color: var(--carmine);}\n.prose .pv .verdicts .v-old {border-color: var(--violet);}\n.prose .pv .phasebar {display: flex; gap: 0; border-top: 1px solid var(--rule); overflow-x: auto;}\n.prose .pv .phase {flex: 1 1 0; min-width: 120px; padding: 10px 12px; border-right: 1px solid var(--rule); font-size: 13px; line-height: 1.35; color: var(--ink-3);}\n.prose .pv .phase:last-child {border-right: 0;}\n.prose .pv .phase b {display: block; font-family: var(--f-mono); font-weight: 500; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 2px;}\n.prose .pv .phase.on {color: var(--ink); background: var(--carmine-wash);}\n.prose .pv .hint {position: absolute; left: 10px; top: 10px; font-family: var(--f-mono); font-size: 11.5px; background: var(--plate); color: var(--ink-2);\n  border: 1px solid var(--rule); padding: 4px 8px; border-radius: 3px; pointer-events: none;}\n.prose .pv .btn {font-family: var(--f-mono); font-size: 12px; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); padding: 6px 12px; border-radius: 3px; cursor: pointer;}\n.prose .pv .btn.ghost {background: transparent; color: var(--ink);}\n.prose .pv .chart {padding: 18px 18px 8px;}\n.prose .pv .bars {display: flex; flex-direction: column; gap: 14px;}\n.prose .pv .bar-row {display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 6px 16px; align-items: center;}\n@media (max-width: 640px) { .prose .pv .bar-row {grid-template-columns: 1fr;} }\n.prose .pv .bar-label {font-size: 14px; line-height: 1.3;}\n.prose .pv .bar-label small {display: block; color: var(--ink-3); font-family: var(--f-mono); font-size: 11px;}\n.prose .pv .track {position: relative; height: 22px;}\n.prose .pv .pvbar {position: absolute; left: 0; top: 4px; height: 14px; border-radius: 0 4px 4px 0; background: var(--ink-2);}\n.prose .pv .pvbar.ours {background: var(--carmine);}\n.prose .pv .pvbar.est {background: repeating-linear-gradient(45deg, var(--carmine) 0 3px, transparent 3px 6px); border: 1px solid var(--carmine);}\n.prose .pv .pvbar.range {background: var(--carmine-wash); border: 1px dashed var(--carmine);}\n.prose .pv .val {position: absolute; top: 1px; font-family: var(--f-mono); font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--ink);}\n.prose .pv .axis {position: relative; height: 26px; margin-left: calc(min(260px, 100%) + 16px); border-top: 1px solid var(--rule); margin-top: 12px;}\n@media (max-width: 640px) { .prose .pv .axis {margin-left: 0;} }\n.prose .pv .tick {position: absolute; top: 4px; transform: translateX(-50%); font-family: var(--f-mono); font-size: 10.5px; color: var(--ink-3);}\n.prose .pv .tip {position: fixed; z-index: 20; pointer-events: none; background: var(--ink); color: var(--paper); font-family: var(--f-mono); font-size: 12px; padding: 6px 9px; border-radius: 3px; max-width: 280px; line-height: 1.4;}\n.prose .pv .games {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px;}\n@media (max-width: 760px) { .prose .pv .games {grid-template-columns: 1fr;} }\n.prose .pv .game .body {padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; font-size: 15px; line-height: 1.5;}\n.prose .pv .game .meta {display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-family: var(--f-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3);}\n.prose .pv .game h3 {font-size: 24px;}\n.prose .pv .take {font-size: 14px; color: var(--ink-2); border-top: 1px dotted var(--rule); padding-top: 8px;}\n.prose .pv .take b {font-family: var(--f-mono); font-weight: 500; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--carmine); margin-right: 6px;}\n.prose .pv .gloss {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 32px; margin: 0; border-top: 1px solid var(--rule);}\n@media (max-width: 760px) { .prose .pv .gloss {grid-template-columns: 1fr;} }\n.prose .pv .gloss div {padding: 12px 0; border-bottom: 1px solid var(--rule);}\n.prose .pv .gloss dt {font-family: var(--f-mono); font-size: 12px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--carmine); margin-bottom: 3px;}\n.prose .pv .gloss dd {margin: 0; font-size: 15.5px; line-height: 1.5;}\n.prose .pv .gfig {margin: 0; display: flex; flex-direction: column; gap: 4px; min-width: 0;}\n.prose .pv .gfig figcaption {font-family: var(--f-mono); font-size: 11px; line-height: 1.4; color: var(--ink-2);}\n.prose .pv .gloss > div {display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 16px; align-items: center;}\n.prose .pv .gloss canvas {width: 100%;}\n@media (max-width: 1000px) { .prose .pv .gloss {grid-template-columns: 1fr;} }\n@media (max-width: 480px) { .prose .pv .gloss > div {grid-template-columns: 1fr;}\n.prose .pv .gfig {max-width: 320px;} }\n.prose .pv .idea-bar {display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 14px; border-top: 1px solid var(--rule);}\n.prose .pv .idea-tg {font-family: var(--f-mono); font-size: 12px; color: var(--ink-2); display: flex; gap: 6px; align-items: center; cursor: pointer;}\n.prose .pv .idea-tg input {accent-color: var(--carmine);}\n.prose .pv .idea-text {padding: 0 14px 14px; font-size: 16px; line-height: 1.55; min-height: 4.8em; margin: 0;}\n.prose .pv .steps-list {margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px;}\n.prose .pv .hero-in { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 400px); gap: 24px; align-items: center; }\n@media (max-width: 700px) { .prose .pv .hero-in { grid-template-columns: 1fr; } }\n.prose .pv .hero-ctl { display: flex; flex-direction: column; gap: 14px; }\n.prose .pv .hero-label { font-size: 17px; }\n.prose .pv .games.n1 { grid-template-columns: minmax(0, 560px); justify-content: center; }\n.prose .pv .lab { grid-template-columns: 1fr; }\n.prose .pv .lab-map { border-right: 0; border-bottom: 1px solid var(--rule); }\n.prose .pv .lab-side { display: grid; grid-template-columns: 1.1fr 1.2fr 1fr; gap: 18px 24px; align-items: start; }\n.prose .pv .lab-side > .verdicts { grid-column: 1 / 3; }\n@media (max-width: 760px) { .prose .pv .lab-side { grid-template-columns: 1fr; } .prose .pv .lab-side > .verdicts { grid-column: auto; } }\n.prose .pv .gloss > div { grid-template-columns: 200px minmax(0, 1fr); }\n@media (max-width: 1000px) { .prose .pv .gloss { grid-template-columns: 1fr; } }\n@media (max-width: 480px) { .prose .pv .gloss > div { grid-template-columns: 1fr; } }\n/* the animated search figure, in the same palette */\n.pv .pf-open { fill: var(--t-open); } .pv .pf-road { fill: var(--t-road); } .pv .pf-wood { fill: var(--t-wood); } .pv .pf-marsh { fill: var(--t-marsh); }\n.pv .pf-water { fill: var(--t-water); } .pv .pf-ford { fill: var(--t-ford); } .pv .pf-house { fill: var(--t-house); } .pv .pf-wall { fill: var(--t-wall); }\n.pv .pf-work { fill: var(--carmine); opacity: .38; } .pv .pf-path { fill: none; stroke: var(--carmine); } .pv .pf-start { fill: var(--ink); } .pv .pf-goal { fill: var(--carmine); }\n'
const FRAG = {'pf-hero': '<div class="hero-in"><div class="hero-ctl"><div class="steps" role="group" aria-label="stages" id="heroSteps"></div></div><figure class="plate"><canvas id="hero" height="420" aria-label="One block cut by a diagonal wall, first marked closed, then split into two areas"></canvas><div class="plate-cap"><span id="heroCap">One 8 × 8 m block</span><span>■ blocked · □ free</span></div></figure></div>', 'pf-words': '<dl class="gloss"><div><figure class="gfig"><canvas data-g="cell" aria-label="Cell"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Cell</dt><dd>A 1 m × 1 m square of ground. Each cell is <i>free</i> (a unit can stand there) or <i>blocked</i> (a house, a wall, deep water).</dd></div></div><div><figure class="gfig"><canvas data-g="square" aria-label="Square"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Square</dt><dd>A cell of a coarser grid: 2 m × 2 m, four cells, marked open or closed. One mark per square is the problem.</dd></div></div><div><figure class="gfig"><canvas data-g="block" aria-label="Block"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Block</dt><dd>A bigger square of the map, 32 m × 32 m on a big map. The map is cut into blocks like a chessboard; the lines between them are imaginary.</dd></div></div><div><figure class="gfig"><canvas data-g="area" aria-label="Area"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Area</dt><dd>Free ground inside one block that a unit can walk all over without leaving the block. A block with no wall has one area. A wall through it makes two.</dd></div></div><div><figure class="gfig"><canvas data-g="door" aria-label="Door"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Door</dt><dd>A spot on a block\'s edge where a unit can step into the next block, because the ground is free on both sides. Each door joins one area on each side.</dd></div></div><div><figure class="gfig"><canvas data-g="region" aria-label="Region"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Region</dt><dd>All the ground a unit can reach from where it stands, over the whole map. A walled garden with no gate is its own region: "you can\'t get there".</dd></div></div><div><figure class="gfig"><canvas data-g="body" aria-label="Unit size"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Unit size</dt><dd>Big units get their own cells, with the walls widened by their size, so a gap a small unit fits through is closed for a big one.</dd></div></div><div><figure class="gfig"><canvas data-g="cost" aria-label="Cost"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Cost</dt><dd>How slow the ground is. Roads are cheap, crops and marsh cost more. The best path is the cheapest one, not always the shortest.</dd></div></div><div><figure class="gfig"><canvas data-g="search" aria-label="Search"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Search</dt><dd>How a planner finds the cheapest path: it spreads out from the start, cheapest places first. <b>Dijkstra</b> spreads in all directions. <b>A*</b> leans toward the target.</dd></div></div><div><figure class="gfig"><canvas data-g="route" aria-label="Route and steps"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Route and steps</dt><dd>The <b>route</b> is the list of doors to go through. The <b>steps</b> are the exact 1 m path that walks it.</dd></div></div><div><figure class="gfig"><canvas data-g="straight" aria-label="Straightening"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Straightening</dt><dd>Removing zigzags: skip a point when the straight line past it is clear and costs at most 5% more.</dd></div></div><div><figure class="gfig"><canvas data-g="checker" aria-label="Exact check"></canvas><figcaption></figcaption></figure><div class="gtext"><dt>Exact check</dt><dd>One A* over every cell. Too slow for play, but in tests it checks that the fast planner\'s paths are right.</dd></div></div></dl>', 'pf-cases': '<div class="steps" role="group" aria-label="View the cases as" id="caseMode" style="margin-bottom:14px"></div><div class="cases" id="cases"></div>', 'pf-oval': '<figure class="plate"><canvas id="ellipse" height="300" aria-label="The oval a search looks at, counted in cells and in blocks"></canvas><div class="plate-cap"><span>The same oval, the same 4 km trip. Left: counted in 1 m cells. Right: counted in 32 m blocks, plus one strip of cells along the route.</span><span>to scale</span></div></figure>', 'pf-idea': '<figure class="plate"><canvas id="idea" height="320" aria-label="Step by step: blocks, areas, doors, links, START and TARGET, shortest path, steps"></canvas><div class="idea-bar"><div class="steps" role="group" aria-label="Idea steps" id="ideaSteps"></div><label class="idea-tg"><input type="checkbox" id="ideaClosed"> wall reaches the top edge (no way round)</label></div><p class="idea-text" id="ideaText"></p></figure>', 'pf-lab': '<div class="plate"><div class="lab"><div class="lab-map"><canvas id="lab" aria-label="Interactive village"></canvas><div class="hint" id="hint">click: set start</div></div><div class="lab-side"><div><h4>Cases</h4><div class="presets" id="presets"></div></div><div><h4>Show</h4><div class="toggles" id="toggles"></div></div><div><h4>This order</h4><dl class="stats" id="stats"></dl></div><div class="verdicts" id="verdicts"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="replay">Replay</button></div></div></div><div class="phasebar" id="phases"></div></div>', 'pf-bars': '<div class="plate chart"><div class="bars" id="bars"></div><div class="axis" id="axis"></div></div><div class="tip" id="tip" hidden></div>'}
class PvFig extends Figure {
  build() {
    if (!document.getElementById('pv-css')) H('style', { id: 'pv-css', text: PV_CSS }, document.head)
    this.idleText = 'interactive'
    const w = H('div', { class: 'pv' }, this)
    if (this.localName === 'pf-game') {
      const ids = this.dataset.games.split(',')
      w.innerHTML = `<div class="games${ids.length === 1 ? ' n1' : ''}">${ids.map((id) => `<div id="game-${id}"></div>`).join('')}</div>`
    } else w.innerHTML = FRAG[this.localName]
  }
}
let booted = false
function boot() {
  if (booted) return; booted = true
/* ---------- Pathfinding core: a 160 x 100 m sample ground, three planners ---------- */
const W = 160, H = 100, C = 10, OLD = 4;
const ROAD = 10, OPEN = 13, CROPS = 16, WOOD = 22, FORD = 26, MARSH = 30;

/** Builds the sample ground: per 1 m cell a terrain cost (0 = blocked) and a terrain kind. */
function buildGround() {
  const cost = new Uint8Array(W * H).fill(OPEN);
  const kind = new Uint8Array(W * H); // 0 open 1 road 2 crops 3 wood 4 marsh 5 water 6 ford 7 house 8 wall
  const set = (x, y, c, k) => { if (x >= 0 && y >= 0 && x < W && y < H) { cost[y * W + x] = c; kind[y * W + x] = k; } };
  const each = (f) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f(x, y); };
  // fields and woods
  each((x, y) => {
    if ((x >= 4 && x < 30 && y >= 46 && y < 56) || (x >= 118 && x < 156 && y >= 70 && y < 96) || (x >= 112 && x < 150 && y >= 4 && y < 12)) set(x, y, CROPS, 2);
    const wx = (x - 136) / 17, wy = (y - 30) / 11;
    if (wx * wx + wy * wy < 1) set(x, y, WOOD, 3);
    const mx = (x - 97) / 8, my = (y - 84) / 13;
    if (mx * mx + my * my < 1) set(x, y, MARSH, 4);
  });
  // the brook: blocked water, a ford in the north
  for (let y = 0; y < H; y++) {
    const cx = Math.round(106 + 5 * Math.sin(y / 14));
    for (let x = cx - 1; x <= cx + 1; x++) {
      if (y >= 17 && y <= 22) set(x, y, FORD, 6); else set(x, y, 0, 5);
    }
  }
  // the road, three cells wide (crosses the brook on a bridge)
  const road = [[0, 63], [24, 62], [44, 60], [70, 54], [100, 60], [160, 58]];
  for (let i = 0; i + 1 < road.length; i++) {
    const [ax, ay] = road[i], [bx, by] = road[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let k = 0; k <= n; k++) {
      const px = ax + (bx - ax) * k / n, py = ay + (by - ay) * k / n;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = Math.round(px + dx * 0.5), y = Math.round(py + dy);
        set(x, y, ROAD, 1);
      }
    }
  }
  // houses: rotated boxes (centre, half sizes, angle)
  const houses = [[72, 70, 6, 3.5, 0.35], [86, 80, 4.5, 4, -0.3], [44, 74, 6, 3, 0.2], [60, 82, 3.5, 5, 0.55],
    [30, 72, 4, 3, -0.15], [74, 87, 4, 3, 0.1], [58, 68, 3.5, 3, 0.4], [88, 68, 3, 4, 0.1], [34, 84, 5, 3, 0.4], [49, 89, 4, 3.5, -0.4]];
  each((x, y) => {
    for (const [hx, hy, a, b, r] of houses) {
      const dx = x + 0.5 - hx, dy = y + 0.5 - hy, c = Math.cos(r), s = Math.sin(r);
      if (Math.abs(dx * c + dy * s) <= a && Math.abs(-dx * s + dy * c) <= b) set(x, y, 0, 7);
    }
  });
  // thin garden walls, one cell thick
  const line = (ax, ay, bx, by) => {
    let x = ax, y = ay; const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
    let e = dx + dy;
    for (;;) { set(x, y, 0, 8); if (x === bx && y === by) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x += sx; } if (e2 <= dx) { e += dx; y += sy; } }
  };
  // the bent lane: north from the road, then east to a dead end
  line(42, 37, 42, 58); line(46, 41, 46, 57); line(42, 37, 60, 37); line(46, 41, 60, 41); line(60, 37, 60, 41);
  // the walled garden: closed all round
  line(72, 32, 88, 32); line(88, 32, 88, 44); line(88, 44, 72, 44); line(72, 44, 72, 32);
  // a long diagonal wall across the north-west fields, and a hedge-line wall near it
  line(6, 40, 34, 12); line(14, 44, 40, 18);
  return { cost, kind, houses };
}

/* ---------- moves ---------- */
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];

/** A binary min-heap of (key, value) with ties broken by insertion order, so searches are deterministic. */
class Heap {
  constructor() { this.k = []; this.v = []; this.s = []; this.n = 0; }
  push(key, val) {
    let i = this.k.length; this.k.push(key); this.v.push(val); this.s.push(this.n++);
    while (i > 0) { const p = (i - 1) >> 1; if (this.less(i, p)) { this.swap(i, p); i = p; } else break; }
  }
  less(a, b) { return this.k[a] < this.k[b] || (this.k[a] === this.k[b] && this.s[a] < this.s[b]); }
  swap(a, b) { [this.k[a], this.k[b]] = [this.k[b], this.k[a]]; [this.v[a], this.v[b]] = [this.v[b], this.v[a]]; [this.s[a], this.s[b]] = [this.s[b], this.s[a]]; }
  pop() {
    const top = this.v[0], lk = this.k.pop(), lv = this.v.pop(), ls = this.s.pop();
    if (this.k.length) {
      this.k[0] = lk; this.v[0] = lv; this.s[0] = ls; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < this.k.length && this.less(l, m)) m = l; if (r < this.k.length && this.less(r, m)) m = r; if (m === i) break; this.swap(i, m); i = m; }
    }
    return top;
  }
  get size() { return this.k.length; }
}

/** Step cost between two cells: length x the mean of their costs, in integer units. */
function stepCost(cost, a, b, diag) { return (cost[a] + cost[b]) * (diag ? 141 : 100); }
function octile(a, b) { const dx = Math.abs(a % W - b % W), dy = Math.abs(((a / W) | 0) - ((b / W) | 0)); return 2000 * (dx + dy) - 1180 * Math.min(dx, dy); }

/** Calls f(next, diag) for each legal 8-neighbour: a diagonal step needs both cells beside it free. */
function neighbours(cost, i, f) {
  const x = i % W, y = (i / W) | 0;
  for (let d = 0; d < 8; d++) {
    const nx = x + DX[d], ny = y + DY[d];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const j = ny * W + nx; if (!cost[j]) continue;
    if (d >= 4 && (!cost[y * W + nx] || !cost[ny * W + x])) continue;
    f(j, d >= 4);
  }
}

/** Fine A* on the 1 m raster; `allow` (optional) limits the cells it may enter. */
function fineAStar(cost, s, g, allow) {
  const dist = new Float64Array(W * H).fill(Infinity), par = new Int32Array(W * H).fill(-1), done = new Uint8Array(W * H);
  const order = []; const h = new Heap(); dist[s] = 0; h.push(octile(s, g), s);
  while (h.size) {
    const i = h.pop(); if (done[i]) continue; done[i] = 1; order.push(i);
    if (i === g) break;
    neighbours(cost, i, (j, diag) => {
      if (allow && !allow[j]) return;
      const nd = dist[i] + stepCost(cost, i, j, diag);
      if (nd < dist[j]) { dist[j] = nd; par[j] = i; h.push(nd + octile(j, g), j); }
    });
  }
  if (!done[g]) return { path: null, cost: Infinity, order };
  const path = []; for (let i = g; i !== -1; i = par[i]) path.push(i); path.reverse();
  return { path, cost: dist[g], order };
}

/** Dijkstra from one cell inside a box of cells; returns the distance array. */
function boxDijkstra(cost, s, x0, y0, x1, y1) {
  const dist = new Map(); const h = new Heap(); dist.set(s, 0); h.push(0, s); const done = new Set();
  while (h.size) {
    const i = h.pop(); if (done.has(i)) continue; done.add(i);
    neighbours(cost, i, (j, diag) => {
      const x = j % W, y = (j / W) | 0; if (x < x0 || y < y0 || x >= x1 || y >= y1) return;
      const nd = dist.get(i) + stepCost(cost, i, j, diag);
      if (!dist.has(j) || nd < dist.get(j)) { dist.set(j, nd); h.push(nd, j); }
    });
  }
  return dist;
}

/** Labels 4-connected pieces of free cells; `inBox(i, j)` limits growth (whole map or one cluster). */
function label(cost, inBox) {
  const lab = new Int32Array(W * H).fill(-1); let n = 0; const q = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!cost[i] || lab[i] >= 0) continue;
    let qh = 0, qt = 0; q[qt++] = i; lab[i] = n;
    while (qh < qt) {
      const c = q[qh++], x = c % W, y = (c / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (!cost[j] || lab[j] >= 0 || !inBox(c, j)) continue; lab[j] = n; q[qt++] = j;
      }
    }
    n++;
  }
  return { lab, n };
}

/* ---------- layer 1 and 2: islands, cluster pieces, crossings, the graph ---------- */
function buildHierarchy(cost) {
  const isl = label(cost, () => true);
  const cl = (i) => ((((i / W) | 0) / C) | 0) * (W / C) + (((i % W) / C) | 0);
  const pc = label(cost, (a, b) => cl(a) === cl(b));
  const nodes = []; const nodeAt = new Map(); const adj = [];
  const nodeOf = (cell) => { if (!nodeAt.has(cell)) { nodeAt.set(cell, nodes.length); nodes.push(cell); adj.push([]); } return nodeAt.get(cell); };
  const crossings = [];
  // entrances along every cluster border, split by piece pair and by cost
  const scan = (cells) => {
    let run = [];
    const flush = () => {
      if (!run.length) return;
      const picks = run.length >= 6 ? [run[0], run[run.length - 1]] : [run[run.length >> 1]];
      for (const [a, b] of picks) { const na = nodeOf(a), nb = nodeOf(b), c = stepCost(cost, a, b, false); adj[na].push([nb, c]); adj[nb].push([na, c]); crossings.push([a, b]); }
      run = [];
    };
    for (const [a, b] of cells) {
      const ok = cost[a] && cost[b];
      if (!ok) { flush(); continue; }
      if (run.length) { const [pa, pb] = run[run.length - 1]; if (pc.lab[pa] !== pc.lab[a] || pc.lab[pb] !== pc.lab[b] || cost[pa] !== cost[a] || cost[pb] !== cost[b]) flush(); }
      run.push([a, b]);
    }
    flush();
  };
  for (let cy = 0; cy < H / C; cy++) for (let cx = 0; cx < W / C; cx++) {
    if (cx + 1 < W / C) { const x = cx * C + C - 1, cells = []; for (let y = cy * C; y < cy * C + C; y++) cells.push([y * W + x, y * W + x + 1]); scan(cells); }
    if (cy + 1 < H / C) { const y = cy * C + C - 1, cells = []; for (let x = cx * C; x < cx * C + C; x++) cells.push([y * W + x, (y + 1) * W + x]); scan(cells); }
  }
  // intra-cluster edges: a Dijkstra from each crossing inside its cluster
  const byCluster = new Map();
  nodes.forEach((cell, n) => { const k = cl(cell); if (!byCluster.has(k)) byCluster.set(k, []); byCluster.get(k).push(n); });
  const intra = [];
  for (const [k, ns] of byCluster) {
    const x0 = (k % (W / C)) * C, y0 = ((k / (W / C)) | 0) * C;
    for (const a of ns) {
      const d = boxDijkstra(cost, nodes[a], x0, y0, x0 + C, y0 + C);
      for (const b of ns) if (b > a && d.has(nodes[b])) { adj[a].push([b, d.get(nodes[b])]); adj[b].push([a, d.get(nodes[b])]); intra.push([a, b]); }
    }
  }
  return { isl, pc, cl, nodes, adj, crossings, intra, byCluster };
}

/** Nearest free cell of island `want` to cell g, by distance (0 A.D.'s "make the goal reachable"). */
function nearestInIsland(cost, isl, want, g) {
  const gx = g % W, gy = (g / W) | 0; let best = -1, bd = Infinity;
  for (let i = 0; i < W * H; i++) if (cost[i] && isl.lab[i] === want) { const dx = i % W - gx, dy = ((i / W) | 0) - gy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return best;
}

/** The proposed planner: islands, then the cluster graph, then a fine search in the corridor, then smoothing. */
function planNew(cost, hz, s, g0) {
  const out = { s, target: g0, moved: false, unreachable: false };
  let g = g0;
  if (!cost[g] || hz.isl.lab[g] !== hz.isl.lab[s]) {
    out.moved = true; out.unreachable = !!cost[g];
    g = nearestInIsland(cost, hz.isl, hz.isl.lab[s], g0);
  }
  out.g = g;
  // temporary start and goal nodes, joined to the crossings of their own cluster
  const N = hz.nodes.length, S = N, G = N + 1;
  const extra = new Map([[S, []], [G, []]]);
  const join = (cell, id) => {
    const k = hz.cl(cell), x0 = (k % (W / C)) * C, y0 = ((k / (W / C)) | 0) * C;
    const d = boxDijkstra(cost, cell, x0, y0, x0 + C, y0 + C);
    for (const n of hz.byCluster.get(k) || []) if (d.has(hz.nodes[n])) extra.get(id).push([n, d.get(hz.nodes[n])]);
    return d;
  };
  const ds = join(s, S); join(g, G);
  if (hz.cl(s) === hz.cl(g) && ds.has(g)) extra.get(S).push([G, ds.get(g)]);
  const cellOf = (n) => n === S ? s : n === G ? g : hz.nodes[n];
  const edges = (n) => {
    if (n === S) return extra.get(S);
    const base = n === G ? [] : hz.adj[n];
    const more = [];
    for (const [m, c] of extra.get(G)) if (m === n) more.push([G, c]);
    return more.length ? base.concat(more) : base;
  };
  const dist = new Map([[S, 0]]), par = new Map(), done = new Set(), h = new Heap(); h.push(octile(s, g), S);
  const absOrder = [];
  while (h.size) {
    const n = h.pop(); if (done.has(n)) continue; done.add(n); absOrder.push(n); if (n === G) break;
    for (const [m, c] of edges(n)) { const nd = dist.get(n) + c; if (!dist.has(m) || nd < dist.get(m)) { dist.set(m, nd); par.set(m, n); h.push(nd + octile(cellOf(m), g), m); } }
  }
  out.absOrder = absOrder.map(cellOf);
  if (!done.has(G)) { out.path = null; return out; }
  const abs = []; for (let n = G; n !== undefined; n = par.get(n)) abs.push(cellOf(n)); abs.reverse();
  out.abs = abs;
  // the corridor: the clusters the abstract path passes through
  const allow = new Uint8Array(W * H), clusters = new Set(abs.map(hz.cl));
  for (let i = 0; i < W * H; i++) if (clusters.has(hz.cl(i))) allow[i] = 1;
  out.corridor = [...clusters];
  const r = fineAStar(cost, s, g, allow);
  out.fine = r.path; out.cost = r.cost; out.order = r.order;
  out.path = r.path ? smooth(cost, r.path) : null;
  out.reached = out.g === g0;
  return out;
}

/** Walks the cells a segment between two cell centres crosses; refuses a corner cut between two blocked cells. */
function sight(cost, a, b) {
  let x = a % W, y = (a / W) | 0; const tx = b % W, ty = (b / W) | 0;
  const dx = tx - x, dy = ty - y, sx = Math.sign(dx), sy = Math.sign(dy), ax = Math.abs(dx), ay = Math.abs(dy);
  let ix = 0, iy = 0; const cells = [a];
  while (ix < ax || iy < ay) {
    const l = (1 + 2 * ix) * ay, r = (1 + 2 * iy) * ax;
    if (l === r) { if (!cost[y * W + x + sx] || !cost[(y + sy) * W + x]) return null; x += sx; y += sy; ix++; iy++; }
    else if (l < r) { x += sx; ix++; } else { y += sy; iy++; }
    const c = y * W + x; if (!cost[c]) return null; cells.push(c);
  }
  return cells;
}

/** String-pulling: keep the farthest point ahead that is seen and whose straight leg costs within 5 % of the path. */
function smooth(cost, path) {
  const cum = [0]; for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i]; cum.push(cum[i - 1] + stepCost(cost, a, b, a % W !== b % W && ((a / W) | 0) !== ((b / W) | 0))); }
  const out = [path[0]]; let i = 0;
  while (i < path.length - 1) {
    let best = i + 1;
    for (let j = Math.min(path.length - 1, i + 60); j > i + 1; j--) {
      const cells = sight(cost, path[i], path[j]); if (!cells) continue;
      let sum = 0; for (const c of cells) sum += cost[c];
      const len = Math.hypot(path[j] % W - path[i] % W, ((path[j] / W) | 0) - ((path[i] / W) | 0));
      if (len * (sum / cells.length) * 200 <= 1.05 * (cum[j] - cum[i])) { best = j; break; }
    }
    out.push(path[best]); i = best;
  }
  return out;
}

/* ---------- a sketch of today's planner: one open/closed bit per 4 m cell ---------- */
function buildOld(cost) {
  const CW = W / OLD, CH = H / OLD, open = new Uint8Array(CW * CH), wp = new Int32Array(CW * CH).fill(-1), ccost = new Float64Array(CW * CH);
  for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
    const seen = new Set(); let pieces = 0, sum = 0, cnt = 0, best = -1, bd = Infinity;
    for (let y = cy * OLD; y < cy * OLD + OLD; y++) for (let x = cx * OLD; x < cx * OLD + OLD; x++) {
      const i = y * W + x; if (!cost[i]) continue; sum += cost[i]; cnt++;
      const d = (x + 0.5 - (cx + 0.5) * OLD) ** 2 + (y + 0.5 - (cy + 0.5) * OLD) ** 2; if (d < bd) { bd = d; best = i; }
      if (seen.has(i)) continue; pieces++; const st = [i]; seen.add(i);
      while (st.length) { const c = st.pop(), px = c % W, py = (c / W) | 0; for (let d2 = 0; d2 < 4; d2++) { const nx = px + DX[d2], ny = py + DY[d2]; if (nx < cx * OLD || ny < cy * OLD || nx >= cx * OLD + OLD || ny >= cy * OLD + OLD) continue; const j = ny * W + nx; if (cost[j] && !seen.has(j)) { seen.add(j); st.push(j); } } }
    }
    const k = cy * CW + cx; open[k] = pieces === 1 ? 1 : 0; ccost[k] = cnt ? sum / cnt : 0; wp[k] = best;
  }
  const border = (a, b) => { // an open border: a free fine cell on each side facing across
    const ax = a % CW, ay = (a / CW) | 0, bx = b % CW, by = (b / CW) | 0;
    for (let t = 0; t < OLD; t++) {
      let p, q;
      if (bx !== ax) { const x = Math.max(ax, bx) * OLD, y = ay * OLD + t; p = y * W + x - 1; q = y * W + x; }
      else { const y = Math.max(ay, by) * OLD, x = ax * OLD + t; p = (y - 1) * W + x; q = y * W + x; }
      if (cost[p] && cost[q]) return true;
    }
    return false;
  };
  return { CW, CH, open, wp, ccost, border };
}

function planOld(cost, old, s, t) {
  const { CW, CH, open, wp, ccost, border } = old;
  const cOf = (i) => (((i / W) | 0) / OLD | 0) * CW + ((i % W) / OLD | 0);
  const ctr = (k) => [(k % CW + 0.5) * OLD, (((k / CW) | 0) + 0.5) * OLD];
  const near = (i, needSight) => { // nearest open cell within 24 m, optionally one whose waypoint sees i
    let best = -1, bd = Infinity; const x = i % W + 0.5, y = ((i / W) | 0) + 0.5;
    for (let k = 0; k < CW * CH; k++) { if (!open[k]) continue; const [cx, cy] = ctr(k), d = Math.hypot(cx - x, cy - y); if (d > 24 || d >= bd) continue; if (needSight && !sight(cost, wp[k], i)) continue; bd = d; best = k; }
    return best;
  };
  const out = { s, target: t, notes: [] };
  let sc = cOf(s); if (!open[sc]) { sc = near(s, true); out.notes.push('start cell closed'); }
  let gc = cOf(t), beside = false;
  if (!open[gc]) { gc = near(t, true); beside = true; out.notes.push(gc < 0 ? 'target cell closed; nothing open in 24 m sees it' : 'target cell closed; goal moved beside it'); }
  if (sc < 0) { out.path = null; return out; }
  const dist = new Float64Array(CW * CH).fill(Infinity), par = new Int32Array(CW * CH).fill(-1), done = new Uint8Array(CW * CH), h = new Heap();
  const tx = t % W + 0.5, ty = ((t / W) | 0) + 0.5;
  const hh = (k) => { const [x, y] = ctr(k); return Math.hypot(x - tx, y - ty) * 10; };
  dist[sc] = 0; h.push(hh(sc), sc); let expanded = 0;
  while (h.size) {
    const k = h.pop(); if (done[k]) continue; done[k] = 1; expanded++; if (k === gc) break;
    const x = k % CW, y = (k / CW) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue; const j = ny * CW + nx; if (!open[j]) continue;
      if (d < 4) { if (!border(k, j)) continue; }
      else { const a = y * CW + nx, b = ny * CW + x; if (!open[a] || !open[b] || !border(k, a) || !border(a, j) || !border(k, b) || !border(b, j)) continue; }
      const nd = dist[k] + (d < 4 ? 1 : 1.414) * OLD * (ccost[k] + ccost[j]) / 2;
      if (nd < dist[j]) { dist[j] = nd; par[j] = k; h.push(nd + hh(j), j); }
    }
  }
  out.expanded = expanded;
  let end = gc;
  if (gc < 0 || !done[gc]) { // fall back to the reached cell nearest the target by its centre
    let bd = Infinity; for (let k = 0; k < CW * CH; k++) if (done[k]) { const [x, y] = ctr(k), d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; end = k; } }
    out.notes.push('goal not reached; ends at the reached cell nearest the target');
  }
  const chain = []; for (let k = end; k !== -1; k = par[k]) chain.push(k); chain.reverse();
  const pts = [s, ...chain.map((k) => wp[k])];
  if (!beside && end === cOf(t) && cost[t]) pts.push(t);
  out.chain = chain; out.path = pts;
  const last = pts[pts.length - 1];
  out.reached = last === t;
  out.endGap = Math.hypot(last % W - t % W, ((last / W) | 0) - ((t / W) | 0));
  out.endSeesTarget = !!sight(cost, last, t);
  return out;
}

if (false) module.exports = { W, H, C, OLD, buildGround, buildHierarchy, planNew, buildOld, planOld, fineAStar, sight };

(() => {
const reduce = REDUCED || STILL;
const PV = document.querySelector('.pv'), CSS = new Map(); const css = (n) => { if (!CSS.has(n)) CSS.set(n, getComputedStyle(PV).getPropertyValue(n).trim()); return CSS.get(n); };
const $ = (id) => document.getElementById(id);
const redrawers = [];

/** Sizes a canvas to its CSS width and the device pixel ratio; returns a context in CSS pixels. */
function fit(cv, aspect) {
  const w = cv.clientWidth || cv.parentElement.clientWidth, h = Math.round(w * aspect), r = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); cv.style.height = h + 'px'; }
  const g = cv.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); return { g, w, h };
}
function chips(el, labels, on, cb) {
  el.innerHTML = '';
  labels.forEach((l, i) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = l; b.setAttribute('aria-pressed', i === on); b.onclick = () => { [...el.children].forEach((c, j) => c.setAttribute('aria-pressed', j === i)); cb(i); }; el.appendChild(b); });
}
function hatch(g, x, y, w, h, color, step = 5) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = color; g.lineWidth = 1; g.beginPath();
  for (let k = -h; k < w; k += step) { g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); } g.stroke(); g.restore();
}
function tag(g, text, x, y, color, align = 'left') {
  g.font = '500 11px "JetBrains Mono Variable", monospace'; const m = g.measureText(text).width, pad = 4;
  const bx = align === 'right' ? x - m - 2 * pad : align === 'center' ? x - m / 2 - pad : x;
  g.fillStyle = css('--plate'); g.globalAlpha = .9; g.fillRect(bx, y - 9, m + 2 * pad, 17); g.globalAlpha = 1;
  g.strokeStyle = color; g.lineWidth = 1; g.strokeRect(bx + .5, y - 8.5, m + 2 * pad - 1, 16);
  g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, bx + pad, y);
}
function arrow(g, x0, y0, x1, y1, color, w = 1.5, head = 6) {
  const a = Math.atan2(y1 - y0, x1 - x0); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(a) * head * .6, y1 - Math.sin(a) * head * .6); g.stroke();
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - head * Math.cos(a - .45), y1 - head * Math.sin(a - .45)); g.lineTo(x1 - head * Math.cos(a + .45), y1 - head * Math.sin(a + .45)); g.closePath(); g.fill();
}

/* =================== HERO: one cell, as a bit and as pieces =================== */
const heroText = [
  'The cells: each 1 m cell is free or blocked. A garden wall runs diagonally through this 8 × 8 m block.',
  'One mark per square: the free ground is split in two, so the mark is "closed", and both sides of the wall are lost.',
  'Areas: colour the free cells that touch each other. The wall leaves two groups: two areas.',
  'Each area gets its own doors into the next blocks. Nothing joins the two areas, so no path can cross the wall.'
];
let heroState = reduce ? 3 : 0, heroT0 = performance.now(), heroAuto = !reduce;
const HN = 8, heroBlocked = (x, y) => x + y === 7 || (x === 0 && y === 7);
const heroPiece = (x, y) => heroBlocked(x, y) ? -1 : x + y < 7 ? 0 : 1;
function drawHero(now) {
  const { g, w, h } = fit($('hero'), 420 / 520);
  g.clearRect(0, 0, w, h);
  const cs = Math.min(w, h) / (HN + 3), ox = (w - cs * (HN + 2)) / 2, oy = (h - cs * (HN + 2)) / 2;
  const t = Math.min(1, (now - heroT0) / 900);
  const X = (x) => ox + (x + 1) * cs, Y = (y) => oy + (y + 1) * cs;
  // neighbour ring, faded
  for (let y = -1; y <= HN; y++) for (let x = -1; x <= HN; x++) {
    const inside = x >= 0 && y >= 0 && x < HN && y < HN;
    if (inside) continue;
    g.fillStyle = css('--t-open'); g.globalAlpha = .35; g.fillRect(X(x) + 1, Y(y) + 1, cs - 2, cs - 2); g.globalAlpha = 1;
  }
  const order = []; // flood order for the fill animation
  { const seen = new Set(); for (const [sx, sy] of [[0, 0], [7, 7]]) { const q = [[sx, sy]]; seen.add(sx + ',' + sy); while (q.length) { const [x, y] = q.shift(); order.push([x, y]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= HN || ny >= HN || seen.has(k) || heroBlocked(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } } } }
  const filled = heroState >= 3 ? order.length : heroState === 2 ? Math.floor(order.length * t) : 0;
  const fillSet = new Map(); order.slice(0, filled).forEach(([x, y]) => fillSet.set(x + ',' + y, 1));
  for (let y = 0; y < HN; y++) for (let x = 0; x < HN; x++) {
    const b = heroBlocked(x, y);
    g.fillStyle = b ? css('--t-wall') : css('--t-open'); g.fillRect(X(x) + 1, Y(y) + 1, cs - 2, cs - 2);
    if (!b && fillSet.has(x + ',' + y)) { g.fillStyle = heroPiece(x, y) ? css('--tint-2') : css('--tint-1'); g.fillRect(X(x) + 1, Y(y) + 1, cs - 2, cs - 2); }
  }
  g.strokeStyle = css('--ink'); g.lineWidth = 2; g.strokeRect(X(0), Y(0), cs * HN, cs * HN);
  if (heroState === 1) {
    g.globalAlpha = t; hatch(g, X(0), Y(0), cs * HN, cs * HN, css('--carmine'), 7);
    g.strokeStyle = css('--carmine'); g.lineWidth = 4; g.beginPath(); g.moveTo(X(1), Y(1)); g.lineTo(X(7), Y(7)); g.moveTo(X(7), Y(1)); g.lineTo(X(1), Y(7)); g.stroke();
    g.globalAlpha = 1; tag(g, 'ONE MARK: CLOSED', X(4), Y(0) - cs * .5, css('--carmine'), 'center');
  }
  if (heroState === 2 && t >= 1 || heroState === 3) {
    tag(g, 'AREA 1', X(1.2), Y(2.2), css('--prussian')); tag(g, 'AREA 2', X(4.2), Y(6.2), css('--gold'));
  }
  if (heroState === 3) {
    const a = Math.min(1, t * 1.3); g.globalAlpha = a;
    const n1 = [X(2.2), Y(2.2)], n2 = [X(5.8), Y(5.8)];
    const cross1 = [[X(3.5), Y(0)], [X(0), Y(3.5)]], cross2 = [[X(4.5), Y(8)], [X(8), Y(4.5)]];
    for (const [cx, cy] of cross1) { g.strokeStyle = css('--prussian'); g.lineWidth = 2; g.beginPath(); g.moveTo(n1[0], n1[1]); g.lineTo(cx, cy); g.stroke(); }
    for (const [cx, cy] of cross2) { g.strokeStyle = css('--gold'); g.lineWidth = 2; g.beginPath(); g.moveTo(n2[0], n2[1]); g.lineTo(cx, cy); g.stroke(); }
    for (const [cx, cy, c] of [...cross1.map((p) => [...p, '--prussian']), ...cross2.map((p) => [...p, '--gold'])]) { g.fillStyle = css(c); g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 2; g.stroke(); }
    for (const [n, c] of [[n1, '--prussian'], [n2, '--gold']]) { g.fillStyle = css(c); g.beginPath(); g.arc(n[0], n[1], 9, 0, 7); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 3; g.stroke(); }
    g.setLineDash([4, 4]); g.strokeStyle = css('--carmine'); g.lineWidth = 1.5; g.beginPath(); g.moveTo(n1[0] + 12, n1[1] + 12); g.lineTo(n2[0] - 12, n2[1] - 12); g.stroke(); g.setLineDash([]);
    tag(g, 'NOT JOINED', (n1[0] + n2[0]) / 2 + 8, (n1[1] + n2[1]) / 2 - 2, css('--carmine'));
    g.globalAlpha = 1;
  }
  $('heroCap').textContent = ['One 8 × 8 m block', 'One mark for the whole square', 'Split into areas', 'Doors for each area'][heroState];
}
const heroLabel = document.createElement('p'); heroLabel.className = 'hero-label'; $('heroSteps').before(heroLabel);
function setHero(i, manual) { heroState = i; heroT0 = performance.now(); heroLabel.textContent = heroText[i]; if (manual) heroAuto = false; [...$('heroSteps').children].forEach((c, j) => c.setAttribute('aria-pressed', j === i)); }
chips($('heroSteps'), ['1 · cells', '2 · one mark', '3 · areas', '4 · doors'], heroState, (i) => setHero(i, true));
setHero(heroState, false);
if (heroAuto) setInterval(() => { if (heroAuto) setHero((heroState + 1) % 4, false); }, 3600);
redrawers.push(() => drawHero(performance.now()));

/* =================== CASES =================== */
const CASES = [
  { title: '(a) A thin wall through a square', pat: [
    '...........#', '..........#.', '.........#..', '........#...', '.......#....', '......#.....', '.....#......', '....#.......'],
    bit: 'The wall splits these squares in two, so they are marked closed. The ground along the wall is lost on both sides.',
    pieces: 'Each split square keeps two areas, one each side of the wall. Units can use either side, and nothing joins the two.',
    vb: ['GROUND ALONG THE WALL LOST', 'bad'], vp: ['BOTH SIDES USABLE', 'good'] },
  { title: '(b) An order into a 3 m lane', pat: [
    '............', '############', '............', '.......T....', '............', '############', '............', '............'], target: [7, 3],
    bit: 'A unit on the street (black dot) is sent to the red diamond, at the end of a bent lane between garden walls. Every square the lane runs through also holds part of a yard behind a wall. That is two separate parts, so the square is marked <b>closed</b>. The target\'s square is closed too, so the planner can\'t get there. It stops at the nearest square it did reach: in the yard, on the other side of the wall.',
    pieces: 'Same order. Now each square keeps its parts apart: the lane (blue) is one area, the yard another. Doors (gold) join the lane area of one square to the lane area of the next. From the street, the doors lead up the lane, round the bend, to the target.',
    vb: ['STOPS ACROSS THE WALL', 'bad'], vp: ['WALKS THE LANE TO IT', 'good'] },
  { title: '(c) A start inside a wall\'s buffer', pat: [
    '............', '............', '............', '#####S######', '############', '............', '............', '............'], start: [5, 3],
    bit: 'The unit was pushed into the buffer zone beside a wall (blocked cells). From there the planner can\'t tell which side it came from. It may pick the far side, and the path goes through the wall.',
    pieces: 'Areas don\'t fix this one. Remembering the last free cell the unit stood on does: the path starts there, on its own side.',
    vb: ['MAY GO THROUGH THE WALL', 'bad'], vp: ['LEAVES BY ITS OWN SIDE', 'good'] }
];
let caseMode = 0;
const caseEls = CASES.map((c) => {
  const el = document.createElement('article'); el.className = 'case plate';
  el.innerHTML = `<canvas height="240"></canvas><div class="body"><h3>${c.title}</h3><div class="verdict"></div><p class="txt"></p></div>`;
  $('cases').appendChild(el); return el;
});
function piecesOf(pat) { // 4-connected pieces inside each 4 x 4 cell
  const lab = pat.map((r) => [...r].map(() => -1)); let n = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
    if (pat[y][x] === '#' || lab[y][x] >= 0) continue;
    const st = [[x, y]]; lab[y][x] = n;
    while (st.length) { const [px, py] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= 12 || ny >= 8) continue; if ((nx >> 2) !== (px >> 2) || (ny >> 2) !== (py >> 2)) continue; if (pat[ny][nx] === '#' || lab[ny][nx] >= 0) continue; lab[ny][nx] = n; st.push([nx, ny]); } }
    n++;
  }
  return lab;
}
/** Case (b) drawn as a real bent lane: street, lane mouth, yards, the unit's start and its target. */
const LANE = ['................', '.....###########', '.....#.........#', '.....#.......T.#', '.....#.........#', '.....#...#######',
  '.....#...#......', '.....#...#......', '.....#...#......', '.....#...#......', '.....#...#......', '................'];
function drawLane(c, el) {
  const { g, w, h } = fit(el.querySelector('canvas'), 0.78); g.clearRect(0, 0, w, h);
  const CW = 16, CH = 12, cs = Math.min((w - 20) / CW, (h - 20) / CH), ox = (w - cs * CW) / 2, oy = (h - cs * CH) / 2;
  const free = (x, y) => LANE[y][x] !== '#';
  const isLane = (x, y) => free(x, y) && ((x >= 6 && x <= 8 && y >= 2 && y <= 10) || (y >= 2 && y <= 4 && x >= 6 && x <= 14));
  const isStreet = (x, y) => y === 11;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    g.fillStyle = !free(x, y) ? css('--t-wall') : isStreet(x, y) ? css('--t-road') : css('--t-open');
    g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1);
  }
  // squares: 4 x 4 cells; closed when their free cells are in more than one piece
  const closed = [];
  for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 4; sx++) {
    const seen = new Set(); let pieces = 0;
    for (let y = sy * 4; y < sy * 4 + 4; y++) for (let x = sx * 4; x < sx * 4 + 4; x++) {
      if (!free(x, y) || seen.has(x + ',' + y)) continue; pieces++; const st = [[x, y]]; seen.add(x + ',' + y);
      while (st.length) { const [px, py] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = px + dx, ny = py + dy, k = nx + ',' + ny; if (nx < sx * 4 || ny < sy * 4 || nx >= sx * 4 + 4 || ny >= sy * 4 + 4 || seen.has(k) || !free(nx, ny)) continue; seen.add(k); st.push([nx, ny]); } }
    }
    if (pieces !== 1) closed.push([sx, sy]);
  }
  if (caseMode === 0) for (const [sx, sy] of closed) { g.globalAlpha = .7; hatch(g, ox + sx * 4 * cs, oy + sy * 4 * cs, 4 * cs, 4 * cs, css('--carmine'), 7); g.globalAlpha = 1; }
  else for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (isLane(x, y)) { g.fillStyle = css('--tint-1'); g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1); }
  g.strokeStyle = css('--ink'); g.lineWidth = 2; for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 4; sx++) g.strokeRect(ox + sx * 4 * cs, oy + sy * 4 * cs, 4 * cs, 4 * cs);
  const P = (x, y) => [ox + x * cs, oy + y * cs];
  if (caseMode === 0) for (const [sx, sy] of closed) { const [x, y] = P(sx * 4 + .15, sy * 4 + .2); g.font = '500 9.5px "JetBrains Mono Variable", monospace'; g.fillStyle = css('--carmine'); g.textBaseline = 'top'; g.fillText('CLOSED', x, y); }
  // labels
  const lab = (t, x, y, col) => tag(g, t, ...P(x, y), css(col), 'center');
  lab('YARD', 2, 6.5, '--ink-2'); lab('YARD', 12.6, 8.2, '--ink-2'); lab('STREET', 12, 11.5, '--ink-2');
  if (caseMode === 1) lab('LANE', 10.5, 2.5, '--prussian');
  const [sx0, sy0] = P(1.5, 11.5), [tx, ty] = P(13.5, 3.5);
  const poly = (pts, col, wd, dash) => { g.beginPath(); pts.forEach(([x, y], k) => { const [px, py] = P(x, y); k ? g.lineTo(px, py) : g.moveTo(px, py); }); g.setLineDash(dash || []); g.strokeStyle = col; g.lineWidth = wd; g.lineJoin = 'round'; g.stroke(); g.setLineDash([]); };
  if (caseMode === 0) {
    poly([[1.5, 11.5], [10, 11.5], [13.5, 9.5]], css('--violet'), 2.5, [6, 4]);
    const [ex, ey] = P(13.5, 9.5); g.fillStyle = css('--violet'); g.fillRect(ex - 6, ey - 6, 12, 12);
    g.setLineDash([2, 3]); g.strokeStyle = css('--violet'); g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(tx, ty + 8); g.stroke(); g.setLineDash([]);
    tag(g, 'STOPS HERE', ex - 10, ey + 2, css('--violet'), 'right');
  } else {
    poly([[1.5, 11.5], [7.5, 11.5], [7.5, 3.5], [13.5, 3.5]], css('--plate'), 6); poly([[1.5, 11.5], [7.5, 11.5], [7.5, 3.5], [13.5, 3.5]], css('--carmine'), 3);
    for (const [x, y] of [[8, 3.5], [12, 3.5], [7.5, 4], [7.5, 8]]) { const [px, py] = P(x, y); g.fillStyle = css('--gold'); g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 2; g.stroke(); }
  }
  g.fillStyle = css('--ink'); g.beginPath(); g.arc(sx0, sy0, 7, 0, 7); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 2; g.stroke();
  g.fillStyle = css('--carmine'); g.beginPath(); g.moveTo(tx, ty - 8); g.lineTo(tx + 8, ty); g.lineTo(tx, ty + 8); g.lineTo(tx - 8, ty); g.closePath(); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 2; g.stroke();
  const v = caseMode === 0 ? c.vb : c.vp; const vd = el.querySelector('.verdict'); vd.textContent = (caseMode === 0 ? 'ONE MARK → ' : 'AREAS → ') + v[0]; vd.className = 'verdict ' + v[1];
  el.querySelector('.txt').innerHTML = caseMode === 0 ? c.bit : c.pieces;
}
function drawCase(c, el, i) {
  if (i === 1) return drawLane(c, el);
  const { g, w, h } = fit(el.querySelector('canvas'), 0.62);
  g.clearRect(0, 0, w, h);
  const pat = c.pat.map((r) => r.replace(/[TS]/g, (m) => (m === 'S' ? '#' : '.')));
  const cs = Math.min((w - 24) / 12, (h - 24) / 8), ox = (w - cs * 12) / 2, oy = (h - cs * 8) / 2;
  const lab = piecesOf(pat);
  const tints = ['--tint-1', '--tint-2', '--tint-3'];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
    const b = pat[y][x] === '#'; g.fillStyle = b ? css('--t-wall') : css('--t-open');
    if (i === 2 && b) g.fillStyle = y === 3 && x !== 4 && x !== 7 ? css('--t-house') : css('--t-wall');
    g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1);
  }
  if (i === 2) { // the pad band: a thin real wall in the middle of a blocked band
    for (let x = 0; x < 12; x++) { g.fillStyle = css('--t-house'); g.globalAlpha = .55; g.fillRect(ox + x * cs + .5, oy + 3 * cs + .5, cs - 1, 2 * cs - 1); g.globalAlpha = 1; }
    g.fillStyle = css('--t-wall'); g.fillRect(ox, oy + 3.85 * cs, cs * 12, cs * .3);
  }
  // coarse cells
  for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 3; cx++) {
    const set = new Set(); for (let y = cy * 4; y < cy * 4 + 4; y++) for (let x = cx * 4; x < cx * 4 + 4; x++) if (lab[y][x] >= 0) set.add(lab[y][x]);
    const X = ox + cx * 4 * cs, Y = oy + cy * 4 * cs;
    if (caseMode === 0) {
      if (set.size !== 1) hatch(g, X, Y, 4 * cs, 4 * cs, css('--carmine'), 6);
    } else {
      const ids = [...set].sort((a, b) => a - b);
      for (let y = cy * 4; y < cy * 4 + 4; y++) for (let x = cx * 4; x < cx * 4 + 4; x++) {
        const l = lab[y][x]; if (l < 0) continue;
        let k = ids.indexOf(l); if (i === 1) k = y >= 2 && y <= 4 ? 1 : y < 1 ? 0 : 2; if (i === 2) k = y < 3 ? 0 : 2; if (i === 0) k = x + y < 11 ? 0 : 1;
        g.fillStyle = css(tints[k]); g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1);
      }
    }
    g.strokeStyle = css('--ink'); g.lineWidth = 1.5; g.strokeRect(X, Y, 4 * cs, 4 * cs);
  }
  const P = (x, y) => [ox + (x + .5) * cs, oy + (y + .5) * cs];
  if (i === 1) {
    const [tx, ty] = P(7, 3);
    if (caseMode === 0) { const [ex, ey] = P(7, 6.5); g.setLineDash([3, 3]); g.strokeStyle = css('--violet'); g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]); g.fillStyle = css('--violet'); g.fillRect(ex - 5, ey - 5, 10, 10); tag(g, 'FORMS UP HERE', ex + 9, ey, css('--violet')); }
    else { g.strokeStyle = css('--carmine'); g.lineWidth = 2.5; g.beginPath(); const [ax, ay] = P(-.4, 3); g.moveTo(ax, ay); g.lineTo(tx, ty); g.stroke(); }
    g.fillStyle = css('--carmine'); g.beginPath(); g.moveTo(tx, ty - 7); g.lineTo(tx + 7, ty); g.lineTo(tx, ty + 7); g.lineTo(tx - 7, ty); g.closePath(); g.fill();
    for (let cx = 1; cx < 3 && caseMode === 1; cx++) { const [bx, by] = [ox + cx * 4 * cs, oy + 3 * cs]; g.fillStyle = css('--gold'); g.beginPath(); g.arc(bx, by, 4, 0, 7); g.fill(); }
  }
  if (i === 2) {
    const [sx, sy] = P(5, 3.5);
    if (caseMode === 0) { arrow(g, sx, sy, P(5, 6)[0], P(5, 6)[1], css('--violet'), 2); tag(g, 'FLOOD EXITS SOUTH', P(6, 6)[0], P(6, 6)[1], css('--violet')); }
    else { for (let k = 0; k < 4; k++) { const [px, py] = P(1 + k, 1.2 + k * .35); g.fillStyle = css('--ink-3'); g.beginPath(); g.arc(px, py, 2.5, 0, 7); g.fill(); } const [lx, ly] = P(4.6, 2); g.strokeStyle = css('--carmine'); g.lineWidth = 2; g.strokeRect(lx - cs / 2, ly - cs / 2, cs, cs); arrow(g, sx, sy, lx, ly + 6, css('--carmine'), 2); tag(g, 'LAST FREE CELL', lx + cs * .7, ly, css('--carmine')); }
    g.fillStyle = css('--ink'); g.beginPath(); g.arc(sx, sy, 6, 0, 7); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 2; g.stroke();
  }
  const v = caseMode === 0 ? c.vb : c.vp; const vd = el.querySelector('.verdict'); vd.textContent = (caseMode === 0 ? 'ONE MARK → ' : 'AREAS → ') + v[0]; vd.className = 'verdict ' + v[1];
  el.querySelector('.txt').textContent = caseMode === 0 ? c.bit : c.pieces;
}
chips($('caseMode'), ['One mark per square', 'Areas and doors'], 0, (i) => { caseMode = i; drawCases(); });
function drawCases() { CASES.forEach((c, i) => drawCase(c, caseEls[i], i)); }
redrawers.push(drawCases);

/* =================== THE LAB =================== */
const ground = buildGround(), cost = ground.cost, kind = ground.kind;
const hz = buildHierarchy(cost), old = buildOld(cost);
const P = (x, y) => y * W + x;
const PRESETS = [
  { name: 'Into the bent lane', sub: 'case (b): a target round a corner between walls', s: P(12, 70), t: P(56, 39) },
  { name: 'Along a diagonal wall', sub: 'case (a): a 4 m strip between two slanted walls', s: P(14, 34), t: P(33, 16) },
  { name: 'Ford or bridge?', sub: 'cost: the ford is slow but much shorter', s: P(90, 15), t: P(140, 50) },
  { name: 'Into the walled garden', sub: 'its own region: can\'t be reached, known at once', s: P(60, 20), t: P(80, 38) },
  { name: 'Corner to corner', sub: 'the longest trip on this ground', s: P(2, 95), t: P(155, 5) }
];
const TOGGLES = [
  ['islands', 'Ground it can\'t reach (other regions)', true, '--gold'], ['pieces', '10 m blocks; tinted where split into areas', true, '--prussian'],
  ['graph', 'Doors and their links', false, '--gold'], ['work', 'What the new planner looked at', true, '--carmine'],
  ['old', 'Coarse planner (4 m squares, one mark)', true, '--violet'], ['closed', 'Its closed squares', false, '--violet'], ['oracle', 'What exact A* looked at', false, '--ink-3']
];
const show = {}; TOGGLES.forEach(([k, , on]) => (show[k] = on));
TOGGLES.forEach(([k, label, on, col]) => {
  const l = document.createElement('label'); l.innerHTML = `<input type="checkbox" id="tg-${k}" ${on ? 'checked' : ''}><span class="sw" style="background:var(${col})"></span><span>${label}</span>`;
  l.querySelector('input').onchange = (e) => { show[k] = e.target.checked; drawLab(performance.now()); }; $('toggles').appendChild(l);
});
let plan = null, animT0 = 0, clickMode = 0, pendingStart = null, presetIdx = 0;
PRESETS.forEach((p, i) => { const b = document.createElement('button'); b.className = 'preset'; b.innerHTML = `${p.name}<small>${p.sub}</small>`; b.setAttribute('aria-pressed', i === 0); b.onclick = () => runPreset(i); $('presets').appendChild(b); });
const PHASES = [['1 · Reachable?', 'Same region as the start? One check.'], ['2 · Doors', 'Find the doors of the start\'s and target\'s own areas.'], ['3 · Route', 'A* over doors only (gold dots).'], ['4 · Steps', 'A* over cells, only in the route\'s blocks (red).'], ['5 · Straighten', 'Skip points where the straight line is clear.']];
PHASES.forEach(([a, b]) => { const d = document.createElement('div'); d.className = 'phase'; d.innerHTML = `<b>${a}</b>${b}`; $('phases').appendChild(d); });
const DUR = reduce ? [0, 0, 0, 0, 0] : [500, 450, 1100, 1300, 700];
function runPreset(i) { presetIdx = i; [...$('presets').children].forEach((c, j) => c.setAttribute('aria-pressed', j === i)); compute(PRESETS[i].s, PRESETS[i].t); }
function compute(s, t) {
  const n = planNew(cost, hz, s, t), o = planOld(cost, old, s, t), ex = fineAStar(cost, s, n.g);
  plan = { n, o, ex }; animT0 = performance.now(); stats(); if (!loopOn) loop();
}
function nearestFree(i) { let best = i, bd = Infinity; const x0 = i % W, y0 = (i / W) | 0; for (let y = Math.max(0, y0 - 6); y < Math.min(H, y0 + 7); y++) for (let x = Math.max(0, x0 - 6); x < Math.min(W, x0 + 7); x++) { const d = (x - x0) ** 2 + (y - y0) ** 2; if (cost[y * W + x] && d < bd) { bd = d; best = y * W + x; } } return best; }
$('lab').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  [...$('presets').children].forEach((c) => c.setAttribute('aria-pressed', false));
  if (clickMode === 0) { pendingStart = cost[P(x, y)] ? P(x, y) : nearestFree(P(x, y)); clickMode = 1; $('hint').textContent = 'click: set target'; plan = null; drawLab(performance.now()); }
  else { clickMode = 0; $('hint').textContent = 'click: set start'; compute(pendingStart, P(x, y)); }
});
$('replay').onclick = () => { if (plan) { animT0 = performance.now(); if (!loopOn) loop(); } };

// the terrain, one pixel a cell, painted once per theme
let baseCv = null;
function paintBase() {
  baseCv = document.createElement('canvas'); baseCv.width = W; baseCv.height = H; const g = baseCv.getContext('2d'); const img = g.createImageData(W, H);
  const cols = ['--t-open', '--t-road', '--t-crops', '--t-wood', '--t-marsh', '--t-water', '--t-ford', '--t-house', '--t-wall'].map((n) => { const c = css(n); const m = c.match(/\w\w/g).map((h) => parseInt(h, 16)); return m; });
  for (let i = 0; i < W * H; i++) {
    const c = cols[kind[i]], x = i % W, y = (i / W) | 0, nse = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 13 - 6;
    const k = kind[i] === 7 || kind[i] === 8 ? 0 : nse + (kind[i] === 2 && x % 3 === 0 ? -8 : 0);
    img.data[i * 4] = c[0] + k; img.data[i * 4 + 1] = c[1] + k; img.data[i * 4 + 2] = c[2] + k; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
let pieceTint = null;
function piecesLayer() { // which cells sit in a cluster with more than one piece, and their piece rank
  pieceTint = new Int8Array(W * H).fill(-1);
  for (let cy = 0; cy < H / C; cy++) for (let cx = 0; cx < W / C; cx++) {
    const ids = [];
    for (let y = cy * C; y < cy * C + C; y++) for (let x = cx * C; x < cx * C + C; x++) { const l = hz.pc.lab[y * W + x]; if (l >= 0 && !ids.includes(l)) ids.push(l); }
    if (ids.length < 2) continue;
    for (let y = cy * C; y < cy * C + C; y++) for (let x = cx * C; x < cx * C + C; x++) { const l = hz.pc.lab[y * W + x]; if (l >= 0) pieceTint[y * W + x] = ids.indexOf(l) % 3; }
  }
}
piecesLayer();
const ctr = (i, s) => [((i % W) + .5) * s, (((i / W) | 0) + .5) * s];
function line(g, cells, s, color, w, frac = 1, dash) {
  if (!cells || cells.length < 2) return;
  const pts = cells.map((c) => ctr(c, s)); let total = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  let left = total * frac; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) { const d = seg[i - 1]; if (d <= left) { g.lineTo(pts[i][0], pts[i][1]); left -= d; } else { const f = left / d; g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); left = 0; } }
  g.setLineDash(dash || []); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = w; g.stroke(); g.setLineDash([]);
}
function drawLab(now) {
  const { g, w, h } = fit($('lab'), H / W);
  const s = w / W; g.imageSmoothingEnabled = false; if (!baseCv) paintBase(); g.drawImage(baseCv, 0, 0, w, h);
  // label the landmarks
  const lbl = (t, x, y) => { g.font = 'italic 13px "IM Fell English", Georgia, serif'; g.fillStyle = css('--ink'); g.globalAlpha = .75; g.fillText(t, x * s, y * s); g.globalAlpha = 1; };
  lbl('the brook', 109, 96); lbl('ford', 112, 16); lbl('bridge', 99, 66); lbl('marsh', 90, 80); lbl('wood', 130, 31); lbl('walled garden', 73, 30); lbl('bent lane', 50, 35); lbl('village', 24, 92);
  const startIsl = plan ? hz.isl.lab[plan.n.s] : hz.isl.lab[pendingStart ?? P(2, 95)];
  if (show.islands) { for (let i = 0; i < W * H; i++) if (cost[i] && hz.isl.lab[i] !== startIsl) { const [x, y] = [(i % W) * s, ((i / W) | 0) * s]; g.fillStyle = css('--gold'); g.globalAlpha = .45; g.fillRect(x, y, s, s); g.globalAlpha = 1; } }
  if (show.pieces) {
    const tints = ['--tint-1', '--tint-2', '--tint-3'].map(css);
    for (let i = 0; i < W * H; i++) if (pieceTint[i] >= 0) { g.fillStyle = tints[pieceTint[i]]; g.fillRect((i % W) * s, ((i / W) | 0) * s, s, s); }
    g.strokeStyle = css('--ink'); g.globalAlpha = .28; g.lineWidth = 1; g.beginPath();
    for (let x = C; x < W; x += C) { g.moveTo(x * s + .5, 0); g.lineTo(x * s + .5, h); } for (let y = C; y < H; y += C) { g.moveTo(0, y * s + .5); g.lineTo(w, y * s + .5); } g.stroke(); g.globalAlpha = 1;
  }
  if (show.closed) { for (let k = 0; k < old.CW * old.CH; k++) if (!old.open[k]) { let any = false; for (let y = 0; y < OLD && !any; y++) for (let x = 0; x < OLD; x++) if (cost[((k / old.CW | 0) * OLD + y) * W + (k % old.CW) * OLD + x]) { any = true; break; } if (any) hatch(g, (k % old.CW) * OLD * s, ((k / old.CW) | 0) * OLD * s, OLD * s, OLD * s, css('--violet'), 4); } }
  if (show.graph) {
    g.strokeStyle = css('--gold'); g.globalAlpha = .35; g.lineWidth = 1; g.beginPath();
    for (const [a, b] of hz.intra) { const [x0, y0] = ctr(hz.nodes[a], s), [x1, y1] = ctr(hz.nodes[b], s); g.moveTo(x0, y0); g.lineTo(x1, y1); } g.stroke(); g.globalAlpha = 1;
    g.fillStyle = css('--gold'); for (const [a, b] of hz.crossings) { const [x0, y0] = ctr(a, s), [x1, y1] = ctr(b, s); g.beginPath(); g.arc((x0 + x1) / 2, (y0 + y1) / 2, Math.max(1.6, s * .45), 0, 7); g.fill(); }
  }
  if (!plan) { if (pendingStart != null) { const [x, y] = ctr(pendingStart, s); g.fillStyle = css('--ink'); g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); } setPhase(-1); return false; }
  const { n, o, ex } = plan, el = now - animT0; const cum = DUR.reduce((a, d) => (a.push(a[a.length - 1] + d), a), [0]);
  const prog = (k) => DUR[k] === 0 ? (el >= cum[k] ? 1 : 0) : Math.max(0, Math.min(1, (el - cum[k]) / DUR[k]));
  let phase = 0; for (let k = 0; k < 5; k++) if (el >= cum[k]) phase = k; if (el >= cum[5]) phase = 5; setPhase(phase);
  if (show.oracle) { g.fillStyle = css('--ink-3'); g.globalAlpha = .5; for (const c of ex.order) { const [x, y] = ctr(c, s); g.fillRect(x - s * .22, y - s * .22, s * .44, s * .44); } g.globalAlpha = 1; }
  if (show.work && n.path) {
    // graph search: nodes light up in the order A* settles them
    const p2 = prog(2), m = Math.floor(n.absOrder.length * p2);
    g.fillStyle = css('--gold'); for (let k = 0; k < m; k++) { const [x, y] = ctr(n.absOrder[k], s); g.beginPath(); g.arc(x, y, Math.max(1.8, s * .5), 0, 7); g.fill(); }
    if (p2 >= 1) { g.fillStyle = css('--carmine-wash'); const a3 = prog(3); g.globalAlpha = Math.min(1, a3 * 3); for (const k of n.corridor) { g.fillRect((k % (W / C)) * C * s, ((k / (W / C)) | 0) * C * s, C * s, C * s); } g.globalAlpha = 1;
      line(g, n.abs, s, css('--gold'), 2, 1, [2, 3]);
      const m3 = Math.floor(n.order.length * a3); g.fillStyle = css('--carmine'); g.globalAlpha = .28; for (let k = 0; k < m3; k++) { const c = n.order[k]; g.fillRect((c % W) * s, ((c / W) | 0) * s, s, s); } g.globalAlpha = 1; }
  }
  if (show.old && o.path) {
    line(g, o.path, s, css('--violet'), 2.2, 1, [6, 4]);
    const last = o.path[o.path.length - 1], [lx, ly] = ctr(last, s); g.fillStyle = css('--violet'); g.fillRect(lx - 5, ly - 5, 10, 10);
    if (!o.reached && !n.moved) { const [tx, ty] = ctr(o.target, s); g.setLineDash([2, 3]); g.strokeStyle = css('--violet'); g.lineWidth = 1.2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]); tag(g, `coarse: stops ${o.endGap.toFixed(0)} m away${o.endSeesTarget ? '' : ', behind a wall'}`, lx + 8, ly + 16, css('--violet')); }
  }
  // the final path
  if (n.path) {
    const p4 = prog(3) >= 1 ? 1 : 0, fr = prog(4);
    if (p4) { if (fr < 1 && n.fine) line(g, n.fine, s, css('--carmine'), 1.2, 1); line(g, n.path, s, css('--plate'), 6, reduce ? 1 : Math.max(.001, fr)); line(g, n.path, s, css('--carmine'), 3, reduce ? 1 : Math.max(.001, fr)); }
  }
  // markers
  const [sx, sy] = ctr(n.s, s); g.fillStyle = css('--ink'); g.beginPath(); g.arc(sx, sy, 6.5, 0, 7); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 2; g.stroke();
  const [tx, ty] = ctr(n.target, s);
  if (n.moved) {
    g.strokeStyle = css('--carmine'); g.lineWidth = 2; g.beginPath(); g.moveTo(tx - 6, ty - 6); g.lineTo(tx + 6, ty + 6); g.moveTo(tx + 6, ty - 6); g.lineTo(tx - 6, ty + 6); g.stroke();
    const [gx, gy] = ctr(n.g, s); if (prog(0) >= 1) { arrow(g, tx, ty, gx, gy, css('--carmine'), 1.5); tag(g, 'can\'t be reached: goes to the nearest point it can', Math.max(4, Math.min(gx + 10, w - 330)), gy + 18, css('--carmine')); }
  } else { g.fillStyle = css('--carmine'); g.beginPath(); g.moveTo(tx, ty - 8); g.lineTo(tx + 8, ty); g.lineTo(tx, ty + 8); g.lineTo(tx - 8, ty); g.closePath(); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 2; g.stroke(); }
  return el < cum[5];
}
function setPhase(k) { [...$('phases').children].forEach((c, j) => c.classList.toggle('on', j === k)); }
let loopOn = false;
function loop() { loopOn = true; const more = drawLab(performance.now()); if (more) requestAnimationFrame(loop); else loopOn = false; }
function stats() {
  const { n, o, ex } = plan, f = (v) => v.toLocaleString('en-GB');
  const over = n.cost && ex.cost ? ((n.cost / ex.cost - 1) * 100) : 0;
  const rows = [['Doors on this map', f(hz.nodes.length)], ['Doors looked at (step 3)', f(n.absOrder.length)], ['Cells looked at (step 4)', f(n.order ? n.order.length : 0)],
    ['Exact A*: cells looked at', f(ex.order.length)], ['Longer than the best path', (over < 0.005 ? '0.0' : over.toFixed(1)) + ' %'], ['Coarse: squares looked at', f(o.expanded || 0)]];
  $('stats').innerHTML = rows.map(([a, b], i) => `<dt>${a}</dt><dd class="${i === 2 ? 'big' : ''}">${b}</dd>`).join('');
  const gap = Math.hypot(n.g % W - n.target % W, ((n.g / W) | 0) - ((n.target / W) | 0));
  const vn = n.moved ? `<b>Blocks, areas, doors:</b> ${n.unreachable ? 'the target is in another region, such as the walled garden, so no path exists. One check tells.' : 'the target is on blocked ground.'} The unit goes to the nearest point it can reach, ${gap.toFixed(0)} m away.` : `<b>Blocks, areas, doors:</b> reaches the target.`;
  const vo = !o.path ? '<b>Coarse grid:</b> no path.' : o.reached ? `<b>Coarse grid:</b> also reaches it.` : `<b>Coarse grid:</b> stops ${o.endGap.toFixed(1)} m from the target${o.endSeesTarget ? '' : ', with a wall between'}. ${o.notes[0] ? 'Why: ' + o.notes[0].replace('target cell closed', 'the target\'s square is closed').replace('nothing open in 24 m sees it', 'no open square nearby can see it').replace('goal not reached; ends at the reached cell nearest the target', 'it stops at the nearest square it reached') + '.' : ''}`;
  $('verdicts').innerHTML = `<div class="v-new">${vn}</div><div class="v-old">${vo}</div>`;
}
redrawers.push(() => drawLab(performance.now()));
runPreset(0);

/* =================== BAR CHART (log scale) =================== */
const BARS = [
  { l: 'A* over every cell', sub: 'made-up 3.2 km map, median order (1.8 km)', v: 345, kind: 'm' },
  { l: 'Blocks, areas, doors', sub: 'same orders, median', v: 8.0, kind: 'n' },
  { l: 'Target it can\'t reach', sub: 'region check, same map', v: 0.024, kind: 'z' }
];
const LO = 0.1, HI = 3000, pos = (v) => (Math.log10(Math.max(v, LO)) - Math.log10(LO)) / (Math.log10(HI) - Math.log10(LO)) * 100;
$('bars').innerHTML = `<div style="display:flex;gap:18px;flex-wrap:wrap;font-family:var(--f-mono);font-size:11.5px;color:var(--ink-2)"><span><span class="sw" style="display:inline-block;background:var(--ink-2);vertical-align:middle;margin-right:6px"></span>measured: A* over every cell</span><span><span class="sw" style="display:inline-block;background:var(--carmine);vertical-align:middle;margin-right:6px"></span>measured: blocks, areas, doors</span></div>` +
  BARS.map((b, i) => {
    let bar, val;
    if (b.kind === 'm') { bar = `<div class="pvbar" style="width:${pos(b.v)}%"></div>`; val = `<span class="val" style="left:calc(${pos(b.v)}% + 8px)">${b.v.toLocaleString('en-GB')} ms</span>`; }
    else if (b.kind === 'n') { bar = `<div class="pvbar ours" style="width:${pos(b.v)}%"></div>`; val = `<span class="val" style="left:calc(${pos(b.v)}% + 8px)">${b.v.toLocaleString('en-GB')} ms</span>`; }
    else if (b.kind === 'e') { bar = `<div class="pvbar est" style="width:${pos(b.v[0])}%"></div><div class="pvbar range" style="left:${pos(b.v[0])}%;width:${pos(b.v[1]) - pos(b.v[0])}%;border-radius:0 4px 4px 0"></div>`; val = `<span class="val" style="left:calc(${pos(b.v[1])}% + 8px)">${b.v[0]}–${b.v[1]} ms</span>`; }
    else { bar = `<div class="pvbar est" style="width:4px;border-radius:0 2px 2px 0"></div>`; val = `<span class="val" style="left:14px">0.02 ms, no search</span>`; }
    return `<div class="bar-row" data-i="${i}"><div class="bar-label">${b.l}<small>${b.sub}</small></div><div class="track">${bar}${val}</div></div>`;
  }).join('');
$('axis').innerHTML = [0.1, 1, 10, 100, 1000].map((t) => `<span class="tick" style="left:${pos(t)}%">${t < 1 ? t : t.toLocaleString('en-GB')} ms</span>`).join('');
const tip = $('tip');
document.querySelectorAll('.bar-row').forEach((r) => {
  const b = BARS[+r.dataset.i];
  const text = b.kind === 'm' || b.kind === 'n' ? `${b.l}: ${b.v.toLocaleString('en-GB')} ms, measured (${b.sub})` : b.kind === 'e' ? `${b.l}, ${b.sub}: ${b.v[0]}–${b.v[1]} ms, until the spike measures it` : `${b.l}: 0.02 ms, one check, no search (measured)`;
  r.addEventListener('mousemove', (e) => { tip.hidden = false; tip.textContent = text; tip.style.left = Math.min(e.clientX + 14, innerWidth - 300) + 'px'; tip.style.top = e.clientY + 14 + 'px'; });
  r.addEventListener('mouseleave', () => (tip.hidden = true));
});

/* =================== THE SEARCH ELLIPSE =================== */
function drawEllipse() {
  const { g, w, h } = fit($('ellipse'), 0.34); g.clearRect(0, 0, w, h);
  const half = w / 2, pad = 16, mapW = half - 2 * pad, mapH = h - 2 * pad - 22, side = Math.min(mapW, mapH);
  const L = 4000, MAP = 3200, slack = 1.18; // a long trip across a 3.2 km map
  const a = L * slack / 2, b = Math.sqrt(a * a - (L / 2) * (L / 2));
  const panels = [[pad, 'Searching cells', `about ${(Math.PI * a * b / 1e6).toFixed(1)} million cells`], [half + pad, 'Searching blocks, then a strip of cells', `about ${Math.round(Math.PI * a * b / 1024).toLocaleString('en-GB')} blocks + at most ${(L * 32 / 1000).toFixed(0)},000 cells`]];
  panels.forEach(([x0, title, cap], pi) => {
    const sc = side / MAP, ox = x0 + (mapW - side) / 2, oy = pad + 20;
    g.fillStyle = css('--t-open'); g.fillRect(ox, oy, side, side);
    const cx = MAP / 2, cy = MAP / 2, ang = Math.atan2(-2400, 3200); // the route: from lower left to upper right
    const sx = cx - Math.cos(ang) * L / 2, sy = cy - Math.sin(ang) * L / 2, ex = cx + Math.cos(ang) * L / 2, ey = cy + Math.sin(ang) * L / 2;
    const inside = (px, py) => { const dx = px - cx, dy = py - cy, u = dx * Math.cos(ang) + dy * Math.sin(ang), v = -dx * Math.sin(ang) + dy * Math.cos(ang); return (u * u) / (a * a) + (v * v) / (b * b) <= 1; };
    if (pi === 0) { g.fillStyle = css('--carmine'); g.globalAlpha = .45; const st = 40; for (let y = 0; y < MAP; y += st) for (let x = 0; x < MAP; x += st) if (inside(x + st / 2, y + st / 2)) g.fillRect(ox + x * sc, oy + y * sc, Math.max(1, st * sc - .6), Math.max(1, st * sc - .6)); g.globalAlpha = 1; }
    else {
      const st = 32 * 4; // clusters drawn 4 to a tile so they stay visible
      g.strokeStyle = css('--ink'); g.globalAlpha = .12; g.beginPath(); for (let x = 0; x <= MAP; x += st) { g.moveTo(ox + x * sc, oy); g.lineTo(ox + x * sc, oy + side); g.moveTo(ox, oy + x * sc); g.lineTo(ox + side, oy + x * sc); } g.stroke(); g.globalAlpha = 1;
      g.fillStyle = css('--gold'); for (let y = 0; y < MAP; y += st) for (let x = 0; x < MAP; x += st) if (inside(x + st / 2, y + st / 2)) { g.beginPath(); g.arc(ox + (x + st / 2) * sc, oy + (y + st / 2) * sc, Math.max(1.4, st * sc * .16), 0, 7); g.fill(); }
      g.strokeStyle = css('--carmine'); g.globalAlpha = .35; g.lineWidth = Math.max(3, 32 * 3 * sc); g.beginPath(); g.moveTo(ox + sx * sc, oy + sy * sc); g.lineTo(ox + ex * sc, oy + ey * sc); g.stroke(); g.globalAlpha = 1;
    }
    g.strokeStyle = css('--ink'); g.lineWidth = 1; g.strokeRect(ox + .5, oy + .5, side - 1, side - 1);
    g.strokeStyle = css('--carmine'); g.lineWidth = 2; g.beginPath(); g.moveTo(ox + sx * sc, oy + sy * sc); g.lineTo(ox + ex * sc, oy + ey * sc); g.stroke();
    g.font = '500 12px "JetBrains Mono Variable", monospace'; g.fillStyle = css('--ink'); g.textBaseline = 'alphabetic'; g.textAlign = 'center'; g.fillText(title, x0 + mapW / 2, pad + 8);
    g.fillStyle = css('--ink-2'); g.fillText(cap, x0 + mapW / 2, oy + side + 16); g.textAlign = 'left';
  });
}
redrawers.push(drawEllipse);

/* =================== THE GAMES =================== */
const MW = 48, MH = 30;
const mini = (() => { // a small ground: a house, a diagonal wall, a second house, a marsh
  const c = new Uint8Array(MW * MH).fill(1);
  for (let y = 4; y <= 11; y++) for (let x = 8; x <= 15; x++) c[y * MW + x] = 0;
  for (let y = 14; y <= 20; y++) for (let x = 38; x <= 44; x++) c[y * MW + x] = 0;
  for (let y = 15; y <= 25; y++) for (let x = 4; x <= 16; x++) c[y * MW + x] = 3;
  let x = 20, y = 29; const x1 = 34, y1 = 10, dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y), sx = 1, sy = -1; let e = dx + dy;
  for (;;) { c[y * MW + x] = 0; if (x === x1 && y === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x += sx; } if (e2 <= dx) { e += dx; y += sy; } }
  return c;
})();
const MS = 28 * MW + 1, MG = 26 * MW + 44; // start and goal
function miniDijkstra(costs, src, uniform) {
  const d = new Float64Array(MW * MH).fill(Infinity), par = new Int32Array(MW * MH).fill(-1), h = new Heap(); d[src] = 0; h.push(0, src); const done = new Uint8Array(MW * MH);
  while (h.size) { const i = h.pop(); if (done[i]) continue; done[i] = 1; const x = i % MW, y = (i / MW) | 0;
    for (let k = 0; k < 8; k++) { const nx = x + DX[k], ny = y + DY[k]; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue; const j = ny * MW + nx; if (!costs[j]) continue; if (k >= 4 && (!costs[y * MW + nx] || !costs[ny * MW + x])) continue;
      const c = (k >= 4 ? 1.414 : 1) * (uniform ? 1 : (costs[i] + costs[j]) / 2); if (d[i] + c < d[j]) { d[j] = d[i] + c; par[j] = i; h.push(d[j], j); } } }
  return { d, par };
}
const toGoal = miniDijkstra(mini, MG, false), toGoalU = miniDijkstra(mini, MG, true);
const walk = (par, s) => { const p = []; for (let i = s; i !== -1; i = par[i]) p.push(i); return p; };
const miniPath = walk(toGoal.par, MS), miniPathU = walk(toGoalU.par, MS);
function miniBase(g, s, opts = {}) {
  for (let i = 0; i < MW * MH; i++) { const x = i % MW, y = (i / MW) | 0; g.fillStyle = mini[i] === 0 ? css(x > 16 && x < 37 ? '--t-wall' : '--t-house') : mini[i] === 3 ? css('--t-marsh') : css('--t-open'); g.fillRect(x * s, y * s, s + .3, s + .3); }
  if (!opts.noMarsh) hatch(g, 4 * s, 15 * s, 13 * s, 11 * s, css('--ink-3'), 6);
}
const mc = (i, s) => [((i % MW) + .5) * s, (((i / MW) | 0) + .5) * s];
function miniLine(g, cells, s, color, w, dash) { g.beginPath(); cells.forEach((c, k) => { const [x, y] = mc(c, s); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.setLineDash(dash || []); g.strokeStyle = color; g.lineWidth = w; g.lineJoin = 'round'; g.stroke(); g.setLineDash([]); }
function miniEnds(g, s) { const [a, b] = mc(MS, s), [c, d] = mc(MG, s); g.fillStyle = css('--ink'); g.beginPath(); g.arc(a, b, 5, 0, 7); g.fill(); g.fillStyle = css('--carmine'); g.beginPath(); g.moveTo(c, d - 6); g.lineTo(c + 6, d); g.lineTo(c, d + 6); g.lineTo(c - 6, d); g.closePath(); g.fill(); }
function turns(path) { const out = [path[0]]; for (let k = 1; k + 1 < path.length; k++) { const a = path[k - 1], b = path[k], c = path[k + 1]; if (b - a !== c - b) out.push(b); } out.push(path[path.length - 1]); return out; }
function sectorsOf(path, S) { const set = new Set(); for (const c of path) set.add(((((c / MW) | 0) / S) | 0) * 100 + (((c % MW) / S) | 0)); return set; }
function flowArrows(g, s, S, sectors, alphaOf) {
  for (let i = 0; i < MW * MH; i++) { if (!mini[i] || i === MG) continue; const x = i % MW, y = (i / MW) | 0, k = ((y / S) | 0) * 100 + ((x / S) | 0); if (!sectors.has(k)) continue; const p = toGoal.par[i]; if (p < 0) continue;
    const a = alphaOf ? alphaOf(k) : 1; if (a <= 0) continue; g.globalAlpha = a; const [x0, y0] = mc(i, s), [x1, y1] = mc(p, s); const dx = (x1 - x0) * .38, dy = (y1 - y0) * .38; arrow(g, x0 - dx * .6, y0 - dy * .6, x0 + dx, y0 + dy, css('--prussian'), 1, 3.2); }
  g.globalAlpha = 1;
}
function portals(g, s, S) {
  g.strokeStyle = css('--gold'); g.lineWidth = 3; g.lineCap = 'butt';
  for (let x = S; x < MW; x += S) { let run = -1; for (let y = 0; y <= MH; y++) { const ok = y < MH && mini[y * MW + x - 1] && mini[y * MW + x]; if (ok && run < 0) run = y; if (!ok && run >= 0) { g.beginPath(); g.moveTo(x * s, run * s + 2); g.lineTo(x * s, y * s - 2); g.stroke(); run = -1; } } }
  for (let y = S; y < MH; y += S) { let run = -1; for (let x = 0; x <= MW; x++) { const ok = x < MW && mini[(y - 1) * MW + x] && mini[y * MW + x]; if (ok && run < 0) run = x; if (!ok && run >= 0) { g.beginPath(); g.moveTo(run * s + 2, y * s); g.lineTo(x * s - 2, y * s); g.stroke(); run = -1; } } }
}
function sectorGrid(g, s, S, w, h) { g.strokeStyle = css('--ink'); g.globalAlpha = .35; g.lineWidth = 1; g.beginPath(); for (let x = S; x < MW; x += S) { g.moveTo(x * s + .5, 0); g.lineTo(x * s + .5, h); } for (let y = S; y < MH; y += S) { g.moveTo(0, y * s + .5); g.lineTo(w, y * s + .5); } g.stroke(); g.globalAlpha = 1; }
function miniPieces(S) { const lab = new Int32Array(MW * MH).fill(-1); let n = 0; const cent = [];
  for (let i = 0; i < MW * MH; i++) { if (!mini[i] || lab[i] >= 0) continue; const st = [i]; lab[i] = n; let sx = 0, sy = 0, cnt = 0;
    while (st.length) { const c = st.pop(), x = c % MW, y = (c / MW) | 0; sx += x; sy += y; cnt++; for (let k = 0; k < 4; k++) { const nx = x + DX[k], ny = y + DY[k]; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue; if (((nx / S) | 0) !== ((x / S) | 0) || ((ny / S) | 0) !== ((y / S) | 0)) continue; const j = ny * MW + nx; if (mini[j] && lab[j] < 0) { lab[j] = n; st.push(j); } } }
    cent.push([sx / cnt, sy / cnt, ((((i / MW) | 0) / S) | 0) * 100 + (((i % MW) / S) | 0)]); n++; }
  return { lab, n, cent };
}

const GAME_IDS = ['aoe2', 'sc2', 'supcom', 'aoe4', 'zeroad', 'factorio', 'spring', 'gt'];
const GAMES = [
  { name: 'Age of Empires II', meta: ['1999', 'Ensemble Studios'], src: 'Game Developer postmortem',
    txt: '',
    take: '', draw: drawAoe2 },
  { name: 'StarCraft II', meta: ['2010', 'Blizzard'], src: 'second-hand account of a 2011 talk',
    txt: '',
    take: '', draw: drawSc2 },
  { name: 'Supreme Commander 2', meta: ['2010', 'Gas Powered Games'], src: 'Emerson, Game AI Pro ch. 23',
    txt: '',
    take: '', draw: drawSupcom },
  { name: 'Age of Empires IV', meta: ['2021', 'Relic'], src: 'Cheng, GDC 2022 slides',
    txt: '',
    take: '', draw: drawAoe4, anim: true },
  { name: '0 A.D.', meta: ['open source', 'Wildfire Games'], src: 'HierarchicalPathfinder.cpp',
    txt: '',
    take: '', draw: drawZeroAd },
  { name: 'Factorio · OpenRA', meta: ['2019 · open source', 'Wube · OpenRA'], src: 'FFF #317 · HierarchicalPathFinder.cs',
    txt: '',
    take: '', draw: drawFactorio },
  { name: 'Spring engine', meta: ['Beyond All Reason', '2023'], src: 'Recoil source, QTPFS',
    txt: '',
    take: '', draw: drawQuad },
  { name: 'Grand Tactician', meta: ['2021', 'Game Labs'], src: 'game manual',
    txt: '',
    take: '', draw: drawGt, anim: true }
];
const gameEls = GAMES.map((gm) => {
  const el = document.createElement('article'); el.className = 'game plate';
  el.innerHTML = `<canvas height="200"></canvas><div class="body"><div class="meta"><span>${gm.meta.join(' · ')}</span><span>${gm.src}</span></div><h3>${gm.name}</h3></div>`;
  $('game-' + GAME_IDS[GAMES.indexOf(gm)]).appendChild(el); return el;
});
function gameCtx(el) { const { g, w, h } = fit(el.querySelector('canvas'), MH / MW); g.clearRect(0, 0, w, h); return { g, w, h, s: w / MW }; }
function drawAoe2(el) {
  const { g, w, h, s } = gameCtx(el); const T = 2, tw = MW / T, th = MH / T, tb = new Uint8Array(tw * th);
  for (let i = 0; i < MW * MH; i++) if (!mini[i]) tb[(((i / MW) | 0) / T | 0) * tw + ((i % MW) / T | 0)] = 1;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { g.fillStyle = tb[y * tw + x] ? css('--t-house') : css('--t-open'); g.fillRect(x * T * s, y * T * s, T * s, T * s); }
  hatch(g, 4 * s, 15 * s, 13 * s, 11 * s, css('--ink-3'), 6);
  g.strokeStyle = css('--ink'); g.globalAlpha = .2; g.beginPath(); for (let x = 1; x < tw; x++) { g.moveTo(x * T * s, 0); g.lineTo(x * T * s, h); } for (let y = 1; y < th; y++) { g.moveTo(0, y * T * s); g.lineTo(w, y * T * s); } g.stroke(); g.globalAlpha = 1;
  // tile path, uniform cost
  const src = ((MS / MW | 0) / T | 0) * tw + ((MS % MW) / T | 0), dst = ((MG / MW | 0) / T | 0) * tw + ((MG % MW) / T | 0);
  const prev = new Int32Array(tw * th).fill(-2); const q = [src]; prev[src] = -1;
  while (q.length) { const c = q.shift(); if (c === dst) break; const x = c % tw, y = (c / tw) | 0; for (let k = 0; k < 8; k++) { const nx = x + DX[k], ny = y + DY[k]; if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue; const j = ny * tw + nx; if (tb[j] || prev[j] !== -2) continue; if (k >= 4 && (tb[y * tw + nx] || tb[ny * tw + x])) continue; prev[j] = c; q.push(j); } }
  g.beginPath(); let first = true; for (let c = dst; c >= 0; c = prev[c]) { const x = (c % tw + .5) * T * s, y = (((c / tw) | 0) + .5) * T * s; first ? g.moveTo(x, y) : g.lineTo(x, y); first = false; } g.strokeStyle = css('--carmine'); g.lineWidth = 2.5; g.lineJoin = 'round'; g.stroke();
  miniEnds(g, s); tag(g, 'buildings fit whole 2 m tiles', 6, h - 12, css('--ink-2'));
}
function drawSc2(el) {
  const { g, w, h } = gameCtx(el); const X = (v) => v * w, Y = (v) => v * h;
  g.fillStyle = css('--t-open'); g.fillRect(0, 0, w, h);
  const obs = [[.2, .18, .38, .62], [.58, .45, .76, .86]];
  // convex free-space pieces: vertical slabs split at the obstacles
  const xs = [0, .2, .38, .58, .76, 1], polys = [];
  for (let k = 0; k < 5; k++) { const [a, b] = [xs[k], xs[k + 1]]; const cut = obs.find((o) => o[0] === a); if (!cut) polys.push([a, 0, b, 1]); else { polys.push([a, 0, b, cut[1]]); polys.push([a, cut[3], b, 1]); } }
  const path = [[.06, .7], [.2, .62], [.38, .62], [.58, .45], [.76, .45], [.93, .3]];
  const used = (p) => path.some(([x, y], i) => i && (() => { const [px, py] = path[i - 1]; for (let t = 0; t <= 1; t += .05) { const qx = px + (x - px) * t, qy = py + (y - py) * t; if (qx >= p[0] - .001 && qx <= p[2] + .001 && qy >= p[1] - .001 && qy <= p[3] + .001) return true; } return false; })());
  for (const p of polys) { if (used(p)) { g.fillStyle = css('--carmine-wash'); g.fillRect(X(p[0]), Y(p[1]), X(p[2] - p[0]), Y(p[3] - p[1])); }
    g.strokeStyle = css('--prussian'); g.lineWidth = 1; g.strokeRect(X(p[0]) + .5, Y(p[1]) + .5, X(p[2] - p[0]) - 1, Y(p[3] - p[1]) - 1);
    g.globalAlpha = .55; g.beginPath(); g.moveTo(X(p[0]), Y(p[1])); g.lineTo(X(p[2]), Y(p[3])); g.stroke(); g.globalAlpha = 1; }
  for (const o of obs) { g.fillStyle = css('--t-house'); g.fillRect(X(o[0]), Y(o[1]), X(o[2] - o[0]), Y(o[3] - o[1])); }
  g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.strokeStyle = css('--carmine'); g.lineWidth = 2.5; g.stroke();
  path.slice(1, -1).forEach(([x, y]) => { g.fillStyle = css('--carmine'); g.beginPath(); g.arc(X(x), Y(y), 3.5, 0, 7); g.fill(); });
  g.fillStyle = css('--ink'); g.beginPath(); g.arc(X(.06), Y(.7), 5, 0, 7); g.fill();
  tag(g, 'triangles; path pulled tight', 6, h - 12, css('--ink-2'));
}
function drawSupcom(el) {
  const { g, w, h, s } = gameCtx(el); miniBase(g, s); const S = 6; sectorGrid(g, s, S, w, h); portals(g, s, S);
  flowArrows(g, s, S, sectorsOf(miniPath, S)); miniLine(g, miniPath, s, css('--carmine'), 2); miniEnds(g, s);
}
function drawAoe4(el, now) {
  const { g, w, h, s } = gameCtx(el); miniBase(g, s); const S = 6; sectorGrid(g, s, S, w, h); portals(g, s, S);
  const L = miniPath.length, t = reduce ? .45 : ((now / 7000) % 1), idx = Math.min(L - 1, Math.floor(t * L));
  const ahead = miniPath.slice(idx, Math.min(L, idx + 22)), win = sectorsOf(ahead, S);
  flowArrows(g, s, S, win);
  miniLine(g, miniPath, s, css('--carmine'), 1.2, [3, 4]);
  for (let k = 8; k >= 1; k--) { const c = miniPath[Math.max(0, idx - k * 2)]; const [x, y] = mc(c, s); g.fillStyle = css('--ink-2'); g.beginPath(); g.arc(x + (k % 2 ? 2.5 : -2.5), y, 2.6, 0, 7); g.fill(); }
  const [lx, ly] = mc(miniPath[idx], s); g.fillStyle = css('--carmine'); g.beginPath(); g.arc(lx, ly, 5, 0, 7); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 2; g.stroke();
  miniEnds(g, s); tag(g, 'arrows only just ahead of the leader', 6, h - 12, css('--ink-2'));
}
function drawZeroAd(el) {
  const { g, w, h, s } = gameCtx(el); miniBase(g, s); const S = 12, pc = miniPieces(S);
  const per = {}; pc.cent.forEach(([, , k], i) => (per[k] = (per[k] || []).concat(i)));
  const tints = ['--tint-1', '--tint-2', '--tint-3'].map(css);
  for (let i = 0; i < MW * MH; i++) { const l = pc.lab[i]; if (l < 0) continue; const k = pc.cent[l][2]; if (per[k].length < 2) continue; g.fillStyle = tints[per[k].indexOf(l) % 3]; g.fillRect((i % MW) * s, ((i / MW) | 0) * s, s + .3, s + .3); }
  sectorGrid(g, s, S, w, h);
  miniLine(g, miniPath, s, css('--carmine'), 1.5, [2, 3]);
  const jp = turns(miniPathU); miniLine(g, jp, s, css('--carmine'), 2.5); jp.slice(1, -1).forEach((c) => { const [x, y] = mc(c, s); g.fillStyle = css('--carmine'); g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); });
  miniEnds(g, s); tag(g, 'blocks split into areas (tints)', 6, h - 12, css('--ink-2'));
}
function drawFactorio(el) {
  const { g, w, h, s } = gameCtx(el); miniBase(g, s); const S = 8, pc = miniPieces(S);
  // abstract edges between pieces that touch across a chunk border
  const adj = Array.from({ length: pc.n }, () => new Set());
  for (let i = 0; i < MW * MH; i++) { if (pc.lab[i] < 0) continue; const x = i % MW, y = (i / MW) | 0; for (const [dx, dy] of [[1, 0], [0, 1]]) { const nx = x + dx, ny = y + dy; if (nx >= MW || ny >= MH) continue; const j = ny * MW + nx; if (pc.lab[j] >= 0 && pc.lab[j] !== pc.lab[i]) { adj[pc.lab[i]].add(pc.lab[j]); adj[pc.lab[j]].add(pc.lab[i]); } } }
  const hop = new Int32Array(pc.n).fill(-1), q = [pc.lab[MG]]; hop[pc.lab[MG]] = 0; while (q.length) { const a = q.shift(); for (const b of adj[a]) if (hop[b] < 0) { hop[b] = hop[a] + 1; q.push(b); } }
  const mx = Math.max(...hop);
  for (let i = 0; i < MW * MH; i++) { const l = pc.lab[i]; if (l < 0) continue; g.fillStyle = css('--prussian'); g.globalAlpha = .55 * (1 - hop[l] / (mx + 1)); g.fillRect((i % MW) * s, ((i / MW) | 0) * s, s + .3, s + .3); } g.globalAlpha = 1;
  sectorGrid(g, s, S, w, h);
  g.strokeStyle = css('--gold'); g.lineWidth = 1.2; g.beginPath(); adj.forEach((set, a) => set.forEach((b) => { if (b < a) return; g.moveTo((pc.cent[a][0] + .5) * s, (pc.cent[a][1] + .5) * s); g.lineTo((pc.cent[b][0] + .5) * s, (pc.cent[b][1] + .5) * s); })); g.stroke();
  pc.cent.forEach(([x, y]) => { g.fillStyle = css('--gold'); g.beginPath(); g.arc((x + .5) * s, (y + .5) * s, 3, 0, 7); g.fill(); });
  miniLine(g, miniPath, s, css('--carmine'), 2.2); miniEnds(g, s);
}
function drawQuad(el) {
  const { g, w, h, s } = gameCtx(el); miniBase(g, s, { noMarsh: true }); let leaves = 0;
  const rec = (x0, y0, x1, y1) => { if (x1 <= x0 || y1 <= y0) return; const k = mini[y0 * MW + x0]; let same = true; for (let y = y0; y < y1 && same; y++) for (let x = x0; x < x1; x++) if (mini[y * MW + x] !== k) { same = false; break; }
    if (same || (x1 - x0 <= 1 && y1 - y0 <= 1)) { leaves++; g.strokeStyle = css('--prussian'); g.lineWidth = 1; g.strokeRect(x0 * s + .5, y0 * s + .5, (x1 - x0) * s - 1, (y1 - y0) * s - 1); return; }
    const mx = (x0 + x1 + 1) >> 1, my = (y0 + y1 + 1) >> 1; rec(x0, y0, mx, my); rec(mx, y0, x1, my); rec(x0, my, mx, y1); rec(mx, my, x1, y1); };
  rec(0, 0, MW, MH);
  tag(g, `${leaves} squares for ${MW * MH} cells`, 6, h - 12, css('--ink-2'));
}
function drawGt(el, now) {
  const { g, w, h } = gameCtx(el); g.fillStyle = css('--t-open'); g.fillRect(0, 0, w, h);
  g.fillStyle = css('--t-road'); g.fillRect(0, h * .44, w, h * .12);
  const gapY = h * .5, gw = h * .1; g.fillStyle = css('--t-house');
  g.fillRect(w * .44, 0, w * .12, gapY - gw); g.fillRect(w * .44, gapY + gw, w * .12, h - gapY - gw);
  const t = reduce ? .5 : ((now / 8000) % 1), lead = w * (.08 + .84 * t);
  const fold = (x) => { const a = (x - w * .26) / (w * .12), b = (w * .74 - x) / (w * .12); return Math.max(0, Math.min(1, Math.min(a, b))); };
  const f = fold(lead), N = 16, sp = Math.min(h * .05, 10);
  for (let k = 0; k < N; k++) {
    const lx = lead, ly = gapY + (k - (N - 1) / 2) * sp * 1.1; // line: abreast
    const rank = (k / 2) | 0, file = k % 2; const cx = lead - rank * sp * 1.15, cy = gapY + (file - .5) * sp; // column: two files
    const x = lx + (cx - lx) * f, y = ly + (cy - ly) * f; g.fillStyle = css(k === 0 ? '--carmine' : '--prussian'); g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill();
  }
  tag(g, f > .5 ? 'column through the gap' : 'line in the open', 6, h - 12, css('--ink-2'));
}
function drawGames(now) { GAMES.forEach((gm, i) => gm.draw(gameEls[i], now)); }
redrawers.push(() => drawGames(performance.now()));
const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
if (!reduce) { const anim = (now) => { GAMES.forEach((gm, i) => { if (gm.anim && onScreen(gameEls[i])) gm.draw(gameEls[i], now); }); requestAnimationFrame(anim); }; requestAnimationFrame(anim); }

/* =================== GLOSSARY FIGURES =================== */
const FIG = {};
function lbl(g, t, x, y, col, align = 'center') { g.font = '500 10px "JetBrains Mono Variable", monospace'; g.textAlign = align; g.textBaseline = 'middle'; const m = g.measureText(t).width; const bx = align === 'center' ? x - m / 2 : align === 'right' ? x - m : x;
  g.fillStyle = css('--plate'); g.globalAlpha = .88; g.fillRect(bx - 3, y - 7, m + 6, 14); g.globalAlpha = 1; g.fillStyle = col; g.fillText(t, x, y); g.textAlign = 'left'; }
const CELL_COL = { '.': '--t-open', '#': '--t-wall', 'H': '--t-house', 'r': '--t-road', 'm': '--t-marsh', 'c': '--t-crops' };
/** Draws a pattern of cells; `tint(x, y)` may return a token to wash a free cell. */
function cells(g, rows, ox, oy, cs, tint) {
  rows.forEach((r, y) => [...r].forEach((ch, x) => { g.fillStyle = css(CELL_COL[ch] || '--t-open'); g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1);
    const t = tint && tint(x, y, ch); if (t) { g.fillStyle = css(t); g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1); } }));
}
let figName = '';
function cap(t) { const c = document.querySelector(`canvas[data-g="${figName}"]`); if (c && c.nextElementSibling) c.nextElementSibling.textContent = t; }
function figBox(name, colsN, rowsN) { figName = name; const cv = document.querySelector(`canvas[data-g="${name}"]`); const { g, w, h } = fit(cv, 0.6); g.clearRect(0, 0, w, h);
  const cs = Math.min((w - 8) / colsN, (h - 8) / rowsN); return { g, w, h, cs, ox: (w - cs * colsN) / 2, oy: (h - cs * rowsN) / 2 }; }
function dot(g, x, y, r, col) { g.fillStyle = css(col); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = css('--plate'); g.lineWidth = 1.5; g.stroke(); }
function poly(g, pts, col, wd, dash) { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.setLineDash(dash || []); g.strokeStyle = css(col); g.lineWidth = wd; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); g.setLineDash([]); }

FIG.cell = () => { const R = ['..........', '..HHH.....', '..HHH.....', '..........', '.....#....', '......#...'];
  const { g, h, cs, ox, oy } = figBox('cell', 10, 6); cells(g, R, ox, oy, cs);
  g.strokeStyle = css('--carmine'); g.lineWidth = 2; g.strokeRect(ox + 7 * cs, oy + 3 * cs, cs, cs);
  lbl(g, '1 m', ox + 7.5 * cs, oy + 2.4 * cs, css('--carmine')); lbl(g, 'house', ox + 3.5 * cs, oy + 0.5 * cs, css('--ink-2')); lbl(g, 'wall', ox + 4.2 * cs, oy + 5.2 * cs, css('--ink-2'));
  cap('green = free, a unit can stand here · pale and brown = blocked'); };
FIG.square = () => { const R = ['.......#', '......#.', '.....#..', '....#...', '...#....', '..#.....'];
  const { g, h, cs, ox, oy } = figBox('square', 8, 6); cells(g, R, ox, oy, cs);
  for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 4; sx++) { // a 2 x 2 square is closed when the wall splits its free cells
    const fr = []; for (let y = sy * 2; y < sy * 2 + 2; y++) for (let x = sx * 2; x < sx * 2 + 2; x++) if (R[y][x] === '.') fr.push([x, y]);
    let split = false; if (fr.length === 2) { const [[a, b], [c, d]] = fr; split = Math.abs(a - c) + Math.abs(b - d) !== 1; }
    if (split) hatch(g, ox + sx * 2 * cs, oy + sy * 2 * cs, 2 * cs, 2 * cs, css('--carmine'), 4);
    g.strokeStyle = css('--ink'); g.lineWidth = 1.5; g.strokeRect(ox + sx * 2 * cs, oy + sy * 2 * cs, 2 * cs, 2 * cs); }
  lbl(g, '2 m', ox + 1 * cs, oy + 5 * cs, css('--ink')); cap('hatched = closed (split by the wall)'); };
FIG.block = () => { const { g, w, h, cs, ox, oy } = figBox('block', 18, 12); cells(g, Array(12).fill('..................'), ox, oy, cs);
  g.strokeStyle = css('--ink'); g.lineWidth = 2; for (let by = 0; by < 2; by++) for (let bx = 0; bx < 3; bx++) g.strokeRect(ox + bx * 6 * cs, oy + by * 6 * cs, 6 * cs, 6 * cs);
  g.strokeStyle = css('--carmine'); g.lineWidth = 2.5; g.strokeRect(ox + 6 * cs, oy, 6 * cs, 6 * cs);
  lbl(g, 'one block: 32 × 32 m', ox + 9 * cs, oy + 3 * cs, css('--carmine')); cap('lines between blocks are imaginary'); };
FIG.area = () => { const R = []; for (let y = 0; y < 8; y++) { let r = ''; for (let x = 0; x < 8; x++) r += x + y === 7 ? '#' : '.'; R.push(r); }
  const { g, h, cs, ox, oy } = figBox('area', 8, 8); cells(g, R, ox, oy, cs, (x, y, ch) => ch === '#' ? null : x + y < 7 ? '--tint-1' : '--tint-2');
  g.strokeStyle = css('--ink'); g.lineWidth = 2; g.strokeRect(ox, oy, 8 * cs, 8 * cs);
  lbl(g, 'area 1', ox + 2.2 * cs, oy + 2.4 * cs, css('--prussian')); lbl(g, 'area 2', ox + 5.8 * cs, oy + 5.6 * cs, css('--gold')); cap('one block, a wall through it'); };
FIG.door = () => { const R = ['.....##.....', '.....##.....', '............', '............', '.....##.....', '............'];
  const { g, h, cs, ox, oy } = figBox('door', 12, 6); cells(g, R, ox, oy, cs);
  g.strokeStyle = css('--ink'); g.lineWidth = 1.5; g.strokeRect(ox, oy, 6 * cs, 6 * cs); g.strokeRect(ox + 6 * cs, oy, 6 * cs, 6 * cs);
  g.setLineDash([3, 3]); g.strokeStyle = css('--ink'); g.beginPath(); g.moveTo(ox + 6 * cs, oy - 3); g.lineTo(ox + 6 * cs, oy + 6 * cs + 3); g.stroke(); g.setLineDash([]);
  arrow(g, ox + 4.2 * cs, oy + 3 * cs, ox + 7.8 * cs, oy + 3 * cs, css('--ink-2'), 1.2, 5);
  dot(g, ox + 6 * cs, oy + 3 * cs, 5, '--gold'); dot(g, ox + 6 * cs, oy + 5.5 * cs, 5, '--gold');
  lbl(g, 'block A', ox + 2.5 * cs, oy + .5 * cs, css('--ink-2')); lbl(g, 'block B', ox + 9.5 * cs, oy + .5 * cs, css('--ink-2'));
  cap('gold = doors: free on both sides'); };
FIG.region = () => { const R = ['............', '.....#####..', '.....#...#..', '.....#...#..', '.....#####..', '............'];
  const { g, h, cs, ox, oy } = figBox('region', 12, 6); const inside = (x, y) => x > 5 && x < 9 && y > 1 && y < 4;
  cells(g, R, ox, oy, cs, (x, y, ch) => ch === '#' ? null : inside(x, y) ? '--tint-2' : '--tint-1');
  lbl(g, 'region 1', ox + 2.5 * cs, oy + 3 * cs, css('--prussian')); lbl(g, 'region 2', ox + 7.5 * cs, oy + 3 * cs, css('--gold'));
  cap('a walled garden, no gate'); };
FIG.body = () => { figName = 'body'; cap('left: a small unit fits through the gap · right: a big unit needs more room, so the gap is closed for it'); const { g, w, h } = figBox('body', 1, 1); const half = w / 2, cs = Math.min((half - 14) / 7, (h - 8) / 7);
  [['small', 0.22, false], ['big', 1.0, true]].forEach(([name, pad, stuck], k) => {
    const ox = k * half + (half - 7 * cs) / 2, oy = (h - 7 * cs) / 2;
    const R = ['...#...', '...#...', '.......', '.......', '...#...', '...#...', '...#...'];
    cells(g, R, ox, oy, cs, (x, y, ch) => k === 1 && ch === '.' && x === 3 ? '--carmine-wash' : null);
    if (k === 1) { g.fillStyle = css('--t-house'); g.globalAlpha = .6; g.fillRect(ox + 2.5 * cs, oy, 2 * cs, 2 * cs); g.fillRect(ox + 2.5 * cs, oy + 4 * cs, 2 * cs, 3 * cs); g.fillRect(ox + 3 * cs, oy + 2 * cs, cs, 2 * cs); g.globalAlpha = 1; }
    const r = k ? cs * 1.0 : cs * .3, cx = ox + (stuck ? 1.4 : 3.5) * cs, cy = oy + 3 * cs; g.fillStyle = css(k ? '--carmine' : '--prussian'); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    if (!stuck) arrow(g, ox + 1 * cs, cy, ox + 6.2 * cs, cy, css('--prussian'), 1.2, 5);
     }); };
FIG.cost = () => { const R = ['............', '...mmmmmm...', '...mmmmmm...', '...mmmmmm...', '............', 'rrrrrrrrrrrr'];
  const { g, h, cs, ox, oy } = figBox('cost', 12, 6); cells(g, R, ox, oy, cs); const P = (x, y) => [ox + x * cs, oy + y * cs];
  poly(g, [P(.5, 2.5), P(11.5, 2.5)], '--violet', 2, [4, 3]); poly(g, [P(.5, 2.5), P(1.5, 5.5), P(10.5, 5.5), P(11.5, 2.5)], '--carmine', 2.5);
  dot(g, ...P(.5, 2.5), 4, '--ink'); dot(g, ...P(11.5, 2.5), 4, '--carmine');
  lbl(g, 'marsh ×3: 25', ox + 6 * cs, oy + 1.9 * cs, css('--violet')); lbl(g, 'road ×1: 15', ox + 6 * cs, oy + 4.6 * cs, css('--carmine'));
  cap('longer, but cheaper by road'); };
FIG.search = () => { figName = 'search'; cap('left: Dijkstra spreads in all directions · right: A* leans toward the target and looks at fewer cells'); const { g, w, h } = figBox('search', 1, 1); const half = w / 2, N = 11, cs = Math.min((half - 14) / N, (h - 8) / N);
  [['Dijkstra: all ways', (x, y) => Math.hypot(x - 2, y - 5) <= 7.2], ['A*: leans to target', (x, y) => Math.hypot(x - 2, y - 5) + Math.hypot(x - 8, y - 5) <= 7.6]].forEach(([name, inside], k) => {
    const ox = k * half + (half - N * cs) / 2, oy = (h - N * cs) / 2; cells(g, Array(N).fill('.'.repeat(N)), ox, oy, cs, (x, y) => inside(x, y) ? '--carmine-wash' : null);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inside(x, y)) { g.fillStyle = css('--carmine'); g.globalAlpha = .35; g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1); g.globalAlpha = 1; }
    dot(g, ox + 2.5 * cs, oy + 5.5 * cs, 4, '--ink'); dot(g, ox + 8.5 * cs, oy + 5.5 * cs, 4, '--carmine');  }); };
FIG.route = () => { const { g, h, cs, ox, oy } = figBox('route', 15, 5); const R = ['....#..........', '....#.....#....', '....#.....#....', '..........#....', '...............'];
  cells(g, R, ox, oy, cs); g.strokeStyle = css('--ink'); g.lineWidth = 1.5; for (let b = 0; b < 3; b++) g.strokeRect(ox + b * 5 * cs, oy, 5 * cs, 5 * cs);
  const P = (x, y) => [ox + x * cs, oy + y * cs];
  const steps = [[.5, .5], [1.5, 1.5], [2.5, 2.5], [3.5, 3.5], [4.5, 3.5], [5.5, 3.5], [6.5, 2.5], [7.5, 1.5], [8.5, .5], [9.5, .5], [10.5, .5], [11.5, 1.5], [12.5, 2.5], [13.5, 3.5]];
  poly(g, steps.map(([x, y]) => P(x, y)), '--carmine', 2); steps.forEach(([x, y]) => { g.fillStyle = css('--carmine'); g.fillRect(...P(x - .12, y - .12), cs * .24, cs * .24); });
  poly(g, [P(.5, .5), P(5, 3.5), P(10, .5), P(13.5, 3.5)], '--gold', 1.5, [3, 3]); dot(g, ...P(5, 3.5), 5, '--gold'); dot(g, ...P(10, .5), 5, '--gold');
  cap('route: the doors (gold) · steps: the cells (red)'); };
FIG.straight = () => { const { g, h, cs, ox, oy } = figBox('straight', 12, 6); const R = ['............', '............', '.....HH.....', '.....HH.....', '............', '............'];
  cells(g, R, ox, oy, cs); const P = (x, y) => [ox + x * cs, oy + y * cs];
  const zig = [[.5, 4.5], [1.5, 4.5], [2.5, 3.5], [3.5, 3.5], [4.5, 4.5], [5.5, 4.5], [6.5, 4.5], [7.5, 3.5], [8.5, 2.5], [9.5, 1.5], [10.5, 1.5], [11.5, 0.5]];
  poly(g, zig.map(([x, y]) => P(x, y)), '--ink-3', 1.5, [3, 2]); poly(g, [P(.5, 4.5), P(5, 4.5), P(7, 4.5), P(11.5, .5)], '--carmine', 2.5);
  dot(g, ...P(.5, 4.5), 4, '--ink'); dot(g, ...P(11.5, .5), 4, '--carmine'); cap('grey: cell steps · red: straightened'); };
FIG.checker = () => { const { g, h, cs, ox, oy } = figBox('checker', 12, 6); const R = ['............', '......#.....', '......#.....', '......#.....', '............', '............'];
  cells(g, R, ox, oy, cs, (x, y, ch) => ch === '.' ? '--carmine-wash' : null); const P = (x, y) => [ox + x * cs, oy + y * cs];
  poly(g, [P(.5, 2.5), P(6.5, 4.5), P(11.5, 2.5)], '--ink-2', 4); poly(g, [P(.5, 2.5), P(5.5, 4.5), P(7.5, 4.5), P(11.5, 2.5)], '--carmine', 2);
  lbl(g, 'checks every cell (shaded)', ox + 6 * cs, oy + .5 * cs, css('--ink-2')); cap('red = fast planner · grey = exact A*: within 5 %'); };
function drawFigs() { for (const k of Object.keys(FIG)) if (document.querySelector(`canvas[data-g="${k}"]`)) FIG[k](); }
redrawers.push(drawFigs);

/* =================== THE IDEA: A GRAPH OF DOORS =================== */
const IG = { W: 48, H: 12, B: 12 };
let ideaStage = 0, ideaClosed = false, ideaData = null;
/** Builds the small example: four blocks, a long wall, its areas, doors, links, and one order's route and steps. */
function ideaBuild(closed) {
  const { W: GW, H: GH, B } = IG, free = new Uint8Array(GW * GH).fill(1);
  const seg = (ax, ay, bx, by) => { let x = ax, y = ay; const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1; let e = dx + dy;
    for (;;) { free[y * GW + x] = 0; if (x === bx && y === by) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x += sx; } if (e2 <= dx) { e += dx; y += sy; } } };
  seg(2, 11, 2, 8); seg(2, 8, 4, 6); seg(4, 6, 16, 6); seg(16, 6, 18, 8); seg(18, 8, 27, 8); seg(27, 8, 29, 6); seg(29, 6, 42, 6); seg(42, 6, 42, closed ? 0 : 2);
  const id = (x, y) => y * GW + x, blk = (i) => ((i % GW) / B) | 0;
  const nb = (i, f) => { const x = i % GW, y = (i / GW) | 0; for (let d = 0; d < 8; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const j = id(nx, ny); if (!free[j]) continue; if (d >= 4 && (!free[id(nx, y)] || !free[id(x, ny)])) continue; f(j, d >= 4 ? 1.414 : 1); } };
  // areas: flood fill inside each block; regions: flood fill over the whole map
  const fill = (inside) => { const lab = new Int32Array(GW * GH).fill(-1); let n = 0; for (let i = 0; i < GW * GH; i++) { if (!free[i] || lab[i] >= 0) continue; const st = [i]; lab[i] = n;
    while (st.length) { const c = st.pop(), x = c % GW, y = (c / GW) | 0; for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const j = id(nx, ny); if (free[j] && lab[j] < 0 && inside(c, j)) { lab[j] = n; st.push(j); } } } n++; } return lab; };
  const area = fill((a, b) => blk(a) === blk(b)), region = fill(() => true);
  // doors: one in the middle of each opening on a block edge
  const doors = [];
  for (let k = 1; k < GW / B; k++) { const xa = k * B - 1, xb = k * B; let run = [];
    const flush = () => { if (run.length) { const m = run[run.length >> 1]; doors.push({ a: id(xa, m), b: id(xb, m), x: xb, y: m + .5 }); } run = []; };
    for (let y = 0; y < GH; y++) { const ok = free[id(xa, y)] && free[id(xb, y)]; if (!ok) { flush(); continue; } if (run.length && (area[id(xa, y)] !== area[id(xa, run[0])] || area[id(xb, y)] !== area[id(xb, run[0])])) flush(); run.push(y); } flush(); }
  const cellIn = (d, b) => (blk(d.a) === b ? d.a : d.b);
  const search = (src, b) => { const dist = new Map([[src, 0]]), h = new Heap(); h.push(0, src); const done = new Set();
    while (h.size) { const c = h.pop(); if (done.has(c)) continue; done.add(c); nb(c, (j, w) => { if (blk(j) !== b) return; const nd = dist.get(c) + w; if (!dist.has(j) || nd < dist.get(j)) { dist.set(j, nd); h.push(nd, j); } }); } return dist; };
  const links = [];
  for (let b = 0; b < GW / B; b++) { const here = doors.map((d, i) => i).filter((i) => blk(doors[i].a) === b || blk(doors[i].b) === b);
    for (const i of here) { const dist = search(cellIn(doors[i], b), b); for (const j of here) if (j > i && dist.has(cellIn(doors[j], b))) links.push([i, j, dist.get(cellIn(doors[j], b)), b]); } }
  const S = id(8, 9), T = id(31, 3), sameRegion = region[S] === region[T];
  const tmp = (cell) => { const b = blk(cell), dist = search(cell, b); return doors.map((d, i) => [i, dist.get(cellIn(d, b))]).filter(([i, c]) => c !== undefined && (blk(doors[i].a) === b || blk(doors[i].b) === b)); };
  const sLinks = tmp(S), tLinks = tmp(T);
  // shortest path over doors (+ START = -1, TARGET = -2)
  let route = null;
  if (sameRegion) { const N = doors.length, adj = Array.from({ length: N + 2 }, () => []);
    for (const [i, j, c] of links) { adj[i].push([j, c]); adj[j].push([i, c]); } // a link's weight: the in-block walk's cost
    for (const [i, c] of sLinks) adj[N].push([i, c]); for (const [i, c] of tLinks) adj[i].push([N + 1, c]);
    const dist = new Array(N + 2).fill(Infinity), par = new Array(N + 2).fill(-1), h = new Heap(); dist[N] = 0; h.push(0, N); const done = new Set();
    while (h.size) { const u = h.pop(); if (done.has(u)) continue; done.add(u); for (const [v, c] of adj[u]) if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; par[v] = u; h.push(dist[v], v); } }
    route = []; for (let u = N + 1; u !== -1; u = par[u]) route.push(u); route.reverse(); }
  // exact steps inside the route's blocks
  let steps = null;
  if (route) { const ok = new Set(); route.forEach((u) => { if (u < doors.length) { ok.add(blk(doors[u].a)); ok.add(blk(doors[u].b)); } }); ok.add(blk(S)); ok.add(blk(T));
    const dist = new Map([[S, 0]]), par = new Map(), h = new Heap(); h.push(0, S); const done = new Set();
    while (h.size) { const c = h.pop(); if (done.has(c)) continue; done.add(c); if (c === T) break; nb(c, (j, w) => { if (!ok.has(blk(j))) return; const nd = dist.get(c) + w; if (!dist.has(j) || nd < dist.get(j)) { dist.set(j, nd); par.set(j, c); h.push(nd, j); } }); }
    steps = []; for (let c = T; c !== undefined; c = par.get(c)) steps.push(c); steps.reverse(); }
  // nearest reachable point when the target can't be reached
  let near = null; if (!sameRegion) { let bd = Infinity; for (let i = 0; i < GW * GH; i++) if (free[i] && region[i] === region[S]) { const d = Math.hypot(i % GW - T % GW, ((i / GW) | 0) - ((T / GW) | 0)); if (d < bd) { bd = d; near = i; } } }
  return { free, area, region, doors, links, S, T, sLinks, tLinks, route, steps, sameRegion, near };
}
const IDEA_TEXT = [
  ['Blocks and areas', 'Four blocks of 12 m. The wall cuts blocks 1, 2 and 3 in two, so each has two areas (two colours). In block 4 the wall stops short of the top, so the ground goes round its end, and block 4 is a single area.'],
  ['Doors', 'Walk along each edge between two blocks. Wherever free cells face free cells, there is an opening; put a door (gold) in its middle. A door joins exactly one area on each side.'],
  ['Links inside blocks', 'Prepared once, at load. Inside each block, walk from each door to every other door it can reach, and remember what it cost (gold lines). A door behind the wall can\'t be reached, so no link ever crosses the wall.'],
  ['Add START and TARGET', 'For this order only. Search from the start inside its own block, and link it to every door that search reaches (red dashes). Same for the target. The target is above the wall, so it links only to doors above the wall.'],
  ['Shortest path', 'Now it is a plain shortest-path problem on a small graph: the cheapest chain of links from START to TARGET. The doors below the wall in block 3 have no link to the target, so the chain goes on into block 4, round the end of the wall, and back.'],
  ['Exact steps', 'Search the 1 m cells, but only inside the blocks the chain passes through, then straighten. Every link was walked on cells when it was made, so these steps always exist.']
];
function drawIdea() {
  const cv = $('idea'); if (!cv) return; if (!ideaData) ideaData = ideaBuild(ideaClosed); const D = ideaData, { W: GW, H: GH, B } = IG;
  const { g, w, h } = fit(cv, 0.3); g.clearRect(0, 0, w, h); const cs = Math.min((w - 16) / GW, (h - 16) / GH), ox = (w - cs * GW) / 2, oy = (h - cs * GH) / 2;
  const P = (x, y) => [ox + x * cs, oy + y * cs], C = (i) => P(i % GW + .5, ((i / GW) | 0) + .5);
  const tints = ['--tint-1', '--tint-2', '--tint-3'].map(css);
  for (let i = 0; i < GW * GH; i++) { const x = i % GW, y = (i / GW) | 0; g.fillStyle = D.free[i] ? css('--t-open') : css('--t-wall'); g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1);
    if (D.free[i]) { const b = (x / B) | 0; const ids = []; for (let j = 0; j < GW * GH; j++) if ((((j % GW) / B) | 0) === b && D.free[j] && !ids.includes(D.area[j])) ids.push(D.area[j]); { g.fillStyle = tints[ids.length > 1 ? ids.indexOf(D.area[i]) % 2 : 2]; g.fillRect(ox + x * cs + .5, oy + y * cs + .5, cs - 1, cs - 1); } } }
  g.strokeStyle = css('--ink'); g.lineWidth = 2; for (let b = 0; b < 4; b++) g.strokeRect(ox + b * B * cs, oy, B * cs, GH * cs);
  for (let b = 0; b < 4; b++) lbl(g, `block ${b + 1}`, ox + (b * B + 1.8) * cs, oy + 11 * cs, css('--ink-2'));
  const dp = (d) => P(d.x, d.y);
  const inRoute = (i) => D.route && D.route.includes(i);
  if (ideaStage >= 2) { for (const [i, j, , lb] of D.links) { const [x0, y0] = dp(D.doors[i]), [x1, y1] = dp(D.doors[j]); const mid = P((lb + .5) * B, 0)[0], bend = Math.abs(x0 - x1) < 1 ? (mid - x0) * .55 : 0, cyy = y0 === y1 ? -cs * 2 : 0; const hot = ideaStage >= 4 && inRoute(i) && inRoute(j) && Math.abs(D.route.indexOf(i) - D.route.indexOf(j)) === 1;
    g.strokeStyle = css(hot ? '--carmine' : '--gold'); g.lineWidth = hot ? 4 : 1.5; g.globalAlpha = hot ? 1 : ideaStage >= 4 ? .45 : .9; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2 + cyy, x1, y1); g.stroke(); g.globalAlpha = 1; } }
  const [sx, sy] = C(D.S), [tx, ty] = C(D.T);
  if (ideaStage >= 3) { for (const [list, px, py, end] of [[D.sLinks, sx, sy, -1], [D.tLinks, tx, ty, -2]]) for (const [i] of list) { const [x1, y1] = dp(D.doors[i]); const hot = ideaStage >= 4 && D.route && (end === -1 ? D.route[1] === i : D.route[D.route.length - 2] === i);
    g.setLineDash(hot ? [] : [4, 3]); g.strokeStyle = css('--carmine'); g.lineWidth = hot ? 4 : 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]); } }
  if (ideaStage >= 5 && D.steps) { g.beginPath(); D.steps.forEach((c, k) => { const [x, y] = C(c); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = css('--plate'); g.lineWidth = 5; g.stroke(); g.strokeStyle = css('--ink'); g.lineWidth = 2; g.stroke(); }
  if (ideaStage >= 1) D.doors.forEach((d, i) => { const [x, y] = dp(d); dot(g, x, y, ideaStage >= 4 && inRoute(i) ? 7 : 5.5, '--gold'); });
  dot(g, sx, sy, 7, '--ink'); g.fillStyle = css('--carmine'); g.beginPath(); g.moveTo(tx, ty - 8); g.lineTo(tx + 8, ty); g.lineTo(tx, ty + 8); g.lineTo(tx - 8, ty); g.closePath(); g.fill();
  lbl(g, 'START', sx, sy + 15, css('--ink')); lbl(g, 'TARGET', tx, ty - 15, css('--carmine'));
  let text = IDEA_TEXT[ideaStage][1];
  if (!D.sameRegion && ideaStage >= 3) { text = 'The wall now runs from the bottom edge to the top edge. START and TARGET are in different regions, so no chain of links can join them. The planner knows this before searching, and sends the unit to the nearest point it can reach (red ring).';
    if (D.near != null) { const [nx, ny] = C(D.near); g.strokeStyle = css('--carmine'); g.lineWidth = 2.5; g.beginPath(); g.arc(nx, ny, 9, 0, 7); g.stroke(); } }
  $('ideaText').innerHTML = `<b>${ideaStage + 1} · ${IDEA_TEXT[ideaStage][0]}.</b> ${text}`;
}
chips($('ideaSteps'), IDEA_TEXT.map((t, i) => `${i + 1} · ${t[0]}`), reduce ? 5 : 0, (i) => { ideaStage = i; ideaAuto = false; drawIdea(); });
let ideaAuto = !reduce; if (reduce) ideaStage = 5;
$('ideaClosed').onchange = (e) => { ideaClosed = e.target.checked; ideaData = null; drawIdea(); };
if (ideaAuto) setInterval(() => { if (!ideaAuto) return; ideaStage = (ideaStage + 1) % 6; [...$('ideaSteps').children].forEach((c, j) => c.setAttribute('aria-pressed', j === ideaStage)); drawIdea(); }, 4200);
redrawers.push(drawIdea);

/* hero animation loop and global redraws */
if (!reduce) { const hl = (now) => { if (now - heroT0 < 1200 && onScreen($('hero'))) drawHero(now); requestAnimationFrame(hl); }; requestAnimationFrame(hl); }
const all = () => { CSS.clear(); baseCv = null; redrawers.forEach((f) => f()); };
addEventListener('resize', () => requestAnimationFrame(all));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', all);
new MutationObserver(all).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
document.fonts && document.fonts.ready.then(all);
all();
})();

}
const NAMES = ['pf-search', 'pf-hero', 'pf-words', 'pf-cases', 'pf-oval', 'pf-game', 'pf-idea', 'pf-lab', 'pf-bars']
define(Object.fromEntries(NAMES.map((n) => [n, n === 'pf-search' ? PfSearch : class extends PvFig {}])))
Promise.all(NAMES.map((n) => customElements.whenDefined(n))).then(boot)
