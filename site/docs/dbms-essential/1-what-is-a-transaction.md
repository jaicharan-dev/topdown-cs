---
id: 1-what-is-a-transaction
title: "What is a Database Transaction?"
description: "Understand database transactions, the problems they solve, state transitions, savepoints, and the WAL log-ahead rule."
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a transaction, and why do we need it? What happens if an operation fails halfway through without one, how do Savepoints enable partial rollbacks, and what is the WAL Log-Ahead Rule?"

Think about packing a parachute. You either finish every folding step, or none of them count — there's no such thing as jumping with a half-packed parachute. A database transaction works the same way: a group of changes that either all happen, or none of them do.

---

### Why we need transactions

Take a bank transfer of $100 from Alice to Bob. That's two separate steps:

1. Subtract $100 from Alice's account
2. Add $100 to Bob's account

Say step 1 finishes, then the server crashes before step 2 runs.

- **Without a transaction:** Alice's $100 is just gone. It never reached Bob. The database is now wrong.
- **With a transaction:** on reboot, the database sees step 2 never finished, and undoes step 1 too. Alice gets her $100 back.

```sql
BEGIN TRANSACTION;

UPDATE accounts 
SET balance = balance - 100 
WHERE user_id = 'alice' AND balance >= 100;

-- If the app crashes or throws here:
-- the database aborts and rolls back automatically.

UPDATE accounts 
SET balance = balance + 100 
WHERE user_id = 'bob';

COMMIT;
```

---

### The transaction state machine

A transaction moves through five states as it runs:

<Diagram>
<Row>
<Box label="Active" sub="running" />
<Arrow />
<Box label="Partially Committed" sub="in memory" />
<Arrow />
<Box label="Committed" sub="on disk" />
</Row>
</Diagram>

<Diagram>
<Row>
<Box label="Failed" />
<Arrow />
<Box label="Aborted" sub="rolled back" />
</Row>
</Diagram>

1. **Active** — statements are running.
2. **Partially Committed** — every statement has run in memory, but hasn't been flushed to disk yet.
3. **Failed** — something went wrong: a check failed, a deadlock, a crash.
4. **Aborted** — the database uses the rollback log to undo every change, back to how things were before `BEGIN`.
5. **Committed** — changes are safely on disk. From here, nothing can roll this back.

---

### Rolling back just one step: Savepoints

Interviewers like to ask: *"Can you undo one failed operation without throwing away the whole transaction?"* Yes — with a savepoint, a named checkpoint inside the transaction:

```sql
BEGIN TRANSACTION;

INSERT INTO orders (order_id, user_id) VALUES (501, 'alice');
SAVEPOINT payment_attempt;

-- Try a secondary payment method
INSERT INTO payments (order_id, method, status) VALUES (501, 'crypto', 'FAILED');

-- Undo only the failed payment, keep the order
ROLLBACK TO payment_attempt;

-- Fall back to credit card
INSERT INTO payments (order_id, method, status) VALUES (501, 'credit_card', 'SUCCESS');

COMMIT;
```

Most databases (PostgreSQL, MySQL) don't have true nested transactions — savepoints are how they fake it.

---

### How crash recovery works: the Log-Ahead rule

How does the database guarantee rollbacks and crash recovery always work? With **Write-Ahead Logging (WAL)**:

> **The rule:** before any change is written to the real data file on disk, the database must first write (and confirm) a log entry describing that change.

So if the server crashes mid-transaction, the database reads that log on restart and knows exactly what to do:
- **Redo** — replay the changes for transactions that had already committed.
- **Undo** — reverse the changes for transactions that were still in progress.

---

### Say this in the interview

*"A transaction is a group of database operations that either all succeed (**commit**) or all get undone (**rollback**) — there's no in-between state."*

---

### One more thing: auto-commit

By default, most databases (MySQL, PostgreSQL) run in `AUTOCOMMIT = ON` mode — every single statement is automatically its own mini-transaction. To group several statements into one atomic unit, you have to explicitly wrap them in `BEGIN` ... `COMMIT`.
