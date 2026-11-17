---
id: 2-tcp-vs-udp
title: "TCP vs UDP: Reliability vs Speed"
description: "A phone call that guarantees every word against a shout that guarantees nothing, and why some people want the shout"

sidebar_position: 2
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the fundamental difference between TCP and UDP? Compare their header overheads, explain the difference between a byte stream and datagram boundaries, and explain why high-frequency trading chooses UDP."

---

### Picture it

Two ways to get a message to someone.

**A phone call.** You dial, they pick up, you both say hello, and only then do you talk. If they did not catch a word they say "sorry, again?" and you repeat it. Words arrive in the order you said them. If the line is bad you slow down. When you are done you say goodbye and hang up. Nothing is lost, but setting up and tearing down takes time, and one missed word holds up everything after it while you repeat yourself.

**Shouting across a street.** You shout, and you walk away. Maybe they heard you, maybe not. You will never know. If you shout three things they might hear the third first, or only two of them. There is no hello and no goodbye.

The phone call looks obviously better until you think about what the message is.

If it is your bank balance, you want the phone call. If it is a live football commentary, the shout wins: by the time you finished repeating the word they missed, the game has moved on, and they would rather hear what is happening **now** than hear a correct version of what happened a second ago.

That is the whole trade. Not "reliable versus unreliable", but **completeness versus timeliness**. Some data is worthless late.

---

### The proper terms

#### TCP

**TCP**, the **Transmission Control Protocol**, is **connection-oriented** and **reliable**.

It establishes a connection with a **three-way handshake** before any data moves, and closes it explicitly. Every segment carries a **sequence number** and must be **acknowledged**, so a sender that gets no acknowledgement **retransmits**. The receiver uses sequence numbers to **reorder** anything that arrived out of order and to discard duplicates.

It also regulates speed in two independent ways: **flow control**, which stops a fast sender overwhelming a slow receiver, and **congestion control**, which stops senders overwhelming the network.

The guarantee TCP offers is precise: your bytes arrive **complete**, **in order**, and **without duplication**, or the connection fails and you are told. It does not promise they arrive quickly.

#### UDP

**UDP**, the **User Datagram Protocol**, is **connectionless** and **unreliable**, which here is a technical description rather than an insult.

There is no handshake, no acknowledgement, no retransmission, no reordering and no congestion control. A **datagram** is sent and forgotten. It may be lost, duplicated or delivered out of order, and the sender is never told.

What it does provide is worth naming: **ports**, for multiplexing to the right process, and an optional **checksum** for corruption detection. It is a thin wrapper over IP, and that thinness is the point.

Because it does nothing, it does nothing slowly. There is no connection setup, no waiting on an acknowledgement, and no **head-of-line blocking**: one lost datagram does not hold up the ones behind it.

#### Header overhead

| | TCP | UDP |
| --- | --- | --- |
| Minimum header | **20 bytes** | **8 bytes** |
| Maximum header | 60 bytes with options | 8 bytes, fixed |
| Fields | ports, sequence number, acknowledgement number, flags, window, checksum, urgent pointer, options | source port, destination port, length, checksum |

TCP's 20 bytes carry the machinery of reliability: the **sequence number** and **acknowledgement number** are 4 bytes each, and the **window** field is what makes flow control possible. Options such as **timestamps** and **selective acknowledgement** push it towards 60.

UDP's 8 bytes are four 2-byte fields and nothing else. There is no sequence number because nothing is ordered, and no window because nothing is controlled.

For a 1 byte payload the difference matters enormously. For a 1 MB file transfer it is noise. Header size is the wrong reason to pick UDP; latency behaviour is the right one.

#### Byte stream versus datagram boundaries

This is the difference people actually get wrong in practice.

TCP is a **byte stream**. It does not preserve the boundaries of your writes. Two sends of 100 bytes each may arrive as one read of 200 bytes, or as reads of 150 and 50. TCP guarantees the order of the bytes, not the shape of your messages.

The consequence is that any application protocol over TCP must do its own **message framing**, which is why HTTP has a `Content-Length` header and why protocols use length prefixes or delimiters.

UDP is **message-oriented** and preserves boundaries exactly. One `sendto` becomes one `recvfrom`, of exactly the same length. If 100 bytes are sent, either 100 bytes arrive or nothing does. A datagram is never split or merged.

So UDP gives you framing for free and reliability not at all, while TCP gives you reliability and leaves framing to you.

#### Why high-frequency trading chooses UDP

Four reasons, and they build on each other.

**Retransmission is useless.** A market price from 40 milliseconds ago is not valuable data, it is misleading data. TCP would spend time delivering a stale price correctly. The right response to a lost price update is to ignore it and act on the next one.

**Head-of-line blocking is unacceptable.** Under TCP, one lost segment stalls every later byte until it is recovered, so a single loss delays every price behind it. With UDP, a lost datagram is simply a gap.

**Multicast.** Exchanges send one feed to many subscribers. UDP supports **IP multicast**, so the exchange transmits once; TCP is strictly point-to-point and would need a separate connection and a separate copy per subscriber.

