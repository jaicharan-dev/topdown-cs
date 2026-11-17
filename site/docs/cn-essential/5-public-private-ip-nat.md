---
id: 5-public-private-ip-nat
title: "Public vs Private IP & NAT"
description: "One address for a whole building, a receptionist who remembers who asked for what, and the reason IPv4 is still alive"

sidebar_position: 5
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is the difference between a public and a private IP address? How does NAT (specifically NAPT/PAT) work, how did it prevent IPv4 exhaustion, and how do peer-to-peer protocols bypass NAT?"

---

### Picture it

An office building with one street address and four hundred desks.

The postman only knows the street address. Inside, desks are numbered 1 to 400, and those numbers mean nothing to the outside world. Desk 12 exists in a thousand other buildings too, and that is fine, because nobody outside ever uses the number.

So how does a reply reach desk 12? **The receptionist keeps a notebook.**

When desk 12 sends a letter out, the receptionist puts the building's address on it, writes a **reference number** on the envelope, and notes in the book: reference 5841 means desk 12. When a reply arrives quoting reference 5841, she looks it up and walks it to desk 12. Four hundred desks, one street address, and nothing is ever misdelivered as long as the notebook is accurate.

Two consequences fall out of this, and both are the real subject of the question.

**Nobody outside can write to desk 12 first.** There is no reference number yet, so the receptionist has nothing to look up and the letter is discarded. Incoming conversations only work if somebody inside started them, or if the receptionist is given a standing instruction such as "anything for reference 80 goes to the web server in the basement".

**The notebook is the whole system.** If the entry is forgotten, replies stop arriving. And if two desks in two different buildings want to write directly to each other, neither can, because neither knows the other's reference number and neither receptionist has an entry for a conversation that has not started. Solving that is a whole topic of its own.

---

### The proper terms

#### Public versus private addresses

A **public IP address** is **globally unique** and routable on the public internet. It is allocated from **IANA** through the **regional internet registries** to ISPs and organisations, and no two hosts on the internet may hold the same one.

A **private IP address** is unique only within one private network. It is not routable on the internet, and routers on the public internet **drop packets addressed to one**. Because they are never globally visible, the same private address can be reused in millions of networks at once.

The private ranges are fixed by **RFC 1918** and worth memorising:

| Range | CIDR | Size |
| --- | --- | --- |
| 10.0.0.0 to 10.255.255.255 | **10.0.0.0/8** | about 16.7 million |
| 172.16.0.0 to 172.31.255.255 | **172.16.0.0/12** | about 1 million |
| 192.168.0.0 to 192.168.255.255 | **192.168.0.0/16** | 65536 |

Three neighbours come up alongside them: **127.0.0.0/8** is **loopback**, **169.254.0.0/16** is **link-local**, self-assigned when DHCP fails, and **100.64.0.0/10** is reserved for **carrier-grade NAT**.

#### NAT and NAPT

**NAT**, **Network Address Translation**, rewrites addresses in IP headers as packets cross the boundary between a private network and the internet.

**Basic NAT** maps one private address to one public address, which translates addresses but saves none.

**NAPT**, **Network Address Port Translation**, also called **PAT** or **IP masquerading**, is what everyone actually means by NAT. It maps **many private addresses onto one public address** by also rewriting the **port number**, which is why it is sometimes called many-to-one NAT.

The mechanism is a **translation table**. On an outbound packet the router replaces the source address with its own public address and the source port with a **unique port it allocates**, then records the mapping of private address and port to that public port. On the reply, it looks the **destination port** up in the table, rewrites the destination back to the private address and port, and forwards it inward.

Two details are commonly missed. The router must **recompute the IP and TCP or UDP checksums**, because the addresses and ports they cover have changed. And NAT is **stateful**: entries are created on demand and time out, typically in minutes for UDP and much longer for established TCP, which is precisely why idle connections behind NAT die and why protocols send **keep-alives**.

The port field is 16 bits, so one public address supports in the region of 64000 concurrent mappings, which is why a single address can serve a large office.

#### How it postponed IPv4 exhaustion

IPv4 addresses are **32 bits**, giving about **4.3 billion**, and a significant share of those are reserved and unusable. There are far more connected devices than that.

