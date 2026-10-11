---
id: 5-sql-join-types
title: "SQL Join Types: INNER, LEFT, RIGHT, FULL, CROSS"
description: "How each SQL join actually behaves, why Venn diagrams are misleading, the ON vs. WHERE trap, and how the engine executes joins physically."
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Explain the difference between INNER, LEFT, RIGHT, FULL, and CROSS joins. What is the 'Venn diagram fallacy', why does filtering in WHERE vs. ON during a LEFT JOIN cause silent bugs, and what physical join algorithms does the engine use under the hood?"

A join combines two tables based on a matching column. The five types only differ in what happens to rows that *don't* have a match on the other side.

<Diagram>
<Row>
<Box title="INNER" accent="#60a5fa">
<Field icon="🤝" code="only matched rows" variant="neutral" />
</Box>
<Box title="LEFT" accent="#34d399">
<Field icon="⬅️" code="all of left + matches" hint="unmatched right = NULL" variant="neutral" />
</Box>
<Box title="RIGHT" accent="#f59e0b">
<Field icon="➡️" code="all of right + matches" hint="unmatched left = NULL" variant="neutral" />
</Box>
<Box title="FULL" accent="#818cf8">
<Field icon="🔗" code="everything, both sides" hint="unmatched side = NULL" variant="neutral" />
</Box>
<Box title="CROSS" accent="#ec4899">
<Field icon="✖️" code="every row × every row" hint="no matching condition" variant="neutral" />
</Box>
</Row>
</Diagram>

- **`INNER JOIN`** — keeps a row only if it matches on both sides.
- **`LEFT JOIN`** — keeps every row from the left table. If there's no match on the right, those columns come back `NULL`.
- **`RIGHT JOIN`** — the mirror image: keeps every row from the right table.
- **`FULL OUTER JOIN`** — keeps every row from both tables, `NULL`-filling whichever side didn't match.
- **`CROSS JOIN`** — no matching condition at all; every row from one table pairs with every row from the other.

---

### Why the Venn diagram you've seen is misleading

Most tutorials draw joins as two overlapping circles. That's a decent *first* intuition, but it quietly assumes something false: that rows behave like unique set elements. SQL tables are **multisets** — they can have duplicate values in the join column.

If table A has 3 rows with `id = 1` and table B has 2 rows with `id = 1`, an `INNER JOIN` on `id` doesn't give you 1 overlapping row — it gives you `3 × 2 = 6` rows. A Venn diagram can't show that kind of multiplication. Mentioning this in an interview is a good way to show you understand joins beyond the diagram.

---

### The bug that silently turns your LEFT JOIN into an INNER JOIN

This is one of the most common real SQL bugs, and it's worth knowing cold.

**Filter inside `ON`** — the filter applies *during* the join, so unmatched rows still survive:

```sql
SELECT u.name, o.order_id, o.status
FROM users u
LEFT JOIN orders o 
    ON u.id = o.user_id AND o.status = 'PAID';
```

Every user shows up here, even ones with zero paid orders (with `order_id` and `status` as `NULL`).

**Filter inside `WHERE`** — the filter runs *after* the join is already done:

```sql
SELECT u.name, o.order_id, o.status
FROM users u
LEFT JOIN orders o 
    ON u.id = o.user_id
WHERE o.status = 'PAID';
```

Here's the trap: for a user with no orders, `o.status` is `NULL`, and `NULL = 'PAID'` doesn't evaluate to false — it evaluates to **unknown**, which `WHERE` treats as "exclude this row." So every user with zero orders silently disappears, and your `LEFT JOIN` behaves exactly like an `INNER JOIN` — with no error, no warning.

**Rule of thumb:** when working with a `LEFT JOIN`, filters on the *right-hand table* belong in `ON`, not `WHERE`, unless you genuinely want to discard unmatched rows.

---

### How the engine actually runs a join

When you write `JOIN`, the query optimizer picks one of three physical strategies — this isn't something you control directly, but it's a common follow-up question:

| Algorithm | Used when | Rough cost |
|---|---|---|
| **Nested Loop Join** | one table is small, the other has an index on the join key | fast per lookup, scales with rows × index lookups |
| **Hash Join** | both tables are large and unsorted | builds a hash table from the smaller table, then streams the larger one through it |
| **Sort-Merge Join** | both tables are already sorted by the join key | sorts if needed, then walks both in lockstep |

- **Nested Loop**: for each row in the outer table, look up a match in the inner table's index.
- **Hash Join**: load the smaller table into an in-memory hash table, then stream the bigger table against it. The default workhorse for most analytical joins.
- **Sort-Merge**: sort both sides by the join key, then merge them like zipping two sorted lists together.

---

### The trap that quietly triples your totals

If the right table isn't unique on the join key (a one-to-many relationship), the join duplicates the left row once per match. If user 1 placed 3 orders, `users LEFT JOIN orders` gives you 3 rows for user 1 — and `SUM(u.account_balance)` over that result triples their balance.

**Fix:** aggregate the child table before joining, or use a window function instead of joining and summing directly.

---

### Say this in the interview

*"INNER keeps only matches, LEFT keeps everything from the left table and NULL-fills the rest, RIGHT is the mirror of that, and FULL keeps everything from both sides. The trap to watch for: filtering a LEFT JOIN's right-side columns in WHERE instead of ON silently turns it into an INNER JOIN."*
