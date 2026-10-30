---
title: How the Claude Code team reviews code
date: 2026-10-27T18:00:00Z
description: Claude writes about 90% of Claude Code's own code, so its team rebuilt code review around scarce human attention. A summary of their seven review layers, risk tiers and reviewer tuning, plus the solo version from Anthropic's Claude Code 101 course.
tags: [ai, agents, code-review, claude-code]
category: ai
glyph: graph
figures: 3
---

In this article I summarize and discuss how the Claude Code team reviews code. With code cheaper to produce, it's more important than ever to understand and maintain the code we ship. Last week I wrote that coding agents produce far more code than teams can ship, and that review is where it piles up<sup><a href="#src-1">1</a></sup>.

The team's post is by Addy Osmani, Morgan Westlee Lunt and Qing Wang<sup><a href="#src-2">2</a></sup>. Claude writes about 90% of Claude Code's own code, so they had to deal with this before most teams. Their goal fits in one sentence: "we started optimizing for the minimum amount of human review time that doesn't raise reverts or incidents." At the end I add the version for one person working alone, from lesson 7 of Anthropic's Claude Code 101 course<sup><a href="#src-3">3</a></sup>. Both were read on 27 October 2026.

Here is the whole workflow on one page before the details. A change goes from a plan to an agent's implementation, through automated review, checks and a human approval, and then into a release that someone on call watches. What makes it work is the loops that send work back.

<figure class="wide">
<cr-flow data-fig data-label="fig 1 · the loops">
<p class="fallback">The Claude Code team's workflow as seven steps: plan (a person), implement (an agent), AI review (an agent), checks (CI), approve (a person), release (a system) and on-call (a person). Within a pull request, three loops send work back: the implementing agent proves its change works with tests, a build and screenshots; review findings go back to the agent, which fixes them, and later passes review only the new diff; and after three rounds the reviewer asks the author to step back and rethink the approach. After the merge, three more: the on-call engineer fixes forward or rolls back a release, every incident and revert becomes an eval case for the reviewer, and findings that keep coming back become a rule or a lint.</p>
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

Most of us don't have a merge queue or an on-call rotation. Lesson 7 of Claude Code 101 covers the same ideas for one person in a terminal<sup><a href="#src-3">3</a></sup>. First, read the diff yourself with `/diff` instead of trusting Claude's summary, and look for changes you didn't ask for, weakened or deleted tests, new packages added for one function, and hard-coded URLs or keys. If the whole change is wrong, `/rewind` (or Esc twice) restores the code and the conversation, though not what shell commands changed.

Then get a second opinion with `/code-review`, which reviews the change "in a clean context, with none of your session's history" and edits nothing unless you ask. `/code-review low` reports only high-confidence findings; `/code-review high` casts a wider net. Sort what comes back into three piles: fix now, ask why, and leave for later, and when you ask for a fix, ask for evidence such as the test output. When the same problem keeps coming up, write a rule in `CLAUDE.md`, which is the next lesson in the course. On this blog every pull request gets `/code-review high`, and I only run another round when the first one finds something serious.

<div class="note"><span class="label">take-home</span>Read the diff, get a clean-context review, sort the findings, and move repeated findings into a rule.</div>

The team's post ends with an adoption checklist in four groups, and it's the best place to start. Before the pull request: give the agent checks it can run, run `/code-review` and `/security-review`, and keep a `REVIEW.md`. On every pull request: require CI, ask for testing, risk and how to revert in the template, add an AI reviewer and a security review whose threads must be resolved, match the depth of review to the risk, and cap the rounds. For approval: write down risk tiers set by the change, keep the lighter paths for authors you trust, use CODEOWNERS and branch protection, and never let a bot's approval replace a person's. After the merge: flags, staged releases, one-step rollback, and incidents turned into tests for the reviewer.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="/blog/ai-writes-more-code/">AI writes a lot more code, and... that's it? (this blog, 19 October 2026)</a></li>
<li id="src-2"><a href="https://claude.dev/blog/solving-code-review-at-anthropic/">Osmani, Westlee Lunt and Wang, How the Claude Code team does code review, claude.dev (15 October 2026)</a></li>
<li id="src-3"><a href="https://academy.claude.com/courses/claude-code-101/code-review">Anthropic Academy, Claude Code 101, lesson 7: code review</a></li>
</ol>
</details>
