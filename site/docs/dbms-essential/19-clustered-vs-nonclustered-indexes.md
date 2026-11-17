---
id: 19-clustered-vs-nonclustered-indexes
title: "Clustered vs. Non-Clustered (Secondary) Indexes"
description: "One index that is the table itself, many that only point at it, and why MySQL and PostgreSQL disagree about which"

sidebar_position: 19
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a clustered and a non-clustered index? Why can a table only have one clustered index, how do MySQL and PostgreSQL differ in table storage, and what is a covering index?"

---

### Picture it

A library, and two different ways of being able to find a book.

**The shelves themselves are sorted by subject.** This is not a catalogue; it is the arrangement of the actual books. Find the right place on the shelf and the book is **already in your hand**. And because the shelves are in order, "everything on astronomy" is a single walk along one stretch of shelving.

Now notice what you cannot do. **The books cannot also be sorted by author**, because they are physical objects in one physical order. There is exactly one arrangement, and choosing it is choosing which kind of browsing is cheap.

**So for authors you keep a card index.** Each card holds an author's name and a note of **where the book sits**. Finding a book by author is now two steps: look up the card, then walk to the shelf. Twice the work, and you can keep as many card indexes as you like, by author, by year, by publisher, because cards are cheap and the books never move.

Two refinements, and they are the interesting half.

**The cards can say where the book is in two different ways.** They can give the exact shelf position, which is fast but wrong the moment the book is moved. Or they can give the book's **subject code**, which never changes but means a second lookup through the shelf arrangement to get there. Different libraries chose differently, and that choice is the whole MySQL-versus-PostgreSQL answer.

**And sometimes you do not need the book.** If you only wanted the author's name and the publication year, and the card already says both, you can answer from the card and **never walk to the shelf at all**. Putting the extra detail on the card so the journey can be skipped is the last part of the question.

---

### The proper terms

#### Clustered index

A **clustered index** determines the **physical order** of the rows in the table. The index's **leaf level is the table data**, not a pointer to it.

The decisive consequence: once you have located the key, **you have the row**. There is no second lookup, so a lookup by the clustered key is the fastest possible access path.

The second consequence is that a **range scan on the clustered key is sequential**. Rows in a key range are physically adjacent, so the engine reads pages in order and read-ahead works, which is why clustering by a date column transforms time-range queries.

#### Non-clustered, or secondary, index

A **non-clustered index**, also called a **secondary index**, is a separate structure whose leaves hold the **indexed key** plus a **row locator** pointing at the row.

A lookup is therefore **two traversals**: find the key in the secondary index, then follow the locator to the row. That second step is the **bookmark lookup**, and in PostgreSQL the **heap fetch**.

You may have **many** secondary indexes on a table, since each is its own structure and the table is undisturbed by them.

#### Why only one clustered index

Because a clustered index **is** the physical ordering of the rows, and rows can only be stored in **one** order at a time. A second clustered index would require a second copy of the table in a different order, which is not an index but a duplicate.

It follows that choosing the clustered key is a design decision with wide consequences, because it decides which range scans are sequential and, in InnoDB, what every secondary index carries inside it.

#### MySQL InnoDB versus PostgreSQL

This is where the question separates people who have read about indexes from people who have used them.

**InnoDB uses clustered tables.** The table **is** a B+ tree clustered on the **primary key**; there is no separate heap. If no primary key is declared, InnoDB uses the first unique not-null index, and failing that creates a hidden 6-byte row ID.

The critical detail: **every secondary index stores the primary key as its row locator**, not a physical address. So a secondary index lookup is a **double lookup**: traverse the secondary index to get the primary key, then traverse the clustered index to get the row.

Three consequences that come up constantly in practice:

**A wide primary key bloats every secondary index**, because the key is copied into every entry of every one of them. A 40-byte composite or UUID primary key on a table with six secondary indexes multiplies that cost six times over, inflating every index and reducing how much of each fits in the buffer pool.

