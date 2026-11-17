---
id: 12-threading-models-kernel-vs-user-threads
title: "Threading Models: User vs Kernel Threads"
description: "The kernel schedules what it can see, which is why cheap threads were invisible and visible threads were expensive"

sidebar_position: 12
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What are the three main threading models (Many-to-One, One-to-One, Many-to-Many), what is the fundamental tradeoff between User-Level Threads (ULTs) and Kernel-Level Threads (KLTs), and how does Go's M:N scheduler resolve historical limitations?"

---

### Picture it

A company sends people to a client site. The client allocates **desks**, and a desk is the only place work can actually happen.

**Arrangement one: take a single desk and share it among twenty staff.** Whoever is working sits down; when they pause, someone else takes the chair. Swapping is instant, since it is just the next person sitting down, and the company can bring as many staff as it likes.

Then one of them picks up the phone and is put on hold for ten minutes. **Everybody is now stuck**, because the client only ever allocated one desk and it is occupied by a person holding a telephone. And it would not have helped if the client had free desks going spare: **the client gave this company one desk, so only one person can ever be working**, no matter how many staff are in the building.

**Arrangement two: one desk per person.** Now ten people genuinely work at once, and someone on hold blocks only themselves. But each desk is **expensive** and the client has a limited number, so the company can bring a few thousand people, not a million, and every new arrival means paperwork with the client.

**Arrangement three: twenty staff, four desks, rotating.** Obviously the right answer, and for years nobody could make it work. The reason is specific and worth holding onto: **the client decides who sits at a desk, and the company decides who is next in its own queue, and neither tells the other anything.** So the client takes a desk away from somebody mid-task; the company sends someone to a desk that is already blocked; a person on hold occupies a desk doing nothing while three colleagues wait. Two schedulers, both reasonable, no communication, endless pathologies.

**What eventually fixed it** was not a cleverer rota. It was the company **arranging with the client** that nobody sits on hold at a desk: calls are routed so that waiting happens **away from the desk**, and the desk is immediately given to someone else. The two schedulers stopped being ignorant of each other.

---

### The proper terms

#### Many-to-One

**Many user threads mapped onto one kernel thread.** All scheduling happens in a **user-space library**, and the kernel sees a single schedulable entity.

**Advantages.** Switching is extremely cheap, a few tens of nanoseconds, because it is a function call that saves a handful of registers with **no kernel involvement**. Creation is cheap, so thread counts can be enormous, and it works on kernels with no thread support at all.

**The two fatal flaws:**

**A single blocking system call blocks every thread.** The kernel sees one entity, so when it blocks, all twenty user threads stop. One slow `read()` freezes the program.

**No parallelism is possible.** There is one kernel thread, therefore one core, however many user threads exist and however many cores the machine has.

Examples: early Java green threads, GNU Portable Threads. Effectively abandoned.

#### One-to-One

**Each user thread maps to its own kernel thread.** The kernel schedules every one independently.

**Advantages.** **True parallelism** across cores. A blocking call blocks only that thread. The kernel can **preempt** each thread, so no thread can monopolise anything. Signals, debuggers and profilers all work naturally, because the kernel knows about each thread.

**Costs.** Every thread consumes kernel resources: a `task_struct` and a **kernel stack of 8 to 16 KB**, plus a default user stack reservation of 8 MB of virtual address space. Creation is a **system call**, `clone()`, costing tens of microseconds. Every switch goes **through the kernel**. So thread counts are bounded in the **thousands**, not millions, which is exactly why the thread-per-connection server model collapsed.

Examples: Linux NPTL, Windows, modern Java platform threads, `std::thread` in Rust and C++. **This is the dominant model.**

#### Many-to-Many

**M user threads multiplexed onto N kernel threads**, with N usually equal to the core count.

**In theory the best of both**: cheap user-space switches, real parallelism, and millions of user threads on a handful of kernel threads.

**In practice it was abandoned**, and the reason is the key insight of the whole question: **two schedulers that know nothing about each other.**

The pathologies that follow:

**Blocking syscalls still block a kernel thread.** A user thread that calls `read()` takes its kernel thread down with it, so N blocking user threads idle the entire pool. This is the one that kills naive M:N.

