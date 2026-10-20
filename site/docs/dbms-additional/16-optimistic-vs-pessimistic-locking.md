---
id: 16-optimistic-vs-pessimistic-locking
title: "Optimistic vs. Pessimistic Locking: Concurrency & Trade-offs"
description: "Compare Optimistic Locking (versioning/timestamps) and Pessimistic Locking (SELECT FOR UPDATE, NOWAIT, SKIP LOCKED), retry storms, and use-case selection."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between optimistic and pessimistic locking? When should you choose each in production systems, what are the roles of `SELECT FOR UPDATE`, `NOWAIT`, and `SKIP LOCKED`, and how do you handle optimistic retry storms?"

Two people editing the same row at once can accidentally overwrite each other's work — the **lost update problem**. There are two ways to stop that: lock the row before anyone touches it, or let everyone touch it and check for conflicts right before saving.

<Diagram>
<Row>
<Box title="Pessimistic: lock upfront" accent="#fb7185">
<Field icon="🔒" code="1. SELECT ... FOR UPDATE" hint="locks the row immediately" variant="neutral" />
<Field icon="🧮" code="2. compute in application" hint="everyone else waits" variant="neutral" />
<Field icon="✅" code="3. UPDATE, COMMIT" hint="lock released" variant="neutral" />
</Box>
<Box title="Optimistic: check at commit" accent="#34d399">
<Field icon="👀" code="1. read row + version" hint="no lock taken" variant="neutral" />
<Field icon="🧮" code="2. compute in application" hint="everyone else keeps working" variant="neutral" />
<Field icon="🔄" code="3. UPDATE ... WHERE version = ?" hint="0 rows changed means someone beat you — retry" variant="neutral" />
</Box>
</Row>
</Diagram>

- **Pessimistic locking** assumes conflicts are common and expensive, so it locks the row immediately and makes everyone else wait.
- **Optimistic locking** assumes conflicts are rare, so it lets everyone read and compute freely, and only checks for a conflict right before writing.

---

### Side by side

| | Pessimistic | Optimistic |
| :--- | :--- | :--- |
| **Assumes** | High contention, conflicts are likely | Low contention, conflicts are rare |
| **How it works** | Database row/table lock (`FOR UPDATE`) | App-level `version` column check |
| **Deadlock risk** | High — threads hold locks and wait on each other | None — no locks held while thinking |
| **Throughput** | Low to moderate — blocks other threads | Very high — reads never block |
| **When it fails** | Transactions queue up, risking timeouts | Aborted writes must retry or tell the user |
| **Good for** | High contention: balances, inventory reservations | Read-heavy: CMS edits, long user sessions |

---

### Pessimistic locking: `FOR UPDATE`, `NOWAIT`, `SKIP LOCKED`

**Plain `SELECT ... FOR UPDATE`** locks the matching rows. Anyone else trying to read with `FOR UPDATE` or write to them just blocks until you commit or roll back.

```sql
BEGIN;
SELECT balance FROM Accounts WHERE user_id = 101 FOR UPDATE;
-- Application logic...
UPDATE Accounts SET balance = balance - 50 WHERE user_id = 101;
COMMIT;
```

**`FOR UPDATE NOWAIT`** refuses to wait — if the row's already locked, it fails immediately instead of blocking. Good for interactive APIs where blocking a worker thread for seconds is unacceptable.

**`FOR UPDATE SKIP LOCKED`** is the trick behind high-throughput job queues: instead of waiting on a locked row, or failing, it just skips it and grabs the next free one.

```sql
-- 50 worker threads can run this concurrently without blocking each other!
BEGIN;
SELECT job_id, payload 
FROM Jobs 
WHERE status = 'pending' 
ORDER BY priority DESC 
LIMIT 1 
FOR UPDATE SKIP LOCKED;

UPDATE Jobs SET status = 'processing' WHERE job_id = :job_id;
COMMIT;
```

---

### Optimistic locking: a `version` column, and why not to use old values instead

Add a `version` integer to the table. Read it, do your work, then only write if the version hasn't moved:

```sql
-- Step 1: Read without locks
SELECT id, title, content, version FROM Articles WHERE id = 42;
-- Reads version = 5

-- Step 2: Atomic update with version verification
UPDATE Articles 
SET content = 'New text...', version = version + 1 
WHERE id = 42 AND version = 5;
```

