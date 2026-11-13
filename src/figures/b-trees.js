import { S, H, attr, op, rng, pills, entrance, tooltip, hit, Figure, define } from './core.js'

// ── a real B-tree with minimum degree t (CLRS): every node but the root holds
// t−1 … 2t−1 keys. Insert splits bottom-up; delete borrows or merges bottom-up.
// Every step is logged so the figures can show what happened.
const node = (keys = [], kids = null) => ({ keys, kids });
const leaf = (n) => !n.kids;
function insert(T, k, log = null) {
  const path = []; let n = T.root, i;
  while (true) {
    i = 0; while (i < n.keys.length && n.keys[i] < k) i++;
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
      log?.push({ kind: 'split', node: p, made: [n, right], text: `node full: split it, ${up} moves up` });
      n = p;
    } else {
      T.root = node([up], [n, right]);
      log?.push({ kind: 'split', node: T.root, made: [n, right], text: `root full: split it, ${up} becomes the new root, the tree grows a level` });
      break;
    }
  }
  return log;
}
function remove(T, k, log = []) {
  const path = []; let n = T.root, i;
  while (true) {
    i = 0; while (i < n.keys.length && n.keys[i] < k) i++;
    if (i < n.keys.length && n.keys[i] === k) break;
    if (leaf(n)) { log.push({ kind: 'none', text: `${k} is not in the tree` }); return log; }
    path.push([n, i]); n = n.kids[i];
  }
  if (!leaf(n)) { // swap with the largest key of the left subtree, then delete that one from its leaf
    path.push([n, i]); let m = n.kids[i];
    while (!leaf(m)) { path.push([m, m.kids.length - 1]); m = m.kids[m.kids.length - 1]; }
    const pred = m.keys[m.keys.length - 1];
    log.push({ kind: 'swap', node: n, text: `${k} is in an inner node: replace it with its predecessor ${pred}` });
    n.keys[i] = pred; m.keys.pop(); n = m;
  } else {
    n.keys.splice(i, 1);
    log.push({ kind: 'del', node: n, text: `remove ${k} from its leaf` });
  }
  while (n !== T.root && n.keys.length < T.t - 1) { // underflow
    const [p, j] = path.pop(), L = p.kids[j - 1], R = p.kids[j + 1];
    if (L && L.keys.length > T.t - 1) {
      n.keys.unshift(p.keys[j - 1]); p.keys[j - 1] = L.keys.pop(); if (n.kids) n.kids.unshift(L.kids.pop());
      log.push({ kind: 'borrow', node: n, made: [L], text: `too few keys: borrow through the parent from the left sibling` }); return log;
    }
    if (R && R.keys.length > T.t - 1) {
      n.keys.push(p.keys[j]); p.keys[j] = R.keys.shift(); if (n.kids) n.kids.push(R.kids.shift());
      log.push({ kind: 'borrow', node: n, made: [R], text: `too few keys: borrow through the parent from the right sibling` }); return log;
    }
    const [a, b, s] = L ? [L, n, j - 1] : [n, R, j]; // merge a, separator, b
    const sep = p.keys[s];
    a.keys = [...a.keys, sep, ...b.keys]; if (a.kids) a.kids = [...a.kids, ...b.kids];
    p.keys.splice(s, 1); p.kids.splice(s + 1, 1);
    log.push({ kind: 'merge', node: a, text: `too few keys and no sibling can spare one: merge with a sibling, pulling ${sep} down from the parent` });
    n = p;
  }
  if (!T.root.keys.length && T.root.kids) { T.root = T.root.kids[0]; log.push({ kind: 'shrink', node: T.root, text: 'the root is empty: its only child becomes the root, the tree loses a level' }); }
  return log;
}
const build = (t, keys) => { const T = { t, root: node() }; keys.forEach((k) => insert(T, k)); return T; };
const depth = (T) => { let d = 1, n = T.root; while (n.kids) { d++; n = n.kids[0]; } return d; };

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

// ── fig 1 · how tall the tree gets ───────────────────────────────────────────
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

