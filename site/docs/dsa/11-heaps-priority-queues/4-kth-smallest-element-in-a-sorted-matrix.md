---
id: 4-kth-smallest-element-in-a-sorted-matrix
title: "378. Kth Smallest Element in a Sorted Matrix"
description: "Guess a value and count what is below it, instead of visiting elements in order"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Heaps & Priority Queues</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search / Min-Heap</span>

> **Problem Statement:** Given a square matrix whose rows and columns are each sorted, return the `k`-th smallest value overall, counting repeats.

```text
Input:  matrix = [[1, 5, 9], [10, 11, 13], [12, 13, 15]], k = 8
Output: 13
```

---

### Picture it

Be careful about what is sorted here. Each row is sorted and each column is sorted, but a row does **not** start where the previous one ended. In the example, row two starts at `10` while row one ends at `9`, which happens to continue, but nothing guarantees it. So this is not one long sorted list, and the flattening trick from Search a 2D Matrix does not apply.

A heap works: start with the first element of each row, repeatedly take the smallest and push the next element from that row, `k` times. It is a direct generalisation of merging sorted lists.

But there is something better, and it comes from asking a different question. Instead of visiting elements in order, **guess a value and count how many elements are at or below it**:

```text
guess:   ... 11  12  13  14 ...
count:        5   6   8   8
```

That count never decreases as the guess rises, which is the single boundary that binary search needs. The answer is the smallest value whose count reaches `k`.

---

### How to think about it

Binary search over the **range of values**, from the top-left corner, which is the smallest, to the bottom-right, which is the largest. These are values in the matrix rather than positions in it, which is the same answer-space idea as Koko Eating Bananas.

**The counting step** is where the sortedness pays off. Start at the bottom-left corner and walk:

- If the current value is at or below the guess, then every value above it in this column is too, so add that whole column segment to the count and step right.
- Otherwise step up.

That walk visits at most one cell per row and column, so counting costs $O(n)$ rather than $O(n^2)$.

Then narrow as usual: if the count reaches `k`, the guess might be the answer, so keep it and search lower; if not, search higher.

**Why the result is always a real matrix value**: the search always settles on the smallest value whose count is at least `k`, and a value not present in the matrix has the same count as the next real value below it, so it can never be the smallest such value.

---

### Walking through the example

The matrix runs from `1` to `15`, and `k` is `8`.

1. **Guess `8`.** Counting gives `2`, namely `1` and `5`. Too few, so search higher.
2. **Guess `11`.** Counting gives `5`. Still too few, so search higher.
3. **Guess `13`.** Counting gives `8`, since `1, 5, 9, 10, 11, 12, 13, 13` are all at or below it. That reaches `k`, so keep `13` and search lower.
4. **Guess `12`.** Counting gives `6`. Too few, so search higher.

The range closes on `13`, which is the answer. Note the two `13`s in the matrix, and that counting repeats is exactly what the problem asks for.

---

### The code

```python
class Solution:
    def kthSmallest(self, matrix: list[list[int]], k: int) -> int:
        n = len(matrix)

        def count_at_most(guess: int) -> int:
            # walk from the bottom-left corner
            count = 0
            row, col = n - 1, 0

            while row >= 0 and col < n:
                if matrix[row][col] <= guess:
                    # this whole column segment is at or below the guess
                    count += row + 1
                    col += 1
                else:
                    row -= 1

            return count

        low, high = matrix[0][0], matrix[n - 1][n - 1]

        while low < high:
            mid = (low + high) // 2

            if count_at_most(mid) >= k:
                high = mid      # might be the answer
            else:
                low = mid + 1

        return low
```

---

### Time and space complexity

#### Time: $O(n \log(\text{value range}))$

Each count walk is $O(n)$, and the binary search runs about as many times as the gap between the smallest and largest values can be halved.

The heap approach is $O(k \log n)$, which is better when `k` is small and worse when `k` approaches `n²`.

#### Space: $O(1)$

The counting walk uses two indices, and the binary search a few more. The heap approach would need $O(n)$.

---

### Remember this

Sorted rows and sorted columns do not make one sorted list, so flattening is wrong here. Binary search the **values** instead and count how many entries fall at or below each guess, walking from the bottom-left corner so the count costs $O(n)$. The answer is the smallest value whose count reaches `k`, which is always a value really present. $O(1)$ space.
