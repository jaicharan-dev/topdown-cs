---
id: 8-bandwidth-delay-product
title: "Bandwidth-Delay Product and Stop-and-Wait"
description: "The pipe holds 200,000 bits and the protocol puts 1,000 in it, so the link runs at half a percent; and this link is not actually a Long Fat Network, which is worth saying"

sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A link has a bandwidth of 5 Mbps and a propagation delay of 20 ms. Calculate the bandwidth-delay product, the Stop-and-Wait link utilization for a 1000-bit frame, explain why Stop-and-Wait fails on Long Fat Networks (LFNs), and walk through how TCP window scaling overcomes the 64 KB limit."

---

### Picture it

A conveyor belt between two buildings, and a rule that you may not put a second box on it until the first has been received and acknowledged.

**The belt has a capacity, and it is a physical fact rather than a protocol choice.** It is a certain length and it moves at a certain speed, so at any moment there is room for a definite number of boxes on it. Nobody decided that number; it falls out of the geometry.

Work it out for this link and the number is large: **the belt holds two hundred thousand bits** by the time you count the return journey. The protocol puts one thousand on it and then stops and waits. So the belt is 0.5% occupied, and **the other 99.5% of the belt is moving, empty, past you.**

That is the whole of the stop-and-wait problem, and the framing worth taking away is that **the link is not slow and the protocol is not slow either.** Each box travels at full speed. The acknowledgement comes back at full speed. Nothing is congested, nothing is queueing, and nothing would be improved by a faster belt. **You have a utilisation problem, not a speed problem**, and those have completely different fixes.

And you can see the fix from the picture without any algebra: **put more boxes on the belt before waiting.** How many? Exactly as many as the belt holds, which is the number you already computed. Fill the belt and you are done; there is nothing further to gain, because the belt cannot hold more than it holds.

Now the part that this question invites you to get wrong, and where being careful is worth more than being quick.

The question asks why stop-and-wait fails on a Long Fat Network, and the tempting move is to answer it on these numbers. **Do not, because these numbers are not a Long Fat Network.** Work out what a 64 KB window permits on this link and you get about thirteen megabits per second, on a link that only runs at five. **The window is nearly three times larger than this link can use.** There is no window problem here at all; there is only a protocol that declines to use the window it has.

The Long Fat Network problem is real and it is a different arithmetic. It needs a belt so long or so fast that sixty-four kilobytes genuinely runs out, and that takes a gigabit link across an ocean, where the same 64 KB buys you half a percent of the capacity. **Changing the numbers to show the effect is the honest answer**, and an interviewer who asked a slightly leading question usually wants to see whether you noticed.

---

### The proper terms

#### The pipe, and what it holds

The **bandwidth-delay product**, BDP, is bandwidth multiplied by delay, and despite the name it is **a quantity of data, not a time**:

$$\text{BDP} = B \times T$$

It is the number of bits "in flight" on the link: bits that have left the sender and not yet arrived. The useful mental image is that the link **is a buffer**, with a capacity fixed by physics rather than by anyone's configuration.

**Which delay goes in matters and is the commonest source of confusion.** Using one-way propagation delay gives the bits in flight in one direction. Using the **round-trip time** gives the bits a sender must have outstanding to keep the link busy continuously, because that is how long it waits before hearing anything back. **For protocol design you want the RTT version**, and this problem gives a one-way figure, so both are worth stating.

#### Stop-and-wait

**Stop-and-wait** is the simplest reliable protocol: send one frame, wait for its **acknowledgement**, then send the next. It needs one bit of sequence number and almost no state, which is its only virtue.

One cycle costs a transmission delay, a propagation delay, the ACK's own transmission delay, and a propagation delay back. Taking the ACK as negligibly small, the cycle is `Tt + 2Tp`, and the fraction of it spent actually sending is:

$$U = \frac{T_t}{T_t + 2T_p} = \frac{1}{1 + 2a} \quad \text{where } a = \frac{T_p}{T_t}$$

