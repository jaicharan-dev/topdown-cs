---
id: 3-word-search-ii
title: "212. Word Search II"
description: "Trie-guided grid backtracking with prefix pruning"
sidebar_position: 3
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Tries</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trie + Backtracking</span>

> **Problem Statement:** Given an $m \times n$ board of characters and a list of strings `words`, return all words from the list that can be constructed on the board. Each word must be formed from letters in sequentially adjacent cells (horizontally or vertically). The same letter cell may not be used more than once in a single word.

```text
Input:
board = [
  ["o", "a", "a", "n"],
  ["e", "t", "a", "e"],
  ["i", "h", "k", "r"],
  ["i", "f", "l", "v"]
]
words = ["oath", "pea", "eat", "rain"]
Output: ["eat", "oath"]
Explanation: The words "eat" and "oath" can be formed by sequentially adjacent cells in the board.
```

---

### The Intuitive Mental Model

Imagine playing Boggle with a dictionary containing thousands of words.

If you test each dictionary word individually by launching a full grid search from scratch, you repeat identical grid walks thousands of times. Prefix paths like `"oa"` or `"ea"` get traversed and re-evaluated over and over again, causing Time Limit Exceeded.

Instead, invert the perspective: load the entire word list into a single prefix tree (Trie), then explore the grid once.

As your grid explorer moves across the board, they consult the Trie at every single step:
1. Does the current character exist as a child edge of the current Trie node?
2. If no: Stop exploring immediately. This prefix cannot lead to any valid dictionary word. The entire sub-tree of grid paths is pruned in $O(1)$ time.
3. If yes: Move to the neighbor cell on the grid while stepping down to the corresponding child node in the Trie.
4. When a terminal word is encountered, record it and reset its marker to prevent duplicates.

```
Grid:                     Trie Radar:
[ o | a | a | n ]             (root)
[ e | t | a | e ]            /      \
[ i | h | k | r ]          [o]      [e]
[ i | f | l | v ]           |        |
                           [a]      [a]
                            |        |
                           [t]*     [t]*

Path: 'o' -> 'a' -> 't' -> 'h'* matches valid word "oath"!
```

#### Brute Force: Word Search I for Each Dictionary Word

The direct baseline runs Word Search I independently for every word in `words`. If there are $W$ words, each DFS exploration from any cell can branch into 4 directions up to depth $L$. The overall runtime reaches $O(W \cdot M \cdot N \cdot 4^L)$, which explodes when $W$ is large or when many words share common prefixes.

#### Optimal Approach: Trie-Guided Grid Backtracking with Pruning

A Trie consolidates common prefixes into shared tree nodes. By traversing the grid and the Trie synchronously, invalid prefixes are rejected at the earliest possible step.

Furthermore, we apply dynamic leaf pruning: once a word at a leaf node is found and has no child branches remaining, we delete that leaf from its parent's `children` map. This progressively shrinks the search space as words are discovered.

#### Execution Walkthrough

Let the board have cells containing `o`, `a`, `t`, `h` and Trie contain `{"oath", "pea", "eat", "rain"}`:

| Step | Grid Cell `(r, c)` | Character | Trie Node State | Action Taken | Word Found |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **1** | `(0, 0)` | `'o'` | `root.children['o']` exists | Step to node `'o'`, mark cell visited (`'#'`) | None |
| **2** | `(0, 1)` | `'a'` | Node `'o'.children['a']` exists | Step to node `'a'`, mark cell visited (`'#'`) | None |
| **3** | `(1, 1)` | `'t'` | Node `'a'.children['t']` exists | Step to node `'t'`, mark cell visited (`'#'`) | None |
| **4** | `(2, 1)` | `'h'` | Node `'t'.children['h']` exists | Word terminal reached! Collect `"oath"` | `"oath"` |
| **5** | Backtrack | Restore | Clear `curr_node.word`, restore cells | Delete completed leaf `'h'` from parent | None |
| **6** | `(1, 0)` | `'e'` | `root.children['e']` exists | Match `'e' -> 'a' -> 't'`, collect `"eat"` | `"eat"` |

---

### Step-by-Step Algorithm

1. **Construct the Trie:**
   - Initialize a `root` Trie node with an empty `children` mapping.
   - Insert every word from `words`. Store the full string in `curr.word` at the terminal node (avoiding string concatenation during grid search).
