// Shortest paths: every figure runs the real algorithm in the browser, on small
// grids or on a sketch of Dutch roads (the problem Dijkstra first solved).
import { S, H, attr, clamp, pills, stepper, wrap, tooltip, hit, Figure, define, STILL, REDUCED } from './core.js'

// ── a binary heap, ties broken by insertion order so every run is the same ──
class Heap {
  constructor() { this.a = []; this.n = 0; this.cmp = 0 }
  less(p, q) { this.cmp++; return p[0] < q[0] || (p[0] === q[0] && p[2] < q[2]) }
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
    return top
  }
  get size() { return this.a.length }
}
const fmt = (n) => Math.round(n).toLocaleString('en-US')
const say = (rows, text, max = 76) => { const r = wrap(text, max); rows.forEach((t, j) => { t.textContent = r[j] || '' }) }
const textRows = (svg, x, y, n) => Array.from({ length: n }, (_, i) => S('text', { x, y: y + i * 17, class: 't2', 'font-size': 12.5 }, svg))

// ── grids: cells, walls drawn by dragging, searches on them ──
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], D8 = [...D4, [1, 1], [1, -1], [-1, 1], [-1, -1]]
function makeGrid(W, H, cs, x0, y0, walls) {
  const b = new Uint8Array(W * H)
  for (const [ax, ay, bx, by] of walls) for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) b[y * W + x] = 1
  return { W, H, cs, x0, y0, b }
}
// f(next, stepLength) for each legal move; a diagonal needs both cells beside it open
function moves(G, i, eight, f) {
  const x = i % G.W, y = (i / G.W) | 0
  for (const [dx, dy] of eight ? D8 : D4) {
    const nx = x + dx, ny = y + dy
    if (nx < 0 || ny < 0 || nx >= G.W || ny >= G.H || G.b[ny * G.W + nx]) continue
    if (dx && dy && (G.b[y * G.W + nx] || G.b[ny * G.W + x])) continue
    f(ny * G.W + nx, dx && dy ? Math.SQRT2 : 1)
  }
}
const octile = (G, a, b) => { const dx = Math.abs(a % G.W - b % G.W), dy = Math.abs(((a / G.W) | 0) - ((b / G.W) | 0)); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy) }
const euclid = (G, a, b) => Math.hypot(a % G.W - b % G.W, ((a / G.W) | 0) - ((b / G.W) | 0))
// best-first search: h = 0 is Dijkstra; returns the cells in the order they were finished
function bestFirst(G, s, t, h = () => 0, w = 1) {
  const g = new Float64Array(G.W * G.H).fill(Infinity), par = new Int32Array(G.W * G.H).fill(-1), done = new Uint8Array(G.W * G.H), q = new Heap(), order = []
  g[s] = 0; q.push(w * h(s), s)
  while (q.size) {
    const c = q.pop()[1]; if (done[c]) continue
    done[c] = 1; order.push(c); if (c === t) break
    moves(G, c, true, (j, l) => { if (g[c] + l < g[j] - 1e-9) { g[j] = g[c] + l; par[j] = c; q.push(g[j] + w * h(j), j) } })
  }
  return { order, g, path: pathTo(par, t, done[t]), cost: g[t] }
}
const pathTo = (par, t, ok) => { const p = []; if (ok) for (let c = t; c !== -1; c = par[c]) p.push(c); return p.reverse() }
const cx = (G, i) => G.x0 + (i % G.W + .5) * G.cs, cy = (G, i) => G.y0 + (((i / G.W) | 0) + .5) * G.cs
const sqD = (G, list, inset = 0) => list.map((i) => `M${G.x0 + (i % G.W) * G.cs + inset} ${G.y0 + ((i / G.W) | 0) * G.cs + inset}h${G.cs - 2 * inset}v${G.cs - 2 * inset}h${2 * inset - G.cs}z`).join('')
const polyD = (G, cells) => cells.length ? 'M' + cells.map((c) => `${cx(G, c)} ${cy(G, c)}`).join('L') : ''
// the board: background, walls, overlay layers, a start dot and a target diamond
function board(svg, G) {
  S('rect', { x: G.x0, y: G.y0, width: G.W * G.cs, height: G.H * G.cs, class: 'f-panel s-rule' }, svg)
  const grid = []; for (let x = 1; x < G.W; x++) grid.push(`M${G.x0 + x * G.cs} ${G.y0}v${G.H * G.cs}`); for (let y = 1; y < G.H; y++) grid.push(`M${G.x0} ${G.y0 + y * G.cs}h${G.W * G.cs}`)
  S('path', { d: grid.join(''), class: 'f-none s-rule', 'stroke-width': .5 }, svg)
  const L = {
    under: S('g', {}, svg), walls: S('path', { class: 'f-ink2' }, svg), over: S('g', {}, svg),
    s: S('circle', { r: G.cs * .42, class: 'f-ink' }, svg), t: S('path', { class: 'f-bg s-ink', 'stroke-width': 2 }, svg),
  }
  L.paint = () => { const w = []; for (let i = 0; i < G.W * G.H; i++) if (G.b[i]) w.push(i); L.walls.setAttribute('d', sqD(G, w)) }
  L.ends = (s, t) => { attr(L.s, { cx: cx(G, s), cy: cy(G, s) }); const r = G.cs * .5; attr(L.t, { d: `M${cx(G, t)} ${cy(G, t) - r}l${r} ${r}l${-r} ${r}l${-r}${-r}z` }) }
  L.paint(); return L
}
// drag to draw or erase walls, or drag the start and the target; done() after each change
function editable(fig, G, ends, done) {
  const svg = fig.svg; let mode = null
  const cellAt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); const x = Math.floor((q.x - G.x0) / G.cs), y = Math.floor((q.y - G.y0) / G.cs); return x >= 0 && y >= 0 && x < G.W && y < G.H ? y * G.W + x : -1 }
  svg.style.touchAction = 'none'; svg.style.cursor = 'crosshair'
  svg.addEventListener('pointerdown', (e) => {
    const c = cellAt(e); if (c < 0) return
    mode = c === ends.s ? 's' : c === ends.t ? 't' : G.b[c] ? 0 : 1
    if (mode === 0 || mode === 1) G.b[c] = mode
    svg.setPointerCapture(e.pointerId); done(true)
  })
  svg.addEventListener('pointermove', (e) => {
    if (mode == null) return; const c = cellAt(e); if (c < 0) return
    if (mode === 's' || mode === 't') { if (!G.b[c] && c !== ends[mode === 's' ? 't' : 's'] && c !== ends[mode]) { ends[mode] = c; done(true) } }
    else if (c !== ends.s && c !== ends.t && G.b[c] !== mode) { G.b[c] = mode; done(true) }
  })
  svg.addEventListener('pointerup', () => { if (mode != null) { mode = null; done(false) } })
}

