---
id: 11-median-of-two-sorted-arrays
title: "4. Median of Two Sorted Arrays"
description: "Binary search on the partition cut of the smaller array"
sidebar_position: 11
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Binary Search</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Partition Cut</span>

> **Problem Statement:** Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays. The overall run time complexity should be $O(\log(m + n))$.

```text
Input:  nums1 = [1, 3], nums2 = [2]
Output: 2.0
Explanation: Merged array = [1, 2, 3] and median is 2.0.
```

---

### The Intuitive Mental Model

Merging the two arrays takes $O(m + n)$ time and space, which violates the strict $O(\log(m + n))$ requirement. To achieve logarithmic time, do not search for specific values: binary search for the partition cut that splits both arrays simultaneously.

#### Brute Force: Two-Pointer Merge
Merge both arrays into a single combined sorted list of size $m + n$ and return the middle element (or average of two middle elements). This requires $O(m + n)$ time and $O(m + n)$ auxiliary memory.

#### Optimal Approach: Binary Search on the Partition Cut
The median divides the combined elements into two equal halves: a Left Half and a Right Half.

If the total number of elements is $m + n$, the Left Half must contain:
$$\text{half} = \lfloor \frac{m + n + 1}{2} \rfloor \quad \text{elements}$$

If we place a cut in array $A$ contributing $i$ elements to the Left Half, array $B$ must contribute the rest:
$$j = \text{half} - i \quad \text{elements}$$

Because arrays $A$ and $B$ are individually sorted, we only need to verify the four cross-boundary values around the cut:
- $A_{\text{left}} \le B_{\text{right}}$
- $B_{\text{left}} \le A_{\text{right}}$

When both conditions hold, every element in the Left Half is smaller than or equal to every element in the Right Half:
- **Odd Total Elements:** The median is $\max(A_{\text{left}}, B_{\text{left}})$.
- **Even Total Elements:** The median is the average:
  $$\frac{\max(A_{\text{left}}, B_{\text{left}}) + \min(A_{\text{right}}, B_{\text{right}})}{2.0}$$

If $A_{\text{left}} > B_{\text{right}}$, array $A$ contributed too many elements to the left partition: move the cut left (`high = i - 1`). If $B_{\text{left}} > A_{\text{right}}$, array $A$ contributed too few elements: move the cut right (`low = i + 1`). Running binary search exclusively on the shorter array guarantees $j \ge 0$ and optimizes runtime to $O(\log(\min(m, n)))$.

#### Execution Walkthrough

Let us trace `nums1 = [1, 3]` ($m = 2$) and `nums2 = [2]` ($n = 1$). Swap arrays so $A = [2]$ (length 1) and $B = [1, 3]$ (length 2): `total = 3`, `half = 2`. Initial cut range for $A$: `low = 0`, `high = 1`.

| Step | `low` | `high` | $i$ | $j$ | $A_{\text{left}}$ | $A_{\text{right}}$ | $B_{\text{left}}$ | $B_{\text{right}}$ | Valid? | Action Taken | Search Window |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | `0` | `1` | `0` | `2` | $-\infty$ | `2` | `3` | $+\infty$ | No ($3 > 2$) | $B_{\text{left}} > A_{\text{right}}$: `low = i + 1` | `[1, 1]` |
| **2** | `1` | `1` | `1` | `1` | `2` | $+\infty$ | `1` | `3` | Yes | Valid partition found | `[1, 1]` |

Because total elements is odd (3), the median is $\max(A_{\text{left}}, B_{\text{left}}) = \max(2, 1) = 2.0$.

---

### Step-by-Step Algorithm

1. **Ensure Array $A$ is Shorter:** If `len(nums1) > len(nums2)`, swap them so $A$ is the shorter array.
2. **Initialize Range and Target Half:**
   - Let `total = len(A) + len(B)` and `half = (total + 1) // 2`.
   - Set cut bounds: `low = 0` and `high = len(A)`.
