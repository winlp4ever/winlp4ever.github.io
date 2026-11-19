// Figures for "How Claude Code's memory works".
// Green = what a session gets without asking. The counts in fig 4 and fig 5 were measured
// on the author's machine on 19 Nov 2026; the limits come from the Claude Code docs.
import { S, H, attr, op, ease, seg, lerp, inout, wrap, critter, drawOn, Figure, define, entrance, pills, tween, stepper } from './core.js';

const txt = (p, x, y, text, cls = 't2', size = 11, extra = {}) => S('text', { x, y, class: cls, 'font-size': size, text, ...extra }, p);
const box = (p, x, y, w, h, cls = 'f-panel s-rule', extra = {}) => S('rect', { x, y, width: w, height: h, rx: 7, class: cls, 'stroke-width': 1.2, ...extra }, p);
const key = (svg, x, cls, label) => { S('rect', { x, y: 12, width: 10, height: 10, rx: 2, class: cls }, svg); txt(svg, x + 16, 21, label); };

// ── fig 1 · which folder a session uses ────────────────────────────────────
// [label, where claude starts, the git repository it belongs to]; paths are examples
const WS = '/Users/me/workspace';
const PLACES = {
  root: ['the repo root', WS + '/site', WS + '/site'],
  sub: ['a subdirectory', WS + '/site/src/figures', WS + '/site'],
  wt: ['a git worktree', WS + '/site-wt/fix-nav', WS + '/site'],
  clone: ['a second clone', '/Users/me/tmp/site', '/Users/me/tmp/site'],
  none: ['no git repo', '/Users/me/notes', null],
};
const NOTE = { root: 'one memory folder per repository', sub: 'same memory as the repo root', wt: 'same memory as the repo root', clone: 'same code, a new and empty memory', none: 'no repo: keyed by this folder' };
const slug = (p) => p.replace(/[^a-zA-Z0-9]/g, '-');
class MemPath extends Figure {
  build() {
    const svg = this.svgRoot(600, 296, 'Which memory folder a Claude Code session uses, worked out from the directory it starts in');
    const rows = ['you start claude in', 'git repository', 'transcripts go to ~/.claude/projects/', 'memory lives in ~/.claude/projects/'];
    this.vals = rows.map((l, i) => { txt(svg, 28, 28 + i * 40, l, 't3', 10.5); return txt(svg, 28, 45 + i * 40, '', i === 3 || !i ? 't' : 't2', 12.5); });
    S('rect', { x: 16, y: 136, width: 4, height: 34, rx: 2, class: 'f-green' }, svg);
    // the three memory folders these five places can map to
    this.dirs = [...new Set(Object.values(PLACES).map(([, cwd, root]) => slug(root || cwd)))];
    this.boxes = this.dirs.map((d, i) => {
      const r = box(svg, 20 + i * 190, 208, 180, 44);
      txt(svg, 110 + i * 190, 227, d, 't2', 9.5, { 'text-anchor': 'middle' });
      txt(svg, 110 + i * 190, 242, '/memory/', 't3', 9.5, { 'text-anchor': 'middle' });
      return r;
    });
    this.cr = S('g', {}, svg); critter(this.cr, 2, 'f-green');
    this.hand = txt(svg, 300, 282, '', 'hand', 14.5, { 'text-anchor': 'middle' });
    this.x = 99;
    this.pick('root', false);
    pills(this, Object.entries(PLACES).map(([k, v]) => [k, v[0]]), 'root', (v) => this.pick(v, true));
  }
  pick(v, animate) {
    const [, cwd, root] = PLACES[v], mem = slug(root || cwd), i = this.dirs.indexOf(mem);
    this.vals[0].textContent = cwd;
    this.vals[1].textContent = root || 'none, so the folder itself is the project';
    this.vals[2].textContent = slug(cwd) + '/';
    this.vals[3].textContent = mem + '/memory/';
    this.boxes.forEach((r, j) => r.setAttribute('class', 'f-panel ' + (j === i ? 's-green' : 's-rule')));
    this.hand.textContent = NOTE[v];
    const from = this.x, to = 99 + i * 190;
    const move = (k) => { this.x = lerp(from, to, k); attr(this.cr, { transform: `translate(${this.x.toFixed(1)} 192)` }); };
    if (animate) tween(this, move, 450); else move(1);
  }
}

