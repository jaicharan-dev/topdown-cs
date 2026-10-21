---
id: 8-http-versions
title: "HTTP/1.1 vs HTTP/2 vs HTTP/3: Evolution of the Web"
description: "How HTTP/1.1, HTTP/2, and HTTP/3 differ: binary framing, HPACK compression, head-of-line blocking, and why HTTP/3 moved to QUIC over UDP."
sidebar_position: 8
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box } from '@site/src/components/SimpleDiagram';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Compare HTTP/1.1, HTTP/2, and HTTP/3. Specifically: what is the HTTP/2 Binary Framing Layer, how does HPACK header compression work, what is transport-layer Head-of-Line blocking, and why does HTTP/3 switch to QUIC over UDP?"

Each new HTTP version exists to fix a specific bottleneck the last one hit. The story is: text → binary multiplexing → dropping TCP entirely.

<Diagram>
<Row>
<Box label="HTTP/1.1" sub="one request at a time" />
<Box label="HTTP/2" sub="multiplexed, one TCP" />
<Box label="HTTP/3" sub="QUIC over UDP" />
</Row>
</Diagram>

---

### HTTP/1.1: one thing at a time

HTTP/1.1 messages are plain text. On a single connection, request #2 can't even start until request #1's response has fully arrived — the browser works around this by opening up to 6 parallel TCP connections per site, which is a clunky fix, not a real solution. This "wait your turn" problem is called **head-of-line (HoL) blocking**.

---

### HTTP/2: break messages into frames, interleave them

HTTP/2's fix is to stop sending whole messages and instead chop everything into small binary pieces called **frames**, each tagged with a stream ID. Frames from different requests can be interleaved on the same connection — no more waiting your turn.

- **Frame** — the smallest unit. Tagged with a type (`HEADERS`, `DATA`, `SETTINGS`, ...) and a stream ID saying which logical request it belongs to.
- **Stream** — one logical request/response, made of one or more frames. The client's streams use odd IDs (1, 3, 5...), the server's use even ones.
- **Message** — the full logical request or response those frames add up to.

Because frames carry their stream ID, the client and server can mix frames from streams 1, 3, and 5 arbitrarily on the wire, and each side reassembles them correctly.

**HPACK** then shrinks the headers themselves. HTTP/1.1 resends 500-1500 bytes of near-identical headers (same `User-Agent`, same cookies) on every single request. HPACK fixes that two ways: a **static table** of ~61 common headers/values (so `GET /` can be sent as a 1-byte index instead of text), and a **dynamic table** both sides build up as the connection goes — send an auth token once, reference it by a few bits afterward. Together this cuts header bandwidth by 85-90%.

---

### HTTP/2's catch: it still runs on one TCP connection

Solving the application-level problem created a transport-level one. HTTP/2 crams everything — every stream, every request — onto a *single* TCP connection. TCP guarantees strictly ordered delivery, so if one packet belonging to Stream 5 gets lost:

1. The OS holds *all* incoming data — including packets for Streams 1, 3, 7 — in its buffer.
2. Nothing gets released to the application until the lost packet is retransmitted and acknowledged.
3. On a lossy connection (think 2% packet loss on cellular), this means one dropped packet freezes every active request. HTTP/2 can end up *slower* than HTTP/1.1's 6 separate connections, where only the unlucky connection would stall.

---

### HTTP/3: stop using TCP altogether

HTTP/3's answer is to ditch TCP and build on **QUIC**, which runs over UDP instead:

```
HTTP/3
QUIC (streams + TLS 1.3 + congestion control)
UDP
IP
```

Why this fixes things:

1. **Per-stream ordering, not per-connection.** QUIC tracks retransmission and ordering *per stream*, not across the whole connection. Drop a packet from Stream 3, and only Stream 3 pauses — Streams 1, 5, 7 keep flowing.
2. **Faster handshake.** TCP+TLS needs 2-3 round trips before the first HTTP byte moves. QUIC folds the transport and TLS 1.3 handshakes into a single round trip, and reconnecting clients can get **0-RTT** — data on the very first packet.
3. **Survives IP changes.** TCP identifies a connection by `(source IP, source port, destination IP, destination port)` — change your IP (say, walking out the door and switching from Wi-Fi to 5G) and the connection breaks. QUIC instead tags connections with a random **Connection ID**, so the same session keeps working even after the IP underneath it changes.

