import { S, H, attr, op, lerp, rng, pills, stepFigure, entrance, Figure, define } from './core.js'

// ── a real B-tree with minimum degree t (CLRS): every node but the root holds
// t−1 … 2t−1 keys. Insert splits bottom-up; delete borrows or merges bottom-up.
// Every step is logged so the figures can show what happened.
const node = (keys = [], kids = null) => ({ keys, kids });
const leaf = (n) => !n.kids;
const childIdx = (n, k) => { let i = 0; while (i < n.keys.length && n.keys[i] < k) i++; return i; }; // first key ≥ k
function insert(T, k, log = null) {
  const path = []; let n = T.root, i;
  while (true) {
    i = childIdx(n, k);
    if (leaf(n)) break;
    path.push([n, i]); n = n.kids[i];
  }
  n.keys.splice(i, 0, k);
  log?.push({ kind: 'add', node: n, text: `add ${k} to a leaf` });
  while (n.keys.length > 2 * T.t - 1) { // overflow: split around the median
    const mid = Math.floor(n.keys.length / 2), up = n.keys[mid];
    const right = node(n.keys.slice(mid + 1), n.kids ? n.kids.slice(mid + 1) : null);
    n.keys = n.keys.slice(0, mid); if (n.kids) n.kids = n.kids.slice(0, mid + 1);
    if (path.length) {
      const [p, j] = path.pop();
      p.keys.splice(j, 0, up); p.kids.splice(j + 1, 0, right);
      log?.push({ kind: 'split', node: p, made: [n, right], up, text: `node full: split it, ${up} moves up` });
      n = p;
    } else {
      T.root = node([up], [n, right]);
      log?.push({ kind: 'split', node: T.root, made: [n, right], up, grows: true, text: `root full: split it, ${up} becomes the new root, the tree grows a level` });
      break;
    }
  }
  return log;
}
function remove(T, k, log = []) {
  const path = []; let n = T.root, i;
  while (true) {
    i = childIdx(n, k);
    if (i < n.keys.length && n.keys[i] === k) break;
    if (leaf(n)) { log.push({ kind: 'none', text: `${k} is not in the tree` }); return log; }
    path.push([n, i]); n = n.kids[i];
  }
  if (!leaf(n)) { // swap with the largest key of the left subtree, then delete that one from its leaf
    path.push([n, i]); let m = n.kids[i];
    while (!leaf(m)) { path.push([m, m.kids.length - 1]); m = m.kids[m.kids.length - 1]; }
    const pred = m.keys[m.keys.length - 1];
    n.keys[i] = pred; m.keys.pop();
    log.push({ kind: 'swap', node: n, made: [m], k, pred, text: `${k} is in an inner node: replace it with its predecessor ${pred}` });
    n = m;
  } else {
    n.keys.splice(i, 1);
    log.push({ kind: 'del', node: n, text: `remove ${k} from its leaf` });
  }
  const first = log.at(-1); // if a merge absorbs this node, point the entry at the merged node instead
  while (n !== T.root && n.keys.length < T.t - 1) { // underflow
    const [p, j] = path.pop(), L = p.kids[j - 1], R = p.kids[j + 1];
    if (L && L.keys.length > T.t - 1) {
      const down = p.keys[j - 1];
      n.keys.unshift(down); p.keys[j - 1] = L.keys.pop(); if (n.kids) n.kids.unshift(L.kids.pop());
      log.push({ kind: 'borrow', node: n, made: [L, p], down, up: p.keys[j - 1], side: 'left', text: `too few keys: borrow from the left sibling through the parent` }); return log;
    }
    if (R && R.keys.length > T.t - 1) {
      const down = p.keys[j];
      n.keys.push(down); p.keys[j] = R.keys.shift(); if (n.kids) n.kids.push(R.kids.shift());
      log.push({ kind: 'borrow', node: n, made: [R, p], down, up: p.keys[j], side: 'right', text: `too few keys: borrow through the parent from the right sibling` }); return log;
    }
    const [a, b, s] = L ? [L, n, j - 1] : [n, R, j]; // merge a, separator, b
    const sep = p.keys[s];
    a.keys = [...a.keys, sep, ...b.keys]; if (a.kids) a.kids = [...a.kids, ...b.kids];
    p.keys.splice(s, 1); p.kids.splice(s + 1, 1);
    if (first.node === b) first.node = a;
    log.push({ kind: 'merge', node: a, made: [p], sep, text: `too few keys, no sibling can spare one: merge, pulling ${sep} down` });
    n = p;
  }
  if (!T.root.keys.length && T.root.kids) { T.root = T.root.kids[0]; log.push({ kind: 'shrink', node: T.root, made: [], text: 'the root is empty: its only child becomes the root, the tree loses a level' }); }
  return log;
}
const build = (t, keys) => { const T = { t, root: node() }; keys.forEach((k) => insert(T, k)); return T; };

