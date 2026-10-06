---
title: How a transformer reads
date: 2026-10-03
description: A walk through the parts of a transformer, from tokens to sampling, with a working figure for each step.
tags: [ai, llm, transformers]
category: ai
glyph: attention
figures: 9
featured: true
---

A language model takes text and returns a list of probabilities for the next token. A chatbot reply is that guess repeated, with each chosen token appended to the text before the next guess.

<figure class="wide">
<tf-next data-fig data-label="fig 1 · next token">
<p class="fallback">Three prompts are typed one after another: "the cat sat on the", "to be or not to", "the capital of france is". After each, a bar chart shows the model's top five guesses. "mat" gets 41%, "be" gets 93%, "paris" gets 88%, and the winner drops into the blank.</p>
</tf-next>
<figcaption><b>fig 1</b>Three prompts and their top five next tokens. I made the numbers up, but real outputs usually look like this, with one or two likely tokens and a long tail.</figcaption>
</figure>

The model that produces the guess is a **transformer**, described in the 2017 paper [Attention Is All You Need](https://arxiv.org/abs/1706.03762). This post goes through its parts in the order the text passes through them, using a few short sentences as examples.

## text becomes tokens

A model reads **tokens**, chunks of text from a fixed vocabulary that is chosen before training based on how often each chunk appears. Common words usually get one token each and rare words get split into several. GPT-2's vocabulary has 50,257 tokens, and the model only ever sees a token's position in that list.

<figure class="wide">
<tf-tokens data-fig data-label="fig 2 · tokenizer">
<p class="fallback">The sentence "Transformers don't read words." splits into seven tokens: "Transform", "ers", " don", "'t", " read", " words", ".". Each gets a numeric id, and each becomes a small pixel critter.</p>
</tf-tokens>
<figcaption><b>fig 2</b>The sentence splits into seven tokens. The dots stand for spaces, which attach to the token after them. The ids are illustrative.</figcaption>
</figure>

In the rest of the figures each critter is a token. It carries a list of numbers up through the model, and at the top the last token's numbers become the guess.

## tokens become places

The first layer of the model is a table with one row per vocabulary token. The token id picks a row, and that row, a list of 768 numbers in GPT-2 small, is the token's **embedding**.

The numbers start random and training adjusts them billions of times, until tokens used in similar contexts have similar rows. Projected down to two dimensions, related words land near each other.

<figure class="wide">
<tf-embed data-fig data-label="fig 3 · embeddings">
<p class="fallback">The row for "cat" is looked up in an embedding table and becomes a vector. On a 2D map, animals cluster together, as do verbs and numbers. The arrow from "man" to "woman" runs parallel to the arrow from "king" to "queen".</p>
</tf-embed>
<figcaption><b>fig 3</b>Looking up <code>cat</code> and placing it on a 2D map. I drew the layout by hand to show the kind of structure real embeddings have in hundreds of dimensions.</figcaption>
</figure>

The example everyone quotes is that the step from *man* to *woman* points roughly the same way as the step from *king* to *queen*. In real models it only holds approximately, but some directions in this space do line up with differences in meaning.

## word order

Attention, the next step, doesn't know the order of its inputs. If you shuffle the tokens, each one gets the same result, so *dog bites man* and *man bites dog* would look identical to it.

The original paper adds a position signal to every embedding. The signal is a set of sine and cosine waves at different frequencies, each sampled at the token's position. The fast waves change between neighbouring tokens and the slow ones change over the length of the text, so every position gets a different combination of values.<span class="sn">Most recent models use RoPE instead. It rotates the query and key vectors by an angle that depends on the token's position.</span>

<figure class="wide">
<tf-position data-fig data-label="fig 4 · position">
<p class="fallback">Eight waves are stacked vertically across 64 positions: four frequencies, each as a sine and a cosine, from fast to slow. A marker sweeps across the positions; at each one, the eight wave values are read off into a column that forms that position's vector.</p>
</tf-position>
<figcaption><b>fig 4</b>A position's vector is a vertical slice through the waves. This is the real formula, with base 100 instead of 10,000 so the slow waves visibly change across 64 positions.</figcaption>
</figure>

## attention

So far each token's vector was built without looking at its neighbours. For a word like *it* that isn't enough, because its meaning depends on what it refers to.

**Attention** lets each token take information from the other tokens it can see. Every token splits a budget of 100% across them and receives a mix of their information in those proportions.<span class="sn">This example looks in both directions, like the encoder in the original paper. GPT-style models only look backwards, which comes up again in the section on heads.</span>

<figure class="wide">
<tf-attention data-fig data-label="fig 5 · attention">
<p class="fallback">The sentence "the animal didn't cross the street because it was too tired" with arcs from "it" to every other word. Most of the weight goes to "animal". Change the last word to "wide" and most of the weight moves to "street".</p>
</tf-attention>
<figcaption><b>fig 5</b>Click any word to see its weights. Changing the last word to <code>wide</code> moves most of the weight on <code>it</code> from <code>animal</code> to <code>street</code>. I set these weights by hand, and real heads learn theirs.</figcaption>
</figure>

## computing the weights

To get those weights, each token makes three smaller vectors from its embedding:

<dl>
<dt>query</dt><dd>describes what the token is looking for</dd>
<dt>key</dt><dd>describes what the token contains, for other tokens' queries to match against</dd>
<dt>value</dt><dd>the information the token passes on when another token attends to it</dd>
</dl>

Each one is the embedding multiplied by a learned matrix, `W_Q`, `W_K` or `W_V`. For one token, attention then goes like this:

1. Dot its query with every key. The result is big when the two point the same way.
2. Divide by `√d` to keep the numbers small, then apply softmax so they add up to 1.
3. Take the weighted sum of the values.

That sum becomes the token's new vector. The whole computation is matrix multiplication, so a GPU can do it for all tokens in parallel.

<figure class="wide">
<tf-qkv data-fig data-label="fig 6 · one query">
<p class="fallback">Three tokens, "the", "cat" and "sat", each with a query, key and value vector of size four. The query of "sat" is dotted with each key, giving scores of -0.22, 3.02 and 1.04. After scaling and softmax the weights are 12.6%, 63.7% and 23.7%. The values are scaled by those weights and summed into a new vector for "sat".</p>
</tf-qkv>
<figcaption><b>fig 6</b>One query, worked through with real numbers (d = 4). Green cells are positive, ochre ones negative.</figcaption>
</figure>

```
attention(Q, K, V) = softmax(Q·Kᵀ / √d) · V
```

## heads

One set of attention weights can follow only one kind of relationship, so each layer runs several attention computations side by side. These are the **heads**, each with its own `W_Q`, `W_K` and `W_V`, and GPT-3 has 96 of them per layer. Their roles aren't assigned in advance. Researchers looking inside trained models have found heads with recognisable jobs, like attending to the previous token or to an earlier copy of the current word.

The grids below also show the mask that GPT-style models use. A token can attend to itself and to earlier tokens, and the hatched triangle of later tokens is blocked. With the mask, training can score the prediction at every position of a text in one pass, and generation still works one token at a time.

<figure class="wide">
<tf-heads data-fig data-label="fig 7 · heads">
<p class="fallback">Four 8 by 8 attention grids for "the cat sat on the mat and slept", each with its upper triangle masked. One head looks at the previous token, one finds an earlier copy of the same word, one rests on the first token, and one links verbs back to "cat".</p>
</tf-heads>
<figcaption><b>fig 7</b>Four heads on the same sentence. Each row is one token's budget, and darker cells mean more attention. These are cleaned-up versions of patterns found in real models.</figcaption>
</figure>

## the residual stream

After attention, each token goes through a small two-layer network called the **MLP**, which processes every token separately. Most of a transformer's parameters are in these MLPs.

Attention and the MLP don't replace the token's vector. Each computes a change and adds it to the vector, and the vector that collects all these changes is called the **residual stream**. It's the picture of the model I find most useful: one lane per token running upward, with attention and MLP blocks that read from the lanes and add to them.<span class="sn">Each block also normalises its input first (layer norm) to keep the numbers in range. The figure leaves it out.</span>

<figure class="wide">
<tf-block data-fig data-label="fig 8 · residual stream">
<p class="fallback">One token's vector travels up a vertical lane through three layers. At each layer a copy branches left into attention, which reads from the other tokens' lanes, and the result is added back. Then a copy branches right into the MLP, and that result is added back too.</p>
</tf-block>
<figcaption><b>fig 8</b>One token's vector going up the residual stream. The faint lanes on the left are the other tokens, and attention is the only step that reads across lanes. GPT-3 stacks 96 of these layers.</figcaption>
</figure>

## sampling

At the top, the last token's vector is multiplied by one more matrix, which has a row for every vocabulary token. That gives one raw score per token, called a logit, and softmax turns the logits into the probabilities from figure 1.

Code outside the model then picks a token from those probabilities. This is **sampling**, and temperature controls it. A temperature below 1 sharpens the distribution toward the top token. Above 1 it flattens the distribution, so unlikely tokens get picked more often and the text drifts off topic.

<figure class="wide">
<tf-sample data-fig data-label="fig 9 · sampling">
<p class="fallback">A sentence starting "the cat" grows one token at a time. For each step, a bar chart shows the candidate next tokens and a dart lands on a strip divided by probability, choosing the next word. A temperature slider reshapes the probabilities.</p>
</tf-sample>
<figcaption><b>fig 9</b>Sampling with a small hand-written table of candidates in place of a model. The softmax, temperature and random draw work the same way they do in a real model.</figcaption>
</figure>

The chosen token is appended to the text, and the text goes through the whole model again. Each new token costs a full pass, which is why long answers take a while and why [KV caching](/blog/kv-caching-explained/) keeps work from earlier passes to reuse.

## what I left out

I skipped training. Every matrix in this post starts random and gets its values from predicting the next token over a large amount of text.

I also left out the details of layer norm, the exact MLP shape and how the outputs of the heads are combined. The production speedups are missing too, including KV caching, batching and fused attention kernels.
