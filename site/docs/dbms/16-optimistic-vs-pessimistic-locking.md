---
id: 16-optimistic-vs-pessimistic-locking
title: "Optimistic vs. Pessimistic Locking"
description: "Compare Optimistic Locking (versioning/timestamps) and Pessimistic Locking (SELECT FOR UPDATE), concurrency trade-offs, and use-case selection."
sidebar_position: 16
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between optimistic and pessimistic locking? When would you choose one over the other, and how is each implemented in SQL?"

Concurrency control strategies determine how an application prevents conflicting updates when multiple users attempt to modify the same resource simultaneously. The two primary paradigms are **Pessimistic Locking** and **Optimistic Locking**.

---

### High-Level Comparison

| Feature | Pessimistic Locking | Optimistic Locking |
| :--- | :--- | :--- |
| **Philosophical Assumption** | Conflicts **will happen frequently**; lock early to prevent disaster | Conflicts **are rare**; proceed without locks and validate at the end |
| **Locking Mechanism** | Database-level exclusive row/table locks (`SELECT ... FOR UPDATE`) | Application-level version numbers or timestamps |
| **Deadlock Risk** | **High** (transactions hold locks and wait on others) | **Zero** (no locks are held in the database during read/think time) |
| **Throughput / Scalability** | Low to Moderate (blocks concurrent readers/writers) | Very High (unrestricted concurrent reads) |
| **Failure Penalty** | Waiting transactions block in line | Aborted transactions must retry or notify user of conflict |
| **Ideal Workload** | High contention, short transactions, financial/inventory debits | Low contention, long user think times (CMS, wiki editing, profiles) |

---

### 1. Pessimistic Locking (Lock Upfront)

Pessimistic locking prevents concurrent modification by placing an **Exclusive Lock (`X Lock`)** on the target row the moment it is read:

```sql
BEGIN;

-- Locks the row with user_id = 'U123'. 
-- Any other transaction trying to read this row FOR UPDATE or write to it is BLOCKED.
SELECT balance 
FROM accounts 
WHERE user_id = 'U123' 
FOR UPDATE;

-- Application checks if balance >= 50
UPDATE accounts 
SET balance = balance - 50 
WHERE user_id = 'U123';

COMMIT; -- Lock is finally released here!
```

#### Pros:
- Guaranteed data integrity; no race conditions.
- No wasted work—once a transaction acquires the lock, it is guaranteed to complete.

#### Cons:
- Terrible scalability under high traffic (transactions queue up, leading to connection pool exhaustion).
- High risk of deadlocks if multiple rows are locked in different orders.

---

### 2. Optimistic Locking (Check at Commit)

Optimistic locking does not acquire any locks during reading. Instead, it adds a `version INT` or `updated_at TIMESTAMP` column to the table. When updating, it validates that the version has not changed since it was read:

```sql
-- Step 1: Read the record without any locks
SELECT id, title, content, version 
FROM articles 
WHERE id = 42;
-- Suppose version returned is 5.

-- (User edits the article in their browser for 10 minutes...)

-- Step 2: Atomic update with version check
UPDATE articles 
SET content = 'Updated content...', 
    version = version + 1 
WHERE id = 42 AND version = 5;
```

#### How the Application Detects Conflicts:
The database returns the number of affected rows:
- If `affected_rows == 1`: The update succeeded! No one touched the record in the interim.
- If `affected_rows == 0`: **Conflict detected!** Another user committed version 6 while you were editing. The application rejects the save, rolls back, and prompts the user or retries.

---

### The ELI5 Analogy: Booking Conference Rooms

- **Pessimistic Locking (Padlock on the Door):** You walk up to the conference room at 9:00 AM, hang a physical padlock on the door, and put the key in your pocket. You sit inside for an hour preparing your slides. Nobody else can even step into the room to look around until you leave and unlock the door.
- **Optimistic Locking (The Dry-Erase Sign-in Sheet):** The door is left wide open. Anyone can walk in. There is a whiteboard by the door with a version number (`Version 1`). You read the board, go back to your desk, and prep your meeting. When you arrive for your meeting, you check the board. If it still says `Version 1`, you erase it, write `Version 2`, and start your meeting. If it says `Version 2`, someone beat you to it; you apologize and find another room.

---

### Summary
"Pessimistic locking uses database row-level locks (`SELECT ... FOR UPDATE`) to prevent concurrent updates upfront, making it ideal for high-contention financial transactions. Optimistic locking avoids locks by checking a version column at update time, maximizing throughput for low-contention read-heavy systems."

---

### Crucial Nuance: The Lost Update Trap Without Versioning
Never attempt optimistic locking by checking the data values themselves (e.g., `WHERE content = 'old text'`). If User A edits the article back to its original state, User B might overwrite User C's changes without knowing a mutation occurred (the classic **ABA Problem**). Always use a strictly monotonically increasing integer `version` column.
