---
id: 8-disk-scheduling-fcfs-sstf-scan-cscan
title: "Disk Scheduling Problem: FCFS, SSTF, SCAN, and C-SCAN Head Movement"
description: "Calculate total disk head movement across 200 tracks for FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK scheduling algorithms and evaluate starvation tradeoffs."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A disk has 200 tracks (0 to 199) with the read/write head currently at track 53. For the request queue `(98, 183, 37, 122, 14, 124, 65, 67)`, calculate the total head movement in tracks for FCFS, SSTF, SCAN, and C-SCAN (assuming upward initial movement). How do LOOK and C-LOOK improve upon these elevator algorithms?"

---

## 1. Executive Summary & Problem Parameters

On magnetic hard disk drives (HDDs), mechanical head movement (**seek time**) dominates I/O latency. Disk scheduling algorithms reorder pending read/write requests to minimize total head movement, prevent mechanical thrashing, and ensure fair latency.

### Problem Specifications:
- **Total Disk Tracks:** 200 (numbered `0` to `199`).
- **Initial Head Position:** Track `53`.
- **Request Queue (8 requests):** `[98, 183, 37, 122, 14, 124, 65, 67]`
- **Sorted Requests (for reference):** `14, 37, 65, 67, 98, 122, 124, 183`
- **Initial Movement Direction:** Toward larger track numbers (Upward / Inward).

---

## 2. Part 1: First-Come, First-Served (FCFS)

FCFS services requests in their exact arrival order without reordering.

### Head Movement Calculation Table:

| Move Step | Track Transition | Distance Calculation | Tracks Traversed |
| :---: | :---: | :---: | :---: |
| **1** | 53 -> 98 | \|98 - 53\| | 45 |
| **2** | 98 -> 183 | \|183 - 98\| | 85 |
| **3** | 183 -> 37 | \|37 - 183\| | 146 |
| **4** | 37 -> 122 | \|122 - 37\| | 85 |
| **5** | 122 -> 14 | \|14 - 122\| | 108 |
| **6** | 14 -> 124 | \|124 - 14\| | 110 |
| **7** | 124 -> 65 | \|65 - 124\| | 59 |
| **8** | 65 -> 67 | \|67 - 65\| | 2 |

- **Total Head Movement (FCFS):** 45 + 85 + 146 + 85 + 108 + 110 + 59 + 2 = **640 tracks**
- **Analysis:** FCFS causes severe thrashing. The head swings violently across the platter (from 183 down to 37, back to 122, down to 14), maximizing mechanical wear and latency.

---

## 3. Part 2: Shortest Seek Time First (SSTF)

SSTF selects the pending request closest to the current head position at each step (greedy local optimization).

### Greedy Trajectory Decisions:
1. At **53**: Distances to pending requests: `65` (12), `37` (16). Closest is **65**.
2. At **65**: Closest is **67** (dist 2).
3. At **67**: Distances: `37` (dist 30), `98` (dist 31). Closest is **37**.
4. At **37**: Closest is **14** (dist 23).
5. At **14**: Lower requests exhausted. Closest remaining: **98** (dist 84).
6. At **98**: Closest is **122** (dist 24).
7. At **122**: Closest is **124** (dist 2).
8. At **124**: Only **183** remains (dist 59).

### Head Movement Calculation Table:

| Move Step | Track Transition | Distance Calculation | Tracks Traversed |
| :---: | :---: | :---: | :---: |
| **1** | 53 -> 65 | \|65 - 53\| | 12 |
| **2** | 65 -> 67 | \|67 - 65\| | 2 |
| **3** | 67 -> 37 | \|37 - 67\| | 30 |
| **4** | 37 -> 14 | \|14 - 37\| | 23 |
| **5** | 14 -> 98 | \|98 - 14\| | 84 |
| **6** | 98 -> 122 | \|122 - 98\| | 24 |
| **7** | 122 -> 124 | \|124 - 122\| | 2 |
| **8** | 124 -> 183 | \|183 - 124\| | 59 |

- **Total Head Movement (SSTF):** 12 + 2 + 30 + 23 + 84 + 24 + 2 + 59 = **236 tracks**
- **Analysis:** Cuts total seek movement by **63%** compared to FCFS. However, SSTF is prone to **starvation**: if new requests keep arriving near track 65, peripheral tracks (14 or 183) may wait indefinitely.

---

## 4. Part 3: SCAN (Elevator Algorithm)

SCAN sweeps in one direction, servicing requests along its path until it hits the **physical edge of the disk (track 199)**. It then reverses direction and sweeps toward the opposite edge.

### Trajectory Steps (Moving Upward First):
- **Phase 1 (Upward Sweep to Boundary 199):** `53 -> 65 -> 67 -> 98 -> 122 -> 124 -> 183 -> 199`
- **Phase 2 (Downward Sweep after Reversal):** `199 -> 37 -> 14`

