---
id: 2-polling-websockets
title: "HTTP Polling, Long Polling & WebSockets"
description: "Four ways to hear about something the moment it happens, and the one that stops your servers being interchangeable"

sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Compare Short Polling, Long Polling, Server-Sent Events (SSE), and WebSockets. What network and memory overhead does each carry, and what architectural tradeoff do you accept when scaling WebSockets across a multi-server cluster?"

---

### Picture it

You are waiting to hear whether a parcel has arrived at the front desk.

**Short polling: walk down and ask, every five minutes.** Simple, and it always works. Almost every trip the answer is "no". You waste the walk, the desk wastes the conversation, and when the parcel does arrive you still find out up to five minutes late. Make the interval shorter and the waste grows in exact proportion.

**Long polling: walk down and refuse to leave.** You ask, and the clerk says nothing until there is actually a parcel. You hear the instant it arrives. The cost is that you are standing at the desk occupying the clerk's attention, and the moment you are told, you have to walk down and start waiting all over again. One parcel, one whole trip.

**Server-Sent Events: ask them to shout up the stairwell.** You open the door once and leave it open. The desk calls up whenever anything happens, as often as it likes, and you never go down again. The limitation is that **the stairwell only carries sound downward**: you cannot reply through it, and you need a different route to say anything back.

**WebSockets: install a telephone line.** You dial once, and afterwards either end can speak at any moment, as often as they like, in either direction, with almost no ceremony per sentence.

The telephone is clearly best, until you notice what it did to the building.

The desk is not one clerk; it is **twelve clerks in twelve rooms**, and your line is plugged into **clerk number seven specifically**. Your parcel is logged by clerk number three, who has **no connection to you at all**. With the walking approach that never mattered, because each trip could go to any free clerk. Now it matters enormously, and the fix is an **internal intercom** so clerk three can tell clerk seven to tell you. You have just added a shared piece of machinery that every clerk depends on, and the building is no longer twelve interchangeable rooms.

---

### The proper terms

#### Short polling

The client issues a **request on a fixed interval** and the server answers immediately with whatever it has, usually nothing.

**Network cost.** A complete HTTP request and response per interval, including headers, cookies and the `User-Agent`, which can be a kilobyte or more each way to transfer a "no change" answer. Without keep-alive it also pays a TCP and TLS handshake each time.

**Latency.** Up to the full interval. The only way to improve it is to poll more often, which multiplies the waste.

**Server cost.** Low per request and unbounded in aggregate: 10,000 clients polling every 5 seconds is 2,000 requests per second **whether or not anything is happening**.

It is still the right answer when updates are rare, staleness is acceptable, and simplicity matters, because it needs nothing special from any proxy, balancer or framework.

#### Long polling

The client requests, and the server **holds the request open** without responding until data is available or a timeout fires. The client then immediately issues the next request.

**Latency is effectively zero**, which is the whole point.

**Network cost.** No wasted round trips while idle, but a **complete HTTP cycle per message**, so a burst of 50 events becomes 50 request and response pairs with full headers.

**Server cost.** Every waiting client occupies an **open connection**, a socket and a file descriptor, plus whatever the server needs to park the request. On a thread-per-request model this is ruinous; on an event-driven server it is manageable.

**The operational catch**, which is worth naming because it causes real incidents: intermediaries kill idle connections, typically after 30 to 60 seconds. So the server must respond with an empty result before any proxy or load balancer times out, and the client must reconnect immediately. Mis-tuning that timeout produces errors that only appear in production behind the real proxy chain.

#### Server-Sent Events

**SSE** is a single long-lived HTTP response with `Content-Type: text/event-stream`, over which the server writes events as they occur. The connection stays open and the response body never ends.

**It is one-directional**, server to client only. Anything the client wants to say uses an ordinary request, which in practice is perfectly fine.

**Network cost.** HTTP headers are paid **once**. Each event is a few bytes of framing, `data:` plus the payload plus a blank line.

**Server cost.** One open connection per client, the same as long polling, but no re-establishment per message.

Its genuine advantages are often undersold:

**It is ordinary HTTP**, so proxies, load balancers, compression, authentication and HTTP/2 all work with nothing special configured.

**Reconnection is automatic and built into the browser**, and the client sends **`Last-Event-ID`** so the server can resume from where it left off. With WebSockets you write that yourself.

Its limits:

**Text only**, UTF-8, so binary must be base64-encoded at a 33 percent cost.

**The six-connection limit per origin on HTTP/1.1**, so six open tabs exhaust the browser's connection budget for that origin and the seventh stalls. HTTP/2 multiplexing removes this, which is why SSE became much more usable.

It is the correct default for notifications, live feeds, progress updates and streaming tokens from a model, which are all one-directional.

#### WebSockets

A **WebSocket** starts as an HTTP request carrying `Upgrade: websocket`, `Connection: Upgrade` and a **`Sec-WebSocket-Key`**. The server answers **`101 Switching Protocols`**, and from then on the same TCP connection is a **full-duplex, bidirectional, message-framed** channel that is no longer HTTP.

**Network cost is the lowest by a wide margin.** A frame header is 2 to 14 bytes, against hundreds of bytes of HTTP headers per message. **Binary is native.** Either side may send at any time without being asked.

**Server cost.** One connection per client held indefinitely, with socket buffers and application state, so memory is the binding constraint. Six figures of connections per node is achievable but needs tuning of file descriptors, buffer sizes and the event loop.

**What you must build yourself.** There is no automatic reconnection, so you implement reconnect with backoff and resume. You also need ping and pong heartbeats, because idle NAT mappings and proxies drop connections silently and neither side notices until a write fails.

#### Scaling WebSockets across a cluster

This is the architectural half of the question, and the answer is a single sentence followed by its consequences: **a WebSocket is a long-lived, stateful connection pinned to one specific server, which breaks the assumption that any server can handle any request.**

The concrete problem: the user is connected to **server A**. The event they must receive is generated by work happening on **server B**. Server B holds **no socket** to that user and cannot reach them.

The standard solution is a **pub/sub backplane**: Redis pub/sub, NATS or Kafka. Every application server subscribes; server B **publishes** the event; server A receives it and writes to its socket.

The trade you are accepting, stated plainly:

**You have added a shared stateful dependency.** The backplane is now on the critical path for every real-time message, and its failure is a cluster-wide outage of real-time delivery.

**Naive fan-out does not scale linearly.** With plain pub/sub every message reaches **every** server, so cluster-wide traffic grows with servers times messages. Beyond a certain size you need **topic sharding**, or a **connection registry** mapping user to server so messages can be routed to the one node that needs them, which is more state to keep correct.

**Load balancers must cooperate.** They have to pass the `Upgrade` handshake through and route at the connection level, and because the connection is long-lived the balancing decision is made **once** and then frozen for hours.

**Deployments become disruptive.** Restarting a node drops every connection it holds, so you need **graceful draining** and clients that reconnect with jittered backoff, or the whole cohort reconnects simultaneously and becomes a self-inflicted thundering herd.

**Autoscaling is weak.** Adding a node attracts only **new** connections; existing ones do not rebalance, so a node that filled during a spike stays full while fresh nodes sit idle until you force reconnections.

The summary worth saying out loud: **you trade stateless, freely interchangeable servers for a stateful, pinned topology plus a shared backplane.** That is a real architectural cost, and it is why SSE or long polling is often the better engineering decision when the traffic is genuinely one-directional.

---

### In code

```text
The four approaches, drawn over time:

  SHORT POLLING        every 5 s, mostly for nothing
    C --req--> S  "anything?"  "no"
    C --req--> S  "anything?"  "no"
    C --req--> S  "anything?"  "YES"     <- up to 5 s late

  LONG POLLING         the server holds the request open
    C --req--> S  ................ (held) ....... "YES"  <- instant
    C --req--> S  ................ (held) .......
    one full HTTP cycle PER MESSAGE

  SERVER-SENT EVENTS   one response that never ends
    C --req--> S  [open]
                  <-- data: {...}
                  <-- data: {...}
                  <-- data: {...}       headers paid ONCE
    one-directional: the client replies via ordinary requests

  WEBSOCKET            one connection, both directions
    C --GET + Upgrade--> S
      <-- 101 Switching Protocols
    C <===================> S   either side, any time, 2-14 byte frames
```

```text
Overhead, side by side:

                  per message on the wire     server memory    latency
  short polling   full HTTP req + resp        none while idle  up to the
                  (~1 KB each way), even                       interval
                  when there is nothing
  long polling    full HTTP req + resp        1 open conn      ~0
                  per message                 per client
  SSE             a few bytes of framing      1 open conn      ~0
                  (headers paid ONCE)         per client
  websocket       2-14 byte frame header      1 open conn      ~0
                  binary native               per client

  aggregate cost of short polling:
     10,000 clients, 5 s interval = 2,000 req/s
     whether or not ANYTHING is happening
```

