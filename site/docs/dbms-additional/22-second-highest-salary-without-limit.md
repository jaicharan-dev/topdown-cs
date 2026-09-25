---
id: 22-second-highest-salary-without-limit
title: "Second Highest Salary Without LIMIT or OFFSET: Solutions & Complexities"
description: "Solve the classic SQL problem: find the second highest salary without LIMIT or OFFSET, analyzing MAX(), DENSE_RANK(), and index complexity."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Write a SQL query to find the second highest salary from an Employee table without using `LIMIT` or `OFFSET`. How do you handle duplicate ties and empty tables (returning `NULL`), and what are the performance complexities of `MAX()` vs. `DENSE_RANK()` with an index on salary?"

---

### The Interview Challenge

Finding the second highest salary is a canonical SQL interview challenge. While dialects allow `ORDER BY salary DESC LIMIT 1 OFFSET 1`, interviewers deliberately disallow `LIMIT` and `OFFSET` to evaluate:
1. Handling duplicate salary ties.
2. Returning `NULL` gracefully if the table contains fewer than two distinct salaries.
3. Understanding query performance complexities under B-Tree indexing.

---

### Solution 1: Nested Subquery with `MAX()` (Standard ANSI SQL)

The most portable and performant ANSI SQL solution uses the `MAX()` aggregate function:

```sql
SELECT MAX(salary) AS SecondHighestSalary
FROM Employee
WHERE salary < (
    SELECT MAX(salary) 
    FROM Employee
);
```

#### Why This Solution Is Gold in Interviews:
- **Tolerates Duplicate Ties:** If three employees share the top salary of \$120,000, `SELECT MAX(salary)` returns \$120,000. The outer query evaluates `WHERE salary < 120000`, guaranteeing the true second highest salary is picked.
- **Graceful `NULL` Return:** If the table has only 1 employee (or 0 employees), the subquery finds the maximum, but the outer query finds zero records matching `salary < MAX`. In SQL, **applying `MAX()` over an empty result set yields `NULL`**, cleanly satisfying specifications without requiring `COALESCE` or `IFNULL`.

---

### Solution 2: Window Function with `DENSE_RANK()` (Modern SQL)

In PostgreSQL, MySQL 8.0+, SQL Server, and Oracle, the industry-standard approach uses window ranking functions:

```sql
WITH RankedSalaries AS (
    SELECT 
        salary, 
        DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM Employee
)
SELECT MAX(salary) AS SecondHighestSalary
FROM RankedSalaries
WHERE rnk = 2;
```

#### Why `DENSE_RANK()` and NOT `RANK()` or `ROW_NUMBER()`?
- If the top salary is tied between two employees:
  - `ROW_NUMBER()` assigns `1` and `2` arbitrarily to the identical top salaries. Filtering on `rnk = 2` incorrectly returns the *first* highest salary!
  - `RANK()` assigns `1` to both, skipping to `3` for the next salary (`1, 1, 3`). Filtering on `rnk = 2` returns an empty set!
  - `DENSE_RANK()` assigns `1` to both, and assigns `2` to the next distinct salary (`1, 1, 2`).
- Wrapping the final projection in `MAX(salary)` ensures the query returns `NULL` rather than an empty row set if only one distinct salary exists.

---

### Solution 3: Generalized N-th Highest Salary (Correlated Subquery)

To find the $N$-th highest salary for any arbitrary $N$ without window functions:

```sql
SELECT e1.salary AS NthHighestSalary
FROM Employee e1
WHERE (N - 1) = (
    SELECT COUNT(DISTINCT e2.salary)
    FROM Employee e2
    WHERE e2.salary > e1.salary
);
```
For $N = 2$, this query finds the salary $e_1$ where exactly **1 distinct salary** is strictly greater than it.

---

### Performance & Complexity Analysis with B-Tree Indexing

| Metric | Solution 1: `MAX()` Subquery | Solution 2: `DENSE_RANK()` | Solution 3: Correlated Subquery |
| :--- | :--- | :--- | :--- |
| **Time Complexity (Unindexed)** | $O(N)$ (Two table scans) | $O(N \log N)$ (Sort all rows) | $O(N^2)$ (Quadratic nested loops) |
| **Time Complexity (Indexed)** | **$O(1)$ (Two B-Tree seeks!)** | $O(N)$ (Stream through index) | $O(N \log N)$ |
| **Memory Footprint** | Negligible (Streams scalars) | Higher (Buffers window partitions) | Negligible |
| **Portability** | 100% ANSI SQL compatible | Requires SQL:2003 window support | 100% ANSI SQL compatible |

