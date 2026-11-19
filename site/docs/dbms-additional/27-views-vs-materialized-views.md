---
id: 27-views-vs-materialized-views
title: "Views vs Materialized Views"
description: "A stored question against a stored answer, and the answer is stale from the moment it is written down"

sidebar_position: 27
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a standard View and a Materialized View in a database? How does each affect storage, read latency, and data freshness, what are the strict prerequisites for concurrent refreshes, and how does the optimizer handle query rewrite?"

---

### Picture it

Somebody asks you the same complicated question every morning: **what did every region sell last quarter, broken down by product line?**

**One option is to keep the question written down** on a card, with instructions for working it out. Every morning you read the card and **do the calculation again**. It takes twenty minutes, and the answer is **exactly right as of this morning**. The card costs nothing to store and never needs maintaining.

**The other option is to keep the answer written down.** Now the morning request is instant: you read it off the sheet.

And you have taken on a new problem, which is that **the sheet was true when you wrote it and is drifting out of date from that moment onward**. Sales happen all day. The sheet does not change. It is **not wrong**, exactly; it is a correct statement about an earlier moment, and whether that is acceptable is a question about **the business**, not about the sheet.

**So you redo it periodically**, and that raises its own difficulty. Rewriting the whole sheet takes twenty minutes, and while you are rubbing it out and writing it again, **nobody can read it**. For a sheet people consult constantly, a twenty-minute blank is worse than stale figures.

The way round that is to work the new answer out **on a separate sheet** and then transfer only the lines that actually changed, so the original stays readable throughout. It takes **longer overall**, and the sheet is never unavailable. To transfer line by line you need a way to **match up the lines**, which means every line must carry something that identifies it uniquely.

**And one last refinement.** If the person asking knows the sheet exists, they ask for the sheet. But a really well-organised office would notice that **the question they just asked is the one the sheet already answers**, and hand it over without being asked. Some offices do that. Most do not, and you have to name the sheet yourself.

---

### The proper terms

#### A view is a stored query

A **view** is a **named query definition**. It stores **no data**. Selecting from it executes the underlying query.

The consequences:

**Zero storage**, beyond the definition in the catalogue.

**Always current**, because it reads the base tables at query time.

**No maintenance**, no refresh, nothing to schedule.

**Read latency equals the cost of the underlying query**, every time.

The thing people underestimate is **view merging**. For a simple view the optimiser usually **folds the definition into the outer query** and plans the combined statement, so predicates are pushed down, indexes are used, and the view costs nothing at all relative to writing the query inline.

That folding is **not always possible**. A view containing an **aggregation**, `DISTINCT`, a **window function**, `UNION` or a `LIMIT` often cannot be merged, so the engine must materialise the view's result at runtime before applying the outer predicates. That is where a view genuinely becomes slow, and it is worth being able to say that the cost of a view is really the cost of **whether it can be merged**.

Views also serve purposes that have nothing to do with performance: **abstraction**, so the schema can change behind a stable interface; **security**, exposing a subset of columns or rows while the base table stays inaccessible; and **simplification** of a join that everybody otherwise repeats.

#### A materialised view is a stored result

A **materialised view** stores **the actual rows** produced by its query, physically, like a table.

The consequences:

**It occupies storage**, proportional to the result.

**Reads are as fast as a table**, because they are a table read. An expensive aggregation becomes a scan of a small result.

**It can have its own indexes**, which a plain view cannot, since there is nothing to index.

**It is stale by construction.** The data is a **snapshot as of the last refresh**, and the only question is how stale you can tolerate.

**It costs on refresh**, which is when the work actually happens.

So the trade is not subtle: **you move the cost from read time to refresh time, and pay for it in freshness and storage.**

#### Refreshing, and the prerequisites for concurrency

**PostgreSQL's plain refresh** rebuilds the whole thing:

```sql
REFRESH MATERIALIZED VIEW mv;
```

It takes an **`ACCESS EXCLUSIVE` lock**, which means the view is **completely unreadable for the duration**. On a view that takes twenty minutes to build and is queried by a dashboard, that is an outage rather than a maintenance task.

