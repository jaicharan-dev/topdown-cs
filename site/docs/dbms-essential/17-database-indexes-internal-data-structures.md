---
id: 17-database-indexes-internal-data-structures
title: "Database Indexes: Concept and Internal Data Structures"
description: "Why the textbook search tree is the wrong shape for a disk, and what a page-sized node changes"

sidebar_position: 17
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a database index, why do databases use B+ Trees instead of Hash Tables or Binary Search Trees, and how does a B+ Tree differ from a traditional B-Tree?"

---

### Picture it

A warehouse of a million unsorted boxes, and you need the one labelled 847,221.

**Without help** you open boxes until you find it. That is a full scan.

**With a textbook search tree** you would arrange signposts: each signpost holds one number and points left or right. You walk from signpost to signpost, halving the search each time, about twenty signposts in total. In a computer's memory that is excellent, because reading a signpost is nearly free.

In a warehouse it is terrible, and the reason is the thing this whole question turns on. **Walking to a signpost takes a minute, and reading it takes a second.** So twenty signposts means twenty minutes of walking to read twenty numbers. The expensive part was never the reading.

**So you redesign the signpost.** Instead of one number and two directions, you put **four hundred** numbers on a board with four hundred directions. It costs the same single trip to go and read it, because the trip is the cost, not the reading. Now you need **three** boards instead of twenty: four hundred cubed is already sixty-four million.

That is the entire reason databases do not use binary trees. Not that binary search is slow, but that **the unit of cost is the trip, so you want as few trips as possible, and that means stuffing as much as possible into each one.**

**Why not an alphabetical card index?** A card index that jumps straight to a label is faster still for "find 847,221". But ask it for "every box between 847,000 and 848,000" and it is useless, because it threw away order to get its speed. It can find any single thing instantly and cannot tell you what is next to it.

**And the last refinement.** Put only **directions** on the boards and keep **all the actual contents** on the bottom shelf, with each shelf section linked to the next. Two things improve at once: the boards hold more directions because they carry no contents, so you need even fewer trips, and a range request becomes "go down once, then walk along the bottom shelf", instead of climbing up and down the signposts repeatedly.

---

### The proper terms

#### What an index is

A **database index** is an auxiliary data structure that maps **key values** to **row locations**, so the engine can find rows without a **full table scan**.

The trade is explicit and should be stated: an index buys **read speed** and pays in **write cost**, since every insert, delete and update of an indexed column must also update the index, and in **storage**. A table with eight indexes does roughly nine writes per insert. Indexes are therefore not free, and an unused index is pure cost.

An index is useful in proportion to its **selectivity**, the fraction of rows a lookup returns. An index on a column with two distinct values across a million rows will usually be ignored by the planner, because reading half the table through an index is slower than scanning it.

#### Why not a binary search tree

The key insight is that **disk-oriented and memory-oriented structures have different cost models.**

A balanced **binary search tree**, an AVL or red-black tree, has **two children per node** and a height of `log2(n)`. For a million rows that is about 20 levels.

In memory this is fine, because following a pointer costs a few nanoseconds. On storage it is a disaster, because the unit of access is not a node but a **page**, typically 4 to 16 KB, and fetching a page costs a **random I/O**. So:

20 levels means up to 20 random I/Os for a single lookup. On a spinning disk at around 10 ms each that is 200 ms; even on an NVMe SSD at 100 microseconds it is 2 ms, against roughly 100 nanoseconds for a memory access.

**Each page read is almost entirely wasted.** The engine fetches 8 KB to read a single key and two pointers, perhaps 20 bytes, and discards the rest.

The problem is **low fanout**. A binary node has two children, so the tree is tall, and **height is what you pay for**. The fix is to make each node as wide as a page.

#### Why a B+ tree works

A **B+ tree** node is sized to one disk page and holds **hundreds of keys and child pointers**, giving a **fanout** in the hundreds. Height becomes `log_fanout(n)` instead of `log2(n)`.

With a fanout of 400:

| Rows | Height |
| --- | --- |
| 160 thousand | 2 |
| 64 million | 3 |
| 25 billion | 4 |

So **three or four page reads reach any row in a realistic table**, and in practice fewer, because the **root and upper internal levels are almost always in the buffer cache**. The root is read on every query, so it is never evicted. A lookup is therefore often one actual I/O, at the leaf.