3. **Execute Partition Search:** While `low <= high`:
   - Compute cuts: `i = low + (high - low) // 2` and `j = half - i`.
   - Extract boundary values using sentinels $\pm\infty$:
     - `a_left = A[i - 1]` if `i > 0` else $-\infty$
     - `a_right = A[i]` if `i < len(A)` else $+\infty$
     - `b_left = B[j - 1]` if `j > 0` else $-\infty$
     - `b_right = B[j]` if `j < len(B)` else $+\infty$
   - Validate partition:
     - If `a_left <= b_right` and `b_left <= a_right`:
       - If `total % 2 != 0`: return `float(max(a_left, b_left))`.
       - Else: return `(max(a_left, b_left) + min(a_right, b_right)) / 2.0`.
     - Else if `a_left > b_right`: move cut left with `high = i - 1`.
     - Else: move cut right with `low = i + 1`.
4. **Fallback:** Return `0.0`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Binary Search on Partition Cut" default>

```python
class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        A, B = nums1, nums2

        # Ensure A is the smaller array to guarantee O(log(min(m, n)))
        if len(A) > len(B):
            A, B = B, A

        total = len(A) + len(B)
        half = (total + 1) // 2
        low, high = 0, len(A)

        while low <= high:
            i = low + (high - low) // 2  # Partition cut in A
            j = half - i                  # Partition cut in B

            # Assign boundary values with +/- infinity sentinels for edge cuts
            a_left = A[i - 1] if i > 0 else float("-inf")
            a_right = A[i] if i < len(A) else float("inf")
            b_left = B[j - 1] if j > 0 else float("-inf")
            b_right = B[j] if j < len(B) else float("inf")

            # Check if partition correctly divides left and right halves
            if a_left <= b_right and b_left <= a_right:
                # Odd total: median is the maximum of the left partition
                if total % 2 != 0:
                    return float(max(a_left, b_left))
                # Even total: median is the average of the two middle elements
                return (max(a_left, b_left) + min(a_right, b_right)) / 2.0
            elif a_left > b_right:
                # A contributed too many elements to the left half; move cut left
                high = i - 1
            else:
                # A contributed too few elements to the left half; move cut right
                low = i + 1

        return 0.0
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Two-Pointer Merge">

```python
class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        merged: list[int] = []
        i, j = 0, 0
        m, n = len(nums1), len(nums2)

        while i < m and j < n:
            if nums1[i] <= nums2[j]:
                merged.append(nums1[i])
                i += 1
            else:
                merged.append(nums2[j])
                j += 1

        while i < m:
            merged.append(nums1[i])
            i += 1
        while j < n:
            merged.append(nums2[j])
            j += 1

        total = m + n
        if total % 2 != 0:
            return float(merged[total // 2])
        return (merged[total // 2 - 1] + merged[total // 2]) / 2.0
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Two-Pointer Merge** | $O(m + n)$ | $O(m + n)$ | Merges elements sequentially. Intuitive, but violates logarithmic runtime requirements. |
| **Partition Binary Search** | $O(\log(\min(m, n)))$ | $O(1)$ | Binary searches cut position on the smaller array. Computes the median directly in logarithmic time and constant space. |

---

### Common Pitfall: Partitioning Without Swapping the Shorter Array

Running binary search on the longer array can cause cut $j = \text{half} - i$ to evaluate to negative indices or out-of-bounds positions when $i$ spans the larger range. Swapping the arrays ensures $len(A) \le len(B)$, which guarantees $j \ge 0$ throughout all iterations and optimizes time complexity to $O(\log(\min(m, n)))$. Another pitfall is handling odd versus even total lengths with separate integer divisions instead of the unified `(total + 1) // 2`.

---

### Concise Interview Takeaway

Partition the combined elements into equal halves by binary searching the cut index on the smaller array. A partition is valid when cross-boundaries satisfy $A_{\text{left}} \le B_{\text{right}}$ and $B_{\text{left}} \le A_{\text{right}}$, delivering optimal $O(\log(\min(m, n)))$ time and $O(1)$ space.
