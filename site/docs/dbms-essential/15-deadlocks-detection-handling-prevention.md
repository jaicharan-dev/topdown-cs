---
id: 15-deadlocks-detection-handling-prevention
title: "Database Deadlocks: Detection, Prevention & Handling"
description: "A cycle of waiting, the graph that finds it, and the one application rule that prevents most of them"

sidebar_position: 15
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a database deadlock? How do single-node and distributed engines detect or prevent them, how does victim selection work, and how do you design application code to prevent them?"

---

### Picture it

Two people in a narrow kitchen. One is holding the knife and wants the chopping board. The other is holding the chopping board and wants the knife. Neither will put down what they have until they have both. They will stand there until someone intervenes.

The thing to notice is that **neither of them did anything wrong**. Each took one tool and then asked for another, which is entirely reasonable. The deadlock is not in either person's behaviour; it is in the **combination**, and specifically in the fact that they picked the tools up in **opposite orders**.

Which is also the fix, and it is almost embarrassingly simple. **Agree that everybody always takes the knife before the board.** Now the second person cannot be holding the board while wanting the knife, because they could not have got the board without the knife first. The cycle becomes impossible, not unlikely.

**Finding one** is a matter of drawing arrows. Draw an arrow from each person to the person they are waiting for. If you can follow the arrows and arrive back where you started, that is a deadlock, and nothing will change until somebody is removed.

**Removing somebody** means choosing a victim, and the sensible choice is **whoever has done the least work**, because their work is the cheapest to throw away. The one who has been chopping for ten minutes should keep going.

And in a kitchen spread across several buildings, drawing the arrows is hopeless: by the time you have collected everybody's answers, the situation has changed and your drawing may show a cycle that no longer exists. So you stop trying to detect and instead impose a rule using **seniority**: when two people want the same tool, the more senior one wins and the junior one gives up and starts again. Seniority is a total order, and a cycle cannot form in a total order.

---

### The proper terms

#### What a deadlock is

A **deadlock** is a state in which two or more transactions are each waiting for a lock held by another, so none can proceed. It requires the same four **Coffman conditions** as any deadlock: mutual exclusion, hold and wait, no preemption and **circular wait**.

The condition that matters for databases is **circular wait**, because it is the one that application code controls and the one every practical prevention technique attacks.

An important framing to lead with: in a transactional database, deadlocks are **expected and normal**, not a bug to be eliminated. Any system with row locks and concurrent transactions will produce some, so the engine's job is to detect and break them quickly, and the application's job is to **retry**. A system that cannot survive a deadlock is incorrectly written.

#### Detection on a single node

Both main engines use the **wait-for graph**, where each node is a transaction and an edge from A to B means A is waiting for a lock held by B. A **cycle** in that graph is a deadlock.

The engines differ in **when they look**, which is a nice detail to know.

**MySQL InnoDB detects eagerly.** It maintains the wait-for graph and checks for a cycle on **every lock wait**, so a deadlock is caught almost immediately. Under extreme concurrency that checking itself becomes a bottleneck, so `innodb_deadlock_detect` can be turned off, falling back to `innodb_lock_wait_timeout`.

**PostgreSQL detects lazily.** A waiting transaction first sleeps for `deadlock_timeout`, one second by default, and **only then** builds the wait-for graph and looks for a cycle. The reasoning is sound: the overwhelming majority of lock waits are ordinary contention that resolves on its own, so paying the cost of graph construction on every wait would be wasteful. The trade is that a real deadlock is held for up to a second before being broken.

A third, cruder approach is timeout-based detection: abort anything that waits too long. It is simple and needs no graph, but it cannot distinguish a deadlock from a slow transaction, so the timeout is always a guess that either breaks deadlocks slowly or aborts healthy transactions.

#### Prevention in distributed systems

A **global wait-for graph** across nodes is impractical. Collecting the local graphs costs messages and time, and by the time they are assembled the information is **stale**, which produces **phantom deadlocks**: detected cycles that have already resolved, causing needless aborts.

So distributed systems generally **prevent** rather than detect, by giving every transaction a **timestamp** and using it to impose a **total order**. A cycle cannot exist in a total order, so deadlock becomes structurally impossible.

**Wait-Die**, the **non-preemptive** scheme. If a transaction requests a lock held by another:

**An older transaction waits** for the younger one.

**A younger transaction dies**, meaning it aborts and restarts with its original timestamp so it eventually becomes the oldest and is guaranteed to finish.

**Wound-Wait**, the **preemptive** scheme, with the roles reversed:

**An older transaction wounds the younger holder**, aborting it and taking the lock.

**A younger transaction waits** for the older one.

