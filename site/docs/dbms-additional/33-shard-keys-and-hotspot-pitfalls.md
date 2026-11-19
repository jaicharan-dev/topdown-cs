---
id: 33-shard-keys-and-hotspot-pitfalls
title: "Shard Keys & Hotspot Pitfalls"
description: "The one field that decides whether ten machines share the work or nine of them watch, and why an ever-increasing key sends every write to the same place"

sidebar_position: 33
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is a shard key, what makes a disastrous shard key in a distributed database, and why are monotonically increasing keys lethal? How does consistent hashing with virtual nodes resolve re-sharding storms?"

---

### Picture it

Ten counters, and a rule deciding which counter each customer goes to.

**The rule is the entire design.** Everything else about the system is identical whatever you choose; the rule alone decides whether all ten counters are busy or whether nine stand idle.

**Choose "by first letter of surname"** and it works reasonably, because surnames spread out.

**Choose "by whether they are a member"** and you have **two** counters in use for ever, however many you build.

**Choose "by country"** and one counter takes eighty percent of the queue, because that is where most of your customers are.

**And now the one that looks sensible and is the worst of all.**

**Choose "by ticket number, in order"**, with counter one taking tickets 1 to 1000, counter two taking 1001 to 2000, and so on. Perfectly even, in the sense that each counter owns the same **range**.

Except that tickets are issued **in order**, and the only people arriving right now are the ones holding the **newest** tickets. So **every single arrival goes to the last counter**. The other nine hold historical customers who have already been served and will never come back. You have built ten counters and formed **one queue**, and the moment that counter fills up you add counter eleven, which immediately becomes the only busy one.

The appalling part is that nothing looks wrong. The data is **evenly distributed**. The counters are **evenly loaded on paper**. And all the work is in one place.

**Finally, the problem with changing the rule.**

If the rule is "ticket number modulo ten", then adding an eleventh counter changes it to "modulo eleven", and **almost every customer's counter changes**. Every counter must simultaneously hand most of its files to a different one, the corridors jam, and for hours nobody can be served.

The fix is a rule where adding a counter **only moves the customers it takes over**, and where a new counter takes **a small slice from every existing counter** rather than the whole load of its neighbour.

---

### The proper terms

#### What a shard key is

The **shard key**, also called the partition key, is the field or set of fields whose value determines **which shard a row lives on**.

It is **the single most consequential decision** in a sharded design, for three reasons:

**It decides data distribution**, and therefore whether storage is balanced.

**It decides traffic distribution**, and therefore whether load is balanced. These are **not the same thing**, and conflating them is the root of most hotspot problems.

**It decides which queries are single-shard** and which become scatter-gather, which shapes the entire query layer.

It is also normally **immutable**, because changing a row's shard key means physically moving it between shards, which most systems either forbid outright or make expensive.

#### What makes a good one

**High cardinality.** Enough distinct values to spread across far more shards than you have, now and later.

**Even distribution of data**, so no shard holds disproportionately more rows.

**Even distribution of traffic**, which is separate: a key can distribute data perfectly and still send most requests to one shard.

**Alignment with the query pattern**, so the majority of queries filter on it and stay on one shard.

**Immutability**, since a changing key means moving data.

#### What makes a disastrous one

**Low cardinality.** A boolean, a status with three values, a plan tier. If the key has five distinct values, **at most five shards can ever hold data**, so the cluster cannot grow past five regardless of how many machines you add. This is a hard ceiling, not a performance issue.

**Uneven distribution.** A country code where eighty percent of users are in one country, a `tenant_id` in a system with one enormous customer, a category where one value dominates. One shard holds most of the data and most of the load.

**A hot key.** A celebrity user, a default tenant, a null placeholder that thousands of rows share. This one is worth distinguishing carefully: **hashing fixes the distribution of keys, not the traffic to a single key.** All requests for one key go to one shard no matter how good the hash is, so a single very popular key is a hotspot that sharding cannot solve. The answers are caching, read replicas for that shard, or splitting that entity's data deliberately.

**A key absent from most queries.** If queries filter on `email` and you sharded on `user_id`, every lookup becomes a **scatter-gather** across all shards, so you have the operational cost of sharding with none of the benefit.

**A mutable key**, which forces moves.

#### Why monotonically increasing keys are lethal

This is the one the question singles out, and it deserves the precision.