// Lay out a tree: leaves left to right, parents centred over their children.
const CELL = 22;
function layout(T, x0, w, y0, dy) {
  const levels = []; const walk = (n, d) => { (levels[d] ||= []).push(n); n.kids?.forEach((c) => walk(c, d + 1)); };
  walk(T.root, 0);
  const leaves = levels.at(-1), wid = (n) => Math.max(n.keys.length, 1) * CELL;
  const total = leaves.reduce((s, n) => s + wid(n), 0), gap = Math.max(6, (w - total) / Math.max(leaves.length - 1, 1));
  const pos = new Map(); let x = x0 + Math.max(0, (w - total - gap * (leaves.length - 1)) / 2);
  leaves.forEach((n) => { pos.set(n, { x, y: y0 + (levels.length - 1) * dy, w: wid(n) }); x += wid(n) + gap; });
  for (let d = levels.length - 2; d >= 0; d--) levels[d].forEach((n) => {
    const a = pos.get(n.kids[0]), b = pos.get(n.kids.at(-1)), c = (a.x + b.x + b.w) / 2;
    pos.set(n, { x: c - wid(n) / 2, y: y0 + d * dy, w: wid(n) });
  });
  return { levels, pos };
}
function drawTree(g, T, L, mark = new Map()) {
  g.replaceChildren();
  L.levels.forEach((lv) => lv.forEach((n) => n.kids?.forEach((c, i) => {
    const p = L.pos.get(n), q = L.pos.get(c);
    S('line', { x1: p.x + i * CELL, y1: p.y + 20, x2: q.x + q.w / 2, y2: q.y, class: 's-ink3', 'stroke-width': 1.2 }, g);
  })));
  L.levels.forEach((lv) => lv.forEach((n) => {
    const p = L.pos.get(n), m = mark.get(n);
    S('rect', { x: p.x, y: p.y, width: p.w, height: 20, rx: 4, class: m === 'main' ? 'f-panel s-green' : m === 'side' ? 'f-panel s-ochre' : 'f-panel s-ink3', 'stroke-width': m ? 2 : 1.2 }, g);
    n.keys.forEach((k, i) => {
      if (i) S('line', { x1: p.x + i * CELL, x2: p.x + i * CELL, y1: p.y + 3, y2: p.y + 17, class: 's-rule', 'stroke-width': 1 }, g);
      S('text', { x: p.x + i * CELL + CELL / 2, y: p.y + 14, class: 't', 'font-size': 10.5, 'text-anchor': 'middle', text: k }, g);
    });
  }));
}

