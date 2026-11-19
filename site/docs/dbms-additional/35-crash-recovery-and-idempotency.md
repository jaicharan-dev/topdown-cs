---
id: 35-crash-recovery-and-idempotency
title: "Crash Recovery & Idempotency"
description: "Three failures at three boundaries, where the database solves the first, an idempotency key solves the second, and nothing can make the third atomic"

sidebar_position: 35
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "How do you guarantee that no money is lost or duplicated if the system crashes mid-transaction? Walk me through what happens if the database loses power, if the application server dies before responding, and if a third-party payment API times out."

---

### Picture it

A payment involves three handovers, and a crash at each one is a **different problem** with a **different owner**.

**The first handover is inside the ledger.** Money leaves one account and enters another, and the power fails between the two halves. This one is **solved**, properly and completely, and the solution is older than any of us: **you write down what you are about to do before you do it**. After the power returns, the notes say which operations were finished and which were half-done, so the finished ones are completed and the half-done ones are erased. Nobody has to think about it, because the ledger itself handles it.

**The second handover is to the person who asked.** The ledger is correct, the money has moved, and the clerk collapses **before telling the customer**. Now the ledger and the customer **disagree about what happened**, and the customer cannot tell whether their instruction was carried out or never arrived. If they ask again, they might pay twice.

This is not fixable by being more careful, because there is **no moment** at which both the ledger and the customer are simultaneously certain. What you can do instead is make **asking again harmless**: give every instruction a **reference number**, written down **at the same instant as the money moves**, so a repeated instruction with the same number is recognised and the original receipt is handed back.

**The third handover is to another institution entirely.** You have asked a bank to move money and the line goes dead. You do not know whether they did it. You cannot look in their ledger, you cannot undo their work, and **you cannot make their action and yours happen together**, because they are not part of your ledger and never will be.

So the shape of the solution changes. You **write down your intention before you ask**, so that whatever happens you know afterwards that you asked. You give them **your reference number**, so asking again is safe at their end too. And you accept that some instructions will end in an unknown state, so somebody must come back later and **ask them what happened**.

Three failures, three mechanisms: **a log, a reference number, and a reconciliation**. The further the boundary, the weaker the guarantee available and the more the work falls to you.

---

### The proper terms

#### Failure 1: the database loses power mid-transaction

This is the solved case, and the solution is the **write-ahead log**.

**The mechanism** is two rules that must both hold:

**The write-ahead rule**, for atomicity: a log record describing a change must reach **durable storage before the modified data page does**. Otherwise a crash could leave a dirty, uncommitted page on disk with **no record of its previous value**, making it impossible to undo.

**The commit rule**, for durability: **all** of a transaction's log records must be durable **before the commit is acknowledged** to the client. Otherwise the client is told the data is safe when it is not.

Together: **log first, data later, and never acknowledge a commit before its log is flushed.**

**Recovery** then follows the **ARIES** scheme, in three passes:

**Analysis.** Scan forward from the last checkpoint to determine which transactions were **in flight** and which pages were **dirty**.

**Redo.** Reapply **every** logged change since the checkpoint, **committed or not**, which reconstructs the exact state at the moment of the crash.

**Undo.** Roll back every transaction that had not committed, using the old values recorded in the log.

**The result** is exactly the guarantee the question asks for: a **committed** transfer is durable, and an **uncommitted** one is as if it never happened. **There is no partial state.** The money either moved or it did not, and a transfer that debited one account without crediting the other cannot survive a crash.

**The caveats** worth naming, because they are where this guarantee actually fails in practice:

**`fsync` must reach the physical medium.** A drive with a volatile write cache that reports success before the data is durable breaks the entire chain, which is why enterprise drives have battery-backed or capacitor-backed caches and why `fsync` behaviour is worth verifying rather than assuming.

**Durability can be traded away by configuration.** `synchronous_commit = off` in PostgreSQL, or `innodb_flush_log_at_trx_commit` set to 0 or 2, acknowledge commits before the log is durable. That is a legitimate choice for some workloads and **not** for money.

**Replication is not durability** unless the replica has also flushed. Acknowledging when a replica has the data in memory survives one machine failing and not a correlated power loss.

#### Failure 2: the application server dies before responding

Here the **database is correct** and the **client does not know it**.

