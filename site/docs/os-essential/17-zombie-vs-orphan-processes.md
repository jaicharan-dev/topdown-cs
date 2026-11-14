---
id: 17-zombie-vs-orphan-processes
title: "Zombie vs. Orphan Processes"
description: "One has died and not been collected, the other has lost its parent, and only one is a problem"

sidebar_position: 17
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a zombie process and an orphan process? Why can't kill -9 terminate a zombie, what is PID starvation, and how do production systems prevent zombies?"

---

### Picture it

Think of a records office where every employee has a file, and a file can only be closed by that person's manager.

**A zombie is a file that should have been closed.** The employee has left the building, handed in their badge and gone. They do nothing, occupy no desk, and consume no resources except one thing: their file is still open, because their manager never came to collect the final paperwork. The file sits there holding a single number, their reason for leaving, waiting for a manager who may never arrive.

**An orphan is an employee whose manager left first.** They are still working, still doing their job. The difference is that nobody is now responsible for closing their file when they eventually finish. The office handles this automatically: orphans are reassigned to the director, who makes a point of collecting paperwork promptly.

So one is a dead worker with unfinished paperwork, and the other is a live worker with a new manager. Only the first is a problem, and the problem is not the worker, it is the paperwork.

And the thing people find odd: you cannot fire someone who has already left. Shouting at the empty desk achieves nothing. The only way to clear the file is to make the manager collect it, or to remove the manager so the director takes over.

---

### The proper terms

#### Zombie process

A **zombie**, shown as state **Z** or `defunct`, is a process that has **terminated** but whose **exit status** has not yet been collected by its parent.

When a process exits, the kernel releases almost everything: its memory, open files and address space are gone. What remains is the entry in the **process table** holding the **PID**, the **exit status** and resource usage figures.

That entry is kept because the parent may still want it. The parent collects it by calling **wait()** or **waitpid()**, an act called **reaping** the child. Once reaped, the entry is freed and the zombie disappears.

So a zombie consumes **no CPU and no memory**, only a process table entry. A handful are harmless and normal, briefly, between a child exiting and its parent reaping.

#### Orphan process

An **orphan** is a process whose **parent has terminated** while it is still running.

The kernel immediately **reparents** it, traditionally to **PID 1**, the **init** process, or on modern Linux to the nearest ancestor marked as a **subreaper**, such as a systemd user manager.

Because init reaps continuously, an orphan is harmless: when it finally exits, its new parent collects the status promptly and no zombie persists.

A **daemon** is a deliberate orphan, created by forking and letting the parent exit so the child is adopted by init and detached from the terminal.

#### Why kill -9 cannot remove a zombie

Because the process is **already dead**. `kill` sends a **signal**, and signals are delivered to running processes so they can act on them. **SIGKILL** terminates a process that is executing, and a zombie has no code, no memory and no execution context to terminate. There is nothing left to kill.

What remains is a **record**, and records are removed by being **read**, not by being signalled.

The actual remedies are therefore:

**Make the parent reap it**, by sending the parent **SIGCHLD**, which may prompt a correctly written handler to call `wait()`.

**Kill the parent.** The zombie is then reparented to init, which reaps it immediately. This is the usual practical fix, and it works because it changes who is responsible rather than attacking the zombie.

#### PID starvation

The process table is **finite**. Linux caps process IDs at `/proc/sys/kernel/pid_max`, commonly 32768 by default and configurable higher.

A parent that forks repeatedly and never reaps accumulates zombies, each holding a PID. If they accumulate until the table is exhausted, **no new process can be created anywhere on the system**. `fork()` begins returning **EAGAIN**, and the machine cannot start new programs, often including the shell you would use to fix it.

That is **PID starvation**, and it is why a zombie leak is a genuine production outage rather than a cosmetic oddity.

#### How production systems prevent them

**Call `wait()` or `waitpid()`** for every child, which is simply doing the job properly.

**Install a `SIGCHLD` handler** that loops on `waitpid(-1, &status, WNOHANG)` until it returns zero, reaping every finished child. The loop matters because signals are not queued: several children exiting at once may deliver only one SIGCHLD.

**Set `SIGCHLD` to `SIG_IGN`**, or use `SA_NOCLDWAIT`, which tells the kernel the parent is not interested, so children are reaped automatically and never become zombies.