It is also **self-balancing**, splitting a full node and propagating the split upward, so every leaf stays at the same depth and performance is **predictable** rather than dependent on insertion order.

#### Why not a hash index

A hash index is genuinely **faster for a single equality lookup**, at **O(1)** against the B+ tree's O(log n). Databases still default to B+ trees, and the reasons are about everything other than that one operation.

**No range queries.** This is decisive. Hashing deliberately **destroys order**, so adjacent keys land in unrelated buckets. `WHERE id > 1000`, `BETWEEN`, `<`, and any date range cannot use a hash index at all and must fall back to a scan.

**No sorted retrieval.** A B+ tree can satisfy `ORDER BY` by reading the leaves in order, making the sort free. A hash index can never help with ordering.

**No leftmost prefix matching.** On a composite index `(a, b, c)`, a B+ tree can serve queries on `a`, on `(a, b)` and on `(a, b, c)`, because the ordering is lexicographic. A hash of the whole key serves only the complete key.

**No prefix or pattern matching.** `LIKE 'arun%'` is a range scan on a B+ tree and impossible on a hash.

**Resizing is disruptive.** Growing a hash table means rehashing, which on disk is an expensive bulk rewrite, whereas a B+ tree grows incrementally by splitting individual pages.

**Skew and collisions degrade it.** Heavily duplicated values pile into one bucket, and the worst case decays towards a linear scan of that bucket.

So the summary: a hash index wins exactly one operation and loses everything else, and a B+ tree is **good at everything**, which is what a general-purpose index must be. PostgreSQL does offer `HASH` indexes for pure equality workloads, and InnoDB maintains an in-memory **adaptive hash index** on top of its B+ tree for hot equality lookups, which is the right way to get both.

#### B-tree versus B+ tree

The distinction is small to state and has large consequences.

**A B-tree stores data in internal nodes as well as leaves.** Every node holds keys **and their associated values or row pointers**.

**A B+ tree stores keys only in internal nodes, and all data in the leaves.** Internal nodes are **pure routing information**, and a key may appear both as a separator above and as a real entry in a leaf.

Four consequences follow:

**Higher fanout, so a shorter tree.** Because B+ tree internal nodes carry no payload, more keys fit in a page, so the fanout is larger and the height smaller. This is the main reason for the design.

**Range scans are sequential.** B+ tree leaves are chained in a **linked list**, usually doubly linked, so a range query **descends once** and then walks the leaf chain, reading pages in order. In a B-tree the same query requires an **in-order traversal**, repeatedly climbing back up to internal nodes, which is a scattered access pattern. For a database, where range scans and `ORDER BY` are everywhere, this is enormous.

**Uniform, predictable path length.** Every B+ tree search reaches a leaf, so every lookup costs the same number of page reads. A B-tree search may terminate early at an internal node, which is marginally faster in the best case and makes performance variable.

**Simpler deletion.** In a B+ tree an internal key is only a separator, so deleting a record touches the leaf and the internal keys can be left alone. In a B-tree, deleting a record held in an internal node requires finding a replacement from a subtree.

The trade-off against the B+ tree is that a key can be stored twice, as a separator and in a leaf, so it uses marginally more space, and a lucky lookup is never faster. Both are irrelevant next to the fanout and range-scan gains, which is why **every mainstream relational engine uses B+ trees**, and why people say "B-tree index" when they almost always mean a B+ tree.

---

### In code

```text
Why a binary tree is the wrong shape for storage:

  BINARY SEARCH TREE, 1 million rows
     fanout 2, height = log2(1,000,000) ~= 20

     each level = ONE PAGE READ = one random I/O
     20 random I/Os per lookup
       spinning disk @ 10 ms    -> 200 ms
       NVMe SSD      @ 100 us   -> 2 ms
       memory access @ 100 ns   -> what the structure was designed for

     and each 8 KB page read is used to examine ~20 bytes:
     one key and two pointers. The rest is discarded.

  B+ TREE, same 1 million rows
     node = one page, holds ~400 keys, so fanout ~400
     height = log400(1,000,000) ~= 3

     400^2 =     160,000 rows  -> height 2
     400^3 =  64,000,000 rows  -> height 3
     400^4 = 25.6 billion rows -> height 4

     and the root and upper levels stay in the buffer cache, because
     the root is touched by every query and is never evicted
     -> often ONE real I/O, at the leaf

  The lesson: the unit of cost is the PAGE FETCH, so you want as few
  fetches as possible, which means as much as possible per node.
```

