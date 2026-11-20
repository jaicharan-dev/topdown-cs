---
id: 9-sliding-window
title: "Sliding Window: Window Size and Sequence Numbering"
description: "Efficiency rises linearly to the knee at 201 frames and then stops, and Selective Repeat needs one more sequence bit than Go-Back-N despite being the better protocol"

sidebar_position: 9
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Using a link with bandwidth 5 Mbps and propagation delay 20 ms, a sender uses Sliding Window ARQ with 1000-bit frames. Calculate the minimum window size for full utilization using $N = 1 + 2a$, analyze efficiency with a halved window, compare Go-Back-N vs. Selective Repeat sequence numbering constraints, and explain the sequence number ambiguity trap."

---

### Picture it

The conveyor belt again, but now you are allowed several boxes on it at once, and the only question is how many.

**The first part of the answer is boring and the second part is not.** Boring: the belt holds a definite number of boxes, you should put that many on, and the number is 201. Putting on 100 gets you half the throughput, putting on 201 gets you all of it, and putting on 400 gets you exactly the same as 201 because **the belt cannot hold more than it holds.** Efficiency climbs in a straight line to a knee and then goes flat, and the knee is the pipe.

The interesting part is what happens to the labels.

You have to number the boxes, because acknowledgements come back out of order and late, and a bare "got it" tells you nothing about *which*. So you put a label on each box. And labels are a fixed-width field, so **they run out and start again.**

Now consider what the receiver sees. A box labelled 0 arrives. Is this the box 0 it has been waiting for, or is it a replacement for a box 0 it already took delivery of a while ago, sent again because the acknowledgement went missing? **The box is identical either way.** There is nothing in it that says which, and if the receiver guesses wrong it either throws away good data or files a duplicate as though it were new.

So the label space has to be big enough that the question never arises, and **"big enough" turns out to depend on how the receiver behaves**, which is the genuinely subtle result on this page.

If the receiver only ever waits for one specific box and refuses everything else, you need just one spare label: enough that the box the sender might resend is never the box the receiver is now expecting.

But if the receiver is cleverer and keeps a set of boxes it is willing to accept out of order, then **the receiver has a window too**, and the two windows both occupy label space at the same time. Both have to fit, so each can only have half. The better protocol needs a wider label field, which is the opposite of what you would guess, and it is worth being able to show with four labels and a two-box window rather than asserting it.

---

### The proper terms

#### The window, and the number that sizes it

A **sliding window** protocol allows up to `W` unacknowledged frames in flight, where `W` is the **window size**. The sender advances the window as acknowledgements arrive.

The full-utilisation window is the number of frames that fit in the round-trip pipe, counting the one being transmitted:

$$N = 1 + 2a \quad \text{where } a = \frac{T_p}{T_t}$$

That is the same `1 + 2a` that appears as the denominator of stop-and-wait's utilisation, and noticing they are the same number is the point: **stop-and-wait is the `W = 1` case of this protocol**, and it achieves `1/N` precisely because it uses one slot of `N`.

Efficiency as a function of window size is:

$$U = \min\left(1, \ \frac{W}{1 + 2a}\right)$$

The `min` is the whole shape. **Efficiency is linear in `W` up to the pipe size and then completely flat**, so a window beyond `N` buys nothing at all, and oversizing wastes only buffer memory rather than throughput.

#### The two retransmission strategies

**Go-Back-N** keeps a sending window of `W` and a receiving window of exactly 1. The receiver accepts only the next frame in order and discards anything else. On a loss or timeout the sender retransmits the lost frame and everything after it, hence the name.

**Selective Repeat** keeps a sending window of `W` and a receiving window of `W` as well. The receiver buffers out-of-order frames and acknowledges them individually, so the sender retransmits only what was actually lost.

The trade is state against bandwidth. Go-Back-N needs one timer and no receive buffer; Selective Repeat needs a buffer and a timer per outstanding frame. On one loss with `W = 201`, Go-Back-N resends up to 201 frames and Selective Repeat resends one, which is a 201-fold difference in wasted capacity.

