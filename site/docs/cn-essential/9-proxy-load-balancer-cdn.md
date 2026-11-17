---
id: 9-proxy-load-balancer-cdn
title: "Forward Proxy, Reverse Proxy, Load Balancer & CDN"
description: "Four middlemen that look alike on a diagram, told apart by whose side they are on"

sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Explain the fundamental differences between a forward proxy, a reverse proxy, and a load balancer. How does Layer 4 differ from Layer 7 load balancing? Why is consistent hashing crucial for distributed caching, and how does a CDN fit into modern web scale?"

---

### Picture it

Four middlemen, and the only question that separates the first two is **whose side they are on**.

**A forward proxy is your assistant.** You tell your assistant to go and buy something. The shop deals with your assistant and never learns who you are. Your assistant can also refuse to buy things you are not allowed to have, and can say "you already asked for that yesterday, here it is" without going to the shop at all. You had to be told to use the assistant; it was your arrangement.

**A reverse proxy is the shop's receptionist.** You walk into the shop, and a receptionist meets you at the door. You never go into the back, never learn how many staff there are or where they sit. The receptionist handles the formalities, turns people away, keeps copies of the most-requested items at the desk, and passes the rest inside. You were not told about the receptionist; you simply arrived, and she was the shop as far as you could tell.

Both stand between you and the shop. One was hired by you, one by the shop. That is the entire distinction, and every other difference follows from it.

**A load balancer is a receptionist with a specific job:** deciding which of the staff in the back gets your request, and noticing when one of them has gone home sick so nobody is sent to their desk.

**A CDN is the same shop with branches in every city**, each holding the popular stock, so almost nobody has to travel to head office. The branch nearest you answers, and head office only gets involved for things no branch has.

---

### The proper terms

#### Forward proxy

A **forward proxy** sits in front of **clients** and acts **on behalf of the client**.

The server sees the proxy's address, not the client's. Clients must be **explicitly configured** to use it, through system settings, a browser setting, or **PAC** auto-configuration.

Its uses are all client-side concerns: **egress filtering** and policy enforcement in a corporate network, **caching** shared across users, **anonymity**, access logging and auditing, and bypassing geographic restrictions.

#### Reverse proxy

A **reverse proxy** sits in front of **servers** and acts **on behalf of the server**.

The client believes it is talking to the real server, because DNS points at the proxy and no client configuration exists. It is **transparent** to clients, which is the mirror image of a forward proxy.

Its jobs are server-side concerns: **TLS termination**, so certificates and the cost of decryption live in one place; **caching** and **compression**; **request routing** by host or path; security, including **rate limiting** and a **WAF**; hiding the internal topology; and load balancing. Nginx, HAProxy and Envoy are the usual implementations.

#### Load balancer

A **load balancer** distributes incoming traffic across multiple backends, and the clean way to state the relationship is that **a load balancer is a specialised reverse proxy**, while a reverse proxy need not balance anything.

What distinguishes it is **health checking**: it probes backends, removes failing ones from rotation and returns them when they recover. Without that, distribution is pointless, because a share of traffic goes to a dead server.

The common algorithms:

**Round robin**, each backend in turn, with **weighted** variants for unequal machines.

**Least connections**, which suits long-lived or uneven requests far better than round robin.

**Least response time**, combining connection count with measured latency.

**IP hash** or **consistent hashing**, which gives **session affinity**, sending the same client to the same backend.

#### Layer 4 versus Layer 7

**Layer 4 load balancing** operates on **TCP and UDP**. It sees **IP addresses and ports** and nothing else, forwarding connections without inspecting the payload. It may rewrite addresses or use **direct server return**, where replies bypass the balancer entirely.

Because it reads almost nothing, it is **fast**, cheap in CPU, low in added latency, and **protocol-agnostic**, so it balances anything, encrypted or not. The limitation is that a **connection is bound to one backend for its whole life**, and routing decisions cannot depend on content.

**Layer 7 load balancing** **terminates the connection** and parses the application protocol, usually HTTP.

That unlocks everything content-dependent: routing by **hostname, path, header or cookie**; **TLS termination**; caching; compression; header rewriting; retrying a failed request on another backend, which Layer 4 cannot do because it never knows a request failed; and per-request balancing, so each request on a connection may go to a different backend.

That last point matters more than it used to. HTTP/2 multiplexes many requests onto **one connection**, so a Layer 4 balancer pins all of them to one backend and the load becomes lumpy. A Layer 7 balancer spreads the individual requests.

The costs are CPU for parsing and decryption, added latency, and the need to hold the certificate and see the plaintext.

In practice both are used together: Layer 4 at the edge for raw volume and DDoS absorption, Layer 7 behind it for routing.

#### Consistent hashing

