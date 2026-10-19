---
title: AI writes a lot more code, and that's about it
date: 2026-10-19T18:00:00Z
description: Coding agents multiply commits and pull requests. In the 2025 and 2026 studies, finished work moves far less, code review gets slower, and outside the AI labs the gains barely show up in firms' results. The clearest change so far is in who gets hired.
tags: [ai, agents, productivity]
category: ai
glyph: versus
figures: 3
---

Today I read Anthropic's report on how employment is changing inside the company<sup><a href="#src-1">1</a></sup>. It's both interesting and a bit weird. Commits per engineer are at 5x their level of six months earlier, and in interactive sessions its agents log six times as many hours as the people running them. So I did some research on whether the rest of the industry is converging on this promise of xN productivity, which, by the way, frontier companies have made every six months or so, along with AGI.

Make no mistake, I'm a tech and AI enthusiast and I truly believe AI is useful. But reality is often messier than the picture we paint in our heads, so let's take a look. **Coding agents make people write a lot more code. Finished work, shipped software and company results move much less, and review is where the extra code piles up.**

The numbers below come from two METR trials, three field experiments at large companies, telemetry from 725,938 engineers at 718 firms, a study of more than 500,000 GitHub developers, four 2026 papers on pull requests written by agents, and for the wider economy a survey of nearly 6,000 executives, Danish register data and a St. Louis Fed note, all read on 19 October 2026.

## commits go up, releases much less

The cleanest comparison comes from an NBER paper that follows more than 500,000 developers on GitHub through three generations of tools<sup><a href="#src-2">2</a></sup>. Commits rise about 30% with autocomplete, 180% with interactive agents and 240% with autonomous ones. For autonomous agents, the number of projects rises about 80% and the number of releases about 30%. In four app marketplaces the count of new apps jumps, and total usage of those marketplaces doesn't. The authors' own summary is that "large task-level AI productivity gains have therefore translated only partially into shipped and used software thus far."

A Harvard job-market paper gets to the same place from inside companies<sup><a href="#src-3">3</a></sup>. Fiona Chen and James Stratton use Jellyfish data on 725,938 engineers at 718 firms from 2021 to March 2026. When a team adopts coding agents, lines of code go up 30%, pull requests 23% and commits 20%. Jira issues resolved, which is their measure of work that reached production, show no significant change, and the interval rules out a rise of more than 12%. The same data says engineers spend about 42% of their time writing code (30% in a survey they ran), so even if writing code took no time at all, most of the week would look the same.

<figure class="wide">
<pd-funnel data-fig data-label="fig 1 · written vs shipped">
<p class="fallback">Two bar charts of the change after developers adopt coding agents. In the NBER study of more than 500,000 GitHub developers using autonomous agents, commits rise 240%, projects 80% and releases 30%. In the Harvard study of 725,938 engineers at 718 firms, lines of code rise 30%, pull requests 23% and commits 20%, while Jira issues resolved rise 3.3%, with a 95% interval from −5.8% to +12.3% that includes zero.</p>
</pd-funnel>
<figcaption><b>fig 1</b>Agents raise the code people write and the projects they start a lot more than the work that gets finished. <span class="m">NBER w35275, autonomous-agent estimates<sup><a href="#src-2">2</a></sup>. Chen and Stratton, agent estimates<sup><a href="#src-3">3</a></sup>; I computed the issues-resolved percentage from their coefficient (0.12, s.e. 0.17) and baseline (3.67). Both studies compare adopters with non-adopters over time; neither is randomized.</span></figcaption>
</figure>

## the careful studies

The randomized trials are smaller and older than I'd like. METR's 2025 trial put 16 experienced open-source developers on 246 tasks from their own repositories, and AI made the tasks take 19% longer (95% interval +2% to +39%)<sup><a href="#src-4">4</a></sup>. Before they started, the developers expected AI to cut their time by 24%, and afterwards they still believed it had cut it by 20%.

METR ran it again from August 2025 with 57 developers and newer agents, Claude Code and Codex included<sup><a href="#src-5">5</a></sup>. Ten of the original developers came back, and for them tasks took 18% less time; for the 47 new ones, 4% less. Both intervals include zero. A lot of developers now refuse to do tasks without AI, so the easy wins drop out of the sample, and METR calls its data "only very weak evidence" for how big the speedup is.

The large field experiments are from the autocomplete era. Three randomized trials at Microsoft, Accenture and a Fortune 100 company, with 4,867 developers, found 26% more completed tasks, mostly from junior developers<sup><a href="#src-6">6</a></sup>. For agents in a company, the best study is Microsoft's own look at its early-2026 rollout of Claude Code and Copilot CLI: about 24% more pull requests per engineer per day (95% credible interval +14.5% to +33.7%)<sup><a href="#src-7">7</a></sup>. Engineers chose whether to adopt, and the paper counts pull requests only, with nothing on quality or what shipped.