// ── fig 2 · the index and the files it points to ───────────────────────────
// trimmed from the memory folder of the author's blog project
const MEMS = [
  { file: 'prose-voice-feedback', title: 'Prose voice feedback', type: 'feedback',
    hook: 'drafts rejected as too AI: no reveal framings, teasers or punchline fragments',
    desc: 'patterns that got a blog draft sent back',
    body: ['The user sends a draft back when it sounds AI-written, even if it passes the checklist greps.', 'Why: the blog should read like a person explaining plainly.', 'How to apply: go through the writing guide section by section on every draft.'] },
  { file: 'blog-project', title: 'Blog project', type: 'project',
    hook: 'field notes repo: posts, figure runtime, where the design docs live',
    desc: 'where the blog repo is and how posts are built',
    body: ['Posts are Markdown. Each post has one figure module, loaded when its first figure nears the viewport.', 'Headless Chrome does not run requestAnimationFrame, so check frames with #still or #t=3.2.', 'How to apply: build new posts on the existing figure runtime.'] },
  { file: 'user-design-taste', title: 'User design taste', type: 'user',
    hook: 'mono type, cool white, one handmade touch, earthy accents',
    desc: 'the visual style to match in design work',
    body: ['Monochrome first, with monospace as the main voice.', 'Exactly one handmade touch per product. Green and ochre, used sparingly.', 'How to apply: keep colour to accents and add one handmade element.'] },
  { file: 'pr-review-workflow', title: 'PR review workflow', type: 'feedback',
    hook: 'plan, implement, /code-review high; redesign after 3 severe rounds',
    desc: 'how each pull request gets reviewed',
    body: ['Run one review round. Run another only if the last one found a severe issue.', 'Why: reviews should converge.', 'How to apply: count the rounds, and at round 3 propose a redesign.'] },
];
class MemIndex extends Figure {
  build() {
    const svg = this.svgRoot(600, 336, 'A MEMORY.md index of four one-line hooks on the left, and the memory file that the selected hook points to on the right');
    txt(svg, 16, 24, 'MEMORY.md', 't', 11.5); txt(svg, 290, 24, 'loaded at session start', 't3', 10, { 'text-anchor': 'end' });
    this.name = txt(svg, 306, 24, '', 't', 11.5); txt(svg, 584, 24, 'read on demand', 't3', 10, { 'text-anchor': 'end' });
    box(svg, 306, 34, 278, 290);
    this.rows = MEMS.map((m, i) => {
      const y = 34 + i * 74, g = S('g', { class: 'click' }, svg);
      const r = box(g, 16, y, 274, 68);
      txt(g, 28, y + 17, `- [${m.title}]`, 't', 10.5);
      txt(g, 28, y + 30, `(${m.file}.md)`, 't3', 9.5);
      wrap(m.hook, 42).forEach((l, j) => txt(g, 28, y + 45 + j * 12, l, 't2', 9.5));
      g.onclick = () => this.pick(i);
      return r;
    });
    this.link = S('path', { class: 'f-none s-green', 'stroke-width': 1.8 }, svg);
    this.lines = Array.from({ length: 20 }, (_, j) => txt(svg, 318, 54 + j * 13.5, '', 't2', 10));
    this.bar = pills(this, MEMS.map((m, i) => [i, m.title.toLowerCase()]), 0, (i) => this.pick(i));
    this.pick(0);
  }
  pick(i) {
    const m = MEMS[i], y = 68 + i * 74;
    this.rows.forEach((r, j) => r.setAttribute('class', 'f-panel ' + (j === i ? 's-green' : 's-rule')));
    this.bar.querySelectorAll('.pill').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    attr(this.link, { d: `M290 ${y} H306 M300 ${y - 4} L306 ${y} L300 ${y + 4}` });
    this.name.textContent = m.file + '.md';
    // the file as it sits on disk: frontmatter first, then the fact with its why and how
    const head = ['---', 'name: ' + m.file, ...wrap('description: ' + m.desc, 42), 'metadata:', '\u00a0\u00a0type: ' + m.type, '---'];
    const text = [...head, ...m.body.flatMap((p) => ['', ...wrap(p, 42)])];
    this.lines.forEach((t, j) => { t.textContent = text[j] || ''; t.setAttribute('class', j < head.length ? 't3' : 't2'); });
  }
}

