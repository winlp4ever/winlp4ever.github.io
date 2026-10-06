// Figures for "DeepSeek V4.1 vs GLM-5.3, and how far both are from Claude Code and Codex".
// Encoding used everywhere: GLM = green, DeepSeek = ochre, Claude / GPT = ink.
// Filled dot = big tier (GLM-5.3, V4-Pro), ring = small tier (GLM-5.3-Flash, V4.1-Flash).
// Data fetched 2026-10-06; sources are in each figure's caption.
import { S, H, attr, op, seg, ease, inout, lerp, clamp, REDUCED, STILL, Figure, define } from './core.js';

const M = {
  glm: { name: 'GLM-5.3', c: 'green', big: true },
  glmf: { name: 'GLM-5.3-Flash', c: 'green', big: false },
  ds: { name: 'V4.1-Flash', c: 'ochre', big: false },
  dsp: { name: 'V4-Pro', c: 'ochre', big: true },
  sol: { name: 'GPT-6.1 Sol', c: 'ink', big: true },
};
// a model's dot: filled for big tier, ring for small tier, ink ring for closed models
function mdot(parent, key, r = 6) {
  const m = M[key];
  if (m.c === 'ink') return S('circle', { r: r - 1, class: 'f-panel s-ink2', 'stroke-width': 1.6 }, parent);
  return m.big ? S('circle', { r, class: 'f-' + m.c }, parent) : S('circle', { r: r - 0.8, class: 'f-panel s-' + m.c, 'stroke-width': 2.2 }, parent);
}
const tcol = (key) => (M[key].c === 'green' ? 'var(--green-t)' : M[key].c === 'ochre' ? 'var(--ochre-t)' : 'var(--ink-2)');

// static charts: draw at k = 0..1 once, the first time they're on screen
function entrance(fig, paint, ms = 900) {
  fig.idleText = 'static';
  paint(STILL || REDUCED ? 1 : 0);
  fig.onVisible = (v) => {
    if (!v || fig._shown) return; fig._shown = true;
    if (STILL || REDUCED) return paint(1);
    const t0 = performance.now();
    const f = (now) => { const k = clamp((now - t0) / ms); paint(ease(k)); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  };
}
function pills(fig, items, value, on) {
  const bar = fig.querySelector('.fc') || H('div', { class: 'fc' }, fig);
  const btns = items.map(([v, label]) => {
    const b = H('button', { class: 'pill', type: 'button', text: label, 'aria-pressed': String(v === value) }, bar);
    b.onclick = () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); on(v); };
    return b;
  });
  return bar;
}

