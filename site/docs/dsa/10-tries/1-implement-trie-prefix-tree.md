---
id: 1-implement-trie-prefix-tree
title: "208. Implement Trie (Prefix Tree)"
description: "Letters become edges, shared beginnings become shared paths"
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Tries</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Prefix Tree</span>

> **Problem Statement:** Build a structure that stores words and supports three operations: insert a word, check whether an exact word was inserted, and check whether any inserted word starts with a given prefix.

```text
insert("apple")
search("apple")   -> true
search("app")     -> false
startsWith("app") -> true
```

---

### Picture it

A set of words answers `search` instantly but is useless for `startsWith`, because finding every word beginning with `"app"` would mean examining all of them.

The way out is to stop storing words as units and store them **letter by letter**, with common beginnings sharing a path:

```text
root
 └── a ── p ── p ── l ── e      (apple)
              └── s             (apps)
```

`apple` and `apps` share the first three steps, because they share the first three letters. Walking from the root spells out a word, and any prefix is just a partway point on that walk.

---

### How to think about it

Each node holds a map from a letter to the next node, and a flag.

**The flag is the crux.** Without it, the structure records that a path exists but not whether that path spells a complete word. Having inserted `apple`, the path for `app` exists, yet `app` was never inserted. The flag marks the nodes where a real word ends, which is exactly what separates `search` from `startsWith`.

Then all three operations share one helper: walk the trie following the letters, and report the node you land on or nothing if a letter is missing.

- **insert:** walk, creating missing nodes as you go, and set the flag on the final node.
- **search:** walk, then report whether you arrived and the flag is set.
- **startsWith:** walk, then report only whether you arrived.

Using a dictionary for the children rather than a fixed array of 26 keeps it short and works for any alphabet, at the cost of a little memory per node.

---

### Walking through the example

Starting from an empty trie:

1. **insert("apple").** From the root, no `a` exists, so create it. Then create `p`, `p`, `l` and `e` in turn. Set the flag on the node after `e`.
2. **search("apple").** Walk `a`, `p`, `p`, `l`, `e`. All present, and the final node's flag is set, so `true`.
3. **search("app").** Walk `a`, `p`, `p`. The node exists, but its flag is not set, because no word ended there. So `false`.
4. **startsWith("app").** The same walk arrives at a real node, and that is all this operation asks, so `true`.

Steps 3 and 4 walk to exactly the same place and give different answers, which is the flag earning its keep.

---

### The code

```python
class TrieNode:
    def __init__(self):
        self.children = {}        # letter -> next node
        self.is_word = False      # does a complete word end here?


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def _walk(self, text: str) -> TrieNode:
        node = self.root

        for ch in text:
            if ch not in node.children:
                return None
            node = node.children[ch]

        return node

    def insert(self, word: str) -> None:
        node = self.root

        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]

        node.is_word = True

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_word

    def startsWith(self, prefix: str) -> bool:
        return self._walk(prefix) is not None
```

---

### Time and space complexity

#### Time: $O(L)$ for every operation

Where `L` is the length of the word or prefix. Each operation takes one step per letter, and crucially the cost does not depend on how many words the trie holds. A trie with a million words answers a five-letter query in five steps.

#### Space: $O(\text{total letters})$

In the worst case, with no shared beginnings, one node per letter of every word. Shared prefixes reduce that, which is the other half of why a trie is used.

---

### Remember this

Store letters as edges so that shared beginnings become shared paths, which is what makes prefix queries cheap. Keep an end-of-word flag on each node: `search` requires both arriving and the flag, `startsWith` requires only arriving. Every operation is $O(L)$ in the query length, independent of how many words are stored.
