---
id: 20-when-not-to-index
title: "When NOT to Index"
description: "An index that matches most rows is slower than no index, and one on a hot column can make every update several times more expensive"

sidebar_position: 20
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "When would you deliberately NOT create an index on a column, even if that column frequently appears in `WHERE` clauses? Explain the Cost-Based Optimizer's selectivity threshold, write amplification, and PostgreSQL's Heap-Only Tuples (HOT)."

---

### Picture it

A library with an index card drawer that tells you which shelf each book is on.

**For "the book about Kerala's backwaters" the drawer is wonderful.** One card, one shelf, done.

**For "all the hardbacks" it is useless, and worse than useless.** Three quarters of the library is hardback, so the drawer sends you on **three quarters of a million separate trips**, each to a different shelf in a different order. Walking the shelves from one end to the other, picking up hardbacks as you pass, is **dramatically faster**, because you are walking in a straight line instead of criss-crossing the building. The index was not merely unhelpful; **following it was slower than ignoring it**.

So there is a crossover. Below it the drawer wins, above it the walk wins, and a good librarian works out which side of the line a request falls on **before** opening the drawer.

**Then there is the cost nobody counts.** Every drawer has to be **kept up to date**. Add a book and you file a card in every drawer: by title, by author, by subject, by year. Eight drawers means **nine filing jobs for one new book**. The drawers are free to consult and expensive to maintain, and the maintenance happens on every single arrival.

**And one more, which is specific and vicious.**

Suppose the library has a clever rule: if a book's details change but **none of the things the drawers are sorted by** have changed, you can simply **amend the book in place on the shelf** and touch no drawer at all. Correcting a typo in the blurb costs one small action.

Now someone adds a drawer indexed by **blurb**. That rule stops applying, for **every** blurb correction, for ever. Each one now means amending the shelf **and** refiling a card. A drawer added for one rare request has **permanently made a frequent operation several times more expensive**, and nothing in the request that motivated it hinted at that.

---

### The proper terms

#### The selectivity threshold

**Selectivity** is the fraction of rows a predicate matches. Low selectivity means many rows match.

The cost-based optimiser compares two plans:

**An index scan** finds the matching index entries, then fetches each row. On a heap that is **one random page fetch per matching row**, and different rows land on different pages in **index order**, not page order.

**A sequential scan** reads every page of the table **in physical order**, which lets the storage layer use **read-ahead** and fetch large contiguous chunks.

So the comparison is roughly:

```text
index scan cost      ≈ rows_matched  x  random_page_cost
sequential scan cost ≈ total_pages   x  seq_page_cost
```

A random page fetch is **several times more expensive** than a sequential one, so once `rows_matched` becomes a meaningful fraction of the table, **the sequential scan wins**. The crossover is typically somewhere around 5 to 10 percent selectivity, and when the planner chooses a scan over your index it is usually **right**.

Two practical notes that show familiarity:

**PostgreSQL's `random_page_cost` defaults to 4.0** against `seq_page_cost` of 1.0, a ratio calibrated for **spinning disks**. On SSDs or NVMe the true ratio is closer to **1.1**, and leaving the default makes the planner **avoid indexes it should be using**. It is one of the most common real misconfigurations.

**An index-only scan changes the arithmetic entirely**, because no heap fetch is needed, so a covering index can be worth using at far lower selectivity.

The consequence: **an index on a low-cardinality column is usually dead weight**. A boolean, a `gender` column, a `status` where 90 percent of rows are `active`, a soft-delete flag. The planner will ignore it for the common value, and you pay its maintenance cost on every write for nothing.

The fix when you do need the rare value is a **partial index**, which indexes only the selective subset and is therefore tiny and genuinely useful.

#### Write amplification

Every index is a **separate B+ tree** that must be kept consistent with the table, so the cost is paid on every write.

**`INSERT`** writes the row **plus one entry in every index**. Eight indexes means **nine writes** for one logical insert.

**`DELETE`** removes the row and every index entry pointing at it.

**`UPDATE`** touches **every index whose column changed**, and in PostgreSQL potentially every index at all, for the reason in the next section.

The costs beyond the write count itself:

