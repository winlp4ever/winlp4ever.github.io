---
title: Mistral Large 4, seven months behind the frontier
date: 2026-10-12
description: Mistral Large 4 is the best model built outside the US and China and a big jump from Large 3. Independent tests put it about seven months behind the US labs and behind five Chinese open models, and a task on it costs about fifteen times more than on the small US models with the same score.
tags: [ai, llm, benchmarks]
category: ai
glyph: versus
figures: 5
---

So many models, products and benchmarks have come out since Mistral's last flagship that the wait feels like years. It has been ten months: Large 3 came out in December 2025.

Mistral released Large 4 on 6 October as a public preview<sup><a href="#src-1">1</a></sup>. It's a mixture-of-experts model with about a trillion parameters, of which 49 billion are active for each token (52 billion counting the embedding and output layers)<sup><a href="#src-2">2</a></sup>. It reads text and images, takes up to a million tokens of context and costs $1.36 per million input tokens and $4.18 per million output tokens, at half price for the first two weeks<sup><a href="#src-3">3</a></sup>. Mistral trained it on about 3,800 Grace Blackwell GPUs in its own data centres in Europe. The weights are promised "by the end of the month"<sup><a href="#src-4">4</a></sup>, and no license has been named yet. Large 3 was Apache 2.0.

It's the most interesting model Mistral has shipped in a long time, a bit late though. **On Artificial Analysis's index it scores 38, a score the US labs first reached in March.**

The numbers below come from Mistral's launch post and model card, Artificial Analysis, Vals, LMArena, the Terminal-Bench and SWE-bench leaderboards, and press and forum coverage, all read on 12 October 2026.

## nine to 38

As Simon Willison noted at launch, Large 3 scored 9 on Artificial Analysis's Intelligence Index<sup><a href="#src-5">5</a></sup>, which combines a dozen evaluations into one number. Large 4 scores 38<sup><a href="#src-6">6</a></sup>. Artificial Analysis calls it "the most intelligent model outside the US and China"<sup><a href="#src-7">7</a></sup>.

The model is bigger, from 675 billion parameters to about a trillion and from 41 billion active to 49. Mistral's post says the reinforcement learning run was "still in flight" at launch<sup><a href="#src-1">1</a></sup>, so the preview isn't the final model either, and The Register reports an update hinted at for about two months out<sup><a href="#src-8">8</a></sup>.

## seven months

To turn a score into time, I use the same method as in the [DeepSeek and GLM comparison](/blog/deepseek-v4-1-vs-glm-5-3/): find the date when a US closed model first reached the same score on the same index. GPT-5.4 scored 39 on 5 March. Large 4 arrived 215 days later.

<figure class="wide">
<ml-gap data-fig data-label="fig 1 · seven months behind">
<p class="fallback">Two step lines from December 2025 to October 2026 on the Artificial Analysis Intelligence Index. The best US closed model climbs from 29.1 (Claude Opus 4.5, November 2025) to 39 (GPT-5.4, 5 March), 49.6 (Claude Fable 5, June) and 57.6 (Claude Opus 5.5, 21 September). The best open model, always from a Chinese lab, climbs from 27.9 (GLM-5, February) to 46.3 (MiMo-V2.6-Pro, 21 September). Mistral Large 4 scores 38 on 6 October, 215 days after GPT-5.4 first reached 39.</p>
</ml-gap>
<figcaption><b>fig 1</b>Large 4 sits below the best Chinese open model and 215 days behind the first US model to reach its score. <span class="m">Artificial Analysis Intelligence Index v4.3.2, which re-scores older models on the current version<sup><a href="#src-9">9</a></sup>. Release dates from Artificial Analysis. The closed line includes Alibaba's Qwen3.8 Max, which held the record in August.</span></figcaption>
</figure>

Simon Willison landed in the same place by eye: "certainly not a Fable-class model, but it's great to see Mistral put out a model that's back to being maybe about 6 months behind the frontier"<sup><a href="#src-5">5</a></sup>.

Against what ships today, the gap is twenty points. Claude Opus 5.5 scores 57.6, and six US models score above 50. Five Chinese open models score higher than Large 4 as well, led by Xiaomi's MiMo-V2.6-Pro at 46.3. US open-weight models are much further back: NVIDIA's Nemotron 3 Ultra scores 23 and OpenAI's gpt-oss-120b 12.

