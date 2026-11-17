---
id: 6-sql-query-execution-order
title: "SQL Query Execution Order"
description: "The clauses do not run in the order you wrote them, and almost every puzzling SQL error is explained by the order they do run in"

sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact execution order of a SQL query? Why does using a column alias defined in SELECT inside the WHERE clause fail, and where do window functions execute?"

---

### Picture it

SQL is written in an order designed to read like English, and evaluated in a completely different order designed to make sense.

You write **"tell me the names, from the staff list, of people earning over fifty thousand"**. You cannot actually do it in that order. You have to go and **get the staff list first**; there is nothing to filter until you have it, and no names to tell until you know who qualifies.

So the real sequence is: fetch the list, throw out the people who do not qualify, sort what remains into whatever groups were asked for, discard whole groups that do not qualify, **and only then work out what to display**.

That last step is where almost all the confusion lives. **Deciding what to show is nearly the last thing that happens.** So if you invent a name while deciding what to show, like "call salary times twelve the annual figure", you cannot filter on **the annual figure** earlier in the process, because at the moment of filtering you had not invented it yet. You can sort by it afterwards, because sorting genuinely does come last.

There is one more tenant in this building, and it has a very specific lease. Some calculations need to see **the finished, filtered, grouped set** before they can be computed at all: "where does this row rank among the rows that survived?" That cannot be answered while filtering, because the survivors are not known yet. So those calculations are placed with the display step, and the consequence is that **you cannot filter on them either**, for exactly the same reason, and you need a second pass around the whole query to do it.

---

### The proper terms

#### The logical processing order

SQL defines a **logical processing order** that determines the **semantics** of a query. Each step conceptually produces a **virtual table** that the next step consumes.

```text
 1. FROM          identify the source tables
 2. ON            evaluate the join predicates
 3. OUTER         add back the preserved, NULL-extended rows
 4. WHERE         filter individual rows
 5. GROUP BY      collapse rows into groups
 6. HAVING        filter groups
 7. SELECT        evaluate expressions, assign aliases
                  7a. non-window expressions
                  7b. window functions
 8. DISTINCT      remove duplicate rows
 9. ORDER BY      sort the result
10. LIMIT/OFFSET  take a slice
```

The two things to notice are that FROM comes first, not SELECT, and that **SELECT is step 7 of 10**, very near the end.

An important qualifier to state: this is the **logical** order, which fixes what a query **means**. The optimiser is free to execute any physically different plan that produces the same result, and it routinely does: pushing predicates down into an index scan, evaluating a `LIMIT` early to stop a sort, reordering joins. **Logical order defines semantics; the physical plan defines performance.** Confusing the two is a common mistake in the opposite direction.

#### Why a SELECT alias fails in WHERE

Because **`WHERE` is step 4 and `SELECT` is step 7**. The alias is **created** in step 7 and **used** in step 4, which is to say it is used three steps before it exists.

```sql
SELECT salary * 12 AS annual FROM staff WHERE annual > 600000;  -- ERROR
```

The error is not a limitation of the parser; it is the processing order being consistent. The same rule explains a whole family of errors:

**`WHERE` cannot use an alias**, because `SELECT` has not run.

**`WHERE` cannot use an aggregate**, because `GROUP BY` has not run, so no groups exist to aggregate over.

**`HAVING` cannot use an alias** in standard SQL, because it is step 6, still before `SELECT`.

**`ORDER BY` can use an alias**, because it is step 9, after `SELECT`. This is the one that proves the rule rather than breaking it.

**`GROUP BY` cannot use an alias** in standard SQL, for the same reason as `HAVING`.

The dialects differ in how strictly they enforce this. **MySQL and PostgreSQL permit an alias in `GROUP BY`**, and MySQL also permits one in `HAVING`, as deliberate non-standard extensions. **SQL Server and Oracle do not.** Relying on the extension is a portability risk worth naming.

The portable workaround is to **repeat the expression**, or to wrap the query in a **subquery or CTE** so that the alias is a real column of the inner result and the outer query can filter on it normally.

#### Where window functions execute

**Window functions** are evaluated in step 7b, as part of `SELECT`, **after `GROUP BY` and `HAVING`** and **before `DISTINCT` and `ORDER BY`**.

That single placement explains all of their behaviour.

**They can see aggregated values.** Because they run after grouping, `SUM(total) OVER (ORDER BY month)` in a grouped query operates on the grouped rows, which is why a running total over monthly aggregates works in one query.

