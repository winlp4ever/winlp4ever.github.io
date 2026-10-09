// Figures for "Messi in numbers".
// Sources are in each figure's caption; the research notes are in ~/workspace/blog/my-blog/reports.
import { S, attr, op, seg, inout, ease, clamp, handArrow, CW, REDUCED, STILL, Figure, define, entrance, pills } from './core.js';

const bar = (parent, cls, a = {}) => S('rect', { rx: 2, class: cls, ...a }, parent);
// labelled horizontal bars that grow in; rows are [label, value, highlight]
function hbars(svg, rows, x0, X, fmt, top = 42) {
  const out = rows.map(([n, v, me], i) => {
    const y = top + i * 30;
    S('text', { x: x0 - 10, y: y + 13, class: 't', 'font-size': 12.5, 'text-anchor': 'end', text: n }, svg);
    return { r: bar(svg, me ? 'f-green' : 'f-rule2', { x: x0, y, height: 18 }), t: S('text', { y: y + 13, class: 't2', 'font-size': 12 }, svg), v };
  });
  return (k) => out.forEach((r) => { attr(r.r, { width: X(r.v * k) }); attr(r.t, { x: x0 + X(r.v * k) + 8 }); r.t.textContent = fmt(r.v * k); });
}

// ── fig 1 · every age ──────────────────────────────────────────────────────
// [age, G+A per 90, non-penalty G+A per 90 or null], all official club and country
// matches (MessiVsRonaldo.app by age, the age year starts on 24 June)
const AGE = [
  [18, 0.79, 0.79], [19, 0.66, null], [20, 0.80, 0.70], [21, 1.15, 1.07], [22, 1.02, null], [23, 1.41, 1.31],
  [24, 1.67, 1.46], [25, 1.56, 1.44], [26, 1.30, 1.09], [27, 1.37, 1.25], [28, 1.40, 1.31], [29, 1.34, 1.16],
  [30, 1.21, 1.14], [31, 1.48, 1.37], [32, 1.30, 1.17], [33, 1.01, 0.85], [34, 0.96, 0.87], [35, 1.18, 1.09],
  [36, 1.48, 1.45], [37, 1.01, 0.99], [38, 1.70, 1.62], [39, 1.45, 1.40],
];
const MEDIAN_PEAK = 0.43; // median Big-5 forward at their peak age (28), np G+A per 90, StatsBomb 2016
class MsAge extends Figure {
  build() {
    const svg = this.svgRoot(600, 320, 'Goals plus assists per 90 minutes at every age from 18 to 39, against the median forward at peak');
    const x0 = 46, y0 = 270, W = 534, Hh = 220, bw = W / AGE.length, Y = (v) => y0 - (v / 1.8) * Hh;
    [0, 0.5, 1, 1.5].forEach((v) => {
      S('line', { x1: x0, x2: x0 + W, y1: Y(v), y2: Y(v), class: 's-rule', 'stroke-width': v ? 0.6 : 1 }, svg);
      S('text', { x: x0 - 8, y: Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v.toFixed(1) }, svg);
    });
    // Barcelona, PSG, Miami spans by age (moves at 34 and 36)
    [[18, 33, 'BARCELONA'], [34, 35, 'PSG'], [36, 39, 'MIAMI']].forEach(([a, b, t]) => {
      const xa = x0 + (a - 18) * bw + 3, xb = x0 + (b - 17) * bw - 3;
      S('line', { x1: xa, x2: xb, y1: 296, y2: 296, class: 's-ink3', 'stroke-width': 1 }, svg);
      S('text', { x: (xa + xb) / 2, y: 312, class: 'sl', 'font-size': 10, 'text-anchor': 'middle', text: t }, svg);
    });
    this.bars = AGE.map(([age, ga, np], i) => {
      const x = x0 + i * bw + 3, w = bw - 6;
      if (age % 3 === 0) S('text', { x: x + w / 2, y: y0 + 15, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: age }, svg);
      return { r: bar(svg, 'f-green'), npl: np != null && S('line', { x1: x, x2: x + w, class: 's-ink', 'stroke-width': 2 }, svg), x, w, ga, np };
    });
    S('line', { x1: x0, x2: x0 + W, y1: Y(MEDIAN_PEAK), y2: Y(MEDIAN_PEAK), class: 's-ochre', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
    S('line', { x1: 330, x2: 344, y1: 37, y2: 37, class: 's-ochre', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
    S('text', { x: 350, y: 41, class: 't2', 'font-size': 11, text: `median forward at his best age: ${MEDIAN_PEAK}` }, svg);
    S('text', { x: x0, y: 22, class: 'sl', 'font-size': 11, text: 'GOALS + ASSISTS PER 90, BY AGE' }, svg);
    S('rect', { x: 330, y: 13, width: 10, height: 10, rx: 2, class: 'f-green' }, svg);
    S('text', { x: 346, y: 22, class: 't2', 'font-size': 11, text: 'all' }, svg);
    S('line', { x1: 380, x2: 394, y1: 18, y2: 18, class: 's-ink', 'stroke-width': 2 }, svg);
    S('text', { x: 400, y: 22, class: 't2', 'font-size': 11, text: 'without penalties' }, svg);
    entrance(this, (k) => this.bars.forEach((b, i) => {
      const kk = clamp(k * 1.7 - i * 0.03);
      attr(b.r, { x: b.x, width: b.w, y: Y(b.ga * kk), height: y0 - Y(b.ga * kk) });
      if (b.npl) { attr(b.npl, { y1: Y(b.np * kk), y2: Y(b.np * kk) }); op(b.npl, kk); }
    }), 1400);
  }
}

// ── hover labels ───────────────────────────────────────────────────────────
// One floating label per figure; any dot can show it on hover or tap.
function tooltip(svg) {
  const W = +svg.getAttribute('viewBox').split(' ')[2];
  const g = S('g', { 'pointer-events': 'none', opacity: 0 }, svg);
  const r = S('rect', { rx: 6, class: 'f-panel s-ink3', 'stroke-width': 1 }, g);
  const t = [0, 1].map((i) => S('text', { class: i ? 't2' : 't', 'font-size': 11.5 }, g));
  return {
    show(x, y, a, b) {
      t[0].textContent = a; t[1].textContent = b;
      const w = Math.max(a.length, b.length) * 11.5 * CW + 16, left = x + w + 14 > W ? x - w - 12 : x + 12, top = Math.max(2, y - 46);
      attr(r, { x: left, y: top, width: w, height: 40 }); attr(t[0], { x: left + 8, y: top + 16 }); attr(t[1], { x: left + 8, y: top + 32 });
      svg.appendChild(g); op(g, 1);
    },
    hide() { op(g, 0); },
  };
}
// an invisible, larger hit area around a dot, so small dots are easy to hover or tap
function hit(parent, tip, x, y, a, b) {
  const c = S('circle', { cx: x, cy: y, r: 9, fill: 'none', 'pointer-events': 'all', style: 'cursor:pointer' }, parent);
  const on = () => tip.show(x, y, a, b);
  c.addEventListener('pointerenter', on); c.addEventListener('pointerdown', on); c.addEventListener('pointerleave', () => tip.hide());
  return c;
}
// shared scatter frame: axes, ticks and lines of equal goals + assists
function frame(g, c, X, Y, x0, x1, y0, y1) {
  c.iso.forEach((s) => {
    const xa = Math.min(s, c.xmax), ya = s - xa, yb = Math.min(s, c.ymax), xb = s - yb;
    S('line', { x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb), class: 's-rule', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, g);
    S('text', { x: X(xb) + 4, y: Y(yb) + 12, class: 't3', 'font-size': 10, text: `${s} together` }, g);
  });
  S('line', { x1: x0, x2: x1, y1: y0, y2: y0, class: 's-rule', 'stroke-width': 1 }, g);
  S('line', { x1: x0, x2: x0, y1: y0, y2: y1, class: 's-rule', 'stroke-width': 1 }, g);
  c.xt.forEach((v) => S('text', { x: X(v), y: y0 + 15, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: c.fmt(v) }, g));
  c.yt.forEach((v) => S('text', { x: x0 - 6, y: Y(v) + 4, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: c.fmt(v) }, g));
  S('text', { x: x1, y: y0 - 6, class: 't2', 'font-size': 11, 'text-anchor': 'end', text: c.xl }, g);
  S('text', { x: x0 + 4, y: y1 - 6, class: 't2', 'font-size': 11, text: c.yl }, g);
}
const tween = (fig, paint, ms) => {
  if (STILL || REDUCED) return paint(1);
  const t0 = performance.now(), f = (now) => { const k = clamp((now - t0) / ms); paint(ease(k)); if (k < 1) fig._tw = requestAnimationFrame(f); };
  cancelAnimationFrame(fig._tw); fig._tw = requestAnimationFrame(f);
};

// ── fig 1 · scorers and creators, two views ────────────────────────────────
// top-5 leagues, every season each player played there, FBref (Opta) via Wayback snapshots
const PER90 = [
  ['Messi', 0.83, 0.42], ['Cristiano Ronaldo', 0.70, 0.24], ['Lewandowski', 0.76, 0.17], ['Suárez', 0.70, 0.29], ['Henry', 0.61, 0.29],
  ['Ibrahimović', 0.60, 0.26], ['Benzema', 0.58, 0.27], ['Kane', 0.64, 0.17], ['Haaland', 0.82, 0.21], ['Mbappé', 0.83, 0.29],
  ['Eto’o', 0.52, 0.18], ['Agüero', 0.63, 0.20], ['Shevchenko', 0.51, 0.16], ['Rooney', 0.44, 0.24], ['Griezmann', 0.42, 0.19],
  ['Ronaldo Nazário', 0.67, 0.17], ['Özil', 0.20, 0.40], ['De Bruyne', 0.28, 0.48], ['Fàbregas', 0.18, 0.38], ['Iniesta', 0.10, 0.20],
  ['Xavi', 0.14, 0.25], ['Zidane', 0.20, 0.26], ['Neymar', 0.55, 0.39], ['Ronaldinho', 0.31, 0.32], ['Kaká', 0.30, 0.28],
  ['Modrić', 0.09, 0.19], ['Thomas Müller', 0.34, 0.44], ['Salah', 0.55, 0.31], ['Hazard', 0.28, 0.26], ['Riquelme', 0.17, 0.29],
  ['Pirlo', 0.10, 0.21], ['Totti', 0.36, 0.32], ['David Silva', 0.20, 0.29],
];
// whole club career, all competitions, per game: Transfermarkt (via a public API mirror);
// the 1 marks players with 40%+ of their games before 1999, whose assists are a floor
const CAREER = [
  ['Messi', 0.83, 0.41], ['Ronaldo Nazário', 0.66, 0.17, 1], ['Gerd Müller', 0.93, 0.18, 1], ['Cristiano Ronaldo', 0.75, 0.24],
  ['Lewandowski', 0.72, 0.18], ['Suárez', 0.60, 0.32], ['Henry', 0.45, 0.23], ['Ibrahimović', 0.60, 0.25], ['Benzema', 0.54, 0.23],
  ['Kane', 0.69, 0.16], ['Haaland', 0.79, 0.17], ['Mbappé', 0.79, 0.29], ['Van Basten', 0.74, 0.23, 1], ['Raúl', 0.42, 0.18],
  ['Eto’o', 0.49, 0.16], ['Agüero', 0.56, 0.17], ['Shevchenko', 0.50, 0.15], ['Rooney', 0.41, 0.22], ['Griezmann', 0.38, 0.17],
  ['Özil', 0.16, 0.36], ['De Bruyne', 0.24, 0.39], ['Fàbregas', 0.17, 0.29], ['Iniesta', 0.11, 0.19], ['Xavi', 0.12, 0.25],
  ['Zidane', 0.18, 0.21, 1], ['Neymar', 0.59, 0.37], ['Ronaldinho', 0.36, 0.28], ['Kaká', 0.31, 0.27], ['Modrić', 0.11, 0.15],
  ['Thomas Müller', 0.34, 0.36], ['Salah', 0.49, 0.25], ['Hazard', 0.27, 0.25], ['Riquelme', 0.25, 0.26], ['Pirlo', 0.10, 0.18],
  ['Totti', 0.39, 0.26], ['David Silva', 0.16, 0.25], ['Bergkamp', 0.36, 0.21, 1], ['Cruyff', 0.57, 0.43, 1],
];
const NO_ASSISTS = [['Eusébio', 1.01], ['Pelé', 0.94], ['Romário', 0.77], ['Batistuta', 0.54], ['Maradona', 0.53]];
const VIEWS = {
  per90: {
    rows: PER90, xmax: 0.95, ymax: 0.55, xt: [0, 0.2, 0.4, 0.6, 0.8], yt: [0, 0.2, 0.4], iso: [0.5, 1.0], fmt: (v) => v.toFixed(1),
    xl: 'non-penalty goals per 90 →', yl: '↑ assists per 90', unit: 'per 90',
    label: ['Cristiano Ronaldo', 'Haaland', 'Mbappé', 'Neymar', 'De Bruyne', 'Özil', 'Thomas Müller', 'Zidane', 'Iniesta'],
    nudge: { Mbappé: [8, 4], Haaland: [8, 14], 'Cristiano Ronaldo': [8, -8], Zidane: [-46, 4], 'Thomas Müller': [7, -6] },
  },
  career: {
    rows: CAREER, xmax: 1.05, ymax: 0.5, xt: [0, 0.2, 0.4, 0.6, 0.8, 1.0], yt: [0, 0.2, 0.4], iso: [0.5, 1.0], fmt: (v) => v.toFixed(1),
    xl: 'goals per game →', yl: '↑ assists per game', unit: 'per game', noAssist: NO_ASSISTS,
    label: ['Cristiano Ronaldo', 'Gerd Müller', 'Haaland', 'Mbappé', 'Cruyff', 'Neymar', 'De Bruyne', 'Özil', 'Thomas Müller', 'Zidane'],
    nudge: { Cruyff: [-44, -6], 'Gerd Müller': [-34, -8], Haaland: [8, 14], Mbappé: [8, 4], 'Cristiano Ronaldo': [8, -8], Zidane: [7, 8] },
  },
};
class MsCluster extends Figure {
  build() {
    this.svgRoot(600, 410, 'Goals against assists for great attackers and playmakers, per 90 in the top five leagues or per game over whole careers');
    this.tip = tooltip(this.svg);
    pills(this, [['per90', 'top-five leagues, per 90'], ['career', 'whole career, per game']], 'per90', (v) => this.show(v));
    this.show('per90', true);
  }
  show(key, first) {
    const c = VIEWS[key], x0 = 56, x1 = 580, y0 = 330, y1 = 40;
    const X = (v) => x0 + (v / c.xmax) * (x1 - x0), Y = (v) => y0 - (v / c.ymax) * (y0 - y1);
    this.g?.remove(); this.tip.hide();
    const g = this.g = S('g', {}, this.svg);
    frame(g, c, X, Y, x0, x1, y0, y1);
    const dots = c.rows.map(([n, gl, a, floor]) => {
      const me = n === 'Messi', lab = me || c.label.includes(n), nd = me ? [10, 5] : c.nudge[n] || [7, 4];
      const d = S('circle', { r: me ? 7 : 4, class: me ? 'f-green' : floor ? 'f-panel s-ink2' : 'f-ink3', 'stroke-width': 1.5 }, g);
      const t = lab && S('text', { class: me ? 't' : 't2', 'font-size': me ? 13 : 10.5, text: n }, g);
      hit(g, this.tip, X(gl), Y(a), n, `${gl.toFixed(2)} goals, ${a.toFixed(2)} assists ${c.unit}`);
      return { d, t, gl, a, me, nd };
    });
    (c.noAssist || []).forEach(([n, gl], i) => {
      S('line', { x1: X(gl), x2: X(gl), y1: y0 + 24, y2: y0 + 32, class: 's-ink2', 'stroke-width': 2 }, g);
      S('text', { x: X(gl), y: y0 + 46 + (i % 2) * 14, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: n }, g);
    });
    if (c.noAssist) S('text', { x: x0 - 6, y: y0 + 32, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: 'no assists:' }, g);
    const paint = (k) => dots.forEach((p) => {
      const x = X(p.gl * k), y = Y(p.a * k);
      attr(p.d, { cx: x, cy: y }); if (p.t) attr(p.t, { x: x + p.nd[0], y: y + p.nd[1] });
    });
    if (first) entrance(this, paint, 1300); else tween(this, paint, 900);
    this.idleText = 'interactive';
  }
}

// ── best seasons · every club season of the greats ────────────────────────
// Goals and assists per club season, all competitions, seasons with 10+ goals and assists.
// Transfermarkt via a public API mirror, read 9 Oct 2026; finished seasons only. A trailing 1
// marks seasons before 1999, when assists were thinly recorded. Maradona, Batistuta and Romário
// are left out because the mirror is missing many of their league seasons.
const SEASON_ROWS = {
  'Messi': [['2005-06', 8, 5], ['2006-07', 17, 3], ['2007-08', 16, 16], ['2008-09', 38, 19], ['2009-10', 47, 12], ['2010-11', 53, 27], ['2011-12', 73, 32], ['2012-13', 60, 17], ['2013-14', 41, 14], ['2014-15', 58, 31], ['2015-16', 41, 24], ['2016-17', 54, 20], ['2017-18', 45, 20], ['2018-19', 51, 22], ['2019-20', 31, 27], ['2020-21', 38, 14], ['2021-22', 11, 15], ['2022-23', 21, 20], ['2023', 11, 5], ['2024', 23, 13], ['2025', 43, 26]],
  'Cristiano Ronaldo': [['2002-03', 5, 6], ['2003-04', 6, 8], ['2004-05', 9, 10], ['2005-06', 12, 8], ['2006-07', 23, 21], ['2007-08', 42, 9], ['2008-09', 26, 12], ['2009-10', 33, 10], ['2010-11', 53, 18], ['2011-12', 60, 15], ['2012-13', 55, 13], ['2013-14', 51, 17], ['2014-15', 61, 23], ['2015-16', 51, 15], ['2016-17', 42, 12], ['2017-18', 44, 8], ['2018-19', 28, 14], ['2019-20', 37, 9], ['2020-21', 36, 5], ['2021-22', 24, 3], ['2022-23', 17, 4], ['2023-24', 44, 13], ['2024-25', 35, 4], ['2025-26', 30, 5]],
  'Lewandowski': [['2007-08', 21, 1], ['2008-09', 20, 11], ['2009-10', 21, 8], ['2010-11', 9, 4], ['2011-12', 30, 12], ['2012-13', 36, 13], ['2013-14', 28, 13], ['2014-15', 25, 13], ['2015-16', 42, 7], ['2016-17', 43, 9], ['2017-18', 41, 5], ['2018-19', 40, 13], ['2019-20', 55, 10], ['2020-21', 48, 9], ['2021-22', 50, 7], ['2022-23', 33, 8], ['2023-24', 26, 9], ['2024-25', 42, 3], ['2025-26', 19, 4]],
  'Suárez': [['2006-07', 15, 10], ['2007-08', 22, 14], ['2008-09', 28, 19], ['2009-10', 49, 24], ['2010-11', 16, 14], ['2011-12', 17, 6], ['2012-13', 30, 8], ['2013-14', 31, 15], ['2014-15', 25, 23], ['2015-16', 59, 24], ['2016-17', 36, 20], ['2017-18', 31, 20], ['2018-19', 23, 14], ['2019-20', 21, 12], ['2020-21', 21, 3], ['2021-22', 13, 3], ['2022', 8, 3], ['2023', 29, 17], ['2024', 25, 12], ['2025', 17, 17]],
  'Henry': [['1996-97', 10, 2, 1], ['1997-98', 11, 1, 1], ['1999-00', 26, 12], ['2000-01', 22, 11], ['2001-02', 32, 9], ['2002-03', 32, 24], ['2003-04', 39, 18], ['2004-05', 30, 19], ['2005-06', 33, 8], ['2006-07', 12, 6], ['2007-08', 19, 12], ['2008-09', 26, 12], ['2011', 15, 3], ['2012', 15, 12], ['2013', 10, 8], ['2014', 10, 15]],
  'Ibrahimović': [['2001-02', 9, 5], ['2002-03', 21, 3], ['2003-04', 15, 8], ['2004-05', 19, 13], ['2005-06', 10, 9], ['2006-07', 15, 9], ['2007-08', 22, 9], ['2008-09', 29, 11], ['2009-10', 21, 13], ['2010-11', 22, 13], ['2011-12', 35, 11], ['2012-13', 35, 17], ['2013-14', 41, 17], ['2014-15', 30, 8], ['2015-16', 50, 20], ['2016-17', 28, 10], ['2018', 22, 7], ['2019', 31, 8], ['2019-20', 11, 5], ['2020-21', 17, 3], ['2021-22', 8, 3]],
  'Benzema': [['2006-07', 8, 5], ['2007-08', 31, 9], ['2008-09', 23, 5], ['2009-10', 9, 6], ['2010-11', 26, 7], ['2011-12', 32, 16], ['2012-13', 20, 20], ['2013-14', 24, 16], ['2014-15', 22, 15], ['2015-16', 28, 8], ['2016-17', 19, 8], ['2017-18', 12, 10], ['2018-19', 30, 11], ['2019-20', 27, 11], ['2020-21', 30, 9], ['2021-22', 44, 15], ['2022-23', 31, 6], ['2023-24', 13, 8], ['2024-25', 25, 9], ['2025-26', 25, 5]],
  'Kane': [['2011-12', 10, 5], ['2014-15', 31, 6], ['2015-16', 28, 2], ['2016-17', 35, 7], ['2017-18', 41, 5], ['2018-19', 24, 6], ['2019-20', 24, 2], ['2020-21', 33, 17], ['2021-22', 27, 10], ['2022-23', 32, 6], ['2023-24', 44, 12], ['2024-25', 41, 14], ['2025-26', 61, 7]],
  'Haaland': [['2018', 12, 5], ['2019-20', 44, 10], ['2020-21', 41, 12], ['2021-22', 29, 8], ['2022-23', 52, 9], ['2023-24', 38, 7], ['2024-25', 34, 5], ['2025-26', 38, 9]],
  'Mbappé': [['2016-17', 26, 14], ['2017-18', 21, 17], ['2018-19', 39, 18], ['2019-20', 30, 18], ['2020-21', 42, 11], ['2021-22', 39, 26], ['2022-23', 41, 10], ['2023-24', 44, 10], ['2024-25', 44, 5], ['2025-26', 42, 7]],
  'Agüero': [['2005-06', 18, 0], ['2007-08', 27, 13], ['2008-09', 21, 15], ['2009-10', 19, 12], ['2010-11', 27, 7], ['2011-12', 30, 10], ['2012-13', 17, 3], ['2013-14', 28, 9], ['2014-15', 32, 9], ['2015-16', 29, 5], ['2016-17', 33, 7], ['2017-18', 30, 7], ['2018-19', 32, 10], ['2019-20', 23, 4]],
  'Salah': [['2011-12', 7, 3], ['2012-13', 10, 10], ['2013-14', 12, 5], ['2014-15', 9, 6], ['2015-16', 15, 7], ['2016-17', 19, 14], ['2017-18', 44, 16], ['2018-19', 27, 10], ['2019-20', 23, 13], ['2020-21', 31, 6], ['2021-22', 31, 15], ['2022-23', 30, 16], ['2023-24', 25, 14], ['2024-25', 34, 23], ['2025-26', 12, 10]],
  'Neymar': [['2009', 14, 9], ['2010', 42, 23], ['2011', 24, 10], ['2012', 43, 17], ['2013', 13, 8], ['2013-14', 15, 15], ['2014-15', 39, 10], ['2015-16', 31, 25], ['2016-17', 20, 26], ['2017-18', 28, 17], ['2018-19', 23, 13], ['2019-20', 19, 13], ['2020-21', 17, 12], ['2021-22', 13, 8], ['2022-23', 18, 17], ['2025', 11, 4]],
  'Ronaldinho': [['1999', 6, 5], ['2000', 17, 3], ['2001-02', 13, 7], ['2002-03', 12, 12], ['2003-04', 22, 12], ['2004-05', 13, 17], ['2005-06', 26, 24], ['2006-07', 24, 14], ['2007-08', 9, 4], ['2008-09', 10, 6], ['2009-10', 15, 17], ['2011', 21, 10], ['2012', 16, 22], ['2013', 17, 13], ['2014-15', 8, 8]],
  'Kaká': [['2001', 13, 7], ['2002', 15, 10], ['2003-04', 14, 6], ['2004-05', 9, 19], ['2005-06', 19, 11], ['2006-07', 18, 11], ['2007-08', 19, 15], ['2008-09', 16, 12], ['2009-10', 9, 12], ['2010-11', 7, 6], ['2011-12', 8, 16], ['2012-13', 5, 5], ['2013-14', 9, 7], ['2015', 10, 6], ['2016', 9, 9], ['2017', 6, 4]],
  'Thomas Müller': [['2009-10', 19, 16], ['2010-11', 19, 19], ['2011-12', 11, 20], ['2012-13', 23, 17], ['2013-14', 26, 14], ['2014-15', 21, 18], ['2015-16', 32, 13], ['2016-17', 9, 18], ['2017-18', 15, 18], ['2018-19', 9, 16], ['2019-20', 14, 26], ['2020-21', 15, 24], ['2021-22', 13, 25], ['2022-23', 8, 12], ['2023-24', 7, 12], ['2024-25', 8, 8], ['2025', 9, 5]],
  'De Bruyne': [['2010-11', 6, 17], ['2011-12', 8, 15], ['2012-13', 10, 10], ['2013-14', 3, 8], ['2014-15', 16, 28], ['2015-16', 17, 15], ['2016-17', 7, 20], ['2017-18', 12, 21], ['2018-19', 6, 11], ['2019-20', 16, 22], ['2020-21', 10, 18], ['2021-22', 19, 15], ['2022-23', 10, 31], ['2023-24', 6, 18], ['2024-25', 6, 8]],
  'Özil': [['2008-09', 5, 22], ['2009-10', 10, 29], ['2010-11', 10, 29], ['2011-12', 7, 27], ['2012-13', 10, 25], ['2013-14', 7, 14], ['2014-15', 5, 8], ['2015-16', 8, 20], ['2016-17', 12, 15], ['2017-18', 5, 14], ['2021-22', 9, 2]],
  'Hazard': [['2008-09', 6, 4], ['2009-10', 10, 13], ['2010-11', 12, 14], ['2011-12', 22, 22], ['2012-13', 13, 22], ['2013-14', 17, 8], ['2014-15', 19, 13], ['2015-16', 6, 8], ['2016-17', 17, 7], ['2017-18', 17, 13], ['2018-19', 21, 17]],
  'Griezmann': [['2010-11', 7, 4], ['2011-12', 8, 4], ['2012-13', 11, 5], ['2013-14', 20, 5], ['2014-15', 25, 6], ['2015-16', 32, 7], ['2016-17', 26, 12], ['2017-18', 29, 15], ['2018-19', 21, 10], ['2019-20', 15, 4], ['2020-21', 20, 13], ['2021-22', 8, 7], ['2022-23', 16, 19], ['2023-24', 24, 8], ['2024-25', 17, 9], ['2025-26', 14, 8]],
  'Rooney': [['2003-04', 9, 4], ['2004-05', 17, 7], ['2005-06', 19, 12], ['2006-07', 23, 15], ['2007-08', 18, 13], ['2008-09', 20, 13], ['2009-10', 34, 6], ['2010-11', 16, 14], ['2011-12', 34, 8], ['2012-13', 16, 14], ['2013-14', 19, 20], ['2014-15', 14, 6], ['2015-16', 15, 5], ['2016-17', 8, 10], ['2017-18', 11, 3], ['2018', 12, 6], ['2019', 13, 8]],
  'Eto’o': [['2000-01', 13, 2], ['2001-02', 10, 7], ['2002-03', 19, 2], ['2003-04', 22, 7], ['2004-05', 29, 7], ['2005-06', 34, 10], ['2006-07', 13, 11], ['2007-08', 18, 3], ['2008-09', 36, 7], ['2009-10', 16, 8], ['2010-11', 37, 15], ['2011-12', 13, 6], ['2012-13', 21, 10], ['2013-14', 14, 4], ['2014-15', 6, 4], ['2015-16', 20, 6], ['2016-17', 18, 5], ['2017-18', 12, 5]],
  'Shevchenko': [['1995-96', 19, 4, 1], ['1997-98', 33, 7, 1], ['1998-99', 33, 8, 1], ['1999-00', 29, 8], ['2000-01', 34, 5], ['2001-02', 17, 5], ['2002-03', 10, 2], ['2003-04', 29, 4], ['2004-05', 26, 8], ['2005-06', 28, 10], ['2006-07', 14, 12], ['2009-10', 8, 7], ['2010-11', 16, 7]],
  'Van Basten': [['1982-83', 10, 1, 1], ['1983-84', 31, 6, 1], ['1984-85', 27, 20, 1], ['1985-86', 39, 4, 1], ['1986-87', 44, 10, 1], ['1987-88', 8, 3, 1], ['1988-89', 33, 13, 1], ['1989-90', 24, 5, 1], ['1990-91', 11, 9, 1], ['1991-92', 29, 10, 1], ['1992-93', 20, 5, 1]],
  'Ronaldo Nazário': [['1993', 20, 4, 1], ['1994-95', 35, 1, 1], ['1995-96', 19, 6, 1], ['1996-97', 47, 13, 1], ['1997-98', 34, 4, 1], ['1998-99', 15, 4, 1], ['2001-02', 7, 3], ['2002-03', 30, 8], ['2003-04', 31, 12], ['2004-05', 24, 11], ['2005-06', 15, 3], ['2006-07', 11, 5], ['2009', 23, 6], ['2010', 12, 3]],
  'Raúl': [['1994-95', 10, 6, 1], ['1995-96', 26, 9, 1], ['1996-97', 22, 16, 1], ['1997-98', 15, 4, 1], ['1998-99', 29, 7, 1], ['1999-00', 29, 13], ['2000-01', 32, 8], ['2001-02', 29, 13], ['2002-03', 25, 19], ['2003-04', 20, 6], ['2004-05', 13, 7], ['2005-06', 7, 6], ['2006-07', 12, 4], ['2007-08', 23, 8], ['2008-09', 24, 8], ['2009-10', 7, 3], ['2010-11', 19, 10], ['2011-12', 21, 11], ['2015', 9, 3]],
  'Gerd Müller': [['1964-65', 41, 0, 1], ['1965-66', 15, 4, 1], ['1966-67', 43, 5, 1], ['1967-68', 31, 8, 1], ['1968-69', 37, 5, 1], ['1969-70', 42, 9, 1], ['1970-71', 39, 13, 1], ['1971-72', 50, 20, 1], ['1972-73', 66, 9, 1], ['1973-74', 43, 9, 1], ['1974-75', 30, 14, 1], ['1975-76', 35, 1, 1], ['1976-77', 48, 4, 1], ['1977-78', 32, 7, 1], ['1978-79', 18, 0, 1]],
  'Zidane': [['1992-93', 11, 0, 1], ['1993-94', 8, 6, 1], ['1994-95', 8, 7, 1], ['1995-96', 12, 11, 1], ['1996-97', 7, 11, 1], ['1997-98', 11, 16, 1], ['2000-01', 6, 16], ['2001-02', 12, 15], ['2002-03', 12, 19], ['2003-04', 10, 14], ['2004-05', 6, 8], ['2005-06', 9, 11]],
  'Cruyff': [['1965-66', 25, 8, 1], ['1966-67', 41, 29, 1], ['1967-68', 32, 25, 1], ['1968-69', 34, 23, 1], ['1969-70', 33, 34, 1], ['1970-71', 27, 15, 1], ['1971-72', 33, 26, 1], ['1972-73', 22, 22, 1], ['1973-74', 19, 20, 1], ['1974-75', 7, 8, 1], ['1976-77', 18, 0, 1], ['1977-78', 11, 3, 1], ['1981-82', 7, 9, 1], ['1982-83', 9, 13, 1], ['1983-84', 13, 20, 1]],
  'Totti': [['1994-95', 7, 6, 1], ['1995-96', 4, 10, 1], ['1996-97', 5, 6, 1], ['1997-98', 14, 8, 1], ['1998-99', 16, 14, 1], ['1999-00', 8, 12], ['2000-01', 16, 4], ['2001-02', 12, 6], ['2002-03', 20, 9], ['2003-04', 20, 7], ['2004-05', 15, 13], ['2005-06', 17, 10], ['2006-07', 32, 16], ['2007-08', 18, 6], ['2008-09', 15, 5], ['2009-10', 25, 8], ['2010-11', 17, 12], ['2011-12', 8, 11], ['2012-13', 12, 13], ['2013-14', 8, 11], ['2014-15', 10, 7], ['2016-17', 3, 8]],
  'Bergkamp': [['1987-88', 6, 6, 1], ['1988-89', 16, 5, 1], ['1989-90', 9, 1, 1], ['1990-91', 26, 2, 1], ['1991-92', 30, 3, 1], ['1992-93', 33, 5, 1], ['1993-94', 18, 7, 1], ['1995-96', 16, 10, 1], ['1996-97', 14, 11, 1], ['1997-98', 22, 14, 1], ['1998-99', 16, 13, 1], ['1999-00', 10, 10], ['2000-01', 5, 6], ['2001-02', 14, 16], ['2002-03', 7, 11], ['2003-04', 5, 9], ['2004-05', 8, 13]],
};
const ALL_SEASONS = Object.entries(SEASON_ROWS).flatMap(([p, rows]) => rows.map(([s, g, a, f]) => ({ p, s, g, a, f, ga: g + a })));

class MsSeasonCluster extends Figure {
  build() {
    const svg = this.svgRoot(600, 380, `Goals against assists for every club season of ${Object.keys(SEASON_ROWS).length} great players, with Messi’s seasons in green`);
    const tip = tooltip(svg), c = { xmax: 80, ymax: 36, xt: [0, 20, 40, 60, 80], yt: [0, 10, 20, 30], iso: [40, 60, 80, 100], fmt: String, xl: 'goals in the season →', yl: '↑ assists in the season' };
    const x0 = 56, x1 = 580, y0 = 340, y1 = 40, X = (v) => x0 + (v / c.xmax) * (x1 - x0), Y = (v) => y0 - (v / c.ymax) * (y0 - y1);
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: `EVERY CLUB SEASON OF ${Object.keys(SEASON_ROWS).length} GREATS` }, svg);
    frame(svg, c, X, Y, x0, x1, y0, y1);
    const pts = [...ALL_SEASONS].sort((u, v) => (u.p === 'Messi') - (v.p === 'Messi'));
    this.dots = pts.map((q) => {
      const me = q.p === 'Messi';
      const d = S('circle', { r: me ? 5.5 : 3.4, class: me ? 'f-green' : q.f ? 'f-none s-ink3' : 'f-ink3', 'stroke-width': 1.2, opacity: me ? 1 : 0.55 }, svg);
      return { d, q };
    });
    // name the extremes: Messi's three best seasons and the best season of each other 80+ player
    const best = (p) => ALL_SEASONS.filter((q) => q.p === p).sort((u, v) => v.ga - u.ga);
    const labels = [...best('Messi').slice(0, 3), best('Cristiano Ronaldo')[0], best('Suárez')[0], best('Gerd Müller')[0]];
    this.labs = labels.map((q) => ({ q, t: S('text', { class: q.p === 'Messi' ? 't' : 't2', 'font-size': 10.5, text: `${q.p === 'Messi' ? '' : q.p + ' '}${q.s}` }, svg) }));
    pts.forEach((q) => hit(svg, tip, X(q.g), Y(q.a), `${q.p} · ${q.s}`, `${q.g} goals + ${q.a} assists = ${q.ga}`));
    this.idleText = 'hover a dot';
    entrance(this, (k) => {
      this.dots.forEach(({ d, q }) => attr(d, { cx: X(q.g * k), cy: Y(q.a * k) }));
      this.labs.forEach(({ q, t }, i) => {
        // Messi's labels to the right; the others to the left, Suárez above and Ronaldo below so they don't overlap
        const me = q.p === 'Messi', dy = me ? 4 : [0, 0, 0, 14, -8, 4][i];
        attr(t, { x: X(q.g) + (me ? 8 : -8), y: Y(q.a) + dy, 'text-anchor': me ? 'start' : 'end' }); op(t, seg(k, 0.8, 1));
      });
    }, 1400);
  }
}

class MsSeasons extends Figure {
  build() {
    // the 16 players with the highest single season, each season with 20+ goals and assists
    const players = Object.keys(SEASON_ROWS).map((p) => {
      const rows = ALL_SEASONS.filter((q) => q.p === p && q.ga >= 20).sort((u, v) => v.ga - u.ga);
      return { p, rows, floor: rows.some((q) => q.f) };
    }).sort((u, v) => v.rows[0].ga - u.rows[0].ga).slice(0, 16);
    const rh = 22, top = 52, yb = top + players.length * rh;
    const svg = this.svgRoot(600, yb + 40, 'Goals plus assists in every club season of the 16 players with the highest single season, with Messi’s seasons in green');
    const tip = tooltip(svg), x0 = 150, x1 = 560, lo = 20, hi = 110, X = (v) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'GOALS + ASSISTS IN EACH CLUB SEASON' }, svg);
    [20, 40, 60, 80, 100].forEach((v) => {
      S('line', { x1: X(v), x2: X(v), y1: top - 10, y2: yb, class: 's-rule', 'stroke-width': v === 80 ? 1 : 0.5 }, svg);
      S('text', { x: X(v), y: yb + 16, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: v }, svg);
    });
    const other = Math.max(...players.filter((u) => u.p !== 'Messi').map((u) => u.rows[0].ga));
    S('line', { x1: X(other), x2: X(other), y1: top - 14, y2: yb, class: 's-ink2', 'stroke-width': 1, 'stroke-dasharray': '4 3' }, svg);
    S('text', { x: X(other) - 6, y: top - 16, class: 't2', 'font-size': 10.5, 'text-anchor': 'end', text: `best season by anyone else: ${other}` }, svg);
    this.dots = [];
    players.forEach(({ p, rows, floor }, i) => {
      const y = top + i * rh + rh / 2, me = p === 'Messi';
      S('text', { x: x0 - 12, y: y + 4, class: me ? 't' : 't2', 'font-size': 11.5, 'text-anchor': 'end', text: p + (floor ? ' *' : '') }, svg);
      rows.forEach((q) => {
        this.dots.push({ c: S('circle', { cy: y, r: me ? 5 : 3.6, class: me ? 'f-green' : floor ? 'f-panel s-ink3' : 'f-ink3', 'stroke-width': 1.3, opacity: me ? 1 : 0.8 }, svg), v: q.ga });
        hit(svg, tip, X(q.ga), y, `${p} · ${q.s}`, `${q.g} goals + ${q.a} assists = ${q.ga}`);
      });
      S('text', { x: X(rows[0].ga) + 9, y: y + 4, class: me ? 't' : 't3', 'font-size': 10.5, text: rows[0].ga }, svg);
    });
    S('text', { x: 20, y: yb + 34, class: 't3', 'font-size': 10.5, text: '* mostly before 1999, assists incomplete' }, svg);
    this.idleText = 'hover a dot';
    entrance(this, (k) => this.dots.forEach((d) => attr(d.c, { cx: X(lo + (d.v - lo) * k) })), 1300);
  }
}

