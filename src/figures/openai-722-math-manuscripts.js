// Figures for "OpenAI's 722 math manuscripts".
// Repo counts come from github.com/openai/math at commit adc7f1241 (cloned 2026-10-07).
import { S, H, attr, op, seg, ease, inout, lerp, clamp, rng, handArrow, REDUCED, STILL, Figure, define } from './core.js';

// static charts: draw at k = 0..1 once, the first time they're on screen
function entrance(fig, paint, ms = 900) {
  fig.idleText = 'static';
  paint(STILL || REDUCED ? 1 : 0);
  fig.onVisible = (v) => {
    if (!v || fig._shown) return; fig._shown = true;
    if (STILL || REDUCED) return paint(1);
    const t0 = performance.now();
    const f = (now) => { const k = clamp((now - t0) / ms); paint(ease(k)); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  };
}
function pills(bar, items, value, on) {
  const btns = items.map(([v, label]) => {
    const b = H('button', { class: 'pill', type: 'button', text: label, 'aria-pressed': String(v === value) }, bar);
    b.onclick = () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); on(v); };
    return b;
  });
}

// ── fig 1 · families per field, with and without a Lean statement ──────────
// [field, families, families with a lean/docs scope note]
const FIELDS = [
  ['theoretical CS', 40, 32], ['combinatorics', 37, 33], ['algebraic geometry', 36, 7], ['number theory', 31, 16],
  ['probability', 29, 19], ['differential geometry', 29, 15], ['mathematical physics', 25, 17], ['operator algebras', 19, 14],
  ['algebra', 18, 9], ['topology', 18, 3], ['analysis', 16, 9], ['PDE', 16, 11], ['convex geometry', 15, 13],
  ['group theory', 14, 12], ['dynamical systems', 12, 9], ['functional analysis', 11, 10], ['logic', 6, 6],
];
class OmFields extends Figure {
  build() {
    const svg = this.svgRoot(600, 456, 'Result families per field, split into those with a Lean statement and those without');
    const x0 = 190, W = 330, X = (v) => (v / 40) * W;
    S('rect', { x: x0, y: 14, width: 12, height: 10, rx: 2, class: 'f-green' }, svg);
    S('text', { x: x0 + 18, y: 23, class: 't2', 'font-size': 11.5, text: 'has a Lean statement' }, svg);
    S('rect', { x: x0 + 180, y: 14, width: 12, height: 10, rx: 2, class: 'f-rule2' }, svg);
    S('text', { x: x0 + 198, y: 23, class: 't2', 'font-size': 11.5, text: 'prose only' }, svg);
    this.rows = FIELDS.map(([name, n, l], i) => {
      const y = 46 + i * 23;
      S('text', { x: x0 - 12, y: y + 12, class: 't', 'font-size': 12, 'text-anchor': 'end', text: name }, svg);
      const all = S('rect', { x: x0, y, height: 15, rx: 2, class: 'f-rule2' }, svg);
      const lean = S('rect', { x: x0, y, height: 15, rx: 2, class: 'f-green' }, svg);
      const t = S('text', { y: y + 12, class: 't3', 'font-size': 11 }, svg);
      return { n, l, all, lean, t };
    });
    S('text', { x: x0, y: 450, class: 't3', 'font-size': 11, text: '235 of 372 families have one' }, svg);
    entrance(this, (k) => this.rows.forEach((r) => {
      attr(r.all, { width: X(r.n) * k }); attr(r.lean, { width: X(r.l) * k });
      attr(r.t, { x: x0 + X(r.n) * k + 8 }); r.t.textContent = `${Math.round(r.l * k)} of ${r.n}`;
    }));
  }
}

