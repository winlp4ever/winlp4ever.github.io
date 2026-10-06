// Figures for "GLM-5.3 vs DeepSeek V4 Flash".
// Colour code, every figure: GLM-5.3 = green, DeepSeek V4 Flash = ochre.
// All data is copied from the sources linked in the post (fetched 2026-10-06).
import { S, H, attr, op, seg, ease, inout, lerp, clamp, pct, critter, handArrow, drawOn, REDUCED, STILL, Figure, define } from './core.js';

const G = 'var(--green)', O = 'var(--ochre)';
const money = (x) => (x < 0.995 ? '$' + x.toFixed(x < 0.1 ? 3 : 2) : '$' + x.toFixed(2));

// small helpers for interactive figures
function controls(fig) { return H('div', { class: 'fc' }, fig); }
function slider(bar, label, min, max, step, value, fmt, on) {
  const wrap = H('label', { class: 'mono', style: 'display:flex;align-items:center;gap:8px;flex:1 1 260px;min-width:240px' }, bar);
  H('span', { text: label, style: 'white-space:nowrap' }, wrap);
  const r = H('input', { type: 'range', min, max, step, value, 'aria-label': label }, wrap);
  const v = H('span', { class: 'fc-l', style: 'min-width:6ch' }, wrap);
  const upd = () => { v.textContent = fmt(+r.value); on(+r.value); };
  r.addEventListener('input', upd);
  return { r, upd, set(x) { r.value = x; upd(); } };
}
function pills(bar, items, value, on) {
  const btns = items.map(([v, label]) => {
    const b = H('button', { class: 'pill', type: 'button', text: label, 'aria-pressed': String(v === value) }, bar);
    b.onclick = () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); on(v); };
    return b;
  });
  return btns;
}

