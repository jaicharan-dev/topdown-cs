---
id: 1-what-is-a-transaction
title: "What is a Database Transaction?"
description: "A unit of work with no half-finished state, and the log entry that has to be written before the change it describes"

sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a transaction, and why do we need it? What happens if an operation fails halfway through without one, how do Savepoints enable partial rollbacks, and what is the WAL Log-Ahead Rule?"

---

### Picture it

You are moving 500 rupees from your savings account to your current account. On the bank's side that is two separate acts: take 500 out of one, put 500 into the other.

Now suppose the machine dies between them.

The money is **gone**. Not delayed, not queued: it has left one account and arrived nowhere. There is no record that anything is wrong, because each individual act succeeded exactly as instructed. The database is in a state that **should not be possible**, and nothing in it knows that.

A transaction is the instruction "treat these two acts as one". Either both happened or neither did, and there is no instant at which an observer can see one without the other.

**Two refinements follow naturally.**

Suppose you are doing a hundred of these transfers as one piece of work, and transfer 61 fails because an account was closed. Abandoning all hundred is wasteful. So you leave a **bookmark** before each one and, on failure, rewind only to the last bookmark, fix or skip that transfer, and carry on. The overall job is still a single unit; you have just given yourself places to rewind to.

And the mechanism underneath. How does the bank undo something after a power cut, when it cannot know how far it had got? It writes its **intentions down first**. Before changing any account, it writes a note saying "about to move 500 from A to B, here is the old value". The note goes to durable storage **before** the change does. After a crash, the notes are read back, finished work is reapplied, unfinished work is rolled back. The notebook, not the accounts, is the source of truth about what was happening.

---

### The proper terms

#### What a transaction is

A **transaction** is a sequence of operations treated as a **single logical unit of work**. It either completes entirely, with **COMMIT**, or has no effect at all, with **ROLLBACK**.

It is delimited by **BEGIN** or **START TRANSACTION**, and ends with COMMIT or ROLLBACK. Outside an explicit transaction, most engines run in **autocommit**, where each statement is its own transaction.

The transaction is the unit the **ACID** properties are defined over, and the one that matters here is **atomicity**: indivisibility, meaning no observer and no crash can leave half of it applied.

#### What happens without one

The failure is **partial application**, which leaves data in a state the schema permits but the business does not.

**Money disappears or is duplicated.** The transfer debits one account and the credit never runs. Both rows are individually valid; the **invariant** across them is broken.

**Orphaned and inconsistent rows appear.** An order is inserted and its line items are not, so the order total matches nothing.

**Nothing reports an error.** This is the worst part. Each statement that ran, succeeded. There is no exception to catch after the fact and no flag marking the row as suspect, so the corruption is discovered later by reconciliation, if at all.

**It cannot be fixed by careful code.** You cannot order the statements to make this safe, because the process can die between any two of them. The guarantee has to come from below, which is why it is the database's job.

#### Savepoints and partial rollback

A **savepoint** is a named marker within an open transaction.

`SAVEPOINT name` establishes it, `ROLLBACK TO SAVEPOINT name` undoes everything done **after** it, and `RELEASE SAVEPOINT name` discards the marker.

The critical property is that `ROLLBACK TO SAVEPOINT` **does not end the transaction**. The transaction remains open and can continue and still commit, and **locks acquired before the savepoint are retained**, so no other transaction can slip in during the rewind.

So savepoints give **nested granularity** inside an atomic unit, which is what makes them useful for a batch loop where one bad row should not discard the whole batch, and for a procedure that wants to attempt something and recover if it fails.

Two cautions. A savepoint is **not** a commit: nothing is durable until the outer transaction commits, so a crash still loses all of it. And locks are held for the full duration, so long savepointed transactions hurt concurrency.

#### The WAL log-ahead rule

**WAL**, the **write-ahead log**, is how a database achieves atomicity and durability without writing data pages synchronously on every change. It is an **append-only sequential log** of every modification, each with a **log sequence number**, or **LSN**.

