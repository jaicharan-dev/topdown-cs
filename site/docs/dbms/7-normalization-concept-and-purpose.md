---
id: 7-normalization-concept-and-purpose
title: "Normalization: Concept, Purpose & Anomalies"
description: "Understand database normalization, why we organize relational schemas into normal forms, and the three destructive anomalies it eliminates."
sidebar_position: 7
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is database normalization, and why do we do it? What are insertion, update, and deletion anomalies?"

Database **normalization** is the systematic process of organizing relational database schemas to minimize data redundancy and prevent data modification anomalies, while preserving data integrity and functional dependencies.

It involves decomposing large, monolithic tables into smaller, well-structured tables linked by foreign keys.

---

### The Three Modification Anomalies

To understand why we normalize, look at what happens in an unnormalized table:

#### The Unnormalized Nightmare: `CourseRegistrations`

| StudentID | StudentName | CourseID | CourseName | InstructorName |
| :--- | :--- | :--- | :--- | :--- |
| S101 | Alice | CS101 | Computer Science | Dr. Smith |
| S102 | Bob | CS101 | Computer Science | Dr. Smith |
| S103 | Charlie | CS202 | Algorithms | Dr. Jones |

---

#### 1. Update Anomaly (Data Inconsistency)
- **The Problem:** Dr. Smith gets married and changes their name, or is replaced by Dr. Adams for `CS101`. 
- **The Consequence:** You must update every single row where `CS101` appears. If the table has 50,000 enrolled students and your script fails after updating 20,000 rows, the database enters a corrupt state where `CS101` has two conflicting instructors.

#### 2. Insertion Anomaly (Cannot Record Independent Facts)
- **The Problem:** The department creates a brand-new course: `CS303 (Artificial Intelligence)`, taught by Dr. Turing. But no students have registered for it yet.
- **The Consequence:** Because the primary key of this combined table requires `StudentID`, you cannot insert the new course without inventing a fake dummy student (`StudentID = NULL` is illegal in primary keys). You are prevented from storing valid facts about a course because no student has enrolled.

#### 3. Deletion Anomaly (Unintended Loss of Data)
- **The Problem:** Charlie (`S103`) drops out of university. You delete Charlie's row from the table.
- **The Consequence:** Because Charlie was the *only* student enrolled in `CS202 (Algorithms)`, deleting Charlie also completely erases the record that `CS202` exists and that Dr. Jones teaches it!

---

### The Normalized Solution
By decomposing into three distinct entities (`Students`, `Courses`, and `Enrollments`), each entity tracks its own lifecycle:
1. `Courses (course_id PK, course_name, instructor_name)`
2. `Students (student_id PK, student_name)`
3. `Enrollments (student_id FK, course_id FK)`

- Inserting a new course requires no students.
- Updating an instructor requires updating exactly **one row** in `Courses`.
- Deleting an enrollment does not delete the course blueprint.

---

### The ELI5 Analogy: Sticky Notes vs. Address Book

Imagine writing down your friend's phone number on the back of every single receipt you get from grocery stores, coffee shops, and restaurants.
- If your friend changes their number, you have to find thousands of receipts to update them all (**Update Anomaly**).
- If you haven't bought groceries this week, you can't record their new number (**Insertion Anomaly**).
- If you throw away your old coffee receipt, you accidentally throw away their phone number forever (**Deletion Anomaly**).

Instead, you write their phone number in one place: your **Contacts App** (Normalized). On the receipts, you just write their name.

---

### Summary
"Normalization eliminates data redundancy and prevents insertion, update, and deletion anomalies by decomposing monolithic tables into focused entity tables linked by foreign keys, ensuring every non-key attribute depends entirely on the primary key."

---

### Crucial Nuance: The Normalization Trade-Off
Normalization optimizes for **write performance and data integrity** (fewer locks, no redundant updates, minimal storage). However, it introduces **read overhead** because querying information across decomposed entities requires multi-table `JOIN` operations. In high-throughput read-heavy architectures, engineers frequently introduce controlled **denormalization** to avoid expensive joins at scale.
