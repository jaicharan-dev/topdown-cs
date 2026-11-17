---
id: 1-osi-model-tcp-ip
title: "OSI Model & TCP/IP: Layered Architecture"
description: "Seven layers designed by committee, four layers that actually shipped, and why each layer only talks to its neighbours"

sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the OSI model, and why do we use a layered architecture? What is the Protocol Data Unit (PDU) at each layer, and how does OSI map onto the 4-layer TCP/IP model actually used in practice?"

---

### Picture it

You post a letter to a friend abroad.

You write the letter. You do not think about aeroplanes. You put it in an envelope and write the address. The post office puts your envelope in a sack with other letters for that country. The sack goes in a container. The container goes on a plane.

At the other end everything comes apart in the exact reverse order. The container is opened, the sack is emptied, the envelope is handed to your friend, and your friend reads the letter. The letter itself was never touched by anybody in the middle.

Three things about this are the whole idea of layering.

**Each stage only talks to the stage above and below it.** The person loading the plane does not read letters. You do not load planes.

**Each stage wraps what it was given and adds its own label.** The envelope has an address, the sack has a destination country, the container has a flight number. Nobody rewrites the layer inside.

**Any stage can be replaced without disturbing the others.** Swap the plane for a ship and your letter is unchanged. Change your handwriting and the plane does not care.

That is why networks are built in layers. Wi-Fi replaced Ethernet cable without anybody rewriting a web browser.

---

### The proper terms

#### Why layer at all

A **layered architecture** splits a hard problem into stages, each of which provides a service to the layer above and consumes the service of the layer below, through a defined **interface**.

Four benefits follow, and they are the answer to "why layers".

**Abstraction.** A layer uses the one below without knowing how it works.

**Modularity.** A layer can be replaced if its interface is unchanged, which is how Wi-Fi slotted in under IP.

**Interoperability.** Different vendors implement the same layer and still work together, because the interface is what is standardised.

**Simpler troubleshooting.** A fault can be localised to a layer, which is what "is it a DNS problem or a routing problem" actually means.

#### The seven OSI layers

The **OSI model**, from the **ISO**, has seven layers. From the top down:

**Layer 7, Application.** The protocol the user's program speaks: HTTP, SMTP, FTP, DNS.

**Layer 6, Presentation.** Translation of data representation: **encryption**, **compression**, character encoding.

**Layer 5, Session.** Establishing, managing and tearing down a dialogue between two applications.

**Layer 4, Transport.** End-to-end delivery between **processes**, identified by **port numbers**. TCP and UDP live here, and so do reliability, ordering and flow control.

**Layer 3, Network.** End-to-end delivery between **hosts**, identified by **IP addresses**. This is where **routing** happens, and where IP, ICMP and the routing protocols live.

**Layer 2, Data Link.** Delivery across a single physical link to the next hop, identified by a **MAC address**. Ethernet and Wi-Fi are here, with **error detection** and media access control.

**Layer 1, Physical.** Bits as actual signals: voltages, light pulses, radio waves, connectors and cables.

The distinction worth holding onto is Layer 3 versus Layer 4. Layer 3 gets data to the right **machine**. Layer 4 gets it to the right program on that machine.

#### The PDU at each layer

A **Protocol Data Unit** is the name for the unit of data at a given layer. The names get asked about because they are precise and easily mixed up.

| Layer | PDU |
| --- | --- |
| Application, Presentation, Session | **Data**, or message |
| Transport | **Segment** for TCP, **datagram** for UDP |
| Network | **Packet**, also called an IP datagram |
| Data Link | **Frame** |
| Physical | **Bit**, or symbol |

#### Encapsulation and decapsulation

**Encapsulation** is each layer wrapping what it received from above in its own **header**, and sometimes a **trailer**, as the data travels down the stack on the sender.

The payload of one layer is the complete PDU of the layer above it. So an Ethernet frame carries an IP packet, which carries a TCP segment, which carries the HTTP data.

**Decapsulation** is the reverse on the receiver: each layer strips its own header, acts on it, and passes the payload up.

The headers are the price of layering. A minimal HTTP request over TCP, IP and Ethernet carries roughly 54 bytes of headers before a single byte of request.

#### How OSI maps onto TCP/IP

The **TCP/IP model**, also called the **internet protocol suite**, has four layers, and it is the one that exists in real systems.

| TCP/IP layer | OSI layers | Examples |
| --- | --- | --- |
| **Application** | 7, 6, 5 | HTTP, DNS, TLS, SMTP |
| **Transport** | 4 | TCP, UDP, QUIC |
| **Internet** | 3 | IP, ICMP, routing |
| **Link**, or network access | 2, 1 | Ethernet, Wi-Fi, ARP |

So TCP/IP collapses OSI's top three layers into one, and its bottom two into one.

#### Why TCP/IP prevailed

**It had running code.** TCP/IP was implemented, deployed on ARPANET and shipped in Berkeley Unix with the **sockets** API while OSI was still a specification being negotiated.

**The session and presentation layers never justified themselves as layers.** Their jobs were real but applications did them directly, which is why TLS, a textbook Layer 6 job, is in practice treated as part of the application layer.