**Random I/O and page splits.** Index writes land wherever the key sorts, not at the end of a file, so inserting into a non-monotonic index causes **page splits** and fragmentation.

**WAL volume.** Every index change is logged, so more indexes means a larger write-ahead log, which means slower commits, bigger backups, longer recovery and more replication lag.

**Buffer pool pressure.** Index pages compete with table pages for memory, so an unused index actively **evicts data you do need**.

**Maintenance.** More to `VACUUM`, more to `ANALYZE`, more to rebuild, more to back up.

Which gives one of the most useful operational rules: **an unused index is pure cost.** It helps nothing and is paid for on every insert, update, delete, vacuum and backup. Finding them is easy and worth doing routinely.

#### PostgreSQL Heap-Only Tuples

This is the mechanism the question is really aiming at, and it supplies a reason not to index that nothing else explains.

PostgreSQL's MVCC means an `UPDATE` does not modify a row in place. It **writes a new version** of the row and marks the old one dead. Normally **every index must be updated** to point at the new version's location, its **CTID**, because index entries store physical positions.

**The HOT optimisation** applies when both conditions hold:

**No indexed column was changed** by the update, and

**the new version fits on the same page** as the old one.

When they do, PostgreSQL writes the new version on that same page and links it from the old one through a **`t_ctid` chain**, and **does not touch any index at all**. Existing index entries keep pointing at the old tuple, and a scan arriving there **follows the chain** to the live version.

The benefit is large: an update becomes **one page write** instead of one page write plus N index writes, and it also makes the dead tuple reclaimable by ordinary page pruning rather than requiring a full `VACUUM` pass.

**And here is the trap.** Adding an index on a frequently updated column **disables HOT for every update that touches it**. An index created for a rare reporting query can make an operation that runs thousands of times a second several times more expensive, permanently, and nothing about the query that motivated the index hints at that cost.

Two related points:

**`fillfactor`** controls how full a page is packed on insert. The default of 100 leaves no room, so an updated row often cannot fit on its page and HOT fails on the second condition. Setting `fillfactor` to 80 or 90 on an update-heavy table deliberately wastes space to **keep HOT working**.

**The practical rule:** be especially reluctant to index a column that is updated often, and check `pg_stat_user_tables.n_tup_hot_upd` against `n_tup_upd` to see what proportion of updates are still taking the HOT path.

#### The other reasons not to index

**Small tables.** A table that fits in a few pages is faster to scan than to traverse an index, and the planner knows it.

**Write-heavy, rarely-queried tables.** Audit logs, event streams and append-only tables pay index maintenance constantly to serve queries that run once a week.

**Columns never used for filtering, joining or ordering.** An index that is never scanned is pure cost.

**Redundant indexes.** An index on `(a)` is redundant when `(a, b)` exists, because the leftmost prefix rule means the composite already serves every query the single-column one would.

**Very wide columns.** Indexing a large text column produces an enormous index; a hash of the value, an expression index, or a full-text index is almost always better.

**Bulk loads.** Dropping indexes, loading, then rebuilding is substantially faster than maintaining them row by row, because a rebuild sorts once rather than performing millions of random insertions.

---

### In code

```sql
-- THE SELECTIVITY THRESHOLD: why the planner ignores your index

-- 10 million orders, 90% of them 'completed'
CREATE INDEX idx_orders_status ON orders (status);

SELECT * FROM orders WHERE status = 'completed';
--   9,000,000 rows match.
--   via the index: 9,000,000 RANDOM page fetches, in index order
--   via a seq scan: every page ONCE, IN PHYSICAL ORDER, with
--                   read-ahead fetching large contiguous chunks
--   -> SEQ SCAN WINS, decisively. The planner is RIGHT to ignore
--      the index, and the index is DEAD WEIGHT.

SELECT * FROM orders WHERE status = 'disputed';
--   400 rows match -> the index is excellent here
```

