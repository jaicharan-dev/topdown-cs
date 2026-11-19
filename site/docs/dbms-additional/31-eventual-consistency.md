---
id: 31-eventual-consistency
title: "Eventual Consistency"
description: "A promise that replicas converge with no promise about when, the overlap rule that makes a read see the latest write, and what happens when two writes genuinely conflict"

sidebar_position: 31
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is eventual consistency? Give concrete real-world examples, explain quorum tuning formulas (R + W > N), and detail how distributed databases resolve conflicting concurrent writes."

---

### Picture it

A notice pinned up in several branch offices, updated by telephone.

**The promise is that if the updates stop, every branch will end up showing the same notice.** That is a real guarantee and worth having. What it conspicuously does not say is **when**. A second, a minute, or until somebody notices the phone call never arrived.

So a customer in one branch can read something a customer in another branch would not recognise, and **neither branch is broken**.

**Now, how do you get certainty back when you need it?**

Suppose the notice is kept in **three** branches. You could telephone **all three** on every update, and then any single branch is guaranteed current. That is slow, and if one branch is closed you cannot update at all.

**The trick is to overlap.** Update **two** branches, and later ask **two** branches. Two plus two is more than three, so the pair you ask **must include at least one** of the pair you updated. You never contacted all three, and you are still certain.

Change the numbers and you move the cost around. Update all three and ask one: reading is instant, updating is fragile. Update one and ask all three: the reverse. **Two and two** is the balanced choice, and it survives one branch being shut.

**And then the case the overlap rule does not cover.**

Two people update the **same** notice at the **same moment**, in different branches, with different text. Neither saw the other. Both updates are legitimate. When the branches reconcile there are **two versions and no fact about which is right**, because there genuinely was no order between them.

The office must now **choose a policy in advance**, and the choices are not equally honest. It can keep whichever is marked with a later time, which is simple and **silently throws one away**, and depends on every branch's clock agreeing. It can keep **both** and make the next reader decide, which is truthful and pushes work onto them. Or it can use a notice **designed so that merging is obvious**, such as a list where the merge is simply everything on both copies.

---

### The proper terms

#### What eventual consistency is

**Eventual consistency** guarantees that **if no new updates are made to an item, all replicas will eventually converge to the same value**.

Two things about that definition matter more than the definition itself:

**It is a liveness property, not a safety one.** It promises that something good **eventually** happens. It does **not** promise that nothing bad happens meanwhile, and it says **nothing about when**. "Eventually" has no bound, which is why production systems care about the **convergence window** in practice even though the model does not mention it.

**The precondition is "if no new updates are made".** On a key that is written constantly, convergence is a moving target, and the system is always a little behind.

Between the extremes there are useful intermediate guarantees worth naming, because real systems are usually offering one of these rather than bare eventual consistency:

**Read-your-writes**: a client always sees its own writes, even if others do not yet.

**Monotonic reads**: a client never sees time go backwards, having read a newer value then an older one.

**Monotonic writes**: a client's own writes are applied in the order it issued them.

**Causal consistency**: operations causally related are seen by everyone in the same order, while concurrent operations may be seen in any order. This is the strongest guarantee achievable while remaining available under partition.

#### Real examples

**DNS.** The canonical one. A record change propagates as caches expire according to the **TTL**, so for the length of the TTL different resolvers return different answers. Nobody considers DNS broken; the staleness window is explicit and configurable.

**A CDN after a purge.** Edges drop the cached object at different moments, so for a period some users see the old asset and some the new.

**Social media counts.** Likes, view counts and follower counts are computed from replicas and aggregated asynchronously, which is why the number visibly changes when you refresh. Exactness is worth nothing here and latency is worth a lot.

**Amazon's shopping cart**, the original Dynamo motivation. Adding to a cart must **never** fail, even during a partition, so the cart is AP. The famous consequence is that a removed item could **reappear** after a partition healed, because the merge was a union.

**S3.** It was eventually consistent for overwrite `PUT`s and `DELETE`s for most of its life and became strongly consistent in December 2020, which is a useful example of a system deliberately moving in the other direction once the engineering allowed it.

**A bank's "pending" transactions.** The authoritative ledger is strongly consistent; what the app shows you is a replicated, slightly stale view, and the word "pending" is the interface admitting it.

#### Quorum tuning

In a **Dynamo-style** system, three numbers control the trade:

**N**, the **replication factor**: how many replicas hold each key.

**W**, the write quorum: how many replicas must acknowledge before a write is considered successful.

**R**, the read quorum: how many replicas must respond before a read is returned.

