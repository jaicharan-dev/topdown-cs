---
id: 24-employees-earning-more-than-manager
title: "Employees Earning More Than Their Manager"
description: "A self-join read two ways, a comparison no index can help with, and the covering index that removes the real cost"

sidebar_position: 24
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given an Employee table containing `(id, name, salary, manager_id)`, write a query to find all employees who earn more than their direct manager. How does the query optimizer execute this self-join physically, what index should you create, and how would you extend it?"

---

### Picture it

One list of staff. Each line has a person's salary and, next to it, **the staff number of their boss**, who is also on the same list.

So answering "who earns more than their boss" means reading the list **twice at once**: once as the people being asked about, and once as the bosses being looked up. Same sheet of paper, two different roles, and you have to be clear which role each line is playing at any moment.

**The work is a lookup per person.** Take a line, read the boss's number, go and find that boss's line, compare the two salaries. Repeat.

**How you do the lookup is the whole performance question.** If the list is sorted by staff number, finding each boss is a quick search. If it is not, finding each boss means reading the list again, from the top, for **every person**, which is hopeless. The alternative for a large list is to make **one pass** building a small reference card of "staff number to salary" for everyone, and then make a second pass comparing against the card.

**And here is the thing you cannot optimise away.** Being sorted by **salary** would not help at all, because the comparison is not "whose salary is above some figure", it is "whose salary is above **this other person's** salary". The threshold is **different for every line**, and it is not known until the pairing has already been made. No arrangement of the list can pre-answer that; the comparison can only happen **after** the two lines have been brought together.

**And one group is correctly absent.** The person at the top has no boss, so the question does not apply to them. Pairing them with nobody produces nothing, which is the right answer rather than an oversight.

---

### The proper terms

#### The query

```sql
SELECT e.name
FROM   employees e
JOIN   employees m ON m.id = e.manager_id
WHERE  e.salary > m.salary;
```

The only unusual thing about it is that **the same table appears twice**, which is a **self-join**. The aliases `e` and `m` are not decoration; they are what makes the two roles distinguishable, and without them the query would be ambiguous and would not compile.

Two correctness points worth stating unprompted:

**The `INNER JOIN` correctly excludes employees with no manager.** A row whose `manager_id` is `NULL`, typically the chief executive, finds no partner and is dropped. That is the right answer, since an employee with no manager cannot earn more than one. If the requirement were different you would need a `LEFT JOIN` and an explicit decision about what `NULL` means.

**The comparison must survive duplicates sensibly.** Because `m.id` is the primary key, each employee matches **exactly one** manager row, so the join cannot multiply rows. If the join were on something non-unique, the result would be inflated.

#### How the optimiser executes it

A self-join is **not a special kind of join**. The planner treats the two aliases as **two independent row sources** that happen to read the same table, and chooses a physical algorithm exactly as it would for two different tables.

**Index nested loop**, the usual plan on a moderate table. Scan `employees` as the **outer** source, and for each row perform a **primary key lookup** on `manager_id` to fetch the manager. Cost is roughly `O(n log n)`: one index descent per row. This is what you get when the table is large and the result is selective, and it benefits enormously from the covering index below.

**Hash join**, the usual plan on a large table or when most rows will be examined anyway. Build a **hash table on the smaller input**, which here is the set of **managers**, since there are far fewer distinct managers than employees, keyed by `id` and carrying `salary`. Then **probe** it with each employee's `manager_id`. Cost is `O(n + m)`, with one pass over the table to build and one to probe. PostgreSQL will often choose this and show the same table scanned twice, or once with the buffer cache serving the second read.

**Merge join** is possible if both inputs arrive sorted on the join key, for instance from two index scans, but it is rarely chosen here because a hash join is cheaper when one side is small.

The point to emphasise, because it is the part people miss:

**`e.salary > m.salary` can never be an access predicate.** It compares **two columns from opposite sides of the join**, so neither value is known until a pair has been formed. It can only be applied **after** the join produces a candidate row, as a **filter**. No index on `salary` can help with it, and suggesting one is the classic wrong answer to the index half of this question.

#### What index to create

Start from what the query actually needs, which is: for a given `manager_id`, fetch that manager's `salary`.

**The primary key on `id` already exists**, and the index nested loop uses it. So the question is not "what index enables this" but "what removes the remaining cost".

The remaining cost is the **heap fetch**: the index finds the manager's row location, and the engine must then read the table page to get `salary`. On a large table, that is **one random page read per employee**, and it dominates.

**So the useful index is a covering one:**

```sql
-- PostgreSQL / SQL Server
CREATE INDEX idx_emp_id_salary ON employees (id) INCLUDE (salary);
```

