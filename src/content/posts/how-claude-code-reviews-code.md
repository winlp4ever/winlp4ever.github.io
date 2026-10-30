---
title: How the Claude Code team reviews code
date: 2026-10-27T18:00:00Z
description: Claude writes about 90% of Claude Code's own code, so its team rebuilt code review around scarce human attention. A summary of their seven review layers, risk tiers and reviewer tuning, plus how one person can automate the same layers.
tags: [ai, agents, code-review, claude-code]
category: ai
glyph: review
figures: 4
---

In this article I summarize and discuss how the Claude Code team reviews code. With code cheaper to produce, it's more important than ever to understand and maintain the code we ship. Last week I wrote that coding agents produce far more code than teams can ship, and that review is where it piles up<sup><a href="#src-1">1</a></sup>.

The team's post is by Addy Osmani, Morgan Westlee Lunt and Qing Wang<sup><a href="#src-2">2</a></sup>. Claude writes about 90% of Claude Code's own code, so they had to deal with this before most teams. Their goal fits in one sentence: "we started optimizing for the minimum amount of human review time that doesn't raise reverts or incidents." At the end I work out how one person can set up the same layers, starting from lesson 7 of Anthropic's Claude Code 101 course<sup><a href="#src-3">3</a></sup>. The post and the course were read on 27 October 2026.

Here is the whole workflow on one page before the details. A change goes from a plan to an agent's implementation, through automated review, checks and a human approval, and then into a release that someone on call watches. What makes it work is the loops that send work back.

<figure class="wide">
<cr-flow data-fig data-label="fig 1 · the loops">
<p class="fallback">The Claude Code team's workflow as seven steps: plan (a person), implement (an agent), AI review (an agent), checks (CI), approve (a person), release (a system) and on-call (a person). Within a pull request, three loops send work back: the implementing agent proves its change works with tests, a build and screenshots; review findings go back to the agent, which fixes them, and later passes review only the new diff; and after three rounds the reviewer asks the author to step back and rethink the approach. After the merge, three more: the on-call engineer fixes forward or rolls back a release, every incident and revert becomes an eval case for the reviewer, and findings that keep coming back become rules in CLAUDE.md, REVIEW.md or a lint, which every later change goes through.</p>
</cr-flow>
<figcaption><b>fig 1</b>The steps a change goes through, and the loops that send it back. <span class="m">My drawing of the Claude Code team's post<sup><a href="#src-2">2</a></sup>. Pick a group to highlight the loops inside one pull request or the ones that run after the merge.</span></figcaption>
</figure>

## what review is for

The post starts by splitting review into two jobs: catching problems before they ship, and spreading knowledge of the codebase across the team. Agents now do most of the first one, and they do it while the code is being written: "review runs continuously, more like spellcheck while you write." The scarce thing is a person's attention, so that's what they measure. They track human approvals per pull request, human comments, and how long a pull request waits on a person, and they treat revert and incident rates as the guardrails that must not go up.

The results they report: from June to September, merged pull requests to Claude Code more than doubled while the share that had to be reverted fell by more than 40%. Anthropic's monorepo went from about 2,500 changes landing a day in May to more than 30,000 in September.

<div class="note"><span class="label">take-home</span>Measure the human time a change costs, and hold reverts and incidents flat while you cut it.</div>

## seven layers

A change goes through seven layers, and most of them are machines. Before a pull request exists, the author's agent has to show its work: tests, a build, screenshots, whatever proves the change does what it claims. Boris Cherny, who created Claude Code, estimates that verification makes results two to three times better. A second agent then reads the diff in a fresh context. On the pull request, Claude Code Review runs parallel bug-hunting agents whose findings are voted on and tagged Important, Nit or Pre-existing, and a security review runs alongside it. A pull request can't merge while a finding from either one is still open: you fix it or close the thread with a short reason. CI runs lint, types, cross-platform tests, the build and packaging. After that comes human approval, scaled by risk, then a merge queue, feature flags and a release that goes to a `latest` channel before `stable`, and finally a weekly on-call engineer who watches for problems and fixes forward or rolls back.

