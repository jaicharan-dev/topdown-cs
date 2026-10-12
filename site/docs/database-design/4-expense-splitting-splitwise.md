---
id: 4-expense-splitting-splitwise
title: "Design Splitwise: Expense Splitting & Debt Simplification"
description: "Design an expense splitting system like Splitwise: modeling users, groups, multi-currency splits, debt simplification algorithms, and ledger reconciliation."
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

**Still open, in the steps that follow:** settling up (is a repayment an expense?), people
leaving groups mid-balance, the rounding penny that won't divide by three, debt
simplification, the indexing strategy for 50M users, and where this schema stops fitting on
one machine.

---

### Step 9 — Settlements: paying each other back

**Interviewer:** Now Bob owes Alice \$10. He opens Venmo, sends her \$10, and wants to record it in the app to clear his debt. How do we record that repayment in the database?

**Candidate:** We could just add another row to the `Expenses` table, call it "Repayment", and say Bob paid \$10 and Alice owed \$10.

**Interviewer:** What's the problem with treating a repayment as a regular expense?

**Candidate:** It completely ruins the group's spending statistics! If the roommates look at their monthly chart to see "How much did our apartment spend on groceries and utilities?", repayments aren't real spending. If you record settlements as expenses, you double-count the money. You'd make the group look like they are spending twice as much as they actually are.

**Interviewer:** Exactly. So how would you store repayments to keep the data clean?

**Candidate:** I'd create a dedicated `Settlements` table:
- `settlement_id` (Primary Key, UUID)
- `group_id` (Foreign Key `Groups.group_id`)
- `payer_id` (Foreign Key `Users.user_id`, Bob)
- `payee_id` (Foreign Key `Users.user_id`, Alice)
- `amount` (DECIMAL - \$10.00)
- `created_at` (TIMESTAMP)

This keeps peer-to-peer cash repayments completely separated from real-world spending on things like food or rent.

---

### Step 10 — Edge cases: leaving a group, and the lost penny

**Interviewer:** Let's look at some tricky real-world scenarios. What happens if Charlie moves out and wants to leave the group? Can we just run a database command like `DELETE FROM Group_Members WHERE user_id = charlie`?

**Candidate:** That would cause serious issues. If the database deletes his membership record, it also has to deal with his history on old bills. Depending on how the database is configured, it might completely wipe out his past expenses, which means the old bills wouldn't add up correctly anymore. Or, the database might throw an error and refuse to delete him because old receipts still point to his ID.

**Interviewer:** So how do you handle someone leaving a group without breaking history?

**Candidate:** We use a "soft delete". Instead of actually erasing the row, we add a `status` column to `Group_Members` that can be set to `'active'` or `'left'`. When Charlie leaves, we just update his status to `'left'`. That way, his name and historical splits remain in the database so past records stay perfectly balanced.

**Interviewer:** But what if Charlie owes \$200 to the group and tries to hit the "Leave Group" button to run away from his debt?

**Candidate:** The application's code has to catch that! Before updating his status to `'left'`, the backend calculates his total net balance in that group. If his balance is not exactly \$0.00, the app blocks him and shows an error: *"You cannot leave this group until your balance is settled."*

**Interviewer:** Here's another common problem: rounding. Suppose 3 friends split a \$10 lunch equally. \$10 divided by 3 is \$3.3333... How do you store that in the database?

**Candidate:** We shouldn't use regular floating-point numbers (`FLOAT`). Computers struggle to represent repeating fractions perfectly. If you store \$3.33 for each person, \$3.33 $\times$ 3 equals \$9.99. A penny disappears into thin air! Over millions of transactions, those missing pennies add up to a major accounting disaster.

**Interviewer:** How do you solve the missing penny problem?

**Candidate:** First, we use the `DECIMAL(15, 2)` data type, which stores exact numbers down to the cent, just like a bank. Second, the app itself has to allocate the extra penny *before* saving to the database. For example:
- Alice owes \$3.34
- Bob owes \$3.33
- Charlie owes \$3.33
- Total: **\$10.00** exactly.

The database never does the division; it only stores the exact, perfectly balanced numbers the app gives it.

---

### Step 11 — Debt simplification and querying balances