// ── fig 1 · which model is "deepseek-v4-flash"? ────────────────────────────
// Dates: DeepSeek V4 card + news260910; Z.ai GLM-5.3 blog / release notes; OpenRouter.
const EVENTS = [
  // pos: label above (-1) or below (+1) the lane, level 1 or 2 above; anchor
  { d: '2026-04-24', lane: 0, name: 'V4-Flash preview', sub: '284B · 13B active', act: 13, pos: -1, anchor: 'start' },
  { d: '2026-07-31', lane: 0, name: 'V4-Flash-0731', sub: 'new post-training', act: 13, pos: 1, anchor: 'end' },
  { d: '2026-08-16', lane: 0, name: 'peak price ×3', sub: '$0.14 → $0.44 in', act: 0, pos: -2, anchor: 'middle' },
  { d: '2026-09-10', lane: 0, name: 'V4.1-Flash', sub: '552B · 16B active', act: 16, pos: -1, anchor: 'end' },
  { d: '2026-08-14', lane: 1, name: 'GLM-5.3', sub: '744B · 40B active', act: 40, pos: -1, anchor: 'end' },
  { d: '2026-08-26', lane: 1, name: 'GLM-5.3-Flash', sub: '320B · 18B active', act: 18, pos: -1, anchor: 'start' },
];
const day = (s) => Date.parse(s + 'T00:00:00Z') / 864e5;
class VsLineup extends Figure {
  constructor() { super(); this.duration = 13; this.poster = 13; }
  build() {
    const svg = this.svgRoot(600, 300, 'Release timeline of GLM-5.3 and DeepSeek V4 Flash, and which model the deepseek-v4-flash API name served');
    this.d0 = day('2026-04-10'); this.d1 = day('2026-10-06');
    this.X = (d) => 120 + (d - this.d0) / (this.d1 - this.d0) * 450;
    const ly = [112, 212];
    ['DeepSeek', 'Z.ai'].forEach((t, i) => S('text', { x: 20, y: ly[i] + 4, class: 't2', 'font-size': 12.5, text: t }, svg));
    ly.forEach((y) => S('line', { x1: 120, x2: 570, y1: y, y2: y, class: 's-rule', 'stroke-width': 1 }, svg));
    ['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'].forEach((m) => {
      const x = this.X(day(m));
      S('line', { x1: x, x2: x, y1: 244, y2: 250, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x, y: 263, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: ['may', 'jun', 'jul', 'aug', 'sep', 'oct'][+m.slice(5, 7) - 5] }, svg);
    });
    this.ev = EVENTS.map((e) => {
      const x = this.X(day(e.d)), y = ly[e.lane], g = S('g', {}, svg);
      const r = e.act ? 4 + Math.sqrt(e.act) * 1.3 : 3.5;
      S('circle', { cx: x, cy: y, r, class: e.act === 0 ? 'f-ink3' : e.lane ? 'f-green' : 'f-ochre' }, g);
      const ty = e.pos === 1 ? y + r + 16 : e.pos === -1 ? y - r - 22 : y - 72;
      const tx = e.anchor === 'end' ? x + 4 : e.anchor === 'start' ? x - 4 : x;
      S('text', { x: tx, y: ty, class: 't', 'font-size': 12, 'text-anchor': e.anchor, text: e.name }, g);
      S('text', { x: tx, y: ty + 13, class: 't3', 'font-size': 10.5, 'text-anchor': e.anchor, text: e.sub }, g);
      return { g, x, d: day(e.d) };
    });
    this.head = S('line', { y1: 34, y2: 244, class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    this.rider = S('g', {}, svg); critter(this.rider, 2, 'f-ink2');
    this.api = S('text', { x: 20, y: 290, class: 't', 'font-size': 12.5 }, svg);
    this.apiT = S('tspan', { class: 't3', text: 'deepseek-v4-flash on DeepSeek\u2019s API → ' }, this.api);
    this.apiV = S('tspan', {}, this.api);
    this.note = S('text', { x: 200, y: 162, class: 'hand', 'font-size': 15, text: 'same name, new model' }, svg);
    this.arrow = S('path', { d: handArrow(368, 156, this.X(day('2026-09-10')) - 8, 124, 0.2), class: 'f-none s-ink2', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, svg);
  }
  label(t) { const d = lerp(this.d0, this.d1, inout(seg(t, 0.4, 10.5))); return new Date(d * 864e5).toISOString().slice(5, 10); }
  render(t) {
    const d = lerp(this.d0, this.d1, inout(seg(t, 0.4, 10.5))), x = this.X(d);
    attr(this.head, { x1: x, x2: x });
    this.ev.forEach((e) => op(e.g, ease(clamp((d - e.d) / 6 + 1))));
    const serving = d < day('2026-04-24') ? 'not released yet' : d < day('2026-07-31') ? 'V4-Flash preview' : d < day('2026-09-10') ? 'V4-Flash-0731' : 'V4.1-Flash, a different model';
    this.apiV.textContent = serving;
    this.apiV.setAttribute('class', d >= day('2026-09-10') ? 't' : 't');
    this.apiV.style.fill = d >= day('2026-09-10') ? 'var(--ochre-t)' : '';
    attr(this.rider, { transform: `translate(${Math.min(x, 566) - 11} ${112 - 30})` });
    op(this.rider, d >= day('2026-04-24') ? 1 : 0);
    const late = seg(t, 10.8, 11.8);
    drawOn(this.arrow, late); op(this.arrow, late > 0 ? 1 : 0); op(this.note, seg(t, 11.2, 12));
  }
}

// ── fig 2 · the gap opens with the length of the task ───────────────────────
// Vals.ai (LiveCodeBench, SWE-bench Verified, Vals Index, TB 4.0) and Artificial Analysis (TB 4.0).
const ROWS = [
  { k: 'LiveCodeBench', src: 'Vals · one-shot problems', g: 80.5, d: 87.3 },
  { k: 'SWE-bench Verified', src: 'Vals · single repo fix, saturated', g: 95.4, d: 88.8 },
  { k: 'Vals Index', src: 'Vals · mixed', g: 53.5, d: 48.0 },
  { k: 'Terminal-Bench 4.0', src: 'Vals · long terminal tasks', g: 38.9, d: 18.7 },
  { k: 'Terminal-Bench 4.0', src: 'Artificial Analysis', g: 42, d: 12 },
];
const VENDOR = { k: 'Terminal-Bench 2.1', src: 'each vendor, own harness', g: 88.2, d: 82.7 };
class VsHorizon extends Figure {
  build() {
    this.idleText = 'interactive';
    const svg = this.svgRoot(600, 360, 'Benchmark scores for GLM-5.3 and DeepSeek V4 Flash, ordered from one-shot to long agentic tasks');
    this.X = (v) => 250 + v / 100 * 280;
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'SHORT TASKS ↓ LONG TASKS' }, svg);
    [0, 25, 50, 75, 100].forEach((v) => {
      S('line', { x1: this.X(v), x2: this.X(v), y1: 40, y2: 326, class: 's-rule', 'stroke-width': 1, 'stroke-dasharray': v % 50 ? '2 4' : '' }, svg);
      S('text', { x: this.X(v), y: 346, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v }, svg);
    });
    this.rows = [];
    [...ROWS, VENDOR].forEach((r, i) => {
      const vendor = r === VENDOR, g = S('g', {}, svg), y = vendor ? 306 : 62 + i * 46;
      S('text', { x: 20, y, class: 't', 'font-size': 13, text: r.k }, g);
      S('text', { x: 20, y: y + 14, class: 't3', 'font-size': 10.5, text: r.src }, g);
      const ln = S('line', { y1: y - 4, y2: y - 4, class: 's-ink3', 'stroke-width': 2 }, g);
      const dg = S('circle', { cy: y - 4, r: 6, class: 'f-green' }, g);
      const dd = S('circle', { cy: y - 4, r: 6, class: 'f-ochre' }, g);
      const gap = S('text', { x: 592, y, class: 't2', 'font-size': 12, 'text-anchor': 'end' }, g);
      this.rows.push({ r, g, ln, dg, dd, gap, vendor });
    });
    this.div = S('line', { x1: 20, x2: 590, y1: 278, y2: 278, class: 's-rule', 'stroke-width': 1, 'stroke-dasharray': '4 4' }, svg);
    const lg = S('g', { transform: 'translate(360 24)' }, svg);
    S('circle', { cx: 0, cy: -4, r: 5, class: 'f-green' }, lg); S('text', { x: 9, y: 0, class: 't2', 'font-size': 11.5, text: 'GLM-5.3' }, lg);
    S('circle', { cx: 80, cy: -4, r: 5, class: 'f-ochre' }, lg); S('text', { x: 89, y: 0, class: 't2', 'font-size': 11.5, text: 'V4-Flash-0731' }, lg);
    this.vnote = S('text', { x: 250, y: 274, class: 'hand', 'font-size': 14, text: 'what the launch posts said' }, svg);
    const bar = controls(this);
    this.show = false;
    pills(bar, [[false, 'independent runs'], [true, '+ vendor claims']], false, (v) => { this.show = v; this.paint(1); });
    this.paint(0);
  }
  onVisible(v) {
    if (!v || this.done) return; this.done = true;
    if (STILL || REDUCED) return this.paint(1);
    const t0 = performance.now();
    const f = (now) => { const k = clamp((now - t0) / 900); this.paint(ease(k)); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  paint(k) {
    this.rows.forEach((o) => {
      const { r } = o, mid = (r.g + r.d) / 2;
      const xg = this.X(lerp(mid, r.g, k)), xd = this.X(lerp(mid, r.d, k));
      attr(o.ln, { x1: Math.min(xg, xd), x2: Math.max(xg, xd) });
      attr(o.dg, { cx: xg }); attr(o.dd, { cx: xd });
      const diff = r.g - r.d;
      o.gap.textContent = (diff >= 0 ? 'GLM +' : 'Flash +') + Math.abs(diff).toFixed(1);
      o.gap.style.fill = diff >= 0 ? 'var(--green-t)' : 'var(--ochre-t)';
      op(o.g, o.vendor ? (this.show ? 1 : 0) : 1);
    });
    op(this.vnote, this.show ? 1 : 0); op(this.div, this.show ? 1 : 0);
  }
}

// ── fig 3 · thirty steps on the clock ──────────────────────────────────────
// Speed / TTFT: Artificial Analysis providers pages (2026-09-26 snapshot). Output per step:
// 2,000 tokens for GLM-5.3, 12% fewer for V4-Flash (AA output tokens per task 62k vs 71k). Tool time 3 s.
const LANES = [
  { name: 'GLM-5.3', host: 'Z.ai', tps: 73, ttft: 2.84, out: 2000, c: 'f-green' },
  { name: 'GLM-5.3', host: 'Together', tps: 200, ttft: 0.56, out: 2000, c: 'f-green' },
  { name: 'V4-Flash-0731', host: 'DeepSeek', tps: 226, ttft: 0.89, out: 1750, c: 'f-ochre' },
];
const STEPS = 30, TOOL = 3;
class VsRace extends Figure {
  constructor() { super(); this.duration = 12; this.poster = 12; }
  build() {
    const svg = this.svgRoot(600, 260, 'Wall-clock time of a 30-step agent loop for GLM-5.3 on two hosts and DeepSeek V4 Flash');
    this.lanes = LANES.map((l) => {
      const step = l.ttft + l.out / l.tps + TOOL;
      return { ...l, step, total: step * STEPS };
    });
    this.max = Math.max(...this.lanes.map((l) => l.total));
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'SIMULATED MINUTES' }, svg);
    this.clock = S('text', { x: 580, y: 26, class: 't', 'font-size': 20, 'text-anchor': 'end' }, svg);
    this.lanes.forEach((l, i) => {
      const y = 62 + i * 62;
      S('text', { x: 20, y, class: 't', 'font-size': 13.5, text: l.name }, svg);
      S('text', { x: 20, y: y + 15, class: 't3', 'font-size': 11, text: `${l.host} · ${l.tps} tok/s` }, svg);
      const x0 = 170, w = 330;
      l.cells = Array.from({ length: STEPS }, (_, s) => S('rect', { x: x0 + s * (w / STEPS) + 0.6, y: y - 12, width: w / STEPS - 1.2, height: 20, rx: 2, class: 'f-rule2' }, svg));
      l.cg = S('g', {}, svg); critter(l.cg, 2, l.c);
      l.done = S('text', { x: 590, y: y + 3, class: 't', 'font-size': 13, 'text-anchor': 'end' }, svg);
      l.x0 = x0; l.w = w; l.y = y;
    });
    S('text', { x: 170, y: 246, class: 't3', 'font-size': 11, text: 'each cell is one step: first token + generation + 3 s of tool time' }, svg);
  }
  label(t) { return (this.max * seg(t, 0.3, 11) / 60).toFixed(1) + ' min'; }
  render(t) {
    const now = this.max * seg(t, 0.3, 11);
    this.clock.textContent = (now / 60).toFixed(1) + ' min';
    this.lanes.forEach((l) => {
      const steps = Math.min(STEPS, now / l.step);
      l.cells.forEach((c, s) => { c.setAttribute('class', s < Math.floor(steps) ? l.c : 'f-rule2'); op(c, s < Math.floor(steps) ? 0.85 : 1); });
      attr(l.cg, { transform: `translate(${l.x0 + Math.min(steps, STEPS) / STEPS * l.w - 11} ${l.y - 17})` });
      l.done.textContent = steps >= STEPS ? (l.total / 60).toFixed(1) + ' min' : '';
    });
  }
}

// ── fig 4 · one run, priced ────────────────────────────────────────────────
// Prices per 1M tokens: Z.ai pricing page; DeepSeek V4-Flash-0731 from 2026-08-16 (peak; off-peak is half).
export const PRICE = {
  glm: { miss: 1.40, hit: 0.26, out: 4.40 },
  dsPeak: { miss: 0.44, hit: 0.014, out: 1.32 },
  dsOff: { miss: 0.22, hit: 0.007, out: 0.66 },
};
// context grows linearly from c0 to c1 over n steps; a fraction h of the previous context is a cache hit
export function runCost(p, { n = 30, c0 = 8000, c1 = 120000, h = 0.95, out = 2000 }) {
  let miss = 0, hit = 0, o = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const ctx = n === 1 ? c0 : c0 + (c1 - c0) * i / (n - 1);
    const cached = h * prev;
    miss += (ctx - cached) * p.miss / 1e6; hit += cached * p.hit / 1e6; o += out * p.out / 1e6;
    prev = ctx;
  }
  return { miss, hit, out: o, total: miss + hit + o };
}
class VsBill extends Figure {
  build() {
    this.idleText = 'interactive';
    this.s = { n: 30, c1: 120000, h: 0.95, out: 2000, peak: true };
    const svg = this.svgRoot(600, 250, 'Cost of one agent run for GLM-5.3 and DeepSeek V4 Flash, split into uncached input, cached input and output');
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'COST OF ONE RUN' }, svg);
    const lg = S('g', { transform: 'translate(250 20)' }, svg);
    [['f-ink', 'new input'], ['f-ink3', 'cached input'], ['f-rule2', 'output']].forEach(([c, t], i) => {
      S('rect', { x: i * 108, y: -9, width: 10, height: 10, rx: 2, class: c }, lg);
      S('text', { x: i * 108 + 15, y: 0, class: 't2', 'font-size': 11.5, text: t }, lg);
    });
    this.bars = [['glm', 'GLM-5.3', 'Z.ai list price', 'f-green'], ['ds', 'V4-Flash-0731', 'DeepSeek API', 'f-ochre']].map(([k, name, src, c], i) => {
      const y = 70 + i * 74;
      S('rect', { x: 20, y: y - 14, width: 6, height: 36, rx: 2, class: c }, svg);
      S('text', { x: 34, y, class: 't', 'font-size': 14, text: name }, svg);
      const sub = S('text', { x: 34, y: y + 16, class: 't3', 'font-size': 11, text: src }, svg);
      const segs = ['f-ink', 'f-ink3', 'f-rule2'].map((cl) => S('rect', { y: y - 12, height: 30, class: cl }, svg));
      const tot = S('text', { y: y + 8, class: 't', 'font-size': 16 }, svg);
      return { k, segs, tot, sub, y };
    });
    this.ratio = S('text', { x: 20, y: 222, class: 't', 'font-size': 15 }, svg);
    this.share = S('text', { x: 20, y: 242, class: 't3', 'font-size': 11.5 }, svg);
    const bar = controls(this);
    const re = () => this.paint();
    slider(bar, 'steps', 5, 60, 1, 30, (v) => v, (v) => { this.s.n = v; re(); });
    slider(bar, 'context at the end', 16000, 200000, 4000, 120000, (v) => Math.round(v / 1000) + 'k', (v) => { this.s.c1 = v; re(); });
    slider(bar, 'cache hit', 0, 0.99, 0.01, 0.95, (v) => Math.round(v * 100) + '%', (v) => { this.s.h = v; re(); });
    slider(bar, 'output / step', 500, 5000, 100, 2000, (v) => (v / 1000).toFixed(1) + 'k', (v) => { this.s.out = v; re(); });
    pills(bar, [[true, 'deepseek peak'], [false, 'off-peak']], true, (v) => { this.s.peak = v; re(); });
    this.paint();
  }
  paint() {
    const s = this.s, base = { n: s.n, c0: 8000, c1: s.c1, h: s.h };
    const r = {
      glm: runCost(PRICE.glm, { ...base, out: s.out }),
      ds: runCost(s.peak ? PRICE.dsPeak : PRICE.dsOff, { ...base, out: Math.round(s.out * 0.875) }),
    };
    const max = Math.max(r.glm.total, r.ds.total), W = 330, x0 = 200;
    this.bars.forEach((b) => {
      const c = r[b.k]; let x = x0;
      [c.miss, c.hit, c.out].forEach((v, i) => { const w = v / max * W; attr(b.segs[i], { x, width: Math.max(0, w - (w > 2 ? 1 : 0)) }); x += w; });
      attr(b.tot, { x: x + 8 }); b.tot.textContent = money(c.total);
      if (b.k === 'ds') b.sub.textContent = 'DeepSeek API, ' + (s.peak ? 'peak' : 'off-peak');
    });
    const k = r.glm.total / r.ds.total;
    this.ratio.textContent = `GLM-5.3 costs ${k.toFixed(1)}× more for the same run`;
    this.share.textContent = `output is ${Math.round(r.glm.out / r.glm.total * 100)}% of the GLM bill and ${Math.round(r.ds.out / r.ds.total * 100)}% of the DeepSeek one`;
  }
}

