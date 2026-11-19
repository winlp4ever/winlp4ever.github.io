---
title: How Claude Code records a session, and what a subagent is
date: 2026-11-19T23:30:00Z
description: A Claude Code session is a file of JSON records, one per line. This lesson reads that file on my laptop, then uses it to explain resume, compaction, rewind and subagents, with the key terms defined as they come up.
tags: [ai, agents, claude-code, subagents]
category: ai
glyph: log
figures: 10
---

My last post covered Claude Code's memory, the notes it keeps between sessions<sup><a href="#src-8">8</a></sup>. This one covers the record of a single session, and then subagents, which are recorded the same way. I wrote it as a lesson: each term is defined where it first appears, and most figures are built from files on my laptop as they were on 19 November 2026, running Claude Code 2.1.328. Where the docs say something, I cite them. Where I only saw it on disk, I say so, because the docs call the record format internal and warn that it changes between versions<sup><a href="#src-1">1</a></sup>.

## a session is a file

A **session** is one conversation with Claude Code, from the first prompt until you leave it. A **transcript** is the file that records it. Claude Code stores transcripts as JSONL at `~/.claude/projects/<project>/<session-id>.jsonl`<sup><a href="#src-1">1</a></sup>. **JSONL** means one JSON object per line. I'll call each line a **record**.

Two properties of that file explain most of what follows. It is append-only: a new record goes at the end, and old records aren't rewritten. And it sits on disk outside the model, so anything that can read a file can read a session: Claude Code when you resume, you with `grep`, another session, a subagent.

A session leaves a few more files next to its transcript.

<figure class="wide">
<ts-folder data-fig data-label="fig 1 · the files of one session">
<p class="fallback">The files one session leaves under ~/.claude. In projects/&lt;project&gt;/: the main transcript &lt;session-id&gt;.jsonl (757 lines and 13.7 MB on my machine); a folder &lt;session-id&gt;/subagents/ with one transcript and one small metadata file per subagent (four subagents, of 42 to 167 lines); a folder &lt;session-id&gt;/tool-results/ for tool outputs too large to keep inline (one file of 55 KB); and the project's memory folder, shared by all sessions. In file-history/&lt;session-id&gt;/: backups of files from before each edit (5 backups of 2 files). After 30 days by default, everything except memory is deleted together with the session.</p>
</ts-folder>
<figcaption><b>fig 1</b>One session of mine and the files it left. <span class="m">Paths and sizes are from the session that wrote my last post, with ids shortened. The folder layout and the 30-day cleanup are in the docs<sup><a href="#src-5">5</a></sup>. Pick a file to see what it holds.</span></figcaption>
</figure>

## one record

The docs describe a transcript line as a message, a tool use or result, a record of a request Claude Code sent the model, or a metadata entry<sup><a href="#src-1">1</a></sup>. On my disk every record has a `type`, and the conversation itself uses two of them. A `user` record holds something sent to the model in the user's turn: your prompt, or the result of a tool. An `assistant` record holds one block of the model's reply: its thinking, its text, or a **tool call**, which is the model asking Claude Code to run a tool such as Read or Bash.

<figure class="wide">
<ts-record data-fig data-label="fig 2 · one record">
<p class="fallback">Five kinds of record, each shown as JSON. A prompt is a user record with a uuid, a parentUuid, and stamps for session, time, folder, git branch and Claude Code version; isSidechain is false in the main conversation. A reply is an assistant record tied to one API request, holding one content block (here a tool call with an id) and token counts: 239,808 tokens read from cache and 3,012 written in one of my turns. A tool result is also a user record; its parent is the tool call, it repeats the call's id, and a toolUseResult field keeps a fuller copy, which for an Edit includes originalFile and structuredPatch. A file snapshot names the prompt it belongs to and lists, for each file edited so far, a backup name such as 88f0125b…@v3. A compaction boundary is a system record with no parent, a logicalParentUuid that points at the old chain's last record, a trigger (auto) and preTokens (409,043).</p>
</ts-record>
<figcaption><b>fig 2</b>Five kinds of record. <span class="m">Field names are the ones in my transcripts. I shortened the ids and values and left out about a dozen bookkeeping fields. The docs don't document these fields.</span></figcaption>
</figure>