**Interviewer:** How does the app answer a question like, "How much does Alice owe Bob across all groups?" And how do you simplify debts, for example, if Alice owes Bob \$10, and Bob owes Charlie \$10, the app should just tell Alice to pay Charlie \$10 directly?

**Candidate:** The key thing to realize is that the database doesn't actually store a record that says "Alice owes Bob \$10". Instead, for any given group, the database just tracks each person's overall position in the pool:
- Alice is net **+\$50** (the group owes her \$50).
- Bob is net **-\$30** (he owes the group \$30).
- Charlie is net **-\$20** (he owes the group \$20).

**Interviewer:** Okay, but how does the app figure out who should pay whom? Can we write a clever SQL query to simplify the debts?

**Candidate:** I wouldn't do the debt simplification inside the database. Finding the most efficient way to clear debts between a web of people is an algorithmic graph puzzle. Writing complex, recursive loops inside SQL is slow, incredibly hard to read, and puts a heavy load on the database server.

**Interviewer:** Where should that puzzle be solved instead?

**Candidate:** In the backend application server! The database just runs a fast, simple query to calculate each user's net balance:
`User Balance = SUM(amount_paid - amount_owed) + SUM(settlements_received) - SUM(settlements_paid)`

Then the backend code takes those numbers and runs a matching algorithm in memory. It lines up everyone who owes money (debtors) and everyone who is owed money (creditors). It pairs the person who owes the most (Bob with -\$30) with the person who is owed the most (Alice with +\$50), tells Bob to pay Alice, and repeats until everyone is settled. It's lightning fast and keeps the database focused on what it does best: storing and summing data.

> **Note for the Reader:** Debt simplification is a version of the "Minimum Cash Flow" problem. Because it requires reducing a graph of connections, running a "Greedy solver" in application memory (like in Node.js, Python, or Go) is far more scalable than attempting to write complex recursive queries in SQL.

---

### Step 12 — Performance, normalisation and caching

**Interviewer:** Let's look at your `Expenses` table. You have a `total_amount` column. But you could also calculate that total at any time just by adding up the `amount_paid` from `Expense_Splits`. Doesn't storing `total_amount` violate database normalization rules since it's redundant data?

**Candidate:** Yes, technically it is redundant, which violates Third Normal Form (3NF). In a textbook, you'd remove it. But in the real world, I would intentionally keep it.

**Interviewer:** Why break the rule?

**Candidate:** For two very practical reasons:
1. **Speed:** When someone opens a group, they want to see a feed of the last 50 expenses with their totals. If we didn't store `total_amount`, the database would have to stitch together and sum up hundreds of individual split rows just to display a simple list of 50 bills.
2. **Safety Check:** The receipt total acts as a sanity check. When an expense is created, the app verifies that the individual splits add up to `total_amount` before saving. If something goes wrong, we have the original receipt total to compare against.

**Interviewer:** That makes sense. Now, let's talk about our 50 million users. You mentioned the app is very read-heavy. If Alice has been using the app for 5 years and has thousands of splits, calculating her balance from scratch every time she opens the app will take a long time. How do you fix that?

**Candidate:** We can cache her balance directly on the `Group_Members` table by adding a `cached_balance` column.

**Interviewer:** What's the trade-off of doing that?

**Candidate:** Reading her balance becomes instant: the database just looks at a single row and shows it on her screen. But writing becomes slightly slower, because every single time a new expense or settlement is added, the database has to lock her row and update that cached balance. Since users open the app to check balances far more often than they add expenses, sacrificing a tiny bit of write speed to gain lightning-fast reads is well worth it.

---

### Step 13 — Indexing strategy

**Interviewer:** Let's talk about indexes. What indexes would you add to make common queries fast?

**Candidate:** First, when a user opens the app, we need to quickly load all their active groups:
```sql
CREATE INDEX idx_group_members_user_active 
ON Group_Members (user_id, status);
```

**Interviewer:** Why do we need that index? Doesn't `Group_Members` already have a primary key on `(group_id, user_id)`?

**Candidate:** A composite index on `(group_id, user_id)` is sorted by `group_id` first, and then `user_id`. 

Think of it like a phone book sorted by Last Name, then First Name. If you only know the first name (the `user_id`), the phone book doesn't help you at all, because you would have to read every single page to find them. That's why we need a separate index that starts with `user_id`.