### Head Movement Calculation Table:

| Phase | Track Transition | Distance Calculation | Tracks Traversed |
| :---: | :---: | :---: | :---: |
| Upward | 53 -> 65 | \|65 - 53\| | 12 |
| Upward | 65 -> 67 | \|67 - 65\| | 2 |
| Upward | 67 -> 98 | \|98 - 67\| | 31 |
| Upward | 98 -> 122 | \|122 - 98\| | 24 |
| Upward | 122 -> 124 | \|124 - 122\| | 2 |
| Upward | 124 -> 183 | \|183 - 124\| | 59 |
| Edge | 183 -> 199 | \|199 - 183\| | 16 (Hits Upper Boundary) |
| Downward | 199 -> 37 | \|37 - 199\| | 162 |
| Downward | 37 -> 14 | \|14 - 37\| | 23 |

- **Total Head Movement (SCAN):** 12 + 2 + 31 + 24 + 2 + 59 + 16 + 162 + 23 = **331 tracks**
- **Mathematical Shortcut:**
  $$\text{Total} = (\text{Max Track} - \text{Start}) + (\text{Max Track} - \text{Lowest Request})$$
  $$\text{Total} = (199 - 53) + (199 - 14) = 146 + 185 = \mathbf{331\text{ tracks}}$$

---

## 5. Part 4: C-SCAN (Circular SCAN)

C-SCAN provides uniform waiting times by treating the disk tracks as a circular ring. The head sweeps upward servicing requests until it reaches boundary `199`. It then **jumps immediately back to track 0 without servicing requests**, and sweeps upward again to complete remaining lower requests.

### Trajectory Steps:
- **Phase 1 (Upward Sweep to 199):** `53 -> 65 -> 67 -> 98 -> 122 -> 124 -> 183 -> 199`
- **Phase 2 (Fast Return to 0):** `199 -> 0` (no requests serviced during return)
- **Phase 3 (Second Upward Sweep from 0):** `0 -> 14 -> 37`

### Head Movement Calculation Table:

| Phase | Track Transition | Distance Calculation | Tracks Traversed |
| :---: | :---: | :---: | :---: |
| Upward Sweep | 53 -> 199 | \|199 - 53\| | 146 |
| Reset Jump | 199 -> 0 | \|0 - 199\| | 199 (Return to start) |
| Second Sweep | 0 -> 14 | \|14 - 0\| | 14 |
| Second Sweep | 14 -> 37 | \|37 - 14\| | 23 |

- **Total Head Movement (C-SCAN including return jump):**
  $$\text{Total} = (199 - 53) + (199 - 0) + (37 - 0) = 146 + 199 + 37 = \mathbf{382\text{ tracks}}$$
- **Total Head Movement (Excluding return jump):** $146 + 37 = \mathbf{183\text{ tracks}}$  
  *(Note: In interview settings, clarify whether the return jump is counted as seek movement or considered an uncounted fast reset).*

---

## 6. Part 5: The Edge Optimization — LOOK & C-LOOK

SCAN and C-SCAN force the disk arm to travel all the way to cylinder boundaries `0` and `199`, even when no requests exist at the extremities. **LOOK** and **C-LOOK** inspect pending requests and "look" ahead, reversing or resetting as soon as the outermost requested track is serviced.

### 1. LOOK (Optimized SCAN):
- Only sweeps up to highest pending request (**183**), not 199!
- Reverses directly to lowest pending request (**14**):
  $$\text{Total} = (183 - 53) + (183 - 14) = 130 + 169 = \mathbf{299\text{ tracks}}$$
  *(Saves 32 tracks compared to SCAN).*

### 2. C-LOOK (Optimized C-SCAN):
- Sweeps up to highest request (**183**).
- Jumps directly to lowest request (**14**), not 0!
- Sweeps up to remaining lower request (**37**):
  $$\text{Total (with return jump)} = (183 - 53) + (183 - 14) + (37 - 14) = 130 + 169 + 23 = \mathbf{322\text{ tracks}}$$
  $$\text{Total (without return jump)} = (183 - 53) + (37 - 14) = 130 + 23 = \mathbf{153\text{ tracks}}$$
  *(Saves 60 tracks compared to C-SCAN).*

---

## 7. Comparative Scorecard & Engineering Tradeoffs

| Algorithm | Total Head Movement | Starvation Risk? | Key Advantage | Key Disadvantage |
| :--- | :---: | :---: | :--- | :--- |
| **SSTF** | **236 tracks** | High | Lowest local head movement; optimal for bursty localized workloads. | Severe starvation for peripheral tracks under heavy load. |
| **LOOK** | **299 tracks** | None | Avoids unnecessary travel to boundaries; low seek latency. | Edge requests wait slightly longer than center tracks. |
| **C-LOOK** | **322 tracks** | None | Uniform waiting times across all cylinders; highly predictable latency. | Higher total track count than LOOK due to reset jump. |
| **SCAN** | **331 tracks** | None | Simple elevator scheduling; eliminates starvation. | Unnecessary travel to physical disk boundary 199. |
| **C-SCAN** | **382 tracks** | None | Fairer response time distribution than SCAN. | Unnecessary travel to both boundaries (199 and 0). |
| **FCFS** | **640 tracks** | None | Zero scheduling overhead; strictly fair FIFO queue. | Mechanical thrashing and worst average seek latency. |

