// Figures for "The best agent harness is a while loop and a lot of upkeep".
// Encoding: green = the thing each figure is about (the lab's own harness, independent harnesses, the harness lever);
// everything else ink and grey. Data read 2026-10-12; sources are in each caption.
import { S, attr, op, lerp, ease, seg, handArrow, Figure, define, entrance, pills, tooltip, hit, tween } from './core.js';
// text that crosses grid lines gets a halo in the panel colour
const HALO = 'paint-order:stroke;stroke:var(--panel);stroke-width:4px;stroke-linejoin:round';

// ── fig 1 · the loop ───────────────────────────────────────────────────────
// A toy run: token counts are illustrative and the window is shrunk to 40k so compaction happens on screen.
const CODE = [
  'ctx = [system, tools, agents_md, task]',
  'while True:',
  '    reply = model(ctx)',
  '    ctx.append(reply)',
  '    if not reply.tool_calls:',
  '        break',
  '    for call in reply.tool_calls:',
  '        out = run(call)      # sandboxed',
  '        ctx.append(limit(out))',
  '    if tokens(ctx) > 0.8 * window:',
  '        ctx = compact(ctx)',
];
const BASE = [['system', 4], ['tools', 5], ['AGENTS.md', 1.5], ['task', 0.5]];
// [time, code line, kind (m = model call, o = tool output, c = compaction, f = final reply), log text, tokens added]
const EV = [
  [0.8, 2, 'm', '→ bash   rg -n "parse_date"', 0.3], [1.8, 8, 'o', '← 14 matches', 0.8],
  [2.8, 2, 'm', '→ read   src/dates.py', 0.2], [3.8, 8, 'o', '← 212 lines', 6],
  [4.8, 2, 'm', '→ edit   src/dates.py', 0.6], [5.6, 8, 'o', '← edit applied', 0.1],
  [6.6, 2, 'm', '→ bash   pytest', 0.2], [7.6, 8, 'o', '← 3,800 lines, head + tail kept', 2.6],
  [8.6, 2, 'm', '→ read   tests/test_dates.py', 0.2], [9.6, 8, 'o', '← 340 lines', 9.5],
  [10.6, 2, 'm', '→ edit   src/dates.py', 0.7], [11.4, 8, 'o', '← edit applied', 0.1],
  [12.4, 10, 'c', '■ compact  32.3k → 13.5k tokens', 0],
  [13.8, 2, 'm', '→ bash   pytest', 0.2], [14.8, 8, 'o', '← 212 passed', 0.3],
  [15.8, 5, 'f', '✓ reply with no tool call: done', 0],
];
const WIN = 40, SUMMARY = 2.5, LOGN = 9;
class AhLoop extends Figure {
  constructor() { super(); this.duration = 17.5; this.poster = 17.5; }
  build() {
    const svg = this.svgRoot(600, 330, 'A ten-line agent loop running a small coding task, with the context window filling up and being compacted');
    S('text', { x: 16, y: 22, class: 'sl', 'font-size': 10.5, text: 'THE HARNESS (PSEUDOCODE)' }, svg);
    this.hl = S('rect', { x: 10, width: 286, height: 20, rx: 3, class: 'f-green', 'fill-opacity': 0.16 }, svg);
    CODE.forEach((l, i) => S('text', { x: 16, y: 48 + i * 22, class: 't', 'font-size': 11.5, style: 'white-space:pre', text: l }, svg));
    const x0 = 310, w = 274;
    this.X = (k) => x0 + k / WIN * w;
    S('text', { x: x0, y: 22, class: 'sl', 'font-size': 10.5, text: 'CONTEXT WINDOW (40K, SHRUNK)' }, svg);
    S('rect', { x: x0, y: 34, width: w, height: 26, rx: 3, class: 'f-rule' }, svg);
    let acc = 0;
    this.base = BASE.map(([n, k]) => { const r = S('rect', { x: this.X(acc), y: 34, width: k / WIN * w - 1, height: 26, class: 'f-ink2' }, svg); acc += k; return r; });
    const pre = this.X(acc);
    S('path', { d: `M${x0} 68v5H${pre - 1}v-5`, class: 'f-none s-ink3', 'stroke-width': 1 }, svg);
    S('text', { x: x0, y: 86, class: 't3', 'font-size': 10, text: 'stable prefix, cached' }, svg);
    this.sum = S('rect', { y: 34, height: 26, class: 'f-green' }, svg);
    this.segs = EV.map(([, , k]) => S('rect', { y: 34, height: 26, class: k === 'm' ? 'f-ink' : 'f-ink3' }, svg));
    const xt = this.X(WIN * 0.8);
    S('line', { x1: xt, x2: xt, y1: 30, y2: 64, class: 's-ink', 'stroke-width': 1.2, 'stroke-dasharray': '3 2' }, svg);
    S('text', { x: xt + 4, y: 27, class: 't3', 'font-size': 10, text: '80%' }, svg);
    this.count = S('text', { x: x0, y: 110, class: 't', 'font-size': 12 }, svg);
    this.log = Array.from({ length: LOGN }, (_, i) => S('text', { x: x0, y: 136 + i * 19, class: 't2', 'font-size': 11, style: 'white-space:pre' }, svg));
    S('text', { x: 456, y: 114, class: 'hand', 'font-size': 14, text: 'all the model sees' }, svg);
    S('path', { d: handArrow(506, 100, 494, 66, 0.2), class: 'f-none s-ink2', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
  }
  label(t) { return 'turn ' + EV.filter((e) => e[0] <= t && (e[2] === 'm' || e[2] === 'f')).length; }
  render(t) {
    let acc = BASE.reduce((s, b) => s + b[1], 0), shrink = 0, line = 0, last = -1;
    EV.forEach((e, i) => { if (t >= e[0]) { last = i; line = e[1]; } });
    const c = EV.findIndex((e) => e[2] === 'c'), kc = ease(seg(t, EV[c][0], EV[c][0] + 0.8));
    // the summary sits right after the prefix; history written before compaction shrinks into it
    const sw = SUMMARY * kc;
    attr(this.sum, { x: this.X(acc), width: Math.max(0, sw / WIN * 274 - (sw ? 1 : 0)) });
    acc += sw;
    EV.forEach((e, i) => {
      let k = e[4] * ease(seg(t, e[0], e[0] + 0.4));
      if (i < c) k *= 1 - kc;
      shrink += k;
      attr(this.segs[i], { x: this.X(acc), width: Math.max(0, k / WIN * 274 - (k > 0.05 ? 1 : 0)) });
      acc += k;
    });
    attr(this.hl, { y: 48 + line * 22 - 14 });
    op(this.hl, last < 0 ? 0 : 1);
    const tot = BASE.reduce((s, b) => s + b[1], 0) + sw + shrink;
    this.count.textContent = `${tot.toFixed(1)}k / ${WIN}k tokens`;
    const shown = EV.slice(0, last + 1).slice(-LOGN);
    this.log.forEach((el, i) => {
      const e = shown[i];
      if (el.textContent !== (e ? e[3] : '')) el.textContent = e ? e[3] : '';
      el.setAttribute('class', e && (e[2] === 'c' || e[2] === 'f') ? 't' : 't2');
      el.style.fill = e && (e[2] === 'c' || e[2] === 'f') ? 'var(--green-t)' : '';
      op(el, e ? (i === shown.length - 1 ? ease(seg(t, e[0], e[0] + 0.3)) : 1) : 0);
    });
  }
}

// ── fig 2 · same model, many harnesses ─────────────────────────────────────
// Terminal-Bench 2.0 board data (89 tasks). [harness, score, verified]; the lab's own harness is matched by name.
const TB2 = [
  ['Claude Opus 4.6', 'Claude Code', [['Meta-Harness', 76.4], ['Capy', 75.3], ['Terminus-KIRA', 74.7], ['TongAgents', 71.9], ['Droid', 69.9], ['Crux', 66.9], ['Mux', 66.5], ['Terminus 2', 62.9, 1], ['Claude Code', 58, 1]]],
  ['GPT-5.5', 'Codex CLI', [['NexAU-AHE', 84.7], ['Capy', 83.1], ['Codex CLI', 82.2, 1], ['clnkr', 66.1]]],
  ['GPT-5.3-Codex', 'Simple Codex', [['SageAgent', 78.4], ['Droid', 77.3], ['CodeBrain-1.5', 75.8], ['Codelia', 75.7], ['Simple Codex', 75.1, 1], ['Mux', 74.6], ['spoox-o-m', 71.5], ['IndusAGI', 69.1], ['Terminus 2', 64.7, 1]]],
  ['Gemini 3.1 Pro', 'Gemini CLI', [['TongAgents', 80.2], ['Terminus-KIRA', 74.8], ['Gemini CLI', 61.4]]],
  ['Gemini 3 Pro', '', [['Ante', 69.4, 1], ['SageAgent', 65.2], ['CodeBrain-1.5', 62.2], ['II-Agent', 61.8], ['Droid', 61.1], ['Terminus 2', 56.9, 1], ['Letta Code', 56]]],
  ['Gemini 3 Flash', 'Gemini CLI', [['Junie CLI', 64.3], ['Terminus 2', 51.7, 1], ['Gemini CLI', 47.4]]],
  ['GPT-5.2', 'Codex CLI', [['Droid', 64.9], ['Codex CLI', 62.9, 1], ['Mux', 60.7], ['Terminus 2', 54, 1]]],
  ['Claude Opus 4.5', 'Claude Code', [['Droid', 63.1], ['Letta Code', 59.1], ['Mux', 58.4], ['Terminus 2', 57.8, 1], ['Goose', 54.3], ['Claude Code', 52.1, 1], ['OpenHands', 51.9, 1], ['OpenCode', 51.7]]],
  ['GPT-5', 'Codex CLI', [['Codex CLI', 49.6, 1], ['OpenHands', 43.8, 1], ['Terminus 2', 35.2, 1], ['mini-swe-agent', 33.9, 1]]],
  ['Claude Sonnet 4.5', 'Claude Code', [['CAMEL-AI', 46.5], ['Goose', 43.1], ['Terminus 2', 42.8, 1], ['OpenHands', 42.6, 1], ['mini-swe-agent', 42.5, 1], ['Claude Code', 40.1, 1]]],
  ['Claude Haiku 4.5', 'Claude Code', [['Goose', 35.5], ['mini-swe-agent', 29.8, 1], ['Terminus 2', 28.3, 1], ['Claude Code', 27.5, 1], ['OpenHands', 13.9, 1]]],
  ['Gemini 2.5 Pro', 'Gemini CLI', [['Terminus 2', 32.6, 1], ['mini-swe-agent', 26.1, 1], ['Gemini CLI', 19.6, 1], ['OpenHands', 16.4, 1]]],
];
class AhSpread extends Figure {
  build() {
    const svg = this.svgRoot(600, 364, 'Terminal-Bench 2.0 scores for twelve models, one dot per harness, with the lab harness marked');
    this.X = (v) => 150 + (v - 10) / 80 * 390;
    [10, 30, 50, 70, 90].forEach((v) => {
      S('line', { x1: this.X(v), x2: this.X(v), y1: 34, y2: 330, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: this.X(v), y: 346, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v + '%' }, svg);
    });
    const key = S('g', { transform: 'translate(150 16)' }, svg);
    S('circle', { cx: 4, cy: 0, r: 5, class: 'f-green' }, key); S('text', { x: 14, y: 4, class: 't2', 'font-size': 10.5, text: "lab's own harness" }, key);
    S('circle', { cx: 154, cy: 0, r: 4, class: 'f-ink' }, key); S('text', { x: 164, y: 4, class: 't2', 'font-size': 10.5, text: 'verified' }, key);
    S('circle', { cx: 244, cy: 0, r: 4, class: 'f-panel s-ink3', 'stroke-width': 1.5 }, key); S('text', { x: 254, y: 4, class: 't2', 'font-size': 10.5, text: 'self-reported' }, key);
    S('text', { x: 578, y: 30, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: 'spread' }, svg);
    const tip = this.tip = tooltip(svg);
    this.rows = TB2.map(([m, lab, hs], i) => {
      const y = 46 + i * 24;
      S('text', { x: 142, y: y + 4, class: 't2', 'font-size': 11, 'text-anchor': 'end', text: m }, svg);
      const span = S('line', { y1: y, y2: y, class: 's-ink3', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.35 }, svg);
      const dots = hs.map(([h, v, ok]) => {
        const own = h === lab, x = this.X(v);
        const c = S('circle', { cx: x, cy: y, r: own ? 5.5 : 4, class: own ? 'f-green' : ok ? 'f-ink' : 'f-panel s-ink3', 'stroke-width': 1.5 }, svg);
        const hh = hit(svg, tip, x, y, `${m} · ${h}`, `${v}% · ${ok ? 'verified' : 'self-reported'}`);
        return { c, hh, v, ok, a: 1, from: 1 };
      });
      const gap = S('text', { x: 578, y: y + 4, class: 't3', 'font-size': 10.5, 'text-anchor': 'end' }, svg);
      const ends = (only) => { const vs = dots.filter((d) => !only || d.ok).map((d) => d.v); return vs.length > 1 ? [Math.min(...vs), Math.max(...vs)] : vs.length ? [vs[0], vs[0]] : null; };
      return { span, dots, gap, all: ends(false), ver: ends(true), from: ends(false) };
    });
    this.mode = 'all';
    pills(this, [['all', 'every row'], ['ver', 'verified only']], 'all', (m) => {
      this.tip.hide();
      this.rows.forEach((r) => { r.from = r.cur; r.dots.forEach((d) => { d.from = d.a; }); }); this.mode = m; tween(this, (k) => this.place(k));
    });
    this.place(1);
  }
  place(k) {
    const only = this.mode === 'ver';
    this.rows.forEach((r) => {
      const to = only ? r.ver : r.all;
      r.dots.forEach((d) => {
        const vis = !only || d.ok;
        d.a = lerp(d.from, vis ? 1 : 0, k); op(d.c, d.a);
        d.hh.c.style.pointerEvents = vis ? 'all' : 'none';
      });
      if (!to) { op(r.span, 0); r.gap.textContent = 'none verified'; r.cur = null; return; }
      // a row with no span before (no verified rows) grows its span from the middle
      const mid = (to[0] + to[1]) / 2, fr = r.from || [mid, mid];
      const lo = lerp(fr[0], to[0], k), hi = lerp(fr[1], to[1], k);
      attr(r.span, { x1: this.X(lo), x2: this.X(hi) }); op(r.span, r.from ? 0.35 : 0.35 * k);
      r.cur = [lo, hi];
      r.gap.textContent = to[1] > to[0] ? (to[1] - to[0]).toFixed(1) : '–';
    });
  }
}

// ── fig 3 · what moves the score ───────────────────────────────────────────
// Percentage points on Terminal-Bench. g: h = harness, e = reasoning effort, s = sampling, m = model generation.
const LEVERS = [
  ['h', 'best − worst verified harness, median model (TB 2.0)', 5.4],
  ['h', 'automated harness search, GPT-5.4 (AHE, TB 2.0)', 7.3],
  ['h', 'best − worst harness, all rows, median model (TB 2.0)', 11.7],
  ['h', 'Claude Code → Meta-Harness, Opus 4.6 (TB 2.0)', 18.4],
  ['e', 'GPT-6 Astra in Codex, low → max effort (TB 4.0)', 7.6],
  ['e', 'Opus 5 in Claude Code, low → xhigh effort (TB 4.0)', 19.1],
  ['s', 'any of 5 tries vs one try, Opus 5.5 (TB 4.0)', 13.9],
  ['m', 'Opus 4.1 → Opus 4.5 in Terminus 2 (TB 2.0)', 19.8],
  ['m', 'Gemini 2.5 Pro → 3 Pro in Terminus 2 (TB 2.0)', 24.3],
  ['m', 'Opus 4.8 → Opus 5 in Claude Code (TB 4.0)', 28.2],
];
const GROUP = { h: 'change the harness', e: 'raise reasoning effort', s: 'sample more', m: 'move up a model generation' };
class AhLevers extends Figure {
  build() {
    const svg = this.svgRoot(600, 446, 'Points gained on Terminal-Bench from changing the harness, the reasoning effort, the sampling or the model');
    this.B = (v) => 16 + v / 30 * 500;
    [0, 10, 20, 30].forEach((v) => {
      S('line', { x1: this.B(v), x2: this.B(v), y1: 14, y2: 418, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: this.B(v), y: 436, class: 't3', 'font-size': 11, 'text-anchor': v ? 'middle' : 'start', text: v ? `+${v} pts` : '0' }, svg);
    });
    let y = 22, prev = '';
    this.bars = LEVERS.map(([g, n, v]) => {
      if (g !== prev) { S('text', { x: 16, y: y + 4, class: 'sl', 'font-size': 10, text: GROUP[g].toUpperCase(), style: g === 'h' ? 'fill:var(--green-t)' : '' }, svg); y += 20; prev = g; }
      S('text', { x: 16, y, class: 't2', 'font-size': 11, text: n, style: HALO }, svg);
      const bar = S('rect', { x: this.B(0), y: y + 5, height: 9, rx: 2, class: g === 'h' ? 'f-green' : g === 'm' ? 'f-ink' : 'f-ink3' }, svg);
      const val = S('text', { y: y + 13, class: 't', 'font-size': 11 }, svg);
      y += 31;
      return { bar, val, v };
    });
    entrance(this, (k) => this.bars.forEach((b) => {
      const w = (this.B(b.v) - this.B(0)) * k;
      attr(b.bar, { width: Math.max(1, w) }); attr(b.val, { x: this.B(0) + w + 6 });
      b.val.textContent = '+' + (b.v * k).toFixed(1);
    }));
  }
}

// ── fig 4 · the boards today ───────────────────────────────────────────────
// Best row per harness. [harness, independent?, AA index (model), Terminal-Bench 4.0 (model)]
const NOW = [
  ['Claude Code', 0, [68.4, 'Sonnet 5.5 max'], [64.85, 'Opus 5.5 max']],
  ['Antigravity CLI', 0, [63.8, 'Gemini 4 Argon high'], null],
  ['Codex', 0, [62.9, 'GPT-6.1 Sol xhigh'], [58.18, 'GPT-6 Astra max']],
  ['Devin Fusion CLI', 1, [61.7, 'Fable 5.1 + SWE-2'], null],
  ['Grok Build', 0, [56.3, 'Grok 4.7 xhigh'], [37.58, 'Grok 4.7 xhigh']],
  ['Muse Code', 0, [54.3, 'Muse Spark 1.3 max'], [14.55, 'Muse Spark 1.3 xhigh']],
  ['OpenCode', 1, [53.6, 'GLM-5.3 max'], null],
  ['Kimi Code CLI', 0, [51.9, 'Kimi K3'], null],
  ['mini-swe-agent', 1, null, [19.09, 'Gemini 3.8 Flash high']],
];
class AhBoard extends Figure {
  build() {
    const svg = this.svgRoot(600, 290, 'Best score per harness on the Artificial Analysis coding agent index and on Terminal-Bench 4.0');
    this.B = (v) => 150 + v / 100 * 380;
    [0, 25, 50, 75, 100].forEach((v) => {
      S('line', { x1: this.B(v), x2: this.B(v), y1: 30, y2: 262, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: this.B(v), y: 278, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v }, svg);
    });
    S('rect', { x: 150, y: 10, width: 10, height: 10, rx: 2, class: 'f-ink' }, svg); S('text', { x: 165, y: 19, class: 't2', 'font-size': 11, text: "a lab's own harness" }, svg);
    S('rect', { x: 320, y: 10, width: 10, height: 10, rx: 2, class: 'f-green' }, svg); S('text', { x: 335, y: 19, class: 't2', 'font-size': 11, text: 'independent harness' }, svg);
    this.rows = NOW.map(([n, ind, aa, tb]) => {
      const g = S('g', {}, svg);
      S('text', { x: 142, y: 9, class: ind ? 't' : 't2', 'font-size': 11, 'text-anchor': 'end', text: n, style: ind ? 'fill:var(--green-t)' : '' }, g);
      const bar = S('rect', { x: this.B(0), y: 0, height: 11, rx: 2, class: ind ? 'f-green' : 'f-ink' }, g);
      const val = S('text', { y: 10, class: 't', 'font-size': 11 }, g);
      const mod = S('text', { y: 10, class: 't3', 'font-size': 10.5, style: HALO }, g);
      return { g, bar, val, mod, d: { aa, tb }, v: 0, nv: 0, y: 0, ny: 0, a: 0, na: 0 };
    });
    this.set('aa', true);
    pills(this, [['aa', 'Artificial Analysis index'], ['tb', 'Terminal-Bench 4.0']], 'aa', (m) => { this.set(m); tween(this, (k) => this.place(k), 700); });
    entrance(this, (k) => { this.grow = k; this.place(1); });
  }
  set(m, now) {
    const rank = this.rows.filter((r) => r.d[m]).sort((p, q) => q.d[m][0] - p.d[m][0]);
    let i = rank.length;
    this.rows.forEach((r) => {
      r.v = r.cv ?? r.nv; r.y = r.cy ?? r.ny; r.a = r.ca ?? r.na;
      const d = r.d[m];
      r.nv = d ? d[0] : 0; r.na = d ? 1 : 0; r.ny = d ? 38 + rank.indexOf(r) * 25 : null; r.lab = d ? d[1] : '';
      r.dp = d && d[0] % 0.1 > 1e-6 && 0.1 - d[0] % 0.1 > 1e-6 ? 2 : 1;
      if (now) { r.v = r.nv; r.y = r.ny; r.a = r.na; }
    });
    this.rows.forEach((r) => { if (r.ny == null) { r.ny = 38 + i++ * 25; if (now) r.y = r.ny; } });
  }
  place(k) {
    const gk = this.grow ?? 1;
    this.rows.forEach((r) => {
      r.cv = lerp(r.v, r.nv, k); r.cy = lerp(r.y, r.ny, k); r.ca = lerp(r.a, r.na, k);
      const w = (this.B(r.cv) - this.B(0)) * gk;
      attr(r.g, { transform: `translate(0 ${r.cy.toFixed(1)})` }); op(r.g, r.ca);
      attr(r.bar, { width: Math.max(1, w) }); attr(r.val, { x: this.B(0) + w + 6 }); attr(r.mod, { x: this.B(0) + w + 46 });
      r.val.textContent = (r.cv * gk).toFixed(r.dp);
      if (k === 1 || r.na) r.mod.textContent = r.lab;
    });
  }
}

// ── fig 5 · vendor harness vs a 100-line one ───────────────────────────────
// TB 4.0: vendor harness on the official board vs mini-swe-agent on Vals. DeepSWE v1.1: vendor CLI run by AA vs mini-swe-agent run by Datacurve.
const PAIR = {
  tb: [['Claude Opus 5.5', 'Claude Code', 64.85, 65.15], ['Claude Sonnet 5.5', 'Claude Code', 61.82, 64.14], ['Claude Fable 5.1', 'Claude Code', 57.88, 58.08],
    ['GPT-6 Astra', 'Codex', 58.18, 59.6], ['GPT-6.1 Sol', 'Codex', 58.18, 55.05], ['GPT-6 Sol', 'Codex', 49.39, 44.44],
    ['GLM-5.3', 'Claude Code', 41.82, 38.89], ['Grok 4.7', 'Grok Build', 37.58, 28.79], ['Qwen3.8 Max', 'Claude Code', 26.97, 34.34]],
  ds: [['GPT-5.6 Sol', 'Codex', 72.3, 73], ['GPT-6 Astra', 'Codex', 67.6, 74], ['Kimi K3', 'Kimi Code CLI', 68.4, 69],
    ['Grok 4.6', 'Grok Build', 64.9, 67], ['Claude Opus 5', 'Claude Code', 62.5, 74], ['GLM-5.3', 'OpenCode', 61.4, 69]],
};
class AhPair extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, "Each model's score in its vendor's harness and in mini-swe-agent, on Terminal-Bench 4.0 and DeepSWE");
    this.X = (v) => 236 + (v - 20) / 60 * 300;
    [20, 40, 60, 80].forEach((v) => {
      S('line', { x1: this.X(v), x2: this.X(v), y1: 34, y2: 262, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: this.X(v), y: 278, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v + '%' }, svg);
    });
    S('circle', { cx: 240, cy: 14, r: 4.5, class: 'f-ink' }, svg); S('text', { x: 250, y: 18, class: 't2', 'font-size': 10.5, text: "vendor's harness" }, svg);
    S('circle', { cx: 390, cy: 14, r: 4.5, class: 'f-panel s-green', 'stroke-width': 2 }, svg); S('text', { x: 400, y: 18, class: 't2', 'font-size': 10.5, text: 'mini-swe-agent' }, svg);
    S('text', { x: 584, y: 30, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: 'mini − vendor' }, svg);
    const tip = this.tip = tooltip(svg);
    this.groups = {};
    for (const m in PAIR) {
      const g = S('g', { opacity: m === 'tb' ? 1 : 0 }, svg), hs = [];
      PAIR[m].forEach(([n, h, v, s], i) => {
        const y = 46 + i * 24, d = s - v;
        S('text', { x: 228, y: y + 4, class: 't2', 'font-size': 11, 'text-anchor': 'end', text: `${n} · ${h}` }, g);
        S('line', { x1: this.X(v), x2: this.X(s), y1: y, y2: y, class: d > 0 ? 's-green' : 's-ink3', 'stroke-width': 3, opacity: 0.45 }, g);
        S('circle', { cx: this.X(v), cy: y, r: 4.5, class: 'f-ink' }, g);
        S('circle', { cx: this.X(s), cy: y, r: 4.5, class: 'f-panel s-green', 'stroke-width': 2 }, g);
        S('text', { x: 584, y: y + 4, class: 't', 'font-size': 10.5, 'text-anchor': 'end', text: (d > 0 ? '+' : '') + d.toFixed(1), style: d > 0 ? 'fill:var(--green-t)' : '' }, g);
        // dots closer than a hit radius share one label, so neither covers the other
        if (Math.abs(this.X(s) - this.X(v)) < 14) hs.push(hit(g, tip, (this.X(v) + this.X(s)) / 2, y, n, `${h} ${v}% · mini-swe-agent ${s}%`));
        else hs.push(hit(g, tip, this.X(v), y, `${n} in ${h}`, v + '%'), hit(g, tip, this.X(s), y, `${n} in mini-swe-agent`, s + '%'));
      });
      this.groups[m] = { g, hs };
    }
    this.cur = 'tb'; this.toggle();
    pills(this, [['tb', 'Terminal-Bench 4.0'], ['ds', 'DeepSWE']], 'tb', (m) => {
      const from = this.cur; this.cur = m; this.toggle(); this.tip.hide();
      tween(this, (k) => { op(this.groups[from].g, from === m ? 1 : 1 - k); op(this.groups[m].g, from === m ? 1 : k); }, 500);
    });
  }
  toggle() { for (const m in this.groups) this.groups[m].hs.forEach((h) => { h.c.style.pointerEvents = m === this.cur ? 'all' : 'none'; }); }
}

