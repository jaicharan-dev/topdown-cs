---
id: 30-cap-theorem-sql-vs-nosql
title: "The CAP Theorem, Linearizability & Distributed Trade-Offs"
description: "The CAP Theorem (Consistency, Availability, Partition Tolerance), Linearizability vs. ACID Consistency, split-brain, and PACELC."
sidebar_position: 15
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the CAP theorem? Why is 'CA' a myth in distributed systems, what is the crucial difference between Consistency in CAP and Consistency in ACID, and how does the PACELC theorem extend CAP?"

Picture three machines in different data centers, and the network cable between two of them gets cut. Each side is still up and still has clients hitting it. Now you have to answer one question: do you keep answering requests, or do you stop and admit you might be wrong?

That's the whole CAP theorem. You can't have everything — pick two of three:

<Diagram>
<Row>
<Box title="Consistency" accent="#60a5fa"><Field icon="✅" code="every read gets the latest write" variant="neutral" /></Box>
<Box title="Availability" accent="#34d399"><Field icon="✅" code="every request gets a response" variant="neutral" /></Box>
<Box title="Partition tolerance" accent="#f59e0b"><Field icon="✅" code="keeps working despite network splits" variant="neutral" /></Box>
</Row>
</Diagram>

1. **Consistency** — every read gets the most recent write, or an error. No stale answers.
2. **Availability** — every request gets some answer, even if it might not be the latest.
3. **Partition tolerance** — the system keeps working even when nodes can't talk to each other.

---

### The classic interview trap: "C" in CAP vs. "C" in ACID

Interviewers like to ask this because the two are easy to confuse — and they mean completely different things:

- **"C" in ACID** means the data obeys your schema's rules: foreign keys, `CHECK` constraints, unique indexes. A balance can't go negative.
- **"C" in CAP** means *recency*: it feels like there's only one copy of the data in the world, no matter how many servers you've replicated it to. This is also called **linearizability**.

A system can satisfy ACID's "C" perfectly on every single node while still violating CAP's "C," because one node might be looking at slightly old data.

---

### Why "CA" doesn't really exist

Networks fail. Cables get cut, switches die, packets get dropped — this is a fact of physics, not a bug. So partition tolerance isn't really optional for anything running across a network; the only real choice is what you do *when* a partition happens:

```
                     Network partition happens
                     (nodes can't reach each other)
                              |
              ----------------------------------
              |                                |
      Choose Consistency (CP)          Choose Availability (AP)
   Reject writes on the minority    Accept writes on every side
   side to avoid split-brain        → data temporarily diverges
   (etcd, ZooKeeper, MongoDB)       (Cassandra, DynamoDB, Couchbase)
```

A single-node Postgres or MySQL instance can honestly call itself "CA" — but only because it isn't distributed, so a network partition between nodes isn't even a scenario that applies to it.

---

### How CP systems avoid split-brain: quorums

Say a 3-node cluster splits into two groups: Node A + Node B on one side, Node C alone on the other. If both sides kept accepting writes, you'd end up with two different, unmergeable versions of the truth — that's **split-brain**.

CP systems avoid this with a **majority quorum rule**: a group can only accept writes if it has more than half the nodes.

$$Q = \left\lfloor \frac{N}{2} \right\rfloor + 1$$

- The A+B side has 2 of 3 nodes, which meets the quorum of 2 — it keeps accepting writes.
- The C side has only 1 node, below quorum — it refuses all writes and returns errors instead. It gives up availability to protect consistency.

---

### Beyond CAP: what happens when nothing is broken?

CAP only describes the rare moment when a partition is actually happening. Daniel Abadi's **PACELC** extends the question to normal, healthy operation too:

*"If there's a Partition, do you pick Availability or Consistency? Else (normal conditions), do you pick Latency or Consistency?"*

| Database | PACELC | What it means |
| :--- | :--- | :--- |
| **MongoDB / etcd** | PC/EC | Picks Consistency during a partition, and also waits for replicas to sync during normal operation — trading latency for correctness either way. |
| **Cassandra / DynamoDB** | PA/EL | Picks Availability during a partition, and returns instantly from the nearest node normally — trading correctness for speed either way. |

---

### Say this in the interview

*"The CAP theorem says that during a network partition, a distributed system has to choose between consistency and availability — it can't have both. Partitions are inevitable in any networked system, so 'CA' isn't a real option for distributed databases; the real choice is CP or AP. CP systems like etcd use quorum majorities to reject writes on the minority side and avoid split-brain. AP systems like Cassandra accept writes everywhere and resolve conflicts later. The key trap is that 'consistency' means something different in each context: CAP's consistency is linearizability — the illusion of one single copy — while ACID's consistency is about schema and constraint correctness. PACELC extends the same trade-off to normal operation: pick latency or consistency even when nothing is broken."*

---

### Code: simulating a partition and quorum rejection

This script models a 3-node cluster, splits it into two groups, and shows the majority side accepting a write while the minority side is rejected to prevent split-brain.

```python
class DistributedCluster:
    def __init__(self, node_names):
        self.nodes = node_names
        self.data = {node: {} for node in node_names}
        self.partition_groups = [set(node_names)] # Initially healthy: all connected

    def create_partition(self, group1, group2):
        print(f"\n[!] NETWORK PARTITION OCCURRED! Split into {group1} and {group2}")
        self.partition_groups = [set(group1), set(group2)]

    def write_cp(self, target_node, key, value):
        # Find which partition group the target_node belongs to
        active_group = None
        for group in self.partition_groups:
            if target_node in group:
                active_group = group
                break

        quorum_needed = (len(self.nodes) // 2) + 1 # Majority = 2 out of 3
        active_nodes_count = len(active_group)

        print(f"[*] Attempting CP Write to '{target_node}': ({key}='{value}') | Group Size: {active_nodes_count}/{len(self.nodes)}")
        if active_nodes_count >= quorum_needed:
            # Majority partition: Write succeeds across connected nodes
            for node in active_group:
                self.data[node][key] = value
            print(f"    [+] SUCCESS: Quorum achieved ({active_nodes_count} >= {quorum_needed}). Data replicated to {active_group}")
            return True
        else:
            # Minority partition: REJECT write to prevent split-brain!
            print(f"    [-] ERROR 503: Quorum FAILED ({active_nodes_count} < {quorum_needed}). Write REJECTED to maintain Consistency!")
            return False

if __name__ == "__main__":
    cluster = DistributedCluster(["Node_A", "Node_B", "Node_C"])

    # 1. Normal Healthy Operation
    cluster.write_cp("Node_A", "user_101", "Alice")

    # 2. Partition Occurs: Node_A and Node_B stay connected; Node_C is isolated across severed link
    cluster.create_partition(["Node_A", "Node_B"], ["Node_C"])

    # 3. Write to Majority Partition (Node_A) -> Succeeds!
    cluster.write_cp("Node_A", "user_101", "Alice_Updated")

    # 4. Write to Minority Partition (Node_C) -> Rejected!
    cluster.write_cp("Node_C", "user_101", "Alice_Hacked")
```