2. **Define Backtracking Helper `dfs(r, c, parent_node)`:**
   - Retrieve character `char = board[r][c]`.
   - If `char` is not in `parent_node.children`, return immediately.
   - Advance `curr_node = parent_node.children[char]`.
   - If `curr_node.word` is present:
     - Append `curr_node.word` to the results list.
     - Set `curr_node.word = None` to avoid duplicate entries.
   - Mark the current cell visited in-place: `board[r][c] = '#'`.
   - For each orthogonal neighbor `(nr, nc)` within board bounds and not equal to `'#'`:
     - If `board[nr][nc]` is in `curr_node.children`, recurse: `dfs(nr, nc, curr_node)`.
   - Backtrack cell value: `board[r][c] = char`.
   - **Dynamic Pruning:** If `not curr_node.children`, delete `char` from `parent_node.children`.
3. **Iterate Grid:** For each row `r` and column `c`, if `board[r][c]` is in `root.children`, invoke `dfs(r, c, root)`.
4. **Return Results:** Return the collected list of discovered words.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Trie-Guided Backtracking with Pruning" default>

```python
class TrieNode:
    def __init__(self):
        self.children: dict[str, TrieNode] = {}
        self.word: str | None = None


class Solution:
    def findWords(self, board: list[list[str]], words: list[str]) -> list[str]:
        # 1. Build the Trie from the word list
        root = TrieNode()
        for word in words:
            curr = root
            for char in word:
                if char not in curr.children:
                    curr.children[char] = TrieNode()
                curr = curr.children[char]
            curr.word = word

        rows, cols = len(board), len(board[0])
        result: list[str] = []

        def dfs(r: int, c: int, parent: TrieNode) -> None:
            char = board[r][c]
            curr_node = parent.children[char]

            # Check if current prefix completes a dictionary word
            if curr_node.word is not None:
                result.append(curr_node.word)
                curr_node.word = None  # Prevent duplicate collection

            # Mark cell visited in-place
            board[r][c] = "#"

            # Explore 4 orthogonal directions
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != "#":
                    if board[nr][nc] in curr_node.children:
                        dfs(nr, nc, curr_node)

            # Backtrack cell state
            board[r][c] = char

            # Dynamic pruning: remove leaf nodes with no remaining children
            if not curr_node.children:
                del parent.children[char]

        # Launch search from every cell containing a valid initial prefix
        for r in range(rows):
            for c in range(cols):
                if board[r][c] in root.children:
                    dfs(r, c, root)

        return result
```

  </TabItem>
  <TabItem value="alternative" label="Alternative / Brute Force: Word Search I Iteration">

```python
class Solution:
    def findWords(self, board: list[list[str]], words: list[str]) -> list[str]:
        rows, cols = len(board), len(board[0])

        def exist(word: str) -> bool:
            def dfs(r: int, c: int, idx: int) -> bool:
                if idx == len(word):
                    return True
                if (
                    r < 0
                    or r >= rows
                    or c < 0
                    or c >= cols
                    or board[r][c] != word[idx]
                ):
                    return False

                temp = board[r][c]
                board[r][c] = "#"

                found = (
                    dfs(r + 1, c, idx + 1)
                    or dfs(r - 1, c, idx + 1)
                    or dfs(r, c + 1, idx + 1)
                    or dfs(r, c - 1, idx + 1)
                )

                board[r][c] = temp
                return found

            for r in range(rows):
                for c in range(cols):
                    if board[r][c] == word[0] and dfs(r, c, 0):
                        return True
            return False

        return [word for word in set(words) if exist(word)]
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Word Search I per Word** | $O(W \cdot M \cdot N \cdot 4^L)$ | $O(L)$ | Runs a fresh grid search for each word. Redundant walks on shared prefixes cause timeout on large vocabularies. |
| **Trie-Guided Backtracking** | $O(\sum L + M \cdot N \cdot 4 \cdot 3^{L-1})$ | $O(\sum L)$ | Synchronous grid and Trie traversal prunes non-existent prefixes immediately, dynamically trimming completed branches. |

---

### Common Pitfall: Collecting Duplicate Words and Missing In-Flight Pruning

Two distinct paths across the board may spell the exact same word. If the algorithm simply appends `curr_node.word` whenever reached, the result will contain duplicates. Setting `curr_node.word = None` immediately upon finding the word ensures each dictionary entry is recorded at most once.

Additionally, omitting leaf node deletion (`del parent.children[char]`) leaves dead branches in the Trie, forcing subsequent grid paths to revisit branches that have already yielded all their words.

---

### Concise Interview Takeaway

Never search the grid for each word independently. Load all target words into a Trie and traverse the grid and Trie simultaneously. Prefix mismatches terminate in $O(1)$ time, and dynamically removing exhausted leaf nodes ensures optimal performance even against adversarial grid configurations.