```text
The arithmetic the optimiser does:

  index scan cost      ~=  rows_matched  x  random_page_cost
  sequential scan cost ~=  total_pages   x  seq_page_cost

  a RANDOM page fetch is several times more expensive than a
  SEQUENTIAL one, so once rows_matched becomes a meaningful fraction
  of the table, THE SEQUENTIAL SCAN WINS.

  the crossover is typically around 5-10% SELECTIVITY, and when the
  planner chooses a scan over your index it is USUALLY RIGHT.

  two practical notes:

    random_page_cost DEFAULTS TO 4.0 in PostgreSQL, against
    seq_page_cost of 1.0: a ratio calibrated for SPINNING DISKS.
    On SSD or NVMe the true ratio is nearer 1.1, and leaving the
    default makes the planner AVOID INDEXES IT SHOULD BE USING.
    One of the most common real misconfigurations.

    an INDEX-ONLY SCAN changes the arithmetic entirely, because no
    heap fetch is needed, so a covering index can be worth using at
    far lower selectivity.
```

```sql
-- So: do NOT index a low-cardinality column for its COMMON value
CREATE INDEX idx_users_active ON users (is_active);     -- 95% true
CREATE INDEX idx_users_deleted ON users (deleted_at);   -- 99% NULL
--   both will be IGNORED for the common case, and both are paid for
--   on every single write.

-- the RIGHT tool is a PARTIAL INDEX: tiny, and genuinely selective
CREATE INDEX idx_users_pending ON users (created_at)
WHERE  status = 'pending';            -- indexes 0.1% of the table

CREATE INDEX idx_users_deleted ON users (deleted_at)
WHERE  deleted_at IS NOT NULL;
```

```text
WRITE AMPLIFICATION: every index is a separate B+ tree to maintain

  INSERT   the row PLUS one entry in EVERY index
           8 indexes -> NINE WRITES for one logical insert
  DELETE   the row PLUS every index entry pointing at it
  UPDATE   every index whose column changed
           (and in PostgreSQL, potentially ALL of them: see HOT)

  and the costs beyond the write count:

     RANDOM I/O AND PAGE SPLITS   index writes land wherever the key
                                  SORTS, not at the end of a file, so
                                  non-monotonic keys cause page
                                  splits and fragmentation
     WAL VOLUME                   every index change is logged
                                  -> slower commits, bigger backups,
                                     longer recovery, more
                                     replication lag
     BUFFER POOL PRESSURE         index pages compete with table
                                  pages, so an unused index actively
                                  EVICTS DATA YOU DO NEED
     MAINTENANCE                  more to VACUUM, ANALYZE, rebuild
                                  and back up

  AN UNUSED INDEX IS PURE COST. It helps nothing and is paid for on
  every insert, update, delete, vacuum and backup.
```

```sql
-- Finding the ones that are pure cost
SELECT relname, indexrelname, idx_scan, pg_size_pretty(
         pg_relation_size(indexrelid)) AS size
FROM   pg_stat_user_indexes
WHERE  idx_scan = 0                       -- NEVER used
  AND  indexrelid NOT IN (
         SELECT conindid FROM pg_constraint WHERE contype IN ('p','u'))
ORDER  BY pg_relation_size(indexrelid) DESC;
-- worth running routinely. Exclude the ones backing constraints.
```

```text
POSTGRESQL HEAP-ONLY TUPLES, and the trap that follows

  PostgreSQL's MVCC means an UPDATE does NOT modify a row in place.
  It writes a NEW VERSION and marks the old one dead. Normally
  EVERY INDEX must be updated to point at the new version's CTID,
  because index entries store PHYSICAL POSITIONS.

  THE HOT OPTIMISATION applies when BOTH hold:
     1. NO INDEXED COLUMN WAS CHANGED, and
     2. the new version FITS ON THE SAME PAGE

  then PostgreSQL writes the new version ON THAT PAGE and links it
  from the old one through a t_ctid chain, and TOUCHES NO INDEX
  AT ALL. Existing entries keep pointing at the old tuple, and a
  scan arriving there FOLLOWS THE CHAIN to the live version.

     page 42 before:  [ v1: id=7, name=arun, bio="..." ]
                        ^-- every index points HERE

     page 42 after a HOT update:
                      [ v1 (dead) ]--t_ctid-->[ v2: bio="new" ]
                        ^-- indexes STILL point here, and the scan
                            follows the chain

  the benefit: an update is ONE PAGE WRITE instead of one page write
  plus N index writes, and the dead tuple becomes reclaimable by
  ordinary PAGE PRUNING rather than needing a full VACUUM pass.
```

