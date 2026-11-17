---
id: 5-sql-join-types
title: "SQL Join Types: INNER, LEFT, RIGHT, FULL, CROSS"
description: "Not set intersection but a filtered Cartesian product, which is why the diagrams mislead and one misplaced filter changes the answer"

sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Explain the difference between INNER, LEFT, RIGHT, FULL, and CROSS joins. What is the 'Venn diagram fallacy', why does filtering in WHERE vs. ON during a LEFT JOIN cause silent bugs, and what physical join algorithms does the engine use under the hood?"

---

### Picture it

Two lists on a table: a list of **customers** and a list of **orders**. You want them paired up.

Here is what a join actually does, and it is worth doing literally once because it explains everything else.

**Lay every customer against every order.** Not the matching ones. **Every** combination. Five customers and twenty orders gives you a hundred pairs on the table. Then go through all hundred and **keep the pairs that make sense**, where the order's customer name matches the customer's name.

That is an inner join: **make all the pairs, then throw away the bad ones**.

Now the variations are easy. **A left join** adds one step: after the throwing away, look for any customer who ended up in no surviving pair at all, and put them back on the table alone, with the order half of the row left blank. **A full join** does that from both ends. **A cross join** is just the first step with no throwing away at all.

**Why the circles diagram misleads.** You have seen joins drawn as two overlapping circles with the shaded part labelled "inner join". Look back at what we actually did. We ended up with **pairs**, not with members of either list, and a single customer with three orders appears in **three** pairs. Two circles have no way to show that: a thing is either in the overlap or not, once. The diagram also cannot show a pairing rule like "the order's amount is greater than the customer's credit limit", which is perfectly legal. The circles describe sets of **things**; a join produces **combinations**, and combinations can multiply.

**And the mistake that costs people real bugs.** You do a left join to list every customer and their orders from this year. You add "and the order is from 2025" in the wrong place. Any customer with no 2025 order had a **blank** order half, and a blank is not from 2025, so that customer gets thrown off the table. You asked for every customer and silently got only the ones with orders. The query runs, returns rows, and is wrong.

---

### The proper terms

#### The join types

**INNER JOIN** returns only the row combinations where the **ON predicate is true**. Rows on either side with no match are dropped.

**LEFT OUTER JOIN** returns all rows from the **left** table. Where a right-side match exists, its columns are populated; where none exists, the right-side columns are **NULL**. The word `OUTER` is optional.

**RIGHT OUTER JOIN** is the mirror image, preserving all rows from the **right** table. It is interchangeable with a LEFT JOIN with the tables swapped, which is why most codebases use LEFT exclusively, for readability.

**FULL OUTER JOIN** returns all rows from **both** tables, with NULLs filled in on whichever side has no match. MySQL has no FULL OUTER JOIN and it must be emulated with a `UNION` of a LEFT and a RIGHT join.

**CROSS JOIN** returns the **Cartesian product**: every row of the left paired with every row of the right, with no predicate at all. The output has `m x n` rows. It is deliberate when generating combinations, such as every product against every region, and accidental when a join predicate is forgotten.

A **SELF JOIN** is not a separate type. It is any join of a table to itself, using aliases, used for hierarchies such as employee to manager.

#### The Venn diagram fallacy

The familiar two-circle picture is a useful memory aid and a wrong model, and the question is asking you to say why.

**A join is not set intersection.** It is a **filtered Cartesian product**: form every pair, keep those satisfying the predicate, and for outer joins add back the unmatched rows with NULLs. Intersection is an operation on members of sets; a join produces tuples formed from two rows.

**It cannot express multiplicity.** If one customer has three orders, the inner join emits three rows for that customer. A Venn diagram has no way to depict one element appearing three times in the overlap. This is the practical failure: an inner join can return **more rows than either input table**, which is impossible for an intersection and is the usual cause of inflated aggregates when somebody joins through a one-to-many relationship and then sums a column.

**It assumes equality.** The predicate need not be `=`. `ON o.amount > c.credit_limit` is a valid join, and there is no sensible way to shade circles for it.

