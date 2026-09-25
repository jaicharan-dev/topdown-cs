---
id: 6-dns-resolution
title: "DNS Resolution: Caches, Root, TLD & Authoritative"
description: "Explore the end-to-end DNS lookup process, cache hierarchy, Root/TLD/Authoritative nameservers, BGP Anycast, and core DNS record types."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk through what happens when a browser resolves a domain to an IP address. What is the cache hierarchy, how do Root, TLD, and Authoritative servers interact, what are the primary DNS record types, and what is BGP Anycast?"

The **Domain Name System (DNS)** functions as the global phonebook of the internet, mapping human-readable hostnames (such as `example.com`) to machine-routable IP addresses (`93.184.216.34`).

---

### The 4-Tier DNS Cache Hierarchy

Before any query touches the public internet, the operating system attempts to satisfy the lookup locally through a sequential hierarchy of caches governed by **Time-To-Live (TTL)** values:

```
[ Browser Cache ] ──► [ OS DNS Cache & /etc/hosts ] ──► [ Local Router Cache ] ──► [ ISP / Recursive Resolver ]
   (Chrome, Safari)       (getaddrinfo, nscd)             (Home Wi-Fi Gateway)       (8.8.8.8 / 1.1.1.1)
```

1. **Browser Cache:** Modern browsers cache DNS mappings for short durations (e.g., 60 seconds) to avoid OS context switches.
2. **OS Client Cache:** If missed, the kernel checks its DNS client resolver cache and the static local **`hosts` file** (`/etc/hosts` or `C:\Windows\System32\drivers\etc\hosts`).
3. **Local Router Gateway Cache:** The home/office router typically caches DNS responses from previous requests on the local network.
4. **Recursive Resolver (ISP / Public DNS):** The query exits the LAN and hits the configured recursive resolver (e.g., Cloudflare `1.1.1.1` or Google `8.8.8.8`). If cached, it returns the IP immediately.

---

### The Full Resolution Pipeline (Iterative Chain)

If all four caches miss, the Recursive Resolver initiates an iterative lookup across the global DNS hierarchy:

```
                      ┌──────────────────────────────────────────────┐
                      │          1. Ask: Where is example.com?       │
                      ▼                                              │
               [ ROOT NAMESERVER ]                                   │
               Returns: Referral to .com TLD                         │
                      │                                              │
                      ├──────────────────────────────────────────────┤
                      │          2. Ask: Where is example.com?       │
                      ▼                                              │
               [ TLD NAMESERVER (.com) ]                             │
               Returns: Referral to Authoritative Server             │
                      │                                              │
                      ├──────────────────────────────────────────────┤
                      │          3. Ask: What is the A record?       │
                      ▼                                              ▼
         [ AUTHORITATIVE NAMESERVER ] ──────────────────► [ RECURSIVE RESOLVER ]
         Returns: 93.184.216.34 (TTL=3600)                 Caches & returns to client
```

1. **Root Nameserver Query:** The resolver queries one of the **13 logical root server clusters** worldwide. The root server does not know the final IP, but returns a referral to the **Top-Level Domain (TLD) Nameservers** for `.com`.
2. **TLD Nameserver Query:** The resolver queries the `.com` TLD server (managed by registries like Verisign). It replies with a referral to the specific **Authoritative Nameservers** delegated by the domain owner (e.g., AWS Route53 or Cloudflare).
3. **Authoritative Nameserver Query:** The authoritative server holds the actual zone files. It answers with the final IP address (e.g., `A 93.184.216.34`), which the resolver caches and returns to the client.

#### Recursive vs. Iterative Queries:
- **Recursive Query (Client $\to$ Resolver):** The client demands a complete answer or an error; the client does no further work.
- **Iterative Query (Resolver $\to$ Nameservers):** The nameservers reply with referrals: *"I don't know the final IP, but go ask this other server."*

---

### Core DNS Record Types

| Record Type | Name | Purpose | Example |
| :--- | :--- | :--- | :--- |
| **`A`** | Address | Maps a hostname to a 32-bit **IPv4 address**. | `example.com -> 93.184.216.34` |
| **`AAAA`** | Quad-A | Maps a hostname to a 128-bit **IPv6 address**. | `example.com -> 2606:2800:220:1:248:1893:25c8:1946` |
| **`CNAME`** | Canonical Name | Maps an alias hostname to another hostname. | `www.example.com -> example.com` |
| **`MX`** | Mail Exchange | Directs emails to mail servers with priority weights. | `10 mail.example.com` |
| **`TXT`** | Text | Stores arbitrary metadata (SPF, DKIM, DMARC, SSL domain validation). | `"v=spf1 include:_spf.google.com ~all"` |
| **`NS`** | Nameserver | Delegates a DNS zone to authoritative nameservers. | `ns1.cloudflare.com` |

---

### The Staff Differentiator: BGP Anycast Routing

A classic bar-raiser question: *"Why are there only 13 logical root server IP addresses (`a.root-servers.net` to `m.root-servers.net`), and how can 13 servers survive all global traffic?"*

1. **The 13-Server Limit:** Originally imposed by the legacy 512-byte UDP DNS packet size limit (RFC 1035) so all 13 addresses fit in a single response datagram.
2. **The Anycast Solution:** While there are only 13 IP addresses, there are over **1,500 physical server installations** worldwide. Using **BGP Anycast**, hundreds of physical data centers announce the exact same IP address. Internet routers route a user's DNS query to the topologically closest physical server, distributing load and delivering DDoS resilience.

---

### Summary
"DNS maps human domain names to IP addresses. It checks a 4-tier cache hierarchy (Browser $\to$ OS $\to$ Router $\to$ Resolver). If uncached, the recursive resolver performs iterative queries to Root, TLD, and Authoritative nameservers. Record types include A (IPv4), AAAA (IPv6), CNAME (aliases), MX (mail), and TXT (verification). BGP Anycast distributes 13 logical root IPs across thousands of servers worldwide."

---

### Code Demonstration: Resolving Multiple DNS Records in Python

```python
import socket

def perform_dns_lookup(domain):
    print(f"--- Resolving DNS for: {domain} ---")
    
    # 1. Resolve IPv4 (A Record)
    try:
        ipv4_addresses = socket.gethostbyname_ex(domain)[2]
        print(f"A Records (IPv4):    {', '.join(ipv4_addresses)}")
    except socket.gaierror as e:
        print(f"IPv4 lookup failed: {e}")

    # 2. Resolve IPv6 (AAAA Record) via getaddrinfo
    try:
        addr_info = socket.getaddrinfo(domain, None, socket.AF_INET6)
        ipv6_addresses = set([item[4][0] for item in addr_info])
        print(f"AAAA Records (IPv6): {', '.join(ipv6_addresses)}")
    except socket.gaierror:
        print("AAAA Records (IPv6): None found")

if __name__ == "__main__":
    perform_dns_lookup("google.com")
```