```javascript
// SSE: the browser handles reconnection and resume for you
const es = new EventSource('/api/updates');
es.onmessage = (e) => render(JSON.parse(e.data));
es.onerror   = () => { /* the browser reconnects automatically */ };
// on reconnect it sends Last-Event-ID, so the server can resume

// the server side is plain HTTP:
//   Content-Type: text/event-stream
//   Cache-Control: no-cache
//
//   id: 1042
//   data: {"price": 331.2}
//   <blank line>
```

```javascript
// WebSocket: you own reconnection and liveness yourself
let ws, backoff = 500;

function connect() {
  ws = new WebSocket('wss://example.com/live');

  ws.onopen    = () => { backoff = 500; };
  ws.onmessage = (e) => render(JSON.parse(e.data));

  ws.onclose   = () => {
    // jitter matters: without it, every client reconnects at once
    const wait = backoff + Math.random() * backoff;
    backoff = Math.min(backoff * 2, 30000);
    setTimeout(connect, wait);
  };
}
connect();

// and heartbeats, because idle NAT mappings and proxies drop the
// connection silently and neither side notices until a write fails
setInterval(() => ws.readyState === 1 && ws.send('{"t":"ping"}'), 25000);
```

```text
The cluster problem, which is the real question:

  user is connected to SERVER A
  the event is generated on SERVER B
  B holds NO SOCKET to that user

        [user] ===ws=== [server A]        [server B] <- event happens here
                             ^                 |
                             +--- ??? ---------+

  the standard fix, a PUB/SUB BACKPLANE:

        [server A] --sub--+
        [server B] --sub--+--> [ Redis / NATS / Kafka ]
        [server C] --sub--+
                           B publishes -> A receives -> A writes to
                                                        its socket

  what you just accepted:

   1. a SHARED STATEFUL DEPENDENCY on the critical path of every
      real-time message; its failure is a cluster-wide outage

   2. FAN-OUT that does not scale linearly: with plain pub/sub every
      message reaches EVERY server, so traffic grows as
      servers x messages. Past a point you need topic sharding, or a
      connection registry mapping user -> server, which is more state
      to keep correct

   3. LOAD BALANCERS must pass the Upgrade through and route at the
      connection level, and the balancing decision is made ONCE and
      then frozen for hours

   4. DEPLOYS DROP EVERY CONNECTION on the restarted node, so you need
      graceful draining and clients reconnecting with JITTERED backoff,
      or the whole cohort reconnects at once

   5. AUTOSCALING IS WEAK: a new node attracts only NEW connections;
      existing ones never rebalance, so a node that filled during a
      spike stays full while fresh nodes sit idle

  in one line: you trade stateless, interchangeable servers for a
  stateful, pinned topology plus a shared backplane.
```

```text
Choosing, in practice:

  updates rare, staleness fine, simplicity wins   -> short polling
  need instant delivery, cannot use SSE/WS        -> long polling
  server -> client only (notifications, feeds,
  progress, streaming tokens)                     -> SSE
  truly bidirectional, high frequency, low
  latency (chat, games, collaborative editing,
  trading)                                        -> WebSocket

  the mistake is reaching for WebSockets when the traffic only ever
  flows one way, and paying the whole cluster cost for nothing.
```

---

### What they ask next

**"Why not just poll faster?"**
Because cost scales with frequency and not with usefulness. Halving the interval doubles requests, and almost all of them still return nothing. You pay more to be slightly less late, and the server pays it for every client simultaneously.

**"Why choose SSE over WebSockets?"**
When the traffic is one-directional. SSE is plain HTTP, so proxies, load balancers, compression and authentication work unchanged, and the browser handles reconnection and resume with `Last-Event-ID` for free. WebSockets make you build reconnection, heartbeats and resume yourself, and they impose the stateful cluster topology.

**"What breaks long polling in production?"**
Intermediate timeouts. Proxies and balancers close idle connections after 30 to 60 seconds, so the server must return an empty response before that and the client must reconnect at once. The bug is invisible locally and appears only behind the real proxy chain.

