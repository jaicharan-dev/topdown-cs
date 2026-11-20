---
id: 5-hamming-code
title: "Hamming Code: Locating a Single-Bit Error"
description: "The syndrome is not looked up in a table, it is the position written in binary, and a two-bit error makes the receiver corrupt an innocent third bit"

sidebar_position: 5
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "A sender wants to transmit the 4-bit data `1011` using Hamming code. Determine the parity bits needed, compute their values, walk through how the receiver identifies a single-bit error, and explain how enterprise ECC RAM uses SECDED to prevent miscorrection on 2-bit flips."

---

### Picture it

Twenty coins on a table, one of them counterfeit and slightly light, and a balance you may use three times.

**One weighing tells you whether** there is a fake among the coins you placed on the pan. Three weighings could tell you three separate whethers, and the obvious plan is to split the coins into three groups and test each. That plan is poor, because three yes-or-no answers about three disjoint groups can only narrow the fake to one group of seven.

**The good plan is to make the groups overlap deliberately.** Put coin 5 on the pan for the first weighing and the third but not the second. Put coin 3 on for the first and second but not the third. Arrange it so **every coin is in a different combination of weighings**, and now the three answers taken together are a three-bit label, and that label is the coin.

This is the whole of Hamming's idea, and the part worth holding onto is the inversion it performs. You are not running three independent tests and then consulting a lookup table for what the combination means. **You have arranged the tests so that the answers spell out the address.** The pattern of which weighings fail is the position of the fake, written in binary, because you chose the groups to make it so.

Which immediately explains the bit of the construction that otherwise looks arbitrary. **Why do the check bits sit at positions 1, 2, 4?** Because the first weighing is the one that includes every coin whose position has the lowest bit set, the second includes every coin whose position has the next bit set, and so on. A check bit has to sit at a position that **only its own weighing covers**, so that setting it fixes that weighing's balance without disturbing the others, and the positions with exactly one bit set are the powers of two. They are not reserved by convention; they are the only positions that work.

And then the failure that matters, which is where this page earns its keep.

**Two counterfeits break the method in a specific and nasty way.** The three answers come back as some non-zero label, because two wrongs do not cancel in every weighing. So the receiver reads a label, concludes a single coin is fake, and confidently replaces a coin that was perfectly good. **It does not fail to detect the problem; it detects a problem and then acts on a wrong diagnosis, making a third error.** A scheme that reported "something is wrong, I cannot say what" would be strictly better than one that silently corrupts an innocent bit, and the whole point of the extra bit in SECDED is to buy exactly that admission.

---

### The proper terms

#### Sizing the code

Let `m` be the data bits and `r` the **parity bits**, also called check bits. The syndrome of `r` bits has `2^r` possible values, and it must name every one of the `m + r` positions **plus** the case of no error at all. That gives the **Hamming bound**:

$$2^r \ge m + r + 1$$

For `m = 4`: `r = 2` gives `4 >= 7`, false. `r = 3` gives `8 >= 8`, true with nothing spare, so `r = 3` and the codeword is 7 bits. This is the **(7,4) Hamming code**, and the fact that the inequality is tight is why it is called perfect: every one of the eight syndrome values is used, one for "clean" and seven for the seven positions.

#### The layout, and why powers of two

Positions are numbered from 1. **Parity bits occupy positions 1, 2, 4**, the powers of two; data bits occupy 3, 5, 6, 7.

**Parity bit `P` at position `2^k` covers every position whose binary representation has bit `k` set.** So:

| Parity bit | Covers positions | Because those positions have |
| :---: | :--- | :--- |
| `P1` | 1, 3, 5, 7 | bit 0 set |
| `P2` | 2, 3, 6, 7 | bit 1 set |
| `P4` | 4, 5, 6, 7 | bit 2 set |

The reason the parity bits must sit at powers of two is that **position `2^k` is covered by `P(2^k)` and by no other parity bit**, so each parity value can be chosen independently to satisfy its own equation. Put a parity bit at position 6 and it would fall under both `P2` and `P4`, making the equations interdependent and the encoding circular.