**It mislabels the circles.** The circles suggest the output consists of rows from the tables. The output consists of **new, wider rows** built from both.

The correct mental model to state: **`CROSS JOIN` then filter, then, for outer joins, restore the unmatched rows with NULLs.**

#### WHERE versus ON in a LEFT JOIN

This is the most common silent bug in SQL, and the reason is the order of operations.

The `ON` clause is evaluated while the join is being formed. It decides which right-side rows count as a match. A left row with no match is still **preserved and NULL-extended**, because that is what LEFT JOIN means.

The `WHERE` clause is evaluated **after the join result exists**, on the combined rows, including the NULL-extended ones.

So a condition on a **right-table column** placed in `WHERE` is tested against **NULL** for every unmatched left row. In SQL's three-valued logic, `NULL = '2025'` is **unknown**, not true, and `WHERE` keeps only rows where the predicate is **true**. Those rows are therefore **discarded**, and the LEFT JOIN has been silently converted into an INNER JOIN.

The rule:

**A condition that decides what counts as a match belongs in `ON`.**

**A condition that filters the final result belongs in `WHERE`.**

For a left-joined table, almost any condition on its columns belongs in `ON`.

The one deliberate exception is the **anti-join** idiom: `WHERE right.id IS NULL` after a LEFT JOIN keeps exactly the left rows that had **no** match, which is how you find customers with no orders. There the NULL-extension is the thing you are selecting for.

Note that for an **INNER JOIN** the distinction does not matter for correctness, since there are no NULL-extended rows to lose, which is exactly why the habit of writing filters in `WHERE` survives until it meets a LEFT JOIN.

#### The physical join algorithms

`JOIN` is a logical request. The planner chooses the physical algorithm, and there are three.

**Nested loop join.** For each row of the **outer** input, find the matching rows of the **inner** input. Naively this is `O(n x m)`, but with an index on the inner side's join column it becomes an **index nested loop** at roughly `O(n log m)`, which is excellent when the outer input is small.

It is also the only general-purpose option for non-equality predicates, so a join on `>` or a range condition usually lands here.

**Hash join.** Build an in-memory **hash table** on the **smaller** input, the **build** side, then scan the larger input, the **probe** side, hashing each row's key to find matches. Cost is about `O(n + m)`, which is excellent for large inputs with no useful index.

Two constraints: it works for equality predicates only, since a hash gives no ordering, and it needs memory. If the hash table does not fit it **spills to disk**, becoming a **grace hash join**, which is much slower and is a common cause of a plan that was fine in testing and is slow in production.

**Sort-merge join.** **Sort both inputs** on the join key, then walk them together in one pass. Cost is `O(n log n + m log m)` dominated by the sorts, but if both inputs are **already sorted**, typically because they are being read in index order, the sorts vanish and it is `O(n + m)`.

Its advantages are that it handles very large inputs with predictable memory, supports **range predicates** as well as equality, and **preserves order**, which can make a later `ORDER BY` free.

The planner chooses using **cardinality estimates** from table statistics, available indexes, the memory budget and whether inputs are already sorted. The characteristic failure is a **bad estimate**: when the planner thinks an input has 100 rows and it has a million, it picks a nested loop and the query takes hours, which is why stale statistics cause sudden, dramatic regressions.

---

### In code

```sql
-- The types, on the same two tables
SELECT c.name, o.id
FROM customers c INNER JOIN orders o ON o.customer_id = c.id;
-- only matched pairs

SELECT c.name, o.id
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id;
-- every customer; o.id is NULL for customers with no orders

SELECT c.name, o.id
FROM customers c FULL JOIN orders o ON o.customer_id = c.id;
-- every customer AND every order; NULLs on whichever side is missing
-- (MySQL has no FULL JOIN: emulate with LEFT UNION RIGHT)

SELECT p.name, r.name
FROM products p CROSS JOIN regions r;
-- every combination, no predicate: m x n rows. Deliberate here.
```

