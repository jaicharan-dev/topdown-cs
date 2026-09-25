---
id: 3-bankers-algorithm-concept
title: "Banker's Algorithm: Safe States, Matrices & Deadlock Avoidance"
description: "Explore the theoretical foundations of Dijkstra's Banker's Algorithm, Allocation, Max, and Need matrices, and state safety evaluation."
sidebar_position: 3
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the Banker's Algorithm? How does it model resource allocation, safe states, and avoid deadlock in multi-resource systems? Why is it rarely implemented in modern operating systems like Linux?"

The **Banker's Algorithm**, developed by Edsger Dijkstra, is a classic **deadlock avoidance** algorithm for multi-resource systems. It simulates resource allocations for predetermined maximum possible claims across all processes, evaluating state transitions before granting requests to ensure the system never enters an **unsafe state**.

---

### The ELI5 Analogy: The Small-Town Banker

Imagine a small-town bank manager (the Operating System) with **\$10,000 in cash** (Available Resources):
- Three contractors (Processes $A, B, C$) build houses.
- Each contractor has a **Credit Limit** (Max Resources needed to complete their build and pay back their loans):
  - Contractor $A$: Needs up to **\$7,000**
  - Contractor $B$: Needs up to **\$4,000**
  - Contractor $C$: Needs up to **\$9,000**

You grant initial loans (Allocated Resources):
- Loan to $A$: \$2,000 | Loan to $B$: \$2,000 | Loan to $C$: \$3,000
- **Total Lent:** \$7,000 $\implies$ **Cash left in vault:** **\$3,000**

```
Contractor Remaining Need:
Contractor A: $7,000 - $2,000 = $5,000
Contractor B: $4,000 - $2,000 = $2,000
Contractor C: $9,000 - $3,000 = $6,000
```

#### Safe State vs. Unsafe State
- **Contractor $C$ requests \$4,000:** The banker looks at the vault (\$3,000). The request exceeds available funds, so $C$ must wait.
- **Contractor $A$ requests \$3,000:** The vault has \$3,000. If the banker gives it to $A$, the vault drops to \$0. Contractor $A$ still needs \$2,000 more to finish and cannot return any money. The system freezes in **Deadlock**! The banker **denies** this request.
- **Contractor $B$ requests \$2,000:** The banker gives \$2,000 to $B$. Now $B$ has \$4,000, finishes the house, and repays the full \$4,000 back to the vault!
- The vault now holds **\$5,000**, which is enough to satisfy $A$'s remaining need (\$5,000). $A$ finishes and repays \$7,000. Finally, the bank satisfies $C$.
- Because an order exists ($\langle B \to A \to C \rangle$) where every contractor finishes and repays their loan, the system is in a **Safe State**.

---

### Safe State vs. Unsafe State vs. Deadlock

A critical distinction frequently tested in systems interviews:

```
┌────────────────────────────────────────────────────────┐
│                   ALL SYSTEM STATES                    │
│                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │      SAFE STATES      │  │     UNSAFE STATES     │  │
│  │                       │  │                       │  │
│  │ Guaranteed at least   │  │  ┌─────────────────┐  │  │
│  │ one safe execution    │  │  │    DEADLOCK     │  │  │
│  │ sequence exists.      │  │  │    (All paths   │  │  │
│  │ Zero possibility      │  │  │     blocked)    │  │  │
│  │ of deadlock.          │  │  └─────────────────┘  │  │
│  └───────────────────────┘  └───────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Safe State:** There exists at least one sequence $\langle P_1, P_2, \dots, P_n \rangle$ such that for each $P_i$, the resources that $P_i$ still needs can be satisfied by current available resources plus the resources already held by all preceding $P_j$ ($j < i$).
2. **Unsafe State:** No such sequence can be guaranteed. **An unsafe state is NOT necessarily a deadlock**, but it means a future sequence of requests could lead to deadlock without the OS being able to prevent it.
3. **Deadlock:** A state where two or more processes are permanently blocked waiting for resources held by each other. **Deadlock is a strict subset of unsafe states.**

---

### The Mathematical Model: The Four Data Structures

For $n$ processes and $m$ resource types:

1. **`Available[m]`:** A 1D array of length $m$. If `Available[j] = k`, there are $k$ instances of resource type $R_j$ currently free.
2. **`Max[n][m]`:** A 2D matrix of size $n \times m$. `Max[i][j]` defines the maximum demand of process $P_i$ for resource $R_j$.
3. **`Allocation[n][m]`:** A 2D matrix of size $n \times m$. `Allocation[i][j]` defines the number of instances of resource $R_j$ currently allocated to process $P_i$.
4. **`Need[n][m]`:** A 2D matrix of size $n \times m$. Represents remaining resources process $P_i$ may request to finish:
   $$\text{Need}[i][j] = \text{Max}[i][j] - \text{Allocation}[i][j]$$

---

### The Two Algorithmic Components

#### 1. The Safety Algorithm ($O(m \cdot n^2)$)
Determines whether a given system state is safe:
1. Initialize vectors: `Work = Available` (vector of length $m$) and `Finish[i] = False` for all $i \in \{0, \dots, n-1\}$.
2. Search for an index $i$ such that:
   - `Finish[i] == False`
   - $\text{Need}_i \le \text{Work}$ (component-wise comparison)
3. If such an $i$ exists:
   - $\text{Work} = \text{Work} + \text{Allocation}_i$
   - $\text{Finish}[i] = \text{True}$
   - Append $P_i$ to the safe sequence and return to Step 2.
4. If all $\text{Finish}[i] == \text{True}$, the system is in a **Safe State**. If some processes remain unfinished, the state is **Unsafe**.

#### 2. The Resource-Request Algorithm
When process $P_i$ requests a vector $\text{Request}_i$:
1. If $\text{Request}_i \le \text{Need}_i$, proceed to Step 2; else raise an error (**Process exceeded its declared maximum claim**).
2. If $\text{Request}_i \le \text{Available}$, proceed to Step 3; else $P_i$ must wait (**Resources currently unavailable**).
3. **Speculative Allocation:** The kernel pretends to allocate the requested resources:
   $$\text{Available} = \text{Available} - \text{Request}_i$$
   $$\text{Allocation}_i = \text{Allocation}_i + \text{Request}_i$$
   $$\text{Need}_i = \text{Need}_i - \text{Request}_i$$
4. Run the **Safety Algorithm**:
   - If **Safe**: The speculative state is confirmed; resources are physically granted.
   - If **Unsafe**: The speculative allocation is rolled back, and $P_i$ is suspended until resources free up.

---

### Why Modern Operating Systems Do NOT Use Banker's Algorithm

While mathematically elegant, the Banker's Algorithm is almost **never used in production general-purpose operating systems** (such as Linux, macOS, or Windows):

1. **Unknown Maximum Demand:** Processes rarely know in advance how much memory, file handles, or network sockets they will need. Dynamic workloads and user interactions make a priori declarations impossible.
2. **Dynamic Process Count:** The number of running processes ($n$) changes continuously as threads fork, spawn, and terminate.
3. **Severe Computational Overhead:** Running an $O(m \cdot n^2)$ safety matrix check on every dynamic memory allocation (`malloc`, `brk`, `mmap`) or file open (`open`) call would decimate system throughput.
4. **Conservative Underutilization:** Banker's Algorithm assumes the absolute worst-case scenario (every process simultaneously demanding its full `Max` claim), keeping resources artificially idle.

#### What Production OS Kernels Do Instead:
- **Ostrich Algorithm:** Ignore deadlock if it is sufficiently rare (the pragmatic Unix philosophy).
- **Static Lock Ordering:** Enforce strict hierarchy during kernel development (e.g., acquire `lock_A` before `lock_B`).
- **OOM Killer (Out-Of-Memory):** In Linux, if memory is exhausted, the kernel invokes `oom_killer` to score and terminate the most expendable memory-hungry process.

---

### Summary

"Banker's Algorithm avoids deadlock by verifying that every resource allocation preserves a safe state—one where at least one valid execution sequence exists for all processes to finish using maximum declared needs. Although theoretically sound, it is impractical for general-purpose OS kernels because processes cannot declare peak resource demands upfront and running the $O(m \cdot n^2)$ safety algorithm on every allocation incurs prohibitive latency."

---

### Python Verification: Banker's Algorithm & Safe Sequence Solver

The following executable Python script implements the full Banker's Algorithm, evaluating resource requests, computing safe execution paths, and rejecting allocations that lead to unsafe states:

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