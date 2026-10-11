---
id: 17-database-indexes-internal-data-structures
title: "Database Indexes: Concept and Internal Data Structures"
description: "What a database index actually is, why databases use B+ Trees instead of hash tables or binary trees, and how a B+ Tree differs from a B-Tree."
sidebar_position: 13
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a database index, why do databases use B+ Trees instead of Hash Tables or Binary Search Trees, and how does a B+ Tree differ from a traditional B-Tree?"

Think of a library with no catalog. To find one book, you'd walk down every aisle checking every spine. A database **index** is the catalog: a separate structure the database keeps on disk so it can jump straight to the row you want, instead of scanning the whole table. It turns an $O(N)$ full scan into an $O(\log N)$ lookup — at the cost of extra disk space, and slightly slower writes, since the index has to be kept up to date too.

---

### Why not a hash table?

A hash index maps keys straight to locations, like Redis does:

| What it's good at | Where it falls apart |
| :--- | :--- |
| $O(1)$ lookups for an exact match (`WHERE id = 500`) | Can't do range queries (`WHERE age BETWEEN 20 AND 30`) |
| Tiny memory footprint for simple lookups | Can't help with `ORDER BY` — hashing destroys order |
| Great for key-value caches | Can't do prefix matches (`WHERE name LIKE 'Sm%'`) |

Relational queries lean heavily on ranges, sorting, and joins — so a hash index can't be the main indexing structure.

---

### Why not a plain binary search tree?

A balanced binary tree (AVL, red-black) gives you $O(\log_2 N)$ lookups in theory. Two things make it a bad fit for disk:

1. **Too few children per node.** Each node has at most 2 children, so for 100 million rows the tree is about 27 levels deep. Since disk reads are much slower than RAM, that's 27 separate disk seeks just to find one row.
2. **It wastes disk pages.** Disks read and write in fixed-size blocks (often 16KB). A binary tree node is maybe 32 bytes — one key and two pointers. Reading a full 16KB page just to use 32 bytes of it is a huge waste.

---

### B-Tree vs. B+ Tree

The detail that trips people up: *why B+ Tree and not plain B-Tree?* In a B-Tree, every node — even internal ones — stores full row data. In a B+ Tree, internal nodes store only keys and pointers; all the actual row data lives in the leaf nodes, which are linked together in a chain:

<Diagram>
<Tree root={
<Box title="Root (keys only, no row data)" accent="#818cf8">
<Field icon="🗂️" code="keys: 50, 100" hint="just routes you to the right leaf" variant="neutral" />
</Box>
}>
<Box title="Leaf 1: ids < 50" accent="#34d399">
<Field icon="📄" code="full rows" hint="linked to the next leaf" variant="neutral" />
</Box>
<Box title="Leaf 2: 50-100" accent="#34d399">
<Field icon="📄" code="full rows" hint="linked to leaves on both sides" variant="neutral" />
</Box>
</Tree>
</Diagram>

That gives a B+ Tree three advantages:

1. **A much flatter tree.** Since internal nodes only hold keys and pointers (no row data), a single 16KB page can fit over 1,000 keys. That means:
   - Level 1 (root): 1 page → 1,000 records
   - Level 2: 1,000 pages → 1,000,000 records
   - Level 3: 1,000,000 pages → **1 billion records**
   
   Finding any row among a billion only takes 3-4 disk reads.
2. **Fast range scans.** Because leaf nodes are linked in order, `WHERE age BETWEEN 25 AND 35` just means: find the start (`25`), then walk sideways along the leaves — no need to go back up and down the tree.
3. **Consistent latency.** In a B-Tree, a key stored near the root returns faster than one buried in a leaf. In a B+ Tree, every lookup walks all the way from root to leaf, so latency is predictable.

---

### B+ Trees vs. LSM Trees

B+ Trees are built for reads. Write-heavy systems (Cassandra, RocksDB, Bigtable) often use a different structure instead — the **Log-Structured Merge-Tree (LSM Tree)**:

| | B+ Tree | LSM Tree |
| :--- | :--- | :--- |
| **Optimized for** | Reads | Writes |
| **How writes work** | Update the page in place | Append to an in-memory buffer, flush to disk in batches |
| **Used by** | PostgreSQL, MySQL InnoDB, Oracle | Cassandra, RocksDB, ScyllaDB, ClickHouse |

---

### The cost you're paying: slower writes

Indexes make reads fast, but every `INSERT`, `DELETE`, and indexed `UPDATE` has to update every index on that table too, sometimes triggering a page split. Adding too many indexes to a write-heavy table will visibly slow it down.

---

### Code: `EXPLAIN ANALYZE` before and after an index

```sql
-- 1. Without an index: full table scan
EXPLAIN ANALYZE
SELECT id, email, created_at 
FROM users 
WHERE email = 'engineer@example.com';
-- Seq Scan on users (cost=0.00..18450.00 rows=1 width=45) (actual time=42.152..42.153 rows=1 loops=1)
-- Rows Removed by Filter: 999999
-- Execution Time: 45.210 ms

-- 2. Add a B+ Tree index on email
CREATE INDEX idx_users_email ON users(email);

-- 3. With the index: direct seek
EXPLAIN ANALYZE
SELECT id, email, created_at 
FROM users 
WHERE email = 'engineer@example.com';
-- Index Scan using idx_users_email on users (cost=0.42..8.44 rows=1 width=45) (actual time=0.045..0.047 rows=1 loops=1)
-- Execution Time: 0.082 ms (over 500x faster)
```

---

### Say this in the interview

*"An index turns an O(N) scan into an O(log N) seek. Databases use B+ Trees instead of hash tables because they support range queries and sorting, and instead of binary trees because high fan-out keeps the tree only 3-4 levels deep even at a billion rows. B+ Trees beat plain B-Trees because internal pages hold only keys, and leaves are linked for fast range scans."*