NAT changed the unit of consumption. Instead of **one address per device**, a network needs **one address per site**, with everything behind it sharing. A home with twenty devices consumes one address; an office with a thousand consumes one.

That multiplication is why IPv4 survived long past the point it should have run out. **IANA allocated its last free blocks in February 2011**, and the registries exhausted theirs over the following years, yet most of the internet still runs IPv4 because NAT keeps stretching it.

The price is the loss of the **end-to-end principle**, the original design in which any host could address any other host directly:

**Inbound connections are impossible by default**, requiring **port forwarding** to publish a service.

**Protocols that put addresses in their payload break**, because NAT rewrites headers and not payloads. FTP in active mode and SIP are the classic casualties, which is why routers carry protocol-specific **application-level gateways**.

**Peer-to-peer connections are hard**, since both ends are behind NAT and neither can be addressed first.

**CGNAT** makes all of this worse by putting subscribers behind a second layer of NAT at the ISP, so the customer does not even control the outer translation.

#### How peer-to-peer gets through

Three mechanisms, usually described together because they are used together.

**STUN**, **Session Traversal Utilities for NAT**, lets a host discover its own public mapping. The client sends a request to a public STUN server, which replies with the address and port it saw the request come from. The client now knows its **server-reflexive address**, the thing its NAT chose on its behalf, and can share it with a peer through a **signalling** channel.

Both peers then **send outbound to each other at the same time**, which is **UDP hole punching**. Each outbound packet creates a mapping in its own NAT, so the peer's incoming packet finds an entry waiting and is forwarded instead of dropped. Nothing was opened from outside; both sides opened from inside simultaneously.

**TURN**, **Traversal Using Relays around NAT**, is the fallback for when that fails. A public **relay** server accepts traffic from both peers and forwards it between them, so neither needs an inbound mapping at all. It always works, and it costs the operator bandwidth and adds latency, so it is the last resort.

**ICE**, **Interactive Connectivity Establishment**, is the procedure that chooses. Each peer gathers **candidates**: its **host** addresses, its server-reflexive addresses from STUN, and **relay** candidates from TURN. The candidates are exchanged, every pair is tested with connectivity checks, and the best working pair wins, preferring direct over reflexive over relayed. **WebRTC** is built on exactly this.

The reason TURN cannot be dropped is **symmetric NAT**, which allocates a different external port for each destination. The mapping STUN reported is then useless to the peer, because the peer is a different destination, so hole punching cannot work and a relay is the only option.

---

### In code

```text
NAPT in one table. Three devices, one public address:

  private side                        public side
  192.168.1.10:51200  --------------> 203.0.113.5:40001
  192.168.1.11:51200  --------------> 203.0.113.5:40002
  192.168.1.12:33445  --------------> 203.0.113.5:40003

  reply arrives for 203.0.113.5:40002
      -> look up 40002 -> 192.168.1.11:51200 -> forward inward

  Note 192.168.1.10 and .11 used the SAME private port.
  The router allocated different public ports, which is the
  whole trick: the port disambiguates what the address cannot.
  Checksums are recomputed, because the addresses changed.
```

```text
Why nothing can reach you unasked:

  inbound packet to 203.0.113.5:40009
      -> no entry for 40009 in the table
      -> dropped

  the two ways around it:
      port forwarding     a permanent manual entry
                          "tcp/443 -> 192.168.1.50:443"
      hole punching       both peers create entries from inside,
                          at the same time
```

```text
STUN, then hole punching:

  peer A ----- "what address do you see?" -----> STUN server
  peer A <---- "203.0.113.5:40001" -------------

  peer B ----- "what address do you see?" -----> STUN server
  peer B <---- "198.51.100.9:50002" ------------

  A and B swap those via a signalling server, then both send:

  A --> 198.51.100.9:50002     creates A's NAT mapping
  B --> 203.0.113.5:40001      creates B's NAT mapping

  each packet now finds a mapping waiting on the far side.
  Nothing was opened from outside.
```