The **log-ahead rule** is the discipline that makes it work, and it has two halves which are worth stating separately because they serve different properties.

**The write-ahead rule, for atomicity.** A log record describing a change must reach **durable storage before the modified data page** does. Otherwise a crash could leave a dirty page on disk belonging to an uncommitted transaction with no record of its old value, making it impossible to undo.

**The commit rule, for durability.** All of a transaction's log records must be on durable storage **before the commit is acknowledged** to the client. Otherwise the client is told the data is safe when it is not.

Together: **log first, data later, and never acknowledge a commit before its log is flushed.**

The reason this is a performance win rather than a cost is the access pattern. The log is one **sequential append**; the data pages it describes are scattered **random writes**. So the engine makes the cheap write synchronous and lets the expensive ones be batched and written lazily by a **checkpoint**, which records how far recovery must go back.

Recovery then runs in three phases, the **ARIES** scheme: **analysis** to find which transactions were in flight, **redo** to reapply everything logged since the checkpoint, and **undo** to roll back transactions that never committed.

**Group commit** is the natural optimisation: rather than one disk flush per commit, the engine batches the log flushes of several concurrent transactions into one, trading a little latency for a large gain in throughput.

---

### In code

```sql
-- Without a transaction: the crash point is a real possibility
UPDATE accounts SET balance = balance - 500 WHERE id = 1;   -- succeeds
--  <<< process dies here >>>
UPDATE accounts SET balance = balance + 500 WHERE id = 2;   -- never runs
-- 500 has left the system. Both statements were individually valid.
-- Nothing raised an error, so nothing knows anything is wrong.
```

```sql
-- With a transaction: all or nothing
BEGIN;
  UPDATE accounts SET balance = balance - 500 WHERE id = 1;
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;        -- both effects become visible at the same instant
-- a crash before COMMIT leaves neither effect
```

```sql
-- Savepoints: rewind part of the work without abandoning all of it
BEGIN;
  INSERT INTO orders (id, customer) VALUES (101, 'arun');

  SAVEPOINT before_items;
  INSERT INTO items (order_id, sku, qty) VALUES (101, 'A12', 2);
  INSERT INTO items (order_id, sku, qty) VALUES (101, 'BAD', 1);  -- fails

  ROLLBACK TO SAVEPOINT before_items;   -- undoes BOTH item inserts
                                        -- the order row survives
                                        -- the transaction is STILL OPEN
                                        -- locks taken earlier are STILL HELD

  INSERT INTO items (order_id, sku, qty) VALUES (101, 'A12', 2);
COMMIT;        -- only now is any of it durable
```

```text
The log-ahead rule, and the two failures it prevents:

  in memory:   [ page 7: balance = 4500 ]   modified, not yet on disk
  log buffer:  [ LSN 881: page 7, old 5000, new 4500, txn 42 ]

  RULE 1, write-ahead (atomicity)
     flush LSN 881  ------> disk     BEFORE
     flush page 7   ------> disk
     why: a crash with the page written but not the log leaves an
          uncommitted change on disk with no record of the old value,
          so it can never be undone.

  RULE 2, commit (durability)
     flush ALL of txn 42's log records   BEFORE  acknowledging COMMIT
     why: otherwise the client is told the data is safe when it is not.

  The win is the access pattern:
     log   = one sequential append   -> cheap, so make it synchronous
     pages = scattered random writes -> expensive, so batch them lazily
             at a checkpoint

  Group commit: batch the log flushes of several concurrent commits
  into one disk flush. Slightly more latency, far more throughput.
```

```text
Crash recovery, the ARIES three phases:

  1. ANALYSIS   scan forward from the last checkpoint
                -> which transactions were in flight, which pages dirty

  2. REDO       reapply every logged change since the checkpoint,
                committed or not, to rebuild the exact pre-crash state

  3. UNDO       roll back every transaction that had not committed,
                using the old values in the log

  Redo first, then undo: the log is replayed to get back to where the
  crash happened, and only then is the unfinished work removed.
```

