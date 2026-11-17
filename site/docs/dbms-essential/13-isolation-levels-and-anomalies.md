---
id: 13-isolation-levels-and-anomalies
title: "Transaction Isolation Levels and Anomalies"
description: "Four levels, three anomalies they were designed around, and one anomaly the list forgot"

sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are the four ANSI SQL transaction isolation levels? What concurrency anomalies does each prevent or permit, what is Write Skew, and how do modern engines enforce isolation under the hood?"

---

### Picture it

A shared noticeboard, and several people updating it at once. Isolation is the set of rules about **what you are allowed to see while somebody else is mid-edit**, and there are four settings, from reckless to paranoid.

**Reckless.** You read whatever is pinned up right now, including a note somebody is still writing and may tear down. You might act on a figure that never officially existed.

**Normal.** You only read notes that have been properly posted. But if you read the same note twice during your own work, you may get two different answers, because somebody replaced it in between.

**Careful.** When you start, you take a **photograph** of the board, and you work from the photograph. Every note you look at stays exactly as it was when you began. New notes pinned up while you work are invisible to you.

**Paranoid.** The board is effectively yours while you work. Nobody can interfere, and everybody's work ends up looking as though it happened one person at a time.

Now the part that makes this question interesting.

Two doctors are checking the on-call rota. The rule is **at least one doctor must stay on call**. Each takes a photograph of the board. Each photograph shows two doctors on call. Each doctor reasons "there's another one, so I can go off call", crosses out **their own name only**, and pins it back up.

Neither read a half-written note. Neither re-read anything and got a different answer. Neither was affected by a new note appearing. **Every rule of the careful setting was obeyed.** And now nobody is on call.

What went wrong is that they read an **overlapping** set of facts and then wrote to **different** places. Nothing collided, so nothing was detected, and the combination of two individually safe decisions broke the rule. That is a fourth kind of failure, and the famous four-by-three table of levels and anomalies does not contain it.

---

### The proper terms

#### The three anomalies the standard names

**Dirty read.** Transaction A reads a row that transaction B has modified but **not committed**. If B rolls back, A acted on a value that never existed.

**Non-repeatable read.** A reads a row, B **updates and commits** it, A reads the **same row** again and sees a different value. The anomaly concerns one row changing.

**Phantom read.** A runs a query matching a **set** of rows, B **inserts or deletes** a row that matches that predicate and commits, A runs the same query and the set membership differs. The anomaly concerns **rows appearing or disappearing from a range**, which is why it needs a different mechanism to prevent.

The distinction between the last two is the usual follow-up: non-repeatable read is about an **existing row's value**, phantom read is about **which rows exist**.

#### The four levels

| Level | Dirty read | Non-repeatable read | Phantom read |
| --- | --- | --- | --- |
| **READ UNCOMMITTED** | possible | possible | possible |
| **READ COMMITTED** | prevented | possible | possible |
| **REPEATABLE READ** | prevented | prevented | possible |
| **SERIALIZABLE** | prevented | prevented | prevented |

**READ UNCOMMITTED** permits everything. It is almost never useful, and several engines do not really implement it.

**READ COMMITTED** guarantees you only see committed data. It is the **default in PostgreSQL, Oracle and SQL Server**, and it is where most production systems actually run.

**REPEATABLE READ** guarantees that a row you read will not change if you read it again. It is the **default in MySQL InnoDB**.

**SERIALIZABLE** guarantees the result is equivalent to running the transactions **one at a time in some order**.

The pattern is that each level removes one more anomaly at the cost of concurrency, and the table is really a **menu of what you are willing to tolerate**.

#### Write skew, and why the table is incomplete

**Write skew** occurs when two concurrent transactions **read an overlapping set of rows**, each makes a decision based on what it read, and each then **writes to a different row**, so there is no write conflict to detect. Both commit, and the combination **violates an invariant that each transaction individually preserved**.

The on-call example is the canonical one. The invariant is "at least one doctor on call". Each transaction checks it, sees it satisfied, and removes itself. No two writes touch the same row, so nothing collides.

