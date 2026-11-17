---
id: 4-flow-control-congestion-control
title: "Flow Control vs Congestion Control"
description: "Two brakes on the same car, one protecting the person receiving and one protecting the road"

sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the difference between flow control and congestion control? How does the sender determine its effective transmission window, and what are Slow Start, AIMD, and Fast Retransmit/Recovery?"

---

### Picture it

You are dictating a long document to someone over the phone.

**The first reason to slow down is them.** They are writing by hand. If you talk faster than they can write, they lose words. So they tell you: "give me a moment", or "go on, I have caught up". You go exactly as fast as **they** can absorb. This has nothing to do with the phone line, which is perfect.

**The second reason to slow down is the line.** Suppose the connection is shared and overloaded, so words are being dropped in transit. Your listener can write as fast as you can talk; the problem is in the middle. And here is the awkward part: **nobody tells you.** There is no operator who announces that the line is busy. You have to work it out from the fact that your listener keeps asking you to repeat things.

So you do something cautious. You start slowly, speed up while everything is getting through, and the moment words start going missing you cut your speed sharply. Then you creep back up. You never learn the line's real capacity; you just keep probing it and backing off.

Two brakes, two different reasons. One is told to you explicitly by your listener. The other you have to **infer from failure**. That asymmetry is why one mechanism is simple and the other is an entire field of research.

---

### The proper terms

#### Flow control

**Flow control** protects the **receiver** from a sender that is too fast for it. It is an end-to-end matter between the two hosts, and the network is not involved.

The mechanism is the **sliding window**. The receiver advertises a **receive window**, **rwnd**, in the window field of every ACK it sends. That value is the **free space remaining in its receive buffer**, so it is explicit, accurate and current.

The sender may have at most **rwnd** bytes of unacknowledged data **in flight**. As acknowledgements come back, the window slides forward and more may be sent.

If the receiving application stops reading, the buffer fills and the receiver advertises a **zero window**, which stops the sender completely. The sender then sends periodic **window probes**, and the receiver sends a **window update** once space is free. Without probes, a lost window update would deadlock the connection forever.

The important property is that flow control is explicit. The receiver states its capacity, and the sender obeys a number it was given.

#### Congestion control

**Congestion control** protects the **network** from the collective behaviour of all senders. It is not about either endpoint's speed.

The problem it solves is **congestion collapse**: when routers are overloaded their queues fill and they drop packets, senders retransmit, which adds yet more traffic, and throughput falls towards zero while the links are fully busy. This actually happened to the early internet in 1986, which is why these algorithms exist.

The mechanism is the **congestion window**, **cwnd**, maintained by the sender alone. Unlike rwnd, nobody tells the sender what cwnd should be. The network sends no capacity signal, so the sender must **infer** congestion, and the signal it traditionally uses is **packet loss**, on the assumption that loss means a full queue.

So the contrast is exact: **rwnd is told to the sender, cwnd is guessed by the sender**.

#### The effective window

The sender obeys both brakes at once, so the number of bytes it may have in flight is:

```text
effective window = min(rwnd, cwnd)
```

Whichever limit is smaller is the one that binds, and knowing which one it is diagnoses the problem. If **rwnd** is the limit, the receiver is slow or its buffer is too small, and the fix is at the endpoint. If **cwnd** is the limit, the network is the constraint. A connection whose rwnd is small never reaches the available bandwidth however good the network is, which is why **window scaling** exists: the 16-bit window field caps out at 65535 bytes, far too small for a high **bandwidth-delay product**.

#### Slow Start

**Slow Start** is how a connection finds its starting speed without assuming anything.

The sender begins with a small **initial window**, historically 1 **MSS** and now typically **10 MSS**, and **doubles cwnd every round trip** by increasing it by one MSS for each segment acknowledged. The growth is **exponential**, which makes the name slightly misleading: it starts small but accelerates very quickly.

It stops in one of two ways. Either cwnd reaches the **slow start threshold**, **ssthresh**, at which point the sender switches to **congestion avoidance**, or loss occurs, which ends it immediately.