// ── fig 5 · the prefix is an object ────────────────────────────────────────
// KV bytes per token, my estimate from each config.json at FP8:
// GLM-5.3: 78 layers × (512 latent + 64 rope) + DSA indexer keys ≈ 48 KB.
// V4-Flash: 21 layers at ÷4 and 20 at ÷128 of a 512-dim KV + FP4 indexer ≈ 3.1 KB.
const KB = { glm: 48, ds: 3.1 };
class VsPrefix extends Figure {
  build() {
    this.idleText = 'interactive';
    const svg = this.svgRoot(600, 230, 'Memory needed to keep a cached prompt prefix, GLM-5.3 versus DeepSeek V4 Flash');
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'KV CACHE FOR ONE PREFIX' }, svg);
    this.lenT = S('text', { x: 580, y: 26, class: 't', 'font-size': 18, 'text-anchor': 'end' }, svg);
    this.rows = [['glm', 'GLM-5.3', '≈48 KB / token · cache hit $0.26 per 1M', 'f-green'], ['ds', 'V4-Flash-0731', '≈3.1 KB / token · cache hit $0.014 per 1M', 'f-ochre']].map(([k, n, sub, c], i) => {
      const y = 76 + i * 64;
      S('text', { x: 20, y, class: 't', 'font-size': 14, text: n }, svg);
      S('text', { x: 20, y: y + 15, class: 't3', 'font-size': 11, text: sub }, svg);
      const bar = S('rect', { x: 20, y: y + 24, height: 14, rx: 3, class: c }, svg);
      const v = S('text', { y: y + 36, class: 't', 'font-size': 13 }, svg);
      return { k, bar, v };
    });
    this.note = S('text', { x: 20, y: 218, class: 'hand', 'font-size': 14 }, svg);
    const bar = controls(this);
    this.sl = slider(bar, 'prompt length', 0, 100, 1, 52, (v) => this.fmtLen(this.len(v)), (v) => this.paint(this.len(v)));
    this.sl.upd();
  }
  len(v) { return Math.round(8000 * Math.pow(125, v / 100) / 1000) * 1000; }
  fmtLen(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n / 1000) + 'k'; }
  paint(n) {
    const gb = { glm: n * KB.glm / 1e6, ds: n * KB.ds / 1e6 }, W = 470, scale = W / gb.glm;
    this.lenT.textContent = this.fmtLen(n) + ' tokens';
    this.rows.forEach((r) => {
      const w = Math.max(2, gb[r.k] * scale);
      attr(r.bar, { width: w }); attr(r.v, { x: Math.min(20 + w + 8, 540) });
      r.v.textContent = gb[r.k] < 1 ? Math.round(gb[r.k] * 1000) + ' MB' : gb[r.k].toFixed(1) + ' GB';
    });
    this.note.textContent = `same prefix, ${Math.round(KB.glm / KB.ds)}× more bytes to keep around`;
  }
}

