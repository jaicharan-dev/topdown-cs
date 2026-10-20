---
id: 34-isolation-levels-read-committed-vs-serializable
title: "Isolation Levels: Read Committed vs Serializable"
description: "What each isolation level actually promises in PostgreSQL, the anomalies they do and do not prevent, why write skew survives SELECT FOR UPDATE, and why Serializable is optimistic rather than serial."
sidebar_position: 3.5
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field, Arrow } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Which isolation level would you use in a high-traffic payment system, and why? What are the trade-offs between Read Committed and Serializable, and which anomalies does each one actually prevent?"

An isolation level is not a performance setting. It is a **contract about which anomalies
your transaction is allowed to observe** — and the common advice, "use Read Committed with
`SELECT … FOR UPDATE` because Serializable is too slow", gets both halves wrong. It
misstates what Serializable does, and it recommends a substitute that does not cover the
anomaly Serializable exists for.

### The anomalies, in the order they bite

<Diagram>
<Row>
<Box title="Dirty read" accent="#fb7185">
<Field icon="👀" code="T1 reads T2's uncommitted row" hint="T2 then rolls back — T1 acted on data that never existed" variant="neutral" />
</Box>
<Box title="Non-repeatable read" accent="#fb923c">
<Field icon="🔁" code="T1 reads a row twice, gets two values" hint="T2 committed an UPDATE in between" variant="neutral" />
</Box>
</Row>
<Row>
<Box title="Phantom read" accent="#facc15">
<Field icon="👻" code="T1 runs the same WHERE twice" hint="T2 INSERTed a row that now matches — the result set grew" variant="neutral" />
</Box>
<Box title="Write skew" accent="#a78bfa">
<Field icon="🪓" code="T1 and T2 read the same rows, write different ones" hint="each is valid alone; together they break an invariant" variant="neutral" />
</Box>
</Row>
</Diagram>

The first three are the textbook three and every database discussion covers them. **Write
skew is the one that actually costs money**, and it is the one almost every answer to this
question omits.

### What PostgreSQL actually promises

The SQL standard defines the levels by which anomalies they *permit*. PostgreSQL is
stricter than the standard at every level, which matters because the textbook table is not
the table you are working with.

| | Dirty read | Non-repeatable read | Phantom read | Write skew | Lost update |
|---|---|---|---|---|---|
| **Read Uncommitted** | never¹ | possible | possible | possible | possible |
| **Read Committed** (default) | never | possible | possible | possible | possible² |
| **Repeatable Read** | never | never | **never**³ | possible | never⁴ |
| **Serializable** | never | never | never | **never** | never |

¹ PostgreSQL has no Read Uncommitted — asking for it gives you Read Committed. There is no
mechanism to read an uncommitted row.

² A plain read-then-write loses updates. A guarded `UPDATE … WHERE balance >= 100` does not,
because `UPDATE` re-reads the row under a row lock and re-evaluates the predicate.

³ Stricter than the standard. PostgreSQL's Repeatable Read is true **snapshot isolation**:
the whole transaction sees one frozen snapshot, so new rows cannot appear.

⁴ First updater wins; the loser gets `could not serialize access due to concurrent update`
and must retry.

So the real choice in PostgreSQL is narrower than the four-row table suggests. Read
Committed and Serializable differ in exactly one practically important way: **write skew**.

### Write skew: the anomaly `FOR UPDATE` does not fix

The standard example. A hospital requires **at least one doctor on call** at all times. Two
doctors are on call; both are tired; both click "go off call" simultaneously.

<Diagram>
<Row>
<Box title="Transaction A (Alice)" accent="#60a5fa">
<Field icon="1️⃣" code="SELECT count(*) FROM doctors WHERE on_call" hint="returns 2 — fine, I can leave" variant="neutral" />
<Field icon="2️⃣" code="UPDATE doctors SET on_call = false WHERE id = 'alice'" hint="writes her own row" variant="neutral" />
<Field icon="3️⃣" code="COMMIT" hint="valid in isolation" variant="neutral" />
</Box>
<Box title="Transaction B (Bob)" accent="#34d399">
<Field icon="1️⃣" code="SELECT count(*) FROM doctors WHERE on_call" hint="also returns 2 — fine, I can leave" variant="neutral" />
<Field icon="2️⃣" code="UPDATE doctors SET on_call = false WHERE id = 'bob'" hint="writes his own row" variant="neutral" />
<Field icon="3️⃣" code="COMMIT" hint="also valid in isolation" variant="neutral" />
</Box>
</Row>
<Arrow label="both commit — zero doctors on call, and neither transaction did anything wrong" />
</Diagram>

Now look at why locking does not save you. Each transaction **writes a different row**.
Alice locks Alice; Bob locks Bob. The locks never collide, so there is nothing to wait for
and nothing to detect. Adding `FOR UPDATE` to step 1 locks the rows each transaction
*read* — and at the moment they read, both rows exist and both are on call, so both locks
are granted and both transactions proceed exactly as before.

This is the shape that makes write skew different from a lost update. A lost update is two
transactions fighting over **one** row, and a row lock resolves it. Write skew is two
transactions agreeing about a **set** of rows and then each changing a different member of
it. There is no single row to lock.

:::note