**The overlap rule is `R + W > N`.**

The reasoning is the pigeonhole principle: if the write touched `W` replicas and the read consults `R` replicas, and `R + W > N`, then the two sets **cannot be disjoint**. They must share **at least one** replica, and that replica has the latest write. So the read is guaranteed to **see** the most recent write, provided it can identify which returned value is newest, normally through a version or timestamp.

If `R + W <= N`, the sets may not overlap and a read can **miss** the latest write: that is eventual consistency.

There is a second condition that is easy to forget: `W > N/2`. Without it, two concurrent writes could each succeed on **disjoint** sets of replicas, so both are "successful" and the system has two conflicting accepted writes with no overlap to detect them.

The common configurations, for `N = 3`:

| W | R | Behaviour |
| --- | --- | --- |
| 3 | 1 | Fast reads, fragile writes: any node down blocks writes |
| 1 | 3 | Fast writes, fragile reads |
| **2** | **2** | **Balanced, tolerates one node down for both.** The standard choice |
| 1 | 1 | Fastest, eventual only, `R + W = 2 < 3` |

Dynamo-style systems let you choose **per operation**, so a read of a feed can use `ONE` while a read of a balance uses `QUORUM`.

And the caveat that distinguishes a careful answer: **`R + W > N` gives you overlap, not linearizability.** It does not make the system strongly consistent in the CAP sense, because:

**Concurrent writes** can still produce conflicting versions that the overlap merely lets you **detect**, not resolve.

**A failed write** that reached some replicas is not rolled back, so a subsequent read may or may not see it.

**Sloppy quorums**, where a write is accepted by any `W` reachable nodes rather than the `W` that should own the key, break the overlap guarantee entirely in exchange for availability during a partition. The data is later moved to its proper home by **hinted handoff**.

#### Resolving conflicting concurrent writes

When two writes to the same key are **concurrent**, meaning neither happened before the other, there is **no fact of the matter** about which should win. The system must apply a policy, and the choices differ in honesty.

**Last write wins.** Each write carries a timestamp and the later one is kept.

**Simple, and it silently discards data.** It also depends on **clock synchronisation**: with clock skew, the write that arrives later can carry an earlier timestamp and be thrown away. Cassandra uses LWW by default, which is why its documentation is emphatic about NTP.

**Version vectors.** Each replica keeps a counter per key, and a write carries the version it saw. Comparing two vectors tells you whether A **happened before** B, B before A, or whether they are **concurrent**.

Concurrent writes are returned to the client as siblings, and the application resolves them. This is **honest**, since it never loses data silently, and it **pushes work to the application**, which must have a merge strategy. Riak and the original Dynamo work this way.

**CRDTs**, conflict-free replicated data types. Data structures designed so that the merge operation is **commutative, associative and idempotent**, which means replicas converge **regardless of the order** in which they receive updates, with **no coordination at all**.

Examples: a G-Counter, a grow-only counter that keeps a per-replica count and sums them; a PN-Counter, which pairs an increment and a decrement counter; an OR-Set, which tags each addition uniquely so an add and a concurrent remove resolve deterministically; and an LWW-Register for single values.

Used by Riak, Redis Enterprise, Automerge and essentially every collaborative editor. The cost is that **not everything can be expressed as a CRDT**, and the metadata can grow.

**Application-level merge.** The system returns both versions and the application combines them with domain knowledge. Amazon's cart union is the famous case, and the resurrected deleted item is the famous consequence.

Two **supporting mechanisms** that are part of a complete answer but are not conflict resolution themselves:

**Read repair.** When a read detects that replicas disagree, the coordinator **writes the newest version back** to the stale ones, so frequently-read keys converge quickly.

**Anti-entropy with Merkle trees.** Replicas periodically compare **hash trees** of their key ranges, which identifies differing ranges in logarithmic time without transferring the data, then exchange only what differs. This is what makes rarely-read keys converge at all.

---

### In code

```text
THE DEFINITION, and the two things about it that matter:

  "if no new updates are made to an item, ALL REPLICAS WILL
   EVENTUALLY CONVERGE to the same value"

  1. IT IS A LIVENESS PROPERTY, NOT A SAFETY ONE.
     it promises something good EVENTUALLY happens.
     it does NOT promise nothing bad happens meanwhile, and it says
     NOTHING ABOUT WHEN. "Eventually" has no bound, which is why
     production systems care about the CONVERGENCE WINDOW even
     though the model does not mention it.

  2. THE PRECONDITION IS "IF NO NEW UPDATES ARE MADE".
     on a key written constantly, convergence is a moving target
     and the system is always a little behind.

  and the useful INTERMEDIATE guarantees, which is what real systems
  usually offer rather than bare eventual consistency:

     READ-YOUR-WRITES   a client always sees its OWN writes
     MONOTONIC READS    a client never sees time go backwards
     MONOTONIC WRITES   a client's writes apply in the order issued
     CAUSAL             causally related operations are seen in the
                        same order by everyone; concurrent ones may
                        be seen in any order
                        -> THE STRONGEST achievable while remaining
                           AVAILABLE under partition
```

