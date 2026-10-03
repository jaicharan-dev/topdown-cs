---
id: 7-delay-calculations
title: "Transmission Delay vs Propagation Delay"
description: "Calculate transmission delay (L/R) and propagation delay (d/v), analyze multi-hop store-and-forward pipelining, and explore queuing delays in Python."
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A sender transmits a file of size 2 MB over a link with a bandwidth of 10 Mbps. The distance is 2000 km, and the signal propagates at $2 \times 10^8\text{ m/s}$. Calculate the transmission delay, propagation delay, total one-hop time, and analyze how packet switching with store-and-forward pipelining alters end-to-end latency."

---

Network latency is frequently misunderstood as a single homogeneous metric. In reality, total packet delay is the sum of four physically distinct components, governed by fundamentally different laws of physics, hardware architectures, and traffic patterns.

Understanding the difference between **transmission delay** (a bandwidth/NIC constraint) and **propagation delay** (a speed-of-light constraint) is essential for diagnosing network bottlenecks and designing global distributed systems.

---

### 1. Step-by-Step Delay Calculations

#### Transmission Delay ($T_{\text{trans}}$)
Transmission delay is the time required for the sender's network interface card (NIC) to push all bits of a packet onto the physical medium. It is completely independent of the distance between sender and receiver.

$$T_{\text{trans}} = \frac{L}{R}$$

- **File Size ($L$):** $2\text{ MB}$. In networking standards, data rates use metric decimal prefixes ($1\text{ Mb} = 10^6\text{ bits}$), while file sizes are conventionally evaluated in decimal bytes ($1\text{ MB} = 10^6\text{ bytes}$):
  $$L = 2 \times 10^6\text{ bytes} \times 8\text{ bits/byte} = 16 \times 10^6\text{ bits} = 16\text{ Mbits}$$
  *(Note: If using binary mebibytes where $1\text{ MiB} = 2^{20}\text{ bytes}$, $L = 16,777,216\text{ bits}$, yielding $T_{\text{trans}} \approx 1.678\text{ seconds}$).*
- **Link Bandwidth ($R$):** $10\text{ Mbps} = 10 \times 10^6\text{ bps}$.

$$T_{\text{trans}} = \frac{16 \times 10^6\text{ bits}}{10 \times 10^6\text{ bps}} = \mathbf{1.6\text{ seconds}}$$

#### Propagation Delay ($T_{\text{prop}}$)
Propagation delay is the physical transit time for a single electromagnetic pulse (or optical photon) to travel from the beginning of the transmission medium to the end. It depends strictly on distance and signal velocity, and is completely independent of packet size or link bandwidth.

$$T_{\text{prop}} = \frac{d}{v}$$

- **Distance ($d$):** $2000\text{ km} = 2 \times 10^6\text{ meters}$.
- **Propagation Velocity ($v$):** $2 \times 10^8\text{ m/s}$ (approximately $\frac{2}{3} c$, the standard phase velocity of light through silica glass optical fiber).

$$T_{\text{prop}} = \frac{2 \times 10^6\text{ m}}{2 \times 10^8\text{ m/s}} = 0.01\text{ seconds} = \mathbf{10\text{ ms}}$$

#### Total One-Hop Latency:
Assuming negligible processing and queuing delays:
$$T_{\text{total}} = T_{\text{trans}} + T_{\text{prop}} = 1.6\text{ s} + 0.01\text{ s} = \mathbf{1.61\text{ seconds}}$$

```text
Sender                                                            Receiver
  |============================= (1.6 s to push 16 Mbits)           |
  |-----------------------------\                                   |
  |                              \                                  |
  |                               \ (10 ms propagation)             |
  |                                \                                |
  |                                 \---> First bit arrives at 10 ms |
  |                                                                 |
  |=============================\                                   |
                                 \                                  |
                                  \                                 |
                                   \---> Last bit arrives at 1.61 s |
```

---

### 2. The Complete Four-Component Nodal Delay Model

In production networks with intermediate routers, total nodal delay consists of four components:

$$d_{\text{nodal}} = d_{\text{proc}} + d_{\text{queue}} + d_{\text{trans}} + d_{\text{prop}}$$

| Delay Component | Formula | Dominant Bottleneck | How to Reduce It |
| :--- | :--- | :--- | :--- |
| Processing Delay ($d_{\text{proc}}$) | Hardware/ASIC cycle time | CPU/ASIC speed, routing table lookup | Hardware TCAM, specialized switching silicon |
| Queuing Delay ($d_{\text{queue}}$) | Function of traffic intensity $I$ | Router buffer congestion, cross-traffic | Traffic shaping, Active Queue Management (CoDel, RED) |
| Transmission Delay ($d_{\text{trans}}$) | $L / R$ | Packet size $L$, link bandwidth $R$ | Upgrade link bandwidth (e.g., 10 Gbps to 100 Gbps) |
| Propagation Delay ($d_{\text{prop}}$) | $d / v$ | Physical distance $d$, refractive index | Geographic proximity, Edge CDNs, low-latency routing |

