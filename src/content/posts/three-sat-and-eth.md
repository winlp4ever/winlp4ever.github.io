---
title: 3-SAT and the exponential time hypothesis
date: 2026-11-09
description: 3-SAT asks whether a list of three-variable rules can all be true at once. This post covers why it is hard, the algorithms people built for it over forty years, the hypothesis that said they could never get much better, and the two AI-found algorithms that broke it in October 2026.
tags: [math, complexity, ai]
category: ai
glyph: sat
figures: 6
math: true
---

On 26 October 2026 OpenAI posted a 67-page paper titled "The Exponential Time Hypothesis is False", produced, according to its README, by an unnamed internal model<sup><a href="#src-1">1</a></sup>. A few hours later Anthropic posted a 49-page paper credited to Claude, with a different algorithm for the same result and a Lean proof of 1,050 modules<sup><a href="#src-2">2</a></sup>. Both papers count the solutions of a 3-SAT formula in subexponential time, which most complexity theorists had assumed impossible since 1999.

This post goes through 3-SAT from the beginning: the problem, why it is hard, the algorithms built for it since 1985, the hypothesis, and then the main idea of each new algorithm.

## the problem

A 3-SAT formula has variables that are true or false. A **literal** is a variable or its negation ($$x$$ or $$\neg x$$), a **clause** is an OR of three literals, and the formula is an AND of clauses. The question is whether some assignment of the variables makes every clause true. Here is a formula on three variables with four clauses:

$$
(x \lor y \lor z) \land (\neg x \lor \neg y \lor z) \land (x \lor \neg y \lor \neg z) \land (\neg x \lor y \lor \neg z)
$$

A clause on three different variables is false for exactly one of the eight assignments, the one that makes all three of its literals false. So each clause rules out one corner of the cube of assignments. The four clauses above rule out 000, 110, 101 and 011, and the formula has four solutions left: 001, 010, 100 and 111. Add the other four possible clauses and every corner is ruled out, and the formula has no solution.

<figure>
<sat-cube data-fig data-label="fig 1 · each clause rules out one assignment">
<p class="fallback">The eight assignments of x, y and z drawn as the corners of a cube. The clause (x or y or z) rules out 000, (not x or not y or z) rules out 110, (x or not y or not z) rules out 011 and (not x or y or not z) rules out 101. Four corners stay satisfiable: 001, 010, 100 and 111. With all eight possible clauses every corner is ruled out.</p>
</sat-cube>
<figcaption><b>fig 1</b>Pick an assignment to see which clauses it satisfies, or switch to all eight clauses to make the formula unsatisfiable. <span class="m">The formula is the example above.</span></figcaption>
</figure>

With $$n$$ variables there are $$2^n$$ assignments, and checking one takes time proportional to the length of the formula. Trying them all is the obvious algorithm. For $$n = 100$$ that is $$1.27 \times 10^{30}$$ assignments. The counting version, **#3-SAT**, asks how many assignments satisfy the formula. Both new algorithms solve the counting version, which is at least as hard.

## np-completeness

Stephen Cook proved in 1971 that every problem a nondeterministic machine solves in polynomial time reduces to checking tautologies, and that the case with three literals per term is already as hard as the general one<sup><a href="#src-3">3</a></sup>. That case is the complement of 3-SAT. He also noted that two literals per term is easy. 2-SAT is solvable in linear time<sup><a href="#src-4">4</a></sup>. Leonid Levin found the same kind of result independently in the USSR, published in 1973<sup><a href="#src-5">5</a></sup>. Richard Karp's 1972 paper listed 21 NP-complete problems, among them 3-SAT, graph colouring, clique and the knapsack problem<sup><a href="#src-6">6</a></sup>.

The reduction from SAT to 3-SAT splits a long clause with a fresh variable. $$(a \lor b \lor c \lor d)$$ becomes $$(a \lor b \lor y) \land (\neg y \lor c \lor d)$$, which can be satisfied whenever the original clause can, and only then. A problem with this property, where every problem whose answers can be checked quickly reduces to it, is **NP-complete**. A polynomial-time algorithm for 3-SAT would give one for all of NP, which would mean P = NP.

## hard formulas and easy ones