**The concurrent form** avoids it:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv;
```

Readers continue throughout. The **strict prerequisites**, which the question asks for explicitly:

**The view must have at least one `UNIQUE` index covering all its rows.** This is not optional and not a performance suggestion. The concurrent refresh computes the new result into a temporary table and then applies the **difference** as `INSERT`, `UPDATE` and `DELETE` statements, and to compute a difference it must be able to **match old rows to new ones**. The unique index is what provides that identity.

**The view must already be populated.** You cannot use `CONCURRENTLY` on a view created `WITH NO DATA` or never refreshed, because there is nothing to diff against. The first refresh must be a plain one.

**It is slower than a plain refresh**, often substantially, because it builds the full result into a temporary table **and then** performs a diff-and-apply, rather than simply swapping the storage. You are buying availability with time.

Other engines take different approaches worth naming:

**Oracle** supports **incremental**, or **fast**, refresh using **materialised view logs** on the base tables, which record changes so only the delta is applied. That is far cheaper than a full rebuild, at the cost of maintaining the logs.

**SQL Server's indexed views** are maintained **synchronously**, on every write to a base table, so they are **never stale**. The price is that every base-table write pays the maintenance cost, and the restrictions are severe: `SCHEMABINDING`, deterministic expressions only, no outer joins, no subqueries, and `COUNT_BIG(*)` required if the view aggregates.

**PostgreSQL has no built-in incremental refresh**, which is the gap that extensions and hand-rolled trigger-maintained summary tables fill.

#### Query rewrite

This is the capability that separates the implementations, and the answer depends on the engine.

**Query rewrite** means the optimiser recognises that a query against the **base tables** could be answered from a materialised view, and **substitutes it automatically**. The user never names the view.

**Oracle does this**, when `QUERY_REWRITE_ENABLED` is on and the view is sufficiently trustworthy, and it can rewrite even partially, using the view for part of the query and the base tables for the rest.

**SQL Server does it for indexed views** in Enterprise edition, automatically, using an indexed view when the optimiser can prove it satisfies the query.

**PostgreSQL does not.** You must query the materialised view **by name**. This is a significant practical difference: it means that adopting a materialised view in PostgreSQL requires **changing every query that should benefit**, whereas in Oracle it can be a transparent optimisation.

The reason it is hard is worth a sentence: the optimiser must **prove equivalence** between the query and the view's definition, including that the view's freshness is acceptable, which is a containment problem that becomes difficult quickly for anything beyond simple aggregations.

#### Choosing between them

**Use a view** when you want abstraction, security or simplification, and the underlying query is cheap enough to run each time. It is free and always correct.

**Use a materialised view** when the query is **genuinely expensive**, is read **far more often than the data changes**, and **staleness is acceptable** for the use case. Dashboards, reports and analytical aggregates fit; a customer's current balance does not.

**Consider the alternatives** rather than reaching for it automatically: a **summary table** maintained by triggers or by the application gives incremental maintenance that PostgreSQL's materialised views lack; a **cache** in front of the query may be simpler; and sometimes the right answer is an **index** that makes the original query fast enough that none of this is needed.

---

### In code

```sql
-- A VIEW: a stored QUERY. No data, no storage, always current.
CREATE VIEW quarterly_sales AS
SELECT region, product_line, DATE_TRUNC('quarter', sold_at) AS q,
       SUM(amount) AS total
FROM   sales
GROUP  BY region, product_line, DATE_TRUNC('quarter', sold_at);

SELECT * FROM quarterly_sales WHERE region = 'KL';
--   runs the whole aggregation EVERY TIME.
--   always correct, costs the full query, stores nothing.
```

```text
What people underestimate about views: VIEW MERGING

  for a SIMPLE view, the optimiser FOLDS THE DEFINITION INTO THE
  OUTER QUERY and plans the combined statement, so predicates are
  pushed down, indexes are used, and the view costs NOTHING AT ALL
  relative to writing the query inline:

     CREATE VIEW open_orders AS
       SELECT * FROM orders WHERE status = 'open';

     SELECT * FROM open_orders WHERE customer_id = 42;
     -> planned as:
     SELECT * FROM orders WHERE status = 'open' AND customer_id = 42;
     -> uses an index on (customer_id, status)

  but folding is NOT ALWAYS POSSIBLE. A view containing an
  AGGREGATION, DISTINCT, a WINDOW FUNCTION, UNION or LIMIT often
  cannot be merged, so the engine must MATERIALISE THE VIEW'S RESULT
  AT RUNTIME before applying the outer predicates.

  -> the cost of a view is really THE COST OF WHETHER IT CAN BE
     MERGED.

  and views serve purposes unrelated to performance:
     ABSTRACTION     the schema can change behind a stable interface
     SECURITY        expose a subset of columns or rows while the
                     base table stays inaccessible
     SIMPLIFICATION  a join everybody would otherwise repeat