**"How do you handle a WebSocket deploy?"**
Drain gracefully: stop accepting new connections, send a close frame so clients reconnect deliberately, and roll nodes gradually. Clients must reconnect with exponential backoff **and jitter**, otherwise every dropped client returns at the same instant and the new node falls over.

**"Does HTTP/2 remove the need for WebSockets?"**
It removes SSE's six-connection limit and makes server streaming cheap, so it narrows the gap considerably. It does not provide genuine client-initiated bidirectional messaging with low per-message overhead, which is still WebSockets' territory.

**"How many WebSocket connections can one server hold?"**
Six figures is achievable, bounded by memory for socket buffers and per-connection state rather than by CPU, and it needs file descriptor limits, buffer sizes and the event loop tuned. The harder limit in practice is usually the backplane's fan-out, not the sockets.

**"What is the point of ping and pong frames?"**
Liveness. A connection severed by a NAT timeout or a dead peer looks perfectly healthy until you try to write, so periodic heartbeats detect it and trigger reconnection. They also keep intermediaries from dropping an idle connection.

**The common wrong answer** is ranking the four by latency and declaring WebSockets the winner. On latency they are right; the question is about **cost**, and the cost of WebSockets is paid in **architecture**: pinned connections, a shared backplane, disruptive deploys and weak autoscaling. Choosing them when the data only flows one way is paying that bill for nothing.

---

### Say this in the interview

*"Short polling is a request on a fixed interval, answered immediately with whatever exists, usually nothing. It pays a full HTTP request and response including headers and cookies, perhaps a kilobyte each way, to be told nothing changed, and latency is up to the whole interval. Per request it is cheap and in aggregate it is unbounded: ten thousand clients at a five second interval is two thousand requests a second whether or not anything is happening. It is still right when updates are rare and simplicity matters, because it needs nothing special from any proxy or balancer.*

*Long polling holds the request open until data exists or a timeout fires, then the client immediately reconnects, so latency is effectively zero. There are no wasted round trips while idle, but there is a complete HTTP cycle per message, so fifty events are fifty request and response pairs with full headers. Each waiting client occupies an open connection, a socket and a file descriptor. The operational catch is that proxies and balancers kill idle connections after thirty to sixty seconds, so the server must respond with an empty result before that, and mis-tuning it produces errors that only appear behind the real proxy chain.*

*Server-sent events is one long-lived HTTP response with Content-Type text/event-stream, over which the server writes events as they happen. It is one-directional, server to client, and the client replies with ordinary requests. Headers are paid once and each event is a few bytes of framing. Its underrated advantages are that it is ordinary HTTP, so proxies, compression, authentication and HTTP/2 all work unchanged, and that reconnection is automatic in the browser with Last-Event-ID so the server can resume. Its limits are text only, so binary costs 33 percent in base64, and the six-connection-per-origin limit on HTTP/1.1, which HTTP/2 multiplexing removes.*

*A WebSocket starts as an HTTP request with Upgrade websocket, Connection Upgrade and a Sec-WebSocket-Key, the server answers 101 Switching Protocols, and the TCP connection becomes a full-duplex, bidirectional, message-framed channel that is no longer HTTP. Overhead is the lowest by far, a 2 to 14 byte frame header against hundreds of bytes of HTTP headers, with binary native and either side free to send at any time. The cost is one connection held per client, so memory is the binding constraint, and you must build reconnection and ping-pong heartbeats yourself, because idle NAT mappings and proxies drop connections silently.*

*The cluster trade-off comes down to one sentence: a WebSocket is a long-lived stateful connection pinned to one server, which breaks the assumption that any server can handle any request. The user is connected to server A while the event is generated on server B, and B holds no socket to them. The standard fix is a pub/sub backplane, Redis, NATS or Kafka, where every server subscribes and B publishes so A can write to its socket. What you accept is: a shared stateful dependency on the critical path of every real-time message, whose failure is a cluster-wide outage; fan-out that does not scale linearly, since with plain pub/sub every message reaches every server, so past a point you need topic sharding or a connection registry mapping user to server; load balancers that must pass the Upgrade through and route at connection level, with the balancing decision frozen for hours; deploys that drop every connection on a restarted node, needing graceful draining and jittered client backoff; and weak autoscaling, because a new node attracts only new connections while existing ones never rebalance. In one line, you trade stateless interchangeable servers for a stateful pinned topology plus a backplane, which is exactly why SSE is often the better engineering decision when the traffic only flows one way."*
