---
id: 10-framing-efficiency
title: "Framing Efficiency, MTU Trade-offs and Stuffing"
description: "Efficiency rises forever with frame size and goodput does not, and the formula that finds the optimum says 1500 bytes is far too small, which is worth being honest about"

sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A network transmits frames with a 1500-byte payload, 40-byte header, and 4-byte trailer. Calculate the framing efficiency, compare with a 100-byte payload, explain why protocols do not use infinitely large frames, derive the optimal MTU formula, and walk through bit and byte stuffing."

---

### Picture it

Posting things in envelopes, where every envelope costs the same to address no matter what is inside.

**The arithmetic of the envelope is obvious and goes one way.** Forty-four bytes of envelope around fifteen hundred of letter is good value. Forty-four bytes around a hundred is poor value. Put more in each envelope and the envelope matters less, and this improves without limit: a gigabyte in one envelope makes the address essentially free.

So the question "why not use infinitely large frames" has no answer at all from that direction, and the usual response, that bigger frames are inefficient for small messages, misses the question, which asked about the large end.

**The answer comes from a second cost that runs the other way.** Envelopes get lost, and they get lost in a particular manner: **damage happens per page, but loss happens per envelope.** One ruined character anywhere in the letter and the whole envelope is discarded and must be sent again. So the chance of an envelope surviving falls as it gets fatter, and it falls geometrically, because every additional page is another chance to be the one that ruins it.

Put the two together and you have the shape that matters. **Envelope overhead falls with size; survival probability also falls with size.** One is a ratio approaching 1 and the other is an exponential decaying to 0, so their product rises, peaks, and collapses. There is a best size, it is not at either extreme, and **you can calculate where it is from the error rate alone.**

Now the part worth being careful about, because it is where most explanations quietly cheat. Do that calculation for a realistic modern link and **the answer comes out far larger than 1500 bytes.** At one error in a million bits the optimum is about 2,400 bytes; at one in a billion, which is what a fibre link actually delivers, it is about 74 kilobytes. So the elegant formula does not justify the Ethernet MTU. **It says the Ethernet MTU is far too small**, and the real reasons it has not moved are historical and operational rather than information-theoretic. Saying so is more honest than presenting the derivation as though it explained the number everyone recognises.

And then a smaller, sharper problem. **The frame needs a marker that says where it ends**, and whatever byte pattern you choose for that marker can also occur inside the data. So you must escape it, which makes the frame longer, which means **a frame's length on the wire depends on its contents.** For random data that costs about 3%, and for maliciously or unluckily chosen data it costs 20% or even 100%, which is a worst case a buffer has to be sized for.

---

### The proper terms

#### Efficiency and goodput are different quantities

**Framing efficiency** is the share of the transmitted frame that is payload:

$$\eta = \frac{\text{payload}}{\text{payload} + \text{overhead}}$$

It counts only the header and trailer. It **rises monotonically** with payload size and approaches 1, which is why it cannot by itself explain an upper bound on frame size.

**Goodput** is the rate of useful data actually delivered, which also accounts for frames lost and retransmitted:

$$G = \eta \times P(\text{frame arrives intact})$$

**Goodput is the quantity with an optimum.** The distinction between these two is the single most important thing on this page, because the question's third part is unanswerable with efficiency alone.

#### The error model

The **bit error rate**, `p`, is the probability that any given bit is flipped. If errors are independent, a frame of `L` bytes survives with probability:

$$P(\text{intact}) = (1 - p)^{8L}$$

which for small `p` is approximately `e^(-8pL)`. **Damage is per bit, discarding is per frame**, and that asymmetry is what creates the optimum.

The independence assumption is worth flagging as a weakness, because real errors are **bursty**: a radio fade or a connector fault corrupts a run of bits rather than scattered ones. Burst errors favour larger frames relative to this model, since one burst ruins one frame regardless of its length.

#### The optimum, derived

Writing total frame length as `L` and fixed overhead as `H`:

$$G(L) = \frac{L - H}{L} \cdot e^{-kL}, \qquad k = 8p$$