// ── fig 3 · one session, start to finish ───────────────────────────────────
const HOOKS = ['prose voice: drafts too AI', 'blog project: repo layout', 'design taste: mono, green', 'no question openers'];
const FILES = ['prose-voice-feedback.md', 'blog-project.md', 'design-taste.md', 'no-question-openers.md'];
const STEPS = [[2, 'session starts'], [4.6, 'index loaded'], [6.2, 'a prompt arrives'], [7.7, 'a hook matches'], [9.6, 'file read on demand'], [11, 'reply'], [12, 'a correction'], [14.6, 'new memory saved'], [99, 'next session: 4 hooks']];
class MemSession extends Figure {
  constructor() { super(); this.duration = 16; this.loop = false; this.poster = 16; }
  build() {
    const svg = this.svgRoot(600, 314, 'One session: the index is copied into the context window at the start, one memory file is read when its hook matches the prompt, and a correction is saved as a new file with a new index line');
    txt(svg, 16, 24, 'ON DISK · THE MEMORY FOLDER', 'sl', 10); txt(svg, 330, 24, 'IN THE CONTEXT WINDOW', 'sl', 10);
    box(svg, 16, 34, 220, 242, 'f-none s-rule'); box(svg, 330, 34, 254, 258, 'f-none s-rule');
    box(svg, 28, 46, 196, 80); txt(svg, 38, 62, 'MEMORY.md', 't', 11);
    this.dHooks = HOOKS.map((h, i) => txt(svg, 38, 78 + i * 13, '- ' + h, 't2', 9.5));
    this.dFiles = FILES.map((f, i) => { const g = S('g', {}, svg); box(g, 28, 136 + i * 32, 196, 26); txt(g, 38, 153 + i * 32, f, 't2', 10); return g; });
    const blk = (y, label, cls = 's-rule') => { const g = S('g', {}, svg); box(g, 342, y, 230, 22, 'f-panel ' + cls); txt(g, 352, y + 15, label, 't2', 10); return g; };
    this.sys = blk(46, 'system prompt'); this.cl = blk(72, 'CLAUDE.md');
    this.read = S('path', { d: 'M342 127 L226 149', class: 'f-none s-green', 'stroke-width': 1.6 }, svg);
    this.readL = txt(svg, 262, 130, 'Read', 't3', 9.5);
    this.write = S('path', { d: 'M342 275 L226 247 M235 244 L226 247 L232 254', class: 'f-none s-ink3', 'stroke-width': 1.6 }, svg);
    this.writeL = txt(svg, 286, 276, 'Write', 't3', 9.5, { 'text-anchor': 'end' });
    // the index and one file travel from the disk column into the context column
    this.gm = S('g', {}, svg); this.mr = box(this.gm, 0, 0, 196, 80, 'f-panel s-green');
    this.hl = S('rect', { x: 5, y: 21, height: 14, rx: 3, class: 'f-green' }, this.gm);
    txt(this.gm, 10, 16, 'MEMORY.md', 't', 11);
    this.mHooks = HOOKS.slice(0, 3).map((h, i) => txt(this.gm, 10, 32 + i * 13, '- ' + h, 't2', 9.5));
    this.prompt = blk(176, ''); txt(this.prompt, 372, 191, 'you: draft the intro', 't2', 10);
    critter(S('g', { transform: 'translate(351 184)' }, this.prompt), 1.2, 'f-ink3');
    this.gf = S('g', {}, svg); this.fr = box(this.gf, 0, 0, 196, 26, 'f-panel s-green'); txt(this.gf, 10, 17, FILES[0], 't2', 10);
    this.reply = blk(232, 'claude: a draft, in plain sentences');
    this.corr = blk(258, 'you: don’t open with a question');
    this.hand = txt(svg, 20, 302, 'the next session starts with 4 hooks', 'hand', 14.5);
  }
  label(t) { return (STEPS.find(([end]) => t < end) || STEPS.at(-1))[1]; }
  render(t) {
    op(this.sys, seg(t, .2, .8)); op(this.cl, seg(t, .9, 1.5));
    const km = inout(seg(t, 2, 4.2)), w = lerp(196, 230, km);
    attr(this.gm, { transform: `translate(${lerp(28, 342, km).toFixed(1)} ${lerp(46, 98, km).toFixed(1)})` }); op(this.gm, seg(t, 2, 2.3));
    attr(this.mr, { width: w, height: lerp(80, 72, km) }); attr(this.hl, { width: w - 10 }); op(this.hl, .22 * seg(t, 6.2, 6.8));
    op(this.prompt, seg(t, 4.6, 5.2));
    const gone = 1 - seg(t, 9.4, 10);
    drawOn(this.read, seg(t, 6.9, 7.6)); op(this.read, gone); op(this.readL, seg(t, 7.2, 7.6) * gone);
    const kf = inout(seg(t, 7.7, 9.2));
    attr(this.gf, { transform: `translate(${lerp(28, 342, kf).toFixed(1)} ${lerp(136, 202, kf).toFixed(1)})` }); op(this.gf, seg(t, 7.7, 8));
    attr(this.fr, { width: lerp(196, 230, kf) });
    op(this.reply, seg(t, 9.6, 10.2)); op(this.corr, seg(t, 11, 11.6));
    drawOn(this.write, seg(t, 12, 12.7)); op(this.writeL, seg(t, 12.3, 12.7));
    op(this.dFiles[3], seg(t, 12.6, 13.2)); op(this.dHooks[3], seg(t, 13.4, 14));
    op(this.hand, seg(t, 14.6, 15.2));
  }
}

