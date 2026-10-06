---
title: "Behind prompt caching: a friendly intro to KV caching"
date: 2026-04-30
updated: 2026-10-06
description: What actually happens when a provider says your prompt is cached. The trick underneath is called KV caching, and it's a small idea with a big memory bill.
tags: [ai, llm, transformers, caching]
category: ai
glyph: kv
figures: 5
---

Every provider's pricing page has a line for cached input tokens, and the price next to it looks almost too good. Anthropic charges a tenth of the normal input price when your prompt hits the cache. OpenAI's discount depends on the model, half price on the older ones and up to 90% off on the newer ones. I wanted to know what exactly they keep around, and why reusing it is that much cheaper.

The thing they keep is called the **KV cache**. It's been sitting inside every LLM server for years, long before anyone sold it as a feature, and once you see how it works, prompt caching stops looking like a pricing trick. It's the same cache, kept alive between your requests.

## a thirty-second recap

If you want the long version, I wrote [a whole post on how a transformer reads](/blog/how-a-transformer-reads/). The part that matters here: at every layer, each token turns its vector into three smaller ones, a **query**, a **key** and a **value**. To update a token, the model compares its query with the keys of the tokens it's allowed to see, turns the scores into weights with a softmax, and takes the weighted sum of their values.

```
attention(Q, K, V) = softmax(Q·Kᵀ / √d) · V
```

In a GPT-style model a token is only allowed to see itself and the tokens before it. Keep that rule in your pocket, it's the whole reason the cache works.

## generation is a loop

A language model writes one token at a time. You give it *the cat sat*, it answers *on*. You append *on* and ask again, it answers *the*. Then *mat*. Every new token means another full trip through the model.

The lazy way to run that loop is to hand the model the entire text every time and let it recompute everything from scratch. That includes the keys and values of tokens it has already processed, sometimes hundreds of times over. A cache does the obvious thing instead: compute each token's keys and values once, keep them, and on every later step only process the newest token.

<figure class="wide">
<kv-loop data-fig data-label="fig 1 · the loop">
<p class="fallback">Two lanes generate the same five tokens after the prompt "the cat sat". In the lane without a cache, every step recomputes the keys and values of every token in the context: 3, then 4, 5, 6 and 7, for 25 computations in total. In the lane with a KV cache, the prompt's keys and values are computed once and each later step only computes the newest token's, for 7 in total.</p>
</kv-loop>
<figcaption><b>fig 1</b>Same prompt, same five new tokens. Ochre is work thrown away after the step, green is work that goes into the cache. The counters are exact for this toy run.</figcaption>
</figure>

## why old keys never change

You might reasonably worry that adding a token changes everything before it. In a model that reads both ways it would. In a GPT-style model it can't, because of the masking rule from the recap. Token 3's vector at layer 1 only depends on tokens 1 to 3, so its key and value at layer 1 only depend on them too, and the same holds at layer 2, layer 3, all the way up. Adding token 6 at the end can't reach back and change any of that.

Queries are the opposite. A token's query is only used once, to compute that token's own row of attention, at the moment the token is processed. After that it never comes up again. So you keep the keys and values and throw the queries away.

<figure class="wide">
<kv-rows data-fig data-label="fig 2 · one new row per token">
<p class="fallback">A triangular attention grid grows one row at a time as six tokens are processed. Each new row is the new token's query compared with every cached key. The rows above it never change, the new key and value are appended to the cache, and the query is dropped once its row is done.</p>
</kv-rows>
<figcaption><b>fig 2</b>Each step adds exactly one row to the attention grid: the new query against every cached key. The weights are random but the softmax is real, and each row sums to 1.</figcaption>
</figure>

My favourite way to hold this in my head is a library. The keys are the catalogue cards and the values are the books. Both stay on the shelves for every future visitor. A visitor's question (the query) only matters while they're standing at the desk.

## what the cache saves, and what it doesn't

When I first wrote this post I said the cache turns generation from O(n²) into O(n), 500 times faster for 1,000 tokens. Half of that is right, and the half that's wrong is worth looking at.

The right half: without a cache, step *t* pushes all *t* tokens through every layer again, the projections and the MLP included. Over *n* steps that's 1 + 2 + … + *n* = *n*(*n*+1)/2 token-passes, about 500,000 for 1,000 tokens. With the cache it's *n*, so 1,000. That's the 500×.

The wrong half: attention itself still grows. The new query still has to be compared with every cached key, so step *t* costs *t* dot products per head per layer, and the total is still quadratic. Without a cache the scores add up to roughly *n*³/6, with one it's *n*²/2. Much better, still quadratic. The cache doesn't make long contexts free, which is why long answers still slow down as they go.

<figure class="wide">
<kv-work data-fig data-label="fig 3 · counting the work">
<p class="fallback">Bars on a log scale compare the work needed to generate n tokens. Tokens pushed through the model: n(n+1)/2 without a cache, n with one, which is about 500 times fewer at n = 1,000. Query-key scores: about n³/6 without a cache and n(n+1)/2 with one, fewer but still growing quadratically.</p>
</kv-work>
<figcaption><b>fig 3</b>Drag the slider. The formulas count a run that starts from a single token; a long prompt shifts the numbers but not the shape. Log scale, so every notch of bar is ten times more work.</figcaption>
</figure>

## the bill comes in memory

The cache trades compute for memory, and the memory is not small. For every token you keep a key and a value, at every layer, for every key-value head:

```
cache bytes = 2 (K and V) × layers × kv_heads × head_dim × bytes per number × tokens × batch
```

