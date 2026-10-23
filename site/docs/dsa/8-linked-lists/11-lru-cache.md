---
id: 11-lru-cache
title: "146. LRU Cache"
description: "A map to find things instantly, a linked list to remember the order"
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Linked Lists</span>
<span className="badge badge--secondary margin-left--sm margin-bottom--md">Doubly Linked List + Map</span>

> **Problem Statement:** Build a cache with a fixed capacity. Reading a key or writing one counts as using it. When the cache is full and a new key arrives, throw out whichever key was used least recently. Both operations must take constant time.

```text
capacity 2
put(1, 1), put(2, 2), get(1) -> 1, put(3, 3) evicts key 2
```

---

### Picture it

Two demands pull in opposite directions.

**Find any key instantly.** That is a dictionary.

**Know which key was used longest ago, and change that order constantly.** A dictionary cannot answer this, and keeping timestamps would mean scanning everything to find the oldest.

So use both structures at once, each for what it is good at.

Picture the entries in a row, most recently used at the front and least recently used at the back. Using an entry moves it to the front. Evicting takes whatever has drifted to the back.

The dictionary does not hold values. It holds **the node in that row**, which is what lets you jump straight to the middle of the row without walking it.

---

### How to think about it

The row has to be a **doubly** linked list. Removing a node from the middle means stitching its neighbours together, which needs the node before it. A singly linked list would have to be walked to find that, which is the $O(n)$ you are trying to avoid. With backward links, a removal is two assignments.

**Two sentinel nodes**, one at each end, carry their weight here. With a permanent head and tail that never hold data, every real node is guaranteed to have a neighbour on both sides, so no insertion or removal ever has to check for a missing one. The code becomes two small helpers with no branches in them at all.

Then the operations are short:

- **get:** missing key returns `-1`. Otherwise unlink the node, push it to the front, return its value.
- **put:** if the key already exists, unlink the old node. Create the new node, record it in the dictionary, push it to the front. If the dictionary now exceeds capacity, take the node just before the tail sentinel, unlink it, and delete its key.

**Each node stores its own key**, which looks redundant since the key is also the dictionary entry pointing at it. It is what makes eviction possible: you reach the doomed node through the list, and without the key stored on it you could not find the dictionary entry to delete.

---

### Walking through the example

Capacity `2`.

1. **put(1, 1).** The row is `1`. The dictionary holds key `1`.
2. **put(2, 2).** Pushed to the front, so the row is `2, 1`. Key `1` is now the older one.
3. **get(1).** Found, so unlink it and push it to the front. The row is `1, 2`, and `2` is now the least recently used. Returns `1`.
4. **put(3, 3).** Pushed to the front, so the row is `3, 1, 2` and the size is `3`, over capacity. The node before the tail sentinel is `2`, so unlink it and delete key `2`. The row is `3, 1`.

Had step 3 not happened, key `1` would have been the one evicted. Reading it was enough to save it, which is what "use" means here.

---

### The code

```python
class Node:
    def __init__(self, key=0, value=0):
        self.key = key       # stored so eviction can find the dictionary entry
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.index = {}                 # key -> its node in the row

        # sentinels, so no insert or remove ever meets a missing neighbour
        self.head = Node()              # most recently used side
        self.tail = Node()              # least recently used side
        self.head.next = self.tail
        self.tail.prev = self.head

    def _unlink(self, node: Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _push_front(self, node: Node) -> None:
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.index:
            return -1

        node = self.index[key]
        self._unlink(node)
        self._push_front(node)   # reading counts as using
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.index:
            self._unlink(self.index[key])

        node = Node(key, value)
        self.index[key] = node
        self._push_front(node)

        if len(self.index) > self.capacity:
            oldest = self.tail.prev
            self._unlink(oldest)
            del self.index[oldest.key]
```

---

### Time and space complexity

#### Time: $O(1)$ for both operations

A dictionary lookup is constant. Unlinking is two assignments, and pushing to the front is four. Eviction reaches the victim through the tail sentinel rather than searching for it. Nothing walks the row.

#### Space: $O(\text{capacity})$

One node and one dictionary entry per key held, plus the two sentinels.

---

### Remember this

Neither structure can do this alone, so use both: a dictionary for instant lookup, a doubly linked list for the use order, and the dictionary stores **nodes** rather than values. Double links make middle removal constant, sentinels at both ends remove every missing-neighbour check, and each node carries its own key so eviction can clear the dictionary. $O(1)$ per operation.
