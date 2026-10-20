---
id: 3-bankers-algorithm-concept
title: "Banker's Algorithm: Safe States, Matrices & Deadlock Avoidance"
description: "How Dijkstra's Banker's Algorithm avoids deadlock by only granting a resource request if a safe order still exists afterward."
sidebar_position: 3
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the Banker's Algorithm? How does it model resource allocation, safe states, and avoid deadlock in multi-resource systems? Why is it rarely implemented in modern operating systems like Linux?"

The Banker's Algorithm, from Edsger Dijkstra, is a deadlock-avoidance strategy: before granting any resource request, check whether granting it still leaves at least one order in which every process can finish. If not, make the request wait.

---

### The analogy: the small-town banker

A bank manager has \$10,000 in the vault. Three contractors are building houses and have each been pre-approved for a maximum loan:

- Contractor A: up to \$7,000
- Contractor B: up to \$4,000
- Contractor C: up to \$9,000

So far they've been lent: A has \$2,000, B has \$2,000, C has \$3,000 — \$7,000 total, leaving \$3,000 in the vault. Each contractor's remaining need is just their max minus what they already have: A still needs \$5,000, B needs \$2,000, C needs \$6,000.

Now the requests come in:
- **C asks for \$4,000.** The vault only has \$3,000. Denied — not enough cash, C waits.
- **A asks for \$3,000.** The vault has exactly \$3,000. But if the banker hands it over, the vault hits \$0, and A still needs \$2,000 more with no way to get it — and nobody can repay anything to refill the vault. That's a path toward deadlock, so the banker **denies** this one too, even though there's technically enough cash.
- **B asks for \$2,000.** Granted — B now has its full \$4,000, finishes the house, and repays all \$4,000 back to the vault.
- The vault now has \$5,000 — enough to cover A's remaining need. A finishes and repays \$7,000. Now there's plenty left for C to finish too.