```text
ICE candidate preference, and when the relay is unavoidable:

  1. host        192.168.1.10:51200    same network, best
  2. reflexive   203.0.113.5:40001     via STUN, direct across NAT
  3. relay       turn.example:3478     via TURN, always works, slowest

  symmetric NAT: a different external port per destination
      STUN reported 40001 (as seen by the STUN server)
      the peer is a different destination -> gets 40007 instead
      -> the reported mapping is useless -> fall back to TURN
```

---

### What they ask next

**"Is NAT a firewall?"**
Not by design, but it behaves like one in a useful way: unsolicited inbound packets have no table entry and are dropped. That is a side effect of address sharing rather than a security policy, and relying on it as your only protection is a mistake, because it filters nothing about traffic a host initiated.

**"Why does my connection drop when idle?"**
Because NAT state expires. UDP mappings often time out in a minute or two. Long-lived connections send keep-alives purely to refresh the router's table entry.

**"What happens to NAT under IPv6?"**
IPv6 has enough addresses to give every device a globally unique one, so NAT is unnecessary and the end-to-end principle is restored. Firewalling becomes an explicit policy instead of a side effect, which is a cleaner design but means default-deny has to be configured rather than inherited.

**"Why does FTP break behind NAT?"**
Active-mode FTP sends an IP address and port inside the command channel's payload, telling the server where to connect back. NAT rewrites headers, not payloads, so the server is told a private address it cannot reach. Passive mode, where the client initiates the data connection, avoids this.

**"What is CGNAT and why do people complain about it?"**
Carrier-grade NAT puts many subscribers behind one public address at the ISP, using the 100.64.0.0/10 range inside. The subscriber is then behind two layers of NAT, cannot port forward at all, and shares an address reputation with strangers, which is why some sites block or challenge them.

**The common wrong answer** is describing NAT as "hiding your IP address". Hiding is incidental. NAT exists to **share one address among many hosts**, and the port number is what makes the sharing unambiguous.

---

### Say this in the interview

*"A public IP address is globally unique and routable on the internet, allocated from IANA through the regional internet registries. A private IP address is unique only within one network, is not routable, and public routers drop packets addressed to one, which is exactly why the same private address can be reused in millions of networks. The RFC 1918 ranges are 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16, alongside 127.0.0.0/8 for loopback, 169.254.0.0/16 link-local when DHCP fails, and 100.64.0.0/10 for carrier-grade NAT.*

*NAT, network address translation, rewrites addresses in IP headers at the network boundary. Basic NAT is one-to-one and saves nothing. NAPT, network address port translation, also called PAT or IP masquerading, maps many private addresses onto one public address by rewriting the port number as well. On an outbound packet the router replaces the source address with its own and the source port with a unique port it allocates, and records the mapping in a translation table; on the reply it looks up the destination port and rewrites it back to the private address and port. It recomputes the IP and TCP or UDP checksums because the addresses changed, and the mapping is stateful and will time out, which is why idle connections die and protocols send keep-alives. With a 16-bit port field one address supports roughly 64000 concurrent mappings.*

*It postponed IPv4 exhaustion by changing the unit of consumption from one address per device to one address per site. IPv4 is 32 bits, about 4.3 billion addresses, and IANA allocated its last free blocks in February 2011, yet IPv4 still runs most of the internet because NAT keeps stretching it. The cost is the end-to-end principle: inbound connections need port forwarding, protocols that embed addresses in their payload like active FTP and SIP break because NAT rewrites headers and not payloads, which is why routers ship protocol-specific application-level gateways, and peer-to-peer becomes hard.*

*Peer-to-peer gets through with three things. STUN, session traversal utilities for NAT, lets a host ask a public server what address and port it was seen from, so it learns its server-reflexive address and shares it with the peer over a signalling channel. Then both peers send outbound simultaneously, which is UDP hole punching: each outbound packet creates a mapping so the peer's packet finds an entry waiting. TURN, traversal using relays around NAT, is the fallback, a public relay that forwards between both peers so neither needs an inbound mapping, always working but costing bandwidth and latency. ICE, interactive connectivity establishment, is the procedure that gathers host, reflexive and relay candidates, tests every pair and picks the best, preferring direct over reflexive over relayed, and WebRTC is built on it. TURN cannot be dropped because symmetric NAT allocates a different external port per destination, so the mapping STUN reported is useless to the peer."*
