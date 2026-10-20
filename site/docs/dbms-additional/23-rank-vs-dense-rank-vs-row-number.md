---
id: 23-rank-vs-dense-rank-vs-row-number
title: "RANK() vs. DENSE_RANK() vs. ROW_NUMBER()"
description: "Compare SQL window ranking functions - how each one handles ties, whether it leaves gaps, and how to find the top N per group."
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()` in SQL? How does each handle duplicate ties, why can't window functions be filtered in a `WHERE` clause, and how do you find the top 2 highest earners per department?"

All three number the rows in a group. The only question is: **what happens when two rows tie?**

<Diagram>
<Row>
<Box title="ROW_NUMBER()" accent="#60a5fa">
<Field icon="🔢" code="1, 2, 3, 4" hint="ties broken arbitrarily — always unique" variant="neutral" />
</Box>
<Box title="RANK()" accent="#f59e0b">
<Field icon="🥇" code="1, 2, 2, 4" hint="ties share a rank, but leaves a gap after" variant="neutral" />
</Box>
<Box title="DENSE_RANK()" accent="#34d399">
<Field icon="🥈" code="1, 2, 2, 3" hint="ties share a rank, no gap after" variant="neutral" />
</Box>
</Row>
</Diagram>

Input scores: `[100, 90, 90, 80]`.

- **`ROW_NUMBER()`** doesn't care about ties at all - every row gets a unique, sequential number: `1, 2, 3, 4`. Good for pagination, or picking exactly one row per group (`WHERE rn = 1`).
- **`RANK()`** gives tied rows the same number, like Olympic medals - two people can share silver. But then it skips ahead: `1, 2, 2, 4` (notice there's no `3`). Good for leaderboards where you want "how many people beat me" to show through as a gap.
- **`DENSE_RANK()`** also gives tied rows the same number, but doesn't skip anything afterward: `1, 2, 2, 3`. This is what you want when you're looking for "the Nth *distinct* value" - like the second-highest salary.

---

### Seeing it on real data

```sql
SELECT
    name,
    salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
    RANK()       OVER (ORDER BY salary DESC) AS rnk,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM Employees;
```

| Name | Salary | `ROW_NUMBER()` | `RANK()` | `DENSE_RANK()` | What's happening |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Alice** | \$100,000 | **1** | **1** | **1** | Only one at the top |
| **Bob** | \$80,000 | **2** | **2** | **2** | Tied for 2nd |
| **Charlie** | \$80,000 | **3** | **2** | **2** | Tied for 2nd |
| **David** | \$70,000 | **4** | **4** | **3** | `RANK()` jumps to 4; `DENSE_RANK()` moves to 3 |
| **Emma** | \$60,000 | **5** | **5** | **4** | Dense sequence keeps counting without skipping |

---

### A trap: `ROW_NUMBER()` on tied rows is non-deterministic

If you call `ROW_NUMBER() OVER (ORDER BY salary DESC)` and two rows have the exact same salary, the database is free to assign `2` to Bob and `3` to Charlie this time, and swap them the next time you run the same query. It's not a bug - there's just nothing in your `ORDER BY` telling it how to break the tie.

**The fix:** always add a unique tie-breaker column:

```sql
ROW_NUMBER() OVER (ORDER BY salary DESC, employee_id ASC)
```

---

### Why you can't filter on these in `WHERE`

This looks reasonable, but it's a syntax error:

```sql
-- SYNTAX ERROR: window functions aren't allowed here
SELECT name, salary FROM Employees WHERE DENSE_RANK() OVER (ORDER BY salary DESC) <= 2;
```

The reason comes down to the order SQL actually runs in:

1. `FROM` / `JOIN`
2. `WHERE` — filters raw table rows
3. `GROUP BY`
4. `HAVING`
5. `SELECT`
6. **window functions run here** — after filtering, after grouping
7. `ORDER BY`
8. `LIMIT`

`WHERE` runs in step 2. Window functions aren't computed until step 6. So by the time `WHERE` checks its condition, `DENSE_RANK()` doesn't exist yet - there's nothing to compare against. You have to compute the rank first (in a CTE or subquery), then filter on it from the outside.

---

### The classic follow-up: top 2 earners per department

```sql
WITH RankedDepartmentSalaries AS (
    SELECT
        department_id,
        name,
        salary,
        DENSE_RANK() OVER (
            PARTITION BY department_id
            ORDER BY salary DESC
        ) AS rnk
    FROM Employees
)
SELECT department_id, name, salary, rnk
FROM RankedDepartmentSalaries
WHERE rnk <= 2
ORDER BY department_id, rnk;
```

`PARTITION BY department_id` resets the ranking inside each department, so "top 2" means top 2 *per department*, not overall.

---

### Say this in the interview

*"All three number rows within a partition, and they only differ in how they treat ties. `ROW_NUMBER()` ignores ties and always hands out unique numbers - so it needs a deterministic `ORDER BY` or the results can shuffle between runs. `RANK()` gives tied rows the same number but then skips ahead, leaving a gap. `DENSE_RANK()` gives tied rows the same number with no gap, so it's the right one for 'find the Nth highest distinct value.' And because window functions are computed after `WHERE` has already run, you can't filter on them directly - you wrap the query in a CTE and filter from outside."*

---

### Checking this yourself: ranking and top-N per group in SQLite

```python
import sqlite3

def run_ranking_demo():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE Employees (
            emp_id INT PRIMARY KEY,
            name TEXT,
            dept_id INT,
            salary INT
        );
    """)

    cursor.executemany("INSERT INTO Employees VALUES (?, ?, ?, ?);", [
        (1, 'Alice',   10, 100000),
        (2, 'Bob',     10, 80000),
        (3, 'Charlie', 10, 80000),
        (4, 'David',   10, 70000),
        (5, 'Eve',     20, 120000),
        (6, 'Frank',   20, 95000),
        (7, 'Grace',   20, 95000)
    ])
    conn.commit()

    print("--- 1. Comparing Ranking Functions (Department 10) ---")
    cursor.execute("""
        SELECT
            name, salary,
            ROW_NUMBER() OVER (ORDER BY salary DESC, emp_id ASC) as rn,
            RANK()       OVER (ORDER BY salary DESC) as rk,
            DENSE_RANK() OVER (ORDER BY salary DESC) as dr
        FROM Employees
        WHERE dept_id = 10;
    """)
    print(f"{'Name':<10} | {'Salary':<7} | {'ROW_NUM':<7} | {'RANK':<5} | {'DENSE_RANK':<10}")
    print("-" * 50)
    for row in cursor.fetchall():
        print(f"{row[0]:<10} | ${row[1]:<6} | {row[2]:<7} | {row[3]:<5} | {row[4]:<10}")

    print("\n--- 2. Querying Top 2 Highest Earners Per Department ---")
    cursor.execute("""
        WITH DepartmentRanks AS (
            SELECT
                dept_id, name, salary,
                DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as rnk
            FROM Employees
        )
        SELECT dept_id, name, salary, rnk
        FROM DepartmentRanks
        WHERE rnk <= 2
        ORDER BY dept_id, rnk;
    """)
    print(f"{'Dept':<5} | {'Name':<10} | {'Salary':<7} | {'Rank':<5}")
    print("-" * 35)
    for row in cursor.fetchall():
        print(f"{row[0]:<5} | {row[1]:<10} | ${row[2]:<6} | {row[3]:<5}")

    conn.close()

if __name__ == "__main__":
    run_ranking_demo()
```