#### The syndrome

The receiver recomputes each parity check over the positions that check covers, **including the parity bit itself**, and assembles the results:

$$\text{syndrome} = C_4 C_2 C_1 \text{ read as a binary number}$$

**If exactly one bit is wrong, the syndrome equals its position.** The derivation is one line: check `k` fails exactly when the corrupted position has bit `k` set, so the bits of the syndrome are the bits of the position. **It is not a lookup, it is the address.**

A syndrome of 0 means no error detected.

#### Hamming distance, and what it buys

The **Hamming distance** between two codewords is the number of bit positions where they differ, and the **minimum distance** `d` of a code is the smallest such distance over all pairs. The guarantees are:

- detect up to `s` errors requires `d >= s + 1`
- correct up to `t` errors requires `d >= 2t + 1`

The (7,4) code has `d = 3`, so it corrects 1 or detects 2, but not both at once, and that "not both" is exactly the problem in part 4.

#### SECDED

**SECDED**, single error correction double error detection, adds one **overall parity bit** across the entire codeword, raising the minimum distance to 4. The two checks are then read together:

| Syndrome | Overall parity | Conclusion |
| :---: | :---: | :--- |
| 0 | correct | no error |
| non-zero | **wrong** | single error, at the syndrome's position, correct it |
| non-zero | **correct** | **double error, report it and do not correct** |
| 0 | wrong | the overall parity bit itself flipped |

The third row is the whole purpose. A double error flips two positions, so the total weight changes by two and the overall parity is unchanged, while the syndrome is non-zero. **That combination is impossible for a single error**, which is what lets the receiver tell the two cases apart and decline to guess.

#### Where this runs

**ECC RAM** uses SECDED on 64-bit words. Sizing it: `m = 64` needs `r = 7` for correction, since `2^7 = 128 >= 64 + 7 + 1 = 72`, plus one more bit for double detection, giving **8 check bits on 64 data bits**. That is why server memory modules are 72 bits wide where consumer modules are 64, and the 12.5% overhead is the cost.

Correcting more than one error, or surviving the loss of a whole memory chip, needs stronger codes: **Chipkill** and its successors use Reed-Solomon style symbol-level codes so that a multi-bit failure confined to one device looks like a single symbol error.

---

### Work it out

#### Part 1: how many parity bits

`m = 4`, and we need the smallest `r` with `2^r >= m + r + 1`:

| `r` | `2^r` | `m + r + 1` | Enough? |
| :---: | :---: | :---: | :--- |
| 2 | 4 | 7 | no |
| **3** | **8** | **8** | **yes, exactly** |

**`r = 3`**, codeword length 7. The eight syndrome values map to seven positions plus "clean", with none wasted.

#### Part 2: the layout and the parity values

Parity at 1, 2, 4; data `1011` at 3, 5, 6, 7 in order.

| Position | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Role | `P1` | `P2` | `D1` | `P4` | `D2` | `D3` | `D4` |
| Value | ? | ? | **1** | ? | **0** | **1** | **1** |
| Binary of position | 001 | 010 | 011 | 100 | 101 | 110 | 111 |

Now each parity bit is set to make its own group even.

**`P1`** covers positions 1, 3, 5, 7. The data in that group is positions 3, 5, 7 = 1, 0, 1, summing to **2**, which is even, so `P1 = 0`.

**`P2`** covers positions 2, 3, 6, 7. The data is positions 3, 6, 7 = 1, 1, 1, summing to **3**, odd, so `P2 = 1`.

**`P4`** covers positions 4, 5, 6, 7. The data is positions 5, 6, 7 = 0, 1, 1, summing to **2**, even, so `P4 = 0`.

| Position | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Codeword `T`** | **0** | **1** | 1 | **0** | 0 | 1 | 1 |

$$T = \mathbf{0110011}$$