Take logs and differentiate:

$$\frac{d}{dL}\Big[\ln\big(1 - \tfrac{H}{L}\big) - kL\Big] = \frac{H}{L^2 - HL} - k = 0$$

which rearranges to `kL^2 - kHL - H = 0`, and the positive root is:

$$L^* = \frac{H}{2} + \sqrt{\frac{H^2}{4} + \frac{H}{8p}}$$

For small `p` the second term dominates and this simplifies to the form worth remembering:

$$L^* \approx \sqrt{\frac{H}{8p}}$$

**The optimum goes as the inverse square root of the error rate.** Improve a link by a factor of 100 in reliability and the best frame size grows by 10.

#### Framing itself

A receiver needs to know where a frame ends, and there are three families of answer.

**Length-prefixed** framing puts a byte count in the header, as Ethernet and IP do. It needs no escaping, and its weakness is that a corrupted length field desynchronises the stream.

**Flag-delimited** framing marks the boundary with a reserved pattern, as HDLC and PPP do, which is self-synchronising and requires escaping.

**Bit stuffing**, used by HDLC, reserves the flag `01111110` and guarantees it cannot appear in the data by inserting a `0` after any five consecutive `1` bits. The receiver removes a `0` that follows five `1`s. Worst case, all-ones data, costs 20%, one stuffed bit per five. For random data the expected cost is the probability that a given position completes a run of five ones, which is `1/32`, or about 3.1%.

**Byte stuffing**, used by PPP, reserves the flag byte `0x7E` and the escape byte `0x7D`. Any occurrence of either in the payload is replaced by `0x7D` followed by the byte XOR `0x20`. **Worst case, a payload of all flag bytes, costs 100%**, since every byte becomes two.

The consequence both share is that **frame length on the wire is data-dependent**, so the efficiency figures above are averages and a buffer must be sized for the worst case.

#### Why 1500, really

The reasons are historical and operational, not information-theoretic.

**Buffer cost in 1980.** Memory was expensive and a 1500-byte buffer per port was already a significant commitment.

**Collision detection on shared coax.** Original Ethernet needed a frame long enough that a collision would be detected before transmission finished, which set the *minimum* at 64 bytes, and a maximum that bounded how long one station could monopolise the shared medium.

**Latency fairness and head-of-line blocking.** A large frame occupies the link for its full transmission time, delaying everything behind it, which matters for interactive traffic sharing the link.

**Path MTU compatibility.** This is the binding constraint now. **Jumbo frames** of around 9,000 bytes exist and are standard inside data centres, but across the public Internet a path's smallest link governs, and **path MTU discovery** fails silently when a middlebox drops the ICMP messages that carry the news, producing a connection that handshakes and then stalls on large transfers. That failure, the **MTU black hole**, is why 1500 persists as a safe default.

**CRC strength.** A CRC-32's detection guarantee weakens as the protected block grows, so a very long frame is less reliably checked for the same 32 bits of redundancy.

---

### Work it out

#### Given

| Quantity | Value |
| :--- | :---: |
| Payload | 1,500 bytes |
| Header | 40 bytes |
| Trailer | 4 bytes |
| **Total overhead `H`** | **44 bytes** |

#### Part 1: framing efficiency at 1,500 bytes

$$\eta = \frac{1500}{1500 + 44} = \frac{1500}{1544} = \mathbf{97.15\%}$$

Overhead is `44/1544 = ` **2.85%**.

#### Part 2: the same calculation at 100 bytes

$$\eta = \frac{100}{100 + 44} = \frac{100}{144} = \mathbf{69.44\%}$$

Overhead is **30.56%**, more than ten times the share. The payload fell by a factor of 15 and the overhead share rose by a factor of 10.7.

Across a range:

| Payload | Frame | Efficiency | Overhead |
| :---: | :---: | :---: | :---: |
| 46 B, Ethernet minimum payload | 90 B | 51.11% | 48.89% |
| 64 B | 108 B | 59.26% | 40.74% |
| 100 B | 144 B | **69.44%** | 30.56% |
| 500 B | 544 B | 91.91% | 8.09% |
| **1,500 B, Ethernet MTU** | **1,544 B** | **97.15%** | **2.85%** |
| 9,000 B, jumbo frame | 9,044 B | 99.51% | 0.49% |
| 65,000 B | 65,044 B | 99.93% | 0.07% |

