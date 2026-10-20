---
id: 21-composite-index-column-order
title: "Composite Indexes: Column Order & the Leftmost Prefix Rule"
description: "Why column order matters in a composite index, the leftmost prefix rule, the range query cliff, and the ESR rule for ordering columns."
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Why does column order matter in a composite index on `(department_id, salary)`? Can a query filtering only on `salary` use this index, what is the Range Query Cliff, and how does the ESR rule guide optimal column ordering?"

Think of a phone book sorted by last name, then first name. Everyone named "Smith" sits together, and inside that group they're sorted by first name. But if all you know is someone's first name - "find everyone called John" - the book is useless. Johns are scattered across every last-name group.

A composite index on `(department_id, salary)` is sorted the same way: by `department_id` first, and only *within* each department, by `salary`.

<Diagram>
<Row>
<Box title="Good order: (dept_id, salary)" accent="#34d399">
<Field icon="✅" code="WHERE dept_id = 10" hint="dept_id is leftmost — index seek works" variant="neutral" />
</Box>
<Box title="Bad order: (salary, dept_id)" accent="#fb7185">
<Field icon="❌" code="WHERE dept_id = 10" hint="dept_id is 2nd — can't seek on it alone" variant="neutral" />
</Box>
</Row>
</Diagram>

Put the column your queries filter on *first*. Get the order wrong, and the index is dead weight for that query.

---

### How the data is actually laid out

```
Composite index on (department_id, salary):
+---------------+--------+
| department_id | salary |
+---------------+--------+
| 10            | 40000  |
| 10            | 55000  |
| 10            | 90000  |
| 20            | 30000  |
| 20            | 65000  |
| 30            | 45000  |
| 30            | 120000 |
+---------------+--------+
```

Look at the `salary` column across the whole index: `40000, 55000, 90000, 30000, 65000, 45000, 120000`. That's not sorted at all. Salary is only sorted *inside* each department. Globally, it's scrambled - exactly like the first names in the phone book.

---

### The Leftmost Prefix Rule

A composite index on `(A, B, C)` can jump straight to the right rows (an **index seek**) only if your `WHERE` clause includes the leftmost columns, in order:

| Query filter | Can it seek on `(A, B, C)`? | Why |
| :--- | :---: | :--- |
| `A = 1 AND B = 2 AND C = 3` | **Yes, full seek** | Matches the whole prefix. |
| `A = 1 AND B = 2` | **Yes, prefix seek** | Matches `(A, B)`. |
| `A = 1` | **Yes, prefix seek** | Matches `(A)`. |
| `B = 2 AND C = 3` | **No** | Skips `A` — without it, the data isn't sorted by `B`. |
| `C = 3` | **No** | Skips `A` and `B`. |
| `A = 1 AND C = 3` | **Partial** | Seeks on `A`, then scans and checks `C` by hand. |

---

### Can you still use the index if you skip the first column?

Sometimes - yes, but not the way you'd think. Interviewers like to ask: *"Can a query filtering only on `salary` ever use the index on `(department_id, salary)`?"*

```sql
SELECT department_id, salary
FROM Employees
WHERE salary = 55000;
```

It can't do a seek - salary isn't globally sorted, so there's no jump-straight-there shortcut. But look closer: both columns the query asks for (`department_id`, `salary`) already live in the index itself. So the database doesn't need to touch the actual table at all - it can just scan the index top to bottom, which is a lot smaller and faster than scanning the whole table. This is called a **covering index** scan, and it's usually 3-5x faster than reading the full table, even without a true seek.

---

### The Range Query Cliff

> **Watch for this one:** an index seek stops dead at the first range filter (`<`, `>`, `BETWEEN`, `LIKE 'prefix%'`). Everything listed *after* that range filter can't be seeked on anymore.

Take an index on `(tenant_id, created_at, user_id)`:

```sql
SELECT * FROM Orders
WHERE tenant_id = 5                 -- equality: seeks fine
  AND created_at >= '2026-01-01'    -- range: seeks fine
  AND user_id = 1042;               -- comes after the range: can't seek!
```