// ── fig 6 · inside a harness ───────────────────────────────────────────────
// Read from each project's source (Codex, Gemini CLI, opencode, mini-swe-agent) or docs (Claude Code), 2026-10-12.
const WHO = ['Claude Code', 'Codex CLI', 'Gemini CLI', 'OpenCode', 'mini-swe-agent'];
const LAYERS = [
  ['extensions', 'what users can plug in', ['MCP, hooks, skills,\nplugins', 'MCP, hooks, skills, plugins,\napp-server', 'MCP, hooks, skills,\nextensions, ACP', 'MCP, plugins, skills, ACP', 'a YAML config file']],
  ['sandbox', 'what runs without asking, and where', ['seatbelt or bubblewrap; auto\nmode asks a classifier', 'seatbelt or landlock; 3 sandbox\nx 4 approval modes', 'docker, podman or seatbelt;\nplan and yolo modes', 'allow / ask / deny rules;\nno sandbox in core', 'docker or local; confirm\nor yolo']],
  ['subagents', 'fresh windows that hand back a summary', ['Explore and Plan agents,\nworktrees, depth 3', 'spawn_agent, up to 6\nthreads', 'codebase_investigator and\nother built-in agents', 'explore and general\nsubagents', 'none']],
  ['compaction', 'old history becomes a summary', ['near the limit; clears old\ntool output first', 'at 90% of the window,\na handoff summary', 'at 50%, keeps the latest\n30%', 'keeps max(10%, 16k) free\nand 15k recent tokens', 'none: one linear history']],
  ['output limits', 'long tool output is cut', ['Bash about 30k chars, the\nrest saved to a file', '10k tokens, head and tail\nkept', '40k chars, the rest saved\nto a temp file', '2,000 lines or 50 KiB, then\na path to the full file', '10k chars: the first 5k\nand the last 5k']],
  ['tools', 'what the model can call', ['about 45 tools; Edit swaps an\nexact string; grep via bash', 'shell and apply_patch;\nsearch with rg in the shell', '27 tools; replace edits;\nglob and grep tools', '12 tools; string edit or\npatch, picked per model', 'bash, nothing else']],
  ['context', 'what each request carries', ['CLAUDE.md; MCP schemas\nloaded only when needed', 'AGENTS.md up to 32 KiB;\nnew items appended only', 'GEMINI.md, also for each\nfolder it touches', 'AGENTS.md; reminders at\nthe tail to keep the cache', 'system prompt and task,\nthen history']],
  ['loop', 'call the model until it stops calling tools', ['gather, act, verify;\nEsc steers mid-turn', 'until a reply has no tool\ncall; stop hooks can resume', '100 turns per run, plus a\nloop detector', 'optional step limit, then\ntools switched off', 'while True: step(), with\nstep, cost and time limits']],
];
class AhAnatomy extends Figure {
  build() {
    const svg = this.svgRoot(600, 352, 'The layers of an agent harness, and how five harnesses implement the selected layer');
    this.bands = LAYERS.map(([n], i) => {
      const y = 12 + i * 30, w = 228 - i * 14, x = 16 + i * 7;
      const r = S('rect', { x, y, width: w, height: 340 - y, rx: 8, class: 'f-rule s-rule', 'stroke-width': 1 }, svg);
      const t = S('text', { x: x + 10, y: y + 19, class: 't2', 'font-size': 11, text: n }, svg);
      return { r, t };
    });
    S('rect', { x: 74, y: 296, width: 112, height: 30, rx: 6, class: 'f-ink' }, svg);
    S('text', { x: 130, y: 315, class: 't', 'font-size': 12, 'text-anchor': 'middle', text: 'model', style: 'fill:var(--panel)' }, svg);
    this.head = S('text', { x: 262, y: 28, class: 't', 'font-size': 13 }, svg);
    this.sub = S('text', { x: 262, y: 46, class: 't3', 'font-size': 11 }, svg);
    this.cells = WHO.map((w, i) => {
      const y = 82 + i * 52;
      S('line', { x1: 262, x2: 584, y1: y - 18, y2: y - 18, class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 262, y, class: 't', 'font-size': 11, text: w }, svg);
      return [0, 1].map((j) => S('text', { x: 370, y: y + j * 16, class: 't2', 'font-size': 11 }, svg));
    });
    pills(this, LAYERS.map(([n], i) => [i, n]), 5, (i) => this.pick(i));
    this.pick(5);
  }
  pick(i) {
    this.bands.forEach((b, j) => {
      attr(b.r, { class: j === i ? 'f-rule s-green' : 'f-rule s-rule', 'stroke-width': j === i ? 2 : 1 });
      b.t.setAttribute('class', j === i ? 't' : 't2'); b.t.style.fill = j === i ? 'var(--green-t)' : '';
    });
    const [n, d, vals] = LAYERS[i];
    this.head.textContent = n; this.sub.textContent = d;
    this.cells.forEach((c, j) => { const ls = vals[j].split('\n'); c.forEach((t, k) => { t.textContent = ls[k] || ''; }); });
  }
}

