// Figures for "Behind prompt caching: a friendly intro to KV caching".
import { S, H, attr, op, seg, ease, inout, lerp, softmax, critter, handArrow, drawOn, REDUCED, STILL, Figure, define } from './core.js';

const WORDS = ['the', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'purred'];
const fmtN = n => Math.round(n).toLocaleString('en-US');
const pills = (bar, opts, cur, on) => {
  const btns = opts.map(([v, label]) => {
    const b = H('button', { class: 'pill', type: 'button', text: label, 'aria-pressed': v === cur }, bar);
    b.onclick = () => { btns.forEach(x => x.setAttribute('aria-pressed', x === b)); on(v); };
    return b;
  });
  return btns;
};

// ── fig 1 · the generation loop, with and without a cache ───────────────────
class KvLoop extends Figure {
  constructor() { super(); this.duration = 13.5; this.poster = 13.5; }
  build() {
    const svg = this.svgRoot(600, 330, 'Generating text token by token, with and without a KV cache');
    this.P = 3; this.N = 8; // prompt tokens, final length
    const x = i => 92 + i * 50;
    this.lanes = [['NO CACHE', 92, 'f-ochre'], ['KV CACHE', 222, 'f-green']].map(([name, y, flash], li) => {
      S('text', { x: 24, y: y - 52, class: 'sl', 'font-size': 11, text: name }, svg);
      const slots = WORDS.map((w, i) => {
        const g = S('g', {}, svg);
        const cg = S('g', { transform: `translate(${x(i) - 11} ${y - 30})` }, g); critter(cg, 2, 'f-ink3');
        S('text', { x: x(i), y: y + 2, class: 't2', 'font-size': 12, 'text-anchor': 'middle', text: w }, g);
        const k = S('rect', { x: x(i) - 11, y: y + 12, width: 10, height: 10, rx: 2 }, g);
        const v = S('rect', { x: x(i) + 1, y: y + 12, width: 10, height: 10, rx: 2 }, g);
        return { g, k, v };
      });
      S('text', { x: 590, y: y - 26, class: 'sl', 'font-size': 10, 'text-anchor': 'end', text: 'K,V COMPUTED' }, svg);
      const count = S('text', { x: 590, y: y + 2, class: 't', 'font-size': 26, 'text-anchor': 'end' }, svg);
      return { slots, count, flash, li };
    });
    S('text', { x: 24, y: 278, class: 't3', 'font-size': 11, text: 'k' }, svg);
    S('rect', { x: 38, y: 270, width: 10, height: 10, rx: 2, class: 'f-ink3' }, svg);
    S('text', { x: 54, y: 278, class: 't3', 'font-size': 11, text: 'v  = one token\'s key and value, at every layer' }, svg);
    this.note = S('text', { x: 300, y: 318, class: 'hand', 'font-size': 16, 'text-anchor': 'middle', text: 'same five tokens out. 25 K,V computations versus 7' }, svg);
  }
  // step s processes a context of P+s tokens and appends one token
  step(t) { return Math.min(4, Math.floor(Math.max(0, t - .5) / 2.4)); }
  label(t) { const s = this.step(t); return t < .5 ? 'prompt' : `step ${s + 1}/5`; }
  render(t) {
    const s = this.step(t), lt = t - .5 - s * 2.4, started = t >= .5, P = this.P;
    const flash = started && lt > .15 && lt < 1.1, pulse = flash ? .55 + .45 * Math.sin(seg(lt, .15, 1.1) * Math.PI) : 0;
    const done = started && lt >= .15;
    this.lanes.forEach(L => {
      let total = 0;
      for (let k = 0; k < s; k++) total += L.li === 0 ? P + k : (k ? 1 : P);
      if (done) total += L.li === 0 ? P + s : (s ? 1 : P);
      L.count.textContent = total;
      L.slots.forEach((sl, i) => {
        op(sl.g, i < P + s ? 1 : i === P + s && started ? ease(seg(lt, 1.6, 2.1)) : 0);
        const inCtx = started && i < P + s;
        const fresh = L.li === 0 ? inCtx : inCtx && (s ? i === P + s - 1 : true);
        let cls = 'f-ink3', o = .14;
        if (fresh && flash) { cls = L.flash; o = pulse; }
        else if (L.li === 1 && inCtx && (!fresh || done)) o = .6;
        [sl.k, sl.v].forEach(r => { r.setAttribute('class', cls); op(r, o); });
      });
    });
    op(this.note, seg(t, 11.8, 12.6));
  }
}

