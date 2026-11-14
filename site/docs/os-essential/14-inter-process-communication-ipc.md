---
id: 14-inter-process-communication-ipc
title: "Inter-Process Communication (IPC) Mechanisms"
description: "Talking across the isolation boundary, and why copying through the kernel is the cost"

sidebar_position: 14
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is IPC? Compare the main IPC mechanisms (Pipes, Message Queues, Shared Memory, Sockets), and explain why Unix Domain Sockets outperform TCP loopback on the same host."

---

### Picture it

Two companies in separate buildings, deliberately unable to reach each other's files. Now they need to work together.

**A chute between the two buildings.** Things slide one way, in order, and are consumed as they arrive. Simple, strictly sequential, and it only connects these two.

**A pigeonhole rack in the lobby.** Either side can drop a labelled parcel in and the other collects it later. Messages keep their boundaries, they can be prioritised, and neither side has to be present at the same time.

**A shared room both buildings can enter.** Nothing is carried anywhere: both parties walk in and read the same documents. This is by far the fastest, and it is also the only arrangement where two people can write over each other, so it needs its own rules about who may enter.

**The postal service.** Works regardless of which city the other company is in. Enormously flexible, with the overhead of addressing, routing and packaging.

And one observation that is the real point of the question. If both companies are in the **same city**, using the national postal service means your parcel still gets sorted, routed and checked as though it were crossing the country. A local courier skipping all of that is faster, not because it is cleverer, but because it does less.

---

### The proper terms

#### What IPC is

**Inter-Process Communication** is the set of mechanisms letting processes exchange data, necessary precisely because virtual memory gives each process an isolated **address space**.

The mechanisms divide into two families. **Message passing** copies data through the **kernel**, which is safe and requires no synchronisation between the parties. **Shared memory** maps the same physical frames into two address spaces, which is fast and requires explicit synchronisation.

That distinction drives everything else: message passing trades speed for safety, shared memory the reverse.

#### Pipes

An **anonymous pipe** is a unidirectional byte stream between **related** processes, created with `pipe()` and inherited across `fork()`. It is a **byte stream**, so message boundaries are not preserved, and it has a fixed kernel buffer, typically 64 KB, so a writer blocks when it is full and a reader blocks when it is empty. That blocking provides natural **flow control**.

A **named pipe**, or **FIFO**, created with `mkfifo`, has a filesystem path, so **unrelated** processes can open it. Otherwise it behaves the same.

Each transfer costs **two copies**: user to kernel on write, kernel to user on read.

#### Message queues

A **message queue** holds discrete messages rather than a byte stream, so boundaries are preserved. Messages carry a type or priority, so a reader can selectively receive, and the queue is persistent in the kernel, so a message survives until read even if the sender has exited.

POSIX queues (`mq_open`) support priorities and notification; the older System V queues (`msgget`) are more widely available and clumsier.

#### Shared memory

**Shared memory** maps the same physical memory into several address spaces, through `shm_open` with `mmap` for POSIX, or `shmget` for System V.

It is the **fastest** mechanism because, after setup, there is no kernel involvement and no copying: a write by one process is immediately visible to the other, at memory speed.

The price is that the kernel provides no synchronisation. Without a **semaphore** or **mutex** in the shared region, concurrent access is a race condition. It also provides no notification, so readers must be told some other way that new data exists, often with a semaphore or a pipe used as a doorbell.

#### Sockets

**Sockets** are bidirectional endpoints that work both across machines and locally.

Internet domain sockets, `AF_INET`, communicate over TCP or UDP and work between hosts.

**Unix domain sockets**, `AF_UNIX`, work only on the same host, are addressed by a filesystem path, and can additionally pass **file descriptors** and authenticated **process credentials** between processes, which no other mechanism offers.

#### Why Unix domain sockets beat TCP loopback

Both connect two processes on one machine, and the Unix socket is consistently faster, typically around twice the throughput with lower latency. The reason is purely the work avoided.

**No protocol stack.** TCP loopback still builds TCP and IP headers, performs connection state management, sequence numbers, acknowledgements, windowing and congestion control. A Unix socket is a kernel buffer copy with none of that.