Both work because waiting only ever goes in one direction with respect to age. The practical difference, and the usual follow-up: Wound-Wait generally causes fewer aborts. Under Wait-Die a young transaction is killed every time it meets an older holder, and may be killed repeatedly as it restarts, whereas under Wound-Wait a young transaction is allowed to wait and is only killed when an older transaction actually needs its lock.

#### Victim selection

Once a deadlock is detected, one transaction is rolled back and the others continue. The principle is to choose the victim that is **cheapest to undo**.

**InnoDB** chooses the transaction that has done the **least work**, estimated from the number of rows inserted, updated or deleted, which is effectively the size of its undo log. It reports the full deadlock to the error log and the victim receives error **1213**, `ER_LOCK_DEADLOCK`.

**PostgreSQL** aborts the transaction that **detected** the cycle, which is the one whose `deadlock_timeout` expired, and returns **SQLSTATE 40P01**.

**SQL Server** uses an explicit **DEADLOCK_PRIORITY** setting first, and among equal priorities picks the transaction that is least expensive to roll back.

The factors that matter in general: **work already done**, since rolling back more is more expensive; number of locks held; an explicit **priority**, where available; and **restart history**, because repeatedly choosing the same victim causes **starvation**, so a transaction that has already been retried several times should be favoured.

The victim's error is **retryable**, and this is the point of the whole mechanism. The engine does not fail the work, it fails **one attempt** at the work.

#### Designing application code to avoid them

**Acquire locks in a consistent order.** This is the single most effective rule and the answer to lead with. Almost every real deadlock is two code paths touching the same rows in **opposite order**. Pick a deterministic order, usually ascending primary key, and apply it everywhere, including inside batch loops where the order comes from an unsorted input list.

**Keep transactions short and narrow.** Lock duration is proportional to deadlock probability. Never hold a transaction open across a network call, a user's think time, or any work that could be done before it starts.

**Touch the minimum number of rows, and index the predicates.** A missing index widens a lock from a few rows to a scanned range or, with gap locking, effectively the whole table, which **manufactures** deadlocks between transactions that have no real conflict. Many "mysterious" deadlocks are a missing index.

**Prefer a single atomic statement.** `UPDATE accounts SET bal = bal - 100 WHERE id = 1` acquires and releases in one step, with no window in which another lock can be requested.

**Lock everything you will need up front, in order.** One ordered `SELECT ... FOR UPDATE` covering all required rows avoids the incremental escalation where each transaction holds part of what the other wants.

**Avoid lock upgrades.** A transaction that reads a row with a shared lock and later upgrades to exclusive is a classic deadlock source, because two transactions can both hold shared and both wait to upgrade. Take the exclusive lock on the initial read with `FOR UPDATE` instead.

**Use the lowest isolation level that is still correct.** READ COMMITTED takes fewer and shorter locks than REPEATABLE READ and avoids gap locks in InnoDB, which removes a whole class of insert deadlocks.

**Always implement a retry loop.** Catch the deadlock error specifically, retry with exponential backoff and jitter so retries do not collide, cap the attempts, and make sure the transaction is **idempotent** or fully rolled back before retrying. Retrying a partially applied transaction is worse than the deadlock was.

---

### In code

```text
The classic deadlock: two paths, opposite order

  transaction A                       transaction B
  BEGIN;                              BEGIN;
  UPDATE accounts WHERE id=1;  (lock 1)
                                      UPDATE accounts WHERE id=2;  (lock 2)
  UPDATE accounts WHERE id=2;  waits for B
                                      UPDATE accounts WHERE id=1;  waits for A

  wait-for graph:
       A ---> B
       ^      |
       +------+        a cycle: nothing resolves without intervention

  Neither transaction did anything unreasonable. The defect is the
  COMBINATION: they took the locks in opposite orders.
```

```sql
-- The fix: a deterministic order everywhere, usually ascending key
-- WRONG: the order comes from the caller, so two callers can disagree
for (id in [2, 1]) { UPDATE accounts SET ... WHERE id = id; }

-- RIGHT: sort first, so every code path takes locks in the same order
for (id in sort([2, 1])) { UPDATE accounts SET ... WHERE id = id; }

-- Or lock everything up front, in order, in one statement
BEGIN;
  SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
  UPDATE accounts SET bal = bal - 100 WHERE id = 1;
  UPDATE accounts SET bal = bal + 100 WHERE id = 2;
COMMIT;
```

