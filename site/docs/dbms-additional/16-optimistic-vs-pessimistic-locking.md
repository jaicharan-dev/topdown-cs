---
id: 16-optimistic-vs-pessimistic-locking
title: "Optimistic vs Pessimistic Locking"
description: "Taking the lock before you need it or betting that nobody else will, decided by contention rather than taste"

sidebar_position: 16
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between optimistic and pessimistic locking? When should you choose each in production systems, what are the roles of `SELECT FOR UPDATE`, `NOWAIT`, and `SKIP LOCKED`, and how do you handle optimistic retry storms?"

---

### Picture it

A shared document that several people need to edit.

**One approach is to take the key.** Before you start reading, you lock the door. Nobody else can get in, so when you finish your edit it is guaranteed to apply cleanly. Others queue outside. It is simple, it always works, and **everyone else is doing nothing while you think**.

**The other approach is to take a photograph.** You photograph the page, go away, make your changes, and when you come back you **check the page still matches your photograph**. If it does, you write. If it does not, somebody edited it while you were gone, so **you throw away your work and start again**.

Neither is better in the abstract. The question is **how often two people want the same page at once**.

**If it is rare**, the photograph wins easily. Nobody waits for anybody, and the occasional wasted effort costs less than the queueing would have.

**If it is constant**, the photograph is a disaster. Everyone photographs, everyone works, everyone comes back to find the page changed, everyone discards their work and tries again, **and collides again**. The room is full of people working flat out and **nothing is being written at all**. Taking the key, with its honest queue, is far better: boring, and work actually completes.

**And one case settles itself.** If the edit involves going away for twenty minutes to think, **you cannot hold the key**, because the whole building stops. Long pauses force the photograph, whatever the contention.

**Finally, a trick worth knowing.** A room full of identical tasks, each needing someone to pick one up, does not need a coordinator at all. Each worker asks for **the first task nobody has locked**, **skipping the locked ones** rather than waiting behind them. Ten workers get ten different tasks, with no queue and nothing to arrange.

---

### The proper terms

#### The two strategies

**Pessimistic locking** assumes conflict is **likely**. You acquire a lock **before** reading or modifying, and hold it **until commit**. Anyone else wanting the same row **blocks**.

**Conflicts are prevented**, never detected.

**No work is ever wasted**, because you never compute on data that turns out to be stale.

**The cost is blocking**: contention becomes a queue, throughput is bounded by the critical section's length, and deadlock becomes possible.

**Optimistic locking** assumes conflict is **rare**. You take no lock. You read, do the work, and at **write time** verify that nothing changed, normally by checking a **version column** or a timestamp. If it did change, the update affects **zero rows**, so you **abort and retry**.

**Conflicts are detected**, never prevented.

**No blocking at all**, so readers and writers never wait for each other.

**The cost is wasted work**: on conflict, everything computed since the read is discarded.

Note the shape of the trade: **pessimistic pays in waiting, optimistic pays in redoing.** Which is cheaper is entirely a question of how often conflicts actually occur.

#### Choosing between them

**Choose pessimistic when:**

**Contention is high.** With many writers on the same rows, optimistic retries collide repeatedly and useful throughput collapses, while blocking at least makes progress one at a time.

**The transaction is short.** The lock is held briefly, so the queue stays small.

**The operation must not fail.** Some workflows cannot reasonably be retried, for example when they have already had an external side effect.

**The work before the write is expensive.** Discarding a long computation on conflict is worse than waiting for the lock.

**Choose optimistic when:**

**Contention is low**, which is the usual case for most rows in most systems.

**There is human think time.** A user editing a form for minutes **must** be optimistic, because holding a database lock across a human's thinking blocks everyone else and risks holding it indefinitely if they wander off. This case is not a preference, it is a requirement.

**The workload is read-heavy.**

**You are working across a stateless boundary**, such as an HTTP request that reads in one call and writes in another, where there is no transaction to hold a lock in.

The honest summary: **the choice is determined by contention and by how long you hold the data, not by taste.**

#### SELECT FOR UPDATE and its modifiers

**`SELECT ... FOR UPDATE`** is how you take a pessimistic lock in SQL. It acquires an **exclusive row lock** on every row it returns, held **until the transaction ends**. Another transaction's `FOR UPDATE` on the same rows **blocks**.