Check each group is now even: positions 1,3,5,7 give 0+1+0+1 = 2; positions 2,3,6,7 give 1+1+1+1 = 4; positions 4,5,6,7 give 0+0+1+1 = 2. All even.

#### Part 3: the receiver finds a single error

Suppose bit 6 flips in transit, so the receiver sees `011000` with a 1 at the end:

$$R = \mathbf{0110001}$$

Recompute each check **over all the positions it covers, parity bit included**:

| Check | Positions | Values in `R` | Sum | Parity |
| :---: | :--- | :--- | :---: | :---: |
| `C1` | 1, 3, 5, 7 | 0, 1, 0, 1 | 2 | even, so **0** |
| `C2` | 2, 3, 6, 7 | 1, 1, 0, 1 | 3 | odd, so **1** |
| `C4` | 4, 5, 6, 7 | 0, 0, 0, 1 | 1 | odd, so **1** |

Syndrome, read as `C4 C2 C1`:

$$110_2 = \mathbf{6}$$

**Position 6 is the error.** Flip it back, recover `0110011`, and extract the data from positions 3, 5, 6, 7: `1011`.

The derivation is the point rather than the arithmetic. `C1` is the parity over every position with bit 0 set, and it came out correct, so **the broken position does not have bit 0 set**. `C2` failed, so the broken position **does** have bit 1 set. `C4` failed, so it has bit 2 set. Bits 2 and 1 set, bit 0 clear, is `110`, which is 6. **The syndrome is not a key into a table; it is the position assembled bit by bit from the questions you chose to ask.**

Every single-bit error behaves the same way:

| Flipped position | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Syndrome | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

#### Part 4: two errors, and the damage done

Flip bits 5 **and** 6. The syndrome comes out as:

$$5 \oplus 6 = 101_2 \oplus 110_2 = 011_2 = \mathbf{3}$$

That is the general rule: **a double error at positions `p` and `q` produces syndrome `p XOR q`.** Since `p` and `q` differ, the XOR is non-zero, so the syndrome never signals "clean". And since the XOR of two distinct positions is almost never equal to either of them, it points somewhere else entirely.

**Position 3 is a data bit, and it was perfectly fine.** The receiver flips it. So the word now has three wrong bits and the receiver reports success.

Checking all 21 two-bit error patterns in the (7,4) code:

| Outcome | Count |
| :--- | :---: |
| Syndrome zero, error missed silently | 0 |
| Syndrome non-zero, **wrongly "corrected"** | **21** |
| Correctly identified as a double error | **0** |

**Every single one is miscorrected.** This is worse than failing to detect, and the reason is structural rather than bad luck: the code has minimum distance 3, which is enough to correct one error **or** detect two, and the decoder has already committed to correcting. With `d = 3` a double error lands at distance 1 from some other valid codeword, and a nearest-neighbour decoder dutifully moves to it.

#### Part 5: SECDED, and what the extra bit buys

Add one **overall parity bit** `P0` over all seven positions. Here the codeword `0110011` has four ones, so `P0 = 0`, and the transmitted word is 8 bits.

Minimum distance rises from 3 to 4, and the decoder now reads two signals instead of one:

| Case | Syndrome | Overall parity | Verdict |
| :--- | :---: | :---: | :--- |
| No error | 0 | correct | clean |
| Bit 6 flips | 6 | **wrong** | single error at 6, correct it |
| Bits 5 and 6 flip | 3 | **correct** | **double error, flag it, do not correct** |
| `P0` itself flips | 0 | wrong | the overall parity bit flipped |

The logic in one sentence: **a single error changes the total weight by one so the overall parity breaks, while a double error changes it by two so the overall parity holds.** A non-zero syndrome with intact overall parity is therefore impossible for a single error, and that impossibility is the detection.

What you have bought is not correction of double errors, which this code cannot do, but **the ability to decline**. The machine reports an uncorrectable error rather than handing the program corrupted data, which for a server is the entire difference between a logged fault and silent data corruption.

#### Part 6: why server memory is 72 bits wide

