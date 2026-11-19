---
id: 32-database-replication-vs-sharding
title: "Replication vs Sharding"
description: "Copying everything to every node against dividing it among them, and why one of them makes a node failure worse"

sidebar_position: 32
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is database replication, and what is database sharding? How are they fundamentally different, what are the failure modes of each, and how do enterprise architectures combine both?"

---

### Picture it

A library that has outgrown one building.

**One answer is to open identical branches.** Every branch holds **the whole collection**. A reader can walk into any of them and find any book, so you can serve far more readers at once, and if a branch burns down nothing is lost.

What it does not help with is **acquisitions**. Every new book must be printed and delivered to **every branch**, so buying books is no faster than before, and each branch still needs shelf space for the **entire** collection. You have solved reading, not growing.

**The other answer is to split the collection.** A to F here, G to M there, N to Z in the third. Now each building holds a third of the books, so each needs a third of the shelving, and three delivery vans can be unloading **simultaneously** into three buildings.

And notice what has just become much worse. **If one building burns down, those books are gone.** Not slow to reach, not temporarily unavailable: **gone**. With identical branches a fire cost you nothing. With a split collection a fire costs you a third of everything you own. Splitting makes a failure **worse**, not better.

**Also**, "every book by this author" used to be one trip. Now the author's books may be in three buildings, so somebody must visit all three and combine the results.

**Which is why nobody chooses one.** You split the collection **and then** open two or three identical branches **for each part**. Each third of the books exists in three places, so a fire costs nothing and the shelving still divides. Both problems solved, and the number of buildings is the product rather than the sum.

---

### The proper terms

#### Replication

**Replication** keeps **copies of the same data on multiple nodes**. Every replica holds the **full dataset**.

**What it gives you:**

**Availability.** A node fails and another already has the data, so the system survives it.

**Read scaling.** Reads spread across replicas, which is decisive for read-heavy workloads.

**Geographic locality.** A replica near the user reduces latency, since the speed of light is not negotiable.

**Disaster recovery.** A copy in another region, and a replica to take backups from without loading the primary.

**What it does not give you**, and this is the half people omit:

**No write scaling.** Every write must be applied to **every replica**, so write throughput is bounded by what one node can absorb, not improved by adding more.

**No storage relief.** Every node stores **everything**, so a dataset larger than one machine's disk is still larger than one machine's disk.

The topologies:

**Single-leader**, the common case: all writes go to one primary, which streams changes to read-only replicas.

**Multi-leader**: several nodes accept writes, used for multi-region or offline-capable clients, at the cost of write conflicts that must be resolved.

**Leaderless**, the Dynamo style: any replica accepts writes, with quorums providing the consistency guarantee.

And the synchrony choice, which is the real trade:

**Synchronous**: the primary waits for the replica to acknowledge. No data loss on failover, and a slow or failed replica blocks writes.

**Asynchronous**: the primary acknowledges immediately. Fast, and a failover can lose recently committed writes.

**Semi-synchronous**: wait for at least one replica, which is the usual compromise.

#### Sharding

**Sharding**, also called **horizontal partitioning**, **divides the data across nodes**. Each shard holds a **subset**, and no shard holds the whole.

**What it gives you:**

**Write scaling.** Writes distribute across shards, so throughput grows with the number of shards. This is the thing replication cannot do.

**Storage beyond one machine.** Each shard stores `1/N` of the data.

**A smaller working set per node**, so each node's cache covers a larger fraction of its own data.

**What it does not give you:**

**No availability by itself.** This is the crucial point: losing a shard loses **that portion of the data entirely**. An unreplicated sharded cluster is **less available** than a single node, because it has N times as many machines that can take data with them. Sharding **adds** a failure mode rather than removing one.

The strategies:

**Range-based**: shard by key ranges. Range queries stay local, and it is prone to **hotspots** if the key is skewed or monotonic.

**Hash-based**: shard by a hash of the key. Even distribution, and range queries become scatter-gather across every shard.

**Directory-based**: an explicit lookup table mapping key to shard. Maximum flexibility, and the directory is a dependency and a potential bottleneck.

**Geographic**: shard by region, which serves data residency requirements and locality.

