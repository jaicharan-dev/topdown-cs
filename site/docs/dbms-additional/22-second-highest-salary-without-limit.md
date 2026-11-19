---
id: 22-second-highest-salary-without-limit
title: "Second Highest Salary Without LIMIT"
description: "A two-line answer that handles ties and empty tables for free, and a window function that is more flexible and reads the whole table"

sidebar_position: 22
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Write a SQL query to find the second highest salary from an Employee table without using `LIMIT` or `OFFSET`. How do you handle duplicate ties and empty tables (returning `NULL`), and what are the performance differences between `MAX()` and `DENSE_RANK()`?"

---

### Picture it

A noticeboard of salaries, and somebody asks for **the second highest**.

**The simplest way to think about it** is not to sort anything. Find the highest. Then find the highest of everything **below** that. Two questions, each of which you already know how to answer, and the second one is just the first with a ceiling on it.

Notice what that approach quietly handles.

**If three people share the top salary**, the first question returns that figure once, and the second question asks for the best figure **strictly below** it, which skips all three of them together. You never had to think about duplicates; asking for "the highest below X" treats ties as one value automatically.

**If the board is empty**, the first question has nothing to answer with, so it gives you a blank. The second question then asks for the highest below a blank, which is also blank. The empty case falls out without a special rule.

**The other way to think about it** is to sort everyone and take the one in second place. That works too, and it is far more flexible, because the same machinery answers "the fifth highest" or "the top three in each department" without rewriting anything.

But it has a different shape of cost. **You have to put the whole board in order before you can say who is second.** Finding the highest needs one pass with one number held in your head; ranking everybody needs the entire list sorted. For a board of ten names that is nothing. For ten million rows it is the difference between reading two entries and reading everything.

And the sorted approach has one trap: if nobody is in second place, it does not hand you a blank. It hands you **nothing at all**, which is a different thing, and which the person who asked may not be expecting.

---

### The proper terms

#### The `MAX()` approach

The shortest correct answer, and the one to lead with:

```sql
SELECT MAX(salary) AS second_highest
FROM   employees
WHERE  salary < (SELECT MAX(salary) FROM employees);
```

It reads as the picture did: the highest salary **strictly below** the highest salary.

Three properties, and all three are **free** rather than engineered:

**Ties are handled correctly.** The inner query returns the top value once. The `<` then excludes **every** row holding it, so three people on the same top salary are skipped together and the result is the second **distinct** salary.

**An empty table returns `NULL`.** `MAX` over no rows is `NULL`, so the inner query gives `NULL`, the predicate `salary < NULL` is **unknown** for every row, the outer `MAX` sees no rows, and returns `NULL`. The requirement is satisfied by the semantics rather than by a special case.

**A table with only one distinct salary returns `NULL`** for the same reason: nothing is strictly below it.

The one thing to be careful about: because `MAX` is an aggregate with no `GROUP BY`, the query **always returns exactly one row**, which is what makes the `NULL` possible. A `WHERE` clause that filtered rows out would return zero rows instead, and that is the difference the next section turns on.

#### The `DENSE_RANK()` approach

```sql
SELECT DISTINCT salary AS second_highest
FROM  (SELECT salary,
              DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
       FROM   employees) t
WHERE rnk = 2;
```

**`DENSE_RANK` is the right ranking function here**, and the choice matters:

**`DENSE_RANK`** gives tied rows the same rank and does not skip: `1, 1, 2, 3`. So rank 2 is the second **distinct** salary, which is what was asked.

**`RANK`** gives tied rows the same rank and does skip: `1, 1, 3, 4`. With two people on the top salary, rank 2 does not exist and the query returns nothing.

**`ROW_NUMBER`** never ties: `1, 2, 3, 4`. Row 2 is the second **row**, so with two people on the top salary it returns that same top salary again.

**The empty-table problem.** This form returns **zero rows**, not `NULL`. Zero rows and a row containing `NULL` are different results, and a client expecting a scalar will behave differently. The fix is to wrap it in a **scalar subquery**, which yields `NULL` when its inner query is empty:

```sql
SELECT (SELECT DISTINCT salary
        FROM  (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) rnk
               FROM employees) t
        WHERE rnk = 2) AS second_highest;
```

Note also that the window function **cannot be filtered in the `WHERE` clause** of the query that computes it, because window functions are evaluated **after** `WHERE` in the logical processing order. The subquery or CTE is not stylistic; it is required.

#### The ties question, stated properly

"Second highest" is **ambiguous**, and saying so is part of a good answer. With salaries `100, 100, 90`:

**The second highest distinct salary is 90.** `MAX` and `DENSE_RANK` both give this, and it is what the question almost always means.

**The second row by salary is 100.** `ROW_NUMBER` gives this.

**Under `RANK` there is no rank 2 at all**, so that formulation returns nothing.

In an interview the right move is to state the assumption, give the distinct-value answer, and mention how you would change it if the other reading was intended.

#### Performance

The two approaches have genuinely different costs, and the reason is structural rather than a matter of optimiser quality.

**With an index on `salary`:**

**`MAX`** reads the **last entry of the index**, which is a descent of the B+ tree, two or three page reads. The outer query then seeks to just below that value and reads the next entry, which is another handful of reads. Total: a **constant number of page reads**, independent of table size. In PostgreSQL the plan shows `Result` with an `InitPlan` doing a `Limit` over an `Index Only Scan Backward`, reading **one row**.

**`DENSE_RANK`** must **assign a rank to every row**, so it must examine **every row**, because a rank is defined relative to the whole set. An index on `salary` lets it read them already ordered and avoid a sort, but it still **reads the entire index**. The cost is `O(n)` at best and `O(n log n)` if a sort is needed.

**Without an index**, `MAX` becomes two sequential scans and `DENSE_RANK` becomes a scan plus a sort, so both are linear and the gap narrows, but `MAX` still wins.

So for N = 2 specifically, `MAX` is decisively better.

**Where `DENSE_RANK` wins** is everything the `MAX` approach scales badly to:

**The Nth highest for larger or variable N.** `MAX` needs **N nested subqueries**, which is unwritable for a parameterised N, whereas `DENSE_RANK` needs only `WHERE rnk = :n`.

**Top N per group.** `PARTITION BY department_id` gives per-department ranking in one pass; the `MAX` approach would need a correlated subquery per department and becomes `O(n^2)`.

**Returning more than the value**, such as the employee's name alongside the salary, which the aggregate form cannot do without another join.

#### The approaches to avoid

Worth naming, because interviewers sometimes offer them:

**The counting self-join.**

```sql
SELECT DISTINCT e.salary FROM employees e
WHERE (SELECT COUNT(DISTINCT e2.salary) FROM employees e2
       WHERE e2.salary > e.salary) = 1;
```

Correct, and `O(n^2)`: for every row it counts distinct greater salaries. On a million rows it is unusable.

**`NOT IN` with a subquery.** Correct in spirit, but `NOT IN` against a subquery that can return `NULL` evaluates to **unknown for every row**, silently returning nothing. `NOT EXISTS` avoids the trap.

#### And the honest remark

The "without `LIMIT`" constraint is **artificial**. In production the right answer is:

```sql
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC
OFFSET 1 ROWS FETCH NEXT 1 ROW ONLY;      -- standard SQL
```

which is clear, uses the index, and stops early. Saying so is worth a sentence, because the constraint exists to test whether you know window functions and `NULL` semantics, not because `LIMIT` is the wrong tool.

---

### In code

```sql
-- THE ANSWER TO LEAD WITH: the highest salary strictly below
-- the highest salary
SELECT MAX(salary) AS second_highest
FROM   employees
WHERE  salary < (SELECT MAX(salary) FROM employees);

-- three properties, all FREE rather than engineered:
--
--   TIES:   the inner query returns the top value ONCE, and `<`
--           excludes EVERY row holding it, so three people on the
--           same top salary are skipped TOGETHER
--
--   EMPTY:  MAX over no rows is NULL
--           -> inner query returns NULL
--           -> `salary < NULL` is UNKNOWN for every row
--           -> the outer MAX sees no rows and returns NULL
--
--   ONE DISTINCT SALARY: same reasoning, nothing is strictly below it
--
-- and the reason NULL is possible at all: MAX with no GROUP BY
-- ALWAYS RETURNS EXACTLY ONE ROW. A WHERE clause that filtered rows
-- out would return ZERO ROWS, which is a different result.
```

