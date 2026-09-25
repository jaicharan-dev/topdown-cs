---
id: 8-bandwidth-delay-product
title: "Bandwidth-Delay Product & Stop-and-Wait Efficiency"
description: "Compute Bandwidth-Delay Product (BDP), analyze Stop-and-Wait ARQ efficiency, solve the 64 KB TCP window limit with RFC 7323 window scaling, and simulate in Python."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A link has a bandwidth of 5 Mbps and a propagation delay of 20 ms. Calculate the bandwidth-delay product, the Stop-and-Wait link utilization for a 1000-bit frame, explain why Stop-and-Wait fails on Long Fat Networks (LFNs), and walk through how TCP window scaling overcomes the 64 KB limit."

---

The Bandwidth-Delay Product (BDP) is one of the most critical metrics in network engineering, governing TCP socket buffer sizing, router queue provisioning, and sliding window protocol design. 

Failing to account for BDP leads to catastrophic performance degradation: high-speed gigabit fiber links can be throttled to dial-up speeds simply because the protocol window is too small to keep the pipe filled.

---

### 1. Bandwidth-Delay Product (BDP) Deep Dive

The Bandwidth-Delay Product measures the volume of data that can be "in flight" inside the transmission channel at any given instant.

$$\text{BDP} = \text{Bandwidth } (R) \times \text{Delay } (T)$$

If you visualize a network link as a physical water pipe:
- **Bandwidth ($R$):** The cross-sectional width of the pipe (bits/second).
- **Delay ($T$):** The length of the pipe (seconds).
- **BDP:** The total physical volume of the pipe (bits or bytes).

```text
|<---------------------- Propagation Delay (20 ms) ---------------------->|
+-------------------------------------------------------------------------+
| >>> 100,000 bits in transit simultaneously through the physical wire >>>| ===> 5 Mbps
+-------------------------------------------------------------------------+
Sender                                                                 Receiver
```

#### One-Way BDP vs Round-Trip BDP:
In network literature, candidates must distinguish between two definitions:
1. **One-Way BDP ($R \times T_p$):** The capacity of the wire in a single direction.
   $$\text{BDP}_{\text{one-way}} = 5 \times 10^6\text{ bps} \times 0.02\text{ s} = \mathbf{100,000\text{ bits}} = \mathbf{12,500\text{ bytes}} \approx 12.2\text{ KiB}$$
2. **Round-Trip BDP ($R \times \text{RTT}$):** The total unacknowledged in-flight data needed to keep the sender's transmitter continuously busy while waiting for an acknowledgment (ACK):
   $$\text{BDP}_{\text{RTT}} = 5 \times 10^6\text{ bps} \times (2 \times 0.02\text{ s}) = \mathbf{200,000\text{ bits}} = \mathbf{25,000\text{ bytes}} \approx 24.4\text{ KiB}$$

---

### 2. Stop-and-Wait ARQ Efficiency Analysis

Stop-and-Wait requires the sender to transmit one frame of size $L$ and freeze until the receiver's ACK traverses the channel back to the sender.

#### Transmission Time ($T_t$):
$$T_t = \frac{L}{R} = \frac{1000\text{ bits}}{5 \times 10^6\text{ bps}} = 0.0002\text{ seconds} = \mathbf{0.2\text{ ms}}$$

#### Total Cycle Time ($T_{\text{cycle}}$):
Assuming processing delay and ACK transmission time are negligible:
$$T_{\text{cycle}} = T_t + 2 \cdot T_p = 0.2\text{ ms} + (2 \times 20\text{ ms}) = \mathbf{40.2\text{ ms}}$$

#### Link Utilization / Efficiency ($\eta$):
Link efficiency is the fraction of total cycle time during which useful bits are actively pushed onto the wire:
$$\eta = \frac{T_t}{T_t + 2 \cdot T_p} = \frac{0.2\text{ ms}}{40.2\text{ ms}} \approx 0.004975 \implies \mathbf{0.498\%}$$

#### Actual Achieved Throughput:
$$\text{Throughput} = \eta \times R = 0.004975 \times 5\text{ Mbps} \approx \mathbf{24.88\text{ kbps}}$$

Despite paying for a 5 Mbps link, Stop-and-Wait utilizes **less than half of one percent** of the link capacity! The sender spends 0.2 ms transmitting and 40 ms sitting idle.

---

### 3. Long Fat Networks (LFNs) & The Utilization Crisis

