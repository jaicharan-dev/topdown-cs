---
id: 7-delay-calculations
title: "Transmission Delay against Propagation Delay"
description: "A wider pipe does not make it shorter and a shorter pipe does not make it wider: two delays that answer different questions, and the ratio that says which one you should be fixing"

sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A sender transmits a file of size 2 MB over a link with a bandwidth of 10 Mbps. The distance is 2000 km, and the signal propagates at $2 \times 10^8\text{ m/s}$. Calculate the transmission delay, propagation delay, total one-hop time, and analyze how packet switching with store-and-forward pipelining alters end-to-end latency."

---

### Picture it

A garden hose, and two completely different questions you might ask about it.

**"How long before the first drop comes out the far end?"** That depends on how long the hose is and how fast water moves along it. It does not depend one bit on how wide the hose is, and it does not depend on how much water you intend to send. A kilometre of hose takes a certain time to traverse and that is that.

**"How long before all the water is in?"** That depends on how much water you have and how wide the hose is. It does not depend on how long the hose is. A bathtub through a narrow hose takes the same time to pour whether the far end is in the next room or the next county.

Those are propagation delay and transmission delay, and **they are not two flavours of slowness.** They are answers to different questions, and the single most useful consequence is this: **widening the hose does not shorten it, and shortening it does not widen it.** Double the bandwidth and the pour time halves while the travel time is untouched. Halve the distance and the travel time halves while the pour time is untouched. Candidates who treat latency as one number look for one fix, and there is no one fix.

Which raises the only question that matters in practice: **which of the two is your problem?** Take the ratio and you have your answer immediately, and on these numbers it is not close. Pouring two megabytes through a ten megabit pipe takes 1.6 seconds. The two thousand kilometres takes ten milliseconds. **The pour is a hundred and sixty times the journey.** Moving the server closer would be almost entirely pointless; a faster link would help enormously.

And then the part people have not usually thought about, which is what happens when there is more than one hose.

A router cannot start forwarding a packet the moment the first bit arrives. **It has to have the whole thing** before it can check the frame is intact and decide where to send it. So with three links in a row and the file sent as one enormous packet, you pay the full 1.6-second pour three times over, once per link, in sequence. **The file is poured, then poured again, then poured again**, and that is the worst thing about sending it as one piece.

The fix is to chop it up, and the reason the fix works is pleasing: once the file is in small pieces, the second hose can be pouring piece one while the first hose is already pouring piece two. **The three pours stop being sequential and start overlapping**, and the total collapses from three pours to roughly one pour plus a short fill. On these numbers that is 4.83 seconds becoming 1.63, and the saving is two thirds of the time.

---

### The proper terms

#### The four delays

**Transmission delay**, `Tt`, is the time to push all the bits of a message onto the link. It is the message size over the link rate:

$$T_t = \frac{L}{B}$$

It depends on size and bandwidth and on nothing else. Distance does not appear.

**Propagation delay**, `Tp`, is the time for one bit to travel the length of the link. It is distance over signal speed:

$$T_p = \frac{d}{v}$$

It depends on distance and medium and on nothing else. Neither size nor bandwidth appears. In copper or fibre, `v` is typically 2 to 2.3 times `10^8` m/s, which is around two thirds of `c` because the signal travels through a dielectric rather than through vacuum.

**Queueing delay** is time spent in a router's buffer waiting for the link to free up. It is the only one of the four that depends on other people's traffic, which makes it the only one that is variable, and it is the source of essentially all jitter.

**Processing delay** is the router's own work: checking the frame, looking up the route, moving the packet between interfaces. On modern hardware it is microseconds and usually ignored in these problems.

#### The ratio that tells you which regime you are in

The dimensionless ratio

$$a = \frac{T_p}{T_t}$$

is the single most useful derived quantity, because it says what kind of link you are looking at.

**`a` far below 1** means transmission dominates. The link is **bandwidth-limited**, the pipe is effectively short and fat, one message fills it many times over, and simple one-at-a-time protocols work perfectly well. This problem has `a = 0.00625`.