**Efficiency rises monotonically and never turns round**, which is exactly why it cannot answer the next part. Nothing in this column argues against a 65,000-byte frame.

#### Part 3: why not infinitely large frames

Because the thing you actually care about is **goodput**, not framing efficiency, and goodput includes the chance the frame arrives intact.

With independent bit errors at rate `p`, a frame of `L` bytes survives with probability `(1 - p)^(8L)`, so:

$$G = \underbrace{\frac{\text{payload}}{L}}_{\text{rises with } L} \times \underbrace{(1-p)^{8L}}_{\text{falls with } L}$$

At `p = 10^-6`:

| Payload | Frame eff. | `P(intact)` | **Goodput** |
| :---: | :---: | :---: | :---: |
| 64 B | 59.26% | 99.91% | 59.21% |
| 500 B | 91.91% | 99.57% | 91.51% |
| 1,500 B | 97.15% | 98.77% | 95.96% |
| **2,300 B** | **98.12%** | **98.14%** | **96.30%** |
| 4,000 B | 98.91% | 96.82% | 95.76% |
| 9,000 B | 99.51% | 93.02% | 92.57% |
| 20,000 B | 99.78% | 85.18% | 85.00% |
| 65,000 B | 99.93% | 59.43% | **59.39%** |

**There is the peak**, at around 2,300 bytes. Read the two middle columns against each other: the efficiency column is still climbing at 65,000 bytes while `P(intact)` has collapsed to 59%, and their product has fallen back to roughly where the 64-byte frame was. **A 65,000-byte frame is as bad as a 64-byte frame, for the opposite reason.**

That is the answer to the question. A frame is discarded **as a whole** when any single bit in it is wrong, so the cost of a large frame is not a larger chance of a small problem but **a larger chance of losing everything.**

#### Part 4: the optimal frame size

Maximise `G(L) = (L - H)/L x e^(-kL)` with `k = 8p`. Taking logs and differentiating gives `kL^2 - kHL - H = 0`, whose positive root is:

$$L^* = \frac{H}{2} + \sqrt{\frac{H^2}{4} + \frac{H}{8p}} \;\approx\; \sqrt{\frac{H}{8p}} \text{ for small } p$$

With `H = 44` bytes:

| Bit error rate | `L*` | Payload | Goodput at `L*` | Typical of |
| :---: | :---: | :---: | :---: | :--- |
| `10^-4` | 258 B | 214 B | 67.5% | a poor wireless link |
| `10^-5` | 764 B | 720 B | 88.7% | a marginal link |
| **`10^-6`** | **2,367 B** | **2,323 B** | **96.3%** | a noisy copper link |
| `10^-7` | 7,438 B | 7,394 B | 98.8% | good copper |
| `10^-9` | **74,184 B** | 74,140 B | 99.9% | **fibre** |

The 2,367-byte row agrees with the peak found by sampling in part 3, which is the check worth doing.

**And now the honest conclusion, which most treatments skip.** At `10^-6` the optimum is 2,367 bytes, already above Ethernet's 1,500. At `10^-9`, which is what a real fibre link delivers, it is **74 kilobytes**, nearly fifty times the Ethernet MTU. So the derivation does not explain why MTUs are 1,500 bytes. **It says 1,500 is far too small for modern links**, and the reasons the number has not moved are elsewhere:

**Path MTU compatibility**, which is the binding one. Jumbo frames of 9,000 bytes are routine inside data centres, where the operator controls every link, and unusable across the public Internet because the smallest link on the path governs and **path MTU discovery** fails silently when a middlebox drops the ICMP "fragmentation needed" messages. The resulting **MTU black hole** gives a connection that completes its handshake and then hangs on the first large transfer, which is a much worse failure than mild inefficiency.