A **monotonically increasing** key is one whose values only ever go up: a timestamp, an auto-increment id, a **UUIDv1** or UUIDv7, a Snowflake id.

**Under range-based sharding** the consequences are severe:

Ranges are assigned so that **one shard owns the highest range**.

New rows always have the **highest key**, by definition.

Therefore **every single insert goes to that one shard**.

So:

**Write throughput is that of one node**, regardless of cluster size. You bought ten machines and are writing to one. This is the canonical "we sharded and write throughput did not improve" story.

**The other shards are idle for writes**, holding historical data nobody inserts into.

**That shard splits constantly**, because it keeps exceeding the size threshold, which triggers **continuous rebalancing** and moves data while the system is already under load.

**Adding a shard does not help**: the new shard takes the top range and immediately becomes the sole hotspot.

Two qualifications that a complete answer includes:

**Under hash sharding, monotonic keys are fine for distribution.** The hash scatters sequential values across the key space, so writes spread evenly. **But you lose range queries entirely**: "give me the last hour of events" no longer maps to one shard and becomes a scatter-gather across all of them. That is the real trade, and it is why the choice is not simply "always hash".

**The same problem appears inside a single node**, as index page contention: every insert goes to the rightmost leaf of the B+ tree, so that page and its latch become the bottleneck. It is the same phenomenon at a smaller scale, which is why monotonic primary keys are a known contention point even without sharding.

The mitigations, in order of preference:

**Hash the key**, if range queries are not required.

**Salt it with a bucket prefix.** Make the shard key `(hash(id) % 16, timestamp)`. Writes spread across sixteen buckets, and a range query becomes sixteen bounded range scans rather than a full scatter-gather. This is the standard compromise and it is worth being able to describe.

**Use a compound key with a high-cardinality prefix**, such as `(tenant_id, timestamp)`, which keeps a tenant's data together while spreading writes across tenants.

**Reverse the bits or digits** of the sequential part, which scatters it while preserving uniqueness. Cruder, but used in practice.

#### Resharding storms

The naive scheme is `shard = hash(key) % N`.

When `N` changes, **almost every key maps to a different shard**. Going from ten shards to eleven moves roughly ninety percent of all data.

The result is a **resharding storm**:

**Every node must simultaneously send most of its data elsewhere**, saturating network and disk.

**Latency spikes** across the whole cluster while it happens.

**It can take days** on a large dataset, during which the system is degraded and the operation is difficult to abort safely.

**And the same happens on every scaling event**, which effectively means you stop scaling.

#### Consistent hashing with virtual nodes

**Consistent hashing** hashes **both nodes and keys** into the same space, visualised as a **ring**. A key belongs to the **first node clockwise** from its position.

The property that matters: adding or removing a node **only affects the keys between that node and its predecessor**. On average `K/N` keys move, and everything else stays where it is. Going from ten shards to eleven moves about nine percent of the data rather than ninety.

**Virtual nodes** then fix the two remaining problems, and being able to name **both** is what distinguishes a thorough answer.

**Problem one: uneven distribution.** With each node at a single ring position, the arcs between them are random and therefore uneven; one node can own three times its share by chance. Placing each physical node at many positions, typically a few hundred, makes the shares **even by averaging** rather than by luck.

**Problem two: concentrated rebalancing.** With single positions, a new node takes its **entire** range from **one** neighbour, so that neighbour must ship a large block of data and is heavily loaded during the move, while a **failing** node dumps its whole range onto its single successor, potentially doubling that node's load and causing a cascade.

With virtual nodes, a new node takes **a small slice from many existing nodes**, so the transfer is spread across the cluster and no single node is saturated. A failed node's ranges are distributed across all survivors, so nobody doubles.

Two further benefits worth mentioning:

**Heterogeneous hardware** is handled naturally: give a machine with twice the capacity twice the virtual nodes.

**Rebuild parallelism**: a failed node's data is restored from many peers at once rather than from one.

Used by **Cassandra**, through `num_tokens`, **DynamoDB**, **Riak**, memcached client libraries, and Envoy's ring-hash load balancer.

#### The modern alternative

Worth knowing, because many current systems do not use consistent hashing at all:

**Range-based sharding with automatic splitting and rebalancing.** The key space is divided into **ranges**; a range **splits** when it exceeds a size or load threshold, and a **balancer** moves ranges between nodes to even things out.