// ── fig 1: breadth-first search, the wave ──
class SpBfs extends Figure {
  constructor() { super(); this.duration = 6; this.poster = 6 }
  build() {
    const svg = this.svgRoot(600, 352, 'Breadth-first search spreading over a grid in rings of equal distance')
    this.G = makeGrid(32, 16, 17, 28, 8, [[8, 2, 8, 13], [16, 0, 16, 9], [16, 12, 16, 15], [23, 3, 23, 15], [9, 7, 13, 7]])
    this.L = board(svg, this.G); this.ends = { s: 2 * 32 + 3, t: 13 * 32 + 29 }
    this.rings = S('g', {}, this.L.under); this.line = S('path', { class: 'f-none s-green', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, this.L.over)
    this.nums = S('g', { class: 't3', 'font-size': 8, 'text-anchor': 'middle' }, this.L.over)
    this.rows = textRows(svg, 28, 300, 2)
    editable(this, this.G, this.ends, (live) => { this.load(); this.seek(live ? this.duration : 0); if (!live && !STILL && !REDUCED) this.play() })
    this.load()
  }
  load() {
    const G = this.G, { s, t } = this.ends, d = new Int32Array(G.W * G.H).fill(-1), par = new Int32Array(G.W * G.H).fill(-1), q = [s]; d[s] = 0
    for (let h = 0; h < q.length; h++) { const c = q[h]; moves(G, c, false, (j) => { if (d[j] < 0) { d[j] = d[c] + 1; par[j] = c; q.push(j) } }) }
    this.d = d; this.q = q; this.max = d[q.at(-1)]; this.path = pathTo(par, t, d[t] >= 0); this.L.ends(s, t)
    // one path per ring parity, rebuilt per frame from the cells reached so far
    this.rings.replaceChildren(); this.ringP = [0, 1].map((k) => S('path', { class: 'f-green', opacity: k ? .32 : .18 }, this.rings))
    this.nums.replaceChildren(); this.numEls = q.map((c) => S('text', { x: cx(G, c), y: cy(G, c) + 3, text: d[c] }, this.nums))
  }
  label() { return `distance ${this.shownD ?? 0}` }
  render(t) {
    if (!this.d) return
    const G = this.G, k = Math.floor(clamp(t / (this.duration - 1)) * (this.max + 1)), parts = [[], []]
    this.q.forEach((c, i) => { const on = this.d[c] < k; if (on) parts[this.d[c] % 2].push(c); this.numEls[i].style.display = on ? '' : 'none' })
    this.ringP.forEach((p, i) => p.setAttribute('d', sqD(G, parts[i])))
    const reached = this.d[this.ends.t] >= 0 && this.d[this.ends.t] < k
    this.line.setAttribute('d', reached ? polyD(G, this.path) : ''); this.shownD = Math.max(0, k - 1)
    const n = this.q.filter((c) => this.d[c] < k).length, nt = this.q.filter((c) => this.d[c] <= this.d[this.ends.t]).length
    say(this.rows, reached
      ? `The target is ${this.d[this.ends.t]} steps away. Before reaching it the search went through ${fmt(nt)} cells, every one of them no farther than the target. Drag to draw walls, or drag the dot and the diamond.`
      : this.d[this.ends.t] < 0 && k > this.max ? `Every reachable cell is numbered, and the target isn't among them: the walls cut it off.`
        : `Ring ${Math.max(0, k - 1)}: ${fmt(n)} cells so far. Every cell in a ring is one step farther than the ring before.`)
  }
}

// ── the road sketch for figs 2 and 9: towns and roads, lengths rounded and illustrative ──
const TOWNS = [['Rotterdam', 92, 282, 12, 4, 'start'], ['Den Haag', 58, 214, -12, -12, 'end'], ['Amsterdam', 148, 128, -12, -12, 'end'], ['Utrecht', 180, 222, -12, -10, 'end'], ['Amersfoort', 244, 190, 2, 26, 'start'], ['Arnhem', 318, 254, 12, 4, 'start'], ['Zwolle', 330, 140, 12, 4, 'start'], ['Leeuwarden', 246, 40, -12, -6, 'end'], ['Groningen', 380, 70, 12, 4, 'start']]
// [a, b, km, lanes each way, chance the road is open]
const ROADS = [[0, 1, 25, 3, .99], [0, 3, 60, 3, .97], [1, 2, 60, 2, .98], [2, 3, 45, 3, .96], [3, 4, 25, 3, .98], [3, 5, 65, 2, .97], [2, 4, 50, 2, .99],
  [4, 6, 70, 2, .95], [5, 6, 70, 2, .99], [2, 7, 140, 1, .9], [6, 8, 90, 2, .96], [7, 8, 60, 2, .98], [6, 7, 95, 1, .97]]
function roadMap(svg, roads, onEdge) {
  const g = S('g', {}, svg), E = roads.map((r, i) => {
    const [a, b] = r, A = TOWNS[a], B = TOWNS[b], mx = (A[1] + B[1]) / 2, my = (A[2] + B[2]) / 2
    const line = S('line', { x1: A[1], y1: A[2], x2: B[1], y2: B[2], class: 's-rule', 'stroke-width': 2.2 }, g)
    const tag = S('g', { style: onEdge ? 'cursor:pointer' : '' }, svg)
    const bg = S('rect', { x: mx - 15, y: my - 8, width: 30, height: 15, rx: 4, class: 'f-panel s-rule', 'stroke-width': .8 }, tag)
    const tx = S('text', { x: mx, y: my + 3.5, class: 't2', 'font-size': 10.5, 'text-anchor': 'middle' }, tag)
    if (onEdge) tag.addEventListener('click', () => onEdge(i))
    return { line, bg, tx }
  })
  const N = TOWNS.map(([name, x, y, dx, dy, anchor]) => {
    const c = S('circle', { cx: x, cy: y, r: 8, class: 'f-panel s-ink', 'stroke-width': 1.6 }, svg)
    const nm = S('text', { x: x + dx, y: y + dy, class: 't', 'font-size': 11.5, 'text-anchor': anchor, text: name }, svg)
    const d = S('text', { x: x + dx, y: y + dy + 14, class: 't2', 'font-size': 11, 'text-anchor': anchor }, svg)
    return { c, nm, d }
  })
  return { E, N }
}
const adjOf = (roads) => { const adj = TOWNS.map(() => []); roads.forEach(([a, b], i) => { adj[a].push([b, i]); adj[b].push([a, i]) }); return adj }

// ── fig 2: Dijkstra step by step ──
class SpDijkstra extends Figure {
  build() {
    const svg = this.svgRoot(600, 372, 'Dijkstra from Rotterdam to Groningen, one step at a time')
    this.roads = ROADS.map((r) => r.slice())
    this.M = roadMap(svg, this.roads, (i) => { const r = this.roads[i]; r[2] = r[2] >= 150 ? 20 : r[2] + 10; this.load(this.step.i) })
    S('text', { x: 432, y: 30, class: 't3', 'font-size': 11, text: 'QUEUE (cheapest first)' }, svg)
    this.qrows = Array.from({ length: 9 }, (_, i) => S('text', { x: 432, y: 54 + i * 19, class: 't', 'font-size': 12.5 }, svg))
    this.rows = textRows(svg, 20, 322, 3)
    this.idleText = 'interactive'
    this.step = stepper(this, (i) => this.show(i))
    this.load(0)
  }
  load(at) {
    const adj = adjOf(this.roads), n = TOWNS.length, d = Array(n).fill(Infinity), par = Array(n).fill(-1), done = Array(n).fill(false), F = []
    d[0] = 0
    const snap = (cur, relax, text) => F.push({ d: d.slice(), par: par.slice(), done: done.slice(), cur, relax, text, queue: d.map((v, i) => [v, i]).filter(([v, i]) => !done[i] && v < Infinity).sort((a, b) => a[0] - b[0] || a[1] - b[1]) })
    snap(-1, [], 'Start: Rotterdam is 0 km from itself, every other town is ∞. The queue holds only Rotterdam.')
    for (;;) {
      let u = -1; for (let i = 0; i < n; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i
      if (u < 0) break
      done[u] = true; const relax = [], better = []
      for (const [v, ei] of adj[u]) {
        if (done[v]) continue
        const nd = d[u] + this.roads[ei][2], ok = nd < d[v]
        relax.push([ei, ok]); if (ok) { better.push(`${TOWNS[v][0]} ${d[v] === Infinity ? '∞' : d[v]} → ${nd}`); d[v] = nd; par[v] = u }
      }
      snap(u, relax, `Take ${TOWNS[u][0]} (${d[u]} km) off the queue: no cheaper way to it can turn up, so it's final. ` +
        (relax.length ? (better.length ? `Through it: ${better.join(', ')}.` : 'No road from it makes a town cheaper.') : 'All its neighbours are final already.') +
        (u === 8 ? ` Groningen is done: ${d[8]} km.` : ''))
    }
    this.F = F; this.step.set(F.length, Math.min(at, F.length - 1))
  }
  show(i) {
    const f = this.F[i], { E, N } = this.M
    const tree = new Set(); f.par.forEach((p, v) => { if (p >= 0) { const e = this.roads.findIndex(([a, b]) => (a === p && b === v) || (a === v && b === p)); tree.add(e) } })
    // the final route to Groningen once it is settled
    const route = new Set(); if (f.done[8]) for (let v = 8; f.par[v] >= 0; v = f.par[v]) route.add(this.roads.findIndex(([a, b]) => (a === f.par[v] && b === v) || (a === v && b === f.par[v])))
    E.forEach((e, k) => {
      const r = f.relax.find(([ei]) => ei === k)
      attr(e.line, { class: route.has(k) ? 's-green' : r ? (r[1] ? 's-ochre' : 's-ink3') : tree.has(k) ? 's-ink2' : 's-rule', 'stroke-width': route.has(k) ? 4.5 : r ? 3.2 : tree.has(k) ? 2.6 : 2, 'stroke-dasharray': tree.has(k) || route.has(k) || r ? '' : '4 3' })
      e.tx.textContent = this.roads[k][2]
    })
    N.forEach((n, k) => {
      attr(n.c, { class: k === f.cur ? 'f-ochre s-ink' : f.done[k] ? 'f-green s-ink' : 'f-panel s-ink', r: k === f.cur ? 10 : 8 })
      n.d.textContent = f.d[k] === Infinity ? '∞' : `${f.d[k]} km`
      attr(n.d, { class: f.done[k] ? 't' : 't3' })
    })
    this.qrows.forEach((t, k) => { const e = f.queue[k]; t.textContent = e ? `${String(e[0]).padStart(4)}  ${TOWNS[e[1]][0]}` : '' })
    say(this.rows, f.text, 76)
  }
}

// ── fig 3: a negative edge, Dijkstra against Bellman-Ford ──
const NEG = { names: ['S', 'A', 'B', 'T'], pos: [[70, 140], [250, 60], [250, 220], [430, 140]], edges: [[0, 1, 2], [0, 2, 5], [2, 1, -4], [1, 3, 1]] }
class SpNegative extends Figure {
  build() {
    const svg = this.svgRoot(600, 340, 'A graph with a negative edge where Dijkstra gives the wrong answer and Bellman-Ford does not')
    S('defs', {}, svg).innerHTML = '<marker id="sp-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" class="f-ink2"/></marker>'
    this.eg = S('g', {}, svg); this.ng = S('g', {}, svg)
    this.tbl = S('g', {}, svg); this.rows = textRows(svg, 20, 290, 3)
    this.mode = 'dij'; this.cycle = false
    pills(this, [['dij', 'Dijkstra'], ['bf', 'Bellman-Ford'], ['cyc', 'Bellman-Ford, with a negative cycle']], 'dij', (v) => { this.mode = v === 'cyc' ? 'bf' : v; this.cycle = v === 'cyc'; this.load() })
    this.step = stepper(this, (i) => this.show(i))
    this.load()
  }
  load() {
    const edges = NEG.edges.concat(this.cycle ? [[1, 2, 1]] : []), n = 4, d = [0, Infinity, Infinity, Infinity], F = []
    this.edges = edges
    if (this.mode === 'dij') {
      const done = [false, false, false, false]
      F.push({ d: d.slice(), done: done.slice(), hot: [], text: 'Dijkstra from S. Every edge is a cost except B → A, which pays 4 back.' })
      for (;;) {
        let u = -1; for (let i = 0; i < n; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i
        if (u < 0) break
        done[u] = true; const hot = [], notes = []
        edges.forEach(([a, b, w], k) => { if (a !== u) return; hot.push(k); if (done[b]) { if (d[u] + w < d[b]) notes.push(`${NEG.names[b]} could drop to ${d[u] + w}, but it's already final`) } else if (d[u] + w < d[b]) { d[b] = d[u] + w; notes.push(`${NEG.names[b]} = ${d[b]}`) } })
        F.push({ d: d.slice(), done: done.slice(), hot, cur: u, text: `Settle ${NEG.names[u]} at ${d[u]}. ${notes.join('; ') || 'Nothing to update.'}` })
      }
      F.at(-1).text += ` Dijkstra answers T = ${d[3]}. The real shortest path S → B → A → T costs 5 − 4 + 1 = 2: A was made final before B could pay into it.`
    } else {
      F.push({ d: d.slice(), hot: [], text: `Bellman-Ford relaxes every edge, ${n - 1} rounds in all (one fewer than the nodes), in a fixed order: ${edges.map(([a, b]) => NEG.names[a] + NEG.names[b]).join(', ')}.` })
      for (let r = 1; r <= n; r++) {
        let changed = []
        edges.forEach(([a, b, w]) => { if (d[a] + w < d[b]) { d[b] = d[a] + w; changed.push(`${NEG.names[b]} = ${d[b]}`) } })
        const extra = r === n
        F.push({ d: d.slice(), hot: edges.map((_, k) => k), round: r, text: extra
          ? (changed.length ? `Round ${r} is a check, one more than needed. Something still improves (${changed.join(', ')}), which only happens when a cycle costs less than nothing: there is no shortest path.` : `Round ${r} is a check, one more than needed, and nothing changes: the distances are final. T = ${d[3]}.`)
          : `Round ${r}: ${changed.length ? changed.join(', ') : 'nothing changes'}.` })
      }
    }
    this.F = F; this.step.set(F.length, 0)
  }
  show(i) {
    const f = this.F[i]; this.eg.replaceChildren(); this.ng.replaceChildren()
    this.edges.forEach(([a, b, w], k) => {
      const [x1, y1] = NEG.pos[a], [x2, y2] = NEG.pos[b], l = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / l, uy = (y2 - y1) / l
      const bend = (a === 1 && b === 2) || (a === 2 && b === 1) ? (a === 1 ? 26 : -26) : 0, mx = (x1 + x2) / 2 + bend, my = (y1 + y2) / 2
      const hot = f.hot.includes(k)
      S('path', { d: `M${x1 + ux * 20} ${y1 + uy * 20}Q${mx} ${my} ${x2 - ux * 22} ${y2 - uy * 22}`, class: `f-none ${w < 0 ? 's-ochre' : hot ? 's-ink' : 's-ink3'}`, 'stroke-width': hot ? 2.6 : 1.6, 'marker-end': 'url(#sp-ar)' }, this.eg)
      S('text', { x: mx + (bend ? bend * .4 : 0), y: my - 7, class: w < 0 ? 't' : 't2', 'font-size': 13, 'text-anchor': 'middle', text: w }, this.eg)
    })
    NEG.pos.forEach(([x, y], k) => {
      S('circle', { cx: x, cy: y, r: 18, class: k === f.cur ? 'f-ochre s-ink' : f.done && f.done[k] ? 'f-green s-ink' : 'f-panel s-ink', 'stroke-width': 1.6 }, this.ng)
      S('text', { x, y: y + 5, class: 't', 'font-size': 14, 'text-anchor': 'middle', text: NEG.names[k] }, this.ng)
      S('text', { x: x + (k === 3 ? 0 : k === 0 ? -26 : 26), y: k === 3 ? y + 38 : y + 5, class: 't2', 'font-size': 13, 'text-anchor': k === 3 ? 'middle' : k === 0 ? 'end' : 'start', text: f.d[k] === Infinity ? '∞' : f.d[k] }, this.ng)
    })
    say(this.rows, f.text, 76)
  }
}

// ── fig 4: the A* playground ──
const H4 = { none: [() => 0, 1, 'no guess (Dijkstra)'], euclid: [euclid, 1, 'straight line'], octile: [octile, 1, 'octile'], greedy: [octile, 2, 'octile × 2'] }
class SpAstar extends Figure {
  constructor() { super(); this.duration = 5; this.poster = 5 }
  build() {
    const svg = this.svgRoot(600, 360, 'A* on a grid with walls you can draw, under four different guesses')
    this.G = makeGrid(40, 20, 13.5, 30, 8, [[12, 3, 12, 19], [12, 3, 26, 3], [26, 3, 26, 14], [19, 8, 19, 19], [33, 0, 33, 10]])
    this.L = board(svg, this.G); this.ends = { s: 10 * 40 + 4, t: 16 * 40 + 35 }
    this.vis = S('path', { class: 'f-green', opacity: .28 }, this.L.under)
    this.front = S('path', { class: 'f-ochre', opacity: .7 }, this.L.under)
    this.line = S('path', { class: 'f-none s-ink', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, this.L.over)
    this.rows = textRows(svg, 30, 300, 3)
    this.h = 'octile'
    pills(this, Object.entries(H4).map(([k, v]) => [k, v[2]]), 'octile', (v) => { this.h = v; this.load(); this.replay() })
    editable(this, this.G, this.ends, (live) => { this.load(); this.seek(this.duration); if (!live) this.replay() })
    this.load()
  }
  replay() { if (STILL || REDUCED) this.seek(this.duration); else { this.seek(0); this.play() } }
  load() {
    const G = this.G, [hf, w] = H4[this.h], { s, t } = this.ends
    this.r = bestFirst(G, s, t, (c) => hf(G, c, t), w); this.best = bestFirst(G, s, t, (c) => octile(G, c, t)).cost
    this.L.ends(s, t); this.L.paint()
  }
  label() { return `${fmt(this.k || 0)} cells` }
  render(t) {
    if (!this.r) return
    const G = this.G, o = this.r.order, k = Math.round(clamp(t / (this.duration - .6)) * o.length); this.k = k
    this.vis.setAttribute('d', sqD(G, o.slice(0, k))); this.front.setAttribute('d', k < o.length ? sqD(G, o.slice(Math.max(0, k - 6), k), 1) : '')
    const end = k >= o.length, ok = this.r.path.length > 0
    this.line.setAttribute('d', end ? polyD(G, this.r.path) : '')
    const name = H4[this.h][2], over = ok ? (this.r.cost / this.best - 1) * 100 : 0
    say(this.rows, !end ? `${name}: ${fmt(k)} cells finished so far, each picked by its cost so far plus ${this.h === 'none' ? 'nothing' : this.h === 'greedy' ? 'twice the guess' : 'the guess'}.`
      : !ok ? `No path: the walls close the target off. ${name} still looked at ${fmt(o.length)} cells to be sure.`
        : `${name}: ${fmt(o.length)} cells looked at, path length ${this.r.cost.toFixed(1)}${over > .05 ? `, ${over.toFixed(1)}% longer than the shortest` : ', the shortest there is'}. Drag to draw walls, or move the dot and the diamond.`, 76)
  }
}

// ── fig 5: one search or two ──
function bidirectional(G, s, t) {
  const n = G.W * G.H, g = [new Float64Array(n).fill(Infinity), new Float64Array(n).fill(Infinity)], done = [new Uint8Array(n), new Uint8Array(n)], par = [new Int32Array(n).fill(-1), new Int32Array(n).fill(-1)]
  const q = [new Heap(), new Heap()], order = []; g[0][s] = 0; g[1][t] = 0; q[0].push(0, s); q[1].push(0, t)
  let best = Infinity, meet = -1
  const top = (k) => { while (q[k].size && done[k][q[k].a[0][1]]) q[k].pop(); return q[k].size ? q[k].a[0][0] : Infinity }
  for (;;) {
    const a = top(0), b = top(1)
    if (a + b >= best || (a === Infinity && b === Infinity)) break   // nothing left can beat the best meeting
    const k = a <= b ? 0 : 1, c = q[k].pop()[1]
    done[k][c] = 1; order.push([c, k])
    moves(G, c, true, (j, l) => {
      if (g[k][c] + l < g[k][j] - 1e-9) { g[k][j] = g[k][c] + l; par[k][j] = c; q[k].push(g[k][j], j) }
      if (g[k][j] + g[1 - k][j] < best) { best = g[k][j] + g[1 - k][j]; meet = j }
    })
  }
  const path = []; if (meet >= 0) { for (let c = meet; c !== -1; c = par[0][c]) path.unshift(c); for (let c = par[1][meet]; c !== -1; c = par[1][c]) path.push(c) }
  return { order, path, cost: best, meet }
}
class SpBidir extends Figure {
  constructor() { super(); this.duration = 5; this.poster = 5 }
  build() {
    const svg = this.svgRoot(600, 336, 'Dijkstra from the start only, against two searches from both ends that meet in the middle')
    this.G = makeGrid(60, 32, 9, 30, 8, [[30, 12, 30, 20]])
    this.L = board(svg, this.G); this.ends = { s: 16 * 60 + 20, t: 16 * 60 + 40 }
    this.p = [S('path', { class: 'f-green', opacity: .3 }, this.L.under), S('path', { class: 'f-ochre', opacity: .38 }, this.L.under)]
    this.line = S('path', { class: 'f-none s-ink', 'stroke-width': 2.4 }, this.L.over); this.dot = S('circle', { r: 5, class: 'f-none s-ink', 'stroke-width': 2 }, this.L.over)
    this.rows = textRows(svg, 30, 314, 2); this.two = true
    pills(this, [['one', 'one search'], ['two', 'two searches']], 'two', (v) => { this.two = v === 'two'; this.load(); if (STILL || REDUCED) this.seek(this.duration); else { this.seek(0); this.play() } })
    editable(this, this.G, this.ends, (live) => { this.load(); this.seek(this.duration); if (!live && !STILL && !REDUCED) { this.seek(0); this.play() } })
    this.load()
  }
  load() {
    const G = this.G, { s, t } = this.ends
    this.one = bestFirst(G, s, t); this.bi = bidirectional(G, s, t); this.L.ends(s, t); this.L.paint()
    this.r = this.two ? this.bi : { order: this.one.order.map((c) => [c, 0]), path: this.one.path, cost: this.one.cost, meet: -1 }
  }
  label() { return `${fmt(this.k || 0)} cells` }
  render(t) {
    if (!this.r) return
    const G = this.G, o = this.r.order, k = Math.round(clamp(t / (this.duration - .6)) * o.length), parts = [[], []]; this.k = k
    for (let i = 0; i < k; i++) parts[o[i][1]].push(o[i][0])
    this.p.forEach((p, i) => p.setAttribute('d', sqD(G, parts[i])))
    const end = k >= o.length
    this.line.setAttribute('d', end ? polyD(G, this.r.path) : '')
    if (end && this.r.meet >= 0) attr(this.dot, { cx: cx(G, this.r.meet), cy: cy(G, this.r.meet), r: 6 }); else attr(this.dot, { r: 0 })
    say(this.rows, !end ? `${fmt(k)} cells so far.`
      : this.two ? `Two searches: ${fmt(o.length)} cells, against ${fmt(this.one.order.length)} for one. They met at the ringed cell, path length ${this.r.cost.toFixed(1)}, the same as one search finds.`
        : `One search: ${fmt(o.length)} cells, a disc out to the target's distance. Two half-size discs cover about half the area.`, 76)
  }
}

// ── fig 6: landmarks make the guess sharper ──
const CORNERS = (G) => [0, G.W - 1, (G.H - 1) * G.W, G.W * G.H - 1]
class SpAlt extends Figure {
  build() {
    const svg = this.svgRoot(600, 342, 'A* with the octile guess against A* with landmark guesses on a map with long walls')
    this.G = makeGrid(40, 20, 13.5, 30, 8, [[6, 0, 6, 16], [14, 3, 14, 19], [22, 0, 22, 16], [30, 3, 30, 19]])
    this.L = board(svg, this.G); this.ends = { s: 18 * 40 + 2, t: 1 * 40 + 37 }; this.L.ends(this.ends.s, this.ends.t)
    this.vis = S('path', { class: 'f-green', opacity: .3 }, this.L.under)
    this.line = S('path', { class: 'f-none s-ink', 'stroke-width': 2.4 }, this.L.over)
    this.lm = S('g', {}, this.L.over); this.rows = textRows(svg, 30, 300, 2)
    const [a, b, c, d] = CORNERS(this.G)
    this.sets = { none: [], one: [c], two: [c, b], four: [a, b, c, d] }
    pills(this, [['none', 'octile guess only'], ['one', '1 landmark'], ['two', '2 landmarks'], ['four', '4 landmarks']], 'none', (v) => this.show(v))
    this.dist = new Map(); this.show('none')
  }
  from(L) { if (!this.dist.has(L)) this.dist.set(L, bestFirst(this.G, L, -1).g); return this.dist.get(L) }
  show(v) {
    const G = this.G, { s, t } = this.ends, Ls = this.sets[v], D = Ls.map((L) => this.from(L))
    // triangle inequality: |d(L, t) − d(L, v)| never overestimates d(v, t)
    const h = (c) => { let m = octile(G, c, t); for (const d of D) m = Math.max(m, Math.abs(d[t] - d[c])); return m }
    const r = bestFirst(G, s, t, h), base = bestFirst(G, s, t, (c) => octile(G, c, t))
    this.vis.setAttribute('d', sqD(G, r.order)); this.line.setAttribute('d', polyD(G, r.path))
    this.lm.replaceChildren(); Ls.forEach((L) => { const x = cx(G, L), y = cy(G, L); S('path', { d: `M${x} ${y - 8}l8 8l-8 8l-8-8z`, class: 'f-ochre s-ink', 'stroke-width': 1.4 }, this.lm) })
    say(this.rows, v === 'none' ? `The octile guess ignores the walls, so A* fills each corridor the path doesn't need: ${fmt(r.order.length)} cells.`
      : `${Ls.length} landmark${Ls.length > 1 ? 's' : ''} (ochre), each with its exact distance to every cell computed in advance: ${fmt(r.order.length)} cells, against ${fmt(base.order.length)} with the octile guess. Same path, length ${r.cost.toFixed(1)}.`, 76)
  }
}

// ── fig 7: Floyd-Warshall fills a table ──
const FW = { names: ['A', 'B', 'C', 'D', 'E'], pos: [[70, 60], [200, 40], [230, 160], [100, 200], [40, 130]], edges: [[0, 1, 3], [0, 2, 8], [1, 3, 1], [1, 2, 7], [2, 1, 4], [3, 0, 2], [3, 2, 5], [4, 3, 6], [0, 4, 9]] }
class SpFloyd extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Floyd-Warshall filling a table of all shortest distances, one middle stop at a time')
    S('defs', {}, svg).innerHTML = '<marker id="sp-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" class="f-ink3"/></marker>'
    this.gg = S('g', {}, svg); this.tb = S('g', {}, svg); this.rows = textRows(svg, 20, 252, 2)
    const n = 5, d = FW.names.map((_, i) => FW.names.map((_, j) => i === j ? 0 : Infinity)); FW.edges.forEach(([a, b, w]) => { d[a][b] = w })
    const F = [{ d: d.map((r) => r.slice()), k: -1, changed: [] }]
    for (let k = 0; k < n; k++) {
      const changed = []
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (d[i][k] + d[k][j] < d[i][j]) { d[i][j] = d[i][k] + d[k][j]; changed.push([i, j]) }
      F.push({ d: d.map((r) => r.slice()), k, changed })
    }
    this.F = F; this.idleText = 'interactive'
    this.step = stepper(this, (i) => this.show(i)); this.step.set(F.length, 0)
  }
  show(i) {
    const f = this.F[i], n = 5; this.gg.replaceChildren(); this.tb.replaceChildren()
    FW.edges.forEach(([a, b, w]) => {
      const [x1, y1] = FW.pos[a], [x2, y2] = FW.pos[b], l = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / l, uy = (y2 - y1) / l, off = FW.edges.some(([p, q]) => p === b && q === a) ? 5 : 0
      const via = f.k >= 0 && (a === f.k || b === f.k)
      S('line', { x1: x1 + ux * 15 - uy * off, y1: y1 + uy * 15 + ux * off, x2: x2 - ux * 17 - uy * off, y2: y2 - uy * 17 + ux * off, class: via ? 's-ochre' : 's-ink3', 'stroke-width': via ? 2.2 : 1.3, 'marker-end': 'url(#sp-ar2)' }, this.gg)
      S('text', { x: x1 + (x2 - x1) * .38 - uy * (off + 9), y: y1 + (y2 - y1) * .38 + ux * (off + 9) + 4, class: 't2', 'font-size': 11, 'text-anchor': 'middle', text: w }, this.gg)
    })
    FW.pos.forEach(([x, y], k) => {
      S('circle', { cx: x, cy: y, r: 14, class: k === f.k ? 'f-ochre s-ink' : k < f.k ? 'f-green s-ink' : 'f-panel s-ink', 'stroke-width': 1.4 }, this.gg)
      S('text', { x, y: y + 5, class: 't', 'font-size': 13, 'text-anchor': 'middle', text: FW.names[k] }, this.gg)
    })
    const X = 330, Y = 30, c = 46
    FW.names.forEach((nm, k) => { S('text', { x: X + k * c + c / 2, y: Y - 8, class: 't3', 'font-size': 12, 'text-anchor': 'middle', text: nm }, this.tb); S('text', { x: X - 12, y: Y + k * c * .8 + 24, class: 't3', 'font-size': 12, 'text-anchor': 'middle', text: nm }, this.tb) })
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      const ch = f.changed.some(([p, q]) => p === a && q === b), lane = a === f.k || b === f.k
      S('rect', { x: X + b * c + 1, y: Y + a * c * .8 + 1, width: c - 2, height: c * .8 - 2, rx: 3, class: ch ? 'f-ochre' : lane ? 'f-rule2' : 'f-panel', opacity: ch ? .55 : 1 }, this.tb)
      S('text', { x: X + b * c + c / 2, y: Y + a * c * .8 + 23, class: ch ? 't' : 't2', 'font-size': 13, 'text-anchor': 'middle', text: f.d[a][b] === Infinity ? '∞' : f.d[a][b] }, this.tb)
    }
    say(this.rows, f.k < 0 ? 'The table starts as the direct edges: 0 on the diagonal, ∞ where there is no edge. Row is the start, column the end.'
      : `Allow ${FW.names[f.k]} as a middle stop: for every pair, is going through ${FW.names[f.k]} shorter? ${f.changed.length ? `${f.changed.length} entr${f.changed.length > 1 ? 'ies' : 'y'} improve (ochre), using the shaded row and column.` : 'Nothing improves.'}${f.k === 4 ? ' Every stop has been allowed, so the table is final.' : ''}`, 76)
  }
}

// ── fig 8: many starts at once, the map splits into territories ──
class SpMulti extends Figure {
  build() {
    const svg = this.svgRoot(600, 332, 'Dijkstra from several sources at once: each cell is coloured by its nearest source')
    this.G = makeGrid(40, 20, 13.5, 30, 8, [[10, 0, 10, 8], [10, 12, 10, 19], [24, 4, 24, 19], [25, 4, 34, 4], [16, 9, 20, 9]])
    this.L = board(svg, this.G); attr(this.L.s, { r: 0 }); attr(this.L.t, { d: '' })
    this.shade = [0, 1, 2].map((k) => S('path', { class: k === 1 ? 'f-ochre' : 'f-green', opacity: [.16, .3, .42][k] }, this.L.under))
    this.edge = S('path', { class: 'f-none s-ink', 'stroke-width': 1.6 }, this.L.over); this.src = S('g', {}, this.L.over)
    this.rows = textRows(svg, 30, 296, 2)
    this.S = [3 * 40 + 4, 15 * 40 + 6, 8 * 40 + 30]
    const bar = H('div', { class: 'fc' }, this); this.idleText = 'interactive'
    H('button', { class: 'pill', type: 'button', text: 'clear' }, bar).onclick = () => { this.S = []; this.show() }
    H('span', { class: 'fc-l', text: 'click an open cell to add or remove a source' }, bar)
    svg.style.cursor = 'crosshair'
    svg.addEventListener('click', (e) => {
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse())
      const x = Math.floor((q.x - this.G.x0) / this.G.cs), y = Math.floor((q.y - this.G.y0) / this.G.cs), c = y * this.G.W + x
      if (x < 0 || y < 0 || x >= this.G.W || y >= this.G.H || this.G.b[c]) return
      this.S = this.S.includes(c) ? this.S.filter((v) => v !== c) : this.S.length >= 6 ? this.S : [...this.S, c]; this.show()
    })
    this.show()
  }
  show() {
    const G = this.G, n = G.W * G.H, g = new Float64Array(n).fill(Infinity), own = new Int8Array(n).fill(-1), q = new Heap()
    // one queue, every source at distance 0: the same as Dijkstra from a virtual start joined to all of them
    this.S.forEach((s, k) => { g[s] = 0; own[s] = k; q.push(0, s) })
    while (q.size) { const [d, c] = q.pop(); if (d > g[c]) continue; moves(G, c, true, (j, l) => { if (d + l < g[j] - 1e-9) { g[j] = d + l; own[j] = own[c]; q.push(g[j], j) } }) }
    // colour so that touching territories never share a shade
    const touch = this.S.map(() => new Set()), edge = []
    for (let i = 0; i < n; i++) if (own[i] >= 0) for (const j of [i + 1, i + G.W]) if (j < n && (j !== i + 1 || j % G.W) && own[j] >= 0 && own[j] !== own[i]) {
      touch[own[i]].add(own[j]); touch[own[j]].add(own[i])
      const x = G.x0 + (i % G.W) * G.cs, y = G.y0 + ((i / G.W) | 0) * G.cs
      edge.push(j === i + 1 ? `M${x + G.cs} ${y}v${G.cs}` : `M${x} ${y + G.cs}h${G.cs}`)
    }
    const col = this.S.map(() => -1); col.forEach((_, k) => { let c = 0; while ([...touch[k]].some((o) => col[o] === c)) c++; col[k] = c % 3 })
    const parts = [[], [], []]; for (let i = 0; i < n; i++) if (own[i] >= 0) parts[col[own[i]]].push(i)
    this.shade.forEach((p, k) => p.setAttribute('d', sqD(G, parts[k]))); this.edge.setAttribute('d', edge.join(''))
    this.src.replaceChildren(); this.S.forEach((s, k) => { S('circle', { cx: cx(G, s), cy: cy(G, s), r: 7, class: 'f-ink' }, this.src); S('text', { x: cx(G, s), y: cy(G, s) + 3.5, class: 'f-bg', 'font-size': 9.5, 'text-anchor': 'middle', text: k + 1 }, this.src) })
    const far = Math.max(0, ...Array.from(g).filter((v) => v < Infinity))
    say(this.rows, this.S.length ? `${this.S.length} source${this.S.length > 1 ? 's' : ''}, one search. Every open cell belongs to its nearest source; the farthest cell from any of them is ${far.toFixed(1)} steps away.` : 'No sources. Click the map to add some, up to six.', 76)
  }
}

