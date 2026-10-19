---
title: AI writes a lot more code, and that's about it
date: 2026-10-19T18:00:00Z
description: Anthropic's report on its own workforce shows 5x the commits per engineer. Checked against outside studies, the extra code turns into far less shipped software, the speed-up fades as projects grow, review and security problems pile up, and junior developers are being hired less. Human judgement looks more needed than ever.
tags: [ai, agents, productivity, jobs]
category: ai
glyph: versus
figures: 7
---

Today I read Anthropic's report on how employment is changing inside the company<sup><a href="#src-1">1</a></sup>. It's both interesting and a bit weird, so I took its claims one at a time and checked them against what outside studies measure: whether more code means more software, how long the speed-up lasts, what happens to review and security, and who gets hired, using data read on 19 October 2026.

For the record, I'm a tech and AI enthusiast and I truly believe AI is useful. But reality is often messier than the picture we paint in our heads. **Coding agents let us write much more code. But what ships grows far less, and the review pile keeps getting bigger.**

## what Anthropic reports

The report comes from four researchers at the Anthropic Institute and uses the company's own data: commits, agent session logs, calendars, surveys and hiring scorecards<sup><a href="#src-1">1</a></sup>. The headline numbers are big. Commits per engineer are at 5x their level of six months earlier. By August, agents in interactive sessions logged six times as many hours as the employees running them. Non-technical staff went from 2 coding sessions a month to 90 between August 2025 and May 2026, and Anthropic takes in 2 to 4 times as much revenue per employee as Meta and Google did at the same age.

<figure class="wide">
<pd-claims data-fig data-label="fig 1 · what Anthropic reports">
<p class="fallback">Twelve numbers from Anthropic's report on its own workforce, in two sets. Gains: commits per engineer 5 times their level six months earlier; 6 agent hours per human hour in interactive sessions; coding sessions by non-technical staff up from 2 to 90 a month; revenue per employee 2 to 4 times that of Meta and Google at the same age; staff agreeing their processes make them productive up from 44% to 75%; staff expect AI to do 75% of their work by 2030, against 28% for other US workers. Costs: about 80% of interactive session time spent waiting for a person; median meeting time up 20%; meta-work up from 10% to 22% of sessions; 8,500 standing instructions for agents, up from a few hundred; junior share of technical hires down from 27% to 9%; the share of technical staff not writing code down by almost half.</p>
</pd-claims>
<figcaption><b>fig 1</b>Anthropic's own numbers, the gains and what came with them. <span class="m">All from the report<sup><a href="#src-1">1</a></sup>. Agent hours count runtime and leave out waits longer than 30 minutes. The survey question changed wording before the 75% wave. The report doesn't say whether the 2 and 90 sessions are per person or in total.</span></figcaption>
</figure>

The same report shows where the time goes. About 80% of the time in interactive Claude sessions is the agent waiting for a person, and reading everything the agents write would take more than half a work week. Median meeting time went up 20% in a year, and "meta-work", building tools for agents and supervising them, went from 10% to 22% of sessions. The authors write that "more code does not necessarily mean better code or business impact", and that the 192 engineers who adopted agents were already on a steeper path than the 74 who didn't. The company was also growing fast that year, so the output numbers can't be separated from the business taking off.

<div class="note"><span class="label">take-home</span>Inside Anthropic, the output counts went up several times over. So did waiting, meetings and agent supervision, and the report itself says more code isn't proof of more value.</div>

## more code, not much more software

The cleanest outside comparison comes from an NBER paper that follows more than 500,000 developers on GitHub through three generations of tools<sup><a href="#src-2">2</a></sup>. Commits rise about 30% with autocomplete, 180% with interactive agents and 240% with autonomous ones. For autonomous agents, the number of projects rises about 80% and the number of releases about 30%. In four app marketplaces the count of new apps jumps, and total usage of those marketplaces doesn't. The authors' own summary is that "large task-level AI productivity gains have therefore translated only partially into shipped and used software thus far."

