---
id: 2-tcp-vs-udp
title: "TCP vs UDP: Reliability vs Speed"
description: "Compare TCP and UDP protocols, header byte overhead, byte streams vs datagram boundaries, and real-world fintech/streaming use cases."
sidebar_position: 2
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the fundamental difference between TCP and UDP? Compare their header overheads, explain the difference between a byte stream and datagram boundaries, and explain why high-frequency trading chooses UDP."

Think about the difference between certified mail and a postcard. Certified mail gets a signature when it arrives — if it never shows up, you find out and can resend it. A postcard just goes in the mailbox — no confirmation, no resend if it's lost, but it's faster and cheaper to send.

That's TCP and UDP. **TCP** trades speed for reliability, order, and integrity. **UDP** trades reliability for speed and simplicity. Both sit at Layer 4 (Transport).

<Diagram>
<Row>
<Box title="TCP" accent="#60a5fa">
<Field icon="✅" code="reliable, ordered, checked" hint="connection-based, 20-60 byte header" variant="neutral" />
</Box>
<Box title="UDP" accent="#f59e0b">
<Field icon="⚡" code="fast, no guarantees" hint="connectionless, fixed 8 byte header" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### What's inside each header

- **TCP header:** at least 20 bytes (up to 60 with options). Carries sequence numbers, acknowledgment numbers, flags (`SYN`, `ACK`, `FIN`, `RST`), and the advertised window size — everything needed to track order and confirm delivery.
- **UDP header:** a fixed 8 bytes. Just source port, destination port, length, and an optional checksum. Roughly 60% less overhead per packet than TCP, so more of every packet is actual payload.

---

### Byte stream vs. datagram boundaries

This is a common follow-up question, because it trips people up:

- **TCP is just a stream of bytes — it doesn't know where one message ends and another begins.** If you call `send("Hello")` then `send("World")`, the receiver might get `"HelloWorld"` in one `recv()` call, or `"Hel"` and then `"loWorld"`. If your app needs to know where messages start and stop, you have to build that yourself — a length prefix, or a delimiter like `\r\n`.
- **UDP keeps each message as its own separate packet.** One `sendto()` call produces exactly one datagram, and one `recvfrom()` call reads exactly one datagram, in full, with its boundaries intact.

---

### Comparison

| Feature | TCP | UDP |
| :--- | :--- | :--- |
| **Connection** | Connection-oriented (3-way handshake) | Connectionless — fire and forget |
| **Reliability** | Guaranteed — lost packets get retransmitted | No guarantee — packets can silently drop |
| **Ordering** | Strict, via sequence numbers | None — packets can arrive out of order |
| **Header size** | 20 to 60 bytes | Fixed 8 bytes |
| **Flow & congestion control** | Built in (sliding window, slow start, AIMD) | None — the app has to throttle itself |
| **Data framing** | Byte stream, no boundaries | Independent datagrams, boundaries preserved |
| **Transmission** | Unicast only | Unicast, multicast, and broadcast |

---

### Why high-frequency trading and video calls pick UDP

> **"Late data is worse than lost data."**

1. **Market ticks:** exchanges broadcast live price feeds over UDP multicast. If a packet drops on a TCP connection, TCP stops, asks for a retransmit, and waits. By the time that packet shows up 5ms later, the price has already moved — the "recovered" data is stale and useless. It's better to drop the missed tick and move straight to the next real one.
2. **Video calls (Zoom, WebRTC):** if one audio frame drops, retransmitting it 200ms later causes a jarring stutter. A tiny, barely-noticeable glitch beats growing lag.

---

### Say this in the interview

*"TCP gives you reliable, ordered, byte-stream delivery with built-in flow and congestion control, at the cost of a handshake and a bigger header. UDP gives you lightweight, connectionless datagram delivery with a fixed 8-byte header — you give up reliability in exchange for raw speed, which is exactly what real-time streaming, DNS, and market-data feeds need."*

---

### Code: TCP stream vs. UDP datagram

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