Most formulas are easy. Take random formulas with $$n$$ variables and $$m$$ clauses. With few clauses per variable almost all of them are satisfiable and a solver finds a solution fast. With many clauses almost all are unsatisfiable and a solver finds a contradiction fast. Mitchell, Selman and Levesque measured in 1992 that the hard formulas sit near the ratio where half are satisfiable, "about 4.3 times the number of variables"<sup><a href="#src-7">7</a></sup>.

I ran the same experiment with a small solver of my own, a DPLL search that branches on the most frequent variable and propagates unit clauses, on 200 random formulas at each ratio.

<figure class="wide">
<sat-phase data-fig data-label="fig 2 · the hard region">
<p class="fallback">Random 3-SAT with 20, 40 and 60 variables, 200 formulas per ratio of clauses to variables from 2 to 7. The share of satisfiable formulas drops from 1 to 0 around a ratio of 4.3 to 4.6, more steeply as n grows. The median number of branches the solver needs peaks in the same place: 8 at n = 20, 26 at n = 40 and 88 at n = 60.</p>
</sat-phase>
<figcaption><b>fig 2</b>The share of satisfiable formulas falls where the search gets hardest, and the peak grows quickly with n. <span class="m">My own run: a DPLL solver in Python with unit propagation, no clause learning, 200 random formulas per point. Physicists predict the drop settles at 4.267 as n grows<sup><a href="#src-8">8</a></sup>.</span></figcaption>
</figure>

At the hardest ratio the median search went from 8 branches with 20 variables to 26 with 40 and 88 with 60, so it roughly triples for every 20 extra variables.

The location of that drop is a famous open problem. Physicists predicted 4.26675 for 3-SAT with the cavity method, which isn't a proof<sup><a href="#src-8">8</a></sup>. A first-moment argument gives an easy upper bound: each clause rules out one eighth of the assignments, so the expected number of solutions is $$2^n (7/8)^m$$, which goes to zero above $$m/n \approx 5.19$$. The best proven bounds are 3.52 from below<sup><a href="#src-9">9</a></sup> and 4.4898 from above<sup><a href="#src-10">10</a></sup>. Ding, Sly and Sun proved the physicists' value in 2015, but only for clauses of some large length $$k$$<sup><a href="#src-11">11</a></sup>. A preprint from October 2026 claims that a threshold exists for every $$k \ge 3$$<sup><a href="#src-12">12</a></sup>.

Real solvers are much better than mine. GRASP (1996) added conflict analysis: when the search hits a contradiction it learns a new clause that explains it and jumps back past the choices that didn't matter<sup><a href="#src-13">13</a></sup>. Chaff (2001) added two-watched-literal propagation and the VSIDS branching heuristic, and ran one to two orders of magnitude faster than GRASP<sup><a href="#src-14">14</a></sup>. These conflict-driven clause-learning solvers routinely handle industrial formulas from chip verification and planning with millions of variables. They still fail on some small formulas. Chvátal and Szemerédi proved in 1988 that random 3-SAT formulas with a large enough fixed ratio of clauses to variables need resolution proofs of exponential length<sup><a href="#src-15">15</a></sup>. Clause-learning solvers work as resolution engines<sup><a href="#src-16">16</a></sup>: on an unsatisfiable formula, their run is a resolution proof, so they take exponential time on these formulas.

## forty years of smaller bases

Theory asks for a running time that holds on every formula, including the worst one. Since 1985 the answer has been $$c^n$$ for a base $$c$$ below 2, and the base kept shrinking.

<figure class="wide">
<sat-records data-fig data-label="fig 3 · the best guaranteed running time">
<p class="fallback">The record running time for 3-SAT written as 2 to the power y times n, with y on the vertical axis. Brute force has y = 1. Monien and Speckenmeyer, 1985, deterministic: 1.619^n, y = 0.695. Paturi, Pudlák and Zane, 1997, randomized: 1.587^n, y = 0.667. PPSZ, 1998: 1.364^n, y = 0.448. Schöning, 1999: 1.334^n, y = 0.415. Iwama and Tamaki, 2004: 1.324^n, y = 0.405. Hertli, 2011: 1.30704^n, y = 0.386. Moser and Scheder, 2011, deterministic: (4/3 + ε)^n. Liu, 2018, deterministic: 1.32793^n, y = 0.409. Scheder's 2021 analysis, lifted to general formulas, and Jiang and Cai, 2026, randomized: 1.3070316^n. The October 2026 algorithms are deterministic and have y going to 0 as n grows.</p>
</sat-records>
<figcaption><b>fig 3</b>Forty years of records cut the exponent from n to about 0.386 n. The new algorithms are the first whose exponent shrinks toward zero. <span class="m">Bases from the papers and from the history sections of Hansen, Kaplan, Zamir and Zwick<sup><a href="#src-21">21</a></sup> and Jiang and Cai<sup><a href="#src-23">23</a></sup>. Hover a point for the paper.</span></figcaption>
</figure>

