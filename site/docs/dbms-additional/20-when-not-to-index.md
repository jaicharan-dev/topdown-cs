---
id: 20-when-not-to-index
title: "When NOT to Create a Database Index: Anti-Patterns & Overheads"
description: "Identify production scenarios where indexes degrade database performance: low selectivity, small tables, write-heavy ingestion, and HOT updates."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "When would you deliberately NOT create an index on a column, even if that column frequently appears in `WHERE` clauses? Explain the Cost-Based Optimizer's selectivity threshold, write amplification, and PostgreSQL's Heap-Only Tuples (HOT)."

"Just add an index" is not free advice. An index speeds up reads, but every index also has to be kept up to date on every write, and it takes up RAM in the buffer pool. Sometimes that trade is a bad one.

<Diagram>
<Row>
<Box title="Add an index" accent="#818cf8">
<Field icon="⚡" code="reads get faster" hint="O(log N) seek, on selective queries" variant="neutral" />
</Box>
<Arrow label="but costs" />
<Box title="The trade-off" accent="#fb7185">
<Field icon="✍️" code="writes get slower" hint="every INSERT/DELETE updates the tree" variant="neutral" />
<Field icon="💾" code="RAM gets squeezed" hint="index pages compete for buffer pool space" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### Five cases where an index actually hurts

#### 1. Low-cardinality columns

**Cardinality** is how many distinct values a column has. **Selectivity** is how small a slice of the table a filter picks out:

$$\text{Selectivity} = \frac{\text{Rows Returned}}{\text{Total Table Rows}}$$

If a filter like `is_active = TRUE` matches more than roughly 15-20% of the table, the query optimizer will usually ignore the index entirely and just scan the whole table. Why? Reading through an index means jumping to a different, random disk page for every single matching row. A full scan reads pages in order, letting the disk stream data at full speed — for a big chunk of the table, that beats the index every time.

#### 2. Small tables

A lookup table like `country_codes` with a few hundred rows already fits on one or two disk pages. Scanning it takes a fraction of a millisecond. Going through an index instead means reading the index page, *then* the data page — doubling the work for nothing.

#### 3. Write-heavy ingestion

In things like IoT telemetry or audit logs, where writes vastly outnumber reads, every `INSERT` has to update every index on the table. When an index page fills up, it triggers a **page split** — a new page gets allocated and keys get shuffled around. A handful of unnecessary indexes can cut ingestion throughput by 70-80%.

#### 4. Columns that get updated often, and PostgreSQL's HOT optimization

PostgreSQL has a trick called **Heap-Only Tuples (HOT)**: if you update a row and the new version still fits on the same page, Postgres can just chain the old and new versions together — without touching any secondary index at all.

The catch: that trick only works if the updated column has no index on it. Add an index on a frequently-updated column (like `last_heartbeat_at`), and HOT is disabled for those updates — every single index now needs a new entry on every write, which bloats the indexes and the write-ahead log.

#### 5. Wide text columns

Indexing a `VARCHAR(1000)` column full of free text wastes huge amounts of page space, shrinks the tree's fan-out, and evicts other useful pages from the buffer pool cache. Prefer a prefix index (`CREATE INDEX idx_url ON links (url(30))`) or a proper full-text engine (GIN/GiST, or Elasticsearch) instead.

---

### The middle ground: partial indexes

If one specific value is rare but important — say 0.1% of orders are `'failed'` and that's the one you query for — index just that slice:

```sql
-- 99.9% of orders are 'processed', 0.1% are 'failed'
CREATE INDEX idx_failed_orders 
ON Orders (created_at) 
WHERE status = 'failed';
```

This index stays tiny, costs nothing on the millions of normal writes, and still gives you a fast lookup for the rare case you actually care about.

---

### Say this in the interview

*"I'd skip an index in five cases: low-cardinality columns, where selectivity is too poor for the optimizer to bother using it; small tables, where a full scan is already instant; write-heavy ingestion tables, where every index slows down every insert; frequently-updated columns, where an index breaks Postgres's HOT optimization and causes write amplification; and wide text columns, which blow up page size for little benefit. Where I still need to query a rare value in a low-cardinality column, I'd reach for a partial index instead of a full one."*

---

### Code: measuring the write penalty

The following Python script benchmarks how adding secondary indexes slows down `INSERT` operations, measuring the time difference when inserting 100,000 rows into an unindexed versus multi-indexed table.

```python
import sqlite3
import time

def benchmark_indexing_overhead():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    NUM_ROWS = 100_000

    # 1. Benchmark Table with NO secondary indexes
    cursor.execute("""
        CREATE TABLE Ingestion_NoIndex (
            id INTEGER PRIMARY KEY,
            device_id INT,
            metric_val REAL,
            status TEXT
        );
    """)

    t0 = time.perf_counter()
    cursor.execute("BEGIN TRANSACTION;")
    for i in range(NUM_ROWS):
        cursor.execute("INSERT INTO Ingestion_NoIndex VALUES (?, ?, ?, ?);",
                       (i, i % 500, float(i * 1.5), "active"))
    conn.commit()
    t_no_index = time.perf_counter() - t0

    # 2. Benchmark Table with 4 Secondary Indexes
    cursor.execute("""
        CREATE TABLE Ingestion_WithIndexes (
            id INTEGER PRIMARY KEY,
            device_id INT,
            metric_val REAL,
            status TEXT
        );
    """)
    cursor.execute("CREATE INDEX idx_dev ON Ingestion_WithIndexes(device_id);")
    cursor.execute("CREATE INDEX idx_met ON Ingestion_WithIndexes(metric_val);")
    cursor.execute("CREATE INDEX idx_stat ON Ingestion_WithIndexes(status);")
    cursor.execute("CREATE INDEX idx_comp ON Ingestion_WithIndexes(device_id, status);")

    t1 = time.perf_counter()
    cursor.execute("BEGIN TRANSACTION;")
    for i in range(NUM_ROWS):
        cursor.execute("INSERT INTO Ingestion_WithIndexes VALUES (?, ?, ?, ?);",
                       (i, i % 500, float(i * 1.5), "active"))
    conn.commit()
    t_with_indexes = time.perf_counter() - t1

    print(f"[*] Ingesting {NUM_ROWS:,} rows:")
    print(f"    - Table with 0 Indexes : {t_no_index:.2f} seconds")
    print(f"    - Table with 4 Indexes : {t_with_indexes:.2f} seconds")
    print(f"    - Ingestion Degradation: {((t_with_indexes - t_no_index) / t_no_index) * 100:.1f}% slower due to B+ Tree updates!")

    conn.close()

if __name__ == "__main__":
    benchmark_indexing_overhead()
```
