---
id: 3-acid-properties
title: "ACID Properties in Databases"
description: "Four guarantees, four separate mechanisms underneath, and two letters C that have nothing to do with each other"

sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the ACID properties in a database? How does the storage engine guarantee each property under the hood, what is Group Commit, and how does the 'C' in ACID differ from the 'C' in the CAP theorem?"

---

### Picture it

Four promises a careful clerk makes about the ledger, and each one needs a different trick to keep.

**"No half-done entries."** If I am recording a transfer and I am interrupted, you will never find the money taken from one account and not added to the other. To manage this the clerk writes the **old value in the margin** before changing anything, so an interruption can always be rewound.

**"No entry that breaks the rules."** Account numbers must exist, balances must not go below zero, no two accounts may share a number. Before accepting any entry the clerk **checks it against the rulebook**. Note whose rules those are: the clerk did not invent them, the bank did. The clerk only enforces what has been written down.

**"You will not see me mid-page."** If two clerks are working at once, each sees a coherent ledger, not a half-updated one. This needs either **taking the page off the desk while writing** or **giving each reader a photograph of the page as it was when they started**. Two very different strategies for the same promise.

**"Once I say it is recorded, it is recorded."** Even if the building loses power a second later. The clerk achieves this by **pushing the notebook into the safe and hearing the lock click** before saying the word "done". That click is slow, so if six clerks all want to record something, they wait a moment and put all six notebooks in together on one click.

And then the trap in the question. The word **consistency** means something completely different one floor up, in the department that keeps copies of the ledger in other cities. There, "consistent" means **every city shows the same balance right now**. Downstairs it means **the entry obeys the rulebook**. Same word, unrelated promises, and the interviewer is checking whether you know that.

---

### The proper terms

#### Atomicity

**Atomicity** means a transaction is **indivisible**: all of its operations take effect, or none do. There is no partial state visible to anyone, and no partial state survives a crash.

**How the engine guarantees it: the undo log.** Before modifying a row, the engine records the **previous version** of it. A `ROLLBACK`, or a crash followed by recovery, walks those records backwards and reverses the changes.

In **InnoDB** these live in **undo tablespaces** and form a chain of old row versions. In **PostgreSQL** the old row version stays **in the table itself**, marked with the transaction that created and deleted it, and is cleaned up later by **VACUUM**. Same guarantee, different storage strategy.

#### Consistency

**Consistency** means a transaction moves the database from one **valid state** to another, where valid means every declared rule still holds.

**How the engine guarantees it: constraint enforcement.** **NOT NULL**, **UNIQUE**, **PRIMARY KEY**, **FOREIGN KEY** and **CHECK** constraints, plus **triggers**, are evaluated as statements run, and a violation aborts the transaction. Some constraints can be declared **DEFERRABLE**, so they are checked at commit instead, which allows temporarily inconsistent intermediate states inside a transaction.

The honest framing matters here, because this is the property candidates describe most vaguely. The database does not know what your business considers correct. It enforces **the rules you declared**. Anything you did not declare, it will cheerfully violate. So consistency is a **contract between your schema and the engine**, not a general promise of correctness.

#### Isolation

**Isolation** means concurrent transactions do not interfere, and the outcome is as if they ran in some sequence. The strongest form is **serializability**.

**How the engine guarantees it: locking, multi-version concurrency control, or both.**

**Locking**, classically **two-phase locking**, acquires shared and exclusive locks and holds them until commit. Readers can block writers and writers block readers.

**MVCC**, multi-version concurrency control, keeps multiple versions of each row and gives each transaction a **snapshot** defining which versions it may see. Its great advantage is that **readers never block writers and writers never block readers**, because a reader simply looks at an older version.

Most real engines combine them: PostgreSQL and InnoDB both use MVCC for reads and locks for writes, with InnoDB adding **next-key** and **gap locks** to stop **phantom reads** at the serializable level.

#### Durability

**Durability** means that once a commit is acknowledged, the change survives a crash, a power loss or a process kill.

**How the engine guarantees it: the write-ahead log plus fsync.** Before the commit returns, the transaction's log records are written and flushed to durable storage with **fsync**, so the operating system's page cache cannot lose them. The data pages themselves are written later by a **checkpoint**, and recovery **redoes** anything logged but not yet in the pages.

The `fsync` is the expensive part, and it is the cost of the promise. Note that **replication is not durability**: acknowledging a commit when a replica has it in memory is a different, weaker guarantee, which is why synchronous replication settings matter.

#### Group commit

**Group commit** addresses the fact that **fsync is the bottleneck** in a write-heavy system. A disk flush costs on the order of a millisecond regardless of how much is being flushed, so doing one per transaction caps throughput at a few hundred commits per second however fast the rest of the engine is.

