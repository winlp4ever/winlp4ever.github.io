// Figures for "How Claude Code records a session: transcripts and subagents".
// Field names, file names and counts were read from the author's ~/.claude on 19 Nov 2026;
// ids are shortened and paths are examples. Green = the thing the step is about.
import { S, H, attr, op, ease, seg, lerp, rng, wrap, drawOn, Figure, define, entrance, pills, stepper } from './core.js';

const txt = (p, x, y, text, cls = 't2', size = 11, extra = {}) => S('text', { x, y, class: cls, 'font-size': size, text, ...extra }, p);
const box = (p, x, y, w, h, cls = 'f-panel s-rule', extra = {}) => S('rect', { x, y, width: w, height: h, rx: 7, class: cls, 'stroke-width': 1.2, ...extra }, p);
const key = (svg, x, cls, label) => { S('rect', { x, y: 12, width: 10, height: 10, rx: 2, class: cls }, svg); txt(svg, x + 16, 21, label); };
const nb = (s) => s.replace(/^ +/, (m) => ' '.repeat(m.length)); // svg text drops leading spaces
// fill a column of text elements with wrapped paragraphs
const fill = (els, paras, max) => { const out = paras.flatMap((p, i) => [...(i ? [''] : []), ...wrap(p, max)]); els.forEach((t, j) => { t.textContent = out[j] || ''; }); };
// a figure whose rows and pills select the same thing
function chooser(fig, rows, labels, pick, start = 0) {
  const bar = pills(fig, labels.map((l, i) => [i, l]), start, (i) => go(i));
  const go = (i) => { bar.querySelectorAll('.pill').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i))); pick(i); };
  rows.forEach((g, i) => { g.setAttribute('class', 'click'); g.onclick = () => go(i); });
  go(start);
}

// ── fig 1 · the files one session leaves behind ────────────────────────────
// [tree line, pill, what it is, on the author's machine, description, deleted by the 30-day sweep?]
const FILES = [
  ['    9be769af….jsonl', 'transcript', 'the main transcript', '757 lines, 13.7 MB', 'One JSON record per line, appended while the session runs: prompts, replies, tool calls, tool results and bookkeeping.', 1],
  ['    9be769af…/subagents/agent-a58d….jsonl', 'subagent', 'a subagent transcript', '4 subagents: 42 to 167 lines', 'Same format, one file per subagent. A subagent’s records stay in its own file and never enter the main one.', 1],
  ['    9be769af…/subagents/agent-a58d….meta.json', 'meta', 'subagent metadata', 'agentType, spawnDepth, model', 'A small JSON file about one subagent: its type, the task label, how deep it was spawned and whether it finished.', 1],
  ['    9be769af…/tool-results/toolu_01JJ….txt', 'tool output', 'a spilled tool output', '1 file, 55 KB', 'A tool output too large to keep inline is written here, and the transcript keeps a pointer to it.', 1],
  ['    memory/MEMORY.md', 'memory', 'auto memory', 'empty for this project', 'Notes Claude keeps across sessions. Every session of the repository shares this folder.', 0],
  ['  file-history/9be769af…/88f0…@v3', 'backup', 'a checkpoint backup', '5 backups of 2 files', 'A copy of a file from before an edit, named by a hash and a version number. /rewind restores from these.', 1],
];
class TsFolder extends Figure {
  build() {
    const svg = this.svgRoot(600, 262, 'The files one Claude Code session leaves under ~/.claude, and what each one holds');
    txt(svg, 26, 26, '~/.claude/', 't3', 10); txt(svg, 26, 46, nb('  projects/-Users-me-workspace-site/'), 't3', 10);
    const ys = [66, 86, 106, 126, 146, 176];
    this.marks = []; this.rows = FILES.map((f, i) => {
      const g = S('g', {}, svg);
      S('rect', { x: 16, y: ys[i] - 13, width: 300, height: 18, fill: 'none', 'pointer-events': 'all' }, g);
      this.marks.push(S('rect', { x: 16, y: ys[i] - 12, width: 4, height: 16, rx: 2, class: 'f-green' }, g));
      txt(g, 26, ys[i], nb(f[0]), 't2', 10);
      return g;
    });
    box(svg, 330, 14, 254, 234);
    this.head = txt(svg, 344, 36, '', 't', 12);
    txt(svg, 344, 58, 'ON MY MACHINE', 'sl', 9); this.mine = txt(svg, 344, 73, '', 't2', 10.5);
    this.desc = [0, 1, 2, 3, 4, 5].map((j) => txt(svg, 344, 100 + j * 15, '', 't2', 10.5));
    txt(svg, 344, 206, 'AFTER 30 DAYS', 'sl', 9); this.swept = txt(svg, 344, 221, '', 't2', 10.5);
    this.swept2 = txt(svg, 344, 236, '', 't3', 10);
    chooser(this, this.rows, FILES.map((f) => f[1]), (i) => {
      const f = FILES[i];
      this.marks.forEach((m, j) => op(m, j === i ? 1 : 0));
      this.head.textContent = f[2]; this.mine.textContent = f[3]; fill(this.desc, [f[4]], 36);
      this.swept.textContent = f[5] ? 'deleted with the session' : 'kept';
      this.swept2.textContent = f[5] ? 'unless cleanupPeriodDays says otherwise' : 'until someone edits or deletes it';
    });
  }
}