// ── fig 1 · the same keys in a binary tree and in a B-tree ──────────────────
// Fifteen keys, 5 … 75. The binary tree is the balanced one; the B-tree has t = 2.
const WHY = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
const WHY_B = { t: 2, root: node([20, 40, 60], [10, 30, 50, 70].map((m) => node([m - 5, m, m + 5]))) };
const WHY_RANGES = ['< 20', '20 to 40', '40 to 60', '> 60'];
class BtWhy extends Figure {
  build() {
    const svg = this.svgRoot(600, 392, 'The same fifteen keys stored as a binary search tree, four levels deep, and as a B-tree with up to three keys per node, two levels deep; a search reads one node per level');
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'BINARY SEARCH TREE · 1 KEY PER NODE · 4 LEVELS' }, svg);
    this.readsA = S('text', { x: 580, y: 24, class: 't', 'font-size': 12.5, 'text-anchor': 'end' }, svg);
    this.gA = S('g', {}, svg);
    this.stepA = S('text', { x: 20, y: 192, class: 't2', 'font-size': 12.5 }, svg);
    S('line', { x1: 20, x2: 580, y1: 210, y2: 210, class: 's-rule', 'stroke-width': 1 }, svg);
    S('text', { x: 20, y: 236, class: 'sl', 'font-size': 11, text: 'B-TREE, t = 2 · UP TO 3 KEYS PER NODE · 2 LEVELS' }, svg);
    this.readsB = S('text', { x: 580, y: 236, class: 't', 'font-size': 12.5, 'text-anchor': 'end' }, svg);
    this.gB = S('g', {}, svg);
    this.stepB = S('text', { x: 20, y: 378, class: 't2', 'font-size': 12.5 }, svg);
    // both trees are fixed: lay them out once
    this.bst = [];
    const place = (lo, hi, d) => { // a node over WHY[lo..hi)
      if (lo >= hi) return null;
      const m = (lo + hi) >> 1, n = { key: WHY[m], x: 55 + (m / 2) * 70, y: 44 + d * 36 };
      n.l = place(lo, m, d + 1); n.r = place(m + 1, hi, d + 1); this.bst.push(n); return n;
    };
    this.bstRoot = place(0, WHY.length, 0);
    this.L = layout(WHY_B, 20, 560, 256, 56);
    this.k = 35;
    pills(this, [[35, 'find 35'], [70, 'find 70'], [5, 'find 5'], [42, 'find 42 (missing)']], 35, (v) => { this.k = v; this.paint(); });
    this.paint();
  }
  paint() {
    const k = this.k;
    // binary tree: node i of level d sits over its slice of the sorted keys
    const g = this.gA; g.replaceChildren();
    const nodes = this.bst, path = []; let c = this.bstRoot;
    while (c) { path.push(c); if (c.key === k) break; c = k < c.key ? c.l : c.r; }
    const on = new Set(path);
    nodes.forEach((n) => [n.l, n.r].forEach((ch) => ch && S('line', { x1: n.x, y1: n.y + 10, x2: ch.x, y2: ch.y - 10, class: on.has(n) && on.has(ch) ? 's-green' : 's-ink3', 'stroke-width': on.has(n) && on.has(ch) ? 2 : 1.2 }, g)));
    nodes.forEach((n) => {
      S('rect', { x: n.x - 13, y: n.y - 10, width: 26, height: 20, rx: 4, class: on.has(n) ? 'f-panel s-green' : 'f-panel s-ink3', 'stroke-width': on.has(n) ? 2 : 1.2 }, g);
      S('text', { x: n.x, y: n.y + 4, class: 't', 'font-size': 10.5, 'text-anchor': 'middle', 'font-weight': n.key === k ? 700 : 400, text: n.key }, g);
    });
    const found = path.at(-1).key === k;
    this.readsA.textContent = `${path.length} page read${path.length > 1 ? 's' : ''}`;
    this.stepA.textContent = path.map((n) => n.key).join(' → ') + (found ? `: found ${k}` : `: ${k} is not there`);
    // B-tree
    const L = this.L, r = WHY_B.root, i = childIdx(r, k);
    const hitRoot = r.keys[i] === k, leafN = hitRoot ? null : r.kids[i];
    const mark = new Map([[r, 'main']]); if (leafN) mark.set(leafN, 'main');
    drawTree(this.gB, WHY_B, L, mark);
    const p = L.pos.get(r);
    r.kids.forEach((ch, j) => {
      const q = L.pos.get(ch), x1 = p.x + j * CELL, x2 = q.x + q.w / 2;
      if (ch === leafN) S('line', { x1, y1: p.y + 20, x2, y2: q.y, class: 's-green', 'stroke-width': 2 }, this.gB);
      S('text', { x: x2, y: q.y + 36, class: ch === leafN ? 't' : 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: 'keys ' + WHY_RANGES[j] }, this.gB);
    });
    const reads = leafN ? 2 : 1;
    this.readsB.textContent = `${reads} page read${reads > 1 ? 's' : ''}`;
    const span = i === 0 ? `${k} < ${r.keys[0]}` : i === r.keys.length ? `${k} > ${r.keys.at(-1)}` : `${k} is between ${r.keys[i - 1]} and ${r.keys[i]}`;
    this.stepB.textContent = hitRoot ? `[${r.keys.join(' ')}]: found ${k}`
      : `[${r.keys.join(' ')}]: ${span}, child ${i + 1} → [${leafN.keys.join(' ')}]: ` + (leafN.keys.includes(k) ? `found ${k}` : `${k} is not there`);
  }
}

