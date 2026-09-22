---
id: 24-employees-earning-more-than-manager
title: "SQL Self-Joins: Employees Earning More Than Managers"
description: "Solve the classic self-join interview question: find employees who earn more than their direct managers, with execution plan considerations."
sidebar_position: 24
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given an Employee table containing (id, name, salary, manager_id), write a query to find all employees who earn more than their direct manager. Explain the join mechanics and indexing strategy."

This problem is the quintessential introduction to **Self-Joins**—joining a table with itself to resolve hierarchical relationships.

---

### Table Schema

Table: `Employee`

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT (PK) | Employee ID |
| `name` | VARCHAR | Employee Name |
| `salary` | INT | Current annual salary |
| `manager_id`| INT (FK) | References `id` of another employee in the same table |

---

### Solution 1: Explicit `INNER JOIN` (The Production Standard)

We treat the single physical `Employee` table as two distinct logical tables: `emp` (representing the subordinate) and `mgr` (representing the manager):

```sql
SELECT 
    emp.name AS Employee,
    emp.salary AS EmpSalary,
    mgr.name AS Manager,
    mgr.salary AS MgrSalary
FROM Employee emp
INNER JOIN Employee mgr 
    ON emp.manager_id = mgr.id
WHERE emp.salary > mgr.salary;
```

#### How the Join Executes:
1. `FROM Employee emp`: Takes every subordinate row.
2. `INNER JOIN Employee mgr ON emp.manager_id = mgr.id`: Looks up the row corresponding to that subordinate's `manager_id` using the Primary Key on `mgr.id`.
3. If an employee has `manager_id = NULL` (e.g., the CEO), the `INNER JOIN` automatically discards them.
4. `WHERE emp.salary > mgr.salary`: Filters for subordinates whose salary strictly exceeds their manager's salary.

---

### Solution 2: Correlated Subquery

```sql
SELECT emp.name AS Employee
FROM Employee emp
WHERE emp.manager_id IS NOT NULL 
  AND emp.salary > (
      SELECT mgr.salary 
      FROM Employee mgr 
      WHERE mgr.id = emp.manager_id
  );
```
While functionally equivalent, the self-join in Solution 1 is vastly preferred by database optimizers because it can leverage Hash Joins or Merge Joins over large datasets rather than executing a subquery per row.

---

### Indexing Strategy for Production Scale

Suppose the `Employee` table grows to 5,000,000 rows across a global enterprise:
- `id` is already indexed as the Primary Key (Clustered Index).
- When the query joins `ON emp.manager_id = mgr.id`, the database scans `emp` and looks up `mgr.id` via index seek.
- **The Optimization:** Create a secondary index on `manager_id` or a composite covering index:

```sql
CREATE INDEX idx_emp_mgr_salary ON Employee (manager_id, salary);
```
This enables the database to filter out `manager_id IS NULL` immediately and retrieve salaries directly from the index.

---

### The ELI5 Analogy: Checking Name Badges

Imagine a company banquet where all 500 employees are standing in a single hall. Everyone wears a name badge displaying their own Name, their Salary, and the Name of their Boss:
1. You line up every employee along the left wall (`emp`).
2. Each employee walks across the room, finds their specific boss standing by the right wall (`mgr`), and stands next to them.
3. A referee walks down the pairs: If the subordinate on the left is holding a larger salary check than the boss on the right, the referee writes their name on the clipboard!

---

### Summary
"Finding employees who earn more than their managers requires a self-join linking the subordinate's manager_id to the manager's primary key id, filtered by emp.salary > mgr.salary. An INNER JOIN automatically filters out root employees (CEOs) with NULL manager IDs."

---

### Crucial Nuance: What If You Need the Entire Management Chain?
A simple self-join only compares an employee with their **immediate direct manager** (1 level up). If the interviewer follows up with: *"How would you find an employee who earns more than the Vice President three levels above them?"*, a self-join fails because the depth is variable. You must use a **Recursive CTE** to walk up the organizational tree.
