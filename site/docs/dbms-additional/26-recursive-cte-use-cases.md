---
id: 26-recursive-cte-use-cases
title: "Recursive CTEs"
description: "An anchor, a step that consumes only the previous level, and a guard without which a cycle in your data runs until memory is gone"

sidebar_position: 26
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is a recursive CTE in SQL, and how does it execute under the hood? Write a query to traverse an organizational tree, explain how to compute a cumulative roll-up budget across a whole subordinate hierarchy, and how do you guard against infinite loops?"

---

### Picture it

You want everyone who reports to a director, at any depth.

**You cannot write this as a fixed number of joins**, because you do not know how deep the tree goes. Three levels today, five after a reorganisation. SQL has no way to say "join an unknown number of times", which is exactly the gap this feature fills.

**So you do it in rounds.**

**Round zero**: write down the director. That is your starting set.

**Round one**: take the people you wrote down **in the last round**, and find everyone reporting directly to them. Write those down too.

**Round two**: take the people from **round one only**, and find their direct reports.

Keep going. When a round finds nobody, you are finished.

Notice the detail that makes it work, and that the name obscures: **each round looks only at what the previous round produced**, not at everything accumulated so far. You are not re-scanning the whole list each time; you are pushing a **frontier** outward one level per round. It is genuinely a **loop**, not what a programmer would call recursion, and understanding that is most of understanding the performance.

**And now the danger.**

Suppose somebody's record says their manager is **someone further down their own branch**. Round after round you walk the loop, writing the same people down again, and **no round ever comes back empty**. The process does not fail, does not warn, and does not stop. It keeps allocating memory until there is none left.

Nothing in the data looks wrong. One record has one field pointing the wrong way, and the query that worked yesterday now takes the server down. So every traversal needs something that **stops it from the outside**: either a hard limit on how many rounds you are willing to run, or a note of where you have already been.

---

### The proper terms

#### The structure

A recursive CTE has **two parts joined by `UNION ALL`**:

**The anchor**, or base case: a non-recursive query producing the **starting rows**.

**The recursive term**: a query that **references the CTE itself**, producing the next level from the previous one.

```sql
WITH RECURSIVE t AS (
    SELECT ...            -- ANCHOR: the starting rows
    UNION ALL
    SELECT ... FROM t ... -- RECURSIVE TERM: references t
)
SELECT * FROM t;
```

In PostgreSQL the `RECURSIVE` keyword goes on the **`WITH`**, not on the individual CTE, and it covers every CTE in that clause even if only one is recursive.

#### How it executes

The algorithm is worth knowing precisely, because the name misleads.

**1.** Evaluate the **anchor**. Put its rows in the **result** and in a **working table**.

**2.** Repeat:

Evaluate the **recursive term**, with the CTE reference resolving to the **working table only**, not to everything accumulated so far.

**Append** the output to the result.

**Replace** the working table with that output.

**3.** Stop when an iteration produces **zero rows**.

The consequence to state: **it is iteration, not recursion.** Each step consumes only the **previous level's** rows, which is why the intermediate state stays small and why the whole thing is tractable. The SQL standard calls it recursive; the execution is a loop over a frontier.

Two further mechanics:

**`UNION ALL` versus `UNION`.** `UNION ALL` appends without checking. `UNION` deduplicates against everything produced so far, which incidentally terminates cycles, but it costs a sort or hash on every iteration and it hides the cycle rather than reporting it.

**No aggregates or window functions in the recursive term**, and the self-reference may appear only once and not inside an outer join's null-producing side. These are specification restrictions, not engine quirks.

#### Traversing an organisational tree

The canonical query, with depth and a readable path:

```sql
WITH RECURSIVE org AS (
    -- ANCHOR: the director
    SELECT id, name, manager_id,
           1 AS depth,
           name::text AS path
    FROM   employees
    WHERE  id = 42

    UNION ALL

    -- RECURSIVE TERM: direct reports of the PREVIOUS level
    SELECT e.id, e.name, e.manager_id,
           o.depth + 1,
           o.path || ' > ' || e.name
    FROM   employees e
    JOIN   org o ON e.manager_id = o.id
    WHERE  o.depth < 20                     -- the GUARD
)
SELECT depth, path, name FROM org ORDER BY path;
```

The join `e.manager_id = o.id` is what walks **downward**. Reversing it to `e.id = o.manager_id` walks **upward**, which gives the chain of command above a person, and is the same query in the other direction.

