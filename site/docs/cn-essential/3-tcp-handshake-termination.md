---
id: 3-tcp-handshake-termination
title: "TCP 3-Way Handshake & 4-Way Termination"
description: "Walk through TCP connection establishment (3-way handshake), termination (4-way handshake), the TIME_WAIT state, 2MSL, and SYN Cookies."
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk through the TCP 3-way handshake and 4-way termination sequence. Why does connection establishment need 3 steps instead of 2, why does termination need 4 steps, what is the TIME_WAIT state with 2MSL, and how do SYN Cookies defend against SYN Floods?"

Think of two people shouting across a noisy room, checking they can actually hear each other before talking. "Can you hear me?" "Yes, and can you hear me?" "Yes." Three messages, because each side needs to confirm the *other* side received something. TCP does the same thing before it'll send real data — that's the 3-way handshake. And when the conversation's over, both sides need to say goodbye independently, because either one might still have something left to say — that's the 4-way termination.

---

### The 3-way handshake

<Diagram>
<Row>
<Box title="Client" accent="#60a5fa">
<Field icon="📤" code="SYN (seq=x)" hint="1. let's connect, here's my starting number" variant="neutral" />
</Box>
<Arrow label="1" />
<Box title="Server" accent="#34d399">
<Field icon="📤" code="SYN-ACK (seq=y, ack=x+1)" hint="2. got it, here's mine too" variant="neutral" />
</Box>
<Arrow label="2" />
<Box title="Client" accent="#60a5fa">
<Field icon="✅" code="ACK (ack=y+1)" hint="3. got yours — ESTABLISHED" variant="neutral" />
</Box>
</Row>
</Diagram>

1. **`SYN` (seq=x):** client says "let's connect" and picks a starting sequence number, `x`.
2. **`SYN-ACK` (seq=y, ack=x+1):** server confirms the client's number and sends its own starting number, `y`.
3. **`ACK` (ack=y+1):** client confirms the server's number. Both sides are now `ESTABLISHED`.

**Why not just 2 steps?** Two problems show up immediately:
1. **The server would be left hanging.** If it moved to `ESTABLISHED` right after sending `SYN-ACK`, and that packet got lost, the server would sit there holding memory for a client that never actually confirmed anything.
2. **Old, dead packets could hijack a new connection.** If a stale `SYN` from a long-dead connection shows up late, a 2-step handshake would blindly accept it as new. Step 3 gives the client a chance to recognize this isn't a handshake it started, and reject it with an `RST`.

---

### SYN floods and SYN cookies

A **SYN flood** is an attacker sending a huge number of fake `SYN` packets and never sending the final `ACK`. The server's backlog queue fills up with these half-open connections, and it runs out of memory to accept real ones.

**SYN cookies** fix this without the server needing to remember anything. Instead of storing state for each half-open connection, the server encodes the connection details directly into its sequence number `y`:

$$y = \text{HMAC}(\text{src\_ip}, \text{src\_port}, \text{dst\_ip}, \text{dst\_port}, \text{secret\_key}, \text{timestamp})$$

When the real `ACK` comes back with `ack = y + 1`, the server just re-derives the hash and checks it matches. If it does, only *then* does it allocate real memory for the connection. No memory spent on connections that never finish.

---

### 4-way termination and the "half-closed" state

TCP is full-duplex — the client-to-server and server-to-client directions are two independent streams, and each has to be closed separately.

<Diagram>
<Row>
<Box title="Client" accent="#60a5fa">
<Field icon="🛑" code="FIN (seq=u)" hint="1. I'm done sending" variant="neutral" />
</Box>
<Arrow label="1" />
<Box title="Server" accent="#34d399">
<Field icon="✅" code="ACK (ack=u+1)" hint="2. half-closed: client can only receive now" variant="neutral" />
</Box>
<Arrow label="2" />
<Box title="Server" accent="#34d399">
<Field icon="🛑" code="FIN (seq=w)" hint="3. now I'm done too" variant="neutral" />
</Box>
<Arrow label="3" />
<Box title="Client" accent="#60a5fa">
<Field icon="✅" code="ACK (ack=w+1)" hint="4. client enters TIME_WAIT" variant="neutral" />
</Box>
</Row>
</Diagram>

When the client sends `FIN`, it's only saying "I'm done sending" — not "I'm done listening." The server acknowledges, but might still have buffered data to send back (query results, file chunks, whatever). So the client enters a **half-closed** state: it can't send anymore, but keeps receiving. Only once the server has sent everything it needs to does *it* send a `FIN`, which the client acknowledges — and only then is the connection fully closed on both sides.

---

### The `TIME_WAIT` trap: why wait 2×MSL before closing?

After sending that last `ACK`, the client (whichever side closed first) doesn't close immediately — it sits in `TIME_WAIT` for 2×MSL (Maximum Segment Lifetime, usually 1-2 minutes). Two reasons this matters:

1. **The last `ACK` might get lost.** If it does, the server will time out and resend its `FIN`. If the client had already closed, it would answer that retransmitted `FIN` with an `RST`, making the server think something went wrong. Staying in `TIME_WAIT` means the client is still around to re-acknowledge it.
2. **Old packets need time to die.** Packets can get delayed and wander the network longer than expected. Waiting out 2×MSL makes sure every stray packet from this connection has expired before a brand-new connection can reuse the same `(src_ip, src_port, dst_ip, dst_port)` combination — otherwise an old packet could get mistaken for part of the new connection.

---

### Say this in the interview

*"The 3-way handshake exists so both sides confirm they've received each other's sequence number before data flows — a 2-way version can't detect stale or lost packets. Termination needs 4 steps because TCP is full-duplex and each direction closes independently, which creates a half-closed state. The side that closes first waits in TIME_WAIT for 2×MSL so a lost final ACK can be recovered and old packets have time to disappear before the same connection tuple gets reused. SYN cookies defend against SYN floods by encoding connection state into the sequence number instead of storing it in memory."*

---

### Code: half-closed TCP connection in Python

```python
import socket
import threading
import time

def run_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(("127.0.0.1", 8888))
    server.listen(1)
    
    conn, _ = server.accept()
    # Read client request until EOF (Client FIN)
    request = conn.recv(1024)
    print(f"[Server] Received request: {request.decode()}")
    
    # Client has closed its sending side (Half-Closed),
    # but the server can still transmit buffered response data:
    time.sleep(0.5)
    conn.sendall(b"Server Final Response Data after Client FIN")
    
    # Server sends its own FIN to initiate final teardown
    conn.close()
    server.close()

def run_client():
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect(("127.0.0.1", 8888))
    
    client.sendall(b"Client Query")
    
    # SHUT_WR sends FIN packet (Half-Closes client output stream)
    # The client cannot send more data, but keeps receiving!
    client.shutdown(socket.SHUT_WR)
    print("[Client] Client stream shut down (Sent FIN). Waiting for remaining response...")
    
    # Client successfully reads remaining server data
    response = client.recv(1024)
    print(f"[Client] Received: {response.decode()}")
    client.close()

if __name__ == "__main__":
    t_server = threading.Thread(target=run_server)
    t_server.start()
    time.sleep(0.1)
    run_client()
    t_server.join()
```
