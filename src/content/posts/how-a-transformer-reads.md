---
title: How a transformer reads
date: 2026-10-03
description: Every chatbot you've talked to runs one small question in a loop, what comes next? This is the machine that answers it, taken apart one moving piece at a time.
tags: [ai, llm, transformers]
category: ai
glyph: attention
figures: 9
featured: true
---

Give a language model some text and it gives you back exactly one thing: a guess for the next token, written as a list of probabilities. That's the whole interface. Chat, code completion, translation, all of it is this guess, made over and over, with each answer fed back in as input.

<figure class="wide">
<tf-next data-fig data-label="fig 1 · next token">
<p class="fallback">Three prompts are typed one after another: "the cat sat on the", "to be or not to", "the capital of france is". After each, a bar chart shows the model's top five guesses. "mat" gets 41%, "be" gets 93%, "paris" gets 88%, and the winner drops into the blank.</p>
</tf-next>
<figcaption><b>fig 1</b>The only question a language model answers. The numbers are made up, but the shape is the usual one: one or two likely answers, then a long tail.</figcaption>
</figure>

The machine that makes the guess is a **transformer**, from the 2017 paper [Attention Is All You Need](https://arxiv.org/abs/1706.03762). It does four things in order. It turns text into numbers, lets those numbers look at each other, lets each one think about what it saw, and turns the result back into a guess. We'll follow one sentence all the way through.

## text becomes tokens

Models don't see letters, and they don't quite see words either. They see **tokens**: chunks from a fixed vocabulary, picked before training because they show up a lot. A common word gets a single token. A rare one gets chopped into pieces. GPT-2's vocabulary has 50,257 of them, and a token is just a position in that list.

<figure class="wide">
<tf-tokens data-fig data-label="fig 2 · tokenizer">
<p class="fallback">The sentence "Transformers don't read words." splits into seven tokens: "Transform", "ers", " don", "'t", " read", " words", ".". Each gets a numeric id, and each becomes a small pixel critter.</p>
</tf-tokens>
<figcaption><b>fig 2</b>One sentence, seven tokens. The dots are spaces, and they belong to the token after them. The ids are illustrative.</figcaption>
</figure>

From here on, a token is one of those critters. Each one carries a list of numbers up through the model, and at the very top, the last critter's numbers turn into the guess.

## tokens become places

An id is only a row number. The first layer of the model is a big table with one row per token in the vocabulary, and each row is a list of numbers, 768 of them in GPT-2 small. That list is the token's **embedding**.

Nobody writes these numbers by hand. They start random and get nudged during training, billions of times, until tokens that get used the same way end up with similar numbers. Squash the 768 dimensions down to two and you can see what happened: a map where distance means difference in meaning.

<figure class="wide">
<tf-embed data-fig data-label="fig 3 · embeddings">
<p class="fallback">The row for "cat" is looked up in an embedding table and becomes a vector. On a 2D map, animals cluster together, as do verbs and numbers. The arrow from "man" to "woman" runs parallel to the arrow from "king" to "queen".</p>
</tf-embed>
<figcaption><b>fig 3</b>Looking up <code>cat</code>, then placing it on a map. The layout is my sketch of what real embeddings do; the real ones live in hundreds of dimensions.</figcaption>
</figure>

The famous party trick: the step from *man* to *woman* points roughly the same way as the step from *king* to *queen*. Directions in this space carry meaning. It's never exact, but it's a good way to hold everything that comes next in your head, because from here on the model is doing geometry on meanings.

## where am I?

There's a catch. The next part of the model, attention, treats its input like a bag of tokens. Shuffle them and each one gets exactly the same result, so *dog bites man* and *man bites dog* would look identical.

The original paper fixes this by adding a position signal to every embedding: a stack of sine waves at different speeds, read off at the token's position. Fast waves tell neighbours apart. Slow waves tell the start of a long text from its end. Together they give every position its own fingerprint.<span class="sn">Most recent models use RoPE instead, which rotates the query and key vectors by an angle that depends on position. Same idea, position turns into geometry.</span>

<figure class="wide">
<tf-position data-fig data-label="fig 4 · position">
<p class="fallback">Eight sine waves of decreasing frequency are stacked vertically across 64 positions. A marker sweeps across the positions; at each one, the eight wave values are read off into a column that forms that position's vector.</p>
</tf-position>
<figcaption><b>fig 4</b>A position's vector is a vertical slice through the waves. This is the real formula, with base 100 instead of 10,000 so the slow waves actually move on screen.</figcaption>
</figure>

## looking around

Now for the good part. Each token has its own vector, but a word on its own doesn't say much. *it* could be anything. To work out what *it* means, the token has to look at the rest of the sentence and decide which other tokens matter.

That's **attention**. Every token gets a budget of 100% to spend across the tokens it can see, and where it spends that budget decides what it learns from them.<span class="sn">This example looks both ways, like the encoder in the original paper. GPT-style models only look backwards. More on that in "many ways of looking".</span>

<figure class="wide">
<tf-attention data-fig data-label="fig 5 · attention">
<p class="fallback">The sentence "the animal didn't cross the street because it was too tired" with arcs from "it" to every other word. Most of the weight goes to "animal". Change the last word to "wide" and most of the weight moves to "street".</p>
</tf-attention>
<figcaption><b>fig 5</b>Click any word to see where it looks. Flip the last word and watch <code>it</code> change its mind. I tuned these weights by hand to show the effect; real heads learn theirs.</figcaption>
</figure>

## the math, slowly

So how does a token decide where to look? It turns its vector into three smaller ones:

<dl>
<dt>query</dt><dd>what am I looking for?</dd>
<dt>key</dt><dd>what do I have to offer?</dd>
<dt>value</dt><dd>what do I hand over if you pick me?</dd>
</dl>

Each is the embedding multiplied by a learned matrix: `W_Q`, `W_K` and `W_V`. Then, for one token:

1. Dot its query with every key. The result is big when the two point the same way.
2. Divide by `√d` to keep the numbers tame, then softmax so they add up to 1.
3. Take the weighted sum of the values.

That sum is the token's new vector. It's all multiplication and addition, which is why a GPU can do it for every token at once.

<figure class="wide">
<tf-qkv data-fig data-label="fig 6 · one query">
<p class="fallback">Three tokens, "the", "cat" and "sat", each with a query, key and value vector of size four. The query of "sat" is dotted with each key, giving scores of -0.22, 3.02 and 1.04. After scaling and softmax the weights are 13%, 64% and 24%. The values are scaled by those weights and summed into a new vector for "sat".</p>
</tf-qkv>
<figcaption><b>fig 6</b>One query, worked through with real numbers (d = 4). Green cells are positive, ochre ones negative.</figcaption>
</figure>

```
attention(Q, K, V) = softmax(Q·Kᵀ / √d) · V
```

## many ways of looking

One attention pattern can only ask one question at a time, so each layer runs several in parallel. They're called **heads**, and each has its own `W_Q`, `W_K` and `W_V`. GPT-3 has 96 per layer. Nobody tells them what to look for, yet some end up with patterns you can put a name on.

These grids also show the rule GPT-style models follow: a token can only attend to itself and to what came before it. The hatched triangle is the future, masked out. That rule is what lets the model learn from every position of a text at once during training, and then write it one token at a time.

<figure class="wide">
<tf-heads data-fig data-label="fig 7 · heads">
<p class="fallback">Four 8 by 8 attention grids for "the cat sat on the mat and slept", each with its upper triangle masked. One head looks at the previous token, one finds an earlier copy of the same word, one rests on the first token, and one links verbs back to "cat".</p>
</tf-heads>
<figcaption><b>fig 7</b>Four heads, one sentence. Each row is one token spending its budget, and darker means more attention. These are tidied-up versions of patterns people have found in real models.</figcaption>
</figure>

## the stream

Attention is where tokens talk to each other. Right after it, each token goes through a small two-layer network on its own, the **MLP**. Most of the parameters live there, and it's where each token chews on what it just heard.

Neither block replaces the token's vector. Each one reads from it, computes a change, and adds the change back. That running vector is called the **residual stream**, and if I had to keep a single picture of a transformer it would be this one: one lane per token, flowing upward, with blocks along the way that read from it and write to it.<span class="sn">Each block also normalises its input first (layer norm), which keeps the numbers in range. The figure leaves it out.</span>

<figure class="wide">
<tf-block data-fig data-label="fig 8 · residual stream">
<p class="fallback">One token's vector travels up a vertical lane through three layers. At each layer a copy branches left into attention, which reads from the other tokens' lanes, and the result is added back. Then a copy branches right into the MLP, and that result is added back too.</p>
</tf-block>
<figcaption><b>fig 8</b>One token's trip up the residual stream. The faint lanes on the left are the other tokens, and attention is the only place the lanes touch. GPT-3 stacks 96 of these layers.</figcaption>
</figure>

## picking a word

At the top, the last token's vector gets multiplied by one more matrix, with a row for every token in the vocabulary. Out come raw scores called logits. Softmax turns them into probabilities, and we're back at figure 1.

The model never picks the next word itself. Something outside it does, by **sampling** from those probabilities, and temperature decides how. Low temperature sharpens the distribution toward the top choice. High temperature flattens it until the cat explodes.

<figure class="wide">
<tf-sample data-fig data-label="fig 9 · sampling">
<p class="fallback">A sentence starting "the cat" grows one token at a time. For each step, a bar chart shows the candidate next tokens and a dart lands on a strip divided by probability, choosing the next word. A temperature slider reshapes the probabilities.</p>
</tf-sample>
<figcaption><b>fig 9</b>Sampling, for real. The candidates come from a small hand-written table rather than a model, but the softmax, the temperature and the random draw are the real thing.</figcaption>
</figure>

Then the chosen token gets appended and the whole thing runs again from the bottom. That's generation: one full pass through the model per token. It's also why long answers are slow, and why tricks like [KV caching](/blog/kv-caching-explained) exist.

## what I left out

Training, mostly. Every matrix above starts random, and predicting the next token over a very large pile of text is what shapes them. I also skipped the fiddly parts (layer norm, the exact MLP shape, how the heads get recombined) and everything that makes it fast in production, like KV caching, batching and fused attention kernels.

The shape stays the one you've seen though. Tokens become vectors, the vectors look at each other, think for a bit, and vote on the next token. Then it all happens again.
