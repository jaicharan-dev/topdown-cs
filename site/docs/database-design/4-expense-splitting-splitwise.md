---
id: 4-expense-splitting-splitwise
title: "Design Splitwise: Expense Splitting & Debt Simplification"
description: "A full schema-design interview for Splitwise, worked one decision at a time: why each table exists, why each column has the type it does, and how the design survives settlements, rounding, audit history, multi-currency, cached balances, indexing and sharding."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

---

### How to read this page

The schema at the bottom of this page is not the answer. The answer is the order the
decisions were made in, and what each one cost.

An interviewer asking you to "design the database for Splitwise" is not checking whether
you can recite five table names. They are watching whether you start small, whether you
can defend a column type when pushed, and whether you notice that a new requirement has
just invalidated something you wrote five minutes ago. So this page moves one decision at
a time. Every table and almost every column gets a short "why this and not that".

---

### Step 1 — Pin down what we are building

**Interviewer:** Design the database for an expense-sharing app like Splitwise. People
create groups, add expenses, and settle up with each other. Where do you start?

**Candidate:** Not with tables — with the handful of questions whose answers actually
change the schema. Let me ask five.

First: if two friends split a coffee, is that a group of two, or is there a separate
"direct expense between two people" concept?

**Interviewer:** Treat it as a group of two. Every expense belongs to a group.

**Candidate:** That's worth a lot. The alternative — expenses that sometimes point at a
group and sometimes at a pair of users — means a nullable `group_id`, a second pair of
columns for the direct case, and every query having to handle both shapes forever. One
uniform path instead.

Second: who computes the split? If a bill is split 40/35/25 by percentage, does the
database store the percentages and derive the amounts, or does it store final amounts?

**Interviewer:** The client does the math. The database receives exact amounts.

**Candidate:** Good — that means the database stores *facts*, not *formulas*. If we stored
percentages, every balance query would have to recompute them, and a rounding rule change
would silently restate history. Storing resolved amounts means a bill reads the same in
five years as it did the day it was entered.

Third: can more than one person pay for the same bill? Alice puts \$60 on her card, Bob
adds \$40 cash?

**Interviewer:** Yes, that happens constantly.

**Candidate:** I'll note that loudly, because it is the single requirement most likely to
break a naive schema. I'm going to design the first version *without* it on purpose, so
you can watch where it breaks.

Fourth: currency. One currency per group, or can a group mix them?

**Interviewer:** A group has a default currency, but a single expense can be in another
one — people travel.

**Candidate:** So currency belongs on the expense, not just the group.

Fifth: scale and read/write mix?

**Interviewer:** About 50 million active users, and it is read-heavy — people check
balances roughly ten times for every expense they add.

**Candidate:** Ten-to-one read-heavy tells me where I'm allowed to spend. I can afford
redundancy that makes reads cheap, as long as writes stay correct.

> **Why this step matters.** Four of those five answers eliminate a design choice before
> it is made. Candidates who skip straight to `CREATE TABLE` end up relitigating these
> same questions twenty minutes later, with a schema already on the whiteboard.

---

### Step 2 — The first table: `users`

**Candidate:** I'll start with the one entity everything else points at.

**Interviewer:** Fine. What's in it?

**Candidate:** Let me build it a column at a time rather than hand you a finished block.

#### 2a. The primary key: natural or surrogate?

Email is unique and already identifies a person, so it is tempting as the primary key.
I won't use it, for three reasons:

- **Emails change.** If the PK changes, every foreign key referencing it has to change
  too. You are now relying on `ON UPDATE CASCADE` rewriting rows across half the database
  because somebody switched jobs.
- **It is wide.** An email averages ~24 bytes against 8 for a `BIGINT`. That width is
  copied into every foreign key column and every index that includes it.
- **It is PII.** A natural key spreads the user's email into `expense_splits`,
  `group_members`, and every index on them. Deleting a user properly becomes much harder.

So: a surrogate key, with `email` kept as a separate unique constraint.

#### 2b. Which surrogate? `BIGINT` vs UUID

This is the question interviewers push on, so it's worth having a real answer.

| | `BIGINT` identity | `UUID` v4 (random) | `UUID` v7 (time-ordered) |
|---|---|---|---|
| **Size** | 8 bytes | 16 bytes | 16 bytes |
| **Insert locality** | Always appends to the right edge of the B-tree | Lands anywhere — causes page splits and random I/O | Appends, like `BIGINT` |
| **Generated by** | Database | Anyone, before the insert | Anyone, before the insert |
| **Leaks information** | Yes — row counts, signup order | No | Creation time only |

The size difference sounds trivial until you remember it is paid in *every* index. A
random UUID also destroys insert locality: rows arrive in random key order, so the index's
rightmost pages are no longer the hot ones and the buffer cache stops helping you.

**Decision:** `BIGINT GENERATED ALWAYS AS IDENTITY`. If we later need IDs that are safe to
expose in URLs, I'd add a separate opaque `public_id` rather than making the primary key
do both jobs. If this were a multi-master or offline-first system where clients must mint
IDs before they reach the server, I'd switch to UUIDv7 — ordered, so it keeps the write
pattern that makes `BIGINT` fast.

#### 2c. `email`

`VARCHAR(320)` — 64 characters for the local part plus `@` plus 255 for the domain, which
is the limit RFC 5321 actually specifies. Picking 320 rather than a round 255 signals the
cap is a real constraint rather than a guess.

Two details that matter more than the length:

- **The unique constraint lives in the database, not the application.** An app-level
  "check if the email exists, then insert" is a race: two concurrent signups both pass the
  check, both insert, and now the user has two accounts. Only a unique index is atomic.
- **Uniqueness has to be case-insensitive.** `Alice@x.com` and `alice@x.com` are the same
  mailbox. In Postgres that's either the `CITEXT` type or a unique index on
  `lower(email)`. Without it, the constraint is there but does not do what you think.

#### 2d. `display_name`

`TEXT` with a length `CHECK`. In Postgres `VARCHAR(n)` and `TEXT` are stored identically
and perform identically — the `(n)` is a constraint, nothing more. I use `VARCHAR(n)` when
the cap is a genuine business rule and `TEXT` otherwise. (This is Postgres-specific; in
MySQL `VARCHAR` and `TEXT` really do store differently, and `TEXT` can't be indexed without
a prefix length.)

#### 2e. `created_at`

