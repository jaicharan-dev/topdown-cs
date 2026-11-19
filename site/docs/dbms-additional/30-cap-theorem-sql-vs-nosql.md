---
id: 30-cap-theorem-sql-vs-nosql
title: "The CAP Theorem"
description: "A proof about one moment of network failure, a third option that does not exist, and a letter that means something else in ACID"

sidebar_position: 30
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the CAP theorem? Why is 'CA' a myth in distributed systems, what is the crucial difference between Consistency in CAP and Consistency in ACID, and how does the PACELC theorem extend CAP?"

---

### Picture it

Two offices keeping the same ledger, connected by a phone line.

Normally it works. Someone records a payment in London, telephones Mumbai, and both books agree.

**Then the line goes dead.**

A customer walks into the Mumbai office and asks for their balance. The Mumbai clerk is now in a position with **exactly two options**, and no third:

**Refuse.** "I cannot reach London, so I cannot be certain this figure is current. Come back later." The answer the clerk gives is never wrong, and the customer gets no answer at all.

**Answer anyway.** "Your balance is forty thousand, as of whenever London last told me." The customer gets an answer immediately, and it may be out of date.

That is the whole theorem. **There is no third option** where the clerk gives an immediate answer that is also guaranteed current, because the information needed to guarantee it **is on the other side of a dead line**.

**And now the thing people get wrong.** They say "our offices are reliable, so we will simply choose not to have dead lines". That is not a choice. **Lines fail.** Cables are cut, routers restart, a data centre loses its uplink. You do not pick whether this happens; you only pick **what the clerk does when it does**. An office that has not decided in advance has decided by accident, badly.

**One more thing, and it is where the theorem stops being useful.**

The line goes dead perhaps twice a year. But **every single day**, a clerk who wants to be certain must **telephone London and wait**. That wait is not a failure. It is the ordinary, constant cost of being certain, paid thousands of times a day, and the famous theorem says nothing about it at all.

---

### The proper terms

#### The statement

The **CAP theorem** says a distributed data store cannot simultaneously guarantee all three of:

**Consistency.** Every read receives the **most recent completed write**, or an error. Formally this is **linearizability**: the system behaves as though there is a **single copy** of the data and operations occur **instantaneously at some point between their invocation and response**.

**Availability.** Every request to a **non-failing** node receives a **non-error response**, without a guarantee that it is the most recent write.

**Partition tolerance.** The system continues to operate despite **arbitrary loss or delay of messages** between nodes.

Its history is worth a sentence: it was **Brewer's conjecture** in 2000 and was formally **proved by Gilbert and Lynch in 2002**, which is why it is a theorem rather than a rule of thumb.

The proof is short enough to describe: partition the network, write to one side, read from the other. The reading side cannot know about the write, so it must either return a **stale value**, losing consistency, or **refuse to answer**, losing availability.

#### Why "CA" is a myth

This is the most important clarification, and it has two parts.

**Partition tolerance is not a property you choose.** Networks lose and delay messages. Cables are cut, switches reboot, a rack loses its uplink, a GC pause makes a node unreachable for ten seconds. Any system spanning more than one machine **will** experience partitions, so **P is a fact about the environment, not a design option**.

**Therefore the real choice is CP or AP**, and it is a choice about **what to do during a partition**: give up availability by refusing to answer, or give up consistency by answering with possibly stale data.

So "pick two of three" is **the wrong framing**. You get P whether you want it or not, and you choose between the other two **only while a partition is happening**.

What people usually mean when they say CA is one of two things, and both are worth naming:

**A single-node system.** A database on one machine has no partitions because it has no network between replicas, so it can be both consistent and available. It is also not a distributed system, which is what the theorem is about.

**A system that stops when partitioned.** Many traditional clustered databases halt, or demote a side, when they lose quorum. That is **CP**: they chose consistency and sacrificed availability. Calling it CA is a relabelling.

And the honest caveat that a strong answer includes: **CAP is a coarse model.** It treats availability as binary when real systems degrade gradually, says nothing about latency, and ignores partial partitions. It is a useful lens for one specific question, not a framework for system design.

#### The two Cs

They **share a letter and nothing else**, and conflating them is one of the most common errors in this area.

**Consistency in ACID** means **integrity constraints hold**. A transaction takes the database from one valid state to another, where valid means every declared rule is satisfied: foreign keys, unique constraints, check constraints, triggers.

It is a property of one database state. It asks "is this state legal?". It is **local**, it concerns the data's internal validity, and it says nothing about replicas, nodes or time. It is also, strictly, a property the **application** defines and the engine merely **enforces**, since the database has no idea what your business considers correct beyond the rules you declared.