**Index the join column.** Each iteration joins the working table to `employees` on `manager_id`, so an index on `(manager_id)` turns each round into index lookups rather than a scan of the whole table per level.

#### Cumulative roll-up across a subtree

This is the harder part, and there are two shapes depending on what you need.

**For one root**, descend from it and sum:

```sql
WITH RECURSIVE subtree AS (
    SELECT id, budget FROM departments WHERE id = 7
    UNION ALL
    SELECT d.id, d.budget
    FROM   departments d JOIN subtree s ON d.parent_id = s.id
)
SELECT SUM(budget) AS total_budget FROM subtree;
```

**For every node at once**, which is what "roll up the whole hierarchy" usually means, the trick is to build **ancestor-descendant pairs** rather than a single path:

```sql
WITH RECURSIVE closure AS (
    -- ANCHOR: every node is its own descendant, so a node's own
    -- budget is included in its roll-up
    SELECT id AS ancestor, id AS descendant FROM departments

    UNION ALL

    SELECT c.ancestor, d.id
    FROM   closure c
    JOIN   departments d ON d.parent_id = c.descendant
)
SELECT c.ancestor AS department_id,
       SUM(d.budget) AS rolled_up_budget
FROM   closure c
JOIN   departments d ON d.id = c.descendant
GROUP  BY c.ancestor;
```

Two points worth making about this form:

**The anchor pairs each node with itself**, which is what makes a node's roll-up include its **own** budget as well as its descendants'. Omitting it gives you "the total of everything **below** me", which is a different and sometimes intended figure.

**This is a transitive closure**, and it can be large: a deep tree produces roughly `nodes x average depth` pairs. On a big hierarchy, materialising the closure into a table and maintaining it, or using a **path column** such as PostgreSQL's `ltree`, is the usual production answer.

#### Guarding against infinite loops

Four mechanisms, and the first is the one to reach for by default.

**A depth counter.** Carry `depth` and add `WHERE depth < N` to the recursive term. Simple, always works, and bounds the cost regardless of the cause. The cost is that a genuinely deep tree is silently truncated, so choose `N` generously and consider raising an error if the limit is hit.

**Cycle detection by path.** Accumulate the visited nodes in an array and exclude any node already in it. This finds the actual cycle rather than merely stopping, and PostgreSQL 14 added dedicated syntax for it:

```sql
WITH RECURSIVE t AS (...)
CYCLE id SET is_cycle USING path
SELECT * FROM t WHERE NOT is_cycle;
```

**`UNION` instead of `UNION ALL`.** Deduplication terminates a cycle because the repeated rows are discarded, so an iteration eventually returns nothing. It is the laziest fix: it costs a sort or hash per iteration, and it **masks** the data problem rather than surfacing it.

**Engine limits.** SQL Server has **`MAXRECURSION`**, defaulting to 100, raised with `OPTION (MAXRECURSION n)` and disabled with `0`. **PostgreSQL has no default limit at all**, so an unguarded cycle runs until memory is exhausted, which is worth knowing because it means the guard is **your** responsibility rather than the engine's.

Beyond cycles, the other practical guards: a **`LIMIT`** on the outer query, and a **statement timeout**, so a pathological traversal fails fast rather than consuming the server.

#### Other uses

Worth a sentence each, because the pattern generalises well beyond trees:

**Bill of materials**, expanding a product into its components and their components, with quantities multiplied down the levels.

**Graph reachability**, finding everything connected to a node, where cycle detection is **mandatory** rather than defensive.

**Generating series**, producing a sequence of numbers or a date spine when `generate_series` is unavailable, which is the standard portable technique.

**Running computations** where each row depends on the previous result in a way a window function cannot express, such as an amortisation schedule.

---

### In code

```text
THE STRUCTURE: two parts joined by UNION ALL

  WITH RECURSIVE t AS (
      SELECT ...              -- ANCHOR: the starting rows,
      UNION ALL               --         non-recursive
      SELECT ... FROM t ...   -- RECURSIVE TERM: references t
  )
  SELECT * FROM t;

  in PostgreSQL the RECURSIVE keyword goes on the WITH, not on the
  individual CTE, and covers every CTE in that clause even if only
  one is actually recursive.
```