```sql
-- THE WINDOW FUNCTION APPROACH
SELECT DISTINCT salary AS second_highest
FROM  (SELECT salary,
              DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
       FROM   employees) t
WHERE rnk = 2;

-- the subquery is REQUIRED, not stylistic: a window function cannot
-- be filtered in the WHERE clause of the query that computes it,
-- because window functions are evaluated AFTER WHERE in the logical
-- processing order.
```

```text
Why DENSE_RANK and not the others. Salaries 100, 100, 90, 80:

  salary   ROW_NUMBER   RANK   DENSE_RANK
    100        1          1        1
    100        2          1        1
     90        3          3        2      <- the SECOND DISTINCT
     80        4          4        3         salary

  ROW_NUMBER  never ties: rank 2 is the SECOND ROW, which is 100
                          AGAIN. Wrong answer.
  RANK        ties, and SKIPS: 1, 1, 3, 4
                          RANK 2 DOES NOT EXIST -> returns NOTHING
  DENSE_RANK  ties, and does NOT skip: 1, 1, 2, 3
                          rank 2 is the second DISTINCT salary
                          -> CORRECT

  memory aid: RANK leaves gaps, DENSE_RANK is dense.
```

```sql
-- THE EMPTY-TABLE PROBLEM with the window form
SELECT DISTINCT salary FROM (...) t WHERE rnk = 2;
--   on an empty table, or one with a single distinct salary:
--   returns ZERO ROWS, not NULL.
--   zero rows and a row containing NULL are DIFFERENT RESULTS, and
--   a client expecting a scalar will behave differently.

-- THE FIX: wrap it in a SCALAR SUBQUERY, which yields NULL when its
-- inner query is empty
SELECT (SELECT DISTINCT salary
        FROM  (SELECT salary,
                      DENSE_RANK() OVER (ORDER BY salary DESC) rnk
               FROM   employees) t
        WHERE rnk = 2) AS second_highest;
--   now an empty table gives one row containing NULL, matching the
--   MAX version's behaviour.
```

```text
"Second highest" is AMBIGUOUS, and saying so is part of the answer.

  salaries: 100, 100, 90

  the second highest DISTINCT salary        = 90
     MAX and DENSE_RANK both give this, and it is what the question
     almost always means

  the second ROW by salary                  = 100
     ROW_NUMBER gives this

  under RANK there is NO RANK 2 AT ALL
     that formulation returns nothing

  in an interview: state the assumption, give the distinct-value
  answer, and say how you would change it for the other reading.
```

```text
PERFORMANCE: the difference is structural, not an optimiser detail

  WITH AN INDEX ON salary:

  MAX
     inner: read the LAST ENTRY of the index
            -> a B+ tree descent, 2-3 page reads
     outer: seek to just below that value, read the next entry
            -> another handful of reads
     TOTAL: a CONSTANT number of page reads, INDEPENDENT OF TABLE SIZE

     Postgres plan: Result, with an InitPlan doing
                    Limit -> Index Only Scan Backward
                    reading ONE ROW

  DENSE_RANK
     must assign a rank to EVERY ROW, because a rank is defined
     relative to the WHOLE SET, so it must EXAMINE EVERY ROW.
     an index lets it read them already ordered and skip the sort,
     but it still READS THE ENTIRE INDEX.
     TOTAL: O(n) at best, O(n log n) if a sort is needed

  WITHOUT AN INDEX: MAX is two sequential scans, DENSE_RANK is a
  scan plus a sort. Both linear, gap narrows, MAX still wins.

  so for N = 2 SPECIFICALLY, MAX is decisively better.
```

