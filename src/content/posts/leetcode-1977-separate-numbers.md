---
title: "LeetCode 1977: number of ways to separate numbers"
date: 2026-06-22
updated: 2026-10-06
description: A hard DP that's worth knowing, because it stacks three classics in one problem. Partition DP, prefix sums and an LCP table take it from O(n³) to O(n²).
tags: [leetcode, dynamic-programming, algorithms]
category: algo
glyph: dp
figures: 5
math: true
---

I like this one because it's three classic techniques stacked on top of each other: partition DP, prefix sums, and a longest-common-prefix table. Each one is simple on its own. Together they turn something that looks hopeless into a clean O(n²) solution, and it's a nice problem to come back to when you want to revise all three at once.

## the problem

You get a string `num` of digits. Count the ways to cut it into a **non-decreasing list of positive integers** where no number has a leading zero. Return the count modulo `10^9 + 7`.

- `1 <= num.length <= 3500`
- `num` is digits only

| `num`             | answer | the valid splits               |
| ----------------- | ------ | ------------------------------ |
| `"327"`           | 2      | `327` and `3, 27`              |
| `"094"`           | 0      | every split has a leading zero |
| `"9999999999999"` | 101    | lots                           |

Before any algorithm, it helps to play with it. Every gap between two digits is a place where you can cut or not.

<figure class="wide">
<lc-cuts data-fig data-label="fig 1 · cut it yourself">
<p class="fallback">The digits 1 2 1 3 1 4 with a clickable gap between each pair. Cutting after the 2 and after the 3 gives 12, 13, 14, which is non-decreasing and valid. A row of 32 dots stands for every possible cut pattern; 8 of them are green, the valid ones.</p>
</lc-cuts>
<figcaption><b>fig 1</b>Click the gaps, or type your own digits (up to 12). Each dot at the bottom is one cut pattern and green means valid. The count is computed for real, by brute force, every time you change something.</figcaption>
</figure>

## first impression

It smells like dynamic programming from the first read. The non-decreasing rule is what made me uneasy, because whether a cut is allowed depends on the chunk before it, not just on where you are. Still, it's hard to think of anything else here before trying DP. But why not brute force first? Well.

## why brute force explodes

A string of length `n` has `n − 1` gaps, so `2^(n-1)` cut patterns. Fig 1 can afford to check every one of them because it stops at 12 digits. At `n = 3500` the number of patterns has over a thousand digits.

<figure class="wide">
<lc-explode data-fig data-label="fig 2 · how big is big">
<p class="fallback">A chart of how many digits the operation count has as n grows from 1 to 3500. The 2^(n-1) line climbs straight to 1,054 digits at n = 3500. The n³ and n² lines stay almost flat near zero. At n = 3500 and a billion operations per second, n² takes about 12 ms, n³ about 43 seconds, and 2^(n-1) about 10^1044 seconds.</p>
</lc-explode>
<figcaption><b>fig 2</b>The y axis counts digits, not operations, otherwise nothing would fit. Times assume a billion simple operations per second.</figcaption>
</figure>

There's a second thing to notice. Whether the next chunk is allowed depends on the previous chunk's value, and to compare values you need to know the previous chunk's **length**. So the length has to be part of the state.

## the dp state

Let

```
dp[i][j] = number of valid splits of num[:i]
           whose last chunk has length exactly j
```

The last chunk is `num[start:i]` with `start = i - j`, and it can't start with `'0'`. The answer is everything that ends exactly at the end of the string:

$$
\text{answer} = \sum_{j=1}^{n} dp[n][j]
$$

## the transition

A split ending in the chunk `num[start:i]` is a split of `num[:start]` (whose last chunk has some length `k`) plus this chunk on the end. It's allowed when the previous chunk is not bigger than the current one:

$$
dp[i][j] = \sum_{k} dp[\text{start}][k] \cdot \big[\, \text{num}[\text{start}-k:\text{start}] \le \text{num}[\text{start}:i] \,\big]
$$

The trick is to split that sum by comparing `k` with `j`:

1. **`k < j`**: the previous chunk is shorter. Two positive numbers without leading zeros compare by length first, so a shorter one is always smaller. No comparison needed, every such `k` counts:

   ```
   dp[i][j] += dp[start][1] + ... + dp[start][min(j-1, start)]
   ```

2. **`k == j`**: same length. Now we really have to compare the two strings:

   ```
   if num[start-j : start] <= num[start : i]:
       dp[i][j] += dp[start][j]
   ```