The transaction either committed or it did not, and the database knows which, but **the client sees only a timeout**, which is **indistinguishable** from the request never arriving. There is no observation the client can make to tell the two apart, so this is not a bug to fix but an **ambiguity to design around**.

The mechanism is an **idempotency key**:

**The client generates a unique key per logical operation**, not per HTTP attempt. Regenerating it on retry is the most common implementation bug and defeats the whole mechanism.

**The server records the key with the outcome**, and a repeat request with the same key returns the recorded outcome rather than performing the work again.

**The critical detail**, and the thing to say without being asked: **the idempotency record and the side effect must be committed in the same transaction.** If you charge the card and **then** record the key, a crash in between leaves no record, and the retry charges again. The guarantee comes entirely from their atomicity.

The implementation, briefly, because the awkward cases are where real systems fail:

**Claim the key atomically before doing any work**, by inserting a row with status `in_progress` and relying on a **unique constraint**. That constraint **is** the concurrency control: checking then inserting is a race, whereas a unique index makes the check and the claim one atomic operation.

**A concurrent retry while the original is still running** finds the key `in_progress` with no result yet. Executing again double-charges; returning a fabricated success is a lie. The correct response is **`409 Conflict`**, telling the client to retry shortly.

**A reused key with a different payload** is not a retry, since a retry is by definition the same request. Returning the stored response would tell the client its **new** request succeeded when it never ran. The correct response is an explicit error, **`422`**, comparing a stored **fingerprint** of the request.

**A crashed original** leaves a row stranded `in_progress` forever, so the row needs a lease or timestamp that allows a sufficiently stale record to be reclaimed.

#### Failure 3: a third-party payment API times out

This is the hard one, and the first thing to say is why: the state lives in **someone else's system**. You cannot inspect it, you cannot roll it back, and you **cannot make their action atomic with yours**, because they will not participate in your transaction. Two-phase commit is not available, because no payment provider will join your coordinator.

So the guarantee changes shape: you cannot achieve atomicity, so you achieve **idempotency plus reconciliation**.

The pattern, in order:

**1. Record intent durably before calling out.** Insert a `payments` row with status `pending` and your own idempotency key, and commit it. Now, whatever happens next, you know afterwards that you **attempted** this. Without this step a crash during the call leaves no trace at all.

**2. Call the provider, passing your idempotency key.** Stripe, Adyen and every serious provider support this, precisely because the problem is universal. It means a retry at their end is safe.

**3. On a definite answer**, success or failure, record the outcome and finish.

**4. On a timeout or an unknown**, the two obvious reactions are both wrong. **Do not retry blindly without the key**, which risks a double charge. **Do not assume failure**, which risks losing a payment the customer was charged for. The correct options are to retry with the same idempotency key, which is safe because the provider deduplicates, or to **query the provider** for that key's status.

**5. Reconcile in the background.** A job sweeps `pending` rows older than some threshold and resolves each against the provider's API. This is not optional: some fraction of calls will always end in an unknown state, and without a reconciler those payments stay unresolved forever.

Two further rules that belong in the answer:

**Never hold a database transaction open across an external call.** It holds locks for the duration of **someone else's latency**, which turns their slow day into your outage.

**Webhooks must be idempotent and verified.** Providers retry them, so the same event will arrive more than once, and the handler must deduplicate on the event id. They must also be **signature-verified**, since the endpoint is public.

This shape has a name: the **transactional outbox**, where the intent is written in the same transaction as the business change and a separate process performs the external call, and more generally a **saga**, where a long-running operation is a sequence of local transactions with compensating actions rather than one distributed transaction.

#### The unifying principle

Worth stating explicitly, because it ties the three cases together:

**Inside one database, you get atomicity, and the write-ahead log provides it.**

**Across a process boundary, you cannot get atomicity, so you make operations idempotent and retryable.**

**Across an organisational boundary, you cannot even get a reliable answer, so you add reconciliation.**

Or, in one sentence: **you cannot make distributed operations atomic, so you make them idempotent, you record intent before acting, and you reconcile what remains unknown.**

---

### In code