// ── finishing · goals against expected goals ───────────────────────────────
// KU Leuven DTAI (2020): 16 La Liga seasons, 2,162 shots, 339.59 xG, 444 goals.
// Ryan O'Hanlon (No Grass in the Clouds, 2020): domestic league goals minus xG since 2008, the top two.
class MsFinish extends Figure {
  build() {
    const svg = this.svgRoot(600, 270, 'Messi’s La Liga goals against expected goals, and goals above expected compared with the next best player');
    const x0 = 160, W = 380, X = (v) => (v / 450) * W, X2 = (v) => (v / 115) * W;
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'LA LIGA, 16 SEASONS, 2,162 SHOTS' }, svg);
    const rows = [['expected goals', 339.59, 'f-rule2'], ['goals scored', 444, 'f-green']].map(([n, v, cls], i) => {
      const y = 38 + i * 30;
      S('text', { x: x0 - 10, y: y + 13, class: 't', 'font-size': 12.5, 'text-anchor': 'end', text: n }, svg);
      return { r: bar(svg, cls, { x: x0, y, height: 18 }), t: S('text', { y: y + 13, class: 't2', 'font-size': 12 }, svg), v };
    });
    this.gap = S('text', { x: x0 + X(444), y: 114, class: 'hand', 'font-size': 15, 'text-anchor': 'end', text: `+${Math.round(444 - 339.59)} above the model` }, svg);
    S('text', { x: 20, y: 160, class: 'sl', 'font-size': 11, text: 'LEAGUE GOALS ABOVE EXPECTED SINCE 2008, TOP TWO' }, svg);
    const rows2 = [['Messi', 108.58, 'f-green'], ['Higuaín', 58.11, 'f-rule2']].map(([n, v, cls], i) => {
      const y = 176 + i * 30;
      S('text', { x: x0 - 10, y: y + 13, class: 't', 'font-size': 12.5, 'text-anchor': 'end', text: n }, svg);
      return { r: bar(svg, cls, { x: x0, y, height: 18 }), t: S('text', { y: y + 13, class: 't2', 'font-size': 12 }, svg), v };
    });
    entrance(this, (k) => {
      rows.forEach((r) => { attr(r.r, { width: X(r.v * k) }); attr(r.t, { x: x0 + X(r.v * k) + 8 }); r.t.textContent = (r.v * k).toFixed(r.v % 1 ? 1 : 0); });
      rows2.forEach((r) => { attr(r.r, { width: X2(r.v * k) }); attr(r.t, { x: x0 + X2(r.v * k) + 8 }); r.t.textContent = '+' + (r.v * k).toFixed(1); });
      op(this.gap, seg(k, 0.8, 1));
    }, 1300);
  }
}


