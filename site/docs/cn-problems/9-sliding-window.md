---
id: 9-sliding-window
title: "Sliding Window ARQ: Window Size & Link Efficiency"
description: "Derive N = 1 + 2a for 100% link utilization, analyze efficiency under halved windows and lossy links, compare GBN vs SR sequence number limits, and simulate in Python."
sidebar_position: 9
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Using a link with bandwidth 5 Mbps and propagation delay 20 ms, a sender uses Sliding Window ARQ with 1000-bit frames. Calculate the minimum window size for full utilization using $N = 1 + 2a$, analyze efficiency with a halved window, compare Go-Back-N vs. Selective Repeat sequence numbering constraints, and explain the sequence number ambiguity trap."

---

Sliding window protocols bridge physical channel limits with software flow control. Instead of idling while waiting for individual acknowledgments, pipelining allows a transmitter to keep multiple unacknowledged frames in flight.

Staff-level networking interviews frequently probe beyond the $N = 1 + 2a$ formula to evaluate your understanding of sequence number space constraints ($W_s + W_r \le 2^k$) and why protocol designs must prevent catastrophic frame misidentification.

---

### 1. Derivation of $a$ and Minimum Window Size ($N = 1 + 2a$)

#### Transmission Time ($T_t$):
$$T_t = \frac{\text{Frame Size}}{\text{Bandwidth}} = \frac{1000\text{ bits}}{5 \times 10^6\text{ bps}} = 0.0002\text{ s} = \mathbf{0.2\text{ ms}}$$

#### Dimensionless Ratio $a$:
The ratio $a$ represents the one-way propagation delay measured in units of frame transmission time:
$$a = \frac{T_p}{T_t} = \frac{20\text{ ms}}{0.2\text{ ms}} = \mathbf{100}$$
*(Physical intuition: The physical medium is long enough to hold 100 individual 1000-bit frames along its length before the first bit reaches the destination).*

#### Round-Trip Cycle Time:
For a sender transmitting frame 0, the acknowledgment for frame 0 arrives after:
$$T_{\text{cycle}} = T_t + T_p (\text{data}) + T_{\text{proc}} + T_{\text{ack}} + T_p (\text{ACK})$$
Assuming negligible processing and ACK transmission times:
$$T_{\text{cycle}} = T_t + 2 \cdot T_p = T_t (1 + 2a)$$

#### Condition for 100% Link Utilization:
To ensure the sender never experiences idle pipeline bubbles, it must continuously transmit frames for the entire duration of $T_{\text{cycle}}$ until the ACK for the first frame returns:
$$N \ge \frac{T_{\text{cycle}}}{T_t} = \frac{T_t + 2 \cdot T_p}{T_t} = 1 + 2a$$
$$N = 1 + 2(100) = \mathbf{201\text{ frames}}$$

A sender window of **$N = 201\text{ frames}$** keeps the 5 Mbps pipe 100% saturated.

```text
Time (ms)   Sender Action                                             Receiver Action
  0.0       Start transmitting Frame 1                                ...
  0.2       Finish Frame 1, start Frame 2                             ...
  ...       Continuously transmitting Frames 3 to 200                 ...
 20.0       Frame 101 on wire                                         Frame 1 arrives, ACK 1 sent
 40.0       Start transmitting Frame 201                              ...
 40.2       Finish Frame 201; ACK 1 arrives! Window slides forward -> ZERO IDLE TIME!
```

---

### 2. Efficiency with a Halved Window Size ($W = 100$)

When the actual sender window $W$ is less than the optimal capacity $1 + 2a$:
$$\eta = \frac{W \cdot T_t}{T_{\text{cycle}}} = \frac{W \cdot T_t}{T_t (1 + 2a)} = \frac{W}{1 + 2a}$$

For a halved window size $W = 100$ frames:
$$\eta = \frac{100}{201} \approx 0.4975 \implies \mathbf{49.75\%}$$

#### The Physical Explanation:
- The sender transmits 100 frames continuously: $100 \times 0.2\text{ ms} = 20.0\text{ ms}$.
- At $t = 20.0\text{ ms}$, the sender has exhausted its 100-frame window. It is legally forced by the protocol to freeze and wait.
- The ACK for Frame 1 does not arrive until $t = 40.2\text{ ms}$.
- The sender sits completely idle from $t = 20.0\text{ ms}$ to $t = 40.2\text{ ms}$ ($20.2\text{ ms}$ of wasted wire time).
- Because active transmission time equals idle wait time, efficiency drops to **$\approx 50\%$**.

---

### 3. Protocol Comparison: Stop-and-Wait vs GBN vs Selective Repeat

