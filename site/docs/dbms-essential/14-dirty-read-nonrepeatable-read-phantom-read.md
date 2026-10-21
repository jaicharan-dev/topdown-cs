---
id: 14-dirty-read-nonrepeatable-read-phantom-read
title: "Dirty Read vs. Non-Repeatable Read vs. Phantom Read"
description: "Dirty reads, non-repeatable reads, phantom reads, and lost updates — with concrete examples, and why row locks can't stop phantoms."
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact technical difference between a dirty read, a non-repeatable read, and a phantom read? Why can't row-level locks prevent phantom reads, and what is the lost update anomaly?"

These three anomalies all come from the same root cause: two transactions running at the same time, one reading while the other writes. The difference is *what* changed between the two reads — an uncommitted value, a committed update to the same row, or a brand new row that wasn't there before.

---

### 1. Dirty Read — reading a value that might not even happen

Transaction A reads a change Transaction B made, before B has committed. If B then rolls back, A made a decision based on data that never actually existed.

<Diagram>
<Row>
<Box label="Transaction B" sub="updates, then rolls back" />
<Arrow label="A reads mid-way" />
<Box label="Transaction A" sub="reads the uncommitted value" />
</Row>
</Diagram>

*Impact:* A real loan gets issued against a balance that was never actually there.

---

### 2. Non-Repeatable Read — the same row gives two different answers

Transaction A reads a row once. Transaction B then updates (or deletes) that same row and commits. When A reads it again, the value has changed, even though A never changed anything itself.

| Step | Transaction A (auditor) | Transaction B (admin) |
| :--- | :--- | :--- |
| 1 | `SELECT salary WHERE id=42` → $80,000 | |
| 2 | | `UPDATE salary=95000 WHERE id=42`; `COMMIT` |
| 3 | `SELECT salary WHERE id=42` → $95,000 (same query, different answer!) | |

*Impact:* A's audit report is internally inconsistent — the row changed underneath it mid-transaction.

---

### 3. Phantom Read — new rows show up out of nowhere

Transaction A runs a query over a range (e.g. "count everyone in Sales"). Transaction B inserts a new row that matches that range and commits. When A re-runs the same query, there's a row it didn't see the first time.

| Step | Transaction A (bonus evaluator) | Transaction B (HR onboarding) |
| :--- | :--- | :--- |
| 1 | `SELECT COUNT(*) WHERE dept='Sales'` → 10 | |
| 2 | | `INSERT ... (David, Sales)`; `COMMIT` |
| 3 | `SELECT COUNT(*) WHERE dept='Sales'` → 11 (a "phantom" row appeared) | |

---

### Why row locks can't stop phantoms

A common follow-up: *"If row locks stop non-repeatable reads, why don't they stop phantom reads?"*

The answer is simple: Transaction A can lock every row that currently matches `dept = 'Sales'`. But the row Transaction B is about to insert doesn't exist yet — you can't lock something that isn't there.

Two real fixes:
1. **Gap locks / next-key locks (MySQL InnoDB):** lock the *gap* between existing index entries. If IDs 10 and 20 exist, a gap lock on `(10, 20)` blocks anyone trying to insert ID 15 there.
2. **Predicate locking:** the theoretical ideal — lock the condition itself (`dept = 'Sales'`), blocking any write that would satisfy it.

---

### The fourth anomaly: Lost Update

A **Lost Update** happens when two transactions read the same value, each compute a new value in application memory, and the second commit silently overwrites the first — without either side knowing about the other's change.

| Step | Transaction 1 (+$20) | Transaction 2 (+$30) |
| :--- | :--- | :--- |
| 1 | reads balance = $100 | |
| 2 | | reads balance = $100 |
| 3 | computes 100+20=120 | computes 100+30=130 |
| 4 | writes 120, commits | |
| 5 | | writes 130, commits |

Final balance: $130. Transaction 1's $20 deposit just vanished.

**How to prevent it:**
1. **Push the math into SQL:** `UPDATE accounts SET balance = balance + 20 WHERE id = 1;` — the database does the read-and-write atomically under a row lock.
2. **Pessimistic locking:** `SELECT ... FOR UPDATE` to lock the row before anyone computes anything.
3. **Optimistic concurrency:** add a `version` column, and only write if the version hasn't moved: `UPDATE accounts SET balance = 120, version = version + 1 WHERE id = 1 AND version = 5;`

---

### The comparison table

| Anomaly | Affects | Caused by | Fixed by |
| :--- | :--- | :--- | :--- |
| **Dirty Read** | A row that might roll back | Uncommitted `UPDATE`/`DELETE` | Statement snapshot (MVCC) or shared read locks |
| **Non-Repeatable Read** | An existing row | Committed `UPDATE`/`DELETE` | Transaction snapshot (MVCC) or long-held row locks |
| **Phantom Read** | A range of rows | Committed `INSERT`/`DELETE` | Next-key locks or predicate locks |
| **Lost Update** | An existing row | Two uncoordinated writes | Atomic SQL, `FOR UPDATE`, or a version column |

---

### One more thing: this isn't the whole story

Even Postgres's Repeatable Read (Snapshot Isolation) — which blocks all three anomalies above — doesn't block **Write Skew**: two transactions can each check a shared rule, write to different rows, and still break the rule together. True protection needs `SERIALIZABLE` or explicit `SELECT ... FOR UPDATE` locks.

---

### Code: preventing lost updates

```sql
-- Setup: bank account table
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    balance NUMERIC(10, 2) NOT NULL,
    version INT DEFAULT 1
);

INSERT INTO accounts VALUES (1, 100.00, 1);

-- -------------------------------------------------------------
-- Strategy 1: Atomic database update (best for simple counters)
-- -------------------------------------------------------------
UPDATE accounts 
SET balance = balance + 20.00 
WHERE id = 1;

-- -------------------------------------------------------------
-- Strategy 2: Pessimistic locking (SELECT ... FOR UPDATE)
-- -------------------------------------------------------------
BEGIN;
-- Locks the row; other writers block until COMMIT:
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;

UPDATE accounts SET balance = balance + 20.00 WHERE id = 1;
COMMIT;

-- -------------------------------------------------------------
-- Strategy 3: Optimistic concurrency control (OCC)
-- -------------------------------------------------------------
UPDATE accounts 
SET balance = 120.00, version = version + 1 
WHERE id = 1 AND version = 1;
-- If 0 rows were affected, someone else updated it first — retry or abort.
```

---

### Say this in the interview

*"A dirty read sees uncommitted data that might roll back. A non-repeatable read sees a committed change to a row it already read. A phantom read sees a new row appear in a range it already queried. Row locks can't stop phantoms because the row doesn't exist yet — that needs gap or predicate locking."*