<figure class="wide">
<cr-layers data-fig data-label="fig 2 · seven layers">
<p class="fallback">Seven layers a change passes through on the Claude Code team. 1, verified before review: tests, build and screenshots, and a fresh-context agent reads the diff. 2, AI review on every pull request: parallel bug hunters and a verifier vote, with findings tagged Important, Nit or Pre-existing; open findings block a merge. 3, security review, whose open findings also block a merge. 4, automated checks: lint, types, cross-platform tests, build and packaging, which block a merge. 5, human approval by risk tier: none for low-risk changes such as docs or additive changes behind a flag once the checks are green, if the author is on the repo's trusted list, one person for ordinary product changes and sensitive areas such as caching, the auto-updater and system prompts, and two people for the highest-risk code. 6, merge queue, feature flags and a latest-then-stable release. 7, a weekly on-call engineer who fixes forward or rolls back.</p>
</cr-layers>
<figcaption><b>fig 2</b>Five of the seven layers are machines; how many people approve depends on the risk of the change. <span class="m">From the Claude Code team's post<sup><a href="#src-2">2</a></sup>. Pick a tier to see the approval rule; the lighter tiers apply only to trusted authors. The person directing an agent counts as a required reviewer, and an agent's approval never counts as a person's.</span></figcaption>
</figure>

The risk tiers are the part I'd copy first. A classifier picks the tier from the change. Docs, copy, internal-only features and additive changes behind a flag need no human approval once automated review and security are green. Ordinary product changes need one person, and that person can be the author. The highest-risk paths need two. These lighter paths are only for authors on the repo's trusted list, mostly the team that owns it; everyone else needs a second person, and some paths, anything owners mark as sensitive and any CI workflow file, always need one. A few rules keep it honest: "the change sets the tier, not the author", "an agent's approval never counts as a person's", and an approval covers one specific commit, so a new commit needs a new one.

<div class="note"><span class="label">take-home</span>Let the blast radius of a change decide how many people read it, and make the agent prove its work before anyone does.</div>

## tuning the reviewer

An automated reviewer that complains too much is worse than one that says nothing, because an agent author treats every nit as another commit and another round. The team found one pull request that went through more than fifty rounds of review and fixes overnight before its author stopped it, and that about 59% of what the reviewer kept flagging had been in the code since its first pass.

So they made it converge. After three rounds the reviewer asks the author to step back and reconsider the approach, later passes look only at the new diff, it stops repeating findings, and a nightly run deals with the old code separately. They measure noise by what authors do with each comment: fixed it, said it was wrong, said it was intentional, or said it doesn't matter. Every incident and revert becomes an eval case, and the reviewer runs against that set daily and again whenever its prompt, tools or model change.

<figure class="wide">
<cr-converge data-fig data-label="fig 3 · a reviewer that converges">
<p class="fallback">Paired bars for the Claude Code team's automated reviewer. When the Code Review research preview launched, the share of internal pull requests getting substantive review comments went from 16% to 54%. Before and after the convergence changes, the share passing after one review-and-fix round went from 65% to 78%, the share needing five or more rounds from 8.9% to 1.5%, and the mean number of reviews to pass from 2.08 to 1.32.</p>
</cr-converge>
<figcaption><b>fig 3</b>More useful comments, and far fewer pull requests stuck in review loops. <span class="m">From the Claude Code team's post<sup><a href="#src-2">2</a></sup>; the first row compares before and after the research preview launched, the other three before and after the convergence changes. The percentages share one scale. These are Anthropic's internal numbers.</span></figcaption>
</figure>