| Feature | Stop-and-Wait | Go-Back-N (GBN) | Selective Repeat (SR) |
| :--- | :--- | :--- | :--- |
| Sender Window Size ($W_s$) | 1 | $N$ (up to $2^k - 1$) | $N$ (up to $2^{k-1}$) |
| Receiver Window Size ($W_r$) | 1 | 1 | $W_s$ (up to $2^{k-1}$) |
| Sequence Space Rule | $W_s + W_r \le 2^k$ | $W_s + 1 \le 2^k$ | $W_s + W_r \le 2^k$ |
| Maximum Window for $k$ bits | $W_s = 1$ | $W_s = 2^k - 1$ | $W_s = 2^{k-1}$ |
| Acknowledgment Type | Individual ACK | Cumulative ACK | Individual ACK (or SACK) |
| Out-of-Order Buffering | No (Discarded) | No (Discarded) | Yes (Buffered in receiver queue) |
| Retransmission on Loss | 1 frame | All $W_s$ unacknowledged frames | Only the specific lost frame |

---

### 4. The Sequence Number Ambiguity Trap

Why can a Go-Back-N protocol with $k$-bit sequence numbers have a maximum window size of only $2^k - 1$, rather than $2^k$?

#### The Disaster Scenario ($W_s = 2^k$ in GBN):
Let sequence numbers be 2 bits wide ($k = 2$), providing 4 available numbers: $\{0, 1, 2, 3\}$. Suppose an engineer naively sets $W_s = 4$:
1. Sender transmits frames: **0, 1, 2, 3**.
2. Receiver receives all 4 frames cleanly, advances its expected sequence pointer to **0** (wrapping around), and transmits cumulative ACK 0, 1, 2, 3.
3. **The Disaster:** A network partition or router failure drops **all 4 ACKs**.
4. The sender's retransmission timer for frame 0 expires.
5. The sender retransmits **frame 0** (the old data!).
6. The receiver is waiting for **frame 0** (the new, next-generation data!).
7. The receiver accepts the old frame 0 as the brand new frame 0, storing corrupted duplicate data without triggering any warning!

```text
Sender (Ws = 4, k = 2)                            Receiver (Wr = 1)
  |--- Frame 0, 1, 2, 3 ------------------------->| Receives all 4. Expected bit = 0
  |                                               |
  |<-- [ALL ACKs LOST IN TRANSIT] ----------------|
  |                                               |
  | (Timeout!)                                    |
  |--- Frame 0 (Old Data) ----------------------->| Accepts Frame 0 as NEW data!
                                                    *** SILENT DATA CORRUPTION ***
```

#### The Mathematical Fix ($W_s \le 2^k - 1$):
With $W_s = 3$ ($2^2 - 1$):
- Sender sends frames 0, 1, 2.
- If all ACKs are lost, sender retransmits frame 0.
- Receiver had advanced to expect frame 3. Since frame 0 $\ne$ frame 3, the receiver recognizes frame 0 as a duplicate, silently discards the payload, and retransmits ACK 2!

For Selective Repeat, since both sender and receiver slide windows forward independently:
$$W_s + W_r \le 2^k \implies \text{If } W_s = W_r, \text{ then } W_s \le 2^{k-1}$$

---

### 5. Link Efficiency under Packet Loss ($p$)

On clean links, GBN and SR achieve identical maximum throughput ($\eta = 1$). Over noisy or lossy links with frame drop probability $p$:

1. **Stop-and-Wait:**
   $$\eta_{\text{SW}} = \frac{1 - p}{1 + 2a}$$
2. **Go-Back-N:**
   When a single frame drops, the receiver discards all subsequent $N - 1$ arriving frames. All $N$ frames must be retransmitted:
   $$\eta_{\text{GBN}} = \frac{1 - p}{1 + 2a \cdot p}$$
   *(As loss $p$ grows, GBN efficiency collapses rapidly).*
3. **Selective Repeat:**
   Only the dropped frame is retransmitted. Throughput degrades gracefully:
   $$\eta_{\text{SR}} = 1 - p$$

#### Modern TCP Solution (RFC 2018 SACK):
Standard TCP historically behaved like Go-Back-N. RFC 2018 introduced **Selective Acknowledgment (SACK)** options, allowing TCP receivers to inform the sender of non-contiguous buffered blocks, achieving the optimal efficiency of Selective Repeat while retaining cumulative ACKs.

---

### 6. Runnable Python Implementation

This script calculates optimal window sizing, models efficiency degradation under halved windows, and simulates Go-Back-N vs Selective Repeat behavior under packet loss.

