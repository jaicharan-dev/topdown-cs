---
id: 8-normalization-3nf-example
title: "Normalizing to 3NF: Step-by-Step Walkthrough"
description: "Step-by-step interview solution: decompose StudentID, StudentName, CourseID, CourseName, InstructorName into 1NF, 2NF, and 3NF."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the unnormalized table StudentID | StudentName | CourseID | CourseName | InstructorName, walk me through normalizing it step-by-step to 3NF. State the primary keys and functional dependencies at each stage."

This classic interview problem tests your ability to apply the formal rules of **1NF**, **2NF**, and **3NF** to systematically eliminate partial and transitive dependencies.

---

### The Initial Unnormalized State

Table: `StudentCourses`
Columns: `StudentID`, `StudentName`, `CourseID`, `CourseName`, `InstructorName`

#### Functional Dependencies (FDs):
- `StudentID`  ->  `StudentName`
- `CourseID`  ->  `CourseName`, `InstructorName`
- (`StudentID`, `CourseID`)  ->  All attributes (Composite Candidate Key)

---

### Step 1: First Normal Form (1NF)
**Rule:** Every column must hold atomic (indivisible) values, and there must be no repeating groups or arrays.

- **Check:** In our table, each cell contains a single value (e.g., `CourseID` does not contain comma-separated values like `"CS101, CS202"`).
- **Candidate Key:** Since a student can take multiple courses, and a course has multiple students, neither `StudentID` nor `CourseID` is unique on its own. The primary key must be composite: **`(StudentID, CourseID)`**.
- **Status:** **Satisfies 1NF**.

---

### Step 2: Second Normal Form (2NF)
**Rule:** Must be in 1NF **AND** have no **Partial Dependencies** (no non-prime attribute may depend on only a *subset* of a composite candidate key).

- **Identify the Problem:**
  - Our composite key is `(StudentID, CourseID)`.
  - `StudentName` depends **only** on `StudentID` (not on `CourseID`).
  - `CourseName` and `InstructorName` depend **only** on `CourseID` (not on `StudentID`).
  - Both are partial dependencies violating 2NF!

- **Decomposition:**
  Split into tables where attributes depend on the *entire* key:

1. **`Students`**
   - `StudentID` (PK)
   - `StudentName`

2. **`Courses`**
   - `CourseID` (PK)
   - `CourseName`
   - `InstructorName`

3. **`StudentCourseEnrollments`** (Junction Table)
   - `StudentID` (FK referencing Students)
   - `CourseID` (FK referencing Courses)
   - Primary Key: `(StudentID, CourseID)`

- **Status:** **Satisfies 2NF**.

---

### Step 3: Third Normal Form (3NF)
**Rule:** Must be in 2NF **AND** have no **Transitive Dependencies** (no non-prime attribute may depend on another non-prime attribute: X  o Y  o Z).

- **Check Each Table:**
  - `Students`: `StudentID`  ->  `StudentName`. (No transitive dependencies. In 3NF).
  - `StudentCourseEnrollments`: Only key columns. (In 3NF).
  - `Courses`: `CourseID`  ->  `CourseName`, `InstructorName`.

- **Evaluating Assumptions in `Courses`:**
  - If an instructor can teach multiple courses, but each course is uniquely assigned to a single instructor, then `CourseID`  ->  `InstructorName` is a direct dependency.
  - However, in a university schema where instructors have their own attributes (e.g., `InstructorOffice`, `InstructorEmail`), having `InstructorName` directly in `Courses` is a transitive dependency if `InstructorID` is introduced: `CourseID`  ->  `InstructorID`  ->  `InstructorName`.
  - To achieve strict 3NF purity, we extract the instructor entity:

1. **`Students`**
   - `StudentID` (PK)
   - `StudentName`

2. **`Instructors`**
   - `InstructorID` (PK)
   - `InstructorName`

3. **`Courses`**
   - `CourseID` (PK)
   - `CourseName`
   - `InstructorID` (FK referencing Instructors)

4. **`Enrollments`**
   - `StudentID` (FK)
   - `CourseID` (FK)
   - Primary Key: `(StudentID, CourseID)`

---

### The Golden Rule of Normalization

Bill Kent famously summarized the progression to 3NF:

> *"Every non-key attribute must provide a fact about **the key** [1NF], **the whole key** [2NF], and **nothing but the key** [3NF], so help me Codd."*

---

### Summary
"To normalize to 3NF: First ensure atomic fields for 1NF with composite key (StudentID, CourseID); next eliminate partial dependencies for 2NF by splitting into Students, Courses, and an Enrollments junction table; finally eliminate transitive dependencies for 3NF by extracting Instructors into its own entity referenced via foreign key."

---

### Crucial Nuance: Preserving Lossless Joins
When decomposing a table during normalization, the decomposition must be **Lossless-Join** and **Dependency-Preserving**. A decomposition is lossless if performing a natural join (`NATURAL JOIN`) on the resulting tables produces the exact original relation without creating spurious (hallucinated) rows. In our decomposition, joining `Students`, `Enrollments`, and `Courses` on their foreign keys reconstructs the exact original student-course pairs.
