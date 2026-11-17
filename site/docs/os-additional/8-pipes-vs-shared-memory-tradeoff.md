---
id: 8-pipes-vs-shared-memory-tradeoff
title: "Pipes vs Shared Memory"
description: "Paying for copies to have the kernel do your synchronisation, or taking the speed and owning every concurrency problem yourself"

sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the fundamental architectural tradeoff between Unix pipes and shared memory for Inter-Process Communication (IPC)? When would you choose one over the other?"

---

### Picture it

Two people in separate offices who need to work on the same information.

**The first arrangement is a post slot in the wall.** You write a note, push it through, and it lands in a tray on the other side. They take notes out in the order you pushed them in.

Look at everything this gives you for free, because it is more than people notice. **Nobody can grab a note while you are still writing it.** The tray holds a limited number, so if they stop collecting, **you cannot keep posting**, and you are forced to slow down. When you finish and close the slot, they **know you have finished**. And they can never reach into your office, nor you into theirs.

The cost is that **everything is written out twice**: once by you onto the note, once by them from the note into their own workbook. For a sentence, irrelevant. For a thousand-page report, you are spending your whole day copying.

**The second arrangement is knocking a window between the two offices onto one shared desk.** Now there is only one copy of the document and you both work on it directly. Nothing is transcribed. A thousand pages costs exactly as much as one line.

And **every single thing the post slot was doing for you is now your problem.** You can both write on the same line at the same moment. You can read a sentence while it is half rewritten and get nonsense that was never actually there. There is no tray to fill up, so nothing stops you from racing ahead. There is no way to signal that you have finished. And if one of you walks out while holding the only pen, the other waits forever.

That is the trade, and it is not really about speed. **The post slot has a referee. The shared desk does not.** You can pay the referee in copying, or you can keep the copying and become the referee yourself.

---

### The proper terms

#### Pipes

A **pipe** is a **kernel-managed byte stream**. `pipe()` returns two file descriptors, one for each end, and data written to one is read from the other. The kernel holds a **ring buffer**, 64 KB by default on Linux, tunable with `F_SETPIPE_SZ`.

Every transfer costs **two copies**: user to kernel on `write`, kernel to user on `read`. Each also costs a **system call**, so a mode switch each way.

What the kernel provides in return is substantial, and listing it is most of the answer:

**Mutual exclusion is automatic.** The kernel serialises access to the buffer, so no reader sees a partially written byte stream.

**Writes under `PIPE_BUF`, 4096 bytes on Linux, are atomic**, so concurrent writers' messages do not interleave.

**Flow control comes for free.** A full pipe **blocks the writer** and an empty pipe **blocks the reader**, which is natural **backpressure**: a fast producer is automatically throttled to the consumer's rate.

**End of stream is signalled.** When every write end is closed, the reader gets a **zero-length read**, meaning EOF. Nothing equivalent exists in shared memory.

**Errors are reported.** Writing to a pipe whose read end is closed raises **`SIGPIPE`** or returns **`EPIPE`**.

**Ordering is guaranteed.** It is a FIFO byte stream.

**Isolation is preserved.** Neither process can touch the other's memory, so the kernel remains the referee and the two need not trust each other.

The limitations: it is **one-directional**, so duplex needs two pipes; it is a **byte stream**, so message framing is the application's job; there is **no random access**; and throughput is bounded by the copies and the system calls.

#### Shared memory

**Shared memory** maps the **same physical pages** into two or more processes' address spaces. The usual mechanisms are **`shm_open` plus `mmap`**, `mmap` with **`MAP_SHARED`** across a `fork`, **`memfd_create`**, or the older System V `shmget` and `shmat`.

After setup, communication is **ordinary loads and stores**. There are **no copies** and, crucially, **no system calls at all**, so no mode switches.

The advantages:

**Zero copy.** The data is written once, where both processes can see it.

**Size is free.** Sharing one gigabyte costs the same as sharing one byte, because nothing is transferred; the pages are simply mapped.

**Random access.** Both processes see a real data structure, not a stream, so you can index into it, update one field, or build a lock-free ring buffer in it.

**The lowest possible latency**, since after setup the kernel is not involved in the data path at all.

The costs, and this is the heart of the question: **the kernel provides no synchronisation whatsoever.**