```python
"""
Sliding Window ARQ Simulator
Evaluates window sizing N = 1 + 2a, sequence number bounds,
and throughput degradation under packet loss for GBN vs SR.
"""


def calculate_optimal_window(bandwidth_bps: int, prop_delay_sec: float, frame_bits: int) -> tuple[float, float, int]:
    """Calculates transmission delay, ratio a, and minimum window size for 100% utilization."""
    t_trans = frame_bits / bandwidth_bps
    a = prop_delay_sec / t_trans
    n_optimal = int(-(- (1 + 2 * a) // 1))  # Ceiling to integer
    return t_trans, a, n_optimal


def window_efficiency(window_size: int, a: float) -> float:
    """Calculates theoretical link efficiency for a given window size and ratio a."""
    max_w = 1 + 2 * a
    return min(1.0, window_size / max_w)


def arq_loss_efficiency(p_loss: float, a: float) -> dict[str, float]:
    """Calculates theoretical efficiency under frame loss probability p."""
    eff_sw = (1 - p_loss) / (1 + 2 * a)
    eff_gbn = (1 - p_loss) / (1 + (2 * a * p_loss))
    eff_sr = 1 - p_loss
    return {"Stop-and-Wait": eff_sw, "Go-Back-N": eff_gbn, "Selective-Repeat": eff_sr}


def validate_sequence_space(k_bits: int, ws: int, wr: int) -> bool:
    """Validates the sequence number space condition: Ws + Wr <= 2^k."""
    return (ws + wr) <= (2**k_bits)


if __name__ == "__main__":
    bandwidth = 5 * 10**6      # 5 Mbps
    prop_delay = 20 * 10**-3   # 20 ms
    frame_size = 1000          # 1000 bits

    # 1. Optimal Window Derivation
    t_tx, a_ratio, n_opt = calculate_optimal_window(bandwidth, prop_delay, frame_size)
    print(f"Transmission Time (Tt): {t_tx * 1000:.2f} ms")
    print(f"Ratio a (Tp / Tt):       {a_ratio:.1f}")
    print(f"Optimal Window Size (N): {n_opt} frames")
    assert a_ratio == 100.0
    assert n_opt == 201

    # 2. Halved Window Efficiency
    halved_w = 100
    eff_halved = window_efficiency(halved_w, a_ratio)
    print(f"\nEfficiency with Halved Window (W = {halved_w}): {eff_halved * 100:.2f}%")
    assert round(eff_halved * 100, 1) == 49.8

    # 3. Sequence Number Ambiguity Validation
    k = 3  # 3-bit sequence numbers -> 8 values (0..7)
    print("\n--- Sequence Space Validation (k = 3 bits, 2^k = 8) ---")
    print(f"GBN with Ws = 7, Wr = 1: Valid? {validate_sequence_space(k, 7, 1)}")
    print(f"GBN with Ws = 8, Wr = 1: Valid? {validate_sequence_space(k, 8, 1)} (DISASTER TRAP!)")
    print(f"SR  with Ws = 4, Wr = 4: Valid? {validate_sequence_space(k, 4, 4)}")
    print(f"SR  with Ws = 5, Wr = 5: Valid? {validate_sequence_space(k, 5, 5)} (DISASTER TRAP!)")
    assert validate_sequence_space(k, 7, 1) is True
    assert validate_sequence_space(k, 8, 1) is False

    # 4. Efficiency under 5% Packet Loss
    loss_rate = 0.05
    efficiencies = arq_loss_efficiency(loss_rate, a_ratio)
    print(f"\n--- Efficiency Comparison under {loss_rate * 100:.0f}% Packet Loss ---")
    for protocol, eff in efficiencies.items():
        print(f"{protocol:<18}: {eff * 100:.2f}%")
```

---

### 7. Concise Staff-Level Interview Answer

> "To find the window size for 100% link utilization, we first compute transmission delay $T_t = \frac{1000\text{ bits}}{5\text{ Mbps}} = 0.2\text{ ms}$ and the dimensionless ratio $a = \frac{T_p}{T_t} = \frac{20\text{ ms}}{0.2\text{ ms}} = 100$.
>
> Full utilization requires the transmitter to send continuously for an entire round-trip time ($T_t + 2T_p$). Dividing this total cycle by $T_t$ gives $N = 1 + 2a = 1 + 2(100) = \mathbf{201\text{ frames}}$. If the window is halved to 100 frames, efficiency drops linearly to $\approx 50\%$ because the sender exhausts its window in 20 ms and sits idle for the remaining 20.2 ms waiting for the first ACK.
>
> In protocol design, sequence numbers must satisfy $W_s + W_r \le 2^k$. For Go-Back-N ($W_r = 1$), the maximum sender window is $2^k - 1$. If an engineer mistakenly sets $W_s = 2^k$ and all ACKs are lost, the sender retransmits frame 0 while the receiver, having wrapped around, expects the *next* frame 0; the receiver silently accepts old duplicate data as new. In Selective Repeat, where both sides buffer out-of-order frames, window sizes must not exceed $2^{k-1}$."