A Harvard job-market paper gets to the same place from inside companies<sup><a href="#src-3">3</a></sup>. Fiona Chen and James Stratton use Jellyfish data on 725,938 engineers at 718 firms from 2021 to March 2026. When a team adopts coding agents, lines of code go up 30%, pull requests 23% and commits 20%. Jira issues resolved, which is their measure of work that reached production, show no significant change, and the interval rules out a rise of more than 12%. The same data says engineers spend about 42% of their time writing code (30% in a survey they ran), so even if writing code took no time at all, most of the week would look the same.

<figure class="wide">
<pd-funnel data-fig data-label="fig 2 · written vs shipped">
<p class="fallback">Two bar charts of the change after developers adopt coding agents. In the NBER study of more than 500,000 GitHub developers using autonomous agents, commits rise 240%, projects 80% and releases 30%. In the Harvard study of 725,938 engineers at 718 firms, lines of code rise 30%, pull requests 23% and commits 20%, while Jira issues resolved rise 3.3%, with a 95% interval from −5.8% to +12.3% that includes zero.</p>
</pd-funnel>
<figcaption><b>fig 2</b>Agents raise the code people write and the projects they start a lot more than the work that gets finished. <span class="m">NBER w35275, autonomous-agent estimates<sup><a href="#src-2">2</a></sup>. Chen and Stratton, agent estimates<sup><a href="#src-3">3</a></sup>; I computed the issues-resolved percentage from their coefficient (0.12, s.e. 0.17) and baseline (3.67). Both studies compare adopters with non-adopters over time; neither is randomized.</span></figcaption>
</figure>

<div class="note"><span class="label">take-home</span>With agents, commits can triple. Releases go up about 30%, and in companies the work that reaches production hasn't measurably moved.</div>

## the careful studies

The randomized trials are smaller and older than I'd like. METR's 2025 trial put 16 experienced open-source developers on 246 tasks from their own repositories, and AI made the tasks take 19% longer (95% interval +2% to +39%)<sup><a href="#src-4">4</a></sup>. Before they started, the developers expected AI to cut their time by 24%, and afterwards they still believed it had cut it by 20%.

METR ran it again from August 2025 with 57 developers and newer agents, Claude Code and Codex included<sup><a href="#src-5">5</a></sup>. Ten of the original developers came back, and for them tasks took 18% less time; for the 47 new ones, 4% less. Both intervals include zero. A lot of developers now refuse to do tasks without AI, so the easy wins drop out of the sample, and METR calls its data "only very weak evidence" for how big the speedup is.

The large field experiments are from the autocomplete era. Three randomized trials at Microsoft, Accenture and a Fortune 100 company, with 4,867 developers, found 26% more completed tasks, mostly from junior developers<sup><a href="#src-6">6</a></sup>. For agents in a company, the best study is Microsoft's own look at its early-2026 rollout of Claude Code and Copilot CLI: about 24% more pull requests per engineer per day (95% credible interval +14.5% to +33.7%)<sup><a href="#src-7">7</a></sup>. Engineers chose whether to adopt, and the paper counts pull requests only, with nothing on quality or what shipped.

<figure class="wide">
<pd-trials data-fig data-label="fig 3 · the careful studies">
<p class="fallback">A dot plot of six estimates with 95% intervals. METR early 2025, 16 experienced developers: 16% slower per task. METR 2026, returning developers: 22% faster, interval from 8% slower to 61% faster. METR 2026, new developers: 4% faster, interval from 8% slower to 18% faster. Cui and colleagues, three randomized trials with 4,867 developers: 26% more completed tasks, interval 6% to 46%. Microsoft 2026 rollout, observational: 24% more pull requests, interval 14.5% to 33.7%. Chen and Stratton, observational: 3.3% more issues resolved, interval −5.8% to +12.3%.</p>
</pd-trials>
<figcaption><b>fig 3</b>The careful estimates sit between a small slowdown and about a quarter more output, and the ones near +25% count tasks or pull requests. <span class="m">METR measured time per task; I converted its time changes to speed as 1/(1 + change) − 1, so +19% time shows as −16%. Sources: METR<sup><a href="#src-4">4</a></sup><sup><a href="#src-5">5</a></sup>, Cui et al.<sup><a href="#src-6">6</a></sup>, Microsoft<sup><a href="#src-7">7</a></sup>, Chen and Stratton<sup><a href="#src-3">3</a></sup>. Hover a dot for the interval.</span></figcaption>
</figure>