#### Queuing Delay & Traffic Intensity ($I$):
Let $a$ be the average packet arrival rate (packets/sec), $L$ the packet length (bits), and $R$ the transmission rate (bps). **Traffic Intensity** is defined as:
$$I = \frac{L \cdot a}{R}$$

- **$I \to 0$:** Traffic is sparse; packets arrive at an empty queue. $d_{\text{queue}} \approx 0$.
- **$I \to 1$:** Arrival rate approaches capacity. Queuing delay surges asymptotically:
  $$d_{\text{queue}} \approx \frac{I}{1 - I} \cdot \frac{L}{R}$$
- **$I > 1$:** Arriving bits exceed link drain capacity. The buffer overflows, leading to packet drops and TCP retransmission storms.

---

### 3. Store-and-Forward Pipelining Gain

Consider transmitting the 2 MB file across a 3-hop network ($A \to R_1 \to R_2 \to B$) where each link has $R = 10\text{ Mbps}$ and $T_{\text{prop}} = 10\text{ ms}$.

#### Case A: Monolithic Message (No Packetization)
In traditional message switching, an entire 2 MB file must be fully received by a router before forwarding can begin (store-and-forward rule):
- Hop 1 ($A \to R_1$): $1.6\text{ s} + 0.01\text{ s} = 1.61\text{ s}$
- Hop 2 ($R_1 \to R_2$): $1.6\text{ s} + 0.01\text{ s} = 1.61\text{ s}$
- Hop 3 ($R_2 \to B$): $1.6\text{ s} + 0.01\text{ s} = 1.61\text{ s}$
- **Total End-to-End Latency:** $3 \times 1.6\text{ s} + 3 \times 0.01\text{ s} = \mathbf{4.83\text{ seconds}}$.

#### Case B: Packet Switching (1500-Byte MTU)
Break the 2 MB ($16 \times 10^6$ bits) file into $k$ discrete packets of $1500\text{ bytes}$ ($12,000\text{ bits}$):
$$k = \frac{16 \times 10^6}{12,000} \approx 1334\text{ packets}$$
$$T_{\text{trans, pkt}} = \frac{12,000\text{ bits}}{10 \times 10^6\text{ bps}} = 1.2\text{ ms}$$

Because routers forward packet $i$ on link 2 while the source is transmitting packet $i+1$ on link 1, the packets **pipeline concurrently**:
$$\text{Total Time} = (k + N - 1) \cdot T_{\text{trans, pkt}} + N \cdot T_{\text{prop}}$$
$$\text{Total Time} = (1334 + 3 - 1) \times 1.2\text{ ms} + 3 \times 10\text{ ms} = 1.6032\text{ s} + 0.03\text{ s} \approx \mathbf{1.633\text{ seconds}}$$

Packetization reduces total latency from **4.83 s to 1.63 s**, a **66% reduction** achieved purely through store-and-forward pipelining.

---

### 4. Why Upgrading Bandwidth Cannot Fix Latency (The Speed of Light Wall)

A common distributed systems pitfall is attempting to fix slow API response times by buying more bandwidth.

Suppose an enterprise upgrades the link from $10\text{ Mbps}$ to $10\text{ Gbps}$ ($1000\times$ increase):
- $T_{\text{trans}}$ drops from $1.6\text{ s}$ to $\frac{16 \times 10^6\text{ bits}}{10 \times 10^9\text{ bps}} = \mathbf{1.6\text{ ms}}$ ($99.9\%$ reduction).
- $T_{\text{prop}}$ remains locked at $\frac{2000\text{ km}}{2 \times 10^8\text{ m/s}} = \mathbf{10\text{ ms}}$ ($0\%$ reduction).

On cross-continental or trans-oceanic routes (e.g., London to Tokyo, $\approx 9,500\text{ km}$, $T_{\text{prop}} \approx 48\text{ ms}$ one-way), propagation delay dominates. Because the speed of light in fiber cannot be increased, the only way to reduce propagation delay is to **decrease physical distance $d$**. This physical law is the direct architectural justification for Edge CDNs (Cloudflare, AWS CloudFront) and localized Point of Presence (PoP) data centers.

---

### 5. Runnable Python Implementation

This standalone script simulates nodal delay components, traffic intensity curves, and multi-hop packet pipelining gains.

