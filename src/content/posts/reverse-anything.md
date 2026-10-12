---
title: Why buy anything if you can reverse anything?
date: 2026-10-12
description: REA, "Reverse Engineer Anything", went from about 4,000 to 148,000 GitHub stars in a week. It connects coding agents to Ghidra, JADX and other reverse-engineering tools. Across 51 public attempts and three benchmarks, agents rebuild small features they can check, and nobody has shown a full rebuild of an app of real size.
tags: [ai, agents, reverse-engineering]
category: ai
glyph: search
figures: 5
---

The most talked-about repo on GitHub this week is REA, short for "Reverse Engineer Anything"<sup><a href="#src-1">1</a></sup>. Its README makes a simple offer: "See a feature you like. Understand how it works, down to the binary level." You point your coding agent at an app, and the agent "can inspect the app without its source code, explain how the feature works, show the evidence, and build a version for your project."

If that worked on any app, a lot of software would stop being worth buying. **It reverses some things. Nobody has shown it rebuilding an app of real size, and where it works, the model does most of the work.**

The numbers below come from REA's repository and its 771 issues, 51 public attempts reported on GitHub, X, YouTube and Hacker News, and three benchmarks from 2026, all read on 12 October 2026.

## inside REA

REA is a local MCP server and command-line tool, and it has no model of its own. It runs the reverse-engineering tools that already exist: Ghidra, IDA and Hopper for native binaries, JADX, apktool and adb for Android, Chrome DevTools and mitmproxy for web apps and their traffic, Frida for running processes, and about a dozen more<sup><a href="#src-1">1</a></sup>. It hands their output to your coding agent as evidence records, each marked observed, inferred or unknown. Claude Code, Codex or whichever agent you use does the rest, including writing the rebuild.

<figure class="wide">
<rv-loop data-fig data-label="fig 1 · where REA sits">
<p class="fallback">A diagram of one run. The target app, a binary, an Electron bundle or an APK, goes to REA, which runs Ghidra, IDA or Hopper, JADX, apktool and adb, DevTools and mitmproxy, and Frida or Binwalk on it. REA returns evidence records marked observed, inferred or unknown. The coding agent reads them and writes a rebuild. A check runs the rebuild and the original side by side; in the example, 2 of 54 checks differ, the agent fixes them, and the second rebuild matches.</p>
</rv-loop>
<figcaption><b>fig 1</b>REA runs the tools and collects evidence. The model reads it, writes the rebuild and fixes it until the check passes. <span class="m">The run is illustrative. The tool list is from REA's README<sup><a href="#src-1">1</a></sup>.</span></figcaption>
</figure>

The most useful idea in it is in its instructions to the agent: separate what you saw from what you guessed, and cite an evidence ID for every claim. The repository is large for its age, with about 250,000 lines of TypeScript and 165,000 lines of tests. It was created in April and went from version 3.2 to 6.4 in eight days<sup><a href="#src-1">1</a></sup>.

## 148,000 stars

REA had about 4,200 stars on 5 October, according to a commenter tracking it in the Hacker News thread, which reached 783 points<sup><a href="#src-2">2</a></sup>. By 10 October the count was 54,600, and on 12 October the GitHub API reported 148,143<sup><a href="#src-1">1</a></sup>.

<figure>
<rv-stars data-fig data-label="fig 2 · a week of stars">
<p class="fallback">REA's GitHub stars: about 4,200 on 5 October, 10,300 on 7 October, 17,500 on 8 October, 54,600 on 10 October and 148,100 on 12 October, about 35 times more in a week.</p>
</rv-stars>
<figcaption><b>fig 2</b>From about 4,200 to 148,000 stars in a week. <span class="m">5 to 10 October: counts posted by a Hacker News commenter<sup><a href="#src-2">2</a></sup>. 12 October: GitHub API<sup><a href="#src-1">1</a></sup>.</span></figcaption>
</figure>

Commenters on Hacker News said the curve "reeks of botting". The repo has one fork for every four stars, far more forks than a starred repo usually gets, and its author created about 80 forks of "awesome" lists over three days, apparently to submit REA to them. Nothing proves the stars were bought. A copy at `rea-tools/rea` offers a `rea.exe` download that the real project doesn't ship, so install REA only from npm or the original repository.

## 51 attempts