The problem is caused by the obvious approach. To spread keys over **N** cache nodes you compute `hash(key) % N`.

Then **N changes**, because a node is added or one fails, and almost **every key maps to a different node**. The cache is effectively emptied all at once, every request misses, and the origin is hit by the full load, which is a **thundering herd** that often takes the origin down. The outage is caused by the remapping, not by the failed node.

**Consistent hashing** fixes the blast radius. Both **nodes and keys** are hashed into the same large space, visualised as a **ring**. A key belongs to the first node found **clockwise** from the key's position.

Now add or remove a node and only the keys between that node and its predecessor move. On average `K/N` keys are remapped rather than nearly all of them, and crucially **the rest of the cache stays valid**.

Two refinements. Hashing nodes onto the ring once gives **uneven distribution**, so each physical node is placed at many points as **virtual nodes**, typically in the hundreds, which evens out the shares and also spreads a failed node's keys across all the survivors instead of dumping them on one neighbour. **Bounded-load** variants cap how much any node may take, to prevent one hot key overwhelming its owner.

Its uses go well beyond caches: memcached client libraries, **Dynamo** and **Cassandra** partitioning, CDN edge cache selection, and sharding of any kind.

#### CDN

A **CDN**, **content delivery network**, is a globally distributed set of reverse-proxy caches at **points of presence** near users.

What it buys you:

**Latency**, because distance is a hard floor. Content served from 20 kilometres away cannot be beaten by an optimisation at an origin 8000 kilometres away.

**Origin offload.** Cache hits never reach the origin, so a traffic spike is absorbed by the edge, and an **origin shield** layer consolidates misses so the origin sees one request rather than one per PoP.

**DDoS absorption**, since attack traffic is spread across a network far larger than any single origin.

**Faster TLS**, because the handshake's round trips happen over a short path to the edge, and the edge-to-origin connection is already warm.

How requests reach the nearest PoP is either **DNS-based**, where the authoritative server answers with the closest edge's address, or **BGP anycast**, where one address is announced from every location. What is cached is governed by **cache-control** headers and the **TTL**, keyed by a **cache key** derived from the URL and chosen headers, and changed content is handled by **purging** or by **versioned URLs**, which are preferred because they never need invalidating.

Modern CDNs also carry dynamic traffic, terminating TLS at the edge and proxying uncacheable requests over optimised backbone paths, and increasingly run code at the edge.

---

### In code

```text
Who hired the middleman:

  FORWARD PROXY, hired by the client
    [client] -> [forward proxy] -----> internet -> [server]
       ^ configured to use it            server sees the proxy's IP

  REVERSE PROXY, hired by the server
    [client] -> internet -> [reverse proxy] -> [app server]
                   ^ DNS points here             client never sees it

  LOAD BALANCER, a reverse proxy that also chooses and health-checks
    [client] -> [load balancer] --+--> [app 1]  healthy
                                  +--> [app 2]  healthy
                                  +--X  app 3   failed check, removed

  CDN, reverse proxies everywhere at once
    [client in Lagos]  -> [edge PoP Lagos]  --+
    [client in Oslo]   -> [edge PoP Oslo]   --+--> [origin]
                           cache hits stop here    misses only
```

```text
Layer 4 vs Layer 7, by what each one can see:

  LAYER 4 sees:   src ip:port -> dst ip:port         that is all
      can:        balance connections, very fast, any protocol
      cannot:     route on URL or cookie, retry a failed request,
                  split one connection's requests across backends

  LAYER 7 sees:   GET /api/orders HTTP/1.1
                  Host: shop.example.com
                  Cookie: session=abc
      can:        route by host, path, header or cookie;
                  terminate TLS; cache; compress; retry;
                  balance per request, not per connection
      costs:      CPU, latency, and it holds the plaintext

  Why per-request matters now: HTTP/2 puts 100 requests on ONE
  connection, so Layer 4 pins all 100 to one backend.
```

```text
Why modulo hashing collapses, and consistent hashing does not:

  hash(key) % N, with 4 nodes, then one fails:

     key "user:42"   hash 1007   1007 % 4 = 3  -> node 3
                                 1007 % 3 = 2  -> node 2   MOVED
     key "user:43"   hash 1008   1008 % 4 = 0  -> node 0
                                 1008 % 3 = 0  -> node 0   stayed
     ...in general ~75% of all keys move.
     Every moved key is a cache miss -> thundering herd on the origin.

  Consistent hashing, nodes and keys on one ring:

            0 ------------------ A ----------- k1 -- B ---------+
            |                                                   |
            +-- D --- k3 ------------ C ------- k2 -------------+

     each key belongs to the first node CLOCKWISE
       k1 -> B,  k2 -> D,  k3 -> C

     remove C: only k3 moves, to D. k1 and k2 are untouched.
     On average K/N keys move, and the rest of the cache stays valid.

     virtual nodes: place each physical node at ~200 ring points,
     so shares are even and a failure spreads over all survivors
     rather than landing on one neighbour.
```