#### Why sequence numbers run out

Sequence numbers live in a `k`-bit field, so they are arithmetic modulo `2^k` and they wrap. The constraint comes from a single requirement: **the receiver must never mistake a retransmission of an old frame for a new frame.**

**Go-Back-N:** `W <= 2^k - 1`. The receiving window is 1, so the only confusion possible is between the frame the sender might resend and the frame the receiver is currently expecting. Leaving one sequence number unused guarantees those are different.

**Selective Repeat:** `W <= 2^(k-1)`. The receiving window is also `W`, so the sender's window and the receiver's window both occupy sequence space simultaneously. The requirement is that they never overlap, which means `W_sender + W_receiver <= 2^k`, and with both equal to `W` that gives `W <= 2^k / 2`.

**So Selective Repeat needs roughly twice the sequence space for the same window**, or equivalently one more bit, and the reason is exactly that its receiver is the cleverer one. The cost of buffering out-of-order frames is paid in label width.

#### What happens when the window is too large

The failure is not a crash; it is silent data corruption. A retransmitted frame falls inside the receiver's current window and is accepted as fresh data, so a duplicate is delivered to the application as though it were new. That is worse than a lost frame, because a loss is eventually noticed and a duplicate inserted into a byte stream is not.

#### How TCP does it

TCP is closest to **Selective Repeat with cumulative acknowledgements**: the ACK field is cumulative, and **SACK** options report which additional blocks arrived, letting the sender retransmit selectively. Its sequence numbers are 32-bit **byte** counts rather than frame counts, so the space is 4 GB of data rather than a few hundred frames.

Wraparound is still real on a fast link, which is why **PAWS**, protection against wrapped sequence numbers, uses the timestamp option to reject segments that are old rather than merely out of range. At 10 Gbps a 32-bit byte space wraps in about three seconds, comfortably inside the time a delayed duplicate could survive in the network.

---

### Work it out

#### Given

| Quantity | Value |
| :--- | :--- |
| Bandwidth `B` | 5 Mbps |
| Propagation delay `Tp` | 20 ms, one way |
| Frame size `L` | 1,000 bits |

#### Part 1: the minimum window for full utilisation

$$T_t = \frac{1000}{5 \times 10^6} = 0.2 \text{ ms}$$

$$a = \frac{T_p}{T_t} = \frac{20}{0.2} = 100$$

$$N = 1 + 2a = 1 + 200 = \mathbf{201 \text{ frames}}$$

Check it against the physical pipe, which is the step that makes the formula mean something rather than being recited:

| Quantity | Bits |
| :--- | :---: |
| Round-trip bandwidth-delay product, `B x 2Tp` | 200,000 |
| Plus the frame currently being transmitted | 1,000 |
| **Total** | **201,000** |
| `N x L = 201 x 1000` | **201,000** |

**They agree exactly.** `N = 1 + 2a` is not an empirical formula; it is the round-trip pipe measured in frames, and the `1` is the frame on the wire right now. That identity is worth stating because it also tells you when the formula does not apply: it assumes the ACK is negligibly small and that there are no losses or processing delays.

In data terms, 201 frames outstanding is **24.5 KiB**, which is comfortably inside TCP's unscaled 64 KB window, so this link needs no window scaling at all.

#### Part 2: efficiency as the window changes

$$U = \min\left(1, \frac{W}{201}\right)$$

| `W` | Efficiency | Throughput | Note |
| :---: | :---: | :---: | :--- |
| 1 | 0.50% | 0.025 Mbps | this is stop-and-wait |
| 2 | 1.00% | 0.050 Mbps | |
| 50 | 24.88% | 1.244 Mbps | |
| 100 | 49.75% | 2.488 Mbps | |
| **100.5** | **50.00%** | **2.500 Mbps** | the halved window |
| **201** | **100.00%** | **5.000 Mbps** | **the knee** |
| 300 | 100.00% | 5.000 Mbps | no further gain |
| 1,000 | 100.00% | 5.000 Mbps | no further gain |

