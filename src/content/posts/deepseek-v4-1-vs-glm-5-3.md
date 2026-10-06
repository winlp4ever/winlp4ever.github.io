---
title: DeepSeek V4.1 vs GLM-5.3, and how far both are from Claude Code and Codex
date: 2026-10-06
description: The two Chinese open-weights families compared on agentic work and coding, in two weight classes, against the closed models behind Claude Code and Codex. How close they get depends on the length of the task, and what they cost depends on how you run them.
tags: [ai, llm, agents, benchmarks]
category: ai
glyph: versus
figures: 6
---

Z.ai shipped the GLM-5.3 family in late August, and DeepSeek shipped V4.1-Flash on 10 September. On Hacker News both get recommended as cheap alternatives to Claude Code and Codex, often with a line like ["GLM 5.3 is at most 6 months away from the frontier models, and good enough for most tasks already"](https://news.ycombinator.com/item?id=49883892). I wanted to check both parts of that claim on agentic work and coding.

How close these models get to Claude and GPT depends mostly on how long the task is. On short, tool-driven work the best of them are level with Opus 5.5, and on multi-hour jobs in a terminal they reach between a quarter and 70% of its score. What a model costs you depends more on how you run it (the host, the cache price, the harness, the subscription) than on its price list.

I didn't run benchmarks myself. Everything below comes from the vendors' model cards and docs, four independent leaderboards (Artificial Analysis, Vals, the official Terminal-Bench board and Andon Labs' Vending-Bench), OpenRouter's public usage data, and a few hundred comments and bug reports from people who use these models every day. All numbers are as of 6 October 2026.

## two weight classes

GLM-5.3 comes in three tiers. GLM-5.3 is the flagship, about 753B parameters with roughly 40B active per token, released on 14 August. GLM-5.3-Flash (320B, 18B active) followed on 26 August, and GLM-5.3-FlashX is an API-only speed tier of the Flash weights. Both models always think before answering. You can lower the effort level, but you can't turn it off.

DeepSeek's V4.1 family, for now, is one model. DeepSeek calls V4.1-Flash "the smallest model in our new architecture family", and a V4.1-Pro is mentioned in its docs but hasn't shipped. Its previous big model, V4-Pro (the 0813 checkpoint), is still available as open weights and on third-party hosts. On DeepSeek's own API, though, requests for `deepseek-v4-pro` have been [answered by V4.1-Flash since 14 September](https://api-docs.deepseek.com/news/news260910).

That gives two fair pairs: V4.1-Flash against GLM-5.3-Flash in the small class, and GLM-5.3 against V4-Pro in the big one.

<figure class="wide">
<gx-tiers data-fig data-label="fig 1 · the two weight classes">
<p class="fallback">Artificial Analysis results for four open models, with Claude Opus 5.5 as a reference. Small class: V4.1-Flash scores 39.5 on the intelligence index, 26.8% on Terminal-Bench 4.0 and 68.9% on AutomationBench, runs at 227 tokens per second and costs $0.27 a task; GLM-5.3-Flash scores 41.8, 33% and 60%, runs at 53 tokens per second and costs $0.25. Big class: GLM-5.3 scores 44.8, 41.9% and 62.2% at 73 tokens per second and $2.01 a task; V4-Pro 0813 scores 36.0, 14.1% and 56.7% at 99 tokens per second and $0.67. Opus 5.5 scores 57.6, 60% and 70% at $5.98 a task.</p>
</gx-tiers>
<figcaption><b>fig 1</b>The small class is close and splits by task. In the big class GLM-5.3 leads V4-Pro on everything except speed. <span class="m">Artificial Analysis, max reasoning effort, measured on each vendor's first-party API. The tick on each row is Claude Opus 5.5.</span></figcaption>
</figure>

The small class is close. GLM-5.3-Flash is a little better on long terminal tasks, V4.1-Flash is better on tool automation and is four times faster, and both cost about a quarter of a dollar per task. In the big class GLM-5.3 wins everything except speed. V4.1-Flash also beats V4-Pro, the bigger model it replaced, which probably explains why DeepSeek redirected the Pro name to it.

V4.1-Flash's model card describes ["a 40-layer Transformer organized as a 20-layer causal encoder followed by a 20-layer decoder"](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash), with 8B parameters active while reading the prompt and 16B while writing. Its cache, the per-token memory a provider keeps so it can reuse your prompt, takes 890 bytes per token. GLM-5.3 needs roughly fifty times that.

## against Claude and GPT

Artificial Analysis runs every model through the same tasks and combines them into one index. On 6 October the open models sit between 36 and 45, and the closed models used in Claude Code and Codex between 52 and 58:

| | AA index | cost per task |
|---|---|---|
| Claude Opus 5.5 | 57.6 | $5.98 |
| Claude Sonnet 5.5 | 56.0 | $7.67 |
| Claude Fable 5.1 | 53.4 | $7.63 |
| GPT-6 Astra | 52.7 | $3.26 |
| GPT-6.1 Sol | 51.8 | $0.72 |
| GLM-5.3 | 44.8 | $2.01 |
| GLM-5.3-Flash | 41.8 | $0.25 |
| DeepSeek V4.1-Flash | 39.5 | $0.27 |
| DeepSeek V4-Pro 0813 | 36.0 | $0.67 |

To turn a score gap into time, find when a closed model first reached the open model's score. GLM-5.3's 44.8 was first passed by Claude Fable 5 on 9 June, so on 6 October GLM-5.3 is about four months behind. V4.1-Flash's 39.5 was first passed by Claude Opus 4.7 in April.

When GLM-5.3 came out in August it was about two months behind the best closed model on this index. Then four closed frontier models arrived in four weeks (Fable 5.1, GPT-6 Astra, Opus 5.5 and Sonnet 5.5). The best open release in that time, MiMo-V2.6-Pro, added only 1.5 points, so the gap reopened.

<figure class="wide">
<gx-gap data-fig data-label="fig 2 · best open vs best closed, 2026">
<p class="fallback">Two step lines from January to October 2026: the best closed model's index score and the best open model's. The closed line climbs from 31.9 (Claude Opus 4.6, February) to 57.6 (Claude Opus 5.5, September). The open line jumps in steps: GLM-5 at 27.9 in February, DeepSeek V4 Pro at 30.4 in April, GLM-5.2 at 33.7 in June, Kimi K3 at 43.6 in July, GLM-5.3 at 44.8 in August and MiMo-V2.6-Pro at 46.3 in September. The open line trails by between about one month and six, depending on the date.</p>
</gx-gap>
<figcaption><b>fig 2</b>The best open model gains ground when a big open release lands and loses it as closed models ship, so this year the gap has ranged from about one month (after Kimi K3 in July) to six (in mid-June, just before GLM-5.2). <span class="m">Artificial Analysis Intelligence Index v4.3.2, which re-scores older models on the current version. "Behind" is the date gap between the open model's score and the first closed model to reach it.</span></figcaption>
</figure>

GLM-5.3 is no longer the top open model on this index either. Xiaomi's MiMo-V2.6-Pro (MIT licensed) passed it on 21 September with 46.3.

## short tasks and long tasks

Split by kind of task, as a share of Claude Opus 5.5's score on the same benchmark:

| | V4.1-Flash | GLM-5.3-Flash | GLM-5.3 | V4-Pro | GPT-6.1 Sol |
|---|---|---|---|---|---|
| tool-heavy business automation (AutomationBench) | 98% | 86% | 89% | 81% | 93% |
| answering questions over long documents (AA-LCR) | 99% | 94% | 94% | 94% | 98% |
| long tasks in a real terminal (Terminal-Bench 4.0) | 45% | 55% | 70% | 24% | 93% |

On work made of short tool calls against an API, or reading a long context, V4.1-Flash is level with Opus 5.5 at about a twentieth of the cost per task. On long jobs in a shell, where an agent has to keep a plan together across dozens of steps, it reaches less than half of Opus's score. GLM-5.3 gets to 70%, and V4-Pro to a quarter.

<figure class="wide">
<gx-tasks data-fig data-label="fig 3 · share of Opus 5.5 by task">
<p class="fallback">Each model's score as a percentage of Claude Opus 5.5's on four benchmarks. AutomationBench: V4.1-Flash 98%, GLM-5.3 89%, GLM-5.3-Flash 86%, V4-Pro 81%, GPT-6.1 Sol 93%. AA-LCR: all between 93% and 99%. Terminal-Bench 4.0: GPT-6.1 Sol 93%, GLM-5.3 70%, GLM-5.3-Flash 55%, V4.1-Flash 45%, V4-Pro 24%. Vending-Bench 2, a simulated year of running a business: GLM-5.3 88% of Opus 5.5's final balance, V4-Pro 36%.</p>
</gx-tasks>
<figcaption><b>fig 3</b>On short tool work and long documents the open models are close to Opus 5.5; on long terminal and business tasks they fall back. <span class="m">Artificial Analysis for the first three rows, Andon Labs' Vending-Bench 2 for the last. V4.1-Flash and GLM-5.3-Flash haven't been run on Vending-Bench.</span></figcaption>
</figure>

On Vals' Terminal-Bench 4.0, GLM-5.3 scores 38.9% and V4.1-Flash 19.7%, against about 64% for the best closed models. On Andon Labs' Vending-Bench 2, a simulated year of running a small business, GLM-5.3 ended with $8,164, Opus 5.5 with $9,235, GPT-6 Astra with $15,515 and V4-Pro with $3,285. SWE-bench Verified, the classic benchmark of fixing one GitHub issue, is close to its ceiling for every serious model and no longer separates them.

On V2EX, a developer watched V4.1-Flash run at close to 300 tokens per second for [40 minutes on a game-decompiling task](https://www.v2ex.com/t/1241596), cycling through the same fixes and breaking a module that already worked, then solved the problem in one or two turns with GPT-6 Astra in Codex.

## the harness changes the score

Most benchmark numbers come from one agent harness, the program that runs the loop around the model and hands it tools. DeepSeek's model card runs V4.1-Flash on Terminal-Bench 2.1 in six of them, and the score moves from 84.1 in Codex to 90.6 in DeepSeek's own harness.

<figure class="wide">
<gx-harness data-fig data-label="fig 4 · one model, several harnesses">
<p class="fallback">V4.1-Flash on Terminal-Bench 2.1: 84.1 in Codex, 85.0 in OpenCode, 86.1 in Pi, 88.0 in Claude Code, 90.3 in mini-SWE-agent and 90.6 in DeepSeek's own harness. GLM-5.3 scores 88.2 in Claude Code. On the official Terminal-Bench 4.0 board, runs inside Claude Code use 24 to 59 million tokens per task (Opus 5.5 24.3M, GLM-5.3 26.3M, Sonnet 5.5 58.8M) and runs inside Codex 3 to 12 million (GPT-6 Astra 2.7M, GPT-6.1 Sol 4.4M, GPT-6 Luna 11.8M).</p>
</gx-harness>
<figcaption><b>fig 4</b>The same model moves 6.5 points between harnesses, and Claude Code runs use several times more tokens than Codex runs. <span class="m">Top: DeepSeek's V4.1-Flash model card, pass@1. Bottom: the official Terminal-Bench 4.0 leaderboard, average tokens per trial.</span></figcaption>
</figure>

The Claude Code row is the only like-for-like comparison between the two vendors' own numbers. Z.ai's GLM-5.3 score in Claude Code is 88.2, and V4.1-Flash's is 88.0. Harnesses also change how many tokens a run uses, and GLM-5.3 was tested inside Claude Code at 26 million tokens a task.

## cost per solved task

On the official Terminal-Bench 4.0 board, a GLM-5.3 run costs $8.27 per task and solves 41.8% of them. GPT-6.1 Sol in Codex costs $1.92 per task and solves 58.2%, and Claude Fable 5.1 on low effort solves 43.3% for $7.15. At Z.ai's prices GLM-5.3 costs more per solved task than several closed models.

80% of that bill is cached input. Of the 8.7 billion tokens GLM-5.3 used across 330 trials, 8.4 billion were cache reads at $0.26 per million. The same tokens cost much less elsewhere.

<figure class="wide">
<gx-cost data-fig data-label="fig 5 · cost per solved task">
<p class="fallback">Cost per solved task against success rate on Terminal-Bench 4.0. GPT-6 Luna: 16.4% at $1.34. GPT-6.1 Sol: 58.2% at $3.30. GPT-6 Astra (low): 50.6% at $9.33. Claude Fable 5.1 (low): 43.3% at $16.49. Claude Opus 5.5: 64.9% at $22.05. Claude Sonnet 5.5: 61.8% at $35.95. GLM-5.3 at 41.8% costs $19.77 per solved task on Z.ai's API, $12.43 on BaseTen, $9.57 on DeepInfra, $5.93 on Novita, about $1.72 on Z.ai's Coding Plan off-peak, and $0.66 if its tokens were priced at DeepSeek's off-peak rates. On Z.ai's API, cache reads are 80% of its bill.</p>
</gx-cost>
<figcaption><b>fig 5</b>The same GLM-5.3 tokens cost $19.77 per solved task on Z.ai's API and under $2 on its Coding Plan, which puts it next to GPT-6.1 Sol. <span class="m">Official Terminal-Bench 4.0 leaderboard (Claude Code for Claude and GLM, Codex for GPT), list prices. GLM-5.3's token mix repriced with each host's published prices; Coding Plan estimated from Z.ai's credit formula.</span></figcaption>
</figure>

DeepSeek can charge $0.006 per million cached tokens partly because of that 890-byte cache. A 120,000-token agent context takes about 100 MB for V4.1-Flash and several gigabytes for GLM-5.3, and DeepSeek keeps its cache on disk for hours or days. On OpenRouter, the average price paid for V4.1-Flash on 5 October was $0.034 per million tokens, below its own list price for uncached input.

V4.1-Flash isn't on the official Terminal-Bench board. On Artificial Analysis's suite it costs $0.27 per task and takes under five minutes, the fastest of every model here.

## subscriptions

Z.ai sells a GLM Coding Plan alongside its API, and it's the only one of the three subscriptions here that publishes how usage is counted: credits per token, with peak hours costing double. With the token mix from the Terminal-Bench runs, one hard agent task costs about 5,200 credits. The Max plan (about $168 a month) allows 140,000 credits a week, roughly 27 such tasks a week at peak and 54 off-peak, worth about $966 a month at API prices.

OpenAI prices extra Codex credits at exactly API rates. Anthropic doesn't publish token limits for Claude Max. Third-party estimates of 24 to 40 Opus hours a week on the $200 plan would put it in the same range as GLM's Max plan per solved task, but those estimates are unverified.

If you've tried GLM inside Claude Code with Z.ai's setup guide, you were probably running GLM-5.3-Flash: the guide maps all three Claude Code model slots, including the Opus one, to the Flash model. DeepSeek's Anthropic-compatible endpoint sends every slot to V4.1-Flash.

DeepSeek has no subscription. You pay per token, and for most people that ends up cheaper than any plan.

## planners and workers

In the threads I read, the setup that came up most has a closed model planning and reviewing while an open model writes the code. One developer runs it fully automated: ["I have Opus plan, Deepseek implement the code, and then review with Opus"](https://news.ycombinator.com/item?id=49877628), and puts the saving at 20 to 40 times. Inside the GLM family people do the same with GLM-5.3 writing the plan and GLM-5.3-Flash executing it. One user calls GLM-5.3 ["a vastly better model"](https://news.ycombinator.com/item?id=49938247) than Flash, and adds that Flash executes a detailed plan "just fine for a fraction of the price".

One commenter has tried this a lot and says a smart planner with a weaker executor ["produces worse code with higher spend than simply using the smart planner to do both"](https://news.ycombinator.com/item?id=49876139). Another, who says he wants open models to succeed, finds ["Sonnet 5.5 on low is leagues ahead of deepseek v4.1 flash in price per _result_"](https://news.ycombinator.com/item?id=49903068).

A developer paying out of pocket asked V4.1-Flash to rebuild a product page as a five-column layout. It wrote its own browser driver, took over a hundred screenshots to check its work, and finished in 25 minutes [for seven cents](https://news.ycombinator.com/item?id=49807348). Another racked up ["$100+ in about 2-3 days"](https://news.ycombinator.com/item?id=49899103) because V4.1-Flash used many more tokens per turn than GPT.

The one head-to-head with a clear setup comes from someone who ran both families on [their own annotated decompilation of the Nintendo 3DS kernel](https://news.ycombinator.com/item?id=49728334), looking for vulnerabilities in max mode with subagents. GLM-5.3 found almost all of them in about 30 minutes for $22. V4.1-Flash found one in 40 minutes for $2.

Several developers describe Claude or GPT declining to help with security work on their own systems, such as analysing logs from their own app or cleaning up malware on their own laptop, and switching to GLM or DeepSeek for that work.

A lot of the looping and broken tool calls people report go away when they change host or harness. V4.1-Flash on DeepSeek's own API gets far fewer complaints than the same model through OpenRouter or OpenCode's subscription, which routes to third-party hosts.

## tokens and dollars on OpenRouter

On 5 October, V4.1-Flash processed 25% of all tokens on OpenRouter and accounted for 6% of the money spent. All of Anthropic's models together processed 4% of tokens and took 31% of the spend.

<figure class="wide">
<gx-share data-fig data-label="fig 6 · share of tokens and of spend">
<p class="fallback">OpenRouter on 5 October 2026, share of all tokens against share of all money spent. DeepSeek V4.1-Flash: 25.0% of tokens, 6.0% of spend. Older DeepSeek models: 6.5% and 4.4%. GLM-5.3-Flash: 6.3% and 3.5%. GLM-5.3: 1.9% and 3.4%. Anthropic: 4.2% and 30.8%. OpenAI: 8.8% and 22.9%. Google: 3.7% and 11.7%.</p>
</gx-share>
<figcaption><b>fig 6</b>V4.1-Flash's share of OpenRouter tokens is four times its share of spend, and Anthropic's share of spend is seven times its share of tokens. <span class="m">OpenRouter public rankings API, one day (5 October 2026), all models. Excludes subscriptions and first-party APIs.</span></figcaption>
</figure>

V4.1-Flash's share is still rising a month after launch, while GLM-5.3-Flash's peaked in mid-September and is falling. OpenRouter only sees part of the market. Claude and ChatGPT subscriptions, Z.ai's Coding Plan and DeepSeek's own API don't go through it, so these numbers mostly describe developers who shop around on price.

## my pick

If I were setting this up today, V4.1-Flash on DeepSeek's own API would do most of the coding, with Opus writing the plan and reviewing anything that touches more than a few files. For multi-hour jobs in a terminal I'd still pay for a closed model; the gap there is 20 points or more, and on cost per solved task GPT-6.1 Sol beats GLM-5.3 on Z.ai's API.

GLM-5.3 is the open model I'd pick for that long-horizon work, but only through the Coding Plan, off-peak. At Z.ai's per-token prices I can't make the numbers work.