<div class="note"><span class="label">take-home</span>The best estimates run from a small slowdown to about 25% more tasks or pull requests. Nobody has run a randomized trial of agents inside a company yet.</div>

## the speed-up fades as the project grows

The gain is biggest at the start. A CMU study compared 806 open-source projects that adopted Cursor with 1,380 similar projects that didn't<sup><a href="#src-8">8</a></sup>. In the first month commits went up 55% and lines added 281%. In the second month it was 14.5% and 48%, and from the third month on there was no significant gain. Static-analysis warnings stayed about 30% higher and code complexity about 42% higher for as long as the study followed them, and the authors estimate that this extra complexity is what slows the projects back down.

<figure class="wide">
<pd-fade data-fig data-label="fig 4 · the speed-up fades">
<p class="fallback">Bars for the extra output in each month after open-source projects adopt Cursor. Commits rise 55.4% in month 1 and 14.5% in month 2, with no significant gain in months 3 to 6. Lines added rise 281.3% in month 1 and 48.4% in month 2. Two dashed lines across all six months show the lasting rise in static-analysis warnings, about 30%, and code complexity, about 42%.</p>
</pd-fade>
<figcaption><b>fig 4</b>The speed-up is gone by month three; the extra warnings and complexity stay. <span class="m">He et al., difference-in-differences on 806 repositories against matched controls<sup><a href="#src-8">8</a></sup>. The paper reports monthly numbers for months 1 and 2 only and calls later months not significant. The quality lines are averages over the period after adoption; the paper's text gives 25% for complexity in two places, against 41.6% in its table.</span></figcaption>
</figure>

Agents also do worse the longer they work on the same code. In SlopCodeBench, 15 agents kept extending their own programs over 196 checkpoints; none finished any of the 36 problems, and the structure of the code got worse in 77% of runs, ending up twice as eroded as code in 473 human repositories<sup><a href="#src-9">9</a></sup>. In SWE-EVO, GPT-5.2 solves 72.8% of the usual SWE-bench Verified tasks and 22.9% of tasks where the codebase has evolved over many changes<sup><a href="#src-10">10</a></sup>. I also looked for numbers on how many vibe-coded apps get abandoned after a few months, and nobody has published them. The closest signal is a drop in traffic to Lovable, v0 and Bolt in late 2025, which Lovable disputes<sup><a href="#src-11">11</a></sup>.

<div class="note"><span class="label">take-home</span>Agents are fastest on new, small code. As a project grows, the gain fades and the complexity they added stays.</div>

## review and security pile up

In the Harvard data, adopting agents stretches the time from a pull request to its merge from 7.0 to 10.5 days, nearly doubles the share of pull requests where a reviewer asks for changes (13% to 25%), and adds 35% more review comments<sup><a href="#src-3">3</a></sup>. LinearB's benchmark of 8.1 million pull requests found that 32.7% of AI pull requests merge within 30 days, against 84.4% of unassisted ones<sup><a href="#src-12">12</a></sup>.

<figure class="wide">
<pd-review data-fig data-label="fig 5 · the review queue">
<p class="fallback">Paired bars for code review. Across 718 firms, after teams adopt agents, the time from pull request to merge goes from 7.0 to 10.5 days, the share of pull requests with changes requested from 13% to 25%, and review comments per pull request from 1.66 to 2.24. In LinearB's 8.1 million pull requests, 84.4% of unassisted pull requests merge within 30 days and 32.7% of AI pull requests do.</p>
</pd-review>
<figcaption><b>fig 5</b>More code goes in and review slows down. <span class="m">Chen and Stratton, agent adopters before and after<sup><a href="#src-3">3</a></sup>. LinearB 2026 benchmarks, which call the last row the acceptance rate and describe the comparison as correlational<sup><a href="#src-12">12</a></sup>.</span></figcaption>
</figure>

