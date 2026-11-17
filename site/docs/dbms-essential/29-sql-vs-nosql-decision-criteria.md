---
id: 29-sql-vs-nosql-decision-criteria
title: "SQL vs. NoSQL: Architectural Decision Criteria"
description: "A choice about data shape rather than scale, and the theorem that says what you give up when the network breaks"

sidebar_position: 29
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "When would you choose a NoSQL database over a relational (SQL) database, and vice-versa? How do the CAP and PACELC theorems guide this choice, and what are Distributed SQL (NewSQL) systems?"

---

### Picture it

Two ways of keeping records for a business.

**A set of ledgers that cross-reference each other.** Customers in one, orders in another, products in a third, and the orders refer to the others by number. Nothing is written twice, the bookkeeper refuses any entry that breaks the rules, and you can ask any question you like afterwards, including ones nobody anticipated. The price is that answering a question often means opening three ledgers at once, and all the ledgers have to be **on the same desk** for that to work.

**A folder per customer, holding everything about them.** Their details, their orders, the addresses they used. Fetching a customer's history is one folder off one shelf, and the shelves can be in different buildings because no folder needs any other. The price is that the product's name is written inside every folder that ever ordered it, so a rename means visiting a lot of folders, and "how many customers bought this product" means opening every folder in every building.

Here is the thing people get wrong. They assume the folders were chosen **because the business got big**. Sometimes, historically, that was true: one desk could only hold so many ledgers. But the real question has always been **what shape the questions are**. If every question is "tell me everything about one customer", folders win regardless of size. If questions arrive in shapes nobody predicted and cut across everything, ledgers win regardless of size.

**And the bit about the network.** Suppose the buildings lose contact. A clerk in building B is asked for a record that was just changed in building A. There are exactly two honest options: **refuse to answer** until contact is restored, or **answer with what you have** and accept it may be out of date. There is no third option where you give the right answer anyway. That is the whole theorem, and it only applies **while contact is lost**.

Which exposes the deeper point. Buildings rarely lose contact. But **every single day**, a clerk who wants to be certain must telephone the other buildings and wait. So the choice you actually make a thousand times an hour is not availability against correctness, it is **waiting against correctness**. That is the part the famous theorem leaves out.

---

### The proper terms

#### When to choose relational

**The data is genuinely relational, and queries cross entities.** If the valuable questions join customers to orders to products, a system built for joins is the right tool, and one without them pushes the join into your application code where it will be slower and buggier.

**You need ACID transactions across multiple entities.** Anything touching money, inventory, bookings or identity has invariants spanning rows and tables. A relational engine makes those guarantees **structural**; without them, correctness becomes a property of your code rather than of your data.

**You want the database to enforce integrity.** Foreign keys, unique constraints and check constraints are declarative and cannot be bypassed by a new service written next year by someone who has not read your documentation.

**Query patterns are unknown or will change.** This is the strongest practical argument. SQL is **ad hoc**: a new question is a new query. Most NoSQL stores require modelling **for the access pattern**, so an unanticipated question means a migration, a new index, or a full scan.

**The schema is reasonably stable and should be enforced.** "Schemaless" does not remove the schema, it moves it into application code, where several versions of it coexist and nothing validates any of them.

#### When to choose NoSQL

**Horizontal write scale beyond what one node can take.** This was the historic reason and is now the weakest, because Distributed SQL exists, but it is still real for extreme write volumes.

**The access pattern is known, simple and key-based.** If 99 percent of traffic is "get this item by key", a key-value or document store gives you that in one operation with predictable latency.

**The data is genuinely document-shaped or hierarchical.** A nested structure read and written as a unit, where **embedding** it avoids five joins, fits a document model honestly rather than as a workaround.

**The data really is schema-variable.** Sparse, heterogeneous records, user-defined fields, or event payloads that differ per type.

**The workload matches a specialised engine.** This is the most defensible modern reason, because the win comes from the data structure rather than from avoiding SQL:

**Graph databases** such as Neo4j, for deep multi-hop traversals that become unbounded self-joins in SQL.

**Time-series databases** such as InfluxDB and TimescaleDB, for append-heavy timestamped data with downsampling.

**Search engines** such as Elasticsearch, for full-text relevance ranking.

**Wide-column stores** such as Cassandra, for enormous write throughput with tunable consistency.

**Key-value stores** such as Redis and DynamoDB, for caching and single-digit-millisecond lookups.

**Eventual consistency is acceptable for the use case.** A view counter, a feed, a recommendation list. It is not acceptable for a bank balance.

The honest summary to state: **choose by data shape and access pattern, not by expected scale.** Scale stopped being a reason the moment Distributed SQL became production-ready.

#### CAP

The **CAP theorem** states that a distributed data store cannot simultaneously guarantee all three of:

**Consistency**, meaning **linearizability**: every read sees the most recent completed write, as though there were a single copy.

**Availability**: every request to a non-failed node receives a non-error response.

**Partition tolerance**: the system continues to operate despite messages between nodes being lost or delayed.

Three clarifications matter more than the statement itself, and reciting them is what distinguishes a good answer.

**It is not "pick two of three".** Network partitions are a fact of the physical world, not a design option. Any real distributed system must tolerate partitions, so the actual choice is **CP or AP**: during a partition, do you sacrifice availability or consistency?

**It only applies during a partition.** When the network is healthy a system can provide both consistency and availability. CAP says nothing about normal operation, which is almost all of the time.

**"CA" is not a meaningful category.** It describes a single-node system, or a cluster that simply stops when partitioned, which is CP with extra steps.

So the real content is: **when a partition happens, a node receiving a request either answers with possibly stale data (AP) or refuses to answer (CP).**

**CP systems**: HBase, Zookeeper, etcd, Spanner, MongoDB with majority concerns. They refuse rather than risk divergence, which is right for configuration, coordination and money.

**AP systems**: Cassandra, DynamoDB in its default mode, Riak. They keep serving and reconcile afterwards, which is right for feeds, carts and counters.

#### PACELC

**PACELC**, from Daniel Abadi in 2012, exists because CAP describes an **exceptional** condition while ignoring the one that applies constantly.

The formulation:

```text
if (P)artition  -> choose (A)vailability or (C)onsistency
else (E)         -> choose (L)atency      or (C)onsistency
```

The **ELC** half is the contribution. Even with a perfectly healthy network, a system that guarantees consistency must coordinate: contact a quorum, wait for a consensus round, perhaps cross a continent. That coordination is **latency**, paid on every single request. A system willing to serve from one replica is faster and may be stale.

So the trade you make a billion times a day is **latency versus consistency**, and the one you make during a rare partition is availability versus consistency. CAP describes the rare case; PACELC describes both.

The classifications:

**PC/EC**: consistent in both conditions, paying latency always. Spanner, etcd, Zookeeper, VoltDB.

**PA/EL**: available under partition and low-latency otherwise, eventually consistent. Cassandra, DynamoDB, Riak.

**PC/EL**: consistent under partition, but favouring latency when healthy. MongoDB is usually classified here.

**PA/EC** is rare and somewhat incoherent in practice.

PACELC is the better framework for interviews precisely because it describes the everyday decision. When someone asks "why is this database slower", the answer is very often that it chose C in the E clause.

#### Distributed SQL, or NewSQL

**Distributed SQL** systems provide **SQL**, **ACID transactions** and horizontal scalability at once, which the earlier generation treated as mutually exclusive. The main examples are **Spanner**, **CockroachDB**, **TiDB** and **YugabyteDB**, with Vitess taking a different approach.

How they do it:

**Range-based sharding.** The key space is split into ranges, each assigned to a group of nodes, and ranges split and rebalance automatically as data grows.

**Consensus replication per range.** Each range is replicated by **Raft** or **Paxos**, so a majority must acknowledge a write. This gives linearizable reads and writes within a range and automatic failover without losing committed data.

