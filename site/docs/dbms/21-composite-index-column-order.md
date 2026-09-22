---
id: 21-composite-index-column-order
title: "Composite Indexes: Why Column Order Matters"
description: "Understand the Leftmost Prefix Rule in composite B-Tree indexes, range query cliffs, and index sorting strategy."
sidebar_position: 21
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Does column order matter in a composite index on (department_id, salary)? Can a query filtering only on salary use this index?"

In a composite (multi-column) B-Tree index, **column order matters immensely**. A composite index does not sort columns independently; it sorts data hierarchically following the **Leftmost Prefix Rule**.

Creating an index on `(department_id, salary)` is **not** the same as creating an index on `(salary, department_id)`.

---

### How Composite B-Trees Are Sorted Internally

In an index on `(department_id, salary)`, rows are sorted strictly by `department_id` first. Within rows that share the exact same `department_id`, they are sorted by `salary`:

```
Index Page on (department_id, salary):
(Dept: 10, Salary: 40000)
(Dept: 10, Salary: 55000)
(Dept: 10, Salary: 90000)
-------------------------
(Dept: 20, Salary: 30000)
(Dept: 20, Salary: 65000)
-------------------------
(Dept: 30, Salary: 45000)
(Dept: 30, Salary: 120000)
```

Look closely at the `salary` column above:
- Across the entire index, salaries are: `40000, 55000, 90000, 30000, 65000, 45000, 120000`.
- **The salaries are completely unsorted globally!** They are only sorted locally within each department.

---

### The Leftmost Prefix Rule Evaluated

Given index `CREATE INDEX idx_dept_sal ON employees (department_id, salary);`:

| Query Pattern | Can It Use `idx_dept_sal`? | Why? |
| :--- | :---: | :--- |
| `WHERE department_id = 10 AND salary = 55000` | **YES** | Matches the full prefix leading left-to-right |
| `WHERE department_id = 10` | **YES** | Matches the leftmost column prefix |
| `WHERE department_id = 10 AND salary > 50000` | **YES** | Finds Dept 10 via seek, scans sorted salaries sequentially |
| `WHERE salary = 55000` | **NO (Index Seek)** | Cannot seek! Salaries are unsorted globally across departments |
| `WHERE salary > 50000` | **NO (Index Seek)** | Must perform a full table scan (or full index scan) |

---

### The Range Query Cliff

A composite index can only use index seeking for columns **up to and including the first range/inequality filter (`<`, `>`, `BETWEEN`, `LIKE 'A%'`)**. Any columns positioned *after* a range filter cannot be used for direct index seeking!

Consider an index on `(status, created_at, user_id)`:
```sql
SELECT * FROM orders 
WHERE status = 'active'             -- Equality: Index Seek works
  AND created_at > '2026-01-01'     -- Range filter: Index Seek works
  AND user_id = 42;                 -- Column AFTER range: CANNOT SEEK!
```
The database will seek down to `status = 'active'`, scan through rows where `created_at > '2026-01-01'`, and must manually filter `user_id = 42` row by row (using Index Condition Pushdown), because `user_id` values are no longer sorted once `created_at` branches into a range!

---

### Rule of Thumb for Composite Index Column Ordering

To design optimal composite indexes, follow the **ESR Rule**:
1. **E - Equality:** Put columns queried with `=` or `IN` first (e.g., `tenant_id`, `status`).
2. **S - Sort:** Put columns used in `ORDER BY` second (avoids in-memory temporary filesort).
3. **R - Range:** Put columns queried with ranges (`>`, `<`, `BETWEEN`) last.

---

### The ELI5 Analogy: The Phone Book

A traditional telephone directory is a composite index on `(Last_Name, First_Name)`:
- If someone says: *"Find Smith, John"*, you flip to 'S', find Smith, and find John in 2 seconds.
- If someone says: *"Find everyone with Last Name 'Smith'"*, you flip to 'S' and scan all the Smiths.
- If someone says: *"Find everyone whose First Name is 'John'"*, the phone book is useless! You would have to read every single name on all 1,000 pages because Johns are scattered under Adams, Brown, Miller, Smith, and Williams!

---

### Summary
"Column order in a composite B-Tree index dictates lookup capability because rows are sorted hierarchically by the leftmost column first. Queries filtering without the leading column cannot perform index seeks. Optimal composite indexes place equality columns first, sorting columns second, and range filters last (the ESR rule)."

---

### Crucial Nuance: Index Skip Scans
In modern versions of MySQL (8.0+) and Oracle, the optimizer can sometimes perform an **Index Skip Scan** if you query `WHERE salary = 50000` without specifying `department_id`. If there are very few distinct departments (e.g., only 3 departments: 10, 20, 30), the engine silently converts your query into:
`(WHERE dept = 10 AND sal = 50000) UNION (WHERE dept = 20 AND sal = 50000) UNION (WHERE dept = 30 AND sal = 50000)`.
However, this optimization falls apart if the leading column has high cardinality. Never rely on Skip Scan in place of proper index column ordering.
