---
id: 4-crc-computation
title: "CRC: Cyclic Redundancy Check Computation"
description: "One theorem does all the work: the remainder of a corrupted codeword equals the remainder of the error alone, so every detection guarantee is a property of the generator"

sidebar_position: 4
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "A sender wants to transmit the data bits `1101011011` using CRC with the generator polynomial $x^4 + x + 1$. Determine the redundant bits, perform the binary division to compute the CRC remainder, and explain receiver validation."

---

### Picture it

You want to send a long number, and you want the receiver to be able to tell if it got mangled.

Here is a trick that works and that you can do in your head with small numbers. **Before sending, nudge the number up until it is exactly divisible by seven.** Send the nudged number. The receiver divides by seven, and if the remainder is not zero, something changed in transit.

Three things about that trick are worth noticing, because a CRC is exactly it with different arithmetic.

**The receiver stores nothing.** It does not need to know what you meant to send, or compare against a copy, or recompute a value and check it matches. It divides and looks for zero. The expected answer is the same for every message ever sent, which is why this is cheap to implement in a shift register with no memory.

**The amount you nudge by is bounded and known.** A remainder on division by seven is 0 to 6, so three bits of nudge always suffice. That is where the number of redundant bits comes from: it is the size of the remainder, not a parameter someone picked.

**And here is the part that makes it a good check rather than a cheap one.** Suppose the number arrives damaged. The received value is what you sent plus whatever the damage added. You sent something divisible by seven, so when the receiver divides, **the divisible part contributes nothing to the remainder and what comes out depends only on the damage.** The data has cancelled out entirely.

That is the whole theory, and it is worth sitting with because it is genuinely strong. It means you never have to reason about which messages are safe. **The question "will this error be caught" has nothing to do with what was being sent**, and depends only on the error pattern and the divisor. So you choose the divisor carefully, once, and you get guarantees that hold for every message forever.

A checksum cannot say that. Whether a compensating pair of flips is caught by a sum depends on what the data happened to be. Here it does not, and that difference, rather than the length of the result, is what separates the two.

The remaining difference is the arithmetic. **A CRC does this division without carries**, bit by bit, which is polynomial arithmetic over a two-element field. Dropping the carry is what makes the operation a plain cascade of XORs that hardware can do one bit per clock, and it is also what makes the error-detection algebra tractable enough to prove things about.

---

### The proper terms

#### The algebra, lightly

Treat a bit string as a polynomial whose coefficients are its bits: `1101` is `x^3 + x^2 + 1`. Arithmetic is over **GF(2)**, the field with two elements, where addition is XOR and **addition and subtraction are the same operation**. That single identity is why appending a remainder works, and it is worth holding onto.

The **generator polynomial** `G(x)` is the agreed divisor. Here `x^4 + x + 1`, which as a bit string is **`10011`**, five bits for a degree-4 polynomial. Its **degree** `r` is 4.

#### Why exactly `r` redundant bits

A remainder on division by a degree-`r` polynomial has degree at most `r - 1`, so it has at most `r` coefficients. **The number of CRC bits is the size of the remainder**, which is forced by the generator's degree and is not a free choice.

#### The construction, and why it makes the codeword divisible

Let `D(x)` be the data. Multiply by `x^r`, which in bit terms is appending `r` zeros, then take the remainder:

$$R(x) = \big(D(x) \cdot x^r\big) \bmod G(x)$$

The transmitted **codeword** is:

$$T(x) = D(x) \cdot x^r + R(x)$$

By definition of remainder, `D(x)·x^r - R(x)` is divisible by `G(x)`. In GF(2), subtraction is addition, **so `D(x)·x^r + R(x)` is divisible too**, which is exactly `T(x)`. Appending the remainder, rather than subtracting it, is correct only because of that identity.

So the codeword is a multiple of `G(x)` by construction, and the receiver's test is simply whether the received polynomial still is.

#### The one theorem that matters

The received word is `T'(x) = T(x) + E(x)`, where `E(x)` is the **error polynomial** with a 1 in every corrupted position. Since `G | T`:

$$T'(x) \bmod G(x) = E(x) \bmod G(x)$$

**The remainder the receiver computes depends only on the error, never on the data.** Therefore:

$$\text{an error is undetectable} \iff G(x) \text{ divides } E(x)$$

Every property below is derived from that line, which is why a CRC's guarantees can be stated as facts about the generator rather than as statistics about traffic.

#### What follows, for this generator

**All single-bit errors.** `E = x^i`. For `G` to divide `x^i`, `G` would have to be a power of `x`, which it is not: `10011` has a **non-zero constant term**. So no single-bit error is ever missed.

**All burst errors up to length `r`.** A burst of length `L` is `E = x^j · B(x)` with `deg B = L - 1`. `G` cannot divide `x^j`, and if `L <= r` then `deg B < r` so a degree-4 polynomial cannot divide it either. **Every burst up to 4 bits is caught**, which generalises to: a degree-`r` generator catches every burst up to `r` bits.

**All double-bit errors, here.** `E = x^i + x^j = x^i(1 + x^d)` with `d = j - i`. This is undetectable only if `G | (1 + x^d)`. Now `x^4 + x + 1` is a **primitive polynomial**, meaning the smallest `d` with `G | (1 + x^d)` is `2^r - 1 = 15`. The codeword here is 14 bits, so `d <= 13 < 15`, and **no double-bit error inside it can be missed.**

**Odd-weight errors, and an honest caveat.** A generator catches every odd-weight error if and only if `(x + 1)` divides it. Check: `G(1) = 1 + 1 + 1 = 1` in GF(2), so `(x+1)` is **not** a factor, and this generator does **not** catch all odd-weight errors. It is the price of primitivity, and the two properties pull in opposite directions.

#### The probabilities for longer bursts

For bursts beyond the guaranteed range, the fraction undetected is a counting result:

| Burst length | Fraction undetected |
| :--- | :--- |
| up to `r` | **0**, guaranteed |
| exactly `r + 1` | `1 / 2^(r-1)` |
| greater than `r + 1` | `1 / 2^r` |

For `r = 4` that is 12.5% and 6.25%; for CRC-32 it is `1/2^31` and `1/2^32`, which is about one in four billion.

#### The design trade in real generators

Primitivity buys the enormous double-bit range; an `(x + 1)` factor buys all odd-weight errors. **A generator cannot be primitive and have an `(x+1)` factor**, since a primitive polynomial is irreducible. So standard generators choose:

| Generator | `(x+1)` a factor? | All odd-weight errors? |
| :--- | :---: | :---: |
| **IEEE 802.3 CRC-32**, 0x04C11DB7 | **no** | **no** |
| CRC-32C Castagnoli, 0x1EDC6F41 | yes | yes |
| CRC-16-CCITT, 0x1021 | yes | yes |
| CRC-8-ATM, 0x07 | yes | yes |

That first row is worth knowing, because "CRC-32 detects all odd-weight errors" is widely repeated and is false for Ethernet's polynomial. It is a one-line check: count the terms, and if the count is odd then `G(1) = 1` and `(x+1)` is not a factor.

---

### Work it out

#### Given

| Quantity | Value |
| :--- | :--- |
| Data `D` | `1101011011`, 10 bits |
| Generator `G(x)` | `x^4 + x + 1` |
| Generator as bits | `10011`, 5 bits |
| Degree `r` | 4 |

**Redundant bits: 4**, because the remainder on division by a degree-4 polynomial has at most 4 coefficients. State it that way rather than as "r equals the degree", which is the same fact without the reason.

#### Part 1: the division

Append `r = 4` zeros to the data, giving the 14-bit dividend `11010110110000`, and divide by `10011` with XOR instead of subtraction.