What gets merged needs more fixing afterwards. In one 2026 study, 4.5% of merged agent pull requests got a verified fix within 30 days, 1.62 times the odds for human pull requests in the same repositories, and the agent that wrote the change wrote 69.6% of those fixes<sup><a href="#src-13">13</a></sup>. Another looked at 86,156 test patches written by agents and found 80.2% with weak or no checks of the result<sup><a href="#src-14">14</a></sup>. When an agent's pull request touches both the application and the deployment setup, 43% to 56% of them merge with no review at all<sup><a href="#src-15">15</a></sup>. It depends on the agent, too: in a study of five agents, Codex pull requests were reverted about half as often as human ones (6.1% against 11.5%) and Devin's more often (14.5%)<sup><a href="#src-16">16</a></sup>.

Apps built end to end by agents are the weakest case. An audit of 200 deployed apps made with Claude Code or Lovable found at least one vulnerability in 91% of them, two thirds of the findings rated critical or high<sup><a href="#src-17">17</a></sup>. A scan of about 5,600 vibe-coded apps found more than 2,000 vulnerabilities, 400 exposed secrets and 175 cases of exposed personal data, including medical records<sup><a href="#src-18">18</a></sup>.

<div class="note"><span class="label">take-home</span>Review time, change requests, follow-up fixes and security holes all go up with the amount of code. Whoever reviews it now sets the pace.</div>

## so why keep humans in the loop

Anthropic's CEO said in March 2025 that "we'll be there in three to six months, where AI is writing 90 percent of the code"<sup><a href="#src-19">19</a></sup>. In January 2026 he wrote that AI might soon "do the entire task of a software engineer end to end", and that it could "displace half of all entry-level white collar jobs in the next 1–5 years"<sup><a href="#src-20">20</a></sup>. Take that at face value and two things should follow. A company that close to the frontier should need fewer engineers. And it shouldn't care much which ones it hires: if the model writes better code than any of them, a strong engineer and a weak one ship the same thing. The research even backs the levelling part. In customer support, AI lifted novices by 34% and the best agents by close to nothing<sup><a href="#src-34">34</a></sup>, and in the Microsoft and Accenture trials juniors gained the most<sup><a href="#src-6">6</a></sup>.

Anthropic does neither. It kept hiring technical staff all year; they fell from 61% to 56% of the company only because sales, finance and recruiting grew faster<sup><a href="#src-1">1</a></sup>. And it got more selective. Juniors went from 27% to 9% of its technical hires, and in its hiring scorecards the comments that grew most for engineers were about autonomy and judgement, while domain expertise shrank. Even in the CEO's essay, the people handing their coding over to AI are "some of the strongest engineers I've ever met"<sup><a href="#src-20">20</a></sup>.

That only makes sense if the human part is the part the models can't do yet, and the report's own numbers say so. Agents spend about 80% of their session time waiting for a person. Staff spend twice as much time building and supervising agents, and 20% more time in meetings. The review section points the same way: the more code agents write, the more it matters that someone good reads it, catches what's wrong and decides whether it ships. That person is exactly who Anthropic is still paying to hire.

<div class="note"><span class="label">take-home</span>If AI were already better than any engineer, it wouldn't matter whom you hire. Anthropic hires fewer juniors and screens harder for judgement, which says the opposite.</div>

## the skills that do the reviewing

That judgement has to come from somewhere, and there are signs that leaning on AI wears it down. In Anthropic's own randomized trial, 52 people learning a new Python library with an AI assistant scored 50% on a quiz afterwards, against 67% for those who worked without it, with the biggest gap on debugging<sup><a href="#src-21">21</a></sup>. The sample wasn't only juniors: 29 of the 52 had seven years of coding or more. In a 2026 study, students who used a coding agent finished the first task faster and understood their own code much less, and the gain didn't carry over when they had to extend it without AI<sup><a href="#src-22">22</a></sup>.