<figure class="wide">
<ml-board data-fig data-label="fig 2 · the scoreboard">
<p class="fallback">Artificial Analysis Intelligence Index on 12 October 2026. US closed: Claude Opus 5.5 57.6, Claude Sonnet 5.5 56.0, Claude Fable 5.1 53.4, Gemini 4 Argon 53, GPT-6 Astra 52.7, GPT-6.1 Sol 51.8, Grok 4.7 46, Claude Haiku 5.5 38, GPT-6 Luna 38. Chinese: MiMo-V2.6-Pro 46.3, GLM-5.3 44.8, Step 5 Preview 44 (weights promised), Kimi K3 43.6, GLM-5.3-Flash 41.8, DeepSeek V4.1-Flash 39.5. Mistral Large 4: 38 (weights promised). US open: Nemotron 3 Ultra 23, Gemma 4 31B 15, gpt-oss-120b 12. With only open weights shown, Large 4 ranks seventh, behind six Chinese models, and first among models from outside China.</p>
</ml-board>
<figcaption><b>fig 2</b>Among open-weight models Large 4 would rank seventh, behind six Chinese models and far ahead of every US one. <span class="m">Artificial Analysis, highest-effort variant of each model<sup><a href="#src-9">9</a></sup>. Dashed bars are models whose weights are promised but not released. Qwen is left out because Artificial Analysis lists its open and closed checkpoints inconsistently.</span></figcaption>
</figure>

**When the weights ship, Large 4 will be the best open model from outside China**, and by a lot. On LMArena's text leaderboard, where people vote on answers side by side, it does worse: 115th with 1429 points, below Google's Gemma 4 31B<sup><a href="#src-10">10</a></sup>.

## coding & agents

When Mistral released its last flagship, the agentic era was only beginning. Now agents are the main use case, and the benchmarks every lab reports its models against are agent benchmarks.

On Terminal-Bench 4.0, where an agent works through long tasks in a real terminal, Vals measured 22.7% for Large 4<sup><a href="#src-11">11</a></sup>. GLM-5.3 scores 38.9% on the same board, and Claude Opus 5.5 65.2%. On DeepSWE, Mistral's own chart puts Large 4 at 62, next to GLM-5.3 at 61 and behind Kimi K3 at 68<sup><a href="#src-1">1</a></sup>.

Mistral's launch post leaves out GPQA, Humanity's Last Exam and SWE-bench Verified, and it has no multilingual benchmark for a model trained on more than 160 languages, or a long-context test for its million tokens. Nobody independent has published SWE-bench or ARC-AGI numbers yet either. Those should come once the weights are out.

Cybersecurity is where it leads. On Artificial Analysis's CyberGym run, Large 4 reproduces and patches 82% of the vulnerabilities, ahead of MiMo-V2.6-Pro at 79% and GPT-6 Luna at 78%<sup><a href="#src-7">7</a></sup>. Mistral's post adds that "several leading closed models score near zero on the same test because they refuse to perform the task"<sup><a href="#src-1">1</a></sup>. On Artificial Analysis's wider Cyber Index it scores 50, in the middle of the open models<sup><a href="#src-7">7</a></sup>.

## what a task costs

A price per token doesn't tell you what a task costs. What you pay for a task is the price per token times the number of tokens the model spends on it, including all of its reasoning. Artificial Analysis reports both, so the two can be pulled apart.

<figure class="wide">
<ml-cost data-fig data-label="fig 3 · per token and per task">
<p class="fallback">Index score against price on a log scale, with a toggle between price per million output tokens and cost per Artificial Analysis task. Mistral Large 4: 38 points, $4.18 per million output tokens, 200 million output tokens to run the index, $1.13 a task. GPT-6 Luna and Claude Haiku 5.5: 38 points, $0.50, 140 and 97 million tokens, $0.07 and $0.08 a task. GPT-6.1 Sol: 52 points, $10, 67 million tokens, $0.72. Claude Sonnet 5.5: 47 points, $10, 52 million, $0.88. Claude Opus 5.5: 58 points, $20, 260 million, $5.98. Gemini 4 Argon: 53 points, $10, 110 million, $1.99. MiMo-V2.6-Pro: 46 points, $0.87, 140 million, $0.13. DeepSeek V4.1-Flash: 39 points, $1.20, 250 million, $0.27. GLM-5.3: 45 points, $4.40, 210 million, $2.01. Kimi K3: 44 points, $15, 160 million, $2.00.</p>
</ml-cost>
<figcaption><b>fig 3</b>Per token, Large 4 is a mid-priced model. Per task it moves next to models that score ten to fifteen points more. <span class="m">Artificial Analysis model pages<sup><a href="#src-6">6</a></sup>, list prices without the launch discount. Effort variants: Sonnet 5.5 and Haiku 5.5 high, Gemini 4 Argon high, the others max. Hover a dot for its token count.</span></figcaption>
</figure>