**`a` far above 1** means propagation dominates. The link is **latency-limited**, a long thin pipe holding many messages in flight at once, and the whole machinery of windowing exists for this case. A small packet on a satellite link is the classic example.

**`a` near 1** is the transition.

#### Why a router must wait

**Store-and-forward** is the rule that a router receives a packet in its entirety before forwarding it. There are two reasons and both are structural: the frame check sequence is at the end, so correctness cannot be known until the last bit arrives, and forwarding is a decision that needs the header plus a known-good frame.

The consequence is that **each hop costs a full transmission delay**, so `h` hops of one packet cost `h` times `Tt`, not one `Tt` plus some travel.

The alternative, **cut-through switching**, begins forwarding as soon as the destination address has been read, which cuts per-hop latency dramatically at the cost of being able to relay a corrupted frame. It appears in low-latency data centre and InfiniBand switches, not in the general Internet.

#### Pipelining

Splitting a message into `N` packets across `h` links lets the hops **overlap**: link 2 transmits packet 1 while link 1 transmits packet 2. The last packet arrives at:

$$T_{\text{total}} = (N + h - 1) \cdot T_{t,\text{packet}} + h \cdot T_p$$

The `N` term is the file pouring through once. The `h - 1` term is the **pipeline fill**, the cost of getting the first packet to the last link before steady state. **This is the same arithmetic as an instruction pipeline in a CPU**, and it is the whole reason the Internet is packet-switched rather than message-switched.

---

### Work it out

#### Given

| Quantity | Value |
| :--- | :--- |
| File size | 2 MB |
| Bandwidth `B` | 10 Mbps |
| Distance `d` | 2,000 km |
| Signal speed `v` | `2 x 10^8` m/s |

**State the units convention before computing**, because the answer depends on it and the question does not say. Taking `MB` as decimal, `2 x 10^6` bytes:

`L = 2 x 10^6 x 8 = 16 x 10^6 bits`

If the intended reading were binary, `2 MiB = 2 x 2^20` bytes, then `L = 16,777,216 bits` and the transmission delay becomes 1.678 s instead of 1.600 s, a 4.9% difference. **Saying which you chose and why takes five seconds and pre-empts the follow-up.** Decimal is standard for link rates, where Mbps always means `10^6` bits per second, so decimal for the file size keeps the arithmetic consistent.

#### Part 1: transmission delay

$$T_t = \frac{L}{B} = \frac{16 \times 10^6 \text{ bits}}{10 \times 10^6 \text{ bits/s}} = \mathbf{1.6 \text{ s}}$$

Note what is absent: **the distance does not appear.** Move the receiver to the next room and `Tt` is still 1.6 s.

#### Part 2: propagation delay

$$T_p = \frac{d}{v} = \frac{2 \times 10^6 \text{ m}}{2 \times 10^8 \text{ m/s}} = 0.01 \text{ s} = \mathbf{10 \text{ ms}}$$

Note what is absent here: **neither the file size nor the bandwidth appears.** Send one bit or a gigabyte, upgrade the link to 10 Gbps, and `Tp` is still 10 ms.

#### Part 3: total one-hop time

$$T_{\text{total}} = T_t + T_p = 1.6 + 0.01 = \mathbf{1.61 \text{ s}}$$

This is the time until the **last bit arrives**. Two related figures are worth separating, since interviewers often ask which one you computed:

| Question | Expression | Value |
| :--- | :--- | :---: |
| When does the first bit arrive? | `Tp` | 10 ms |
| When does the last bit leave the sender? | `Tt` | 1.6 s |
| When does the last bit arrive? | `Tt + Tp` | **1.61 s** |

#### Part 4: which delay is the problem

$$\frac{T_t}{T_p} = \frac{1.6}{0.01} = \mathbf{160}$$

$$a = \frac{T_p}{T_t} = \frac{0.01}{1.6} = \mathbf{0.00625}$$

**Transmission dominates by a factor of 160**, and propagation is 0.6% of the total. So:

| Intervention | Effect on `Tt` | Effect on `Tp` | New total |
| :--- | :---: | :---: | :---: |
| Double the bandwidth to 20 Mbps | 1.6 to **0.8 s** | unchanged | 0.81 s, **a 50% saving** |
| Halve the distance to 1,000 km | unchanged | 10 to **5 ms** | 1.605 s, a 0.3% saving |
| Move the server to the same city, 50 km | unchanged | 10 ms to **0.25 ms** | 1.600 s, a 0.6% saving |

This is the practical payoff of the ratio. **Relocating the server to the same building would save 0.6% of the transfer time**, and doubling the link rate saves half of it. With `a = 0.00625` this is a bandwidth-limited transfer and the answer to "how do we make it faster" is bandwidth, full stop.

The reverse case is worth naming for contrast. Send a 1,000-bit packet over a geostationary satellite link at 1 Mbps with a 250 ms one-way propagation delay: `Tt` is 1 ms, `Tp` is 250 ms, `a = 250`. There, **doubling the bandwidth would save 0.5 ms out of 251**, and the only thing that helps is sending more data per round trip, which is what windowing does.

#### Part 5: three hops, as one packet

Now put three links in series with the same characteristics. **Store-and-forward** means each router receives the whole packet before forwarding, so each link costs a full transmission delay:

$$T = h \cdot (T_t + T_p) = 3 \times (1.6 + 0.01) = \mathbf{4.83 \text{ s}}$$

```
  link 1:  |<------- pour 1.6 s ------->|--10ms--|
  link 2:                               |<------- pour 1.6 s ------->|--10ms--|
  link 3:                                                            |<------- pour 1.6 s ------->|--10ms--|
           0                                                                                              4.83 s
```

**The file is poured three times, in sequence, because nothing can overlap.** Link 2 cannot begin until the entire file has arrived at router 1. That is the cost of sending a large message as a single unit, and it is linear in the hop count, which for a path of fifteen hops would be catastrophic.

#### Part 6: three hops, pipelined

Split the file into packets of 1,000 bytes:

`N = 16 x 10^6 / 8,000 = ` **2,000 packets**

`Tt per packet = 8,000 / 10 x 10^6 = 0.8 ms`

$$T = (N + h - 1) \cdot T_{t,\text{packet}} + h \cdot T_p$$
$$T = (2000 + 2) \times 0.0008 + 3 \times 0.01 = 1.6016 + 0.03 = \mathbf{1.6316 \text{ s}}$$

```
  link 1:  |p1|p2|p3|p4| ... |p2000|
  link 2:     |p1|p2|p3| ... |p1999|p2000|
  link 3:        |p1|p2| ... |p1998|p1999|p2000|
           0                                    1.63 s
                ^^^^^
                the pipeline fill: 2 packet times
```

| | One packet | Pipelined, 2,000 packets |
| :--- | :---: | :---: |
| Total time | 4.830 s | **1.632 s** |
| Saving | | **3.198 s, 66.2%** |

The structure of the result is what to point at. The `N` term, 1.6016 s, is **the file pouring through once**. The `h - 1` term is two packet times, 1.6 ms, the cost of filling the pipeline. The `h · Tp` term is 30 ms of travel. So the pipelined total is essentially **one transmission plus a little**, where the unsplit version was three transmissions.

And the general form matters more than this instance. As `N` grows, the total approaches `Tt + (h-1)·Tt_packet + h·Tp`, so **the hop count stops multiplying the file size and starts multiplying only the small packet size.** That is why the Internet is packet-switched: it decouples end-to-end delay from path length in a way that message switching cannot.

#### Part 7: how small should the packets be?

Pipelining improves with more packets, so why not use 1-byte packets? Because the 44-byte header does not shrink:

Part 6 ignored the header, which flatters small packets. Counting a 44-byte header on every packet, so that each frame is `payload + 44` bytes on the wire:

| Packet payload | Packets | `Tt` per frame | Pipeline fill | Header overhead | Total |
| :---: | :---: | :---: | :---: | :---: | :---: |
| whole file, one packet | 1 | 1.600 s | 3.200 s | 0.00% | 4.830 s |
| 64 KB | 31 | 52.5 ms | 105 ms | 0.07% | 1.761 s |
| **8 KB** | **245** | **6.59 ms** | **13.2 ms** | **0.53%** | **1.657 s** |
| 1 KB | 1,954 | 0.854 ms | 1.71 ms | 4.12% | 1.701 s |
| 64 B | 31,250 | 86 us | 173 us | **40.74%** | 2.730 s |
| 8 B | 250,000 | 42 us | 83 us | **84.62%** | 10.430 s |

**There is a genuine interior optimum**, and on these numbers it is around 8 KB rather than at either extreme. The two costs pull in opposite directions: larger packets lengthen the pipeline fill, so the hop count hurts more, while smaller packets let the fixed header take a growing share of every frame.

Read the table from both ends. Going up from 8 KB, the 64 KB row pays 105 ms of pipeline fill to save half a percent of header, which is a net loss. Going down, the 1 KB row is **slightly worse than 8 KB**, the 64-byte row costs 2.73 s because 40% of the link is now header, and the 8-byte row takes 10.4 s, **worse than sending the whole file as one unsplit packet.** That is the trade the framing-efficiency problem is about, and it is the real reason MTUs sit in the low thousands of bytes.

#### Verify it