```text
What a join really is, done literally:

  customers          orders
  (1, arun)          (90, cust 1, 2025)
  (2, bela)          (91, cust 1, 2024)
                     (92, cust 3, 2025)

  STEP 1: every pair (this is CROSS JOIN)
     (1,arun)-(90)  (1,arun)-(91)  (1,arun)-(92)
     (2,bela)-(90)  (2,bela)-(91)  (2,bela)-(92)

  STEP 2: keep pairs where o.customer_id = c.id   (this is ON)
     (1,arun)-(90)  (1,arun)-(91)
     -> INNER JOIN result. Note arun appears TWICE.

  STEP 3 (outer joins only): add back unmatched left rows, NULL-extended
     (2,bela)-(NULL)
     -> LEFT JOIN result

  This is why two circles cannot describe it: the output is PAIRS,
  one customer can appear three times, and an inner join can return
  MORE rows than either table.
```

```sql
-- The silent bug, side by side
-- WRONG: looks like a LEFT JOIN, behaves like an INNER JOIN
SELECT c.name, o.id
FROM   customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE  o.year = 2025;
--     ^ bela's row was NULL-extended, so o.year is NULL.
--       NULL = 2025 is UNKNOWN, not true, so WHERE discards her.
--       Customers with no 2025 order silently disappear.

-- RIGHT: the condition decides what counts as a match
SELECT c.name, o.id
FROM   customers c
LEFT JOIN orders o ON o.customer_id = c.id
                  AND o.year = 2025;
--     ^ every customer is returned; o.id is NULL where there is
--       no 2025 order. This is what was asked for.

-- The deliberate exception: the anti-join
SELECT c.name
FROM   customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE  o.id IS NULL;        -- customers with NO orders at all
```

```text
Why ON and WHERE differ, by when they run:

  FROM     ->  form the join:  ON decides what matches
                               unmatched LEFT rows are kept, NULL-filled
  WHERE    ->  filter the finished rows, NULL-filled ones included
  GROUP BY ->  ...

  ON     = "what counts as a match"       -> belongs to the join
  WHERE  = "which result rows do I want"  -> belongs after it

  For an INNER JOIN the distinction does not change the answer,
  because there are no NULL-extended rows to lose. That is exactly
  why the bad habit survives until it meets a LEFT JOIN.
```

```text
The three physical algorithms, and when each one wins:

  NESTED LOOP
     for each outer row: look up matches in the inner input
     O(n x m) naive, O(n log m) with an index on the inner side
     WINS: small outer input + index on the inner side
     ONLY option for non-equality predicates (>, BETWEEN, ...)

  HASH JOIN
     build a hash table on the SMALLER input, probe with the larger
     O(n + m)
     WINS: large inputs, no useful index
     LIMITS: equality predicates only; if the hash table does not fit
             it spills to disk as a grace hash join and gets much slower

  SORT-MERGE
     sort both inputs on the key, then walk them together once
     O(n log n + m log m), or O(n + m) if already sorted via an index
     WINS: very large inputs, pre-sorted data, range predicates
     BONUS: preserves order, so a later ORDER BY can be free

  The planner picks from cardinality estimates, indexes, memory and
  sortedness. The classic disaster is a bad estimate: it thinks an
  input has 100 rows, it has a million, it picks a nested loop, and
  the query runs for hours. That is why stale statistics cause
  sudden, dramatic regressions.
```

---

### What they ask next

**"Can an INNER JOIN return more rows than either table?"**
Yes, and this is the clearest refutation of the Venn model. Joining through a one-to-many relationship multiplies rows, so a 1000-row table joined to a 5000-row table can return far more than 5000. It is the usual reason an aggregate comes out inflated.

**"Is a RIGHT JOIN ever necessary?"**
No, it is always expressible as a LEFT JOIN with the operands swapped. Teams standardise on LEFT because reading a query where the preserved side changes direction halfway down a chain of joins is needlessly hard.

**"How do you emulate FULL OUTER JOIN in MySQL?"**
A `UNION` of a LEFT JOIN and a RIGHT JOIN. Use `UNION` rather than `UNION ALL` so the matched rows, which appear in both halves, are deduplicated.

