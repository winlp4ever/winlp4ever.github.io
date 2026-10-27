// Figures for "How the Claude Code team reviews code".
// Green = a person, ink = a machine. Data from the Claude Code team's post of 15 Oct 2026.
import { S, op, ease, seg, lerp, Figure, define, entrance, pills, tween } from './core.js';

// ── fig 1 · the seven layers ───────────────────────────────────────────────
// [layer, what happens, who checks, can it block a merge]
const LAYERS = [
  ['verified before review', 'tests, build, screenshots; a fresh-context agent reads the diff', 'agent', false],
  ['AI review on every PR', 'parallel bug hunters, verifier vote, Important / Nit / Pre-existing', 'agent', false],
  ['security review', 'findings block until fixed or closed with a reason', 'agent', true],
  ['automated checks', 'lint, types, cross-platform tests, build, packaging', 'CI', true],
  ['human approval', '', 'tier', true],
  ['merge queue, flags, release', 'merge queue, feature flags, latest then stable channel', 'system', false],
  ['detection and rollback', 'weekly on-call watches, fixes forward or rolls back', 'on-call', false],
];
const TIER = {
  low: ['none once the checks are green', 0, 'docs, copy, internal features, additive changes behind a flag'],
  medium: ['one person', 1, 'ordinary product changes, caching, auto-updater, system prompts'],
  high: ['two people', 2, 'the highest-risk code and paths that always need two'],
};
class CrLayers extends Figure {
  build() {
    const svg = this.svgRoot(600, 330, 'The seven review layers a change passes through on the Claude Code team, and how many people approve it at each risk tier');
    S('rect', { x: 20, y: 12, width: 10, height: 10, rx: 2, class: 'f-green' }, svg); S('text', { x: 36, y: 21, class: 't2', 'font-size': 11, text: 'a person' }, svg);
    S('rect', { x: 110, y: 12, width: 10, height: 10, rx: 2, class: 'f-ink3' }, svg); S('text', { x: 126, y: 21, class: 't2', 'font-size': 11, text: 'a machine' }, svg);
    S('text', { x: 580, y: 21, class: 't3', 'font-size': 10.5, 'text-anchor': 'end', text: 'blocks a merge' }, svg);
    this.rows = LAYERS.map(([n, d, who, blocks], i) => {
      const y = 36 + i * 40, g = S('g', {}, svg);
      S('rect', { x: 16, y, width: 568, height: 34, rx: 7, class: 'f-panel s-rule', 'stroke-width': 1 }, g);
      S('text', { x: 28, y: y + 21, class: 't3', 'font-size': 11, text: String(i + 1) }, g);
      S('text', { x: 46, y: y + 15, class: 't', 'font-size': 12, text: n }, g);
      const sub = S('text', { x: 46, y: y + 28, class: 't3', 'font-size': 9.5, text: d }, g);
      const chip = S('rect', { x: 448, y: y + 9, width: 86, height: 16, rx: 8, class: who === 'on-call' || who === 'tier' ? 'f-green' : 'f-ink3' }, g);
      const chipT = S('text', { x: 491, y: y + 21, class: 't', 'font-size': 10, 'text-anchor': 'middle', text: who, style: 'fill:var(--bg)' }, g);
      const dot = blocks ? S('text', { x: 572, y: y + 22, class: 't', 'font-size': 13, 'text-anchor': 'end', text: '●' }, g) : null;
      return { g, sub, chip, chipT, dot };
    });
    this.hand = S('text', { x: 300, y: 322, class: 'hand', 'font-size': 13.5, 'text-anchor': 'middle' }, svg);
    this.tier = 'medium';
    this.fill();
    entrance(this, (k) => { if (!this.toggled) this.rows.forEach((r, i) => op(r.g, ease(seg(k, i * 0.08, i * 0.08 + 0.5)))); });
    pills(this, [['low', 'low risk'], ['medium', 'medium risk'], ['high', 'high risk']], 'medium', (t) => {
      this.tier = t; this.toggled = true; this.fill();
      tween(this, (k) => op(this.rows[4].g, lerp(0.3, 1, k)));
    });
  }
  fill() {
    const [who, n, ex] = TIER[this.tier], r = this.rows[4];
    r.sub.textContent = 'e.g. ' + ex;
    r.chipT.textContent = n ? who : 'nobody';
    r.chip.setAttribute('class', n ? 'f-green' : 'f-ink3');
    op(r.dot, n ? 1 : 0); // low-risk changes don't wait on an approval
    this.hand.textContent = n === 0 ? 'low risk: no person approves, the machines do' : n === 1 ? 'one person approves; it can be the author' : 'two people approve this commit';
  }
}

// ── fig 2 · a reviewer that converges ──────────────────────────────────────
// [measure, before, after, unit, which comparison]
const CONV = [
  ['PRs with substantive review comments', 16, 54, '%', 'before and after the research preview'],
  ['pass after one review-and-fix round', 65, 78, '%', 'before and after the convergence changes'],
  ['need five or more rounds', 8.9, 1.5, '%', 'before and after the convergence changes'],
  ['mean reviews to pass', 2.08, 1.32, '', 'before and after the convergence changes'],
];
class CrConverge extends Figure {
  build() {
    const svg = this.svgRoot(600, 244, 'How the Claude Code team’s automated reviewer changed: more substantive comments, fewer review rounds');
    S('rect', { x: 20, y: 12, width: 10, height: 10, rx: 2, class: 'f-ink3' }, svg); S('text', { x: 36, y: 21, class: 't2', 'font-size': 11, text: 'before' }, svg);
    S('rect', { x: 100, y: 12, width: 10, height: 10, rx: 2, class: 'f-green' }, svg); S('text', { x: 116, y: 21, class: 't2', 'font-size': 11, text: 'after' }, svg);
    const fmt = (v, u) => (u ? v + u : v.toFixed(2));
    this.rows = CONV.map(([n, a, b, u, src], i) => {
      const y = 48 + i * 52, max = Math.max(a, b), W = (v) => v / max * 300;
      S('text', { x: 20, y, class: 't', 'font-size': 12, text: n }, svg);
      S('text', { x: 580, y, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: src }, svg);
      return [[a, 'f-ink3', 0], [b, 'f-green', 1]].map(([v, cls, j]) => {
        const r = S('rect', { x: 20, y: y + 8 + j * 15, height: 12, rx: 2, class: cls }, svg);
        const t = S('text', { y: y + 18 + j * 15, class: j ? 't' : 't2', 'font-size': 11, text: fmt(v, u) }, svg);
        return { r, t, w: W(v) };
      });
    });
    S('text', { x: 150, y: 48 + 2 * 52 + 34, class: 'hand', 'font-size': 14, text: 'fewer rounds, fewer stuck PRs' }, svg);
    entrance(this, (k) => this.rows.forEach((bars, i) => bars.forEach((b, j) => {
      const kk = ease(seg(k, i * 0.1 + j * 0.15, i * 0.1 + j * 0.15 + 0.5)), w = lerp(0, b.w, kk);
      b.r.setAttribute('width', w); b.t.setAttribute('x', 26 + w); op(b.t, kk);
    })));
  }
}

define({ 'cr-layers': CrLayers, 'cr-converge': CrConverge });
