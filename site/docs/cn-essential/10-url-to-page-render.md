---
id: 10-url-to-page-render
title: "URL to Page Render: The Complete Walkthrough"
description: "Every layer of the stack in one question, from a keystroke to a painted pixel"

sidebar_position: 10
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Walk through everything that happens from the moment a user types a URL into their browser and hits Enter, to the moment the page is fully rendered. Include DNS resolution, the local ARP lookup, TCP 3-way handshake, TLS 1.3 handshake, HTTP request/response cycle, and the browser's Critical Rendering Path."

---

### Picture it

You want a document from an office in another country, and you want it printed and laid out on your desk.

**You check your own drawers first.** You might already have it. Most of the time you do, and the story ends here, which is worth saying out loud because it is the fastest possible outcome and the whole reason caching exists.

**You look up the address**, because you know the company's name and not where it is. You ask around, and the answer comes back as a chain: ask the country directory, then the city directory, then the company.

**Now the strange part, and the part people forget.** You have the address in another country, but you cannot put a package in your own hand and have it appear there. You have to hand it to **the courier at your own front gate**, and to do that you need to know **the gate**, not the destination. So the first thing you actually ask is "who is at my gate?", shouted into the hallway, and somebody answers. The destination address stays written on the package the whole way; the gate just gets the package moving.

**You establish contact.** A short exchange to confirm the far end is really there and listening, then a second exchange to confirm who they are and to agree a seal so nobody along the way can read or alter the contents.

**You ask for the document**, and it arrives.

**Then the real work starts.** The document is not a picture of a page; it is instructions. There is a structure, there is a separate sheet saying how everything should look, and there are notes saying "before you lay this out, run these calculations". You build the structure, apply the styling, work out where everything physically sits on the paper, fill in the ink, and finally stack the transparent sheets on top of one another to get the finished page.

Six stages. The question is a tour of the entire stack, and the shape of a good answer is **naming the layer you are in as you move through it**.

---

### The proper terms

#### Stage 1: the browser, before any network

Several things happen before a single packet.

The browser decides whether the input is a URL or a search query, then parses the URL into **scheme**, **host**, **port**, **path** and **query**.

It checks the **HSTS** list. If the host is on the preload list or has sent **Strict-Transport-Security** before, an `http://` URL is rewritten to `https://` locally, so the insecure request is never made at all.

It then checks whether the response can be served without the network: a registered **service worker** may intercept the request entirely, and the **HTTP cache** may hold a **fresh** response, in which case it is used directly. A **stale** entry triggers a **conditional request** with `If-None-Match` or `If-Modified-Since`, which may come back **304 Not Modified**.

#### Stage 2: DNS resolution

The host must become an IP address. The lookup tries each cache in turn: the browser's own DNS cache, the **OS stub resolver** cache and the **hosts file**, then the configured **recursive resolver**.

On a full miss the resolver performs **iterative** queries: a **root** server refers it to the **TLD** servers, those refer it to the domain's **authoritative** servers, and the authoritative server returns the **A** or **AAAA** record. Everything is cached according to its **TTL**.

Browsers hide much of this latency by issuing DNS prefetch for links on the page.

#### Stage 3: ARP, the local hop

Now the subtle part, and the one that separates a complete answer from a partial one.

The host has an IP address, but a packet is physically sent as an **Ethernet frame**, which is addressed by **MAC address**. So the host consults its **routing table**. If the destination is on the local subnet, the frame goes directly to it; if not, which it is here, it goes to the **default gateway**.

Either way the host needs the MAC address of the next hop, and **ARP**, the **Address Resolution Protocol**, provides it. The **ARP cache** is checked first. On a miss, the host **broadcasts** an ARP request to the whole subnet asking who holds that IP, the owner replies with its MAC, and the answer is cached.

The point most often missed: **ARP resolves the next hop, never the destination server**. The frame's destination MAC is the router's, while the packet's destination IP remains the web server's. At each hop the **MAC addresses are rewritten and the IP addresses are not**, which is the clearest demonstration of Layer 2 being link-local and Layer 3 being end-to-end.