// ── fig 6 · cost per solved task ───────────────────────────────────────────
// Run cost: fig 4 defaults (30 steps, 8k → 120k, 95% hits, DeepSeek peak). Success rates: the benchmark presets.
const RUN = { glm: runCost(PRICE.glm, { out: 2000 }).total, ds: runCost(PRICE.dsPeak, { out: 1750 }).total };
const TASKS = {
  tb4: { label: 'long terminal tasks', src: 'Terminal-Bench 4.0, Artificial Analysis', g: 0.42, d: 0.12, xmax: 1 },
  swe: { label: 'single repo fixes', src: 'SWE-bench Verified, Vals', g: 0.954, d: 0.888, xmax: 15 },
  lcb: { label: 'one-shot problems', src: 'LiveCodeBench, Vals', g: 0.805, d: 0.873, xmax: 5 },
};
class VsSolve extends Figure {
  build() {
    this.idleText = 'interactive';
    this.task = 'tb4'; this.R = 1;
    const svg = this.svgRoot(600, 300, 'Expected cost per solved task as a function of the human review cost per attempt');
    this.px = (r) => 70 + r / this.xmax * 480;
    this.py = (c) => 250 - Math.min(c, this.ymax) / this.ymax * 210;
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: '$ PER SOLVED TASK' }, svg);
    S('text', { x: 550, y: 290, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: 'human review cost per attempt →' }, svg);
    this.grid = S('g', {}, svg);
    this.lg = S('path', { class: 'f-none s-green', 'stroke-width': 2.5 }, svg);
    this.ld = S('path', { class: 'f-none s-ochre', 'stroke-width': 2.5 }, svg);
    this.cross = S('circle', { r: 5, class: 'f-none s-ink', 'stroke-width': 1.5 }, svg);
    this.crossT = S('text', { class: 'hand', 'font-size': 14 }, svg);
    this.mark = S('line', { y1: 40, y2: 250, class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    this.read = S('text', { x: 580, y: 26, class: 't', 'font-size': 13, 'text-anchor': 'end' }, svg);
    this.sub = S('text', { x: 580, y: 42, class: 't3', 'font-size': 11, 'text-anchor': 'end' }, svg);
    const bar = controls(this);
    this.R = 0.5;
    this.sl = slider(bar, 'review / attempt', 0, 1, 0.01, 0.5, (v) => '$' + v.toFixed(2), (v) => { this.R = v; this.paint(); });
    pills(bar, Object.entries(TASKS).map(([k, v]) => [k, v.label]), 'tb4', (v) => {
      this.task = v; const m = TASKS[v].xmax;
      this.sl.r.max = m; this.sl.r.step = m / 100; this.sl.set(Math.min(m, m / 2));
    });
    this.paint();
  }
  paint() {
    const T = TASKS[this.task], X = (this.xmax = T.xmax), cg = (r) => (RUN.glm + r) / T.g, cd = (r) => (RUN.ds + r) / T.d;
    this.ymax = Math.max(cg(X), cd(X)) * 1.05;
    this.grid.replaceChildren();
    for (let i = 0; i <= 5; i++) { const r = X * i / 5; S('text', { x: this.px(r), y: 268, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: '$' + (X < 5 ? r.toFixed(2) : r) }, this.grid); }
    const step = this.ymax > 80 ? 20 : this.ymax > 40 ? 10 : this.ymax > 15 ? 5 : 2;
    for (let c = 0; c <= this.ymax; c += step) {
      S('line', { x1: 70, x2: 550, y1: this.py(c), y2: this.py(c), class: 's-rule', 'stroke-width': 1 }, this.grid);
      S('text', { x: 62, y: this.py(c) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: '$' + c }, this.grid);
    }
    const line = (f) => `M${this.px(0)} ${this.py(f(0))} L${this.px(X)} ${this.py(f(X))}`;
    this.lg.setAttribute('d', line(cg)); this.ld.setAttribute('d', line(cd));
    // break-even: (RUN.glm + r)/g = (RUN.ds + r)/d
    const be = (RUN.ds * T.g - RUN.glm * T.d) / (T.d - T.g);
    const inRange = be >= 0 && be <= X;
    op(this.cross, inRange ? 1 : 0);
    if (inRange) {
      attr(this.cross, { cx: this.px(be), cy: this.py(cg(be)) });
      attr(this.crossT, { x: this.px(be) + 14, y: this.py(cg(be)) - 26 });
      this.crossT.textContent = `break-even: $${be.toFixed(2)} a review`;
    } else {
      attr(this.crossT, { x: 300, y: 70 });
      this.crossT.textContent = be > X ? `Flash stays cheaper until $${be.toFixed(2)} a review` : 'Flash is cheaper at any review cost';
    }
    attr(this.mark, { x1: this.px(this.R), x2: this.px(this.R) });
    const a = cg(this.R), b = cd(this.R);
    this.read.innerHTML = '';
    S('tspan', { style: 'fill:var(--green-t)', text: `GLM ${money(a)}` }, this.read);
    S('tspan', { class: 't3', text: '  vs  ' }, this.read);
    S('tspan', { style: 'fill:var(--ochre-t)', text: `Flash ${money(b)}` }, this.read);
    this.sub.textContent = `${T.src}: ${pct(T.g)} vs ${pct(T.d)} solved`;
  }
}

