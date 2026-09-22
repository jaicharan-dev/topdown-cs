---
id: 6-sql-query-execution-order
title: "SQL Query Execution Order"
description: "Master the exact order of execution in SQL queries, why SELECT runs late, and how this impacts aliases, WHERE, and HAVING."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact execution order of a SQL query? Why does using a column alias defined in SELECT inside the WHERE clause fail?"

Although a SQL query is written starting with `SELECT`, the database execution engine executes clauses in a vastly different, deterministic pipeline sequence. Understanding this sequence is essential for debugging queries and understanding query planner behavior.

---

### The SQL Execution Pipeline

```
1. FROM / JOIN     -> Identify tables, apply ON join predicates, build virtual table
2. WHERE           -> Filter individual rows (pre-aggregation)
3. GROUP BY        -> Collapse rows into summary buckets
4. HAVING          -> Filter aggregated groups
5. SELECT          -> Compute output expressions, apply column ALIASES
6. DISTINCT        -> Eliminate duplicate rows
7. ORDER BY        -> Sort final rows (can use aliases)
8. LIMIT / OFFSET  -> Slice page window for output
```

---

### Why Aliases Fail in `WHERE`

Consider this common syntax error:

```sql
-- FAILS with: "column 'annual_comp' does not exist"
SELECT 
    employee_id, 
    salary * 12 AS annual_comp
FROM employees
WHERE annual_comp > 150000;
```

#### The Reason:
Look at the execution sequence:
1. `FROM employees` executes first.
2. `WHERE annual_comp > 150000` executes second.
3. `SELECT ... AS annual_comp` has **not executed yet**!

The alias `annual_comp` is only assigned in Step 5 (`SELECT`). When the engine processes the `WHERE` clause in Step 2, the symbol `annual_comp` is completely unknown to the compiler.

#### How to Solve It:
You must repeat the underlying expression or use a Common Table Expression (CTE) / subquery:

```sql
-- Solution 1: Direct expression repetition
SELECT employee_id, salary * 12 AS annual_comp
FROM employees
WHERE (salary * 12) > 150000;

-- Solution 2: Common Table Expression (CTE)
WITH CalculatedSalaries AS (
    SELECT employee_id, salary * 12 AS annual_comp
    FROM employees
)
SELECT * 
FROM CalculatedSalaries
WHERE annual_comp > 150000;
```

---

### Why Aliases DO Work in `ORDER BY`

In contrast, this query executes without error:

```sql
SELECT employee_id, salary * 12 AS annual_comp
FROM employees
ORDER BY annual_comp DESC; -- WORKS!
```

Because `ORDER BY` runs at **Step 7**, well *after* `SELECT` (Step 5) has already evaluated the expression and registered the label `annual_comp`.

---

### The ELI5 Analogy: Building a Custom Sandwich

Think of ordering a custom subway sandwich:
1. **`FROM`:** Take out the bread and meats.
2. **`WHERE`:** Remove any spoiled ingredients.
3. **`GROUP BY`:** Stack the sandwich into layers.
4. **`HAVING`:** Reject the sandwich if it doesn't weigh at least 300 grams.
5. **`SELECT`:** Stick the label "Super Spicy Sub" on the wrapper.
6. **`DISTINCT`:** Remove duplicate identical sandwiches.
7. **`ORDER BY`:** Sort the sandwiches from biggest to smallest on the counter.
8. **`LIMIT`:** Hand the first 2 sandwiches to the customer.

You cannot tell someone to "remove the sandwich labeled 'Super Spicy Sub'" in Step 2, because the label hasn't even been written or pasted on the wrapper yet!

---

### Summary
"SQL queries execute in the logical order: FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> DISTINCT -> ORDER BY -> LIMIT. Column aliases defined in SELECT are invisible to WHERE because WHERE executes before SELECT evaluates expressions."

---

### Crucial Nuance: Database Vendor Deviations
While the ANSI standard strictly enforces this order, some modern database engines (such as MySQL and SQLite) provide syntax relaxations that allow aliases in `GROUP BY` and `HAVING` clauses, evaluating expressions lazily. However, in standard ANSI SQL, PostgreSQL, and Oracle, referring to a `SELECT` alias anywhere prior to `ORDER BY` produces an immediate parse error. Always design queries portably by repeating the expression or wrapping it in a CTE.