Now the manager lookup is satisfied entirely from the index, as an **index-only scan**, with no table access at all.

Two engine-specific notes that are worth knowing:

**In MySQL InnoDB this is already true.** The table **is** a clustered index on the primary key, so looking up by `id` lands directly on the full row, `salary` included. There is no separate heap fetch to remove, so no extra index is needed for the manager side.

**In PostgreSQL the heap fetch is real**, because the table is a heap and every index entry stores a `CTID` rather than the row. The `INCLUDE` index removes it, provided the **visibility map** marks the pages all-visible, which means the table must be reasonably well vacuumed.

If the query instead needed to go the other direction, listing a manager's reports, the index would be `(manager_id) INCLUDE (salary)`, which is a different and equally common requirement.

#### Extending it

The natural follow-ups, and the shape of each answer:

**Return the manager too.** Trivial: add `m.name AS manager_name` to the select list. The join already has the row.

**Compare against a skip-level manager**, or the whole chain. This needs a **recursive CTE**, because the number of levels is not known in advance and SQL cannot express "join n times" for a variable n.

**Find everyone who earns more than anyone above them**, which is the hierarchical version, and is the recursive CTE walking upward accumulating the maximum salary seen.

**Handle a self-managing row**, where `manager_id = id`, which would compare a row with itself and can never satisfy a strict `>`. Harmless here, and worth excluding explicitly if the data permits it, because it would cause infinite recursion in the recursive version.

**Correlated subquery form.** Semantically identical and usually rewritten by the optimiser into the same join, so it is a style choice rather than a performance one:

```sql
SELECT e.name FROM employees e
WHERE  e.salary > (SELECT m.salary FROM employees m WHERE m.id = e.manager_id);
```

Note that this form returns no row when the subquery yields `NULL`, which reproduces the `INNER JOIN`'s exclusion of managerless employees by a different route.

---

### In code

```sql
-- THE QUERY. The only unusual thing is that the same table appears
-- twice, which is a SELF-JOIN.
SELECT e.name, e.salary, m.name AS manager, m.salary AS manager_salary
FROM   employees e
JOIN   employees m ON m.id = e.manager_id
WHERE  e.salary > m.salary;

-- the aliases are not decoration: they are what makes the two roles
-- distinguishable, and without them the query is ambiguous and does
-- not compile.
```

```text
Two correctness points worth stating unprompted:

  THE INNER JOIN CORRECTLY EXCLUDES managerless employees.
     a row whose manager_id is NULL (typically the CEO) finds no
     partner and is dropped.
     that is the RIGHT answer: an employee with no manager cannot
     earn more than one.
     a different requirement would need a LEFT JOIN and an explicit
     decision about what NULL means.

  THE JOIN CANNOT MULTIPLY ROWS.
     m.id is the PRIMARY KEY, so each employee matches EXACTLY ONE
     manager row. Joining on something non-unique would inflate
     the result.
```

```text
HOW THE OPTIMISER EXECUTES IT

  a self-join is NOT a special kind of join. The planner treats the
  two aliases as TWO INDEPENDENT ROW SOURCES that happen to read the
  same table, and picks an algorithm exactly as for two tables.

  INDEX NESTED LOOP        (moderate table, selective result)
     scan employees as the OUTER source
     for each row, a PRIMARY KEY LOOKUP on manager_id
     cost ~ O(n log n): one index descent per row

     Nested Loop
       -> Seq Scan on employees e
       -> Index Scan using employees_pkey on employees m
            Index Cond: (m.id = e.manager_id)
            Filter: (e.salary > m.salary)

  HASH JOIN                (large table, most rows examined anyway)
     BUILD a hash table on the SMALLER input, which here is the set
     of MANAGERS, since there are far fewer distinct managers than
     employees, keyed by id and carrying salary
     PROBE it with each employee's manager_id
     cost ~ O(n + m): one pass to build, one to probe

     Hash Join  (Cond: e.manager_id = m.id)
       -> Seq Scan on employees e
       -> Hash
            -> Seq Scan on employees m        <- the SAME table
                                                 scanned twice

  MERGE JOIN is possible if both inputs arrive sorted on the join
  key, but is rarely chosen here because a hash join is cheaper when
  one side is small.
```

```text
THE PART PEOPLE MISS:

  e.salary > m.salary CAN NEVER BE AN ACCESS PREDICATE.

  it compares TWO COLUMNS FROM OPPOSITE SIDES OF THE JOIN, so
  neither value is known until a PAIR HAS BEEN FORMED.
  It can only be applied AFTER the join produces a candidate row,
  as a FILTER.

     WHERE e.salary > 100000     an ACCESS predicate: one fixed
                                 threshold, seekable in an index

     WHERE e.salary > m.salary   a FILTER: the threshold is
                                 DIFFERENT FOR EVERY ROW, and not
                                 known until the pairing exists

  so NO INDEX ON salary CAN HELP WITH IT, and proposing one is the
  classic wrong answer to the index half of this question.
```

