---
id: 14-dirty-read-nonrepeatable-read-phantom-read
title: "Dirty Read vs. Non-Repeatable Read vs. Phantom Read"
description: "Deep dive into Dirty Reads, Non-Repeatable Reads, Phantom Reads, Lost Updates, and why row locks cannot stop phantom records."
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact technical difference between a dirty read, a non-repeatable read, and a phantom read? Why can't row-level locks prevent phantom reads, and what is the lost update anomaly?"

Concurrency anomalies emerge when multiple transactions execute simultaneously without adequate isolation barriers. The ANSI SQL standard defines three primary read phenomena: **Dirty Read**, **Non-Repeatable Read**, and **Phantom Read**. In senior engineering interviews, you are also expected to master the **Lost Update** anomaly and understand why traditional row-level locks fail against phantoms.

---

### 1. Dirty Read ($G_1$: Reading Uncommitted Data)

A Dirty Read occurs when Transaction A reads modifications made by Transaction B before Transaction B has committed. If Transaction B subsequently **aborts and rolls back**, Transaction A has processed invalid data that never existed.

```
Timeline of a Dirty Read:

Time | Transaction A (Reader)             | Transaction B (Writer)
-----+------------------------------------+-------------------------------------
T1   |                                    | BEGIN;
T2   |                                    | UPDATE accounts SET balance = 5000 
     |                                    | WHERE id = 1; (Old balance: $100)
T3   | BEGIN;                             |
T4   | SELECT balance FROM accounts       | 
     | WHERE id = 1;                      |
     | --> Reads $5000 (Dirty Read!)      |
T5   | Dispatches $5000 loan to user...   |
T6   |                                    | ROLLBACK; (Transaction failed)
     |                                    | (Balance on disk reverts to $100)
T7   | COMMIT;                            |
```
*Impact:* Transaction A dispersed real capital based on temporary uncommitted dirty memory.

---

### 2. Non-Repeatable Read ($G_{2a}$: Fuzzy Read)

A Non-Repeatable Read occurs when a transaction reads the **exact same row** twice within its transaction boundary and discovers that the row's values have been **modified or deleted** by a concurrent transaction that successfully committed.

```
Timeline of a Non-Repeatable Read:

Time | Transaction A (Auditor)            | Transaction B (Salary Admin)
-----+------------------------------------+-------------------------------------
T1   | BEGIN;                             | 
T2   | SELECT salary FROM employees       | 
     | WHERE id = 42;                     | 
     | --> Returns: $80,000               | 
T3   |                                    | BEGIN;
T4   |                                    | UPDATE employees SET salary = 95000 
     |                                    | WHERE id = 42;
T5   |                                    | COMMIT; (Persisted permanently)
T6   | SELECT salary FROM employees       | 
     | WHERE id = 42;                     | 
     | --> Returns: $95,000!              |
     | (Same query, different values!)    |
T7   | COMMIT;                            | 
```
*Impact:* Transaction A generates an internally inconsistent audit report because row state mutated mid-transaction.

---

### 3. Phantom Read ($G_{2b}$: Range Mutation)

A Phantom Read occurs when a transaction queries a **set of rows matching a search condition (predicate range)**, and upon re-executing the query, discovers **newly inserted rows** (or deleted rows) committed by another transaction.

```
Timeline of a Phantom Read:

Time | Transaction A (Bonus Evaluator)    | Transaction B (HR Onboarding)
-----+------------------------------------+-------------------------------------
T1   | BEGIN;                             | 
T2   | SELECT COUNT(*) FROM employees     | 
     | WHERE dept = 'Sales';              | 
     | --> Returns: 10 employees          | 
T3   |                                    | BEGIN;
T4   |                                    | INSERT INTO employees (name, dept) 
     |                                    | VALUES ('David', 'Sales');
T5   |                                    | COMMIT; (New record persisted)
T6   | SELECT COUNT(*) FROM employees     | 
     | WHERE dept = 'Sales';              | 
     | --> Returns: 11 employees!         | 
     | (A "phantom" employee appeared!)   |
T7   | COMMIT;                            | 
```

---

### The Crucial Interview Trap: Why Can't Row Locks Stop Phantoms?

Interviewers frequently challenge candidates: *"If row-level locks prevent Non-Repeatable Reads, why don't they prevent Phantom Reads?"*

#### The Non-Existence Problem:
When Transaction A runs `SELECT * FROM employees WHERE dept = 'Sales'`, the database engine can lock every existing row where `dept = 'Sales'`. 

However, the row Transaction B wants to insert (`David, Sales`) **does not exist yet on disk or in the buffer pool!** A database engine cannot place a lock on a row that does not physically exist.

