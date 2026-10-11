---
id: 1-implement-trie-prefix-tree
title: "208. Implement Trie (Prefix Tree)"
description: "Prefix-sharing tree structure for string retrieval and autocompletion"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Tries</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Prefix Tree</span>

> **Problem Statement:** A trie (pronounced as "try") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. There are various applications of this data structure, such as autocomplete and spellchecker. Implement the `Trie` class:
> - `Trie()`: Initializes the trie object.
> - `void insert(String word)`: Inserts the string `word` into the trie.
> - `boolean search(String word)`: Returns `true` if the string `word` is in the trie (i.e., was inserted before), and `false` otherwise.
> - `boolean startsWith(String prefix)`: Returns `true` if there is a previously inserted string `word` that has the prefix `prefix`, and `false` otherwise.

```text
Input:
["Trie", "insert", "search", "search", "startsWith", "insert", "search"]
[[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]

Output:
[null, null, true, false, true, null, true]

Explanation:
Trie trie = new Trie();
trie.insert("apple");
trie.search("apple");   // returns True
trie.search("app");     // returns False
trie.startsWith("app"); // returns True
trie.insert("app");
trie.search("app");     // returns True
```

---

### The Intuitive Mental Model

Imagine an autocomplete engine or a physical thumb-indexed dictionary. A Trie (derived from re**trie**val) is an $n$-ary tree specialized for storing collections of strings.

Instead of storing each word in isolated memory slots, all words sharing a common prefix share the exact same chain of ancestor nodes. As you type `"a" -> "p" -> "p"`, traversal descends down a single shared sequence of character links. When words diverge, such as `"apple"` versus `"apply"`, the tree branches at character `'l'`.

To differentiate between a complete word and a mere intermediate prefix, each node maintains an `is_end_of_word` boolean flag:
- `"app"` is a complete word (`is_end_of_word = True`).
- `"appl"` is an internal prefix leading to `"apple"` (`is_end_of_word = False`).

```
              (root)
             /      \
           [a]      [b]
            |        |
           [p]      [a]
            |        |
          [p]*      [t]*
          /   \
        [l]   [y]*
         |
        [e]*

  * denotes is_end_of_word = True
  Words stored: "app", "apple", "apply", "bat"
```

#### Brute Force: Array or Hash Set Storage

A naive approach stores words inside a standard hash set. While exact lookups via `search(word)` run in $O(L)$ time, answering `startsWith(prefix)` presents a severe challenge. To determine whether any word starts with `"app"`, a hash set cannot navigate prefix relationships: it must inspect every single word in the dataset, leading to an $O(N \cdot L)$ scan across $N$ words of average length $L$.

#### Optimal Approach: Shared Prefix Tree

A Trie organizes characters into hierarchical nodes. Traversal begins at the root node and follows edges labeled by successive characters in the query string.

Because each transition takes $O(1)$ time via a dictionary or fixed array lookup, both `search` and `startsWith` terminate in exactly $O(L)$ steps, completely independent of how many millions of words exist in the dictionary.

#### Execution Walkthrough

Let us trace the operations from the example:

| Step | Operation | Traversal Path | Node Action | Result |
| :---: | :--- | :--- | :--- | :---: |
| **1** | `insert("apple")` | `root -> a -> p -> p -> l -> e` | Create missing character nodes; mark node `'e'` with `is_end_of_word = True` | `None` |
| **2** | `search("apple")` | `root -> a -> p -> p -> l -> e` | Follow edges to `'e'`; node exists and has `is_end_of_word == True` | `True` |
| **3** | `search("app")` | `root -> a -> p -> p` | Follow edges to second `'p'`; node exists but has `is_end_of_word == False` | `False` |
| **4** | `startsWith("app")` | `root -> a -> p -> p` | Follow edges to second `'p'`; all prefix characters exist | `True` |
| **5** | `insert("app")` | `root -> a -> p -> p` | Nodes exist; update second `'p'` with `is_end_of_word = True` | `None` |
| **6** | `search("app")` | `root -> a -> p -> p` | Follow edges to second `'p'`; node exists and now has `is_end_of_word == True` | `True` |

---

### Step-by-Step Algorithm

1. **Define TrieNode:** Create a helper node class containing a `children` mapping (`char -> TrieNode`) and a boolean `is_end_of_word` set to `False`.
2. **Initialize Trie:** In `__init__`, construct `self.root` as an empty `TrieNode`.
3. **Implement `insert(word)`:**
   - Point `curr = self.root`.
   - Iterate through each character `char` in `word`. If `char` is not present in `curr.children`, instantiate a new `TrieNode`.
   - Advance `curr = curr.children[char]`.
   - After traversing all characters, set `curr.is_end_of_word = True`.
4. **Implement `search(word)`:**
   - Point `curr = self.root`.
   - Iterate through each character in `word`. If `char` is missing from `curr.children`, return `False`.
   - Advance `curr = curr.children[char]`.
   - Return `curr.is_end_of_word` once all characters are matched.
5. **Implement `startsWith(prefix)`:**
   - Point `curr = self.root`.
   - Iterate through each character in `prefix`. If `char` is missing from `curr.children`, return `False`.
   - Advance `curr = curr.children[char]`.
   - Return `True` once all prefix characters are verified.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Prefix Tree (Trie)" default>

```python
class TrieNode:
    def __init__(self):
        self.children: dict[str, TrieNode] = {}
        self.is_end_of_word: bool = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        curr = self.root
        for char in word:
            if char not in curr.children:
                curr.children[char] = TrieNode()
            curr = curr.children[char]
        curr.is_end_of_word = True

    def search(self, word: str) -> bool:
        curr = self.root
        for char in word:
            if char not in curr.children:
                return False
            curr = curr.children[char]
        return curr.is_end_of_word

    def startsWith(self, prefix: str) -> bool:
        curr = self.root
        for char in prefix:
            if char not in curr.children:
                return False
            curr = curr.children[char]
        return True
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Hash Set">

```python
class Trie:
    def __init__(self):
        self.words: set[str] = set()

    def insert(self, word: str) -> None:
        self.words.add(word)

    def search(self, word: str) -> bool:
        return word in self.words

    def startsWith(self, prefix: str) -> bool:
        # Linear scan over all stored words
        for word in self.words:
            if word.startswith(prefix):
                return True
        return False
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Hash Set** | Insert: $O(L)$, Search: $O(L)$, Prefix: $O(N \cdot L)$ | $O(N \cdot L)$ | Hash sets provide quick exact matches, but prefix matching degrades to a full linear scan over all $N$ strings. |
| **Prefix Tree (Trie)** | Insert: $O(L)$, Search: $O(L)$, Prefix: $O(L)$ | $O(N \cdot L)$ | Prefixes share node branches. Runtime depends strictly on query length $L$, independent of the dataset size $N$. |

---

### Common Pitfall: Confusing Prefix Nodes with Complete Words

A frequent pitfall is treating any node reachable in the Trie as a valid word. For example, inserting `"apple"` creates nodes for `'a'`, `'p'`, `'p'`, `'l'`, and `'e'`. Searching for `"app"` must return `False` unless `"app"` was explicitly inserted. Always verify the `is_end_of_word` flag in `search()`, whereas `startsWith()` only requires reaching the end of the query without encountering a missing link.

---

### Concise Interview Takeaway

A Trie organizes strings hierarchically by character edges so shared prefixes share nodes. By equipping each node with a children map and a terminal boolean flag, both exact word lookups and prefix searches execute in deterministic $O(L)$ time, regardless of the number of words stored.
