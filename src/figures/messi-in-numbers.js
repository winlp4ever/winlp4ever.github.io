// Figures for "Messi in numbers".
// Sources are in each figure's caption; the research notes are in ~/workspace/blog/my-blog/reports.
import { S, H, attr, op, seg, inout, lerp, clamp, handArrow, Figure, define, entrance } from './core.js';

const bar = (parent, cls) => S('rect', { rx: 2, class: cls }, parent);

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
    S('text', { x: 350, y: 41, class: 't2', 'font-size': 11, text: 'median forward at his best age: 0.43' }, svg);
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

// ── fig 2 · ten years at 1.42 ──────────────────────────────────────────────
// La Liga 2010-11 to 2019-20, non-penalty G+A per 90 (Ryan O'Hanlon, ESPN, Nov 2020)
const DECADE = [['Messi, 10-year average', 1.42, 1], ['Mbappé', 1.24], ['Cristiano Ronaldo', 1.13], ['Sancho', 1.06], ['Suárez', 1.06]];
const SIX = ['Higuaín 2011-12', 'Ronaldo 2014-15', 'Ibrahimović 2015-16', 'Suárez 2015-16', 'Bale 2015-16', 'Mbappé 2018-19'];
class MsDecade extends Figure {
  build() {
    const svg = this.svgRoot(600, 300, 'Messi’s ten-year average of non-penalty goals plus assists per 90 against the best of his era');
    const x0 = 190, W = 330, X = (v) => (v / 1.5) * W;
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'NON-PENALTY GOALS + ASSISTS PER 90' }, svg);
    this.rows = DECADE.map(([n, v, me], i) => {
      const y = 44 + i * 30;
      S('text', { x: x0 - 10, y: y + 13, class: 't', 'font-size': 12.5, 'text-anchor': 'end', text: n }, svg);
      return { r: S('rect', { x: x0, y, height: 18, rx: 2, class: me ? 'f-green' : 'f-rule2' }, svg), t: S('text', { y: y + 13, class: 't2', 'font-size': 12 }, svg), v };
    });
    S('text', { x: 20, y: 214, class: 'sl', 'font-size': 11, text: 'THE ONLY SINGLE SEASONS SINCE 2010 THAT MATCHED HIS AVERAGE' }, svg);
    this.six = SIX.map((s, i) => S('text', { x: 20 + (i % 3) * 190, y: 240 + Math.floor(i / 3) * 22, class: 't', 'font-size': 12.5, text: s }, svg));
    S('text', { x: 20, y: 292, class: 't3', 'font-size': 11, text: 'six seasons by six players; none of them did it twice' }, svg);
    entrance(this, (k) => {
      this.rows.forEach((r) => { attr(r.r, { width: X(r.v * k) }); attr(r.t, { x: x0 + X(r.v * k) + 8 }); r.t.textContent = (r.v * k).toFixed(2); });
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
    const x0 = 150, W = 380, X = (v) => (v / 2400) * W;
    S('text', { x: 20, y: 22, class: 'sl', 'font-size': 11, text: 'COMPLETED DRIBBLES, TOP FIVE LEAGUES, 2006-07 TO 2023' }, svg);
    this.rows = DRIB.map(([n, v], i) => {
      const y = 42 + i * 30;
      S('text', { x: x0 - 10, y: y + 13, class: 't', 'font-size': 12.5, 'text-anchor': 'end', text: n }, svg);
      return { r: S('rect', { x: x0, y, height: 18, rx: 2, class: i ? 'f-rule2' : 'f-green' }, svg), t: S('text', { y: y + 13, class: 't2', 'font-size': 12 }, svg), v };
    });
    this.gap = S('text', { x: x0 + X(1285) + 60, y: 230, class: 'hand', 'font-size': 16, text: '+1,073 on second place' }, svg);
    this.arrow = S('path', { d: handArrow(x0 + X(1285) + 56, 222, x0 + X(1700), 60, -0.15), class: 'f-none s-green', 'stroke-width': 1.6 }, svg);
    entrance(this, (k) => {
      this.rows.forEach((r) => { attr(r.r, { width: X(r.v * k) }); attr(r.t, { x: x0 + X(r.v * k) + 8 }); r.t.textContent = Math.round(r.v * k).toLocaleString('en'); });
      op(this.gap, seg(k, 0.8, 1)); op(this.arrow, seg(k, 0.8, 1));
    }, 1300);
  }
}

