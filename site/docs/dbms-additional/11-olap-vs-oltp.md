---
id: 11-olap-vs-oltp
title: "OLTP vs. OLAP: Workloads, Engines & Architecture"
description: "Compare Online Transaction Processing (OLTP) and Online Analytical Processing (OLAP), row vs. columnar stores, Star/Snowflake schemas, and HTAP."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between OLTP and OLAP? Compare their query patterns, row vs. columnar disk storage, Star vs. Snowflake schemas, and explain the emergence of HTAP architectures."

A banking app placing one transfer is OLTP. A report asking "what were total sales by region last year?" is OLAP. Same database concepts, two completely different jobs — and that difference shapes how each kind of system is built, all the way down to how bytes sit on disk.

<Diagram>
<Row>
<Box title="OLTP" accent="#60a5fa">
<Field icon="⚡" code="many small reads/writes" hint="e.g. placing one order" variant="neutral" />
</Box>
<Box title="OLAP" accent="#f59e0b">
<Field icon="📊" code="few large aggregate reads" hint="e.g. total sales by region, last year" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### Side by side

| Feature | OLTP (Transaction Processing) | OLAP (Analytical Processing) |
| :--- | :--- | :--- |
| **Goal** | Keep a live app running, one transaction at a time | Multi-dimensional analysis, BI, reporting |
| **Query pattern** | Frequent, fast reads and atomic writes (`INSERT`, `UPDATE`) | Infrequent, long aggregate scans (`SUM`, `AVG`, `GROUP BY`) |
| **Data granularity** | Individual records | Aggregated, historical, multi-year |
| **Latency** | Milliseconds | Seconds to minutes |
| **Storage layout** | Row-oriented | Column-oriented |
| **Schema design** | Normalized (3NF) | Denormalized Star or Snowflake schema |
| **Data scale** | GBs to low TBs | TBs to PBs |
| **Engines** | PostgreSQL, MySQL, SQL Server, Oracle | ClickHouse, Snowflake, BigQuery, Redshift |

---

### Why storage layout is the real dividing line

How the data actually sits on disk is the thing that determines everything else:

```
Row-oriented (OLTP — e.g. PostgreSQL):
Page 1: [ID: 1, Name: "Alice", Age: 28, Balance: 4500] [ID: 2, Name: "Bob", Age: 34, Balance: 1200]
Page 2: [ID: 3, Name: "Charlie", Age: 22, Balance: 8900] [ID: 4, Name: "Diana", Age: 41, Balance: 6700]

Column-oriented (OLAP — e.g. ClickHouse):
Page 1 (IDs):      [1, 2, 3, 4, ...]
Page 2 (Names):    ["Alice", "Bob", "Charlie", "Diana", ...]
Page 3 (Ages):     [28, 34, 22, 41, ...]
Page 4 (Balances): [4500, 1200, 8900, 6700, ...]
```

Say you run this over 100 million rows:
```sql
SELECT AVG(Balance) FROM Customers WHERE Age > 30;
```

- **Row store:** has to pull every full record off disk — name, email, address, all of it — just to read two columns. Most of the I/O is wasted.
- **Column store:** reads only the `Age` and `Balance` pages, and skips everything else entirely.

That one difference gives columnar storage three wins for analytics:
1. **Way less I/O** — it only touches the columns the query actually needs.
2. **Much better compression** — a column is all one data type, so techniques like run-length encoding and dictionary encoding squeeze it 5-10x smaller. A row mixes ints, strings, and timestamps together, which compresses poorly.
3. **SIMD-friendly** — a column is one contiguous array in memory, so the CPU can load it straight into vector registers (AVX-512) and crunch dozens of values per cycle.

---

### How OLAP tables are shaped: Star vs. Snowflake

A warehouse table splits into a **fact table** (the numbers — quantity, price, discount) and **dimension tables** (the context around them — customer, store, date). The question is how normalized those dimension tables are:

<Diagram>
<Row>
<Box title="Star schema" accent="#34d399">
<Field icon="⭐" code="Sales → Store, Date, Product" hint="dimensions flat, few joins" variant="neutral" />
</Box>
<Box title="Snowflake schema" accent="#818cf8">
<Field icon="❄️" code="Sales → Product → Category → Department" hint="dimensions normalized, more joins" variant="neutral" />
</Box>
</Row>
</Diagram>

