---
title: How Claude Code's memory works
date: 2026-11-19T22:00:00Z
description: Claude Code's memory is a folder of Markdown files per project, with a one-line index that loads into every session. I had Claude inspect its own files and transcripts on my laptop to see where memories live, what gets loaded, how they change and how to undo a change.
tags: [ai, agents, claude-code, memory]
category: ai
glyph: memory
figures: 6
---

Claude Code remembers things between sessions. On this blog it knows that I send drafts back when they sound AI-written, and which visual style I like. I asked it how that works, and it answered by opening its own files on my laptop. This post covers what we found on 19 November 2026, checked against the Claude Code docs<sup><a href="#src-1">1</a></sup>.

Claude Code has two kinds of memory. `CLAUDE.md` holds instructions I write and commit with the repo. **Auto memory** holds notes Claude writes for itself while we work. The rest of this post is about auto memory.

## a folder per project

Auto memory lives in `~/.claude/projects/<project>/memory/`. The project is derived from the git repository, so every subdirectory and every worktree of a repo shares one memory folder, and outside a git repo the folder you started in is used<sup><a href="#src-1">1</a></sup>. On my machine the folder's name is the repo's path with each non-alphanumeric character replaced by a dash: `/Users/me/workspace/site` becomes `-Users-me-workspace-site`. Session transcripts sit next to it and are keyed by working directory<sup><a href="#src-2">2</a></sup>.

Git is what ties a worktree to its repo. A linked worktree's `.git` is a small file that points at the main checkout's `.git` directory, and `git rev-parse --git-common-dir` prints that directory from inside any worktree. On my machine, sessions started in a worktree, or in a subdirectory of one, loaded the main checkout's memory folder. I assume Claude Code asks git for the checkout when a session starts, before the model sees anything. The docs state the result and don't describe the method. The repo's name on GitHub plays no part: this blog is `winlp4ever.github.io` there, and its memory folder is named after the local directory, `my-website`.

<figure class="wide">
<mem-path data-fig data-label="fig 1 · which folder a session uses">
<p class="fallback">Five places to start Claude Code and the memory folder each one uses. Starting in the repo root /Users/me/workspace/site, in its subdirectory src/figures, or in a git worktree of the same repo all use the memory folder -Users-me-workspace-site. A second clone at /Users/me/tmp/site uses a different, empty folder, -Users-me-tmp-site. A folder outside git, /Users/me/notes, uses -Users-me-notes. Transcripts are keyed by the directory the session started in, so the subdirectory and the worktree each get a transcript folder of their own.</p>
</mem-path>
<figcaption><b>fig 1</b>The memory folder follows the repository, and transcripts follow the directory you started in. <span class="m">The figure applies the docs' rules for memory<sup><a href="#src-1">1</a></sup> and for transcripts<sup><a href="#src-2">2</a></sup> to example paths. The dash naming is what I see on my machine; the docs don't spell out the folder name for memory.</span></figcaption>
</figure>

So git is the key and plain files are the store. Git only identifies the project. The memories sit under `~/.claude`, outside the repo, with no commits and no branches, and every branch and worktree of a checkout reads and writes one set of them.

Memory is tied to a path on one machine. It isn't synced to other machines or to a cloud session<sup><a href="#src-1">1</a></sup>, and it isn't in git, so a teammate who clones my repo gets none of it. Anything a team should share belongs in `CLAUDE.md`.

I ran into the path rule myself. The voice rules for this blog were saved by sessions I started in a sibling folder, `~/workspace/blog`. Sessions started in the blog's repo, `~/workspace/my-website`, load a different memory folder, and that one was empty.

## one fact per file

Each memory is a Markdown file holding one fact. The frontmatter has a name, a one-line description and a type: `user`, `feedback`, `project` or `reference`. Claude Code stamps each file with a `modified` time<sup><a href="#src-1">1</a></sup>, and on my machine also with the id of the session that wrote it. Of my 170 memory files, 84 are feedback, 78 are project notes, 6 are references and 2 describe me.

Next to those files sits `MEMORY.md`, the index. It has one line per memory: a title, the file name and, after a dash, a few words that say what the memory is about. I call those few words the **hook**. A session sees a memory's hook without opening its file, and nothing else of it. The word is mine, and it is unrelated to Claude Code's hooks, the scripts that run on events such as a tool call.