// ── fig 2 · how tall the tree gets ───────────────────────────────────────────
const FAN = [2, 16, 128, 512];
class BtHeight extends Figure {
  build() {
    const svg = this.svgRoot(600, 280, 'How many levels a search tree needs for a billion keys, for a binary tree and for B-trees with 16, 128 and 512 children per node');
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'LEVELS NEEDED (EACH LEVEL = ONE NODE READ PER LOOKUP)' }, svg);
    this.rows = FAN.map((f, i) => {
      const y = 62 + i * 52;
      S('text', { x: 20, y: y + 4, class: 't2', 'font-size': 12.5, text: f === 2 ? 'binary tree' : `${f} children` }, svg);
      const g = S('g', {}, svg);
      const lab = S('text', { x: 580, y: y + 4, class: 't', 'font-size': 13, 'text-anchor': 'end' }, svg);
      return { f, y, g, lab };
    });
    this.note = S('text', { x: 20, y: 266, class: 't3', 'font-size': 11.5 }, svg);
    this.n = 1e9;
    pills(this, [[1e6, '1 million keys'], [1e9, '1 billion'], [1e12, '1 trillion']], 1e9, (v) => { this.n = v; this.paint(); });
    this.paint();
  }
  paint() {
    this.rows.forEach(({ f, y, g, lab }) => {
      // levels so that a full tree of fanout f holds n keys: (f^h − 1) ≥ n roughly
      const h = Math.ceil(Math.log(this.n + 1) / Math.log(f));
      g.replaceChildren();
      const w = Math.min(10, 380 / h - 2);
      for (let i = 0; i < h; i++) S('rect', { x: 130 + i * (w + 2), y: y - 8, width: w, height: 16, rx: 2, class: f === 2 ? 'f-ink3' : 'f-green' }, g);
      lab.textContent = `${h} level${h === 1 ? '' : 's'}`;
    });
    const h = Math.ceil(Math.log(this.n + 1) / Math.log(512)), reads = Math.max(1, h - 2);
    this.note.textContent = `512 children, top two levels cached: ${reads} page read${reads === 1 ? '' : 's'} per lookup`;
  }
}

