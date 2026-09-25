---
id: 14-inter-process-communication-ipc
title: "Inter-Process Communication (IPC) Mechanisms"
description: "Survey methods for isolated processes to exchange data: pipes, message queues, shared memory, Unix domain sockets, and network sockets."
sidebar_position: 14
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is IPC? Compare the main IPC mechanisms (Pipes, Message Queues, Shared Memory, Sockets), and explain why Unix Domain Sockets outperform TCP loopback on the same host."

Because modern operating systems enforce strict virtual memory isolation between processes, no process can directly inspect or modify the address space of another. **Inter-Process Communication (IPC)** provides the kernel-governed mechanisms allowing isolated processes to exchange data, coordinate tasks, and synchronize state.

---

### The ELI5 Analogy: The Fenced-Off Houses

Two adjacent houses have a massive brick wall between them (Memory Isolation):
- **Pipes:** A one-way PVC tube through the wall. House A drops a note in; House B catches it on the other side.
- **Message Queues:** A mailbox installed in the wall. House A drops letters in at their own pace; House B reads them whenever free.
- **Shared Memory:** A shared countertop cut into the wall. Both chefs chop vegetables on it simultaneously (blazingly fast, but requires a Mutex to avoid chopping each other's hands!).
- **Sockets:** A telephone. House A dials House B's number (IP address and port) to establish a full-duplex call, whether next door or across the country.

---

### The Four Primary IPC Paradigms

```
┌────────────────────────────────────────────────────────┐
│               IPC MECHANISMS TAXONOMY                  │
└───────────────────────────┬────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
[ Data Streams ]     [ Message Passing ]   [ Shared Memory ]
• Anonymous Pipes    • POSIX Msg Queues    • shmget() / mmap()
• Named Pipes (FIFO) • Linux Netlink       • Zero-Copy Direct RAM
• Unix Domain Sockets
• Network Sockets (TCP/UDP)
```

#### 1. Pipes (Anonymous & Named / FIFOs)
- **Anonymous Pipes (`pipe()`):** Unidirectional byte streams between processes with parent-child ancestry (e.g., `cat file.txt | grep "error"`). Data is buffered in a kernel ring buffer.
- **Named Pipes (`mkfifo`):** Exist as special FIFO files in the filesystem, allowing unrelated processes on the same host to stream data.

#### 2. Message Queues (POSIX / System V)
- Kernel-managed linked lists of structured messages.
- **Asynchronous Decoupling:** Process A pushes a message and returns immediately; Process B consumes messages by type or priority at a later time.

#### 3. Shared Memory (`shmget()`, `mmap()`)
- The OS maps the exact same physical memory frames into the virtual address spaces of both processes.
- **Zero-Copy Performance:** Once mapped, reads and writes occur directly at hardware RAM speeds **without entering kernel mode via system calls**.
- *Responsibility:* The OS provides zero synchronization. Applications must use **POSIX Semaphores or Mutexes** to prevent race conditions.

#### 4. Sockets (Network Sockets vs. Unix Domain Sockets)
- Bidirectional communication endpoints identified by IP/Port or filesystem paths.

---

### The Staff Differentiator: Unix Domain Sockets (UDS) vs. TCP Loopback

Interviewers frequently ask: *"If two microservices run on the same Linux server, why use a Unix Domain Socket (`AF_UNIX`) instead of TCP localhost (`127.0.0.1`)?"*

| Dimension | TCP Loopback (`127.0.0.1`) | Unix Domain Socket (`AF_UNIX`) |
| :--- | :--- | :--- |
| **Protocol Overhead** | Traverses the entire TCP/IP networking stack (packet headers, checksums, sequence numbers, TCP ACKs, flow control). | **Bypasses network stack completely.** Copies data directly between kernel memory buffers. |
| **Security / Permissions** | Port-based; difficult to restrict via standard OS file permissions. | Governed by standard **POSIX filesystem permissions** (`chmod`, `chown`). |
| **Latency & Throughput** | Higher CPU utilization; lower throughput. | **Up to 2x faster throughput** with sub-microsecond latency. |
| **Scope** | Works across local machine or across the internet. | Restricted strictly to the local host machine. |

*Industry Example:* Production setups (e.g., NGINX proxying to Node.js or Gunicorn/PostgreSQL) universally use **Unix Domain Sockets** on single-node instances to maximize I/O throughput.

---

### Summary
"IPC enables isolated processes to communicate. Shared memory is the fastest mechanism via zero-copy RAM mapping (requiring manual semaphore synchronization). Pipes and message queues provide kernel-buffered streams and queues. For local client-server communication, Unix Domain Sockets significantly outperform TCP loopback by bypassing network protocol overhead."

---

### Code Demonstration: IPC via Anonymous Pipes

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