import { S, attr, op, seg, rng, entrance, tooltip, hit, handArrow, drawOn, Figure, define } from './core.js'

const near = (pts, ids, p, k) => ids.map((j) => [Math.hypot(pts[j][0] - p[0], pts[j][1] - p[1]), j]).sort((a, b) => a[0] - b[0]).slice(0, k).map(([, j]) => j);
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// links: each node to its k nearest in the same layer, made symmetric
function layerLinks(pts, ids, k) {
  const adj = new Map(ids.map((i) => [i, new Set()]));
  ids.forEach((i) => near(pts, ids.filter((j) => j !== i), pts[i], k).forEach((j) => { adj.get(i).add(j); adj.get(j).add(i); }));
  return adj;
}
// greedy routing: look at every neighbour, move to the closest if it beats the current node
function greedy(pts, adj, start, q) {
  const steps = []; let cur = start;
  for (;;) {
    const nb = [...adj.get(cur)], best = nb.reduce((b, j) => (d2(pts[j], q) < d2(pts[b], q) ? j : b), cur);
    steps.push({ from: cur, to: best, seen: nb });
    if (best === cur) return steps;
    cur = best;
  }
}

// ── fig 1 · search through the layers ───────────────────────────────────────
class HnSearch extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'Three layers of an HNSW graph side by side; a query starts in the sparse top layer, hops greedily towards the query, drops to the layer below and repeats until it reaches its nearest neighbour in the full bottom layer');
    const r = rng(5), N = 60;
    const pts = Array.from({ length: N }, () => [0.05 + r() * 0.9, 0.05 + r() * 0.9]);
    const lvl = pts.map(() => Math.floor(-Math.log(r() + 1e-9) / Math.log(4)));
    lvl[0] = Math.max(lvl[0], 2); lvl[1] = Math.max(lvl[1], 2); // at least two nodes on top
    const ids = [2, 1, 0].map((l) => pts.map((_, i) => i).filter((i) => lvl[i] >= l));
    const adj = ids.map((s, i) => layerLinks(pts, s, [ids[0].length - 1, 2, 3][i])); // the top layer is small: link it fully
    const q = [0.8, 0.82];
    const PX = [14, 210, 406], PW = 180, PY = 62, PH = 220;
    const P = (li, p) => [PX[li] + 8 + p[0] * (PW - 16), PY + 8 + p[1] * (PH - 16)];
    // route: top layer from node 0, then each lower layer starts where the last stopped
    this.steps = []; let at = ids[0].reduce((b, i) => (d2(pts[i], q) > d2(pts[b], q) ? i : b), ids[0][0]); // start far away
    [0, 1, 2].forEach((li) => { const s = greedy(pts, adj[li], at, q); s.forEach((x) => this.steps.push({ ...x, li })); at = s.at(-1).to; });
    this.found = at; this.N = N;
    this.duration = 1.2 + this.steps.length * 0.7 + 1.5; this.poster = this.duration;
    ['LAYER 2', 'LAYER 1', 'LAYER 0 (ALL POINTS)'].forEach((t, li) => {
      S('rect', { x: PX[li], y: PY, width: PW, height: PH, rx: 8, class: 'f-panel s-rule', 'stroke-width': 1.2 }, svg);
      S('text', { x: PX[li], y: PY - 10, class: 'sl', 'font-size': 11, text: t }, svg);
      let d = ''; const seen = new Set();
      adj[li].forEach((nb, i) => nb.forEach((j) => { const k = Math.min(i, j) + '-' + Math.max(i, j); if (seen.has(k)) return; seen.add(k); const a = P(li, pts[i]), b = P(li, pts[j]); d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`; }));
      S('path', { d, class: 'f-none s-rule', 'stroke-width': 1 }, svg);
    });
    this.dots = [0, 1, 2].map((li) => new Map(ids[li].map((i) => { const [x, y] = P(li, pts[i]); return [i, S('circle', { cx: x, cy: y, r: li === 2 ? 3 : 4, class: 'f-ink3' }, svg)]; })));
    [0, 1, 2].forEach((li) => { const [x, y] = P(li, q); S('circle', { cx: x, cy: y, r: 6, class: 'f-none s-green', 'stroke-width': 2 }, svg); });
    S('text', { x: P(0, q)[0] - 10, y: P(0, q)[1] + 4, class: 't2', 'font-size': 12, 'text-anchor': 'end', text: 'query' }, svg);
    // hop segments, one path per step; drops between layers are dashed curves
    this.hops = this.steps.map((s) => {
      const a = P(s.li, pts[s.from]), b = P(s.li, pts[s.to]);
      return s.from === s.to ? null : S('path', { d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, class: 'f-none s-green', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, svg);
    });
    this.drops = [0, 1].map((li) => {
      const s = this.steps.filter((x) => x.li === li).at(-1), a = P(li, pts[s.to]), b = P(li + 1, pts[s.to]);
      return S('path', { d: handArrow(a[0] + 6, a[1] - 6, b[0] - 8, b[1] - 6, -0.15), class: 'f-none s-ink3', 'stroke-width': 1.3 }, svg);
    });
    this.cur = S('circle', { r: 6.5, class: 'f-green' }, svg);
    this.count = S('text', { x: 14, y: 312, class: 't', 'font-size': 14 }, svg);
    this.P = P; this.pts = pts;
  }
  label(t) { const i = Math.min(this.steps.length - 1, Math.max(0, Math.floor((t - 1.2) / 0.7))); return `layer ${2 - this.steps[i].li}`; }
  render(t) {
    const k = Math.floor((t - 1.2) / 0.7), f = ((t - 1.2) / 0.7) - k;
    let seen = 0;
    this.dots.forEach((m) => m.forEach((c) => attr(c, { class: 'f-ink3' })));
    this.steps.forEach((s, i) => {
      const lit = i < k || (i === k && f > 0.15);
      if (lit) { seen += s.seen.length; s.seen.forEach((j) => attr(this.dots[s.li].get(j), { class: 'f-ink' })); }
      if (this.hops[i]) drawOn(this.hops[i], i < k ? 1 : i === k ? seg(f, 0.4, 1) : 0);
    });
    this.drops.forEach((d, li) => { const last = this.steps.map((s) => s.li).lastIndexOf(li); drawOn(d, k > last ? 1 : k === last ? seg(f, 0.4, 1) : 0); });
    const i = Math.max(0, Math.min(this.steps.length - 1, k)), s = this.steps[i];
    const node = k < 0 ? s.from : f > 0.7 || k >= this.steps.length ? s.to : s.from;
    const [x, y] = this.P(s.li, this.pts[node]);
    attr(this.cur, { cx: x, cy: y }); op(this.cur, seg(t, 0.6, 1.1));
    const done = t >= 1.2 + this.steps.length * 0.7;
    this.count.textContent = `distances computed: ${seen}` + (done ? `  ·  brute force: ${this.N}` : '');
  }
}

// ── fig 2 · distance computations per query against N (measured) ─────────────
// From scripts/hnsw-count.mjs: 32-d, M = 16, efSearch = 64, efConstruction = 100.
const COUNT = [
  {n: 1000, perQuery: 638, brute: 1000, recall: 0.999, perInsert: 690},
  {n: 3000, perQuery: 923, brute: 3000, recall: 0.996, perInsert: 1428},
  {n: 10000, perQuery: 1108, brute: 10000, recall: 0.998, perInsert: 2007},
  {n: 30000, perQuery: 1064, brute: 30000, recall: 1, perInsert: 2302},
  {n: 100000, perQuery: 727, brute: 100000, recall: 0.998, perInsert: 1981},
  {n: 300000, perQuery: 623, brute: 300000, recall: 0.998, perInsert: 1270},
];
class HnCount extends Figure {
  build() {
    const svg = this.svgRoot(600, 320, 'Distance computations per query on a log-log chart: brute force grows in a straight line with N, HNSW stays nearly flat at a few hundred');
    const X = (n) => 70 + (Math.log10(n) - 3) / (Math.log10(3e5) - 3) * 420, Y = (v) => 270 - (Math.log10(v) - 2) / 3.6 * 230;
    [1e3, 1e4, 1e5].forEach((n) => { S('line', { x1: X(n), x2: X(n), y1: 36, y2: 270, class: 's-rule', 'stroke-width': 1 }, svg); S('text', { x: X(n), y: 290, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: n.toLocaleString('en') }, svg); });
    [100, 1000, 1e4, 1e5].forEach((v) => { S('line', { x1: 70, x2: 490, y1: Y(v), y2: Y(v), class: 's-rule', 'stroke-width': 1 }, svg); S('text', { x: 62, y: Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v >= 1000 ? v / 1000 + 'k' : v }, svg); });
    S('text', { x: 70, y: 22, class: 'sl', 'font-size': 11, text: 'DISTANCE COMPUTATIONS · VECTORS IN THE INDEX →' }, svg);
    const tip = tooltip(svg);
    const line = (key, cls, w) => S('path', { d: COUNT.map((r, i) => `${i ? 'L' : 'M'}${X(r.n).toFixed(1)} ${Y(r[key]).toFixed(1)}`).join(''), class: `f-none ${cls}`, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    this.lines = [line('brute', 's-ink3', 2), line('perInsert', 's-ochre', 2), line('perQuery', 's-green', 2.6)];
    this.dots = [];
    COUNT.forEach((r) => {
      [['brute', 'f-ink3', 'brute force query'], ['perInsert', 'f-ochre', 'HNSW insert'], ['perQuery', 'f-green', 'HNSW query']].forEach(([k, c, name]) => {
        this.dots.push(S('circle', { cx: X(r.n), cy: Y(r[k]), r: 3.5, class: c }, svg));
        hit(svg, tip, X(r.n), Y(r[k]), `${name}, N = ${r.n.toLocaleString('en')}`, `${r[k].toLocaleString('en')} distances` + (k === 'perQuery' ? ` · recall@10 ${r.recall}` : ''));
      });
    });
    const last = COUNT.at(-1) || { n: 3e5, brute: 3e5, perInsert: 1000, perQuery: 500 };
    const lab = (k, text, cls, dy) => S('text', { x: X(last.n) + 8, y: Y(last[k]) + dy, class: cls, 'font-size': 12, text }, svg);
    this.labs = [lab('brute', 'brute force', 't2', 4), lab('perInsert', 'insert', 't2', -2), lab('perQuery', 'query', 't2', 12)];
    this.hand = S('text', { x: 300, y: 252, class: 'hand', 'font-size': 17, 'text-anchor': 'middle', text: '300× more data, about the same work' }, svg);
    entrance(this, (k) => { this.lines.forEach((l) => drawOn(l, k)); this.dots.forEach((d) => op(d, seg(k, 0.6, 1))); this.labs.forEach((l) => op(l, seg(k, 0.7, 1))); op(this.hand, seg(k, 0.85, 1)); }, 1600);
  }
}

// ── fig 3 · one insert ───────────────────────────────────────────────────────
class HnInsert extends Figure {
  constructor() { super(); this.duration = 9; this.poster = 9; }
  build() {
    const svg = this.svgRoot(600, 300, 'A new point joins a graph: a greedy search finds where it belongs, it links to its nearest neighbours, and a neighbour that now has too many links drops its longest one');
    const r = rng(21), pts = Array.from({ length: 34 }, () => [0.04 + r() * 0.92, 0.06 + r() * 0.88]), ids = pts.map((_, i) => i);
    const adj = layerLinks(pts, ids, 3), P = (p) => [20 + p[0] * 560, 52 + p[1] * 196];
    const np = [0.47, 0.52], start = ids.reduce((b, i) => (d2(pts[i], np) > d2(pts[b], np) ? i : b), 0);
    this.route = greedy(pts, adj, start, np);
    const nb = near(pts, ids, np, 3);
    // the neighbour with the most links gets one too many; cap = its old degree
    const over = nb.reduce((b, j) => (adj.get(j).size > adj.get(b).size ? j : b), nb[0]);
    const cap = adj.get(over).size, drop = [...adj.get(over)].reduce((b, j) => (d2(pts[j], pts[over]) > d2(pts[b], pts[over]) ? j : b));
    const seen = new Set(); this.edges = [];
    adj.forEach((s, i) => s.forEach((j) => {
      const k = Math.min(i, j) + '-' + Math.max(i, j); if (seen.has(k)) return; seen.add(k);
      const a = P(pts[i]), b = P(pts[j]), e = S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 's-rule', 'stroke-width': 1.1 }, svg);
      if ((i === over && j === drop) || (j === over && i === drop)) this.dropEdge = e;
    }));
    pts.forEach((p) => { const [x, y] = P(p); S('circle', { cx: x, cy: y, r: 4, class: 'f-ink3' }, svg); });
    const [nx, ny] = P(np);
    this.hops = this.route.filter((s) => s.from !== s.to).map((s) => { const a = P(pts[s.from]), b = P(pts[s.to]); return S('path', { d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, class: 'f-none s-ink2', 'stroke-width': 2, 'stroke-dasharray': '1 0', 'stroke-linecap': 'round' }, svg); });
    this.links = nb.map((j) => { const [x, y] = P(pts[j]); return S('path', { d: `M${nx} ${ny}L${x} ${y}`, class: 'f-none s-green', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, svg); });
    this.newDot = S('circle', { cx: nx, cy: ny, r: 7, class: 'f-green' }, svg);
    const [ox, oy] = P(pts[over]);
    this.ring = S('circle', { cx: ox, cy: oy, r: 11, class: 'f-none s-ochre', 'stroke-width': 2 }, svg);
    this.status = S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11 }, svg);
    this.hand = S('text', { x: 420, y: 284, class: 'hand', 'font-size': 16, 'text-anchor': 'middle', text: `${cap + 1} links, cap is ${cap}: drop the longest` }, svg);
    this.harrow = S('path', { d: handArrow(420, 266, ox + 4, oy + 14, 0.2), class: 'f-none s-ink3', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
    this.seenCount = this.route.reduce((s, x) => s + x.seen.length, 0);
    this.count = S('text', { x: 20, y: 40, class: 't', 'font-size': 12.5 }, svg);
    this.counts = [this.seenCount, nb.length * 2, cap + 1];
  }
  label(t) { return t < 1 ? 'new point' : t < 4.5 ? 'search' : t < 6 ? 'link' : 'prune'; }
  render(t) {
    op(this.newDot, seg(t, 0.2, 0.8));
    const n = this.hops.length;
    this.hops.forEach((h, i) => drawOn(h, seg(t, 1 + i * (3 / Math.max(1, n)), 1 + (i + 1) * (3 / Math.max(1, n)))));
    this.links.forEach((l, i) => drawOn(l, seg(t, 4.6 + i * 0.3, 5.1 + i * 0.3)));
    op(this.ring, seg(t, 6, 6.4)); op(this.hand, seg(t, 6.3, 6.8)); drawOn(this.harrow, seg(t, 6.3, 6.9));
    if (this.dropEdge) { attr(this.dropEdge, { class: t > 6.8 ? 's-ochre' : 's-rule', 'stroke-width': t > 6.8 ? 2 : 1.1 }); op(this.dropEdge, 1 - seg(t, 7.6, 8.4)); }
    this.status.textContent = t < 4.5 ? 'AN INSERT STARTS AS A SEARCH FOR ITS OWN NEIGHBOURS' : t < 6 ? 'THEN IT LINKS TO THE NEAREST ONES, BOTH WAYS' : 'A NEIGHBOUR OVER ITS CAP IS PRUNED';
    const [a, b, c] = this.counts;
    this.count.textContent = `distances: ${t < 1 ? 0 : t < 4.5 ? Math.round(a * seg(t, 1, 4)) : t < 6.5 ? a : a + c}` + (t >= 6.5 ? `  (search ${a} + pruning ${c})` : '');
  }
}

// ── fig 4 · graph insertions per vector written, with merges ─────────────────
// My simulation: one segment per refresh, merges of 10 same-size segments.
// rebuild: every vector in the merge is inserted again; reuse: the largest input
// keeps its graph (Lucene PR #12050); join: about 30% less merge work (Lucene 10.2).
function amplification(strategy, steps = 990, factor = 10) {
  let tiers = [], inserted = 0, written = 0; const out = [];
  for (let s = 1; s <= steps; s++) {
    written += 1; inserted += 1; tiers.push(1);
    let merged = true;
    while (merged) {
      merged = false;
      const bySize = {}; tiers.forEach((x) => { bySize[x] = (bySize[x] || 0) + 1; });
      for (const size in bySize) if (bySize[size] >= factor) {
        const sz = +size, total = sz * factor;
        inserted += strategy === 'rebuild' ? total : strategy === 'reuse' ? total - sz : strategy === 'join' ? total * 0.7 : 0;
        let removed = 0; tiers = tiers.filter((x) => !(x === sz && removed++ < factor)); tiers.push(total); merged = true; break;
      }
    }
    out.push(strategy === 'mutable' ? 1 : inserted / written);
  }
  return out;
}
class HnAmp extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Graph insertions per vector written, as writes accumulate: a single mutable graph stays at one, segment merges that rebuild the graph climb to four, reusing or joining graphs climbs less');
    const X = (s) => 70 + s / 1000 * 360, Y = (v) => 260 - v / 3.5 * 220;
    [0, 1, 2, 3].forEach((v) => { S('line', { x1: 70, x2: 430, y1: Y(v), y2: Y(v), class: 's-rule', 'stroke-width': 1 }, svg); S('text', { x: 62, y: Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v + '×' }, svg); });
    [0, 250, 500, 750, 1000].forEach((s) => S('text', { x: X(s), y: 280, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: s === 1000 ? '1M' : s ? s + 'k' : '0' }, svg));
    S('text', { x: 70, y: 22, class: 'sl', 'font-size': 11, text: 'GRAPH INSERTIONS PER VECTOR WRITTEN · VECTORS WRITTEN →' }, svg);
    const series = [['rebuild', 'rebuild', 's-ink'], ['reuse', 'reuse largest', 's-ink3'], ['join', 'join (−30%)', 's-ochre'], ['mutable', 'one graph', 's-green']];
    let lastY = -99;
    this.lines = series.map(([k, name, cls]) => {
      const v = amplification(k), step = (i) => `${X(i + 1).toFixed(1)} ${Y(v[i]).toFixed(1)}`;
      const d = 'M' + v.map((_, i) => step(i)).join('L');
      const p = S('path', { d, class: `f-none ${cls}`, 'stroke-width': k === 'mutable' ? 2.6 : 2, 'stroke-linejoin': 'round' }, svg);
      const ly = Math.max(Y(v.at(-1)) + 4, lastY + 14); lastY = ly;
      const t = S('text', { x: 438, y: ly, class: 't2', 'font-size': 11.5, text: `${name} ${v.at(-1).toFixed(1)}×` }, svg);
      return [p, t];
    });
    entrance(this, (k) => this.lines.forEach(([p, t]) => { drawOn(p, k); op(t, seg(k, 0.8, 1)); }), 1800);
  }
}

// ── fig 5 · Qdrant search latency while the optimizer catches up ─────────────
const QD = [
  ['indexed, steady state', 4.3, null],
  ['prevent_unoptimized, while indexing', 10.2, 81],
  ['indexing turned off', 256.6, null],
  ['default, while indexing', 780, 2000],
];
class HnDrain extends Figure {
  build() {
    const svg = this.svgRoot(600, 250, 'Qdrant search latency on a log scale: 4.3 ms indexed, 10.2 ms while indexing with unindexed points hidden, 257 ms with no index, 780 ms median while the optimizer indexes in the default mode');
    const X = (ms) => 40 + Math.log10(ms) / Math.log10(3000) * 520, Y = (i) => 62 + i * 44;
    [1, 10, 100, 1000].forEach((v) => { S('line', { x1: X(v), x2: X(v), y1: 40, y2: 220, class: 's-rule', 'stroke-width': 1 }, svg); S('text', { x: X(v), y: 238, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v >= 1000 ? v / 1000 + ' s' : v + ' ms' }, svg); });
    S('text', { x: 40, y: 22, class: 'sl', 'font-size': 11, text: 'MEDIAN SEARCH LATENCY (LOG), 1.76M × 1024-D' }, svg);
    this.bars = QD.map(([name, p50, p95], i) => {
      const y = Y(i), g = S('g', {}, svg);
      const b = S('rect', { x: X(1), y: y - 9, height: 18, width: 0, rx: 3, class: i === 3 ? 'f-ochre' : i === 0 ? 'f-green' : 'f-ink3' }, g);
      S('text', { x: X(1) + 4, y: y - 14, class: 't2', 'font-size': 12, text: `${name}: ${p50} ms` + (p95 ? ` (p95 ${p95 >= 1000 ? p95 / 1000 + ' s' : p95 + ' ms'})` : '') }, g);
      return [b, X(p50) - X(1)];
    });
    entrance(this, (k) => this.bars.forEach(([b, w]) => attr(b, { width: (w * k).toFixed(1) })), 1200);
  }
}

// ── fig 6 · build and merge times, before and after ──────────────────────────
const BUILD = [
  ['pgvector 0.5.0 → 0.6.2, dbpedia 1M', 7479, 252],
  ['OpenSearch CPU → remote GPU build', 273.8 * 60, 29.1 * 60],
  ['Elasticsearch HNSW-BBQ → DiskBBQ, 1M', 1054, 94],
  ['Lucene merge, gist int8: rebuild → join', 536, 279],
  ['Qdrant 1M × 1536: 8 CPU cores → L4 GPU', 97.5, 12.4],
];
class HnBuild extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Index build times before and after each change on a log scale; each arrow moves left by between 2 and 30 times');
    const X = (s) => 40 + (Math.log10(s) - 1) / 3.4 * 520, Y = (i) => 72 + i * 46;
    [10, 100, 1000, 10000].forEach((v) => { S('line', { x1: X(v), x2: X(v), y1: 40, y2: 270, class: 's-rule', 'stroke-width': 1 }, svg); S('text', { x: X(v), y: 288, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v >= 1000 ? v / 1000 + 'k s' : v + ' s' }, svg); });
    S('text', { x: 40, y: 22, class: 'sl', 'font-size': 11, text: 'SECONDS TO BUILD OR MERGE (LOG), VENDOR NUMBERS' }, svg);
    const tip = tooltip(svg);
    this.rows = BUILD.map(([name, a, b], i) => {
      const y = Y(i), xa = X(a), xb = X(b);
      S('text', { x: 40, y: y - 12, class: 't2', 'font-size': 11.5, text: `${name}  ·  ${(a / b).toFixed(1)}×` }, svg);
      const o = S('circle', { cx: xa, cy: y, r: 4.5, class: 'f-panel s-ink3', 'stroke-width': 1.6 }, svg);
      const arr = S('path', { d: `M${xa - 7} ${y}H${xb + 8}M${xb + 14} ${y - 5}l-6 5l6 5`, class: 'f-none s-green', 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
      const n = S('circle', { cx: xb, cy: y, r: 4.5, class: 'f-ink' }, svg);
      hit(svg, tip, xa, y, name.split(':')[0], `before: ${Math.round(a).toLocaleString('en')} s`);
      hit(svg, tip, xb, y, name.split(':')[0], `after: ${Math.round(b).toLocaleString('en')} s`);
      return [o, arr, n];
    });
    entrance(this, (k) => this.rows.forEach(([o, arr, n], i) => { op(o, seg(k, i * 0.06, i * 0.06 + 0.2)); drawOn(arr, seg(k, 0.2 + i * 0.06, 0.6 + i * 0.06)); op(n, seg(k, 0.6 + i * 0.06, 0.75 + i * 0.06)); }), 1800);
  }
}

define({ 'hn-search': HnSearch, 'hn-count': HnCount, 'hn-insert': HnInsert, 'hn-amp': HnAmp, 'hn-drain': HnDrain, 'hn-build': HnBuild });
