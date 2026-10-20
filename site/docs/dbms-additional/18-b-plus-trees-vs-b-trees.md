---
id: 18-b-plus-trees-vs-b-trees
title: "Why Databases Prefer B+ Trees Over B-Trees: Fan-Out & Range Scans"
description: "Examine the technical differences between B-Trees and B+ Trees, leaf-level linked lists, fan-out capacity math, and range scan performance."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Why do relational database storage engines (like MySQL InnoDB and PostgreSQL) use B+ Trees instead of standard B-Trees? Prove mathematically why B+ Trees have higher fan-out, and explain how leaf node linked lists optimize range scans."

Both are self-balancing, multi-way trees built for disk. Almost every relational engine — MySQL InnoDB, Postgres, SQLite, Oracle — picks the B+ Tree over the plain B-Tree, and it comes down to one design choice: where the actual row data is allowed to live.

<Diagram>
<Row>
<Tree root={
<Box title="B-Tree root" accent="#fb7185">
<Field icon="🗂️" code="key 50 + row data" hint="data stored at every level" variant="neutral" />
</Box>
}>
<Box title="key 20 + row data" accent="#fb7185">
<Field icon="📄" code="data lives here too" variant="neutral" />
</Box>
<Box title="key 80 + row data" accent="#fb7185">
<Field icon="📄" code="data lives here too" variant="neutral" />
</Box>
</Tree>
<Tree root={
<Box title="B+ Tree root" accent="#818cf8">
<Field icon="🗂️" code="keys: 50, 100" hint="pure routing, no row data" variant="neutral" />
</Box>
}>
<Box title="Leaf: 10-40" accent="#34d399">
<Field icon="📄" code="full rows" hint="linked to the next leaf" variant="neutral" />
</Box>
<Box title="Leaf: 50-90" accent="#34d399">
<Field icon="📄" code="full rows" hint="linked both ways" variant="neutral" />
</Box>
</Tree>
</Row>
</Diagram>

In a B-Tree, every node — even the internal ones — carries real row data. In a B+ Tree, internal nodes carry only keys and pointers; the actual rows live only in the leaves, which are linked together in a chain.

---

### Side by side

| | B-Tree | B+ Tree |
| :--- | :--- | :--- |
| **Where data lives** | Keys and row data, in every node | Row data only in leaves; internal nodes hold just keys and pointers |
| **Fan-out** | Low — data eats into the space for child pointers | Very high — internal nodes are tiny |
| **Tree height** | Taller (4-6 levels for large datasets) | Flatter (3-4 levels even at billions of rows) |
| **Leaf connections** | None — leaves are independent | Doubly-linked list across all leaves |
| **Range queries** | Expensive — jump up and down the tree repeatedly | Cheap — walk sideways along the leaves |
| **Search latency** | Uneven — a key near the root is faster to find | Uniform — every lookup walks root to leaf |

---

### The fan-out math