<figure class="wide">
<mem-index data-fig data-label="fig 2 · the index and its files">
<p class="fallback">A MEMORY.md index with four lines, each a title, a file name and a hook: prose voice feedback (drafts rejected as too AI: no reveal framings, teasers or punchline fragments), blog project (field notes repo: posts, figure runtime, where the design docs live), user design taste (mono type, cool white, one handmade touch, earthy accents) and PR review workflow (plan, implement, /code-review high; redesign after 3 severe rounds). Selecting a line opens its file: frontmatter with name, description and type, then the fact, a line that says why, and a line that says how to apply it. The index is loaded at session start. The files are read on demand.</p>
</mem-index>
<figcaption><b>fig 2</b>The index on the left loads into every session. A file on the right is opened only when Claude decides it needs it. <span class="m">Trimmed from the memory folder of my blog project. Pick a line to open its file.</span></figcaption>
</figure>

## what gets loaded

At the start of every conversation Claude Code loads the first 200 lines of `MEMORY.md`, or its first 25 KB, whichever comes first. Topic files aren't loaded at startup. Claude reads them on demand with its standard file tools<sup><a href="#src-1">1</a></sup>.

So recall has no embeddings and no retrieval step. The model reads a list of hooks, and when one looks relevant to the task it opens that file like any other file. My transcripts agree: the index was attached to a session 356 times, and I found no record of Claude Code picking a memory file for relevance and injecting it.

<figure class="wide">
<mem-session data-fig data-label="fig 3 · one session">
<p class="fallback">One session in nine steps. The session starts with the system prompt and CLAUDE.md in the context window. The MEMORY.md index, three hooks long, is copied from disk into the context. A prompt arrives: draft the intro. The prose voice hook matches, so Claude reads prose-voice-feedback.md from disk into the context and replies. The user then corrects it: don't open with a question. Claude writes a new file, no-question-openers.md, and adds a fourth line to the index on disk. The next session starts with four hooks.</p>
</mem-session>
<figcaption><b>fig 3</b>The index arrives on its own. A memory file arrives only when Claude reads it. <span class="m">Illustrative: I wrote this session by hand to show the order of events. The steps are the ones in the docs<sup><a href="#src-1">1</a></sup>.</span></figcaption>
</figure>

A hook therefore matters more than the file behind it. If a hook is vague, or sits past the limit, no session ever opens that memory.

My 12 indexes add up to 26 KB, and the 170 files they point to add up to 298 KB, so about 8% of my memory is loaded up front. An index line of mine averages 150 bytes. At that length the 25 KB limit arrives at 166 lines, before the 200-line one. My largest index has 68 lines and 10.4 KB. When a write pushes the index over the limit, the write succeeds and Claude Code returns an error telling Claude to rewrite the index<sup><a href="#src-1">1</a></sup>.

<figure class="wide">
<mem-budget data-fig data-label="fig 4 · the index budget">
<p class="fallback">A grid of up to 400 memories, one square each. With 68 memories and hooks of 150 bytes, the index is 68 lines and 10.2 KB, all 68 hooks load at session start (about 2,550 tokens), and the 68 files, about 119 KB, stay on disk until read. At 150 bytes per hook the limit is 166 hooks, because 25 KB comes before 200 lines. With 240 memories at that length, 74 hooks sit past the limit and never load. With hooks of 100 bytes the limit is 200 lines.</p>
</mem-budget>
<figcaption><b>fig 4</b>Every hook is paid for in every session, and a hook past the limit is never seen. <span class="m">The limits are from the docs<sup><a href="#src-1">1</a></sup>; I took 25 KB as 25,000 bytes. Tokens are estimated at 4 bytes each, and 1,750 bytes per file is my own average. The sliders start at 68 memories, the size of my largest index, and at my average hook length.</span></figcaption>
</figure>

The docs give two more loading rules. A subagent doesn't get the main conversation's memory unless it is a fork<sup><a href="#src-1">1</a></sup>, and a custom subagent can be given a memory folder of its own<sup><a href="#src-4">4</a></sup>. After a compaction, auto memory is re-injected from disk<sup><a href="#src-5">5</a></sup>.

## how memories get written

