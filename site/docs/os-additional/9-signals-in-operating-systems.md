---
id: 9-signals-in-operating-systems
title: "Signals in Unix and Linux"
description: "A notification that interrupts you mid-instruction, delivered by the kernel forging a function call on your own stack"

sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What are signals in Unix/Linux? How do they differ from standard IPC, how does the kernel physically dispatch a signal handler onto user space, and why is calling `printf()` or `malloc()` inside a signal handler dangerous?"

---

### Picture it

You are in the middle of a long calculation when someone taps you on the shoulder.

**They do not hand you anything.** They do not give you a document or a message. The tap itself **is** the entire communication: something happened, and the only information is **which kind of tap** it was. That is what separates this from somebody posting you a letter.

**You did not choose the moment.** A letter sits in the tray until you decide to open it. A tap lands **wherever you happen to be**, possibly in the middle of writing a number, with half of it on the page.

**Taps do not queue.** If three people tap you while you are mid-sentence, you turn round once and see one person waiting. You have no way to know whether it was one tap or three.

Now the part that is genuinely clever, and is what the question is really asking.

Your manager wants you to **drop this and do something else, then come back exactly where you were**. They cannot do the task for you. So they do something slightly underhanded: they **write a note on your own desk** recording precisely what you were doing, down to the half-written number, and then **put a different piece of work on top**, with an instruction at the bottom that says **"when you finish this, read the note underneath and carry on from there"**.

You never notice the handover. You do the new task, reach the instruction, restore yourself from the note, and resume as though nothing happened.

**And here is why the interruption is dangerous.**

Suppose you were **halfway through reorganising the filing cabinet**. Drawers are open, one folder is out, the index is half rewritten. The tap arrives, and the new task **also needs the filing cabinet**. It finds the cabinet in a state that never normally exists, or waits for a drawer that only you can close, and you are standing there waiting to be allowed to continue closing it.

You are stuck waiting for yourself.

---

### The proper terms

#### What a signal is

A **signal** is an **asynchronous software interrupt** delivered to a process or thread. It is the Unix mechanism for telling a process that an event has occurred.

The defining property: a signal carries **almost no data**. It is a **number**, one of roughly 31 standard signals, plus for some a **`siginfo_t`** giving the sender's PID, UID and a cause code. It is a **notification**, not a transport.

Each signal has a **default action** built into the kernel, which applies when no handler is installed: **terminate**, terminate and dump core, **ignore**, **stop**, or **continue**. A process may **catch** a signal with a handler, **ignore** it, or **block** it with a signal mask, except for **`SIGKILL`** and **`SIGSTOP`**, which can be none of those things.

#### How signals differ from standard IPC

Five differences, and naming them is what the question is after:

**They carry no data.** Pipes, message queues, sockets and shared memory all **transfer content**. A signal transfers only the fact that something happened, which is why it cannot replace IPC.

**They are asynchronous and preemptive.** IPC is read **when you choose**, at a point in your code you selected. A signal interrupts at **an arbitrary instruction**, possibly inside a half-completed update to your own data.

**Standard signals do not queue.** Pending signals are a **bitmask**, so three `SIGCHLD` deliveries before any is handled may be observed **once**. This is why a `SIGCHLD` handler must loop on `waitpid` with `WNOHANG`. **Real-time signals**, `SIGRTMIN` to `SIGRTMAX`, **do queue** and carry a value, which is the fix for this.

**The kernel is itself a sender.** **`SIGSEGV`**, **`SIGFPE`**, **`SIGILL`** and **`SIGBUS`** are the kernel telling a process about its own fault. No IPC mechanism does that, and it is why signals are part of the process model rather than a communication facility.

**Default actions exist in the kernel.** A process that has never set anything up still dies on `SIGTERM`. Nothing comparable exists for a pipe.

#### How the kernel dispatches a handler onto user space

This is the mechanically interesting part, and the thing that separates a memorised answer from a real one.