// ── figs 3 and 4 · one operation, step by step ───────────────────────────────
// A recorder is a log that snapshots the tree every time insert or remove logs a
// step, so each step becomes a frame. Frames keep a map from live nodes to their
// copies, so a step can mark the nodes it touched.
function snap(T) {
  const map = new Map();
  const cp = (n) => { const c = { keys: n.keys.slice(), kids: n.kids && n.kids.map(cp) }; map.set(n, c); return c; };
  return { root: cp(T.root), map };
}
class Recorder extends Array {
  static get [Symbol.species]() { return Array; }
  push(e) { return super.push({ ...e, at: e.node, ...snap(this.T) }); } // remove() may repoint .node later; .at keeps the node as logged
}
const keyList = (n) => `[${n.keys.join(' ')}]`;
const between = (n, i, k) => i === 0 ? `${k} < ${n.keys[0]}` : i === n.keys.length ? `${k} > ${n.keys.at(-1)}` : `${k} is between ${n.keys[i - 1]} and ${n.keys[i]}`;
// Frames for the walk down: one per node read, with the new key riding beside it (insert)
// or until the node holding k (delete).
function walkFrames(T, k, find, lead) {
  const out = [], trail = []; let n = T.root;
  while (true) {
    const i = childIdx(n, k), here = n.keys[i] === k;
    trail.push(n);
    let text;
    if (!n.keys.length) text = `the tree is empty: ${k} becomes its only key`;
    else if (find && here) text = `${keyList(n)} holds ${k}, ${n.kids ? 'in an inner node' : 'in a leaf'}`;
    else if (!n.kids) text = `${keyList(n)} is a leaf: ${k} goes ${i === 0 ? `before ${n.keys[0]}` : i === n.keys.length ? `after ${n.keys.at(-1)}` : `between ${n.keys[i - 1]} and ${n.keys[i]}`}`;
    else text = `${keyList(n)}: ${between(n, i, k)}, so follow pointer ${i + 1} of ${n.kids.length}`;
    const { root, map } = snap(T);
    out.push({ root, text: (out.length ? '' : lead) + text, marks: new Map(trail.map((m) => [map.get(m), 'path'])), ghost: find ? null : { k, node: map.get(n) } });
    if ((find && here) || !n.kids) return out;
    n = n.kids[i];
  }
}
const mk = (e, pairs) => new Map(pairs.filter(([n]) => n).map(([n, c]) => [e.map.get(n) || n, c]));
function insertFrames(t, keys, k) {
  const T = build(t, keys), max = 2 * t - 1;
  const out = walkFrames(T, k, false, `insert ${k}. `);
  const rec = new Recorder(); rec.T = T;
  insert(T, k, rec);
  rec.forEach((e) => {
    const n = e.map.get(e.at), over = n.keys.length > max;
    if (e.kind === 'add') out.push({ root: e.root, marks: mk(e, [[e.at, over ? 'bad' : 'ok']]),
      text: over ? `add ${k}: the leaf now holds ${n.keys.length} keys, one more than the maximum of ${max}` : `add ${k}: the leaf has room (${n.keys.length} of ${max} keys), so the insert is done` });
    else {
      const [a, b] = e.made.map((m) => e.map.get(m));
      const head = `split around the middle key ${e.up}: ${keyList(a)} and ${keyList(b)} stay below it`;
      out.push({ root: e.root, marks: mk(e, [[e.made[0], 'ok'], [e.made[1], 'ok'], [e.at, over ? 'bad' : 'ok']]),
        text: e.grows ? `${head}, and ${e.up} becomes a new root: the tree is one level taller` : `${head}, and ${e.up} moves up into the parent. ` + (over ? `The parent now holds ${n.keys.length} keys, too many, so it splits next` : `The parent has room, so the insert is done`) });
    }
  });
  return out;
}
function deleteFrames(T, k) {
  const min = T.t - 1, out = walkFrames(T, k, true, `delete ${k}. `);
  const rec = new Recorder(); rec.T = T;
  remove(T, k, rec);
  rec.forEach((e) => {
    const n = e.map.get(e.at);
    const isShort = n !== e.root && n.keys.length < min;
    let text, marks;
    if (e.kind === 'swap') {
      const leaf = e.map.get(e.made[0]), low = leaf.keys.length < min;
      text = `replace ${k} with its predecessor ${e.pred}, the largest key in its left subtree, and remove ${e.pred} from its leaf. ` + (low ? `That leaf now has ${leaf.keys.length} keys, fewer than the minimum of ${min}` : 'That leaf still has enough keys, so the delete is done');
      marks = mk(e, [[e.at, 'ok'], [e.made[0], low ? 'bad' : 'ok']]);
    }
    else if (e.kind === 'del') { text = `remove ${k} from its leaf. ` + (isShort ? `The leaf now has ${n.keys.length} key${n.keys.length === 1 ? '' : 's'}, fewer than the minimum of ${min}` : 'The leaf still has enough keys, so the delete is done'); marks = mk(e, [[e.at, isShort ? 'bad' : 'ok']]); }
    else if (e.kind === 'borrow') { text = `its ${e.side} sibling can spare a key: the separator ${e.down} comes down into the short node and ${e.up} goes up to replace it. Done`; marks = mk(e, [[e.at, 'ok'], ...e.made.map((m) => [m, 'ok'])]); }
    else if (e.kind === 'merge') {
      const p = e.map.get(e.made[0]), pShort = p !== e.root && p.keys.length < min;
      text = `no sibling can spare a key: merge with a sibling, pulling the separator ${e.sep} down between them. ` + (pShort ? `The parent is now short, so the fix repeats one level up` : p === e.root && !p.keys.length ? 'The root is now empty' : 'The parent still has enough keys, so the delete is done');
      marks = mk(e, [[e.at, 'ok'], [e.made[0], pShort || !p.keys.length ? 'bad' : 'ok']]);
    } else { text = 'the empty root is removed and its only child becomes the root: the tree is one level shorter'; marks = mk(e, [[e.at, 'ok']]); }
    out.push({ root: e.root, text, marks });
  });
  return out;
}