Under MVCC in PostgreSQL and InnoDB, **plain readers are unaffected**: they continue to read the previous version without waiting, so only other writers and lock-takers queue.

**`FOR SHARE`**, or `FOR UPDATE` in share mode, takes a **shared** lock instead: several readers may hold it concurrently, and writers block. Useful when you must ensure a row does not change while you read it but do not intend to modify it yourself.

Two modifiers change the behaviour on contention, and they are the interesting part.

**`NOWAIT`.** Instead of blocking, fail immediately if any row is locked, raising an error. This is for paths where **waiting is worse than failing**: an interactive request that must not hang, where returning "try again" in 5 milliseconds beats a request that sits for 30 seconds and then times out anyway.

**`SKIP LOCKED`.** Instead of blocking, silently omit the locked rows and return the rest.

This is the idiom for a work queue, and it deserves emphasis because it is widely under-used. Several workers each run `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`, and each receives a **different** row, with **no blocking, no coordination and no external message broker**. The database's own row locks do the dispatching. It is the simplest correct job queue available, and for moderate volumes it removes an entire piece of infrastructure.

#### Retry storms, and handling them

The failure mode of optimistic locking under load is a **retry storm**, which is a genuine livelock rather than merely slowness.

Every transaction reads, computes, fails the version check, retries, and collides with the other retries. CPU is saturated, the database is busy, and **useful throughput falls towards zero**. Worse, it is self-reinforcing: retries add load, which lengthens transactions, which widens the conflict window, which causes more conflicts.

The mitigations, in the order to reach for them:

**Exponential backoff with jitter.** This is the essential one. Without **jitter**, every failed transaction retries after the same delay and **collides again in lockstep**, which is exactly the symmetry that sustains a livelock. Randomising the delay breaks it.

**Cap the retries.** Give up after a small number and return a clear error. Retrying forever converts a transient conflict into an outage.

**Shrink the conflict window.** Read as late as possible, keep the transaction short, and never hold a read across a network call or user think time. The window is the interval during which someone else can invalidate you.

**Narrow the conflict scope.** Version at a finer grain where the domain allows, or split a hot row. A single counter row updated by everyone is the classic hotspot, and **sharded counters**, where each writer updates one of N rows and reads sum them, remove the contention entirely.

**Make the update atomic.** `UPDATE accounts SET balance = balance + 100 WHERE id = ?` has **no read-modify-write window at all**, so there is nothing to conflict. Where the new value is a function of the old one, this beats both strategies.

**Fall back to pessimistic for known-hot rows.** A hybrid is entirely legitimate: optimistic by default, and `FOR UPDATE` for the small set of entities you have measured as contended. Blocking is the right answer where conflicts are the norm.

**Serialise through a queue.** Partition the work by key so that one worker owns each hot entity, turning contention into ordering. This is what `SKIP LOCKED` or a partitioned log gives you.

#### Where you meet them in practice

**JPA and Hibernate**: `@Version` gives optimistic locking with the version check generated for you, raising `OptimisticLockException`; `LockModeType.PESSIMISTIC_WRITE` issues `SELECT FOR UPDATE`.

**HTTP**: `ETag` with `If-Match` is optimistic locking over a stateless protocol, returning `412 Precondition Failed` on conflict. It is the same mechanism, because a stateless boundary leaves no other option.

**PostgreSQL serializable**: SSI is essentially **optimistic serializability**. It does not block; it tracks dependencies and **aborts** a transaction whose outcome could not have occurred serially, which is why `SERIALIZABLE` there requires a retry loop.

---

### In code

```sql
-- PESSIMISTIC: take the lock first, hold it until commit
BEGIN;
  SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;
  --                                         ^ EXCLUSIVE row lock,
  --                                           held until COMMIT.
  --   another transaction's FOR UPDATE on this row BLOCKS here.
  --   under MVCC, PLAIN READERS ARE UNAFFECTED: they read the
  --   previous version without waiting.
  UPDATE accounts SET balance = balance - 100 WHERE id = 42;
COMMIT;

-- conflicts are PREVENTED, never detected
-- NO WORK IS EVER WASTED
-- the cost is BLOCKING: contention becomes a queue, throughput is
-- bounded by the critical section, and deadlock becomes possible
```