```text
Detection: eager vs lazy, and the trade

  MYSQL INNODB, eager
     maintains the wait-for graph
     checks for a cycle on EVERY lock wait
     -> a deadlock is broken almost immediately
     -> under extreme concurrency the checking itself is a bottleneck,
        so innodb_deadlock_detect can be disabled, falling back to
        innodb_lock_wait_timeout

  POSTGRESQL, lazy
     a waiter sleeps for deadlock_timeout (1 s by default)
     ONLY THEN builds the graph and looks for a cycle
     -> most lock waits are ordinary contention that clears on its own,
        so checking every wait would be wasted work
     -> but a real deadlock is held for up to a second

  TIMEOUT ONLY, crude
     abort anything that waits too long
     -> no graph needed, but it cannot tell a deadlock from a slow
        transaction, so the timeout is always a guess
```

```text
Distributed: prevent by timestamp, because detection does not scale

  a global wait-for graph needs messages and time, and arrives STALE
  -> PHANTOM DEADLOCKS: cycles that have already resolved, aborted
     for nothing

  so impose a total order with transaction timestamps. A cycle cannot
  exist in a total order.

  WAIT-DIE (non-preemptive)        requester vs holder
     older requests younger  ->  older WAITS
     younger requests older  ->  younger DIES (aborts, restarts with
                                 its ORIGINAL timestamp, so it
                                 eventually becomes oldest and finishes)

  WOUND-WAIT (preemptive)
     older requests younger  ->  older WOUNDS the holder (aborts it)
     younger requests older  ->  younger WAITS

  Wound-Wait usually causes FEWER aborts: under Wait-Die a young
  transaction dies every time it meets an older holder and may die
  repeatedly, while under Wound-Wait it is allowed to wait and dies
  only when an older transaction actually needs its lock.
```

```text
Victim selection, by engine:

  INNODB       the transaction that has done the LEAST work, estimated
               from rows inserted/updated/deleted (its undo log size)
               victim gets error 1213, ER_LOCK_DEADLOCK

  POSTGRESQL   the transaction that DETECTED the cycle, i.e. whose
               deadlock_timeout expired
               victim gets SQLSTATE 40P01

  SQL SERVER   DEADLOCK_PRIORITY first; among equals, the one least
               expensive to roll back

  general factors: work already done, locks held, explicit priority,
  and restart history, because always picking the same victim causes
  STARVATION, so a transaction already retried several times should
  be spared.

  The victim's error is RETRYABLE. The engine does not fail the work,
  it fails ONE ATTEMPT at the work.
```

```sql
-- Avoid lock upgrades: a shared read that later needs exclusive
-- WRONG: both transactions hold shared, both wait to upgrade -> deadlock
BEGIN;
  SELECT bal FROM accounts WHERE id = 1;            -- shared
  UPDATE accounts SET bal = bal - 100 WHERE id = 1; -- wants exclusive
COMMIT;

-- RIGHT: take the exclusive lock on the first read
BEGIN;
  SELECT bal FROM accounts WHERE id = 1 FOR UPDATE; -- exclusive now
  UPDATE accounts SET bal = bal - 100 WHERE id = 1;
COMMIT;

-- BETTER STILL: one atomic statement, no window at all
UPDATE accounts SET bal = bal - 100 WHERE id = 1;
```

```text
The retry loop, which is not optional:

  attempt = 0
  loop:
      try:
          BEGIN
          ... work ...
          COMMIT
          return
      catch deadlock (1213 / 40P01):
          ROLLBACK                       <- must be fully rolled back
          attempt += 1
          if attempt > max: give up and surface the error
          sleep(base * 2^attempt + random jitter)   <- jitter matters,
                                                       or retries collide
          continue

  and the work must be idempotent or fully undone before retrying.
  Retrying a partially applied transaction is worse than the deadlock.
```

---

### What they ask next

**"Are deadlocks a bug?"**
Not in themselves. Any system with row locks and concurrency will produce some, so they are an expected operating condition. The bug is an application with **no retry path**, or a **rate** of deadlocks high enough to indicate inconsistent lock ordering or missing indexes.

**"Why does PostgreSQL wait a second before looking?"**
Because almost all lock waits are ordinary contention that clears on its own, so building a wait-for graph on every wait would be mostly wasted work. It trades up to a second of delay on real deadlocks for much lower overhead on the common case.

**"What is a phantom deadlock?"**
A cycle that a distributed detector believes it has found but which has already resolved, because the local graphs it combined were collected at different moments. The transaction is aborted for nothing, which is a strong argument for prevention by timestamp ordering instead of distributed detection.

**"Why does Wound-Wait abort fewer transactions than Wait-Die?"**
Because Wait-Die kills the younger transaction on **every** conflict and it may be killed again on each restart, while Wound-Wait lets the younger one wait and kills it only when an older transaction genuinely needs the lock it holds.

