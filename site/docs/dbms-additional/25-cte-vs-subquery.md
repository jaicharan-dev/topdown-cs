---
id: 25-cte-vs-subquery
title: "CTEs vs Subqueries"
description: "A named step rather than a nested one, whether the engine computes it once or folds it away, and the snapshot every writable CTE shares"

sidebar_position: 25
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a Common Table Expression (CTE) in SQL, and how does it differ from a subquery? Are CTEs materialized in memory or evaluated inline, when should you deliberately force materialization, and what are writable CTEs?"

---

### Picture it

A long calculation written two ways.

**Nested**, it reads inside out: `total = round(sum(filter(convert(raw))))`. Everything is there, and to understand any part of it you must find the innermost bracket and work outward. Need the converted figure twice and you write the whole conversion twice.

**Named**, it reads top down: convert the raw figures and **call that `converted`**; filter `converted` and **call that `eligible`**; sum `eligible`. Each step has a name, each step can be read on its own, and `converted` can be used as many times as you like by name.

The second is not a different calculation. **It is the same calculation with labels on the intermediate values.**

**And now the question that actually matters.** When you write `converted` down and use it twice, does the clerk **work it out once and keep the paper**, or does he **re-derive it each time he sees the name**?

Both are defensible. Working it out once saves effort when it is expensive and used repeatedly. Re-deriving it lets him **notice something you did not**: if the final step only wants figures over a thousand, he can apply that condition **while converting**, instead of converting everything and throwing most of it away.

For years one particular clerk **always** kept the paper, which meant he could never apply the later condition early, and people discovered that giving a step a name made the whole calculation slower. He now re-derives by default, and keeps the paper only when the name is used more than once.

**And there is one case where it is not a preference but a correctness matter.** If the step is "roll a die", then working it out once gives you **the same number everywhere the name appears**, and re-deriving gives you **a different number each time**. Those are different answers to different questions, and you must be able to say which you meant.

---

### The proper terms

#### What a CTE is

A **common table expression** is a **named temporary result set**, defined in a `WITH` clause and referenced by name in the statement that follows.

```sql
WITH converted AS (
    SELECT id, amount * rate AS usd FROM payments
)
SELECT SUM(usd) FROM converted WHERE usd > 1000;
```

It exists only for the duration of that **single statement**.

#### How it differs from a subquery

Four differences, and only two of them are about capability.

**Readability.** A CTE names the intermediate result and reads **top down**, turning deep nesting into a **sequence of named steps**. This is the reason most CTEs exist, and it is not a small reason: a three-level nested subquery is genuinely hard to review.

**Reuse.** A CTE may be **referenced several times** in the same statement. An inline subquery would have to be **written out again**, and the engine may then evaluate it twice.

**Recursion.** Only a CTE can be **recursive**. A subquery cannot refer to itself, so hierarchy traversal and graph walking are possible only with `WITH RECURSIVE`.

**Chaining.** Later CTEs in the same `WITH` clause may reference **earlier** ones, which is what makes the step-by-step style work.

Everything else is equivalent: anywhere a derived table in `FROM` would work, a CTE works, and most engines produce the same plan for both.

#### Materialised or inlined

The honest answer is **"it depends on the engine and version, and in PostgreSQL it depends on how many times you reference it"**, which is a far better answer than yes or no.

**PostgreSQL before 12** treated every CTE as an **optimisation fence**. It was **always materialised** into a temporary result, and the planner could not push predicates into it, reorder joins across it, or use an index inside it based on an outer condition.

That produced a famous trap: **wrapping a working query in a CTE could make it dramatically slower**, because an outer `WHERE` that would have been pushed down into an index scan was now applied **after** the whole intermediate result had been built.

**PostgreSQL 12 and later** inline a CTE by default when all three hold:

**It is referenced exactly once.**

**It is not recursive.**

**It is free of side effects**, meaning no data-modifying statement and no volatile function.

Otherwise it is materialised. And both behaviours can be forced explicitly with `AS MATERIALIZED` and `AS NOT MATERIALIZED`.

**Other engines generally inline.** SQL Server, Oracle and MySQL 8 treat a CTE much like an inline view definition and fold it into the outer query, with Oracle offering `/*+ MATERIALIZE */` and `/*+ INLINE */` hints to override.

#### When to force materialisation

Four cases, and the second is a correctness matter rather than a performance one.

**The CTE is expensive and referenced several times.** Compute it once rather than once per reference. This is the ordinary case, and in PostgreSQL 12+ multiple references already trigger materialisation automatically.

**The CTE contains a volatile function and you need a stable result.** If a CTE calls `random()`, `now()` in some forms, or `nextval()`, then **inlining evaluates it separately per reference**, so two references see **different values**. Materialising computes it once and every reference sees the same rows. This is not an optimisation; it changes the answer.