**1. Sending only marks it pending.** `kill()` sets a bit in the target's pending signal set in its `task_struct` and wakes it if it was blocked in an interruptible sleep. Nothing is delivered at this point, and the sender returns immediately.

**2. Delivery happens on the way back to user mode.** The kernel checks for pending, unblocked signals in **`do_signal()`**, on the **return path from a system call, interrupt or exception**. A process executing a tight loop in user space with no system calls is still interrupted, because the **timer interrupt** provides the kernel entry.

**3. The kernel must run user code in user mode**, and it cannot simply call the function, because the handler belongs to the process and must execute at user privilege on the user stack.

So it **constructs a frame on the user's own stack**:

It saves the **complete interrupted register state** into a **`sigcontext`** inside a **`ucontext_t`** on that stack, along with the **`siginfo_t`**.

It then modifies the saved registers that will be restored on return to user mode, so that **`RIP` points at the handler** and **`RSP` points at the new frame**.

It sets the frame's **return address to a small trampoline**, which on modern Linux lives in the **vDSO** and whose only job is to invoke **`rt_sigreturn()`**.

**4. The return to user mode happens normally**, and the process finds itself executing the handler, in user mode, on its own stack, with the signal temporarily blocked along with anything in the handler's **`sa_mask`**.

**5. The handler returns into the trampoline**, which issues **`rt_sigreturn`**. The kernel **restores the saved register state from the user stack** and returns, and execution resumes **at the exact instruction that was interrupted**.

The elegance is worth naming: **the kernel forges a function call on the process's own stack and then lets the ordinary return-to-user path deliver it.** The process is never told it was interrupted.

One security consequence worth mentioning: because `rt_sigreturn` restores **every register** from a structure on the user stack, an attacker who can write a fake frame and trigger that call controls the entire register state. That is **sigreturn-oriented programming**, SROP.

#### Why `printf()` and `malloc()` are dangerous in a handler

The root cause is that a handler can interrupt the main program **at any instruction**, including **inside a non-reentrant function the handler is about to call**.

**`malloc()` is the clean example.** It manages a global heap protected by a lock and linked by free lists. Suppose the signal arrives while the main code is inside `malloc`, holding the lock and halfway through unlinking a chunk. The handler then calls `malloc`:

**If the lock is non-recursive, the handler waits for a lock held by itself.** The thread is blocked on something only it can release and it cannot proceed to release it. This is a **self-deadlock**, and it needs no second thread.

**If it proceeds, it operates on a heap in a state that never normally exists**, with a half-unlinked chunk, and corrupts it.

**`printf()` has the same problem twice over**: stdio has its own buffers and locks, and it may call `malloc` internally. On top of that, output interleaves with a partly flushed buffer.

The rule is **async-signal-safety**. POSIX defines a specific list of functions guaranteed safe to call from a handler, including **`write`**, **`_exit`**, **`read`**, **`kill`**, **`sigaction`** and **`signalfd`**. Note the shape of the list: **`write` is safe and `printf` is not**, because `write` is a thin system call wrapper with no shared state.

The correct patterns, in increasing order of modernity:

**Set a flag and return.** Declare it **`volatile sig_atomic_t`**, set it in the handler, and act on it in the main loop. The handler does nothing else.

**Use `write(2, msg, len)`** for output, never `printf`.

**The self-pipe trick.** The handler writes **one byte to a pipe**; the main loop is already in `select`, `poll` or `epoll` and wakes up. This converts an **asynchronous signal into a synchronous, pollable event**, which is the key idea.

**`signalfd()`**, the modern Linux answer. Block the signals, create a descriptor, and **read them as ordinary file descriptor events** inside your event loop. There is no handler at all, so no async-signal-safety constraint exists, and you may call anything you like.

**A dedicated thread** blocking in `sigwaitinfo()` while all other threads block the signal, which achieves the same thing portably.

One more rule that is easy to forget: **a handler must save and restore `errno`**, because any call it makes may overwrite the value the interrupted code was about to inspect.

---