Three fields carry the structure. `uuid` names a record. `parentUuid` names the record it follows. `sessionId` names the session, and it equals the file name in every transcript I checked.

## records form a chain

Following `parentUuid` from the newest record back to the first gives the conversation in order. That newest record is the **leaf**, and the path from it to the start is what gets sent to the model.

In my transcripts a record's parent was the record written just before it 104,677 times out of 107,221, about 98% of the time. The field is called parent, and not previous, because of the other 2%. Two things make the chain a tree. A reply that calls two tools at once is saved as separate records, and each result attaches to its own call. And going back to an earlier prompt to send a different one leaves the old continuation in the file as a side branch: I found 18 records in my transcripts with two prompts as children, the shape a rewind followed by a new prompt would leave. The docs don't say how a rewind is stored.

The line above a record is whatever was written before it. Its parent is the record it continues from. To rebuild a conversation, Claude Code follows parents from the leaf and skips the side branches.

<figure class="wide">
<ts-chain data-fig data-label="fig 3 · one turn">
<p class="fallback">One turn written as nine records. Line 1 is the user's prompt, "fix the failing test". Line 2 is a file-history snapshot of the files before the turn. Line 3 is an assistant record with thinking, whose parent is line 1. Lines 4 and 5 are two tool calls from the same reply, Read and Bash: line 4's parent is line 3 and line 5's parent is line 4. Line 6 is the result for Read, and its parent is line 4, so line 4 has two children. Line 7 is the result for Bash, child of line 5. Line 8 is the assistant's text answer, child of line 7. Line 9 is a system record with the turn's duration.</p>
</ts-chain>
<figcaption><b>fig 3</b>A turn becomes nine lines, and one of them has two children. <span class="m">I wrote this turn by hand. The linking is copied from a real turn in my transcript, where a reply with a Bash call and an Agent call was stored the same way.</span></figcaption>
</figure>

A **turn** is one prompt and everything Claude does before it hands control back. Fig 3 also shows records that aren't conversation: a snapshot before the turn and a timing record after it.

## what fills the file

One of my sessions produced a 13.7 MB transcript in 757 lines. Across my machine there are 136 transcripts adding up to 5.3 GB. The median is 653 KB and the largest is 1.57 GB.

<figure class="wide">
<ts-bytes data-fig data-label="fig 4 · what fills one transcript">
<p class="fallback">One 13.7 MB transcript of 757 lines, by kind of record. User records, which hold prompts and tool results, take 8.55 MB in 90 lines. Request records, which log what was sent to the model, take 4.02 MB in 105 lines. Assistant records take 0.59 MB in 137 lines. Attachments, the context Claude Code adds by itself, take 0.39 MB in 48 lines. Everything else, such as snapshots, titles, modes and timings, takes 0.13 MB in 377 lines.</p>
</ts-bytes>
<figcaption><b>fig 4</b>Tool results take most of the bytes, and bookkeeping takes half the lines. <span class="m">Measured on the transcript of the session that wrote my last post. Most of the 8.55 MB is screenshots that Claude read to check figures.</span></figcaption>
</figure>

**The model wrote 0.59 MB of that file, about 4%.** Most of a transcript is what tools returned.

The file is also what makes the model look like it remembers the conversation. A model keeps nothing between requests. For every reply, Claude Code sends the whole conversation again. The **context window** is what one request contains: system prompt, instructions, the conversation so far and the new message. In one of my turns the request read 239,808 tokens from the prompt cache, added 8,878 new ones and got 3,012 back. A **token** is the unit a model reads and writes, roughly three quarters of a word.

## compaction

A conversation that keeps growing reaches the context window's limit. **Compaction** replaces the conversation with a structured summary, either when you run `/compact` or automatically as you approach the limit<sup><a href="#src-4">4</a></sup>.

On disk nothing is removed. Claude Code appends a `compact_boundary` record with no parent, then a summary, and the chain continues from there. The boundary keeps a `logicalParentUuid` that points at the old chain's last record.

