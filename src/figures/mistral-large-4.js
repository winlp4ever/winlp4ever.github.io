// Figures for "Mistral Large 4, about seven months behind".
// Encoding used everywhere: Mistral = green, Chinese labs = ochre, US closed = ink, US open = grey.
// Data read 2026-10-12; sources are in each figure's caption.
import { S, attr, op, lerp, handArrow, Figure, define, entrance, pills, tooltip, hit, tween } from './core.js';
import { CLOSED, OPEN, D, firstClosed } from './data/aa-index.js';

const COL = { eu: 'green', cn: 'ochre', us: 'ink', uso: 'ink3' };
const tcol = (o) => (o === 'eu' ? 'fill:var(--green-t)' : o === 'cn' ? 'fill:var(--ochre-t)' : '');

// ── fig 1 · seven months behind ────────────────────────────────────────────
// AA Intelligence Index v4.3.2 with release dates, shared with the DeepSeek / GLM post.
const ML4 = ['2026-10-06', 38];

class MlGap extends Figure {
  build() {
    const svg = this.svgRoot(600, 320, 'Best closed and best open model scores through 2026, with Mistral Large 4 and the gap to the first closed model at its score');
    const d0 = D('2025-11-15'), d1 = D('2026-10-20');
    const first = firstClosed(ML4[1]);
    const X = (d) => 56 + (d - d0) / (d1 - d0) * 500, Y = (v) => 266 - (v - 25) / 35 * 226;
    [30, 40, 50, 60].forEach((v) => {
      S('line', { x1: 56, x2: 556, y1: Y(v), y2: Y(v), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 48, y: Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v }, svg);
    });
    ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct'].forEach((m, i) => {
      const ym = i ? `2026-${String(i).padStart(2, '0')}-01` : '2025-12-01';
      S('text', { x: X(D(ym)), y: 286, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: m }, svg);
    });
    const step = (list, from) => {
      let d = '', prev = null;
      list.forEach((r) => {
        const x = X(D(r[0])).toFixed(1), y = Y(r[1]).toFixed(1);
        d += prev ? `L${x} ${Y(prev[1]).toFixed(1)}L${x} ${y}` : `M${x} ${y}`; prev = r;
      });
      return d + `L${X(D(from))} ${Y(prev[1]).toFixed(1)}`;
    };
    S('path', { d: step(CLOSED, '2026-10-06'), class: 'f-none s-ink', 'stroke-width': 2 }, svg);
    S('path', { d: step(OPEN, '2026-10-06'), class: 'f-none s-ochre', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
    S('text', { x: X(D('2025-11-26')), y: Y(31.5) - 8, class: 't', 'font-size': 11.5, text: 'best closed' }, svg);
    S('text', { x: X(D('2026-05-02')), y: Y(30.4) + 16, class: 't', 'font-size': 11.5, text: 'best open (all Chinese)', style: 'fill:var(--ochre-t)' }, svg);
    [first, ...CLOSED.filter((r) => ['Fable 5', 'Opus 5.5'].includes(r[2]))].forEach(([d, v, n]) =>
      S('text', { x: X(D(d)) - 4, y: Y(v) - 6, class: 't2', 'font-size': 10.5, 'text-anchor': 'end', text: n }, svg));
    S('text', { x: X(D('2026-09-21')) - 4, y: Y(46.3) - 7, class: 't2', 'font-size': 10.5, 'text-anchor': 'end', text: 'MiMo-V2.6-Pro', style: 'fill:var(--ochre-t)' }, svg);
    // the lag: from the first closed record at Large 4's score to Large 4's release
    const xa = X(D(first[0])), xb = X(D(ML4[0])), y = Y(ML4[1]);
    this.lag = S('line', { x1: xb, x2: xb, y1: y, y2: y, class: 's-green', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }, svg);
    S('circle', { cx: xa, cy: Y(first[1]), r: 3.5, class: 'f-ink' }, svg);
    S('circle', { cx: xb, cy: y, r: 6, class: 'f-green' }, svg);
    S('text', { x: xb + 10, y: y + 4, class: 't', 'font-size': 11, text: 'Large 4', style: 'fill:var(--green-t)' }, svg);
    S('text', { x: xb + 10, y: y + 18, class: 't3', 'font-size': 10.5, text: '38' }, svg);
    this.days = S('text', { x: xa + (xb - xa) * 0.4, y: y + 18, class: 't', 'font-size': 12, 'text-anchor': 'middle', style: 'fill:var(--green-t)' }, svg);
    S('text', { x: X(D('2026-03-28')), y: Y(46), class: 'hand', 'font-size': 14, 'text-anchor': 'middle', text: 'about seven months' }, svg);
    S('path', { d: handArrow(X(D('2026-04-14')), Y(44.6), X(D('2026-05-20')), y - 5, 0.2), class: 'f-none s-ink2', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
    this.xa = xa; this.xb = xb; this.n = Math.round(D(ML4[0]) - D(first[0]));
    entrance(this, (k) => this.paint(k), 1200);
  }
  paint(k) {
    attr(this.lag, { x1: lerp(this.xb, this.xa, k) });
    this.days.textContent = `${Math.round(this.n * k)} days`;
    op(this.days, k);
  }
}

// ── fig 2 · the scoreboard ─────────────────────────────────────────────────
// AA Intelligence Index v4.3.2 on 2026-10-12. o = origin, w = open weights (1 = out, 0.5 = promised, 0 = closed).
const BOARD = [
  ['Claude Opus 5.5', 57.6, 'us', 0], ['Claude Sonnet 5.5', 56.0, 'us', 0], ['Claude Fable 5.1', 53.4, 'us', 0], ['Gemini 4 Argon', 53, 'us', 0],
  ['GPT-6 Astra', 52.7, 'us', 0], ['GPT-6.1 Sol', 51.8, 'us', 0], ['MiMo-V2.6-Pro', 46.3, 'cn', 1], ['Grok 4.7', 46, 'us', 0],
  ['GLM-5.3', 44.8, 'cn', 1], ['Step 5 Preview', 44, 'cn', 0.5], ['Kimi K3', 43.6, 'cn', 1], ['GLM-5.3-Flash', 41.8, 'cn', 1],
  ['DeepSeek V4.1-Flash', 39.5, 'cn', 1], ['Mistral Large 4', 38, 'eu', 0.5], ['Claude Haiku 5.5', 38, 'us', 0], ['GPT-6 Luna', 38, 'us', 0],
  ['Nemotron 3 Ultra', 23, 'uso', 1], ['Gemma 4 31B', 15, 'uso', 1], ['gpt-oss-120b', 12, 'uso', 1],
];
class MlBoard extends Figure {
  build() {
    const svg = this.svgRoot(600, 352, 'Artificial Analysis Intelligence Index for nineteen models, coloured by where the lab is based');
    this.B = (v) => 176 + v / 60 * 360;
    [0, 20, 40, 60].forEach((v) => {
      S('line', { x1: this.B(v), x2: this.B(v), y1: 34, y2: 312, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: this.B(v), y: 328, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v }, svg);
    });
    [['US closed', 'f-ink'], ['Chinese', 'f-ochre'], ['Mistral', 'f-green'], ['US open', 'f-ink3']].forEach(([n, c], i) => {
      S('rect', { x: 176 + i * 96, y: 12, width: 10, height: 10, rx: 2, class: c }, svg);
      S('text', { x: 191 + i * 96, y: 21, class: 't2', 'font-size': 11, text: n }, svg);
    });
    this.rows = BOARD.map(([n, v, o, w]) => {
      const g = S('g', {}, svg);
      const name = S('text', { x: 168, y: 9, class: o === 'eu' ? 't' : 't2', 'font-size': 11, 'text-anchor': 'end', text: n, style: tcol(o) }, g);
      const bar = S('rect', { x: this.B(0), y: 0, height: 10, rx: 2, class: 'f-' + COL[o] }, g);
      if (w === 0.5) attr(bar, { class: 'f-' + COL[o] + ' s-' + COL[o], 'fill-opacity': 0.35, 'stroke-width': 1.5, 'stroke-dasharray': '3 2' });
      const val = S('text', { y: 9, class: 't2', 'font-size': 10.5 }, g);
      return { g, v, w, bar, val, name, y: 0, ny: 0, a: 1, na: 1 };
    });
    S('text', { x: 20, y: 346, class: 't3', 'font-size': 10, text: 'dashed: weights promised, not out' }, svg);
    this.layout('all', true);
    pills(this, [['all', 'every model'], ['open', 'open weights']], 'all', (v) => { this.layout(v); tween(this, (k) => this.place(k)); });
    entrance(this, (k) => this.grow(k));
  }
  layout(mode, now) {
    let i = 0;
    this.rows.forEach((r) => {
      r.y = r.cy ?? r.ny; r.a = r.ca ?? r.na;
      const show = mode === 'all' || r.w > 0;
      r.na = show ? 1 : 0;
      r.ny = 40 + (show ? i++ : i) * 14.4;
      if (now) { r.y = r.ny; r.a = r.na; }
    });
    if (now) this.place(1);
  }
  place(k) {
    this.rows.forEach((r) => {
      r.cy = lerp(r.y, r.ny, k); r.ca = lerp(r.a, r.na, k);
      attr(r.g, { transform: `translate(0 ${r.cy.toFixed(1)})` }); op(r.g, r.ca);
    });
  }
  grow(k) {
    this.rows.forEach((r) => {
      const w = (this.B(r.v) - this.B(0)) * k;
      attr(r.bar, { width: Math.max(1, w) }); attr(r.val, { x: this.B(0) + w + 6 });
      r.val.textContent = (r.v * k).toFixed(r.v % 1 ? 1 : 0);
    });
  }
}

// ── fig 3 · price per token, price per task ────────────────────────────────
// AA model pages: list output price ($/M), output tokens to run the index, cost per index task, index score (effort variant in caption).
const COST = [
  ['Mistral Large 4', 38, 4.18, 1.13, 200, 'eu', 'start'], ['GPT-6 Luna, Haiku 5.5', 38, 0.5, 0.075, '140 / 97', 'us', 'down'],
  ['GPT-6.1 Sol', 52, 10, 0.72, 67, 'us', 'end'], ['Claude Sonnet 5.5', 47, 10, 0.88, 52, 'us', 'start'],
  ['Claude Opus 5.5', 58, 20, 5.98, 260, 'us', 'end'], ['Gemini 4 Argon', 53, 10, 1.99, 110, 'us', 'start'],
  ['MiMo-V2.6-Pro', 46, 0.87, 0.13, 140, 'cn', 'end'], ['DeepSeek V4.1-Flash', 39, 1.2, 0.27, 250, 'cn', 'up'],
  ['GLM-5.3', 45, 4.4, 2.01, 210, 'cn', 'end'], ['Kimi K3', 44, 15, 2.0, 160, 'cn', 'start'],
];
class MlCost extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'Index score against price, per million output tokens or per task, on a log scale');
    const L = Math.log10, x0 = 64, x1 = 576;
    this.X = (v) => x0 + (L(v) - L(0.05)) / (L(40) - L(0.05)) * (x1 - x0);
    this.Y = (v) => 286 - (v - 34) / 26 * 250;
    [40, 50, 60].forEach((v) => {
      S('line', { x1: x0, x2: x1, y1: this.Y(v), y2: this.Y(v), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: x0 - 8, y: this.Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v }, svg);
    });
    [0.1, 1, 10].forEach((v) => S('text', { x: this.X(v), y: 304, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: '$' + v }, svg));
    S('text', { x: x0 - 8, y: 24, class: 't2', 'font-size': 11, 'text-anchor': 'end', text: 'index' }, svg);
    this.axis = S('text', { x: x1, y: 322, class: 't2', 'font-size': 11, 'text-anchor': 'end' }, svg);
    const tip = tooltip(svg);
    this.pts = COST.map(([n, v, tok, task, out, o, anchor]) => {
      const g = S('g', {}, svg);
      const c = S('circle', { r: o === 'eu' ? 6.5 : 5, class: 'f-' + COL[o] }, g);
      const t = S('text', { class: o === 'eu' ? 't' : 't2', 'font-size': 10.5, 'text-anchor': anchor === 'up' || anchor === 'down' ? 'middle' : anchor, text: n, style: tcol(o) }, g);
      const money = (x) => '$' + (x < 0.1 ? x.toFixed(3) : x.toFixed(2));
      const h = hit(g, tip, 0, 0, `${n} · ${v}`, `${money(tok)}/M out · ${out}M tokens · ${money(task)} a task`);
      return { n, v, tok, task, out, c, t, h, anchor, x: 0 };
    });
    this.mode = 'tok';
    pills(this, [['tok', 'per million output tokens'], ['task', 'per task']], 'tok', (m) => {
      this.mode = m; this.pts.forEach((p) => { p.from = p.x; }); tween(this, (k) => this.place(k), 900);
    });
    this.pts.forEach((p) => { p.from = this.X(p.tok); });
    this.place(1);
  }
  place(k) {
    const per = this.mode === 'tok';
    this.axis.textContent = per ? 'list price per million output tokens (log scale)' : 'cost per index task (log scale)';
    this.pts.forEach((p) => {
      const to = this.X(per ? p.tok : p.task), x = lerp(p.from, to, k), y = this.Y(p.v);
      p.x = x;
      attr(p.c, { cx: x, cy: y }); p.h.move(x, y);
      if (p.anchor === 'up' || p.anchor === 'down') attr(p.t, { x, y: p.anchor === 'up' ? y - 10 : y + 19 }); else attr(p.t, { x: x + (p.anchor === 'end' ? -9 : 9), y: y + 4 });
    });
  }
}