**"What happens if you forget the ON clause?"**
With `JOIN ... ON` omitted you get a syntax error in most engines, but with comma-separated tables and no `WHERE` you get a silent `CROSS JOIN`. On two million-row tables that is a trillion rows, which is why explicit `JOIN` syntax is preferred: it makes a missing predicate a syntax error rather than a runaway query.

**"Why can a hash join not handle `>`?"**
Because hashing preserves equality and destroys order: two keys that are close numerically land in unrelated buckets. There is nothing to probe for in a range predicate, so range joins fall back to nested loop or merge.

**"When does a hash join become slow?"**
When the build side does not fit in the memory budget. It then partitions both inputs to disk and joins partition by partition, which turns an in-memory operation into a disk-bound one. Under-estimating the build side's size is the usual trigger.

**The common wrong answer** is explaining joins with the circles diagram and nothing else. It cannot express row multiplication, non-equality predicates, or what NULL-extension actually is, and those three things are where real join bugs come from.

---

### Say this in the interview

*"INNER JOIN returns only the combinations where the ON predicate is true. LEFT OUTER JOIN returns every row from the left table, with the right-side columns populated where a match exists and NULL where it does not. RIGHT OUTER JOIN is the mirror and is always expressible as a LEFT JOIN with the tables swapped, which is why most codebases only use LEFT. FULL OUTER JOIN returns all rows from both sides with NULLs where either has no match, and MySQL does not have it, so you emulate it with a UNION of a LEFT and a RIGHT join. CROSS JOIN is the Cartesian product, every left row paired with every right row, with no predicate, giving m times n rows. A self join is not a separate type, just a table joined to itself with aliases.*

*The Venn diagram fallacy is that a join is not set intersection; it is a filtered Cartesian product. You form every pair, keep the ones satisfying the predicate, and for outer joins add back the unmatched rows NULL-extended. The diagram fails in three concrete ways. It cannot express multiplicity: if one customer has three orders, that customer appears in three output rows, so an inner join can return more rows than either input table, which is impossible for an intersection and is the usual cause of inflated aggregates. It assumes equality, when the predicate can be anything, including a greater-than. And it mislabels the circles, because the output rows are new, wider rows built from both tables rather than rows from either.*

*The WHERE versus ON bug comes from when each runs. ON is evaluated while the join is formed and decides what counts as a match, and an unmatched left row is still preserved and NULL-extended. WHERE is evaluated after the join result exists, on the combined rows including the NULL-extended ones. So a condition on a right-table column in WHERE is tested against NULL for every unmatched left row, and since NULL equals anything is unknown rather than true, those rows are discarded and the LEFT JOIN has silently become an INNER JOIN. The rule is that a condition deciding what counts as a match goes in ON, and a condition filtering the final result goes in WHERE, so for a left-joined table almost everything belongs in ON. The deliberate exception is the anti-join, where WHERE right.id IS NULL selects exactly the left rows with no match. For an inner join the distinction does not affect correctness, which is why the habit survives until it meets a LEFT JOIN.*

*Physically the planner picks one of three algorithms. Nested loop: for each outer row find matches in the inner input, O of n times m naively, but an index on the inner side makes it an index nested loop at about O of n log m, which is excellent for a small outer input, and it is the only general option for non-equality predicates. Hash join: build a hash table on the smaller input and probe with the larger, O of n plus m, excellent for large inputs with no useful index, but equality only because hashing destroys order, and if the hash table does not fit it spills to disk as a grace hash join and gets much slower. Sort-merge: sort both inputs on the key and walk them together, O of n log n plus m log m, or linear if they are already sorted from an index; it handles very large inputs with predictable memory, supports range predicates, and preserves order so a later ORDER BY can be free.*

*The planner chooses from cardinality estimates, indexes, memory and sortedness, and the classic failure is a bad estimate: it expects a hundred rows, gets a million, picks a nested loop, and the query runs for hours. That is why stale statistics cause sudden regressions."*