// ── fig 2 · ten years at 1.42 ──────────────────────────────────────────────
// La Liga 2010-11 to 2019-20, non-penalty G+A per 90 (Ryan O'Hanlon, No Grass in the Clouds, Nov 2020)
const DECADE = [['Messi, 10-year average', 1.42, 1], ['Mbappé', 1.24], ['Cristiano Ronaldo', 1.13], ['Sancho', 1.06], ['Suárez', 1.06]];
const SIX = ['Higuaín 2011-12', 'Ronaldo 2014-15', 'Ibrahimović 2015-16', 'Suárez 2015-16', 'Bale 2015-16', 'Mbappé 2018-19'];
class MsDecade extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Messi’s ten-year average of non-penalty goals plus assists per 90 against the best of his era');
    const x0 = 190, W = 330, X = (v) => (v / 1.5) * W;
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'NON-PENALTY GOALS + ASSISTS PER 90' }, svg);
    const grow = hbars(svg, DECADE, x0, X, (v) => v.toFixed(2), 44);
    S('text', { x: 20, y: 214, class: 'sl', 'font-size': 11, text: 'THE ONLY SEASONS BY ANYONE ELSE SINCE 2010 THAT MATCHED IT' }, svg);
    this.six = SIX.map((s, i) => S('text', { x: 20 + (i % 3) * 190, y: 240 + Math.floor(i / 3) * 22, class: 't', 'font-size': 12.5, text: s }, svg));
    S('text', { x: 20, y: 292, class: 't3', 'font-size': 11, text: 'six seasons by six players; none of them did it twice' }, svg);
    entrance(this, (k) => {
      grow(k);
      this.six.forEach((t, i) => op(t, seg(k, 0.4 + i * 0.08, 0.55 + i * 0.08)));
    }, 1300);
  }
}