`TIMESTAMPTZ`, never `TIMESTAMP`.

A bare `TIMESTAMP` in Postgres stores the wall-clock digits and throws the offset away —
so `14:00` recorded in Berlin and `14:00` recorded in Mumbai compare as equal. `TIMESTAMPTZ`
normalises to UTC on write and renders in the session's zone on read. For an app whose
entire premise is people splitting costs on holiday in another country, that is not
optional.

#### 2f. `deleted_at`

Soft delete, because user rows are referenced by financial history. If Bob deletes his
account while still owing Alice \$40, hard-deleting the row either destroys the record of
that debt or breaks the foreign key. Nulling the timestamp out means "active"; setting it
means "hidden from the UI, still referentially intact".

```sql
CREATE TABLE users (
    user_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(320) NOT NULL,
    display_name  TEXT         NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

-- Case-insensitive uniqueness, enforced by the database rather than by the app.
CREATE UNIQUE INDEX users_email_lower_uniq ON users (lower(email));
```

---

### Step 3 — `groups`

**Candidate:** A group is just a container that expenses hang off, so it stays small.

- `group_id` — same `BIGINT` identity reasoning as above.
- `name` — `VARCHAR(100)`. Here the cap *is* a business rule: it's a label in a list view.
- `created_by` — `BIGINT` referencing `users`. Worth keeping even though
  `group_members` will also contain this person, because "who started this group" is an
  audit fact that survives them leaving.
- `default_currency` — `CHAR(3)`, an ISO 4217 code like `USD`, `INR`, `JPY`. Fixed width,
  so `CHAR` is honest here; this is one of the few places it beats `VARCHAR`.
- `created_at` — `TIMESTAMPTZ`.

**Interviewer:** What happens to a group when the person who created it deletes their
account?

**Candidate:** Nothing — and that's deliberate. The foreign key is `ON DELETE RESTRICT`.
Combined with the soft delete from Step 2, a user who is referenced anywhere simply cannot
be hard-deleted. The group outlives its creator, which is what users expect: your holiday
group doesn't evaporate because one person left the app.

