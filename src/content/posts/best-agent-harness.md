---
title: The best agent harness is a while loop and a lot of upkeep
date: 2026-10-12
description: Every coding agent is a model inside a harness, the program that runs the loop, the tools and the context. This post measures how much a harness adds on Terminal-Bench, which ones lead in October 2026, what the top ones share inside and what they are built on. Claude Code and Codex lead every current board, and a 100-line harness comes within a few points of them.
tags: [ai, agents, benchmarks]
category: ai
glyph: cursor
figures: 7
---

Every coding agent you can install, Claude Code, Codex, Gemini CLI, Cursor or Droid, is a model inside a harness. The model is what the labs train. The harness is the program around it: it sends the model a request, runs the tools the model asks for, appends the results to the request and calls the model again, until the model answers without asking for a tool.

The loop fits in ten lines, and fig 1 runs it on a small bug fix.

<figure class="wide">
<ah-loop data-fig data-label="fig 1 · the loop">
<p class="fallback">Ten lines of pseudocode run a small coding task. The context starts with a system prompt (4k tokens), tool schemas (5k), AGENTS.md (1.5k) and the task (0.5k). The model asks for a search, reads src/dates.py, edits it, runs pytest (3,800 lines of output cut down to its head and tail), reads the test file and edits again. At 32.3k of a 40k window the context passes 80% and the harness compacts it to 13.5k, replacing the history with a summary. The model runs pytest again, 212 tests pass, and it replies without a tool call, which ends the loop.</p>
</ah-loop>
<figcaption><b>fig 1</b>Every harness in this post runs this loop. Each turn appends the model's reply and the tool output, and the stable prefix at the front stays the same so the provider can cache it. <span class="m">The task, the token counts and the 40k window are made up so that compaction happens on screen. The 80% threshold is the one Goose and Mistral Vibe use; Codex compacts at 90% and Gemini CLI at 50%<sup><a href="#src-1">1</a></sup>.</span></figcaption>
</figure>

The rest of a harness decides what goes into each request, how a 3,800-line test log gets cut down, what happens when the window fills up and what the model can run without asking. Those choices move scores a lot. On the older Terminal-Bench 2.0 board, Claude Opus 4.6 scores 58.0% in Claude Code and 76.4% in Stanford's Meta-Harness, on the same 89 tasks<sup><a href="#src-2">2</a></sup>.

**Today the two lab harnesses, Claude Code and Codex, top every board that has current models, and a 100-line harness scores within a few points of them.** The numbers below come from the Terminal-Bench leaderboards, Artificial Analysis, Vals, Datacurve, Princeton's HAL, a dozen papers from 2026 and the source code of ten open-source harnesses, all read on 12 October 2026.

## the loop and the parts around it

mini-swe-agent, from the team behind SWE-bench, describes itself as "just some 100 lines of python for the agent class" and has no tool except bash<sup><a href="#src-3">3</a></sup>. Its agent class is 190 lines today and it scored above 74% on SWE-bench Verified. Terminal-Bench's reference agent, Terminus 2, is 2,101 lines<sup><a href="#src-4">4</a></sup>.

At the other end, Claude Code's docs list about 45 tools<sup><a href="#src-5">5</a></sup>, and Anthropic has shipped about 296 releases of its 2.1 line since January<sup><a href="#src-6">6</a></sup>. Most of that work goes into the parts around the loop: permissions, sandboxing, subagents, memory files, hooks, and fixes for each new model.

## terminal-bench 2.0

Terminal-Bench 2.0 is where harness makers competed. Anyone could submit a run, the board has 43 different agents, and Opus 4.6 and GPT-5.3-Codex each appear in nine of them<sup><a href="#src-2">2</a></sup>.