**A random primary key fragments the table itself.** Since the table is ordered by the primary key, inserting random UUIDs inserts into random positions, causing page splits and fragmentation of the table, not merely of an index. A monotonic key appends to the end instead, which is why auto-increment keys and time-ordered UUIDs matter so much here.

**Secondary index lookups are cheaper than they look**, because the locator being logical means rows can move within the clustered index without invalidating any secondary index.

**PostgreSQL uses heap tables.** Rows live in an unordered **heap** and **there is no clustered index at all**. Every index, including the primary key's, is secondary, and its leaves store a **CTID**, the physical **block number and offset**.

Two consequences:

**The `CLUSTER` command is a one-off.** It physically rewrites a table in index order, but the ordering is **not maintained**: later inserts and updates go wherever there is free space, so the table gradually drifts back out of order. It is a maintenance operation, not an ongoing property.

**Index scans usually need a heap fetch for visibility.** Because PostgreSQL's MVCC keeps row versions in the heap, the index entry alone cannot prove a row is visible to your transaction, so the heap must be consulted. The **visibility map** tracks pages where all rows are visible to everyone, and when the pages involved are all-visible an **index-only scan** can skip the heap entirely. This is why `VACUUM` matters for read performance, not just for space: it is what keeps the visibility map useful.

A related PostgreSQL mechanism worth naming: because the locator is physical, an update that moved a row would have to update every index. The **HOT**, heap-only tuple, optimisation places the new version on the **same page** and skips updating indexes when **no indexed column changed**, which makes updates to non-indexed columns dramatically cheaper.

**SQL Server** supports both models explicitly: a table with a clustered index is a **clustered table**, and one without is a **heap**, in which case secondary indexes store a physical **RID**.

#### Covering indexes

A **covering index** contains **every column a query needs**, so the query can be answered from the index alone with no access to the table. The plan is called an **index-only scan** in PostgreSQL and an **index-only** or covering scan elsewhere.

What it eliminates is the **bookmark lookup**, and that is usually the dominant cost. Without covering, each matching row costs a separate page fetch of the table, which for a thousand matching rows is a thousand random reads. With covering, the whole answer is read sequentially from the index leaves.

The mechanisms differ in a way worth knowing:

**SQL Server** has `INCLUDE`, which stores extra columns at the leaf level only, so they are available for output but are not part of the key and do not affect ordering or key size.

**PostgreSQL** has `INCLUDE` as well, giving the same thing, and the result can be served by an index-only scan when the visibility map allows it.

**MySQL InnoDB** covers implicitly, because the **primary key is always present** in every secondary index, so an index on `(a, b)` effectively contains `(a, b, pk)` and covers any query needing only those.

The cost is the same cost as any index: a wider index is **larger**, so fewer entries fit per page and more of the buffer pool is consumed, and every **write** must maintain the extra columns. Covering is therefore a targeted optimisation for a specific hot query, not a default. Adding `INCLUDE` columns is preferable to adding key columns, because it does not change the key's size or ordering semantics.

---

### In code

```text
Clustered vs secondary, by what the leaf holds:

  CLUSTERED INDEX (the leaf IS the row)

      [    50   |   100   ]
     /          |          \
  [ 20: full row ] <-> [ 50: full row ] <-> [ 100: full row ]
      ^ you have located the key AND you have the row: no second step
      ^ and a key range is PHYSICALLY ADJACENT, so scans are sequential

  SECONDARY INDEX (the leaf holds a locator)

      [   'bela'  |  'dev'  ]
     /            |          \
  [ 'arun' -> locator ] [ 'bela' -> locator ] [ 'dev' -> locator ]
                              |
                              +--> second traversal to reach the row
                                   (the bookmark lookup / heap fetch)
```