// ── fig 4 · what the index costs, and where it gets cut ────────────────────
const MAX_LINES = 200, MAX_BYTES = 25000, BODY = 1750; // docs: 200 lines or 25 KB; 1,750 bytes is the author's average memory file
const kb = (b) => (b / 1000).toFixed(1), pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
class MemBudget extends Figure {
  build() {
    const svg = this.svgRoot(600, 282, 'How many index lines load at session start for a given number of memories and hook length, against the 200-line and 25 KB limits');
    key(svg, 20, 'f-green', 'hook loaded'); key(svg, 130, 'f-ochre', 'hook past the limit'); key(svg, 290, 'f-rule2', 'no memory yet');
    this.cells = Array.from({ length: 400 }, (_, i) => S('rect', { x: 20 + (i % 40) * 14, y: 36 + Math.floor(i / 40) * 14, width: 11, height: 11, rx: 2 }, svg));
    this.out = [0, 1, 2, 3].map((i) => txt(svg, 20, 198 + i * 19, '', i === 1 ? 't' : 't2', 12));
    this.hand = txt(svg, 580, 272, '', 'hand', 14.5, { 'text-anchor': 'end' });
    this.idleText = 'interactive';
    const bar = H('div', { class: 'fc' }, this);
    const mk = (name, min, max, v, unit) => {
      const lab = H('label', { class: 'pill', text: name + ' ' }, bar), o = H('span', { text: v + unit }, lab);
      const s = H('input', { type: 'range', min, max, value: v, 'aria-label': name }, bar);
      s.oninput = () => { o.textContent = s.value + unit; this.paint(); };
      return s;
    };
    this.n = mk('memories', 1, 400, 68, ''); this.len = mk('hook length', 60, 240, 150, ' bytes');
    this.paint();
  }
  paint() {
    const n = +this.n.value, L = +this.len.value;
    const fit = Math.min(MAX_LINES, Math.floor(MAX_BYTES / L)), loaded = Math.min(n, fit), by = fit < MAX_LINES ? '25 KB' : '200 lines';
    this.cells.forEach((c, i) => c.setAttribute('class', i >= n ? 'f-rule2' : i < fit ? 'f-green' : 'f-ochre'));
    this.out[0].textContent = `MEMORY.md: ${pl(n, 'line')}, ${kb(n * L)} KB`;
    this.out[1].textContent = `loaded at every session start: ${pl(loaded, 'hook')}, about ${Math.round(loaded * L / 4).toLocaleString('en')} tokens`;
    this.out[2].textContent = `read only on demand: ${pl(n, 'file')}, about ${Math.round(n * BODY / 1000)} KB on disk`;
    this.out[3].textContent = n > fit ? `${pl(n - fit, 'hook')} past the limit (${by}) will never load` : `at this hook length the limit is ${fit} hooks (${by} comes first)`;
    this.hand.textContent = n > fit ? 'on disk, but no session sees them' : '';
  }
}

