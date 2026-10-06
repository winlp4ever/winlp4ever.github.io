---
title: GLM-5.3 vs DeepSeek V4 Flash for coding agents
date: 2026-10-06
description: Z.ai's flagship against DeepSeek's small, fast model, compared by speed, by the cost of a run with prompt caching, and by the cost of a solved task.
tags: [ai, llm, agents, benchmarks]
category: ai
glyph: versus
figures: 7
---

GLM-5.3 and DeepSeek V4 Flash were the two open models people put behind their coding agents most often this summer. Z.ai released GLM-5.3, its flagship, on 14 August. DeepSeek shipped a post-training update to V4 Flash on 31 July (the "0731" checkpoint), and for a few weeks a lot of people on Hacker News used it as their daily driver.

The price difference is large. Artificial Analysis runs both models through the same set of tasks, and [one task costs $2.01 with GLM-5.3 and $0.22 with V4 Flash](https://artificialanalysis.ai/models/comparisons/deepseek-v4-flash-vs-glm-5-3), about nine times more. I wanted to know whether GLM-5.3 is worth that in an agent loop, where the whole context is sent again at every step.

I didn't run any benchmarks myself. This post is built from the model cards, three independent leaderboards, the pricing and caching docs, GitHub issues and Hacker News threads. Each number links to its source, and the figures compute their values in your browser from those numbers, so you can change the inputs.

## the two models aren't the same size

GLM-5.3 has 744B parameters, 40B of them active per token ([model card](https://huggingface.co/zai-org/GLM-5.3)). V4 Flash is DeepSeek's small model, with 284B parameters and 13B active ([model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash)). Z.ai's own small model, GLM-5.3-Flash (320B, 18B active), would be the like-for-like comparison. I'm comparing the flagship with DeepSeek's Flash anyway, because that's the pair people were choosing between.

V4 Flash is also gone from DeepSeek's API. On 10 September DeepSeek wrote that ["V4-Flash & V4-Flash-Vision-Exp are retired. For compatibility, `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` temporarily route to V4.1-Flash"](https://api-docs.deepseek.com/news/news260910). V4.1-Flash is a different and bigger model (552B), so a test run against `deepseek-v4-flash` after that date measured V4.1.

<figure class="wide">
<vs-lineup data-fig data-label="fig 1 · which model is it?">
<p class="fallback">A timeline from April to October 2026. DeepSeek released the V4-Flash preview (284B, 13B active) on 24 April and the 0731 update on 31 July, raised its peak price from $0.14 to $0.44 per million input tokens on 16 August, and released V4.1-Flash (552B, 16B active) on 10 September. Z.ai released GLM-5.3 (744B, 40B active) on 14 August and GLM-5.3-Flash (320B, 18B active) on 26 August. From 10 September the API name deepseek-v4-flash serves V4.1-Flash.</p>
</vs-lineup>
<figcaption><b>fig 1</b>Dot size follows active parameters. The critter stands for the API name <code>deepseek-v4-flash</code>, and the line under the chart shows which model it served on each date.</figcaption>
</figure>

In the rest of this post, V4 Flash means the 0731 checkpoint. It was the current version when GLM-5.3 came out, about 27 third-party hosts still serve it on [OpenRouter](https://openrouter.ai/deepseek/deepseek-v4-flash-0731), and the independent leaderboards tested that version. The newer models get their own section at the end.

## benchmarks

Both vendors published a Terminal-Bench 2.1 score, 88.2 for GLM-5.3 and 82.7 for V4 Flash, but the two numbers come from different setups. Z.ai ran GLM-5.3 inside Claude Code 2.1.207. DeepSeek used the minimal mode of its own "DeepSeek Harness (to be released)" ([0731 card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731)). DeepSeek's later V4.1 card shows how much the harness matters: on that same benchmark, V4.1-Flash scores anywhere from 84.1 to 90.6 depending on the scaffold.

Independent leaderboards run both models with the same setup. On short tasks V4 Flash is close or ahead. It scores 87.3% on LiveCodeBench against 80.5% for GLM-5.3 ([Vals](https://www.vals.ai/models/deepseek_deepseek-v4-flash-0731)). Both are near the ceiling on SWE-bench Verified (95.4% and 88.8%), so that benchmark doesn't separate them much. Terminal-Bench 4.0 has tasks that run for hours in a real shell, and there GLM-5.3 scores [38.9% to V4 Flash's 18.7% on Vals](https://www.vals.ai/benchmarks/terminal-bench-4), and 42% to 12% on Artificial Analysis.

<figure class="wide">
<vs-horizon data-fig data-label="fig 2 · the gap and the task length">
<p class="fallback">Scores for GLM-5.3 and V4-Flash-0731, from short to long tasks. LiveCodeBench (Vals): 80.5 vs 87.3, Flash ahead by 6.8. SWE-bench Verified (Vals): 95.4 vs 88.8. Vals Index: 53.5 vs 48.0. Terminal-Bench 4.0 on Vals: 38.9 vs 18.7. Terminal-Bench 4.0 on Artificial Analysis: 42 vs 12, GLM ahead by 30. The vendors' own Terminal-Bench 2.1 numbers were 88.2 vs 82.7.</p>
</vs-horizon>
<figcaption><b>fig 2</b>Rows go from one-shot problems at the top to long agentic tasks at the bottom. The second button adds the Terminal-Bench 2.1 numbers from the two launch posts.</figcaption>
</figure>

GLM-5.3's lead grows with the length of the task. That matches what V4 Flash users say about it: it does a clearly specified job well and drifts when nobody gives it direction. [SWE-rebench](https://swe-rebench.com/) tests models on GitHub issues opened after their training data was collected, and it has the April V4 Flash checkpoint at 38.4% for $0.07 a problem, with GLM-5.2 at 51.1%.<span class="sn">GLM-5.3 and the 0731 checkpoint weren't on SWE-rebench yet when I checked on 6 October, so this is the closest pair available.</span>

## speed

Artificial Analysis measured GLM-5.3 on Z.ai's API at 73 output tokens per second, with 2.84 seconds before the first token. V4 Flash on DeepSeek's API produced 226 tokens per second and started in 0.89 seconds. An average task in their suite took GLM-5.3 about 16 minutes and V4 Flash about 3.

An agent waits for the model at every step, so these numbers add up over a run. The host also changes them a lot: Together serves the same GLM-5.3 weights at about 200 tokens per second, according to the same [providers page](https://artificialanalysis.ai/models/glm-5-3/providers).

<figure class="wide">
<vs-race data-fig data-label="fig 3 · a 30-step loop">
<p class="fallback">Three lanes go through 30 agent steps of 2,000 output tokens each (1,750 for V4 Flash) plus 3 seconds of tool time per step. GLM-5.3 on Z.ai at 73 tokens per second takes 16.6 minutes. GLM-5.3 on Together at 200 tokens per second takes 6.8 minutes. V4-Flash-0731 on DeepSeek at 226 tokens per second takes 5.8 minutes.</p>
</vs-race>
<figcaption><b>fig 3</b>Speeds and first-token times are from Artificial Analysis. Output per step is my assumption, scaled by how many tokens each model used per task in their suite. Prefill time is left out.</figcaption>
</figure>

On Together, GLM-5.3 finishes the run 2.4 times faster than on Z.ai and ends up within a minute of V4 Flash. One setting you can't change on GLM-5.3 is thinking. Z.ai's docs say it's always on, and you only choose an effort level. DeepSeek lets you turn thinking off, which is useful for the simple steps of a loop.

## the bill

I [wrote before](/blog/agentic-ai-cost) about why agents are expensive. Every step sends the whole conversation again, so input tokens pile up, and prompt caching decides how much they cost. These are the prices per million tokens at the time of writing:

| | input | cached input | output |
|---|---|---|---|
| GLM-5.3, [Z.ai](https://docs.z.ai/guides/overview/pricing) | $1.40 | $0.26 | $4.40 |
| V4 Flash 0731, DeepSeek, peak | $0.44 | $0.014 | $1.32 |
| V4 Flash 0731, DeepSeek, off-peak | $0.22 | $0.007 | $0.66 |

Z.ai charges 81% less for a cached token than for a new one, and DeepSeek charges 97% less. Until 16 August V4 Flash was cheaper still, at $0.14 for input and $0.28 for output. DeepSeek then tripled the peak price and set off-peak at half of peak.

<figure class="wide">
<vs-bill data-fig data-label="fig 4 · one run, priced">
<p class="fallback">A calculator for one agent run. With the defaults (30 steps, context growing from 8k to 120k tokens, 95% of the previous context served from cache, 2,000 output tokens per step for GLM-5.3 and 1,750 for V4 Flash), GLM-5.3 costs $1.00 and V4 Flash costs $0.19 at DeepSeek's peak price, 5.4 times less. Off-peak it's $0.09, 10.8 times less. With no cache the gap is 3.2 times.</p>
</vs-bill>
<figcaption><b>fig 4</b>Context grows in a straight line from 8k to the end value, and at each step the share you set of the previous context comes from cache. With the cache slider at zero the gap gets smaller.</figcaption>
</figure>

Caching makes the gap bigger. Without a cache GLM-5.3 costs about three times as much per run, and with a warm cache it costs five to eleven times as much. The largest part of the bill is also different for each model. On GLM-5.3 most of the money goes to re-reading the cached context, so a smaller context saves the most. On DeepSeek cached reads cost so little that output becomes a large share of the bill, and the reasoning effort setting matters more.

## why DeepSeek's cache is so cheap

A cached prefix is data the provider has to store: the attention keys and values for every token, in every layer. How big it is depends on the architecture, and you can estimate it from each model's `config.json`.

GLM-5.3 uses latent attention, the design DeepSeek introduced in its V2 model. It has 78 layers, and each stores 576 numbers per token, plus the keys of a sparse-attention indexer. That comes to about 48 KB per token in FP8. V4 Flash compresses older tokens much more. 21 of its layers keep one entry for every 4 tokens, 20 layers keep one for every 128, and the remaining layers only see a short window of recent tokens. That works out to about 3 KB per token, around fifteen times less.<span class="sn">This is my estimate from the published configs and ignores framework overhead. vLLM's measurement for the larger V4 model is in the same range.</span>

<figure class="wide">
<vs-prefix data-fig data-label="fig 5 · a prefix is an object">
<p class="fallback">The memory needed to keep one cached prompt prefix. At 120k tokens GLM-5.3 needs about 5.8 GB and V4 Flash about 370 MB. At 1 million tokens it's about 48 GB against 3.1 GB.</p>
</vs-prefix>
<figcaption><b>fig 5</b>KV bytes per token are my estimate from each model's config at FP8. The cache-hit prices are each vendor's own.</figcaption>
</figure>

For a 120k-token agent context that's about 5.8 GB with GLM-5.3 and 370 MB with V4 Flash. DeepSeek's docs say its cache is stored on disk and kept for ["a few hours to a few days"](https://api-docs.deepseek.com/guides/kv_cache). Keeping 370 MB on an SSD for a day costs very little. Keeping 5.8 GB around for GPUs to read back costs a lot more, and the two price lists reflect that.

One Hacker News user posted their DeepSeek bill: [about 1.27 billion cached tokens](https://news.ycombinator.com/item?id=49215348), which cost them $3.54. At GLM-5.3's cached price the same tokens would cost about $330.

## cost per solved task

Cost per run ignores the runs that fail. The more useful number is cost per solved task, which is the run cost divided by the success rate, plus the cost of someone checking each attempt.

I used Terminal-Bench 4.0 success rates as a rough estimate for long agent tasks: 42% for GLM-5.3 and 12% for V4 Flash. With nobody checking, V4 Flash is still cheaper per solved task, $1.55 against $2.39. Once checking an attempt costs more than 14 cents, GLM-5.3 is cheaper. At $100 an hour, 14 cents is about five seconds of someone's time.

<figure class="wide">
<vs-solve data-fig data-label="fig 6 · per solved task">
<p class="fallback">Expected cost per solved task against the human review cost per attempt, using the run costs from figure 4. On long terminal tasks (42% vs 12% solved) the lines cross at $0.14 per review, and above that GLM-5.3 is cheaper. On single repo fixes (95% vs 89% solved) V4 Flash stays cheaper until $10.81 per review. On one-shot problems (81% vs 87%) V4 Flash is cheaper at any review cost.</p>
</vs-solve>
<figcaption><b>fig 6</b>Run costs come from figure 4's defaults at DeepSeek's peak price. Benchmark success rates are only a rough stand-in for your own tasks, so use your own if you have them.</figcaption>
</figure>

For short, well-specified tasks it goes the other way. With SWE-bench Verified success rates V4 Flash stays cheaper until a review costs more than $10.81, and with LiveCodeBench rates it's cheaper at any review cost.

Retrying the cheaper model helps less than you'd expect, because attempts aren't independent. On SWE-rebench, GLM-5.2 solved 62.9% of tasks on the first attempt and 81.1% within five. If the attempts were independent, five would have reached 99%, so a model that fails a task tends to fail it again on the next try.

## loops and broken tool calls

Leaderboards run each model in a controlled setup. Real agents deal with concurrent requests, proxies and tool-call parsers of varying quality, and that's where most user complaints come from.

The most common complaint about V4 Flash is looping. One user called it ["an absolute drunk intern"](https://news.ycombinator.com/item?id=49218503) unless a second model watches it. The 0731 update also made it reason for longer: one team's eval went from 20 minutes to over an hour because ["it reasons 5x longer than the preview"](https://news.ycombinator.com/item?id=49225823). DeepSeek's API has a strict rule too. In thinking mode with tools you have to send the previous turns' reasoning back, or it returns an HTTP 400 ([docs](https://api-docs.deepseek.com/guides/thinking_mode)). Claude Code removes that field, so for a while [V4 was close to unusable there](https://github.com/musistudio/claude-code-router/issues/1378) without a patched router. The complaints about GLM-5.3 are mostly that it's slow on Z.ai's API and sometimes builds things nobody asked for.

Both models write tool calls in their own markup, which the serving software has to turn back into JSON, and many failures happen at that step. vLLM's GLM parser returned empty arguments on [5 to 17% of calls with six requests in flight, and on none when requests ran one at a time](https://github.com/vllm-project/vllm/issues/49248); that was measured on GLM-5.2, which uses the same format. A self-hosted V4 Flash put raw tool markup into its reply on [9 of 115 tool turns](https://github.com/MiaAI-Lab/DeepSeek-v4-Flash-One-DGX-Spark/issues/6), and through Cline's gateway this happened in [about one run in four](https://github.com/cline/cline/issues/13348). An open vLLM issue links V4 Flash's broken tool calls to prefix caching, with failures [as high as 63% for one cache pattern](https://github.com/vllm-project/vllm/issues/59926). Its authors don't know the cause yet.

<figure class="wide">
<vs-survive data-fig data-label="fig 7 · will the run survive?">
<p class="fallback">The chance that an agent run finishes without a single broken tool call is (1 − r) to the power of the number of steps. At 7.8% per call, a 30-step run gets through 8.7% of the time. At 11% it gets through 3% of the time, and at 25% almost never.</p>
</vs-survive>
<figcaption><b>fig 7</b>Each rate comes from one setup described in one GitHub issue, so treat it as an example rather than a typical rate. Harnesses that catch a malformed call and ask again avoid most of these failures.</figcaption>
</figure>

A few percent per call adds up over a long run. At 7.8% per call, fewer than one in ten 30-step runs finish without a broken call, which is why the harness matters so much. In one user's small test, GLM-5.3 solved [6 of 10 tasks in one harness and 9 of 10 in another](https://capocasa.dev/10-task-glm-5-3-harness-bench-claude-opencode-pi-zcode-hermes-and-3code), though he points out a flaw in his own setup. When oh-my-pi [changed its edit-tool format](https://github.com/can1357/oh-my-pi/issues/9717), V4 Flash went from zero failed edits in 1,349 calls to about a quarter of them failing, with the same model before and after.

## using them together

A setup that came up again and again was a stronger model making the plan and V4 Flash writing the code. One user described it as ["mostly been using GLM 5.2 for planning with DeepSeek V4-flash for implementation"](https://news.ycombinator.com/item?id=49296938). Others run Flash next to an "advisor" model that steps in when it starts looping. At Flash's prices this costs very little. One engineer posted [323 million tokens over 30 days for $4.55](https://news.ycombinator.com/item?id=49120354).

People tend to use GLM-5.3 for longer jobs where the agent has to work things out on its own for an hour, like reverse engineering or infrastructure work. One commenter called it ["more robust than DeepSeek"](https://news.ycombinator.com/item?id=49299042). It also works with Claude Code without the reasoning-field problem. The cost is the downside. Comparing the two small models, one user wrote: ["Tasks that would normally cost $0.08 on DSV4-Flash have cost me $0.30+ on GLM-5.3-Flash"](https://news.ycombinator.com/item?id=49481642).

## the newer models

Since V4 Flash is off DeepSeek's API, the choice today is between the newer models. On Artificial Analysis, V4.1-Flash scores 39 on the intelligence index and 27% on Terminal-Bench 4.0, at $0.27 a task and 227 tokens per second. GLM-5.3-Flash scores 42 and 33% at $0.25 a task, but runs at 53 tokens per second. Both are MIT licensed. GLM-5.3 itself moved to a custom licence, MIT plus a Z.ai security review once a hosting provider passes $10B in revenue, which only concerns very large providers.

Both vendors also change which model an old name points to. `deepseek-v4-flash` now serves V4.1, and Z.ai's coding plan sends GLM-5.2 requests to GLM-5.3. If you need results that stay stable, use a dated model id from a third-party host or run the open weights.

For long tasks that run unattended and get reviewed at the end, I'd use GLM-5.3, on a fast host like Together rather than Z.ai's own API. For lots of small, well-specified edits I'd use V4.1-Flash with a stronger model writing the plan, since at that price a failed attempt costs almost nothing to throw away. In both cases I'd check the tool-call parser early on, because a good share of the failures people put down to the model start there.