// ── fig 2 · one record ─────────────────────────────────────────────────────
// lines are [text, note number]; values are shortened, field names are real
const RECORDS = [
  ['a prompt', [['{'], ['  "type": "user",'], ['  "uuid": "c694e535…",', 1], ['  "parentUuid": "f08a016c…",', 2], ['  "sessionId": "9be769af…",', 3], ['  "timestamp": "2026-11-19T21:29:46Z",', 3], ['  "cwd": "/Users/me/workspace/site",', 3], ['  "gitBranch": "main",', 3], ['  "version": "2.1.328",', 3], ['  "isSidechain": false,', 4], ['  "message": { "role": "user",'], ['    "content": "how does memory work" }'], ['}']],
    ['uuid names this record.', 'parentUuid names the record it follows.', 'Every record is stamped with its session, time, folder, branch and Claude Code version.', 'false in the main conversation, true in a subagent’s file.']],
  ['a reply', [['{'], ['  "type": "assistant",'], ['  "uuid": "3fb69280…",'], ['  "parentUuid": "c694e535…",'], ['  "requestId": "req_011ChCzs…",', 1], ['  "message": {'], ['    "model": "claude-fable-5-2",'], ['    "content": [{', 2], ['      "type": "tool_use",'], ['      "id": "toolu_01DAu7…",', 3], ['      "name": "Edit",'], ['      "input": { "file_path": "src/post.md", … } }],'], ['    "usage": {', 4], ['      "cache_read_input_tokens": 239808,'], ['      "output_tokens": 3012 } } }']],
    ['requestId ties the record to one API request.', 'content holds one block: thinking, text or a tool call. A reply with three blocks becomes three records.', 'The tool call’s id comes back in its result.', 'Token counts for the request, here from one of my turns.']],
  ['a tool result', [['{'], ['  "type": "user",', 1], ['  "uuid": "eaa3f7d1…",'], ['  "parentUuid": "3fb69280…",', 2], ['  "message": { "role": "user",'], ['    "content": [{'], ['      "type": "tool_result",'], ['      "tool_use_id": "toolu_01DAu7…",', 3], ['      "content": "updated src/post.md" }] },'], ['  "toolUseResult": {', 4], ['    "filePath": "src/post.md",'], ['    "originalFile": "…",'], ['    "structuredPatch": [ … ] }'], ['}']],
    ['A tool result is a user record: it is sent to the model in the user’s turn.', 'Its parent is the tool call it answers.', 'The same id as in the call.', 'A fuller copy kept for Claude Code itself. An Edit keeps the file from before the change.']],
  ['a file snapshot', [['{'], ['  "type": "file-history-snapshot",'], ['  "messageId": "c5666b14…",', 1], ['  "snapshot": {'], ['    "timestamp": "2026-11-19T22:14:19Z",'], ['    "trackedFileBackups": {', 2], ['      "src/post.md": {'], ['        "backupFileName": "88f0125b…@v3",', 3], ['        "version": 3 } } }'], ['}']],
    ['The prompt this snapshot belongs to. One snapshot is written per prompt.', 'Every file that file tools have edited so far in the session.', 'The backup’s name inside ~/.claude/file-history/<session>/.']],
  ['a compaction', [['{'], ['  "type": "system",'], ['  "subtype": "compact_boundary",'], ['  "uuid": "f3358e33…",'], ['  "parentUuid": null,', 1], ['  "logicalParentUuid": "48e2e4df…",', 2], ['  "content": "Conversation compacted",'], ['  "compactMetadata": {'], ['    "trigger": "auto",', 3], ['    "preTokens": 409043 }', 4], ['}']],
    ['No parent: the chain starts again here.', 'Points at the last record of the old chain, which is kept in the file.', 'auto, or manual after /compact.', 'The context held 409,043 tokens before this compaction, in one of my sessions.']],
];
class TsRecord extends Figure {
  build() {
    const svg = this.svgRoot(600, 264, 'One transcript record as JSON, with notes on its fields');
    box(svg, 16, 12, 330, 240);
    this.lines = Array.from({ length: 15 }, (_, j) => txt(svg, 40, 34 + j * 15, '', 't2', 10));
    this.dots = Array.from({ length: 15 }, (_, j) => { const g = S('g', {}, svg); S('circle', { cx: 29, cy: 30.5 + j * 15, r: 6, class: 'f-green' }, g); return [g, txt(g, 29, 34 + j * 15, '', 't', 9, { 'text-anchor': 'middle', style: 'fill:var(--bg)' })]; });
    this.notes = [0, 1, 2, 3].map((n) => { const g = S('g', {}, svg), y = 26 + n * 58; S('circle', { cx: 366, cy: y - 3.5, r: 6, class: 'f-green' }, g); txt(g, 366, y, String(n + 1), 't', 9, { 'text-anchor': 'middle', style: 'fill:var(--bg)' }); return [g, [0, 1, 2, 3].map((j) => txt(g, 380, y + j * 13, '', 't2', 10))]; });
    chooser(this, [], RECORDS.map((r) => r[0]), (i) => {
      const [, lines, notes] = RECORDS[i], seen = new Set();
      this.lines.forEach((t, j) => {
        const l = lines[j], n = l && l[1], first = n && !seen.has(n);
        t.textContent = l ? nb(l[0]) : ''; t.setAttribute('class', n ? 't' : 't2');
        if (first) seen.add(n);
        op(this.dots[j][0], first ? 1 : 0); this.dots[j][1].textContent = first ? n : '';
      });
      this.notes.forEach(([g, els], n) => { op(g, notes[n] ? 1 : 0); fill(els, notes[n] ? [notes[n]] : [], 33); });
    });
  }
}