```text
InnoDB: the table IS the clustered index, and secondaries carry the PK

  clustered index on PRIMARY KEY (id)
      leaf: [ id=7 | name='arun' | email=... | city=... ]   the whole row

  secondary index on (email)
      leaf: [ email='arun@x.com' -> id=7 ]      <- the PRIMARY KEY,
                                                   not a disk address

  SELECT city FROM users WHERE email = 'arun@x.com';
      1. traverse the email index      -> id = 7
      2. traverse the clustered index  -> the row
      -> a DOUBLE LOOKUP, every time

  so a FAT primary key is copied into EVERY entry of EVERY secondary
  index. A 40-byte UUID PK with six secondary indexes pays that cost
  six times over, inflating all of them and wasting buffer pool.

  and a RANDOM primary key fragments THE TABLE, not just an index,
  because the table is ordered by it: random inserts split pages
  all over the file. Monotonic keys append instead.

  the upside: the locator is LOGICAL, so a row can move within the
  clustered index without invalidating any secondary index.
```

```text
PostgreSQL: a heap, no clustered index at all

  heap (unordered)      page 3: [ row ][ row ][ free ][ row ]
  index on (email)      leaf:   [ 'arun@x.com' -> CTID (3, 2) ]
                                                    ^ block, offset
                                                      PHYSICAL

  CLUSTER users USING idx_city;
      rewrites the table in index order ONCE
      -> NOT maintained: later inserts go wherever there is room,
         so the table drifts back out of order. A maintenance
         operation, not an ongoing property.

  visibility: the index entry cannot prove a row version is visible
  to your transaction, so the heap must normally be consulted.
      VISIBILITY MAP marks pages where all rows are visible to all
      -> when every needed page is all-visible, an INDEX-ONLY SCAN
         skips the heap entirely
      -> which is why VACUUM affects READ performance, not just space

  HOT (heap-only tuple): because the locator is PHYSICAL, moving a row
  would mean updating every index. So an update that changes NO indexed
  column puts the new version on the SAME page and skips the indexes
  altogether, making such updates dramatically cheaper.
```

```sql
-- Covering index: eliminate the bookmark lookup for a hot query
-- Before: the index finds the rows, then the table is fetched per row
CREATE INDEX idx_orders_customer ON orders (customer_id);

SELECT customer_id, placed_at, total
FROM   orders
WHERE  customer_id = 42;
--   index finds 1000 matching rows -> 1000 separate page fetches
--   of the table, to read two more columns

-- After: the index carries everything the query needs
CREATE INDEX idx_orders_cover
    ON orders (customer_id)
    INCLUDE (placed_at, total);     -- Postgres and SQL Server
--   answered entirely from the index leaves, read sequentially
--   -> no table access at all (index-only scan)

-- MySQL InnoDB covers implicitly, because the PK is always in there:
CREATE INDEX idx_orders_cover ON orders (customer_id, placed_at, total);
--   an index on (a, b) effectively contains (a, b, pk)
```

```text
What covering costs, so it stays a targeted choice:

  wider index entries -> fewer per page -> a larger index
                      -> more of the buffer pool consumed
  every write must maintain the extra columns

  so: cover a specific hot query you have measured, not by default.
  prefer INCLUDE over adding key columns, because INCLUDE does not
  change the key size or the ordering semantics of the index.
```

---

### What they ask next

**"Can a table have no clustered index?"**
In PostgreSQL always, because it has none at all. In SQL Server yes, and such a table is a **heap** whose secondary indexes store a physical **RID**. In InnoDB no: if you do not declare a primary key it picks a unique not-null index, and failing that invents a hidden 6-byte row ID, so a clustered structure always exists.

**"Why is a UUID primary key worse in InnoDB than in PostgreSQL?"**
Because in InnoDB the primary key **orders the table**, so random keys split pages across the whole table and the key is also copied into every secondary index. In PostgreSQL the primary key is just another index over an unordered heap, so a random key fragments one index rather than the table. Time-ordered UUIDv7 restores append-like inserts in both.

**"What does the visibility map have to do with indexes?"**
It records pages where every row version is visible to all transactions. An index-only scan is only possible when the pages involved are marked all-visible, because otherwise the heap must be read to check visibility. `VACUUM` is what maintains the map, which is how a maintenance job ends up determining whether a query is fast.

