---
id: 4-where-vs-having
title: "WHERE vs. HAVING: Row Filtering vs. Group Filtering"
description: "One filter runs before the rows are grouped and one after, which is also the difference between fast and slow"

sidebar_position: 4
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between WHERE and HAVING in SQL? Why can't aggregate functions be used in a WHERE clause, and what is the severe performance penalty of placing non-aggregate filters in HAVING?"

---

### Picture it

You have a shoebox of ten thousand shop receipts and you want to know which branches took more than a lakh last year.

**The sensible method.** Go through the box once and throw out everything not from last year. Now sort what remains into piles, one per branch. Add up each pile. Keep the piles over a lakh.

Two filters, and notice they are different in kind. The first one looks at **one receipt at a time** and asks a question a single receipt can answer: "is this from last year?" The second one looks at **a whole pile** and asks a question only a pile can answer: "does this add up to more than a lakh?"

**Now the mistake.** Suppose you want only the Mumbai branches. "Is this receipt from Mumbai?" is clearly a single-receipt question, so it belongs in the first pass. But imagine doing it in the second pass instead: you sort **all ten thousand receipts** into piles for every branch in the country, add up every pile, and then throw away all the piles that are not Mumbai.

You got the right answer. You also sorted and totalled nine thousand receipts whose totals you then binned. The work was not wrong, it was **wasted**, and the waste grows with the size of the box.

**And the question that confuses people.** Why can you not ask "does this pile total more than a lakh?" during the first pass? Because during the first pass **there are no piles yet**. You are holding one receipt. The total you want to compare against does not exist, not because SQL forbids it, but because the thing has not been built.

---

### The proper terms

#### WHERE

**WHERE** filters **individual rows** and runs **before grouping**. Its predicates may reference columns of the underlying tables, and it is evaluated once per row.

Because it runs first, it reduces the number of rows that every later stage has to handle. That makes it the place where **indexes are used**: a **sargable** predicate on an indexed column lets the engine seek rather than scan, so the rows are never even read.

#### HAVING

**HAVING** filters **groups** and runs **after `GROUP BY` and aggregation**. Its predicates may reference **aggregate functions** and the **grouping columns**.

It is the only place a condition on an aggregate can go, because it is the first stage at which aggregates exist.

With no `GROUP BY` at all, `HAVING` treats the entire result as a single group, so `HAVING COUNT(*) > 100` on an ungrouped query asks whether the whole table has more than a hundred rows.

#### Why aggregates cannot appear in WHERE

Not an arbitrary restriction. It follows from the **logical processing order** of a SELECT statement:

```text
FROM -> ON -> JOIN -> WHERE -> GROUP BY -> HAVING
     -> SELECT -> DISTINCT -> ORDER BY -> LIMIT
```

`WHERE` is evaluated **before `GROUP BY`**. At that moment the engine is examining **one row in isolation**, and no groups have been formed, so `SUM(amount)` has nothing to sum over. The value the predicate refers to does not yet exist.

This is the same reason a `SELECT` alias cannot be used in `WHERE`: `SELECT` is also evaluated later.

So the rule reduces to a question about scope. `WHERE` sees a row, `HAVING` sees a group. Ask each one only what it can see.

If you genuinely need to filter rows by an aggregate, you compute the aggregate in a **subquery** or **CTE** and filter the result, or you use a **window function**, which is evaluated after grouping and can then be filtered in an outer query.

#### The performance penalty of filtering rows in HAVING

Both of these return the same answer:

```sql
-- correct and fast
SELECT branch, SUM(amount) FROM sales
WHERE  city = 'Mumbai'
GROUP BY branch HAVING SUM(amount) > 100000;

-- correct and slow
SELECT branch, SUM(amount) FROM sales
GROUP BY branch, city
HAVING city = 'Mumbai' AND SUM(amount) > 100000;
```

The second pays on every stage:

**No index can be used for the filter.** `WHERE city = 'Mumbai'` can drive an index seek on an index over `city`. The same condition in `HAVING` is applied after grouping, by which time the rows have already been read, so the index is useless and the plan becomes a **full scan**.

