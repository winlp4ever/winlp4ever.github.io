import { S, attr, op, seg, rng, entrance, pills, tooltip, hit, handArrow, drawOn, Figure, define } from './core.js'

// ── fig 1 · one graph per part, rebuilt on merge ──────────────────────────────
// Points are random (seeded); edges join each point to its two nearest neighbours,
// which is the flavour of an HNSW layer without the hierarchy. Like a real HNSW graph,
// the result is connected: separate pieces are joined by their shortest gap.
const knnEdges = (pts, k = 2) => {
  const D = (i, j) => Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
  const comp = pts.map((_, i) => i), find = (i) => (comp[i] === i ? i : (comp[i] = find(comp[i])));
  const seen = new Set(), edges = [];
  const add = (i, j) => {
    const key = Math.min(i, j) + '-' + Math.max(i, j);
    if (seen.has(key)) return; seen.add(key); edges.push([i, j]); comp[find(i)] = find(j);
  };
  pts.forEach((_, i) => pts.map((_, j) => j).filter((j) => j !== i).sort((a, b) => D(i, a) - D(i, b)).slice(0, k).forEach((j) => add(i, j)));
  for (;;) { // join the closest pair of points that sit in different pieces
    let best = null;
    pts.forEach((_, i) => pts.forEach((_, j) => { if (find(i) !== find(j) && (!best || D(i, j) < best[2])) best = [i, j, D(i, j)]; }));
    if (!best) break; add(best[0], best[1]);
  }
  return edges.map(([i, j]) => `M${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}L${pts[j][0].toFixed(1)} ${pts[j][1].toFixed(1)}`).join('');
};

class CvParts extends Figure {
  constructor() { super(); this.duration = 12; this.loop = false; this.poster = 12; }
  build() {
    const svg = this.svgRoot(600, 300, 'Three data parts, each with its own small neighbour graph; a query searches every graph and merges the results; then two parts merge and their graph is built again from scratch');
    const r = rng(7), BX = [20, 215, 410], BW = 170, BY = 92, BH = 150;
    this.q = [300, 50];
    this.parts = BX.map((x, i) => {
      const pts = Array.from({ length: 9 }, () => [x + 14 + r() * (BW - 28), BY + 14 + r() * (BH - 28)]);
      const box = S('rect', { x, y: BY, width: BW, height: BH, rx: 8, class: 'f-panel s-rule', 'stroke-width': 1.2 }, svg);
      const lab = S('text', { x: x + 8, y: BY + BH + 18, class: 't3', 'font-size': 12, text: `part ${i + 1}` }, svg);
      const edges = S('path', { d: knnEdges(pts), class: 'f-none s-ink3', 'stroke-width': 1.1 }, svg);
      // nearest two points of this part to the query
      const near = pts.map((p, j) => [Math.hypot(p[0] - this.q[0], p[1] - this.q[1]), j]).sort((a, b) => a[0] - b[0]).slice(0, 2).map(([, j]) => j);
      const dots = pts.map((p, j) => S('circle', { cx: p[0], cy: p[1], r: 4, class: 'f-ink3' }, svg));
      const ray = S('path', { d: `M${this.q[0]} ${this.q[1] + 8}L${x + BW / 2} ${BY - 4}`, class: 'f-none s-green', 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }, svg);
      return { x, pts, box, lab, edges, dots, near, ray };
    });
    // the merged part: parts 1 and 2 together, with one new graph over all 18 points
    this.mergedEdges = S('path', { d: knnEdges([...this.parts[0].pts, ...this.parts[1].pts]), class: 'f-none s-green', 'stroke-width': 1.3 }, svg);
    this.qDot = S('circle', { cx: this.q[0], cy: this.q[1], r: 6, class: 'f-green' }, svg);
    this.qLab = S('text', { x: this.q[0] + 12, y: this.q[1] + 4, class: 't2', 'font-size': 12.5, text: 'query vector' }, svg);
    this.status = S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: '' }, svg);
    this.hand = S('text', { x: 300, y: 290, class: 'hand', 'font-size': 17, 'text-anchor': 'middle', text: 'merge = build the graph again' }, svg);
  }
  label(t) { return t < 3.5 ? 'inserts' : t < 7.5 ? 'query' : 'merge'; }
  render(t) {
    const [p1, p2, p3] = this.parts;
    this.status.textContent = t < 3.5 ? 'EACH INSERT WRITES A PART WITH ITS OWN GRAPH' : t < 7.5 ? 'A QUERY SEARCHES EVERY PART, THEN MERGES THE TOP K' : 'A BACKGROUND MERGE JOINS PARTS 1 AND 2';
    this.parts.forEach((p, i) => {
      const a = seg(t, i * 0.9, i * 0.9 + 0.6);
      op(p.box, a); op(p.lab, a); p.dots.forEach((d) => op(d, a));
      drawOn(p.edges, seg(t, i * 0.9 + 0.4, i * 0.9 + 1.4));
      // query phase: rays fade in (opacity, so the dash pattern survives), the nearest dots light up,
      // and both clear before the merge
      op(p.ray, seg(t, 3.8 + i * 0.3, 4.6 + i * 0.3) * (1 - seg(t, 7, 7.5)));
      const lit = seg(t, 4.6 + i * 0.3, 5 + i * 0.3) * (1 - seg(t, 7, 7.5));
      p.dots.forEach((d, j) => attr(d, { class: p.near.includes(j) && lit > 0.5 ? 'f-green' : 'f-ink3' }));
    });
    op(this.qDot, seg(t, 3.5, 3.8) * (1 - seg(t, 7, 7.5))); op(this.qLab, seg(t, 3.5, 3.8) * (1 - seg(t, 7, 7.5)));
    // merge phase: box 1 grows over box 2, old graphs fade, the new graph draws on
    const m = seg(t, 7.8, 9);
    attr(p1.box, { width: 170 + m * 195 }); op(p2.box, seg(t, 1, 1.6) * (1 - m)); op(p2.lab, seg(t, 1, 1.6) * (1 - m));
    p1.lab.textContent = m > 0.5 ? 'part 1+2 (new)' : 'part 1';
    const fade = 1 - seg(t, 9, 9.6);
    op(p1.edges, fade); op(p2.edges, fade); op(p3.edges, 1);
    drawOn(this.mergedEdges, seg(t, 9.6, 11.4)); op(this.mergedEdges, t > 9.6 ? 1 : 0);
    op(this.hand, seg(t, 10.8, 11.6));
  }
}

