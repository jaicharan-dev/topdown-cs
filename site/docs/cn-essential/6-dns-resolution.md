---
id: 6-dns-resolution
title: "DNS Resolution: Caches, Root, TLD & Authoritative"
description: "Nobody holds the whole phonebook, so the lookup is a chain of people telling you who to ask next"

sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk through what happens when a browser resolves a domain to an IP address. What is the cache hierarchy, how do Root, TLD, and Authoritative servers interact, what are the primary DNS record types, and what is BGP Anycast?"

---

### Picture it

You are in a vast office and you need the extension number for a person called Patel in the Mumbai branch.

**First you check what you already know.** Your own notepad. Then the sticky note on your monitor. Then the shared list your team keeps. Three checks, all free, and most of the time one of them has the answer and you are done. This is not a detail: the overwhelming majority of lookups end here.

**If none of them know, you ask the front desk.** And the front desk does something specific: it does **not** know Patel's extension, and it does **not** pretend to. It says "Mumbai branch is handled by the India directory, here is their number". The India directory says "Mumbai office keeps its own list, here is their number". The Mumbai office says "Patel is extension 4471".

Notice the shape of that. Nobody in the chain knew the answer except the last one, and the first two did not go and find out for you. They each told you **who to ask next**. The chain is short because it is organised by how the name itself is structured, reading from the back: India, then Mumbai, then Patel.

And once you have it, you write it on your notepad with a note saying how long to trust it, because you will probably call Patel again this afternoon.

One more thing, and it is the clever part. The front desk's number is printed in every phone book in the world, and it is the same number everywhere. Dial it from Tokyo and you reach a desk in Tokyo. Dial it from Berlin and you reach a desk in Berlin. Same number, nearest desk.

---

### The proper terms

#### The cache hierarchy

Resolution is attempted at each level in order, and it stops at the first hit. Each level is a cache except the last.

**The browser cache.** Browsers keep their own short-lived DNS cache, typically for a minute or so, independent of the operating system.

**The OS cache and the hosts file.** The **stub resolver** in the operating system keeps a cache, and consults `/etc/hosts`, or the Windows equivalent, which overrides DNS entirely. This is why a hosts entry beats everything.

**The recursive resolver's cache.** The resolver configured for the machine, usually the ISP's or a public one such as 8.8.8.8 or 1.1.1.1, holds the largest and most valuable cache because it serves many clients.

Only on a miss at every level does real resolution begin, and the thing that governs all of it is the **TTL**, the time to live, set by the zone owner on each record.

**Negative answers are cached too.** An **NXDOMAIN** is cached for a period derived from the zone's **SOA** record, so a typo is not re-queried across the whole chain each time.

#### Recursive and iterative, which are not the same thing

This distinction is the one interviewers are usually probing.

The client asks a **recursive query**: "give me the final answer, do the work". It asks this of its **recursive resolver**, and it asks exactly once.

The resolver then performs **iterative queries**: it asks a series of servers, each of which returns either an answer or a **referral** to servers closer to the answer, and the resolver follows the chain itself.

So the **client** makes one recursive request, and the **resolver** makes several iterative ones. Authoritative servers do not recurse on anyone's behalf; they answer only for what they hold, and refer for the rest.

#### Root, TLD and authoritative

**Root nameservers** sit at the top of the hierarchy, serving the root zone. There are **13 root server addresses**, named `a.root-servers.net` through `m.root-servers.net`, a limit that came from fitting the full list into a single 512-byte UDP response. A resolver finds them from a **root hints** file and refreshes the list with a **priming query** at startup.

The root knows **nothing about example.com**. It knows which servers are authoritative for `.com`, and returns a referral to them.

**TLD nameservers** serve a top-level domain, or **TLD**: `.com`, `.org`, `.uk`, `.io`. They hold the **NS records** that say which nameservers are authoritative for each domain registered under them, so they also return a referral rather than an address.

**Authoritative nameservers** hold the actual zone file for the domain and give the real answer. An answer from them is flagged **authoritative**; the same answer from a cache is not.

Names are resolved **right to left**, because that is the direction in which the hierarchy narrows. The trailing dot in `www.example.com.` is the root, usually left implicit.

#### Walking through one resolution

For `www.example.com` with every cache cold:

1. The browser checks its own cache. Miss.
2. The OS stub resolver checks its cache and the hosts file. Miss.
3. The stub sends one **recursive query** to the configured resolver. Miss in its cache, so it starts work.
4. The resolver asks a **root server** for `www.example.com`. The root replies with a referral: the NS records for `.com`, plus their addresses as **glue records**.
5. The resolver asks a **`.com` TLD server**. It replies with a referral: the NS records for `example.com`.
6. The resolver asks an authoritative server for `example.com`. It replies with the **A record**, authoritatively.
7. The resolver caches the answer for its TTL and returns it to the stub, which caches it and hands it to the browser.

Steps 4 to 6 are the iterative part, and in practice steps 4 and 5 are usually skipped because the referrals themselves are cached for a long time.

#### The record types that matter

| Type | Holds | Notes |
| --- | --- | --- |
| **A** | an IPv4 address | the common case |
| **AAAA** | an IPv6 address | "quad A" |
| **CNAME** | an alias to another name | the resolver then resolves that name |
| **MX** | a mail server, with a **priority** | lower priority value is preferred |
| **NS** | the authoritative nameservers for a zone | what referrals are made of |
| **SOA** | **start of authority**: zone metadata | serial, refresh, and the negative-caching TTL |
| **TXT** | arbitrary text | **SPF**, **DKIM**, domain verification |
| **PTR** | a name for an address | **reverse DNS**, used in mail checks |
| **SRV** | the host and **port** for a named service | one of the few records carrying a port |
| **CAA** | which certificate authorities may issue | checked by CAs, not by clients |

Two **CNAME** restrictions are favourite follow-ups. A CNAME **cannot coexist with other records at the same name**, and it cannot exist at the zone apex, so `example.com` itself cannot be a CNAME. That is why providers invented non-standard **ALIAS** or **ANAME** records, which resolve the target server-side and publish the result as an A record.

#### BGP Anycast

**Anycast** means **one IP address announced from many physical locations at once**.

Each location advertises the same prefix into **BGP**, and because BGP's job is to pick a route to a prefix, every client's traffic naturally travels to whichever instance is **topologically nearest**. No client does anything special, and no DNS trickery is involved: the routing system performs the selection.

This is how 13 root server addresses become well over a thousand actual servers worldwide, and how 8.8.8.8 and 1.1.1.1 answer quickly from anywhere.

Three benefits:

**Lower latency**, because the nearest instance answers.

**Load distribution**, since queries spread across instances by geography rather than by a balancer.

**DDoS resilience**, because an attack is absorbed by the instances near its sources rather than concentrating on one site. This is the reason the root servers have survived repeated attacks.

The caveat is why anycast suits DNS so well. If routing changes mid-conversation, packets land on a **different instance with no memory of the exchange**. That is harmless for a single-datagram UDP query and fatal for a long-lived stateful connection, which is why anycast is used heavily for DNS and for CDN edge entry points, and why anycast TCP needs care.

---

### In code

```text
Where the answer can come from, cheapest first:

  browser cache            microseconds, ~1 minute TTL
  OS stub resolver cache   microseconds
  /etc/hosts               overrides DNS entirely
  recursive resolver cache a few milliseconds, serves many clients
  -------------------------------------------- the caches end here
  root -> TLD -> authoritative     tens to hundreds of milliseconds

  Most lookups never cross that line.
```

```text
One cold resolution of www.example.com:

  stub ---- recursive query: "www.example.com, give me the answer"
            ----> RECURSIVE RESOLVER
                     |
                     |-- iterative: ask a ROOT server
                     |   <-- referral: "ask the .com servers"  (NS + glue)
                     |
                     |-- iterative: ask a .com TLD server
                     |   <-- referral: "ask ns1.example.com"   (NS)
                     |
                     |-- iterative: ask ns1.example.com
                     |   <-- ANSWER: A 93.184.216.34  (authoritative)
                     |
            <---- answer, cached for its TTL

  The client makes ONE recursive query.
  The resolver makes SEVERAL iterative ones.
  Root and TLD never answer; they only refer.
```

```text
Why the lookup reads right to left:

  www  .  example  .  com  .
   |         |        |     |
   |         |        |     +-- root            (the implicit trailing dot)
   |         |        +-------- TLD servers
   |         +----------------- authoritative for the zone
   +--------------------------- a record inside that zone

  The hierarchy narrows from the right, so resolution follows it.
```