> **Staff-Level Bar Raiser:** With a B-Tree index on `salary`, Solution 1 executes in **$O(1)$ time**! The database engine jumps directly to the rightmost leaf of the B+ Tree to find the maximum salary, and then performs a second $O(1)$ index seek to find the first entry strictly less than it.

---

### Edge-Case Behavior Matrix

| Edge-Case Scenario | Table State | Expected Return | Solution 1 Result | Solution 2 Result |
| :--- | :--- | :---: | :---: | :---: |
| **Distinct Salaries** | `[100, 90, 80]` | `90` | `90` | `90` |
| **Tied Top Salaries** | `[100, 100, 90]` | `90` | `90` | `90` |
| **Single Employee** | `[100]` | `NULL` | `NULL` | `NULL` (via `MAX`) |
| **All Salaries Identical**| `[100, 100, 100]` | `NULL` | `NULL` | `NULL` (via `MAX`) |
| **Empty Table** | `[]` | `NULL` | `NULL` | `NULL` |

---

### The Interview Answer (60-90 seconds)

> "To find the second highest salary without `LIMIT` or `OFFSET`, the canonical ANSI SQL solution is `SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee)`.
>
> This solution handles ties cleanly: if the top salary is tied across multiple rows, the subquery returns that top value, and the outer query seeks the maximum strictly below it. Furthermore, if the table has only one employee or is completely empty, evaluating `MAX()` over zero matching rows evaluates to `NULL`, cleanly satisfying edge-case contracts.
>
> In modern SQL engines, this can also be solved using `DENSE_RANK() OVER (ORDER BY salary DESC)` inside a CTE, filtering where `rnk = 2`. `DENSE_RANK()` is mandatory over `RANK()` or `ROW_NUMBER()` because it assigns identical ranks to duplicate salaries without creating gaps in the ranking sequence.
>
> In terms of execution complexity, if the `salary` column is indexed with a B+ Tree, the `MAX()` subquery executes in $O(1)$ time via two rightmost leaf index seeks, vastly outperforming window functions."

---

### Code Demonstration: Verifying All Solutions Across Edge Cases

The following Python script tests Solution 1 and Solution 2 in SQLite across duplicate top salaries, single-row tables, and empty tables.

```python
import sqlite3

def test_salary_queries():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    cursor.execute("CREATE TABLE Employee (id INT PRIMARY KEY, salary INT);")

    def run_queries(scenario_name):
        print(f"\n--- Testing Scenario: {scenario_name} ---")
        # Solution 1: MAX() Subquery
        cursor.execute("""
            SELECT MAX(salary) AS SecondHighestSalary
            FROM Employee
            WHERE salary < (SELECT MAX(salary) FROM Employee);
        """)
        sol1 = cursor.fetchone()[0]

        # Solution 2: DENSE_RANK() CTE
        cursor.execute("""
            WITH Ranked AS (
                SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rnk
                FROM Employee
            )
            SELECT MAX(salary) AS SecondHighestSalary
            FROM Ranked
            WHERE rnk = 2;
        """)
        sol2 = cursor.fetchone()[0]

        print(f"  Solution 1 (MAX Subquery): {sol1}")
        print(f"  Solution 2 (DENSE_RANK) : {sol2}")

    # Case 1: Duplicate Top Salaries
    cursor.executemany("INSERT INTO Employee VALUES (?, ?);",
                       [(1, 100), (2, 100), (3, 80), (4, 70)])
    conn.commit()
    run_queries("Duplicate Top Salaries [100, 100, 80, 70]")

    # Case 2: Single Employee (Must return None / NULL)
    cursor.execute("DELETE FROM Employee;")
    cursor.execute("INSERT INTO Employee VALUES (1, 100);")
    conn.commit()
    run_queries("Single Employee [100]")

    # Case 3: Empty Table (Must return None / NULL)
    cursor.execute("DELETE FROM Employee;")
    conn.commit()
    run_queries("Empty Table []")

    conn.close()

if __name__ == "__main__":
    test_salary_queries()
```
