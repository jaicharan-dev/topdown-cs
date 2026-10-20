---
id: 33-shard-keys-and-hotspot-pitfalls
title: "Shard Keys: Selection Strategy & Hotspot Pitfalls"
description: "Shard key selection criteria, hot spotting pitfalls of monotonically increasing keys and low cardinality, and consistent hashing."
sidebar_position: 18
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is a shard key, what makes a disastrous shard key in a distributed database, and why are monotonically increasing keys lethal? How does consistent hashing with virtual nodes resolve re-sharding storms?"

A **shard key** is the column the router looks at to decide which physical machine a row lives on. Pick a good one and writes spread evenly across every machine. Pick a bad one and one machine melts under 100% load while 99 others sit idle. This one decision is close to irreversible once you're running in production, which is exactly why it comes up in interviews.

---

### What makes a shard key good

1. **High cardinality** — millions of distinct values (UUIDs, user IDs), not a handful (status, country).
2. **Even write spread** — concurrent writes land on different shards, not the same one.
3. **Matches your real queries** — your most frequent queries filter by this key, so they hit one shard instead of broadcasting to all of them.

---

### What makes a shard key disastrous

**1. Anything monotonically increasing — `created_at`, auto-increment `id`.**

If you range-partition by time, whichever shard holds "now" gets 100% of the writes, forever, while every other shard sits idle holding cold history:

<Diagram>
<Row>
<Box title="Shard 1: 2024 orders" accent="#a1a1aa"><Field icon="💤" code="0% writes" hint="idle cold storage" variant="neutral" /></Box>
<Box title="Shard 2: 2025 orders" accent="#a1a1aa"><Field icon="💤" code="0% writes" hint="idle cold storage" variant="neutral" /></Box>
<Box title="Shard 3: 2026 orders (now)" accent="#fb7185"><Field icon="🔥" code="100% of writes" hint="every new row lands here" variant="neutral" /></Box>
</Row>
</Diagram>

Your 100-node cluster's write capacity just collapsed to the capacity of one node. The fix: never shard on a raw time or sequence value — hash it instead (`MurmurHash3(id)`), or salt it.

**2. Low cardinality — `country_code`, `gender`, `is_active`.**

Shard 50 million users by `country_code` and the US shard balloons to 40 million rows while the Iceland shard holds 20,000. Worse: you can never have more shards than there are distinct countries (~195), so this caps your scalability permanently, not just today.

**3. Celebrity skew — `creator_id`, `tenant_id`.**

On a multi-tenant platform sharded by `tenant_id`, 99.9% of tenants do 5 requests/second — fine. But one huge tenant (a viral creator, a big retail customer) does 150,000 requests/second, and that single tenant's shard melts from thread exhaustion while every other shard is bored.

---

### The hidden cost of not matching your queries: scatter-gather

If a query doesn't filter by the shard key, the router has no way to know which shard holds the answer — it has to ask *all* of them and wait for the slowest one:

```sql
-- Table is sharded on user_id, but this query doesn't filter on it:
SELECT * FROM orders WHERE tracking_code = 'FDX-9988112';
```

This matters more than it sounds like, because of how probability stacks up across many shards. If a single shard has a 1% chance of being slow (p99 latency), and you fan a query out across 100 shards, the chance that *at least one* of them is slow is:

$$P(\text{delayed}) = 1 - (1 - 0.01)^{100} \approx 63.4\%$$

So nearly two-thirds of these broadcast queries get stuck waiting on a straggler. That's why scatter-gather queries get banned from hot paths in any serious sharded system.

---

### Fixing celebrity hotspots

**1. Salt the key.** For a viral tenant, append a random digit to spread its writes: `tenant_id + "_" + random(0,9)`. Now that one tenant's writes land across 10 shards instead of 1. The cost: reading that tenant's data back means querying all 10 salted buckets and merging the results.

**2. Add a secondary index on a different key.** Systems like DynamoDB let you maintain an async index sharded by a *different* attribute (say, `tracking_code` instead of `user_id`) — you trade some storage and a bit of staleness for a fast lookup path that doesn't need the primary shard key.

---

### Why you can't just use `hash(key) % N`

Plain modular hashing works great — until you add a node. Change $N$ from 10 to 11 and the divisor changes for *every single key*, so roughly 91% of all your data has to move at once. That's a network and I/O storm nobody wants during a routine scale-up.

**Consistent hashing fixes this.** Picture a circular ring of numbers from 0 to $2^{32}-1$. Both nodes and keys get a position on that ring. A key belongs to whichever node's position is the next one clockwise from it.

Add a new node, and it only steals keys from its one clockwise neighbor — nothing else on the ring moves:

$$\text{Keys migrated} = \frac{1}{N+1} \text{ of the dataset}$$

That's a massive improvement over "almost everything moves."

**One catch: virtual nodes.** If each physical server gets exactly one point on the ring, random chance means some servers end up owning a much bigger arc than others — one might get 40% of all keys, another 5%. The fix is to give each physical server many points on the ring (e.g. 256 virtual nodes), which averages out the unevenness. The more virtual nodes per server, the more uniform the spread.