```text
B-tree vs B+ tree, drawn:

  B-TREE: data lives in internal nodes too

                  [ 50:row | 100:row ]
                 /         |         \
      [20:row 35:row]  [70:row]   [150:row 200:row]

      - internal nodes carry payload -> FEWER keys per page
        -> lower fanout -> TALLER tree
      - a range scan must climb up and down (in-order traversal)
      - a lookup can stop early at an internal node (variable cost)

  B+ TREE: internal nodes are pure routing, all data in the leaves

                  [    50   |   100   ]          <- keys only
                 /          |          \
      [20|35] <-> [50|70|85] <-> [100|150|200]   <- all data, LINKED

      - internal nodes carry no payload -> MORE keys per page
        -> higher fanout -> SHORTER tree
      - leaves are a doubly linked list, so a range scan descends ONCE
        and then walks sideways, reading pages IN ORDER
      - every search reaches a leaf -> uniform, predictable cost
      - deletion is simpler: internal keys are only separators
```

```sql
-- What the leaf chain buys you, in queries you run constantly
SELECT * FROM orders WHERE placed_at BETWEEN '2025-01-01' AND '2025-03-31';
--   B+ tree: descend to the first leaf, then walk the chain forward
--            sequential page reads, read-ahead works
--   B-tree:  in-order traversal, climbing back to internal nodes,
--            scattered reads

SELECT * FROM orders ORDER BY placed_at LIMIT 20;
--   B+ tree: read 20 entries from the leaf chain. The sort is FREE.
--   hash index: cannot help at all
```

```text
Hash index vs B+ tree: the hash wins one operation and loses the rest

                              HASH            B+ TREE
  WHERE id = 7                O(1)  faster    O(log n)
  WHERE id > 1000             IMPOSSIBLE      range scan
  WHERE id BETWEEN a AND b    IMPOSSIBLE      range scan
  ORDER BY id                 IMPOSSIBLE      free, read the leaves
  LIKE 'arun%'                IMPOSSIBLE      range scan
  composite (a,b,c) on just a IMPOSSIBLE      leftmost prefix works
  MIN / MAX                   full scan       first / last leaf
  growing the structure       REHASH, a bulk  split one page
                              rewrite on disk
  skewed data                 degrades to a   unaffected
                              bucket scan

  Hashing destroys ORDER on purpose; that is how it gets O(1), and
  it is also everything it cannot do. A general-purpose index has to
  be good at everything.

  Postgres offers HASH indexes for pure equality workloads.
  InnoDB keeps an in-memory ADAPTIVE HASH INDEX on top of its B+ tree
  for hot equality lookups, which is how you get both.
```

```sql
-- The cost side, which is the half people leave out
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_placed   ON orders (placed_at);
-- ... six more
INSERT INTO orders (...) VALUES (...);
--   one row written to the table, plus one entry per index
--   -> ~9 writes for one logical insert

-- and selectivity decides whether an index is used at all
CREATE INDEX idx_orders_active ON orders (is_active);   -- 2 distinct values
SELECT * FROM orders WHERE is_active = true;            -- matches 50% of rows
--   the planner will usually ignore the index: reading half the table
--   through an index, one page fetch at a time, is slower than
--   scanning it sequentially
```

---

### What they ask next

**"Why is index height so small in practice?"**
Because fanout is in the hundreds, so height grows logarithmically with a very large base. A four-level B+ tree addresses tens of billions of rows, and since the top levels are permanently cached, a lookup usually costs one real I/O.

**"Does an index always make a query faster?"**
No. If the predicate matches a large fraction of the table, the index makes it **slower**, because each row is reached by a separate page fetch while a sequential scan reads pages in bulk with read-ahead. Low selectivity is why the planner ignores some indexes, and that is usually the right decision.

**"What is a covering index?"**
One that contains every column a query needs, so the query is answered from the index alone without touching the table. It turns two structures' worth of I/O into one, and it is the standard fix for a hot query that currently looks up rows just to read one extra column.