// ── fig 3 · one turn, appended line by line ────────────────────────────────
// [appears at, type, what it holds, index of its parent]
const TURN = [
  [0.4, 'user', 'prompt: “fix the failing test”', null],
  [0.4, 'file-history-snapshot', 'files as they are before this turn', null],
  [2, 'assistant', 'thinking', 0],
  [3, 'assistant', 'tool_use: Read cart.test.js', 2],
  [3.6, 'assistant', 'tool_use: Bash npm test', 3],
  [5.2, 'user', 'tool_result for Read', 3],
  [6.4, 'user', 'tool_result for Bash', 4],
  [8.2, 'assistant', 'text: “the total was rounded twice”', 6],
  [9.4, 'system', 'turn_duration', 7],
];
class TsChain extends Figure {
  constructor() { super(); this.duration = 12; this.loop = false; this.poster = 12; }
  build() {
    const svg = this.svgRoot(600, 300, 'One turn of a session written to the transcript as nine records, each linked to its parent');
    txt(svg, 86, 22, 'TYPE', 'sl', 9); txt(svg, 262, 22, 'WHAT IT HOLDS', 'sl', 9); txt(svg, 584, 22, 'PARENT', 'sl', 9, { 'text-anchor': 'end' });
    const y = (i) => 44 + i * 26;
    this.rows = TURN.map(([, type, what, p], i) => {
      const g = S('g', {}, svg);
      box(g, 76, y(i) - 15, 508, 22);
      txt(g, 24, y(i), String(i + 1), 't3', 10, { 'text-anchor': 'end' });
      txt(g, 86, y(i), type, 't', 10.5); txt(g, 262, y(i), what, 't2', 10.5);
      txt(g, 574, y(i), p == null ? (i ? 'none' : 'last turn') : 'line ' + (p + 1), 't3', 10, { 'text-anchor': 'end' });
      // parentUuid drawn as an arc on the left; a skipped line means a fork
      const d = p == null ? null : 10 + (i - p) * 9, fork = p != null && TURN.filter((r) => r[3] === p).length > 1 && i - p > 1;
      const arc = d && S('path', { d: `M76 ${y(i) - 4} C${76 - d * 1.6} ${y(i) - 4} ${76 - d * 1.6} ${y(p) - 4} 76 ${y(p) - 4}`, class: 'f-none ' + (fork ? 's-green' : 's-ink3'), 'stroke-width': fork ? 1.8 : 1.3 }, svg);
      return { g, arc, at: TURN[i][0] };
    });
    this.hand = txt(svg, 330, 290, 'two tool calls in one reply fork the chain', 'hand', 14.5, { 'text-anchor': 'middle' });
  }
  label(t) { const n = TURN.filter((r) => t >= r[0]).length; return `${n} of ${TURN.length} lines`; }
  render(t) {
    this.rows.forEach((r) => { op(r.g, seg(t, r.at, r.at + .5)); if (r.arc) drawOn(r.arc, seg(t, r.at + .3, r.at + 1)); });
    op(this.hand, seg(t, 10.4, 11));
  }
}

