---
id: 35-crash-recovery-and-idempotency
title: "Crash Recovery & Idempotency: Surviving Failure Mid-Transaction"
description: "How a database survives losing power mid-transaction, why PostgreSQL recovery is redo-only rather than a rollback pass, how idempotency keys make a retry safe, and why the transactional outbox exists where two-phase commit cannot."
sidebar_position: 4.5
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field, Arrow } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "How do you guarantee that no money is lost or duplicated if the system crashes mid-transaction? Walk me through what happens if the database loses power, if the application server dies before responding, and if a third-party payment API times out."

The useful move here is to refuse to answer "the system crashes" as one question. There are
**three places** a crash can land, each protected by a different mechanism, and conflating
them is what makes this question hard.

<Diagram>
<Row>
<Box title="1. The database dies" accent="#fb7185">
<Field icon="🔌" code="power lost mid-UPDATE" hint="protected by the write-ahead log" variant="neutral" />
</Box>
<Box title="2. The app server dies" accent="#fb923c">
<Field icon="💀" code="committed, but never replied" hint="protected by idempotency keys" variant="neutral" />
</Box>
<Box title="3. A third party times out" accent="#a78bfa">
<Field icon="🌐" code="did the bank take the money?" hint="protected by an outbox and reconciliation" variant="neutral" />
</Box>
</Row>
</Diagram>

Notice that only the first is the database's problem. The other two are *yours*, and they
are where almost all real money is lost.

### Layer 1 — the database: the write-ahead log

A database does not write your change straight onto the data pages on disk. It first
appends a record of what it intends to do to an append-only file — the **write-ahead log**
— and flushes *that* to durable storage. Only then are the data pages modified, lazily,
in memory, and written back later at a checkpoint.

The rule is in the name: **the log is written ahead of the data.** A transaction is
committed at the instant its commit record is durably in the log, not when its pages reach
disk. That is what makes `COMMIT` fast and still safe.

<Diagram>
<Row>
<Box title="On COMMIT" accent="#34d399">
<Field icon="📝" code="append change records to WAL" hint="sequential write — cheap" variant="neutral" />
<Field icon="💾" code="fsync the WAL" hint="this is the durability point" variant="neutral" />
<Field icon="✅" code="return success to the client" hint="data pages are still only in memory" variant="neutral" />
</Box>
<Box title="On restart after a crash" accent="#60a5fa">
<Field icon="🔎" code="find the last checkpoint" hint="everything before it is already on disk" variant="neutral" />
<Field icon="▶️" code="replay the WAL forward from there" hint="redo — re-apply every logged change" variant="neutral" />
<Field icon="🚫" code="uncommitted transactions are simply never visible" hint="no undo pass; see below" variant="neutral" />
</Box>
</Row>
</Diagram>

:::note

**A correction worth making, because the usual answer gets it wrong.** The standard
explanation is that recovery "finds transactions that started but never committed and rolls
them back". That describes systems with undo logs, such as InnoDB. **PostgreSQL has no undo
pass at all.**

PostgreSQL recovery is **redo-only**. It replays the WAL forward, which may well re-apply
changes belonging to transactions that never committed. That is harmless, because of MVCC:
every row version carries the transaction id that created it, and visibility is decided by
looking that id up in the commit log. A transaction that never committed is marked aborted,
so its row versions are invisible to everyone — they are dead tuples, and `VACUUM` reclaims
the space later.

So nothing is "undone". The partial work is written, and then ignored forever. Saying this
is a reliable way to show you have read past the textbook paragraph.

:::

### Layer 2 — the app server: idempotency keys

The database committed. The money moved. Then the server died before the `200 OK` reached
the phone, so the user sees "network error" and taps send again.

Nothing in the database can help here, because from its point of view the second tap is a
completely legitimate new request to move more money. The fix has to make the *request*
identifiable.

The client generates a unique key **before** the first attempt — once per user intent, not
once per HTTP call — and sends the same key on every retry.

<Diagram>
<Row>
<Box title="First request" accent="#60a5fa">
<Field icon="🔑" code="Idempotency-Key: 9b1deb4d" hint="generated when the screen opened" variant="neutral" />
<Field icon="➕" code="INSERT INTO idempotency_keys ..." hint="same transaction as the money movement" variant="neutral" />
<Field icon="✅" code="COMMIT, store the response" hint="key and effect are now atomic with each other" variant="neutral" />
</Box>
<Box title="The retry" accent="#34d399">
<Field icon="🔑" code="Idempotency-Key: 9b1deb4d" hint="identical — same intent, not a new one" variant="neutral" />
<Field icon="💥" code="unique violation on INSERT" hint="the database refuses it; no money moves" variant="neutral" />
<Field icon="↩️" code="return the stored response" hint="the user sees the original success" variant="neutral" />
</Box>
</Row>
</Diagram>