// ── fig 2 · colouring the plane ────────────────────────────────────────────
// 7-colour hexagon tiling (colour = q + 3r mod 7). With hexagon size 0.45 no two
// points at distance 1 share a colour; the figure checks the stick's ends every frame.
const R3 = Math.sqrt(3), PX = 64, HS = 0.45;
function hexAt(x, y) { // point in units → axial (q, r), pointy-top hexagons of size HS
  const q = (R3 / 3 * x - y / 3) / HS, r = (2 / 3 * y) / HS, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return [rq, rr];
}
const hcol = (q, r) => (((q + 3 * r) % 7) + 7) % 7;
const hexPath = (q, r) => {
  const cx = HS * (R3 * q + R3 / 2 * r) * PX, cy = HS * 1.5 * r * PX;
  let d = '';
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); d += (i ? 'L' : 'M') + (cx + HS * PX * Math.cos(a)).toFixed(1) + ' ' + (cy + HS * PX * Math.sin(a)).toFixed(1); }
  return d + 'Z';
};
// Moser spindle: two unit rhombi hinged at a shared vertex, rotated until their tips are 1 apart
function moser() {
  const h = R3 / 2, th = 2 * Math.asin(1 / (2 * R3)), rot = ([x, y]) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
  const P = [[0, 0], [1, 0], [0.5, h], [1.5, h]]; P.push(rot(P[1]), rot(P[2]), rot(P[3]));
  const E = [];
  for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) if (Math.abs(Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) - 1) < 1e-9) E.push([i, j]);
  const count = (k) => { let ok = 0; for (let m = 0; m < k ** 7; m++) { const c = []; let x = m; for (let i = 0; i < 7; i++) { c.push(x % k); x = Math.floor(x / k); } if (E.every(([i, j]) => c[i] !== c[j])) ok++; } return ok; };
  return { P, E, c3: count(3), c4: count(4) };
}
const BOUNDS = [[0, 1, 7, 'before 1950'], [1, 4, 7, '1950'], [2, 5, 7, '2018, de Grey'], [3, 6, 7, '2026, OpenAI claim']];
class OmPlane extends Figure {
  constructor() { super(); this.duration = 20; this.poster = 20; }
  build() {
    const svg = this.svgRoot(600, 340, 'A seven-colour hexagon tiling with a unit stick, the Moser spindle, and the known bounds on the chromatic number of the plane');
    const clip = S('clipPath', { id: 'om-hexclip' }, S('defs', {}, svg));
    S('rect', { x: 10, y: 30, width: 290, height: 290, rx: 10 }, clip);
    const hx = S('g', { 'clip-path': 'url(#om-hexclip)' }, svg);
    for (let r = -1; r < 12; r++) for (let q = -7; q < 12; q++) {
      const p = S('path', { d: hexPath(q, r), class: 's-bg', 'stroke-width': 1.2 }, hx);
      p.style.fill = 'var(--ink)'; p.style.fillOpacity = (0.04 + hcol(q, r) * 0.045).toFixed(3);
      const cx = HS * (R3 * q + R3 / 2 * r) * PX, cy = HS * 1.5 * r * PX;
      S('text', { x: cx, y: cy + 4, class: 't2', 'font-size': 10, 'text-anchor': 'middle', text: hcol(q, r) + 1 }, hx);
    }
    this.ends = [0, 1].map(() => S('path', { class: 'f-none s-green', 'stroke-width': 2.4 }, hx));
    this.stick = S('line', { class: 's-ink', 'stroke-width': 3, 'stroke-linecap': 'round' }, hx);
    this.dots = [0, 1].map(() => S('circle', { r: 5, class: 'f-ink' }, hx));
    S('text', { x: 10, y: 20, class: 'sl', 'font-size': 11, text: 'SEVEN COLOURS ARE ENOUGH' }, svg);
    this.read = S('text', { x: 10, y: 336, class: 't2', 'font-size': 11.5 }, svg);
    // right: spindle, then the bounds
    const sp = moser(), mx = 370, my = 190, u = 90;
    this.sp = S('g', {}, svg);
    S('text', { x: 330, y: 20, class: 'sl', 'font-size': 11, text: 'THREE ARE NOT' }, this.sp);
    const pt = ([x, y]) => [mx + x * u, my - y * u];
    this.edges = sp.E.map(([i, j]) => { const [a, b] = [pt(sp.P[i]), pt(sp.P[j])]; return S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 's-ink2', 'stroke-width': 1.6 }, this.sp); });
    this.verts = sp.P.map((p) => { const [x, y] = pt(p); return S('circle', { cx: x, cy: y, r: 5.5, class: 'f-panel s-ink', 'stroke-width': 1.8 }, this.sp); });
    this.spT = [
      S('text', { x: 330, y: 214, class: 't', 'font-size': 12, text: `7 points, ${sp.E.length} sticks of length 1` }, this.sp),
      S('text', { x: 330, y: 234, class: 't2', 'font-size': 12, text: `3-colourings that work: ${sp.c3} of ${(3 ** 7).toLocaleString('en')}` }, this.sp),
      S('text', { x: 330, y: 254, class: 't3', 'font-size': 12, text: `4-colourings that work: ${sp.c4}` }, this.sp),
    ];
    const nl = S('g', {}, svg), X = (v) => 340 + (v - 1) * 40, y = 300;
    S('line', { x1: X(1), x2: X(7), y1: y, y2: y, class: 's-rule', 'stroke-width': 1 }, nl);
    for (let v = 1; v <= 7; v++) S('text', { x: X(v), y: y + 20, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v }, nl);
    this.band = S('rect', { y: y - 7, height: 14, rx: 7, class: 'f-green', opacity: 0.85 }, nl);
    this.year = S('text', { x: 340, y: y - 16, class: 't', 'font-size': 12 }, nl);
    this.nl = nl;
  }
  label(t) { return t < 9 ? 'tiling' : t < 14 ? 'spindle' : 'bounds'; }
  render(t) {
    // the stick wanders and turns, and is drawn in units
    const cx = 2.25 + 1.1 * Math.sin(t * 0.55) + 0.3 * Math.sin(t * 1.7), cy = 2.7 + 1.0 * Math.cos(t * 0.43), a = t * 0.9;
    const P = [[cx - Math.cos(a) / 2, cy - Math.sin(a) / 2], [cx + Math.cos(a) / 2, cy + Math.sin(a) / 2]];
    const H2 = P.map(([x, y]) => hexAt(x, y));
    attr(this.stick, { x1: P[0][0] * PX, y1: P[0][1] * PX, x2: P[1][0] * PX, y2: P[1][1] * PX });
    P.forEach((p, i) => { attr(this.dots[i], { cx: p[0] * PX, cy: p[1] * PX }); attr(this.ends[i], { d: hexPath(...H2[i]) }); });
    const c = H2.map((h) => hcol(...h) + 1);
    this.read.textContent = `ends on colours ${c[0]} and ${c[1]}: ${c[0] === c[1] ? 'same' : 'different'}`;
    // spindle edges appear, then the counts
    const k = seg(t, 9, 12);
    this.edges.forEach((e, i) => op(e, clamp(k * this.edges.length - i)));
    this.verts.forEach((v) => op(v, seg(t, 8.5, 9.2)));
    this.spT.forEach((e, i) => op(e, seg(t, 12 + i * 0.5, 12.5 + i * 0.5)));
    // the bounds step forward
    op(this.nl, seg(t, 14.2, 14.8));
    const step = Math.min(3, Math.floor(seg(t, 14.8, 19.6) * 4));
    const lo = lerp(BOUNDS[Math.max(0, step - 1)][1], BOUNDS[step][1], inout(seg(t - 14.8 - step * 1.2, 0, 0.5)));
    attr(this.band, { x: 340 + (lo - 1) * 40 - 7, width: (7 - lo) * 40 + 14 });
    this.year.textContent = `${BOUNDS[step][3]}: ${BOUNDS[step][1]} to 7 colours`;
  }
}

