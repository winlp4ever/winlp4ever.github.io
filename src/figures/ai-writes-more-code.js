// Figures for "AI writes a lot more code, and that's about it".
// Green = code written or started, ink = work shipped or finished. Data read 2026-10-19; sources are in each caption.
import { S, op, lerp, ease, seg, handArrow, Figure, define, entrance, pills, tooltip, hit, tween } from './core.js';

// signed percent with a real minus sign, as in the prose
const sp = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%';

// ── fig 1 · what Anthropic reports about itself ────────────────────────────
// "How employment is changing at Anthropic", 16 Oct 2026. [big number, what it measures, detail]
const CLAIMS = {
  gain: [
    ['5×', 'commits per engineer', 'against six months earlier'],
    ['6×', 'agent hours per human', 'interactive sessions, August 2026'],
    ['2 → 90', 'coding sessions a month', 'non-technical staff, Aug 2025 to May 2026'],
    ['2–4×', 'revenue per employee', 'against Meta and Google at the same age'],
    ['44 → 75%', 'say they are productive', 'late 2024 to April 2026, wording changed'],
    ['75%', 'of work AI does by 2030', 'staff estimate; other US workers say 28%'],
  ],
  cost: [
    ['80%', 'session time waiting', 'the agent idle until a person answers'],
    ['+20%', 'median meeting time', 'against a year earlier'],
    ['10 → 22%', 'sessions on meta-work', 'building and supervising agents'],
    ['8,500', 'standing instructions', 'for agents, up from a few hundred'],
    ['27 → 9%', 'junior share of hires', 'technical hires; junior staff 21% → 14%'],
    ['halved', 'non-coding tech staff', 'share fell by almost half in a year'],
  ],
};
class PdClaims extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Six numbers Anthropic reports about its own workforce, the gains and the costs');
    this.tiles = Array.from({ length: 6 }, (_, i) => {
      const x = 16 + (i % 3) * 192, y = 14 + Math.floor(i / 3) * 140, g = S('g', {}, svg);
      S('rect', { x, y, width: 184, height: 130, rx: 10, class: 'f-panel s-rule', 'stroke-width': 1 }, g);
      const big = S('text', { x: x + 14, y: y + 50, 'font-size': 30, 'font-weight': 600 }, g);
      const a = S('text', { x: x + 14, y: y + 80, class: 't', 'font-size': 11 }, g);
      const b = S('text', { x: x + 14, y: y + 100, class: 't3', 'font-size': 9.5 }, g);
      const c = S('text', { x: x + 14, y: y + 114, class: 't3', 'font-size': 9.5 }, g);
      return { g, big, a, b, c };
    });
    this.mode = 'gain';
    this.fill();
    entrance(this, (k) => { if (!this.toggled) this.tiles.forEach((t, i) => op(t.g, ease(seg(k, i * 0.08, i * 0.08 + 0.5)))); });
    pills(this, [['gain', 'what it gains'], ['cost', 'what it costs']], 'gain', (m) => {
      this.mode = m; this.toggled = true; this.fill(); tween(this, (k) => this.tiles.forEach((t, i) => op(t.g, ease(seg(k, i * 0.06, i * 0.06 + 0.5)))));
    });
  }
  fill() {
    CLAIMS[this.mode].forEach(([n, a, d], i) => {
      const t = this.tiles[i];
      t.big.textContent = n; t.big.setAttribute('class', this.mode === 'gain' ? 'f-green' : 'f-ochre');
      t.a.textContent = a;
      // the detail line wraps once at about 26 characters
      const cut = d.length > 26 ? d.lastIndexOf(' ', 26) : d.length;
      t.b.textContent = d.slice(0, cut); t.c.textContent = d.slice(cut + 1);
    });
  }
}

// ── fig 2 · written vs shipped ─────────────────────────────────────────────
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

