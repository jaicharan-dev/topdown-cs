---
id: 6-what-happens-when-read-is-called
title: "Tracing a System Call: End-to-End Execution of read()"
description: "Follow a read() call end-to-end: the libc wrapper, the trap into the kernel, the page cache check, DMA, and the wakeup."
sidebar_position: 6
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What happens under the hood when a user-level program calls read()? Trace the execution path through user space, CPU registers, system call dispatch, VFS, page cache, DMA, and hardware interrupts."

This is a favorite systems interview question, because answering it well touches almost everything: CPU privilege rings, calling conventions, virtual memory, the page cache, and device DMA — all in one call to `read()`.

---

### The analogy: ordering wine from the cellar

You're at a restaurant (user space). You can't walk into the cellar yourself, so here's what happens:

1. You write an order slip: *"Bottle #42, pour it"* — that's `read(fd, buffer, count)`.
2. You ring the service bell — that's the `syscall` instruction. You can't enter the kitchen; only the butler can.
3. The butler (the kernel) takes your slip and steps into the kitchen (kernel mode).
4. **Pantry check (page cache hit):** if bottle #42 is already open on the counter, the butler pours it immediately — no basement trip.
5. **Cellar fetch (page cache miss):** if the pantry is empty, staff go down to the cold basement (the disk) to get it.
6. **The nap (process blocking):** the basement trip takes a while, so you're told to nap (blocked state) while your table is given to someone else (context switch).
7. **The conveyor belt (DMA):** cellar staff load the bottle onto a dumbwaiter that carries it up to the pantry by itself — nobody has to carry it by hand.
8. **The wake-up:** the dumbwaiter dings (hardware interrupt). The butler pours your wine (`copy_to_user`), wakes you, and leaves.

---

### The path, step by step

<Diagram>
<Row>
<Box title="App" accent="#60a5fa"><Field icon="📞" code="read(fd, buf, n)" hint="libc wrapper loads registers" variant="neutral" /></Box>
<Arrow label="syscall trap" />
<Box title="Kernel: VFS" accent="#818cf8"><Field icon="🔍" code="check page cache" variant="neutral" /></Box>
</Row>
<Row>
<Box title="Cache hit" accent="#34d399"><Field icon="⚡" code="copy_to_user()" hint="~300 ns, no blocking" variant="neutral" /></Box>
<Box title="Cache miss" accent="#fb7185"><Field icon="🐢" code="block + DMA fetch" hint="~100 µs – 5 ms" variant="neutral" /></Box>
</Row>
<Row>
<Box title="Disk" accent="#a1a1aa"><Field icon="💿" code="DMA fills page cache" variant="neutral" /></Box>
<Arrow label="hardware interrupt" />
<Box title="App" accent="#60a5fa"><Field icon="✅" code="woken, data copied, sysret" variant="neutral" /></Box>
</Row>
</Diagram>

#### 1. The libc wrapper

Your app doesn't talk to the kernel directly — it calls `read(fd, buf, count)` in glibc, which loads the CPU registers per the x86-64 calling convention:
- `RAX = 0` — the syscall number for `sys_read`
- `RDI = fd`, `RSI = buf`, `RDX = count`

#### 2. The hardware trap

glibc executes the `syscall` instruction. The CPU:
- flips the privilege level from Ring 3 (user) to Ring 0 (kernel)
- saves the return address (`RIP`) into `RCX` and the flags (`RFLAGS`) into `R11`
- jumps to the kernel's entry point, stored in the `MSR_LSTAR` register (`entry_SYSCALL_64`)
- switches from the user stack to the kernel stack for this thread

#### 3. Dispatch through the VFS

The kernel reads the number in `RAX`, checks that `fd` is a valid file descriptor, and routes the call through a chain:

```
sys_read() ──> ksys_read() ──> vfs_read() ──> file->f_op->read_iter()
```

The Virtual File System (VFS) is what lets the same `read()` call work whether the target is an ext4 file, an NFS mount, a pipe, or a socket — the caller doesn't need to know which.

#### 4. The fork in the road: page cache hit or miss

- **Hit:** the data is already sitting in RAM, in the file's page cache. The kernel copies it straight to your buffer and returns. No disk touched, no blocking.
- **Miss:** the data isn't in RAM. The kernel allocates a page, builds a block I/O request (`struct bio`), and hands it to the disk driver.