// ── fig 1 · the two weight classes ─────────────────────────────────────────
// Artificial Analysis, max effort, first-party APIs (2026-10-06).
const TIERS = [
  { k: 'AA index', u: 'points', max: 60, opus: 57.6, fmt: (v) => v.toFixed(1), v: { ds: 39.5, glmf: 41.8, glm: 44.8, dsp: 36.0 } },
  { k: 'Terminal-Bench 4.0', u: '% of tasks solved', max: 70, opus: 60, fmt: (v) => Math.round(v) + '%', v: { ds: 26.8, glmf: 33, glm: 41.9, dsp: 14.1 } },
  { k: 'AutomationBench', u: '% of tasks solved', max: 80, opus: 70, fmt: (v) => Math.round(v) + '%', v: { ds: 68.9, glmf: 60, glm: 62.2, dsp: 56.7 } },
  { k: 'output speed', u: 'tokens per second', max: 250, opus: 97, fmt: (v) => Math.round(v), v: { ds: 227, glmf: 53, glm: 73, dsp: 99 } },
  { k: 'cost per task', u: 'lower is better', max: 2.2, opus: 5.98, fmt: (v) => '$' + v.toFixed(2), v: { ds: 0.27, glmf: 0.25, glm: 2.01, dsp: 0.67 } },
];
class GxTiers extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'Four open models in two weight classes on five measures, with Claude Opus 5.5 as reference');
    const P = [{ x0: 172, x1: 370, a: 'ds', b: 'glmf', t: 'SMALL CLASS' }, { x0: 398, x1: 586, a: 'dsp', b: 'glm', t: 'BIG CLASS' }];
    P.forEach((p) => {
      S('text', { x: p.x0, y: 24, class: 'sl', 'font-size': 11, text: p.t }, svg);
      [p.a, p.b].forEach((k, i) => {
        const g = S('g', { transform: `translate(${p.x0 + 6 + i * 100} 42)` }, svg);
        attr(mdot(g, k, 5), { cx: 0, cy: -4 });
        S('text', { x: 10, y: 0, class: 't', 'font-size': 11.5, text: M[k].name, style: `fill:${tcol(k)}` }, g);
      });
    });
    this.rows = TIERS.map((r, i) => {
      const y = 92 + i * 50;
      S('text', { x: 20, y: y - 2, class: 't', 'font-size': 13, text: r.k }, svg);
      S('text', { x: 20, y: y + 13, class: 't3', 'font-size': 10.5, text: r.u }, svg);
      return P.map((p) => {
        const X = (v) => p.x0 + clamp(v / r.max) * (p.x1 - p.x0);
        S('line', { x1: p.x0, x2: p.x1, y1: y, y2: y, class: 's-rule', 'stroke-width': 1 }, svg);
        if (r.opus <= r.max) {
          S('line', { x1: X(r.opus), x2: X(r.opus), y1: y - 9, y2: y + 9, class: 's-ink3', 'stroke-width': 1.5 }, svg);
          if (i === 0 && p.a === 'dsp') S('text', { x: X(r.opus) + 6, y: y - 12, class: 't3', 'font-size': 10, 'text-anchor': 'start', text: 'Opus' }, svg);
        } else S('text', { x: p.x1, y: y + 22, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: `Opus 5.5 ${r.fmt(r.opus)} →` }, svg);
        const dots = [p.a, p.b].map((k) => ({ k, d: mdot(svg, k), t: S('text', { 'font-size': 11, class: 't', 'text-anchor': 'middle', style: `fill:${tcol(k)}` }, svg) }));
        return { X, y, r, dots };
      });
    });
    entrance(this, (k) => this.paint(k));
  }
  paint(k) {
    this.rows.forEach((pair) => pair.forEach(({ X, y, r, dots }) => {
      const xs = dots.map((o) => X(r.v[o.k] * k));
      const close = Math.abs(xs[0] - xs[1]) < 34;
      dots.forEach((o, i) => {
        attr(o.d, { cx: xs[i], cy: y });
        attr(o.t, { x: xs[i], y: close && i === 1 ? y + 21 : y - 11 });
        o.t.textContent = r.fmt(r.v[o.k] * k);
      });
    }));
  }
}

// ── fig 2 · best open vs best closed ───────────────────────────────────────
// AA Intelligence Index v4.3.2 with release dates (from the AA block on openrouter.ai/rankings).
const CLOSED = [['2025-11-24', 29.1, 'Opus 4.5'], ['2025-12-11', 30.4, 'GPT-5.2'], ['2026-02-05', 31.9, 'Opus 4.6'], ['2026-02-24', 32.5, 'GPT-5.3 Codex'],
  ['2026-03-05', 39, 'GPT-5.4'], ['2026-04-16', 40.7, 'Opus 4.7'], ['2026-05-28', 41.8, 'Opus 4.8'], ['2026-06-09', 49.6, 'Fable 5'],
  ['2026-07-23', 50.8, 'Opus 5'], ['2026-08-03', 53.4, 'Qwen3.8 Max'], ['2026-09-21', 57.6, 'Opus 5.5']];
// [date, score, label, colour, (big?), label dx, label dy, anchor]
const OPEN = [['2026-02-11', 27.9, 'GLM-5', 'green', true, 0, 17, 'middle'], ['2026-04-23', 30.4, 'V4 Pro', 'ochre', true, 0, -9, 'middle'], ['2026-06-16', 33.7, 'GLM-5.2', 'green', true, 0, -9, 'middle'],
  ['2026-07-15', 43.6, 'Kimi K3', 'ink', true, -6, -8, 'end'], ['2026-08-16', 44.8, 'GLM-5.3', 'green', true, 0, -10, 'middle'], ['2026-09-21', 46.3, 'MiMo-V2.6-Pro', 'ink', true, 0, -9, 'end']];