```text
THREE HANDOVERS, THREE DIFFERENT PROBLEMS:

   [ application ] --(2)-- [ your database ]
         |
        (3)
         v
   [ payment provider ]

  (1) INSIDE THE DATABASE     SOLVED, by the write-ahead log
  (2) ACROSS YOUR PROCESS     NOT SOLVABLE: made HARMLESS with an
      BOUNDARY                idempotency key
  (3) ACROSS AN               NOT EVEN ANSWERABLE: needs intent,
      ORGANISATIONAL          idempotency AND reconciliation
      BOUNDARY

  the further the boundary, the weaker the guarantee available and
  the more work falls to you.
```

```text
FAILURE 1: THE DATABASE LOSES POWER MID-TRANSACTION

  THE MECHANISM: the WRITE-AHEAD LOG, with two rules that must BOTH
  hold:

     THE WRITE-AHEAD RULE (atomicity)
        a log record describing a change must reach DURABLE STORAGE
        BEFORE THE MODIFIED DATA PAGE DOES.
        otherwise a crash leaves a dirty, uncommitted page on disk
        with NO RECORD OF ITS PREVIOUS VALUE, so it can never be
        undone.

     THE COMMIT RULE (durability)
        ALL of a transaction's log records must be durable BEFORE
        THE COMMIT IS ACKNOWLEDGED.
        otherwise the client is told the data is safe when it is not.

  together: LOG FIRST, DATA LATER, AND NEVER ACKNOWLEDGE A COMMIT
            BEFORE ITS LOG IS FLUSHED.

  RECOVERY follows ARIES, in three passes:

     ANALYSIS  scan forward from the last checkpoint: which
               transactions were IN FLIGHT, which pages DIRTY
     REDO      reapply EVERY logged change since the checkpoint,
               COMMITTED OR NOT, reconstructing the exact state at
               the moment of the crash
     UNDO      roll back every transaction that had NOT COMMITTED,
               using the old values in the log

  THE RESULT, which is exactly what the question asks for:
     a COMMITTED transfer is durable
     an UNCOMMITTED one is AS IF IT NEVER HAPPENED
     THERE IS NO PARTIAL STATE.
     a transfer that debited one account without crediting the
     other CANNOT SURVIVE A CRASH.
```

```text
AND THE CAVEATS, which is where the guarantee actually fails:

  fsync MUST REACH THE PHYSICAL MEDIUM
     a drive with a volatile write cache that reports success
     before the data is durable BREAKS THE ENTIRE CHAIN.
     hence battery- or capacitor-backed caches, and why fsync
     behaviour is worth verifying rather than assuming.

  DURABILITY CAN BE TRADED AWAY BY CONFIGURATION
     synchronous_commit = off           (PostgreSQL)
     innodb_flush_log_at_trx_commit = 0 or 2
     both acknowledge commits BEFORE the log is durable.
     a legitimate choice for some workloads, and NOT FOR MONEY.

  REPLICATION IS NOT DURABILITY
     unless the replica has also FLUSHED. Acknowledging when a
     replica holds it in MEMORY survives one machine failing and
     NOT a correlated power loss.
```

```text
FAILURE 2: THE APPLICATION SERVER DIES BEFORE RESPONDING

  the DATABASE IS CORRECT and the CLIENT DOES NOT KNOW IT.

     client --- request ---------> server
                                   commits the transaction
                X--- response ---- server DIES
             (timeout)

  from the client, these are INDISTINGUISHABLE:
     (a) the request never arrived
     (b) it was processed and the reply was lost

  there is NO OBSERVATION the client can make to tell them apart,
  so this is not a bug to fix but an AMBIGUITY TO DESIGN AROUND.
```

```sql
-- THE MECHANISM: an idempotency key, with the CRITICAL detail

CREATE TABLE idempotency_keys (
    key         TEXT NOT NULL,
    account_id  BIGINT NOT NULL,
    fingerprint TEXT NOT NULL,       -- a hash of the request
    status      TEXT NOT NULL,       -- 'in_progress' | 'completed'
    status_code INT,
    response    JSONB,
    leased_until TIMESTAMPTZ,        -- so a crashed original can be
    PRIMARY KEY (account_id, key)    -- reclaimed
);

BEGIN;
  -- 1. CLAIM THE KEY ATOMICALLY, BEFORE ANY WORK.
  --    the UNIQUE CONSTRAINT IS the concurrency control: checking
  --    then inserting is a RACE, whereas a unique index makes the
  --    check and the claim ONE ATOMIC OPERATION.
  INSERT INTO idempotency_keys (account_id, key, fingerprint, status)
  VALUES (:acct, :key, :fp, 'in_progress');

  -- 2. do the work
  UPDATE accounts SET balance = balance - 100 WHERE id = :acct;

  -- 3. record the outcome IN THE SAME TRANSACTION
  UPDATE idempotency_keys SET status = 'completed',
         status_code = 200, response = :body
  WHERE  account_id = :acct AND key = :key;
COMMIT;

-- THE CRITICAL DETAIL, to say without being asked:
--   THE IDEMPOTENCY RECORD AND THE SIDE EFFECT MUST COMMIT IN THE
--   SAME TRANSACTION.
--   charge the card and THEN record the key, and a crash between
--   them leaves no record, so THE RETRY CHARGES AGAIN.
--   the guarantee comes entirely from their atomicity.
```