// ── fig 3 · the brick factory ──────────────────────────────────────────────
// m kilns, n yards, every kiln joined to every yard by a straight track.
// Crossings are counted from the drawing itself every frame.
const Z = (m, n) => Math.floor(m / 2) * Math.floor((m - 1) / 2) * Math.floor(n / 2) * Math.floor((n - 1) / 2);
const orient = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
function crossings(K, Y) {
  const segs = []; K.forEach((a, i) => Y.forEach((b, j) => segs.push([a, b, i, j])));
  const out = [];
  for (let x = 0; x < segs.length; x++) for (let y = x + 1; y < segs.length; y++) {
    const [p1, p2, i1, j1] = segs[x], [p3, p4, i2, j2] = segs[y];
    if (i1 === i2 || j1 === j2) continue;
    if (orient(p1, p2, p3) * orient(p1, p2, p4) < 0 && orient(p3, p4, p1) * orient(p3, p4, p2) < 0) {
      const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
      const s = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
      out.push([p1[0] + s * (p2[0] - p1[0]), p1[1] + s * (p2[1] - p1[1])]);
    }
  }
  return out;
}
class OmBrick extends Figure {
  build() {
    this.idleText = 'interactive';
    this.svgRoot(600, 350, 'Kilns and storage yards joined by straight tracks, with the crossings counted');
    this.g = S('g', {}, this.svg);
    this.out = S('text', { x: 20, y: 336, class: 't', 'font-size': 12 }, this.svg);
    const bar = H('div', { class: 'fc' }, this);
    pills(bar, [['3,3', '3 × 3'], ['4,4', '4 × 4'], ['5,5', '5 × 5'], ['6,6', '6 × 6'], ['5,7', '5 × 7']], '5,5', (v) => this.size(...v.split(',').map(Number)));
    H('span', { class: 'grow' }, bar);
    pills(bar, [[0, 'scrambled'], [1, "Zarankiewicz's drawing"]], 1, (v) => this.go(v));
    this.k = 1; this.size(5, 5);
  }
  size(m, n) {
    this.m = m; this.n = n;
    const ux = 250 / Math.ceil(m / 2), uy = 135 / Math.ceil(n / 2), r = rng(m * 31 + n);
    const half = (i, u) => (Math.floor(i / 2) + 1) * (i % 2 ? -u : u);
    this.Kz = [...Array(m)].map((_, i) => [300 + half(i, ux), 165]);
    this.Yz = [...Array(n)].map((_, j) => [300, 165 + half(j, uy)]);
    this.Ks = this.Kz.map(() => [40 + r() * 520, 20 + r() * 290]);
    this.Ys = this.Yz.map(() => [40 + r() * 520, 20 + r() * 290]);
    this.g.textContent = '';
    this.tracks = []; this.Kz.forEach(() => this.Yz.forEach(() => this.tracks.push(S('line', { class: 's-ink3', 'stroke-width': 1.2 }, this.g))));
    this.xg = S('g', {}, this.g);
    this.kilns = this.Kz.map(() => S('rect', { width: 14, height: 14, rx: 2, class: 'f-ink' }, this.g));
    this.yards = this.Yz.map(() => S('circle', { r: 7, class: 'f-panel s-ink', 'stroke-width': 2 }, this.g));
    this.draw(this.k);
  }
  go(target) {
    cancelAnimationFrame(this.raf);
    const from = this.k, t0 = performance.now(), ms = STILL || REDUCED ? 0 : 900;
    const f = (now) => { const p = ms ? clamp((now - t0) / ms) : 1; this.draw(lerp(from, target, inout(p))); if (p < 1) this.raf = requestAnimationFrame(f); };
    this.raf = requestAnimationFrame(f);
  }
  draw(k) {
    this.k = k;
    const mix = (A, B) => A.map((a, i) => [lerp(a[0], B[i][0], k), lerp(a[1], B[i][1], k)]);
    const K = mix(this.Ks, this.Kz), Y = mix(this.Ys, this.Yz);
    let e = 0; K.forEach((a) => Y.forEach((b) => attr(this.tracks[e++], { x1: a[0], y1: a[1], x2: b[0], y2: b[1] })));
    K.forEach((p, i) => attr(this.kilns[i], { x: p[0] - 7, y: p[1] - 7 }));
    Y.forEach((p, i) => attr(this.yards[i], { cx: p[0], cy: p[1] }));
    const X = crossings(K, Y);
    this.xg.textContent = '';
    X.forEach(([x, y]) => S('circle', { cx: x, cy: y, r: 3.2, class: 'f-green' }, this.xg));
    this.out.textContent = `${this.m} kilns, ${this.n} yards · crossings in this drawing: ${X.length} · formula: ${Z(this.m, this.n)}`;
  }
}