**They cannot be used in `WHERE` or `HAVING`.** Both are earlier, so the window function does not exist yet. Attempting it is the most common window function error.

**They cannot be used in `GROUP BY`.** Same reason, and also circular: the window function is computed over the result of grouping.

**`DISTINCT` cannot remove rows before them.** `DISTINCT` is step 8, so `ROW_NUMBER()` has already been assigned to every row including the duplicates, and the numbering reflects the pre-deduplication set.

**`ORDER BY` can reference them**, since it is step 9.

To filter on a window function you need **another level of query**: a subquery or a CTE, so the window value becomes an ordinary column that the outer `WHERE` can filter. This pattern is so common that some dialects added a dedicated clause, **QUALIFY**, which filters on window functions the way `HAVING` filters on aggregates. It exists in Snowflake, Teradata, BigQuery and DuckDB, and is absent from PostgreSQL, MySQL, SQL Server and Oracle.

Note the distinction worth drawing out: an **aggregate collapses many rows into one**, while a **window function keeps every row** and adds a value computed over a set of related rows, the **window**. That is why they live at different steps and are filtered in different places.

---

### In code

```sql
-- Written in this order:
SELECT   branch, SUM(amount) AS total
FROM     sales
WHERE    year = 2025
GROUP BY branch
HAVING   SUM(amount) > 100000
ORDER BY total DESC
LIMIT    10;

-- Evaluated in this order:
--  1. FROM sales
--  4. WHERE year = 2025          rows filtered
--  5. GROUP BY branch            groups formed, aggregates now exist
--  6. HAVING SUM(amount) > ...   groups filtered
--  7. SELECT branch, SUM(...)    expressions evaluated, alias "total" born
--  9. ORDER BY total DESC        the alias is usable HERE
-- 10. LIMIT 10
```

```sql
-- The alias family of errors, all from one cause
SELECT salary * 12 AS annual FROM staff WHERE annual > 600000;
-- ERROR: WHERE is step 4, the alias is created at step 7

SELECT salary * 12 AS annual FROM staff ORDER BY annual;
-- WORKS: ORDER BY is step 9, after SELECT

SELECT branch, SUM(amount) FROM sales WHERE SUM(amount) > 100;
-- ERROR: WHERE is step 4, GROUP BY is step 5, so no groups exist yet

SELECT dept, COUNT(*) AS n FROM staff GROUP BY dept HAVING n > 5;
-- WORKS in MySQL, ERROR in SQL Server and Oracle:
-- HAVING is step 6, still before SELECT. MySQL allows it as an extension.

-- The portable fixes
SELECT salary * 12 AS annual FROM staff WHERE salary * 12 > 600000;  -- repeat it
SELECT * FROM (SELECT salary * 12 AS annual FROM staff) t
WHERE  t.annual > 600000;                                            -- or wrap it
```

```sql
-- Window functions: computed at 7b, so they cannot be filtered in place
SELECT customer_id,
       amount,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rn
FROM   orders
WHERE  rn = 1;        -- ERROR: WHERE is step 4, rn is created at step 7b

-- The fix: another level of query, so rn becomes an ordinary column
WITH ranked AS (
    SELECT customer_id, amount,
           ROW_NUMBER() OVER (PARTITION BY customer_id
                              ORDER BY amount DESC) AS rn
    FROM   orders
)
SELECT customer_id, amount
FROM   ranked
WHERE  rn = 1;        -- each customer's largest order

-- Snowflake, Teradata, BigQuery and DuckDB have a dedicated clause:
--   SELECT ... QUALIFY ROW_NUMBER() OVER (...) = 1
-- Postgres, MySQL, SQL Server and Oracle do not.
```

```text
Why window functions see aggregates but aggregates cannot see windows:

  step 5  GROUP BY     ----> aggregates come into existence
  step 6  HAVING             can filter aggregates
  step 7b WINDOW FUNCTIONS -> run on the ALREADY GROUPED rows
                              so SUM(total) OVER (ORDER BY month)
                              is a running total of monthly sums
  step 8  DISTINCT           runs AFTER, so ROW_NUMBER() has already
                             numbered the duplicates
  step 9  ORDER BY           can reference window results

  aggregate       = collapses many rows into one
  window function = keeps every row, adds a value over a related set

  That is the whole reason they sit at different steps and are
  filtered in different places.
```