// ── fig 4 · what fills one transcript ──────────────────────────────────────
// [what, megabytes, lines] for one 13.7 MB, 757-line transcript
const BYTES = [
  ['user records: prompts and tool results', 8.55, 90],
  ['request records: what was sent to the model', 4.02, 105],
  ['assistant records: thinking, text, tool calls', 0.59, 137],
  ['attachments: what Claude Code added to the context', 0.39, 48],
  ['everything else: snapshots, titles, modes, timings', 0.13, 377],
];
class TsBytes extends Figure {
  build() {
    const svg = this.svgRoot(600, 246, 'The share of one 13.7 MB transcript taken by each kind of record');
    key(svg, 20, 'f-green', 'megabytes'); txt(svg, 580, 21, 'lines', 't3', 11, { 'text-anchor': 'end' });
    this.rows = BYTES.map(([n, mb, lines], i) => {
      const y = 50 + i * 40;
      txt(svg, 20, y, n, 't', 11.5); txt(svg, 580, y + 17, String(lines), 't3', 11, { 'text-anchor': 'end' });
      return { r: S('rect', { x: 20, y: y + 7, height: 12, rx: 2, class: 'f-green' }, svg), t: txt(svg, 0, y + 17, mb.toFixed(2) + ' MB', 't2', 11), w: mb / 8.55 * 400 };
    });
    txt(svg, 470, 160, 'half the lines,', 'hand', 14, { 'text-anchor': 'middle' }); txt(svg, 470, 178, '1% of the bytes', 'hand', 14, { 'text-anchor': 'middle' });
    entrance(this, (k) => this.rows.forEach((b, i) => {
      const kk = ease(seg(k, i * 0.1, i * 0.1 + 0.55)), w = lerp(0, b.w, kk);
      b.r.setAttribute('width', Math.max(w, 2 * kk)); b.t.setAttribute('x', 26 + w); op(b.t, kk);
    }));
  }
}