**Priority inversion across the boundary.** The kernel preempts a kernel thread that happens to be running the user scheduler's most important thread, and neither layer knows.

**Signals and debugging become hard**, because the mapping from user thread to kernel thread is not stable.

**Thread-local storage and `errno` need care**, since a user thread may resume on a different kernel thread.

The historical attempt was **scheduler activations**, where the kernel notifies the user scheduler when a thread blocks or is preempted. Elegant, and complex enough that Solaris, NetBSD and the Linux NGPT effort all retreated to **1:1**.

#### The fundamental ULT versus KLT trade-off

One sentence: **the kernel can only schedule what it can see.**

**User-level threads are invisible to the kernel.** That is their advantage: no system call to switch, no kernel memory, a custom scheduling policy, and creation measured in nanoseconds. It is also their fatal weakness, since the kernel **cannot schedule them onto other cores**, **cannot preempt them**, and **cannot keep the rest running when one blocks**.

**Kernel-level threads are visible.** That is their advantage: parallelism, independent scheduling, isolated blocking, and preemption. It is also their cost: kernel memory, a system call to create, and a kernel transition to switch.

So you are trading speed and scale against visibility to the scheduler, and every model is an attempt to get both.

#### How Go resolves it

Go's runtime implements M:N with three entities:

**G**, a **goroutine**: a function plus its stack and state.

**M**, a **machine**: an OS thread, the thing that actually executes.

**P**, a **processor**: a scheduling context holding a **local run queue**. The number of Ps is **`GOMAXPROCS`**, normally the core count. **An M must hold a P to run Go code**, which is what bounds parallelism.

What it gets cheaply:

**Switches cost tens of nanoseconds**, entirely in user space, saving only a few registers and a stack pointer.

**Stacks start at 2 to 8 KB and grow** by copying when needed, against a fixed 8 MB reservation per OS thread, which is why **millions of goroutines fit** in a process.

Then the three historical problems, each solved explicitly. This is the substance of the answer.

**Blocking network I/O, solved by the netpoller.** Go never truly blocks on network I/O. The runtime puts the descriptor in non-blocking mode and registers it with **epoll, kqueue or IOCP**. A goroutine that reads from a socket is **parked**, and its M is released to run other goroutines immediately. When the descriptor becomes ready the goroutine is made runnable again. So code that **looks** synchronous and blocking is transparently asynchronous, which is the single biggest thing Go got right here.

**Genuinely blocking syscalls, solved by handoff.** For file I/O or cgo, which really do block the thread, the runtime calls **`entersyscall`** and **detaches the P from the M**. Another M can then pick up that P and keep running goroutines. A monitoring thread, **`sysmon`**, watches for an M blocked too long and forces the handoff. So the pool is never idled by blocking calls.

**Monopolisation, solved by asynchronous preemption.** Originally Go's scheduling was cooperative, switching only at function calls, so a tight loop containing no calls could hang a P indefinitely, and a garbage collection could not start. **Go 1.14** added **asynchronous preemption**: the runtime sends a **signal**, `SIGURG`, to the thread, and the handler parks the goroutine at a **safe point**. That closed the last classic M:N hole.

**Work stealing** completes it: each P has a local run queue, and an idle P steals half the work from another, also checking a global queue and the netpoller. Cores stay busy without a global lock.

The general principle, worth stating because it generalises beyond Go: **M:N works when the user scheduler and the kernel cooperate rather than ignore each other.** Go achieves that by owning the entire runtime, including the I/O layer, so blocking becomes parking. **Erlang's BEAM** does the same thing, and **Java's Project Loom** virtual threads are the same design arriving two decades later, with the JDK rewriting its own blocking calls to park virtual threads instead.

---

### In code