**You must build mutual exclusion yourself**, with pthread mutexes created with **`PTHREAD_PROCESS_SHARED`** placed **inside** the shared region, POSIX semaphores, or lock-free structures using atomics.

**Every concurrency hazard becomes yours**: data races, **torn reads** of multi-word values, **memory ordering** and the need for barriers, and ABA problems in lock-free code.

**There is no flow control.** Nothing stops a producer overrunning a consumer; you implement the bounded buffer yourself.

**There is no EOF and no error signal.** Nothing tells you the peer has finished or died.

**A crash can be unrecoverable.** A process that dies holding a mutex in shared memory leaves it locked forever, because no kernel object is being cleaned up. **Robust mutexes**, with `PTHREAD_MUTEX_ROBUST`, exist precisely for this, returning `EOWNERDEAD` so the survivor can repair the state.

**Isolation is weakened.** A buggy or malicious process can corrupt the shared region arbitrarily, so the two must **trust each other**.

#### The fundamental trade-off

Stated in one sentence: **you are trading copies and system calls for the responsibility of synchronisation.**

Pipes give **correctness by construction** and pay for it in **throughput**. The kernel is the referee: it serialises, throttles, signals completion and enforces isolation, and you pay two copies and two mode switches per message for that service.

Shared memory gives **maximum throughput** and charges for it in **engineering responsibility**. You get the bytes for nothing, and you inherit every hard problem in concurrent programming, plus a weaker isolation boundary.

Note that the choice is not primarily about speed. It is about **who is responsible for correctness**.

#### Choosing

**Choose pipes, or Unix sockets, when:**

Data volumes are modest, or the traffic is **command and control** rather than bulk.

The processes **do not trust each other**, or are written by different teams, since the kernel boundary is a real security property.

You want **backpressure, EOF and error signalling** without writing them.

The processes have **independent lifetimes**, so one crashing must not corrupt the other.

Simplicity and debuggability matter more than the last microsecond.

**Choose shared memory when:**

Payloads are **large**: video frames, market data, ML tensors, database buffer pools.

Throughput is **millions of messages per second**, where two copies and two system calls per message are the bottleneck.

**Latency is the requirement**, as in trading systems, where a mode switch is already too expensive.

Both processes are parts of one system you control, so mutual trust is reasonable.

You need **random access** to a shared structure rather than a stream.

#### The hybrid, which is what real systems do

Worth stating explicitly, because it is the answer most production systems arrive at: **shared memory for the payload, a kernel primitive for the notification.**

The payload lives in shared memory, so it is never copied. A **pipe**, an **`eventfd`**, a **Unix socket** or a **futex** carries the small signal that says "a new item is at offset N".

This gets you **zero-copy data** with **kernel-managed blocking and wakeups**, so you do not have to invent a sleeping protocol or burn CPU spinning. It is how graphics compositors such as Wayland pass buffers, how GPU and video pipelines move frames, how browsers share memory between processes, and in spirit what **`io_uring`** does with its shared submission and completion rings plus a system call only when the consumer must sleep.

A related tool: **`memfd_create`** produces an anonymous file descriptor backed by memory, which can be **passed over a Unix socket with `SCM_RIGHTS`**, so two unrelated processes can establish shared memory without a filesystem name and with the sender controlling exactly who receives it.

---

### In code

```c
// A pipe: the kernel does the hard part for you
int fds[2];
pipe(fds);                      // fds[0] read end, fds[1] write end

if (fork() == 0) {
    close(fds[1]);
    char buf[4096];
    ssize_t n;
    while ((n = read(fds[0], buf, sizeof buf)) > 0)
        process(buf, n);
    // n == 0 means EOF: every write end was closed.
    // Nothing in shared memory tells you this.
    _exit(0);
}

close(fds[0]);
write(fds[1], data, len);       // blocks if the pipe is full
                                // -> automatic backpressure
close(fds[1]);                  // -> the reader sees EOF
```

```c
// Shared memory: fast, and now everything is your problem
int fd = shm_open("/ring", O_CREAT | O_RDWR, 0600);
ftruncate(fd, SIZE);
void *region = mmap(NULL, SIZE, PROT_READ | PROT_WRITE,
                    MAP_SHARED, fd, 0);

// after this point there are NO system calls and NO copies.
// communication is ordinary loads and stores.

// but the mutex has to live INSIDE the shared region, and be
// created as process-shared, or the other process cannot see it:
pthread_mutexattr_t attr;
pthread_mutexattr_init(&attr);
pthread_mutexattr_setpshared(&attr, PTHREAD_PROCESS_SHARED);
pthread_mutexattr_setrobust(&attr, PTHREAD_MUTEX_ROBUST);
//                                  ^ so a crash while holding it is
//                                    recoverable: the survivor gets
//                                    EOWNERDEAD and repairs the state
pthread_mutex_init(&hdr->lock, &attr);
```