// ── fig 5 · compaction: the context shrinks, the file doesn't ──────────────
// a made-up session: each turn adds 4k to 40k tokens; past LIMIT the context is replaced by a summary
const LIMIT = 400, SUMMARY = 30, TURNS = 60;
const SIM = (() => {
  const r = rng(11), out = []; let ctx = 20, since = 0;
  for (let i = 0; i < TURNS; i++) {
    const add = Math.round(4 + r() * 36); let cut = false;
    if (ctx + add > LIMIT) { ctx = SUMMARY; since = i; cut = true; }
    ctx += add; out.push({ ctx, since, cut });
  }
  return out;
})();
class TsCompact extends Figure {
  build() {
    const svg = this.svgRoot(600, 250, 'A simulated session: the context sent to the model grows each turn and drops at each compaction, while the transcript keeps every turn');
    txt(svg, 20, 24, 'CONTEXT SENT TO THE MODEL', 'sl', 9.5);
    box(svg, 20, 34, 560, 26, 'f-none s-rule'); this.bar = S('rect', { x: 20, y: 34, height: 26, rx: 7, class: 'f-green' }, svg);
    S('line', { x1: 580, x2: 580, y1: 28, y2: 66, class: 's-ochre', 'stroke-width': 2 }, svg); txt(svg, 580, 80, 'compaction threshold', 't3', 10, { 'text-anchor': 'end' });
    this.ctx = txt(svg, 20, 80, '', 't', 11.5);
    txt(svg, 20, 116, 'TRANSCRIPT ON DISK · ONE SQUARE PER TURN', 'sl', 9.5);
    this.cells = SIM.map((s, i) => S('rect', { x: 20 + (i % 30) * 18.7, y: 126 + Math.floor(i / 30) * 19, width: 15, height: 15, rx: 3 }, svg));
    this.cuts = SIM.map((s, i) => s.cut ? S('rect', { x: 17.5 + (i % 30) * 18.7, y: 124 + Math.floor(i / 30) * 19, width: 2.4, height: 19, rx: 1, class: 'f-ochre' }, svg) : null);
    this.out = [0, 1].map((i) => txt(svg, 20, 188 + i * 18, '', 't2', 11.5));
    this.hand = txt(svg, 580, 240, '', 'hand', 14.5, { 'text-anchor': 'end' });
    this.idleText = 'interactive';
    const bar = H('div', { class: 'fc' }, this), lab = H('label', { class: 'pill', text: 'turn ' }, bar), o = H('span', { text: '24' }, lab);
    this.s = H('input', { type: 'range', min: 1, max: TURNS, value: 24, 'aria-label': 'turn of the session' }, bar);
    this.s.oninput = () => { o.textContent = this.s.value; this.paint(); };
    this.paint();
  }
  paint() {
    const n = +this.s.value, s = SIM[n - 1], cuts = SIM.slice(0, n).filter((x) => x.cut).length;
    attr(this.bar, { width: (s.ctx / LIMIT * 560).toFixed(1) });
    this.ctx.textContent = `${s.ctx}k tokens after turn ${n}`;
    this.cells.forEach((c, i) => c.setAttribute('class', i >= n ? 'f-rule2' : i >= s.since ? 'f-green' : 'f-ink3'));
    this.cuts.forEach((c, i) => c && op(c, i < n ? 1 : 0));
    const span = (a, b) => a === b ? `turn ${a}` : `turns ${a} to ${b}`;
    this.out[0].textContent = `on disk: ${n === 1 ? '1 turn' : `all ${n} turns`}, ${cuts} compaction ${cuts === 1 ? 'boundary' : 'boundaries'}`;
    this.out[1].textContent = cuts ? `in context: a summary of turns 1 to ${s.since}, then ${span(s.since + 1, n)} in full` : `in context: ${span(1, n)} in full`;
    this.hand.textContent = cuts ? 'grey turns are on disk, summarized in context' : '';
  }
}

// ── fig 6 · snapshots and rewind ───────────────────────────────────────────
// which files each prompt's turn edited, and with what; a shell edit is not tracked
const PROMPTS = ['add a cart total', 'round to cents', 'write the docs', 'rename the helper'];
const EDITS = [[['cart.js', 'Edit']], [['cart.js', 'Edit'], ['out.log', 'Bash']], [['README.md', 'Write']], [['cart.js', 'Edit'], ['README.md', 'Edit']]];
const TRACKED = ['cart.js', 'README.md', 'out.log'];
// version of a file after the first k turns: 1 = as it was before the session, +1 per file-tool edit
const verAt = (file, k) => 1 + EDITS.slice(0, k).filter((t) => t.some(([f, tool]) => f === file && tool !== 'Bash')).length;
class TsRewind extends Figure {
  build() {
    const svg = this.svgRoot(600, 282, 'Four prompts, the files each turn edited, and the file versions a rewind to each prompt restores');
    txt(svg, 20, 24, 'SNAPSHOT TAKEN AT', 'sl', 9.5);
    this.cols = PROMPTS.map((p, k) => {
      const x = 128 + k * 116, g = S('g', {}, svg);
      const r = box(g, x, 34, 108, 172);
      txt(g, x + 10, 52, 'prompt ' + (k + 1), 't', 11); wrap(p, 16).forEach((l, j) => txt(g, x + 10, 66 + j * 12, l, 't3', 9.5));
      const cells = TRACKED.map((f, i) => txt(g, x + 10, 112 + i * 30, '', 't2', 10.5));
      return { g, r, cells };
    });
    TRACKED.forEach((f, i) => txt(svg, 20, 112 + i * 30, f, 't', 11));
    txt(svg, 20, 186, 'changed by Bash', 't3', 9);
    this.out = [0, 1, 2].map((i) => txt(svg, 20, 232 + i * 17, '', i ? 't2' : 't', 11.5));
    chooser(this, this.cols.map((c) => c.g), PROMPTS.map((_, k) => 'rewind to prompt ' + (k + 1)), (k) => {
      this.cols.forEach((c, j) => {
        c.r.setAttribute('class', 'f-panel ' + (j === k ? 's-green' : 's-rule')); op(c.g, j > k ? .55 : 1);
        TRACKED.forEach((f, i) => { c.cells[i].textContent = f === 'out.log' ? 'not tracked' : 'v' + verAt(f, j); c.cells[i].setAttribute('class', j === k && f !== 'out.log' ? 't' : 't3'); });
      });
      const back = TRACKED.filter((f) => f !== 'out.log' && verAt(f, k) < verAt(f, PROMPTS.length));
      this.out[0].textContent = `restore code: ${back.length ? back.map((f) => `${f} back to v${verAt(f, k)}`).join(', ') : 'nothing to restore'}`;
      this.out[1].textContent = `restore conversation: prompt ${k + 1} and everything after it leave the context`;
      this.out[2].textContent = 'out.log stays as the shell command left it';
    }, 1);
  }
}