// ── fig 3 · the careful studies ────────────────────────────────────────────
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
      S('path', { d: `M${X(lo)} ${y}H${X(hi)}M${X(lo)} ${y - 5}V${y + 5}M${X(hi)} ${y - 5}V${y + 5}`, class: 'f-none s-ink2', 'stroke-width': 1.4 }, g);
      S('circle', { cx: X(v), cy: y, r: 5.5, class: rct ? 'f-green' : 'f-ochre' }, g);
      hit(svg, tip, X(v), y, n, `${out}: ${sp(v)} (${sp(lo)} to ${sp(hi)})`);
      return { g };
    });
    S('text', { x: 584, y: 20, class: 'hand', 'font-size': 13.5, 'text-anchor': 'end', text: 'no randomized trial of agents at a company yet' }, svg);
    entrance(this, (k) => this.rows.forEach((r, i) => op(r.g, ease(seg(k, i * 0.1, i * 0.1 + 0.5)))));
  }
}

// ── fig 5 · the review queue ───────────────────────────────────────────────
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

// ── fig 6 · who gets hired ─────────────────────────────────────────────────
// age: Stanford Digital Economy Lab "Canaries" software developers, ADP payroll headcount, Nov 2022 = 100,
// monthly Sep 2021 to Aug 2026 (vintage 2026-09-17).
// post: Indeed Hiring Lab postings indexes on FRED (IHLIDXUSTPSOFTDEVE, IHLIDXUS), Feb 2020 = 100, every third month.
const AGE = {
  start: [2021, 9],
  rows: [
    ['22–25', 'f-green', [88.2, 90.1, 91.0, 90.7, 92.4, 92.8, 93.0, 92.4, 92.0, 96.3, 99.6, 101.0, 101.6, 100.8, 100.0, 98.2, 96.2, 96.7, 96.0, 93.4, 92.6, 93.5, 92.6, 94.0, 94.4, 92.3, 90.1, 88.0, 87.9, 88.4, 86.6, 86.5, 86.4, 87.6, 86.5, 87.0, 85.9, 84.8, 84.4, 82.6, 81.8, 81.8, 79.3, 79.3, 82.7, 83.1, 84.0, 84.3, 83.6, 83.2, 82.4, 80.8, 80.8, 79.4, 79.8, 79.0, 78.1, 78.9, 80.7, 80.5]],
    ['26–30', 'ink3', [89.0, 90.6, 91.4, 91.4, 93.4, 93.7, 94.0, 94.5, 95.4, 96.4, 99.3, 99.1, 100.8, 99.9, 100.0, 99.5, 99.6, 99.2, 99.0, 99.1, 99.1, 97.8, 98.8, 99.2, 99.0, 98.5, 97.5, 96.5, 97.0, 97.0, 97.7, 97.1, 96.4, 96.2, 96.4, 96.1, 96.8, 96.6, 96.4, 95.1, 95.7, 95.0, 94.9, 94.8, 98.1, 98.7, 98.6, 99.0, 98.3, 98.9, 98.4, 97.7, 97.0, 96.6, 95.8, 96.0, 95.8, 96.9, 96.4, 93.9]],
    ['35–40', 'ink2', [90.8, 92.1, 92.6, 92.8, 94.6, 94.1, 94.2, 94.9, 94.8, 96.0, 97.3, 97.9, 100.1, 99.4, 100.0, 99.8, 100.6, 100.6, 101.1, 102.1, 101.7, 101.3, 101.1, 101.3, 102.2, 102.2, 102.5, 101.5, 102.7, 102.8, 103.8, 103.7, 103.8, 103.8, 103.5, 104.5, 104.2, 103.9, 104.3, 103.8, 105.2, 105.1, 104.8, 105.5, 109.6, 110.3, 110.6, 110.8, 111.6, 111.2, 111.8, 111.9, 111.9, 111.7, 111.3, 111.2, 111.4, 111.7, 113.0, 111.7]],
    ['41–49', 'ink', [91.2, 92.1, 92.3, 92.3, 94.6, 95.0, 95.2, 95.9, 96.1, 96.4, 99.0, 99.3, 100.6, 100.0, 100.0, 100.1, 101.7, 101.8, 102.0, 102.3, 103.3, 103.5, 103.9, 104.3, 105.0, 104.9, 105.1, 104.5, 106.1, 106.6, 106.9, 107.6, 108.3, 108.6, 108.3, 109.3, 109.7, 110.5, 110.6, 110.3, 111.4, 111.8, 112.4, 112.7, 115.7, 115.6, 116.0, 116.5, 116.7, 117.4, 118.5, 118.4, 118.8, 118.5, 118.1, 118.7, 120.2, 120.5, 120.4, 119.5]],
  ],
};
const POST = {
  start: [2020, 2], step: 3, last: 2026 + 9.3 / 12, // the last reading is 9 Oct 2026, not a quarter step
  rows: [
    ['software', 'f-green', [100, 64.9, 70.9, 87.8, 107.6, 134, 169.7, 209.9, 233.8, 225.4, 180.8, 142.5, 106.8, 94.6, 78.6, 72.5, 70.8, 70.2, 68.3, 67.3, 62.8, 64, 65.2, 66.6, 70.9, 73.5, 74.8, 78.1]],
    ['all jobs', 'ink3', [99.9, 65, 84.1, 94.4, 105.9, 131.3, 141.6, 154.9, 160.4, 160.2, 152, 146.7, 134.8, 133.9, 127.8, 121.9, 118, 114.8, 112.3, 110.3, 109, 105.5, 104.1, 102.3, 105.4, 100.4, 101.9, 104.1]],
  ],
};
const T0 = 2020 + 1 / 12, T1 = 2026 + 9.3 / 12; // the x axis runs Feb 2020 to 9 Oct 2026 in both views
class PdHiring extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Software developer employment by age since 2021, and software job postings since 2020');
    this.X = (t) => 44 + (t - T0) / (T1 - T0) * 476;
    this.note = S('text', { x: 20, y: 20, class: 't3', 'font-size': 10.5 }, svg);
    const under = S('g', {}, svg); // static rules sit under the data lines
    this.grid = S('g', {}, svg);
    this.lines = S('g', {}, svg);
    [2021, 2022, 2023, 2024, 2025, 2026].forEach((y) => {
      S('line', { x1: this.X(y), x2: this.X(y), y1: 34, y2: 262, class: 's-rule', 'stroke-width': 1 }, under);
      S('text', { x: this.X(y), y: 278, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: y }, svg);
    });
    // ChatGPT, 30 Nov 2022; Claude Code research preview, 24 Feb 2025
    [[2022 + 10.97 / 12, 'ChatGPT'], [2025 + 1.8 / 12, 'coding agents']].forEach(([t, n]) => {
      S('line', { x1: this.X(t), x2: this.X(t), y1: 34, y2: 262, class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, under);
      S('text', { x: this.X(t) + 4, y: 44, class: 't3', 'font-size': 10, text: n }, svg);
    });
    this.hand = S('text', { class: 'hand', 'font-size': 13.5 }, svg);
    this.mode = 'age';
    this.draw();
    entrance(this, (k) => { if (!this.toggled) this.paint(k); }, 1400);
    pills(this, [['age', 'developers employed, by age'], ['post', 'software job postings']], 'age', (m) => {
      this.mode = m; this.toggled = true; this.draw(); tween(this, (k) => this.paint(k), 900);
    });
  }
  draw() {
    const d = this.mode === 'age' ? AGE : POST, [lo, hi] = this.mode === 'age' ? [75, 125] : [50, 250];
    const Y = (v) => 262 - (v - lo) / (hi - lo) * 220;
    this.grid.replaceChildren(); this.lines.replaceChildren();
    this.note.textContent = this.mode === 'age'
      ? 'US software developers on ADP payrolls, by age, Nov 2022 = 100'
      : 'US job postings on Indeed, Feb 2020 = 100';
    (this.mode === 'age' ? [80, 90, 100, 110, 120] : [50, 100, 150, 200, 250]).forEach((v) => {
      S('line', { x1: 44, x2: 520, y1: Y(v), y2: Y(v), class: v === 100 ? 's-ink3' : 's-rule', 'stroke-width': 1 }, this.grid);
      S('text', { x: 38, y: Y(v) + 4, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: v }, this.grid);
    });
    const step = d.step || 1, [y0, m0] = d.start;
    this.paths = d.rows.map(([n, cls, vals]) => {
      const pts = vals.map((v, i) => [this.X(d.last && i === vals.length - 1 ? d.last : y0 + (m0 - 1 + i * step) / 12), Y(v)]);
      const path = S('path', { class: 'f-none s-' + cls.replace('f-', ''), 'stroke-width': cls === 'f-green' ? 2.6 : 1.6, 'stroke-linejoin': 'round' }, this.lines);
      const [lx, ly] = pts[pts.length - 1];
      const lab = S('text', { x: lx + 6, y: ly + 4, class: cls === 'f-green' ? 't' : 't2', 'font-size': 10.5, text: n }, this.lines);
      return { path, pts, lab };
    });
    this.hand.textContent = this.mode === 'age' ? 'aged 22–25: about −20%' : 'back up 24% since early 2025';
    this.hand.setAttribute('x', this.mode === 'age' ? 150 : 300); this.hand.setAttribute('y', this.mode === 'age' ? Y(81) : 120);
  }
  paint(k) {
    this.paths.forEach(({ path, pts, lab }) => {
      const n = Math.max(2, Math.round(pts.length * k));
      path.setAttribute('d', 'M' + pts.slice(0, n).map((p) => p.join(' ')).join('L'));
      op(lab, seg(k, 0.85, 1));
    });
    op(this.hand, seg(k, 0.85, 1));
  }
}

