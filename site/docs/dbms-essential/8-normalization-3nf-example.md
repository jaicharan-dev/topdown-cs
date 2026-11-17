---
id: 8-normalization-3nf-example
title: "Normalizing to 3NF: Step-by-Step Walkthrough"
description: "One tangled table taken apart in order, stating the dependencies out loud at every stage"

sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the unnormalized table `StudentID | StudentName | CourseID | CourseName | InstructorName`, walk me through normalizing it step-by-step to 3NF. State the primary keys and functional dependencies at each stage, and explain when 3NF differs from BCNF."

---

### Picture it

One sheet with five columns, and three different kinds of thing written on every line: something about a **student**, something about a **course**, and the fact that **this student is in this course**.

The method is mechanical once you see what you are looking for at each stage.

**First, is every box a single value?** If one cell says "Physics, Chemistry", you cannot query it, index it or join on it, so split those into separate lines before anything else.

**Second, ask what identifies a line.** It takes **both** the student and the course: neither alone picks out a line, because a student has several courses and a course has several students.

**Third, look at each remaining column and ask which part of that pair it actually depends on.** The student's name depends on the **student** only. Knowing the course tells you nothing about it. The course's name and its instructor depend on the **course** only. So most columns do not depend on the whole identifier, only on half of it, and that is why they are repeated down the sheet. Give each half its own sheet, and keep a third sheet holding only the pairs.

**Fourth, look inside each new sheet and ask whether anything depends on something that is not the key.** In the courses sheet, does any column depend on another ordinary column rather than on the course? With just a name and an instructor, no. But add the instructor's department and the answer changes: the department follows the **instructor**, not the course, so it has arrived in the wrong sheet and is now repeated once per course that person teaches.

Four questions, asked in order. The reason to ask them in order is that each stage removes a kind of repetition the next stage would otherwise trip over.

---

### The proper terms

#### Stage 0: the starting table and its dependencies

```text
StudentID | StudentName | CourseID | CourseName | InstructorName
```

Before anything, state the **functional dependencies**, because every step follows from them and nothing can be justified without them:

```text
StudentID -> StudentName
CourseID  -> CourseName
CourseID  -> InstructorName          (assumption: one instructor per course)
```

**Candidate key: `(StudentID, CourseID)`.** Neither attribute determines a row alone, since a student takes many courses and a course has many students. The relation is a many-to-many association with attributes of both participants embedded in it.

Stating the assumption explicitly matters. If a course can be **co-taught**, then `CourseID -> InstructorName` is false, `InstructorName` becomes part of the key, and the whole decomposition changes. An interviewer is often watching for whether you notice that.

#### Stage 1: first normal form

**1NF** requires every attribute value to be **atomic**: no repeating groups, no lists inside a cell.

Our table is already in 1NF if each row holds one student and one course. It would **violate** 1NF if a single row held `CourseName = 'Physics, Chemistry'`, which is the common real-world form of the problem, because such a cell cannot be indexed, joined, or filtered without string surgery.

The fix for a violation is one row per value, which is why the key is composite in the first place.

**Primary key after 1NF: `(StudentID, CourseID)`.**

#### Stage 2: second normal form

**2NF** requires 1NF plus **no partial dependency**: no non-key attribute may depend on only **part** of a composite key.

Examine each non-key attribute against the key `(StudentID, CourseID)`:

| Attribute | Depends on | Verdict |
| --- | --- | --- |
| StudentName | `StudentID` only | **partial dependency**, violates 2NF |
| CourseName | `CourseID` only | **partial dependency**, violates 2NF |
| InstructorName | `CourseID` only | **partial dependency**, violates 2NF |

Every non-key attribute is partially dependent, which is why the original table is so badly redundant: it stores a student's name once per course they take, and a course's instructor once per enrolled student.

Decompose by **grouping attributes with the part of the key they depend on**:

```text
Students(StudentID PK, StudentName)
    FD: StudentID -> StudentName

Courses(CourseID PK, CourseName, InstructorName)
    FDs: CourseID -> CourseName, CourseID -> InstructorName

Enrolments(StudentID, CourseID)        PK (StudentID, CourseID)
    both columns are foreign keys; the relation holds no other attributes
```