```
                   1 1 0 0 0 0 1 0 1 0
         ___________________________________
  10011 ) 1 1 0 1 0 1 1 0 1 1 0 0 0 0
          1 0 0 1 1                           <- XOR, leading 1
          -------
          0 1 0 0 0 1                          bring down
            0 0 0 0 0                         <- leading 0, shift
            -------
            1 0 0 0 1 1
            1 0 0 1 1                         <- XOR
            -------
            0 0 0 1 0 1 1
                0 0 0 0 0                     <- leading 0
                -------
                0 0 1 0 1 1 0
                  0 0 0 0 0                   <- leading 0
                  -------
                  0 1 0 1 1 0 1
                    1 0 0 1 1                 <- XOR
                    -------
                    0 0 1 0 1 1 0
                      0 0 0 0 0               <- leading 0
                      -------
                      1 0 1 1 0 0
                      1 0 0 1 1               <- XOR
                      -------
                      0 0 1 0 1 0 0
                        0 0 0 0 0             <- leading 0
                        -------
                        1 0 1 0 0 0
                        1 0 0 1 1             <- XOR
                        -------
                        0 0 1 1 1 0
                                  ^^^^
                                  1 1 1 0     <- remainder, 4 bits
```

Working the XORs in sequence, aligning the generator under each leading 1:

| Step | Dividend state | Action |
| :---: | :--- | :--- |
| start | `11010110110000` | |
| 1 | `01000010110000` | XOR `10011` at position 0 |
| 2 | `00001100110000` | XOR at position 1 |
| 3 | `00001100110000` | position 2 and 3 lead with 0, shift |
| 4 | `00000001010000` | XOR at position 4 |
| 5 | `00000000000110` | continue to the end |

**The remainder is `1110`.**

#### Part 2: the codeword

Replace the four appended zeros with the remainder:

`T = D || R = 1101011011` + `1110` = **`11010110111110`**

| | Bits |
| :--- | :--- |
| Data | `1101011011` |
| CRC | `1110` |
| **Transmitted codeword** | **`11010110111110`** |

Do one check before moving on: **`T` must be exactly divisible by `G`.** Dividing `11010110111110` by `10011` gives remainder `0000`. If it does not, the division in part 1 was wrong, and this takes ten seconds.

#### Part 3: receiver validation

The receiver divides the whole received word by the same `G`.

`11010110111110 / 10011` gives remainder **`0000`**, so **accept**.

Note what the receiver did **not** do. It did not recompute the CRC over the data and compare it against the last four bits. It did not store an expected value. **It divided and looked for zero**, and the expected answer is zero for every message, which is why the hardware is a shift register with no state beyond the register itself.

Now corrupt one bit and watch it fail:

| Error | Received word | Remainder | Verdict |
| :--- | :--- | :---: | :--- |
| none | `11010110111110` | `0000` | accept |
| flip bit 1 | `01010110111110` | `1101` | **reject** |
| flip bit 7 | `11010100111110` | `1011` | **reject** |
| flip bit 14 | `11010110111111` | `0001` | **reject** |

#### Part 4: the theorem, demonstrated

The claim was that the remainder depends only on the error, not the data. Check it directly: take the error pattern for "flip bit 14" on its own, which is `00000000000001`, and divide it by `10011`. The remainder is `0001`, **the same value the corrupted codeword produced.** The data cancelled out entirely, because the codeword was a multiple of `G` and contributed nothing.

That is why the detection guarantees are properties of `G`:

| Error class | Count tested | Undetected | Reason |
| :--- | :---: | :---: | :--- |
| Single bit | 14 | **0** | `G` has a non-zero constant term, so `G` cannot divide `x^i` |
| Two bits | 91 | **0** | needs `G | (1 + x^d)`, smallest `d` is 15, and `d <= 13` here |
| Burst, length 2 | 13 | **0** | length `<= r` |
| Burst, length 3 | 24 | **0** | length `<= r` |
| Burst, length 4 | 44 | **0** | length `<= r` |
| Burst, length 5 | 80 | 10 | `1/2^(r-1)` = 12.5% |
| Burst, length 6 | 144 | 9 | `1/2^r` = 6.25% |
| Burst, length 8 | 448 | 28 | `1/2^r` = 6.25% |
| Odd weight, 1, 3 or 5 bits | 2,380 | 140 | `(x+1)` does **not** divide this `G` |