#### The fundamental difference

One sentence: **replication copies, sharding divides.**

**Replication** gives every node `N` copies of **everything**; **sharding** gives every node `1/N` of **everything**.

So they solve **disjoint problems**:

| | Replication | Sharding |
| --- | --- | --- |
| Read scaling | yes | yes, by partition |
| **Write scaling** | **no** | yes |
| Storage capacity | **no** | yes |
| **Availability** | yes | no, it makes it worse |
| Query complexity | unchanged | cross-shard queries become hard |
| Operational cost | moderate | high |

Which is why the decision rule is simple: **replicate for availability and reads; shard for writes and capacity**; and because those are different problems, **you almost always need both**.

#### Failure modes of replication

**Replication lag.** A replica is behind the primary, which produces **stale reads**, and worse, **read-your-writes violations**: a user writes, is routed to a replica, and does not see their own change. The usual mitigations are **routing reads after a write to the primary** for a period, or **session-consistent** routing that tracks the write position.

**Split brain.** A network partition leaves **two nodes both believing they are primary**, so both accept writes and the data **diverges**. Reconciling afterwards means choosing which writes to discard. The defences are **quorum-based leader election**, requiring a majority, and **fencing**, which uses a monotonically increasing token so that storage rejects writes from a deposed leader.

**Failover data loss.** With asynchronous replication, a primary that dies may have acknowledged writes that never reached any replica, so promoting a replica loses them silently.

**Replica overload.** Replicas serve reads **and** apply the full write stream, so a write-heavy primary can leave them unable to keep up, which increases lag, which makes the stale-read problem worse.

#### Failure modes of sharding

**Hotspots.** An uneven key distribution sends a disproportionate share of data or traffic to one shard, which then becomes the bottleneck **while the rest idle**. Monotonically increasing keys are the classic cause under range sharding.

**Cross-shard queries.** Any query not filtered by the shard key becomes a **scatter-gather**: fan out to every shard, wait for the **slowest**, and merge. Latency becomes the **tail latency** of the slowest shard, and aggregations such as `ORDER BY ... LIMIT` require over-fetching from each shard.

**Cross-shard transactions.** Atomicity across shards needs **two-phase commit** or a consensus protocol, which is slow, adds a coordinator, and introduces blocking if the coordinator fails. Most sharded designs avoid them by construction, choosing a shard key that keeps a transaction's rows together.

**Resharding.** Changing the number of shards means **moving data**, which is expensive, risky and slow. Naive `hash(key) % N` remaps almost every key when `N` changes, which is why **consistent hashing** or automatic range splitting exists.

**Lost global guarantees.** No global secondary indexes without extra machinery, no global `AUTO_INCREMENT`, no global ordering, and uniqueness only within a shard unless the unique column **is** the shard key.

#### How they combine

Every serious deployment does both, in one specific arrangement:

**Shard first, then replicate each shard.** Each shard becomes a **replication group**: a small cluster holding one slice of the data with two or three copies of it.

So a 9-node cluster is typically 3 shards x 3 replicas, which gives:

**Write scaling** from sharding, because three shards accept writes in parallel.

**Availability** from replication, because losing a node costs one replica of one shard and the other two serve it.

**Read scaling** from both: reads spread across replicas within each shard.

How this looks in real systems:

**MongoDB**: shards, each of which is a replica set.

**Cassandra**: token ranges with a **replication factor**, typically 3, where every node is both a shard owner and a replica for other ranges.

**CockroachDB and TiDB**: the key space is split into **ranges**, and each range is replicated by Raft, so sharding and replication are the same mechanism viewed differently.

**Elasticsearch**: primary shards and replica shards.

**Vitess**: MySQL shards, each a primary with replicas.

The standard shape to quote: **three replicas per shard, and as many shards as throughput and capacity require.** The replica count is a durability and availability decision; the shard count is a throughput and capacity decision; and they are chosen independently.

---

### In code

