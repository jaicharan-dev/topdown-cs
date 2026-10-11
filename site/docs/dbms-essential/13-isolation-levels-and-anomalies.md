---
id: 13-isolation-levels-and-anomalies
title: "Transaction Isolation Levels and Anomalies"
description: "The four SQL isolation levels in plain English, what dirty/non-repeatable/phantom reads actually are, Write Skew, and how 2PL/MVCC enforce it."
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are the four ANSI SQL transaction isolation levels? What concurrency anomalies does each prevent or permit, what is Write Skew, and how do modern engines enforce isolation under the hood?"

Think about editing a shared document with coworkers. How much of their half-finished editing are you allowed to see? That's exactly what **isolation** controls: how much of one transaction's in-progress changes another transaction is allowed to see. The SQL standard defines four levels, each trading some consistency for some speed:

- **Read Uncommitted:** you see letters appear as your colleague types, even if they immediately hit Ctrl+Z.
- **Read Committed:** you only see sentences after they hit Save — but if they rewrite paragraph 2 five minutes later, your view changes mid-read.
- **Repeatable Read:** when you open the doc, you get a frozen snapshot. No matter what anyone else publishes afterward, your copy doesn't change.
- **Serializable:** only one person can have the document open at a time — everyone else waits in line.

---

### The isolation matrix

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Where it's the default |
| :--- | :---: | :---: | :---: | :--- |
| **Read Uncommitted** | Allowed | Allowed | Allowed | Highest throughput, no locking overhead |
| **Read Committed** | **Blocked** | Allowed | Allowed | PostgreSQL, Oracle, SQL Server |
| **Repeatable Read** | **Blocked** | **Blocked** | Allowed (spec) / **Blocked** (MySQL) | MySQL InnoDB |
| **Serializable** | **Blocked** | **Blocked** | **Blocked** | Strict ordering, or it aborts a transaction |

---

### The three classic anomalies

**Dirty Read** — you read a value another transaction changed but hasn't committed yet. If that transaction then rolls back, you made a decision based on data that never officially existed.

**Non-Repeatable Read** — you read the same row twice in one transaction, and get two different answers, because someone else updated (or deleted) it and committed in between.

**Phantom Read** — you run the same range query twice (e.g. "count orders for user 5"), and get a different row count the second time, because someone else inserted (or deleted) rows that match your filter in between.

---

### The anomaly the standard missed: Write Skew

In 1995, a paper by Berenson et al. pointed out that the SQL-92 definitions above were written around locking behavior, and missed an anomaly that shows up in snapshot-based engines (like Postgres and MySQL). It's called **Write Skew**: two transactions each read overlapping data, each check that some shared rule still holds, and each write to a *different* row — so there's no conflict the database can see, even though together they break the rule.

**The on-call doctor example:**
- Rule: at least one doctor must be on call at all times.
- Alice and Bob are both currently on call (`count = 2`).
- **Alice's transaction:** checks `SELECT COUNT(*) ... WHERE on_call = true` → sees 2, decides it's safe to go off call, updates her own row.
- **Bob's transaction:** at the same time, runs the same check → also sees 2, also decides it's safe, updates his own row.
- Neither transaction touched the other's row, so there's no write-write conflict. Both commit.
- Result: zero doctors on call. The rule is broken, and only **Serializable** isolation would have stopped it.

---

### How engines actually enforce this

**Two-Phase Locking (2PL)** — pessimistic, lock-based:
- Read Committed: takes a shared lock while reading a row, releases it right after; exclusive locks are held until commit.
- Repeatable Read: holds shared locks for the whole transaction.
- Serializable: locks the gaps between index entries too, so nothing new can be inserted into a range you've already read.

**Multi-Version Concurrency Control (MVCC)** — used by Postgres and InnoDB, avoids locking reads entirely by keeping multiple versions of each row:
- Read Committed: every statement gets a fresh snapshot of the database as of that statement.
- Repeatable Read: the snapshot is taken once, at the start of the transaction, and never changes.
- The upside: readers never block writers, and writers never block readers.

---

### Engine differences worth knowing

- **MySQL InnoDB** defaults to Repeatable Read. It blocks phantom reads for plain reads using MVCC, and for locking reads (`SELECT ... FOR UPDATE`) using next-key locks (row locks + gap locks).
- **PostgreSQL** defaults to Read Committed. Its Serializable level uses **Serializable Snapshot Isolation (SSI)** — a lock-free approach that watches for read/write conflicts and aborts a transaction (`40001 serialization_failure`) if committing it would create a cycle.

---

### Code: Write Skew under Repeatable Read

```sql
-- Setup: hospital on-call table
CREATE TABLE doctors (
    id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    on_call BOOLEAN NOT NULL
);

INSERT INTO doctors VALUES (1, 'Alice', true), (2, 'Bob', true);

-- =============================================================
-- SESSION 1 (Dr. Alice)              SESSION 2 (Dr. Bob)
-- =============================================================
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
                                      SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
                                      BEGIN;

-- Both check if at least 2 doctors are on call:
SELECT COUNT(*) FROM doctors 
WHERE on_call = true;
-- Returns: 2 (safe to go off call)
                                      SELECT COUNT(*) FROM doctors 
                                      WHERE on_call = true;
                                      -- Returns: 2 (safe to go off call)

-- Alice goes off call:
UPDATE doctors 
SET on_call = false 
WHERE name = 'Alice';
                                      -- Bob goes off call:
                                      UPDATE doctors 
                                      SET on_call = false 
                                      WHERE name = 'Bob';

COMMIT;
                                      COMMIT;
-- BOTH TRANSACTIONS COMMIT SUCCESSFULLY!
-- Result: SELECT COUNT(*) FROM doctors WHERE on_call = true -> Returns 0!
-- The rule is broken because of Write Skew.
-- Fix: use SERIALIZABLE isolation, which would force one session to abort.
```

---

### Say this in the interview

*"Read Uncommitted allows every anomaly. Read Committed blocks dirty reads with a fresh snapshot per statement. Repeatable Read blocks non-repeatable reads with one snapshot per transaction. Serializable blocks everything, including Write Skew, through strict locking or serializable snapshot isolation."*
