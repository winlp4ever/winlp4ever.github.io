import { S, H, attr, op, seg, ease, inout, lerp, clamp, handArrow, drawOn, critter, Figure, define } from './core.js';

// ── small control helpers ──────────────────────────────────────────────────
const bar = parent => H('div', { class: 'fc' }, parent);
function choice(b, label, opts, value, onPick) {
  if (label) H('span', { class: 'mono', text: label }, b);
  const btns = opts.map(([v, t]) => {
    const x = H('button', { class: 'pill', type: 'button', text: t, 'aria-pressed': String(v === value) }, b);
    x.onclick = () => { btns.forEach(o => o.setAttribute('aria-pressed', String(o === x))); onPick(v); };
    return x;
  });
  return btns;
}
function slider(b, label, min, max, step, value, show, onInput) {
  H('span', { class: 'mono', text: label }, b);
  const r = H('input', { type: 'range', min, max, step, value, 'aria-label': label }, b);
  const out = H('span', { class: 'fc-l', text: show(value) }, b);
  r.oninput = () => { const v = +r.value; out.textContent = show(v); onInput(v); };
  return r;
}
const T = (parent, x, y, text, cls = 't', size = 13, extra = {}) => S('text', { x, y, class: cls, 'font-size': size, text, ...extra }, parent);