**Latency and head-of-line blocking.** A 74 KB frame at 1 Gbps occupies the link for 0.6 ms, during which nothing else can be sent, so interactive traffic sharing the link suffers.

**CRC strength.** A CRC-32's error-detection guarantee degrades as the protected block grows, so a 74 KB frame is less reliably checked by the same 32 bits than a 1.5 KB one is.

**The error model is optimistic.** It assumes independent bit errors, and real errors are **bursty**, which does favour larger frames, but it also means the clean exponential is not quite the right curve.

#### Part 5: bit stuffing

HDLC delimits frames with the flag `01111110`, and must guarantee that pattern never occurs in the data. The rule: **after five consecutive `1` bits, insert a `0`.** The receiver deletes any `0` that follows five `1`s.

```
  data        0 1 1 1 1 1 1 0 1 1 1 1 1 1 0
  after 5 ones ----------^         ----^
  stuffed     0 1 1 1 1 1 0 1 0 1 1 1 1 1 0 1 0
                          ^             ^
                      inserted      inserted

  the flag pattern 01111110 can now never appear in the payload,
  because six consecutive ones are impossible
```

| Data | Original | Stuffed | Expansion |
| :--- | :---: | :---: | :---: |
| All ones, 40 bits | 40 | 48 | **20.0%**, the worst case |
| The flag pattern repeated | 40 | 45 | 12.5% |
| Random data | `n` | `n(1 + 1/32)` | **about 3.1%** |

The worst case is one stuffed bit per five data bits, so 20%. The random-data figure is the probability that a given position completes a run of five `1`s, which is `1/32 = 3.125%`.

#### Part 6: byte stuffing

PPP works in bytes: flag `0x7E`, escape `0x7D`, and any payload occurrence of either is replaced by `0x7D` followed by the byte XOR `0x20`.

```
  payload   48 7E 20 7D 41
                ^^     ^^
                flag   escape, both must be escaped

  on wire   7E | 48 7D 5E 20 7D 5D 41 | 7E
             ^    ^^^^^       ^^^^^      ^
           flag   7E -> 7D 5E            closing flag
                        7D -> 7D 5D
```

`0x7E XOR 0x20 = 0x5E` and `0x7D XOR 0x20 = 0x5D`. The XOR rather than a plain copy ensures the escaped byte is not itself a flag.

| Payload | Expansion |
| :--- | :---: |
| No flag or escape bytes | 0% |
| Random bytes | `2/256` = **0.78%** |
| All `0x7E` | **100%**, the worst case |

**The shared consequence is the point.** Under either scheme the length of a frame on the wire **depends on its contents**, so the efficiency figures in parts 1 and 2 are averages rather than guarantees, and a transmit buffer must be sized for the worst case: 1.2 times the frame for bit stuffing and 2 times for byte stuffing. This is also why length-prefixed framing, as Ethernet and IP use, is preferred where the lower layer already provides synchronisation: **no escaping, no data-dependent length, at the cost of being unable to resynchronise if the length field is corrupted.**

#### Verify it

