import { NS, REDUCED, STILL, clamp, lerp, ease, inout, seg, dot, softmax, pct, fmt, rng, CW, S, H, attr, op, paint, critter, roughLoop, handArrow, drawOn, keyframes, Figure, define } from './core.js';

// ── fig 1 · next token ─────────────────────────────────────────────────────
class TfNext extends Figure {
  constructor() { super(); this.duration = 21; this.loop = true; this.poster = 5.5; }
  build() {
    this.P = [
      ['the cat sat on the', [['mat', .41], ['floor', .17], ['sofa', .11], ['bed', .07], ['roof', .04]]],
      ['to be or not to', [['be', .93], ['do', .02], ['go', .01], ['see', .01], ['say', .01]]],
      ['the capital of france is', [['paris', .88], ['a', .04], ['the', .03], ['lyon', .01], ['known', .01]]],
    ];
    const svg = this.svgRoot(600, 300, 'A prompt is typed and the model ranks the next token');
    this.g = S('g', {}, svg);
    this.prompt = S('text', { x: 24, y: 70, class: 't', 'font-size': 26, style: 'white-space:pre' }, this.g);
    this.blank = S('rect', { y: 78, height: 2, class: 'f-ink3' }, this.g);
    this.cursor = S('rect', { y: 49, width: 13, height: 27, class: 'f-green' }, this.g);
    this.answer = S('text', { class: 't', style: 'fill:var(--green-t)' }, this.g);
    S('text', { x: 24, y: 128, class: 'sl', 'font-size': 11, text: 'P(NEXT TOKEN)' }, this.g);
    this.rows = [0, 1, 2, 3, 4].map(i => {
      const y = 146 + i * 30, g = S('g', {}, this.g);
      return {
        g, y,
        word: S('text', { x: 24, y: y + 15, class: 't', 'font-size': 17 }, g),
        track: S('rect', { x: 130, y: y + 4, width: 380, height: 13, rx: 2, class: 'f-rule' }, g),
        bar: S('rect', { x: 130, y: y + 4, height: 13, rx: 2, class: i ? 'f-ink3' : 'f-green' }, g),
        pct: S('text', { x: 576, y: y + 15, class: 't2', 'font-size': 15, 'text-anchor': 'end' }, g),
      };
    });
  }
  label(t) { return `prompt ${Math.min(3, Math.floor(t / 7) + 1)}/3`; }
  render(t) {
    const k = Math.min(2, Math.floor(t / 7)), lt = t - k * 7, [text, cands] = this.P[k];
    const fs = 26, cw = fs * CW, x0 = 24, bx = x0 + (text.length + 1) * cw;
    const n = Math.round(seg(lt, .3, 1.8) * text.length), typed = lt >= 1.8;
    this.prompt.textContent = text.slice(0, n);
    const fly = inout(seg(lt, 4.0, 4.9)), landed = lt >= 4.9;
    const win = cands[0][0];
    // blank + cursor
    attr(this.blank, { x: bx, width: Math.max(4, win.length) * cw });
    op(this.blank, typed ? 1 - seg(lt, 4.7, 5.0) : 0);
    const blink = Math.floor(lt * 2.2) % 2 === 0;
    let cx = typed ? bx : x0 + n * cw + 2;
    if (landed) cx = bx + win.length * cw + 3;
    attr(this.cursor, { x: cx });
    op(this.cursor, (!typed || landed || lt > 3.6) ? 1 : (blink ? 1 : 0));
    // bars
    this.rows.forEach((r, i) => {
      const [w, p] = cands[i];
      const a = seg(lt, 2.0 + i * .1, 2.4 + i * .1), grow = ease(seg(lt, 2.2 + i * .12, 3.3 + i * .12));
      op(r.g, a);
      r.word.textContent = w;
      attr(r.bar, { width: Math.max(0, 380 * p * grow) });
      r.pct.textContent = pct(p * grow);
    });
    // winner flies into the blank
    attr(this.answer, { x: lerp(24, bx, fly), y: lerp(this.rows[0].y + 15, 70, fly), 'font-size': lerp(17, 26, fly) });
    this.answer.textContent = win;
    op(this.answer, lt >= 4.0 ? 1 : 0);
    op(this.g, 1 - seg(lt, 6.5, 7));
  }
}

