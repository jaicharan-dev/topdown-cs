---
id: 28-debugging-and-optimizing-slow-queries
title: "Debugging a Suddenly Slow Query"
description: "A method rather than a trick: establish what changed, read the actual plan, and look at estimated against actual rows before anything else"

sidebar_position: 28
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "You are alerted that a critical query on a 50-million-row table suddenly jumped from 50ms to 15 seconds. Walk me step-by-step through how you investigate, inspect the execution plan, verify sargability, and optimize it."

---

### Picture it

A delivery route that took twenty minutes every day for a year and today took five hours.

**The useless response is to start redesigning the route.** Nothing about it changed. It worked yesterday. Whatever is wrong, **the route is not a new mistake**, so redesigning it is both premature and likely to break something that was fine.

**The useful response is one question: what is different today?** A new road closure, a bigger load, a different van, a driver who does not know the shortcut. The word "suddenly" is the most valuable piece of information in the whole report, and throwing it away is the commonest mistake.

**Then you find out what actually happened**, which means getting the driver's real account of the journey rather than the planned route. Where did the time go? Was it moving slowly or **stopped**? Those are completely different problems and no amount of studying the map distinguishes them.

**And here is the thing that explains most of these cases.** The route was planned on the assumption that a particular street has **light traffic**. That was true when the plan was made. It is not true now, and **nobody told the planner**. So the plan is being followed faithfully, and it is a good plan for a situation that no longer exists.

You do not fix that by redesigning the route. **You fix it by telling the planner what the street is actually like**, and letting it plan again. Nine times out of ten the plan it produces is the original one, and the journey takes twenty minutes.

Only once you have ruled all that out do you start asking whether the route itself could be better.

---

### The proper terms

#### Step 1: establish the facts before touching anything

The word "suddenly" is the most informative part of the report, so the first task is to find **what changed**.

**When exactly did it change?** Correlate with deploys, schema migrations, bulk data loads, configuration changes and traffic patterns. A clean step change points at a deploy or a migration; a gradual degradation that crossed a threshold points at data growth.

**Is it every execution, or some?** If only certain parameter values are slow, you are looking at **data skew** or a **parameter-sensitive plan**, not a bad query.

**Is the query slow, or is it waiting?** This is the question people skip. Check whether the session is **running** or blocked:

```sql
SELECT pid, state, wait_event_type, wait_event, query
FROM   pg_stat_activity WHERE state <> 'idle';
```

A `wait_event_type` of `Lock` means it is not slow at all; it is **queued behind something else**, and the query is a victim rather than the cause.

**Is it the system?** CPU saturation, an I/O-bound disk, a failing replica or an exhausted connection pool make every query slow. One alert on one query is often a symptom.