```python
"""
Framing efficiency against goodput, the optimal frame size, and the
expansion caused by bit and byte stuffing.
"""
import math

HEADER, TRAILER = 40, 4
H = HEADER + TRAILER


def efficiency(payload, h=H):
    return payload / (payload + h)


def p_intact(frame_bytes, p):
    return (1 - p) ** (8 * frame_bytes)


def goodput(payload, p, h=H):
    frame = payload + h
    return efficiency(payload, h) * p_intact(frame, p)


def optimal_frame(p, h=H):
    """Positive root of k L^2 - k H L - H = 0, with k = 8p."""
    k = 8 * p
    return h / 2 + math.sqrt(h * h / 4 + h / k)


if __name__ == "__main__":
    print("-- Parts 1 and 2: framing efficiency rises forever")
    print(f"   {'payload':>9}{'frame':>8}{'efficiency':>12}{'overhead':>11}")
    for pay in (46, 64, 100, 500, 1500, 9000, 65000):
        tot = pay + H
        note = ""
        if pay == 1500:
            note = "  Ethernet MTU"
        elif pay == 9000:
            note = "  jumbo"
        elif pay == 46:
            note = "  Ethernet min payload"
        print(f"   {pay:>9}{tot:>8}{100*efficiency(pay):>11.2f}%"
              f"{100*H/tot:>10.2f}%{note}")
    print(f"   1500: {1500}/{1500+H} = {100*efficiency(1500):.2f}%")
    print(f"    100: {100}/{100+H} = {100*efficiency(100):.2f}%")
    print("   monotonic, so efficiency alone cannot bound frame size")

    print("\n-- Part 3: goodput has a peak")
    p = 1e-6
    print(f"   at BER {p:.0e}")
    print(f"   {'payload':>9}{'frame eff':>12}{'P(intact)':>12}"
          f"{'goodput':>11}")
    best = max(((pay, goodput(pay, p)) for pay in range(50, 70000, 10)),
               key=lambda t: t[1])
    for pay in (64, 500, 1500, 2300, 4000, 9000, 20000, 65000):
        g = goodput(pay, p)
        note = "  <- peak" if pay == 2300 else ""
        print(f"   {pay:>9}{100*efficiency(pay):>11.2f}%"
              f"{100*p_intact(pay+H, p):>11.2f}%{100*g:>10.2f}%{note}")
    print(f"   sampled peak at payload {best[0]} bytes, "
          f"goodput {100*best[1]:.2f}%")
    print(f"   65000 B goodput {100*goodput(65000, p):.2f}% is about the "
          f"same as 64 B at {100*goodput(64, p):.2f}%,")
    print("   for the opposite reason: a frame is discarded as a WHOLE")

    print("\n-- Part 4: the optimal frame size")
    print(f"   L* = H/2 + sqrt(H^2/4 + H/(8p)),  approx sqrt(H/(8p))")
    print(f"   {'BER':>8}{'L*':>10}{'payload':>10}{'goodput':>10}"
          f"{'approx':>10}")
    for pp in (1e-4, 1e-5, 1e-6, 1e-7, 1e-9):
        L = optimal_frame(pp)
        approx = math.sqrt(H / (8 * pp))
        g = goodput(L - H, pp)
        print(f"   {pp:>8.0e}{L:>10.0f}{L-H:>10.0f}{100*g:>9.2f}%"
              f"{approx:>10.0f}")
    L6 = optimal_frame(1e-6)
    print(f"   the closed form at 1e-6 gives {L6:.0f} B, and sampling found "
          f"{best[0]+H} B: agree")
    print(f"\n   so at BER 1e-6 the optimum is {L6:.0f} B, already above "
          f"Ethernet's 1544 B,")
    print(f"   and at 1e-9 (fibre) it is {optimal_frame(1e-9):.0f} B, "
          f"about {optimal_frame(1e-9)/1544:.0f}x the Ethernet frame.")
    print("   the formula does NOT explain 1500; it says 1500 is too small.")
    t = 74184 * 8 / 1e9
    print(f"   one real reason to stay small: a 74 KB frame at 1 Gbps "
          f"occupies the link for {t*1000:.2f} ms,")
    print("   blocking everything behind it (head-of-line blocking), and "
          "path MTU\n   discovery fails silently when middleboxes drop "
          "the ICMP messages")

    print("\n-- Part 5: bit stuffing, HDLC")

    def bit_stuff(bits):
        out, run = [], 0
        for c in bits:
            out.append(c)
            run = run + 1 if c == '1' else 0
            if run == 5:
                out.append('0')
                run = 0
        return ''.join(out)

    def bit_unstuff(bits):
        out, run, i = [], 0, 0
        while i < len(bits):
            c = bits[i]
            out.append(c)
            run = run + 1 if c == '1' else 0
            if run == 5:
                i += 1              # drop the stuffed zero
                run = 0
            i += 1
        return ''.join(out)

    cases = (("all ones", "1" * 40), ("flag pattern repeated", "01111110" * 5),
             ("mixed", "011111101111110101"))
    for name, bits in cases:
        st = bit_stuff(bits)
        assert bit_unstuff(st) == bits, name
        print(f"   {name:<24}{len(bits):>4} -> {len(st):>4} bits, "
              f"{100*(len(st)-len(bits))/len(bits):>5.1f}% expansion")
    print(f"   worst case is 1 stuffed bit per 5 data bits = 20%")
    print(f"   random data: P(a position completes five 1s) = 1/32 = "
          f"{100/32:.3f}%")
    assert "01111110" not in bit_stuff("1" * 40 + "0")
    print("   and the flag 01111110 can never appear in stuffed output")

    print("\n-- Part 6: byte stuffing, PPP")
    FLAG, ESC, XOR = 0x7E, 0x7D, 0x20

    def byte_stuff(data):
        out = []
        for b in data:
            if b in (FLAG, ESC):
                out += [ESC, b ^ XOR]
            else:
                out.append(b)
        return out

    def byte_unstuff(data):
        out, i = [], 0
        while i < len(data):
            if data[i] == ESC:
                out.append(data[i + 1] ^ XOR)
                i += 2
            else:
                out.append(data[i])
                i += 1
        return out

    payload = [0x48, 0x7E, 0x20, 0x7D, 0x41]
    stuffed = byte_stuff(payload)
    assert byte_unstuff(stuffed) == payload
    print(f"   payload  {' '.join(f'{b:02X}' for b in payload)}")
    print(f"   on wire  {FLAG:02X} | "
          f"{' '.join(f'{b:02X}' for b in stuffed)} | {FLAG:02X}")
    print(f"   7E XOR 20 = {FLAG ^ XOR:02X}, 7D XOR 20 = {ESC ^ XOR:02X}")
    for name, data in (("no flags or escapes", [0x41] * 10),
                       ("all flag bytes", [FLAG] * 10)):
        st = byte_stuff(data)
        print(f"   {name:<22}{len(data):>4} -> {len(st):>4} bytes, "
              f"{100*(len(st)-len(data))/len(data):>6.1f}% expansion")
    print(f"   random bytes: 2 of 256 need escaping = {100*2/256:.2f}%")
    print("\n   either way, frame length on the wire is DATA-DEPENDENT, so")
    print("   the efficiency figures are averages and buffers must be sized")
    print("   for the worst case: 1.2x for bit stuffing, 2x for byte stuffing")
```