The measured fractions match the theory exactly: 10 of 80 is 12.5%, and 9 of 144 and 28 of 448 are both 6.25%.

**The shortest undetectable error is the generator itself.** `E = 10011` is trivially divisible by `G`, and it is a burst spanning 5 bits, which is `r + 1`. That is the boundary made concrete: 4 is guaranteed, 5 is where the first hole appears, and the hole is exactly `G`.

#### Part 5: how it is actually computed

The long division above is a **shift register with XOR taps** at the positions of the generator's terms. One bit in per clock, `r` flip-flops of state, no multiplication and no memory, which is why CRCs are in every Ethernet MAC and every disk controller.

In software, the bitwise loop is replaced by a **table-driven** version processing a byte at a time against a 256-entry table, or 32 bits at a time against several tables. On modern x86 the `CRC32` instruction computes **CRC-32C** in hardware, which is a large part of why Castagnoli's polynomial, rather than Ethernet's, is the one chosen by iSCSI, ext4 metadata, Btrfs and SCTP.

One caveat for implementers, which an interviewer may probe: a real CRC-32 is not just the bare division shown here. It **pre-loads the register with all ones**, processes bits **reflected**, and **inverts the final remainder**. The preset and inversion exist so that leading zeros and trailing zeros in the message are not invisible, which they would be in the textbook formulation, since prepending zeros to a polynomial does not change it.

#### Verify it

