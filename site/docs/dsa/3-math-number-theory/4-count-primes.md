---
id: 4-count-primes
title: "204. Count Primes"
description: "The Sieve of Eratosthenes with square-start optimization"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Math & Number Theory</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Sieve of Eratosthenes</span>

> **Problem Statement:** Given an integer `n`, return the number of prime numbers that are strictly less than `n`.

```text
Input:  n = 10
Output: 4
Explanation: There are 4 prime numbers strictly less than 10, which are 2, 3, 5, and 7.
```

---

### The Intuitive Mental Model

Counting prime numbers less than `n` requires distinguishing primes from composite numbers efficiently.

#### Brute Force: Trial Division
The most straightforward approach is to test each candidate integer from `2` up to `n - 1`. For each candidate `i`, check whether any integer from `2` up to $\lfloor\sqrt{i}\rfloor$ divides `i` evenly.

While each individual primality check runs in $O(\sqrt{i})$ time, repeating this test for all $n$ candidates requires $O(n \sqrt{n})$ total time. For $n = 5,000,000$, $n \sqrt{n} \approx 1.1 \times 10^{10}$ operations, which inevitably triggers a Time Limit Exceeded (TLE) error.

#### Optimal Approach: Sieve of Eratosthenes
Instead of testing each number independently, the Sieve of Eratosthenes eliminates composites in bulk by crossing out multiples of known primes.

1. Create a boolean lookup table `is_prime` initialized to `True` for all indices.
2. Start at $p = 2$. Because 2 is prime, all multiples of 2 ($4, 6, 8, 10, \dots$) must be composite, so mark them `False`.
3. Proceed to the next unmarked number ($p = 3$). Mark all multiples of 3 ($9, 12, 15, \dots$) as `False`.
4. Continue this process. Any number that remains `True` when reached is prime.

Two critical mathematical optimizations make this sieve exceptionally fast:
- **Stop outer loop at $\sqrt{n}$:** Any composite number $\le n$ must have at least one prime factor $\le \sqrt{n}$. Once $p > \sqrt{n}$, all composites have already been crossed out.
- **Start inner loop at $p^2$:** When crossing out multiples of $p$, any multiple $k \cdot p$ where $k < p$ has already been marked by a smaller prime factor $k$. The first multiple that requires crossing is $p \cdot p = p^2$.

#### Execution Walkthrough

Let us trace the sieve for $n = 10$:

Initial state: indices 0 and 1 are `False`, indices 2 through 9 are `True`.
Since $\sqrt{10} \approx 3.16$, the outer loop checks $p = 2$ and $p = 3$.

| Step | Prime Candidate $p$ | Multiples Marked (`p*p, p*p + p, ... < n`) | Indices Flipped to `False` | Remaining Primes Below $n$ |
| :---: | :---: | :---: | :---: | :--- |
| **1** | `2` | $2^2 = 4, 4+2=6, 6+2=8$ | `4, 6, 8` | `2, 3, 5, 7, 9` |
| **2** | `3` | $3^2 = 9$ | `9` | `2, 3, 5, 7` |
| **End** | - | Outer loop terminates ($p > \sqrt{10}$) | - | Count = `4` (primes: `2, 3, 5, 7`) |

---

### Step-by-Step Algorithm

1. **Guard Edge Cases:** If `n <= 2`, return `0` because no primes exist strictly less than 2.
2. **Initialize Sieve Array:** Create a boolean list `is_prime` of length `n`, initialized to `True`. Mark `is_prime[0] = is_prime[1] = False`.
3. **Sift Multiples up to $\sqrt{n}$:** Iterate $p$ from `2` up to $\lfloor\sqrt{n}\rfloor$:
   - If `is_prime[p]` is `True`:
     - Cross out all multiples starting from $p \cdot p$ up to $n$ with step $p$:  
       `is_prime[p * p : n : p] = [False] * len(range(p * p, n, p))`.
4. **Sum Prime Survivors:** Count all remaining `True` values using `sum(is_prime)` and return the total.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Sieve of Eratosthenes" default>

```python
class Solution:
    def countPrimes(self, n: int) -> int:
        if n <= 2:
            return 0

        # Step 1: Initialize sieve table
        is_prime = [True] * n
        is_prime[0] = is_prime[1] = False

        # Step 2: Sieve only up to sqrt(n)
        for p in range(2, int(n**0.5) + 1):
            if is_prime[p]:
                # Cross out multiples starting from p * p
                is_prime[p * p : n : p] = [False] * len(range(p * p, n, p))

        # Step 3: Count remaining prime survivors
        return sum(is_prime)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Trial Division">

```python
class Solution:
    def countPrimes(self, n: int) -> int:
        if n <= 2:
            return 0

        def is_prime_number(val: int) -> bool:
            for d in range(2, int(val**0.5) + 1):
                if val % d == 0:
                    return False
            return True

        count = 0
        for i in range(2, n):
            if is_prime_number(i):
                count += 1

        return count
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Trial Division** | $O(n \sqrt{n})$ | $O(1)$ | Tests each candidate independently up to its square root. Minimal memory, but triggers TLE on large constraints. |
| **Sieve of Eratosthenes** | $O(n \log \log n)$ | $O(n)$ | Marks composites in bulk using a boolean array. Trades $O(n)$ space for near-linear runtime. |

---

### Common Pitfall: Starting Composite Marking at 2p

Starting the inner crossing loop at $2p$ rather than $p^2$ causes redundant work. For example, for $p = 7$, multiples like $14$, $21$, $28$, $35$, and $42$ have already been crossed out by $2$, $3$, and $5$. Starting at $p^2 = 49$ eliminates repeated writes. Another pitfall is running the outer loop all the way to $n$ instead of $\lfloor\sqrt{n}\rfloor$, which introduces unnecessary loop cycles.

---

### Concise Interview Takeaway

Do not test numbers for primality individually. Use the Sieve of Eratosthenes to eliminate composites in bulk. By terminating the outer loop at $\lfloor\sqrt{n}\rfloor$ and starting inner multiple marking at $p^2$, the time complexity drops from $O(n \sqrt{n})$ down to $O(n \log \log n)$, which runs almost linearly even for inputs in the millions.
