// Figures for "Messi in numbers".
// Sources are in each figure's caption; the research notes are in ~/workspace/blog/my-blog/reports.
import { S, attr, op, seg, inout, clamp, handArrow, Figure, define, entrance } from './core.js';

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

// ── clusters · scorers and creators ───────────────────────────────────────
// A scatter of goals against assists; Messi is the green dot. Hollow dots are players whose
// assist counts are a floor (40%+ of their games before 1999, when assist data is thin).
// Players with no assist data at all are drawn as ticks under the x axis.
class Scatter extends Figure {
  build() {
    const c = this.cfg, svg = this.svgRoot(600, c.noAssist ? 410 : 360, c.aria);
    const x0 = 56, x1 = 580, y0 = 330, y1 = 40;
    const X = (v) => x0 + (v / c.xmax) * (x1 - x0), Y = (v) => y0 - (v / c.ymax) * (y0 - y1);
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: c.title }, svg);
    // iso lines of goals + assists
    c.iso.forEach((s) => {
      const xa = Math.min(s, c.xmax), ya = s - xa, yb = Math.min(s, c.ymax), xb = s - yb;
      S('line', { x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb), class: 's-rule', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, svg);
      S('text', { x: X(xb) + 4, y: Y(yb) + 12, class: 't3', 'font-size': 10, text: `${s} together` }, svg);
    });
    S('line', { x1: x0, x2: x1, y1: y0, y2: y0, class: 's-rule', 'stroke-width': 1 }, svg);
    S('line', { x1: x0, x2: x0, y1: y0, y2: y1, class: 's-rule', 'stroke-width': 1 }, svg);
    c.xt.forEach((v) => S('text', { x: X(v), y: y0 + 15, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: v.toFixed(1) }, svg));
    c.yt.forEach((v) => S('text', { x: x0 - 6, y: Y(v) + 4, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: v.toFixed(1) }, svg));
    S('text', { x: x1, y: y0 - 6, class: 't2', 'font-size': 11, 'text-anchor': 'end', text: c.xl }, svg);
    S('text', { x: x0 + 4, y: y1 - 6, class: 't2', 'font-size': 11, text: c.yl }, svg);
    this.dots = c.rows.map(([n, g, a, floor]) => {
      const me = n === 'Messi', lab = me || c.label.includes(n);
      const grp = S('g', {}, svg);
      S('title', { text: `${n}: ${g.toFixed(2)} goals, ${a.toFixed(2)} assists` }, grp);
      const d = S('circle', { r: me ? 7 : 4, class: me ? 'f-green' : floor ? 'f-panel s-ink2' : 'f-ink3', 'stroke-width': 1.5 }, grp);
      const t = lab && S('text', { class: me ? 't' : 't2', 'font-size': me ? 13 : 10.5, text: n }, grp);
      return { grp, d, t, g, a, me, dx: (c.nudge[n] || [7, 4])[0], dy: (c.nudge[n] || [7, 4])[1] };
    });
    // goals-only players: a tick on a strip under the axis, names staggered on two rows
    (c.noAssist || []).forEach(([n, g], i) => {
      S('line', { x1: X(g), x2: X(g), y1: y0 + 24, y2: y0 + 32, class: 's-ink2', 'stroke-width': 2 }, svg);
      S('text', { x: X(g), y: y0 + 46 + (i % 2) * 14, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: n }, svg);
    });
    if (c.noAssist) S('text', { x: x0 - 6, y: y0 + 32, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: 'no assists:' }, svg);
    this.X = X; this.Y = Y;
    entrance(this, (k) => this.dots.forEach((p) => {
      const kk = p.me ? clamp((k - 0.6) / 0.4) : k;
      const x = this.X(p.g * k), y = this.Y(p.a * k);
      attr(p.d, { cx: x, cy: y }); op(p.grp, p.me ? kk : 1);
      if (p.t) attr(p.t, { x: x + p.dx, y: y + p.dy });
    }), 1500);
  }
}
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
class MsCluster extends Scatter {
  constructor() {
    super();
    this.cfg = {
      aria: 'Non-penalty goals per 90 against assists per 90 in Europe’s top five leagues for 33 great attackers and playmakers',
      title: 'TOP-FIVE LEAGUES, PER 90 MINUTES, WHOLE CAREER THERE', xmax: 0.95, ymax: 0.55, xt: [0, 0.2, 0.4, 0.6, 0.8], yt: [0, 0.2, 0.4],
      xl: 'non-penalty goals per 90 →', yl: '↑ assists per 90', iso: [0.5, 1.0], rows: PER90,
      label: ['Cristiano Ronaldo', 'Haaland', 'Mbappé', 'Neymar', 'De Bruyne', 'Özil', 'Thomas Müller', 'Zidane', 'Iniesta'],
      nudge: { Messi: [10, 5], Mbappé: [8, 4], Haaland: [8, 14], 'Cristiano Ronaldo': [8, -8], Zidane: [-46, 4], 'Thomas Müller': [7, -6] },
    };
  }
}
// whole club career, all competitions, per game: Transfermarkt (via a public API mirror)
// and Wikipedia for goals of players Transfermarkt barely covers
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
class MsCareer extends Scatter {
  constructor() {
    super();
    this.cfg = {
      aria: 'Club goals per game against assists per game over whole careers for 38 great players, with five more shown on goals only',
      title: 'WHOLE CLUB CAREER, PER GAME', xmax: 1.05, ymax: 0.5, xt: [0, 0.2, 0.4, 0.6, 0.8, 1.0], yt: [0, 0.2, 0.4],
      xl: 'goals per game →', yl: '↑ assists per game', iso: [0.5, 1.0], rows: CAREER, noAssist: NO_ASSISTS,
      label: ['Cristiano Ronaldo', 'Gerd Müller', 'Haaland', 'Mbappé', 'Cruyff', 'Neymar', 'De Bruyne', 'Özil', 'Thomas Müller', 'Zidane'],
      nudge: { Messi: [10, 5], Cruyff: [-44, -6], 'Gerd Müller': [-34, -8], Haaland: [8, 14], Mbappé: [8, 4], 'Cristiano Ronaldo': [8, -8], Zidane: [7, 8] },
    };
  }
}

