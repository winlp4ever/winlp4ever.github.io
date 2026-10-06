import { S, H, attr, op, seg, ease, inout, lerp, clamp, handArrow, drawOn, CW, REDUCED, STILL, Figure, define } from './core.js';

// ── the actual algorithm, small enough to run on every keystroke ─────────────
// cut patterns of a digit string: bit g set = cut after digit g
function chunksOf(num, mask) {
  const out = []; let s = 0;
  for (let g = 0; g < num.length - 1; g++) if (mask >> g & 1) { out.push([s, g + 1]); s = g + 1; }
  out.push([s, num.length]);
  return out;
}
// '' if valid, otherwise why not
function verdict(num, mask) {
  const ch = chunksOf(num, mask);
  if (ch.some(([a]) => num[a] === '0')) return 'zero';
  for (let k = 1; k < ch.length; k++) {
    const p = num.slice(...ch[k - 1]), c = num.slice(...ch[k]);
    if (p.length > c.length || (p.length === c.length && p > c)) return 'down';
  }
  return '';
}
const validMasks = num => { const out = []; for (let m = 0; m < 1 << (num.length - 1); m++) if (!verdict(num, m)) out.push(m); return out; };

// the O(n²) solution, recording every cell it computes
function solve(num) {
  const n = num.length;
  const lcp = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) if (num[i] === num[j]) lcp[i][j] = lcp[i + 1][j + 1] + 1;
  const ge = (a, b, L) => { const k = lcp[a][b]; return k >= L || num[a + k] >= num[b + k]; };
  const dp = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
  const pre = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
  dp[0][0] = 1; pre[0][0] = 1;
  const steps = [];
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= i; j++) {
      const start = i - j, st = { i, j, start, zero: num[start] === '0', short: Math.min(j - 1, start), shortSum: 0, same: null };
      if (!st.zero) {
        st.shortSum = pre[start][st.short];
        dp[i][j] = st.shortSum;
        if (j <= start) { st.same = ge(start, start - j, j); if (st.same) dp[i][j] += dp[start][j]; }
      }
      st.val = dp[i][j];
      pre[i][j] = pre[i][j - 1] + dp[i][j];
      steps.push(st);
    }
  }
  return { n, dp, pre, lcp, steps, answer: dp[n].reduce((a, b) => a + b, 0) };
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', pow10 = e => '10' + [...String(e)].map(d => SUP[d]).join('');
const digitsOnly = s => s.replace(/\D/g, '').slice(0, 12);

