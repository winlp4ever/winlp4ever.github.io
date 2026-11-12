import { S, H, attr, op, seg, lerp, inout, rng, tween, pills, entrance, tooltip, hit, Figure, define } from './core.js'

// ── a real red-black tree (CLRS insert), logging every fix-up step ───────────
// Nodes: { k, red, l, r, p }. Missing children are null and count as black.
function rotate(T, x, dir) { // dir 'left': x's right child y comes up
  const L = dir === 'left', y = L ? x.r : x.l, mid = L ? y.l : y.r;
  if (L) x.r = mid; else x.l = mid;
  if (mid) mid.p = x;
  y.p = x.p;
  if (!x.p) T.root = y; else if (x === x.p.l) x.p.l = y; else x.p.r = y;
  if (L) y.l = x; else y.r = x;
  x.p = y;
  T.rot = (T.rot || 0) + 1;
}
function insert(T, k, log = null) { // log: an array to record the steps, or null to skip
  let y = null, x = T.root;
  while (x) { y = x; x = k < x.k ? x.l : x.r; }
  let z = { k, red: true, l: null, r: null, p: y };
  if (!y) T.root = z; else if (k < y.k) y.l = z; else y.r = z;
  log?.push({ kind: 'new', keys: [k] });
  while (z.p && z.p.red) {
    const p = z.p, g = p.p, left = p === g.l, u = left ? g.r : g.l;
    if (u && u.red) { // case 1: red uncle, push the red up
      p.red = false; u.red = false; g.red = true;
      log?.push({ kind: 'recolor', keys: [p.k, u.k, g.k], text: `uncle ${u.k} is red: recolor ${p.k}, ${u.k}, ${g.k} and move up to ${g.k}` });
      z = g;
      continue;
    }
    if (z === (left ? p.r : p.l)) { // case 2: inner child, rotate it to the outside
      log?.push({ kind: 'rotate', keys: [p.k, z.k], text: `${z.k} is an inner child: rotate ${left ? 'left' : 'right'} at ${p.k}` });
      z = p; rotate(T, z, left ? 'left' : 'right');
    }
    const pp = z.p; // case 3: outer child, rotate the grandparent the other way
    pp.red = false; g.red = true; rotate(T, g, left ? 'right' : 'left');
    log?.push({ kind: 'rotate', keys: [g.k, pp.k], text: `rotate ${left ? 'right' : 'left'} at ${g.k}, recolor ${pp.k} black and ${g.k} red` });
  }
  if (T.root.red) { T.root.red = false; log?.push({ kind: 'recolor', keys: [T.root.k], text: `root ${T.root.k} turns black` }); }
  return log;
}
const build = (keys) => { const T = { root: null }; keys.forEach((k) => insert(T, k)); return T; };
const height = (n) => (n ? 1 + Math.max(height(n.l), height(n.r)) : 0);
// x from the in-order rank, y from the depth
function layout(T, x0, w, y0, dy) {
  const out = []; let i = 0;
  const walk = (n, d) => { if (!n) return; walk(n.l, d + 1); out.push({ n, i: i++, d }); walk(n.r, d + 1); };
  walk(T.root, 0);
  const step = w / Math.max(out.length - 1, 1);
  out.forEach((o) => { o.x = x0 + o.i * step; o.y = y0 + o.d * dy; });
  return out;
}
const R = 12;
function nodeEl(parent, k) {
  const g = S('g', {}, parent);
  const c = S('circle', { r: R, 'stroke-width': 2.4 }, g);
  S('text', { class: 'sl f-bg', 'font-size': 11, 'text-anchor': 'middle', y: 4, text: k }, g);
  return { g, c };
}
const paintNode = (e, red, ring) => attr(e.c, { class: (red ? 'f-red' : 'f-ink') + ' ' + (ring || 's-bg') });