```sql title="The table, and why the response is stored with the key"
CREATE TABLE idempotency_keys (
    key            TEXT        PRIMARY KEY,
    user_id        BIGINT      NOT NULL,
    request_hash   TEXT        NOT NULL,
    state          TEXT        NOT NULL,      -- 'in_flight' | 'done'
    response_body  JSONB,
    transaction_id BIGINT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Three details that the short version of this answer skips, and that an interviewer will
probe:

**The key row is written in the same transaction as the effect.** If you record the key
first and commit separately, a crash between the two leaves a key with no transfer, and the
retry is told "already done" for something that never happened. One transaction, or the
guarantee is gone.

**`request_hash` catches the key being reused with different content.** A client bug — or
an attacker — that sends the same key with a different amount must be rejected loudly, not
served the cached response for a different transfer.

**`in_flight` handles the genuinely hard case:** the retry arriving while the first request
is *still running*. The second request hits the unique constraint but there is no stored
response yet, because the first has not committed. The correct reply is `409 Conflict` with
"retry shortly" — not a success it cannot substantiate, and not a second attempt at the
transfer.

### Layer 3 — third parties: there is no two-phase commit

The transfer involves a payment gateway. You committed locally; the gateway call timed out.
Did they take the money or not?

The instinct is a distributed transaction across both. It is not available, for a blunt
reason: **two-phase commit requires every participant to implement prepare-and-commit and
to hold locks while a coordinator decides.** A third-party HTTPS API does neither, and no
willingness on your side changes that.

So the guarantee is assembled from what a single-database transaction *can* promise. The
standard construction is the **transactional outbox**.

<Diagram>
<Row>
<Box title="One local transaction" accent="#60a5fa">
<Field icon="💸" code="UPDATE balances ..." hint="the business change" variant="neutral" />
<Field icon="📬" code="INSERT INTO outbox ..." hint="the intent to tell the outside world" variant="neutral" />
<Field icon="✅" code="COMMIT" hint="both or neither — ordinary ACID, no coordinator" variant="neutral" />
</Box>
<Box title="A separate relay" accent="#34d399">
<Field icon="🔁" code="SELECT ... WHERE published_at IS NULL" hint="reads unpublished rows" variant="neutral" />
<Field icon="📡" code="call the gateway, publish the event" hint="carrying our idempotency key" variant="neutral" />
<Field icon="🏷️" code="mark published" hint="may crash here — hence at-least-once" variant="neutral" />
</Box>
</Row>
<Arrow label="the database and the outside world can never disagree about whether the event happened" />
</Diagram>

The relay can crash between sending and marking, so a message may go twice. That is the
trade: **at-least-once delivery with idempotent consumers, instead of exactly-once delivery
that is not purchasable at any price.** Which is why the gateway call carries an idempotency
key of its own — the same mechanism from Layer 2, now pointed outward.

### Reconciliation: the net under all three

Everything above reduces the probability of divergence. None of it reaches zero, because
the other side is a system you do not control and occasionally it is simply wrong.

So a sweeper runs continuously over anything stuck:

```sql title="Finding transactions in limbo"
SELECT transaction_id, external_reference
  FROM transactions
 WHERE state = 'pending'
   AND created_at < now() - INTERVAL '10 minutes'
 ORDER BY created_at
 LIMIT 500;
```

For each, it asks the provider what actually happened and moves the local record to match —
`success` if they have it, `failed` if they do not. And separately, nightly, the stronger
check: **sum every balance and compare it against the ledger and the bank's own statement.**
If it is out by a single paisa, alert.

That last one is not paranoia. It is the only control that catches a bug nobody anticipated,
and it is the reason a double-entry journal is worth its cost — see
[the Zerodha schema question](../database-design/7-stock-trading-zerodha-groww), where the
books balancing is a single aggregate over one column rather than a script someone has to
maintain.

### Say this in the interview

- **Split the question into three layers** before answering. "The system crashes" is three
  different failures with three different mechanisms.
- **WAL is the log written before the data**, and commit means the log record is durable —
  not that the pages are on disk.
- **PostgreSQL recovery is redo-only.** There is no rollback pass; uncommitted work is
  replayed and then rendered invisible by MVCC, and vacuumed later.
- **Idempotency keys protect the retry**, and the key must be written in the same
  transaction as the effect — plus a request hash, plus an in-flight state for the retry
  that arrives mid-flight.
- **Two-phase commit is unavailable across third parties.** An outbox plus idempotent
  consumers gives at-least-once, which is the strongest thing on offer.
- **Reconciliation is the net**, and the only control that catches the failure you did not
  predict.
