---
id: 8-pipes-vs-shared-memory-tradeoff
title: "Pipes vs. Shared Memory: Architectural & Performance Tradeoffs"
description: "Pipes route data through the kernel and handle synchronization for you. Shared memory skips the kernel for speed, but synchronization becomes your job."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the fundamental architectural tradeoff between Unix pipes and shared memory for Inter-Process Communication (IPC)? When would you choose one over the other?"

Two processes are isolated from each other by design — that's the whole point of a process. IPC (inter-process communication) is how you deliberately punch a hole through that isolation. Pipes and shared memory are opposite answers to "how much do you trust the kernel to manage that hole for you?"

---

### The analogy: the postman vs. the shared whiteboard

Two coworkers in locked, adjacent offices need to collaborate:

- **Pipes — the postal courier.** Worker A writes a note, hands it to a courier (the kernel), who walks it over and hands it to Worker B. Orderly and safe — nothing gets lost or mixed up, and if Worker B's inbox is full, the courier just makes Worker A wait. But every single note costs a courier trip.
- **Shared memory — the glass whiteboard.** The crew knocks a hole in the wall and installs a whiteboard both offices can see and write on. Worker A writes, Worker B sees it instantly — no courier, no delay. But if both grab a marker and write over each other's work at the same time, the result is garbage. There's no courier to stop them; they have to agree on a system themselves (locks).

<Diagram>
<Row>
<Box title="Pipes" accent="#60a5fa"><Field icon="📮" code="kernel copies data" hint="safe, but 2 copies + a syscall per transfer" variant="neutral" /></Box>
<Box title="Shared memory" accent="#f59e0b"><Field icon="🪟" code="direct shared RAM" hint="zero copies, but you handle locking" variant="neutral" /></Box>
</Row>
</Diagram>

---

### Pipes: the kernel does everything, including the waiting

A pipe is a one-way byte stream, fully managed by the kernel.

- **A ring buffer in the kernel.** On Linux, it's typically 16 pages (64KB), adjustable with `fcntl(fd, F_SETPIPE_SZ)`.
- **Two copies per transfer.** Data goes app → kernel buffer (`copy_from_user`) → other app (`copy_to_user`). You never touch the other process's memory directly.
- **The kernel handles blocking for you.** Read from an empty pipe and you sleep until data shows up. Write to a full one and you sleep until the reader catches up. Close all write ends and the reader gets `EOF`. Write to a closed read end and you get `SIGPIPE`.

One subtlety worth knowing: writes up to `PIPE_BUF` bytes (4096 on Linux) are atomic — two processes writing ≤4KB each to the same pipe will never have their bytes interleaved. Go over that limit and the kernel is free to interleave chunks from concurrent writers, which can corrupt a structured message.

---

### Shared memory: maximum speed, zero built-in safety

Shared memory (`shm_open()` + `mmap()`, or System V `shmget()`) is the fastest IPC there is, because it isn't really "communication" at the OS level at all — it's just two processes pointing at the same physical RAM.

- **Zero copies.** The OS sets up both processes' page tables so their virtual addresses map to the exact same physical frames. After that one-time setup, reads and writes are plain memory access — no syscalls, no copying, bus-speed throughput (>30 GB/s).
- **The kernel steps out of the data path entirely.** That's the speed, and also the danger: if Process A writes while Process B is reading the same spot, you get silent corruption. There's no automatic blocking, no automatic ordering — you have to build that yourself, typically with a process-shared mutex (`pthread_mutexattr_setpshared`), a POSIX semaphore, or a Linux `futex`.

---

### Comparison

| Dimension | Pipes (`pipe()`, `mkfifo`) | Shared Memory (`mmap()`, `shm_open()`) |
| :--- | :--- | :--- |
| **Data path** | One-way byte stream through a kernel buffer | Direct, random-access shared RAM |
| **Memory copies** | 2 (user → kernel → user) | 0 |
| **Syscalls per transfer** | One per `read()`/`write()` | None — only during setup |
| **Synchronization** | Automatic, handled by the kernel | Manual — you add the locks |
| **Throughput** | Limited by syscall + copy overhead | Limited only by RAM bus speed |
| **If the writer crashes** | Reader just gets a clean `EOF` | A lock held inside the crash stays locked forever |
| **Good for** | Shell pipelines (`ls \| grep`), simple streaming | Video pipelines, high-frequency trading, shared ML models |