| | Star Schema | Snowflake Schema |
| :--- | :--- | :--- |
| **Normalization** | Dimensions fully denormalized | Dimensions normalized into sub-tables |
| **Query complexity** | Simple, few joins | More joins, more complex |
| **Query performance** | Fastest — built for big columnar scans | Slower, join overhead |
| **Disk redundancy** | Higher (repeated attributes) | Lower |

Star wins on query speed because fewer joins beats less redundancy, and modern warehouses are built to blast through columnar scans anyway.

---

### Closing the gap: HTAP

Classically, teams ran a separate OLTP database and OLAP warehouse, glued together by an ETL pipeline — meaning the analytics were always hours behind the live data:

$$\text{App} \longrightarrow \text{OLTP} \xrightarrow[\text{Batch / Kafka}]{\text{ETL Lag (1-24h)}} \text{OLAP Warehouse}$$

**HTAP (Hybrid Transactional/Analytical Processing)** systems — TiDB, SingleStore, Google AlloyDB — close that gap by keeping both representations inside one cluster: writes land in a row-oriented engine for ACID guarantees, a background process streams them into an in-memory columnar replica, and the query planner automatically routes each query to whichever engine fits — no ETL lag.

---

### Say this in the interview

*"OLTP is built for fast, concurrent, normalized transactions — row-oriented storage, since you usually want the whole record at once. OLAP is built for large aggregate scans over historical data — column-oriented storage, since a query only needs a few columns out of many, and that also compresses far better and plays nicely with SIMD. OLAP data warehouses use Star or Snowflake schemas, with Star trading some redundancy for fewer joins. HTAP databases like TiDB are the newer answer to the ETL-lag problem: one cluster, both a row engine and a columnar replica, queries routed automatically."*

---

### Code: row scan vs. column scan, measured

The following Python script simulates row-oriented storage (array of records) versus column-oriented storage (dictionary of arrays) across 500,000 records, measuring memory footprint and column aggregation performance.

```python
import time
import sys

def benchmark_storage_layouts():
    NUM_RECORDS = 500_000
    print(f"[*] Generating {NUM_RECORDS:,} synthetic e-commerce records...")

    # 1. Simulating Row-Oriented Storage (List of Dicts / Objects)
    row_store = [
        {
            "order_id": i,
            "customer_name": f"User_{i % 1000}",
            "email": f"user_{i % 1000}@example.com",
            "quantity": (i % 5) + 1,
            "amount": float((i % 100) + 10.5)
        }
        for i in range(NUM_RECORDS)
    ]

    # 2. Simulating Column-Oriented Storage (Contiguous Column Arrays)
    column_store = {
        "order_id": list(range(NUM_RECORDS)),
        "customer_name": [f"User_{i % 1000}" for i in range(NUM_RECORDS)],
        "email": [f"user_{i % 1000}@example.com" for i in range(NUM_RECORDS)],
        "quantity": [(i % 5) + 1 for i in range(NUM_RECORDS)],
        "amount": [float((i % 100) + 10.5) for i in range(NUM_RECORDS)]
    }

    # Benchmark: Compute Average Amount for orders where quantity > 3
    print("\n--- Benchmark: SELECT AVG(amount) WHERE quantity > 3 ---")

    # Row-Store Scan
    t0 = time.perf_counter()
    total_amount_row = 0.0
    count_row = 0
    for row in row_store:
        # Must touch the entire dictionary record
        if row["quantity"] > 3:
            total_amount_row += row["amount"]
            count_row += 1
    avg_row = total_amount_row / count_row if count_row else 0
    t_row = (time.perf_counter() - t0) * 1000

    # Column-Store Scan
    t1 = time.perf_counter()
    total_amount_col = 0.0
    count_col = 0
    quantities = column_store["quantity"]
    amounts = column_store["amount"]
    # Only touches the two necessary arrays; ignores names, emails, order_ids!
    for q, amt in zip(quantities, amounts):
        if q > 3:
            total_amount_col += amt
            count_col += 1
    avg_col = total_amount_col / count_col if count_col else 0
    t_col = (time.perf_counter() - t1) * 1000

    print(f"Row-Store Scan Time   : {t_row:6.2f} ms (Result: {avg_row:.2f})")
    print(f"Columnar-Store Scan Time: {t_col:6.2f} ms (Result: {avg_col:.2f})")
    print(f"Speedup Factor         : {t_row / t_col:.2f}x faster in columnar scan!")

if __name__ == "__main__":
    benchmark_storage_layouts()
```