// ── fig 2 · tokenizer ──────────────────────────────────────────────────────
class TfTokens extends Figure {
  constructor() { super(); this.duration = 10.5; }
  build() {
    const toks = [['Transform', 41762], ['ers', 364], [' don', 836], ["'t", 470], [' read', 1100], [' words', 2456], ['.', 13]];
    const svg = this.svgRoot(600, 290, 'A sentence splits into tokens, ids and critters');
    const fs = 20, cw = fs * CW, pad = 9, gap = 10;
    const chars = toks.reduce((s, t) => s + t[0].length, 0);
    const wB = toks.map(t => t[0].length * cw + pad * 2);
    let xB = (600 - (wB.reduce((a, b) => a + b, 0) + gap * (toks.length - 1))) / 2;
    let xA = (600 - chars * cw) / 2;
    this.T = toks.map(([s, id], i) => {
      const o = { s, id, xA, xB, w: wB[i] };
      xA += s.length * cw; xB += wB[i] + gap;
      o.c = o.xB + o.w / 2;
      o.pill = S('rect', { x: o.xB, y: 52, width: o.w, height: 36, rx: 9, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
      o.text = S('text', { y: 77, class: 't', 'font-size': fs, style: 'white-space:pre' }, svg);
      o.sp = S('tspan', { class: 't3' }, o.text);
      o.rest = S('tspan', { text: s.replace(/^ /, '') }, o.text);
      o.line = S('line', { x1: o.c, x2: o.c, y1: 92, y2: 118, class: 's-rule', 'stroke-width': 1 }, svg);
      o.idt = S('text', { x: o.c, y: 138, class: 't2', 'font-size': 15, 'text-anchor': 'middle', text: id }, svg);
      o.cg = S('g', {}, svg); critter(o.cg, 3, i === 5 ? 'f-green' : 'f-ink3');
      return o;
    });
    this.arrow = S('path', { d: handArrow(272, 258, this.T[5].c - 22, 210, -.25), class: 'f-none s-ink2', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg);
    this.note = S('text', { x: 66, y: 268, class: 'hand', 'font-size': 17, text: 'one token = one critter' }, svg);
  }
  label(t) { return t < 1.2 ? 'text' : t < 3.4 ? 'split' : t < 5.6 ? 'ids' : 'tokens'; }
  render(t) {
    const a = inout(seg(t, 1.2, 3.0));
    this.T.forEach((o, i) => {
      const lead = /^ /.test(o.s);
      o.sp.textContent = lead ? (a > .5 ? '·' : ' ') : '';
      attr(o.text, { x: lerp(o.xA, o.xB + 9, a) });
      op(o.pill, a);
      const b = ease(seg(t, 3.4 + i * .15, 3.9 + i * .15));
      op(o.idt, b); attr(o.idt, { y: 138 - (1 - b) * 8 });
      attr(o.line, { y2: lerp(92, 118, b) }); op(o.line, b);
      const c = ease(seg(t, 5.6 + i * .14, 6.1 + i * .14));
      attr(o.cg, { transform: `translate(${o.c - 16.5} ${166 + (1 - c) * 12})` }); op(o.cg, c);
    });
    drawOn(this.arrow, seg(t, 7.6, 8.6)); op(this.arrow, t > 7.6 ? 1 : 0);
    op(this.note, seg(t, 8.3, 9.1));
  }
}

// ── fig 3 · embeddings ─────────────────────────────────────────────────────
class TfEmbed extends Figure {
  constructor() { super(); this.duration = 13; }
  build() {
    const svg = this.svgRoot(600, 370, 'An embedding table lookup and a 2D map of word meanings');
    const r = rng(7), words = ['the', 'cat', 'sat', 'on', 'mat', 'dog', 'king'];
    const vec = () => Array.from({ length: 10 }, () => (r() * 2 - 1) * (r() > .3 ? 1 : .3));
    S('text', { x: 20, y: 30, class: 'sl', 'font-size': 11, text: 'EMBEDDING TABLE' }, svg);
    S('text', { x: 20, y: 46, class: 't3', 'font-size': 12, text: '50,257 rows × 768 numbers' }, svg);
    this.rows = words.map((w, i) => {
      const y = 62 + i * 26, g = S('g', {}, svg), v = vec();
      S('text', { x: 20, y: y + 15, class: 't', 'font-size': 15, text: w }, g);
      v.forEach((x, j) => paint(S('rect', { x: 66 + j * 16, y: y + 3, width: 14, height: 14, rx: 2 }, g), x));
      return { g, v, y };
    });
    S('text', { x: 20, y: 62 + 7 * 26 + 12, class: 't3', 'font-size': 15, text: '⋮' }, svg);
    const cat = this.rows[1];
    this.hl = S('rect', { x: 14, y: cat.y - 1, width: 220, height: 22, rx: 5, class: 'f-none s-green', 'stroke-width': 1.5 }, svg);
    this.vecG = S('g', {}, svg);
    S('text', { x: 0, y: 15, class: 't', 'font-size': 15, text: 'cat', style: 'fill:var(--green-t)' }, this.vecG);
    cat.v.forEach((x, j) => paint(S('rect', { x: 46 + j * 16, y: 3, width: 14, height: 14, rx: 2 }, this.vecG), x));
    this.vecNote = S('text', { x: 20, y: 342, class: 't3', 'font-size': 12, text: '768 numbers, 10 shown' }, svg);

    // map
    const mx = 262, my = 30, mw = 318, mh = 320;
    const pid = 'grid' + Math.random().toString(36).slice(2, 7);
    const pat = S('pattern', { id: pid, width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, S('defs', {}, svg));
    S('circle', { cx: 8, cy: 8, r: .9, class: 'f-rule2' }, pat);
    this.map = S('g', {}, svg);
    S('rect', { x: mx, y: my, width: mw, height: mh, rx: 10, fill: `url(#${pid})`, class: 's-rule', 'stroke-width': 1 }, this.map);
    S('text', { x: mx + 12, y: my + 20, class: 'sl', 'font-size': 11, text: 'MEANING, IN 2D' }, this.map);
    const P = (x, y) => [mx + x * mw, my + y * mh];
    const pts = [
      ['cat', .17, .25], ['dog', .30, .19], ['kitten', .12, .36], ['puppy', .28, .33],
      ['man', .62, .60], ['woman', .86, .60], ['king', .62, .22], ['queen', .86, .22],
      ['sat', .18, .74], ['ran', .32, .80], ['slept', .14, .86],
      ['two', .64, .84], ['three', .74, .90], ['seven', .86, .82],
    ];
    this.pts = pts.map(([w, x, y], i) => {
      const [X, Y] = P(x, y), g = S('g', {}, this.map);
      S('circle', { cx: X, cy: Y, r: w === 'cat' ? 5 : 3.5, class: w === 'cat' ? 'f-green' : 'f-ink' }, g);
      S('text', { x: X + 8, y: Y + 4, class: w === 'cat' ? 't' : 't2', 'font-size': 13, text: w }, g);
      return { g, X, Y, w, i };
    });
    const ring = (c, rx, ry, seed, label, lx, ly) => ({
      p: S('path', { d: roughLoop(...P(...c), rx, ry, seed), class: 'f-none s-ink3', 'stroke-width': 1.3 }, this.map),
      l: S('text', { x: lx, y: ly, class: 'hand', 'font-size': 15, text: label }, this.map),
    });
    this.rings = [
      ring([.22, .28], 60, 42, 3, 'animals', mx + 14, my + 52),
      ring([.22, .81], 52, 30, 9, 'things you do', mx + 12, my + 222),
      ring([.75, .86], 54, 24, 5, 'numbers', mx + 190, my + 240),
    ];
    const [mX, mY] = P(.62, .60), [wX, wY] = P(.86, .60), [kX, kY] = P(.62, .22), [qX, qY] = P(.86, .22);
    this.arrows = [
      S('path', { d: `M${mX + 4} ${mY - 8} L${wX - 6} ${wY - 8} M${wX - 12} ${wY - 12} L${wX - 6} ${wY - 8} L${wX - 12} ${wY - 4}`, class: 'f-none s-ink2', 'stroke-width': 1.5 }, this.map),
      S('path', { d: `M${kX + 4} ${kY - 8} L${qX - 6} ${qY - 8} M${qX - 12} ${qY - 12} L${qX - 6} ${qY - 8} L${qX - 12} ${qY - 4}`, class: 'f-none s-ink2', 'stroke-width': 1.5 }, this.map),
    ];
    this.same = S('text', { x: (mX + wX) / 2 + 6, y: (kY + mY) / 2 + 4, class: 't3', 'font-size': 12, 'text-anchor': 'middle', text: 'same step' }, this.map);
    this.link = S('path', { d: '', class: 'f-none s-green', 'stroke-width': 1.2, 'stroke-dasharray': '3 4' }, svg);
    this.catPt = P(.17, .25);
  }
  label(t) { return t < 1.6 ? 'table' : t < 4.2 ? 'lookup' : t < 9.4 ? 'map' : 'directions'; }
  render(t) {
    this.rows.forEach((r, i) => {
      const a = seg(t, .2 + i * .1, .6 + i * .1), dim = 1 - .6 * seg(t, 1.6, 2.2) * (i === 1 ? 0 : 1);
      op(r.g, a * dim);
    });
    op(this.hl, seg(t, 1.6, 2.2));
    const v = inout(seg(t, 2.6, 3.8));
    attr(this.vecG, { transform: `translate(20 ${lerp(this.rows[1].y, 300, v)})` }); op(this.vecG, t > 2.6 ? 1 : 0);
    op(this.vecNote, seg(t, 3.6, 4.2));
    op(this.map, seg(t, 3.8, 4.4));
    this.pts.forEach((p, i) => op(p.g, ease(seg(t, 4.4 + (i === 0 ? 0 : .4 + i * .2), 4.9 + (i === 0 ? 0 : .4 + i * .2)))));
    // dashed link: vector → cat dot
    const L = seg(t, 4.4, 5.2);
    const [cx, cy] = this.catPt, sx = 232, sy = 310;
    const ex = lerp(sx, cx - 6, L), ey = lerp(sy, cy + 6, L);
    attr(this.link, { d: `M${sx} ${sy} Q${(sx + cx) / 2 + 20} ${sy} ${ex} ${ey}` }); op(this.link, t > 4.4 ? .9 : 0);
    this.rings.forEach((g, i) => { const a = seg(t, 7.6 + i * .5, 8.4 + i * .5); drawOn(g.p, a); op(g.p, a > 0 ? 1 : 0); op(g.l, seg(t, 8.1 + i * .5, 8.6 + i * .5)); });
    this.arrows.forEach((a, i) => { const p = seg(t, 9.6 + i * .7, 10.4 + i * .7); drawOn(a, p); op(a, p > 0 ? 1 : 0); });
    op(this.same, seg(t, 11.2, 11.8));
  }
}

// ── fig 4 · position ───────────────────────────────────────────────────────
class TfPosition extends Figure {
  constructor() { super(); this.duration = 16; this.loop = true; this.poster = 4.2; }
  build() {
    const svg = this.svgRoot(600, 330, 'Sine waves of decreasing frequency, sampled at a position');
    this.K = 8; this.N = 64; this.x0 = 64; this.x1 = 440;
    this.w = Array.from({ length: this.K }, (_, k) => 1 / Math.pow(100, k / this.K));
    const X = p => this.x0 + p / (this.N - 1) * (this.x1 - this.x0);
    this.X = X;
    S('text', { x: 24, y: 24, class: 'sl', 'font-size': 11, text: 'DIMENSION' }, svg);
    S('text', { x: 486, y: 24, class: 'sl', 'font-size': 11, text: 'VECTOR' }, svg);
    this.rowY = k => 52 + k * 31;
    for (let k = 0; k < this.K; k++) {
      const y = this.rowY(k);
      S('text', { x: 24, y: y + 4, class: 't3', 'font-size': 13, text: 'd' + k }, svg);
      S('line', { x1: this.x0, x2: this.x1, y1: y, y2: y, class: 's-rule', 'stroke-width': 1 }, svg);
      let d = '';
      for (let i = 0; i <= 240; i++) { const p = i / 240 * (this.N - 1); d += (i ? 'L' : 'M') + X(p).toFixed(1) + ' ' + (y - Math.sin(p * this.w[k]) * 11).toFixed(1); }
      S('path', { d, class: 'f-none s-ink2', 'stroke-width': 1.3 }, svg);
    }
    this.ticks = [0, 8, 16, 24, 32, 40, 48, 56, 63].map(p => S('text', { x: X(p), y: 312, class: 't3', 'font-size': 12, 'text-anchor': 'middle', text: p }, svg));
    this.mark = S('line', { y1: 34, y2: 296, class: 's-green', 'stroke-width': 1.5 }, svg);
    this.posT = S('text', { y: 300, class: 't', 'font-size': 13, 'text-anchor': 'middle', style: 'fill:var(--green-t)' }, svg);
    this.posBg = S('rect', { y: 299, width: 54, height: 18, rx: 9, class: 'f-panel' }, svg);
    this.posT.parentNode.appendChild(this.posT);
    this.dots = []; this.cells = []; this.vals = [];
    for (let k = 0; k < this.K; k++) {
      const y = this.rowY(k);
      this.dots.push(S('circle', { r: 3.5, class: 'f-green' }, svg));
      S('rect', { x: 486, y: y - 11, width: 26, height: 22, rx: 3, class: 'f-bg s-rule', 'stroke-width': 1 }, svg);
      this.cells.push(S('rect', { x: 486, y: y - 11, width: 26, height: 22, rx: 3 }, svg));
      this.vals.push(S('text', { x: 576, y: y + 5, class: 't2', 'font-size': 14, 'text-anchor': 'end' }, svg));
    }
  }
  pos(t) { return Math.round(t < 8 ? 63 * inout(seg(t, .6, 7.4)) : 63 * (1 - inout(seg(t, 8.6, 15.4)))); }
  label(t) { return 'pos ' + this.pos(t); }
  render(t) {
    const p = this.pos(t), x = this.X(p);
    attr(this.mark, { x1: x, x2: x });
    this.ticks.forEach(e => op(e, Math.abs(+e.getAttribute('x') - x) < 40 ? 0 : 1));
    attr(this.posBg, { x: x - 27 }); attr(this.posT, { x, y: 313 }); this.posT.textContent = 'pos ' + p;
    for (let k = 0; k < this.K; k++) {
      const v = Math.sin(p * this.w[k]), y = this.rowY(k);
      attr(this.dots[k], { cx: x, cy: y - v * 11 });
      paint(this.cells[k], v);
      this.vals[k].textContent = (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
    }
  }
}

// ── fig 5 · attention (interactive) ────────────────────────────────────────
class TfAttention extends Figure {
  build() {
    this.end = 'tired'; this.q = 7; this.idleText = 'interactive';
    this.cur = null;
    const bar = H('div', { class: 'fc' });
    H('span', { text: '…because it was too', class: 'mono' }, bar);
    this.btns = ['tired', 'wide'].map(w => {
      const b = H('button', { class: 'pill', type: 'button', text: w, 'aria-pressed': w === this.end }, bar);
      b.onclick = () => { this.end = w; this.btns.forEach(x => x.setAttribute('aria-pressed', x === b)); this.retarget(); };
      return b;
    });
    H('span', { class: 'grow' }, bar);
    H('span', { text: 'click a word', class: 't3' }, bar);
    this.layout();
    this.appendChild(bar);
    new ResizeObserver(() => { const m = this.clientWidth < 600 ? 'col' : 'row'; if (m !== this.mode) { this.layout(); this.paint(this.cur || this.target()); } }).observe(this);
  }
  get words() { return ['the', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', this.end, '.']; }
  target() {
    const n = 12, q = this.q, s = Array(n).fill(-.6);
    s[q] += 1.0; if (q > 0) s[q - 1] += .4; if (q < n - 1) s[q + 1] += .3;
    const P = {
      0: { 1: 1.2 }, 1: { 0: 1.0, 3: .8 }, 2: { 1: 1.4, 3: 1.0 }, 3: { 1: 1.6, 5: 1.8, 2: .8 }, 4: { 5: 1.2 },
      5: { 3: 1.8, 4: 1.2 }, 6: { 3: .8, 10: 1.0 }, 8: { 7: 1.8, 10: 1.4 }, 9: { 10: 2.2 }, 11: { 10: 1.2, 3: .6 },
    };
    let bonus = P[q] || {};
    if (q === 7) bonus = this.end === 'tired' ? { 1: 3.6, 5: 1.1, 10: 1.6, 8: .4 } : { 5: 3.6, 1: 1.1, 10: 1.6, 8: .4 };
    if (q === 10) bonus = this.end === 'tired' ? { 1: 2.2, 7: 1.6, 9: 1.2 } : { 5: 2.2, 7: 1.6, 9: 1.2 };
    for (const k in bonus) s[k] += bonus[k];
    return softmax(s);
  }
  layout() {
    this.svg?.remove();
    this.mode = this.clientWidth && this.clientWidth < 600 ? 'col' : 'row';
    const W = this.words, col = this.mode === 'col';
    const svg = this.svg = S('svg', { viewBox: col ? '0 0 360 540' : '0 0 680 300', role: 'img', 'aria-label': 'Attention weights from one word to the others' });
    this.insertBefore(svg, this.querySelector('.fc'));
    this.arcG = S('g', {}, svg);
    this.items = W.map((w, i) => {
      const g = S('g', { class: 'click', tabindex: 0, role: 'button', 'aria-label': 'Attend from ' + w }, svg);
      g.onclick = () => this.select(i);
      g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.select(i); } };
      return { g, w };
    });
    if (col) {
      // two columns: queries on the left, keys on the right
      this.items.forEach((it, i) => {
        const y = 36 + i * 40;
        it.qx = 112; it.kx = 236; it.y = y;
        it.hit = S('rect', { x: 0, y: y - 20, width: 130, height: 36, class: 'f-none', 'pointer-events': 'all' }, it.g);
        it.qt = S('text', { x: 112, y, class: 't', 'font-size': 18, 'text-anchor': 'end', text: it.w }, it.g);
        it.kt = S('text', { x: 236, y, class: 't', 'font-size': 18, text: it.w }, svg);
        it.pc = S('text', { x: 352, y, class: 't2', 'font-size': 14, 'text-anchor': 'end' }, svg);
      });
      this.crit = S('g', {}, svg); critter(this.crit, 2, 'f-green');
      this.note = S('text', { x: 180, y: 528, class: 'hand', 'font-size': 17, 'text-anchor': 'middle' }, svg);
    } else {
      const fs = 16, cw = fs * CW, gap = 14;
      const total = W.reduce((s, w) => s + w.length * cw, 0) + gap * (W.length - 1) + (6 - this.end.length) * cw;
      let x = (680 - total) / 2;
      this.items.forEach(it => {
        const w = it.w.length * cw; it.x = x + w / 2; it.y = 214;
        it.hit = S('rect', { x: x - 6, y: 190, width: w + 12, height: 34, class: 'f-none', 'pointer-events': 'all' }, it.g);
        it.qt = it.kt = S('text', { x: it.x, y: 214, class: 't', 'font-size': fs, 'text-anchor': 'middle', text: it.w }, it.g);
        it.bar = S('rect', { x: it.x - 11, y: 230, width: 22, height: 2, rx: 1.5, class: 'f-ink3' }, svg);
        it.pc = S('text', { x: it.x, y: 252, class: 't2', 'font-size': 13, 'text-anchor': 'middle' }, svg);
        x += w + gap;
      });
      this.crit = S('g', {}, svg); critter(this.crit, 2, 'f-green');
      this.note = S('text', { x: 340, y: 34, class: 'hand', 'font-size': 18, 'text-anchor': 'middle' }, svg);
      this.noteArrow = S('path', { class: 'f-none s-ink2', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, svg);
    }
    this.arcs = this.items.map(() => S('path', { class: 'f-none s-ink', 'stroke-linecap': 'round' }, this.arcG));
  }
  onVisible(v) {
    if (!v || this.started) return;
    this.started = true;
    this.cur = Array(12).fill(1 / 12);
    this.paint(this.cur);
    if (STILL || REDUCED) this.paint(this.cur = this.target());
    else setTimeout(() => this.retarget(), 350);
  }
  select(i) { this.q = i; this.retarget(); }
  retarget() {
    const from = (this.cur || Array(12).fill(1 / 12)).slice(), to = this.target(), t0 = performance.now(), D = REDUCED ? 1 : 520;
    if (this.mode === 'row') this.items[10].qt.textContent = this.end;
    else { this.items[10].qt.textContent = this.end; this.items[10].kt.textContent = this.end; }
    cancelAnimationFrame(this.raf);
    this.setStatus('running');
    const step = now => {
      const k = inout((now - t0) / D);
      this.cur = from.map((f, i) => lerp(f, to[i], k));
      this.paint(this.cur);
      if (k < 1) this.raf = requestAnimationFrame(step); else this.setStatus('interactive', 'idle');
    };
    this.raf = requestAnimationFrame(step);
  }
  paint(w) {
    if (!w) return;
    const q = this.q, Q = this.items[q], col = this.mode === 'col';
    const top = w.map((x, i) => [x, i]).filter(a => a[1] !== q).sort((a, b) => b[0] - a[0])[0][1];
    this.items.forEach((it, i) => {
      const a = w[i], arc = this.arcs[i];
      attr(arc, { 'stroke-width': (.6 + 7 * a).toFixed(2), opacity: (.1 + .9 * Math.pow(a, .7)).toFixed(3) });
      if (col) {
        arc.setAttribute('d', `M${Q.qx + 8} ${Q.y - 6} C${Q.qx + 60} ${Q.y - 6} ${it.kx - 60} ${it.y - 6} ${it.kx - 8} ${it.y - 6}`);
        op(it.kt, .35 + .65 * Math.min(1, a * 3));
        it.qt.style.fill = i === q ? 'var(--green-t)' : '';
        it.qt.style.fontWeight = i === q ? 700 : 400;
      } else {
        const dx = it.x - Q.x, h = Math.min(128, 22 + Math.abs(dx) * .4);
        arc.setAttribute('d', i === q ? `M${Q.x - 7} 188 C${Q.x - 22} 150 ${Q.x + 22} 150 ${Q.x + 7} 188` : `M${Q.x} 182 C${Q.x} ${182 - h} ${it.x} ${182 - h} ${it.x} 192`);
        it.qt.style.fill = i === q ? 'var(--green-t)' : '';
        it.qt.style.fontWeight = i === q ? 700 : 400;
        op(it.qt, i === q ? 1 : .4 + .6 * Math.min(1, a * 3));
        attr(it.bar, { height: (2 + a * 44).toFixed(1), class: i === top ? 'f-ink' : 'f-ink3' });
        attr(it.pc, { y: 252 + a * 44 });
      }
      it.pc.textContent = (i === top || i === q || a > .1) ? pct(a) : '';
    });
    if (col) {
      attr(this.crit, { transform: `translate(${Q.qx - Q.w.length * 9 - 30} ${Q.y - 14})` });
    } else {
      attr(this.crit, { transform: `translate(${Q.x - 11} ${236 + 0})` });
      op(this.crit, 0);
    }
    // handwritten note when "it" is the query
    const show = q === 7;
    const T = this.items[top];
    this.note.textContent = show ? `it = the ${T.w}` : '';
    if (!col && this.noteArrow) {
      if (show) {
        const nx = 340 + (T.x < 340 ? -70 : 70);
        attr(this.noteArrow, { d: handArrow(nx, 44, T.x + (T.x < 340 ? 18 : -18), 70, T.x < 340 ? .25 : -.25) });
        attr(this.note, { x: 340 });
      }
      op(this.noteArrow, show ? 1 : 0);
    }
  }
  render() {}
}

// ── fig 6 · one query, slowly ──────────────────────────────────────────────
class TfQKV extends Figure {
  constructor() { super(); this.duration = 17; }
  build() {
    const svg = this.svgRoot(600, 440, 'Query, key and value vectors combined into attention output');
    this.toks = ['the', 'cat', 'sat'];
    const Qs = [[.3, .5, -.4, .2], [-.2, .8, .1, -.5], [1.8, -.4, 1.4, .2]];
    const Ks = [[.1, .3, -.2, 0], [1.0, -.1, .8, .3], [.4, .2, .3, -.1]];
    const Vs = [[.2, .1, -.3, 0], [.9, .6, .1, -.4], [-.2, .5, .6, .3]];
    this.scores = Ks.map(k => dot(Qs[2], k));
    this.w = softmax(this.scores.map(s => s / Math.sqrt(4)));
    this.z = [0, 1, 2, 3].map(j => Vs.reduce((s, v, i) => s + this.w[i] * v[j], 0));
    this.cx = [150, 310, 470];
    const cs = 22, cg = 3, rw = 4 * cs + 3 * cg;
    this.rw = rw;
    const row = (parent, vals, x, y) => { const g = S('g', { transform: `translate(${x} ${y})` }, parent); vals.forEach((v, j) => paint(S('rect', { x: j * (cs + cg), y: 0, width: cs, height: cs, rx: 3 }, g), v)); return g; };
    this.row = row;
    // labels
    [['q', 94], ['k', 124], ['v', 154]].forEach(([l, y]) => S('text', { x: 40, y: y + 16, class: 't', 'font-size': 17, 'font-weight': 700, text: l }, svg));
    this.cols = this.toks.map((w, i) => {
      const cx = this.cx[i], g = S('g', {}, svg);
      const cr = S('g', { transform: `translate(${cx - 16.5} 14)` }, g); critter(cr, 3, i === 2 ? 'f-green' : 'f-ink3');
      S('text', { x: cx, y: 62, class: 't', 'font-size': 17, 'text-anchor': 'middle', text: w, style: i === 2 ? 'fill:var(--green-t);font-weight:700' : '' }, g);
      const x = cx - rw / 2;
      return { g, q: row(svg, Qs[i].map(v => v / 1.8), x, 94), k: row(svg, Ks[i], x, 124), v: row(svg, Vs[i], x, 154) };
    });
    // ghost query
    this.ghost = row(svg, Qs[2].map(v => v / 1.8), 0, 0);
    this.ghost.querySelectorAll('rect').forEach(r => attr(r, { class: 's-green', 'stroke-width': 1.5 }));
    S('text', { x: 40, y: 222, class: 't2', 'font-size': 14, text: 'q·k' }, svg);
    S('text', { x: 40, y: 268, class: 't2', 'font-size': 14, text: 'weight' }, svg);
    this.sc = this.cx.map((cx, i) => S('text', { x: cx, y: 224, class: 't', 'font-size': 20, 'text-anchor': 'middle', text: fmt(this.scores[i]) }, svg));
    this.wt = this.cx.map((cx, i) => S('text', { x: cx, y: 268, class: 't', 'font-size': 20, 'text-anchor': 'middle', text: pct(this.w[i]), style: i === 1 ? 'fill:var(--green-t);font-weight:700' : '' }, svg));
    this.wb = this.cx.map((cx, i) => S('rect', { x: cx - 50, y: 278, height: 5, rx: 2.5, class: i === 1 ? 'f-green' : 'f-ink3' }, svg));
    this.sum = S('text', { x: 584, y: 268, class: 't3', 'font-size': 13, 'text-anchor': 'end', text: 'Σ = 100%' }, svg);
    this.scale = S('text', { x: 40, y: 246, class: 't3', 'font-size': 12, text: '÷ √4, softmax ↓' }, svg);
    // scaled values travelling down
    this.vm = this.cx.map((cx, i) => {
      const g = row(svg, Vs[i], 0, 0);
      const lab = S('text', { x: rw / 2, y: -6, class: 't3', 'font-size': 12, 'text-anchor': 'middle', text: '× ' + pct(this.w[i]) }, g);
      return { g, lab };
    });
    S('text', { x: 40, y: 394, class: 't', 'font-size': 17, 'font-weight': 700, text: 'z' }, svg);
    this.zrow = row(svg, this.z.map(v => v * 1.6), 310 - rw / 2, 378);
    this.znote = S('text', { x: 310, y: 430, class: 'hand', 'font-size': 17, 'text-anchor': 'middle', text: 'sat, now mostly about the cat' }, svg);
  }
  label(t) { return t < 3 ? 'q · k · v' : t < 6.8 ? 'scores' : t < 9.8 ? 'softmax' : t < 14 ? 'mix values' : 'output'; }
  render(t) {
    const rw = this.rw;
    this.cols.forEach((c, i) => {
      op(c.g, seg(t, .1 + i * .15, .5 + i * .15));
      op(c.q, seg(t, .6 + i * .2, 1.0 + i * .2) * (i === 2 ? 1 : .22));
      op(c.k, seg(t, 1.2 + i * .2, 1.6 + i * .2));
      op(c.v, seg(t, 1.8 + i * .2, 2.2 + i * .2) * (1 - .55 * seg(t, 9.8, 10.4)));
    });
    // ghost query visits each key in turn
    let gx = this.cx[2] - rw / 2, gy = 94, go = 0;
    for (let i = 0; i < 3; i++) {
      const s0 = 3.0 + i * 1.2, a = inout(seg(t, s0, s0 + .5));
      if (t >= s0 && t < s0 + 1.2) { gx = lerp(this.cx[2] - rw / 2, this.cx[i] - rw / 2, a); gy = lerp(94, 124, a); go = 1 - seg(t, s0 + .8, s0 + 1.15); }
      op(this.sc[i], ease(seg(t, s0 + .5, s0 + .8)));
    }
    attr(this.ghost, { transform: `translate(${gx} ${gy})` }); op(this.ghost, go);
    op(this.scale, seg(t, 6.8, 7.3));
    this.wt.forEach((e, i) => op(e, seg(t, 7.4 + i * .2, 7.9 + i * .2)));
    this.wb.forEach((e, i) => attr(e, { width: Math.max(0, 100 * this.w[i] * ease(seg(t, 7.6 + i * .2, 8.6 + i * .2))) }));
    op(this.sum, seg(t, 8.8, 9.4));
    // values: drop, scale by weight, then merge into z
    this.vm.forEach((m, i) => {
      const drop = inout(seg(t, 10 + i * .25, 11 + i * .25)), merge = inout(seg(t, 12, 13.2));
      const x = lerp(this.cx[i] - rw / 2, 310 - rw / 2, merge), y = lerp(lerp(154, 318, drop), 378, merge);
      attr(m.g, { transform: `translate(${x} ${y})` });
      op(m.g, t < 10 + i * .25 ? 0 : lerp(1, this.w[i] * .7 + .3, seg(t, 10.8, 11.6)) * (1 - seg(t, 13.0, 13.4)));
      op(m.lab, seg(t, 11, 11.5) * (1 - seg(t, 12, 12.3)));
    });
    op(this.zrow, seg(t, 13.0, 13.6));
    op(this.znote, seg(t, 14, 14.8));
  }
}

// ── fig 7 · heads + causal mask ────────────────────────────────────────────
class TfHeads extends Figure {
  constructor() { super(); this.duration = 12.5; }
  build() {
    const W = this.W = ['the', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'slept'], n = W.length;
    const svg = this.svgRoot(600, 540, 'Four attention heads with a causal mask');
    const pid = 'hatch' + Math.random().toString(36).slice(2, 7);
    const pat = S('pattern', { id: pid, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, S('defs', {}, svg));
    S('line', { x1: 0, y1: 0, x2: 0, y2: 5, class: 's-rule', 'stroke-width': 1.6 }, pat);
    const heads = [
      ['looks one back', (i, j) => j === i - 1 ? 4 : j === i ? 1 : 0],
      ['finds the copy', (i, j) => (i === 4 && j === 0) ? 4.5 : j === i ? 2 : 0],
      ['parks on the first token', (i, j) => j === 0 ? 3.4 : 0],
      ['verb → who did it', (i, j) => ({ 2: { 1: 4 }, 7: { 1: 4, 2: 1.4 }, 6: { 2: 2.6 }, 5: { 3: 2.6 }, 3: { 2: 2.2 } }[i]?.[j] ?? (j === i ? 1.5 : 0))],
    ];
    const c = 19, gw = c * n;
    this.panels = heads.map(([name, f], h) => {
      const ox = h % 2 ? 380 : 90, oy = h < 2 ? 62 : 310;
      const g = S('g', {}, svg);
      const A = W.map((_, i) => { const allowed = W.map((_, j) => j <= i); const s = W.map((_, j) => f(i, j)); const p = softmax(s.filter((_, j) => allowed[j])); return W.map((_, j) => j <= i ? p[j] : 0); });
      W.forEach((w, j) => S('text', { x: ox + j * c + c / 2 + 3, y: oy - 6, class: 't3', 'font-size': 11, transform: `rotate(-55 ${ox + j * c + c / 2 + 3} ${oy - 6})`, text: w }, g));
      const rowsL = W.map((w, i) => S('text', { x: ox - 6, y: oy + i * c + 14, class: 't2', 'font-size': 12, 'text-anchor': 'end', text: w }, g));
      S('rect', { x: ox, y: oy, width: gw, height: gw, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
      const mask = S('path', { d: W.map((_, i) => `M${ox + (i + 1) * c} ${oy + i * c}h${gw - (i + 1) * c}v${c}h${-(gw - (i + 1) * c)}z`).join(''), fill: `url(#${pid})` }, g);
      const cells = A.map((r, i) => r.map((a, j) => j <= i ? S('rect', { x: ox + j * c + 1, y: oy + i * c + 1, width: c - 2, height: c - 2, rx: 2, class: 'f-ink', opacity: 0 }, g) : null));
      const lab = S('text', { x: ox + gw / 2, y: oy + gw + 30, class: 'hand', 'font-size': 16, 'text-anchor': 'middle', text: name }, g);
      return { g, A, cells, mask, lab, rowsL };
    });
    this.maskNote = S('text', { x: 300, y: 530, class: 't3', 'font-size': 12, 'text-anchor': 'middle', text: 'hatched = the future, masked out' }, svg);
  }
  label(t) { const r = Math.floor((t - 2.8) / .7); return t < 1.5 ? 'heads' : t < 2.8 ? 'mask' : r < 8 ? `token ${r + 1}/8` : 'patterns'; }
  render(t) {
    this.panels.forEach((p, h) => {
      op(p.g, seg(t, .2 + h * .15, .7 + h * .15));
      op(p.mask, seg(t, 1.5, 2.3));
      p.A.forEach((r, i) => {
        const a = ease(seg(t, 2.8 + i * .7, 3.3 + i * .7));
        r.forEach((w, j) => { if (p.cells[i][j]) op(p.cells[i][j], a * (.06 + .94 * w)); });
        const live = t >= 2.8 + i * .7 && t < 3.5 + i * .7;
        p.rowsL[i].style.fill = live ? 'var(--green-t)' : '';
      });
      op(p.lab, seg(t, 8.8 + h * .3, 9.4 + h * .3));
    });
    op(this.maskNote, seg(t, 1.8, 2.4));
  }
}

// ── fig 8 · residual stream ────────────────────────────────────────────────
class TfBlock extends Figure {
  constructor() { super(); this.duration = 17.5; this.loop = true; this.poster = 7.2; }
  build() {
    const svg = this.svgRoot(600, 580, 'A token vector flowing up the residual stream through attention and MLP blocks');
    const LX = this.LX = 330, L = this.L = 3;
    this.ya = l => 470 - l * 150; this.ym = l => this.ya(l) - 72;
    // other tokens' lanes
    this.others = [36, 58, 80];
    this.others.forEach(x => S('line', { x1: x, x2: x, y1: 40, y2: 530, class: 's-rule', 'stroke-width': 1.2, 'stroke-dasharray': '2 4' }, svg));
    S('text', { x: 58, y: 30, class: 't3', 'font-size': 12, 'text-anchor': 'middle', text: 'other tokens' }, svg);
    // main lane
    S('rect', { x: LX - 3, y: 40, width: 6, height: 490, rx: 3, class: 'f-rule' }, svg);
    S('text', { x: LX, y: 552, class: 't2', 'font-size': 13, 'text-anchor': 'middle', text: 'embedding + position' }, svg);
    S('text', { x: LX, y: 26, class: 't2', 'font-size': 13, 'text-anchor': 'middle', text: '↑ next-token scores' }, svg);
    this.blocks = [];
    for (let l = 0; l < L; l++) {
      const ya = this.ya(l), ym = this.ym(l);
      S('text', { x: 590, y: ya + 24, class: 'sl', 'font-size': 11, 'text-anchor': 'end', text: 'LAYER ' + (l + 1) }, svg);
      const mk = (x, y, name) => {
        const g = S('g', {}, svg);
        const box = S('rect', { x, y: y - 10, width: 120, height: 52, rx: 9, class: 'f-bg s-rule', 'stroke-width': 1 }, g);
        S('text', { x: x + 60, y: y + 21, class: 't', 'font-size': 15, 'text-anchor': 'middle', text: name }, g);
        const d = S('circle', { cx: x + 108, cy: y + 1, r: 3.2, class: 'f-ink3' }, g);
        return { g, box, d };
      };
      const A = mk(120, ya, 'attention'), M = mk(420, ym, 'mlp');
      // branch paths: out on the lower line, back on the upper line
      S('path', { d: `M${LX} ${ya + 34} H240 M240 ${ya} H${LX - 9}`, class: 'f-none s-rule', 'stroke-width': 1.2 }, svg);
      S('path', { d: `M${LX} ${ym + 34} H420 M420 ${ym} H${LX + 9}`, class: 'f-none s-rule', 'stroke-width': 1.2 }, svg);
      const plus = y => { const g = S('g', {}, svg); const c = S('circle', { cx: LX, cy: y, r: 9, class: 'f-bg s-ink2', 'stroke-width': 1.2 }, g); S('path', { d: `M${LX - 4.5} ${y}h9M${LX} ${y - 4.5}v9`, class: 's-ink2', 'stroke-width': 1.4 }, g); return c; };
      const reads = this.others.map(x => S('line', { x1: 120, x2: x, y1: ya + 16, y2: ya + 16, class: 's-green', 'stroke-width': 1.2, opacity: 0 }, svg));
      this.blocks.push({ A, M, pa: plus(ya), pm: plus(ym), reads });
    }
    // packets: 6 cells + a critter rider
    const r = rng(11);
    this.v0 = Array.from({ length: 6 }, () => r() * 1.6 - .8);
    this.deltas = Array.from({ length: L * 2 }, () => Array.from({ length: 6 }, () => r() * 1.2 - .6));
    const packet = (parent, rider) => {
      const g = S('g', {}, parent), cells = [];
      for (let i = 0; i < 6; i++) cells.push(S('rect', { x: -36 + i * 12, y: -5, width: 10, height: 10, rx: 2 }, g));
      if (rider) { const c = S('g', { transform: 'translate(-11 -24)' }, g); critter(c, 2, 'f-green'); }
      return { g, cells };
    };
    this.main = packet(svg, true);
    this.ghost = packet(svg, false);
    this.mini = this.others.map(x => { const g = S('g', {}, svg); S('rect', { x: x - 6, y: -4, width: 12, height: 8, rx: 2, class: 'f-ink3' }, g); return g; });
    this.note = S('text', { x: 180, y: this.ya(0) - 22, class: 'hand', 'font-size': 16, 'text-anchor': 'middle', text: 'the only place lanes connect' }, svg);
    // keyframes for the main packet's height
    const kf = [[0, 512], [.6, 512]];
    this.sched = [];
    for (let l = 0; l < L; l++) {
      const s = .6 + l * 4.6, ya = this.ya(l), ym = this.ym(l);
      kf.push([s + .8, ya + 34], [s + 2.0, ya + 34], [s + 2.4, ya], [s + 3.2, ym + 34], [s + 4.4, ym + 34], [s + 4.6, ym]);
      this.sched.push({ s, l });
    }
    kf.push([14.4 + .2, this.ym(L - 1)], [15.6, 56], [17.5, 56]);
    this.kf = kf;
  }
  vecAt(t) {
    // the residual vector after all additions completed by time t
    const v = this.v0.slice();
    this.sched.forEach(({ s, l }) => {
      const a = inout(seg(t, s + 2.0, s + 2.4)), m = inout(seg(t, s + 4.2, s + 4.6));
      this.deltas[l * 2].forEach((d, i) => v[i] += d * a);
      this.deltas[l * 2 + 1].forEach((d, i) => v[i] += d * m);
    });
    return v.map(x => Math.tanh(x));
  }
  label(t) {
    for (const { s, l } of this.sched) { if (t < s + 2.4) return `L${l + 1} · attention`; if (t < s + 4.6) return `L${l + 1} · mlp`; }
    return 'out';
  }
  render(t) {
    const y = keyframes(t, this.kf), v = this.vecAt(t);
    attr(this.main.g, { transform: `translate(${this.LX} ${y})` });
    this.main.cells.forEach((c, i) => paint(c, v[i]));
    this.mini.forEach(g => attr(g, { transform: `translate(0 ${y})` }));
    let gx = this.LX, gy = y, go = 0, gv = v;
    this.blocks.forEach((b, l) => {
      const s = .6 + l * 4.6, ya = this.ya(l), ym = this.ym(l);
      const aOn = t >= s + 1.2 && t < s + 2.0, mOn = t >= s + 3.8 && t < s + 4.4;
      b.A.d.setAttribute('class', aOn ? 'f-green' : 'f-ink3'); b.M.d.setAttribute('class', mOn ? 'f-green' : 'f-ink3');
      b.A.box.setAttribute('class', aOn ? 'f-bg s-ink2' : 'f-bg s-rule'); b.M.box.setAttribute('class', mOn ? 'f-bg s-ink2' : 'f-bg s-rule');
      b.reads.forEach((r, i) => op(r, (seg(t, s + 1.2 + i * .08, s + 1.4 + i * .08) - seg(t, s + 1.8, s + 2.0)) * .9));
      const flash = (c, a, b2) => c.setAttribute('class', t >= a && t < b2 ? 'f-bg s-green' : 'f-bg s-ink2');
      flash(b.pa, s + 2.1, s + 2.5); flash(b.pm, s + 4.3, s + 4.7);
      // ghost copy: out to the box, back with the change
      const out = (t0, x1, yy) => inout(seg(t, t0, t0 + .5));
      if (t >= s + .8 && t < s + 2.4) {
        const o = out(s + .8), back = inout(seg(t, s + 1.9, s + 2.3));
        gx = back > 0 ? lerp(282, this.LX, back) : lerp(this.LX, 282, o);
        gy = back > 0 ? ya : ya + 34; gv = this.deltas[l * 2].map(Math.tanh);
        go = back > 0 ? 1 : 1 - seg(t, s + 1.2, s + 1.35);
        if (back === 0) gv = v;
      }
      if (t >= s + 3.2 && t < s + 4.6) {
        const o = out(s + 3.2), back = inout(seg(t, s + 4.1, s + 4.5));
        gx = back > 0 ? lerp(378, this.LX, back) : lerp(this.LX, 378, o);
        gy = back > 0 ? ym : ym + 34; gv = this.deltas[l * 2 + 1].map(Math.tanh);
        go = back > 0 ? 1 : 1 - seg(t, s + 3.7, s + 3.85);
        if (back === 0) gv = v;
      }
    });
    attr(this.ghost.g, { transform: `translate(${gx} ${gy})` }); op(this.ghost.g, go * .9);
    this.ghost.cells.forEach((c, i) => paint(c, gv[i]));
    op(this.note, seg(t, 1.6, 2.2) * (1 - seg(t, 14.6, 15.2)));
  }
}

// ── fig 9 · sampling (interactive) ─────────────────────────────────────────
const END = [['.', 2.0], ['and', .9], ['again', .3]];
const TABLE = {
  cat: [['sat', 2.2], ['slept', 1.6], ['is', 1.2], ['ate', .9], ['purred', .6], ['exploded', -1.6]],
  sat: [['on', 2.6], ['down', 1.4], ['by', .8], ['quietly', .4], ['there', .2]],
  slept: [['on', 1.8], ['all', 1.3], ['through', 1.0], ['for', .8], ['.', .6]],
  is: [['asleep', 1.8], ['hungry', 1.5], ['on', 1.0], ['mine', .6], ['a', .5]],
  ate: [['the', 2.0], ['my', 1.2], ['dinner', 1.0], ['.', .6], ['quietly', .3]],
  purred: [['.', 1.6], ['on', 1.4], ['quietly', 1.0], ['all', .5], ['for', .4]],
  exploded: [['.', 2.4], ['again', 1.0], ['quietly', .2]],
  on: [['the', 2.8], ['my', 1.6], ['a', 1.0], ['top', .5], ['mars', -1.2]],
  down: [['on', 1.6], ['.', 1.5], ['by', .7], ['quietly', .5], ['for', .3]],
  by: [['the', 2.4], ['my', 1.2], ['a', .8]],
  the: [['mat', 2.4], ['sofa', 1.8], ['floor', 1.5], ['keyboard', 1.0], ['moon', -.6]],
  my: [['keyboard', 2.0], ['bed', 1.6], ['laptop', 1.4], ['sofa', 1.0], ['dinner', .8]],
  a: [['box', 1.8], ['warm', 1.6], ['mat', 1.2], ['sunbeam', 1.1], ['cloud', -.2]],
  warm: [['sunbeam', 2.0], ['box', 1.5], ['mat', 1.0]],
  all: [['day', 2.4], ['night', 1.8], ['morning', 1.0]],
  through: [['the', 2.2], ['lunch', .9], ['winter', .6]],
  for: [['hours', 2.0], ['a', 1.2], ['days', .8]],
  quietly: [['.', 1.8], ['on', 1.0], ['by', .6]],
  top: [['of', 3.0]], of: [['the', 2.2], ['my', 1.4]],
  there: [['.', 2.0], ['all', .8]],
  and: [['slept', 1.6], ['purred', 1.4], ['sat', .8], ['ate', .6]],
  again: [['.', 2.5]],
};
class TfSample extends Figure {
  build() {
    this.T = .8; this.idleText = 'interactive';
    const svg = this.svgRoot(600, 330, 'Sampling the next token with temperature');
    this.textG = S('text', { x: 24, y: 52, class: 't', 'font-size': 20, style: 'white-space:pre' }, svg);
    this.cursor = S('rect', { y: 35, width: 11, height: 21, class: 'f-green' }, svg);
    this.flash = S('text', { y: 52, class: 't', 'font-size': 20, style: 'fill:var(--green-t);white-space:pre' }, svg);
    S('text', { x: 24, y: 118, class: 'sl', 'font-size': 11, text: 'P(NEXT) = SOFTMAX(LOGITS / T)' }, svg);
    this.rows = [0, 1, 2, 3, 4].map(i => {
      const y = 132 + i * 25, g = S('g', {}, svg);
      return {
        g,
        word: S('text', { x: 24, y: y + 14, class: 't', 'font-size': 16 }, g),
        track: S('rect', { x: 130, y: y + 4, width: 380, height: 12, rx: 2, class: 'f-rule' }, g),
        bar: S('rect', { x: 130, y: y + 4, height: 12, rx: 2, class: 'f-ink3' }, g),
        pct: S('text', { x: 576, y: y + 14, class: 't2', 'font-size': 14, 'text-anchor': 'end' }, g),
      };
    });
    this.stripG = S('g', {}, svg);
    this.dart = S('g', {}, svg); critter(this.dart, 2, 'f-green');
    const bar = H('div', { class: 'fc' }, this);
    H('span', { text: 'temperature', class: 'mono' }, bar);
    this.slider = H('input', { type: 'range', min: 10, max: 200, value: 80, 'aria-label': 'Temperature' }, bar);
    this.tl = H('span', { class: 'fc-l', text: 'T = 0.80' }, bar);
    this.sampleBtn = H('button', { class: 'pill', type: 'button', text: 'sample →' }, bar);
    this.resetBtn = H('button', { class: 'pill', type: 'button', text: 'reset' }, bar);
    this.slider.oninput = () => { this.T = this.slider.value / 100; this.tl.textContent = 'T = ' + this.T.toFixed(2); this.held = true; this.draw(); };
    this.sampleBtn.onclick = () => { this.held = true; this.step(); };
    this.resetBtn.onclick = () => { this.held = true; this.reset(); };
    this.rand = STILL ? rng(4) : Math.random;
    this.reset();
  }
  reset() { this.toks = ['the', 'cat']; this.pick = -1; this.dartX = null; this.draw(); }
  cands() {
    const last = this.toks[this.toks.length - 1], c = this.toks.length > 13 ? [['.', 3]] : (TABLE[last] || END);
    const p = softmax(c.map(x => x[1]), this.T);
    return c.map((x, i) => [x[0], p[i]]);
  }
  done() { return this.toks[this.toks.length - 1] === '.'; }
  text() { return this.toks.reduce((s, w) => s + (w === '.' ? '.' : (s ? ' ' : '') + w), ''); }
  draw(fresh) {
    const txt = this.text(), cw = 20 * CW;
    const shown = txt.length > 44 ? '…' + txt.slice(-43) : txt;
    this.textG.textContent = shown;
    attr(this.cursor, { x: 24 + shown.length * cw + 3 }); op(this.cursor, this.done() ? .25 : 1);
    if (fresh) {
      const w = this.toks[this.toks.length - 1], s = (w === '.' ? '' : ' ') + w;
      this.flash.textContent = s; attr(this.flash, { x: 24 + (shown.length - s.length) * cw });
      op(this.flash, 1); this.fade = performance.now();
      const f = now => { const a = 1 - seg(now - this.fade, 300, 900); op(this.flash, a); if (a > 0) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }
    const c = this.done() ? [] : this.cands(), sorted = c.slice().sort((a, b) => b[1] - a[1]);
    this.rows.forEach((r, i) => {
      const x = sorted[i];
      op(r.g, x ? 1 : 0);
      if (!x) return;
      r.word.textContent = x[0]; attr(r.bar, { width: 380 * x[1] }); r.pct.textContent = pct(x[1]);
      r.bar.setAttribute('class', i === 0 ? 'f-ink' : 'f-ink3');
    });
    // probability strip: the dart lands somewhere on it
    this.stripG.replaceChildren();
    let x = 24; const W = 552, y = 290;
    this.segs = c.map(([w, p], i) => {
      const wd = W * p, g = S('g', {}, this.stripG);
      const r = S('rect', { x: x + .5, y, width: Math.max(0, wd - 1), height: 18, rx: 3, class: i % 2 ? 'f-rule2' : 'f-rule' }, g);
      if (wd > w.length * 6.5 + 10) S('text', { x: x + wd / 2, y: y + 13.5, class: 't2', 'font-size': 12, 'text-anchor': 'middle', text: w }, g);
      const o = { x0: x, x1: x + wd, r, w }; x += wd; return o;
    });
    if (this.done()) S('text', { x: 24, y: y + 13, class: 't3', 'font-size': 13, text: 'done. reset, or change T and go again.' }, this.stripG);
    attr(this.dart, { transform: `translate(${(this.dartX ?? 24) - 11} ${y - 24})` }); op(this.dart, this.done() ? 0 : 1);
  }
  step() {
    if (this.busy) return;
    if (this.done()) { this.reset(); return; }
    this.busy = true;
    const u = this.rand(), segs = this.segs, hit = segs.find(s => u * 552 + 24 < s.x1) || segs[segs.length - 1];
    const from = this.dartX ?? 24, to = 24 + u * 552, t0 = performance.now(), D = REDUCED ? 1 : 700;
    this.setStatus('running');
    const f = now => {
      const k = seg(now - t0, 0, D), x = lerp(from, to, inout(k)), hop = Math.sin(k * Math.PI) * 18;
      attr(this.dart, { transform: `translate(${x - 11} ${290 - 24 - hop})` });
      if (k < 1) return requestAnimationFrame(f);
      hit.r.setAttribute('class', 'f-green');
      setTimeout(() => { this.toks.push(hit.w); this.dartX = to; this.busy = false; this.draw(true); this.setStatus('interactive', 'idle'); this.next(); }, REDUCED ? 0 : 380);
    };
    requestAnimationFrame(f);
  }
  next() {
    clearTimeout(this.timer);
    if (this.held || !this.visible || REDUCED) return;
    this.timer = setTimeout(() => { if (this.done()) { this.reset(); this.next(); } else this.step(); }, this.done() ? 3200 : 1100);
  }
  onVisible(v) {
    this.visible = v;
    if (STILL) { this.toks = ['the', 'cat', 'sat', 'on']; this.draw(); return; }
    if (v) this.next(); else clearTimeout(this.timer);
  }
  render() {}
}

define({ 'tf-next': TfNext, 'tf-tokens': TfTokens, 'tf-embed': TfEmbed, 'tf-position': TfPosition, 'tf-attention': TfAttention, 'tf-qkv': TfQKV, 'tf-heads': TfHeads, 'tf-block': TfBlock, 'tf-sample': TfSample });
