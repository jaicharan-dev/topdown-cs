---
id: 9-bcnf-vs-3nf
title: "Boyce-Codd Normal Form (BCNF) vs. 3NF"
description: "Understand Boyce-Codd Normal Form (BCNF), how it tightens 3NF, the prime attribute loophole, and the classic Student-Subject-Advisor example."
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is Boyce-Codd Normal Form (BCNF), and how is it different from 3NF? Give a concrete example of a schema that is in 3NF but violates BCNF."

**Boyce-Codd Normal Form (BCNF)**, sometimes colloquially referred to as "3.5NF", is a stricter, cleaner version of Third Normal Form (3NF). It was introduced to address edge-case anomalies that arise when a table contains **multiple overlapping candidate keys**.

---

### The Fundamental Rule Difference

For every non-trivial functional dependency X  o Y:

| Normal Form | Condition Required for X  o Y |
| :--- | :--- |
| **3NF** | `X` must be a **Superkey** <br/>**OR**<br/> `Y` must be a **Prime Attribute** (part of any candidate key) |
| **BCNF** | `X` must be a **Superkey** (No exceptions permitted!) |

Notice the loophole in 3NF: If `Y` happens to be part of *some* candidate key (a prime attribute), 3NF permits the dependency even if the determinant `X` is **not** a superkey! BCNF closes this loophole by deleting the second clause entirely.

---

### The Classic Example: Student, Subject, Advisor

Consider a university tutoring program with these rules:
1. A student can register for multiple subjects.
2. For each subject, a student is assigned exactly one advisor.
3. Each advisor advises on **only one** subject.
4. Multiple advisors can teach the same subject.

Table: `StudentAdvising`
Columns: `(StudentID, Subject, Advisor)`

#### Functional Dependencies:
- `(StudentID, Subject)`  ->  `Advisor` (Rule 1 & 2: A student-subject pair has one advisor)
- `Advisor`  ->  `Subject` (Rule 3: An advisor only advises on one specific subject)

#### Candidate Keys:
1. `(StudentID, Subject)`
2. `(StudentID, Advisor)` (Since `Advisor` determines `Subject`, `(StudentID, Advisor)` determines everything)

Both candidate keys are composite and overlap on `StudentID`.
Prime attributes: `StudentID`, `Subject`, `Advisor` (every attribute is prime!).

---

### Why It Passes 3NF
Look at the functional dependency `Advisor`  ->  `Subject`:
- Is `Advisor` a superkey? **No.** (An advisor has many students).
- Is `Subject` a prime attribute? **Yes**, because `Subject` is part of candidate key `(StudentID, Subject)`.

Because 3NF contains the condition *"OR `Y` is a prime attribute"*, this table is **officially in 3NF**!

---

### Why It Fails BCNF (and the Anomaly It Causes)
BCNF does not care if `Subject` is a prime attribute. It requires the determinant `Advisor` to be a superkey. Because `Advisor` is not a superkey, **the table violates BCNF**.

#### The Resulting Anomalies:
- **Update Anomaly:** If Advisor "Dr. Jones" switches from advising Physics to Biology, we must update every single student row assigned to Dr. Jones.
- **Insertion Anomaly:** We cannot hire a new advisor who specializes in Chemistry until at least one student signs up with them, because `StudentID` is part of the primary key and cannot be NULL.
- **Deletion Anomaly:** If the only student taking Physics with Dr. Smith drops out, we delete the row and lose the record that Dr. Smith advises Physics.

---

### The BCNF Decomposition

To achieve BCNF, decompose the table into two relations where the left side of every dependency is a superkey:

1. **`AdvisorSubject`**
   - Columns: `Advisor` (PK), `Subject`
   - Functional Dependency: `Advisor`  ->  `Subject` (Advisor is a superkey! Satisfies BCNF).

2. **`StudentAdvisor`**
   - Columns: `StudentID`, `Advisor`
   - Primary Key: `(StudentID, Advisor)`
   - Foreign Key: `Advisor` references `AdvisorSubject(Advisor)`
   - Satisfies BCNF.

---

### Summary
"BCNF is a stricter form of 3NF requiring that for every functional dependency X -> Y, X must be a superkey. 3NF allows X to not be a superkey as long as Y is a prime attribute, which can lead to modification anomalies when tables have overlapping candidate keys."

---

### Crucial Nuance: The BCNF vs. Dependency Preservation Dilemma
While every relation can be decomposed into 3NF while preserving all functional dependencies and remaining lossless, **BCNF does not always preserve functional dependencies**. 
In our decomposed tables above, the original constraint `(StudentID, Subject) -> Advisor` cannot be enforced by a simple database unique key without performing an expensive join across both tables! When faced with this choice, real-world systems often accept 3NF with a trigger or handle the constraint in the application layer.
