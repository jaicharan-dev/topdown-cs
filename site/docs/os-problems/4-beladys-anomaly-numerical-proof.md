---
id: 4-beladys-anomaly-numerical-proof
title: "Bélády's Anomaly: Numerical Proof with 3 vs. 4 Frames"
description: "Step-by-step mathematical proof of Bélády's Anomaly using FIFO on the classic 12-page reference string, Stack Algorithm inclusion property, and Python simulation."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Prove Bélády's Anomaly using the reference string `(1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5)` comparing 3 frames against 4 frames under FIFO. Why do LRU and Optimal algorithms never exhibit this anomaly? Formulate your answer around Mattson's Stack Algorithm Inclusion Property."

---

## 1. Executive Summary & Theoretical Context

In standard operating system design, increasing the amount of physical memory (allocated page frames) is assumed to improve or at least preserve system throughput by reducing cache misses (page faults). 

In 1969, László Bélády demonstrated that under certain page replacement policies, most notably **FIFO (First-In, First-Out)**, allocating **more page frames can paradoxically result in more page faults**. This counterintuitive phenomenon is known as **Bélády's Anomaly**.

```
Reference String: 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5  (12 Requests)

3 Page Frames:  [ 9 Page Faults  |  3 Page Hits ]  -> Fault Rate: 75.0%
4 Page Frames:  [ 10 Page Faults |  2 Page Hits ]  -> Fault Rate: 83.3%  (DEGRADATION!)
```

---

## 2. Part 1: FIFO with 3 Page Frames

Under FIFO, memory behaves as a strict queue. The page residing in physical memory the longest is victimized first, irrespective of its frequency or recency of access.

### Step-by-Step Simulation (3 Frames)

| Step | Page Req | Frame 1 | Frame 2 | Frame 3 | FIFO Queue (Oldest -> Newest) | Result | Evicted Victim |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 1 | 1 | - | - | [1] | ❌ **Fault** | - |
| **2** | 2 | 1 | 2 | - | [1, 2] | ❌ **Fault** | - |
| **3** | 3 | 1 | 2 | 3 | [1, 2, 3] | ❌ **Fault** | - |
| **4** | 4 | 4 | 2 | 3 | [2, 3, 4] | ❌ **Fault** | 1 |
| **5** | 1 | 4 | 1 | 3 | [3, 4, 1] | ❌ **Fault** | 2 |
| **6** | 2 | 4 | 1 | 2 | [4, 1, 2] | ❌ **Fault** | 3 |
| **7** | 5 | 5 | 1 | 2 | [1, 2, 5] | ❌ **Fault** | 4 |
| **8** | 1 | 5 | 1 | 2 | [1, 2, 5] | ✅ **Hit** | - |
| **9** | 2 | 5 | 1 | 2 | [1, 2, 5] | ✅ **Hit** | - |
| **10** | 3 | 5 | 3 | 2 | [2, 5, 3] | ❌ **Fault** | 1 |
| **11** | 4 | 5 | 3 | 4 | [5, 3, 4] | ❌ **Fault** | 2 |
| **12** | 5 | 5 | 3 | 4 | [5, 3, 4] | ✅ **Hit** | - |

- **Total Page Faults (3 Frames):** **9**
- **Total Page Hits (3 Frames):** **3**
- **Fault Rate:** 9 / 12 = **75.0%**

---

## 3. Part 2: FIFO with 4 Page Frames

Now expand physical memory to 4 frames. Intuitively, having an extra frame should allow the working set to fit better. Let us trace the identical reference string:

### Step-by-Step Simulation (4 Frames)