This keeps **range queries local**, which hashing destroys, and it avoids the storm because rebalancing is incremental and continuous rather than a single mass remapping. The cost is a metadata or placement layer that tracks which node owns which range, which is itself a distributed systems problem.

**CockroachDB, TiDB, HBase and Spanner** all work this way, which is why they can offer ordered scans that a Dynamo-style store cannot.

---

### In code

```text
THE SHARD KEY is the field whose value decides WHICH SHARD a row
lives on, and it is the single most consequential decision in a
sharded design, because it decides THREE separate things:

  DATA DISTRIBUTION     whether storage is balanced
  TRAFFIC DISTRIBUTION  whether LOAD is balanced
  QUERY LOCALITY        which queries are single-shard and which
                        become scatter-gather

  THE FIRST TWO ARE NOT THE SAME THING, and conflating them is the
  root of most hotspot problems.

  it is also normally IMMUTABLE, because changing it means
  PHYSICALLY MOVING the row between shards.
```

```text
GOOD                          DISASTROUS
  high cardinality              LOW CARDINALITY
                                  a boolean, a 3-value status
                                  -> if the key has 5 distinct
                                     values, AT MOST 5 SHARDS CAN
                                     EVER HOLD DATA.
                                     A HARD CEILING, not a
                                     performance issue.

  even DATA distribution        UNEVEN DISTRIBUTION
                                  country code with 80% in one
                                  country; tenant_id with one
                                  enormous customer

  even TRAFFIC distribution     A HOT KEY
                                  a celebrity user, a default
                                  tenant, a null placeholder
                                  -> HASHING FIXES THE DISTRIBUTION
                                     OF KEYS, NOT THE TRAFFIC TO A
                                     SINGLE KEY.
                                     all requests for one key go to
                                     one shard however good the
                                     hash. The answers are caching,
                                     read replicas for that shard,
                                     or splitting that entity's
                                     data deliberately.

  matches the query pattern     ABSENT FROM MOST QUERIES
                                  shard on user_id, query by email
                                  -> EVERY lookup is a
                                     scatter-gather: the
                                     operational cost of sharding
                                     with NONE of the benefit

  immutable                     MUTABLE: forces moves
```

```text
WHY MONOTONICALLY INCREASING KEYS ARE LETHAL

  monotonic = values only ever go UP:
     a timestamp, an auto-increment id, UUIDv1, UUIDv7, a Snowflake id

  UNDER RANGE-BASED SHARDING:

     shard 1: ids 1 - 1,000,000          [ historical, idle ]
     shard 2: ids 1,000,001 - 2,000,000  [ historical, idle ]
     shard 3: ids 2,000,001 - 3,000,000  [ historical, idle ]
     shard 4: ids 3,000,001 - MAX        [ ALL WRITES, ALL THE TIME ]
                                              ^^^^^^^^^^^^^^^^^^^^
     new rows ALWAYS have the HIGHEST key, BY DEFINITION, so EVERY
     SINGLE INSERT GOES TO ONE SHARD.

  the consequences:

     WRITE THROUGHPUT IS THAT OF ONE NODE, regardless of cluster
        size. You bought ten machines and are writing to one.
        THE CANONICAL "we sharded and write throughput did not
        improve" STORY.
     THE OTHER SHARDS ARE IDLE FOR WRITES, holding historical data
        nobody inserts into.
     THAT SHARD SPLITS CONSTANTLY, exceeding its size threshold and
        triggering CONTINUOUS REBALANCING while already overloaded.
     ADDING A SHARD DOES NOT HELP: the new shard takes the top range
        and IMMEDIATELY BECOMES THE SOLE HOTSPOT.

  and the appalling part: NOTHING LOOKS WRONG. The data is evenly
  distributed. The shards are evenly sized. All the work is in one
  place.
```

```text
TWO QUALIFICATIONS a complete answer includes:

  UNDER HASH SHARDING, MONOTONIC KEYS ARE FINE FOR DISTRIBUTION.
     the hash scatters sequential values across the key space, so
     writes spread evenly.
     BUT YOU LOSE RANGE QUERIES ENTIRELY: "the last hour of events"
     no longer maps to one shard and becomes a scatter-gather
     across all of them.
     THAT is the real trade, and why the answer is not simply
     "always hash".

  THE SAME PROBLEM APPEARS INSIDE A SINGLE NODE, as INDEX PAGE
  CONTENTION: every insert goes to the RIGHTMOST LEAF of the B+
  tree, so that page and its latch become the bottleneck.
     the same phenomenon at a smaller scale, which is why monotonic
     primary keys are a known contention point even WITHOUT
     sharding.
```

