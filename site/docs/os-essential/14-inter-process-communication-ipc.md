---
id: 14-inter-process-communication-ipc
title: "Inter-Process Communication (IPC) Mechanisms"
description: "How isolated processes exchange data — pipes, message queues, shared memory, and sockets — and why Unix domain sockets beat TCP loopback."
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is IPC? Compare the main IPC mechanisms (Pipes, Message Queues, Shared Memory, Sockets), and explain why Unix Domain Sockets outperform TCP loopback on the same host."

The OS keeps every process's memory walled off from every other process — that's the whole point of virtual memory isolation. **IPC** is the set of kernel-provided ways around that wall, so processes can still exchange data when they actually need to.

---

### The analogy: two houses with a wall between them

- **Pipes:** a one-way PVC tube through the wall. House A drops a note in, House B catches it on the other side.
- **Message queues:** a mailbox built into the wall. House A drops letters in whenever it wants; House B reads them whenever it's free.
- **Shared memory:** a shared countertop cut straight through the wall. Both chefs can chop on it at once — blazing fast, but they need a system (a mutex) so they don't chop each other's hands.
- **Sockets:** a telephone. House A dials House B's number — works the same whether B is next door or across the country.

<Diagram>
<Row>
<Box title="Pipes" accent="#60a5fa"><Field icon="🪠" code="one-way byte stream" hint="parent → child, or a named FIFO file" variant="neutral" /></Box>
<Box title="Message Queues" accent="#f59e0b"><Field icon="📬" code="queued messages" hint="async — sender doesn't wait around" variant="neutral" /></Box>
<Box title="Shared Memory" accent="#34d399"><Field icon="🗄️" code="same RAM, both processes" hint="fastest — but you manage the locking" variant="neutral" /></Box>
<Box title="Sockets" accent="#818cf8"><Field icon="☎️" code="two-way connection" hint="local (Unix socket) or over a network (TCP)" variant="neutral" /></Box>
</Row>
</Diagram>

---

### The four mechanisms, one at a time

**1. Pipes (anonymous & named/FIFO)**
- **Anonymous pipes** (`pipe()`): a one-way byte stream, buffered in a kernel ring buffer, between processes that share a parent-child relationship — exactly what `cat file.txt | grep "error"` uses.
- **Named pipes** (`mkfifo`): show up as a real file in the filesystem, so even *unrelated* processes on the same machine can stream data through them.

**2. Message queues (POSIX/System V)**
Kernel-managed queues of structured messages. Process A pushes a message and immediately moves on — Process B picks messages up whenever it gets around to it, by type or priority. Fully decoupled.

**3. Shared memory (`shmget()`, `mmap()`)**
The OS maps the exact same physical frames into both processes' address spaces. Once that's set up, reads and writes happen at raw RAM speed — no system calls, no kernel involved. The catch: the OS gives you zero synchronization for free. You need your own semaphores or mutexes, or you'll get race conditions.

**4. Sockets**
Two-way communication endpoints, addressed either by IP + port (network sockets) or by a filesystem path (Unix domain sockets).

---

### Unix domain sockets vs. TCP loopback, on the same machine

A common follow-up: *"Two services on the same server — why use a Unix domain socket instead of just hitting `127.0.0.1`?"*

| Dimension | TCP Loopback (`127.0.0.1`) | Unix Domain Socket (`AF_UNIX`) |
| :--- | :--- | :--- |
| **Overhead** | Goes through the full TCP/IP stack — packet headers, checksums, sequence numbers, ACKs, flow control. | Skips the network stack entirely — copies data straight between kernel buffers. |
| **Security** | Port-based; hard to restrict with plain OS file permissions. | Governed by normal filesystem permissions (`chmod`, `chown`). |
| **Latency/throughput** | Higher CPU cost, lower throughput. | Up to ~2× the throughput, sub-microsecond latency. |
| **Scope** | Works locally or across the network, unchanged. | Local machine only. |

That's why production setups — NGINX talking to a local Node.js or Gunicorn process, or to Postgres on the same box — almost always use a Unix domain socket instead of TCP loopback.

---

### Say this in the interview

*"IPC lets processes that the OS otherwise keeps isolated exchange data. Shared memory is the fastest option because it's zero-copy, but you own the synchronization. Pipes and message queues give you kernel-buffered streams and queues with less performance but less to manage. For two processes on the same machine, Unix domain sockets beat TCP loopback because they skip the entire network stack."*

---

### Code: IPC via anonymous pipes

<Tabs groupId="programming-language">
<TabItem value="c" label="C (pipe() & fork())">

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

int main() {
    int pipefd[2]; // pipefd[0] = Read end, pipefd[1] = Write end
    char buffer[128];

    if (pipe(pipefd) == -1) {
        perror("pipe failed");
        return 1;
    }

    pid_t pid = fork();

    if (pid == 0) {
        // Child Process: Reader
        close(pipefd[1]); // Close unused write end
        read(pipefd[0], buffer, sizeof(buffer));
        printf("[Child Process] Received IPC message: %s\n", buffer);
        close(pipefd[0]);
        exit(0);
    } else {
        // Parent Process: Writer
        close(pipefd[0]); // Close unused read end
        char message[] = "Hello from Parent via IPC Pipe!";
        write(pipefd[1], message, strlen(message) + 1);
        close(pipefd[1]); // Sending EOF
        wait(NULL);
    }
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python (multiprocessing.Pipe)">

```python
import multiprocessing

def child_task(conn):
    # Receive data from parent via pipe
    msg = conn.recv()
    print(f"[Child Process] Received message: {msg}")
    # Send acknowledgment back
    conn.send("ACK: Task finished!")
    conn.close()

if __name__ == "__main__":
    parent_conn, child_conn = multiprocessing.Pipe()
    
    p = multiprocessing.Process(target=child_task, args=(child_conn,))
    p.start()
    
    # Parent sends data through the pipe
    parent_conn.send("Hello from Parent via Python IPC Pipe!")
    ack = parent_conn.recv()
    print(f"[Parent Process] Received response: {ack}")
    
    p.join()
```

</TabItem>
</Tabs>