| Quantity | Value | Derivation |
| :--- | :---: | :--- |
| Data bits | 64 | one machine word |
| Check bits for SEC | **7** | `2^7 = 128 >= 64 + 7 + 1 = 72` |
| Extra bit for DED | **1** | the overall parity bit |
| Total | **72** | hence the 72-bit DIMM |
| Overhead | **12.5%** | 8 bits per 64 |

That is the whole reason ECC modules are physically wider and cost more. Note how the overhead shrinks with word size, which is why nobody runs SECDED on 4-bit words outside a textbook:

| Data bits | Check bits | Overhead |
| :---: | :---: | :---: |
| 4 | 4 | 100% |
| 8 | 5 | 62.5% |
| 16 | 6 | 37.5% |
| 32 | 7 | 21.9% |
| **64** | **8** | **12.5%** |
| 128 | 9 | 7.0% |

**The check bits grow logarithmically while the data grows linearly**, which is the real argument for Hamming over the two-dimensional parity scheme that achieves the same single-error correction with roughly `2 * sqrt(n)` bits.

#### Verify it

```python
"""
Hamming (7,4): encoding, syndrome decoding, the two-bit miscorrection,
and the SECDED decision table.
"""
from itertools import combinations

DATA = "1011"
N, R = 7, 3
PARITY_POS = [1, 2, 4]
DATA_POS = [3, 5, 6, 7]


def hamming_bound(m):
    return next(r for r in range(1, 20) if 2**r >= m + r + 1)


def encode(data):
    """1-indexed codeword; cw[0] is unused."""
    cw = [0] * (N + 1)
    for ch, p in zip(data, DATA_POS):
        cw[p] = int(ch)
    for pp in PARITY_POS:
        cw[pp] = sum(cw[p] for p in range(1, N + 1)
                     if p & pp and p != pp) % 2
    return cw


def syndrome(cw):
    """Each check covers every position whose bit k is set, parity included."""
    s = 0
    for k in range(R):
        pp = 1 << k
        if sum(cw[p] for p in range(1, N + 1) if p & pp) % 2:
            s += pp
    return s


def as_str(cw):
    return ''.join(str(cw[p]) for p in range(1, N + 1))


if __name__ == "__main__":
    print("-- Part 1: sizing")
    for r in (2, 3):
        print(f"   r = {r}: 2^r = {2**r:>3}, m + r + 1 = {4 + r + 1:>3} "
              f"-> {'ok' if 2**r >= 4 + r + 1 else 'too small'}")
    assert hamming_bound(4) == 3
    print(f"   r = 3, codeword 7 bits, and the bound is tight: all "
          f"{2**R} syndromes used, 1 for clean + {N} positions")

    print("\n-- Part 2: encode")
    cw = encode(DATA)
    for pp in PARITY_POS:
        covered = [p for p in range(1, N + 1) if p & pp and p != pp]
        vals = [cw[p] for p in covered]
        print(f"   P{pp} covers {sorted([pp] + covered)}, data there "
              f"{vals} sums to {sum(vals)} -> P{pp} = {cw[pp]}")
    print(f"   codeword T = {as_str(cw)}")
    assert syndrome(cw) == 0
    print(f"   clean syndrome {syndrome(cw)}: every group is even")

    print("\n-- Part 3: single error, syndrome IS the position")
    for i in range(1, N + 1):
        bad = list(cw)
        bad[i] ^= 1
        s = syndrome(bad)
        mark = " <-- the worked example" if i == 6 else ""
        print(f"   flip {i}: R = {as_str(bad)}  syndrome {s}  "
              f"{'correct' if s == i else 'WRONG'}{mark}")
        assert s == i

    print("\n-- Part 4: two errors are MISCORRECTED, not missed")
    missed = miscorrected = 0
    for p, q in combinations(range(1, N + 1), 2):
        bad = list(cw)
        bad[p] ^= 1
        bad[q] ^= 1
        s = syndrome(bad)
        if s == 0:
            missed += 1
        else:
            miscorrected += 1
        assert s == (p ^ q), "syndrome should be p XOR q"
        if (p, q) in ((5, 6), (1, 2)):
            print(f"   flip {p} and {q}: syndrome {s} = {p}^{q}; the decoder "
                  f"flips position {s}, which was fine -> 3 wrong bits")
    total = len(list(combinations(range(1, N + 1), 2)))
    print(f"   of {total} two-bit patterns: {missed} missed silently, "
          f"{miscorrected} MISCORRECTED, 0 identified as double")
    print("   structural: d = 3 corrects 1 OR detects 2, never both, and a")
    print("   nearest-neighbour decoder has already committed to correcting")

    print("\n-- Part 5: SECDED")
    overall = sum(cw[p] for p in range(1, N + 1)) % 2
    print(f"   overall parity bit P0 = {overall}, codeword is now 8 bits, "
          f"d rises from 3 to 4")
    print(f"   {'case':<22}{'syndrome':>10}{'overall':>10}   verdict")
    cases = (("no error", [], False), ("bit 6 flips", [6], False),
             ("bits 5 and 6 flip", [5, 6], False),
             ("P0 itself flips", [], True))
    for desc, flips, flip_p0 in cases:
        bad = list(cw)
        ov = overall ^ (1 if flip_p0 else 0)
        for f in flips:
            bad[f] ^= 1
        s = syndrome(bad)
        total_par = (sum(bad[p] for p in range(1, N + 1)) + ov) % 2
        if s == 0 and total_par == 0:
            v = "clean"
        elif s != 0 and total_par == 1:
            v = f"single error at {s}, correct it"
        elif s != 0 and total_par == 0:
            v = "DOUBLE error: flag, do not correct"
        else:
            v = "the overall parity bit flipped"
        print(f"   {desc:<22}{s:>10}{'wrong' if total_par else 'correct':>10}"
              f"   {v}")
    print("   a single error changes the weight by 1 so overall parity breaks;")
    print("   a double changes it by 2 so overall parity holds. That gap is "
          "the detection.")

    print("\n-- Part 6: overhead against word size")
    print(f"   {'data':>6}{'SEC bits':>10}{'+DED':>7}{'total':>8}"
          f"{'overhead':>11}")
    for m in (4, 8, 16, 32, 64, 128):
        r = hamming_bound(m)
        print(f"   {m:>6}{r:>10}{r+1:>7}{m+r+1:>8}"
              f"{100*(r+1)/m:>10.1f}%")
    r64 = hamming_bound(64)
    print(f"   64 data + {r64} SEC + 1 DED = {64 + r64 + 1} bits: "
          f"the 72-bit ECC DIMM")
    print("   check bits grow logarithmically while data grows linearly, "
          "which is\n   why Hamming beats 2D parity's roughly 2*sqrt(n)")
```