const FAMILY = [['2026-07-31', 34.3, 'V4-Flash 0731', 'ochre', false, 0, 17, 'middle'], ['2026-08-13', 36.0, 'V4-Pro 0813', 'ochre', true, 8, 4, 'start'],
  ['2026-08-26', 41.8, 'GLM-5.3-Flash', 'green', false, -8, 4, 'end'], ['2026-09-10', 39.5, 'V4.1-Flash', 'ochre', false, 8, 4, 'start']];
const D = (s) => Date.parse(s + 'T00:00:00Z') / 864e5;
const best = (list, d) => { let v = null; for (const r of list) if (D(r[0]) <= d) v = r; return v; };
export function lagAt(d) {
  const o = best(OPEN, d); if (!o) return null;
  const c = CLOSED.find((r) => r[1] >= o[1]);
  return { open: o, closed: c, days: Math.round(d - D(c[0])) };
}
class GxGap extends Figure {
  constructor() { super(); this.duration = 11; this.poster = 11; }
  build() {
    const svg = this.svgRoot(600, 320, 'Best open and best closed model scores through 2026, and how many days the open models are behind');
    this.d0 = D('2026-01-01'); this.d1 = D('2026-10-06'); this.dStart = D('2026-02-11');
    this.X = (d) => 56 + (Math.max(d, this.d0) - this.d0) / (this.d1 - this.d0) * 520;
    this.Y = (v) => 266 - (v - 25) / 35 * 226;
    [30, 40, 50, 60].forEach((v) => {
      S('line', { x1: 56, x2: 576, y1: this.Y(v), y2: this.Y(v), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 48, y: this.Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v }, svg);
    });
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct'].forEach((m, i) => {
      S('text', { x: this.X(D(`2026-${String(i + 1).padStart(2, '0')}-01`)), y: 286, class: 't3', 'font-size': 11, text: m }, svg);
    });
    const step = (list, from) => {
      let d = '', prev = null;
      for (let day = from; day <= this.d1; day += 1) {
        const r = best(list, day); if (!r) continue;
        const x = this.X(day).toFixed(1), y = this.Y(r[1]).toFixed(1);
        if (!prev) d += `M${x} ${y}`; else if (prev !== r) d += `L${x} ${this.Y(prev[1]).toFixed(1)}L${x} ${y}`;
        prev = r;
      }
      return d + `L${this.X(this.d1)} ${this.Y(prev[1]).toFixed(1)}`;
    };
    this.closedPath = S('path', { d: step(CLOSED, this.d0), class: 'f-none s-ink', 'stroke-width': 2 }, svg);
    this.openPath = S('path', { d: step(OPEN, this.dStart), class: 'f-none s-ink3', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
    S('text', { x: this.X(D('2026-01-08')), y: this.Y(30.4) - 8, class: 't', 'font-size': 11.5, text: 'best closed' }, svg);
    S('text', { x: this.X(D('2026-05-01')), y: this.Y(30.4) + 16, class: 't3', 'font-size': 11.5, text: 'best open' }, svg);
    [['2026-03-05', 39, 'GPT-5.4', 'end', -4], ['2026-06-09', 49.6, 'Fable 5', 'end', -4], ['2026-09-21', 57.6, 'Opus 5.5', 'end', -4]].forEach(([d, v, n, a, dx]) => S('text', { x: this.X(D(d)) + dx, y: this.Y(v) - 6, class: 't2', 'font-size': 10.5, 'text-anchor': a, text: n }, svg));
    const dot = ([d, v, label, c, big, dx, dy, anchor]) => {
      const g = S('g', {}, svg), x = this.X(D(d)), y = this.Y(v);
      if (c === 'ink') S('circle', { cx: x, cy: y, r: 4, class: 'f-ink3' }, g);
      else if (big) S('circle', { cx: x, cy: y, r: 5, class: 'f-' + c }, g);
      else S('circle', { cx: x, cy: y, r: 4.2, class: 'f-panel s-' + c, 'stroke-width': 2 }, g);
      S('text', { x: x + dx, y: y + dy, class: 't2', 'font-size': 10, 'text-anchor': anchor, text: label, style: c === 'ink' ? '' : `fill:var(--${c}-t)` }, g);
      return { g, day: D(d) };
    };
    this.dots = [...OPEN, ...FAMILY].map(dot);
    this.head = S('line', { y1: 36, y2: 270, class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
    this.lagLine = S('path', { class: 'f-none s-ink2', 'stroke-width': 1.6 }, svg);
    this.read = S('text', { x: 60, y: 24, class: 't', 'font-size': 13 }, svg);
    this.read2 = S('text', { x: 60, y: 304, class: 't3', 'font-size': 11 }, svg);
  }
  day(t) { return Math.round(lerp(this.dStart, this.d1, inout(seg(t, 0.3, 9.5)))); }
  label(t) { return new Date(this.day(t) * 864e5).toISOString().slice(5, 10); }
  render(t) {
    const d = this.day(t), x = this.X(d), L = lagAt(d);
    attr(this.head, { x1: x, x2: x });
    this.dots.forEach((o) => op(o.g, d >= o.day ? 1 : 0.15));
    const xc = this.X(D(L.closed[0])), y = this.Y(L.open[1]);
    this.lagLine.setAttribute('d', `M${xc} ${y}H${x} M${xc + 6} ${y - 4}L${xc} ${y}L${xc + 6} ${y + 4}`);
    const date = new Date(d * 864e5).toISOString().slice(0, 10);
    this.read.textContent = `${date}: best open is ${L.open[2]} (${L.open[1]}), ${L.days} days behind`;
    this.read2.textContent = `${L.closed[2]} first reached ${L.open[1]} on ${L.closed[0]}`;
  }
}

// ── fig 3 · share of Opus 5.5, by task ─────────────────────────────────────
// AA (AutomationBench-AA, AA-LCR, Terminal-Bench 4.0) and Andon Labs Vending-Bench 2, as % of Opus 5.5.
const TASKS = [
  { k: 'AutomationBench', u: 'tool-heavy business automation', v: { ds: 98.4, glmf: 85.7, glm: 88.9, dsp: 81.0, sol: 92.9 } },
  { k: 'AA-LCR', u: 'questions over long documents', v: { ds: 98.8, glmf: 94.1, glm: 93.8, dsp: 94.5, sol: 97.6 } },
  { k: 'Terminal-Bench 4.0', u: 'long tasks in a terminal', v: { ds: 44.7, glmf: 55.0, glm: 69.8, dsp: 23.5, sol: 93.3 } },
  { k: 'Vending-Bench 2', u: 'a simulated year of business', v: { glm: 88.4, dsp: 35.6 } },
];
class GxTasks extends Figure {
  build() {
    this.sel = null;
    const svg = this.svgRoot(600, 300, 'Each model as a share of Claude Opus 5.5 on four benchmarks');
    this.X = (p) => 250 + p / 110 * 330;
    [0, 25, 50, 75, 100].forEach((p) => {
      S('line', { x1: this.X(p), x2: this.X(p), y1: 44, y2: 262, class: p === 100 ? 's-ink3' : 's-rule', 'stroke-width': p === 100 ? 1.5 : 1, 'stroke-dasharray': p === 100 ? '' : '2 4' }, svg);
      S('text', { x: this.X(p), y: 282, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: p + '%' }, svg);
    });
    S('text', { x: this.X(100), y: 34, class: 't2', 'font-size': 11, 'text-anchor': 'middle', text: 'Opus 5.5' }, svg);
    this.rows = TASKS.map((r, i) => {
      const y = 76 + i * 56;
      S('text', { x: 20, y: y - 2, class: 't', 'font-size': 13, text: r.k }, svg);
      S('text', { x: 20, y: y + 13, class: 't3', 'font-size': 10.5, text: r.u }, svg);
      S('line', { x1: this.X(0), x2: this.X(110), y1: y, y2: y, class: 's-rule', 'stroke-width': 1 }, svg);
      const dots = Object.entries(r.v).map(([k, v]) => {
        const g = S('g', {}, svg);
        const d = mdot(g, k, 6); attr(d, { cy: y });
        const t = S('text', { y: y - 11, class: 't', 'font-size': 10.5, 'text-anchor': 'middle', style: `fill:${tcol(k)}` }, g);
        return { k, v, g, d, t };
      });
      return { r, y, dots };
    });
    pills(this, [[null, 'all models'], ...Object.entries(M).map(([k, m]) => [k, m.name])], null, (v) => { this.sel = v; this.paint(1); });
    entrance(this, (k) => this.paint(k));
    this.idleText = 'interactive';
  }
  paint(k) {
    this.rows.forEach(({ dots }) => dots.forEach((o) => {
      const x = this.X(o.v * k);
      attr(o.d, { cx: x }); attr(o.t, { x });
      const on = this.sel === null || this.sel === o.k;
      op(o.g, on ? 1 : 0.18);
      o.t.textContent = this.sel === o.k ? Math.round(o.v) + '%' : '';
    }));
  }
}

// ── fig 4 · one model, several harnesses ───────────────────────────────────
// Top: DeepSeek V4.1-Flash model card (Terminal-Bench 2.1). Bottom: tbench.ai Terminal-Bench 4.0, tokens per trial.
const HARN = [['Codex', 84.1], ['OpenCode', 85.0], ['Pi', 86.1], ['Claude Code', 88.0], ['mini-SWE', 90.3], ['DeepSeek harness', 90.6]];
const TOKS = [['Claude Code', [['Opus 5.5', 24.3, 'ink'], ['GLM-5.3', 26.3, 'green'], ['Sonnet 5.5', 58.8, 'ink']]], ['Codex', [['GPT-6 Astra', 2.7, 'ink'], ['GPT-6.1 Sol', 4.4, 'ink'], ['GPT-6 Luna', 11.8, 'ink']]]];
class GxHarness extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'V4.1-Flash scores across harnesses, and tokens per task in Claude Code versus Codex');
    this.X = (v) => 60 + (v - 83) / 9 * 500;
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'TERMINAL-BENCH 2.1, SAME MODEL' }, svg);
    S('line', { x1: 60, x2: 560, y1: 78, y2: 78, class: 's-rule', 'stroke-width': 1 }, svg);
    [84, 86, 88, 90, 92].forEach((v) => S('text', { x: this.X(v), y: 140, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v }, svg));
    this.h = HARN.map(([n, v], i) => {
      const g = S('g', {}, svg), d = mdot(g, 'ds', 6); attr(d, { cy: 78 });
      const t = S('text', { y: i % 2 ? 100 : 62, class: 't2', 'font-size': 10.5, 'text-anchor': 'middle', text: `${n} ${v}` }, g);
      return { v, d, t };
    });
    const gg = S('g', {}, svg), gd = mdot(gg, 'glm', 6); attr(gd, { cx: this.X(88.2), cy: 120 });
    S('text', { x: this.X(88.2) + 10, y: 124, class: 't', 'font-size': 10.5, text: 'GLM-5.3 in Claude Code 88.2', style: 'fill:var(--green-t)' }, gg);
    S('text', { x: 20, y: 178, class: 'sl', 'font-size': 11, text: 'TOKENS PER TASK, TERMINAL-BENCH 4.0 (MILLIONS)' }, svg);
    this.B = (v) => 170 + v / 60 * 390;
    this.bars = [];
    let y = 200;
    TOKS.forEach(([h, rows]) => {
      S('text', { x: 20, y: y + 10, class: 't', 'font-size': 12, text: h }, svg);
      rows.forEach(([n, v, c]) => {
        S('text', { x: 162, y: y + 9, class: 't2', 'font-size': 10.5, 'text-anchor': 'end', text: n, style: c === 'green' ? 'fill:var(--green-t)' : '' }, svg);
        const b = S('rect', { x: 170, y: y, height: 11, rx: 2, class: c === 'green' ? 'f-green' : 'f-ink3' }, svg);
        const t = S('text', { y: y + 9.5, class: 't2', 'font-size': 10.5 }, svg);
        this.bars.push({ v, b, t });
        y += 17;
      });
      y += 10;
    });
    entrance(this, (k) => this.paint(k));
  }
  paint(k) {
    this.h.forEach((o) => { const x = this.X(lerp(87, o.v, k)); attr(o.d, { cx: x }); attr(o.t, { x }); op(o.t, k); });
    this.bars.forEach((o) => { const w = o.v / 60 * 390 * k; attr(o.b, { width: Math.max(1, w) }); attr(o.t, { x: 176 + w }); o.t.textContent = (o.v * k).toFixed(1); });
  }
}

