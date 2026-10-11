---
id: 8-normalization-3nf-example
title: "Normalizing to 3NF: Step-by-Step Walkthrough"
description: "A worked example taking StudentID, StudentName, CourseID, CourseName, InstructorName through 1NF, 2NF, and 3NF, plus 3NF vs BCNF."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the unnormalized table `StudentID | StudentName | CourseID | CourseName | InstructorName`, walk me through normalizing it step-by-step to 3NF. State the primary keys and functional dependencies at each stage, and explain when 3NF differs from BCNF."

This is a classic "do it live" interview question. The trick is to go one rule at a time — 1NF, then 2NF, then 3NF — and at each step ask "what's forcing a non-key column to depend on less than the whole key, or on another non-key column?"

---

### The starting table

Table: `StudentCourses`
Columns: `StudentID`, `StudentName`, `CourseID`, `CourseName`, `InstructorName`

What depends on what:
- `StudentID` → `StudentName`
- `CourseID` → `CourseName`, `InstructorName`
- `(StudentID, CourseID)` → everything (this pair is the only thing unique enough to be a key)

---

### Step 1 — 1NF: no repeating groups, atomic values

Rule: every column holds a single value — no comma-separated lists, no nested arrays.

Here, each column already holds one scalar value, so that part's fine. But because a student takes many courses and a course has many students, neither `StudentID` nor `CourseID` alone is unique — the key has to be the pair **`(StudentID, CourseID)`**.

**Status: satisfies 1NF.**

---

### Step 2 — 2NF: no partial dependencies

Rule: must be in 1NF, and no non-key column can depend on only *part* of a composite key.

Check the non-key columns against the key `(StudentID, CourseID)`:
- `StudentName` only needs `StudentID` — it doesn't care about `CourseID` at all. That's a partial dependency.
- `CourseName` and `InstructorName` only need `CourseID`. Also partial.

Both violate 2NF. Fix it by pulling each one out into its own table, keyed by whichever column it actually depends on:

1. **`Students`** — `StudentID` (PK), `StudentName`
2. **`Courses`** — `CourseID` (PK), `CourseName`, `InstructorName`
3. **`Enrollments`** (junction table) — `StudentID` (FK), `CourseID` (FK), PK: `(StudentID, CourseID)`

**Status: satisfies 2NF.**

---

### Step 3 — 3NF: no transitive dependencies

Rule: must be in 2NF, and no non-key column can depend on *another non-key column* instead of the key directly.

Look at `Courses`: it stores `InstructorName` directly. But instructors are their own real-world entity — they have an email, a department, an office. If we introduce `InstructorID`, then:

```
CourseID → InstructorID → InstructorName
```

`InstructorName` now depends on `InstructorID`, which depends on `CourseID` — not on `CourseID` directly. That's a transitive dependency, and it causes the same kind of problems as before: if Dr. Smith's office changes, or an instructor exists before being assigned a course, `Courses` can't represent that cleanly.

Fix: pull instructors into their own table too.

1. **`Students`** (`StudentID` PK, `StudentName`)
2. **`Instructors`** (`InstructorID` PK, `InstructorName`)
3. **`Courses`** (`CourseID` PK, `CourseName`, `InstructorID` FK)
4. **`Enrollments`** (`StudentID` FK, `CourseID` FK, PK: `(StudentID, CourseID)`)

**Status: satisfies 3NF.**

---

### The one-line way to remember it

Bill Kent's classic phrasing for the whole journey:

> *"Every non-key attribute must provide a fact about the key [1NF], the whole key [2NF], and nothing but the key [3NF], so help me Codd."*

---

### Follow-up: why not go all the way to BCNF?

| | 3NF | BCNF |
|---|---|---|
| **Rule** | For every dependency X → Y, either X is a superkey, or Y is part of some candidate key | For every dependency X → Y, X must be a superkey — no exception |
| **Overlapping keys** | Can still allow some redundancy | Removes essentially all redundancy |
| **Always preserves dependencies?** | Yes | Not always — sometimes you can't enforce a rule without a cross-table join |

In practice, most production schemas stop at 3NF, because 3NF is guaranteed to preserve every dependency with plain single-table constraints — no extra joins needed just to enforce a rule. BCNF is stricter but can sometimes force you to split a table in a way that makes a constraint impossible to check locally.

---

### Say this in the interview

*"1NF needs atomic columns and a key that's actually unique — here that meant the composite (StudentID, CourseID). 2NF removes partial dependencies, splitting out anything that only depends on half the key. 3NF removes transitive dependencies, splitting out anything that depends on another non-key column instead of the key itself. 3NF is the industry standard over BCNF because it always preserves dependencies without needing cross-table joins to enforce them."*

---

### Final schema

```sql
CREATE TABLE instructors (
    instructor_id INT PRIMARY KEY,
    instructor_name VARCHAR(100) NOT NULL
);

CREATE TABLE students (
    student_id VARCHAR(10) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
    course_id VARCHAR(10) PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    instructor_id INT NOT NULL REFERENCES instructors(instructor_id) ON DELETE RESTRICT
);

CREATE TABLE enrollments (
    student_id VARCHAR(10) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_id VARCHAR(10) NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, course_id)
);
```
