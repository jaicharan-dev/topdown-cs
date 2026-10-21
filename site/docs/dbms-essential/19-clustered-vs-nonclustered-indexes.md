---
id: 19-clustered-vs-nonclustered-indexes
title: "Clustered vs. Non-Clustered (Secondary) Indexes"
description: "Clustered vs. non-clustered indexes explained plainly: what each one actually stores, bookmark lookups, covering indexes, and the leftmost prefix rule."
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a clustered and a non-clustered index? Why can a table only have one clustered index, how do MySQL and PostgreSQL differ in table storage, and what is a covering index?"

Think of a history textbook. The chapters themselves are physically printed in chronological order — that ordering *is* the book. Now flip to the index at the back: "Napoleon... page 142." That entry doesn't contain the content, just a pointer — you still have to flip to page 142 to read about him.

That's the difference between the two kinds of index:

<Diagram>
<Row>
<Box label="Clustered index" sub="is the table" />
<Arrow label="vs." />
<Box label="Non-clustered index" sub="key + pointer" />
</Row>
</Diagram>

| Dimension | Clustered Index | Non-Clustered (Secondary) Index |
| :--- | :--- | :--- |
| **Physical storage** | **Is** the table — decides the physical order of pages on disk | A separate B+ tree stored apart from the table data |
| **How many per table** | Exactly 1 | Many (up to 64 in MySQL) |
| **What the leaf holds** | The full row (every column) | The indexed key + a pointer to the real row |
| **What the pointer looks like** | N/A — it's already the data | **InnoDB:** the primary key value. **Postgres (heap tables):** a tuple ID (`ctid`: block + offset) |
| **Lookup speed** | Fastest — one seek gets you the full row | Needs a second lookup (bookmark lookup) unless it's covering |

---

### Why a table can only have one clustered index

A clustered index decides the physical order rows are stored in on disk. Just like a shelf of books can only be arranged in one order — alphabetical or by publish date, never both at once — a table's rows can only have one physical ordering.

---

### The cost of a non-clustered index: the bookmark lookup

```sql
SELECT name, balance FROM users WHERE email = 'bob@gmail.com';
```

1. The database searches the `email` index and finds `bob@gmail.com`.
2. The leaf node gives back the primary key, say `PK = 2` — not the actual row.
3. The database now has to do a *second* search, this time down the clustered index, to fetch `PK = 2` and read `name` and `balance`.

That second search is a **bookmark lookup** (or key lookup). If a query matches 10,000 rows, that's 10,000 extra random-access lookups — slow enough that the query planner sometimes gives up on the index entirely and scans the whole table instead.

---

### The fix: a covering index

A **covering index** includes every column the query actually needs, so the database never has to go back to the clustered index at all:

```sql
-- Covers both the filter column and the columns being selected
CREATE INDEX idx_user_email_covered ON users (email, name, balance);

SELECT name, balance FROM users WHERE email = 'bob@gmail.com';
```

Now `name` and `balance` are sitting right there in the secondary index's leaf node. No second lookup. Query plans call this an **Index-Only Scan**.

---

### Not every database stores tables the same way

- **MySQL InnoDB** — the table itself *is* the primary-key B+ tree (an "index-organized table"). If you don't declare a primary key, InnoDB picks the first unique key it finds, or silently generates a hidden row ID. Every secondary index stores the primary key as its pointer.
- **PostgreSQL** — tables are unsorted **heaps**. New rows go wherever there's free space. The primary key here is really just a unique secondary index, and every index stores a physical pointer called a `ctid` (block number + offset).

---

### The leftmost prefix rule

For a composite index on `(A, B, C)`, the order matters:
- `WHERE A = 1` → fast index seek
- `WHERE A = 1 AND B = 2` → still a fast index seek
- `WHERE B = 2` or `WHERE C = 3` alone → can't use the index seek at all

The index is sorted by `A` first, so skipping `A` means the database can't jump directly to anything — it has to scan. Put your most selective equality columns first.

---

### Code: bookmark lookup vs. covering index

```sql
-- Setup
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL
);

-- -------------------------------------------------------------
-- Scenario 1: plain secondary index -> triggers a bookmark lookup
-- -------------------------------------------------------------
CREATE INDEX idx_users_email ON users(email);

EXPLAIN ANALYZE
SELECT first_name, last_name FROM users WHERE email = 'bob@example.com';
-- Plan: Index Scan on idx_users_email -> fetch PK -> table fetch (bookmark lookup)

-- -------------------------------------------------------------
-- Scenario 2: covering index -> index-only scan
-- -------------------------------------------------------------
CREATE INDEX idx_users_email_covering ON users(email, first_name, last_name);

-- Or, in Postgres/SQL Server, keep the index lean with INCLUDE:
-- CREATE INDEX idx_users_email_inc ON users(email) INCLUDE (first_name, last_name);

EXPLAIN ANALYZE
SELECT first_name, last_name FROM users WHERE email = 'bob@example.com';
-- Plan: Index Only Scan using idx_users_email_covering
-- Heap Fetches: 0 (zero round trips to the main table)
```

---

### One thing worth remembering: key size matters

In InnoDB, every secondary index stores a copy of the primary key at its leaves. If your primary key is a 36-character UUID instead of an 8-byte integer, that string gets duplicated into *every* secondary index on the table — bloating memory in the buffer pool. Favor small, sequential primary keys when you can.

---

### Say this in the interview

*"A clustered index physically orders the table and stores full rows at its leaves — there's only one per table. A non-clustered index is a separate structure that stores a pointer back to the row, which costs a bookmark lookup unless it's a covering index that already contains everything the query needs."*
