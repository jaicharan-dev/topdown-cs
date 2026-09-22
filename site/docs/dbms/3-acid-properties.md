---
id: 3-acid-properties
title: "ACID Properties in Databases"
description: "A comprehensive deep dive into Atomicity, Consistency, Isolation, and Durability with financial transfer examples and WAL internals."
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the ACID properties in a database? Explain each property with a real-world example and explain how the database engine guarantees them internally."

The **ACID** acronym defines the four foundational guarantees that a relational database management system (RDBMS) provides to ensure data reliability, even in the presence of crashes, network failures, and concurrent clients.

---

### The Four Pillars of ACID

```
A - Atomicity   -> All or nothing
C - Consistency -> Valid state to valid state (preserves invariants)
I - Isolation   -> Concurrent transactions execute without mutual interference
D - Durability  -> Committed data survives power failure and crashes
```

---

### 1. Atomicity (All-or-Nothing)
- **The Definition:** All statements inside a transaction execute to completion or none of them do. Partial updates are impossible.
- **Real-World Example:** Moving \500 from your Savings account to Checking account. The \500 cannot leave Savings without appearing in Checking. If a crash occurs midway, the debit is rolled back.
- **Internal Mechanism:** Implemented using the **Undo Log** or **Write-Ahead Log (WAL)**. Before dirty pages are modified in memory, the engine writes reverse operations (the before-image) to the log on disk. On rollback or restart, the undo log reverses uncommitted changes.

### 2. Consistency (Integrity Invariants)
- **The Definition:** A transaction can only transition the database from one valid state to another valid state, upholding all explicit constraints (`CHECK`, `FOREIGN KEY`, `NOT NULL`, `UNIQUE`) and implicit business invariants.
- **Real-World Example:** An account balance has a constraint `CHECK (balance >= 0)`. If a transaction attempts to withdraw \200 from an account holding only \100, the database rejects the entire transaction and aborts to preserve the consistency rule.
- **Internal Mechanism:** Enforced by constraint validation engines and schema metadata before committing a transaction.

### 3. Isolation (Concurrency Control)
- **The Definition:** Concurrent execution of transactions yields the same system state that would be obtained if the transactions executed sequentially, one after the other. Intermediate, uncommitted changes of one transaction remain invisible to others.
- **Real-World Example:** You and your spouse attempt to withdraw the last \100 from an ATM at the exact same millisecond using two separate debit cards. Isolation prevents both machines from reading \100 simultaneously and dispensing \$200 total.
- **Internal Mechanism:** Implemented through **Multi-Version Concurrency Control (MVCC)** and **Locking mechanisms** (Shared Locks, Exclusive Locks, Row-Level Locks, and 2-Phase Locking).

### 4. Durability (Survivability)
- **The Definition:** Once a transaction commits, its effects are guaranteed to persist permanently, even if the database server immediately suffers catastrophic power failure.
- **Real-World Example:** You receive an order confirmation screen stating *"Order #4891 Placed Successfully."* Even if the cloud provider's data center abruptly loses power one millisecond later, your order will remain in the database when servers reboot.
- **Internal Mechanism:** Guaranteed via **Write-Ahead Logging (WAL)** and **Redo Logs**. Changes are flushed synchronously to the append-only WAL on non-volatile storage (`fsync`) before the `COMMIT` response is sent to the client. On boot recovery, the engine replays the redo log to reconstruct committed transactions that were still dirty in RAM.

---

### The ELI5 Analogy: Buying Flight Tickets

- **Atomicity:** You pay for the flight and your seat is reserved. You never get charged without getting a ticket, and you never get a ticket without being charged.
- **Consistency:** The flight has 180 physical seats. The booking system will never let total confirmed passengers reach 181, preserving the plane's capacity rule.
- **Isolation:** You and another customer are looking at the last window seat (14A). The system places a hold on 14A while you checkout; the other customer cannot swipe it while you enter your credit card.
- **Durability:** The moment your confirmation email generates, the airline's ticketing database has saved your record to redundant disks. If the airline's website crashes 5 seconds later, your boarding pass remains 100% valid at the airport.

---

### Summary
"ACID guarantees reliable transaction processing: Atomicity ensures all-or-nothing execution via undo logs; Consistency preserves schema constraints and invariants; Isolation prevents concurrent transaction race conditions via MVCC and locks; Durability guarantees committed changes survive system crashes via write-ahead logging (WAL)."

---

### Crucial Nuance: The "C" in ACID vs. The "C" in CAP Theorem
Software engineers frequently conflate the **C** in ACID with the **C** in the CAP theorem:
- **Consistency in ACID:** Means **application and schema validity** (e.g., invariants, foreign keys, check constraints are preserved across state transitions).
- **Consistency in CAP Theorem:** Means **Linearizability / Single-Copy Consistency** (every read returns the most recent write across distributed nodes).
They describe two completely different properties!
