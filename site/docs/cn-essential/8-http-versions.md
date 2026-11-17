---
id: 8-http-versions
title: "HTTP/1.1 vs HTTP/2 vs HTTP/3: Evolution of the Web"
description: "Three attempts at the same problem, where each one fixes the queue the last one could not reach"

sidebar_position: 8
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Compare HTTP/1.1, HTTP/2, and HTTP/3. Specifically: what is the HTTP/2 Binary Framing Layer, how does HPACK header compression work, what is transport-layer Head-of-Line blocking, and why does HTTP/3 switch to QUIC over UDP?"

---

### Picture it

A single-lane road to a warehouse, with lorries queueing to deliver.

**HTTP/1.1 is one lorry at a time.** The next lorry cannot set off until the previous one has unloaded and left. If the first lorry is slow, everything behind it waits, however small its cargo. The workaround was to build six parallel roads and send six lorries at once, which is literally what browsers did: six connections per site.

**HTTP/2 widened the road into lanes.** One road, but cargo from many deliveries is broken into labelled crates, and crates from different orders travel interleaved, in any order. The warehouse reads the labels and reassembles each order. One slow order no longer blocks the others, and six roads are no longer needed.

Except there is a problem nobody noticed until it was deployed. **The road has a rule: crates must be unloaded strictly in the order they were loaded.** So if one crate falls off the lorry, every crate behind it sits at the gate, even though they belong to completely different orders and are perfectly fine. The lanes were painted on the cargo, not on the road. The road still insists on one queue.

**HTTP/3 replaced the road.** A road where crates can be unloaded as they arrive, independently per order. Lose one crate and only its own order waits. The reason this took a redesign rather than a patch is that the one-queue rule was built into the road itself, and the road was TCP.

---

### The proper terms

#### HTTP/1.1 and its ceiling

HTTP/1.1 is a **text protocol** in which a connection carries **one request and response at a time**. **Keep-alive** made the connection reusable, which removed repeated handshakes but not the serialisation.

**Pipelining** was specified to allow several requests to be sent without waiting, but responses still had to return **in request order**, so a slow first response blocked the rest. It was badly supported by proxies and is disabled everywhere. That is **application-layer head-of-line blocking**.

Browsers worked around it by opening about **six connections per origin**, and web developers worked around it with **concatenation**, **sprite sheets**, inlining and **domain sharding**, all of which exist only to defeat a protocol limitation.

Headers made it worse. They are sent in full, uncompressed, on every request, and a modern request's cookies and user-agent can run to a kilobyte, repeated for every one of a hundred assets.

#### The HTTP/2 binary framing layer

This is the fundamental change in HTTP/2, and everything else follows from it.

HTTP/2 stops sending text messages and introduces a **framing layer** between HTTP and TCP. An HTTP message is split into **frames**, each with a short **binary** header carrying a length, a **type** such as **HEADERS** or **DATA**, flags, and critically a **stream identifier**.

That identifier is what enables **multiplexing**. A **stream** is an independent bidirectional sequence of frames within one connection, and frames from many streams are interleaved freely on a **single TCP connection**. The receiver demultiplexes by stream identifier and reassembles each message.

Three consequences:

**Application-layer head-of-line blocking is solved.** Responses may be returned in any order and interleaved, so a slow response no longer blocks others.

**One connection replaces six.** Less handshaking, less TLS setup, and one congestion control state that learns the path properly instead of six competing ones.

**Parsing becomes cheap and unambiguous.** Binary frames have an explicit length, so there is no text parsing and no ambiguity, which also removes a family of request-smuggling tricks.

It also added stream **prioritisation**, with dependencies and weights, and **server push**, which proved unusable in practice and has been removed from browsers.

#### HPACK header compression

HPACK exists because repeating a kilobyte of headers per request is absurd once you can send a hundred requests at once. It combines three mechanisms.

**A static table.** 61 predefined entries covering the most common header fields and some common values, such as `:method: GET` and `:status: 200`. Sending index 2 costs **one byte** and means `:method: GET`.

**A dynamic table.** A table built up as the connection runs, shared between both sides and kept in sync. A header sent once is added, and every later occurrence is sent as an **index** rather than as text. So `cookie: <2 kilobytes>` is sent in full once and then referenced by index for the rest of the connection.

**Huffman coding.** Values that must be sent literally are encoded with a fixed Huffman table tuned for header content, giving roughly a further 30 percent.

Typical results are an order of magnitude, with repeated request headers reduced to a handful of bytes.

HPACK is deliberately **not** a general compressor. Using gzip over headers, as SPDY did, exposed the **CRIME** attack, in which an attacker who can inject a guess into a request observes the compressed size and learns whether the guess matched a secret such as a cookie. HPACK's index-based design, with no sliding window over attacker-influenced text, removes the oracle. The security of the design is part of the answer.

#### Transport-layer head-of-line blocking

This is the question's real substance, and the reason HTTP/3 exists.