```sql
-- OPTIMISTIC: no lock; verify at WRITE time
SELECT balance, version FROM accounts WHERE id = 42;
--     balance = 500, version = 11

-- ... application computes, possibly across a network boundary ...

UPDATE accounts
SET    balance = 400, version = version + 1
WHERE  id = 42 AND version = 11;          -- THE CHECK
-- 1 row affected -> success
-- 0 rows affected -> somebody else committed first -> RETRY

-- conflicts are DETECTED, never prevented
-- NO BLOCKING AT ALL
-- the cost is WASTED WORK: everything computed since the read is
-- discarded
```

```text
The trade, and what decides it:

  PESSIMISTIC pays in WAITING.
  OPTIMISTIC  pays in REDOING.

  which is cheaper depends ENTIRELY on how often conflicts occur.

  CHOOSE PESSIMISTIC WHEN
     contention is HIGH          optimistic retries collide
                                 repeatedly and throughput collapses
     the transaction is SHORT    the lock is held briefly
     the operation MUST NOT FAIL some workflows cannot be retried,
                                 e.g. after an external side effect
     the work is EXPENSIVE       discarding a long computation is
                                 worse than waiting

  CHOOSE OPTIMISTIC WHEN
     contention is LOW           the usual case for most rows
     there is HUMAN THINK TIME   a user editing a form for minutes
                                 MUST be optimistic. Holding a lock
                                 across a human's thinking blocks
                                 everyone and may never be released.
                                 NOT A PREFERENCE, A REQUIREMENT.
     the workload is READ-HEAVY
     you cross a STATELESS       an HTTP request that reads in one
     BOUNDARY                    call and writes in another: there
                                 is no transaction to hold a lock in
```

```sql
-- NOWAIT: fail immediately rather than queue
BEGIN;
  SELECT * FROM accounts WHERE id = 42 FOR UPDATE NOWAIT;
  -- ERROR: could not obtain lock on row in relation "accounts"
COMMIT;
-- for paths where WAITING IS WORSE THAN FAILING: an interactive
-- request that must not hang. Returning "try again" in 5 ms beats a
-- request that sits for 30 seconds and then times out anyway.

-- FOR SHARE: several readers may hold it; writers block.
-- use when a row MUST NOT CHANGE while you read it, but you do not
-- intend to modify it yourself
SELECT * FROM rates WHERE id = 7 FOR SHARE;
```

```sql
-- SKIP LOCKED: THE work-queue idiom, and widely under-used
BEGIN;
  SELECT id, payload
  FROM   jobs
  WHERE  status = 'pending'
  ORDER  BY created_at
  FOR UPDATE SKIP LOCKED                 -- skip what others hold
  LIMIT 1;

  UPDATE jobs SET status = 'running' WHERE id = :id;
COMMIT;

-- ten workers run this concurrently and each gets a DIFFERENT row.
--   NO BLOCKING
--   NO COORDINATION
--   NO EXTERNAL MESSAGE BROKER
-- the database's own row locks do the dispatching.
--
-- it is the simplest correct job queue available, and for moderate
-- volumes it removes an entire piece of infrastructure.
--
-- without SKIP LOCKED, all ten workers queue behind the SAME row
-- and you have built a single-threaded queue by accident.
```

```text
RETRY STORMS: the failure mode of optimistic locking under load,
and a genuine LIVELOCK rather than mere slowness

  every transaction reads, computes, fails the version check,
  retries, AND COLLIDES WITH THE OTHER RETRIES

     txn A: read v11 ... compute ... update WHERE version=11 -> 0 rows
     txn B: read v11 ... compute ... update WHERE version=11 -> 0 rows
     txn C: read v11 ... compute ... update WHERE version=11 -> 0 rows
     ... all three retry AT THE SAME MOMENT ...
     ... and collide again ...

  CPU saturated, database busy, USEFUL THROUGHPUT FALLS TOWARDS ZERO.
  and it is SELF-REINFORCING: retries add load, which lengthens
  transactions, which WIDENS THE CONFLICT WINDOW, which causes more
  conflicts.
```

