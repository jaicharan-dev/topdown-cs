---
id: 17-database-indexes-internal-data-structures
title: "Database Indexes: Concept and Internal Data Structures"
description: "Understand database indexes, disk block I/O, B-Tree vs. B+ Tree differences, LSM Trees, and why B+ Trees power modern relational databases."
sidebar_position: 13
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a database index, why do databases use B+ Trees instead of Hash Tables or Binary Search Trees, and how does a B+ Tree differ from a traditional B-Tree?"

A database **index** is an auxiliary on-disk search structure that storage engines maintain to accelerate query retrieval from a **Full Table Scan ($O(N)$)** down to a **Logarithmic Search ($O(\log N)$)**, at the expense of additional disk storage and slower write operations (`INSERT`, `UPDATE`, `DELETE`).

---

### Why Not Hash Tables?

A Hash Index uses an on-disk or in-memory hash map:

| Advantage | Fatal Limitation in Relational Engines |
| :--- | :--- |
| **$O(1)$** average time complexity for exact point lookups (`WHERE id = 500`). | **Cannot perform range queries!** (`WHERE age BETWEEN 20 AND 30` or `WHERE salary > 50000`). |
| Minimal memory footprint for simple lookups. | **Cannot accelerate sorting (`ORDER BY`)** because hashing destroys natural order. |
| Ideal for simple Key-Value caches (e.g., Redis). | **Cannot perform prefix matching** (`WHERE name LIKE 'Sm%'`). |

Because relational databases fundamentally depend on range evaluations, joins, and ordered paging, hash indexes cannot serve as the default general-purpose indexing engine.

---

### Why Not Binary Search Trees (AVL / Red-Black Trees)?

Self-balancing binary search trees (BSTs) provide theoretical $O(\log_2 N)$ lookup complexity. Why are they unsuitable for disk-based storage engines?

1. **Low Fan-Out & Excessive Tree Depth:**
   - In a Binary Tree, each node has at most **2 children** (Fan-out = 2).
   - For a table of 100,000,000 rows, the tree height is $\log_2(100,000,000) \approx 27$ levels.
   - Because disk seeks are orders of magnitude slower than RAM access, traversing 27 levels requires **27 separate random I/O operations** for a single row lookup.

2. **Disk Block Mismatch (Poor Cache Locality):**
   - Disk controllers and SSDs read and write data in fixed-size blocks called **Pages** (typically 4KB, 8KB, or 16KB in InnoDB).
   - A binary tree node holds only 1 key and 2 pointers ($\approx 32$ bytes). Reading a 32-byte node wastes the remaining 16,352 bytes of the fetched 16KB disk page!

---

### The Crucial Interview Trap: B-Tree vs. B+ Tree

Many candidates know databases use trees, but stumble when asked: *"Why do databases use a **B+ Tree** instead of a standard **B-Tree**?"*

```
B-Tree: Data records stored in EVERY node
         [ 50 (Row Data) ]
        /                 \
  [ 20 (Row Data) ]     [ 80 (Row Data) ]

B+ Tree: Internal nodes hold ONLY keys/pointers; ALL data in leaf nodes
         [ 50 | 100 ]            <-- Internal Routing Keys (No row data)
        /      |      \
  [ Leaf 1 ] <-> [ Leaf 2 ] <-> [ Leaf 3 ] <-- Leaf Nodes (Full Data + Doubly Linked List)
```

The three critical advantages of a **B+ Tree**:

1. **Significantly Higher Fan-Out:** Because internal routing nodes store only keys and child page pointers (no heavy row payloads), a single 16KB page can hold **over 1,000 keys**. This keeps the tree height flat:
   - Level 1 (Root): 1 page = 1,000 records
   - Level 2: 1,000 pages = 1,000,000 records
   - Level 3: 1,000,000 pages = **1,000,000,000 (1 Billion) records!**
   Finding any record among 1 billion rows requires only **3 to 4 disk page reads**.
2. **Efficient Range Scans via Doubly-Linked Leaves:** The leaf nodes of a B+ Tree are linked together sequentially as a doubly-linked list. To execute `WHERE age BETWEEN 25 AND 35`, the engine seeks the start key (`25`) once, and then simply scans along the leaf nodes horizontally without re-traversing parent branches.
3. **Predictable Query Latency:** In a B-Tree, queries for keys stored in the root return faster than keys in leaves. In a B+ Tree, every search path traverses from root to leaf, providing consistent, deterministic latency.

---

### Modern Alternative: B+ Trees vs. LSM Trees

While B+ Trees dominate read-heavy relational databases, write-heavy systems (such as Apache Cassandra, RocksDB, and Google Bigtable) use **Log-Structured Merge-Trees (LSM Trees)**:

| Feature | B+ Tree | LSM Tree |
| :--- | :--- | :--- |
| **Primary Optimization** | **Read Performance** | **Write Throughput** |
| **Write Mechanism** | In-place random page updates | Sequential append-only in-memory memtable flushed to SSTables |
| **Engine Examples** | PostgreSQL, MySQL InnoDB, Oracle | Cassandra, RocksDB, ScyllaDB, ClickHouse |

---

### The ELI5 Analogy: The Library Directory

- **Full Table Scan:** Walking down every single aisle of a massive library and reading every book spine until you find the title you need.
- **Hash Table:** A magic teleporter that takes you directly to one book, but if you ask for "all books written between 1980 and 1990", the teleporter fails completely.
- **Binary Search Tree:** A 27-story building with a staircase where every landing only offers two doors. You have to open 27 doors one-by-one.
- **B+ Tree:** An elevator with an index directory. The lobby points you to Floor 4; Floor 4 points you to Aisle 12; Aisle 12 has all books organized alphabetically with carts rolling directly between adjacent shelves.

---

### Summary
"A database index accelerates queries from $O(N)$ table scans to $O(\log N)$ seeks. Databases prefer B+ Trees over Hash Tables to support range queries and sorting, and prefer them over Binary Trees because high fan-out keeps tree height under 3-4 levels for billions of rows. B+ Trees outperform B-Trees by packing more keys per internal page and linking leaf nodes for fast sequential range scans."

---

### Crucial Nuance: The Write Penalty (Write Amplification)
Indexes accelerate reads, but penalize writes. Every `INSERT`, `DELETE`, and indexed `UPDATE` must synchronously update every associated B+ tree on that table, potentially triggering expensive node splits and page rebalances. Over-indexing a high-velocity table degrades write throughput and bloats memory in the buffer pool.

---

### Code Demonstration: `EXPLAIN ANALYZE` (Seq Scan vs. Index Scan)

```sql
-- PostgreSQL Query Plan Demonstration

-- 1. Without Index: Full Table Scan (Seq Scan)
EXPLAIN ANALYZE
SELECT id, email, created_at 
FROM users 
WHERE email = 'engineer@example.com';
-- Output:
-- Seq Scan on users (cost=0.00..18450.00 rows=1 width=45) (actual time=42.152..42.153 rows=1 loops=1)
-- Rows Removed by Filter: 999999
-- Execution Time: 45.210 ms

-- 2. Create B+ Tree Index on email
CREATE INDEX idx_users_email ON users(email);

-- 3. With Index: B+ Tree Index Seek
EXPLAIN ANALYZE
SELECT id, email, created_at 
FROM users 
WHERE email = 'engineer@example.com';
-- Output:
-- Index Scan using idx_users_email on users (cost=0.42..8.44 rows=1 width=45) (actual time=0.045..0.047 rows=1 loops=1)
-- Execution Time: 0.082 ms (Over 500x faster!)
```