// ── fig 1 · a red-black tree is a 2-3-4 tree ─────────────────────────────────
const KEYS1 = [13, 8, 17, 1, 11, 15, 25, 6, 22, 27, 20, 3];
class Rb234 extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'A red-black tree, and the same tree drawn as a 2-3-4 tree by lifting every red node into its black parent');
    const T = build(KEYS1), L = layout(T, 40, 520, 64, 52), at = new Map(L.map((o) => [o.n, o]));
    this.L = L;
    let bh = 0; for (let n = T.root; n; n = n.l) if (!n.red) bh++;
    this.bh = bh;
    // in the 2-3-4 view a red node sits on its parent's row
    // 2-3-4 row = number of black ancestors; a red node sits on its black parent's row
    const row = (n) => { let c = 0; for (let q = n.p; q; q = q.p) if (!q.red) c++; return n.red ? row(n.p) : c; };
    L.forEach((o) => { o.y2 = 64 + row(o.n) * 80; });
    // one group per black node: itself plus its red children
    this.groups = L.filter((o) => !o.n.red).map((o) => {
      const mem = [o, ...[o.n.l, o.n.r].filter((c) => c && c.red).map((c) => at.get(c))];
      const xs = mem.map((m) => m.x), x = Math.min(...xs) - R - 6, w = Math.max(...xs) - Math.min(...xs) + 2 * R + 12;
      return S('rect', { x, y: o.y2 - R - 6, width: w, height: 2 * R + 12, rx: 10, class: 'f-none s-green', 'stroke-width': 1.6 }, svg);
    });
    this.edges = L.filter((o) => o.n.p).map((o) => {
      const p = at.get(o.n.p);
      return { o, p, inside: o.n.red, e: S('line', { class: 's-ink3', 'stroke-width': 1.3 }, svg) };
    });
    this.nodes = L.map((o) => { const e = nodeEl(svg, o.n.k); paintNode(e, o.n.red); return e; });
    this.lab = S('text', { x: 20, y: 26, class: 'sl', 'font-size': 11 }, svg);
    this.hand = S('text', { x: 580, y: 318, class: 'hand', 'font-size': 16, 'text-anchor': 'end', text: 'black node + its red children = one 2-3-4 node' }, svg);
    this.k = 0; this.paint(0);
    pills(this, [[0, 'red-black tree'], [1, 'as a 2-3-4 tree']], 0, (v) => { const a = this.k; tween(this, (e) => this.paint(lerp(a, v, e)), 700); });
  }
  paint(k) {
    this.k = k;
    const Y = (o) => lerp(o.y, o.y2, k);
    this.L.forEach((o, i) => attr(this.nodes[i].g, { transform: `translate(${o.x} ${Y(o)})` }));
    this.edges.forEach(({ o, p, inside, e }) => {
      attr(e, { x1: p.x, y1: Y(p), x2: o.x, y2: Y(o) });
      op(e, inside ? 1 - k : 1);
    });
    this.groups.forEach((g) => op(g, seg(k, 0.6, 1)));
    op(this.hand, seg(k, 0.6, 1));
    this.lab.textContent = k < 0.5 ? `RED-BLACK TREE · ${this.bh} BLACK NODES ON EVERY ROOT-TO-LEAF PATH` : `2-3-4 TREE · ${this.bh} LEVELS, EVERY LEAF ON THE LAST ONE`;
  }
}