---

### What they ask next

**"Why `2^r >= m + r + 1`?"**
Because the syndrome has to name every possible outcome. There are `m + r` positions that could be wrong, plus the case of no error, so `m + r + 1` distinct answers are needed, and `r` bits of syndrome provide `2^r`. For `m = 4` the bound is **tight at `r = 3`**: all eight syndrome values are used, one for clean and seven for positions, with nothing wasted, which is why the (7,4) code is called perfect.

**"Why do the parity bits sit at positions 1, 2 and 4?"**
Because position `2^k` is covered by parity bit `P(2^k)` **and by no other**, which lets each parity value be chosen independently to satisfy its own equation. A parity bit at position 6 would fall under both `P2` and `P4`, making the two equations interdependent and the encoding circular. **The powers of two are the only positions that work**, so this is forced rather than conventional.

**"Why does the syndrome equal the position?"**
Because check `k` covers exactly the positions whose binary representation has bit `k` set. If a single position `p` is wrong, then check `k` fails precisely when `p` has bit `k` set, so **the bits of the syndrome are the bits of `p`.** It is not a lookup table; the checks were chosen to make the answers spell out the address. On the worked example, `C1` passed and `C2` and `C4` failed, giving `110`, which is 6.

**"What happens on a two-bit error?"**
The syndrome comes out as `p XOR q`, which is non-zero because the positions differ, so the receiver believes it has found a single error and **corrects a third, innocent position.** Flipping 5 and 6 gives syndrome 3, and position 3 is a data bit, so the word ends up with three wrong bits and the receiver reports success. Checking all 21 patterns: **none is missed silently and all 21 are miscorrected.** That is worse than non-detection, because silent corruption of good data is harder to notice than a reported fault.