**The halved window gives exactly half the efficiency**, 50% and 2.5 Mbps, which falls out of the linearity rather than needing its own calculation. With an integer window of 100 it is 49.75%.

```
  efficiency
    100% |                    ,-------------------------
         |                  ,'
         |                ,'
     50% |- - - - - - - ,'
         |            ,'|
         |          ,'  |
       0 +--------,'----+-------------------------------
         0      100.5  201                          400
                      the knee                        W
```

**Linear, then flat.** The two regimes have completely different character and it is worth naming them. Below the knee you are **pipe-limited**: every extra frame of window converts directly into throughput, and the link is idle part of the time. Above the knee you are **bandwidth-limited**: the link is busy continuously, more window adds only buffering, and the extra frames sit in queues adding latency without adding throughput. **That second half is bufferbloat in miniature.**

#### Part 3: sequence number width

**Go-Back-N** requires `W <= 2^k - 1`:

| `k` | `2^k - 1` | Enough for 201? |
| :---: | :---: | :--- |
| 7 | 127 | no |
| **8** | **255** | **yes** |

**8 bits.**

**Selective Repeat** requires `W <= 2^(k-1)`:

| `k` | `2^(k-1)` | Enough for 201? |
| :---: | :---: | :--- |
| 8 | 128 | no |
| **9** | **256** | **yes** |

**9 bits.**

So Selective Repeat needs **one more bit** for the same window, and it is the better protocol. That inversion is the thing to be able to explain: Selective Repeat's receiver maintains a window of its own, so sender and receiver windows occupy sequence space at the same time and both must fit inside `2^k`.

| | Receiving window | Constraint | `k` for `W = 201` | Resent on one loss |
| :--- | :---: | :--- | :---: | :---: |
| **Go-Back-N** | 1 | `W <= 2^k - 1` | **8 bits** | up to **201 frames** |
| **Selective Repeat** | `W` | `W <= 2^(k-1)` | **9 bits** | **1 frame** |

#### Part 4: the ambiguity trap, worked with four sequence numbers

The constraints are easiest to believe at `k = 2`, where sequence numbers are 0, 1, 2, 3.

**Go-Back-N with `W = 3`, which satisfies `W <= 2^k - 1 = 3`.**

The sender sends frames 0, 1, 2. The next new frame would be 3. Suppose the receiver got all three and acknowledged them, and **every acknowledgement was lost.** The sender times out and retransmits frame 0. The receiver, having accepted 0, 1 and 2, is now expecting frame **3**. The arriving frame is labelled 0, which is not 3, so **the receiver correctly recognises it as a retransmission and discards it.** No harm.

**Go-Back-N with `W = 4`, which violates the constraint.**

The sender sends 0, 1, 2, 3. The next new frame would be 0 again. Same scenario: all ACKs lost, sender retransmits frame 0, and the receiver is now expecting frame **0**.

```
  sender  : sent 0 1 2 3, all ACKs lost, retransmits 0
  receiver: accepted 0 1 2 3, now expecting 0
                                            ^
                      the retransmitted 0 IS the expected 0
```

**The receiver accepts the retransmitted frame 0 as new data.** A duplicate is delivered to the application, silently. That single spare sequence number is what prevents it.

**Selective Repeat with `W = 3`, which violates `W <= 2^(k-1) = 2`.**

Sender window is {0, 1, 2}. The receiver accepts all three, acknowledges, and slides its window forward to {3, 0, 1}. All ACKs are lost. The sender times out and retransmits frame 0.

```
  sequence space:   0   1   2   3
  sender window   [ 0   1   2 ]
  receiver window         [ 3   0   1 ]   after accepting 0,1,2
                            ^^^^^^^^^
                    overlap on 0 and 1

  retransmitted frame 0 lands INSIDE the receiver's new window
  -> buffered as a NEW frame 0, duplicate delivered
```

**The overlap is the bug.** The receiver's new window contains 0 and 1, which are also sender-window labels, so a retransmission of either is indistinguishable from a fresh frame and gets buffered as new data.

**Selective Repeat with `W = 2`, which satisfies the constraint.**

