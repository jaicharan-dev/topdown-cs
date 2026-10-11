---
id: 6-dns-resolution
title: "DNS Resolution: Caches, Root, TLD & Authoritative"
description: "How a browser turns a domain name into an IP address: the cache hierarchy, Root/TLD/Authoritative nameservers, BGP Anycast, and the core DNS record types."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk through what happens when a browser resolves a domain to an IP address. What is the cache hierarchy, how do Root, TLD, and Authoritative servers interact, what are the primary DNS record types, and what is BGP Anycast?"

DNS is the internet's phonebook. You know a name (`example.com`), you need a number (`93.184.216.34`), and DNS is the lookup that gets you there.

---

### First, it checks caches — nobody wants to ask the internet every time

Before any request leaves your machine, four layers of cache get checked in order, because asking a remote server for something you already know is wasteful:

1. **Browser cache** — Chrome/Safari remember recent lookups for about a minute.
2. **OS cache** — the operating system has its own resolver cache, plus the static `hosts` file (`/etc/hosts` or the Windows equivalent).
3. **Router cache** — your home/office router remembers answers from other devices on the same network.
4. **Recursive resolver** — your ISP's resolver, or a public one like `1.1.1.1` or `8.8.8.8`. If *it* has the answer cached, you get it back immediately.

Only if all four miss does DNS actually go hunt down the answer.

---

### If everything misses: the resolver asks around

Think of the recursive resolver as someone with no idea where you live, asking for directions in stages: first "which country?", then "which city?", then "which street?". Each answer narrows things down until the final one is the actual address.

<Diagram>
<Row>
<Box title="Recursive Resolver" accent="#60a5fa"><Field icon="🔍" code="Where is example.com?" variant="neutral" /></Box>
<Arrow label="asks" />
<Box title="Root Nameserver" accent="#a1a1aa"><Field icon="📍" code={'"try the .com servers"'} variant="neutral" /></Box>
<Arrow label="asks" />
<Box title="TLD Nameserver (.com)" accent="#f59e0b"><Field icon="📍" code={'"try example.com’s own NS"'} variant="neutral" /></Box>
<Arrow label="asks" />
<Box title="Authoritative Nameserver" accent="#34d399"><Field icon="✅" code="93.184.216.34" variant="public" /></Box>
</Row>
</Diagram>

1. **Root nameserver** — doesn't know the IP, but knows which servers handle `.com` and sends the resolver there.
2. **TLD nameserver** (`.com`, run by registries like Verisign) — doesn't know the IP either, but knows which nameservers the domain owner delegated to, and points there.
3. **Authoritative nameserver** — this one actually holds the records for `example.com` and answers with the real IP. The resolver caches this answer (for as long as the TTL says) and hands it back to you.

Each hop in this chain is a **referral**, not a full answer — that's called an **iterative query** ("I don't know, ask this other server"). Your original request to the resolver, by contrast, is a **recursive query** — you just want the final answer and don't care how many hops it takes to get there.

---

### Core DNS record types

| Record Type | Name | Purpose | Example |
| :--- | :--- | :--- | :--- |
| **`A`** | Address | Hostname → IPv4 address | `example.com -> 93.184.216.34` |
| **`AAAA`** | Quad-A | Hostname → IPv6 address | `example.com -> 2606:2800:220:1:248:1893:25c8:1946` |
| **`CNAME`** | Canonical Name | Alias hostname → another hostname | `www.example.com -> example.com` |
| **`MX`** | Mail Exchange | Where to deliver email, with priority | `10 mail.example.com` |
| **`TXT`** | Text | Arbitrary metadata (SPF, DKIM, domain verification) | `"v=spf1 include:_spf.google.com ~all"` |
| **`NS`** | Nameserver | Delegates a zone to its authoritative servers | `ns1.cloudflare.com` |

---

### Why there are only 13 root servers — and how that's not a bottleneck

A good follow-up question to expect: *"If there are only 13 root server addresses, how do they handle all the world's DNS traffic without falling over?"*

The 13-address limit is historical — it comes from the old 512-byte UDP packet limit (RFC 1035), which needed all 13 addresses to fit in a single response. But "13 addresses" doesn't mean 13 machines. Using **BGP Anycast**, over 1,500 physical servers around the world all answer to the same 13 IP addresses. Your query gets routed to whichever physical server is network-closest to you, so the load is spread globally and any single location going down barely matters.

---

### Say this in the interview

*"DNS resolves domain names to IPs. It checks four cache layers first — browser, OS, router, resolver — before doing any real lookup. If all miss, the recursive resolver walks the hierarchy: Root tells it which TLD server to ask, the TLD server tells it which authoritative server to ask, and the authoritative server returns the actual IP. BGP Anycast is what lets just 13 root server addresses handle global traffic — each address is actually answered by over a thousand physical servers, and routing sends you to the nearest one."*

---

### Code: resolving DNS records in Python

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
