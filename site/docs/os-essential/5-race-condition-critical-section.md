---
id: 5-race-condition-critical-section
title: "Race Conditions & The Critical Section Problem"
description: "Master concurrency hazards, race conditions, hardware atomic instructions (CAS/TAS), and the 3 formal critical section requirements."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is a race condition? What is the critical section problem, what three formal requirements must any solution satisfy, and why do pure software algorithms fail on modern hardware?"

A race condition is what happens when two threads touch the same piece of data at the same time, and the result depends on which one happens to get there first. The piece of code where that shared data gets touched is called the **critical section** — and figuring out how to protect it safely is the **critical section problem**.

---

### The analogy: a shared joint bank account

Alice and Bob share a bank account with \$1,000 in it. At the exact same moment, Alice buys a \$1,000 laptop and Bob buys a \$1,000 phone.

<Diagram>
<Row>
<Box title="Alice's terminal" accent="#fb7185"><Field icon="💳" code="reads balance = $1000" hint="then charges $1000" variant="neutral" /></Box>
<Arrow label="races with" />
<Box title="Bob's terminal" accent="#fb7185"><Field icon="💳" code="reads balance = $1000" hint="then charges $1000" variant="neutral" /></Box>
</Row>
</Diagram>

Both terminals read the balance before either write lands. Both see \$1,000, both approve, both deduct \$1,000 — and the bank just let \$2,000 walk out the door from a \$1,000 account. That's a race condition.

---

### Why `counter++` isn't safe

It looks like one line of code, but it's actually three CPU instructions:

```assembly
MOV EAX, [counter]   ; 1. READ: load value into a register
ADD EAX, 1            ; 2. MODIFY: add one
MOV [counter], EAX   ; 3. WRITE: store it back
```

If a thread gets interrupted between any of these steps, another thread can sneak in and corrupt the result:

| Step | Thread A | Thread B | `counter` in memory |
| :--- | :--- | :--- | :--- |
| t1 | reads `100` | — | 100 |
| t2 | *(preempted)* | reads `100` | 100 |
| t3 | — | computes `101` | 100 |
| t4 | — | writes `101` | 101 |
| t5 | computes `101` | — | 101 |
| t6 | writes `101` | — | **101 (should be 102!)** |

Thread B's increment is silently lost. Both threads thought they were incrementing from a fresh value, but Thread A was actually working off stale data.

---

### The three rules any fix must satisfy

1. **Mutual exclusion** — while one thread is in its critical section, no other thread can be in theirs.
2. **Progress** — if nobody's in the critical section and others want in, the decision of who goes next can't be stalled forever.
3. **Bounded waiting** — there has to be a limit on how many times other threads can cut in line before a waiting thread gets its turn. No one waits forever.

---

### The trap: why pure software locks don't work on modern CPUs

Textbooks teach lock-free algorithms like Peterson's or Dekker's that use only reads and writes — no hardware help. A sharp follow-up: *"Would that actually work on a real Intel or AMD chip today?"*

No. These algorithms assume memory operations happen in exactly the order they're written in code. Modern CPUs don't honor that — they reorder instructions, buffer writes, and execute out of order to go faster, which breaks the assumptions these algorithms rely on.

That's why real synchronization leans on hardware instead:

- **Test-And-Set (TAS)** — atomically checks and sets a flag in one indivisible step.
- **Compare-And-Swap (CAS)** — atomically updates a value only if it still matches what you expected.
- **Memory barriers** (`MFENCE` on x86) — stop the CPU from reordering memory operations across a specific point.

---

### Say this in the interview

*"A race condition happens when threads interleave reads and writes on shared memory without coordination. Fixing it means satisfying mutual exclusion, progress, and bounded waiting. Pure software algorithms like Peterson's don't actually work on modern hardware because of instruction reordering — real fixes use hardware atomics like compare-and-swap and memory fences."*

---

### Code: race condition vs. synchronized access

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
