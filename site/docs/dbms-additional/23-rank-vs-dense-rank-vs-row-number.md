---
id: 23-rank-vs-dense-rank-vs-row-number
title: "ROW_NUMBER vs RANK vs DENSE_RANK"
description: "Three ways to number rows, separated entirely by what they do when two rows are equal"

sidebar_position: 23
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()` in SQL? How does each handle duplicate ties, why can't window functions be filtered in a `WHERE` clause, and how do you find the top 2 highest earners per department?"

---

### Picture it

A race where two runners finish at **exactly the same time**.

Three different officials are asked to write down the finishing positions, and they disagree.

**The first official refuses to accept a tie at all.** Somebody has to be second and somebody has to be third, so he picks one, arbitrarily, and writes 1, 2, 3, 4. His list is tidy, every number is used once, and if you ask him **why** that runner got second rather than third, he has no answer.

**The second official is the Olympic judge.** Two gold medals are awarded, so both runners are **first**. And because two people have taken the first two places, **there is no silver**: the next runner is **third**. His list reads 1, 1, 3, 4, with a deliberate gap.

**The third official is listing distinct times**, not positions. Two runners share the fastest time, so that is **time band one**. The next runner has the second fastest time, so that is **time band two**. No gap, because he is numbering **values**, not runners. His list reads 1, 1, 2, 3.

All three are correct. They answer **different questions**, and the question decides which official you want.

And one practical point about all of them: **none of them can tell you anything until the whole race is finished**. A position is defined relative to everybody else, so you cannot filter runners by position **while** they are still running. You have to let them all finish, write the positions down, and only **then** throw away the ones you do not want.

---

### The proper terms

#### The three functions

All three are **window functions** that assign a number to each row **within a partition**, ordered by the `ORDER BY` inside the `OVER` clause. They differ **only** in how they treat rows that are equal under that ordering.

**`ROW_NUMBER()`** assigns a unique, consecutive number to every row: `1, 2, 3, 4`. Ties are **broken arbitrarily**, and the choice is **non-deterministic** unless the `ORDER BY` contains enough columns to make it unique.

**`RANK()`** gives tied rows the **same** number and then **skips**: `1, 1, 3, 4`. The next rank is the row's **position**, so the numbers it emits are "how many rows are strictly ahead of this one, plus one".

**`DENSE_RANK()`** gives tied rows the same number and **does not skip**: `1, 1, 2, 3`. It numbers **distinct values**, not rows.

The memory aid: **`RANK` leaves gaps, `DENSE_RANK` is dense.**

#### Choosing between them

The choice follows directly from the question being asked:

**"Give me exactly N rows per group."** `ROW_NUMBER`. It is the only one that guarantees a count, because it never ties.

**"Give me the top N positions, including everyone tied at them."** `RANK`. Two runners on gold means `RANK <= 2` returns both, and no silver.

**"Give me the top N distinct values."** `DENSE_RANK`. This is almost always what "top 2 salaries" means in plain English.

The non-determinism of `ROW_NUMBER` is worth one extra sentence, because it causes real bugs: with `ORDER BY salary DESC` and two employees on the same salary, **which one gets row 1 can change between executions**, between plans, and between replicas. If the result must be stable, add a **tie-breaker** such as `ORDER BY salary DESC, employee_id`.

#### Why you cannot filter them in `WHERE`

Because of the **logical processing order**:

```text
FROM -> ON -> JOIN -> WHERE -> GROUP BY -> HAVING
     -> SELECT (expressions, then WINDOW FUNCTIONS)
     -> DISTINCT -> ORDER BY -> LIMIT