```sql
-- MITIGATIONS, in order of preference

-- 1. HASH THE KEY, if range queries are not required
shard = hash(event_id) % N

-- 2. SALT IT WITH A BUCKET PREFIX: the standard compromise
shard_key = (hash(id) % 16, timestamp)
--   writes spread across SIXTEEN buckets
--   a range query becomes SIXTEEN BOUNDED RANGE SCANS rather than
--   a full scatter-gather:
SELECT * FROM events
WHERE  bucket IN (0,1,2,...,15)          -- 16 bounded scans
  AND  timestamp BETWEEN ? AND ?;

-- 3. A COMPOUND KEY WITH A HIGH-CARDINALITY PREFIX
shard_key = (tenant_id, timestamp)
--   keeps a tenant's data together while spreading writes across
--   tenants

-- 4. REVERSE THE BITS OR DIGITS of the sequential part
--   scatters it while preserving uniqueness. Cruder, and used in
--   practice (HBase's "salted rowkey" advice).
```

```text
RESHARDING STORMS: why naive hashing cannot be scaled

  shard = hash(key) % N

  N = 10 -> N = 11:

     key 1007   1007 % 10 = 7   ->  1007 % 11 = 5    MOVED
     key 1008   1008 % 10 = 8   ->  1008 % 11 = 6    MOVED
     key 1009   1009 % 10 = 9   ->  1009 % 11 = 7    MOVED
     key 1010   1010 % 10 = 0   ->  1010 % 11 = 8    MOVED
     ...
     ROUGHLY 90% OF ALL DATA MOVES.

  the result is a RESHARDING STORM:
     EVERY NODE simultaneously sends most of its data elsewhere,
        saturating network and disk
     LATENCY SPIKES across the whole cluster while it happens
     IT CAN TAKE DAYS on a large dataset, during which the system
        is degraded and the operation is hard to abort safely
     AND THE SAME HAPPENS ON EVERY SCALING EVENT, which
        effectively means YOU STOP SCALING
```

```text
CONSISTENT HASHING: hash BOTH nodes and keys onto a RING

            0 ------------- N1 --------- k1 --- N2 ------+
            |                                            |
            +--- N4 --- k3 ------- N3 ------ k2 ---------+

  a key belongs to THE FIRST NODE CLOCKWISE.
     k1 -> N2,  k2 -> N4,  k3 -> N3

  THE PROPERTY THAT MATTERS: adding or removing a node affects ONLY
  THE KEYS BETWEEN THAT NODE AND ITS PREDECESSOR.
     on average K/N keys move, and EVERYTHING ELSE STAYS PUT.
     ten shards to eleven moves about 9% of the data, not 90%.
```

```text
VIRTUAL NODES fix the TWO REMAINING PROBLEMS, and naming BOTH is
what distinguishes a thorough answer:

  PROBLEM 1: UNEVEN DISTRIBUTION
     with each node at a SINGLE ring position, the arcs between
     them are random and therefore UNEVEN. One node can own three
     times its share BY CHANCE.

     FIX: place each physical node at MANY positions, typically a
     few hundred, so the shares are EVEN BY AVERAGING rather than
     by luck.

         N1 N3 N2 N1 N4 N2 N3 N1 N4 N2 N3 N4 ...   (around the ring)

  PROBLEM 2: CONCENTRATED REBALANCING
     with single positions:
        a NEW node takes its ENTIRE range from ONE NEIGHBOUR, so
        that neighbour ships a large block and is heavily loaded
        during the move
        a FAILING node dumps its WHOLE range onto its single
        successor, POTENTIALLY DOUBLING that node's load and
        causing a CASCADE

     FIX: with virtual nodes a new node takes A SMALL SLICE FROM
     MANY EXISTING NODES, so the transfer is spread across the
     cluster and nobody is saturated; and a failed node's ranges
     are DISTRIBUTED ACROSS ALL SURVIVORS, so nobody doubles.

  two further benefits:
     HETEROGENEOUS HARDWARE: give a machine with twice the capacity
        twice the virtual nodes
     REBUILD PARALLELISM: a failed node's data is restored FROM
        MANY PEERS AT ONCE rather than from one

  used by: Cassandra (num_tokens), DynamoDB, Riak, memcached client
  libraries, Envoy's ring-hash load balancer.
```