A **Long Fat Network (LFN)** is any network link with a large bandwidth-delay product (high bandwidth, high latency). Typical examples include:
- Trans-oceanic submarine fiber cables (e.g., 100 Gbps, 80 ms RTT).
- Geostationary satellite broadband (e.g., 50 Mbps, 500 ms RTT).
- Inter-data-center backbone interconnects.

In our problem, the link pipe has a volume of 100,000 bits. Under Stop-and-Wait, the sender pushes a tiny 1,000-bit frame into the pipe (filling only 1% of the volume) and immediately stops. The pipe remains **99% empty at all times**.

To achieve high utilization on an LFN, protocols must use **pipelining** (Sliding Window protocols like Go-Back-N, Selective Repeat, and TCP), keeping the entire BDP saturated with in-flight data.

---

### 4. The 64 KB TCP Window Size Trap & RFC 7323 Scaling

In the original TCP specification (RFC 793), the `Window Size` field in the TCP header is strictly **16 bits wide**:

$$\text{Max Advertised Window} = 2^{16} - 1 = 65,535\text{ bytes} \approx 64\text{ KB}$$

This 64 KB ceiling creates an artificial throughput barrier on modern high-speed links. The maximum theoretical throughput of a TCP connection is bounded by:

$$\text{Throughput}_{\max} \le \frac{\text{TCP Window Size}}{\text{RTT}}$$

#### The High-BDP Throughput Collapse:
Consider a modern cross-continental link:
- **Bandwidth:** $10\text{ Gbps}$
- **RTT:** $100\text{ ms} = 0.1\text{ s}$
- **Required BDP:** $10 \times 10^9\text{ bps} \times 0.1\text{ s} = 10^9\text{ bits} = \mathbf{125\text{ MB}}$

If this connection is restricted to the default 16-bit window ($65,535\text{ bytes} = 524,280\text{ bits}$):
$$\text{Throughput}_{\max} = \frac{524,280\text{ bits}}{0.1\text{ s}} = \mathbf{5.24\text{ Mbps}}$$

**A 10 Gbps link is throttled down to 5.24 Mbps—a staggering 99.95% waste of available capacity!**

#### The Fix: TCP Window Scale Option (RFC 1323 / RFC 7323)
To overcome this limitation, TCP includes a Window Scale option negotiated during the initial 3-way handshake (`SYN` packets):
- Defines a 1-byte scale factor $S$ (from 0 to 14).
- The true receive window is calculated as:
  $$\text{True Window} = \text{Advertised Window} \times 2^S$$
- With the maximum scale factor $S = 14$:
  $$\text{Max Scaled Window} = 65,535 \times 2^{14} = 65,535 \times 16,384 \approx \mathbf{1.07\text{ GB}}$$

This allows TCP to fully saturate high-speed 100 Gbps and multi-gigabit satellite connections over global distances.

---

### 5. Bufferbloat: The Danger of Oversizing Buffers

While sizing TCP socket buffers to match BDP is critical for throughput, oversizing intermediate router queue buffers creates **bufferbloat**:
- When network buffers are excessively large, TCP congestion control continues pushing packets into the queue instead of dropping them to signal congestion.
- The router queue fills to capacity, adding hundreds of milliseconds or seconds of queuing delay ($d_{\text{queue}}$) to every packet without increasing link throughput by a single bit.
- Modern congestion control algorithms like **BBR (Bottleneck Bandwidth and RTT)** and Active Queue Management schemes like **CoDel (Controlled Delay)** and **FQ-CoDel** explicitly measure link BDP to keep queue occupancy minimal.

---

### 6. Runnable Python Implementation

This script computes one-way and RTT BDP, analyzes Stop-and-Wait efficiency, and evaluates TCP throughput limits under default 64 KB vs RFC 7323 window-scaled configurations.