// ── fig 2 · why old rows never change ───────────────────────────────────────
class KvRows extends Figure {
  constructor() { super(); this.duration = 12; this.poster = 12; }
  build() {
    const svg = this.svgRoot(600, 330, 'Causal attention grid filling one row per generated token');
    const n = this.n = 6, c = 34, ox = 210, oy = 92, W = WORDS.slice(0, n);
    this.c = c; this.ox = ox; this.oy = oy;
    const r = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7);
    this.A = W.map((_, i) => { const s = W.map(() => r() * 3); s[i] += .6; const p = softmax(s.slice(0, i + 1)); return W.map((_, j) => j <= i ? p[j] : 0); });
    S('text', { x: ox + n * c / 2, y: 24, class: 'sl', 'font-size': 11, 'text-anchor': 'middle', text: 'KEYS AND VALUES (CACHED)' }, svg);
    this.cols = W.map((w, j) => {
      const g = S('g', {}, svg), x = ox + j * c;
      S('rect', { x: x + 5, y: 36, width: 11, height: 11, rx: 2, class: 'f-ink3' }, g);
      S('rect', { x: x + 18, y: 36, width: 11, height: 11, rx: 2, class: 'f-ink3' }, g);
      S('text', { x: x + c / 2, y: 70, class: 't2', 'font-size': 12, 'text-anchor': 'middle', text: w }, g);
      return { g, k: g.children[0], v: g.children[1] };
    });
    S('text', { x: ox - 74, y: oy - 10, class: 'sl', 'font-size': 11, 'text-anchor': 'middle', text: 'QUERY' }, svg);
    S('rect', { x: ox, y: oy, width: n * c, height: n * c, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
    this.rows = W.map((w, i) => {
      const g = S('g', {}, svg), y = oy + i * c;
      const q = S('rect', { x: ox - 104, y: y + 11, width: 12, height: 12, rx: 2, class: 'f-green' }, g);
      const qt = S('text', { x: ox - 86, y: y + 21, class: 't', 'font-size': 13, text: w }, g);
      const cells = this.A[i].map((a, j) => j <= i ? S('rect', { x: ox + j * c + 2, y: y + 2, width: c - 4, height: c - 4, rx: 3, class: 'f-ink' }, g) : null);
      const tag = S('text', { x: ox + n * c + 14, y: y + 21, class: 't3', 'font-size': 12 }, g);
      return { g, q, qt, cells, tag };
    });
    this.arrow = S('path', { d: handArrow(150, 300, ox + 14, oy + 6 * c + 4, -.2), class: 'f-none s-ink2', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, svg);
    this.note = S('text', { x: 24, y: 318, class: 'hand', 'font-size': 16, text: 'old rows never change' }, svg);
  }
  row(t) { return Math.min(this.n - 1, Math.floor(Math.max(0, t - .4) / 1.7)); }
  label(t) { return `token ${this.row(t) + 1}/${this.n}`; }
  render(t) {
    const cur = this.row(t), lt = t - .4 - cur * 1.7;
    this.cols.forEach((col, j) => {
      op(col.g, j < cur ? 1 : j === cur ? ease(seg(lt, 0, .4)) : 0);
      const fresh = j === cur && lt < 1.3;
      [col.k, col.v].forEach(e => e.setAttribute('class', fresh ? 'f-green' : 'f-ink3'));
    });
    this.rows.forEach((r, i) => {
      const a = i < cur ? 1 : i === cur ? ease(seg(lt, .3, .7)) : 0;
      op(r.g, a);
      r.cells.forEach((cell, j) => { if (cell) op(cell, (.08 + .92 * this.A[i][j]) * (i === cur ? ease(seg(lt, .5 + j * .08, .9 + j * .08)) : 1)); });
      const live = i === cur && lt < 1.5;
      op(r.q, live ? 1 : .12);
      r.qt.setAttribute('class', live ? 't' : 't3');
      r.tag.textContent = i < cur || (i === cur && lt > 1.3) ? 'q dropped' : i === cur ? '← new q' : '';
      r.tag.setAttribute('class', i === cur && lt <= 1.3 ? 't' : 't3');
    });
    const p = seg(t, 10.4, 11.4); drawOn(this.arrow, p); op(this.arrow, p > 0 ? 1 : 0); op(this.note, seg(t, 10.8, 11.6));
  }
}

// ── fig 3 · what the cache saves, and what it doesn't ───────────────────────
class KvWork extends Figure {
  build() {
    this.idleText = 'interactive'; this.n = 1000;
    const svg = this.svgRoot(600, 270, 'Work done to generate n tokens, with and without a cache, on a log scale');
    this.rows = [
      ['tokens pushed through the model', 'naive', 'ochre'], ['', 'cached', 'green'],
      ['query · key scores', 'naive', 'ochre'], ['', 'cached', 'green'],
    ].map(([title, who, col], i) => {
      const y = 46 + i * 44 + (i >= 2 ? 26 : 0);
      if (title) S('text', { x: 24, y: y - 12, class: 'sl', 'font-size': 11, text: title.toUpperCase() }, svg);
      S('text', { x: 24, y: y + 12, class: 't2', 'font-size': 13, text: who }, svg);
      S('rect', { x: 100, y, width: 360, height: 16, rx: 3, class: 'f-rule' }, svg);
      return { bar: S('rect', { x: 100, y, height: 16, rx: 3, class: 'f-' + col }, svg), val: S('text', { x: 590, y: y + 13, class: 't', 'font-size': 14, 'text-anchor': 'end' }, svg) };
    });
    this.r1 = S('text', { x: 590, y: 34, class: 'hand', 'font-size': 15, 'text-anchor': 'end' }, svg);
    this.r2 = S('text', { x: 590, y: 148, class: 'hand', 'font-size': 15, 'text-anchor': 'end' }, svg);
    const bar = H('div', { class: 'fc' }, this);
    H('span', { text: 'tokens generated', class: 'mono' }, bar);
    const NS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    const sl = H('input', { type: 'range', min: 0, max: NS.length - 1, step: 1, value: 6, 'aria-label': 'Tokens generated' }, bar);
    this.nl = H('span', { class: 'fc-l' }, bar);
    sl.oninput = () => { this.n = NS[+sl.value]; this.draw(); };
    sl.oninput();
  }
  draw() {
    const n = this.n, vals = [n * (n + 1) / 2, n, n * (n + 1) * (n + 2) / 6, n * (n + 1) / 2];
    const max = 11.3; // log10 of the naive score count at n = 10,000
    this.rows.forEach((r, i) => { attr(r.bar, { width: Math.max(2, 360 * Math.log10(vals[i] + 1) / max) }); r.val.textContent = fmtN(vals[i]); });
    this.nl.textContent = 'n = ' + fmtN(n);
    this.r1.textContent = fmtN(vals[0] / vals[1]) + '× fewer';
    this.r2.textContent = fmtN(vals[2] / vals[3]) + '× fewer, still growing';
  }
  render() {}
}

// ── fig 4 · the memory bill ─────────────────────────────────────────────────
const MODELS = {
  l2: { name: 'Llama-2-7B', layers: 32, kv: 32, hd: 128, params: 6.74, ctx: 4096 },
  l3: { name: 'Llama-3.1-8B', layers: 32, kv: 8, hd: 128, params: 8.03, ctx: 131072 },
  l70: { name: 'Llama-3.1-70B', layers: 80, kv: 8, hd: 128, params: 70.6, ctx: 131072 },
};
const CTX = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072], BATCH = [1, 2, 4, 8, 16, 32, 64];
const gb = b => b / 1e9, fmtB = b => b >= 1e9 ? (b / 1e9).toFixed(b >= 1e10 ? 0 : 1) + ' GB' : (b / 1e6).toFixed(0) + ' MB';
class KvMem extends Figure {
  build() {
    this.idleText = 'interactive'; this.m = 'l3'; this.ci = 3; this.bi = 0; this.bytes = 2;
    const svg = this.svgRoot(600, 230, 'KV cache memory calculator');
    this.f1 = S('text', { x: 24, y: 34, class: 't2', 'font-size': 13 }, svg);
    this.f2 = S('text', { x: 24, y: 62, class: 't', 'font-size': 17 }, svg);
    this.f3 = S('text', { x: 24, y: 90, class: 't2', 'font-size': 13 }, svg);
    S('text', { x: 24, y: 128, class: 'sl', 'font-size': 11, text: 'ONE 80 GB GPU' }, svg);
    S('rect', { x: 24, y: 138, width: 552, height: 30, rx: 5, class: 'f-rule' }, svg);
    this.w = S('rect', { x: 24, y: 138, height: 30, rx: 5, class: 'f-ink3' }, svg);
    this.kvr = S('rect', { y: 138, height: 30, rx: 5 }, svg);
    this.cap = S('line', { y1: 130, y2: 176, class: 's-ink', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, svg);
    this.wl = S('text', { y: 192, class: 't3', 'font-size': 12 }, svg);
    this.kl = S('text', { y: 192, class: 't', 'font-size': 12, 'text-anchor': 'end' }, svg);
    this.warn = S('text', { x: 24, y: 218, class: 'hand', 'font-size': 15 }, svg);
    const bar = H('div', { class: 'fc' }, this);
    pills(bar, Object.entries(MODELS).map(([k, v]) => [k, v.name]), this.m, v => { this.m = v; this.draw(); });
    H('span', { class: 'grow' }, bar);
    pills(bar, [[2, 'fp16'], [1, 'fp8']], this.bytes, v => { this.bytes = v; this.draw(); });
    const bar2 = H('div', { class: 'fc' }, this);
    const mk = (label, arr, key) => {
      H('span', { text: label, class: 'mono' }, bar2);
      const s = H('input', { type: 'range', min: 0, max: arr.length - 1, step: 1, value: this[key], 'aria-label': label }, bar2);
      s.oninput = () => { this[key] = +s.value; this.draw(); };
    };
    mk('context', CTX, 'ci'); mk('batch', BATCH, 'bi');
    this.draw();
  }
  draw() {
    const M = MODELS[this.m], T = CTX[this.ci], B = BATCH[this.bi];
    const perTok = 2 * M.layers * M.kv * M.hd * this.bytes, kv = perTok * T * B, w = M.params * 1e9 * 2;
    this.f1.textContent = `2 (K and V) × ${M.layers} layers × ${M.kv} kv heads × ${M.hd} dims × ${this.bytes} byte${this.bytes > 1 ? 's' : ''}`;
    this.f2.textContent = `= ${(perTok / 1024).toFixed(0)} KiB per token`;
    this.f3.textContent = `× ${T.toLocaleString('en-US')} tokens × ${B} sequence${B > 1 ? 's' : ''} = ${fmtB(kv)} of cache`;
    const scale = 552 / Math.max(88, gb(w + kv) * 1.04), X = 24;
    const ww = Math.min(gb(w) * scale, 552), kw = gb(kv) * scale;
    attr(this.w, { width: ww }); attr(this.kvr, { x: X + ww, width: Math.max(1.5, kw) });
    const over = gb(w + kv) > 80;
    this.kvr.setAttribute('class', over ? 'f-red' : 'f-green');
    attr(this.cap, { x1: X + 80 * scale, x2: X + 80 * scale });
    attr(this.wl, { x: X }); this.wl.textContent = `weights ${fmtB(w)} (16-bit)`;
    attr(this.kl, { x: 576 }); this.kl.textContent = `kv cache ${fmtB(kv)}`;
    this.warn.textContent = gb(w) > 80 ? "the weights alone don't fit. you'd shard across GPUs" : over ? "doesn't fit. something has to give" : T > M.ctx ? `fits, but ${M.name} was trained for ${M.ctx / 1024}k tokens` : '';
  }
  render() {}
}

// ── fig 5 · prompt caching is a prefix match ────────────────────────────────
const BLOCKS = [['system prompt', 2000], ['tools', 1500], ['examples', 1200], ['question', 30]];
const SCEN = {
  same: { label: 'new question', diff: 3, note: 'only the question is new' },
  tools: { label: 'tools reordered', diff: 1, note: 'mismatch at the tools: everything after is recomputed' },
  time: { label: 'timestamp in system prompt', diff: 0, note: 'first token differs: nothing is reused' },
};
class KvPrefix extends Figure {
  build() {
    this.idleText = 'interactive'; this.sc = 'same'; this.p = 1;
    const svg = this.svgRoot(600, 236, 'Two requests compared token by token; the shared prefix is read from cache');
    const total = BLOCKS.reduce((s, b) => s + b[1], 0) - 30, W = 552 - 44;
    let x = 24;
    // the 30-token question gets a fixed 44 px so you can see it
    this.bx = BLOCKS.map(([, n], i) => { const a = x; x += i === 3 ? 44 : n / total * W; return [a, x]; });
    const lane = (y, lab) => {
      S('text', { x: 24, y: y - 10, class: 'sl', 'font-size': 11, text: lab }, svg);
      return BLOCKS.map(([name], i) => {
        const [a, b] = this.bx[i];
        const r = S('rect', { x: a + 1, y, width: b - a - 2, height: 34, rx: 4, class: 'f-ink3' }, svg);
        const t = S('text', { x: (a + b) / 2, y: y + 22, class: 't', 'font-size': 12, 'text-anchor': 'middle', text: b - a > 70 ? name : i === 3 ? '?' : '' }, svg);
        return { r, t };
      });
    };
    this.top = lane(36, 'REQUEST 1 · CACHED ON THE SERVER');
    this.bot = lane(110, 'REQUEST 2');
    this.top.forEach(b => op(b.r, .35));
    this.scan = S('g', {}, svg); critter(this.scan, 2, 'f-green');
    this.line = S('line', { y1: 30, y2: 150, class: 's-green', 'stroke-width': 1.5 }, svg);
    this.cost = S('text', { x: 24, y: 200, class: 't', 'font-size': 18 }, svg);
    this.sub = S('text', { x: 24, y: 224, class: 't2', 'font-size': 12 }, svg);
    this.note = S('text', { x: 576, y: 168, class: 'hand', 'font-size': 15, 'text-anchor': 'end' }, svg);
    const bar = H('div', { class: 'fc' }, this);
    H('span', { text: 'request 2 has a…', class: 'mono' }, bar);
    pills(bar, Object.entries(SCEN).map(([k, v]) => [k, v.label]), this.sc, v => { this.sc = v; this.run(); });
    this.draw(1);
  }
  run() {
    if (REDUCED || STILL) return this.draw(1);
    const t0 = performance.now(); cancelAnimationFrame(this.raf); this.setStatus('running');
    const f = now => { const p = Math.min(1, (now - t0) / 1100); this.draw(p); if (p < 1) this.raf = requestAnimationFrame(f); else this.setStatus('interactive', 'idle'); };
    this.raf = requestAnimationFrame(f);
  }
  onVisible(v) { if (v && !this.seen) { this.seen = true; this.run(); } }
  draw(p) {
    const S0 = SCEN[this.sc], stop = this.bx[S0.diff][0], x = lerp(24, stop, inout(p));
    const total = BLOCKS.reduce((s, b) => s + b[1], 0);
    const hit = BLOCKS.slice(0, S0.diff).reduce((s, b) => s + b[1], 0), miss = total - hit;
    this.bot.forEach((b, i) => {
      const cls = i < S0.diff ? (x >= this.bx[i][1] - 1 ? 'f-green' : 'f-ink3') : p >= 1 ? 'f-ochre' : 'f-ink3';
      b.r.setAttribute('class', cls); op(b.r, cls === 'f-ink3' ? .35 : .9);
    });
    attr(this.scan, { transform: `translate(${x - 11} 172)` }); attr(this.line, { x1: x, x2: x });
    op(this.scan, p < 1 ? 1 : 0); op(this.line, p < 1 ? 1 : 0);
    const rel = (hit * .1 + miss) / total;
    this.cost.textContent = p >= 1 ? `${fmtN(hit)} tokens read from cache, ${fmtN(miss)} recomputed` : 'comparing…';
    this.sub.textContent = p >= 1 ? `input cost ≈ ${Math.round(rel * 100)}% of an uncached request (reads at 0.1× the base price)` : '';
    this.note.textContent = p >= 1 ? S0.note : '';
  }
  render() {}
}

define({ 'kv-loop': KvLoop, 'kv-rows': KvRows, 'kv-work': KvWork, 'kv-mem': KvMem, 'kv-prefix': KvPrefix });