### In code

```text
Why a signal is not IPC:

  PIPE / SOCKET / QUEUE        SIGNAL
  transfers DATA               transfers only THE FACT that
                               something happened (a number,
                               plus siginfo_t for some)
  read WHEN YOU CHOOSE         interrupts at an ARBITRARY instruction
  every message arrives        standard signals do NOT QUEUE:
                               three SIGCHLDs may be seen as ONE
  sent by another process      the KERNEL is a sender too:
                               SIGSEGV, SIGFPE, SIGILL, SIGBUS are
                               the kernel reporting YOUR OWN FAULT
  no behaviour if ignored      DEFAULT ACTIONS live in the kernel:
                               terminate, core dump, ignore, stop,
                               continue

  and SIGKILL and SIGSTOP can be neither caught, ignored nor blocked.
```

```text
How the kernel gets a handler running in user mode:

  1. kill() sets a bit in the target's PENDING SET and wakes it.
     NOTHING is delivered yet. The sender returns immediately.

  2. delivery happens in do_signal(), on the RETURN PATH to user mode
     from a syscall, interrupt or exception.
     (a tight user-space loop is still interrupted: the TIMER
      INTERRUPT provides the kernel entry)

  3. the kernel cannot just call the handler: it is user code and
     must run at user privilege on the user stack. So it FORGES A
     CALL on that stack:

        user stack before            user stack after
        +-----------------+          +-----------------+
        | main's frame    |          | main's frame    |
        +-----------------+          +-----------------+
        | ...             |          | ucontext_t      | <- FULL saved
        |                 |          |   (sigcontext)  |    register
        |                 |          | siginfo_t       |    state
        |                 |          +-----------------+
        |                 |          | return address  | -> trampoline
        +-----------------+          +-----------------+ <- RSP
                                           ^ and RIP is set to the
                                             handler

  4. return to user mode happens NORMALLY, and the process finds
     itself in the handler, in user mode, on its own stack, with
     this signal blocked plus anything in sa_mask

  5. the handler returns into the TRAMPOLINE (in the vDSO), which
     calls rt_sigreturn(). The kernel restores every register from
     the frame on the user stack and returns.
     -> execution resumes at the EXACT INTERRUPTED INSTRUCTION

  the elegance: the kernel forges a function call on the process's
  own stack, then lets the ordinary return-to-user path deliver it.
  The process is never told it was interrupted.

  security note: rt_sigreturn restores EVERY register from a
  user-stack structure, so an attacker who can forge a frame and
  trigger it controls the whole register state. That is SROP.
```

```c
// Why malloc() in a handler is a self-deadlock, not a race
//
// main thread:
//     p = malloc(64);
//         -> takes the heap lock
//         -> begins unlinking a chunk from a free list
//   *** SIGNAL ARRIVES HERE ***
//
// handler, ON THE SAME THREAD:
//     q = malloc(32);
//         -> tries to take the heap lock
//         -> the lock is held... BY THIS VERY THREAD
//         -> it waits for something only it can release, and it
//            cannot proceed to release it
//
//     SELF-DEADLOCK. No second thread is involved.
//
// and if the lock were recursive, it would be worse: the handler
// would operate on a heap with a HALF-UNLINKED CHUNK, a state that
// never normally exists, and corrupt it.
//
// printf() has the same problem twice: stdio has its own buffers
// and locks, AND it may call malloc internally.
```

```c
// WRONG
void handler(int sig) {
    printf("got signal %d\n", sig);   // stdio locks + maybe malloc
    char *buf = malloc(128);          // heap lock
}

// RIGHT: do almost nothing
volatile sig_atomic_t got_sigterm = 0;

void handler(int sig) {
    int saved = errno;                // a handler MUST preserve errno
    got_sigterm = 1;                  // set a flag...
    write(2, "shutting down\n", 14);  // ...and write() IS safe
    errno = saved;
}

// then act on it in the main loop, where everything is allowed:
while (running) {
    if (got_sigterm) { cleanup(); break; }
    do_work();
}
```