<figure class="wide">
<pd-trials data-fig data-label="fig 2 · the careful studies">
<p class="fallback">A dot plot of six estimates with 95% intervals. METR early 2025, 16 experienced developers: 16% slower per task. METR 2026, returning developers: 22% faster, interval from 8% slower to 61% faster. METR 2026, new developers: 4% faster, interval from 8% slower to 18% faster. Cui and colleagues, three randomized trials with 4,867 developers: 26% more completed tasks, interval 6% to 46%. Microsoft 2026 rollout, observational: 24% more pull requests, interval 14.5% to 33.7%. Chen and Stratton, observational: 3.3% more issues resolved, interval −5.8% to +12.3%.</p>
</pd-trials>
<figcaption><b>fig 2</b>The careful estimates sit between a small slowdown and about a quarter more output, and the ones near +25% count tasks or pull requests. <span class="m">METR measured time per task; I converted its time changes to speed as 1/(1 + change) − 1, so +19% time shows as −16%. Sources: METR<sup><a href="#src-4">4</a></sup><sup><a href="#src-5">5</a></sup>, Cui et al.<sup><a href="#src-6">6</a></sup>, Microsoft<sup><a href="#src-7">7</a></sup>, Chen and Stratton<sup><a href="#src-3">3</a></sup>. Hover a dot for the interval.</span></figcaption>
</figure>

## review is where it piles up

In the Harvard data, adopting agents stretches the time from a pull request to its merge from 7.0 to 10.5 days, nearly doubles the share of pull requests where a reviewer asks for changes (13% to 25%), and adds 35% more review comments<sup><a href="#src-3">3</a></sup>. LinearB's benchmark of 8.1 million pull requests found that 32.7% of AI pull requests merge within 30 days, against 84.4% of unassisted ones<sup><a href="#src-8">8</a></sup>.

<figure class="wide">
<pd-review data-fig data-label="fig 3 · the review queue">
<p class="fallback">Paired bars for code review. Across 718 firms, after teams adopt agents, the time from pull request to merge goes from 7.0 to 10.5 days, the share of pull requests with changes requested from 13% to 25%, and review comments per pull request from 1.66 to 2.24. In LinearB's 8.1 million pull requests, 84.4% of unassisted pull requests merge within 30 days and 32.7% of AI pull requests do.</p>
</pd-review>
<figcaption><b>fig 3</b>More code goes in and review slows down. <span class="m">Chen and Stratton, agent adopters before and after<sup><a href="#src-3">3</a></sup>. LinearB 2026 benchmarks, which call the last row the acceptance rate and describe the comparison as correlational<sup><a href="#src-8">8</a></sup>.</span></figcaption>
</figure>

What gets merged needs more fixing afterwards. In one 2026 study, 4.5% of merged agent pull requests got a verified fix within 30 days, 1.62 times the odds for human pull requests in the same repositories, and the agent that wrote the change wrote 69.6% of those fixes<sup><a href="#src-9">9</a></sup>. Another looked at 86,156 test patches written by agents and found 80.2% with weak or no checks of the result<sup><a href="#src-10">10</a></sup>. When an agent's pull request touches both the application and the deployment setup, 43% to 56% of them merge with no review at all<sup><a href="#src-11">11</a></sup>.

The quality cost lasts longer than the speed-up. Open-source projects that adopted Cursor got faster for about two months, then went back to their old pace, while static-analysis warnings stayed 30% higher and code complexity 42% higher<sup><a href="#src-12">12</a></sup>. It also depends on the agent: in a study of five agents, Codex pull requests were reverted about half as often as human ones (6.1% against 11.5%) and Devin's more often (14.5%)<sup><a href="#src-13">13</a></sup>. Apps built end to end by agents are the weakest case. An audit of 200 deployed apps made with Claude Code or Lovable found at least one vulnerability in 91% of them<sup><a href="#src-14">14</a></sup>.

## inside Anthropic

Anthropic's report shows the same bottleneck once you read past the headline<sup><a href="#src-1">1</a></sup>. Those agent hours include a lot of waiting: about 80% of the time in interactive Claude sessions is the agent waiting for a person. Reading everything the agents write would take more than half a work week. Median meeting time went up 20% in a year, and "meta-work", building tools for agents and supervising them, went from 10% to 22% of sessions. The authors write that "more code does not necessarily mean better code or business impact", and that the 192 engineers who adopted agents were already on a steeper path than the 74 who didn't. The company also tripled its headcount during a revenue boom, so the output numbers can't be separated from the business taking off.

The hiring numbers are the solid part. The junior share of technical hires fell from 27% to 9%, and the junior share of technical staff from 21% to 14% since early 2025. That matches the payroll data: employment of 22 to 25 year olds in AI-exposed occupations is now 19% below where it would be if it had kept pace with less-exposed peers, up from 13% in the August 2025 version of the study<sup><a href="#src-15">15</a></sup>.

## the rest of the economy

