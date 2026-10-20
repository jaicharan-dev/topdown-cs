---
id: 28-debugging-and-optimizing-slow-queries
title: "Debugging & Optimizing Slow Database Queries: Production Playbook"
description: "A practical playbook for slow queries: EXPLAIN ANALYZE, sargability, buffer hit telemetry, and keyset pagination."
sidebar_position: 14
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "You are alerted that a critical query on a 50-million-row table suddenly jumped from 50ms to 15 seconds. Walk me step-by-step through how you investigate, inspect the execution plan, verify sargability, and optimize it."

When a query suddenly gets slow, don't guess and start throwing indexes at it. Work through it like a doctor running tests: look at the plan first, then check the usual suspects in order.

---

### The diagnostic flow

<Diagram>
<Row>
<Box title="1. Read the plan" accent="#60a5fa"><Field icon="🔍" code="EXPLAIN (ANALYZE, BUFFERS)" hint="see what the engine actually did" variant="neutral" /></Box>
<Box title="2. Check sargability" accent="#818cf8"><Field icon="🧩" code="any functions on indexed columns?" hint="kills index seeks" variant="neutral" /></Box>
<Box title="3. Check lookups" accent="#f59e0b"><Field icon="📇" code="index scan + heap lookups?" hint="add a covering index" variant="neutral" /></Box>
<Box title="4. Check pagination" accent="#34d399"><Field icon="📄" code="deep OFFSET?" hint="switch to keyset pagination" variant="neutral" /></Box>
<Box title="5. Check contention" accent="#fb7185"><Field icon="🔒" code="locks / buffer pool / IOPS" hint="rule out infra" variant="neutral" /></Box>
</Row>
</Diagram>

---

### Step 1: Look at the real execution plan

Plain `EXPLAIN` only shows estimates — what the planner *thinks* will happen. Run `EXPLAIN (ANALYZE, BUFFERS)` on staging or a replica to see what actually happened:

```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS, VERBOSE)
SELECT order_id, user_id, total_amount
FROM Orders
WHERE status = 'shipped' 
  AND created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 50;
```

What to look for in the output:

1. **The node type:**
   - `Seq Scan` — reading the whole table, row by row.
   - `Index Scan` — using an index, but still hopping back to the table for other columns.
   - `Index Only Scan` — best case, everything comes straight from the index.
2. **Buffer hits vs. reads:**
   - `shared hit` means the page came from RAM — basically free (around 0.001ms).
   - `shared read` means it had to go to disk — much slower (1–10ms).
   - If you see tens of thousands of `read`s, the query is hammering physical disk I/O.
3. **Estimated rows vs. actual rows:** if the planner expected 10 rows but got 4.5 million, its statistics are stale. Fix with `ANALYZE Orders;`.

---

### Step 2: Check sargability — the silent index killer

A predicate is **sargable** if the engine can use it to seek directly into a B-Tree index, instead of checking every row one by one. Wrapping an indexed column in a function, a calculation, or a type conversion almost always breaks that and forces a full scan.

| Breaks the index | Works with the index | Why |
| :--- | :--- | :--- |
| `WHERE YEAR(created_at) = 2026` | `WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01'` | `YEAR()` has to be computed for every single row before it can be compared. |
| `WHERE SUBSTRING(phone, 1, 3) = '415'` | `WHERE phone LIKE '415%'` | String functions can't use the B-Tree's sorted prefix order. |
| `WHERE salary * 1.1 > 100000` | `WHERE salary > 100000 / 1.1` | Any math on the column itself blocks a direct key comparison. |
| `WHERE user_id = 5042` (when `user_id` is `VARCHAR`) | `WHERE user_id = '5042'` | A type mismatch forces the engine to convert every row's value before comparing. |
| `WHERE email LIKE '%@gmail.com'` | A full-text or reverse index | A leading `%` means there's no fixed starting point to seek from. |

---

### Step 3: Stop the extra trips to the table

If the plan shows an `Index Scan` followed by a big `Bitmap Heap Scan`, that means the index found the right rows, but then had to make hundreds of thousands of separate disk seeks into the table just to fetch columns the index didn't have.