// ── fig 5 · how memory was touched on one machine ──────────────────────────
// [what, count, done by Claude Code itself?], deduplicated tool calls in 141 transcripts
const TALLY = [
  ['MEMORY.md loaded into a session', 356, 1],
  ['Write tool: a memory file created or replaced', 119],
  ['shell: echo "- [title](file.md) …" >> MEMORY.md', 114],
  ['Edit tool: a memory file or the index changed in place', 45],
  ['Read tool: a memory file or the index opened', 10],
];
class MemTally extends Figure {
  build() {
    const svg = this.svgRoot(600, 246, 'Counts of how memory files were loaded, written, edited and read across 141 session transcripts on the author’s machine');
    key(svg, 20, 'f-green', 'done by Claude Code'); key(svg, 180, 'f-ink3', 'a tool call the model chose to make');
    this.rows = TALLY.map(([n, v, auto], i) => {
      const y = 50 + i * 40;
      txt(svg, 20, y, n, 't', 11.5);
      return { r: S('rect', { x: 20, y: y + 7, height: 12, rx: 2, class: auto ? 'f-green' : 'f-ink3' }, svg), t: txt(svg, 0, y + 17, String(v), 't2', 11), w: v / 356 * 400 };
    });
    txt(svg, 580, 106, 'the index rides along', 'hand', 14, { 'text-anchor': 'end' }); txt(svg, 580, 124, 'whether it’s needed or not', 'hand', 14, { 'text-anchor': 'end' });
    entrance(this, (k) => this.rows.forEach((b, i) => {
      const kk = ease(seg(k, i * 0.1, i * 0.1 + 0.55)), w = lerp(0, b.w, kk);
      b.r.setAttribute('width', w); b.t.setAttribute('x', 26 + w); op(b.t, kk);
    }));
  }
}