The idea: when a transaction commits, wait very briefly for other transactions to reach commit, then flush **all their log records in a single fsync** and acknowledge all of them together.

Because the log is a single sequential stream, one flush covers every record in it, so the cost is shared. Throughput rises by an order of magnitude or more while each transaction pays a tiny extra latency.

It appears as `commit_delay` and `commit_siblings` in PostgreSQL, and is built into InnoDB's log flushing, where `innodb_flush_log_at_trx_commit` controls how strict the durability promise is: **1** flushes on every commit for full durability, while **0** and **2** trade durability for speed and can lose recent commits.

#### The two Cs

This is the real question, and they are **unrelated concepts that share a letter**.

**The C in ACID is about integrity constraints.** It is a property of a **single database state**: do the declared rules hold? It is local, it concerns the data's internal validity, and it says nothing about replicas or time.

**The C in CAP is linearizability**, also called atomic consistency. It is a property of a **distributed system's behaviour over time**: does every read see the most recent completed write, so that the system behaves as if there were one copy of the data? It concerns agreement between replicas and **real-time ordering**, and says nothing about constraints.

They are independent, which is best shown by the cases where you have one without the other.

**ACID consistency without CAP consistency.** A read replica serving data five seconds old. Every constraint holds, so it is ACID-consistent, but a read may miss a completed write, so it is not linearizable.

**CAP consistency without ACID consistency.** A linearizable key-value store where every read sees the latest write, but which has no notion of foreign keys or check constraints, so nothing stops you storing an order referencing a customer that does not exist.

The sharpest way to say it: **ACID's C asks "is this state legal?", CAP's C asks "is everyone looking at the same state?"** Many people consider CAP's choice of letter a historical mistake, and it is worth saying so, because the question is really testing whether you reason about the ideas or recite the acronyms.

---

### In code

```text
The four properties and the mechanism behind each:

  ATOMICITY    all or nothing          <- UNDO log / old row versions
                                          InnoDB: undo tablespaces
                                          Postgres: old tuples + VACUUM

  CONSISTENCY  declared rules hold     <- constraint checking
                                          NOT NULL, UNIQUE, PK, FK, CHECK,
                                          triggers, DEFERRABLE at commit

  ISOLATION    no interference         <- locking (2PL) and/or MVCC
                                          MVCC: snapshots + row versions
                                          InnoDB: + next-key / gap locks

  DURABILITY   survives a crash        <- write-ahead log + fsync
                                          then checkpoints, then redo

  Four promises, four different mechanisms. Answering "the database
  handles it" for all four is what the question is designed to catch.
```

```sql
-- Consistency is only as good as what you declared
CREATE TABLE accounts (
    id      BIGINT PRIMARY KEY,
    balance NUMERIC NOT NULL CHECK (balance >= 0)   -- declared, so enforced
);

BEGIN;
  UPDATE accounts SET balance = balance - 1000 WHERE id = 1;  -- had 500
-- ERROR: check constraint "accounts_balance_check" violated
ROLLBACK;

-- But this rule was never declared, so nothing stops it:
--   "the sum of all balances must equal the bank's total holdings"
-- The engine enforces YOUR rulebook, not correctness in general.
```

```text
Group commit: why fsync is the thing being optimised

  WITHOUT group commit
    txn A: ... commit -> fsync (1 ms) -> ack
    txn B: ... commit -> fsync (1 ms) -> ack
    txn C: ... commit -> fsync (1 ms) -> ack
    -> 3 flushes, ~3 ms, throughput capped by the disk

  WITH group commit
    txn A: commit ---+
    txn B: commit ---+--> ONE fsync (1 ms) --> ack A, B, C
    txn C: commit ---+
    -> 1 flush for all three, because the log is ONE sequential
       stream and a single flush covers every record in it

  Each transaction pays a tiny wait; throughput rises by an order
  of magnitude. Postgres: commit_delay, commit_siblings.
  InnoDB: innodb_flush_log_at_trx_commit = 1 is full durability,
  0 and 2 are faster and can lose recent commits.
```

```text
The two Cs, which share nothing but a letter:

  ACID's C                          CAP's C (linearizability)
  --------                          -------------------------
  about ONE state                   about BEHAVIOUR OVER TIME
  "do the declared rules hold?"     "does every read see the latest
                                     completed write?"
  local to a database               about agreement between replicas
  constraints, triggers             real-time ordering, one logical copy

  ACID-consistent but NOT linearizable:
      a read replica 5 seconds behind. Every constraint holds.
      A read can miss a completed write.

  Linearizable but NOT ACID-consistent:
      a key-value store where every read sees the latest write,
      but nothing prevents an order referencing a missing customer.

  Short version: ACID asks "is this state legal?",
                 CAP asks  "is everyone looking at the same state?"
```