That form is worth remembering because it says the whole thing: utilisation depends only on `a`, the ratio of propagation to transmission delay, and not on the absolute speed of anything. A link ten times faster with ten times smaller frames has identical utilisation.

#### The other reading of `1 + 2a`

The same expression answers a different question, and noticing they are the same number is the step that makes the fix obvious.

`1 + 2a` is **how many frames fit in the round-trip pipe**, counting the one being transmitted. So stop-and-wait achieves `1/(1 + 2a)` precisely because it uses one slot out of `1 + 2a` available. **The reciprocal of the utilisation is the window size you need**, which is the sliding-window result, and it means the two problems are the same problem seen from either end.

#### Long Fat Networks

A **Long Fat Network**, LFN, is a path whose bandwidth-delay product is large, which means either a long propagation delay, a high bandwidth, or both. The term comes from **RFC 1323**, and the threshold that matters in practice is whether the BDP exceeds what the protocol can express.

TCP's original **receive window** field is 16 bits, so it can advertise at most 65,535 bytes. That caps throughput at:

$$\text{throughput}_{\max} = \frac{\text{window}}{\text{RTT}}$$

**That formula is the LFN problem in one line.** The window is fixed, the RTT is physics, so throughput is capped regardless of how fast the link is.

#### Window scaling

**Window scaling**, defined in RFC 1323 and now RFC 7323, negotiates a left-shift count in the SYN exchange and applies it to every advertised window thereafter. With a maximum shift of 14, the effective window reaches `65,535 x 2^14`, about 1 GB.

Three details make it a real-world answer rather than a formula:

**It is negotiated only in the SYN and SYN-ACK.** If either end omits the option, scaling is off for the life of the connection, and it cannot be turned on later.

**It is the classic middlebox casualty.** A firewall or load balancer that strips or rewrites the option, or that fails to apply the scale factor when tracking sequence numbers, produces a connection that completes its handshake and then stalls or crawls. This is a well-known operational failure and a good thing to mention.

**It is necessary but not sufficient.** Filling a large BDP also needs sufficient socket buffers at both ends, since the advertised window cannot exceed the receive buffer, which is why operating systems do **buffer auto-tuning**. It also needs a congestion-control algorithm that will open its window that far, which is the separate reason **BBR** and **CUBIC** exist: classic loss-based control treats a single loss as a signal to halve the window, and on a large-BDP path that is punishing.

---

### Work it out

#### Given

| Quantity | Value |
| :--- | :--- |
| Bandwidth `B` | 5 Mbps |
| Propagation delay `Tp` | 20 ms, one way |
| Frame size `L` | 1,000 bits |

#### Part 1: the bandwidth-delay product

**One-way**, which is the bits in flight in one direction:

$$\text{BDP} = 5 \times 10^6 \times 0.020 = \mathbf{100{,}000 \text{ bits}} = 12.5 \text{ kB} = 12.21 \text{ KiB}$$

**Round-trip**, which is what a sender needs outstanding to keep the link busy:

$$\text{BDP}_{\text{RTT}} = 5 \times 10^6 \times 0.040 = \mathbf{200{,}000 \text{ bits}} = 25 \text{ kB} = 24.41 \text{ KiB}$$

Say which one you computed and why. **For protocol design the round-trip figure is the relevant one**, because the sender is blind for a whole RTT and must have enough in flight to cover it.

Put the frame next to it: **the pipe holds 200,000 bits and the frame is 1,000.** The ratio is 200 to 1, and that single comparison predicts everything below without further arithmetic.

#### Part 2: stop-and-wait utilisation

**Transmission delay:**

$$T_t = \frac{1000}{5 \times 10^6} = 0.2 \text{ ms}$$

**The ratio:**

$$a = \frac{T_p}{T_t} = \frac{20}{0.2} = \mathbf{100}$$

**Utilisation:**

$$U = \frac{1}{1 + 2a} = \frac{1}{1 + 200} = \frac{1}{201} = \mathbf{0.4975\%}$$

