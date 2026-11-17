---
id: 14-dirty-read-nonrepeatable-read-phantom-read
title: "Dirty Read vs. Non-Repeatable Read vs. Phantom Read"
description: "Three questions about what changed under you, and why you cannot lock a row that does not exist yet"

sidebar_position: 14
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact technical difference between a dirty read, a non-repeatable read, and a phantom read? Why can't row-level locks prevent phantom reads, and what is the lost update anomaly?"

---

### Picture it

You are auditing a shop's takings while the shop is still trading. Three different things can go wrong, and they are **three different things**, not three degrees of one thing.

**You read a figure that was never real.** A clerk has pencilled in a sale and not finalised it. You copy the number into your audit. The clerk then voids the sale. Your audit now contains a figure that **never officially existed**. The problem is not that the number changed; it is that you were shown something **provisional**.

**You read a real figure twice and got two different answers.** You note that till 3 holds 4000. Later you check again and it holds 2500, because a withdrawal was properly recorded in between. Both figures were real. The problem is that **the same thing** gave you two answers inside one audit, so you cannot produce a coherent report.

**You count something twice and the count changed.** You count the tills with over 1000 in them and get seven. Later you count again and get eight, because a new till was opened and filled. Nothing you looked at changed. **A new thing appeared that matched your question.**

Now the mechanical insight that the second half of the question turns on.

To stop the second problem, you can put your hand on till 3 and refuse to let anybody touch it until you are finished. That works, because till 3 **exists** and can be held.

To stop the third problem, try the same trick. **Which till do you put your hand on?** The till that is going to be opened later does not exist yet. There is nothing to hold. The only thing that would work is forbidding **the opening of any new till that would match your question**, which is not holding an object at all; it is reserving a **description**.

And one more, which is not on the standard list and bites more often than any of them. Two clerks both read that till 3 holds 4000. One adds 500 and writes 4500. The other adds 300 and writes 4300. Both wrote successfully. **The 500 has vanished**, and no error was raised anywhere.

---

### The proper terms

#### The three anomalies, precisely

The crisp way to separate them is to ask what was read, and what changed.

**Dirty read.** Transaction A reads data written by transaction B that has not committed. The defect is in the **status of the data**: it is provisional. If B rolls back, A has read a value that never existed in any committed state, and A's own output is corrupt even if nothing else happens.

**Non-repeatable read.** A reads a row, B updates that row and commits, and A reads the **same row** again, getting a different value. Both values were legitimately committed. The defect is that **one row's value changed within A's lifetime**, so A cannot produce an internally consistent result.

**Phantom read.** A executes a query with a **predicate**, B inserts or deletes a row satisfying that predicate and commits, and A executes the same query again, getting a **different set of rows**. The defect is that **which rows exist changed**, not that any row A already saw was modified.

| | What was read | What changed | What is needed to prevent it |
| --- | --- | --- | --- |
| **Dirty read** | uncommitted data | nothing, the data was never valid | do not expose uncommitted versions |
| **Non-repeatable read** | committed data | **one row's value** | hold the read row until commit |
| **Phantom read** | committed data | the set of matching rows | hold the **range**, not a row |

The two-way split to remember: dirty read is about **committed versus uncommitted**. The other two are both about committed data, separated by whether a **value** changed or the **population** changed.

#### Why row-level locks cannot prevent phantoms

A lock is a claim over **an identifiable object that exists**. That is the entire reason.

Preventing a non-repeatable read is straightforward: A takes a **shared lock** on the row it read and holds it to commit, so B cannot acquire the exclusive lock needed to update it. The row exists, so it can be named and held.

Preventing a phantom requires stopping B from **inserting a row that does not exist yet**. There is no object to lock. You cannot place a lock on a row that has never been written, and you cannot enumerate the rows that might be written, because that set is unbounded.

What is actually needed is a lock on the **predicate**: "no row satisfying `total > 100` may come into existence while I hold this". That is a **predicate lock**, and it is the theoretically correct answer. Evaluating an arbitrary predicate against every attempted insert is too expensive in general, so real engines **approximate** it:

**Gap locks and next-key locks**, in InnoDB. A **gap lock** locks the interval **between** two existing index keys, so no value can be inserted into it. A **next-key lock** is a record lock plus the gap before it. Locking the gaps that your scan passed through prevents any insert that would have appeared inside your range.

**Range locks**, in SQL Server at SERIALIZABLE, which are the same idea over a key range.