**Interviewer:** That's a great analogy. What about loading the expense feed for a group?

**Candidate:** We need the latest 50 expenses for a group, sorted by newest first. I'd add this index:
```sql
CREATE INDEX idx_expenses_group_created 
ON Expenses (group_id, created_at DESC);
```
This physically pre-sorts the expenses on disk. When the app asks for the latest 50, the database can jump straight to that group and grab the top 50 rows immediately, without having to load thousands of rows into memory just to sort them.

**Interviewer:** What about finding splits for a specific user?

**Candidate:** We'll add an index on `Expense_Splits(user_id)`:
```sql
CREATE INDEX idx_expense_splits_user 
ON Expense_Splits (user_id);
```

**Interviewer:** Isn't `user_id` a foreign key? Doesn't the database automatically index foreign keys?

**Candidate:** A lot of developers assume that, but most relational databases (like PostgreSQL) actually do not! Foreign keys ensure that the user exists, but they don't automatically create an index to make searching fast. You have to create the index manually.

---

### Step 14 — Scaling over time

**Interviewer:** After a few years, `Expense_Splits` grows to 2 billion rows. Searching it becomes like finding a needle in a massive haystack. How do you keep the database fast?

**Candidate:** We can apply two strategies to keep the active data small:
1. **Table Partitioning:** We can partition `Expenses` and `Expense_Splits` by date (for example, breaking it into monthly or quarterly buckets). When users look at recent bills, the database only searches the newest bucket and completely ignores the older ones.
2. **Cold Storage Archival:** Most users only care about expenses from the past few months. Expenses older than two years can be safely moved out of the main database into cheaper "cold storage" (like AWS S3 or a data warehouse). And because we keep the `cached_balance` on the `Group_Members` table, moving old bills out doesn't break anyone's current balance!

---

### Step 15 — Final schema review and mental model

**Interviewer:** Excellent walkthrough. Can you summarize the final schema?

**Candidate:** Here is our complete, production-ready schema:

```text
[ Users ]
  - user_id       : UUID (PK)
  - name          : VARCHAR
  - email         : VARCHAR (Unique)

[ Groups ]
  - group_id      : UUID (PK)
  - name          : VARCHAR
  - created_by    : UUID (FK -> Users.user_id)

[ Group_Members ]
  - group_id      : UUID (Composite PK, FK -> Groups.group_id)
  - user_id       : UUID (Composite PK, FK -> Users.user_id)
  - status        : ENUM ('active', 'left')   -- Soft deletion
  - cached_balance: DECIMAL(15, 2)            -- Instant balance lookups

[ Expenses ]
  - expense_id    : UUID (PK)
  - group_id      : UUID (FK -> Groups.group_id)
  - description   : VARCHAR
  - total_amount  : DECIMAL(15, 2)            -- Receipt total
  - created_by    : UUID (FK -> Users.user_id)
  - created_at    : TIMESTAMP

[ Expense_Splits ]
  - split_id      : UUID (PK)
  - expense_id    : UUID (FK -> Expenses.expense_id)
  - user_id       : UUID (FK -> Users.user_id)
  - amount_paid   : DECIMAL(15, 2)            -- Upfront cash put down
  - amount_owed   : DECIMAL(15, 2)            -- Consumed share of bill

[ Settlements ]
  - settlement_id : UUID (PK)
  - group_id      : UUID (FK -> Groups.group_id)
  - payer_id      : UUID (FK -> Users.user_id)
  - payee_id      : UUID (FK -> Users.user_id)
  - amount        : DECIMAL(15, 2)            -- Peer-to-peer repayment
  - created_at    : TIMESTAMP
```

#### How to Approach Any Database Design Problem:
1. **Start simple:** Propose a basic model first. Don't try to solve every tricky edge case in the first five minutes.
2. **Deconstruct events into splits:** An event often has two sides: who paid money in, and who took value out. Putting both in the split record makes math straightforward.
3. **Separate payments from spending:** Never mix debt repayments with actual expenses, or your spending analytics will be corrupted.
4. **Never hard-delete financial data:** Use soft deletes so historical balances and receipts remain safe and audit-proof.
5. **Know when to use SQL vs code:** Use SQL for storage, data integrity, and basic math; do complex algorithms (like debt simplification) in application code.