**Effective throughput:**

$$0.004975 \times 5 \text{ Mbps} = \mathbf{24.88 \text{ kbps}}$$

A cycle, drawn to scale as far as the page allows:

```
  sender  |T|                                         |T|
          0.2ms                                       
          |<-- 20 ms ----->|               |<-- 20 ms -->|
                           |a|
  receiver                 frame arrives, ACK sent back
          |<---------------- 40.2 ms ------------------->|
           ^^^
           0.2 ms of this cycle is spent transmitting: 0.5%
```

**A 5 Mbps link delivering 25 kbps.** The link is not slow, the signal is not slow, nothing is queueing, and a faster link would not help: doubling the bandwidth to 10 Mbps halves `Tt` to 0.1 ms, which doubles `a` to 200 and **halves the utilisation to 0.25%**, leaving throughput exactly where it was. That is the clearest possible demonstration that this is a utilisation problem rather than a speed problem.

| Change | New `a` | New `U` | Throughput |
| :--- | :---: | :---: | :---: |
| baseline | 100 | 0.4975% | 24.88 kbps |
| **double the bandwidth** | 200 | 0.2488% | **24.88 kbps, unchanged** |
| 10x the frame size | 10 | 4.76% | 238 kbps |
| frame = the RTT pipe, 200,000 bits | 0.5 | 50% | 2.5 Mbps |
| window of `1 + 2a` = 201 frames | 100 | **100%** | **5 Mbps** |

The last two rows are the two real fixes: **bigger frames, or more frames in flight.** The second is the sliding window, and the window size it needs, 201, is exactly `1 + 2a`, the reciprocal of the utilisation.

#### Part 3: the LFN question, answered honestly

The question asks why stop-and-wait fails on a Long Fat Network, and the first thing to do is check whether this link is one.

TCP's unscaled receive window is 16 bits, so at most 65,535 bytes, which is 524,280 bits. On this link:

$$\text{throughput}_{\max} = \frac{524{,}280 \text{ bits}}{0.040 \text{ s}} = 13.1 \text{ Mbps}$$

**The link runs at 5 Mbps. A 64 KB window permits 13.1 Mbps, which is 262% of the link's capacity.** So the window is not a constraint here at all, and this link is not a Long Fat Network. Its RTT pipe is 25 kB, comfortably inside 64 KB.

**The failure on this link is stop-and-wait's own**, which uses one frame rather than the 201 it could, and a plain unscaled TCP would saturate it without difficulty. Those are two different problems and conflating them is the trap.

Now take a genuine LFN and the same 64 KB:

| Path | RTT | Link rate | RTT pipe | 64 KB permits | Fraction of the link |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **this problem** | 40 ms | 5 Mbps | 25 kB | 13.11 Mbps | **262%, no problem** |
| transatlantic | 100 ms | 1 Gbps | 12.5 MB | 5.24 Mbps | **0.52%** |
| intercontinental | 200 ms | 10 Gbps | 250 MB | 2.62 Mbps | **0.03%** |

**That is the LFN problem**: on the transatlantic row the pipe holds 12.5 MB and the protocol can describe only 64 kB, so 99.5% of a gigabit link is unusable no matter how the sender behaves. The cause is structural, a 16-bit field against a physical quantity that grew by four orders of magnitude since it was chosen.

#### Part 4: window scaling

**Window scaling** negotiates a shift count during the handshake and applies it to every advertised window afterwards:

$$\text{effective window} = \text{advertised window} \times 2^{\text{shift}}$$

| Shift | Max window | Permits at 100 ms RTT |
| :---: | :---: | :---: |
| 0 | 64 kB | 5.24 Mbps |
| 7 | 8 MB | 671 Mbps |
| 10 | 64 MB | 5.37 Gbps |
| **14** | **1 GB** | **85.9 Gbps** |

For the transatlantic row, filling a 12.5 MB pipe needs a shift of at least 8, giving a 16 MB ceiling.