```python
"""
CRC by long division, the T = D*x^r + R construction, and an exhaustive
check that the remainder depends only on the error pattern.
"""
from itertools import combinations

DATA = "1101011011"
GEN = "10011"                      # x^4 + x + 1
R = len(GEN) - 1


def remainder(bits, gen=GEN):
    """XOR long division; returns the last len(gen)-1 bits."""
    d, g, n = list(bits), list(gen), len(gen)
    for i in range(len(d) - n + 1):
        if d[i] == '1':
            for j in range(n):
                d[i + j] = str(int(d[i + j]) ^ int(g[j]))
    return ''.join(d[-(n - 1):])


def xor_bits(a, b):
    return ''.join(str(int(x) ^ int(y)) for x, y in zip(a, b))


if __name__ == "__main__":
    print(f"generator {GEN} = x^4 + x + 1, degree r = {R}")
    print(f"  so the remainder has at most {R} coefficients: "
          f"{R} redundant bits")
    terms = GEN.count('1')
    print(f"  G has {terms} terms, so G(1) = {terms % 2}, and (x+1) is "
          f"{'a' if terms % 2 == 0 else 'NOT a'} factor")

    aug = DATA + "0" * R
    crc = remainder(aug)
    cw = DATA + crc
    print(f"\ndata      {DATA}")
    print(f"augmented {aug}   (append {R} zeros = multiply by x^{R})")
    print(f"remainder {crc}")
    print(f"codeword  {cw}   ({len(cw)} bits)")

    print(f"\nthe codeword must be exactly divisible by G:")
    print(f"  remainder({cw}) = {remainder(cw)}  "
          f"{'ok' if remainder(cw) == '0'*R else 'WRONG'}")
    print("  this works because in GF(2) adding R is the same as "
          "subtracting it")

    print(f"\nreceiver validation, single-bit errors:")
    n = len(cw)
    for pos in (1, 7, 14):
        bad = list(cw)
        bad[pos - 1] = '1' if bad[pos - 1] == '0' else '0'
        bad = ''.join(bad)
        rem = remainder(bad)
        print(f"  flip bit {pos:>2}: {bad} -> {rem} "
              f"-> {'ACCEPT' if rem == '0'*R else 'REJECT'}")

    print(f"\nthe theorem: remainder(T + E) == remainder(E), data cancels")
    for pos in (1, 7, 14):
        e = ''.join('1' if i == pos - 1 else '0' for i in range(n))
        print(f"  E = {e}  rem(E) = {remainder(e)}, "
              f"rem(T+E) = {remainder(xor_bits(cw, e))}  "
              f"{'same' if remainder(e) == remainder(xor_bits(cw, e)) else 'DIFFER'}")

    def undetected(patterns):
        return sum(1 for e in patterns if remainder(e) == '0' * R)

    def weight_patterns(w):
        for combo in combinations(range(n), w):
            yield ''.join('1' if i in combo else '0' for i in range(n))

    print(f"\nexhaustive error classes over {n} bits")
    print(f"  {'class':<26}{'tested':>8}{'missed':>8}{'pct':>8}")
    for w in (1, 2):
        pats = list(weight_patterns(w))
        u = undetected(pats)
        print(f"  {str(w) + '-bit errors':<26}{len(pats):>8}{u:>8}"
              f"{100*u/len(pats):>7.2f}%")

    def bursts(length):
        """First and last bit set, middle arbitrary: a burst of that length."""
        for start in range(n - length + 1):
            for mid in range(1 << max(0, length - 2)):
                p = ['0'] * n
                p[start] = '1'
                p[start + length - 1] = '1'
                for b in range(length - 2):
                    if mid >> b & 1:
                        p[start + 1 + b] = '1'
                yield ''.join(p)

    for L in range(2, 9):
        pats = list(bursts(L))
        u = undetected(pats)
        guar = " guaranteed" if L <= R else ""
        print(f"  {'burst length ' + str(L):<26}{len(pats):>8}{u:>8}"
              f"{100*u/len(pats):>7.2f}%{guar}")
    print(f"  theory: <= {R} -> 0%, exactly {R+1} -> 1/2^{R-1} = "
          f"{100/2**(R-1):.2f}%, longer -> 1/2^{R} = {100/2**R:.2f}%")

    odd = [e for w in (1, 3, 5) for e in weight_patterns(w)]
    u = undetected(odd)
    print(f"  {'odd weight (1,3,5)':<26}{len(odd):>8}{u:>8}"
          f"{100*u/len(odd):>7.2f}%")
    print("  a generator with an (x+1) factor would miss none of these; "
          "this one does")

    print(f"\nthe shortest undetectable error is G itself:")
    e = GEN + "0" * (n - len(GEN))
    print(f"  E = {e}, rem = {remainder(e)}, a burst spanning "
          f"{len(GEN)} bits = r + 1")

    print(f"\nwhy all double-bit errors are caught here:")
    print(f"  E = x^i (1 + x^d), undetectable only if G | (1 + x^d)")
    for d in range(1, 18):
        p = "1" + "0" * (d - 1) + "1"
        if remainder(p.ljust(max(n, d + 1), '0')[:max(n, d + 1)]) == '0' * R:
            print(f"  smallest such d is {d} = 2^{R} - 1, and the codeword "
                  f"is {n} bits so d <= {n-1}")
            break

    print(f"\nreal generators: primitivity versus an (x+1) factor")
    cands = {
        "IEEE 802.3 CRC-32": "1" + format(0x04C11DB7, '032b'),
        "CRC-32C Castagnoli": "1" + format(0x1EDC6F41, '032b'),
        "CRC-16-CCITT": "1" + format(0x1021, '016b'),
        "CRC-8-ATM": "1" + format(0x07, '08b'),
    }
    for name, g in cands.items():
        has = remainder(g, "11") == '0'
        print(f"  {name:<22} {g.count('1'):>3} terms, (x+1) a factor: "
              f"{'yes' if has else 'NO ':<4} -> all odd-weight errors: "
              f"{'yes' if has else 'no'}")
```

---

### What they ask next

**"Why exactly 4 redundant bits?"**
Because a remainder on division by a degree-4 polynomial has degree at most 3, so at most 4 coefficients. **The CRC length is the size of the remainder**, forced by the generator's degree rather than chosen. Saying "r equals the degree" is the same fact with the reason removed, and the reason is what the question is testing.