**"Why can a composite index serve a query on its first column only?"**
Because the leaves are sorted lexicographically by the whole key, so entries sharing the first column are contiguous. Entries matching only the **second** column are scattered throughout, so the index cannot be used for them. This is the leftmost prefix rule.

**"Are there other index types worth knowing?"**
Yes, and naming them shows breadth: **GIN** and inverted indexes for full-text and array containment, **GiST** and **R-trees** for spatial data, **bitmap** indexes for low-cardinality columns in analytical systems, and **LSM trees** in write-heavy stores such as Cassandra and RocksDB, which buffer writes in memory and merge sorted runs on disk, trading read amplification for much faster writes.

**"Why do people say B-tree when they mean B+ tree?"**
Historical shorthand. `CREATE INDEX ... USING btree` in PostgreSQL and InnoDB's "B-tree index" are both B+ trees. Knowing the difference and knowing that the terminology is loose is the right answer.

**The common wrong answer** is "B+ trees are used because they are balanced". Red-black trees are balanced too. The reason is **fanout**: a page-sized node gives a height of three or four instead of twenty, because the cost being minimised is the **number of page fetches**, not the number of comparisons.

---

### Say this in the interview

*"A database index is an auxiliary structure mapping key values to row locations so the engine can find rows without a full table scan. The trade is read speed paid for in write cost and storage, since every insert and every update of an indexed column must also update the index, so a table with eight indexes does roughly nine writes per insert. And an index is only useful in proportion to its selectivity: one on a column with two distinct values will usually be ignored, because reading half the table through an index is slower than scanning it.*

*Databases do not use binary search trees because disk and memory have different cost models. A balanced BST has two children per node and a height of log base 2 of n, so about twenty levels for a million rows. In memory that is fine, since following a pointer is nanoseconds. On storage the unit of access is a page of 4 to 16 kilobytes and each page fetch is a random I/O, so twenty levels means up to twenty random I/Os, which is 200 milliseconds on a spinning disk and still 2 milliseconds on NVMe. Worse, each 8 kilobyte page is fetched to read about twenty bytes, one key and two pointers, and the rest is discarded. The problem is low fanout, and height is what you pay for.*

*A B+ tree sizes each node to one page, so it holds hundreds of keys and child pointers and the fanout is in the hundreds. Height becomes log base fanout of n, so with a fanout of 400, three levels covers 64 million rows and four covers 25 billion. So any row is three or four page reads away, and in practice fewer, because the root and upper internal levels stay in the buffer cache since the root is touched by every query, which makes a lookup often one real I/O at the leaf. It is also self-balancing by splitting full nodes upward, so every leaf is at the same depth and performance is predictable rather than dependent on insertion order.*

*A hash index is genuinely faster for a single equality lookup, O(1) against O(log n), but it loses everything else, and the reason is that hashing deliberately destroys order. So it cannot do range queries at all, which is decisive, cannot help with ORDER BY, cannot do leftmost prefix matching on a composite key, cannot do prefix patterns like LIKE 'arun%', needs a disruptive rehash to grow where a B+ tree splits one page, and degrades under skew as duplicates pile into one bucket. A general-purpose index has to be good at everything. PostgreSQL does offer hash indexes for pure equality workloads, and InnoDB keeps an in-memory adaptive hash index on top of its B+ tree for hot equality lookups, which is how you get both.*

*The difference from a traditional B-tree is that a B-tree stores data in internal nodes as well as leaves, while a B+ tree keeps keys only in internal nodes, as pure routing information, and all data in the leaves. Four consequences follow. Internal nodes carry no payload, so more keys fit per page, so the fanout is higher and the tree shorter, which is the main reason for the design. The leaves are chained in a doubly linked list, so a range scan descends once and then walks the chain, reading pages in order, whereas a B-tree needs an in-order traversal climbing repeatedly back to internal nodes, which is a scattered pattern, and for a database where range scans and ORDER BY are everywhere that difference is enormous. Every B+ tree search reaches a leaf, so path length is uniform and cost is predictable, while a B-tree search can terminate early at an internal node and is therefore variable. And deletion is simpler, because an internal key in a B+ tree is only a separator rather than data. The costs are that a key may be stored twice and a lucky lookup is never faster, both of which are irrelevant next to the fanout and range-scan gains, which is why every mainstream relational engine uses B+ trees even though everyone calls them B-trees."*
