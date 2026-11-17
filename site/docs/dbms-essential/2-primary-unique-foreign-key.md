---
id: 2-primary-unique-foreign-key
title: "Primary Key vs. Unique Key vs. Foreign Key"
description: "Identity, an extra promise of uniqueness, and a pointer the database refuses to let dangle"

sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a Primary Key, Unique Key, and Foreign Key? When should you choose a Surrogate Key over a Natural Key, and why is it critical in production to manually index Foreign Key columns?"

---

### Picture it

A school keeps a register of students.

**The primary key is the roll number.** It exists for one purpose: to identify a student with no ambiguity. Every student has one, nobody shares one, and nobody may be entered without one. There is exactly one roll number scheme, because having two competing ways to identify the same student is how records get merged wrongly.

**A unique key is a different promise about a different column.** The school also wants no two students to share an email address. That is a genuine rule worth enforcing, but it is not how students are identified: a new student may not have given an email yet, and a blank is acceptable. So the rule is "no duplicates", not "everybody must have one", and the school can have several such rules at once.

**A foreign key is a reference the office refuses to let go stale.** The library's borrowing records say "roll number 4471 has this book". The office will not let anybody write down a roll number that does not exist, and will not let you delete student 4471 while the library still points at them without first telling it what should happen to those records. The reference is **checked**, not merely written.

**Now the choice that causes real arguments.** Should the roll number be something meaningful, like the student's email address, or a meaningless number? Meaningful looks tidier, until a student changes their email. Now every record anywhere in the school that referred to them by email is wrong, and you must find and rewrite every one of them. A meaningless number never changes, because it was never about anything.

**And the thing that silently destroys performance.** The office indexes the register by roll number, naturally. But the library's own ledger, which lists roll numbers, is just a pile of pages in the order they were written. So when you delete a student, the office must check whether the library still refers to them, and that means **reading the entire library ledger, page by page**. Every delete. Nobody notices until the ledger is thick.

---

### The proper terms

#### Primary key

A **primary key** uniquely identifies every row in a table. It enforces **entity integrity**.

Its properties:

**Implicitly NOT NULL.** Uniqueness is not enough; identity requires a value, and this is enforced whether or not you declare it.

**Exactly one per table.** There can be only one answer to "what identifies this row".

**Backed by an index automatically**, so lookups by it are fast. In MySQL's **InnoDB** and in SQL Server by default it becomes the **clustered index**, so it also determines the physical row order. In **PostgreSQL** it is a plain unique index, because Postgres does not cluster tables.

It may be **composite**, made of several columns together, which is normal in junction tables.

#### Unique key

A **unique key**, declared as a **UNIQUE** constraint, enforces that no two rows share a value. It is also called an **alternate key**.

The differences from a primary key are precise:

**It permits NULL.** This is the headline difference. Because **NULL is not equal to NULL** in SQL, multiple NULLs do not count as duplicates, so PostgreSQL, MySQL and Oracle all allow many rows with NULL in a unique column. SQL Server is the odd one out, permitting only one.

**There may be many per table.** A table can require a unique email, a unique phone number and a unique employee code simultaneously.

**It is a business rule, not identity.** It says "no duplicates here", not "this is how rows are addressed".

It is also backed by a **unique index**, which is how the constraint is actually enforced, so it speeds up lookups too.

#### Foreign key

A **foreign key** is a column, or set of columns, whose values must exist as a primary or unique key in a **referenced** table, which may be the same table for a hierarchy. It enforces **referential integrity**.

Its properties are almost the inverse of a primary key's:

**Duplicates are allowed**, and are the normal case: many orders per customer.

**NULL is allowed**, and means "no relationship", which is how an optional association is modelled.

**Many per table** are allowed.

**It is not indexed automatically** by most engines, which is the subject of the last part of this question.

The constraint also carries **referential actions** for what happens when the parent changes: **CASCADE** propagates the delete or update to the children, **SET NULL** clears the reference, **SET DEFAULT** replaces it, and **RESTRICT** or **NO ACTION** refuses the parent operation while children exist, which is the default.

#### Surrogate versus natural keys

A **natural key** has business meaning: an email address, an ISBN, a vehicle registration, an ISO country code.

A **surrogate key** is artificial and meaningless: an **auto-increment** integer, a **sequence** value, a **UUID**.

Choose a **surrogate** key when any of these hold, and in practice at least one usually does:

**The natural key can change.** This is the decisive argument. People change email addresses and phone numbers, companies rename products, countries change codes. A changing primary key means every foreign key referencing it must change too, so you are relying on `ON UPDATE CASCADE` to rewrite rows across the schema for what is only an edit to one attribute.

**The natural key is wide or composite.** Secondary indexes in a clustered table store the primary key as their row pointer, so a 60-byte composite key is copied into every secondary index on the table, inflating all of them and the pages they occupy.

