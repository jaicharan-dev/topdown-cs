---
id: 7-normalization-concept-and-purpose
title: "Normalization: Concept, Purpose & Anomalies"
description: "Storing every fact exactly once, the three ways redundancy bites back, and the two proofs a split has to pass"

sidebar_position: 7
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is database normalization, and why do we do it? What are insertion, update, and deletion anomalies, and what mathematical guarantees must a valid decomposition satisfy?"

---

### Picture it

A school keeps one big sheet. Every row is a student enrolled in a course, and each row repeats the student's name, the course's name, and the instructor's name.

It looks convenient, because everything is in one place. Then three separate things go wrong, and they are worth separating because they are three different failures, not one.

**You cannot record something you know.** A new course has been created and nobody has enrolled yet. There is nowhere to put it: a row needs a student. You either leave the course unrecorded or invent a fake student, and both are a loss. **The sheet cannot hold a fact about a course on its own.**

**You change one thing and must change it forty times.** The instructor for Physics has changed. Physics appears in forty rows. Change thirty-nine of them and the sheet now says two different things, with nothing to indicate which is right. **A single fact is stored in forty places, so it has forty chances to disagree with itself.**

**You delete something and lose something else.** The last student withdraws from Chemistry, so you remove the row. The course has now vanished, along with who taught it, although neither of those facts had anything to do with that student. **Removing one fact destroyed an unrelated one.**

All three have the same root cause: **facts about different kinds of thing are tangled in the same row**. The fix is to give each kind of thing its own sheet, and to store each fact exactly once, with the other sheets referring to it.

**But you cannot split carelessly.** Split the sheet badly and when you join the pieces back together you get **rows that were never there**, combinations that are plausible-looking and false. So a split has to be checked, and "checked" has a precise mathematical meaning rather than an aesthetic one.

---

### The proper terms

#### What normalization is

**Normalization** is the process of structuring a relational schema to **reduce redundancy** and remove undesirable **dependencies**, by **decomposing** relations according to their **functional dependencies**.

A **functional dependency**, written `X -> Y`, means that a value of X determines exactly one value of Y. `StudentID -> StudentName` says each student ID has exactly one name.

The organising principle, and the sentence worth leading with: **every fact should be stored exactly once**, in the relation whose key it depends on. Redundancy is not disliked for being wasteful; it is disliked because **a fact stored twice can disagree with itself**, and the database has no way to decide which copy is right.

The process proceeds through the **normal forms**, each a stricter condition:

**1NF** requires **atomic** attribute values, with no repeating groups or multi-valued fields.

**2NF** requires 1NF plus no **partial dependency**: no non-key attribute may depend on only **part** of a composite key.

**3NF** requires 2NF plus no **transitive dependency**: no non-key attribute may depend on another non-key attribute.

**BCNF** strengthens 3NF to require that every determinant is a superkey.

#### The three anomalies

These are the concrete harms redundancy causes, and naming all three with distinct examples is what the question is checking.

**Insertion anomaly.** A fact cannot be recorded without inventing or already possessing unrelated data. In the enrolment sheet, a course with no students enrolled cannot be stored at all, because `StudentID` is part of the primary key and cannot be NULL. The information exists and the schema has nowhere to put it.

**Update anomaly.** A single fact is stored in many rows, so changing it requires changing every copy, and any missed copy leaves the database internally inconsistent. Changing Physics' instructor means updating every Physics row, and a partial update produces a database that asserts two contradictory facts simultaneously. This is the anomaly most likely to occur in a running system, because it needs no unusual conditions, only an interrupted update or a careless `WHERE` clause.

**Deletion anomaly.** Deleting a row destroys information unrelated to what you intended to delete. Removing the last enrolment in Chemistry removes the only record that Chemistry exists and who teaches it. The loss is **silent**: no error is raised, because nothing in the schema expressed that the course was a separate thing worth keeping.

All three disappear once each fact lives in exactly one place, which is what normalization produces.

#### The guarantees a decomposition must satisfy

Decomposing a relation R into R1 and R2 is only valid if it can be proved to preserve information. There are two properties, and they are **not** equally negotiable.

**Lossless-join decomposition**, also called **non-additive join**, is **mandatory**.

Joining the pieces back together must yield **exactly the original relation**: no rows lost and, more importantly, no rows added. A bad decomposition produces **spurious tuples**, extra rows that look like real data and are not, which is worse than losing data because it is undetectable by inspection.

The condition is checkable. For a decomposition of R into R1 and R2, it is lossless if and only if the **common attributes form a superkey of at least one of them**:

```text
(R1 ∩ R2) -> R1   or   (R1 ∩ R2) -> R2   is in F+
```

In words: **the attributes you join on must uniquely identify rows in at least one of the two relations.** If they identify rows in neither, the join multiplies rows and invents combinations.

**Dependency preservation** is **desirable but not always achievable**.

Every functional dependency in the original relation should be enforceable within a single decomposed relation, without needing a join. If a dependency spans two relations, the database cannot enforce it with an ordinary constraint, and you are reduced to a trigger or application-level checking, which can be bypassed.

The relationship between the two is the interesting part, and it is the standard follow-up:

**A 3NF decomposition that is both lossless and dependency-preserving always exists**, for any relation.

**A BCNF decomposition that is lossless always exists, but one that also preserves dependencies may not.**

So BCNF is the stricter normal form yet is sometimes unattainable without losing enforceability, which is precisely why 3NF is the practical target in most schema design: it is the strongest form you can always have both properties in.

A third property is sometimes listed, **attribute preservation**, meaning the union of the decomposed relations' attributes equals the original's. It is trivially satisfied by any sensible decomposition and is rarely the point of the question.

---

### In code

```sql
-- The unnormalised sheet, and all three anomalies living in it
CREATE TABLE enrolments (
    student_id   INT,
    student_name TEXT,
    course_id    INT,
    course_name  TEXT,
    instructor   TEXT,
    PRIMARY KEY (student_id, course_id)
);

student_id | student_name | course_id | course_name | instructor
-----------+--------------+-----------+-------------+-----------
       101 | arun         |       501 | Physics     | dr rao
       102 | bela         |       501 | Physics     | dr rao
       103 | chitra       |       501 | Physics     | dr rao
       101 | arun         |       502 | Chemistry   | dr iyer
```

```text
The three anomalies, each a different failure:

  INSERTION
      a new course 503 "Biology, dr khan" exists, nobody enrolled yet
      -> no row can be written: student_id is part of the key
      -> the fact is known and the schema cannot hold it

  UPDATE
      Physics changes instructor to dr menon
      -> three rows must change
      -> miss one and the table asserts TWO instructors for Physics,
         with nothing to say which is correct
      -> needs no unusual conditions, just an interrupted update

  DELETION
      chitra and bela withdraw, then arun withdraws from Chemistry
      -> deleting arun's Chemistry row destroys the only record that
         Chemistry exists and that dr iyer teaches it
      -> silent: no error, because the schema never said a course
         was a thing worth keeping on its own
```

```sql
-- Normalised: every fact stored exactly once
CREATE TABLE students (
    student_id   INT PRIMARY KEY,
    student_name TEXT NOT NULL
);
CREATE TABLE courses (
    course_id   INT PRIMARY KEY,
    course_name TEXT NOT NULL,
    instructor  TEXT NOT NULL        -- a course can now exist alone
);
CREATE TABLE enrolments (
    student_id INT REFERENCES students(student_id),
    course_id  INT REFERENCES courses(course_id),
    PRIMARY KEY (student_id, course_id)
);
CREATE INDEX idx_enrolments_course ON enrolments(course_id);

-- insertion: a course with no students is now just a courses row
-- update:    one instructor change touches exactly one row
-- deletion:  removing an enrolment cannot remove a course
```

```text
Lossless join: the test, and what failing it produces

  R(student, course, instructor), with course -> instructor

  BAD decomposition:
      R1(student, course)        R2(student, instructor)
      common attributes = {student}
      is student a superkey of R1? no, a student takes many courses
      is student a superkey of R2? no, a student has many instructors
      -> NEITHER, so the join is LOSSY

      R1                      R2
      (arun, physics)         (arun, dr rao)
      (arun, chemistry)       (arun, dr iyer)

      R1 JOIN R2 on student:
      (arun, physics,   dr rao)     real
      (arun, physics,   dr iyer)    SPURIOUS, never existed
      (arun, chemistry, dr rao)     SPURIOUS, never existed
      (arun, chemistry, dr iyer)    real

      Rows were INVENTED. That is worse than losing rows, because
      nothing about them looks wrong.

  GOOD decomposition:
      R1(student, course)        R2(course, instructor)
      common attributes = {course}
      is course a superkey of R2? YES, since course -> instructor
      -> LOSSLESS, and the join reproduces R exactly
```