The crucial point for the interview: **write skew is not any of the three ANSI anomalies.** There is no dirty read, no non-repeatable read and no phantom read. This is why the famous Berenson paper of 1995 showed that **snapshot isolation does not fit into the ANSI hierarchy at all**: it prevents all three named anomalies and still permits write skew, so it is neither REPEATABLE READ nor SERIALIZABLE in the standard's terms.

The general shape to recognise: write skew appears whenever an invariant spans **multiple rows** and a transaction **reads** those rows to decide what to **write** elsewhere. Booking the last seat, enforcing a minimum balance across two accounts, enforcing uniqueness without a unique constraint, and claiming an item from a queue are all the same pattern.

The fixes, in order of preference:

**Make the database enforce the invariant** with a constraint, which is immune to this by construction.

**Use true serializable isolation**, which detects it.

**Materialise the conflict** by taking an explicit lock on a row that represents the invariant, or by using `SELECT ... FOR UPDATE` on the rows you read, which turns the read into something that **can** collide.

#### How engines actually enforce isolation

The names in the standard are a poor guide to what engines do, and saying so is part of a good answer.

**PostgreSQL** uses **MVCC** throughout.

**READ UNCOMMITTED is silently treated as READ COMMITTED**, because old row versions are never visible, so dirty reads are impossible by construction.

**READ COMMITTED** takes a fresh snapshot for each statement, which is why two queries in one transaction can see different data.

**REPEATABLE READ** takes one snapshot for the whole transaction, which makes it **snapshot isolation** and therefore also prevents phantoms, making it stronger than the standard requires, while still permitting write skew.

**SERIALIZABLE** uses **SSI**, serializable snapshot isolation: it tracks read and write dependencies between transactions and aborts one when they form a cycle that could not have arisen serially. The consequence for application code is that **transactions can fail with a serialization error and must be retried**, which is the price of not locking.

**MySQL InnoDB** combines MVCC with locking.

**READ COMMITTED** reads a new **read view** per statement.

**REPEATABLE READ**, the default, takes one read view for the transaction. For plain reads it is snapshot isolation. For **locking reads**, `SELECT ... FOR UPDATE` and writes, it applies **next-key locks**, a record lock plus a **gap lock** on the range before it, which **prevents phantoms** by locking the gaps where a row could be inserted. So InnoDB's REPEATABLE READ is stronger than the standard's for locking reads and still permits write skew for plain reads.

**SERIALIZABLE** makes every plain `SELECT` acquire shared locks, degrading to something close to two-phase locking.

**SQL Server** is lock-based by default: READ COMMITTED holds short shared locks, REPEATABLE READ holds them to commit, and SERIALIZABLE adds **range locks** to stop phantoms. It also offers a READ_COMMITTED_SNAPSHOT option and a separate **SNAPSHOT** level which use row versioning instead of locks.

**Oracle** offers only two levels in practice. Its READ COMMITTED is statement-level snapshot, and its **SERIALIZABLE is actually snapshot isolation**, so it permits write skew despite the name.

The practical conclusion worth stating: **the level names are not portable guarantees.** The same words mean materially different things across engines, so you verify the behaviour you need rather than trusting the label.

---

### In code

```sql
-- Dirty read: only possible at READ UNCOMMITTED
-- A                                  B
BEGIN;                                BEGIN;
                                      UPDATE accounts SET bal=0 WHERE id=1;
SELECT bal FROM accounts WHERE id=1;  -- reads 0, uncommitted
                                      ROLLBACK;        -- 0 never existed
-- A acted on a value that was never committed.
```

```sql
-- Non-repeatable read: one ROW changes under you
-- A                                  B
BEGIN;  -- READ COMMITTED
SELECT bal FROM accounts WHERE id=1;  -- 5000
                                      UPDATE accounts SET bal=3000 WHERE id=1;
                                      COMMIT;
SELECT bal FROM accounts WHERE id=1;  -- 3000, different answer, same row
```

```sql
-- Phantom read: WHICH ROWS EXIST changes under you
-- A                                  B
BEGIN;  -- REPEATABLE READ (per the standard)
SELECT COUNT(*) FROM orders WHERE total > 100;   -- 12
                                      INSERT INTO orders(total) VALUES (500);
                                      COMMIT;
SELECT COUNT(*) FROM orders WHERE total > 100;   -- 13, a row appeared
-- note the difference: not a row's VALUE changing, but the SET changing,
-- which is why preventing it needs range or gap locking
```