**Predictable latency.** TCP's congestion control deliberately varies the sending rate, which adds **jitter**. Trading systems care about the worst case and the variance, not the average, so a protocol that never changes its mind is preferable.

The honest part of the answer is that reliability is not abandoned, it is **moved**. Exchange feeds carry **sequence numbers in the application payload**, so a receiver detects a gap itself and requests the missing item from a separate recovery channel, or simply waits for the next full **snapshot**. The same is true of **QUIC**, which rebuilds reliability over UDP in user space to escape exactly these TCP behaviours.

---

### In code

```text
Header overhead, drawn to scale:

  UDP   [ src port | dst port | length | checksum ]  8 bytes
          2 bytes    2 bytes    2 B      2 B

  TCP   [ src port | dst port |     sequence number     ]
        [    acknowledgement number    | flags | window ]
        [ checksum | urgent ptr |  options (0 to 40 B)  ]
          20 bytes minimum, up to 60

  Everything TCP has that UDP lacks is reliability machinery.
```

```text
Byte stream vs datagram boundaries:

  TCP sender:   send("HELLO")   send("WORLD")
      receiver: recv() -> "HELLOWORLD"        one read, boundaries gone
                recv() -> "HEL"               or split anywhere at all
      => the application must frame its own messages

  UDP sender:   sendto("HELLO")  sendto("WORLD")
      receiver: recvfrom() -> "HELLO"         exactly one datagram
                recvfrom() -> "WORLD"         or nothing, never a part
      => framing is free, delivery is not guaranteed
```

```text
Head-of-line blocking, which is the real reason trading picks UDP:

  TCP:  prices  1  2  [3 lost]  4  5  6
        delivered: 1  2  ......... wait for 3 ......... 3 4 5 6
        the application sees nothing new until 3 is recovered

  UDP:  prices  1  2  [3 lost]  4  5  6
        delivered: 1  2            4  5  6
        the application sees a gap and acts on the newest price
```

---

### What they ask next

**"Is UDP faster than TCP?"**
Not in raw throughput, where a healthy TCP connection is often faster. UDP wins on **latency** and on **latency predictability**, because it never waits for an acknowledgement and never slows itself down. "Faster" without saying faster at what is the trap in this question.

**"Why does DNS use UDP?"**
A query and its reply fit in one small datagram, so a handshake would triple the cost of the whole exchange, and loss is handled by simply asking again. DNS falls back to TCP when a response is too large or for zone transfers.

**"How does HTTP/3 get reliability over UDP?"**
QUIC implements sequence numbers, acknowledgements, retransmission and congestion control in user space on top of UDP, with independent streams, so a loss in one stream does not block the others. It wanted TCP's reliability without TCP's head-of-line blocking and without waiting years for operating systems to change.

**"What happens if a UDP datagram is bigger than the MTU?"**
IP fragments it, and because losing any one fragment loses the whole datagram, the effective loss rate rises sharply. This is why applications keep datagrams under roughly 1472 bytes on Ethernet.

**"Does UDP have any reliability at all?"**
Only the optional checksum, which detects corruption and causes the datagram to be discarded rather than repaired. Detection is not recovery.

**The common wrong answer** is "use TCP when you need reliability and UDP when you do not care about data". Trading systems care enormously about their data. They reject TCP because its recovery mechanism is **slower than the data's useful lifetime**, and they rebuild the reliability they want in the application.

---

### Say this in the interview

*"TCP, the Transmission Control Protocol, is connection-oriented and reliable. It sets up a connection with a three-way handshake, numbers every segment with a sequence number, requires acknowledgements and retransmits what is not acknowledged, reorders what arrives out of order, discards duplicates, and regulates speed with flow control for the receiver and congestion control for the network. The guarantee is that bytes arrive complete, in order and without duplication, or the connection fails.*

*UDP, the User Datagram Protocol, is connectionless and unreliable. No handshake, no acknowledgements, no retransmission, no reordering, no congestion control. It adds only ports for multiplexing and an optional checksum. Because it does nothing, there is no head-of-line blocking: one lost datagram does not delay the ones behind it.*

*On headers, TCP is 20 bytes minimum and up to 60 with options such as timestamps and selective acknowledgement, because it has to carry a sequence number, an acknowledgement number, flags and a window field. UDP is a fixed 8 bytes: two ports, a length and a checksum.*

*The byte stream versus datagram distinction is the practical one. TCP is a byte stream and does not preserve write boundaries, so two 100-byte sends can arrive as one 200-byte read, which is why application protocols need their own message framing, like HTTP's Content-Length. UDP is message-oriented: one sendto is exactly one recvfrom of the same length, never split or merged.*

*High-frequency trading picks UDP because a price from 40 milliseconds ago is misleading rather than useful, so retransmission is the wrong behaviour; because TCP's head-of-line blocking means one loss stalls every later price; because exchanges use IP multicast to send one feed to many subscribers, which TCP cannot do; and because congestion control introduces jitter, and they care about worst-case latency. Reliability is not abandoned, it is moved into the application: feeds carry sequence numbers in the application payload so a receiver detects a gap and recovers it on a separate channel or waits for the next snapshot. QUIC does the same thing for HTTP/3."*
