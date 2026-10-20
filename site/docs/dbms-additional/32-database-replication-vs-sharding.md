---
id: 32-database-replication-vs-sharding
title: "Database Replication vs. Sharding"
description: "The difference between Database Replication (read scaling & HA) and Sharding (horizontal write & storage scaling)."
sidebar_position: 17
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is database replication, and what is database sharding? How are they fundamentally different, what are the failure modes of each, and how do enterprise architectures combine both?"

Once one database server can't keep up, you have two completely different tools to reach for, and they solve two completely different problems:

- **Replication:** make copies of the *same* data, so more machines can serve reads and you have a backup if one dies.
- **Sharding:** split the data into *different* pieces across machines, so no single machine has to hold or write all of it.

They're not alternatives — they solve different bottlenecks, and most large systems end up using both.

---

### The two models, side by side

<Diagram>
<Tree root={
<Box title="Replication: every node has 100% of the data" accent="#818cf8">
<Field icon="✍️" code="Primary handles all writes" variant="neutral" />
</Box>
}>
<Box title="Replica 1" accent="#34d399"><Field icon="📖" code="rows 1–1,000,000" hint="read-only copy" variant="neutral" /></Box>
<Box title="Replica 2" accent="#34d399"><Field icon="📖" code="rows 1–1,000,000" hint="read-only copy" variant="neutral" /></Box>
</Tree>
</Diagram>

<Diagram>
<Row>
<Box title="Shard 1" accent="#60a5fa"><Field icon="🗂️" code="rows 1 – 333,333" hint="33% of the data" variant="neutral" /></Box>
<Box title="Shard 2" accent="#f59e0b"><Field icon="🗂️" code="rows 333,334 – 666,666" hint="33% of the data" variant="neutral" /></Box>
<Box title="Shard 3" accent="#ec4899"><Field icon="🗂️" code="rows 666,667 – 1,000,000" hint="33% of the data" variant="neutral" /></Box>
</Row>
</Diagram>

---

### Comparison

| Dimension | Replication | Sharding |
| :--- | :--- | :--- |
| **Solves** | Read throughput and high availability | Write throughput and storage limits |
| **Data split** | Every node holds all of the data | Each node holds a different slice (e.g. 20%) |
| **Write scaling** | None — every write still goes through the one primary | Linear — writes spread across independent shards |
| **If a node dies** | Promote a replica to primary, keep going | That shard's data is unavailable unless it has its own replicas |
| **Query complexity** | None — normal SQL and joins work as-is | High — cross-shard joins need scatter-gather |
| **Transactions** | Normal single-node ACID on the primary | Needs Two-Phase Commit or the Saga pattern across shards |

---

### Replication: copying the same data around

In a standard **primary-replica** setup:

1. All writes (`INSERT`, `UPDATE`, `DELETE`) go to the **primary**.
2. The primary logs every change to its write-ahead log (WAL).
3. That log streams across the network to the replicas.
4. Replicas replay the log and serve read queries.

**Three ways to do the streaming:**

1. **Asynchronous (the default):** the primary tells the client "done" immediately, then streams to replicas afterward. Fast, but if the primary crashes before a replica gets the update, that write is gone for good.
2. **Synchronous:** the primary waits for at least one replica to confirm before telling the client "done." No data loss, but every write now pays the round-trip time to that replica.
3. **Semi-synchronous (MySQL):** the primary waits for a replica to *receive* the write, not necessarily flush it to disk — a middle ground on latency.

**What goes wrong when a replica falls behind:**

- You update your bio, refresh the page, and see your *old* bio — because the read hit a replica that hasn't caught up yet.
- You refresh your inbox twice and see emails disappear — refresh 1 hit a fresh replica, refresh 2 hit a stale one.
- A later change gets applied before an earlier one it depended on, because the two were streamed on different paths.

---

### Sharding: splitting the data into pieces

Once a database outgrows what a single machine's RAM, disk, and IOPS can handle — think 500GB growing into 50TB — no amount of better hardware fixes it. Sharding splits the table itself across separate database clusters, routed by a **shard key**:

```sql
-- A simple hash-based router:
Target_Shard_ID = CRC32(user_id) % Number_Of_Shards
```

**The two costs you pay for this:**

**1. Transactions that span shards get hard.** Debiting a user on Shard A and crediting one on Shard B atomically normally needs **Two-Phase Commit (2PC)** — ask both shards to "prepare," then tell them both to commit. The problem: it's a blocking protocol. If the coordinator dies after both shards vote "yes," they're stuck holding locks indefinitely. Most large systems avoid this with the **Saga pattern** instead: break the transaction into local steps, and if one fails, run compensating actions (like an explicit refund) rather than holding cross-shard locks.

**2. Joins across shards get expensive.** The database can't do a fast local join between rows that live on different machines — it has to pull both sides across the network into an application-level router. Production systems usually just avoid this by duplicating small reference tables onto every shard.

---

### Combining both: what real systems actually do

Every large-scale system — CockroachDB, Spanner, MongoDB's sharded clusters, Vitess at YouTube — shards *and* replicates. Each shard is its own small primary-replica group:

<Diagram>
<Row>
<Box title="Shard 1 (user IDs 0–999,999)" accent="#60a5fa">
<Field icon="✍️" code="Primary 1A" variant="neutral" />
<Field icon="📖" code="Replica 1B, 1C" hint="read scaling + failover" variant="neutral" />
</Box>
<Box title="Shard 2 (user IDs 1,000,000+)" accent="#f59e0b">
<Field icon="✍️" code="Primary 2A" variant="neutral" />
<Field icon="📖" code="Replica 2B, 2C" hint="read scaling + failover" variant="neutral" />
</Box>
</Row>
</Diagram>