Three practical points that distinguish having used this from having read about it.

**Negotiation happens only in the SYN exchange.** If either end omits the option, scaling is off for the connection's whole life and cannot be enabled later. This is why a stack with scaling disabled caps every long-haul transfer at 5 Mbps and no amount of tuning elsewhere helps.

**Middleboxes break it.** A firewall or load balancer that strips the option, or that tracks sequence numbers without applying the negotiated scale, yields a connection that handshakes successfully and then stalls or crawls. The signature is a transfer that works fine on a LAN and collapses over the WAN, and it is one of the most commonly diagnosed causes of exactly that.

**It is necessary and not sufficient.** The advertised window cannot exceed the receive buffer, so filling a 12.5 MB pipe needs socket buffers that large at both ends, which is why kernels do **buffer auto-tuning** rather than relying on a fixed default. And the **congestion window** must actually open that far: a loss-based algorithm that halves its window on a single loss recovers slowly across a large-BDP path, which is why **CUBIC** uses a cubic growth function and **BBR** models the path's bandwidth and RTT directly instead of treating loss as the signal. Window scaling removes the ceiling; congestion control decides whether you ever reach it.

#### Verify it

```python
"""
Bandwidth-delay product, stop-and-wait utilisation, and an honest check
of whether a given link is actually a Long Fat Network.
"""

B = 5e6            # bits per second
TP = 20e-3         # one-way propagation delay, seconds
L = 1000           # frame bits
TCP_WINDOW = 65535 * 8     # bits, the unscaled 16-bit field


def bdp(bw, delay):
    return bw * delay


def human_bits(n):
    return f"{n:,.0f} bits = {n/8/1000:.2f} kB = {n/8/1024:.2f} KiB"


if __name__ == "__main__":
    print("-- Part 1: the bandwidth-delay product is DATA, not time")
    print(f"   one-way  {B:.0e} x {TP}      = {human_bits(bdp(B, TP))}")
    print(f"   RTT      {B:.0e} x {2*TP}      = "
          f"{human_bits(bdp(B, 2*TP))}")
    print("   the RTT figure is the one that matters for protocol design:")
    print("   the sender is blind for a whole RTT")
    print(f"   the pipe holds {bdp(B, 2*TP):,.0f} bits; the frame is {L}. "
          f"Ratio {bdp(B, 2*TP)/L:.0f} : 1")

    print("\n-- Part 2: stop-and-wait")
    tt = L / B
    a = TP / tt
    u = 1 / (1 + 2 * a)
    print(f"   Tt = {L}/{B:.0e} = {tt} s = {tt*1000:.1f} ms")
    print(f"   a  = Tp/Tt = {TP}/{tt} = {a:.0f}")
    print(f"   U  = 1/(1+2a) = 1/{1+2*a:.0f} = {u:.6f} = {u*100:.4f}%")
    print(f"   throughput = {u*B:,.0f} bps = {u*B/1000:.2f} kbps "
          f"on a {B/1e6:.0f} Mbps link")
    print(f"   1 + 2a = {1+2*a:.0f} is ALSO how many frames fit the RTT pipe,")
    print(f"   so the window needed for 100% is exactly 1/U")

    print("\n   utilisation depends only on a, not on absolute speed:")
    rows = (("baseline", B, L), ("double the bandwidth", 2 * B, L),
            ("10x the frame", B, 10 * L),
            ("frame = RTT pipe", B, bdp(B, 2 * TP)))
    print(f"   {'change':<24}{'a':>8}{'U':>10}{'throughput':>14}")
    for desc, bw, frame in rows:
        t = frame / bw
        aa = TP / t
        uu = min(1.0, 1 / (1 + 2 * aa))
        print(f"   {desc:<24}{aa:>8.1f}{uu*100:>9.3f}%"
              f"{uu*bw/1e6:>12.3f} Mbps")
    d_bw = 1 / (1 + 2 * (TP / (L / (2 * B))))
    print(f"   doubling the bandwidth leaves throughput at "
          f"{d_bw*2*B/1000:.2f} kbps: unchanged")
    print("   so this is a UTILISATION problem, not a speed problem")

    print("\n-- Part 3: is this link actually a Long Fat Network?")
    permitted = TCP_WINDOW / (2 * TP)
    print(f"   TCP's unscaled window is 16 bits = 65,535 bytes = "
          f"{TCP_WINDOW:,} bits")
    print(f"   at RTT {2*TP*1000:.0f} ms that permits {permitted/1e6:.2f} Mbps")
    print(f"   the link runs at {B/1e6:.0f} Mbps, so 64 KB covers "
          f"{100*permitted/B:.0f}% of it")
    print(f"   -> NOT an LFN. Its RTT pipe is "
          f"{bdp(B, 2*TP)/8/1000:.1f} kB, well inside 64 KB.")
    print("   the failure here is stop-and-wait's own, not the window's")

    print("\n   a real LFN needs different numbers:")
    print(f"   {'path':<20}{'RTT':>7}{'rate':>11}{'RTT pipe':>12}"
          f"{'64KB gives':>13}{'of link':>10}")
    for name, rtt, rate in (("this problem", 0.040, 5e6),
                            ("transatlantic", 0.100, 1e9),
                            ("intercontinental", 0.200, 10e9)):
        pipe = rate * rtt
        gives = TCP_WINDOW / rtt
        unit = (f"{pipe/8/1e6:.1f} MB" if pipe / 8 >= 1e6
                else f"{pipe/8/1000:.1f} kB")
        print(f"   {name:<20}{rtt*1000:>6.0f}m{rate/1e6:>9.0f}M"
              f"{unit:>12}{gives/1e6:>11.2f}M{100*gives/rate:>9.2f}%")

    print("\n-- Part 4: window scaling")
    print(f"   {'shift':>6}{'max window':>14}{'at 100ms RTT':>16}")
    for shift in (0, 7, 10, 14):
        w = 65535 * (2 ** shift)
        unit = (f"{w/1024**3:.0f} GB" if w >= 1024**3
                else f"{w/1024**2:.0f} MB" if w >= 1024**2
                else f"{w/1024:.0f} kB")
        print(f"   {shift:>6}{unit:>14}{w*8/0.100/1e6:>14.2f} Mbps")
    need = 1e9 * 0.100 / 8                      # bytes for the transatlantic pipe
    shift = next(s for s in range(15) if 65535 * 2**s >= need)
    print(f"   filling the transatlantic pipe ({need/1e6:.1f} MB) needs "
          f"shift >= {shift}, giving {65535*2**shift/1024**2:.0f} MB")
    print("   caveats: negotiated only in the SYN, so it cannot be enabled")
    print("   later; middleboxes that strip it or ignore the scale cause a")
    print("   handshake that succeeds and a transfer that stalls; and the")
    print("   receive buffer and congestion window must also be large enough")
```

