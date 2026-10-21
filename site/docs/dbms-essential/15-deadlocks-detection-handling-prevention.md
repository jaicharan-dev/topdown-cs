---
id: 15-deadlocks-detection-handling-prevention
title: "Database Deadlocks: Detection, Prevention & Handling"
description: "What a deadlock actually is, how databases detect and break one, Wait-Die vs. Wound-Wait for distributed systems, and how to prevent them in your code."
sidebar_position: 12
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a database deadlock? How do single-node and distributed engines detect or prevent them, how does victim selection work, and how do you design application code to prevent them?"

Picture two cars meeting head-on on a narrow one-lane bridge. Neither can move forward, and neither will back up on its own. That's a deadlock: two transactions, each holding a lock the other one needs, waiting on each other forever.

---

### The classic example

Alice and Bob transfer money to each other at the same time:

<Diagram>
<Row>
<Box label="T1: Alice → Bob" sub="holds Alice, wants Bob" />
<Arrow label="waits on each other" />
<Box label="T2: Bob → Alice" sub="holds Bob, wants Alice" />
</Row>
</Diagram>

```
T1 locks Alice's row, then asks for Bob's row    -> BLOCKED (T2 has it)
T2 locks Bob's row,   then asks for Alice's row  -> BLOCKED (T1 has it)
```

Neither transaction can finish. Each is waiting on a lock the other one is holding.

---

### How a single-node database detects this

#### 1. The Wait-For Graph
The engine keeps an internal graph in memory: each active transaction is a node, and an edge `T1 → T2` means "T1 is blocked waiting on a lock T2 holds." A background check runs every second or so. If it finds a cycle (`T1 → T2 → T1`), that's a confirmed deadlock.

#### 2. Lock wait timeouts
If a transaction waits longer than a configured limit (MySQL's `innodb_lock_wait_timeout`, default 50s), the engine just kills it — whether or not a full cycle actually exists.

---

### Breaking the tie: victim selection

Once a cycle is found, the engine picks one transaction to abort and roll back (PostgreSQL returns `40P01`, MySQL returns `1213`). It usually picks based on:
- **Least rollback cost** — whichever transaction has done the least work (smallest undo log).
- **Youngest transaction** — so the older, further-along transaction survives.
- **Fewest locks held.**

---

### Distributed databases do this differently

In a distributed database (Spanner, CockroachDB), building one central wait-for graph across many nodes is too slow. Instead, each transaction gets a timestamp when it starts, and the system uses that timestamp to decide who waits and who dies — no graph needed:

| Scheme | Rule | Effect |
| :--- | :--- | :--- |
| **Wait-Die** | Older transaction waits for a younger one. Younger transaction asking for a lock held by an older one just aborts and retries. | Young transactions get killed quickly. |
| **Wound-Wait** | Older transaction forces a younger one to abort immediately. Younger transaction asking for a lock held by an older one waits. | Older transactions never get killed, so long-running work isn't wasted. |

---

### A deadlock trap that surprises people: `INSERT`

Deadlocks aren't just an `UPDATE` problem. Under MySQL's Repeatable Read, two plain `INSERT`s can deadlock each other:
1. Transaction A and Transaction B both try to insert into the same empty range (say, between IDs 10 and 20).
2. Both take a **shared gap lock** on `(10, 20)` — shared locks don't conflict with each other, so both succeed.
3. Both then try to upgrade to an **exclusive** lock to actually write their row.
4. Each is now waiting on the other's shared lock. Instant deadlock.

---

### How to avoid deadlocks in your own code

**1. Always lock resources in the same order.** If every transaction in the codebase locks accounts in, say, ascending ID order, then whichever account has the smaller ID always gets locked first by everyone — no cycle can ever form.

```
Always lock min(Account_A, Account_B) first, then max(Account_A, Account_B) second.
```

**2. Keep transactions short.** Don't make an HTTP call, send a webhook, or do heavy CPU work while a transaction is open. Open it, run your queries, commit, move on.

**3. Retry on deadlock, with backoff.** Deadlocks will happen under enough concurrency — catch the error code and retry with randomized exponential backoff so retries don't all collide again.

---

### Code: lock ordering + retry

```python
import time
import random

MAX_RETRIES = 3

def transfer_funds(db, from_account_id: int, to_account_id: int, amount: float):
    # CRITICAL: always acquire locks in the same global order (by ID)
    first_id, second_id = sorted([from_account_id, to_account_id])
    
    for attempt in range(MAX_RETRIES):
        try:
            with db.transaction():
                # Step 1: lock in deterministic order
                db.execute("SELECT id, balance FROM accounts WHERE id = %s FOR UPDATE", [first_id])
                db.execute("SELECT id, balance FROM accounts WHERE id = %s FOR UPDATE", [second_id])
                
                # Step 2: do the actual transfer
                db.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", [amount, from_account_id])
                db.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", [amount, to_account_id])
                
                return True
                
        except DeadlockDetectedException:
            if attempt == MAX_RETRIES - 1:
                raise RuntimeError("Transfer failed after maximum deadlock retries")
            
            # Randomized backoff so retries don't collide again
            sleep_duration = (0.05 * (2 ** attempt)) + random.uniform(0.01, 0.05)
            time.sleep(sleep_duration)
```

---

### Say this in the interview

*"A deadlock is a circular lock dependency between transactions. Single-node engines detect it with a wait-for graph and abort a victim. Distributed engines prevent it with timestamp schemes like Wait-Die or Wound-Wait. In application code, you prevent it by always locking resources in the same order, keeping transactions short, and retrying with backoff on deadlock errors."*
