---
id: 2-tcp-vs-udp
title: "TCP vs UDP: Reliability vs Speed"
description: "Compare TCP and UDP protocols, header byte overhead, byte streams vs datagram boundaries, and real-world fintech/streaming use cases."
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the fundamental difference between TCP and UDP? Compare their header overheads, explain the difference between a byte stream and datagram boundaries, and explain why high-frequency trading chooses UDP."

At Layer 4 (Transport Layer), the two foundational protocols represent a quintessential engineering trade-off: **TCP (Transmission Control Protocol)** prioritizes **reliability, ordering, and integrity**, while **UDP (User Datagram Protocol)** prioritizes **minimal latency, zero connection overhead, and speed**.

---

### Technical Breakdown: Protocol Architecture

```
TCP HEADER (Minimum 20 Bytes, up to 60 Bytes with Options)
┌───────────────────────────────┬───────────────────────────────┐
│     Source Port (16 bits)     │  Destination Port (16 bits)   │
├───────────────────────────────┴───────────────────────────────┤
│                    Sequence Number (32 bits)                  │
├───────────────────────────────┴───────────────────────────────┤
│                 Acknowledgment Number (32 bits)               │
├───────┬────────────┬──────────┬───────────────────────────────┤
│Offset │  Reserved  │  Flags   │      Window Size (16 bits)    │
├───────┴────────────┴──────────┼───────────────────────────────┤
│       Checksum (16 bits)      │     Urgent Pointer (16 bits)  │
├───────────────────────────────┴───────────────────────────────┤
│ Options (0 to 40 bytes: MSS, Window Scale, SACK, Timestamps)  │
└───────────────────────────────────────────────────────────────┘

UDP HEADER (Fixed 8 Bytes)
┌───────────────────────────────┬───────────────────────────────┐
│     Source Port (16 bits)     │  Destination Port (16 bits)   │
├───────────────────────────────┼───────────────────────────────┤
│        Length (16 bits)       │       Checksum (16 bits)      │
└───────────────────────────────┴───────────────────────────────┘
```

#### 1. Header Overhead
- **TCP Header:** Minimum **20 bytes** (can expand to 60 bytes with options). Manages sequence numbers, acknowledgments, flags (`SYN`, `ACK`, `FIN`, `RST`), and advertised receive window sizes.
- **UDP Header:** Compact, fixed **8 bytes**. Contains only ports, packet length, and an optional checksum. Carries **60% less header overhead per packet**, maximizing payload bandwidth.

#### 2. Byte Stream vs. Datagram Boundaries
A frequent senior interview differentiator:
- **TCP is an Unstructured Byte Stream:** TCP has **no concept of message boundaries**. If a client calls `send("Hello")` and `send("World")`, the receiver might read `"HelloWorld"` in one `recv()`, or read `"Hel"` in the first `recv()` and `"loWorld"` in the second. Applications running on TCP must implement their own message framing (e.g., length-prefixed bytes or delimiter tokens like `\r\n`).
- **UDP Preserves Discrete Datagram Boundaries:** Packets are sent and received as independent, intact units. One `sendto()` call generates exactly one datagram, which is read in full by exactly one `recvfrom()` call.

---

### Comparison Matrix

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
| :--- | :--- | :--- |
| **Connection State** | **Connection-Oriented** (3-way handshake). | **Connectionless** (fire-and-forget). |
| **Reliability** | Guaranteed delivery (retransmits lost packets). | No delivery guarantee (packets can drop silently). |
| **Ordering** | Strict in-order delivery via sequence numbers. | No ordering guarantee (packets can arrive out of order). |
| **Header Size** | 20 to 60 bytes. | Fixed 8 bytes. |
| **Flow & Congestion Control**| Built-in (Sliding Window, Slow Start, AIMD). | None (application must throttle itself). |
| **Data Framing** | Continuous unstructured **Byte Stream**. | Independent **Datagrams** (preserves boundaries). |
| **Transmission Type** | Unicast only (point-to-point). | Unicast, Multicast, and Broadcast. |

---

### Real-World Case Study: High-Frequency Trading & Live Media

Why do High-Frequency Trading (HFT) platforms and live video calls choose UDP over TCP?

> **"Late data is worse than lost data."**

1. **Market Ticks in HFT:** In algorithmic trading, stock exchanges broadcast live market price feeds using UDP Multicast. If a price packet is dropped on a TCP connection, TCP halts the stream, requests a retransmission, and waits. By the time that packet arrives 5 milliseconds later, the market price has moved—**the delayed data is stale, useless, and financially dangerous**. It is far better to drop the missing tick and immediately consume the next real-time tick.
2. **Video Conferencing (Zoom / WebRTC):** If one audio frame drops during a live call, retransmitting it 200ms later would cause jarring audio stutter. The user prefers a momentary, unnoticeable audio glitch over creeping conversation lag.

---

### Summary
"TCP provides reliable, ordered, byte-stream delivery with congestion and flow control at the cost of connection handshakes and a 20-60 byte header. UDP provides lightweight, connectionless datagram delivery with a fixed 8-byte header, sacrificing reliability for raw throughput and low latency in real-time streaming, DNS, and financial market data."

---

### Code Demonstration: TCP Stream vs. UDP Datagram in Python

<Tabs groupId="programming-language">
<TabItem value="python" label="Python">

```python
import socket
import threading
import time

def run_udp_demo():
    # UDP Server: Preserves discrete datagram boundaries
    server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server.bind(("127.0.0.1", 9999))

    def client_send():
        client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Two distinct datagram sends
        client.sendto(b"Message 1", ("127.0.0.1", 9999))
        client.sendto(b"Message 2", ("127.0.0.1", 9999))
        client.close()

    threading.Thread(target=client_send).start()

    # Server receives exactly two distinct datagrams
    data1, _ = server.recvfrom(1024)
    data2, _ = server.recvfrom(1024)
    print(f"[UDP] Received Datagram 1: {data1.decode()}")
    print(f"[UDP] Received Datagram 2: {data2.decode()}")
    server.close()

if __name__ == "__main__":
    run_udp_demo()
```

</TabItem>
<TabItem value="c" label="C (POSIX Sockets)">

```c
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>

// Demonstrates lightweight UDP Datagram transmission (SOCK_DGRAM)
int main() {
    int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
    struct sockaddr_in servaddr;

    memset(&servaddr, 0, sizeof(servaddr));
    servaddr.sin_family = AF_INET;
    servaddr.sin_port = htons(9999);
    servaddr.sin_addr.s_addr = INADDR_ANY;

    const char* message = "Real-time tick data";
    // Fire-and-forget: No handshake, no ACK, fixed 8-byte header
    sendto(sockfd, message, strlen(message), 0, 
           (const struct sockaddr*)&servaddr, sizeof(servaddr));

    printf("[UDP Client] Datagram dispatched immediately without handshake.\n");
    close(sockfd);
    return 0;
}
```

</TabItem>
</Tabs>