// ── fig 7 · what each kind of agent starts with ────────────────────────────
// rows: [what, main session, fresh subagent, Explore, fork]; a leading "-" means it doesn't get it, "?" that the docs don't say
const KINDS = ['main session', 'fresh subagent', 'Explore', 'fork'];
const STARTS = [
  ['system prompt', 'Claude Code’s', 'its own, from the agent definition', 'its own, built in', '?not stated in the docs'],
  ['CLAUDE.md files', 'the full hierarchy', 'the full hierarchy, unless omitClaudeMd', '-skipped', 'whatever the parent has loaded'],
  ['auto memory index', 'first 200 lines or 25 KB', '-not loaded', '-not loaded', 'loaded, as in the parent'],
  ['conversation so far', 'all of it', '-none', '-none', 'all of the parent’s'],
  ['first message', 'your prompt', 'a task written by the parent', 'a task written by the parent', 'a task written by the parent'],
  ['tools', 'everything configured', 'the parent’s, narrowed by the definition', 'read-only: no Write or Edit', 'the parent’s exact tool pool'],
  ['model', 'the one you picked', 'from the definition, or inherited', 'the parent’s', 'the parent’s'],
];
class TsStart extends Figure {
  build() {
    const svg = this.svgRoot(600, 276, 'What a main session, a fresh subagent, the Explore agent and a fork each have in context when they start');
    key(svg, 20, 'f-green', 'in its context at the start'); S('rect', { x: 250, y: 12, width: 10, height: 10, rx: 2, class: 'f-none s-ink3', 'stroke-dasharray': '3 2' }, svg); txt(svg, 266, 21, 'absent'); key(svg, 340, 'f-ink3', 'unknown');
    this.rows = STARTS.map((r, i) => {
      const y = 34 + i * 34;
      const b = box(svg, 16, y, 568, 28), dot = S('rect', { x: 26, y: y + 9, width: 10, height: 10, rx: 2 }, svg);
      txt(svg, 46, y + 18, r[0], 't', 11.5);
      return { b, dot, v: txt(svg, 216, y + 18, '', 't2', 10.5) };
    });
    chooser(this, [], KINDS, (k) => this.rows.forEach((r, i) => {
      const v = STARTS[i][k + 1], off = v[0] === '-', unk = v[0] === '?';
      r.v.textContent = off || unk ? v.slice(1) : v; r.v.setAttribute('class', off || unk ? 't3' : 't2');
      r.dot.setAttribute('class', off ? 'f-none s-ink3' : unk ? 'f-ink3' : 'f-green'); attr(r.dot, { 'stroke-dasharray': off ? '3 2' : 'none' });
      attr(r.b, { 'stroke-dasharray': off ? '5 3' : 'none' });
    }));
  }
}