```text
THE MODERN ALTERNATIVE, which many current systems use instead:

  RANGE-BASED SHARDING WITH AUTOMATIC SPLITTING AND REBALANCING

     the key space is divided into RANGES
     a range SPLITS when it exceeds a size or load threshold
     a BALANCER moves ranges between nodes to even things out

        [a-f] [g-m] [n-s] [t-z]
                ^ too big, SPLIT
        [a-f] [g-i] [j-m] [n-s] [t-z]
                           ^ balancer moves this to a quieter node

  + RANGE QUERIES STAY LOCAL, which hashing destroys
  + NO STORM: rebalancing is INCREMENTAL AND CONTINUOUS rather than
    a single mass remapping
  - needs a METADATA OR PLACEMENT LAYER tracking which node owns
    which range, which is itself a distributed systems problem

  CockroachDB, TiDB, HBase and Spanner all work this way, which is
  why they can offer ORDERED SCANS that a Dynamo-style store cannot.
```

---

### What they ask next

**"What makes a shard key bad?"**
Low cardinality, which caps the number of usable shards permanently; uneven data distribution; uneven **traffic** distribution, which is a separate problem; absence from most queries, which makes everything a scatter-gather; and mutability, which forces data to move.

**"Why are monotonic keys lethal under range sharding?"**
Because new rows always carry the highest key, so every insert lands on the shard owning the top range. Write throughput becomes that of one node however many you have, the rest sit idle, and that shard splits continually. Adding a shard does not help, since the new one takes the top range and becomes the sole hotspot.

**"Does hashing fix it?"**
For distribution, yes: the hash scatters sequential values evenly. But it destroys range queries, so "the last hour of events" becomes a scatter-gather across every shard. That is the real trade, which is why salting with a bucket prefix is the usual compromise.

**"What is salting?"**
Prefixing the key with a small hashed bucket, so the shard key becomes something like bucket and timestamp. Writes spread across the buckets while a range query becomes a bounded scan per bucket rather than a full fan-out, which keeps most of the benefit of both.

**"Can hashing solve a hot key?"**
No, and this is worth distinguishing. Hashing distributes **keys**, not the traffic to a single key, so every request for one celebrity user still lands on one shard. The answers are caching, extra read replicas for that shard, or deliberately splitting that entity's data.

**"What is a resharding storm?"**
The consequence of `hash(key) % N`: changing N remaps almost every key, so every node must simultaneously ship most of its data elsewhere, saturating the network, spiking latency and potentially taking days, which in practice means the cluster stops being scalable.

**"How does consistent hashing help?"**
By hashing nodes and keys onto a ring and assigning each key to the first node clockwise, so adding or removing a node affects only the keys between it and its predecessor. On average `K/N` keys move rather than nearly all of them.

**"Why are virtual nodes needed on top of that?"**
For two reasons. Single ring positions give uneven arcs, so a node can own several times its share by chance, and many positions average that out. And a new node would otherwise take its whole range from one neighbour while a failing node would dump its entire load on one successor; with virtual nodes both are spread across the cluster.

**"What do systems like CockroachDB do instead?"**
Range-based sharding with automatic splitting and a rebalancer. Ranges split when too large and are moved incrementally, which preserves ordered scans and avoids the storm entirely, at the cost of a metadata layer tracking range ownership.

**The common wrong answer** is "pick a high-cardinality key and hash it". That addresses data distribution and misses the three things the question is about: **traffic** distribution is separate from data distribution and hashing does nothing for a hot key; monotonic keys are lethal specifically under **range** sharding and hashing fixes them only by **destroying range queries**; and the resharding storm is a property of **modulo** hashing that consistent hashing plus **virtual nodes** exists to solve, with the virtual nodes fixing both uneven arcs and concentrated rebalancing.

---

### Say this in the interview

