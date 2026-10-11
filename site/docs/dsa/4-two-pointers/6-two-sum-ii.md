---
id: 6-two-sum-ii
title: "167. Two Sum II - Input Array Is Sorted"
description: "Inward-converging two pointers leveraging monotonicity for O(1) space"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Two Pointers</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Opposite Ends</span>

> **Problem Statement:** Given a 1-indexed array of integers `numbers` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific `target` number. Return the indices of the two numbers, `index1` and `index2`, added by one as an integer array `[index1, index2]` of length 2. You may not use the same element twice. Your solution must use only constant extra space.

```text
Input:  numbers = [2, 7, 11, 15], target = 9
Output: [1, 2]
Explanation: The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2. We return [1, 2].
```

---

### The Intuitive Mental Model

In the classic Two Sum problem, the array is unsorted, requiring an $O(n)$ auxiliary hash map to achieve linear time. Here, the input array is already sorted, and the prompt strictly forbids auxiliary memory.

#### Brute Force: Binary Search Complement Lookup
Because the array is sorted, we could iterate through each element `numbers[i]` and perform a binary search for `target - numbers[i]` across the remaining elements to the right. While this adheres to the $O(1)$ auxiliary space constraint, it takes $O(n \log n)$ time.

#### Optimal Approach: Two Pointers from Opposite Ends
Sorting gives the array a monotonic property: moving right increases values, while moving left decreases values. We can exploit this with two converging pointers:
- Place `left` at the start (`0`) and `right` at the end (`len(numbers) - 1`).
- Compute `curr_sum = numbers[left] + numbers[right]`.
- If `curr_sum < target`: The sum is too small. Because `numbers[right]` is already the largest candidate available, pairing `numbers[left]` with any smaller number would produce an even smaller sum. Hence `numbers[left]` cannot be part of the solution. Increment `left += 1`.
- If `curr_sum > target`: The sum is too large. Because `numbers[left]` is the smallest candidate available, pairing `numbers[right]` with any larger number would produce an even larger sum. Hence `numbers[right]` cannot be part of the solution. Decrement `right -= 1`.
- If `curr_sum == target`: Return `[left + 1, right + 1]`.

Each step eliminates at least one candidate number without skipping any valid combinations.

#### Execution Walkthrough

Let us trace `numbers = [2, 7, 11, 15]`, `target = 9`:

| Step | `left` (`numbers[left]`) | `right` (`numbers[right]`) | Current Sum | Comparison to Target (9) | Action Taken |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `0` (`2`) | `3` (`15`) | $2 + 15 = 17$ | $17 > 9$ (Too large) | Decrement `right -> 2` |
| **2** | `0` (`2`) | `2` (`11`) | $2 + 11 = 13$ | $13 > 9$ (Too large) | Decrement `right -> 1` |
| **3** | `0` (`2`) | `1` (`7`) | $2 + 7 = 9$ | $9 == 9$ (Match!) | Return `[0 + 1, 1 + 1] = [1, 2]` |

---

### Step-by-Step Algorithm

1. **Initialize Two Pointers:** Set `left = 0` and `right = len(numbers) - 1`.
2. **Loop While Pointers Do Not Cross:** Continue while `left < right`:
   - Compute `curr_sum = numbers[left] + numbers[right]`.
   - If `curr_sum == target`, return `[left + 1, right + 1]`.
   - If `curr_sum < target`, increment `left += 1`.
   - If `curr_sum > target`, decrement `right -= 1`.
3. **Fallback:** Return an empty list if no pair is found (the problem guarantees exactly one solution).

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Two Pointers" default>

```python
class Solution:
    def twoSum(self, numbers: list[int], target: int) -> list[int]:
        left = 0
        right = len(numbers) - 1

        while left < right:
            curr_sum = numbers[left] + numbers[right]

            if curr_sum == target:
                # Problem requires 1-indexed output
                return [left + 1, right + 1]
            elif curr_sum < target:
                left += 1
            else:
                right -= 1

        return []
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Binary Search">

```python
class Solution:
    def twoSum(self, numbers: list[int], target: int) -> list[int]:
        n = len(numbers)
        for i in range(n):
            complement = target - numbers[i]
            # Binary search for complement in numbers[i + 1:]
            low, high = i + 1, n - 1
            while low <= high:
                mid = (low + high) // 2
                if numbers[mid] == complement:
                    return [i + 1, mid + 1]
                elif numbers[mid] < complement:
                    low = mid + 1
                else:
                    high = mid - 1

        return []
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Binary Search** | $O(n \log n)$ | $O(1)$ | Performs binary search for each complement. Achieves constant space but runs in superlinear time. |
| **Two Pointers** | $O(n)$ | $O(1)$ | Inward-converging pointers prune candidates monotonically in a single linear pass with constant extra space. |

---

### Common Pitfall: Returning 0-Indexed Values

Because standard Python array indexing begins at `0`, it is easy to forget that this problem explicitly requires 1-indexed output values (`[index1, index2]`). Forgetting to add `+ 1` to both pointer indices causes an immediate off-by-one test failure.

---

### Concise Interview Takeaway

For **Two Sum II**, take advantage of the sorted input array by placing pointers at the two boundaries. Adjusting `left` upward increases the sum while adjusting `right` downward decreases it, enabling a deterministic monotonic search in $O(n)$ time and strictly $O(1)$ space without a hash map.
