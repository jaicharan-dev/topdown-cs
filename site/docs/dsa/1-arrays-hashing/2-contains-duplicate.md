---
id: 2-contains-duplicate
title: "217. Contains Duplicate"
description: "Hash set membership vs sort-and-compare"
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Arrays & Hashing</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Hash Set</span>

> **Problem Statement:** Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.

```text
Input:  nums = [1, 2, 3, 1]
Output: true
Explanation: The value 1 appears at index 0 and index 3.
```

---

### The Intuitive Mental Model

Imagine you are checking an inventory of items: `nums = [1, 2, 3, 1]`. You need to determine whether any number appears more than once.

#### Brute Force: Checking Every Pair
The most basic approach compares each number against every other subsequent number in the array. You pick the first element, scan the rest of the array for a match, then pick the second element, and repeat. While conceptually simple, comparing every pair requires $O(n^2)$ time. For an array of 100,000 integers, this quadratic approach will time out.

#### Optimal Approach: The Guestbook Hash Set
Instead of repeatedly scanning backwards across previously seen elements, imagine acting as a bouncer keeping a guestbook (a hash set) at the door.

For every incoming number, check if it already exists in your guestbook:
- If the number is already present, you have detected a duplicate. Sound the alarm and return `True` immediately without processing the rest of the array.
- If the number is absent, record it in the guestbook and proceed to the next element.

Because hash set lookups and insertions operate in $O(1)$ average time, this reduces the entire search to a single linear pass.

#### Execution Walkthrough

Let us trace `nums = [1, 2, 3, 1]`:

| Step | Element | In Set (`seen`)? | Action Taken | Hash Set State (`seen`) |
| :---: | :---: | :---: | :--- | :--- |
| **1** | `1` | No | Add `1` to set | `{1}` |
| **2** | `2` | No | Add `2` to set | `{1, 2}` |
| **3** | `3` | No | Add `3` to set | `{1, 2, 3}` |
| **4** | `1` | **Yes** | Duplicate detected! Return `true` | `{1, 2, 3}` |

Because hash set membership checks run in $O(1)$ time, finding the duplicate stops immediately upon encountering the repeated element.

---

### Step-by-Step Algorithm

1. **Handle Base Case:** If `nums` contains 0 or 1 element, return `False` immediately since duplicate pairs are impossible.
2. **Initialize Hash Set:** Create an empty set `seen` to store numbers encountered during iteration.
3. **Iterate Through Elements:** Traverse each `num` in `nums`:
   - If `num` is already in `seen`, return `True` immediately.
   - Otherwise, add `num` to `seen`.
4. **Fallback:** If the loop terminates without encountering a repeated number, return `False`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: One-Pass Hash Set" default>

```python
class Solution:
    def containsDuplicate(self, nums: list[int]) -> bool:
        # Base case: 0 or 1 element cannot contain duplicates
        if len(nums) <= 1:
            return False
            
        seen: set[int] = set()
        
        for num in nums:
            # If the number is already recorded, a duplicate exists
            if num in seen:
                return True
            seen.add(num)
            
        return False
```

  </TabItem>
  <TabItem value="sorting" label="Alternative: Sorting">

```python
class Solution:
    def containsDuplicate(self, nums: list[int]) -> bool:
        nums.sort()
        for i in range(1, len(nums)):
            if nums[i] == nums[i - 1]:
                return True
                
        return False
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Sorting** | $O(n \log n)$ | $O(1)$ or $O(n)$ | Sorts the array in place and checks adjacent elements. Avoids auxiliary set memory, but mutates input and runs slower. |
| **One-Pass Hash Set** | $O(n)$ | $O(n)$ | Traverses the list once with $O(1)$ average set operations. Enables instant early termination on finding duplicates. |

---

### Common Pitfall: The Set Conversion One-Liner

A common Python idiom is `return len(nums) != len(set(nums))`. While syntactically compact, this construct cannot terminate early. If duplicate elements occur at index 0 and 1 in an array of one million values, `set(nums)` must still iterate over all one million elements and allocate memory for the full set before evaluating lengths. The manual loop terminates in $O(1)$ time upon finding the early duplicate.

---

### Concise Interview Takeaway

For **Contains Duplicate**, use a hash set to record elements during a single linear scan. Return `True` immediately the moment an element already exists in the set. Avoid naive whole-collection conversions like `len(nums) != len(set(nums))` in latency-sensitive environments where early exit behavior is desirable.