Fig 3 places every public report found of someone pointing an agent with REA at a real target. They come from REA's issues and discussions, about 20 repositories that say they were built with it, two community galleries, the Hacker News threads, posts on X and YouTube videos<sup><a href="#src-3">3</a></sup>.

<figure class="wide">
<rv-cases data-fig data-label="fig 3 · 51 attempts">
<p class="fallback">Fifty-one public attempts with REA, by target size and result. The 9 attempts by REA's own contributors all worked: a single DX-Ball function, three Touhou game decompilations, a Notion clipboard trace and four small targets. Of the 42 independent attempts, 20 worked, 16 partly worked and 6 failed. The ones that worked are mostly toy or small targets, such as the Untangle puzzle, a PowerToys colour picker clone and one Ski or Die minigame, plus mid-size features such as Obsidian's quick switcher and the Claude Slides editor, and six claims about undisclosed apps. The six failures are a World of Warcraft slice, Grokbot, a NES ROM, a .NET NativeAOT app, a 1.85 MB Swift macOS app and the macOS sharingd daemon. Partial results include a Wispr Flow teardown that became a 64-line script and a QuickBooks study that became an independently written ledger.</p>
</rv-cases>
<figcaption><b>fig 3</b>Independent users got 20 full results out of 42, almost all on small targets or single features. <span class="m">Each mark is one report, judged against what its author set out to do. Squares are REA's own contributors. "Public code" means a repository or file anyone can inspect; the rest are videos, posts or claims. Hover a mark for the target.</span></figcaption>
</figure>

The nine reports from REA's own contributors all worked. The best are three full decompilations of Touhou games, each with about 700 to 1,100 functions matched byte for byte over roughly two weeks, by the project's second most active committer<sup><a href="#src-4">4</a></sup>. Two of the three build on decompilations people had already done by hand.

Of the 42 independent reports, 20 worked, 16 partly worked and 6 failed. The ones that worked are small. Someone rebuilt the Untangle puzzle from its 167 KB exe with 52 of 54 claims right<sup><a href="#src-5">5</a></sup>, and someone else rebuilt one minigame from the 1990 DOS game Ski or Die after seeding 559 functions by hand<sup><a href="#src-6">6</a></sup>. On mid-size apps, REA was often not what did the work. In a video rebuilding Obsidian's quick switcher, REA's search for "switcher" returned nothing, and Claude read the 3.7 MB of minified JavaScript directly<sup><a href="#src-7">7</a></sup>. MindStudio rebuilt features of macOS Preview with and without REA, and the agent without it finished first<sup><a href="#src-8">8</a></sup>.

All six independent failures are mid-size native programs or unusual formats. A 1.85 MB Swift app for macOS timed out after 40 minutes<sup><a href="#src-9">9</a></sup>, a .NET NativeAOT app produced only raw assembly<sup><a href="#src-10">10</a></sup>, and on World of Warcraft REA returned only the file's identity, although a community gallery lists that project as a success<sup><a href="#src-11">11</a></sup>. The largest independent teardown, of the dictation app Wispr Flow, ended with REA's calls timing out after about an hour and a rebuild that is a 64-line Python script with none of the app's cloud features<sup><a href="#src-12">12</a></sup>. No public attempt covers an app like Raycast, Things, Slack or Figma.

## the benchmarks

Researchers have been measuring the same task since the spring, without REA: give an agent a program it can run but not read, and ask it to rebuild it.

ProgramBench gives agents an executable and its documentation for 200 programs, from small command-line tools to FFmpeg and SQLite, with a median size of 8,635 lines<sup><a href="#src-13">13</a></sup>. No model rebuilt any of them completely, and the best passed 95% of the tests on only 3% of the programs. An August leaderboard update put that share at 16.5%<sup><a href="#src-14">14</a></sup>.

<figure class="wide">
<rv-size data-fig data-label="fig 4 · bigger programs, fewer tests passed">
<p class="fallback">Mean share of tests passed when rebuilding a program from its executable, by program size. Claude Opus 4.6: 73.9% on small programs, 53.3% on medium, 24.7% on large. Claude Opus 4.7: 73.8%, 52.1%, 25.0%. Claude Sonnet 4.6: 67.1%, 48.8%, 28.6%. GPT 5.4: 50.9%, 39.9%, 18.0%. Gemini 3.1 Pro: 50.9%, 37.7%, 17.8%.</p>
</rv-size>
<figcaption><b>fig 4</b>Every model passes fewer tests as programs get bigger, and on medium programs the best pass about half. <span class="m">ProgramBench, table 11<sup><a href="#src-13">13</a></sup>. Size groups are the paper's difficulty bins, which combine lines of code and the number of dependencies.</span></figcaption>
</figure>

