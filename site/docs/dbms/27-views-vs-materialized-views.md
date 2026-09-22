---
id: 27-views-vs-materialized-views
title: "Views vs. Materialized Views"
description: "Understand virtual SQL views vs. Materialized Views, disk caching mechanics, refresh strategies, and real-time dashboard optimization."
sidebar_position: 27
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a standard View and a Materialized View in a database? How does each impact storage, read latency, and data freshness?"

Both standard **Views** and **Materialized Views** provide named query abstractions over base tables, but they have completely opposite runtime execution, storage, and performance characteristics.

---

### Comprehensive Comparison

| Feature | Standard View | Materialized View |
| :--- | :--- | :--- |
| **Physical Storage** | **Zero disk storage.** Stores only the SQL query text definition | **Physically stored on disk.** Allocates disk blocks just like a real table |
| **Execution Time** | Re-executed **dynamically on every read** | Query results are **precomputed and cached** on disk |
| **Read Latency** | Slow to Moderate (executes underlying joins each time) | **Blazing fast** (`O(1)` sequential scan or direct index seek) |
| **Data Freshness** | **Real-time (100% fresh)**. Reflects immediate base table changes | **Stale / Asynchronous**. Reflects data at the time of the last refresh |
| **Indexable?** | **No** (except Indexed Views in SQL Server) | **Yes!** You can create B-Tree indexes on materialized view columns |
| **Write Impact** | Zero impact on `INSERT`/`UPDATE` to base tables | Base table writes are fast, but refreshing the view consumes system I/O |

---

### 1. Standard View (Virtual Saved Query)

A standard view is simply a stored macro or alias for a SQL statement:

```sql
CREATE VIEW active_customer_orders AS
SELECT c.id, c.name, o.order_id, o.amount
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'active';
```

When an application queries `SELECT * FROM active_customer_orders WHERE amount > 500`:
The database query rewrite engine merges the view definition with the outer query, executing:
```sql
SELECT c.id, c.name, o.order_id, o.amount
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'active' AND o.amount > 500;
```
It stores nothing on disk. It provides security (hiding sensitive columns) and code organization.

---

### 2. Materialized View (Physically Cached Table)

A Materialized View executes the query once, writes the full result set to disk, and allows secondary indexes to be created directly on the cached data:

```sql
CREATE MATERIALIZED VIEW monthly_sales_summary AS
SELECT 
    DATE_TRUNC('month', order_date) AS sales_month,
    product_category,
    COUNT(*) AS total_orders,
    SUM(amount) AS total_revenue
FROM orders
GROUP BY DATE_TRUNC('month', order_date), product_category;

-- Create an index directly on the materialized view!
CREATE INDEX idx_sales_month ON monthly_sales_summary (sales_month);
```

When you query `SELECT * FROM monthly_sales_summary`:
The database does **not** touch the massive `orders` table. It reads the precomputed numbers directly off disk in milliseconds!

---

### How Materialized Views are Refreshed

Because materialized views do not update automatically in real-time, you must trigger refreshes:

#### 1. Full Refresh (`REFRESH MATERIALIZED VIEW`)
Re-runs the entire underlying query from scratch, locks the view, and replaces disk pages.
```sql
REFRESH MATERIALIZED VIEW monthly_sales_summary;
```

#### 2. Concurrent Refresh (`CONCURRENTLY`)
In PostgreSQL, updating without blocking concurrent readers requires a unique index:
```sql
CREATE UNIQUE INDEX idx_summary_pk ON monthly_sales_summary (sales_month, product_category);
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales_summary;
```
This updates changed rows in place without acquiring exclusive table locks, allowing active client reads during refresh.

---

### The ELI5 Analogy: Calculator vs. Cheat Sheet

- **Standard View (The Calculator):** Every time your boss asks for a financial calculation, you pull out your calculator, punch in the numbers, and read the answer. The answer is 100% up-to-date, but if the formula takes 15 minutes to calculate, your boss waits 15 minutes every time they ask.
- **Materialized View (The Cheat Sheet):** Every morning at 6:00 AM, you calculate the formula once and write the answer on a sticky note on your monitor. When your boss asks during the day, you read the sticky note in 1 second. But if a new sale occurred at 2:00 PM, your sticky note won't show it until tomorrow morning's refresh!

---

### Summary
"A standard view is a virtual query rewritten at runtime with zero disk storage and real-time freshness. A materialized view physically stores precomputed query results on disk and supports secondary indexes, delivering sub-millisecond read latency on heavy analytical aggregations at the cost of eventual data staleness."

---

### Crucial Nuance: Fast Refresh / Incremental View Maintenance (IVM)
While PostgreSQL currently requires refreshing the entire materialized view (or diffing against a unique index), advanced enterprise engines like Oracle support **Fast Refresh (Incremental View Maintenance)**. Using a Materialized View Log (`MLOG\$`), the engine captures only delta changes (`+` and `-`) made to base tables and applies those specific deltas to the materialized view incrementally, maintaining sub-second freshness without full table recalculations.
