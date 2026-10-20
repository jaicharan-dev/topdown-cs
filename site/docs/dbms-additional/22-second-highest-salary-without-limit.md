---
id: 22-second-highest-salary-without-limit
title: "Second Highest Salary Without LIMIT or OFFSET"
description: "Solve the classic SQL problem: find the second highest salary without LIMIT or OFFSET, handling ties and empty tables correctly."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Write a SQL query to find the second highest salary from an Employee table without using `LIMIT` or `OFFSET`. How do you handle duplicate ties and empty tables (returning `NULL`), and what are the performance differences between `MAX()` and `DENSE_RANK()` with an index on salary?"

`ORDER BY salary DESC LIMIT 1 OFFSET 1` would solve this in one line - which is exactly why interviewers ban it. They want to see if you can reason about ties, empty tables, and how the database actually finds "second highest" without a shortcut.

---

### Solution 1: `MAX()` with a subquery (the simple, portable answer)

```sql
SELECT MAX(salary) AS SecondHighestSalary
FROM Employee
WHERE salary < (
    SELECT MAX(salary)
    FROM Employee
);
```

The inner query finds the highest salary. The outer query then finds the highest salary that's *strictly less* than that.

Why this handles the tricky cases well:
- **Ties at the top:** if three people share the top salary of \$120,000, the inner query still returns \$120,000 just once. The outer query asks for the max below that, so it correctly skips past all three tied rows.
- **Not enough data:** if the table has only one employee (or none), nothing satisfies `salary < MAX`. Asking for `MAX()` of an empty result in SQL just gives you `NULL` - no `COALESCE` or `IFNULL` needed, it falls out naturally.

---

### Solution 2: `DENSE_RANK()` (the modern, window-function answer)

Works in PostgreSQL, MySQL 8.0+, SQL Server, and Oracle:

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

Why `DENSE_RANK()` specifically, and not the other two ranking functions? Picture two employees tied for the top salary:

- `ROW_NUMBER()` would hand out `1` and `2` to those two tied rows arbitrarily - so `WHERE rnk = 2` could return the *highest* salary by accident.
- `RANK()` gives both of them `1`, then jumps straight to `3` for the next salary (`1, 1, 3`) - so `WHERE rnk = 2` returns nothing.
- `DENSE_RANK()` gives both of them `1`, and the next *distinct* salary gets `2` (`1, 1, 2`) - exactly what you want.

Wrapping the result in `MAX(salary)` also gives you `NULL` instead of an empty result set when there's only one distinct salary in the table.

---

### Solution 3: generalizing to the Nth highest salary

If you need any arbitrary rank `N`, not just 2, a correlated subquery works without window functions:

```sql
SELECT e1.salary AS NthHighestSalary
FROM Employee e1
WHERE (N - 1) = (
    SELECT COUNT(DISTINCT e2.salary)
    FROM Employee e2
    WHERE e2.salary > e1.salary
);
```

For `N = 2`: find the salary where exactly 1 distinct salary is strictly higher than it.

---

### How fast is each one, with an index on `salary`?

| | Solution 1: `MAX()` subquery | Solution 2: `DENSE_RANK()` | Solution 3: correlated subquery |
| :--- | :--- | :--- | :--- |
| **No index** | Scans the table twice | Sorts every row | Nested loop over every pair of rows - slowest by far |
| **With a B-Tree index on salary** | **Two quick index jumps - fastest** | Streams through the index in order | Still does a sort per row |
| **Memory use** | Minimal | Higher — has to buffer the window | Minimal |
| **Portability** | Works everywhere, plain ANSI SQL | Needs window-function support (SQL:2003+) | Works everywhere, plain ANSI SQL |

With an index on `salary`, Solution 1 is the clear winner: the database can jump straight to the highest value in the B-Tree, then jump again to the first value just below it - two quick lookups, no scanning required.

---

### Edge cases, side by side

| Scenario | Table | Expected | Solution 1 | Solution 2 |
| :--- | :--- | :---: | :---: | :---: |
| Distinct salaries | `[100, 90, 80]` | `90` | `90` | `90` |
| Tied top salaries | `[100, 100, 90]` | `90` | `90` | `90` |
| Single employee | `[100]` | `NULL` | `NULL` | `NULL` |
| All salaries identical | `[100, 100, 100]` | `NULL` | `NULL` | `NULL` |
| Empty table | `[]` | `NULL` | `NULL` | `NULL` |

---

### Say this in the interview

*"Without `LIMIT`/`OFFSET`, the cleanest answer is `SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee)`. It handles ties automatically, since `MAX()` collapses duplicates into one value, and it returns `NULL` naturally when there's no valid second value - because `MAX()` over zero rows is `NULL` in SQL. The modern alternative is `DENSE_RANK() OVER (ORDER BY salary DESC)` inside a CTE, filtered to `rnk = 2` - and it has to be `DENSE_RANK()`, not `RANK()` or `ROW_NUMBER()`, because only `DENSE_RANK()` gives tied values the same rank without leaving gaps. With an index on salary, the `MAX()` subquery is also the fastest option — just two index lookups."*

---

### Checking this yourself: edge cases in SQLite

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