```text
Handling it, in the order to reach for them:

  1. EXPONENTIAL BACKOFF WITH JITTER        <- the essential one
        without JITTER every failed transaction retries after the
        SAME delay and collides again IN LOCKSTEP, which is exactly
        the symmetry that sustains a livelock.
        sleep(base * 2^attempt + random(0, base))

  2. CAP THE RETRIES
        give up after a small number with a clear error. Retrying
        forever turns a transient conflict into an outage.

  3. SHRINK THE CONFLICT WINDOW
        read as LATE as possible, keep the transaction short, never
        hold a read across a network call or user think time.
        the window is the interval in which someone can invalidate you.

  4. NARROW THE CONFLICT SCOPE
        version at a finer grain, or SPLIT A HOT ROW.
        a single counter updated by everyone is the classic hotspot;
        SHARDED COUNTERS (each writer updates one of N rows, reads
        sum them) remove the contention entirely.

  5. MAKE THE UPDATE ATOMIC
        UPDATE accounts SET balance = balance + 100 WHERE id = ?
        NO read-modify-write window AT ALL, so nothing can conflict.
        where the new value is a function of the old, this beats
        BOTH strategies.

  6. FALL BACK TO PESSIMISTIC FOR KNOWN-HOT ROWS
        a hybrid is entirely legitimate: optimistic by default, and
        FOR UPDATE for the small measured set of contended entities.
        blocking is the right answer where conflicts are the NORM.

  7. SERIALISE THROUGH A QUEUE
        partition by key so one worker owns each hot entity, turning
        contention into ORDERING. SKIP LOCKED or a partitioned log
        gives you this.
```

```java
// Where you meet them in practice

// JPA: optimistic, with the version check generated for you
@Entity
class Account {
    @Id Long id;
    @Version Integer version;        // -> OptimisticLockException
    BigDecimal balance;
}

// JPA: pessimistic
em.find(Account.class, 42, LockModeType.PESSIMISTIC_WRITE);
// issues SELECT ... FOR UPDATE

// HTTP: optimistic locking over a STATELESS protocol.
// the same mechanism, because a stateless boundary leaves no
// other option.
//   GET  /accounts/42   ->  ETag: "v11"
//   PUT  /accounts/42       If-Match: "v11"
//                       ->  412 Precondition Failed on conflict

// PostgreSQL SERIALIZABLE is essentially OPTIMISTIC SERIALIZABILITY:
// it does not block, it tracks dependencies and ABORTS a transaction
// whose outcome could not have occurred serially, which is why it
// requires a retry loop.
```

---

### What they ask next

**"Which is faster?"**
Neither, inherently. Under low contention optimistic wins, because nothing blocks and conflicts are rare. Under high contention pessimistic wins, because blocking makes steady progress while optimistic retries collide and waste the work repeatedly.

**"Why must a user-facing edit be optimistic?"**
Because the transaction would have to span human think time. Holding a database lock while someone considers a form blocks every other writer and may never be released if they close the tab. A version check costs nothing while they think.

**"What does `SELECT FOR UPDATE` actually lock?"**
The rows it returns, with an exclusive row lock held until the transaction ends. Other transactions taking the same lock block, while under MVCC plain readers continue unaffected, reading the previous version.

**"When would you use `NOWAIT`?"**
Where waiting is worse than failing: an interactive path that must not hang. Failing in milliseconds with "try again" is a far better user experience than a request that blocks for thirty seconds and then times out.

**"What makes `SKIP LOCKED` special?"**
It turns row locks into a dispatcher. Several workers each claim a different unlocked row with no blocking, no coordination and no external broker, which makes the database itself a correct job queue. Without it, every worker queues behind the same row.

**"What is a retry storm?"**
A livelock under optimistic locking: everyone reads, computes, fails the version check and retries in step, colliding again, so CPU is saturated and useful throughput approaches zero. It is self-reinforcing, because retries lengthen transactions and widen the conflict window.

**"What is the single most important mitigation?"**
Jitter in the backoff. Without it, every failed transaction retries after the same delay and collides in lockstep, which is precisely the symmetry that keeps the livelock alive. Randomising the delay breaks it.

**"Can you use both?"**
Yes, and it is often right. Optimistic by default, with `FOR UPDATE` for the measured set of hot rows, and an atomic single-statement update wherever the new value is a function of the old one, which avoids the question entirely.

