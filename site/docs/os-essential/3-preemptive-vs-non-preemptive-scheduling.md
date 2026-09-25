---
id: 3-preemptive-vs-non-preemptive-scheduling
title: "Preemptive vs. Non-Preemptive CPU Scheduling"
description: "Learn the mechanics of preemptive vs non-preemptive scheduling, the 4 formal decision points, timer interrupts, and the priority inversion trap."
sidebar_position: 3
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between preemptive and non-preemptive scheduling? Under what four conditions does a CPU scheduler make decisions, and how does hardware enforce preemption?"

In multitasking operating systems, CPU scheduling governs how processor time is allocated across competing processes. The fundamental architectural divide is whether the kernel can **forcibly evict** a running process (**Preemptive**) or must wait for the process to **voluntarily surrender** the CPU (**Non-Preemptive / Cooperative**).

---

### The ELI5 Analogy: The Grocery Checkout Lane

- **Non-Preemptive (Cooperative):** Once a customer begins scanning groceries at the register, they cannot be interrupted. Even if they have 200 items and the person behind them has a single candy bar, that person must wait until the entire cart is scanned, paid for, and bagged. If the customer goes into an infinite argument with the cashier, the register is frozen forever.
- **Preemptive:** The store manager enforces a strict policy: *"Every shopper gets 3 minutes at the register."* When the timer rings, the cashier pauses the transaction, pushes the cart to the side, rings up the next person, and later brings the first shopper back to finish.

---

### The Four Formal Scheduling Decision Points

A CPU scheduler can be invoked when a process undergoes any of four specific state transitions:

1. **Running $\to$ Waiting (Blocked):** Process issues an I/O request or invokes `wait()`.
2. **Running $\to$ Ready:** A hardware timer interrupt fires, indicating the process's allocated time slice (quantum) has expired.
3. **Waiting $\to$ Ready:** An asynchronous I/O operation finishes, waking up a higher-priority process.
4. **Running $\to$ Terminated:** Process finishes executing `main()` or invokes `exit()`.

#### The Architectural Rule:
- When scheduling takes place **only** under conditions **1 and 4**, the scheduling scheme is **Non-Preemptive (Cooperative)**. The process retains the CPU until it chooses to yield or terminate.
- When scheduling can take place under conditions **2 and 3**, the scheduling scheme is **Preemptive**. The OS forcibly interrupts running tasks.

---

### How Hardware Enforces Preemption: The Timer Interrupt

A common interview question: *"If a user program enters an infinite loop (`while(1) {}`), how does the OS ever regain control of the CPU?"*

In a non-preemptive operating system (such as Windows 3.1 or classic Mac OS), the machine freezes completely.

Modern preemptive operating systems rely on hardware assistance:
1. The OS kernel programs a hardware chip called the **Programmable Interval Timer (PIT)** or local APIC timer before dispatching a process.
2. The timer counts down clock cycles. When the quantum expires, the timer fires an electrical **Hardware Interrupt**.
3. The CPU hardware forcibly pauses user execution, switches from **User Mode to Kernel Mode**, saves the process's registers onto the kernel stack, and transfers execution to the OS **Timer Interrupt Service Routine (ISR)**.
4. The ISR invokes the short-term CPU scheduler to select the next process.

---

### The Classic Interview Trap: Priority Inversion

In preemptive priority-based scheduling, a dangerous anomaly known as **Priority Inversion** can paralyze high-priority tasks (famously halting the Mars Pathfinder spacecraft in 1997):

```
Time | Task L (Low Priority)  | Task M (Medium Priority) | Task H (High Priority)
-----+------------------------+--------------------------+-----------------------
T1   | Acquires Lock A        |                          | Sleeping
T2   |                        |                          | Wakes up; needs Lock A
     |                        |                          | [BLOCKED: Waiting for L]
T3   |                        | Preempts L!              | [BLOCKED: Indirectly
     |                        | (Because Priority M > L) |  starved by M!]
```

- **The Problem:** High-priority task $H$ is waiting on a lock held by low-priority task $L$. An unrelated medium-priority task $M$ arrives. Because $Priority(M) > Priority(L)$, the scheduler preempts $L$ to run $M$. As a result, **$M$ indirectly delays $H$**, inverting their priorities!
- **The Solution (Priority Inheritance Protocol):** While low-priority task $L$ holds a resource that high-priority task $H$ needs, **$L$'s priority is temporarily elevated to match $H$'s priority**. This prevents medium-priority tasks like $M$ from preempting $L$, allowing $L$ to finish quickly, release the lock, and yield to $H$.

---

### Technical Comparison Matrix

| Feature | Preemptive Scheduling | Non-Preemptive Scheduling |
| :--- | :--- | :--- |
| **Control** | OS kernel forcibly preempts running threads. | Process voluntarily relinquishes CPU. |
| **Hardware Requirement** | Requires hardware timer interrupts. | Can run on primitive hardware without timers. |
| **Responsiveness** | **High.** Essential for interactive desktop & mobile OSs. | **Low.** Long batch jobs cause system freeze. |
| **Overhead** | Higher context switching overhead. | Lower context switching overhead. |
| **Classic Algorithms** | Round Robin (RR), Shortest Remaining Time First (SRTF). | First-Come First-Served (FCFS), Shortest Job First (SJF). |

---

### Summary
"Non-preemptive scheduling only switches when a process terminates or blocks on I/O. Preemptive scheduling uses hardware timer interrupts to forcibly reclaim the CPU when a time quantum expires or a higher-priority task wakes up, ensuring responsive multitasking. In priority systems, Priority Inheritance is required to prevent priority inversion."

---

### Code Demonstration: Cooperative vs. Preemptive Concurrency

<Tabs groupId="programming-language">
<TabItem value="c" label="C (POSIX Threads)">

```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <sched.h>
#include <unistd.h>

void* cooperative_worker(void* arg) {
    for (int i = 0; i < 3; i++) {
        printf("[Cooperative Thread %ld] Running step %d\n", (long)arg, i);
        // Explicitly yields CPU back to OS scheduler
        sched_yield();
    }
    return NULL;
}

int main() {
    pthread_t t1, t2;
    // POSIX pthreads are preemptively scheduled by the Linux kernel,
    // but threads can also cooperatively yield control:
    pthread_create(&t1, NULL, cooperative_worker, (void*)1);
    pthread_create(&t2, NULL, cooperative_worker, (void*)2);

    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import threading
import time

def busy_worker(thread_name):
    for i in range(3):
        print(f"[{thread_name}] Running step {i}")
        # time.sleep(0) or explicit sleep causes thread to cooperatively yield
        time.sleep(0.01)

if __name__ == "__main__":
    # Python threads are preemptively time-sliced by the interpreter / OS:
    t1 = threading.Thread(target=busy_worker, args=("Thread-1",))
    t2 = threading.Thread(target=busy_worker, args=("Thread-2",))
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
```

</TabItem>
<TabItem value="java" label="Java">

```java
public class SchedulingDemo {
    public static void main(String[] args) throws InterruptedException {
        Runnable task = () -> {
            for (int i = 0; i < 3; i++) {
                System.out.println("[" + Thread.currentThread().getName() + "] Step " + i);
                // Thread.yield() advises the short-term scheduler to switch
                Thread.yield();
            }
        };

        Thread t1 = new Thread(task, "Worker-1");
        Thread t2 = new Thread(task, "Worker-2");

        t1.start();
        t2.start();
        t1.join();
        t2.join();
    }
}
```

</TabItem>
</Tabs>