```sql
-- WHERE DENSE_RANK WINS: everything MAX scales badly to

-- 1. the Nth highest, for larger or VARIABLE N
--    MAX would need N NESTED SUBQUERIES, which is unwritable for a
--    parameterised N:
SELECT (SELECT DISTINCT salary FROM (
          SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) rnk
          FROM employees) t
        WHERE rnk = :n);                  -- just change :n

-- 2. TOP N PER GROUP, in ONE PASS
SELECT department_id, name, salary
FROM (
  SELECT department_id, name, salary,
         DENSE_RANK() OVER (PARTITION BY department_id
                            ORDER BY salary DESC) AS rnk
  FROM employees
) t
WHERE rnk <= 2;
--   the MAX approach would need a correlated subquery PER
--   DEPARTMENT and becomes O(n^2)

-- 3. RETURNING MORE THAN THE VALUE (the employee's name alongside
--    it), which the aggregate form cannot do without another join
```

```sql
-- APPROACHES TO AVOID

-- the counting self-join: correct, and O(n^2)
SELECT DISTINCT e.salary
FROM   employees e
WHERE  (SELECT COUNT(DISTINCT e2.salary)
        FROM   employees e2 WHERE e2.salary > e.salary) = 1;
--   for EVERY row it counts distinct greater salaries.
--   on a million rows it is unusable.

-- NOT IN with a subquery that can return NULL
SELECT MAX(salary) FROM employees
WHERE  salary NOT IN (SELECT MAX(salary) FROM employees);
--   if the inner query can yield NULL, `x NOT IN (NULL)` is UNKNOWN
--   for EVERY row, so it silently returns nothing.
--   NOT EXISTS avoids the trap.
```

```sql
-- AND THE HONEST REMARK: the constraint is artificial.
-- In production:
SELECT DISTINCT salary
FROM   employees
ORDER  BY salary DESC
OFFSET 1 ROWS FETCH NEXT 1 ROW ONLY;        -- standard SQL

SELECT DISTINCT salary FROM employees
ORDER BY salary DESC LIMIT 1 OFFSET 1;      -- Postgres / MySQL

-- clear, uses the index, stops early. The "without LIMIT" rule
-- exists to test window functions and NULL semantics, not because
-- LIMIT is the wrong tool.
```

---

### What they ask next

**"Why does the `MAX` version handle ties without any extra work?"**
Because the inner query returns the top **value**, once, and the strict `<` then excludes every row holding that value. Duplicates at the top are skipped as a group, so the result is naturally the second distinct salary.

**"Why does it return `NULL` on an empty table?"**
`MAX` over zero rows is `NULL`, so the predicate becomes `salary < NULL`, which is unknown for every row, and the outer `MAX` over an empty set is `NULL` again. Crucially, an aggregate with no `GROUP BY` always returns exactly one row, which is what makes a `NULL` result possible rather than zero rows.

**"Why `DENSE_RANK` rather than `RANK` or `ROW_NUMBER`?"**
`DENSE_RANK` ties without skipping, so rank 2 is the second distinct salary. `RANK` skips, so with two rows at the top there is no rank 2 and you get nothing. `ROW_NUMBER` never ties, so row 2 is the top salary again.

**"Why does the window version not return `NULL`?"**
Because it is a `WHERE` filter that matches no rows, giving an empty result rather than a row containing `NULL`. Wrapping it in a scalar subquery fixes it, since a scalar subquery over an empty result yields `NULL`.

**"Why can you not put `WHERE rnk = 2` directly in the same query?"**
Because window functions are evaluated after `WHERE` in the logical processing order, so the column does not exist yet. A subquery, a CTE, or `QUALIFY` in the dialects that have it is required.

**"Which performs better and why?"**
`MAX`, decisively, for N equal to 2. With an index it reads a constant number of pages, essentially the last entry and the one below it. `DENSE_RANK` must rank every row, because a rank is defined relative to the whole set, so it reads the entire index even when a sort is avoided.

