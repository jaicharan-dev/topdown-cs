---
id: 1-wallet-payment-system
title: "Design a Digital Wallet System"
description: "A schema-design interview for a peer-to-peer wallet, worked one decision at a time: why a database transaction gives you atomicity but not correctness, why the first top-up forces a chart of accounts, and how a balance becomes something you derive rather than store."
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

---

### How to read this page

The schema at the bottom of this page is not the answer. The answer is the order the
decisions were made in, and what each one cost.

> **If you are revising the night before**, read Steps 3, 4, 6 and 15, then the final
> schema in Step 13. That is the spine: write the obvious schema, notice it cannot stop a
> bug from conjuring money, replace it with entries that sum to zero, and discover that the
> first top-up forces accounts that are not users.

This is the **first and shortest** of the schema questions on this site, and it is
deliberately the foundation for the rest. Every later question caches a derived value and
has to defend the cache; this one establishes *why* the underlying facts have the shape
they do, on the smallest problem where it matters.

The property that drives it is **conservation**. A wallet's job is to move money without
creating or destroying any, and the interesting realisation is that a database transaction
— the thing everyone reaches for first — does not give you that. It gives you something
weaker, and the gap is where the money goes.

Two closely related topics live in the DBMS section rather than here, and this page links
to them instead of repeating them:
[crash recovery and idempotency](../dbms-additional/35-crash-recovery-and-idempotency),
and [isolation levels](../dbms-additional/34-isolation-levels-read-committed-vs-serializable).

---

### Step 1 — Pin down what we are building

**Interviewer:** Design a digital wallet. Users hold a balance, top it up from a bank, send
money to each other, and withdraw back out.

**Candidate:** Four questions first.

Is this a closed loop, or does money enter and leave to real banks?

**Interviewer:** Money enters and leaves.

**Candidate:** That is the answer that makes this interesting, and I will show why in
Step 6. A closed system where balances only move between users is a much smaller problem —
and a much less realistic one.

One currency or several?

**Interviewer:** One. Rupees.

**Candidate:** Good. Multi-currency is not "add a currency column" — it changes what a
balance *is*, because you can no longer add two rows together without a conversion rate
that has its own history.

Can a balance go negative — overdraft, credit, promotional float?

**Interviewer:** No. Never negative.

**Candidate:** Then that is an invariant the database should enforce rather than the
application remember, and I will put it in a `CHECK`.

Last: are the bank transfers synchronous?

**Interviewer:** No. You call a payment provider and they call you back, sometimes minutes
later, sometimes never.

**Candidate:** So there is a window where money has left the user's spendable balance and
has not arrived anywhere. That needs a representation, which is Step 8.

---

### Step 2 — `users`, briefly

Nothing surprising, and it is settled in one paragraph so the rest of the page can be about
money.

```sql title="users"
CREATE TABLE users (
    user_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone      VARCHAR(16)  NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    full_name  TEXT         NOT NULL CHECK (length(full_name) BETWEEN 1 AND 120),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_phone_uniq ON users (phone) WHERE deleted_at IS NULL;
```

`BIGINT` identity rather than a random UUID: eight bytes instead of sixteen in every
foreign key and index, and inserts append to the right edge of the B-tree so the hot pages
stay hot. Phone normalised to E.164 before it reaches the column, because `+91 98765 43210`
and `9876543210` are the same number and a unique index on raw input is decoration.

Soft delete, because a deleted user's money movements are still financial history that must
remain readable.

---

### Step 3 — The obvious schema, and the one guarantee it does not give you

Here is what almost everyone writes first, and it is worth writing out in full because the
flaw is not where people expect.

```sql title="wallets and transactions — first cut"
CREATE TABLE wallets (
    wallet_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id   BIGINT        NOT NULL UNIQUE REFERENCES users(user_id),
    balance   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0)
);

CREATE TABLE transactions (
    transaction_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_wallet_id BIGINT        NOT NULL REFERENCES wallets(wallet_id),
    payee_wallet_id  BIGINT        NOT NULL REFERENCES wallets(wallet_id),
    amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

`NUMERIC`, never `FLOAT` — binary floating point cannot represent a tenth, `0.1 + 0.2`
evaluates to `0.30000000000000004`, and those errors compound across millions of rows until
the books stop adding up.

And the transfer:

```sql title="The transfer everyone writes"
BEGIN;
  UPDATE wallets SET balance = balance - 500 WHERE wallet_id = 1;
  UPDATE wallets SET balance = balance + 500 WHERE wallet_id = 2;
  INSERT INTO transactions (sender_wallet_id, payee_wallet_id, amount)
       VALUES (1, 2, 500);
