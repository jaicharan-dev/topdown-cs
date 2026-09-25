---
id: 29-sql-vs-nosql-decision-criteria
title: "SQL vs. NoSQL: Architectural Decision Criteria"
description: "Master architectural selection between SQL and NoSQL databases, the CAP and PACELC theorems, 4 NoSQL paradigms, and NewSQL systems."
sidebar_position: 15
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "When would you choose a NoSQL database over a relational (SQL) database, and vice-versa? How do the CAP and PACELC theorems guide this choice, and what are Distributed SQL (NewSQL) systems?"

The decision between **SQL (Relational)** and **NoSQL (Non-Relational)** is not a matter of old versus new; it is a fundamental architectural trade-off balancing **data model structure**, **consistency guarantees**, and **horizontal scaling requirements**.

---

### Core Paradigms Compared

```
                ┌──────────────────────────────────────────────┐
                │          DATABASE ARCHITECTURES              │
                └───────┬──────────────────────────────┬───────┘
                        │                              │
         ┌──────────────┴─────────────┐ ┌──────────────┴──────────────┐
         │     RELATIONAL (SQL)       │ │          NoSQL              │
         │ PostgreSQL, MySQL, Oracle  │ │ Dynamic Schema, Horizontal  │
         │ Rigid Schema, ACID, JOINs  │ └──────────────┬──────────────┘
         └────────────────────────────┘                │
        ┌───────────────────┬──────────────────────────┼───────────────────┐
        │                   │                          │                   │
┌───────┴──────┐    ┌───────┴──────┐           ┌───────┴──────┐    ┌───────┴──────┐
│  Key-Value   │    │   Document   │           │ Wide-Column  │    │    Graph     │
│ Redis, Memcached  │ MongoDB, Couchbase       │ Cassandra, Scylla │ Neo4j, Neptune   │
└──────────────┘    └──────────────┘           └──────────────┘    └──────────────┘
```

---

### The Four NoSQL Paradigms

#### 1. Key-Value Stores (e.g., Redis, Memcached, DynamoDB)
- **Data Model:** Hash map mapping unique keys to opaque values or structured primitives.
- **Strength:** Sub-millisecond latency; in-memory caching.
- **Use Cases:** Session stores, leaderboards, rate limiters, temporary shopping carts.

#### 2. Document Stores (e.g., MongoDB, Couchbase)
- **Data Model:** Hierarchical, self-describing documents (JSON / BSON).
- **Strength:** Schema flexibility; eliminates multi-table joins by embedding nested entities.
- **Use Cases:** Content management systems, e-commerce product catalogs with polymorphic attributes, user profiles.

#### 3. Wide-Column Stores (e.g., Apache Cassandra, ScyllaDB, Google Bigtable)
- **Data Model:** Sparse, multi-dimensional maps indexed by `(row_key, column_family, column_key, timestamp)`.
- **Strength:** Massive horizontal write throughput; peer-to-peer masterless architecture with zero single point of failure.
- **Use Cases:** IoT sensor telemetry, financial audit trails, high-volume clickstreams, messaging logs.

#### 4. Graph Databases (e.g., Neo4j, Amazon Neptune)
- **Data Model:** Nodes, Edges, and Properties representing interconnected entities.
- **Strength:** Index-free adjacency ($O(1)$ relationship traversal independent of overall graph size).
- **Use Cases:** Fraud detection rings, social network follower graphs, recommendation engines, knowledge graphs.

---

### Architectural Foundations: CAP and PACELC Theorems

Senior engineering interviews evaluate distributed trade-offs using two theoretical frameworks:

#### 1. The CAP Theorem
During a network **Partition (P)**, a distributed system must choose between:
- **Consistency (C):** Every read receives the most recent write or an error.
- **Availability (A):** Every request receives a non-error response without guarantee of latest data.
- Relational databases prioritize **Consistency (CP)**. Distributed NoSQL engines (like Cassandra) prioritize **Availability (AP)** via eventual consistency.

#### 2. The PACELC Theorem
The CAP theorem only applies during network partitions. The **PACELC Theorem** extends it to normal operating conditions:
> If there is a **P**artition, how does the system choose between **A**vailability and **C**onsistency?  
> **E**lse (normal conditions), how does the system choose between **L**atency and **C**onsistency?