Those two fields do different jobs at a boundary. With `parentUuid` set to null, a walk back from the leaf stops there, so only the summary and later records are loaded into context. `logicalParentUuid` keeps the link to what came before, so the full history can be traced. In the transcripts I scanned, every record that has a `logicalParentUuid` is a compaction boundary. This is my reading of the files, and the docs describe neither field.

My transcripts hold 173 of these boundaries, and one of them recorded 409,043 tokens of context before it ran.

<figure class="wide">
<ts-compact data-fig data-label="fig 5 · compaction">
<p class="fallback">A simulated session of 60 turns. Each turn adds between 4,000 and 40,000 tokens to the context. When the next turn would pass 400,000 tokens, the context is replaced by a 30,000-token summary and keeps growing from there. The transcript on disk keeps one entry for every turn and gains a boundary marker at each compaction. The session compacts three times, at turns 17, 34 and 50. After turn 24 the context holds 174,000 tokens, a summary of turns 1 to 16 and turns 17 to 24 in full, while the transcript holds all 24 turns.</p>
</ts-compact>
<figcaption><b>fig 5</b>The context drops at each compaction, and the transcript keeps growing. <span class="m">I made the numbers up: the token sizes, the 400k threshold and the 30k summary are illustrative. The figure runs the simulation in your browser. Drag the slider to move through the session.</span></figcaption>
</figure>

When a compacted session is resumed, it opens at the "Conversation compacted" row, and the messages that compaction summarized aren't loaded again<sup><a href="#src-1">1</a></sup>. They are in the file if you want to search them.

## resume, branch and fork a session

Because a session is a file, resuming and branching a conversation are file operations.

**Resume** reopens a session under the same session ID and appends new messages to the existing conversation<sup><a href="#src-2">2</a></sup>. `claude --continue` resumes the latest one, and `claude --resume` or `/resume` lets you pick. It restores the messages, tool calls and results, along with the model and permission mode. A tool call that was interrupted isn't rerun, and a background subagent that died with the process comes back as a note that it didn't finish<sup><a href="#src-1">1</a></sup>.

`/branch` creates a copy of the conversation so far and switches you into it, leaving the original intact<sup><a href="#src-1">1</a></sup>. `--fork-session` does the same at startup: when resuming, it creates a new session ID instead of reusing the original<sup><a href="#src-7">7</a></sup>.

## file history and rewind

A transcript records what was said. **File history** records what the files looked like. Before Claude Code changes a file with one of its file editing tools, it saves a copy under `~/.claude/file-history/<session-id>/`, and each prompt gets a **snapshot** record that lists which backup of each file was current at that point. A **checkpoint** is that pair: a place in the conversation plus the files as they were then.

A backup is a whole copy of the file, with a name like `88f0125b…@v3`. The first part is the same for every backup of one file, so I take it to be a hash of the file's path. The `@v3` part tells the copies apart: without it each new backup would overwrite the last, and there would be one state to go back to. In the session that wrote my last post, that post has backups `@v2` to `@v5`.

A snapshot is tied to a prompt. Its `messageId` holds the `uuid` of a `user` record, and in that session all 35 snapshots pointed at one of my prompts. It is written when the prompt is sent, before Claude acts on it, so it describes the files at the start of that turn. Tool calls and replies in the middle of a turn get no snapshot of their own.

Write and Edit both count as file editing tools: I created my last post with Write, and its tracking started at that call. A file that only shell commands have changed is never tracked. Once a file tool has touched a file, later shell changes to it are captured too<sup><a href="#src-3">3</a></sup>. That post's later versions came from scripts run through Bash, and each got a backup at the next prompt.

`/rewind` goes back to a checkpoint. It can restore the code, the conversation, or both<sup><a href="#src-3">3</a></sup>. Restoring the code copies back the backups that the prompt's snapshot lists.