// ── fig 2 · ten years at 1.42 ──────────────────────────────────────────────
// La Liga 2010-11 to 2019-20, non-penalty G+A per 90 (Ryan O'Hanlon, ESPN, Nov 2020)
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

// ── best seasons · every season of 16 greats ──────────────────────────────
// Goals + assists per club season, all competitions, seasons with 20 or more. Transfermarkt
// via a public API mirror, read 9 Oct 2026; finished seasons only. Rows marked * played mostly
// before 1999, when assists were thinly recorded, so their totals are a floor.
const SEASONS_GA = [
  ['Messi', 0, [105, 89, 80, 77, 74, 73, 69, 65, 65, 59, 58, 57, 55, 52, 41, 36, 32, 26, 20]],
  ['Cristiano Ronaldo', 0, [84, 75, 71, 68, 68, 66, 57, 54, 52, 51, 46, 44, 43, 42, 41, 39, 38, 35, 27, 21, 20]],
  ['Suárez', 0, [83, 73, 56, 51, 48, 47, 46, 46, 38, 37, 37, 36, 34, 33, 30, 25, 24, 23]],
  ['Gerd Müller', 1, [75, 70, 52, 52, 52, 51, 48, 44, 42, 41, 39, 39, 36]],
  ['Ibrahimović', 0, [70, 58, 52, 46, 40, 39, 38, 38, 35, 34, 32, 31, 29, 24, 24, 23, 20]],
  ['Cruyff', 1, [70, 67, 59, 57, 57, 44, 42, 39, 33, 33, 22]],
  ['Kane', 0, [68, 56, 55, 50, 46, 42, 38, 37, 37, 30, 30, 26]],
  ['Lewandowski', 0, [65, 57, 57, 53, 52, 49, 49, 46, 45, 42, 41, 41, 38, 35, 31, 29, 23, 22]],
  ['Neymar', 0, [65, 60, 56, 49, 46, 45, 36, 35, 34, 32, 30, 29, 23, 21, 21]],
  ['Mbappé', 0, [65, 57, 54, 53, 51, 49, 49, 48, 40, 38]],
  ['Haaland', 0, [61, 54, 53, 47, 45, 39, 37]],
  ['Ronaldo Nazário', 1, [60, 43, 38, 38, 36, 35, 29, 25, 24]],
  ['Salah', 0, [60, 57, 46, 46, 39, 37, 37, 36, 33, 22, 22, 20]],
  ['Benzema', 0, [59, 48, 41, 40, 40, 40, 39, 38, 37, 37, 36, 34, 33, 30, 28, 27, 22, 21]],
  ['Henry', 0, [57, 56, 49, 41, 41, 38, 38, 33, 31, 27, 25]],
  ['Van Basten', 1, [54, 47, 46, 43, 39, 37, 29, 25, 20]],
];
class MsSeasons extends Figure {
  build() {
    const rows = SEASONS_GA, rh = 22, top = 52;
    const svg = this.svgRoot(600, top + rows.length * rh + 40, 'Goals plus assists in every club season of 16 great players, with Messi’s seasons in green');
    const x0 = 150, x1 = 560, lo = 20, hi = 110, X = (v) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
    const yb = top + rows.length * rh;
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'GOALS + ASSISTS IN EACH CLUB SEASON' }, svg);
    [20, 40, 60, 80, 100].forEach((v) => {
      S('line', { x1: X(v), x2: X(v), y1: top - 10, y2: yb, class: 's-rule', 'stroke-width': v === 80 ? 1 : 0.5 }, svg);
      S('text', { x: X(v), y: yb + 16, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: v }, svg);
    });
    // the best season anyone else had
    const other = Math.max(...rows.slice(1).map((r) => r[2][0]));
    S('line', { x1: X(other), x2: X(other), y1: top - 14, y2: yb, class: 's-ink2', 'stroke-width': 1, 'stroke-dasharray': '4 3' }, svg);
    S('text', { x: X(other) - 6, y: top - 16, class: 't2', 'font-size': 10.5, 'text-anchor': 'end', text: `best season by anyone else: ${other}` }, svg);
    this.dots = [];
    rows.forEach(([n, floor, vals], i) => {
      const y = top + i * rh + rh / 2, me = i === 0;
      S('text', { x: x0 - 12, y: y + 4, class: me ? 't' : 't2', 'font-size': 11.5, 'text-anchor': 'end', text: n + (floor ? ' *' : '') }, svg);
      vals.forEach((v) => this.dots.push({ c: S('circle', { cy: y, r: me ? 5 : 3.6, class: me ? 'f-green' : floor ? 'f-panel s-ink3' : 'f-ink3', 'stroke-width': 1.3, opacity: me ? 1 : 0.8 }, svg), v }));
      S('text', { x: X(vals[0]) + 9, y: y + 4, class: me ? 't' : 't3', 'font-size': 10.5, text: vals[0] }, svg);
    });
    S('text', { x: 20, y: yb + 34, class: 't3', 'font-size': 10.5, text: '* mostly before 1999, assists incomplete' }, svg);
    entrance(this, (k) => this.dots.forEach((d) => attr(d.c, { cx: X(lo + (d.v - lo) * k) })), 1300);
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
  ['Champions League goals', 129, 140], ['international goals', 126, 146], ['World Cup goals', 21, 10], ['direct free kicks', 76, 65],
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

define({ 'ms-seasons': MsSeasons, 'ms-cluster': MsCluster, 'ms-career': MsCareer, 'ms-age': MsAge, 'ms-decade': MsDecade, 'ms-dribbles': MsDribbles, 'ms-leaders': MsLeaders, 'ms-mls': MsMls, 'ms-vs': MsVs });
