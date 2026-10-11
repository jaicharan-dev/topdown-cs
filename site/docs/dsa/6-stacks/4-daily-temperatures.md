---
id: 4-daily-temperatures
title: "739. Daily Temperatures"
description: "Monotonic decreasing stack of day indices tracking warmer days in O(n)"
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Stacks</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Monotonic Stack</span>

> **Problem Statement:** Given an array of integers `temperatures` representing daily temperatures, return an array `answer` such that `answer[i]` is the number of days you must wait after the $i$-th day to get a warmer temperature. If there is no future day that is warmer, set `answer[i] = 0`.

```text
Input:  temperatures = [73, 74, 75, 71, 69, 72, 76, 73]
Output: [1, 1, 4, 2, 1, 1, 0, 0]
Explanation:
- Day 0 (73) waits 1 day for day 1 (74).
- Day 1 (74) waits 1 day for day 2 (75).
- Day 2 (75) waits 4 days for day 6 (76).
- Day 3 (71) waits 2 days for day 5 (72).
- Day 4 (69) waits 1 day for day 5 (72).
- Day 5 (72) waits 1 day for day 6 (76).
- Day 6 (76) and day 7 (73) have no warmer future days.
```

---

### The Intuitive Mental Model

When searching for the next greater element in an array, we need to defer decision-making until future elements arrive. Days that have not yet witnessed a warmer temperature can be viewed as waiting in a queue.

#### Brute Force: Forward Scan per Day
The simplest approach checks every day individually: for day $i$, scan forward through all subsequent days $j > i$ until encountering the first temperature strictly greater than `temperatures[i]`. The wait time is $j - i$. On decreasing temperature series such as `[90, 80, 70, 60, ...]`, no warmer day exists, forcing the inner loop to scan all the way to the end for every single day. This takes $O(n^2)$ quadratic time.

#### Optimal Approach: Monotonic Decreasing Stack
Instead of scanning forward repeatedly, we walk through the array once and store unresolved days in a LIFO stack. The stack maintains indices whose corresponding temperatures are in strictly decreasing order:
- Every time a colder or equal day arrives, it cannot resolve any previously waiting day. It simply joins the top of the stack.
- The moment a warmer day arrives, it immediately resolves all days on top of the stack that are strictly colder than itself.
- For each resolved day `prev_day`, the distance is calculated as:

$$\text{wait\_time} = \text{curr\_day} - \text{prev\_day}$$

- Once all colder elements are popped and resolved, the current day is pushed onto the stack to await its own warmer future day.

#### Execution Walkthrough

Let us trace `temperatures = [73, 74, 75, 71, 69, 72]`:

| Step | Day `i` | Temp | Action Taken | Stack (Indices) | Output `answer` |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **1** | `0` | `73` | Push `0` | `[0]` | `[0, 0, 0, 0, 0, 0]` |
| **2** | `1` | `74` | `74 > 73`: pop `0`, `ans[0] = 1 - 0 = 1`. Push `1` | `[1]` | `[1, 0, 0, 0, 0, 0]` |
| **3** | `2` | `75` | `75 > 74`: pop `1`, `ans[1] = 2 - 1 = 1`. Push `2` | `[2]` | `[1, 1, 0, 0, 0, 0]` |
| **4** | `3` | `71` | `71 <= 75`: push `3` | `[2, 3]` | `[1, 1, 0, 0, 0, 0]` |
| **5** | `4` | `69` | `69 <= 71`: push `4` | `[2, 3, 4]` | `[1, 1, 0, 0, 0, 0]` |
| **6** | `5` | `72` | `72 > 69`: pop `4`, `ans[4] = 5 - 4 = 1`<br/>`72 > 71`: pop `3`, `ans[3] = 5 - 3 = 2`<br/>`72 <= 75`: stop popping. Push `5` | `[2, 5]` | `[1, 1, 0, 2, 1, 0]` |

Days remaining on the stack (`[2, 5]`) never witnessed a warmer day and retain their default `0`.

---

### Step-by-Step Algorithm

1. **Initialize State:** Create an array `answer` of size $n$ filled with zeros. Initialize an empty list `stack = []` to store unresolved day indices.
2. **Traverse Temperatures:** Iterate through `curr_day, curr_temp` using `enumerate(temperatures)`.
3. **Resolve Colder Days:** While `stack` is non-empty and `curr_temp > temperatures[stack[-1]]`:
   - Pop `prev_day = stack.pop()`.
   - Record wait duration: `answer[prev_day] = curr_day - prev_day`.
4. **Push Current Day:** Push `curr_day` onto `stack`.
5. **Return Answer:** Return `answer`. Any day index that was never popped retains `0`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Monotonic Decreasing Stack" default>

```python
class Solution:
    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:
        n = len(temperatures)
        answer: list[int] = [0] * n
        stack: list[int] = []  # Stores indices of unresolved days

        for curr_day, curr_temp in enumerate(temperatures):
            # Resolve all waiting days that are colder than today's temperature
            while stack and curr_temp > temperatures[stack[-1]]:
                prev_day = stack.pop()
                answer[prev_day] = curr_day - prev_day

            stack.append(curr_day)

        return answer
```

  </TabItem>
  <TabItem value="brute" label="Alternative / Brute Force: Forward Scan">

```python
class Solution:
    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:
        n = len(temperatures)
        answer: list[int] = [0] * n

        for i in range(n):
            for j in range(i + 1, n):
                if temperatures[j] > temperatures[i]:
                    answer[i] = j - i
                    break

        return answer
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Brute Force (Forward Scan)** | $O(n^2)$ | $O(1)$ extra space | Compares each day against all future days. Highly inefficient on descending arrays. |
| **Optimal (Monotonic Stack)** | $O(n)$ | $O(n)$ | Each index is pushed and popped at most once across the entire iteration, achieving amortized linear time. |

---

### Common Pitfall: Storing Values Instead of Indices

A frequent mistake is pushing temperature values onto the stack rather than day indices. Because the final answer requires calculating elapsed days (`curr_day - prev_day`), storing only temperatures leaves no way to determine how far apart the two days were without an auxiliary lookup. Moreover, storing day indices directly allows immediate access to both the temperature via `temperatures[idx]` and the exact position in the array.

---

### Concise Interview Takeaway

For next greater element problems requiring distance, maintain a monotonic decreasing stack of indices. When a strictly larger value appears, pop each smaller index and write the difference between current and popped indices directly to the result array. Each element enters and leaves the stack at most once, yielding optimal $O(n)$ time and $O(n)$ auxiliary space.
