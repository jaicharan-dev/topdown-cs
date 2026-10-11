---
id: 6-sql-query-execution-order
title: "SQL Query Execution Order"
description: "The real order a SQL query runs in (not the order you type it), why SELECT aliases fail in WHERE, and where window functions fit in."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact execution order of a SQL query? Why does using a column alias defined in SELECT inside the WHERE clause fail, and where do window functions execute?"

You type `SELECT` first, but it doesn't run first. The database runs clauses in a fixed order that has nothing to do with how you wrote them — and almost every "why doesn't my query work" bug traces back to not knowing this order.

<Diagram>
<Row>
<Box title="1. FROM/JOIN" accent="#60a5fa">
<Field icon="📋" code="get rows" variant="neutral" />
</Box>
<Arrow />
<Box title="2. WHERE" accent="#34d399">
<Field icon="🔍" code="filter rows" variant="neutral" />
</Box>
<Arrow />
<Box title="3. GROUP BY" accent="#f59e0b">
<Field icon="🗂️" code="bucket rows" variant="neutral" />
</Box>
<Arrow />
<Box title="4. HAVING" accent="#818cf8">
<Field icon="🔍" code="filter groups" variant="neutral" />
</Box>
</Row>
<Row>
<Box title="5. SELECT" accent="#ec4899">
<Field icon="📤" code="compute + alias" variant="neutral" />
</Box>
<Arrow />
<Box title="6. WINDOW" accent="#fb923c">
<Field icon="🪟" code="OVER (...)" variant="neutral" />
</Box>
<Arrow />
<Box title="7. DISTINCT" accent="#a1a1aa">
<Field icon="🧹" code="dedupe" variant="neutral" />
</Box>
<Arrow />
<Box title="8. ORDER BY" accent="#60a5fa">
<Field icon="↕️" code="sort" variant="neutral" />
</Box>
<Arrow />
<Box title="9. LIMIT" accent="#34d399">
<Field icon="✂️" code="page" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### Why aliases fail in WHERE

This looks like it should work, but it doesn't:

```sql
-- FAILS: column "annual_comp" does not exist
SELECT 
    employee_id, 
    salary * 12 AS annual_comp
FROM employees
WHERE annual_comp > 150000;
```

Walk through the order above: `FROM` runs at step 1, `WHERE` runs at step 2 — but the alias `annual_comp` isn't created until `SELECT`, at step 5. When `WHERE` runs, that name simply doesn't exist yet.

Two ways to fix it:

```sql
-- Option 1: repeat the expression
SELECT employee_id, salary * 12 AS annual_comp
FROM employees
WHERE (salary * 12) > 150000;

-- Option 2: wrap it in a CTE, then filter the alias from outside
WITH RankedSalaries AS (
    SELECT employee_id, salary * 12 AS annual_comp
    FROM employees
)
SELECT * 
FROM RankedSalaries
WHERE annual_comp > 150000;
```

### Why the same alias works fine in ORDER BY

`ORDER BY` runs at step 8 — well after `SELECT` has already created the alias at step 5. So by the time sorting happens, `annual_comp` exists:

```sql
SELECT employee_id, salary * 12 AS annual_comp
FROM employees
ORDER BY annual_comp DESC; -- fine
```

---

### Where do window functions run?

A common senior-level trap: can you filter on a window function directly?

```sql
-- SYNTAX ERROR
SELECT employee_id, department_id, salary
FROM employees
WHERE ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) = 1;
```

No — window functions run at step 6, after `HAVING` but before `DISTINCT` and `ORDER BY`. Both `WHERE` (step 2) and `HAVING` (step 4) run before that, so neither one can see a window function's result yet. Wrap the window calculation in a CTE first, then filter on it from outside:

```sql
WITH RankedEmployees AS (
    SELECT 
        employee_id, department_id, salary,
        ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rank_in_dept
    FROM employees
)
SELECT employee_id, department_id, salary
FROM RankedEmployees
WHERE rank_in_dept = 1;
```

---

### Logical order vs. what the engine actually does on disk

The order above is the *logical* contract — it decides what's visible where, not literally how the hardware executes the query. The real execution plan comes from the query optimizer, which is free to reorder things as long as the result is identical:

- **Predicate pushdown** — a `WHERE` filter gets pushed down into the index scan itself, before the join even runs.
- **Join reordering** — the optimizer may hash the smaller table first regardless of the order you wrote the joins in.
- **Top-N sorts** — `ORDER BY ... LIMIT 5` can use a small in-memory heap instead of sorting the entire result set.

So the 9-step order tells you what's *allowed to reference what* — not the literal sequence of disk operations.

---

### Vendor quirks

ANSI SQL says aliases can only be used from `ORDER BY` onward. MySQL and SQLite are more relaxed and also allow aliases in `GROUP BY` and `HAVING`. PostgreSQL, Oracle, and SQL Server do not — they'll throw a syntax error. If you want portable SQL, repeat the expression or use a CTE instead of relying on the alias early.

---

### Say this in the interview

*"SQL executes as FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → WINDOW → DISTINCT → ORDER BY → LIMIT. Aliases created in SELECT aren't visible to WHERE because filtering happens before projection. Window functions run after HAVING, so filtering on them needs a CTE."*

---

### Full example: filtering aliases and window functions correctly

```sql
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    department_id INT NOT NULL,
    salary NUMERIC(10, 2) NOT NULL
);

INSERT INTO employees VALUES 
(1, 10, 95000.00),
(2, 10, 80000.00),
(3, 20, 110000.00),
(4, 20, 105000.00);

-- INCORRECT: filtering directly on a window function
-- SELECT employee_id, salary
-- FROM employees
-- WHERE ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) = 1;
-- ERROR: window functions are not allowed in WHERE

-- CORRECT: filter via a CTE
WITH RankedEmployees AS (
    SELECT 
        employee_id,
        department_id,
        salary,
        salary * 12 AS annual_comp,
        ROW_NUMBER() OVER (
            PARTITION BY department_id 
            ORDER BY salary DESC
        ) AS rank_in_dept
    FROM employees
)
SELECT 
    employee_id,
    department_id,
    annual_comp
FROM RankedEmployees
WHERE rank_in_dept = 1 
  AND annual_comp > 1000000.00
ORDER BY annual_comp DESC;
```