// ── fig 4 · one benchmark, three boards ────────────────────────────────────
// Terminal-Bench 4.0, 2026-10-12. v = official tbench.ai board (usually the lab's own agent), a = AA (mini-swe-agent, 500 steps), s = Vals (mini-swe-agent, no cap).
const TB = [
  ['Qwen3.8 Max', 'cn', 26.97, 38.89, 34.34], ['Grok 4.7', 'us', 37.58, 25.76, 28.79], ['Claude Fable 5.1', 'us', 57.88, 52.02, 58.08],
  ['Claude Opus 5.5', 'us', 64.85, 59.60, 65.15], ['GPT-6 Sol', 'us', 49.39, 43.94, 44.44], ['Mistral Large 4', 'eu', null, 26.77, 22.73, 28.3],
  ['GLM-5.3', 'cn', 41.82, 41.92, 38.89], ['GPT-6.1 Sol', 'us', 58.18, 56.06, 55.05], ['Claude Sonnet 5.5', 'us', 61.82, 63.64, 64.14],
  ['GPT-6 Astra', 'us', 58.18, 59.09, 59.60], ['Gemini 3.8 Flash', 'us', 19.09, 19.70, 19.19],
];
class MlBoards extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'Terminal-Bench 4.0 scores for eleven models on three leaderboards');
    this.X = (v) => 170 + v / 70 * 400;
    [0, 20, 40, 60].forEach((v) => {
      S('line', { x1: this.X(v), x2: this.X(v), y1: 36, y2: 292, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: this.X(v), y: 308, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v + '%' }, svg);
    });
    const key = S('g', { transform: 'translate(170 16)' }, svg);
    S('circle', { cx: 4, cy: 0, r: 4.5, class: 'f-ink' }, key); S('text', { x: 13, y: 4, class: 't2', 'font-size': 10.5, text: 'official leaderboard' }, key);
    S('circle', { cx: 150, cy: 0, r: 4, class: 'f-panel s-ink', 'stroke-width': 1.6 }, key); S('text', { x: 159, y: 4, class: 't2', 'font-size': 10.5, text: 'Artificial Analysis' }, key);
    S('rect', { x: 286, y: -4, width: 8, height: 8, class: 'f-ink3' }, key); S('text', { x: 299, y: 4, class: 't2', 'font-size': 10.5, text: 'Vals' }, key);
    this.rows = TB.map(([n, o, v, a, s, m], i) => {
      const y = 48 + i * 23.5, vals = [v, a, s, m].filter((x) => x != null);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      S('text', { x: 162, y: y + 4, class: o === 'eu' ? 't' : 't2', 'font-size': 11, 'text-anchor': 'end', text: n, style: tcol(o) }, svg);
      const span = S('line', { y1: y, y2: y, class: o === 'eu' ? 's-green' : 's-ink3', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.45 }, svg);
      const marks = [];
      if (v != null) marks.push([S('circle', { cy: y, r: 4.5, class: 'f-ink' }, svg), v]);
      marks.push([S('circle', { cy: y, r: 4, class: 'f-panel ' + (o === 'eu' ? 's-green' : 's-ink'), 'stroke-width': 1.6 }, svg), a]);
      marks.push([S('rect', { y: y - 4, width: 8, height: 8, class: o === 'eu' ? 'f-green' : 'f-ink3' }, svg), s, true]);
      if (m != null) {
        marks.push([S('path', { class: 'f-none s-green', 'stroke-width': 1.6 }, svg), m, 'diamond']);
        S('text', { x: this.X(m) + 10, y: y + 4, class: 't3', 'font-size': 10, text: "Mistral's chart" }, svg);
      }
      const gap = S('text', { x: 578, y: y + 4, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: (hi - lo).toFixed(1) }, svg);
      return { y, lo, hi, span, marks, gap };
    });
    S('text', { x: 578, y: 40, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: 'spread' }, svg);
    const last = this.rows[this.rows.length - 1];
    S('text', { x: this.X(27), y: last.y + 5, class: 'hand', 'font-size': 13.5, text: 'same harness on all three boards' }, svg);
    S('path', { d: handArrow(this.X(26.5), last.y + 1, this.X(21.5), last.y, -0.2), class: 'f-none s-ink2', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
    entrance(this, (k) => this.paint(k), 1100);
  }
  paint(k) {
    this.rows.forEach((r) => {
      const mid = (r.lo + r.hi) / 2, X = (v) => this.X(lerp(mid, v, k));
      attr(r.span, { x1: X(r.lo), x2: X(r.hi) });
      r.marks.forEach(([e, v, kind]) => {
        const x = X(v);
        if (kind === 'diamond') attr(e, { d: `M${x} ${r.y - 5}L${x + 5} ${r.y}L${x} ${r.y + 5}L${x - 5} ${r.y}Z` });
        else if (kind) attr(e, { x: x - 4 }); else attr(e, { cx: x });
      });
      op(r.gap, k);
    });
  }
}