**You want to fence the optimiser deliberately.** When the planner's estimate is badly wrong and it is choosing a disastrous plan, materialising forces the intermediate result to be built first, which can be a pragmatic fix while the underlying estimate problem is investigated.

**The CTE reduces a huge table to a few rows.** Aggregating ten million rows down to twenty, then joining, is sometimes much better than letting the planner inline the aggregation and reconsider the whole shape.

And the reverse, **`NOT MATERIALIZED`**, is for when the fence is the problem: the CTE exists only for readability and the planner would do better pushing the outer predicates inside it.

#### Writable CTEs

PostgreSQL permits **data-modifying statements** inside a `WITH` clause: `INSERT`, `UPDATE` and `DELETE`, each with a `RETURNING` clause whose rows the rest of the statement can use.

The canonical uses:

**Moving rows between tables atomically**, deleting from one and inserting into another in a single statement, so there is no window in which the row exists in neither or both.

**Writing an audit record from the same statement that performs the change**, using `RETURNING` to capture exactly what changed.

**Multi-table updates driven by one computation.**

And now the semantics that matter, which is what the question is really after:

**Every sub-statement sees the same snapshot**, taken at the **start of the statement**. They do **not** see each other's changes. So a `DELETE` in a CTE and a `SELECT` from the same table in the main query will see the rows as they were before the delete, which is surprising the first time and is the thing to say out loud.

**Execution order is not guaranteed.** The sub-statements run concurrently as far as the engine is concerned, and the only ordering you can rely on is a **data dependency** established by consuming another CTE's `RETURNING` output.

**Each row is affected at most once.** Two sub-statements updating the same row produce an undefined result, and PostgreSQL does not attempt to serialise them.

The practical rule: **use a writable CTE to make several changes atomic and to capture what changed, not to express a sequence of steps that depend on one another's effects.** For that, use separate statements in a transaction.

---

### In code

```sql
-- NESTED: reads inside out, and the conversion is written twice
SELECT SUM(usd)
FROM (SELECT id, amount * rate AS usd FROM payments) t
WHERE usd > 1000
   OR id IN (SELECT id FROM (SELECT id, amount * rate AS usd
                             FROM payments) t2 WHERE usd < 0);

-- NAMED: reads top down, and `converted` is defined once
WITH converted AS (
    SELECT id, amount * rate AS usd FROM payments
),
eligible AS (
    SELECT * FROM converted WHERE usd > 1000
)
SELECT SUM(usd) FROM eligible;

-- same calculation, with LABELS ON THE INTERMEDIATE VALUES.
-- and note that `eligible` references `converted`: later CTEs in the
-- same WITH clause may reference earlier ones, which is what makes
-- the step-by-step style work.
```

```text
The four differences, and only two are about CAPABILITY:

  READABILITY   a CTE names the intermediate result and reads TOP
                DOWN, turning deep nesting into a SEQUENCE OF NAMED
                STEPS. Most CTEs exist for this reason, and it is
                not a small one.

  REUSE         a CTE may be REFERENCED SEVERAL TIMES in one
                statement. An inline subquery must be written out
                again, and may then be evaluated twice.

  RECURSION     only a CTE can be RECURSIVE. A subquery cannot refer
                to itself, so hierarchy and graph traversal are
                possible ONLY with WITH RECURSIVE.          <- real

  CHAINING      later CTEs may reference earlier ones.

  everything else is equivalent: anywhere a derived table in FROM
  would work, a CTE works, and most engines produce the same plan.
```

```text
MATERIALISED OR INLINED: "it depends, and in Postgres it depends on
the reference count" is a far better answer than yes or no.

  POSTGRESQL BEFORE 12
     every CTE was an OPTIMISATION FENCE: ALWAYS MATERIALISED into a
     temporary result, with no predicate pushdown, no join
     reordering across it, and no index use inside it driven by an
     outer condition.

     the famous trap:
        WRAPPING A WORKING QUERY IN A CTE COULD MAKE IT DRAMATICALLY
        SLOWER, because an outer WHERE that would have become an
        index scan was now applied AFTER the whole intermediate
        result had been built.

  POSTGRESQL 12 AND LATER
     INLINED BY DEFAULT when ALL THREE hold:
        1. referenced EXACTLY ONCE
        2. NOT recursive
        3. FREE OF SIDE EFFECTS (no data modification, no volatile
           function)
     otherwise MATERIALISED.
     and both can be forced explicitly.

  OTHER ENGINES generally INLINE: SQL Server, Oracle and MySQL 8
  treat a CTE much like an inline view definition and fold it into
  the outer query. Oracle offers /*+ MATERIALIZE */ and
  /*+ INLINE */ hints.
```