```sql
-- WRITE SKEW: none of the three anomalies occurs, and the rule still breaks
-- invariant: at least one doctor must remain on call

-- doctor A                              doctor B
BEGIN;  -- SNAPSHOT / REPEATABLE READ    BEGIN;
SELECT COUNT(*) FROM doctors             SELECT COUNT(*) FROM doctors
WHERE  on_call = true;   -- 2            WHERE  on_call = true;   -- 2

-- "there is another one, so I may leave"
UPDATE doctors SET on_call = false       UPDATE doctors SET on_call = false
WHERE  id = 1;                           WHERE  id = 2;
COMMIT;                                  COMMIT;

-- no dirty read, no non-repeatable read, no phantom
-- no two writes touched the same row, so nothing collided
-- result: ZERO doctors on call. The invariant spanned rows; the
--         writes did not.
```

```sql
-- Three fixes, best first

-- 1. let the database own the invariant
ALTER TABLE on_call_summary
  ADD CONSTRAINT at_least_one CHECK (count_on_call >= 1);

-- 2. true serializable: the engine detects the dependency cycle
BEGIN ISOLATION LEVEL SERIALIZABLE;
  SELECT COUNT(*) FROM doctors WHERE on_call = true;
  UPDATE doctors SET on_call = false WHERE id = 1;
COMMIT;   -- Postgres SSI aborts one of the two with a serialization
          -- failure, and the application RETRIES it

-- 3. materialise the conflict so the reads can collide
BEGIN;
  SELECT * FROM doctors WHERE on_call = true FOR UPDATE;   -- now it locks
  UPDATE doctors SET on_call = false WHERE id = 1;
COMMIT;
```

```text
What the engines actually do, which the standard's names hide:

  POSTGRESQL (MVCC throughout)
    READ UNCOMMITTED  silently = READ COMMITTED (dirty reads impossible)
    READ COMMITTED    a fresh snapshot PER STATEMENT
    REPEATABLE READ   one snapshot per TRANSACTION = snapshot isolation
                      -> also prevents phantoms (stronger than required)
                      -> still permits write skew
    SERIALIZABLE      SSI: tracks read/write dependencies, ABORTS one
                      transaction on a dangerous cycle
                      -> your code must handle serialization failures

  MYSQL INNODB (MVCC + locking)
    READ COMMITTED    new read view per statement
    REPEATABLE READ   one read view per transaction (the default)
                      plain reads: snapshot isolation
                      locking reads and writes: NEXT-KEY LOCKS
                        = record lock + gap lock -> prevents phantoms
    SERIALIZABLE      plain SELECTs take shared locks, close to 2PL

  SQL SERVER        lock-based; SERIALIZABLE adds RANGE LOCKS
                    plus READ_COMMITTED_SNAPSHOT and SNAPSHOT levels

  ORACLE            two levels in practice; its SERIALIZABLE is actually
                    snapshot isolation, so it PERMITS write skew

  Conclusion: the level names are not portable guarantees. Verify the
  behaviour you need; do not trust the label.
```

---

### What they ask next

**"What is the difference between a non-repeatable read and a phantom read?"**
A non-repeatable read is an **existing row's value** changing between two reads. A phantom read is **which rows exist** changing, so the same predicate matches a different set. Preventing the first needs a lock on a row; preventing the second needs a lock on a **range**, because you have to lock rows that do not exist yet.

**"Why can row-level locks not prevent phantoms?"**
Because you cannot lock a row that has not been inserted. Stopping an insert into a range needs **gap** or **range** locks covering the predicate, or an approach like SSI that detects the conflict after the fact instead of preventing it.

**"Why is snapshot isolation not in the ANSI table?"**
Because it prevents all three named anomalies yet permits write skew, so it is stronger than REPEATABLE READ and weaker than SERIALIZABLE on a dimension the table does not have. That was Berenson et al.'s point in 1995, and it is why the three-anomaly framework is considered incomplete.

