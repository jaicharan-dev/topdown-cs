---
id: 11-olap-vs-oltp
title: "OLTP vs OLAP"
description: "Fetching one record against scanning a hundred million, and why that difference is settled by how bytes sit on disk"

sidebar_position: 11
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between OLTP and OLAP? Compare their query patterns, row vs. columnar disk storage, Star vs. Snowflake schemas, and explain the emergence of HTAP architectures."

---

### Picture it

A filing room with ten million customer folders.

**One job is "fetch the folder for customer 4471, add a note, put it back".** It happens thousands of times a second. What matters is finding **one folder** fast and putting it back safely, and the obvious arrangement is a drawer of complete folders in order, so one trip gets you everything about that customer at once.

**The other job is "what was the total spend of everyone in Kerala last year".** It happens a few times an hour, and it needs **one line from every one of the ten million folders**.

Now look at what that second job costs in a room built for the first. To read one line per folder, you **open every folder and read past everything else in it**: the address, the phone number, the complaints history, forty pages you did not want. You have handled ten million folders to extract ten million short lines.

**So a room built for the second job files things differently.** It does not keep folders at all. It keeps a **single long list of every customer's spend**, another of every customer's region, and so on, each column kept together. Now the spend question reads **one list, start to finish**, and touches nothing else.

And something else falls out of that arrangement. A list of ten million spends is **ten million numbers of the same kind**, which compresses enormously, far better than a jumble of names, dates and addresses. A list of regions has perhaps thirty distinct values, so you store the thirty once and a tiny code per row.

**But try the first job in the second room.** To add a note about customer 4471 you must visit **every list** and alter one entry in each, and to read their whole record you reassemble it from forty places. The arrangement that made the aggregate cheap has made the single record expensive.

**That is the whole divide**: the same data, two incompatible physical layouts, each terrible at the other's job. The rest is naming and consequences.

---

### The proper terms

#### OLTP

**OLTP**, online transaction processing, is the operational workload: the database behind an application.

**Query pattern:** many **short** transactions, typically touching **a handful of rows by key**. Reads and writes are mixed, with writes a substantial share.

**Concurrency:** thousands of concurrent sessions.

**What matters:** **low latency per operation**, high write throughput, and **ACID** guarantees, since the data is money, inventory or identity.

**Schema:** **normalised**, typically 3NF, because the workload writes constantly and normalisation keeps writes small and invariants enforceable.

**Data:** the **current state**, with a working set measured in gigabytes to a few terabytes.

Typical statements: `SELECT * FROM orders WHERE id = 4471`, `INSERT INTO payments ...`, `UPDATE inventory SET qty = qty - 1 WHERE sku = ?`.

#### OLAP

**OLAP**, online analytical processing, is the analytical workload: reporting, dashboards, data science.

**Query pattern:** few, **long-running**, complex queries that scan millions of rows, aggregate and group. Overwhelmingly **read-only**, with writes arriving as bulk loads.

**Concurrency:** tens of sessions, often fewer.

**What matters:** **throughput over huge scans**, not per-operation latency. A query taking thirty seconds is acceptable; reading a terabyte inefficiently is not.

**Schema:** **denormalised**, usually a star schema, because joins across huge tables are expensive and the data is written once by a pipeline.

**Data:** **historical and append-mostly**, terabytes to petabytes.

Typical statement: `SELECT region, quarter, SUM(amount) FROM sales JOIN ... GROUP BY region, quarter` over five years.

#### Row storage against columnar storage

This is the mechanism underneath everything else, and it is the part worth being precise about.

**A row store** keeps all of a row's columns **contiguous on a page**. Reading one row is **one page read** that yields every column.

That is exactly right for OLTP, where you fetch or write a whole record.

It is disastrous for analytics. `SUM(amount)` over 100 million rows must read every page of the table, because each `amount` value sits amid all the other columns of its row. If a row is 400 bytes and `amount` is 8, you have read **fifty times the data you needed**.

**A column store** keeps each column **separately and contiguously**. Reading one column is a **sequential scan of only that column's data**.

Three advantages follow, and all three matter:

**I/O is proportional to the columns touched**, not to the width of the table. A query reading 3 columns of a 200-column table reads about 1.5 percent of it.

**Compression is dramatically better**, because a column holds homogeneous values. Run-length encoding collapses repeated values, dictionary encoding replaces a small set of distinct values with tiny codes, **delta encoding** stores differences for sorted numbers and timestamps. Ten times or better is routine, and that multiplies the I/O saving again.

**Vectorised execution.** Values are contiguous and of one type, so the engine processes them in batches with SIMD instructions rather than row at a time, which is a large CPU win on top of the I/O win.

And the mirror image: a column store is **terrible for OLTP**. Inserting one row touches **every column's storage**. Updating one field is a read-modify-write of a compressed block. A point lookup must **reassemble a row from N separate places**.

So the layout is not an implementation detail; **the storage layout is the OLTP/OLAP divide.**

#### Star and snowflake schemas

Analytical schemas are organised around a **fact table** and **dimension tables**.

**The fact table** holds the **measures**, the numbers you aggregate, plus **foreign keys** to the dimensions. It is by far the largest table, often billions of rows. Its **grain**, meaning what one row represents, is the first design decision.

**Dimension tables** hold the **descriptive attributes** you filter and group by: product, customer, date, store. They are small relative to the fact table.

**A star schema** keeps each dimension denormalised into a single table. A query touches the fact table plus **one join per dimension**, so the join count is small and fixed. This is the default, and BI tools are built around it.

**A snowflake schema normalises the dimensions** into sub-dimensions: `Product -> Category -> Department`. It saves storage and removes update anomalies **within the dimension**, at the cost of **more joins per query** and a structure that is harder for tools and humans to navigate.

The trade in one line: **a star buys query simplicity and speed with storage and dimension-update complexity.** And since the dimensions are tiny next to the fact table, the storage a snowflake saves is usually **irrelevant**, which is why the star is the default and snowflaking is reserved for genuinely large or volatile dimensions.

Two related concepts worth naming: **slowly changing dimensions**, where a **Type 2** dimension keeps history by adding a new row with validity dates rather than overwriting, and **conformed dimensions**, shared across fact tables so that measures from different processes can be compared.

#### HTAP

**HTAP**, hybrid transactional and analytical processing, serves both workloads from one system.

**The problem it addresses** is the classic two-system architecture: an OLTP database, an ETL or ELT pipeline, and a separate warehouse. That means:

**Analytics is stale**, by minutes or hours, so you cannot answer an operational question about the last five minutes.

**The pipeline is real operational burden**: scheduling, failures, backfills, schema drift between the two systems.

**Data is duplicated**, with the cost and the consistency questions that brings.

**How it works**, typically: a **row-oriented primary** for transactions plus an **automatically maintained columnar replica**, kept current by the engine rather than by a pipeline, often as an in-memory column store or a **delta plus base** arrangement where recent writes accumulate in a row-format delta that is periodically merged into compressed columnar storage. The optimiser chooses which representation to read per query.

Examples: **SAP HANA**, **TiDB** with row-oriented TiKV and columnar TiFlash, **SingleStore**, Oracle Database In-Memory, Google AlloyDB and Snowflake Unistore.

**The costs**, which a complete answer includes:

**Resource contention.** A large analytical scan competes with transactional work for CPU, memory and I/O, so transactional latency can suffer exactly when analytics is busiest.

**Memory and storage.** Maintaining two representations costs both.

**Complexity**, in the engine and in reasoning about performance.

So the honest positioning is that HTAP is for **fresh analytics on operational data**, such as real-time dashboards, fraud scoring or personalisation, rather than as a replacement for a petabyte warehouse serving long historical queries.

---

### In code

```text
The two workloads:

                    OLTP                      OLAP
  pattern           many SHORT transactions   few LONG queries
  rows touched      a handful, BY KEY         MILLIONS, scanned
  read/write mix    mixed, writes substantial read-only + bulk loads
  concurrency       thousands of sessions     tens
  what matters      LATENCY per operation     THROUGHPUT over scans
                    ACID, write throughput
  schema            NORMALISED (3NF)          DENORMALISED (star)
  data              CURRENT state, GB-TB      HISTORICAL, TB-PB
  example           SELECT * FROM orders      SELECT region, quarter,
                    WHERE id = 4471                  SUM(amount)
                    UPDATE inventory ...      FROM sales GROUP BY ...
```