**Every row is read and materialised**, including the ones destined to be discarded. On a billion-row table that is the dominant cost.

**Every row is sorted or hashed for grouping.** Grouping is implemented as a **sort** or a **hash aggregate**, and both cost roughly in proportion to the input size. Grouping ten million rows to keep the results from ten thousand is ten million rows of sorting or hashing.

**Memory and spilling.** A hash aggregate over the full table needs a far larger hash table, and when it exceeds the memory limit it spills to disk, turning an in-memory operation into a disk-bound one. This is where the slowdown goes from a factor of two to a factor of fifty.

**The grouping key is forced to be wider.** To reference `city` in `HAVING` you must add it to `GROUP BY`, which changes the grouping and produces more, smaller groups, so more work and a different intermediate result.

The honest nuance, and worth saying because it shows you have looked at plans: modern optimisers often rescue you. PostgreSQL and SQL Server will **push a non-aggregate `HAVING` predicate down into `WHERE`** when they can prove it is safe. But the pushdown is not guaranteed, and it is commonly blocked by **window functions**, `DISTINCT`, outer joins where it would change semantics, or expressions the planner cannot prove safe. Relying on it means your query's performance depends on an optimisation you did not ask for.

The rule to state: **filter rows in `WHERE`, filter aggregates in `HAVING`**. Push every predicate as early as it can legally go.

---

### In code

```sql
-- The clean division of labour
SELECT   branch,
         SUM(amount) AS total
FROM     sales
WHERE    sale_date >= '2025-01-01'     -- per ROW: a row can answer this
  AND    city = 'Mumbai'               -- per ROW: so it belongs here
GROUP BY branch
HAVING   SUM(amount) > 100000          -- per GROUP: only a group can answer
ORDER BY total DESC;
```

```sql
-- Why this is rejected, and it is not arbitrary
SELECT branch, SUM(amount)
FROM   sales
WHERE  SUM(amount) > 100000            -- ERROR
GROUP BY branch;

-- WHERE runs BEFORE GROUP BY. At that moment the engine holds ONE row
-- and no groups exist, so there is nothing for SUM to sum over.
-- Same reason this fails too:
SELECT amount * 2 AS doubled FROM sales WHERE doubled > 100;  -- ERROR
-- SELECT is evaluated after WHERE, so the alias does not exist yet.
```

```text
The logical processing order, which explains every one of these errors:

  1. FROM        pick the tables
  2. ON / JOIN   combine them
  3. WHERE       filter ROWS            <- aggregates do not exist yet
  4. GROUP BY    form the groups        <- aggregates come into existence
  5. HAVING      filter GROUPS          <- aggregates usable here
  6. SELECT      evaluate expressions   <- aliases come into existence
  7. DISTINCT    remove duplicates
  8. ORDER BY    sort                   <- aliases usable here
  9. LIMIT       take the top n

  Read any "why can't I use X in Y" question off this list:
  if X is created at a later step than Y, you cannot.
```

```text
What the slow version actually costs, on 10 million rows
where 10 thousand are Mumbai:

  FILTER IN WHERE
    index seek on city          -> 10,000 rows read
    hash aggregate on 10,000    -> small hash table, fits in memory
    filter the groups           -> a handful discarded
    total: thousands of rows touched

  FILTER IN HAVING
    full table scan             -> 10,000,000 rows read     (no index)
    hash aggregate on 10,000,000 -> large hash table, may SPILL TO DISK
    group by (branch, city)      -> wider key, more groups
    filter the groups            -> ~99.9% of them discarded
    total: millions of rows touched and aggregated, then binned

  Same answer. The work on 9,990,000 rows was pure waste, and the
  spill is where the slowdown stops being a factor of two.

  Caveat worth saying: Postgres and SQL Server often PUSH a
  non-aggregate HAVING predicate down into WHERE for you. It is not
  guaranteed, and window functions, DISTINCT or outer joins can block
  it, so do not design around a rescue you did not ask for.
```

```sql
-- If you really must filter rows by an aggregate: do it in two stages
WITH branch_totals AS (
    SELECT branch, SUM(amount) AS total
    FROM   sales
    GROUP BY branch
)
SELECT s.*
FROM   sales s
JOIN   branch_totals b ON b.branch = s.branch
WHERE  b.total > 100000;      -- now it is an ordinary column, so WHERE is fine
```