---

### Comparison table

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
| :--- | :--- | :--- | :--- |
| **Transport** | TCP | TCP | QUIC (over UDP) |
| **Handshake latency** | 2-3 RTT | 2-3 RTT | 1 RTT (0-RTT on resume) |
| **Data format** | Plaintext ASCII | Binary frames | Binary frames (QPACK) |
| **Multiplexing** | No | Yes, over one TCP connection | Yes, independent UDP streams |
| **App-layer HoL blocking** | Yes | Fixed | Fixed |
| **Transport-layer HoL blocking** | No (parallel connections dodge it) | Yes — the big flaw | Fixed |
| **Header compression** | None | HPACK | QPACK |
| **Survives IP change** | No | No | Yes (via Connection ID) |

---

### Say this in the interview

*"HTTP/1.1 processes requests sequentially per connection, causing head-of-line blocking — browsers just open more connections to cope. HTTP/2 fixes this at the application layer with binary framing: messages get split into frames tagged with stream IDs and interleaved over one TCP connection, plus HPACK compresses repetitive headers. But because HTTP/2 puts everything on one TCP connection, a single lost packet still blocks every stream — that's transport-layer head-of-line blocking. HTTP/3 fixes that by replacing TCP with QUIC over UDP, where each stream's ordering is independent, the handshake merges transport and TLS into 1 RTT, and a Connection ID lets sessions survive network changes like switching from Wi-Fi to cellular."*

---

### Code: simulating HTTP/1.1 blocking vs HTTP/2 multiplexing

The script below shows the difference directly: under HTTP/1.1-style sequential processing, a small fast resource queued behind a big slow one has to wait for it to finish; under HTTP/2-style interleaving, it doesn't.

```python
import time
import queue

class Resource:
    def __init__(self, name: str, total_chunks: int, chunk_delay: float):
        self.name = name
        self.total_chunks = total_chunks
        self.chunk_delay = chunk_delay
        self.chunks_sent = 0

def simulate_http11(resources):
    print("--- Simulating HTTP/1.1 (Sequential / HoL Blocking) ---")
    start = time.perf_counter()
    # In HTTP/1.1 on a single connection, resource 2 cannot start until resource 1 is completely delivered
    for res in resources:
        print(f"[*] Starting download of {res.name}...")
        for chunk in range(1, res.total_chunks + 1):
            time.sleep(res.chunk_delay)
        elapsed = time.perf_counter() - start
        print(f"[+] Finished {res.name} at {elapsed:.2f}s")
    print(f"HTTP/1.1 Total Elapsed: {time.perf_counter() - start:.2f}s\n")

def simulate_http2_multiplexing(resources):
    print("--- Simulating HTTP/2 (Binary Framing / Multiplexed) ---")
    start = time.perf_counter()
    # In HTTP/2, frames for multiple streams are interleaved over the same connection
    active_streams = list(resources)
    while active_streams:
        for stream in list(active_streams):
            time.sleep(stream.chunk_delay)
            stream.chunks_sent += 1
            if stream.chunks_sent == stream.total_chunks:
                elapsed = time.perf_counter() - start
                print(f"[+] Finished {stream.name} at {elapsed:.2f}s (Did not wait for slow streams!)")
                active_streams.remove(stream)
    print(f"HTTP/2 Total Elapsed: {time.perf_counter() - start:.2f}s\n")

if __name__ == "__main__":
    # Resource A is a heavy script (5 chunks, slow network or server computation: 0.1s/chunk)
    # Resource B is a small, critical CSS file (1 chunk, fast: 0.05s/chunk)
    res_a = Resource("Heavy_Script.js", total_chunks=5, chunk_delay=0.1)
    res_b = Resource("Critical_Style.css", total_chunks=1, chunk_delay=0.05)

    simulate_http11([res_a, res_b])

    res_a2 = Resource("Heavy_Script.js", total_chunks=5, chunk_delay=0.1)
    res_b2 = Resource("Critical_Style.css", total_chunks=1, chunk_delay=0.05)
    simulate_http2_multiplexing([res_a2, res_b2])
```
