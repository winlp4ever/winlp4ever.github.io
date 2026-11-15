import { S, H, attr, op, rng, pills, stepper, Figure, define } from './core.js'

// Values for figs 1-4: sixteen small seeded integers.
const r0 = rng(21), A = Array.from({ length: 16 }, () => 1 + Math.floor(r0() * 9));

// A range control: two sliders for l and r inside the figure's control bar.
function rangeCtl(fig, n, l, r, on) {
  const bar = fig.querySelector('.fc') || H('div', { class: 'fc' }, fig);
  fig.idleText = 'interactive';
  const mk = (name, v) => {
    const lab = H('label', { class: 'pill', text: name + ' ' }, bar);
    const out = H('span', { text: v }, lab);
    const s = H('input', { type: 'range', min: 0, max: n - 1, value: v, 'aria-label': name }, bar);
    return { s, out };
  };
  const a = mk('l', l), b = mk('r', r);
  const go = (src) => {
    let x = +a.s.value, y = +b.s.value;
    if (x > y) { if (src === a) b.s.value = y = x; else a.s.value = x = y; }
    a.out.textContent = x; b.out.textContent = y; on(x, y);
  };
  a.s.oninput = () => go(a); b.s.oninput = () => go(b);
  go(a);
}

// Heap layout of a segment tree over n = 2^k leaves: node i covers [lo, hi].
function treeNodes(n, x0, w, y0, dy) {
  const out = [];
  const rec = (i, lo, hi, d) => {
    out[i] = { i, lo, hi, d, x: x0 + ((lo + hi + 1) / 2) * (w / n), y: y0 + d * dy };
    if (lo < hi) { const m = (lo + hi) >> 1; rec(2 * i, lo, m, d + 1); rec(2 * i + 1, m + 1, hi, d + 1); }
  };
  rec(1, 0, n - 1, 0);
  return out;
}
function drawTree(svg, nodes, bw, labels = true) { // labels: leaf indices under the leaves
  if (labels) nodes.forEach((o) => { if (o && o.lo === o.hi) S('text', { x: o.x, y: o.y + 26, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: o.lo }, svg); });
  const eg = S('g', {}, svg);
  nodes.forEach((o) => { if (o && o.i > 1) { const p = nodes[o.i >> 1]; S('line', { x1: p.x, y1: p.y + 11, x2: o.x, y2: o.y - 11, class: 's-rule', 'stroke-width': 1.2 }, eg); } });
  return nodes.map((o) => {
    if (!o) return null;
    const g = S('g', { transform: `translate(${o.x} ${o.y})` }, svg);
    const box = S('rect', { x: -bw / 2, y: -11, width: bw, height: 22, rx: 5, 'stroke-width': 1.4 }, g);
    const txt = S('text', { y: 4, class: 't', 'font-size': 11, 'text-anchor': 'middle' }, g);
    return { g, box, txt };
  });
}