// ── fig 4 · Erdős #3 on the primes ─────────────────────────────────────────
// Numbers 1 to 210 in rows of 30. The primes light up with the running sum of
// their reciprocals; then the shortest progressions of length 3 to 6 are found.
const N = 210, COLS = 30;
const PR = []; for (let i = 2; i <= N; i++) if (PR.every((p) => i % p)) PR.push(i);
const PS = new Set(PR);
function firstAP(k) { // the progression of k primes ≤ N that ends earliest
  let best = null;
  for (const a of PR) for (let d = 1; a + (k - 1) * d <= N; d++) {
    let ok = true; for (let i = 0; i < k && ok; i++) ok = PS.has(a + i * d);
    if (ok && (!best || a + (k - 1) * d < best[0] + (k - 1) * best[1])) best = [a, d];
  }
  return [...Array(k)].map((_, i) => best[0] + i * best[1]);
}
const APS = [3, 4, 5, 6].map(firstAP);
class OmErdos extends Figure {
  constructor() { super(); this.duration = 16; this.poster = 16; }
  build() {
    const svg = this.svgRoot(600, 270, 'The numbers 1 to 210 with the primes marked and arithmetic progressions of primes highlighted');
    const pos = (v) => [30 + ((v - 1) % COLS) * 18.3, 40 + Math.floor((v - 1) / COLS) * 26];
    this.pos = pos;
    this.cells = [...Array(N)].map((_, i) => {
      const [x, y] = pos(i + 1);
      return S('circle', { cx: x, cy: y, r: 6.2, class: 'f-rule' }, svg);
    });
    this.comb = S('path', { class: 'f-none s-green', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    this.hits = [...Array(6)].map(() => S('circle', { r: 8, class: 'f-none s-green', 'stroke-width': 2.4 }, svg));
    this.sum = S('text', { x: 30, y: 236, class: 't', 'font-size': 13 }, svg);
    this.ap = S('text', { x: 30, y: 258, class: 't2', 'font-size': 13 }, svg);
  }
  label(t) { return t < 5 ? 'primes' : 'progressions'; }
  render(t) {
    const upto = Math.round(seg(t, 0.3, 4.5) * N);
    let s = 0;
    this.cells.forEach((c, i) => {
      const lit = i + 1 <= upto && PS.has(i + 1);
      if (lit) s += 1 / (i + 1);
      c.setAttribute('class', lit ? 'f-ink' : 'f-rule');
    });
    this.sum.textContent = upto ? `1/2 + 1/3 + 1/5 + … up to ${upto}: ${s.toFixed(3)} (this sum has no limit)` : '';
    const k = Math.min(3, Math.floor(seg(t, 5, 15.4) * 4)), on = t >= 5;
    const ap = APS[k], p = inout(seg(t - 5 - k * 2.6, 0, 1.2));
    const pts = ap.map((v) => this.pos(v)), n = on ? Math.max(1, Math.ceil(p * ap.length)) : 0;
    attr(this.comb, { d: n > 1 ? 'M' + pts.slice(0, n).map((q) => q.join(' ')).join(' L') : '' });
    this.hits.forEach((h, i) => { op(h, i < n ? 1 : 0); if (i < ap.length) attr(h, { cx: pts[i][0], cy: pts[i][1] }); });
    this.ap.textContent = on ? `length ${ap.length}, step ${ap[1] - ap[0]}: ${ap.join(', ')}` : '';
  }
}

// ── fig 5 · what a person has to read ──────────────────────────────────────
// One square = 10,000 lines. Proof: 25.9M lines in lean/OAI. Statements: 89,411
// lines across the 405 comparator challenge files.
const PROOF = 25_900_000, STMT = 89_411, PER = 10_000;
class OmRead extends Figure {
  build() {
    const svg = this.svgRoot(600, 345, 'Lines of Lean proof compared with lines of Lean statements, one square per ten thousand lines');
    const cols = 74, cell = 7, n = Math.round(PROOF / PER), x0 = 40, y0 = 40;
    let d = '';
    for (let i = 0; i < n; i++) d += `M${x0 + (i % cols) * cell} ${y0 + Math.floor(i / cols) * cell}h5.6v5.6h-5.6z`;
    const rows = Math.ceil(n / cols);
    const clip = S('clipPath', { id: 'om-readclip' }, S('defs', {}, svg));
    this.cr = S('rect', { x: 0, y: 0, width: 600, height: 0 }, clip);
    S('path', { d, class: 'f-rule2', 'clip-path': 'url(#om-readclip)' }, svg);
    let g = '';
    for (let i = 0; i < Math.round(STMT / PER); i++) g += `M${x0 + i * cell} ${y0}h5.6v5.6h-5.6z`;
    this.st = S('path', { d: g, class: 'f-green' }, svg);
    S('text', { x: x0, y: 26, class: 'sl', 'font-size': 11, text: 'ONE SQUARE = 10,000 LINES OF LEAN' }, svg);
    const ly = y0 + rows * cell + 22;
    S('rect', { x: x0, y: ly - 9, width: 10, height: 10, rx: 1.5, class: 'f-green' }, svg);
    S('text', { x: x0 + 16, y: ly, class: 't', 'font-size': 12, text: '89,411 lines of challenge statements: what a reviewer reads' }, svg);
    S('rect', { x: x0, y: ly + 11, width: 10, height: 10, rx: 1.5, class: 'f-rule2' }, svg);
    S('text', { x: x0 + 16, y: ly + 20, class: 't', 'font-size': 12, text: '25.9 million lines of proof: what the kernel reads' }, svg);
    this.arrow = S('path', { d: handArrow(x0 + 160, 22, x0 + 66, y0 + 2, -0.25), class: 'f-none s-green', 'stroke-width': 1.6 }, svg);
    this.rows = rows; this.y0 = y0;
    entrance(this, (k) => { attr(this.cr, { height: this.y0 + this.rows * 7 * k }); op(this.arrow, seg(k, 0.7, 1)); }, 1600);
  }
}

define({ 'om-fields': OmFields, 'om-plane': OmPlane, 'om-brick': OmBrick, 'om-erdos': OmErdos, 'om-read': OmRead });