// ── fig 2 · a rotation ───────────────────────────────────────────────────────
// x with children α and y; y with β and γ. Rotating left at x lifts y, and β changes parent.
class RbRotate extends Figure {
  constructor() { super(); this.duration = 9; this.loop = false; this.poster = 3.5; }
  build() {
    const svg = this.svgRoot(600, 300, 'A left rotation at x: y moves up, x moves down to its left, and the middle subtree beta changes parent from y to x; the in-order sequence stays alpha x beta y gamma');
    // positions before (A) and after (B) the left rotation
    this.A = { x: [230, 80], y: [330, 140], a: [170, 150], b: [280, 210], c: [380, 210] };
    this.B = { x: [230, 140], y: [330, 80], a: [170, 210], b: [280, 210], c: [380, 150] };
    this.e = {}; ['xa', 'xy', 'yb', 'xb', 'yc'].forEach((k) => { this.e[k] = S('line', { class: k === 'yb' || k === 'xb' ? 's-green' : 's-ink3', 'stroke-width': 1.6 }, svg); });
    this.tri = {}; ['a', 'b', 'c'].forEach((k, i) => {
      const g = S('g', {}, svg);
      S('path', { d: 'M0 -14 L26 30 L-26 30 Z', class: k === 'b' ? 'f-none s-green' : 'f-none s-ink3', 'stroke-width': 1.4 }, g);
      S('text', { y: 18, class: k === 'b' ? 't' : 't2', 'font-size': 15, 'text-anchor': 'middle', text: 'αβγ'[i] }, g);
      this.tri[k] = g;
    });
    this.nd = {}; ['x', 'y'].forEach((k) => {
      const g = S('g', {}, svg);
      S('circle', { r: 16, class: 'f-ink' }, g);
      S('text', { y: 5, class: 'sl f-bg', 'font-size': 14, 'text-anchor': 'middle', text: k }, g);
      this.nd[k] = g;
    });
    S('text', { x: 300, y: 278, class: 't2', 'font-size': 13, 'text-anchor': 'middle', text: 'in order, before and after:  α  x  β  y  γ' }, svg);
    this.lab = S('text', { x: 20, y: 26, class: 'sl', 'font-size': 11 }, svg);
    this.cnt = S('text', { x: 590, y: 104, class: 't2', 'font-size': 13, 'text-anchor': 'end' }, svg);
    this.hand = S('text', { x: 360, y: 252, class: 'hand', 'font-size': 15, text: 'β is the only subtree that moves' }, svg);
  }
  label(t) { return t < 4.5 ? 'rotate left at x' : 'rotate right at y'; }
  render(t) {
    // 0-1 hold, 1-3 left rotation, 3-5.5 hold, 5.5-7.5 right rotation back
    const k = inout(seg(t, 1, 3)) * (1 - inout(seg(t, 5.5, 7.5)));
    const P = (n) => [lerp(this.A[n][0], this.B[n][0], k), lerp(this.A[n][1], this.B[n][1], k)];
    const p = { x: P('x'), y: P('y'), a: P('a'), b: P('b'), c: P('c') };
    const line = (e, u, v, o) => { attr(e, { x1: u[0], y1: u[1], x2: v[0], y2: v[1] }); op(e, o); };
    line(this.e.xa, p.x, p.a, 1); line(this.e.xy, p.x, p.y, 1); line(this.e.yc, p.y, p.c, 1);
    line(this.e.yb, p.y, p.b, 1 - k); line(this.e.xb, p.x, p.b, k);
    ['a', 'b', 'c'].forEach((n) => attr(this.tri[n], { transform: `translate(${p[n][0]} ${p[n][1]})` }));
    ['x', 'y'].forEach((n) => attr(this.nd[n], { transform: `translate(${p[n][0]} ${p[n][1]})` }));
    this.lab.textContent = t < 4.5 ? 'LEFT ROTATION AT x' : 'RIGHT ROTATION AT y (UNDOES IT)';
    this.cnt.textContent = '3 links change, O(1)';
    op(this.cnt, seg(t, 3, 3.4) * (1 - seg(t, 5.5, 5.8)) + seg(t, 7.5, 7.9));
    op(this.hand, seg(t, 3, 3.6));
  }
}