// Draw a frame, sliding from frame A when it's given: keys move to their new
// places, boxes follow the node most of their keys came from.
const BY0 = 54, BDY = 56;
const GEOM = new WeakMap(); // a frame's layout never changes, so work it out once
function geom(f) {
  if (!GEOM.has(f)) GEOM.set(f, layoutFrame(f));
  return GEOM.get(f);
}
function layoutFrame(f) {
  const T = { root: f.root }, L = layout(T, 20, 560, BY0, BDY), keys = new Map(), owner = new Map();
  L.levels.forEach((lv) => lv.forEach((n) => { const p = L.pos.get(n); n.keys.forEach((k, i) => { keys.set(k, { x: p.x + i * CELL + CELL / 2, y: p.y + 10 }); owner.set(k, n); }); }));
  if (f.ghost && !keys.has(f.ghost.k)) { // beside the node being read, on its left when the right edge is near
    const p = L.pos.get(f.ghost.node), x = p.x + p.w + 26 + CELL / 2 > 590 ? p.x - 26 : p.x + p.w + 26;
    keys.set(f.ghost.k, { x, y: p.y + 10, ghost: true });
  }
  return { L, keys, owner };
}
function drawFrame(g, B, A = null, e = 1) {
  g.replaceChildren();
  const GB = geom(B), GA = A && geom(A);
  const at = (k) => { const b = GB.keys.get(k), a = GA?.keys.get(k) || b; return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) }; };
  const box = new Map();
  GB.L.levels.forEach((lv) => lv.forEach((n) => {
    const pb = GB.L.pos.get(n); let pa = pb;
    if (GA) { // the source node that held most of this node's keys
      const count = new Map(); n.keys.forEach((k) => { const o = GA.owner.get(k); if (o) count.set(o, (count.get(o) || 0) + 1); });
      const best = [...count].sort((x, y) => y[1] - x[1])[0];
      if (best) pa = GA.L.pos.get(best[0]);
    }
    box.set(n, { x: lerp(pa.x, pb.x, e), y: lerp(pa.y, pb.y, e), w: lerp(pa.w, pb.w, e) });
  }));
  GB.L.levels.forEach((lv) => lv.forEach((n) => n.kids?.forEach((c, i) => {
    const p = box.get(n), q = box.get(c), slot = p.w / Math.max(n.keys.length, 1);
    S('line', { x1: p.x + i * slot, y1: p.y + 20, x2: q.x + q.w / 2, y2: q.y, class: 's-ink3', 'stroke-width': 1.2 }, g);
  })));
  const CLS = { path: 'f-panel s-ink', bad: 'f-panel s-ochre', ok: 'f-panel s-green' };
  GB.L.levels.forEach((lv) => lv.forEach((n) => {
    const p = box.get(n), m = B.marks?.get(n);
    S('rect', { x: p.x, y: p.y, width: p.w, height: 20, rx: 4, class: CLS[m] || 'f-panel s-ink3', 'stroke-width': m ? 2.2 : 1.2, 'stroke-dasharray': m === 'bad' ? '4 3' : null }, g);
    for (let i = 1; i < n.keys.length; i++) S('line', { x1: p.x + i * p.w / n.keys.length, x2: p.x + i * p.w / n.keys.length, y1: p.y + 3, y2: p.y + 17, class: 's-rule', 'stroke-width': 1 }, g);
  }));
  GB.keys.forEach((v, k) => {
    const q = at(k);
    if (v.ghost) S('rect', { x: q.x - CELL / 2, y: q.y - 10, width: CELL, height: 20, rx: 4, class: 'f-green s-green', 'stroke-width': 1.2 }, g);
    S('text', { x: q.x, y: q.y + 4, class: v.ghost ? 'f-bg' : 't', 'font-size': 10.5, 'text-anchor': 'middle', 'font-weight': v.ghost ? 600 : 400, text: k }, g);
  });
  GA?.keys.forEach((v, k) => { // keys that this step removes fade out where they were
    if (GB.keys.has(k)) return;
    op(S('text', { x: v.x, y: v.y + 4, class: 't', 'font-size': 10.5, 'text-anchor': 'middle', text: k }, g), 1 - e);
  });
}
// ── fig 3 · inserting, with splits ───────────────────────────────────────────
// Multiples of 3 in a fixed shuffled order (written out, so every browser gets the same tree).
const SEQ = [12, 3, 27, 6, 42, 48, 24, 63, 15, 60, 33, 57, 51, 36, 69, 45, 39, 21, 18, 9, 72, 54, 30, 66];
class BtInsert extends Figure {
  build() {
    const svg = this.svgRoot(600, 320, 'One insertion into a B-tree, step by step: the walk down to a leaf, the key added there, and the splits that send middle keys up when a node overflows');
    this.head = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    this.t = 2; this.n = 12;
    const bar = pills(this, [[2, 't = 2 (2-3-4 tree)'], [3, 't = 3']], 2, (v) => { this.t = v; this.load(); });
    const lab = H('label', { class: 'pill', text: 'key no. ' }, bar);
    this.out = H('span', { text: '12' }, lab);
    const s = H('input', { type: 'range', min: 1, max: SEQ.length, value: 12, 'aria-label': 'which key of the sequence to insert' }, bar);
    s.oninput = () => { this.n = +s.value; this.load(); };
    stepFigure(this, svg, 266, drawFrame);
    this.load();
  }
  load() {
    const keys = SEQ.slice(0, this.n);
    this.out.textContent = this.n;
    this.frames = insertFrames(this.t, keys.slice(0, -1), keys.at(-1));
    this.head.textContent = `INSERT ${keys.at(-1)} INTO ${this.n - 1} KEYS · t = ${this.t} · ${this.t - 1} TO ${2 * this.t - 1} KEYS PER NODE`;
    this.step.set(this.frames.length);
  }
}