```sql
-- AND HERE IS THE TRAP
-- bio is updated thousands of times a second, and HOT handles it
UPDATE users SET bio = ? WHERE id = ?;      -- 1 page write

-- somebody adds this for a monthly report:
CREATE INDEX idx_users_bio ON users (bio);

-- EVERY bio update now disables HOT, FOR EVER:
UPDATE users SET bio = ? WHERE id = ?;      -- 1 page write
                                            -- + an index entry
                                            -- + WAL for both
                                            -- + a page split sometimes

-- an index created for a RARE query has PERMANENTLY made an
-- operation that runs thousands of times a second SEVERAL TIMES
-- MORE EXPENSIVE, and nothing about the reporting query hinted
-- at that cost.

-- related: fillfactor controls how full a page is packed on insert.
-- the default of 100 leaves NO ROOM, so an updated row often cannot
-- fit on its page and HOT fails on the SECOND condition.
ALTER TABLE users SET (fillfactor = 85);    -- deliberately waste
                                            -- space to KEEP HOT WORKING

-- and check whether it is working:
SELECT relname, n_tup_upd, n_tup_hot_upd,
       round(100.0 * n_tup_hot_upd / NULLIF(n_tup_upd, 0), 1) AS hot_pct
FROM   pg_stat_user_tables
ORDER  BY n_tup_upd DESC;
-- a low hot_pct on a hot table means an index is blocking HOT.
```

```text
The other reasons not to index:

  SMALL TABLES          a table that fits in a few pages is faster
                        to scan than to traverse an index, and the
                        planner knows it

  WRITE-HEAVY, RARELY   audit logs, event streams, append-only
  QUERIED TABLES        tables: index maintenance paid constantly to
                        serve a query that runs once a week

  NEVER USED FOR        an index that is never scanned is pure cost
  FILTER/JOIN/ORDER

  REDUNDANT INDEXES     (a) is redundant when (a, b) exists, because
                        the leftmost prefix rule means the composite
                        already serves every query (a) would

  VERY WIDE COLUMNS     indexing a large text column makes an
                        enormous index; a hash, an expression index
                        or a full-text index is almost always better

  BULK LOADS            drop the indexes, load, then rebuild.
                        Substantially faster, because a rebuild
                        SORTS ONCE rather than performing millions
                        of random insertions.
```

---

### What they ask next

**"Why can an index make a query slower?"**
Because an index scan fetches one random page per matching row in index order, while a sequential scan reads pages in physical order with read-ahead. Once a meaningful fraction of the table matches, the random fetches cost more than reading everything in order.

**"Where is the crossover?"**
Typically around 5 to 10 percent selectivity, though the optimiser computes it from `random_page_cost` against `seq_page_cost` and the table's statistics rather than from a fixed rule. An index-only scan shifts the crossover much lower, because there is no heap fetch.

**"Why is `random_page_cost` worth checking?"**
Because its default of 4.0 was calibrated for spinning disks, and on SSD the true ratio to sequential is nearer 1.1. Leaving the default makes the planner systematically avoid indexes it should use, which is one of the most common real misconfigurations.

**"How much does an index cost on writes?"**
One extra write per index on every insert and delete, plus the WAL to log it, plus random I/O and occasional page splits because entries land where the key sorts. Eight indexes make one insert into nine writes, and that is before the buffer pool, vacuum and backup costs.

**"What is a HOT update?"**
A PostgreSQL update where no indexed column changed and the new row version fits on the same page, so the new version is written on that page and chained from the old one through `t_ctid`, with **no index touched at all**. It turns an update into a single page write.

**"How does an index break HOT?"**
By making the updated column indexed. Once an index covers a column, every update to it fails HOT's first condition, so all indexes must be updated. An index added for a rare query can permanently multiply the cost of a very frequent update.