```text
REAL EXAMPLES:

  DNS                the canonical one. A record change propagates
                     as caches expire by TTL, so for the TTL
                     different resolvers return different answers.
                     Nobody calls DNS broken; the staleness window
                     is EXPLICIT AND CONFIGURABLE.

  A CDN AFTER A      edges drop the cached object at different
  PURGE              moments, so some users see the old asset and
                     some the new

  SOCIAL COUNTS      likes, views and followers are aggregated
                     asynchronously, which is why the number changes
                     when you refresh.
                     exactness is worth nothing here, latency a lot.

  AMAZON'S CART      the original Dynamo motivation: adding to a
                     cart must NEVER fail, even during a partition,
                     so the cart is AP.
                     the famous consequence: a REMOVED ITEM COULD
                     REAPPEAR after a partition healed, because the
                     merge was a UNION.

  S3                 eventually consistent for overwrite PUTs and
                     DELETEs for most of its life, STRONGLY
                     CONSISTENT SINCE DECEMBER 2020: a system
                     deliberately moving the other way once the
                     engineering allowed it.

  A BANK'S           the authoritative ledger is strongly
  "PENDING"          consistent; what the app shows is a replicated,
  TRANSACTIONS       slightly stale view, and the word "pending" is
                     the interface ADMITTING it.
```

```text
QUORUM TUNING: three numbers

  N   the REPLICATION FACTOR: how many replicas hold each key
  W   the WRITE QUORUM: how many must acknowledge a write
  R   the READ QUORUM: how many must respond to a read

  THE OVERLAP RULE:   R + W > N

  the reasoning is the PIGEONHOLE PRINCIPLE: if the write touched W
  replicas and the read consults R replicas, and R + W > N, the two
  sets CANNOT BE DISJOINT. They must share AT LEAST ONE replica, and
  that replica has the latest write.

     N = 3, W = 2, R = 2
     replicas:   [A] [B] [C]
     write hits:  A   B
     read hits:       B   C
                      ^ the OVERLAP. The read sees the write.

     N = 3, W = 1, R = 1        R + W = 2, NOT > 3
     write hits:  A
     read hits:           C
                  ^ no overlap: THE READ MISSES THE WRITE

  AND A SECOND CONDITION THAT IS EASY TO FORGET:  W > N/2
     without it, two concurrent writes could each succeed on
     DISJOINT sets, so both are "successful" and the system holds
     two conflicting accepted writes with no overlap to detect them.
```

```text
The common configurations, N = 3:

   W   R    behaviour
   3   1    fast reads, FRAGILE WRITES: any node down blocks writes
   1   3    fast writes, fragile reads
   2   2    BALANCED, tolerates one node down for BOTH  <- standard
   1   1    fastest, EVENTUAL ONLY (R + W = 2, not > 3)

  Dynamo-style systems let you choose PER OPERATION:
     SELECT ... CONSISTENCY ONE;       -- a feed: latency matters
     SELECT ... CONSISTENCY QUORUM;    -- a balance: recency matters
     SELECT ... CONSISTENCY LOCAL_QUORUM;  -- a quorum within one
                                           -- datacentre, avoiding a
                                           -- cross-region round trip
```

```text
THE CAVEAT: R + W > N gives you OVERLAP, NOT LINEARIZABILITY

  it does NOT make the system strongly consistent in the CAP sense:

  CONCURRENT WRITES   can still produce conflicting versions. The
                      overlap lets you DETECT them, not RESOLVE them.

  A FAILED WRITE      that reached SOME replicas is NOT ROLLED BACK,
                      so a later read may or may not see it.

  SLOPPY QUORUMS      a write accepted by any W REACHABLE nodes
                      rather than the W that OWN the key.
                      this BREAKS the overlap guarantee entirely, in
                      exchange for availability during a partition.
                      the data is later moved to its proper home by
                      HINTED HANDOFF.
```

