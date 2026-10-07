// Figures for "How Lean checks a proof".
import { S, H, attr, op, seg, inout, lerp, rng, Figure, define } from './core.js';

function pills(bar, items, value, on) {
  const btns = items.map(([v, label]) => {
    const b = H('button', { class: 'pill', type: 'button', text: label, 'aria-pressed': String(v === value) }, bar);
    b.onclick = () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); on(v); };
    return b;
  });
}
// keep leading spaces, and no ligatures: `=>` must stay two characters
const mono = (parent, x, y, text, cls = 't', size = 13) => S('text', { x, y, class: cls, 'font-size': size, text, style: 'white-space:pre;font-variant-ligatures:none' }, parent);

// ── fig 1 · goals, step by step ────────────────────────────────────────────
// The infoview for `0 + n = n`. Goal text follows Lean 4's display; spacing and
// case names vary a little between versions.
const CODE = [
  'theorem my_zero_add (n : Nat) : 0 + n = n := by',
  '  induction n with',
  '  | zero => rfl',
  '  | succ k ih => rw [← Nat.add_assoc, ih]',
];
// each stage: [cursor line, cursor column hint, goals]; a goal is [case, hypotheses, target]
const STAGES = [
  [0, 'after by', [['', ['n : Nat'], '0 + n = n']]],
  [1, 'induction', [['zero', [], '0 + 0 = 0'], ['succ', ['k : Nat', 'ih : 0 + k = k'], '0 + (k + 1) = k + 1']]],
  [2, 'rfl', [['succ', ['k : Nat', 'ih : 0 + k = k'], '0 + (k + 1) = k + 1']]],
  [3, '← Nat.add_assoc', [['succ', ['k : Nat', 'ih : 0 + k = k'], '0 + k + 1 = k + 1']]],
  [3, 'ih', []],
];
const STEP = 3.2;
class LnGoals extends Figure {
  constructor() { super(); this.duration = STAGES.length * STEP + 1; this.poster = this.duration; }
  build() {
    const svg = this.svgRoot(600, 330, 'A Lean proof by induction with the goal state after each line');
    S('rect', { x: 10, y: 10, width: 580, height: 104, rx: 10, class: 'f-panel s-rule', 'stroke-width': 1 }, svg);
    this.hl = S('rect', { x: 14, height: 22, width: 572, rx: 4, class: 'f-green', opacity: 0.14 }, svg);
    CODE.forEach((l, i) => mono(svg, 24, 34 + i * 22, l, 't', 12.5));
    S('text', { x: 14, y: 140, class: 'sl', 'font-size': 11, text: 'GOALS' }, svg);
    // one card per goal slot; filled per frame
    this.cards = [0, 1].map((i) => {
      const g = S('g', {}, svg);
      const r = S('rect', { x: 10 + i * 295, y: 150, width: 285, height: 120, rx: 10, class: 'f-panel s-ink3', 'stroke-width': 1.2 }, g);
      const lines = [0, 1, 2, 3].map((j) => mono(g, 24 + i * 295, 174 + j * 22, '', j === 0 ? 'sl' : 't', 12.5));
      return { g, r, lines };
    });
    this.none = S('text', { x: 300, y: 216, class: 't', 'font-size': 16, 'text-anchor': 'middle', text: 'No goals' }, svg);
    this.tick = S('path', { d: 'M222 204 l8 9 l16 -18', class: 'f-none s-green', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    this.note = S('text', { x: 14, y: 312, class: 't2', 'font-size': 12.5 }, svg);
  }
  label(t) { return `step ${Math.min(STAGES.length, Math.floor(t / STEP) + 1)}/${STAGES.length}`; }
  render(t) {
    const i = Math.min(STAGES.length - 1, Math.floor(t / STEP)), k = seg(t - i * STEP, 0, 0.6);
    const [line, what, goals] = STAGES[i], prev = STAGES[Math.max(0, i - 1)][0];
    attr(this.hl, { y: 34 + lerp(prev, line, inout(k)) * 22 - 16 });
    this.cards.forEach((c, j) => {
      const goal = goals[j];
      op(c.g, goal ? (i > 0 && !STAGES[i - 1][2][j] ? k : 1) : 0);
      if (!goal) return;
      const [cs, hyps, tgt] = goal;
      const rows = [cs ? 'case ' + cs : '', ...hyps, '⊢ ' + tgt];
      c.lines.forEach((l, n) => { l.textContent = rows[n] || ''; });
      c.lines[0].setAttribute('class', 'sl');
    });
    op(this.none, goals.length ? 0 : k); op(this.tick, goals.length ? 0 : k);
    this.note.textContent = [
      'Lean shows what is left to prove: the goal after ⊢',
      'induction splits the goal into a base case and a step',
      'rfl closes 0 + 0 = 0: both sides compute to the same number',
      'rewriting regroups 0 + (k + 1) as (0 + k) + 1',
      'rewriting with ih turns 0 + k into k, and k + 1 = k + 1 closes itself',
    ][i];
  }
}

// ── fig 2 · the kernel at the door ─────────────────────────────────────────
// A stand-in kernel: it evaluates small arithmetic claims and refuses any proof
// that depends on sorry or on an axiom outside the standard three.
const STD = ['propext', 'Quot.sound', 'Classical.choice'];
const CANDS = [
  { who: 'you', claim: '2 + 2 = 4', by: 'rfl', l: 2 + 2, r: 4, ax: [] },
  { who: 'an LLM', claim: '2 + 2 = 5', by: 'rfl', l: 2 + 2, r: 5, ax: [] },
  { who: 'a tactic', claim: '17 * 3 = 51', by: 'decide', l: 17 * 3, r: 51, ax: [] },
  { who: 'an agent', claim: 'no 5-colouring', by: 'sorry', ax: ['sorryAx'] },
  { who: 'an LLM', claim: '2 ^ 10 = 1024', by: 'native_decide', l: 2 ** 10, r: 1024, ax: ['Lean.ofReduceBool'] },
  { who: 'an LLM', claim: '12 - 15 = 0', by: 'rfl', l: Math.max(0, 12 - 15), r: 0, ax: [] },
];
function verdict(c) {
  const extra = c.ax.find((a) => !STD.includes(a));
  if (extra) return [false, 'uses ' + extra];
  return c.l === c.r ? [true, 'checked'] : [false, `${c.l} ≠ ${c.r}`];
}
const CYCLE = 2.4;
class LnKernel extends Figure {
  constructor() { super(); this.duration = CANDS.length * CYCLE + 0.6; this.poster = this.duration; }
  build() {
    const svg = this.svgRoot(600, 300, 'Candidate proofs from several sources arrive at a small kernel that accepts or rejects each one');
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'ANYONE CAN PROPOSE' }, svg);
    S('text', { x: 440, y: 24, class: 'sl', 'font-size': 11, text: 'ACCEPTED' }, svg);
    S('rect', { x: 300, y: 50, width: 52, height: 190, rx: 8, class: 'f-ink' }, svg);
    S('text', { x: 326, y: 150, class: 't', style: 'fill:var(--panel)', 'font-size': 12, 'text-anchor': 'middle', transform: 'rotate(-90 326 150)', text: 'KERNEL' }, svg);
    this.acc = S('g', {}, svg);
    this.cards = CANDS.map((c) => {
      const g = S('g', {}, svg), [ok, why] = verdict(c);
      S('rect', { x: -92, y: -24, width: 184, height: 48, rx: 8, class: 'f-panel s-ink3', 'stroke-width': 1.2 }, g);
      mono(g, -82, -5, c.claim, 't', 12.5);
      mono(g, -82, 14, 'by ' + c.by, 't3', 11.5);
      const mark = mono(g, 84, -5, ok ? '✓' : '✗', ok ? 't' : 't3', 14);
      mark.setAttribute('text-anchor', 'end'); if (ok) mark.style.fill = 'var(--green)';
      const w = mono(g, 84, 14, why, 't3', 10.5); w.setAttribute('text-anchor', 'end');
      const who = mono(svg, 20, 0, c.who, 't2', 12);
      const slot = CANDS.slice(0, CANDS.indexOf(c)).filter((d) => !verdict(d)[0]).length;
      const line = !ok && mono(svg, 20, 236 + slot * 20, `✗ ${c.claim}  (${why})`, 't3', 12);
      return { g, ok, mark, w, who, line };
    });
    S('text', { x: 20, y: 214, class: 'sl', 'font-size': 11, text: 'REJECTED' }, svg);
    this.count = S('text', { x: 580, y: 290, class: 't', 'font-size': 12.5, 'text-anchor': 'end' }, svg);
  }
  label(t) { return `${Math.min(CANDS.length, Math.floor(t / CYCLE) + 1)}/${CANDS.length}`; }
  render(t) {
    let accepted = 0, rejected = 0;
    this.cards.forEach((c, i) => {
      const u = t - i * CYCLE, k1 = inout(seg(u, 0, 1.1)), k2 = inout(seg(u, 1.3, 2.2));
      const done = u >= 1.3;
      let x = lerp(110, 200, k1), y = lerp(80, 145, k1), o = u < 0 ? 0 : 1;
      if (c.ok) { const slot = this.cards.slice(0, i).filter((d) => d.ok).length; x = lerp(x, 494, k2); y = lerp(145, 60 + slot * 54, k2); }
      else { y = lerp(y, 190, k2); o *= 1 - seg(u, 1.5, 2.1); }
      if (c.line) op(c.line, seg(u, 1.7, 2.2));
      attr(c.g, { transform: `translate(${x} ${y})` });
      op(c.g, o); op(c.mark, done ? 1 : 0); op(c.w, done ? 1 : 0);
      attr(c.who, { y: 44 }); op(c.who, u >= 0 && u < CYCLE ? 1 : 0);
      if (done) c.ok ? accepted++ : rejected++;
    });
    this.count.textContent = `accepted ${accepted} · rejected ${rejected}`;
  }
}