```text
The three models:

  MANY-TO-ONE (M:1)
     user:    T1 T2 T3 T4 T5 ... T20
                \  |  |  |  /
     kernel:        [ KT ]
                       |
     core:          [ CPU ]

     + switches ~tens of ns, no kernel involvement
     + unlimited threads
     - ONE blocking syscall blocks ALL of them
     - NO PARALLELISM, ever, however many cores exist

  ONE-TO-ONE (1:1)                       <- the dominant model
     user:    T1    T2    T3    T4
              |     |     |     |
     kernel: [KT1] [KT2] [KT3] [KT4]
              |     |     |     |
     cores:  CPU0  CPU1  CPU2  CPU3

     + true parallelism, isolated blocking, kernel preemption
     + signals, debuggers and profilers all work naturally
     - task_struct + 8-16 KB kernel stack + 8 MB user stack
       reservation EACH
     - creation is a clone() syscall, tens of microseconds
     - bounded in the THOUSANDS, which killed thread-per-connection

  MANY-TO-MANY (M:N)
     user:    T1 T2 T3 T4 T5 T6 T7 T8 ... T1000000
                \  \  |  |  /  /  /
     kernel:    [KT1]  [KT2]  [KT3]  [KT4]
                  |      |      |      |
     cores:      CPU0   CPU1   CPU2   CPU3

     + in theory: cheap switches AND real parallelism
     - in practice: TWO SCHEDULERS THAT KNOW NOTHING ABOUT
       EACH OTHER
```

```text
Why naive M:N failed, which is the heart of the question:

  the kernel schedules kernel threads.
  the runtime schedules user threads.
  NEITHER TELLS THE OTHER ANYTHING.

  1. a user thread calls read() -> its KERNEL THREAD blocks too
     -> N such calls idle the ENTIRE POOL
     -> this is the one that kills it

  2. the kernel preempts a kernel thread that happened to be running
     the runtime's highest-priority goroutine. Neither layer knows.

  3. signals and debugging get hard: the user-to-kernel thread
     mapping is not stable

  4. thread-local storage and errno need care, since a user thread
     may resume on a DIFFERENT kernel thread

  the historical fix was SCHEDULER ACTIVATIONS, where the kernel
  notifies the user scheduler on block and preempt. Elegant, and
  complex enough that Solaris, NetBSD and Linux's NGPT all retreated
  to 1:1.
```

```text
The fundamental trade, in one sentence:

  THE KERNEL CAN ONLY SCHEDULE WHAT IT CAN SEE.

  USER-LEVEL THREADS are INVISIBLE to the kernel
     + no syscall to switch, no kernel memory, custom policy,
       creation in nanoseconds
     - the kernel cannot schedule them onto other cores
     - the kernel cannot preempt them
     - the kernel cannot keep the others running when one blocks

  KERNEL-LEVEL THREADS are VISIBLE
     + parallelism, independent scheduling, isolated blocking,
       preemption
     - kernel memory, a syscall to create, a kernel transition
       to switch

  so you trade SPEED AND SCALE against VISIBILITY TO THE SCHEDULER,
  and every model is an attempt to have both.
```

```text
Go's G, M, P:

  G   goroutine          a function + its stack + state
  M   machine            an OS thread; the thing that executes
  P   processor          a scheduling context with a LOCAL RUN QUEUE
                         count = GOMAXPROCS, normally the core count

  AN M MUST HOLD A P TO RUN GO CODE  <- this is what bounds parallelism

      P0 [G G G G]  <-- M0 --> CPU0
      P1 [G G]      <-- M1 --> CPU1
      P2 [G G G]    <-- M2 --> CPU2
      P3 [G]        <-- M3 --> CPU3
      global queue  [G G G G G G ...]

  switches: tens of nanoseconds, pure user space
  stacks:   start at 2-8 KB and GROW by copying
            vs a fixed 8 MB reservation per OS thread
            -> MILLIONS of goroutines fit in one process
```