// ── fig 1 · index → shards → segments ──────────────────────────────────────
class EsAnatomy extends Figure {
  build() {
    this.idleText = 'interactive';
    this.gb = 120; this.P = 3; this.R = 1;
    const svg = this.svgRoot(600, 330, 'One index split into primary and replica shards across three nodes');
    this.g = S('g', {}, svg);
    const b1 = bar(this);
    slider(b1, 'index size', 5, 400, 5, this.gb, v => v + ' GB', v => { this.gb = v; this.draw(); });
    slider(bar(this), 'primaries', 1, 8, 1, this.P, String, v => { this.P = v; this.draw(); });
    slider(bar(this), 'replicas ', 0, 2, 1, this.R, String, v => { this.R = v; this.draw(); });
    this.draw();
  }
  render() {}
  draw() {
    const g = this.g, N = 3, nodes = [[], [], []];
    g.replaceChildren();
    // a replica never sits on the same node as its primary
    for (let p = 0; p < this.P; p++) {
      nodes[p % N].push({ p, prim: true });
      for (let r = 1; r <= this.R; r++) nodes[(p + r) % N].push({ p, prim: false });
    }
    const size = this.gb / this.P;
    const rows = Math.ceil(Math.max(...nodes.map(l => l.length)) / 2), bh = 44 + rows * 46, H = 30 + bh + 70;
    this.svg.setAttribute('viewBox', `0 0 600 ${H}`);
    const st = size < 10 ? ['too small', 'var(--ochre-t)', 's-ochre'] : size <= 50 ? ['ideal', 'var(--green-t)', 's-green'] : size <= 100 ? ['ok if heap is big', 'var(--ochre-t)', 's-ochre'] : ['risky', 'var(--red)', 's-red'];
    T(g, 584, 20, 'each tile is a whole Lucene index, segments and all', 'hand', 14, { 'text-anchor': 'end' });
    nodes.forEach((list, n) => {
      const x = 14 + n * 192, w = 188;
      S('rect', { x, y: 30, width: w, height: bh, rx: 10, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
      T(g, x + 12, 50, `node-${n + 1}`, 't2', 12);
      T(g, x + w - 12, 50, `${list.length} shard${list.length === 1 ? '' : 's'}`, 't3', 12, { 'text-anchor': 'end' });
      const nseg = clamp(Math.round(Math.log2(size + 1)), 2, 7);
      list.forEach((s, i) => {
        const tx = x + 10 + (i % 2) * 86, ty = 62 + Math.floor(i / 2) * 46;
        S('rect', { x: tx, y: ty, width: 82, height: 38, rx: 6, class: (s.prim ? 'f-panel ' : 'f-bg ') + st[2], 'stroke-width': s.prim ? 1.6 : 1.2, 'stroke-dasharray': s.prim ? null : '3 3' }, g);
        T(g, tx + 8, ty + 15, (s.prim ? 'P' : 'R') + s.p, s.prim ? 't' : 't2', 12);
        for (let k = 0; k < nseg; k++) {
          const h = 4 + ((s.p * 7 + k * 5) % 9);
          S('rect', { x: tx + 8 + k * 9, y: ty + 33 - h, width: 6, height: h, rx: 1, class: s.prim ? 'f-ink3' : 'f-rule2' }, g);
        }
      });
    });
    const total = this.P * (1 + this.R);
    T(g, 14, H - 40, `1 index × ${this.P} primar${this.P === 1 ? 'y' : 'ies'} × (1 + ${this.R}) = ${total} shards`, 't', 14);
    const line = T(g, 14, H - 14, '', 't2', 14);
    line.textContent = `each shard ≈ ${size < 10 ? size.toFixed(1) : Math.round(size)} GB · `;
    S('tspan', { style: `fill:${st[1]};font-weight:600`, text: st[0] }, line);
    T(g, 584, H - 14, 'segments ▮ grow with the shard', 't3', 12, { 'text-anchor': 'end' });
  }
}

// ── fig 2 · refresh makes segments ─────────────────────────────────────────
const RATE = 4, STOP = 18, MAXD = STOP * RATE;
function refreshSim(mode, t) {
  const I = mode === '1s' ? 1 : mode === '5s' ? 5 : Infinity;
  const times = [];
  if (isFinite(I)) for (let r = I; r <= t + 1e-9; r += I) times.push(r);
  else if (t >= 18.5) times.push(18.5);
  let segs = [], searchable = 0, merges = 0, lastMerge = -9;
  for (const tr of times) {
    const n = Math.min(MAXD, Math.floor(Math.min(tr, STOP) * RATE)), add = n - searchable;
    if (add > 0) { segs.push({ d: add, b: tr }); searchable = n; }
    // a tiny tiered merge policy: many small segments of similar size get merged into one
    for (const [lo, hi, k] of [[0, 20, 6], [20, 100, 4]]) {
      const tier = segs.filter(s => s.d >= lo && s.d < hi);
      if (tier.length >= k) {
        segs = segs.filter(s => !tier.includes(s));
        segs.push({ d: tier.reduce((a, s) => a + s.d, 0), b: tr, m: true });
        merges++; lastMerge = tr;
      }
    }
  }
  const indexed = Math.min(MAXD, Math.floor(Math.min(t, STOP) * RATE));
  return { segs, searchable, indexed, merges, times, lastMerge };
}
class EsRefresh extends Figure {
  constructor() { super(); this.duration = 20; this.loop = true; this.poster = 9.7; this.mode = '1s'; }
  build() {
    const svg = this.svgRoot(600, 330, 'Indexed documents only become searchable at each refresh, which writes a new segment');
    const b = bar(this);
    choice(b, 'refresh_interval', [['1s', '1s'], ['5s', '5s'], ['bulk', '-1, then refresh once']], this.mode, v => { this.mode = v; this.drawSeries(); this.seek(this.t); });
    T(svg, 20, 24, 'IN-MEMORY BUFFER', 'sl', 11);
    T(svg, 222, 24, 'SEGMENTS · SEARCHABLE', 'sl', 11);
    this.buf = S('rect', { x: 20, y: 34, width: 186, height: 158, rx: 10, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
    S('rect', { x: 222, y: 34, width: 358, height: 158, rx: 10, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
    this.dots = [];
    for (let i = 0; i < MAXD; i++) this.dots.push(S('circle', { cx: 38 + (i % 9) * 19, cy: 52 + Math.floor(i / 9) * 17.5, r: 4, class: 'f-ink3' }, svg));
    this.segG = S('g', {}, svg);
    this.counter = T(svg, 20, 216, '', 't2', 13);
    // chart: indexed vs searchable over time
    this.cx = s => 44 + s / 20 * 536; this.cy = n => 302 - n / MAXD * 64;
    S('line', { x1: 44, x2: 580, y1: 302, y2: 302, class: 's-rule', 'stroke-width': 1 }, svg);
    T(svg, 44, 322, '0s', 't3', 11, { 'text-anchor': 'middle' });
    T(svg, 580, 322, '20s', 't3', 11, { 'text-anchor': 'middle' });
    T(svg, 40, 242, String(MAXD), 't3', 11, { 'text-anchor': 'end' });
    T(svg, 40, 305, '0', 't3', 11, { 'text-anchor': 'end' });
    T(svg, 580, 232, '┄ indexed   ━ searchable', 't3', 11, { 'text-anchor': 'end' });
    const cid = 'clip' + Math.random().toString(36).slice(2, 7);
    this.clipR = S('rect', { x: 0, y: 220, width: 0, height: 110 }, S('clipPath', { id: cid }, S('defs', {}, svg)));
    const cg = S('g', { 'clip-path': `url(#${cid})` }, svg);
    this.pIdx = S('path', { class: 'f-none s-ink3', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, cg);
    this.pSea = S('path', { class: 'f-none s-green', 'stroke-width': 2 }, cg);
    this.ticks = S('g', {}, cg);
    this.mark = S('line', { y1: 236, y2: 306, class: 's-ink2', 'stroke-width': 1 }, svg);
    this.drawSeries();
  }
  drawSeries() {
    let di = '', ds = '';
    for (let i = 0; i <= 400; i++) {
      const t = i / 20, s = refreshSim(this.mode, t), x = this.cx(t).toFixed(1);
      di += (i ? 'L' : 'M') + x + ' ' + this.cy(s.indexed).toFixed(1);
      ds += (i ? 'L' : 'M') + x + ' ' + this.cy(s.searchable).toFixed(1);
    }
    attr(this.pIdx, { d: di }); attr(this.pSea, { d: ds });
    this.ticks.replaceChildren();
    for (const tr of refreshSim(this.mode, 20).times) S('line', { x1: this.cx(tr), x2: this.cx(tr), y1: 302, y2: 309, class: 's-green', 'stroke-width': 1.5 }, this.ticks);
  }
  label(t) { return t.toFixed(1) + 's'; }
  render(t) {
    const s = refreshSim(this.mode, t), pending = s.indexed - s.searchable;
    this.dots.forEach((d, i) => op(d, i < pending ? 1 : 0));
    const fresh = s.times.length && t - s.times[s.times.length - 1] < .45;
    this.buf.setAttribute('class', 'f-bg ' + (fresh ? 's-green' : 's-rule'));
    this.segG.replaceChildren();
    s.segs.forEach((sg, i) => {
      const y = 46 + i * 15, w = 6 + sg.d * 3.6, young = t - sg.b < .6;
      S('rect', { x: 234, y, width: w, height: 9, rx: 2, class: young ? (sg.m ? 'f-ochre' : 'f-green') : sg.m ? 'f-ink2' : 'f-ink3' }, this.segG);
      T(this.segG, 240 + w, y + 8.5, `${sg.d} docs${young && sg.m ? ' · merged' : ''}`, 't3', 10.5);
    });
    if (!s.segs.length) T(this.segG, 234, 56, 'nothing searchable yet', 't3', 12);
    this.counter.textContent = `indexed ${s.indexed} · searchable ${s.searchable} · segments ${s.segs.length} · refreshes ${s.times.length} · merges ${s.merges}`;
    attr(this.clipR, { width: this.cx(t) + 1 });
    const x = this.cx(t); attr(this.mark, { x1: x, x2: x });
  }
}

// ── fig 3 · query phase, then fetch phase ──────────────────────────────────
const SHARDS = [[[12, .91], [40, .40], [7, .22]], [[3, .87], [28, .83], [55, .10]], [[19, .35], [61, .30], [33, .12]]];
class EsPhases extends Figure {
  constructor() { super(); this.duration = 14; this.poster = 13.5; }
  build() {
    const svg = this.svgRoot(600, 340, 'A search scatters to every shard, gathers ids and scores, then fetches only the winning documents');
    this.cxs = [100, 300, 500];
    this.phase = T(svg, 14, 22, '', 'sl', 11);
    S('rect', { x: 210, y: 20, width: 150, height: 52, rx: 10, class: 'f-bg s-ink3', 'stroke-width': 1.2 }, svg);
    T(svg, 285, 64, 'coordinating node', 't2', 11.5, { 'text-anchor': 'middle' });
    this.me = S('g', {}, svg); critter(this.me, 2, 'f-green');
    this.reply = T(svg, 285, 92, '', 't', 13, { 'text-anchor': 'middle', style: 'fill:var(--green-t)' });
    // candidate list, filled from what the shards send back
    const all = SHARDS.flatMap((docs, s) => docs.map(([id, sc]) => ({ id, sc, s })));
    this.ranked = all.slice().sort((a, b) => b.sc - a.sc);
    this.top = new Set(this.ranked.slice(0, 3));
    T(svg, 396, 22, 'MERGED, TOP 3', 'sl', 11);
    this.list = this.ranked.map((d, i) => {
      const g = S('g', {}, svg);
      T(g, 396, 40 + i * 15, `#${d.id}`, this.top.has(d) ? 't' : 't3', 12);
      T(g, 436, 40 + i * 15, d.sc.toFixed(2), this.top.has(d) ? 't' : 't3', 12);
      T(g, 480, 40 + i * 15, `shard ${d.s}`, 't3', 11);
      if (this.top.has(d)) S('rect', { x: 386, y: 32 + i * 15, width: 4, height: 9, rx: 1, class: 'f-green' }, g);
      return { g, d };
    });
    this.shards = SHARDS.map((docs, s) => {
      const cx = this.cxs[s], g = S('g', {}, svg);
      S('rect', { x: cx - 88, y: 222, width: 176, height: 100, rx: 10, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
      T(g, cx - 76, 240, `shard ${s}`, 't2', 12);
      const bars = docs.map(([id, sc], j) => {
        T(g, cx - 76, 262 + j * 19, `#${id}`, 't', 12);
        S('rect', { x: cx - 36, y: 254 + j * 19, width: 90, height: 8, rx: 2, class: 'f-rule' }, g);
        return { b: S('rect', { x: cx - 36, y: 254 + j * 19, height: 8, rx: 2, class: 'f-ink3' }, g), sc };
      });
      return { g, bars, owns: docs.some(([id]) => [...this.top].some(d => d.id === id)) };
    });
    // moving things
    this.scouts = this.cxs.map(() => { const g = S('g', {}, svg); critter(g, 2, 'f-ink3'); return g; });
    this.packets = SHARDS.flatMap((docs, s) => docs.map(([id, sc]) => {
      const g = S('g', {}, svg);
      S('rect', { x: -26, y: -8, width: 52, height: 16, rx: 4, class: 'f-panel s-ink3', 'stroke-width': 1 }, g);
      T(g, 0, 4, `#${id} ${sc.toFixed(2).slice(1)}`, 't2', 10, { 'text-anchor': 'middle' });
      return { g, s, id, rank: this.ranked.findIndex(d => d.id === id) };
    }));
    this.docs = [...this.top].map(d => {
      const g = S('g', {}, svg);
      S('rect', { x: -22, y: -15, width: 44, height: 30, rx: 4, class: 'f-bg s-green', 'stroke-width': 1.3 }, g);
      for (let k = 0; k < 3; k++) S('rect', { x: -16, y: -9 + k * 7, width: k === 2 ? 20 : 32, height: 3, rx: 1, class: 'f-ink3' }, g);
      return { g, d };
    });
  }
  label(t) { return t < 1 ? 'request' : t < 7 ? 'query phase' : t < 11 ? 'fetch phase' : 'response'; }
  render(t) {
    this.phase.textContent = t < 1 ? 'SEARCH "AI"' : t < 7 ? 'QUERY PHASE' : t < 11 ? 'FETCH PHASE' : 'DONE';
    attr(this.me, { transform: `translate(${274} ${lerp(-10, 40, ease(seg(t, 0, .9)))})` }); op(this.me, seg(t, 0, .3));
    // query: one scout per shard
    this.scouts.forEach((g, s) => {
      const a = inout(seg(t, 1, 2.4)), b = inout(seg(t, 7.2, 8.6)), cx = this.cxs[s];
      let x = 274, y = 40, o = 0;
      if (t >= 1 && t < 2.8) { x = lerp(274, cx - 11, a); y = lerp(56, 200, a); o = 1 - seg(t, 2.5, 2.8); }
      if (t >= 7.2 && t < 9 && this.shards[s].owns) { x = lerp(274, cx - 11, b); y = lerp(56, 200, b); o = 1 - seg(t, 8.7, 9); }
      attr(g, { transform: `translate(${x} ${y})` }); op(g, o);
    });
    this.shards.forEach((sh, s) => {
      sh.bars.forEach((b, j) => attr(b.b, { width: 90 * b.sc * ease(seg(t, 2.4 + j * .15, 3.6 + j * .15)) }));
      op(sh.g, t >= 7 && t < 11.5 && !sh.owns ? .35 : 1);
    });
    // ids + scores fly up into the merged list
    this.packets.forEach(p => {
      const a = inout(seg(t, 3.8 + p.s * .25, 5.2 + p.s * .25)), j = SHARDS[p.s].findIndex(d => d[0] === p.id);
      const x = lerp(this.cxs[p.s] + 30, 470, a), y = lerp(258 + j * 19, 36 + p.rank * 15, a);
      attr(p.g, { transform: `translate(${x} ${y})` }); op(p.g, t < 3.8 ? 0 : 1 - seg(t, 5.3 + p.s * .25, 5.7 + p.s * .25));
    });
    this.list.forEach(({ g, d }, i) => op(g, seg(t, 5.4 + i * .08, 5.8 + i * .08) * (this.top.has(d) || t < 6.6 ? 1 : lerp(1, .45, seg(t, 6.6, 7)))));
    // fetch: full documents come back, only from shards that own a winner
    this.docs.forEach(({ g, d }, i) => {
      const a = inout(seg(t, 9 + i * .3, 10.4 + i * .3)), j = SHARDS[d.s].findIndex(x => x[0] === d.id);
      attr(g, { transform: `translate(${lerp(this.cxs[d.s] + 60, 230 + i * 50, a)} ${lerp(258 + j * 19, 112, a)})` });
      op(g, t < 9 + i * .3 ? 0 : 1);
    });
    this.reply.textContent = t >= 11 ? 'response: 3 full docs' : '';
  }
}

// ── fig 4 · where the time went (author's profile output) ──────────────────
const PROF = [
  ['rewrite', .008],
  ['query · ConstantScoreQuery', 2.607],
  ['collector · QueryPhaseCollector', 7.682],
  ['fetch · everything else', 2911.240 - 2891.236],
  ['fetch · load_stored_fields', 2891.236],
];
class EsProfile extends Figure {
  constructor() { super(); this.duration = 4; this.poster = 4; this.scale = 'linear'; }
  build() {
    const svg = this.svgRoot(600, 320, 'Profile breakdown: almost all of the time is spent loading stored fields in the fetch phase');
    const b = bar(this);
    choice(b, 'scale', [['linear', 'linear'], ['log', 'log']], this.scale, v => { this.scale = v; this.seek(this.t); });
    this.rows = PROF.map(([name, ms], i) => {
      const y = 30 + i * 46;
      T(svg, 20, y, name, 't2', 13);
      S('rect', { x: 20, y: y + 8, width: 440, height: 14, rx: 3, class: 'f-rule' }, svg);
      return {
        ms,
        b: S('rect', { x: 20, y: y + 8, height: 14, rx: 3, class: i === 4 ? 'f-ochre' : 'f-ink3' }, svg),
        v: T(svg, 584, y + 20, '', 't', 14, { 'text-anchor': 'end' }),
      };
    });
    const total = PROF.reduce((a, r) => a + r[1], 0), fetch = PROF[3][1] + PROF[4][1];
    this.foot = T(svg, 20, 272, `fetch: ${(fetch / total * 100).toFixed(1)}% of the measured time`, 't', 14);
    T(svg, 20, 296, `load_stored_fields per hit: 2,891 ms ÷ 10,000 hits ≈ ${(2891.236 / 10000).toFixed(2)} ms`, 't2', 13);
    this.note = T(svg, 268, 80, 'the part we were tuning', 'hand', 15);
    this.arrow = S('path', { d: handArrow(262, 77, 30, 89, .06), class: 'f-none s-ink2', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, svg);
  }
  label() { return this.scale; }
  render(t) {
    const max = 2891.236, lo = Math.log10(.001), hi = Math.log10(10000);
    this.rows.forEach((r, i) => {
      const g = ease(seg(t, .2 + i * .25, 1.8 + i * .25));
      const w = this.scale === 'log' ? (Math.log10(r.ms) - lo) / (hi - lo) * 440 : Math.max(1, r.ms / max * 440);
      attr(r.b, { width: (w * g).toFixed(1) });
      r.v.textContent = (r.ms * g < 10 ? (r.ms * g).toFixed(3) : Math.round(r.ms * g).toLocaleString('en')) + ' ms';
    });
    const show = this.scale === 'linear' ? seg(t, 2.6, 3.4) : 0;
    op(this.note, show); op(this.arrow, show); drawOn(this.arrow, show);
  }
}

// ── fig 5 · why reading _id touched _source ────────────────────────────────
const HITS = [3, 9, 14, 20, 1, 17, 22, 7];
class EsStored extends Figure {
  constructor() { super(); this.duration = 11; this.loop = true; this.poster = 10.5; this.mode = 'source'; }
  build() {
    const svg = this.svgRoot(600, 320, 'Reading the id of a hit from stored fields decompresses its whole chunk; doc values read one value from a column');
    const b = bar(this);
    choice(b, '', [['source', 'source=False'], ['dv', 'stored_fields="_none_" + docvalue_fields']], this.mode, v => { this.mode = v; this.seek(this.t); });
    T(svg, 20, 22, 'STORED FIELDS · COMPRESSED IN CHUNKS', 'sl', 11);
    T(svg, 396, 22, 'DOC VALUES · ONE COLUMN', 'sl', 11);
    this.chunks = [0, 1, 2, 3].map(c => {
      const y = 34 + c * 58, g = S('g', {}, svg);
      const box = S('rect', { x: 20, y, width: 340, height: 50, rx: 7, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
      const zip = S('g', {}, g);
      for (let k = 0; k < 14; k++) S('path', { d: `M${44 + k * 20} ${y + 16} l6 9 l6 -9`, class: 'f-none s-ink3', 'stroke-width': 1.2 }, zip);
      T(zip, 40, y + 42, `chunk ${c} · docs ${c * 6}–${c * 6 + 5} · compressed`, 't3', 11);
      const rows = S('g', {}, g);
      const ids = [];
      for (let k = 0; k < 6; k++) {
        const ry = y + 5 + k * 7;
        ids.push(S('rect', { x: 30, y: ry, width: 22, height: 5, rx: 1, class: 'f-ink3' }, rows));
        S('rect', { x: 56, y: ry, width: 140 + ((c * 6 + k) * 37) % 150, height: 5, rx: 1, class: 'f-rule2' }, rows);
      }
      T(rows, 352, y + 30, '_id + _source', 't3', 10, { 'text-anchor': 'end' });
      return { box, zip, rows, ids };
    });
    this.col = [];
    for (let i = 0; i < 24; i++) this.col.push(S('rect', { x: 400, y: 34 + i * 9.6, width: 60, height: 7.6, rx: 1.5, class: 'f-ink3' }, svg));
    T(svg, 470, 40, '"id", sorted', 't3', 11);
    T(svg, 470, 56, 'by doc number', 't3', 11);
    this.critter = S('g', {}, svg); critter(this.critter, 2, 'f-green');
    this.count = T(svg, 20, 290, '', 't', 13);
    this.count2 = T(svg, 20, 310, '', 't2', 12);
  }
  label(t) { return `hit ${Math.min(HITS.length, Math.floor(t / 1.2) + 1)}/${HITS.length}`; }
  render(t) {
    const A = this.mode === 'source', i = Math.min(HITS.length - 1, Math.floor(t / 1.2)), lt = t - i * 1.2, done = Math.min(HITS.length, Math.floor((t + .6) / 1.2));
    const h = HITS[i], c = Math.floor(h / 6), open = A ? seg(lt, 0, .3) * (1 - seg(lt, .9, 1.2)) : 0;
    this.chunks.forEach((ch, k) => {
      const on = A && k === c ? open : 0;
      op(ch.zip, 1 - on); op(ch.rows, on);
      ch.box.setAttribute('class', 'f-bg ' + (on > .5 ? 's-green' : 's-rule'));
      ch.ids.forEach((r, j) => r.setAttribute('class', on > .5 && k * 6 + j === h ? 'f-green' : 'f-ink3'));
      op(ch.box, A ? 1 : .45); if (!A) op(ch.zip, .45);
    });
    this.col.forEach((r, k) => r.setAttribute('class', !A && k === h && lt < 1 ? 'f-green' : 'f-ink3'));
    const ty = A ? 34 + c * 58 + 25 : 34 + h * 9.6 + 4, tx = A ? 368 : 466;
    attr(this.critter, { transform: `translate(${tx} ${ty - 8})` });
    this.count.textContent = A ? `ids read ${done} · chunks decompressed ${done} · docs decoded ${done * 6}` : `ids read ${done} · chunks decompressed 0 · column values read ${done}`;
    this.count2.textContent = A ? 'every hit unpacks its neighbours, _source included' : 'one small value per hit, no _source anywhere';
  }
}

// ── fig 6 · disk watermarks ────────────────────────────────────────────────
const MARKS = [[80, 'my alert'], [85, 'low'], [90, 'high'], [95, 'flood']];
class EsDisk extends Figure {
  build() {
    this.idleText = 'interactive'; this.used = 72;
    const svg = this.svgRoot(600, 300, 'Disk usage against the default Elasticsearch disk watermarks');
    T(svg, 20, 24, 'NODE-1 DISK', 'sl', 11);
    S('rect', { x: 20, y: 36, width: 560, height: 28, rx: 6, class: 'f-rule' }, svg);
    this.fill = S('rect', { x: 20, y: 36, height: 28, rx: 6 }, svg);
    const X = p => 20 + p / 100 * 560;
    MARKS.forEach(([p, name], i) => {
      const ly = 84 + i * 15;
      S('line', { x1: X(p), x2: X(p), y1: 30, y2: ly - 9, class: i ? 's-ink2' : 's-ink3', 'stroke-width': 1.2, 'stroke-dasharray': i ? null : '3 3' }, svg);
      T(svg, X(p) - 5, ly, `${name} ${p}%`, i ? 't2' : 't3', 11, { 'text-anchor': 'end' });
    });
    this.dot = S('circle', { cx: 28, cy: 158, r: 5 }, svg);
    this.ttl = T(svg, 42, 163, '', 't', 15);
    this.l1 = T(svg, 42, 184, '', 't2', 13);
    this.l2 = T(svg, 42, 202, '', 't2', 13);
    // shards on this node and the neighbour
    S('rect', { x: 20, y: 220, width: 270, height: 70, rx: 10, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
    S('rect', { x: 310, y: 220, width: 270, height: 70, rx: 10, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
    T(svg, 32, 238, 'node-1', 't3', 11); T(svg, 322, 238, 'node-2', 't3', 11);
    this.tiles = [0, 1, 2, 3, 4].map(k => {
      const g = S('g', { style: 'transition: transform .6s cubic-bezier(.2,.7,.2,1)' }, svg);
      S('rect', { x: 36 + k * 48, y: 248, width: 40, height: 30, rx: 5, class: 'f-panel s-ink3', 'stroke-width': 1.2 }, g);
      T(g, 56 + k * 48, 268, 'P' + k, 't2', 11, { 'text-anchor': 'middle' });
      return g;
    });
    this.lock = T(svg, 280, 238, '', 't', 11, { 'text-anchor': 'end', style: 'fill:var(--red)' });
    const b = bar(this);
    slider(b, 'disk used', 50, 99, 1, this.used, v => v + '%', v => { this.used = v; this.draw(); });
    this.draw();
  }
  render() {}
  draw() {
    const u = this.used;
    attr(this.fill, { width: u / 100 * 560 });
    const [col, title, a, b] =
      u < 80 ? ['var(--green)', 'fine', 'Nothing to do.', ''] :
      u < 85 ? ['var(--ochre)', 'past my alert line', 'Add disk or drop old indices now, while', 'nothing is being blocked yet.'] :
      u < 90 ? ['var(--ochre)', 'low watermark (85%)', 'No new shards get allocated to this node.', 'The ones already here stay put.'] :
      u < 95 ? ['var(--red)', 'high watermark (90%)', 'Elasticsearch starts moving shards off this node', 'to nodes with more room.'] :
               ['var(--red)', 'flood stage (95%)', 'Every index with a shard here becomes read-only (deletes', 'still work) until usage drops below the high watermark.'];
    this.fill.style.fill = col; this.dot.style.fill = col;
    this.ttl.textContent = title; this.l1.textContent = a; this.l2.textContent = b;
    const moved = u >= 90 ? 2 : 0;
    this.tiles.forEach((g, k) => { g.style.transform = k >= 5 - moved ? `translate(${290 - (5 - moved) * 48 + (k - (5 - moved)) * 0}px, 0)` : ''; });
    this.lock.textContent = u >= 95 ? 'read-only' : '';
  }
}

define({ 'es-anatomy': EsAnatomy, 'es-refresh': EsRefresh, 'es-phases': EsPhases, 'es-profile': EsProfile, 'es-stored': EsStored, 'es-disk': EsDisk });