| Step | Page Req | Frame 1 | Frame 2 | Frame 3 | Frame 4 | FIFO Queue (Oldest -> Newest) | Result | Evicted Victim |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 1 | 1 | - | - | - | [1] | ❌ **Fault** | - |
| **2** | 2 | 1 | 2 | - | - | [1, 2] | ❌ **Fault** | - |
| **3** | 3 | 1 | 2 | 3 | - | [1, 2, 3] | ❌ **Fault** | - |
| **4** | 4 | 1 | 2 | 3 | 4 | [1, 2, 3, 4] | ❌ **Fault** | - |
| **5** | 1 | 1 | 2 | 3 | 4 | [1, 2, 3, 4] | ✅ **Hit** | - |
| **6** | 2 | 1 | 2 | 3 | 4 | [1, 2, 3, 4] | ✅ **Hit** | - |
| **7** | 5 | 5 | 2 | 3 | 4 | [2, 3, 4, 5] | ❌ **Fault** | 1 |
| **8** | 1 | 5 | 1 | 3 | 4 | [3, 4, 5, 1] | ❌ **Fault** | 2 |
| **9** | 2 | 5 | 1 | 2 | 4 | [4, 5, 1, 2] | ❌ **Fault** | 3 |
| **10** | 3 | 5 | 1 | 2 | 3 | [5, 1, 2, 3] | ❌ **Fault** | 4 |
| **11** | 4 | 5 | 1 | 2 | 4 | [1, 2, 3, 4] | ❌ **Fault** | 5 |
| **12** | 5 | 5 | 1 | 2 | 4 | [2, 3, 4, 5] | ❌ **Fault** | 1 |

- **Total Page Faults (4 Frames):** **10**
- **Total Page Hits (4 Frames):** **2**
- **Fault Rate:** 10 / 12 = **83.3%**

---

## 4. Side-by-Side Root Cause Analysis

### Comparative Step Matrix

| Step | Request | 3-Frame State | 3-Frame Result | 4-Frame State | 4-Frame Result | Divergence Explanation |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1–4** | 1, 2, 3, 4 | {4, 2, 3} | 4 Faults | {1, 2, 3, 4} | 4 Faults | 3-frame evicted 1 at step 4; 4-frame kept all 4 pages. |
| **5** | 1 | {4, 1, 3} | ❌ Fault | {1, 2, 3, 4} | ✅ Hit | 4-frame benefited from extra capacity. |
| **6** | 2 | {4, 1, 2} | ❌ Fault | {1, 2, 3, 4} | ✅ Hit | 4-frame is temporarily ahead (2 faults vs. 0 in steps 5-6). |
| **7** | 5 | {5, 1, 2} | ❌ Fault | {5, 2, 3, 4} | ❌ Fault | **The Turning Point:** In 4 frames, page 1 was oldest -> evicted. In 3 frames, 1 reloaded at step 5 -> retained! |
| **8** | 1 | {5, 1, 2} | ✅ **Hit** | {5, 1, 3, 4} | ❌ **Fault** | 3-frame hits 1; 4-frame faults and evicts 2. |
| **9** | 2 | {5, 1, 2} | ✅ **Hit** | {5, 1, 2, 4} | ❌ **Fault** | 3-frame hits 2; 4-frame cascades into another fault. |
| **10** | 3 | {5, 3, 2} | ❌ Fault | {5, 1, 2, 3} | ❌ Fault | Both fault. |
| **11** | 4 | {5, 3, 4} | ❌ Fault | {1, 2, 3, 4} | ❌ Fault | Both fault. |
| **12** | 5 | {5, 3, 4} | ✅ **Hit** | {5, 1, 2, 4} | ❌ **Fault** | 3-frame retained 5; 4-frame evicted 5 at step 11 -> faults! |

### Why Did the 4-Frame System Cascade?
At step 4, the 3-frame system was forced to evict page 1. Consequently, when page 1 was referenced again at step 5, it was brought back into memory **with a fresh arrival timestamp**. 

In the 4-frame system, page 1 was never evicted at step 4; its original arrival timestamp at step 1 remained unchanged. Because FIFO ignores hits and does not refresh timestamps, page 1 became the oldest page in the 4-frame system and was promptly evicted at step 7 right before it was needed again at step 8. This caused a catastrophic cascade of faults in steps 8, 9, 11, and 12.

---

## 5. Mathematical Proof: Mattson's Stack Algorithms

To understand why LRU and Optimal are immune to Bélády's Anomaly, we look at the theoretical framework introduced by **Mattson et al. (1970)**.

### Definition: Inclusion Property
Let $B(t, m)$ denote the set of memory pages held in physical frames at time $t$ for a system allocated $m$ frames:

$$\forall t, \forall m: \quad B(t, m) \subseteq B(t, m+1)$$

An algorithm is classified as a **Stack Algorithm** if and only if it satisfies this **Inclusion Property** for all reference strings.

### Consequence on Page Faults
If an algorithm satisfies the inclusion property, every page reference $r_t$ that produces a cache hit in an $m$-frame system is guaranteed to be present in an $(m+1)$-frame system:

$$r_t \in B(t, m) \implies r_t \in B(t, m+1)$$

Therefore, any hit in an $m$-frame configuration is necessarily a hit in an $(m+1)$-frame configuration. Page faults can **only decrease or remain constant** as frame count grows:

$$F(m+1) \le F(m)$$

### Why LRU is a Stack Algorithm
At any step $t$, the state of LRU can be modeled as a stack $S_t = [p_1, p_2, \dots, p_k]$ ordered by recency of reference ($p_1$ is most recently referenced, $p_k$ is least recently referenced):
- For an $m$-frame system, $B(t, m) = \{p_1, p_2, \dots, p_m\}$.
- For an $(m+1)$-frame system, $B(t, m+1) = \{p_1, p_2, \dots, p_m, p_{m+1}\}$.

Evidently:
$$B(t, m) \subset B(t, m+1)$$

The set of pages in $m$ frames is always a strict subset of $(m+1)$ frames. Hence, **LRU can never exhibit Bélády's Anomaly**.

### Why Optimal (MIN) is a Stack Algorithm
Optimal replacement evicts the page whose next request occurs furthest in the future. At time $t$, pages are ranked by forward distance to next reference. An $m$-frame system retains the top $m$ pages with the smallest forward distances; an $(m+1)$-frame system retains the top $m+1$. Since the top $m$ elements are identical in both, the inclusion property holds strictly.

### Formal Proof: FIFO Violates the Inclusion Property
To prove FIFO is not a stack algorithm, a single counterexample demonstrating $B(t, m) \not\subseteq B(t, m+1)$ suffices.

From our numerical trace at step $t = 7$ (after inserting page 5):
- Memory state with $m = 3$ frames:
  $$B(7, 3) = \{1, 2, 5\}$$
- Memory state with $m = 4$ frames:
  $$B(7, 4) = \{2, 3, 4, 5\}$$

Observe that:
$$1 \in B(7, 3) \quad \text{but} \quad 1 \notin B(7, 4) \implies B(7, 3) \not\subseteq B(7, 4)$$

Because page 1 was in $B(7, 3)$ but missing from $B(7, 4)$, reference $r_8 = 1$ resulted in a **hit in 3 frames** but a **fault in 4 frames**, violating monotonicity.

---

## 6. Algorithm Vulnerability Classification

| Algorithm | Stack Algorithm? | Satisfies Inclusion Property? | Immune to Bélády's Anomaly? | Reason / Eviction Basis |
| :--- | :---: | :---: | :---: | :--- |
| **Optimal (MIN)** | Yes | Yes | **Immune** | Evicts furthest future reference. |
| **LRU** | Yes | Yes | **Immune** | Evicts longest past reference distance. |
| **LFU** (with recency tie-breaker) | Yes | Yes | **Immune** | Ordered by reference frequency and recency. |
| **FIFO** | No | No | **Vulnerable** | Evicts purely by arrival timestamp. |
| **Second Chance / Clock** | No | No | **Vulnerable** | Approximates FIFO with reference bits; queue order varies with capacity. |
| **Random Replacement** | No | No | **Vulnerable** | Eviction is stochastic; no subset guarantee. |

---

## 7. Interview Traps & Core Gotchas

> **Trap 1: "Does increasing frames under FIFO always increase page faults?"**  
> **Candidate Answer:** *"No. Bélády's anomaly is an anomaly, not a rule. In most practical strings, increasing frames decreases or maintains page faults. It only increases faults for specific pathological sequences where queue ordering misaligns."*

> **Trap 2: "Can Bélády's anomaly occur in modern CPU L1/L2/L3 hardware caches?"**  
> **Candidate Answer:** *"Hardware caches almost universally use true LRU, pseudo-LRU (tree-PLRU), or bit-PLRU replacement policies. Because LRU is a stack algorithm, it is mathematically immune to Bélády's anomaly. Furthermore, hardware caches are typically set-associative rather than fully associative FIFO queues."*

> **Trap 3: "Is Second-Chance (Clock) immune because it checks the reference bit?"**  
> **Candidate Answer:** *"No. Second-chance is fundamentally an enhancement of FIFO. The circular pointer advances according to FIFO arrival times. Adding frames alters pointer alignment and can trigger Bélády's anomaly."*

