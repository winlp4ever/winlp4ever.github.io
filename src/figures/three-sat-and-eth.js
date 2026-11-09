// Figures for "3-SAT and the exponential time hypothesis".
import { S, attr, op, seg, ease, inout, lerp, CW, Figure, define, entrance, pills, tooltip, hit, tween, handArrow, drawOn } from './core.js';

const lit = (l) => (l < 0 ? '¬' : '') + 'xyz'[Math.abs(l) - 1];

// ── fig 1 · each clause rules out one assignment ───────────────────────────
// A clause is a list of signed variable numbers (1 = x, 2 = y, 3 = z). It is false
// on exactly one assignment: the one that makes every literal false.
const FOUR = [[1, 2, 3], [-1, -2, 3], [1, -2, -3], [-1, 2, -3]];
const EIGHT = [0, 1, 2, 3, 4, 5, 6, 7].map((m) => [1, 2, 3].map((v, i) => (m >> (2 - i) & 1 ? -v : v)));
const val = (a, l) => (a[Math.abs(l) - 1] === 1) === l > 0;
const sat = (a, c) => c.some((l) => val(a, l));
const killed = (c) => c.map((l) => (l > 0 ? 0 : 1)).join('');
const bits = (k) => [k >> 2 & 1, k >> 1 & 1, k & 1];

class SatCube extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'The eight assignments of three variables as cube corners, with the clauses that rule them out');
    this.P = (b) => [372 + 132 * b[0] + 62 * b[1], 92 - 44 * b[1] + 132 * b[2]];
    for (let k = 0; k < 8; k++) for (let j = 0; j < 3; j++) {
      const b = bits(k); if (b[j]) continue;
      const c = b.slice(); c[j] = 1; const [x1, y1] = this.P(b), [x2, y2] = this.P(c);
      S('line', { x1, y1, x2, y2, class: 's-rule', 'stroke-width': 1.4 }, svg);
    }
    S('text', { x: 20, y: 26, class: 'sl', 'font-size': 11, text: 'CLAUSES' }, svg);
    this.rows = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const g = S('g', {}, svg), y = 52 + i * 30;
      const mark = S('circle', { cx: 28, cy: y - 4, r: 5 }, g);
      const t = S('text', { x: 44, y, class: 't', 'font-size': 14 }, g);
      const k = S('text', { x: 268, y, class: 't3', 'font-size': 11.5, 'text-anchor': 'end' }, g);
      return { g, mark, t, k };
    });
    this.corners = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
      const b = bits(k), [x, y] = this.P(b), g = S('g', { style: 'cursor:pointer' }, svg);
      const ring = S('circle', { cx: x, cy: y, r: 21, class: 'f-none s-ink', 'stroke-width': 2 }, g);
      const c = S('circle', { cx: x, cy: y, r: 15, 'stroke-width': 1.2 }, g);
      const cross = S('path', { d: `M${x - 6} ${y - 6}l12 12M${x + 6} ${y - 6}l-12 12`, class: 's-ink3', 'stroke-width': 1.6 }, g);
      S('text', { x, y: y + (b[2] ? 40 : -26), class: 't2', 'font-size': 12, 'text-anchor': 'middle', text: b.join('') }, g);
      g.addEventListener('click', () => { this.sel = k; this.draw(); });
      return { ring, c, cross };
    });
    this.note = S('text', { x: 20, y: 316, class: 't2', 'font-size': 12.5 }, svg);
    this.mode = FOUR; this.sel = 4;
    pills(this, [['4', '4 clauses'], ['8', 'all 8 clauses']], '4', (m) => { this.mode = m === '4' ? FOUR : EIGHT; this.draw(); });
    this.draw();
  }
  draw() {
    const cls = this.mode, a = bits(this.sel), dead = new Set(cls.map(killed));
    this.rows.forEach((r, i) => {
      const c = cls[i]; op(r.g, c ? 1 : 0); if (!c) return;
      r.t.textContent = '(' + c.map(lit).join(' ∨ ') + ')';
      r.k.textContent = 'rules out ' + killed(c);
      attr(r.mark, { class: sat(a, c) ? 'f-green' : 'f-ochre' });
    });
    this.corners.forEach((n, k) => {
      const b = bits(k).join(''), d = dead.has(b);
      attr(n.c, { class: d ? 'f-panel s-ink3' : 'f-green s-green' }); op(n.cross, d ? 1 : 0); op(n.ring, k === this.sel ? 1 : 0);
    });
    const ok = cls.filter((c) => sat(a, c)).length, left = 8 - dead.size;
    this.note.textContent = `x=${a[0]} y=${a[1]} z=${a[2]}: ${ok} of ${cls.length} clauses true · ${left ? left + ' solutions left' : 'no solution left'}`;
  }
}

