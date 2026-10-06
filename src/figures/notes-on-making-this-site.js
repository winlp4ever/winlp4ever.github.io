import { S, H, attr, op, seg, ease, inout, lerp, clamp, critter, handArrow, drawOn, REDUCED, STILL, Figure, define } from './core.js';

// ── fig 1 · javascript before you scroll ───────────────────────────────────
// gzipped KB of <script src> loaded by one article per blog, measured with curl
// (research/inspirations.md). "us" is measured from this site's dist folder.
const BLOGS = [
  ['emilkowal.ski', 911], ['maximeheckel.com', 861], ['nan.fyi', 416], ['gwern.net', 403],
  ['joshwcomeau.com', 286], ['ciechanow.ski', 207], ['acko.net', 169], ['redblobgames.com', 62],
  ['pudding.cool', 10], ['samwho.dev', 0],
];
const US = { before: 1.3, after: 15.8 };

class SiteWeight extends Figure {
  build() {
    this.idleText = 'interactive';
    this.mode = 'before';
    // narrow screens get a narrower canvas, so the text stays readable
    const narrow = this.clientWidth > 0 && this.clientWidth < 520;
    this.vw = narrow ? 360 : 600;
    const svg = this.svgRoot(this.vw, 340, 'Bar chart of JavaScript loaded up front per blog');
    S('text', { x: narrow ? 4 : 24, y: 22, class: 'sl', 'font-size': 11, text: 'GZIPPED KB · LINEAR SCALE' }, svg);
    this.x0 = narrow ? 134 : 170; this.W = narrow ? 180 : 340;
    this.rows = [...BLOGS.map(([n, v]) => ({ n, v })), { n: 'this site', v: US.before, us: true }].map(r => {
      const g = S('g', {}, svg);
      r.g = g;
      r.name = S('text', { x: this.x0 - 12, y: 14, class: r.us ? 't' : 't2', 'font-size': 13, 'text-anchor': 'end', text: r.n, style: r.us ? 'fill:var(--green-t);font-weight:700' : '' }, g);
      r.bar = S('rect', { x: this.x0, y: 3, height: 15, rx: 2, class: r.us ? 'f-green' : 'f-ink3' }, g);
      r.val = S('text', { y: 15, class: r.us ? 't' : 't2', 'font-size': 13, style: r.us ? 'fill:var(--green-t);font-weight:700' : '' }, g);
      r.cy = 0; r.cv = 0;
      return r;
    });
    this.us = this.rows[this.rows.length - 1];
    this.note = S('text', { class: 'hand', 'font-size': 15, text: 'we are down here' }, svg);
    this.arrow = S('path', { class: 'f-none s-ink2', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, svg);
    const bar = H('div', { class: 'fc' }, this);
    this.btns = [['before', 'before you scroll'], ['after', 'after every figure']].map(([m, txt]) => {
      const b = H('button', { class: 'pill', type: 'button', text: txt, 'aria-pressed': m === this.mode }, bar);
      b.onclick = () => { this.mode = m; this.btns.forEach(x => x.setAttribute('aria-pressed', x === b)); this.go(); };
      return b;
    });
    H('span', { class: 'grow' }, bar);
    this.hint = H('span', { class: 't3', text: '' }, bar);
  }
  layout() {
    this.us.v = US[this.mode];
    const sorted = this.rows.slice().sort((a, b) => b.v - a.v);
    return this.rows.map(r => ({ y: 36 + sorted.indexOf(r) * 27, v: r.v }));
  }
  paint(k) {
    const max = 911;
    this.rows.forEach((r, i) => {
      const t = this.tgt[i], y = lerp(r.fy, t.y, k), v = lerp(r.fv, t.v, k);
      r.cy = y; r.cv = v;
      attr(r.g, { transform: `translate(0 ${y.toFixed(1)})` });
      const w = Math.max(r.us ? 2 : 0, v / max * this.W * this.grow);
      attr(r.bar, { width: w.toFixed(1) });
      attr(r.val, { x: this.x0 + w + 8 });
      r.val.textContent = v < .05 ? '~0' : r.us ? v.toFixed(1) : Math.round(v);
    });
    const u = this.us, y = u.cy + 10, x = this.x0 + Math.max(2, u.cv / 911 * this.W) + 60;
    const nx = Math.min(x + 52, this.vw - 128);
    attr(this.note, { x: nx, y: y - 30 });
    attr(this.arrow, { d: handArrow(nx - 4, y - 34, x + 6, y - 4, -.3) });
    const show = this.grow >= 1 ? 1 : 0;
    op(this.note, show); op(this.arrow, show);
    this.hint.textContent = this.mode === 'before' ? 'loader only' : 'loader + runtime + 9 figures';
  }
  go(first) {
    this.rows.forEach(r => { r.fy = r.cy; r.fv = r.cv; });
    this.tgt = this.layout();
    if (first) this.rows.forEach((r, i) => { r.fy = this.tgt[i].y; r.fv = this.tgt[i].v; });
    const t0 = performance.now(), D = REDUCED || STILL ? 1 : first ? 1100 : 600;
    cancelAnimationFrame(this.raf);
    const step = now => {
      const k = clamp((now - t0) / D);
      if (first) this.grow = ease(k);
      this.paint(first ? 1 : inout(k));
      if (k < 1) this.raf = requestAnimationFrame(step);
    };
    if (D === 1) { this.grow = 1; this.paint(1); } else this.raf = requestAnimationFrame(step);
  }
  onVisible(v) { if (v && !this.started) { this.started = true; this.grow = 0; this.go(true); } }
  render() {}
}

// ── fig 2 · the critter, layer by layer ────────────────────────────────────
const BODY = ['..............', '..............', '..............', '....XXXXXX....', '..XXXXXXXXXX..', '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.', 'XXXXXXXXXXXXXX', 'XXXXXXXXXXXXXX', 'XXXXXXXXXXXXXX', 'XXXXXXXXXXXXXX', '.XXXXXXXXXXXX.', '..XXX....XXX..'];
const cells = (rows) => { const c = []; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') c.push([i, j]); })); return c; };
const LAYERS = [
  { name: 'body', fill: 'var(--green)', px: cells(BODY), t: [.4, 3.4] },
  { name: 'sprout', fill: 'var(--green-t)', px: [[7, 1], [7, 2], [5, 0], [6, 0], [8, 0], [9, 0], [4, 1], [10, 1]], t: [3.6, 4.4] },
  { name: 'eyes', fill: '#211f1c', px: [[3, 6], [4, 6], [3, 7], [4, 7], [9, 6], [10, 6], [9, 7], [10, 7]], t: [4.6, 5.3] },
  { name: 'sparkle', fill: '#fff', px: [[3, 6], [9, 6]], t: [5.5, 5.9] },
  { name: 'blush', fill: 'var(--blush)', px: [[1, 8], [2, 8], [11, 8], [12, 8]], t: [6.1, 6.6] },
  { name: 'smile', fill: '#211f1c', px: [[5, 9], [8, 9], [6, 10], [7, 10]], t: [6.8, 7.3] },
];
class SiteCritter extends Figure {
  constructor() { super(); this.duration = 12; this.loop = false; this.poster = 9.5; }
  build() {
    const svg = this.svgRoot(600, 300, 'A pixel critter assembled layer by layer');
    const P = this.P = 17, ox = this.ox = 60, oy = this.oy = 34;
    for (let j = 0; j < 13; j++) for (let i = 0; i < 14; i++) S('circle', { cx: ox + i * P + P / 2, cy: oy + j * P + P / 2, r: 1, class: 'f-rule2' }, svg);
    this.root = S('g', {}, svg);
    this.base = S('g', {}, this.root); // body first, so the face draws on top
    this.sprout = S('g', {}, this.root);
    this.eyes = S('g', {}, this.root);
    this.face = S('g', {}, this.root);
    this.layers = LAYERS.map((L, li) => {
      const parent = L.name === 'body' ? this.base : L.name === 'sprout' ? this.sprout : (L.name === 'eyes' || L.name === 'sparkle') ? this.eyes : this.face;
      const rects = L.px.map(([i, j]) => S('rect', { x: ox + i * P, y: oy + j * P, width: P, height: P, style: `fill:${L.fill}`, 'shape-rendering': 'crispEdges' }, parent));
      const y = 70 + li * 30;
      const row = S('g', {}, svg);
      const dot = S('circle', { cx: 392, cy: y - 4, r: 4, class: 'f-none s-ink3', 'stroke-width': 1.4 }, row);
      S('text', { x: 406, y, class: 't', 'font-size': 14, text: L.name }, row);
      const n = S('text', { x: 576, y, class: 't3', 'font-size': 13, 'text-anchor': 'end' }, row);
      return { L, rects, dot, n };
    });
    S('text', { x: 392, y: 40, class: 'sl', 'font-size': 11, text: 'LAYERS' }, svg);
    S('text', { x: 576, y: 40, class: 'sl', 'font-size': 11, 'text-anchor': 'end', text: 'PIXELS' }, svg);
    this.total = S('text', { x: 576, y: 262, class: 't', 'font-size': 14, 'text-anchor': 'end' }, svg);
    S('line', { x1: 392, x2: 576, y1: 246, y2: 246, class: 's-rule', 'stroke-width': 1 }, svg);
    this.hi = S('text', { x: ox + 7 * P, y: oy + 13 * P + 26, class: 'hand', 'font-size': 17, 'text-anchor': 'middle', text: 'hi!' }, svg);
  }
  label(t) { const L = this.layers.find(l => t < l.L.t[1]); return L ? L.L.name : 'alive'; }
  render(t) {
    let total = 0;
    this.layers.forEach(({ L, rects, dot, n }) => {
      const k = seg(t, L.t[0], L.t[1]), shown = Math.round(k * rects.length);
      rects.forEach((r, i) => op(r, i < shown ? 1 : 0));
      const done = k >= 1;
      dot.setAttribute('class', done ? 'f-green' : k > 0 ? 'f-none s-green' : 'f-none s-ink3');
      n.textContent = shown + '/' + rects.length; total += shown;
    });
    this.total.textContent = total + ' px';
    // alive: blink twice and sway the sprout, all from t
    const blink = (t > 8.6 && t < 8.75) || (t > 10.6 && t < 10.75);
    attr(this.eyes, { transform: blink ? `translate(0 ${this.oy + 6.9 * this.P}) scale(1 .15) translate(0 ${-(this.oy + 6.9 * this.P)})` : '' });
    const sway = t > 7.6 ? Math.sin((t - 7.6) * 2.2) * 5 * seg(t, 7.6, 8.2) : 0;
    attr(this.sprout, { transform: `rotate(${sway.toFixed(2)} ${this.ox + 7.5 * this.P} ${this.oy + 3 * this.P})` });
    op(this.hi, seg(t, 7.8, 8.4));
  }
}

// ── fig 3 · one render(t), four callers ────────────────────────────────────
const HOPS = 4, HOP_T = 2; // four hops, two seconds each
const hop = t => { // the critter's position at time t: the whole scene is this function
  const tt = clamp(t, 0, HOPS * HOP_T), k = Math.min(HOPS - 1, Math.floor(tt / HOP_T)), u = clamp((tt - k * HOP_T) / HOP_T);
  const a = inout(seg(u, .1, .8));
  return { x: 70 + (k + a) * 110, y: -Math.sin(a * Math.PI) * 54, squash: u < .1 || u > .8 ? 1 : 0 };
};
class SiteTime extends Figure {
  constructor() { super(); this.duration = 8; this.loop = true; this.poster = 3.1; this.reduced = REDUCED; }
  build() {
    const svg = this.svgRoot(600, 330, 'A critter hopping, driven by a function of time');
    this.code = S('text', { x: 24, y: 30, class: 't', 'font-size': 15 }, svg);
    S('line', { x1: 40, x2: 560, y1: 180, y2: 180, class: 's-ink3', 'stroke-width': 1.4 }, svg);
    for (let k = 0; k <= HOPS; k++) S('circle', { cx: 70 + k * 110 + 16.5, cy: 186, r: 2.5, class: 'f-ink3' }, svg);
    this.shadow = S('ellipse', { cy: 182, rx: 16, ry: 3, class: 'f-rule2' }, svg);
    this.pet = S('g', {}, svg); critter(this.pet, 3, 'f-green');
    S('text', { x: 24, y: 226, class: 'sl', 'font-size': 11, text: 'SAME FUNCTION, SIX FIXED TIMES' }, svg);
    this.strip = [0, 1.5, 3, 4.5, 6, 7.5].map((ft, i) => {
      const x0 = 24 + i * 94, g = S('g', {}, svg);
      S('rect', { x: x0, y: 236, width: 86, height: 66, rx: 6, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
      S('line', { x1: x0 + 6, x2: x0 + 80, y1: 284, y2: 284, class: 's-ink3', 'stroke-width': 1 }, g);
      const p = hop(ft), m = S('g', { transform: `translate(${(x0 + 6 + (p.x - 70) / 440 * 64).toFixed(1)} ${(276 + p.y * .35).toFixed(1)})` }, g);
      critter(m, 1, 'f-ink3');
      S('text', { x: x0 + 43, y: 320, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: `t=${ft}` }, g);
      return { g, ft };
    });
  }
  timeline() {
    super.timeline();
    const bar = this.querySelector('.fc');
    this.rbtn = H('button', { class: 'pill', type: 'button', 'aria-pressed': this.reduced, text: 'reduced motion' }, bar);
    this.rbtn.onclick = () => { this.reduced = !this.reduced; this.rbtn.setAttribute('aria-pressed', this.reduced); this.render(this.t); };
  }
  label(t) { return 't = ' + t.toFixed(2); }
  render(t) {
    // reduced motion: same function, called only at the key times (each landing)
    const tt = this.reduced ? Math.floor(t / HOP_T) * HOP_T : t;
    const p = hop(tt);
    attr(this.pet, { transform: `translate(${p.x.toFixed(1)} ${(180 - 8 * 3 + p.y).toFixed(1)})` });
    attr(this.shadow, { cx: p.x + 16.5, rx: (16 + p.y * .12).toFixed(1) });
    this.code.textContent = `render(${tt.toFixed(2)})${this.reduced ? '   // reduced: key frames only' : ''}`;
    this.strip.forEach(s => op(s.g, Math.abs(s.ft - tt) < .76 ? 1 : .45));
  }
}

// ── fig 4 · what loads, and when ───────────────────────────────────────────
// gzipped bytes from the built transformer post (dist/)
const FILES = [
  ['index.html', 7.628, 'html'], ['BaseLayout.css', 4.997, 'css'], ['post.css', 2.842, 'css'], ['loader.js', 1.284, 'js'],
  ['core.js', 2.826, 'lazy'], ['figures module', 11.654, 'lazy'],
];
class SiteLazy extends Figure {
  constructor() { super(); this.duration = 12; this.loop = false; this.poster = 12; }
  build() {
    const svg = this.svgRoot(600, 330, 'A page scrolls; figure code loads when the first figure comes near');
    // page stand-in: 6000 px tall, drawn at 1/20
    const k = this.k = .05, px = this.px = 60, py = this.py = 24;
    this.view = 900; this.margin = 600; this.fig1 = 2400;
    S('rect', { x: px, y: py, width: 140, height: 6000 * k, rx: 6, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
    const block = (y, h, fig) => fig
      ? S('rect', { x: px + 12, y: py + y * k, width: 116, height: h * k, rx: 4, class: 'f-rule2' }, svg)
      : [0, 1, 2].forEach(i => S('rect', { x: px + 12, y: py + y * k + i * 7, width: i === 2 ? 70 : 116, height: 3, rx: 1.5, class: 'f-rule2' }, svg));
    block(150, 0); block(700, 0); block(1300, 0); block(1900, 0);
    this.figs = [2400, 3700, 4900].map(y => block(y, 700, true));
    block(3300, 0); block(4500, 0);
    S('text', { x: px + 70, y: py + 2400 * k + 21, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: 'fig 1' }, svg);
    S('text', { x: px - 10, y: py + 8, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: 'page' }, svg);
    this.marginR = S('rect', { x: px - 6, width: 152, rx: 4, class: 'f-none s-green', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    this.viewR = S('rect', { x: px - 6, width: 152, height: this.view * k, rx: 4, class: 'f-none s-ink', 'stroke-width': 2 }, svg);
    this.viewL = S('text', { x: px + 156, class: 't2', 'font-size': 11, text: 'screen' }, svg);
    this.marL = S('text', { x: px + 156, class: 't3', 'font-size': 11, text: '+600 px' }, svg);
    // request list
    S('text', { x: 300, y: 40, class: 'sl', 'font-size': 11, text: 'REQUESTS' }, svg);
    S('text', { x: 576, y: 40, class: 'sl', 'font-size': 11, 'text-anchor': 'end', text: 'GZIPPED KB' }, svg);
    this.reqs = FILES.map(([n, kb, kind], i) => {
      const y = 66 + i * 26, g = S('g', {}, svg);
      S('circle', { cx: 304, cy: y - 4, r: 3.5, class: kind === 'lazy' ? 'f-green' : 'f-ink3' }, g);
      S('text', { x: 316, y, class: 't', 'font-size': 13, text: n }, g);
      S('text', { x: 576, y, class: 't2', 'font-size': 13, 'text-anchor': 'end', text: kb.toFixed(1) }, g);
      return { g, kb, lazy: kind === 'lazy' };
    });
    S('line', { x1: 300, x2: 576, y1: 230, y2: 230, class: 's-rule', 'stroke-width': 1 }, svg);
    S('text', { x: 300, y: 256, class: 't2', 'font-size': 13, text: 'total' }, svg);
    this.sum = S('text', { x: 576, y: 258, class: 't', 'font-size': 22, 'text-anchor': 'end' }, svg);
    this.event = S('text', { x: 300, y: 300, class: 'hand', 'font-size': 16 }, svg);
  }
  scroll(t) { return 5100 * inout(seg(t, 1.2, 10.5)); }
  trig() { return this.fig1 - this.view - this.margin; } // scrollY at which the margin touches fig 1
  label(t) { const y = this.scroll(t); return 'scrollY ' + Math.round(y); }
  render(t) {
    const y = this.scroll(t), k = this.k, py = this.py;
    attr(this.viewR, { y: py + y * k });
    const mh = Math.max(0, Math.min(this.margin, 6000 - y - this.view));
    attr(this.marginR, { y: py + (y + this.view) * k, height: mh * k }); op(this.marginR, mh > 0 ? 1 : 0); op(this.marL, mh > 120 ? 1 : 0);
    attr(this.viewL, { y: py + y * k + 12 }); attr(this.marL, { y: py + (y + this.view) * k + 12 });
    // when does the lazy part arrive? the scroll time that reaches the trigger
    let tTrig = null;
    for (let s = 1.2; s <= 10.5; s += .02) if (this.scroll(s) >= this.trig()) { tTrig = s; break; }
    const hit = tTrig != null && t >= tTrig;
    let total = 0;
    this.reqs.forEach((r, i) => {
      const a = r.lazy ? (hit ? seg(t, tTrig + (i - 4) * .25, tTrig + .3 + (i - 4) * .25) : 0) : seg(t, .1 + i * .2, .4 + i * .2);
      op(r.g, a); total += r.kb * (a >= 1 ? 1 : 0);
    });
    this.sum.textContent = total.toFixed(1);
    this.marginR.setAttribute('class', hit ? 'f-none s-green' : 'f-none s-ink3');
    this.figs.forEach((f, i) => f.setAttribute('class', hit ? (i === 0 ? 'f-green' : 'f-rule2') : 'f-rule2'));
    op(this.figs[0], hit ? .55 : 1);
    this.event.textContent = !hit ? (t > 1.2 ? 'scrolling… no figure code yet' : 'page arrives') : 'margin touched fig 1, load figures';
  }
}

define({ 'site-weight': SiteWeight, 'site-critter': SiteCritter, 'site-time': SiteTime, 'site-lazy': SiteLazy });
