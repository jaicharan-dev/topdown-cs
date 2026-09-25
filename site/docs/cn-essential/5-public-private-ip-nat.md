---
id: 5-public-private-ip-nat
title: "Public vs Private IP & NAT"
description: "Understand public vs private IP addresses, NAT/NAPT port multiplexing, IPv4 address exhaustion, and NAT traversal (STUN, TURN, ICE)."
sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a public and a private IP address? How does NAT (specifically NAPT/PAT) work, how did it prevent IPv4 exhaustion, and how do peer-to-peer protocols bypass NAT?"

Because IPv4 addresses are limited to 32 bits ($\approx 4.3$ billion addresses), the explosive growth of connected devices would have depleted global address space decades ago. **Private IP Addresses** combined with **Network Address Translation (NAT)** saved the internet from address exhaustion.

---

### The ELI5 Analogy: The Corporate PBX Switchboard

- **Public IP (Main Headquarters Phone Number):** Listed in the global telephone book. Anyone in the world can dial `+1-800-555-0199` to reach the company.
- **Private IP (Desk Extension):** Inside the building, employees use internal extensions (e.g., `Ext. 104`). Extension 104 only works internally. Another company in another city can have their own `Ext. 104` without conflict.
- **NAT Router (The PBX Receptionist):** When employee Ext. 104 dials an external client, the receptionist connects the call through the main public phone line. When the client replies, the receptionist checks their routing log and forwards the call to desk 104.

---

### Technical Breakdown: Public vs. Private IPs

```
                       RFC 1918 PRIVATE IP SUBNETS
┌──────────────────────┬────────────────────────────────┬────────────────────────┐
│ Class A              │ 10.0.0.0    - 10.255.255.255   │ /8 (16.7M addresses)   │
│ Class B              │ 172.16.0.0  - 172.31.255.255   │ /12 (1.04M addresses)  │
│ Class C              │ 192.168.0.0 - 192.168.255.255  │ /16 (65,536 addresses) │
│ Loopback (Localhost) │ 127.0.0.1   - 127.255.255.255  │ /8 (Local machine)     │
└──────────────────────┴────────────────────────────────┴────────────────────────┘
```

- **Public IPs:** Globally unique, routable on the public internet, assigned by Internet Service Providers (ISPs) under the authority of IANA.
- **Private IPs:** Defined by **RFC 1918**. Non-routable on the internet. Routers on the public internet immediately drop any packet with a private destination IP. This allows billions of homes and offices to reuse `192.168.1.1` simultaneously without collisions.

---

### How NAT Works: Network Address Port Translation (NAPT / PAT)

Most modern NAT routers use **Port Address Translation (PAT)**, multiplexing thousands of internal private IP sockets through a **single public IP**:

```
INTERNAL LAN (Private)               NAT ROUTER                  PUBLIC INTERNET
[ Laptop: 192.168.1.5:45120 ] ──► [ Translates to:        ] ──► [ Web Server: 93.184.216.34:443 ]
[ Phone:  192.168.1.9:45120 ] ──► [ 203.0.113.10:60001   ] ──►
                                  [ 203.0.113.10:60002   ]
```

1. **Outbound Packet:** A laptop (`192.168.1.5:45120`) sends an HTTP request to Google (`142.250.190.46:443`).
2. **NAT Table Entry:** The router rewrites the source IP with its own **Public IP** (`203.0.113.10`) and assigns an ephemeral source port (`61001`):
   $$\text{NAT Mapping: } (192.168.1.5, 45120) \longleftrightarrow (203.0.113.10, 61001)$$
3. **Inbound Reply:** Google responds to `203.0.113.10:61001`. The router inspects its NAT table, translates the destination back to `192.168.1.5:45120`, and forwards the packet onto the local Wi-Fi.

---

### The Senior Interview Trap: NAT Traversal in Peer-to-Peer (WebRTC)

Interviewers frequently ask: *"If Alice and Bob are both behind home NAT routers, neither has a public IP. How can they establish a direct Peer-to-Peer (P2P) voice or video connection in WebRTC or Zoom?"*

Because NAT routers drop inbound connection attempts from unknown IPs, P2P protocols use the **ICE (Interactive Connectivity Establishment)** framework:

```
┌────────────────────────────────────────────────────────┐
│               NAT TRAVERSAL ARCHITECTURE               │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      [ STUN SERVER ]             [ TURN RELAY SERVER ]
      Public Reflector            Fallback Data Relay
      "What is my public IP:port?"  Relays media when symmetric
                                  NAT blocks direct P2P.
```

1. **STUN (Session Traversal Utilities for NAT):** A public server. Alice asks STUN: *"What public IP and port did my router assign to my outbound packet?"* Alice and Bob exchange these public endpoints over an out-of-band signaling server to perform "hole punching."
2. **TURN (Traversal Using Relays around NAT):** If aggressive corporate firewalls or symmetric NATs block direct P2P connections, traffic is routed through a public **TURN Relay Server**.

---

### Summary
"Public IPs are globally unique and routable; private IPs (RFC 1918) are locally unique and non-routable. NAT multiplexes private devices onto a single public IP using port translation (PAT), solving IPv4 exhaustion. Because external devices cannot initiate connections to private IPs, P2P systems (WebRTC) rely on STUN hole punching and TURN relays to traverse NATs."

---

### Code Demonstration: Discovering Private vs. Public IP in Python

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
