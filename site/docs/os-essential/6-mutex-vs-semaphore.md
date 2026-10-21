---
id: 6-mutex-vs-semaphore
title: "Mutex vs. Semaphore: Concurrency Primitives & Tradeoffs"
description: "Differentiate between mutual exclusion locks (mutex) and counting semaphores, spinlocks, ownership rules, and priority inheritance."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box } from '@site/src/components/SimpleDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between a mutex and a semaphore? What is a spinlock, how does ownership impact priority inheritance, and when do you use each?"

Both a mutex and a semaphore control access to a shared resource. The difference comes down to one question: **does it track who's holding it?**

---

### The analogy: a bathroom key vs. a nightclub bouncer

- **A mutex is a single-occupancy bathroom key.** A coffee shop has one bathroom. You take the key, go in, lock the door. You *own* that key until you come back out and hand it over. If someone else tries to hand back a "duplicate" key while you're still inside, the barista rejects it — you're the only one allowed to release it.
- **A semaphore is a bouncer with a clicker, capacity 3.** Three people go in, the clicker hits 0. A fourth person has to wait. Someone leaves through the side door, the clicker ticks back up to 1, and the next person in line gets in. Nobody "owns" a slot — anyone leaving frees one up for anyone waiting.

<Diagram>
<Row>
<Box label="Mutex" sub="locked by Thread A" />
<Box label="Semaphore" sub="count = 3" />
</Row>
</Diagram>

---

### The technical version

**Mutex (mutual exclusion):**
- A lock that lets exactly one thread into a critical section at a time.
- Internally just a boolean — locked or unlocked.
- Strict ownership: only the thread that called `lock()` is allowed to call `unlock()`. Anyone else trying gets an error.

**Counting semaphore:**
- A signaling tool built on an integer counter (≥ 0).
- Two operations: `wait()` / `P()` decrements the counter (and blocks if it hits below 0), `signal()` / `V()` increments it (and wakes someone up if anyone's waiting).
- No ownership at all — Thread A can call `wait()` and a completely unrelated Thread B can call `signal()`.

---

### Two things interviewers love to probe

**1. Mutex vs. spinlock — sleeping vs. busy-waiting.**
A mutex, when blocked, puts the waiting thread to sleep and lets the CPU run something else — cheap in CPU time, but costs a few microseconds to wake back up. A spinlock just loops, checking the lock over and over, burning 100% CPU the whole time. Spinlocks only make sense for extremely short critical sections, like inside a kernel interrupt handler where sleeping isn't even an option.

**2. Why only mutexes support priority inheritance.**
If a low-priority thread is holding a lock a high-priority thread needs, the OS can temporarily boost the low-priority thread so it finishes fast and gets out of the way — that's priority inheritance. It only works for a mutex, because the kernel knows exactly which thread owns the lock. A semaphore has no concept of an owner, so there's no one specific thread to boost.

---

### Comparison

| Dimension | Mutex | Counting Semaphore |
| :--- | :--- | :--- |
| **What it is** | A lock | A signal/counter |
| **State** | Locked / unlocked | An integer ≥ 0 |
| **Ownership** | Strict — only the locker can unlock | None — anyone can signal |
| **Priority inheritance** | Supported | Not possible |
| **Used for** | Protecting a critical section | Rate-limiting, resource pools, handoffs |
| **Typical case** | Guarding a shared data structure | Capping a DB connection pool at 10 |

---

### Say this in the interview

*"A mutex is a lock with strict ownership — only the thread that locked it can unlock it, which is also why it can support priority inheritance. A semaphore is a counter for signaling with no ownership at all, which makes it a better fit for things like limiting how many threads can use a resource pool at once."*

---

### Code: mutex vs. counting semaphore

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
