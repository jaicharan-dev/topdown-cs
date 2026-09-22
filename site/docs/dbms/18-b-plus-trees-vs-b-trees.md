---
id: 18-b-plus-trees-vs-b-trees
title: "Why Databases Prefer B+ Trees Over B-Trees"
description: "Examine the technical differences between B-Trees and B+ Trees, leaf-level linked lists, fan-out efficiency, and range scan performance."
sidebar_position: 18
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Why do relational database storage engines (like MySQL InnoDB and PostgreSQL) use B+ Trees instead of standard B-Trees?"

While both **B-Trees** and **B+ Trees** are balanced multi-way search trees designed for disk storage, almost every major relational database engine (MySQL InnoDB, Postgres, SQLite, SQL Server, Oracle) chooses the **B+ Tree** variant for indexing.

---

### The Structural Differences

| Architectural Feature | Standard B-Tree | B+ Tree |
| :--- | :--- | :--- |
| **Data / Record Storage** | Keys AND row data/pointers stored in **all nodes** (root, internal, and leaves) | Row data/pointers stored **exclusively in Leaf Nodes**; internal nodes store *only routing keys* |
| **Internal Node Fan-Out** | Lower (data payloads consume precious page bytes) | **Much Higher** (internal nodes only store small key-pointer pairs) |
| **Tree Height** | Taller for large datasets | **Shorter and flatter** |
| **Leaf Node Connections**| Leaf nodes are independent | Leaf nodes are connected via a **Doubly-Linked List** |
| **Range Queries** | Requires expensive **in-order tree traversals** (jumping up and down levels) | Fast **sequential scan** across the linked list at the leaf level |
| **Search Predictability** | Variable: `O(1)` if found in root, `O(\log N)` if in leaf | Uniform: Every lookup takes identical path length to the leaf |

---

### Architectural Superiority of the B+ Tree

```
B-Tree (Data scattered at every level):
              [ Key1 + Data ]
             /                  [ Key2 + Data ]         [ Key3 + Data ]
   (Notice how row data clutters internal pages, reducing child pointers)

B+ Tree (Clean routing on top, contiguous data on bottom):
                 [ Key 50 | Key 100 ]              <-- Massive Fan-out
                /          |                  [ 10 | 30 ]  [ 60 | 80 ]   [ 120 | 140 ]  <-- Routing only
            /            /             /
  `[D1] ↔ [D2]` ↔ [D3] ↔ [D4] ↔ [D5] ↔ [D6] ↔ [D7]   <-- Leaf Nodes linked sequentially!
```

---

#### 1. Far Higher Fan-Out and Flatter Trees
A disk block is fixed (e.g., 16KB in InnoDB).
- In a **standard B-Tree**, if a row record is 500 bytes, a 16KB page can only store \approx 30 keys and records. The tree must grow tall to accommodate millions of records.
- In a **B+ Tree**, internal nodes only store routing keys (e.g., 8-byte `BIGINT`) and 6-byte child pointers. A 16KB internal page can store:
  
```text
\frac{16,384  bytes}{8 + 6  bytes} \approx 1,170  child pointers!
```

Because the fan-out is 1,170, the tree stays extremely flat (height of 3 or 4), ensuring lookups require minimal disk seeks.

#### 2. Range Queries Are O(\log N) + Sequential Scan
Relational databases frequently process queries like:
```sql
SELECT * FROM orders WHERE order_date BETWEEN '2026-01-01' AND '2026-01-31';
```
- **In a B-Tree:** The engine must traverse up and down parent and child nodes across disk blocks (in-order traversal), causing dozens of random I/O seeks.
- **In a B+ Tree:** The engine performs a single binary search down to the leaf node holding `'2026-01-01'`, and then simply **walks along the horizontal doubly-linked list** from left to right until it reaches `'2026-01-31'`. This turns random disk seeks into blazing-fast sequential disk reads!

#### 3. Leaf Nodes Can Be Clustered Contiguously on Disk
Because all real data lives in the leaves, the storage engine can lay out adjacent leaf pages sequentially on physical disk blocks, maximizing sequential I/O read-ahead throughput.

---

### The ELI5 Analogy: The Mall Directory vs. Shops

- **B-Tree (Every Floor Has Shops and Elevators):** You walk into a 4-story mall. Ground floor has a bookstore, second floor has a shoe shop, third floor has a toy shop. If you want to check all stores in alphabetical order, you have to run up to the 3rd floor, down to the 1st floor, up to the 4th floor, and back to the 2nd floor.
- **B+ Tree (Pure Directories Upstairs, All Shops in a Strip Mall Below):** The top floors have zero stores—they only hold digital directory maps pointing down. All physical stores are lined up side-by-side on the ground floor connected by a continuous moving walkway. Once you take the elevator down to the first store, you just stay on the walkway and stroll sequentially through every shop.

---

### Summary
"Databases prefer B+ Trees over B-Trees because B+ Trees store data exclusively in leaf nodes, maximizing internal node fan-out to keep tree height flat, and link all leaf nodes in a doubly-linked list, transforming expensive range queries into fast sequential scans."

---

### Crucial Nuance: When is a Standard B-Tree Faster?
In a standard B-Tree, if you are querying for a key that happens to sit right inside the root node or a level-1 internal node, the search finishes in **`O(1)`** without visiting the leaves. The B+ Tree must **always** traverse all the way down to the leaf node for every query. However, for relational databases with billions of rows, sacrificing `O(1)` hits on a handful of root keys is an easy choice to gain 100x faster range queries and predictable I/O.