Monien and Speckenmeyer (1985) branch on a clause $$(a \lor b \lor c)$$. A solution either makes $$a$$ true, or makes $$a$$ false and $$b$$ true, or makes both false and $$c$$ true. With a trick for keeping partial assignments that already satisfy every clause they touch, they get about $$1.619^n$$<sup><a href="#src-17">17</a></sup>.

Paturi, Pudlák and Zane (1997) go through the variables in a random order. If a clause has become a unit clause that forces the current variable, they set it, and otherwise they flip a coin. Suppose the formula has a single solution. Then every variable has a clause in which it is the only true literal under that solution. When the variable comes last among that clause's three, which happens with probability 1/3, it is forced for free. On average only $$2n/3$$ coins are needed, so repeating the procedure about $$2^{2n/3} \approx 1.587^n$$ times finds the solution. PPSZ (1998) sets a variable whenever a few clauses together imply its value, not only unit clauses, and gets the guesses down to about $$0.386n$$ for formulas with one solution<sup><a href="#src-18">18</a></sup>.

Schöning's 1999 algorithm is a random walk<sup><a href="#src-19">19</a></sup>. Start from a random assignment. Pick a false clause and flip one of its three variables at random, for $$3n$$ steps. At least one of the three disagrees with a solution, so each flip moves toward it with probability at least 1/3. A walk succeeds with probability about $$(3/4)^n$$, so about $$(4/3)^n$$ restarts find a solution. Local search like this does best when there are many solutions, and PPSZ does best when there are few, which is why Iwama and Tamaki got 1.324 by combining the two<sup><a href="#src-20">20</a></sup>.

Timon Hertli showed in 2011 that the PPSZ bound for one solution holds for every satisfiable formula, which gave $$1.30704^n$$<sup><a href="#src-22">22</a></sup>. After that the gains became tiny. Scheder's 2021 analysis of the same algorithm<sup><a href="#src-24">24</a></sup>, carried over to general formulas by a later lifting step, gives $$1.307031594^n$$, and a preprint by Jiang and Cai from July 2026 brings it to $$1.307031578^n$$, the record that OpenAI's paper cites<sup><a href="#src-23">23</a></sup>. The best deterministic algorithm, Liu's from 2018, takes $$1.32793^n$$<sup><a href="#src-25">25</a></sup>. For $$n = 100$$ the randomized record means about $$4 \times 10^{11}$$ steps against $$10^{30}$$ for brute force.

## the hypothesis

Russell Impagliazzo and Ramamohan Paturi wrote down in 1999 what these records seemed to show<sup><a href="#src-26">26</a></sup>. Let $$s_3$$ be the infimum of the $$\delta$$ such that 3-SAT can be solved in time $$2^{\delta n}$$. The **exponential time hypothesis** (ETH) says $$s_3 > 0$$: some fixed fraction of $$n$$ always stays in the exponent. In particular no algorithm runs in $$2^{o(n)}$$, which is the form people usually quote. The **strong** version (SETH) says that as clauses get longer the exponent approaches $$n$$ itself.

With Francis Zane they proved the sparsification lemma<sup><a href="#src-27">27</a></sup>. Any 3-SAT formula splits into at most $$2^{\varepsilon n}$$ formulas in which every variable appears in a bounded number of clauses, for any $$\varepsilon > 0$$. So a formula can be assumed to have $$m = O(n)$$ clauses, and an algorithm that is subexponential in $$m$$ is subexponential in $$n$$. This is what made ETH useful. Reductions usually blow up the number of clauses only by a constant factor, so ETH turns into precise lower bounds for other problems. Under ETH, 3-colouring, independent set and Hamiltonian path have no $$2^{o(n)}$$ algorithm, the planar versions of several graph problems have no $$2^{o(\sqrt n)}$$ algorithm, and finding a clique of size $$k$$ needs time $$n^{\Omega(k)}$$<sup><a href="#src-28">28</a></sup>. Anthropic counts more than 800 papers that prove a result only under ETH or a stronger hypothesis<sup><a href="#src-2">2</a></sup>.