This decomposition is **lossless**, because each piece shares with `Enrolments` exactly the attribute that is its own primary key, so the common attributes are a superkey of one side. It is also **dependency-preserving**, since every original FD now lives inside a single relation.

The three anomalies are already gone at this point: a course with no students is just a `Courses` row, an instructor change touches one row, and deleting an enrolment cannot delete a course.

#### Stage 3: third normal form

**3NF** requires 2NF plus **no transitive dependency**: no non-key attribute may depend on another non-key attribute. Equivalently, for every FD `X -> A`, either X is a **superkey** or A is **part of a candidate key**.

Check each relation.

**Students.** One non-key attribute, so there is nothing for it to transitively depend on. In 3NF.

**Enrolments.** All attributes are in the key. In 3NF trivially.

**Courses(CourseID, CourseName, InstructorName).** Here is where you must be careful, and where the honest answer differs from the rehearsed one. Is there an FD among the non-key attributes? That would require `CourseName -> InstructorName`. If course names are unique, `CourseName` is itself a **candidate key** of `Courses`, so its determinant is a superkey and nothing is violated. If course names are not unique, there is no such FD to begin with.

So with the dependencies as given, **the schema is already in 3NF after stage 2**, and saying so is the correct answer rather than inventing a split to look thorough.

**What would break 3NF.** The violation appears as soon as the table carries an attribute of the **instructor** rather than of the course, which is the realistic version of this schema:

```text
Courses(CourseID PK, CourseName, InstructorName, InstructorDept)

FDs: CourseID       -> CourseName
     CourseID       -> InstructorName
     InstructorName -> InstructorDept      <-- transitive, violates 3NF
```

`InstructorDept` depends on `InstructorName`, which is **not** a superkey, and `InstructorDept` is **not** part of any candidate key. So `CourseID -> InstructorName -> InstructorDept` is a transitive dependency, and the department is now stored once per course that instructor teaches.

Decompose by **moving the dependent attribute to the relation of its determinant**:

```text
Courses(CourseID PK, CourseName, InstructorID FK)
Instructors(InstructorID PK, InstructorName, InstructorDept)
```

Note the second improvement: introducing an `InstructorID` surrogate key rather than keying instructors on their name, since names are neither unique nor immutable.

#### When 3NF differs from BCNF

**BCNF** requires that for **every** non-trivial FD `X -> A`, **X is a superkey**. It removes 3NF's concession that A may be part of a candidate key.

So the two forms differ **only** when a relation has **overlapping candidate keys** and a non-superkey determinant pointing at a **prime attribute**, meaning one that belongs to some candidate key. In practice that is uncommon, which is why most schemas reach BCNF the moment they reach 3NF.

The textbook case that separates them:

```text
Teaching(Student, Course, Instructor)

FDs: (Student, Course) -> Instructor     a student takes a course from one person
     Instructor        -> Course         each instructor teaches only one course

Candidate keys: (Student, Course) and (Student, Instructor)
```

Check `Instructor -> Course`. `Instructor` is not a superkey, so **BCNF is violated**. But `Course` **is** a prime attribute, being part of the candidate key `(Student, Course)`, so 3NF is satisfied.

Now try to reach BCNF. The only lossless decomposition is:

```text
R1(Instructor, Course)       enforces Instructor -> Course
R2(Student, Instructor)
```

This is lossless, since `Instructor` is a superkey of R1. But the dependency `(Student, Course) -> Instructor` now **spans both relations** and cannot be enforced by any constraint inside either one. The database can no longer prevent a student from being recorded with two instructors for the same course.

That is the trade in one sentence: **BCNF bought a stricter guarantee about determinants and paid for it with an unenforceable dependency.** It is also the general result, which is worth quoting: a lossless and dependency-preserving **3NF** decomposition always exists, while a dependency-preserving **BCNF** decomposition sometimes does not. Hence 3NF as the practical target.

---

### In code

```text
Stage 0: one table, three kinds of fact tangled together

  StudentID | StudentName | CourseID | CourseName | InstructorName
  ----------+-------------+----------+------------+---------------
        101 | arun        |      501 | Physics    | dr rao
        102 | bela        |      501 | Physics    | dr rao
        103 | chitra      |      501 | Physics    | dr rao
        101 | arun        |      502 | Chemistry  | dr iyer

  FDs:  StudentID -> StudentName
        CourseID  -> CourseName
        CourseID  -> InstructorName        (one instructor per course)
  KEY:  (StudentID, CourseID)

  "arun" is stored twice. "dr rao" is stored three times.
```