**"What does an application have to do differently under PostgreSQL SERIALIZABLE?"**
Handle **serialization failures**. SSI does not block; it allows transactions to proceed and aborts one if the dependency graph shows the result could not have happened serially. So every transaction needs a retry loop, and transactions should be short to keep the abort rate low.

**"Which level should I use by default?"**
READ COMMITTED is the pragmatic default and what most systems run. Move to serializable for the specific transactions holding a **multi-row invariant**, or better, express that invariant as a database constraint so no isolation level is required to protect it.

**"How do you spot write-skew risk in a code review?"**
Look for a transaction that **reads rows to decide what to write somewhere else**, where the rule being checked spans more than one row. Checking a count then updating one row, checking existence then inserting, or claiming an item after reading its status are all the pattern.

**The common wrong answer** is reproducing the four-by-three table and stopping. The table is the easy half. The valuable half is knowing it is **incomplete**, that write skew sits outside it, and that the level names mean different things in different engines.

---

### Say this in the interview

*"The three anomalies the standard is built around are: a dirty read, where you read a row another transaction has modified but not committed, so if it rolls back you acted on a value that never existed; a non-repeatable read, where you read a row, someone updates and commits it, and reading the same row again gives a different value; and a phantom read, where your query matches a set of rows, someone inserts or deletes a row matching that predicate, and the same query returns a different set. The difference between the last two is that non-repeatable read is about an existing row's value and phantom read is about which rows exist, which is why preventing it needs a range lock rather than a row lock.*

*The four levels are READ UNCOMMITTED, which permits all three and is almost never useful; READ COMMITTED, which prevents dirty reads and is the default in PostgreSQL, Oracle and SQL Server and where most production systems actually run; REPEATABLE READ, which also prevents non-repeatable reads and is the default in MySQL InnoDB; and SERIALIZABLE, which prevents all three and guarantees the result is equivalent to running the transactions one at a time.*

*Write skew is when two concurrent transactions read an overlapping set of rows, each decides something based on what it read, and each writes to a different row, so there is no write conflict to detect. Both commit and the combination breaks an invariant each transaction individually preserved. The canonical case is two on-call doctors, each checking that at least one other is on call, each seeing two, and each removing only themselves, leaving nobody on call. The key point is that write skew is none of the three ANSI anomalies: no dirty read, no non-repeatable read, no phantom. That is why Berenson's 1995 paper showed snapshot isolation does not fit the ANSI hierarchy, since it prevents all three named anomalies and still permits write skew. The pattern to recognise is an invariant spanning multiple rows where a transaction reads those rows to decide what to write elsewhere, which covers booking the last seat, minimum balance across two accounts, and claiming from a queue. The fixes in order are: let the database enforce the invariant with a constraint, which is immune by construction; use true serializable, which detects it; or materialise the conflict with SELECT FOR UPDATE so the reads can actually collide.*

*On enforcement, the standard's names are a poor guide. PostgreSQL is MVCC throughout: READ UNCOMMITTED is silently READ COMMITTED because old versions are never visible; READ COMMITTED takes a fresh snapshot per statement; REPEATABLE READ takes one snapshot per transaction, which makes it snapshot isolation and therefore also prevents phantoms, stronger than the standard requires, while still permitting write skew; and SERIALIZABLE uses SSI, serializable snapshot isolation, tracking read and write dependencies and aborting a transaction when they form a dangerous cycle, so application code must handle serialization failures and retry.*

*MySQL InnoDB combines MVCC with locking. READ COMMITTED takes a new read view per statement. REPEATABLE READ, the default, takes one per transaction, giving snapshot isolation for plain reads, and for locking reads and writes it uses next-key locks, a record lock plus a gap lock on the range before it, which prevents phantoms by locking the gaps where a row could be inserted. SERIALIZABLE makes plain SELECTs take shared locks, close to two-phase locking. SQL Server is lock-based with range locks at serializable, plus snapshot options. Oracle's SERIALIZABLE is actually snapshot isolation, so it permits write skew despite the name. So the level names are not portable guarantees and I would verify the behaviour rather than trust the label."*
