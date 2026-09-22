---
id: 30-cap-theorem-sql-vs-nosql
title: "The CAP Theorem and Distributed Databases"
description: "Deep dive into the CAP Theorem (Consistency, Availability, Partition Tolerance), network partitions, and the reality of CP vs. AP trade-offs."
sidebar_position: 30
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the CAP theorem? Why can a distributed database never guarantee both Consistency and Availability simultaneously in the presence of a network partition?"

Formulated by Eric Brewer and mathematically proven by Lynch and Gilbert, the **CAP Theorem** states that any distributed data store can simultaneously guarantee at most **two out of three** properties:

```
                  Consistency (Linearizability)
                              / \
                             /   \
                            /     \
                           /  CAP  \
                          /         \
                         /           \
             Availability ——————————— Partition Tolerance
```

1. **C - Consistency (Linearizability / Single-Copy Consistency):** Every read receives the most recent write or an error. All clients see the identical data state at the exact same instant.
2. **A - Availability:** Every non-failing node returns a non-error response for every request, without guarantee that it contains the most recent write.
3. **P - Partition Tolerance:** The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.

---

### The Reality: You Cannot Choose "CA"!

In physical computer networks, cables get cut, routers reboot, and switches drop packets. **Network Partitions (`P`) are an unavoidable physical reality of distributed systems.**

Therefore, the CAP theorem is not a choice between `C`, `A`, and `P`. 
**The real question is: When a Network Partition (`P`) occurs, do you choose Consistency (CP) or Availability (AP)?**

```
                    ┌──────────────────────────────┐
                    │  Network Partition Occurs!   │
                    │   (Nodes cannot communicate) │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
      Choose Consistency (CP)                   Choose Availability (AP)
   Reject writes to protect state           Accept writes on both sides
   -> Unavailable nodes throw errors        -> Data temporarily diverges
   (e.g., MongoDB, HBase, Zookeeper)        (e.g., Cassandra, DynamoDB, Couchbase)
```

---

### The Concrete Proof: Node 1 and Node 2

Imagine a database cluster with two nodes: Node 1 (New York) and Node 2 (London):
1. A network fiber cable in the Atlantic Ocean is severed. Node 1 and Node 2 can no longer communicate (A Network Partition `P`).
2. A user in New York sends a write request to Node 1: `UPDATE balance = \$200`.
3. Simultaneously, another user in London sends a read request to Node 2: `SELECT balance`.

#### Scenario A: You Choose Consistency (CP)
- Node 1 knows it cannot synchronize the new balance (\$200) to Node 2 across the severed ocean cable.
- To prevent Node 2 from serving stale data (\$100), the system must **reject the write or make Node 2 throw an error**.
- Result: **Data remains 100% consistent**, but the system has sacrificed **Availability**!

#### Scenario B: You Choose Availability (AP)
- Node 1 accepts the write (\$200) and confirms success to the New York user.
- Node 2 in London answers the read request immediately with its current local value (\$100).
- Result: **The system remained 100% available**, but London saw stale data—sacrificing **Consistency**!

---

### Mapping Real Databases to CAP

| Classification | Database Engines | Behavioral Guarantee |
| :--- | :--- | :--- |
| **CP (Consistency + Partition Tolerance)** | MongoDB, Apache HBase, Google Spanner, Etcd, ZooKeeper | In network splits, minority partitions reject writes to prevent split-brain. Prioritizes correctness over uptime. |
| **AP (Availability + Partition Tolerance)** | Apache Cassandra, Amazon DynamoDB, Couchbase | Always accepts reads and writes on any active node. Reconciles divergent writes later via Eventual Consistency. |
| **"CA" (Single Node RDBMS)** | Single-instance PostgreSQL, MySQL, SQLite | Traditional single-node databases do not tolerate network partitions because they do not run across a distributed network! |

---

### The ELI5 Analogy: The Bank Teller Phone Call

You and your spouse are at two different bank branches in different cities trying to withdraw money at the same moment. Suddenly, the telephone lines between the two bank branches go down (Network Partition).
- **The CP Bank (Consistency First):** The teller says: *"Our phone lines are down, so I cannot verify if your spouse is withdrawing money at the other branch right now. For security, I must lock your account and refuse all withdrawals until the lines are restored."* (Safe, but annoying).
- **The AP Bank (Availability First):** The teller says: *"Our phone lines are down, but I will give you the cash anyway! Once the lines come back up tonight, we will balance the books. If you and your spouse overdraw the account, we will send you an overdraft penalty fee."* (Fast and available, but balance is temporarily inconsistent).

---

### Summary
"Because network partitions are physically inevitable in distributed systems, the CAP theorem mandates a trade-off during a partition: CP systems sacrifice availability to ensure linearizable consistency, while AP systems sacrifice immediate consistency to maintain uninterrupted read/write availability."

---

### Crucial Nuance: The PACELC Theorem
The CAP theorem only describes behavior *when a network partition occurs*. But partitions are rare (under 0.1% of normal operational time). 
Daniel Abadi extended CAP with the **PACELC Theorem**:
- **If there is a Partition (`P`):** Trade off Availability (`A`) or Consistency (`C`).
- **Else (`E` - normal operation):** Trade off **Latency (`L`)** or **Consistency (`C`)**.
Even when the network is healthy, a database must decide whether to wait for multi-node consensus (increasing latency for strict consistency) or return immediately from local memory (low latency with eventual consistency).