// ── fig 2 · inserting, with splits ───────────────────────────────────────────
const r2 = rng(17);
const SEQ = Array.from({ length: 24 }, (_, i) => (i + 1) * 3).sort(() => r2() - 0.5);
class BtInsert extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'A B-tree after each insertion: keys go into a leaf, and a leaf that overflows splits in two and sends its middle key up to the parent');
    this.head = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    this.g = S('g', {}, svg);
    this.steps = [0, 1, 2, 3].map((i) => S('text', { x: 20, y: 236 + i * 17, class: 't2', 'font-size': 12.5 }, svg));
    this.t = 2; this.n = 12;
    const bar = pills(this, [[2, 't = 2 (2-3-4 tree)'], [3, 't = 3']], 2, (v) => { this.t = v; this.paint(); });
    const lab = H('label', { class: 'pill', text: 'keys ' }, bar);
    this.out = H('span', { text: '12' }, lab);
    const s = H('input', { type: 'range', min: 1, max: SEQ.length, value: 12, 'aria-label': 'number of keys inserted' }, bar);
    s.oninput = () => { this.n = +s.value; this.paint(); };
    this.paint();
  }
  paint() {
    const keys = SEQ.slice(0, this.n), T = build(this.t, keys.slice(0, -1)), log = insert(T, keys.at(-1), []);
    this.out.textContent = this.n;
    const L = layout(T, 20, 560, 50, 56), mark = new Map();
    log.forEach((s) => { if (s.kind === 'add') mark.set(s.node, 'main'); if (s.made) s.made.forEach((m) => mark.set(m, 'side')); });
    log.filter((s) => s.kind === 'split').forEach((s) => mark.set(s.node, 'main'));
    drawTree(this.g, T, L, mark);
    this.head.textContent = `${this.n} KEYS · t = ${this.t} · ${2 * this.t - 1} KEYS MAX PER NODE · ${depth(T)} LEVELS`;
    const rows = [`insert ${keys.at(-1)}: ${log[0].text}`, ...log.slice(1).map((s) => '→ ' + s.text)];
    this.steps.forEach((t, i) => { t.textContent = rows[i] || ''; });
  }
}

// ── fig 3 · deleting, with borrows and merges ────────────────────────────────
const DEL0 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 5, 15, 25, 35, 45];
const DELS = [90, 30, 35, 60, 40, 80];
function delSnaps() {
  const T = build(2, DEL0), snaps = [];
  const clone = (n) => ({ keys: n.keys.slice(), kids: n.kids && n.kids.map(clone) });
  snaps.push({ root: clone(T.root), log: [{ text: `start: ${DEL0.length} keys, t = 2` }] });
  DELS.forEach((k) => {
    const log = remove(T, k);
    // remember which nodes were touched by matching them in the clone
    const ids = new Map(); const map = (a, b) => { ids.set(a, b); a.kids?.forEach((c, i) => map(c, b.kids[i])); };
    const c = clone(T.root); map(T.root, c);
    snaps.push({ root: c, log: log.map((s) => ({ ...s, node: ids.get(s.node) })), k });
  });
  return snaps;
}
class BtDelete extends Figure {
  build() {
    const svg = this.svgRoot(600, 290, 'Deleting keys from a B-tree: a leaf that drops below the minimum borrows a key through its parent from a sibling, or merges with a sibling, which can shrink the tree');
    this.head = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    this.g = S('g', {}, svg);
    this.steps = [0, 1, 2].map((i) => S('text', { x: 20, y: 232 + i * 17, class: 't2', 'font-size': 12.5 }, svg));
    this.snaps = delSnaps();
    pills(this, this.snaps.map((s, i) => [i, i ? `delete ${s.k}` : 'start']), 0, (v) => this.paint(v));
    this.paint(0);
  }
  paint(k) {
    const s = this.snaps[k], T = { t: 2, root: s.root }, L = layout(T, 20, 560, 54, 56), mark = new Map();
    s.log.forEach((x) => { if (x.node) mark.set(x.node, x.kind === 'merge' || x.kind === 'borrow' || x.kind === 'shrink' ? 'side' : 'main'); });
    drawTree(this.g, T, L, mark);
    this.head.textContent = k ? `DELETE ${s.k} · ${depth(T)} LEVELS` : `t = 2 · EVERY NODE BUT THE ROOT KEEPS AT LEAST ${T.t - 1} KEY`;
    this.steps.forEach((t, i) => { t.textContent = s.log[i] ? (i ? '→ ' : '') + s.log[i].text : ''; });
  }
}

// ── fig 4 · range scans in a B+ tree ─────────────────────────────────────────
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
    const edge = (p, c, i, cw) => S('line', { x1: p.x + i * cw + 1, y1: p.y + 18, x2: c.x + c.w / 2, y2: c.y, class: 's-ink3', 'stroke-width': 1.1 }, svg);
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

// ── fig 5 · how full the pages end up ───────────────────────────────────────
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
    const tip = tooltip(svg);
    this.bars = CASES.map(([o, p, name], i) => {
      const { leaves, fill: f } = fill(o, p), y = 52 + i * 46;
      const r = S('rect', { x: X(0), y, width: 0, height: 22, rx: 3, class: i === 2 ? 'f-green' : 'f-ink3' }, svg);
      S('text', { x: X(0) + 8, y: y + 15, class: i === 2 ? 'f-bg' : 't', 'font-size': 12, text: `${name}: ${Math.round(f * 100)}%` }, svg);
      hit(svg, tip, X(f) - 6, y + 11, name, `${leaves} leaves for 20,000 keys, ${(f * 100).toFixed(1)}% full`);
      return { r, f };
    });
    entrance(this, (k) => this.bars.forEach(({ r, f }) => attr(r, { width: (X(f) - X(0)) * k })), 900);
  }
}

define({ 'bt-height': BtHeight, 'bt-insert': BtInsert, 'bt-delete': BtDelete, 'bt-range': BtRange, 'bt-fill': BtFill });