<figure class="wide">
<ts-rewind data-fig data-label="fig 6 · snapshots and rewind">
<p class="fallback">Four prompts and the snapshot taken at each. Prompt 1 edits cart.js. Prompt 2 edits cart.js again and a shell command writes out.log. Prompt 3 writes README.md. Prompt 4 edits both files. The snapshot at prompt 1 holds cart.js v1 and README.md v1, at prompt 2 cart.js v2, at prompt 3 cart.js v3, at prompt 4 cart.js v3 and README.md v2. Rewinding to prompt 2 restores cart.js to v2 and README.md to v1, and prompt 2 with everything after it leaves the context. out.log was changed only by a shell command, so it isn't tracked and stays as it is.</p>
</ts-rewind>
<figcaption><b>fig 6</b>A rewind restores the versions listed in that prompt's snapshot. <span class="m">The session is an example I wrote. The figure computes each version from the list of edits, and v1 stands for a file as it was before the session. The rules are from the docs<sup><a href="#src-3">3</a></sup>: file editing tools are tracked, and a file that only Bash commands changed isn't.</span></figcaption>
</figure>

Snapshots are bookkeeping for Claude Code and for you. They aren't sent to the model, so they cost no tokens and Claude doesn't see them while it works. Compaction leaves them alone for the same reason: it summarizes the conversation in the context, and snapshots were never in it. I haven't tested whether `/rewind` can reach a prompt from before a compaction.

The history has two limits. Claude Code keeps the 100 most recent checkpoints, and a session's backups are deleted about 30 days after it last saved one<sup><a href="#src-3">3</a></sup>. Each session has a backup folder of its own. The docs say plainly that this is not a replacement for version control<sup><a href="#src-3">3</a></sup>.

## subagents

A **subagent** is a second Claude that the main session starts to do one task. The main session calls a tool named Agent with a written task, the subagent runs its own loop of tool calls and replies, and its last message comes back.

The reason to use one is the context window. Searching a codebase or checking a claim against documentation means reading a lot of text that the main conversation has no use for afterwards. A subagent reads it in a context of its own and returns the conclusion. Independent tasks can also run side by side.

Three terms describe the exchange:

- The **agent definition** is a Markdown file with frontmatter. Its body becomes the subagent's system prompt, in place of Claude Code's own.
- The **task** is the message the main session writes. It is the only part of your conversation the subagent ever sees.
- The **final report** is the subagent's last message. It goes back to the main session, and nothing else does.

Both handoffs lose detail. The subagent knows only what the task says, and the main session sees only what the report says. A report also sounds equally sure of itself whether the subagent was right or wrong, so a claim that matters is worth checking again in the main session.

## what a subagent starts with

Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read<sup><a href="#src-6">6</a></sup>.

It does get its own system prompt, the task, the full hierarchy of CLAUDE.md files, the git status and any skills listed in its definition. Its tools are the built-in and MCP tools of the main conversation, narrowed by the definition. Output style and auto memory from the main conversation are not loaded<sup><a href="#src-6">6</a></sup>.

<figure class="wide">
<ts-start data-fig data-label="fig 7 · what each agent starts with">
<p class="fallback">What four kinds of agent have in context when they start. A main session has Claude Code's system prompt, the full CLAUDE.md hierarchy, the auto memory index, the whole conversation, your prompt, every configured tool and the model you picked. A fresh subagent has its own system prompt from its agent definition, the CLAUDE.md hierarchy unless the definition sets omitClaudeMd, no auto memory, no conversation, a task written by the parent, the parent's tools narrowed by its definition, and a model from its definition or inherited. The built-in Explore agent skips CLAUDE.md, has no memory or conversation, and is read-only. A fork has all of the parent's conversation, whatever instructions and memory the parent has loaded, the parent's exact tool pool and the parent's model. The docs don't say which system prompt a fork runs with.</p>
</ts-start>
<figcaption><b>fig 7</b>A fresh subagent starts nearly empty, and a fork starts with everything the parent has. <span class="m">From the subagents page of the docs<sup><a href="#src-6">6</a></sup>. My transcripts agree on CLAUDE.md: two general subagents had it attached at startup and a web-fetch agent didn't.</span></figcaption>
</figure>

## agent definitions

A definition can live in five places. From highest priority to lowest: managed settings, the `--agents` flag for one session, `.claude/agents/` in a project, `~/.claude/agents/` for all your projects, and a plugin's `agents/` directory. When two definitions share a name, the higher one wins, and the name comes from the `name` field, whatever the file is called<sup><a href="#src-6">6</a></sup>.

