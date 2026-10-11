---
id: 11-lru-cache
title: "146. LRU Cache"
description: "Hash map + doubly linked list with dummy sentinels for O(1) get and put"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Doubly Linked List + Map</span>

> **Problem Statement:** Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the `LRUCache` class with `get(key)` and `put(key, value)`, both running in average $O(1)$ time complexity.

```text
Input:
["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
Output:
[null, null, null, 1, null, -1, null, -1, 3, 4]
Explanation:
LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // cache is {1=1}
lRUCache.put(2, 2); // cache is {1=1, 2=2}
lRUCache.get(1);    // return 1
lRUCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}
lRUCache.get(2);    // returns -1 (not found)
lRUCache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}
lRUCache.get(1);    // return -1 (not found)
lRUCache.get(3);    // return 3
lRUCache.get(4);    // return 4
```

---

### The Intuitive Mental Model

An LRU Cache operates like a desk with space for only a few books:
- Whenever you inspect or update a book, you place it on the very top of the pile (Most Recently Used).
- When the desk is full and a new book arrives, you discard the book at the very bottom of the pile (Least Recently Used).

#### Brute Force: Array or List Scanning
Using a singly linked list or a dynamic array allows maintaining ordering, but finding an element requires an $O(n)$ linear scan. A hash map alone provides $O(1)$ lookups, but does not track the relative access order of its keys.

#### Optimal Approach: Hash Map + Doubly Linked List with Sentinels
By pairing a Hash Map with a Doubly Linked List (DLL), we achieve constant time for every operation:
1. **Hash Map:** Maps each `key` to its corresponding DLL `Node` pointer, providing $O(1)$ lookup.
2. **Doubly Linked List:** Maintains temporal ordering. Because each node has bidirectional pointers (`prev` and `next`), any node can be unlinked in $O(1)$ without traversing predecessor nodes.
3. **Sentinel Head and Tail:** Connecting permanent dummy `head` and `tail` nodes eliminates all null checks. The Most Recently Used node is always `head.next`, and the Least Recently Used node is always `tail.prev`.

#### Execution Walkthrough

Let us trace capacity = 2 with consecutive operations:

| Step | Operation | Evicted Key | DLL Order (MRU to LRU) | Map State (`cache`) | Return Value |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **1** | `put(1, 1)` | None | `head <-> [1] <-> tail` | `{1: Node(1)}` | `None` |
| **2** | `put(2, 2)` | None | `head <-> [2] <-> [1] <-> tail` | `{1: Node(1), 2: Node(2)}` | `None` |
| **3** | `get(1)` | None | `head <-> [1] <-> [2] <-> tail` | `{1: Node(1), 2: Node(2)}` | `1` |
| **4** | `put(3, 3)` | `2` | `head <-> [3] <-> [1] <-> tail` | `{1: Node(1), 3: Node(3)}` | `None` |
| **5** | `get(2)` | None | `head <-> [3] <-> [1] <-> tail` | `{1: Node(1), 3: Node(3)}` | `-1` |

---

### Step-by-Step Algorithm

1. **Define Doubly Linked Node:** Each node stores `key`, `val`, `prev`, and `next`. Storing `key` inside the node enables constant-time removal from the hash map during eviction.
2. **Initialize Sentinel Bounds:** In `__init__`, instantiate dummy `head` and `tail` nodes and link them together: `head.next = tail` and `tail.prev = head`.
3. **Helper Methods:**
   - `_remove(node)`: Unlink node by setting `node.prev.next = node.next` and `node.next.prev = node.prev`.
   - `_insert(node)`: Splice node immediately after `head` to mark it Most Recently Used.
4. **Implement `get(key)`:**
   - If `key` is absent from `cache`, return `-1`.
   - If present, refresh recency by unlinking the node with `_remove(node)` and moving it to the front with `_insert(node)`. Return `node.val`.
5. **Implement `put(key, value)`:**
   - If `key` already exists, remove the stale node with `_remove(self.cache[key])`.
   - Instantiate a new node, record it in `cache[key]`, and insert it via `_insert(new_node)`.
   - If `len(self.cache) > self.capacity`, identify the LRU node `tail.prev`, unlink it, and remove its key from `cache`.

---

### Python 3 Implementation

<Tabs>
  <TabItem value="optimal" label="Optimal: Hash Map + Doubly Linked List" default>

```python
class Node:
    def __init__(self, key: int = 0, val: int = 0):
        self.key = key
        self.val = val
        self.prev: Node | None = None
        self.next: Node | None = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: dict[int, Node] = {}

        # Dummy sentinels to eliminate null boundary checks
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node) -> None:
        """Detach an existing node from the doubly linked list."""
        prev_node = node.prev
        next_node = node.next
        if prev_node:
            prev_node.next = next_node
        if next_node:
            next_node.prev = prev_node

    def _insert(self, node: Node) -> None:
        """Insert node right after head (Most Recently Used position)."""
        node.prev = self.head
        node.next = self.head.next
        if self.head.next:
            self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1

        node = self.cache[key]
        # Refresh position to MRU
        self._remove(node)
        self._insert(node)
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])

        new_node = Node(key, value)
        self.cache[key] = new_node
        self._insert(new_node)

        # Evict LRU node if capacity is exceeded
        if len(self.cache) > self.capacity:
            lru_node = self.tail.prev
            if lru_node and lru_node != self.head:
                self._remove(lru_node)
                del self.cache[lru_node.key]
```

  </TabItem>
  <TabItem value="alternative" label="Alternative: Python OrderedDict">

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: OrderedDict[int, int] = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        # Mark key as most recently used
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value

        # Evict least recently used (first inserted) item
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)
```

  </TabItem>
</Tabs>

---

### Complexity Analysis

| Approach | Time Complexity | Space Complexity | Trade-off Summary |
| :--- | :---: | :---: | :--- |
| **Hash Map + DLL** | $O(1)$ get / put | $O(C)$ | Standard production architecture with explicit pointer rewiring and dummy bounds. |
| **Python OrderedDict** | $O(1)$ get / put | $O(C)$ | Highly concise standard library solution wrapping C-level hash table and linked list. |

---

### Common Pitfall: Storing Only Values in Doubly Linked Nodes

A subtle design flaw is omitting the `key` field from the `Node` class. When the cache exceeds capacity, we identify the LRU node via `tail.prev`. To purge its entry from the hash map, we must execute `del self.cache[lru_node.key]`. If the node only preserves `val`, searching for its corresponding key in the dictionary degenerates into an $O(n)$ scan, violating the $O(1)$ requirement.

---

### Concise Interview Takeaway

For **LRU Cache**, combine a Hash Map (for $O(1)$ key-to-node lookups) with a Doubly Linked List bounded by sentinel `head` and `tail` nodes (for $O(1)$ arbitrary node detachment and re-insertion). Store both key and value within each node to enable constant-time hash map deletions during eviction.