**Consistency in CAP** means **linearizability**. Every read sees the most recent completed write, so the system behaves as though there is a single copy.

It is a property of a **distributed system's behaviour over time**. It asks **"is everyone looking at the same state?"**. It concerns **agreement between replicas** and **real-time ordering**, and says nothing about constraints.

They are **independent**, which is best shown by the cases where you have one without the other:

**ACID-consistent but not linearizable.** A read replica five seconds behind. Every constraint holds, so it is perfectly ACID-consistent, and a read can miss a completed write, so it is not linearizable.

**Linearizable but not ACID-consistent.** A linearizable key-value store where every read sees the latest write, and which has no notion of foreign keys, so nothing prevents storing an order that references a customer who does not exist.

The sharpest formulation: **ACID's C asks whether this state is legal; CAP's C asks whether everyone is looking at the same state.** Many people, including Brewer, regard CAP's choice of letter as a historical mistake.

#### PACELC

**PACELC**, from Daniel Abadi in 2012, exists because CAP describes an **exceptional** condition while ignoring the one that applies constantly.

```text
if (P)artition  then  choose (A)vailability or (C)onsistency
else (E)              choose (L)atency      or (C)onsistency
```

The **ELC** half is the contribution, and the reasoning is simple: **partitions are rare, and the consistency-latency trade is paid on every single request.**

Even on a perfectly healthy network, a system that guarantees consistency must coordinate. It must contact a quorum, wait for a consensus round, possibly cross a continent. That coordination **is latency**, and it is paid constantly, not only during failures. A system willing to answer from one replica is faster and may be stale.

So PACELC describes **both** regimes, and the everyday one is the latency question rather than the availability question.

The classifications:

**PC/EC**: consistent under partition **and** when healthy, paying latency always. **Spanner**, **etcd**, **Zookeeper**, **VoltDB**.

**PA/EL**: available under partition and low-latency otherwise, eventually consistent. **Cassandra**, **DynamoDB**, **Riak**.

**PC/EL**: consistent under partition, favouring latency when healthy. **MongoDB** is usually placed here.

**PA/EC** is rare and somewhat incoherent, since a system willing to serve stale data under partition rarely insists on coordination when healthy.

The reason PACELC is the more useful framework in practice: when somebody asks "why is this database slow?", the answer is very often that it **chose C in the E clause**, and CAP has no vocabulary for that at all.

---

### In code

```text
THE THEOREM, and the proof in three lines:

  CONSISTENCY        every read receives the MOST RECENT COMPLETED
                     WRITE, or an error.
                     formally LINEARIZABILITY: the system behaves as
                     though there is a SINGLE COPY, with operations
                     occurring instantaneously at some point between
                     invocation and response.

  AVAILABILITY       every request to a NON-FAILING node receives a
                     NON-ERROR response, with no guarantee it is the
                     most recent write.

  PARTITION          the system continues to operate despite
  TOLERANCE          ARBITRARY LOSS OR DELAY of messages between
                     nodes.

  Brewer's CONJECTURE in 2000; PROVED by Gilbert and Lynch in 2002,
  which is why it is a theorem rather than a rule of thumb.

  THE PROOF:
     partition the network
     write to one side
     read from the other
     the reading side CANNOT KNOW about the write, so it must either
     return a STALE value (losing C) or REFUSE TO ANSWER (losing A).
```

```text
WHY "CA" IS A MYTH, in two parts:

  1. PARTITION TOLERANCE IS NOT A PROPERTY YOU CHOOSE.
     networks lose and delay messages. Cables are cut, switches
     reboot, a rack loses its uplink, a GC pause makes a node
     unreachable for ten seconds.
     any system spanning more than one machine WILL experience
     partitions.
     -> P IS A FACT ABOUT THE ENVIRONMENT, NOT A DESIGN OPTION.

  2. THEREFORE THE REAL CHOICE IS CP OR AP, and it is a choice
     about WHAT TO DO DURING A PARTITION.

  so "pick two of three" is THE WRONG FRAMING. You get P whether
  you want it or not, and you choose between the other two ONLY
  WHILE A PARTITION IS HAPPENING.

  what people usually MEAN by CA:

     A SINGLE-NODE SYSTEM
        no network between replicas, so no partitions, so it can be
        both consistent and available.
        it is also NOT A DISTRIBUTED SYSTEM, which is what the
        theorem is about.

     A SYSTEM THAT STOPS WHEN PARTITIONED
        many traditional clustered databases halt, or demote a side,
        on losing quorum.
        THAT IS CP: they chose consistency and sacrificed
        availability. Calling it CA is a relabelling.

  and the honest caveat: CAP IS A COARSE MODEL. It treats
  availability as binary when real systems degrade gradually, says
  nothing about latency, and ignores partial partitions. A useful
  lens for one question, not a design framework.
```