```python
"""
Transmission against propagation delay, the ratio a, store-and-forward
across several hops, and the pipelining gain with its optimum.
"""

FILE_BYTES = 2 * 10**6          # 2 MB, decimal
BANDWIDTH = 10 * 10**6          # 10 Mbps
DISTANCE = 2000 * 10**3         # 2000 km in metres
SPEED = 2 * 10**8               # m/s
HOPS = 3
HEADER = 44                     # bytes, for the packet-size trade


def t_trans(bits, bw=BANDWIDTH):
    return bits / bw


def t_prop(d=DISTANCE, v=SPEED):
    return d / v


if __name__ == "__main__":
    print("-- units: the question says 2 MB and does not say which")
    for label, nbytes in (("decimal, 2e6 B", 2 * 10**6),
                          ("binary, 2*2^20 B", 2 * 2**20)):
        bits = nbytes * 8
        print(f"   {label:<20} {bits:>12,} bits -> Tt = "
              f"{t_trans(bits):.4f} s")
    print("   decimal is consistent with Mbps meaning 10^6 bits/s, "
          "so use it and say so")

    L = FILE_BYTES * 8
    tt, tp = t_trans(L), t_prop()
    print(f"\n-- Part 1: Tt = L/B = {L:,}/{BANDWIDTH:,} = {tt} s")
    print(f"   distance does not appear")
    print(f"-- Part 2: Tp = d/v = {DISTANCE:,}/{SPEED:,} = {tp} s = "
          f"{tp*1000:.0f} ms")
    print(f"   neither size nor bandwidth appears")
    print(f"-- Part 3: one hop, last bit arrives at Tt + Tp = {tt + tp} s")
    print(f"   first bit arrives at Tp = {tp*1000:.0f} ms; "
          f"last bit leaves at Tt = {tt} s")

    print(f"\n-- Part 4: which delay is the problem")
    print(f"   Tt / Tp = {tt/tp:.0f}, so transmission dominates")
    print(f"   a = Tp / Tt = {tp/tt:.5f}  "
          f"({'bandwidth-limited' if tp/tt < 1 else 'latency-limited'})")
    base = tt + tp
    for desc, bw, d in (("double bandwidth", 2 * BANDWIDTH, DISTANCE),
                        ("halve distance", BANDWIDTH, DISTANCE // 2),
                        ("server in the same city", BANDWIDTH, 50 * 10**3)):
        t = t_trans(L, bw) + t_prop(d)
        print(f"   {desc:<24} -> {t:.4f} s, saves "
              f"{100*(base-t)/base:5.1f}%")

    print(f"\n   the opposite regime, for contrast: 1000 bits over a "
          f"geostationary satellite")
    sat_tt, sat_tp = 1000 / 10**6, 0.25
    print(f"     Tt = {sat_tt*1000:.0f} ms, Tp = {sat_tp*1000:.0f} ms, "
          f"a = {sat_tp/sat_tt:.0f} -> latency-limited")
    print(f"     doubling bandwidth there saves "
          f"{100*((sat_tt+sat_tp)-(sat_tt/2+sat_tp))/(sat_tt+sat_tp):.2f}%")

    print(f"\n-- Part 5: {HOPS} hops, whole file as one packet")
    naive = HOPS * (tt + tp)
    print(f"   store-and-forward: each router needs the WHOLE packet before")
    print(f"   forwarding, because the frame check is at the end")
    print(f"   h * (Tt + Tp) = {HOPS} * ({tt} + {tp}) = {naive:.3f} s")
    print(f"   the file is poured {HOPS} times, in sequence")

    print(f"\n-- Part 6: pipelined with 1000-byte packets")
    pkt = 1000
    n = L // (pkt * 8)
    tt_p = t_trans(pkt * 8)
    piped = (n + HOPS - 1) * tt_p + HOPS * tp
    print(f"   N = {n:,} packets, Tt per packet = {tt_p*1000:.1f} ms")
    print(f"   (N + h - 1) * Tt_p + h * Tp = ({n} + {HOPS-1}) * {tt_p} + "
          f"{HOPS} * {tp}")
    print(f"     = {n * tt_p:.4f} (the file, poured once)")
    print(f"     + {(HOPS-1) * tt_p:.4f} (pipeline fill)")
    print(f"     + {HOPS * tp:.4f} (travel)")
    print(f"     = {piped:.4f} s")
    print(f"   against {naive:.3f} s: saves {naive - piped:.3f} s, "
          f"{100*(1 - piped/naive):.1f}%")

    print(f"\n-- Part 7: packet size is a trade, not 'smaller is better'")
    print(f"   {'payload':>10}{'packets':>10}{'Tt/pkt':>11}{'fill':>11}"
          f"{'hdr ovhd':>10}{'total':>10}")
    best = None
    for pay in (FILE_BYTES, 65536, 8192, 1024, 64, 8):
        frame = pay + HEADER
        npk = max(1, -(-FILE_BYTES // pay))
        ttp = t_trans(frame * 8)
        total = (npk + HOPS - 1) * ttp + HOPS * tp
        ovhd = HEADER / frame
        label = f"{pay:,}" if pay < FILE_BYTES else "whole file"
        print(f"   {label:>10}{npk:>10,}{ttp*1000:>10.3f}m"
              f"{(HOPS-1)*ttp*1000:>10.3f}m{100*ovhd:>9.2f}%"
              f"{total:>9.3f}s")
        if best is None or total < best[1]:
            best = (label, total)
    print(f"   best of those: {best[0]} bytes at {best[1]:.3f} s")
    print("   larger packets lengthen the pipeline fill; smaller ones let the")
    print("   fixed header dominate. That trade is the framing-efficiency "
          "problem.")
```

---

### What they ask next

**"Which delay depends on distance?"**
Only **propagation delay**, `d/v`. **Transmission delay** is `L/B` and the distance does not appear in it at all, just as neither the size nor the bandwidth appears in propagation delay. The two are answers to different questions, which is why **widening the pipe does not shorten it and shortening it does not widen it**, and why there is no single fix for "the transfer is slow".

**"What is `a` and why does it matter?"**
`a = Tp / Tt`, and it tells you which regime you are in. Here `a = 0.00625`, far below 1, so the link is **bandwidth-limited**: the message fills the pipe 160 times over. Far above 1 means **latency-limited**, a long thin pipe holding many messages at once, which is what windowing exists for. **The ratio tells you what to fix before you compute anything else.**

**"So how would you speed this transfer up?"**
Bandwidth, and nothing else is close. Doubling the link rate to 20 Mbps saves **50%** of the total. Moving the server from 2,000 km to the same city saves **0.6%**. That asymmetry is the entire practical content of the ratio, and candidates who treat latency as one number often propose the useless intervention.