// ── fig 8 · the life of one subagent ───────────────────────────────────────
// the docs fact-check agent of the session this post came from: 58 lines, then 88 after a resume
const LIFE = [
  { main: ['assistant · tool_use: Agent'], lines: 0, meta: 'finished: no', text: 'The main session calls the Agent tool with a task. Claude Code creates agent-a58d….jsonl and a meta file: agentType claude-code-guide, spawnDepth 1, background.' },
  { main: ['assistant · tool_use: Agent', 'user · tool_result: launched, agent id'], lines: 31, meta: 'finished: no', text: 'The subagent works. Its prompts, tool calls and results go into its own file, marked isSidechain: true. The main transcript gets the launch result and nothing else.' },
  { main: ['assistant · tool_use: Agent', 'user · tool_result: launched, agent id', 'assistant · tool_use: Bash tail …'], lines: 44, peek: 1, meta: 'finished: no', text: 'Asked for progress, the main session reads the end of the subagent’s file. You can do the same from /tasks, where Enter opens the transcript.' },
  { main: ['assistant · tool_use: Agent', 'user · tool_result: launched, agent id', 'assistant · tool_use: Bash tail …', 'the final report, as a message'], lines: 58, back: 1, meta: 'finished: yes', text: 'The subagent finishes after 58 lines. Its final message arrives in the main session as a completion notification. The subagent sends nothing else back.' },
  { main: ['assistant · tool_use: Agent', 'user · tool_result: launched, agent id', 'assistant · tool_use: Bash tail …', 'the final report, as a message', 'assistant · tool_use: SendMessage'], lines: 88, send: 1, meta: 'finished: yes', text: 'An hour later the main session sends it a second question with SendMessage. The subagent resumes with its history intact, and the same file grows to 88 lines.' },
];
class TsLife extends Figure {
  build() {
    const svg = this.svgRoot(600, 322, 'A subagent from launch to resume: what is written to the main transcript and what is written to the subagent’s own file');
    txt(svg, 16, 24, 'MAIN TRANSCRIPT', 'sl', 9.5); txt(svg, 340, 24, 'subagents/agent-a58d….jsonl', 'sl', 9.5);
    box(svg, 16, 34, 290, 176, 'f-none s-rule'); box(svg, 340, 34, 244, 176, 'f-none s-rule');
    this.g = S('g', {}, svg);
    this.lines = [0, 1, 2].map((i) => txt(svg, 20, 278 + i * 16, '', 't2', 11.5));
    this.idleText = 'interactive';
    this.step = stepper(this, (i) => this.draw(LIFE[i], i));
    this.step.set(LIFE.length);
  }
  draw(f, step) {
    const g = this.g; g.replaceChildren();
    fill(this.lines, [f.text], 80);
    f.main.forEach((l, i) => { const last = i === f.main.length - 1; box(g, 26, 44 + i * 32, 270, 24, 'f-panel ' + (last ? 's-green' : 's-rule')); txt(g, 36, 60 + i * 32, l, last ? 't' : 't2', 10); });
    // the subagent's file as a column that fills with lines
    const h = f.lines / 88 * 136;
    box(g, 356, 48, 60, 140, 'f-none s-ink3'); if (h) S('rect', { x: 358, y: 186 - h, width: 56, height: h, rx: 5, class: 'f-green' }, g);
    txt(g, 430, 64, f.lines + ' lines', 't', 12); txt(g, 430, 82, f.lines ? 'isSidechain: true' : 'file created', 't3', 10);
    txt(g, 430, 150, 'agent-a58d….meta.json', 't3', 9.5); txt(g, 430, 164, f.meta, 't2', 10);
    const y = 56 + (f.main.length - 1) * 32;
    if (step === 0) S('path', { d: `M296 ${y} H340 M333 ${y - 4} L340 ${y} L333 ${y + 4}`, class: 'f-none s-green', 'stroke-width': 1.8 }, g);
    if (f.peek || f.send) S('path', { d: `M296 ${y} C330 ${y} 326 176 354 176 M347 172 L354 176 L347 180`, class: 'f-none ' + (f.send ? 's-green' : 's-ink3'), 'stroke-width': 1.8, ...(f.peek && { 'stroke-dasharray': '4 3' }) }, g);
    if (f.back) S('path', { d: `M356 120 C326 120 330 ${y} 298 ${y} M305 ${y - 4} L298 ${y} L305 ${y + 4}`, class: 'f-none s-green', 'stroke-width': 1.8 }, g);
    txt(g, 16, 232, ['spawn', 'work', 'a progress check', 'the report comes back', 'resume'][step], 'hand', 15);
  }
}