---

## 8. Python Simulation & Anomaly Detector

The following standalone script simulates FIFO and LRU page replacement policies across variable frame counts, proves the anomaly mathematically, and checks the Mattson inclusion property:

```python
"""
Belady's Anomaly and Mattson Stack Algorithm Simulator
Proves Belady's Anomaly on FIFO and verifies LRU inclusion property.
"""
from typing import List, Set, Tuple


def simulate_fifo(reference_string: List[int], num_frames: int) -> Tuple[int, List[dict]]:
    frames: List[int] = []
    faults = 0
    history = []

    for step, page in enumerate(reference_string, 1):
        if page in frames:
            result = "HIT"
            evicted = None
        else:
            result = "FAULT"
            faults += 1
            if len(frames) < num_frames:
                frames.append(page)
                evicted = None
            else:
                evicted = frames.pop(0)  # Evict oldest
                frames.append(page)

        history.append({
            "step": step,
            "page": page,
            "frames": set(frames),
            "result": result,
            "evicted": evicted
        })

    return faults, history


def simulate_lru(reference_string: List[int], num_frames: int) -> Tuple[int, List[dict]]:
    frames: List[int] = []  # Index 0: least recent, Index -1: most recent
    faults = 0
    history = []

    for step, page in enumerate(reference_string, 1):
        if page in frames:
            result = "HIT"
            frames.remove(page)
            frames.append(page)
            evicted = None
        else:
            result = "FAULT"
            faults += 1
            if len(frames) < num_frames:
                frames.append(page)
                evicted = None
            else:
                evicted = frames.pop(0)
                frames.append(page)

        history.append({
            "step": step,
            "page": page,
            "frames": set(frames),
            "result": result,
            "evicted": evicted
        })

    return faults, history


def check_inclusion_property(history_m: List[dict], history_m1: List[dict]) -> List[int]:
    """Returns steps where B(t, m) is NOT a subset of B(t, m+1)."""
    violations = []
    for h_m, h_m1 in zip(history_m, history_m1):
        step = h_m["step"]
        set_m: Set[int] = h_m["frames"]
        set_m1: Set[int] = h_m1["frames"]
        if not set_m.issubset(set_m1):
            violations.append(step)
    return violations


if __name__ == "__main__":
    ref_string = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]

    print("=" * 68)
    print("BELADY'S ANOMALY SIMULATION")
    print(f"Reference String: {ref_string}")
    print("=" * 68)

    print("\n--- Frame Count Analysis (FIFO vs. LRU) ---")
    print(f"{'Frames':<8} | {'FIFO Faults':<14} | {'LRU Faults':<12}")
    print("-" * 40)
    for frames in range(1, 7):
        f_fifo, _ = simulate_fifo(ref_string, frames)
        f_lru, _ = simulate_lru(ref_string, frames)
        anomaly_flag = " <-- ANOMALY!" if frames == 4 and f_fifo > 9 else ""
        print(f"{frames:<8} | {f_fifo:<14} | {f_lru:<12}{anomaly_flag}")

    # Detailed 3 vs 4 frames FIFO
    faults_3, hist_3 = simulate_fifo(ref_string, 3)
    faults_4, hist_4 = simulate_fifo(ref_string, 4)

    print("\n--- Mattson Inclusion Property Check (FIFO: 3 vs 4 Frames) ---")
    violations = check_inclusion_property(hist_3, hist_4)
    print(f"Steps where B(t, 3) is NOT a subset of B(t, 4): {violations}")
    for step in violations:
        set_3 = hist_3[step - 1]["frames"]
        set_4 = hist_4[step - 1]["frames"]
        diff = set_3 - set_4
        print(f"  Step {step}: B({step}, 3)={set_3}, B({step}, 4)={set_4} -> Missing elements: {diff}")

    # Detailed 3 vs 4 frames LRU
    lru_3, hist_lru_3 = simulate_lru(ref_string, 3)
    lru_4, hist_lru_4 = simulate_lru(ref_string, 4)
    lru_violations = check_inclusion_property(hist_lru_3, hist_lru_4)
    print(f"\n--- Mattson Inclusion Property Check (LRU: 3 vs 4 Frames) ---")
    print(f"Inclusion violations under LRU: {lru_violations} (Strictly 0 violations)")
```