For experienced people, the clearest case comes from medicine. In four Polish clinics, experienced endoscopists who had worked with an AI assistant for three months found adenomas in 22.4% of colonoscopies done without it, down from 28.4% before<sup><a href="#src-23">23</a></sup>. In software nobody has measured senior skills over time yet. What we have is calibration: METR's experienced developers believed they were 20% faster while being 19% slower<sup><a href="#src-4">4</a></sup>, and reviewers of AI pull requests approved more of them as the months went on, 30.5% early against 36.6% later<sup><a href="#src-24">24</a></sup>.

<div class="note"><span class="label">take-home</span>People who learn with AI learn less, and experienced people start trusting it more. Nobody has yet measured senior engineers' skills fading, but the early signs point that way.</div>

## who gets hired

This is where Anthropic's report and the outside data agree. Inside Anthropic, the junior share of technical hires fell from 27% to 9%, and the junior share of technical staff from 21% to 14% since early 2025<sup><a href="#src-1">1</a></sup>. On ADP payrolls, US software developers aged 22 to 25 are about 20% below their November 2022 level, while every group from 31 up has grown, those aged 41 to 49 by about 20%<sup><a href="#src-25">25</a></sup>. Across all AI-exposed jobs, employment of 22 to 25 year olds is 19% below where it would be if it had kept pace with less-exposed peers<sup><a href="#src-26">26</a></sup>. A Harvard study of 65 million résumés finds junior employment about 9% lower at firms that adopted generative AI than at firms that didn't, six quarters in, with seniors unchanged<sup><a href="#src-27">27</a></sup>. SignalFire counts new-grad hiring at twelve large tech companies down about 65% from 2019<sup><a href="#src-28">28</a></sup>.

<figure class="wide">
<pd-hiring data-fig data-label="fig 6 · who gets hired">
<p class="fallback">Two line charts. Developers employed, by age: on ADP payrolls, with November 2022 as 100, software developers aged 22 to 25 peaked at 101.6 in September 2022 and fell to 80.5 by August 2026, those aged 26 to 30 ended at 93.9, those aged 35 to 40 at 111.7 and those aged 41 to 49 at 119.5. Software job postings: on Indeed, with February 2020 as 100, software development postings rose to 233.8 in February 2022, fell to about 63 in early 2025 and climbed back to 78.1 by October 2026, while all US job postings stood at 104.1.</p>
</pd-hiring>
<figcaption><b>fig 6</b>Fewer young developers, more experienced ones, and postings that collapsed before coding agents existed. <span class="m">Stanford Digital Economy Lab, Canaries software developer series from ADP payroll data, monthly to August 2026<sup><a href="#src-25">25</a></sup>. Indeed Hiring Lab postings indexes via FRED, seasonally adjusted, shown every third month<sup><a href="#src-29">29</a></sup>. Postings count advertised jobs, not hires.</span></figcaption>
</figure>

The total didn't shrink. US employers counted 1,534,790 software developers in May 2022 and 1,687,890 in May 2025, 10% more<sup><a href="#src-30">30</a></sup>. The growth went to some jobs and not others: data scientists rose 64% and security analysts 16%, while web developers fell 21% and computer programmers 31%. Software job postings on Indeed fell about 70% from their February 2022 peak, mostly in 2022 and 2023 as interest rates went up, and they are up again about 24% since early 2025<sup><a href="#src-29">29</a></sup>. Indeed says 71% of the recent rise came from senior roles and 37% from job titles that mention AI<sup><a href="#src-31">31</a></sup>. LinkedIn puts most of the slump in software hiring on real interest rates<sup><a href="#src-32">32</a></sup>, and a Federal Reserve note finds no drop in job postings at firms that adopted AI<sup><a href="#src-33">33</a></sup>. The gap between young and experienced developers is the part that kept widening after 2023, as AI tools spread.

<figure>
<pd-domains data-fig data-label="fig 7 · which jobs grew">
<p class="fallback">Bars for the change in US employment from May 2022 to May 2025 by occupation. Data scientists up 64.4%, from 159,630 to 262,440. Information security analysts up 16.5%. Software developers up 10.0%, from 1,534,790 to 1,687,890. Network and computer systems administrators down 3.6%. Software QA analysts and testers down 4.9%. Web developers down 20.8%. Computer programmers down 30.5%.</p>
</pd-domains>
<figcaption><b>fig 7</b>Data, security and software development grew; web development and programming shrank. <span class="m">BLS Occupational Employment and Wage Statistics, national estimates for May 2022 and May 2025<sup><a href="#src-30">30</a></sup>. Employer survey; the self-employed are not counted. Hover a bar for the counts.</span></figcaption>
</figure>

