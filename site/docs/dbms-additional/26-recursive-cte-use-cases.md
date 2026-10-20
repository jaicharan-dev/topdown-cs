---
id: 26-recursive-cte-use-cases
title: "Recursive CTEs: Tree Traversals & Roll-Up Budgets"
description: "How WITH RECURSIVE actually executes, tree traversals, cycle detection, BFS vs. DFS ordering, and cumulative budget roll-ups."
sidebar_position: 12
sidebar_class_name: sidebar-hard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is a recursive CTE in SQL, and how does it execute under the hood? Write a query to traverse an organizational tree, explain how to compute a cumulative roll-up budget across a whole subordinate hierarchy, and how do you guard against infinite loops?"

A recursive CTE is just a loop, written in SQL: start with a base case, then repeatedly feed the last batch of results back into the same query, until nothing new comes out. It's built for data where you don't know the depth up front:

- **Org charts** — CEO down to individual contributors, any number of levels.
- **Bill of materials** — Car → Engine → Piston → Ring.
- **Category trees** — Electronics → Computers → Laptops.
- **Graph paths** — friends-of-friends, flight layovers.

---

### The shape every recursive CTE has

Three pieces, joined with `UNION ALL`:

```sql
WITH RECURSIVE HierarchyCTE AS (
    -- 1. ANCHOR: the starting point, runs once
    SELECT id, name, manager_id, 1 AS level, CAST(name AS VARCHAR(255)) AS path
    FROM Employees
    WHERE manager_id IS NULL -- start at the CEO

    UNION ALL

    -- 2. RECURSIVE STEP: feeds off the CTE's own last output
    SELECT e.id, e.name, e.manager_id, h.level + 1, CAST(h.path || ' -> ' || e.name AS VARCHAR(255))
    FROM Employees e
    INNER JOIN HierarchyCTE h ON e.manager_id = h.id
)
-- 3. it stops on its own once the recursive step returns 0 rows
SELECT * FROM HierarchyCTE ORDER BY level, id;
```

---

### How it actually runs, step by step

There's no real recursion or call stack happening inside the engine. It's a loop around one "working batch" of rows:

<Diagram>
<Row>
<Box title="1. Anchor" accent="#60a5fa">
<Field icon="🌱" code="SELECT ... WHERE manager_id IS NULL" hint="runs once, seeds the result" variant="neutral" />
</Box>
<Arrow label="feed rows back in" />
<Box title="2. Recursive step" accent="#34d399">
<Field icon="🔁" code="JOIN HierarchyCTE" hint="joins against last batch only, repeats" variant="neutral" />
</Box>
<Arrow label="0 new rows" />
<Box title="3. Stop" accent="#fb7185">
<Field icon="🏁" code="return accumulated rows" variant="neutral" />
</Box>
</Row>
</Diagram>

1. **Anchor runs once.** Its rows go both into the final result and into a "working batch."
2. **Loop:** join the base table against the *current working batch only* (not the whole result so far). Any new rows found get added to the final result, and become the *next* working batch.
3. **Stop:** the moment a round of the loop produces zero new rows, it's done - there's nothing left to feed back in.

---

### Ordering the output: top-down vs. branch-by-branch

- **Breadth-first (level by level):** show every VP, then every director, then every manager:
  ```sql
  ORDER BY level ASC, name ASC;
  ```
- **Depth-first (branch by branch):** show a manager immediately followed by their whole sub-tree, before moving to the next peer:
  ```sql
  -- order by the breadcrumb path string built up during recursion
  ORDER BY path ASC;
  ```

---

### A real use case: rolling up budgets

> **Classic follow-up:** *"Find each manager's total org budget - their own salary, plus the combined salaries of everyone under them, at every level."*

```sql
WITH RECURSIVE SubordinateTree AS (
    -- Anchor: everyone "reports to themselves" at level 0
    SELECT id AS manager_id, id AS employee_id, salary
    FROM Employees

    UNION ALL

    -- Recursive: pull in everyone further down the chain
    SELECT st.manager_id, e.id AS employee_id, e.salary
    FROM SubordinateTree st
    JOIN Employees e ON e.manager_id = st.employee_id
)
SELECT
    mgr.name AS Manager,
    mgr.salary AS BaseSalary,
    SUM(st.salary) AS CumulativeBudget,
    COUNT(st.employee_id) - 1 AS TotalSubordinatesCount
FROM SubordinateTree st
JOIN Employees mgr ON mgr.id = st.manager_id
GROUP BY mgr.id, mgr.name, mgr.salary
ORDER BY CumulativeBudget DESC;
```

