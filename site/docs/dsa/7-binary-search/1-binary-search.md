---
id: 1-binary-search
title: "704. Binary Search"
description: "Canonical low/high/mid boundary template for sorted arrays"
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Standard Bisect</span>

> **Problem Statement:** Given a sorted array of integers `nums` in ascending order and a target value `target`, search for `target` within `nums`. If it exists, return its index; otherwise, return `-1`. The solution must run in $O(\log n)$ time.

```text
Input:  nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4
Explanation: 9 exists in nums and its index is 4.
```

---

### The Intuitive Mental Model

Imagine searching for a word in an 800-page dictionary. You do not start from page 1 flipping through every single page; instead, you open the book right in the middle (page 400). If your target word comes alphabetically after the middle word, you immediately discard pages 1 through 400. You repeat this process with the remaining half (pages 401 to 800), opening to page 600.

Because the array is sorted, every single comparison cuts the remaining search space in half. Even with 1,000,000 elements, you find your target in at most 20 comparisons ($\approx \log_2(1{,}000{,}000)$).

#### Brute Force: Linear Scan
Iterate index by index from $0$ to $n - 1$. While it works on any array, it completely ignores the sorted property and takes $O(n)$ time in the worst case when the element is near the end or absent.

#### Optimal Approach: Boundary Halving
Maintain two boundary pointers, `low` and `high`, representing the current inclusive search interval `[low, high]`. In each step, evaluate the midpoint:
- If `nums[mid] == target`, return `mid`.
- If `nums[mid] < target`, the target must reside in the right half: discard the left half by setting `low = mid + 1`.
- If `nums[mid] > target`, the target must reside in the left half: discard the right half by setting `high = mid - 1`.

#### Execution Walkthrough

Let us trace `nums = [-1, 0, 3, 5, 9, 12]` with `target = 9`:

| Step | `low` | `high` | `mid` | `nums[mid]` | Comparison | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `5` | `2` | `3` | `3 < 9` | Discard left half: `low = mid + 1` | `[3, 5]` |
| **2** | `3` | `5` | `4` | `9` | `9 == 9` | Match found! Return index `4` | `[4, 4]` |

---

### Step-by-Step Algorithm

1. **Initialize Boundary Pointers:** Set `low = 0` and `high = len(nums) - 1`, covering the full inclusive range of valid indices.
2. **Execute Search Loop:** While `low <= high`:
   - Compute midpoint: `mid = low + (high - low) // 2` to safely avoid potential integer overflow.
   - If `nums[mid] == target`, immediately return `mid`.
   - If `nums[mid] < target`, move `low = mid + 1`.
   - If `nums[mid] > target`, move `high = mid - 1`.
3. **Handle Not Found:** If the loop terminates with `low > high`, the target does not exist in `nums`. Return `-1`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Iterative Binary Search" default>

```python
class Solution:
    def search(self, nums: list[int], target: int) -> int:
        low, high = 0, len(nums) - 1

        # Search space is inclusive [low, high]
        while low <= high:
            # Prevents 32-bit integer overflow in statically typed languages
            mid = low + (high - low) // 2

            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                low = mid + 1
            else:
                high = mid - 1

        return -1
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Linear Search">

```python
class Solution:
    def search(self, nums: list[int], target: int) -> int:
        for i, val in enumerate(nums):
            if val == target:
                return i
        return -1
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Linear Search** | $O(n)$ | $O(1)$ | Scans elements sequentially. Does not require sorted data, but wastes time when elements are already ordered. |
| **Iterative Binary Search** | $O(\log n)$ | $O(1)$ | Halves the search space on each iteration. Requires sorted input, achieving logarithmic speed with minimal pointer memory. |

---

### Common Pitfall: Boundary Off-By-One and Midpoint Overflow

Two common mistakes break standard binary search:
Using `while low < high` instead of `while low <= high` causes the loop to terminate prematurely when `low == high`, failing to evaluate the single remaining candidate element.
Using `(low + high) // 2` can cause 32-bit signed integer overflow in languages like C++ or Java when `low + high` exceeds $2^{31} - 1$. Calculating `low + (high - low) // 2` avoids this and is the industry-standard habit.

---

### Concise Interview Takeaway

For basic binary search, maintain inclusive bounds `[low, high]` with `while low <= high`. Calculate `mid = low + (high - low) // 2` to avoid integer overflow, and shift pointers past `mid` by 1 to halve the candidate space on each check. This achieves $O(\log n)$ runtime with $O(1)$ space.