**"Why can't it just detect the double error instead?"**
Because the minimum **Hamming distance** is 3, which supports correcting one error **or** detecting two, not both. The rules are `d >= 2t + 1` to correct `t` and `d >= s + 1` to detect `s`, so `d = 3` gives `t = 1` or `s = 2`. A double error lands at distance 1 from a different valid codeword, and a nearest-neighbour decoder that has committed to correcting moves to it. **You have to spend a bit to buy the right to say "I do not know".**

**"How does SECDED fix it?"**
By adding one **overall parity bit** across the whole codeword, raising `d` to 4. A single error changes the total weight by one so the overall parity breaks; a double error changes it by two so the overall parity holds. **A non-zero syndrome with intact overall parity is therefore impossible for a single error**, and that impossibility is the detection. The decoder reads the two signals together: non-zero plus broken parity means correct it, non-zero plus intact parity means flag an uncorrectable error.

**"So SECDED corrects two-bit errors?"**
No, and that is the most common misstatement. It **detects** them and declines to correct. The value is the decline: a server reports an uncorrectable memory error and halts or kills the process rather than handing it corrupted data. **Correcting two errors needs `d >= 5`**, which costs considerably more check bits.

**"Why is ECC memory 72 bits wide?"**
`m = 64` needs `r = 7` for single-error correction, since `2^7 = 128 >= 72`, plus one more for double detection, giving 8 check bits and a 72-bit word. The overhead is **12.5%**, which is why the modules are physically wider and dearer. The overhead falls as words grow, from 100% at 4 data bits to 7% at 128, **because check bits grow logarithmically while data grows linearly.**

**"What about a whole memory chip failing?"**
Beyond SECDED's reach, since a device failure corrupts many bits at once. **Chipkill** and its successors use symbol-oriented codes, Reed-Solomon style, so that a multi-bit failure confined to one device presents as a single symbol error and remains correctable. The principle is to align the code's symbol boundaries with the hardware's failure boundaries.

**"How does this compare to two-dimensional parity?"**
Both correct a single error, and Hamming does it far more cheaply. For 16 data bits, Hamming needs 5 check bits; a 4 by 4 two-dimensional scheme needs 8 row and column bits. The scaling is the real difference: `log` against roughly `2 * sqrt(n)`. Two-dimensional parity does have one honest advantage worth naming, which is that it detects most multi-bit errors rather than miscorrecting them.

**The common wrong answer** is placing the data bits in positions 1 to 4 and the parity bits at 5 to 7, which breaks the independence that makes the syndrome equal the position. Next is recomputing each check over the data bits only, excluding the parity bit, which inverts every syndrome bit. Third is saying that a two-bit error "goes undetected", when in fact all 21 produce a non-zero syndrome and get actively miscorrected, and the distinction matters because silent corruption of good data is the worse outcome. And last is claiming SECDED corrects double errors when it only detects them.

---

### Say this in the interview

*"First the sizing, which comes from the Hamming bound. The syndrome has to name every position that could be wrong plus the case of no error, so with m data bits and r parity bits I need two to the r at least m plus r plus one. For m equals four, r equals two gives four against seven, not enough; r equals three gives eight against eight, which works exactly. So three parity bits, a seven-bit codeword, and the bound is tight, which is why this (7,4) Hamming code is called perfect: all eight syndrome values are used, one for clean and seven for positions.*

