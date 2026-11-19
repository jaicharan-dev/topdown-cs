---
id: 34-isolation-levels-read-committed-vs-serializable
title: "Choosing an Isolation Level for Payments"
description: "Read Committed with the invariants enforced by constraints and atomic statements, and Serializable reserved for the transactions that genuinely need it"

sidebar_position: 34
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Which isolation level would you use in a high-traffic payment system, and why? What are the trade-offs between Read Committed and Serializable, and which anomalies does each one actually prevent?"

---

### Picture it

A busy counting house where clerks work on the same ledgers all day.

**The strictest rule** is that only one clerk may touch the ledgers at a time. Nothing can possibly go wrong, and with two hundred clerks and one queue, almost nothing gets done. Strictness is not free; it is **paid in throughput**, and in a busy house that bill is enormous.

**The loosest workable rule** is that clerks may work simultaneously and may only read entries that have been **properly finalised**, never a half-written one. That keeps things moving, and it leaves specific gaps: two clerks can both read a balance of five hundred, each subtract a hundred, and each write four hundred, so **one of the subtractions simply vanishes**.

**But here is the thing worth noticing.** That particular disaster is not really a question of how strict the rule is. It happens because each clerk **read a figure, did arithmetic in their head, and wrote a new figure back**. If instead the instruction were "**subtract a hundred from whatever is there**", handed to the ledger itself, the problem could not arise at any strictness, because there is no gap between reading and writing for anything to slip into.

And the same is true of most of the house's rules. "An account may never go below zero" does not need a strict regime: it needs a **line in the ledger's own rules** that refuses such an entry. "This payment must be recorded once" does not need a strict regime: it needs a **reference number** that cannot appear twice.

**Which leaves a small, awkward residue.** Rules that span **several** entries at once, where each clerk checks the rule, each individually satisfies it, and the **combination** breaks it. Two clerks each confirming another doctor is on call, each going home. That genuinely does need the strict regime, and there are usually only a handful of such operations in a system.

So the sensible house does not choose between loose and strict. It runs **loose by default**, makes the ledger itself refuse illegal entries, phrases instructions so there is no gap between reading and writing, and **reserves the strict regime for the few operations where a rule spans several entries at once**.

---

### The proper terms

#### The answer, stated first

**Read Committed as the default, plus constraints, atomic statements and idempotency keys for correctness, escalating specific transactions to Serializable only where an invariant spans multiple rows.**

That is the answer a payments engineer gives, and the reasoning matters more than the choice.

#### What each level actually prevents

**Read Committed** prevents **dirty reads** and nothing else. It permits:

**Non-repeatable reads**: a row read twice in one transaction can change between the reads.

**Phantom reads**: a query's result set can grow or shrink between executions.

**Lost updates**: under MVCC without explicit locking, two read-modify-write sequences can overwrite each other.

**Write skew**: two transactions reading overlapping data and writing to disjoint rows can jointly break an invariant each preserved individually.

**Serializable** prevents **all** of them, by definition: the result is equivalent to running the transactions **one at a time in some order**.

Between them, **Repeatable Read** prevents non-repeatable reads too, and in PostgreSQL is actually **snapshot isolation**, which also prevents phantoms but still permits **write skew**.

#### The trade-offs

**Why not Serializable everywhere**, which is the obvious first instinct:

**Throughput.** Under two-phase locking, serializable means readers block writers and writers block readers, so concurrency falls sharply. Under PostgreSQL's **SSI** nothing blocks, but transactions are **aborted** when the dependency graph shows a result that could not have occurred serially.

**The abort rate grows with contention and with transaction length.** On a hot row, a long serializable transaction may abort repeatedly, and the retries add load, which lengthens transactions, which causes more aborts. In a high-traffic payment system that converts a latency problem into a **throughput collapse**.

**Every transaction needs a retry loop.** `SERIALIZABLE` in PostgreSQL is not transparent: application code **must** handle serialization failures and retry, with backoff and jitter, and must be **idempotent** enough to be retried safely. Making every transaction serializable means making every transaction retryable.

**Why not Read Committed alone:**

**Lost updates** silently discard a write, which in a payment system means a debit that never happened.

**Write skew** breaks invariants that span rows, such as a total across two accounts or a daily spending limit.

#### Why most payment correctness should not depend on the isolation level at all

This is the part that distinguishes a considered answer, and it is the real content of the question.

**A system that needs `SERIALIZABLE` to avoid double-spending is fragile. A system that makes double-spending impossible by construction is not.**

Four mechanisms do most of the work, and all of them hold at **every** isolation level:

