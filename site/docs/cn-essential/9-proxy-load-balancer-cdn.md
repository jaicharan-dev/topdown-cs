---
id: 9-proxy-load-balancer-cdn
title: "Forward Proxy, Reverse Proxy, Load Balancer & CDN"
description: "What forward proxies, reverse proxies, load balancers, and CDNs actually each do, Layer 4 vs Layer 7 load balancing, and why consistent hashing matters."
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Tree } from '@site/src/components/SimpleDiagram';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Explain the fundamental differences between a forward proxy, a reverse proxy, and a load balancer. How does Layer 4 differ from Layer 7 load balancing? Why is consistent hashing crucial for distributed caching, and how does a CDN fit into modern web scale?"

All four of these things are "middlemen" sitting between a client and a server. The simplest way to tell them apart: **who are they protecting?**

---

### Forward proxy: protects the client

Picture a company's outbound internet traffic all going through one gatekeeper. That's a forward proxy — it sits in front of a pool of clients (like everyone on a company network), and every outbound request goes through it first. It hides each client's real IP, enforces content filtering, logs what left the building, and can route around geo-blocks. From the destination server's point of view, it only ever sees the proxy — never the actual client.

### Reverse proxy: protects the server

This is the mirror image — it sits in front of backend servers instead of in front of clients. It hides which actual machine handled your request, terminates TLS, does auth/rate-limiting centrally, and caches responses. The client only ever talks to the reverse proxy; it has no idea which backend server actually did the work.

### Load balancer: a reverse proxy whose job is spreading the load

A load balancer is really just a reverse proxy with one specific goal: distribute incoming requests across a pool of backend instances so no single one gets overwhelmed, and route around any instance that's failing a health check.

### CDN: reverse proxy edges, close to the user

A CDN is a globally distributed set of reverse-proxy nodes (points of presence) that cache static content — HTML, images, video, JS/CSS — physically close to users, so requests don't have to cross oceans to reach the origin server every time.

<Diagram>
<Row>
<Box label="Client" />
<Arrow label="protects client" />
<Box label="Forward Proxy" />
<Arrow />
<Box label="CDN Edge" />
<Arrow />
<Box label="Load Balancer" />
<Arrow label="protects server" />
<Box label="Backend" />
</Row>
</Diagram>

---

### Layer 4 vs. Layer 7 load balancing

The difference comes down to how much of the request the load balancer actually looks at.

- **Layer 4** only sees IP addresses and TCP/UDP ports — it forwards packets blind, without opening them. It never touches TLS. This makes it extremely fast (millions of packets/sec) but it can't make decisions based on URL path, headers, or cookies.
- **Layer 7** decrypts TLS and reads the actual HTTP request — path, headers, cookies — so it can route `/api` one way and `/static` another, or keep a user pinned to the same backend via cookie stickiness. That costs CPU (crypto + parsing), so it's slower and lower-throughput than L4.

| Dimension | Layer 4 | Layer 7 |
| :--- | :--- | :--- |
| **Sees** | IP + TCP/UDP port only | Full HTTP: path, headers, cookies |
| **Terminates TLS** | No | Yes |
| **Routing** | Destination IP/port only | Content-aware (path, headers, tokens) |
| **Throughput** | Very high, low CPU | Lower, CPU-bound on crypto/parsing |
| **Direct server return** | Possible — backend can reply directly to client | Not possible — proxy must stay in the loop both ways |

---

### Load balancing algorithms, briefly

1. **Round robin** — cycle through servers in order; weighted round robin gives bigger shares to stronger machines.
2. **Least connections** — send traffic to whichever server currently has the fewest active connections. Good for long-lived connections like WebSockets.
3. **Power of two random choices** — pick two servers at random, send to whichever has fewer connections. Avoids herd behavior without needing central coordination.
4. **IP hash** — hash the client's IP to pick a backend, giving basic session stickiness.

---

### Consistent hashing: why losing one cache server shouldn't wreck the whole cache