Since an order exists (B, then A, then C) where everyone eventually finishes and repays, the original state was **safe** — even though one particular request (A's \$3,000) had to be refused along the way.

---

### Safe, unsafe, and deadlocked are three different things

<Diagram>
<Box title="All possible system states" accent="#a1a1aa">
<Row>
<Box title="Safe State" accent="#34d399">
<Field icon="✅" code="a safe order exists" hint="every process can still finish eventually" variant="neutral" />
</Box>
<Box title="Unsafe State" accent="#f59e0b">
<Field icon="⚠️" code="no safe order exists" hint="might lead to deadlock — but might not" variant="neutral" />
<Box title="Deadlock" accent="#fb7185">
<Field icon="🔒" code="actual circular freeze" variant="neutral" />
</Box>
</Box>
</Row>
</Box>
</Diagram>

1. **Safe state:** there's at least one order to run the processes in where each one's remaining need can be covered by what's currently available plus what earlier processes give back.
2. **Unsafe state:** no such order can be guaranteed. This is *not* the same as deadlock — it just means the banker can no longer promise things won't go bad if everyone asks for their max at once.
3. **Deadlock:** an actual freeze — two or more processes stuck waiting on each other forever. It's one specific kind of unsafe state, not all of them.

---

### The four things it tracks

For n processes and m resource types:

1. **Available** — how many units of each resource type are currently free.
2. **Max** — the most of each resource type each process says it will ever need.
3. **Allocation** — how much of each resource type each process currently holds.
4. **Need** — what's left: `Need = Max − Allocation`, per process per resource.

---

### The two steps

**1. Checking if a state is safe.** Start with `Work = Available` and mark every process as unfinished. Repeatedly look for any unfinished process whose `Need` fits within `Work`. If one exists, pretend it finishes — add its `Allocation` back into `Work`, mark it finished, and repeat. If you get through every process this way, the state is safe and you've got a valid finishing order. If you get stuck with unfinished processes left over and none of them fit, the state is unsafe.

**2. Handling a request.** When a process asks for some amount of resources:
1. If the request is more than that process's declared `Need`, reject it outright — it's asking for more than it said it would ever need.
2. If the request is more than what's currently `Available`, it has to wait.
3. Otherwise, pretend to grant it: subtract from `Available`, add to that process's `Allocation`, subtract from its `Need`.
4. Run the safety check from step 1 on this pretend state. If it's still safe, make the grant real. If not, roll the pretend allocation back and make the process wait.

---

### Why real operating systems don't actually run this

Linux, macOS, and Windows don't implement the Banker's Algorithm, for a few practical reasons:

1. **Nobody knows their max upfront.** A real process can't declare in advance exactly how much memory, how many file handles, or how many sockets it will ever need — workloads are too dynamic.
2. **The process count keeps changing.** Threads and processes are constantly forking, spawning, and exiting, which the algorithm doesn't assume.
3. **The safety check itself is expensive.** Running it on every `malloc`, `mmap`, or `open` call would add real, visible latency to the most common operations in the system.
4. **It's overly conservative.** Because it assumes every process might ask for its full declared max at once, it ends up holding resources idle that would, in practice, never actually be needed.

What production kernels do instead:
- **Ostrich Algorithm:** ignore deadlock risk since it's rare enough not to matter in practice.
- **Static lock ordering:** always acquire kernel locks in the same fixed order, so a cycle can't form.
- **OOM killer:** on Linux, if memory actually runs out, the kernel picks a process to kill rather than trying to avoid the situation in advance.

---

### Say this in the interview

*"The Banker's Algorithm only grants a resource request if, after granting it, at least one order still exists where every process can finish using its declared maximum. It's not used in general-purpose OSes because processes can't realistically declare their peak resource needs upfront, and running the safety check on every allocation would be too slow."*

---

### Python: the full algorithm

```python
"""
Dijkstra's Banker's Algorithm Simulator
Demonstrates:
  1. Safe state detection and safe sequence derivation
  2. Speculative resource allocation
  3. Rejection of requests that trigger unsafe states
"""

from typing import List, Optional, Tuple

class BankersAlgorithm:
    def __init__(self, available: List[int], max_matrix: List[List[int]], allocation_matrix: List[List[int]]):
        self.num_processes = len(max_matrix)
        self.num_resources = len(available)
        self.available = list(available)
        self.max = [list(row) for row in max_matrix]
        self.allocation = [list(row) for row in allocation_matrix]
        # Calculate Need matrix: Need = Max - Allocation
        self.need = [
            [self.max[i][j] - self.allocation[i][j] for j in range(self.num_resources)]
            for i in range(self.num_processes)
        ]

    def is_safe_state(self) -> Tuple[bool, List[int]]:
        """Executes Safety Algorithm in O(m * n^2) time."""
        work = list(self.available)
        finish = [False] * self.num_processes
        safe_sequence = []

        while len(safe_sequence) < self.num_processes:
            found = False
            for p in range(self.num_processes):
                if not finish[p]:
                    # Check if Need[p] <= Work
                    if all(self.need[p][r] <= work[r] for r in range(self.num_resources)):
                        # Process p can finish; reclaim its allocation
                        for r in range(self.num_resources):
                            work[r] += self.allocation[p][r]
                        finish[p] = True
                        safe_sequence.append(p)
                        found = True
                        break
            if not found:
                return False, []  # Unsafe state

        return True, safe_sequence

    def request_resources(self, process_id: int, request: List[int]) -> bool:
        """Executes Resource-Request Algorithm with speculative rollback."""
        print(f"\n--- Process P{process_id} requests resources: {request} ---")

        # Step 1: Check if Request <= Need
        if not all(request[r] <= self.need[process_id][r] for r in range(self.num_resources)):
            print(f"ERROR: Process P{process_id} exceeded its declared maximum claim!")
            return False

        # Step 2: Check if Request <= Available
        if not all(request[r] <= self.available[r] for r in range(self.num_resources)):
            print(f"DENIED: Insufficient available resources. P{process_id} must wait.")
            return False

        # Step 3: Speculative Allocation
        for r in range(self.num_resources):
            self.available[r] -= request[r]
            self.allocation[process_id][r] += request[r]
            self.need[process_id][r] -= request[r]

        # Step 4: Run Safety Check
        is_safe, seq = self.is_safe_state()
        if is_safe:
            print(f"GRANTED: State remains SAFE. Valid execution path: {' -> '.join(f'P{x}' for x in seq)}")
            return True
        else:
            print("REJECTED: Granting request leads to an UNSAFE state (potential deadlock). Rolling back!")
            # Rollback
            for r in range(self.num_resources):
                self.available[r] += request[r]
                self.allocation[process_id][r] -= request[r]
                self.need[process_id][r] += request[r]
            return False


def main():
    print("=== Banker's Algorithm Safety & Deadlock Avoidance Test ===\n")
    # Resources: [A, B, C]
    # Total system instances: [10, 5, 7]
    available = [3, 3, 2]

    # Max matrix: 5 processes (P0 to P4), 3 resources
    max_matrix = [
        [7, 5, 3],  # P0
        [3, 2, 2],  # P1
        [9, 0, 2],  # P2
        [2, 2, 2],  # P3
        [4, 3, 3]   # P4
    ]

    # Current Allocation matrix
    allocation_matrix = [
        [0, 1, 0],  # P0
        [2, 0, 0],  # P1
        [3, 0, 2],  # P2
        [2, 1, 1],  # P3
        [0, 0, 2]   # P4
    ]

    banker = BankersAlgorithm(available, max_matrix, allocation_matrix)

    # 1. Initial State Safety Check
    is_safe, seq = banker.is_safe_state()
    print(f"Initial State Safe? {is_safe}")
    print(f"Initial Safe Sequence: {' -> '.join(f'P{x}' for x in seq)}")

    # 2. Test Safe Request: P1 requests [1, 0, 2]
    banker.request_resources(process_id=1, request=[1, 0, 2])

    # 3. Test Unsafe Request: P4 requests [3, 3, 0] (would drain available resources into an unsafe state)
    banker.request_resources(process_id=4, request=[3, 3, 0])

    # 4. Test Exceeding Max Claim: P0 requests [0, 2, 0] (its remaining need is [7, 4, 3], but let's test invalid)
    banker.request_resources(process_id=0, request=[8, 0, 0])

if __name__ == "__main__":
    main()
```