Sender window {0, 1}, receiver window after accepting both {2, 3}. **No overlap.** A retransmitted 0 or 1 falls outside the receiver's window and is correctly discarded as a duplicate.

That is the derivation of the rule: `W_sender + W_receiver <= 2^k`, and with both windows equal to `W`, `2W <= 2^k`, so `W <= 2^(k-1)`.

#### Part 5: what the window costs when the link loses frames

Everything above assumes no losses. Add one and the two protocols diverge sharply, with `W = 201`:

| | Frames resent per loss | Wasted capacity |
| :--- | :---: | :---: |
| **Go-Back-N** | up to 201 | 201 kbit |
| **Selective Repeat** | 1 | 1 kbit |

**A 201-fold difference**, and it scales with `a`. This is why Go-Back-N is reasonable on a short link where the window is small and unusable on a long one where it is large: **the cost of Go-Back-N's simplicity is proportional to the window, which is proportional to the pipe.**

What Selective Repeat pays instead is state. It needs a receive buffer of `W` frames, a timer per outstanding frame rather than one timer, and the wider sequence field from part 3. On this link that is 201 buffers and 201 timers, which is cheap now and was not in 1980.

#### Verify it

```python
"""
Sliding window: the window that fills the pipe, efficiency against W,
sequence number width, and the ambiguity trap shown at k = 2.
"""

B, TP, L = 5e6, 20e-3, 1000


def pipe_frames(bw=B, tp=TP, frame=L):
    tt = frame / bw
    a = tp / tt
    return tt, a, 1 + 2 * a


if __name__ == "__main__":
    tt, a, N = pipe_frames()
    print("-- Part 1: the window that fills the pipe")
    print(f"   Tt = {L}/{B:.0e} = {tt*1000:.2f} ms")
    print(f"   a  = Tp/Tt = {TP}/{tt} = {a:.0f}")
    print(f"   N  = 1 + 2a = {N:.0f} frames")
    rtt_pipe = B * 2 * TP
    print(f"\n   check it against the physical pipe:")
    print(f"     RTT bandwidth-delay product = {rtt_pipe:,.0f} bits")
    print(f"     plus the frame on the wire  = {L:,.0f} bits")
    print(f"     total                       = {rtt_pipe + L:,.0f} bits")
    print(f"     N * L                       = {N*L:,.0f} bits")
    assert abs(N * L - (rtt_pipe + L)) < 1e-6
    print(f"   they agree: N is the round-trip pipe measured in frames,")
    print(f"   and the '1' is the frame being transmitted right now")
    print(f"   {N:.0f} frames outstanding = {N*L/8/1024:.1f} KiB, "
          f"inside TCP's unscaled 64 KB")

    print("\n-- Part 2: efficiency = min(1, W / (1 + 2a))")
    print(f"   {'W':>8}{'efficiency':>13}{'throughput':>14}")
    for w in (1, 2, 50, 100, 100.5, 201, 300, 1000):
        e = min(1.0, w / N)
        note = ""
        if w == 1:
            note = "   stop-and-wait"
        elif abs(w - N / 2) < 0.6:
            note = "   the halved window"
        elif abs(w - N) < 0.01:
            note = "   <- the knee"
        elif w > N:
            note = "   no further gain"
        print(f"   {w:>8.1f}{e*100:>12.2f}%{e*B/1e6:>12.3f} Mbps{note}")
    print(f"   halved window {N/2:.1f} gives exactly "
          f"{100*(N/2)/N:.0f}%: linearity, not a separate calculation")

    print("\n-- Part 3: sequence number width")
    rules = (("Go-Back-N", "W <= 2^k - 1", lambda k: 2**k - 1, 1),
             ("Selective Repeat", "W <= 2^(k-1)", lambda k: 2**(k-1), None))
    for name, rule, cap, rwin in rules:
        k = next(x for x in range(1, 20) if cap(x) >= N)
        rw = "1" if rwin == 1 else "W"
        print(f"   {name:<18} recv window {rw:<2} {rule:<14} "
              f"-> k = {k} bits (max W = {cap(k)})")
    print("   Selective Repeat needs one MORE bit, because its receiver has")
    print("   a window too, so both windows occupy sequence space at once")

    print("\n-- Part 4: the trap at k = 2, sequence numbers 0..3")
    SPACE = 4

    print("\n   Go-Back-N, receiving window = 1")
    for w in (3, 4):
        sent = [i % SPACE for i in range(w)]
        expecting = w % SPACE
        resent = sent[0]
        ok = resent != expecting
        print(f"     W = {w} ({'ok' if w <= SPACE - 1 else 'VIOLATES'} "
              f"W <= 2^k - 1 = {SPACE-1}):")
        print(f"       sender sent {sent}; all ACKs lost; retransmits "
              f"{resent}")
        print(f"       receiver has accepted all and now expects "
              f"{expecting}")
        print(f"       retransmitted {resent} vs expected {expecting}: "
              f"{'distinguishable, discarded' if ok else 'IDENTICAL -> accepted as NEW'}")

    print("\n   Selective Repeat, receiving window = W")
    for w in (2, 3):
        sender = [i % SPACE for i in range(w)]
        receiver = [(w + i) % SPACE for i in range(w)]
        overlap = sorted(set(sender) & set(receiver))
        limit = SPACE // 2
        print(f"     W = {w} ({'ok' if w <= limit else 'VIOLATES'} "
              f"W <= 2^(k-1) = {limit}):")
        print(f"       sender window {sender}, receiver window after "
              f"accepting all {receiver}")
        print(f"       sender W + receiver W = {2*w} against space {SPACE}: "
              f"{'fits' if 2*w <= SPACE else 'exceeds'}")
        if overlap:
            print(f"       overlap on {overlap} -> a retransmitted "
                  f"{overlap[0]} is buffered as NEW data")
        else:
            print(f"       no overlap -> every retransmission is correctly "
                  f"discarded")
    print("\n   so the rule is W_sender + W_receiver <= 2^k, and with both")
    print("   equal to W that is 2W <= 2^k, hence W <= 2^(k-1)")

    print("\n-- Part 5: cost of one loss at W = 201")
    n = int(N)
    print(f"   Go-Back-N:        up to {n} frames resent = "
          f"{n*L/1000:.0f} kbit")
    print(f"   Selective Repeat: {1} frame resent = {L/1000:.0f} kbit")
    print(f"   ratio {n}x, and it scales with a, which is why Go-Back-N is")
    print(f"   fine on a short link and unusable on a long one")
    print(f"   Selective Repeat pays instead: {n} receive buffers, "
          f"{n} timers, and 9-bit sequence numbers")
```