---

### What they ask next

**"What is the efficiency at 1,500 and at 100 bytes?"**
`1500/1544 = 97.15%` and `100/144 = 69.44%`. The overhead share goes from 2.85% to 30.56%, so cutting the payload by a factor of 15 raises the overhead share by a factor of 10.7. **Both numbers come from the same 44 bytes of fixed cost**, which is the entire mechanism.

**"Why not use infinitely large frames, then?"**
Because **framing efficiency is the wrong quantity** and it rises monotonically, so it can never produce an upper bound. The right quantity is **goodput**, efficiency multiplied by the probability the frame arrives intact. Damage is per bit but discarding is per frame, so `P(intact) = (1-p)^(8L)` falls geometrically with size, and the product of a rising ratio and a falling exponential has an interior maximum.

**"Show the peak."**
At `p = 10^-6`, goodput runs 59.21% at 64 bytes, 95.96% at 1,500, peaks at about **96.30% around 2,300 bytes**, and falls to 59.39% at 65,000. The striking row is the last one: **a 65,000-byte frame performs about as badly as a 64-byte frame, for the opposite reason**, with efficiency at 99.93% and `P(intact)` collapsed to 59%.

**"Derive the optimal frame size."**
Maximise `G(L) = (L-H)/L x e^(-8pL)`. Taking logs and differentiating gives `H/(L^2 - HL) = 8p`, hence `8pL^2 - 8pHL - H = 0`, whose positive root is `L* = H/2 + sqrt(H^2/4 + H/(8p))`, which for small `p` is approximately **`sqrt(H/(8p))`**. The useful reading is that the optimum goes as the **inverse square root of the error rate**, so a hundredfold more reliable link wants a tenfold larger frame.