GPT-6 Luna and Claude Haiku 5.5 score the same 38 for 7 and 8 cents a task. **Large 4 costs $1.13 a task, about fifteen times more for the same score.** Against those two the reason is the price: Large 4 spends between 1.4 and 2.1 times their tokens, but each output token costs 8.4 times more.

Against GPT-6.1 Sol the reason is the tokens. Sol costs 2.4 times more per output token and spends 67 million tokens on the index where Large 4 spends 200 million, so Sol ends up cheaper per task and scores 14 points higher. Against the Chinese models Large 4 lands in the middle: cheaper per task than GLM-5.3 ($2.01) and Kimi K3 ($2.00), and nine times dearer than MiMo-V2.6-Pro ($0.13), which scores eight points more.

My guess is that most of the extra tokens go to reasoning and to longer agent runs. On the Vals Index, Large 4 read 11.2 billion input tokens where GPT-6.1 Sol read 4.5 billion, and took two and a half times as long<sup><a href="#src-12">12</a></sup>. That fits an agent that takes more steps and rereads its context each time, which is what an unfinished reinforcement learning run tends to leave behind. Nobody publishes step counts, so I can't check it yet. With the launch discount, a task costs $0.57 for the next two weeks.

## the harness moves the score

Not long ago, changing the prompt could make a model's results drift a lot, which is one reason labs' own eval numbers so often differed from independent tests. In December 2023, Google launched Gemini Ultra with 90% on MMLU, ahead of GPT-4's 86.4%. Gemini's number came from 32 sampled chains of thought and a vote, and GPT-4's from five examples in the prompt. In the five-example setup, Gemini Ultra scored 83.7% and came second<sup><a href="#src-13">13</a></sup>.

<figure>
<ml-prompt data-fig data-label="fig 4 · the old version: prompting">
<p class="fallback">MMLU scores from the Gemini technical report. With five examples in the prompt, GPT-4 scores 86.4% and Gemini Ultra 83.7%. With 32 sampled chains of thought and a vote, Gemini Ultra scores 90.04% and GPT-4 87.29%. The ranking flips with the method.</p>
</ml-prompt>
<figcaption><b>fig 4</b>Same two models, same test, and the prompting method decides which one wins. <span class="m">Gemini technical report v1, table 2<sup><a href="#src-13">13</a></sup>. GPT-4's chain-of-thought score is Google's own run through the API.</span></figcaption>
</figure>

The Hugging Face team found the same thing in 2023 with LLaMA-65B, which scored 63.7 on MMLU in one standard implementation and 48.8 in another<sup><a href="#src-14">14</a></sup>.

Today's models are trained to keep that sensitivity to prompting to a minimum, but a new, larger factor has come into the equation: the harness, the program that runs the agent loop around the model and hands it tools. For an agent score the questions to ask are which harness ran it, with what step limit and on whose servers, and a lab's own number usually comes from the setup that suits its model best.

Mistral's chart says Large 4 scores 28.3% on Terminal-Bench 4.0. A footnote inside the chart image explains that these are "the numbers evaluated privately by Artificial Analysis ahead of the harness' public launch"<sup><a href="#src-1">1</a></sup>. Artificial Analysis's public run gives 26.8%, and Vals' gives 22.7%. Both run the same open-source agent, mini-swe-agent, on the same 66 tasks three times each. The known differences are a 500-step cap on Artificial Analysis's side and the sampling temperature<sup><a href="#src-15">15</a></sup>.