**The natural key may not be known at insert time**, or may not exist at all for some rows.

**The natural key is sensitive.** Using a national identity number as a primary key propagates it into every child table and every log, which is a privacy problem created by a schema decision.

**Its uniqueness is only promised, not guaranteed.** Real-world identifiers get reissued, mistyped and duplicated more often than their specifications claim.

Choose a **natural** key when it is genuinely **immutable and standardised**, such as an ISO country code in a small lookup table, where it also saves a join.

The standard production answer is **both**: a surrogate primary key for stable identity, plus a **UNIQUE constraint on the natural key** so the business rule is still enforced by the database. That gives stability and correctness instead of trading one for the other.

One caution on the surrogate's form. A random **UUIDv4** as a clustered primary key inserts into random positions in the index, causing **page splits** and **fragmentation** and destroying the sequential write pattern that monotonic integers give. **UUIDv7** and **ULID** are time-ordered and avoid this, which is why they exist.

#### Why you must index foreign key columns yourself

The fact that surprises people: **declaring a foreign key does not create an index on the referencing column** in **PostgreSQL**, **SQL Server** or **Oracle**. MySQL's InnoDB is the exception and creates one automatically. So on most engines a foreign key is a constraint with no supporting index on the child side, while the parent side is indexed because its primary key is.

The consequences are severe and all stem from the same mechanism. Every time a parent row is deleted or its key updated, the engine must verify that no child row still references it, and without an index that check is a **full table scan of the child table**, once per affected parent row.

**Deletes degrade to a scan per row.** Deleting 1000 parent rows from a child table of 50 million means 1000 full scans. The delete looks simple and runs for hours.

**Cascades are worse.** `ON DELETE CASCADE` has to find the children before it can delete them, so the same scan happens and then does work.

**Lock contention and deadlocks.** A full scan touches far more child rows than necessary and takes locks along the way, so unrelated transactions block and the deadlock rate rises. This is how a missing index becomes an availability problem rather than merely a slow one.

**Joins have nothing to use.** Joining child to parent on the foreign key is the most common join in any schema, and without the index the planner is pushed towards a hash or merge join over the whole table.

The rule to state plainly: **index every foreign key column unless you can show it is never used for deletes, cascades or joins**, which is almost never true.

---

### In code

```sql
-- The three constraints together
CREATE TABLE customers (
    id        BIGSERIAL PRIMARY KEY,         -- surrogate, stable identity
    email     TEXT        UNIQUE NOT NULL,   -- natural key, enforced as a rule
    phone     TEXT        UNIQUE,            -- NULL allowed, many NULLs allowed
    country   CHAR(2)     NOT NULL
);

CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL
                REFERENCES customers(id) ON DELETE RESTRICT,
    coupon_id   BIGINT                        -- NULL = no coupon applied
                REFERENCES coupons(id) ON DELETE SET NULL,
    placed_at   TIMESTAMPTZ NOT NULL
);

-- THE LINE PEOPLE FORGET. Postgres, SQL Server and Oracle do NOT
-- create this for you. MySQL InnoDB does.
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_coupon_id   ON orders (coupon_id);
```

```text
The three keys, side by side:

                    PRIMARY KEY      UNIQUE KEY        FOREIGN KEY
  purpose           identity         a business rule   a valid reference
  NULL allowed      no, implicitly   yes (NULL != NULL) yes = no relationship
  duplicates        no               no                 yes, normally
  how many          exactly one      many               many
  indexed for you   yes              yes                NO, except MySQL
  integrity type    entity           uniqueness         referential

  Note the NULL row: it is the cleanest way to tell a primary key
  from a unique key, since both forbid duplicates.
```

```sql
-- Why a mutable natural key hurts: the edit spreads
-- natural key as the primary key
CREATE TABLE users (email TEXT PRIMARY KEY, name TEXT);
CREATE TABLE posts (email TEXT REFERENCES users(email) ON UPDATE CASCADE,
                    body  TEXT);
CREATE TABLE likes (email TEXT REFERENCES users(email) ON UPDATE CASCADE,
                    post  BIGINT);

UPDATE users SET email = 'new@x.com' WHERE email = 'old@x.com';
-- one attribute changed, and the engine must now rewrite every
-- referencing row in posts, likes and anything else, plus every
-- index entry on those columns. One edit, a schema-wide update.

-- surrogate key: the same edit touches exactly one row
CREATE TABLE users2 (id BIGSERIAL PRIMARY KEY,
                     email TEXT UNIQUE NOT NULL,   -- rule still enforced
                     name  TEXT);
UPDATE users2 SET email = 'new@x.com' WHERE id = 7;   -- one row, done
```