```text
HOW IT EXECUTES, which the name misleads about:

  1. evaluate the ANCHOR
     put its rows in the RESULT and in a WORKING TABLE

  2. repeat:
        evaluate the RECURSIVE TERM, with the CTE reference
        resolving to THE WORKING TABLE ONLY, not to everything
        accumulated so far
        APPEND the output to the result
        REPLACE the working table with that output

  3. stop when an iteration produces ZERO ROWS

  worked through, for a tree rooted at 42:

     working table            appended to result
     ---------------------------------------------
     [42]                     42                    <- anchor
     [reports of 42]          7, 9, 11
     [reports of 7,9,11]      13, 14, 21, 30
     [reports of those]       55
     []                       (nothing) -> STOP

  THE CONSEQUENCE: IT IS ITERATION, NOT RECURSION.
  each step consumes only the PREVIOUS LEVEL's rows, which is why
  the intermediate state stays small and the whole thing is
  tractable. The standard calls it recursive; the execution is a
  loop over a FRONTIER.
```

```sql
-- TRAVERSING AN ORGANISATIONAL TREE
WITH RECURSIVE org AS (
    -- ANCHOR: the director
    SELECT id, name, manager_id,
           1 AS depth,
           name::text AS path
    FROM   employees
    WHERE  id = 42

    UNION ALL

    -- RECURSIVE TERM: direct reports of the PREVIOUS level
    SELECT e.id, e.name, e.manager_id,
           o.depth + 1,
           o.path || ' > ' || e.name
    FROM   employees e
    JOIN   org o ON e.manager_id = o.id
    WHERE  o.depth < 20                     -- THE GUARD
)
SELECT depth, path, name FROM org ORDER BY path;

--   depth | path                      | name
--   ------+---------------------------+--------
--       1 | rao                       | rao
--       2 | rao > iyer                | iyer
--       3 | rao > iyer > bela         | bela
--       2 | rao > menon               | menon

-- the join e.manager_id = o.id walks DOWNWARD.
-- reversing it to e.id = o.manager_id walks UPWARD, giving the
-- chain of command above a person: the same query, other direction.

-- AND INDEX THE JOIN COLUMN: each iteration joins the working table
-- to employees on manager_id, so an index turns each round into
-- index lookups rather than a full scan per level.
CREATE INDEX idx_emp_manager ON employees (manager_id);
```

```sql
-- CUMULATIVE ROLL-UP, shape 1: FOR ONE ROOT
WITH RECURSIVE subtree AS (
    SELECT id, budget FROM departments WHERE id = 7
    UNION ALL
    SELECT d.id, d.budget
    FROM   departments d JOIN subtree s ON d.parent_id = s.id
)
SELECT SUM(budget) AS total_budget FROM subtree;
```

```sql
-- CUMULATIVE ROLL-UP, shape 2: FOR EVERY NODE AT ONCE
-- the trick is to build ANCESTOR-DESCENDANT PAIRS rather than a path
WITH RECURSIVE closure AS (
    -- ANCHOR: EVERY NODE IS ITS OWN DESCENDANT
    SELECT id AS ancestor, id AS descendant FROM departments

    UNION ALL

    SELECT c.ancestor, d.id
    FROM   closure c
    JOIN   departments d ON d.parent_id = c.descendant
)
SELECT c.ancestor AS department_id,
       SUM(d.budget) AS rolled_up_budget
FROM   closure c
JOIN   departments d ON d.id = c.descendant
GROUP  BY c.ancestor;

-- two points about this form:
--
--   THE ANCHOR PAIRS EACH NODE WITH ITSELF, which is what makes a
--   node's roll-up include its OWN budget as well as its
--   descendants'. Omitting it gives "the total of everything BELOW
--   me", a different and sometimes intended figure.
--
--   THIS IS A TRANSITIVE CLOSURE and it can be LARGE: roughly
--   nodes x average depth pairs. On a big hierarchy, materialising
--   it into a table and maintaining it, or using a PATH COLUMN such
--   as PostgreSQL's ltree, is the usual production answer.
```