Outside software the clear gains are on narrow tasks. Customer-support agents with an AI assistant resolved 14% more issues per hour, and novices 34% more<sup><a href="#src-16">16</a></sup>. At the level of whole firms it mostly disappears. In a survey of nearly 6,000 executives in the US, UK, Germany and Australia, 89% report no impact on labour productivity so far, and they expect about 1.4% over the next three years<sup><a href="#src-17">17</a></sup>. Danish register data find precise null effects on earnings and hours, ruling out anything above 2%<sup><a href="#src-18">18</a></sup>. On earnings calls, about 95% of the sentences linking AI to productivity talk about gains in the future<sup><a href="#src-19">19</a></sup>.

If I were measuring a team, I would count releases and resolved issues, the two numbers that barely moved in these studies, and leave commits and agent hours out of it.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://www.anthropic.com/research/employment-at-anthropic">Wilmers, Catipon, Massenkoff and McCrory, How employment is changing at Anthropic, Anthropic Institute (16 October 2026)</a></li>
<li id="src-2"><a href="https://www.nber.org/papers/w35275">Demirer, Musolff and Yang, Writing code vs. shipping code: productivity effects across generations of AI coding tools, NBER w35275 (May 2026, revised September 2026)</a></li>
<li id="src-3"><a href="https://fion.ac/jellyfish.pdf">Chen and Stratton, Artificial intelligence in the firm: bottlenecks in software production, Harvard job market paper (4 August 2026)</a></li>
<li id="src-4"><a href="https://arxiv.org/abs/2507.09089">Becker, Rush, Barnes and Rein, Measuring the impact of early-2025 AI on experienced open-source developer productivity, METR (July 2025)</a></li>
<li id="src-5"><a href="https://metr.org/blog/2026-02-24-uplift-update/">METR, uplift study update (24 February 2026)</a></li>
<li id="src-6"><a href="https://papers.ssrn.com/abstract=4945566">Cui, Demirer, Jaffe, Musolff, Peng and Salz, The effects of generative AI on high-skilled work: evidence from three field experiments with software developers, Management Science</a></li>
<li id="src-7"><a href="https://arxiv.org/abs/2607.01418">Murphy-Hill, Butler and Savelieva, Adoption and impact of command-line AI coding agents at Microsoft (1 July 2026)</a></li>
<li id="src-8"><a href="https://linearb.io/resources/engineering-benchmarks-report">LinearB, 2026 software engineering benchmarks report (December 2025)</a></li>
<li id="src-9"><a href="https://arxiv.org/abs/2609.26847">Takerngsaksiri, Duong and Barnett, Who finishes the job? Follow-up fixes on AI coding agent pull requests (September 2026)</a></li>
<li id="src-10"><a href="https://arxiv.org/abs/2606.18168">Banik, Chowdhury and Shamim, All smoke, no alarm: oracle signals in agent-authored test code (June 2026)</a></li>
<li id="src-11"><a href="https://arxiv.org/abs/2610.12849">Soualhi and Suleiman, Co-modifying application code and deployment infrastructure: a causal study of AI agent pull requests (October 2026)</a></li>
<li id="src-12"><a href="https://arxiv.org/abs/2511.04427">He, Miller, Agarwal, Kästner and Vasilescu, Speed at the cost of quality: Cursor in open-source projects (November 2025, revised January 2026)</a></li>
<li id="src-13"><a href="https://arxiv.org/abs/2609.17598">Kraishan, Not all agents are equal: code quality and post-merge maintenance across five coding agents (September 2026)</a></li>
<li id="src-14"><a href="https://arxiv.org/abs/2606.23130">Deng, Fan and Meng, Understanding the (in)security of vibe-coded applications (June 2026, revised September 2026)</a></li>
<li id="src-15"><a href="https://digitaleconomy.stanford.edu/publications/canaries-in-the-coal-mine/">Brynjolfsson, Chandar and Chen, Canaries in the coal mine? Stanford Digital Economy Lab (revised 12 August 2026)</a></li>
<li id="src-16"><a href="https://www.nber.org/papers/w31161">Brynjolfsson, Li and Raymond, Generative AI at work, Quarterly Journal of Economics (2025)</a></li>
<li id="src-17"><a href="https://www.nber.org/papers/w34836">Yotzov, Bloom, Davis et al., Firm data on AI, NBER w34836 (February 2026, revised March 2026)</a></li>
<li id="src-18"><a href="https://www.nber.org/papers/w33777">Humlum and Vestergaard, Still waters, rapid currents: early labor market transformation under generative AI, NBER w33777 (revised March 2026)</a></li>
<li id="src-19"><a href="https://www.stlouisfed.org/on-the-economy/2026/jul/ai-productivity-what-firms-say-earnings-calls">Ozkan, Kalyani and Sullivan, AI and productivity: what firms are saying on earnings calls, St. Louis Fed (31 July 2026)</a></li>
</ol>
</details>