```text
What a missing foreign key index actually costs:

  DELETE FROM customers WHERE id = 42;

  the engine must answer: "does any order reference customer 42?"

  WITH an index on orders(customer_id)
      index seek -> a handful of pages -> done in microseconds
      locks taken: the matching rows only

  WITHOUT it
      full table scan of orders (50 million rows)
      per deleted parent row
      -> deleting 1000 customers = 1000 full scans
      -> locks taken across the scanned rows
      -> unrelated transactions block, deadlock rate rises

  ON DELETE CASCADE is worse: it must FIND the children first,
  so the same scan happens and then real work follows.
```

---

### What they ask next

**"Can a primary key contain NULL?"**
No, never. It is implicitly NOT NULL even if you do not write it, because identity requires a value. This is the single cleanest difference from a unique key.

**"Why can a unique column hold several NULLs?"**
Because SQL uses three-valued logic and `NULL = NULL` evaluates to unknown rather than true, so two NULLs are not duplicates. PostgreSQL, MySQL and Oracle follow this; SQL Server allows only one NULL, which is a deviation from the standard.

**"Can a foreign key reference a unique key rather than a primary key?"**
Yes. It must reference a column set with a uniqueness guarantee, which a UNIQUE constraint provides. Referencing the primary key is simply the usual case.

**"What is the risk of ON DELETE CASCADE?"**
It silently deletes far more than the statement names. One delete can remove rows from many tables several levels deep, and without an index on each child's foreign key it does so very slowly. Many teams prefer RESTRICT and an explicit deletion routine for exactly that reason.

**"Why are random UUIDs a poor clustered primary key?"**
Because inserts land at random positions in the index, so pages split constantly, the index fragments, and the write pattern turns random. Time-ordered forms such as UUIDv7 or ULID restore append-like behaviour while keeping the global uniqueness.

**"Do I still need a unique constraint on the natural key if I use a surrogate?"**
Yes, and leaving it out is the usual mistake. Without it the database will happily store two customers with the same email, since the surrogate keys differ. The surrogate provides identity; the unique constraint provides the business rule.

**The common wrong answer** is "a primary key is unique and not null, a unique key is unique and can be null", stopping there. That is correct but incomplete: the primary key also defines **how other tables reference this one** and often the **physical row order**, which is why its choice has consequences across the whole schema.

---

### Say this in the interview

*"A primary key uniquely identifies every row and enforces entity integrity. It is implicitly NOT NULL because identity needs a value, there is exactly one per table, and it is indexed automatically, becoming the clustered index in MySQL's InnoDB and in SQL Server, while in PostgreSQL it is a plain unique index. It may be composite.*

*A unique key, declared as a UNIQUE constraint and also called an alternate key, enforces that no two rows share a value. The headline difference is that it permits NULL, and because NULL is not equal to NULL, PostgreSQL, MySQL and Oracle allow many NULLs, with SQL Server allowing only one. You can have many unique keys per table, and it expresses a business rule rather than identity. It is enforced by a unique index.*

*A foreign key is a column whose values must exist as a primary or unique key in a referenced table, and it enforces referential integrity. It allows duplicates, which is the normal case, allows NULL to mean no relationship, and there can be many per table. It carries referential actions: CASCADE, SET NULL, SET DEFAULT, and RESTRICT or NO ACTION, which is the default.*

*On keys: a natural key has business meaning, like an email or an ISBN, and a surrogate key is artificial, like an auto-increment integer, a sequence or a UUID. I would pick a surrogate when the natural key can change, which is the decisive argument, because a changing primary key forces every referencing row in the schema to be rewritten for what is only an attribute edit; when the natural key is wide or composite, since in a clustered table every secondary index stores the primary key as its row pointer; when it is not known at insert time; when it is sensitive, like a national identity number you would otherwise propagate into every child table; or when its uniqueness is only promised rather than guaranteed. A natural key is fine when it is genuinely immutable and standardised, like an ISO country code in a lookup table. The production answer is both: a surrogate primary key for stable identity plus a unique constraint on the natural key so the rule is still enforced. And I would avoid random UUIDv4 as a clustered key, because random inserts cause page splits and fragmentation, which is why time-ordered UUIDv7 or ULID exist.*

*Foreign key columns need manual indexes because PostgreSQL, SQL Server and Oracle do not create one for you, and only MySQL InnoDB does. The parent side is indexed because it is the primary key; the child side is not. So every delete or key update on the parent must verify no child references it, and without an index that is a full table scan of the child table once per affected parent row. Deleting a thousand parents from a fifty-million-row child table means a thousand full scans, cascades are worse because they must find the children first, and the scans take locks on far more rows than necessary, so unrelated transactions block and deadlocks rise. Joins on the foreign key, which are the most common joins in the schema, also have nothing to use. So the rule is: index every foreign key column unless you can prove it is never used for deletes, cascades or joins."*
