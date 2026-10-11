---
id: 10-url-to-page-render
title: "URL to Page Render: The Complete Walkthrough"
description: "Everything that happens between typing a URL and seeing the page: DNS, ARP, the TCP and TLS 1.3 handshakes, the HTTP round trip, and the browser's render pipeline."
sidebar_position: 10
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Walk through everything that happens from the moment a user types a URL into their browser and hits Enter, to the moment the page is fully rendered. Include DNS resolution, the local ARP lookup, TCP 3-way handshake, TLS 1.3 handshake, HTTP request/response cycle, and the browser's Critical Rendering Path."

This is the classic "walk me through what happens" question. It's really just six smaller steps stacked together — once you know each one individually, stringing them together is easy. Here's the first half: getting the actual response back.

<Diagram>
<Row>
<Box title="1. Pre-flight" accent="#a1a1aa"><Field icon="🔍" code="parse URL, check HSTS + cache" variant="neutral" /></Box>
<Arrow />
<Box title="2. DNS" accent="#60a5fa"><Field icon="📍" code="resolve hostname → IP" variant="neutral" /></Box>
<Arrow />
<Box title="3. ARP" accent="#f59e0b"><Field icon="🔗" code="find the gateway's MAC" variant="neutral" /></Box>
<Arrow />
<Box title="4. TCP + TLS" accent="#818cf8"><Field icon="🤝" code="handshake, encrypt tunnel" variant="neutral" /></Box>
<Arrow />
<Box title="5. HTTP" accent="#34d399"><Field icon="📦" code="request, response HTML" variant="public" /></Box>
</Row>
</Diagram>

---

### Phase 1: Before any network call happens

1. **Parse the URL** — split it into protocol (`https`), hostname (`example.com`), port (`443`), path (`/`).
2. **Check HSTS** — if the browser's HSTS list says this site always requires HTTPS, it rewrites any `http://` to `https://` before sending a single packet. This stops an attacker from downgrading you to plaintext.
3. **Check the local cache** — if the browser already has this exact resource cached and it's still fresh (`Cache-Control: max-age`), it skips the network entirely.

---

### Phase 2: DNS — turning the name into an IP

The browser needs an IP address to actually connect to. It checks caches first (browser → OS → router), and if all of those miss, the recursive resolver walks the DNS hierarchy: ask the Root nameserver, get pointed to the `.com` TLD nameserver, get pointed to the domain's authoritative nameserver, get the actual IP back. (This chain is covered in full in the [DNS resolution](./6-dns-resolution) page — the short version: Root knows who to ask next, TLD knows who to ask next, Authoritative actually knows the answer.)

---

### Phase 3: the step most people forget — ARP

Here's a detail that trips people up: knowing the destination's IP address isn't enough to send anything. To put a packet on the wire, your machine needs the **MAC address** of whatever it's handing the packet to next — and almost always, that's your local router, not the destination server.

1. The OS compares the destination IP against its own subnet. `93.184.216.34` isn't on your local network, so the packet has to go to your **default gateway** (your router, e.g. `192.168.1.1`).
2. It checks its **ARP cache** for the router's MAC address.
3. If that's a miss, it broadcasts: *"Who has 192.168.1.1? Tell 192.168.1.50."* The router replies with its MAC address.
4. The OS wraps the IP packet inside an Ethernet frame addressed to that MAC address and sends it out over Wi-Fi or the NIC.

---

### Phase 4: TCP and TLS 1.3 handshakes

Two handshakes happen back-to-back, each taking one round trip:

**TCP (establishes a reliable connection):**
- Client sends `SYN` with a random starting sequence number.
- Server replies `SYN-ACK`, acknowledging that number and sending its own.
- Client sends `ACK`. Connection is now open.

**TLS 1.3 (establishes an encrypted tunnel):**
- Client sends `ClientHello` plus its key share (a Diffie-Hellman public value).
- Server replies with its own key share, its certificate, and a `Finished` message.
- Both sides now have the same symmetric key, derived independently — the tunnel is live after just this one round trip.

---

### Phase 5: the actual HTTP exchange

1. The browser sends an HTTP/2 request over the now-encrypted tunnel.
2. It usually doesn't hit the application server directly first — it passes through an **L4 load balancer** (routes raw TCP packets to a healthy node) and then an **L7 reverse proxy** (decrypts TLS, checks auth, routes the path to the right service).
3. The application does its work — queries a cache or database — and sends back `200 OK` with the HTML.

---

### Phase 6: turning that HTML into pixels — the Critical Rendering Path

Once HTML bytes start arriving, the browser doesn't wait for the whole document — it starts building incrementally.