```text
Row store vs column store: the mechanism under everything else

  ROW STORE: a row's columns are CONTIGUOUS on a page
     page 1: [id=1|name=arun |region=KL|amount=500|...40 more cols]
             [id=2|name=bela |region=TN|amount=300|...]
             [id=3|name=chit |region=KL|amount=900|...]

     fetch row 2        -> ONE page read, every column        PERFECT
     SUM(amount) over   -> must read EVERY PAGE of the table, because
     100M rows             each amount sits amid all the other
                           columns of its row
                        -> row 400 bytes, amount 8 bytes
                        -> YOU READ 50x THE DATA YOU NEEDED

  COLUMN STORE: each column stored SEPARATELY and CONTIGUOUSLY
     id      : [1][2][3][4]...
     name    : [arun][bela][chit]...
     region  : [KL][TN][KL]...
     amount  : [500][300][900]...      <- one sequential scan

     SUM(amount)   -> read ONE LIST, start to finish              PERFECT
     fetch row 2   -> reassemble from 40 SEPARATE PLACES
     insert a row  -> touch EVERY column's storage
     update 1 field-> read-modify-write of a COMPRESSED BLOCK   TERRIBLE
```

```text
Why columnar wins three times over, not once:

  1. I/O PROPORTIONAL TO COLUMNS TOUCHED
        3 columns of a 200-column table -> ~1.5% of the table

  2. COMPRESSION IS DRAMATICALLY BETTER (homogeneous values)
        RUN-LENGTH    [KL][KL][KL][KL][TN][TN] -> (KL,4)(TN,2)
        DICTIONARY    30 distinct regions -> 30 strings + a 1-byte
                      code per row
        DELTA         sorted timestamps -> store the differences
        -> 10x or better is routine, MULTIPLYING the I/O saving

  3. VECTORISED EXECUTION
        values are contiguous and one type, so the engine processes
        them in BATCHES WITH SIMD rather than row at a time
        -> a large CPU win ON TOP OF the I/O win

  so the storage layout is not an implementation detail.
  THE STORAGE LAYOUT IS THE OLTP/OLAP DIVIDE.
```

```sql
-- STAR SCHEMA: one fact table, denormalised dimensions,
-- ONE JOIN PER DIMENSION
CREATE TABLE fact_sales (               -- billions of rows
    date_key     INT, product_key  INT,
    store_key    INT, customer_key INT,
    quantity     INT,                   -- MEASURES: what you aggregate
    amount       NUMERIC
);
CREATE TABLE dim_product (              -- small, and FLAT
    product_key INT PRIMARY KEY,
    name TEXT, category TEXT, department TEXT, brand TEXT
    --            ^^^^^^^^^^^^^^^^^^^^^^^^^^ denormalised INTO the
    --            dimension: category repeats, and nobody minds
);

SELECT d.category, SUM(f.amount)
FROM   fact_sales f
JOIN   dim_product d ON d.product_key = f.product_key
GROUP BY d.category;                    -- ONE join
```

```sql
-- SNOWFLAKE: the dimensions are NORMALISED into sub-dimensions
CREATE TABLE dim_product    (product_key INT PRIMARY KEY,
                             name TEXT, category_key INT);
CREATE TABLE dim_category   (category_key INT PRIMARY KEY,
                             name TEXT, department_key INT);
CREATE TABLE dim_department (department_key INT PRIMARY KEY, name TEXT);

SELECT dep.name, SUM(f.amount)
FROM   fact_sales f
JOIN   dim_product    p   ON p.product_key    = f.product_key
JOIN   dim_category   c   ON c.category_key   = p.category_key
JOIN   dim_department dep ON dep.department_key = c.department_key
GROUP BY dep.name;                      -- THREE joins for one grouping

-- the trade, in one line:
--   A STAR BUYS QUERY SIMPLICITY AND SPEED WITH STORAGE AND
--   DIMENSION-UPDATE COMPLEXITY.
-- and since dimensions are TINY next to the fact table, the storage
-- a snowflake saves is usually IRRELEVANT, which is why the star is
-- the default and snowflaking is reserved for genuinely large or
-- volatile dimensions.
```

