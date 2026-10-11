---
id: 2-design-add-and-search-words-data-structure
title: "211. Design Add and Search Words Data Structure"
description: "Trie with recursive backtracking wildcard dot matching"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Tries</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Wildcard DFS</span>

> **Problem Statement:** Design a data structure that supports adding new words and finding if a string matches any previously stored word. The query string may contain dots `.` where each dot can match any lowercase letter from `'a'` to `'z'`. Implement:
> - `addWord(word)`: Adds `word` to the data structure.
> - `search(word)`: Returns `True` if there is any string in the data structure that matches `word`, and `False` otherwise.

```text
Input:
["WordDictionary", "addWord", "addWord", "addWord", "search", "search", "search", "search"]
[[], ["bad"], ["dad"], ["mad"], ["pad"], ["bad"], [".ad"], ["b.."]]

Output:
[null, null, null, null, false, true, true, true]

Explanation:
WordDictionary wordDictionary = new WordDictionary();
wordDictionary.addWord("bad");
wordDictionary.addWord("dad");
wordDictionary.addWord("mad");
wordDictionary.search("pad"); // returns False
wordDictionary.search("bad"); // returns True
wordDictionary.search(".ad"); // returns True
wordDictionary.search("b.."); // returns True
```

---

### The Intuitive Mental Model

Think of searching in a standard Trie like walking down a corridor of labeled doors. Normal letters represent specific keys: if the current letter is `'b'`, you open only the door labeled `'b'`. The wildcard dot `.` acts like a master skeleton key: it can unlock and pass through any door.

When a query contains only standard letters (like `"bad"`), traversal is deterministic: `root -> 'b' -> 'a' -> 'd'`. However, when you encounter a wildcard dot (like `"b.d"`), the search cannot know ahead of time which room holds the matching terminal word. It could be `"bad"`, `"bed"`, or `"bid"`.

To resolve this ambiguity, we combine the Trie structure with backtracking depth-first search (DFS):
- For a literal letter, step directly into that specific child node.
- For a dot `.`, fork the search across all existing children of the current node (`for child in node.children.values()`).
- If any child path reaches the end of the query and marks a valid word, return `True` immediately.

```
             (root)
               |
              [b]
            /  |  \
          [a] [e] [i]     <-- '.' forks across all existing children
           |   |   |
          [d]*[d]*[d]*    <-- All lead to 'd'* -> Match found!

  * denotes is_word = True
```

#### Brute Force: Linear Scan with Regex

A straightforward baseline stores words in a dynamic array. Whenever a search query arrives, the algorithm constructs a regular expression or performs pairwise pattern matching against every single stored word. This requires $O(N \cdot L)$ work for each search query across $N$ words of length $L$. For large vocabularies with frequent queries, linear scanning times out.

#### Optimal Approach: Trie with Backtracking DFS

A Trie eliminates redundant prefix comparisons. Storing words in a Trie keeps insertion at $O(L)$. Exact searches run in $O(L)$ deterministic steps.

When a dot `.` is encountered, the search branches only across existing populated child edges, completely bypassing unused alphabet branches. Backtracking ensures that as soon as any candidate branch confirms a match, exploration short-circuits to return `True`.

#### Execution Walkthrough

Let the Trie contain `["bad", "dad", "mad"]`. We evaluate search queries:

| Step | Query | Index / Character | Node Action | Branch Outcome | Result |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | `"pad"` | Index 0: `'p'` | Check `root.children['p']` | Not found in `root.children` | `False` |
| **2** | `"bad"` | Index 0: `'b'`<br />Index 1: `'a'`<br />Index 2: `'d'` | Traverse deterministic path: `root -> 'b' -> 'a' -> 'd'` | Reached `'d'` with `is_word == True` | `True` |
| **3** | `".ad"` | Index 0: `'.'` | Branch across all `root` children: `['b', 'd', 'm']` | Fork DFS into 3 branches | Checking |
| **3a** | `".ad"` | Branch `'b'` | Match `'b'`, check index 1 `'a'`, index 2 `'d'` | Path `root -> 'b' -> 'a' -> 'd'` valid | `True` (short-circuit) |
| **4** | `"b.."` | Index 0: `'b'`<br />Index 1: `'.'`<br />Index 2: `'.'` | Move to `'b'`; branch over `'a'`; branch over `'d'` | Node `'d'` reached with `is_word == True` | `True` |