---

### What they ask next

**"Where does `N = 1 + 2a` come from?"**
It is the round-trip pipe measured in frames. `Tt = 0.2 ms`, `a = 100`, so `N = 201`, and checking it against the physics: the round-trip bandwidth-delay product is 200,000 bits plus the 1,000-bit frame on the wire gives 201,000 bits, which is exactly `201 x 1000`. **The `1` is the frame being transmitted right now and the `2a` is the round trip**, so the formula is a measurement rather than an empirical fit. It assumes a negligibly small ACK and no losses.

**"How does efficiency behave as `W` grows?"**
`U = min(1, W/201)`, so **linear up to the knee at 201 and then perfectly flat.** A window of 100.5 gives exactly 50%, which follows from linearity without a separate calculation. Beyond 201 there is no gain at all, because the pipe cannot hold more than it holds.

**"What is happening on each side of the knee?"**
Below it you are **pipe-limited**: the link is idle part of the time and every extra frame of window becomes throughput. Above it you are **bandwidth-limited**: the link is busy continuously, and extra window only adds frames to queues, which adds latency without adding throughput. **That second regime is bufferbloat in miniature**, and it is why oversizing a window is not free even though it costs no throughput.

**"Why does Go-Back-N allow `2^k - 1` and Selective Repeat only `2^(k-1)`?"**
Because their receivers differ. Go-Back-N's receiving window is **1**, so the only possible confusion is between the frame the sender might resend and the single frame the receiver expects, and one spare sequence number separates them. Selective Repeat's receiving window is **`W`**, so the sender's window and the receiver's window occupy sequence space simultaneously and must not overlap, giving `W_sender + W_receiver <= 2^k` and therefore `W <= 2^(k-1)`.