<Diagram>
<Row>
<Box title="HTML bytes" accent="#60a5fa"><Field icon="📄" code="tokenized" variant="neutral" /></Box>
<Arrow label="builds" />
<Box title="DOM" accent="#34d399"><Field icon="🌳" code="document tree" variant="neutral" /></Box>
<Arrow label="+ CSSOM" />
<Box title="Render Tree" accent="#f59e0b"><Field icon="🎨" code="visible nodes only" variant="neutral" /></Box>
<Arrow />
<Box title="Layout" accent="#818cf8"><Field icon="📐" code="compute coordinates" variant="neutral" /></Box>
<Arrow />
<Box title="Paint" accent="#ec4899"><Field icon="🖌️" code="rasterize to pixels" variant="neutral" /></Box>
<Arrow />
<Box title="Composite" accent="#a1a1aa"><Field icon="🖥️" code="GPU layers → screen" variant="public" /></Box>
</Row>
</Diagram>

1. **DOM construction** — raw bytes become characters, then tokens, then nodes: the DOM. A plain `<script src="...">` tag **halts** this process — the parser must stop and go run that script, because JS can rewrite the page via `document.write` or DOM APIs. `defer` (run after parsing finishes) and `async` (run the instant it downloads) exist specifically to avoid this stall.
2. **CSSOM construction** — stylesheets get parsed into the CSS Object Model. CSS is render-blocking on purpose: the browser won't paint anything until CSSOM is complete, so you never see a flash of unstyled content.
3. **Render tree** — DOM and CSSOM get merged, dropping anything invisible (`<head>`, `<script>`, `display: none`). Note `visibility: hidden` elements *do* stay in — they still take up space, just don't draw.
4. **Layout (reflow)** — the browser computes exact size and position for every visible node.
5. **Paint** — layout boxes become actual pixels: text, colors, borders, shadows.
6. **Composite** — the GPU stacks separately-painted layers (ones promoted via `transform` or `will-change`) into the final image in the right order.

---

### Say this in the interview

*"Six phases. First, the browser parses the URL, checks HSTS, and checks its own cache. Second, it resolves the hostname to an IP through DNS — caches first, then a recursive resolver walking Root → TLD → Authoritative if needed. Third — a step people often skip — since the destination is off-subnet, the OS needs the local router's MAC address, which it gets via ARP, to even put a packet on the wire. Fourth, it opens a TCP connection (1 RTT) and layers a TLS 1.3 handshake on top (another 1 RTT) to get an encrypted tunnel. Fifth, it sends the HTTP request, which usually passes through an L4 load balancer and an L7 reverse proxy before hitting the actual application, and gets HTML back. Sixth, the browser renders that HTML: parse into a DOM, parse CSS into a CSSOM, merge them into a render tree, compute layout, paint pixels, and composite GPU layers into what you actually see."*

---

### Code: measuring each network phase's latency

```python
import socket
import ssl
import time

def measure_url_breakdown(hostname: str, path: str = "/"):
    print(f"[*] Profiling connection phases for https://{hostname}{path}...")

    # Phase 1: DNS Resolution Time
    t0 = time.perf_counter()
    ip_address = socket.gethostbyname(hostname)
    dns_time = (time.perf_counter() - t0) * 1000

    # Phase 2: TCP Handshake Time (Layer 4)
    raw_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    raw_socket.settimeout(5.0)
    t1 = time.perf_counter()
    raw_socket.connect((ip_address, 443))
    tcp_time = (time.perf_counter() - t1) * 1000

    # Phase 3: TLS Handshake Time (Layer 5/6)
    context = ssl.create_default_context()
    t2 = time.perf_counter()
    tls_socket = context.wrap_socket(raw_socket, server_hostname=hostname)
    tls_time = (time.perf_counter() - t2) * 1000

    # Phase 4: HTTP Request & Time to First Byte (TTFB)
    http_request = f"GET {path} HTTP/1.1\r\nHost: {hostname}\r\nConnection: close\r\n\r\n"
    t3 = time.perf_counter()
    tls_socket.sendall(http_request.encode('utf-8'))
    first_byte = tls_socket.recv(1)
    ttfb = (time.perf_counter() - t3) * 1000

    tls_socket.close()

    total_network_time = dns_time + tcp_time + tls_time + ttfb

    print(f"\n[+] Network Latency Breakdown:")
    print(f"    1. DNS Resolution : {dns_time:6.2f} ms (Resolved to {ip_address})")
    print(f"    2. TCP Handshake  : {tcp_time:6.2f} ms")
    print(f"    3. TLS Handshake  : {tls_time:6.2f} ms")
    print(f"    4. TTFB (Wait)    : {ttfb:6.2f} ms")
    print(f"    ------------------------------------")
    print(f"    Total Connection  : {total_network_time:6.2f} ms")

if __name__ == "__main__":
    measure_url_breakdown("www.google.com")
```