// ── fig 1 · buckets (sqrt decomposition) ─────────────────────────────────────
class SgBuckets extends Figure {
  build() {
    const svg = this.svgRoot(600, 250, 'Sixteen numbers in four buckets of four; a range sum adds whole-bucket sums for the buckets inside the range and single numbers at the two ragged ends');
    const X = (i) => 44 + i * 33;
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: '16 NUMBERS IN 4 BUCKETS · EACH BUCKET KEEPS ITS SUM' }, svg);
    this.bk = [0, 1, 2, 3].map((b) => {
      const box = S('rect', { x: X(b * 4) - 3, y: 66, width: 4 * 33 - 2, height: 60, rx: 8, 'stroke-width': 1.4 }, svg);
      const sum = A.slice(b * 4, b * 4 + 4).reduce((s, v) => s + v, 0);
      const t = S('text', { x: X(b * 4) + 64, y: 86, class: 't2', 'font-size': 12, 'text-anchor': 'middle', text: `sum ${sum}` }, svg);
      return { box, t };
    });
    this.cells = A.map((v, i) => {
      const c = S('rect', { x: X(i), y: 96, width: 26, height: 24, rx: 4, 'stroke-width': 1.2 }, svg);
      S('text', { x: X(i) + 13, y: 112, class: 't', 'font-size': 12, 'text-anchor': 'middle', text: v }, svg);
      S('text', { x: X(i) + 13, y: 140, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: i }, svg);
      return c;
    });
    this.out = [0, 1].map((i) => S('text', { x: 20, y: 186 + i * 24, class: i ? 't2' : 't', 'font-size': 13.5 }, svg));
    rangeCtl(this, 16, 2, 13, (l, r) => this.paint(l, r));
  }
  paint(l, r) {
    let whole = 0, loose = 0, sum = 0;
    this.bk.forEach(({ box }, b) => {
      const full = l <= b * 4 && b * 4 + 3 <= r;
      if (full) { whole++; sum += A.slice(b * 4, b * 4 + 4).reduce((s, v) => s + v, 0); }
      attr(box, { class: full ? 'f-none s-green' : 'f-none s-rule' });
    });
    this.cells.forEach((c, i) => {
      const inR = i >= l && i <= r, inFull = inR && l <= (i & ~3) && (i | 3) <= r;
      if (inR && !inFull) { loose++; sum += A[i]; }
      attr(c, { class: inR && !inFull ? 'f-ochre s-ochre' : inR ? 'f-panel s-green' : 'f-none s-rule' });
      op(c, inR && !inFull ? 0.55 : 1);
    });
    this.out[0].textContent = `sum of [${l}, ${r}] = ${sum}`;
    this.out[1].textContent = `${whole} bucket sums + ${loose} single numbers = ${whole + loose} reads (a plain loop reads ${r - l + 1})`;
  }
}

// ── fig 2 · a range query ────────────────────────────────────────────────────
const sums = (a) => { const n = a.length, t = []; const b = (i, lo, hi) => (t[i] = lo === hi ? a[lo] : b(2 * i, lo, (lo + hi) >> 1) + b(2 * i + 1, ((lo + hi) >> 1) + 1, hi)); b(1, 0, n - 1); return t; };
class SgQuery extends Figure {
  build() {
    const svg = this.svgRoot(600, 320, 'A segment tree over sixteen numbers; a range query uses the few nodes that fit inside the range and visits only the nodes on their way');
    this.N = treeNodes(16, 20, 560, 50, 50);
    this.T = sums(A);
    this.E = drawTree(svg, this.N, 30);
    this.E.forEach((e, i) => { if (e) e.txt.textContent = this.T[i]; });
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'EACH NODE STORES THE SUM OF ITS RANGE' }, svg);
    this.out = S('text', { x: 20, y: 312, class: 't2', 'font-size': 13 }, svg);
    rangeCtl(this, 16, 3, 12, (l, r) => { this.l = l; this.r = r; if (this.step) this.load(l, r); });
    this.step = stepper(this, (k) => this.paint(k));
    this.load(this.l, this.r);
  }
  load(l, r) { // the walk, one visit at a time, in the order the recursion makes them
    const visits = []; let total = 0;
    const q = (i, lo, hi) => {
      const rng = `[${lo}, ${hi}]`;
      if (r < lo || hi < l) { visits.push({ i, s: 'out', text: `node ${rng} misses [${l}, ${r}]: it adds 0 and the walk turns back`, total }); return 0; }
      if (l <= lo && hi <= r) { total += this.T[i]; visits.push({ i, s: 'use', text: `node ${rng} lies inside [${l}, ${r}]: add its stored sum ${this.T[i]}, total ${total}`, total }); return this.T[i]; }
      visits.push({ i, s: 'split', text: `node ${rng} is partly inside [${l}, ${r}]: ask both children`, total });
      const m = (lo + hi) >> 1;
      return q(2 * i, lo, m) + q(2 * i + 1, m + 1, hi);
    };
    const ans = q(1, 0, 15), used = visits.filter((v) => v.s === 'use').length;
    visits.push({ s: 'end', text: `sum [${l}, ${r}] = ${ans} · ${used} nodes used, ${visits.length} visited of 31 · a plain loop reads ${r - l + 1}` });
    this.visits = visits;
    this.step.set(visits.length, visits.length - 1); // open on the whole walk; step back to replay it
  }
  paint(k) {
    const st = [];
    this.visits.slice(0, k + 1).forEach((v) => { if (v.i) st[v.i] = v.s; });
    const cur = this.visits[k].i;
    this.E.forEach((e, i) => {
      if (!e) return;
      const s = st[i];
      attr(e.box, { class: (s === 'use' ? 'f-green ' : 'f-panel ') + (i === cur ? 's-ink' : s === 'use' ? 's-green' : s === 'split' ? 's-ink' : 's-rule'), 'stroke-dasharray': s === 'out' && i !== cur ? '3 3' : 'none', 'stroke-width': i === cur ? 2.8 : 1.4 });
      attr(e.txt, { class: s === 'use' ? 'f-bg' : 't' });
      op(e.g, s ? 1 : 0.35);
    });
    this.out.textContent = this.visits[k].text;
  }
}

