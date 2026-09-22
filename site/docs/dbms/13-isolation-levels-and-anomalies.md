---
id: 13-isolation-levels-and-anomalies
title: "Transaction Isolation Levels and Anomalies"
description: "Understand the ANSI SQL transaction isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) and the concurrency anomalies they prevent."
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are the four ANSI SQL transaction isolation levels? What concurrency anomalies does each level prevent or permit, and what is the trade-off with system throughput?"

The **Isolation** property of ACID dictates how concurrent database transactions observe each other's tentative changes. The SQL-92 standard defines four formal **Isolation Levels**, each making a deliberate trade-off between **data consistency** and **concurrency throughput**.

---

### The ANSI SQL Isolation Matrix

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Concurrency / Performance |
| :--- | :---: | :---: | :---: | :---: |
| **Read Uncommitted** | Permitted | Permitted | Permitted | Highest (Zero lock overhead) |
| **Read Committed** | **Prevented** | Permitted | Permitted | High (Default in Postgres, Oracle, SQL Server) |
| **Repeatable Read** | **Prevented** | **Prevented** | Permitted (ANSI) / Prevented (MySQL InnoDB MVCC) | Moderate (Default in MySQL InnoDB) |
| **Serializable** | **Prevented** | **Prevented** | **Prevented** | Lowest (Strict serial order or serialization aborts) |

---

### The Concurrency Anomalies Defined

#### 1. Dirty Read (`G_1`)
A transaction reads data that has been modified by another concurrent transaction that **has not committed yet**. If the modifying transaction subsequently rolls back, the first transaction based its decisions on "dirty" phantom data that never officially existed.

#### 2. Non-Repeatable Read (Fuzzy Read - (G2a))
A transaction reads a row once. Another transaction **updates or deletes** that exact row and commits. The first transaction re-reads the row and observes different values, or finds the row missing.

#### 3. Phantom Read ((G2b))
A transaction executes a range query (e.g., `SELECT COUNT(*) FROM orders WHERE user_id = 5`). Another transaction **inserts new rows** matching that range and commits. When the first transaction runs the same range query again, "phantom" rows appear that were not there previously.

---

### Technical Implementation Under the Hood

Modern engines use two primary architectures to enforce these levels:

#### 1. Two-Phase Locking (2PL) - Pessimistic Lock-Based
- **Read Uncommitted:** Queries acquire no shared locks and ignore exclusive locks on dirty pages.
- **Read Committed:** Queries acquire short-term Shared (S) locks that are released *immediately* after reading each row. Exclusive (X) locks are held until commit.
- **Repeatable Read:** Shared locks on read rows are held *until the entire transaction commits*, preventing concurrent updates.
- **Serializable:** Acquires **Range / Predicate Locks** (or Next-Key Locks in InnoDB) on the index gap to prevent concurrent inserts into query ranges.

#### 2. Multi-Version Concurrency Control (MVCC) - Optimistic Snapshot-Based
Modern engines like PostgreSQL and MySQL InnoDB use MVCC:
- **Read Committed:** Every individual SQL statement takes a fresh **Snapshot** of the database at statement start time.
- **Repeatable Read:** The snapshot is frozen at the **beginning of the transaction**. Every query in the transaction sees the database exactly as it was at transaction start time.
- *Advantage of MVCC:* **Readers never block writers, and writers never block readers!**

---

### The ELI5 Analogy: Editing a Shared Google Doc

- **Read Uncommitted:** You see letters appearing on your screen character-by-character as your colleague types them, even if they hit `Ctrl+Z` (undo) a second later.
- **Read Committed:** You only see sentences after your colleague hits "Enter/Save". But if they rewrite paragraph 2 five minutes later, your view changes midway through reading.
- **Repeatable Read:** When you open the doc, you get a frozen printed PDF snapshot. No matter how many changes colleagues publish to the live doc, your PDF stays identical.
- **Serializable:** Only one person can have the document open at any given moment. Everyone else is placed in a waiting queue.

---

### Summary
"ANSI SQL defines four isolation levels: Read Uncommitted permits all anomalies; Read Committed eliminates dirty reads using statement-level snapshots; Repeatable Read eliminates non-repeatable reads using transaction-level snapshots; Serializable eliminates all anomalies including phantoms through strict serialization or range locking."

---

### Crucial Nuance: MySQL InnoDB Eliminates Phantoms in Repeatable Read!
According to the ANSI SQL standard, `Repeatable Read` is technically allowed to permit Phantom Reads. However, **MySQL InnoDB's default Repeatable Read level eliminates Phantom Reads for consistent non-locking reads using MVCC snapshots**, and eliminates them for locking reads (`SELECT ... FOR UPDATE`) using **Next-Key Locks** (record locks + gap locks). In an interview, knowing that MySQL's Repeatable Read effectively solves phantom reads sets you apart!
