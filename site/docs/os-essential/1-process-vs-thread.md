---
id: 1-process-vs-thread
title: "Process vs. Thread: Architecture, Memory & Tradeoffs"
description: "Understand the core architectural differences between processes and threads, memory isolation, context switching costs, TLB flushing, and thread models."
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a process and a thread? Why is a process context switch significantly more expensive than a thread context switch, and when would you use one over the other?"

At the core of multitasking operating systems lies the distinction between a **Process** (the container of resources and isolated address space) and a **Thread** (the actual unit of CPU execution scheduled on a processor core).

---

### The ELI5 Analogy: The Restaurant and the Workers

Think of a **Process** as a restaurant:
- The restaurant has its own private building, its own ingredients, and its own lease (**isolated address space and file descriptors**).
- A **Thread** is an employee (chef, waiter) inside that restaurant.
- **Shared Kitchen:** All employees share the same kitchen, pantry, and dining floor (**shared heap, global variables, and code**).
- **Private Notepad:** Each employee carries their own private notepad to track current tasks (**private stack and CPU registers**).
- **Scaling Overhead:** Building a brand-new restaurant from scratch takes weeks and heavy capital (heavyweight process creation). Hiring another worker in an existing restaurant takes minutes (lightweight thread creation).
- **Blast Radius:** If one restaurant burns down, neighboring restaurants are unharmed (**process fault isolation**). But if one chef spills toxic chemicals into the shared soup pot, the entire restaurant shuts down (**thread memory corruption**).

---

### Under the Hood: Architectural Breakdown

```
        PROCESS 1 (Isolated Address Space)
┌─────────────────────────────────────────────────┐
│ Code (Text) Segment  |  Global / Data Segment   │
├─────────────────────────────────────────────────┤
│ Heap (Dynamic Allocation - Shared across threads)│
├───────────────────────┬─────────────────────────┤
│       Thread 1        │        Thread 2         │
│  [Registers | Stack]  │   [Registers | Stack]   │
└───────────────────────┴─────────────────────────┘
```

#### 1. Internal Kernel Control Blocks
- **Process Control Block (PCB):** Maintained by the kernel. Contains Process ID (PID), memory management maps (Page Tables), open file descriptors, user credentials, signal handlers, and IPC state.
- **Thread Control Block (TCB):** Much smaller footprint. Contains Thread ID (TID), thread scheduling priority, program counter (PC), CPU register state, and stack pointer (SP). Points back to its parent PCB.

#### 2. The Core Interview Trap: Why Process Context Switches Are Slow
Candidates often answer that "processes use more memory." The real hardware explanation lies in **address translation and CPU caching**:

- **Thread Context Switch:** Both threads belong to the same process. They share the same virtual-to-physical memory page table. The CPU switches registers and stack pointers, but **the memory mapping remains intact**. The **Translation Lookaside Buffer (TLB)** remains valid, and CPU L1/L2 caches stay warm.
- **Process Context Switch:** The OS must switch virtual address spaces by loading a new page table base address into the CPU (e.g., reloading the `CR3` control register on x86). This hardware reload **completely flushes/invalidates the TLB** (unless using tagged ASIDs). Subsequent memory reads experience severe cache misses and TLB misses until the CPU warms up the new process's working set.

#### 3. Thread Execution Models
- **1:1 (Kernel-Level Threads / KLT):** Every application thread maps directly to an OS kernel thread (standard in modern Linux `pthreads`, Java, C++). Handled directly by the kernel scheduler; true multi-core parallelism.
- **M:1 (User-Level Threads / ULT / Green Threads):** Multiple user threads multiplexed on one kernel thread. Fast user-space context switches, but a single blocking system call blocks all $M$ threads.
- **M:N (Hybrid / Two-Tier):** Multiplexes $M$ lightweight user routines across $N$ OS kernel threads (e.g., Go Goroutines, Erlang BEAM). Achieves high-concurrency with minimal stack memory overhead.

---

### Technical Comparison Matrix