#### Step 2: get the actual plan, not the estimated one

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS) SELECT ...;
```

**`ANALYZE` actually executes the query** and reports real timings and real row counts. Plain `EXPLAIN` shows only what the planner **intends**, which is exactly the thing in doubt.

**`BUFFERS` shows real I/O**: `shared hit` means it came from cache, `shared read` means it came from disk. A query whose working set no longer fits in memory shows up here and nowhere else.

Then read the plan with **one question first**:

**Compare estimated rows against actual rows at every node.**

This single comparison is the most informative thing in the output. A node estimating 100 rows and returning 2 million means the planner **made every decision above that node on wrong information**. It chose a nested loop because it expected a handful of iterations; it chose not to hash because it expected a small input. The plan is not stupid, it is **correct for a table that no longer exists**.

Everything else you look for is downstream of that:

**A sequential scan on a large table** where an index exists.

**A nested loop with a large outer input**, which is `O(n)` index lookups and is catastrophic when `n` was estimated as 100 and is actually a million.

**A sort spilling to disk**, shown as `external merge Disk: 240MB`.

**A hash spilling**, shown as `Batches: 16` rather than `Batches: 1`.

**A high `Rows Removed by Filter`**, meaning the engine read far more than it kept, which usually indicates a missing or unusable index.

#### Step 3: the likely causes, in order of frequency

For a **sudden** regression specifically:

**Stale statistics.** The single most common cause. The table grew or its distribution shifted, `ANALYZE` has not run recently enough, and the planner's estimate is now wrong, so it chose a plan that suits the old shape. **The fix is one command**, and it resolves a startling proportion of these incidents.

**A plan flip.** The table crossed a cost threshold as it grew, and the optimiser switched from an index scan to a sequential scan, or from a hash join to a nested loop. The plan changed legitimately; whether it changed correctly depends on the estimates.

**Parameter sniffing.** Especially in SQL Server, where a cached plan was compiled for an unrepresentative parameter value and is now reused for everything.

**Data skew.** A specific parameter value now matches a huge number of rows, so the query is slow for that value only.

**Bloat.** In PostgreSQL, accumulated dead tuples mean a scan reads far more pages than there are live rows. Check `n_dead_tup` against `n_live_tup` and whether autovacuum is keeping up.

**An index was dropped, or became invalid**, perhaps by a failed `CREATE INDEX CONCURRENTLY` leaving it `INVALID`.

**The working set outgrew memory.** What used to be buffer cache hits are now disk reads, which `BUFFERS` reveals immediately.

**Lock contention**, which step 1 should already have caught.

#### Step 4: verify sargability

**Sargable** means a predicate can be used to **seek an index**, which requires the indexed column to appear **bare on one side** of the comparison.

The common killers, all of which make an index unusable:

**A function on the column.** `WHERE YEAR(created_at) = 2025` cannot use an index on `created_at`, because the index stores the dates, not their years.

**Implicit type conversion.** Comparing a `varchar` column to a number, or a `bigint` column to a string, makes the engine cast the **column**, which is a function on the column by another name. This one is insidious because nothing in the SQL looks wrong.

**A leading wildcard.** `LIKE '%smith'` has no prefix to seek to. `LIKE 'smith%'` is a range scan and is fine.

**Arithmetic on the column.** `WHERE price * 1.2 > 100` rather than `WHERE price > 100 / 1.2`.

**`OR` across different columns**, which often prevents a single index being used for both branches.

**A `NOT` or `<>` predicate**, which rarely benefits from an index because it matches most rows.

The fixes mirror the causes: rewrite as a **range**, build an **expression index**, fix the type mismatch, use a **trigram index** for leading wildcards, and replace `OR` with `UNION ALL`.

#### Step 5: optimise, in order of cost to implement

**Update the statistics.** `ANALYZE` first, always, because everything else is guesswork if the estimates are wrong.

**Fix sargability.** A rewrite that makes an existing index usable is free and has no ongoing cost.

**Add or fix an index**, ordered by **ESR** (equality, sort, range) and covering with `INCLUDE` where a heap fetch dominates. Remember this is not free: it is paid on every write.

**Rewrite the query.** Replace `SELECT *` with the columns needed, which enables index-only scans. Replace `OR` with `UNION ALL`. Replace a correlated subquery with a join. Replace `OFFSET` pagination with **keyset pagination**, since `OFFSET 100000` reads and discards 100,000 rows.

**Improve the estimates directly.** Raise `STATISTICS` targets on a skewed column, or create **extended statistics** where columns are correlated and the planner is multiplying selectivities that are not independent.

**Change the physical design**, as a last resort: a materialised view or summary table for a genuine aggregation, or partitioning if the query always filters on a partitionable key.

#### Step 6: verify and guard

**Re-run `EXPLAIN (ANALYZE, BUFFERS)`** and compare node by node, not just the total time, because a faster run might simply be a warm cache.

**Check you have not regressed anything else.** A new index costs every write, and a rewritten query may have been serving other callers.

**Record the baseline.** `pg_stat_statements` gives mean and total time per query, and an alert on the mean turns the next occurrence into a signal instead of a surprise.

**Fix the cause, not the instance.** If stale statistics caused it, the real fix is tuning autovacuum for that table, not running `ANALYZE` once.

---

### In code

```sql
-- STEP 1: ESTABLISH THE FACTS. Is it slow, or is it WAITING?
SELECT pid, state, wait_event_type, wait_event,
       now() - query_start AS duration, left(query, 80)
