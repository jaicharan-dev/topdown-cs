---
id: 6-word-search
title: "79. Word Search"
description: "2D grid backtracking with in-place cell masking and frequency pruning"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Grid DFS</span>

> **Problem Statement:** Given an $m \times n$ grid of characters `board` and a string `word`, return `true` if `word` exists in the grid. The word can be constructed from letters of sequentially adjacent cells (horizontally or vertically neighboring). The same letter cell may not be used more than once in a single word.

```text
Input:  board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"
Output: true
Explanation: The path A -> B -> C -> C -> E -> D exists sequentially in adjacent cells.
```

---

### The Intuitive Mental Model

Imagine navigating an escape room labyrinth looking for a specific sequence of letters:
1. **Find a starting door:** Scan the grid to find any cell matching the first character `word[0]`.
2. **Leave a breadcrumb:** Because you cannot reuse the same cell twice along a single path, temporarily drop a breadcrumb on the cell by setting `board[r][c] = '#'`. This prevents walking in cycles.
3. **Explore four directions:** From `(r, c)`, step Up, Down, Left, and Right looking for `word[i + 1]`.
4. **Pick up the breadcrumb (Backtrack):** If none of the four directions succeed, restore the original character `board[r][c] = temp` so subsequent paths starting from other cells can still use it.

#### Brute Force: Visited Coordinate Set
Maintain a hash set of `(r, c)` tuples to track cells visited on the current path. At every step, check whether the neighbor coordinate is in the set. While functionally correct, hashing coordinates incurs significant overhead, and allocating a set uses $O(L)$ auxiliary memory.

#### Optimal Approach: In-Place Masking with Frequency Pruning
Modify the board in-place: overwrite `board[r][c] = '#'` before recursing, and restore it afterward. This uses zero auxiliary memory beyond the call stack. 

Furthermore, apply two fast pre-checks:
1. **Character Count Guard:** If any character in `word` appears more times than it exists across the entire board, return `False` immediately.
2. **Search Inversion:** If the last letter `word[-1]` occurs less frequently on the board than `word[0]`, reverse the word (`word = word[::-1]`). Searching from the rarer character dramatically prunes the branching factor at the root of the search.

#### Execution Walkthrough

Let us trace searching for `"SEE"` on a $3 \times 4$ board starting at `(1, 3)` where `board[1][3] = 'S'`:

| Step | Cell `(r, c)` | Character | Target `word[i]` | Action Taken | Board Mutation |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | `(1, 3)` | `'S'` | `'S'` (`i = 0`) | Match: mask cell, explore neighbors | `board[1][3] = '#'` |
| **2** | `(0, 3)` | `'E'` | `'E'` (`i = 1`) | Match: mask cell, explore neighbors | `board[0][3] = '#'` |
| **3** | `(0, 2)` | `'C'` | `'E'` (`i = 2`) | Mismatch: return `False` | Unchanged |
| **4** | `(0, 3)` | `'#'` | - | Backtrack: restore cell | `board[0][3] = 'E'` |
| **5** | `(2, 3)` | `'E'` | `'E'` (`i = 1`) | Match: mask cell, explore neighbors | `board[2][3] = '#'` |
| **6** | `(2, 2)` | `'E'` | `'E'` (`i = 2`) | Match: `i == len(word) - 1`, target complete! | Return `True` |

---

### Step-by-Step Algorithm

1. **Count Frequencies:** Count all characters on the board using a hash map or `Counter`. If the board has fewer occurrences of any character than required by `word`, return `False`.
2. **Direction Inversion:** If `count(word[0]) > count(word[-1])`, reverse `word` to minimize starting branches.
3. **Define Recursive DFS:** Define helper `dfs(r, c, i)`:
   - **Base Case:** If `i == len(word)`, all characters have been matched; return `True`.
   - **Boundary and Mismatch Check:** If `r < 0`, `r >= rows`, `c < 0`, `c >= cols`, or `board[r][c] != word[i]`, return `False`.
   - **Mask Cell:** Save `temp = board[r][c]` and set `board[r][c] = '#'`.
   - **Explore Neighbors:** Recurse across all four directions: `(r+1, c)`, `(r-1, c)`, `(r, c+1)`, `(r, c-1)` with `i + 1`.
   - **Backtrack:** Restore `board[r][c] = temp`.
   - **Return Result:** Return `True` if any directional branch returned `True`, else `False`.
