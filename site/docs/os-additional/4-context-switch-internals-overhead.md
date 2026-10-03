---
id: 4-context-switch-internals-overhead
title: "Context Switch Internals: What Gets Saved & Why It's Pure Overhead"
description: "Deep dive into the CPU registers, program counter, stack pointer, PCB updates, cache invalidation, and memory overhead during thread and process context switches."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What exactly gets saved during a context switch? What is the technical difference between a mode switch, a thread switch, and a process switch, and why is context switching considered 'pure overhead'?"

A **Context Switch** is the low-level operating system mechanism that stores the complete hardware execution state of an active process or thread, allowing the CPU core to be reassigned to another task and later resumed without state corruption.

It is the operational engine behind preemptive multitasking and time-sharing operating systems.

---

### The ELI5 Analogy: The Shared Office Desk

Imagine a single shared desk (the CPU core) used by multiple accountants (Processes):
- You are working on Project A with a calculator, a notepad, and reference sheets spread across the desk.
- Suddenly, the manager says: *"Switch to Project B immediately."*
- You cannot leave your work on the desk. You must:
  1. Note the exact page and paragraph you were reading (Program Counter).
  2. Put your calculator numbers, active scratch notes, and papers into a manila folder (Saving CPU Registers).
  3. File that folder into a locked cabinet drawer (Saving to the Process Control Block - PCB).
  4. Pull out Project B's manila folder from the cabinet.
  5. Lay out Project B's papers and reset the calculator with Project B's numbers.
  6. Resume reading at Project B's saved line number.

**Why it is "Pure Overhead":** During the minutes spent packing, filing, and unpacking folders, **zero accounting work was accomplished**. No spreadsheets were balanced; no tax forms were completed. The system consumed energy exclusively on administrative maintenance.

---

### What Exactly Gets Saved?