```sql
-- WHAT INDEX TO CREATE
-- start from what the query needs: for a given manager_id, fetch
-- that manager's salary.

-- the PRIMARY KEY on id ALREADY EXISTS, and the nested loop uses it.
-- so the question is not "what enables this" but "what removes the
-- remaining cost".

-- the remaining cost is the HEAP FETCH: the index finds the
-- manager's row LOCATION, and the engine must then read the table
-- page to get salary. On a large table that is ONE RANDOM PAGE READ
-- PER EMPLOYEE, and it dominates.

-- PostgreSQL / SQL Server: a COVERING index removes it
CREATE INDEX idx_emp_id_salary ON employees (id) INCLUDE (salary);
--   the manager lookup is now satisfied ENTIRELY FROM THE INDEX,
--   as an INDEX-ONLY SCAN, with no table access at all.

-- and if the query went the OTHER direction (a manager's reports):
CREATE INDEX idx_emp_mgr_salary ON employees (manager_id) INCLUDE (salary);
```

```text
Two engine-specific notes:

  MYSQL INNODB: this is ALREADY TRUE.
     the table IS a clustered index on the primary key, so a lookup
     by id lands directly on the FULL ROW, salary included.
     there is no separate heap fetch to remove, so no extra index is
     needed for the manager side.

  POSTGRESQL: the heap fetch is REAL.
     the table is a HEAP and every index entry stores a CTID rather
     than the row, so the engine must visit the table page.
     the INCLUDE index removes it, PROVIDED the VISIBILITY MAP marks
     the pages all-visible, which means the table must be reasonably
     well vacuumed.
     -> this is why VACUUM affects read performance and not just
        space.
```

```sql
-- EXTENDING IT

-- 1. return the manager too: trivial, the join already has the row
SELECT e.name, m.name AS manager FROM employees e
JOIN   employees m ON m.id = e.manager_id
WHERE  e.salary > m.salary;

-- 2. compare against ANY manager up the chain -> a RECURSIVE CTE,
--    because the number of levels is not known in advance and SQL
--    cannot express "join n times" for a variable n
WITH RECURSIVE chain AS (
    SELECT id AS employee_id, salary AS employee_salary,
           manager_id, 1 AS depth
    FROM   employees
    WHERE  manager_id IS NOT NULL

    UNION ALL

    SELECT c.employee_id, c.employee_salary, m.manager_id, c.depth + 1
    FROM   chain c
    JOIN   employees m ON m.id = c.manager_id
    WHERE  m.manager_id IS NOT NULL
      AND  c.depth < 20                 -- a GUARD: a cycle in the
)                                       -- data would loop for ever
SELECT DISTINCT e.name
FROM   chain c
JOIN   employees e  ON e.id = c.employee_id
JOIN   employees mg ON mg.id = c.manager_id
WHERE  c.employee_salary > mg.salary;

-- 3. a SELF-MANAGING row (manager_id = id) compares a row with
--    itself and can never satisfy a strict >, so it is harmless
--    here. Worth excluding explicitly if the data permits it,
--    because it would cause INFINITE RECURSION in the version above.
```

```sql
-- THE CORRELATED SUBQUERY FORM: semantically identical, and usually
-- rewritten by the optimiser into the same join, so it is a STYLE
-- choice rather than a performance one
SELECT e.name
FROM   employees e
WHERE  e.salary > (SELECT m.salary FROM employees m
                   WHERE m.id = e.manager_id);

-- note it returns no row when the subquery yields NULL, which
-- reproduces the INNER JOIN's exclusion of managerless employees
-- by a different route.
```

---

### What they ask next

**"Why does the same table appear twice?"**
Because the relationship is within one table: each row names another row of the same table as its manager. The aliases give the two roles distinct names, and without them the column references would be ambiguous.

**"How does the optimiser treat a self-join?"**
Exactly like any other join. The two aliases are independent row sources that happen to read the same table, and the planner picks nested loop, hash or merge on the usual cost grounds. The only difference is that the same relation may be scanned twice, often with the buffer cache serving the second read.

**"Which plan do you expect?"**
An index nested loop on a moderate table, using the primary key for the manager lookup, or a hash join on a large one, building on the managers because there are far fewer distinct managers than employees. The planner decides from cardinality estimates.