Not everyone believed it. In 2019 Ryan Williams gave ETH a 70% chance of being true, against 25% for SETH and 80% for P ≠ NP, and wrote that "the truth of ETH is not so far from a coin toss"<sup><a href="#src-29">29</a></sup>. He quotes Impagliazzo: "It's not a Conjecture, it's a Hypothesis! We chose that word for a reason."

## october 2026

According to Anthropic's paper, the core of its algorithm was found on 16 October "by an internal Claude research model with 14M output tokens and no human input", and researchers then helped improve the presentation<sup><a href="#src-2">2</a></sup>. OpenAI's paper is dated 17 October and revised 25 October, and OpenAI published it on 26 October with a group led by Impagliazzo, Paturi and Williams to examine it<sup><a href="#src-1">1</a></sup>. The group wrote that "our involvement should not be taken as certification of the claim"<sup><a href="#src-30">30</a></sup>.

Both algorithms are deterministic, both count solutions, and they reach almost the same bound:

$$
2^{O\left(n \log\log n / \sqrt{\log n}\right)}
$$

For formulas with $$O(n)$$ clauses the $$\log\log n$$ factor goes away and the time is $$2^{O(n/\sqrt{\log n})}$$. The exponent is $$n$$ divided by $$\sqrt{\log n}$$, and $$\sqrt{\log n}$$ grows without bound, so the exponent is $$o(n)$$ and ETH fails. The gain is small: for a million variables $$\sqrt{\log_2 n}$$ is about 4.5. Anthropic computes that for formulas with $$5n$$ clauses its bound beats $$2^n$$ only when $$n > 10^{10000}$$<sup><a href="#src-2">2</a></sup>. Brute force is already out of reach at $$n = 100$$, so the result changes nothing for anyone solving formulas in practice.

The Lean proofs check different things. Anthropic's proves its main theorem with the full bound, checked by Lean's kernel and by a second, independent kernel, though its README warns that "no machine checks that this file says what the paper says"<sup><a href="#src-2">2</a></sup>. OpenAI's Lean proof gives a slightly weaker bound, with $$(\log\log n)^2$$ in place of $$\log\log n$$<sup><a href="#src-1">1</a></sup>. Within days Ryan O'Donnell and Shiva Kintali posted shorter expositions of OpenAI's argument, aimed at simplicity over the best bounds<sup><a href="#src-31">31</a></sup><sup><a href="#src-32">32</a></sup>, and Mark Sellke posted slides that outline it<sup><a href="#src-33">33</a></sup>. Lance Fortnow wrote that he hadn't verified the proof but "it is safe to assume now that the exponential-time hypothesis is toast"<sup><a href="#src-34">34</a></sup>. Williams told TechCrunch that some parts are routine and "there are two or three alien-looking parts"<sup><a href="#src-35">35</a></sup>.

## openai's algorithm

Counting solutions can be written as a sum of polynomials. A clause $$(x \lor y \lor z)$$ becomes $$1 - (1-x)(1-y)(1-z)$$, which is 1 when the clause is true and 0 when it is false, and a negated literal uses $$1 - x$$ in place of $$x$$. The product of these clause polynomials is 1 on solutions and 0 everywhere else, so summing it over all $$2^n$$ assignments gives the count. After sparsification every variable appears in only a few clauses.

Sellke calls the starting point "wishful thinking"<sup><a href="#src-33">33</a></sup>. Suppose the variables could be split into $$r$$ groups so that every clause uses variables from only one group. Then the formula falls apart into $$r$$ independent formulas, the count is the product of their counts, and each takes $$2^{n/r}$$ time. Hard formulas don't split like that: some clauses cross between groups.

