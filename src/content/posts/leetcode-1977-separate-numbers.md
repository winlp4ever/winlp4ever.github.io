---
title: "LeetCode 1977 — Number of Ways to Separate Numbers"
date: 2026-06-22
description: A good-to-know hard DP problem that blends partition DP, prefix sums, and an LCP table — going from O(n³) to O(n²).
tags: [leetcode, dynamic-programming, algorithms]
---

![Mind map of the solution: split into a strictly non-decreasing sequence, the dp recurrence, prefix-sum and LCP optimizations, and the final O(n²) result](/images/posts/leetcode-1977-separate-numbers/mindmap.png)

A good-to-know DP problem. It's a combination of three classic algorithm techniques — partition DP, prefix sums, and an LCP table — which makes it a fascinating problem to study or to revise.

Let's dive in:

## Problem

Given a string `num` of digits, count how many ways you can split it into a
**non-decreasing list of positive integers** with **no leading zeros**.
Return the count modulo `10^9 + 7`.

- `1 <= num.length <= 3500`
- `num` consists of digits only.

Examples:

| `num`               | answer | valid splits                       |
| ------------------- | ------ | ---------------------------------- |
| `"327"`             | 2      | `327` and `3, 27`                  |
| `"094"`             | 0      | every split has a leading zero     |
| `"9999999999999"`   | 101    | many                               |

---

## First impression

It has vibes of a "dynamic programming" problem from the first moment we look at it. But the constraint of keeping the list non-decreasing makes us feel a bit uneasy. However, it's hard to try a different approach without trying DP first. But why not a naive approach first? Well..

## Why naive enumeration explodes

A string of length `n` has `2^(n-1)` cut patterns. With `n = 3500` that is
astronomical — we need DP. The non-decreasing constraint also depends on the
**length** of the previous chunk, so length has to be part of the state.

---

So let's now try DP.

## DP state

Let

```
dp[i][j] = number of valid splits of num[:i]
           whose last chunk has length exactly j
```

The current chunk occupies `num[start : i]` where `start = i - j`.
It must not start with `'0'`.

With this the **final answer** will be `sum(dp[n][j] for j in 1..n)`.

But what is our recursive formula?

![DP definition, base case, recurrence, and the filled dp table for "114"](/images/posts/leetcode-1977-separate-numbers/dp-state.png)

---

## The transition formula

```
dp[i][j] = sum (dp[i - j][k] * (if num[i - j - k: i - j] <= num[i - j: i]))
```

i hope the formula is clear enough. basically `dp[i][j]` is the sum over `dp[i - j][k]` of which k satisfies condition `num[i - j - k: i - j] <= num[i - j: i]`, which is trivial, because we want non-decreasing values.

From this, we split into two cases based on `k`:

1. **`k < j`** — previous chunk is strictly *shorter*. Two positive integers
   with different digit counts compare by length, so the previous one is
   automatically smaller. **No comparison needed.** Sum over all such `k`:

   ```
   dp[i][j] += dp[start][1] + dp[start][2] + ... + dp[start][j-1]
   ```

2. **`k == j`** — previous chunk is the *same length*. Now we need a true
   string comparison: `num[start-j : start] <= num[start : i]`.

   ```
   if num[start-j : start] <= num[start : i]:
       dp[i][j] += dp[start][j]
   ```

3. **Base case** — `start == 0`. The current chunk is the very first one and
   there is no previous chunk, so `dp[i][j] = 1`.

A naive implementation of this idea

```python
def nbOfWays(num: str) -> int:
    MOD = 10**9 + 7
    n = len(num)
    dp = [[0] * (n + 1) for _ in range(n + 1)]
    dp[0][0] = 1
    for i in range(1, n + 1):
        for j in range(1, i + 1):
            if num[i - j] == '0':            # leading zero, this block is illegal
                continue
            for k in range(min(j, i - j) + 1):
                if k < j or (k == j and num[i-j:i] >= num[i-2*j:i-j]):
                    dp[i][j] = (dp[i][j] + dp[i - j][k]) % MOD
    return sum(dp[n]) % MOD
```

give us O(n^3) time complexity. Not bad. But we wonder if we can do better.

so looking at the solution, what makes it O(n^3) is that we have 3 loops. As our dp array is two-sized array, first two loops is expected. The third one however we can try a bit harder.

Like intuitively we can set `dp[i][j]` to sum of `dp[i - j][k]` with k from `0 -> min(j, i - j)`. Then whether or not we add the case `dp[j][i - j]` is entirely up to whether `num[i-j:i] >= num[i-2*j:i-j]`. Let's optimize each.