**No checksums.** TCP computes and verifies checksums to guard against network corruption. Within one machine the data never leaves RAM, so there is nothing to guard against.

**No routing or port lookup.** TCP must consult the routing table and look up the port in a hash of sockets. A Unix socket resolves a filesystem path once at connect time.

**Fewer layers.** The data passes through fewer kernel layers, so fewer copies and less per-packet bookkeeping.

The summary: the loopback path is the **full network stack with the wire removed**, while a Unix domain socket is a local IPC primitive from the start.

---

### In code

```text
Comparison at a glance:

                     speed      boundaries   relationship      sync needed
  anonymous pipe     moderate   byte stream  related only      no
  named pipe/FIFO    moderate   byte stream  any, same host    no
  message queue      moderate   messages     any, same host    no
  shared memory      fastest    none         any, same host    YES
  Unix socket        fast       both modes   any, same host    no
  TCP socket         slowest    byte stream  across machines   no
```

```c
// Pipe: two copies, and the blocking gives flow control for free
int fd[2];
pipe(fd);
if (fork() == 0) {
    close(fd[0]);
    write(fd[1], "hello", 5);        // copy 1: user -> kernel buffer
    _exit(0);
}
close(fd[1]);
char buf[16];
read(fd[0], buf, sizeof buf);        // copy 2: kernel buffer -> user
```

```c
// Shared memory: no copies at all after setup, but you must synchronise
int fd = shm_open("/region", O_CREAT | O_RDWR, 0600);
ftruncate(fd, 4096);
char *region = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);

sem_wait(&sem);                      // without this, a race condition
strcpy(region, "hello");             // a direct memory write, visible at once
sem_post(&sem);
```

---

### What they ask next

**"Which is fastest and why?"**
Shared memory, because after setup there is no kernel involvement and no copying. Everything else copies data through the kernel at least once.

**"If shared memory is fastest, why not always use it?"**
Because it provides no synchronisation and no notification, so you must add a semaphore or mutex and some way to signal new data. It is also easy to corrupt, since a bug in one process can scribble on another's view.

**"What can a Unix domain socket do that a TCP socket cannot?"**
Pass open **file descriptors** between processes, and deliver verified **process credentials**, the peer's user and process ID. Both are used heavily by service managers and container runtimes.

**"Does loopback TCP actually touch the network card?"**
No. It never leaves the kernel. The cost is the protocol processing, not the hardware, which is exactly why skipping the protocol makes a Unix socket faster.

**"How do pipes handle flow control?"**
Through blocking. A full buffer blocks the writer and an empty one blocks the reader, so a fast producer is automatically throttled to the consumer's pace with no extra mechanism.

**The common wrong answer** is that loopback is slower "because of network latency". There is no network. The cost is the TCP and IP processing the kernel performs regardless of destination.

---

### Say this in the interview

*"Inter-process communication is how processes exchange data despite virtual memory isolating their address spaces. The mechanisms split into message passing, which copies through the kernel and needs no synchronisation, and shared memory, which maps the same frames into both processes and does.*

*An anonymous pipe is a unidirectional byte stream between related processes, created with pipe and inherited across fork, with a fixed kernel buffer whose blocking provides flow control. A named pipe or FIFO is the same with a filesystem path, so unrelated processes can use it. Both cost two copies per transfer.*

*A message queue preserves message boundaries, supports priorities and selective receive, and persists in the kernel so a message outlives the sender.*

*Shared memory maps the same physical memory into several address spaces, so after setup there is no copying and no kernel involvement, making it the fastest. The cost is that you must supply your own synchronisation with a semaphore or mutex, and your own notification.*

*Sockets are bidirectional and work locally or across machines. Unix domain sockets additionally pass file descriptors and authenticated process credentials.*

*Unix domain sockets beat TCP loopback because of what they skip. Loopback still runs the full TCP and IP stack: headers, sequence numbers, acknowledgements, windowing, congestion control, checksums, routing lookup and port hashing, all for data that never leaves RAM. A Unix socket is a kernel buffer copy with none of that, so it is typically about twice the throughput at lower latency."*