// ── fig 7 · will the run survive its tool calls? ───────────────────────────
// Rates from GitHub issues: vLLM #49248 (glm47 parser, 6 concurrent), MiaAI-Lab #6 (DSML leak),
// cline #13348 (gateway), vLLM #59926 (one cache-hit shape). Each is one setup, not a property of the model.
const RATES = [
  [0.0, 'one request at a time', 'glm47 parser, sequential'],
  [0.11, 'GLM parser, 6 in parallel', 'vLLM #49248: 5–17%'],
  [0.078, 'DeepSeek markup leak', 'self-hosted 0731: 9 of 115'],
  [0.25, 'DeepSeek via a gateway', 'cline #13348: ~1 in 4'],
];
class VsSurvive extends Figure {
  build() {
    this.idleText = 'interactive';
    this.r = 0.078; this.n = 30;
    const svg = this.svgRoot(600, 250, 'Chance that an agent run finishes without a broken tool call, by number of steps');
    this.px = (n) => 60 + n / 60 * 500; this.py = (p) => 210 - p * 170;
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'RUN FINISHES WITH NO BROKEN CALL' }, svg);
    [0, 0.5, 1].forEach((p) => {
      S('line', { x1: 60, x2: 560, y1: this.py(p), y2: this.py(p), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 52, y: this.py(p) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: Math.round(p * 100) + '%' }, svg);
    });
    [0, 10, 20, 30, 40, 50, 60].forEach((n) => S('text', { x: this.px(n), y: 230, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: n }, svg));
    S('text', { x: 560, y: 246, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: 'steps' }, svg);
    this.curve = S('path', { class: 'f-none s-ochre', 'stroke-width': 2.5 }, svg);
    this.dot = S('circle', { r: 5.5, class: 'f-ochre' }, svg);
    this.big = S('text', { x: 580, y: 60, class: 't', 'font-size': 30, 'text-anchor': 'end' }, svg);
    this.sub = S('text', { x: 580, y: 80, class: 't3', 'font-size': 11.5, 'text-anchor': 'end' }, svg);
    const bar = controls(this);
    pills(bar, RATES.map(([r, label]) => [r, label]), 0.078, (v) => { this.r = v; this.paint(); });
    slider(bar, 'steps', 1, 60, 1, 30, (v) => v, (v) => { this.n = v; this.paint(); });
    this.paint();
  }
  paint() {
    const r = this.r, cls = r === 0.11 || r === 0 ? 'green' : 'ochre';
    let d = '';
    for (let n = 0; n <= 60; n++) d += (n ? 'L' : 'M') + this.px(n).toFixed(1) + ' ' + this.py(Math.pow(1 - r, n)).toFixed(1);
    this.curve.setAttribute('d', d); this.curve.setAttribute('class', 'f-none s-' + cls);
    const p = Math.pow(1 - r, this.n);
    attr(this.dot, { cx: this.px(this.n), cy: this.py(p), class: 'f-' + cls });
    this.big.textContent = pct(p);
    const src = RATES.find((x) => x[0] === r);
    this.sub.textContent = `${this.n} steps at ${(r * 100).toFixed(1)}% per call · ${src ? src[2] : ''}`;
  }
}

define({ 'vs-lineup': VsLineup, 'vs-horizon': VsHorizon, 'vs-race': VsRace, 'vs-bill': VsBill, 'vs-prefix': VsPrefix, 'vs-solve': VsSolve, 'vs-survive': VsSurvive });
