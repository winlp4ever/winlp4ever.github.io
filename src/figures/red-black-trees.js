import { S, H, attr, op, seg, lerp, inout, rng, tween, pills, stepFigure, entrance, tooltip, hit, Figure, define } from './core.js'

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
  log?.push({ kind: 'new', keys: [k], k, p: y && y.k, bad: !!(y && y.red) });
  while (z.p && z.p.red) {
    const p = z.p, g = p.p, left = p === g.l, u = left ? g.r : g.l;
    if (u && u.red) { // case 1: red uncle, push the red up
      p.red = false; u.red = false; g.red = true;
      log?.push({ kind: 'recolor', keys: [p.k, u.k, g.k], p: p.k, u: u.k, g: g.k, gp: g.p && g.p.k, bad: !!(g.p && g.p.red), text: `uncle ${u.k} is red: recolor ${p.k}, ${u.k}, ${g.k} and move up to ${g.k}` });
      z = g;
      continue;
    }
    if (z === (left ? p.r : p.l)) { // case 2: inner child, rotate it to the outside
      const zk = z.k;
      z = p; rotate(T, z, left ? 'left' : 'right');
      log?.push({ kind: 'inner', keys: [p.k, zk], z: zk, p: p.k, dir: left ? 'left' : 'right', text: `${zk} is an inner child: rotate ${left ? 'left' : 'right'} at ${p.k}` });
    }
    const pp = z.p; // case 3: outer child, rotate the grandparent the other way
    pp.red = false; g.red = true; rotate(T, g, left ? 'right' : 'left');
    log?.push({ kind: 'outer', keys: [g.k, pp.k], g: g.k, pp: pp.k, z: z.k, dir: left ? 'right' : 'left', text: `rotate ${left ? 'right' : 'left'} at ${g.k}, recolor ${pp.k} black and ${g.k} red` });
  }
  if (T.root.red) { T.root.red = false; log?.push({ kind: 'root', keys: [T.root.k], k: T.root.k, text: `root ${T.root.k} turns black` }); }
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

// ── deletion (CLRS fix-up, with null children). A node with two children takes
// its successor's key, and the successor's node is removed instead. Every step is
// logged with the "extra black" x (or its parent and side, when x is nil).
const red = (n) => !!(n && n.red);
function remove(T, k, log = []) {
  let z = T.root;
  while (z && z.k !== k) z = k < z.k ? z.l : z.r;
  if (!z) return log;
  if (z.l && z.r) { let y = z.r; while (y.l) y = y.l; log.push({ kind: 'succ', k, s: y.k }); z.k = y.k; z = y; }
  const x = z.l || z.r, xp = z.p, left = xp ? xp.l === z : false;
  if (!xp) T.root = x; else if (left) xp.l = x; else xp.r = x;
  if (x) x.p = xp;
  log.push({ kind: 'cut', k: z.k, wasRed: z.red, child: x && x.k, x, xp, left: !x && !z.red && xp ? left : null });
  if (!z.red) fixup(T, x, xp, left, log);
  return log;
}
function fixup(T, x, xp, left, log) {
  const side = (L) => (L ? 'left' : 'right');
  while (x !== T.root && !red(x)) {
    if (x) { xp = x.p; left = x === xp.l; }
    let w = left ? xp.r : xp.l;
    if (red(w)) {
      w.red = false; xp.red = true; rotate(T, xp, side(left));
      log.push({ kind: 'c1', w: w.k, xp: xp.k, dir: side(left), x, xpN: xp, left }); w = left ? xp.r : xp.l;
    }
    const near = left ? w.l : w.r, far = left ? w.r : w.l;
    if (!red(near) && !red(far)) {
      w.red = true; x = xp;
      log.push({ kind: 'c2', w: w.k, xp: xp.k, xpRed: xp.red, atRoot: xp === T.root, x });
      continue;
    }
    if (!red(far)) {
      near.red = false; w.red = true; rotate(T, w, side(!left));
      log.push({ kind: 'c3', w: w.k, c: near.k, dir: side(!left), x, xpN: xp, left }); w = left ? xp.r : xp.l;
    }
    const f = left ? w.r : w.l;
    w.red = xp.red; xp.red = false; f.red = false; rotate(T, xp, side(left));
    log.push({ kind: 'c4', w: w.k, xp: xp.k, f: f.k, dir: side(left) });
    x = T.root;
  }
  if (x && x.red) { x.red = false; log.push({ kind: 'end', x: x.k }); }
}

