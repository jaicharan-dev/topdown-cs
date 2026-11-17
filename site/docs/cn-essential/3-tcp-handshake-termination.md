---
id: 3-tcp-handshake-termination
title: "TCP 3-Way Handshake & 4-Way Termination"
description: "Three messages to agree you can hear each other, four to say goodbye, and one long wait nobody expects"

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk through the TCP 3-way handshake and 4-way termination sequence. Why does connection establishment need 3 steps instead of 2, why does termination need 4 steps, what is the TIME_WAIT state with 2MSL, and how do SYN Cookies defend against SYN Floods?"

---

### Picture it

Two people on a bad phone line, before they start talking.

"Can you hear me?" "Yes, and can you hear me?" "Yes."

Three sentences, and you cannot do it in two. After two, the first person knows they were heard, but the second person has no idea whether their own reply got through. The third sentence exists entirely to tell the second person that they were heard too. Both sides have to end up certain, and certainty is not symmetric until the third message.

Now the goodbye, which is less obvious. "I have nothing more to say." "Understood." Notice what has **not** happened: the second person has not said they are finished. They might still have three things to tell you. So the conversation is now one-directional, and it stays that way until they say "I am done too", and you reply "understood". Four sentences, because each person stops talking on their own schedule.

And then the odd part. After hanging up, one of them sits by the phone for a while without dialling anybody. Two reasons. If their final "understood" never arrived, the other person will ask again, and somebody has to be there to answer. And if a word from the old conversation is still echoing down the line, they want it to fade out before they start a new call to the same person, so it does not get mistaken for part of the new conversation.

---

### The proper terms

#### The three-way handshake

The purpose of the handshake is synchronising sequence numbers in both directions. That is what the **SYN** flag stands for.

**Step 1, SYN.** The client sends a segment with the **SYN** flag set and its **Initial Sequence Number**, the **ISN**, chosen randomly. The client enters **SYN_SENT**.

**Step 2, SYN-ACK.** The server replies with **SYN** and **ACK** both set, carrying its own ISN and acknowledging the client's with `ack = client ISN + 1`. The server enters **SYN_RECEIVED**.

**Step 3, ACK.** The client acknowledges the server's ISN with `ack = server ISN + 1`. Both sides enter **ESTABLISHED**.

The ISN is randomised rather than starting at zero, which makes **sequence number prediction** attacks impractical.

#### Why three steps and not two

Because **two sequence numbers must be exchanged and both must be acknowledged**.

Count the obligations. The client's ISN must reach the server and be confirmed. The server's ISN must reach the client and be confirmed. That is four events, but the server can carry its own SYN and its acknowledgement of the client's SYN in a single segment, which is exactly why the number is three rather than four.

Stop after two and the client knows the server received its ISN, but **the server does not know the client received the server's ISN**. It would have to start sending data on an unconfirmed sequence number.

The second reason is duplicate and delayed SYNs. Networks hold onto old packets. A SYN from a long-dead connection can arrive late, and with a two-way exchange the server would open a connection the client is not party to, and then wait forever holding resources. The third message is the client's chance to say "that was not me", by sending a **RST** instead of an ACK.

#### The four-way termination

TCP is **full-duplex**, which is the key to this whole section. A connection is really two independent byte streams, and each is closed separately.

**Step 1, FIN.** The side that closes first, the **active closer**, sends a segment with the **FIN** flag and enters **FIN_WAIT_1**. It is saying "I will send no more data", not "this connection is over".

**Step 2, ACK.** The peer acknowledges the FIN and enters **CLOSE_WAIT**. The active closer enters **FIN_WAIT_2**. At this point the connection is **half-closed**: data can still flow from the peer to the active closer, and often does.

**Step 3, FIN.** When the peer's application finishes and calls `close()`, it sends its own FIN and enters **LAST_ACK**.

**Step 4, ACK.** The active closer acknowledges it and enters **TIME_WAIT**. The peer, on receiving this, goes straight to **CLOSED**.

So it is four because the **ACK in step 2 and the FIN in step 3 are separated by however long the peer's application keeps talking**. If the peer has nothing left to send, the two can be combined and you will see a three-segment close on the wire, which is common for short HTTP exchanges.

#### TIME_WAIT and 2MSL

**MSL**, the **Maximum Segment Lifetime**, is the longest a segment is assumed to survive in the network. The specification suggests 2 minutes; implementations use less, and Linux fixes TIME_WAIT at **60 seconds**.