// ── fig 3 · completed dribbles, 2006-07 to Oct 2023 ────────────────────────
// Europe's top five leagues (OptaJoe, 23 Oct 2023)
const DRIB = [['Lionel Messi', 2358], ['Eden Hazard', 1285], ['Franck Ribéry', 1061], ['Neymar', 984], ['Wilfried Zaha', 972], ['Cristiano Ronaldo', 937]];
class MsDribbles extends Figure {
  build() {
    const svg = this.svgRoot(600, 236, 'Most completed dribbles in Europe’s top five leagues since 2006-07');
    const x0 = 150, W = 380, X = (v) => (v / DRIB[0][1]) * W * 0.98, gap = DRIB[0][1] - DRIB[1][1];
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'COMPLETED DRIBBLES, TOP FIVE LEAGUES, 2006-07 TO 2023' }, svg);
    const grow = hbars(svg, DRIB.map(([n, v], i) => [n, v, !i]), x0, X, (v) => Math.round(v).toLocaleString('en'));
    const second = x0 + X(DRIB[1][1]);
    this.gap = S('text', { x: second + 60, y: 230, class: 'hand', 'font-size': 16, text: `+${gap.toLocaleString('en')} on second place` }, svg);
    this.arrow = S('path', { d: handArrow(second + 56, 222, second + (x0 + X(DRIB[0][1]) - second) / 2, 60, -0.15), class: 'f-none s-green', 'stroke-width': 1.6 }, svg);
    entrance(this, (k) => {
      grow(k);
      op(this.gap, seg(k, 0.8, 1)); op(this.arrow, seg(k, 0.8, 1));
    }, 1300);
  }
}

