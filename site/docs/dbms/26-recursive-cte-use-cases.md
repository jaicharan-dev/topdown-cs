---
id: 26-recursive-cte-use-cases
title: "Recursive CTEs: Mechanics and Real-World Use Cases"
description: "Master recursive SQL queries using WITH RECURSIVE, organizational chart traversals, bill-of-materials, and termination safeguards."
sidebar_position: 26
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is a recursive CTE in SQL, how does it work internally, and when would you use it? Write a query to traverse an organizational hierarchy tree."

A **Recursive Common Table Expression (CTE)** is an advanced SQL construct that references itself in an iterative loop. It is the relational database solution for querying **hierarchical, tree-structured, or graph-structured data** of arbitrary or unknown depth.

---

### Real-World Use Cases
1. **Organizational Hierarchies:** Finding all managers, subordinates, and reporting chains up to the CEO.
2. **Category / Taxonomy Trees:** E-commerce categories (Electronics  ->  Computers  ->  Laptops  ->  Gaming Laptops).
3. **Bill of Materials (BOM):** Manufacturing assemblies (A car contains an engine; an engine contains pistons; a piston contains rings).
4. **Network & Graph Traversal:** Social friend-of-a-friend networks, flight layover routes, and shortest-path routing.

---

### Anatomy of a Recursive CTE

Every recursive CTE consists of three mandatory components bound by `UNION ALL`:

```sql
WITH RECURSIVE HierarchyCTE AS (
    -- 1. ANCHOR MEMBER: The base case (executes ONCE to seed the initial rows)
    SELECT id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL -- Starts at the CEO

    UNION ALL

    -- 2. RECURSIVE MEMBER: References HierarchyCTE (iterates until empty)
    SELECT e.id, e.name, e.manager_id, h.level + 1
    FROM employees e
    INNER JOIN HierarchyCTE h ON e.manager_id = h.id
)
-- 3. TERMINATION: Loop halts automatically when the recursive member returns 0 rows
SELECT * FROM HierarchyCTE ORDER BY level, id;
```

---

### Step-by-Step Internal Execution

Suppose we have this company structure:
- Alice (CEO, `id=1, manager_id=NULL`)
- Bob (VP, `id=2, manager_id=1`)
- Charlie (Director, `id=3, manager_id=2`)
- David (Engineer, `id=4, manager_id=3`)

```
Iteration 0 (Anchor Step):
Database evaluates the Anchor query:
Queue = [ {id: 1, name: 'Alice', level: 1} ]

Iteration 1:
Join employees against Queue (Alice id=1). Finds Alice's direct reports:
Queue = [ {id: 2, name: 'Bob', level: 2} ]

Iteration 2:
Join employees against Queue (Bob id=2). Finds Bob's direct reports:
Queue = [ {id: 3, name: 'Charlie', level: 3} ]

Iteration 3:
Join employees against Queue (Charlie id=3). Finds Charlie's direct reports:
Queue = [ {id: 4, name: 'David', level: 4} ]

Iteration 4:
Join employees against Queue (David id=4). David has no subordinates!
Queue = [ ] (Empty set!)

Halting Condition:
The recursive step produced 0 rows. The loop terminates!
Result set combines all iterations via UNION ALL.
```

---

### Generating Number Sequences on the Fly

Recursive CTEs can generate test data or calendar date ranges without requiring pre-populated numbers tables:

```sql
-- Generate integers 1 through 10
WITH RECURSIVE NumberSeries AS (
    SELECT 1 AS n              -- Anchor
    UNION ALL
    SELECT n + 1 FROM NumberSeries WHERE n < 10 -- Recursive filter
)
SELECT n FROM NumberSeries;
```

---

### The ELI5 Analogy: Russian Nesting Dolls

Imagine you are given a giant Russian wooden doll:
- **Anchor Member:** You open the outer giant doll. Inside, you find a smaller doll.
- **Recursive Member:** You open that smaller doll. Inside, you find an even smaller doll. You repeat this exact same action on whatever doll just came out.
- **Termination Safeguard:** You finally reach a tiny solid wooden doll that cannot be opened. The process stops.

---

### Summary
"A recursive CTE uses an Anchor query to seed initial rows, combined via UNION ALL with a Recursive query that repeatedly joins against the CTE result set until an empty set terminates the loop. It is essential for traversing tree and graph hierarchies of unknown depth."

---

### Crucial Nuance: The Infinite Loop Trap (Cycles in Data)
If your graph data contains a **cycle** (e.g., Employee A reports to Employee B, but Employee B mistakenly reports to Employee A), a recursive CTE will enter an **infinite loop**, consuming 100% CPU and memory until the database crashes!
- In SQL Server, queries default to `MAXRECURSION 100`.
- In PostgreSQL, you can detect cycles using an array tracking visited IDs:
```sql
WITH RECURSIVE SearchPath AS (
    SELECT id, name, ARRAY[id] AS path_visited
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, path_visited || e.id
    FROM employees e
    JOIN SearchPath s ON e.manager_id = s.id
    WHERE NOT (e.id = ANY(s.path_visited)) -- Breaks infinite cycles!
)
```