```text
The three historical problems, each solved explicitly:

  1. BLOCKING NETWORK I/O  ->  THE NETPOLLER
        Go never truly blocks on network I/O.
        the fd is put in NON-BLOCKING mode and registered with
        epoll / kqueue / IOCP.
        the goroutine is PARKED, and its M is released IMMEDIATELY
        to run other goroutines.
        when the fd is ready, the goroutine is made runnable again.

        conn.Read(buf)      <- LOOKS synchronous and blocking
                            <- IS transparently asynchronous

        this is the single biggest thing Go got right.

  2. GENUINELY BLOCKING SYSCALLS  ->  HANDOFF
        file I/O and cgo really do block the thread.
        entersyscall DETACHES THE P FROM THE M, so another M picks
        up that P and keeps running goroutines.
        a monitoring thread, sysmon, watches for an M blocked too
        long and forces the handoff.
        -> the pool is never idled by blocking calls.

  3. MONOPOLISATION  ->  ASYNCHRONOUS PREEMPTION
        originally cooperative: switching only at function calls,
        so a tight loop with no calls could hang a P indefinitely
        and block a garbage collection from starting.
        Go 1.14 sends a SIGNAL (SIGURG) to the thread, and the
        handler parks the goroutine at a SAFE POINT.
        -> the last classic M:N hole, closed.

  plus WORK STEALING: each P has a local run queue, and an idle P
  STEALS HALF from another, also checking the global queue and the
  netpoller. Cores stay busy with no global lock.
```

```go
// What makes this possible is that the runtime owns the I/O layer
func handle(conn net.Conn) {
    buf := make([]byte, 4096)
    n, err := conn.Read(buf)      // looks like a blocking read
    // ...
}

// and you can write this without a second thought:
for {
    conn, _ := listener.Accept()
    go handle(conn)               // 1,000,000 of these is fine
}

// with 1:1 threads, a million connections means a million OS threads:
// ~16 GB of kernel stacks alone, and a scheduler run queue nobody
// could manage. Here it is a million goroutines on GOMAXPROCS Ms.

// the general principle, which generalises beyond Go:
//   M:N works when the user scheduler and the kernel COOPERATE
//   rather than ignore each other.
// Go achieves it by owning the whole runtime, including I/O, so
// BLOCKING BECOMES PARKING. Erlang's BEAM does the same, and Java's
// Project Loom virtual threads are the same design two decades
// later, with the JDK rewriting its blocking calls to park instead.
```

---

### What they ask next

**"Why did Many-to-One fail?"**
Two reasons, each sufficient. One blocking system call blocks every user thread, because the kernel sees a single entity. And there is no parallelism at all, since one kernel thread means one core regardless of how many user threads or cores exist.

**"Why is One-to-One dominant despite the cost?"**
Because it is simple and correct. The kernel sees every thread, so blocking, preemption, signals, debugging and profiling all behave as expected with no coordination problem. The cost in memory and creation time is real but acceptable for thousands of threads, and nobody has to solve the two-scheduler problem.

**"What exactly killed naive M:N?"**
Blocking system calls. A user thread calling `read()` takes its kernel thread down with it, so N blocking user threads idle the entire pool, and the user scheduler cannot tell this is happening. Scheduler activations addressed it and were complex enough that Solaris, NetBSD and Linux all retreated to 1:1.

**"What is a P in Go, and why does it exist?"**
A scheduling context holding a local run queue, with `GOMAXPROCS` of them. An M must hold a P to run Go code, so the number of Ps bounds parallelism independently of the number of OS threads. That separation is what lets an M block in a syscall while its P is handed to another M.

**"How does Go make blocking network reads not block?"**
The netpoller. The descriptor is non-blocking and registered with epoll, kqueue or IOCP. A reading goroutine is parked and its M is freed immediately; when the descriptor is ready the goroutine becomes runnable. Synchronous-looking code is transparently asynchronous, which is why Go never needed `async`/`await` colouring.

**"What about file I/O, which cannot be made non-blocking easily?"**
That genuinely blocks, so the runtime detaches the P from the M and another M picks it up. `sysmon` detects an M blocked too long and forces the handoff. The thread is lost for the duration, but the P, and therefore the parallelism, is not.

**"Why did Go need asynchronous preemption?"**
Because cooperative scheduling only switched at function calls, so a tight loop containing none could hold a P indefinitely and prevent a garbage collection from starting. Go 1.14 sends `SIGURG` to the thread and parks the goroutine at a safe point.

**"Is Loom the same thing?"**
Yes, in design. Virtual threads are M:N over carrier threads, and the JDK rewrote its blocking calls to park the virtual thread and release the carrier. It works for the same reason Go's does: the runtime owns enough of the I/O layer to turn blocking into parking.