<figure class="wide">
<sat-split data-fig data-label="fig 4 · the wishful case">
<p class="fallback">Eight variables in two colour groups, green and ochre. In the wishful case every clause uses variables of one colour, so the count is the count of the green clauses times the count of the ochre clauses, 2^4 work per group instead of 2^8 overall. In a real formula a few clauses mix colours, and the product no longer holds.</p>
</sat-split>
<figcaption><b>fig 4</b>If no clause crossed between groups, counting would split into independent pieces. The crossing clauses are what OpenAI's algorithm has to get around. <span class="m">Illustrative formula, after Sellke's slides<sup><a href="#src-33">33</a></sup>.</span></figcaption>
</figure>

The algorithm makes the wishful case almost true at a few special points. It replaces each variable inside each clause by a linear combination of variables whose coefficients are polynomials in a new parameter $$T$$. At $$T = 0$$ every clause reads its own variables, so the deformed sum $$H(T)$$ satisfies $$H(0) = \#F$$, the count we want. At $$T = 1, 2, \dots, Q$$ the variables are coloured into groups, with a different colouring at each point (chosen deterministically), and the combinations are chosen so that every clause reads only variables of its own colour, plus a small number of shared sums of variables. The algorithm tries every value of those shared sums, and for each one the count factors across the groups. So $$H(1), \dots, H(Q)$$ are cheap to compute, and $$H(0)$$ is not.

$$H$$ is a polynomial in $$T$$, so its value at 0 follows from enough information at other points. Values at $$Q$$ points aren't enough, because the degree of $$H$$ is much larger than $$Q$$. So the algorithm also computes derivatives of $$H$$ at each easy point, up to some order $$q$$, and recovers $$H(0)$$ by Hermite interpolation, which fits a polynomial to values and derivatives together.

<figure class="wide">
<sat-interp data-fig data-label="fig 5 · back to zero">
<p class="fallback">A polynomial H(T) drawn from T = 0 to T = 4. Its value at 0, the number of solutions, is unknown. At T = 1, 2, 3 and 4 the algorithm computes the value and several derivatives, drawn as short curves that match H near each point. Hermite interpolation fits the one polynomial of low enough degree that matches all of them and reads off its value at T = 0.</p>
</sat-interp>
<figcaption><b>fig 5</b>The count is a value the algorithm can't compute directly, so it computes values and derivatives at easy points and interpolates back. <span class="m">Illustrative polynomial with made-up values. The real H has degree O(n√log n).</span></figcaption>
</figure>

The cost is in the derivatives. Derivatives up to order $$q$$ cost about $$2^{q \log(n/q)}$$ extra work, so $$q$$ has to be $$o(n)$$, and $$q$$ is set by the degree of $$H$$ divided by the number of easy points $$Q$$. So the deformation needs a low degree in $$T$$. Making every clause read only its own colour, with no errors at all, would need degree $$Q$$. Instead the algorithm uses a polynomial of degree about $$\sqrt{Q}$$ that gets the swap right almost everywhere. Written in the right basis, the swap multiplies each basis direction by $$\pm 1$$ according to the parity of a count that behaves like a coin-flip sum over $$Q$$ positions, and such a sum almost always lands within a few $$\sqrt Q$$ of its mean. A polynomial of degree about $$\sqrt Q$$ can match the parity on that central range. The rare directions outside it are where the shared sums come from, and there are few enough of them that trying all their values stays cheap. Sellke calls the gap between degree $$\sqrt Q$$ and $$Q$$ the "crucial gain" of the proof<sup><a href="#src-33">33</a></sup>. The number of easy points can grow only to about $$\log n / \log\log n$$, so the degree comes out near $$\sqrt{\log n}$$, and that is where the $$\sqrt{\log n}$$ in the running time comes from.

O'Donnell's version recasts the same idea as computing the permanent of a sparse matrix, and states the key fact plainly: a polynomial of low degree in $$x_1 + \dots + x_\ell$$ "equals $$x_1 \cdots x_\ell$$ on all but an $$\ell^{-100}$$ fraction" of the $$\pm 1$$ inputs<sup><a href="#src-31">31</a></sup>.

## anthropic's algorithm

Claude's algorithm starts from a graph. Each clause is a node, and two nodes are joined by an edge that carries one bit for each variable the two clauses share. If the graph can be cut into two halves with few bits crossing the cut, the algorithm can try every value of those bits and count each half separately. Repeating the cut recursively is a classic approach, and it fails on random formulas: their graphs are expanders, where every balanced cut is crossed by a constant fraction of all the bits. In the paper's words, "earlier divide and conquer ideas only improved the constant in the exponent"<sup><a href="#src-2">2</a></sup>.