```text
What each choice looks like during a partition:

  node B receives a read for a key just written on node A, and the
  link between them is down:

     CP: REFUSE                    (error, or block until resolved)
         "I cannot be sure, so I will not guess"
         -> HBase, Zookeeper, etcd, Spanner,
            MongoDB with majority concerns
         -> right for configuration, coordination, money

     AP: ANSWER WITH WHAT IT HAS   (possibly stale)
         "here is my copy; we will reconcile later"
         -> Cassandra, DynamoDB (default), Riak
         -> right for feeds, carts, counters, sessions

  THERE IS NO THIRD OPTION that returns the correct value anyway,
  because the information needed is on the other side of the
  partition.
```

```text
THE TWO Cs: they share a letter and nothing else

  CONSISTENCY IN ACID                CONSISTENCY IN CAP
  -------------------                ------------------
  INTEGRITY CONSTRAINTS HOLD         LINEARIZABILITY
  a property of ONE STATE            a property of BEHAVIOUR OVER TIME
  "is this state LEGAL?"             "is everyone looking at the
                                      SAME state?"
  LOCAL to a database                about AGREEMENT BETWEEN REPLICAS
  foreign keys, unique, check,       real-time ordering, a single
  triggers                           logical copy
  the APPLICATION defines it,        nothing to do with constraints
  the engine ENFORCES it

  THEY ARE INDEPENDENT, which the two cases show:

  ACID-CONSISTENT BUT NOT LINEARIZABLE
     a read replica five seconds behind.
     every constraint holds -> perfectly ACID-consistent
     a read can miss a completed write -> NOT linearizable

  LINEARIZABLE BUT NOT ACID-CONSISTENT
     a linearizable key-value store where every read sees the latest
     write, with no notion of foreign keys, so nothing prevents
     storing an order referencing a customer who does not exist

  the sharpest formulation:
     ACID's C asks  "IS THIS STATE LEGAL?"
     CAP's  C asks  "IS EVERYONE LOOKING AT THE SAME STATE?"

  many people, including Brewer, regard CAP's choice of letter as a
  historical mistake.
```

```text
PACELC (Abadi, 2012): CAP describes the EXCEPTION and ignores the RULE

   if (P)artition  ->  choose (A)vailability or (C)onsistency
   else (E)        ->  choose (L)atency      or (C)onsistency

  the ELC half is the contribution, and the reasoning is simple:
  PARTITIONS ARE RARE, AND THE CONSISTENCY-LATENCY TRADE IS PAID ON
  EVERY SINGLE REQUEST.

  even on a PERFECTLY HEALTHY network, guaranteeing consistency
  means COORDINATING:
     contact a quorum
     wait for a consensus round
     possibly cross a continent
  that coordination IS LATENCY, paid constantly, not only during
  failures. A system willing to answer from one replica is faster
  and may be stale.

  THE CLASSIFICATIONS:

     PC/EC   consistent under partition AND when healthy,
             paying latency always
             Spanner, etcd, Zookeeper, VoltDB

     PA/EL   available under partition, low-latency otherwise,
             eventually consistent
             Cassandra, DynamoDB, Riak

     PC/EL   consistent under partition, favouring latency when
             healthy
             MongoDB is usually placed here

     PA/EC   rare and somewhat incoherent: a system willing to serve
             stale data under partition rarely insists on
             coordination when healthy

  WHY PACELC IS MORE USEFUL IN PRACTICE:
     when somebody asks "why is this database slow?", the answer is
     very often that IT CHOSE C IN THE E CLAUSE, and CAP has no
     vocabulary for that at all.
```

```text
Putting the two frameworks side by side:

                    during a PARTITION      when HEALTHY
  CAP says          A or C                  (silent)
  PACELC says       A or C                  L or C

                    happens TWICE A YEAR    happens ON EVERY REQUEST

  which is why CAP is the famous one and PACELC is the one that
  describes your actual system.
```

---

### What they ask next

**"State CAP precisely."**
A distributed data store cannot simultaneously guarantee linearizable consistency, availability of every non-failing node, and partition tolerance. Brewer conjectured it in 2000 and Gilbert and Lynch proved it in 2002.

**"Why is 'pick two of three' wrong?"**
Because partition tolerance is not something you pick. Networks drop and delay messages, so any multi-machine system experiences partitions whether its designers planned for them or not. The genuine choice is what to do **during** one, which makes it CP or AP.

**"What do people mean when they say CA?"**
Either a single-node system, which has no partitions because it has no network between replicas and is therefore not what the theorem is about, or a cluster that halts when it loses quorum, which is CP described with the wrong label.