// ── fig 4 · deleting, with borrows and merges ────────────────────────────────
const DEL0 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 5, 15, 25, 35, 45];
const DELS = [90, 30, 35, 60, 40, 80];
class BtDelete extends Figure {
  build() {
    const svg = this.svgRoot(600, 320, 'Deleting keys from a B-tree, step by step: a leaf that drops below the minimum borrows a key through its parent from a sibling, or merges with a sibling, which can shrink the tree');
    this.head = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    // the tree before each deletion, and the frames of that deletion
    const T = build(2, DEL0);
    this.ops = DELS.map((k) => ({ k, frames: deleteFrames(T, k) }));
    pills(this, this.ops.map((o, i) => [i, `delete ${o.k}`]), 0, (v) => this.load(v));
    stepFigure(this, svg, 266, drawFrame);
    this.load(0);
  }
  load(i) {
    const o = this.ops[i];
    this.frames = o.frames;
    this.head.textContent = `DELETION ${i + 1} OF ${DELS.length} · t = 2 · EVERY NODE BUT THE ROOT KEEPS AT LEAST 1 KEY`;
    this.step.set(this.frames.length);
  }
}

// ── fig 5 · range scans in a B+ tree ─────────────────────────────────────────
// Keys 1..48 bulk-loaded into leaves of 4, internal nodes of up to 4 children.
// Leaves hold every key and link to their right neighbour.
const LEAF = Array.from({ length: 12 }, (_, i) => [1, 2, 3, 4].map((j) => i * 4 + j));
class BtRange extends Figure {
  build() {
    const svg = this.svgRoot(600, 270, 'A B+ tree: all keys in the leaves, leaves linked left to right; a range scan goes down once to the first leaf and then follows the links');
    const lw = 42, gap = 6, x0 = 300 - (12 * lw + 11 * gap) / 2;
    this.leaf = LEAF.map((ks, i) => ({ ks, x: x0 + i * (lw + gap), y: 180, w: lw }));
    const mid = [0, 1, 2].map((j) => ({ kids: this.leaf.slice(j * 4, j * 4 + 4) }));
    mid.forEach((m) => { const a = m.kids[0], b = m.kids.at(-1); m.w = 54; m.x = (a.x + b.x + b.w) / 2 - m.w / 2; m.y = 110; m.seps = m.kids.slice(1).map((c) => c.ks[0]); });
    const root = { kids: mid, w: 44, y: 50 }; root.x = 300 - root.w / 2; root.seps = mid.slice(1).map((m) => m.kids[0].ks[0]);
    this.root = root; this.mid = mid;
    const edge = (p, c, i, cw) => S('line', { x1: p.x + i * cw, y1: p.y + 18, x2: c.x + c.w / 2, y2: c.y, class: 's-ink3', 'stroke-width': 1.1 }, svg);
    root.kids.forEach((c, i) => edge(root, c, i, root.w / (root.kids.length - 1)));
    mid.forEach((m) => m.kids.forEach((c, i) => edge(m, c, i, m.w / (m.kids.length - 1))));
    this.links = this.leaf.slice(0, -1).map((l, i) => S('path', { d: `M${l.x + l.w} ${l.y + 9} H${this.leaf[i + 1].x}`, class: 'f-none s-ink3', 'stroke-width': 1.2 }, svg));
    const box = (o, text) => { o.r = S('rect', { x: o.x, y: o.y, width: o.w, height: 18, rx: 4, 'stroke-width': 1.4 }, svg); S('text', { x: o.x + o.w / 2, y: o.y + 13, class: 't', 'font-size': 9.5, 'text-anchor': 'middle', text }, svg); };
    box(root, root.seps.join(' ')); mid.forEach((m) => box(m, m.seps.join(' '))); this.leaf.forEach((l) => box(l, `${l.ks[0]}–${l.ks.at(-1)}`));
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'B+ TREE · KEYS ONLY IN LEAVES · LEAVES LINKED →' }, svg);
    this.out = [0, 1].map((i) => S('text', { x: 20, y: 236 + i * 18, class: i ? 't2' : 't', 'font-size': 13 }, svg));
    const bar = H('div', { class: 'fc' }, this); this.idleText = 'interactive';
    const mk = (name, v) => { const lab = H('label', { class: 'pill', text: name + ' ' }, bar); const out = H('span', { text: v }, lab); const s = H('input', { type: 'range', min: 1, max: 48, value: v, 'aria-label': name }, bar); return { s, out }; };
    const a = mk('from', 7), b = mk('to', 30);
    const go = (src) => { let x = +a.s.value, y = +b.s.value; if (x > y) { if (src === a) b.s.value = y = x; else a.s.value = x = y; } a.out.textContent = x; b.out.textContent = y; this.paint(x, y); };
    a.s.oninput = () => go(a); b.s.oninput = () => go(b); go(a);
  }
  paint(lo, hi) {
    const first = Math.floor((lo - 1) / 4), last = Math.floor((hi - 1) / 4), m = Math.floor(first / 4);
    attr(this.root.r, { class: 'f-panel s-green' });
    this.mid.forEach((x, i) => attr(x.r, { class: i === m ? 'f-panel s-green' : 'f-panel s-ink3' }));
    this.leaf.forEach((l, i) => attr(l.r, { class: i >= first && i <= last ? (i === first ? 'f-panel s-green' : 'f-panel s-ochre') : 'f-panel s-ink3' }));
    this.links.forEach((p, i) => attr(p, { class: i >= first && i < last ? 'f-none s-ochre' : 'f-none s-ink3', 'stroke-width': i >= first && i < last ? 2.2 : 1.2 }));
    const leaves = last - first + 1;
    this.out[0].textContent = `keys ${lo} to ${hi}: ${hi - lo + 1} keys`;
    this.out[1].textContent = `2 inner nodes on the way down + ${leaves} lea${leaves === 1 ? 'f' : 'ves'} along the links = ${2 + leaves} page reads`;
  }
}