<figure class="wide">
<ah-spread data-fig data-label="fig 2 · same model, many harnesses">
<p class="fallback">Terminal-Bench 2.0 scores, one row per model and one dot per harness. Claude Opus 4.6: Meta-Harness 76.4%, Capy 75.3, Terminus-KIRA 74.7, TongAgents 71.9, Droid 69.9, Crux 66.9, Mux 66.5, Terminus 2 62.9 (verified), Claude Code 58.0 (verified, last). GPT-5.5: NexAU-AHE 84.7, Capy 83.1, Codex CLI 82.2 (verified), clnkr 66.1. GPT-5.3-Codex: SageAgent 78.4 down to Terminus 2 64.7, with OpenAI's Simple Codex at 75.1. Gemini 3.1 Pro: TongAgents 80.2, Terminus-KIRA 74.8, Gemini CLI 61.4. Gemini 3 Flash: Junie CLI 64.3, Terminus 2 51.7, Gemini CLI 47.4. Claude Sonnet 4.5: CAMEL-AI 46.5 down to Claude Code 40.1. Claude Haiku 4.5: Goose 35.5 down to OpenHands 13.9. With only verified rows the median spread per model falls from 11.6 to 5.4 points.</p>
</ah-spread>
<figcaption><b>fig 2</b>For Opus 4.6 the harness is worth 18 points, and Claude Code comes last of nine. Showing only verified rows removes most of the top scores. <span class="m">Terminal-Bench 2.0 leaderboard data<sup><a href="#src-2">2</a></sup>, 89 tasks, 95% intervals of about ±2 to 3 points. "Verified" is the board's own flag; the other rows are self-reported by the harness makers. Gemini 3 Pro has no Google harness on the board. Hover a dot for the harness.</span></figcaption>
</figure>

**Claude Code scored below the neutral Terminus 2 harness for every Claude model on this board, and came last of nine for Opus 4.6.** Gemini CLI also scored below Terminus 2 for every Gemini model. Codex is the exception: it beats Terminus 2 for every GPT model, by up to 14 points.

Most of the top rows on this board are self-reported. Across the board the median spread between a model's best and worst harness is 11.6 points, and 5.4 when only verified runs count. Meta-Harness searched for its harness on the same 89 tasks it reports, with no held-out set<sup><a href="#src-7">7</a></sup>. Terminal-Bench removed two submissions for cheating, one with encrypted solutions inside the agent binary and one that uploaded the test folder, and rescored ForgeCode's trials to zero where it had "curled solutions from the internet" into its AGENTS.md<sup><a href="#src-8">8</a></sup>.

On Terminal-Bench 2.1, a revision that fixed 28 tasks, Claude Code beats Terminus 2: Fable 5 scores 83.8% in Claude Code and 80.5% in Terminus 2<sup><a href="#src-2">2</a></sup>.

## effort, tries and models

Fig 3 sets a harness switch next to the other things that change an agent's score: the reasoning effort, the number of tries and the model itself.

<figure>
<ah-levers data-fig data-label="fig 3 · what moves the score">
<p class="fallback">Points gained on Terminal-Bench. Changing the harness: median of verified rows on 2.0, 5.4 points; automated harness search for GPT-5.4 (AHE), 7.3; median of all rows, 11.6; Claude Code to Meta-Harness for Opus 4.6, 18.4. Raising reasoning effort on 4.0: GPT-6 Astra in Codex from low to max, 7.6; Opus 5 in Claude Code from low to xhigh, 19.1. Counting a pass in any of five tries instead of one, Opus 5.5 on 4.0: 13.9. Moving up a model generation in a fixed harness: Opus 4.1 to Opus 4.5 in Terminus 2, 19.8; Gemini 2.5 Pro to Gemini 3 Pro in Terminus 2, 24.3; Opus 4.8 to Opus 5 in Claude Code on 4.0, 28.2.</p>
</ah-levers>
<figcaption><b>fig 3</b>A typical harness switch is worth about five points. A new model generation is worth twenty or more. <span class="m">Terminal-Bench 2.0 and 4.0 leaderboard data<sup><a href="#src-2">2</a></sup>, and the AHE paper for automated search<sup><a href="#src-9">9</a></sup>. Each bar is the gain in points between two runs, or the median of such gains.</span></figcaption>
</figure>

**Going from Opus 4.8 to Opus 5 in the same harness was worth 28 points (23.6% to 51.8%), more than five times a typical verified harness switch.** Raising Opus 5's effort from low to xhigh in Claude Code is worth 19. The best harness on the 2.0 board can match a model generation, but only in unverified, benchmark-tuned rows. OpenAI says that keeping the model's reasoning between turns and compacting context in the Codex harness took GPT-5.6 Sol from 13.3% to 38.3% on ARC-AGI-3<sup><a href="#src-10">10</a></sup>.