**"When would the opposite be true?"**
When `a` is large. A 1,000-bit packet over a geostationary satellite at 1 Mbps has `Tt` of 1 ms against `Tp` of 250 ms, so `a = 250`. There, doubling the bandwidth saves **0.2%**, and the only useful lever is sending more data per round trip, which is exactly what a sliding window does.

**"Why does each hop cost a whole transmission delay?"**
**Store-and-forward.** A router must receive the packet in its entirety before forwarding, for two structural reasons: the frame check sequence is at the end, so it cannot know the frame is intact until the last bit arrives, and forwarding is a decision requiring the header plus a known-good frame. So three hops of one packet cost `3 x (Tt + Tp) = 4.83 s`, **three full pours in sequence**, with nothing overlapping.

**"Is there an alternative to store-and-forward?"**
**Cut-through switching**, which begins forwarding as soon as the destination address has been read, typically within the first 64 bytes. It cuts per-hop latency dramatically and accepts the risk of relaying a corrupted frame, since the check arrives after the forwarding decision. It is used in low-latency data centre and InfiniBand fabrics, not in the general Internet.

**"Derive the pipelining formula."**
With `N` packets over `h` links, link 2 can transmit packet 1 while link 1 transmits packet 2, so the hops overlap. The last packet arrives at `(N + h - 1) · Tt_packet + h · Tp`. The `N` term is **the file pouring through once**, the `h - 1` term is the **pipeline fill** needed to get the first packet onto the last link, and the `h · Tp` term is travel. Here that is 1.6016 + 0.0016 + 0.03 = **1.632 s against 4.830 s, a 66.2% saving.**

**"Why is the Internet packet-switched?"**
Because of the general form of that result. As `N` grows, the hop count stops multiplying the **file size** and multiplies only the small **packet size**. Without pipelining, end-to-end delay is linear in path length times message size, which for a fifteen-hop path and a large file is unusable. **Packet switching decouples end-to-end delay from path length**, and that is a stronger argument for it than statistical multiplexing.

**"Then why not use tiny packets?"**
Because the header does not shrink. Counting a 44-byte header on every frame, the optimum on these numbers is around **8 KB at 1.657 s**; 1 KB is slightly worse at 1.701 s, 64-byte payloads carry **40.7% overhead** and take 2.73 s, and 8-byte payloads are 84.6% overhead and take 10.4 s, **worse than sending the file as one unsplit packet.** Larger packets lengthen the pipeline fill, smaller ones let the fixed header dominate, and the optimum sits between, which is the framing-efficiency problem.

**"2 MB: is that `10^6` or `2^20` bytes?"**
The question does not say, and it changes the answer by 4.9%, giving 1.600 s against 1.678 s. **State the convention you chose.** Decimal is the consistent choice here, because Mbps unambiguously means `10^6` bits per second, so using decimal for the file keeps both sides of the division in the same system.

**"What about the other two delays?"**
**Queueing delay**, waiting in a router buffer, is the only one that depends on other people's traffic, which makes it the only variable one and the source of essentially all jitter; it is also the one that explains bufferbloat. **Processing delay** is the router's own lookup and frame handling, now microseconds and reasonably ignored here. Both are excluded from this problem, which is worth noting since the computed 1.61 s is a floor rather than a prediction.

**The common wrong answer** is letting distance leak into the transmission delay or bandwidth leak into the propagation delay, which the two formulas make impossible if you write them down first. Next is computing `3 x Tt + Tp` for the three-hop case, which forgets that each hop has its own propagation delay as well. Third is reporting `Tt` alone as the answer to "total time", when the last bit still has to travel. And last is treating pipelining as unboundedly good, when the header cost makes very small packets worse than no splitting at all.

---

### Say this in the interview

*"Before computing I would name the units, because the question says 2 MB and does not say which. I will take it as decimal, two times ten to the six bytes, which keeps it consistent with Mbps meaning ten to the six bits per second. On the binary reading the transmission delay comes out as 1.678 seconds instead of 1.600, so it is a five percent difference and worth one sentence.*