**Distributed transactions.** A transaction spanning ranges uses **two-phase commit** layered over the consensus groups, so the coordinator's own state is itself replicated and a coordinator failure does not strand the transaction, which is what made classical 2PC unusable.

**Spanner adds TrueTime**, a clock service using GPS and atomic clocks with **bounded uncertainty**, which lets it provide **external consistency**: transactions are globally ordered by real time. CockroachDB achieves serializability without special hardware, using hybrid logical clocks, and accepts slightly weaker guarantees as a result.

The costs, which should be stated rather than glossed over:

**Higher write latency.** A commit requires a consensus round trip, and across regions that is tens of milliseconds, which a single-node database would do in under one.

**Latency is sensitive to data placement.** A transaction spanning ranges in different regions pays the distance, so schema and partitioning design determines performance in a way it does not on one node.

**Operational and financial cost.** More nodes, more moving parts, more to understand.

What this means for the question: **scale alone is no longer a reason to leave relational databases.** So the modern framing is that you choose NoSQL for **data shape, access pattern, or a specialised engine's data structure**, and you choose Distributed SQL when you need relational guarantees at a scale one machine cannot serve.

And the increasingly common honest answer: **use both.** A relational system as the source of truth for transactional data, with Redis for caching, Elasticsearch for search and a time-series store for metrics, each chosen for the job it is actually good at.

---

### In code

```text
What each model is good at, in the shape of a query:

  RELATIONAL, built for questions that cross entities
    SELECT c.name, p.name, SUM(oi.qty)
    FROM   customers c
    JOIN   orders o      ON o.customer_id = c.id
    JOIN   order_items oi ON oi.order_id   = o.id
    JOIN   products p     ON p.id          = oi.product_id
    WHERE  o.placed_at > '2025-01-01'
    GROUP BY c.name, p.name;
    -> one query, written today, for a question nobody planned for

  DOCUMENT, built for "everything about one thing"
    db.customers.findOne({ _id: 42 })
    -> one read, one shard, predictable latency
       customer, orders and addresses all embedded

    but: "how many customers bought product A12" scans every
         document in every shard, because the data was modelled
         for a different question
```

```text
CAP: what actually happens when the network breaks

  normal operation (almost all of the time)
      both consistency and availability are achievable
      -> CAP says NOTHING about this case

  during a partition, node B receives a read for a key just
  written on node A:

      CP: refuse to answer                 (error or timeout)
          "I cannot be sure, so I will not guess"
          -> HBase, Zookeeper, etcd, Spanner, MongoDB w: majority
          -> right for configuration, coordination, money

      AP: answer with what it has          (possibly stale)
          "here is my copy; we will reconcile later"
          -> Cassandra, DynamoDB (default), Riak
          -> right for feeds, carts, counters

  there is no third option that returns the correct value anyway.

  "pick two of three" is wrong: partitions are a fact, not a choice,
  so every real distributed system is CP or AP. "CA" describes a
  single node, or a cluster that stops when partitioned, which is
  CP with extra steps.
```

```text
PACELC: the trade you make every single request

  if (P)artition  ->  (A)vailability  or  (C)onsistency      rare
  else (E)        ->  (L)atency       or  (C)onsistency      constant

  why the E clause exists: even with a perfect network, guaranteeing
  consistency means COORDINATING. Contact a quorum. Wait for a Raft
  round. Possibly cross a continent. That is latency, paid on every
  request, not just during failures.

    PC/EC   consistent always, pays latency always
            Spanner, etcd, Zookeeper, VoltDB

    PA/EL   available under partition, fast otherwise, eventually
            consistent
            Cassandra, DynamoDB, Riak

    PC/EL   consistent under partition, favours latency when healthy
            MongoDB

    PA/EC   rare, and fairly incoherent in practice

  "Why is this database slow?" very often means: it chose C in the
  E clause.
```