3. **`k > j`**: a longer previous chunk is always bigger. Never allowed, so it's not in the sum at all.

And the base case: when `start == 0` the chunk is the first one and there's nothing before it. Seeding `dp[0][0] = 1` makes that fall out of the same formula, since the "shorter previous chunk" sum then picks up `dp[0][0]`.

Written straight from that, with no cleverness:

```python
def nbOfWays(num: str) -> int:
    MOD = 10**9 + 7
    n = len(num)
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    dp[0][0] = 1
    for i in range(1, n + 1):
        for j in range(1, i + 1):
            if num[i - j] == '0':            # leading zero, this chunk is illegal
                continue
            for k in range(min(j, i - j) + 1):
                if k < j or num[i-j:i] >= num[i-2*j:i-j]:
                    dp[i][j] = (dp[i][j] + dp[i - j][k]) % MOD
    return sum(dp[n]) % MOD
```

Here's that table filling up, cell by cell. Each cell only ever reads from one earlier row: a run of shorter cells (green) and at most one same-length cell (ochre).

<figure class="wide">
<lc-table data-fig data-label="fig 3 · the table">
<p class="fallback">The dp table for "327" filling in. dp[1][1] = 1 (first chunk "3"). dp[2][1] = 0 because "3" ≤ "2" is false. dp[2][2] = 1 ("32"). dp[3][1] = 0, dp[3][2] = 1 because the previous chunk "3" is shorter than "27", and dp[3][3] = 1 ("327"). The answer is the sum of the last row, 0 + 1 + 1 = 2.</p>
</lc-table>
<figcaption><b>fig 3</b>Pick a string and scrub through it. The green outline is the run of shorter previous chunks, the ochre one is the single same-length chunk, and the underlines show both chunks in the string. Try <code>"094"</code> to watch the leading zero kill everything.</figcaption>
</figure>

That's O(n³): two loops for the table, which we can't avoid, and a third loop over `k`. The third one is where we can do better, and the two cases above each get their own fix.

## optimisation 1: prefix sums

Case 1 sums a run of cells from the same row, `dp[start][1..j-1]`, and we do that for every `(i, j)`. That's the same additions over and over. Keep a running total of each row instead:

```
pre[i][j] = dp[i][0] + dp[i][1] + ... + dp[i][j]
```

and case 1 becomes a single lookup, `pre[start][min(j-1, start)]`. You fill `pre[i][j]` right after `dp[i][j]`, so it's always ready by the time a later row needs it.

<figure class="wide">
<lc-prefix data-fig data-label="fig 4 · prefix sums">
<p class="fallback">Row 6 of the dp table for "111111111111" is 1, 3, 3, 2, 1, 1, and its running sum row is 1, 4, 7, 9, 10, 11. The shorter-chunk part of dp[11][5] needs the first four cells: the naive version adds 1 + 3 + 3 + 2 = 9, the prefix version reads one cell, pre[6][4] = 9.</p>
</lc-prefix>
<figcaption><b>fig 4</b>A real row from the table for twelve 1s. The running sum costs one addition per cell once, and after that any "sum of the first j−1 cells" is a single read.</figcaption>
</figure>

## optimisation 2: an LCP table for the equal-length compare

Case 2 compares two strings of length `j`. Character by character that's O(j), which puts us back at O(n³) in the worst case. The fix is to precompute, for every pair of starting positions, how far the two suffixes agree:

```
lcp[a][b] = length of the longest common prefix of num[a:] and num[b:]
```

It fills from the bottom-right corner in O(n²), because if `num[a] == num[b]` then the answer is one more than for the next pair:

```python
for a in range(n - 1, -1, -1):
    for b in range(n - 1, -1, -1):
        if num[a] == num[b]:
            lcp[a][b] = lcp[a + 1][b + 1] + 1
```

Then comparing `num[a:a+L]` with `num[b:b+L]` is O(1):

```python
c = lcp[a][b]
return c >= L or num[a + c] < num[b + c]      # num[a:a+L] <= num[b:b+L]
```

If the two agree on at least `L` characters they're equal. Otherwise the first character where they differ decides everything.