---

## 8. Modern Storage Reality: Why Disk Scheduling Is Obsolete for SSDs

1. **No Mechanical Seek Time:** Solid State Drives (SSDs) and NVMe storage devices rely on NAND flash memory chips. There are zero moving arms, read heads, or spinning platters. Any flash block can be accessed in microseconds regardless of its logical block address (LBA).
2. **Wear Leveling Conflicts:** An OS attempting to optimize LBA order on an SSD is fighting the internal Flash Translation Layer (FTL), which deliberately scrambles physical block allocations to prevent flash cell wear.
3. **Modern Linux I/O Schedulers:**
   - **`none`:** Default for modern high-performance NVMe drives. Dispatches requests directly to hardware submission queues with multi-queue support (`blk-mq`).
   - **`mq-deadline`:** Basic FIFO-with-deadline scheduler to prevent tail latency on SATA SSDs.
   - **`bfq` (Budget Fair Queueing):** Used only for rotational HDDs where seek optimization and bandwidth fairness matter.

---

## 9. Python Verification: Disk Scheduling Simulator

The following executable Python script implements and tests all 6 disk scheduling algorithms (FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK), outputting exact sequence paths and head movements:

```python
"""
Disk Scheduling Algorithms Simulator
Simulates: FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK
"""
from typing import List, Tuple


def disk_fcfs(start: int, requests: List[int]) -> Tuple[int, List[int]]:
    path = [start] + requests
    total = sum(abs(path[i] - path[i - 1]) for i in range(1, len(path)))
    return total, path


def disk_sstf(start: int, requests: List[int]) -> Tuple[int, List[int]]:
    pending = requests[:]
    current = start
    path = [start]
    total = 0

    while pending:
        closest = min(pending, key=lambda x: abs(x - current))
        total += abs(closest - current)
        current = closest
        path.append(current)
        pending.remove(current)

    return total, path


def disk_scan(start: int, requests: List[int], max_track: int = 199) -> Tuple[int, List[int]]:
    upper = sorted([r for r in requests if r >= start])
    lower = sorted([r for r in requests if r < start], reverse=True)

    path = [start] + upper + [max_track] + lower
    total = sum(abs(path[i] - path[i - 1]) for i in range(1, len(path)))
    return total, path


def disk_cscan(start: int, requests: List[int], max_track: int = 199) -> Tuple[int, List[int]]:
    upper = sorted([r for r in requests if r >= start])
    lower = sorted([r for r in requests if r < start])

    path = [start] + upper + [max_track, 0] + lower
    total = sum(abs(path[i] - path[i - 1]) for i in range(1, len(path)))
    return total, path


def disk_look(start: int, requests: List[int]) -> Tuple[int, List[int]]:
    upper = sorted([r for r in requests if r >= start])
    lower = sorted([r for r in requests if r < start], reverse=True)

    path = [start] + upper + lower
    total = sum(abs(path[i] - path[i - 1]) for i in range(1, len(path)))
    return total, path


def disk_clook(start: int, requests: List[int]) -> Tuple[int, List[int]]:
    upper = sorted([r for r in requests if r >= start])
    lower = sorted([r for r in requests if r < start])

    path = [start] + upper + lower
    total = sum(abs(path[i] - path[i - 1]) for i in range(1, len(path)))
    return total, path


if __name__ == "__main__":
    head_start = 53
    queue = [98, 183, 37, 122, 14, 124, 65, 67]
    disk_max = 199

    print("=" * 65)
    print("DISK SCHEDULING ALGORITHMS VERIFICATION")
    print(f"Start Head: {head_start} | Cylinder Range: 0 to {disk_max}")
    print(f"Request Queue: {queue}")
    print("=" * 65)

    algorithms = [
        ("FCFS", disk_fcfs(head_start, queue)),
        ("SSTF", disk_sstf(head_start, queue)),
        ("SCAN", disk_scan(head_start, queue, disk_max)),
        ("C-SCAN", disk_cscan(head_start, queue, disk_max)),
        ("LOOK", disk_look(head_start, queue)),
        ("C-LOOK", disk_clook(head_start, queue)),
    ]

    print(f"{'Algorithm':<10} | {'Total Head Movement':<22} | {'Trajectory Path'}")
    print("-" * 75)
    for name, (dist, path) in algorithms:
        path_str = " -> ".join(map(str, path))
        print(f"{name:<10} | {dist:4d} tracks            | {path_str}")
```