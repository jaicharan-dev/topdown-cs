---
id: 8-deadlock-four-coffman-conditions
title: "Deadlocks & The 4 Necessary Coffman Conditions"
description: "Analyze system deadlocks, the four mandatory Coffman conditions, the Resource Allocation Graph (RAG) trap, and Havender's ordering proof."
sidebar_position: 8
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is a deadlock? State the four necessary Coffman conditions, and explain the Resource Allocation Graph (RAG) rule regarding cycles."

A **Deadlock** is a catastrophic concurrency state where a set of processes or threads is permanently blocked because every process holds a non-preemptible resource and waits for another resource held by someone else in the set, creating an unbreakable circular dependency.

---

### The ELI5 Analogy: The Pencil and the Ruler

Two students, Alice and Bob, are sitting together drawing geometry diagrams. Drawing a valid line requires **both** a Pencil and a Ruler:
1. Alice picks up the **Pencil**.
2. Bob picks up the **Ruler**.
3. Alice asks Bob: *"Give me the Ruler so I can draw my line."* Bob refuses: *"No, give me the Pencil first."*
4. Neither student will let go of what they hold, and neither can finish their task without the other's tool.
5. They sit frozen forever until an authority figure (the OS) forcibly intervenes.

---

### The Four Coffman Conditions (1971)

For a deadlock to occur, **all four of the following conditions must hold simultaneously**. If you can prevent even *one* condition from holding, a deadlock is mathematically impossible:

| Condition | Formal Definition | Concrete Analogy |
| :--- | :--- | :--- |
| **1. Mutual Exclusion** | At least one resource must be non-shareable (only one thread can use it at a time). | Alice and Bob cannot write with the same physical pencil simultaneously. |
| **2. Hold and Wait** | A process must currently hold at least one resource while waiting to acquire additional resources held by others. | Alice holds the pencil in her hand while actively waiting for the ruler. |
| **3. No Preemption** | Resources cannot be forcibly seized from a process; they must be released voluntarily after task completion. | The teacher cannot snatch the ruler out of Bob's hand. |
| **4. Circular Wait** | A closed chain of processes $\{P_0, P_1, \dots, P_n\}$ exists such that $P_0$ waits for $P_1$, and $P_n$ waits for $P_0$. | Alice waits for Bob (who holds the ruler), and Bob waits for Alice (who holds the pencil). |

---

### The Core Interview Trap: Resource Allocation Graphs (RAG)

Interviewers frequently draw a Resource Allocation Graph (RAG) and ask: *"Does a cycle in this graph always indicate a deadlock?"*

**The Answer depends on resource instance counts:**

1. **If all resource types have Single Instances:**
   - A cycle is a **necessary AND sufficient** condition for deadlock.
   - $\text{Cycle} \iff \text{Deadlock}$.
2. **If resource types have Multiple Instances:**
   - A cycle is **necessary but NOT sufficient**!
   - A cycle can exist without a deadlock if another process (outside the cycle) holds an instance of the cycled resource and subsequently terminates, releasing its instance to break the wait.

---

### Mathematical Invalidation: Breaking Circular Wait (Havender's Rule)

The most practical way software systems eliminate deadlocks is by mathematically invalidating **Circular Wait**:

1. Define a global one-to-one ordering function $F: R \to \mathbb{N}$ assigning every resource in the system a unique integer index (e.g., Lock A = 1, Lock B = 2).
2. Enforce the invariant: A thread can only request resource $R_j$ if $F(R_j) > F(R_i)$ for all resources $R_i$ it currently holds.

#### Proof by Contradiction:
Suppose a circular wait exists: $P_0 \to P_1 \to \dots \to P_n \to P_0$.  
By the ordering rule:
$$ F(R_0) < F(R_1) < \dots < F(R_n) < F(R_0) $$
This implies $F(R_0) < F(R_0)$, which is a mathematical impossibility. Therefore, strict global lock ordering eliminates circular wait completely!

---

### Summary
"A deadlock requires all four Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. In a Resource Allocation Graph, a cycle guarantees a deadlock only if resources have single instances. In application design, deadlocks are commonly prevented by invalidating Circular Wait through global deterministic lock ordering."

---

### Code Demonstration: Reproducing an Inverted-Order Deadlock

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