<figure class="wide">
<lc-lcp data-fig data-label="fig 5 · lcp table">
<p class="fallback">The 7 by 7 LCP table for "3123124", filled from the bottom-right corner, each matching cell copying its lower-right neighbour plus one. Then three comparisons: num[1:4] = "123" and num[4:7] = "124" share 2 characters and differ at 3 vs 4, so the first is smaller; "312" and "312" share all 3, so they are equal; "24" vs "23" share 1 and then 4 beats 3.</p>
</lc-lcp>
<figcaption><b>fig 5</b>The table for <code>"3123124"</code>. After it fills, click any cell to compare the two suffixes it describes, trimmed to the same length.</figcaption>
</figure>

## the final solution

Both fixes together:

```python
def nbOfWays(num: str) -> int:
    MOD = 10**9 + 7
    n = len(num)

    lcp = [[0] * (n + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            if num[i] == num[j]:
                lcp[i][j] = lcp[i + 1][j + 1] + 1

    def ge(i1, l1, i2, l2):                 # num[i1:i1+l1] >= num[i2:i2+l2]
        if l1 != l2:
            return l1 > l2
        k = lcp[i1][i2]
        return k >= l1 or num[i1 + k] >= num[i2 + k]

    dp  = [[0] * (n + 1) for _ in range(n + 1)]
    pre = [[0] * (n + 1) for _ in range(n + 1)]
    dp[0][0] = 1
    pre[0][0] = 1

    for i in range(1, n + 1):
        for j in range(1, i + 1):
            if num[i - j] != '0':
                dp[i][j] = pre[i - j][min(j - 1, i - j)]
                if j <= i - j and ge(i - j, j, i - 2 * j, j):
                    dp[i][j] += dp[i - j][j]
                    dp[i][j] %= MOD
            pre[i][j] = (pre[i][j - 1] + dp[i][j]) % MOD

    return sum(dp[n]) % MOD
```

I ran it against a brute force that tries every cut pattern, on the examples (`"327"` → 2, `"094"` → 0, `"0"` → 0, `"9999999999999"` → 101) and on 400 random strings up to 12 digits. They all agree, and so does the O(n³) version above.

## walkthrough: "327"

`num[0]` is `'3'`, so we're not dead on arrival.

| `i` | `j` | `start` | what happens                                               | `dp[i][j]` |
| --- | --- | ------- | ---------------------------------------------------------- | ---------- |
| 1   | 1   | 0       | first chunk `"3"`                                          | 1          |
| 2   | 1   | 1       | no shorter chunk; same length: `"3" <= "2"`? no            | 0          |
| 2   | 2   | 0       | first chunk `"32"`                                         | 1          |
| 3   | 1   | 2       | no shorter chunk; same length: `"2" <= "7"`? yes, but `dp[2][1] = 0` | 0 |
| 3   | 2   | 1       | shorter: `pre[1][1] = 1`; same length: no room             | 1          |
| 3   | 3   | 0       | first chunk `"327"`                                        | 1          |

Answer: `dp[3][1] + dp[3][2] + dp[3][3] = 0 + 1 + 1 = 2`. The two that survive are `dp[3][2]`, which is `3, 27`, and `dp[3][3]`, which is `327`. This is the same run as fig 3 with `"327"` picked.

## complexity

- LCP table: O(n²) time and space
- dp and prefix tables: O(n²) time and space
- total O(n²), about 12 million cells at `n = 3500`, which is fine (fig 2 has the numbers)

## the bugs I'd watch for

1. **A leading zero in the very first chunk.** If `num[0] == '0'` the answer is 0. Hard-coding `dp[1][1] = 1` as the seed is the classic way to get this wrong, it sneaks in a fake split for `"094"` and `"0"`. Seeding `dp[0][0] = 1` and letting the zero check run avoids it.
2. **The comparison direction.** Non-decreasing means previous ≤ current. Be careful which substring goes first in `ge`.
3. **Only adding `dp[start][j-1]`.** It looks like "the shorter case", but it misses lengths `1..j-2`. That's what the prefix sum is for.
4. **Forgetting the `min(j-1, start)` cap.** The previous chunk can't be longer than what's left before `start`.
5. **Skipping the modulo.** Python ints never overflow, so forgetting `% MOD` mid-loop still gives the right answer here, just with enormous numbers and a slower run. In Java or C++ it overflows and you get garbage. Take it on every addition.

## the whole thing in one line

`dp[i][j]` means "I just finished a chunk of length `j` at position `i`". A shorter previous chunk is always fine, so add the prefix sum `pre[i-j][min(j-1, i-j)]`. An equal-length one needs a real comparison, and the LCP table makes that comparison one lookup.
