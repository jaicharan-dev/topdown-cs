---
id: 21-composite-index-column-order
title: "Composite Index Column Order"
description: "A phone book sorted by surname then first name, and the moment a range appears every column after it stops being searchable"

sidebar_position: 21
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Why does column order matter in a composite index on `(department_id, salary)`? Can a query filtering only on `salary` use this index, what is the Range Query Cliff, and how does the ESR rule guide optimal column ordering?"

---

### Picture it

A phone book sorted by **surname, then first name**.

**"Find Patel, Anjali"** is instant. You open at the Patels, and within them the Anjalis are together. Two narrowings, both of which the ordering helps with.

**"Find every Patel"** is also instant. All the Patels are contiguous, and you never needed the first name.

**"Find every Anjali"** is a disaster. Anjali Patel, Anjali Kumar, Anjali Rao are **scattered through the entire book**, one in every surname's block. The sorting gave you nothing, and you must read every page. The book is not organised by first name at all; first name only ever **breaks ties within a surname**.

So the ordering serves **the first column, or the first and then the second**, and never **the second alone**.

**Now the part that catches people out.**

**"Find every Patel whose first name starts with A"** is still fine. One surname, one contiguous run of A-names inside it.

**"Find everyone with a surname from P to S whose first name starts with A"** is not. Within Patel the A-names are together; within Rao the A-names are together; within Singh the A-names are together. But **across the whole P-to-S stretch they are not together at all**. You must walk the entire P-to-S section and check each entry's first name individually.

That is the cliff. The moment you ask for a **range** on the first column, the second column's ordering **only exists inside each individual value** of the first, so it can no longer narrow your search. It can only **filter what you have already read**.

Which gives the rule: put the things you want **exactly** first, the thing you want **in order** next, and the thing you want **a range of** last, because everything after a range is reading anyway.

---

### The proper terms

#### What a composite index actually is

An index on `(a, b)` stores its entries sorted **lexicographically**: first by `a`, and within equal values of `a`, by `b`.

That is the whole mental model, and every rule below follows from it. The index is **one** sorted structure, not two.

#### The leftmost prefix rule

A composite index on `(a, b, c)` can serve queries that constrain:

**`a`**

**`a` and `b`**

**`a`, `b` and `c`**

It cannot serve a query constraining only `b`, only `c`, or only `b` and `c`.

The reason is exactly the phone book: entries with a given `b` are scattered across every value of `a`, so there is no contiguous range to seek to.

So for `(department_id, salary)`:

**`WHERE department_id = 5`** uses the index.

**`WHERE department_id = 5 AND salary > 100000`** uses the index on **both** columns.

**`WHERE salary > 100000`** alone cannot use it for access.

One qualification worth knowing, because it is the modern exception: several engines implement an **index skip scan**, also called a loose index scan, where the engine **iterates the distinct values of the leading column** and performs a seek on the remaining columns for each. Oracle has had it for years, MySQL 8.0 added it, and PostgreSQL 18 introduced it. It only pays when the **leading column has very few distinct values**, because the engine is effectively doing one seek per distinct value. With a thousand departments it is worse than a scan.

#### The range query cliff

The sharper rule, and the one the question names:

**Once a column is constrained by a range, no column after it in the index can be used for access.**

A range means `>`, `<`, `>=`, `<=`, `BETWEEN`, or `LIKE 'prefix%'`.

The reason, again from the ordering: within **one** value of `department_id`, the salaries are sorted. Across **a range** of `department_id`, they are not. Department 6's salaries start again from the bottom after department 5's end, so there is no single contiguous run of high salaries to seek to.

The practical vocabulary for this distinction:

**An access predicate** narrows the portion of the index that is read. It determines where the scan starts and stops.

**A filter predicate** is applied to rows the scan has **already read**, discarding non-matching ones. It saves no I/O.

So:

```sql
WHERE department_id = 5     AND salary > 100000   -- both are ACCESS
WHERE department_id > 5     AND salary > 100000   -- salary is a FILTER
```

In the second, the engine seeks to the start of department 6 and then **reads every entry to the end of the index**, discarding rows whose salary is too low. On a large table that is most of the index.

This is why **putting a range column early in a composite index destroys the value of everything after it**, and it is the single most common composite index mistake.

#### The ESR rule

**ESR**, popularised by MongoDB's documentation but universally applicable, gives the ordering:

**Equality first.** Columns compared with `=` or `IN`. These narrow the index to a **contiguous block**, and each one narrows it further.

**Sort second.** Columns used in `ORDER BY`. If they follow the equality columns, the index already delivers rows **in the required order**, so the sort is **free**: the plan has no sort node and `LIMIT` can stop early.

**Range last.** Columns compared with `>`, `<`, `BETWEEN` or a prefix `LIKE`. They go last because, by the cliff, nothing after a range can be used for access anyway, so a range column placed earlier would waste every column following it.

The ordering that follows is **not** "most selective first", which is the common folklore. Cardinality is a reasonable **tie-break among the equality columns**, since narrowing faster reduces the block read and improves compression, but **access-pattern shape beats cardinality**: an index that lets the sort be free and the range be a bounded scan outperforms one ordered purely by selectivity.

The reason sort must come **before** range is worth stating explicitly: if you put the range column before the sort column, the rows come out ordered by the range column, **not** by what you wanted to sort on, so the engine must perform an **explicit sort** of the entire result, which also prevents `LIMIT` from stopping early.

#### Two practical consequences

**One composite index serves several queries.** `(a, b, c)` covers queries on `a`, on `(a, b)` and on `(a, b, c)`, so a single well-ordered index often replaces three single-column ones, with a third of the write cost.

**Add columns for covering, not for filtering.** Once the key columns are chosen by ESR, extra columns that the query merely **selects** can be appended, or better placed in an **`INCLUDE`** clause in PostgreSQL and SQL Server, which stores them at the leaf only. That turns the plan into an **index-only scan**, removing the heap fetch per row, without affecting the key's size or ordering semantics.

---

### In code

```text
What a composite index IS: one lexicographically sorted structure

  INDEX ON (department_id, salary)

     (1, 40000)  (1, 55000)  (1, 90000)
     (2, 30000)  (2, 72000)
     (3, 51000)  (3, 51000)  (3, 120000)
     (4, 65000)
     ...

  sorted by department_id, and WITHIN EQUAL department_id, by salary.

  this is ONE sorted structure, not two, and every rule below
  follows from that single fact.
```

```sql
-- THE LEFTMOST PREFIX RULE
CREATE INDEX idx ON employees (department_id, salary);

WHERE department_id = 5;                        -- USES the index
WHERE department_id = 5 AND salary > 100000;    -- USES BOTH columns
WHERE department_id IN (1,2,3) AND salary = 50000;  -- USES both

WHERE salary > 100000;                          -- CANNOT use it
WHERE salary = 50000;                           -- CANNOT use it
--   entries with a given salary are SCATTERED ACROSS EVERY
--   department, exactly like every "Anjali" being scattered through
--   a phone book sorted by surname. There is no contiguous range
--   to seek to.

-- the modern exception: an INDEX SKIP SCAN (loose index scan), where
-- the engine ITERATES THE DISTINCT VALUES of the leading column and
-- seeks on the rest for each.
--   Oracle has had it for years; MySQL 8.0 added it; PostgreSQL 18
--   introduced it.
--   it only pays when the LEADING COLUMN HAS VERY FEW DISTINCT
--   VALUES, because it is one seek per distinct value. With a
--   thousand departments it is worse than a scan.
```

```text
THE RANGE QUERY CLIFF

  "once a column is constrained by a RANGE, no column after it in
   the index can be used for ACCESS."

  a range means  >  <  >=  <=  BETWEEN  LIKE 'prefix%'

  WHY, from the ordering:

     within ONE department, salaries are sorted:
        (5, 40000) (5, 55000) (5, 90000) (5, 110000)
                                          ^^^^^^^^^^ seek here

     across A RANGE of departments, they are NOT:
        (6, 30000) (6, 150000) (7, 20000) (7, 180000) (8, 45000)...
                    ^^^^^^^^^^             ^^^^^^^^^^
        the high salaries are SCATTERED, one run per department.
        There is no single contiguous block to seek to.
```

```sql
-- The vocabulary that makes this precise:
--   an ACCESS predicate narrows the portion of the index READ
--   a FILTER predicate is applied to rows ALREADY READ

WHERE department_id = 5 AND salary > 100000;
--    ^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^
--    ACCESS                ACCESS
--    seek straight to (5, 100000) and scan forward while dept = 5.
--    reads ONLY matching rows.

WHERE department_id > 5 AND salary > 100000;
--    ^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^
--    ACCESS                FILTER
--    seek to the start of department 6, then READ EVERY ENTRY TO
--    THE END OF THE INDEX, discarding rows whose salary is too low.
--    On a large table that is most of the index.

-- which is why PUTTING A RANGE COLUMN EARLY IN A COMPOSITE INDEX
-- DESTROYS THE VALUE OF EVERYTHING AFTER IT, and is the single most
-- common composite index mistake.
```