**Atomic statements.** `UPDATE accounts SET balance = balance - 100 WHERE id = ? AND balance >= 100` performs the check and the write **in one statement, under the row lock**. There is no read-modify-write window, so **lost update cannot occur** and no isolation level is required. If it affects zero rows, there were insufficient funds. This single pattern eliminates the most common payment race.

**Constraints.** `CHECK (balance >= 0)` is enforced on every write at every isolation level and cannot be bypassed by any ordering of transactions. A `UNIQUE` constraint on an idempotency key makes a duplicate charge **impossible** rather than unlikely.

**Explicit locking.** `SELECT ... FOR UPDATE` in a consistent order makes a multi-step sequence safe without raising the global level, and the consistent ordering prevents deadlock.

**Idempotency keys.** Retries are unavoidable over a network, so the system must tolerate them. A client-supplied key, recorded **in the same transaction as the side effect**, makes a retry return the original result instead of charging again.

With those in place, the isolation level is handling **what is left**, which is a small set of multi-row invariants.

#### The anomalies in payment terms

**Lost update.** Two concurrent debits read a balance of 500, each computes 400, each writes 400. One debit has vanished. Read Committed does not prevent this; an atomic statement or `FOR UPDATE` does.

**Write skew.** An invariant across rows, such as "the combined balance of these two accounts must stay positive". Two transfers each read both balances, each confirms the invariant holds, each moves money from a different account, and together they break it. Only Serializable prevents this, or materialising the conflict so the two transactions touch a common row.

**Phantom.** A daily limit check counting today's transactions while another transaction inserts one, so both pass the check and the limit is exceeded. Prevented by Serializable, or by a constraint over a materialised counter.

**Read skew.** A report reading two accounts at different moments and seeing a transfer half-applied, so the totals do not balance. Prevented by Repeatable Read upward, which gives a consistent snapshot.

#### Engine specifics worth knowing

**PostgreSQL Read Committed** takes a **fresh snapshot per statement**, and when an `UPDATE` finds a row changed by a concurrent transaction it **re-evaluates the `WHERE` clause against the new version** rather than operating on stale data. That means a simple `UPDATE ... WHERE` is safer at Read Committed than the theory suggests, which is part of why the default is workable.

**PostgreSQL Repeatable Read** is snapshot isolation and uses **first-updater-wins**, aborting the second writer with "could not serialize access due to concurrent update", so it **detects** lost updates rather than preventing them.

**PostgreSQL Serializable** uses **SSI**, which does not block and instead aborts transactions forming a dangerous dependency structure, so it needs the retry loop.

**MySQL InnoDB** defaults to **Repeatable Read**, and adds **next-key locking** on locking reads, which prevents phantoms for those reads, so its Repeatable Read is stronger than the standard's. Plain reads remain snapshot reads, so **lost update is still possible** without `FOR UPDATE`.

**Oracle's `SERIALIZABLE`** is actually snapshot isolation, so it **permits write skew** despite the name. This matters: a system assuming the word means what the standard says is relying on a guarantee it does not have.

#### The design in practice

**Default to Read Committed**, the engine default and what almost every production system runs.

**Express value changes as atomic statements**, so the common races cannot occur.

**Push invariants into constraints** wherever they can be expressed declaratively.

**Use `SELECT ... FOR UPDATE` in a consistent key order** for multi-step sequences on a known set of rows.

**Escalate to `SERIALIZABLE` for the specific transactions holding a multi-row invariant**, with a retry loop and backoff, and keep those transactions short to keep the abort rate low.

**Make everything idempotent**, with a client-supplied key stored in the same transaction as the side effect.

And the sentence to close on: **the isolation level is the last line of defence, not the first.** A payment system whose correctness rests entirely on it has put its invariants somewhere the database cannot help enforce.

---

### In code

```text
THE ANSWER, stated first:

  READ COMMITTED as the default,
  plus CONSTRAINTS, ATOMIC STATEMENTS and IDEMPOTENCY KEYS for
  correctness,
  escalating specific transactions to SERIALIZABLE only where an
  invariant SPANS MULTIPLE ROWS.
```

```text
WHAT EACH LEVEL ACTUALLY PREVENTS:

                        READ COMMITTED    SERIALIZABLE
  dirty read            PREVENTED         prevented
  non-repeatable read   permitted         prevented
  phantom read          permitted         prevented
  LOST UPDATE           PERMITTED         prevented
  WRITE SKEW            PERMITTED         prevented

  Read Committed prevents DIRTY READS AND NOTHING ELSE.
  Serializable prevents ALL of them by definition: the result is
  equivalent to running the transactions ONE AT A TIME.

  and between them, REPEATABLE READ prevents non-repeatable reads,
  and in PostgreSQL is actually SNAPSHOT ISOLATION, which also
  prevents phantoms but STILL PERMITS WRITE SKEW.
```

