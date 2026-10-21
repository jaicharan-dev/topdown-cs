---
id: 3-acid-properties
title: "ACID Properties in Databases"
description: "Atomicity, Consistency, Isolation, and Durability explained in plain English, plus how the storage engine actually enforces each one."
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the ACID properties in a database? How does the storage engine guarantee each property under the hood, what is Group Commit, and how does the 'C' in ACID differ from the 'C' in the CAP theorem?"

ACID is just four promises a database makes about any transaction you run. Think of mailing a package: either the whole thing ships and arrives, or it never leaves the warehouse — there's no "half-shipped" package sitting in limbo. That's roughly what each letter guarantees, just for a different kind of failure.

<Diagram>
<Row>
<Box label="Atomicity" sub="all or nothing" />
<Box label="Consistency" sub="rules hold" />
<Box label="Isolation" sub="no interference" />
<Box label="Durability" sub="stays saved" />
</Row>
</Diagram>

### Atomicity — all or nothing

If a transaction has five statements and the third one fails, the first two get undone too. There's no partial state. Under the hood, before the engine changes a page of data, it first writes down the "before" version in an **undo log**. If something goes wrong, it just walks that log backward and restores the old values.

### Consistency — never breaks the rules

A transaction can only move the database from one valid state to another valid state. It can't leave a foreign key dangling, violate a `CHECK` constraint, or insert a `NULL` into a `NOT NULL` column. The engine checks every constraint before it lets a commit go through.

### Isolation — transactions don't see each other's mess

While a transaction is running, nobody else should see its unfinished, in-progress writes. In theory this means every transaction behaves as if it ran completely alone (this level is called **serializable**). In practice, almost nobody runs at that strictest level — PostgreSQL defaults to *Read Committed* and MySQL's InnoDB defaults to *Repeatable Read*, because full serializability is too slow for most workloads. The engine pulls this off mainly with **MVCC** (keeping multiple versions of a row around so readers never have to wait on writers) and locking.

### Durability — once it says "committed," it's permanent

Once the database tells your app the commit succeeded, that data has to survive even if the power goes out one second later. This is guaranteed by the **redo log**, part of the write-ahead log described below.

---

### How durability actually survives a power cut: `fsync` and Group Commit

Writing to a file normally only writes to the operating system's memory cache — if the power dies right after, that write disappears with it. To make a write actually durable, the database has to call `fsync()`, which forces the storage hardware to physically flush it to disk.

The catch: calling `fsync()` on every single transaction is slow — you're now limited by how many individual flushes the disk can do per second. The fix is **Group Commit**: if several transactions try to commit around the same time, the engine batches all their log entries into one `fsync()` call instead of one per transaction. Same durability guarantee, far fewer expensive disk flushes.

---

### Why the engine doesn't just save the data immediately

Writing a full 16KB data page straight to its final spot on disk every time something changes would be slow — it's a random, scattered write. So instead, the database:
1. Writes a small, sequential entry to the **write-ahead log (WAL)** — fast, because it's just appending.
2. Updates the actual data page in memory (the **buffer pool**), marking it "dirty."
3. Every so often, a background **checkpoint** flushes a batch of dirty pages to disk at once.

If the server crashes between checkpoints, recovery just replays the WAL to redo whatever was missed.

---

### Two different "C"s: ACID vs. CAP

People mix these up constantly:
- **Consistency in ACID** means your schema rules and constraints are never violated.
- **Consistency in CAP theorem** (distributed systems) means every read sees the latest write, across every replica — this is really **linearizability**.

Same word, two unrelated ideas. Don't conflate them in an interview.

---

### Say this in the interview

*"ACID means a transaction is all-or-nothing (Atomicity), never leaves the database in an invalid state (Consistency), doesn't interfere with other transactions (Isolation), and survives a crash once committed (Durability) — enforced under the hood with undo logs, constraint checks, MVCC, and the write-ahead log."*