```

`WHERE` is evaluated **before** `SELECT`, and window functions are evaluated **inside** `SELECT`, after the ordinary expressions. So at the moment `WHERE` runs, **the window function's value does not exist yet**.

This is not an arbitrary restriction; it is forced by what a window function **means**. A rank is defined **relative to the set of rows in the window**, so the set must be **finalised** before any rank can be computed. If `WHERE` could filter on a rank, filtering would change the set, which would change the ranks, which would change what the filter matches. The ordering of the steps is what makes the definition well-founded.

The same reasoning excludes `HAVING`, which is also earlier, and `GROUP BY`, where it would be circular as well as out of order.

So you need **another level of query**: a subquery or a **CTE**, which turns the window value into an ordinary column that the outer `WHERE` can filter. Some dialects provide **`QUALIFY`** for exactly this, standing to window functions as `HAVING` stands to aggregates. It exists in **Snowflake, Teradata, BigQuery and DuckDB**, and not in PostgreSQL, MySQL, SQL Server or Oracle.

What **can** reference them is `ORDER BY`, since it runs later.

#### Top 2 per department

The canonical use, and the shape to have ready:

```sql
WITH ranked AS (
    SELECT name, department_id, salary,
           DENSE_RANK() OVER (PARTITION BY department_id
                              ORDER BY salary DESC) AS rnk
    FROM   employees
)
SELECT name, department_id, salary
FROM   ranked
WHERE  rnk <= 2
ORDER  BY department_id, salary DESC;
```

Two things are doing the work:

**`PARTITION BY department_id`** restarts the numbering for each department, so the ranks are **per group** rather than global. Without it the whole result is a single partition and you would get the top 2 overall.

**The CTE** makes `rnk` an ordinary column of `ranked`, so the outer `WHERE` can filter it.

And the function choice changes the answer, which is the point worth making:

**`DENSE_RANK <= 2`** returns everyone earning either of the **top two distinct salaries** in their department, which may be more than two people.

**`RANK <= 2`** returns everyone at positions 1 and 2, so if three people tie for first you get all three and nobody at position 2, because there is no rank 2.

**`ROW_NUMBER <= 2`** returns exactly two rows per department, picking arbitrarily among ties.

#### Performance

A window function needs its input **sorted by the partition keys and then the order keys**, so the plan is normally a `Sort` followed by a `WindowAgg`.

That sort can be eliminated entirely by an index whose columns match: `(department_id, salary DESC)` delivers rows already grouped by department and ordered by salary within each, so the engine reads the index and computes ranks in one pass. On a large table that is the difference between an external sort and a streaming scan.

Two related notes:

**The frame clause does not apply** to these three. `ROWS BETWEEN ...` is meaningful for aggregate window functions such as a running `SUM`, and the ranking functions ignore it, since a rank is defined over the whole partition.

**The relatives are worth naming**: `NTILE(n)` divides the partition into n buckets, `PERCENT_RANK` and `CUME_DIST` give relative position as a fraction, and `LAG` and `LEAD` reach other rows in the partition, which together cover most analytical requirements without a self-join.

---

### In code

```sql
-- All three on the same data, so the difference is visible
SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM   employees;
```

```text
  name     salary   ROW_NUMBER   RANK   DENSE_RANK
  arun     100000        1         1        1
  bela     100000        2         1        1       <- TIED
  chitra    90000        3         3        2
  dev       85000        4         4        3
  esha      85000        5         4        3       <- TIED
  farid     80000        6         6        4

  ROW_NUMBER   unique and consecutive: 1,2,3,4,5,6
               ties BROKEN ARBITRARILY, and NON-DETERMINISTICALLY
  RANK         ties share, then SKIPS:  1,1,3,4,4,6
               the number is "rows strictly ahead, plus one"
  DENSE_RANK   ties share, NO skip:     1,1,2,3,3,4
               it numbers DISTINCT VALUES, not rows

  memory aid: RANK leaves gaps, DENSE_RANK is dense.
```

```text
Choosing, which follows from the question being asked:

  "exactly N rows per group"                    -> ROW_NUMBER
      the only one that GUARANTEES a count, because it never ties

  "the top N positions, including everyone
   tied at them"                                -> RANK
      two on gold means RANK <= 2 returns BOTH, and no silver

  "the top N DISTINCT values"                   -> DENSE_RANK
      almost always what "top 2 salaries" means in plain English

  and one caution about ROW_NUMBER: with ORDER BY salary DESC and
  two employees on the same salary, WHICH ONE GETS ROW 1 CAN CHANGE
  between executions, between plans, and between replicas.
  If the result must be stable, add a TIE-BREAKER:
      ORDER BY salary DESC, employee_id
```

```sql
-- WHY YOU CANNOT FILTER THEM IN WHERE
SELECT name, salary,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
FROM   employees
WHERE  rnk <= 2;              -- ERROR: column "rnk" does not exist
```

```text
The logical processing order explains it:

   FROM -> ON -> JOIN -> WHERE -> GROUP BY -> HAVING
        -> SELECT   (expressions, THEN window functions)
        -> DISTINCT -> ORDER BY -> LIMIT

  WHERE is evaluated BEFORE SELECT, and window functions are
  evaluated INSIDE SELECT, so at the moment WHERE runs THE VALUE
  DOES NOT EXIST YET.

  and this is not arbitrary. It is forced by what a window function
  MEANS: a rank is defined RELATIVE TO THE SET OF ROWS IN THE WINDOW,
  so the set must be FINALISED before any rank can be computed.

     if WHERE could filter on a rank:
        filtering changes the set
        -> which changes the ranks
        -> which changes what the filter matches
        -> which changes the set ...

  the ordering of the steps is what makes the definition
  well-founded.

  the same reasoning excludes HAVING, which is also earlier, and
  GROUP BY, where it would be circular as well as out of order.
  ORDER BY CAN reference them, because it runs later.
