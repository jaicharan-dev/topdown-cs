---
id: 1-osi-model-tcp-ip
title: "OSI Model & TCP/IP: Layered Architecture"
description: "Understand the 7-layer OSI model, Protocol Data Units (PDUs), encapsulation/decapsulation, and why the 4-layer TCP/IP model prevailed in practice."
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the OSI model, and why do we use a layered architecture? What is the Protocol Data Unit (PDU) at each layer, and how does OSI map onto the 4-layer TCP/IP model actually used in practice?"

Imagine a bank sending a secure legal contract to an overseas branch:

- The **lawyers** draft the contract, translate it, and encrypt it.
- The **courier** stamps a tracking number on the envelope so missing pages can be detected.
- **Dispatch** glues on the recipient's address and country code.
- The **driver** figures out the actual streets to drive.
- The **truck** rolls on the physical road.

If the truck switches from driving to flying, the lawyers don't touch the contract at all — the layer that changed (the road) is completely separate from the layer that didn't (the legal content). That's the whole point of a layered network architecture: each layer only has to do its own job.

---

### Why split it into layers at all?

1. **You can change one layer without touching the others.** Swap Wi-Fi for 5G, and your browser doesn't need a single line changed.
2. **Different vendors can interoperate.** Windows, Linux, a Cisco router, and an iPhone all speak the same layered standards.
3. **It makes debugging targeted.** If a cable's unplugged (Layer 1), you're not digging through HTTP payloads (Layer 7) to find the problem.

---

### What data actually looks like at each layer

As data moves down the stack, each layer wraps it in its own header — that's **encapsulation**. On the way back up, each header gets stripped off in reverse — **decapsulation**.

<Diagram>
<Row>
<Box title="Application" accent="#60a5fa">
<Field icon="📄" code="HTTP / JSON data" variant="neutral" />
</Box>
<Arrow label="+ TCP header" />
<Box title="Transport" accent="#34d399">
<Field icon="📦" code="Segment" hint="adds ports, sequence #s" variant="neutral" />
</Box>
<Arrow label="+ IP header" />
<Box title="Network" accent="#f59e0b">
<Field icon="📦" code="Packet" hint="adds source/destination IP" variant="neutral" />
</Box>
<Arrow label="+ MAC header" />
<Box title="Data Link" accent="#a78bfa">
<Field icon="📦" code="Frame" hint="adds MAC addresses + checksum" variant="neutral" />
</Box>
<Arrow label="→ bits" />
<Box title="Physical" accent="#a1a1aa">
<Field icon="⚡" code="0110100..." variant="neutral" />
</Box>
</Row>
</Diagram>

| Layer | What it's called here | What gets added | Protocols |
| :--- | :--- | :--- | :--- |
| 7. Application | Data | Request/response payload | HTTP, DNS, SSH, SMTP |
| 6. Presentation | Data | Formatting, compression, encryption | TLS/SSL, JPEG |
| 5. Session | Data | Session tracking | RPC, Sockets |
| 4. Transport | Segment (TCP) / Datagram (UDP) | Ports, sequence numbers | TCP, UDP, QUIC |
| 3. Network | Packet | Source/destination IP, TTL | IPv4, IPv6, ICMP |
| 2. Data Link | Frame | MAC addresses, checksum | Ethernet, Wi-Fi, ARP |
| 1. Physical | Bits | Raw voltage / light pulses | Cables, radio |

---

### Why the real internet uses 4 layers, not 7

<Diagram>
<Row>
<Box title="OSI — 7 layers (the theory)" accent="#a1a1aa">
<Field icon="7" code="Application" variant="neutral" />
<Field icon="6" code="Presentation" variant="neutral" />
<Field icon="5" code="Session" variant="neutral" />
<Field icon="4" code="Transport" variant="neutral" />
<Field icon="3" code="Network" variant="neutral" />
<Field icon="2" code="Data Link" variant="neutral" />
<Field icon="1" code="Physical" variant="neutral" />
</Box>
<Box title="TCP/IP — 4 layers (what's actually used)" accent="#34d399">
<Field icon="4" code="Application" hint="merges OSI layers 5, 6, 7" variant="public" />
<Field icon="3" code="Transport" variant="public" />
<Field icon="2" code="Internet" variant="public" />
<Field icon="1" code="Network Access" hint="merges OSI layers 1, 2" variant="public" />
</Box>
</Row>
</Diagram>

OSI was designed by a committee before anyone built it. TCP/IP was built directly into working software (ARPANET, BSD Unix) and won because it shipped. In practice, nobody needed separate Session and Presentation layers — compression and encryption just happen in the application itself now.

---

### Say this in the interview

*"The OSI model is the 7-layer theoretical framework; TCP/IP is the 4-layer model the real internet actually runs on. Going down the stack, data gets wrapped at each layer — Application data becomes a Transport Segment (adds ports), a Network Packet (adds IP addresses), a Data Link Frame (adds MAC addresses), and finally raw Physical bits. TCP/IP won because it was built and shipped, while OSI stayed a committee spec."*

---

### Code: watching the layers in action

```python
import socket
import struct

def demonstrate_socket_encapsulation():
    # 1. Application Layer: Construct HTTP Request Data
    http_payload = "GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n"
    print(f"[Application Layer] Created HTTP Payload ({len(http_payload)} bytes)")

    # 2. Transport Layer: OS socket wraps data into TCP Segments with port numbers
    # socket.AF_INET = IPv4 (Network Layer), socket.SOCK_STREAM = TCP (Transport Layer)
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    # 3. Network & Link Layer: Resolves DNS, wraps into IP Packets and Ethernet Frames
    target_host = "example.com"
    target_port = 80
    print(f"[Transport/Network Layer] Connecting to {target_host}:{target_port} via TCP/IP...")
    
    client_socket.connect((target_host, target_port))
    client_socket.sendall(http_payload.encode('utf-8'))
    
    # Receive response through the decapsulation pipeline
    response = client_socket.recv(512)
    print("\n[Application Layer] Received Decapsulated Response:")
    print(response.decode('utf-8', errors='ignore').split('\r\n')[0]) # Status line
    
    client_socket.close()

if __name__ == "__main__":
    demonstrate_socket_encapsulation()
```