FROM   pg_stat_activity
WHERE  state <> 'idle'
ORDER  BY duration DESC;

--   wait_event_type = 'Lock'   -> NOT SLOW. It is QUEUED behind
--                                 something else. The query is a
--                                 VICTIM, not the cause.
--   wait_event_type = 'IO'     -> reading from disk: cache or bloat
--   state = 'active', no wait  -> genuinely executing

-- and the questions to answer BEFORE touching the query:
--   WHEN exactly did it change? correlate with deploys, migrations,
--      bulk loads, config changes, traffic
--      a clean step change -> a deploy or migration
--      a gradual slide that crossed a line -> data growth
--   EVERY execution, or SOME? if only certain parameter values are
--      slow, it is DATA SKEW or a parameter-sensitive plan, not a
--      bad query
--   IS IT THE SYSTEM? CPU saturation, I/O saturation, a failing
--      replica, an exhausted pool. One alert on one query is often
--      a symptom.
```

```sql
-- STEP 2: GET THE ACTUAL PLAN, NOT THE ESTIMATED ONE
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)
SELECT o.id, o.total, c.name
FROM   orders o JOIN customers c ON c.id = o.customer_id
WHERE  o.status = 'pending' AND o.placed_at > now() - interval '7 days';

--   ANALYZE   actually EXECUTES it and reports real timings and
--             real row counts. Plain EXPLAIN shows only what the
--             planner INTENDS, which is the thing in doubt.
--   BUFFERS   shows real I/O: `shared hit` = cache,
--             `shared read` = disk. A working set that no longer
--             fits in memory shows up HERE AND NOWHERE ELSE.
```

```text
AND READ IT WITH ONE QUESTION FIRST:
   COMPARE ESTIMATED ROWS AGAINST ACTUAL ROWS AT EVERY NODE.

  Nested Loop  (cost=0.43..812.11 rows=100 width=48)
               (actual time=0.03..14892.44 rows=2104887 loops=1)
                                   ^^^^^^^^^^^^^^^^^^^^^^^^
     estimated 100, ACTUAL 2,104,887        <- A 20,000x ERROR

  that single comparison is the most informative thing in the
  output. The planner MADE EVERY DECISION ABOVE THAT NODE ON WRONG
  INFORMATION: it chose a nested loop because it expected a handful
  of iterations, and it chose not to hash because it expected a
  small input.

  THE PLAN IS NOT STUPID. IT IS CORRECT FOR A TABLE THAT NO LONGER
  EXISTS.

  everything else is downstream of that:
     Seq Scan on a large table where an index exists
     Nested Loop with a LARGE OUTER input
        -> O(n) index lookups, catastrophic when n was estimated at
           100 and is actually a million
     Sort with "external merge Disk: 240MB"     <- spilled
     Hash with "Batches: 16" rather than 1      <- spilled
     a high "Rows Removed by Filter"
        -> read far more than it kept: a missing or unusable index