```

```sql
-- THE FIX: another level of query, so rnk becomes an ordinary column
WITH ranked AS (
    SELECT name, salary,
           DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM   employees
)
SELECT name, salary FROM ranked WHERE rnk <= 2;

-- some dialects have QUALIFY, which stands to window functions as
-- HAVING stands to aggregates:
SELECT name, salary
FROM   employees
QUALIFY DENSE_RANK() OVER (ORDER BY salary DESC) <= 2;
--   Snowflake, Teradata, BigQuery, DuckDB
--   NOT in PostgreSQL, MySQL, SQL Server or Oracle
```

```sql
-- TOP 2 PER DEPARTMENT: the canonical use
WITH ranked AS (
    SELECT name, department_id, salary,
           DENSE_RANK() OVER (PARTITION BY department_id
                              ORDER BY salary DESC) AS rnk
    --                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    --                 restarts the numbering FOR EACH DEPARTMENT.
    --                 without it the whole result is ONE partition
    --                 and you get the top 2 OVERALL.
    FROM   employees
)
SELECT name, department_id, salary
FROM   ranked
WHERE  rnk <= 2
ORDER  BY department_id, salary DESC;
```

```text
And the function choice CHANGES THE ANSWER, which is the point:

  department 5:  arun 100k, bela 100k, chitra 90k, dev 85k

  DENSE_RANK <= 2   arun, bela, chitra
                    everyone on either of the TOP TWO DISTINCT
                    SALARIES. THREE people, which is usually what
                    "top 2 salaries" means.

  RANK <= 2         arun, bela
                    positions 1 and 2. Both tie at rank 1, and there
                    IS NO RANK 2, so chitra (rank 3) is excluded.

  ROW_NUMBER <= 2   arun, bela
                    EXACTLY two rows, picking arbitrarily among ties.
                    If chitra had also earned 100k, you would still
                    get exactly two, chosen non-deterministically.
```

```sql
-- PERFORMANCE: the sort is the cost, and an index can remove it
EXPLAIN ANALYZE
SELECT name, DENSE_RANK() OVER (PARTITION BY department_id
                                ORDER BY salary DESC)
FROM employees;
--   WindowAgg
--     -> Sort  (key: department_id, salary DESC)      <- the cost
--          -> Seq Scan on employees

CREATE INDEX idx ON employees (department_id, salary DESC);
--   WindowAgg
--     -> Index Scan using idx on employees            <- NO SORT
--   the index delivers rows already grouped by department and
--   ordered by salary within each, so the engine computes ranks in
--   ONE STREAMING PASS. On a large table that is the difference
--   between an external sort and a scan.
```

```text
Two related notes:

  THE FRAME CLAUSE DOES NOT APPLY to these three.
     ROWS BETWEEN ... is meaningful for AGGREGATE window functions
     such as a running SUM, and the ranking functions IGNORE it,
     since a rank is defined over the WHOLE PARTITION.

  THE RELATIVES, worth naming:
     NTILE(n)       divides the partition into n buckets
     PERCENT_RANK   relative position as a fraction, 0 to 1
     CUME_DIST      cumulative distribution
     LAG / LEAD     reach the previous / next row in the partition

     together these cover most analytical requirements WITHOUT a
     self-join, which is the usual thing they replace.