```

```sql
-- A MATERIALIZED VIEW: a stored RESULT. Real rows, real storage.
CREATE MATERIALIZED VIEW quarterly_sales_mv AS
SELECT region, product_line, DATE_TRUNC('quarter', sold_at) AS q,
       SUM(amount) AS total
FROM   sales
GROUP  BY region, product_line, DATE_TRUNC('quarter', sold_at);

-- it can have ITS OWN INDEXES, which a plain view cannot, since a
-- plain view has nothing to index:
CREATE UNIQUE INDEX ON quarterly_sales_mv (region, product_line, q);

SELECT * FROM quarterly_sales_mv WHERE region = 'KL';
--   a TABLE READ. Milliseconds instead of a full aggregation.
--   and STALE: it reflects the last refresh, not now.
```

```text
The comparison:

                    VIEW                  MATERIALIZED VIEW
  stores            a QUERY               the actual ROWS
  storage cost      none                  proportional to the result
  read latency      the full query,       a TABLE READ
                    every time
  freshness         ALWAYS CURRENT        STALE: a snapshot as of
                                          the last refresh
  write cost        none                  paid at REFRESH time
  own indexes       NO (nothing to index) YES
  maintenance       none                  scheduling, monitoring,
                                          failure handling

  the trade is not subtle: YOU MOVE THE COST FROM READ TIME TO
  REFRESH TIME, AND PAY FOR IT IN FRESHNESS AND STORAGE.
```

```sql
-- REFRESHING, and why the concurrent form exists

REFRESH MATERIALIZED VIEW quarterly_sales_mv;
--   takes an ACCESS EXCLUSIVE lock.
--   THE VIEW IS COMPLETELY UNREADABLE FOR THE DURATION.
--   on a twenty-minute rebuild behind a dashboard, that is an
--   OUTAGE, not a maintenance task.

REFRESH MATERIALIZED VIEW CONCURRENTLY quarterly_sales_mv;
--   readers continue throughout.
```

```text
THE STRICT PREREQUISITES FOR CONCURRENTLY:

  1. AT LEAST ONE UNIQUE INDEX COVERING ALL ROWS
why:   the concurrent refresh computes the new result into a
       TEMPORARY TABLE and then applies THE DIFFERENCE as INSERT,
       UPDATE and DELETE statements.
       To compute a difference it must MATCH OLD ROWS TO NEW ONES,
       and the unique index is what provides that IDENTITY.
       This is not optional and not a performance suggestion.

  2. THE VIEW MUST ALREADY BE POPULATED
why:   there is nothing to diff against. You cannot use CONCURRENTLY
       on a view created WITH NO DATA or never refreshed; the FIRST
       refresh must be a plain one.

  3. IT IS SLOWER THAN A PLAIN REFRESH, often substantially
why:   it builds the FULL result into a temporary table AND THEN
       does a diff-and-apply, rather than simply swapping the
       storage.
       YOU ARE BUYING AVAILABILITY WITH TIME.
```

```text
Other engines, and the capability gaps:

  ORACLE       INCREMENTAL (FAST) REFRESH using MATERIALIZED VIEW
               LOGS on the base tables, which record changes so only
               the DELTA is applied.
               far cheaper than a full rebuild, at the cost of
               maintaining the logs.

  SQL SERVER   INDEXED VIEWS are maintained SYNCHRONOUSLY, on every
               write to a base table, so they are NEVER STALE.
               the price: every base-table write pays the
               maintenance cost, and the restrictions are severe:
                  SCHEMABINDING
                  deterministic expressions only
                  no outer joins, no subqueries
                  COUNT_BIG(*) required if the view aggregates

  POSTGRESQL   NO BUILT-IN INCREMENTAL REFRESH.
               that gap is what extensions and hand-rolled
               trigger-maintained summary tables fill.