Claude writes a memory with the tools it uses for code. I counted tool calls in 141 session transcripts on my machine, after removing duplicates. 34 of those sessions touched a memory folder.

<figure class="wide">
<mem-tally data-fig data-label="fig 5 · reads and writes on my machine">
<p class="fallback">Counts from 141 session transcripts on my machine. MEMORY.md was loaded into a session 356 times. The Write tool created or replaced a memory file 119 times. A shell command appended a line to MEMORY.md with echo 114 times. The Edit tool changed a memory file or the index in place 45 times. The Read tool opened a memory file or the index 10 times.</p>
</mem-tally>
<figcaption><b>fig 5</b>Loads, writes, edits and reads of memory across my sessions. <span class="m">Counted on 19 November 2026. The shell row counts only <code>echo … >> MEMORY.md</code>. A few hundred more shell commands read or patched memory files, and I didn't sort those.</span></figcaption>
</figure>

**A new memory is one Write call for the file and, most of the time, one shell `echo` that appends its line to the index.** The Write tool never touched `MEMORY.md` in my transcripts. The Read tool opened a memory 10 times, which undercounts reading, because Claude often uses `cat` or `grep` on the folder.

An update overwrites the file in place. The folder keeps one version of each memory and no history. A wrong memory gets deleted, along with its index line.

## undoing a change

I once asked a session to revert memory edits that another session had made, and it could. The old versions came from session transcripts. Each session is logged as a JSONL transcript<sup><a href="#src-2">2</a></sup>, and on my machine the logged result of a Write or Edit call carries two fields, `originalFile` and `structuredPatch`: the whole file from before the change, and a diff. A session can search the transcripts for writes under `/memory/` and put the old content back.

<figure class="wide">
<mem-undo data-fig data-label="fig 6 · where the old version goes">
<p class="fallback">A memory file with three lines is changed twice. First a shell command, sed, changes "Stop after 5 rounds." to "Stop after 3 rounds." The transcript records the command and keeps no copy of the old file. Then the Edit tool changes "Run another round after any fix." to "Rerun only after a severe finding." The transcript stores originalFile, the three lines from before the edit, and a patch with one removed and one added line. To undo the Edit, a session writes originalFile back. To undo the sed, someone has to read the command and reverse it by hand.</p>
</mem-undo>
<figcaption><b>fig 6</b>An edit made with a file tool leaves the old file in the transcript, and an edit made from the shell leaves only the command. <span class="m">The memory and both edits are examples I wrote. The patch is computed in your browser from the two versions. <code>originalFile</code> and <code>structuredPatch</code> are field names I saw in my transcripts, and the docs don't describe them.</span></figcaption>
</figure>

A shell edit leaves no before-image in the transcript, and the 114 index appends in fig 5 were all shell edits. Checkpoints keep the 100 most recent snapshots of files changed with file editing tools, and a file that only Bash commands have changed isn't tracked<sup><a href="#src-3">3</a></sup>. Transcripts are deleted after about 30 days by default, a period set by `cleanupPeriodDays`<sup><a href="#src-2">2</a></sup>. Memory files are excluded from that cleanup and stay until someone edits or deletes them<sup><a href="#src-1">1</a></sup>.

## settings

`/memory` turns auto memory on or off and saves `autoMemoryEnabled` to `~/.claude/settings.json`. The environment variable `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` does the same for one shell. `autoMemoryDirectory` moves the folder somewhere else<sup><a href="#src-1">1</a></sup>.

Memory is plain files, so ordinary tools work on it. Running `git init` inside a memory folder gives every later change a history, whichever tool made it.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://code.claude.com/docs/en/memory">Claude Code docs, how Claude remembers your project (read 19 November 2026)</a></li>
<li id="src-2"><a href="https://code.claude.com/docs/en/sessions">Claude Code docs, sessions (read 19 November 2026)</a></li>
<li id="src-3"><a href="https://code.claude.com/docs/en/checkpointing">Claude Code docs, checkpointing (read 19 November 2026)</a></li>
<li id="src-4"><a href="https://code.claude.com/docs/en/sub-agents">Claude Code docs, subagents (read 19 November 2026)</a></li>
<li id="src-5"><a href="https://code.claude.com/docs/en/context-window">Claude Code docs, context window (read 19 November 2026)</a></li>
</ol>
</details>