```text
What the kernel was doing for you, that you now have to do:

                              PIPE                 SHARED MEMORY
  mutual exclusion            automatic            YOU build it
  atomic writes               yes, under PIPE_BUF  YOU build it
  flow control / backpressure full pipe blocks     YOU build it
  end of stream               read() returns 0     nothing
  peer died                   SIGPIPE / EPIPE      nothing
  ordering                    FIFO guaranteed      YOU build it
  memory ordering / barriers  not your problem     YOUR problem
  torn reads                  impossible           YOUR problem
  crash holding the lock      cannot happen        locked FOREVER
                                                   (unless robust)
  isolation                   kernel-enforced      mutual trust needed

  copies per message          TWO                  ZERO
  syscalls per message        TWO                  ZERO

  the trade is not really about SPEED.
  It is about WHO IS RESPONSIBLE FOR CORRECTNESS.
```

```text
Where the cost actually bites:

  sending 1 byte
     pipe:          2 copies + 2 syscalls   ~ a few microseconds
     shared memory: 1 store                 ~ nanoseconds
     -> the difference is enormous in RELATIVE terms and irrelevant
        in absolute ones

  sending 1 GB
     pipe:          2 GB of memory traffic, in 64 KB chunks,
                    ~16,000 syscalls each way
     shared memory: nothing is transferred at all. The pages are
                    simply mapped into both address spaces.
     -> this is where the choice stops being academic
```

```text
The hybrid, which is what production systems actually do:

  PAYLOAD        in shared memory        -> never copied
  NOTIFICATION   over a pipe / eventfd   -> "item ready at offset N"
                 / unix socket / futex

     producer                              consumer
     write the frame into shm              blocked in epoll_wait()
     write(eventfd, &one, 8)  ------------>  wakes
                                            reads offset N from shm
                                            processes it in place

  you get ZERO-COPY DATA with KERNEL-MANAGED BLOCKING, so you never
  invent a sleeping protocol and never burn CPU spinning.

  this is how Wayland passes buffers, how GPU and video pipelines
  move frames, how browsers share memory between processes, and in
  spirit what io_uring does: shared submission and completion rings,
  with a syscall only when the consumer must sleep.

  and memfd_create gives you an anonymous memory-backed fd that can
  be passed over a Unix socket with SCM_RIGHTS, so two unrelated
  processes can set up shared memory with no filesystem name and
  with the sender controlling exactly who receives it.
```

---

### What they ask next

**"Is shared memory always faster?"**
For bulk data, decisively. For small, infrequent messages the difference is microseconds against nanoseconds, which is enormous proportionally and irrelevant in absolute terms, while the synchronisation code you now own is a permanent source of bugs. Speed is the wrong axis unless throughput or latency is actually the constraint.

**"What does a pipe give you that shared memory does not?"**
Mutual exclusion, atomic writes under `PIPE_BUF`, flow control through blocking, EOF when all writers close, `SIGPIPE` when the reader goes away, FIFO ordering, and kernel-enforced isolation. Every one of those becomes your responsibility with shared memory, and several of them are genuinely hard.

**"What happens if a process crashes holding a shared mutex?"**
It stays locked forever, because no kernel object is being reclaimed. That is why robust mutexes exist: the next acquirer gets `EOWNERDEAD`, which tells it the previous owner died mid-update and the protected data may be inconsistent, so it must repair the state and mark it consistent.

**"Why is a pipe write atomic only up to `PIPE_BUF`?"**
Because the kernel guarantees atomicity only for writes that fit in the buffer without being split. Above 4096 bytes on Linux a write may be interleaved with another writer's, which is why multi-writer protocols keep messages under that size or add their own framing.

**"How do you choose in a design interview?"**
State the data volume and the trust boundary first. Large payloads between components of one trusted system point to shared memory; modest control traffic between independently written or mutually distrusting processes points to pipes or sockets. Then mention the hybrid, because it is usually the right answer.