```text
THE TRADE-OFFS

  WHY NOT SERIALIZABLE EVERYWHERE:

     THROUGHPUT         under 2PL, readers block writers and writers
                        block readers, so concurrency falls sharply.
                        under PostgreSQL's SSI nothing blocks, but
                        transactions are ABORTED when the dependency
                        graph shows a result that could not have
                        occurred serially.

     THE ABORT RATE     grows with CONTENTION and TRANSACTION
                        LENGTH. On a hot row a long serializable
                        transaction aborts repeatedly, the retries
                        add load, which lengthens transactions,
                        which causes more aborts.
                        -> in a high-traffic payment system this
                           converts a LATENCY problem into a
                           THROUGHPUT COLLAPSE.

     EVERY TRANSACTION  SERIALIZABLE in PostgreSQL is NOT
     NEEDS A RETRY      TRANSPARENT: application code MUST handle
     LOOP               serialization failures, retry with backoff
                        and jitter, and be IDEMPOTENT enough to be
                        retried safely.
                        making everything serializable means making
                        EVERYTHING RETRYABLE.

  WHY NOT READ COMMITTED ALONE:

     LOST UPDATES       silently discard a write: a debit that never
                        happened
     WRITE SKEW         breaks invariants spanning rows: a total
                        across two accounts, a daily limit
```

```sql
-- WHY MOST PAYMENT CORRECTNESS SHOULD NOT DEPEND ON THE ISOLATION
-- LEVEL AT ALL.
--
-- A system that needs SERIALIZABLE to avoid double-spending is
-- FRAGILE. A system that makes it IMPOSSIBLE BY CONSTRUCTION is not.

-- 1. ATOMIC STATEMENTS: the check and the write in ONE statement,
--    under the row lock. NO read-modify-write window at all, so
--    LOST UPDATE CANNOT OCCUR AT ANY ISOLATION LEVEL.
UPDATE accounts
SET    balance = balance - 100
WHERE  id = :id AND balance >= 100;
--   0 rows affected -> insufficient funds, and you know it
--                      WITHOUT a prior SELECT
--   this single pattern eliminates the most common payment race.

-- 2. CONSTRAINTS: enforced on EVERY write at EVERY isolation level,
--    and unbypassable by any ordering of transactions
ALTER TABLE accounts ADD CONSTRAINT balance_non_negative
    CHECK (balance >= 0);

CREATE UNIQUE INDEX ON payments (account_id, idempotency_key);
--   makes a duplicate charge IMPOSSIBLE rather than unlikely

-- 3. EXPLICIT LOCKING in a CONSISTENT ORDER, which also prevents
--    deadlock, without raising the global level
BEGIN;
  SELECT * FROM accounts WHERE id IN (:a, :b) ORDER BY id FOR UPDATE;
  UPDATE accounts SET balance = balance - 100 WHERE id = :a;
  UPDATE accounts SET balance = balance + 100 WHERE id = :b;
COMMIT;

-- 4. IDEMPOTENCY KEYS, recorded IN THE SAME TRANSACTION as the side
--    effect, so a retry returns the original result instead of
--    charging again
```

```sql
-- THE ANOMALIES, IN PAYMENT TERMS

-- LOST UPDATE: two concurrent debits
-- txn A                              txn B
SELECT balance FROM accounts   --500
                                   SELECT balance FROM accounts  --500
-- app computes 500 - 100 = 400        app computes 500 - 100 = 400
UPDATE accounts SET balance=400;
                                   UPDATE accounts SET balance=400;
-- final balance 400. ONE DEBIT HAS VANISHED.
-- READ COMMITTED DOES NOT PREVENT THIS.
-- an atomic statement or FOR UPDATE does.

-- WRITE SKEW: an invariant ACROSS rows
-- "the combined balance of these two accounts must stay positive"
-- txn A                              txn B
-- reads both: 100 + 100 = 200        reads both: 100 + 100 = 200
-- "fine, I can take 150 from A"      "fine, I can take 150 from B"
UPDATE accounts SET balance = -50
WHERE id = :a;                     UPDATE accounts SET balance = -50
                                   WHERE id = :b;
-- combined balance is now -100. NEITHER transaction broke the rule
-- alone, and NO TWO WRITES TOUCHED THE SAME ROW, so nothing
-- collided.
-- ONLY SERIALIZABLE PREVENTS THIS, or materialising the conflict so
-- both transactions touch a common row.

-- PHANTOM: a daily limit check counting today's transactions while
-- another inserts one, so both pass and the limit is exceeded.
-- READ SKEW: a report reading two accounts at different moments and
-- seeing a transfer half-applied, so the totals do not balance.
```