// ── fig 3 · a point update ───────────────────────────────────────────────────
const UPD = { i: 5, v: 2 };
class SgUpdate extends Figure {
  constructor() { super(); this.duration = 7; this.loop = false; this.poster = 7; }
  build() {
    const svg = this.svgRoot(600, 320, `Setting a[${UPD.i}] to ${UPD.v}: the leaf changes, then each ancestor recomputes its sum from its two children, one level at a time up to the root`);
    this.N = treeNodes(16, 20, 560, 50, 50);
    const B = A.slice(); B[UPD.i] = UPD.v;
    this.before = sums(A); this.after = sums(B);
    this.E = drawTree(svg, this.N, 30);
    this.path = []; for (let i = 16 + UPD.i; i >= 1; i >>= 1) this.path.push(i); // leaf … root
    this.lab = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    this.out = S('text', { x: 20, y: 312, class: 't2', 'font-size': 13 }, svg);
  }
  label(t) { const k = this.step(t); return k < 0 ? 'before' : `level ${4 - Math.min(k, 4)}`; }
  step(t) { return t < 1 ? -1 : Math.min(Math.floor((t - 1) / 1.1), 4); }
  render(t) {
    const k = this.step(t);
    this.E.forEach((e, i) => {
      if (!e) return;
      const j = this.path.indexOf(i), done = j >= 0 && j <= k;
      e.txt.textContent = done ? this.after[i] : this.before[i];
      attr(e.box, { class: j === k ? 'f-green s-green' : done ? 'f-panel s-green' : 'f-panel s-rule' });
      attr(e.txt, { class: j === k ? 'f-bg' : 't' });
    });
    this.lab.textContent = `SET a[${UPD.i}] = ${UPD.v} (WAS ${A[UPD.i]})`;
    this.out.textContent = k < 0 ? 'the leaf and its 4 ancestors are the only nodes whose range contains index 5'
      : `${k + 1} of 5 nodes recomputed · each new sum = left child + right child`;
  }
}