**"How can a missing index cause a deadlock?"**
By widening the locks. Without a usable index the engine scans and locks far more rows than the predicate matches, and with InnoDB's gap locking it locks the gaps too, so two transactions whose rows do not overlap end up contending anyway. Adding the index often eliminates the deadlock entirely.

**"What should a retry look like?"**
Catch the deadlock error specifically rather than all errors, roll back fully, back off exponentially with jitter so concurrent victims do not collide again, cap the attempts, and ensure the transaction is idempotent. Retrying forever or immediately both make the situation worse.

**"Can you eliminate deadlocks entirely?"**
Only by removing one of the Coffman conditions, which in practice means a strict global lock ordering, or a design where a transaction never holds one lock while requesting another. That is achievable in constrained systems and unrealistic in a general application, which is why detection plus retry is the normal architecture.

**The common wrong answer** is describing the wait-for graph and stopping. The engine's detection is the part you do not control. The valuable half is that **consistent lock ordering plus short transactions plus the right indexes** prevents most deadlocks before the engine ever has to look.

---

### Say this in the interview

*"A deadlock is two or more transactions each waiting for a lock held by another, so none can proceed. It needs the four Coffman conditions, mutual exclusion, hold and wait, no preemption and circular wait, and the one that matters here is circular wait, because that is the one application code controls. I would start by saying that in a transactional database deadlocks are expected and normal rather than a bug: any system with row locks and concurrency produces some, so the engine's job is to detect and break them quickly and the application's job is to retry.*

*On a single node both main engines use a wait-for graph, where each node is a transaction and an edge from A to B means A is waiting on a lock B holds, and a cycle is a deadlock. They differ in when they look. InnoDB detects eagerly, maintaining the graph and checking for a cycle on every lock wait, so a deadlock is broken almost immediately, though under extreme concurrency that checking becomes a bottleneck and can be disabled in favour of a lock wait timeout. PostgreSQL detects lazily: a waiter sleeps for deadlock_timeout, one second by default, and only then builds the graph, on the reasoning that almost all lock waits are ordinary contention that clears on its own, so checking every wait would be wasted. The trade is up to a second of delay on a real deadlock. The crudest approach is pure timeout, which needs no graph but cannot tell a deadlock from a slow transaction.*

*Distributed systems prevent rather than detect, because a global wait-for graph costs messages and arrives stale, producing phantom deadlocks: cycles that have already resolved, so transactions are aborted for nothing. Instead each transaction gets a timestamp, which imposes a total order, and a cycle cannot exist in a total order. Wait-Die is non-preemptive: an older transaction requesting a lock held by a younger one waits, and a younger one requesting an older one's lock dies, aborting and restarting with its original timestamp so it eventually becomes oldest and is guaranteed to finish. Wound-Wait is preemptive and reverses that: the older transaction wounds the younger holder, aborting it, and a younger requester waits. Wound-Wait usually causes fewer aborts, because Wait-Die kills the young transaction on every conflict and may kill it repeatedly on restart, while Wound-Wait lets it wait and kills it only when an older transaction actually needs its lock.*

*Victim selection picks whichever transaction is cheapest to undo. InnoDB picks the one that has done the least work, estimated from rows inserted, updated and deleted, which is effectively its undo log size, and the victim gets error 1213. PostgreSQL aborts the transaction that detected the cycle, the one whose timeout expired, with SQLSTATE 40P01. SQL Server uses DEADLOCK_PRIORITY first and then the least expensive rollback. In general the factors are work already done, locks held, explicit priority, and restart history, because always choosing the same victim causes starvation. The point is that the victim's error is retryable: the engine fails one attempt, not the work.*

*For application design, the single most effective rule is acquiring locks in a consistent order, because almost every real deadlock is two code paths touching the same rows in opposite orders, so I would sort by primary key everywhere including inside batch loops. Then keep transactions short and narrow and never hold one across a network call or a user's think time. Touch the minimum rows and index the predicates, because a missing index widens a lock from a few rows to a scanned range, and with gap locking effectively the whole table, which manufactures deadlocks between transactions that have no real conflict. Prefer a single atomic statement where the new value is a function of the old. Lock everything you need up front in one ordered SELECT FOR UPDATE rather than escalating. Avoid lock upgrades, since two transactions both holding shared and both wanting exclusive is a classic cycle, so take the exclusive lock on the initial read. Use the lowest isolation level that is still correct, since READ COMMITTED avoids InnoDB's gap locks and a whole class of insert deadlocks. And always implement a retry loop: catch the deadlock error specifically, roll back fully, back off exponentially with jitter so retries do not collide, cap the attempts, and make sure the work is idempotent, because retrying a partially applied transaction is worse than the deadlock was."*
