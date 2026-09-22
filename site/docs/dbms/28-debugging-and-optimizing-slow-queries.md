---
id: 28-debugging-and-optimizing-slow-queries
title: "Debugging & Optimizing Slow Database Queries"
description: "Senior engineer playbook for diagnosing and optimizing slow SQL queries: EXPLAIN ANALYZE, sargability, buffer hit ratios, and keyset pagination."
sidebar_position: 28
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "You are alerted that a critical query on a table with 50 million rows is suddenly taking 12 seconds to run. Walk me step-by-step through how you would investigate, debug, and optimize it."

This question evaluates whether you have practical, battle-tested production debugging skills or merely theoretical SQL knowledge. A senior engineer approaches query optimization systematically using telemetry, execution plans, and index mechanics.

---

### Step 1: Capture the Exact Query and Execution Plan

Never guess what the database is doing. Inspect the physical query execution plan using `EXPLAIN ANALYZE`:

```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS, VERBOSE)
SELECT order_id, total_amount, user_id
FROM orders
WHERE status = 'shipped' 
  AND created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 50;
```

#### What to Look For in the Plan Output:
1. **Node Types:**
   - **`Seq Scan` (Full Table Scan):** The database is reading all 50 million rows off disk. Red flag!
   - **`Index Scan` vs. `Index Only Scan`:** Is it performing index seeking, or is it bogged down by millions of random I/O **Bookmark Lookups**?
2. **Actual Time vs. Estimated Cost:** If estimated rows (`rows=10`) wildly deviates from actual rows (`rows=4,200,000`), the database's **Table Statistics are stale**, causing the optimizer to select an atrocious join strategy. Run `ANALYZE orders;` immediately.
3. **`Buffers: shared hit=... read=...`:** How many pages came from RAM cache (`hit`) versus physical disk read (`read`)?

---

### Step 2: Check for Non-Sargable Predicates (The Silent Index Killer)

A **Sargable** (Search-Argument-Able) query allows the engine to perform direct B-Tree index seeking. 
Applying functions, mathematical operations, or type casts on indexed columns prevents index seeks:

```sql
-- NON-SARGABLE (Destroys Index Seek - Triggers 50M row scan!):
WHERE YEAR(created_at) = 2026;
WHERE SUBSTRING(phone, 1, 3) = '415';
WHERE user_id + 0 = 500; -- Implicit type cast from string to int

-- SARGABLE (Enables Direct B-Tree Index Seek):
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
WHERE phone LIKE '415%';
WHERE user_id = '500';
```

---

### Step 3: Eliminate Bookmark Lookups with a Covering Index

If the plan shows an `Index Scan` followed by massive `Bitmap Heap Scan` or key lookups:
- The secondary index found the rows, but had to visit the primary clustered table 500,000 times to fetch non-indexed columns.
- **Fix:** Build a **Covering Index** that contains the filter columns, the sort columns, and the requested projection columns:

```sql
CREATE INDEX idx_orders_covering ON orders (status, created_at DESC) 
INCLUDE (order_id, total_amount, user_id); -- In Postgres / SQL Server
```
This enables an **Index-Only Scan**, returning data directly from the leaf nodes without touching the primary table.

---

### Step 4: Fix Deep Pagination (`OFFSET` Bottleneck)

Queries like `LIMIT 50 OFFSET 1000000` cripple databases:
- The engine must read, sort, and discard \$1,000,000 rows just to hand you 50 rows!
- **Fix: Switch to Keyset Pagination (Seek Method):**

```sql
-- INSTEAD OF:
SELECT * FROM orders ORDER BY id DESC LIMIT 50 OFFSET 1000000;

-- USE KEYSET PAGINATION:
SELECT * FROM orders 
WHERE id < 948201 -- ID of the last item from previous page
ORDER BY id DESC 
LIMIT 50;
```
This performs a single direct B-Tree seek to `id = 948201` and reads the next 50 consecutive rows in 0.2ms.

---

### Step 5: Check System & Hardware Contention

If the query plan looks optimal on your staging database but runs like molasses in production:
1. **Lock Contention:** Check `pg_stat_activity` or `SHOW PROCESSLIST`. Is the query blocked waiting on a heavy table lock (`ExclusiveLock` from an `ALTER TABLE` or uncommitted batch update)?
2. **Buffer Pool Eviction:** Has a rogue analytical batch job flushed hot operational pages out of the InnoDB buffer pool?
3. **I/O Wait Spikes:** Is the cloud disk volume (e.g., AWS EBS GP3) throttling burst IOPS limits?

---

### The ELI5 Analogy: The Car Mechanic

When a car makes a sputtering noise, an amateur starts replacing the engine, tires, and battery at random. A master mechanic plugs in an **OBD2 diagnostic scanner** (`EXPLAIN ANALYZE`), reads the exact error code, inspects the spark plugs (checks Sargability), verifies fuel pressure (checks memory buffers), and replaces the one faulty valve.

---

### Summary
"To optimize a 12-second query: Run EXPLAIN ANALYZE to inspect node types and check for Seq Scans vs. Index Scans; verify query sargability to ensure functions do not disable B-tree seeks; design covering indexes to eliminate bookmark lookups; replace deep OFFSET pagination with keyset seek pagination; and inspect database locking and buffer pool saturation."

---

### Crucial Nuance: Updating Stale Statistics
The cost-based optimizer makes decisions based on histogram statistics stored in catalog tables (like `pg_statistic` in Postgres). If an e-commerce platform undergoes a flash sale where 10,000,000 orders are inserted in 2 hours, the database statistics might still believe the table has only 100,000 rows. The optimizer may choose a nested loop join (intended for small tables) instead of a hash join, causing query times to explode from 20ms to 30 seconds! Running `ANALYZE table_name` rebuilds histograms and restores instant performance.