**The common wrong answer** is listing the three models with their advantages and stopping. The question is really about **why M:N kept failing** and **what changed**. The answer is that the user scheduler and the kernel were ignorant of each other, and Go fixed it not with a better algorithm but by **owning the I/O layer**, so that blocking becomes parking and the two schedulers finally cooperate.

---

### Say this in the interview

*"Many-to-One maps many user threads onto a single kernel thread, with all scheduling in a user-space library. Switches are tens of nanoseconds with no kernel involvement and creation is cheap, but it has two fatal flaws: one blocking system call blocks every thread, since the kernel sees a single entity, and there is no parallelism at all, because one kernel thread means one core however many cores exist. Early Java green threads worked this way and it was abandoned.*

*One-to-One gives each user thread its own kernel thread, so you get true parallelism, blocking isolated to one thread, kernel preemption, and signals, debuggers and profilers working naturally. The cost is that each thread needs a task_struct and an 8 to 16 kilobyte kernel stack plus an 8 megabyte user stack reservation, creation is a clone syscall costing tens of microseconds, and every switch goes through the kernel, so counts are bounded in the thousands. That is exactly why thread-per-connection collapsed. It is nonetheless the dominant model, in Linux NPTL, Windows, Java platform threads and Rust's std::thread.*

*Many-to-Many multiplexes M user threads onto N kernel threads and is in theory the best of both, but it was abandoned in practice, and the reason is the key insight: two schedulers that know nothing about each other. A user thread calling read takes its kernel thread down with it, so N blocking user threads idle the whole pool, and that is the one that kills it. You also get priority inversion across the boundary, hard signal and debugging semantics, and thread-local storage issues since a user thread may resume on a different kernel thread. Scheduler activations, where the kernel notifies the user scheduler on block and preempt, were the historical fix, and they were complex enough that Solaris, NetBSD and Linux's NGPT all retreated to 1:1.*

*The fundamental trade is that the kernel can only schedule what it can see. User-level threads are invisible, which gives cheap switches, no kernel memory, a custom policy and nanosecond creation, and that invisibility is also why the kernel cannot schedule them onto other cores, cannot preempt them and cannot keep the others running when one blocks. Kernel threads are visible, which gives parallelism, independent scheduling, isolated blocking and preemption, and costs kernel memory, a syscall to create and a kernel transition to switch.*

*Go implements M:N with three entities: G, a goroutine, which is a function plus its stack and state; M, a machine, which is an OS thread; and P, a processor, a scheduling context with a local run queue, where the number of Ps is GOMAXPROCS and an M must hold a P to run Go code, which is what bounds parallelism. Switches are tens of nanoseconds in pure user space, and stacks start at 2 to 8 kilobytes and grow by copying rather than reserving 8 megabytes, so millions of goroutines fit in one process.*

*Then it solves each historical problem explicitly. Blocking network I/O is solved by the netpoller: Go never truly blocks on the network, because the descriptor is non-blocking and registered with epoll, kqueue or IOCP, so a reading goroutine is parked and its M released immediately, and the goroutine is made runnable when the descriptor is ready. Code that looks synchronous is transparently asynchronous, which is the single biggest thing Go got right and why it never needed async/await colouring. Genuinely blocking syscalls like file I/O and cgo are solved by handoff: entersyscall detaches the P from the M so another M picks it up, and a monitoring thread, sysmon, forces the handoff when an M is blocked too long. And monopolisation was solved in Go 1.14 by asynchronous preemption, sending SIGURG to the thread so the handler parks the goroutine at a safe point, since before that a tight loop with no function calls could hold a P indefinitely and stop a garbage collection starting. Work stealing completes it, with each P holding a local run queue and idle Ps stealing half from another.*

*The general principle, which generalises beyond Go, is that M:N works when the user scheduler and the kernel cooperate rather than ignore each other. Go achieved that by owning the entire runtime including the I/O layer, so blocking becomes parking. Erlang's BEAM does the same, and Java's Project Loom virtual threads are the same design arriving two decades later, with the JDK rewriting its blocking calls to park the virtual thread and release the carrier."*