```text
RESOLVING CONCURRENT WRITES

  when two writes are CONCURRENT (neither happened before the
  other), there is NO FACT OF THE MATTER about which should win.
  The system applies a policy, and the choices differ in HONESTY.

  1. LAST WRITE WINS
        each write carries a timestamp; the later one is kept.
        SIMPLE, AND IT SILENTLY DISCARDS DATA.
        it also depends on CLOCK SYNCHRONISATION: with skew, the
        write that ARRIVES later can carry an EARLIER timestamp and
        be thrown away.
        Cassandra's default, which is why its docs are emphatic
        about NTP.

  2. VERSION VECTORS
        each replica keeps a counter per key; a write carries the
        version it saw. Comparing two vectors tells you whether
        A HAPPENED BEFORE B, B before A, or they are CONCURRENT.

           A: {r1:2, r2:1}   B: {r1:1, r2:3}
           neither dominates -> CONCURRENT

        concurrent writes are returned to the client as SIBLINGS and
        the application resolves them.
        HONEST: never loses data silently.
        PUSHES WORK TO THE APPLICATION, which must have a merge
        strategy. Riak and the original Dynamo.

  3. CRDTs (conflict-free replicated data types)
        structures whose MERGE is COMMUTATIVE, ASSOCIATIVE and
        IDEMPOTENT, so replicas converge REGARDLESS OF THE ORDER
        updates arrive, WITH NO COORDINATION AT ALL.

           G-Counter      grow-only: a per-replica count, summed
           PN-Counter     an increment counter plus a decrement one
           OR-Set         each addition uniquely tagged, so an add
                          and a concurrent remove resolve
                          deterministically
           LWW-Register   a single value with a timestamp

        Riak, Redis Enterprise, Automerge, and essentially every
        collaborative editor.
        the cost: NOT EVERYTHING CAN BE EXPRESSED AS A CRDT, and the
        metadata can grow.

  4. APPLICATION-LEVEL MERGE
        return both versions and let domain knowledge combine them.
        Amazon's cart UNION is the famous case, and the resurrected
        deleted item is the famous consequence.
```

```text
Two SUPPORTING MECHANISMS, part of a complete answer but not
conflict resolution themselves:

  READ REPAIR
     when a read finds replicas disagreeing, the coordinator WRITES
     THE NEWEST VERSION BACK to the stale ones.
     -> frequently-read keys converge quickly, for free

  ANTI-ENTROPY WITH MERKLE TREES
     replicas periodically compare HASH TREES of their key ranges,
     identifying differing ranges in LOGARITHMIC TIME without
     transferring the data, then exchange only what differs.

        root hash differs?
          -> compare children
            -> compare children
              -> found: only THIS range differs. Exchange it.

     -> this is what makes RARELY-READ keys converge at all, since
        read repair never touches them.
```

---

### What they ask next

**"What does eventual consistency actually promise?"**
That if updates stop, replicas converge. It is a liveness property with no bound on when, and the precondition matters: on a constantly written key, convergence is a moving target. Real systems usually offer something stronger, such as read-your-writes or causal consistency.

**"Give a real example people already accept."**
DNS. A record change propagates as caches expire by TTL, so different resolvers return different answers for the length of the TTL, and nobody considers that a defect because the staleness window is explicit and configurable.

**"Why does `R + W > N` give you the latest write?"**
Pigeonhole. If the write touched W replicas and the read consults R, and together they exceed N, the two sets cannot be disjoint, so the read set contains at least one replica that received the write. Versioning then identifies which returned value is newest.

**"What is the second quorum condition?"**
`W > N/2`. Without it, two concurrent writes could each succeed on disjoint replica sets, so both are accepted and nothing overlaps to detect the conflict. It is the condition people forget when they focus only on the read-write overlap.

**"Does `R + W > N` make a system strongly consistent?"**
No. It gives overlap, not linearizability. Concurrent writes can still conflict, a partially-completed failed write is not rolled back, and sloppy quorums abandon the guarantee entirely in exchange for availability, relying on hinted handoff afterwards.

**"What is wrong with last write wins?"**
It discards data silently and depends on synchronised clocks, so with skew the write that arrived later can carry an earlier timestamp and be thrown away. It is simple and it loses writes without telling anyone, which is why systems defaulting to it warn heavily about NTP.

**"How do version vectors differ?"**
They track causality rather than time, so comparing two vectors reveals whether one happened before the other or whether they are genuinely concurrent. Concurrent writes are returned as siblings for the application to merge, which never loses data silently but requires a merge strategy.

**"What makes a CRDT work?"**
Its merge operation is commutative, associative and idempotent, so replicas converge regardless of the order or repetition of updates, with no coordination. The limitation is that not every data type can be expressed that way, and the metadata can grow.