**"What is the security difference?"**
A pipe keeps the kernel between the two processes, so neither can touch the other's memory, and a compromised peer can only send you bad bytes. Shared memory means a compromised or buggy peer can corrupt your data structures directly, so it requires mutual trust and is a weaker isolation boundary.

**"Does `splice` change the picture?"**
Yes, somewhat. `splice` and `vmsplice` move data between a pipe and a file descriptor by moving **page references** rather than copying bytes, so a pipe can be zero-copy in the right circumstances. It narrows the gap without removing the system call cost or giving you random access.

**The common wrong answer** is "pipes are slower, shared memory is faster". True, and it misses the architecture. The real trade is that **a pipe comes with a referee** who handles exclusion, ordering, backpressure, EOF and isolation, and **shared memory comes with none**, so the throughput is bought with the obligation to build all of that correctly yourself.

---

### Say this in the interview

*"A pipe is a kernel-managed byte stream with a ring buffer, 64 kilobytes by default on Linux. Every transfer costs two copies, user to kernel and kernel to user, plus a system call each way. What you get for that is substantial: mutual exclusion is automatic, writes under PIPE_BUF of 4096 bytes are atomic so concurrent writers do not interleave, flow control is free because a full pipe blocks the writer and an empty one blocks the reader, end of stream is signalled by a zero-length read when all write ends close, writing to a closed pipe gives SIGPIPE or EPIPE, ordering is FIFO, and the kernel stays between the two processes so neither can touch the other's memory. The limits are that it is one-directional, it is a byte stream so framing is yours, there is no random access, and throughput is bounded by the copies and syscalls.*

*Shared memory maps the same physical pages into both address spaces, through shm_open plus mmap, MAP_SHARED across a fork, memfd_create, or the older System V calls. After setup, communication is ordinary loads and stores with no copies and no system calls at all. So it is zero-copy, size is free because sharing a gigabyte costs the same as a byte since nothing is transferred, you get random access to a real data structure rather than a stream, and it is the lowest possible latency because the kernel is not in the data path.*

*The cost is that the kernel provides no synchronisation whatsoever. You build mutual exclusion yourself, with pthread mutexes created PTHREAD_PROCESS_SHARED and placed inside the shared region, or semaphores, or lock-free structures with atomics. Every concurrency hazard becomes yours: data races, torn reads of multi-word values, memory ordering and barriers, ABA in lock-free code. There is no flow control, so nothing stops a producer overrunning a consumer. There is no EOF and no error, so nothing tells you the peer finished or died. A process that dies holding a mutex leaves it locked forever, since no kernel object is being cleaned up, which is why robust mutexes exist and return EOWNERDEAD so the survivor can repair the state. And isolation is weakened, because a buggy or malicious peer can corrupt the region arbitrarily, so the two must trust each other.*

*So the fundamental trade is that you are trading copies and system calls for the responsibility of synchronisation. Pipes give correctness by construction and pay in throughput, because the kernel is the referee that serialises, throttles, signals completion and enforces isolation. Shared memory gives maximum throughput and charges in engineering responsibility. It is not primarily a question about speed, it is about who is responsible for correctness.*

*I would choose pipes or Unix sockets for modest volumes or command and control traffic, when the processes do not trust each other or come from different teams, when I want backpressure, EOF and error signalling without writing them, when the processes have independent lifetimes so one crashing must not corrupt the other, and when debuggability matters more than the last microsecond. I would choose shared memory for large payloads like video frames, market data, tensors or a database buffer pool, for millions of messages per second where two copies and two syscalls per message are the bottleneck, when latency itself is the requirement so even a mode switch is too expensive, when both processes are parts of one system I control, and when I need random access rather than a stream.*

*And in practice the answer is usually the hybrid: the payload in shared memory so it is never copied, with a pipe, eventfd, Unix socket or futex carrying the small notification that an item is ready at a given offset. That gives zero-copy data with kernel-managed blocking and wakeups, so you never invent a sleeping protocol or burn CPU spinning. It is how Wayland passes buffers, how video and GPU pipelines move frames, how browsers share memory between processes, and in spirit what io_uring does with its shared rings and a syscall only when the consumer must sleep. memfd_create plus passing the descriptor over a Unix socket with SCM_RIGHTS is the clean way to set it up between unrelated processes."*
