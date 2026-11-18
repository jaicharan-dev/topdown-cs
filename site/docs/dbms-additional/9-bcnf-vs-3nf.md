---
id: 9-bcnf-vs-3nf
title: "BCNF vs 3NF"
description: "One clause of difference, which only matters when candidate keys overlap, and which costs you an enforceable rule"

sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is Boyce-Codd Normal Form (BCNF), and how does it differ from 3NF? Give a concrete example of a schema that is in 3NF but violates BCNF, and explain the fundamental trade-off between BCNF and Dependency Preservation."

---

### Picture it

A rule book with one clause in it that reads, roughly: **"anything that determines another fact must be something that identifies a whole record, or else the fact it determines must itself be part of some way of identifying a record."**

The second half of that sentence is an **exemption**, and the stricter form simply deletes it.

For almost every table you will ever design, deleting it changes nothing, because the exemption only applies in an unusual situation: when there is **more than one way to identify a record and the ways overlap**. If a record is identified only one way, the exemption never fires and the two rule books are identical.

**But when it does fire, something real is being left behind.**

Imagine a timetable listing which student is taught which subject by which tutor, where each tutor teaches exactly one subject. "Rao teaches physics" is a fact about **Rao**, and yet it is written once **per student Rao teaches**. Thirty students, thirty copies. Change Rao's subject and you must change thirty rows; lose the last student and you lose the knowledge that Rao teaches physics at all. The looser rule book permits this, because the subject is part of one of the ways of identifying a row.

**So you split the timetable** into "which tutor teaches what" and "which student has which tutor". The redundancy is gone.

**And now the thing you have lost.** The original table could enforce "a student has only one tutor for a given subject", because student and subject sat side by side in one place. After the split they are **in different tables**, so no single table can check it. The database can no longer stop a student being recorded with two physics tutors. You removed the duplication and gave up the guarantee, and **there is no arrangement that keeps both**.

---

### The proper terms

#### The two definitions, which differ by one clause

**3NF.** For every non-trivial functional dependency `X -> A`, at least one of:

**X is a superkey**, or

**A is a prime attribute**, meaning it belongs to **some** candidate key.

**BCNF.** For every non-trivial functional dependency `X -> A`:

**X is a superkey.** Full stop.

So **BCNF simply removes 3NF's second clause.** Every determinant must be a superkey, with no exemption for prime attributes.

It follows that **every BCNF relation is in 3NF**, and the converse fails only in one specific circumstance.

#### When they actually differ

The exemption can only fire when a relation has an FD `X -> A` where:

**X is not a superkey**, and

**A is prime.**

For `A` to be prime while `X` is not a superkey, the relation must have multiple candidate keys that overlap, which is uncommon in practice. That is the honest headline: **most schemas reach BCNF the moment they reach 3NF**, and the distinction is mostly theoretical. Knowing **when** it is not theoretical is what the question is testing.

#### The canonical example

The relation everyone uses, because it is the smallest one that separates them:

```text
Teaching(Student, Course, Instructor)

Business rules, as functional dependencies:
    (Student, Course) -> Instructor    a student takes a given course
                                       from exactly one instructor
    Instructor        -> Course        each instructor teaches exactly
                                       one course
```

Work out the candidate keys:

**`(Student, Course)`** determines `Instructor`, so it determines everything: a candidate key.

**`(Student, Instructor)`** determines `Course` through the second FD, and therefore everything: also a candidate key.

So the **prime attributes are `Student`, `Course` and `Instructor`**, which is all of them.

Now test the FD `Instructor -> Course`:

**Is `Instructor` a superkey?** No. One instructor teaches many students, so `Instructor` alone does not determine `Student`.

**Is `Course` prime?** Yes, it is part of the candidate key `(Student, Course)`.

**3NF is satisfied** by the second clause. **BCNF is violated**, because the determinant is not a superkey.

#### What the violation actually costs

The exemption is not harmless. The fact "`Instructor` teaches `Course`" depends on the instructor alone, but it is stored once per student that instructor teaches:

| Student | Course | Instructor |
| --- | --- | --- |
| arun | Physics | rao |
| bela | Physics | rao |
| chitra | Physics | rao |
| arun | Chemistry | iyer |

The three anomalies are all present:

**Update.** Rao moves to Astronomy, and three rows must change. Miss one and the table asserts that Rao teaches two subjects, which the business rules forbid.

**Deletion.** All of Rao's students withdraw, and the fact that Rao teaches Physics disappears entirely.

**Insertion.** A new instructor with no students yet cannot be recorded at all, because `Student` is part of every candidate key.

So BCNF is not pedantry. It is removing redundancy that 3NF genuinely permits.

