---
id: 27-views-vs-materialized-views
title: "Views vs. Materialized Views: Storage, Caching & Refreshes"
description: "Understand virtual SQL views vs. Materialized Views, disk caching mechanics, refresh strategies, unique index requirements, and Incremental View Maintenance."
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a standard View and a Materialized View in a database? How does each affect storage, read latency, and data freshness, what are the strict prerequisites for concurrent refreshes, and how does the optimizer handle query rewrite?"

A **view** is just a saved query with a name. A **materialized view** is a saved *answer* — the query already ran, and the result is sitting on disk like a table.

That one difference explains everything else about them:

- **View:** stores zero data. Every time you query it, the database re-runs the underlying SQL against the real tables. Always 100% fresh, but never faster than the query it wraps.
- **Materialized view:** runs the query once and writes the result to disk. Reading it is just reading a table — fast, indexable — but the data goes stale the moment the base tables change, until you refresh it.

---

### The two models, side by side

<Diagram>
<Row>
<Box title="Standard View" accent="#60a5fa">
<Field icon="📝" code="SELECT ... (saved text only)" hint="runs fresh against base tables on every read" variant="neutral" />
</Box>
<Box title="Materialized View" accent="#34d399">
<Field icon="💾" code="precomputed result on disk" hint="instant reads, goes stale until refreshed" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### Comparison: Standard View vs. Materialized View

| Dimension | Standard View | Materialized View |
| :--- | :--- | :--- |
| **Disk storage** | Zero bytes — just the SQL text. | Full table storage — real disk blocks. |
| **When it runs** | Re-evaluated on every read. | Computed ahead of time, read straight off disk. |
| **Read speed** | Slow to moderate — recomputes joins and filters each time. | Sub-millisecond — direct index seek or scan. |
| **Freshness** | Always current, the instant base data changes. | Stale until the next refresh. |
| **Can you index it?** | No (except SQL Server's special Indexed Views). | Yes — B-Tree, hash, GIN, whatever the engine supports. |
| **Cost on writes** | None. | None on the base table itself, but refreshing costs I/O. |
| **Typical use** | Hiding columns, reusing business logic. | Heavy aggregations, dashboards that can tolerate a lag. |

---

### Standard views: hiding columns, reusing logic

A view is useful even though it stores nothing — it's a layer of indirection:

```sql
CREATE VIEW PublicCustomerView AS
SELECT customer_id, full_name, email 
FROM Customers; -- Hides credit_card_number and hashed_password!
```

When the app runs `SELECT * FROM PublicCustomerView WHERE customer_id = 5`, the database just expands it back into:

```sql
SELECT customer_id, full_name, email FROM Customers WHERE customer_id = 5;
```

and pushes `customer_id = 5` straight down to the primary key index on `Customers` — there's no extra cost beyond the query you "would have" written anyway.

---

### Materialized views: paying the cost once, up front

```sql
CREATE MATERIALIZED VIEW MonthlyCategoryRevenue AS
SELECT 
    DATE_TRUNC('month', order_date) AS sales_month,
    category_id,
    COUNT(*) AS total_orders,
    SUM(amount) AS total_revenue
FROM Orders
GROUP BY DATE_TRUNC('month', order_date), category_id;

-- You can even index the materialized view itself
CREATE INDEX idx_mv_month ON MonthlyCategoryRevenue (sales_month);
```

Now `SELECT total_revenue FROM MonthlyCategoryRevenue WHERE sales_month = '2026-01-01'` returns in under a millisecond, because it's reading a precomputed number instead of re-scanning 50 million order rows.

---

### Keeping it fresh: refresh strategies

A materialized view doesn't know when the base tables change — you have to tell it to refresh.

**1. Full refresh (locks the view):**

```sql
REFRESH MATERIALIZED VIEW MonthlyCategoryRevenue;
```

This recalculates everything from scratch and locks the view while it does, so reads are blocked until it's done.

**2. Concurrent refresh (non-blocking):**

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY MonthlyCategoryRevenue;
```

This diffs the old rows against the new ones instead of rebuilding from zero, so readers can keep going while it updates. The catch: **it only works if the view has at least one `UNIQUE` index with no `WHERE` clause.** Without a unique key, the engine has no way to tell which row in the old version corresponds to which row in the new one.

---

### Two advanced tricks worth knowing

1. **Automatic query rewrite (Oracle, Snowflake):** if the app queries the raw base table (`SELECT SUM(amount) FROM Orders WHERE ...`), and the optimizer notices a materialized view already has that exact aggregate precomputed, it silently redirects the query to the materialized view — no app code changes needed.
2. **Incremental View Maintenance (IVM):** instead of recomputing the whole view on every refresh, some engines watch the change log (CDC) and apply only the rows that actually changed.

---

### Say this in the interview

*"A standard view stores no data — it's a saved query that re-runs against the base tables every time, so it's always fresh but never faster than the query itself. A materialized view runs the query once and persists the result to disk, so reads are fast and indexable, but the data is stale until you refresh it. In Postgres, a plain refresh locks the view; `REFRESH ... CONCURRENTLY` avoids that, but only works if the view has a unique index so the engine can diff old rows against new ones."*

---

### Code: measuring the speed difference

This script loads 100,000 rows into SQLite and times a standard view against a precomputed table standing in for a materialized view.

```python
import sqlite3
import time

def benchmark_views():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    NUM_ROWS = 100_000
    print(f"[*] Populating {NUM_ROWS:,} sales records...")
    cursor.execute("""
        CREATE TABLE Orders (
            order_id INT PRIMARY KEY,
            category_id INT,
            amount REAL
        );
    """)

    cursor.executemany("INSERT INTO Orders VALUES (?, ?, ?);", [
        (i, (i % 10) + 1, float((i % 50) + 10.5)) for i in range(NUM_ROWS)
    ])
    conn.commit()

    # 1. Standard View (Dynamic calculation on every read)
    cursor.execute("""
        CREATE VIEW View_CategoryRevenue AS
        SELECT category_id, SUM(amount) AS total_revenue
        FROM Orders
        GROUP BY category_id;
    """)

    # 2. Materialized View Simulation (Precomputed Table)
    cursor.execute("""
        CREATE TABLE MV_CategoryRevenue AS
        SELECT category_id, SUM(amount) AS total_revenue
        FROM Orders
        GROUP BY category_id;
    """)
    cursor.execute("CREATE UNIQUE INDEX idx_mv_cat ON MV_CategoryRevenue(category_id);")
    conn.commit()

    print("\n--- 1. Querying Standard View (Dynamic Re-Execution) ---")
    t0 = time.perf_counter()
    cursor.execute("SELECT * FROM View_CategoryRevenue WHERE category_id = 5;")
    res_view = cursor.fetchall()
    t_view = (time.perf_counter() - t0) * 1000
    print(f"Standard View Result : {res_view} | Time: {t_view:6.2f} ms")

    print("\n--- 2. Querying Materialized View (Precomputed Cached Read) ---")
    t1 = time.perf_counter()
    cursor.execute("SELECT * FROM MV_CategoryRevenue WHERE category_id = 5;")
    res_mv = cursor.fetchall()
    t_mv = (time.perf_counter() - t1) * 1000
    print(f"Materialized View Result: {res_mv} | Time: {t_mv:6.2f} ms")

    print(f"\n[Result] Materialized View was {t_view / max(t_mv, 0.001):.1f}x faster because it bypassed scanning 100k rows!")
    conn.close()

if __name__ == "__main__":
    benchmark_views()
```