---

### Say this in the interview

*"The tradeoff is kernel overhead versus synchronization complexity. Pipes copy data through a kernel buffer twice and cost a syscall per transfer, but the kernel handles blocking and ordering for you automatically. Shared memory maps the same physical RAM into both processes for true zero-copy, bus-speed access, but the kernel is completely out of the loop on synchronization — you're responsible for locks, and a crash mid-write can leave a lock stuck forever."*

---

### Code: measuring the throughput gap

```python
"""
IPC Performance Benchmark: Pipes vs Shared Memory
Demonstrates:
  1. Pipe transfer latency and throughput (double memory copy)
  2. Shared Memory zero-copy latency and throughput
"""

import time
import multiprocessing
from multiprocessing import shared_memory
import numpy as np

PAYLOAD_SIZE = 10 * 1024 * 1024  # 10 MB payload
CYCLES = 10

def pipe_sender(conn, data: bytes):
    for _ in range(CYCLES):
        conn.send_bytes(data)

def pipe_receiver(conn):
    for _ in range(CYCLES):
        _ = conn.recv_bytes()


def benchmark_pipes():
    data = b"X" * PAYLOAD_SIZE
    parent_conn, child_conn = multiprocessing.Pipe()

    p = multiprocessing.Process(target=pipe_sender, args=(child_conn, data))
    start = time.perf_counter()
    p.start()
    pipe_receiver(parent_conn)
    p.join()
    elapsed = time.perf_counter() - start

    mb_transferred = (PAYLOAD_SIZE * CYCLES) / (1024 * 1024)
    throughput = mb_transferred / elapsed
    return elapsed, throughput


def shm_worker(shm_name: str, size: int, lock, event_written, event_read):
    existing_shm = shared_memory.SharedMemory(name=shm_name)
    buf = existing_shm.buf
    for _ in range(CYCLES):
        event_written.wait()
        event_written.clear()
        # Direct zero-copy read from shared buffer
        _ = bytes(buf[:100])  # Inspect partial content
        event_read.set()
    existing_shm.close()


def benchmark_shared_memory():
    # Allocate 10MB of shared physical RAM
    shm = shared_memory.SharedMemory(create=True, size=PAYLOAD_SIZE)
    lock = multiprocessing.Lock()
    event_written = multiprocessing.Event()
    event_read = multiprocessing.Event()

    p = multiprocessing.Process(
        target=shm_worker,
        args=(shm.name, PAYLOAD_SIZE, lock, event_written, event_read)
    )
    p.start()

    raw_data = b"Y" * PAYLOAD_SIZE
    start = time.perf_counter()
    for _ in range(CYCLES):
        # Direct memory write into shared physical frame
        shm.buf[:PAYLOAD_SIZE] = raw_data
        event_written.set()
        event_read.wait()
        event_read.clear()

    elapsed = time.perf_counter() - start
    p.join()
    shm.close()
    shm.unlink()

    mb_transferred = (PAYLOAD_SIZE * CYCLES) / (1024 * 1024)
    throughput = mb_transferred / elapsed
    return elapsed, throughput


def main():
    print("=== IPC Performance Benchmark: Pipes vs Shared Memory ===")
    print(f"Transferring {PAYLOAD_SIZE / (1024 * 1024):.1f} MB payload across {CYCLES} iterations...\n")

    pipe_time, pipe_tput = benchmark_pipes()
    print(f"Pipes (Kernel Double-Copy):")
    print(f"  Total Time: {pipe_time:.3f} s | Throughput: {pipe_tput:6.1f} MB/s")

    shm_time, shm_tput = benchmark_shared_memory()
    print(f"\nShared Memory (Zero-Copy Direct RAM):")
    print(f"  Total Time: {shm_time:.3f} s | Throughput: {shm_tput:6.1f} MB/s")

    speedup = shm_tput / pipe_tput if pipe_tput > 0 else 1.0
    print(f"\nResult: Shared Memory achieved ~{speedup:.1f}x higher throughput than Pipes.")
    print("Direct cause: Avoided kernel user-space buffer copies and per-read/write system calls.")

if __name__ == "__main__":
    main()
```