// ── fig 6 · how full the pages end up ───────────────────────────────────────
// Leaves only (internal nodes don't change the picture): capacity C keys per leaf.
// 'half' splits a full leaf 50/50; 'right' splits the rightmost leaf so the left
// page keeps 90% (PostgreSQL's default leaf fillfactor for rightmost splits).
function fill(order, policy, N = 20000, C = 64) {
  const r = rng(3), keys = Array.from({ length: N }, (_, i) => i);
  if (order === 'random') for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
  const leaves = [[]];
  for (const k of keys) {
    let lo = 0, hi = leaves.length - 1; // last leaf whose first key ≤ k
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (leaves[m][0] <= k) lo = m; else hi = m - 1; }
    const L = leaves[lo]; let i = L.length; while (i > 0 && L[i - 1] > k) i--; L.splice(i, 0, k);
    if (L.length > C) {
      const rightmost = lo === leaves.length - 1 && i === L.length - 1;
      const cut = policy === 'right' && rightmost ? Math.round(C * 0.9) : Math.ceil(L.length / 2);
      leaves.splice(lo + 1, 0, L.splice(cut));
    }
  }
  return { leaves: leaves.length, fill: N / (leaves.length * C) };
}
const CASES = [['random', 'half', 'random keys, 50/50 split'], ['sorted', 'half', 'ascending keys, 50/50 split'], ['sorted', 'right', 'ascending keys, rightmost split at 90%']];
class BtFill extends Figure {
  build() {
    const svg = this.svgRoot(600, 220, 'Average leaf fill after 20,000 insertions into leaves of 64 keys: random keys, ascending keys with even splits, and ascending keys with a rightmost split that keeps the left page 90% full');
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'AVERAGE LEAF FILL AFTER 20,000 INSERTS · 64 KEYS PER LEAF' }, svg);
    const X = (f) => 40 + f * 500;
    [0, 0.5, 1].forEach((f) => { S('line', { x1: X(f), x2: X(f), y1: 40, y2: 186, class: 's-rule', 'stroke-width': 1 }, svg); S('text', { x: X(f), y: 204, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: Math.round(f * 100) + '%' }, svg); });
    this.bars = CASES.map(([o, p, name], i) => {
      const { leaves, fill: f } = fill(o, p), y = 60 + i * 44;
      const r = S('rect', { x: X(0), y, width: 0, height: 14, rx: 3, class: i === 2 ? 'f-green' : 'f-ink3' }, svg);
      S('text', { x: X(0), y: y - 6, class: 't', 'font-size': 12, text: `${name}: ${Math.round(f * 100)}% · ${leaves} leaves` }, svg);
      return { r, f };
    });
    entrance(this, (k) => this.bars.forEach(({ r, f }) => attr(r, { width: (X(f) - X(0)) * k })), 900);
  }
}

define({ 'bt-why': BtWhy, 'bt-height': BtHeight, 'bt-insert': BtInsert, 'bt-delete': BtDelete, 'bt-range': BtRange, 'bt-fill': BtFill });