// ── fig 9 · what a subagent reads and what it returns ──────────────────────
// [who, tokens in context at its largest request, report characters, tool calls], from one session
const RETURNS = [
  ['docs fact-check · Haiku', 126566, 9531, 16],
  ['review of the memory post · Fable', 167262, 7969, 30],
  ['its web-fetch helper · Haiku', 84517, 4870, 7],
  ['review of this post · Fable', 170247, 8795, 35],
];
class TsReturn extends Figure {
  build() {
    const svg = this.svgRoot(600, 262, 'Four subagents: the tokens each had in context and the much smaller report each returned');
    key(svg, 20, 'f-ink3', 'tokens in the subagent’s context'); key(svg, 290, 'f-green', 'tokens returned to the main session');
    this.rows = RETURNS.map(([n, ctx, chars, tools], i) => {
      const y = 52 + i * 52, back = Math.round(chars / 4);
      txt(svg, 20, y, n, 't', 11.5); txt(svg, 580, y, tools + ' tool calls', 't3', 10.5, { 'text-anchor': 'end' });
      return {
        a: S('rect', { x: 20, y: y + 7, height: 10, rx: 2, class: 'f-ink3' }, svg), at: txt(svg, 0, y + 16, ctx.toLocaleString('en'), 't2', 10.5), aw: ctx / 170247 * 440,
        b: S('rect', { x: 20, y: y + 20, height: 10, rx: 2, class: 'f-green' }, svg), bt: txt(svg, 0, y + 29, `about ${back.toLocaleString('en')} (${(back / ctx * 100).toFixed(1)}%)`, 't', 10.5), bw: back / 170247 * 440,
      };
    });
    entrance(this, (k) => this.rows.forEach((r, i) => {
      const ka = ease(seg(k, i * 0.1, i * 0.1 + 0.5)), kb = ease(seg(k, i * 0.1 + 0.3, i * 0.1 + 0.7));
      attr(r.a, { width: r.aw * ka }); attr(r.at, { x: 26 + r.aw * ka }); op(r.at, ka);
      attr(r.b, { width: Math.max(r.bw * kb, 2 * kb) }); attr(r.bt, { x: 28 + r.bw * kb }); op(r.bt, kb);
    }));
  }
}

// ── fig 10 · one session's subagents as a tree ─────────────────────────────
// [label, x, y, parent index, line 1, line 2], read from the meta files of one session
const TREE = [
  ['main session', 225, 20, null, 'the conversation you type into · Fable', 'it started three subagents, all in the background'],
  ['docs fact-check', 50, 96, 0, 'claude-code-guide · Haiku · depth 1 · background', '88 lines, 16 tool calls, resumed once with SendMessage'],
  ['review, memory post', 225, 96, 0, 'general-purpose · Fable · depth 1 · background', '134 lines, 30 tool calls, started one subagent itself'],
  ['review, this post', 400, 96, 0, 'general-purpose · Fable · depth 1 · background', '167 lines, 35 tool calls'],
  ['web-fetch helper', 225, 172, 2, 'web-fetch · Haiku · depth 2 · foreground', '42 lines, 7 tool calls; its parent waited for it'],
];
class TsTree extends Figure {
  build() {
    const svg = this.svgRoot(600, 268, 'The subagents of one session as a tree: three started by the main session and one started by a subagent');
    ['MAIN', 'DEPTH 1', 'DEPTH 2'].forEach((l, i) => txt(svg, 584, 41 + i * 76, l, 'sl', 9, { 'text-anchor': 'end' }));
    TREE.forEach(([, x, y, p]) => { if (p != null) S('path', { d: `M${TREE[p][1] + 65} ${TREE[p][2] + 34} C${TREE[p][1] + 65} ${y - 14} ${x + 65} ${TREE[p][2] + 48} ${x + 65} ${y}`, class: 'f-none s-ink3', 'stroke-width': 1.3 }, svg); });
    this.boxes = []; const rows = TREE.map(([n, x, y]) => {
      const g = S('g', {}, svg); this.boxes.push(box(g, x, y, 130, 34)); txt(g, x + 65, y + 21, n, 't', 10, { 'text-anchor': 'middle' });
      return g;
    });
    this.out = [0, 1].map((i) => txt(svg, 20, 238 + i * 18, '', i ? 't2' : 't', 11.5));
    chooser(this, rows, TREE.map((t) => t[0]), (i) => {
      this.boxes.forEach((b, j) => b.setAttribute('class', 'f-panel ' + (j === i ? 's-green' : 's-rule')));
      this.out[0].textContent = TREE[i][4]; this.out[1].textContent = TREE[i][5];
    }, 2);
  }
}

define({ 'ts-folder': TsFolder, 'ts-record': TsRecord, 'ts-chain': TsChain, 'ts-bytes': TsBytes, 'ts-compact': TsCompact, 'ts-rewind': TsRewind, 'ts-start': TsStart, 'ts-life': TsLife, 'ts-return': TsReturn, 'ts-tree': TsTree });