// ── fig 4 · lazy propagation ─────────────────────────────────────────────────
// A real lazy tree (range add, range sum). Each op records the nodes it visited,
// where it parked a tag, and which tags it pushed down.
const OPS = [['add', 2, 11, 3], ['sum', 0, 5], ['add', 6, 13, 1], ['sum', 8, 8]];
// Frames for each operation: one per node visited (and one per tag pushed down),
// each with a copy of the sums and tags at that moment, then a closing frame.
function runLazy() {
  const n = 16, t = sums(A), tag = [];
  return OPS.map(([kind, l, r, v]) => {
    const frames = [], seen = [], park = [], push = [];
    const shot = (cur, text) => frames.push({ t: t.slice(), tag: tag.slice(), seen: seen.slice(), park: park.slice(), push: push.slice(), cur, text });
    const apply = (i, lo, hi, x) => { t[i] += x * (hi - lo + 1); if (lo < hi) tag[i] = (tag[i] || 0) + x; };
    const go = (i, lo, hi) => {
      seen.push(i);
      const rg = `[${lo}, ${hi}]`;
      if (r < lo || hi < l) { shot(i, `node ${rg} misses [${l}, ${r}]: nothing to do here`); return 0; }
      if (l <= lo && hi <= r) {
        if (kind === 'add') {
          apply(i, lo, hi, v); park.push(i);
          shot(i, `node ${rg} lies inside: its sum grows by ${v} × ${hi - lo + 1} = ${v * (hi - lo + 1)}` + (lo < hi ? `, and it keeps a +${tag[i]} tag for its children instead of visiting them` : ''));
          return 0;
        }
        shot(i, `node ${rg} lies inside: its sum ${t[i]} is already correct, use it`);
        return t[i];
      }
      if (tag[i]) {
        const m = (lo + hi) >> 1, x = tag[i];
        apply(2 * i, lo, m, x); apply(2 * i + 1, m + 1, hi, x); tag[i] = 0; push.push(i);
        shot(i, `node ${rg} is partly inside and has a +${x} tag: push it down first, so both children's sums catch up`);
      } else shot(i, `node ${rg} is partly inside: go down to both children`);
      const m = (lo + hi) >> 1;
      const s = go(2 * i, lo, m) + go(2 * i + 1, m + 1, hi);
      t[i] = t[2 * i] + t[2 * i + 1];
      return s;
    };
    shot(0, kind === 'add' ? `add ${v} to every number in [${l}, ${r}]` : `sum of [${l}, ${r}]`);
    const ans = go(1, 0, n - 1);
    shot(0, kind === 'add'
      ? `done: ${park.length} nodes took a +${v} tag and ${seen.length} were visited. On the way back up, each partly covered node recomputed its sum from its two children`
      : `sum [${l}, ${r}] = ${ans}: ${push.length} tag${push.length === 1 ? '' : 's'} pushed down on the way, ${seen.length} nodes visited`);
    return { kind, l, r, v, frames };
  });
}
class SgLazy extends Figure {
  build() {
    const svg = this.svgRoot(600, 336, 'A segment tree with lazy tags, step by step: a range add parks a tag on the few nodes covering the range, and a later operation pushes a tag one level down only where it has to pass through');
    this.N = treeNodes(16, 20, 560, 56, 50);
    this.E = drawTree(svg, this.N, 30);
    this.tags = this.N.map((o) => {
      if (!o) return null;
      const g = S('g', { transform: `translate(${o.x + 12} ${o.y - 14})` }, svg);
      S('rect', { x: -4, y: -9, width: 24, height: 14, rx: 7, class: 'f-ochre' }, g);
      const t = S('text', { x: 8, y: 2, class: 'f-bg', 'font-size': 10, 'text-anchor': 'middle', 'font-weight': 600 }, g);
      return { g, t };
    });
    this.lab = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11 }, svg);
    this.lines = [0, 1].map((i) => S('text', { x: 20, y: 310 + i * 17, class: 't2', 'font-size': 12.5 }, svg));
    this.ops = runLazy();
    pills(this, this.ops.map((o, i) => [i, o.kind === 'add' ? `add ${o.v} to [${o.l}, ${o.r}]` : `sum [${o.l}, ${o.r}]`]), 0, (v) => this.load(v));
    this.step = stepper(this, (k) => this.paint(this.ops[this.op].frames[k]));
    this.load(0);
  }
  load(i) { this.op = i; this.lab.textContent = `OPERATION ${i + 1} OF ${OPS.length} · EACH STARTS WHERE THE LAST ONE LEFT THE TREE`; this.step.set(this.ops[i].frames.length); }
  paint(s) {
    this.E.forEach((e, i) => {
      if (!e) return;
      e.txt.textContent = s.t[i];
      const parked = s.park.includes(i), seen = s.seen.includes(i), cur = i === s.cur;
      attr(e.box, { class: (parked ? 'f-green ' : 'f-panel ') + (cur ? 's-ink' : parked ? 's-green' : s.push.includes(i) ? 's-ochre' : seen ? 's-ink3' : 's-rule'), 'stroke-width': cur ? 2.8 : 1.4 });
      attr(e.txt, { class: parked ? 'f-bg' : 't' });
      op(e.g, !s.seen.length || seen ? 1 : 0.4);
      const tg = this.tags[i];
      op(tg.g, s.tag[i] ? 1 : 0); tg.t.textContent = s.tag[i] ? '+' + s.tag[i] : '';
    });
    const rows = wrap(s.text); this.lines.forEach((t, j) => { t.textContent = rows[j] || ''; });
  }
}
function wrap(text, max = 76) {
  const out = ['']; text.split(' ').forEach((w) => { if ((out.at(-1) + ' ' + w).trim().length > max) out.push(w); else out[out.length - 1] = (out.at(-1) + ' ' + w).trim(); });
  return out;
}