```text
THE FUNDAMENTAL DIFFERENCE: replication COPIES, sharding DIVIDES

  REPLICATION: every node has the FULL dataset

     node A: [ A-Z, all 100M rows ]
     node B: [ A-Z, all 100M rows ]      <- COPIES
     node C: [ A-Z, all 100M rows ]

     a read can go anywhere.
     a WRITE MUST GO EVERYWHERE.

  SHARDING: every node has a SUBSET

     node A: [ A-F,  33M rows ]
     node B: [ G-M,  33M rows ]          <- DIVISIONS
     node C: [ N-Z,  34M rows ]

     a write goes to ONE node.
     LOSING NODE B LOSES G-M ENTIRELY.
```

```text
What each one solves, and what it does NOT:

                        REPLICATION      SHARDING
  read scaling          YES              yes, by partition
  WRITE SCALING         NO               YES
  STORAGE CAPACITY      NO               YES
  AVAILABILITY          YES              NO, IT MAKES IT WORSE
  query complexity      unchanged        CROSS-SHARD QUERIES
                                         BECOME HARD
  operational cost      moderate         HIGH

  THE TWO THINGS PEOPLE OMIT:

  REPLICATION DOES NOT SCALE WRITES.
     every write is applied to EVERY replica, so write throughput is
     bounded by what ONE node can absorb. Adding replicas makes
     writes no faster, and arguably slower.

  SHARDING DOES NOT PROVIDE AVAILABILITY. IT REMOVES IT.
     losing a shard loses THAT PORTION OF THE DATA ENTIRELY, so an
     unreplicated sharded cluster is LESS AVAILABLE THAN A SINGLE
     NODE: it has N times as many machines that can take data with
     them.
     SHARDING ADDS A FAILURE MODE RATHER THAN REMOVING ONE.
```

```text
REPLICATION: topologies and the synchrony trade

  SINGLE-LEADER (the common case)
     all writes -> PRIMARY -> streams changes -> read-only replicas
  MULTI-LEADER
     several nodes accept writes: multi-region, offline-capable
     clients. The cost is WRITE CONFLICTS that must be resolved.
  LEADERLESS (Dynamo style)
     any replica accepts writes; QUORUMS provide the guarantee

  SYNCHRONOUS       the primary WAITS for the replica to acknowledge
                    + NO DATA LOSS on failover
                    - a slow or failed replica BLOCKS WRITES
  ASYNCHRONOUS      the primary acknowledges IMMEDIATELY
                    + fast
                    - a failover CAN LOSE recently committed writes
  SEMI-SYNCHRONOUS  wait for AT LEAST ONE replica
                    the usual compromise
```

```text
REPLICATION FAILURE MODES:

  REPLICATION LAG
     a replica is behind, producing STALE READS and, worse,
     READ-YOUR-WRITES VIOLATIONS: a user writes, is routed to a
     replica, and does not see their own change.
     mitigations: route reads to the PRIMARY for a period after a
     write, or SESSION-CONSISTENT routing that tracks the write
     position.

  SPLIT BRAIN
     a partition leaves TWO NODES BOTH BELIEVING THEY ARE PRIMARY,
     so both accept writes and the data DIVERGES. Reconciling means
     CHOOSING WHICH WRITES TO DISCARD.

        [clients] --> primary A  ||  primary B <-- [clients]
                          \          /
                           both writing, no communication

     defences: QUORUM-BASED LEADER ELECTION requiring a majority,
     and FENCING, a monotonically increasing token so storage
     REJECTS WRITES FROM A DEPOSED LEADER.

  FAILOVER DATA LOSS
     with async replication, a dying primary may have ACKNOWLEDGED
     writes that never reached any replica, so promoting one LOSES
     THEM SILENTLY.

  REPLICA OVERLOAD
     replicas serve reads AND apply the full write stream, so a
     write-heavy primary can leave them unable to keep up, which
     increases lag, which makes stale reads worse.
```