// ── fig 5 · the old version: prompting ─────────────────────────────────────
// Gemini technical report v1 (arXiv 2312.11805), Table 2. GPT-4's CoT@32 run is Google's, through the API.
const MMLU = { five: [['Gemini Ultra', 83.7], ['GPT-4', 86.4]], cot: [['Gemini Ultra', 90.04], ['GPT-4', 87.29]] };
class MlPrompt extends Figure {
  build() {
    const svg = this.svgRoot(600, 170, 'Gemini Ultra and GPT-4 on MMLU under two prompting methods');
    this.B = (v) => 150 + (v - 80) / 12 * 400;
    [80, 84, 88, 92].forEach((v) => {
      S('line', { x1: this.B(v), x2: this.B(v), y1: 30, y2: 120, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: this.B(v), y: 138, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v + '%' }, svg);
    });
    this.rows = ['Gemini Ultra', 'GPT-4'].map((n, i) => {
      const g = S('g', {}, svg);
      S('text', { x: 140, y: 13, class: i ? 't2' : 't', 'font-size': 12, 'text-anchor': 'end', text: n }, g);
      const bar = S('rect', { x: this.B(80), y: 2, height: 15, rx: 2, class: i ? 'f-ink3' : 'f-ink' }, g);
      const val = S('text', { y: 14, class: 't', 'font-size': 11.5 }, g);
      return { n, g, bar, val, v: 0, nv: 0, y: 0, ny: 0 };
    });
    this.note = S('text', { x: 150, y: 160, class: 't3', 'font-size': 10.5 }, svg);
    this.set('five', true);
    pills(this, [['five', '5-shot'], ['cot', 'chain of thought, 32 samples']], 'five', (m) => { this.set(m); tween(this, (k) => this.place(k), 700); });
  }
  set(m, now) {
    const list = MMLU[m], order = [...list].sort((a, b) => b[1] - a[1]).map((r) => r[0]);
    this.rows.forEach((r) => {
      r.v = r.cv ?? r.nv; r.y = r.cy ?? r.ny;
      r.nv = list.find((x) => x[0] === r.n)[1];
      r.ny = 46 + order.indexOf(r.n) * 36;
      if (now) { r.v = r.nv; r.y = r.ny; }
    });
    this.note.textContent = m === 'five' ? 'five worked examples in the prompt, one answer' : '32 reasoned answers, then a vote';
    if (now) this.place(1);
  }
  place(k) {
    this.rows.forEach((r) => {
      const v = r.cv = lerp(r.v, r.nv, k), w = this.B(v) - this.B(80);
      r.cy = lerp(r.y, r.ny, k);
      attr(r.g, { transform: `translate(0 ${r.cy.toFixed(1)})` });
      attr(r.bar, { width: w }); attr(r.val, { x: this.B(80) + w + 6 });
      r.val.textContent = (k < 1 ? v.toFixed(1) : String(+v.toFixed(2))) + '%';
    });
  }
}

define({ 'ml-gap': MlGap, 'ml-board': MlBoard, 'ml-cost': MlCost, 'ml-boards': MlBoards, 'ml-prompt': MlPrompt });