---

### What they ask next

**"Is the bandwidth-delay product a time or an amount?"**
An amount of **data**, despite the name sounding like a duration. It is the bits in flight on the link, and the useful way to hold it is that **the link itself is a buffer** whose capacity is set by physics rather than configuration. Here the one-way figure is 100,000 bits and the round-trip figure is 200,000.

**"Which delay should go into it?"**
It depends on the question, and saying so is the point. One-way propagation gives the bits in flight in one direction. **Round-trip time gives what a sender must have outstanding to keep the link busy**, because that is how long it waits before hearing anything back, and that is the figure protocol design needs. This problem states a one-way delay, so quote both and say which you are using.

**"Derive the stop-and-wait utilisation."**
One cycle is `Tt + 2Tp`, taking the ACK as negligible, and only `Tt` of it is spent sending, so `U = Tt/(Tt + 2Tp) = 1/(1 + 2a)`. Here `Tt = 0.2 ms`, `a = 100`, so `U = 1/201 = 0.4975%`, which is **24.88 kbps on a 5 Mbps link**. Note that `U` depends only on `a` and not on absolute speed.

**"Would a faster link help?"**
No, and this is the sharpest thing to say about the problem. Doubling the bandwidth halves `Tt`, which **doubles `a` to 200 and halves utilisation to 0.2488%**, leaving throughput at exactly 24.88 kbps. **It is a utilisation problem, not a speed problem**, and the two have entirely different fixes: bigger frames, or more frames in flight.

