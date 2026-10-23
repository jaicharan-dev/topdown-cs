---
id: 4-count-primes
title: "204. Count Primes"
description: "Stop testing numbers for primality and start crossing out multiples"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sieve of Eratosthenes</span>

> **Problem Statement:** You are given a number `n`. Count how many prime numbers are smaller than `n`.

```text
Input:  n = 10
Output: 4
```

---

### Picture it

Write out every number from `2` up to `n` on a long strip of paper.

Find the first number not yet crossed out. That is `2`, and it must be prime, because nothing smaller than it crossed it off. Now walk along the strip crossing out every multiple of `2`: `4`, `6`, `8` and so on. None of those can be prime, since each one has `2` as a factor.

The next number still standing is `3`. Prime, for the same reason. Cross out its multiples. Then `5`, then `7`.

When you are done, everything still standing is prime. You never once tested a number to see whether it was prime. You only ever crossed out things you already knew could not be.

---

### How to think about it

The direct approach is to take each number and try dividing it by everything up to its square root. That is a lot of repeated work, and it gets slow quickly.

The sieve turns the problem inside out. Instead of asking "is this number prime", it marks off the numbers that cannot be, and lets the primes be whatever survives. Each composite number gets crossed out by its factors rather than discovered by a test.

Two refinements make it fast, and both are worth being able to explain.

**Start crossing at `p` squared, not at `2p`.** When you get to `5`, the numbers `10`, `15` and `20` have already gone, crossed out by `2` and `3` earlier. In general any multiple of `p` below `p` squared has a smaller factor, so it was already handled. Beginning at `25` skips all that duplicated work.

**Stop sieving once `p` squared reaches `n`.** Beyond that point there is nothing left to cross out, because the first multiple you would start from is already off the end of the strip. Any composite number below `n` must have a factor at or below the square root of `n`, so by then every composite has been caught.

The trade is memory. The strip of paper is a list of `n` flags, which has to exist all at once.

---

### Walking through the example

Take `n = 10`, so the strip runs from `0` to `9` with `0` and `1` crossed out from the start.

1. **`2` is standing**, so it is prime. Start crossing at `2 * 2 = 4`, then `6`, then `8`.
2. **`3` is standing**, so it is prime. Start crossing at `3 * 3 = 9`. That is the only multiple of `3` left, since `6` went already.
3. **`4` would be next**, but `4 * 4 = 16` is past `n`, so the sieving stops.

Still standing: `2`, `3`, `5`, `7`. The answer is `4`.

---

### The code

```python
class Solution:
    def countPrimes(self, n: int) -> int:
        if n < 3:
            return 0

        is_prime = [True] * n
        is_prime[0] = is_prime[1] = False

        p = 2
        while p * p < n:
            if is_prime[p]:
                # everything below p squared already has a smaller factor
                for multiple in range(p * p, n, p):
                    is_prime[multiple] = False
            p += 1

        return sum(is_prime)
```

---

### Time and space complexity

#### Time: $O(n \log \log n)$

That exponent looks alarming and is actually gentle. Here is where it comes from.

Crossing out the multiples of `2` costs about `n / 2` steps. The multiples of `3` cost about `n / 3`. The multiples of `5` cost about `n / 5`. Adding up `1/p` across all the primes up to `n` grows like $\log \log n$, so the total work is about `n` times that.

The practical point is that $\log \log n$ barely moves. For a million it is under three. So the sieve behaves like a small constant multiple of `n`, which is why it comfortably beats testing each number individually.

#### Space: $O(n)$

One flag for every number below `n`, all held at once. This is the real cost of the sieve, and the thing to mention if asked about very large inputs: counting primes below a trillion is not a memory budget most machines have.

---

### Remember this

Do not test numbers for primality, cross out multiples instead and keep whatever survives. Start crossing at `p` squared, because everything below it was already crossed out by a smaller factor, and stop sieving once `p` squared passes `n`. $O(n \log \log n)$ time, which behaves almost like $O(n)$, and $O(n)$ space for the flags.
