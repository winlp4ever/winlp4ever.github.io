// Figures for "Why buy anything if you can reverse anything?".
// Green = worked, ochre = partly worked, hollow ink = failed. Data read 2026-10-12; sources are in each caption.
import { S, attr, op, lerp, ease, seg, keyframes, critter, handArrow, Figure, define, entrance, pills, tooltip, hit, tween } from './core.js';

// ── fig 1 · what REA does in the loop ──────────────────────────────────────
const BOX = {
  app: [20, 120, 104, 60, 'the app', 'exe, APK, JS'],
  rea: [150, 34, 146, 232, 'REA', 'MCP server, no model'],
  ev: [322, 34, 128, 120, 'evidence', ''],
  agent: [322, 192, 128, 74, 'your agent', 'Claude Code, Codex'],
  build: [472, 192, 110, 74, 'your rebuild', ''],
  check: [472, 34, 110, 120, 'the check', 'same output?'],
};
const TOOLS = ['Ghidra, IDA, Hopper', 'JADX, apktool, adb', 'DevTools, mitmproxy', 'Frida, Binwalk'];
const EVID = [['E1', 'observed'], ['E2', 'inferred'], ['E3', 'unknown']];
// where the critter stands in each box: the top-right corner, clear of the box's text
const spot = (k) => { const b = BOX[k]; return [b[0] + b[2] - 34, b[1] + (k === 'check' ? 46 : 10)]; };
// [time, box the work is in, caption]
const STEPS = [
  [0, 'app', 'the target: a binary, a JS bundle or an APK'],
  [1.6, 'rea', 'REA runs the existing tools; it has no model'],
  [3.4, 'ev', 'evidence: observed, inferred or unknown'],
  [5.2, 'agent', 'your agent reads it and writes code'],
  [6.8, 'build', 'the rebuild'],
  [8.2, 'check', 'compared with the original: 2 of 54 differ'],
  [9.8, 'agent', 'the agent fixes them'],
  [11.2, 'build', 'the rebuild, again'],
  [12.4, 'check', 'every check matches'],
];
class RvLoop extends Figure {
  constructor() { super(); this.duration = 14.5; this.poster = 14.5; }
  build() {
    const svg = this.svgRoot(600, 318, 'How REA sits between an app, the reverse-engineering tools and your coding agent');
    // arrows from edge to edge; the last one is the fix loop from the check back to the agent
    [[124, 150, 148, 150], [296, 94, 320, 94], [386, 154, 386, 190], [450, 229, 470, 229], [527, 192, 527, 156], [472, 146, 452, 200, 'fix']].forEach(([x1, y1, x2, y2, n]) => {
      const a = Math.atan2(y2 - y1, x2 - x1), h = 6;
      S('path', { d: `M${x1} ${y1}L${x2} ${y2}M${x2 - h * Math.cos(a - 0.5)} ${y2 - h * Math.sin(a - 0.5)}L${x2} ${y2}L${x2 - h * Math.cos(a + 0.5)} ${y2 - h * Math.sin(a + 0.5)}`, class: 'f-none ' + (n ? 's-ochre' : 's-ink3'), 'stroke-width': 1.5, 'stroke-dasharray': n ? '3 3' : null }, svg);
      if (n) S('text', { x: 455, y: 184, class: 't3', 'font-size': 10, 'text-anchor': 'end', text: n }, svg);
    });
    this.boxes = {};
    for (const k in BOX) {
      const [x, y, w, h, t, sub] = BOX[k];
      const r = S('rect', { x, y, width: w, height: h, rx: 8, class: 'f-panel s-rule', 'stroke-width': 1.2 }, svg);
      S('text', { x: x + 10, y: y + 18, class: 't', 'font-size': 12, text: t }, svg);
      if (sub) S('text', { x: x + 10, y: y + 33, class: 't3', 'font-size': 10, text: sub }, svg);
      this.boxes[k] = r;
    }
    TOOLS.forEach((t, i) => {
      S('rect', { x: 160, y: 78 + i * 44, width: 126, height: 30, rx: 5, class: 'f-rule' }, svg);
      S('text', { x: 168, y: 97 + i * 44, class: 't2', 'font-size': 10.5, text: t }, svg);
    });
    this.ev = EVID.map(([id, tag], i) => {
      const g = S('g', { transform: `translate(332 ${72 + i * 26})` }, svg);
      S('rect', { width: 108, height: 20, rx: 4, class: 'f-rule' }, g);
      S('text', { x: 7, y: 14, class: 't', 'font-size': 10.5, text: id }, g);
      S('text', { x: 30, y: 14, class: 't2', 'font-size': 10.5, text: tag }, g);
      return g;
    });
    // the check runs the original app as well
    S('path', { d: 'M527 34V20H72V120', class: 'f-none s-rule', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, svg);
    S('text', { x: 300, y: 16, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: 'runs the original too' }, svg);
    this.verdict = S('text', { x: 482, y: 140, class: 't', 'font-size': 12 }, svg);
    this.who = S('g', {}, svg);
    critter(this.who, 2.4, 'f-green');
    this.cap = S('text', { x: 20, y: 300, class: 't2', 'font-size': 11.5 }, svg);
    S('text', { x: 472, y: 302, class: 'hand', 'font-size': 14, text: 'the model is here' }, svg);
    S('path', { d: handArrow(500, 288, 430, 270, 0.15), class: 'f-none s-ink2', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, svg);
  }
  label(t) { return `step ${STEPS.filter((s) => s[0] <= t).length} of ${STEPS.length}`; }
  render(t) {
    let i = 0; STEPS.forEach((s, j) => { if (s[0] <= t) i = j; });
    const [t0, k] = STEPS[i], nx = STEPS[i + 1];
    // the critter walks to the next box during the last 0.6 s of each step
    const [ax, ay] = spot(k), [bx, by] = nx ? spot(nx[1]) : [ax, ay];
    const m = nx ? ease(seg(t, nx[0] - 0.6, nx[0])) : 0;
    attr(this.who, { transform: `translate(${lerp(ax, bx, m).toFixed(1)} ${(lerp(ay, by, m) + 7).toFixed(1)})` });
    for (const b in this.boxes) attr(this.boxes[b], { class: b === k ? 'f-panel s-green' : 'f-panel s-rule', 'stroke-width': b === k ? 2 : 1.2 });
    this.ev.forEach((g, j) => op(g, keyframes(t, [[3.4 + j * 0.3, 0.25], [3.7 + j * 0.3, 1]])));
    this.cap.textContent = STEPS[i][2];
    const v = t >= 12.4 ? '✓ match' : t >= 8.2 && t < 9.8 ? '✗ 2 of 54' : t >= 9.8 ? '…' : '';
    if (this.verdict.textContent !== v) this.verdict.textContent = v;
    this.verdict.setAttribute('class', v.startsWith('✓') ? 't f-green-t' : 't');
    this.verdict.style.fill = v.startsWith('✗') ? 'var(--ochre-t)' : ''; // no ochre text class exists
  }
}

// ── fig 2 · stars ──────────────────────────────────────────────────────────
// Oct 5–10: counts posted by a Hacker News commenter. Oct 12: GitHub API.
const STARS = [['Oct 5', 5, 4.2], ['Oct 7', 7, 10.3], ['Oct 8', 8, 17.5], ['Oct 10', 10, 54.6], ['Oct 12', 12, 148.1]];
class RvStars extends Figure {
  build() {
    const svg = this.svgRoot(600, 240, 'REA GitHub stars between 5 and 12 October 2026');
    const X = (d) => 60 + (d - 5) / 7 * 500, Y = (v) => 200 - v / 160 * 180;
    [0, 50, 100, 150].forEach((v) => {
      S('line', { x1: 60, x2: 560, y1: Y(v), y2: Y(v), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 52, y: Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v ? v + 'k' : '0' }, svg);
    });
    STARS.forEach(([n, d]) => S('text', { x: X(d), y: 222, class: 't3', 'font-size': 11, 'text-anchor': 'middle', text: n }, svg));
    this.line = S('path', { class: 'f-none s-green', 'stroke-width': 2.2 }, svg);
    const tip = tooltip(svg);
    this.pts = STARS.map(([n, d, v], i) => {
      const c = S('circle', { cx: X(d), cy: Y(0), r: 4.5, class: 'f-green' }, svg);
      const t = S('text', { x: X(d) + (i === 4 ? -10 : 8), y: Y(v) - 8, class: 't', 'font-size': 11, 'text-anchor': i === 4 ? 'end' : 'start', text: v + 'k' }, svg);
      const h = hit(svg, tip, X(d), Y(v), n, `${v}k stars${i === 4 ? ' (GitHub API)' : ' (reported on HN)'}`);
      return { c, t, x: X(d), y: Y(v), h };
    });
    S('text', { x: X(5.3), y: Y(120), class: 'hand', 'font-size': 14, text: '35 times more in a week' }, svg);
    entrance(this, (k) => {
      this.line.setAttribute('d', 'M' + this.pts.map((p) => `${p.x} ${lerp(Y(0), p.y, k).toFixed(1)}`).join('L'));
      this.pts.forEach((p) => { attr(p.c, { cy: lerp(Y(0), p.y, k) }); op(p.t, k); });
    });
  }
}

// ── fig 3 · 51 attempts ────────────────────────────────────────────────────
// [target, size (0 toy, 1 small, 2 mid-size, 3 large, 4 not disclosed), result (F/P/X), by REA's own contributors, inspectable artifact, note]
const CASES = [
  ['DX-Ball, one function', 1, 'F', 1, 1, '63 compiled bytes identical'], ['Touhou 4 (PC-98)', 2, 'F', 1, 1, 'playable; leans on a human decomp'],
  ['Touhou 8', 2, 'F', 1, 1, '1,106 of 1,107 functions; forked a human decomp'], ['Touhou 9.5', 2, 'F', 1, 1, '696 of 697 functions in about 12 days'],
  ['Notion clipboard trace', 2, 'F', 1, 0, 'analysis only'], ['Aegis TOTP', 1, 'F', 1, 0, 'feature trace'], ['CTF flag checker', 0, 'F', 1, 0, 'beginner challenge'],
  ['Windows Calculator %', 1, 'F', 1, 1, 'checked against the open source'], ['t-rex runner', 0, 'F', 1, 1, 'game speed rule'],
  ['Untangle puzzle', 1, 'F', 0, 1, '52 of 54 claims right'], ['Wispr Flow teardown', 2, 'P', 0, 1, 'REA timed out; rebuild is 64 lines'],
  ['Wispr Flow clone (video)', 2, 'P', 0, 0, 'hotkey, notes, local transcription'], ['Obsidian quick switcher', 2, 'F', 0, 0, "REA found nothing; Claude read the JS"],
  ['Obsidian mini app', 2, 'P', 0, 0, 'under 400 lines'], ['Grok Bot permissions', 2, 'F', 0, 0, 'listed entitlements'],
  ['macOS Preview features', 2, 'F', 0, 0, 'plain agent finished first'], ['Claude Slides editor', 2, 'F', 0, 1, "Claude Code rewrote REA's messy output"],
  ['Claude Design skill port', 2, 'F', 0, 0, 'claim on X'], ['Codex browser annotations', 2, 'P', 0, 0, 'found the API, could not use it'],
  ['CapCut caption templates', 3, 'P', 0, 0, 'downloaded templates instead'], ['QuickBooks → ledger app', 3, 'P', 0, 1, 'an independently written Python ledger'],
  ['World of Warcraft slice', 3, 'X', 0, 1, 'REA returned only file identity'], ['Larax & Zaco (DOS)', 1, 'P', 0, 1, '"not a playable game"'],
  ['Ski or Die minigame', 1, 'F', 0, 1, '559 functions seeded by hand'], ['PowerToys colour picker', 1, 'F', 0, 1, 'clone under 750 lines'],
  ['PI-Desktop analysis', 2, 'P', 0, 0, 'missed both preload entry points'], ['own Electron test app', 0, 'P', 0, 0, 'missed the hidden reason'],
  ['notes exporter sample', 0, 'F', 0, 0, '14 of 14 tests'], ['3-file Electron app', 0, 'F', 0, 0, 'toy'],
  ['own Next.js portal', 2, 'P', 0, 1, '700 KB bundle never finished'], ['netcat audit', 1, 'F', 0, 1, 'no backdoor found'],
  ['bzip2, stripped', 1, 'F', 0, 1, 'matches the unstripped build'], ['own C "vault" program', 0, 'F', 0, 1, 'small models got numbers wrong'],
  ['Infinix phone kernel', 3, 'P', 0, 1, 'Ghidra ran out of memory'], ['ZWO ASIAIR firmware', 2, 'P', 0, 1, 'not tested on a device'],
  ['smart-toilet Bluetooth', 1, 'F', 0, 0, 'menu-bar remote'], ['unnamed Unity game', 2, 'F', 0, 0, 'claim on X, 9.8k likes'],
  ['encrypted library', 4, 'F', 0, 0, 'undisclosed, claim only'], ['poker table organiser', 4, 'F', 0, 0, 'undisclosed, claim only'],
  ['"pixel-level" desktop app', 4, 'F', 0, 0, 'undisclosed, claim only'], ['Android app feature', 4, 'F', 0, 0, 'undisclosed, claim only'],
  ['Claude Code bundle', 2, 'P', 0, 1, 'ran out of memory, then partial'], ['Grokbot', 2, 'X', 0, 0, "stopped by Claude's safety check"],
  ['REA vs plain Opus', 4, 'F', 0, 0, 'plain Opus finished first'], ['Sangokushi II (NES)', 2, 'X', 0, 1, "REA can't open the ROM"],
  ['.NET NativeAOT app', 2, 'X', 0, 1, 'only raw assembly'], ['1.85 MB Swift macOS app', 2, 'X', 0, 1, 'timed out after 40 minutes'],
  ['macOS sharingd', 2, 'X', 0, 1, 'Hopper crashed'], ['AudioBox USB protocol', 2, 'P', 0, 1, 'driver unverified on hardware'],
  ['Battlefield 2 engine', 3, 'P', 0, 1, 'remake in progress'], ['GunZ Rust port', 2, 'P', 0, 1, 'port in progress'],
];
const SIZES = ['toy', 'small', 'mid-size', 'large', 'not disclosed'];
const RES = { F: ['worked', 'f-green'], P: ['partly', 'f-ochre'], X: ['failed', 'f-panel s-ink'] };
class RvCases extends Figure {
  build() {
    const svg = this.svgRoot(600, 196, 'Fifty-one reported attempts with REA, by target size and result');
    const tip = tooltip(svg);
    S('rect', { x: 20, y: 12, width: 9, height: 9, class: 'f-green' }, svg); S('text', { x: 34, y: 20, class: 't2', 'font-size': 10.5, text: 'worked' }, svg);
    S('rect', { x: 98, y: 12, width: 9, height: 9, class: 'f-ochre' }, svg); S('text', { x: 112, y: 20, class: 't2', 'font-size': 10.5, text: 'partly' }, svg);
    S('rect', { x: 170, y: 12, width: 9, height: 9, class: 'f-panel s-ink', 'stroke-width': 1.5 }, svg); S('text', { x: 184, y: 20, class: 't2', 'font-size': 10.5, text: 'failed' }, svg);
    S('rect', { x: 247, y: 11, width: 10, height: 10, rx: 1.5, class: 'f-ink3' }, svg); S('text', { x: 262, y: 20, class: 't2', 'font-size': 10.5, text: 'square: by REA contributors' }, svg);
    this.total = S('text', { x: 580, y: 40, class: 't', 'font-size': 11.5, 'text-anchor': 'end' }, svg);
    const order = { F: 0, P: 1, X: 2 };
    this.cols = SIZES.map((n, c) => {
      const x = 20 + c * 114;
      S('text', { x: x + 4, y: 56, class: 'sl', 'font-size': 10, text: n.toUpperCase() }, svg);
      S('line', { x1: x, x2: x + 104, y1: 62, y2: 62, class: 's-rule', 'stroke-width': 1 }, svg);
      const count = S('text', { x: x + 4, y: 184, class: 't2', 'font-size': 10.5 }, svg);
      const items = CASES.filter((r) => r[1] === c).sort((a, b) => order[a[2]] - order[b[2]] || b[3] - a[3]).map((r, i) => {
        const cx = x + 10 + (i % 6) * 17, cy = 78 + Math.floor(i / 6) * 17, [label, cls] = RES[r[2]];
        const e = r[3] ? S('rect', { x: cx - 6, y: cy - 6, width: 12, height: 12, rx: 1.5, class: cls, 'stroke-width': 1.5 }, svg)
          : S('circle', { cx, cy, r: 6, class: cls, 'stroke-width': 1.5 }, svg);
        const h = hit(svg, tip, cx, cy, r[0], `${label} · ${r[5]}`);
        return { r, e, h, a: 1, from: 1 };
      });
      return { items, count };
    });
    this.mode = 'all';
    pills(this, [['all', 'every report'], ['ind', 'independent users'], ['art', 'independent, with public code']], 'all', (m) => {
      this.mode = m; tip.hide();
      this.cols.forEach((c) => c.items.forEach((d) => { d.from = d.a; }));
      tween(this, (k) => this.place(k));
    });
    this.place(1);
  }
  place(k) {
    const keep = (r) => this.mode === 'all' || (!r[3] && (this.mode === 'ind' || r[4]));
    const tot = { F: 0, P: 0, X: 0 };
    this.cols.forEach((c) => {
      const n = { F: 0, P: 0, X: 0 };
      c.items.forEach((d) => {
        const on = keep(d.r);
        d.a = lerp(d.from, on ? 1 : 0.12, k); op(d.e, d.a);
        d.h.c.style.pointerEvents = on ? 'all' : 'none';
        if (on) { n[d.r[2]]++; tot[d.r[2]]++; }
      });
      c.count.textContent = `${n.F} · ${n.P} · ${n.X}`;
    });
    this.total.textContent = `${tot.F} worked · ${tot.P} partly · ${tot.X} failed`;
  }
}

// ── fig 4 · bigger programs, fewer tests passed ────────────────────────────
// ProgramBench (arXiv 2605.03546), table 11: mean share of tests passed, by task difficulty.
const PB = [['Claude Opus 4.6', 73.9, 53.3, 24.7], ['Claude Opus 4.7', 73.8, 52.1, 25.0], ['Claude Sonnet 4.6', 67.1, 48.8, 28.6], ['GPT 5.4', 50.9, 39.9, 18.0], ['Gemini 3.1 Pro', 50.9, 37.7, 17.8]];
class RvSize extends Figure {
  build() {
    const svg = this.svgRoot(600, 280, 'Share of tests passed when rebuilding a program from its binary, by program size, for five models');
    const X = [100, 240, 380], Y = (v) => 240 - v / 80 * 210;
    [0, 20, 40, 60, 80].forEach((v) => {
      S('line', { x1: 80, x2: 400, y1: Y(v), y2: Y(v), class: 's-rule', 'stroke-width': 1 }, svg);
      S('text', { x: 72, y: Y(v) + 4, class: 't3', 'font-size': 11, 'text-anchor': 'end', text: v + '%' }, svg);
    });
    // the paper's bins: lines of code × (1 + runtime dependencies)
    [['small', 'under 10k'], ['medium', '10k to 1M'], ['large', 'over 1M']].forEach(([a, b], i) => {
      S('text', { x: X[i], y: 258, class: 't', 'font-size': 11.5, 'text-anchor': 'middle', text: a }, svg);
      S('text', { x: X[i], y: 272, class: 't3', 'font-size': 10, 'text-anchor': 'middle', text: b }, svg);
    });
    S('rect', { x: X[1] - 40, y: 24, width: 80, height: 218, rx: 6, class: 'f-green', opacity: 0.08 }, svg);
    S('text', { x: X[1], y: 20, class: 'hand', 'font-size': 13.5, 'text-anchor': 'middle', text: '143 of 200 programs' }, svg);
    this.lines = PB.map(([n, ...v], i) => {
      const top = i === 0, cls = top ? 's-green' : 's-ink3';
      const p = S('path', { class: 'f-none ' + cls, 'stroke-width': top ? 2.4 : 1.4 }, svg);
      const dots = v.map((_, j) => S('circle', { cx: X[j], r: top ? 4.5 : 3, class: top ? 'f-green' : 'f-ink3' }, svg));
      const lab = S('text', { x: 394, y: [181, 170, 159, 196, 208][i], class: top ? 't f-green-t' : 't3', 'font-size': 10.5, text: `${n} ${v[2]}%` }, svg);
      return { p, dots, lab, v };
    });
    this.Y = Y; this.X = X;
    entrance(this, (k) => this.lines.forEach((l) => {
      const ys = l.v.map((v) => this.Y(v * k));
      l.p.setAttribute('d', 'M' + ys.map((y, j) => `${this.X[j]} ${y.toFixed(1)}`).join('L'));
      l.dots.forEach((d, j) => attr(d, { cy: ys[j] })); op(l.lab, k);
    }), 1000);
  }
}

// ── fig 5 · the check decides ──────────────────────────────────────────────
const WITH = [
  ['Snowboard Kids 2 (N64)', 'byte match', '100% matching, after 20 months'],
  ['Touhou 8', 'byte match', '1,106 of 1,107 functions'],
  ['gotree, 16k lines', 'output diff', '2,000 of 2,001 tests, $251'],
  ['C compiler, 100k lines', 'GCC as reference', '~99% of GCC torture tests, ~$20k'],
  ['Chromatron, with a pixel diff', 'pixel diff', '307,199 of 307,200 pixels'],
];
const WITHOUT = [
  ['Chromatron, before it', 'eyes', '"looks like a remake"'],
  ['PhotoCraft, a Photoshop clone', 'none', '~65% of pixels match'],
  ["Cursor's agent-built browser", 'none', "didn't reliably build"],
  ['Wispr Flow rebuild', 'none', 'a 64-line script'],
  ['26 web apps', 'replayed clicks', '29% to 49% of workflows (ProgramDistill)'],
];
class RvCheck extends Figure {
  build() {
    const svg = this.svgRoot(600, 270, 'Rebuilds that had an exact automatic check, next to rebuilds that did not');
    this.rows = [];
    [[WITH, 16, 'WITH AN EXACT CHECK', 'f-green'], [WITHOUT, 308, 'WITHOUT ONE', 'f-ochre']].forEach(([list, x, title, cls]) => {
      S('text', { x, y: 22, class: cls === 'f-green' ? 'sl f-green-t' : 'sl', 'font-size': 10.5, text: title, style: cls === 'f-green' ? null : 'fill:var(--ochre-t)' }, svg);
      list.forEach(([a, b, c], i) => {
        const g = S('g', { transform: `translate(${x} ${40 + i * 46})` }, svg);
        S('rect', { width: 276, height: 40, rx: 6, class: 'f-rule' }, g);
        S('rect', { width: 4, height: 40, rx: 2, class: cls }, g);
        S('text', { x: 12, y: 16, class: 't', 'font-size': 11, text: a }, g);
        S('text', { x: 12, y: 32, class: 't2', 'font-size': 10.5, text: c }, g);
        S('text', { x: 268, y: 16, class: 't3', 'font-size': 9.5, 'text-anchor': 'end', text: b }, g);
        this.rows.push(g);
      });
    });
    entrance(this, (k) => this.rows.forEach((g, i) => op(g, ease(seg(k, (i % 5) * 0.12, (i % 5) * 0.12 + 0.5)))));
  }
}

define({ 'rv-loop': RvLoop, 'rv-stars': RvStars, 'rv-cases': RvCases, 'rv-size': RvSize, 'rv-check': RvCheck });