The new step rewrites edges before cutting. The algorithm places the nodes on a grid. Any two rows and two columns meet at four nodes, the corners of a rectangle, and the two diagonals of the rectangle carry two equality tests: corner $$a$$'s copy $$x$$ must equal corner $$b'$$'s copy $$v$$, and $$y$$ must equal $$u$$. An identity Ferdinand Degen found in 1818, the eight-square identity behind the octonions, rewrites that pair of tests on 3-bit blocks:

$$
2\,[x = v]\,[y = u] = [x \oplus y \oplus u \oplus v = 0] \big(\sigma(x,y)\,\sigma(v,u) + \sigma(x,u)\,\sigma(v,y)\big)
$$

where $$\sigma$$ is an explicit function with values $$\pm 1$$. The left side is two diagonals. On the right, the first term only couples corners within the same row, which the paper calls a row choice, and the second couples corners within the same column, a column choice. Both share a parity test on all four corners.

<figure class="wide">
<sat-rect data-fig data-label="fig 6 · row choice and column choice">
<p class="fallback">A rectangle of four nodes from the grid, with corners holding 3-bit strings x, y (top row) and u, v (bottom row). Before the rewrite, the two diagonals cost 6 bits between the top and bottom rows. After the rewrite, a row choice costs 3 bits when the rows are merged, because only x XOR y has to agree with u XOR v, and a column choice costs 6. When the columns are merged instead, the costs swap. Each term of the expansion merges whichever way is cheaper.</p>
</sat-rect>
<figcaption><b>fig 6</b>Each rectangle's two diagonals become a sum of a row choice and a column choice, and each term merges the grid along whichever direction costs fewer bits. <span class="m">After figure 2 of Anthropic's paper<sup><a href="#src-2">2</a></sup>. Costs are in bits per 3-bit block.</span></figcaption>
</figure>

Expanding the product over all rectangles gives a sum of many terms. For each term the algorithm merges the grid along rows or along columns, whichever leaves fewer bits between the merged parts, and adds up the results. A row choice costs 3 bits when the rows are merged, since only $$x \oplus y$$ has to match $$u \oplus v$$, and 6 when the columns are merged. Expanding every block separately would make too many terms, so the algorithm groups terms by how many column choices they contain. That keeps the number of terms polynomial, and costs one extra bit per block in each merge direction for the bookkeeping. Merging rows and merging columns then cost 11 bits per block between them, against 12 before, so the cheaper of the two is at most $$11/12$$ of the old cost<sup><a href="#src-2">2</a></sup>.

After the merge the instance has fewer nodes and fewer bits between them, and the algorithm recurses. Each level multiplies the exponent by about $$11/12$$, so after $$\ell$$ levels the time is about $$2^{3 e_\ell m}$$ with $$e_\ell \le 1.12 \cdot (11/12)^\ell$$. For any $$\delta > 0$$ a constant number of levels gives time $$2^{\delta m}$$, and with sparsification $$2^{\delta n}$$, which already refutes ETH. The sharper $$\sqrt{\log n}$$ bound needs better balancing and more elaborate pieces whose sizes come from the Hardy–Ramanujan formula for partitions. The paper also calculates that in an earlier model of these sums, where one network is contracted along one fixed order, no algorithm gets below about 4/9 of the brute-force exponent. This algorithm escapes that model because it "expands the sum into a signed sum of tensor networks and contracts different terms in different orders"<sup><a href="#src-2">2</a></sup>.

OpenAI's paper also proves its sharpest bound through tensor contraction, in an appendix<sup><a href="#src-1">1</a></sup>.

## consequences

ETH and SETH are false if the proofs hold, along with several variants such as #ETH and NSETH. The hundreds of lower bounds proved under ETH remain true as conditional statements, but their condition is gone. Anthropic's paper lists algorithms that follow, counting independent sets, cliques, vertex covers and $$k$$-colourings in time $$2^{\delta n}$$ for every $$\delta > 0$$<sup><a href="#src-2">2</a></sup>.