```text
GUARDING AGAINST INFINITE LOOPS

  the danger: one record whose manager_id points at someone further
  down its own branch. Round after round you walk the loop, and NO
  ROUND EVER COMES BACK EMPTY. The process does not fail, does not
  warn and does not stop; it allocates until memory is gone.

  1. A DEPTH COUNTER                        <- reach for this first
        carry depth, add WHERE depth < N
        simple, always works, bounds the cost regardless of cause
        cost: a genuinely deep tree is SILENTLY TRUNCATED, so choose
              N generously and consider raising an error at the limit

  2. CYCLE DETECTION BY PATH
        accumulate visited nodes in an array, exclude any already
        present. Finds the ACTUAL cycle rather than merely stopping.

  3. UNION INSTEAD OF UNION ALL
        deduplication discards the repeats so an iteration
        eventually returns nothing.
        the LAZIEST fix: a sort or hash per iteration, and it MASKS
        the data problem rather than surfacing it.

  4. ENGINE LIMITS
        SQL Server: MAXRECURSION, DEFAULT 100
                    OPTION (MAXRECURSION 1000), or 0 to disable
        POSTGRESQL: NO DEFAULT LIMIT AT ALL
                    an unguarded cycle runs until memory is
                    exhausted
                    -> THE GUARD IS YOUR RESPONSIBILITY, not the
                       engine's

  beyond cycles: a LIMIT on the outer query, and a STATEMENT
  TIMEOUT, so a pathological traversal fails fast.
```

```sql
-- Cycle detection by hand, and with PostgreSQL 14's syntax

-- by hand: carry the path and exclude what is already in it
WITH RECURSIVE org AS (
    SELECT id, manager_id, ARRAY[id] AS visited, false AS is_cycle
    FROM   employees WHERE id = 42

    UNION ALL

    SELECT e.id, e.manager_id,
           o.visited || e.id,
           e.id = ANY(o.visited)            -- have we been here?
    FROM   employees e
    JOIN   org o ON e.manager_id = o.id
    WHERE  NOT o.is_cycle                   -- stop on this branch
)
SELECT * FROM org WHERE NOT is_cycle;

-- PostgreSQL 14+ provides dedicated syntax for exactly this:
WITH RECURSIVE org AS (
    SELECT id, manager_id FROM employees WHERE id = 42
    UNION ALL
    SELECT e.id, e.manager_id
    FROM   employees e JOIN org o ON e.manager_id = o.id
)
CYCLE id SET is_cycle USING path
SELECT * FROM org WHERE NOT is_cycle;
```

```sql
-- OTHER USES, because the pattern generalises well beyond trees

-- BILL OF MATERIALS: expand a product into components, multiplying
-- quantities down the levels
WITH RECURSIVE bom AS (
    SELECT part_id, component_id, quantity, 1 AS lvl
    FROM   assemblies WHERE part_id = :product

    UNION ALL

    SELECT a.part_id, a.component_id,
           b.quantity * a.quantity,          -- MULTIPLIED down
           b.lvl + 1
    FROM   assemblies a JOIN bom b ON a.part_id = b.component_id
    WHERE  b.lvl < 20
)
SELECT component_id, SUM(quantity) FROM bom GROUP BY component_id;

-- GENERATING A SERIES, the standard portable technique where
-- generate_series is unavailable
WITH RECURSIVE dates AS (
    SELECT DATE '2025-01-01' AS d
    UNION ALL
    SELECT d + 1 FROM dates WHERE d < DATE '2025-12-31'
)
SELECT * FROM dates;

-- GRAPH REACHABILITY: everything connected to a node, where cycle
-- detection is MANDATORY rather than defensive
-- RUNNING COMPUTATIONS where each row depends on the previous
-- result in a way a window function cannot express, such as an
-- amortisation schedule
```

---

### What they ask next

**"What are the two parts of a recursive CTE?"**
An anchor, which is a non-recursive query producing the starting rows, and a recursive term that references the CTE itself, joined by `UNION ALL`. The recursion stops when the recursive term produces no rows.

**"Is it really recursion?"**
No, it is iteration. Each round evaluates the recursive term against the **working table**, which holds only the **previous** round's output, appends the result and replaces the working table. It advances a frontier one level at a time, which is why the intermediate state stays small.

**"What does `UNION` instead of `UNION ALL` change?"**
It deduplicates against everything produced so far, which terminates cycles as a side effect. It costs a sort or hash on every iteration, and it hides the data problem rather than reporting it, so it is the laziest guard.

**"How do you roll a value up a whole hierarchy?"**
Build ancestor-descendant pairs with an anchor that pairs each node with itself, then join to the values and group by ancestor. Pairing each node with itself is what makes a node's total include its own value as well as its descendants'.

**"What is the risk with that approach?"**
It is a transitive closure, so the result is roughly nodes times average depth, which can be very large on a deep hierarchy. At scale you materialise the closure into a table and maintain it, or store a path column such as `ltree`.

