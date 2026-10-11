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

When two processes both want the CPU, who decides who runs? That's all scheduling is. The question that actually matters: **can the OS forcibly kick a running process off the CPU, or does it have to wait for that process to step aside on its own?**

---

### The analogy: the grocery checkout lane

- **Non-preemptive:** once a customer starts scanning groceries, nobody can interrupt them. Even with 200 items ahead of someone holding a single candy bar, that person waits for the whole cart. If the customer gets into an argument with the cashier, the line is stuck — forever.
- **Preemptive:** the manager enforces a rule — *"everyone gets 3 minutes at the register."* When the timer rings, the cashier pauses that order, serves the next person, and comes back to finish the first one later.

Preemptive scheduling is what every modern OS uses, because it's the only way to stay responsive.

---

### The four moments a scheduler can step in

1. **Running → Waiting:** the process asks for I/O or calls `wait()`.
2. **Running → Ready:** a timer interrupt fires — its time slice is up.
3. **Waiting → Ready:** an I/O operation finishes and wakes up a process (maybe a higher-priority one).
4. **Running → Terminated:** the process finishes or calls `exit()`.

The rule that separates the two scheduling styles:

- Scheduler only acts on **1 and 4** → **non-preemptive**. The process keeps the CPU until it yields or finishes on its own.
- Scheduler also acts on **2 and 3** → **preemptive**. The OS can yank the CPU away mid-execution.

---

### How does the OS actually force a process off the CPU?

Good follow-up question: if a program hits `while(1) {}`, how does the OS ever get control back?

In a non-preemptive OS (old Windows 3.1, classic Mac OS), it doesn't — the machine just freezes.

Modern systems solve this with a hardware timer:

1. Before dispatching a process, the kernel arms a hardware timer (the PIT, or a local APIC timer).
2. The timer counts down. When it hits zero, it fires a hardware interrupt.
3. The CPU forces a switch from user mode to kernel mode, saves the process's registers, and jumps into the kernel's timer interrupt handler.
4. That handler calls the scheduler, which picks the next process to run.

The process never gets a say in this — the hardware makes it happen.

---

### The classic trap: priority inversion

This is famous for once stalling the Mars Pathfinder rover. The setup:

| Time | Low-priority task (L) | Medium-priority task (M) | High-priority task (H) |
| :--- | :--- | :--- | :--- |
| T1 | Acquires Lock A | — | sleeping |
| T2 | — | — | wakes up, needs Lock A — **blocked**, waiting on L |
| T3 | — | preempts L (M > L in priority) | still blocked — now indirectly stuck behind M too |

H is blocked waiting on a lock held by L. Then M — which has nothing to do with that lock — shows up and preempts L simply because M has higher priority than L. Now M is accidentally delaying H, even though H outranks M. Their priorities have effectively flipped.

**The fix: priority inheritance.** While L holds a lock that H needs, bump L's priority up to match H's, temporarily. Now M can't preempt L anymore, L finishes fast, releases the lock, and H runs.

---

### Comparison

| Feature | Preemptive | Non-Preemptive |
| :--- | :--- | :--- |
| **Control** | OS can forcibly interrupt | Process gives up the CPU voluntarily |
| **Needs hardware timer** | Yes | No |
| **Responsiveness** | High — needed for desktop/mobile | Low — one long job can freeze everything |
| **Overhead** | Higher (more context switches) | Lower |
| **Examples** | Round Robin, Shortest Remaining Time First | FCFS, Shortest Job First |

---

### Say this in the interview

*"Non-preemptive scheduling only switches when a process blocks or finishes on its own. Preemptive scheduling uses a hardware timer interrupt to forcibly reclaim the CPU when a time slice runs out or a higher-priority task wakes up. In priority-based systems, you need priority inheritance, or a low-priority task holding a shared lock can end up indirectly starving a high-priority one — priority inversion."*

---

### Code: cooperative vs. preemptive concurrency

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
