---
id: 25-cte-vs-subquery
title: "Common Table Expressions (CTEs) vs. Subqueries"
description: "Compare Common Table Expressions (WITH clauses) and Subqueries, query readability, materialization fences, and execution performance."
sidebar_position: 25
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a Common Table Expression (CTE) in SQL, and how is it different from a subquery? Are CTEs materialized in memory or evaluated inline?"

A **Common Table Expression (CTE)** is a temporary, named result set defined within the execution scope of a single `SELECT`, `INSERT`, `UPDATE`, or `DELETE` statement using the `WITH` clause.

While CTEs and Subqueries often achieve identical results, they differ fundamentally in **readability**, **reusability**, and **optimization optimizer semantics**.

---

### Syntax Comparison

#### Subquery (Nested Inside the Query):
```sql
SELECT customer_name, total_spent
FROM (
    SELECT c.name AS customer_name, SUM(o.amount) AS total_spent
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    GROUP BY c.name
) AS customer_spending
WHERE total_spent > 1000;
```

#### CTE (Defined Cleanly Upfront):
```sql
WITH CustomerSpending AS (
    SELECT c.name AS customer_name, SUM(o.amount) AS total_spent
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    GROUP BY c.name
)
SELECT customer_name, total_spent
FROM CustomerSpending
WHERE total_spent > 1000;
```

---

### Key Differences

| Feature | Common Table Expression (CTE) | Subquery / Derived Table |
| :--- | :--- | :--- |
| **Readability** | High: Reads top-to-bottom like modular code | Low: Nested "inside-out" like Russian nesting dolls |
| **Reusability** | Can be referenced **multiple times** in the same query | Must copy-paste the entire subquery block to reuse |
| **Recursion** | **Yes** (supports `WITH RECURSIVE` for hierarchical trees) | **No** (subqueries cannot self-reference) |
| **Scope** | Available throughout the entire query block | Exists only within the enclosing parentheses |
| **Modularity** | Enables clean multi-step pipeline transformations | Becomes unmaintainable after 2-3 levels of nesting |

---

### The Performance Question: Are CTEs Materialized?

Engineers often ask: *"Does a CTE calculate and store its result set in memory as a physical temporary table, or does the optimizer inline it like a view?"*

The answer depends on your database engine and version:

#### 1. Modern PostgreSQL (PostgreSQL 12+) & MySQL 8.0:
- By default, modern query planners **inline** CTEs. The optimizer merges the CTE directly into the main query, pushing down predicates and indexes.
- In PostgreSQL 12+, you can explicitly control materialization:
  - `WITH data AS MATERIALIZED (...)`: Forces the engine to execute the CTE once, store it in memory/disk, and prevent predicate pushdown.
  - `WITH data AS NOT MATERIALIZED (...)`: Forces inlining.

#### 2. Older PostgreSQL (PostgreSQL 11 and earlier):
- CTEs acted as strict **Optimization Fences**. The engine *always* materialized the CTE, calculating the full result set upfront even if the outer query only needed 5 rows with a `WHERE` clause!

#### 3. SQL Server & Oracle:
- The optimizer treats non-recursive CTEs identically to inline views, optimizing them as part of the overall execution plan.

---

### The ELI5 Analogy: Cooking with Prep Bowls

- **Subquery (Cooking in Chaos):** You want to make an omelet. Inside the skillet while it's heating up, you try to crack an egg, chop an onion, grate cheese, and measure pepper all at the exact same second inside the pan. It's cluttered, messy, and hard to follow.
- **CTE (Mise en Place):** You chop the onions and put them in a small glass bowl labeled "Chopped Onions" (`WITH ChoppedOnions AS (...)`). You grate cheese into a bowl labeled "Cheese". Then, when cooking, you cleanly pour from each labeled bowl into the pan.

---

### Summary
"A CTE is a named temporary result set defined with WITH that improves SQL readability, enables code reusability within a query, and supports recursive traversals. Unlike older engines that treated CTEs as rigid optimization fences, modern optimizers inline CTEs into the overall execution plan by default."

---

### Crucial Nuance: When Materialization Fences Are Desirable
Sometimes you *want* an optimization fence! If a complex subquery is referenced 4 times in a single query (e.g., in multiple `UNION` branches), inlining it forces the engine to evaluate the expensive computation 4 separate times. By specifying `WITH data AS MATERIALIZED (...)` in PostgreSQL, the database evaluates the expensive query **once** into memory and reuses the cached result across all 4 branches.