*Parity bits go at positions one, two and four, and I would say why rather than treating it as convention. Parity bit at two to the k covers every position whose binary representation has bit k set. So P1 covers one, three, five, seven; P2 covers two, three, six, seven; P4 covers four, five, six, seven. The reason the parity bits must sit at powers of two is that position two to the k is covered by its own parity bit and no other, so each parity value can be chosen independently. Put a parity bit at position six and it falls under both P2 and P4, the equations become interdependent, and the encoding is circular. The powers of two are the only positions that work.*

*Data 1011 goes into positions three, five, six, seven. For P1, the data at three, five, seven is one, zero, one, which sums to two, even, so P1 is zero. For P2, the data at three, six, seven is one, one, one, sums to three, odd, so P2 is one. For P4, the data at five, six, seven is zero, one, one, sums to two, even, so P4 is zero. The codeword is 0110011.*

*Now say bit six flips, so the receiver sees 0110001. I recompute each check over all the positions it covers, including the parity bit itself, which is the step people get wrong. C1 over one, three, five, seven gives zero, one, zero, one, sum two, even, so C1 is zero. C2 over two, three, six, seven gives one, one, zero, one, sum three, odd, so C2 is one. C4 over four, five, six, seven gives zero, zero, zero, one, sum one, odd, so C4 is one. The syndrome read as C4 C2 C1 is 110, which is six.*

*And the derivation is what I would emphasise rather than the arithmetic. C1 passed, so the broken position does not have bit zero set. C2 failed, so it does have bit one set. C4 failed, so it has bit two set. Bits two and one set, bit zero clear, is six. The syndrome is not a key into a lookup table; the checks were arranged so the answers spell out the address in binary.*

*Then the two-bit case, which is the interesting part. A double error at positions p and q gives syndrome p XOR q. Flip five and six and you get three. That is non-zero, so the receiver believes it has found a single error, and it flips position three, which is a data bit that was perfectly fine. So the word now has three wrong bits and the receiver reports success. Checking all twenty-one two-bit patterns in the seven-four code: none is missed silently and all twenty-one are miscorrected. I would stress that this is worse than failing to detect, because silently corrupting good data is harder to notice than a reported fault. And it is structural, not bad luck: the minimum Hamming distance is three, which supports correcting one error or detecting two but never both, since you need d at least two t plus one to correct t and d at least s plus one to detect s. A double error sits at distance one from a different valid codeword, and a nearest-neighbour decoder that has committed to correcting walks right into it.*

*SECDED fixes it with one more bit, an overall parity bit across the whole codeword, which raises the minimum distance to four. The logic is that a single error changes the total weight by one so the overall parity breaks, while a double error changes it by two so the overall parity holds. A non-zero syndrome with intact overall parity is therefore impossible for a single error, and that impossibility is the detection. So the decoder reads both: non-zero syndrome with broken parity means correct at that position; non-zero syndrome with intact parity means flag an uncorrectable double error and do not touch anything. I would be careful to say it detects rather than corrects double errors, because that is the usual misstatement. What the extra bit buys is the right to decline, and for a server that is the difference between a logged fault and silent data corruption.*

*For the real-world sizing: ECC RAM runs SECDED on sixty-four-bit words. Sixty-four data bits need seven check bits for correction, since two to the seventh is a hundred and twenty-eight and that is at least seventy-two, plus one for double detection, so eight check bits and a seventy-two-bit word. That is exactly why server DIMMs are seventy-two bits wide where consumer ones are sixty-four, at twelve and a half percent overhead. And the overhead falls as words grow, from a hundred percent at four data bits to seven percent at a hundred and twenty-eight, because check bits grow logarithmically while data grows linearly, which is also the argument for Hamming over two-dimensional parity, where the cost scales as roughly two root n. If they push further, a whole failed memory chip is beyond SECDED, and that is what Chipkill addresses with symbol-oriented Reed-Solomon style codes, aligning the code's symbol boundaries with the hardware's failure boundaries so a device failure looks like one symbol error."*