**"Does a clustered index make everything faster?"**
No. It makes lookups and range scans on **its key** faster, and it costs on writes: inserting out of key order causes page splits, and updating the clustered key **physically moves the row**. It also fixes the one ordering you get, so queries wanting a different order gain nothing from it.

**"Is the primary key always the clustered index?"**
In InnoDB effectively yes. In SQL Server it is the default but you can cluster on a different column, which is often the right choice when range queries follow a date rather than the identity column. In PostgreSQL the question does not arise.

**"How do you tell a covering index is being used?"**
The plan says so: `Index Only Scan` in PostgreSQL, and no `Key Lookup` or `RID Lookup` node in SQL Server. If a bookmark lookup still appears, a column the query needs is not in the index.

**The common wrong answer** is "clustered sorts the data, non-clustered has pointers", with nothing further. That is the definition, not the insight. The consequences are what matter: only one ordering exists, InnoDB's secondary indexes carry the **primary key** so its width multiplies across every index, PostgreSQL has **no clustered index at all** and therefore has visibility and HOT concerns instead, and a covering index exists to **delete the second lookup**.

---

### Say this in the interview

*"A clustered index determines the physical order of the rows, and its leaf level is the table data rather than a pointer to it. So once you locate the key you have the row, with no second lookup, and a range scan on the clustered key is sequential because the rows are physically adjacent. A non-clustered index, or secondary index, is a separate structure whose leaves hold the indexed key plus a row locator, so a lookup is two traversals, the second being the bookmark lookup or heap fetch, and you can have many of them because each is its own structure.*

*A table can have only one clustered index because the clustered index is the physical ordering of the rows, and rows can only be stored in one order at a time. A second one would be a duplicate of the table, not an index. So choosing the clustered key is a design decision that determines which range scans are sequential.*

*MySQL and PostgreSQL differ fundamentally. InnoDB uses clustered tables: the table is a B+ tree clustered on the primary key, with no separate heap, and if you declare no primary key it uses the first unique not-null index or invents a hidden six-byte row ID. The critical detail is that every secondary index stores the primary key as its row locator rather than a physical address, so a secondary lookup is a double lookup, through the secondary index to get the primary key and then through the clustered index to get the row. Three consequences: a wide primary key is copied into every entry of every secondary index, so a 40-byte UUID with six secondary indexes multiplies that cost six times and wastes buffer pool; a random primary key fragments the table itself rather than just an index, because the table is ordered by it, which is why monotonic or time-ordered keys matter so much; and the upside is that because the locator is logical, rows can move within the clustered index without invalidating any secondary index.*

*PostgreSQL uses heap tables with no clustered index at all. Rows live in an unordered heap and every index, including the primary key's, is secondary and stores a CTID, which is a physical block number and offset. So CLUSTER is a one-off rewrite in index order that is not maintained, since later inserts go wherever there is room and the table drifts back out of order. And because MVCC keeps row versions in the heap, an index entry cannot prove a row is visible to your transaction, so the heap is normally consulted; the visibility map tracks pages where all rows are visible to everyone, and when the needed pages are all-visible an index-only scan can skip the heap, which is why VACUUM affects read performance and not just space. Related to that, because the locator is physical, an update that moved a row would have to update every index, so the heap-only tuple optimisation puts the new version on the same page and skips the indexes entirely when no indexed column changed. SQL Server supports both models, with a heap using a physical RID when there is no clustered index.*

*A covering index contains every column a query needs, so the query is answered from the index alone with no table access, which is an index-only scan. What it eliminates is the bookmark lookup, usually the dominant cost, because without it each matching row is a separate page fetch, so a thousand matching rows means a thousand random reads. SQL Server and PostgreSQL both have INCLUDE, which stores extra columns at the leaf only so they are available for output without becoming part of the key, and MySQL InnoDB covers implicitly because the primary key is always present in every secondary index. The cost is that a wider index is larger, so fewer entries fit per page and more buffer pool is consumed, and every write must maintain the extra columns, so covering is a targeted optimisation for a measured hot query rather than a default. And I would prefer INCLUDE over adding key columns, because it does not change the key's size or ordering semantics."*
