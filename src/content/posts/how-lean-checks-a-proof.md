---
title: How Lean checks a proof
date: 2026-10-07
description: Lean is a programming language in which a theorem is a type and a proof is a program, checked by a small kernel. This post covers how that works, where it can still go wrong, and why it lets language models write proofs nobody has to read.
tags: [math, lean, ai]
category: ai
glyph: proof
figures: 4
---

OpenAI's [math release](/blog/openai-722-math-manuscripts/) came with 25.9 million lines of Lean. Nobody is going to read them, and mathematicians are still willing to trust the parts that pass Lean's checker, which is more than they'll give the PDFs.

Lean is a programming language and a proof assistant. Leonardo de Moura started it at Microsoft Research in 2013, Lean 4 came out in September 2023, and since July 2023 a non-profit, the [Lean FRO](https://lean-lang.org/fro/about/), has maintained it. Most of the mathematics written in Lean lives in Mathlib, a shared library that had 290,195 theorems and 137,930 definitions from 772 contributors when I checked its [stats page](https://leanprover-community.github.io/mathlib_stats.html) on 7 October.

## a statement is a type

Here is a statement from OpenAI's repo, the claim that five colours can't colour the plane:

```lean
def ProperColoring (colorCount : ℕ) (coloring : ℂ → Fin colorCount) : Prop :=
  ∀ point otherPoint : ℂ, ‖point - otherPoint‖ = 1 → coloring point ≠ coloring otherPoint

theorem no_proper_five_coloring : ¬ ∃ coloring : ℂ → Fin 5, ProperColoring 5 coloring := by
  sorry
```

The first line defines what a proper colouring is: a function from points (complex numbers) to `Fin 5`, the numbers 0 to 4, such that any two points at distance 1 get different values. The theorem says no such function exists.

In Lean that statement is a type, the same kind of thing as `Nat` or `String`. A proof of it is a value of that type. This idea is called propositions as types, or the Curry–Howard correspondence. It's easiest to see on small cases. A proof of "P and Q" is a pair, holding a proof of P and a proof of Q. A proof of "P implies Q" is a function that turns any proof of P into a proof of Q. `False` is a type with no values at all, so there's no way to build a proof of it. Checking a proof comes down to checking that a value has the type it claims, which is what a compiler's type checker already does.

## goals and tactics

Nobody writes those values by hand for real mathematics. You write tactics, commands that work backwards from what you want to prove. Lean shows the current goal, you apply a tactic, and the goal changes into whatever is still left to show.

```lean
example : 2 + 2 = 4 := rfl

theorem my_add_zero (n : Nat) : n + 0 = n := rfl

theorem my_zero_add (n : Nat) : 0 + n = n := by
  induction n with
  | zero => rfl
  | succ k ih => rw [← Nat.add_assoc, ih]
```

`rfl` says both sides compute to the same thing. That's enough for `2 + 2 = 4`, and for `n + 0 = n`, because Lean defines addition by recursion on its second argument, so `n + 0` reduces to `n` straight from the definition. `0 + n = n` looks just as obvious, but `0 + n` doesn't reduce when `n` is unknown, so the proof needs induction.

<figure class="wide">
<ln-goals data-fig data-label="fig 1 · goals">
<p class="fallback">The proof of 0 + n = n, one line at a time, with Lean's goal display under it. After "by" the goal is 0 + n = n with n a natural number. Induction splits it in two: the base case 0 + 0 = 0, and the step case 0 + (k + 1) = k + 1 with the hypothesis ih : 0 + k = k. rfl closes the base case. Rewriting with Nat.add_assoc turns the step goal into 0 + k + 1 = k + 1, and rewriting with ih turns it into k + 1 = k + 1, which closes. The display ends with "No goals".</p>
</ln-goals>
<figcaption><b>fig 1</b>Each tactic turns the goal into smaller goals until none are left. <span class="m">The goal text follows Lean 4's infoview. Case names and spacing differ a little between versions.</span></figcaption>
</figure>

## the kernel

Tactics can be large and clever. `simp` rewrites with thousands of lemmas, `omega` decides linear arithmetic over the integers, and an LLM can produce tactics too. None of them has to be trusted. A component called the elaborator turns whatever they produce into an explicit proof term, and a small kernel checks that term against the statement. If a tactic has a bug, the worst it can do is fail to find a proof, because whatever it produces still has to get past the kernel.

The other thing to trust is the axioms. Standard Lean uses three, `propext`, `Quot.sound` and `Classical.choice`, and `#print axioms my_theorem` lists every axiom a theorem depends on. That's how the two escape hatches get caught. `sorry` closes any goal so unfinished work still compiles, and it shows up in the list as `sorryAx`. `native_decide` runs compiled code to settle a computation, which means trusting the compiler too, and it adds `Lean.ofReduceBool`.

<figure class="wide">
<ln-kernel data-fig data-label="fig 2 · the kernel">
<p class="fallback">Six candidate proofs arrive from different sources at a narrow kernel. "2 + 2 = 4 by rfl" from a person is accepted. "2 + 2 = 5 by rfl" from an LLM is rejected because 4 is not 5. "17 * 3 = 51 by decide" from a tactic is accepted. A five-colouring proof by sorry from an agent is rejected because it uses sorryAx. "2 ^ 10 = 1024 by native_decide" is rejected because it uses Lean.ofReduceBool. "12 - 15 = 0 by rfl" is accepted, because subtraction on natural numbers stops at 0. In the end three are accepted and three rejected.</p>
</ln-kernel>
<figcaption><b>fig 2</b>The kernel judges the proof term, whoever wrote it. <span class="m">The kernel in this figure is a stand-in. It evaluates small arithmetic and refuses sorry and any axiom outside the standard three. Lean's real kernel type-checks the whole proof term.</span></figcaption>
</figure>

The OpenAI repo automates this with [comparator](https://github.com/leanprover/comparator). Each challenge file holds a statement with `sorry` as its proof, plus a JSON file naming the solution and the allowed axioms. Comparator checks that the solution proves exactly that statement and uses nothing beyond the three axioms. The repo has 405 such challenges. The statement files add up to 89,411 lines, and the proofs to about 25.9 million.

## proving the wrong thing

Lean checks that a proof proves the statement. It can't check that the statement says what you meant, and that's where formal proofs still go wrong.

One common way in is junk values. Every function in Lean has to return something for every input, so some inputs get conventional answers. On natural numbers, `3 - 5` is `0`. On the reals, `x / 0` is `0`, and so is `0⁻¹`. These conventions make many lemmas simpler to state, and they also let a statement that reads correctly mean something slightly different.

<figure class="wide">
<ln-junk data-fig data-label="fig 3 · junk values">
<p class="fallback">Three statements evaluated at eight inputs using Lean's conventions. "For all natural n, n - 1 + 1 = n" holds for n from 1 to 7 and fails at n = 0, because Lean's 0 - 1 is 0. "For all real x, x / x = 1" holds everywhere except x = 0, where Lean's 0 / 0 is 0. "For all natural n, (n : ℝ)⁻¹ ≤ 1" holds at every input, but at n = 0 only because Lean defines 0⁻¹ as 0.</p>
</ln-junk>
<figcaption><b>fig 3</b>In each statement the answer at 0 comes from one of Lean's conventions. <span class="m">The figure computes each side with Lean's rules for natural subtraction, division by zero and inverses.</span></figcaption>
</figure>

The Erdős challenge in OpenAI's repo uses this on purpose. It defines the term for n as `(n : ℝ)⁻¹` when n is in the set and 0 otherwise, and since `0⁻¹ = 0`, putting 0 in the set changes nothing. That one is harmless. The more serious cases in the repo are about scope and definitions. The challenge for Hilbert's sixteenth problem covers quintic Liénard systems, while the paper claims a bound for polynomial systems of every degree. The free group factor challenge defines the factors from scratch inside the challenge file, because Mathlib doesn't have them yet, so the proof only means something once an expert has checked those definitions.

When Anthropic [announced](https://www.anthropic.com/news/formalizing-fermats-last-theorem) a Lean proof of Fermat's Last Theorem in September, Kevin Buzzard checked it this way. He compiled it himself, confirmed there was no `sorry`, confirmed it used only the three standard axioms, and compared its statement with the one already in Mathlib. Comparator automates the first three steps. The last one still needs a person.

## from liquid tensors to fermat

The big Lean projects have grown quickly, and the people doing the work have changed.

- 2022: the [Liquid Tensor Experiment](https://github.com/leanprover-community/lean-liquid) finished on 14 July, checking a theorem of Dustin Clausen and Peter Scholze. Scholze had asked for it because he wasn't sure of one part of the proof himself.
- 2023: Gowers, Green, Manners and Tao proved the polynomial Freiman–Ruzsa conjecture in November, and a project led by Tao [formalized it](https://github.com/teorth/pfr) soon after.
- 2025: the [Equational Theories Project](https://arxiv.org/html/2512.07087v2) settled all 22,028,942 implications between 4,694 laws for a single binary operation, each one checked in Lean.
- 2026: Claude agents produced a complete Lean proof of Fermat's Last Theorem in 11 days, about 13 million lines and 29,500 intermediate theorems. Buzzard's own human-led FLT project had funding until 2029.

The Lean FRO now plans six months at a time instead of a year, because [the field](https://lean-lang.org/fro/roadmap/y4-1) "is changing too quickly."

## why a checker helps a language model

A language model writing prose proofs makes mistakes that are hard to spot, and somebody has to read every line to find them. In Lean the kernel answers yes or no, and the answer costs almost nothing.

That yes or no works as a training reward. DeepSeek-Prover-V2 was trained with reinforcement learning against exactly that signal, and in April 2025 it [reached 88.9%](https://arxiv.org/pdf/2504.21801) on miniF2F, a set of competition problems stated in Lean.

It also lets a model try many times and keep only what passes. If one attempt succeeds 2% of the time, the chance that at least one of 128 attempts succeeds is about 92%, and the checker tells you which one it was.

<figure class="wide">
<ln-sample data-fig data-label="fig 4 · many attempts">
<p class="fallback">A grid of up to 256 proof attempts, each passing the checker with probability p, next to a curve of the chance that at least one of k attempts passes, 1 − (1 − p)^k, on a log scale for k. With p = 2% and 32 attempts the chance is 47.6%; with 256 attempts it is above 99%. Sliders set p from 0.5% to 20% and k from 1 to 256, and the grid shows one random draw.</p>
</ln-sample>
<figcaption><b>fig 4</b>At 2% per attempt, 32 attempts give about even odds and 256 give over 99%. <span class="m">The curve is 1 − (1 − p)^k, which assumes attempts are independent. Real attempts from one model are correlated, so treat it as an upper bound.</span></figcaption>
</figure>

Long proofs get split up with `sorry`. An agent can break a theorem into lemmas, leave each one stubbed, and hand them out to be proved separately, and the checker confirms both the pieces and how they fit together. Large formalization projects, human or machine, are organised around a plan of lemmas like this, usually called a blueprint.

The competition benchmarks show how fast this has gone. AlphaProof reached silver-medal level at the 2024 International Mathematical Olympiad with Lean proofs. Harmonic's Aristotle [proved 5 of the 6](https://www.alphaxiv.org/abs/2510.01346) 2025 problems in Lean. On PutnamBench, 672 problems from the Putnam competition, DeepSeek-Prover-V2 solved 49 in April 2025, Seed-Prover 1.5 [reported 88%](https://arxiv.org/abs/2512.17260) that December, and in May 2026 Logical Intelligence [reported](https://logicalintelligence.com/blog/aleph-prover-tops-leading-benchmarks) 668 of 672 for its Aleph Prover. That last number comes from the vendor, and the benchmark had 658 problems when DeepSeek ran it. OpenAI's README says it moved to open problems after its "existing mathematical evaluations saturated."

None of this checks the statement. Mathlib still lacks definitions for whole areas, which is why only 7 of OpenAI's 36 algebraic geometry families have Lean statements at all. For the 235 families that do, a person still has to read 89,411 lines of statements and agree that each one says what the paper says.
