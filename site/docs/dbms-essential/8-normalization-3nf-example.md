---
id: 8-normalization-3nf-example
title: "Normalizing to 3NF: Step-by-Step Walkthrough"
description: "Step-by-step interview solution: decompose StudentID, StudentName, CourseID, CourseName, InstructorName into 1NF, 2NF, and 3NF, plus 3NF vs BCNF."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the unnormalized table `StudentID | StudentName | CourseID | CourseName | InstructorName`, walk me through normalizing it step-by-step to 3NF. State the primary keys and functional dependencies at each stage, and explain when 3NF differs from BCNF."

This classic design problem tests your ability to apply the formal definitions of **1NF**, **2NF**, and **3NF** to eliminate partial and transitive dependencies, while understanding the subtle distinction between **3NF** and **BCNF**.

---

### The Initial Unnormalized State

Table: `StudentCourses`  
Columns: `StudentID`, `StudentName`, `CourseID`, `CourseName`, `InstructorName`

#### Functional Dependencies (FDs):
- `StudentID` $\to$ `StudentName`
- `CourseID` $\to$ `CourseName`, `InstructorName`
- `(StudentID, CourseID)` $\to$ All attributes (Composite Candidate Key)

---

### Step 1: First Normal Form (1NF)
**Rule:** Every attribute must hold atomic (indivisible) scalar values, and the relation must contain no repeating groups or nested arrays.

- **Evaluation:** Each column contains single values (e.g., `CourseID` does not contain comma-delimited strings like `"CS101, CS202"`).
- **Candidate Key:** Because a student enrolls in multiple courses, and each course enrolls multiple students, neither `StudentID` nor `CourseID` alone is unique. The primary key must be composite: **`(StudentID, CourseID)`**.
- **Status:** **Satisfies 1NF**.

---

### Step 2: Second Normal Form (2NF)
**Rule:** Must be in 1NF **AND** have no **Partial Dependencies** (no non-prime attribute may depend on a proper *subset* of a composite candidate key).

- **Identify the Violations:**
  - Candidate Key: `(StudentID, CourseID)`.
  - Non-prime attributes: `StudentName`, `CourseName`, `InstructorName`.
  - `StudentName` depends **only** on `StudentID` (a subset of the key).
  - `CourseName` and `InstructorName` depend **only** on `CourseID` (a subset of the key).
  - Both violate 2NF!

- **Decomposition (Eliminate Partial Dependencies):**
  Extract subsets into their own relations where non-prime attributes depend on the *entire* key:

1. **`Students`**
   - `StudentID` (PK)
   - `StudentName`

2. **`Courses`**
   - `CourseID` (PK)
   - `CourseName`
   - `InstructorName`

3. **`Enrollments`** (Junction Table)
   - `StudentID` (FK referencing Students)
   - `CourseID` (FK referencing Courses)
   - Primary Key: `(StudentID, CourseID)`

- **Status:** **Satisfies 2NF**.

---

### Step 3: Third Normal Form (3NF)
**Rule:** Must be in 2NF **AND** have no **Transitive Dependencies** (no non-prime attribute may depend on another non-prime attribute: $X \to Y \to Z$).

- **Evaluating `Courses`:**
  - In a real-world institution, instructors are independent entities with attributes like email, department, and office location.
  - Storing `InstructorName` directly in `Courses` introduces a transitive dependency if `InstructorID` is introduced:
    $$\text{CourseID} \to \text{InstructorID} \to \text{InstructorName}$$
  - If Dr. Smith's office changes, or if an instructor exists without an active course, `Courses` suffers update and insertion anomalies.

- **Decomposition (Eliminate Transitive Dependencies):**
  Extract the instructor entity into its own relation:

1. **`Students`** (`StudentID` PK, `StudentName`)
2. **`Instructors`** (`InstructorID` PK, `InstructorName`)
3. **`Courses`** (`CourseID` PK, `CourseName`, `InstructorID` FK)
4. **`Enrollments`** (`StudentID` FK, `CourseID` FK, PK: `(StudentID, CourseID)`)

- **Status:** **Satisfies 3NF**.

---

### The Golden Rule of Normalization

Bill Kent famously distilled the journey to 3NF into one memorable oath:

> *"Every non-key attribute must provide a fact about **the key** [1NF], **the whole key** [2NF], and **nothing but the key** [3NF], so help me Codd."*

---

### The Advanced Follow-Up: 3NF vs. BCNF

Interviewers frequently follow up: *"Why didn't we normalize to BCNF (Boyce-Codd Normal Form)? How does BCNF differ from 3NF?"*

| Criterion | Third Normal Form (3NF) | Boyce-Codd Normal Form (BCNF) |
| :--- | :--- | :--- |
| **Formal Definition** | For every non-trivial FD $X \to Y$, either **$X$ is a superkey** OR **$Y$ is a prime attribute** (part of a candidate key). | For every non-trivial FD $X \to Y$, **$X$ must strictly be a superkey**. (No prime attribute exception). |
| **Handling Overlapping Keys** | Permits anomalies when overlapping composite candidate keys exist. | Completely eliminates all redundancy based on functional dependencies. |
| **Dependency Preservation** | **Always guaranteed** to preserve all functional dependencies. | **Not always guaranteed**. Decomposing to BCNF can make it impossible to enforce certain FDs without cross-table joins. |

**Key Takeaway:** In practice, industry database schemas aim for **3NF** because it guarantees that all business functional dependencies can be enforced with standard single-table unique constraints, avoiding costly multi-table join checks during inserts and updates.

---

### Summary
"To normalize to 3NF: Ensure atomic attributes with a composite key for 1NF; split out partial dependencies on key subsets for 2NF; and eliminate transitive dependencies among non-key attributes for 3NF. While BCNF is stricter, 3NF is the industry standard because it guarantees both a lossless join and dependency preservation."

---

### Code Demonstration: Final 3NF DDL Schema

```sql
-- Production DDL for Normalized 3NF Schema

-- 1. Instructors Table
CREATE TABLE instructors (
    instructor_id INT PRIMARY KEY,
    instructor_name VARCHAR(100) NOT NULL
);

-- 2. Students Table
CREATE TABLE students (
    student_id VARCHAR(10) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL
);

-- 3. Courses Table (References Instructor)
CREATE TABLE courses (
    course_id VARCHAR(10) PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    instructor_id INT NOT NULL REFERENCES instructors(instructor_id) ON DELETE RESTRICT
);

-- 4. Enrollments Junction Table (Composite PK)
CREATE TABLE enrollments (
    student_id VARCHAR(10) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_id VARCHAR(10) NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, course_id)
);
```