If the update affects 1 row, you won. If it affects 0 rows, someone else committed first — roll back and retry (or tell the user).

Don't try to check against the old data value instead (`WHERE content = 'old text'`). If user A changes `"A"` to `"B"`, and user B changes it right back to `"A"`, a stale write from user C would wrongly "match" and succeed even though two real changes happened in between. A monotonically increasing `version` number avoids this **ABA problem** completely — it can never go backward.

---

### The failure mode: retry storms

Optimistic locking falls apart under extreme contention — say a flash sale, 10,000 requests fighting over 10 tickets. One wins, 9,999 fail. If all 9,999 immediately retry at once, you get a **retry storm**: the database gets hammered with waves of doomed requests, saturating connections and burning CPU for nothing.

Fixes:
1. **Exponential backoff with jitter** — space retries out randomly so they don't all collide again.
2. **Fall back to pessimistic locking** for genuinely high-contention hotspots — queuing is cheaper than thousands of failed retries.
3. **Push the logic into one atomic statement** where possible:
   ```sql
   UPDATE Inventory SET stock = stock - 1 WHERE item_id = 42 AND stock > 0;
   ```

---

### Say this in the interview

*"Pessimistic locking takes an exclusive row lock upfront with SELECT FOR UPDATE, so it's right for high-contention, high-stakes writes like balance transfers — it prevents lost updates completely, at the cost of blocking and some deadlock risk. Optimistic locking skips the lock and instead checks a version column right before committing, succeeding only if nothing changed underneath it — great for read-heavy, low-contention workloads, but it can cause a retry storm if contention spikes. NOWAIT fails fast instead of blocking, and SKIP LOCKED is how lock-free job queues work in Postgres."*

---

### Code: watching two threads conflict and retry

The following Python script simulates two concurrent threads updating a shared bank account using optimistic locking, demonstrating conflict detection and automatic retry.

```python
import sqlite3
import threading
import time

def setup_db():
    conn = sqlite3.connect("optimistic_demo.db")
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS Account;")
    cursor.execute("""
        CREATE TABLE Account (
            account_id INT PRIMARY KEY,
            balance REAL NOT NULL,
            version INT NOT NULL
        );
    """)
    cursor.execute("INSERT INTO Account VALUES (1, 1000.0, 1);")
    conn.commit()
    conn.close()

def optimistic_transfer(worker_name: str, deposit_amount: float):
    conn = sqlite3.connect("optimistic_demo.db", timeout=10.0)
    cursor = conn.cursor()
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        # 1. Read balance and current version (No locks held!)
        cursor.execute("SELECT balance, version FROM Account WHERE account_id = 1;")
        balance, version = cursor.fetchone()
        
        # Simulate slight network / compute delay
        time.sleep(0.05)
        new_balance = balance + deposit_amount
        
        # 2. Attempt atomic update with version verification
        cursor.execute("""
            UPDATE Account 
            SET balance = ?, version = version + 1 
            WHERE account_id = 1 AND version = ?;
        """, (new_balance, version))
        conn.commit()
        
        if cursor.rowcount == 1:
            print(f"[{worker_name}] Attempt {attempt}: SUCCESS! Deposited {deposit_amount}. New Balance: {new_balance}")
            break
        else:
            print(f"[{worker_name}] Attempt {attempt}: CONFLICT DETECTED! (Expected version {version} was modified). Retrying...")
            time.sleep(0.02)
    conn.close()

if __name__ == "__main__":
    setup_db()
    print("--- Simulating Concurrent Optimistic Updates ---")
    t1 = threading.Thread(target=optimistic_transfer, args=("Thread-A", 100.0))
    t2 = threading.Thread(target=optimistic_transfer, args=("Thread-B", 200.0))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Final Verification
    conn = sqlite3.connect("optimistic_demo.db")
    c = conn.cursor()
    c.execute("SELECT balance, version FROM Account WHERE account_id = 1;")
    final_balance, final_version = c.fetchone()
    print(f"\nFinal State: Balance = {final_balance} | Version = {final_version} (Both updates applied cleanly!)")
    conn.close()
```