**The common wrong answer** is "optimistic is better because it does not block". That is true only at **low contention**; at high contention it degenerates into a livelock where everyone works and nobody commits. The answer wanted is that **contention and holding time decide**, that **`SKIP LOCKED` turns the database into a work queue**, and that **backoff with jitter** is the mitigation that actually breaks a retry storm.

---

### Say this in the interview

*"Pessimistic locking assumes conflict is likely: you acquire a lock before reading or modifying and hold it until commit, so anyone wanting the same row blocks. Conflicts are prevented rather than detected, no work is ever wasted, and the cost is blocking, so contention becomes a queue, throughput is bounded by the critical section and deadlock becomes possible. Optimistic locking assumes conflict is rare: you take no lock, you read and do the work, and at write time you verify nothing changed, normally with a version column, so if it did the update affects zero rows and you abort and retry. Conflicts are detected rather than prevented, nothing blocks, and the cost is wasted work. So pessimistic pays in waiting and optimistic pays in redoing, and which is cheaper depends entirely on how often conflicts occur.*

*I would choose pessimistic when contention is high, since optimistic retries then collide repeatedly and throughput collapses while blocking at least makes progress one at a time; when the transaction is short, so the queue stays small; when the operation cannot reasonably be retried, for instance after an external side effect; and when the work before the write is expensive, so discarding it is worse than waiting. I would choose optimistic when contention is low, which is the usual case; when the workload is read-heavy; when I am crossing a stateless boundary such as HTTP, where there is no transaction to hold a lock in; and above all when there is human think time, because holding a database lock while a user edits a form for minutes blocks everyone else and may never be released. That last case is a requirement rather than a preference.*

*SELECT FOR UPDATE is how you take a pessimistic lock: it acquires an exclusive row lock on every row returned, held until the transaction ends, so another transaction's FOR UPDATE blocks, while under MVCC plain readers are unaffected and read the previous version. FOR SHARE takes a shared lock instead, so several readers can hold it and writers block, which is right when a row must not change while you read it but you do not intend to modify it.*

*Two modifiers change the behaviour on contention. NOWAIT fails immediately rather than blocking, which is for paths where waiting is worse than failing, like an interactive request that must not hang: returning try-again in five milliseconds beats blocking for thirty seconds and timing out anyway. SKIP LOCKED silently omits locked rows and returns the rest, and it is the work-queue idiom. Several workers each run SELECT FOR UPDATE SKIP LOCKED LIMIT 1 and each gets a different row, with no blocking, no coordination and no external message broker, because the database's own row locks do the dispatching. It is the simplest correct job queue available and for moderate volumes it removes an entire piece of infrastructure, whereas without it all the workers queue behind the same row and you have built a single-threaded queue by accident.*

*The failure mode of optimistic locking under load is a retry storm, which is a genuine livelock. Everyone reads, computes, fails the version check and retries, colliding with the other retries, so CPU is saturated and useful throughput falls towards zero, and it is self-reinforcing because retries add load, which lengthens transactions and widens the conflict window.*

*To handle it: exponential backoff with jitter first, which is the essential one, because without jitter every failed transaction retries after the same delay and collides again in lockstep, which is exactly the symmetry sustaining the livelock. Cap the retries and fail with a clear error rather than retrying forever. Shrink the conflict window by reading as late as possible, keeping transactions short and never holding a read across a network call or think time. Narrow the conflict scope by versioning at a finer grain or splitting a hot row, since a single counter updated by everyone is the classic hotspot and sharded counters remove it. Make the update atomic where the new value is a function of the old, because SET balance = balance + 100 has no read-modify-write window at all and beats both strategies. Fall back to pessimistic for the measured set of hot rows, which is a perfectly legitimate hybrid. And serialise through a queue, partitioning by key so one worker owns each hot entity, turning contention into ordering.*

*In practice you meet these as JPA's @Version for optimistic and PESSIMISTIC_WRITE for FOR UPDATE, as ETag with If-Match over HTTP returning 412 on conflict, which is optimistic locking over a stateless protocol, and as PostgreSQL's serializable isolation, which is essentially optimistic serializability: it does not block, it tracks dependencies and aborts transactions whose outcome could not have occurred serially, which is why it needs a retry loop."*