#### 5. Blocking and the DMA transfer

On a miss, reading from disk takes real time, so the kernel:
1. marks the thread `TASK_UNINTERRUPTIBLE` (blocked) and puts it on the file's wait queue
2. calls `schedule()` to hand the CPU to some other task
3. lets the disk controller's DMA engine copy the data straight from disk into the kernel's page cache — without using any CPU cycles

#### 6. The interrupt and the wakeup

When DMA finishes, the disk fires a hardware interrupt. The CPU jumps to the disk driver's interrupt handler, which marks the `bio` complete and calls `wake_up_process()` — moving your thread back to `TASK_RUNNING`.

#### 7. Copy to user space and return

Once the scheduler picks your thread back up, the kernel copies the data from the page cache into your buffer with `copy_to_user()`, advances the file offset, puts the byte count in `RAX`, and runs `sysretq` — back to Ring 3, right where you left off.

---

### The double-copy problem, and how to skip it

A plain `read()` followed by a `write()` to a socket copies the data twice and crosses the user/kernel boundary four times:

```
[ Disk ] --DMA--> [ Page Cache ] --CPU copy--> [ User Buffer ] --CPU copy--> [ Socket Buffer ] --DMA--> [ NIC ]
```

Ways to skip some or all of that copying:
- **`mmap()`** maps the page cache straight into your process's address space — no `copy_to_user()` needed.
- **`sendfile()` / `splice()`** move data straight from the page cache to the socket buffer inside the kernel, skipping user space entirely — true zero-copy.
- **`io_uring`** replaces blocking syscalls with shared ring buffers for submitting and completing I/O, cutting syscall overhead for high-throughput workloads.

---

### Say this in the interview

*"A call to read() goes through a libc wrapper, then a syscall instruction that traps from Ring 3 to Ring 0, then VFS dispatch. The kernel checks the page cache first — on a hit, it copies straight to user space without blocking. On a miss, it queues a bio request, blocks the process, and lets DMA pull the data from disk while the CPU does other work. A hardware interrupt wakes the process once DMA finishes, the kernel copies the data out with copy_to_user(), and sysret returns control to user space."*

---

### Code: measuring the page cache's effect

```python
"""
Linux Page Cache vs Disk Read Latency Benchmark
Demonstrates:
  1. Cold read latency (requiring filesystem block access)
  2. Warm Page Cache hit latency (direct RAM retrieval)
"""

import os
import tempfile
import time

def benchmark_page_cache():
    print("=== Tracing read() Execution: Cold Read vs Page Cache Hit ===\n")

    # Create a temporary 10MB test file
    FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    with tempfile.NamedTemporaryFile(delete=False) as f:
        temp_path = f.name
        f.write(b"X" * FILE_SIZE)
        f.flush()
        os.fsync(f.fileno())  # Ensure bytes are flushed to disk

    try:
        # Read 1: Warm Page Cache Read (Recently written file resides in OS Page Cache)
        start_cache = time.perf_counter()
        with open(temp_path, "rb") as f:
            data = f.read()
        cache_time_ms = (time.perf_counter() - start_cache) * 1000

        print(f"File Size: {FILE_SIZE / (1024 * 1024):.1f} MB")
        print(f"Page Cache Read Time:  {cache_time_ms:6.2f} ms (In-memory copy_to_user)")

        # Evict cache hint (POSIX fadvise if available, or simulate cold seek latency)
        # On Linux: os.posix_fadvise(f.fileno(), 0, 0, os.POSIX_FADV_DONTNEED)
        if hasattr(os, "posix_fadvise"):
            with open(temp_path, "rb") as f:
                os.posix_fadvise(f.fileno(), 0, 0, os.POSIX_FADV_DONTNEED)
            start_cold = time.perf_counter()
            with open(temp_path, "rb") as f:
                data_cold = f.read()
            cold_time_ms = (time.perf_counter() - start_cold) * 1000
            print(f"Cold Disk Read Time:    {cold_time_ms:6.2f} ms (After cache invalidation)")
            speedup = cold_time_ms / cache_time_ms if cache_time_ms > 0 else 1.0
            print(f"Page Cache Speedup:    {speedup:.1f}x faster than physical storage!")
        else:
            print("Note: posix_fadvise not supported on current platform; Page Cache hit observed.")

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    benchmark_page_cache()
```
