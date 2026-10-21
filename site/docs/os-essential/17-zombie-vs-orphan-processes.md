---
id: 17-zombie-vs-orphan-processes
title: "Zombie vs. Orphan Processes"
description: "Understand zombie vs orphan processes, why kill -9 can't touch a zombie, PID exhaustion, and how production systems reap children with SIGCHLD."
sidebar_position: 17
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a zombie process and an orphan process? Why can't kill -9 terminate a zombie, what is PID starvation, and how do production systems prevent zombies?"

Every process in Unix has a parent — created it via `fork()`. Zombies and orphans are both about what happens when a parent and child stop being in sync with each other.

Think of it like an office:
- **Zombie:** an employee finishes their shift and leaves, but their manager forgets to sign the exit paperwork. The employee is gone, but their name still sits in the filing cabinet. They're "undead" on paper only.
- **Orphan:** a manager quits and walks out, but their employee is still at their desk working. The worker is fine — they just have no one to report to anymore.

---

<Diagram>
<Row>
<Box label="Zombie" sub="dead, not yet reaped" />
<Box label="Orphan" sub="alive, adopted by init" />
</Row>
</Diagram>

| | Zombie | Orphan |
| :--- | :--- | :--- |
| **What it is** | A child that has already terminated, but its parent hasn't read its exit status yet | A child that's still running, but its parent terminated or crashed |
| **State** | Dead — zero CPU, zero RAM | Alive — runs normally |
| **Footprint** | Still holds a slot and a PID in the process table | Normal process, full memory and PCB |
| **Risk** | Can exhaust available PIDs if left unreaped | None — just becomes a background process |
| **How it's cleaned up** | Parent calls `wait()`/`waitpid()` | Automatically reparented to `init`/`systemd` (PID 1) |

---

### Why `kill -9` can't touch a zombie

A lot of people's first instinct is "I see a zombie in `top`, just `kill -9` it." That can't work, and here's why: `kill -9` delivers a signal, and to receive a signal a process needs an active address space, a program counter, something to actually run. A zombie has none of that — its memory, stack, and heap are already freed. There's nothing left to signal.

The real fix is to kill the **parent**, not the zombie. Once the parent is gone, the zombie gets reparented to `init` (PID 1), which calls `wait()` on everything it adopts and wipes the zombie from the table almost immediately.

---

### Why zombies are actually dangerous: PID exhaustion

If a zombie uses zero CPU and zero RAM, why care? Because every OS has a hard limit on how many process IDs can exist at once (on Linux, see `/proc/sys/kernel/pid_max` — typically 32,768). If a buggy server keeps spawning children and never reaps them, zombies pile up and eventually eat every available PID. Once that happens, *nothing* on the machine can start a new process — SSH logins fail, cron jobs fail, even basic shell commands start throwing `fork: Resource temporarily unavailable`.

---

### How production code avoids this: `SIGCHLD`

A server can't just call `wait()` and block, since it needs to keep handling other requests. Instead, it registers a handler for `SIGCHLD` — a signal the kernel sends automatically whenever a child exits — and reaps non-blockingly:

```c
void sigchld_handler(int sig) {
    // WNOHANG ensures waitpid returns immediately if no more child exited:
    while (waitpid(-1, NULL, WNOHANG) > 0);
}
```

Every time a child dies, this handler fires, cleans it up, and returns — no stalling the main loop.

---

### Say this in the interview

*"A zombie is a child process that's already terminated but hasn't been reaped by its parent's `wait()` call — it's dead but still holds a PID slot, which can exhaust the PID table if it piles up. An orphan is a still-running process whose parent died first; it just gets adopted by `init`. You can't `kill -9` a zombie because it has no execution context left to receive a signal — you kill the parent instead. Production systems avoid zombies entirely with a non-blocking `SIGCHLD` handler that reaps children as they exit."*

---

### Code: non-blocking zombie prevention

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <signal.h>
#include <sys/wait.h>

// Signal handler to reap children asynchronously
void handle_sigchld(int sig) {
    int saved_errno = errno;
    // Non-blocking reap loop: reaps all dead children without pausing parent
    while (waitpid(-1, NULL, WNOHANG) > 0) {
        printf("[SIGCHLD Handler] Successfully reaped child process!\n");
    }
}

int main() {
    // Register asynchronous SIGCHLD handler
    struct sigaction sa;
    sa.sa_handler = handle_sigchld;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART | SA_NOCLDSTOP;
    sigaction(SIGCHLD, &sa, NULL);

    printf("[Parent PID: %d] Spawning worker...\n", getpid());
    pid_t pid = fork();

    if (pid == 0) {
        // Child executes and exits quickly
        printf("[Child PID: %d] Finished task, exiting immediately.\n", getpid());
        exit(0);
    }

    // Parent continues its normal event loop without blocking on wait()
    printf("[Parent] Continuing main loop without blocking...\n");
    sleep(2); // Gives time for SIGCHLD handler to fire
    printf("[Parent] Exiting cleanly with zero zombie leaks.\n");
    return 0;
}
```