Only `name` and `description` are required. The description tells Claude when to delegate to this agent. These are the optional fields<sup><a href="#src-6">6</a></sup>:

| field | what it sets |
|---|---|
| `tools`, `disallowedTools` | which tools it may use; it inherits all of them if you say nothing |
| `model` | `sonnet`, `opus`, `haiku`, `fable`, a model ID, or `inherit` |
| `effort` | how hard it thinks: `low` to `max` |
| `permissionMode` | how it asks for permission, for example `plan` or `acceptEdits` |
| `maxTurns` | a cap on its turns; output past the cap is marked partial |
| `skills` | skills whose content is injected at startup |
| `mcpServers`, `hooks` | MCP servers and lifecycle hooks scoped to this agent |
| `memory` | a memory folder of its own: `user`, `project` or `local` |
| `background` | it runs alongside the main conversation |
| `isolation: worktree` | it works in a temporary git worktree |
| `omitClaudeMd` | it starts without your CLAUDE.md files |

Claude Code ships a few definitions of its own. **Explore** is a fast, read-only agent for searching and analyzing code, with Write and Edit denied. **Plan** is a read-only research agent used in plan mode. **General-purpose** is for multi-step tasks that need both exploration and action<sup><a href="#src-6">6</a></sup>.

## agent types and who starts a subagent

Every subagent has an **agent type**. The main session passes it to the Agent tool as `subagent_type`, and the meta file records it as `agentType`. On my machine it is the name of the definition the subagent was started from. In fig 10 the fact-check has type `claude-code-guide`, both reviews have `general-purpose` and the helper has `web-fetch`.

A subagent gets started in four ways:

- **Claude decides.** It delegates based on your request, the `description` field of each definition and the current context<sup><a href="#src-6">6</a></sup>.
- **You name one.** There is no special syntax: name the subagent and Claude typically delegates. Typing `@` and picking it from the list also works<sup><a href="#src-6">6</a></sup>.
- **A command does it.** A skill with `context: fork` in its frontmatter runs in a subagent. Claude Code starts a new subagent of the type set in the skill's `agent` field, `general-purpose` if there is none, and gives it the skill content as its prompt<sup><a href="#src-9">9</a></sup>. `/code-review` is one of these. On my disk each review has an `agent-….forked-skill.json` next to its meta file, with `skillName: code-review` and `effort: high`.
- **Plan mode does it.** You enter plan mode with Shift+Tab, or for a single prompt by prefixing it with `/plan`<sup><a href="#src-10">10</a></sup>. When Claude needs to understand your codebase there, it delegates research to the Plan subagent, so exploration output stays in a separate context window while the main conversation remains read-only<sup><a href="#src-6">6</a></sup>.

A definition can also take over a whole session. With `claude --agent code-reviewer`, the main thread itself takes on that agent's tool restrictions and model<sup><a href="#src-6">6</a></sup>.

## fresh or fork

A **fork** is the other way to start a subagent. It inherits the parent conversation, so it needs no briefing, and it gets the parent's exact tool pool. Fork mode is on by default, `/subtask` starts one by hand, and `CLAUDE_CODE_FORK_SUBAGENT=0` turns it off<sup><a href="#src-6">6</a></sup>.

On my disk a fork's transcript begins with a `fork-context-ref` record that names the parent session and the last parent record it inherited. So a fork's file points at the parent's history, with no copy of it. Its meta file says `model: inherit`.

A fork doesn't fill the parent's context. Its tool calls and results go to its own file like any subagent's, and the parent gets a report. What a fork costs is tokens and independence. Every fork starts with the whole conversation in its context, so five forks of a long session read that conversation five times. And a fork knows everything the parent knows, including the parent's mistakes.

That decides which one to use. A second opinion on a piece of work should come from a fresh subagent that has never seen the reasoning behind it. A task that depends on everything the conversation has established goes to a fork. Only 20 of my 1,989 subagents were forks.

## a subagent is another transcript