// ── fig 4 · who led Europe, season by season ───────────────────────────────
// Successful dribbles, top-20 player-seasons since 2009 (GiveMeSport, Jul 2022, crediting
// @ThePopFoot; probably league plus Champions League). A season whose leader is not in the
// top 20 had nobody above 160, so those values are drawn as "under 160".
const SEASONS = [
  ['09-10', 'Messi', 202, 202], ['10-11', 'Messi', 265, 265], ['11-12', 'Messi', 220, 220], ['12-13', null, null, null],
  ['13-14', 'Hazard', 174, 167], ['14-15', 'Messi', 266, 266], ['15-16', 'Neymar', 189, 0], ['16-17', 'Neymar', 218, 0],
  ['17-18', 'Messi', 222, 222], ['18-19', 'Hazard', 170, 169], ['19-20', 'Messi', 239, 239], ['20-21', 'Messi', 188, 188],
];
const STEP = 1.1;
class MsLeaders extends Figure {
  constructor() { super(); this.duration = SEASONS.length * STEP + 1.5; }
  build() {
    const svg = this.svgRoot(600, 330, 'Leader in successful dribbles in Europe’s top five leagues each season from 2009-10 to 2020-21, with Messi’s total');
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
    this.cols = SEASONS.map(([s, who, lead, me], i) => {
      const x = x0 + i * cw + 6, w = cw - 12;
      S('text', { x: x + w / 2, y: y0 + 16, class: 't3', 'font-size': 10.5, 'text-anchor': 'middle', text: s }, svg);
      const g = S('g', {}, svg);
      const cls = who === 'Messi' ? 'f-green' : who === 'Neymar' ? 'f-ochre' : 'f-ink3';
      const r = who ? bar(g, cls) : S('rect', { x, y: Y(160), width: w, height: y0 - Y(160), rx: 2, class: 'f-none s-ink3', 'stroke-dasharray': '3 3' }, g);
      const name = S('text', { x: x + w / 2, class: 't', 'font-size': 10.5, 'text-anchor': 'middle', text: who ? `${who === 'Messi' ? 'Messi' : who}` : '?' }, g);
      const val = S('text', { x: x + w / 2, class: 't2', 'font-size': 10.5, 'text-anchor': 'middle', text: lead || '' }, g);
      // Messi's own total when someone else led
      const mine = who && who !== 'Messi' && S('line', { x1: x - 2, x2: x + w + 2, class: 's-green', 'stroke-width': 3 }, g);
      return { g, r, name, val, mine, x, w, who, lead, me };
    });
    this.foot = S('text', { x: x0, y: 306, class: 't2', 'font-size': 12 }, svg);
    S('line', { x1: x0, x2: x0 + 16, y1: 322, y2: 322, class: 's-green', 'stroke-width': 3 }, svg);
    S('text', { x: x0 + 22, y: 326, class: 't3', 'font-size': 11, text: 'Messi’s total when someone else led' }, svg);
    S('line', { x1: 330, x2: 346, y1: 322, y2: 322, class: 's-ink3', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    S('text', { x: 352, y: 326, class: 't3', 'font-size': 11, text: 'under 160, outside the top 20' }, svg);
  }
  label(t) { const i = Math.min(SEASONS.length - 1, Math.floor(t / STEP)); return '20' + SEASONS[i][0]; }
  render(t) {
    let led = 0, known = 0;
    this.cols.forEach((c, i) => {
      const k = inout(seg(t, i * STEP, i * STEP + 0.8));
      op(c.g, k > 0 ? 1 : 0);
      if (k >= 1 && c.who) known++;
      if (c.who) {
        const v = c.lead * k;
        attr(c.r, { x: c.x, width: c.w, y: this.Y(v), height: this.Y(0) - this.Y(v) });
        attr(c.name, { y: this.Y(v) - 18 }); attr(c.val, { y: this.Y(v) - 5 }); c.val.textContent = Math.round(v);
        if (c.who === 'Messi' && k >= 1) led++;
        if (c.mine) {
          // under 160 means not in the list: draw at the 160 line, dashed
          const m = c.me || 160;
          attr(c.mine, { y1: this.Y(m * k), y2: this.Y(m * k), 'stroke-dasharray': c.me ? 'none' : '4 3' });
        }
      } else { attr(c.name, { y: this.Y(160) - 6 }); }
    });
    op(this.msn, seg(t, 7 * STEP, 7 * STEP + 0.6));
    this.foot.textContent = known ? `Messi led ${led} of ${known} seasons with a known leader` : '';
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
    const x0 = 30, W = 550, lo = -0.2, hi = 0.52, X = (v) => x0 + ((v - lo) / (hi - lo)) * W, y0 = 240, Y = (n) => y0 - Math.sqrt(n / 537) * 170;
    S('text', { x: x0, y: 22, class: 'sl', 'font-size': 11, text: 'MLS PLAYER-SEASONS, GOALS ADDED PER 96 MINUTES' }, svg);
    S('line', { x1: x0, x2: x0 + W, y1: y0, y2: y0, class: 's-rule', 'stroke-width': 1 }, svg);
    [-0.2, 0, 0.2, 0.4].forEach((v) => S('text', { x: X(v), y: y0 + 16, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: v.toFixed(1) }, svg));
    this.bins = HIST.map((n, i) => ({ r: bar(svg, 'f-ink3'), x: X(lo + i * 0.02) + 0.5, w: (W / 36) - 1, n }));
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
  ['goals', 932, 979], ['assists', 426, 261], ['goals per game', 0.79, 0.73], ['Ballon d’Or', 8, 5],
  ['Champions League goals', 129, 140], ['international goals', 126, 146], ['World Cup goals', 21, 10], ['direct free kicks', 76, 65],
];
class MsVs extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'Messi and Cristiano Ronaldo compared on eight career measures');
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

define({ 'ms-age': MsAge, 'ms-decade': MsDecade, 'ms-dribbles': MsDribbles, 'ms-leaders': MsLeaders, 'ms-mls': MsMls, 'ms-vs': MsVs });