// ── fig 5 · the sum tree in prioritized experience replay ────────────────────
// Eight transitions with priorities; sample by drawing u in [0, total) and walking down.
const P = [3, 10, 1, 6, 2, 8, 4, 6];
class SgSumTree extends Figure {
  build() {
    const svg = this.svgRoot(600, 320, 'A sum tree over eight priorities; a number u between 0 and the total walks down, going left when u is below the left sum and right otherwise, and lands on a leaf with probability proportional to its priority');
    this.N = treeNodes(8, 40, 520, 54, 52);
    this.T = sums(P); this.total = this.T[1];
    this.trail = S('path', { class: 'f-none s-green', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.3 }, svg);
    this.E = drawTree(svg, this.N, 40, false);
    this.E.forEach((e, i) => { if (e) e.txt.textContent = this.T[i]; });
    // the leaves' priorities as one bar, each slice as wide as its share
    const bx = 40, bw = 520; let acc = 0;
    this.slices = P.map((p, j) => { const s = S('rect', { x: bx + acc / this.total * bw, y: 236, width: p / this.total * bw - 1.5, height: 14, rx: 3, class: 'f-rule2' }, svg); acc += p; return s; });
    S('text', { x: bx, y: 268, class: 't3', 'font-size': 10, text: '0' }, svg);
    S('text', { x: bx + bw, y: 268, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: this.total }, svg);
    this.mark = S('path', { class: 'f-none s-ink', 'stroke-width': 2 }, svg);
    this.lab = S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'EACH NODE = SUM OF ITS LEAVES · LEAVES = PRIORITIES' }, svg);
    this.out = [0, 1].map((i) => S('text', { x: 20, y: 290 + i * 20, class: i ? 't' : 't2', 'font-size': 12.5 }, svg));
    this.idleText = 'interactive';
    const bar = H('div', { class: 'fc' }, this);
    const lab = H('label', { class: 'pill', text: 'u = ' }, bar);
    this.uo = H('span', { text: '23' }, lab);
    const s = H('input', { type: 'range', min: 0, max: this.total - 0.5, step: 0.5, value: 23, 'aria-label': 'random number u' }, bar);
    s.oninput = () => this.paint(+s.value);
    this.paint(23);
  }
  paint(u) {
    this.uo.textContent = u;
    let i = 1, x = u; const path = [1], steps = [];
    while (i < 8) {
      const L = this.T[2 * i];
      if (x < L) { steps.push(`${x} < ${L} left`); i = 2 * i; } else { steps.push(`${x} ≥ ${L} right, u−${L}`); x -= L; i = 2 * i + 1; }
      path.push(i);
    }
    const leaf = i - 8;
    this.E.forEach((e, j) => {
      if (!e) return;
      const on = path.includes(j);
      attr(e.box, { class: j === i ? 'f-green s-green' : on ? 'f-panel s-green' : 'f-panel s-rule' });
      attr(e.txt, { class: j === i ? 'f-bg' : 't' });
    });
    attr(this.trail, { d: path.map((j, k) => `${k ? 'L' : 'M'}${this.N[j].x} ${this.N[j].y}`).join('') });
    this.slices.forEach((s, j) => attr(s, { class: j === leaf ? 'f-green' : 'f-rule2' }));
    const mx = 40 + u / this.total * 520;
    attr(this.mark, { d: `M${mx} 230 V256` });
    this.out[0].textContent = steps.join(' · ');
    this.out[1].textContent = `→ leaf ${leaf}, priority ${P[leaf]}, picked with chance ${P[leaf]}/${this.total}`;
  }
}

define({ 'sg-buckets': SgBuckets, 'sg-query': SgQuery, 'sg-update': SgUpdate, 'sg-lazy': SgLazy, 'sg-sumtree': SgSumTree });