The trick here: the anchor includes every employee pointing at *themselves*, so when you sum salaries grouped by manager, each manager's own salary is already folded in.

---

### Guarding against infinite loops

If the data has a cycle - Alice reports to Bob, but Bob is accidentally set to report to Alice - the loop never produces zero new rows, and it'll keep running until it eats all available memory.

Two ways to defend against this:

1. **Set a recursion depth limit.** In SQL Server: `OPTION (MAXRECURSION 100)`.
2. **Track visited nodes and stop if you see a repeat** (PostgreSQL and ANSI SQL):

```sql
WITH RECURSIVE SafeHierarchy AS (
    SELECT id, name, manager_id, ARRAY[id] AS visited_path
    FROM Employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, visited_path || e.id
    FROM Employees e
    JOIN SafeHierarchy s ON e.manager_id = s.id
    WHERE NOT (e.id = ANY(s.visited_path)) -- stop if this node was already visited
)
```

---

### Say this in the interview

*"A recursive CTE uses `WITH RECURSIVE` to walk hierarchical or graph-shaped data of unknown depth. It isn't true recursion under the hood - the engine runs the anchor query once to seed a working batch, then repeatedly joins the base table against just that batch, adding new rows to the result and replacing the batch, until a round produces zero new rows. I'd use this for org charts, category trees, or cumulative roll-ups like total payroll under a manager. The real risk is a cycle in the data causing an infinite loop - so in production you either cap the recursion depth or track visited node IDs and stop once you see a repeat."*

---

### Checking this yourself: tree traversal and budget roll-up in SQLite

```python
import sqlite3

def run_recursive_demo():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE Employees (
            id INT PRIMARY KEY,
            name TEXT,
            salary INT,
            manager_id INT
        );
    """)

    # Hierarchy:
    # 1. Alice (CEO, 100k)
    #    -> 2. Bob (VP Eng, 80k)
    #         -> 4. David (Staff Eng, 60k)
    #         -> 5. Emma (Senior Eng, 50k)
    #    -> 3. Charlie (VP Sales, 75k)
    cursor.executemany("INSERT INTO Employees VALUES (?, ?, ?, ?);", [
        (1, 'Alice',   100000, None),
        (2, 'Bob',     80000,  1),
        (3, 'Charlie', 75000,  1),
        (4, 'David',   60000,  2),
        (5, 'Emma',    50000,  2)
    ])
    conn.commit()

    print("--- 1. Hierarchical Tree Traversal with Breadcrumb Path ---")
    cursor.execute("""
        WITH RECURSIVE OrgChart AS (
            SELECT id, name, manager_id, 1 AS level, name AS path
            FROM Employees
            WHERE manager_id IS NULL

            UNION ALL

            SELECT e.id, e.name, e.manager_id, o.level + 1, o.path || ' -> ' || e.name
            FROM Employees e
            JOIN OrgChart o ON e.manager_id = o.id
        )
        SELECT level, name, path FROM OrgChart ORDER BY level, id;
    """)
    for row in cursor.fetchall():
        print(f"Level {row[0]} | {row[1]:<8} | Path: {row[2]}")

    print("\n--- 2. Cumulative Roll-Up Budget per Manager ---")
    cursor.execute("""
        WITH RECURSIVE SubordinateTree AS (
            SELECT id AS manager_id, id AS employee_id, salary
            FROM Employees
            UNION ALL
            SELECT st.manager_id, e.id, e.salary
            FROM SubordinateTree st
            JOIN Employees e ON e.manager_id = st.employee_id
        )
        SELECT
            mgr.name,
            mgr.salary AS base_salary,
            SUM(st.salary) AS total_cumulative_budget,
            COUNT(st.employee_id) - 1 AS subordinates_count
        FROM SubordinateTree st
        JOIN Employees mgr ON mgr.id = st.manager_id
        GROUP BY mgr.id, mgr.name, mgr.salary
        ORDER BY total_cumulative_budget DESC;
    """)
    for row in cursor.fetchall():
        print(f"Manager: {row[0]:<8} | Base: ${row[1]:<7} | Total Roll-Up Budget: ${row[2]:<7} | Direct/Indirect Subordinates: {row[3]}")

    conn.close()

if __name__ == "__main__":
    run_recursive_demo()
```