#### The BCNF decomposition, and what it costs

The only lossless decomposition is:

```text
R1(Instructor, Course)       enforces  Instructor -> Course
R2(Student, Instructor)
```

**Is it lossless?** Yes. The common attribute is `Instructor`, which is a superkey of R1 because `Instructor -> Course`. That satisfies the lossless-join condition directly, so the join reproduces `Teaching` exactly.

**Is it dependency-preserving?** No, and this is the whole point. The FD `(Student, Course) -> Instructor` now spans both relations: `Student` lives in R2 and `Course` lives in R1. No single table contains both, so **no constraint in either table can enforce it**.

The practical consequence is concrete: **the database can no longer prevent a student being recorded with two instructors for the same course.** You would have to enforce it with a trigger, with application code, or with a materialised view carrying a unique constraint, all of which are weaker than a declarative constraint because they can be bypassed or can race.

#### The trade-off, and the theorem behind it

The formal results are what make this a real trade rather than a preference:

**Every relation has a lossless, dependency-preserving 3NF decomposition.** This is constructive: the **synthesis algorithm** builds one from a minimal cover.

**Every relation has a lossless BCNF decomposition.**

**Not every relation has a dependency-preserving BCNF decomposition.** `Teaching` is the counterexample, and it proves there is no clever alternative split.

So the choice is genuinely between two things you cannot both have:

**BCNF** eliminates **all** redundancy arising from functional dependencies, and may cost you the ability to declaratively enforce a business rule.

**3NF** guarantees that every dependency remains enforceable in a single table, and may leave some redundancy, with the update, deletion and insertion anomalies that follow.

How to decide in practice:

**Prefer 3NF** when the unenforceable dependency is an **important business rule**, since a rule the database cannot check is a rule that will eventually be violated.

**Prefer BCNF** when the redundancy is causing **real anomalies** and the lost dependency can be enforced acceptably another way, or is unlikely to be violated.

**Notice that this is rare.** Overlapping candidate keys are uncommon, so almost every schema is in BCNF as soon as it is in 3NF, and saying so is part of a complete answer rather than a hedge.

#### Where it continues

Briefly, because interviewers sometimes push:

**4NF** addresses **multivalued dependencies**, where independent multi-valued facts about the same entity are stored together and produce a Cartesian product of rows.

**5NF**, or project-join normal form, addresses **join dependencies**, where a relation can only be reconstructed from three or more projections.

**DKNF** is the theoretical limit, requiring every constraint to be a consequence of domain and key constraints alone. It is not generally achievable.

In practice schemas stop at 3NF or BCNF, and the higher forms matter when a table is genuinely storing independent multi-valued facts.

---

### In code

```text
The definitions, which differ by exactly one clause:

  3NF    for every non-trivial FD  X -> A:
             X is a SUPERKEY
             OR
             A is a PRIME ATTRIBUTE (part of SOME candidate key)

  BCNF   for every non-trivial FD  X -> A:
             X is a SUPERKEY.
             (full stop)

  BCNF simply REMOVES 3NF's second clause.
  -> every BCNF relation is in 3NF
  -> the converse fails only when an FD has a NON-SUPERKEY
     determinant pointing at a PRIME attribute
  -> which requires MULTIPLE OVERLAPPING CANDIDATE KEYS

  so: most schemas reach BCNF the moment they reach 3NF, and the
  distinction is mostly theoretical. Knowing WHEN it is not is the
  question.
```

```text
The canonical example, the smallest relation that separates them:

  Teaching(Student, Course, Instructor)

  FDs:  (Student, Course) -> Instructor
           a student takes a given course from exactly one instructor
        Instructor -> Course
           each instructor teaches exactly one course

  CANDIDATE KEYS:
     (Student, Course)      determines Instructor, so everything
     (Student, Instructor)  determines Course via FD2, so everything

  PRIME ATTRIBUTES: Student, Course, Instructor   <- ALL OF THEM

  TEST  Instructor -> Course
     is Instructor a superkey?   NO
        (one instructor teaches many students, so it does not
         determine Student)
     is Course prime?            YES
        (part of the candidate key (Student, Course))

     -> 3NF SATISFIED, by the second clause
     -> BCNF VIOLATED, determinant is not a superkey
```

```text
What the violation costs, which is not pedantry:

  Student | Course    | Instructor
  --------+-----------+-----------
  arun    | Physics   | rao
  bela    | Physics   | rao
  chitra  | Physics   | rao          <- "rao teaches Physics" is a
  arun    | Chemistry | iyer            fact about RAO ALONE, stored
                                        ONCE PER STUDENT HE TEACHES

  UPDATE ANOMALY    rao moves to Astronomy -> three rows must change.
                    miss one and the table asserts rao teaches TWO
                    subjects, which the business rules forbid.

  DELETION ANOMALY  all of rao's students withdraw -> the fact that
                    rao teaches Physics disappears entirely.

  INSERTION ANOMALY a new instructor with no students yet cannot be
                    recorded at all, because Student is part of every
                    candidate key.
```