```text
SHARDING FAILURE MODES:

  HOTSPOTS
     an uneven key distribution sends a disproportionate share of
     data or traffic to one shard, which becomes the bottleneck
     WHILE THE REST IDLE.
     monotonically increasing keys are the classic cause under
     range sharding.

  CROSS-SHARD QUERIES
     any query not filtered by the shard key becomes a
     SCATTER-GATHER: fan out to EVERY shard, wait for THE SLOWEST,
     merge.

        SELECT * FROM users WHERE email = ?   -- not the shard key
          -> ask all 10 shards
          -> latency = THE TAIL LATENCY OF THE SLOWEST SHARD
          -> and ORDER BY ... LIMIT 10 needs 10 rows FROM EACH shard
             before merging

  CROSS-SHARD TRANSACTIONS
     atomicity across shards needs TWO-PHASE COMMIT or consensus:
     slow, adds a coordinator, and blocks if the coordinator fails.
     most sharded designs AVOID THEM BY CONSTRUCTION, choosing a
     shard key that keeps a transaction's rows together.

  RESHARDING
     changing the shard count means MOVING DATA: expensive, risky,
     slow. Naive hash(key) % N remaps ALMOST EVERY KEY when N
     changes, which is why consistent hashing and automatic range
     splitting exist.

  LOST GLOBAL GUARANTEES
     no global secondary indexes without extra machinery
     no global AUTO_INCREMENT
     no global ordering
     uniqueness only WITHIN a shard, unless the unique column IS
     the shard key
```

```text
HOW ENTERPRISE ARCHITECTURES COMBINE BOTH:

  SHARD FIRST, THEN REPLICATE EACH SHARD.
  each shard becomes a REPLICATION GROUP: a small cluster holding
  one slice of the data, with two or three copies of it.

  a 9-node cluster is typically 3 SHARDS x 3 REPLICAS:

     SHARD 1 (A-F)      SHARD 2 (G-M)      SHARD 3 (N-Z)
     +-----------+      +-----------+      +-----------+
     | primary   |      | primary   |      | primary   |
     | replica   |      | replica   |      | replica   |
     | replica   |      | replica   |      | replica   |
     +-----------+      +-----------+      +-----------+

     WRITE SCALING from sharding: three shards accept writes
        in parallel
     AVAILABILITY from replication: losing a node costs one replica
        of one shard, and the other two serve it
     READ SCALING from both: reads spread across replicas within
        each shard

  in real systems:
     MONGODB       shards, each of which IS A REPLICA SET
     CASSANDRA     token ranges with a REPLICATION FACTOR, usually
                   3; every node is both a shard owner and a replica
                   for other ranges
     COCKROACHDB   the key space splits into RANGES, and EACH RANGE
     and TiDB      IS REPLICATED BY RAFT, so sharding and
                   replication are the same mechanism viewed
                   differently
     ELASTICSEARCH primary shards and replica shards
     VITESS        MySQL shards, each a primary with replicas

  the shape to quote: THREE REPLICAS PER SHARD, AND AS MANY SHARDS
  AS THROUGHPUT AND CAPACITY REQUIRE.
  the replica count is a DURABILITY AND AVAILABILITY decision; the
  shard count is a THROUGHPUT AND CAPACITY decision; and they are
  chosen INDEPENDENTLY.
```

---

### What they ask next

**"Does replication help write throughput?"**
No. Every write must be applied to every replica, so throughput is bounded by what one node can absorb. Adding replicas helps reads and availability and makes writes no faster, and with synchronous replication slower.

**"Does sharding improve availability?"**
No, it reduces it. Losing a shard loses that portion of the data entirely, so an unreplicated sharded cluster is less available than a single node, because there are N times as many machines whose failure takes data with them. That is exactly why sharding is always combined with replication.

**"What is split brain and how do you prevent it?"**
A partition leaving two nodes both acting as primary, so both accept writes and the data diverges, with reconciliation meaning choosing which writes to throw away. Prevention is quorum-based election requiring a majority, plus fencing tokens so storage rejects writes from a leader that has been deposed.

**"What goes wrong with asynchronous replication on failover?"**
The dying primary may have acknowledged writes that never reached any replica, so promoting a replica loses them silently. Semi-synchronous replication, waiting for at least one replica, bounds the loss at the cost of some write latency.

**"What is a scatter-gather query?"**
Any query not filtered by the shard key, which must fan out to every shard and merge the results. Its latency is the tail latency of the slowest shard, and ordered queries with a limit need the limit's worth of rows from each shard before merging.