```text
Two related concepts worth naming:

  SLOWLY CHANGING DIMENSIONS
     a customer moves from Kerala to Tamil Nadu. Do last year's
     sales belong to the old region or the new one?
     TYPE 1  overwrite: history is LOST
     TYPE 2  ADD A NEW ROW with validity dates and a surrogate key,
             so each fact row points at the version current when it
             happened                              <- the usual choice
     TYPE 3  keep a "previous value" column: limited history

  CONFORMED DIMENSIONS
     the SAME dimension table shared across several fact tables, so
     measures from different business processes can be compared on
     the same axis (the same dim_date across sales and returns)
```

```text
HTAP: one system for both

  THE PROBLEM IT ADDRESSES, the classic two-system architecture:

     [OLTP db] --ETL/ELT pipeline--> [warehouse] --> [dashboards]
                   runs hourly
                   |
                   +-- ANALYTICS IS STALE by minutes or hours, so
                   |   you cannot answer an operational question
                   |   about the last five minutes
                   +-- THE PIPELINE IS OPERATIONAL BURDEN:
                   |   scheduling, failures, backfills, schema drift
                   +-- DATA IS DUPLICATED, with the cost and the
                       consistency questions that brings

  HOW HTAP WORKS, typically:

     a ROW-ORIENTED PRIMARY for transactions
          +
     an AUTOMATICALLY MAINTAINED COLUMNAR REPLICA, kept current BY
     THE ENGINE rather than by a pipeline
          often DELTA + BASE: recent writes accumulate in a
          row-format delta, periodically merged into compressed
          columnar storage
          +
     the OPTIMISER CHOOSES which representation to read, per query

  examples: SAP HANA, TiDB (row TiKV + columnar TiFlash),
            SingleStore, Oracle In-Memory, Google AlloyDB,
            Snowflake Unistore

  THE COSTS:
     RESOURCE CONTENTION  a large analytical scan competes with
                          transactional work for CPU, memory and
                          I/O, so transactional latency can suffer
                          exactly when analytics is busiest
     MEMORY AND STORAGE   two representations cost both
     COMPLEXITY           in the engine, and in reasoning about
                          performance

  so HTAP is for FRESH ANALYTICS ON OPERATIONAL DATA (real-time
  dashboards, fraud scoring, personalisation), not a replacement for
  a petabyte warehouse serving long historical queries.
```

---

### What they ask next

**"Why is a row store bad for analytics?"**
Because the value you want sits amid every other column of its row, so summing one column reads every page of the table. With a 400-byte row and an 8-byte column you read fifty times the data you needed.

**"Why does columnar compress so much better?"**
Because a column holds homogeneous values, which run-length, dictionary and delta encoding exploit directly. A region column with thirty distinct values becomes thirty strings plus a one-byte code per row, and the compression multiplies the I/O saving on top of reading fewer columns.

**"Why is columnar bad for OLTP?"**
Because a single row's data is spread across every column's storage, so inserting touches all of them, updating one field is a read-modify-write of a compressed block, and a point lookup reassembles the row from N places.

**"Star or snowflake?"**
Star, by default. The dimensions are tiny next to the fact table, so the storage a snowflake saves is usually irrelevant, while the extra joins cost on every query and the structure is harder for tools to navigate. Snowflake only where a dimension is genuinely large or changes often enough that the update anomalies matter.

**"What is the grain of a fact table?"**
What one row represents, such as one line item on one order. It is the first design decision because everything else follows: which dimensions apply, which measures are additive, and what a sum actually means.

**"What is a Type 2 slowly changing dimension?"**
One that records history by inserting a new row with validity dates when an attribute changes, rather than overwriting. Each fact row then points at the dimension version current when it happened, so last year's sales stay attributed to last year's region.

**"What problem does HTAP really solve?"**
Staleness and pipeline burden. The two-system architecture means analytics lags by minutes or hours and the ETL pipeline is an operational system of its own. HTAP keeps a columnar replica current inside the engine so operational questions can be asked about the last few seconds.