#### Stage 4: the TCP handshake

One round trip, three segments.

The client sends **SYN** with its random **initial sequence number**. The server replies **SYN-ACK**, carrying its own ISN and acknowledging the client's. The client sends **ACK**, and both sides are **ESTABLISHED**.

Cost: one round trip before any application data can be sent.

#### Stage 5: the TLS 1.3 handshake

One more round trip, because TLS 1.3 made the client **guess**.

The client sends **ClientHello** with its supported versions and cipher suites, a **key share** for its guessed group, and **SNI** naming the host, which is still sent in the clear so the server can choose a certificate.

The server replies with **ServerHello** and its own **key share**, after which both sides can derive the shared secret with **ECDHE**, so everything that follows is **encrypted**, including the **certificate** and the server's **Finished**.

The client validates the certificate: the **chain of trust** to a root it already holds, the **hostname** against the certificate's names, the **validity dates**, and revocation. It then sends its **Finished** and may send application data immediately.

Cost: one round trip. TLS 1.2 would have needed two. A resumed session can use a **pre-shared key** for **0-RTT**, which is restricted to idempotent requests because that data is replayable.

So on a cold connection the budget before a single byte of HTML is roughly **DNS, then 1 RTT for TCP, 1 for TLS, and 1 for the request**. QUIC collapses the TCP and TLS round trips into one, which is the main reason HTTP/3 feels faster on first load.

#### Stage 6: the HTTP request and response

The client sends a **request line**, `GET / HTTP/1.1`, the mandatory **Host** header, and headers for **Accept**, **Accept-Encoding**, **User-Agent** and **Cookie**.

The server, often reached through a **reverse proxy** or **CDN edge**, returns a **status line**, response headers such as **Content-Type**, **Content-Encoding** and the caching directives, and the body, typically compressed with **gzip** or **Brotli**.

Two details worth naming: the response is **streamed**, so the browser begins parsing before the body has fully arrived, and **103 Early Hints** can tell the client what to fetch before the main response is even ready.

#### Stage 7: the critical rendering path

This is the browser's own pipeline, and the stages are asked about by name.

**HTML is parsed into the DOM.** The parser tokenises incrementally as bytes arrive, building the **Document Object Model** tree.

**CSS is parsed into the CSSOM.** The **CSS Object Model** must be complete before anything can be rendered, because a later rule can override an earlier one, so CSS is render-blocking.

**JavaScript blocks the parser.** A plain `<script>` stops HTML parsing, because the script may call `document.write`. It also waits for pending CSS, since it may query computed styles. **`defer`** runs it after parsing, and **`async`** runs it whenever it arrives, and both let parsing continue. Meanwhile the **preload scanner** scans ahead for subresources and starts fetching them even while the parser is blocked.

**The render tree is built** by combining the DOM with the CSSOM, excluding nodes that are not rendered, such as `display: none` and `<head>`.

**Layout**, also called **reflow**, computes the exact geometry: the size and position of every box, in device pixels.

**Paint** fills in the pixels, producing a set of **layers** rather than one flat image.

**Compositing** combines the layers in the right order, on the **GPU** where possible, and puts the result on screen. This is why `transform` and `opacity` animate smoothly: they can be handled entirely in compositing, skipping layout and paint.

Afterwards, subresources continue loading, `DOMContentLoaded` fires when the DOM is parsed and deferred scripts have run, and `load` fires when all subresources are done. The user-visible milestones are **FCP**, first contentful paint, and **LCP**, largest contentful paint.

---

### In code

