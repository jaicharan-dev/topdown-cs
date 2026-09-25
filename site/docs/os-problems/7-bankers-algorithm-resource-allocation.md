---
id: 7-bankers-algorithm-resource-allocation
title: "Banker's Algorithm Problem: Need Matrix, Safety Check & Request Evaluation"
description: "Solve a complete Banker's algorithm problem: compute the Need Matrix, execute the Safety Algorithm to find a safe sequence, and evaluate resource requests."
sidebar_position: 7
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Given 5 processes (P0 to P4) and 3 resource types with total instances A = 10, B = 5, C = 7, with given Allocation and Max matrices: (1) Compute the Need Matrix and Available vector, (2) Determine if the system is in a Safe State and provide the safe sequence, and (3) Evaluate whether an immediate request from P1 for (1, 0, 2) can be granted."

---

## 1. Executive Summary & Problem Formulation

The **Banker's Algorithm** (developed by Edsger Dijkstra) is a deadlock-avoidance algorithm for multi-instance resource systems. It guarantees that resource allocation never moves the system from a **Safe State** to an **Unsafe State** (a state where a deadlock cannot be mathematically avoided).

### System Matrices & Dimensions:
- Let $n = 5$ (processes $P_0, P_1, P_2, P_3, P_4$).
- Let $m = 3$ (resource types $A, B, C$).
- **Total System Resources:** $A = 10, B = 5, C = 7 \implies [10, 5, 7]$.

---

## 2. Part 1: Computing Available Vector and Need Matrix

### 1. The Available Vector Calculation
The **Available vector** reflects currently free, unallocated resources:

$$\text{Available}[j] = \text{Total}[j] - \sum_{i=0}^{n-1} \text{Allocation}[i][j]$$

- **Sum of Allocated Resources (Column-wise):**
  - Resource A: 0 + 2 + 3 + 2 + 0 = 7
  - Resource B: 1 + 0 + 0 + 1 + 0 = 2
  - Resource C: 0 + 0 + 2 + 1 + 2 = 5
  - $\text{Total Allocated} = [7, 2, 5]$
- **Current Available Vector:**
  - $A = 10 - 7 = 3$
  - $B = 5 - 2 = 3$
  - $C = 7 - 5 = 2$
  - $\mathbf{\text{Available} = [3, 3, 2]}$

### 2. The Need Matrix Calculation
The **Need matrix** represents the remaining resource claims each process may request before completing its task:

$$\text{Need}[i][j] = \text{Max}[i][j] - \text{Allocation}[i][j]$$

### Consolidated Resource Allocation Table

| Process | Allocation (A B C) | Max (A B C) | Need = Max - Allocation (A B C) |
| :---: | :---: | :---: | :---: |
| **P0** | (0, 1, 0) | (7, 5, 3) | (7, 4, 3) |
| **P1** | (2, 0, 0) | (3, 2, 2) | (1, 2, 2) |
| **P2** | (3, 0, 2) | (9, 0, 2) | (6, 0, 0) |
| **P3** | (2, 1, 1) | (2, 2, 2) | (0, 1, 1) |
| **P4** | (0, 0, 2) | (4, 3, 3) | (4, 3, 1) |

---

## 3. Part 2: Safety Algorithm Walkthrough

The Safety Algorithm maintains a boolean array `Finish[n] = [False, False, False, False, False]` and a working pool `Work = Available = [3, 3, 2]`. It repeatedly searches for an index $i$ where:

$$\text{Finish}[i] == \text{False} \quad \text{and} \quad \text{Need}[i] \le \text{Work}$$

When such a process is found, the kernel simulates its execution to completion, returning its allocated resources to the pool:

$$\text{Work} = \text{Work} + \text{Allocation}[i]$$

$$\text{Finish}[i] = \text{True}$$

### Execution Trace:

1. **Step 1: Inspect processes against Work = [3, 3, 2]**
   - $P_0$: $\text{Need}(7, 4, 3) \le (3, 3, 2)$? **False** ($7 > 3, 4 > 3, 3 > 2$).
   - $P_1$: $\text{Need}(1, 2, 2) \le (3, 3, 2)$? **True** ($1 \le 3, 2 \le 3, 2 \le 2$).
   - *Simulate $P_1$ completion:*
     $$\text{Work} = (3, 3, 2) + (2, 0, 0) = \mathbf{(5, 3, 2)}$$
     $$\text{Finish}[P_1] = \text{True}$$
     $$\text{Safe Sequence: } [P_1]$$

2. **Step 2: Inspect remaining processes against Work = [5, 3, 2]**
   - $P_2$: $\text{Need}(6, 0, 0) \le (5, 3, 2)$? **False** ($6 > 5$).
   - $P_3$: $\text{Need}(0, 1, 1) \le (5, 3, 2)$? **True** ($0 \le 5, 1 \le 3, 1 \le 2$).
   - *Simulate $P_3$ completion:*
     $$\text{Work} = (5, 3, 2) + (2, 1, 1) = \mathbf{(7, 4, 3)}$$
     $$\text{Finish}[P_3] = \text{True}$$
     $$\text{Safe Sequence: } [P_1, P_3]$$

3. **Step 3: Inspect remaining processes against Work = [7, 4, 3]**
   - $P_4$: $\text{Need}(4, 3, 1) \le (7, 4, 3)$? **True** ($4 \le 7, 3 \le 4, 1 \le 3$).
   - *Simulate $P_4$ completion:*
     $$\text{Work} = (7, 4, 3) + (0, 0, 2) = \mathbf{(7, 4, 5)}$$
     $$\text{Finish}[P_4] = \text{True}$$
     $$\text{Safe Sequence: } [P_1, P_3, P_4]$$

4. **Step 4: Inspect remaining processes against Work = [7, 4, 5]**
   - $P_0$: $\text{Need}(7, 4, 3) \le (7, 4, 5)$? **True** ($7 \le 7, 4 \le 4, 3 \le 5$).
   - *Simulate $P_0$ completion:*
     $$\text{Work} = (7, 4, 5) + (0, 1, 0) = \mathbf{(7, 5, 5)}$$
     $$\text{Finish}[P_0] = \text{True}$$
     $$\text{Safe Sequence: } [P_1, P_3, P_4, P_0]$$

5. **Step 5: Inspect final process against Work = [7, 5, 5]**
   - $P_2$: $\text{Need}(6, 0, 0) \le (7, 5, 5)$? **True** ($6 \le 7, 0 \le 5, 0 \le 5$).
   - *Simulate $P_2$ completion:*
     $$\text{Work} = (7, 5, 5) + (3, 0, 2) = \mathbf{(10, 5, 7)}$$
     $$\text{Finish}[P_2] = \text{True}$$
     $$\text{Safe Sequence: } [P_1, P_3, P_4, P_0, P_2]$$

### Safety Algorithm Result:
- **System State:** **SAFE**
- **Valid Safe Sequence:** **P1 -> P3 -> P4 -> P0 -> P2** (Alternative valid sequence: `P3 -> P1 -> P4 -> P0 -> P2`).
- **Mathematical Sanity Check:** Final Work vector $(10, 5, 7)$ exactly matches the total system resources.

---

## 4. Part 3: Resource-Request Algorithm Evaluation

Suppose process $P_1$ submits an immediate request:
$$\text{Request}_{P_1} = (1, 0, 2)$$

To determine if this request can be granted safely, the operating system executes the **Resource-Request Algorithm**.

### Step 1: Pre-Allocation Validity Checks
1. **Check 1: Does the request exceed the process's declared maximum need?**
   $$\text{Request}_{P_1} \le \text{Need}_{P_1}$$
   $$(1, 0, 2) \le (1, 2, 2) \implies \mathbf{True}$$
   *(Process has not violated its contractual upper bound).*

2. **Check 2: Are the requested resources currently available in the system?**
   $$\text{Request}_{P_1} \le \text{Available}$$
   $$(1, 0, 2) \le (3, 3, 2) \implies \mathbf{True}$$
   *(The system physically possesses sufficient free instances).*