```

```text
QUERY REWRITE: the capability that separates the implementations

  the optimiser recognises that a query against THE BASE TABLES
  could be answered from a materialised view, and SUBSTITUTES IT
  AUTOMATICALLY. THE USER NEVER NAMES THE VIEW.

     user writes:   SELECT region, SUM(amount) FROM sales
                    GROUP BY region;
     optimiser:     "quarterly_sales_mv already contains this"
                    -> reads the MV instead

  ORACLE       YES, with QUERY_REWRITE_ENABLED, and it can rewrite
               PARTIALLY: using the view for part of the query and
               the base tables for the rest

  SQL SERVER   YES for INDEXED VIEWS, in Enterprise edition,
               automatically, when the optimiser can prove the view
               satisfies the query

  POSTGRESQL   NO. You must query the materialised view BY NAME.

  that last point is a significant practical difference: adopting a
  materialised view in PostgreSQL means CHANGING EVERY QUERY THAT
  SHOULD BENEFIT, whereas in Oracle it can be a transparent
  optimisation.

  why it is hard: the optimiser must PROVE EQUIVALENCE between the
  query and the view definition, including that the view's freshness
  is acceptable, which is a containment problem that becomes
  difficult quickly beyond simple aggregations.
```

```sql
-- CHOOSING, and the alternatives worth considering first

-- A VIEW when you want abstraction, security or simplification and
-- the query is cheap enough to run each time. Free, always correct.
CREATE VIEW public_users AS
SELECT id, display_name, joined_at FROM users;   -- no email, no hash

-- A MATERIALIZED VIEW when the query is GENUINELY EXPENSIVE, is read
-- FAR MORE OFTEN than the data changes, and STALENESS IS ACCEPTABLE.
--   fits:        dashboards, reports, analytical aggregates
--   DOES NOT:    a customer's current balance