// ── free kicks · the all-time list ────────────────────────────────────────
// Direct free-kick goals in official top-division and international games, MessiVsRonaldo.app's
// all-time table (7 Oct 2026); the same top six appear in El Gráfico's reconstruction.
const FK = [['Marcelinho Carioca', 78], ['Lionel Messi', 76], ['Jair Rosa Pinto', 74], ['Roberto Dinamite', 73], ['Siniša Mihajlović', 72],
  ['Juninho Pernambucano', 72], ['Marcos Assunção', 68], ['Jorge Aravena', 65], ['Cristiano Ronaldo', 64], ['Zico', 62], ['Ronaldinho', 59], ['Maradona', 59], ['Beckham', 53]];
class MsFreeKicks extends Figure {
  build() {
    const svg = this.svgRoot(600, FK.length * 26 + 50, 'The players with the most direct free-kick goals in history');
    const x0 = 190, X = (v) => (v / 80) * 340;
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'DIRECT FREE-KICK GOALS, ALL TIME' }, svg);
    const rows = FK.map(([n, v], i) => {
      const y = 38 + i * 26, me = n === 'Lionel Messi';
      S('text', { x: x0 - 10, y: y + 12, class: me ? 't' : 't2', 'font-size': 12, 'text-anchor': 'end', text: n }, svg);
      return { r: bar(svg, me ? 'f-green' : 'f-rule2', { x: x0, y, height: 16 }), t: S('text', { y: y + 12, class: me ? 't' : 't2', 'font-size': 12 }, svg), v };
    });
    entrance(this, (k) => rows.forEach((r) => { attr(r.r, { width: X(r.v * k) }); attr(r.t, { x: x0 + X(r.v * k) + 8 }); r.t.textContent = Math.round(r.v * k); }), 1200);
  }
}

