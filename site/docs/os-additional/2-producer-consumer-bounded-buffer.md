---
id: 2-producer-consumer-bounded-buffer
title: "The Producer-Consumer Problem: Semaphores & Bounded Buffers"
description: "Solve the classic producer-consumer problem with a mutex and two semaphores, and see why acquiring them in the wrong order deadlocks."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Explain the Producer-Consumer (Bounded Buffer) problem. What synchronization primitives are required to solve it, what role does each play, and why does inverting the lock order cause an irrecoverable deadlock?"

Producer-consumer is about one or more threads generating items (producers) and one or more threads consuming them (consumers), passing items through a fixed-size buffer in between. Get the synchronization wrong and you either overflow the buffer, read garbage from an empty buffer, or corrupt it with a race condition.

---

### The analogy: the chef and the waiter

A diner kitchen has a heating tray that holds at most 5 burgers.

<Diagram>
<Row>
<Box title="Chef (Producer)" accent="#60a5fa">
<Field icon="📤" code="cooks burgers" variant="neutral" />
</Box>
<Arrow />
<Box title="Heating Tray" accent="#818cf8">
<Field icon="📦" code="holds up to 5" hint="blocks chef when full, blocks waiter when empty" variant="neutral" />
</Box>
<Arrow />
<Box title="Waiter (Consumer)" accent="#34d399">
<Field icon="📥" code="delivers burgers" variant="neutral" />
</Box>
</Row>
</Diagram>

Three rules keep the kitchen from breaking:
1. **Full tray:** if there are already 5 burgers on it, the chef has to stop cooking and wait — a 6th burger has nowhere to go.
2. **Empty tray:** if there are 0 burgers, the waiter can't deliver one and has to wait.
3. **No collisions:** the chef and waiter can never touch the same slot on the tray at the same time, or a burger gets dropped.

---

### The three primitives you need

To solve this without the chef or waiter spinning in a busy-wait loop, you need exactly three synchronization primitives:

| Primitive | What it is | Starts at | What it does |
| :--- | :--- | :--- | :--- |
| **`empty`** | Counting semaphore | N (buffer capacity) | Counts free slots. Producer calls `wait(empty)` before inserting; if it's 0, the producer sleeps until a consumer frees a slot. |
| **`full`** | Counting semaphore | 0 | Counts filled slots. Consumer calls `wait(full)` before removing; if it's 0, the consumer sleeps until a producer adds an item. |
| **`mutex`** | Binary lock | 1 (unlocked) | Protects the buffer array and its read/write index pointers from being touched by two threads at once. |

---

### The implementation

The buffer is a circular array of size N, with `in` tracking the next write slot and `out` the next read slot:

```c
#define N 5
int buffer[N];
int in = 0, out = 0;

semaphore empty = N;   // N available spaces
semaphore full  = 0;   // 0 items ready
mutex_t   mutex = 1;   // Protects buffer indices
```

**Producer:**
```c
void* producer(void* arg) {
    while (1) {
        item_t item = produce_item();

        sem_wait(&empty);          // 1. Decrement available empty slots (blocks if buffer is full)
        pthread_mutex_lock(&mutex); // 2. Acquire exclusive access to buffer array

        buffer[in] = item;         // CRITICAL SECTION: Insert item
        in = (in + 1) % N;         // Advance circular write pointer

        pthread_mutex_unlock(&mutex); // 3. Release exclusive buffer lock
        sem_post(&full);           // 4. Increment full slots (wakes sleeping consumers)
    }
}
```

**Consumer:**
```c
void* consumer(void* arg) {
    while (1) {
        sem_wait(&full);           // 1. Decrement available full slots (blocks if buffer is empty)
        pthread_mutex_lock(&mutex); // 2. Acquire exclusive access to buffer array

        item_t item = buffer[out]; // CRITICAL SECTION: Extract item
        out = (out + 1) % N;       // Advance circular read pointer

        pthread_mutex_unlock(&mutex); // 3. Release exclusive buffer lock
        sem_post(&empty);          // 4. Increment empty slots (wakes sleeping producers)

        consume_item(item);
    }
}
```

---

### The trap: swapping the lock order deadlocks everything

A classic interview follow-up: *"what if we swap these two lines in the producer?"*

```c
// DEADLOCK BUG: Inverting the semaphore and mutex order!
pthread_mutex_lock(&mutex); // Lock mutex FIRST
sem_wait(&empty);          // Wait for empty slot SECOND
```

Here's how that locks up the whole system:

1. The buffer is completely full (`empty == 0`).
2. The producer grabs `mutex` first, then calls `sem_wait(&empty)`.
3. Since `empty == 0`, the producer goes to sleep — but it's still holding `mutex`.
4. A consumer wakes up to free some space. It calls `sem_wait(&full)`, which succeeds.
5. The consumer then tries `pthread_mutex_lock(&mutex)` — and blocks immediately, because the sleeping producer still owns it.
6. Now both are stuck: the producer is waiting for the consumer to free a slot, and the consumer is waiting for the producer to release the mutex it's sleeping on. Neither can ever happen.

