---
id: 6-word-search
title: "79. Word Search"
description: "Mark the cell on the way in, restore it on the way out"
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Recursion & Backtracking</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">2D Grid DFS</span>

> **Problem Statement:** Given a grid of letters and a word, say whether the word can be spelled by stepping between neighbouring cells, up, down, left or right, without reusing a cell within that word.

```text
Input:  board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"
Output: true
```

---

### Picture it

Start on any cell holding the word's first letter and try to walk the rest of the word out from there. At each step, look at the four neighbours and step into whichever one carries the next letter. If none do, this attempt has failed and you back up.

The new ingredient compared with the earlier problems is the **no reuse** rule. While building one attempt, a cell already standing on the path is off limits, otherwise a word like `"AA"` could be spelled by bouncing between one `A` and its neighbour forever.

But "off limits" is only true for the **current** path. A cell rejected by one attempt must be free for a completely different attempt starting somewhere else. That is exactly what backtracking handles: mark on the way in, restore on the way out.

---

### How to think about it

Run a depth-first search from every cell, looking for the word's first letter.

Inside the search, carry the position in the word:

1. **If the whole word has been matched**, succeed.
2. **If the cell is outside the grid, or its letter is wrong**, fail.
3. **Mark the cell as used.**
4. **Try all four neighbours** for the next letter. Succeed as soon as any of them does.
5. **Restore the cell** before returning, whatever the outcome.

Step five is the one to get right. Restoring only on success leaves a trail of marked cells behind every failed attempt, which silently blocks later searches and produces wrong `false` answers that are miserable to debug.

Marking can be done in the board itself, by replacing the letter with a character that matches nothing and putting it back afterwards. That avoids a separate visited grid. If mutating the input is unacceptable, a set of visited positions does the same job with the same add-and-remove discipline.

---

### Walking through the example

Looking for `"ABCCED"`.

1. **Start at the `A` in the top-left corner**, matching the first letter. Mark it.
2. **`B` is to its right**, matching the second letter. Mark it.
3. **`C` is next along.** Mark it.
4. **The next letter is another `C`.** Right is `E`, which is wrong, so try below: the cell holds `C`. Mark it.
5. **The next letter is `E`.** Below that `C` is `E`. Mark it.
6. **The last letter is `D`.** To the left of that `E` is `D`. The word is complete, so the answer is `true`.

Had step 4 gone right into the `E` instead, the following letters would not have matched, that branch would have returned false, and the `E` would have been restored before the search tried below.

---

### The code

```python
class Solution:
    def exist(self, board: list[list[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0])

        def search(r: int, c: int, i: int) -> bool:
            if i == len(word):
                return True

            if not (0 <= r < rows and 0 <= c < cols):
                return False

            if board[r][c] != word[i]:
                return False

            board[r][c] = "#"   # used by this path only

            found = any(
                search(r + dr, c + dc, i + 1)
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )

            board[r][c] = word[i]   # restore, whatever happened

            return found

        for r in range(rows):
            for c in range(cols):
                if search(r, c, 0):
                    return True

        return False
```

---

### Time and space complexity

#### Time: $O(m \cdot n \cdot 4^{L})$ in the worst case

Where `L` is the length of the word. Every cell can start a search, and each step has up to four directions, three after the first since you never go straight back.

That is pessimistic. Most branches die on the very first letter comparison.

#### Space: $O(L)$

The recursion depth, which is the length of the word. Marking happens in the board itself, so no separate visited structure grows.

---

### Remember this

Walk the grid depth-first, matching one letter per step, and mark the current cell so the path cannot reuse it. Restore it before returning on **every** path, not just the successful one, or failed attempts leave the board littered with blocked cells. $O(m \cdot n \cdot 4^L)$ worst case, $O(L)$ space.