// ── fig 6 · where the old version of a memory goes ─────────────────────────
const V1 = ['Review every PR with /code-review.', 'Run another round after any fix.', 'Stop after 5 rounds.'];
const SED = 's/5 rounds/3 rounds/', EDIT = ['Run another round after any fix.', 'Rerun only after a severe finding.'];
const V2 = V1.map((l) => l.replace('5 rounds', '3 rounds')), V3 = V2.map((l) => l === EDIT[0] ? EDIT[1] : l);
// line diff by longest common subsequence: [' ' | '-' | '+', line]
function diff(a, b) {
  const n = a.length, m = b.length, T = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = a[i] === b[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { out.push([' ', a[i]]); i++; j++; }
    else if (j >= m || (i < n && T[i + 1][j] >= T[i][j + 1])) out.push(['-', a[i++]]);
    else out.push(['+', b[j++]]);
  }
  return out;
}
const UNDO = [
  { disk: V1, prev: V1, log: 0, text: 'A memory file as an earlier session left it. The folder holds this one version and nothing else.' },
  { disk: V2, prev: V1, log: 1, text: 'A session patches the file from the shell. The transcript records the command and its output. It keeps no copy of the old file.' },
  { disk: V3, prev: V2, log: 2, text: 'A later change goes through the Edit tool. The transcript stores the result with originalFile, the whole file from before the edit, and a patch.' },
  { disk: V2, prev: V3, log: 2, back: 1, text: 'To undo the Edit, a session finds that entry and writes originalFile back. Undoing the sed means reading the command and reversing it by hand.' },
];
class MemUndo extends Figure {
  build() {
    const svg = this.svgRoot(600, 338, 'A memory file edited twice, once from the shell and once with the Edit tool, and what the session transcript keeps of each old version');
    txt(svg, 16, 24, 'ON DISK · review-rounds.md', 'sl', 10); txt(svg, 282, 24, 'IN THE SESSION TRANSCRIPT', 'sl', 10);
    box(svg, 16, 34, 250, 76); box(svg, 282, 34, 302, 236, 'f-none s-rule');
    this.g = S('g', {}, svg);
    this.lines = [0, 1, 2].map((i) => txt(svg, 20, 294 + i * 16, '', 't2', 11.5));
    this.idleText = 'interactive';
    this.step = stepper(this, (i) => this.draw(UNDO[i]));
    this.step.set(UNDO.length);
  }
  draw(f) {
    const g = this.g; g.replaceChildren();
    wrap(f.text, 80).forEach((l, j) => { this.lines[j].textContent = l; }); for (let j = wrap(f.text, 80).length; j < 3; j++) this.lines[j].textContent = '';
    f.disk.forEach((l, i) => {
      const changed = l !== f.prev[i];
      if (changed) S('rect', { x: 22, y: 43 + i * 20, width: 4, height: 14, rx: 2, class: f.back ? 'f-green' : 'f-ink3' }, g);
      txt(g, 32, 54 + i * 20, l, changed ? 't' : 't2', 10.5);
    });
    txt(g, 16, 130, f.back ? 'the Edit undone, the sed still applied' : f.log === 2 ? 'two edits, one old version in the transcript' : f.log ? 'one edit, and the old version is gone' : 'one version, no history', 't3', 10.5);
    if (!f.log) return txt(g, 294, 58, '(no entries about this file yet)', 't3', 10.5);
    box(g, 292, 44, 282, 56, 'f-panel s-ochre');
    txt(g, 302, 60, 'Bash', 't', 11); txt(g, 564, 60, 'no copy of the old file', 't3', 9.5, { 'text-anchor': 'end' });
    txt(g, 302, 76, `sed -i '' '${SED}' \\`, 't2', 9.5); txt(g, 302, 89, '\u00a0\u00a0review-rounds.md', 't2', 9.5);
    if (f.log < 2) return;
    box(g, 292, 108, 282, 152, 'f-panel ' + (f.back ? 's-green' : 's-rule'));
    txt(g, 302, 124, 'Edit', 't', 11);
    txt(g, 302, 140, 'originalFile:', 't3', 9.5);
    V2.forEach((l, i) => txt(g, 312, 154 + i * 13, l, f.back ? 't' : 't2', 9.5));
    txt(g, 302, 202, 'structuredPatch:', 't3', 9.5);
    diff(V2, V3).filter(([s]) => s !== ' ').forEach(([s, l], i) => txt(g, 312, 216 + i * 13, s + ' ' + l, 't2', 9.5));
    if (f.back) S('path', { d: 'M292 150 C276 150 284 72 268 72 M275 67 L268 72 L275 77', class: 'f-none s-green', 'stroke-width': 1.8 }, g);
  }
}

define({ 'mem-path': MemPath, 'mem-index': MemIndex, 'mem-session': MemSession, 'mem-budget': MemBudget, 'mem-tally': MemTally, 'mem-undo': MemUndo });