Fix it with a **covering index** — bundle those extra columns into the index itself using `INCLUDE`:

```sql
CREATE INDEX idx_orders_covering 
ON Orders (status, created_at DESC) 
INCLUDE (order_id, user_id, total_amount);
```

Now the whole query can be answered straight from the index's leaf pages — an `Index Only Scan`, no detour to the table.

---

### Step 4: Fix deep pagination

`LIMIT 50 OFFSET 1000000` is a trap: the database still has to read and throw away the first million rows before it can return your 50.

**The fix: keyset (cursor-based) pagination.** Instead of saying "skip this many rows," remember the last row you saw and ask for everything after it:

```sql
-- Keyset Seek Method (constant time, regardless of page number):
SELECT * FROM Orders
WHERE (created_at, order_id) < ('2026-02-15 14:30:00', 984021)
ORDER BY created_at DESC, order_id DESC
LIMIT 50;
```

This jumps straight to the right spot in the B-Tree and streams the next 50 rows — under a millisecond, no matter how deep you are.

---

### Step 5: If the plan looks fine, check the infrastructure

Sometimes the plan is already optimal and the query is still slow for reasons outside the plan:

1. **Locks:** check `pg_stat_activity` (Postgres) or `SHOW PROCESSLIST` (MySQL) — is something else holding a lock on this table?
2. **Cache eviction:** did a big analytical report just flush your hot data out of the RAM buffer pool?
3. **Disk throttling:** check cloud disk metrics — did you burn through your IOPS burst budget (e.g. AWS EBS GP3)?

---

### Say this in the interview

*"I follow a five-step process. First, run `EXPLAIN (ANALYZE, BUFFERS)` to see the real plan and buffer hit ratio — if estimated and actual row counts are wildly different, I run `ANALYZE` to refresh statistics. Second, check for non-sargable predicates — functions, type casts, or leading wildcards on indexed columns all force a full scan. Third, if the plan shows index scans doing a lot of extra heap lookups, I add a covering index with `INCLUDE` to get an index-only scan. Fourth, if it's using deep `OFFSET` pagination, I switch to keyset pagination so it's a constant-time seek instead of scanning and discarding rows. Finally, if the plan itself looks fine, I check for lock contention, buffer pool eviction, or disk IOPS throttling."*

---

### Code: sargable vs. non-sargable, side by side

This script builds an orders table in SQLite and shows how wrapping a column in a function throws away the index, while a plain range comparison keeps it.

```python
import sqlite3

def run_sargable_demo():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE Orders (
            order_id INTEGER PRIMARY KEY,
            created_at TEXT NOT NULL,
            total_amount REAL
        );
    """)

    cursor.execute("CREATE INDEX idx_created_at ON Orders(created_at);")

    # Insert sample records
    for i in range(1000):
        date_str = f"2026-01-{(i % 28) + 1:02d} 12:00:00"
        cursor.execute("INSERT INTO Orders VALUES (?, ?, ?);", (i, date_str, float(i * 10)))
    conn.commit()

    print("--- 1. NON-SARGABLE Query: SUBSTR(created_at, 1, 7) = '2026-01' ---")
    cursor.execute("""
        EXPLAIN QUERY PLAN 
        SELECT * FROM Orders 
        WHERE SUBSTR(created_at, 1, 7) = '2026-01';
    """)
    for row in cursor.fetchall():
        print("Plan:", row[3]) # Output: SCAN TABLE Orders (Index completely bypassed!)

    print("\n--- 2. SARGABLE Query: created_at >= '2026-01-01' AND created_at < '2026-02-01' ---")
    cursor.execute("""
        EXPLAIN QUERY PLAN 
        SELECT * FROM Orders 
        WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01';
    """)
    for row in cursor.fetchall():
        print("Plan:", row[3]) # Output: SEARCH TABLE Orders USING INDEX idx_created_at

    conn.close()

if __name__ == "__main__":
    run_sargable_demo()
```