-- AND THE ALTERNATIVES, rather than reaching for it automatically:
--   a SUMMARY TABLE maintained by triggers or by the application,
--     which gives the incremental maintenance PostgreSQL's
--     materialised views lack
--   a CACHE in front of the query, which may be simpler
--   an INDEX that makes the original query fast enough that none of
--     this is needed
```

---

### What they ask next

**"Does a view store data?"**
No. It stores a query definition, so every select from it runs the underlying query against the base tables. That is why it costs nothing to store and is always current.

**"Is a view slow?"**
Usually not. The optimiser normally merges a simple view's definition into the outer query, so predicates are pushed down and indexes used, making it free relative to writing the query inline. It becomes slow when merging is impossible, typically because of an aggregation, `DISTINCT`, a window function or a `UNION`.

**"What exactly is stale about a materialised view?"**
Everything in it. The rows are a snapshot as of the last refresh, so any change to the base tables since then is invisible. It is not incorrect, it is a correct statement about an earlier moment, and whether that is acceptable is a business question.

**"Why does `CONCURRENTLY` need a unique index?"**
Because it computes the new result into a temporary table and applies the difference as inserts, updates and deletes, and to compute a difference it must match old rows to new ones. The unique index provides that row identity, and without it there is no way to pair them up.

**"Is `CONCURRENTLY` faster?"**
No, it is usually slower, often substantially, because it builds the full result and then performs a diff-and-apply rather than swapping storage. What it buys is availability: readers are never blocked.

**"Can a materialised view be refreshed incrementally?"**
In Oracle yes, through materialised view logs that record base-table changes so only the delta is applied. SQL Server's indexed views go further and maintain synchronously on every write. PostgreSQL has no built-in incremental refresh, which is why trigger-maintained summary tables are common there.

**"What is query rewrite and who does it?"**
The optimiser substituting a materialised view for a query written against the base tables, without the user naming the view. Oracle does it, SQL Server does it for indexed views in Enterprise edition, and PostgreSQL does not, so adopting one there means changing every query that should benefit.

**"When would you not use a materialised view?"**
When the data must be current, when the base data changes as often as the view is read so refreshing costs more than it saves, or when an index would make the original query fast enough. A summary table or a cache is often the better fit.

**The common wrong answer** is "a view is virtual and a materialised view stores data", which is the definition rather than the answer. The content being tested is that a plain view is usually **free because it is merged**, that a materialised view trades **read cost for staleness and refresh cost**, that `CONCURRENTLY` requires a **unique index because it diffs rather than swaps**, and that **query rewrite is engine-specific**, so in PostgreSQL the view only helps queries that name it.

---

### Say this in the interview

*"A view is a named query definition. It stores no data, so selecting from it executes the underlying query. That means zero storage, always current data, no maintenance, and a read latency equal to the full query every time. The thing people underestimate is view merging: for a simple view the optimiser folds the definition into the outer query and plans the combined statement, so predicates are pushed down and indexes used, and the view costs nothing relative to writing the query inline. Folding is not always possible, though. A view containing an aggregation, DISTINCT, a window function, UNION or LIMIT often cannot be merged, so the engine materialises the view's result at runtime before applying the outer predicates, and that is where a view genuinely becomes slow. So the cost of a view is really the cost of whether it can be merged. And views serve purposes unrelated to performance: abstraction behind a stable interface, security by exposing a subset of columns or rows, and simplification of a join everybody would otherwise repeat.*

*A materialised view stores the actual rows, physically, like a table. So it occupies storage proportional to the result, reads are as fast as a table read because that is what they are, it can have its own indexes where a plain view has nothing to index, it is stale by construction since the data is a snapshot as of the last refresh, and it costs at refresh time. The trade is not subtle: you move the cost from read time to refresh time and pay for it in freshness and storage.*

*PostgreSQL's plain REFRESH MATERIALIZED VIEW rebuilds the whole thing and takes an ACCESS EXCLUSIVE lock, so the view is completely unreadable for the duration, which on a twenty-minute rebuild behind a dashboard is an outage rather than maintenance. REFRESH CONCURRENTLY avoids that, and it has three strict prerequisites. First, the view must have at least one unique index covering all rows, and that is not optional, because the concurrent refresh computes the new result into a temporary table and applies the difference as inserts, updates and deletes, and to compute a difference it must match old rows to new ones, which is what the unique index provides. Second, the view must already be populated, because there is nothing to diff against, so a view created WITH NO DATA must be refreshed plainly first. Third, it is slower than a plain refresh, often substantially, because it builds the full result and then diffs and applies rather than simply swapping the storage. You are buying availability with time.*

*Other engines differ. Oracle supports incremental or fast refresh using materialised view logs on the base tables, which record changes so only the delta is applied, which is far cheaper at the cost of maintaining the logs. SQL Server's indexed views are maintained synchronously on every base-table write, so they are never stale, but every write pays the maintenance cost and the restrictions are severe: SCHEMABINDING, deterministic expressions, no outer joins or subqueries, and COUNT_BIG required for aggregates. PostgreSQL has no built-in incremental refresh at all, which is the gap that trigger-maintained summary tables fill.*

*Query rewrite is the capability that separates the implementations. It means the optimiser recognises that a query written against the base tables could be answered from a materialised view and substitutes it automatically, so the user never names the view. Oracle does this, and can even rewrite partially, using the view for part of the query and the base tables for the rest. SQL Server does it for indexed views in Enterprise edition. PostgreSQL does not, so you must query the materialised view by name, which is a significant practical difference: adopting one in PostgreSQL means changing every query that should benefit, whereas in Oracle it can be transparent. It is hard because the optimiser must prove equivalence between the query and the view definition, including that the freshness is acceptable, which becomes difficult quickly beyond simple aggregations.*

*So I would use a plain view for abstraction, security or simplification where the query is cheap enough to run each time, and a materialised view when the query is genuinely expensive, is read far more often than the data changes, and staleness is acceptable, which fits dashboards and analytical aggregates but not a customer's current balance. And I would consider the alternatives first: a summary table maintained by triggers, which gives the incremental maintenance PostgreSQL lacks; a cache in front of the query; or simply an index that makes the original query fast enough that none of this is needed."*