// ── chances · big chances created ─────────────────────────────────────────
// Europe's top five leagues. Career: StatMuse (Opta), coverage is reliable from 2015-16.
// Single seasons since 2015-16: Sofascore, 27 May 2026.
const BCC = [['Messi', 258], ['De Bruyne', 229], ['Thomas Müller', 171], ['Salah', 164], ['Di María', 162], ['Bruno Fernandes', 155], ['Griezmann', 135], ['Neymar', 132]];
const BCC_SEASON = [['Messi 2015-16', 37], ['Messi 2019-20', 36], ['Messi 2018-19', 34], ['De Bruyne 2019-20', 33], ['Dimarco 2025-26', 33], ['B. Fernandes 2025-26', 33], ['Di María 2019-20', 32], ['Olise 2024-25', 32]];
class MsChances extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Most big chances created in Europe’s top five leagues, career totals and single seasons');
    const panel = (rows, x0, title, max) => {
      S('text', { x: x0 - 130, y: 22, class: 'sl', 'font-size': 11, text: title }, svg);
      return rows.map(([n, v], i) => {
        const y = 38 + i * 30, me = n.startsWith('Messi');
        S('text', { x: x0 - 8, y: y + 13, class: me ? 't' : 't2', 'font-size': 11.5, 'text-anchor': 'end', text: n }, svg);
        return { r: bar(svg, me ? 'f-green' : 'f-rule2', { x: x0, y, height: 18 }), t: S('text', { y: y + 13, class: me ? 't' : 't2', 'font-size': 11.5 }, svg), v, x0, W: 120 / max };
      });
    };
    const all = [...panel(BCC, 140, 'CAREER', 260), ...panel(BCC_SEASON, 445, 'BEST SEASONS SINCE 2015-16', 37)];
    entrance(this, (k) => all.forEach((r) => { attr(r.r, { width: r.v * r.W * k }); attr(r.t, { x: r.x0 + r.v * r.W * k + 6 }); r.t.textContent = Math.round(r.v * k); }), 1200);
  }
}