Say each page is 16KB (InnoDB's default), a key is 8 bytes, a child pointer is 6 bytes, and a row record is 100 bytes.

**B-Tree:** each internal entry stores the key, the pointer, *and* the row — $8 + 6 + 100 = 114$ bytes per entry.
$$\text{Fan-out} \approx \frac{16{,}384}{114} \approx 143 \text{ children per node}$$
A 3-level tree then indexes about $143^3 \approx 2.9$ million rows.

**B+ Tree:** internal entries store only the key and pointer — $8 + 6 = 14$ bytes.
$$\text{Fan-out} \approx \frac{16{,}384}{14} \approx 1{,}170 \text{ children per node}$$
With leaf pages holding ~160 rows each ($16{,}384 / 100$), a 3-level tree indexes:
$$1{,}170 \times 1{,}170 \times 160 \approx 219 \text{ million rows}$$
and a 4-level tree stretches to roughly **256 billion rows**.

That's the whole reason B+ Trees stay shallow: packing more into each internal node means fewer levels, and since the root and upper levels usually stay cached in RAM (the buffer pool), a point lookup on a 200-million-row table can cost as little as **one physical disk read**.

---

### Why range scans are the other big win

Most real queries are ranges, not single points:
```sql
SELECT * FROM Orders WHERE order_date BETWEEN '2026-01-01' AND '2026-01-31';
```

- **B-Tree:** has to do an in-order traversal — bouncing up to parents, down to children, up again — lots of scattered page reads.
- **B+ Tree:** one binary search down to the leaf holding `'2026-01-01'`, then just **walk sideways** along the linked list of leaves until you pass `'2026-01-31'`. Since those leaf pages are stored contiguously on disk, this turns into a fast sequential read instead of a pile of random seeks.

---

### Say this in the interview

*"B+ Trees beat plain B-Trees for two reasons. First, fan-out: because B-Tree internal nodes carry row data, each one can only fit about 100 children in a 16KB page; B+ Tree internal nodes carry only keys and pointers, so they fit over 1,000 — which keeps the tree only 3-4 levels deep even at hundreds of millions of rows, with the top levels cached in RAM. Second, range scans: B+ Tree leaves are linked together, so a range query does one lookup to find the start and then walks sideways — sequential I/O instead of the random jumping a B-Tree traversal needs."*

---

### Code: counting node visits for the same range scan

The following Python script simulates range retrieval in a B-Tree (recursive in-order traversal requiring multiple parent-child node hops) versus a B+ Tree (horizontal leaf traversal), measuring the total number of node visits.

```python
class BTreeNode:
    def __init__(self, keys, values, children=None):
        self.keys = keys
        self.values = values
        self.children = children or []

class BPlusLeafNode:
    def __init__(self, keys, values):
        self.keys = keys
        self.values = values
        self.next = None  # Pointer to next leaf node

def simulate_range_scans():
    print("--- Simulating Range Scan: Keys [25 to 75] ---")

    # 1. B-Tree Simulation: Keys and data scattered across levels
    # In-order traversal counter
    btree_node_visits = 0
    def btree_inorder_range(node, low, high):
        nonlocal btree_node_visits
        if not node:
            return []
        btree_node_visits += 1
        results = []
        for i, k in enumerate(node.keys):
            if node.children and k > low:
                results.extend(btree_inorder_range(node.children[i], low, high))
            if low <= k <= high:
                results.append((k, node.values[i]))
        if node.children and node.keys[-1] < high:
            results.extend(btree_inorder_range(node.children[-1], low, high))
        return results

    # Construct small 2-level B-Tree
    root_btree = BTreeNode(
        keys=[50], values=["Data_50"],
        children=[
            BTreeNode([20, 30, 40], ["D20", "D30", "D40"]),
            BTreeNode([60, 70, 80], ["D60", "D70", "D80"])
        ]
    )
    b_tree_results = btree_inorder_range(root_btree, 25, 75)

    # 2. B+ Tree Simulation: Direct binary search to leaf + horizontal linked list
    leaf1 = BPlusLeafNode([20, 30, 40], ["D20", "D30", "D40"])
    leaf2 = BPlusLeafNode([50, 60, 70], ["D50", "D60", "D70"])
    leaf3 = BPlusLeafNode([80, 90, 100], ["D80", "D90", "D100"])
    leaf1.next = leaf2
    leaf2.next = leaf3

    # Seek down to leaf1 (1 seek to root, 1 seek to leaf1 = 2 seeks)
    bplus_node_visits = 2  # Root + target leaf
    curr_leaf = leaf1
    bplus_results = []
    while curr_leaf:
        for k, v in zip(curr_leaf.keys, curr_leaf.values):
            if 25 <= k <= 75:
                bplus_results.append((k, v))
            elif k > 75:
                break
        if curr_leaf.keys[-1] >= 75:
            break
        curr_leaf = curr_leaf.next
        if curr_leaf:
            bplus_node_visits += 1

    print(f"B-Tree Range Traversal  : {len(b_tree_results)} items found | Node Visits: {btree_node_visits} (Jumping up/down)")
    print(f"B+ Tree Leaf Linked Walk: {len(bplus_results)} items found | Node Visits: {bplus_node_visits} (Direct sequential walk)")
    print("Notice: B+ Tree avoids re-visiting internal nodes during range scanning!")

if __name__ == "__main__":
    simulate_range_scans()
```
