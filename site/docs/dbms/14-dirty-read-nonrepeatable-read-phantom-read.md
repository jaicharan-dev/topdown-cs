---
id: 14-dirty-read-nonrepeatable-read-phantom-read
title: "Dirty Read vs. Non-Repeatable Read vs. Phantom Read"
description: "Concrete timeline breakdown comparing Dirty Reads, Non-Repeatable Reads, and Phantom Reads with transaction interleaving examples."
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the exact technical difference between a dirty read, a non-repeatable read, and a phantom read? Walk me through a concurrent timeline for each anomaly."

Concurrency anomalies occur when multiple transactions execute concurrently without adequate isolation controls. The three primary read anomalies defined by ANSI SQL are **Dirty Read**, **Non-Repeatable Read**, and **Phantom Read**.

---

### 1. Dirty Read (Reading Uncommitted Garbage)

A Dirty Read happens when Transaction A reads an intermediate value written by Transaction B, but Transaction B subsequently **aborts and rolls back**.

```
Timeline of a Dirty Read:

Time | Transaction A (Attacker/Reader)    | Transaction B (Writer)
-----+------------------------------------+-------------------------------------
T1   |                                    | BEGIN;
T2   |                                    | UPDATE accounts SET balance = 5000 
     |                                    | WHERE id = 1; (Old balance: \$100)
T3   | BEGIN;                             |
T4   | SELECT balance FROM accounts       | 
     | WHERE id = 1;                      |
     | --> Reads \$5000! (Dirty Read)      |
T5   | Sends \$5000 loan to user...        |
T6   |                                    | ROLLBACK; (System crash / error)
     |                                    | (Balance reverts to \$100 on disk!)
T7   | COMMIT;                            |
```
*Impact:* Transaction A made a critical real-world decision based on a \$5000 balance that never officially existed in the database.

---

### 2. Non-Repeatable Read (Fuzzy Read)

A Non-Repeatable Read occurs when a transaction re-reads the **exact same row** within its execution boundary and discovers that the values have been **modified or deleted** by a concurrent transaction that successfully committed.

```
Timeline of a Non-Repeatable Read:

Time | Transaction A (Auditor)            | Transaction B (Salary Manager)
-----+------------------------------------+-------------------------------------
T1   | BEGIN;                             | 
T2   | SELECT salary FROM employees       | 
     | WHERE id = 42;                     |
     | --> Returns: \$80,000               | 
T3   |                                    | BEGIN;
T4   |                                    | UPDATE employees SET salary = 95000 
     |                                    | WHERE id = 42;
T5   |                                    | COMMIT; (Changes permanently saved)
T6   | SELECT salary FROM employees       | 
     | WHERE id = 42;                     | 
     | --> Returns: \$95,000!              |
     | (Same query, different data!)      |
T7   | COMMIT;                            | 
```
*Impact:* Transaction A generates an inconsistent report because the row changed identity halfway through its audit.

---

### 3. Phantom Read (Range Mutation)

A Phantom Read occurs when a transaction queries a **set of rows matching a search condition (predicate range)**, and upon re-executing the query, finds **new rows inserted** (or existing rows deleted) by another committed transaction.

```
Timeline of a Phantom Read:

Time | Transaction A (Bonus Evaluator)    | Transaction B (HR Onboarding)
-----+------------------------------------+-------------------------------------
T1   | BEGIN;                             | 
T2   | SELECT COUNT(*) FROM employees     | 
     | WHERE dept = 'Sales';              | 
     | --> Returns: 10 employees          | 
T3   |                                    | BEGIN;
T4   |                                    | INSERT INTO employees (name, dept) 
     |                                    | VALUES ('David', 'Sales');
T5   |                                    | COMMIT; (New record persisted)
T6   | SELECT COUNT(*) FROM employees     | 
     | WHERE dept = 'Sales';              | 
     | --> Returns: 11 employees!         | 
     | (A "phantom" employee appeared!)   |
T7   | COMMIT;                            | 
```

---

### The Fundamental Difference: Non-Repeatable Read vs. Phantom Read

Candidates frequently confuse these two:

| Anomaly | Target Scope | Action Causing Anomaly | Protection Mechanism |
| :--- | :--- | :--- | :--- |
| **Non-Repeatable Read** | A **single existing row** | `UPDATE` or `DELETE` on that specific row | **Row Locks** or MVCC Transaction Snapshots |
| **Phantom Read** | A **range / predicate** of rows | `INSERT` (or `DELETE`) of new rows matching the filter | **Gap / Next-Key Locks** or Predicate Locking |

- A Non-Repeatable Read alters the **content of an existing row** you already fetched.
- A Phantom Read alters the **cardinality (number of rows)** satisfying a range query by inserting brand-new records into index gaps.

---

### Summary
"A dirty read reads uncommitted data that may roll back; a non-repeatable read sees modified or deleted values on an existing row caused by a committed concurrent update; a phantom read sees newly inserted rows matching a range query caused by a committed concurrent insert."

---

### Crucial Nuance: Snapshot Isolation and Write Skew
While `Repeatable Read` via MVCC prevents dirty, non-repeatable, and phantom reads in modern systems like PostgreSQL, it does **not** prevent an elusive anomaly called **Write Skew**.
Suppose a hospital requires at least 1 doctor on call. Doctors Alice and Bob are currently on call. Both simultaneously attempt to take leave. Alice's transaction checks `COUNT(*) WHERE on_call = TRUE` (sees 2), and sets herself to `inactive`. Bob's transaction concurrently checks `COUNT(*)` (sees 2), and sets himself to `inactive`. Both commit successfully under Repeatable Read, leaving **zero doctors on call**! Only true **Serializable** isolation or explicit locking (`SELECT ... FOR UPDATE`) prevents write skew.
