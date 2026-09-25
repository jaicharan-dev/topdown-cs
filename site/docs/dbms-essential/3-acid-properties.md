---
id: 3-acid-properties
title: "ACID Properties in Databases"
description: "A comprehensive deep dive into Atomicity, Consistency, Isolation, and Durability, covering WAL, fsync, Group Commit, and Buffer Pool checkpoints."
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the ACID properties in a database? How does the storage engine guarantee each property under the hood, what is Group Commit, and how does the 'C' in ACID differ from the 'C' in the CAP theorem?"

### The Quick Answer

"**ACID** represents the four fundamental guarantees of relational database transactions:
* **Atomicity:** All-or-nothing execution, enforced by Undo Logs and WAL.
* **Consistency:** The database transitions exclusively between valid states, preserving all constraints and business invariants.
* **Isolation:** Concurrent transactions execute without mutual interference, governed by MVCC and locking protocols.
* **Durability:** Committed transactions permanently survive crashes and power outages via Write-Ahead Logs (WAL) and synchronous disk flushes (`fsync`)."

---

### The Four Pillars & Their Internal Engine Mechanics

#### 1. Atomicity (All-or-Nothing)
* **What It Means:** A transaction is indivisible. If an error occurs halfway through a multi-statement sequence, all tentative writes are reversed.
* **Internal Mechanism:** Implemented using the **Undo Log** and **Write-Ahead Log (WAL)**. Before dirty data pages in the Buffer Pool are altered, the engine writes the original "before-image" to the undo log. If an abort or crash occurs, the engine traverses the undo log backwards to restore original values.

#### 2. Consistency (State Invariants)
* **What It Means:** A transaction can only transition the database from one valid state to another, strictly upholding explicit schema constraints (`FOREIGN KEY`, `CHECK`, `NOT NULL`, `UNIQUE`) and application invariants.
* **Internal Mechanism:** Enforced by constraint validation engines and schema metadata before committing a transaction.

#### 3. Isolation (Concurrency Control)
* **What It Means:** The intermediate, uncommitted writes of one transaction remain invisible to concurrent transactions.
* **The Reality Check:** While the theoretical definition of Isolation implies strict **Serializability** (concurrent transactions yield the exact same result as sequential execution), virtually all production engines default to weaker levels (e.g., PostgreSQL defaults to *Read Committed*, MySQL InnoDB defaults to *Repeatable Read*) to maintain high concurrent throughput.
* **Internal Mechanism:** Implemented via **Multi-Version Concurrency Control (MVCC)** (maintaining row versions so readers never block writers) and **Two-Phase Locking (2PL)**.

#### 4. Durability (Survivability)
* **What It Means:** Once a client receives a `COMMIT SUCCESS` acknowledgment, the data will survive even if power is abruptly cut to the data center one millisecond later.
* **Internal Mechanism:** Guaranteed via **Redo Logs** in the Write-Ahead Log (WAL).

---

### Durability Under the Hood: `fsync()` and Group Commit

Writing to a file in an operating system only writes data to the OS Page Cache in RAM. If power fails, the OS page cache is lost.

1. **The `fsync()` System Call:**
   To guarantee durability, the database must issue a blocking `fsync()` system call, which instructs the storage controller to flush its internal volatile caches and write bits to persistent non-volatile media.
2. **The IOPS Bottleneck:**
   Calling `fsync()` on every single transaction limits transaction throughput to the disk's maximum IOPS.
3. **Group Commit (The Optimization):**
   Modern database engines (InnoDB, PostgreSQL) use **Group Commit**. If multiple transactions attempt to commit concurrently, the engine queues their commit requests and flushes all their WAL records to disk in a **single batched `fsync()` call**, multiplying throughput by orders of magnitude.

---

### Why the Engine Doesn't Flush Data Pages: The Buffer Pool & Checkpoints

Writing full 16KB data pages to random disk locations on every commit would destroy write performance. 

Instead, the database:
1. Writes small, sequential append-only records to the **WAL** (fast sequential I/O).
2. Modifies the data pages in RAM within the **Buffer Pool** (marking them "dirty").
3. Periodically, a background thread executes a **Checkpoint**, flushing batches of dirty buffer pool pages to disk. If the server crashes between checkpoints, the recovery engine simply reads the WAL to replay committed changes.

---

### Crucial Nuance: The "C" in ACID vs. The "C" in CAP Theorem

Software engineers frequently conflate the two:
* **Consistency in ACID:** Refers to **Application and Schema Validity**. It means no schema rules, triggers, or foreign key invariants are violated during state changes.
* **Consistency in CAP Theorem:** Refers to **Linearizability (Single-Copy Consistency)** in distributed systems. It guarantees that every read operation returns the most recent write across all distributed replicas.

They represent two entirely different concepts in computer science!
