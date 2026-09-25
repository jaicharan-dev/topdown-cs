---
id: 27-views-vs-materialized-views
title: "Views vs. Materialized Views: Storage, Caching & Refreshes"
description: "Understand virtual SQL views vs. Materialized Views, disk caching mechanics, refresh strategies, unique index requirements, and Incremental View Maintenance."
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a standard View and a Materialized View in a database? How does each affect storage, read latency, and data freshness, what are the strict prerequisites for concurrent refreshes, and how does the optimizer handle query rewrite?"

---

### Conceptual Overview: Virtual vs. Physical Abstraction

Both standard **Views** and **Materialized Views** provide a named SQL abstraction over base tables, but their physical execution, storage footprint, and latency profiles are polar opposites:

- **Standard View (Virtual Saved Query):** Stores **zero data on disk**. It is merely a stored query definition in the system catalog. Every time a client queries the view, the database dynamically rewrites the query and executes it against the base tables.
- **Materialized View (Physically Cached Snapshot):** Executes the underlying query once and **persists the complete result set to disk** as physical heap pages. It functions like a real table, supports secondary B-Tree indexes, and delivers sub-millisecond reads at the expense of data staleness.

```mermaid
graph TD
    subgraph "Standard View (Dynamic Query Rewrite)"
        Client1[Client Query] --> Rewrite[Query Rewrite Engine]
        Rewrite --> Base1[(Base Tables on Disk)]
        Base1 --> Exec[Execute Joins & Aggregations at Runtime]
        Exec --> Return1[Return 100% Fresh Data]
    end

    subgraph "Materialized View (Disk-Cached Table)"
        Client2[Client Query] --> MV[(Materialized View Pages on Disk)]
        MV --> FastReturn[Instant O(1) Return Cached State]
        Base2[(Base Tables)] -.->|Asynchronous Refresh| MV
    end
```

---

### Comparison: Standard View vs. Materialized View

| Dimension | Standard View | Materialized View |
| :--- | :--- | :--- |
| **Physical Disk Storage** | **Zero bytes.** (Stores only the SQL text definition). | **Full table storage.** (Allocates disk blocks for rows). |
| **Execution Phase** | Evaluated **dynamically on every read**. | Precomputed and read directly off disk. |
| **Read Latency** | Slow to Moderate (recomputes joins and filters). | **Sub-millisecond** (direct index seek or sequential scan). |
| **Data Freshness** | **Real-Time (100% fresh)** immediately on base write. | **Asynchronous / Stale** until refreshed. |
| **Indexable?** | **No** (except Indexed Views in SQL Server). | **Yes!** Can create B-Tree, Hash, and GIN indexes. |
| **Write Penalty on Base Tables** | **Zero overhead** on base table `INSERT`/`UPDATE`. | Zero on base writes, but periodic refresh consumes I/O. |
| **Primary Use Case** | Security masking, business logic encapsulation. | Heavy analytical aggregations, real-time dashboards. |

---

### Standard Views: Security & Code Encapsulation

Standard views provide logical abstraction without data duplication:
```sql
CREATE VIEW PublicCustomerView AS
SELECT customer_id, full_name, email 
FROM Customers; -- Hides credit_card_number and hashed_password!
```
When an application queries `SELECT * FROM PublicCustomerView WHERE customer_id = 5`:
The query engine expands the view into:
```sql
SELECT customer_id, full_name, email FROM Customers WHERE customer_id = 5;
```
The optimizer pushes the `customer_id = 5` filter directly down to the primary key index on `Customers`.

---

### Materialized Views: Precomputed Analytics

```sql
CREATE MATERIALIZED VIEW MonthlyCategoryRevenue AS
SELECT 
    DATE_TRUNC('month', order_date) AS sales_month,
    category_id,
    COUNT(*) AS total_orders,
    SUM(amount) AS total_revenue
FROM Orders
GROUP BY DATE_TRUNC('month', order_date), category_id;

-- Create an index directly on the materialized view!
CREATE INDEX idx_mv_month ON MonthlyCategoryRevenue (sales_month);
```
Querying `SELECT total_revenue FROM MonthlyCategoryRevenue WHERE sales_month = '2026-01-01'` executes in under 1 millisecond because the engine reads the precomputed sum without scanning 50 million raw order rows.

---

### Refresh Strategies & The `CONCURRENTLY` Prerequisite

Because materialized views do not automatically reflect base table mutations, they must be refreshed:

#### 1. Full Refresh (Locking):
```sql
REFRESH MATERIALIZED VIEW MonthlyCategoryRevenue;
```
- **Disadvantage:** Acquires an `ACCESS EXCLUSIVE` lock on the view, **blocking all concurrent client reads** until the entire query recalculates from scratch.

#### 2. Concurrent Refresh (Non-Blocking):
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY MonthlyCategoryRevenue;
```
- Uses a temporary table and row diffing to update the materialized view in place without locking out active readers.
- **MANDATORY PREREQUISITE:** The materialized view **must have at least one `UNIQUE` index** without any `WHERE` clause! 
- *Why?* Without a guaranteed unique key, the database engine cannot uniquely identify which rows to update, insert, or delete during diff reconciliation.

---

### Advanced Concepts: Query Rewrite & Incremental Maintenance (IVM)

1. **Automated Query Rewrite Engine (Oracle, Snowflake):**
   In enterprise data warehouses, if an application queries the massive base table (`SELECT SUM(amount) FROM Orders WHERE ...`), the optimizer automatically detects that an existing materialized view has already precomputed this aggregate and **transparently routes the query to the materialized view**, without altering application SQL!
2. **Incremental View Maintenance (IVM):**
   Rather than re-evaluating the entire query from scratch, advanced engines monitor change data capture (CDC) logs to apply only incremental delta updates ($+$ and $-$ changes) to the materialized view.

---

### The Interview Answer (60-90 seconds)

> "A standard view is a virtual saved query that stores no data on disk. When queried, the engine expands the view definition and executes it dynamically against base tables, guaranteeing real-time freshness with zero storage overhead.
>
> In contrast, a materialized view physically executes the query and writes the complete result set to disk. It enables secondary B-Tree indexing and delivers sub-millisecond reads on heavy analytical queries, but serves data that is asynchronous and stale until refreshed.
>
> In PostgreSQL, running a standard `REFRESH MATERIALIZED VIEW` locks out concurrent readers. To perform a non-blocking `REFRESH ... CONCURRENTLY`, the view must have at least one unique index defined on it so the engine can reconcile differences in place.
>
> In enterprise engines like Oracle and Snowflake, the optimizer supports Query Rewrite, automatically redirecting expensive queries on base tables to an existing materialized view if it contains the precomputed answer."

---

### Code Demonstration: Simulating Standard View vs. Precomputed Materialized View

The following Python script models 100,000 transaction records in SQLite, demonstrating the dramatic latency difference between a dynamic view recalculation and a precomputed materialized view cache.

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
