---
id: 5-race-condition-critical-section
title: "Race Conditions & The Critical Section Problem"
description: "Master concurrency hazards, race conditions, hardware atomic instructions (CAS/TAS), and the 3 formal critical section requirements."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a race condition? What is the critical section problem, what three formal requirements must any solution satisfy, and why do pure software algorithms fail on modern hardware?"

In concurrent programming, a **Race Condition** is an insidious flaw where the correctness of a program depends on the non-deterministic scheduling order of concurrent threads. The segment of code accessing the shared state is called the **Critical Section**, and designing robust synchronization primitives to govern it is known as the **Critical Section Problem**.

---

### The ELI5 Analogy: The Shared Joint Account

Imagine a joint bank account containing \$1,000. Alice and Bob simultaneously swipe their debit cards at two different stores at the exact same millisecond:
- Alice buys a laptop for \$1,000.
- Bob buys a phone for \$1,000.
- Both store terminals read the balance simultaneously: both observe \$1,000.
- Both transactions approve and deduct \$1,000.
- The bank allows \$2,000 to be spent from a \$1,000 account because the two operations "raced" without proper synchronization.

---

### Anatomy of a Race Condition: The Lost Update

A high-level statement like `counter++` looks atomic in source code, but compiles down to **three distinct CPU machine instructions**:

```assembly
MOV EAX, [counter]   ; 1. READ: Load value from RAM into CPU register
ADD EAX, 1           ; 2. MODIFY: Increment register value
MOV [counter], EAX   ; 3. WRITE: Store register value back to RAM
```

If the OS preempts the thread between these instructions, data corruption occurs:

| Step | Thread A (Request 1) | Thread B (Request 2) | Shared Memory `counter` |
| :--- | :--- | :--- | :--- |
| `t1` | **READ:** loads `100` into `EAX` | *(idle)* | `100` |
| `t2` | *(preempted by timer interrupt)* | **READ:** loads `100` into `EBX` | `100` |
| `t3` | *(idle)* | **ADD:** `100 + 1 = 101` | `100` |
| `t4` | *(idle)* | **WRITE:** stores `101` | `101` |
| `t5` | **ADD:** `100 + 1 = 101` | *(idle)* | `101` |
| `t6` | **WRITE:** stores `101` | *(idle)* | **`101` (Should be `102`!)** |

Thread B's update is completely overwritten and lost.

---

### The Three Formal Requirements for a Valid Solution

To eliminate race conditions, the execution of critical sections must satisfy three mandatory criteria:

1. **Mutual Exclusion:** If thread $T_i$ is executing inside its critical section, no other threads can be executing in their critical sections.
2. **Progress (Deadlock Freedom):** If no thread is executing in its critical section and some threads wish to enter, only those threads that are not in their remainder sections can participate in deciding who enters next. This selection cannot be postponed indefinitely.
3. **Bounded Waiting (Starvation Freedom):** There must be a formal upper bound on the number of times other threads are allowed to enter their critical sections after a thread has requested entry, ensuring no thread is starved indefinitely.

---

### The Senior Interview Trap: Why Software Algorithms Fail on Modern CPUs

Textbooks frequently discuss software-only algorithms like **Peterson's Algorithm** or **Dekker's Algorithm** to achieve mutual exclusion without locks.

Interviewers often ask: *"Can you run Peterson's Algorithm on a modern Intel or AMD multi-core processor?"*

**The Answer is NO.**
- **The Problem:** Peterson's algorithm assumes a **Sequentially Consistent Memory Model** (that reads and writes to RAM occur in the exact sequential order written in source code).
- **Modern Hardware Reality:** Modern multi-core CPUs use **Out-of-Order Execution**, store buffers, and relaxed memory models. The CPU or compiler will aggressively reorder read and write instructions to maximize pipelining, breaking the assumptions of Peterson's algorithm.
- **The Solution:** Modern synchronization relies on hardware-enforced atomic instructions:
  - **Test-And-Set (TAS):** Atomically tests and sets a memory bit.
  - **Compare-And-Swap (CAS):** Atomically updates a memory location only if it matches an expected value.
  - **Memory Barriers (Fences):** Hardware instructions (`MFENCE` on x86) preventing the CPU from reordering memory accesses across the barrier.

---

### Summary
"A race condition occurs when concurrent threads interleave uncoordinated reads and writes on shared memory. Solving the critical section problem requires satisfying Mutual Exclusion, Progress (no deadlocks), and Bounded Waiting (no starvation). Pure software solutions fail on modern hardware due to instruction reordering, requiring hardware atomic primitives like Compare-And-Swap (CAS) and memory fences."

---

### Code Demonstration: Race Condition vs. Synchronization

<Tabs groupId="programming-language">
<TabItem value="c" label="C (pthread_mutex)">

```c
#include <stdio.h>
#include <pthread.h>

long counter = 0;
pthread_mutex_t lock;

void* safe_worker(void* arg) {
    for (int i = 0; i < 50000; i++) {
        pthread_mutex_lock(&lock);
        counter++; // Critical Section protected by Mutex
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}

int main() {
    pthread_t t1, t2;
    pthread_mutex_init(&lock, NULL);

    pthread_create(&t1, NULL, safe_worker, NULL);
    pthread_create(&t2, NULL, safe_worker, NULL);

    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    printf("Final Counter: %ld (Expected: 100000)\n", counter);
    pthread_mutex_destroy(&lock);
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python (threading.Lock)">

```python
import threading

counter = 0
lock = threading.Lock()

def safe_increment():
    global counter
    for _ in range(50000):
        with lock:
            counter += 1 # Critical section protected by lock

if __name__ == "__main__":
    t1 = threading.Thread(target=safe_increment)
    t2 = threading.Thread(target=safe_increment)

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    print(f"Final Counter: {counter} (Expected: 100000)")
```

</TabItem>
<TabItem value="java" label="Java (AtomicInteger)">

```java
import java.util.concurrent.atomic.AtomicInteger;

public class CriticalSectionDemo {
    // Uses hardware Compare-And-Swap (CAS) instructions
    private static final AtomicInteger atomicCounter = new AtomicInteger(0);

    public static void main(String[] args) throws InterruptedException {
        Runnable task = () -> {
            for (int i = 0; i < 50000; i++) {
                atomicCounter.incrementAndGet(); // Lock-free atomic increment
            }
        };

        Thread t1 = new Thread(task);
        Thread t2 = new Thread(task);

        t1.start();
        t2.start();
        t1.join();
        t2.join();

        System.out.println("Final Counter: " + atomicCounter.get() + " (Expected: 100000)");
    }
}
```

</TabItem>
</Tabs>