Studies that control for everything else find smaller effects. Zhang and colleagues ran three models in three harnesses on SWE-bench Verified: the harness moved each model by 8.5 to 13 points and the model choice by 2.5 to 5, because the three models were close peers<sup><a href="#src-11">11</a></sup>. Vats and Golev found gaps of 0 to 8 points between Goose, OpenCode and OpenHands, with confidence intervals that include zero for all but the largest<sup><a href="#src-12">12</a></sup>. Arjmandi found no average advantage for a lab's own harness (Claude Code for Opus 4.8, the Codex SDK for GPT-5.5) over a neutral one, −1.25 and +1.25 points<sup><a href="#src-13">13</a></sup>. METR couldn't separate Claude Code and Codex from its own scaffolds either<sup><a href="#src-14">14</a></sup>.

The harness matters more for cost. The same Vats and Golev runs spent up to 40 times more tokens per solved task in one harness than in another<sup><a href="#src-12">12</a></sup>, and MIT FutureTech, working from Princeton's HAL data, found that efficiency on a benchmark can vary 100 times between scaffolds, "roughly two years of model progress"<sup><a href="#src-15">15</a></sup>. On HAL's CORE-Bench Hard, Opus 4.5 scores 77.8% in Claude Code for $87 and 33.3% in HAL's generalist agent for $127<sup><a href="#src-16">16</a></sup>. A weak harness can also break a good model: o3 solves none of SWE-bench Verified Mini in HAL's generalist agent and 46% in SWE-agent.

## the board today

Terminal-Bench 4.0 came out in August with 66 harder tasks, run five times each. Only labs have submitted to it so far: Claude Code, Codex, xAI's Grok Build and Meta's Muse Code, with Gemini running in mini-swe-agent<sup><a href="#src-2">2</a></sup>. Claude Code with Opus 5.5 leads at 64.85%, and Codex rows with GPT-6 Astra and GPT-6.1 Sol tie around 58%.

Artificial Analysis runs every harness itself for its coding agent index, which averages DeepSWE, Terminal-Bench 4.0 and SWE-Atlas<sup><a href="#src-17">17</a></sup>. Claude Code with Sonnet 5.5 leads at 68.4. Cognition's Devin Fusion CLI, which pairs Claude Fable 5.1 with Cognition's own SWE-2, is the only harness in the top ten not made by Anthropic, OpenAI or Google. OpenCode, the best independent open-source harness, scores 53.6 with GLM-5.3.

<figure>
<ah-board data-fig data-label="fig 4 · the boards today">
<p class="fallback">Best score per harness. Artificial Analysis coding agent index: Claude Code 68.4 (Sonnet 5.5 max), Antigravity CLI 63.8 (Gemini 4 Argon high), Codex 62.9 (GPT-6.1 Sol xhigh), Devin Fusion CLI 61.7 (Fable 5.1 with SWE-2), Grok Build 56.3, Muse Code 54.3, OpenCode 53.6 (GLM-5.3), Kimi Code CLI 51.9 (Kimi K3). Terminal-Bench 4.0: Claude Code 64.85% (Opus 5.5 max), Codex 58.18% (GPT-6 Astra max), Grok Build 37.58% (Grok 4.7), mini-swe-agent 19.09% (Gemini 3.8 Flash), Muse Code 14.55%.</p>
</ah-board>
<figcaption><b>fig 4</b>The lab harnesses take the top three places on both boards. <span class="m">Artificial Analysis coding agent index v1.5, data of 11 October<sup><a href="#src-17">17</a></sup>, and the official Terminal-Bench 4.0 leaderboard<sup><a href="#src-2">2</a></sup>, best row per harness. Artificial Analysis marks the Antigravity CLI row as not publicly available.</span></figcaption>
</figure>

There is no Cursor, Droid, Warp, Junie, OpenHands or Mistral Vibe row on either board. The independent harnesses that beat the labs on Terminal-Bench 2.0 haven't been run on the new tasks or the new models.

Vals and Datacurve run every model in mini-swe-agent, so their numbers can be set next to each model in its vendor's harness.