// ── fig 7 · what harnesses are built on ────────────────────────────────────
// From each project's README and dependency files, 2026-10-12. Edge kinds: l = shipped as a library, f = fork or rewrite,
// a = automated search starting from it, c = reuses a component.
const TREE = [
  [['Claude Code', 'Claude Agent SDK', 'l']],
  [['Codex CLI', 'Codex SDK', 'l']],
  [['Gemini CLI', 'Qwen Code', 'f']],
  [['Terminus 2', 'Terminus-KIRA', 'f'], ['Terminus-KIRA', 'Meta-Harness', 'a']],
  [['SWE-agent', 'mini-swe-agent', 'f']],
  [['pi', 'OpenClaw', 'c']], [['', 'Letta Code', 'c']], [['', 'Kimi Code', 'c']],
  [['NexAU', 'NexAU-AHE', 'a']],
  [['LangGraph', 'Deep Agents', 'c'], ['Deep Agents', 'Deep Agents Code', 'c']],
  [['OpenCode (Go)', 'Crush', 'f']],
];
const EDGE = { l: ['s-green', null], f: ['s-ink', null], a: ['s-ink', '5 3'], c: ['s-ink3', '2 3'] };
class AhLineage extends Figure {
  build() {
    const svg = this.svgRoot(600, 444, 'Which coding harnesses are forks, libraries or components of other harnesses');
    const COL = [16, 216, 416], BW = 168;
    [['l', 'shipped as SDK'], ['f', 'fork / rewrite'], ['a', 'auto search'], ['c', 'built on']].forEach(([k, n], i) => {
      S('line', { x1: 16 + i * 146, x2: 40 + i * 146, y1: 14, y2: 14, class: EDGE[k][0], 'stroke-width': 2, 'stroke-dasharray': EDGE[k][1] }, svg);
      S('text', { x: 46 + i * 146, y: 18, class: 't2', 'font-size': 10.5, text: n }, svg);
    });
    const node = (x, y, n) => {
      S('rect', { x, y: y - 11, width: BW, height: 22, rx: 5, class: 'f-panel s-rule', 'stroke-width': 1 }, svg);
      S('text', { x: x + 9, y: y + 4, class: 't', 'font-size': 11, text: n }, svg);
    };
    this.edges = [];
    let piY = 0;
    TREE.forEach((row, i) => {
      const y = 46 + i * 28;
      row.forEach(([a, b, k], j) => {
        const xa = COL[j], xb = COL[j + 1];
        if (a && !j) node(xa, y, a);
        if (a === 'pi') piY = y;
        node(xb, y, b);
        const y0 = a ? y : piY, x0 = xa + BW, [cls, dash] = EDGE[k];
        const p = S('path', { d: a ? `M${x0} ${y}H${xb - 4}` : `M${x0 - 20} ${y0 + 11}V${y}H${xb - 4}`, class: 'f-none ' + cls, 'stroke-width': 2, 'stroke-dasharray': dash }, svg);
        S('path', { d: `M${xb - 9} ${y - 4}L${xb - 3} ${y}L${xb - 9} ${y + 4}`, class: 'f-none ' + cls, 'stroke-width': 1.6 }, svg);
        this.edges.push(p);
      });
    });
    const y = 46 + TREE.length * 28 + 8;
    S('line', { x1: 16, x2: 584, y1: y - 14, y2: y - 14, class: 's-rule', 'stroke-width': 1 }, svg);
    S('text', { x: 16, y, class: 'sl', 'font-size': 10, text: 'OWN LOOP, BORROWED MODEL CLIENT ONLY' }, svg);
    [['LiteLLM', 'Aider, mini-swe-agent, Terminus 2, OpenHands'], ['AI SDK providers', 'Cline, OpenCode'], ['pi-ai', 'Letta Code'],
      ['own client', 'Claude Code, Codex, Gemini CLI, Vibe, Kimi Code']].forEach(([a, b], i) => {
      S('text', { x: 16, y: y + 20 + i * 17, class: 't', 'font-size': 11, text: a }, svg);
      S('text', { x: 150, y: y + 20 + i * 17, class: 't2', 'font-size': 11, text: b }, svg);
    });
    S('text', { x: 500, y: 46 + 8 * 28 + 2, class: 'hand', 'font-size': 13.5, text: 'the one on a framework', 'text-anchor': 'middle' }, svg);
    entrance(this, (k) => this.edges.forEach((e) => op(e, k)));
  }
}

define({ 'ah-loop': AhLoop, 'ah-spread': AhSpread, 'ah-levers': AhLevers, 'ah-board': AhBoard, 'ah-pair': AhPair, 'ah-anatomy': AhAnatomy, 'ah-lineage': AhLineage });