#### AIMD

**AIMD**, **Additive Increase Multiplicative Decrease**, is the steady-state behaviour after slow start, and it is the heart of TCP's congestion control.

**Additive increase.** While nothing is lost, cwnd grows by about **one MSS per round trip**. This is deliberately cautious probing for more bandwidth.

**Multiplicative decrease.** On detecting loss, cwnd is halved. This is deliberately aggressive, because the cost of being wrong is congestion collapse.

The asymmetry is the design. Increase slowly because you might be wrong about spare capacity; decrease sharply because you cannot afford to be wrong about overload. AIMD also provably converges towards a **fair** share between competing flows, which is why it was chosen over alternatives.

Plotted over time, cwnd traces the characteristic **sawtooth**: a slow climb, a sudden halving, another slow climb.

#### Fast Retransmit and Fast Recovery

Waiting for a **retransmission timeout**, the **RTO**, is expensive, because the timeout is deliberately conservative and the connection sits idle while it elapses.

**Fast Retransmit** avoids most of that waiting. When a receiver gets an out-of-order segment it re-acknowledges the last in-order byte, producing a **duplicate ACK**. On receiving **three duplicate ACKs**, the sender concludes the segment was lost and retransmits it immediately, without waiting for the timer. Three is a threshold chosen so that mere reordering does not trigger a retransmission.

**Fast Recovery** governs what cwnd does next. Rather than collapsing to the initial window and re-entering slow start, the sender sets ssthresh to half of cwnd, sets cwnd to ssthresh plus an allowance for the segments already buffered at the receiver, and continues in **congestion avoidance**.

The reasoning is that duplicate ACKs are evidence the path still works: packets are arriving, just not in order. That is mild congestion, so a mild response is right.

A **timeout** is treated as far more serious, because nothing is arriving at all. There, cwnd drops to **1 MSS** and the connection restarts slow start.

This distinction is the difference between **TCP Tahoe**, which returned to slow start on any loss, and **TCP Reno**, which added fast recovery. Modern Linux defaults to **CUBIC**, which replaces the linear increase with a cubic function to use high-bandwidth links better, and **BBR** goes further by modelling bandwidth and round-trip time directly instead of treating loss as the congestion signal.

---

### In code

```text
The two brakes, and who sets them:

                  FLOW CONTROL            CONGESTION CONTROL
  protects        the receiver            the network
  scope           end to end              all senders collectively
  variable        rwnd                    cwnd
  who decides     the receiver, in ACKs   the sender, by inference
  signal          explicit window value   packet loss, delay, ECN
  failure mode    dropped data at the     congestion collapse
                  receiver's buffer

  bytes in flight <= min(rwnd, cwnd)
```

```text
Slow start, then AIMD, and what loss does:

  cwnd
   |                              /\            /\
   |                             /  \          /  \
   |            ssthresh ---- - /- - \- - - - /- - \- -
   |                           /      \      /
   |                 (linear) /        \    /
   |                         /          \  /   additive increase,
   |      (exponential)     /            \/    multiplicative decrease
   |                    _,-'
   |                _,-'
   |  1 MSS ____,-'
   +-------------------------------------------------> time
      slow start    congestion avoidance (the sawtooth)

  3 duplicate ACKs  -> fast retransmit, cwnd = ssthresh = cwnd/2
                       stay in congestion avoidance
  timeout (RTO)     -> cwnd = 1 MSS, back to slow start
```

```text
Fast retransmit, from the receiver's point of view:

  sent:      1   2   3   4   5   6
  arrived:   1   2   X   4   5   6
                     ^ 3 is lost

  ACKs back: ack=3  ack=3  ack=3  ack=3
                    ^^^^^^^^^^^^^^^^^^ three duplicate ACKs

  sender: retransmit 3 at once, do not wait for the RTO
          halve cwnd rather than resetting it, because
          4, 5 and 6 arriving proves the path still works
```

---

### What they ask next