// ── fig 9: the same algorithm for other path problems ──
const PROBLEMS = {
  short: { label: 'shortest', start: 0, worse: Infinity, join: (a, e) => a + e[2], better: (a, b) => a < b, show: (v) => `${v} km`, edge: (e) => e[2], what: 'add the lengths, keep the smallest total' },
  wide: { label: 'widest', start: Infinity, worse: -Infinity, join: (a, e) => Math.min(a, e[3]), better: (a, b) => a > b, show: (v) => `${v} lane${v > 1 ? 's' : ''}`, edge: (e) => e[3], what: 'a route is as wide as its narrowest road; keep the widest' },
  safe: { label: 'most reliable', start: 1, worse: -Infinity, join: (a, e) => a * e[4], better: (a, b) => a > b, show: (v) => `${(v * 100).toFixed(1)}%`, edge: (e) => e[4].toFixed(2).slice(1), what: 'multiply the chances each road is open, keep the largest' },
  hops: { label: 'fewest roads', start: 0, worse: Infinity, join: (a) => a + 1, better: (a, b) => a < b, show: (v) => `${v} road${v > 1 ? 's' : ''}`, edge: () => 1, what: 'every road counts 1; keep the smallest count' },
}
class SpAlgebra extends Figure {
  build() {
    const svg = this.svgRoot(600, 352, 'Dijkstra solving four different path problems on the same roads')
    this.M = roadMap(svg, ROADS); this.rows = textRows(svg, 20, 318, 2)
    S('text', { x: 432, y: 30, class: 't3', 'font-size': 11, text: 'FROM ROTTERDAM' }, svg)
    this.list = Array.from({ length: 8 }, (_, i) => S('text', { x: 432, y: 54 + i * 19, class: 't', 'font-size': 12 }, svg))
    pills(this, Object.entries(PROBLEMS).map(([k, p]) => [k, p.label]), 'short', (v) => this.show(v))
    this.show('short')
  }
  show(key) {
    const P = PROBLEMS[key], n = TOWNS.length, adj = adjOf(ROADS), best = Array(n).fill(P.worse), par = Array(n).fill(-1), done = Array(n).fill(false)
    best[0] = P.start
    // Dijkstra with "better" in place of "smaller": correct because extending a route never improves it
    for (;;) {
      let u = -1; for (let i = 0; i < n; i++) if (!done[i] && best[i] !== P.worse && (u < 0 || P.better(best[i], best[u]))) u = i
      if (u < 0) break; done[u] = true
      for (const [v, ei] of adj[u]) { const c = P.join(best[u], ROADS[ei]); if (!done[v] && P.better(c, best[v])) { best[v] = c; par[v] = u } }
    }
    const route = new Set(); for (let v = 8; par[v] >= 0; v = par[v]) route.add(ROADS.findIndex(([a, b]) => (a === par[v] && b === v) || (a === v && b === par[v])))
    this.M.E.forEach((e, k) => { attr(e.line, { class: route.has(k) ? 's-green' : 's-rule', 'stroke-width': route.has(k) ? 4.5 : 2 }); e.tx.textContent = P.edge(ROADS[k]) })
    this.M.N.forEach((nd, k) => { attr(nd.c, { class: k === 0 || k === 8 ? 'f-ink s-ink' : route.size && [...route].some((ei) => ROADS[ei][0] === k || ROADS[ei][1] === k) ? 'f-green s-ink' : 'f-panel s-ink' }); nd.d.textContent = '' })
    this.list.forEach((t, i) => { const k = i + 1; t.textContent = `${TOWNS[k][0].padEnd(11)} ${P.show(best[k])}` })
    say(this.rows, `${P.label[0].toUpperCase() + P.label.slice(1)}: ${P.what}. To Groningen: ${P.show(best[8])}.`, 76)
  }
}