```text
The whole journey, with the layer named at each step:

  0. BROWSER      parse URL, HSTS upgrade to https,
                  service worker? HTTP cache fresh? -> maybe done here

  1. DNS          browser cache -> OS cache + hosts -> resolver
     (app layer)  resolver: root -> TLD -> authoritative -> A record

  2. ROUTING      is the destination on my subnet? no -> default gateway
     (layer 3)

  3. ARP          "who has 192.168.1.1?"   broadcast
     (layer 2)    "192.168.1.1 is at aa:bb:cc:dd:ee:ff"
                  -> next-hop MAC, NOT the server's MAC

  4. TCP          SYN -> SYN-ACK -> ACK                        1 RTT
     (layer 4)

  5. TLS 1.3      ClientHello + key share + SNI
                  ServerHello + key share, {cert, Finished}
                  Finished + application data                  1 RTT

  6. HTTP         GET / HTTP/1.1, Host: ...
     (layer 7)    200 OK, Content-Type, Content-Encoding, body

  7. RENDER       HTML -> DOM, CSS -> CSSOM, JS runs,
                  render tree -> layout -> paint -> composite
```

```text
What the frame looks like on the first hop, and why ARP is needed:

  the packet the browser wants to send:
      dst IP  = 93.184.216.34        the web server, far away
      src IP  = 192.168.1.10         this machine

  the frame it must actually be put in:
      dst MAC = aa:bb:cc:dd:ee:ff    the ROUTER, one metre away
      src MAC = 11:22:33:44:55:66    this machine

  at every hop:  MAC addresses are REWRITTEN
                 IP addresses are UNCHANGED

  Layer 2 is link-local. Layer 3 is end-to-end. ARP bridges them.
```

```text
The round trip budget on a cold load:

  TCP + TLS 1.3 over TCP                 TLS 1.2
    SYN ->                                 SYN ->
    <- SYN-ACK                             <- SYN-ACK
    ACK + ClientHello ->                   ACK + ClientHello ->
    <- ServerHello, {cert}                 <- ServerHello, cert, ...
    Finished + GET ->                      ClientKeyExchange ->
    <- 200 OK                              <- Finished
                                           GET ->
    ~3 RTT to first byte                   <- 200 OK
                                           ~4 RTT to first byte

  QUIC / HTTP/3
    Initial (crypto + key share) ->
    <- handshake
    GET ->
    <- 200 OK                              ~2 RTT, transport and
                                           crypto handshakes merged
```

```text
The critical rendering path, and what blocks what:

  bytes -> tokens -> DOM  ----+
                              |
  CSS   -------->  CSSOM  ----+--> render tree --> layout --> paint
                                      (display:none excluded)        |
                                                                     v
                                                              composite (GPU)

  blocking rules that matter:
    CSS           render-blocking    nothing paints until it is parsed
    <script>      parser-blocking    stops the DOM build, waits on CSS too
    defer         runs after parsing, in order
    async         runs on arrival, order not guaranteed
    preload scan  fetches subresources even while the parser is blocked

  transform / opacity animate on the compositor alone,
  which is why they are smooth: no layout, no paint.
```

---

### What they ask next

**"Why is ARP needed if we already have the IP address?"**
Because the IP address cannot be put on the wire. Physical delivery on a link uses MAC addresses, so the sender needs the MAC of the **next hop**, which is the gateway for anything off-subnet. The server's own MAC is never known to the client and never needs to be.

**"Which caches might stop this before any packet is sent?"**
A service worker, the HTTP cache if the entry is fresh, and the back-forward cache on navigation. If the entry is stale, a conditional request may still avoid transferring the body, returning 304.

**"Why is TLS 1.3 one round trip when 1.2 needed two?"**
Because the client sends a key share in its very first message instead of waiting to be told which group the server supports. TLS 1.3 reduced the supported groups to a small set, so the guess is almost always right, and the server can respond with everything needed to complete the handshake.

**"What makes CSS render-blocking but images not?"**
Because any CSS rule may override an earlier one, so painting before the CSSOM is complete risks showing wrong styles and then repainting, which is visibly worse. An image affects only its own box, so the page can render around it.

**"What is the difference between reflow and repaint?"**
Reflow recomputes geometry and is the expensive one, since it may cascade to other elements. Repaint only redraws pixels within existing geometry. Changing `width` forces reflow; changing `color` forces only repaint; changing `transform` or `opacity` can be handled in compositing alone.