// ── fig 3 · statements that look right ─────────────────────────────────────
// Lean's total functions: on ℕ, 3 - 5 = 0; on ℝ, x / 0 = 0 and 0⁻¹ = 0.
const natSub = (a, b) => Math.max(0, a - b);
const rdiv = (a, b) => (b === 0 ? 0 : a / b);
const fmtn = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2)).replace('-', '−');
const STMTS = {
  sub: { code: '∀ n : ℕ, n - 1 + 1 = n', xs: [0, 1, 2, 3, 4, 5, 6, 7], lhs: (n) => natSub(n, 1) + 1, rhs: (n) => n, v: 'n', lhsTxt: 'n - 1 + 1',
    why: 'in ℕ, Lean defines 0 - 1 as 0, so the claim fails at n = 0' },
  div: { code: '∀ x : ℝ, x / x = 1', xs: [-2, -1, -0.5, 0, 0.5, 1, 2, 3], lhs: (x) => rdiv(x, x), rhs: () => 1, v: 'x', lhsTxt: 'x / x',
    why: 'Lean defines x / 0 as 0, so the claim fails at x = 0' },
  inv: { code: '∀ n : ℕ, (n : ℝ)⁻¹ ≤ 1', xs: [0, 1, 2, 3, 4, 5, 6, 7], lhs: (n) => rdiv(1, n), rhs: () => 1, le: true, v: 'n', lhsTxt: '(n : ℝ)⁻¹',
    why: 'true everywhere, but at n = 0 only because Lean defines 0⁻¹ as 0' },
};
class LnJunk extends Figure {
  build() {
    this.idleText = 'interactive';
    const svg = this.svgRoot(600, 210, 'A formal statement evaluated at several inputs using Lean conventions');
    this.code = mono(svg, 20, 30, '', 't', 15);
    this.cols = [...Array(8)].map((_, i) => {
      const x = 92 + i * 64;
      S('rect', { x: x - 28, y: 52, width: 56, height: 104, rx: 8, class: 'f-panel s-rule', 'stroke-width': 1 }, svg);
      const hl = S('rect', { x: x - 28, y: 52, width: 56, height: 104, rx: 8, class: 'f-none s-ochre', 'stroke-width': 2.2 }, svg);
      return { hl, a: S('text', { x, y: 76, class: 't3', 'font-size': 12, 'text-anchor': 'middle' }, svg), b: S('text', { x, y: 108, class: 't', 'font-size': 14, 'text-anchor': 'middle' }, svg), c: S('text', { x, y: 140, class: 't', 'font-size': 15, 'text-anchor': 'middle' }, svg) };
    });
    this.rowA = S('text', { x: 20, y: 76, class: 't3', 'font-size': 12 }, svg);
    this.rowB = S('text', { x: 20, y: 108, class: 't3', 'font-size': 12 }, svg);
    this.why = S('text', { x: 20, y: 192, class: 't2', 'font-size': 13 }, svg);
    pills(H('div', { class: 'fc' }, this), [['sub', 'n - 1 + 1 = n'], ['div', 'x / x = 1'], ['inv', '(n : ℝ)⁻¹ ≤ 1']], 'sub', (k) => this.show(k));
    this.show('sub');
  }
  show(key) {
    const s = STMTS[key];
    this.code.textContent = s.code;
    this.rowA.textContent = s.v; this.rowB.textContent = 'lhs';
    s.xs.forEach((x, i) => {
      const c = this.cols[i], l = s.lhs(x), ok = s.le ? l <= s.rhs(x) : l === s.rhs(x);
      c.a.textContent = s.v + '=' + fmtn(x); c.b.textContent = fmtn(l);
      c.c.textContent = ok ? '✓' : '✗'; c.c.style.fill = ok ? 'var(--green)' : 'var(--ochre)';
      op(c.hl, x === 0 ? 1 : 0); // the input where a junk value decides the answer
    });
    this.why.textContent = s.why;
  }
}