Sharding gives you linear write and storage scaling; replication inside each shard gives you availability and read scaling — the app router sends writes to each shard's primary and spreads reads across its replicas.

---

### Say this in the interview

*"Replication copies the full dataset to multiple nodes to scale reads and survive failures, but every write still funnels through one primary. Sharding splits the data into disjoint pieces across nodes to scale writes and storage, at the cost of harder cross-shard joins and transactions. They solve different bottlenecks, so production systems almost always combine them: shard for write/storage scale, and replicate within each shard for availability and read scale."*

---

### Code: a sharded router with read replicas

This script simulates routing writes to the right shard by hashing the shard key, then load-balancing reads across that shard's replicas, and shows what a scatter-gather query across all shards looks like when the shard key isn't in the filter.

```python
"""
Sharded Database Architecture Simulation
Demonstrates:
  1. Shard key routing via deterministic hashing
  2. Primary write routing with read-replica load balancing
  3. Scatter-gather queries across distributed shards
"""

import hashlib
from typing import List, Dict, Any, Optional

class DatabaseNode:
    def __init__(self, node_id: str, is_primary: bool = False):
        self.node_id = node_id
        self.is_primary = is_primary
        self.storage: Dict[str, Dict[str, Any]] = {}

    def write(self, key: str, record: Dict[str, Any]) -> None:
        self.storage[key] = record

    def read(self, key: str) -> Optional[Dict[str, Any]]:
        return self.storage.get(key)


class ShardGroup:
    """Represents a single Shard consisting of 1 Primary and N Read Replicas."""
    def __init__(self, shard_id: int, num_replicas: int = 2):
        self.shard_id = shard_id
        self.primary = DatabaseNode(f"shard_{shard_id}_primary", is_primary=True)
        self.replicas = [
            DatabaseNode(f"shard_{shard_id}_rep_{i}", is_primary=False)
            for i in range(num_replicas)
        ]
        self._next_replica_idx = 0

    def write(self, key: str, record: Dict[str, Any]) -> None:
        # Write to primary
        self.primary.write(key, record)
        # Asynchronously / Synchronously replicate to read followers
        for rep in self.replicas:
            rep.write(key, record)

    def read_replica(self, key: str) -> Optional[Dict[str, Any]]:
        # Round-robin load balancing across read replicas
        replica = self.replicas[self._next_replica_idx]
        self._next_replica_idx = (self._next_replica_idx + 1) % len(self.replicas)
        return replica.read(key)

    def scan_shard(self, filter_field: str, expected_val: Any) -> List[Dict[str, Any]]:
        # Scan local shard records matching filter
        return [
            rec for rec in self.primary.storage.values()
            if rec.get(filter_field) == expected_val
        ]


class DistributedRouter:
    """Application router directing queries to correct shards and replica nodes."""
    def __init__(self, num_shards: int = 3):
        self.num_shards = num_shards
        self.shards = [ShardGroup(shard_id=i) for i in range(num_shards)]

    def _get_shard_index(self, shard_key: str) -> int:
        hash_val = int(hashlib.md5(shard_key.encode('utf-8')).hexdigest(), 16)
        return hash_val % self.num_shards

    def insert_record(self, shard_key: str, data: Dict[str, Any]) -> str:
        shard_idx = self._get_shard_index(shard_key)
        self.shards[shard_idx].write(shard_key, data)
        return f"Routed key '{shard_key}' -> Shard {shard_idx} (Primary)"

    def point_read(self, shard_key: str) -> Tuple[Optional[Dict[str, Any]], str]:
        shard_idx = self._get_shard_index(shard_key)
        record = self.shards[shard_idx].read_replica(shard_key)
        return record, f"Fetched from Shard {shard_idx} (Read Replica)"

    def scatter_gather_search(self, filter_field: str, expected_val: Any) -> List[Dict[str, Any]]:
        """Executed when shard key is absent from the query filter."""
        results = []
        for shard in self.shards:
            # Fan out query to every physical shard in parallel
            shard_matches = shard.scan_shard(filter_field, expected_val)
            results.extend(shard_matches)
        return results


def main():
    print("=== Distributed Sharding & Replication Routing Simulation ===\n")
    router = DistributedRouter(num_shards=3)

    # 1. Targeted Writes (Routed via Shard Key 'user_id')
    users = [
        {"user_id": "usr_alpha", "name": "Alice", "country": "US", "balance": 450},
        {"user_id": "usr_beta", "name": "Bob", "country": "DE", "balance": 820},
        {"user_id": "usr_gamma", "name": "Charlie", "country": "US", "balance": 150},
        {"user_id": "usr_delta", "name": "David", "country": "JP", "balance": 990},
    ]

    print("--- 1. Writing Users (Targeted Shard Routing) ---")
    for u in users:
        route_msg = router.insert_record(u["user_id"], u)
        print(f"Insert {u['user_id']}: {route_msg}")

    # 2. Targeted Point Reads (Directly routes to specific Shard Replica)
    print("\n--- 2. Point Query with Shard Key (Single Shard Read) ---")
    query_key = "usr_beta"
    record, route_info = router.point_read(query_key)
    print(f"Query for '{query_key}': {record} | {route_info}")

    # 3. Scatter-Gather Query (Shard Key Absent in WHERE clause)
    print("\n--- 3. Scatter-Gather Query (WHERE country = 'US') ---")
    print("Notice: Shard key is NOT provided. Router must broadcast to ALL shards!")
    us_users = router.scatter_gather_search("country", "US")
    print(f"Found {len(us_users)} results across cluster:")
    for res in us_users:
        print(f"  -> {res}")

if __name__ == "__main__":
    from typing import Tuple
    main()
```