```

```text
STEP 3: THE LIKELY CAUSES, in order of frequency for a SUDDEN change

  1. STALE STATISTICS                      <- the most common by far
        the table grew or its distribution shifted, ANALYZE has not
        run recently enough, and the planner's estimate is now
        wrong, so it chose a plan suiting the OLD shape.
        THE FIX IS ONE COMMAND, and it resolves a startling
        proportion of these incidents.

  2. A PLAN FLIP
        the table crossed a cost threshold as it grew, so the
        optimiser switched from an index scan to a sequential scan,
        or from a hash join to a nested loop.
        the plan changed LEGITIMATELY; whether it changed CORRECTLY
        depends on the estimates.

  3. PARAMETER SNIFFING
        especially SQL Server: a cached plan compiled for an
        unrepresentative parameter value, now reused for everything

  4. DATA SKEW
        a specific parameter value now matches a huge number of
        rows, so it is slow FOR THAT VALUE ONLY

  5. BLOAT (PostgreSQL)
        accumulated dead tuples mean a scan reads far more pages
        than there are live rows

  6. AN INDEX WAS DROPPED, or became INVALID
        e.g. a failed CREATE INDEX CONCURRENTLY leaving it INVALID

  7. THE WORKING SET OUTGREW MEMORY
        what were buffer cache hits are now disk reads.
        BUFFERS reveals this immediately.

  8. LOCK CONTENTION
        which step 1 should already have caught
```

```sql
-- Checking causes 1, 5 and 6 directly
SELECT relname, n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) AS dead_pct,
       last_analyze, last_autoanalyze, last_autovacuum
FROM   pg_stat_user_tables
ORDER  BY n_dead_tup DESC;
--   last_analyze long ago       -> cause 1, stale statistics
--   dead_pct high               -> cause 5, bloat
--   autovacuum not keeping up   -> the REAL fix is tuning it

SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--   cause 6: an INVALID index, e.g. a failed CREATE INDEX
--   CONCURRENTLY. The planner will not use it.

ANALYZE orders;          -- try this FIRST, before anything clever
```

```sql
-- STEP 4: VERIFY SARGABILITY.
-- sargable = the predicate can SEEK an index, which needs the
-- indexed column BARE on one side.

-- A FUNCTION ON THE COLUMN
WHERE YEAR(created_at) = 2025;                  -- NOT sargable
WHERE created_at >= '2025-01-01'
  AND created_at <  '2026-01-01';               -- sargable

-- IMPLICIT TYPE CONVERSION: the insidious one, because nothing in
-- the SQL looks wrong
WHERE account_number = 12345;       -- account_number is VARCHAR
--   the engine casts THE COLUMN, which is a function on the column
--   by another name -> NOT sargable
WHERE account_number = '12345';     -- sargable

-- A LEADING WILDCARD
WHERE name LIKE '%smith';                       -- NOT sargable
WHERE name LIKE 'smith%';                       -- sargable (a range)

-- ARITHMETIC ON THE COLUMN
WHERE price * 1.2 > 100;                        -- NOT sargable
WHERE price > 100 / 1.2;                        -- sargable

-- OR ACROSS DIFFERENT COLUMNS
WHERE email = ? OR phone = ?;                   -- often unusable
SELECT ... WHERE email = ?
UNION ALL
SELECT ... WHERE phone = ? AND email IS DISTINCT FROM ?;  -- usable

-- and the fixes for what cannot be rewritten:
CREATE INDEX ON users (lower(email));           -- EXPRESSION index
CREATE INDEX ON users USING gin (name gin_trgm_ops);  -- TRIGRAM,
                                                -- for leading wildcards
```

```sql
-- STEP 5: OPTIMISE, in order of cost to implement

-- 1. UPDATE THE STATISTICS. Always first: everything else is
--    guesswork if the estimates are wrong.
ANALYZE orders;

-- 2. FIX SARGABILITY. A rewrite that makes an EXISTING index usable
--    is free and has no ongoing cost.

-- 3. ADD OR FIX AN INDEX, ordered by ESR, covering where a heap
--    fetch dominates. NOT FREE: paid on every write.
CREATE INDEX idx_orders ON orders (status, placed_at) INCLUDE (total);

-- 4. REWRITE THE QUERY
SELECT id, total FROM orders ...;      -- not SELECT *: enables
                                       -- index-only scans