```text
THE ESR RULE: Equality, Sort, Range

  E  EQUALITY FIRST   columns compared with = or IN
                      each one narrows the index to a smaller
                      CONTIGUOUS BLOCK

  S  SORT SECOND      columns used in ORDER BY
                      if they follow the equality columns, the index
                      already delivers rows IN THE REQUIRED ORDER,
                      so THE SORT IS FREE: no sort node in the plan,
                      and LIMIT can stop early

  R  RANGE LAST       columns compared with > < BETWEEN or a prefix
                      LIKE
                      they go last because, BY THE CLIFF, nothing
                      after a range can be used for access anyway,
                      so a range placed earlier wastes every column
                      following it

  and note what ESR is NOT: it is not "most selective first", which
  is the common folklore. Cardinality is a reasonable TIE-BREAK
  AMONG THE EQUALITY COLUMNS, but ACCESS-PATTERN SHAPE BEATS
  CARDINALITY.

  why SORT must come BEFORE RANGE:
     put the range column first and the rows emerge ordered by the
     RANGE column, not by what you wanted to sort on, so the engine
     must do an EXPLICIT SORT of the whole result, which also stops
     LIMIT from terminating early.
```

```sql
-- ESR worked through
SELECT   name, salary, hired_on
FROM     employees
WHERE    department_id = 5          -- EQUALITY
  AND    status        = 'active'   -- EQUALITY
  AND    salary        > 100000     -- RANGE
ORDER BY hired_on DESC              -- SORT
LIMIT    20;

-- WRONG: the range is too early
CREATE INDEX bad ON employees (salary, department_id, status, hired_on);
--   salary is a RANGE, so department_id, status and hired_on are all
--   FILTERS. The plan scans every salary above 100000 across every
--   department AND sorts the result.

-- RIGHT: E, then S, then R
CREATE INDEX good ON employees (department_id, status, hired_on, salary);
--   department_id = 5 AND status = 'active'  -> a contiguous block
--   within it, rows are already ordered by hired_on -> SORT IS FREE,
--      and LIMIT 20 stops after 20 matching rows
--   salary > 100000 filters within that, which is all it could ever
--      have done
```

```sql
-- Two practical consequences

-- 1. ONE composite index serves SEVERAL queries
CREATE INDEX idx ON orders (customer_id, status, placed_at);
--   serves: WHERE customer_id = ?
--           WHERE customer_id = ? AND status = ?
--           WHERE customer_id = ? AND status = ? AND placed_at > ?
--           WHERE customer_id = ? ORDER BY ... (if ordering follows)
--   -> replaces three single-column indexes at a THIRD of the
--      write cost

-- 2. ADD COLUMNS FOR COVERING, NOT FOR FILTERING
-- once the key columns are chosen by ESR, columns the query merely
-- SELECTS can be appended, or better, put in INCLUDE:
CREATE INDEX idx_cover ON employees (department_id, status, hired_on)
    INCLUDE (name, salary);
--   stored at the LEAF ONLY, so they do not enlarge the key or
--   change its ordering semantics
--   -> turns the plan into an INDEX-ONLY SCAN, removing the heap
--      fetch per row, which is usually the dominant cost
```

---

### What they ask next

**"Can a query on `salary` alone use an index on `(department_id, salary)`?"**
Not for access. Entries with a given salary are scattered across every department, so there is no contiguous range to seek to. Some engines can do an index skip scan if `department_id` has very few distinct values, but that is one seek per distinct value and it loses quickly as cardinality rises.

**"What is the range query cliff?"**
Once a column is constrained by a range, no column after it in the index can be used for access, because the later column is only sorted **within** each individual value of the earlier one, not across the range. Everything after the range becomes a filter on rows already read.

**"What is the difference between an access predicate and a filter predicate?"**
An access predicate decides where the index scan starts and stops, so it reduces I/O. A filter predicate is evaluated against rows that have already been read, so it reduces the result size but saves nothing. The cliff is precisely the point where predicates stop being the first and become the second.

