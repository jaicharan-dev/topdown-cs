---
id: 4-flow-control-congestion-control
title: "Flow Control vs Congestion Control"
description: "Differentiate flow control (sliding window & rwnd) from congestion control (Slow Start, AIMD, cwnd, and Fast Retransmit/Recovery)."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between flow control and congestion control? How does the sender determine its effective transmission window, and what are Slow Start, AIMD, and Fast Retransmit/Recovery?"

Both of these slow down how fast TCP sends data — but they're protecting two completely different things.

- **Flow control is about the receiver's parking garage.** A venue has 1,000 parking spots. A sign out front says "only 200 spots left" — cars need to stop arriving faster than spots free up. That's flow control: protecting the *receiver's* buffer from being overwhelmed.
- **Congestion control is about the highway, not the garage.** Even with an empty parking garage, if 10,000 cars hit the highway at once, the toll booths (routers in between) jam up anyway. That's congestion control: protecting the *network path* itself.

<Diagram>
<Row>
<Box title="Flow Control" accent="#60a5fa">
<Field icon="🅿️" code="rwnd" hint="protects the receiver's buffer" variant="neutral" />
</Box>
<Box title="Congestion Control" accent="#f59e0b">
<Field icon="🛣️" code="cwnd" hint="protects the network path" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### Comparison

| Dimension | Flow Control | Congestion Control |
| :--- | :--- | :--- |
| **Protects** | The receiver's socket buffer | The network path (routers, switches) |
| **Controlling variable** | `rwnd` (receive window) | `cwnd` (congestion window) |
| **How it's measured** | Advertised directly in every TCP header | Inferred from packet drops, RTT, or duplicate ACKs |
| **Scope** | End-to-end, just this one connection | Global — shared with every other connection on the path |

---

### How much can the sender actually send?

$$\text{Effective Window} = \min(\text{rwnd}, \text{cwnd})$$

Whichever number is smaller wins. The sender is always bottlenecked by whichever is tighter: the receiver's free buffer space, or what the network can currently carry.

---

### How TCP figures out `cwnd` (TCP Reno)

Routers never tell a sender how much bandwidth is available — TCP has to probe for it, in three phases:

<Diagram>
<Row>
<Box title="Slow Start" accent="#60a5fa">
<Field icon="📈" code="cwnd doubles every RTT" hint="starts small, grows fast" variant="neutral" />
</Box>
<Arrow label="hits ssthresh" />
<Box title="Congestion Avoidance" accent="#34d399">
<Field icon="📈" code="cwnd +1 MSS per RTT" hint="linear growth (AIMD)" variant="neutral" />
</Box>
<Arrow label="packet loss" />
<Box title="Fast Retransmit / Recovery" accent="#fb7185">
<Field icon="✂️" code="cwnd halved, not reset" hint="3 dup ACKs trigger this" variant="neutral" />
</Box>
</Row>
</Diagram>

1. **Slow Start:** `cwnd` starts small (around 10 MSS, where MSS ≈ 1460 bytes) and *doubles* every round trip — `1 → 2 → 4 → 8...`. This is exponential growth, meant to find the available bandwidth quickly.
2. **Congestion Avoidance:** once `cwnd` reaches the threshold `ssthresh`, exponential growth stops. TCP switches to adding just 1 MSS per round trip — much more cautious, probing gently for the ceiling.
3. **Loss handling:**
   - **Timeout (bad sign):** if an ACK never arrives in time, TCP assumes serious congestion. It sets `ssthresh = cwnd / 2`, drops `cwnd` all the way back to 1 MSS, and restarts Slow Start from scratch.
   - **3 duplicate ACKs (minor sign):** if just one segment is lost but later ones arrive fine, the receiver sends repeated ACKs for the last good byte. On the 3rd duplicate, TCP does **Fast Retransmit** (resends the missing segment immediately, without waiting for a timeout) and **Fast Recovery** (just halves `cwnd` instead of collapsing to 1, then resumes linear growth from there).

---

### Two gotchas: Silly Window Syndrome & Nagle's Algorithm

- **Silly Window Syndrome:** if a slow app only reads 1 byte at a time, the receiver keeps advertising `rwnd = 1`. The sender then wastes a 41-byte packet (40 bytes of header) just to deliver 1 byte of data.
- **Nagle's Algorithm:** the usual fix — the sender buffers small outgoing chunks until it has a full MSS or an ACK comes back. Latency-sensitive apps (gaming, trading) often disable this with `TCP_NODELAY`, because they'd rather send small packets immediately than wait and risk extra delay.

---

### Say this in the interview

*"Flow control protects the receiver using the advertised rwnd. Congestion control protects the network using a self-computed cwnd that grows through Slow Start, then Congestion Avoidance, and backs off via Fast Retransmit/Recovery on loss. The sender's actual in-flight data is capped by min(rwnd, cwnd) — whichever constraint is tighter wins."*

---

### Code: simulating TCP AIMD congestion control

```python
def simulate_tcp_aimd(rounds=20):
    cwnd = 1         # Start at 1 MSS
    ssthresh = 16    # Slow start threshold
    cwnd_history = []
    
    for r in range(rounds):
        cwnd_history.append(cwnd)
        
        # Simulate packet loss at round 8 and round 16 (3 Duplicate ACKs)
        if r in (7, 15):
            print(f"[Round {r+1:2d}] Packet Loss Detected! (3 Dup ACKs)")
            ssthresh = max(2, cwnd // 2)
            cwnd = ssthresh  # Fast Recovery: Halve cwnd, do not reset to 1
            print(f"            Multiplicative Decrease: cwnd halved to {cwnd}")
        else:
            if cwnd < ssthresh:
                # Slow Start Phase: Exponential growth
                cwnd *= 2
            else:
                # Congestion Avoidance Phase: Additive Increase (+1 MSS per RTT)
                cwnd += 1
                
    return cwnd_history

if __name__ == "__main__":
    history = simulate_tcp_aimd()
    print("\nCalculated cwnd progression:")
    print(" -> ".join(map(str, history)))
```