```text
THE AWKWARD CASES, which is where real systems fail:

  A CONCURRENT RETRY WHILE THE ORIGINAL IS STILL RUNNING
     the key exists, status in_progress, NO RESULT YET.
     executing again DOUBLE-CHARGES.
     returning a fabricated success is A LIE.
     -> 409 Conflict, telling the client to retry shortly

  A REUSED KEY WITH A DIFFERENT PAYLOAD
     not a retry, since a retry is BY DEFINITION the same request.
     returning the stored response would tell the client its NEW
     request succeeded when it NEVER RAN.
     -> 422, found by comparing a stored FINGERPRINT of the request

  A CRASHED ORIGINAL
     leaves a row stranded in_progress FOREVER, so every retry gets
     409 permanently.
     -> the row needs a LEASE OR TIMESTAMP so a sufficiently stale
        record can be RECLAIMED

  AND THE CLIENT'S OWN BUG:
     the key must be generated ONCE PER LOGICAL OPERATION, not per
     HTTP attempt. Regenerating it on retry is the most common
     implementation bug and DEFEATS THE WHOLE MECHANISM.
```

```text
FAILURE 3: A THIRD-PARTY PAYMENT API TIMES OUT

  WHY THIS ONE IS DIFFERENT: the state lives in SOMEONE ELSE'S
  SYSTEM. You cannot inspect it, you cannot roll it back, and you
  CANNOT MAKE THEIR ACTION ATOMIC WITH YOURS, because they will not
  participate in your transaction.
  TWO-PHASE COMMIT IS NOT AVAILABLE: no provider will join your
  coordinator.

  so the guarantee changes shape:
     you cannot achieve ATOMICITY
     so you achieve IDEMPOTENCY + RECONCILIATION
```

```text
THE PATTERN, in order:

  1. RECORD INTENT DURABLY BEFORE CALLING OUT
        INSERT a payments row: status 'pending', your idempotency
        key. COMMIT IT.
        now, whatever happens next, YOU KNOW AFTERWARDS THAT YOU
        ATTEMPTED THIS.
        without this step, a crash during the call leaves NO TRACE
        AT ALL.

  2. CALL THE PROVIDER, PASSING YOUR IDEMPOTENCY KEY
        Stripe, Adyen and every serious provider support this,
        precisely because the problem is universal.
        it means a retry at THEIR end is safe.

  3. ON A DEFINITE ANSWER (success or failure)
        record the outcome and finish.

  4. ON A TIMEOUT OR UNKNOWN
        BOTH obvious reactions are WRONG:
           DO NOT retry blindly WITHOUT the key  -> double charge
           DO NOT assume failure                 -> a lost payment
                                                    the customer WAS
                                                    charged for
        correct options:
           RETRY WITH THE SAME IDEMPOTENCY KEY, safe because the
              provider deduplicates
           QUERY THE PROVIDER for that key's status

  5. RECONCILE IN THE BACKGROUND
        a job sweeps 'pending' rows older than a threshold and
        resolves each against the provider's API.
        NOT OPTIONAL: some fraction of calls will ALWAYS end
        unknown, and without a reconciler those payments stay
        unresolved FOREVER.
```