// ── fig 3 · insert, step by step ────────────────────────────────────────────
const SEQ = {
  sorted: Array.from({ length: 15 }, (_, i) => i + 1),
  random: (() => { const r = rng(5), a = Array.from({ length: 15 }, (_, i) => i + 1); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })(),
};
class RbInsert extends Figure {
  build() {
    const svg = this.svgRoot(600, 350, 'A red-black tree after each insertion, with the fix-up steps of the last insert listed and the touched nodes outlined');
    this.svg = svg; this.layer = S('g', {}, svg);
    this.head = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    this.steps = [0, 1, 2, 3, 4].map((i) => S('text', { x: 20, y: 274 + i * 17, class: 't2', 'font-size': 12.5 }, svg));
    this.seq = 'sorted'; this.n = 8;
    const bar = pills(this, [['sorted', 'keys 1, 2, 3, …'], ['random', 'random order']], 'sorted', (v) => { this.seq = v; this.paint(); });
    const lab = H('label', { class: 'pill', text: 'keys ' }, bar);
    this.out = H('span', { text: '8' }, lab);
    const s = H('input', { type: 'range', min: 1, max: 15, value: 8, 'aria-label': 'number of keys inserted' }, bar);
    s.oninput = () => { this.n = +s.value; this.paint(); };
    this.paint();
  }
  paint() {
    const keys = SEQ[this.seq].slice(0, this.n), T = build(keys.slice(0, -1)), log = insert(T, keys.at(-1), []);
    this.out.textContent = this.n;
    const L = layout(T, 30, 540, 56, 38), at = new Map(L.map((o) => [o.n, o]));
    const touched = new Set(log.flatMap((s) => s.keys));
    this.layer.replaceChildren();
    L.forEach((o) => { if (o.n.p) { const p = at.get(o.n.p); S('line', { x1: p.x, y1: p.y, x2: o.x, y2: o.y, class: 's-ink3', 'stroke-width': 1.2 }, this.layer); } });
    L.forEach((o) => {
      const e = nodeEl(this.layer, o.n.k);
      attr(e.g, { transform: `translate(${o.x} ${o.y})` });
      const isNew = o.n.k === keys.at(-1), hit = !isNew && touched.has(o.n.k);
      paintNode(e, o.n.red, isNew ? 's-green' : hit ? 's-ink' : 's-bg');
      if (hit) attr(e.c, { 'stroke-dasharray': '3 2.5' });
    });
    const h = height(T.root), bound = 2 * Math.log2(this.n + 1);
    this.head.textContent = `${this.n} KEYS · HEIGHT ${h} · BOUND 2·LOG2(N+1) = ${bound.toFixed(1)} · PLAIN BST: ${this.seq === 'sorted' ? this.n : height(plainBst(keys))}`;
    const lines = log.filter((s) => s.text).map((s) => s.text);
    const all = [`insert ${keys.at(-1)} as a red leaf${lines.length ? '' : ': its parent is black, done'}`, ...lines];
    // one step per row; 15 keys never need more than 5, but fold the middle just in case
    const rows = all.length <= 5 ? all : [...all.slice(0, 3), `… ${all.length - 4} more steps`, all.at(-1)];
    this.steps.forEach((t, i) => { t.textContent = rows[i] ? (i ? '→ ' : '') + rows[i] : ''; });
  }
}
function plainBst(keys) {
  const T = { root: null };
  keys.forEach((k) => { let y = null, x = T.root; while (x) { y = x; x = k < x.k ? x.l : x.r; } const z = { k, l: null, r: null }; if (!y) T.root = z; else if (k < y.k) y.l = z; else y.r = z; });
  return T.root;
}