```sql
-- Forcing either behaviour, PostgreSQL 12+
WITH expensive AS MATERIALIZED (
    SELECT customer_id, SUM(amount) AS total
    FROM   orders GROUP BY customer_id
)
SELECT * FROM expensive e1 JOIN expensive e2 ON ...;
--   computed ONCE, used twice

WITH readable AS NOT MATERIALIZED (
    SELECT * FROM orders WHERE status = 'open'
)
SELECT * FROM readable WHERE customer_id = 42;
--   INLINED, so customer_id = 42 can be PUSHED INTO the scan and
--   use an index. Without NOT MATERIALIZED on an older Postgres,
--   this would build every open order first.
```

```sql
-- THE CASE THAT IS ABOUT CORRECTNESS, NOT PERFORMANCE
WITH sample AS (
    SELECT id FROM users ORDER BY random() LIMIT 10
)
SELECT (SELECT COUNT(*) FROM sample) AS a,
       (SELECT COUNT(*) FROM sample) AS b,
       (SELECT MIN(id)  FROM sample) AS c;

-- INLINED: random() is VOLATILE, so each reference re-evaluates the
--          CTE and gets A DIFFERENT SAMPLE. a, b and c describe
--          three different sets of users.
-- MATERIALIZED: computed once, so all three describe THE SAME ten
--          users.
--
-- these are DIFFERENT ANSWERS TO DIFFERENT QUESTIONS, and you must
-- be able to say which you meant. The same applies to nextval()
-- and to now() in some forms.
```

```text
When to force MATERIALIZED:

  1. EXPENSIVE AND REFERENCED SEVERAL TIMES
why:   compute once instead of once per reference
       (in Postgres 12+ multiple references already trigger this)

  2. A VOLATILE FUNCTION AND YOU NEED A STABLE RESULT
why:   inlining evaluates it SEPARATELY PER REFERENCE, so two
       references see DIFFERENT VALUES.
       THIS IS NOT AN OPTIMISATION, IT CHANGES THE ANSWER.

  3. YOU WANT TO FENCE THE OPTIMISER DELIBERATELY
why:   when the planner's estimate is badly wrong and it is choosing
       a disastrous plan, forcing the intermediate result to be
       built first is a pragmatic fix while the estimate problem is
       investigated

  4. THE CTE REDUCES A HUGE TABLE TO A FEW ROWS
why:   aggregating ten million rows to twenty and then joining is
       sometimes far better than letting the planner inline the
       aggregation and reconsider the whole shape

And NOT MATERIALIZED is for the reverse: the CTE exists only for
readability and the fence is preventing predicate pushdown.
```

```sql
-- WRITABLE CTEs: data-modifying statements inside WITH

-- move rows between tables ATOMICALLY, in ONE statement, with no
-- window in which the row exists in neither or both
WITH moved AS (
    DELETE FROM active_orders
    WHERE  completed_at IS NOT NULL
    RETURNING *
)
INSERT INTO archived_orders SELECT * FROM moved;

-- capture exactly what changed, and audit it from the same statement
WITH updated AS (
    UPDATE accounts SET balance = balance - 100
    WHERE  id = 42
    RETURNING id, balance
)
INSERT INTO audit_log (account_id, new_balance, at)
SELECT id, balance, now() FROM updated;
```

```text
THE SEMANTICS THAT MATTER, and the thing to say out loud:

  EVERY SUB-STATEMENT SEES THE SAME SNAPSHOT, taken at the START of
  the statement. THEY DO NOT SEE EACH OTHER'S CHANGES.

     WITH deleted AS (DELETE FROM t WHERE x = 1 RETURNING *)
     SELECT COUNT(*) FROM t;
     -- the COUNT sees the rows AS THEY WERE BEFORE THE DELETE,
     -- including the ones being deleted.
     -- surprising the first time, and entirely consistent.

  EXECUTION ORDER IS NOT GUARANTEED.
     the sub-statements run concurrently as far as the engine is
     concerned. The ONLY ordering you can rely on is a DATA
     DEPENDENCY established by consuming another CTE's RETURNING
     output.

  EACH ROW IS AFFECTED AT MOST ONCE.
     two sub-statements updating the same row give an undefined
     result, and PostgreSQL does not attempt to serialise them.

  THE PRACTICAL RULE:
     use a writable CTE to make several changes ATOMIC and to
     CAPTURE WHAT CHANGED.
     do NOT use it to express a SEQUENCE OF STEPS that depend on one
     another's effects. For that, use separate statements in a
     transaction.
```

---

### What they ask next

**"Is a CTE faster than a subquery?"**
Neither, inherently. Most engines inline both and produce the same plan. The differences that matter are readability, the ability to reference a result several times, and recursion, which only a CTE supports.

**"Are CTEs materialised?"**
It depends on the engine and version. PostgreSQL before 12 always materialised them, which made them an optimisation fence; from 12 it inlines a CTE referenced exactly once that is non-recursive and side-effect free, and materialises otherwise. SQL Server, Oracle and MySQL 8 generally inline.