**"What does `1 + 2a` mean besides being the denominator?"**
It is **how many frames fit in the round-trip pipe**, counting the one being sent. So stop-and-wait gets `1/(1 + 2a)` precisely because it occupies one slot of the 201 available, and **the window needed for full utilisation is the reciprocal of the utilisation.** Recognising that the two are the same number is what turns the problem into its own solution.

**"Why does stop-and-wait fail on a Long Fat Network?"**
It fails on this link too, for its own reasons, and I would separate the two. **This link is not an LFN**: its RTT pipe is 25 kB, well inside TCP's unscaled 64 kB window, and in fact 64 kB would permit 13.1 Mbps, which is 262% of the link's 5 Mbps capacity. The LFN problem is that on a 1 Gbps transatlantic path the pipe holds 12.5 MB while the protocol can describe only 64 kB, capping you at **0.52% of the link.** Different problem, different numbers.

**"Where does the 64 KB limit come from?"**
TCP's **receive window** field is 16 bits, so it advertises at most 65,535 bytes, and throughput is bounded by `window / RTT`. **The window is a fixed-width field and the RTT is physics**, so the ceiling holds regardless of link rate. It was an entirely reasonable field width in 1981 and became a problem when bandwidth-delay products grew by four orders of magnitude.

**"How does window scaling work?"**
A shift count is negotiated in the SYN exchange and applied to every advertised window thereafter, so the effective window is `advertised x 2^shift`. With the maximum shift of 14 the window reaches about **1 GB**. Filling the 12.5 MB transatlantic pipe needs a shift of at least 8.

**"What goes wrong with it in practice?"**
Three things. It is **negotiated only in the SYN**, so if either end omits the option it is off for the connection's life and cannot be enabled later. **Middleboxes break it**: a firewall or load balancer that strips the option, or tracks sequence numbers without applying the scale, gives you a handshake that succeeds and a transfer that stalls, with the signature being fine on a LAN and collapsing over the WAN. And it is **necessary but not sufficient**, since the advertised window cannot exceed the receive buffer, which is why kernels auto-tune socket buffers.

**"So scaling alone gets you a full gigabit across the Atlantic?"**
No. Scaling removes the ceiling; **congestion control decides whether you reach it.** A loss-based algorithm that halves its window on a single loss takes a long time to climb back across a 100 ms RTT, so a single random loss is punishing on a large-BDP path. That is the reason **CUBIC** grows with a cubic function of time since the last loss, and why **BBR** models the path's bandwidth and minimum RTT directly rather than treating loss as the congestion signal.

**"What is the simplest other fix?"**
Bigger frames, which raises `Tt` and so lowers `a`. Making the frame the size of the RTT pipe, 200,000 bits, gives `a = 0.5` and 50% utilisation from stop-and-wait alone. It is impractical at that size, which is why the real answer is windowing, but it demonstrates that **`a` is the only quantity that matters** and either term of the ratio will do.

**The common wrong answer** is answering the LFN part on these numbers, when 64 kB is nearly three times what this link can use and the link is not an LFN at all. Next is reporting the one-way BDP as the figure a protocol needs, which understates the requirement by half. Third is claiming a faster link would improve matters, when doubling the bandwidth leaves throughput exactly unchanged. And last is presenting window scaling as the complete fix, when socket buffers and congestion control both have to cooperate.

---

### Say this in the interview