// ── fig 2 · post-filter, fetch multiplier, prefilter ─────────────────────────
// 200 candidate rows in distance order (rank 1 top-left). Each row matches the
// WHERE filter with probability `sel`. Seeded, so every toggle shows the same rows.
const K = 10, N = 200, C = 20, CS = 22, X0 = 80, Y0 = 46;
class CvFilter extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Two hundred rows sorted by distance to the query; filled squares match the WHERE filter; the index fetches the nearest rows and only matching ones are returned');
    const r = rng(111); this.u = Array.from({ length: N }, () => r());
    this.sel = 0.2; this.mode = 'post';
    S('text', { x: X0, y: 24, class: 'sl', 'font-size': 11, text: 'ROWS IN DISTANCE ORDER, NEAREST FIRST →' }, svg);
    this.cells = this.u.map((_, i) => S('rect', { x: X0 + (i % C) * CS, y: Y0 + Math.floor(i / C) * CS, width: CS - 5, height: CS - 5, rx: 3, 'stroke-width': 1.4 }, svg));
    this.win = S('path', { class: 'f-none s-ochre', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);
    this.out = S('text', { x: X0, y: 290, class: 't', 'font-size': 14 }, svg);
    this.paint();
    pills(this, [['post', 'post-filter'], ['mult', 'fetch ×4'], ['pre', 'prefilter']], 'post', (v) => { this.mode = v; this.paint(); });
    pills(this, [[0.5, '50% match'], [0.2, '20%'], [0.05, '5%']], 0.2, (v) => { this.sel = v; this.paint(); });
  }
  paint() {
    const match = this.u.map((v) => v < this.sel);
    const fetched = this.mode === 'post' ? K : this.mode === 'mult' ? 4 * K : N;
    let got = 0;
    this.cells.forEach((c, i) => {
      const inWin = i < fetched, m = match[i], keep = inWin && m && got < K;
      if (keep) got++;
      attr(c, { class: keep ? 'f-green s-green' : m ? 'f-ink3 s-ink3' : 'f-none s-rule' });
    });
    // outline the fetch window (whole rows plus a partial last row)
    const full = Math.floor(Math.min(fetched, N) / C), rest = Math.min(fetched, N) % C, w = C * CS, X = X0 - 3, Y = Y0 - 3;
    const d = !full ? `M${X} ${Y}h${rest * CS}v${CS}h${-rest * CS}z` // fewer than one row: a plain box
      : rest ? `M${X} ${Y}h${w}v${full * CS}h${-(C - rest) * CS}v${CS}h${-rest * CS}z`
      : `M${X} ${Y}h${w}v${full * CS}h${-w}z`;
    attr(this.win, { d });
    const how = this.mode === 'pre' ? 'exact scan of every matching row' : `index fetches ${fetched}`;
    this.out.textContent = `${how} → ${got} of ${K} rows returned`;
  }
}

