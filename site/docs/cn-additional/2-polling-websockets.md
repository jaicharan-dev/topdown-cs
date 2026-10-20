---
id: 2-polling-websockets
title: "HTTP Polling, Long Polling & WebSockets"
description: "Compare HTTP polling, long polling, and WebSockets for real-time communication, their respective overheads, and the architectural statefulness tradeoff."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Compare Short Polling, Long Polling, Server-Sent Events (SSE), and WebSockets. What network and memory overhead does each carry, and what architectural tradeoff do you accept when scaling WebSockets across a multi-server cluster?"

HTTP was built around the client asking and the server answering — the server can never just speak up on its own. But plenty of things need the opposite: a stock ticker, a chat app, a live location tracker, all need the server to push updates the moment they happen. There are four ways people have bolted that onto HTTP, each less wasteful than the last: **short polling**, **long polling**, **Server-Sent Events (SSE)**, and **WebSockets**.

Think of it like repeatedly calling a friend to ask "are you there yet?" (polling) versus them just calling you the second they arrive (a push).

---

### The four approaches, side by side

<Diagram>
<Row>
<Box title="Short polling" accent="#f59e0b">
<Field icon="🔁" code="GET /updates every few sec" hint="mostly empty replies" variant="neutral" />
</Box>
<Arrow label="better" />
<Box title="Long polling" accent="#818cf8">
<Field icon="⏳" code="GET held open until data" hint="reconnects after every reply" variant="neutral" />
</Box>
<Arrow label="better" />
<Box title="WebSockets" accent="#34d399">
<Field icon="🔌" code="one persistent connection" hint="either side can send, anytime" variant="neutral" />
</Box>
</Row>
</Diagram>

#### 1. Short polling — "are we there yet?" every few seconds
The client just asks over and over, on a fixed interval (every 3-5 seconds). Most of those requests come back with nothing new: over 95% of them carry empty payloads, yet each one still pays for a full HTTP request/response (500-1000 bytes of headers, each on its own TCP/TLS handshake machinery). On top of the waste, you're never faster than half the polling interval — an update that lands right after a poll has to wait almost the full interval to be noticed.

#### 2. Long polling — ask, then just wait
The client sends a request like normal, but this time the server doesn't answer right away — it holds the connection open until something actually happens (or a timeout, say 30 seconds, hits). As soon as data shows up, the server replies and closes the connection, and the client immediately opens a new one to keep waiting. It's less wasteful than short polling, but now the server has to keep thousands of idle connections open at once, eating up memory and file descriptors, and every delivered update costs a reconnect.

#### 3. Server-Sent Events (SSE) — a one-way open pipe
SSE keeps a single HTTP connection open and lets the server just keep writing to it (`Content-Type: text/event-stream`), as events happen. It's built into browsers via the `EventSource` API, and it reconnects automatically — the `Last-Event-ID` header even lets it catch up on anything missed while it was disconnected. The catch: it's strictly one-directional. The server can push to the client, but the client can't send anything back over that same channel — it has to make a normal separate request for that. Great fit for dashboards, stock tickers, and streaming LLM output.

#### 4. WebSockets — a real two-way pipe
WebSockets start as an HTTP request but immediately upgrade into a raw, persistent TCP connection where either side can send at any time:
```http
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```
The server replies `101 Switching Protocols`, and from then on there are no more HTTP headers at all — just lightweight frames with only 2-10 bytes of overhead each. This is the right tool for multiplayer games, live chat/audio, trading platforms, and collaborative tools like Figma.

---

### Comparison