```text
Distributed SQL: how SQL + ACID + horizontal scale became possible

  1. RANGE SHARDING
        key space split into ranges; ranges split and rebalance
        automatically as data grows

        [ a - f ] [ g - m ] [ n - s ] [ t - z ]
            |         |         |         |
        each range assigned to a group of nodes

  2. CONSENSUS PER RANGE (Raft / Paxos)
        range [g-m] replicated on 3 nodes
        a write needs a MAJORITY to acknowledge
        -> linearizable within the range
        -> automatic failover with no committed data lost

  3. DISTRIBUTED TRANSACTIONS
        a transaction spanning [a-f] and [n-s] uses two-phase commit
        OVER the consensus groups, so the coordinator's own state is
        replicated too
        -> a coordinator crash no longer strands the transaction,
           which is what made classical 2PC unusable

  4. SPANNER ADDS TRUETIME
        GPS + atomic clocks giving BOUNDED time uncertainty
        -> external consistency: transactions globally ordered by
           real time
        CockroachDB uses hybrid logical clocks instead: serializable
        without special hardware, slightly weaker guarantees

  the bill:
        a commit costs a consensus round trip (tens of ms across
        regions, against under 1 ms on one node)
        latency depends on DATA PLACEMENT, so partitioning design
        determines performance
        more nodes, more operational and financial cost
```

```text
The decision, as it should actually be made:

  does the question cross entities, and do invariants span rows?
      -> relational

  do you need that at a scale one machine cannot serve?
      -> Distributed SQL (Spanner, CockroachDB, TiDB, YugabyteDB)
      -> NOT "therefore NoSQL" any more

  is almost all traffic "fetch one thing by key", with a known
  access pattern?
      -> key-value or document

  is the win coming from a DATA STRUCTURE rather than from avoiding
  SQL?  (deep traversals, full-text relevance, time-series rollups,
  enormous write throughput)
      -> graph / search / time-series / wide-column

  and the usual real answer: BOTH. Relational as the source of truth,
  plus Redis for cache, Elasticsearch for search, a time-series store
  for metrics. Each chosen for what it is genuinely good at.
```

---

### What they ask next

**"Why is 'pick two of three' wrong?"**
Because partition tolerance is not a property you choose. Networks drop and delay messages, so any system spanning machines must cope with it. The genuine choice is what to do **during** a partition, which makes it CP or AP, and "CA" is just a single-node system.

**"Does a CP system mean the whole database goes down in a partition?"**
No. Only the nodes that cannot reach a quorum stop serving the affected data. A majority partition continues normally, which is why consensus systems are deployed in odd numbers across failure domains.

**"What does PACELC add that CAP does not?"**
The everyday case. CAP only describes behaviour during a partition, which is rare, while PACELC also covers the healthy state, where the trade is **latency versus consistency**, paid on every request because consistency requires coordination. That is the trade that actually shapes how a system feels.

**"Is NoSQL faster than SQL?"**
Not inherently. It is faster at the operations it was designed for, usually a key-based read of a pre-joined document, because the work was done at write time instead. For an unanticipated analytical question it is often far slower, since nothing was modelled for it.

**"Does schemaless mean no schema?"**
No. It means the schema is **not enforced by the database**, so it lives in application code, with several versions coexisting in the same collection and nothing validating any of them. Documents written two years ago by an older deployment are still there, and your code has to handle them.

**"When is Distributed SQL the wrong choice?"**
When one node is enough, which is more often than people assume, since a modern server handles very large workloads. You pay consensus latency on every commit and considerable operational complexity, so adopting it without needing the scale is paying for insurance against a risk you do not have.

**"How do you pick in an interview design question?"**
State the access patterns first, then the consistency requirements, then the scale, and let the choice fall out of those. Naming a database before describing the workload is the mistake interviewers are listening for.

**The common wrong answer** is "SQL for structured data, NoSQL for unstructured, NoSQL to scale". Scale is no longer a differentiator now that Distributed SQL exists, and most so-called unstructured data is perfectly structured, merely nested. The real axes are **data shape**, **access pattern**, **consistency requirement**, and whether a specialised data structure gives you something a B+ tree cannot.