**"State the ESR rule and why each part is where it is."**
Equality first, because each equality narrows the index to a smaller contiguous block. Sort next, because the index then delivers rows already ordered, making the sort free and letting `LIMIT` stop early. Range last, because nothing after a range can be used for access, so putting it earlier wastes every subsequent column.

**"Is it not better to put the most selective column first?"**
Not as a rule. Selectivity is a sensible tie-break among the equality columns, but access-pattern shape dominates: an ordering that makes the sort free and the range a bounded scan beats one chosen purely on cardinality.

**"Why does an index make a sort free?"**
Because the index entries are already in that order, so the engine reads them in sequence and emits rows directly. The plan has no sort node, memory use stays flat, and `LIMIT n` can stop after n rows instead of sorting everything first.

**"How many indexes do you need for three predicates?"**
Often one. A composite on `(a, b, c)` serves `a`, `(a, b)` and `(a, b, c)`, so a single well-ordered index replaces three single-column ones at a third of the write cost.

**"When would you use `INCLUDE`?"**
When a query needs extra columns for output but not for searching or ordering. `INCLUDE` stores them at the leaf only, so they do not enlarge the key or change its ordering, and they let the plan become an index-only scan, which removes the heap fetch per matching row.

**The common wrong answer** is "the most selective column goes first". The question is really about the **lexicographic ordering**: a composite index is one sorted structure, which is why only a **leftmost prefix** is usable, why a **range truncates usefulness at that column**, and why **ESR** orders by how each predicate interacts with that ordering rather than by cardinality.

---

### Say this in the interview

*"A composite index on department_id and salary stores its entries sorted lexicographically: first by department_id, and within equal department_id, by salary. It is one sorted structure, not two, and every rule follows from that.*

*So the leftmost prefix rule: the index serves queries constraining department_id, or department_id and salary, but not salary alone. Entries with a given salary are scattered across every department, exactly like every Anjali being scattered through a phone book sorted by surname, so there is no contiguous range to seek to. The modern qualification is the index skip scan, or loose index scan, where the engine iterates the distinct values of the leading column and seeks on the rest for each. Oracle has had it for years, MySQL 8.0 added it and PostgreSQL 18 introduced it, but it only pays when the leading column has very few distinct values, because it is one seek per distinct value.*

*The range query cliff is the sharper rule: once a column is constrained by a range, meaning greater than, less than, BETWEEN or a prefix LIKE, no column after it in the index can be used for access. The reason is the same ordering: within one department the salaries are sorted, but across a range of departments they are not, because department six's salaries start again from the bottom after department five's end, so there is no single contiguous run of high salaries to seek to.*

*The vocabulary that makes this precise is access predicates versus filter predicates. An access predicate narrows the portion of the index that is read, deciding where the scan starts and stops. A filter predicate is applied to rows the scan has already read. So department_id equals five and salary greater than a hundred thousand are both access predicates, seeking straight to that point and scanning forward. But department_id greater than five and salary greater than a hundred thousand makes salary only a filter: the engine seeks to the start of department six and then reads every entry to the end of the index, discarding rows whose salary is too low. That is why putting a range column early destroys the value of everything after it, and it is the single most common composite index mistake.*

*The ESR rule orders the columns accordingly: equality first, then sort, then range. Equality columns first because each narrows the index to a smaller contiguous block. Sort columns next, because if they follow the equality columns the index already delivers rows in the required order, so the sort is free, with no sort node in the plan and LIMIT able to stop early. Range columns last, because by the cliff nothing after a range can be used for access anyway, so a range placed earlier wastes every column following it. And sort must come before range specifically because if the range column comes first, the rows emerge ordered by the range column rather than by what you wanted to sort on, forcing an explicit sort of the whole result and preventing LIMIT from stopping early.*

*I would add that ESR is not the folklore rule of most-selective-first. Cardinality is a reasonable tie-break among the equality columns, since narrowing faster reduces the block read, but access-pattern shape beats cardinality.*

*Two practical consequences. One composite index serves several queries, since an index on a, b and c covers a, then a and b, then all three, so a single well-ordered index often replaces three single-column ones at a third of the write cost. And once the key columns are chosen by ESR, columns the query merely selects should be added for covering rather than filtering, ideally in an INCLUDE clause in PostgreSQL or SQL Server, which stores them at the leaf only so they do not enlarge the key or change its ordering, and which turns the plan into an index-only scan, removing the heap fetch per row."*
