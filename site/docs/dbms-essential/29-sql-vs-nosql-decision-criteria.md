---
id: 29-sql-vs-nosql-decision-criteria
title: "SQL vs. NoSQL: Architectural Decision Criteria"
description: "How to actually decide between SQL and NoSQL: the CAP and PACELC theorems, the four NoSQL paradigms, and where NewSQL fits in."
sidebar_position: 15
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "When would you choose a NoSQL database over a relational (SQL) database, and vice-versa? How do the CAP and PACELC theorems guide this choice, and what are Distributed SQL (NewSQL) systems?"

Think of two ways to pack for a trip. SQL is like an accountant's filing cabinet: every folder is labeled, every invoice must have a matching client ID, nothing gets filed if it's incomplete. It takes rigor to set up, but you can audit any single transaction instantly. NoSQL is like a vacation bin: you throw your passport, sunglasses, and camera into one container labeled "Hawaii" and grab the whole thing in one go. Fast to pack, fast to grab — but if someone asks "how many towels are in all 50 bins combined?", you have to open every bin.

The real decision isn't "old vs. new" — it's a trade-off between schema structure, consistency guarantees, and how you want to scale.

---

### The landscape

<Diagram>
<Tree root={
<Box title="Database architectures" accent="#818cf8">
<Field icon="🗄️" code="pick by access pattern" hint="not by trend" variant="neutral" />
</Box>
}>
<Box title="Relational (SQL)" accent="#60a5fa">
<Field icon="📐" code="Postgres, MySQL, Oracle" hint="rigid schema, ACID, joins" variant="neutral" />
</Box>
<Box title="NoSQL" accent="#34d399">
<Field icon="🧩" code="Key-Value, Document, Wide-Column, Graph" hint="flexible schema, horizontal scale" variant="neutral" />
</Box>
</Tree>
</Diagram>

---

### The four NoSQL paradigms

**1. Key-Value stores** (Redis, Memcached, DynamoDB) — a hash map of keys to values. Sub-millisecond latency, usually in-memory. Good for session stores, leaderboards, rate limiters, shopping carts.

**2. Document stores** (MongoDB, Couchbase) — hierarchical JSON-like documents. Flexible schema, and you can embed nested data instead of joining. Good for CMSs, product catalogs with varying attributes, user profiles.

**3. Wide-column stores** (Cassandra, ScyllaDB, Bigtable) — sparse maps keyed by row, column family, column, and timestamp. Built for massive write throughput with no single point of failure. Good for IoT telemetry, audit trails, clickstreams.

**4. Graph databases** (Neo4j, Amazon Neptune) — nodes, edges, and properties. Traversing a relationship is effectively O(1) regardless of graph size. Good for fraud rings, social graphs, recommendations.

---

### CAP and PACELC: the theory behind the choice

**CAP Theorem:** during a network partition, a distributed system has to choose between:
- **Consistency** — every read gets the latest write, or an error.
- **Availability** — every request gets a response, but maybe not the latest data.

Relational databases lean **CP** (consistency first). Distributed NoSQL systems like Cassandra lean **AP** (availability first, eventual consistency).

**PACELC** extends this to normal operation, not just outages: *if there's a Partition, do you pick Availability or Consistency? Else (normal conditions), do you pick Latency or Consistency?*

- **Cassandra:** PA/EL — availability during a partition, low latency otherwise.
- **MongoDB:** PC/EC — consistency, both during a partition and normally.
- **PostgreSQL:** PC/EC — strictly consistent, avoids returning stale data.

---

### What if you need both?

**Distributed SQL (NewSQL)** — Google Spanner, CockroachDB, YugabyteDB — tries to give you both horizontal scaling *and* full ACID:
- Full SQL, joins, and foreign keys.
- Data automatically sharded across nodes.
- Consensus protocols (Raft/Paxos), sometimes paired with synchronized clocks (Google TrueTime), to deliver real distributed, serializable transactions.

---

### Decision table

| Dimension | Pick SQL | Pick NoSQL |
| :--- | :--- | :--- |
| **Data relationships** | Entities are tightly connected and need real joins | Data is self-contained or looked up by a simple key |
| **Consistency needs** | Must be strict ACID (billing, inventory, finance) | Eventual consistency is fine in exchange for availability |
| **Schema** | Structured, stable, drift is dangerous | Attributes vary a lot and change often |
| **Scaling** | Scale up, or add read replicas | Scale out across commodity nodes by default |
| **Query style** | Ad-hoc SQL, multi-column aggregations | Fixed access patterns built around a partition key |

---

### The lines are blurring

- PostgreSQL's `JSONB` plus GIN indexes gives you MongoDB-style document storage with full relational ACID.
- MongoDB and DynamoDB now both support multi-document ACID transactions.

In practice, pick based on your actual access patterns and latency needs, not on which camp a tool belongs to.

---

### Code: the same data, three ways

```sql
-- 1. Relational: joins and foreign keys
SELECT 
    u.id AS user_id, 
    u.email, 
    o.id AS order_id, 
    o.total_amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.id = 42;

-- 2. Document model: everything embedded, one lookup
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

-- 3. Key-value: atomic, low-latency operations
-- SET session:token_abc99 "{ user_id: 42, role: 'admin' }" EX 3600
-- INCR page_views:article_101
```

---

### Say this in the interview

*"Pick relational SQL when you need strict ACID guarantees, real joins, and a predictable schema. Pick NoSQL when you need massive horizontal write scale, high availability, flexible schemas, or graph traversal. Pick Distributed SQL (NewSQL) when you need both horizontal scale and ACID at once."*