// ── fig 4 · many attempts, one checker ─────────────────────────────────────
// If one attempt passes the checker with probability p, at least one of k
// independent attempts passes with probability 1 - (1 - p)^k.
class LnSample extends Figure {
  build() {
    this.idleText = 'interactive';
    const svg = this.svgRoot(600, 300, 'Independent proof attempts, each checked by Lean, and the chance that at least one passes');
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'ATTEMPTS (EACH CHECKED BY LEAN)' }, svg);
    this.cells = [...Array(256)].map((_, i) => S('rect', { x: 20 + (i % 16) * 15, y: 34 + Math.floor(i / 16) * 15, width: 11, height: 11, rx: 2, class: 'f-rule' }, svg));
    // the curve: P(at least one pass) against k on a log axis
    const px = 300, pw = 280, py = 40, ph = 200;
    this.X = (k) => px + (Math.log2(k) / 8) * pw; this.Y = (v) => py + ph - v * ph;
    S('line', { x1: px, x2: px + pw, y1: py + ph, y2: py + ph, class: 's-rule', 'stroke-width': 1 }, svg);
    S('line', { x1: px, x2: px, y1: py, y2: py + ph, class: 's-rule', 'stroke-width': 1 }, svg);
    [1, 4, 16, 64, 256].forEach((k) => S('text', { x: this.X(k), y: py + ph + 16, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: k }, svg));
    ['0%', '50%', '100%'].forEach((s, i) => S('text', { x: px - 6, y: this.Y(i / 2) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: s }, svg));
    S('text', { x: px + pw, y: py + ph + 32, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: 'attempts (log scale)' }, svg);
    this.curve = S('path', { class: 'f-none s-green', 'stroke-width': 2.4 }, svg);
    this.dot = S('circle', { r: 5, class: 'f-green' }, svg);
    this.out = S('text', { x: 20, y: 290, class: 't', 'font-size': 13 }, svg);
    const bar = H('div', { class: 'fc' }, this);
    H('span', { text: 'p' }, bar);
    this.pr = H('input', { type: 'range', min: 1, max: 40, value: 4, 'aria-label': 'chance that one attempt passes, in half percent' }, bar);
    this.pl = H('span', { class: 'fc-l' }, bar);
    H('span', { text: 'k' }, bar);
    this.kr = H('input', { type: 'range', min: 0, max: 8, value: 5, 'aria-label': 'number of attempts, as a power of two' }, bar);
    this.kl = H('span', { class: 'fc-l' }, bar);
    this.pr.oninput = this.kr.oninput = () => this.draw();
    this.draw();
  }
  draw() {
    const p = this.pr.value / 200, k = 2 ** +this.kr.value, r = rng(7);
    this.pl.textContent = (p * 100).toFixed(1) + '%'; this.kl.textContent = k;
    let pass = 0;
    this.cells.forEach((c, i) => {
      const u = r(), on = i < k, ok = on && u < p;
      if (ok) pass++;
      c.setAttribute('class', !on ? 'f-rule' : ok ? 'f-green' : 'f-ink3');
      op(c, on ? 1 : 0.5);
    });
    let d = '';
    for (let j = 0; j <= 80; j++) { const kk = 2 ** (j / 10); d += (j ? 'L' : 'M') + this.X(kk).toFixed(1) + ' ' + this.Y(1 - (1 - p) ** kk).toFixed(1); }
    attr(this.curve, { d });
    const P = 1 - (1 - p) ** k;
    attr(this.dot, { cx: this.X(k), cy: this.Y(P) });
    this.out.textContent = `chance at least one of ${k} passes: ${(P * 100).toFixed(1)}% · passed in this draw: ${pass}`;
  }
}

define({ 'ln-goals': LnGoals, 'ln-kernel': LnKernel, 'ln-junk': LnJunk, 'ln-sample': LnSample });