-- replace OR with UNION ALL
-- replace a correlated subquery with a join
-- replace OFFSET pagination with KEYSET pagination:
SELECT * FROM orders WHERE (placed_at, id) < (:last_at, :last_id)
ORDER BY placed_at DESC, id DESC LIMIT 20;
--   OFFSET 100000 READS AND DISCARDS 100,000 ROWS. Keyset does not.

-- 5. IMPROVE THE ESTIMATES DIRECTLY
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
CREATE STATISTICS ord_corr (dependencies)
    ON status, customer_id FROM orders;
--   for CORRELATED columns, where the planner multiplies
--   selectivities that are not independent and badly
--   underestimates

-- 6. CHANGE THE PHYSICAL DESIGN, last resort:
--    a materialised view or summary table for a genuine
--    aggregation, or partitioning if the query always filters on a
--    partitionable key
```

```text
STEP 6: VERIFY AND GUARD

  RE-RUN EXPLAIN (ANALYZE, BUFFERS) and compare NODE BY NODE, not
     just total time: a faster run might simply be a WARM CACHE

  CHECK YOU HAVE NOT REGRESSED ANYTHING ELSE
     a new index costs EVERY WRITE, and a rewritten query may have
     been serving other callers

  RECORD THE BASELINE
     pg_stat_statements gives mean and total time per query, and an
     alert on the mean turns the next occurrence into a SIGNAL
     rather than a surprise

  FIX THE CAUSE, NOT THE INSTANCE
     if stale statistics caused it, the real fix is TUNING
     AUTOVACUUM FOR THAT TABLE, not running ANALYZE once