// ── fig 2 · the hard region ────────────────────────────────────────────────
// My run (phase.py): [m/n, share satisfiable, median DPLL branches], 200 random formulas per point.
const PHASE = {
  20: [[2.0,1.0,7],[2.1,1.0,7],[2.2,1.0,7],[2.3,1.0,7],[2.4,1.0,7],[2.5,1.0,7],[2.6,1.0,7],[2.7,1.0,6.5],[2.8,1.0,6],[2.9,1.0,6],[3.0,1.0,6],[3.1,1.0,6],[3.2,1.0,6],[3.3,0.995,6],[3.4,0.98,6],[3.5,0.98,7],[3.6,0.985,6],[3.7,0.965,6],[3.8,0.925,6],[3.9,0.85,7],[4.0,0.885,7],[4.1,0.84,7],[4.2,0.73,7],[4.3,0.735,8],[4.4,0.63,8],[4.5,0.56,8],[4.6,0.415,8],[4.7,0.43,8],[4.8,0.42,7],[4.9,0.345,7],[5.0,0.265,8],[5.1,0.305,7],[5.2,0.175,7],[5.3,0.165,7],[5.4,0.13,7],[5.5,0.11,7],[5.6,0.115,7],[5.7,0.09,7],[5.8,0.04,7],[5.9,0.025,6],[6.0,0.035,6],[6.1,0.015,6],[6.2,0.035,6],[6.3,0.04,6],[6.4,0.005,6],[6.5,0.01,6],[6.6,0.035,6],[6.7,0.005,6],[6.8,0.0,6],[6.9,0.01,5],[7.0,0.005,6]],
  40: [[2.0,1.0,14],[2.1,1.0,14],[2.2,1.0,14],[2.3,1.0,13],[2.4,1.0,13],[2.5,1.0,12],[2.6,1.0,12],[2.7,1.0,11],[2.8,1.0,11],[2.9,1.0,12],[3.0,1.0,11],[3.1,1.0,11],[3.2,1.0,11],[3.3,1.0,11],[3.4,1.0,11],[3.5,1.0,11],[3.6,0.99,11],[3.7,0.935,12],[3.8,0.965,13],[3.9,0.895,16],[4.0,0.865,17],[4.1,0.79,18],[4.2,0.675,24],[4.3,0.575,23],[4.4,0.57,24],[4.5,0.44,26],[4.6,0.335,24.5],[4.7,0.3,24],[4.8,0.2,25],[4.9,0.12,25],[5.0,0.115,23],[5.1,0.07,21],[5.2,0.04,21],[5.3,0.035,20],[5.4,0.015,20.5],[5.5,0.025,20],[5.6,0.01,18],[5.7,0.005,18],[5.8,0.02,17],[5.9,0.0,17],[6.0,0.0,16.5],[6.1,0.0,16],[6.2,0.0,15.5],[6.3,0.0,15.5],[6.4,0.0,15],[6.5,0.0,14],[6.6,0.005,13],[6.7,0.0,13],[6.8,0.0,13],[6.9,0.0,13],[7.0,0.0,13]],
  60: [[2.0,1.0,20],[2.1,1.0,20],[2.2,1.0,20],[2.3,1.0,19],[2.4,1.0,18],[2.5,1.0,18],[2.6,1.0,17],[2.7,1.0,16],[2.8,1.0,16],[2.9,1.0,16],[3.0,1.0,15],[3.1,1.0,16],[3.2,1.0,15],[3.3,1.0,16],[3.4,1.0,16],[3.5,1.0,17],[3.6,1.0,18],[3.7,0.99,20],[3.8,0.955,27],[3.9,0.925,26],[4.0,0.88,32],[4.1,0.775,56],[4.2,0.66,75],[4.3,0.52,70],[4.4,0.405,75],[4.5,0.315,88],[4.6,0.21,80.5],[4.7,0.11,73.5],[4.8,0.09,73.5],[4.9,0.035,66.5],[5.0,0.05,63],[5.1,0.035,59.5],[5.2,0.015,58],[5.3,0.005,51.5],[5.4,0.01,51],[5.5,0.0,47],[5.6,0.0,45.5],[5.7,0.0,42],[5.8,0.0,42],[5.9,0.0,40],[6.0,0.0,36],[6.1,0.0,37],[6.2,0.0,35],[6.3,0.0,32],[6.4,0.0,33],[6.5,0.0,31],[6.6,0.0,29],[6.7,0.0,29],[6.8,0.0,28],[6.9,0.0,28],[7.0,0.0,26]],
};
class SatPhase extends Figure {
  build() {
    const svg = this.svgRoot(600, 414, 'Share of satisfiable random 3-SAT formulas and median solver branches against the clause-to-variable ratio');
    const X = (a) => 70 + (a - 2) / 5 * 490, A = (p) => 180 - p * 130, B = (b) => 370 - Math.log10(Math.max(1, b)) / 2 * 130;
    S('text', { x: 70, y: 22, class: 'sl', 'font-size': 11, text: 'SHARE SATISFIABLE' }, svg);
    S('text', { x: 70, y: 222, class: 'sl', 'font-size': 11, text: 'MEDIAN SOLVER BRANCHES (LOG SCALE)' }, svg);
    [0, 0.5, 1].forEach((p) => { S('line', { x1: 70, x2: 560, y1: A(p), y2: A(p), class: 's-rule', 'stroke-width': 1 }, svg); S('text', { x: 62, y: A(p) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: p * 100 + '%' }, svg); });
    [1, 10, 100].forEach((b) => { S('line', { x1: 70, x2: 560, y1: B(b), y2: B(b), class: 's-rule', 'stroke-width': 1 }, svg); S('text', { x: 62, y: B(b) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: b }, svg); });
    [2, 3, 4, 5, 6, 7].forEach((a) => S('text', { x: X(a), y: 392, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: a }, svg));
    S('text', { x: 560, y: 410, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: 'clauses per variable →' }, svg);
    const xc = X(4.267);
    S('line', { x1: xc, x2: xc, y1: 34, y2: 372, class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    S('text', { x: xc + 6, y: 44, class: 't3', 'font-size': 11, text: '4.267, the predicted threshold' }, svg);
    this.lines = Object.entries(PHASE).map(([n, d]) => {
      const cls = n === '60' ? 's-green' : n === '40' ? 's-ink2' : 's-ink3';
      const pa = S('path', { d: 'M' + d.map((r) => `${X(r[0]).toFixed(1)} ${A(r[1]).toFixed(1)}`).join('L'), class: 'f-none ' + cls, 'stroke-width': 2 }, svg);
      const pb = S('path', { d: 'M' + d.map((r) => `${X(r[0]).toFixed(1)} ${B(r[2]).toFixed(1)}`).join('L'), class: 'f-none ' + cls, 'stroke-width': 2 }, svg);
      const top = d.reduce((m, r) => (r[2] > m[2] ? r : m));
      const lab = S('text', { x: X(top[0]) + 8, y: B(top[2]) - 6, class: n === '60' ? 't' : 't2', 'font-size': 11.5, text: `n = ${n}, peak ${top[2]}` }, svg);
      return { pa, pb, lab };
    });
    const ha = S('path', { d: handArrow(262, 255, X(4.45) - 10, B(88) + 4, -0.3), class: 'f-none s-ink2', 'stroke-width': 1.4 }, svg);
    const ht = S('text', { x: 84, y: 262, class: 'hand', 'font-size': 17, text: 'hardest near the drop' }, svg);
    entrance(this, (k) => {
      this.lines.forEach((l, i) => { const kk = seg(k, i * 0.15, 0.7 + i * 0.15); drawOn(l.pa, kk); drawOn(l.pb, kk); op(l.lab, seg(k, 0.8, 1)); });
      drawOn(ha, seg(k, 0.85, 1)); op(ht, seg(k, 0.85, 1));
    }, 1600);
  }
}

// ── fig 3 · the best guaranteed running time ───────────────────────────────
// [year, base c in c^n, deterministic?, who]. The y axis is log2(c): time 2^(y·n).
const RECORDS = [
  [1985, '1.619', 1, 'Monien–Speckenmeyer'],
  [1997, '1.587', 0, 'Paturi–Pudlák–Zane'],
  [1998, '1.364', 0, 'PPSZ'],
  [1999, '1.334', 0, 'Schöning'],
  [2004, '1.324', 0, 'Iwama–Tamaki'],
  [2011, '1.30704', 0, 'Hertli'],
  [2011, '1.334', 1, 'Moser–Scheder'],
  [2018, '1.32793', 1, 'Liu'],
  [2021, '1.307031594', 0, 'Scheder, lifted to general formulas'],
  [2026, '1.307031578', 0, 'Jiang–Cai'],
];
class SatRecords extends Figure {
  build() {
    const svg = this.svgRoot(600, 340, 'Record exponents for 3-SAT by year, falling from n to about 0.386 n, then to o(n) in October 2026');
    const X = (y) => 70 + (y - 1980) / 47 * 480, Y = (e) => 300 - e * 250;
    [0, 0.25, 0.5, 0.75, 1].forEach((e) => {
      S('line', { x1: 70, x2: 556, y1: Y(e), y2: Y(e), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 62, y: Y(e) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: e ? e + 'n' : '0' }, svg);
    });
    [1980, 1990, 2000, 2010, 2020].forEach((y) => S('text', { x: X(y), y: 322, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: y }, svg));
    S('text', { x: 70, y: 22, class: 'sl', 'font-size': 11, text: 'TIME 2^(y) ON THE WORST FORMULA' }, svg);
    S('text', { x: 90, y: Y(1) - 8, class: 't2', 'font-size': 11.5, text: 'brute force, 2^n' }, svg);
    // the best randomized record as a staircase
    let best = 1, d = `M${X(1980)} ${Y(1)}`;
    RECORDS.filter((r) => !r[2]).forEach(([y, c]) => { const e = Math.log2(+c); if (e < best) { d += `H${X(y)}V${Y(e)}`; best = e; } });
    d += `H${X(2026.8)}`;
    this.stair = S('path', { d, class: 'f-none s-ink3', 'stroke-width': 1.5 }, svg);
    S('text', { x: X(2005), y: Y(0.405) - 12, class: 't3', 'font-size': 12, text: 'best randomized record' }, svg);
    const tip = tooltip(svg);
    this.dots = RECORDS.map(([y, c, det, who]) => {
      const x = X(y), yy = Y(Math.log2(+c));
      const dot = S('circle', { cx: x, cy: yy, r: 4.5, class: det ? 'f-panel s-ink' : 'f-ink', 'stroke-width': 1.6 }, svg);
      hit(svg, tip, x, yy, `${who}, ${y}`, `${c}^n · ${det ? 'deterministic' : 'randomized'}`);
      return dot;
    });
    const key = S('g', { transform: 'translate(330 56)' }, svg);
    S('circle', { cx: 0, cy: 0, r: 4.5, class: 'f-ink' }, key); S('text', { x: 10, y: 4, class: 't2', 'font-size': 11, text: 'randomized' }, key);
    S('circle', { cx: 110, cy: 0, r: 4.5, class: 'f-panel s-ink', 'stroke-width': 1.6 }, key); S('text', { x: 120, y: 4, class: 't2', 'font-size': 11, text: 'deterministic' }, key);
    // October 2026: the exponent itself goes to zero as n grows
    const x26 = X(2026.6);
    this.drop = S('path', { d: `M${x26} ${Y(0.386) + 10}V${Y(0.02)}M${x26 - 5} ${Y(0.02) - 7}l5 7l5 -7`, class: 'f-none s-green', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, svg);
    this.dropT = S('text', { x: x26 - 8, y: Y(0.12), class: 't', 'font-size': 12, 'text-anchor': 'end', text: 'Oct 2026: 2^(n/√log n), o(n)' }, svg);
    this.hand = S('text', { x: X(1999), y: Y(0.22), class: 'hand', 'font-size': 17, text: 'ETH: the floor stays above 0' }, svg);
    entrance(this, (k) => {
      drawOn(this.stair, seg(k, 0, 0.7));
      this.dots.forEach((dt, i) => op(dt, seg(k, i * 0.06, i * 0.06 + 0.15)));
      drawOn(this.drop, seg(k, 0.75, 1)); op(this.dropT, seg(k, 0.85, 1)); op(this.hand, seg(k, 0.6, 0.8));
    }, 1800);
  }
}

// ── fig 4 · the wishful case ───────────────────────────────────────────────
// Eight variables, 1–4 in the green group and 5–8 in the ochre group. Counts are brute force.
const WISH = [[1, -2, 3], [-3, 4, -1], [2, 4, -3], [5, -6, 7], [6, 7, -8], [-5, 6, 8]];
const REAL = [[1, -2, 3], [-3, 4, -5], [2, 4, -3], [5, -6, 7], [-2, 7, -8], [-5, 6, 8]];
const count = (cls, vars) => {
  let n = 0;
  for (let m = 0; m < 1 << vars.length; m++) {
    const v = {}; vars.forEach((x, i) => { v[x] = m >> i & 1; });
    if (cls.every((c) => c.some((l) => (v[Math.abs(l)] === 1) === l > 0))) n++;
  }
  return n;
};
const grp = (v) => (v <= 4 ? 0 : 1);
class SatSplit extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Eight variables in two groups; in the wishful case no clause crosses between groups');
    this.VX = (v) => 60 + (v - 1) * 64 + (v > 4 ? 30 : 0);
    S('text', { x: this.VX(1) - 18, y: 24, class: 'sl', 'font-size': 11, text: 'GROUP 1' }, svg);
    S('text', { x: this.VX(5) - 18, y: 24, class: 'sl', 'font-size': 11, text: 'GROUP 2' }, svg);
    this.edges = S('g', {}, svg);
    for (let v = 1; v <= 8; v++) {
      S('circle', { cx: this.VX(v), cy: 60, r: 17, class: grp(v) ? 'f-ochre' : 'f-green', opacity: 0.85 }, svg);
      S('text', { x: this.VX(v), y: 65, class: 't', 'font-size': 13, 'text-anchor': 'middle', text: 'x' + v }, svg);
    }
    this.boxes = [0, 1, 2, 3, 4, 5].map((i) => {
      const x = 22 + i * 96, g = S('g', {}, svg);
      const r = S('rect', { x, y: 178, width: 86, height: 30, rx: 6, class: 'f-panel s-ink3', 'stroke-width': 1.2 }, g);
      const t = S('text', { x: x + 43, y: 198, class: 't', 'font-size': 11, 'text-anchor': 'middle' }, g);
      return { x: x + 43, r, t };
    });
    this.l1 = S('text', { x: 22, y: 250, class: 't', 'font-size': 13 }, svg);
    this.l2 = S('text', { x: 22, y: 274, class: 't2', 'font-size': 12 }, svg);
    pills(this, [['w', 'wishful case'], ['r', 'a real formula']], 'w', (m) => { this.mode = m; tween(this, (k) => this.draw(k)); });
    this.mode = 'w'; this.draw(1);
  }
  draw(k) {
    const cls = this.mode === 'w' ? WISH : REAL;
    this.edges.replaceChildren();
    cls.forEach((c, i) => {
      const b = this.boxes[i], cross = new Set(c.map((l) => grp(Math.abs(l)))).size > 1;
      b.t.textContent = c.map((l) => (l < 0 ? '¬' : '') + 'x' + Math.abs(l)).join('∨');
      attr(b.r, { class: cross ? 'f-panel s-ink' : 'f-panel s-ink3', 'stroke-width': cross ? 2.2 : 1.2, 'stroke-dasharray': cross ? '4 3' : 'none' });
      c.forEach((l) => {
        const v = Math.abs(l);
        S('line', { x1: b.x, y1: 178, x2: this.VX(v), y2: 77, class: cross ? 's-ink' : grp(v) ? 's-ochre' : 's-green', 'stroke-width': cross ? 1.6 : 1.2, opacity: cross ? k : 0.7 }, this.edges);
      });
    });
    const c1 = cls.filter((c) => c.every((l) => grp(Math.abs(l)) === 0)), c2 = cls.filter((c) => c.every((l) => grp(Math.abs(l)) === 1));
    const a = count(c1, [1, 2, 3, 4]), b = count(c2, [5, 6, 7, 8]), all = count(cls, [1, 2, 3, 4, 5, 6, 7, 8]);
    if (this.mode === 'w') {
      this.l1.textContent = `#F = ${a} × ${b} = ${all}: two counts over 2^4 assignments each`;
      this.l2.textContent = 'every clause stays inside one group, so the groups are independent';
    } else {
      this.l1.textContent = `#F = ${all}, and the two groups can no longer be counted apart`;
      this.l2.textContent = 'the dashed clauses read variables from both groups';
    }
  }
}

// ── fig 5 · back to zero ───────────────────────────────────────────────────
// A made-up polynomial. The algorithm knows values and derivatives at T = 1..4, not H(0).
const HC = [5.3652, -7.6838, 5.3616, -1.392, 0.12];
const Hf = (t, d = 0) => HC.reduce((s, c, i) => {
  if (i < d) return s; let f = 1; for (let j = 0; j < d; j++) f *= i - j;
  return s + c * f * Math.pow(t, i - d);
}, 0);
const taylor = (t0, t) => { let s = 0, f = 1; for (let d = 0; d <= 3; d++) { if (d) f *= d; s += Hf(t0, d) / f * Math.pow(t - t0, d); } return s; };
const STEP5 = 1.1;
class SatInterp extends Figure {
  constructor() { super(); this.duration = 10; this.poster = 10; }
  build() {
    const svg = this.svgRoot(600, 300, 'Values and derivatives of H at T = 1 to 4, interpolated back to T = 0');
    this.X = (t) => 70 + t / 4.5 * 500; this.Y = (v) => 250 - (v - 1) / 5 * 210;
    S('line', { x1: 70, x2: 580, y1: 262, y2: 262, class: 's-rule', 'stroke-width': 1 }, svg);
    S('line', { x1: this.X(0), x2: this.X(0), y1: 20, y2: 270, class: 's-rule', 'stroke-width': 1 }, svg);
    [0, 1, 2, 3, 4].forEach((t) => S('text', { x: this.X(t), y: 288, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: 'T = ' + t }, svg));
    const pts = []; for (let t = 4.4; t >= -0.001; t -= 0.02) pts.push(`${this.X(t).toFixed(1)} ${this.Y(Hf(t)).toFixed(1)}`);
    this.curve = S('path', { d: 'M' + pts.join('L'), class: 'f-none s-ink', 'stroke-width': 1.3 }, svg);
    this.jets = [1, 2, 3, 4].map((t0) => {
      const pts = []; for (let t = t0 - 0.38; t <= t0 + 0.381; t += 0.02) pts.push(`${this.X(t).toFixed(1)} ${this.Y(taylor(t0, t)).toFixed(1)}`);
      const p = S('path', { d: 'M' + pts.join('L'), class: 'f-none s-green', 'stroke-width': 3.5, 'stroke-linecap': 'round', opacity: 0 }, svg);
      const c = S('circle', { cx: this.X(t0), cy: this.Y(Hf(t0)), r: 5, class: 'f-green', opacity: 0 }, svg);
      return { p, c };
    });
    this.q = S('text', { x: this.X(0) + 12, y: this.Y(Hf(0)) + 5, class: 't', 'font-size': 16, text: '?' }, svg);
    this.zero = S('circle', { cx: this.X(0), cy: this.Y(Hf(0)), r: 6, class: 'f-ink' }, svg);
    this.zt = S('text', { x: this.X(0) + 14, y: this.Y(Hf(0)) + 5, class: 't', 'font-size': 13, text: 'H(0) = #F, the number of solutions' }, svg);
    this.note = S('text', { x: 300, y: 26, class: 't2', 'font-size': 12.5, 'text-anchor': 'middle' }, svg);
    this.hand = S('text', { x: this.X(2.55), y: this.Y(3.35), class: 'hand', 'font-size': 17, text: 'value + derivatives' }, svg);
  }
  label(t) { return t < 1 ? 'unknown' : t < 1 + 4 * STEP5 ? `easy point ${Math.min(4, Math.floor((t - 1) / STEP5) + 1)}/4` : t < 8.6 ? 'interpolate' : 'read H(0)'; }
  render(t) {
    this.jets.forEach((j, i) => { const k = seg(t, 1 + i * STEP5, 1.6 + i * STEP5); op(j.c, k); op(j.p, k); });
    op(this.hand, seg(t, 2, 2.6));
    const kc = inout(seg(t, 6, 8.6)); drawOn(this.curve, kc); op(this.curve, kc > 0 ? 1 : 0);
    op(this.q, 1 - seg(t, 8.4, 8.8)); op(this.zero, seg(t, 8.6, 9)); op(this.zt, seg(t, 8.8, 9.3));
    this.note.textContent = t < 1 ? 'H(0) counts the solutions, but it is the hard point' : t < 6 ? 'at T = 1…4 the formula almost splits: compute H and its derivatives there' : 'fit the one low-degree polynomial that matches them all';
  }
}

// ── fig 6 · row choice and column choice ───────────────────────────────────
class SatRect extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'A rectangle of the grid: two diagonals rewritten as a row choice plus a column choice');
    const C = { a: [80, 96, 'x'], a2: [240, 96, 'y'], b: [80, 236, 'u'], b2: [240, 236, 'v'] };
    this.C = C;
    this.blobs = S('g', {}, svg);
    this.lines = S('g', {}, svg);
    Object.values(C).forEach(([x, y, n]) => {
      S('circle', { cx: x, cy: y, r: 20, class: 'f-panel s-ink', 'stroke-width': 1.6 }, svg);
      S('text', { x, y: y + 5, class: 't', 'font-size': 15, 'text-anchor': 'middle', text: n }, svg);
    });
    S('text', { x: 20, y: 26, class: 'sl', 'font-size': 11, text: 'ONE RECTANGLE OF THE GRID, ONE 3-BIT BLOCK' }, svg);
    this.ttl = S('text', { x: 330, y: 70, class: 't', 'font-size': 14 }, svg);
    this.sub = S('text', { x: 330, y: 92, class: 't2', 'font-size': 12 }, svg);
    S('text', { x: 330, y: 140, class: 'sl', 'font-size': 11, text: 'BITS BETWEEN MERGED PARTS' }, svg);
    this.cost = S('text', { x: 330, y: 186, class: 't', 'font-size': 40 }, svg);
    this.why = S('text', { x: 330, y: 212, class: 't2', 'font-size': 12 }, svg);
    S('text', { x: 20, y: 296, class: 't2', 'font-size': 12, text: 'per block, rows merged + columns merged: diagonals 6 + 6 = 12 bits,' }, svg);
    S('text', { x: 20, y: 316, class: 't2', 'font-size': 12, text: 'choices 3 + 6 + 2 of bookkeeping = 11, so the cheaper merge ≤ 11/12' }, svg);
    this.hand = S('text', { x: 330, y: 262, class: 'hand', 'font-size': 17, text: '2 × diagonals = row + column' }, svg);
    this.mode = 'd'; this.merge = 'r';
    pills(this, [['d', 'two diagonals'], ['r', 'row choice'], ['c', 'column choice']], 'd', (m) => { this.mode = m; this.draw(); });
    pills(this, [['r', 'merge rows'], ['c', 'merge columns']], 'r', (m) => { this.merge = m; this.draw(); });
    this.draw();
  }
  draw() {
    const { a, a2, b, b2 } = this.C, L = this.lines, B = this.blobs;
    L.replaceChildren(); B.replaceChildren();
    const ln = (p, q, label, dx = 0, dy = -8) => {
      S('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: 's-ink', 'stroke-width': 2 }, L);
      S('text', { x: (p[0] + q[0]) / 2 + dx, y: (p[1] + q[1]) / 2 + dy, class: 't', 'font-size': 12.5, 'text-anchor': 'middle', text: label }, L);
    };
    const hyper = () => {
      [a, a2, b, b2].forEach((p) => S('line', { x1: p[0], y1: p[1], x2: 160, y2: 166, class: 's-green', 'stroke-width': 2.4 }, L));
      S('circle', { cx: 160, cy: 166, r: 5, class: 'f-green' }, L);
    };
    const rows = this.merge === 'r';
    (rows ? [[a, a2], [b, b2]] : [[a, b], [a2, b2]]).forEach(([p, q]) => S('rect', {
      x: Math.min(p[0], q[0]) - 32, y: Math.min(p[1], q[1]) - 32, width: Math.abs(q[0] - p[0]) + 64, height: Math.abs(q[1] - p[1]) + 64, rx: 32, class: 'f-ink3', opacity: 0.14,
    }, B));
    let cost, why;
    if (this.mode === 'd') {
      ln(a, b2, 'x = v', -38, -6); ln(a2, b, 'y = u', 38, -6);
      this.ttl.textContent = 'two diagonals'; this.sub.textContent = '[x = v] · [y = u]';
      cost = 6; why = 'both diagonals cross: 3 + 3 bits';
    } else if (this.mode === 'r') {
      hyper(); ln(a, a2, 'σ(x, y)', 0, -12); ln(b, b2, 'σ(v, u)', 0, 24);
      this.ttl.textContent = 'row choice'; this.sub.textContent = '[x⊕y⊕u⊕v = 0] · σ(x,y) σ(v,u)';
      cost = rows ? 3 : 6; why = rows ? 'only x⊕y has to equal u⊕v' : 'row edges cross columns: 6 bits';
    } else {
      hyper(); ln(a, b, 'σ(x, u)', -42, 4); ln(a2, b2, 'σ(v, y)', 42, 4);
      this.ttl.textContent = 'column choice'; this.sub.textContent = '[x⊕y⊕u⊕v = 0] · σ(x,u) σ(v,y)';
      cost = rows ? 6 : 3; why = rows ? 'column edges cross rows: 6 bits' : 'only x⊕u has to equal y⊕v';
    }
    this.cost.textContent = cost; this.why.textContent = why;
    attr(this.cost, { class: cost === 3 ? 't' : 't3' });
  }
}

define({ 'sat-cube': SatCube, 'sat-phase': SatPhase, 'sat-records': SatRecords, 'sat-split': SatSplit, 'sat-interp': SatInterp, 'sat-rect': SatRect });