- **Cassandra:** **PA/EL** (Yields Availability during partitions; yields Latency during normal operations).
- **MongoDB:** **PC/EC** (Yields Consistency in partitions; yields Consistency during normal operations).
- **PostgreSQL:** **PC/EC** (Strictly consistent; avoids stale dirty reads).

---

### The Modern Frontier: Distributed SQL (NewSQL)

What if you need horizontal cloud scaling **AND** full relational ACID guarantees?

**Distributed SQL** engines (e.g., **Google Spanner, CockroachDB, YugabyteDB**) solve this dilemma:
- **Relational Semantics:** Full ANSI SQL, multi-table `JOIN`s, and foreign key constraints.
- **Horizontal Elasticity:** Automatic data range sharding across dozens of nodes.
- **ACID at Scale:** Consensus algorithms (**Raft** or **Paxos**) combined with atomic clocks (Google TrueTime) to provide true linearizable, distributed serializable transactions globally.

---

### Decision Matrix: SQL vs. NoSQL

| Dimension | Choose Relational (SQL) | Choose NoSQL |
| :--- | :--- | :--- |
| **Data Relationships** | Highly interconnected entities requiring strict relational integrity and joins | Denormalized, self-contained documents or key-indexed records |
| **Consistency Needs** | Strict ACID compliance mandatory (financial transactions, inventory, billing) | Eventual Consistency acceptable in exchange for high availability |
| **Schema Evolution** | Predictable, structured schemas where schema drift is dangerous | Polymorphic, rapidly mutating attributes across records |
| **Scaling Strategy** | **Scale Vertically** (larger instances) or read replicas | **Scale Horizontally** across commodity compute nodes out-of-the-box |
| **Query Flexibility** | Ad-hoc SQL queries, dynamic multi-column aggregations | Predetermined access patterns optimized strictly around partition keys |

---

### The ELI5 Analogy: Filing Cabinets vs. Travel Bins

- **Relational SQL (The Accountant's Filing Cabinet):** Every folder is precisely labeled. Every invoice must have a matching client ID. If an invoice is missing a line item, the system rejects it. Filing takes rigor, but you can instantly audit any financial transaction.
- **NoSQL Document (The Vacation Bin):** You throw your sunglasses, passport, beach towel, and camera into a single plastic container labeled "Hawaii". When you travel, you grab the entire bin in one second. But if someone asks: *"How many towels are stored across all 50 bins in the garage?"*, you must open and search every single bin.

---

### Summary
"Choose relational SQL when you require strict ACID transactional consistency, complex relational joins, and predictable schemas. Choose NoSQL when you need massive horizontal write scaling, high availability, flexible document schemas, or specialized graph traversals. Use Distributed SQL (NewSQL) when you require both horizontal elasticity and ACID consistency."

---

### Crucial Nuance: The Convergence of SQL and NoSQL
The divide between SQL and NoSQL has blurred significantly:
- **PostgreSQL** provides native `JSONB` document storage with inverted indexes (GIN), enabling MongoDB-like document workflows with complete relational ACID transactions.
- **MongoDB and AWS DynamoDB** now support multi-document ACID transactions across shards.
Evaluate tools based on actual latency, operational overhead, and access patterns rather than dogma.

---

### Code Demonstration: Polyglot Query Paradigms

```sql
-- -------------------------------------------------------------
-- 1. Relational SQL (PostgreSQL): Strict Joins & Foreign Keys
-- -------------------------------------------------------------
SELECT 
    u.id AS user_id, 
    u.email, 
    o.id AS order_id, 
    o.total_amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.id = 42;

-- -------------------------------------------------------------
-- 2. Document Model (MongoDB / JSON): Embedded Self-Contained Record
-- -------------------------------------------------------------
-- No JOINs required; entire object retrieved in a single disk seek:
/*
{
  "_id": 42,
  "email": "user@example.com",
  "orders": [
    { "order_id": 101, "total_amount": 250.00 },
    { "order_id": 102, "total_amount": 89.50 }
  ]
}
*/
-- db.users.find({ _id: 42 })

-- -------------------------------------------------------------
-- 3. In-Memory Key-Value (Redis): Atomic Latency Operations
-- -------------------------------------------------------------
-- SET session:token_abc99 "{ user_id: 42, role: 'admin' }" EX 3600
-- INCR page_views:article_101
```