**"Why append the remainder rather than subtract it?"**
Because arithmetic is over **GF(2)**, where addition and subtraction are the same operation. By definition `D·x^r - R` is divisible by `G`, and since minus is plus, `D·x^r + R` is divisible too. **Appending works only because of that identity**, and in ordinary integer arithmetic you really would have to subtract.

**"What does the receiver compare against?"**
Nothing. It divides the received word by `G` and checks for a zero remainder. **The expected answer is zero for every message ever sent**, so there is nothing to store, nothing to look up and no branch on the data, which is exactly why the hardware is a bare shift register with XOR taps.

**"Prove that detection does not depend on the data."**
The received word is `T + E`, and `G | T` by construction, so `(T + E) mod G = E mod G`. **The remainder depends only on the error polynomial.** It follows that an error is undetectable if and only if `G` divides `E`, and therefore every guarantee is a property of `G` alone. Demonstrated above: the error pattern for a flipped last bit gives remainder `0001` on its own, the same value the corrupted codeword produces.

**"Which errors is this generator guaranteed to catch?"**
All single-bit errors, because `G` has a non-zero constant term so it cannot divide `x^i`. All bursts up to 4 bits, because such a burst is `x^j · B` with `deg B < r`, and a degree-4 polynomial divides neither factor. And, specific to this case, **all double-bit errors**, because `x^4 + x + 1` is **primitive**, so the smallest `d` with `G | (1 + x^d)` is `2^4 - 1 = 15`, while the codeword is only 14 bits.

**"Does it catch all odd-weight errors?"**
No, and this is where care pays. That property holds if and only if `(x + 1)` divides the generator. Here `G(1) = 1 + 1 + 1 = 1` in GF(2), so it does not, and measurably 140 of 2,380 odd-weight patterns slip through. **It is the price of primitivity**: a primitive polynomial is irreducible, so it cannot have an `(x+1)` factor, and the two desirable properties are mutually exclusive.

**"Then is it true of CRC-32?"**
For **CRC-32C**, CRC-16-CCITT and CRC-8-ATM, yes. For the **IEEE 802.3 CRC-32** used by Ethernet, **no**: its polynomial has 15 terms, so `G(1) = 1` and `(x+1)` is not a factor. The claim "CRC-32 detects all odd-weight errors" is repeated often and is wrong for the one most people mean. The check is one line: count the terms and see whether the count is even.

**"What is the shortest error it misses?"**
The generator itself, `10011`, which is trivially divisible by `G` and spans 5 bits, exactly `r + 1`. That makes the boundary concrete: bursts up to 4 are guaranteed, and the very first hole is at 5 and is `G`. For longer bursts the undetected fraction is `1/2^(r-1)` at `r+1` and `1/2^r` beyond, which here is 12.5% and 6.25%, matching the measured 10 of 80 and 28 of 448.

**"How is it computed in practice?"**
As a **shift register with XOR taps** at the generator's term positions, one bit per clock with `r` flip-flops, which is why it sits in every Ethernet MAC. In software it is **table-driven**, a byte at a time against a 256-entry table, and on modern x86 the `CRC32` instruction does **CRC-32C** in hardware, which is much of why iSCSI, ext4 and Btrfs use Castagnoli's polynomial rather than Ethernet's.

**"Is the textbook version what is really on the wire?"**
Not quite. A real CRC-32 **pre-loads the register with ones**, processes bits **reflected**, and **inverts the final remainder**. The preset and the inversion exist so that leading and trailing zeros are not invisible, which they would be in the bare formulation, since prepending zeros to a polynomial leaves it unchanged. Knowing that is the difference between having implemented one and having read about one.

**The common wrong answer** is appending the remainder without being able to say why appending rather than subtracting is valid, which is the `GF(2)` identity. Next is describing receiver validation as "recompute the CRC and compare", when the whole point is that the test is a single division against a constant zero. Third is asserting that CRC-32 catches all odd-weight errors. And last is stopping at the remainder without checking that the codeword divides exactly, which takes ten seconds and catches almost every arithmetic slip in the long division.

