---
id: 25-cte-vs-subquery
title: "Common Table Expressions (CTEs) vs. Subqueries"
description: "Compare CTEs (WITH clauses) and subqueries, whether CTEs get materialized or inlined, and what writable CTEs are."
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a Common Table Expression (CTE) in SQL, and how does it differ from a subquery? Are CTEs materialized in memory or evaluated inline, when should you deliberately force materialization, and what are writable CTEs?"

Both a CTE and a subquery do the same basic job - give a name to a temporary result so a bigger query can use it. The difference is how you write them, and what the database does with them underneath.

<Diagram>
<Row>
<Box title="Subquery: nested inside-out" accent="#f59e0b">
<Field icon="📥" code="SELECT ... FROM (SELECT ...)" hint="you read the inner query first, then the outer one wrapped around it" variant="neutral" />
</Box>
<Box title="CTE: top to bottom" accent="#34d399">
<Field icon="📜" code="WITH step1 AS (...), step2 AS (...)" hint="reads like a sequence of steps, each can reuse the last" variant="neutral" />
</Box>
</Row>
</Diagram>

- **Subquery:** written inline, inside parentheses (`FROM (...) AS t`). You end up nesting things "inside-out," which gets hard to read once you have more than one or two steps.
- **CTE:** written upfront with `WITH`, and read top to bottom like a sequence of named steps - closer to how you'd write a small function in regular code. A CTE can also be referenced more than once, and it's the only one of the two that supports recursion.

---

### Comparison

| Feature | CTE | Subquery |
| :--- | :--- | :--- |
| **Readability** | High — reads top to bottom | Lower — nested inside-out |
| **Reuse** | Can reference the same CTE more than once | Have to copy-paste the same SQL again |
| **Recursion** | Yes, with `WITH RECURSIVE` | No — can't reference itself |
| **Can modify data** | Yes — writable CTEs with `INSERT`/`UPDATE`/`DELETE ... RETURNING` | No |
| **Scope** | Visible to the whole statement | Only visible inside its own parentheses |

---

### Does the database actually materialize a CTE, or just inline it?

This is the thing senior interviewers probe for.

**Modern databases (PostgreSQL 12+, MySQL 8.0+, SQL Server):** by default, the planner treats a non-recursive CTE exactly like a subquery - it inlines it into the surrounding query, letting `WHERE` filters and indexes reach inside it. Performance ends up basically identical to writing a subquery.

**Old PostgreSQL (11 and earlier):** a CTE was always calculated fully and stored in a temporary buffer first, no matter what the outer query needed. A filter like `WHERE id = 5` outside the CTE couldn't reach in and limit what the CTE computed - it still processed all 5,000,000 rows up front. This is why people used to call CTEs "optimization fences."

---

### When you'd want to force materialization on purpose

PostgreSQL 12+ lets you opt back into that old "calculate once, cache it" behavior deliberately:

```sql
WITH CachedData AS MATERIALIZED (
    -- calculated once, then reused from memory
    SELECT department_id, AVG(salary) AS avg_sal
    FROM Employees
    GROUP BY department_id
)
```

Two good reasons to do this:
1. **An expensive query used several times.** If a heavy aggregation is referenced in 3 different joins or union branches, inlining would recompute it 3 separate times. `MATERIALIZED` computes it once and reuses the result.
2. **A query with "random" results.** If the CTE calls something like `RANDOM()` or `NOW()`, inlining could re-evaluate it more than once, giving inconsistent values. Materializing it guarantees it only runs once.

---

### Writable CTEs: changing data inside a `WITH` clause

In PostgreSQL, a CTE can hold `INSERT`, `UPDATE`, or `DELETE`, paired with `RETURNING`:

```sql
-- Move old orders to an archive table, in one single statement
WITH MovedOrders AS (
    DELETE FROM ActiveOrders
    WHERE order_date < NOW() - INTERVAL '1 year'
    RETURNING *
)
INSERT INTO ArchivedOrders
SELECT * FROM MovedOrders;
```

Why this beats doing it as two separate statements:
- It's one atomic operation - nothing can crash in between the delete and the insert, leaving data in a half-moved state.
- It runs inside a single transaction snapshot, so there's no window for a race condition.
- It's one round-trip to the database instead of two.

---

### Say this in the interview

*"A CTE is a named temporary result defined with `WITH`. Compared to a subquery, it's more readable - it reads top to bottom instead of nested inside-out - and it can be referenced more than once, or recursively. In modern Postgres and MySQL, the optimizer inlines a non-recursive CTE just like a subquery, so there's no performance penalty by default. You'd force `MATERIALIZED` when an expensive CTE is used multiple times in the same query, so it only gets computed once. Postgres also supports writable CTEs - an `INSERT`/`UPDATE`/`DELETE` with `RETURNING` inside the `WITH` clause - which lets you do things like archive old rows atomically in one statement."*

---

### Checking this yourself: a CTE referenced twice

```python
import sqlite3

def run_cte_demo():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE Sales (
            id INT PRIMARY KEY,
            region TEXT,
            amount REAL
        );
    """)

    cursor.executemany("INSERT INTO Sales VALUES (?, ?, ?);", [
        (1, 'North', 1500.0),
        (2, 'North', 2500.0),
        (3, 'South', 800.0),
        (4, 'South', 1200.0),
        (5, 'East',  4000.0),
        (6, 'West',  3000.0)
    ])
    conn.commit()

    print("--- 1. Reusable CTE: Finding Regions Exceeding Company Average ---")
    # RegionalSales CTE is referenced TWICE: once for selection, once to compute overall average!
    cursor.execute("""
        WITH RegionalSales AS (
            SELECT region, SUM(amount) AS total_regional_sales
            FROM Sales
            GROUP BY region
        ),
        AverageSales AS (
            SELECT AVG(total_regional_sales) AS avg_sales
            FROM RegionalSales
        )
        SELECT
            r.region,
            r.total_regional_sales,
            ROUND(a.avg_sales, 2) AS benchmark_avg
        FROM RegionalSales r
        CROSS JOIN AverageSales a
        WHERE r.total_regional_sales > a.avg_sales;
    """)
    for row in cursor.fetchall():
        print(f"Region: {row[0]:<6} | Total: ${row[1]:<7} | Benchmark Avg: ${row[2]}")

    conn.close()

if __name__ == "__main__":
    run_cte_demo()
```