The active closer waits **2 x MSL** in **TIME_WAIT** before releasing the socket, for two reasons.

**To re-send the final ACK if it was lost.** If step 4 never arrives, the peer retransmits its FIN. Somebody has to be present to acknowledge it, otherwise the peer is stuck in LAST_ACK and eventually sends a **RST**, making a clean close look like an error.

**To let old segments from this connection expire.** The wait is **2 x MSL** because that is one MSL for a straggling segment to arrive plus one MSL for the reply it might provoke. Without it, a delayed segment from the old connection could be delivered to a new connection reusing the same four-tuple and be accepted as valid data.

The practical cost is that TIME_WAIT sockets accumulate on whichever side closes first. A busy server or proxy that closes its own connections can hold tens of thousands of them and run out of **ephemeral ports**, giving the classic symptom of connection failures while the machine looks idle. The real fixes are connection reuse with HTTP keep-alive, and arranging for the **client** to close rather than the server. `SO_REUSEADDR` lets a listener bind despite them, and `tcp_tw_reuse` lets outgoing connections reuse them when timestamps make it safe.

#### SYN floods and SYN cookies

A **SYN flood** is a denial-of-service attack that exploits step 2 of the handshake.

The attacker sends a stream of SYNs with **spoofed source addresses** and never completes the handshake. For each, the server allocates an entry in its **SYN backlog**, a **half-open connection** holding the sequence numbers while it waits for an ACK that will never come. The backlog fills, and legitimate SYNs are dropped. The attack is cheap because the attacker keeps no state at all, while the server keeps state for every packet.

**SYN cookies** remove the server's state entirely, which removes the thing being exhausted.

Instead of storing the half-open connection, the server **encodes it into the ISN it sends back**. The cookie packed into that 32-bit field is a **cryptographic hash** of the source and destination addresses and ports plus a **secret key**, combined with a **slowly incrementing timestamp** and a small index identifying the client's **MSS**.

The server then forgets the connection completely. If a legitimate client replies, its ACK carries an acknowledgement number of `cookie + 1`, so the server subtracts one, recomputes the hash from the packet's own addresses and ports, and if it matches, rebuilds the connection from the cookie. A spoofed ACK cannot produce a valid cookie without the secret.

The cost is real, which is why this is not simply on all the time. Only a few MSS values can be encoded, and TCP options negotiated in the SYN, such as window scaling and selective acknowledgement, are lost unless timestamps carry them. So Linux's `net.ipv4.tcp_syncookies=1` means "use cookies **only when the backlog overflows**", which is the sensible setting: normal connections keep full option negotiation, and the mechanism engages exactly when it is needed.

---

### In code

```text
The three-way handshake:

  CLIENT                                        SERVER
  (CLOSED)                                      (LISTEN)

    --- SYN, seq=x ----------------------------->
                                                (SYN_RECEIVED)
  (SYN_SENT)
    <-- SYN, ACK, seq=y, ack=x+1 ---------------
  (ESTABLISHED)
    --- ACK, ack=y+1 --------------------------->
                                                (ESTABLISHED)

  Two ISNs to exchange, both to be acknowledged.
  The server combines its SYN with its ACK, so three, not four.
```

```text
The four-way termination, with the half-close in the middle:

  ACTIVE CLOSER                                 PEER
  (ESTABLISHED)                                 (ESTABLISHED)

    --- FIN ------------------------------------>
  (FIN_WAIT_1)                                  (CLOSE_WAIT)
    <-- ACK -------------------------------------
  (FIN_WAIT_2)

    <== the peer may still send data here ======
        the connection is half-closed, not closed

    <-- FIN -------------------------------------
                                                (LAST_ACK)
    --- ACK ------------------------------------>
  (TIME_WAIT)                                   (CLOSED)
     |
     +-- wait 2 x MSL, then CLOSED

  If the peer has nothing left to send, steps 2 and 3
  are combined and you see a three-segment close.
```

```text
Why TIME_WAIT exists, in two failures it prevents:

  1. the final ACK is lost
     peer retransmits FIN -> TIME_WAIT socket re-ACKs it
     without TIME_WAIT -> RST, and a clean close looks like an error

  2. a delayed segment from the old connection arrives
     same four-tuple is reused by a new connection
     without TIME_WAIT -> old data accepted as new data
```