**"When would you prefer the window function?"**
For the Nth highest with variable N, which the `MAX` form cannot express without N nested subqueries; for top N per group via `PARTITION BY`, which the `MAX` form turns into `O(n^2)`; and when you need other columns alongside the value.

**"What is wrong with the counting self-join?"**
It is `O(n^2)`, since for every row it counts the distinct greater salaries. It is correct and unusable at scale, and it is worth recognising rather than offering.

**The common wrong answer** is producing a query that works on the interviewer's four-row example and fails on the real cases. The three things being tested are **ties**, where only `MAX` or `DENSE_RANK` give the second distinct value, **the empty table**, where the aggregate returns `NULL` for free while the window form returns zero rows until you wrap it, and the **cost**, where ranking is inherently a whole-table operation and `MAX` is a constant number of page reads.

---

### Say this in the interview

*"I would lead with the aggregate form: select the maximum salary where the salary is less than the maximum salary, as a subquery. It reads exactly as the problem does, the highest salary strictly below the highest salary.*

*Three properties come free rather than being engineered. Ties are handled, because the inner query returns the top value once and the strict less-than excludes every row holding it, so three people on the same top salary are skipped together and the result is the second distinct salary. An empty table returns NULL, because MAX over no rows is NULL, so the predicate becomes salary less than NULL, which is unknown for every row, and the outer MAX over an empty set is NULL again. And a table with only one distinct salary returns NULL for the same reason. The thing that makes the NULL possible is that an aggregate with no GROUP BY always returns exactly one row, whereas a WHERE clause filtering rows out would return zero rows, which is a different result.*

*The window alternative is DENSE_RANK over salary descending, in a subquery, filtered to rank two. DENSE_RANK is the right choice because it ties without skipping, giving one, one, two, three, so rank two is the second distinct salary. RANK ties and skips, giving one, one, three, so with two rows at the top there is no rank two and the query returns nothing. ROW_NUMBER never ties, so row two is the top salary again. The subquery is required rather than stylistic, because window functions are evaluated after WHERE in the logical processing order, so you cannot filter on the rank in the same query.*

*That form has one gap: on an empty table it returns zero rows rather than NULL, and those are different results for a client expecting a scalar. The fix is to wrap it in a scalar subquery, which yields NULL when its inner query is empty.*

*I would also say that second highest is ambiguous. With salaries of a hundred, a hundred and ninety, the second highest distinct salary is ninety, which is what MAX and DENSE_RANK give and what the question almost always means, while the second row by salary is a hundred, which is what ROW_NUMBER gives, and under RANK there is no rank two at all. Stating the assumption is part of the answer.*

*On performance, the difference is structural rather than an optimiser detail. With an index on salary, MAX reads the last entry of the index, a B+ tree descent of two or three page reads, then seeks to just below that value and reads the next entry: a constant number of page reads independent of table size. In PostgreSQL the plan is a Result with an InitPlan doing a Limit over an Index Only Scan Backward, reading one row. DENSE_RANK must assign a rank to every row, because a rank is defined relative to the whole set, so it must examine every row; an index lets it read them already ordered and skip the sort, but it still reads the entire index, so it is linear at best. Without an index, MAX is two sequential scans and DENSE_RANK is a scan plus a sort. So for N equals two specifically, MAX wins decisively.*

*Where the window function wins is everything MAX scales badly to: the Nth highest for larger or variable N, since MAX would need N nested subqueries and cannot be parameterised, whereas the window form is just rank equals N; top N per group, where PARTITION BY gives per-department ranking in one pass while the MAX approach becomes a correlated subquery per department and quadratic; and returning other columns alongside the value, which the aggregate cannot do without another join.*

*Two approaches to avoid: the counting self-join, which counts distinct greater salaries for every row and is quadratic, and NOT IN against a subquery that can return NULL, where the whole predicate becomes unknown and silently returns nothing, so NOT EXISTS should be used instead. And I would note that the without-LIMIT constraint is artificial: in production the right answer is ORDER BY salary DESC with OFFSET one FETCH NEXT one row only, which is clear, uses the index and stops early. The constraint exists to test window functions and NULL semantics."*