**For programs between roughly ten thousand and a million lines, which covers most apps people use, the best models pass about half the tests.** Their rebuilds are also far smaller than the originals: most fit in one to three files, against a median of fifteen in the reference programs<sup><a href="#src-13">13</a></sup>.

MirrorCode, from Epoch AI and METR, gives agents more time and money<sup><a href="#src-15">15</a></sup>. Claude Opus 4.7 rebuilt gotree, a 16,000-line Go tool, passing 2,000 of 2,001 tests in 14 hours for $251, and pkl at about 60,000 lines. ruff stopped at 67% of hidden tests, and 8 of the 25 programs were never fully rebuilt. Both benchmarks use programs that read and write text. ProgramDistill tests web apps, where agents rebuild features by clicking through a working copy: GPT-6 Astra reproduced 49.2% of full-app workflows and Claude Opus 5 28.8%, and in one setting success fell from 96% to 32% as more features that depend on each other had to be rebuilt<sup><a href="#src-16">16</a></sup>.

## an exact check

The rebuilds that fully worked had one thing in common: a cheap, exact way to compare the result with the original.

<figure class="wide">
<rv-check data-fig data-label="fig 5 · the check decides">
<p class="fallback">Rebuilds with an exact automatic check: Snowboard Kids 2, matched byte for byte, 100% after 20 months; Touhou 8, 1,106 of 1,107 functions; gotree, 2,000 of 2,001 tests for $251; a C compiler of about 100,000 lines, about 99% of GCC's torture tests for about $20,000; Chromatron with a pixel-diff tool, 307,199 of 307,200 pixels. Rebuilds without one: Chromatron before the pixel diff, which looked like a remake; PhotoCraft, a Photoshop clone with about 65% of pixels matching; Cursor's agent-built browser, which didn't reliably build; the Wispr Flow rebuild, a 64-line script; and 26 web apps in ProgramDistill, with 29% to 49% of workflows reproduced.</p>
</rv-check>
<figcaption><b>fig 5</b>With an exact check, agents get to byte-for-byte and pixel-for-pixel copies. Without one, they produce something that looks close. <span class="m">Sources: Snowboard Kids 2<sup><a href="#src-17">17</a></sup>, Touhou 8<sup><a href="#src-4">4</a></sup>, MirrorCode<sup><a href="#src-15">15</a></sup>, Anthropic<sup><a href="#src-18">18</a></sup>, Quesma<sup><a href="#src-19">19</a></sup>, PhotoCraft as reported by byteiota<sup><a href="#src-20">20</a></sup>, The Register<sup><a href="#src-21">21</a></sup>, the Wispr Flow teardown<sup><a href="#src-12">12</a></sup>, ProgramDistill<sup><a href="#src-16">16</a></sup>.</span></figcaption>
</figure>

Matching decompilation projects compile each function and compare its bytes with the original game, which is how Snowboard Kids 2 reached 100% after 20 months of work by people and agents<sup><a href="#src-17">17</a></sup>. Anthropic's C compiler used GCC as its reference and cost about $20,000<sup><a href="#src-18">18</a></sup>. Chromatron, a 1990s puzzle game, looked "like a remake" to the person rebuilding it until they built a tool to compare screenshots pixel by pixel. After that, the rebuild matched 307,199 of 307,200 pixels<sup><a href="#src-19">19</a></sup>.

A real app has no such check. Its behaviour depends on saved state, settings, file formats, timing and a server you can't see, and none of that can be compared automatically. Even passing tests isn't the same as matching: in one study, 5 to 13% of decompiled functions that passed every test still behaved differently from the original when fed random inputs<sup><a href="#src-22">22</a></sup>. Where the check is weak, the result looks like PhotoCraft, a Photoshop clone built by agents in a few days, with about 65% of pixels matching and testers on Hacker News calling it "very broken"<sup><a href="#src-20">20</a></sup>.

## why buy anything

What REA and an agent can get you today is a feature. They can explain how one part of an app works, sometimes in minutes, and rebuild that part when you can check it. The whole app is out of reach: on the benchmarks the best models pass about half the tests on mid-size programs, and in public, nobody has shown a full rebuild of an app people pay for.