**"What is `fillfactor` for?"**
Leaving free space on each page so an updated row version can fit on the same page and HOT's second condition holds. On update-heavy tables, setting it to 80 or 90 deliberately trades space for keeping HOT working.

**"How do you find indexes worth dropping?"**
`pg_stat_user_indexes` with `idx_scan = 0`, excluding those backing primary key and unique constraints, sorted by size. Also look for redundancy, where an index on `(a)` is covered by an existing `(a, b)`.

**The common wrong answer** is "do not index low-cardinality columns". True, and only a third of it. The question also wants **write amplification**, where every index turns one logical write into several plus WAL, and above all **HOT**, where adding an index on a frequently updated column silently and permanently removes an optimisation that was making every update cheap.

---

### Say this in the interview

*"The first reason is selectivity. An index scan finds the matching entries and then fetches each row, which on a heap is one random page fetch per matching row, in index order rather than page order. A sequential scan reads every page in physical order, so read-ahead works and it fetches large contiguous chunks. So the optimiser compares roughly rows matched times random page cost against total pages times sequential page cost, and since a random fetch is several times more expensive, once a meaningful fraction of the table matches the sequential scan wins. The crossover is typically around five to ten percent selectivity, and when the planner ignores your index it is usually right.*

*Two practical notes there. PostgreSQL's random_page_cost defaults to 4.0 against a sequential cost of 1.0, which was calibrated for spinning disks, and on SSD the true ratio is nearer 1.1, so leaving the default makes the planner avoid indexes it should be using. That is one of the most common real misconfigurations. And an index-only scan changes the arithmetic entirely, because there is no heap fetch, so a covering index is worth using at far lower selectivity. The consequence is that an index on a boolean, a gender column, a status where ninety percent are active, or a soft-delete flag is dead weight, and the right tool when you need the rare value is a partial index, which indexes only the selective subset.*

*The second reason is write amplification. Every index is a separate B+ tree kept consistent with the table, so an insert writes the row plus one entry in every index, meaning eight indexes make nine writes for one logical insert; a delete removes the row and every entry pointing at it; and an update touches every index whose column changed. Beyond the write count there is random I/O and page splits, because entries land wherever the key sorts rather than at the end of a file; WAL volume, since every index change is logged, which means slower commits, bigger backups and more replication lag; buffer pool pressure, so an unused index actively evicts data you do need; and more to vacuum, analyze, rebuild and back up. Which gives the rule that an unused index is pure cost, and finding them with pg_stat_user_indexes where idx_scan is zero is worth doing routinely.*

*The third is heap-only tuples, which is the one that supplies a reason nothing else explains. PostgreSQL's MVCC means an update does not modify a row in place: it writes a new version and marks the old one dead, and normally every index must be updated to point at the new version's CTID, because index entries store physical positions. The HOT optimisation applies when two conditions hold: no indexed column was changed, and the new version fits on the same page. Then PostgreSQL writes the new version on that page, links it from the old one through a t_ctid chain, and touches no index at all. Existing index entries keep pointing at the old tuple and a scan follows the chain. So an update becomes one page write instead of one page write plus N index writes, and the dead tuple is reclaimable by ordinary page pruning rather than a full vacuum.*

*And the trap is that adding an index on a frequently updated column disables HOT for every update touching it. An index created for a rare reporting query can permanently make an operation running thousands of times a second several times more expensive, and nothing about the query that motivated it hints at that cost. Related to this, fillfactor controls how full a page is packed, and the default of 100 leaves no room, so updated rows often cannot fit on their page and HOT fails the second condition; setting it to 80 or 90 on an update-heavy table deliberately wastes space to keep HOT working. You can check the proportion with n_tup_hot_upd against n_tup_upd in pg_stat_user_tables.*

*Beyond those three, I would not index small tables, because scanning a few pages beats traversing an index; write-heavy rarely-queried tables like audit logs; columns never used for filtering, joining or ordering; redundant indexes, since an index on a is covered by an existing a-and-b through the leftmost prefix rule; very wide text columns, where a hash, an expression index or full-text search is better; and I would drop and rebuild indexes around a bulk load, because a rebuild sorts once rather than performing millions of random insertions."*
