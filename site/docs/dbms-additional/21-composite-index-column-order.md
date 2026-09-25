---
id: 21-composite-index-column-order
title: "Composite Indexes: Column Order, Leftmost Prefix & ESR Rule"
description: "Understand the Leftmost Prefix Rule in composite B-Tree indexes, range query cliffs, the ESR rule, covering indexes, and Index Condition Pushdown."
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Why does column order matter in a composite index on `(department_id, salary)`? Can a query filtering only on `salary` use this index, what is the Range Query Cliff, and how does the ESR rule guide optimal column ordering?"

---

### How Composite B-Trees Are Sorted Internally

In a composite (multi-column) B-Tree index, data is sorted **hierarchically and lexicographically** from left to right. 

Creating an index on `(department_id, salary)` means:
1. All index entries are sorted by `department_id` first.
2. For rows that share the exact same `department_id`, entries are sorted by `salary`.

```
Composite B-Tree Leaf Page on (department_id, salary):
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

Notice the critical structural reality of the `salary` column:
- Across the entire index, salaries read: `40000, 55000, 90000, 30000, 65000, 45000, 120000`.
- **Salaries are completely unsorted globally!** They are only sorted locally within each discrete department group.

---

### The Leftmost Prefix Rule

A composite index on columns `(A, B, C)` can only be used for direct **Index Seeks** if the query's `WHERE` clause includes the leftmost column prefix:

| Query Filter Pattern | Can It Perform an Index Seek on `(A, B, C)`? | Explanation |
| :--- | :---: | :--- |
| `WHERE A = 1 AND B = 2 AND C = 3` | **Yes (Full Seek)** | Matches complete composite prefix left-to-right. |
| `WHERE A = 1 AND B = 2` | **Yes (Prefix Seek)** | Matches leading prefix `(A, B)`. |
| `WHERE A = 1` | **Yes (Prefix Seek)** | Matches leading prefix `(A)`. |
| `WHERE B = 2 AND C = 3` | **NO Seek** | Skips column `A`. Global data is unsorted without `A`. |
| `WHERE C = 3` | **NO Seek** | Skips columns `A` and `B`. |
| `WHERE A = 1 AND C = 3` | **Partial Seek** | Seeks on `A`, then filters on `C` manually. |

---

### The Covering Index Exception (Index-Only Scan)

A classic interview gotcha asks: *"Can a query filtering ONLY on `salary` ever use the index on `(department_id, salary)`?"*

**Answer:** **Yes, as a Covering Index (Index-Only Scan), but NOT as an Index Seek!**

```sql
SELECT department_id, salary 
FROM Employees 
WHERE salary = 55000;
```

#### What the Database Does:
- The database cannot perform an *Index Seek* ($O(\log N)$ jump) because salaries are unsorted globally.
- However, all columns requested in the query (`department_id` and `salary`) reside directly in the index leaf pages!
- The query optimizer chooses an **Index Full Scan** instead of a Full Table Scan. Because the index contains no wide text columns and is significantly smaller than the clustered table heap, scanning the index sequentially is **$3\times$ to $5\times$ faster** than reading the entire table off disk.

---

### The Range Query Cliff

> **Staff-Level Bar Raiser:** B-Tree index seeking halts at the **very first range filter** (`<`, `>`, `BETWEEN`, `LIKE 'prefix%'`). Any columns listed after a range filter cannot be used for index seeking!

Consider an index on `(tenant_id, created_at, user_id)`:
```sql
SELECT * FROM Orders 
WHERE tenant_id = 5                 -- Equality: Index Seek works
  AND created_at >= '2026-01-01'    -- Range Filter: Index Seek works
  AND user_id = 1042;               -- Placed AFTER range: CANNOT SEEK!
```

#### Why `user_id` Cannot Seek:
Once `created_at` branches into a range across multiple dates, the entries in the index are ordered by date. Across different dates, `user_id` values are scattered and unsorted. The database seeks down to `tenant_id = 5` and `created_at >= '2026-01-01'`, and must scan every row checking `user_id = 1042` using **Index Condition Pushdown (ICP)**.

---

### The Golden ESR Rule for Column Ordering

To design optimal composite indexes that avoid in-memory temporary filesorts, follow the **ESR Rule**:

$$\mathbf{E} \longrightarrow \mathbf{S} \longrightarrow \mathbf{R}$$

1. **E - Equality:** Place columns filtered with `=` or `IN` first (e.g., `tenant_id`, `status`).
2. **S - Sort:** Place columns referenced in `ORDER BY` second (allows the database to stream sorted data directly off the B-Tree without an in-memory `filesort`).
3. **R - Range:** Place columns filtered with ranges (`>`, `<`, `BETWEEN`) last.

```sql
-- Query:
SELECT * FROM Orders 
WHERE tenant_id = 10 AND status = 'COMPLETED' 
ORDER BY order_date DESC 
LIMIT 20;

-- Optimal Composite Index following ESR:
CREATE INDEX idx_orders_esr ON Orders (tenant_id, status, order_date);
```

---

### The Interview Answer (60-90 seconds)

> "In a composite B-Tree index like `(department_id, salary)`, column order is paramount because the index sorts entries hierarchically by the leftmost column first. Within each department, salaries are sorted, but across the entire index, salaries are globally unsorted.
>
> Therefore, by the Leftmost Prefix Rule, a query filtering solely on `salary` cannot perform an $O(\log N)$ index seek. However, if the query only selects columns present in the index, the engine can execute an Index Full Scan, reading the compact index rather than the heap table.
>
> When designing composite indexes, engineers must account for the Range Query Cliff: index seeking terminates at the first range or inequality filter. To maximize index efficiency and eliminate in-memory sorting, always follow the ESR rule: place Equality columns first, Sorting columns second, and Range filter columns last."

---

### Code Demonstration: Inspecting Query Execution Plans with Composite Indexes

The following Python script uses SQLite's `EXPLAIN QUERY PLAN` to prove how query plans shift from index seeks to table scans depending on the leftmost prefix.

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