**"Does CP mean the whole database goes down in a partition?"**
No. Only the nodes that cannot reach a quorum stop serving the affected data; a majority partition continues normally. This is why consensus systems are deployed in odd numbers across failure domains.

**"How do the two Cs differ?"**
ACID's C is about integrity constraints holding in a single database state and says nothing about replicas or time. CAP's C is linearizability, a property of a distributed system's behaviour over time, and says nothing about constraints. A lagging read replica is ACID-consistent and not linearizable; a constraint-free linearizable key-value store is the reverse.

**"What does PACELC add?"**
The everyday case. CAP only describes behaviour during a partition, which is rare, while PACELC also covers the healthy state, where the trade is latency against consistency, paid on every request because consistency requires coordination.

**"Classify a few systems under PACELC."**
Spanner and etcd are PC/EC, consistent in both regimes and paying latency always. Cassandra and DynamoDB are PA/EL. MongoDB is usually classified PC/EL. PA/EC is rare and does not describe much.

**"What are CAP's limitations as a model?"**
It treats availability as binary when real systems degrade in degrees, it ignores latency entirely, and it assumes clean total partitions rather than the partial and asymmetric failures that actually occur. It answers one specific question well and is not a design framework.

**The common wrong answer** is "pick two of three, and we chose CA". Partition tolerance is **not selectable**, so the real decision is CP or AP **during a partition**; the two Cs are **unrelated properties** sharing a letter; and the trade that actually shapes a system day to day is **PACELC's latency-against-consistency**, not the availability question that only matters when the network breaks.

---

### Say this in the interview

*"The CAP theorem says a distributed data store cannot simultaneously guarantee all three of consistency, availability and partition tolerance. Consistency there means linearizability: every read receives the most recent completed write, so the system behaves as though there is a single copy with operations occurring instantaneously somewhere between invocation and response. Availability means every request to a non-failing node receives a non-error response, with no guarantee of recency. Partition tolerance means the system keeps operating despite arbitrary loss or delay of messages between nodes. It was Brewer's conjecture in 2000 and Gilbert and Lynch proved it in 2002. The proof is short: partition the network, write to one side, read from the other, and the reading side cannot know about the write, so it must either return a stale value or refuse to answer.*

*CA is a myth for two reasons. First, partition tolerance is not a property you choose: networks lose and delay messages, cables are cut, switches reboot, a GC pause makes a node unreachable, so any system spanning more than one machine will experience partitions. P is a fact about the environment, not a design option. Second, it follows that the real choice is CP or AP, and it is a choice about what to do during a partition. So pick-two-of-three is the wrong framing: you get P regardless, and you choose between the other two only while a partition is happening. What people usually mean by CA is either a single-node system, which has no partitions because it has no network between replicas and is not what the theorem is about, or a cluster that halts when it loses quorum, which is CP with the wrong label. And I would add that CAP is a coarse model: it treats availability as binary where real systems degrade gradually, says nothing about latency, and ignores partial partitions.*

*The two Cs share a letter and nothing else. Consistency in ACID means integrity constraints hold, so a transaction moves the database from one valid state to another where valid means every declared rule is satisfied. It is a property of a single state, it asks whether this state is legal, it is local, and it says nothing about replicas or time; and strictly it is the application that defines it while the engine enforces what was declared. Consistency in CAP is linearizability: a property of a distributed system's behaviour over time, asking whether everyone is looking at the same state, concerning agreement between replicas and real-time ordering, and saying nothing about constraints. They are independent, which the two cases show: a read replica five seconds behind is perfectly ACID-consistent and not linearizable, while a linearizable key-value store with no foreign keys is linearizable and will happily store an order referencing a missing customer. The sharpest formulation is that ACID's C asks whether this state is legal and CAP's C asks whether everyone is looking at the same state, and many people including Brewer consider CAP's choice of letter a historical mistake.*

*PACELC, from Abadi in 2012, extends it because CAP describes an exceptional condition and ignores the constant one. If there is a partition, choose availability or consistency; else, choose latency or consistency. The ELC half is the contribution, and the reasoning is that partitions are rare while the consistency-latency trade is paid on every single request. Even on a perfectly healthy network, guaranteeing consistency means coordinating: contacting a quorum, waiting for a consensus round, possibly crossing a continent, and that coordination is latency paid constantly rather than only during failures. The classifications are PC/EC for Spanner, etcd, Zookeeper and VoltDB, consistent in both regimes and paying latency always; PA/EL for Cassandra, DynamoDB and Riak; PC/EL for MongoDB; and PA/EC, which is rare and somewhat incoherent. PACELC is the more useful framework in practice, because when somebody asks why a database is slow, the answer is very often that it chose C in the E clause, and CAP has no vocabulary for that at all."*
