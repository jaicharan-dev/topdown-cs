---
id: 24-employees-earning-more-than-manager
title: "SQL Self-Joins: Employees Earning More Than Managers"
description: "Solve the classic self-join interview question: find employees who earn more than their direct managers, how the optimizer runs the join, and recursive follow-ups."
sidebar_position: 10
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given an Employee table containing `(id, name, salary, manager_id)`, write a query to find all employees who earn more than their direct manager. How does the query optimizer execute this self-join physically, what index should you create, and how would you find employees earning more than ANY manager in their entire upstream chain?"

### The setup

Table: `Employee`
- `id` — primary key
- `name`
- `salary`
- `manager_id` — points back to another row's `id` in the same table (nullable, for whoever has no manager)

Employees reporting to managers is really the same table pointing at itself. To compare an employee to their manager, you join the table to a second copy of itself, using two aliases - `emp` for the employee, `mgr` for the manager:

<Diagram>
<Row>
<Box title="emp (employee)" accent="#60a5fa">
<Field icon="🧑" code="Alice, mgr_id=3, sal=120k" variant="neutral" />
<Field icon="🧑" code="Bob, mgr_id=3, sal=70k" variant="neutral" />
</Box>
<Arrow label="emp.manager_id = mgr.id" />
<Box title="mgr (manager)" accent="#34d399">
<Field icon="👔" code="Charlie, id=3, sal=90k" variant="neutral" />
</Box>
</Row>
</Diagram>

Same physical table, read twice, under two different names - that's a **self-join**.

---

### Solution 1: `INNER JOIN` (the one to actually use)

```sql
SELECT
    emp.name AS Employee,
    emp.salary AS EmpSalary,
    mgr.name AS Manager,
    mgr.salary AS MgrSalary
FROM Employee emp
INNER JOIN Employee mgr
    ON emp.manager_id = mgr.id
WHERE emp.salary > mgr.salary;
```

What happens:
1. The join matches each employee row to their manager's row.
2. If someone has no manager (`manager_id IS NULL` — the CEO, say), the join condition `NULL = mgr.id` is never true, so that row is automatically dropped. You don't need to write a separate check for it.
3. `WHERE emp.salary > mgr.salary` keeps only the rows where the employee out-earns their own manager.

---

### Solution 2: correlated subquery (works, but slower)

```sql
SELECT emp.name AS Employee
FROM Employee emp
WHERE emp.manager_id IS NOT NULL
  AND emp.salary > (
      SELECT mgr.salary
      FROM Employee mgr
      WHERE mgr.id = emp.manager_id
  );
```

This gets the same answer, but the join version is usually better. A join lets the optimizer pick an efficient set-based strategy (hashing, merging). A correlated subquery often forces a row-by-row lookup instead — fine on a small table, slow on a large one.

---

### How the database actually runs the join

Under the hood, the optimizer picks one of three strategies for `emp.manager_id = mgr.id`:

1. **Nested Loop:** for each row in `emp`, look up the matching `mgr.id` directly. Works well on small tables, or when the outer side is already filtered down to a few rows.
2. **Hash Join:** scan `Employee` once, build an in-memory hash table keyed on `id`, then probe it with every `manager_id`. Scales well on large, unsorted tables.
3. **Merge Join:** if both sides are already sorted on the join key (say, via a clustered index), step through them together like merging two sorted lists.

---

### What index to add

On a table with millions of rows, scanning `emp` to filter on `manager_id` is slow without an index. The right index:

```sql
CREATE INDEX idx_emp_mgr_salary ON Employee (manager_id, salary);
```

`manager_id` first lets the database skip `NULL`s (people with no manager) immediately. Including `salary` means the query never has to go back to the table at all — a covering, index-only scan.

---

### Follow-up: what about the whole chain, not just the direct manager?

> **Common next question:** *"This only checks one level up. What if I want employees earning more than ANY manager above them, all the way to the CEO?"*

The chain can be any number of levels deep, so a plain join can't do it — you need a **recursive CTE** to walk up the tree level by level:

```sql
WITH RECURSIVE ManagementChain AS (
    -- 1. Anchor: direct manager relationships (level 1)
    SELECT
        emp.id AS emp_id,
        emp.name AS emp_name,
        emp.salary AS emp_salary,
        mgr.id AS manager_id,
        mgr.name AS manager_name,
        mgr.salary AS manager_salary,
        1 AS depth
    FROM Employee emp
    JOIN Employee mgr ON emp.manager_id = mgr.id

    UNION ALL

    -- 2. Recursive step: climb one more level up the tree
    SELECT
        mc.emp_id,
        mc.emp_name,
        mc.emp_salary,
        upper_mgr.id,
        upper_mgr.name,
        upper_mgr.salary,
        mc.depth + 1
    FROM ManagementChain mc
    JOIN Employee upper_mgr ON mc.manager_id = upper_mgr.id
)
SELECT DISTINCT emp_name, emp_salary, manager_name, manager_salary, depth
FROM ManagementChain
WHERE emp_salary > manager_salary;
```

(See [Recursive CTEs](/docs/dbms-additional/26-recursive-cte-use-cases) for how this iteration actually works under the hood.)

---

### Say this in the interview

*"To find employees earning more than their direct manager, self-join Employee to itself: `FROM Employee emp JOIN Employee mgr ON emp.manager_id = mgr.id WHERE emp.salary > mgr.salary`. An inner join handles people with no manager for free, because comparing `NULL` to anything is never true. For indexing, `(manager_id, salary)` lets the engine skip NULLs and answer the query entirely from the index. If I need the whole upstream chain instead of just the direct manager, a static join can't do it since the depth is unknown — that needs a recursive CTE that walks up one level at a time."*

---

### Checking this yourself: direct join vs. full chain in SQLite

```python
import sqlite3

def test_manager_queries():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE Employee (
            id INT PRIMARY KEY,
            name TEXT,
            salary INT,
            manager_id INT
        );
    """)

    # Organization:
    # Alice (CEO, sal=100k)
    #   -> Bob (VP, sal=80k)
    #        -> Charlie (Principal Eng, sal=110k) -- Earns more than Bob (Direct) AND Alice (CEO)!
    #        -> David (Junior Eng, sal=60k)
    cursor.executemany("INSERT INTO Employee VALUES (?, ?, ?, ?);", [
        (1, 'Alice',   100000, None),
        (2, 'Bob',     80000,  1),
        (3, 'Charlie', 110000, 2),
        (4, 'David',   60000,  2)
    ])
    conn.commit()

    print("--- 1. Direct Manager Self-Join (Level 1) ---")
    cursor.execute("""
        SELECT
            emp.name AS Employee,
            emp.salary AS EmpSalary,
            mgr.name AS Manager,
            mgr.salary AS MgrSalary
        FROM Employee emp
        INNER JOIN Employee mgr ON emp.manager_id = mgr.id
        WHERE emp.salary > mgr.salary;
    """)
    for row in cursor.fetchall():
        print(f"Employee {row[0]} (${row[1]:,}) earns more than direct manager {row[2]} (${row[3]:,})")

    print("\n--- 2. Multi-Level Recursive Chain Traversal ---")
    cursor.execute("""
        WITH RECURSIVE ManagementChain AS (
            SELECT
                emp.id AS emp_id,
                emp.name AS emp_name,
                emp.salary AS emp_salary,
                mgr.id AS manager_id,
                mgr.name AS manager_name,
                mgr.salary AS manager_salary,
                1 AS depth
            FROM Employee emp
            JOIN Employee mgr ON emp.manager_id = mgr.id

            UNION ALL

            SELECT
                mc.emp_id,
                mc.emp_name,
                mc.emp_salary,
                upper_mgr.id,
                upper_mgr.name,
                upper_mgr.salary,
                mc.depth + 1
            FROM ManagementChain mc
            JOIN Employee upper_mgr ON mc.manager_id = upper_mgr.id
            WHERE upper_mgr.id IS NOT NULL
        )
        SELECT emp_name, emp_salary, manager_name, manager_salary, depth
        FROM ManagementChain
        WHERE emp_salary > manager_salary;
    """)
    for row in cursor.fetchall():
        print(f"{row[0]} (${row[1]:,}) earns more than upstream manager {row[2]} (${row[3]:,}) [Level {row[4]} above]")

    conn.close()

if __name__ == "__main__":
    test_manager_queries()
```