**Detection rather than prevention**, in PostgreSQL's SSI, which does not lock at all. It records which **ranges** each transaction read, notices afterwards that an insert created a conflict, and **aborts** one of the transactions.

Two consequences follow, and both are worth stating because they show practical experience.

**Gap locking needs an index on the predicate's column.** The gaps being locked are gaps in an **index**. If the query cannot use an index, InnoDB has nothing fine-grained to lock, so it locks every gap it scans, which for a table scan means **effectively the whole table**. A missing index therefore turns a precise lock into a table-wide one, which is a common cause of mysterious lock waits and deadlocks at REPEATABLE READ.

**Gap locks conflict with inserts that look harmless.** Two transactions each locking a gap and then inserting into the other's gap deadlock, even though they touch no common row. This is why InnoDB deadlock reports so often mention gap locks on inserts.

#### The lost update anomaly

**Lost update** occurs when two transactions **read the same row**, each computes a new value **from what it read**, and each **writes it back**. The second write overwrites the first, so the first update is **silently discarded**, with no error.

It is a **read-modify-write** hazard, and the pattern is unmistakable in code: a `SELECT`, a computation in the application, then an `UPDATE` setting an absolute value.

It is **not one of the three ANSI anomalies**, which is why it is easy to miss when reasoning from the standard's table alone. It belongs to the extended list.

How engines treat it:

**Lock-based REPEATABLE READ prevents it**, because the shared lock taken on the read is held to commit, so the second transaction blocks before it can write.

**Snapshot isolation detects it** with **first-committer-wins**, also called first-updater-wins: PostgreSQL's REPEATABLE READ aborts the second transaction with "could not serialize access due to concurrent update", which the application must retry.

**MySQL InnoDB at its default REPEATABLE READ does not prevent it** for a plain read followed by a write, because plain reads take no locks. You must opt in.

The three fixes, and the right one depends on contention:

**Make the update atomic.** `UPDATE accounts SET bal = bal + 500 WHERE id = 1` reads and writes in one statement under the row's lock, so there is no window. This is correct, fastest, and the right default whenever the new value is a function of the old one.

**Pessimistic locking.** `SELECT ... FOR UPDATE` takes the exclusive lock at read time, so the second transaction waits. Correct, and it serialises access, so it is appropriate when contention is genuinely high and the work between read and write is short.

**Optimistic concurrency control.** Carry a **version** column, and make the update conditional on the version you read: `UPDATE ... SET bal = ?, version = version + 1 WHERE id = ? AND version = ?`. If zero rows are affected, somebody else won and you retry. This takes no locks and is the standard approach for long user-facing edits, where holding a lock across a think time is unacceptable.

#### Lost update versus write skew

These are confused constantly and the distinction is one line:

**Lost update:** both transactions write **the same row**, so one overwrites the other.

**Write skew:** both transactions write **different rows**, so nothing collides, and the damage is to an invariant that spanned them.

That is also why lost update is detectable by any mechanism watching for write conflicts, and write skew is not.

---

### In code

```sql
-- DIRTY READ: the data was never committed
-- A                                      B
                                          BEGIN;
                                          UPDATE tills SET amt=9000 WHERE id=3;
BEGIN;
SELECT amt FROM tills WHERE id=3;  -- 9000, uncommitted
                                          ROLLBACK;
-- A holds a figure that never existed in any committed state.
-- Prevented at READ COMMITTED and above.
```

```sql
-- NON-REPEATABLE READ: one ROW's value changed
-- A                                      B
BEGIN;  -- READ COMMITTED
SELECT amt FROM tills WHERE id=3;  -- 4000
                                          UPDATE tills SET amt=2500 WHERE id=3;
                                          COMMIT;
SELECT amt FROM tills WHERE id=3;  -- 2500
-- both values were committed. A cannot produce a coherent report.
-- Prevented at REPEATABLE READ and above.
```

```sql
-- PHANTOM READ: WHICH ROWS EXIST changed
-- A                                      B
BEGIN;  -- REPEATABLE READ (per the standard)
SELECT COUNT(*) FROM tills WHERE amt > 1000;   -- 7
                                          INSERT INTO tills(amt) VALUES (5000);
                                          COMMIT;
SELECT COUNT(*) FROM tills WHERE amt > 1000;   -- 8
-- nothing A had already read was modified. A new row MATCHED.
-- Prevented only at SERIALIZABLE (or by InnoDB's gap locks).
```