**"So the better protocol needs more sequence bits?"**
Yes, and it is worth saying plainly because it is counterintuitive. For `W = 201`, Go-Back-N needs **8 bits**, since `2^8 - 1 = 255`, and Selective Repeat needs **9**, since `2^8 = 256` is only reached at `k = 9`. The extra bit is the price of the receiver being able to buffer out of order, which is the same capability that makes Selective Repeat worth using.

**"Show me the ambiguity concretely."**
Take `k = 2`, so sequence numbers 0 to 3, and Go-Back-N with `W = 4`. The sender sends 0, 1, 2, 3 and the next new frame would be 0. The receiver accepts all four and acknowledges, **every ACK is lost**, the sender times out and retransmits frame 0, and the receiver is now expecting frame 0. **The retransmission is identical to the expected new frame**, so a duplicate is delivered as fresh data. With `W = 3` the receiver would be expecting 3, so the 0 is recognisably old.

**"And for Selective Repeat?"**
Same sequence space, `W = 3`, which violates the limit of 2. Sender window is {0, 1, 2}; the receiver accepts all three and slides to {3, 0, 1}. ACKs are lost, the sender retransmits 0, and **0 is inside the receiver's new window**, so it is buffered as a new frame. With `W = 2` the windows are {0, 1} then {2, 3}, which never overlap, so every retransmission is correctly discarded.

**"What actually goes wrong when the window is too big?"**
**Silent duplication**, not a crash or a stall. A retransmitted frame is accepted as new data and handed to the application. That is worse than a lost frame, because a loss is eventually detected and a duplicate inserted into a byte stream is indistinguishable from legitimate data.

**"What does Go-Back-N's simplicity cost?"**
Up to `W` frames resent per loss, so 201 frames here against Selective Repeat's 1, **a 201-fold difference in wasted capacity.** And the cost scales with `a`, so it grows exactly in the situations where you most need a large window. Go-Back-N is sensible on a short link and unusable on a long one, which is the practical reason real protocols are closer to Selective Repeat.

**"What does Selective Repeat cost?"**
State. A receive buffer of `W` frames, a timer per outstanding frame rather than one, and the wider sequence field. On this link that is 201 buffers and 201 timers, which is trivial today and was prohibitive when these protocols were designed, which is most of why Go-Back-N existed.

**"How does TCP fit in?"**
It is closest to **Selective Repeat with cumulative acknowledgements**: the ACK field is cumulative, and **SACK** options report the additional blocks that arrived so the sender can retransmit selectively. Its sequence numbers count **bytes** in a 32-bit field rather than frames, so the space is 4 GB. Wraparound is still real at high rates, which is why **PAWS** uses the timestamp option to reject segments that are old rather than merely out of range: at 10 Gbps a 32-bit byte space wraps in about three seconds, well inside the lifetime of a delayed duplicate.

**The common wrong answer** is quoting `N = 1 + 2a` without checking it against the bandwidth-delay product, which is what shows it is a measurement rather than a memorised formula. Next is giving both protocols the same sequence-number constraint, or getting the inversion backwards by assuming the simpler protocol needs more bits. Third is describing the too-large-window failure as a stall or a crash, when it is silent acceptance of a duplicate. And last is treating a larger window as always better, when efficiency is flat past the knee and the extra frames only add queueing latency.

---

### Say this in the interview

*"This is a sliding window protocol, so what I have to size is the window size. The transmission delay is a thousand bits over five megabits, so nought point two milliseconds, which makes a equal to twenty over nought point two, so a hundred. N is one plus two a, so two hundred and one frames.*

