---
id: 11-olap-vs-oltp
title: "OLTP vs. OLAP: Workloads, Engines & Architecture"
description: "Compare Online Transaction Processing (OLTP) and Online Analytical Processing (OLAP), row vs. columnar stores, and data warehouse design."
sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between OLAP and OLTP? Compare their workloads, schemas, storage formats, and give examples of databases built for each."

Modern data architecture divides database workloads into two fundamentally different categories: **OLTP (Online Transaction Processing)** and **OLAP (Online Analytical Processing)**. Running analytical reports on an operational transactional database is one of the most common anti-patterns in system design.

---

### Comprehensive Comparison

| Feature | OLTP (Online Transaction Processing) | OLAP (Online Analytical Processing) |
| :--- | :--- | :--- |
| **Primary Focus** | Fast, reliable transaction processing for live applications | Complex data analysis, business intelligence, and reporting |
| **Query Pattern** | Simple, frequent reads and atomic writes (`INSERT`, `UPDATE`) | Heavy, complex multi-table aggregations over millions of rows |
| **Data Granularity** | Highly detailed, row-level operational records | Aggregated, historical, multi-dimensional consolidated data |
| **Latency Expectation**| Milliseconds (1ms - 50ms) | Seconds to minutes |
| **Storage Layout** | **Row-Oriented** (stores complete records together) | **Column-Oriented** (stores all values of a column contiguously) |
| **Schema Design** | Highly Normalized (3NF) to eliminate write anomalies | Denormalized **Star Schema** or **Snowflake Schema** |
| **Data Volume** | Gigabytes to Low Terabytes (current operational window) | Terabytes to Petabytes (multi-year historical data) |
| **Typical Databases** | PostgreSQL, MySQL, SQL Server, Oracle | ClickHouse, Snowflake, Google BigQuery, Amazon Redshift |

---

### Row-Oriented vs. Column-Oriented Storage

Understanding the underlying disk storage layout illustrates why OLTP and OLAP require different database engines:

```
Row-Oriented (OLTP - e.g., PostgreSQL):
Page 1: [User1, Alice, 28, USA] [User2, Bob, 34, UK] [User3, Charlie, 22, USA]

Column-Oriented (OLAP - e.g., ClickHouse):
Page 1 (UserIDs): [1, 2, 3, ...]
Page 2 (Names):   [Alice, Bob, Charlie, ...]
Page 3 (Ages):    [28, 34, 22, ...]
Page 4 (Country): [USA, UK, USA, ...]
```

#### Why Columnar Storage Dominates OLAP:
Suppose you run this analytical query over 500,000,000 rows:
```sql
SELECT AVG(age) FROM users WHERE country = 'USA';
```
- **In a Row Store:** The database must read the **entire table off disk into RAM**, scanning names, emails, passwords, and billing addresses just to look at `age` and `country`. 90% of the read disk I/O is wasted!
- **In a Column Store:** The engine touches **only Page 3 (Ages) and Page 4 (Country)**. It skips reading all other columns entirely. Furthermore, because column data consists of uniform types, it compresses dramatically (using Run-Length Encoding or Dictionary Compression), achieving 10x smaller disk footprints.

---

### The Modern Data Pipeline: ETL / ELT

Operational web applications write to OLTP databases. Periodic or real-time pipelines extract that data into an OLAP warehouse:

```mermaid
flowchart LR
    App[Web / Mobile App] -->|Writes Transactions| OLTP[(Postgres / MySQL OLTP)]
    OLTP -->|Change Data Capture / Debezium| Kafka[Event Stream]
    Kafka -->|ETL Pipeline| OLAP[(Snowflake / ClickHouse OLAP)]
    OLAP -->|BI Queries| Dashboard[Executive Dashboards]
```

---

### The ELI5 Analogy: The Cashier vs. The CFO

- **OLTP (The Supermarket Cashier):** The cashier scans items one at a time for each customer. They need to beep an apple, take cash, and print a receipt in 2 seconds. They only care about the single customer standing in front of them right now.
- **OLAP (The Corporate Chief Financial Officer):** At the end of the quarter, the CFO wants to know: *"What was the total profit margin on organic apples across all 500 stores in the Northeast region compared to last year?"* The CFO does not care what Alice bought at 2:14 PM on Tuesday; they need aggregated trends across millions of sales receipts.

---

### Summary
"OLTP systems process high-frequency, low-latency, row-level transactional writes using normalized schemas, while OLAP systems execute complex analytical aggregate queries across massive historical datasets using columnar storage and denormalized star schemas."

---

### Crucial Nuance: The Rise of HTAP (Hybrid Transactional/Analytical Processing)
Historically, OLTP and OLAP were strictly separated into distinct physical systems. However, modern engineering has given rise to **HTAP (Hybrid Transactional/Analytical Processing)** databases like **TiDB**, **SingleStore**, and **Google AlloyDB**. These engines maintain both a row-store (for low-latency transactional writes) and a synchronized in-memory columnar store (for real-time analytics) within the same unified cluster, eliminating the lag and infrastructure cost of traditional ETL pipelines.
