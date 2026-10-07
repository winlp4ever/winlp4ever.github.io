---
title: OpenAI's 722 math manuscripts
date: 2026-10-07
description: On 6 October OpenAI published 722 machine-written math papers with claims on the Unique Games Conjecture, the colouring of the plane, a $5,000 Erdős problem and dozens of other open problems. This post goes through the claims, the parts that come with Lean proofs, and the first day of reactions.
tags: [ai, math, lean]
category: ai
glyph: graph
figures: 5
---

On the afternoon of 6 October, Pacific time, OpenAI pushed a repository called [openai/math](https://github.com/openai/math) to GitHub and posted "Sharing AI progress in mathematics" on its blog. The repo holds 722 manuscripts, sorted into 372 groups that OpenAI calls result families, and every paper lists a single author, "OpenAI". According to the README, an unreleased internal model was given about 4,000 problems and spent an average of three hours of "ChatGPT Pro thinking compute" on each result.

The claims include the Unique Games Conjecture, a negative answer to Hilbert's tenth problem over the rationals, a $5,000 Erdős problem about arithmetic progressions, and a proof that five colours can't colour the plane. Close to two thirds of the families come with a theorem statement in Lean, a language in which a computer checks every step of a proof. The rest are PDFs, and the README says "some of the unformalized results could have issues."

I cloned the repo the next morning and counted. Unless a link says otherwise, every number below comes from that clone, at commit `adc7f1241`. Wording from OpenAI's blog post is as quoted in press coverage, because openai.com refused my requests.

## the repo

It's one commit, made by "Anonymous" at 14:58 Pacific time, with no earlier history and an Apache 2.0 licence. Inside:

- `preprints/`: 722 folders, each with a PDF, its LaTeX source and a BibTeX entry
- `overview.pdf` and `CONTENTS.md`: a summary of each family
- `reasoning_traces/`: abridged summaries of the model's reasoning for 10 families
- `lean/`: 121,734 Lean files, about 25.9 million lines, on Lean 4.34.1 and a pinned Mathlib

The manuscripts are dated between 23 September and 6 October, and 370 of them carry the dates 23 or 24 September. Family numbers run from 001 to 377 with five gaps, which the repo doesn't explain.

The families cover 17 fields. Theoretical computer science has the most with 40, then combinatorics with 37, algebraic and complex geometry with 36 and number theory with 31. Erdős problems, which were most of last year's AI math news, appear in six family titles.

<figure class="wide">
<om-fields data-fig data-label="fig 1 · families per field">
<p class="fallback">A bar chart of the 372 result families across 17 fields, each bar split into families with a Lean statement and families without one. Theoretical computer science: 32 of 40 have one. Combinatorics: 33 of 37. Algebraic and complex geometry: 7 of 36. Number theory: 16 of 31. Probability: 19 of 29. Differential geometry: 15 of 29. Mathematical physics: 17 of 25. Operator algebras: 14 of 19. Algebra: 9 of 18. Topology: 3 of 18. Analysis: 9 of 16. PDE: 11 of 16. Convex geometry: 13 of 15. Group theory: 12 of 14. Dynamical systems: 9 of 12. Functional analysis: 10 of 11. Logic: 6 of 6. In total 235 of 372 families have one.</p>
</om-fields>
<figcaption><b>fig 1</b>Combinatorics and theoretical CS are almost fully covered by Lean statements. Algebraic geometry (7 of 36) and topology (3 of 18) mostly aren't. <span class="m">Counted from the Lean links in CONTENTS.md, which match the 235 scope notes in lean/docs/.</span></figcaption>
</figure>

My guess for the gap is Mathlib, the shared library of formal math that these proofs build on. It has far more combinatorics than algebraic geometry, and a proof can only use definitions that exist. The free group factor challenge, for example, builds its own definitions inside the challenge file.

## the claims

These are some of the best-known names in the catalogue. The "claim" column is OpenAI's wording, shortened. The Lean column says whether the family has a challenge statement, and the notes say where that statement is narrower than the headline.

| # | problem | claim | Lean |
|---|---|---|---|
| 102 | Unique Games Conjecture | proved | yes |
| 158 | chromatic number of the plane | at least 6, so 6 or 7 | yes |
| 165 | Turán's brick factory, Harary–Hill | both formulas exact for every size | yes |
| 159 | Erdős #3, $5,000 prize | proved | reciprocal-sum version |
| 156 | Borsuk's conjecture | fails in dimension 9 (previous record 63) | yes |
| 155 | periodic tiling conjecture | fails in dimension 3 | yes |
| 180 | Barnette's conjecture | proved | yes |
| 017 | irrationality exponent of π | exactly 2 | without the Flint Hills part |
| 005 | Catalan's constant | irrational | yes |
| 287 | free group factors | all isomorphic | yes, custom definitions |
| 003 | "quasi-Riemann hypothesis" | no zeros of any Dirichlet L-function with real part above 7/8 | poles at s = 1 excluded |
| 143 | Hilbert's 16th, uniform bound | a uniform bound for each degree | quintic Liénard systems only |
| 004 | Hilbert's tenth over ℚ | undecidable | no |
| 002 | Birch and Swinnerton-Dyer | full formula in Selmer corank 0 and 1 | no |
| 304 | Hilbert–Smith conjecture | proved in every dimension | no |

Some of the names promise more than the results. The quasi-Riemann hypothesis would be a big result in number theory, but the Riemann Hypothesis itself needs the line at 1/2, and 7/8 is a different statement. Heilbronn's triangle problem (191) was disproved in 1982, so that family claims a better bound. Hong Wang and Joshua Zahl proved the three-dimensional Kakeya conjecture in 2025, and family 074 is the stronger maximal version. The only Navier–Stokes entry, 376, shows that forced fluid flows can simulate a Turing machine. It has nothing to do with the Millennium Prize claim OpenAI made in September, which isn't in this catalogue. And the integer multiplication result (109) improves the best known running time by a factor of (log n) to the power 2<sup>−182</sup>, which a Hacker News commenter [wrote out](https://news.ycombinator.com/item?id=49986657) as a 55-digit fraction.

## five colours aren't enough

Paint every point of an infinite flat sheet, with one rule: two points exactly 1 cm apart must get different colours. Edward Nelson asked in 1950 how many colours that takes. John Isbell found a pattern of hexagons in seven colours that always works. If each hexagon is a bit less than 1 cm across, the two ends of a 1 cm stick can never land on the same colour.

The lower bound is the hard side. For it you need a finite set of points that no small palette can handle. The Moser spindle has 7 points and 11 sticks of length 1, and none of the 2,187 ways to give it three colours avoids a same-coloured stick, so the answer is at least 4. In 2018 Aubrey de Grey built a 1,581-point graph that forces 5. The answer has sat between 5 and 7 since then.

<figure class="wide">
<om-plane data-fig data-label="fig 2 · colouring the plane">
<p class="fallback">On the left, a tiling of hexagons in seven shades, numbered 1 to 7. A stick of length 1 moves and turns across it; the hexagons under its two ends are outlined, and a readout shows that the two ends are always on different colours. On the right, the Moser spindle appears: 7 points and 11 unit sticks. The figure counts its colourings: 0 of the 2,187 colourings with three colours work, and 384 colourings with four colours do. Below it, a number line from 1 to 7 shows the known range for the chromatic number of the plane narrowing: 1 to 7 before 1950, 4 to 7 from 1950, 5 to 7 from 2018, and 6 to 7 under OpenAI's 2026 claim.</p>
</om-plane>
<figcaption><b>fig 2</b>Seven colours are enough, and the spindle shows three aren't. <span class="m">The figure checks the stick's two ends against the tiling every frame (hexagon size 0.45 of the stick) and counts the spindle's colourings by brute force.</span></figcaption>
</figure>

Family 158 says that "every coloring of the Euclidean plane with five colors has a monochromatic unit-distance pair," so the answer is 6 or 7. The Lean challenge for it is short enough to quote whole:

```lean
def ProperColoring (colorCount : ℕ) (coloring : ℂ → Fin colorCount) : Prop :=
  ∀ point otherPoint : ℂ, ‖point - otherPoint‖ = 1 → coloring point ≠ coloring otherPoint

theorem no_proper_five_coloring : ¬ ∃ coloring : ℂ → Fin 5, ProperColoring 5 coloring := by
  sorry
```

Points are complex numbers, a colouring gives each point one of five colours, and the theorem says no such colouring keeps every unit-distance pair apart. You can check that against the English in a minute, without reading the proof. The `sorry` is where the proof goes. The repo's solution file fills it, and a checker called comparator confirms the filled-in proof matches this exact statement. The [Lean post](/blog/how-lean-checks-a-proof/) goes through how that works.

## the brick factory

In 1944 Pál Turán was in a Hungarian labour camp, pushing carts of bricks from kilns to storage yards. Every kiln had a track to every yard, and the carts jumped the rails where two tracks crossed. He wanted to know the fewest crossings any layout could have.

Kazimierz Zarankiewicz published a drawing in 1954. Put the kilns on a horizontal line and the yards on a vertical one, half on each side of the centre, and draw every track straight. That drawing has ⌊m/2⌋⌊(m−1)/2⌋⌊n/2⌋⌊(n−1)/2⌋ crossings for m kilns and n yards. He also gave a proof that no drawing does better, and the proof had a gap. Since then the formula has been proved only for small cases, with Daniel Kleitman's 1970 proof for up to six kilns as the main one.

<figure class="wide">
<om-brick data-fig data-label="fig 3 · the brick factory">
<p class="fallback">Kilns (squares) and storage yards (circles), with a straight track from every kiln to every yard. The reader can pick the size (3 by 3 up to 6 by 6, and 5 by 7) and switch between a scrambled layout and Zarankiewicz's drawing; the figure counts the crossings in the current drawing and marks each one. For 5 by 5, Zarankiewicz's drawing has 16 crossings, matching the formula, while a scrambled layout has many more.</p>
</om-brick>
<figcaption><b>fig 3</b>Scrambled layouts land far above the formula, and Zarankiewicz's drawing hits it exactly. <span class="m">The crossings are found by intersecting every pair of tracks in the current drawing, including while it moves.</span></figcaption>
</figure>

Family 165 claims the formula is exact for every m and n, along with the Harary–Hill formula for complete graphs, where every point connects to every other. Both have Lean challenges.

## an erdős problem with a $5,000 prize

Take a set of whole numbers whose reciprocals add up to infinity. The primes qualify, since 1/2 + 1/3 + 1/5 + 1/7 + … grows without limit. Erdős conjectured that any such set contains evenly spaced runs of every length, like 3, 5, 7 or 5, 11, 17, 23, 29. Ben Green and Terence Tao proved it for the primes in 2004. The general question is [problem #3](https://www.erdosproblems.com/3) on Thomas Bloom's site, with a $5,000 prize.

<figure class="wide">
<om-erdos data-fig data-label="fig 4 · progressions in the primes">
<p class="fallback">The numbers 1 to 210 in rows of 30. The primes light up one by one while a running total of their reciprocals grows, reaching 1.949 at 210. Then the figure finds the earliest-ending run of evenly spaced primes of each length: 3, 5, 7 (step 2); 5, 11, 17, 23 (step 6); 5, 11, 17, 23, 29 (step 6); and 7, 37, 67, 97, 127, 157 (step 30), which forms a vertical line in the grid.</p>
</om-erdos>
<figcaption><b>fig 4</b>Progressions of primes up to length 6 already fit under 210. <span class="m">The figure finds the primes and the progressions itself. The earliest run of 7 ends at 907.</span></figcaption>
</figure>

Family 159 claims the full conjecture, by way of a new upper bound on how large a set can be without containing a progression. The Lean challenge states the reciprocal-sum version and leaves the bound out. On the morning of 7 October, erdosproblems.com still listed #3 as open.

## how the model was asked

There's no technical report. The method is three sentences in the README: the "vast majority" of results came from "the same procedure using an unreleased internal OpenAI model," with three hours of compute per result on average and about 4,000 problems posed. Two results didn't follow that procedure, a zero-free region for the Riemann zeta function and the Hodge conjecture for CM abelian varieties, and one write-up was "human edited for readability."

The prompt shows up in one of the reasoning summaries:

> Please give a complete rigorous solution to the following problem. Even if the problem is 'open', the intention is that you should resolve it and present a full solution. Your solution can be either a complete, rigorous resolution or a well-presented, rigorous refutation. Brute-force enumerations and computer-assisted proofs are strongly discouraged in the final writeup.

The ten summaries mix narrative with short lines from the model's own reasoning, like "Aha recursive structure: overfitting shared variable can simulate original model at smaller scale" from the Mézard–Parisi trace. Nothing says who or what wrote the Lean, except one field in `lean/formalization.yaml`: `automation.methods: agent`.

## what a computer has checked

The repo has 405 comparator challenges covering 507 theorems, linked from 235 families and 329 of the 722 manuscripts. Every challenge allows only Lean's three standard axioms. I searched the 25.9 million lines of proof for `sorry`, for new `axiom` declarations and for `native_decide`, which would let a proof lean on compiled code, and found none of them. I haven't built the library, so the stronger claim that every proof compiles and passes comparator is still OpenAI's.

The index file, `formalization.yaml`, lists only 162 papers and marks itself `Partial progress.` and `review: unchecked`. Press coverage used the 162, and at least one reader went wrong because of it: the top comment on Hacker News comes from someone who spent [thousands of hours on Barnette's conjecture](https://news.ycombinator.com/item?id=49987367) and says there's no Lean proof for it. There is one, in `lean/docs/180.md`.

<figure class="wide">
<om-read data-fig data-label="fig 5 · what a person reads">
<p class="fallback">A grid of 2,590 grey squares, each standing for 10,000 lines of Lean, shows the 25.9 million lines of proof in the repo. Nine green squares in the corner show the 89,411 lines of challenge statements. The proofs are checked by the Lean kernel; the statements are what a human reviewer has to read to know what was proved.</p>
</om-read>
<figcaption><b>fig 5</b>Only the green squares need a human reader, and the kernel checks the rest. <span class="m">Line counts from lean/OAI and the 405 files in lean/ComparatorChallenges.</span></figcaption>
</figure>

Those 89,411 lines are where a wrong result could still get through. Lean checks that a proof proves its statement. Whether the statement is the problem people care about is left to a reader. For family 143 the catalogue claims a uniform bound on limit cycles for polynomial systems of every degree, while the Lean statement covers quintic Liénard systems. The free group factor challenge defines the factors from scratch in the challenge file, so an operator algebraist has to check those definitions before the proof means anything.

## the first day

Terence Tao posted a four-part thread on Mathstodon about four hours before the repo went up. ["Solutions to open problems are now being harvested at large scale in an unsustainable fashion,"](https://mathstodon.xyz/@tao/117395268889583356) he wrote, "leaving entire fields of mathematics much less fertile than when such problems were solved in the traditional 'Math 1.0' fashion." [In the fourth post](https://mathstodon.xyz/@tao/117395269325940185) he says the community "will need to explicitly re-evaluate its criteria for education, publication, and career advancement." The same morning he boosted a parody headline: "OpenAI Releases the Final Ten Minutes of 500 Previously Unreleased Films."

Scientific American [quoted two mathematicians](https://www.scientificamerican.com/article/openai-unleashes-hundreds-more-math-results-upon-a-field-already-in-shock/) on opposite sides. Andrew Sutherland at MIT: "Until and unless they release the model and people can replicate their results, I think you should treat any claims about one-shotting problems with a single agent as unverified. We should ask for receipts." Daniel Litt at Toronto: "If we want to know the answers to these math questions, I see no reason why we should ask the company to keep them secret from us."

Kevin Buzzard had asked for exactly this kind of release five days earlier, [on his blog](https://xenaproject.wordpress.com/2026/10/01/to-grieve-or-not-to-grieve/): "I personally call for OpenAI to simply dump their collection of theorems upon the world so that we can see exactly what they claim to have done." The Advisory Group on Mathematics and AI, hosted by the Institute for Advanced Study, had published guidance on 29 September asking labs to stop "treating the release of mathematical results as marketing vehicles" and to put results in repositories "not controlled by any AI lab." An OpenAI spokesperson told Scientific American the company isn't bound by it.

The [Hacker News thread](https://news.ycombinator.com/item?id=49984923) had 952 points and about 900 comments by the next morning. Comments ranged from awe to triage, and a few came from researchers whose work had just been done for them. One wrote that ["literally every optimistic goal proposed to be worked on during this multi-year window has been solved in this one post."](https://news.ycombinator.com/item?id=49990565) Another asked OpenAI to ["put human names on the papers as someone who has reviewed the result."](https://news.ycombinator.com/item?id=49985212)

A year ago the complaint was different. In October 2025 an OpenAI VP posted that GPT-5 had solved ten open Erdős problems, and Bloom pointed out that the solutions were already in the literature. This time I found nobody, a day in, saying a specific result is wrong or already known. The arguments are about credit, the pace, and what a field does with 722 papers it didn't write.