**It was simpler.** Four layers with a deliberately minimal, **best-effort** network layer turned out to be the right division of labour, and pushing reliability up into TCP let IP stay simple enough to run over anything.

OSI survives as the teaching and vocabulary standard, which is why interviewers ask for seven layers and engineers say "a Layer 7 load balancer" while running a four-layer stack.

---

### In code

```text
Encapsulation on the way down, decapsulation on the way up:

  SENDER                                  RECEIVER

  Application   [ HTTP data ]             [ HTTP data ]      ^
       |                                        |           |
  Transport     [TCP| HTTP data ]         [TCP| HTTP data ]  |
       |                                        |           |
  Network       [IP|TCP| HTTP data ]      [IP|TCP| HTTP ]    |
       |                                        |           |
  Link      [Eth|IP|TCP| HTTP |CRC]       [Eth|IP|TCP|...]   |
       |                                        |           |
  Physical       1010110010...  ------>   1010110010...  ----+

  Each layer's payload is the whole PDU of the layer above.
  Nothing in the middle reads the HTTP data.
```

```text
What each header is for, in one line each:

  Ethernet   destination MAC      -> which device on this link
  IP         destination IP       -> which host on the internet
  TCP        destination port     -> which program on that host
  HTTP       GET /index.html      -> which resource in that program

  Layer 3 finds the machine. Layer 4 finds the program.
```

```text
The two models side by side:

  OSI                     TCP/IP            what runs there

  7 Application    +----  Application       HTTP, DNS, TLS, SMTP
  6 Presentation   |
  5 Session        +
  4 Transport      ----   Transport         TCP, UDP, QUIC
  3 Network        ----   Internet          IP, ICMP, BGP
  2 Data Link      +----  Link              Ethernet, Wi-Fi, ARP
  1 Physical       +
```

---

### What they ask next

**"Which layer does a router work at, and a switch?"**
A router works at Layer 3, forwarding packets by IP address between networks. A switch works at Layer 2, forwarding frames by MAC address within one network. A hub was Layer 1, repeating signals with no idea what they meant.

**"Where does TLS belong?"**
Strictly it is a presentation-layer concern, since it encrypts, which is Layer 6. In practice it sits between TCP and the application and is implemented as a library the application calls, so everyone treats it as application layer. This mismatch is the usual example of OSI not describing real stacks.

**"Why is a TCP unit called a segment but a UDP unit a datagram?"**
Because TCP presents a byte stream and chops it into segments of its own choosing, so a segment is a piece of something continuous. UDP preserves whatever boundary the application gave it, so each unit is a self-contained datagram.

**"What does a Layer 7 load balancer do that a Layer 4 one cannot?"**
It can read the application data, so it can route on a URL path, a hostname or a cookie. A Layer 4 balancer sees only IP addresses and ports, so it is faster but can only balance connections.

**"How much header overhead is there?"**
About 54 bytes for Ethernet, IP and TCP together, before any payload. This is why protocols fight over header size, and why HTTP/2 compresses headers.

**The common wrong answer** is reciting the seven layers and stopping. The point of the question is the interface between layers: each layer serves the one above, uses the one below, and can be swapped out without either noticing.

---

### Say this in the interview

*"The OSI model is a seven-layer reference model from ISO. Top down: application, presentation, session, transport, network, data link and physical. Layer 4 is end-to-end delivery between processes identified by port numbers, and Layer 3 is delivery between hosts identified by IP addresses, which is where routing happens. We use a layered architecture because it gives abstraction, so a layer uses the one below without knowing how it works; modularity, so a layer can be replaced if its interface stays the same, which is how Wi-Fi slotted in under IP; interoperability between vendors; and fault isolation to a single layer.*

*The protocol data units are data or a message at the top three layers, a segment for TCP and a datagram for UDP at transport, a packet at network, a frame at data link, and bits at physical. Layer 6 handles encryption, compression and character encoding, and Layer 2 adds a MAC address and error detection.*

*Encapsulation is each layer wrapping what it got from above in its own header, and sometimes a trailer, as the data goes down the stack, so an Ethernet frame carries an IP packet carrying a TCP segment carrying HTTP data. Decapsulation is the receiver stripping each header and passing the payload up. That costs roughly 54 bytes of headers before any payload.*

*The TCP/IP model, or internet protocol suite, has four layers: application, which covers OSI 7, 6 and 5; transport, which is OSI 4; internet, which is OSI 3; and link or network access, which is OSI 2 and 1.*

*TCP/IP prevailed because it had running code, shipping in Berkeley Unix with the sockets API while OSI was still being negotiated; because the session and presentation layers never justified themselves as separate layers, which is why TLS is treated as application layer in practice; and because a deliberately minimal, best-effort internet layer with reliability pushed up into TCP let IP run over anything. OSI survives as the vocabulary, which is why we still say Layer 4 and Layer 7.*

*The distinction I would emphasise is that Layer 3 gets data to the right machine by IP address, and Layer 4 gets it to the right program on that machine by port."*