**The double fork.** Fork a child, have the child fork a grandchild and exit immediately, then the parent reaps the short-lived child. The grandchild is orphaned and adopted by init, which reaps it. This is the classic daemonisation technique.

**Use a proper init inside containers.** PID 1 in a container is your application, which usually does not reap. Adding `--init`, or `tini`, supplies a real reaper, which is the standard fix for zombie accumulation in containers.

---

### In code

```c
// Creating a zombie deliberately
pid_t pid = fork();
if (pid == 0) {
    _exit(0);                    // child exits at once
}
sleep(60);                       // parent never calls wait()
// For those 60 seconds the child is a zombie: ps shows it as <defunct>.
// kill -9 on it does nothing. Killing the parent clears it instantly.
```

```c
// Creating an orphan deliberately
pid_t pid = fork();
if (pid == 0) {
    sleep(60);                   // child outlives the parent
    _exit(0);                    // by now its parent is init, which reaps it
}
_exit(0);                        // parent exits first
```

```c
// The correct SIGCHLD handler: a loop, because signals are not queued
void reap(int sig) {
    while (waitpid(-1, NULL, WNOHANG) > 0) {
        ;                        // keep going until no more have exited
    }
}

struct sigaction sa = { .sa_handler = reap, .sa_flags = SA_RESTART };
sigemptyset(&sa.sa_mask);
sigaction(SIGCHLD, &sa, NULL);
```

```c
// Or simply decline the exit statuses altogether
signal(SIGCHLD, SIG_IGN);        // the kernel reaps children automatically
```

---

### What they ask next

**"Does a zombie use memory?"**
No. Its address space, file descriptors and stack are already released. It holds only a process table entry carrying the PID and exit status, so the resource at risk is PIDs, not RAM.

**"What happens if init is killed?"**
It cannot be, by ordinary means. The kernel protects PID 1 from signals it has not registered a handler for, because its death would leave the system with no reaper and nothing to reparent orphans to. Killing it panics the kernel.

**"Why does the SIGCHLD handler need a loop?"**
Standard signals are not queued. If three children exit at nearly the same moment, the parent may receive a single SIGCHLD, so a handler reaping one child would leave two zombies. Looping with `WNOHANG` drains them all.

**"Why do containers accumulate zombies?"**
Because the application is PID 1 and application code rarely implements reaping. Orphans inside the container are reparented to it and never collected. Running a minimal init as PID 1 solves it.

**"Is an orphan ever a problem?"**
Not in itself, since init reaps it. The practical concern is that an orphan may be an unsupervised process nobody is monitoring, which is a process management issue rather than a resource leak.

**The common wrong answer** is "a zombie is a process stuck in an infinite loop". That is a runaway process, which is very much alive and genuinely consuming CPU. A zombie consumes nothing and cannot be killed precisely because it is already dead.

---

### Say this in the interview

*"A zombie is a process that has terminated but whose exit status has not yet been collected by its parent. Its memory, file descriptors and address space are already released; all that remains is a process table entry holding the PID and exit status, kept so the parent can read it. The parent collects it with wait or waitpid, which is called reaping.*

*An orphan is a process whose parent terminated while it was still running. The kernel reparents it to PID 1, init, or to the nearest subreaper. Orphans are harmless because init reaps continuously. A daemon is a deliberate orphan.*

*kill -9 cannot remove a zombie because the process is already dead. Signals are delivered to running processes, and a zombie has no execution context to terminate. What remains is a record, and records are cleared by being read, not signalled. So you either prompt the parent to reap, or kill the parent, after which init adopts the zombie and reaps it immediately.*

*PID starvation is the real danger. The process table is finite, with pid_max commonly 32768, so a parent that forks without reaping can exhaust it, after which fork fails with EAGAIN and no new process can start anywhere on the system.*

*Prevention is to call wait for every child, or install a SIGCHLD handler looping on waitpid with WNOHANG, since signals are not queued and several children may yield only one SIGCHLD. Setting SIGCHLD to SIG_IGN makes the kernel reap automatically. The double fork is the classic daemon technique, and in containers the fix is running a real init such as tini as PID 1."*