The other models move as much between boards. On the official Terminal-Bench leaderboard most labs submit their own agent (Claude Code for Anthropic, Codex for OpenAI, Grok Build for xAI; Alibaba's Qwen ran in Claude Code), while Artificial Analysis and Vals use mini-swe-agent for everyone.

<figure class="wide">
<ml-boards data-fig data-label="fig 5 · one benchmark, three boards">
<p class="fallback">Terminal-Bench 4.0 scores on three leaderboards. Qwen3.8 Max: 27.0% in Claude Code on the official board, 38.9% on Artificial Analysis, 34.3% on Vals, a spread of 11.9 points. Grok 4.7: 37.6% in Grok Build, 25.8% and 28.8%, a spread of 11.8. Claude Fable 5.1: 57.9, 52.0, 58.1. Claude Opus 5.5: 64.9, 59.6, 65.2. GPT-6 Sol: 49.4, 43.9, 44.4. Mistral Large 4: no official entry, 26.8% on Artificial Analysis, 22.7% on Vals and 28.3% in Mistral's chart. GLM-5.3: 41.8, 41.9, 38.9. GPT-6.1 Sol: 58.2, 56.1, 55.1. Claude Sonnet 5.5: 61.8, 63.6, 64.1. GPT-6 Astra: 58.2, 59.1, 59.6. Gemini 3.8 Flash, run with mini-swe-agent on all three boards: 19.1, 19.7, 19.2, a spread of 0.6.</p>
</ml-boards>
<figcaption><b>fig 5</b>Qwen3.8 Max and Grok 4.7 move 12 points depending on who runs them. Gemini 3.8 Flash, run with the same agent everywhere, moves 0.6. <span class="m">Official Terminal-Bench 4.0 leaderboard<sup><a href="#src-16">16</a></sup>, Artificial Analysis<sup><a href="#src-6">6</a></sup> and Vals<sup><a href="#src-11">11</a></sup>, max effort where shown. Vals counts some Opus 5.5 and Fable 5.1 requests answered by older Claude models as theirs; without them Opus 5.5 drops to 58.1.</span></figcaption>
</figure>

**Qwen3.8 Max and Grok 4.7 move about 12 points depending on who runs them, while Gemini 3.8 Flash, run with the same agent on all three boards, moves 0.6.** The older Terminal-Bench 2.0 board has many agents per model. Claude Opus 4.6 scores 58.0% in Claude Code and 76.4% in Stanford's Meta-Harness<sup><a href="#src-16">16</a></sup>. On SWE-bench Verified, most frontier models score 4 to 7 points lower in the plain bash-only setup than in their lab's announcement<sup><a href="#src-17">17</a></sup>. The biggest gap belongs to Mistral's own coding model, Devstral 2: 72.2 in Mistral's announcement<sup><a href="#src-18">18</a></sup>, 53.8 bash-only. Epoch AI found that changing the agent alone moves GPT-5 by up to 11% and Kimi K2 Thinking by up to 15% on the same benchmark<sup><a href="#src-19">19</a></sup>.

Mistral has its own agent, Vibe CLI, open source since December 2025<sup><a href="#src-20">20</a></sup>. It hasn't published Large 4 scores inside it, and nobody has compared Large 4 in Vibe against Claude Code or Codex yet.

## who it's for

The case for Large 4 is about where it runs and who controls it. It was trained in Europe on Mistral's own hardware, and the weights will let a company or a government run it on their own machines without a US or Chinese provider in the loop. Mistral raised €3 billion in September at a valuation above €21 billion<sup><a href="#src-21">21</a></sup> and signed a framework agreement with the French armed forces in January<sup><a href="#src-22">22</a></sup>. For buyers like that, a model seven months behind with open weights beats a better one they can't host.

French is supposed to be home ground, and the one independent test I found didn't go well. Journal du Net had Large 4, GPT-6 Luna and GLM-5.3 each write a French editorial. Large 4 won on style, "malgré de nombreuses tournures pompeuses", and wrote the least argued text of the three: "Un fond décevant pour l'exercice présenté comme le point fort de Mistral"<sup><a href="#src-23">23</a></sup>.

On Hacker News the thread split between people calling it "good enough to use as a daily driver" and one calling it a "Sovereign sticker at the frontend on a mediocre product"<sup><a href="#src-24">24</a></sup>. The numbers sit between the two. For coding and agent work today I'd pick GPT-6.1 Sol, which beats Large 4 on score and on cost per task, or MiMo-V2.6-Pro if I needed open weights. I'll rerun these figures when the weights ship, which Mistral has promised by the end of October.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://mistral.ai/news/mistral-large-4">Mistral, Mistral Large 4 launch post, including chart footnotes (6 October 2026)</a></li>
<li id="src-2"><a href="https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B">Hugging Face, mistralai/Mistral-Large-4-1T-A52B model page (read 12 October 2026)</a></li>
<li id="src-3"><a href="https://docs.mistral.ai/models/mistral-large-4">Mistral docs, Mistral Large 4 model card and pricing (read 12 October 2026)</a></li>
<li id="src-4"><a href="https://techcrunch.com/2026/10/06/mistrals-new-1t-model-aims-to-leapfrog-closed-and-open-rivals/">TechCrunch, Mistral's new 1T model aims to leapfrog closed and open rivals (6 October 2026)</a></li>
<li id="src-5"><a href="https://simonwillison.net/2026/Oct/6/le-chonk/">Simon Willison, Introducing Mistral Large 4: Le chonk (6 October 2026)</a></li>
<li id="src-6"><a href="https://artificialanalysis.ai/models/mistral-large-4">Artificial Analysis, Mistral Large 4 model page (read 12 October 2026)</a></li>
<li id="src-7"><a href="https://artificialanalysis.ai/articles/mistral-large-4-france-ai">Artificial Analysis, Mistral Large 4 analysis (October 2026)</a></li>
<li id="src-8"><a href="https://www.theregister.com/ai-and-ml/2026/10/06/european-ai-flag-bearer-mistrals-new-open-weights-model-is-le-chonk/5301443">The Register, European AI flag-bearer Mistral's new open weights model is Le Chonk (6 October 2026)</a></li>
<li id="src-9"><a href="https://artificialanalysis.ai/leaderboards/models">Artificial Analysis, model leaderboard, Intelligence Index v4.3.2 (read 12 October 2026)</a></li>
<li id="src-10"><a href="https://arena.ai/leaderboard/text">LMArena, text leaderboard (updated 8 October 2026)</a></li>
<li id="src-11"><a href="https://www.vals.ai/benchmarks/terminal-bench-4">Vals AI, Terminal-Bench 4.0 (updated 7 October 2026)</a></li>
<li id="src-12"><a href="https://www.vals.ai/models/mistralai_mistral-large-4">Vals AI, Mistral Large 4 model page and Vals Index (read 12 October 2026)</a></li>
<li id="src-13"><a href="https://arxiv.org/abs/2312.11805">Gemini Team, Gemini: A Family of Highly Capable Multimodal Models, v1 (19 December 2023)</a></li>
<li id="src-14"><a href="https://huggingface.co/blog/open-llm-leaderboard-mmlu">Hugging Face, What's going on with the Open LLM Leaderboard? (23 June 2023)</a></li>
<li id="src-15"><a href="https://artificialanalysis.ai/methodology/intelligence-benchmarking">Artificial Analysis, intelligence benchmarking methodology (read 12 October 2026)</a></li>
<li id="src-16"><a href="https://www.tbench.ai/leaderboard">Terminal-Bench leaderboards, versions 2.0 and 4.0 (read 12 October 2026)</a></li>
<li id="src-17"><a href="https://www.swebench.com/">SWE-bench, Verified leaderboard, bash-only entries (read 12 October 2026)</a></li>
<li id="src-18"><a href="https://mistral.ai/news/devstral-2-vibe-cli">Mistral, Devstral 2 and Vibe CLI (9 December 2025)</a></li>
<li id="src-19"><a href="https://epoch.ai/gradient-updates/why-benchmarking-is-hard">Epoch AI, Why benchmarking is hard (23 December 2025)</a></li>
<li id="src-20"><a href="https://github.com/mistralai/mistral-vibe">Mistral, mistral-vibe on GitHub (read 12 October 2026)</a></li>
<li id="src-21"><a href="https://techcrunch.com/2026/09/08/mistral-raises-e3b-as-sovereign-ai-becomes-big-business/">TechCrunch, Mistral raises €3B as sovereign AI becomes big business (8 September 2026)</a></li>
<li id="src-22"><a href="https://acteurspublics.fr/articles/le-ministere-des-armees-signe-un-accord-cadre-avec-le-champion-francais-de-lia-mistral/">Acteurs publics, Le ministère des Armées signe un accord-cadre avec Mistral (8 January 2026)</a></li>
<li id="src-23"><a href="https://www.journaldunet.com/intelligence-artificielle/1556073-code-finance-francais-cybersecurite-on-a-teste-mistral-large-4/">Journal du Net, Code, finance, français, cybersécurité : on a testé Mistral Large 4 (8 October 2026)</a></li>
<li id="src-24"><a href="https://news.ycombinator.com/item?id=49977979">Hacker News, Mistral Large 4 discussion (6 October 2026)</a></li>
</ol>
</details>