// ── fig 7 · which jobs grew ────────────────────────────────────────────────
// BLS OEWS national estimates, US employment by occupation, May 2022 and May 2025.
const OCC = [
  ['data scientists', 159630, 262440], ['information security analysts', 163690, 190650], ['software developers', 1534790, 1687890],
  ['network and systems admins', 325930, 314340], ['QA analysts and testers', 196420, 186740], ['web developers', 88620, 70190],
  ['computer programmers', 132740, 92230],
];
class PdDomains extends Figure {
  build() {
    const svg = this.svgRoot(600, 236, 'Change in US employment by computing occupation from May 2022 to May 2025');
    const tip = tooltip(svg), X = (v) => 330 + v * 3.4; // −40%..+70%
    [-30, -15, 0, 15, 30, 45, 60].forEach((v) => {
      S('line', { x1: X(v), x2: X(v), y1: 12, y2: 206, class: v ? 's-rule' : 's-ink3', 'stroke-width': 1 }, svg);
      S('text', { x: X(v), y: 222, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: sp(v) }, svg);
    });
    this.rows = OCC.map(([n, a, b], i) => {
      const y = 18 + i * 27, v = Math.round((b / a - 1) * 1000) / 10, up = v > 0;
      S('text', { x: 16, y: y + 12, class: 't', 'font-size': 11.5, text: n }, svg);
      const bar = S('rect', { y, height: 16, rx: 2, class: up ? 'f-green' : 'f-ochre' }, svg);
      const val = S('text', { y: y + 12, class: 't', 'font-size': 11, 'text-anchor': up ? 'start' : 'end' }, svg);
      hit(svg, tip, X(v), y + 8, n, `${a.toLocaleString('en-US')} → ${b.toLocaleString('en-US')} (${sp(v)})`);
      return { bar, val, v, up };
    });
    entrance(this, (k) => this.rows.forEach((r, i) => {
      const w = r.v * ease(seg(k, i * 0.07, i * 0.07 + 0.5));
      r.bar.setAttribute('x', Math.min(X(0), X(w))); r.bar.setAttribute('width', Math.abs(X(w) - X(0)));
      r.val.setAttribute('x', X(w) + (r.up ? 6 : -6)); r.val.textContent = sp(Math.round(w * 10) / 10);
    }));
  }
}