```text
Anycast: one address, many locations, BGP decides

  203.0.113.10 announced from Tokyo, Frankfurt, Sao Paulo

  client in Osaka    --- BGP picks the nearest route --> Tokyo
  client in Munich   --- BGP picks the nearest route --> Frankfurt
  client in Lima     --- BGP picks the nearest route --> Sao Paulo

  Same address everywhere. No DNS trickery, no load balancer:
  the routing system does the choosing.

  caveat: a route change mid-exchange lands you on an instance
  with no memory of it. Fine for one UDP query, fatal for a
  long-lived stateful connection.
```

---

### What they ask next

**"What is the difference between a recursive and an iterative query?"**
A recursive query asks for the final answer and expects the server to do the work. An iterative query accepts a referral as a valid reply. The client sends one recursive query; the resolver sends iterative queries up the chain.

**"Why are there only 13 root servers?"**
There are 13 **addresses**, not 13 machines. The limit came from fitting the whole list into a 512-byte UDP response alongside their glue records. Anycast means each address is served by many instances, so there are over a thousand physical root servers.

**"Why can the zone apex not be a CNAME?"**
Because a CNAME must be the only record at its name, while the apex is required to have SOA and NS records. They cannot coexist, which is why providers offer ALIAS or ANAME records that do the indirection on the server side.

**"What does TTL actually control?"**
How long any cache may keep the answer. It is the knob you turn before a migration: lower it to a few minutes beforehand, change the record, then raise it again. Lowering it on the day of the change is too late, because caches are already holding the old value for the old TTL.

**"Why does DNS use UDP, and when does it use TCP?"**
A query and reply fit one small datagram, so a handshake would dominate the cost. It falls back to TCP when the response exceeds what the client can accept, and for zone transfers. **EDNS0** raised the practical UDP size beyond the old 512-byte limit, which matters now that **DNSSEC** signatures make responses larger.

**"Is DNS encrypted?"**
Not traditionally, which is why **DoT**, DNS over TLS, and **DoH**, DNS over HTTPS, exist. They encrypt the query between client and resolver. Note what they do not do: the resolver still sees every query, so this is protection from the network, not from the resolver.

**The common wrong answer** is "the root server tells you the IP". The root does not know it. The value of the design is that **no server holds the whole phonebook**, and each level only knows who to ask next, which is what lets the system scale to hundreds of millions of domains.

---

### Say this in the interview

*"Resolution tries a chain of caches and stops at the first hit. The browser has its own short-lived DNS cache, then the OS stub resolver's cache and the hosts file, which overrides DNS entirely, then the recursive resolver's cache, which is the most valuable because it serves many clients. Everything is governed by the TTL on each record, and negative answers like NXDOMAIN are cached too, for a period taken from the zone's SOA record.*

*The distinction that matters is recursive versus iterative. The client sends one recursive query to its resolver, meaning do the work and give me the final answer. The resolver then performs iterative queries, where each server returns either an answer or a referral to servers closer to it, and the resolver follows the chain itself.*

*For a cold lookup of www.example.com, the resolver asks a root server, which knows nothing about example.com and returns a referral to the .com nameservers with their glue records. It asks a .com TLD server, which returns the NS records for example.com. It asks the authoritative server, which returns the A record authoritatively. The resolver caches it for the TTL and answers the client. There are 13 root server addresses, a through m, limited by fitting the list in a 512-byte UDP response, and resolvers find them from a root hints file with a priming query. Names resolve right to left because the hierarchy narrows from the right.*

*The main record types are A for IPv4, AAAA for IPv6, CNAME for an alias, MX for mail servers with a priority where lower is preferred, NS for a zone's nameservers, SOA, start of authority, for zone metadata and the negative-caching TTL, TXT for things like SPF and DKIM, PTR for reverse DNS, SRV for a service's host and port, and CAA for which certificate authorities may issue. A CNAME cannot coexist with other records at the same name and cannot sit at the zone apex, which is why providers invented ALIAS and ANAME records.*

*BGP anycast is announcing one IP address from many locations at once. Each location advertises the same prefix into BGP, so every client's traffic routes to the topologically nearest instance with no client-side logic at all. That gives lower latency, load distribution by geography, and DDoS resilience because attacks are absorbed near their sources, which is how 13 root addresses become over a thousand servers. The caveat is that a route change mid-exchange lands you on a different instance with no memory of it, which is harmless for one UDP query and fatal for a long-lived stateful connection, so it suits DNS particularly well."*
