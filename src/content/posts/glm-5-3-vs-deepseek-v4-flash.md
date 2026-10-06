---
title: "GLM-5.3 vs DeepSeek V4 Flash: is the flagship worth nine times the price?"
date: 2026-10-06
description: Z.ai's flagship against DeepSeek's small fast model, measured the way a coding agent actually spends money, per step, per cached token and per solved task.
tags: [ai, llm, agents, benchmarks]
category: ai
glyph: versus
figures: 7
---

If you ran a coding agent on open models this summer, two names came up in every thread. GLM-5.3, Z.ai's new flagship, shipped on 14 August. DeepSeek V4 Flash got a big post-training update on 31 July and became a lot of people's daily driver. On Artificial Analysis, one task costs [$2.01 with GLM-5.3 and $0.22 with V4 Flash](https://artificialanalysis.ai/models/comparisons/deepseek-v4-flash-vs-glm-5-3). That's nine times the price, and the question I wanted answered is what those nine times buy you inside an agent loop.

I didn't run my own eval. I went through the model cards, three independent leaderboards, the pricing and caching docs, a pile of GitHub issues and a few hundred Hacker News comments from people who use these models every day. Every number below links to where it came from, and the figures recompute everything from those numbers in your browser.

## two models, one awkward name

These two aren't in the same weight class, which nobody's launch post mentions. GLM-5.3 is a 744B mixture-of-experts with 40B parameters active per token ([model card](https://huggingface.co/zai-org/GLM-5.3)). V4 Flash is DeepSeek's small tier: 284B total, 13B active ([model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash)). Z.ai's own small model, GLM-5.3-Flash (320B, 18B active), is the fairer size-for-size rival. People still compare the flagship with DeepSeek's Flash, because that's the choice their wallet actually faces.

The second problem is that you can't call V4 Flash on DeepSeek's API anymore. On 10 September DeepSeek wrote that ["V4-Flash & V4-Flash-Vision-Exp are retired. For compatibility, `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` temporarily route to V4.1-Flash"](https://api-docs.deepseek.com/news/news260910). V4.1-Flash is a different and bigger model (552B). Any test someone ran against `deepseek-v4-flash` after that date measured V4.1, whatever their blog post says.

<figure class="wide">
<vs-lineup data-fig data-label="fig 1 · which model is it?">
<p class="fallback">A timeline from April to October 2026. DeepSeek released the V4-Flash preview (284B, 13B active) on 24 April and the 0731 update on 31 July, raised its peak price from $0.14 to $0.44 per million input tokens on 16 August, and released V4.1-Flash (552B, 16B active) on 10 September. Z.ai released GLM-5.3 (744B, 40B active) on 14 August and GLM-5.3-Flash (320B, 18B active) on 26 August. From 10 September the API name deepseek-v4-flash serves V4.1-Flash.</p>
</vs-lineup>
<figcaption><b>fig 1</b>Dot size follows active parameters. The critter is the API name <code>deepseek-v4-flash</code>, which kept pointing at whatever DeepSeek decided it should.</figcaption>
</figure>

So in this post, "V4 Flash" means the 0731 checkpoint. It was current when GLM-5.3 launched, it's still served by about 27 third-party hosts on [OpenRouter](https://openrouter.ai/deepseek/deepseek-v4-flash-0731), and it's the version the independent leaderboards tested. There's a short section on the newer models at the end.

## what the launch posts don't tell you

Both vendors published Terminal-Bench 2.1 numbers: 88.2 for GLM-5.3 and 82.7 for V4 Flash. They can't be compared. Z.ai ran its model inside Claude Code 2.1.207, while DeepSeek used the minimal mode of its own "DeepSeek Harness (to be released)" ([0731 card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731)). DeepSeek's later V4.1 card shows how much the harness alone moves things: the same model scores anywhere from 84.1 to 90.6 on that benchmark depending on the scaffold.

The independent leaderboards look different. On the short stuff, V4 Flash holds its own or wins outright. It beats GLM-5.3 on LiveCodeBench, 87.3% against 80.5% ([Vals](https://www.vals.ai/models/deepseek_deepseek-v4-flash-0731)). On SWE-bench Verified both are near the ceiling (95.4% vs 88.8%), which tells you more about the benchmark than the models. Then the tasks get longer. On Terminal-Bench 4.0, hours-long jobs in a real shell, GLM-5.3 scores [38.9% to V4 Flash's 18.7% on Vals](https://www.vals.ai/benchmarks/terminal-bench-4) and 42% to 12% on Artificial Analysis.

<figure class="wide">
<vs-horizon data-fig data-label="fig 2 · the gap and the task length">
<p class="fallback">Scores for GLM-5.3 and V4-Flash-0731, from short to long tasks. LiveCodeBench (Vals): 80.5 vs 87.3, Flash ahead by 6.8. SWE-bench Verified (Vals): 95.4 vs 88.8. Vals Index: 53.5 vs 48.0. Terminal-Bench 4.0 on Vals: 38.9 vs 18.7. Terminal-Bench 4.0 on Artificial Analysis: 42 vs 12, GLM ahead by 30. The vendors' own Terminal-Bench 2.1 claims were 88.2 vs 82.7.</p>
</vs-horizon>
<figcaption><b>fig 2</b>Rows go from one-shot problems at the top to long agentic tasks at the bottom. Toggle the vendor claims to see how close the launch posts made them look.</figcaption>
</figure>

The gap opens up as the task gets longer. That fits what people report: V4 Flash is great at doing a well-defined thing quickly and gets lost when nobody tells it where to go. On [SWE-rebench](https://swe-rebench.com/), which uses fresh GitHub issues that can't be in anyone's training data, the April checkpoint of V4 Flash solved 38.4% at $0.07 a problem, against 51.1% for GLM-5.2.<span class="sn">GLM-5.3 and the 0731 checkpoint weren't on SWE-rebench yet when I checked on 6 October, so this is the closest pairing available. It's worth checking again.</span>

## thirty steps on the clock

Speed is the other thing you pay for. Artificial Analysis measures GLM-5.3 on Z.ai's own API at 73 output tokens per second with 2.84 seconds before the first token. V4 Flash on DeepSeek's API did 226 tokens per second and answered in 0.89 seconds. One of their benchmark tasks took GLM-5.3 about 16 minutes on average and V4 Flash a bit over three.

In an agent loop that compounds, because the model waits on itself thirty or fifty times in a row. But the host matters as much as the model here. The same GLM-5.3 weights run at about 200 tokens per second on Together, according to the same [providers page](https://artificialanalysis.ai/models/glm-5-3/providers).

<figure class="wide">
<vs-race data-fig data-label="fig 3 · a 30-step loop">
<p class="fallback">Three lanes race through 30 agent steps of 2,000 output tokens each (1,750 for V4 Flash) plus 3 seconds of tool time per step. GLM-5.3 on Z.ai at 73 tokens per second takes 16.6 minutes. GLM-5.3 on Together at 200 tokens per second takes 6.8 minutes. V4-Flash-0731 on DeepSeek at 226 tokens per second takes 5.8 minutes.</p>
</vs-race>
<figcaption><b>fig 3</b>Speeds and first-token times from Artificial Analysis. Output per step is my assumption, scaled by how many tokens each model used per task on their benchmark. Prefill time is ignored.</figcaption>
</figure>

Same weights, 2.4 times faster, just by picking another host. On a fast host, GLM-5.3 lands within a minute of V4 Flash. One knob you can't turn on GLM: its thinking is always on. Z.ai's docs say it can't be disabled, you only pick an effort level. DeepSeek lets you switch thinking off, which is handy for the cheap, boring steps of a loop.

## the bill, step by step

I wrote about [why agents are expensive](/blog/agentic-ai-cost) before. The short version: every step resends the whole conversation, so input tokens pile up, and prompt caching decides whether that costs a little or a lot. Here's how the two price lists compare (per million tokens, at the time of writing):

| | input | cached input | output |
|---|---|---|---|
| GLM-5.3, [Z.ai](https://docs.z.ai/guides/overview/pricing) | $1.40 | $0.26 | $4.40 |
| V4 Flash 0731, DeepSeek, peak | $0.44 | $0.014 | $1.32 |
| V4 Flash 0731, DeepSeek, off-peak | $0.22 | $0.007 | $0.66 |

That cached-input column is the one to stare at. Z.ai knocks 81% off for a cache hit, DeepSeek knocks off 97%. Before 16 August, V4 Flash was even cheaper ($0.14 in, $0.28 out); DeepSeek tripled the peak price and kept off-peak at half.

<figure class="wide">
<vs-bill data-fig data-label="fig 4 · one run, priced">
<p class="fallback">A calculator for one agent run. With the defaults (30 steps, context growing from 8k to 120k tokens, 95% of the previous context served from cache, 2,000 output tokens per step for GLM-5.3 and 1,750 for V4 Flash), GLM-5.3 costs $1.00 and V4 Flash costs $0.19 at DeepSeek's peak price, 5.4 times less. Off-peak it's $0.09, 10.8 times less. With no cache at all the gap shrinks to 3.2 times.</p>
</vs-bill>
<figcaption><b>fig 4</b>Context grows in a straight line from 8k to the end value; at each step the share you set of the previous context comes back from cache. Drag the cache slider to zero and watch the gap shrink.</figcaption>
</figure>

Two things fall out of that calculator. Caching widens the gap: with no cache GLM-5.3 costs about three times as much per run, with a warm cache five to eleven times. And the expensive line moves. On GLM most of the money goes to re-reading cached context, so a smaller context is the lever. On DeepSeek cached reads are so cheap that output tokens become a big share, so the lever is how much the model thinks out loud.

## why DeepSeek can charge almost nothing for a cache hit

I haven't seen anyone connect the price to the architecture, but the link is simple. A cached prefix is a real object somebody has to keep around: the attention keys and values for every token, in every layer. How big that object is depends on the architecture, and you can work it out from each model's `config.json`.

GLM-5.3 uses DeepSeek-style latent attention: 78 layers, each storing a 576-number summary per token, plus the keys of its sparse-attention indexer. That's roughly 48 KB per token in FP8. V4 Flash compresses its history much harder. In 21 of its layers the past is squashed 4 to 1, in 20 others 128 to 1, and the remaining few only look at a short sliding window. That comes out around 3 KB per token, about fifteen times smaller.<span class="sn">My estimate from the published configs, ignoring framework overhead. vLLM's own measurement for the larger V4 model is in the same range.</span>

<figure class="wide">
<vs-prefix data-fig data-label="fig 5 · a prefix is an object">
<p class="fallback">The memory needed to keep one cached prompt prefix. At 120k tokens GLM-5.3 needs about 5.8 GB and V4 Flash about 370 MB. At 1 million tokens it's about 48 GB against 3.1 GB.</p>
</vs-prefix>
<figcaption><b>fig 5</b>KV bytes per token are my estimate from each model's config at FP8. The cache-hit prices are each vendor's own.</figcaption>
</figure>

A 120k-token agent context is about 5.8 GB for GLM-5.3 and about 370 MB for V4 Flash. DeepSeek's docs say its cache lives on disk and sticks around for ["a few hours to a few days"](https://api-docs.deepseek.com/guides/kv_cache). A 370 MB file on an SSD is cheap. Six gigabytes of GPU memory is not, and that's roughly where Z.ai's $0.26 comes from.

It also explains a story from that Hacker News thread. One user posted their bill after pushing [about 1.27 billion cached tokens through DeepSeek's API](https://news.ycombinator.com/item?id=49215348): the cache hits cost $3.54. On GLM-5.3's price list the same cache hits would be about $330.

## cost per solved task

Cost per run is still the wrong number, because a run can fail. What you pay for in the end is a solved task: the run cost divided by the success rate, plus the time somebody spends checking each attempt.

Take Terminal-Bench 4.0 success rates as a rough stand-in for long agent tasks: 42% for GLM-5.3, 12% for V4 Flash. Without any human in the loop V4 Flash is still cheaper per solved task ($1.55 against $2.39). But if checking an attempt costs you more than 14 cents, GLM-5.3 wins, and at $100 an hour fourteen cents is five seconds of someone's time.

<figure class="wide">
<vs-solve data-fig data-label="fig 6 · per solved task">
<p class="fallback">Expected cost per solved task against the human review cost per attempt, using the run costs from figure 4. On long terminal tasks (42% vs 12% solved) the lines cross at $0.14 per review, after which GLM-5.3 is cheaper. On single repo fixes (95% vs 89% solved) V4 Flash stays cheaper until $10.81 per review. On one-shot problems (81% vs 87%) V4 Flash is cheaper at any review cost.</p>
</vs-solve>
<figcaption><b>fig 6</b>Run costs come from figure 4's defaults at DeepSeek's peak price. Benchmark success rates are a crude proxy for your tasks, so swap in your own if you have them.</figcaption>
</figure>

On short, well-defined work the answer flips. With SWE-bench Verified-style fixes, V4 Flash stays cheaper until a review costs over ten dollars, and on one-shot problems it's cheaper whatever you pay your reviewer.

You might think the cheap model wins anyway because you can just retry it. Retries aren't independent coin flips, though. On SWE-rebench, GLM-5.2 solved 62.9% of tasks on the first try and 81.1% within five. If each try were independent, five would get you to 99%. A model that fails a task usually fails it the same way the next time.

## what breaks in real agents

The leaderboards run each model in a clean, controlled harness. Real agents run under load, through proxies, with tool parsers somebody wrote in a weekend. That's where most of the complaints come from.

V4 Flash's best-known problem is looping. One user called it ["an absolute drunk intern"](https://news.ycombinator.com/item?id=49218503) without a second model watching it, and the 0731 update made it think longer: one team's eval went from 20 minutes to over an hour because ["it reasons 5x longer than the preview"](https://news.ycombinator.com/item?id=49225823). It also has a strict API rule. In thinking mode with tools, you have to send the previous turns' reasoning back or DeepSeek returns an HTTP 400 ([docs](https://api-docs.deepseek.com/guides/thinking_mode)). Claude Code strips that field, so for a while [V4 was close to unusable there](https://github.com/musistudio/claude-code-router/issues/1378) without a patched router. GLM-5.3's complaints are about speed and enthusiasm: it's slow on Z.ai's API and sometimes builds things nobody asked for.

Then there are the tool calls themselves. Both models write tool calls in their own markup, which the serving software has to parse back into JSON, and the parsers are where things go wrong:

- vLLM's GLM parser returned empty arguments on [5 to 17% of calls with six requests in flight, and never when they ran one at a time](https://github.com/vllm-project/vllm/issues/49248). That was on GLM-5.2, which uses the same format.
- A self-hosted V4 Flash leaked raw tool markup into its answer on [9 of 115 tool turns](https://github.com/MiaAI-Lab/DeepSeek-v4-Flash-One-DGX-Spark/issues/6). Through one coding tool's gateway it was [about one run in four](https://github.com/cline/cline/issues/13348).
- An open vLLM issue ties V4 Flash's broken tool calls to prefix caching, [up to 63% for one particular cache-hit shape](https://github.com/vllm-project/vllm/issues/59926). The authors say the cause is still unknown.

<figure class="wide">
<vs-survive data-fig data-label="fig 7 · will the run survive?">
<p class="fallback">The chance that an agent run finishes without a single broken tool call is (1 − r) to the power of the number of steps. At 7.8% per call, a 30-step run survives 8.7% of the time. At 11% it survives 3%. At 25% it essentially never survives. At 0% it always does.</p>
</vs-survive>
<figcaption><b>fig 7</b>Each rate comes from one setup in one GitHub issue, so read them as "this happens", not "this is how often". A good harness catches a malformed call and asks again.</figcaption>
</figure>

Small per-call failure rates kill long runs. At 7.8% per call, a 30-step run gets through without a broken call less than one time in ten. That's why the harness matters so much. One user's small test had GLM-5.3 solve [6 of 10 tasks in one harness and 9 of 10 in another](https://capocasa.dev/10-task-glm-5-3-harness-bench-claude-opencode-pi-zcode-hermes-and-3code) (he flags a setup flaw himself), and an [edit-tool format change in oh-my-pi](https://github.com/can1357/oh-my-pi/issues/9717) took V4 Flash's edit failures from zero in 1,349 calls to about a quarter, with the same model on both sides of the change.

## what people actually run

The pattern I kept running into is a split: a stronger model plans, V4 Flash does the typing. ["Mostly been using GLM 5.2 for planning with DeepSeek V4-flash for implementation"](https://news.ycombinator.com/item?id=49296938), as one user put it. Others watch Flash with an "advisor" model that steps in when it starts looping. Flash's price makes this almost free. One engineer posted [323 million tokens over 30 days for $4.55](https://news.ycombinator.com/item?id=49120354).

GLM-5.3 gets a different kind of praise. People call it ["more robust than DeepSeek"](https://news.ycombinator.com/item?id=49299042) and use it for the long, messy jobs: reverse engineering, infrastructure, anything where the agent has to find its own way for an hour. It plugs into Claude Code without the reasoning-field trouble. The flip side is the bill, and in the Flash-vs-Flash match people actually ran, the complaint was blunt: ["Tasks that would normally cost $0.08 on DSV4-Flash have cost me $0.30+ on GLM-5.3-Flash"](https://news.ycombinator.com/item?id=49481642).

## if you're choosing today

V4 Flash is gone from DeepSeek's API, so today's real choices are its successors. On Artificial Analysis, V4.1-Flash scores 39 on the intelligence index and 27% on Terminal-Bench 4.0, at $0.27 a task and 227 tokens per second. GLM-5.3-Flash scores 42 and 33% at $0.25 a task, but runs at 53 tokens per second. Both are MIT licensed. GLM-5.3 itself moved to a custom licence that is MIT plus a Z.ai security review once a hosting provider passes $10B in revenue, which won't affect you unless you're very large.

Both vendors also swap models behind an old name. `deepseek-v4-flash` now means V4.1, and Z.ai's coding plan routes GLM-5.2 requests to GLM-5.3. If your evals need to stay stable, pin a dated third-party model id or run the open weights.

What I'd do with the numbers above: for long, unattended work where someone reviews the result, GLM-5.3 earns its price, but on a fast host rather than Z.ai's own 73 tokens per second. For lots of small, well-specified edits, V4.1-Flash with a stronger model writing the plan is very hard to beat, and at those prices you can afford to throw away a few attempts. Whichever you pick, spend an afternoon on the tool-call parser before you spend a week blaming the model.