---

### Say this in the interview

*"The generator polynomial is x to the fourth plus x plus one, which as bits is 10011, degree four. So there are four redundant bits, and the reason is that a remainder on division by a degree-four polynomial has degree at most three, so at most four coefficients. The CRC length is the size of the remainder; it is not a parameter anyone chose.*

*The construction is to multiply the data by x to the fourth, which in bit terms is appending four zeros, divide by the generator, and append the remainder. So I divide 11010110110000 by 10011 using XOR instead of subtraction, aligning the generator under each leading one, and the remainder comes out as 1110. The transmitted codeword is 11010110111110.*

*I would say why appending the remainder is legitimate, because it is the step people do without justifying. Arithmetic is over GF(2), where addition and subtraction are the same operation. By definition of remainder, the data times x to the r, minus R, is divisible by G. Since minus is plus, the data times x to the r, plus R, is also divisible. In ordinary integer arithmetic you really would have to subtract. And I would check it: dividing 11010110111110 by 10011 gives remainder 0000, which confirms the division was right and takes ten seconds.*

*Receiver validation is that single division. And the thing to notice is what the receiver does not do: it does not recompute the CRC over the data and compare, and it does not store an expected value. It divides and looks for zero, and the expected answer is zero for every message ever sent, which is why the hardware is a bare shift register with XOR taps and no state.*

*Then the theorem that does all the work. The received word is T plus E, where the error polynomial E has a one in every corrupted position. G divides T by construction, so the remainder of T plus E equals the remainder of E alone. The remainder depends only on the error pattern and never on the data, and therefore an error is undetectable exactly when G divides E. That is a much stronger statement than a checksum can make: with a sum, whether a compensating pair of flips is caught depends on what the data happened to be, and here it does not depend on the data at all. So all the guarantees become properties of the generator, which you choose once.*

*Deriving them for this generator: all single-bit errors are caught, because E is x to the i and G would have to be a power of x to divide it, whereas 10011 has a non-zero constant term. All bursts up to four bits are caught, because a burst is x to the j times some B of degree less than r, and a degree-four polynomial divides neither factor. And all double-bit errors are caught here specifically, because E is x to the i times one plus x to the d, which needs G to divide one plus x to the d, and x to the fourth plus x plus one is primitive, so the smallest such d is two to the fourth minus one, which is fifteen, while the codeword is only fourteen bits.*

*I would be careful about odd-weight errors, because the usual claim is wrong. A generator catches every odd-weight error if and only if x plus one divides it. Here G at one is one plus one plus one, which is one in GF(2), so it is not a factor, and this generator misses some odd-weight errors. That is the price of primitivity: a primitive polynomial is irreducible, so it cannot have an x plus one factor, and the two properties are mutually exclusive. Worth adding that the same applies to the IEEE 802.3 CRC-32 that Ethernet uses: its polynomial has fifteen terms, so G at one is one, and it does not catch all odd-weight errors either, though CRC-32C and CRC-16-CCITT do.*

*For the boundary, the shortest undetectable error is the generator itself, 10011, which is obviously divisible by G and spans five bits, exactly r plus one. Beyond the guarantee the undetected fraction is one over two to the r minus one at length r plus one, and one over two to the r after that, so twelve and a half percent and six and a quarter percent here, and about one in four billion for CRC-32.*

*And on implementation: the long division is a shift register with XOR taps at the generator's term positions, one bit per clock, which is why CRCs are in every Ethernet MAC and disk controller. In software it is table-driven a byte at a time, and modern x86 has a CRC32 instruction for CRC-32C specifically, which is much of why iSCSI, ext4 and Btrfs picked Castagnoli's polynomial over Ethernet's. One caveat if they push: a real CRC-32 is not the bare division, it pre-loads the register with ones, processes bits reflected, and inverts the final remainder, and the preset and inversion exist so that leading and trailing zeros are not invisible, which they would be in the textbook form since prepending zeros to a polynomial does not change it."*