---

### Step-by-Step Algorithm

1. **Define TrieNode:** Create a `TrieNode` class with a `children` map (`char -> TrieNode`) and a boolean `is_word` initialized to `False`.
2. **Initialize WordDictionary:** Construct `self.root = TrieNode()`.
3. **Implement `addWord(word)`:**
   - Traverse the characters of `word` starting at `self.root`.
   - If a character is absent from `curr.children`, instantiate a new `TrieNode`.
   - Advance `curr = curr.children[char]`.
   - Set `curr.is_word = True` at the terminal node.
4. **Implement `search(word)` with DFS:**
   - Define a recursive helper `dfs(index, node) -> bool`:
     - If `index == len(word)`, return `node.is_word`.
     - Read `char = word[index]`.
     - If `char == '.'`:
       - Iterate through all child nodes in `node.children.values()`.
       - If `dfs(index + 1, child)` returns `True`, immediately return `True`.
       - If none succeed, return `False`.
     - If `char != '.'`:
       - If `char` is not in `node.children`, return `False`.
       - Return `dfs(index + 1, node.children[char])`.
   - Trigger DFS by returning `dfs(0, self.root)`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Trie with Backtracking DFS" default>

```python
class TrieNode:
    def __init__(self):
        self.children: dict[str, TrieNode] = {}
        self.is_word: bool = False


class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        curr = self.root
        for char in word:
            if char not in curr.children:
                curr.children[char] = TrieNode()
            curr = curr.children[char]
        curr.is_word = True

    def search(self, word: str) -> bool:
        def dfs(index: int, node: TrieNode) -> bool:
            # Reached end of pattern: must be a registered word
            if index == len(word):
                return node.is_word

            char = word[index]

            if char == ".":
                # Wildcard: explore all active children branches
                for child in node.children.values():
                    if dfs(index + 1, child):
                        return True
                return False
            else:
                # Direct match: descend the designated branch
                if char not in node.children:
                    return False
                return dfs(index + 1, node.children[char])

        return dfs(0, self.root)
```

  </TabItem>
  <TabItem value="alternative" label="Alternative / Brute Force: Array with Regex">

```python
import re


class WordDictionary:
    def __init__(self):
        self.words: list[str] = []

    def addWord(self, word: str) -> None:
        self.words.append(word)

    def search(self, word: str) -> bool:
        pattern = re.compile(f"^{word}$")
        for item in self.words:
            if len(item) == len(word) and pattern.match(item):
                return True
        return False
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Array with Regex** | Add: $O(1)$, Search: $O(N \cdot L)$ | $O(N \cdot L)$ | Simple insertion into a dynamic array, but every wildcard query requires regex matching across all stored words. |
| **Trie with Backtracking DFS** | Add: $O(L)$, Search: $O(L)$ to $O(26^L)$ | $O(N \cdot L)$ | Literal queries run in optimal $O(L)$ time. Wildcards branch only across existing populated nodes, keeping lookups fast in practice. |

---

### Common Pitfall: Iterating Over 26 Letters Instead of Existing Children

A frequent mistake when processing `.` is looping through all 26 lowercase English letters from `'a'` to `'z'` and probing the map for each. While functionally equivalent, iterating over `node.children.values()` directly explores only keys that actually exist in the Trie. This avoids 26 hash lookups at every branch point. Furthermore, make sure to verify `node.is_word` at `index == len(word)` rather than returning `True` merely because all query characters matched internal nodes.

---

### Concise Interview Takeaway

Standard character transitions in a Trie execute in deterministic $O(L)$ time. When encountering a wildcard dot `.`, fork a recursive DFS across all existing child branches, short-circuiting with `True` as soon as any path matches a terminal node.
