---
id: 5-sql-join-types
title: "SQL Join Types: INNER, LEFT, RIGHT, FULL, CROSS"
description: "Understand the mechanics of INNER, LEFT, RIGHT, FULL OUTER, and CROSS joins, set theory representations, and null extension."
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Explain the difference between INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN, and CROSS JOIN. What is 'null extension', and what happens when a join condition matches multiple rows?"

SQL Joins combine columns from one or more tables based on a related logical predicate between them. The choice of join determines which unmatched records are preserved or discarded.

---

### Visual Overview

```
INNER JOIN      LEFT JOIN       RIGHT JOIN      FULL OUTER JOIN     CROSS JOIN
  [ A ∩ B ]       [ A ]           [ B ]           [ A ∪ B ]         [ A × B ]
Matched only    All left +      All right +     All rows from       Cartesian
                matched right   matched left    both tables         Product
```

---

### 1. INNER JOIN (Intersection)
Returns only rows where the join predicate evaluates to `TRUE` in **both** tables. Non-matching rows from either side are discarded.

```sql
SELECT u.name, o.order_id
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```
*Result:* Users without orders and orders without valid users are omitted.

---

### 2. LEFT OUTER JOIN (Preserve Left Table)
Returns **all** rows from the left table, along with matching rows from the right table. If no match exists on the right, the right-side columns are filled with `NULL` (this behavior is called **Null Extension**).

```sql
SELECT u.name, o.order_id
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```
*Result:* Every user appears at least once. If Alice has placed zero orders, her `order_id` is returned as `NULL`.

---

### 3. RIGHT OUTER JOIN (Preserve Right Table)
The mirror opposite of `LEFT JOIN`. Returns all rows from the right table, and matching rows from the left table (filling left-side columns with `NULL` where unmatched).
*Production Best Practice:* Most engineering teams prefer using `LEFT JOIN` exclusively by flipping table positions, as reading left-to-right matches natural language flow.

---

### 4. FULL OUTER JOIN (Union of Both)
Combines the results of both `LEFT JOIN` and `RIGHT JOIN`. Returns all rows from both tables. When no match exists for a row on either side, the missing side is null-extended.

```sql
SELECT u.name, o.order_id
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;
```
*Note:* MySQL does not natively support `FULL OUTER JOIN`. It is simulated via a `LEFT JOIN` followed by `UNION` with a `RIGHT JOIN`.

---

### 5. CROSS JOIN (Cartesian Product)
Pairs **every single row** of the first table with **every single row** of the second table without evaluating any condition. If Table A has `N` rows and Table B has `M` rows, the result contains `N × M` rows.

```sql
-- Generate all shirt sizes and colors
SELECT s.size, c.color
FROM sizes s
CROSS JOIN colors c;
```

---

### The ELI5 Analogy: School Dance Partners

Imagine two lists: **Boys** and **Girls**.
- **INNER JOIN:** Only couples where a boy and girl have agreed to dance together. Solo students sit out.
- **LEFT JOIN:** Every single boy is guaranteed a spot on the dance floor. If a boy has no partner, he dances with a mannequin (`NULL`).
- **FULL OUTER JOIN:** Everyone gets onto the floor. Paired couples dance together; any leftover boys or girls without partners dance with mannequins (`NULL`).
- **CROSS JOIN:** Speed dating. Every boy is introduced to every single girl in the room, exploring all possible pairings.

---

### Summary
"INNER JOIN returns only matching rows from both tables; LEFT JOIN preserves all left-table rows, padding unmatched right columns with NULL; FULL OUTER JOIN preserves all rows from both sides; and CROSS JOIN produces the Cartesian product of both sets."

---

### Crucial Nuance: The Multiplying Row Trap
If the join column in the right table is not unique (a **One-to-Many** or **Many-to-Many** relationship), the join will **duplicate the left table's rows** for every match.
For example, if User 1 placed 3 separate orders, `users LEFT JOIN orders` returns 3 rows for User 1. If you run `SUM(u.account_balance)` across this join, the user's balance will be erroneously tripled! Always aggregate before joining or use window functions when calculating parent metrics across child joins.