```text
Two further rules that belong in the answer:

  NEVER HOLD A DATABASE TRANSACTION OPEN ACROSS AN EXTERNAL CALL
     it holds locks for the duration of SOMEONE ELSE'S LATENCY,
     which turns their slow day into your outage.

     WRONG                          RIGHT
     BEGIN                          BEGIN; record intent; COMMIT
       UPDATE ...                   call the provider (no txn open)
       call_provider()  <-- 30s     BEGIN; record outcome; COMMIT
       UPDATE ...
     COMMIT

  WEBHOOKS MUST BE IDEMPOTENT AND VERIFIED
     providers RETRY them, so the same event WILL arrive more than
     once and the handler must deduplicate on the event id.
     and the endpoint is PUBLIC, so the signature must be VERIFIED.

  this shape has names:
     TRANSACTIONAL OUTBOX  intent written in the same transaction as
                           the business change, with a separate
                           process performing the external call
     SAGA                  a long-running operation as a SEQUENCE OF
                           LOCAL TRANSACTIONS with compensating
                           actions, rather than one distributed
                           transaction
```

```text
THE UNIFYING PRINCIPLE, which ties the three together:

  INSIDE ONE DATABASE
     you GET atomicity, and the write-ahead log provides it

  ACROSS A PROCESS BOUNDARY
     you CANNOT get atomicity, so you make operations IDEMPOTENT
     and RETRYABLE

  ACROSS AN ORGANISATIONAL BOUNDARY
     you cannot even get a reliable ANSWER, so you add
     RECONCILIATION

  in one sentence:
     YOU CANNOT MAKE DISTRIBUTED OPERATIONS ATOMIC, SO YOU MAKE
     THEM IDEMPOTENT, YOU RECORD INTENT BEFORE ACTING, AND YOU
     RECONCILE WHAT REMAINS UNKNOWN.
```

---

### What they ask next

**"What guarantees the database case?"**
The write-ahead log, through two rules: a change's log record must be durable before the data page, so an uncommitted change on disk can always be undone, and all of a transaction's log must be durable before the commit is acknowledged. Recovery then runs ARIES: analysis, redo, undo.

**"Why redo uncommitted transactions during recovery?"**
Because redo's job is to reconstruct the exact state at the moment of the crash, including changes that were logged but not yet written to the data pages. Only then can undo correctly reverse the transactions that had not committed, using the old values from the log.

**"Where does the database guarantee actually break?"**
At `fsync`. A drive whose volatile write cache reports success before the data is durable breaks the whole chain, and configuration such as `synchronous_commit = off` deliberately trades durability for speed. Replication is also not durability unless the replica has flushed.

**"Why can the application-server case not be solved the same way?"**
Because the ambiguity is on the **client's** side. The database knows whether the transaction committed; the client sees only a timeout, which is indistinguishable from the request never arriving. No amount of care removes that, so you make retrying harmless instead.

**"What is the one detail people get wrong with idempotency keys?"**
Recording the key outside the transaction that performs the side effect. If you charge and then record, a crash in between leaves no record and the retry charges again. The guarantee comes entirely from committing both together.

**"What do you return for a concurrent retry?"**
`409 Conflict`. The key exists as `in_progress` with no result yet, so executing again would double-charge and returning a fabricated success would be a lie. The client retries shortly and eventually sees the completed record.

**"Why can you not make the third-party call atomic with your database write?"**
Because the provider will not join your transaction; two-phase commit requires all participants to implement it and payment providers do not. So the guarantee becomes idempotency plus reconciliation rather than atomicity.

**"What happens if you skip the 'record intent first' step?"**
A crash during the external call leaves no trace that you ever attempted the payment, so reconciliation has nothing to look for and a customer may have been charged with no record on your side. Recording intent is what makes the unknown case recoverable.

**"Why is a reconciler not optional?"**
Because some fraction of calls will always end in an unknown state, through timeouts, network failures and provider incidents. Without a background job sweeping stale `pending` rows and resolving them against the provider, those payments stay unresolved indefinitely.

**The common wrong answer** is "use transactions, they are ACID". That answers the **first** failure only. The second is an ambiguity on the client's side that transactions cannot touch and **idempotency keys** make harmless, with the key recorded **in the same transaction** as the side effect; and the third crosses an organisational boundary where atomicity is **unavailable**, so the answer is **record intent, pass your key, and reconcile**.

---

### Say this in the interview

*"There are three handovers and a crash at each is a different problem with a different owner. Inside the database, across my own process boundary, and across an organisational boundary to the provider. The further out, the weaker the guarantee available.*

