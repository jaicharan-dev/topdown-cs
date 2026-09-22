---
id: 4-where-vs-having
title: "WHERE vs. HAVING Clause"
description: "Clarify the differences between WHERE and HAVING in SQL, execution order dependencies, and aggregation filtering."
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between WHERE and HAVING in SQL? When would you use HAVING without GROUP BY, and can you use aggregate functions in a WHERE clause?"

The fundamental distinction between `WHERE` and `HAVING` lies in **when** the filter is evaluated during SQL query execution and **what** data granularity it operates upon.

---

### Key Comparison

| Feature | `WHERE` Clause | `HAVING` Clause |
| :--- | :--- | :--- |
| **Operates On** | Individual **raw rows** | **Grouped / Aggregated rows** |
| **Execution Point** | **Before** `GROUP BY` and aggregations | **After** `GROUP BY` and aggregations |
| **Aggregate Functions?** | **No** (e.g., `WHERE COUNT(*) > 5` throws a syntax error) | **Yes** (e.g., `HAVING SUM(salary) > 500000`) |
| **Index Utilization** | Can leverage B-Tree indexes to filter rows quickly | Cannot utilize indexes directly; filters aggregated buckets in memory |
| **Primary Purpose** | Discard irrelevant rows before heavy processing | Filter entire groups that do not satisfy summary conditions |

---

### Code Demonstration

Consider an `employees` table:

```sql
-- Target: Find departments with more than 5 senior engineers earning over \$100,000,
-- where the total department spend on those engineers exceeds \$1,000,000.

SELECT 
    department_id, 
    COUNT(*) AS senior_count, 
    SUM(salary) AS total_payroll
FROM employees
WHERE salary > 100000 -- 1. Row-level filter: discards junior salaries BEFORE grouping
GROUP BY department_id -- 2. Groups remaining senior records by department
HAVING COUNT(*) > 5    -- 3. Group-level filter: discards departments with <= 5 senior engineers
   AND SUM(salary) > 1000000;
```

#### Why Can't You Use `WHERE SUM(salary) > 1000000`?
The `WHERE` clause filters individual records as they are being fetched from disk or cache. At the moment the `WHERE` clause runs, the database has not grouped rows yet, meaning `SUM()` or `COUNT()` does not exist. Attempting to run `WHERE AVG(salary) > 50000` results in:
`ERROR: aggregate functions are not allowed in WHERE`.

---

### The ELI5 Analogy: Grading Classroom Quizzes

Imagine a teacher sorting student test papers from 10 different classrooms:
- **`WHERE` (Filtering papers before grouping):** Before doing any math, the teacher discards all papers where the student didn't write their name or cheated: `WHERE cheated = FALSE`.
- **`GROUP BY`:** The teacher stacks the remaining clean papers by classroom.
- **`HAVING` (Filtering stacks after calculating averages):** The teacher calculates the average score for each classroom stack. Then, the teacher only awards pizza parties to classrooms whose average score is above 85%: `HAVING AVG(score) > 85`.

---

### Summary
"`WHERE` filters individual rows before grouping and cannot use aggregate functions, whereas `HAVING` filters grouped summary records after `GROUP BY` and is designed specifically for aggregate conditions."

---

### Crucial Nuance: Can `HAVING` Be Used Without `GROUP BY`?
Yes! If a query contains a `HAVING` clause but no `GROUP BY`, the database treats the **entire table as a single, global group**. 
For example:
```sql
SELECT AVG(salary) 
FROM employees 
HAVING COUNT(*) > 10;
```
If the table has 10 or fewer rows, this query returns an empty result set (0 rows). If it has more than 10 rows, it returns the single overall average salary.