---

## Optimization 1 — prefix sums

Define

```
pref[i][j] = dp[i][1] + dp[i][2] + ... + dp[i][j]
```

Now the sum becomes a single lookup:

```
dp[i][j] += pref[start][j-1]
```

Build `pref[i][*]` row-by-row right after finishing all `dp[i][*]`.

---

## Optimization 2 — LCP table for equal-length comparison

In the second part we need to find a better way to compare two length-`j` substrings. Doing it character-by-character
costs `O(j)` and ruins the `O(n^2)` bound.

This is where the **Longest Common Prefix** of every pair of suffixes helps us:

```
lcp[i][j] = length of the longest common prefix of num[i:] and num[j:]
```

Built bottom-up in `O(n^2)`:

```python
for i in range(n - 1, -1, -1):
    for j in range(n - 1, -1, -1):
        if num[i] == num[j]:
            lcp[i][j] = lcp[i + 1][j + 1] + 1
```

Then `num[a:a+L] <= num[b:b+L]` is `O(1)`:

```python
c = lcp[a][b]
return c >= L or num[a + c] < num[b + c]
```

If they agree on the first `c >= L` characters they are equal. Otherwise the
first differing character `num[a+c]` vs `num[b+c]` decides.

![O(1) equal-length comparison via the LCP table, with a worked example on "1234"](/images/posts/leetcode-1977-separate-numbers/lcp-comparison.png)

## Final solution

With these two optimizations, we can now implement the final solution:

```python
def nbOfWays(num: str) -> int:
    MOD = 10**9 + 7
    n = len(num)

    lcp = [[0] * (n + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            if num[i] == num[j]:
                lcp[i][j] = lcp[i + 1][j + 1] + 1

    def ge(i1, l1, i2, l2):
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

---

## Walkthrough: `"327"`

Initial: `num[0] = '3'`, OK to proceed.

| `i` | `j` | `start` | computation                               | `dp[i][j]` |
| --- | --- | ------- | ----------------------------------------- | ---------- |
| 1   | 1   | 0       | base case                                 | 1          |
| 2   | 1   | 1       | `pref[1][0]=0`; equal-len `"3"<="2"`? no  | 0          |
| 2   | 2   | 0       | base case                                 | 1          |
| 3   | 1   | 2       | `pref[2][0]=0`; equal-len `"2"<="7"`? yes, `dp[2][1]=0` | 0 |
| 3   | 2   | 1       | `pref[1][1]=1`; no equal-len (start<j)    | 1          |
| 3   | 3   | 0       | base case                                 | 1          |

Answer = `dp[3][1] + dp[3][2] + dp[3][3] = 0 + 1 + 1 = 2`. ✅

The two surviving splits correspond to:
- `dp[3][2] = 1` → `"3", "27"`
- `dp[3][3] = 1` → `"327"`

---

## Complexity

- LCP table: `O(n^2)` time and space
- DP table + prefix sums: `O(n^2)` time and space
- Total: **`O(n^2)`** time, **`O(n^2)`** space — fine for `n = 3500`.

---

## Common pitfalls

1. **Leading zero in the very first chunk.** If `num[0] == '0'` the answer is
   immediately `0`. Setting `dp[1][1] = 1` unconditionally is a classic bug —
   it sneaks a phantom split for inputs like `"094"` and `"0"`.

2. **Comparison direction.** Non-decreasing means *previous <= current*. Be
   careful which substring is `a` and which is `b` in your `ge` helper.

3. **Only counting previous length `j-1`.** A frequent mistake is
   `dp[i][j] += dp[start][j-1]`, which misses lengths `1..j-2`. Use the prefix
   sum.

4. **Forgetting the `start == 0` base case.** Without it nothing seeds the DP,
   or you bake the seed into `dp[1][1]` and re-hit pitfall #1.

5. **Modular arithmetic.** Take `% MOD` on every additive step. With
   `n = 3500` and 64-bit Python ints this is fine even if you forget mid-loop,
   but make a habit of it.

---

## Mental model in one line

> `dp[i][j]` = "I've finished a chunk of length `j` ending at position `i`";
> a shorter previous chunk is always OK (`pref[i-j][j-1]`), an equal-length
> previous chunk needs an LCP-powered substring compare.

![Prefix-sum optimization recap: the O(n²) solution and how the pieces fit together](/images/posts/leetcode-1977-separate-numbers/prefix-sum-optimization.png)

---

*The visual explainers in this article were created with [dim0.net](https://dim0.net).*