Each repository also gets a `REVIEW.md` written by its code owners, next to the usual `CLAUDE.md`. The good ones are short. They say what failure looks like there ("for docs it's 'it lies,' for config it's 'it misroutes'"), cap the nits, list paths to skip, and ask for a file and line as evidence. When the reviewer keeps flagging the same kind of thing, the fix goes into a skill, a lint rule or an instruction file, so it stops coming back.

<div class="note"><span class="label">take-home</span>Cap the rounds, re-review only what changed, and turn every incident into a test for the reviewer.</div>

## where people stay

People still decide whether something should be built at all, review the risky code and the architecture, read the evidence an agent produces, and own what happens after the merge. "You land it, you own it" is the rule, with the explicit note that "it isn't blame. Owning a fix means you have the most context; incident reviews look at the system." When someone disagrees with the direction of a change, they're asked to say it early in the thread, since closing a pull request costs little when an agent wrote it.

The post is also frank about what it gave up: "Nobody on the team keeps a complete mental model of Claude Code in their head, and we don't think anyone needs to." To share context instead, people ask Claude for explainers of the parts of the code they need, sometimes as small visual artifacts, and work happens in open Slack channels. That's the line from the post I'd argue with. Last week's research on review and skills suggests the mental model is where judgement comes from<sup><a href="#src-1">1</a></sup>, and this setup works because the people approving the risky changes still have it.

## the solo version

The team's post ends with an adoption checklist in four groups: before the pull request, on every pull request, approval, and after the merge. Lesson 7 of Claude Code 101 covers the part one person does in a terminal<sup><a href="#src-3">3</a></sup>: read the diff with `/diff`, run `/code-review`, and sort what comes back. That's a good habit, but it leaves you doing by hand what the team hands to machines. Most of the checklist can be set up by one person on a Pro or Max plan. This is how I'd map it, using what I could check in the Claude Code and GitHub docs on 30 October 2026.

| the team's layer | for one person |
|---|---|
| verified before review | test commands in `CLAUDE.md`, hooks that format, lint and run the tests, evidence for UI changes |
| AI review on every pull request | `/code-review` locally, then `claude-code-action` on GitHub |
| security review | `/security-review` locally, the security review action on GitHub |
| automated checks | CI as a required status check |
| human approval by risk | a written list of paths you always read line by line |
| merge queue, flags, release | small pull requests, flags, a one-step revert |
| on-call | every bug becomes a test, every repeated finding becomes a rule |

Put together, the workflow for one person looks like this. The rest of this section goes through it step by step.

<figure class="wide">
<cr-solo data-fig data-label="fig 4 · the solo loops">
<p class="fallback">One developer's review workflow, top to bottom: plan (you, in plan mode), implement (the agent, with hooks), /code-review (in a fresh context), /security-review (only for risky changes), pull request (CI and an AI reviewer), branch rules (checks green and threads resolved), your own read (only for risky paths), and merge (behind a flag, with a one-step revert). Inside a pull request, a Stop hook keeps the agent working until the tests pass; a serious review finding goes back to the agent to fix and the review runs again; and if a serious finding is still there after three rounds, the change goes back to the plan for a redesign. After the merge, a repeated finding becomes a line in CLAUDE.md and then a hook, and every bug becomes a test that CI runs.</p>
</cr-solo>
<figcaption><b>fig 4</b>The same loops as fig 1, run by one person and their tools. <span class="m">Dashed steps run only for risky changes. Pick a group to highlight the loops inside one pull request or the ones that run after the merge.</span></figcaption>
</figure>

### before the pull request: make the agent prove it

Claude Code's best-practices page puts it bluntly: if the agent has nothing to run that tells it whether the work is done, you become the test suite<sup><a href="#src-4">4</a></sup>. So the first job is to give it something to run. Put the test, build and lint commands in `CLAUDE.md`, then turn the ones that must always run into hooks. The docs draw the line clearly: `CLAUDE.md` is guidance the model can ignore, while a hook runs every time<sup><a href="#src-5">5</a></sup>. Three hooks cover most of it:

- a `PostToolUse` hook on `Edit|Write` that formats and lints the file Claude just changed;
- a `Stop` hook that runs the tests and exits with code 2 while they fail, which stops Claude from ending its turn. Claude Code lets the turn end anyway after eight blocks in a row, so it can't loop forever;
- a `PreToolUse` hook that refuses edits to files the agent shouldn't touch, such as `.env`, `.github/workflows/` and the tests themselves. Kent Beck has described agents deleting or changing tests to make them pass<sup><a href="#src-6">6</a></sup>, and weakened tests are the first thing the course tells you to look for in a diff.

In `.claude/settings.json` that looks like this; the two scripts are a few lines of shell each.

```json
{
  "hooks": {
    "PostToolUse": [{ "matcher": "Edit|Write", "hooks": [
      { "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write" }] }],
    "PreToolUse": [{ "matcher": "Edit|Write", "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh" }] }],
    "Stop": [{ "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/tests-pass.sh" }] }]
  }
}
```

```sh
#!/bin/sh
# .claude/hooks/tests-pass.sh: keep Claude working while the tests fail
npm test > /tmp/claude-tests.log 2>&1 || { tail -30 /tmp/claude-tests.log >&2; exit 2; }
```

Tests don't cover everything, so for anything visible ask for evidence: the command Claude ran and its output, or a screenshot. `/verify` runs the app to check a change that tests can't. Simon Willison's version of the rule is that your job is to deliver code you have proven to work, and if you haven't seen it do the right thing yourself, it doesn't work yet<sup><a href="#src-7">7</a></sup>. For anything bigger than a small fix, start in plan mode and keep the plan as a short spec. The reviewer can then check the change against what you meant to build, which works better than asking it to find problems in general.

### a second opinion in a clean context

Before reading the diff yourself, run `/code-review`. It reviews in a separate subagent with none of your session's history, and it doesn't edit anything unless you add `--fix`<sup><a href="#src-8">8</a></sup>. The separate context is the point. In Self-Correction Bench, a 2025 study of 14 models, the models on average failed to correct 64.5% of the errors in their own output, while correcting the same errors when they were presented as coming from somewhere else<sup><a href="#src-9">9</a></sup>. The docs add a fair caveat: by default the reviewer is the same model, so you get a fresh pair of eyes, not a smarter one. Some people send the diff to a model from another lab as well. That sounds reasonable, but I haven't found a study showing it beats a fresh context with the same model.

It also helps to know how good these reviewers are. The benchmarks I found were all run by vendors, and the best tools in them sit around half precision and half recall. Augment's benchmark measured Claude Code at about 22% precision and 50% recall on its dataset<sup><a href="#src-10">10</a></sup>, and Kodus found that pushing its own reviewer's recall from 53% to 62% nearly doubled the false positives<sup><a href="#src-11">11</a></sup>. So the course's three piles (fix now, ask why, leave for later) matter more than they look. The local command reads `CLAUDE.md` but not `REVIEW.md`, so put the "don't report" lines (style, generated files) in `CLAUDE.md`.

Knowing when to stop matters as much. On this blog every pull request gets `/code-review high`. I run another round only when the first one found something serious, and if a third round still finds something serious, I stop fixing and rethink the design. People who write about agent review seem to converge on the same habit, a small cap on rounds and a step back when it's reached, for three reasons:

- **A fix is new code.** It can break something else, so a serious fix earns one more pass. One pass is usually enough: after the team's convergence changes, 78% of their pull requests passed after a single round of review and fixes.
- **Each extra round finds less and invents more.** A reviewer asked to find problems will always find something, and the Claude Code docs warn that fixing every finding leaves you with extra layers of abstraction and tests for cases that can't happen<sup><a href="#src-4">4</a></sup>. With precision around half, the later rounds are mostly noise, and an agent left alone will keep going: the team's worst pull request went through more than fifty rounds overnight.
- **Findings that keep coming back point at the design.** In the team's data, 59% of what the reviewer kept flagging had been in the code since the first pass. When round three still finds something serious, the problem is usually the approach, and another patch won't fix it.