**"How do rarely-read keys ever converge?"**
Anti-entropy. Replicas compare Merkle trees of their key ranges, which finds differing ranges logarithmically without transferring data, then exchange only what differs. Read repair handles the frequently-read keys; anti-entropy handles the rest.

**The common wrong answer** is "the data is correct eventually, so it is fine for non-critical things". The content wanted is that **eventually has no bound**, that **`R + W > N` buys overlap rather than linearizability** and needs the second condition `W > N/2`, and that **concurrent writes have no correct resolution**, only policies that differ in whether they lose data silently, hand the problem to the application, or make the merge mathematically unambiguous.

---

### Say this in the interview

*"Eventual consistency guarantees that if no new updates are made to an item, all replicas will eventually converge to the same value. Two things about that matter more than the definition. It is a liveness property rather than a safety one: it promises something good eventually happens, not that nothing bad happens meanwhile, and it says nothing about when, so eventually has no bound, which is why production systems care about the convergence window even though the model does not mention it. And the precondition is if no new updates are made, so on a constantly written key convergence is a moving target. Real systems usually offer something stronger: read-your-writes, monotonic reads, monotonic writes, or causal consistency, which is the strongest guarantee achievable while remaining available under partition.*

*For examples, DNS is the canonical one: a record change propagates as caches expire by TTL, so different resolvers return different answers for the length of the TTL and nobody calls it broken, because the staleness window is explicit and configurable. A CDN after a purge behaves the same way. Social media like and follower counts are aggregated asynchronously, which is why the number changes when you refresh. Amazon's shopping cart was the original Dynamo motivation, where adding to a cart must never fail even during a partition, and the famous consequence was that a removed item could reappear after a partition healed because the merge was a union. S3 was eventually consistent for overwrites until December 2020 and is now strongly consistent, which is a nice example of a system moving the other way. And a bank's pending transactions are the authoritative ledger being strongly consistent while the view you see is a slightly stale replica, with the word pending being the interface admitting it.*

*On quorums, there are three numbers: N, the replication factor; W, how many replicas must acknowledge a write; and R, how many must respond to a read. The overlap rule is R plus W greater than N, and the reasoning is the pigeonhole principle: if the write touched W replicas and the read consults R, and together they exceed N, the sets cannot be disjoint, so the read set contains at least one replica holding the latest write, and versioning identifies which value is newest. If R plus W is not greater than N, the sets may not overlap and the read can miss the write, which is eventual consistency. There is a second condition people forget: W must exceed N over two, because otherwise two concurrent writes could each succeed on disjoint sets, so both are accepted and nothing overlaps to detect the conflict.*

*With N of three, the common configurations are W three R one for fast reads and fragile writes, W one R three for the reverse, W two R two as the balanced standard tolerating one node down for both, and W one R one for the fastest, eventual-only setting. Dynamo-style systems let you choose per operation, so a feed read uses ONE and a balance read uses QUORUM, with LOCAL_QUORUM avoiding a cross-region round trip.*

*The caveat is that R plus W greater than N gives you overlap, not linearizability. Concurrent writes can still produce conflicting versions, which the overlap lets you detect rather than resolve; a failed write that reached some replicas is not rolled back, so a later read may or may not see it; and sloppy quorums, where a write is accepted by any W reachable nodes rather than the W that own the key, break the guarantee entirely in exchange for availability, with hinted handoff moving the data to its proper home afterwards.*

*For conflicting concurrent writes, where neither happened before the other, there is no fact of the matter about which should win, so the system applies a policy. Last write wins keeps the later timestamp, which is simple, silently discards data, and depends on clock synchronisation, so with skew the write that arrived later can carry an earlier timestamp and be thrown away. That is Cassandra's default, which is why its documentation is emphatic about NTP. Version vectors track causality instead, so comparing two vectors reveals whether one happened before the other or whether they are concurrent, and concurrent writes are returned as siblings for the application to resolve, which is honest because nothing is lost silently but pushes work to the application. CRDTs are structures whose merge is commutative, associative and idempotent, so replicas converge regardless of the order updates arrive with no coordination at all, which covers counters, sets and registers, with the limitation that not everything can be expressed that way and the metadata can grow. And application-level merge returns both versions for domain knowledge to combine, as Amazon's cart union did.*

*Two supporting mechanisms complete it: read repair, where a read that finds replicas disagreeing writes the newest version back to the stale ones so frequently-read keys converge quickly; and anti-entropy with Merkle trees, where replicas compare hash trees of their key ranges to find differences in logarithmic time without transferring data, which is what makes rarely-read keys converge at all."*