---

### What they ask next

**"Why does ORDER BY accept an alias when WHERE does not?"**
Because `ORDER BY` is step 9 and `WHERE` is step 4, with `SELECT` at step 7 in between. The alias exists by the time sorting happens and does not exist when filtering happens.

**"Is this the order the database actually executes in?"**
No. It is the **logical** order defining what the query means. The optimiser produces any physically equivalent plan it likes, pushing filters into index scans, reordering joins, or stopping a sort early because of a `LIMIT`. Logical order explains errors and semantics; the execution plan explains performance.

**"Where does DISTINCT run, and why does it matter?"**
Step 8, after `SELECT` and after window functions. So `SELECT DISTINCT ... ROW_NUMBER() OVER (...)` numbers rows **before** deduplication, and because the row number is itself part of the row, the deduplication then usually removes nothing at all. This surprises people regularly.

**"Can you use a window function in GROUP BY?"**
No. It is computed after grouping, so using it to define the grouping is circular as well as out of order. You need a subquery or CTE.

**"Where does LIMIT sit, and what is the catch?"**
Step 10, last. So `LIMIT` cannot reduce the work done by `WHERE`, `GROUP BY` or `ORDER BY` logically, although physically the optimiser often can stop a sort early. The catch is that `LIMIT` without `ORDER BY` returns an arbitrary set of rows, since nothing has defined which rows are first.

**"What is QUALIFY?"**
A clause that filters on window functions, standing in the same relation to them as `HAVING` does to aggregates. Available in Snowflake, Teradata, BigQuery and DuckDB; elsewhere you wrap the query in a CTE instead.

**The common wrong answer** is reciting the ten steps without connecting them to anything. The reason this question is asked is that the order is the **single explanation** for a whole family of errors, so the valuable answer names the step numbers and then uses them to explain why the alias fails, why aggregates cannot go in `WHERE`, and why window functions need a subquery.

---

### Say this in the interview

*"SQL has a logical processing order where each step produces a virtual table for the next. It is: FROM, then ON, then the OUTER step that adds back preserved NULL-extended rows, then WHERE, GROUP BY, HAVING, then SELECT, which evaluates expressions and assigns aliases, with window functions evaluated inside SELECT after the ordinary expressions, then DISTINCT, ORDER BY and finally LIMIT or OFFSET. The two surprises are that FROM comes first rather than SELECT, and that SELECT is step 7 of 10, very near the end.*

*I would add the qualifier that this is the logical order, which fixes what a query means. The optimiser can run any physically equivalent plan, pushing predicates into index scans or stopping a sort early for a LIMIT, so logical order explains semantics and the execution plan explains performance.*

*A SELECT alias fails in WHERE because WHERE is step 4 and SELECT is step 7, so the alias is used three steps before it is created. The same rule explains the whole family: WHERE cannot use an aggregate because GROUP BY has not run yet so no groups exist; HAVING cannot use an alias in standard SQL because it is step 6, still before SELECT; and ORDER BY can use an alias because it is step 9, after SELECT, which is the case that proves the rule. Dialects differ, since MySQL and PostgreSQL allow an alias in GROUP BY and MySQL also allows one in HAVING as non-standard extensions, while SQL Server and Oracle do not. The portable fix is to repeat the expression or wrap the query in a subquery or CTE so the alias becomes a real column.*

*Window functions are evaluated inside SELECT, after GROUP BY and HAVING and before DISTINCT and ORDER BY. That placement explains everything about them. They can see aggregated values, so a running total over monthly sums works in a single grouped query. They cannot be used in WHERE or HAVING because both are earlier, which is the most common window function error. They cannot be used in GROUP BY, which would be circular as well as out of order. DISTINCT runs after them, so ROW_NUMBER has already numbered the duplicates and the deduplication usually removes nothing. And ORDER BY can reference them because it is later.*

*To filter on a window function you need another level of query, a subquery or CTE, so the window value becomes an ordinary column for the outer WHERE. Some dialects added QUALIFY for exactly this, standing to window functions as HAVING stands to aggregates, and it exists in Snowflake, Teradata, BigQuery and DuckDB but not in PostgreSQL, MySQL, SQL Server or Oracle. The underlying distinction is that an aggregate collapses many rows into one while a window function keeps every row and adds a value computed over a window of related rows, which is why they sit at different steps and are filtered in different places."*