### Step 2: Tentative (Hypothetical) State Modification
Because both checks pass, the OS kernel simulates granting the request:
$$\text{Available}_{\text{new}} = \text{Available} - \text{Request}_{P_1} = (3, 3, 2) - (1, 0, 2) = \mathbf{(2, 3, 0)}$$
$$\text{Allocation}[P_1]_{\text{new}} = (2, 0, 0) + (1, 0, 2) = \mathbf{(3, 0, 2)}$$
$$\text{Need}[P_1]_{\text{new}} = (1, 2, 2) - (1, 0, 2) = \mathbf{(0, 2, 0)}$$

### Step 3: Safety Check on Tentative State
Now test whether the system remains in a safe state with $\text{Work} = (2, 3, 0)$:

| Step | Work Vector | Process Tested | Need Vector | Need $\le$ Work? | Action / New Work Vector | Safe Sequence |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | (2, 3, 0) | P0 | (7, 4, 3) | ❌ False | Skip P0. | — |
| **2** | (2, 3, 0) | P1 | (0, 2, 0) | ✅ **True** | Run P1. Work = (2,3,0) + (3,0,2) = **(5, 3, 2)** | [P1] |
| **3** | (5, 3, 2) | P2 | (6, 0, 0) | ❌ False | Skip P2. | [P1] |
| **4** | (5, 3, 2) | P3 | (0, 1, 1) | ✅ **True** | Run P3. Work = (5,3,2) + (2,1,1) = **(7, 4, 3)** | [P1, P3] |
| **5** | (7, 4, 3) | P4 | (4, 3, 1) | ✅ **True** | Run P4. Work = (7,4,3) + (0,0,2) = **(7, 4, 5)** | [P1, P3, P4] |
| **6** | (7, 4, 5) | P0 | (7, 4, 3) | ✅ **True** | Run P0. Work = (7,4,5) + (0,1,0) = **(7, 5, 5)** | [P1, P3, P4, P0] |
| **7** | (7, 5, 5) | P2 | (6, 0, 0) | ✅ **True** | Run P2. Work = (7,5,5) + (3,0,2) = **(10, 5, 7)** | [P1, P3, P4, P0, P2] |

### Final Request Verdict:
- All 5 processes successfully execute to completion without deadlock.
- The tentative state is **SAFE**.
- **Decision:** **Grant Request_P1 = (1, 0, 2) immediately.**

---

## 5. Complexity Analysis & Production OS Critique

### Algorithmic Complexity:
- **Time Complexity:** $O(m \cdot n^2)$  
  *(In the worst case, the safety check iterates through all $n$ processes $n$ times, and comparing two vectors takes $m$ operations).*
- **Space Complexity:** $O(m \cdot n)$ to maintain the Allocation, Max, and Need matrices.

### Why Modern Operating Systems (Linux, Windows) Do Not Use Banker's:
1. **Unknown Maximum Demand:** Real-world processes (e.g., a web browser or database) cannot declare their peak resource allocations in advance. Memory and file handles grow dynamically based on runtime input.
2. **Dynamic Process Churn:** In modern systems, processes constantly fork, spawn threads, and terminate. The parameter $n$ is not constant.
3. **Severe Runtime Latency:** Running an $O(m \cdot n^2)$ safety simulation on every single dynamic system call (`malloc`, `open`, `socket`, `mmap`) would introduce an unacceptable CPU performance bottleneck.
4. **Kernel Alternative:** Modern OS kernels use **Ostrich Algorithm** (ignore rare deadlocks), **Strict Lock Ordering** (deadlock prevention), or an **Out-Of-Memory (OOM) Killer** to terminate rogue processes when physical capacity is exhausted.

---

## 6. Python Implementation: Banker's Algorithm

The following executable Python script implements the complete Banker's Algorithm, running safety checks and evaluating resource requests:

```python
"""
Banker's Algorithm Simulator: Safety Check and Resource-Request Evaluation
"""
from typing import List, Tuple, Optional


class BankersAlgorithm:
    def __init__(
        self,
        processes: List[str],
        total: List[int],
        allocation: List[List[int]],
        max_matrix: List[List[int]]
    ):
        self.processes = processes
        self.total = total
        self.n = len(processes)
        self.m = len(total)
        self.allocation = [row[:] for row in allocation]
        self.max_matrix = [row[:] for row in max_matrix]
        self.need = self._compute_need()
        self.available = self._compute_available()

    def _compute_need(self) -> List[List[int]]:
        return [
            [self.max_matrix[i][j] - self.allocation[i][j] for j in range(self.m)]
            for i in range(self.n)
        ]

    def _compute_available(self) -> List[int]:
        allocated_sums = [
            sum(self.allocation[i][j] for i in range(self.n))
            for j in range(self.m)
        ]
        return [self.total[j] - allocated_sums[j] for j in range(self.m)]

    def is_safe(self) -> Tuple[bool, List[str]]:
        work = self.available[:]
        finish = [False] * self.n
        safe_seq = []

        while len(safe_seq) < self.n:
            found = False
            for i in range(self.n):
                if not finish[i]:
                    # Check if Need[i] <= Work
                    if all(self.need[i][j] <= work[j] for j in range(self.m)):
                        for j in range(self.m):
                            work[j] += self.allocation[i][j]
                        finish[i] = True
                        safe_seq.append(self.processes[i])
                        found = True
                        break
            if not found:
                return False, []
        return True, safe_seq

    def request_resources(self, pid_idx: int, request: List[int]) -> Tuple[bool, str]:
        pid = self.processes[pid_idx]

        # 1. Check Request <= Need
        if not all(request[j] <= self.need[pid_idx][j] for j in range(self.m)):
            return False, f"Error: {pid} exceeded its declared maximum claim."

        # 2. Check Request <= Available
        if not all(request[j] <= self.available[j] for j in range(self.m)):
            return False, f"Wait: Resources not currently available for {pid}."

        # 3. Tentative allocation
        for j in range(self.m):
            self.available[j] -= request[j]
            self.allocation[pid_idx][j] += request[j]
            self.need[pid_idx][j] -= request[j]

        # 4. Check safety
        safe, seq = self.is_safe()
        if safe:
            return True, f"Request granted! System remains safe with sequence: {' -> '.join(seq)}"
        else:
            # Rollback
            for j in range(self.m):
                self.available[j] += request[j]
                self.allocation[pid_idx][j] -= request[j]
                self.need[pid_idx][j] += request[j]
            return False, "Request denied: Allocation would lead to an unsafe state."


if __name__ == "__main__":
    processes = ["P0", "P1", "P2", "P3", "P4"]
    total = [10, 5, 7]
    allocation = [
        [0, 1, 0],  # P0
        [2, 0, 0],  # P1
        [3, 0, 2],  # P2
        [2, 1, 1],  # P3
        [0, 0, 2]   # P4
    ]
    max_matrix = [
        [7, 5, 3],  # P0
        [3, 2, 2],  # P1
        [9, 0, 2],  # P2
        [2, 2, 2],  # P3
        [4, 3, 3]   # P4
    ]

    banker = BankersAlgorithm(processes, total, allocation, max_matrix)

    print("=" * 65)
    print("BANKER'S ALGORITHM VERIFICATION")
    print("=" * 65)
    print(f"Available Vector: {banker.available}")
    print("\nNeed Matrix:")
    for pid, row in zip(processes, banker.need):
        print(f"  {pid}: {row}")

    # Check initial safety
    safe, seq = banker.is_safe()
    print(f"\nInitial State Safe? {safe}")
    if safe:
        print(f"Safe Sequence: {' -> '.join(seq)}")

    # Evaluate Request from P1: (1, 0, 2)
    p1_idx = 1
    req_p1 = [1, 0, 2]
    print(f"\n--- Evaluating Request: P1 requests {req_p1} ---")
    granted, msg = banker.request_resources(p1_idx, req_p1)
    print(f"Granted? {granted}")
    print(f"Details: {msg}")
```