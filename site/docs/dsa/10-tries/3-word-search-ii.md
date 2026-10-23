---
id: 3-word-search-ii
title: "212. Word Search II"
description: "Put the words in a trie and walk the board and the trie together"
sidebar_position: 3
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Tries</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Trie + Backtracking</span>

> **Problem Statement:** Given a grid of letters and a list of words, return every word that can be spelled by stepping between neighbouring cells, up, down, left or right, without using the same cell twice in one word.

```text
board = [["o","a","a","n"], ["e","t","a","e"], ["i","h","k","r"], ["i","f","l","v"]]
words = ["oath", "pea", "eat", "rain"]
Output: ["oath", "eat"]
```

---

### Picture it

Searching the board for one word is a depth-first walk: start on a matching cell, step to a neighbour that matches the next letter, and back out when it does not.

Doing that once per word is the obvious plan, and it is wasteful. If the words are `"cat"`, `"car"` and `"card"`, the board gets searched for `"ca"` three separate times, and each search rediscovers the same dead ends.

A trie fixes this by searching for **all the words at once**. Put every word into a trie, then walk the board and the trie in step. One cell letter advances you one node down the trie, and that single step is being made on behalf of every word sharing that prefix.

The trie also prunes brilliantly. If the current trie node has no child for a neighbouring cell's letter, then **no word at all** continues that way, and the whole branch dies immediately.

---

### How to think about it

Build the trie with each word stored at the node where it ends, rather than only a boolean flag. Keeping the word itself means that when you arrive at a word-ending node you can record it directly, with no need to track the letters collected along the way.

Then run a depth-first search from every cell:

1. **Can the trie continue?** If the current node has no child for this cell's letter, stop.
2. **Step into that child.** If it holds a word, record it, then clear it so the same word is not recorded again from another route.
3. **Mark the cell as used** before exploring, by replacing its letter with something that cannot match.
4. **Explore the four neighbours.**
5. **Restore the cell** afterwards, which is the backtracking step that makes it available to other paths.

Two refinements worth mentioning, because they are what make this fast in practice. **Clearing the word** after recording avoids duplicates. **Pruning dead nodes**, removing a child that has no words and no children left, shrinks the trie as the search proceeds, so later cells have even less to explore.

---

### Walking through the example

The trie holds `oath`, `pea`, `eat` and `rain`.

**Starting at the top-left `o`.** The root has an `o` child, since `oath` begins with it. Step in, mark the cell used, and look at the neighbours. The `a` below-right fits, then `t`, then `h`, and the node after `h` holds the word `oath`, which is recorded.

**Starting at the `e` on the left edge.** The root has an `e` child because of `eat`. Step in. A neighbouring `a` continues, then `t`, and the node holds `eat`, which is recorded.

**Starting at any cell whose letter is not `o`, `p`, `e` or `r`.** The root has no child for it, so the search stops before taking a single step. That is the pruning doing its work: most of the board is dismissed instantly.

Nothing spells `pea` or `rain`, so the answer is `["oath", "eat"]`.

---

### The code

```python
class Solution:
    def findWords(self, board: list[list[str]], words: list[str]) -> list[str]:
        # build the trie, storing the whole word at its final node
        root = {}
        for word in words:
            node = root
            for ch in word:
                node = node.setdefault(ch, {})
            node["$"] = word

        rows, cols = len(board), len(board[0])
        found = []

        def explore(r: int, c: int, node: dict) -> None:
            ch = board[r][c]

            if ch not in node:
                return   # no word continues this way at all

            nxt = node[ch]

            word = nxt.pop("$", None)
            if word:
                found.append(word)   # popped, so it cannot be found twice

            board[r][c] = "#"   # mark used for this path only

            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != "#":
                    explore(nr, nc, nxt)

            board[r][c] = ch   # restore for other paths

            if not nxt:
                node.pop(ch)   # dead end, so prune it from the trie

        for r in range(rows):
            for c in range(cols):
                explore(r, c, root)

        return found
```

---

### Time and space complexity

#### Time: $O(m \cdot n \cdot 4^{L})$ in the worst case

Where `L` is the length of the longest word. Every cell can start a search, and each step has up to four directions, though the first step has four and later ones have three since you never go straight back.

That bound is pessimistic by a long way. The trie prunes any branch that no word continues, and the dead-node pruning shrinks it further as the search runs, so real boards finish far sooner.

#### Space: $O(\text{total letters in the words})$

The trie. The recursion adds $O(L)$ on top, and marking cells happens in the board itself rather than in a separate visited structure.

---

### Remember this

Searching once per word repeats the same dead ends, so put all the words in a trie and walk the board and the trie together, advancing every candidate word at once. Store the word at its final node so matches record themselves, pop it to avoid duplicates, mark and restore cells around the recursion, and prune dead trie nodes to keep shrinking the search.
