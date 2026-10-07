// Shared runtime for article figures.
// Each figure is a custom element. Timeline figures are pure functions of time:
// render(t) draws frame t, so play, scrub and reduced-motion all share one path.
// #still in the URL renders poster frames, #t=3.2 renders that exact second.

export const NS = 'http://www.w3.org/2000/svg';
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const SEEK = (location.hash.match(/^#t=([\d.]+)$/) || [])[1];
export const STILL = location.hash === '#still' || SEEK != null; // #still = poster frames, #t=3.2 = that exact frame

// ── helpers ────────────────────────────────────────────────────────────────
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => 1 - Math.pow(1 - clamp(t), 3);
export const inout = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const softmax = (xs, T = 1) => {
  const z = xs.map(x => x / T), m = Math.max(...z), e = z.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0); return e.map(x => x / s);
};
export const pct = p => p < .005 ? '<1%' : Math.round(p * 100) + '%';
export const fmt = x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2);
export const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const CW = .6; // JetBrains Mono advance width, in em

export function el(tag, attrs, parent, ns) {
  const e = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null) continue;
    if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
  }
  if (parent) parent.appendChild(e);
  return e;
}
export const S = (tag, attrs = {}, parent) => el(tag, attrs, parent, NS);
export const H = (tag, attrs = {}, parent) => el(tag, attrs, parent);
export const attr = (e, a) => { for (const k in a) e.setAttribute(k, a[k]); return e; };
export const op = (e, o) => e.setAttribute('opacity', +o.toFixed(3));

// cell colour: green positive, ochre negative, strength by magnitude
export function paint(rect, v) {
  rect.style.fill = v >= 0 ? 'var(--green)' : 'var(--ochre)';
  rect.style.fillOpacity = (.1 + .85 * Math.min(1, Math.abs(v))).toFixed(3);
}