// ── fig 4 · measured height and rotations ────────────────────────────────────
// Real inserts of n keys, sorted or shuffled (seeded), for n = 2^1 … 2^14.
const NS = Array.from({ length: 14 }, (_, i) => 2 ** (i + 1));
function measure(order) {
  const r = rng(9);
  if (order === 'sorted') { // one tree, grown through every n
    const T = { root: null, rot: 0 }; let k = 0;
    return NS.map((n) => { while (k < n) insert(T, k++); return { n, h: heightIter(T.root), rot: T.rot / n }; });
  }
  return NS.map((n) => {
    const keys = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
    const T = { root: null, rot: 0 };
    keys.forEach((k) => insert(T, k));
    return { n, h: heightIter(T.root), rot: T.rot / n };
  });
}
function heightIter(root) { // iterative, so 16k nodes never hit the call stack
  let h = 0; const st = [[root, 1]];
  while (st.length) { const [n, d] = st.pop(); if (!n) continue; h = Math.max(h, d); st.push([n.l, d + 1], [n.r, d + 1]); }
  return h;
}
class RbHeight extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Measured height of a red-black tree against the number of keys, for sorted and random insertion order, between the lines log2(n+1) and 2 log2(n+1)');
    const X = (n) => 70 + (Math.log2(n) - 1) / 13 * 470, Y = (h) => 250 - h / 30 * 210;
    this.X = X; this.Y = Y;
    [0, 10, 20, 30].forEach((h) => {
      S('line', { x1: 70, x2: 540, y1: Y(h), y2: Y(h), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 62, y: Y(h) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: h }, svg);
    });
    [2, 16, 128, 1024, 16384].forEach((n) => S('text', { x: X(n), y: 270, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: n.toLocaleString('en') }, svg));
    S('text', { x: 70, y: 24, class: 'sl', 'font-size': 11, text: 'HEIGHT (LEVELS) · KEYS INSERTED (LOG SCALE) →' }, svg);
    const curve = (f) => NS.map((n, i) => `${i ? 'L' : 'M'}${X(n).toFixed(1)} ${Y(f(n)).toFixed(1)}`).join('');
    S('path', { d: curve((n) => 2 * Math.log2(n + 1)), class: 'f-none s-ink3', 'stroke-width': 1.3, 'stroke-dasharray': '4 4' }, svg);
    S('path', { d: curve((n) => Math.log2(n + 1)), class: 'f-none s-ink3', 'stroke-width': 1.3, 'stroke-dasharray': '1 4' }, svg);
    S('text', { x: 546, y: Y(2 * Math.log2(16385)) + 4, class: 't3', 'font-size': 11, text: '2·log2' }, svg);
    S('text', { x: 546, y: Y(Math.log2(16385)) + 4, class: 't3', 'font-size': 11, text: 'log2' }, svg);
    this.data = { sorted: measure('sorted'), random: measure('random') };
    this.tip = tooltip(svg);
    this.line = S('path', { class: 'f-none s-green', 'stroke-width': 2 }, svg);
    this.dots = S('g', {}, svg);
    this.note = S('text', { x: 90, y: 56, class: 't2', 'font-size': 12.5 }, svg);
    this.order = 'sorted';
    entrance(this, (k) => op(this.line, k), 600);
    this.paint();
    pills(this, [['sorted', 'sorted keys'], ['random', 'random order']], 'sorted', (v) => { this.order = v; this.paint(); });
  }
  paint() {
    const d = this.data[this.order];
    attr(this.line, { d: d.map((p, i) => `${i ? 'L' : 'M'}${this.X(p.n).toFixed(1)} ${this.Y(p.h).toFixed(1)}`).join('') });
    this.dots.replaceChildren();
    d.forEach((p) => {
      S('circle', { cx: this.X(p.n), cy: this.Y(p.h), r: 3.5, class: 'f-green' }, this.dots);
      hit(this.dots, this.tip, this.X(p.n), this.Y(p.h), `${p.n.toLocaleString('en')} keys`, `height ${p.h} · ${p.rot.toFixed(2)} rotations per insert`);
    });
    const last = d.at(-1);
    this.note.textContent = `16,384 keys: height ${last.h}, ${last.rot.toFixed(2)} rotations per insert`;
  }
}

define({ 'rb-234': Rb234, 'rb-rotate': RbRotate, 'rb-insert': RbInsert, 'rb-height': RbHeight });