```text
Why a row lock cannot stop a phantom:

  NON-REPEATABLE READ          A takes a shared lock on row id=3
                               B needs an exclusive lock to update it
                               -> B blocks. The row EXISTS, so it can
                                  be named and held.

  PHANTOM READ                 A wants to stop an INSERT of a row that
                               does not exist yet
                               -> which row do you lock?
                               -> the set of rows that MIGHT be inserted
                                  is unbounded, so it cannot be enumerated

  what is actually required is a PREDICATE LOCK:
      "no row with amt > 1000 may come into existence while I hold this"
  that is a claim over a DESCRIPTION, not over an object.

  Evaluating an arbitrary predicate against every insert is too
  expensive, so engines APPROXIMATE it:

    InnoDB       gap locks     lock the interval BETWEEN two index keys
                 next-key      a record lock + the gap before it
    SQL Server   range locks   the same idea over a key range
    Postgres     SSI           no locks: record which ranges each txn
                               read, detect the conflict afterwards,
                               and ABORT one transaction
```

```text
The practical consequence of gap locks being INDEX gaps:

  SELECT * FROM tills WHERE amt > 1000 FOR UPDATE;

  WITH an index on amt
      lock the gaps in that index covering (1000, +inf)
      -> precise: only inserts into that range are blocked

  WITHOUT an index on amt
      the engine must scan the table and has no fine-grained gaps
      -> it locks every gap it passes, which is EVERY gap
      -> effectively a table-wide lock

  So a missing index turns a precise range lock into a table lock.
  That is a common cause of mysterious lock waits and of deadlocks
  between two INSERTs that touch no common row, which is why InnoDB
  deadlock reports mention gap locks so often.
```

```sql
-- LOST UPDATE: both write the SAME row, and one write vanishes
-- A                                      B
BEGIN;                                    BEGIN;
SELECT amt FROM tills WHERE id=3;  -- 4000
                                          SELECT amt FROM tills WHERE id=3;
                                          -- also 4000
-- application computes 4000 + 500           application computes 4000 + 300
UPDATE tills SET amt=4500 WHERE id=3;
COMMIT;
                                          UPDATE tills SET amt=4300 WHERE id=3;
                                          COMMIT;
-- final value 4300. A's 500 is GONE, and nothing reported an error.
-- Not one of the three ANSI anomalies: it is in the extended list.
```

```sql
-- Three fixes for lost update, best first

-- 1. atomic update: read and write in one statement, under the row lock
UPDATE tills SET amt = amt + 500 WHERE id = 3;
--   no window at all. The right default when the new value is a
--   function of the old one.

-- 2. pessimistic: take the exclusive lock when you read
BEGIN;
  SELECT amt FROM tills WHERE id = 3 FOR UPDATE;   -- B now waits here
  UPDATE tills SET amt = 4500 WHERE id = 3;
COMMIT;
--   correct, and it serialises access. Good for short, hot work.

-- 3. optimistic: a version column, and a conditional write
SELECT amt, version FROM tills WHERE id = 3;        -- amt 4000, version 11
UPDATE tills SET amt = 4500, version = version + 1
WHERE  id = 3 AND version = 11;
--   0 rows affected => somebody else committed first => retry.
--   No locks held, so this is the right choice across a user's
--   think time, where holding a lock is unacceptable.
```

```text
Lost update vs write skew, which get confused constantly:

  LOST UPDATE    both transactions write THE SAME ROW
                 -> one overwrites the other
                 -> detectable by anything watching for write conflicts

  WRITE SKEW     both transactions write DIFFERENT ROWS
                 -> nothing collides, so nothing is detected
                 -> the damage is to an invariant that spanned the rows

  That difference is exactly why lost update is caught by
  first-updater-wins and write skew is not.
```

---

### What they ask next

**"Which anomaly is impossible in PostgreSQL at any level?"**
A dirty read. Its MVCC never exposes uncommitted row versions, so READ UNCOMMITTED is silently treated as READ COMMITTED. There is no setting that will give you a dirty read.

**"Why is REPEATABLE READ in InnoDB stronger than the standard requires?"**
Because its snapshot gives plain reads a consistent view for the whole transaction, which already excludes phantoms for those reads, and its locking reads add next-key locks that prevent inserts into scanned ranges. The standard permits phantoms at that level; InnoDB mostly does not.