4. **Iterate Grid:** Loop through every cell `(r, c)`. If `board[r][c] == word[0]` and `dfs(r, c, 0)` returns `True`, return `True`.
5. **Fallback:** If all starting cells are exhausted without finding the word, return `False`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: In-Place Masking with Pruning" default>

```python
from collections import Counter


class Solution:
    def exist(self, board: list[list[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])

        # Optimization 1: Frequency validation check
        board_counts = Counter(char for row in board for char in row)
        word_counts = Counter(word)
        for char, count in word_counts.items():
            if board_counts[char] < count:
                return False

        # Optimization 2: Reverse word if tail character is rarer than head
        if board_counts[word[0]] > board_counts[word[-1]]:
            word = word[::-1]

        def dfs(r: int, c: int, i: int) -> bool:
            # Base case: all characters matched successfully
            if i == len(word):
                return True

            # Out of bounds or character mismatch (including '#' visited markers)
            if (
                r < 0
                or r >= rows
                or c < 0
                or c >= cols
                or board[r][c] != word[i]
            ):
                return False

            # Mark visited in-place
            temp = board[r][c]
            board[r][c] = "#"

            # Explore all 4 orthogonal directions
            found = (
                dfs(r + 1, c, i + 1)
                or dfs(r - 1, c, i + 1)
                or dfs(r, c + 1, i + 1)
                or dfs(r, c - 1, i + 1)
            )

            # Backtrack cell state
            board[r][c] = temp
            return found

        for r in range(rows):
            for c in range(cols):
                if board[r][c] == word[0] and dfs(r, c, 0):
                    return True

        return False
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Visited Coordinate Set">

```python
class Solution:
    def exist(self, board: list[list[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])
        visited: set[tuple[int, int]] = set()

        def dfs(r: int, c: int, i: int) -> bool:
            if i == len(word):
                return True

            if (
                r < 0
                or r >= rows
                or c < 0
                or c >= cols
                or (r, c) in visited
                or board[r][c] != word[i]
            ):
                return False

            visited.add((r, c))
            found = (
                dfs(r + 1, c, i + 1)
                or dfs(r - 1, c, i + 1)
                or dfs(r, c + 1, i + 1)
                or dfs(r, c - 1, i + 1)
            )
            visited.remove((r, c))
            return found

        for r in range(rows):
            for c in range(cols):
                if board[r][c] == word[0] and dfs(r, c, 0):
                    return True

        return False
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Visited Coordinate Set** | $O(m \cdot n \cdot 3^L)$ | $O(L)$ | Uses a set of `(r, c)` tuples to avoid in-place board modification. Slower due to set hashing overhead. |
| **In-Place Masking with Pruning** | $O(m \cdot n \cdot 3^L)$ | $O(L)$ | Temporarily masks cells with `'#'` and inverts search direction based on character rarity. Faster in practice. |

*(Where $m \times n$ is the grid size and $L$ is the length of `word`. After the initial step, the branching factor is at most 3 because the search never immediately steps back to the predecessor cell.)*

---

### Common Pitfall: Mutating Cell Without Restoring on Backtrack

If you overwrite `board[r][c] = '#'` but fail to restore `board[r][c] = temp` when all child branches return `False`, that cell remains permanently marked as `'#'`. Any subsequent path starting from another grid location that needs that letter will fail, causing incorrect false-negative outputs.

Always place the backtrack restoration `board[r][c] = temp` after evaluating all directional branches.

---

### Concise Interview Takeaway

For **Word Search**, traverse the 2D grid using DFS while masking visited cells in-place with `'#'` to avoid allocating an extra visited structure. Restore the original character during backtrack. In production interviews, mention reversing the target word when its tail character is rarer than its head character to dramatically prune the search tree.