---

### What they ask next

**"Is a reverse proxy the same as a load balancer?"**
A load balancer is a reverse proxy with distribution and health checking as its purpose. A reverse proxy in front of a single backend, doing TLS termination and caching, balances nothing and is still a reverse proxy.

**"When would you choose Layer 4 over Layer 7?"**
When you need raw throughput with minimal latency, when the protocol is not HTTP, when you must not decrypt the traffic, or at the very edge for volume and DDoS absorption. Choose Layer 7 whenever the routing decision depends on the content of the request.

**"What is TLS termination, and what is the downside?"**
The proxy decrypts the client's TLS and may talk to backends in plaintext or re-encrypt. It centralises certificates and takes the crypto load off backends, but the proxy becomes a point where traffic is in the clear, so the hop behind it should be re-encrypted in untrusted networks.

**"Why are virtual nodes needed?"**
Because hashing a handful of nodes onto a ring gives wildly uneven arcs, so load is unbalanced. Placing each node at many points averages the arcs out, and it also means a failed node's keys are spread over all the remaining nodes rather than inherited entirely by one.

**"How do you invalidate CDN content?"**
Either by purging, which is an explicit API call and takes time to propagate across every PoP, or by changing the URL, which versioned or content-hashed filenames do automatically. The second is strongly preferred, because a new URL has no cache entry to invalidate.

**"What does an origin shield do?"**
It adds a middle caching tier between the edges and the origin, so a miss at fifty PoPs becomes one request to the origin instead of fifty. It directly reduces origin load on cold or long-tail content.

**The common wrong answer** is separating forward and reverse proxies by what they do, since both terminate, cache and filter. The distinction is **direction**: a forward proxy represents the **client** and must be configured by it, and a reverse proxy represents the **server** and is invisible to the client.

---

### Say this in the interview

*"All three are middlemen, and the distinction is whose side they are on. A forward proxy sits in front of clients and acts on behalf of the client, so the server sees the proxy's address, and clients must be explicitly configured to use it, through system settings or PAC. It is used for corporate egress filtering, shared caching, anonymity and auditing.*

*A reverse proxy sits in front of servers and acts on behalf of the server. DNS points at it, so it is transparent to clients, and it handles TLS termination, caching, compression, request routing, security such as rate limiting and a WAF, and it hides the internal topology. Nginx, HAProxy and Envoy are the usual ones.*

*A load balancer is a specialised reverse proxy whose purpose is distributing traffic, and what really distinguishes it is health checking, removing failing backends and returning them when they recover. Algorithms include round robin and weighted round robin, least connections, which suits uneven requests far better, least response time, and IP hash or consistent hashing for session affinity.*

*Layer 4 balancing works on TCP and UDP and sees only IP addresses and ports, so it is fast, cheap and protocol-agnostic, and it can use direct server return. The limits are that a connection is bound to one backend for its life and no decision can depend on content. Layer 7 terminates the connection and parses HTTP, so it can route by hostname, path, header or cookie, terminate TLS, cache, compress, and retry a failed request, which Layer 4 cannot do because it never knows a request failed. It also balances per request rather than per connection, which matters because HTTP/2 multiplexes a hundred requests onto one connection and Layer 4 would pin them all to one backend. The cost is CPU, latency and holding the plaintext. In practice you use Layer 4 at the edge and Layer 7 behind it.*

*Consistent hashing matters because the naive approach, hash of the key modulo N, remaps almost every key when N changes. One node failing empties the cache, every request misses, and the origin takes a thundering herd that often brings it down, so the outage comes from the remapping rather than the failure. Consistent hashing puts both nodes and keys on a hash ring and assigns each key to the first node clockwise, so adding or removing a node moves only K over N keys on average and the rest of the cache stays valid. Virtual nodes place each physical node at many ring points, which evens out uneven distribution and spreads a failed node's keys across all survivors instead of one neighbour, and bounded-load variants cap how much any node takes. The same technique partitions Dynamo and Cassandra and selects CDN edge caches.*

*A CDN, a content delivery network, is a globally distributed set of reverse-proxy caches at points of presence near users. It buys latency, because distance is a hard floor no origin optimisation beats; origin offload, with an origin shield consolidating misses so the origin sees one request rather than one per PoP; DDoS absorption across a network larger than any origin; and faster TLS, since the handshake round trips happen over a short path. Requests reach the nearest PoP by DNS-based selection or BGP anycast, caching is governed by cache-control and TTL against a cache key derived from the URL and chosen headers, and invalidation is by purging or, preferably, by versioned URLs that never need invalidating."*