<figure class="wide">
<ah-pair data-fig data-label="fig 5 · vendor harness vs a 100-line one">
<p class="fallback">Each model in its vendor's harness and in mini-swe-agent. Terminal-Bench 4.0: Claude Opus 5.5 in Claude Code 64.85% vs 65.15% in mini-swe-agent; Sonnet 5.5 61.82 vs 64.14; Fable 5.1 57.88 vs 58.08; GPT-6 Astra in Codex 58.18 vs 59.60; GPT-6.1 Sol 58.18 vs 55.05; GPT-6 Sol 49.39 vs 44.44; GLM-5.3 in Claude Code 41.82 vs 38.89; Grok 4.7 in Grok Build 37.58 vs 28.79; Qwen3.8 Max in Claude Code 26.97 vs 34.34. DeepSWE: GPT-5.6 Sol in Codex 72.3 vs 73; GPT-6 Astra 67.6 vs 74; Kimi K3 in Kimi Code CLI 68.4 vs 69; Grok 4.6 in Grok Build 64.9 vs 67; Claude Opus 5 in Claude Code 62.5 vs 74; GLM-5.3 in OpenCode 61.4 vs 69.</p>
</ah-pair>
<figcaption><b>fig 5</b>On Terminal-Bench 4.0 the 100-line harness lands within about three points of the vendor's for six of nine models. On DeepSWE it scores higher for all six. <span class="m">Terminal-Bench 4.0: official leaderboard<sup><a href="#src-2">2</a></sup> against Vals<sup><a href="#src-18">18</a></sup>. DeepSWE v1.1: Artificial Analysis's runs of each vendor CLI<sup><a href="#src-17">17</a></sup> against Datacurve's mini-swe-agent runs<sup><a href="#src-19">19</a></sup>. Different teams ran the two sides, with different attempt counts and effort settings (Grok 4.6 is xhigh against medium), so a few points either way is noise.</span></figcaption>
</figure>

Grok Build is worth about 9 points to Grok 4.7, and Qwen3.8 Max loses 7 by running in Claude Code instead of a neutral harness. Most models sit closer. The Terminal-Bench team ran the same comparison on their Harbor-Index tasks and found that harness choice "rarely" made a statistically significant difference, though it changed which tasks got solved<sup><a href="#src-20">20</a></sup>.

## the shared design

Under the product differences, the open-source harnesses share most of their design, and the docs of the closed ones describe the same parts.

<figure class="wide">
<ah-anatomy data-fig data-label="fig 6 · inside a harness">
<p class="fallback">An agent harness drawn as layers around the model: loop, context, tools, output limits, compaction, subagents, sandbox and extensions, with how five harnesses build each one. Tools: Claude Code has about 45 tools, edits by swapping an exact string and searches with grep in bash; Codex CLI has a shell and apply_patch and searches with rg; Gemini CLI has 27 tools with replace edits and glob and grep tools; opencode has 12 tools and picks string edits or patches per model; mini-swe-agent has only bash. Output limits: Claude Code about 30k characters for Bash, the rest saved to a file; Codex 10k tokens, head and tail; Gemini CLI 40k characters; opencode 2,000 lines or 50 KiB; mini-swe-agent the first and last 5k characters. Compaction: Claude Code near the limit, clearing old tool output first; Codex at 90% of the window; Gemini CLI at 50%, keeping the latest 30%; opencode keeps max(10%, 16k) free; mini-swe-agent never compacts.</p>
</ah-anatomy>
<figcaption><b>fig 6</b>Pick a layer to compare five harnesses. mini-swe-agent shows how much of the stack is optional. <span class="m">Read from the source of Codex, Gemini CLI, opencode and mini-swe-agent<sup><a href="#src-1">1</a></sup> and from Claude Code's docs<sup><a href="#src-5">5</a></sup>, 12 October 2026. Claude Code doesn't publish its compaction threshold.</span></figcaption>
</figure>

The edit tool follows the model's training. Cursor's team writes that "OpenAI's models are trained to edit files using a patch-based format" while "Anthropic's models are trained on string replacement", and its harness gives each model the format it knows<sup><a href="#src-21">21</a></sup>. Codex constrains its apply_patch tool with a grammar; Claude Code's Edit replaces one exact, unique string.