**"What index helps?"**
Not one on `salary`. The primary key already serves the lookup, so what helps is a **covering** index such as `(id) INCLUDE (salary)` in PostgreSQL, which turns the manager lookup into an index-only scan and removes a random heap fetch per employee. In InnoDB the clustered index already includes the row, so nothing extra is needed.

**"Why can no index help with `e.salary > m.salary`?"**
Because it compares two columns from opposite sides of the join, so neither is known until a pair exists. It is a filter applied after the join forms a candidate row, not an access predicate that could narrow a scan.

**"What happens to the CEO?"**
They are excluded, correctly. With a `NULL` `manager_id` the inner join finds no partner and the row is dropped, which is right because an employee with no manager cannot earn more than one.

**"How would you compare against a skip-level manager?"**
With a recursive CTE walking up the chain, because the depth is not known in advance and SQL cannot express a variable number of joins. It also needs a depth guard, since a cycle in the data would otherwise recurse for ever.

**"Is the correlated subquery version slower?"**
Usually not. Optimisers routinely rewrite it into the same join, so it is a readability choice. It does differ in one respect: it returns no row when the subquery yields `NULL`, which reproduces the inner join's exclusion by a different mechanism.

**The common wrong answer** is writing the join correctly and then proposing an index on `salary`. The comparison is **between two rows**, so no index can answer it; the join key is what indexes serve. The valuable content is that the planner treats the self-join as an ordinary join, that `e.salary > m.salary` is necessarily a **filter**, and that the index worth adding is a **covering** one that removes the heap fetch on the manager lookup.

---

### Say this in the interview

*"The query is a self-join: select the employee's name from employees e joined to employees m on m.id equals e.manager_id, where e.salary is greater than m.salary. The only unusual thing is that the same table appears twice, and the aliases are what make the two roles distinguishable; without them the column references are ambiguous and it does not compile.*

*Two correctness points I would state unprompted. The inner join correctly excludes employees with no manager, so a row with a NULL manager_id, typically the chief executive, finds no partner and is dropped, which is right because an employee with no manager cannot earn more than one. And because m.id is the primary key, each employee matches exactly one manager row, so the join cannot multiply rows.*

*On execution, a self-join is not a special kind of join. The planner treats the two aliases as two independent row sources that happen to read the same table, and picks a physical algorithm exactly as it would for two different tables. On a moderate table with a selective result you typically get an index nested loop: scan employees as the outer source and do a primary key lookup on manager_id for each row, which is about n log n, one index descent per row. On a large table, or when most rows will be examined anyway, you get a hash join: build a hash table on the smaller input, which here is the managers since there are far fewer distinct managers than employees, keyed by id and carrying salary, then probe it with each employee's manager_id, which is linear with one pass to build and one to probe. A merge join is possible if both inputs arrive sorted on the join key but is rarely chosen, because hashing is cheaper when one side is small.*

*The part people miss is that e.salary greater than m.salary can never be an access predicate. It compares two columns from opposite sides of the join, so neither value is known until a pair has been formed, which means it can only be applied after the join produces a candidate row, as a filter. A predicate like salary greater than a hundred thousand is seekable because there is one fixed threshold, whereas here the threshold is different for every row. So no index on salary can help with it, and proposing one is the classic wrong answer.*

*For the index, I would start from what the query actually needs, which is: for a given manager_id, fetch that manager's salary. The primary key on id already exists and the nested loop uses it, so the question is what removes the remaining cost, and that is the heap fetch: the index finds the manager's row location and the engine must then read the table page to get salary, which on a large table is one random page read per employee and dominates. So the useful index is a covering one, in PostgreSQL an index on id INCLUDE salary, which turns the manager lookup into an index-only scan with no table access at all. Two engine notes: in MySQL InnoDB this is already true, because the table is a clustered index on the primary key so a lookup by id lands on the full row including salary, with no separate heap fetch to remove. In PostgreSQL the heap fetch is real, because the table is a heap and index entries store a CTID, and the INCLUDE index removes it provided the visibility map marks the pages all-visible, which means the table must be reasonably well vacuumed.*

*To extend it: returning the manager's name is trivial, since the join already has the row. Comparing against a skip-level manager or the whole chain needs a recursive CTE, because the number of levels is not known in advance and SQL cannot express a variable number of joins, and it needs a depth guard, since a cycle in the data would otherwise recurse for ever. A self-managing row, where manager_id equals id, compares a row with itself and can never satisfy a strict greater-than, so it is harmless here but worth excluding explicitly because it would cause infinite recursion in the recursive version. And the correlated subquery form is semantically identical and usually rewritten by the optimiser into the same join, so it is a style choice, though it differs in returning no row when the subquery yields NULL, which reproduces the inner join's exclusion by a different route."*