// ── fig 5 · cost per solved task ───────────────────────────────────────────
// tbench.ai Terminal-Bench 4.0 board at list prices; GLM-5.3's token mix (330 trials) repriced per host.
const BOARD = [['GPT-6 Luna', 16.4, 1.34], ['GPT-6.1 Sol', 58.2, 3.30], ['GPT-6 Astra (low)', 50.6, 9.33], ['Fable 5.1 (low)', 43.3, 16.49], ['Opus 5.5', 64.85, 22.05], ['Sonnet 5.5', 61.8, 35.95]];
const MIX = { u: 164.3, c: 8444, o: 68.66, n: 330, p: 0.418 }; // millions of tokens, trials, success rate
const HOSTS = [
  ['zai', 'Z.ai API', [1.40, 0.26, 4.40]], ['base', 'BaseTen', [1.40, 0.14, 4.40]], ['dinf', 'DeepInfra', [0.5625, 0.125, 2.50]],
  ['nov', 'Novita', [0.42, 0.078, 1.32]], ['plan', 'Coding Plan, off-peak', [6.9, 1.7, 24], 0.72], ['dsp', 'at DeepSeek prices', [0.15, 0.003, 0.60]],
];
export function glmCost([pi, pc, po], fixed) {
  const parts = [MIX.u * pi, MIX.c * pc, MIX.o * po];
  let per = parts.reduce((a, b) => a + b) / MIX.n;
  const k = fixed ? fixed / per : 1;
  per *= k;
  const tot = parts.reduce((a, b) => a + b);
  return { task: per, solved: per / MIX.p, share: parts.map((x) => x / tot) };
}
class GxCost extends Figure {
  build() {
    this.idleText = 'interactive'; this.host = 'zai';
    const svg = this.svgRoot(600, 360, 'Cost per solved task against success rate on Terminal-Bench 4.0, with GLM-5.3 repriced by host');
    this.X = (c) => 64 + (Math.log10(c) - Math.log10(0.5)) / (Math.log10(50) - Math.log10(0.5)) * 500;
    this.Y = (p) => 240 - (p - 10) / 60 * 200;
    [0.5, 1, 2, 5, 10, 20, 50].forEach((c) => {
      S('line', { x1: this.X(c), x2: this.X(c), y1: 36, y2: 240, class: 's-rule', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, svg);
      S('text', { x: this.X(c), y: 256, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: '$' + c }, svg);
    });
    [20, 40, 60].forEach((p) => S('text', { x: 56, y: this.Y(p) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: p + '%' }, svg));
    S('text', { x: 64, y: 24, class: 'sl', 'font-size': 11, text: 'SOLVED ↑   $ PER SOLVED TASK →' }, svg);
    const fr = [BOARD[0], BOARD[1], BOARD[4]];
    S('path', { d: 'M' + fr.map((b) => `${this.X(b[2])} ${this.Y(b[1])}`).join(' L'), class: 'f-none s-ink3', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }, svg);
    S('text', { x: this.X(8), y: this.Y(63.5), class: 't3', 'font-size': 10.5, text: 'frontier' }, svg);
    BOARD.forEach(([n, p, c]) => {
      const left = n.startsWith('Fable');
      S('circle', { cx: this.X(c), cy: this.Y(p), r: 5, class: 'f-panel s-ink2', 'stroke-width': 1.6 }, svg);
      S('text', { x: this.X(c) + (left ? -8 : 8), y: this.Y(p) + 4, class: 't2', 'font-size': 10.5, 'text-anchor': left ? 'end' : 'start', text: n }, svg);
    });
    const z = glmCost(HOSTS[0][2]);
    S('circle', { cx: this.X(z.solved), cy: this.Y(41.8), r: 6, class: 'f-none s-green', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }, svg);
    this.trail = S('line', { y1: this.Y(41.8), y2: this.Y(41.8), class: 's-green', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }, svg);
    this.g = S('circle', { cy: this.Y(41.8), r: 7, class: 'f-green' }, svg);
    this.gt = S('text', { y: this.Y(41.8) + 23, class: 't', 'font-size': 11.5, 'text-anchor': 'middle', style: 'fill:var(--green-t)' }, svg);
    // the bill underneath
    S('text', { x: 20, y: 292, class: 't', 'font-size': 12, text: 'GLM-5.3 bill' }, svg);
    this.billT = S('text', { x: 20, y: 308, class: 't3', 'font-size': 10.5 }, svg);
    this.segs = ['f-ink', 'f-green', 'f-ink3'].map((cl) => S('rect', { y: 282, height: 18, class: cl }, svg));
    this.segT = [0, 1, 2].map(() => S('text', { y: 318, class: 't2', 'font-size': 10.5 }, svg));
    [['f-ink', 'new input'], ['f-green', 'cache reads'], ['f-ink3', 'output']].forEach(([c, n], i) => {
      S('rect', { x: 330 + i * 92, y: 334, width: 9, height: 9, rx: 2, class: c }, svg);
      S('text', { x: 343 + i * 92, y: 342, class: 't3', 'font-size': 10.5, text: n }, svg);
    });
    pills(this, HOSTS.map(([k, n]) => [k, n]), 'zai', (v) => this.go(v));
    this.cur = z.solved; this.paint(this.cur, glmCost(HOSTS[0][2]));
  }
  go(k) {
    const h = HOSTS.find((x) => x[0] === k), to = glmCost(h[2], h[3]), from = this.cur, t0 = performance.now();
    const f = (now) => {
      const e = REDUCED ? 1 : inout(clamp((now - t0) / 700));
      this.cur = Math.exp(lerp(Math.log(from), Math.log(to.solved), e)); this.paint(this.cur, to);
      if (e < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }
  paint(solved, c) {
    const x = this.X(solved), zx = this.X(glmCost(HOSTS[0][2]).solved);
    attr(this.g, { cx: x }); attr(this.gt, { x }); this.gt.textContent = `GLM-5.3 $${solved.toFixed(2)}`;
    attr(this.trail, { x1: Math.min(x, zx), x2: Math.max(x, zx) });
    this.billT.textContent = `$${c.task.toFixed(2)} per task`;
    let bx = 150; const W = 430;
    ['new input', 'cache reads', 'output'].forEach((n, i) => {
      const w = c.share[i] * W;
      attr(this.segs[i], { x: bx, width: Math.max(0, w - 1) });
      attr(this.segT[i], { x: bx }); this.segT[i].textContent = w > 60 ? `${n} ${Math.round(c.share[i] * 100)}%` : '';
      bx += w;
    });
  }
}

// ── fig 6 · share of tokens and of spend ───────────────────────────────────
// OpenRouter public rankings API, 2026-10-05, all models.
const SHARE = [['V4.1-Flash', 25.0, 6.0, 'ds'], ['older DeepSeek', 6.5, 4.4, 'dsp'], ['GLM-5.3-Flash', 6.3, 3.5, 'glmf'], ['GLM-5.3', 1.9, 3.4, 'glm'],
  ['Anthropic (all)', 4.2, 30.8, null], ['OpenAI (all)', 8.8, 22.9, null], ['Google (all)', 3.7, 11.7, null]];
class GxShare extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Share of OpenRouter tokens and of spend by model family');
    const cols = [{ x: 170, t: 'SHARE OF TOKENS' }, { x: 390, t: 'SHARE OF SPEND' }];
    cols.forEach((c) => S('text', { x: c.x, y: 24, class: 'sl', 'font-size': 11, text: c.t }, svg));
    this.W = (v) => v / 32 * 180;
    this.rows = SHARE.map(([n, tok, usd, k], i) => {
      const y = 50 + i * 34, cls = k ? (M[k].big ? 'f-' + M[k].c : 'f-' + M[k].c) : 'f-ink3';
      S('text', { x: 20, y: y + 12, class: 't', 'font-size': 12.5, text: n, style: k ? `fill:${tcol(k)}` : '' }, svg);
      const bars = [tok, usd].map((v, j) => {
        const b = S('rect', { x: cols[j].x, y, height: 16, rx: 2, class: cls, opacity: k && !M[k].big ? 0.55 : 1 }, svg);
        const t = S('text', { y: y + 12.5, class: 't2', 'font-size': 11 }, svg);
        return { v, b, t, x: cols[j].x };
      });
      return bars;
    });
    entrance(this, (k) => this.paint(k));
  }
  paint(k) {
    this.rows.forEach((bars) => bars.forEach((o) => {
      const w = this.W(o.v) * k;
      attr(o.b, { width: Math.max(1, w) }); attr(o.t, { x: o.x + w + 6 }); o.t.textContent = (o.v * k).toFixed(1) + '%';
    }));
  }
}

define({ 'gx-tiers': GxTiers, 'gx-gap': GxGap, 'gx-tasks': GxTasks, 'gx-harness': GxHarness, 'gx-cost': GxCost, 'gx-share': GxShare });