Once `created_at` opens up into a range, you're looking across many different dates - and within that range, `user_id` values aren't sorted anymore. So the database seeks down to `tenant_id = 5 AND created_at >= '2026-01-01'`, then has to check `user_id = 1042` row by row as it scans (this row-by-row checking is called **Index Condition Pushdown**).

---

### The ESR rule: how to order your columns

A simple rule of thumb for designing composite indexes, so you avoid expensive in-memory sorts:

<Diagram>
<Row>
<Box title="E - Equality" accent="#60a5fa">
<Field icon="🟰" code="tenant_id, status" hint="columns filtered with = or IN" variant="neutral" />
</Box>
<Arrow />
<Box title="S - Sort" accent="#34d399">
<Field icon="↕️" code="order_date" hint="columns in ORDER BY" variant="neutral" />
</Box>
<Arrow />
<Box title="R - Range" accent="#f59e0b">
<Field icon="↔️" code="created_at > ..." hint="columns filtered with <, >, BETWEEN" variant="neutral" />
</Box>
</Row>
</Diagram>

1. **Equality** columns first - the ones you filter with `=` or `IN`.
2. **Sort** columns second - whatever's in your `ORDER BY`. Put these here and the database can stream pre-sorted rows straight off the index, no extra sort step needed.
3. **Range** columns last - `>`, `<`, `BETWEEN` - because these are the ones that break the seek anyway.

```sql
-- Query:
SELECT * FROM Orders
WHERE tenant_id = 10 AND status = 'COMPLETED'
ORDER BY order_date DESC
LIMIT 20;

-- Index following ESR:
CREATE INDEX idx_orders_esr ON Orders (tenant_id, status, order_date);
```

---

### Say this in the interview

*"A composite index on `(department_id, salary)` is sorted by `department_id` first, and only within each department by `salary` - so salary isn't globally sorted. Because of that, a query filtering only on `salary` can't do an index seek, though it might still use the index as a covering scan if it only needs columns already in the index. An index seek also stops at the first range filter - any column listed after it can't be seeked on. To design a good composite index, follow ESR: equality columns first, sort columns second, range columns last."*

---

### Checking this yourself: query plans in SQLite

This script uses SQLite's `EXPLAIN QUERY PLAN` to show the plan flip from index seek to table scan depending on the leftmost prefix.

```python
import sqlite3

def test_composite_indexing():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE Employees (
            emp_id INTEGER PRIMARY KEY,
            department_id INT NOT NULL,
            salary INT NOT NULL,
            name TEXT
        );
    """)

    # Composite Index on (department_id, salary)
    cursor.execute("CREATE INDEX idx_dept_sal ON Employees(department_id, salary);")

    # Insert dummy records
    for i in range(1000):
        cursor.execute("INSERT INTO Employees VALUES (?, ?, ?, ?);",
                       (i, (i % 5) + 1, (i % 20) * 5000 + 30000, f"Emp_{i}"))
    conn.commit()

    print("--- 1. Query with Leftmost Prefix (department_id = 1 AND salary = 50000) ---")
    cursor.execute("EXPLAIN QUERY PLAN SELECT * FROM Employees WHERE department_id = 1 AND salary = 50000;")
    for row in cursor.fetchall():
        print("Plan:", row[3]) # Output: SEARCH ... USING INDEX idx_dept_sal

    print("\n--- 2. Query WITHOUT Leftmost Prefix (salary = 50000) ---")
    cursor.execute("EXPLAIN QUERY PLAN SELECT * FROM Employees WHERE salary = 50000;")
    for row in cursor.fetchall():
        print("Plan:", row[3]) # Output: SCAN TABLE Employees (Full Table Scan!)

    print("\n--- 3. Query without prefix but COVERING (SELECT department_id, salary) ---")
    cursor.execute("EXPLAIN QUERY PLAN SELECT department_id, salary FROM Employees WHERE salary = 50000;")
    for row in cursor.fetchall():
        print("Plan:", row[3]) # Output: SCAN ... USING COVERING INDEX idx_dept_sal

    conn.close()

if __name__ == "__main__":
    test_composite_indexing()
```