---

### Say this in the interview

*"I would choose relational when the data is genuinely relational and the valuable questions cross entities, because a system built for joins is the right tool and one without them pushes the join into application code; when I need ACID transactions across multiple entities, as anything touching money, inventory or bookings does, so the invariants are structural rather than a property of my code; when I want the database to enforce integrity declaratively with foreign keys and constraints that a service written next year cannot bypass; and above all when query patterns are unknown or will change, because SQL is ad hoc and a new question is just a new query, whereas most NoSQL stores are modelled for the access pattern so an unanticipated question means a migration or a full scan.*

*I would choose NoSQL for horizontal write scale beyond one node, which was the historic reason and is now the weakest; when the access pattern is known, simple and key-based, so a key-value or document store answers in one operation; when the data is genuinely document-shaped and embedding it avoids five joins; when it really is schema-variable; and most defensibly when the workload matches a specialised engine, so graph databases for deep multi-hop traversals that would be unbounded self-joins, time-series stores for append-heavy timestamped data, search engines for full-text relevance, wide-column stores for enormous write throughput, and key-value stores for caching. The summary is to choose by data shape and access pattern rather than by expected scale.*

*The CAP theorem says a distributed store cannot simultaneously guarantee consistency meaning linearizability, availability meaning every request to a live node gets a non-error response, and partition tolerance. Three clarifications matter more than the statement. It is not pick two of three, because partitions are a fact of the physical world rather than a design option, so every real distributed system is CP or AP. It only applies during a partition, and says nothing about normal operation, which is almost all the time. And CA is not a meaningful category, since it describes a single node or a cluster that stops when partitioned, which is CP with extra steps. So the real content is that during a partition a node either answers with possibly stale data, which is AP, or refuses to answer, which is CP. HBase, Zookeeper, etcd and Spanner are CP, and Cassandra, DynamoDB by default and Riak are AP.*

*PACELC, from Abadi in 2012, exists because CAP describes an exceptional condition and ignores the constant one. If there is a partition, choose availability or consistency; else, choose latency or consistency. The ELC half is the contribution: even on a perfect network, guaranteeing consistency means coordinating, contacting a quorum or waiting for a consensus round and possibly crossing a continent, and that latency is paid on every request. So the trade you make a billion times a day is latency versus consistency. Spanner and etcd are PC/EC, consistent always and paying latency always; Cassandra and DynamoDB are PA/EL; MongoDB is usually classified PC/EL. It is the better interview framework because when someone asks why a database is slow, the answer is very often that it chose C in the E clause.*

*Distributed SQL, or NewSQL, provides SQL, ACID transactions and horizontal scale at once, which the previous generation treated as mutually exclusive. Spanner, CockroachDB, TiDB and YugabyteDB are the main examples. They shard the key space into ranges that split and rebalance automatically, replicate each range with Raft or Paxos so a write needs a majority, which gives linearizability within a range and automatic failover without losing committed data, and handle cross-range transactions with two-phase commit layered over those consensus groups, so the coordinator's own state is replicated and a coordinator crash no longer strands the transaction, which is what made classical 2PC unusable. Spanner adds TrueTime, GPS and atomic clocks with bounded uncertainty, giving external consistency where transactions are globally ordered by real time, while CockroachDB uses hybrid logical clocks to get serializability without special hardware. The bill is higher write latency, since a commit costs a consensus round trip of tens of milliseconds across regions against under one on a single node, sensitivity to data placement so partitioning design determines performance, and real operational and financial cost.*

*So the modern conclusion is that scale alone is no longer a reason to leave relational databases. You pick NoSQL for data shape, access pattern or a specialised data structure, and Distributed SQL when you need relational guarantees beyond one machine. And the honest answer in most real systems is both: relational as the source of truth, with Redis for caching, Elasticsearch for search and a time-series store for metrics."*