```python
"""
Bandwidth-Delay Product (BDP) & Protocol Efficiency Simulator
Demonstrates channel capacity, Stop-and-Wait degradation,
and TCP Window Scaling (RFC 7323).
"""


def compute_bdp(bandwidth_bps: int, prop_delay_sec: float) -> tuple[int, int]:
    """Calculates one-way and round-trip BDP in bits and bytes."""
    bdp_oneway_bits = int(bandwidth_bps * prop_delay_sec)
    bdp_rtt_bits = int(bandwidth_bps * (2 * prop_delay_sec))
    return bdp_oneway_bits, bdp_rtt_bits


def stop_and_wait_efficiency(frame_bits: int, bandwidth_bps: int, prop_delay_sec: float) -> tuple[float, float]:
    """
    Computes Stop-and-Wait link efficiency and achieved throughput.
    Returns: (efficiency_fraction, achieved_throughput_bps)
    """
    t_trans = frame_bits / bandwidth_bps
    t_cycle = t_trans + (2 * prop_delay_sec)
    efficiency = t_trans / t_cycle
    achieved_throughput = efficiency * bandwidth_bps
    return efficiency, achieved_throughput


def max_tcp_throughput(window_bytes: int, rtt_sec: float) -> float:
    """Calculates maximum theoretical TCP throughput bounded by window size."""
    return (window_bytes * 8) / rtt_sec


if __name__ == "__main__":
    bandwidth = 5 * 10**6       # 5 Mbps
    prop_delay = 20 * 10**-3    # 20 ms
    frame_size = 1000           # 1000 bits

    # 1. BDP Calculation
    bdp_1way, bdp_rtt = compute_bdp(bandwidth, prop_delay)
    print(f"One-Way BDP:    {bdp_1way:,} bits ({bdp_1way // 8:,} bytes)")
    print(f"Round-Trip BDP: {bdp_rtt:,} bits ({bdp_rtt // 8:,} bytes)")
    assert bdp_1way == 100_000
    assert bdp_rtt == 200_000

    # 2. Stop-and-Wait Efficiency
    eff, actual_bw = stop_and_wait_efficiency(frame_size, bandwidth, prop_delay)
    print(f"\nStop-and-Wait Efficiency: {eff * 100:.3f}%")
    print(f"Achieved Throughput:     {actual_bw / 1000:.2f} kbps (of 5000 kbps)")
    assert round(eff * 100, 2) == 0.50

    # 3. Long Fat Network & TCP 64 KB Limit Analysis
    print("\n--- 10 Gbps Cross-Continental LFN (RTT = 100 ms) ---")
    lfn_bandwidth = 10 * 10**9   # 10 Gbps
    lfn_rtt = 0.100              # 100 ms
    lfn_bdp_bytes = int((lfn_bandwidth * lfn_rtt) / 8)
    print(f"Required Window to fill link: {lfn_bdp_bytes / 10**6:.2f} MB")

    # Default 16-bit TCP Window (65,535 bytes)
    default_wnd = 65535
    tput_unscaled = max_tcp_throughput(default_wnd, lfn_rtt)
    print(f"Throughput (Default 64 KB Window): {tput_unscaled / 10**6:.2f} Mbps (Efficiency: {(tput_unscaled / lfn_bandwidth) * 100:.3f}%)")

    # Scaled TCP Window with RFC 7323 (scale factor = 11 -> ~134 MB window)
    scale_factor = 11
    scaled_wnd = default_wnd * (2**scale_factor)
    tput_scaled = max_tcp_throughput(scaled_wnd, lfn_rtt)
    effective_tput = min(tput_scaled, lfn_bandwidth)
    print(f"Throughput (RFC 7323 Scaled Window): {effective_tput / 10**9:.2f} Gbps (Efficiency: {(effective_tput / lfn_bandwidth) * 100:.1f}%)")
```

---

### 7. Concise Staff-Level Interview Answer

> "The Bandwidth-Delay Product (BDP) represents the volume of data that can exist in transit on the link at any given moment. For a 5 Mbps link with a 20 ms propagation delay, the one-way BDP is $5\text{ Mbps} \times 0.02\text{ s} = 100,000\text{ bits}$ (12.5 KB), while the round-trip BDP required to saturate the connection is 200,000 bits (25 KB).
>
> In Stop-and-Wait ARQ with a 1,000-bit frame, transmission takes only 0.2 ms, but the sender must wait 40 ms of round-trip propagation for the ACK. The link efficiency is $\eta = \frac{0.2}{40.2} \approx 0.498\%$, delivering an effective throughput of just 24.88 kbps. Because the channel holds 100,000 bits and the sender only transmits 1,000 bits before freezing, the link pipe is 99% empty.
>
> On Long Fat Networks (high-bandwidth, high-latency links), Stop-and-Wait is unusable. Furthermore, standard TCP historically suffered from the same issue due to its 16-bit `Window Size` field, which capped unacknowledged in-flight data at 64 KB. On a 10 Gbps link with 100 ms RTT, a 64 KB window limits throughput to just 5.24 Mbps. Modern systems resolve this using the **TCP Window Scale Option (RFC 7323)**, which applies a left-shift factor up to 14 bits, unlocking receive windows up to 1 GB to fully saturate high-BDP links."
