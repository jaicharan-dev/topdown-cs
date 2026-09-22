---
id: 17-database-indexes-internal-data-structures
title: "Database Indexes: Concept and Internal Data Structures"
description: "Understand database indexes, secondary lookup structures, disk page block I/O, and why B+ Trees are chosen over Hash and Binary Search Trees."
sidebar_position: 17
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a database index, and why do databases typically use B+ Trees internally instead of Hash Tables or Binary Search Trees?"

A database **index** is an auxiliary data structure that the storage engine maintains on disk to accelerate data retrieval operations at the cost of additional storage space and write overhead (`INSERT`, `UPDATE`, `DELETE`).

Without an index, the database must perform a **Full Table Scan (`O(N)`)**, reading every single disk page from storage into RAM to find matching rows. With an index, search complexity drops to **`O(\log N)`**.

---

### Why Not Hash Tables?

A Hash Index uses an in-memory or on-disk hash table:

| Advantage | Fatal Limitation |
| :--- | :--- |
| Blazing fast exact lookups: **`O(1)`** average time complexity for equality queries (`WHERE id = 500`) | **Cannot perform range queries!** (`WHERE age BETWEEN 20 AND 30` or `WHERE salary > 50000`) |
| Compact memory footprint | Cannot accelerate `ORDER BY` sorting (hashes destroy natural ordering) |
| Ideal for simple Key-Value caches (e.g., Redis) | Cannot support Prefix matching (`WHERE name LIKE 'Sm%'`) |

Because relational databases predominantly execute range scans, sorting, and inequalities, hash indexes cannot serve as the default general-purpose indexing engine.

---

### Why Not Binary Search Trees (AVL / Red-Black Trees)?

Self-balancing binary search trees (BSTs) provide `O(\log_2 N)` search complexity. Why don't relational databases use them?

The answer comes down to **Disk Hardware Architecture and Block I/O**:

1. **Low Fan-Out & Excessive Tree Height:**
   - In a Binary Tree, each node has at most **2 children** (Fan-out = 2).
   - If a table has 100,000,000 rows, `log2(100,000,000) ≈ 27` levels!
   - Because disk access is thousands of times slower than RAM, traversing 27 pointer levels requires **27 separate random disk I/O seeks** just to find one record.

2. **Poor Cache Locality (Disk Page Mismatch):**
   - Disk drives and SSDs read and write data in fixed-size blocks called **Pages** (typically 4KB, 8KB, or 16KB in InnoDB).
   - A binary tree node holds only 1 key and 2 pointers (approx. 32 bytes). Reading a 32-byte node wastes the remaining 16,352 bytes of the fetched 16KB disk page!

---

### The Winner: The B+ Tree (High Fan-Out)

A **B+ Tree** is an `M`-way self-balancing search tree engineered specifically for block storage:

```
                  [ 50 | 100 ]            <-- Root Node (Holds many keys)
                /      |                     /       |            [ 10 | 30 ]  [ 60 | 80 ]  [ 120 | 150 ]  <-- Internal Nodes (Routing only)
       /   \        /   \        /         [...] [...]  [...] [...]  [...]  [...]   <-- Leaf Nodes (Data & Doubly-Linked List)
```

1. **Massive Fan-Out:** A single 16KB database page can hold **over 1,000 keys and child pointers**. 
2. **Extremely Flat Height:** 
   - Level 1 (Root): 1 page = \$1,000 entries
   - Level 2: 1,000 pages = \$1,000,000 entries
   - Level 3: \1,000,000 pages = **\1,000,000,000 (1 Billion) records**!
   - In a B+ Tree, finding any record among **one billion rows** requires only **3 to 4 disk page reads**!
3. **The Root is Cached in RAM:** The root page is permanently cached in the database buffer pool, reducing physical disk I/O to 2 or 3 page reads.

---

### The ELI5 Analogy: The Library Index Cards

- **Full Table Scan:** Walking down every aisle in a massive library and reading every single book title from left to right until you find "Harry Potter".
- **Hash Table:** A magic teleporter that takes you directly to "Harry Potter", but if you ask for "all books written between 1990 and 2000", the teleporter explodes.
- **Binary Tree:** A 27-story spiral staircase where every landing only offers two doors. You have to open 27 doors to reach the book.
- **B+ Tree:** A modern elevator with a digital lobby directory. The lobby points you to Floor 3. Floor 3's directory points you to Hallway B. Hallway B has the exact shelf. You only took 3 steps.

---

### Summary
"A database index accelerates queries from O(N) full table scans to O(log N) tree lookups. Databases prefer B+ Trees over Hash Tables because B+ Trees support range scans and sorting, and prefer them over Binary Trees because B+ Trees have a high fan-out fitting disk page sizes, keeping tree height under 3-4 levels for billions of rows."

---

### Crucial Nuance: Index Write Penalty
Indexes are not free. Every `INSERT`, `UPDATE` (on indexed columns), and `DELETE` must synchronously update every associated B+ tree index on that table. If a table has 8 indexes, a single `INSERT` statement translates to 9 distinct disk writes! Never blindly add indexes without measuring read frequency against write amplification.
