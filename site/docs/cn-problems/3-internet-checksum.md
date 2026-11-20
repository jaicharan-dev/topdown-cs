---
id: 3-internet-checksum
title: "The Internet Checksum: One's Complement and End-Around Carry"
description: "One's complement addition is arithmetic modulo 255, and that single fact explains every strength and every blind spot the checksum has"

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A sender transmits two 8-bit data words using the Internet Checksum method: `10101001` and `11001010`. Compute the checksum with end-around carry, demonstrate receiver-side verification, explain why compensating bit flips evade detection, and contrast with CRC-32."

---

### Picture it

A shopkeeper who checks the day's till by adding up the receipts and comparing the total.

It is a good check and it is cheap, and the reason it works is that most mistakes change the total. A receipt mistyped, a receipt lost, a digit smudged: the sum comes out different and you know something is wrong.

**And the reason it fails is the same reason.** The total is all you kept. If one receipt is five pounds too high and another is five pounds too low, the total is right and the check passes, and it passes not through bad luck but because **you asked a question that cannot distinguish those books from correct books.** Nothing was overlooked. The sum simply does not carry the information.

Two more things the sum cannot see, which matter more than they first appear.

**It cannot see order.** Shuffle the receipts and the total is identical, because addition is commutative. For a shopkeeper that is fine. For a protocol carrying a header whose fields mean different things depending on position, it means **swapping two fields is completely invisible**.

**It cannot see a zero.** Insert a receipt for nothing, or lose one, and the total is unchanged.

So the honest way to hold this is that the Internet checksum is not a weak error detector that could be strengthened by more careful implementation. **It is a sum, and it has exactly the blindness a sum has.** Every miss listed on this page follows from that one sentence, and the arithmetic below makes it precise: one's complement addition over 8-bit words is arithmetic **modulo 255**, so an error goes undetected precisely when the damage it does sums to zero modulo 255. That is the whole theory, and once you have it you can derive the blind spots instead of memorising them.

What you buy for that weakness is worth naming too, because the trade was deliberate. The check costs one add per word with no tables and no multiplication, it can be computed in a few instructions on 1970s hardware, and it has two properties that a stronger function would have cost: **a router can adjust it without recomputing it** when it decrements a hop count, and **the result does not depend on which end of the word you read first.** It was chosen for a machine budget, not for its detection strength, and the layer below it was expected to carry the real check.

---

### The proper terms

#### One's complement arithmetic

The **one's complement** of a binary number is its bitwise inversion. In one's complement representation, `+0` is all zeros and `-0` is all ones, so there are two representations of zero, which turns out to matter in the protocol.

**One's complement addition** adds the words as ordinary binary and then takes any carry out of the top bit and adds it back in at the bottom. That step is the **end-around carry**, and it is repeated if it produces another carry.

The crucial identity, and the thing to say out loud, is what that operation actually computes:

$$\text{one's complement addition on } n\text{-bit words} \;\equiv\; \text{arithmetic modulo } 2^n - 1$$

For 8-bit words that is **modulo 255**, not 256. The end-around carry is exactly the reduction step: a carry out means the true sum exceeded 255, and adding 1 back at the bottom subtracts 256 and adds 1, which is subtracting 255.

Having that identity in hand means every detection property on this page is derivable rather than memorable. **An error goes undetected if and only if the total change it makes to the sum is congruent to 0 modulo 255.**

#### The procedure

The **checksum** is the one's complement of the one's complement sum of the data words. The final inversion is not decoration: it lets the receiver do one uniform operation.

**Verification** is to add every word *including* the checksum, using the same one's complement addition. The result should be all ones, or equivalently its complement should be all zeros. **The receiver never needs to recompute or compare**, and that uniformity is the point of complementing at the end.

#### The two properties that justified the choice

**Endian independence.** The one's complement sum of a sequence of 16-bit words has the useful property that computing it on byte-swapped data yields the byte-swapped result. So an implementation does not need to know the machine's byte order, which in the 1970s was a real portability problem.

**Incremental update.** When a router decrements the IPv4 time-to-live field, it must fix the header checksum. Because the checksum is a sum, it can be adjusted by the difference rather than recomputed over the whole header, which is a documented optimisation in **RFC 1624**. A function that mixed bits positionally would forbid this.

#### Where it is used, and what covers it

The Internet checksum appears in the **IPv4 header**, and in **TCP**, **UDP** and **ICMP**. The transport checksums additionally cover a **pseudo-header** containing the source and destination addresses, protocol and length, which is why a NAT device rewriting addresses must also fix the transport checksum.

**IPv6 removed the header checksum entirely**, on the reasoning that the link layer already carries a strong frame check and the transport layer carries its own. As a direct consequence, the UDP checksum, optional in IPv4, became **mandatory in IPv6**.

#### What CRC does differently

A cyclic redundancy check, or CRC, treats the message as a polynomial over GF(2) and takes the remainder on division by a fixed **generator polynomial**. Because division is position-sensitive, a CRC is not blind to ordering, and its guarantees are structural: **CRC-32 detects every burst error up to 32 bits** and every single-bit error. Odd-weight detection is a separate property that depends on the generator having `(x + 1)` as a factor, which CRC-16-CCITT and CRC-32C do and the IEEE 802.3 CRC-32 does not, so the claim that CRC-32 catches all odd-weight errors is a common and checkable mistake.

Both functions are **linear** over their respective arithmetic, so both have a set of error patterns they cannot see. **The difference is the shape of that set.** The checksum misses any pattern summing to zero modulo 255, which includes the trivially plausible case of one word going up by one and another going down by one. CRC-32 misses only patterns that are exact multiples of a degree-32 polynomial, which no ordinary hardware fault stumbles into.

Neither is cryptographic. Both are public functions with no key, so an attacker who alters the payload simply recomputes the check. Integrity against tampering requires a MAC, and conflating error detection with authentication is a common and consequential mistake.

---

### Work it out

#### Given

| Word | Binary | Decimal |
| :--- | :--- | :---: |
| `D1` | `10101001` | 169 |
| `D2` | `11001010` | 202 |

8-bit words, so one's complement addition here is arithmetic modulo 255.

#### Part 1: computing the checksum

**Step 1: add the words as ordinary binary.**

```
    1 0 1 0 1 0 0 1      169
  + 1 1 0 0 1 0 1 0      202
  -----------------
  1 0 1 1 1 0 0 1 1      371
  ^
  carry out of bit 7
```

The true sum is 371, which does not fit in eight bits. The low eight bits are `01110011` (115) and there is a carry of 1.

**Step 2: add the carry back in at the bottom.**

```
    0 1 1 1 0 0 1 1      115
  +                1      the end-around carry
  -----------------
    0 1 1 1 0 1 0 0      116
```

The one's complement sum is `01110100` = **116**.

Check it against the identity: `371 mod 255 = 116`. The end-around carry did exactly one reduction modulo 255, which is what it is for. If adding the carry had produced another carry, you would wrap again, which is just a second reduction.

**Step 3: complement.**

```
  sum        0 1 1 1 0 1 0 0      116
  invert     1 0 0 0 1 0 1 1      139
```

**The checksum is `10001011`**, decimal 139.

Transmitted: `10101001`, `11001010`, `10001011`.

#### Part 2: verification at the receiver

The receiver adds **all three** words, including the checksum, with the same arithmetic.

```
  169 + 202 + 139 = 510

    1 1 1 1 1 1 1 1 0      510
    ^
    carry out

    1 1 1 1 1 1 1 0        254
  +                1        end-around carry
  -----------------
    1 1 1 1 1 1 1 1        255
```

The sum is all ones, and its complement is `00000000`. **Zero means accept.**

Why it comes out all ones is worth one sentence rather than being left as magic. The checksum was defined as `255 - sum`, so adding it to the sum gives 255, which in one's complement is `-0`, all ones. **The final inversion at the sender is what makes the receiver's test a single uniform operation** with nothing to compare and no branch on the data.

This is also where the two zeros of one's complement earn their keep. A computed checksum of zero would be ambiguous in UDP, where the all-zeros field means "no checksum present". So when the computation yields zero, **UDP transmits `0xFFFF` instead**, which is the other representation of zero and therefore arithmetically equivalent.

#### Part 3: the compensating error

Flip one bit in each word, in the same position, in opposite directions.

| | Original | Corrupted | Value change |
| :--- | :--- | :--- | :---: |
| `D1` | `1010100`**`1`** | `1010100`**`0`** | **-1** |
| `D2` | `1100101`**`0`** | `1100101`**`1`** | **+1** |
| Checksum | `10001011` | `10001011` | unchanged |

The two changes are `-1` and `+1`, so the sum is unchanged at 371, the one's complement sum is still 116, and verification still yields all ones. **The receiver accepts corrupt data.**

And the reason is not that two errors are harder than one. It is the modulo-255 identity: this error pattern contributes a net change of zero, so by construction it is invisible. **Any error whose total change is a multiple of 255 is undetectable**, which includes the full family:

| Error pattern | Detected? | Why |
| :--- | :---: | :--- |
| Any single bit flip | **always** | changes the sum by `2^k`, and `2^k` is never 0 mod 255 for k in 0 to 7 |
| Two flips, same position, opposite directions | **never** | net change `+2^k - 2^k = 0` |
| Two flips, different positions | always | `2^i - 2^j` is not 0 mod 255 for distinct i, j under 8 |
| Reordering the words | **never** | addition is commutative |
| Inserting or deleting a zero word | **never** | adds nothing to the sum |
| A whole word flipped from `00000000` to `11111111` | **never** | that is `+255`, which is 0 mod 255 |

That last row is the one people have not usually thought about, and it is a direct consequence of the modulus being 255 rather than 256. **A word going from all zeros to all ones is arithmetically invisible**, which in a header full of zero-padded fields is not a far-fetched failure.

Counting over the two 8-bit words, there are 120 possible two-bit error patterns and **four of them are undetectable**, those being the positions where `D1` and `D2` happen to hold opposite bits. That is 3.3% of two-bit errors on this particular data, and the figure depends on the data, which is itself a slightly uncomfortable property for an error detector.

#### Part 4: against CRC-32

| Property | Internet checksum | CRC-32 |
| :--- | :--- | :--- |
| Operation | addition mod `2^n - 1` | polynomial division over GF(2) |
| Sensitive to word order | **no** | yes |
| All single-bit errors | yes | yes |
| All odd-weight errors | no | only if `(x+1)` divides the generator, which for IEEE 802.3 CRC-32 it **does not** |
| Bursts up to 32 bits | no | **all of them** |
| Compensating `+1` and `-1` | **missed** | caught |
| Undetectable set | any pattern summing to 0 mod `2^n - 1` | any pattern that is a multiple of the generator |
| Cost | one add per word | a table lookup per byte, or a hardware shift register |
| Incremental update | **yes** | no |
| Cryptographically secure | no | no |

The honest framing of the comparison is that **both are linear codes and both therefore have a blind set; the question is whether realistic faults land in it.** The checksum's blind set contains patterns that ordinary faults produce routinely: a bit flip up in one place and down in another, a reordering, a zeroed field becoming all ones. CRC-32's blind set requires the error to be an exact multiple of a specific degree-32 polynomial, and a cosmic ray does not do that.

Two further points worth having ready.

**This has been measured in the wild.** Stone and Partridge's study of real traffic found the TCP checksum failing to catch errors at rates between roughly one in sixteen million and one in ten billion packets, far worse than a random-error model predicts, because real-world corruption is **structured**: buggy middleboxes, faulty memory and software defects produce exactly the correlated patterns a sum is worst at. Their conclusion is the practical one: application-level integrity checks are warranted for data you care about.

**The layering explains the design rather than excusing it.** The checksum was never meant to be the only line of defence. Ethernet carries CRC-32 on every frame, so the link layer catches the physical-layer noise, and the Internet checksum exists to catch what happens **between** links, inside routers and host memory, where no frame check covers the data. That is also the argument **IPv6** accepted when it dropped the header checksum altogether and made the UDP checksum mandatory in compensation.

#### Verify it

```python
"""
The Internet checksum: one's complement addition as arithmetic mod 2^n - 1,
verification, and an exhaustive map of what it cannot detect.
"""

from itertools import combinations

BITS = 8
MASK = (1 << BITS) - 1          # 0xFF
MODULUS = MASK                  # 255: one's complement addition is mod 2^n - 1

D1, D2 = 0b10101001, 0b11001010


def ones_complement_sum(words):
    """Add with end-around carry, wrapping repeatedly if needed."""
    total = 0
    for w in words:
        total += w
        while total > MASK:                 # the end-around carry
            total = (total & MASK) + (total >> BITS)
    return total


def checksum(words):
    return (~ones_complement_sum(words)) & MASK


def verify(words_with_checksum):
    """Add everything including the checksum; all ones means accept."""
    s = ones_complement_sum(words_with_checksum)
    return ((~s) & MASK) == 0, s


if __name__ == "__main__":
    print(f"-- the words")
    print(f"   D1 = {D1:08b} = {D1}")
    print(f"   D2 = {D2:08b} = {D2}")

    print(f"\n-- Part 1: compute")
    raw = D1 + D2
    print(f"   raw binary sum      {raw:09b} = {raw}  "
          f"({raw.bit_length()} bits, carry out)")
    print(f"   low {BITS} bits         {raw & MASK:08b} = {raw & MASK}, "
          f"carry {raw >> BITS}")
    s = ones_complement_sum([D1, D2])
    print(f"   after end-around    {s:08b} = {s}")
    print(f"   identity check: {raw} mod {MODULUS} = {raw % MODULUS}, "
          f"matches: {raw % MODULUS == s}")
    cks = checksum([D1, D2])
    print(f"   checksum = NOT {s:08b} = {cks:08b} = {cks}")

    print(f"\n-- Part 2: verify")
    ok, total = verify([D1, D2, cks])
    print(f"   {D1} + {D2} + {cks} = {D1+D2+cks}")
    print(f"   one's complement sum = {total:08b} = {total} "
          f"(all ones = -0)")
    print(f"   complement = {((~total) & MASK):08b} -> "
          f"{'ACCEPT' if ok else 'REJECT'}")
    print(f"   why: checksum was defined as {MODULUS} - sum, so "
          f"sum + checksum = {MODULUS} = all ones")

    print(f"\n-- the two zeros of one's complement")
    print(f"   +0 = {0:08b}, -0 = {MASK:08b}, and "
          f"{0} == {MASK} mod {MODULUS}: {0 % MODULUS == MASK % MODULUS}")
    print(f"   UDP sends 0xFFFF when the computation yields zero, so that")
    print(f"   0x0000 can mean 'no checksum present'")

    print(f"\n-- Part 3: the compensating error")
    a, b = D1 ^ 1, D2 ^ 1               # bit 0 is 1 in D1 and 0 in D2
    print(f"   D1 {D1:08b} -> {a:08b}  ({a - D1:+d})")
    print(f"   D2 {D2:08b} -> {b:08b}  ({b - D2:+d})")
    ok2, t2 = verify([a, b, cks])
    print(f"   sum unchanged: {a + b == D1 + D2};  verification "
          f"{'ACCEPTS corrupt data' if ok2 else 'rejects'}")

    print(f"\n-- every single-bit error is caught")
    missed = 0
    for word_idx in (0, 1):
        for k in range(BITS):
            words = [D1, D2]
            words[word_idx] ^= (1 << k)
            good, _ = verify(words + [cks])
            missed += good
    print(f"   {2*BITS} single-bit patterns, {missed} undetected")
    print(f"   because 2^k mod {MODULUS} for k in 0..{BITS-1} = "
          f"{[2**k % MODULUS for k in range(BITS)]}, none zero")

    print(f"\n-- two-bit errors, exhaustively")
    positions = [(w, k) for w in (0, 1) for k in range(BITS)]
    bad_pairs = []
    for p, q in combinations(positions, 2):
        words = [D1, D2]
        words[p[0]] ^= (1 << p[1])
        words[q[0]] ^= (1 << q[1])
        good, _ = verify(words + [cks])
        if good:
            bad_pairs.append((p, q))
    total_pairs = len(list(combinations(positions, 2)))
    print(f"   {total_pairs} patterns, {len(bad_pairs)} undetected "
          f"({100*len(bad_pairs)/total_pairs:.1f}%)")
    for p, q in bad_pairs:
        print(f"     word{p[0]+1} bit{p[1]} and word{q[0]+1} bit{q[1]}: "
              f"same position, opposite directions")

    print(f"\n-- structural blind spots that have nothing to do with bit flips")
    print(f"   reordering:        {verify([D2, D1, cks])[0]} "
          f"(addition is commutative)")
    print(f"   inserting a zero:  {verify([D1, 0, D2, cks])[0]} "
          f"(adds nothing)")
    z = ones_complement_sum([0b00000000])
    o = ones_complement_sum([0b11111111])
    print(f"   00000000 -> 11111111 is {MASK:+d}, which is "
          f"{MASK % MODULUS} mod {MODULUS}: undetectable")

    print(f"\n-- contrast: CRC over the same bits")

    def crc_remainder(bits, gen):
        d, g, n = list(bits), list(gen), len(gen)
        for i in range(len(d) - n + 1):
            if d[i] == '1':
                for j in range(n):
                    d[i + j] = str(int(d[i + j]) ^ int(g[j]))
        return ''.join(d[-(n - 1):])

    GEN = "100000100110000010001110110110111"      # CRC-32 generator, 33 bits
    msg = f"{D1:08b}{D2:08b}"
    swapped = f"{D2:08b}{D1:08b}"
    r1 = crc_remainder(msg + "0" * 32, GEN)
    r2 = crc_remainder(swapped + "0" * 32, GEN)
    print(f"   message {msg} -> CRC {int(r1, 2):08x}")
    print(f"   swapped {swapped} -> CRC {int(r2, 2):08x}")
    print(f"   CRC changes when the words are reordered: {r1 != r2}")
    print(f"   checksum does not:                        "
          f"{ones_complement_sum([D1, D2]) == ones_complement_sum([D2, D1])}")

    comp = f"{a:08b}{b:08b}"
    r3 = crc_remainder(comp + "0" * 32, GEN)
    print(f"   the compensating error -> CRC {int(r3, 2):08x}, "
          f"changed: {r3 != r1}")
```

---

### What they ask next

**"Why one's complement addition rather than plain binary addition?"**
Because of two properties that the design wanted. **Endian independence**: the one's complement sum computed on byte-swapped data is the byte-swapped result, so an implementation need not know the machine's byte order. And **incremental update**: because it is a sum, a router decrementing the IPv4 time-to-live can adjust the checksum by the difference rather than recomputing it, which **RFC 1624** documents. Plain two's complement addition discards the top carry and loses both properties.

**"What does end-around carry actually compute?"**
Arithmetic **modulo `2^n - 1`**, which is modulo 255 for 8-bit words. A carry out means the true sum exceeded 255; adding 1 back at the bottom subtracts 256 and adds 1, so it subtracts 255. Checking it here, `371 mod 255 = 116`, which is exactly the result. **That identity is the whole theory of the checksum**, because an error is undetectable precisely when its net change is a multiple of 255.

**"Why complement at the end?"**
So the receiver's test is one uniform operation. The checksum is defined as `255 - sum`, so adding it back gives 255, which is all ones, and its complement is zero. **The receiver adds everything including the checksum and checks for zero**, with nothing to recompute, nothing to compare and no branch. Without the final inversion the receiver would have to compute the sum, compute the checksum separately and compare.

**"Why does UDP send `0xFFFF` instead of zero?"**
Because one's complement has **two zeros**, `0x0000` and `0xFFFF`, and UDP reserves the all-zeros field to mean "no checksum present". When the computation legitimately yields zero, sending `0xFFFF` conveys the same arithmetic value without colliding with that signal. It is the clearest practical consequence of the dual zero.

**"Why are compensating errors missed?"**
Because they contribute a net change of zero modulo 255, so they are invisible by construction rather than by bad luck. Flipping bit 0 of one word from 1 to 0 is `-1`, flipping bit 0 of another from 0 to 1 is `+1`, the sum is unchanged and verification passes. **The sum is all that was kept, so anything preserving the sum cannot be seen.** Exhaustively, 4 of the 120 two-bit patterns on this data are undetectable, and which four depends on the data.

**"What else is it blind to?"**
Three things worth naming beyond bit flips. **Reordering the words**, because addition is commutative, which for a header of positionally-meaningful fields means swapping two fields is invisible. **Inserting or deleting a zero word**, which adds nothing. And **a word going from all zeros to all ones**, because that is `+255`, which is `0 mod 255`; in a header full of zero-padded fields that is not far-fetched.

**"Does it catch all single-bit errors?"**
Yes, and here is the proof rather than the assertion: a single flip changes the sum by `2^k`, and `2^k mod 255` for `k` from 0 to 7 gives 1, 2, 4, 8, 16, 32, 64, 128, none of which is zero. So no single-bit error can be absorbed by the modulus.

**"How does CRC-32 differ, concretely?"**
It is polynomial division rather than addition, so it is **position-sensitive** and not blind to ordering. Its guarantees are structural: all single-bit errors and **all bursts up to 32 bits**. Odd-weight detection needs `(x+1)` to divide the generator, which holds for CRC-16-CCITT and CRC-32C but **not for the IEEE 802.3 CRC-32**, so quoting it as a CRC-32 property is a mistake worth avoiding. The fair comparison is that **both are linear, so both have a blind set, and the question is whether realistic faults land in it.** The checksum's blind set contains a `+1` paired with a `-1`; CRC-32's requires an error that is an exact multiple of a degree-32 polynomial, which no hardware fault produces by accident.

**"Is the checksum good enough in practice?"**
Measurably not, for data you care about. Stone and Partridge found the TCP checksum missing errors at rates between roughly one in sixteen million and one in ten billion packets, much worse than a random-error model predicts, **because real corruption is structured**: middlebox bugs, bad memory and software defects generate precisely the correlated patterns a sum handles worst. Their recommendation is application-level integrity checking, and it is why formats that matter carry their own digests.

**"Why did IPv6 drop the header checksum?"**
Because it was redundant between two stronger layers. The link layer already carries CRC-32 on every frame, and the transport layer carries its own checksum over a **pseudo-header** that includes the addresses. Removing it saves recomputation at every hop, which was a real cost given that the IPv4 header checksum had to be recalculated each time the hop count changed. The consequence is that the UDP checksum, optional in IPv4, is **mandatory in IPv6**.

**"Can it be used for integrity against tampering?"**
No. It is a public keyless function, so anyone modifying the data simply recomputes it, and the same is true of CRC-32. **Error detection and authentication are different problems**, and the second needs a **MAC** such as HMAC or an AEAD construction. Treating a checksum as a tamper check is a standard and serious mistake.

**The common wrong answer** is dropping the final end-around carry, giving a sum of 115 and a checksum of `10001100`, which then fails its own verification. Next is forgetting the final complement and transmitting 116, so that the receiver's sum comes out as something other than all ones. Third is explaining the compensating-error weakness as bad luck rather than as a direct consequence of the sum being the only thing retained. And last is claiming CRC-32 detects all errors, or that it detects all odd-weight errors. It has a blind set too, the odd-weight property requires an `(x+1)` factor that the IEEE 802.3 polynomial lacks, and the real distinction from the checksum is that a CRC's blind set is not one that ordinary faults wander into.

---

### Say this in the interview

*"The framing I would put first is that this is a sum, and everything that follows, good and bad, comes from that. And one identity makes it precise: one's complement addition on n-bit words is arithmetic modulo two to the n minus one, so for 8-bit words it is modulo 255, not 256. The end-around carry is the reduction step. Once I have that, I can derive the blind spots instead of listing them, because an error is undetectable exactly when its net change is a multiple of 255.*

*Computing it: 10101001 is 169, 11001010 is 202, and the raw sum is 371, which is nine bits, so the low eight are 01110011, which is 115, with a carry of one. The end-around carry adds that one back at the bottom, giving 01110100, which is 116. And I would check it against the identity: 371 mod 255 is 116, so the carry did exactly one reduction. Then complement: 116 inverted is 10001011, which is 139, and that is the checksum. If adding the carry had produced another carry I would wrap again, which is just a second reduction.*

*The receiver adds all three words including the checksum: 169 plus 202 plus 139 is 510, which wraps to 254 plus the carry, giving 255, all ones, whose complement is zero, so accept. Why it comes out all ones is worth one sentence rather than leaving it as magic: the checksum was defined as 255 minus the sum, so adding it back gives 255, which is minus zero in one's complement. The final inversion at the sender is what makes the receiver's test a single uniform operation, with nothing to recompute and no branch. That dual zero also has a practical consequence: a computed checksum of zero would be ambiguous in UDP, where an all-zeros field means no checksum present, so UDP sends 0xFFFF instead, which is arithmetically the same value.*

*For the compensating error, flip bit zero of the first word from one to zero, which is minus one, and bit zero of the second from zero to one, which is plus one. The sum is still 371, the one's complement sum is still 116, verification still gives all ones, and the receiver accepts corrupt data. The point I would make is that this is not two errors being harder than one; the net change is zero modulo 255, so it is invisible by construction. Exhaustively, four of the hundred and twenty two-bit patterns on this data are undetectable, and which four depends on the data, which is itself an uncomfortable property for an error detector.*

*I would then add the blind spots people do not usually list, because they are the same fact. Reordering the words is completely undetected, since addition is commutative, which for a header of positionally-meaningful fields means swapping two fields is invisible. Inserting or deleting a zero word is undetected. And a word going from all zeros to all ones is plus 255, which is zero modulo 255, so it is undetectable, and in a header full of zero-padded fields that is not far-fetched. Against that, every single-bit error is caught, and I can prove it rather than assert it: a flip changes the sum by two to the k, and two to the k mod 255 for k from zero to seven is one, two, four, eight, sixteen, thirty-two, sixty-four, one twenty-eight, none of which is zero.*

*Against a cyclic redundancy check, CRC-32 specifically, the honest comparison is that both are linear codes, so both have a set of errors they cannot see, and the real question is whether realistic faults land in it. CRC is polynomial division rather than addition, so it is position-sensitive and not blind to reordering, and its guarantees are structural: all single-bit errors and all bursts up to thirty-two bits. I would be careful about odd-weight errors, because that property needs x plus one to divide the generator, and the IEEE 802.3 CRC-32 polynomial does not have that factor, though CRC-16-CCITT and CRC-32C do. The claim that CRC-32 catches every odd-weight error is repeated a lot and is checkable in one line. The checksum's blind set contains a plus one paired with a minus one, which faulty memory produces routinely; CRC-32's blind set requires an error that is an exact multiple of its generator polynomial, degree thirty-two, which a cosmic ray does not manage.*

*Finally, two things about why the checksum is what it is. It was chosen for a machine budget: one add per word, no tables, and two properties a stronger function would have cost, namely endian independence, since the one's complement sum of byte-swapped data is the byte-swapped result, and incremental update, so a router decrementing the time-to-live can adjust the checksum by the difference rather than recomputing it, which RFC 1624 documents. And it was never the only defence: Ethernet carries CRC-32 on every frame, so the link layer catches physical noise, and the Internet checksum covers what happens between links, inside routers and host memory. It is the same function in the IPv4 header, in TCP, in UDP and in ICMP, with the transport ones also covering a pseudo-header carrying the addresses, protocol and length, which is why a NAT rewriting addresses has to fix the transport checksum too. That layering is the argument IPv6 accepted when it removed the header checksum entirely, with the consequence that the UDP checksum, optional in IPv4, is mandatory in IPv6. Though I would add that Stone and Partridge measured the TCP checksum missing errors at rates between about one in sixteen million and one in ten billion packets, far worse than a random model predicts, because real corruption is structured, so for data that matters an application-level digest is warranted. And neither function is cryptographic: both are public and keyless, so anyone altering the data recomputes them, and tamper resistance needs a MAC."*