TCP delivers a single, strictly ordered byte stream. If segment N is lost, TCP cannot deliver any byte after it to the layer above, even though those bytes have arrived and are sitting in the receive buffer, because delivering them would violate ordering.

Under HTTP/1.1 that was tolerable: the bytes behind the gap belonged to the same request anyway.

Under HTTP/2 it is perverse. The bytes behind the gap belong to **different streams**, which are supposed to be independent. One lost segment stalls every concurrent request on the connection. HTTP/2 solved head-of-line blocking at the application layer and then hit the same problem one layer down, where it could not reach.

The sting is that HTTP/2 made this **worse** than HTTP/1.1 under loss. Six HTTP/1.1 connections mean a loss stalls one sixth of the work; one HTTP/2 connection means a loss stalls all of it. On a lossy mobile network, HTTP/2 could measurably lose to HTTP/1.1.

No change to HTTP could fix it, because the ordering guarantee belongs to TCP.

#### Why HTTP/3 moved to QUIC over UDP

**QUIC** is a transport protocol built on **UDP**, and HTTP/3 is HTTP mapped onto it. UDP was chosen not for any feature of UDP, but because it is the only way to deploy a new transport: it passes through existing routers and firewalls, and it can be implemented in **user space** instead of waiting for operating system kernels to ship a new protocol.

QUIC then rebuilds everything TCP provided, with the one change that motivated the whole exercise.

**Streams are native to the transport, with independent loss recovery.** QUIC knows which stream each packet's data belongs to, so a lost packet blocks **only its own stream** and the rest are delivered immediately. This eliminates transport-layer head-of-line blocking, which is the entire point.

**TLS 1.3 is integrated, not layered.** The transport and cryptographic handshakes are combined, so a new connection is one round trip instead of TCP's handshake plus TLS's, and a resumed connection can be **0-RTT**. QUIC is always encrypted; there is no unencrypted mode.

**Connection IDs replace the four-tuple.** A TCP connection is identified by source and destination addresses and ports, so changing network changes the connection and breaks it. A QUIC connection is identified by a **connection ID** that survives an address change, giving **connection migration**: moving from Wi-Fi to cellular keeps the connection alive.

**Loss recovery is cleaner.** Every packet gets a new, monotonically increasing **packet number**, even retransmissions, which removes TCP's **retransmission ambiguity** and makes round-trip estimation accurate. Acknowledgements carry explicit ranges, similar to SACK but mandatory.

**QPACK replaces HPACK.** Header compression needed redesigning because HPACK's dynamic table requires ordered delivery, which would reintroduce exactly the blocking QUIC removed. QPACK separates the table updates onto their own streams so a header block can be decoded without waiting.

The costs are real: UDP is blocked or deprioritised on some networks, so clients keep a TCP fallback; user-space implementation and per-packet encryption cost more CPU; and the hardware offload that TCP enjoys is less mature.

---

### In code

```text
The three generations of the same request pattern:

  HTTP/1.1, six connections, one request each at a time
    conn1: [--- req A ---][--- req G ---]
    conn2: [--- req B --------][- req H -]
    ...6 connections because one is strictly serial

  HTTP/2, one connection, frames interleaved by stream id
    conn:  [A][B][C][A][C][B][B][A][C]
            ^ frames tagged with a stream identifier
    one TCP connection, many concurrent streams

  HTTP/3, one QUIC connection, streams independent in the transport
    conn:  [A][B][C][A][C][B][B][A][C]
            ^ the transport itself knows the stream boundaries
```

```text
An HTTP/2 frame, which is where the binary framing layer lives:

  +-----------------------------------------------+
  |  length (24 bits)                             |
  +---------------+---------------+---------------+
  |  type (8)     |  flags (8)    |               |
  +---------------+---------------+---------------+
  |  stream identifier (31 bits)                  |
  +-----------------------------------------------+
  |  frame payload                                |
  +-----------------------------------------------+

  type: HEADERS, DATA, SETTINGS, WINDOW_UPDATE, RST_STREAM, ...
  the stream identifier is what makes multiplexing possible
  an explicit length means no text parsing and no ambiguity
```

```text
HPACK, in three mechanisms:

  static table      index 2  = ":method: GET"        1 byte
                    index 8  = ":status: 200"        1 byte
                    61 predefined entries

  dynamic table     first request:  cookie: abc...   sent in full,
                                                     added at index 62
                    every request after: index 62    1 to 2 bytes

  Huffman coding    applied to whatever must be sent literally,
                    a further ~30% on average

  Not gzip, deliberately: a sliding-window compressor over
  attacker-influenced text leaks secrets by compressed size.
  That attack is CRIME; HPACK's index design has no such oracle.
```