```sql
CREATE TABLE groups (
    group_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    created_by       BIGINT       NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    default_currency CHAR(3)      NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

### Step 4 — `group_members`, and why it is its own table

**Interviewer:** How do you connect users to groups? Why not just keep a list of user IDs
in a column on `groups`?

**Candidate:** Three things break if I do that.

- **Lookups go the wrong way.** "Which groups is Bob in?" would mean scanning every group
  row and searching inside its list. With a junction table it's an index seek.
- **There is no referential integrity inside an array.** The database cannot enforce that
  every ID in that list is a real user. Delete a user and you get a dangling ID with no
  foreign key to catch it.
- **There is nowhere to put per-membership facts.** When did Bob join? Is he an admin? Has
  he left? Those are properties of the *relationship*, not of the user or the group, and a
  bare list of IDs has no room for them.

So: a junction table, which is the standard resolution of a many-to-many.

#### 4a. Composite key or surrogate?

The pair `(group_id, user_id)` is already unique and already immutable — exactly what a
primary key wants to be. A surrogate `membership_id` would add 8 bytes and still require a
unique constraint on the pair to prevent duplicate memberships. So: composite PK, no
surrogate.

#### 4b. The column order in that key is a real decision

A composite index can only be used left-to-right — the *leftmost prefix* rule. An index on
`(group_id, user_id)` can answer "give me everything with this `group_id`", but it cannot
efficiently answer "give me everything with this `user_id`", because `user_id` values are
scattered across the whole index.

Both questions get asked constantly here:

- "Who is in this group?" → needs `group_id` first.
- "Which groups is Bob in?" → needs `user_id` first.

So the primary key is `(group_id, user_id)` and I add a second index on `(user_id, group_id)`.
That second one is a *covering* index for the membership lookup: both columns it needs are
in the index, so the query never has to touch the table at all.

#### 4c. `left_at`, for the same reason as `deleted_at`

Someone who leaves a group with an unsettled balance cannot simply have their row removed —
the debt is still real. `left_at` hides them from the member list while keeping every
expense they were part of intact and attributable.

```sql
CREATE TABLE group_members (
    group_id   BIGINT      NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users(user_id)   ON DELETE RESTRICT,
    role       TEXT        NOT NULL DEFAULT 'member'
                           CHECK (role IN ('member', 'admin')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at    TIMESTAMPTZ,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX group_members_by_user ON group_members (user_id, group_id);
```

Note the two different delete rules on one table. `ON DELETE CASCADE` from `groups` is
right — if a group is genuinely deleted, its membership rows are meaningless. `ON DELETE
RESTRICT` from `users` is right for the reason in Step 2: people who appear in financial
history don't get erased.

---

### Step 5 — A deliberately naive `expenses` table

**Candidate:** Now the interesting table. I'm going to write the version almost everyone
writes first, with one payer and an equal split, and then let you break it.

**Interviewer:** Go ahead.

#### 5a. The money column is the one to get right

Before the table — how do we store an amount?

**Never `FLOAT` or `DOUBLE`.** Binary floating point cannot represent `0.1` exactly, so
`0.1 + 0.2` evaluates to `0.30000000000000004`. In an app whose entire job is making
columns of numbers add up to zero, a representation that cannot hold a tenth is
disqualifying. Those errors compound over thousands of rows until a group's balances
mysteriously fail to net out.

That leaves two defensible options:

| | `NUMERIC(14,2)` | Integer minor units (`BIGINT` cents) |
|---|---|---|
| **Exact?** | Yes — base-10, arbitrary precision | Yes — integers |
| **Arithmetic** | Slower (software decimal) | Fastest path there is |
| **Reads naturally** | `42.50` | `4250`, needs scaling everywhere |
| **Multi-currency** | Scale of 2 is baked in | Exponent travels with the currency code |

The multi-currency row is the one that bites. A scale of 2 quietly assumes every currency
has two decimal places — but Japanese yen has zero and Kuwaiti dinar has three. `NUMERIC(14,2)`
would store ¥1000 as `1000.00`, which is harmless, but it cannot represent a Kuwaiti dinar
amount to its real precision.

**Decision:** `NUMERIC(14,2)` for now, and I'll flag it. Our clarification said currency is
per-expense, so the day we take Kuwaiti dinar seriously, the fix is to widen the scale to
`NUMERIC(16,3)` or move to minor units plus the ISO 4217 exponent. I'd rather name the
limitation than pretend it isn't there. The precision of 14 gives us up to about
999 billion — far past any dinner bill, with room for currencies where a coffee costs
50,000 units.

#### 5b. The rest of the columns

- `expense_id` — `BIGINT` identity.
- `group_id` — `BIGINT` FK. Non-null, because Step 1 settled that every expense has a group.
- `paid_by_user_id` — `BIGINT` FK. **This is the column that will not survive.**
- `total_amount` — `NUMERIC(14,2)`, with `CHECK (total_amount > 0)`. Refunds get modelled
  separately rather than as negative expenses, so the sign stays meaningful.
- `currency` — `CHAR(3)`, per Step 1. Defaults from the group but is stored on the row,
  because the group's default can change later and must not restate old expenses.
- `description` — `VARCHAR(255)`.
- `expense_date` — `DATE`, separate from `created_at`. People enter Saturday's dinner on
  Monday, and the bill belongs to Saturday. `created_at TIMESTAMPTZ` records when the row
  was written; `expense_date` records when the money was spent. Conflating them makes the
  group's timeline wrong.
- `created_by` — who *entered* it, which is not always who paid it.

```sql
-- Version 1. This is wrong in three ways we are about to discover.
CREATE TABLE expenses (
    expense_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id        BIGINT        NOT NULL REFERENCES groups(group_id),
    paid_by_user_id BIGINT        NOT NULL REFERENCES users(user_id),
    total_amount    NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
    currency        CHAR(3)       NOT NULL,
    description     VARCHAR(255),
    expense_date    DATE          NOT NULL,
    created_by      BIGINT        NOT NULL REFERENCES users(user_id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

**Interviewer:** How does this compute who owes what?

**Candidate:** It doesn't store that — it derives it. Alice pays \$100 in a group of four,
so the app reads four members from `group_members`, divides, and says Bob, Charlie and
David each owe Alice \$25.

---

### Step 6 — Break #1: not everyone is on every bill

**Interviewer:** All four roommates are in the group, but only Alice, Bob and Charlie went
out for pizza. Your schema charges David \$15 for food he never ate.

**Candidate:** You've found the assumption baked into Step 5: that group membership *is* the
participant list for every expense. It isn't. Membership is long-lived; participation is
per-expense.

The fix is to stop deriving participants and start storing them:

```sql
CREATE TABLE expense_participants (
    expense_id BIGINT NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(user_id)       ON DELETE RESTRICT,
    PRIMARY KEY (expense_id, user_id)
);
```

`ON DELETE CASCADE` from `expenses` is correct here, unlike on `group_members`: a
participant row has no meaning without its expense, and deleting an expense is a legitimate
user action.

Now the pizza inserts three rows, not four. \$60 over three participants is \$20 each, and
David is untouched.

> **The general lesson.** When a derived value stops being derivable from the data you
> have, the answer is a new relation — not a cleverer query. Candidates often try to patch
> this with a `participant_count` column on `expenses`, which tells you *how many* people
> but not *which*, and breaks again the moment the split is unequal.

---

### Step 7 — Break #2: the shares aren't equal

**Interviewer:** Charlie ordered the steak. He owes \$30 while Alice and Bob owe \$15 each.

**Candidate:** Listing participants is no longer enough — I need the amount per person.
The table grows a column:

```sql
ALTER TABLE expense_participants
    ADD COLUMN amount_owed NUMERIC(14,2) NOT NULL CHECK (amount_owed >= 0);
```

`>= 0` rather than `> 0`, because a zero share is legitimate — someone can be on a bill
they were comped from, and keeping the row records that they were present.

Notice what just happened to Step 1's second clarification. Because the client sends
resolved amounts, this one column absorbs *all* the split modes — equal, exact,
percentage, by shares. They are different UIs over the same stored fact. Had we chosen to
store percentages, we'd now need a `split_type` discriminator and a different
interpretation of the number per mode.

---

### Step 8 — Break #3: more than one person paid

**Interviewer:** Back to the thing you flagged in Step 1. Dinner is \$100: Alice pays \$60
on her card, Bob pays \$40 cash. Your `expenses` table has a single `paid_by_user_id`.

**Candidate:** A scalar column can hold one payer, so it has to go. Paying is not a
property of the expense — it is a property of a *person's involvement* in the expense,
which is exactly what `expense_participants` already models.

So the fix is not a new table. It's a second amount column on the one we have, and a
rename, because "participants" now undersells it:

```sql
ALTER TABLE expense_participants RENAME TO expense_splits;

ALTER TABLE expense_splits
    ADD COLUMN amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (amount_paid >= 0);

-- Two sources of truth is one too many.
ALTER TABLE expenses DROP COLUMN paid_by_user_id;
```

Dropping `paid_by_user_id` is the part people forget. Leaving it would mean the payer is
recorded in two places that can disagree, and sooner or later they will.

Each row now carries two numbers for one person on one bill:

- `amount_paid` — cash they actually put down.
- `amount_owed` — value they actually consumed.

**Interviewer:** Why both on one row? Why not a `payments` table and a `shares` table?

**Candidate:** Because in practice the same person does both — Alice paid \$60 *and* ate
\$20 of the food. Split across two tables, every balance query becomes a join plus two
aggregates plus a full outer join to catch people who appear in one side but not the other.
On one row it is a subtraction between adjacent columns.

This is the standard shape in ledger design: keep the credit and the debit on the same
record and the balance check stays trivial.

**Interviewer:** Show me the numbers.

**Candidate:** Dinner at \$100 — Alice paid \$60, Bob paid \$40; shares are Alice \$20,
Bob \$50, Charlie \$30.

| user | `amount_paid` | `amount_owed` | net = paid − owed |
|---|---:|---:|---:|
| Alice | 60.00 | 20.00 | **+40.00** |
| Bob | 40.00 | 50.00 | **−10.00** |
| Charlie | 0.00 | 30.00 | **−30.00** |
| | **100.00** | **100.00** | **0.00** |

Two invariants fall out, and both are worth enforcing rather than hoping for:

1. `SUM(amount_paid) = SUM(amount_owed) = expenses.total_amount` for every expense.
2. Therefore the net column always sums to exactly zero.

A single person's balance in a group is then one aggregate over their rows —
`SUM(amount_paid - amount_owed)` — with no joins at all.

**Interviewer:** You still have `total_amount` on `expenses`, but you just said it equals
the sum of the splits. Isn't that redundant?

**Candidate:** It is, and I'm keeping it on purpose. Step 1 told us reads outnumber writes
ten to one, and a list of a group's expenses wants the total on every row without
aggregating the splits for each one. That's a denormalisation bought with the read/write
ratio we were given.

The price is that it can drift, so it needs defending — a constraint checked when splits
change, or a trigger that recomputes it. I'd rather carry an enforced redundancy than pay
an aggregate on the hottest read path. If writes were the dominant load, I'd drop the
column and compute it.

```sql
CREATE TABLE expense_splits (
    expense_id  BIGINT        NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
    user_id     BIGINT        NOT NULL REFERENCES users(user_id)       ON DELETE RESTRICT,
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    amount_owed NUMERIC(14,2) NOT NULL           CHECK (amount_owed >= 0),
    PRIMARY KEY (expense_id, user_id)
);

-- Balances are read per user, so index that direction too.
CREATE INDEX expense_splits_by_user ON expense_splits (user_id, expense_id);
```

---

### Where the schema stands after eight steps

Five tables, and every one of them arrived because something specific forced it:

| Table | Why it exists |
|---|---|
| `users` | Identity that everything else references |
| `groups` | The container every expense belongs to (Step 1) |
| `group_members` | Many-to-many that an array column cannot express (Step 4) |
| `expenses` | The bill itself — amount, currency, date |
| `expense_splits` | Who was on the bill, what they paid, what they owed (Steps 6–8) |

And three columns we started with are already gone or changed: `paid_by_user_id` was
deleted, `expense_participants` was renamed, and the participant list stopped being derived
from group membership.

That churn is the point. A candidate who writes these five tables immediately and correctly
looks like someone who memorised the answer. A candidate who writes four, gets broken three
times, and repairs the design each time looks like someone who can do this on a problem
nobody has published a solution to.

**Still open, in the steps that follow:** settling up, the penny that won't divide by
three, edits and audit history, leaving a group mid-balance, making balance reads fast
without corrupting them, debt simplification, multi-currency, which invariants the database
can actually enforce, indexing, and where this schema stops fitting on one machine.

---

### Step 9 — Settlements: recording a repayment

**Interviewer:** Bob owes Alice \$10. He sends her \$10 outside the app and wants to record
it. How?

**Candidate:** The tempting answer is another `expenses` row — Bob paid \$10, Alice owed
\$10. The arithmetic works. I'd still reject it.

**Interviewer:** Why, if the numbers come out right?

**Candidate:** Because `expenses` answers a question that isn't "did money move". It
answers "what did this group consume". Every spending chart, every monthly summary, every
"you spent \$1,200 on this trip" aggregate reads that table. Settlements are not
consumption — they are the *unwinding* of consumption that was already recorded. Put them
in the same table and a group that spends \$500 and settles up looks like it spent \$1,000.

There's a sharper version of the same point. An expense is a claim about **value
consumed**; a settlement is a record of **cash transferred**. They have different
lifecycles, different edit rules, and different auditors. Two kinds of fact, two tables.

```sql
CREATE TABLE settlements (
    settlement_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id        BIGINT        NOT NULL REFERENCES groups(group_id),
    payer_id        BIGINT        NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    payee_id        BIGINT        NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency        CHAR(3)       NOT NULL,
    settled_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by      BIGINT        NOT NULL REFERENCES users(user_id),
    deleted_at      TIMESTAMPTZ,
    idempotency_key UUID          NOT NULL,

    CHECK (payer_id <> payee_id)
);

CREATE UNIQUE INDEX settlements_idem ON settlements (idempotency_key);
```

**Interviewer:** Walk me through that `idempotency_key`.

**Candidate:** This is the column I'd be most annoyed to have forgotten. Bob taps "Settle
up", the request succeeds server-side, the response is lost to a flaky train tunnel, and
his phone retries. Without a guard he has now paid Alice twice in the ledger and is \$10
further out of pocket on paper.

So the client generates a UUID per settlement *attempt* and sends it with the request. The
unique index means the second insert fails loudly instead of silently duplicating. The
server catches the violation and returns the original settlement.

This belongs in the schema rather than in the service layer because it's the same argument
as the email constraint in Step 2 — two concurrent retries can both pass an application-level
"have I seen this key?" check. Only a unique index is atomic.

**Interviewer:** Why `settled_at` separate from a created timestamp?

**Candidate:** Same reason `expense_date` was separate in Step 5. Bob hands over cash on
Friday and records it on Sunday. The balance timeline should follow the money, not the
data entry.

> **The alternative I'd mention but not build.** You can model expenses and settlements as
> one `ledger_entries` table in proper double-entry form: every row a signed amount against
> a (user, group) account, every transaction summing to zero. It is more elegant and it is
> what a real payments company would do. I'd flag it and move on, because for this product
> it buys uniformity at the cost of making the common query — "show me this group's
> spending" — filter out half its own table. The two-table split matches how the data is
> actually read.

---

### Step 10 — The penny that will not divide

**Interviewer:** Three friends split a \$10 lunch equally. \$10 / 3 = \$3.333…. What do you
store?

**Candidate:** First, let me kill a misconception I nearly built into Step 5. `NUMERIC`
being exact does **not** solve this. `NUMERIC` can represent `3.33` perfectly, and it can
represent `10.00` perfectly — but ten divided by three has no exact representation in base
ten either. Exactness and divisibility are different properties. No money type will save
you here.

So this is not a storage problem. It is an **allocation policy** problem, and someone has
to decide where the stray cent goes.

**Interviewer:** Where does it go?

**Candidate:** Store `3.34 / 3.33 / 3.33` — never three rows of `3.33`, which loses a cent
and quietly breaks the invariant from Step 8 that the splits sum to the total.

The allocation runs in the application, before the insert, using the **largest remainder**
method: divide down to whole cents, compute the leftover, and hand one extra cent to the
first *N* participants in a stable order. Stable matters — if the order came from a hash
map the same bill would allocate differently on each retry, and an edit would silently
move a cent between two people.

**Interviewer:** Which order?

**Candidate:** Ascending `user_id` is defensible and deterministic. Giving the remainder to
the payer is arguably fairer — they're already out of pocket. Either is fine as long as
it's documented and reproducible, because the question "why do I owe a cent more than
Bob?" does get asked.

**Interviewer:** Could the database do the division instead?

**Candidate:** It could, and I wouldn't let it. The moment the database derives shares,
those shares change if the rounding rule ever changes, which restates history. Step 1
already settled this: the client sends resolved amounts, the database stores facts. The
penny rule is just the sharpest example of why that boundary was worth drawing.

---

### Step 11 — Edits, deletes, and the audit trail

**Interviewer:** Alice realises last month's dinner was \$120, not \$100. She edits it.
What happens?

**Candidate:** This is where a naive `UPDATE` does real damage. Three things have to be
true afterwards.

The splits have to be rewritten, because the total changed and the old shares no longer sum
to it. Every cached balance derived from that expense has to move by the delta. And the old
version has to survive, because somebody may have *already settled up* against the old
number — Bob paid Alice \$25 on the strength of a \$100 dinner, and silently restating it
to \$120 makes his settlement look wrong without explaining why.

So edits are versioned, not overwritten:

```sql
ALTER TABLE expenses
    ADD COLUMN version    INTEGER     NOT NULL DEFAULT 1,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE TABLE expense_revisions (
    revision_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expense_id    BIGINT      NOT NULL REFERENCES expenses(expense_id),
    version       INTEGER     NOT NULL,
    snapshot      JSONB       NOT NULL,   -- the expense and its splits, as they were
    changed_by    BIGINT      NOT NULL REFERENCES users(user_id),
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (expense_id, version)
);
```

**Interviewer:** Why `JSONB` for the snapshot? You've been careful about types all the way
through and now you're dumping a blob.

**Candidate:** Fair challenge, and the answer is about access pattern rather than laziness.
A revision is never queried by its internals — nobody filters revisions by `amount_owed`.
It is read whole, to render "Alice changed the total from \$100 to \$120". A shadow table
mirroring every column would need migrating in lockstep with `expenses` forever, and would
still only ever be `SELECT *`-ed. If the product later wanted "show me every expense that
was edited after being settled", I'd promote the fields that query needs into real columns
and leave the rest in the blob.

**Interviewer:** And the `version` column?

**Candidate:** Optimistic concurrency. Two roommates open the same expense and both edit
it; the second write should not silently clobber the first. The update carries the version
it read:

```sql
UPDATE expenses
   SET total_amount = :new_total, version = version + 1, updated_at = now()
 WHERE expense_id = :id AND version = :version_the_client_read;
```

Zero rows affected means somebody got there first, and the client is told to reload rather
than told nothing. Pessimistic locking would also work, but holding a row lock across a
user's think-time is a good way to deadlock a mobile app.

**Interviewer:** And deletes?

**Candidate:** `deleted_at`, never `DELETE`. Same argument as Step 2, with teeth: an
expense that has been settled against cannot vanish without making the settlement
inexplicable. Reads filter on `deleted_at IS NULL`; balance recomputation ignores soft-deleted
rows; the audit trail keeps both the row and the revision that killed it.

---

### Step 12 — Leaving a group with a balance

**Interviewer:** Charlie moves out and hits "Leave group". He owes \$200.

**Candidate:** The membership row already has `left_at` from Step 4, so the mechanical part
is an `UPDATE`, not a `DELETE`, and his historical splits stay attributable.

The interesting part is the rule: he should not be allowed to leave while his net balance
in that group is non-zero. Letting him walk away converts a tracked debt into an untracked
one.

**Interviewer:** Put that rule in a `CHECK` constraint.

**Candidate:** I can't, and the reason is worth stating precisely. A `CHECK` constraint in
Postgres may only reference columns of the row being written. "Is Charlie's balance zero?"
is an aggregate over many rows in two other tables. That is structurally outside what
`CHECK` can express.

The options are a trigger, or the application inside a transaction. I'd use the
application, for an honest reason: this is a *product* rule, not a data-integrity rule. It
has exceptions — an admin should be able to evict someone who has vanished, and the group
may choose to write the debt off. Business rules with exceptions belong where exceptions
can be expressed and tested. Rules that must never have exceptions — the splits summing to
the total — belong in the database. I'd rather be deliberate about which is which than put
everything in one place out of principle.

**Interviewer:** Does the transaction need special isolation?

**Candidate:** Yes, and this is a real race. Read Committed lets Charlie's balance check
pass while a concurrent transaction inserts a new split that makes it non-zero — the check
read a snapshot that no longer holds. Either take `SELECT … FOR UPDATE` on his membership
row and have expense creation touch that row too, or run the leave at `SERIALIZABLE` and
retry on conflict. The second is cleaner; the first is cheaper. At this volume I'd take the
row lock.

---

### Step 13 — Reading balances fast, and the trap in the obvious fix

**Interviewer:** Alice has five years of history. Computing her balance from scratch on
every app open is going to hurt. Fix it.

**Candidate:** Let me first say what the honest computation is, because it's the thing
everything else has to stay consistent with:

```sql
-- Alice's net position in one group: positive means the group owes her.
SELECT COALESCE(SUM(s.amount_paid - s.amount_owed), 0)
     + COALESCE((SELECT SUM(amount) FROM settlements
                  WHERE group_id = :g AND payer_id = :u AND deleted_at IS NULL), 0)
     - COALESCE((SELECT SUM(amount) FROM settlements
                  WHERE group_id = :g AND payee_id = :u AND deleted_at IS NULL), 0)
  FROM expense_splits s
  JOIN expenses e ON e.expense_id = s.expense_id
 WHERE e.group_id = :g AND s.user_id = :u AND e.deleted_at IS NULL;
```

Paying someone *increases* your position — you've put cash in. Receiving decreases it.

That query is correct and it is linear in Alice's history, which is exactly what we can't
afford on a 10:1 read-heavy path. So we materialise it:

```sql
ALTER TABLE group_members
    ADD COLUMN balance NUMERIC(14,2) NOT NULL DEFAULT 0;
```

**Interviewer:** Fine. How do you keep it current?

**Candidate:** Here is the trap, and it's the thing I'd most want to get right. The obvious
implementation is: read the balance, add the delta in application memory, write it back.
That is a classic **lost update**. Two expenses land at once, both read \$50, one writes
\$70, the other writes \$80, and the first \$20 is gone. Nothing errors. The money is just
wrong, permanently, and nobody notices for months.

The fix is to never round-trip the value — let the database do the arithmetic in one
statement:

```sql
UPDATE group_members
   SET balance = balance + :delta
 WHERE group_id = :g AND user_id = :u;
```

That takes a row lock and re-reads under it, so it's safe even at Read Committed. And it
runs in the **same transaction** as the split inserts — if the expense rolls back, so does
every balance it touched. A cached aggregate updated outside the writing transaction is
guaranteed to drift.

**Interviewer:** What does that cost you?

**Candidate:** Write contention on the member row. Every expense in a group serialises on
the rows of its participants. For a four-person flatshare that's nothing. For a 200-person
office lunch group it's a hot row, and the fix is to stop updating in place: append signed
deltas to a `balance_deltas` table, which is contention-free, and roll them up
periodically. I wouldn't build that on day one — I'd note where the ceiling is.

**Interviewer:** Anything else?

**Candidate:** One more, and I'd insist on it: a **reconciliation job**. Any derived
aggregate drifts eventually — a bug, a partial failure, a manual fix in production. So a
nightly job recomputes balances from `expense_splits` and `settlements`, compares against
the cached column, and alerts on any mismatch rather than silently repairing it. A silent
repair hides the bug that caused it.

The cached column is an optimisation. `expense_splits` and `settlements` are the source of
truth. Keeping that distinction clear is what makes the optimisation safe to have.

---

### Step 14 — Debt simplification is not a SQL problem

**Interviewer:** Alice owes Bob \$10, Bob owes Charlie \$10. The app should tell Alice to
pay Charlie directly. Where does that happen?

**Candidate:** Not in the database, and the reason is structural rather than a matter of
taste.

Notice first that the schema never stores "Alice owes Bob \$10". It stores each person's
net position in the pool: Alice −10, Bob 0, Charlie +10. The pairwise debt is already an
inference, and that's a feature — it means the simplification has nothing to undo.

From those net positions, minimising the number of transfers is a graph problem. With *n*
people there are at most *n−1* transfers needed, and finding the true minimum is
NP-hard — it contains subset-sum. So production systems use a greedy approximation: repeatedly
match the largest debtor against the largest creditor, settle the smaller of the two
amounts, and continue. That's `O(n log n)` with a pair of heaps and it produces at most
*n−1* transfers.

**Interviewer:** Why not do that in SQL?

**Candidate:** Because it's iterative and stateful — each step depends on the result of the
last. Expressing it as a recursive CTE is possible and miserable: hard to read, hard to
test, impossible to profile, and it burns database CPU, which is the one resource in this
architecture you cannot horizontally scale by adding another box.

The division of labour I'd argue for is the one this whole design has followed: the
database does storage, integrity, and set-oriented aggregation. The application does
algorithms. Here the database runs one grouped aggregate to produce *n* net balances — the
thing it is extraordinarily good at — and the app does the heap matching in microseconds.

**Interviewer:** Do you store the simplified result?

**Candidate:** No. It's a pure function of current balances, so storing it creates a cache
that is stale the instant anyone adds an expense. Compute it on demand. The only thing
worth persisting is the settlement that actually happens, which Step 9 already covers.

---

### Step 15 — Multi-currency, done properly

**Candidate:** I want to come back to the limitation I flagged in Step 5, because I don't
think a design for a travel-adjacent app is finished without it.

**Interviewer:** Go on.

**Candidate:** The bug is that `balance` is a single `NUMERIC`. You cannot net €50 against
\$50 — the sum is meaningless. A balance is only defined **per currency**.

```sql
-- One row per (group, member, currency). Replaces the single balance column.
CREATE TABLE member_balances (
    group_id BIGINT        NOT NULL,
    user_id  BIGINT        NOT NULL,
    currency CHAR(3)       NOT NULL,
    balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (group_id, user_id, currency),
    FOREIGN KEY (group_id, user_id) REFERENCES group_members (group_id, user_id)
);
```

A flatshare that only ever spends in rupees has exactly one row per member and behaves
identically to the column it replaces. A trip that touched three currencies has three.

**Interviewer:** Users want one number, not three. Convert them.

**Candidate:** Then the critical question is *when* you convert, and there's only one
defensible answer.

If you convert at **read** time, Bob's debt changes every time the exchange rate moves. He
owed \$10 on Tuesday and \$10.40 on Friday without anyone spending anything. That is
indefensible for a debt between friends.

So you convert at **write** time, and you store the rate you used:

```sql
ALTER TABLE expenses
    ADD COLUMN fx_rate_to_group_currency NUMERIC(18,8),
    ADD COLUMN fx_rate_source            TEXT,
    ADD COLUMN fx_rate_at                TIMESTAMPTZ;
```

The debt is fixed at the moment it was incurred, which is how people actually reason about
it. Storing the source and timestamp alongside the rate is what makes it auditable — when
somebody disputes a conversion a year later, "we used ECB's 14:00 fix on 3 March" is an
answer and "about 1.09, I think" is not.

Note the scale of 8 on the rate. Rates are not money; they need far more precision than two
decimal places, and rounding the *rate* before multiplying throws away accuracy that
rounding the *result* would have kept.

**Interviewer:** You said earlier that a scale of 2 can't represent every currency.

**Candidate:** Right, and this is where I'd pay that debt. Japanese yen has no minor unit;
Kuwaiti dinar has three. The fully correct representation is integer **minor units** plus
the ISO 4217 exponent for the currency — `¥1000` as `1000` with exponent 0, `KD 1.234` as
`1234` with exponent 3. Everything stays an integer, nothing rounds, and the display layer
applies the exponent.

I didn't start there because `NUMERIC(14,2)` is simpler, and a V1 that only handles
two-decimal currencies is a reasonable V1. But if the product is serious about travel, the
migration to minor units is one I'd want to do early — it touches every money column, and
that cost only grows.

---

### Step 16 — The invariants, and which ones the database can actually enforce

**Interviewer:** You've asserted a lot of rules. Which does the database guarantee?

**Candidate:** Worth being precise, because "the application checks it" and "the database
guarantees it" are very different promises.

| Invariant | Enforced by | Why |
|---|---|---|
| Email is unique, case-insensitively | Unique index | Atomic; app checks race |
| Amounts are non-negative | `CHECK` | Single-row predicate |
| Payer ≠ payee on a settlement | `CHECK` | Single-row predicate |
| No duplicate membership | Composite PK | Structural |
| A split points at a real user and expense | Foreign key | Structural |
| Repeated settlement requests collapse | Unique index on idempotency key | Atomic |
| **Splits sum to the expense total** | Deferred constraint trigger | Spans rows |
| **Cached balance matches the splits** | Transaction + nightly reconciliation | Spans tables |
| Can't leave a group while in debt | Application + row lock | Product rule with exceptions |

The two in bold are the interesting ones.

**Interviewer:** Why can't the sum check be a `CHECK` constraint?

**Candidate:** Same reason as Step 12 — it spans rows. But there's a second problem that
catches people who reach for a plain trigger. You insert the expense, then insert its
splits one at a time. After the first split the sum is wrong. A row-level trigger firing
per statement would reject a perfectly valid transaction midway through.

So the check has to run at **commit**, not per statement:

```sql
CREATE CONSTRAINT TRIGGER expense_splits_balance
    AFTER INSERT OR UPDATE OR DELETE ON expense_splits
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION assert_expense_balances();
```

`DEFERRABLE INITIALLY DEFERRED` is the whole trick. The transaction is free to be
temporarily inconsistent; it just may not *commit* that way. The function asserts
`SUM(amount_paid) = SUM(amount_owed) = expenses.total_amount` for the affected expense and
raises if not.

**Interviewer:** Is that worth the cost?

**Candidate:** For this invariant, yes. It is the one rule that, if broken, corrupts
everything downstream — balances, simplification, settlement amounts — and does so
silently. I'd rather pay a commit-time check than discover six months later that 0.02% of
expenses don't balance and have no way to know which.

---

### Step 17 — Indexing, derived from the queries

**Interviewer:** What indexes would you add?

**Candidate:** I'd rather start from the queries, because an index list without the query
list is just guessing. There are five reads that matter:

1. Open the app → my active groups.
2. Open a group → its most recent expenses, paginated.
3. Open a group → every member's balance.
4. Open an expense → its splits.
5. Group history → its settlements.

**Q1 — my active groups.** Step 4 already added `(user_id, group_id)`. Make it partial,
since nobody lists groups they've left:

```sql
CREATE INDEX group_members_active_by_user
    ON group_members (user_id, group_id)
    WHERE left_at IS NULL;
```

A partial index is smaller, so more of it stays cached, and it skips rows the query would
have discarded anyway.

**Q2 — the group feed.** Sorted by date, newest first:

```sql
CREATE INDEX expenses_group_feed
    ON expenses (group_id, expense_date DESC, expense_id DESC)
    WHERE deleted_at IS NULL;
```

`expense_id` is in there as a tiebreaker, and it is not cosmetic. Several expenses share a
date, so `expense_date` alone is not a total order — pagination would drop or repeat rows
at page boundaries. With the tiebreaker the order is total, which lets us use **keyset
pagination**:

```sql
WHERE group_id = :g
  AND (expense_date, expense_id) < (:last_date, :last_id)
ORDER BY expense_date DESC, expense_id DESC
LIMIT 50;
```

rather than `OFFSET 10000`, which makes the database walk and discard ten thousand rows to
return fifty. Keyset pagination seeks straight to the position and costs the same on page
200 as on page 1.

**Q3 — balances.** With Step 15's table this is a primary-key range scan on
`member_balances (group_id, …)`. No extra index. That's the payoff for materialising them.

**Q4 — splits by expense.** Covered by the composite primary key.

**Q5 — a user's splits**, needed by reconciliation and by any recompute:

```sql
CREATE INDEX expense_splits_by_user
    ON expense_splits (user_id, expense_id)
    INCLUDE (amount_paid, amount_owed);
```

`INCLUDE` puts the two amounts in the leaf pages without making them part of the key. The
aggregate becomes an **index-only scan** — it never touches the heap. On a table this hot
that is a large difference for eight bytes a row.

**Interviewer:** Foreign keys are indexed automatically, so some of this is redundant.

**Candidate:** They aren't, and this is a genuinely common misconception. Postgres indexes
the *referenced* side, because it needs a unique constraint there, but creates nothing on
the *referencing* side. `expense_splits.user_id` has no index unless I write one.

It matters beyond read speed: every delete or key update on `users` has to scan every
referencing table to check the constraint. Unindexed foreign keys turn one parent delete
into a pile of sequential scans.

**Interviewer:** Anything you'd deliberately not index?

**Candidate:** `expenses.description`. Someone always wants to search it, and a B-tree
can't serve `LIKE '%pizza%'` anyway — that needs a trigram or full-text index, which is a
different structure with its own write cost. I'd want evidence people actually search
before adding it.

That's the general rule: every index is paid for on every write and in cache that other
indexes then don't get. Five well-chosen indexes beat fifteen hopeful ones.

---

### Step 18 — When one machine is not enough

**Interviewer:** `expense_splits` reaches two billion rows. What breaks and what do you do?

**Candidate:** Three things, in the order they'll actually bite.

**First, reads outgrow one box — and that's the easy one.** The workload is 10:1
read-heavy, so streaming replicas absorb balance and feed reads while the primary takes
writes. The catch is replication lag: Alice adds an expense, her next read hits a replica
that hasn't seen it, and the expense appears to vanish. That's the read-your-own-writes
problem, and the fix is to route a user to the primary for a few seconds after their own
write rather than pretending the lag isn't there.

**Second, the big tables get unwieldy.** Partition `expenses` and `expense_splits` by
month on `expense_date`. Recent-activity queries touch one or two partitions and the
planner prunes the rest. Archiving becomes `DETACH PARTITION` — a catalogue operation —
instead of a `DELETE` of 200 million rows that bloats the table and thrashes autovacuum.

I'd be honest about what partitioning does *not* fix, though: a per-user balance recompute
still fans out across every partition, because one person's history spans years. Date
partitioning helps the feed and the archival story, not that query. Step 13's materialised
balance is what actually saves it.

**Interviewer:** And when one primary can't take the write volume?

**Candidate:** Then shard, and the shard key is the whole decision. I'd shard on
**`group_id`**.

**Interviewer:** Why not `user_id`? Users are what you have 50 million of.

**Candidate:** Because of how a write is shaped. One expense touches one group and several
users. Shard by `user_id` and a single four-person dinner writes to four shards — a
distributed transaction, two-phase commit, and a write path that is only as available as
the least available shard. Every expense becomes a cross-shard write.

Shard by `group_id` and that same dinner is one local transaction: the expense, its splits,
and its balance updates all live on the shard that owns the group. Expenses never span
groups, so writes never span shards. The invariant from Step 16 stays enforceable by a
local constraint, which it would not be across a distributed commit.

**Interviewer:** What does that cost?

**Candidate:** The home screen. "All my groups" is now a scatter-gather across every shard
holding one of Alice's groups, fanned out and merged in the application. That's acceptable
because the fan-out is bounded by her group count — tens, not thousands — and each hit is a
primary-key lookup.

I'd keep `users` and `group_members` in a small global directory so "which shards do I
need to ask?" is one query, not a broadcast.

That's the trade I'd defend: make the **write** path local and pay on a read that's bounded
and parallelisable. Sharding by user does the opposite, and the expensive side is the one
that has to be transactional.

---

### Step 19 — The final schema

```sql
CREATE TABLE users (
    user_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email        VARCHAR(320) NOT NULL,
    display_name TEXT         NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_email_lower_uniq ON users (lower(email));

CREATE TABLE groups (
    group_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    created_by       BIGINT       NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    default_currency CHAR(3)      NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
    group_id  BIGINT      NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id   BIGINT      NOT NULL REFERENCES users(user_id)   ON DELETE RESTRICT,
    role      TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at   TIMESTAMPTZ,
    PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_members_active_by_user
    ON group_members (user_id, group_id) WHERE left_at IS NULL;

CREATE TABLE expenses (
    expense_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id     BIGINT        NOT NULL REFERENCES groups(group_id),
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
    currency     CHAR(3)       NOT NULL,
    description  VARCHAR(255),
    expense_date DATE          NOT NULL,
    created_by   BIGINT        NOT NULL REFERENCES users(user_id),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    version      INTEGER       NOT NULL DEFAULT 1,
    deleted_at   TIMESTAMPTZ,
    fx_rate_to_group_currency NUMERIC(18,8),
    fx_rate_source            TEXT,
    fx_rate_at                TIMESTAMPTZ
);
CREATE INDEX expenses_group_feed
    ON expenses (group_id, expense_date DESC, expense_id DESC) WHERE deleted_at IS NULL;

CREATE TABLE expense_splits (
    expense_id  BIGINT        NOT NULL REFERENCES expenses(expense_id) ON DELETE CASCADE,
    user_id     BIGINT        NOT NULL REFERENCES users(user_id)       ON DELETE RESTRICT,
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    amount_owed NUMERIC(14,2) NOT NULL           CHECK (amount_owed >= 0),
    PRIMARY KEY (expense_id, user_id)
);
CREATE INDEX expense_splits_by_user
    ON expense_splits (user_id, expense_id) INCLUDE (amount_paid, amount_owed);

CREATE TABLE settlements (
    settlement_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id        BIGINT        NOT NULL REFERENCES groups(group_id),
    payer_id        BIGINT        NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    payee_id        BIGINT        NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency        CHAR(3)       NOT NULL,
    settled_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by      BIGINT        NOT NULL REFERENCES users(user_id),
    deleted_at      TIMESTAMPTZ,
    idempotency_key UUID          NOT NULL,
    CHECK (payer_id <> payee_id)
);
CREATE UNIQUE INDEX settlements_idem ON settlements (idempotency_key);
CREATE INDEX settlements_by_group ON settlements (group_id, settled_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE member_balances (
    group_id BIGINT        NOT NULL,
    user_id  BIGINT        NOT NULL,
    currency CHAR(3)       NOT NULL,
    balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (group_id, user_id, currency),
    FOREIGN KEY (group_id, user_id) REFERENCES group_members (group_id, user_id)
);

CREATE TABLE expense_revisions (
    revision_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    expense_id  BIGINT      NOT NULL REFERENCES expenses(expense_id),
    version     INTEGER     NOT NULL,
    snapshot    JSONB       NOT NULL,
    changed_by  BIGINT      NOT NULL REFERENCES users(user_id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (expense_id, version)
);
```

Seven tables. Five of them were forced by a requirement that broke an earlier draft;
`member_balances` and `expense_revisions` exist because of read volume and audit
respectively — both optimisations over a source of truth that still lives in
`expense_splits` and `settlements`.

#### What I'd flag as unfinished

An interviewer usually asks what you'd do with more time, and having an answer ready is
worth more than pretending the design is complete.

- **Money as minor units.** `NUMERIC(14,2)` can't represent Kuwaiti dinar precisely. The
  migration gets more expensive every month it's deferred.
- **The hot-row ceiling on balances.** Fine at four people per group, contended at two
  hundred. The append-and-roll-up design from Step 13 is the escape hatch.
- **Non-group expenses.** Step 1 modelled a 1:1 split as a two-person group. If that proves
  clumsy in the UI, it's a product change, not a schema change — which is itself a sign the
  clarification was worth making.
- **Deletion under GDPR.** Soft delete keeps referential integrity but does not satisfy a
  right-to-erasure request. The usual answer is crypto-shredding or tombstoning the PII in
  `users` while keeping the key — worth saying out loud rather than being caught by it.

---

### Step 20 — The mental model

Strip away Splitwise and what's left is a method that transfers to any schema question:

1. **Ask the questions whose answers delete work.** Four of the five clarifications in
   Step 1 removed a design option before anyone drew a box.
2. **Ship a deliberately wrong V1.** A schema that survives three breakages in front of the
   interviewer demonstrates more than one that arrives perfect and unexplained.
3. **Separate facts from derivations.** Store what happened. Derive what it means. Every
   time we stored a derivation — participants from membership, shares from percentages — it
   broke on the next requirement.
4. **When a derived value stops being derivable, add a relation.** Not a cleverer query, not
   a count column.
5. **Defend types, not just tables.** `NUMERIC` over `FLOAT`, `TIMESTAMPTZ` over
   `TIMESTAMP`, `BIGINT` over random `UUID`. These are the questions that separate people
   who have run a database from people who have read about one.
6. **Know which rules the database can actually enforce.** Single-row predicates are
   `CHECK`s. Cross-row invariants need deferred triggers. Rules with legitimate exceptions
   belong in the application. Say which is which and why.
7. **Denormalise deliberately, and defend it.** `total_amount` and `member_balances` are
   redundant on purpose, justified by a 10:1 read ratio, protected by a constraint and a
   reconciliation job.
8. **Let the access pattern pick the shard key.** Shard so that the transactional path is
   local, and pay on the path that parallelises.