---

### What they ask next

**"Can HAVING be used without GROUP BY?"**
Yes. The whole result set is then treated as one group, so `HAVING COUNT(*) > 100` asks a question about the entire table. It is legal and occasionally useful, though a scalar subquery usually reads better.

**"Can WHERE reference a column alias from SELECT?"**
No, for the same reason aggregates are not allowed: `SELECT` is evaluated after `WHERE`, so the alias does not exist yet. `ORDER BY` runs after `SELECT`, which is why aliases work there.

**"Where do window functions fit?"**
They are evaluated after `GROUP BY` and `HAVING` but before `DISTINCT` and `ORDER BY`, so they can see aggregated values, and they cannot be filtered in `HAVING` either. Filtering on a window function needs a subquery or CTE around it, which is exactly what `QUALIFY` does in the dialects that have it.

**"Is HAVING always slower?"**
No. Filtering an **aggregate** in HAVING is the only option and costs nothing extra. The penalty is specific to putting a **row-level** predicate there, where it does the same work far later and loses index access.

**"Why does a wider GROUP BY cost more?"**
Because the grouping key is hashed or sorted, so more columns mean larger keys and more distinct groups, which means a bigger hash table or a more expensive sort, and more rows in the intermediate result.

**"What does sargable mean?"**
That a predicate can be used to seek an index, which requires the indexed column to appear unwrapped on one side. `WHERE created_at >= '2025-01-01'` is sargable; `WHERE YEAR(created_at) = 2025` usually is not, because the function hides the column from the index.

**The common wrong answer** is "WHERE is for columns and HAVING is for aggregates", which gets the usage right by accident and the reason wrong. The real statement is about **when each one runs**: `WHERE` filters rows before groups exist, `HAVING` filters groups after they are built, and the entire performance story follows from that ordering.

---

### Say this in the interview

*"WHERE filters individual rows and runs before grouping, so its predicates reference table columns and it is evaluated once per row. Because it runs first it reduces the input to every later stage, and it is the place indexes are used, since a sargable predicate on an indexed column lets the engine seek rather than scan.*

*HAVING filters groups and runs after GROUP BY and aggregation, so its predicates can reference aggregate functions and the grouping columns. It is the only place a condition on an aggregate can go. With no GROUP BY it treats the whole result as a single group, so HAVING COUNT(*) greater than 100 asks about the entire table.*

*Aggregates cannot appear in WHERE because of the logical processing order: FROM, then ON and JOIN, then WHERE, then GROUP BY, then HAVING, then SELECT, DISTINCT, ORDER BY and LIMIT. WHERE is evaluated before GROUP BY, so at that point the engine holds one row in isolation and no groups have been formed, which means SUM has nothing to sum over. The value simply does not exist yet. It is the same reason a SELECT alias cannot be used in WHERE, since SELECT is evaluated later, while ORDER BY runs after SELECT so aliases work there. If you need to filter rows by an aggregate you compute it in a subquery, a CTE or a window function and filter outside.*

*The penalty for putting a row-level filter in HAVING is that it pays on every stage. No index can be used, because the predicate is applied after the rows have already been read, so the plan becomes a full scan. Every row is read and materialised including the ones that will be discarded. Every row is sorted or hashed for grouping, since grouping is a sort or a hash aggregate and both scale with input size. The hash table is far larger and may spill to disk, which is where the slowdown goes from a factor of two to a factor of fifty. And referencing the column in HAVING forces you to add it to GROUP BY, which widens the grouping key and produces more, smaller groups. So filtering ten million rows down to ten thousand in HAVING means aggregating ten million rows to throw almost all of it away.*

*The honest nuance is that PostgreSQL and SQL Server often push a non-aggregate HAVING predicate down into WHERE when they can prove it is safe, but that is not guaranteed and is commonly blocked by window functions, DISTINCT or outer joins where it would change the semantics. So I would not design around it. The rule is to filter rows in WHERE, filter aggregates in HAVING, and push every predicate as early as it can legally go."*
