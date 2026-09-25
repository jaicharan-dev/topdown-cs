---
id: 1-osi-model-tcp-ip
title: "OSI Model & TCP/IP: Layered Architecture"
description: "Understand the 7-layer OSI model, Protocol Data Units (PDUs), encapsulation/decapsulation, and why the 4-layer TCP/IP model prevailed in practice."
sidebar_position: 1
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the OSI model, and why do we use a layered architecture? What is the Protocol Data Unit (PDU) at each layer, and how does OSI map onto the 4-layer TCP/IP model actually used in practice?"

Computer networking organizes communication through **Layered Architectures**. The theoretical **OSI 7-Layer Model** provides a conceptual framework for network protocols, while the pragmatic **TCP/IP 4-Layer Model** powers the real-world internet.

---

### The ELI5 Analogy: The Secure Contract Delivery

Imagine a multinational bank sending a secure legal contract to an overseas branch:
- **Application/Presentation/Session:** The legal team drafts the contract, translates it into the recipient's language, and encrypts the document.
- **Transport:** The courier stamps an order number on the envelope, verifying all pages are numbered and none are missing.
- **Network:** The dispatch department glues on the recipient's global postal address and country code.
- **Data Link:** The armored truck driver checks the local street map and navigates between specific neighborhood intersections.
- **Physical:** The truck rolls over the physical asphalt road.

If the truck switches from asphalt to an airplane (**Physical Layer change**), the lawyers don't need to rewrite the legal contract (**Application Layer remains completely untouched**).

---

### Why a Layered Architecture?

1. **Modularity & Separation of Concerns:** Changes at one layer (e.g., swapping Wi-Fi for 5G cellular) do not require rewriting higher-level applications like web browsers or databases.
2. **Standardized Interoperability:** Allows diverse hardware and software vendors (Windows, Linux, Cisco routers, Apple smartphones) to communicate over universal standards.
3. **Targeted Troubleshooting:** Isolates failures. If physical cables are unplugged (Layer 1), network engineers don't waste time debugging application HTTP payloads (Layer 7).

---

### The Core Interview Trap: PDUs & Encapsulation / Decapsulation

Interviewers frequently ask: *"What is the exact name of the data unit at each layer, and what headers are added as data travels down the stack?"*

As data moves down the stack, each layer wraps the payload with its own protocol header (**Encapsulation**). When received, headers are stripped off layer-by-layer (**Decapsulation**):

```
APPLICATION LAYER ───► [ User Data (HTTP, JSON, HTML) ]
                            │
                            ▼ (Encapsulate Transport Header)
TRANSPORT LAYER   ───► [ TCP Header | Data ]                 ==> SEGMENT
                            │
                            ▼ (Encapsulate Network Header)
NETWORK LAYER     ───► [ IP Header | TCP Header | Data ]     ==> PACKET
                            │
                            ▼ (Encapsulate Data Link Header & Trailer)
DATA LINK LAYER   ───► [ MAC Header | IP | TCP | Data | FCS Trailer ] ==> FRAME
                            │
                            ▼ (Modulate to Physical Media)
PHYSICAL LAYER    ───► 01101001 01110100 01100011 01110000   ==> BITS
```

| Layer | Protocol Data Unit (PDU) | Added Information | Key Protocols |
| :--- | :--- | :--- | :--- |
| **7. Application** | **Data** / Message | Application-specific payloads, request headers. | HTTP, DNS, SSH, SMTP |
| **6. Presentation** | **Data** | Data formatting, compression, encryption. | TLS/SSL, ASCII, JPEG |
| **5. Session** | **Data** | Session checkpointing and token tracking. | NetBIOS, RPC, Sockets |
| **4. Transport** | **Segment** (TCP) / **Datagram** (UDP) | Source/Destination Port numbers, Sequence #s. | TCP, UDP, QUIC |
| **3. Network** | **Packet** | Source/Destination logical IP addresses, TTL. | IPv4, IPv6, ICMP, BGP |
| **2. Data Link** | **Frame** | Source/Destination physical MAC addresses, CRC/FCS. | Ethernet, Wi-Fi (802.11), ARP |
| **1. Physical** | **Bits** | Raw electrical voltages, fiber-optic light pulses. | Cables, Radio frequencies |

---

### OSI vs. TCP/IP: Why TCP/IP Won in the Real World

```
OSI 7-LAYER MODEL                      TCP/IP 4-LAYER MODEL
┌──────────────────────┐               ┌──────────────────────┐
│ 7. Application       │ ──┐           │                      │
│ 6. Presentation      │ ──┼──────────►│ 4. Application       │
│ 5. Session           │ ──┘           │    (HTTP, DNS, SSH)  │
├──────────────────────┤               ├──────────────────────┤
│ 4. Transport         │ ─────────────►│ 3. Transport (TCP/UDP)│
├──────────────────────┤               ├──────────────────────┤
│ 3. Network           │ ─────────────►│ 2. Internet (IP)     │
├──────────────────────┤               ├──────────────────────┤
│ 2. Data Link         │ ──┐           │ 1. Network Access /  │
│ 1. Physical          │ ──┴──────────►│    Link (Ethernet)   │
└──────────────────────┘               └──────────────────────┘
```

1. **Pragmatic Implementation vs. Academic Committee:** OSI was developed by an ISO committee before implementation. TCP/IP was built directly in working software on ARPANET and Berkeley Unix (BSD), following the IETF ethos: *"We reject kings, presidents, and voting. We believe in rough consensus and running code."*
2. **Redundant Layers:** In practice, separate Session and Presentation layers proved unnecessary; modern applications handle formatting, compression, and TLS encryption directly in user space.

---

### Summary
"The OSI 7-layer model is a theoretical framework, whereas the TCP/IP 4-layer model is the practical architecture of the internet. Data moves down layers via Encapsulation: Application Data becomes a Transport Segment (ports), a Network Packet (IP addresses), a Data Link Frame (MAC addresses), and Physical Bits. TCP/IP won in production because it prioritized running code over committee bureaucracy."

---

### Code Demonstration: Observing Socket Encapsulation in Python

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
