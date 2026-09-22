---
id: 23-rank-vs-dense-rank-vs-row-number
title: "RANK() vs. DENSE_RANK() vs. ROW_NUMBER()"
description: "Compare SQL window ranking functions (ROW_NUMBER, RANK, DENSE_RANK), gap behavior on ties, and practical query patterns."
sidebar_position: 23
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between ROW_NUMBER(), RANK(), and DENSE_RANK() in SQL? How does each function handle duplicate values (ties)?"

SQL provides three foundational **Window Ranking Functions** to assign ordinal rankings to rows within a partition: `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()`. 

The fundamental difference lies entirely in **how they handle ties (identical values)** and **whether they produce gaps in the ranking sequence**.

---

### The Difference in Action

Suppose we run all three functions over an `employees` table partitioned by department and sorted by salary:

```sql
SELECT 
    name, 
    salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
    RANK()       OVER (ORDER BY salary DESC) AS rnk,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM employees;
```

#### Resulting Output:

| Name | Salary | `ROW_NUMBER()` | `RANK()` | `DENSE_RANK()` | Explanation |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Alice** | \$100,000 | **1** | **1** | **1** | Unique highest salary |
| **Bob** | \$80,000 | **2** | **2** | **2** | Tied for 2nd place |
| **Charlie** | \$80,000 | **3** | **2** | **2** | Tied for 2nd place |
| **David** | \$70,000 | **4** | **4** | **3** | Notice RANK jumps to 4; DENSE_RANK advances to 3! |
| **Emma** | \$60,000 | **5** | **5** | **4** | Continuous sequence |

---

### Technical Breakdown

#### 1. `ROW_NUMBER()` (Strictly Sequential, No Ties Allowed)
- Assigns a unique, strictly increasing integer (1, 2, 3, 4, 5, ...) to every row.
- **Handling of Ties:** Ignores ties completely. If Bob and Charlie both earn \$80,000, one gets assigned `2` and the other gets `3` nondeterministically (unless a tie-breaker column is added to `ORDER BY`).
- **Primary Use Case:** Keyset pagination or picking an arbitrary single winner from duplicate groups (e.g., deduplicating event logs via `WHERE row_num = 1`).

#### 2. `RANK()` (Ties Share Rank, Leaves Gaps)
- Assigns the same rank to identical values.
- **Handling of Ties:** When ties occur, **it leaves gaps in the subsequent ranking numbers**. 
- In the table above, because two people share rank `2`, the next person is ranked `4` (1 + 2 + 1). Rank `3` is skipped entirely.
- **Primary Use Case:** Official Olympic-style sporting competitions (e.g., two competitors win Silver, so no Bronze medal is awarded; the next finisher gets 4th place).

#### 3. `DENSE_RANK()` (Ties Share Rank, NO Gaps)
- Assigns the same rank to identical values.
- **Handling of Ties:** **Leaves zero gaps** in the sequence. The ranking numbers are "dense" (1, 2, 2, 3, 4).
- Because rank numbers never skip, the N-th distinct value is guaranteed to have rank `N`.
- **Primary Use Case:** Financial calculations, top-N leaderboard categories, and finding the N-th highest/lowest metric (e.g., 2nd highest salary).

---

### The ELI5 Analogy: The School Math Contest

Five students take a math test:
- Alice gets 100%.
- Bob and Charlie get 90%.
- David gets 80%.

How do we announce the prizes?
- **`ROW_NUMBER()` (The Unfair Arbitrator):** *"Alice is 1st. Bob is 2nd. Charlie, you got the same score as Bob, but I like Bob better, so you are 3rd. David is 4th."*
- **`RANK()` (The Olympic Judge):** *"Alice is 1st. Bob and Charlie are both tied for 2nd. Since two people took 2nd place, there is NO 3rd place! David, you are in 4th place."*
- **`DENSE_RANK()` (The Generous Teacher):** *"Alice gets the Gold trophy (1st). Bob and Charlie both get Silver trophies (2nd). David, you get the Bronze trophy (3rd)!"*

---

### Summary
"`ROW_NUMBER()` assigns sequential integers ignoring ties; `RANK()` gives tied values the same rank but leaves gaps equal to the tie count; `DENSE_RANK()` gives tied values the same rank without leaving any gaps in the ranking sequence."

---

### Crucial Nuance: Non-Deterministic `ROW_NUMBER()`
If you use `ROW_NUMBER() OVER (ORDER BY salary DESC)` on rows with duplicate salaries without providing a secondary deterministic tie-breaker column (e.g., `ORDER BY salary DESC, employee_id ASC`), the database is free to assign `2` to Bob and `3` to Charlie on query run 1, and swap them on query run 2! Always include unique columns in your window `ORDER BY` if deterministic row numbering is required.