#### How Engines Solve It:
1. **Gap Locks & Next-Key Locks (MySQL InnoDB):** Instead of locking only existing rows, InnoDB places locks on the **gaps** between index entries in the B+ tree. If existing IDs are 10 and 20, a gap lock covers the open interval `(10, 20)`, blocking any transaction attempting to insert ID 15.
2. **Predicate Locking:** The theoretical gold standard where the engine locks the mathematical predicate (`dept = 'Sales'`), blocking any write whose tuple satisfies the predicate.

---

### The Fourth Anomaly: The Lost Update ($P_4$)

A **Lost Update** occurs when two concurrent transactions read the same initial value and compute updates based on that value in application memory. The later commit silently overwrites the earlier commit without incorporating its changes.

```
Time | Transaction 1 (Add $20)            | Transaction 2 (Add $30)
-----+------------------------------------+-------------------------------------
T1   | Reads balance ($100)               | 
T2   |                                    | Reads balance ($100)
T3   | Computes $100 + $20 = $120         | Computes $100 + $30 = $130
T4   | Writes balance = $120; COMMIT;     | 
T5   |                                    | Writes balance = $130; COMMIT;
```
*Result:* Balance is \$130. Transaction 1's \$20 deposit was completely lost!

#### Prevention Strategies:
1. **Atomic SQL Expressions:** `UPDATE accounts SET balance = balance + 20 WHERE id = 1;` (pushes calculation to database engine row-lock level).
2. **Pessimistic Locking:** Read with `SELECT ... FOR UPDATE` to serialize access.
3. **Optimistic Concurrency Control (OCC):** Add a `version` column: `UPDATE accounts SET balance = 120, version = version + 1 WHERE id = 1 AND version = 5;`.

---

### The Comparison Matrix

| Anomaly | Scope | Triggering Operation | Engine Defense |
| :--- | :--- | :--- | :--- |
| **Dirty Read** | Single uncommitted row | `UPDATE` / `DELETE` rolled back | MVCC Statement Snapshot or Shared Read Locks |
| **Non-Repeatable Read** | Single existing row | Committed `UPDATE` / `DELETE` | MVCC Transaction Snapshot or Long-term Row S-Locks |
| **Phantom Read** | Range / Predicate of rows | Committed `INSERT` / `DELETE` | **Next-Key Locks** or Predicate Locks |
| **Lost Update** | Single existing row | Concurrent uncoordinated writes | Atomic SQL, `FOR UPDATE`, or Version Columns |

---

### Summary
"A dirty read reads uncommitted data that may roll back; a non-repeatable read sees modified values on an existing row; a phantom read sees newly inserted rows matching a range query. Traditional row locks cannot prevent phantoms because the phantom row does not yet exist, requiring Next-Key or gap locking."

---

### Crucial Nuance: Snapshot Isolation vs. Write Skew
While PostgreSQL's `Repeatable Read` (Snapshot Isolation) prevents Dirty, Non-Repeatable, and Phantom reads, it does **not** prevent **Write Skew**. Two transactions reading overlapping rows to verify a shared invariant can make disjoint writes to separate rows and commit simultaneously, breaking the invariant (e.g., the classic Doctor On-Call problem). True protection requires `SERIALIZABLE` or explicit `SELECT ... FOR UPDATE` locks.

---

### Code Demonstration: Preventing Lost Updates (Pessimistic vs. Atomic)

```sql
-- Setup: Bank account table
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    balance NUMERIC(10, 2) NOT NULL,
    version INT DEFAULT 1
);

INSERT INTO accounts VALUES (1, 100.00, 1);

-- -------------------------------------------------------------
-- Strategy 1: Atomic Database Update (Best for Simple Counters)
-- -------------------------------------------------------------
-- Bypasses application memory; engine acquires row-level X-lock:
UPDATE accounts 
SET balance = balance + 20.00 
WHERE id = 1;

-- -------------------------------------------------------------
-- Strategy 2: Pessimistic Locking (SELECT ... FOR UPDATE)
-- -------------------------------------------------------------
BEGIN;
-- Locks row 1 with an Exclusive lock; concurrent readers block until COMMIT:
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;

-- Application executes business rules safely:
UPDATE accounts SET balance = balance + 20.00 WHERE id = 1;
COMMIT;

-- -------------------------------------------------------------
-- Strategy 3: Optimistic Concurrency Control (OCC)
-- -------------------------------------------------------------
-- Application reads balance and current version (e.g., version = 1):
UPDATE accounts 
SET balance = 120.00, version = version + 1 
WHERE id = 1 AND version = 1;
-- If affected rows == 0, another transaction modified the row; abort or retry!
```