// ── fig 10: what the queue costs, counted live ──
function dijkstraCount(side, kind, seed) {
  // a grid graph with random weights 1..9, Dijkstra from a corner; counts the queue's basic steps
  let s = seed; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  const n = side * side, wR = Array.from({ length: n }, () => 1 + Math.floor(rnd() * 9)), wD = Array.from({ length: n }, () => 1 + Math.floor(rnd() * 9))
  const nb = (i, f) => { const x = i % side, y = (i / side) | 0; if (x + 1 < side) f(i + 1, wR[i]); if (x) f(i - 1, wR[i - 1]); if (y + 1 < side) f(i + side, wD[i]); if (y) f(i - side, wD[i - side]) }
  const d = new Float64Array(n).fill(Infinity), done = new Uint8Array(n); d[0] = 0; let ops = 0
  if (kind === 'array') {
    for (let k = 0; k < n; k++) { let u = -1; for (let i = 0; i < n; i++) { ops++; if (!done[i] && (u < 0 || d[i] < d[u])) u = i } done[u] = 1; nb(u, (v, w) => { ops++; if (d[u] + w < d[v]) d[v] = d[u] + w }) }
  } else if (kind === 'heap') {
    const q = new Heap(); q.push(0, 0)
    while (q.size) { const [du, u] = q.pop(); if (done[u]) continue; done[u] = 1; nb(u, (v, w) => { ops++; if (du + w < d[v]) { d[v] = du + w; q.push(d[v], v) } }) }
    ops += q.cmp
  } else {
    const B = [[0]]; let cur = 0, left = 1   // Dial: one bucket per distance value
    while (left) { while (!B[cur] || !B[cur].length) { cur++; ops++ } const u = B[cur].pop(); left--; ops++; if (done[u] || d[u] !== cur) continue; done[u] = 1; nb(u, (v, w) => { ops++; if (cur + w < d[v]) { d[v] = cur + w; (B[d[v]] = B[d[v]] || []).push(v); left++ } }) }
  }
  return ops
}
class SpQueues extends Figure {
  build() {
    const svg = this.svgRoot(600, 336, 'Basic steps Dijkstra takes with three kinds of queue, against graph size, on log scales')
    this.svgEl = svg; this.idleText = 'interactive'; this.tip = tooltip(svg)
    this.sides = [8, 16, 32, 64]; this.rows = textRows(svg, 20, 300, 2)
  }
  onVisible(v) { if (v && !this.drawn) { this.drawn = true; this.draw() } }
  draw() {
    const svg = this.svgEl, X0 = 70, X1 = 560, Y0 = 20, Y1 = 250, kinds = [['array', 'scan an array', 's-ink2', 'f-ink2'], ['heap', 'binary heap', 's-green', 'f-green'], ['bucket', 'buckets (Dial)', 's-ochre', 'f-ochre']]
    const data = kinds.map(([k]) => this.sides.map((sd) => [sd * sd, dijkstraCount(sd, k, 7 + sd)]))
    const lx = (v) => X0 + (Math.log10(v) - 1.7) / (Math.log10(5000) - 1.7) * (X1 - X0), ly = (v) => Y1 - (Math.log10(v) - 2) / (Math.log10(3e7) - 2) * (Y1 - Y0)
    for (const v of [100, 300, 1e3, 3e3]) { S('line', { x1: lx(v), x2: lx(v), y1: Y0, y2: Y1, class: 's-rule', 'stroke-width': .6 }, svg); S('text', { x: lx(v), y: Y1 + 16, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: fmt(v) }, svg) }
    for (const v of [1e3, 1e4, 1e5, 1e6, 1e7]) { S('line', { x1: X0, x2: X1, y1: ly(v), y2: ly(v), class: 's-rule', 'stroke-width': .6 }, svg); S('text', { x: X0 - 8, y: ly(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}k` : v }, svg) }
    S('text', { x: (X0 + X1) / 2, y: Y1 + 32, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: 'nodes in the graph' }, svg)
    data.forEach((pts, i) => {
      const [, name, sc, fc] = kinds[i]
      S('path', { d: 'M' + pts.map(([x, y]) => `${lx(x)} ${ly(y)}`).join('L'), class: `f-none ${sc}`, 'stroke-width': 2 }, svg)
      pts.forEach(([x, y]) => { S('circle', { cx: lx(x), cy: ly(y), r: 3.5, class: fc }, svg); hit(svg, this.tip, lx(x), ly(y), `${name}, ${fmt(x)} nodes`, `${fmt(y)} steps (${(y / x).toFixed(1)} per node)`) })
      S('line', { x1: X0 + 12, x2: X0 + 30, y1: Y0 + 12 + i * 18, y2: Y0 + 12 + i * 18, class: sc, 'stroke-width': 2.5 }, svg)
      S('text', { x: X0 + 38, y: Y0 + 16 + i * 18, class: 't', 'font-size': 11.5, text: name }, svg)
    })
    const a = data[0].at(-1)[1], h = data[1].at(-1)[1], b = data[2].at(-1)[1]
    say(this.rows, `At ${fmt(this.sides.at(-1) ** 2)} nodes: ${fmt(a)} steps scanning an array, ${fmt(h)} with a heap, ${fmt(b)} with buckets.`, 76)
  }
}

define({ 'sp-bfs': SpBfs, 'sp-dijkstra': SpDijkstra, 'sp-negative': SpNegative, 'sp-astar': SpAstar, 'sp-bidir': SpBidir, 'sp-alt': SpAlt, 'sp-floyd': SpFloyd, 'sp-multi': SpMulti, 'sp-algebra': SpAlgebra, 'sp-queues': SpQueues })