```text
Async-signal-safety: the shape of the list tells you the rule

  SAFE        write, read, _exit, kill, sigaction, signalfd,
              open, close, dup2, fork, execve, ...
              -> thin syscall wrappers with NO SHARED STATE

  NOT SAFE    printf, malloc, free, exit (vs _exit), syslog,
              most of the standard library
              -> anything with locks, buffers or global structures

  write() is safe and printf() is not, which is the whole rule
  in one comparison.
```

```c
// The self-pipe trick: turn an async signal into a pollable event
int sp[2];
pipe2(sp, O_NONBLOCK | O_CLOEXEC);

void handler(int sig) {
    int saved = errno;
    write(sp[1], &(char){1}, 1);      // one byte, async-signal-safe
    errno = saved;
}
// the main loop is already in epoll_wait() on sp[0], so it simply
// wakes up and handles the signal SYNCHRONOUSLY, where anything
// is permitted.
```

```c
// signalfd(): the modern Linux answer, with no handler at all
sigset_t mask;
sigemptyset(&mask);
sigaddset(&mask, SIGTERM);
sigaddset(&mask, SIGCHLD);
sigprocmask(SIG_BLOCK, &mask, NULL);   // block them: no handler runs

int sfd = signalfd(-1, &mask, SFD_CLOEXEC);
// add sfd to epoll. Signals now arrive as ORDINARY READABLE EVENTS.

struct signalfd_siginfo si;
read(sfd, &si, sizeof si);
printf("signal %u from pid %u\n", si.ssi_signo, si.ssi_pid);
// printf is fine here: this is the main loop, not a handler.
// There is no async-signal-safety constraint, because there is no
// handler interrupting anything.
```

---

### What they ask next

**"Why is a signal not IPC?"**
Because it carries no data. It tells you only that an event of a particular kind occurred, with at most a `siginfo_t`. Everything that actually transfers content, pipes, queues, sockets and shared memory, is a different category of mechanism.

**"Why must a `SIGCHLD` handler loop?"**
Because standard signals are a bitmask and do not queue. Three children exiting at nearly the same moment may deliver a single `SIGCHLD`, so a handler that reaps one child leaves two zombies. Looping on `waitpid` with `WNOHANG` until it returns zero drains them all.

**"Where exactly does the handler run?"**
In user mode, on the process's own stack, or on an alternate stack if one was set with `sigaltstack`, which is essential for handling `SIGSEGV` caused by stack overflow since the normal stack is unusable. The kernel builds the frame and then returns to user mode as usual.

**"How does the process resume afterwards?"**
Through the trampoline on the forged frame, which calls `rt_sigreturn`. The kernel restores every register from the `sigcontext` saved on the user stack, so execution continues at the exact interrupted instruction.

**"Why is `malloc` unsafe but `write` safe?"**
`malloc` holds a lock and manipulates global free lists, so interrupting it leaves inconsistent state and calling it from the handler deadlocks the thread against itself. `write` is a thin wrapper around a system call with no user-space shared state, so there is nothing to catch mid-update.

**"What is the best modern pattern?"**
`signalfd` with the signals blocked, so they arrive as readable events in your event loop and no handler exists at all. That removes the async-signal-safety constraint entirely. The self-pipe trick is the portable equivalent, and a flag of type `volatile sig_atomic_t` is the minimum.

**"Can `SIGKILL` be handled?"**
No, and neither can `SIGSTOP`. They cannot be caught, ignored or blocked, which is precisely so that a process can always be stopped or killed regardless of what it has installed.

**"Why must a handler preserve `errno`?"**
Because any function it calls may set `errno`, overwriting the value the interrupted code was about to check. Saving it on entry and restoring it on exit is a one-line fix for a bug that is otherwise maddening to find.