A subagent's records go to `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`, with an `agent-{agentId}.meta.json` next to it<sup><a href="#src-6">6</a></sup>. The format is the one from fig 2. On my disk its records carry `isSidechain: true` and an `agentId`, and the meta file holds the agent type, the task's label, a `spawnDepth` and whether it finished.

<figure class="wide">
<ts-life data-fig data-label="fig 8 · the life of a subagent">
<p class="fallback">One subagent in five steps. Spawn: the main session calls the Agent tool, and Claude Code creates agent-a58d….jsonl with a meta file saying agentType claude-code-guide, spawnDepth 1, background. Work: the subagent's prompts, tool calls and results go into its own file, marked isSidechain true, and the main transcript gets only the launch result. A progress check: the main session reads the end of the subagent's file, which you can also open from /tasks. The report comes back: the subagent finishes after 58 lines and its final message arrives in the main session as a completion notification. Resume: an hour later the main session sends a second question with SendMessage, the subagent continues with its history intact, and the same file grows to 88 lines.</p>
</ts-life>
<figcaption><b>fig 8</b>A subagent writes its own file, and all it sends back to the main session is its report. <span class="m">This is the subagent that checked my last post against the docs. 58 and 88 lines, the meta fields and the resume are real. The progress check and the two counts in between are illustrative.</span></figcaption>
</figure>

## what comes back

The final report returns to Claude after Claude Code scans it<sup><a href="#src-6">6</a></sup>. Everything else the subagent read stays in its own file.

The session behind these two posts started four subagents. The one that reviewed this post made 35 tool calls and had 170,247 tokens in its context at its largest request. Its report was 8,795 characters, about 2,200 tokens.

<figure class="wide">
<ts-return data-fig data-label="fig 9 · what a subagent reads and what it returns">
<p class="fallback">Four subagents from one session, each with the tokens in its context at its largest request and the size of the report it returned. The docs fact-check, on Haiku: 126,566 tokens in context after 16 tool calls, and a report of about 2,400 tokens. The review of the memory post, on Fable: 167,262 tokens after 30 tool calls, and about 2,000 tokens returned. A web-fetch helper that review started, on Haiku: 84,517 tokens after 7 tool calls, and about 1,200 tokens returned. The review of this post, on Fable: 170,247 tokens after 35 tool calls, and about 2,200 tokens returned.</p>
</ts-return>
<figcaption><b>fig 9</b>Each subagent had between 85,000 and 170,000 tokens in its context and returned between 1 and 2% of that. <span class="m">Context sizes are the token counts logged in each subagent's transcript. Report sizes are estimated at 4 characters per token.</span></figcaption>
</figure>

**The main session paid about 2,000 tokens of context for work that took 170,000.** Had it done the same review itself, those 35 tool results would have gone into the main conversation and stayed there until the next compaction.

## foreground, background and nesting

A subagent runs in the foreground, where the main conversation waits for it, or in the background, where the result arrives later as a completion notification. Ctrl+B moves a running one to the background. A background subagent's permission prompts show up in your main session<sup><a href="#src-6">6</a></sup>.

Subagents can start subagents, up to three layers below the main conversation, and up to 20 can run at once by default. `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` change those limits<sup><a href="#src-6">6</a></sup>.

A subagent can also run on a different model from its parent. In my session the main conversation ran on Fable while the docs fact-check and the web-fetch helper ran on Haiku.

<figure class="wide">
<ts-tree data-fig data-label="fig 10 · one session's subagents">
<p class="fallback">The subagents of one session as a tree. The main session, on Fable, started three subagents at depth 1, all in the background: a docs fact-check (agent type claude-code-guide, on Haiku, 88 lines, 16 tool calls, resumed once with SendMessage), a review of the memory post (general-purpose, on Fable, 134 lines, 30 tool calls) and a review of this post (general-purpose, on Fable, 167 lines, 35 tool calls). The review of the memory post started one subagent of its own at depth 2, in the foreground: a web-fetch helper on Haiku, 42 lines and 7 tool calls.</p>
</ts-tree>
<figcaption><b>fig 10</b>Four subagents, two models, two depths. <span class="m">Read from the meta files and transcripts in this session's <code>subagents/</code> folder. Pick an agent to see its numbers.</span></figcaption>
</figure>

