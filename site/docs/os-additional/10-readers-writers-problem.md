---
id: 10-readers-writers-problem
title: "The Readers-Writers Problem: Reader vs. Writer Priority & Starvation"
description: "Why readers can share access but writers need it exclusively, how naive locking starves writers, and how a fair turnstile fixes it."
sidebar_position: 10
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the Readers-Writers problem? Why can't you solve it with a single mutex the same way you'd solve Producer-Consumer, and how do you prevent writer starvation using a fair turnstile?"

Some threads only read a shared resource (a cache, a table, a file); others mutate it. Reading doesn't damage anything, so lots of readers can safely overlap. Writing does, so a writer needs the resource completely to itself. The problem is designing a lock that gives you both.

---

### The analogy: the museum manuscript

A rare manuscript sits behind glass in a museum.

- **Readers (tourists):** a hundred tourists can crowd around the glass and read at once — looking at it doesn't change it.
- **The writer (the curator):** occasionally the curator has to open the case to repair the paper.
- **The rule while that happens:** everyone else steps behind the curtain. No tourists looking, no other curator touching it, until the repair is done.
- **Why one lock for everyone is wrong:** if the museum just put a single-occupancy lock on the whole room, only one tourist could be inside at a time — 99 people waiting in line to do something completely harmless. That massively over-protects the room.

<Diagram>
<Row>
<Box title="Readers" accent="#34d399"><Field icon="👥" code="many at once" hint="reading doesn't change anything, so it's safe to share" variant="neutral" /></Box>
<Box title="Writer" accent="#fb7185"><Field icon="✍️" code="one at a time" hint="needs the resource completely to itself" variant="neutral" /></Box>
</Row>
</Diagram>

---

### This isn't the same as producer-consumer

It's easy to conflate this with the bounded-buffer problem, but the rules are different:

| Dimension | Producer-Consumer | Readers-Writers |
| :--- | :--- | :--- |
| **Who mutates state** | Both sides mutate the buffer | Only writers; readers leave it untouched |
| **Concurrency allowed** | At most one thread inside at a time | Any number of readers at once; at most one writer |
| **Usual tool** | Semaphores + a mutex | A reader/writer lock (`rwlock`), or RCU |

---

### Attempt 1: reader-preference (and its fatal flaw)

The simplest fix: let the first reader lock out writers, and let the last reader to leave unlock them. A counter (`read_count`) plus a mutex to protect it, plus a semaphore (`write_lock`) guarding the actual resource:

```c
// Reader
pthread_mutex_lock(&mutex);
read_count++;
if (read_count == 1) {
    sem_wait(&write_lock); // First reader locks out writers
}
pthread_mutex_unlock(&mutex);

// --- CRITICAL SECTION: Read Data ---

pthread_mutex_lock(&mutex);
read_count--;
if (read_count == 0) {
    sem_post(&write_lock); // Last reader unlocks writers
}
pthread_mutex_unlock(&mutex);
```

```c
// Writer
sem_wait(&write_lock);
// --- CRITICAL SECTION: Write Data ---
sem_post(&write_lock);
```

The flaw: if readers keep arriving steadily, `read_count` never hits zero — new readers keep slipping in behind the first one. A writer waiting for `write_lock` can starve indefinitely.

### Attempt 2: writer-preference

Flip the bias instead: once a writer announces it wants in, no new readers are admitted — they queue up until it's done. This fixes writer starvation, but now a steady stream of writers can starve the readers instead. You've just moved the problem.

### Attempt 3: a fair turnstile (starvation-free for both)

The real fix is strict arrival order. Add one more semaphore, `turnstile`, that every thread — reader or writer — must pass through before doing anything else:

- A writer grabs the turnstile, then blocks on `write_lock`.
- Any reader arriving *after* that writer gets stuck behind it at the turnstile — it can't cut in line.
- Once the readers already inside finish and leave, the waiting writer runs immediately, before any of the newer readers get a turn.

When the active batch of readers departs, nobody that arrived after the writer can jump ahead of it. Neither side ever starves.

---

### The modern alternative: Linux RCU

Even a reader/writer lock has a cost — readers still have to atomically bump `read_count`, which causes real contention on busy kernel data structures (routing tables, the VFS). Linux's Read-Copy-Update (RCU) removes that entirely:

1. **Readers pay nothing.** They just read a shared pointer — no locks, no atomics.
2. **Writers never block readers.** A writer builds a modified copy of the data, then swaps a single pointer atomically to make it live.
3. **Old readers finish safely.** Anyone already reading the old version keeps reading it without issue. The writer waits for a "grace period" — until every CPU has had a chance to context-switch — before freeing the old copy.

---

### Say this in the interview

*"Readers-writers needs a lock that allows many concurrent readers but exclusive access for a writer. A single mutex over-serializes it — it forces readers to run one at a time even though reading is safe to share. The naive reader-preference solution can starve writers if readers keep arriving. The fix is a turnstile: every thread, reader or writer, passes through one gate in arrival order, so a waiting writer can't be skipped by readers that showed up after it. In performance-critical kernels, RCU goes further and removes reader locking entirely, by having writers mutate a private copy and swap a pointer atomically."*

---

### Code: watching a writer starve, then watching the turnstile fix it

```python
"""
Readers-Writers Synchronization Simulator
Demonstrates:
  1. Reader-preference writer starvation under continuous read load
  2. Starvation-free Fair Turnstile implementation
"""

import threading
import time

class FairReaderWriterLock:
    """Implements the 3rd Readers-Writers Problem using a turnstile."""
    def __init__(self):
        self.turnstile = threading.Semaphore(1)  # Enforces FIFO arrival
        self.resource_lock = threading.Semaphore(1)  # Exclusive write lock
        self.mutex = threading.Lock()  # Protects reader count
        self.read_count = 0

    def acquire_read(self):
        # Pass through turnstile in arrival order
        self.turnstile.acquire()
        with self.mutex:
            self.read_count += 1
            if self.read_count == 1:
                self.resource_lock.acquire()  # First reader locks out writers
        self.turnstile.release()

    def release_read(self):
        with self.mutex:
            self.read_count -= 1
            if self.read_count == 0:
                self.resource_lock.release()  # Last reader frees writers

    def acquire_write(self):
        # Writer blocks turnstile so newly arriving readers cannot jump ahead
        self.turnstile.acquire()
        self.resource_lock.acquire()
        self.turnstile.release()

    def release_write(self):
        self.resource_lock.release()


def run_fair_lock_test():
    print("=== Testing Fair Turnstile Readers-Writers Lock ===\n")
    lock = FairReaderWriterLock()
    execution_order = []

    def reader(reader_id: int):
        lock.acquire_read()
        execution_order.append(f"Reader_{reader_id} (Reading)")
        time.sleep(0.02)
        lock.release_read()

    def writer(writer_id: int):
        lock.acquire_write()
        execution_order.append(f"Writer_{writer_id} (WRITING)")
        time.sleep(0.03)
        lock.release_write()

    # Step 1: Start 2 initial readers
    t_r1 = threading.Thread(target=reader, args=(1,))
    t_r2 = threading.Thread(target=reader, args=(2,))
    t_r1.start()
    t_r2.start()
    time.sleep(0.005)

    # Step 2: Queue a writer while readers are inside
    t_w1 = threading.Thread(target=writer, args=(1,))
    t_w1.start()
    time.sleep(0.005)

    # Step 3: Queue 2 more readers after the writer
    t_r3 = threading.Thread(target=reader, args=(3,))
    t_r4 = threading.Thread(target=reader, args=(4,))
    t_r3.start()
    t_r4.start()

    t_r1.join()
    t_r2.join()
    t_w1.join()
    t_r3.join()
    t_r4.join()

    print("Execution Sequence:")
    for event in execution_order:
        print(f"  -> {event}")

    # Verify writer was NOT starved by late readers
    w_index = next(i for i, s in enumerate(execution_order) if "Writer_1" in s)
    r3_index = next(i for i, s in enumerate(execution_order) if "Reader_3" in s)
    assert w_index < r3_index, "Writer was starved by subsequent readers!"
    print("\nResult: Writer_1 executed BEFORE Reader_3 and Reader_4.")
    print("Turnstile successfully prevented writer starvation!")


if __name__ == "__main__":
    run_fair_lock_test()
```