```text
ENGINE SPECIFICS WORTH KNOWING:

  POSTGRESQL READ COMMITTED
     a FRESH SNAPSHOT PER STATEMENT, and when an UPDATE finds a row
     changed by a concurrent transaction it RE-EVALUATES THE WHERE
     CLAUSE AGAINST THE NEW VERSION rather than operating on stale
     data.
     -> a simple UPDATE ... WHERE is SAFER at Read Committed than
        the theory suggests, which is part of why the default is
        workable.

  POSTGRESQL REPEATABLE READ
     snapshot isolation with FIRST-UPDATER-WINS, aborting the second
     writer with "could not serialize access due to concurrent
     update"
     -> it DETECTS lost updates rather than preventing them

  POSTGRESQL SERIALIZABLE
     SSI: does not block, aborts transactions forming a dangerous
     dependency structure
     -> NEEDS THE RETRY LOOP

  MYSQL INNODB
     defaults to REPEATABLE READ, with NEXT-KEY LOCKING on locking
     reads, which prevents phantoms for those reads, so its
     Repeatable Read is STRONGER than the standard's.
     plain reads remain snapshot reads, so LOST UPDATE IS STILL
     POSSIBLE without FOR UPDATE.

  ORACLE
     its SERIALIZABLE is ACTUALLY SNAPSHOT ISOLATION, so it PERMITS
     WRITE SKEW despite the name.
     -> a system assuming the word means what the standard says is
        relying on a guarantee it does not have.
```

```text
THE DESIGN IN PRACTICE:

  1. DEFAULT TO READ COMMITTED
        the engine default, and what almost every production system
        runs

  2. EXPRESS VALUE CHANGES AS ATOMIC STATEMENTS
        so the common races cannot occur at any level

  3. PUSH INVARIANTS INTO CONSTRAINTS
        wherever they can be expressed declaratively

  4. USE SELECT ... FOR UPDATE IN A CONSISTENT KEY ORDER
        for multi-step sequences on a known set of rows
        (the ordering also prevents deadlock)

  5. ESCALATE TO SERIALIZABLE FOR THE SPECIFIC TRANSACTIONS HOLDING
     A MULTI-ROW INVARIANT
        with a retry loop and backoff, and keep them SHORT to keep
        the abort rate low

  6. MAKE EVERYTHING IDEMPOTENT
        a client-supplied key stored in the SAME TRANSACTION as the
        side effect

  and the sentence to close on:
     THE ISOLATION LEVEL IS THE LAST LINE OF DEFENCE, NOT THE FIRST.
     a payment system whose correctness rests entirely on it has put
     its invariants somewhere the database cannot help enforce.
```

---

### What they ask next

**"Why not just use Serializable for everything?"**
Throughput. Under two-phase locking it blocks heavily, and under SSI it aborts transactions, with the abort rate rising with contention and transaction length, so retries add load that causes more aborts. It also makes every transaction require a retry loop and be safely retryable.

**"What does Read Committed actually prevent?"**
Dirty reads, and nothing else. It permits non-repeatable reads, phantoms, lost updates under MVCC without locking, and write skew. That is why it must be paired with constraints and atomic statements rather than relied on alone.

**"How do you prevent a lost update at Read Committed?"**
Make the update atomic, so the check and the write happen in one statement under the row lock, which removes the read-modify-write window entirely. Alternatively take `SELECT ... FOR UPDATE` at read time, or use optimistic locking with a version column.

**"What is write skew in a payment system?"**
Two transactions reading overlapping rows, each confirming an invariant such as a combined balance, and each writing to a **different** row, so nothing collides and the combination breaks the rule. Only Serializable catches it, or materialising the conflict onto a shared row.

**"Why is PostgreSQL's Read Committed better than the theory suggests?"**
Because an `UPDATE` that finds a row changed by a concurrent transaction re-evaluates its `WHERE` clause against the new version rather than proceeding on stale data. That makes simple conditional updates safe, which is a large part of why the default is practical.

**"What is wrong with Oracle's Serializable?"**
It is snapshot isolation, so it permits write skew despite the name. Code written assuming the standard's meaning is relying on a guarantee the engine does not provide, which is exactly the kind of assumption that fails rarely and expensively.

**"What does SSI require of application code?"**
A retry loop. It does not block; it aborts transactions whose outcome could not have occurred serially, so every serializable transaction must handle a serialization failure, retry with backoff and jitter, and be safe to retry.

