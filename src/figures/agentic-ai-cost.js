import { S, H, attr, op, seg, ease, inout, lerp, clamp, critter, handArrow, drawOn, CW, Figure, define } from './core.js';

const k = n => n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(/\.0$/, '') + 'k' : String(Math.round(n));
const usd = (x, d = 3) => '$' + x.toFixed(d);

// ── fig 1 · context stack: chatbot vs agent ───────────────────────────────
// tokens (thousands) per step: system, conversation, tool results, reasoning
const STEPS = [[1.5, .5, .8, .2], [1.5, 3, 7.5, 1], [1.5, 8, 13.5, 2], [1.5, 14, 18.5, 3], [1.5, 20, 24.5, 3], [1.5, 26, 28.5, 4]];
const KINDS = [['system', 'f-ink2'], ['history', 'f-ink3'], ['tool results', 'f-ochre'], ['reasoning', 'f-green']];

class CostStack extends Figure {
  constructor() { super(); this.duration = 13; this.poster = 13; }
  build() {
    const svg = this.svgRoot(600, 340, 'Tokens sent per call: a chatbot stays flat, an agent grows every step');
    this.base = 290; this.top = 66; this.max = 60;
    const Y = v => this.base - v / this.max * (this.base - this.top);
    this.Y = Y;
    for (const v of [20, 40, 60]) {
      S('line', { x1: 40, x2: 584, y1: Y(v), y2: Y(v), class: 's-rule', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, svg);
      S('text', { x: 34, y: Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v + 'k' }, svg);
    }
    S('line', { x1: 40, x2: 584, y1: this.base, y2: this.base, class: 's-ink3', 'stroke-width': 1 }, svg);
    S('text', { x: 52, y: 24, class: 'sl', 'font-size': 11, text: 'CHATBOT' }, svg);
    S('text', { x: 228, y: 24, class: 'sl', 'font-size': 11, text: 'AGENT, ONE QUESTION' }, svg);
    S('line', { x1: 200, x2: 200, y1: 14, y2: this.base + 26, class: 's-rule', 'stroke-width': 1 }, svg);
    // legend
    let lx = 228;
    KINDS.forEach(([name, cls]) => {
      S('rect', { x: lx, y: 36, width: 9, height: 9, rx: 2, class: cls }, svg);
      S('text', { x: lx + 14, y: 44, class: 't2', 'font-size': 11, text: name }, svg);
      lx += 14 + name.length * 11 * CW + 18;
    });
    this.chat = STEPS.map((_, i) => {
      const x = 52 + i * 23, g = S('g', {}, svg);
      const r = S('rect', { x, width: 15, rx: 1.5, class: 'f-ink3' }, g);
      S('text', { x: x + 7.5, y: this.base + 16, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: i + 1 }, g);
      return { g, r };
    });
    this.chatNote = S('text', { x: 52, y: this.base - 14, class: 't2', 'font-size': 11, text: '~600 tokens a call' }, svg);
    this.bars = STEPS.map((parts, i) => {
      const x = 240 + i * 56, g = S('g', {}, svg);
      const segs = parts.map((_, j) => S('rect', { x, width: 38, class: KINDS[j][1] }, g));
      const tot = S('text', { x: x + 19, class: 't', 'font-size': 12, 'text-anchor': 'middle' }, g);
      S('text', { x: x + 19, y: this.base + 16, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: 'step ' + (i + 1) }, g);
      return { g, segs, tot, sum: parts.reduce((a, b) => a + b, 0) };
    });
    this.sent = S('text', { x: 584, y: 24, class: 't', 'font-size': 12, 'text-anchor': 'end' }, svg);
    this.arrow = S('path', { class: 'f-none s-ink2', 'stroke-width': 1.5, 'stroke-linecap': 'round', d: handArrow(150, 150, 518, Y(60) + 6, -.18) }, svg);
    this.note = S('text', { x: 60, y: 140, class: 'hand', 'font-size': 16, text: 'step 6 is 100 chatbot calls' }, svg);
  }
  label(t) { const s = Math.min(6, Math.max(0, Math.floor((t - .6) / 1.6) + 1)); return s ? `step ${s}/6` : 'ready'; }
  render(t) {
    let sent = 0;
    this.bars.forEach((b, i) => {
      const t0 = .6 + i * 1.6, g = ease(seg(t, t0, t0 + .9));
      op(b.g, t >= t0 ? 1 : 0);
      let y = this.base;
      STEPS[i].forEach((v, j) => {
        const h = v / this.max * (this.base - this.top) * g;
        attr(b.segs[j], { y: y - h, height: Math.max(0, h) }); y -= h;
      });
      attr(b.tot, { y: y - 6 }); b.tot.textContent = k(b.sum * 1000 * g);
      op(b.tot, g);
      sent += b.sum * 1000 * g;
      const c = this.chat[i], cg = ease(seg(t, t0, t0 + .5)), h = .6 / this.max * (this.base - this.top) * cg;
      attr(c.r, { y: this.base - Math.max(1.5, h), height: Math.max(1.5, h) }); op(c.g, t >= t0 ? 1 : 0);
    });
    this.sent.textContent = 'sent so far: ' + k(sent) + ' tokens';
    op(this.chatNote, seg(t, 1.2, 1.8));
    const a = seg(t, 10.6, 11.6); drawOn(this.arrow, a); op(this.arrow, a > 0 ? 1 : 0);
    op(this.note, seg(t, 11.2, 12));
  }
}

// ── fig 2 · cost calculator ───────────────────────────────────────────────
const PRICE = { in: 3, out: 15, read: .3 }; // $ per million tokens, Claude Sonnet, April 2026
const OUT = 1000;

class CostCalc extends Figure {
  build() {
    this.idleText = 'interactive';
    this.v = { steps: 5, ctx: 25000, grow: 0, q: 150, cache: false };
    const svg = this.svgRoot(600, 300, 'Cost of one agent run, step by step, and per user per month');
    this.g = S('g', {}, svg);
    this.sum = S('g', {}, svg);
    const box = H('div', { class: 'fc' }, this);
    const slider = (key, label, min, max, step, show) => {
      const wrap = H('label', { style: 'display:flex;align-items:center;gap:8px;flex:1 1 40%;min-width:230px;margin-right:12px' }, box);
      H('span', { text: label, style: 'min-width:8ch' }, wrap);
      const r = H('input', { type: 'range', min, max, step, value: this.v[key], 'aria-label': label }, wrap);
      const o = H('span', { class: 'fc-l', text: show(this.v[key]) }, wrap);
      r.oninput = () => { this.v[key] = +r.value; o.textContent = show(+r.value); this.draw(); };
    };
    slider('steps', 'steps', 1, 12, 1, v => v);
    slider('ctx', 'context', 3000, 80000, 1000, v => k(v));
    slider('grow', 'grows by', 0, 10000, 500, v => '+' + k(v));
    slider('q', 'runs/mo', 10, 500, 10, v => v);
    const row = H('div', { class: 'fc' }, this);
    H('span', { text: 'prefix cache' }, row);
    this.pills = ['off', 'on'].map(s => {
      const b = H('button', { class: 'pill', type: 'button', text: s, 'aria-pressed': String(s === 'off') }, row);
      b.onclick = () => { this.v.cache = s === 'on'; this.pills.forEach(p => p.setAttribute('aria-pressed', String(p === b))); this.draw(); };
      return b;
    });
    H('span', { class: 'grow' }, row);
    H('span', { class: 't3', text: `$${PRICE.in}/M in · $${PRICE.out}/M out · $${PRICE.read}/M cached` }, row);
    this.draw();
  }
  compute() {
    const { steps, ctx, grow, cache } = this.v, rows = [];
    for (let i = 0; i < steps; i++) {
      const input = ctx + i * grow, cached = cache && i > 0 ? ctx + (i - 1) * grow : 0;
      const cost = (cached * PRICE.read + (input - cached) * PRICE.in + OUT * PRICE.out) / 1e6;
      rows.push({ input, cached, cost });
    }
    return rows;
  }
  draw() {
    const rows = this.compute(), n = rows.length, g = this.g;
    g.replaceChildren(); this.sum.replaceChildren();
    const max = Math.max(...rows.map(r => r.input)), base = 176, top = 66;
    const slot = 540 / n, w = Math.min(44, slot - 8);
    S('line', { x1: 30, x2: 570, y1: base, y2: base, class: 's-ink3', 'stroke-width': 1 }, g);
    S('text', { x: 30, y: 20, class: 'sl', 'font-size': 11, text: 'INPUT TOKENS PER STEP' }, g);
    if (this.v.cache) {
      S('rect', { x: 400, y: 11, width: 9, height: 9, rx: 2, class: 'f-green' }, g);
      S('text', { x: 414, y: 19, class: 't2', 'font-size': 11, text: 'read from cache' }, g);
    }
    rows.forEach((r, i) => {
      const x = 30 + i * slot + (slot - w) / 2, H1 = r.input / max * (base - top), hc = r.cached / max * (base - top);
      S('rect', { x, y: base - H1, width: w, height: H1 - hc, rx: 2, class: 'f-ink3' }, g);
      if (hc > 0) S('rect', { x, y: base - hc, width: w, height: hc, class: 'f-green' }, g);
      const cr = S('g', { transform: `translate(${x + w / 2 - 11} ${base - H1 - 20})` }, g); critter(cr, 2, r.cached ? 'f-green' : 'f-ink2');
      if (n <= 8) {
        S('text', { x: x + w / 2, y: base + 16, class: 't2', 'font-size': 11, 'text-anchor': 'middle', text: k(r.input) }, g);
        S('text', { x: x + w / 2, y: base + 31, class: 't', 'font-size': 11, 'text-anchor': 'middle', text: usd(r.cost) }, g);
      }
    });
    const run = rows.reduce((a, r) => a + r.cost, 0), month = run * this.v.q;
    const y0 = 226, s = this.sum;
    S('text', { x: 30, y: y0, class: 't2', 'font-size': 12, text: 'one run' }, s);
    S('text', { x: 30, y: y0 + 24, class: 't', 'font-size': 20, text: usd(run, run < .1 ? 3 : 2) }, s);
    S('text', { x: 150, y: y0, class: 't2', 'font-size': 12, text: `one user, ${this.v.q} runs/month` }, s);
    S('text', { x: 150, y: y0 + 24, class: 't', 'font-size': 20, text: usd(month, 2), style: month > 15 ? 'fill:var(--ochre-t)' : 'fill:var(--green-t)' }, s);
    // against a €15/month plan
    const scale = 230 / Math.max(15, month) , bx = 340;
    S('text', { x: bx, y: y0, class: 't2', 'font-size': 12, text: 'vs a €15/month plan' }, s);
    S('rect', { x: bx, y: y0 + 10, width: 230, height: 12, rx: 3, class: 'f-rule' }, s);
    S('rect', { x: bx, y: y0 + 10, width: Math.max(2, month * scale), height: 12, rx: 3, class: month > 15 ? 'f-ochre' : 'f-green' }, s);
    S('line', { x1: bx + 15 * scale, x2: bx + 15 * scale, y1: y0 + 4, y2: y0 + 28, class: 's-ink', 'stroke-width': 1.5 }, s);
    S('text', { x: bx + 15 * scale, y: y0 + 42, class: 't3', 'font-size': 11, 'text-anchor': month > 15 && 15 * scale < 60 ? 'start' : 'middle', text: '€15' }, s);
    const m = 15 - month;
    S('text', { x: 570, y: y0 + 58, class: 't2', 'font-size': 12, 'text-anchor': 'end', text: m >= 0 ? `~${usd(m, 2)} left for everything else` : `${usd(-m, 2)} under water, per user` }, s);
  }
  render() {}
}

// ── fig 3 · what breaks the prefix ─────────────────────────────────────────
// blocks: [label, thousands of tokens, text shown in req N, text in req N+1]
const SCENES = [
  { name: 'stable prefix', sys: ['', ''] },
  { name: 'timestamp in the system prompt', sys: ['now: 14:03:27', 'now: 14:03:41'] },
  { name: 'timestamp rounded to the day', sys: ['date: 2026-04-28', 'date: 2026-04-28'] },
];
const BLOCKS = [['system', 3], ['tools', 3], ['history', 14], ['tool result', 6]];
const NEW = [['reply', 1], ['new result', 1]];

class CostPrefix extends Figure {
  constructor() { super(); this.duration = 16.5; this.loop = true; this.poster = 4.6; }
  build() {
    const svg = this.svgRoot(600, 282, 'Prefix caching: matching blocks are served from cache until the first difference');
    this.X0 = 110; this.W = 470; this.total = 28;
    const px = v => v / this.total * this.W;
    this.heading = S('text', { x: 30, y: 26, class: 't', 'font-size': 14 }, svg);
    S('text', { x: 30, y: 82, class: 't2', 'font-size': 12, text: 'request 7' }, svg);
    S('text', { x: 30, y: 152, class: 't2', 'font-size': 12, text: 'request 8' }, svg);
    const row = (y, blocks) => {
      let x = this.X0;
      return blocks.map(([name, v]) => {
        const w = px(v), g = S('g', {}, svg);
        const r = S('rect', { x: x + 1, y, width: w - 2, height: 34, rx: 5, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
        const f = S('rect', { x: x + 1, y, width: 0, height: 34, rx: 5, class: 'f-green', opacity: .85 }, g);
        const fits = name.length * 10.5 * CW + 10 < w;
        const t = S('text', { x: x + 6, y: y + 21, class: 't2', 'font-size': 10.5, text: fits ? name : '' }, g);
        const o = { g, r, f, t, x, w, name, v }; x += w; return o;
      });
    };
    this.a = row(60, BLOCKS);
    this.b = row(130, BLOCKS.concat(NEW));
    this.stampA = S('text', { x: this.X0 + 4, y: 110, class: 't3', 'font-size': 10.5 }, svg);
    this.stampB = S('text', { x: this.X0 + 4, y: 180, class: 't3', 'font-size': 10.5 }, svg);
    this.scan = S('line', { y1: 50, y2: 172, class: 's-green', 'stroke-width': 2 }, svg);
    this.miss = S('g', {}, svg);
    S('path', { d: 'M-6 -6 L6 6 M6 -6 L-6 6', class: 's-ochre', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, this.miss);
    this.missT = S('text', { x: 10, y: 4, class: 't', 'font-size': 12, style: 'fill:var(--ochre-t)', text: 'differs here' }, this.miss);
    this.read = S('text', { x: 30, y: 222, class: 't', 'font-size': 14 }, svg);
    S('rect', { x: 30, y: 234, width: 550, height: 8, rx: 4, class: 'f-rule' }, svg);
    this.bar = S('rect', { x: 30, y: 234, height: 8, rx: 4, class: 'f-green' }, svg);
    this.cost = S('text', { x: 30, y: 266, class: 't2', 'font-size': 12 }, svg);
    S('text', { x: 580, y: 188, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: '+2k new tokens ↑' }, svg);
  }
  label(t) { return SCENES[Math.min(2, Math.floor(t / 5.5))].name; }
  render(t) {
    const si = Math.min(2, Math.floor(t / 5.5)), lt = t - si * 5.5, sc = SCENES[si];
    this.heading.textContent = `${si + 1}/3 · ${sc.name}`;
    this.stampA.textContent = sc.sys[0] ? '↑ ' + sc.sys[0] : '';
    this.stampB.textContent = sc.sys[1] ? '↑ ' + sc.sys[1] : '';
    // how far the prefix matches, in tokens (thousands)
    const breaks = sc.sys[0] !== sc.sys[1];
    const matchTok = breaks ? 0 : BLOCKS.reduce((a, b) => a + b[1], 0);
    const p = ease(seg(lt, .5, 2.6));
    const scanTok = matchTok > 0 ? p * matchTok : 0;
    const scanX = this.X0 + scanTok / this.total * this.W;
    attr(this.scan, { x1: scanX, x2: scanX }); op(this.scan, lt > .4 && lt < 2.8 && matchTok > 0 ? 1 : 0);
    [this.a, this.b].forEach(row => {
      let acc = 0;
      row.forEach(o => {
        const fill = clamp((scanTok - acc) / o.v) * o.w;
        attr(o.f, { width: Math.max(0, fill - 2) });
        o.t.setAttribute('class', fill > o.w * .5 ? 't' : 't2');
        acc += o.v;
      });
    });
    const showMiss = breaks && lt > .9;
    attr(this.miss, { transform: `translate(${this.X0 + 130} 176)` }); op(this.miss, showMiss ? 1 : 0);
    const done = lt > 2.6 || breaks && lt > .9;
    const cached = done ? matchTok * 1000 : scanTok * 1000, tot = this.total * 1000;
    this.read.textContent = `cache_read_input_tokens: ${Math.round(cached).toLocaleString('en-US')} / ${tot.toLocaleString('en-US')}`;
    attr(this.bar, { width: Math.max(0, cached / tot * 550) });
    const cost = (cached * .3 + (tot - cached) * 3) / 1e6;
    this.cost.textContent = done ? `input cost ${usd(cost, 4)} (vs $0.0840 uncached)` : '';
    op(this.read, lt > .3 ? 1 : 0);
  }
}

// ── fig 4 · the router ────────────────────────────────────────────────────
const MSGS = [
  ['summarize this doc', 0], ['explain this stack trace', 1], ['fix the typo in my email', 0], ['translate to french', 0],
  ['format this as a table', 0], ['compare these two apis', 1], ["what's 15% of 340?", 0], ['refactor this module to async + update all the tests', 2],
  ['extract the dates', 0], ['convert to bullet points', 0], ['write a sql query for monthly churn', 1], ['make this title shorter', 0],
  ['is this json valid?', 0], ['spell-check this', 0], ['review this pull request', 1], ['rename these files', 0],
  ['short reply to this email', 0], ['list the key names', 0], ['plan a 3-step migration', 1], ['what time is it in tokyo?', 0],
];
const TIERS = [['fast', 'gpt-oss-20b'], ['standard', 'qwen3.5-plus'], ['complex', 'claude-opus-4-6']];
const PER = .8;

class CostRouter extends Figure {
  constructor() { super(); this.duration = MSGS.length * PER + 2; this.loop = true; this.poster = this.duration - .5; }
  build() {
    const svg = this.svgRoot(600, 330, 'A router sends each request to a fast, standard or complex model');
    this.msg = S('text', { x: 300, y: 30, class: 't', 'font-size': 13, 'text-anchor': 'middle' }, svg);
    // router box
    S('rect', { x: 200, y: 92, width: 120, height: 64, rx: 10, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
    S('text', { x: 260, y: 120, class: 't', 'font-size': 13, 'text-anchor': 'middle', text: 'router' }, svg);
    S('text', { x: 260, y: 138, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: 'gpt-oss-120b' }, svg);
    this.rdot = S('circle', { cx: 308, cy: 103, r: 3.2, class: 'f-ink3' }, svg);
    S('path', { d: 'M40 124 H200', class: 'f-none s-rule', 'stroke-width': 1.2, 'stroke-dasharray': '3 4' }, svg);
    S('text', { x: 40, y: 100, class: 't3', 'font-size': 11, text: 'requests' }, svg);
    this.lanes = TIERS.map(([name, model], i) => {
      const y = 70 + i * 62;
      S('path', { d: `M320 124 C360 124 370 ${y + 14} 400 ${y + 14} H584`, class: 'f-none s-rule', 'stroke-width': 1.2 }, svg);
      S('text', { x: 404, y: y + 2, class: 't', 'font-size': 12, text: name }, svg);
      S('text', { x: 404 + name.length * 12 * CW + 8, y: y + 2, class: 't3', 'font-size': 10.5, text: model }, svg);
      const n = S('text', { x: 584, y: y + 31, class: 't2', 'font-size': 12, 'text-anchor': 'end' }, svg);
      const pile = S('g', {}, svg);
      return { y, n, pile };
    });
    this.walker = S('g', {}, svg);
    this.walkerC = critter(this.walker, 2, 'f-green');
    this.rc = S('text', { x: 30, y: 290, class: 't', 'font-size': 13 }, svg);
    this.rl = S('text', { x: 30, y: 310, class: 't3', 'font-size': 11, text: 'about 40ms of extra generation per request · $0.023 per 1,000 messages' }, svg);
    this.counts = [0, 0, 0];
  }
  label(t) { return `${Math.min(MSGS.length, Math.floor(t / PER) + 1)}/${MSGS.length}`; }
  render(t) {
    const i = Math.min(MSGS.length - 1, Math.floor(t / PER)), lt = t - i * PER, [text, tier] = MSGS[i];
    const counts = [0, 0, 0];
    MSGS.slice(0, Math.min(MSGS.length, Math.floor(t / PER) + (lt > PER * .8 ? 1 : 0))).forEach(m => counts[m[1]]++);
    const routedTotal = counts[0] + counts[1] + counts[2];
    this.msg.textContent = t < MSGS.length * PER ? `"${text}"` : 'done';
    this.lanes.forEach((l, j) => {
      l.n.textContent = `${counts[j]}${routedTotal ? ' · ' + Math.round(counts[j] / routedTotal * 100) + '%' : ''}`;
      if (l.pile.childElementCount !== counts[j]) {
        l.pile.replaceChildren();
        for (let c = 0; c < counts[j]; c++) {
          const g = S('g', { transform: `translate(${404 + c * 8.5} ${l.y + 23})` }, l.pile);
          S('rect', { width: 7, height: 9, rx: 2, class: j === 0 ? 'f-ink3' : j === 1 ? 'f-ink2' : 'f-ochre' }, g);
        }
      }
    });
    // the request walks in, waits in the router, walks out to its lane
    const inT = inout(seg(lt, 0, PER * .35)), outT = inout(seg(lt, PER * .5, PER * .82));
    const ly = this.lanes[tier].y + 14;
    let x, y;
    if (outT <= 0) { x = lerp(40, 248, inT); y = 124; }
    else { x = lerp(272, 520, outT); y = lerp(124, ly, Math.min(1, outT * 1.6)); }
    attr(this.walker, { transform: `translate(${x - 11} ${y - 2})` });
    op(this.walker, t < MSGS.length * PER && lt < PER * .84 ? 1 : 0);
    this.rdot.setAttribute('class', lt > PER * .35 && lt < PER * .5 && t < MSGS.length * PER ? 'f-green' : 'f-ink3');
    this.rc.textContent = `routing cost so far: $${(routedTotal * 0.000023).toFixed(6)}`;
  }
}

define({ 'cost-stack': CostStack, 'cost-calc': CostCalc, 'cost-prefix': CostPrefix, 'cost-router': CostRouter });