**"How do you guard against infinite loops?"**
A depth counter is the default, since it bounds the cost whatever the cause. Path-based cycle detection finds the actual cycle, and PostgreSQL 14 added `CYCLE ... SET ... USING` for it. `UNION` works as a side effect. SQL Server has `MAXRECURSION` defaulting to 100, and **PostgreSQL has no default limit at all**, so the guard is your responsibility.

**"How do you make it fast?"**
Index the column the recursive term joins on, usually `parent_id` or `manager_id`, so each round is index lookups rather than a scan per level. Also keep the anchor as selective as possible, since every row it produces becomes a starting point.

**"What cannot appear in the recursive term?"**
Aggregates and window functions, and the self-reference may appear only once and not on the null-producing side of an outer join. These are specification restrictions rather than engine limitations.

**"What else are recursive CTEs good for?"**
Bills of materials with quantities multiplied down the levels, graph reachability where cycle detection is mandatory, generating date or number series portably, and running computations where each row depends on the previous result in a way a window function cannot express.

**The common wrong answer** is writing the anchor and recursive term correctly and omitting the **guard**. The two things being tested are that execution is a **loop over the previous level's rows** rather than true recursion, and that a cycle in the data produces a query that **never terminates and is never warned about**, which in PostgreSQL will exhaust memory because there is no default limit.

---

### Say this in the interview

*"A recursive CTE has two parts joined by UNION ALL: an anchor, which is a non-recursive query producing the starting rows, and a recursive term, which references the CTE itself and produces the next level from the previous one. In PostgreSQL the RECURSIVE keyword goes on the WITH rather than the individual CTE, and covers every CTE in that clause.*

*Under the hood it evaluates the anchor and puts its rows in both the result and a working table. Then it repeats: evaluate the recursive term with the CTE reference resolving to the working table only, not everything accumulated so far; append the output to the result; and replace the working table with that output. It stops when an iteration produces zero rows. The consequence worth stating is that it is iteration rather than recursion: each step consumes only the previous level's rows, which is why the intermediate state stays small and the whole thing is tractable. It advances a frontier one level per round.*

*For an org tree, the anchor selects the director with a depth of one and a path, and the recursive term joins employees to the CTE on employee.manager_id equals cte.id, incrementing depth and appending to the path, with a depth guard. That join direction walks downward; reversing it to employee.id equals cte.manager_id walks upward and gives the chain of command above a person. And I would index the join column, because each iteration joins the working table to the employees table on manager_id, so an index turns each round into index lookups rather than a scan of the whole table per level.*

*For a cumulative roll-up there are two shapes. For a single root, descend from it and sum, which is straightforward. For every node at once, which is what rolling up a hierarchy usually means, the trick is to build ancestor-descendant pairs rather than a path: the anchor pairs every node with itself, the recursive term extends each pair to the children of the current descendant, and then you join to the values and group by ancestor. Pairing each node with itself is what makes a node's roll-up include its own budget as well as its descendants'; omitting it gives the total of everything below it, which is a different and sometimes intended figure. The caution is that this is a transitive closure and can be large, roughly nodes times average depth, so on a big hierarchy you would materialise it into a table and maintain it, or use a path column like ltree.*

*On guards, the danger is a record whose parent points at someone further down its own branch. Round after round you walk the loop, no round ever comes back empty, and the process does not fail, warn or stop; it allocates until memory is gone. I would reach first for a depth counter, carrying depth and adding a condition in the recursive term, because it is simple, always works and bounds the cost regardless of cause, with the caveat that a genuinely deep tree is silently truncated so you choose the limit generously. Then cycle detection by path, accumulating visited nodes in an array and excluding any already present, which finds the actual cycle rather than merely stopping, and PostgreSQL 14 added CYCLE SET USING syntax for exactly that. UNION instead of UNION ALL terminates cycles as a side effect of deduplication, but it costs a sort per iteration and masks the data problem. And on engine limits, SQL Server has MAXRECURSION defaulting to a hundred, while PostgreSQL has no default limit at all, so the guard is your responsibility rather than the engine's. Beyond cycles I would also put a LIMIT on the outer query and rely on a statement timeout.*

*Other uses worth mentioning: bills of materials, expanding a product into components with quantities multiplied down the levels; graph reachability, where cycle detection is mandatory rather than defensive; generating a date or number series portably where generate_series is unavailable; and running computations where each row depends on the previous result in a way a window function cannot express, such as an amortisation schedule."*