```sql
-- The BCNF decomposition, and the constraint it destroys
CREATE TABLE instructor_course (
    instructor TEXT PRIMARY KEY,        -- Instructor -> Course,
    course     TEXT NOT NULL            -- ENFORCED by the PK
);

CREATE TABLE student_instructor (
    student    TEXT,
    instructor TEXT REFERENCES instructor_course(instructor),
    PRIMARY KEY (student, instructor)
);

-- LOSSLESS? yes.
--   the common attribute is `instructor`, which is a SUPERKEY of
--   instructor_course because Instructor -> Course.
--   the lossless-join condition is satisfied directly, so the join
--   reproduces Teaching exactly.

-- DEPENDENCY-PRESERVING? NO.
--   (Student, Course) -> Instructor now SPANS BOTH TABLES:
--   student lives in one, course lives in the other.
--   NO SINGLE TABLE CONTAINS BOTH, so no constraint in either can
--   enforce it.

-- the concrete consequence:
INSERT INTO instructor_course VALUES ('rao', 'Physics'),
                                     ('menon', 'Physics');
INSERT INTO student_instructor VALUES ('arun', 'rao'),
                                      ('arun', 'menon');
-- arun now has TWO instructors for Physics. The schema permits it.
-- Nothing is violated. The original table could not have stored this.
```

```text
The theorems that make this a real trade rather than a preference:

  1. EVERY relation has a LOSSLESS AND DEPENDENCY-PRESERVING 3NF
     decomposition.
     (constructive: the SYNTHESIS ALGORITHM builds one from a
      minimal cover)

  2. EVERY relation has a LOSSLESS BCNF decomposition.

  3. NOT every relation has a DEPENDENCY-PRESERVING BCNF
     decomposition.
     (Teaching is the counterexample, and it proves there is no
      clever alternative split)

  so you are choosing between two things you CANNOT BOTH HAVE:

     BCNF   eliminates ALL redundancy from functional dependencies
            may cost you the ability to DECLARATIVELY ENFORCE a rule

     3NF    every dependency stays ENFORCEABLE IN ONE TABLE
            may leave redundancy, with the three anomalies
```

```text
Deciding in practice:

  PREFER 3NF   when the unenforceable dependency is an IMPORTANT
               BUSINESS RULE. A rule the database cannot check is a
               rule that will eventually be violated.

  PREFER BCNF  when the redundancy is causing REAL ANOMALIES and the
               lost dependency can be enforced acceptably another
               way, or is unlikely to be violated.

  the workarounds for a lost dependency, all WEAKER than a
  declarative constraint because they can be bypassed or can race:
     a TRIGGER
     APPLICATION-level checking
     a MATERIALISED VIEW carrying a unique constraint

  and notice this is RARE: overlapping candidate keys are uncommon,
  so almost every schema is in BCNF as soon as it is in 3NF.
  Saying so is part of a complete answer, not a hedge.
```

```text
Where it continues, briefly:

  4NF    MULTIVALUED DEPENDENCIES: independent multi-valued facts
         about one entity stored together, producing a Cartesian
         product of rows
         e.g. a person's phone numbers and their skills in one table
              -> 3 phones x 4 skills = 12 rows for 7 facts

  5NF    JOIN DEPENDENCIES: a relation reconstructible only from
         THREE OR MORE projections

  DKNF   the theoretical limit: every constraint a consequence of
         domain and key constraints alone. Not generally achievable.

  in practice schemas stop at 3NF or BCNF, and the higher forms
  matter when a table genuinely stores independent multi-valued facts.
```

---

### What they ask next

**"State BCNF in one sentence."**
Every non-trivial functional dependency must have a superkey as its determinant. It is 3NF with the prime-attribute exemption removed.

**"When do 3NF and BCNF actually differ?"**
Only when a relation has an FD whose determinant is not a superkey but whose dependent is a prime attribute, which requires multiple overlapping candidate keys. That is uncommon, so most schemas are in BCNF as soon as they are in 3NF.

**"Why can the `Teaching` example not be decomposed better?"**
Because it is a proven counterexample: no lossless BCNF decomposition of it preserves `(Student, Course) -> Instructor`. The theorem says a dependency-preserving BCNF decomposition does not always exist, and this relation is the demonstration.

