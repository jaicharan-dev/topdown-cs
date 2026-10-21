---
id: 5-public-private-ip-nat
title: "Public vs Private IP & NAT"
description: "Understand public vs private IP addresses, NAT/NAPT port multiplexing, IPv4 address exhaustion, and NAT traversal (STUN, TURN, ICE)."
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow } from '@site/src/components/SimpleDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a public and a private IP address? How does NAT (specifically NAPT/PAT) work, how did it prevent IPv4 exhaustion, and how do peer-to-peer protocols bypass NAT?"

IPv4 only has about 4.3 billion addresses. The world has way more devices than that. Private IPs plus NAT are the reason the internet didn't run out of addresses decades ago.

---

### The analogy: a company's switchboard

- **Public IP = the company's main phone number.** It's in the global phone book — anyone can dial it.
- **Private IP = an employee's desk extension.** `Ext. 104` only works inside the building. A different company in a different city can also have an `Ext. 104` — no conflict, because it's never visible from outside.
- **The NAT router = the receptionist.** When Ext. 104 calls out, the receptionist routes the call through the one public line. When the reply comes back, the receptionist checks the log and connects it back to desk 104.

---

### Public vs. private IPs

Private IP ranges are reserved by RFC 1918 and never routed on the public internet — routers simply drop any packet addressed to one. That's exactly why millions of homes can all use `192.168.1.1` at once without clashing.

| Range | Size |
| :--- | :--- |
| `10.0.0.0 – 10.255.255.255` | /8 — 16.7M addresses |
| `172.16.0.0 – 172.31.255.255` | /12 — 1.04M addresses |
| `192.168.0.0 – 192.168.255.255` | /16 — 65,536 addresses |
| `127.0.0.1 – 127.255.255.255` (loopback) | /8 — local machine only |

**Public IPs** are globally unique and assigned by ISPs under IANA — routable anywhere on the internet.

---

### How NAT actually works (NAPT / PAT)

Most home and office routers use **Port Address Translation**, which maps thousands of private IP:port combinations onto a single public IP by juggling port numbers.

<Diagram>
<Row>
<Box label="Private IP" sub="192.168.1.5:45120" />
<Arrow label="NAT rewrites" />
<Box label="Public IP" sub="203.0.113.10:61001" />
</Row>
</Diagram>

1. **Outbound:** the laptop at `192.168.1.5:45120` sends a request to a web server.
2. **Translation:** the router swaps the source address for its own public IP, and picks a free port — say `61001` — then stores the mapping: `(192.168.1.5, 45120) ↔ (203.0.113.10, 61001)`.
3. **Inbound reply:** the reply comes back addressed to `203.0.113.10:61001`. The router looks up that mapping and forwards it to `192.168.1.5:45120` on the LAN.

---

### The trap question: how do two people behind NAT talk directly?

If Alice and Bob are both behind home routers, neither has a public IP to give the other. Since NAT routers drop unsolicited inbound packets, they can't just connect directly. This is what **ICE (Interactive Connectivity Establishment)** solves, using two kinds of helper servers:

<Diagram>
<Row>
<Box label="STUN" sub="reveals your public address" />
<Box label="TURN" sub="relay fallback" />
</Row>
</Diagram>

1. **STUN:** Alice asks a public STUN server "what public IP and port did my router just use for me?" She and Bob swap those answers over a separate signaling channel, then try connecting straight to each other — this is called "hole punching."
2. **TURN:** if a strict firewall or a "symmetric" NAT blocks that direct connection, traffic instead gets relayed through a public TURN server — slower, but it always works.

---

### Say this in the interview

*"Private IPs (RFC 1918) are only unique inside a local network and are never routed on the internet. NAT lets a router share one public IP across many private devices by rewriting source IP and port on the way out, and tracking the mapping to route replies back in — that's what saved IPv4 from running out of addresses. Because NAT blocks unsolicited inbound connections, peer-to-peer apps like WebRTC use STUN to discover each side's public address for hole punching, and fall back to a TURN relay when that's blocked."*

---

### Code: discovering private vs. public IP in Python

```python
import socket
import urllib.request
import json

def get_ip_details():
    # 1. Discover local Private IP (within LAN)
    # Connecting to an external UDP address extracts the active LAN interface IP
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually transmit packets; just routes to determine interface
        s.connect(("8.8.8.8", 80))
        private_ip = s.getsockname()[0]
    finally:
        s.close()
        
    print(f"Local Private IP (RFC 1918): {private_ip}")

    # 2. Discover Public IP via NAT (queries an external public reflection service)
    try:
        req = urllib.request.urlopen("https://api.ipify.org?format=json", timeout=3)
        public_ip = json.loads(req.read().decode())['ip']
        print(f"External Public IP (Post-NAT): {public_ip}")
    except Exception as e:
        print(f"Failed to fetch public IP: {e}")

if __name__ == "__main__":
    get_ip_details()
```