```

---

### What they ask next

**"What is the first thing you do?"**
Establish what changed, because "suddenly" is the most informative word in the report. Correlate with deploys, migrations, data loads and config changes, and check whether the query is executing or simply **waiting on a lock**, which is a completely different problem.

**"Why `EXPLAIN ANALYZE` rather than `EXPLAIN`?"**
Because plain `EXPLAIN` shows what the planner **intends**, and the planner's judgement is precisely what is in doubt. `ANALYZE` executes the query and reports real timings and real row counts, and `BUFFERS` additionally shows whether the data came from cache or disk.

**"What do you look at first in the plan?"**
Estimated rows against actual rows at every node. A large discrepancy means every decision above that node was made on wrong information, so the plan is correct for a table that no longer exists. Fixing the estimate usually fixes the plan.

**"What is the most common cause of a sudden regression?"**
Stale statistics. The table grew or its distribution shifted, autovacuum has not analysed it recently enough, and the planner's estimate is wrong. `ANALYZE` resolves a startling proportion of these, and the real fix afterwards is tuning autovacuum for that table.

**"What makes a predicate non-sargable?"**
Anything that stops the indexed column appearing bare on one side: a function on the column, arithmetic on it, an implicit type conversion that silently casts it, a leading wildcard, or an `OR` across different columns. The implicit cast is the insidious one, because nothing in the SQL looks wrong.

**"How do you handle a predicate you cannot rewrite?"**
An expression index matching the predicate exactly, such as `lower(email)`, or a trigram index for leading-wildcard searches. Both make an otherwise unusable predicate seekable, at the usual write cost.

**"What is wrong with `OFFSET` pagination?"**
The engine must read and discard every skipped row, so `OFFSET 100000` reads 100,000 rows to return 20, and it degrades linearly with page number. Keyset pagination, carrying the last row's sort key, is constant time.

**"When would you add an index as the fix?"**
After `ANALYZE` and after checking sargability, because both are free and an index is not. An index is paid on every insert, update and delete, adds WAL volume, and in PostgreSQL can disable HOT updates on the indexed column.

**The common wrong answer** is going straight to the query text and proposing rewrites. The word "suddenly" means **the query is not the new variable**, so the first job is to find what is, and the single most informative thing in the plan is the **estimated-against-actual row count**, which usually points at statistics rather than at anything you would change in the SQL.

---

### Say this in the interview

*"The most informative word in that report is suddenly, because it means the query is not the new variable. It worked yesterday, so my first job is to find what changed rather than to start rewriting.*

*So step one is to establish the facts. When exactly did it change, correlated with deploys, schema migrations, bulk loads, config changes and traffic patterns, since a clean step change points at a deploy while a gradual slide that crossed a threshold points at data growth. Is it every execution or only some, because if only certain parameter values are slow that is data skew or a parameter-sensitive plan rather than a bad query. Is the query slow or is it waiting, which people skip: I would check pg_stat_activity, and a wait_event_type of Lock means it is not slow at all, it is queued behind something else and is a victim rather than the cause. And is it the system, since CPU or I/O saturation, a failing replica or an exhausted pool makes everything slow, so one alert on one query is often a symptom.*

*Step two is to get the actual plan rather than the estimated one, with EXPLAIN ANALYZE, BUFFERS, VERBOSE. ANALYZE actually executes it and reports real timings and real row counts, where plain EXPLAIN shows only what the planner intends, which is the thing in doubt. BUFFERS shows real I/O, distinguishing shared hit from shared read, so a working set that no longer fits in memory shows up there and nowhere else.*

*And I would read the plan with one question first: compare estimated rows against actual rows at every node. That single comparison is the most informative thing in the output, because a node estimating a hundred rows and returning two million means the planner made every decision above it on wrong information. It chose a nested loop because it expected a handful of iterations. The plan is not stupid, it is correct for a table that no longer exists. Everything else is downstream: a sequential scan where an index exists, a nested loop with a large outer input, a sort spilling to disk, a hash with multiple batches, or a high rows-removed-by-filter meaning it read far more than it kept.*

*For a sudden regression the likely causes in order are: stale statistics, by far the most common, where the table grew or its distribution shifted and ANALYZE has not run recently enough, so the fix is one command and it resolves a startling proportion of these; a plan flip, where the table crossed a cost threshold as it grew; parameter sniffing, especially in SQL Server, where a cached plan was compiled for an unrepresentative value; data skew, where one parameter value now matches a huge number of rows; bloat, where dead tuples mean a scan reads far more pages than there are live rows; an index that was dropped or left invalid by a failed concurrent build; the working set outgrowing memory, which BUFFERS reveals; and lock contention, which step one should already have caught.*

*Step four is sargability. A predicate is sargable if it can seek an index, which needs the indexed column bare on one side. The killers are a function on the column, like YEAR of created_at; an implicit type conversion, such as comparing a varchar column to a number, which casts the column and is the insidious one because nothing in the SQL looks wrong; a leading wildcard in LIKE; arithmetic on the column; and OR across different columns. The fixes mirror them: rewrite as a range, fix the type, replace OR with UNION ALL, and where you cannot rewrite, build an expression index on lower of email or a trigram index for leading wildcards.*

*Then I optimise in order of cost to implement. ANALYZE first, always, because everything else is guesswork if the estimates are wrong. Then fix sargability, since a rewrite that makes an existing index usable is free. Then add or fix an index, ordered by ESR and covering with INCLUDE where a heap fetch dominates, remembering it is paid on every write. Then rewrite the query: specific columns rather than SELECT star to enable index-only scans, UNION ALL instead of OR, a join instead of a correlated subquery, and keyset pagination instead of OFFSET, because OFFSET a hundred thousand reads and discards a hundred thousand rows. Then improve the estimates directly, raising the statistics target on a skewed column or creating extended statistics where columns are correlated and the planner is multiplying selectivities that are not independent. And only as a last resort change the physical design, with a materialised view or partitioning.*

*Finally I verify and guard: re-run EXPLAIN ANALYZE and compare node by node rather than total time, since a faster run might just be a warm cache; check I have not regressed other queries, because a new index costs every write; record a baseline with pg_stat_statements so the next occurrence is a signal rather than a surprise; and fix the cause rather than the instance, so if stale statistics caused it, the real fix is tuning autovacuum for that table rather than running ANALYZE once."*