```python
"""
Network Delay and Pipelining Simulator
Calculates transmission, propagation, and queuing delays,
and evaluates packetization gains across multi-hop topologies.
"""


def calculate_delays(file_bytes: int, bandwidth_bps: int, distance_meters: float, velocity_mps: float):
    """Calculates transmission, propagation, and total delay for a single hop."""
    file_bits = file_bytes * 8
    t_trans = file_bits / bandwidth_bps
    t_prop = distance_meters / velocity_mps
    t_total = t_trans + t_prop
    return t_trans, t_prop, t_total


def multi_hop_comparison(file_bytes: int, bandwidth_bps: int, distance_meters: float, 
                         velocity_mps: float, num_hops: int, packet_bytes: int):
    """
    Compares monolithic message switching vs pipelined packet switching
    over N store-and-forward hops.
    """
    file_bits = file_bytes * 8
    t_prop_per_hop = distance_meters / velocity_mps
    total_prop = num_hops * t_prop_per_hop

    # 1. Message Switching (no packetization)
    t_trans_message = file_bits / bandwidth_bps
    total_message_delay = (num_hops * t_trans_message) + total_prop

    # 2. Packet Switching (pipelined)
    packet_bits = packet_bytes * 8
    num_packets = -(-file_bits // packet_bits)  # Ceiling division
    t_trans_pkt = packet_bits / bandwidth_bps
    total_packet_delay = ((num_packets + num_hops - 1) * t_trans_pkt) + total_prop

    return total_message_delay, total_packet_delay, num_packets


def queuing_delay(traffic_intensity: float, service_time_sec: float) -> float:
    """M/M/1 queuing model delay estimation."""
    if traffic_intensity >= 1.0:
        return float("inf")
    return (traffic_intensity / (1.0 - traffic_intensity)) * service_time_sec


if __name__ == "__main__":
    file_size = 2 * 10**6      # 2 MB
    bandwidth = 10 * 10**6      # 10 Mbps
    distance = 2000 * 10**3     # 2000 km
    v_light = 2 * 10**8         # 2 x 10^8 m/s

    # 1. Single Hop Calculation
    t_tx, t_pr, t_tot = calculate_delays(file_size, bandwidth, distance, v_light)
    print(f"Transmission Delay: {t_tx:.4f} s")
    print(f"Propagation Delay:  {t_pr * 1000:.2f} ms")
    print(f"Total One-Hop Time: {t_tot:.4f} s")
    assert abs(t_tx - 1.6) < 1e-6
    assert abs(t_pr - 0.01) < 1e-6

    # 2. Multi-hop Pipelining (3 hops, 1500-byte MTU)
    hops = 3
    mtu = 1500
    msg_delay, pkt_delay, pkts = multi_hop_comparison(file_size, bandwidth, distance / hops, v_light, hops, mtu)
    print(f"\n--- 3-Hop Pipelining Analysis ---")
    print(f"Monolithic Message Delay: {msg_delay:.4f} s")
    print(f"Pipelined Packet Delay:   {pkt_delay:.4f} s ({pkts} packets)")
    print(f"Pipelining Gain:          {((msg_delay - pkt_delay) / msg_delay) * 100:.1f}% reduction")

    # 3. Queuing Delay vs Traffic Intensity
    print("\n--- Queuing Delay Sensitivity ---")
    pkt_service_time = (1500 * 8) / bandwidth  # 1.2 ms
    for rho in [0.2, 0.5, 0.8, 0.95, 0.99]:
        q_wait = queuing_delay(rho, pkt_service_time)
        print(f"Traffic Intensity: {rho * 100:.0f}% -> Mean Queuing Delay: {q_wait * 1000:.2f} ms")
```

---

### 6. Concise Staff-Level Interview Answer

> "To find total one-hop latency, we compute transmission and propagation delays independently. Transmission delay is the time required to push data onto the wire: dividing the 16-megabit payload by 10 Mbps bandwidth yields $T_{\text{trans}} = 1.6\text{ seconds}$. Propagation delay is the physical transit time of electromagnetic energy: dividing 2,000 km by $2 \times 10^8\text{ m/s}$ yields $T_{\text{prop}} = 10\text{ ms}$. Summing them gives an end-to-end one-hop time of $1.61\text{ seconds}$.
>
> In multi-hop networks, packetization introduces massive store-and-forward pipelining gains. If transmitted as a monolithic 2 MB file across 3 hops, each router must buffer the full 16 Mbits before forwarding, accumulating $3 \times 1.6\text{ s} \approx 4.8\text{ seconds}$. Fragmenting into 1,500-byte packets allows intermediate routers to forward earlier packets concurrently while subsequent packets are still being received, cutting total delay to $\approx 1.63\text{ seconds}$.
>
> Finally, candidates should emphasize that bandwidth upgrades only shrink $T_{\text{trans}}$. Propagation delay is strictly bounded by the speed of light in the physical medium ($d/v$). Over global distances, propagation delay forms an unbreakable latency floor, which is why Edge CDNs and geo-distributed PoPs exist: you cannot accelerate light, so you must shorten the physical distance."