COMMIT;
```

**Interviewer:** That is wrapped in a transaction. Both updates happen or neither does. Is
that not exactly the guarantee you want?

**Candidate:** It is a guarantee I want and it is not the one I need, and separating those
two is the whole point of this question.

A transaction gives me **atomicity**: all of it or none of it. What it does not give me is
**correctness**: that the two updates were equal and opposite.

---

### Step 4 — Break #1: atomicity is not correctness

:::broke

Nothing in the schema says the debit and the credit have to match. A transaction that
subtracts 500 and adds 5,000 is perfectly legal, commits cleanly, and has created 4,500
rupees out of nothing.

:::

**Interviewer:** That would be a bug in the application.

**Candidate:** Of course — and so is every other defect we design databases to prevent.
A `NOT NULL` constraint exists because the application might forget. A foreign key exists
because the application might reference a row that is gone. We do not accept "the
application will get it right" for those, and money is the last place to start.

Consider how it happens in practice. Not as one obviously wrong statement, but as a fee
refactor six months from now where the credit is computed as `amount - fee` and the debit
is still `amount`, and the difference quietly accumulates in nobody's account. Or a
currency conversion applied on one side. Or a retry that re-runs the credit and not the
debit. Each of those commits successfully. Each leaves the system holding a different total
than it did a moment ago, and **nothing in the schema notices**.

**Interviewer:** So what would notice?

**Candidate:** A schema in which "money appeared from nowhere" is not expressible.

The insight is to stop modelling a transfer as *two edits to two balances* and start
modelling it as **one event with several sides that must sum to zero**. That is
double-entry bookkeeping, and it is not an accounting formality — it is a conservation law
expressed as a constraint.

---

### Step 5 — Entries and lines: money as a conserved quantity

```sql title="The ledger"
CREATE TABLE ledger_entries (
    entry_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reason      entry_reason NOT NULL,   -- transfer, topup, withdrawal, fee, reversal
    narration   TEXT         NOT NULL,
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE ledger_lines (
    entry_id   BIGINT        NOT NULL REFERENCES ledger_entries(entry_id),
    line_no    SMALLINT      NOT NULL,
    account_id BIGINT        NOT NULL REFERENCES accounts(account_id),
    amount     NUMERIC(14,2) NOT NULL CHECK (amount <> 0),   -- signed
    PRIMARY KEY (entry_id, line_no)
);
```

A transfer of ₹500 from Alice to Bob is now one entry with two lines:

| account | amount |
|---|---|
| Alice's cash | −500.00 |
| Bob's cash | +500.00 |

And the rule that makes it a ledger rather than a log is enforced by the database:

```sql title="Conservation, as a constraint" {6}
CREATE OR REPLACE FUNCTION assert_entry_balances() RETURNS TRIGGER AS $fn$
DECLARE total NUMERIC(14,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total
      FROM ledger_lines WHERE entry_id = NEW.entry_id;
    IF total <> 0 THEN
        RAISE EXCEPTION 'entry % does not balance: %', NEW.entry_id, total;
    END IF;
    RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_balances
    AFTER INSERT ON ledger_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION assert_entry_balances();
```

**Interviewer:** Why deferred?

**Candidate:** Because the lines are inserted one at a time, and after the first one the
entry does not balance — it is −500 with nothing on the other side yet. An immediate check
would reject every entry ever written. `DEFERRABLE INITIALLY DEFERRED` makes the trigger
fire at `COMMIT` instead, which asks the only question that matters: *did this transaction
leave the books balanced?*

Now return to the fee-refactor bug. The credit is computed as `amount - fee`, the debit as
`amount`, the two lines no longer sum to zero, and **the transaction cannot commit**. The
bug becomes an exception in a test run instead of a slow leak discovered by an auditor.

:::decision

A double-entry ledger, over balance columns and a transaction log.

A database transaction gives atomicity. Only a balancing constraint gives conservation, and
conservation is the actual requirement.

*The property you are buying:* at any instant, `SUM(amount)` over **every** line in the
system is exactly zero. One query proves no money has been created or destroyed, ever.

*Cost:* two rows per movement instead of two updates, and a balance that is now a `SUM`
rather than a column read. Step 9 deals with the second.

:::

---

### Step 6 — Break #2: where does the money come from?

:::broke

Alice tops up ₹1,000 from her bank. Credit Alice's account — and debit *what*? With only
user accounts, the first top-up cannot be written down.

:::

**Interviewer:** Just credit her and move on.

**Candidate:** The trigger will not let me. A single line of +1,000 does not sum to zero,
and that is not the constraint being inconvenient — it is the constraint being *right*.
Money genuinely did come from somewhere, and a schema that cannot name where is a schema
that cannot be reconciled against the bank.

This is the moment the design stops being about users. The counterparty is the platform's
own pooled bank account — the float — where customer money physically sits.

| account | amount |
|---|---|
| Platform bank float | +1,000.00 |
| Alice's cash | +1,000.00 |

**Interviewer:** That sums to +2,000, not zero.

**Candidate:** Which is exactly the confusion worth having out loud, because it is the one
thing about double-entry that trips people up.

The platform's bank balance is an **asset** — money it holds. A customer's wallet balance
is a **liability** — money it owes. When Alice tops up, both increase: the platform holds
₹1,000 more *and* owes ₹1,000 more. The two are opposite in *sign* only once you adopt the
convention that liabilities are recorded negative:

| account | kind | amount |
|---|---|---|
| Platform bank float | asset | +1,000.00 |
| Alice's cash | liability | −1,000.00 |

With that convention a user's *displayed* balance is the negation of their account's
balance, which feels backwards for about ten minutes and then stops mattering, because the
sum of every line being zero is now a statement with real content: **what we hold equals
what we owe.** If it ever stops being zero, either we have lost customer money or we have
promised money we do not hold, and both are things you want a single query to detect.

:::decision

Record liabilities negative and assets positive, so that conservation is literally
`SUM(amount) = 0`.

The alternative — a `direction` column with debit/credit as text, all amounts positive — is
what a lot of textbooks show. It requires every query to branch on the direction, and a
missed branch produces a wrong total silently. Signed amounts make the arithmetic the
constraint.

*Cost:* one sign flip when rendering a user's balance, and a convention to document.

:::

---

### Step 7 — The chart of accounts

**Interviewer:** So how many accounts does this system have?

**Candidate:** Once the float exists, the pattern generalises: an account is simply **a
bucket money can sit in**, and only some of them belong to users. That reframing is worth
more than the table it produces — it means a new kind of money movement usually needs a new
*account*, not a new mechanism.

```sql title="accounts"
CREATE TABLE accounts (
    account_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT       REFERENCES users(user_id),   -- NULL for platform accounts
    kind          account_kind NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (owner_user_id, kind)
);
```

The useful ones for a wallet:

| account | owner | kind | what it means |
|---|---|---|---|
| `user_cash` | a user | liability | spendable balance |
| `user_pending_out` | a user | liability | withdrawal in flight (Step 8) |
| `bank_float` | platform | asset | money actually in the bank |
| `fee_income` | platform | revenue | fees the platform has earned |
| `suspense` | platform | asset | money whose home is not yet known |

**Interviewer:** Walk me through one of those I would not have guessed.

**Candidate:** `suspense`, which is the one people leave out and then need at 3am.
A bank credit arrives with a reference that matches no user. The money is real, it is in
the float, and it belongs to nobody yet. Without a suspense account the only options are to
refuse to record it — losing the fact that it arrived — or to guess. With one, it is
recorded honestly and moved later when the reference is resolved, with both movements
visible.

The `UNIQUE (owner_user_id, kind)` means a user has at most one account of each kind, which
is what makes "Alice's cash account" a well-defined phrase.

---

### Step 8 — Break #3: money in flight

:::broke

Alice withdraws ₹1,000 to her bank. The money must leave her spendable balance immediately,
but it has not arrived anywhere, and the provider may still fail hours later.

:::

**Interviewer:** Debit Alice, credit the float, done.

**Candidate:** That says the money has left the platform, and it has not — it is still in
the bank account, in the provider's queue. If the withdrawal fails we would have to invent a
correction for a movement that never happened, and in the meantime our float balance
disagrees with the actual bank.

This is the same shape as the earlier questions on this site: a state that is neither
*spendable* nor *gone* needs a representation. And because accounts are cheap, it does not
need a new mechanism — just a second account:

```sql title="Initiating a withdrawal"
-- entry: reason = 'withdrawal', narration = 'to HDFC ••4821'
--   Alice user_cash          +1,000.00   (liability decreasing)
--   Alice user_pending_out   −1,000.00   (liability moving, not leaving)
```

Her spendable balance drops at once; the platform still owes her the money; the float is
untouched because nothing has physically left the bank.

When the provider confirms:

```sql title="On confirmation"
--   Alice user_pending_out   +1,000.00
--   bank_float              −1,000.00
```

And if it fails, the first entry is reversed and she has her money back — with both the
attempt and the reversal visible in her statement, which is what she will ask about.

**Interviewer:** What if the provider never answers at all?

**Candidate:** Then the entry sits in `user_pending_out` and a reconciliation sweeper picks
it up: anything pending beyond a threshold gets queried against the provider and resolved
either way. That mechanism, along with the idempotency that makes the retry safe, is
[the crash-recovery question](../dbms-additional/35-crash-recovery-and-idempotency) — it is
the same problem in a different frame, and worth reading alongside this one.

---

<details>
<summary><b>Schema checkpoint — everything as it stands after Step 8</b></summary>

```sql
users          (user_id PK, phone, full_name, created_at, deleted_at)

accounts       (account_id PK, owner_user_id FK NULL, kind,
                UNIQUE (owner_user_id, kind))

ledger_entries (entry_id PK, reason, narration, occurred_at)

ledger_lines   (entry_id FK, line_no, account_id FK, amount signed,
                PK (entry_id, line_no))
               -- deferred constraint trigger: lines of an entry sum to zero
```

Four tables, and `wallets.balance` is gone. There is no column anywhere holding a balance —
which is correct, and is about to become a performance problem.

</details>

---

### Step 9 — Balances: derived, then cached provably

**Interviewer:** Alice's balance is now an aggregate over every line she has ever had. Her
home screen is going to be slow.

**Candidate:** It is, and this is the one place the ledger needs help.

```sql title="The authoritative balance"
SELECT -COALESCE(SUM(amount), 0) AS balance      -- negated: liabilities are stored negative
  FROM ledger_lines l
  JOIN accounts a ON a.account_id = l.account_id
 WHERE a.owner_user_id = $1 AND a.kind = 'user_cash';
```

Correct, explainable line by line, and unusable on a screen opened millions of times a day.
So it gets materialised — but in a specific way that distinguishes it from an ordinary cache:

```sql title="account_balances"
CREATE TABLE account_balances (
    account_id    BIGINT PRIMARY KEY REFERENCES accounts(account_id),
    balance       NUMERIC(14,2) NOT NULL DEFAULT 0,
    last_entry_id BIGINT        NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

Written in the **same transaction** as the lines, never by a background job. If the
transaction commits, both are true; if it aborts, neither is.

Three things make this stronger than a normal cached value:

- **The ledger is still the truth.** If the cache and the `SUM` ever disagree, the cache is
  wrong *by definition* and is rebuilt. There is never an argument about which is right —
  a question that, in the original schema, had no answer at all.
- **`last_entry_id` makes verification incremental.** Reconciliation does not re-sum
  everything; it sums the lines added since each account's watermark. Cheap enough to run
  continuously rather than monthly.
- **A `CHECK` carries the business rule.** For a user cash account the rule "never negative"
  becomes a database constraint — the backstop behind every application check, and one that
  a new code path cannot bypass.

:::decision

Derive balances from the ledger; materialise them in the same transaction; verify
incrementally.

*Cost:* the balance row is a contention point, since every movement on an account updates
it. Which turns out to be exactly where the concurrency control belongs.

:::

---

### Step 10 — Concurrency: one statement, one guard

**Interviewer:** Alice taps send twice at once, and she has only enough for one transfer.

**Candidate:** The guard goes in the `WHERE` clause of the debit, so checking and writing
are a single atomic statement with no window between them:

```sql title="Check and write, indivisibly" {4}
UPDATE account_balances
   SET balance       = balance - $2,
       last_entry_id = $3
 WHERE account_id    = $1
   AND balance      >= $2          -- the guard
RETURNING balance;
```

Zero rows returned means insufficient funds. Concurrent debits serialise on the row lock
that `UPDATE` takes, each sees the previous one's committed value, and the `CHECK` stands
behind both.

**Interviewer:** Why not `SELECT … FOR UPDATE` and then compute?

**Candidate:** That also works, and it is the right tool when you must read a value, compute
something non-trivial, and then write. For a plain debit the guarded update is one statement
instead of two, and it states the business rule in the predicate where a reader will find
it.

What I would avoid is reaching for `SERIALIZABLE` here, and also avoid the usual *reason*
for avoiding it. PostgreSQL's serialisable is optimistic — it does not run transactions
sequentially, it aborts conflicting ones — so the cost is a retry loop rather than latency.
The reason it is unnecessary here is simply that "balance must not go negative" is a
**single-row invariant**, and single-row invariants are exactly what a guarded update
expresses. The full argument, including the cross-row invariants that genuinely do need
serialisable, is in
[Isolation Levels](../dbms-additional/34-isolation-levels-read-committed-vs-serializable).

---

### Step 11 — Retries: the same transfer twice

**Interviewer:** You solved the double-tap with a guard in the last step. Is that the whole
story?

**Candidate:** No, and the half it misses is the more common one in practice.

If the first request committed and only the *response* was lost, the second tap is a
**duplicate intent**, not a concurrent one. Alice has enough money for both, so the guard
passes, and she has now sent ₹500 twice. A lock does not help here — it just makes the
duplicate wait its turn and then succeed.

The fix is an idempotency key supplied by the client, recorded in the same transaction as
the entry:

```sql title="One intent, one entry"
ALTER TABLE ledger_entries
    ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX ledger_entries_idempotency
    ON ledger_entries (idempotency_key) WHERE idempotency_key IS NOT NULL;
```

The retry collides with the unique index, and the server returns the original result
without moving money again. The mechanics — storing the response, hashing the request to
catch a key reused with different content, and handling the retry that arrives while the
first attempt is still running — are covered in
[Crash Recovery & Idempotency](../dbms-additional/35-crash-recovery-and-idempotency).

**Interviewer:** So when do you need both?

**Candidate:** Always, on any endpoint that moves money, and the distinction is worth
keeping straight: **the guard stops one rupee being spent twice; the key stops one intent
becoming two transfers.** Different problems, and neither substitutes for the other — a
system with only the guard double-sends on a flaky network, and a system with only the key
goes overdrawn under concurrency.

---

### Step 12 — Indexing, derived from the queries

```sql title="Q1 — the statement screen"
CREATE INDEX ledger_lines_by_account
    ON ledger_lines (account_id, entry_id DESC);
```

Paginated by keyset on `entry_id`, never `OFFSET` — page 200 of a statement should read the
same twenty rows as page 1, not walk and discard four thousand:

```sql title="Keyset pagination"
SELECT entry_id, amount
  FROM ledger_lines
 WHERE account_id = $1
   AND entry_id < $2            -- last entry_id of the previous page
 ORDER BY entry_id DESC
 LIMIT 20;
```

```sql title="Q2 — resolving a pending withdrawal"
CREATE INDEX entries_pending
    ON ledger_entries (occurred_at)
    WHERE reason = 'withdrawal';
```

```sql title="Q3 — the foreign key Postgres does not index for you"
CREATE INDEX ledger_lines_by_entry_account ON ledger_lines (account_id);
```

Worth the caution from the other questions: not every foreign key needs an index.
`ledger_lines(entry_id)` is already the leftmost column of the primary key, so indexing it
separately would duplicate an existing structure.

---

### Step 13 — The final schema

```sql title="The complete schema"
CREATE TYPE account_kind AS ENUM ('user_cash','user_pending_out','bank_float',
                                  'fee_income','suspense');
CREATE TYPE entry_reason AS ENUM ('transfer','topup','withdrawal','fee','reversal');

CREATE TABLE users (
    user_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone      VARCHAR(16) NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    full_name  TEXT        NOT NULL CHECK (length(full_name) BETWEEN 1 AND 120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_phone_uniq ON users (phone) WHERE deleted_at IS NULL;

CREATE TABLE accounts (
    account_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT       REFERENCES users(user_id),
    kind          account_kind NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (owner_user_id, kind)
);

CREATE TABLE account_balances (
    account_id    BIGINT PRIMARY KEY REFERENCES accounts(account_id),
    balance       NUMERIC(14,2) NOT NULL DEFAULT 0,
    last_entry_id BIGINT        NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
    entry_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reason          entry_reason NOT NULL,
    narration       TEXT         NOT NULL,
    idempotency_key TEXT,
    occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ledger_entries_idempotency
    ON ledger_entries (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE ledger_lines (
    entry_id   BIGINT        NOT NULL REFERENCES ledger_entries(entry_id),
    line_no    SMALLINT      NOT NULL,
    account_id BIGINT        NOT NULL REFERENCES accounts(account_id),
    amount     NUMERIC(14,2) NOT NULL CHECK (amount <> 0),
    PRIMARY KEY (entry_id, line_no)
);
CREATE INDEX ledger_lines_by_account ON ledger_lines (account_id, entry_id DESC);

-- Conservation: every entry's lines sum to zero, checked at COMMIT.
CREATE CONSTRAINT TRIGGER ledger_balances
    AFTER INSERT ON ledger_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION assert_entry_balances();
```

Five tables. There is no column anywhere called `balance` that anybody writes to directly,
and that is the whole design.

---

### Step 14 — What this does not cover

**Interviewer:** Anything you have deliberately left out?

**Candidate:** Three things, and saying so is part of the answer — knowing where your own
design stops is more convincing than implying it covers everything.

- **Multiple currencies.** Adding a `currency` column is not enough; `SUM(amount) = 0` stops
  being meaningful across currencies, so conservation has to hold *per currency* and
  conversion becomes its own entry with a recorded rate.
- **Interest, lending, or any negative balance.** The `CHECK` forbids it by design. Credit
  products need a separate account kind with its own limit, and that is a different
  question.
- **Tax, regulatory reporting, lot tracking.** A wallet moves one fungible thing. The
  moment you hold *assets* that were acquired at different times and prices, you need
  acquisition lots — which is where
  [the Zerodha question](./7-stock-trading-zerodha-groww) picks up, extending this same
  ledger under regulatory pressure.

This page is the smallest honest version. The later questions assume it.

---

### Step 15 — The mental model

1. **A transaction gives atomicity, not correctness.** All-or-nothing says nothing about
   whether the parts were equal and opposite. That gap is where money disappears.
2. **Encode conservation as a constraint.** Lines that must sum to zero turn a whole class
   of future bug into a failed commit instead of a slow leak.
3. **Record movements, not balances.** "Why is my balance this" becomes answerable line by
   line, and "has any money been created" becomes one aggregate over one column.
4. **The first exception to your model is the most informative thing in the design.** A
   top-up could not be written down, and that single failure produced the float, the
   asset/liability distinction, and eventually the suspense account.
5. **A state that is neither one thing nor the other is an account, not an adjustment.**
   Money in flight, funds blocked for an order, stock held for a checkout — the same
   realisation recurs in every question on this site.
6. **Cache derived values, but make the cache provable.** Same transaction, a `CHECK` that
   states the rule, and a watermark so verification is incremental.
7. **Guards and keys solve different problems.** A predicate in a `WHERE` clause stops one
   rupee being spent twice; an idempotency key stops one intent becoming two transfers.