I'd use REA to understand how a feature works before building my own version, and I wouldn't cancel a subscription because of it. ProgramBench's share of programs rebuilt to 95% of tests went from 3% to 16.5% between May and August, so I'll check again in six months.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://github.com/morluto/rea">morluto, REA: Reverse Engineer Anything, repository and README (read 12 October 2026)</a></li>
<li id="src-2"><a href="https://news.ycombinator.com/item?id=50028275">Hacker News, REA Reverse-Engineer Anything discussion (10 October 2026)</a></li>
<li id="src-3"><a href="https://github.com/morluto/rea/issues">REA issues and discussions on GitHub (771 issues, read 12 October 2026)</a></li>
<li id="src-4"><a href="https://github.com/N0zoM1z0/th08">N0zoM1z0, th08 matching decompilation (read 12 October 2026)</a></li>
<li id="src-5"><a href="https://github.com/az9713/untangle-rebuild">az9713, untangle-rebuild (2026)</a></li>
<li id="src-6"><a href="https://github.com/tuunanet/rea-ski-or-die-reconstruction">tuunanet, rea-ski-or-die-reconstruction (2026)</a></li>
<li id="src-7"><a href="https://www.youtube.com/watch?v=hG3kcpQFKvU">YouTube, This GitHub Repo Lets Claude Clone Any App (REA) (October 2026)</a></li>
<li id="src-8"><a href="https://www.mindstudio.ai/blog/reverse-engineer-anything-mcp">MindStudio, Reverse Engineer Anything MCP (11 October 2026)</a></li>
<li id="src-9"><a href="https://github.com/morluto/rea/issues/1783">REA issue #1783, Ghidra provider times out on a 1.85 MB Swift/ObjC Mach-O (open)</a></li>
<li id="src-10"><a href="https://github.com/morluto/rea/issues/744">REA issue #744, NativeAOT decompilation support (open)</a></li>
<li id="src-11"><a href="https://github.com/wubing733-prog/wow-mobile-ios">wubing733-prog, wow-mobile-ios, docs/REA-FINDINGS.md (2026)</a></li>
<li id="src-12"><a href="https://github.com/az9713/wispr-flow-rea-teardown">az9713, wispr-flow-rea-teardown (2026)</a></li>
<li id="src-13"><a href="https://arxiv.org/abs/2605.03546">ProgramBench: Can Language Models Rebuild Programs From Scratch?, arXiv 2605.03546 (5 May 2026)</a></li>
<li id="src-14"><a href="https://agentmarketcap.ai/blog/2026/08/07/programbench-0-percent-rebuild-software-from-scratch">AgentMarketCap, ProgramBench leaderboard update (7 August 2026)</a></li>
<li id="src-15"><a href="https://arxiv.org/abs/2606.30182">MirrorCode: AI can rebuild entire programs from behavior alone, arXiv 2606.30182 (June 2026)</a></li>
<li id="src-16"><a href="https://arxiv.org/abs/2609.18805">ProgramDistill, arXiv 2609.18805 (16 September 2026)</a></li>
<li id="src-17"><a href="https://blog.chrislewis.au/snowboard-kids-2-is-100-decompiled/">Chris Lewis, Snowboard Kids 2 is 100% decompiled (17 May 2026)</a></li>
<li id="src-18"><a href="https://www.anthropic.com/engineering/building-c-compiler">Anthropic, Building a C compiler with a team of parallel Claudes (5 February 2026)</a></li>
<li id="src-19"><a href="https://quesma.com/blog/chromatron-recompiled">Quesma, Chromatron recompiled (4 March 2026)</a></li>
<li id="src-20"><a href="https://byteiota.com/artcraft-adobe-open-source-rust-ai-vibe-coding/">byteiota, ArtCraft and the open-source Adobe clones (October 2026)</a></li>
<li id="src-21"><a href="https://www.theregister.com/2026/01/22/cursor_ai_wrote_a_browser/">The Register, Cursor AI wrote a browser (22 January 2026)</a></li>
<li id="src-22"><a href="https://arxiv.org/abs/2609.05370">Liu, Raff and Micinski, When LLM Decompilers Recompile More and Preserve Less, arXiv 2609.05370 (4 September 2026)</a></li>
</ol>
</details>