**"What was the old PostgreSQL CTE trap?"**
That a CTE was always an optimisation fence, so an outer `WHERE` could not be pushed into it. Wrapping a working query in a CTE for readability could turn an index scan into a full build of the intermediate result, making it dramatically slower.

**"When does materialisation change the answer rather than the speed?"**
When the CTE contains a volatile function such as `random()` or `nextval()`. Inlined, each reference re-evaluates and sees different rows; materialised, every reference sees the same rows. Those are different results, so it is a correctness decision.

**"What is a writable CTE for?"**
Making several modifications atomic in one statement, and capturing what changed through `RETURNING`. Moving rows between tables, and auditing an update from the same statement that performs it, are the two canonical uses.

**"What do writable CTEs not see?"**
Each other's changes. All sub-statements share one snapshot taken at the start of the statement, so a `SELECT` in the main query sees rows a `DELETE` in a CTE is removing. Execution order between them is also unspecified except through `RETURNING` data dependencies.

**"When should you not use a writable CTE?"**
When the steps genuinely depend on each other's effects, because the shared snapshot means they cannot observe one another. Separate statements inside a transaction give you both the ordering and the atomicity.

**"Does a CTE always need `RECURSIVE` for recursion?"**
Yes, and in PostgreSQL the keyword goes on the `WITH` rather than on the individual CTE, so one `WITH RECURSIVE` covers all of them even if only one is actually recursive.

**The common wrong answer** is "a CTE is a temporary table, so it is materialised, which makes it slower" or the opposite blanket claim. The real answer is that **behaviour is engine- and version-specific**, that PostgreSQL 12 changed it to depend on the **reference count**, and that materialisation is occasionally a correctness decision rather than a performance one when volatile functions are involved.

---

### Say this in the interview

*"A common table expression is a named temporary result set defined in a WITH clause and referenced by name in the statement that follows, existing only for that single statement.*

*It differs from a subquery in four ways, and only two are about capability. Readability: it names the intermediate result and reads top down, turning deep nesting into a sequence of named steps, which is why most CTEs exist. Reuse: it can be referenced several times in one statement, where an inline subquery would have to be written out again and might then be evaluated twice. Recursion: only a CTE can be recursive, because a subquery cannot refer to itself, so hierarchy traversal is possible only with WITH RECURSIVE. And chaining: later CTEs can reference earlier ones, which is what makes the step-by-step style work. Everything else is equivalent, and most engines produce the same plan for a CTE and a derived table.*

*On materialisation, the honest answer is that it depends on the engine and version, and in PostgreSQL on how many times you reference it. Before version 12, PostgreSQL treated every CTE as an optimisation fence: always materialised, with no predicate pushdown, no join reordering across it and no index use inside it driven by an outer condition. That produced a famous trap, where wrapping a working query in a CTE for readability made it dramatically slower, because an outer WHERE that would have become an index scan was now applied after the whole intermediate result had been built. From version 12 it inlines by default when three things hold: the CTE is referenced exactly once, it is not recursive, and it is free of side effects, meaning no data modification and no volatile function. Otherwise it materialises, and both can be forced with AS MATERIALIZED or AS NOT MATERIALIZED. SQL Server, Oracle and MySQL 8 generally inline, with Oracle offering hints either way.*

*I would force materialisation in four cases. When the CTE is expensive and referenced several times, to compute it once. When it contains a volatile function and I need a stable result, which is the important one, because inlining evaluates it separately per reference so two references see different values, meaning it changes the answer rather than the speed. When I want to fence the optimiser deliberately, because its estimate is badly wrong and it is choosing a disastrous plan. And when the CTE reduces a huge table to a few rows, where aggregating first and then joining can be much better than letting the planner inline and reconsider the whole shape. The reverse, NOT MATERIALIZED, is for when the fence is the problem and the CTE exists only for readability.*

*Writable CTEs are PostgreSQL's data-modifying statements inside WITH: INSERT, UPDATE and DELETE, each with a RETURNING clause whose rows the rest of the statement can use. The canonical uses are moving rows between tables atomically in one statement, with no window in which the row exists in neither or both, and writing an audit record from the same statement that makes the change.*

*The semantics that matter are these. Every sub-statement sees the same snapshot, taken at the start of the statement, and they do not see each other's changes, so a SELECT in the main query sees rows that a DELETE in a CTE is removing. Execution order is not guaranteed, and the only ordering you can rely on is a data dependency established by consuming another CTE's RETURNING output. And each row is affected at most once, so two sub-statements updating the same row give an undefined result. The practical rule is to use a writable CTE to make several changes atomic and to capture what changed, and not to express a sequence of steps that depend on one another's effects, which needs separate statements in a transaction."*