*"The shard key is the field whose value determines which shard a row lives on, and it is the single most consequential decision in a sharded design, because it decides three separate things: data distribution, so whether storage is balanced; traffic distribution, so whether load is balanced; and query locality, so which queries are single-shard and which become scatter-gather. The first two are not the same thing, and conflating them is the root of most hotspot problems. It is also normally immutable, because changing it means physically moving the row between shards.*

*A good key has high cardinality, distributes both data and traffic evenly, matches the query pattern so most queries stay on one shard, and does not change. A disastrous one has low cardinality, like a boolean or a three-value status, which is a hard ceiling rather than a performance issue, because if the key has five distinct values then at most five shards can ever hold data. Or it distributes unevenly, like a country code where eighty percent of users are in one country. Or it has a hot key, like a celebrity user or a default tenant, and that one is worth distinguishing carefully, because hashing fixes the distribution of keys and not the traffic to a single key: all requests for one key go to one shard however good the hash, so the answers there are caching, extra read replicas for that shard, or deliberately splitting that entity's data. Or it is absent from most queries, so every lookup becomes a scatter-gather and you have the cost of sharding with none of the benefit.*

*Monotonically increasing keys are lethal under range-based sharding. A timestamp, an auto-increment id, UUIDv1 or v7, or a Snowflake id only ever goes up, and ranges are assigned so one shard owns the highest range, so new rows always have the highest key and every single insert goes to that one shard. The consequences are that write throughput is that of one node regardless of cluster size, which is the canonical we-sharded-and-write-throughput-did-not-improve story; the other shards are idle for writes, holding historical data; that shard splits constantly because it keeps exceeding its threshold, triggering continuous rebalancing while already overloaded; and adding a shard does not help, because the new one takes the top range and immediately becomes the sole hotspot. The appalling part is that nothing looks wrong: the data is evenly distributed and the shards are evenly sized, and all the work is in one place.*

*Two qualifications. Under hash sharding, monotonic keys are fine for distribution, because the hash scatters sequential values, but you lose range queries entirely, so the last hour of events becomes a scatter-gather across every shard, and that is the real trade. And the same problem appears inside a single node as index page contention, where every insert goes to the rightmost leaf of the B+ tree so that page and its latch become the bottleneck. The mitigations are to hash the key if range queries are not needed; to salt it with a bucket prefix so the shard key is something like hash modulo sixteen plus the timestamp, which spreads writes across sixteen buckets while a range query becomes sixteen bounded scans rather than a full fan-out, which is the standard compromise; to use a compound key with a high-cardinality prefix like tenant and timestamp; or to reverse the digits of the sequential part.*

*A resharding storm is what naive modulo hashing produces. With shard equals hash modulo N, changing N remaps almost every key, so going from ten shards to eleven moves about ninety percent of the data. Every node must simultaneously ship most of its data elsewhere, saturating network and disk, latency spikes across the cluster, it can take days on a large dataset during which the operation is hard to abort, and the same thing happens on every scaling event, which effectively means you stop scaling.*

*Consistent hashing fixes that by hashing both nodes and keys onto a ring and assigning each key to the first node clockwise, so adding or removing a node affects only the keys between that node and its predecessor, moving K over N keys on average while everything else stays put: nine percent rather than ninety. Virtual nodes then fix the two remaining problems. First, uneven distribution: with each node at a single ring position the arcs are random and therefore uneven, so a node can own three times its share by chance, and placing each physical node at a few hundred positions makes the shares even by averaging rather than luck. Second, concentrated rebalancing: with single positions a new node takes its entire range from one neighbour, which is heavily loaded during the move, and a failing node dumps its whole range onto its single successor, potentially doubling that node's load and cascading. With virtual nodes a new node takes a small slice from many existing nodes and a failed node's ranges spread across all survivors. Two further benefits are heterogeneous hardware, since you give a bigger machine more virtual nodes, and rebuild parallelism, since a failed node's data is restored from many peers at once. Cassandra, DynamoDB, Riak and Envoy's ring-hash balancer all use it.*

*And I would mention the modern alternative, since many current systems do not use consistent hashing at all: range-based sharding with automatic splitting and rebalancing, where ranges split on a size or load threshold and a balancer moves them incrementally. That keeps range queries local, which hashing destroys, and avoids the storm because rebalancing is continuous rather than a mass remapping, at the cost of a metadata layer tracking range ownership. CockroachDB, TiDB, HBase and Spanner all work this way, which is why they can offer ordered scans that a Dynamo-style store cannot."*