Across my machine, 37 of 136 sessions used subagents and left 1,989 subagent transcripts. 1,867 were started by a main session and 122 by another subagent. 1,906 were general-purpose, 49 Explore and 20 forks, and the other 14 were web-fetch, Plan and claude-code-guide agents.

## progress, resume and interruption

A separate file is why a subagent's work can be watched. `/tasks` lists running subagents and Enter opens a transcript<sup><a href="#src-6">6</a></sup>, and the main session can read the same file when you ask how a subagent is doing.

Resuming works the same way as for a session. Claude gets the agent's ID and continues it with `SendMessage`, and resumed subagents keep their full history<sup><a href="#src-6">6</a></sup>. Explore and Plan are one-shot and can't be resumed.

An interruption is handled through the session. If Claude Code restarts, you resume the subagent by resuming its session<sup><a href="#src-6">6</a></sup>, and a background subagent that ended with the process shows up as a note that it didn't finish<sup><a href="#src-1">1</a></sup>. A subagent you stopped yourself in `/tasks` doesn't resume on its own. Compacting the main conversation doesn't touch a subagent's transcript, since the two histories are separate files<sup><a href="#src-6">6</a></sup>.

## a memory of its own

The main conversation's auto memory isn't loaded into a subagent. A definition can give the agent a persistent memory with the `memory` field, and the scope picks the folder<sup><a href="#src-6">6</a></sup>:

| scope | folder |
|---|---|
| `user` | `~/.claude/agent-memory/<name>/` |
| `project` | `.claude/agent-memory/<name>/` |
| `local` | `.claude/agent-memory-local/<name>/` |

It works like the memory from my last post<sup><a href="#src-8">8</a></sup>: the first 200 lines or 25 KB of that folder's `MEMORY.md` go into the subagent's system prompt.

## isolation in a worktree

With `isolation: worktree`, a subagent works in a temporary git worktree, so its edits don't touch the files the main session is working on. The worktree is branched by default from your default branch, not from the parent session's HEAD, and it is cleaned up automatically if the subagent makes no changes. A `.worktreeinclude` file lists gitignored files to copy into new worktrees<sup><a href="#src-6">6</a></sup>.

## cleanup

Claude Code deletes transcripts after 30 days by default, and `cleanupPeriodDays` changes that number. The same sweep removes the session's `subagents/` and `tool-results/` folders and its file-history backups. Memory files are left alone<sup><a href="#src-5">5</a></sup>.

So a subagent's work, a rewind point and the full text of a compacted conversation all have the same lifetime: 30 days on my machine, since I never changed the setting.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://code.claude.com/docs/en/sessions">Claude Code docs, sessions (read 19 November 2026)</a></li>
<li id="src-2"><a href="https://code.claude.com/docs/en/how-claude-code-works">Claude Code docs, how Claude Code works (read 19 November 2026)</a></li>
<li id="src-3"><a href="https://code.claude.com/docs/en/checkpointing">Claude Code docs, checkpointing (read 19 November 2026)</a></li>
<li id="src-4"><a href="https://code.claude.com/docs/en/context-window">Claude Code docs, context window (read 19 November 2026)</a></li>
<li id="src-5"><a href="https://code.claude.com/docs/en/claude-directory">Claude Code docs, the .claude directory (read 19 November 2026)</a></li>
<li id="src-6"><a href="https://code.claude.com/docs/en/sub-agents">Claude Code docs, subagents (read 19 November 2026)</a></li>
<li id="src-7"><a href="https://code.claude.com/docs/en/cli-reference">Claude Code docs, CLI reference (read 19 November 2026)</a></li>
<li id="src-8"><a href="/blog/how-claude-code-memory-works/">How Claude Code's memory works (this blog, 19 November 2026)</a></li>
<li id="src-9"><a href="https://code.claude.com/docs/en/skills">Claude Code docs, skills (read 20 November 2026)</a></li>
<li id="src-10"><a href="https://code.claude.com/docs/en/permission-modes">Claude Code docs, permission modes (read 20 November 2026)</a></li>
</ol>
</details>
