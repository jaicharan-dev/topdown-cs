---
id: 6-mutex-vs-semaphore
title: "Mutex vs. Semaphore: Concurrency Primitives & Tradeoffs"
description: "Differentiate between mutual exclusion locks (mutex) and counting semaphores, spinlocks, ownership rules, and priority inheritance."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a mutex and a semaphore? What is a spinlock, how does ownership impact priority inheritance, and when do you use each?"

Synchronization primitives manage concurrent access to shared resources. The two most fundamental primitives are the **Mutex** (a lock enforcing mutual exclusion) and the **Semaphore** (a counter-based signaling mechanism).

---

### The ELI5 Analogy: The Bathroom Key vs. The Nightclub Bouncer

- **A Mutex is a Single-Occupancy Bathroom Key:**  
  A coffee shop has one bathroom. You take the physical key, walk inside, and lock the door. You are the sole **owner** of that key. When finished, you unlock the door and hand the key back. If another customer tries to return a duplicate key while you are inside, the barista rejects it because you are the documented owner.
  - *Core Concept:* **Strict Thread Ownership.**

- **A Semaphore is a Nightclub Bouncer with a Clicker:**  
  A club has a legal capacity limit of 3 guests. The bouncer stands at the door holding a clicker:
  - 3 people enter $\to$ bouncer clicks down to `0`.
  - A 4th person arrives $\to$ bouncer says, *"Wait outside, we're at capacity."*
  - Someone inside leaves through the fire exit $\to$ bouncer clicks up to `1` and admits the next person in line.
  - *Core Concept:* **Signaling & Capacity Counter (No Ownership).**

---

### Technical Breakdown

#### 1. Mutex (Mutual Exclusion)
- A **locking mechanism** designed to protect a critical section so that only one thread can execute it at a time.
- Implemented as an atomic boolean flag (`Locked` / `Unlocked`).
- **Strict Ownership:** The thread that invokes `lock()` is the **only** thread permitted to invoke `unlock()`. If another thread attempts to unlock it, the runtime raises an error.

#### 2. Counting Semaphore
- A **signaling mechanism** based on an atomic integer counter ($S \ge 0$).
- Defined by two atomic operations (Dijkstra's notation):
  - **`wait()` (or `P()`):** Decrements the counter. If $S \le 0$, the calling thread blocks until another thread signals.
  - **`signal()` (or `V()`):** Increments the counter. Wakes up a waiting thread if one is blocked.
- **No Ownership:** A semaphore has no concept of an owner. Thread A can call `wait()`, and a completely different Thread B can call `signal()`.

---

### The Core Interview Traps

#### 1. Mutex vs. Spinlock (Sleep vs. Busy-Wait)
Candidates frequently confuse how threads wait for locks:
- **Mutex (Sleeping Lock):** If the lock is held, the OS puts the waiting thread to sleep, removes it from the CPU runqueue, and context-switches to another process. Overhead is $\approx 1-5\ \mu\text{s}$. Best for long critical sections.
- **Spinlock (Busy-Waiting):** The waiting thread loops continuously on the CPU (`while(test_and_set(&lock))`). Zero context-switching overhead, but burns 100% CPU. Best for sub-microsecond critical sections or **OS Kernel Interrupt Service Routines (ISRs)** where sleeping is forbidden.

#### 2. Why Only Mutexes Support Priority Inheritance
In real-time systems, if a low-priority thread holding a lock blocks a high-priority thread, the OS can elevate the low-priority thread's priority (**Priority Inheritance**) to prevent priority inversion.
- **Mutexes can do this** because the kernel tracks the exact thread that owns the lock.
- **Semaphores cannot do this** because semaphores have no concept of thread ownership. The kernel has no way of knowing which thread is "supposed" to call `signal()`.

---

### Technical Comparison Matrix

| Dimension | Mutex | Counting Semaphore |
| :--- | :--- | :--- |
| **Mechanism** | Locking mechanism. | Signaling mechanism. |
| **State** | Boolean flag (`Locked` / `Unlocked`). | Integer counter ($\ge 0$). |
| **Ownership** | **Strict.** Only locking thread can unlock. | **None.** Any thread can signal. |
| **Priority Inheritance** | Supported. | Not possible (no owner). |
| **Primary Purpose** | Protecting critical sections / mutual exclusion. | Resource pooling, rate-limiting, handoffs. |
| **Classic Use Case** | Modifying a shared in-memory data structure. | Limiting database connection pools (e.g., max 10). |

---

### Summary
"A mutex is a locking primitive with strict thread ownership, ideal for mutual exclusion and capable of priority inheritance. A counting semaphore is a counter-based signaling mechanism with no ownership, ideal for regulating access to a finite pool of resources or coordinating execution order."

---

### Code Demonstration: Mutex vs. Counting Semaphore

<Tabs groupId="programming-language">
<TabItem value="c" label="C (pthreads & semaphores)">

```c
#include <stdio.h>
#include <pthread.h>
#include <semaphore.h>
#include <unistd.h>

sem_t pool_semaphore;

void* pool_worker(void* arg) {
    long id = (long)arg;
    
    // Decrement semaphore counter (wait if pool is full)
    sem_wait(&pool_semaphore);
    printf("[Worker %ld] Acquired slot in pool\n", id);
    sleep(1); // Simulate work using resource
    printf("[Worker %ld] Releasing slot\n", id);
    
    // Increment semaphore counter
    sem_post(&pool_semaphore);
    return NULL;
}

int main() {
    pthread_t threads[5];
    // Initialize counting semaphore with capacity of 2
    sem_init(&pool_semaphore, 0, 2);

    for (long i = 0; i < 5; i++) {
        pthread_create(&threads[i], NULL, pool_worker, (void*)i);
    }

    for (int i = 0; i < 5; i++) {
        pthread_join(threads[i], NULL);
    }

    sem_destroy(&pool_semaphore);
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python (threading.Semaphore)">

```python
import threading
import time

# Resource pool capped at 2 concurrent workers
pool_semaphore = threading.Semaphore(2)

def worker(worker_id):
    with pool_semaphore:
        print(f"[Worker {worker_id}] Acquired slot")
        time.sleep(1)
        print(f"[Worker {worker_id}] Released slot")

if __name__ == "__main__":
    threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
```

</TabItem>
<TabItem value="java" label="Java (java.util.concurrent.Semaphore)">

```java
import java.util.concurrent.Semaphore;

public class SemaphoreDemo {
    // Semaphore with 2 permits
    private static final Semaphore pool = new Semaphore(2);

    public static void main(String[] args) {
        for (int i = 0; i < 5; i++) {
            final int id = i;
            new Thread(() -> {
                try {
                    pool.acquire();
                    System.out.println("[Worker " + id + "] Acquired permit");
                    Thread.sleep(1000);
                    System.out.println("[Worker " + id + "] Releasing permit");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    pool.release();
                }
            }).start();
        }
    }
}
```

</TabItem>
</Tabs>