Several things are untouched. A running time of $$2^{n/\sqrt{\log n}}$$ is still far from polynomial, so the result says nothing directly about P vs NP. Fortnow points out that it "gives nothing new for Subset Sum or Traveling Salesman", because reductions from those problems to 3-SAT make the formula too large for a $$2^{o(n)}$$ gain to carry over<sup><a href="#src-34">34</a></sup>. Neither paper refutes the orthogonal vectors hypothesis, a weaker assumption than SETH, so the lower bounds for edit distance and similar problems that can be based on it still hold under that assumption<sup><a href="#src-2">2</a></sup>. On cryptography, Williams told TechCrunch that OpenAI had checked and was reasonably confident the result doesn't imply any breaks<sup><a href="#src-35">35</a></sup>.

As of 9 November the group led by Impagliazzo, Paturi and Williams hasn't posted a verdict. Its last post, on 1 November, asks researchers to announce results that follow from the claimed refutation<sup><a href="#src-30">30</a></sup>.

<details class="sources">
<summary>sources</summary>
<ol>
<li id="src-1"><a href="https://github.com/openai/math/blob/main/preprints/The-Exponential-Time-Hypothesis-is-False-October-25-2026/paper.pdf">OpenAI, The Exponential Time Hypothesis is False (dated 17 October 2026, revised 25 October 2026), with its Lean scope note</a></li>
<li id="src-2"><a href="https://github.com/anthropics/formal-math/tree/main/eth">Claude (Anthropic), A 2^o(n) Time Algorithm for 3-SAT, paper, Lean development and README (26 October 2026)</a></li>
<li id="src-3"><a href="https://www.cs.toronto.edu/~sacook/homepage/1971.pdf">Stephen Cook, The Complexity of Theorem-Proving Procedures, STOC (1971)</a></li>
<li id="src-4"><a href="https://doi.org/10.1016/0020-0190(79)90002-4">Aspvall, Plass and Tarjan, A linear-time algorithm for testing the truth of certain quantified Boolean formulas, Information Processing Letters (1979)</a></li>
<li id="src-5"><a href="https://www.mathnet.ru/eng/ppi914">Leonid Levin, Universal sequential search problems, Problemy Peredachi Informatsii (1973)</a></li>
<li id="src-6"><a href="https://doi.org/10.1007/978-1-4684-2001-2_9">Richard Karp, Reducibility Among Combinatorial Problems (1972)</a></li>
<li id="src-7"><a href="https://cdn.aaai.org/AAAI/1992/AAAI92-071.pdf">Mitchell, Selman and Levesque, Hard and Easy Distributions of SAT Problems, AAAI (1992)</a></li>
<li id="src-8"><a href="https://arxiv.org/abs/cs/0309020">Mertens, Mézard and Zecchina, Threshold values of random K-SAT from the cavity method (2006)</a></li>
<li id="src-9"><a href="https://arxiv.org/abs/math/0310193">Hajiaghayi and Sorkin, The satisfiability threshold of random 3-SAT is at least 3.52 (2003)</a></li>
<li id="src-10"><a href="https://arxiv.org/abs/0807.3600">Díaz, Kirousis, Mitsche and Pérez-Giménez, A new upper bound for 3-SAT (2008)</a></li>
<li id="src-11"><a href="https://arxiv.org/abs/1411.0650">Ding, Sly and Sun, Proof of the satisfiability conjecture for large k (2015)</a></li>
<li id="src-12"><a href="https://eccc.weizmann.ac.il/report/2026/229/">Gaia Carenini, A polynomial scaling window for random k-SAT and a proof of the satisfiability conjecture, ECCC TR26-229 (5 October 2026)</a></li>
<li id="src-13"><a href="https://doi.org/10.1109/ICCAD.1996.569607">Marques-Silva and Sakallah, GRASP: a new search algorithm for satisfiability, ICCAD (1996)</a></li>
<li id="src-14"><a href="https://cs357.stanford.edu/MMZZM01.pdf">Moskewicz, Madigan, Zhao, Zhang and Malik, Chaff: Engineering an Efficient SAT Solver, DAC (2001)</a></li>
<li id="src-15"><a href="https://doi.org/10.1145/48014.48016">Chvátal and Szemerédi, Many hard examples for resolution, Journal of the ACM (1988)</a></li>
<li id="src-16"><a href="https://doi.org/10.1016/j.artint.2010.10.002">Pipatsrisawat and Darwiche, On the power of clause-learning SAT solvers as resolution engines, Artificial Intelligence (2011)</a></li>
<li id="src-17"><a href="https://doi.org/10.1016/0166-218X(85)90050-2">Monien and Speckenmeyer, Solving satisfiability in less than 2^n steps, Discrete Applied Mathematics (1985)</a></li>
<li id="src-18"><a href="https://doi.org/10.1145/1066100.1066101">Paturi, Pudlák, Saks and Zane, An improved exponential-time algorithm for k-SAT, Journal of the ACM (2005)</a></li>
<li id="src-19"><a href="https://doi.org/10.1109/SFFCS.1999.814612">Uwe Schöning, A probabilistic algorithm for k-SAT and constraint satisfaction problems, FOCS (1999)</a></li>
<li id="src-20"><a href="https://eccc.weizmann.ac.il/report/2003/053">Iwama and Tamaki, Improved upper bounds for 3-SAT, ECCC TR03-053 (2003), SODA (2004)</a></li>
<li id="src-21"><a href="https://doi.org/10.1145/3313276.3316359">Hansen, Kaplan, Zamir and Zwick, Faster k-SAT algorithms using biased-PPSZ, STOC (2019)</a></li>
<li id="src-22"><a href="https://doi.org/10.1137/120868177">Timon Hertli, 3-SAT Faster and Simpler: Unique-SAT Bounds for PPSZ Hold in General, SIAM Journal on Computing (2014; FOCS 2011)</a></li>
<li id="src-23"><a href="https://arxiv.org/abs/2607.10697">Jiang and Cai, A Better Analysis For PPSZ For 3-SAT, arXiv 2607.10697 (July 2026)</a></li>
<li id="src-24"><a href="https://arxiv.org/abs/2207.11071">Dominik Scheder, PPSZ is better than you think, FOCS (2021)</a></li>
<li id="src-25"><a href="https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ICALP.2018.88">Sixue Liu, Chain, Generalization of Covering Code, and Deterministic Algorithm for k-SAT, ICALP (2018)</a></li>
<li id="src-26"><a href="https://cseweb.ucsd.edu/~paturi/myPapers/pubs/ImpagliazzoPaturi_1999_ccc.pdf">Impagliazzo and Paturi, Complexity of k-SAT, CCC (1999); JCSS (2001)</a></li>
<li id="src-27"><a href="https://doi.org/10.1006/jcss.2001.1774">Impagliazzo, Paturi and Zane, Which Problems Have Strongly Exponential Complexity?, JCSS (2001)</a></li>
<li id="src-28"><a href="https://cs.ucsb.edu/~daniello/papers/surveyETH.pdf">Lokshtanov, Marx and Saurabh, Lower bounds based on the Exponential Time Hypothesis, Bulletin of the EATCS (2011)</a></li>
<li id="src-29"><a href="https://people.csail.mit.edu/rrw/likelihoods.pdf">Ryan Williams, Some Estimated Likelihoods for Computational Complexity (2019)</a></li>
<li id="src-30"><a href="https://ethdiscussion.blog">Impagliazzo, Paturi and Williams, ETH: Community Examination and Discussion (read 9 November 2026)</a></li>
<li id="src-31"><a href="https://www.cs.cmu.edu/~odonnell/some_eth_false_exposition.pdf">Ryan O'Donnell, Some exposition of "The Exponential Time Hypothesis Is False" (30 October 2026)</a></li>
<li id="src-32"><a href="https://shivakintali.github.io/papers/ETH.pdf">Shiva Kintali, A simplified proof of ETH is false (26 October 2026)</a></li>
<li id="src-33"><a href="https://msellke.com/Files/ETH-False-Slides.pdf">Mark Sellke, An Outline of OpenAI's 2^o(n)-Time k-SAT Algorithm, slides (October 2026)</a></li>
<li id="src-34"><a href="https://blog.computationalcomplexity.org/2026/10/the-exponential-time-refutation.html">Lance Fortnow, The Exponential Time Refutation, Computational Complexity blog (28 October 2026)</a></li>
<li id="src-35"><a href="https://techcrunch.com/?p=3182002">TechCrunch, interview with Ryan Williams on OpenAI's ETH result (27 October 2026)</a></li>
</ol>
</details>