<Diagram>
<Row>
<Box title="Producer" accent="#60a5fa">
<Field icon="🔒" code="holds mutex" hint="sleeping, waiting on empty slot" variant="neutral" />
</Box>
<Arrow label="waits on" />
<Box title="Consumer" accent="#34d399">
<Field icon="⏳" code="has freed a slot" hint="blocked trying to grab mutex" variant="neutral" />
</Box>
</Row>
</Diagram>

**The rule:** always acquire the counting semaphore (`empty`/`full`) *before* the mutex — never the other way around.

---

### If you use condition variables instead: use `while`, not `if`

With POSIX condition variables instead of semaphores, you must re-check the condition in a loop:

```c
pthread_mutex_lock(&mutex);
// WRONG: if (count == N) pthread_cond_wait(&not_full, &mutex);
// CORRECT: Guard with a while loop!
while (count == N) {
    pthread_cond_wait(&not_full, &mutex);
}
// Insert item...
pthread_cond_signal(&not_empty);
pthread_mutex_unlock(&mutex);
```

Why `while` and not `if`:
1. **Mesa semantics:** a signaled thread doesn't run immediately — it just moves to the ready queue. By the time it actually gets the CPU and reacquires the mutex, a faster thread may have already taken the slot it was waiting for.
2. **Spurious wakeups:** POSIX permits a condition variable to wake a thread up even with no signal at all. A `while` loop re-checks the actual condition instead of trusting the wakeup.

---

### Say this in the interview

*"You need a mutex to protect the buffer indices, plus two counting semaphores — `empty` starting at N and `full` starting at 0 — so producers block when the buffer is full and consumers block when it's empty, without busy-waiting. The one deadlock trap is acquiring the mutex before the semaphore: if a thread blocks on the semaphore while still holding the mutex, nobody can ever unblock it."*

---

### Python: a working bounded buffer with threads

```python
"""
Thread-Safe Bounded Buffer (Producer-Consumer) Simulation
Demonstrates:
  1. Circular buffer index management
  2. Semaphore-controlled capacity constraints (empty & full)
  3. Mutex-protected critical section
"""

import threading
import time
import random
from typing import List, Optional

class BoundedBuffer:
    def __init__(self, capacity: int = 5):
        self.capacity = capacity
        self.buffer: List[Optional[int]] = [None] * capacity
        self.in_idx = 0
        self.out_idx = 0

        # Synchronization primitives
        self.empty = threading.Semaphore(capacity)  # Starts at N
        self.full = threading.Semaphore(0)          # Starts at 0
        self.mutex = threading.Lock()               # Binary exclusion

    def produce(self, item: int, producer_id: str) -> None:
        # Step 1: Wait for an available empty slot
        self.empty.acquire()

        # Step 2: Lock the critical section
        with self.mutex:
            self.buffer[self.in_idx] = item
            print(f"[{producer_id}] Produced {item:3d} -> Buffer index {self.in_idx} "
                  f"| Buffer: {[x for x in self.buffer if x is not None]}")
            self.in_idx = (self.in_idx + 1) % self.capacity

        # Step 3: Signal that a new filled slot is ready
        self.full.release()

    def consume(self, consumer_id: str) -> int:
        # Step 1: Wait for an available item
        self.full.acquire()

        # Step 2: Lock the critical section
        with self.mutex:
            item = self.buffer[self.out_idx]
            self.buffer[self.out_idx] = None
            print(f"[{consumer_id}] Consumed {item:3d} <- Buffer index {self.out_idx} "
                  f"| Buffer: {[x for x in self.buffer if x is not None]}")
            self.out_idx = (self.out_idx + 1) % self.capacity

        # Step 3: Signal that an empty slot has freed up
        self.empty.release()
        return item


def producer_worker(buffer: BoundedBuffer, p_id: str, count: int):
    for _ in range(count):
        item = random.randint(100, 999)
        buffer.produce(item, p_id)
        time.sleep(random.uniform(0.01, 0.05))


def consumer_worker(buffer: BoundedBuffer, c_id: str, count: int):
    for _ in range(count):
        buffer.consume(c_id)
        time.sleep(random.uniform(0.02, 0.06))


def main():
    print("=== Multi-Threaded Producer-Consumer Simulation (Capacity = 5) ===\n")
    buffer = BoundedBuffer(capacity=5)

    # 2 Producers, 2 Consumers
    threads = [
        threading.Thread(target=producer_worker, args=(buffer, "Prod-1", 6)),
        threading.Thread(target=producer_worker, args=(buffer, "Prod-2", 6)),
        threading.Thread(target=consumer_worker, args=(buffer, "Cons-A", 6)),
        threading.Thread(target=consumer_worker, args=(buffer, "Cons-B", 6)),
    ]

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    print("\nAll items produced and consumed safely with zero race conditions or deadlocks!")

if __name__ == "__main__":
    main()
```