When the OS scheduler decides to swap the active task, the kernel code (such as Linux's `__switch_to()` and `switch_to()`) executes low-level assembly routines to preserve the task's **hardware execution context** into its **Process Control Block (PCB)** or **Thread Control Block (TCB)**:

| Hardware Component | Specific Registers (x86-64) | Critical Role |
| :--- | :--- | :--- |
| **Instruction Pointer (PC)** | `RIP` | Memory address of the next instruction to execute upon resumption. |
| **Stack Pointer** | `RSP`, `RBP` | Top of the active call stack and the current base frame pointer. |
| **CPU Flags / Status** | `RFLAGS` | Condition codes (Zero flag `ZF`, Carry flag `CF`, Sign flag `SF`, Interrupt enable `IF`). |
| **General Purpose Registers** | `RAX`, `RBX`, `RCX`, `RDX`, `RSI`, `RDI`, `R8`–`R15` | In-flight arithmetic results, loop counters, and function argument variables. |
| **Floating Point & SIMD** | `XMM0`–`XMM15`, `YMM`, `ZMM` | Vectorized math and multimedia registers saved via `XSAVE` / `XRSTOR` instructions. |
| **Page Table Base Register** | `CR3` (x86) / `TTBR0` (ARM) | Pointer to the root of the process's 4-level page table hierarchy (PML4). |
| **Kernel / OS Accounting** | Process State, `pid`, Open File Descriptors, Signals | Scheduler state, pending POSIX signals, and virtual file system mappings. |

---

### The Three-Tier Hierarchy: Mode Switch vs. Thread Switch vs. Process Switch

A frequent trap in systems interviews is confusing a **User-to-Kernel Mode Switch** with a **Context Switch**:

```
                       LATENCY & OVERHEAD SPECTRUM
Fastest (50 - 100 ns) ───────────────────────────────────> Slowest (3 - 10 µs)
  [ Mode Switch ]          [ Thread Switch ]            [ Process Switch ]
  (Same Thread,            (Same Process,               (Different Process,
   User -> Kernel)          New Registers/Stack)         New Address Space & TLB)
```

| Dimension | Mode Switch (Syscall) | Thread Context Switch | Process Context Switch |
| :--- | :--- | :--- | :--- |
| **Trigger** | `syscall`, hardware interrupt, exception | Scheduler preemption, I/O wait, `pthread_yield()` | Time quantum expiration, blocking I/O, IPC |
| **Address Space** | **Unchanged.** User space remains mapped. | **Unchanged.** All threads share the same page table. | **Changed.** Memory maps are completely replaced. |
| **Page Table (`CR3`)** | **Untouched** | **Untouched** | **Swapped.** `CR3` reloaded with new process root table. |
| **TLB State** | Untouched | Retained (Warm TLB entries reused) | **Flushed** (or partitioned via PCID/ASID) |
| **Direct Latency** | $\sim 50\text{--}100\text{ ns}$ | $\sim 1\text{--}2\ \mu\text{s}$ | $\sim 3\text{--}5\ \mu\text{s}$ |
| **Cache Impact** | Minimal | Low (Shared heap/code cache) | **Severe.** L1/L2/L3 cache misses and cold misses. |

---

### Why Context Switching is "Pure Overhead"

In computer systems, "overhead" denotes computational work performed by the platform to manage execution rather than advancing the application's business logic.

During a context switch, the CPU spends thousands of cycles doing administrative housekeeping:

#### 1. Direct Overhead (Instruction Execution)
- **Kernel Code Path:** Executing interrupt handlers, scheduler heuristics (e.g., Linux CFS `pick_next_task()`), pushing registers to RAM/stack, and restoring registers.
- Zero user application instructions execute during this transition.

#### 2. Indirect Overhead (The Cache Thrashing Penalty)
The indirect costs are often an order of magnitude more expensive than the direct assembly instructions:
- **TLB Invalidation:** The Translation Lookaside Buffer is flushed. The incoming process experiences consecutive TLB misses, forcing high-latency 4-level memory walks (200–400 ns per miss) to resolve virtual addresses.
- **CPU Cache Pollution (L1 / L2 / L3):** The cache lines populated by Process A are displaced by Process B's working set. When Process A runs again, its cache lines are gone, triggering cold cache stalls until data is re-fetched from main memory.
- **Branch Target Buffer (BTB) Eviction:** Hardware branch predictors lose history, causing pipeline flushes on initial conditional branches.

---

### Summary

"A context switch stores the CPU hardware execution state (program counter, stack pointer, general-purpose registers, floating-point vectors, and page table root) into the PCB/TCB. It is considered pure overhead because the CPU executes administrative kernel instructions rather than application logic, while indirectly imposing severe latency penalties through TLB flushes, CPU cache pollution, and branch predictor invalidation."

---

### Python Verification: Thread vs. Process Context Switch Benchmarking

The following executable Python script benchmarks the measurable latency difference between in-process thread context switching and inter-process context switching using OS IPC pipes:

```python
"""
Context Switch Latency Benchmark: Threads vs Processes
Demonstrates:
  1. Thread switching overhead (shared memory space)
  2. Process switching overhead (isolated memory & OS scheduling)
"""

import time
import threading
import multiprocessing
from typing import Tuple

ITERATIONS = 50_000

def thread_ping_pong():
    """Measures latency of context switching between two threads using events."""
    e1 = threading.Event()
    e2 = threading.Event()

    def worker_1():
        for _ in range(ITERATIONS):
            e1.wait()
            e1.clear()
            e2.set()

    def worker_2():
        for _ in range(ITERATIONS):
            e2.wait()
            e2.clear()
            e1.set()

    t1 = threading.Thread(target=worker_1)
    t2 = threading.Thread(target=worker_2)

    start = time.perf_counter()
    t1.start()
    t2.start()
    e1.set()  # Kickstart ping-pong

    t1.join()
    t2.join()
    total_time = time.perf_counter() - start
    # 2 switches per iteration
    per_switch_us = (total_time / (ITERATIONS * 2)) * 1_000_000
    return total_time, per_switch_us


def proc_ping_worker(pipe_in, pipe_out, count):
    token = b"x"
    for _ in range(count):
        pipe_in.recv()
        pipe_out.send(token)


def process_ping_pong():
    """Measures latency of context switching between two processes using IPC pipes."""
    p1_recv, p2_send = multiprocessing.Pipe()
    p2_recv, p1_send = multiprocessing.Pipe()

    count = 20_000  # Smaller count due to higher process overhead
    proc = multiprocessing.Process(target=proc_ping_worker, args=(p2_recv, p2_send, count))
    proc.start()

    token = b"x"
    start = time.perf_counter()
    for _ in range(count):
        p1_send.send(token)
        p1_recv.recv()

    total_time = time.perf_counter() - start
    proc.join()
    per_switch_us = (total_time / (count * 2)) * 1_000_000
    return total_time, per_switch_us


def main():
    print("=== Context Switching Latency Benchmark ===\n")
    print(f"Measuring thread yield/switch latency ({ITERATIONS} cycles)...")
    _, thread_us = thread_ping_pong()
    print(f"Average Thread Switch Latency:  {thread_us:.2f} µs")

    print("\nMeasuring process IPC context switch latency (20,000 cycles)...")
    _, proc_us = process_ping_pong()
    print(f"Average Process Switch Latency: {proc_us:.2f} µs")

    ratio = proc_us / thread_us if thread_us > 0 else 0
    print(f"\nResult: Process context switching is ~{ratio:.1f}x heavier than thread switching.")
    print("Direct cause: Inter-process address space boundary, IPC trap, and kernel scheduler involvement.")

if __name__ == "__main__":
    main()
```