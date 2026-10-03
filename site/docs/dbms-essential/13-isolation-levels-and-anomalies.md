---
id: 13-isolation-levels-and-anomalies
title: "Transaction Isolation Levels and Anomalies"
description: "Master ANSI SQL isolation levels, Dirty/Non-Repeatable/Phantom reads, the Berenson critique, Write Skew, and 2PL vs MVCC vs SSI."
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are the four ANSI SQL transaction isolation levels? What concurrency anomalies does each prevent or permit, what is Write Skew, and how do modern engines enforce isolation under the hood?"

The **Isolation** property of ACID governs how concurrent transactions observe each other's tentative mutations. The SQL-92 standard defines four formal **Isolation Levels**, each balancing **data consistency** against **concurrency throughput**.

---

### The ANSI SQL Isolation Matrix

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Concurrency & Engine Defaults |
| :--- | :---: | :---: | :---: | :--- |
| **Read Uncommitted** | Permitted | Permitted | Permitted | Highest throughput; zero lock overhead. |
| **Read Committed** | **Prevented** | Permitted | Permitted | Default in **PostgreSQL, Oracle, SQL Server**. |
| **Repeatable Read** | **Prevented** | **Prevented** | Permitted (ANSI) / **Prevented** (MySQL InnoDB) | Default in **MySQL InnoDB**. |
| **Serializable** | **Prevented** | **Prevented** | **Prevented** | Strict serial order or serialization aborts. |

---

### The Classic ANSI Anomalies Defined

#### 1. Dirty Read ($G_1$)
A transaction reads data that has been modified by another concurrent transaction that **has not yet committed**. If the modifying transaction subsequently executes a `ROLLBACK`, the first transaction made decisions based on "dirty" phantom data that never officially existed in the database.

#### 2. Non-Repeatable Read / Fuzzy Read ($G_{2a}$)
A transaction reads a row once. Another concurrent transaction **modifies or deletes** that exact row and commits. When the first transaction re-reads the row, it observes modified values or finds the row deleted.

#### 3. Phantom Read ($G_{2b}$)
A transaction executes a range query (e.g., `SELECT COUNT(*) FROM orders WHERE user_id = 5`). Another concurrent transaction **inserts new rows** matching that range predicate and commits. When the first transaction runs the same query again, "phantom" rows appear that were not present previously.

---

### The ANSI-92 Incompleteness Critique: Write Skew

In 1995, database researchers (Berenson et al.) published a landmark paper proving that the ANSI-92 isolation definitions were incomplete because they were framed strictly around lock-based locking behaviors and omitted anomalies present in snapshot-based engines:

#### The Classic Anomaly: Write Skew
**Write Skew** occurs under **Snapshot Isolation / Repeatable Read** when two concurrent transactions read overlapping data, verify a shared application invariant, perform disjoint writes, and commit, leaving the database in a state that violates the invariant.

#### The Doctor On-Call Problem:
- **Hospital Invariant:** At least one doctor must be actively on call at all times.
- Doctors **Alice** and **Bob** are currently on call (`count = 2`).
- **Transaction 1 (Alice):** Checks `SELECT COUNT(*) FROM doctors WHERE on_call = true`. The count is 2 ($\ge 2$), so Alice updates her status: `UPDATE doctors SET on_call = false WHERE name = 'Alice'`.
- **Transaction 2 (Bob):** Simultaneously checks `SELECT COUNT(*) FROM doctors WHERE on_call = true`. In its snapshot, the count is also 2 ($\ge 2$), so Bob updates his status: `UPDATE doctors SET on_call = false WHERE name = 'Bob'`.
- **The Outcome:** Because Alice modified row `Alice` and Bob modified row `Bob`, there is **no write-write conflict**. Under standard Repeatable Read / Snapshot Isolation, **both transactions commit successfully**.
- **The Disaster:** Zero doctors remain on call! The hospital invariant is violated. Only **Serializable** isolation prevents Write Skew.

---

### Under the Hood: How Engines Enforce Isolation

Modern relational databases employ two distinct paradigms:

#### 1. Two-Phase Locking (2PL) - Pessimistic
- **Read Committed:** Acquires Shared (S) locks on rows while reading, releasing them immediately after the statement finishes. Exclusive (X) locks are held until commit.
- **Repeatable Read:** Holds Shared (S) locks until the entire transaction completes.
- **Serializable:** Acquires **Predicate Locks** or **Next-Key Locks** on the index gap to block concurrent inserts into read ranges.

#### 2. Multi-Version Concurrency Control (MVCC) - Optimistic Snapshots
PostgreSQL and MySQL InnoDB avoid locking read queries by keeping multiple version tuples of each row:
- **Read Committed:** Every individual SQL statement generates a brand-new **Snapshot** of the database at statement start time.
- **Repeatable Read:** The snapshot is frozen at the **beginning of the transaction**. Every query within the transaction sees the database exactly as it was when the transaction began.
- *Core Advantage:* **Readers never block writers, and writers never block readers!**

---

### The ELI5 Analogy: Editing a Shared Document

- **Read Uncommitted:** You see letters appearing character-by-character as your colleague types them, even if they hit `Ctrl+Z` (undo) a second later.
- **Read Committed:** You only see sentences after your colleague hits "Save". But if they rewrite paragraph 2 five minutes later, your view changes midway through reading.
- **Repeatable Read:** When you open the doc, you receive a frozen PDF snapshot. No matter how many edits colleagues publish to the live doc, your PDF stays identical.
- **Serializable:** Only one person can have the document open at any given moment. Everyone else waits in an orderly queue.

---

### Summary
"ANSI SQL defines four isolation levels: Read Uncommitted permits all anomalies; Read Committed prevents dirty reads using statement-level snapshots; Repeatable Read prevents non-repeatable reads using transaction-level snapshots; Serializable prevents all anomalies, including Write Skew, using strict locking or serializable snapshot isolation (SSI)."

---

### Crucial Nuance: MySQL vs. PostgreSQL Engine Differences
1. **MySQL InnoDB:** Defaults to `Repeatable Read`. It eliminates phantom reads during consistent non-locking reads using MVCC snapshots, and eliminates them during locking reads (`SELECT ... FOR UPDATE`) using **Next-Key Locks** (record locks + gap locks).
2. **PostgreSQL:** Defaults to `Read Committed`. For `Serializable`, PostgreSQL uses **Serializable Snapshot Isolation (SSI)**: a lock-free mechanism that tracks read-write conflicts (SIREAD locks) in an in-memory graph and automatically aborts transactions that create dependency cycles (`40001 serialization_failure`), delivering true serializability without reader-writer locks.

---

### Code Demonstration: Write Skew Under Repeatable Read

```sql
-- Setup: Hospital On-Call Table
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
-- Returns: 2 (Safe to take leave)
                                      SELECT COUNT(*) FROM doctors 
                                      WHERE on_call = true;
                                      -- Returns: 2 (Safe to take leave)

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
-- Invariant broken due to Write Skew. 
-- Fix: Use SERIALIZABLE isolation, which forces Session 2 to abort.
```