```

---

### What they ask next

**"What is the difference in one sentence?"**
`ROW_NUMBER` never ties, `RANK` ties and skips the next numbers, `DENSE_RANK` ties and does not skip. They are identical when there are no duplicates in the ordering.

**"Which do you use for the top 2 salaries in a department?"**
`DENSE_RANK`, because "top 2 salaries" almost always means the two highest **distinct** values, and everyone earning them should be returned. `ROW_NUMBER` would give exactly two rows and `RANK` would exclude anyone at position 3 even when there is no position 2.

**"Is `ROW_NUMBER` deterministic?"**
Only if the `ORDER BY` is unique. With ties, the assignment is arbitrary and can change between executions, plans and replicas, so add a tie-breaking column whenever the result must be stable.

**"Why can a window function not be used in `WHERE`?"**
Because `WHERE` runs before `SELECT` and window functions are evaluated inside `SELECT`. More fundamentally, a rank is defined relative to the window's row set, so the set must be finalised first; filtering on a rank would change the set, which would change the ranks, which would be circular.

**"How do you filter on one, then?"**
Wrap the query in a CTE or subquery so the window value becomes an ordinary column, or use `QUALIFY` in Snowflake, Teradata, BigQuery or DuckDB. `ORDER BY` can reference them directly, because it runs after `SELECT`.

**"What does `PARTITION BY` do?"**
Restarts the window for each group, so ranks are computed independently per partition. Without it the entire result set is one partition, which turns "top 2 per department" into "top 2 overall".

**"How do you make a ranking query fast?"**
Give it an index matching the partition and order columns, such as `(department_id, salary DESC)`. The plan then reads the index in order and streams through the window computation with no sort node at all.

**"Does the frame clause affect ranking functions?"**
No. A rank is defined over the whole partition, so `ROWS BETWEEN` is ignored. Frames matter for aggregate window functions such as running totals and moving averages.

**The common wrong answer** is listing the three outputs without connecting them to a question. The useful framing is that the choice is decided by what you are asking for: **exactly N rows** means `ROW_NUMBER`, **the top N positions including ties** means `RANK`, and **the top N distinct values** means `DENSE_RANK`. Plus the reason the filter must move outward, which is that a rank cannot be computed until the row set is final.

---

### Say this in the interview

*"All three are window functions that assign a number to each row within a partition, ordered by the ORDER BY inside the OVER clause, and they differ only in how they treat rows that are equal under that ordering. ROW_NUMBER assigns a unique consecutive number to every row, so ties are broken arbitrarily and non-deterministically. RANK gives tied rows the same number and then skips, so one, one, three, four, because the number is how many rows are strictly ahead plus one. DENSE_RANK gives tied rows the same number and does not skip, so one, one, two, three, because it numbers distinct values rather than rows. The memory aid is that RANK leaves gaps and DENSE_RANK is dense.*

*The choice follows from the question. If you want exactly N rows per group, ROW_NUMBER, because it is the only one that guarantees a count. If you want the top N positions including everyone tied at them, RANK, since two runners on gold means rank two returns both and there is no silver. If you want the top N distinct values, DENSE_RANK, which is almost always what top two salaries means in plain English. One caution about ROW_NUMBER: with ties, which row gets number one can change between executions, plans and replicas, so if the result must be stable you add a tie-breaker like employee_id to the ORDER BY.*

*You cannot filter them in WHERE because of the logical processing order: WHERE is evaluated before SELECT, and window functions are evaluated inside SELECT, so at the moment WHERE runs the value does not exist. And that is not an arbitrary restriction, it is forced by what a window function means: a rank is defined relative to the set of rows in the window, so the set must be finalised before any rank can be computed. If WHERE could filter on a rank, filtering would change the set, which would change the ranks, which would change what the filter matches. The same reasoning excludes HAVING, which is also earlier, and GROUP BY, where it would be circular as well. ORDER BY can reference them, because it runs later.*

*So you need another level of query, a subquery or a CTE, which turns the window value into an ordinary column the outer WHERE can filter. Some dialects have QUALIFY, which stands to window functions as HAVING stands to aggregates, and it exists in Snowflake, Teradata, BigQuery and DuckDB but not in PostgreSQL, MySQL, SQL Server or Oracle.*

*For the top two earners per department I would write a CTE selecting name, department_id, salary and DENSE_RANK over partition by department_id order by salary descending, then select from it where the rank is at most two. Two things do the work: PARTITION BY restarts the numbering for each department, so the ranks are per group rather than global, and without it the whole result is one partition and you would get the top two overall; and the CTE makes the rank an ordinary column so the outer WHERE can filter it.*

*And the function choice changes the answer, which is the point worth making. If a department has two people on a hundred thousand and one on ninety, DENSE_RANK of at most two returns all three, since they hold the top two distinct salaries. RANK of at most two returns only the two tied at rank one, because there is no rank two. ROW_NUMBER of at most two returns exactly two rows, picked arbitrarily among the ties.*

*On performance, a window function needs its input sorted by the partition keys then the order keys, so the plan is normally a Sort followed by a WindowAgg. An index on department_id and salary descending removes the sort entirely, because it delivers rows already grouped by department and ordered within each, so the engine computes the ranks in one streaming pass. Two related notes: the frame clause does not apply to these three, since a rank is defined over the whole partition, and the relatives worth knowing are NTILE for bucketing, PERCENT_RANK and CUME_DIST for relative position, and LAG and LEAD for reaching other rows, which together replace most analytical self-joins."*
