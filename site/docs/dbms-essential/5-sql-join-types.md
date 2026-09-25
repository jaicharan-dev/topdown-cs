---
id: 5-sql-join-types
title: "SQL Join Types: INNER, LEFT, RIGHT, FULL, CROSS"
description: "Understand SQL join mechanics, physical join algorithms, the Venn diagram fallacy, and the ON vs. WHERE predicate trap."
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Explain the difference between INNER, LEFT, RIGHT, FULL, and CROSS joins. What is the 'Venn diagram fallacy', why does filtering in WHERE vs. ON during a LEFT JOIN cause silent bugs, and what physical join algorithms does the engine use under the hood?"

### The Quick Answer

"SQL joins combine columns from two or more tables based on a related logical predicate:
* **`INNER JOIN`:** Returns only rows where the join predicate evaluates to `TRUE` in both tables.
* **`LEFT JOIN`:** Preserves all rows from the left table, padding unmatched right columns with `NULL` (**Null Extension**).
* **`RIGHT JOIN`:** Preserves all rows from the right table, padding unmatched left columns with `NULL`.
* **`FULL OUTER JOIN`:** Preserves all rows from both tables, null-extending missing sides.
* **`CROSS JOIN`:** Produces the Cartesian product ($N \times M$ combinations) without a predicate."

---

### The Interview Trap: The "Venn Diagram Fallacy"

Most online tutorials represent SQL joins using overlapping circles (Venn diagrams). In a technical interview, pointing out why this is flawed demonstrates deep mathematical clarity:

> **The Mathematical Fallacy:** Venn diagrams model **set membership** where elements are identical and duplicates cannot exist. SQL joins operate on **multisets (bags)** and combine *columns* from different relations. 
> If Table A has 3 rows with ID `1` and Table B has 2 rows with ID `1`, an `INNER JOIN` produces $3 \times 2 = 6$ output rows! A Venn diagram cannot accurately represent Cartesian row multiplicity.

---

### The Deadliest SQL Bug: Filtering in `ON` vs. `WHERE` (LEFT JOIN)

This is one of the most famous real-world debugging questions asked in backend and database interviews:

#### Query A: Filter inside the `ON` clause
```sql
SELECT u.name, o.order_id, o.status
FROM users u
LEFT JOIN orders o 
    ON u.id = o.user_id AND o.status = 'PAID';
```
* **Behavior:** The condition `o.status = 'PAID'` filters records in the `orders` table **during the join**.
* **Result:** Every single user is preserved. If Alice has no paid orders, she still appears in the output with `order_id = NULL` and `status = NULL`.

#### Query B: Filter inside the `WHERE` clause
```sql
SELECT u.name, o.order_id, o.status
FROM users u
LEFT JOIN orders o 
    ON u.id = o.user_id
WHERE o.status = 'PAID';
```
* **Behavior:** The `WHERE` clause runs **after** the join has completed.
* **The Silent Bug:** For users who have no orders, `o.status` is `NULL`. In SQL three-valued logic, `NULL = 'PAID'` evaluates to **`UNKNOWN`** (falsy). 
* **The Result:** The `WHERE` clause **silently converts your `LEFT JOIN` into an `INNER JOIN`**, discarding all users with zero orders!

---

### Under the Hood: Physical Join Algorithms

When you write `JOIN`, the query optimizer chooses between three primary physical execution operators:

```
┌───────────────────────┬───────────────────────────────────┬───────────────────────────────────────┐
│     Join Operator     │          When It Is Used          │            Time Complexity            │
├───────────────────────┼───────────────────────────────────┼───────────────────────────────────────┤
│ **Nested Loop Join**  │ Small outer table + indexed inner │ $O(M \log N)$                         │
│ **Hash Join**         │ Large unsorted tables (equi-join) │ $O(M + N)$ (Builds hash table in RAM) │
│ **Sort-Merge Join**   │ Large tables already sorted by key│ $O(M + N)$ (Single linear merge pass) │
└───────────────────────┴───────────────────────────────────┴───────────────────────────────────────┘
```

1. **Nested Loop Join:** For each row in the outer table, it seeks matching keys in the inner table. Optimal when the inner table's join key is indexed with a B+ tree.
2. **Hash Join:** Reads the smaller table into an in-memory hash table (Build Phase), then streams the larger table against it (Probe Phase). The primary workhorse of modern analytics.
3. **Sort-Merge Join:** Sorts both relations on the join key (if not already sorted by clustered indexes) and walks both pointers forward simultaneously.

---

### Crucial Nuance: The Multiplying Row Trap

If the join key in the right table is not unique (a **One-to-Many** relationship), the join **duplicates the left table's rows** for every match.

If User 1 has placed 3 orders, `users LEFT JOIN orders` outputs 3 rows for User 1. If you run `SUM(u.account_balance)` across this join, User 1's balance is **erroneously tripled**! Always aggregate the child table before joining, or calculate parent metrics using window functions.
