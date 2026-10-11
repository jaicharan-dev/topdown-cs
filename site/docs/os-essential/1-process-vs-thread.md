---
id: 1-process-vs-thread
title: "Process vs. Thread: Architecture, Memory & Tradeoffs"
description: "Understand the core architectural differences between processes and threads, memory isolation, context switching costs, TLB flushing, and thread models."
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a process and a thread? Why is a process context switch significantly more expensive than a thread context switch, and when would you use one over the other?"

A process and a thread are both "running code" — the difference is how isolated each one is.

---

### The analogy: a restaurant and its workers

Think of a **process** as a restaurant: it has its own building, its own ingredients, its own lease — nothing is shared with the restaurant next door. A **thread** is a worker inside that restaurant — a chef, a waiter.

- **Shared kitchen:** every worker shares the same kitchen, pantry, and dining floor — that's the process's shared heap, global variables, and code.
- **Private notepad:** each worker still keeps their own notepad for their own current task — that's a thread's private stack and registers.
- **Opening a new restaurant** takes weeks and real money (creating a process). **Hiring another worker** in an existing restaurant takes minutes (creating a thread).
- **If one restaurant burns down**, the one next door is fine — that's process isolation. But **if one chef dumps something toxic in the shared pot**, the whole restaurant is affected — that's what a thread crash does to its process.

---

### What's actually shared, under the hood

<Diagram>
<Box title="Process: isolated address space" accent="#818cf8">
<Field icon="📄" code="Code + Data segment" hint="shared by every thread in this process" variant="neutral" />
<Field icon="🗄️" code="Heap" hint="shared, dynamically allocated" variant="neutral" />
<Row>
<Box title="Thread 1" accent="#34d399">
<Field icon="📝" code="registers + stack" hint="private to this thread" variant="neutral" />
</Box>
<Box title="Thread 2" accent="#34d399">
<Field icon="📝" code="registers + stack" hint="private to this thread" variant="neutral" />
</Box>
</Row>
</Box>
</Diagram>

#### 1. What the kernel tracks for each one

- **Process Control Block (PCB):** one per process. Holds the process ID, its page tables (memory map), open file descriptors, and more.
- **Thread Control Block (TCB):** much smaller. Holds the thread ID, its registers, its stack pointer, and a pointer back to its parent PCB.

#### 2. Why switching processes is so much slower than switching threads

The common wrong answer is "processes use more memory." The real reason is about hardware, not size:

- **Switching threads:** both threads belong to the same process, so they share the same memory map. The CPU just swaps registers and the stack pointer — the memory map stays valid, so the CPU's address-translation cache (the **TLB**) and its data caches stay warm.
- **Switching processes:** the CPU has to load a whole new memory map (on x86, reloading the `CR3` register). That flushes the TLB. Every memory access afterward runs slow until the cache warms back up.

#### 3. How threads actually get scheduled

- **1:1 (kernel threads):** each thread you create maps to one real OS thread. This is how Linux, Java, and C++ normally work — true parallelism across cores.
- **M:1 (green threads):** many threads multiplexed onto a single OS thread. Fast to switch between, but one blocking call blocks all of them.
- **M:N (hybrid):** M lightweight threads spread across N OS threads — what Go's goroutines and Erlang do. High concurrency, low memory overhead.

---

### Comparison

| | Process | Thread |
| :--- | :--- | :--- |
| **Memory** | Fully isolated — separate code, data, heap, stack | Shares heap, data, code — private stack and registers |
| **Context switch cost** | High — flushes the TLB, reloads the page table | Low — just swaps registers and the stack pointer |
| **Talking to each other** | Needs IPC — pipes, sockets, shared memory | Direct shared-memory access (needs locks) |
| **Creation cost** | High — new memory space, new page tables | Low — just a new stack and register set |
| **If it crashes** | Other processes are unaffected | Can take down the whole process |

---

### When to reach for which

- **Use processes** when you need real fault isolation. Chrome runs each tab in its own process, so a crash or exploit in one tab can't touch another.
- **Use threads** when you need fast, tightly-shared parallel work. A multi-threaded web server or database engine is the classic case.

---

### Say this in the interview

*"A process is an isolated running program with its own address space. A thread is a unit of execution inside a process, sharing its heap and code but owning a private stack and registers. Process switches are slower because reloading the page table flushes the TLB and cold-starts the CPU cache — not because of memory size."*

---

### One more thing: Thread-Local Storage (TLS)

Threads share the heap and global variables — but most languages also give each thread its own private copy of specific variables, via `__thread` in C, `thread_local` in C++, or `ThreadLocal` in Java. That's Thread-Local Storage: same variable name, a separate value per thread, no locks needed.

---

### Code: shared memory vs. isolated memory

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