// ── fig 1 · cut explorer ───────────────────────────────────────────────────
class LcCuts extends Figure {
  build() {
    this.idleText = 'interactive';
    this.num = '121314'; this.mask = 0;
    const svg = this.svgRoot(600, 300, 'A digit string with clickable cuts between digits');
    this.g = S('g', {}, svg);
    const bar = H('div', { class: 'fc' }, this);
    H('span', { text: 'num =', class: 'mono' }, bar);
    this.input = H('input', { type: 'text', inputmode: 'numeric', value: this.num, maxlength: 12, 'aria-label': 'Digit string, up to 12 digits', style: 'font:500 14px var(--mono);color:var(--ink);background:var(--bg);border:1px solid var(--rule-2);border-radius:999px;padding:5px 12px;width:15ch;min-height:30px' }, bar);
    this.nextBtn = H('button', { class: 'pill', type: 'button', text: 'next valid →' }, bar);
    this.randBtn = H('button', { class: 'pill', type: 'button', text: 'random' }, bar);
    H('span', { class: 'grow' }, bar);
    H('span', { text: 'click the gaps', class: 't3' }, bar);
    this.input.oninput = () => { this.stop(); const v = digitsOnly(this.input.value); if (v) { this.num = v; this.mask = 0; this.draw(); } };
    this.input.onblur = () => (this.input.value = this.num);
    this.nextBtn.onclick = () => { this.stop(); this.next(); };
    this.randBtn.onclick = () => {
      this.stop();
      const n = 4 + Math.floor(Math.random() * 5), pool = Math.random() < .5 ? '0123456789' : '1123';
      let s = String(1 + Math.floor(Math.random() * 9));
      while (s.length < n) s += pool[Math.floor(Math.random() * pool.length)];
      this.num = s; this.input.value = s; this.mask = 0; this.draw();
    };
    this.draw();
  }
  stop() { this.held = true; clearInterval(this.timer); }
  next() {
    const v = this.valid; if (!v.length) return;
    const k = v.indexOf(this.mask); this.mask = v[(k + 1) % v.length]; this.draw();
  }
  onVisible(on) {
    clearInterval(this.timer);
    if (STILL) { this.mask = 0b1010; this.draw(); return; }
    if (on && !this.held && !REDUCED) this.timer = setInterval(() => this.next(), 1700);
  }
  draw() {
    const g = this.g, num = this.num, n = num.length;
    g.replaceChildren();
    this.valid = validMasks(num);
    const tw = 34, gap = 14, x0 = (600 - (n * tw + (n - 1) * gap)) / 2, y0 = 36;
    const X = i => x0 + i * (tw + gap);
    const why = verdict(num, this.mask), ch = chunksOf(num, this.mask);
    // digits
    [...num].forEach((d, i) => {
      S('rect', { x: X(i), y: y0, width: tw, height: 46, rx: 7, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
      S('text', { x: X(i) + tw / 2, y: y0 + 32, class: 't', 'font-size': 24, 'text-anchor': 'middle', text: d }, g);
    });
    // gaps: click to cut
    for (let k = 0; k < n - 1; k++) {
      const x = X(k) + tw + gap / 2, on = this.mask >> k & 1;
      const hit = S('g', { class: 'click', role: 'button', tabindex: 0, 'aria-label': `${on ? 'Remove' : 'Add'} cut after digit ${k + 1}` }, g);
      S('rect', { x: x - gap / 2 - 2, y: y0 - 10, width: gap + 4, height: 66, class: 'f-none', 'pointer-events': 'all' }, hit);
      S('line', { x1: x, x2: x, y1: y0 - 6, y2: y0 + 52, class: on ? 's-green' : 's-rule', 'stroke-width': on ? 3 : 1.2, 'stroke-dasharray': on ? null : '3 3', 'stroke-linecap': 'round' }, hit);
      const flip = () => { this.stop(); this.mask ^= 1 << k; this.draw(); };
      hit.onclick = flip;
      hit.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
    }
    // chunks with their verdicts
    const yb = y0 + 72;
    ch.forEach(([a, b], k) => {
      const xa = X(a) + 2, xb = X(b - 1) + tw - 2, s = num.slice(a, b);
      const bad0 = num[a] === '0';
      const prev = k ? num.slice(...ch[k - 1]) : null;
      const down = prev != null && (prev.length > s.length || (prev.length === s.length && prev > s));
      S('path', { d: `M${xa} ${yb - 6} V${yb} H${xb} V${yb - 6}`, class: 'f-none ' + (bad0 ? 's-ochre' : 's-ink3'), 'stroke-width': 1.4 }, g);
      S('text', { x: (xa + xb) / 2, y: yb + 22, class: bad0 ? 't' : 't2', 'font-size': 15, 'text-anchor': 'middle', text: bad0 ? 'leading 0' : s, style: bad0 ? 'fill:var(--ochre-t)' : null }, g);
      if (k) {
        const x = X(a) - gap / 2;
        S('text', { x, y: yb + 22, 'font-size': 16, 'text-anchor': 'middle', class: 't', text: down ? '>' : '≤', style: `fill:var(${down ? '--red' : '--green-t'});font-weight:700` }, g);
      }
    });
    // verdict
    const msg = why === 'zero' ? 'a chunk starts with 0' : why === 'down' ? 'goes down somewhere' : `valid · ${ch.length === 1 ? 'no cuts' : ch.map(([a, b]) => num.slice(a, b)).join(', ')}`;
    S('text', { x: 300, y: yb + 56, 'font-size': 16, 'text-anchor': 'middle', class: 't', text: (why ? '✗ ' : '✓ ') + msg, style: `fill:var(${why ? '--red' : '--green-t'})` }, g);
    // every cut pattern as a dot, valid ones green
    const total = 1 << (n - 1), yd = yb + 82;
    if (total <= 128) {
      const cols = Math.min(32, total), r = 5, step = 16, xs = 300 - (cols - 1) * step / 2;
      for (let m = 0; m < total; m++) {
        const cx = xs + (m % cols) * step, cy = yd + Math.floor(m / cols) * step, ok = !verdict(num, m);
        const c = S('circle', { cx, cy, r, class: ok ? 'f-green click' : 'f-rule2 click' }, g);
        if (m === this.mask) S('circle', { cx, cy, r: r + 3, class: 'f-none s-ink', 'stroke-width': 1.5 }, g);
        c.onclick = () => { this.stop(); this.mask = m; this.draw(); };
      }
    }
    const rows = total <= 128 ? Math.ceil(total / 32) : 0;
    S('text', { x: 300, y: yd + rows * 16 + (rows ? 14 : 0), 'font-size': 14, 'text-anchor': 'middle', class: 't2', text: `${this.valid.length} valid out of ${total.toLocaleString('en')} cut patterns${total > 128 ? ' (too many dots to draw)' : ''}` }, g);
    this.svg.setAttribute('viewBox', `0 0 600 ${Math.round(yd + rows * 16 + 30)}`);
  }
  render() {}
}

// ── fig 2 · how fast 2^(n-1) runs away ─────────────────────────────────────
class LcExplode extends Figure {
  constructor() { super(); this.duration = 11; this.poster = 11; }
  build() {
    const nar = this.clientWidth > 0 && this.clientWidth < 560;
    const svg = this.svgRoot(nar ? 360 : 600, nar ? 574 : 320, 'Number of digits in the operation count for 2 to the n minus 1, n cubed and n squared, as n grows to 3500');
    const x0 = 56, x1 = nar ? 330 : 360, y0 = nar ? 240 : 270, y1 = 40, N = 3500, Ymax = 1100;
    this.X = n => x0 + (n - 1) / (N - 1) * (x1 - x0);
    this.Y = d => y0 - d / Ymax * (y0 - y1);
    S('text', { x: 20, y: 24, class: 'sl', 'font-size': 11, text: 'DIGITS IN THE OPERATION COUNT' }, svg);
    for (const d of [0, 250, 500, 750, 1000]) {
      S('line', { x1: x0, x2: x1, y1: this.Y(d), y2: this.Y(d), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: x0 - 8, y: this.Y(d) + 4, class: 't3', 'font-size': 12, 'text-anchor': 'end', text: d }, svg);
    }
    for (const n of [1, 1000, 2000, 3000, 3500]) S('text', { x: this.X(n), y: y0 + 20, class: 't3', 'font-size': 12, 'text-anchor': 'middle', text: n === 1 ? 'n = 1' : n }, svg);
    const curve = f => { let d = ''; for (let k = 0; k <= 120; k++) { const n = 1 + k / 120 * (N - 1); d += (k ? 'L' : 'M') + this.X(n).toFixed(1) + ' ' + this.Y(f(n)).toFixed(1); } return d; };
    this.lines = [
      S('path', { d: curve(n => (n - 1) * Math.LOG10E * Math.LN2), class: 'f-none s-ochre', 'stroke-width': 2.2 }, svg),
      S('path', { d: curve(n => 3 * Math.log10(n)), class: 'f-none s-ink2', 'stroke-width': 1.6 }, svg),
      S('path', { d: curve(n => 2 * Math.log10(n)), class: 'f-none s-green', 'stroke-width': 2.2 }, svg),
    ];
    this.tags = [
      S('text', { x: nar ? 190 : 230, y: this.Y(800), class: 't', 'font-size': 14, text: '2ⁿ⁻¹', style: 'fill:var(--ochre-t)' }, svg),
      S('text', { x: nar ? 70 : 110, y: this.Y(40) - 8, class: 't2', 'font-size': 13, text: 'n³ and n², flat as a pancake' }, svg),
    ];
    this.mark = S('line', { y1: y1, y2: y0, class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
    this.dot = S('circle', { r: 4, class: 'f-ochre' }, svg);
    // readouts
    const rx = nar ? 20 : 392, ry = nar ? 250 : 0;
    S('text', { x: rx, y: ry + 60, class: 'sl', 'font-size': 11, text: 'AT 10⁹ OPS PER SECOND' }, svg);
    this.nT = S('text', { x: rx, y: ry + 96, class: 't', 'font-size': 22 }, svg);
    const row = (y, name, cls, style) => ({
      name: S('text', { x: rx, y, class: cls, 'font-size': 15, text: name, style }, svg),
      ops: S('text', { x: rx + 52, y, class: 't2', 'font-size': 15 }, svg),
      time: S('text', { x: rx + 52, y: y + 20, class: 't', 'font-size': 15, style }, svg),
    });
    this.rows = [row(ry + 140, '2ⁿ⁻¹', 't', 'fill:var(--ochre-t)'), row(ry + 196, 'n³', 't'), row(ry + 252, 'n²', 't', 'fill:var(--green-t)')];
    this.note = S('text', { x: rx, y: ry + 306, class: 'hand', 'font-size': 15, text: 'the universe is ~10¹⁷ s old' }, svg);
  }
  n(t) { return Math.max(2, Math.round(lerp(2, 3500, inout(seg(t, 2.6, 9.6))))); }
  label(t) { return 'n = ' + this.n(t); }
  render(t) {
    this.lines.forEach((p, i) => { const a = seg(t, .2 + i * .5, 2.2 + i * .5); drawOn(p, a); op(p, a > 0 ? 1 : 0); });
    this.tags.forEach((e, i) => op(e, seg(t, 1.6 + i * .5, 2.2 + i * .5)));
    const n = this.n(t), x = this.X(n), d2 = (n - 1) * Math.log10(2);
    attr(this.mark, { x1: x, x2: x }); attr(this.dot, { cx: x, cy: this.Y(d2) });
    this.nT.textContent = 'n = ' + n.toLocaleString('en');
    const sci = l10 => l10 < 6 ? Math.round(10 ** l10).toLocaleString('en') : pow10(Math.floor(l10));
    const dur = l10 => {
      const s = l10 - 9;
      if (s < -3) return '< 1 ms';
      if (s < 0) return Math.round(10 ** s * 1000) + ' ms';
      if (s < Math.log10(120)) return (10 ** s).toFixed(1) + ' s';
      if (s < Math.log10(7200)) return Math.round(10 ** s / 60) + ' min';
      if (s < Math.log10(3e7)) return Math.round(10 ** s / 3600) + ' h';
      return pow10(Math.floor(s)) + ' s';
    };
    [d2, 3 * Math.log10(n), 2 * Math.log10(n)].forEach((l, i) => {
      this.rows[i].ops.textContent = sci(l) + ' ops';
      this.rows[i].time.textContent = dur(l);
    });
    op(this.note, seg(t, 8, 9));
  }
}

// ── fig 3 · the dp table, one cell at a time ───────────────────────────────
class LcTable extends Figure {
  build() {
    this.svgRoot(600, 400, 'The dp table filling in cell by cell, showing which cells each cell reads from');
    const bar = H('div', { class: 'fc' }, this);
    H('span', { text: 'num =', class: 'mono' }, bar);
    this.pills = ['327', '1213', '11213', '094'].map(s => {
      const b = H('button', { class: 'pill', type: 'button', text: `"${s}"`, 'aria-pressed': s === '327' }, bar);
      b.onclick = () => { this.pills.forEach(p => p.setAttribute('aria-pressed', p === b)); this.setNum(s); };
      return b;
    });
    this.setNum('327', true);
  }
  setNum(num, first) {
    this.num = num; this.sol = solve(num);
    this.duration = .6 + this.sol.steps.length * 1.25 + 2.6;
    this.layout();
    if (!first) { const was = this.playing; this.pause(); this.seek(STILL || REDUCED ? this.duration : 0); if (was || !this.held) { this.held = false; this.play(); } }
  }
  layout() {
    const svg = this.svg, num = this.num, n = num.length;
    svg.replaceChildren();
    // the string, with chunk underlines
    const fs = 26, cw = fs * CW, sx = 40, sy = 52;
    S('text', { x: sx, y: 22, class: 'sl', 'font-size': 11, text: 'NUM' }, svg);
    this.digits = [...num].map((d, i) => S('text', { x: sx + i * cw * 1.5 + cw * .75, y: sy, class: 't', 'font-size': fs, 'text-anchor': 'middle', text: d }, svg));
    this.cx = i => sx + i * cw * 1.5;
    this.curU = S('rect', { y: sy + 8, height: 4, rx: 2, class: 'f-green' }, svg);
    this.prvU = S('rect', { y: sy + 8, height: 4, rx: 2, class: 'f-ochre' }, svg);
    // the grid: rows i = 0..n, cols j = 0..n
    const c = Math.min(42, 230 / (n + 1)), gx = 64, gy = 112;
    this.c = c; this.gx = gx; this.gy = gy;
    S('text', { x: gx - 26, y: gy - 12, class: 't3', 'font-size': 13, text: 'i\\j' }, svg);
    for (let k = 0; k <= n; k++) {
      S('text', { x: gx + k * c + c / 2, y: gy - 10, class: 't3', 'font-size': 13, 'text-anchor': 'middle', text: k }, svg);
      S('text', { x: gx - 10, y: gy + k * c + c / 2 + 5, class: 't3', 'font-size': 13, 'text-anchor': 'end', text: k }, svg);
    }
    this.cells = []; this.vals = [];
    for (let i = 0; i <= n; i++) {
      this.cells.push([]); this.vals.push([]);
      for (let j = 0; j <= n; j++) {
        const live = j <= i && (j > 0 || i === 0);
        this.cells[i].push(S('rect', { x: gx + j * c + 1, y: gy + i * c + 1, width: c - 2, height: c - 2, rx: 4, class: live ? 'f-bg s-rule' : 'f-rule', 'stroke-width': 1 }, svg));
        this.vals[i].push(S('text', { x: gx + j * c + c / 2, y: gy + i * c + c / 2 + 6, class: 't', 'font-size': Math.min(17, c * .45), 'text-anchor': 'middle' }, svg));
      }
    }
    this.vals[0][0].textContent = '1';
    this.hiShort = S('rect', { rx: 5, class: 'f-none s-green', 'stroke-width': 2.4 }, svg);
    this.hiSame = S('rect', { rx: 5, class: 'f-none s-ochre', 'stroke-width': 2.4 }, svg);
    this.hiCur = S('rect', { rx: 5, class: 'f-none s-ink', 'stroke-width': 2.4 }, svg);
    this.rowN = S('rect', { x: gx - 3, y: gy + n * c - 3, width: (n + 1) * c + 6, height: c + 6, rx: 7, class: 'f-none s-green', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
    // explanation panel
    const nar = this.clientWidth > 0 && this.clientWidth < 560;
    const px = nar ? 24 : Math.max(gx + (n + 1) * c + 34, 330), py = nar ? gy + (n + 1) * c + 40 : gy;
    this.px = px;
    S('text', { x: px, y: py - 10, class: 'sl', 'font-size': 11, text: 'THIS CELL' }, svg);
    this.lines = [0, 1, 2, 3, 4].map(k => S('text', { x: px, y: py + 18 + k * 30, class: k ? 't2' : 't', 'font-size': k ? 15 : 17, style: 'white-space:pre' }, svg));
    const ay = nar ? py + 18 + 4 * 30 + 26 : gy + (n + 1) * c + 36;
    this.answer = S('text', { x: nar ? 180 : 300, y: ay, class: 't', 'font-size': 18, 'text-anchor': 'middle' }, svg);
    this.note = S('text', { x: px, y: py + 18 + 5 * 30 + 6, class: 'hand', 'font-size': 16 }, svg);
    svg.setAttribute('viewBox', `0 0 ${nar ? 360 : 600} ${Math.round(ay + 20)}`);
  }
  label(t) { const k = Math.floor((t - .6) / 1.25); return k < 0 ? 'start' : k < this.sol.steps.length ? `cell ${k + 1}/${this.sol.steps.length}` : 'answer'; }
  box(r, i, j0, j1) {
    if (j1 < j0) return op(r, 0);
    const c = this.c;
    attr(r, { x: this.gx + j0 * c - 1, y: this.gy + i * c - 1, width: (j1 - j0 + 1) * c + 2, height: c + 2 }); op(r, 1);
  }
  render(t) {
    const { steps, n, answer } = this.sol, num = this.num;
    const k = Math.floor((t - .6) / 1.25), lt = (t - .6) - k * 1.25;
    // values appear once their step has run
    steps.forEach((s, idx) => {
      const v = this.vals[s.i][s.j], done = idx < k || (idx === k && lt > .7);
      v.textContent = done ? s.val : '';
      v.style.fill = done && s.val === 0 ? 'var(--ink-3)' : '';
    });
    const cur = steps[k];
    const cw = 26 * CW, u = (a, b) => ({ x: this.cx(a) + cw * .25, width: Math.max(0, this.cx(b) - this.cx(a) - cw * .5) });
    if (cur) {
      const { i, j, start, zero, short, same } = cur;
      this.box(this.hiCur, i, j, j);
      attr(this.curU, u(start, i)); op(this.curU, 1);
      const hasSame = !zero && j <= start;
      if (hasSame) { attr(this.prvU, u(start - j, start)); op(this.prvU, seg(lt, .25, .4)); } else op(this.prvU, 0);
      if (zero) { op(this.hiShort, 0); op(this.hiSame, 0); }
      else {
        this.box(this.hiShort, start, start === 0 ? 0 : 1, start === 0 ? 0 : short); op(this.hiShort, (start === 0 || short >= 1 ? 1 : 0) * seg(lt, .05, .2));
        if (hasSame) { this.box(this.hiSame, start, j, j); op(this.hiSame, seg(lt, .25, .4)); } else op(this.hiSame, 0);
      }
      const chunk = num.slice(start, i), prev = hasSame ? num.slice(start - j, start) : '';
      const L = [`dp[${i}][${j}] · chunk "${chunk}"`];
      if (zero) L.push('starts with 0', 'not allowed', '', `= 0`);
      else {
        L.push(start === 0 ? 'first chunk: 1 way' : short >= 1 ? `shorter: pre[${start}][${short}] = ${cur.shortSum}` : 'shorter: none fit');
        L.push(hasSame ? `same len: "${prev}" ≤ "${chunk}"? ${same ? 'yes' : 'no'}` : 'same len: no room');
        L.push(hasSame && same ? `  + dp[${start}][${j}] = ${this.sol.dp[start][j]}` : '');
        L.push(`= ${cur.val}`);
      }
      this.lines.forEach((e, q) => { e.textContent = L[q] || ''; op(e, q ? seg(lt, .05 + q * .12, .2 + q * .12) : 1); });
      this.lines[4].style.fill = 'var(--ink)'; this.lines[4].style.fontWeight = 700;
      this.lines[2].style.fill = hasSame ? 'var(--ochre-t)' : ''; this.lines[1].style.fill = !zero && (start === 0 || short >= 1) ? 'var(--green-t)' : '';
      this.note.textContent = zero ? 'no leading zeros allowed' : '';
    } else {
      [this.hiCur, this.hiShort, this.hiSame, this.curU, this.prvU].forEach(e => op(e, 0));
      this.lines.forEach(e => (e.textContent = ''));
      this.note.textContent = '';
      if (k >= steps.length) {
        this.lines[0].textContent = 'answer = sum of row ' + n;
        this.lines[1].textContent = this.sol.dp[n].slice(1).join(' + ') + ' = ' + answer;
        op(this.lines[1], 1); this.lines[1].style.fill = 'var(--green-t)';
      }
    }
    const end = seg(t, .6 + steps.length * 1.25 + .2, .6 + steps.length * 1.25 + .8);
    op(this.rowN, end);
    this.answer.textContent = `"${num}" can be split ${answer} way${answer === 1 ? '' : 's'}`;
    op(this.answer, end);
  }
}

// ── fig 4 · prefix sums turn a loop into a lookup ──────────────────────────
class LcPrefix extends Figure {
  constructor() { super(); this.duration = 13; this.poster = 13; }
  build() {
    const svg = this.svgRoot(600, 300, 'A dp row and its running prefix sum; a query collapses from summing four cells to reading one');
    const sol = solve('111111111111'), start = 6, J = 5;
    this.row = sol.dp[start].slice(1, start + 1); this.pre = sol.pre[start].slice(1, start + 1); this.J = J; this.start = start;
    const c = 60, x0 = 120, yA = 70, yB = 170;
    this.c = c; this.x0 = x0; this.yA = yA; this.yB = yB;
    S('text', { x: 20, y: yA + 34, class: 't', 'font-size': 15, text: `dp[${start}]` }, svg);
    S('text', { x: 20, y: yB + 34, class: 't', 'font-size': 15, text: `pre[${start}]` }, svg);
    for (let j = 1; j <= start; j++) S('text', { x: x0 + (j - 1) * c + c / 2, y: yA - 14, class: 't3', 'font-size': 13, 'text-anchor': 'middle', text: 'j=' + j }, svg);
    this.a = this.row.map((v, k) => {
      const g = S('g', {}, svg);
      S('rect', { x: x0 + k * c + 3, y: yA, width: c - 6, height: 50, rx: 7, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
      S('text', { x: x0 + k * c + c / 2, y: yA + 32, class: 't', 'font-size': 20, 'text-anchor': 'middle', text: v }, g);
      return g;
    });
    this.b = this.pre.map((v, k) => {
      const g = S('g', {}, svg);
      const r = S('rect', { x: x0 + k * c + 3, y: yB, width: c - 6, height: 50, rx: 7, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
      S('text', { x: x0 + k * c + c / 2, y: yB + 32, class: 't', 'font-size': 20, 'text-anchor': 'middle', text: v }, g);
      return { g, r };
    });
    this.plus = S('text', { y: yB - 22, class: 't', 'font-size': 16, 'text-anchor': 'middle', style: 'fill:var(--green-t)' }, svg);
    this.arrow = S('path', { class: 'f-none s-green', 'stroke-width': 1.5 }, svg);
    // the query
    this.brace = S('path', { d: `M${x0 + 4} ${yA - 30} V${yA - 36} H${x0 + (J - 1) * c - 4} V${yA - 30}`, class: 'f-none s-ochre', 'stroke-width': 2 }, svg);
    this.q1 = S('text', { x: x0 + (J - 1) * c / 2, y: yA - 44, class: 't', 'font-size': 14, 'text-anchor': 'middle', text: `dp[${start + J}][${J}] needs these ${J - 1}`, style: 'fill:var(--ochre-t)' }, svg);
    this.hit = S('rect', { x: x0 + (J - 2) * c, y: yB - 3, width: c, height: 56, rx: 9, class: 'f-none s-green', 'stroke-width': 2.6 }, svg);
    this.q2 = S('text', { x: 300, y: yB + 108, class: 't', 'font-size': 16, 'text-anchor': 'middle' }, svg);
    this.hand = S('text', { x: x0 + (J - 2) * c + c / 2, y: yB + 76, class: 'hand', 'font-size': 16, 'text-anchor': 'middle', text: 'one lookup' }, svg);
  }
  label(t) { return t < 6 ? 'running sum' : t < 9.5 ? 'the old way' : 'the new way'; }
  render(t) {
    const { c, x0, yA, yB, J } = this;
    this.a.forEach((g, k) => op(g, seg(t, .1 + k * .1, .4 + k * .1)));
    const fill = k => .8 + k * .75;
    let lit = -1;
    this.b.forEach((o, k) => { const a = seg(t, fill(k), fill(k) + .4); op(o.g, a); if (t >= fill(k) && t < fill(k) + .75) lit = k; });
    if (lit >= 0) {
      const x = x0 + lit * c + c / 2;
      this.plus.textContent = lit ? `${this.pre[lit - 1]} + ${this.row[lit]}` : `${this.row[0]}`;
      attr(this.plus, { x });
      attr(this.arrow, { d: `M${x} ${yA + 54} V${yB - 34} M${x - 4} ${yB - 40} L${x} ${yB - 34} L${x + 4} ${yB - 40}` });
      op(this.plus, 1); op(this.arrow, 1);
    } else { op(this.plus, 0); op(this.arrow, 0); }
    op(this.brace, seg(t, 6, 6.5)); op(this.q1, seg(t, 6.2, 6.7));
    const sumNaive = this.row.slice(0, J - 1).join(' + ');
    const naive = seg(t, 6.6, 7.2), smart = seg(t, 9.6, 10.2);
    this.q2.textContent = smart > 0 ? `pre[${this.start}][${J - 1}] = ${this.pre[J - 2]}   ·   1 lookup` : `${sumNaive} = ${this.pre[J - 2]}   ·   ${J - 2} additions`;
    op(this.q2, smart > 0 ? smart : naive);
    this.q2.style.fill = smart > 0 ? 'var(--green-t)' : 'var(--ochre-t)';
    op(this.hit, smart); op(this.hand, seg(t, 10.4, 11.2));
    this.b.forEach((o, k) => o.r.setAttribute('class', smart > 0 && k === J - 2 ? 'f-bg s-green' : 'f-bg s-rule'));
  }
}

// ── fig 5 · the LCP table and the O(1) comparison ──────────────────────────
class LcLcp extends Figure {
  constructor() { super(); this.duration = 15; this.poster = 15; }
  build() {
    this.idleText = 'idle';
    const num = this.num = '3123124', n = num.length, sol = solve(num);
    this.lcp = sol.lcp;
    const nar = this.nar = this.clientWidth > 0 && this.clientWidth < 560;
    const c = nar ? 38 : 32, gx = nar ? 52 : 50, gy = 62;
    const svg = this.svgRoot(nar ? 360 : 600, nar ? 640 : 330, 'The LCP table filled from the bottom-right corner, then used to compare two substrings in one step');
    this.c = c; this.gx = gx; this.gy = gy;
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: nar ? 'LCP[I][J]: COMMON PREFIX LENGTH' : 'LCP[I][J]  =  COMMON PREFIX OF NUM[I:] AND NUM[J:]' }, svg);
    [...num].forEach((d, k) => {
      S('text', { x: gx + k * c + c / 2, y: gy - 10, class: 't2', 'font-size': 15, 'text-anchor': 'middle', text: d }, svg);
      S('text', { x: gx - 12, y: gy + k * c + c / 2 + 5, class: 't2', 'font-size': 15, 'text-anchor': 'middle', text: d }, svg);
    });
    this.order = [];
    for (let i = n - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) this.order.push([i, j]);
    this.cells = {};
    this.order.forEach(([i, j]) => {
      const v = this.lcp[i][j], g = S('g', { class: 'click' }, svg);
      const r = S('rect', { x: gx + j * c + 1, y: gy + i * c + 1, width: c - 2, height: c - 2, rx: 4, class: 'f-ink' }, g);
      r.style.fillOpacity = v ? (.1 + .085 * Math.min(v, 4)).toFixed(3) : '.04';
      S('text', { x: gx + j * c + c / 2, y: gy + i * c + c / 2 + 5, class: v ? 't' : 't3', 'font-size': 14, 'text-anchor': 'middle', text: v, 'font-weight': v ? 700 : 400 }, g);
      g.onclick = () => { this.held = true; this.pause(); this.seek(this.duration); this.pick = [i, j]; this.render(this.duration); };
      this.cells[i + ',' + j] = g;
    });
    this.diag = S('path', { class: 'f-none s-green', 'stroke-width': 1.6 }, svg);
    this.cur = S('rect', { width: c, height: c, rx: 5, class: 'f-none s-ink', 'stroke-width': 2 }, svg);
    // comparison panel
    const px = nar ? 20 : 320, py = nar ? gy + n * c + 40 : gy;
    this.px = px;
    S('text', { x: px, y: py - 10, class: 'sl', 'font-size': 11, text: 'COMPARE TWO CHUNKS OF LENGTH L' }, svg);
    this.rowA = S('text', { x: px, y: py + 40, class: 't', 'font-size': 22, style: 'white-space:pre' }, svg);
    this.rowB = S('text', { x: px, y: py + 74, class: 't', 'font-size': 22, style: 'white-space:pre' }, svg);
    this.same = S('rect', { y: py + 18, height: 64, rx: 6, class: 'f-green' }, svg); this.same.style.fillOpacity = .16;
    this.diff = S('rect', { y: py + 18, height: 64, rx: 6, class: 'f-ochre' }, svg); this.diff.style.fillOpacity = .25;
    this.svg.insertBefore(this.same, this.rowA); this.svg.insertBefore(this.diff, this.rowA);
    this.info = [0, 1, 2].map(k => S('text', { x: px, y: py + 122 + k * 26, class: k === 2 ? 't' : 't2', 'font-size': 15 }, svg));
    this.hint = S('text', { x: px, y: py + 230, class: 'hand', 'font-size': 16, text: 'click any cell to try it' }, svg);
    this.queries = [[1, 4, 3], [0, 3, 3], [5, 2, 2]];
  }
  label(t) { return t < 6.2 ? 'fill' : 'compare'; }
  render(t) {
    const { c, gx, gy, num } = this, n = num.length, step = 6 / this.order.length;
    let last = null;
    this.order.forEach(([i, j], k) => { const on = t >= .2 + k * step; op(this.cells[i + ',' + j], on ? 1 : 0); if (on) last = [i, j]; });
    if (t < 6.4 && last) {
      const [i, j] = last;
      attr(this.cur, { x: gx + j * c, y: gy + i * c }); op(this.cur, 1);
      if (num[i] === num[j] && i < n - 1 && j < n - 1) {
        attr(this.diag, { d: `M${gx + (j + 1) * c + c / 2} ${gy + (i + 1) * c + c / 2} L${gx + j * c + c / 2 + 4} ${gy + i * c + c / 2 + 4}` }); op(this.diag, 1);
      } else op(this.diag, 0);
    } else { op(this.cur, 0); op(this.diag, 0); }
    // the comparisons
    let q = null;
    if (this.pick && t >= this.duration) {
      const [i, j] = this.pick; q = [i, j, Math.max(1, Math.min(n - i, n - j))];
    } else if (t >= 6.4) q = this.queries[Math.min(2, Math.floor((t - 6.4) / 2.8))];
    const show = !q ? 0 : this.pick ? 1 : seg(t, 6.4, 6.9);
    [this.rowA, this.rowB, this.same, this.diff, ...this.info].forEach(e => op(e, q ? show : 0));
    op(this.hint, seg(t, 14, 14.8));
    if (!q) return;
    const [a, b, L] = q, k = this.lcp[a][b], cw = 22 * CW;
    // align both strings at the same column
    this.rowA.textContent = `num[${a}:]`.padEnd(9) + num.slice(a, a + L);
    this.rowB.textContent = `num[${b}:]`.padEnd(9) + num.slice(b, b + L);
    const sx = this.px + 9 * cw;
    const m = Math.min(k, L);
    attr(this.same, { x: sx - 2, width: Math.max(0, m * cw + 4) }); op(this.same, m ? show : 0);
    if (k < L) { attr(this.diff, { x: sx + k * cw - 2, width: cw + 4 }); op(this.diff, show); } else op(this.diff, 0);
    this.info[0].textContent = `L = ${L}, lcp[${a}][${b}] = ${k}`;
    this.info[1].textContent = k >= L ? `agree on all ${L}: equal` : `first difference at +${k}: ${num[a + k]} vs ${num[b + k]}`;
    const ge = k >= L || num[a + k] >= num[b + k];
    this.info[2].textContent = `num[${a}:${a + L}] ${k >= L ? '=' : ge ? '>' : '<'} num[${b}:${b + L}] in one step`;
    this.info[2].style.fill = 'var(--green-t)';
    // highlight the cell being read
    attr(this.cur, { x: gx + b * c, y: gy + a * c }); op(this.cur, 1);
  }
}

define({ 'lc-cuts': LcCuts, 'lc-explode': LcExplode, 'lc-table': LcTable, 'lc-prefix': LcPrefix, 'lc-lcp': LcLcp });