```text
The two guarantees, and how they relate:

  LOSSLESS JOIN            mandatory
     joining the pieces gives back exactly R
     test: the common attributes must be a superkey of at least
           one of the two relations

  DEPENDENCY PRESERVATION  desirable, not always achievable
     every FD must be enforceable inside ONE relation, no join needed
     if an FD spans two relations, no ordinary constraint can enforce
     it and you are left with triggers or application code

  the standard result:
     3NF   : a lossless AND dependency-preserving decomposition
             ALWAYS exists
     BCNF  : a lossless one always exists, but one that also
             preserves dependencies MAY NOT

  which is why 3NF is the practical target: it is the strongest
  form you can always have both properties in.
```

---

### What they ask next

**"Which anomaly is most dangerous in production?"**
The update anomaly, because it requires no special circumstances. An interrupted batch update or a careless `WHERE` clause is enough, and the result is a database asserting two contradictory facts with no indication of which is correct. Insertion anomalies are at least visible as a blocked insert.

**"Why are spurious tuples worse than lost rows?"**
Because a missing row is detectable by reconciliation, while an invented row looks exactly like real data. A lossy decomposition produces results that are confidently and silently wrong, which is why the lossless-join property is the one that cannot be traded away.

**"Give the lossless-join test in one line."**
The attributes common to the two relations must functionally determine all of at least one of them, which is to say they must form a superkey of at least one. If they are a superkey of neither, the join multiplies rows.

**"Why is 3NF usually the target rather than BCNF?"**
Because 3NF can always be achieved while keeping both properties, and BCNF sometimes cannot. Going to BCNF may force you to give up enforcing a dependency with a constraint, and trading a declarative guarantee for application-level checking is usually the worse deal.

**"Does normalization slow queries down?"**
It replaces redundancy with joins, so some read paths get more expensive, which is the honest trade and the subject of denormalization. The compensation is that writes get cheaper and smaller, since a fact is updated in one place, and correctness stops depending on application discipline.

**"What is the difference between 2NF and 3NF in one sentence each?"**
2NF removes dependencies on **part of a composite key**; 3NF removes dependencies on **another non-key attribute**. Both are about an attribute depending on something that is not the whole key.

**The common wrong answer** is "normalization removes duplicate data to save space". Space is almost irrelevant at modern storage prices. It removes duplicate data so that **a fact cannot disagree with itself**, and the three anomalies are the specific ways that disagreement gets in.

---

### Say this in the interview

*"Normalization is structuring a relational schema to reduce redundancy and remove undesirable dependencies, by decomposing relations according to their functional dependencies, where a functional dependency X determines Y means each value of X has exactly one value of Y. The organising principle is that every fact should be stored exactly once, in the relation whose key it depends on. The reason is not saving space, which is almost irrelevant now; it is that a fact stored twice can disagree with itself and the database has no way to decide which copy is right. The normal forms go 1NF for atomic values, 2NF for no partial dependency on part of a composite key, 3NF for no transitive dependency on another non-key attribute, and BCNF requiring that every determinant is a superkey.*

*There are three anomalies. An insertion anomaly is being unable to record a fact without unrelated data: a course with no students enrolled cannot be stored at all, because the student ID is part of the key, so the information exists and the schema has nowhere for it. An update anomaly is one fact stored in many rows, so changing it means changing every copy, and a missed copy leaves the database asserting two contradictory facts with nothing to say which is correct. That is the most dangerous one in production, because it needs no unusual conditions, just an interrupted update or a careless WHERE clause. A deletion anomaly is deleting a row destroying unrelated information: removing the last enrolment in a course removes the only record that the course exists and who teaches it, and it is silent, because nothing in the schema said the course was a separate thing worth keeping.*

*On the guarantees, a decomposition must satisfy two properties and they are not equally negotiable. Lossless join, or non-additive join, is mandatory: joining the pieces back must give exactly the original relation, with no rows lost and crucially none added. A bad decomposition produces spurious tuples, invented rows that look like real data, which is worse than losing rows because nothing about them looks wrong. The test is that the attributes common to the two relations must form a superkey of at least one of them, so the attributes you join on uniquely identify rows on at least one side; if they identify rows on neither, the join multiplies rows and invents combinations.*

*Dependency preservation is desirable but not always achievable: every functional dependency should be enforceable inside a single decomposed relation without a join, because an FD spanning two relations cannot be enforced by an ordinary constraint and leaves you with triggers or application code. The standard result is that a 3NF decomposition which is both lossless and dependency-preserving always exists, while a lossless BCNF decomposition always exists but a dependency-preserving one may not. That is exactly why 3NF is the practical target: it is the strongest form you can always have both properties in. Attribute preservation is sometimes listed as a third property, but it is trivially satisfied."*
