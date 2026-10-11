---
id: 8-deadlock-four-coffman-conditions
title: "Deadlocks & The 4 Necessary Coffman Conditions"
description: "Analyze system deadlocks, the four mandatory Coffman conditions, the Resource Allocation Graph (RAG) trap, and Havender's ordering proof."
sidebar_position: 8
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a deadlock? State the four necessary Coffman conditions, and explain the Resource Allocation Graph (RAG) rule regarding cycles."

A deadlock is what happens when two threads each hold something the other one needs, and neither will let go. Nobody moves, forever.

---

### The analogy: the pencil and the ruler

Alice and Bob are drawing geometry diagrams together. Drawing a line needs both a pencil and a ruler.

<Diagram>
<Row>
<Box title="Alice" accent="#fb7185"><Field icon="✏️" code="holds Pencil" hint="waiting for the Ruler" variant="neutral" /></Box>
<Arrow label="stuck waiting on each other" />
<Box title="Bob" accent="#fb7185"><Field icon="📏" code="holds Ruler" hint="waiting for the Pencil" variant="neutral" /></Box>
</Row>
</Diagram>

Alice has the pencil and asks Bob for the ruler. Bob has the ruler and says "give me the pencil first." Neither one gives up what they're holding, and neither can finish without the other's tool. They're stuck — forever, unless something outside the two of them intervenes.

---

### The four conditions that all have to be true (Coffman, 1971)

A deadlock can only happen if **all four** of these hold at once. Break even one, and a deadlock becomes impossible.

| Condition | What it means | In the analogy |
| :--- | :--- | :--- |
| **1. Mutual exclusion** | At least one resource can only be used by one thread at a time. | Alice and Bob can't both write with the same physical pencil at once. |
| **2. Hold and wait** | A thread holds one resource while waiting for another. | Alice holds the pencil while waiting for the ruler. |
| **3. No preemption** | Resources can't be forcibly taken away — only released voluntarily. | Nobody can snatch the ruler out of Bob's hand. |
| **4. Circular wait** | There's a closed loop of threads each waiting on the next. | Alice waits on Bob, Bob waits on Alice. |

---

### The trap: does a cycle always mean deadlock?

Interviewers like to draw a Resource Allocation Graph and ask whether a cycle in it always means deadlock. The answer depends on how many instances of each resource exist:

- **Single instance per resource type:** yes — a cycle means deadlock, no exceptions.
- **Multiple instances per resource type:** not necessarily. A cycle can exist without anyone actually being stuck, if some other process outside the cycle is holding an extra instance of that resource and is about to finish and release it — breaking the wait before it becomes permanent.

---

### How systems actually prevent deadlocks: lock ordering

The most common real-world fix targets circular wait specifically — if you can't form a cycle, you can't deadlock.

1. Give every resource in the system a unique number (Lock A = 1, Lock B = 2, and so on).
2. Rule: a thread can only request a new lock if its number is higher than every lock it already holds.

Why this works: if a circular wait existed, you'd need $F(R_0) < F(R_1) < \dots < F(R_n) < F(R_0)$ — which says a number is less than itself. That's impossible. So strict, global lock ordering rules out circular wait completely.

---

### Say this in the interview

*"A deadlock needs all four Coffman conditions at once: mutual exclusion, hold-and-wait, no preemption, and circular wait. In a resource allocation graph, a cycle only guarantees deadlock when resources have a single instance each — with multiple instances, a cycle can exist safely. In practice, the usual fix is enforcing a global lock ordering, which makes circular wait mathematically impossible."*

---

### Code: reproducing an inverted-order deadlock

<Tabs groupId="programming-language">
<TabItem value="python" label="Python">

```python
import threading
import time

lock_a = threading.Lock()
lock_b = threading.Lock()

def thread_1_task():
    with lock_a:
        print("[Thread 1] Acquired Lock A")
        time.sleep(0.1) # Simulates work, giving Thread 2 time to acquire Lock B
        print("[Thread 1] Waiting for Lock B...")
        with lock_b:
            print("[Thread 1] Acquired Lock B!")

def thread_2_task():
    with lock_b: # Inverted lock ordering!
        print("[Thread 2] Acquired Lock B")
        time.sleep(0.1)
        print("[Thread 2] Waiting for Lock A...")
        with lock_a:
            print("[Thread 2] Acquired Lock A!")

if __name__ == "__main__":
    t1 = threading.Thread(target=thread_1_task)
    t2 = threading.Thread(target=thread_2_task)
    
    t1.start()
    t2.start()
    
    t1.join()
    t2.join()
    # Program deadlocks here! Both threads wait indefinitely.
```

</TabItem>
<TabItem value="c" label="C (pthreads)">

```c
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

pthread_mutex_t lock_a = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t lock_b = PTHREAD_MUTEX_INITIALIZER;

void* thread_1(void* arg) {
    pthread_mutex_lock(&lock_a);
    printf("[Thread 1] Acquired Lock A\n");
    usleep(50000); // 50ms window for Thread 2 to grab Lock B
    printf("[Thread 1] Waiting for Lock B...\n");
    pthread_mutex_lock(&lock_b); // DEADLOCK!
    pthread_mutex_unlock(&lock_b);
    pthread_mutex_unlock(&lock_a);
    return NULL;
}

void* thread_2(void* arg) {
    pthread_mutex_lock(&lock_b); // INVERTED ACQUISITION ORDER!
    printf("[Thread 2] Acquired Lock B\n");
    usleep(50000);
    printf("[Thread 2] Waiting for Lock A...\n");
    pthread_mutex_lock(&lock_a); // DEADLOCK!
    pthread_mutex_unlock(&lock_a);
    pthread_mutex_unlock(&lock_b);
    return NULL;
}

int main() {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, thread_1, NULL);
    pthread_create(&t2, NULL, thread_2, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}
```

</TabItem>
<TabItem value="java" label="Java">

```java
public class DeadlockDemo {
    private static final Object lockA = new Object();
    private static final Object lockB = new Object();

    public static void main(String[] args) {
        Thread t1 = new Thread(() -> {
            synchronized (lockA) {
                System.out.println("[Thread 1] Acquired Lock A");
                try { Thread.sleep(50); } catch (InterruptedException e) {}
                System.out.println("[Thread 1] Waiting for Lock B...");
                synchronized (lockB) {
                    System.out.println("[Thread 1] Acquired Lock B");
                }
            }
        });

        Thread t2 = new Thread(() -> {
            synchronized (lockB) { // Inverted ordering causes deadlock
                System.out.println("[Thread 2] Acquired Lock B");
                try { Thread.sleep(50); } catch (InterruptedException e) {}
                System.out.println("[Thread 2] Waiting for Lock A...");
                synchronized (lockA) {
                    System.out.println("[Thread 2] Acquired Lock A");
                }
            }
        });

        t1.start();
        t2.start();
    }
}
```

</TabItem>
</Tabs>