**"Why are cross-shard transactions avoided rather than solved?"**
Because the solution is two-phase commit or consensus, which is slow, needs a coordinator and blocks if the coordinator fails. Most designs pick a shard key that keeps a transaction's rows in one shard, so the problem does not arise.

**"How do you combine them?"**
Shard first, then replicate each shard, so each shard is a replication group. A nine-node cluster is typically three shards of three replicas, which gives write scaling from the sharding and availability from the replication, with the two counts chosen independently.

**"What do you lose when you shard?"**
Global guarantees. No global secondary index without extra machinery, no global auto-increment, no global ordering, and uniqueness only within a shard unless the unique column is the shard key. Those are usually more disruptive than the query fan-out.

**The common wrong answer** is "replication is for availability and sharding is for scale", which is the right shape and misses the two things that matter: **replication does not scale writes at all**, and **sharding actively reduces availability** by creating N places where data can be lost. Those two gaps are exactly why every real deployment shards **and then** replicates each shard.

---

### Say this in the interview

*"Replication keeps copies of the same data on multiple nodes, so every replica holds the full dataset. It gives you availability, since a node can fail and another already has the data; read scaling, since reads spread across replicas; geographic locality, since a nearby replica cuts latency; and disaster recovery. What it does not give you is write scaling, because every write must be applied to every replica, so throughput is bounded by what one node can absorb; and it does not relieve storage, because every node still stores everything.*

*Sharding, or horizontal partitioning, divides the data across nodes so each holds a subset. It gives you write scaling, since writes distribute across shards, which is the thing replication cannot do; storage beyond one machine; and a smaller working set per node. What it does not give you is availability, and this is the crucial point: losing a shard loses that portion of the data entirely, so an unreplicated sharded cluster is less available than a single node, because there are N times as many machines whose failure takes data with them. Sharding adds a failure mode rather than removing one.*

*So the fundamental difference is that replication copies and sharding divides: replication gives every node N copies of everything, sharding gives every node one Nth of everything. They solve disjoint problems, which is why the rule is replicate for availability and reads, shard for writes and capacity, and since those are different problems you almost always need both.*

*Replication's failure modes are replication lag, which produces stale reads and read-your-writes violations where a user writes and is then routed to a replica that has not caught up, mitigated by routing reads to the primary for a period or by session-consistent routing; split brain, where a partition leaves two nodes both believing they are primary so both accept writes and the data diverges, defended against by quorum-based leader election and by fencing tokens so storage rejects writes from a deposed leader; failover data loss under asynchronous replication, where a dying primary may have acknowledged writes that reached no replica; and replica overload, since replicas serve reads and apply the full write stream, so a write-heavy primary increases lag and makes stale reads worse.*

*Sharding's failure modes are hotspots, where an uneven key distribution sends a disproportionate share of data or traffic to one shard while the rest idle, with monotonically increasing keys the classic cause under range sharding; cross-shard queries, where anything not filtered by the shard key becomes a scatter-gather whose latency is the tail latency of the slowest shard, and where an ordered query with a limit needs that many rows from every shard before merging; cross-shard transactions, which need two-phase commit or consensus and are usually avoided by construction through shard key choice; resharding, where changing the shard count means moving data and naive hash modulo N remaps almost every key, which is why consistent hashing and automatic range splitting exist; and lost global guarantees, meaning no global secondary indexes, no global auto-increment, no global ordering, and uniqueness only within a shard.*

*Enterprise architectures combine them by sharding first and then replicating each shard, so each shard is a replication group holding one slice of the data with two or three copies. A nine-node cluster is typically three shards of three replicas, which gives write scaling from the sharding because three shards accept writes in parallel, availability from the replication because losing a node costs one replica of one shard, and read scaling from both. MongoDB does this with shards that are replica sets, Cassandra with token ranges and a replication factor where every node is both a shard owner and a replica for other ranges, CockroachDB and TiDB by splitting the key space into ranges each replicated by Raft so the two mechanisms become one, Elasticsearch with primary and replica shards, and Vitess with MySQL shards each having replicas. The shape to quote is three replicas per shard and as many shards as throughput and capacity require, with the replica count a durability decision and the shard count a throughput decision, chosen independently."*
