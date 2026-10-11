---
id: 7-3sum
title: "15. 3Sum"
description: "Sorting, fixed anchor, and two-pointer search with duplicate pruning"
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Opposite Ends</span>

> **Problem Statement:** Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`. Notice that the solution set must not contain duplicate triplets.

```text
Input:  nums = [-1, 0, 1, 2, -1, -4]
Output: [[-1, -1, 2], [-1, 0, 1]]
Explanation: The distinct triplets that sum to 0 are [-1, -1, 2] and [-1, 0, 1].
```

---

### The Intuitive Mental Model

Finding three numbers that sum to zero means finding pairs that satisfy an arithmetic relationship:

$$nums[i] + nums[j] + nums[k] = 0 \iff nums[j] + nums[k] = -nums[i]$$

#### Brute Force: Three Nested Loops with Hash Set
The naive approach tests every combination of three indices with three nested loops. To eliminate duplicate triplets, each valid triplet must be sorted and placed into a hash set. This cubic $O(n^3)$ runtime quickly exceeds time limits on large inputs.

#### Optimal Approach: Sort and Two Pointers per Anchor
If we sort `nums` in ascending order, we can fix each element `nums[i]` as an anchor, turning the remaining problem into **Two Sum II**:
- For each fixed anchor `nums[i]`, find two numbers in the remaining subarray `nums[i + 1:]` that sum to `-nums[i]`.
- Place `left = i + 1` and `right = len(nums) - 1`.
- If the three numbers sum to less than 0, advance `left += 1` to increase the total.
- If the three numbers sum to greater than 0, decrement `right -= 1` to decrease the total.
- If the sum equals 0, record the triplet.

To avoid duplicate triplets without using extra memory for a set:
1. **Deduplicate the Anchor:** If `i > 0 and nums[i] == nums[i - 1]`, skip iteration `i` because all valid triplets using this value were already generated.
2. **Early Termination:** If `nums[i] > 0`, stop searching. In a sorted array, if the anchor is positive, all subsequent elements are also positive, making a zero sum impossible.
3. **Deduplicate the Pointers:** After finding a match, advance `left` past any identical values and decrement `right` past any identical values before continuing.

#### Execution Walkthrough

Let us trace `nums = [-1, 0, 1, 2, -1, -4]`.  
After sorting: `[-4, -1, -1, 0, 1, 2]`.

| Step | Anchor `i` (`nums[i]`) | `left` (`nums[left]`) | `right` (`nums[right]`) | Triplet Sum | Action Taken | Discovered Triplets |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `0` (`-4`) | `1` (`-1`) | `5` (`2`) | $-4 + (-1) + 2 = -3 < 0$ | Sum too small; advance `left -> 2` | `[]` |
| **2** | `0` (`-4`) | `4` (`1`) | `5` (`2`) | $-4 + 1 + 2 = -1 < 0$ | Pointers cross; finish anchor `i = 0` | `[]` |
| **3** | `1` (`-1`) | `2` (`-1`) | `5` (`2`) | $-1 + (-1) + 2 = 0$ | Match! Record triplet, skip duplicates | `[[-1, -1, 2]]` |
| **4** | `1` (`-1`) | `3` (`0`) | `4` (`1`) | $-1 + 0 + 1 = 0$ | Match! Record triplet, skip duplicates | `[[-1, -1, 2], [-1, 0, 1]]` |
| **5** | `2` (`-1`) | - | - | - | `nums[2] == nums[1]`; skip duplicate anchor | `[[-1, -1, 2], [-1, 0, 1]]` |
| **6** | `3` (`0`) | `4` (`1`) | `5` (`2`) | $0 + 1 + 2 = 3 > 0$ | Sum too large; finish anchor `i = 3` | `[[-1, -1, 2], [-1, 0, 1]]` |

---

### Step-by-Step Algorithm

1. **Sort the Array:** Sort `nums` in non-decreasing order.
2. **Iterate Anchor `i`:** Loop `i` from `0` to `len(nums) - 3`:
   - If `nums[i] > 0`, break out of the loop (sum can never be zero).
   - If `i > 0 and nums[i] == nums[i - 1]`, skip this anchor to prevent duplicates.
3. **Initialize Two Pointers:** Set `left = i + 1` and `right = len(nums) - 1`.
4. **Scan with Pointers:** While `left < right`:
   - Calculate `total = nums[i] + nums[left] + nums[right]`.
   - If `total < 0`, increment `left += 1`.
   - If `total > 0`, decrement `right -= 1`.
   - If `total == 0`:
     - Append `[nums[i], nums[left], nums[right]]` to the result list.
     - Advance `left` while `left < right and nums[left] == nums[left + 1]`.
     - Decrement `right` while `left < right and nums[right] == nums[right - 1]`.
     - Advance `left += 1` and decrement `right -= 1`.
5. **Return Result:** Return the list of unique triplets.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Sort and Two Pointers" default>

```python
class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        nums.sort()
        res: list[list[int]] = []
        n = len(nums)

        for i in range(n - 2):
            # If the smallest number in the triplet is positive, sum cannot be 0
            if nums[i] > 0:
                break

            # Skip duplicate anchor values
            if i > 0 and nums[i] == nums[i - 1]:
                continue

            left, right = i + 1, n - 1

            while left < right:
                total = nums[i] + nums[left] + nums[right]

                if total < 0:
                    left += 1
                elif total > 0:
                    right -= 1
                else:
                    res.append([nums[i], nums[left], nums[right]])

                    # Skip duplicate numbers for left and right pointers
                    while left < right and nums[left] == nums[left + 1]:
                        left += 1
                    while left < right and nums[right] == nums[right - 1]:
                        right -= 1

                    left += 1
                    right -= 1

        return res
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Nested Loops with Set">

```python
class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        n = len(nums)
        triplets: set[tuple[int, int, int]] = set()

        for i in range(n):
            for j in range(i + 1, n):
                for k in range(j + 1, n):
                    if nums[i] + nums[j] + nums[k] == 0:
                        triplet = tuple(sorted([nums[i], nums[j], nums[k]]))
                        triplets.add(triplet)

        return [list(t) for t in triplets]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Nested Loops with Set** | $O(n^3)$ | $O(n)$ | Tests every triplet and uses a hash set for deduplication. Inefficient for large arrays. |
| **Sort and Two Pointers** | $O(n^2)$ | $O(1)$ | Sorts the array once and runs a two-pointer scan per anchor, pruning duplicates in-place with constant extra memory. |

---

### Common Pitfall: Premature Anchor Deduplication

Checking `if nums[i] == nums[i + 1]` instead of `if i > 0 and nums[i] == nums[i - 1]` is a classic mistake. Looking ahead skips the first occurrence of a number, which destroys valid triplets containing duplicate values (such as `[-1, -1, 2]`). Always process the first occurrence of a value, and skip subsequent occurrences only if `i > 0 and nums[i] == nums[i - 1]`.

---

### Concise Interview Takeaway

For **3Sum**, sort the array and iterate through candidate anchors. For each anchor `nums[i]`, convert the problem into Two Sum II using two pointers over `nums[i + 1:]`. Prune duplicate anchors with `nums[i] == nums[i - 1]` and duplicate pointer values after each match, reducing the runtime from $O(n^3)$ to $O(n^2)$ while using $O(1)$ auxiliary memory.