| Feature | Process | Thread |
| :--- | :--- | :--- |
| **Definition** | Independent executing program instance. | Smallest schedulable unit of CPU execution. |
| **Memory Isolation** | **Strictly isolated.** Separate code, data, heap, and stack. | **Shared heap, data, and code.** Private stack and registers. |
| **Context Switch Overhead** | **High.** Requires TLB flush, page table swap (`CR3`), cache thrashing. | **Low.** Only saves/restores CPU registers and stack pointer. |
| **Inter-Communication** | Requires **IPC** (Pipes, Unix Sockets, Shared Memory, Message Queues). | Direct shared memory reads/writes (requires synchronization locks). |
| **Creation Cost** | High (memory allocation, page table setup, COW pages). | Minimal (allocates thread stack and registers). |
| **Fault Isolation** | High (process crash does not affect other processes). | Low (unhandled segmentation fault kills entire process). |

---

### When to Use Which?

- **Use Processes When:**
  - Tasks require strict fault tolerance and security isolation.
  - *Example:* Google Chrome tabs. Each tab runs in an isolated sandboxed process so a malformed JavaScript exploit or crash in one tab cannot read secrets or crash other tabs.
- **Use Threads When:**
  - Tasks require high-throughput parallel computation and tight data sharing with low communication latency.
  - *Example:* High-performance web servers (e.g., multi-threaded HTTP servers or database query execution engines).

---

### Summary
"A process is an isolated instance of an executing program with its own address space, PCB, and open handles. A thread is an execution context within a process that shares the heap, data, and code segments, but owns its private stack and registers. Process context switches are significantly slower because swapping page tables invalidates the Translation Lookaside Buffer (TLB) and thrashes CPU caches."

---

### Crucial Nuance: Thread-Local Storage (TLS)
Although threads share the heap and static global variables, modern runtimes provide **Thread-Local Storage (TLS)** (e.g., `__thread` in C, `thread_local` in C++, `ThreadLocal` in Java). TLS variables allocate a separate copy for each thread, providing static-variable semantics without race conditions.

---

### Code Demonstration: Memory Isolation vs. Shared Memory

<Tabs groupId="programming-language">
<TabItem value="c" label="C">

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/wait.h>

int shared_variable = 100;

void* thread_function(void* arg) {
    shared_variable += 50; // Directly modifies shared process heap/data
    printf("[Thread] Modified shared_variable to: %d\n", shared_variable);
    return NULL;
}

int main() {
    printf("--- THREAD DEMO (Shared Memory) ---\n");
    pthread_t tid;
    pthread_create(&tid, NULL, thread_function, NULL);
    pthread_join(tid, NULL);
    printf("[Main Thread] shared_variable is now: %d\n\n", shared_variable);

    printf("--- PROCESS DEMO (Isolated Memory) ---\n");
    pid_t pid = fork();
    if (pid == 0) {
        // Child process gets an isolated copy (Copy-On-Write)
        shared_variable += 200;
        printf("[Child Process] modified shared_variable to: %d\n", shared_variable);
        exit(0);
    } else {
        wait(NULL);
        // Parent process remains unchanged
        printf("[Parent Process] shared_variable remains: %d\n", shared_variable);
    }
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import threading
import multiprocessing

# Global state
counter = 100

def thread_task():
    global counter
    counter += 50
    print(f"[Thread] counter updated to: {counter}")

def process_task(val):
    # Separate address space
    global counter
    counter += val
    print(f"[Child Process] counter is: {counter}")

if __name__ == "__main__":
    print("--- THREAD DEMO (Shared Memory) ---")
    t = threading.Thread(target=thread_task)
    t.start()
    t.join()
    print(f"[Main Thread] counter is now: {counter}\n")

    print("--- PROCESS DEMO (Isolated Memory) ---")
    p = multiprocessing.Process(target=process_task, args=(200,))
    p.start()
    p.join()
    print(f"[Parent Process] counter remains: {counter}")
```

</TabItem>
<TabItem value="java" label="Java">

```java
public class ProcessVsThreadDemo {
    private static int sharedCounter = 100;

    public static void main(String[] args) throws InterruptedException {
        System.out.println("--- THREAD DEMO (Shared Memory) ---");
        Thread worker = new Thread(() -> {
            sharedCounter += 50;
            System.out.println("[Worker Thread] Modified sharedCounter to: " + sharedCounter);
        });

        worker.start();
        worker.join();
        System.out.println("[Main Thread] sharedCounter is now: " + sharedCounter);

        // In Java, separate processes are spawned via ProcessBuilder,
        // running in completely distinct JVM instances with isolated memory.
    }
}
```

</TabItem>
</Tabs>