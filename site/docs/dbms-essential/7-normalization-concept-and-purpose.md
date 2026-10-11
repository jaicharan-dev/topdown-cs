---
id: 7-normalization-concept-and-purpose
title: "Normalization: Concept, Purpose & Anomalies"
description: "Why database normalization exists, the three anomalies it prevents, and the two rules a valid decomposition has to satisfy."
sidebar_position: 7
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is database normalization, and why do we do it? What are insertion, update, and deletion anomalies, and what mathematical guarantees must a valid decomposition satisfy?"

Imagine writing your friend's phone number on the back of every grocery receipt you keep, instead of saving it once in your contacts app. Normalization is the database version of switching from "scribbled on every receipt" to "saved once, referenced everywhere." It's the process of splitting one messy table into smaller, focused tables so that each fact lives in exactly one place.

---

### The problem: one big table, three ways it breaks

Here's a table that mixes students, courses, and instructors together:

| StudentID | StudentName | CourseID | CourseName | InstructorName |
| :--- | :--- | :--- | :--- | :--- |
| S101 | Alice | CS101 | Computer Science | Dr. Smith |
| S102 | Bob | CS101 | Computer Science | Dr. Smith |
| S103 | Charlie | CS202 | Algorithms | Dr. Jones |

**Update anomaly.** Dr. Smith is replaced by Dr. Adams on `CS101`. Every row with `CS101` needs updating individually. On a table with 100,000 students, if that update script dies halfway through, `CS101` now shows two different instructors — and the data is just wrong until someone notices.

**Insertion anomaly.** The department creates a new course, `CS303`, but no student has enrolled yet. Since `StudentID` is part of the primary key and keys can't be `NULL`, you can't add the course without inventing a fake student. A perfectly valid fact — "this course exists" — can't be recorded.

**Deletion anomaly.** Charlie drops out and his row is deleted. But Charlie was the *only* student in `CS202` — so deleting him also erases the only record that `CS202` and Dr. Jones even exist.

All three anomalies have the same root cause: unrelated facts (student info, course info, instructor info) are crammed into one row, so you can't touch one fact without risking the others.

---

### The fix: split it into focused tables

```
Courses       (course_id PK, course_name, instructor_name)
Students      (student_id PK, student_name)
Enrollments   (student_id FK, course_id FK, PK: student_id + course_id)
```

Now:
- Adding a course needs no student record.
- Updating an instructor touches exactly one row, in `Courses`.
- Deleting an enrollment never erases the course itself.

---

### The two rules a split has to follow

Splitting a table isn't automatically safe — it has to satisfy two things:

1. **Lossless join.** If you join the split tables back together, you must get the exact original data back — no extra, invented rows. This holds as long as the column the tables share is a key in at least one of them.
2. **Dependency preservation.** Every rule that applied to the original table should still be checkable without needing a join across tables. If you can't enforce a constraint locally within one table, something was lost in the split.

---

### The trade-off: normalization isn't free

Normalizing optimizes for writes — fewer redundant updates, less risk of inconsistency, smaller locks. The cost is reads: reconstructing a full picture (a student with their course and instructor) now needs joins across multiple tables.

That's why OLTP systems (the ones handling live transactions — orders, signups, transfers) typically normalize up to 3NF, while OLAP systems (analytics and reporting, read-heavy) often intentionally denormalize with star/snowflake schemas to make reads faster.

---

### Say this in the interview

*"Normalization splits one table into smaller, focused ones so each fact lives in exactly one place, which eliminates the insertion, update, and deletion anomalies caused by mixing unrelated facts in a single row. A valid split must still allow a lossless join back to the original data and keep every constraint checkable without cross-table joins."*

---

### Schema with the fix applied

```sql
-- Clean, normalized 3-table schema

CREATE TABLE courses (
    course_id VARCHAR(10) PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    instructor_name VARCHAR(100) NOT NULL
);

CREATE TABLE students (
    student_id VARCHAR(10) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL
);

CREATE TABLE enrollments (
    student_id VARCHAR(10) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_id VARCHAR(10) NOT NULL REFERENCES courses(course_id) ON DELETE RESTRICT,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, course_id)
);

-- Add a course before any student enrolls: no anomaly
INSERT INTO courses VALUES ('CS303', 'Artificial Intelligence', 'Dr. Turing');

-- Change an instructor in exactly one row: no inconsistency
UPDATE courses 
SET instructor_name = 'Dr. Adams' 
WHERE course_id = 'CS101';

-- Remove a student's enrollment: the course survives
DELETE FROM enrollments WHERE student_id = 'S103';
-- 'CS202' is still safely in the courses table
```