---

### What they ask next

**"Is a single UPDATE statement a transaction?"**
Yes. In autocommit mode every statement is its own transaction, which is why an `UPDATE` matching a million rows either updates all of them or none. Atomicity is not only about multi-statement work.

**"Does ROLLBACK TO SAVEPOINT release locks?"**
No, and this is the usual trap. Locks taken before the savepoint are retained, which is deliberate: releasing them would let another transaction observe or modify the rows mid-rewind and break isolation.

**"Why is a sequential log faster than just writing the data pages?"**
Because the log is one append at the end of a file while the pages are scattered across the disk. Even on SSDs, one sequential flush beats many random writes, and the log lets several transactions' commits be batched into a single flush.

**"What is a checkpoint for?"**
It bounds recovery time. Without one, recovery would replay the log from the beginning of time. A checkpoint flushes dirty pages and records the LSN from which redo must start.

**"Can you commit part of a transaction?"**
No. A savepoint is not a commit; it only gives you a point to rewind to. Nothing is durable or visible to others until the outer transaction commits, so splitting the work genuinely means using separate transactions, and then you lose atomicity across them.

**"What is the difference between redo and undo?"**
Redo reapplies changes to recover work that was logged but perhaps not yet written to the data pages. Undo reverses changes belonging to transactions that never committed. Durability needs redo; atomicity needs undo.

**The common wrong answer** is "a transaction is a group of SQL statements". A group of statements is just a group. What makes it a transaction is the **guarantee** that no observer and no crash can see it half-applied, and the write-ahead log is how that guarantee is actually delivered.

---

### Say this in the interview

*"A transaction is a sequence of operations treated as a single logical unit of work: it either completes entirely with COMMIT or has no effect at all with ROLLBACK. It is delimited by BEGIN or START TRANSACTION, and outside one most engines run in autocommit, where each statement is its own transaction. It is the unit the ACID properties are defined over, and the relevant one here is atomicity, meaning indivisibility.*

*Without a transaction the failure mode is partial application. A transfer debits one account and the credit never runs, so money has left the system and both rows are individually valid while the invariant across them is broken. Or an order is inserted without its line items. The dangerous part is that nothing reports an error, because every statement that ran succeeded, so there is no exception to catch and the corruption is found later by reconciliation if at all. You cannot fix it with careful ordering either, because the process can die between any two statements, so the guarantee has to come from the database.*

*A savepoint is a named marker inside an open transaction. SAVEPOINT establishes it, ROLLBACK TO SAVEPOINT undoes everything after it, and RELEASE SAVEPOINT discards it. The key property is that rolling back to a savepoint does not end the transaction, which stays open and can still commit, and locks acquired before the savepoint are retained so nobody can slip in during the rewind. That gives nested granularity inside an atomic unit, which is what you want for a batch loop where one bad row should not discard the batch. Two cautions: a savepoint is not a commit, so a crash still loses everything, and the locks are held for the whole transaction.*

*The write-ahead log is an append-only sequential log of every modification, each with a log sequence number, an LSN. The log-ahead rule has two halves. The write-ahead rule, for atomicity: a log record must reach durable storage before the modified data page does, because otherwise a crash could leave a dirty uncommitted page on disk with no record of its old value, making undo impossible. The commit rule, for durability: all of a transaction's log records must be durable before the commit is acknowledged, because otherwise the client is told the data is safe when it is not. So: log first, data later, never acknowledge a commit before its log is flushed.*

*It is a performance win rather than a cost because of the access pattern. The log is one sequential append and the pages it describes are scattered random writes, so the engine makes the cheap write synchronous and lets checkpoints flush the expensive ones lazily. Group commit batches several transactions' log flushes into one. Recovery then follows ARIES: analysis to find in-flight transactions, redo to reapply everything logged since the checkpoint, and undo to roll back whatever never committed."*