`FOR UPDATE` *can* prevent write skew, but only if you lock something both transactions
must touch — a parent row, a shift record, a per-ward lock row. That is the
"materialise the conflict" technique, and it works by inventing a shared row so the
problem becomes a lost update. It is a real option, and it is a manual, easy-to-forget
one: every new code path has to remember to take the same lock.

:::

### Serializable is optimistic, not serial

The widespread claim is that Serializable makes transactions run one at a time — "the bank
manager freezes the building" — and that it is therefore unusable under load. That
describes two-phase locking, which is how some databases implement it. **It is not how
PostgreSQL implements it.**

PostgreSQL uses **Serialisable Snapshot Isolation (SSI)**. Transactions run concurrently,
at full speed, taking no additional blocking locks. The engine tracks read/write
dependencies between them and, when it spots a pattern that could produce a result no
serial order could have produced, it **aborts one of them** with
`ERROR: could not serialize access due to read/write dependencies among transactions`
(SQLSTATE `40001`).

<Diagram>
<Row>
<Box title="Two-phase locking — the mental model people have" accent="#fb7185">
<Field icon="⏳" code="readers block writers, writers block readers" hint="contention scales with traffic, even when nothing conflicts" variant="neutral" />
<Field icon="🐢" code="throughput falls under load" hint="transactions queue behind each other" variant="neutral" />
</Box>
<Box title="SSI — what PostgreSQL actually does" accent="#34d399">
<Field icon="🏃" code="no extra blocking at all" hint="transactions never wait on each other's reads" variant="neutral" />
<Field icon="💥" code="aborts on detected conflict, SQLSTATE 40001" hint="cost is a retry, paid only when there is a real conflict" variant="neutral" />
</Box>
</Row>
</Diagram>

So the honest cost of Serializable is **not latency**. It is that every transaction needs a
retry loop, because any of them can fail at commit through no fault of its own — plus some
bookkeeping memory for predicate locks, and a higher abort rate on genuinely contended
rows. Declining it for that reason is entirely reasonable. Declining it because "serialisable
means serial" means declining it in the cases where it would have been both correct and
cheap.

### So which do you use

Not one answer for the whole database. The level is per transaction, and the question to
ask is **what shape is the invariant I am protecting?**

<Diagram>
<Row>
<Box title="Single-row invariant" accent="#60a5fa">
<Field icon="✅" code="Read Committed + guarded UPDATE" hint="balance >= amount, stock >= qty, status = 'placed'" variant="neutral" />
<Field icon="🔒" code="the WHERE clause is the lock" hint="check and write in one statement; no read-then-write window" variant="neutral" />
</Box>
<Box title="Cross-row invariant" accent="#a78bfa">
<Field icon="✅" code="Serializable + retry loop" hint="at least one doctor on call, total exposure under a limit, no double-booked room" variant="neutral" />
<Field icon="🔁" code="catch 40001, retry the whole transaction" hint="the retry is the price; there is no cheaper correct option" variant="neutral" />
</Box>
</Row>
</Diagram>

A payment system is mostly the left-hand column, which is why Read Committed is the right
default for it — but "mostly" is not "entirely". A portfolio-level margin rule that reads
many positions to authorise one write is a cross-row invariant, and no amount of row
locking makes it safe.

For the mechanics of the locks themselves — `FOR UPDATE`, `NOWAIT`, `SKIP LOCKED`, version
columns and retry storms — see
[Optimistic vs Pessimistic Locking](./16-optimistic-vs-pessimistic-locking). This page is
about which anomalies the level permits; that one is about the tools you reach for inside a
level.

### Code: reproducing write skew in two psql sessions

```sql title="Setup"
CREATE TABLE doctors (id TEXT PRIMARY KEY, on_call BOOLEAN NOT NULL);
INSERT INTO doctors VALUES ('alice', true), ('bob', true);
```

```sql title="Session 1"
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM doctors WHERE on_call;        -- 2
UPDATE doctors SET on_call = false WHERE id = 'alice';
-- do not commit yet
```

```sql title="Session 2"
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM doctors WHERE on_call;        -- 2
UPDATE doctors SET on_call = false WHERE id = 'bob';
COMMIT;                                            -- succeeds
```

```sql title="Back in session 1"
COMMIT;                                            -- also succeeds
SELECT count(*) FROM doctors WHERE on_call;        -- 0  ← the invariant is broken
```

Re-run the whole thing with `BEGIN ISOLATION LEVEL SERIALIZABLE` and the second `COMMIT`
fails with SQLSTATE `40001` instead. Nothing blocked, nothing waited — one transaction was
simply told to try again.

### Say this in the interview

- Isolation levels are a **contract about observable anomalies**, not a speed dial.
- In PostgreSQL the practical gap between Read Committed and Serializable is **write
  skew**, because Repeatable Read already gives you snapshot isolation and therefore no
  phantom reads.
- `SELECT … FOR UPDATE` fixes lost updates, **not** write skew — two transactions writing
  different rows never contend for a lock.
- PostgreSQL's Serializable is **optimistic (SSI)**: no extra blocking, aborts on conflict,
  and the real cost is a retry loop rather than latency.
- Choose per transaction by the shape of the invariant: single-row predicates go in a
  guarded `UPDATE` under Read Committed; cross-row invariants want Serializable.