*"The bandwidth-delay product first, and I would be explicit that despite the name it is an amount of data, not a time. It is the bits in flight, so the link itself is a buffer whose capacity is set by physics. One-way, five times ten to the six times nought point zero two is a hundred thousand bits, about 12.5 kilobytes. Using the round-trip time instead, forty milliseconds here, it is two hundred thousand bits, about twenty-five kilobytes. The round-trip figure is the one protocol design needs, because the sender is blind for a whole RTT and has to have enough outstanding to cover it.*

*Then the comparison that predicts everything: the pipe holds two hundred thousand bits and the frame is one thousand. Two hundred to one.*

*For stop-and-wait, which sends one frame and waits for its acknowledgement before sending the next, the transmission delay is a thousand bits over five megabits, which is nought point two milliseconds. So a, which is Tp over Tt, is twenty over nought point two, which is a hundred. Utilisation is one over one plus two a, so one over two hundred and one, which is nought point four nine seven five percent, giving about twenty-five kilobits per second on a five megabit link.*

*The thing I would stress is that nothing here is slow. Each frame travels at full speed, the ACK comes back at full speed, nothing is queueing. It is a utilisation problem, not a speed problem, and the proof is that a faster link does not help: double the bandwidth and Tt halves, so a doubles to two hundred and utilisation halves to nought point two five percent, leaving throughput at exactly twenty-five kilobits. The two real fixes are bigger frames or more frames in flight.*

*And I would point out that one plus two a has a second reading: it is how many frames fit in the round-trip pipe, counting the one being sent. So stop-and-wait gets one over two hundred and one precisely because it uses one slot of two hundred and one, and the window you need for full utilisation is the reciprocal of the utilisation. Recognising those are the same number turns the problem into its own answer.*

*Now the Long Fat Network part, where I would push back slightly on the question, because this link is not one. TCP's unscaled receive window is a sixteen-bit field, so sixty-five thousand five hundred and thirty-five bytes, and throughput is bounded by window over RTT. On this link that is about thirteen point one megabits per second, on a link that only runs at five. So sixty-four kilobytes is nearly three times what this link can use, its RTT pipe is twenty-five kilobytes, comfortably inside the window, and a plain unscaled TCP would saturate it without difficulty. The failure here is stop-and-wait's own, using one frame where it could use two hundred and one. Those are two different problems.*

*To show the real LFN problem I would change the numbers. A transatlantic gigabit path with a hundred millisecond RTT has a pipe of twelve and a half megabytes, and sixty-four kilobytes buys five point two megabits, which is nought point five percent of the link. Intercontinental ten gigabit at two hundred milliseconds is two hundred and fifty megabytes of pipe and nought point zero three percent. That is structural: a sixteen-bit field against a physical quantity that grew by four orders of magnitude since it was chosen.*

*Window scaling, from RFC 1323 and now RFC 7323, fixes it by negotiating a shift count in the SYN exchange and applying it to every advertised window, so the effective window is the advertised value times two to the shift. Maximum shift fourteen gives about a gigabyte, and filling that transatlantic pipe needs a shift of at least eight.*

*Three caveats I would add, because they are where this bites in practice. It is negotiated only in the SYN, so if either end omits the option it is off for the life of the connection and cannot be enabled later. Middleboxes break it: a firewall or load balancer that strips the option, or that tracks sequence numbers without applying the negotiated scale, gives you a handshake that succeeds and then a transfer that stalls, and the signature is something that works on a LAN and collapses over the WAN. And it is necessary but not sufficient, because the advertised window cannot exceed the receive buffer, which is why kernels do buffer auto-tuning, and because the congestion window has to actually open that far. A loss-based algorithm that halves on a single loss climbs back slowly over a hundred millisecond RTT, so one random loss is punishing on a large-BDP path, and that is exactly why CUBIC grows as a cubic function of time since the last loss and why BBR models the path's bandwidth and minimum RTT instead of treating loss as the signal. Scaling removes the ceiling; congestion control decides whether you ever reach it."*