*Transmission delay is size over bandwidth: sixteen million bits over ten million bits per second, which is 1.6 seconds. Propagation delay is distance over speed: two times ten to the six metres over two times ten to the eight metres per second, which is ten milliseconds. Total one-hop time is the sum, 1.61 seconds, and that is when the last bit arrives. Worth distinguishing from the first bit arriving at ten milliseconds and the last bit leaving the sender at 1.6 seconds, since interviewers sometimes ask which one you computed.*

*The framing I would lead with is that these are not two flavours of slowness, they are answers to different questions. Distance does not appear in the transmission delay, and neither size nor bandwidth appears in the propagation delay. So widening the pipe does not shorten it and shortening it does not widen it, which means there is no single fix for a slow transfer.*

*That makes the ratio the useful quantity. Tt over Tp is a hundred and sixty, so transmission dominates and propagation is six tenths of one percent of the total. Equivalently a, which is Tp over Tt, is about nought point zero zero six, far below one, so this is a bandwidth-limited link: the message fills the pipe a hundred and sixty times over. Concretely, doubling the bandwidth saves fifty percent of the transfer, and moving the server from two thousand kilometres away into the same city saves six tenths of a percent. That asymmetry is the whole practical point, and the opposite regime is worth naming for contrast: a thousand-bit packet over a geostationary satellite has Tt of one millisecond against Tp of two hundred and fifty, so a is two hundred and fifty, which makes it latency-limited, and there doubling bandwidth saves almost nothing while sending more per round trip is the only lever, which is what a sliding window is for.*

*For the three-hop case, the key fact is store-and-forward: a router must receive the whole packet before forwarding, both because the frame check sequence is at the end so it cannot know the frame is good until the last bit arrives, and because forwarding needs the header plus a known-good frame. So sending the file as one packet costs three times Tt plus Tp, which is three times 1.61, so 4.83 seconds. The alternative is cut-through switching, which starts forwarding once it has read the destination address and accepts the risk of relaying a corrupt frame, but that lives in low-latency data centre fabrics rather than the general Internet. The file is poured three times in sequence with nothing overlapping, and that cost is linear in the hop count, which for a fifteen-hop path would be unusable.*

*Pipelining fixes it. Split the file into thousand-byte packets, so two thousand packets with a transmission delay of nought point eight milliseconds each. The last packet arrives at N plus h minus one, times the per-packet transmission delay, plus h times Tp. That is two thousand and two times nought point eight milliseconds plus thirty milliseconds, which is 1.6316 seconds against 4.830, a saving of sixty-six percent. And I would point at the structure rather than just the number: the N term is the file pouring through once, the h minus one term is the pipeline fill, two packet times, and the h Tp term is thirty milliseconds of travel. So the pipelined total is essentially one transmission plus a little, where the unsplit version was three.*

*The general form is the real answer to why the Internet is packet-switched. As N grows, the hop count stops multiplying the file size and multiplies only the small packet size, so end-to-end delay is decoupled from path length. I find that a stronger argument for packet switching than statistical multiplexing.*

*And if they push on why not use tiny packets: because the header does not shrink, and my 1.63 second figure ignored headers, which flatters small packets. Counting a forty-four byte header on every frame, the optimum on these numbers is around eight kilobytes at about 1.66 seconds; one kilobyte is slightly worse at 1.70, sixty-four byte payloads mean forty percent of the link is header and the total rises to 2.73 seconds, and eight-byte payloads are eighty-five percent overhead and take over ten seconds, worse than sending the file as one unsplit packet. Larger packets lengthen the pipeline fill, smaller ones let the fixed header dominate, and there is a genuine interior optimum, which is the framing-efficiency question. One last caveat: this ignores queueing delay, which is the only one of the four that depends on other people's traffic and therefore the only variable one and the source of essentially all jitter, and processing delay, which is microseconds now. So 1.61 seconds is a floor rather than a prediction."*