```text
Stage 2: every non-key attribute was partially dependent, so split by
         which HALF of the key each one actually depends on

  StudentName    -> depends on StudentID only   } partial
  CourseName     -> depends on CourseID  only   } dependencies
  InstructorName -> depends on CourseID  only   } all three

  Students                   Courses                      Enrolments
  ---------------            -------------------------    ------------
  101 | arun                 501 | Physics   | dr rao     101 | 501
  102 | bela                 502 | Chemistry | dr iyer    102 | 501
  103 | chitra                                            103 | 501
                                                          101 | 502

  lossless?   yes: each piece shares with Enrolments exactly the
              attribute that is its own primary key, so the common
              attributes are a superkey of one side
  preserving? yes: every original FD lives inside one relation
```

```sql
-- Stage 2, as DDL
CREATE TABLE students (
    student_id   INT  PRIMARY KEY,
    student_name TEXT NOT NULL
);
CREATE TABLE courses (
    course_id       INT  PRIMARY KEY,
    course_name     TEXT NOT NULL,
    instructor_name TEXT NOT NULL
);
CREATE TABLE enrolments (
    student_id INT REFERENCES students(student_id),
    course_id  INT REFERENCES courses(course_id),
    PRIMARY KEY (student_id, course_id)
);
CREATE INDEX idx_enrolments_course ON enrolments(course_id);
```

```text
Stage 3: with the FDs AS GIVEN, this is already 3NF.

  Students     one non-key attribute, nothing to depend transitively on
  Enrolments   all attributes are in the key
  Courses      a 3NF violation would need CourseName -> InstructorName.
               If course names are unique, CourseName is a candidate key,
               so its determinant IS a superkey: no violation.
               If they are not unique, the FD does not exist.

  Saying this is the right answer. Inventing a split to look thorough
  is the wrong one.
```

```text
Stage 3 for real: the violation appears with an INSTRUCTOR attribute

  Courses(CourseID, CourseName, InstructorName, InstructorDept)

  CourseID       -> InstructorName
  InstructorName -> InstructorDept      <-- transitive: a non-key
                                            attribute determining another

  InstructorName is not a superkey, and InstructorDept is not part of
  any candidate key, so 3NF is violated and the department is stored
  once per course that person teaches.

  Move the dependent attribute to the relation of its determinant:

  Courses                              Instructors
  ------------------------------       -------------------------------
  CourseID PK | CourseName | InstructorID FK      InstructorID PK
                                                | InstructorName
                                                | InstructorDept

  and key instructors on a surrogate id, because names are neither
  unique nor immutable.
```

```text
3NF vs BCNF: they differ only with overlapping candidate keys

  Teaching(Student, Course, Instructor)

  FDs:  (Student, Course) -> Instructor
        Instructor        -> Course

  candidate keys: (Student, Course)  and  (Student, Instructor)

  test Instructor -> Course
     is Instructor a superkey?   NO   -> BCNF VIOLATED
     is Course a prime attribute? YES -> 3NF SATISFIED
     (prime = part of some candidate key)

  the only lossless BCNF decomposition:
     R1(Instructor, Course)     Instructor is a superkey here: lossless
     R2(Student, Instructor)

  but now (Student, Course) -> Instructor SPANS BOTH relations, so no
  constraint in either one can enforce it. The database can no longer
  stop a student being recorded with two instructors for one course.

  the general result:
     3NF  : lossless AND dependency-preserving always possible
     BCNF : lossless always possible, dependency-preserving sometimes not
```

---

### What they ask next

**"What if a course can be co-taught?"**
Then `CourseID -> InstructorName` is false, `InstructorName` joins the key, and `Courses` becomes a `Courses` relation plus a `CourseInstructors` junction table. This is why stating the assumption out loud at stage 0 matters: a different assumption gives a different correct schema.

**"How do you know the stage 2 split is lossless?"**
Because the attributes shared between `Students` and `Enrolments` are exactly `StudentID`, which is the primary key of `Students`, so the common attributes form a superkey of one side. The same holds for `Courses` and `CourseID`. That is the lossless-join condition satisfied directly.