<div class="note"><span class="label">take-home</span>There are more software developers than in 2022, but the growth went to experienced people and to data, security and AI work. Young developers are about a fifth fewer, and that's the part of Anthropic's report the outside data confirms.</div>

## the rest of the economy

Outside software the clear gains are on narrow tasks. Customer-support agents with an AI assistant resolved 14% more issues per hour, and novices 34% more<sup><a href="#src-34">34</a></sup>. At the level of whole firms it mostly disappears. In a survey of nearly 6,000 executives in the US, UK, Germany and Australia, 89% report no impact on labour productivity so far, and they expect about 1.4% over the next three years<sup><a href="#src-35">35</a></sup>. Danish register data find precise null effects on earnings and hours, ruling out anything above 2%<sup><a href="#src-36">36</a></sup>. On earnings calls, about 95% of the sentences linking AI to productivity talk about gains in the future<sup><a href="#src-37">37</a></sup>.

## what we trade

For the benefit of shipping faster, we may lose our next generation of engineers while wearing down the capacity of the current one. The juniors who would have learned by writing and debugging code aren't being hired, and the seniors who review the agents' work are starting to trust it more.

So I keep coming back to one question. In five or ten years, who will Anthropic rely on to build its next generation of models? Will it be a company of a few humans and an army of AI agents, the way it describes the future, or will it still need the engineers it has stopped hiring today?

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
<li id="src-8"><a href="https://arxiv.org/abs/2511.04427">He, Miller, Agarwal, Kästner and Vasilescu, Speed at the cost of quality: how Cursor AI increases short-term velocity and long-term complexity in open-source projects (November 2025, revised January 2026)</a></li>
<li id="src-9"><a href="https://arxiv.org/abs/2603.24755">Orlanski et al., SlopCodeBench (March 2026)</a></li>
<li id="src-10"><a href="https://arxiv.org/abs/2512.18470">SWE-EVO: benchmarking coding agents on evolving codebases (December 2025)</a></li>
<li id="src-11"><a href="https://www.aol.com/news/lovable-ceo-anton-osika-says-093301188.html">Business Insider, Lovable's CEO responds to reports of falling traffic (6 October 2025)</a></li>
<li id="src-12"><a href="https://linearb.io/resources/engineering-benchmarks-report">LinearB, 2026 software engineering benchmarks report (December 2025)</a></li>
<li id="src-13"><a href="https://arxiv.org/abs/2609.26847">Takerngsaksiri, Duong and Barnett, Who finishes the job? Follow-up fixes on AI coding agent pull requests (September 2026)</a></li>
<li id="src-14"><a href="https://arxiv.org/abs/2606.18168">Banik, Chowdhury and Shamim, All smoke, no alarm: oracle signals in agent-authored test code (June 2026)</a></li>
<li id="src-15"><a href="https://arxiv.org/abs/2610.12849">Soualhi and Suleiman, Co-modifying application code and deployment infrastructure: a causal study of AI agent pull requests (October 2026)</a></li>
<li id="src-16"><a href="https://arxiv.org/abs/2609.17598">Kraishan, Not all agents are equal: code quality and post-merge maintenance across five coding agents (September 2026)</a></li>
<li id="src-17"><a href="https://arxiv.org/abs/2606.23130">Deng, Fan and Meng, Understanding the (in)security of vibe-coded applications (June 2026, revised September 2026)</a></li>
<li id="src-18"><a href="https://escape.tech/blog/methodology-how-we-discovered-vulnerabilities-apps-built-with-vibe-coding/">Escape, How we discovered vulnerabilities in apps built with vibe coding (29 October 2025)</a></li>
<li id="src-19"><a href="https://www.cfr.org/event/ceo-speaker-series-dario-amodei-anthropic">Council on Foreign Relations, CEO speaker series with Dario Amodei (10 March 2025)</a></li>
<li id="src-20"><a href="https://www.darioamodei.com/essay/the-adolescence-of-technology">Dario Amodei, The adolescence of technology (January 2026)</a></li>
<li id="src-21"><a href="https://arxiv.org/abs/2601.20245">Shen and Tamkin, How AI impacts skill formation, Anthropic (January 2026)</a></li>
<li id="src-22"><a href="https://arxiv.org/abs/2607.26375">Balepur et al., (Im)paired programming (July 2026)</a></li>
<li id="src-23"><a href="https://doi.org/10.1016/S2468-1253(25)00133-5">Budzyń et al., Endoscopist deskilling risk after exposure to artificial intelligence in colonoscopy, Lancet Gastroenterology &amp; Hepatology (August 2025)</a></li>
<li id="src-24"><a href="https://arxiv.org/abs/2609.06213">Yu, Liu and Zhang, Beyond lexical metrics: reviewer behaviour on AI-authored pull requests (September 2026)</a></li>
<li id="src-25"><a href="https://digitaleconomy.stanford.edu/project/indicators/canaries/">Stanford Digital Economy Lab, Canaries indicators: software developers by age, ADP payroll data (data to August 2026, released 17 September 2026)</a></li>
<li id="src-26"><a href="https://digitaleconomy.stanford.edu/publications/canaries-in-the-coal-mine/">Brynjolfsson, Chandar and Chen, Canaries in the coal mine? Stanford Digital Economy Lab (revised 12 August 2026)</a></li>
<li id="src-27"><a href="https://papers.ssrn.com/abstract=5425555">Hosseini and Lichtinger, Generative AI as seniority-biased technological change (May 2026)</a></li>
<li id="src-28"><a href="https://www.signalfire.com/blog/signalfire-state-of-talent-report-2026">SignalFire, State of talent report 2026 (22 June 2026)</a></li>
<li id="src-29"><a href="https://fred.stlouisfed.org/series/IHLIDXUSTPSOFTDEVE">Indeed Hiring Lab, software development and all job postings indexes, via FRED (data to 9 October 2026)</a></li>
<li id="src-30"><a href="https://www.bls.gov/oes/">US Bureau of Labor Statistics, Occupational Employment and Wage Statistics, national estimates for May 2022 and May 2025</a></li>
<li id="src-31"><a href="https://hiringlab.indeed.com/2026/07/08/ai-and-job-postings-from-destruction-to-creation/">Indeed Hiring Lab, AI and job postings: from destruction to creation (8 July 2026)</a></li>
<li id="src-32"><a href="https://economicgraph.linkedin.com/content/dam/me/economicgraph/en-us/PDF/us-software-engineer-talent-landscape-2026.pdf">LinkedIn Economic Graph, US software engineer talent landscape (February 2026)</a></li>
<li id="src-33"><a href="https://www.federalreserve.gov/econres/notes/feds-notes/ai-adoption-and-firms-job-posting-behavior-20260327.html">Liu and Webber, AI adoption and firms' job posting behavior, FEDS Notes, Federal Reserve Board (27 March 2026)</a></li>
<li id="src-34"><a href="https://www.nber.org/papers/w31161">Brynjolfsson, Li and Raymond, Generative AI at work, Quarterly Journal of Economics (2025)</a></li>
<li id="src-35"><a href="https://www.nber.org/papers/w34836">Yotzov, Bloom, Davis et al., Firm data on AI, NBER w34836 (February 2026, revised March 2026)</a></li>
<li id="src-36"><a href="https://www.nber.org/papers/w33777">Humlum and Vestergaard, Still waters, rapid currents: early labor market transformation under generative AI, NBER w33777 (revised March 2026)</a></li>
<li id="src-37"><a href="https://www.stlouisfed.org/on-the-economy/2026/jul/ai-productivity-what-firms-say-earnings-calls">Ozkan, Kalyani and Sullivan, AI and productivity: what firms are saying on earnings calls, St. Louis Fed (31 July 2026)</a></li>
</ol>
</details>