**"What is the catch with HTAP?"**
Resource contention above all: a heavy analytical scan competes with transactional work, so transactional latency suffers exactly when analytics is busiest. Plus the memory and storage for two representations, and more complex performance reasoning.

**The common wrong answer** is "OLTP is for transactions and OLAP is for analytics", which restates the names. The substance is that the two workloads demand **opposite physical layouts**, that columnar wins on **I/O, compression and vectorisation** together rather than on one of them, that the **star schema is the default because dimension storage is negligible**, and that HTAP exists to remove **staleness and the ETL pipeline**, at the price of contention.

---

### Say this in the interview

*"OLTP is the operational workload behind an application: many short transactions touching a handful of rows by key, mixed reads and writes with writes a substantial share, thousands of concurrent sessions, where what matters is low latency per operation and ACID guarantees because the data is money or inventory. The schema is normalised, typically 3NF, because the workload writes constantly and normalisation keeps writes small and invariants enforceable, and the data is current state, gigabytes to a few terabytes.*

*OLAP is reporting and analysis: few long-running complex queries scanning millions of rows and aggregating, overwhelmingly read-only with writes arriving as bulk loads, tens of sessions, where what matters is throughput over huge scans rather than per-operation latency. The schema is denormalised into a star, because joins across huge tables are expensive and the data is written once by a pipeline, and the data is historical and append-mostly, terabytes to petabytes.*

*The mechanism underneath all of that is storage layout. A row store keeps a row's columns contiguous on a page, so fetching one row is one page read, which is exactly right for OLTP. For analytics it is disastrous: summing one column over a hundred million rows must read every page, because each value sits amid all the other columns of its row, so with a 400-byte row and an 8-byte column you read fifty times the data you needed. A column store keeps each column separately and contiguously, so the same query reads one list start to finish.*

*Columnar wins three times over, not once. I/O is proportional to the columns touched, so three columns of a 200-column table is about one and a half percent of it. Compression is dramatically better because a column is homogeneous, so run-length, dictionary and delta encoding give ten times or more and multiply the I/O saving again. And vectorised execution becomes possible, because values are contiguous and one type, so the engine processes batches with SIMD rather than row at a time. The mirror image is that columnar is terrible for OLTP: inserting a row touches every column's storage, updating a field is a read-modify-write of a compressed block, and a point lookup reassembles the row from many places. So the storage layout is the OLTP/OLAP divide.*

*Analytical schemas centre on a fact table holding the measures plus foreign keys, which is by far the largest table and whose grain is the first design decision, surrounded by small dimension tables holding descriptive attributes. A star keeps each dimension denormalised into one table, so a query is the fact table plus one join per dimension, and BI tools are built around it. A snowflake normalises the dimensions into sub-dimensions, saving storage and removing update anomalies within the dimension, at the cost of more joins per query and a structure that is harder to navigate. The trade is that a star buys query simplicity and speed with storage and dimension-update complexity, and since dimensions are tiny next to the fact table the storage a snowflake saves is usually irrelevant, so the star is the default. Two related ideas are slowly changing dimensions, where Type 2 adds a new row with validity dates so history is preserved, and conformed dimensions shared across fact tables so measures can be compared on the same axis.*

*HTAP serves both workloads from one system. The problem it addresses is the classic two-system architecture of an OLTP database, an ETL pipeline and a separate warehouse, which means analytics is stale by minutes or hours, the pipeline is real operational burden with scheduling, failures and schema drift, and the data is duplicated. HTAP typically keeps a row-oriented primary for transactions plus an automatically maintained columnar replica, updated by the engine rather than a pipeline, often as a delta plus base arrangement where recent writes accumulate in row format and are periodically merged into compressed columnar storage, with the optimiser choosing which to read per query. SAP HANA, TiDB with TiKV and TiFlash, SingleStore, Oracle In-Memory and AlloyDB all work this way. The costs are resource contention above all, since a large analytical scan competes with transactional work exactly when analytics is busiest, plus the memory and storage for two representations and the added complexity. So it is for fresh analytics on operational data rather than a replacement for a petabyte warehouse."*