*The database case is solved, by the write-ahead log, through two rules. The write-ahead rule, for atomicity: a log record describing a change must reach durable storage before the modified data page does, because otherwise a crash could leave a dirty uncommitted page on disk with no record of its previous value, which could never be undone. And the commit rule, for durability: all of a transaction's log records must be durable before the commit is acknowledged, because otherwise the client is told the data is safe when it is not. Together: log first, data later, never acknowledge a commit before its log is flushed. Recovery then runs ARIES in three passes: analysis, scanning forward from the last checkpoint to find which transactions were in flight and which pages dirty; redo, reapplying every logged change since the checkpoint whether committed or not, which reconstructs the exact state at the crash; and undo, rolling back everything uncommitted using the old values in the log. The result is exactly what was asked: a committed transfer is durable, an uncommitted one is as if it never happened, and there is no partial state, so a transfer that debited one account without crediting the other cannot survive a crash. The caveats are that fsync must actually reach the medium, so a drive with a lying volatile cache breaks the whole chain; that durability can be configured away with synchronous_commit off or innodb_flush_log_at_trx_commit set to zero or two, which is legitimate for some workloads and not for money; and that replication is not durability unless the replica has flushed.*

*The application-server case is different, because the database is correct and the client does not know it. The transaction either committed or not and the database knows, but the client sees only a timeout, which is indistinguishable from the request never arriving, and there is no observation that separates them. So it is not a bug to fix but an ambiguity to design around, and the mechanism is an idempotency key: the client generates a unique key per logical operation, not per HTTP attempt, and the server records it with the outcome so a repeat returns the recorded result. The critical detail, which I would say without being asked, is that the idempotency record and the side effect must commit in the same transaction, because if you charge the card and then record the key, a crash in between leaves no record and the retry charges again. The guarantee comes entirely from their atomicity.*

*The implementation claims the key atomically before any work by inserting an in-progress row and relying on a unique constraint, which is the concurrency control, since checking then inserting is a race while a unique index makes the check and the claim one operation. And the awkward cases are where real systems fail: a concurrent retry while the original is still running finds the key in progress with no result, where executing again double-charges and a fabricated success is a lie, so the right answer is 409 Conflict; a reused key with a different payload is not a retry, since a retry is by definition the same request, so returning the stored response would tell the client its new request succeeded when it never ran, and the right answer is 422 after comparing a stored fingerprint; and a crashed original leaves a row stranded in progress forever, so the row needs a lease so stale records can be reclaimed.*

*The third-party case is the hard one, and the reason is that the state lives in someone else's system: I cannot inspect it, cannot roll it back, and cannot make their action atomic with mine, because they will not participate in my transaction and no provider will join a two-phase commit. So the guarantee changes shape from atomicity to idempotency plus reconciliation. The pattern is: record intent durably before calling out, inserting a pending payment row with my idempotency key and committing it, so whatever happens I know afterwards that I attempted it, where without that step a crash during the call leaves no trace at all. Then call the provider passing my idempotency key, which Stripe, Adyen and every serious provider support precisely because the problem is universal, so a retry at their end is safe. On a definite answer, record the outcome. On a timeout or unknown, both obvious reactions are wrong: do not retry blindly without the key, which risks a double charge, and do not assume failure, which risks losing a payment the customer was charged for; instead retry with the same key, which is safe because the provider deduplicates, or query the provider for that key's status. And reconcile in the background, with a job sweeping pending rows older than a threshold, which is not optional, because some fraction of calls will always end unknown and without it those payments stay unresolved forever.*

*Two more rules belong in that answer: never hold a database transaction open across an external call, because it holds locks for the duration of someone else's latency and turns their slow day into your outage; and webhooks must be idempotent and signature-verified, because providers retry them so the same event will arrive more than once, and the endpoint is public. That overall shape is the transactional outbox, and more generally a saga, where a long-running operation is a sequence of local transactions with compensating actions rather than one distributed transaction.*

*The unifying principle is that inside one database you get atomicity and the write-ahead log provides it; across a process boundary you cannot get atomicity, so you make operations idempotent and retryable; and across an organisational boundary you cannot even get a reliable answer, so you add reconciliation. In one sentence: you cannot make distributed operations atomic, so you make them idempotent, you record intent before acting, and you reconcile what remains unknown."*