// ── fig 4 · who led Europe, season by season ───────────────────────────────
// Successful dribbles, top-20 player-seasons since 2009 (GiveMeSport, Jul 2022, crediting
// @ThePopFoot; probably league plus Champions League). A season whose leader is not in the
// top 20 had nobody above 160, so those values are drawn as "under 160".
// [season, leader (null = not published), leader's total, Messi's total, Messi's place (null = unknown)].
// Messi's totals where he isn't in the top 20 come from MessiVsRonaldo.app, which counts the
// same league plus Champions League games (its 266, 265, 239 and 188 match the list).
const SEASONS = [
  ['09-10', 'Messi', 202, 202, 1], ['10-11', 'Messi', 265, 265, 1], ['11-12', 'Messi', 220, 220, 1], ['12-13', null, null, 143, null],
  ['13-14', 'Hazard', 174, 167, 2], ['14-15', 'Messi', 266, 266, 1], ['15-16', 'Neymar', 189, 151, null], ['16-17', 'Neymar', 218, 154, null],
  ['17-18', 'Messi', 222, 222, 1], ['18-19', 'Hazard', 170, 169, 2], ['19-20', 'Messi', 239, 239, 1], ['20-21', 'Messi', 188, 188, 1],
];
const STEP = 1.1;
class MsLeaders extends Figure {
  constructor() { super(); this.duration = SEASONS.length * STEP + 1.5; }
  build() {
    const svg = this.svgRoot(600, 348, 'Leader in successful dribbles in Europe’s top five leagues each season from 2009-10 to 2020-21, with Messi’s total');
    const x0 = 40, y0 = 262, cw = 540 / SEASONS.length, Y = (v) => y0 - (v / 300) * 200;
    this.Y = Y;
    [100, 200].forEach((v) => {
      S('line', { x1: x0, x2: x0 + 540, y1: Y(v), y2: Y(v), class: 's-rule', 'stroke-width': 0.6 }, svg);
      S('text', { x: x0 - 6, y: Y(v) + 4, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: v }, svg);
    });
    S('line', { x1: x0, x2: x0 + 540, y1: Y(160), y2: Y(160), class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
        // the MSN years
    const nx = x0 + 6 * cw;
    S('rect', { x: nx, y: 50, width: cw * 2, height: y0 - 50, class: 'f-ochre', opacity: 0.08 }, svg);
    this.msn = S('text', { x: nx + cw, y: 44, class: 'hand', 'font-size': 15, 'text-anchor': 'middle', text: 'Neymar’s years' }, svg);
    S('text', { x: x0, y: 22, class: 'sl', 'font-size': 11, text: 'MOST SUCCESSFUL DRIBBLES IN EUROPE, EACH SEASON' }, svg);
    this.cols = SEASONS.map(([s, who, lead, me, rank], i) => {
      const x = x0 + i * cw + 6, w = cw - 12;
      S('text', { x: x + w / 2, y: y0 + 16, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: s }, svg);
      const g = S('g', {}, svg);
      const cls = who === 'Messi' ? 'f-green' : who === 'Neymar' ? 'f-ochre' : 'f-ink3';
      const r = who ? bar(g, cls) : bar(g, 'f-none s-ink3', { x, y: Y(160), width: w, height: y0 - Y(160), 'stroke-dasharray': '3 3' });
      const name = S('text', { x: x + w / 2, class: 't', 'font-size': 10.5, 'text-anchor': 'middle', text: who || '?' }, g);
      const val = S('text', { x: x + w / 2, class: 't2', 'font-size': 10.5, 'text-anchor': 'middle', text: lead || '' }, g);
      // Messi's own total when someone else led and it is known (not for the seasons he was under 160)
      const mine = who !== 'Messi' && S('line', { x1: x - 2, x2: x + w + 2, class: 's-green', 'stroke-width': 3 }, g);
      // where Messi wasn't first: his place, or "?" when no source gives it
      const place = who !== 'Messi' && S('text', { x: x + w / 2, y: Y(me) + 15, class: 't', 'font-size': 10, 'text-anchor': 'middle', text: rank ? `M #${rank}` : 'M ?' }, g);
      return { g, r, name, val, mine, place, x, w, who, lead, me };
    });
    this.foot = S('text', { x: x0, y: 306, class: 't2', 'font-size': 12 }, svg);
    S('line', { x1: x0, x2: x0 + 16, y1: 322, y2: 322, class: 's-green', 'stroke-width': 3 }, svg);
    S('text', { x: x0 + 22, y: 326, class: 't3', 'font-size': 11, text: 'Messi’s total when he wasn’t first, with his place (M #2, or M ? if unknown)' }, svg);
    S('line', { x1: x0, x2: x0 + 16, y1: 340, y2: 340, class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    S('text', { x: x0 + 22, y: 344, class: 't3', 'font-size': 11, text: '2012-13: the season’s leader isn’t in the list, so nobody passed 160' }, svg);
  }
  label(t) { const i = Math.min(SEASONS.length - 1, Math.floor(t / STEP)); return '20' + SEASONS[i][0]; }
  render(t) {
    let led = 0, shown = 0;
    this.cols.forEach((c, i) => {
      const k = inout(seg(t, i * STEP, i * STEP + 0.8));
      op(c.g, k > 0 ? 1 : 0);
      if (k >= 1) shown++;
      if (c.who) {
        const v = c.lead * k;
        attr(c.r, { x: c.x, width: c.w, y: this.Y(v), height: this.Y(0) - this.Y(v) });
        attr(c.name, { y: this.Y(v) - 18 }); attr(c.val, { y: this.Y(v) - 5 }); c.val.textContent = Math.round(v);
        if (c.who === 'Messi' && k >= 1) led++;
      } else attr(c.name, { y: this.Y(160) - 6 });
      if (c.mine) attr(c.mine, { y1: this.Y(c.me * k), y2: this.Y(c.me * k) });
      if (c.place) op(c.place, k >= 1 ? 1 : 0);
    });
    op(this.msn, seg(t, 7 * STEP, 7 * STEP + 0.6));
    this.foot.textContent = shown ? `Messi first in ${led} of ${shown} seasons` : '';
  }
}

// ── fig 5 · goals added in MLS ─────────────────────────────────────────────
// American Soccer Analysis goals added (g+) per 96 minutes, every MLS player-season
// 2013 to 2026 with at least 1,500 minutes (3,649 seasons, pulled 9 Oct 2026).
// Bins of 0.02 starting at -0.20; Messi's three seasons are taken out and drawn on their own.
const HIST = [1, 3, 5, 17, 47, 128, 213, 345, 527, 537, 527, 434, 307, 218, 126, 70, 53, 31, 22, 14, 6, 6, 3, 3, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const MARKS = [[0.501, 'Messi 2025', 1], [0.443, 'Messi 2026, so far', 1], [0.377, 'Messi 2024', 1], [0.338, 'Vela 2019'], [0.327, 'Ibrahimović 2019']];
class MsMls extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Distribution of goals added per 96 minutes for every MLS player-season since 2013, with Messi’s three seasons marked');
    const BIN = 0.02, lo = -0.2, hi = lo + HIST.length * BIN, top = Math.max(...HIST);
    const x0 = 30, W = 550, X = (v) => x0 + ((v - lo) / (hi - lo)) * W, y0 = 240, Y = (n) => y0 - Math.sqrt(n / top) * 170;
    S('text', { x: x0, y: 22, class: 'sl', 'font-size': 11, text: 'MLS PLAYER-SEASONS, GOALS ADDED PER 96 MINUTES' }, svg);
    S('line', { x1: x0, x2: x0 + W, y1: y0, y2: y0, class: 's-rule', 'stroke-width': 1 }, svg);
    [-0.2, 0, 0.2, 0.4].forEach((v) => S('text', { x: X(v), y: y0 + 16, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v.toFixed(1) }, svg));
    this.bins = HIST.map((n, i) => ({ r: bar(svg, 'f-ink3'), x: X(lo + i * BIN) + 0.5, w: W / HIST.length - 1, n }));
    this.marks = MARKS.map(([v, n, me], i) => {
      const g = S('g', {}, svg), x = X(v), top = 70 + i * 26;
      S('line', { x1: x, x2: x, y1: top + 4, y2: y0, class: me ? 's-green' : 's-ink3', 'stroke-width': me ? 2.4 : 1.2 }, g);
      S('circle', { cx: x, cy: y0, r: me ? 5 : 3.5, class: me ? 'f-green' : 'f-ink2' }, g);
      S('text', { x: x - 6, y: top, class: me ? 't' : 't2', 'font-size': 11.5, 'text-anchor': 'end', text: `${n} · ${v.toFixed(2)}` }, g);
      return g;
    });
    S('text', { x: x0, y: 286, class: 't3', 'font-size': 11, text: 'bar height uses a square-root scale so the tail stays visible; 0 = league average' }, svg);
    entrance(this, (k) => {
      this.bins.forEach((b) => attr(b.r, { x: b.x, width: b.w, y: Y(b.n * k), height: y0 - Y(b.n * k) }));
      this.marks.forEach((m, i) => op(m, seg(k, 0.5 + i * 0.08, 0.6 + i * 0.08)));
    }, 1400);
  }
}

// ── fig 6 · Messi and Ronaldo ──────────────────────────────────────────────
// Official senior matches; totals from MessiVsRonaldo.app (7 Oct 2026), Wikipedia for
// records. Free kicks are fan-site counts.
const VS = [
  ['goals', 932, 979], ['non-penalty goals', 817, 795], ['assists', 426, 261], ['goals per game', 0.79, 0.73], ['Ballon d’Or', 8, 5],
  ['Champions League goals', 129, 140], ['international goals', 126, 146], ['World Cup goals', 21, 10], ['direct free kicks', 76, 64],
];
class MsVs extends Figure {
  build() {
    const svg = this.svgRoot(600, 360, 'Messi and Cristiano Ronaldo compared on nine career measures');
    const cx = 300, W = 190;
    S('text', { x: cx - 10, y: 22, class: 't', 'font-size': 13, 'text-anchor': 'end', text: 'Messi' }, svg);
    S('text', { x: cx + 10, y: 22, class: 't', 'font-size': 13, text: 'Ronaldo' }, svg);
    this.rows = VS.map(([n, a, b], i) => {
      const y = 46 + i * 34, m = Math.max(a, b);
      S('text', { x: cx, y: y - 3, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: n }, svg);
      const ra = bar(svg, a >= b ? 'f-green' : 'f-rule2'), rb = bar(svg, b > a ? 'f-ink2' : 'f-rule2');
      const ta = S('text', { y: y + 15, class: 't', 'font-size': 12, 'text-anchor': 'end' }, svg), tb = S('text', { y: y + 15, class: 't', 'font-size': 12 }, svg);
      return { y, a, b, m, ra, rb, ta, tb };
    });
    entrance(this, (k) => this.rows.forEach((r) => {
      const wa = (r.a / r.m) * W * k, wb = (r.b / r.m) * W * k, f = (v) => (v < 1 ? v.toFixed(2) : Math.round(v)).toString();
      attr(r.ra, { x: 296 - wa, width: wa, y: r.y + 2, height: 16 }); attr(r.rb, { x: 304, width: wb, y: r.y + 2, height: 16 });
      attr(r.ta, { x: 290 - wa }); attr(r.tb, { x: 310 + wb });
      r.ta.textContent = k < 1 ? '' : f(r.a); r.tb.textContent = k < 1 ? '' : f(r.b);
    }), 1100);
  }
}

define({ 'ms-freekicks': MsFreeKicks, 'ms-chances': MsChances, 'ms-seasons': MsSeasons, 'ms-season-cluster': MsSeasonCluster, 'ms-finish': MsFinish, 'ms-cluster': MsCluster, 'ms-age': MsAge, 'ms-decade': MsDecade, 'ms-dribbles': MsDribbles, 'ms-leaders': MsLeaders, 'ms-mls': MsMls, 'ms-vs': MsVs });

// the pitch maps carry about 9 KB of shot and pass data, so they load as their own chunk
import('./messi-in-numbers-pitch.js');