// ── fig 3 · reciprocal rank fusion ───────────────────────────────────────────
// Two ranked lists for one query; I made the documents up.
const BM = ['err_42 runbook', 'disk full alert', 'merge settings', 'vector index docs', 'hnsw tuning'];
const VEC = ['hnsw tuning', 'ann recall guide', 'vector index docs', 'quantization notes', 'merge settings'];
class CvRrf extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'A BM25 ranking and a vector ranking combined by reciprocal rank fusion; documents found by both lists move to the top');
    const score = {};
    [BM, VEC].forEach((l) => l.forEach((d, i) => { score[d] = (score[d] || 0) + 1 / (60 + i + 1); }));
    const fused = Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const tip = tooltip(svg), rowY = (i) => 64 + i * 36, XL = 30, XM = 220, XR = 395;
    [['BM25', XL], ['VECTOR', XM], ['FUSED (RRF, k = 60)', XR]].forEach(([t, x]) => S('text', { x, y: 30, class: 'sl', 'font-size': 11, text: t }, svg));
    const both = (d) => BM.includes(d) && VEC.includes(d);
    this.marks = [];
    const row = (d, x, y, text) => {
      S('text', { x, y, class: both(d) ? 't' : 't3', 'font-size': 12.5, text }, svg);
      if (both(d)) this.marks.push(S('circle', { cx: x - 10, cy: y - 4, r: 4, class: 'f-green' }, svg));
    };
    BM.forEach((d, i) => row(d, XL, rowY(i), `${i + 1}. ${d}`));
    VEC.forEach((d, i) => row(d, XM, rowY(i), `${i + 1}. ${d}`));
    fused.forEach(([d, s], i) => {
      const y = rowY(i);
      row(d, XR, y, d);
      S('text', { x: 592, y, class: 't3', 'font-size': 11.5, 'text-anchor': 'end', text: s.toFixed(4) }, svg);
      const ib = BM.indexOf(d), iv = VEC.indexOf(d);
      const parts = [ib >= 0 ? `1/(60+${ib + 1})` : null, iv >= 0 ? `1/(60+${iv + 1})` : null].filter(Boolean).join(' + ');
      hit(svg, tip, XR + 40, y - 4, d, parts + ' = ' + s.toFixed(4));
    });
    this.hand = S('text', { x: 300, y: 282, class: 'hand', 'font-size': 17, 'text-anchor': 'middle', text: '● = in both lists, so it moves up' }, svg);
    entrance(this, (k) => { this.marks.forEach((m, i) => op(m, seg(k, i * 0.07, 0.3 + i * 0.07))); op(this.hand, seg(k, 0.8, 1)); }, 1400);
  }
}

// ── fig 4 · VDBBench, QPS against recall ─────────────────────────────────────
// Zilliz's leaderboard, Cohere 1M × 768 search-performance case.
const VDB = [
  ['Zilliz Cloud', 0.938, 13316, 2.0],
  ['Milvus (16c)', 0.919, 5973, 2.4],
  ['OpenSearch', 0.907, 3055, 7.2],
  ['Elastic Cloud', 0.914, 2354, 17.1],
  ['Qdrant Cloud', 0.947, 1242, 6.4],
  ['Pinecone', 0.926, 1147, 13.7],
];
class CvBench extends Figure {
  build() {
    const svg = this.svgRoot(600, 320, 'Queries per second against recall for six vector databases on VDBBench; Zilliz Cloud and Milvus have the most throughput, Qdrant Cloud the highest recall');
    const X = (r) => 70 + (r - 0.9) / 0.05 * 480, Y = (q) => 270 - Math.log10(q / 1000) / Math.log10(20) * 220;
    [0.9, 0.91, 0.92, 0.93, 0.94, 0.95].forEach((r) => {
      S('line', { x1: X(r), x2: X(r), y1: 40, y2: 270, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: X(r), y: 290, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: r.toFixed(2) }, svg);
    });
    [1000, 2000, 5000, 10000, 20000].forEach((q) => {
      S('line', { x1: 70, x2: 550, y1: Y(q), y2: Y(q), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 62, y: Y(q) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: q >= 1000 ? q / 1000 + 'k' : q }, svg);
    });
    S('text', { x: 70, y: 24, class: 'sl', 'font-size': 11, text: 'QUERIES PER SECOND (LOG) · RECALL →' }, svg);
    const tip = tooltip(svg);
    this.dots = VDB.map(([n, r, q, p], i) => {
      const x = X(r), y = Y(q), g = S('g', {}, svg);
      S('circle', { cx: x, cy: y, r: 5.5, class: i < 2 ? 'f-ink' : 'f-ink2' }, g);
      const right = x > 450;
      S('text', { x: right ? x - 9 : x + 9, y: y - 8, class: 't2', 'font-size': 12, 'text-anchor': right ? 'end' : 'start', text: n }, g);
      hit(svg, tip, x, y, n, `recall ${r} · ${q.toLocaleString('en')} qps · p99 ${p} ms`);
      return g;
    });
    this.hand = S('text', { x: 200, y: 66, class: 'hand', 'font-size': 16, text: "the vendor's own cloud" }, svg);
    this.arrow = S('path', { d: handArrow(384, 60, X(0.938) - 8, Y(13316) - 2, -0.2), class: 'f-none s-ink3', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, svg);
    entrance(this, (k) => { this.dots.forEach((d, i) => op(d, seg(k, i * 0.1, i * 0.1 + 0.3))); op(this.hand, seg(k, 0.8, 1)); drawOn(this.arrow, seg(k, 0.8, 1)); }, 1400);
  }
}

define({ 'cv-parts': CvParts, 'cv-filter': CvFilter, 'cv-rrf': CvRrf, 'cv-bench': CvBench });