---

### Say this in the interview

*"A good shard key has high cardinality, spreads writes evenly, and matches your most frequent query filters. The classic mistakes are sharding on a monotonically increasing value like a timestamp — which funnels 100% of writes to one shard — low-cardinality columns that cap how far you can ever scale, and skewed keys where one tenant or creator dominates traffic. Queries that don't filter by the shard key have to broadcast to every shard, and with enough shards, tail-latency math guarantees most of those queries get stuck waiting on a slow node. For re-sharding without moving most of the dataset, consistent hashing restricts migration to about 1/(N+1) of the keys when a node is added, and virtual nodes smooth out the uneven distribution a single ring position per server would otherwise cause."*

---

### Code: consistent hashing with virtual nodes

This script builds a hash ring, distributes 10,000 keys across 4 nodes, adds a 5th node, and measures how few keys actually need to move.

```python
"""
Consistent Hashing with Virtual Nodes (Vnodes) Simulator
Demonstrates:
  1. Clockwise token ring key assignment
  2. Uniform distribution via virtual nodes (vnodes)
  3. Minimal key reassignment when adding/removing physical nodes
"""

import hashlib
import bisect
from typing import Dict, List, Set

class ConsistentHashRing:
    def __init__(self, vnodes_per_node: int = 100):
        self.vnodes_per_node = vnodes_per_node
        self.ring: List[int] = []                    # Sorted list of virtual token hashes
        self.vnode_to_node: Dict[int, str] = {}     # token_hash -> physical_node_id
        self.nodes: Set[str] = set()

    def _hash(self, key: str) -> int:
        # MD5 128-bit integer hash space [0, 2^128 - 1]
        return int(hashlib.md5(key.encode('utf-8')).hexdigest(), 16)

    def add_node(self, node_id: str) -> None:
        self.nodes.add(node_id)
        for i in range(self.vnodes_per_node):
            vnode_key = f"{node_id}#vnode_{i}"
            token = self._hash(vnode_key)
            self.vnode_to_node[token] = node_id
            bisect.insort(self.ring, token)

    def remove_node(self, node_id: str) -> None:
        if node_id not in self.nodes:
            return
        self.nodes.remove(node_id)
        for i in range(self.vnodes_per_node):
            vnode_key = f"{node_id}#vnode_{i}"
            token = self._hash(vnode_key)
            del self.vnode_to_node[token]
            idx = bisect.bisect_left(self.ring, token)
            if idx < len(self.ring) and self.ring[idx] == token:
                del self.ring[idx]

    def get_node(self, key: str) -> str:
        """Finds the first node clockwise on the token ring."""
        if not self.ring:
            raise RuntimeError("Ring is empty")
        key_hash = self._hash(key)
        # Binary search for the first vnode token >= key_hash
        idx = bisect.bisect_right(self.ring, key_hash)
        # If past the end of the ring, wrap around clockwise to index 0
        if idx == len(self.ring):
            idx = 0
        return self.vnode_to_node[self.ring[idx]]


def main():
    print("=== Consistent Hashing with Virtual Nodes Simulation ===\n")
    ring = ConsistentHashRing(vnodes_per_node=200)

    # Initial cluster of 4 physical database nodes
    initial_nodes = ["db_server_0", "db_server_1", "db_server_2", "db_server_3"]
    for n in initial_nodes:
        ring.add_node(n)

    # Generate 10,000 synthetic customer keys
    num_keys = 10_000
    keys = [f"customer_session_uuid_{i}" for i in range(num_keys)]

    # Initial key mapping
    initial_mapping = {k: ring.get_node(k) for k in keys}

    # Evaluate initial distribution uniformity
    distribution: Dict[str, int] = {}
    for node in initial_mapping.values():
        distribution[node] = distribution.get(node, 0) + 1

    print(f"--- Initial Distribution Across 4 Nodes ({num_keys} keys) ---")
    for node, count in sorted(distribution.items()):
        percentage = (count / num_keys) * 100
        print(f"  {node}: {count} keys ({percentage:.1f}%) [Ideal: 25.0%]")

    # Scale cluster: Add a 5th node
    print("\n--- Scaling Event: Adding 'db_server_4' to Cluster ---")
    ring.add_node("db_server_4")

    # Evaluate how many keys moved
    new_mapping = {k: ring.get_node(k) for k in keys}
    keys_moved = sum(1 for k in keys if initial_mapping[k] != new_mapping[k])
    migration_pct = (keys_moved / num_keys) * 100
    theoretical_pct = (1.0 / 5.0) * 100

    print(f"Keys migrated to new node: {keys_moved} / {num_keys} ({migration_pct:.1f}%)")
    print(f"Theoretical minimal migration (1/(N+1)): {theoretical_pct:.1f}%")
    print("Notice: Under modular hashing (hash % N), ~80% of all keys would have moved!")

if __name__ == "__main__":
    main()
```