**"Can you skip 2NF and go straight to 3NF?"**
In practice yes, and experienced designers do, because both steps are the same instinct: an attribute should live with whatever actually determines it. The forms are presented in order because each one names a distinct kind of violation, which is useful when you have to justify a design rather than just produce it.

**"Why a surrogate InstructorID?"**
Because instructor names are neither unique nor immutable. Keying on the name means two people called the same thing collide, and a correction to a spelling has to cascade through every referencing row.

**"Is 3NF always the right stopping point?"**
It is the right **default**. You go further to BCNF when a relation genuinely has overlapping candidate keys and the anomaly matters, and you deliberately come back from it with denormalization when a read path demands it, which should be a measured decision with a plan for keeping the copies in step.

**"What is a prime attribute?"**
An attribute that is part of **some** candidate key. It is the whole hinge of the 3NF-versus-BCNF distinction: 3NF forgives a non-superkey determinant if what it determines is prime, and BCNF does not.

**The common wrong answer** is reciting 1NF, 2NF and 3NF and producing three tables without ever writing down the **functional dependencies**. The dependencies are the input to the whole process. Without them the decomposition cannot be justified, cannot be checked for losslessness, and is just a guess that happens to look tidy.

---

### Say this in the interview

*"First I would state the functional dependencies, because every step follows from them. StudentID determines StudentName. CourseID determines CourseName, and CourseID determines InstructorName, assuming one instructor per course, which I would flag, because if a course can be co-taught that FD is false and the whole decomposition changes. The candidate key is StudentID plus CourseID, since neither identifies a row alone.*

*1NF requires atomic values. The table is already in 1NF if each row holds one student and one course; it would violate 1NF if a cell held a list like 'Physics, Chemistry', which cannot be indexed or joined without string surgery. The primary key is StudentID plus CourseID.*

*2NF requires no partial dependency on part of a composite key. Checking each non-key attribute: StudentName depends on StudentID only, CourseName depends on CourseID only, and InstructorName depends on CourseID only. All three are partial dependencies, which is exactly why the table is so redundant, storing a student's name once per course and a course's instructor once per enrolled student. So I decompose by grouping each attribute with the part of the key it depends on: Students with StudentID as the key and StudentName; Courses with CourseID as the key, CourseName and InstructorName; and Enrolments with StudentID and CourseID as a composite key and both columns as foreign keys. That split is lossless, because each piece shares with Enrolments exactly the attribute that is its own primary key, so the common attributes are a superkey of one side, and it is dependency-preserving because every original FD now lives inside one relation. All three anomalies are gone at this point.*

*3NF requires no transitive dependency, meaning for every FD X determines A, either X is a superkey or A is part of a candidate key. Students has one non-key attribute so there is nothing to depend transitively on, Enrolments is all key, and for Courses a violation would need CourseName to determine InstructorName. If course names are unique then CourseName is itself a candidate key, so its determinant is a superkey and there is no violation; if they are not unique the FD does not exist. So with these dependencies the schema is already in 3NF after stage 2, and I would say that rather than invent a split.*

*The violation appears as soon as the table carries an attribute of the instructor rather than the course. Add InstructorDept and you get CourseID determines InstructorName determines InstructorDept, where InstructorName is not a superkey and InstructorDept is not prime, so the department is stored once per course that person teaches. The fix is to move the dependent attribute to the relation of its determinant: Courses keeps CourseID, CourseName and an InstructorID foreign key, and Instructors holds InstructorID, InstructorName and InstructorDept, keyed on a surrogate id because names are neither unique nor immutable.*

*3NF and BCNF differ only when a relation has overlapping candidate keys and a non-superkey determinant pointing at a prime attribute. The textbook case is Teaching with Student, Course and Instructor, where Student plus Course determines Instructor and Instructor determines Course, giving candidate keys of Student plus Course and Student plus Instructor. Instructor determines Course has a non-superkey determinant, so BCNF is violated, but Course is prime so 3NF holds. The only lossless BCNF decomposition is Instructor with Course, plus Student with Instructor, and now Student plus Course determines Instructor spans both relations and cannot be enforced by any constraint, so the database can no longer stop a student being recorded with two instructors for one course. That is the general result: a lossless and dependency-preserving 3NF decomposition always exists, while a dependency-preserving BCNF one sometimes does not, which is why 3NF is the practical target."*