**"Does that explain the 1500-byte MTU?"**
No, and this is the part worth getting right. At `p = 10^-6` the optimum is **2,367 bytes**, already above Ethernet's 1,544-byte frame, and at `10^-9`, which is what fibre delivers, it is **74 kilobytes**, nearly fifty times larger. **The formula says 1,500 is far too small**, so presenting it as the justification is a mistake. The real reasons are elsewhere.

**"So why has it not changed?"**
Mostly **path MTU compatibility**. Jumbo frames of 9,000 bytes are routine inside data centres where one operator controls every link, and unusable across the public Internet because the smallest link on the path governs and **path MTU discovery** fails silently when a middlebox drops the ICMP "fragmentation needed" messages. The resulting **MTU black hole** gives a connection that handshakes fine and then hangs on the first large transfer, which is far worse than mild inefficiency. Secondary reasons: **head-of-line blocking**, since a 74 KB frame at 1 Gbps holds the link for 0.6 ms, **CRC-32's weakening guarantee** over longer blocks, and historically 1980s buffer cost and collision-detection timing.

**"What is wrong with the error model?"**
It assumes **independent** bit errors, and real errors are **bursty**: a radio fade or a bad connector corrupts a run of bits. Bursts favour larger frames relative to this model, since one burst ruins one frame regardless of length, so the true optimum is larger still. That strengthens rather than weakens the conclusion that the information-theoretic argument does not justify 1,500.

**"Explain bit stuffing."**
HDLC reserves the flag `01111110` and guarantees it cannot occur in data by **inserting a `0` after five consecutive `1`s**; the receiver removes any `0` following five `1`s. Six consecutive ones therefore become impossible. **The worst case is all-ones data at 20% expansion**, one stuffed bit per five, and random data costs the probability that a position completes a run of five ones, `1/32`, or about **3.1%**.

**"And byte stuffing?"**
PPP reserves flag `0x7E` and escape `0x7D`, and replaces any occurrence of either with `0x7D` followed by the byte **XOR `0x20`**, so `0x7E` becomes `0x7D 0x5E`. The XOR rather than a plain copy ensures the escaped byte is not itself a flag. **Worst case is a payload of all flag bytes at 100% expansion**, and random bytes cost `2/256 = 0.78%`.

**"What do the two stuffing schemes have in common?"**
They make **frame length on the wire depend on the contents**, so the efficiency figures are averages rather than guarantees and a transmit buffer has to be sized for the worst case, 1.2 times for bit stuffing and 2 times for byte stuffing. That is a real argument for **length-prefixed** framing, as Ethernet and IP use: no escaping and no data-dependent length, at the cost of being unable to resynchronise when the length field is corrupted.

**"When would you actually want jumbo frames?"**
Inside a data centre or on a storage network, where one operator controls every link so the path MTU is known, the error rate is low enough that the optimum is far above 1,500, and the per-frame CPU cost of interrupts and checksums is a real share of the budget. The gain is mostly in **reduced per-frame processing** rather than in the 2% of header overhead, which is why **TSO and LRO**, offloading segmentation to the network card, capture much of the same benefit without changing the MTU on the wire.

**The common wrong answer** is answering the "why not infinite" question with framing efficiency, which rises monotonically and cannot bound anything, instead of with goodput. Next is deriving the optimal-MTU formula and presenting it as the explanation for 1,500, when it gives 2,367 at `10^-6` and 74 KB at `10^-9` and therefore argues the opposite. Third is quoting bit stuffing's cost as 3% without distinguishing the random-data average from the 20% worst case a buffer must accommodate. And last is forgetting the XOR in byte stuffing and simply prefixing the escape, which leaves the flag byte intact in the stream and defeats the whole mechanism.

---

### Say this in the interview

*"Overhead is forty plus four, so forty-four bytes. At a fifteen-hundred-byte payload the frame is 1,544 and efficiency is 1500 over 1544, which is 97.15 percent, so overhead is 2.85 percent. At a hundred-byte payload the frame is 144 and efficiency is 69.44 percent, so overhead is 30.56 percent. Same forty-four bytes of fixed cost; the payload fell by a factor of fifteen and the overhead share rose by a factor of about eleven.*