If you route cache keys with plain modulo hashing (`hash(key) % N`), losing one server out of four changes `N`, and nearly every key now maps to a different server than before — a **cache stampede**, where almost everything misses at once and slams the database.

**Consistent hashing** fixes this by placing both servers and keys on a circular hash space, and assigning each key to the first server found going clockwise from it.

<Diagram>
<Tree root={<Box label="Hash Ring" />}>
<Box label="Server A" />
<Box label="Server B" />
<Box label="Server C" />
</Tree>
</Diagram>

- If Server B goes down, only the keys that mapped to B get reassigned (to C) — Server A's and C's existing keys are untouched. On average only `K/N` keys move, not nearly all of them.
- **Virtual nodes:** each physical server gets many positions on the ring (e.g. 100 each), so load spreads evenly instead of one server getting a disproportionate chunk by bad luck.

---

### Say this in the interview

*"A forward proxy protects clients — it sits in front of them and hides their identity from the destination server. A reverse proxy protects servers — it sits in front of backends and hides them from the client. A load balancer is a reverse proxy whose job is specifically spreading traffic across healthy backends. A CDN is a globally distributed set of reverse-proxy edges caching static content near users. For load balancing, Layer 4 just forwards packets by IP/port — fast but blind — while Layer 7 terminates TLS and reads the actual HTTP request, enabling path-based routing at the cost of CPU. For caching, plain modulo hashing reshuffles almost every key when a server dies, causing a cache stampede; consistent hashing avoids that by placing servers and keys on a ring, so losing a node only displaces that node's own keys."*

---

### Code: a simple Python L7 reverse proxy with round-robin and health checks

```python
import http.server
import socketserver
import urllib.request
import threading
import time

BACKEND_POOL = [
    {"host": "httpstat.us", "path": "/200", "healthy": True},
    {"host": "httpstat.us", "path": "/200?sleep=100", "healthy": True},
]
current_backend_index = 0
lock = threading.Lock()

class Layer7LoadBalancer(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global current_backend_index

        with lock:
            healthy_backends = [b for b in BACKEND_POOL if b["healthy"]]
            if not healthy_backends:
                self.send_response(503)
                self.end_headers()
                self.wfile.write(b"503 Service Unavailable: No healthy backends.")
                return

            # Round-Robin Selection
            current_backend_index = (current_backend_index + 1) % len(healthy_backends)
            target = healthy_backends[current_backend_index]

        # Construct upstream URL
        upstream_url = f"https://{target['host']}{target['path']}"
        print(f"[L7 LB] Routing client {self.client_address[0]} -> {upstream_url}")

        try:
            req = urllib.request.Request(
                upstream_url,
                headers={"User-Agent": "AntigravityL7Proxy/1.0"}
            )
            with urllib.request.urlopen(req, timeout=3.0) as response:
                status_code = response.getcode()
                content = response.read()

                # Send back to client
                self.send_response(status_code)
                self.send_header("Content-Type", "text/plain")
                self.send_header("X-Proxy-Target", target["host"])
                self.end_headers()
                self.wfile.write(content)
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(f"502 Bad Gateway: {str(e)}".encode())

def health_check_daemon():
    """Background thread checking health of backends periodically"""
    while True:
        time.sleep(5)
        for backend in BACKEND_POOL:
            try:
                url = f"https://{backend['host']}{backend['path']}"
                req = urllib.request.Request(url, method="HEAD")
                with urllib.request.urlopen(req, timeout=2.0) as resp:
                    backend["healthy"] = (resp.getcode() == 200)
            except Exception:
                backend["healthy"] = False

if __name__ == "__main__":
    # Start health check daemon in background
    health_thread = threading.Thread(target=health_check_daemon, daemon=True)
    health_thread.start()

    PORT = 8080
    print(f"[*] Layer 7 Load Balancer running on port {PORT}...")
    server = socketserver.TCPServer(("", PORT), Layer7LoadBalancer)
    # Server can be started with server.serve_forever()
```