```text
Transport-layer head-of-line blocking, the problem HTTP/2 could not reach:

  one TCP connection carrying streams A, B and C

  on the wire:   [A1][B1][C1][A2][B2][C2]
  received:      [A1][B1][ X ][A2][B2][C2]
                           ^ C1 lost

  TCP must deliver bytes in order, so:
      A2, B2, C2 have ARRIVED and sit in the buffer
      the application is given NOTHING until C1 is retransmitted
      -> streams A and B stall on a loss that belongs to C

  Six HTTP/1.1 connections: a loss stalls one sixth of the work.
  One HTTP/2 connection: a loss stalls all of it.

  QUIC: the transport knows the stream boundaries, so A2 and B2
  are delivered at once and only C waits.
```

---

### What they ask next

**"If HTTP/2 multiplexes, why was it sometimes slower than HTTP/1.1?"**
Because collapsing six connections into one concentrated the effect of loss. Transport-layer head-of-line blocking meant a single lost segment stalled every concurrent stream, whereas with six connections it stalled only one. On lossy mobile networks this was measurable.

**"Does HTTP/2 require HTTPS?"**
Not in the specification, but every browser requires TLS for it, so in practice yes. HTTP/3 is encrypted by definition, since TLS 1.3 is built into QUIC.

**"Why not just fix TCP?"**
TCP's in-order delivery is its defining guarantee, and changing it would change TCP's contract. Worse, TCP lives in the operating system kernel and in middleboxes, so a change takes a decade to deploy. Building on UDP in user space sidesteps both problems, which is why QUIC ships in browsers that update every six weeks.

**"What happened to server push?"**
It was meant to send resources before they were requested, but servers could not know what the client already had cached, so it wasted bandwidth more often than it helped. Chrome removed it. **103 Early Hints**, which tells the client what to fetch itself, replaced the idea with a better one.

**"What does connection migration give you?"**
A connection that survives a change of IP address, because QUIC identifies connections by connection ID rather than by the four-tuple. Walking out of Wi-Fi range onto cellular keeps a download or video call alive instead of breaking it.

**"Why did HPACK need replacing with QPACK?"**
Because HPACK's dynamic table has to be applied in order to stay in sync, so decoding one header block could block on an earlier one, reintroducing head-of-line blocking inside the compression state. QPACK moves table updates onto separate streams so header blocks decode independently.

**The common wrong answer** is "HTTP/2 fixed head-of-line blocking". It fixed it at the **application** layer and then hit it again at the **transport** layer, which is precisely why HTTP/3 had to replace the transport rather than revise HTTP.

---

### Say this in the interview

*"HTTP/1.1 is a text protocol carrying one request and response at a time per connection. Keep-alive made connections reusable but not concurrent, and pipelining failed because responses still had to return in request order, which is application-layer head-of-line blocking. Browsers worked around it by opening about six connections per origin, and developers used concatenation, sprite sheets, inlining and domain sharding. Headers were also sent uncompressed in full on every request.*

*HTTP/2's fundamental change is the binary framing layer. Messages are split into binary frames with a length, a type such as HEADERS or DATA, flags, and a stream identifier. That identifier enables multiplexing: a stream is an independent bidirectional sequence of frames, and frames from many streams interleave freely on a single TCP connection. So application-layer head-of-line blocking is solved, one connection replaces six with a single congestion control state, and parsing becomes cheap and unambiguous because frames have explicit lengths. It also added stream prioritisation and server push, and push has since been removed from browsers.*

*HPACK compresses headers with three mechanisms: a static table of 61 common entries where sending an index costs one byte; a dynamic table built up during the connection and kept in sync on both sides, so a two-kilobyte cookie is sent once and then referenced by index; and Huffman coding for whatever must be sent literally. It is deliberately not gzip, because compressing attacker-influenced text with a sliding window leaks secrets by compressed size, which is the CRIME attack, and HPACK's index-based design has no such oracle.*

*Transport-layer head-of-line blocking is the problem HTTP/2 could not reach. TCP delivers a single strictly ordered byte stream, so if one segment is lost, no byte after it can be delivered even though it has arrived. Under HTTP/2 those later bytes belong to different streams that are supposed to be independent, so one loss stalls every concurrent request. That made HTTP/2 worse than HTTP/1.1 under loss, since six connections mean a loss stalls one sixth of the work while one connection stalls all of it. No change to HTTP could fix it, because the ordering guarantee belongs to TCP.*

*So HTTP/3 runs over QUIC, a transport built on UDP. UDP was chosen because it is the only way to deploy a new transport: it passes existing middleboxes and can live in user space instead of waiting for kernels. QUIC makes streams native to the transport with independent loss recovery, so a lost packet blocks only its own stream. It integrates TLS 1.3, giving a one round trip handshake and 0-RTT resumption, and it is always encrypted. It identifies connections by connection ID rather than the four-tuple, which gives connection migration across a change of network. Every packet including retransmissions gets a new packet number, removing TCP's retransmission ambiguity. And QPACK replaces HPACK because HPACK's ordered dynamic table would have reintroduced the blocking QUIC removed. The costs are that some networks block UDP so a TCP fallback is kept, and that user-space implementation and per-packet encryption cost more CPU with less mature hardware offload."*