// ── figs 3 and 4 · one operation, step by step ───────────────────────────────
// A frame is a copy of the tree, rings by key, an optional key waiting to go in
// (ghost) and an optional extra black (on a node, or on a nil drawn for it).
function copyTree(T, extra) {
  const cp = (n) => n && { k: n.k, red: n.red, l: cp(n.l), r: cp(n.r) };
  const root = cp(T.root);
  if (extra && !extra.x && extra.xp && extra.left != null) { // put a nil leaf where the extra black sits
    const find = (n) => (n.k === extra.xp.k ? n : find(extra.xp.k < n.k ? n.l : n.r));
    const p = find(root), nil = { k: 'nil', nil: true, l: null, r: null };
    if (extra.left) p.l = nil; else p.r = nil;
  }
  return root;
}
class Rec extends Array {
  static get [Symbol.species]() { return Array; }
  push(e) { return super.push({ ...e, root: copyTree(this.T, 'x' in e ? { x: e.x, xp: e.xpN || e.xp, left: e.left } : null) }); }
}
const CW2 = 18; // width of one in-order rank, so trees of any size share a scale
const RB_GEOM = new WeakMap(); // a frame's layout never changes, so work it out once
function rbGeom(f) {
  if (RB_GEOM.has(f)) return RB_GEOM.get(f);
  const L = layout({ root: f.root }, 0, 1, 0, 0), n = L.length, step = Math.min(38, 540 / Math.max(n - 1, 1));
  // levels share the space above the step text (y 288), the ghost one level below its node
  const deep = Math.max(0, ...L.map((o) => o.d)) + (f.ghost ? 1 : 0), dy = Math.min(40, 200 / Math.max(deep, 1));
  const x0 = 300 - (step * (n - 1)) / 2, at = new Map();
  L.forEach((o) => at.set(o.n.k, { x: x0 + o.i * step, y: 60 + o.d * dy, n: o.n }));
  if (f.ghost && f.ghost.near != null) { const q = at.get(f.ghost.near); at.set(f.ghost.k, { x: q.x + (f.ghost.k < f.ghost.near ? -20 : 20), y: q.y + dy * 0.85, ghost: true }); }
  RB_GEOM.set(f, at);
  return at;
}
function drawRb(g, B, A = null, e = 1) {
  g.replaceChildren();
  const GB = rbGeom(B), GA = A && rbGeom(A);
  const pos = (k) => { const b = GB.get(k), a = GA?.get(k) || b; return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) }; };
  GB.forEach((o, k) => [o.n?.l, o.n?.r].forEach((c) => { if (!c) return; const p = pos(k), q = pos(c.k); S('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 's-ink3', 'stroke-width': 1.2 }, g); }));
  GA?.forEach((o, k) => { // removed this step: fade out where it was
    if (GB.has(k) || o.ghost || o.n.nil) return;
    const el = nodeEl(g, k); attr(el.g, { transform: `translate(${o.x} ${o.y})` }); paintNode(el, o.n.red); op(el.g, 1 - e);
  });
  const RING = { new: 's-green', bad: 's-ochre', touch: 's-ink' };
  GB.forEach((o, k) => {
    const p = pos(k), m = B.marks?.get(k);
    if (o.n?.nil) {
      const q = S('g', { transform: `translate(${p.x} ${p.y})` }, g);
      S('rect', { x: -7, y: -7, width: 14, height: 14, rx: 2, class: 'f-ink s-ochre', 'stroke-width': 2.4 }, q);
      S('text', { y: 20, class: 't3', 'font-size': 9.5, 'text-anchor': 'middle', text: 'nil' }, q);
    } else {
      const el = nodeEl(g, k); attr(el.g, { transform: `translate(${p.x} ${p.y})` });
      const before = GA?.get(k)?.n, isRed = o.ghost ? true : e < 0.5 && before ? before.red : o.n.red;
      paintNode(el, isRed, RING[m] || 's-bg');
      if (m === 'touch') attr(el.c, { 'stroke-dasharray': '3 2.5' });
      if (o.ghost) op(el.g, 0.75);
    }
    if (B.extra === k) S('text', { x: p.x + 17, y: p.y - 9, class: 'f-ochre', 'font-size': 10.5, 'font-weight': 700, text: '+black' }, g);
  });
}
const ring = (pairs) => new Map(pairs.filter(([k]) => k != null));
function pathTo(T, k) { const out = []; let n = T.root; while (n) { out.push(n.k); if (n.k === k) break; n = k < n.k ? n.l : n.r; } return out; }
function insertFrames(keys, k) {
  const T = build(keys), path = pathTo(T, k), near = path.at(-1);
  const out = [{ root: copyTree(T), ghost: { k, near }, marks: ring(path.map((q) => [q, 'touch'])),
    text: near == null ? `insert ${k} into the empty tree` : `insert ${k}: walk down as in a binary search tree, ${path.join(' → ')}, and hang it ${k < near ? 'left' : 'right'} of ${near}` }];
  const rec = new Rec(); rec.T = T;
  insert(T, k, rec);
  rec.forEach((e) => {
    let text, marks;
    if (e.kind === 'new') {
      text = `${k} goes in as a red leaf, so no path gains a black node (rule 5 holds). ` + (e.bad ? `But its parent ${e.p} is red too: two reds in a row break rule 4` : e.p == null ? 'It is the root' : `Its parent ${e.p} is black, so no rule breaks: done`);
      marks = ring([[k, e.bad ? 'bad' : 'new'], [e.bad ? e.p : null, 'bad']]);
    } else if (e.kind === 'recolor') {
      text = `the uncle ${e.u} is red: make ${e.p} and ${e.u} black and ${e.g} red. Every path through ${e.g} keeps its black count. ` + (e.bad ? `${e.g}'s parent ${e.gp} is red, so the fix continues from ${e.g}` : `${e.g}'s parent is black or ${e.g} is the root, so the loop stops`);
      marks = ring([[e.p, 'touch'], [e.u, 'touch'], [e.g, e.bad ? 'bad' : 'touch'], [e.bad ? e.gp : null, 'bad']]);
    } else if (e.kind === 'inner') {
      text = `the uncle is black and ${e.z} is an inner child: rotate ${e.dir} at ${e.p}. Now ${e.p} hangs below ${e.z} on the outside, still red under red`;
      marks = ring([[e.z, 'bad'], [e.p, 'bad']]);
    } else if (e.kind === 'outer') {
      text = `the uncle is black and ${e.z} is an outer child: rotate ${e.dir} at ${e.g}, make ${e.pp} black and ${e.g} red. ${e.pp} now sits on top with two red children: done`;
      marks = ring([[e.g, 'touch'], [e.pp, 'touch']]);
    } else { text = `the root ${e.k} is red: make it black (rule 2). Every path gains one black node, so rule 5 still holds`; marks = ring([[e.k, 'touch']]); }
    out.push({ root: e.root, text, marks });
  });
  return out;
}
function deleteFrames(T, k) {
  const path = pathTo(T, k);
  const out = [{ root: copyTree(T), marks: ring(path.map((q) => [q, 'touch'])), text: `delete ${k}: find it as in a binary search tree, ${path.join(' → ')}` }];
  const rec = new Rec(); rec.T = T;
  remove(T, k, rec);
  rec.forEach((e) => {
    let text, marks, extra = null;
    if (e.kind === 'succ') { text = `${k} has two children. Its successor ${e.s}, the smallest key in its right subtree, has at most one child: ${e.s} will take ${k}'s place, and ${e.s}'s old node is the one removed`; marks = ring([[k, 'touch'], [e.s, 'touch']]); }
    else if (e.kind === 'cut') {
      const who = `the node that held ${e.k}`;
      if (e.wasRed) text = `remove ${who}. It was red, so no path loses a black node: done`;
      else if (e.child != null && !rec.some((q) => q.kind !== 'cut' && q.kind !== 'succ' && q.kind !== 'end')) text = `remove ${who}, a black node. Its child ${e.child} takes its place and carries the missing black`;
      else text = `remove ${who}, a black node. Every path through it is now one black short. The ${e.child == null ? 'nil' : 'node'} that took its place carries an "extra black"`;
      extra = e.wasRed ? null : e.child ?? 'nil';
      marks = ring([[e.child, extra != null ? 'bad' : null]]);
    } else if (e.kind === 'c1') { text = `case 1: the extra black's sibling ${e.w} is red. Rotate ${e.dir} at ${e.xp} and swap the colours of ${e.w} and ${e.xp}. The extra black now has a black sibling`; marks = ring([[e.w, 'touch'], [e.xp, 'touch']]); extra = e.x ? e.x.k : 'nil'; }
    else if (e.kind === 'c2') { text = `case 2: the sibling ${e.w} is black with two black children. Make ${e.w} red, which takes a black off its side too, and move the extra black up to ${e.xp}` + (e.xpRed ? `. ${e.xp} is red, so it absorbs it next` : e.atRoot ? `, the root, where it disappears` : `, which is black, so the fix continues there`); marks = ring([[e.w, 'touch'], [e.xp, 'bad']]); extra = e.xp; }
    else if (e.kind === 'c3') { text = `case 3: the sibling ${e.w} is black, its near child ${e.c} red and its far child black. Rotate ${e.dir} at ${e.w} and swap the colours of ${e.w} and ${e.c}. Now the far child is red: case 4`; marks = ring([[e.w, 'touch'], [e.c, 'touch']]); extra = e.x ? e.x.k : 'nil'; }
    else if (e.kind === 'c4') { text = `case 4: the sibling ${e.w} is black with a red far child ${e.f}. Rotate ${e.dir} at ${e.xp}, give ${e.w} the colour of ${e.xp}, and make ${e.xp} and ${e.f} black. The extra black is absorbed: done`; marks = ring([[e.w, 'touch'], [e.xp, 'touch'], [e.f, 'touch']]); }
    else { text = `${e.x} carries the extra black and is red: make it black. The black count is back on every path: done`; marks = ring([[e.x, 'touch']]); }
    if (extra != null && extra !== 'nil') marks.set(extra, 'bad');
    out.push({ root: e.root, text, marks, extra });
  });
  return out;
}

// ── fig 3 · insert, step by step ────────────────────────────────────────────
const SEQ = {
  sorted: Array.from({ length: 15 }, (_, i) => i + 1),
  random: (() => { const r = rng(5), a = Array.from({ length: 15 }, (_, i) => i + 1); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })(),
};
class RbInsert extends Figure {
  build() {
    const svg = this.svgRoot(600, 340, 'One insertion into a red-black tree, step by step: the new key goes in as a red leaf, then the fix-up recolours or rotates until no red node has a red parent');
    this.head = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    this.seq = 'sorted'; this.n = 8;
    const bar = pills(this, [['sorted', 'keys 1, 2, 3, …'], ['random', 'random order']], 'sorted', (v) => { this.seq = v; this.load(); });
    const lab = H('label', { class: 'pill', text: 'keys ' }, bar);
    this.out = H('span', { text: '8' }, lab);
    const s = H('input', { type: 'range', min: 1, max: 15, value: 8, 'aria-label': 'number of keys inserted' }, bar);
    s.oninput = () => { this.n = +s.value; this.load(); };
    stepFigure(this, svg, 288, drawRb);
    this.load();
  }
  load() {
    const keys = SEQ[this.seq].slice(0, this.n), T = build(keys);
    this.out.textContent = this.n;
    this.frames = insertFrames(keys.slice(0, -1), keys.at(-1));
    const h = height(T.root), bound = 2 * Math.log2(this.n + 1);
    this.head.textContent = `AFTER ${this.n} KEYS · HEIGHT ${h} · BOUND 2·LOG2(N+1) = ${bound.toFixed(1)} · PLAIN BST: ${this.seq === 'sorted' ? this.n : height(plainBst(keys))}`;
    this.step.set(this.frames.length);
  }
}

// ── fig 4 · delete, step by step ────────────────────────────────────────────
// Five deletions from a twelve-key tree, picked so that between them every case runs.
const RBD0 = [45, 40, 20, 30, 25, 5, 60, 15, 50, 55, 10, 35], RBDELS = [30, 25, 45, 60, 50];
class RbDelete extends Figure {
  build() {
    const svg = this.svgRoot(600, 340, 'Deletions from a red-black tree, step by step: removing a black node leaves an extra black, which the fix-up pushes up or absorbs with recolourings and rotations');
    this.head = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    const T = build(RBD0);
    this.ops = RBDELS.map((k) => ({ k, frames: deleteFrames(T, k) }));
    pills(this, this.ops.map((o, i) => [i, `delete ${o.k}`]), 0, (v) => this.load(v));
    stepFigure(this, svg, 288, drawRb);
    this.load(0);
  }
  load(i) {
    this.frames = this.ops[i].frames;
    this.head.textContent = `DELETION ${i + 1} OF ${RBDELS.length} · EACH STARTS FROM THE TREE THE LAST ONE LEFT`;
    this.step.set(this.frames.length);
  }
}
function plainBst(keys) {
  const T = { root: null };
  keys.forEach((k) => { let y = null, x = T.root; while (x) { y = x; x = k < x.k ? x.l : x.r; } const z = { k, l: null, r: null }; if (!y) T.root = z; else if (k < y.k) y.l = z; else y.r = z; });
  return T.root;
}

// ── fig 5 · measured height and rotations ────────────────────────────────────
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

define({ 'rb-234': Rb234, 'rb-rotate': RbRotate, 'rb-insert': RbInsert, 'rb-delete': RbDelete, 'rb-height': RbHeight });