**The common wrong answer** is describing signals as a lightweight IPC mechanism. They transfer no data, do not reliably queue, and arrive at an arbitrary instruction. The valuable half of the answer is the dispatch mechanism, where **the kernel writes a frame onto the process's own stack and redirects the saved instruction pointer**, and the reason that mechanism makes `malloc` unsafe: the handler can interrupt the main program **inside the very function it is about to call**.

---

### Say this in the interview

*"A signal is an asynchronous software interrupt delivered to a process. The defining property is that it carries almost no data: it is a number, one of about 31 standard signals, plus a siginfo_t for some giving the sender's PID and a cause code. It is a notification, not a transport. Each has a kernel default action when no handler is installed: terminate, terminate with a core dump, ignore, stop or continue. A process can catch, ignore or block a signal, except SIGKILL and SIGSTOP, which can be none of those.*

*It differs from standard IPC in five ways. It carries no data, where pipes, queues, sockets and shared memory all transfer content. It is asynchronous and preemptive, interrupting at an arbitrary instruction rather than being read when you choose. Standard signals do not queue, since pending signals are a bitmask, so three SIGCHLD deliveries may be observed once, which is why a SIGCHLD handler must loop on waitpid with WNOHANG; real-time signals do queue and carry a value. The kernel is itself a sender, since SIGSEGV, SIGFPE, SIGILL and SIGBUS are the kernel reporting a process's own fault, which no IPC does. And default actions exist in the kernel, so a process that set nothing up still dies on SIGTERM.*

*On dispatch, kill only marks the signal pending: it sets a bit in the target's pending set and wakes it if it was in an interruptible sleep, and nothing is delivered at that point. Delivery happens in do_signal on the return path to user mode from a syscall, interrupt or exception, and a tight user-space loop is still interrupted because the timer interrupt provides the kernel entry.*

*The kernel cannot simply call the handler, because it is user code that must run at user privilege on the user stack. So it constructs a frame on the user's own stack: it saves the complete interrupted register state into a sigcontext inside a ucontext_t, along with the siginfo_t, then modifies the registers that will be restored so RIP points at the handler and RSP points at the new frame, and it sets the frame's return address to a small trampoline, which on modern Linux is in the vDSO and whose only job is to call rt_sigreturn. The return to user mode then happens normally, and the process finds itself in the handler with that signal blocked plus anything in sa_mask. When the handler returns it hits the trampoline, rt_sigreturn restores every register from the user stack, and execution resumes at the exact interrupted instruction. So the kernel forges a function call on the process's own stack and lets the ordinary return path deliver it. One security consequence is that since rt_sigreturn restores every register from a user-stack structure, an attacker who can forge a frame and trigger it controls the entire register state, which is sigreturn-oriented programming.*

*printf and malloc are dangerous because a handler can interrupt the main program at any instruction, including inside a non-reentrant function the handler is about to call. malloc is the clean example: it holds a global heap lock and manipulates free lists, so if the signal arrives while the main code is inside malloc holding the lock and halfway through unlinking a chunk, and the handler calls malloc, then with a non-recursive lock the thread waits for a lock held by itself, which is a self-deadlock needing no second thread; and if it proceeded it would operate on a heap in a state that never normally exists and corrupt it. printf has the same problem twice, because stdio has its own buffers and locks and may call malloc internally.*

*The rule is async-signal-safety, and POSIX defines the list of functions guaranteed safe, including write, _exit, read, kill and sigaction. The shape of the list is the rule: write is safe and printf is not, because write is a thin syscall wrapper with no shared state. The correct patterns are to set a volatile sig_atomic_t flag and act on it in the main loop, to use write rather than printf for output, the self-pipe trick where the handler writes one byte to a pipe so the main loop's epoll wakes up, which converts an asynchronous signal into a synchronous pollable event, and on modern Linux signalfd, where you block the signals and read them as ordinary file descriptor events with no handler at all, so the async-signal-safety constraint does not exist. A dedicated thread in sigwaitinfo is the portable equivalent. And a handler must always save and restore errno, since anything it calls may overwrite the value the interrupted code was about to inspect."*