**"Where should payment invariants actually live?"**
In constraints and in the structure of the statements, not in the isolation level. A check constraint and a unique index on the idempotency key hold at every level and cannot be bypassed, whereas an isolation level only constrains how transactions interleave.

**The common wrong answer** is "payments need Serializable because money is involved". It names the strictest option without the cost, and misses that most payment races are eliminated by **atomic statements and constraints**, which hold at every level, so Serializable should be reserved for the handful of transactions carrying a **multi-row invariant**, with a retry loop, because in a high-traffic system making everything serializable trades correctness you already had for throughput you cannot spare.

---

### Say this in the interview

*"I would use Read Committed as the default, with constraints, atomic statements and idempotency keys carrying most of the correctness, and escalate specific transactions to Serializable only where an invariant spans multiple rows. The reasoning matters more than the choice.*

*On what each level prevents: Read Committed prevents dirty reads and nothing else. It permits non-repeatable reads, phantoms, lost updates under MVCC without explicit locking, and write skew. Serializable prevents all of them by definition, since the result is equivalent to running transactions one at a time. Between them, Repeatable Read also prevents non-repeatable reads, and in PostgreSQL is actually snapshot isolation, which prevents phantoms too but still permits write skew.*

*Why not Serializable everywhere: throughput. Under two-phase locking readers block writers and writers block readers, so concurrency falls sharply, and under PostgreSQL's SSI nothing blocks but transactions are aborted when the dependency graph shows a result that could not have occurred serially. The abort rate grows with contention and transaction length, so on a hot row a long transaction aborts repeatedly and the retries add load, which lengthens transactions and causes more aborts, which in a high-traffic payment system turns a latency problem into a throughput collapse. And it is not transparent: every transaction needs a retry loop with backoff and must be idempotent enough to be retried safely, so making everything serializable means making everything retryable.*

*But the part I would emphasise is that most payment correctness should not depend on the isolation level at all. A system that needs Serializable to avoid double-spending is fragile; one that makes it impossible by construction is not. Four mechanisms do most of the work and hold at every level. Atomic statements: UPDATE accounts SET balance equals balance minus a hundred WHERE id and balance at least a hundred does the check and the write in one statement under the row lock, so there is no read-modify-write window, lost update cannot occur at any isolation level, and zero rows affected tells you there were insufficient funds without a prior SELECT. Constraints: a check that balance is non-negative is enforced on every write and cannot be bypassed by any interleaving, and a unique index on the idempotency key makes a duplicate charge impossible rather than unlikely. Explicit locking with SELECT FOR UPDATE in a consistent key order, which also prevents deadlock, for multi-step sequences. And idempotency keys recorded in the same transaction as the side effect, since retries are unavoidable over a network.*

*With those in place the isolation level is handling what is left, which is a small set of multi-row invariants. In payment terms: a lost update is two concurrent debits each reading five hundred, each computing four hundred and each writing it, so one debit vanishes, and Read Committed does not prevent that while an atomic statement does. Write skew is an invariant across rows, like a combined balance, where two transfers each confirm the rule holds and each take money from a different account, so nothing collides and together they break it, and only Serializable catches that, or materialising the conflict onto a shared row. A phantom is a daily limit check counting today's transactions while another inserts one. And read skew is a report seeing a transfer half-applied.*

*On engine specifics: PostgreSQL's Read Committed takes a fresh snapshot per statement and, when an UPDATE finds a row changed concurrently, re-evaluates the WHERE clause against the new version rather than using stale data, which makes a simple conditional update safer than the theory suggests and is part of why the default is workable. Its Repeatable Read is snapshot isolation with first-updater-wins, so it detects lost updates rather than preventing them. Its Serializable is SSI, which needs a retry loop. MySQL InnoDB defaults to Repeatable Read with next-key locking on locking reads, so its Repeatable Read is stronger than the standard's, though plain reads remain snapshot reads so lost update is still possible without FOR UPDATE. And Oracle's Serializable is actually snapshot isolation, so it permits write skew despite the name, which means code assuming the standard's meaning is relying on a guarantee it does not have.*

*So in practice: default to Read Committed; express value changes as atomic statements; push invariants into constraints wherever they can be stated declaratively; use SELECT FOR UPDATE in a consistent key order for multi-step sequences; escalate to Serializable for the specific transactions holding a multi-row invariant, with a retry loop and short transactions to keep the abort rate low; and make everything idempotent. The sentence I would close on is that the isolation level is the last line of defence, not the first: a payment system whose correctness rests entirely on it has put its invariants somewhere the database cannot help enforce."*