*For why not infinitely large frames, the key move is noticing that framing efficiency is the wrong quantity. It rises monotonically towards one, so it can never produce an upper bound, and nothing in that column argues against a sixty-five-thousand-byte frame. The right quantity is goodput, which is efficiency times the probability the frame arrives intact. The asymmetry that matters is that damage is per bit but discarding is per frame: one bad bit anywhere and the whole frame is thrown away. So with independent errors at rate p, survival is one minus p, to the power eight L, which decays geometrically with size. A rising ratio times a falling exponential has an interior maximum.*

*Concretely at a bit error rate of ten to the minus six: sixty-four byte payloads give 59 percent goodput, fifteen hundred gives 96 percent, the peak is about 96.3 percent around twenty-three hundred bytes, and sixty-five thousand bytes gives 59.4 percent. That last row is the one I would point at: a sixty-five-thousand-byte frame is about as bad as a sixty-four byte frame, for the opposite reason. Its framing efficiency is 99.93 percent but its chance of arriving intact has collapsed to 59 percent.*

*For the optimum, maximise L minus H over L, times e to the minus eight p L. Take logs, differentiate, and you get H over L squared minus H L equals eight p, so eight p L squared minus eight p H L minus H equals zero, and the positive root is H over two plus the square root of H squared over four plus H over eight p. For small p that is approximately the square root of H over eight p, so the optimum goes as the inverse square root of the error rate: a hundred times more reliable link wants a ten times larger frame.*

*And here is where I would be honest rather than tidy, because this is usually presented as if it explained the Ethernet MTU. At ten to the minus six the formula gives 2,367 bytes, which is already above Ethernet's 1,544-byte frame. At ten to the minus nine, which is what a real fibre link delivers, it gives about seventy-four kilobytes, nearly fifty times larger. So the derivation does not justify fifteen hundred bytes; it says fifteen hundred is far too small for modern links.*

*The real reasons it has not moved are operational. The binding one is path MTU compatibility: jumbo frames of nine thousand bytes are routine inside data centres where one operator controls every link, and unusable across the public Internet because the smallest link on the path governs, and path MTU discovery fails silently when a middlebox drops the ICMP fragmentation-needed messages. That gives you an MTU black hole, a connection that handshakes fine and then hangs on the first large transfer, which is a far worse failure than a couple of percent of inefficiency. Then head-of-line blocking, since a seventy-four kilobyte frame at a gigabit holds the link for about six tenths of a millisecond and delays everything behind it; CRC-32's detection guarantee weakening over longer blocks; and historically 1980s buffer cost and collision-detection timing on shared coax. I would also flag that the error model assumes independent bit errors where real errors are bursty, and bursts favour larger frames, which strengthens the conclusion rather than weakening it.*

*On stuffing: HDLC reserves the flag 01111110 and guarantees it cannot occur in data by inserting a zero after five consecutive ones, and the receiver deletes any zero following five ones, so six consecutive ones become impossible. Worst case is all-ones data at twenty percent expansion, one stuffed bit per five, and for random data the cost is the probability that a position completes a run of five ones, which is one in thirty-two, so about three point one percent. PPP does the same job in bytes: flag 0x7E, escape 0x7D, and any occurrence of either becomes 0x7D followed by the byte XORed with 0x20, so 0x7E becomes 0x7D 0x5E. The XOR rather than a plain copy matters, because otherwise the escaped byte would still be a flag. Worst case there is a payload of all flag bytes at a hundred percent expansion, and random bytes cost two in two hundred and fifty-six, about nought point eight percent.*

*The shared consequence is the part worth finishing on: under either scheme the length of a frame on the wire depends on its contents, so my efficiency figures are averages rather than guarantees, and a transmit buffer has to be sized for the worst case, one point two times for bit stuffing and two times for byte stuffing. That is a genuine argument for length-prefixed framing, which is what Ethernet and IP use: no escaping and no data-dependent length, at the cost of not being able to resynchronise if the length field itself is corrupted."*