The context is ordered for the cache. The system prompt, tool schemas and memory files come first and don't change, and new items are only appended. The team behind Manus called the cache hit rate "the single most important metric" for an agent<sup><a href="#src-22">22</a></sup>, and OpenAI's write-up of the Codex loop says "cache hits are only possible for exact prefix matches"<sup><a href="#src-23">23</a></sup>. Long tool output gets cut to its head and tail, with the full text saved to a file the agent can grep later. When the window fills, a summarizer writes a handoff note and the old history is dropped. Codex's and Vibe's compaction prompts both open with "CONTEXT CHECKPOINT COMPACTION".

Harnesses also lose parts as models improve. Claude Code no longer ships separate Glob and Grep tools on macOS and Linux, and searches with find and grep in Bash<sup><a href="#src-5">5</a></sup>. Amp removed its to-do tool in January because Opus 4.5 no longer needed it<sup><a href="#src-24">24</a></sup>, replaced compaction with a "handoff" and then brought compaction back<sup><a href="#src-25">25</a></sup>. Anthropic says "every component in a harness encodes an assumption about what the model can't do on its own"<sup><a href="#src-26">26</a></sup>, and the context resets it built for Sonnet 4.5 became dead weight with Opus 4.5<sup><a href="#src-27">27</a></sup>.

## frameworks or from scratch

None of the leading coding harnesses is built on an agent framework. Gemini CLI doesn't use Google's own ADK; its core depends on the plain Gemini client<sup><a href="#src-28">28</a></sup>. The independent open-source harnesses write their own loop as well and borrow only a model client: LiteLLM for Aider, mini-swe-agent, Terminus 2 and OpenHands, and the Vercel AI SDK's provider packages for Cline and opencode.

<figure class="wide">
<ah-lineage data-fig data-label="fig 7 · what harnesses are built on">
<p class="fallback">A lineage diagram. Claude Code is shipped as a library, the Claude Agent SDK, and Codex CLI as the Codex SDK. Qwen Code is a fork of Gemini CLI. Terminus 2 was forked into Terminus-KIRA, which Meta-Harness's automated search started from. SWE-agent was rewritten as mini-swe-agent. OpenClaw, Letta Code and Kimi Code reuse parts of pi. NexAU-AHE is an automated search over the NexAU harness. Deep Agents is built on LangGraph, and Deep Agents Code on Deep Agents. Below, the borrowed model clients: LiteLLM under Aider, mini-swe-agent, Terminus 2 and OpenHands; AI SDK providers under Cline and opencode; pi-ai under Letta Code; and their own clients for Claude Code, Codex, Gemini CLI, Mistral Vibe and Kimi Code.</p>
</ah-lineage>
<figcaption><b>fig 7</b>The harnesses build on each other, and only LangChain's own coding agent sits on a framework. <span class="m">From each project's README and dependency files, read 12 October 2026<sup><a href="#src-28">28</a></sup>.</span></figcaption>
</figure>

What people build on now is a lab's harness shipped as a library. The Claude Agent SDK bundles the Claude Code CLI and drives it from Python or TypeScript<sup><a href="#src-29">29</a></sup>. It was downloaded 51 million times from npm and 30 million from PyPI in the last month, against 9 and 12 million for the OpenAI Agents SDK<sup><a href="#src-30">30</a></sup>. The Codex SDK spawns the Codex CLI the same way, and Cursor, Cline and OpenHands now ship their harnesses as SDKs too.

Anthropic's own advice is to "start by using LLM APIs directly: many patterns can be implemented in a few lines of code"<sup><a href="#src-31">31</a></sup>. I agree with it. To build a harness for a lab's model I'd start from that lab's SDK, and for any other model from a small loop like mini-swe-agent or pi, adding parts as the model shows it needs them.

## subscriptions and access

The labs now fight over which harness may use their models on a subscription. Anthropic blocked third-party clients that impersonated Claude Code in January<sup><a href="#src-32">32</a></sup>, barred subscription use in third-party harnesses such as OpenClaw in April, then in May allowed it again against a separate credit for programmatic use<sup><a href="#src-33">33</a></sup>. That change was paused on 15 June, the day it was due<sup><a href="#src-34">34</a></sup>. Google moved its paid-plan and free users from the open-source Gemini CLI to Antigravity CLI, cutting them off on 18 June<sup><a href="#src-35">35</a></sup>, and The Register reports the new CLI is not open source<sup><a href="#src-36">36</a></sup>.