Plug in Llama-2-7B, 32 layers and 32 heads of 128 dimensions, stored in 16-bit: that's 512 KiB per token. One 8,192-token conversation needs 4 GiB of cache, on top of the 13.5 GB of weights. Serve 16 of those at once and weights plus cache come to about 82 GB, more than a whole 80 GB GPU.

That's why newer models share keys and values between heads, a trick called grouped-query attention. Llama-3.1-8B still has 32 query heads but only 8 key-value heads, so the cache shrinks to 128 KiB per token, four times less, with little loss in quality.<span class="sn">The other big trick is on the serving side: vLLM's PagedAttention stores the cache in small fixed-size blocks, like virtual memory, so it doesn't waste space on reserved but unused context.</span>

<figure class="wide">
<kv-mem data-fig data-label="fig 4 · memory calculator">
<p class="fallback">A calculator for KV cache memory. Llama-3.1-8B uses 2 × 32 layers × 8 KV heads × 128 dimensions × 2 bytes, which is 128 KiB per token, so about 1 GB of cache for 8,192 tokens. Llama-2-7B needs four times as much per token. A bar shows weights plus cache against one 80 GB GPU.</p>
</kv-mem>
<figcaption><b>fig 4</b>Real model shapes, real formula. Weights are counted at 16-bit; the fp8 switch only changes the cache. GB here means 10⁹ bytes, KiB means 1,024.</figcaption>
</figure>

## prompt caching is this, kept around

So what does a provider cache? Exactly this: the keys and values of your prompt, at every layer. Processing a long prompt (the prefill) is often the expensive part of a request, so if your next request starts with the same tokens, the server can load that part of the cache instead of recomputing it.

The catch is the word *starts*. The cache only works for a prefix that matches exactly, token for token, from the very first token, because each key depends on everything before it. Change one token early on and every key after it is different, so nothing past that point can be reused.

<figure class="wide">
<kv-prefix data-fig data-label="fig 5 · prefix match">
<p class="fallback">Two requests are compared block by block: system prompt (2,000 tokens), tools (1,500), examples (1,200) and the user's question (30). With only a new question, 4,700 tokens are read from cache and the input costs about 11% of an uncached request. If the tools are reordered, only the system prompt is reused. If the system prompt starts with a timestamp, nothing is reused.</p>
</kv-prefix>
<figcaption><b>fig 5</b>The scan stops at the first token that differs. The cost line uses cache reads at 0.1× the base input price, Anthropic's rate, and ignores the one-off write.</figcaption>
</figure>

The two big providers expose it differently:

| | how you turn it on | minimum prefix | what a hit costs |
| --- | --- | --- | --- |
| OpenAI | automatic, on every request | 1,024 tokens | 50% to 90% off input, depends on the model |
| Anthropic | explicit `cache_control` breakpoints | 1,024 tokens on most models, more on some smaller ones | 0.1× the input price to read, 1.25× to write |

Both caches are short-lived. They expire after a few minutes without a hit (five by default on Anthropic, where each hit resets the timer), so they pay off for chat sessions, agents and batches of similar requests, and much less for one request a day.

The practical rule falls straight out of fig 5. Put everything static at the front (system prompt, tool definitions, few-shot examples) and everything that changes at the back. The classic mistake is a timestamp or a user name in the first line of the system prompt, which quietly turns every request into a cache miss.

## the code

Here's the core of it in PyTorch-flavoured pseudocode. The attention layer takes only the new tokens, plus whatever is in the cache, and hands back an updated cache:

```python
class AttentionWithKVCache:
    def forward(self, x, past_kv=None):
        # x holds only the NEW tokens: [batch, new_tokens, d_model]
        q = self.W_q(x)
        k_new, v_new = self.W_k(x), self.W_v(x)

        if past_kv is not None:
            past_k, past_v = past_kv
            k = torch.cat([past_k, k_new], dim=1)  # append to the cache
            v = torch.cat([past_v, v_new], dim=1)
        else:
            k, v = k_new, v_new  # first call: the whole prompt

        scores = q @ k.transpose(-2, -1) / sqrt(d)
        scores = apply_causal_mask(scores)  # needed when x has more than one token
        output = softmax(scores) @ v
        return output, (k, v)
```

And the two generation loops side by side. The only real difference is what goes in as `input_ids`:

```python
def generate_with_cache(model, prompt_ids, max_new_tokens=10):
    kv_cache, generated = None, prompt_ids.clone()
    for _ in range(max_new_tokens):
        # whole prompt on the first step, then just the last token
        input_ids = generated if kv_cache is None else generated[:, -1:]
        logits, kv_cache = model(input_ids, past_kv=kv_cache)
        next_token = logits[:, -1:].argmax(dim=-1)
        generated = torch.cat([generated, next_token], dim=1)
    return generated


def generate_naive(model, prompt_ids, max_new_tokens=10):
    generated = prompt_ids.clone()
    for _ in range(max_new_tokens):
        logits, _ = model(generated, past_kv=None)  # the whole sequence, every time
        next_token = logits[:, -1:].argmax(dim=-1)
        generated = torch.cat([generated, next_token], dim=1)
    return generated
```

That `logits[:, -1:]` matters in the cached version too: on the first call the model returns logits for every prompt position, and you only want the last one. My first version of this code forgot that.

The hand-drawn diagrams from the first version of this post still live on a [dim0 board](https://app.dim0.net/boards/1993fd21654f4333b65a42e0d046fec0), if you'd rather pan around them than scroll.