| Dimension | Short Polling | Long Polling | SSE | WebSockets |
| :--- | :--- | :--- | :--- | :--- |
| **Direction** | Client asks | Client asks (delayed answer) | Server → client only | Both directions |
| **Overhead per message** | Big (~1 KB of headers) | Big (~1 KB per event) | Small (plain `data: ...`) | Tiny (2-10 bytes) |
| **Connection** | Opens and closes constantly | Reopens after every event | Stays open | Stays open |
| **Reconnects itself** | No — you write that logic | No — you write that logic | Yes, built in | No — you write that logic |
| **Plays nice with proxies/firewalls** | Always | Always | Always (it's just HTTP) | Sometimes blocked by strict corporate proxies |

---

### Why WebSockets are the hard one to scale

Here's the staff-level follow-up: *why is scaling WebSockets so much harder than scaling plain HTTP?*

Plain HTTP is stateless — a load balancer can send request 1 to Server A, request 2 to Server B, request 3 to Server C, and none of them need to know about each other. Need more capacity? Just add servers.

A WebSocket connection isn't like that. When User 101 connects, that TCP socket lives in the memory of one specific server — say, Server A — for as long as the connection is open. If User 202 is connected to Server B and wants to message User 101, Server B has a problem: it has no socket to User 101 at all. It physically cannot deliver that message by itself.

**The fix:** put a message broker (Redis Pub/Sub, Kafka) between the servers.

1. Each WebSocket server keeps a local map of `user_id → socket` for whoever's connected to it.
2. When a user connects to a server, that server subscribes to a channel for that user's ID on the shared broker.
3. Any server that needs to deliver a message to a user just publishes it to the broker — it doesn't need to know which physical server holds that user's socket.
4. The broker routes it to whichever server actually has that connection, and that server pushes it down the socket.

So the servers themselves stay dumb and stateless from each other's point of view — all the "who's connected where" coordination happens through the broker instead.

---

### Say this in the interview

*"Short polling wastes bandwidth on mostly-empty repeated requests. Long polling fixes the latency by holding the connection open, at the cost of server memory for all those hanging connections. SSE gives you a clean, auto-reconnecting one-way stream over plain HTTP — perfect for dashboards or token-by-token LLM output. WebSockets give full two-way communication with almost no per-message overhead, but because each connection is pinned to one server's memory, scaling them across a cluster needs a message broker like Redis Pub/Sub to route messages to whichever server actually holds the right socket."*

---

### Python: polling vs. WebSocket bandwidth, simulated

```python
"""
Real-Time Communication Simulator: Polling vs WebSockets
Demonstrates:
  1. Header overhead accumulation in Short Polling
  2. Frame efficiency in WebSockets (2-byte framing)
  3. Decoupled multi-server broadcasting via simulated Pub/Sub broker
"""

import time
from typing import List, Dict

class PollingSimulator:
    def __init__(self, poll_interval_ms: int = 1000):
        self.poll_interval_ms = poll_interval_ms
        self.bytes_transferred = 0
        self.requests_sent = 0

    def poll(self, new_data_available: bool) -> int:
        self.requests_sent += 1
        # HTTP GET Request Headers ~ 450 bytes
        req_bytes = 450
        # HTTP Response Headers ~ 300 bytes + Body
        resp_bytes = 300 + (120 if new_data_available else 2) # Empty JSON "{}" is 2 bytes
        total_cycle = req_bytes + resp_bytes
        self.bytes_transferred += total_cycle
        return total_cycle


class WebSocketSimulator:
    def __init__(self):
        self.handshake_bytes = 650  # Initial 101 Upgrade Handshake
        self.bytes_transferred = self.handshake_bytes
        self.frames_sent = 0

    def send_message(self, payload_bytes: int):
        self.frames_sent += 1
        # WebSocket Frame Header: 2 bytes for payload <= 125 bytes
        frame_overhead = 2
        total_msg = frame_overhead + payload_bytes
        self.bytes_transferred += total_msg
        return total_msg


def main():
    print("=== Real-Time Protocol Simulation: Polling vs WebSockets ===\n")
    SIMULATION_DURATION_SEC = 60
    POLL_INTERVAL_SEC = 2  # Poll every 2 seconds -> 30 requests

    # Scenario: 3 events occurred during the 60-second window
    event_timestamps = {12, 28, 46}

    # 1. Run Short Polling
    poller = PollingSimulator()
    for second in range(0, SIMULATION_DURATION_SEC, POLL_INTERVAL_SEC):
        has_data = second in event_timestamps
        poller.poll(new_data_available=has_data)

    print(f"--- 1. Short Polling ({SIMULATION_DURATION_SEC}s window, poll every 2s) ---")
    print(f"  Total Requests:     {poller.requests_sent}")
    print(f"  Total Bandwidth:    {poller.bytes_transferred:,} bytes (~{poller.bytes_transferred / 1024:.1f} KB)")
    print(f"  Average Waste:      90% of requests carried empty payloads!")

    # 2. Run WebSocket
    ws = WebSocketSimulator()
    MESSAGE_PAYLOAD_SIZE = 120  # Identical 120-byte event payload
    for _ in event_timestamps:
        ws.send_message(MESSAGE_PAYLOAD_SIZE)

    print(f"\n--- 2. WebSocket ({SIMULATION_DURATION_SEC}s window, 3 events pushed) ---")
    print(f"  Frames Dispatched:  {ws.frames_sent}")
    print(f"  Total Bandwidth:    {ws.bytes_transferred:,} bytes (~{ws.bytes_transferred / 1024:.1f} KB)")
    print(f"  Framing Overhead:   Only 2 bytes per message (vs 750 bytes per HTTP poll)")

    savings = (1 - (ws.bytes_transferred / poller.bytes_transferred)) * 100
    print(f"\nResult: WebSockets reduced total network data volume by {savings:.1f}%!")

if __name__ == "__main__":
    main()
```
