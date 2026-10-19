// Figures for "AI writes a lot more code, and that's about it".
// Green = code written or started, ink = work shipped or finished. Data read 2026-10-19; sources are in each caption.
import { S, op, lerp, ease, seg, handArrow, Figure, define, entrance, pills, tooltip, hit, tween } from './core.js';

// signed percent with a real minus sign, as in the prose
const sp = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%';

// ── fig 1 · written vs shipped ─────────────────────────────────────────────
// [label, % change, kind (w = written, s = shipped), ci low, ci high]
const FUNNEL = {
  gh: {
    max: 250, ticks: [0, 50, 100, 150, 200, 250],
    note: 'autonomous agents, >500,000 GitHub developers',
    rows: [['commits', 240, 'w'], ['projects', 80, 'w'], ['releases', 30, 's']],
  },
  fx: {
    max: 50, ticks: [-10, 0, 10, 20, 30, 40, 50], min: -10,
    note: 'coding agents, 725,938 engineers at 718 firms',
    // Jira issues resolved: β = 0.12, s.e. 0.17 on a baseline of 3.67, so +3.3% (95% CI −5.8% to +12.3%)
    rows: [['lines of code', 30, 'w'], ['pull requests', 23, 'w'], ['commits', 20, 'w'], ['issues resolved', 3.3, 's', -5.8, 12.3]],
  },
};
class PdFunnel extends Figure {
  build() {
    const svg = this.svgRoot(600, 244, 'Change in code written and in work shipped after developers adopt coding agents, in two studies');
    this.tip = tooltip(svg);
    S('rect', { x: 20, y: 12, width: 10, height: 10, rx: 2, class: 'f-green' }, svg); S('text', { x: 36, y: 21, class: 't2', 'font-size': 11, text: 'code written or started' }, svg);
    S('rect', { x: 196, y: 12, width: 10, height: 10, rx: 2, class: 'f-ink' }, svg); S('text', { x: 212, y: 21, class: 't2', 'font-size': 11, text: 'work shipped or finished' }, svg);
    this.note = S('text', { x: 20, y: 42, class: 't3', 'font-size': 10.5 }, svg);
    this.grid = S('g', {}, svg);
    this.rowsG = S('g', {}, svg);
    this.hand = S('text', { class: 'hand', 'font-size': 14 }, svg);
    this.arrow = S('path', { class: 'f-none s-ink2', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
    this.mode = 'gh';
    this.draw();
    // once a pill is clicked the entrance loop stops painting, so it can't fight the tween
    entrance(this, (k) => { if (!this.toggled) this.paint(k); });
    pills(this, [['gh', 'GitHub developers'], ['fx', '718 companies']], 'gh', (m) => {
      this.mode = m; this.toggled = true; this.tip.hide(); this.draw(); tween(this, (k) => this.paint(k));
    });
  }
  X(v) { const d = FUNNEL[this.mode], lo = d.min || 0; return 170 + (v - lo) / (d.max - lo) * 390; }
  draw() {
    const d = FUNNEL[this.mode];
    this.grid.replaceChildren(); this.rowsG.replaceChildren();
    this.note.textContent = d.note;
    d.ticks.forEach((v) => {
      S('line', { x1: this.X(v), x2: this.X(v), y1: 54, y2: 210, class: v ? 's-rule' : 's-ink3', 'stroke-width': 1 }, this.grid);
      S('text', { x: this.X(v), y: 226, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: sp(v) }, this.grid);
    });
    const step = 150 / d.rows.length;
    this.rows = d.rows.map(([n, v, k, lo, hi], i) => {
      const y = 64 + i * step + (step - 16) / 2;
      S('text', { x: 160, y: y + 12, class: k === 's' ? 't' : 't2', 'font-size': 12, 'text-anchor': 'end', text: n }, this.rowsG);
      const bar = S('rect', { x: this.X(0), y, height: 16, rx: 2, class: k === 'w' ? 'f-green' : 'f-ink' }, this.rowsG);
      const ci = lo != null ? S('path', { d: `M${this.X(lo)} ${y + 8}H${this.X(hi)}M${this.X(lo)} ${y + 3}V${y + 13}M${this.X(hi)} ${y + 3}V${y + 13}`, class: 'f-none s-ink2', 'stroke-width': 1.3 }, this.rowsG) : null;
      const val = S('text', { y: y + 12, class: 't', 'font-size': 11.5 }, this.rowsG);
      hit(this.rowsG, this.tip, this.X(v), y + 8, n, lo != null ? `${sp(v)}, 95% CI ${sp(lo)} to ${sp(hi)}, not significant` : sp(v));
      return { bar, ci, val, v, y, hi };
    });
    // one hand note pointing at the shipped row that matters most
    const last = this.rows[this.rows.length - 1];
    const tx = this.mode === 'gh' ? 360 : 420, ty = last.y + 13;
    this.hand.textContent = this.mode === 'gh' ? 'what users get' : 'finished work';
    this.hand.setAttribute('x', tx); this.hand.setAttribute('y', ty);
    this.arrow.setAttribute('d', handArrow(tx - 6, ty - 4, (last.ci ? this.X(last.hi) : this.X(last.v)) + 50, last.y + 8, 0.25));
  }
  paint(k) {
    this.rows.forEach((r, i) => {
      const kk = ease(seg(k, i * 0.12, i * 0.12 + 0.6)), w = Math.max(0, this.X(r.v * kk) - this.X(0));
      r.bar.setAttribute('width', w);
      r.val.setAttribute('x', (r.ci ? this.X(r.hi) : this.X(r.v * kk)) + 6);
      r.val.textContent = sp(+(r.v * kk).toFixed(r.v < 10 ? 1 : 0));
      if (r.ci) op(r.ci, kk);
    });
    op(this.hand, seg(k, 0.6, 1)); op(this.arrow, seg(k, 0.6, 1));
  }
}

// ── fig 2 · the careful studies ────────────────────────────────────────────
// [study, setting, outcome, estimate, ci low, ci high, randomized]
// Effects are % more output; METR measured time per task, converted here as 1/(1 + time change) − 1.
const TRIALS = [
  ['METR, early 2025', '16 experienced open-source devs', 'speed per task', -16.0, -28.1, -2.0, true],
  ['METR, 2026, returning devs', '10 of the same devs, newer agents', 'speed per task', 22.0, -8.3, 61.3, true],
  ['METR, 2026, new devs', '47 devs, newer agents', 'speed per task', 4.2, -8.3, 17.6, true],
  ['Cui et al., 3 companies', '4,867 devs, autocomplete, 2022–23', 'completed tasks', 26.1, 5.9, 46.3, true],
  ['Microsoft, 2026', 'Claude Code and Copilot CLI rollout', 'pull requests', 24.0, 14.5, 33.7, false],
  ['Chen and Stratton, 2026', '718 firms, coding agents', 'issues resolved', 3.3, -5.8, 12.3, false],
];
class PdTrials extends Figure {
  build() {
    const svg = this.svgRoot(600, 318, 'Estimated productivity effect of AI coding tools in six careful studies, with 95% intervals');
    const tip = tooltip(svg), X = (v) => 360 + v * 3.1; // −40%..+70% → 236..577
    S('circle', { cx: 24, cy: 16, r: 5, class: 'f-green' }, svg); S('text', { x: 34, y: 20, class: 't2', 'font-size': 11, text: 'randomized' }, svg);
    S('circle', { cx: 122, cy: 16, r: 5, class: 'f-ochre' }, svg); S('text', { x: 132, y: 20, class: 't2', 'font-size': 11, text: 'observational' }, svg);
    [-40, -20, 0, 20, 40, 60].forEach((v) => {
      S('line', { x1: X(v), x2: X(v), y1: 36, y2: 276, class: v ? 's-rule' : 's-ink3', 'stroke-width': 1 }, svg);
      S('text', { x: X(v), y: 292, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: sp(v) }, svg);
    });
    S('text', { x: X(-40), y: 310, class: 't3', 'font-size': 10.5, text: '← slower' }, svg);
    S('text', { x: X(60), y: 310, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: 'more output →' }, svg);
    this.rows = TRIALS.map(([n, sub, out, v, lo, hi, rct], i) => {
      const y = 56 + i * 38, g = S('g', {}, svg);
      S('text', { x: 16, y: y - 2, class: 't', 'font-size': 11.5, text: n }, g);
      S('text', { x: 16, y: y + 12, class: 't3', 'font-size': 10, text: sub }, g);
      const ci = S('path', { d: `M${X(lo)} ${y}H${X(hi)}M${X(lo)} ${y - 5}V${y + 5}M${X(hi)} ${y - 5}V${y + 5}`, class: 'f-none s-ink2', 'stroke-width': 1.4 }, g);
      const dot = S('circle', { cx: X(v), cy: y, r: 5.5, class: rct ? 'f-green' : 'f-ochre' }, g);
      hit(svg, tip, X(v), y, n, `${out}: ${sp(v)} (${sp(lo)} to ${sp(hi)})`);
      return { g, ci, dot };
    });
    S('text', { x: 584, y: 20, class: 'hand', 'font-size': 13.5, 'text-anchor': 'end', text: 'no randomized trial of agents at a company yet' }, svg);
    entrance(this, (k) => this.rows.forEach((r, i) => op(r.g, ease(seg(k, i * 0.1, i * 0.1 + 0.5)))));
  }
}

// ── fig 3 · the review queue ───────────────────────────────────────────────
// [measure, without, with, unit, source note]
const REVIEW = [
  ['days from pull request to merge', 7.03, 10.48, 'd', 'before and after agents, 718 firms'],
  ['pull requests with changes requested', 13, 25, '%', 'before and after agents, 718 firms'],
  ['review comments per pull request', 1.66, 2.24, '', 'before and after agents, 718 firms'],
  ['pull requests merged within 30 days', 84.4, 32.7, '%', 'unassisted vs AI, 8.1M pull requests'],
];
class PdReview extends Figure {
  build() {
    const svg = this.svgRoot(600, 270, 'Code review before and after coding agents: time to merge, changes requested, comments, and merge rates');
    S('rect', { x: 20, y: 12, width: 10, height: 10, rx: 2, class: 'f-ink3' }, svg); S('text', { x: 36, y: 21, class: 't2', 'font-size': 11, text: 'without agents' }, svg);
    S('rect', { x: 140, y: 12, width: 10, height: 10, rx: 2, class: 'f-green' }, svg); S('text', { x: 156, y: 21, class: 't2', 'font-size': 11, text: 'with agents or AI pull requests' }, svg);
    const fmt = (v, u) => (u === 'd' ? v.toFixed(1) + ' days' : u === '%' ? v + '%' : v.toFixed(2));
    this.rows = REVIEW.map(([n, a, b, u, src], i) => {
      const y = 48 + i * 52, max = Math.max(a, b), W = (v) => v / max * 300;
      S('text', { x: 20, y, class: 't', 'font-size': 12, text: n }, svg);
      S('text', { x: 580, y, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: src }, svg);
      const bars = [[a, 'f-ink3', 0], [b, 'f-green', 1]].map(([v, cls, j]) => {
        const r = S('rect', { x: 20, y: y + 8 + j * 15, height: 12, rx: 2, class: cls }, svg);
        const t = S('text', { y: y + 18 + j * 15, class: j ? 't' : 't2', 'font-size': 11 }, svg);
        return { r, t, w: W(v), s: fmt(v, u) };
      });
      return bars;
    });
    S('text', { x: 214, y: 262, class: 'hand', 'font-size': 14, text: 'two in three don\'t merge within a month' }, svg);
    S('path', { d: handArrow(208, 256, 20 + 32.7 / 84.4 * 300 + 58, 48 + 3 * 52 + 30, -0.2), class: 'f-none s-ink2', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
    entrance(this, (k) => this.rows.forEach((bars, i) => bars.forEach((b, j) => {
      const kk = ease(seg(k, i * 0.1 + j * 0.15, i * 0.1 + j * 0.15 + 0.5));
      b.r.setAttribute('width', lerp(0, b.w, kk)); b.t.setAttribute('x', 26 + lerp(0, b.w, kk)); b.t.textContent = b.s; op(b.t, kk);
    })));
  }
}

define({ 'pd-funnel': PdFunnel, 'pd-trials': PdTrials, 'pd-review': PdReview });
