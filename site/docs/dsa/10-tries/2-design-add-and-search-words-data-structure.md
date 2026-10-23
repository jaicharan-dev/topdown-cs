---
id: 2-design-add-and-search-words-data-structure
title: "211. Design Add and Search Words Data Structure"
description: "A dot is not one step but every step, so the walk turns into a search"
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Tries</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Wildcard DFS</span>

> **Problem Statement:** Store words and search them, where a search string may contain dots and each dot matches any single letter.

```text
addWord("bad"), addWord("dad"), addWord("mad")
search("pad") -> false
search(".ad") -> true
search("b..") -> true
```

---

### Picture it

Storing the words is the previous problem unchanged: a trie, letters as edges, a flag where a word ends.

What changes is the lookup. With ordinary letters there is exactly one way forward at each step, so searching is a straight walk. A dot removes that certainty: it matches any letter, so **every** child of the current node is a possible next step.

So the walk becomes a search. At a letter, take the one route. At a dot, try all the routes available and succeed if any of them works.

---

### How to think about it

Write the search as a recursive function over a node and a position in the query.

**At the end of the query**, success means the node you have arrived at is flagged as the end of a word. Arriving somewhere is not enough, exactly as in the plain trie.

**At an ordinary letter**, if the node has no such child, this route fails. Otherwise step into that child and continue.

**At a dot**, try every child in turn, continuing from each. If any of them reaches a match, the answer is `true`. If all of them fail, this route fails.

The dot case is the only branching point, and it is what makes this a depth-first search rather than a walk. A failed branch simply returns, and the loop moves on to the next child, which is backtracking in its simplest form.

`addWord` is untouched. All the new difficulty lives in search.

---

### Walking through the example

After adding `bad`, `dad` and `mad`, the root has three children: `b`, `d` and `m`, each leading to a path spelling the rest.

**search(".ad")**

1. The first character is a dot, so try every child of the root.
2. Try `b` first. The rest of the query is `ad`, and the path under `b` spells exactly that. The final node is flagged, so the answer is `true` and the other children are never tried.

**search("b..")**

1. The first character is `b`, so take that one route.
2. The next is a dot. The only child there is `a`, so try it.
3. The next is another dot. The only child is `d`, so try it. The query ends, and the node is flagged. `true`.

**search("pad")**

1. The first character is `p`. The root has no `p` child, so the search fails immediately without exploring anything.

---

### The code

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False


class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        node = self.root

        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]

        node.is_word = True

    def search(self, word: str) -> bool:
        def match(node, i: int) -> bool:
            if i == len(word):
                return node.is_word   # arriving is not enough

            ch = word[i]

            if ch == ".":
                # a dot can be any letter, so try every route
                for child in node.children.values():
                    if match(child, i + 1):
                        return True
                return False

            if ch not in node.children:
                return False

            return match(node.children[ch], i + 1)

        return match(self.root, 0)
```

---

### Time and space complexity

#### Time: $O(L)$ for a query with no dots, up to $O(26^d \cdot L)$ in the worst case

Where `L` is the query length and `d` is the number of dots. Each dot multiplies the number of routes to try by the number of children at that point, capped at the alphabet size.

In practice it is far better, because the trie only branches where words actually diverge. A query of nothing but dots is the pathological case, and it is the one to mention when asked about the cost.

#### Space: $O(\text{total letters})$ for the trie, plus $O(L)$ of recursion depth.

---

### Remember this

Store exactly as in a plain trie; only the lookup changes. A letter means one route, a dot means every route, which turns the walk into a depth-first search with backtracking. At the end of the query the node must be flagged, not merely reached. Cost is linear without dots and grows with the number of dots in the worst case.