OpenAI went the other way. It publishes the Codex CLI, app server and SDK as open source<sup><a href="#src-10">10</a></sup>, and added "Sign in with ChatGPT" so third-party apps can use a ChatGPT plan<sup><a href="#src-37">37</a></sup>.

Meanwhile other labs benchmark their models in Claude Code. Z.ai evaluated GLM-5.3 "in Claude Code 2.1.207" on most of its agent benchmarks<sup><a href="#src-38">38</a></sup>, and its docs show how to point Claude Code at Z.ai's endpoint<sup><a href="#src-39">39</a></sup>. MiniMax and Qwen report results in Claude Code as well.

## my pick

JetBrains surveyed more than 15,000 developers between May and July: 39% use Claude Code at work, up from 18% in January, and 16% use Codex, up from 3%. GitHub Copilot fell to 21% and Cursor to 12%<sup><a href="#src-40">40</a></sup>.

If I had to pick one harness today it would be Claude Code with Opus 5.5 or Sonnet 5.5, which lead both current boards. Codex with GPT-6.1 Sol scores 6.7 points lower on Terminal-Bench 4.0, and its full run cost $634 against $4.7k for Opus 5.5 in Claude Code<sup><a href="#src-2">2</a></sup>.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://github.com/openai/codex">Source code of Codex, Gemini CLI, Goose, Cline, opencode, mini-swe-agent and Mistral Vibe on GitHub (read 12 October 2026)</a></li>
<li id="src-2"><a href="https://www.tbench.ai/leaderboard">Terminal-Bench leaderboards, versions 2.0, 2.1 and 4.0 (read 12 October 2026)</a></li>
<li id="src-3"><a href="https://github.com/SWE-agent/mini-swe-agent">SWE-agent team, mini-swe-agent on GitHub (read 12 October 2026)</a></li>
<li id="src-4"><a href="https://github.com/harbor-framework/harbor/tree/main/src/harbor/agents/terminus_2">Harbor, Terminus 2 source (read 12 October 2026)</a></li>
<li id="src-5"><a href="https://code.claude.com/docs/en/tools-reference">Claude Code docs, tools reference (read 12 October 2026)</a></li>
<li id="src-6"><a href="https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md">Anthropic, Claude Code changelog (read 12 October 2026)</a></li>
<li id="src-7"><a href="https://arxiv.org/abs/2603.28052">Lee, Nair, Zhang, Lee, Khattab and Finn, Meta-Harness, arXiv 2603.28052 (30 March 2026)</a></li>
<li id="src-8"><a href="https://www.tbench.ai/news/leaderboard-integrity-update">Terminal-Bench, Leaderboard integrity update (19 April 2026)</a></li>
<li id="src-9"><a href="https://arxiv.org/abs/2604.25850">Lin et al., Agentic Harness Engineering, arXiv 2604.25850 (April 2026)</a></li>
<li id="src-10"><a href="https://developers.openai.com/blog/codex-as-a-platform">OpenAI, Codex as a platform: build on the open agent harness (August 2026)</a></li>
<li id="src-11"><a href="https://arxiv.org/abs/2605.23950">Zhang et al., Stop Comparing LLM Agents Without Disclosing the Harness, arXiv 2605.23950 (7 May 2026)</a></li>
<li id="src-12"><a href="https://arxiv.org/abs/2607.22585">Vats and Golev, The Scaffold Effect in Coding Agents, arXiv 2607.22585 (2026)</a></li>
<li id="src-13"><a href="https://arxiv.org/abs/2609.11987">Arjmandi, native and neutral harnesses on a contamination-controlled suite, arXiv 2609.11987 (8 September 2026)</a></li>
<li id="src-14"><a href="https://metr.org/notes/2026-02-13-measuring-time-horizon-using-claude-code-and-codex/">METR, Measuring time horizon using Claude Code and Codex (13 February 2026)</a></li>
<li id="src-15"><a href="https://mitfuturetech.substack.com/p/just-a-wrapper-how-much-do-scaffolds">Gundlach, Brown, Lynch and Thompson (MIT FutureTech), Just a wrapper? How much do scaffolds matter? (26 June 2026)</a></li>
<li id="src-16"><a href="https://hal.cs.princeton.edu/corebench_hard">Princeton HAL, CORE-Bench Hard and SWE-bench Verified Mini leaderboards (read 12 October 2026)</a></li>
<li id="src-17"><a href="https://artificialanalysis.ai/agents/coding-agents">Artificial Analysis, Coding Agent Index v1.5 (data of 11 October 2026)</a></li>
<li id="src-18"><a href="https://www.vals.ai/benchmarks/terminal-bench-4">Vals AI, Terminal-Bench 4.0 (updated 7 October 2026)</a></li>
<li id="src-19"><a href="https://deepswe.datacurve.ai/">Datacurve, DeepSWE v1.1 leaderboard (updated 22 September 2026)</a></li>
<li id="src-20"><a href="https://www.tbench.ai/news/harbor-index">Terminal-Bench, Harbor-Index 1.0 (read 12 October 2026)</a></li>
<li id="src-21"><a href="https://cursor.com/blog/continually-improving-agent-harness">Cursor, Continually improving our agent harness (30 April 2026)</a></li>
<li id="src-22"><a href="https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus">Manus, Context engineering for AI agents: lessons from building Manus (2025)</a></li>
<li id="src-23"><a href="https://openai.com/index/unrolling-the-codex-agent-loop/">OpenAI, Unrolling the Codex agent loop (23 January 2026)</a></li>
<li id="src-24"><a href="https://ampcode.com/news/todos-are-done">Amp, Todos are done (12 January 2026)</a></li>
<li id="src-25"><a href="https://ampcode.com/news/neo">Amp, Neo (6 May 2026)</a></li>
<li id="src-26"><a href="https://www.anthropic.com/engineering/harness-design-long-running-apps">Anthropic, Harness design for long-running apps (24 March 2026)</a></li>
<li id="src-27"><a href="https://www.anthropic.com/engineering/managed-agents">Anthropic, Scaling Managed Agents: decoupling the brain from the hands (8 April 2026)</a></li>
<li id="src-28"><a href="https://github.com/google-gemini/gemini-cli/blob/main/packages/core/package.json">Gemini CLI, packages/core/package.json, and the other projects' README and dependency files (read 12 October 2026)</a></li>
<li id="src-29"><a href="https://github.com/anthropics/claude-agent-sdk-python">Anthropic, claude-agent-sdk-python README (read 12 October 2026)</a></li>
<li id="src-30"><a href="https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk">npm and PyPI monthly download counts, 12 September to 11 October 2026</a></li>
<li id="src-31"><a href="https://www.anthropic.com/research/building-effective-agents">Anthropic, Building effective agents (19 December 2024)</a></li>
<li id="src-32"><a href="https://venturebeat.com/ai/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses/">VentureBeat, Anthropic cracks down on unauthorized Claude usage by third-party harnesses (January 2026)</a></li>
<li id="src-33"><a href="https://techstrong.ai/articles/anthropic-reverses-third-party-agent-ban-introduces-agent-sdk-credit-tier/">Techstrong.ai, Anthropic reverses third-party agent ban, introduces Agent SDK credit tier (May 2026)</a></li>
<li id="src-34"><a href="https://devops.com/anthropic-hits-pause-on-claude-agent-sdk-billing-change-for-now/">DevOps.com, Anthropic hits pause on Claude Agent SDK billing change, for now (18 June 2026)</a></li>
<li id="src-35"><a href="https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/">Google for Developers, An important update: transitioning Gemini CLI to Antigravity CLI (19 May 2026)</a></li>
<li id="src-36"><a href="https://www.theregister.com/ai-ml/2026/05/20/bye-bye-gemini-cli-google-nudges-devs-toward-antigravity/5243605">The Register, Bye bye Gemini CLI: Google nudges devs toward Antigravity (20 May 2026)</a></li>
<li id="src-37"><a href="https://thenewstack.io/sign-in-with-chatgpt/">The New Stack, Sign in with ChatGPT (2026)</a></li>
<li id="src-38"><a href="https://huggingface.co/zai-org/GLM-5.3">Z.ai, GLM-5.3 model card (25 August 2026)</a></li>
<li id="src-39"><a href="https://docs.z.ai/devpack/tool/claude">Z.ai docs, Claude Code (read 12 October 2026)</a></li>
<li id="src-40"><a href="https://blog.jetbrains.com/research/2026/08/ai-coding-agent-adoption-2026/">JetBrains Research, AI coding agent adoption in 2026 (August 2026)</a></li>
</ol>
</details>