**"What exactly is lost when you decompose it?"**
The ability for the database to enforce that a student has one instructor per course. After the split, `Student` and `Course` are in different tables, so no declarative constraint can see both, and the rule must move to a trigger, application code or a materialised view.

**"Is 3NF's redundancy actually harmful?"**
Yes. In `Teaching`, "this instructor teaches this course" is repeated once per student, which produces all three anomalies: a partial update makes the table assert two courses for one instructor, deleting the last student loses the fact entirely, and an instructor with no students cannot be stored at all.

**"Which would you choose?"**
It depends on whether the lost dependency is an important business rule. If the database must enforce it, stay at 3NF and accept the redundancy with a reconciliation plan. If the redundancy is producing real anomalies and the rule can be protected another way, go to BCNF.

**"What is a prime attribute?"**
An attribute belonging to **some** candidate key, not necessarily the primary one. It is the hinge of the whole distinction: 3NF forgives a non-superkey determinant when what it determines is prime, and BCNF does not.

**"What comes after BCNF?"**
4NF for multivalued dependencies, where independent multi-valued facts about one entity produce a Cartesian product of rows; 5NF for join dependencies needing three or more projections; and DKNF as the theoretical limit. Real schemas stop at 3NF or BCNF.

**The common wrong answer** is "BCNF is a stricter 3NF", which is true and empty. The answer needs the **exact clause that differs**, the recognition that it can only matter with **overlapping candidate keys**, a worked example showing a relation that satisfies one and not the other, and the **theorem** that a dependency-preserving BCNF decomposition does not always exist, which is what makes the trade unavoidable rather than a matter of care.

---

### Say this in the interview

*"3NF says that for every non-trivial functional dependency X determines A, either X is a superkey or A is a prime attribute, meaning it belongs to some candidate key. BCNF removes that second clause entirely: every determinant must be a superkey, full stop. So every BCNF relation is in 3NF, and the converse fails only when there is an FD whose determinant is not a superkey but whose dependent is prime, which requires multiple overlapping candidate keys. That is uncommon, so in practice most schemas reach BCNF the moment they reach 3NF, and knowing when that is not true is really what the question is about.*

*The canonical example is Teaching with Student, Course and Instructor, where a student takes a given course from exactly one instructor, so Student plus Course determines Instructor, and each instructor teaches exactly one course, so Instructor determines Course. The candidate keys are Student plus Course and Student plus Instructor, which makes all three attributes prime. Now test Instructor determines Course: Instructor is not a superkey, because one instructor teaches many students, so it does not determine Student. But Course is prime, being part of the candidate key Student plus Course. So 3NF is satisfied by the second clause and BCNF is violated.*

*That violation is not pedantry. The fact that an instructor teaches a course depends on the instructor alone, yet it is stored once per student they teach. So you get all three anomalies: an update anomaly, where moving an instructor to a different subject means changing every one of their rows and missing one makes the table assert two subjects; a deletion anomaly, where all their students withdrawing erases the fact that they teach the subject at all; and an insertion anomaly, where an instructor with no students yet cannot be recorded, because Student is part of every candidate key.*

*The only lossless BCNF decomposition is Instructor with Course, and Student with Instructor. It is lossless because the common attribute, Instructor, is a superkey of the first table, since Instructor determines Course, which satisfies the lossless-join condition directly. But it is not dependency-preserving, and that is the whole point: Student plus Course determines Instructor now spans both tables, with Student in one and Course in the other, so no single table contains both and no constraint in either can enforce it. Concretely, the database can no longer prevent a student being recorded with two instructors for the same course, and you are left with a trigger, application code or a materialised view with a unique constraint, all weaker than a declarative constraint because they can be bypassed or can race.*

*The theorems are what make this a genuine trade. Every relation has a lossless and dependency-preserving 3NF decomposition, built constructively by the synthesis algorithm from a minimal cover. Every relation has a lossless BCNF decomposition. But not every relation has a dependency-preserving BCNF decomposition, and Teaching is the counterexample proving there is no cleverer split. So BCNF eliminates all redundancy arising from functional dependencies and may cost you the ability to enforce a rule declaratively, while 3NF keeps every dependency enforceable in one table and may leave redundancy with the anomalies that follow.*

*Deciding in practice, I would prefer 3NF when the unenforceable dependency is an important business rule, because a rule the database cannot check will eventually be violated, and BCNF when the redundancy is causing real anomalies and the rule can be protected another way or is unlikely to be broken. And I would point out that the situation is rare, since overlapping candidate keys are uncommon. Beyond BCNF there is 4NF for multivalued dependencies, 5NF for join dependencies needing three or more projections, and DKNF as the theoretical limit, but real schemas stop at 3NF or BCNF."*