---

### What they ask next

**"Which property is the hardest to provide?"**
Isolation, and it is the only one that is routinely **weakened on purpose**. Nobody ships with atomicity half-off, but almost every production system runs below serializable, at read committed or snapshot isolation, because full serializability costs too much concurrency.

**"Does ACID require serializability?"**
No. ACID says transactions are isolated, and the SQL standard then defines levels of isolation to choose from. Most databases default to **read committed**, which permits several anomalies, so "ACID-compliant" tells you much less than people assume.

**"How does MVCC avoid read locks?"**
By keeping old row versions. A reader is given a snapshot identifying which versions are visible to it, so it reads a consistent older version instead of waiting for the writer. The cost is storing versions and cleaning them up later, which is what VACUUM does in PostgreSQL and the purge thread does in InnoDB.

**"If I turn off fsync, which property do I lose?"**
Durability, and only durability. Atomicity, consistency and isolation still hold while the system runs, but an acknowledged commit can vanish in a crash. This is exactly what the faster `innodb_flush_log_at_trx_commit` settings trade away.

**"Is a replica acknowledging a write the same as durability?"**
Not unless it has flushed to disk. Semi-synchronous replication that waits only for the replica's memory survives one machine failing but not a correlated power loss, which is a weaker promise and should be described as such.

**"Why does group commit not hurt latency much?"**
Because the wait is bounded and very short, and the flush it joins would have cost the same millisecond anyway. Under load the group forms immediately, so the extra wait approaches zero exactly when throughput matters most.

**The common wrong answer** is describing consistency as "the data is always correct". The engine has no idea what correct means for your domain. It enforces the constraints you declared, and the interesting half of the question is the **four different mechanisms** behind the four letters.

---

### Say this in the interview

*"Atomicity means the transaction is indivisible: all of it takes effect or none of it, with no partial state visible or surviving a crash. The engine provides it with an undo log, recording the previous version of each row before modifying it, so a rollback or recovery walks those records backwards. InnoDB keeps them in undo tablespaces; PostgreSQL keeps old row versions in the table itself and cleans them up with VACUUM.*

*Consistency means a transaction moves the database from one valid state to another, where valid means every declared rule holds. The engine provides it by enforcing NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY and CHECK constraints and triggers as statements run, with DEFERRABLE constraints checked at commit instead so intermediate states can be temporarily invalid. The honest framing is that the database does not know what your business considers correct: it enforces the rules you declared and will cheerfully violate anything you did not, so it is a contract between the schema and the engine.*

*Isolation means concurrent transactions do not interfere and the result is as if they ran in some order, the strongest form being serializability. The engine provides it with locking, classically two-phase locking holding shared and exclusive locks until commit, or with MVCC, which keeps multiple row versions and gives each transaction a snapshot, so readers never block writers and writers never block readers. Most engines combine both: PostgreSQL and InnoDB use MVCC for reads and locks for writes, and InnoDB adds next-key and gap locks to prevent phantom reads at serializable.*

*Durability means an acknowledged commit survives a crash. The engine provides it with the write-ahead log plus fsync: the log records are flushed to durable storage before the commit returns, data pages are written later by a checkpoint, and recovery redoes anything logged but not yet in the pages. The fsync is the cost of the promise, and replication is not durability unless the replica has also flushed.*

*Group commit exists because fsync is the bottleneck: a flush costs about a millisecond regardless of size, so one per transaction caps throughput at a few hundred commits a second. So on commit the engine waits very briefly for other transactions to arrive, then flushes all their log records in a single fsync and acknowledges them together. Because the log is one sequential stream, a single flush covers every record in it, so throughput rises by an order of magnitude for a tiny added latency. PostgreSQL exposes commit_delay and commit_siblings, and InnoDB's innodb_flush_log_at_trx_commit controls strictness, where 1 is full durability and 0 or 2 trade it for speed.*

*The two Cs are unrelated concepts that share a letter. ACID's C is about integrity constraints: a property of a single database state, asking whether the declared rules hold, local and saying nothing about replicas or time. CAP's C is linearizability, or atomic consistency: a property of a distributed system's behaviour over time, asking whether every read sees the most recent completed write so the system behaves as if there were one copy, which is about agreement between replicas and real-time ordering and says nothing about constraints. You can have one without the other: a read replica five seconds behind is ACID-consistent but not linearizable, and a linearizable key-value store with no foreign keys is linearizable but will happily store an order referencing a missing customer. ACID's C asks whether this state is legal; CAP's C asks whether everyone is looking at the same state."*