// the critter: the site's sprout mascot at 11 px wide, same footprint as before
// (the sprout pokes 3 px above the box). G = sprout, X = body, E = eyes and smile.
export const CRITTER = ['...GG.GG...', '.....G.....', '...XXXXX...', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXEXXXXXEXX', 'XXEXXXXXEXX', 'XXXXEXEXXXX', 'XXXXXEXXXXX', '.XXXXXXXXX.', '..XX...XX..'];
export function critterPath(px, ch = 'X') {
  let d = '';
  CRITTER.forEach((row, j) => [...row].forEach((c, i) => { if (c === ch) d += `M${i * px} ${j * px}h${px}v${px}h${-px}z`; }));
  return d;
}
export const critter = (parent, px, cls = 'f-ink3') => {
  const g = S('g', { transform: `translate(0 ${-3 * px})` }, parent);
  S('path', { d: critterPath(px, 'X') + critterPath(px, 'G'), class: cls }, g);
  S('path', { d: critterPath(px, 'E'), class: 'f-panel' }, g);
  return g;
};

// hand-drawn shapes
export function roughLoop(cx, cy, rx, ry, seed) {
  const r = rng(seed), pts = [], n = 34, a0 = r() * 6.28;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (Math.PI * 2 + .45), j = 1 + (r() - .5) * .07 + i / n * .06;
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
}
export function handArrow(x1, y1, x2, y2, bend = .2) {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const a = Math.atan2(y2 - my, x2 - mx), h = 9;
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2} M${x2 - h * Math.cos(a - .45)} ${y2 - h * Math.sin(a - .45)} L${x2} ${y2} L${x2 - h * Math.cos(a + .45)} ${y2 - h * Math.sin(a + .45)}`;
}
export function drawOn(path, p) {
  if (!path._len) { path._len = path.getTotalLength() + 1; path.style.strokeDasharray = path._len; }
  path.style.strokeDashoffset = (path._len * (1 - clamp(p))).toFixed(1);
}
export const keyframes = (t, kf) => {
  if (t <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) if (t <= kf[i][0]) return lerp(kf[i - 1][1], kf[i][1], inout(seg(t, kf[i - 1][0], kf[i][0])));
  return kf[kf.length - 1][1];
};

// static charts: draw at k = 0..1 once, the first time they're on screen
export function entrance(fig, paint, ms = 900) {
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
// a row of toggle pills in the figure's control bar (created on first use)
export function pills(fig, items, value, on) {
  const bar = fig.querySelector('.fc') || H('div', { class: 'fc' }, fig);
  const btns = items.map(([v, label]) => {
    const b = H('button', { class: 'pill', type: 'button', text: label, 'aria-pressed': String(v === value) }, bar);
    b.onclick = () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); on(v); };
    return b;
  });
  return bar;
}

export const ICON = {
  play: '<svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z"/></svg>',
  pause: '<svg viewBox="0 0 12 12"><path d="M2.5 1.5h2.6v9H2.5zM6.9 1.5h2.6v9H6.9z"/></svg>',
  replay: '<svg viewBox="0 0 12 12"><path d="M6 1.5a4.5 4.5 0 1 1-4.3 3.2h1.6A3 3 0 1 0 6 3v1.8L3.2 2.3 6 0z"/></svg>',
};

// ── base figure ────────────────────────────────────────────────────────────
export class Figure extends HTMLElement {
  connectedCallback() {
    if (this.svg) return;
    this.duration = this.duration || 0;
    this.querySelector('.fallback')?.classList.add('sr');
    const head = H('div', { class: 'fh' }, this);
    H('span', { text: this.dataset.label || '' }, head);
    this.statusEl = H('span', { class: 'fs' }, head);
    this.build();
    if (this.duration) this.timeline();
    this.t = 0; this.playing = false;
    this.seek(SEEK != null ? Math.min(+SEEK, this.duration) : STILL || REDUCED ? (this.poster ?? this.duration) : 0);
    // start at 30% visible, stop only when fully off-screen: no flapping at the edge
    if (!STILL) new IntersectionObserver(([e]) => {
      const on = e.intersectionRatio >= .3, off = !e.isIntersecting;
      if (!on && !off) return;
      this.visible = on;
      if (!this.duration) return this.onVisible && this.onVisible(this.visible);
      if (on && !REDUCED && !this.held && (this.loop || this.t < this.duration)) this.play();
      else if (off) this.pause();
    }, { threshold: [0, .3] }).observe(this);
    else this.onVisible && this.onVisible(true);
  }
  timeline() {
    const bar = H('div', { class: 'fc' }, this);
    this.btn = H('button', { class: 'pill icon', type: 'button' }, bar);
    this.range = H('input', { type: 'range', min: 0, max: 1000, step: 1, value: 0, 'aria-label': 'Scrub through the animation' }, bar);
    this.lab = H('span', { class: 'fc-l' }, bar);
    this.btn.onclick = () => {
      if (this.playing) { this.held = true; this.pause(); }
      else { this.held = false; if (this.t >= this.duration) this.t = 0; this.play(); }
    };
    this.range.oninput = () => { this.held = true; this.pause(); this.seek(this.range.value / 1000 * this.duration); };
  }
  play() {
    if (this.playing) return;
    this.playing = true;
    cancelAnimationFrame(this.raf); // never more than one loop per figure
    let last = performance.now();
    const tick = now => {
      this.t += clamp((now - last) / 1000, 0, .1); last = now;
      if (this.t >= this.duration) {
        if (this.loop) this.t %= this.duration;
        else { this.t = this.duration; this.playing = false; }
      }
      this.render(this.t); this.sync();
      if (this.playing) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick); this.sync();
  }
  pause() { this.playing = false; cancelAnimationFrame(this.raf); this.sync(); }
  // interactive figures (no timeline) don't need to implement render
  render() {}
  seek(t) { this.t = t; this.render(t); this.sync(); }
  sync() {
    if (this.btn) {
      const ic = this.playing ? 'pause' : this.t >= this.duration ? 'replay' : 'play';
      if (this._ic !== ic) { this._ic = ic; this.btn.innerHTML = ICON[ic]; this.btn.setAttribute('aria-label', ic === 'pause' ? 'Pause' : ic === 'replay' ? 'Replay' : 'Play'); }
      this.range.value = Math.round(this.t / this.duration * 1000);
      const l = this.label ? this.label(this.t) : '';
      if (this.lab.textContent !== l) this.lab.textContent = l;
    }
    this.setStatus(this.playing ? 'running' : this.duration && this.t >= this.duration ? 'done' : (this.idleText || 'idle'));
  }
  setStatus(s, cls) {
    if (this._st === s) return; this._st = s;
    this.statusEl.innerHTML = `<i class="dot ${cls || s}"></i>${s}`;
  }
  svgRoot(w, h, label) {
    // on phones the svg keeps a readable minimum width and scrolls sideways inside this wrapper
    const wrap = H('div', { class: 'fsv', tabindex: 0, role: 'region', 'aria-label': (label || 'figure') + ' (scrolls sideways on small screens)' }, this);
    wrap.addEventListener('scroll', () => wrap.classList.toggle('end', wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4), { passive: true });
    return this.svg = S('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label }, wrap);
  }
}


// define figures once the fonts are ready, so character-width layouts are exact
export function define(defs) {
  const ready = Promise.race([
    Promise.all([document.fonts.load('20px "JetBrains Mono Variable"'), document.fonts.load('16px "Architects Daughter"')]),
    new Promise(r => setTimeout(r, 1500)),
  ]);
  ready.catch(() => {}).finally(() => { for (const k in defs) if (!customElements.get(k)) customElements.define(k, defs[k]); });
}