Two cautions. Three is the team's number, not a law; what matters is that you pick the stopping rule before you start, not at 1am in round seven. And reaching the cap doesn't mean you can merge with a serious finding still open. It means you stop patching, go back to the plan, and either redesign or cut the change down. Nits never earn another round.

`/security-review` reviews the branch's diff against your default branch, and it's worth running whenever a change touches the attack surface:

- login, sessions, tokens, permissions or anything that decides who can do what;
- input from outside that reaches a database query, a shell command, HTML, a file path or a URL your server fetches;
- file uploads, parsing and deserialization;
- secrets, keys and config, including logging that could leak them;
- new or upgraded dependencies;
- CI workflows, deploy scripts and infrastructure config;
- payments and personal data;
- prompts and tool permissions for an LLM feature that reads untrusted content, where prompt injection is the new version of the same problem.

Docs, copy, styling and refactors that don't change what the code accepts or calls can skip it. A clean result isn't proof either. A 2025 study found that GitHub Copilot's code review frequently missed SQL injection, cross-site scripting and insecure deserialization<sup><a href="#src-12">12</a></sup>, so keep deterministic tools such as dependency alerts and CodeQL or Semgrep next to it, and read those paths yourself.

### on the pull request: CI is the second person

Local checks are easy to skip on a tired evening, so the same checks should run on the pull request too. `/install-github-app` sets up `anthropics/claude-code-action`, and the docs include a workflow that runs the official `code-review` plugin on every pull request and posts inline comments. With a token from `claude setup-token`, it runs on a Pro or Max subscription instead of an API key<sup><a href="#src-13">13</a></sup>. The managed Claude Code Review that the team uses, with `REVIEW.md`, severity tags and re-reviews of only the new diff, is for Team and Enterprise plans<sup><a href="#src-14">14</a></sup>. For security there is `anthropics/claude-code-security-review`, but its README warns that it isn't hardened against prompt injection, so run it only on your own pull requests<sup><a href="#src-15">15</a></sup>.

Then protect the main branch. GitHub's required approvals don't help when you work alone, because you can't approve your own pull request, and neither Claude's app nor Code Review ever approves one. Three settings do work with one person: require status checks to pass, require conversation resolution before merging, and don't allow bypassing the rules<sup><a href="#src-16">16</a></sup>. Together they give you the team's rule that nothing merges while CI is red or a review thread is open, and the last setting applies it to you too. Even the managed reviewer's own check always ends as neutral, so the blocking has to come from rules like these.

The risk tiers carry over as well. Write down the paths you always read line by line yourself: auth, payments, data migrations, CI and release workflows, anything that deletes data. A pull request that touches none of them can merge on green checks and resolved threads. One that touches any of them waits for your own reading of the diff with `/diff`, and if it's wrong, `/rewind` restores the code and the conversation, though not what shell commands changed.

### after the merge

Keep pull requests small and keep a one-step revert. Google's DORA 2025 report on AI-assisted development lists working in small batches and strong version control, including rollback, among the capabilities that decide whether AI helps a team or hurts it<sup><a href="#src-17">17</a></sup>. Put new behaviour behind a flag when you can. Every bug that reaches production becomes a test, which is the solo version of the team's eval set. When the reviewer keeps flagging the same thing, add a line to `CLAUDE.md`, and if Claude still misses it, move it into a hook or a lint rule. The docs give the same advice: when you keep adding emphasis to a `CLAUDE.md` line, it belongs in a hook.

### keeping the code in your head

