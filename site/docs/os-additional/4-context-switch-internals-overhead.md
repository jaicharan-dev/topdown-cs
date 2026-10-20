---
id: 4-context-switch-internals-overhead
title: "Context Switch Internals: What Gets Saved & Why It's Pure Overhead"
description: "What the CPU actually saves during a context switch, how a mode switch differs from a thread or process switch, and why it's all pure overhead."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What exactly gets saved during a context switch? What is the technical difference between a mode switch, a thread switch, and a process switch, and why is context switching considered 'pure overhead'?"

A context switch is how the OS pauses one task, saves everything about where it was, and resumes a different one later without losing any state.

---

### The analogy: the shared desk

One desk, several accountants, each on a different project.

1. You're mid-way through Project A: calculator, notepad, and reference sheets all spread out.
2. The manager says "switch to Project B, now."
3. You can't just leave your stuff on the desk. You have to: note exactly which line you were on, bundle your calculator numbers and scratch notes into a folder, file that folder in a cabinet, then pull out Project B's folder and lay it out, and finally resume reading at Project B's saved line.

While you're packing and unpacking folders, **zero accounting work happens**. That's why it's called pure overhead — the time spent switching doesn't move either project forward. It's purely administrative.

---

### What actually gets saved

When the kernel decides to swap the running task, it copies the CPU's hardware state into that task's Process Control Block (PCB) or Thread Control Block (TCB):

| What | Register(s) on x86-64 | Why it matters |
| :--- | :--- | :--- |
| **Instruction pointer** | `RIP` | Where to resume execution. |
| **Stack pointer** | `RSP`, `RBP` | Top of the call stack and current frame. |
| **CPU flags** | `RFLAGS` | Zero/carry/sign/interrupt-enable flags. |
| **General-purpose registers** | `RAX`–`RDX`, `RSI`, `RDI`, `R8`–`R15` | In-flight results, loop counters, arguments. |
| **Floating point / SIMD** | `XMM0`–`XMM15`, `YMM`, `ZMM` | Saved via `XSAVE`/`XRSTOR`. |
| **Page table root** | `CR3` (x86) / `TTBR0` (ARM) | Points at this process's memory map. |
| **Kernel bookkeeping** | pid, open file descriptors, pending signals | Scheduler and OS-level state. |

---

### Three different things people mix up: mode switch, thread switch, process switch

<Diagram>
<Row>
<Box title="Mode Switch" accent="#60a5fa">
<Field icon="⚡" code="~50-100 ns" hint="same thread, user → kernel" variant="neutral" />
</Box>
<Arrow />
<Box title="Thread Switch" accent="#f59e0b">
<Field icon="🔁" code="~1-2 µs" hint="same process, new registers/stack" variant="neutral" />
</Box>
<Arrow />
<Box title="Process Switch" accent="#fb7185">
<Field icon="🐢" code="~3-5 µs" hint="new address space, TLB flushed" variant="neutral" />
</Box>
</Row>
</Diagram>

| | Mode switch (syscall) | Thread switch | Process switch |
| :--- | :--- | :--- | :--- |
| **Triggered by** | `syscall`, interrupt, exception | Scheduler preemption, I/O wait, `pthread_yield()` | Time quantum expiry, blocking I/O, IPC |
| **Address space** | Unchanged | Unchanged — threads share the page table | Fully replaced |
| **Page table (`CR3`)** | Untouched | Untouched | Swapped for the new process's root table |
| **TLB** | Untouched | Stays warm | Flushed (or partitioned via PCID/ASID) |
| **Cost** | ~50-100 ns | ~1-2 µs | ~3-5 µs |
| **Cache impact** | Minimal | Low — heap/code cache still shared | Severe — cold misses across L1/L2/L3 |

---

### Why it's "pure overhead"

Overhead is work the system does to manage execution, not work that advances the actual program. During a switch:

**Direct cost:** the kernel runs interrupt handlers, scheduler logic (Linux's `pick_next_task()`), and the register save/restore code. None of that is application instructions — it's 100% bookkeeping.

**Indirect cost — usually the bigger one:**
- **TLB flush:** address translation gets slow again. The incoming process hits a string of TLB misses, each needing an expensive multi-level page-table walk (roughly 200-400 ns).
- **Cache pollution:** the previous process's cache lines get evicted by the new process's working set. When the old process runs again, its data isn't there anymore — cold cache stalls while it's re-fetched from RAM.
- **Branch predictor eviction:** the CPU's branch history gets wiped too, so early branches after a switch tend to mispredict.

---

### Say this in the interview

*"A context switch saves the program counter, stack pointer, general-purpose and floating-point registers, and the page table root into the PCB or TCB. It's pure overhead because the CPU spends that time on kernel bookkeeping instead of application logic — and the real cost isn't even the save/restore itself, it's the TLB flush and cold caches that follow."*

---

### Python: measuring the difference

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