*I would check that against the physics rather than leaving it as a formula. The round-trip bandwidth-delay product is five megabits times forty milliseconds, which is two hundred thousand bits, plus the thousand-bit frame currently on the wire, so two hundred and one thousand bits, and that is exactly two hundred and one times a thousand. So N is the round-trip pipe measured in frames, and the one is the frame being transmitted right now. It assumes the ACK is negligibly small and there are no losses. In data terms two hundred and one frames is about twenty-four and a half kibibytes, comfortably inside TCP's unscaled sixty-four kilobyte window, so this link needs no window scaling.*

*Efficiency is the minimum of one and W over two hundred and one, so it is linear up to a knee at two hundred and one and then completely flat. The halved window, a hundred point five, gives exactly fifty percent and two and a half megabits, which follows from the linearity rather than needing its own calculation. Past the knee there is no gain at all. And the two sides of the knee have different character worth naming: below it you are pipe-limited, the link is idle part of the time and every extra frame of window becomes throughput; above it you are bandwidth-limited, the link is busy continuously and extra window only puts frames in queues, adding latency without adding throughput. That second regime is bufferbloat in miniature, which is why oversizing is not quite free even though it costs no throughput.*

*For sequence numbers, Go-Back-N needs W at most two to the k minus one, so for two hundred and one, k equals eight gives a maximum of two hundred and fifty-five, which works. Selective Repeat needs W at most two to the k minus one as an exponent, so two to the seventh is a hundred and twenty-eight, not enough, and k equals nine gives two hundred and fifty-six. So Selective Repeat needs one more bit for the same window, and it is the better protocol, which is the inversion worth being able to explain.*

*The reason is that the two have different receivers. Go-Back-N's receiving window is one: it accepts only the next frame in order, so the only possible confusion is between the frame the sender might resend and the single frame the receiver is expecting, and one spare sequence number keeps those apart. Selective Repeat's receiving window is also W, because it buffers out of order, so the sender's window and the receiver's window occupy sequence space at the same time and must not overlap. That gives sender W plus receiver W at most two to the k, and with both equal to W, W at most two to the k minus one. The extra bit is the price of being able to buffer out of order.*

*I would show the trap at k equals two, where sequence numbers are nought to three. Go-Back-N with W equals four, which violates the rule: the sender sends zero, one, two, three, and the next new frame would be zero again. Say the receiver accepted all four, acknowledged them, and every acknowledgement was lost. The sender times out and retransmits frame zero, and the receiver is now expecting frame zero. The retransmission is identical to the expected new frame, so a duplicate is accepted as fresh data. With W equals three the receiver would be expecting three, so the zero is recognisably old and gets discarded.*

*Selective Repeat with W equals three in the same space, which violates the limit of two: sender window is zero, one, two; the receiver accepts all three and slides its window to three, zero, one. ACKs are lost, the sender retransmits zero, and zero is inside the receiver's new window, so it gets buffered as a new frame. With W equals two the windows are zero-one and then two-three, which never overlap, so every retransmission is correctly discarded. And I would be specific about the failure mode: it is not a crash or a stall, it is silent data corruption, a duplicate handed to the application as new data, which is worse than a loss because a loss is eventually noticed.*

*Finally the cost comparison, which is the practical reason real protocols look like Selective Repeat. On one loss with a window of two hundred and one, Go-Back-N resends up to two hundred and one frames and Selective Repeat resends one, a two-hundred-fold difference, and that cost scales with a, so it grows exactly in the cases where you need a big window. Go-Back-N is fine on a short link and unusable on a long one. What Selective Repeat pays instead is state: a receive buffer per outstanding frame, a timer per frame rather than one timer, and the wider sequence field. That was prohibitive in 1980 and is trivial now. TCP is closest to Selective Repeat with cumulative acknowledgements, where the ACK is cumulative and SACK options report the extra blocks that arrived, and its sequence numbers count bytes in a thirty-two bit field rather than frames, so the space is four gigabytes. Wraparound still matters at high rates, which is why PAWS uses the timestamp option to reject segments that are genuinely old rather than merely out of range, since at ten gigabits a thirty-two bit byte space wraps in about three seconds."*
