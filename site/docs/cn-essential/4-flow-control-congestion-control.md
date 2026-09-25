---
id: 4-flow-control-congestion-control
title: "Flow Control vs Congestion Control"
description: "Differentiate flow control (sliding window & rwnd) from congestion control (Slow Start, AIMD, cwnd, and Fast Retransmit/Recovery)."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between flow control and congestion control? How does the sender determine its effective transmission window, and what are Slow Start, AIMD, and Fast Retransmit/Recovery?"

While both mechanisms throttle the rate at which a TCP sender transmits data, they protect completely different network bottlenecks: **Flow Control** protects the *receiver*, while **Congestion Control** protects the *entire intermediate network*.

---

### The ELI5 Analogy: The Parking Garage vs. The Highway

- **Flow Control (The Destination's Parking Garage):** A sports arena has a 1,000-car parking garage (Receiver Buffer). The arena flashes an electronic sign: *"We only have 200 parking spots left."* The cars must not arrive faster than 200 cars until spots open up.
- **Congestion Control (The Highway Traffic Jam):** Even if the destination parking garage is completely empty (infinite receiver buffer), if 10,000 cars enter the highway at the exact same second, the highway bottlenecks at the toll booths (intermediate routers), causing a massive gridlock.

---

### Architectural Comparison

| Dimension | Flow Control | Congestion Control |
| :--- | :--- | :--- |
| **Protected Entity** | The **Receiver's socket buffer**. | The **Network path** (intermediate routers and switches). |
| **Controlling Variable** | **`rwnd`** (Receive Window). | **`cwnd`** (Congestion Window). |
| **Feedback Mechanism**| Explicitly advertised in every incoming TCP header. | Deduced implicitly through packet drops, RTT latency, or duplicate ACKs. |
| **Scope** | End-to-End (Point-to-Point). | Global (Impacted by all competing network traffic). |

---

### The Fundamental Equation: Effective Window

How does a TCP sender determine how many unacknowledged bytes it can legally transmit onto the wire?

$$\text{Effective Window Size} = \min(\text{rwnd}, \text{cwnd})$$

The sender is capped by whichever constraint is tighter: the receiver's available buffer space or the network's carrying capacity.

---

### Congestion Control Mechanics (TCP Reno)

Because routers do not explicitly inform senders of their bandwidth, TCP probes the network dynamically through four phases:

```
Congestion Window (cwnd)
  ▲
  │              AIMD Linear Growth (Congestion Avoidance: +1 MSS / RTT)
  │                   /\        /\
  │                  /  \      /  \  <-- Multiplicative Decrease (cwnd / 2 on 3 Dup ACKs)
  │      ssthresh --┌    \    /
  │                /      \--/
  │               /
  │  Exponential /  (Slow Start: Doubling cwnd every RTT)
  │  Growth     /
  └────────────┴──────────────────────────────► Time
```

1. **Slow Start:**
   - Starts with a small `cwnd` (typically $10\text{ MSS}$, where MSS is Maximum Segment Size $\approx 1460\text{ bytes}$).
   - For every ACK received, `cwnd` increments by 1 MSS. This results in **exponential growth** ($1 \to 2 \to 4 \to 8 \dots$), doubling `cwnd` every Round Trip Time (RTT) to quickly discover available bandwidth.
2. **Congestion Avoidance (Additive Increase):**
   - When `cwnd` reaches the **Slow Start Threshold (`ssthresh`)**, exponential growth stops.
   - TCP switches to **Additive Increase**: increasing `cwnd` linearly by just **$1\text{ MSS}$ per RTT**, cautiously probing for maximum throughput.
3. **Loss Event Handling (Multiplicative Decrease):**
   - **Timeout (Severe Congestion):** If the Retransmission Timeout (RTO) expires without an ACK, TCP assumes the network is heavily congested. It cuts $ssthresh = cwnd / 2$, resets $cwnd = 1\text{ MSS}$, and restarts Slow Start.
   - **3 Duplicate ACKs (Fast Retransmit & Fast Recovery - TCP Reno):** If a single segment is lost but subsequent segments arrive, the receiver sends duplicate ACKs. Upon receiving **3 duplicate ACKs**:
     - **Fast Retransmit:** TCP immediately retransmits the missing segment without waiting for the RTO timer.
     - **Fast Recovery:** Instead of resetting `cwnd` to 1, TCP sets $ssthresh = cwnd / 2$ and sets $cwnd = ssthresh$, resuming linear additive increase directly.

---

### Performance Pitfalls: Silly Window Syndrome & Nagle's Algorithm

- **Silly Window Syndrome:** If a slow application consumes data 1 byte at a time, the receiver advertises an `rwnd` of 1 byte. The sender then transmits a 41-byte packet (40 bytes of TCP/IP header for 1 byte of user data), saturating network capacity.
- **Nagle's Algorithm (`TCP_NODELAY`):** Solves this on the sender by buffering small outgoing packets until an entire MSS is accumulated or until an ACK for previous data arrives. (In latency-sensitive gaming or trading, developers explicitly disable Nagle via `TCP_NODELAY` to prevent buffering latency).

---

### Summary
"Flow control uses the advertised receive window (rwnd) to prevent a fast sender from overwhelming a slow receiver. Congestion control dynamically computes the congestion window (cwnd) using Slow Start, AIMD, and Fast Retransmit/Recovery to prevent network buffer overflow. The sender's in-flight data is strictly bounded by min(rwnd, cwnd)."

---

### Code Demonstration: Simulating TCP AIMD Congestion Control

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