// ── fig 4 · the speed-up fades, the complexity stays ───────────────────────
// He et al. (CMU, MSR '26), 806 open-source repositories that adopted Cursor against matched controls.
// Month-by-month velocity effects are reported for months 1 and 2 only; later months are not significant.
// The quality effects are averages over the post-adoption period, which the paper says persist.
const FADE = {
  commits: { max: 60, ticks: [0, 20, 40, 60], v: [55.4, 14.5] },
  lines: { max: 300, ticks: [0, 100, 200, 300], v: [281.3, 48.4] },
};
class PdFade extends Figure {
  build() {
    const svg = this.svgRoot(600, 270, 'Velocity gains after adopting Cursor by month, against the lasting rise in warnings and complexity');
    this.X = (m) => 70 + (m - 0.5) * 82;
    S('rect', { x: 20, y: 12, width: 10, height: 10, rx: 2, class: 'f-green' }, svg); S('text', { x: 36, y: 21, class: 't2', 'font-size': 11, text: 'extra output that month' }, svg);
    S('line', { x1: 216, x2: 240, y1: 17, y2: 17, class: 's-ochre', 'stroke-width': 2.4, 'stroke-dasharray': '6 4' }, svg); S('text', { x: 246, y: 21, class: 't2', 'font-size': 11, text: 'lasting rise in warnings and complexity' }, svg);
    for (let m = 1; m <= 6; m++) S('text', { x: this.X(m), y: 252, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: 'month ' + m }, svg);
    this.grid = S('g', {}, svg); this.body = S('g', {}, svg);
    this.mode = 'commits';
    this.draw();
    entrance(this, (k) => { if (!this.toggled) this.paint(k); });
    pills(this, [['commits', 'commits'], ['lines', 'lines added']], 'commits', (m) => {
      this.mode = m; this.toggled = true; this.draw(); tween(this, (k) => this.paint(k));
    });
  }
  draw() {
    const d = FADE[this.mode], Y = this.Y = (v) => 228 - v / d.max * 180;
    this.grid.replaceChildren(); this.body.replaceChildren();
    d.ticks.forEach((v) => {
      S('line', { x1: 40, x2: 580, y1: Y(v), y2: Y(v), class: v ? 's-rule' : 's-ink3', 'stroke-width': 1 }, this.grid);
      S('text', { x: 34, y: Y(v) + 4, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: sp(v) }, this.grid);
    });
    this.bars = d.v.map((v, i) => {
      const x = this.X(i + 1) - 22;
      const r = S('rect', { x, width: 44, rx: 2, class: 'f-green' }, this.body);
      const t = S('text', { x: x + 22, class: 't', 'font-size': 11.5, 'text-anchor': 'middle' }, this.body);
      return { r, t, v };
    });
    for (let m = 3; m <= 6; m++) S('rect', { x: this.X(m) - 22, y: Y(0) - 1, width: 44, height: 2, class: 'f-ink3' }, this.body);
    S('text', { x: this.X(3) - 22, y: Y(0) - 8, class: 't3', 'font-size': 10, text: 'no significant gain from month 3' }, this.body);
    // the two quality effects as lasting levels, drawn on the same % scale
    // complexity is labelled above its line, warnings below, so the two never collide when the lines sit close
    this.q = [[30.3, 'warnings +30%', 15], [41.6, 'complexity +42%', -6]].map(([v, n, dy]) => {
      const l = S('line', { x1: this.X(1) - 30, x2: this.X(6) + 30, y1: Y(v), y2: Y(v), class: 's-ochre', 'stroke-width': 2.4, 'stroke-dasharray': '6 4' }, this.body);
      const t = S('text', { x: this.X(6) + 30, y: Y(v) + dy, class: 't2', 'font-size': 10.5, 'text-anchor': 'end', text: n }, this.body);
      return [l, t];
    });
  }
  paint(k) {
    const Y = this.Y;
    this.bars.forEach(({ r, t, v }, i) => {
      const kk = ease(seg(k, i * 0.15, i * 0.15 + 0.5)), y = Y(v * kk);
      r.setAttribute('y', y); r.setAttribute('height', Y(0) - y);
      t.setAttribute('y', y - 6); t.textContent = sp(Math.round(v * kk * 10) / 10);
    });
    this.q.forEach(([l, t]) => { op(l, seg(k, 0.5, 1)); op(t, seg(k, 0.5, 1)); });
  }
}

define({ 'pd-fade': PdFade, 'pd-claims': PdClaims, 'pd-hiring': PdHiring, 'pd-domains': PdDomains, 'pd-funnel': PdFunnel, 'pd-trials': PdTrials, 'pd-review': PdReview });
