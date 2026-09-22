---
id: 22-second-highest-salary-without-limit
title: "Second Highest Salary Without LIMIT or OFFSET"
description: "Solve the classic SQL interview problem: find the second highest salary without using LIMIT or OFFSET, handling duplicates and NULLs."
sidebar_position: 22
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Write a SQL query to find the second highest salary from an Employee table without using LIMIT or OFFSET. How do you handle ties, duplicates, and cases where only one employee exists?"

Finding the N-th highest salary is one of the most common SQL interview challenges. While `ORDER BY salary DESC LIMIT 1 OFFSET 1` works in some dialects, interviewers intentionally disallow `LIMIT` and `OFFSET` to evaluate your proficiency with subqueries, aggregate functions, and window functions.

---

### Solution 1: Using Correlated Subquery and `MAX()` (Standard ANSI SQL)

The cleanest, most portable standard SQL solution uses the `MAX()` aggregate function:

```sql
SELECT MAX(salary) AS SecondHighestSalary
FROM Employee
WHERE salary < (
    SELECT MAX(salary) 
    FROM Employee
);
```

#### Why This Solution Is Excellent in Interviews:
1. **Handles Ties Gracefully:** If three employees share the top salary of \100,000, `MAX(salary)` in the subquery returns \100,000. The outer query filters for `salary < 100000`, ensuring the true distinct second highest salary is picked.
2. **Handles Missing Data (Returns NULL):** If the table contains only 1 employee (or 0 employees), the subquery finds the max, but the outer query finds zero rows satisfying `salary < MAX`. Because `MAX()` over an empty set evaluates to `NULL`, this query safely returns `NULL` without throwing an error, satisfying LeetCode/interview specifications.

---

### Solution 2: Using Window Functions (`DENSE_RANK()`)

In modern SQL (PostgreSQL, MySQL 8.0+, SQL Server, Oracle), the industry-standard approach uses window ranking functions:

```sql
WITH RankedSalaries AS (
    SELECT 
        salary, 
        DENSE_RANK() OVER (ORDER BY salary DESC) AS rank_num
    FROM Employee
)
SELECT MAX(salary) AS SecondHighestSalary
FROM RankedSalaries
WHERE rank_num = 2;
```

#### Why `DENSE_RANK()` and Not `ROW_NUMBER()`?
- If the two highest salaries are tied:
  - `ROW_NUMBER()` assigns `1` and `2` to the identical top salaries. Slicing on `rank_num = 2` would return the *same* highest salary!
  - `RANK()` assigns `1` to both top salaries, and skips to `3` for the next salary! Slicing on `rank_num = 2` returns an empty set.
  - `DENSE_RANK()` assigns `1` to both top salaries, and assigns `2` to the next distinct value.

*Note:* Wrapping the final `SELECT` in `MAX(salary)` ensures that if no second salary exists, the query returns `NULL` rather than an empty row set.

---

### Solution 3: Finding the N-th Highest Salary (Generalized)

To find the N-th highest salary for any arbitrary `N` without window functions:

```sql
SELECT e1.salary
FROM Employee e1
WHERE (N - 1) = (
    SELECT COUNT(DISTINCT e2.salary)
    FROM Employee e2
    WHERE e2.salary > e1.salary
);
```
For `N = 2`, this query finds the salary `e1` where exactly **1 distinct salary** is greater than it.

---

### The ELI5 Analogy: The Track Meet Podium

Imagine a race where the winner runs in 10 seconds. You want to know the Silver Medal time without using a photo-finish camera:
- First, you find the fastest runner: 10 seconds (`SELECT MAX(time)`).
- Then, you ask: *"Out of everyone who ran slower than 10 seconds, who was the fastest?"* (`SELECT MAX(time) WHERE time < 10`).
- The answer is your Silver Medalist!

---

### Summary
"To find the second highest salary without LIMIT/OFFSET, use `SELECT MAX(salary) WHERE salary < (SELECT MAX(salary))` or `DENSE_RANK() OVER (ORDER BY salary DESC)` inside a CTE. Using MAX() ensures graceful NULL return if fewer than two distinct salaries exist, and DENSE_RANK() correctly handles duplicate salary ties."

---

### Crucial Nuance: Performance on Large Tables
While `SELECT MAX(salary) WHERE salary < (SELECT MAX(salary))` requires two index seeks on an indexed `salary` column (`O(\log N)`), the correlated subquery method `COUNT(DISTINCT e2.salary) > e1.salary` runs in `O(N^2)` time on unindexed tables. For production databases with millions of rows, either leverage an index on `salary` or use `DENSE_RANK()`.