**"Where is the biggest latency win on a cold load?"**
Cutting round trips before the first byte. A CDN shortens every one of them by putting the TCP and TLS handshakes a short distance away, HTTP/3 merges the transport and crypto handshakes, and HSTS preload removes the redirect that would otherwise cost an extra one.

**"What is SNI, and what does it leak?"**
The hostname sent in the clear in ClientHello so a server with many certificates can choose the right one. It reveals which site is being visited even under HTTPS, which is what encrypted client hello addresses.

**The common wrong answer** is jumping from DNS straight to the TCP handshake. Skipping **ARP** and the routing decision misses the clearest illustration in the whole question of how Layer 2 and Layer 3 divide the work.

---

### Say this in the interview

*"Before any packet, the browser parses the URL into scheme, host, port, path and query, checks HSTS and rewrites http to https locally if the host is preloaded or has sent Strict-Transport-Security, then checks whether a service worker or a fresh HTTP cache entry can answer without the network. A stale entry becomes a conditional request that may return 304 Not Modified.*

*Then DNS. It tries the browser's DNS cache, the OS stub resolver and the hosts file, then the configured recursive resolver. On a full miss the resolver does iterative queries: a root server refers it to the TLD servers, they refer it to the authoritative servers, and the authoritative server returns the A or AAAA record, all cached by TTL.*

*Next the local hop, which is the part people skip. The host has an IP address but it travels as an Ethernet frame addressed by MAC address, so it consults its routing table, finds the destination is off-subnet, and targets the default gateway. It needs the gateway's MAC, so it checks its ARP cache and on a miss broadcasts an Address Resolution Protocol request asking who holds that IP. The key point is that ARP resolves the next hop and never the destination server: the frame's destination MAC is the router's while the packet's destination IP stays the web server's, and at every hop the MACs are rewritten and the IPs are not.*

*Then the TCP handshake: SYN with a random initial sequence number, SYN-ACK with the server's ISN acknowledging the client's, then ACK, and both sides are ESTABLISHED. One round trip.*

*Then the TLS 1.3 handshake, also one round trip, because the client guesses. ClientHello carries versions, cipher suites, a key share and SNI, which is still cleartext so the server can pick a certificate. ServerHello carries the server's key share, after which both derive the secret with ECDHE and everything after that is encrypted, including the certificate and Finished. The client validates the chain of trust, the hostname, the validity dates and revocation, then sends Finished and can send data immediately. A resumed session can use a pre-shared key for 0-RTT, limited to idempotent requests because it is replayable.*

*Then HTTP: a request line, the mandatory Host header, and Accept, Accept-Encoding, User-Agent and Cookie. The response, often from a reverse proxy or CDN edge, carries a status line, Content-Type, Content-Encoding and caching directives, and a body compressed with gzip or Brotli. It is streamed, so parsing starts before the body finishes arriving, and 103 Early Hints can tell the client what to fetch before the main response is ready.*

*Finally the critical rendering path. HTML is tokenised into the DOM, the Document Object Model, incrementally. CSS is parsed into the CSSOM, the CSS Object Model, which is render-blocking because a later rule can override an earlier one. A plain script tag blocks the parser and also waits on pending CSS, while defer and async let parsing continue, and the preload scanner fetches subresources even while the parser is blocked. The DOM and CSSOM combine into the render tree, excluding display:none. Layout, or reflow, computes every box's size and position. Paint fills pixels into layers, and compositing combines the layers on the GPU, which is why transform and opacity animate smoothly, since they skip layout and paint. DOMContentLoaded fires when parsing and deferred scripts are done and load when all subresources are, and the user-visible metrics are FCP, first contentful paint, and LCP, largest contentful paint.*

*The budget on a cold load is DNS plus one round trip for TCP, one for TLS and one for the request, so about three to first byte. QUIC merges the transport and crypto handshakes into one, which is the main reason HTTP/3 helps most on a first load."*