```text
SYN flood vs SYN cookies:

  WITHOUT COOKIES
    attacker: SYN (spoofed src) x 100000, never ACKs
    server:   allocates a backlog entry per SYN
              backlog full -> real clients rejected
              attacker holds no state, server holds all of it

  WITH COOKIES
    server:   ISN = hash(src ip, src port, dst ip, dst port, secret)
                    + coarse timestamp + MSS index
              sends SYN-ACK, then forgets everything
    client:   ACK with ack = cookie + 1
    server:   recompute the hash from this packet, compare,
              and rebuild the connection if it matches

    cost: only a few MSS values fit, and SYN options such as
          window scale and SACK are lost, so Linux turns cookies
          on only when the backlog actually overflows
```

---

### What they ask next

**"Why is the ISN random?"**
To prevent sequence number prediction. If an attacker can guess the ISN, they can inject segments into a connection or complete a handshake with a spoofed source address without ever seeing the replies.

**"What is a half-open versus a half-closed connection?"**
**Half-open** is the handshake state where one side believes the connection exists and the other does not, which is what a SYN flood manufactures. **Half-closed** is a legitimate established state where one direction has been shut down with a FIN while the other still carries data.

**"Who ends up in TIME_WAIT?"**
Whoever closes first. This is why it is usually better for clients to close than servers: a server that initiates close accumulates the sockets and risks ephemeral port exhaustion, which is the real-world motivation for HTTP keep-alive.

**"What does a RST mean?"**
An abrupt abort rather than an orderly shutdown. It is sent when a segment arrives for a connection that does not exist, when connecting to a closed port, or when an application closes with unread data pending. Unlike FIN it is not acknowledged and does not wait, so data in flight is lost.

**"Why 2 x MSL rather than one?"**
One MSL covers a straggling segment still travelling towards you, and the second covers the reply that segment might provoke. Both have to have expired before the four-tuple is safe to reuse.

**"Why not use SYN cookies all the time?"**
Because the 32-bit sequence number field cannot hold the full handshake state. Only a few MSS values can be encoded, and options negotiated in the SYN are lost, so performance features are sacrificed. Using them only on backlog overflow keeps normal connections intact.

**The common wrong answer** is that termination needs four steps "because it is the reverse of three". It needs four because TCP is full-duplex and each direction closes independently, so the peer's FIN comes whenever **its** application is finished, which may be long after it acknowledged yours.

---

### Say this in the interview

*"The handshake exists to synchronise sequence numbers in both directions. The client sends a SYN with a random initial sequence number, randomised to defeat sequence number prediction, and enters SYN_SENT. The server replies with SYN and ACK together, carrying its own ISN and acknowledging the client's with ack equal to the client ISN plus one, and enters SYN_RECEIVED. The client acknowledges the server's ISN and both sides are ESTABLISHED.*

*It needs three steps because two ISNs must be exchanged and both must be acknowledged. The server combines its own SYN with its ACK, which is why it is three rather than four. If you stopped at two, the server would not know whether the client received the server's ISN. The third message also lets a client reject a duplicate or delayed SYN with a RST instead of leaving the server holding a half-open connection.*

*Termination takes four because TCP is full-duplex and each direction closes independently. The active closer sends FIN and enters FIN_WAIT_1, meaning only that it will send no more data. The peer ACKs it and enters CLOSE_WAIT while the closer enters FIN_WAIT_2, and the connection is now half-closed, so the peer can still send data. When the peer's application closes it sends its own FIN and enters LAST_ACK, the closer ACKs and enters TIME_WAIT, and the peer goes to CLOSED. If the peer has nothing left to send, its ACK and FIN combine into a three-segment close.*

*TIME_WAIT is the active closer waiting 2 x MSL, twice the Maximum Segment Lifetime, fixed at 60 seconds on Linux, for two reasons: so it can retransmit the final ACK if the peer retransmits its FIN, and so delayed segments from the old connection expire before the same four-tuple is reused. It is 2 x MSL because one covers a straggling segment and one covers the reply it provokes. The practical cost is that a server which closes its own connections accumulates TIME_WAIT sockets and can exhaust ephemeral ports, so you use keep-alive and let clients close.*

*A SYN flood sends SYNs with spoofed source addresses and never completes the handshake, so the server's SYN backlog fills with half-open connections and real clients are refused. SYN cookies remove the state being exhausted: the server encodes the connection into the ISN it returns, as a cryptographic hash of the four-tuple and a secret key plus a slowly incrementing timestamp and an MSS index, then forgets the connection. A genuine ACK carries the cookie plus one, so the server recomputes the hash and rebuilds the connection. Only a few MSS values fit and SYN options like window scaling and SACK are lost, so Linux enables cookies only when the backlog overflows."*