Automating review leaves one job that nobody else can do for you: understanding the code. Anthropic's own trial on this, published in January 2026, had 52 mostly junior engineers learn a new library with or without AI. The AI group scored 50% on a quiz afterwards against 67% for the group that coded by hand. The engineers who only delegated code generation scored below 40%, while those who used AI to ask conceptual questions or to explain the code it wrote kept their scores at 65% or more<sup><a href="#src-18">18</a></sup>. The groups were small, but the advice is easy to follow: ask Claude to explain a change before you accept it, and ask why, not only what. METR's 2025 trial is a reason not to trust your own impression here: experienced developers were 19% slower with AI while believing they were 20% faster<sup><a href="#src-19">19</a></sup>.

<div class="note"><span class="label">take-home</span>Automate what a machine can check: hooks before the pull request, a reviewer and CI on it, and branch rules that bind you too. Spend your own reading on the risky paths and on understanding the code.</div>

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="/blog/ai-writes-more-code/">AI writes a lot more code, and... that's it? (this blog, 19 October 2026)</a></li>
<li id="src-2"><a href="https://claude.dev/blog/solving-code-review-at-anthropic/">Osmani, Westlee Lunt and Wang, How the Claude Code team does code review, claude.dev (15 October 2026)</a></li>
<li id="src-3"><a href="https://academy.claude.com/courses/claude-code-101/code-review">Anthropic Academy, Claude Code 101, lesson 7: code review</a></li>
<li id="src-4"><a href="https://code.claude.com/docs/en/best-practices">Claude Code docs, best practices</a></li>
<li id="src-5"><a href="https://code.claude.com/docs/en/hooks-guide">Claude Code docs, hooks guide</a></li>
<li id="src-6"><a href="https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent">Gergely Orosz, TDD, AI agents and coding with Kent Beck, The Pragmatic Engineer (June 2025)</a></li>
<li id="src-7"><a href="https://simonwillison.net/2025/Dec/18/code-proven-to-work/">Simon Willison, Your job is to deliver code you have proven to work (18 December 2025)</a></li>
<li id="src-8"><a href="https://code.claude.com/docs/en/code-review-local">Claude Code docs, review code locally</a></li>
<li id="src-9"><a href="https://arxiv.org/abs/2507.02778">Tsui, Self-Correction Bench, arXiv 2507.02778 (2025)</a></li>
<li id="src-10"><a href="https://augmentcode.com/blog/we-benchmarked-7-ai-code-review-tools-on-real-world-prs-here-are-the-results">Augment Code, We benchmarked 7 AI code review tools on real-world PRs (December 2025), a vendor benchmark</a></li>
<li id="src-11"><a href="https://kodus.io/en/ai-code-review-recall/">Kodus, on recall and false positives in AI code review, a vendor report</a></li>
<li id="src-12"><a href="https://arxiv.org/abs/2509.13650">Amro and Alalfi, GitHub's Copilot Code Review: Can AI Spot Security Flaws Before You Commit?, arXiv 2509.13650 (September 2025)</a></li>
<li id="src-13"><a href="https://code.claude.com/docs/en/github-actions">Claude Code docs, GitHub Actions</a></li>
<li id="src-14"><a href="https://code.claude.com/docs/en/code-review">Claude Code docs, Code Review</a></li>
<li id="src-15"><a href="https://github.com/anthropics/claude-code-security-review">anthropics/claude-code-security-review on GitHub</a></li>
<li id="src-16"><a href="https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches">GitHub docs, about protected branches</a></li>
<li id="src-17"><a href="https://cloud.google.com/resources/content/2025-dora-ai-capabilities-model-report">Google Cloud, DORA AI Capabilities Model report (2025)</a></li>
<li id="src-18"><a href="https://www.anthropic.com/research/AI-assistance-coding-skills">Anthropic, How AI assistance impacts the formation of coding skills (January 2026)</a></li>
<li id="src-19"><a href="https://arxiv.org/abs/2507.09089">Becker et al., METR, Measuring the impact of early-2025 AI on experienced open-source developer productivity, arXiv 2507.09089 (July 2025)</a></li>
</ol>
</details>
