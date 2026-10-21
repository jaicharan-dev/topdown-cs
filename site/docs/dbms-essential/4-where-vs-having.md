---
id: 4-where-vs-having
title: "WHERE vs. HAVING: Row Filtering vs. Group Filtering"
description: "The real difference between WHERE and HAVING, why aggregates can't go in WHERE, and the performance trap of misplacing filters."
sidebar_position: 4
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between WHERE and HAVING in SQL? Why can't aggregate functions be used in a WHERE clause, and what is the severe performance penalty of placing non-aggregate filters in HAVING?"

Think about a teacher grading papers from 10 classrooms. First, she throws out any paper where the student cheated — one paper at a time, before any math happens. That's `WHERE`. Then she groups the remaining papers by classroom and averages each stack. Only after that does she decide which classrooms did well enough to get a pizza party. That's `HAVING` — it filters groups, not individual papers, and it only makes sense once the groups already exist.

That's the whole difference: **`WHERE` filters rows before grouping. `HAVING` filters groups after grouping.**

---

### Where each one sits in the pipeline

<Diagram>
<Row>
<Box label="FROM / JOIN" sub="get the rows" />
<Arrow />
<Box label="WHERE" sub="filter rows" />
<Arrow />
<Box label="GROUP BY" sub="bucket rows" />
<Arrow />
<Box label="HAVING" sub="filter groups" />
</Row>
</Diagram>

This is exactly why `WHERE SUM(salary) > 50000` throws an error. At step 2, grouping hasn't happened yet, so there's no "group" for `SUM` to add up. The aggregate simply doesn't exist yet at that point in the pipeline.

---

### Side by side

| Feature | `WHERE` | `HAVING` |
|---|---|---|
| **Works on** | individual raw rows | already-grouped rows |
| **Runs** | before `GROUP BY` | after `GROUP BY` |
| **Aggregate functions allowed?** | No (`WHERE COUNT(*) > 1` errors) | Yes (`HAVING SUM(amount) > 1000`) |
| **Can use an index?** | Yes | No — it's filtering values already computed in memory |
| **Best for** | shrinking the dataset early | rejecting groups that fail a business rule |

---

### The performance trap

This query works, but it's slow:

```sql
-- BAD: filters department_id too late
SELECT department_id, AVG(salary)
FROM employees
GROUP BY department_id
HAVING department_id = 10 AND AVG(salary) > 80000;
```

Putting `department_id = 10` in `HAVING` means the engine groups and averages *all* 50 departments first, then throws away 49 of them. All that work for nothing. Move the non-aggregate condition into `WHERE` so it filters before the grouping even starts:

```sql
-- GOOD: filters immediately, using the index
SELECT department_id, AVG(salary)
FROM employees
WHERE department_id = 10
GROUP BY department_id
HAVING AVG(salary) > 80000;
```

**Rule of thumb:** if a condition doesn't involve an aggregate, it belongs in `WHERE`, not `HAVING` — even if it would technically work in either place.

---

### Can you use HAVING without GROUP BY?

Yes. With no `GROUP BY`, the whole table is treated as one single group:

```sql
SELECT AVG(salary)
FROM employees
HAVING COUNT(*) > 10;
```

If the table has 10 or fewer rows, you get zero rows back. Otherwise you get one row: the overall average.

---

### Say this in the interview

*"WHERE filters individual rows before grouping and can use an index. HAVING filters already-grouped rows after GROUP BY, which is why it's the only place you can use an aggregate like SUM or COUNT in a filter condition."*