**"Is a lost update a kind of non-repeatable read?"**
No. In a lost update the victim may never re-read the row, so nothing it read was observed to change. The harm is that **its write** was discarded. The anomaly is about writes, not reads, which is why it is not in the three-anomaly table.

**"When would you pick optimistic over pessimistic locking?"**
When the time between read and write is long or unbounded, such as a user editing a form, because holding a lock across a human's think time blocks everybody else. Optimistic control also scales better under low contention, since nothing blocks until a conflict actually happens.

**"Why do two INSERTs deadlock at REPEATABLE READ?"**
Because gap locks are involved. Each transaction holds a gap lock covering the range the other wants to insert into, so each waits for the other. Neither holds a lock on an existing row the other wants, which is why the deadlock looks inexplicable until you look at the gaps.

**"Does SERIALIZABLE prevent lost update?"**
Yes, by definition, since a lost update cannot occur in any serial order. In PostgreSQL it surfaces as a serialization failure to retry rather than as a block, so the application still has to handle it.

**The common wrong answer** is ordering the three anomalies as "mild, worse, worst". They are different **kinds** of event, not degrees. The question is really probing the mechanism: a value change can be stopped by holding an existing row, and a population change cannot, because the offending row does not exist yet.

---

### Say this in the interview

*"The clean way to separate them is to ask what was read and what changed. A dirty read is reading data another transaction has written and not committed, so the defect is the status of the data: it is provisional, and if the writer rolls back you have read a value that never existed in any committed state. A non-repeatable read is reading a row, having another transaction update and commit it, then reading the same row again and getting a different value, where both values were legitimately committed and the defect is that one row's value changed within your lifetime. A phantom read is running a query with a predicate, having another transaction insert or delete a row matching that predicate and commit, then running the same query and getting a different set of rows, so the defect is that which rows exist changed rather than any row you had already seen being modified. The two-way split is that dirty read is about committed versus uncommitted, and the other two are both about committed data, separated by whether a value changed or the population changed.*

*Row-level locks cannot prevent phantoms because a lock is a claim over an identifiable object that exists. Preventing a non-repeatable read is easy: take a shared lock on the row you read and hold it to commit, so nobody can get the exclusive lock to update it, and that works because the row exists and can be named. Preventing a phantom means stopping an insert of a row that does not exist yet, so there is no object to lock, and the set of rows that might be inserted is unbounded so it cannot be enumerated. What is actually needed is a predicate lock, a claim over a description rather than an object, and evaluating an arbitrary predicate against every insert is too expensive, so engines approximate it. InnoDB uses gap locks, which lock the interval between two existing index keys, and next-key locks, which are a record lock plus the gap before it. SQL Server uses range locks at serializable. PostgreSQL's SSI does not lock at all: it records which ranges each transaction read, detects the conflict afterwards and aborts one transaction.*

*Two practical consequences. Gap locks are gaps in an index, so phantom prevention needs an index on the predicate's column; without one InnoDB locks every gap it scans, which for a table scan is effectively the whole table, and that is a common cause of mysterious lock waits. And gap locks make two inserts deadlock even when they touch no common row, which is why InnoDB deadlock reports mention them so often.*

*Lost update is when two transactions read the same row, each computes a new value from what it read, and each writes it back, so the second overwrites the first and the first update is silently discarded with no error. It is a read-modify-write hazard and it is not one of the three ANSI anomalies, which is why reasoning from that table alone misses it. Lock-based REPEATABLE READ prevents it because the read's shared lock is held to commit. Snapshot isolation detects it with first-committer-wins, or first-updater-wins, so PostgreSQL's REPEATABLE READ aborts the second transaction with a serialization error to retry. MySQL InnoDB at its default REPEATABLE READ does not prevent it for a plain read followed by a write, because plain reads take no locks.*

*The fixes are: make the update atomic, SET amt = amt + 500, so read and write happen in one statement under the row lock with no window, which is the right default when the new value is a function of the old one; pessimistic locking with SELECT FOR UPDATE, which takes the exclusive lock at read time and serialises access, good for short hot work; or optimistic concurrency with a version column and a conditional update, where zero rows affected means somebody else won and you retry, which is right across a user's think time because it holds no locks.*

*And the distinction people confuse: in a lost update both transactions write the same row, so one overwrites the other and any write-conflict detection catches it. In write skew they write different rows, so nothing collides and nothing is detected, and the damage is to an invariant that spanned them."*