**"Which window limits the sender?"**
Whichever is smaller, since the sender may have at most `min(rwnd, cwnd)` bytes in flight. Determining which one is binding is how you tell a slow receiver from a congested network.

**"Why is the window field only 16 bits?"**
It dates from an era when 64 KB was a generous buffer. On a high bandwidth-delay path 64 KB in flight is far too little, so the **window scaling** option negotiated in the SYN multiplies the advertised value by a power of two.

**"Why three duplicate ACKs and not one?"**
Because IP may reorder packets, so one or two duplicates are weak evidence of loss. Three makes reordering an unlikely explanation, while still being far quicker than the timeout.

**"Why is a timeout treated more harshly than duplicate ACKs?"**
Duplicate ACKs prove packets are still arriving, so the path works and congestion is mild. A timeout means nothing is getting through, which suggests something much worse, so the sender restarts from the beginning.

**"What is the point of multiplicative decrease being so aggressive?"**
Asymmetry of risk. Probing too slowly for bandwidth costs some throughput; reacting too slowly to congestion risks collapse for everybody. AIMD also converges on a fair allocation between flows, which additive decrease would not.

**"What is bufferbloat?"**
Over-large router buffers absorb congestion instead of signalling it by dropping, so loss-based congestion control never learns to slow down and latency grows enormously while throughput looks fine. It is the main argument for delay-based approaches such as BBR, and for **ECN**, where routers mark packets instead of dropping them.

**The common wrong answer** is treating the two as the same mechanism, or saying flow control is "for the network". The clean way to separate them: flow control is a **number the receiver gives you**, congestion control is a **number you guess about the network**.

---

### Say this in the interview

*"They both slow the sender down, but they protect different things. Flow control protects the receiver from a sender that is faster than it, and it is end to end. The receiver advertises a receive window, rwnd, in the window field of every ACK, which is the free space left in its receive buffer, and the sender may have at most that many bytes in flight. It is a sliding window: as ACKs return, the window slides forward. If the application stops reading, the receiver advertises a zero window and the sender stops, sending periodic window probes until a window update arrives, which prevents a lost update deadlocking the connection.*

*Congestion control protects the network from all senders collectively, and the problem it prevents is congestion collapse, where full router queues drop packets, senders retransmit, and throughput falls towards zero. The sender maintains a congestion window, cwnd, but nobody tells it the right value, so it has to infer congestion, traditionally from packet loss. So rwnd is told to the sender and cwnd is guessed by the sender.*

*The sender obeys both, so the effective window is the minimum of rwnd and cwnd. Which one binds tells you where the problem is: rwnd means a slow receiver or too small a buffer, cwnd means the network. A small rwnd caps throughput regardless of the network, which is why window scaling exists, since the 16-bit field only reaches 65535 bytes and that is far too little for a high bandwidth-delay product.*

*Slow start begins with a small initial window, typically 10 MSS now, and doubles cwnd every round trip, so it is exponential despite the name. It ends when cwnd reaches the slow start threshold, ssthresh, and the sender moves to congestion avoidance, or when loss occurs.*

*AIMD, additive increase multiplicative decrease, is the steady state: additive increase of about one MSS per round trip while nothing is lost, and multiplicative decrease, halving cwnd on loss. The asymmetry is deliberate, because probing too slowly only costs throughput while reacting too slowly risks collapse, and AIMD converges on a fair share between flows. Plotted over time it gives the sawtooth.*

*Fast retransmit means that after three duplicate ACKs the sender retransmits immediately rather than waiting for the retransmission timeout, the RTO, and three is chosen so that reordering does not trigger it. Fast recovery is what cwnd does next: ssthresh becomes half of cwnd, cwnd is set to ssthresh plus an allowance, and the sender stays in congestion avoidance, because duplicate ACKs prove packets are still arriving. A timeout is treated far more harshly, with cwnd dropping to 1 MSS and slow start restarting. That difference is TCP Tahoe versus TCP Reno, and Linux now defaults to CUBIC, while BBR models bandwidth and round-trip time instead of using loss as the signal."*
