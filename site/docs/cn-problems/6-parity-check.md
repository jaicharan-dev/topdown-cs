---
id: 6-parity-check
title: "Even Parity and the Two-Bit Blind Spot"
description: "One check bit answers one question, so it splits all possible errors into exactly two classes: the odd-weight half it always catches and the even-weight half it never does"

sidebar_position: 6
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "A sender wants to transmit the data byte `1001101` using a single even parity bit. Determine the parity bit value, validate the received data, explain mathematically why a 2-bit error goes undetected, and describe how Two-Dimensional (2D) Parity solves this limitation."

---

### Picture it

You are handed one yes-or-no question to ask about a page of text, and you have to use it to find out whether the page was retyped correctly.

The best such question turns out to be: **is the number of letter "e"s odd or even?** Not because "e" is special, but because any question of this form has exactly the same shape, and this one is cheap to answer. Retype the page with one "e" dropped and the answer changes, so you catch it.

Now notice the hard limit, and notice that it is a limit on the **question**, not on the answer. **One yes-or-no question has two possible answers, so it can sort every possible version of the page into exactly two buckets.** One bucket is "odd count", one is "even count". That is all the resolution you have, and no cleverness about which question to ask changes the count of buckets.

So two things follow, and they are the whole page.

**Any change that moves the page from one bucket to the other is caught, every single time.** Drop one "e", add three, delete five: the parity flips and you know. There is no probability involved and no luck.

**Any change that leaves the page in the same bucket is invisible, every single time.** Drop one "e" and add another somewhere else, and the count is back where it was. The question cannot distinguish that page from a correct one, because **you asked about the count and only the count, and the count is right.**

That is not a weakness to be patched; it is the exact information content of what you bought. One bit in, one bit of discrimination out.

And it tells you immediately what you must do to get more. **To learn *where* the error is, rather than merely *whether*, you need more than one question**, and the number you need is governed by how many answers you have to be able to distinguish. Eight positions need three questions, because three yes-or-no answers give eight combinations. The two-dimensional scheme in part 4 is the crude version of that idea: ask one question per row and one per column, and a single error shows up in exactly one of each, so the pair of failures gives you coordinates. It works, and it is wasteful, and the cheaper arrangement of the same idea is the Hamming code.

---

### The proper terms

#### The check

A **parity bit** is one bit appended to a block so that the total number of ones in the block satisfies a chosen condition.

**Even parity**, used here, sets the bit so the total count of ones is even. **Odd parity** sets it so the total is odd. Neither is stronger; the only practical difference is that under even parity an all-zeros block is valid, which means a dead line stuck at zero looks like legitimate data, and odd parity catches that.

Stated as arithmetic, the parity bit is the XOR of the data bits, which is the same as their sum modulo 2:

$$p = d_1 \oplus d_2 \oplus \cdots \oplus d_n = \Big(\sum_i d_i\Big) \bmod 2$$

**Verification** is to take the sum modulo 2 over the whole received block, parity bit included, and require zero.

#### The weight argument

The **weight** of an error pattern is the number of bits it flips. Because the check is a sum modulo 2, an error of weight `w` changes the computed parity by `w mod 2`. So:

$$\text{detected} \iff w \text{ is odd}$$

This is the complete detection theory, and it is worth saying in that form because it is exact rather than probabilistic. **Every odd-weight error is caught and no even-weight error ever is.** A two-bit error is not usually missed or often missed; it is always missed, and so is every four-bit and six-bit error.

Counting over an 8-bit block there are `2^8 - 1 = 255` non-zero error patterns, of which exactly `2^7 = 128` have odd weight and 127 have even weight. **Parity detects precisely half of all possible errors**, and which half is fixed in advance rather than left to chance.

#### Why one bit cannot locate anything

A single check bit yields a one-bit **syndrome**, which has two states: consistent or inconsistent. To identify which of `n` positions is wrong you need to distinguish `n + 1` outcomes, the positions plus "nothing wrong", and that needs at least `log2(n + 1)` check bits. **Detection and location are different purchases**, and one bit buys only the first. This is the bound that the Hamming code meets exactly.

#### Two-dimensional parity

**Two-dimensional parity** arranges the data in a rectangle and computes a parity bit per row and per column, usually with one more bit covering the parities themselves.

A single-bit error then breaks **exactly one row check and exactly one column check**, and their intersection is the position, so 2D parity **corrects** single-bit errors. It also detects all two-bit and three-bit errors, because no pair or triple of flips can leave every row and every column even.

Its failure is specific and worth memorising as a shape rather than a rule. **Four errors at the corners of a rectangle are undetectable**: each of the two affected rows contains two flips and each of the two affected columns contains two flips, so every check sees an even change and all of them pass.

For a `k` by `k` block the cost is `2k + 1` check bits for `k^2` data bits, which is `O(sqrt(n))` overhead. The Hamming code achieves the same single-error correction with `O(log n)` bits, which is why Hamming is what memory controllers use. **2D parity does retain one genuine advantage**: it detects most multi-bit errors instead of miscorrecting them, where a bare Hamming code confidently corrupts a third bit.

#### Where single parity is actually used

Serial links with a **UART** still carry an optional parity bit per character, a convention from the teletype era. Early **parity RAM** used one bit per byte, which could report a fault but not repair it, and was displaced by **ECC** for exactly the reason on this page: a machine that halts on detected corruption is better than one that proceeds, but a machine that repairs it is better still. Parity also survives inside hardware as a cheap sanity check on internal buses and register files, where the real protection is elsewhere.

---

### Work it out

#### Part 1: computing the parity bit

Data: `1001101`, seven bits.

| Bit | 1 | 0 | 0 | 1 | 1 | 0 | 1 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Running count of ones | 1 | 1 | 1 | 2 | 3 | 3 | **4** |

The count of ones is **4**, which is already even, so for even parity the bit must contribute nothing:

$$p = 1 \oplus 0 \oplus 0 \oplus 1 \oplus 1 \oplus 0 \oplus 1 = 0$$

**Parity bit = 0.** Transmitted block: `10011010`, eight bits, with four ones.

Had the data contained an odd number of ones, the parity bit would be 1. Under **odd** parity the answer here would be the opposite, `p = 1`, giving five ones.

#### Part 2: verification

The receiver counts the ones in all eight bits and requires an even total.

| Received | Ones | Verdict |
| :--- | :---: | :--- |
| `10011010` | 4 | even, **accept** |
| `10111010` | 5 | odd, **reject**, one bit flipped |
| `10101010` | 4 | even, **accept**, and it is wrong |

That third row is part 3.

#### Part 3: why a two-bit error is always missed

Take `10011010` and flip bit 3 from 0 to 1 and bit 4 from 1 to 0:

```
  sent      1 0 0 1 1 0 1 0        4 ones, even
                ^ ^
  received  1 0 1 0 1 0 1 0        4 ones, even  -> ACCEPT
```

The receiver accepts corrupt data, and the reason is one line of arithmetic rather than bad luck. The check is a sum modulo 2. An error of weight `w` changes that sum by `w mod 2`. Here `w = 2`, and `2 mod 2 = 0`, **so the sum is provably unchanged.**

Which generalises immediately:

| Error weight | Change to the parity sum | Detected? |
| :---: | :---: | :--- |
| 1 | 1 | **always** |
| 2 | 0 | **never** |
| 3 | 1 | **always** |
| 4 | 0 | **never** |
| `w` | `w mod 2` | **if and only if `w` is odd** |

Counting exhaustively over the 8-bit block:

| | Count |
| :--- | :---: |
| Non-zero error patterns | 255 |
| Odd weight, all detected | **128** |
| Even weight, all undetected | **127** |

**Exactly half**, and `128 = 2^7`, which is `2^(n-1)` for an `n`-bit block. The split is not approximate and it is not data-dependent; it is determined entirely by the parity of the weight.

The honest summary is that parity does not detect "most" errors. **It detects exactly the odd-weight half, chosen in advance**, which is what one bit of redundancy can buy and no more.

#### Part 4: two-dimensional parity

Arrange the data in a 4 by 4 grid and add a parity bit to each row and each column.

```
            c0  c1  c2  c3 | row parity
          +----------------+------------
    r0    | 1   0   1   1  |     1
    r1    | 0   1   1   0  |     0
    r2    | 1   1   0   1  |     1
    r3    | 0   0   1   1  |     0
          +----------------+
  col par | 0   0   1   1  |     0   <- parity of the parities
```

Each row parity makes its row even; each column parity makes its column even.

**A single-bit error is located and corrected.** Flip the bit at row 1, column 2:

```
            c0  c1  c2  c3 | row parity
          +----------------+------------
    r0    | 1   0   1   1  |     1       ok
    r1    | 0   1   0   0  |     0       FAILS  <--
    r2    | 1   1   0   1  |     1       ok
    r3    | 0   0   1   1  |     0       ok
          +----------------+
  col par | 0   0   1   1  |
            ok  ok  ^^^^ ok
                  FAILS
```

Exactly one row check fails and exactly one column check fails, and **their intersection is the broken bit**, so the receiver flips it back. Two one-bit answers have combined to give a coordinate, which single parity could never do.

**Two and three-bit errors are detected but not located.**

| Error | Rows failing | Columns failing | Verdict |
| :--- | :---: | :---: | :--- |
| 1 bit at (1,2) | 1 | 1 | **corrected** |
| 2 bits in one row | 0 | 2 | detected, not locatable |
| 3 bits scattered | 3 | 3 | detected, not locatable |
| **4 bits at rectangle corners** | **0** | **0** | **undetected** |

That last row is the limit, and it is worth being able to draw:

```
            c0  c1  c2  c3
          +----------------+
    r0    | .   .   .   .  |
    r1    | .   X   .   X  |   <- two flips, row stays even
    r2    | .   .   .   .  |
    r3    | .   X   .   X  |   <- two flips, row stays even
          +----------------+
              ^       ^
              |       two flips, column stays even
              two flips, column stays even
```

Every affected row contains two flips and every affected column contains two flips, so **every check sees an even change and every check passes.** It is the same even-weight blindness as single parity, lifted into two dimensions, and that is the point: adding more parity bits of the same kind buys resolution, not a different kind of immunity.

#### Part 5: the cost, and why Hamming wins

| Scheme | Data bits | Check bits | Overhead | Corrects | Detects |
| :--- | :---: | :---: | :---: | :---: | :--- |
| Single parity | 16 | **1** | 6% | none | odd weight only |
| 2D parity, 4 by 4 | 16 | **9** | 56% | 1 bit | 2 and 3 bits |
| Hamming | 16 | **5** | 31% | 1 bit | 1 bit |
| Hamming SECDED | 16 | **6** | 38% | 1 bit | 2 bits |

Hamming corrects a single error with 5 check bits where 2D parity needs 9, and the gap widens with size because the costs scale differently: **`O(log n)` against `O(sqrt n)`**. For a 64-bit word, SECDED needs 8 bits where an 8 by 8 two-dimensional scheme would need 17.

2D parity keeps one honest advantage, which is the right note to end on. On a multi-bit error it usually says "detected, cannot locate", whereas a bare Hamming code produces a non-zero syndrome, concludes a single error, and **corrupts a third innocent bit.** Resolution and humility are different properties, and SECDED exists precisely to buy the humility back.

#### Verify it

```python
"""
Even parity: the weight argument, exhaustive detection counts, and
two-dimensional parity including the undetectable rectangle.
"""
from itertools import combinations

DATA = "1001101"


def parity_bit(bits, even=True):
    ones = bits.count('1')
    return str((ones % 2) if even else ((ones + 1) % 2))


def valid(block, even=True):
    return (block.count('1') % 2 == 0) if even else \
           (block.count('1') % 2 == 1)


if __name__ == "__main__":
    print("-- Part 1")
    ones = DATA.count('1')
    p = parity_bit(DATA)
    block = DATA + p
    print(f"   data {DATA} has {ones} ones, which is "
          f"{'even' if ones % 2 == 0 else 'odd'}")
    print(f"   even parity bit = {p}, transmitted {block} "
          f"({block.count('1')} ones)")
    print(f"   odd parity would give {parity_bit(DATA, even=False)}")
    xor = 0
    for c in DATA:
        xor ^= int(c)
    print(f"   as a XOR of the data bits: {xor}, same thing")

    print("\n-- Part 2 and 3: flip bits and see")
    for desc, flips in (("clean", []), ("1 bit", [2]), ("2 bits", [2, 3]),
                        ("3 bits", [0, 2, 5]), ("4 bits", [0, 2, 3, 5])):
        b = list(block)
        for f in flips:
            b[f] = '1' if b[f] == '0' else '0'
            b = list(''.join(b))
        got = ''.join(b)
        print(f"   {desc:<7} {got}  {got.count('1')} ones  "
              f"-> {'ACCEPT' if valid(got) else 'reject'}"
              f"{'  <-- corrupt data accepted' if valid(got) and flips else ''}")

    print("\n-- the weight argument, exhaustively")
    n = len(block)
    det = und = 0
    by_weight = {}
    for w in range(1, n + 1):
        c = len(list(combinations(range(n), w)))
        caught = (w % 2 == 1)
        by_weight[w] = (c, caught)
        det += c if caught else 0
        und += 0 if caught else c
    print(f"   {'weight':>7}{'patterns':>10}{'parity change':>15}"
          f"{'detected':>10}")
    for w, (c, caught) in by_weight.items():
        print(f"   {w:>7}{c:>10}{w % 2:>15}{'all' if caught else 'none':>10}")
    print(f"   totals: {2**n - 1} non-zero patterns, {det} detected, "
          f"{und} undetected")
    print(f"   detected == 2^(n-1) == {2**(n-1)}: exactly half, and which "
          f"half is fixed in advance")
    assert det == 2**(n - 1)

    print("\n-- why one bit cannot locate")
    import math
    print(f"   a 1-bit syndrome has 2 states: consistent or not")
    print(f"   locating 1 of {n} positions needs {n} + 1 outcomes, so at "
          f"least {math.ceil(math.log2(n + 1))} check bits")

    print("\n-- Part 4: two-dimensional parity, 4 by 4")
    GRID = [[1, 0, 1, 1], [0, 1, 1, 0], [1, 1, 0, 1], [0, 0, 1, 1]]
    rowp = [sum(r) % 2 for r in GRID]
    colp = [sum(GRID[i][j] for i in range(4)) % 2 for j in range(4)]
    print(f"   row parities {rowp}, column parities {colp}, "
          f"corner {sum(rowp) % 2}")

    def diagnose(g):
        rb = [i for i in range(4) if sum(g[i]) % 2 != rowp[i]]
        cb = [j for j in range(4)
              if sum(g[i][j] for i in range(4)) % 2 != colp[j]]
        if len(rb) == 1 and len(cb) == 1:
            return f"located at ({rb[0]},{cb[0]}) and CORRECTED"
        if rb or cb:
            return f"detected: rows {rb}, cols {cb}, not locatable"
        return "UNDETECTED"

    cases = (("1 bit at (1,2)", [(1, 2)]),
             ("2 bits in one row", [(1, 1), (1, 3)]),
             ("2 bits in one column", [(0, 2), (2, 2)]),
             ("3 bits scattered", [(0, 0), (1, 2), (2, 3)]),
             ("4 bits, rectangle corners", [(1, 1), (1, 3), (3, 1), (3, 3)]))
    for desc, cells in cases:
        g = [row[:] for row in GRID]
        for i, j in cells:
            g[i][j] ^= 1
        print(f"   {desc:<28} -> {diagnose(g)}")
    print("   the rectangle flips 2 bits in each affected row AND 2 in each")
    print("   affected column, so every check sees an even change")

    print("\n-- Part 5: cost against Hamming")

    def hamming_r(m):
        return next(r for r in range(1, 20) if 2**r >= m + r + 1)

    print(f"   {'data':>6}{'single':>8}{'2D':>6}{'Hamming':>9}"
          f"{'SECDED':>8}")
    for m, k in ((16, 4), (64, 8), (256, 16)):
        two_d = 2 * k + 1
        h = hamming_r(m)
        print(f"   {m:>6}{1:>8}{two_d:>6}{h:>9}{h+1:>8}")
    print("   2D grows as O(sqrt(n)), Hamming as O(log n)")
    print("   but 2D usually says 'detected, cannot locate' on a multi-bit")
    print("   error, where bare Hamming miscorrects a third innocent bit")
```

---

### What they ask next

**"What is the parity bit and why?"**
Zero. The data `1001101` contains four ones, which is already even, so for **even parity** the bit must contribute nothing. Equivalently it is the XOR of the data bits, which is their sum modulo 2. Under **odd parity** the answer would be 1.

**"Why is a two-bit error always undetected?"**
Because the check is a sum modulo 2, so an error of weight `w` changes it by `w mod 2`, and `2 mod 2 = 0`. **The sum is provably unchanged**, so this is not a case of usually or often being missed; a two-bit error is always missed, and so is every four-bit and six-bit error. The complete rule is that an error is detected if and only if its **weight** is odd.

**"How much of the error space does it cover?"**
Exactly half, and the half is fixed in advance. Over an 8-bit block there are 255 non-zero patterns, of which `2^7 = 128` have odd weight and are all caught, and 127 have even weight and are all missed. **Parity detects precisely the odd-weight half**, which is what one bit of redundancy buys.

**"Why can one parity bit never tell you where the error is?"**
Because a one-bit **syndrome** has two states, consistent or not. Locating one of `n` positions requires distinguishing `n + 1` outcomes, the positions plus "nothing wrong", which needs at least `log2(n + 1)` check bits. **Detection and location are different purchases**, and this bound is exactly what the Hamming code meets.

**"Does even or odd parity matter?"**
Not for detection strength, which is identical. The one practical difference is that **under even parity an all-zeros block is valid**, so a line stuck at zero or a dead transmitter looks like legitimate data, whereas odd parity rejects it. That is a real argument for odd parity on a physical serial link.

**"How does 2D parity help?"**
A single-bit error breaks **exactly one row check and exactly one column check**, and their intersection is the position, so 2D parity **corrects** single errors rather than merely detecting them. It also detects all two and three-bit errors, because no pair or triple of flips can leave every row and every column even. Two one-bit answers have combined into a coordinate, which is the same trick Hamming uses more efficiently.

**"What can 2D parity not detect?"**
**Four errors at the corners of a rectangle.** Each affected row contains two flips and each affected column contains two flips, so every check sees an even change and all of them pass. It is the same even-weight blindness as single parity lifted into two dimensions, which is the general lesson: **adding more parity bits of the same kind buys resolution, not a different kind of immunity.**

**"How does the cost compare to Hamming?"**
For 16 data bits, 2D parity needs 9 check bits and Hamming needs 5, both correcting one error. The scaling is what matters: 2D costs `2k + 1` bits for `k^2` data, so `O(sqrt n)`, while Hamming is `O(log n)`. At 64 bits that is 17 against 8, which is why memory controllers use Hamming SECDED.

**"Then is 2D parity simply worse?"**
Not entirely, and this is worth saying. On a multi-bit error 2D usually reports "detected, cannot locate", whereas a bare Hamming code produces a non-zero syndrome, concludes a single error, and **actively corrupts a third innocent bit.** Resolution and humility are separate properties, and SECDED exists to buy back the humility that plain Hamming lacks.

**"Where is single parity still used?"**
On **UART** serial links, as an optional per-character bit inherited from teletype practice, and inside hardware as a cheap sanity check on internal buses and register files where the real protection sits elsewhere. **Parity RAM**, one bit per byte, could report a fault but not repair it, and was displaced by **ECC** for the reason this page demonstrates: halting on detected corruption beats proceeding, and repairing it beats halting.

**The common wrong answer** is setting the parity bit to 1 by miscounting the ones, which is worth double-checking since the arithmetic is the easy part. Next is saying a two-bit error "may go undetected" or "usually goes undetected", when it is always undetected and the reason is a one-line modular argument. Third is claiming 2D parity only detects single errors, when it locates and corrects them. And last is presenting 2D parity as a general fix, when the rectangle of four corners is undetectable and the blindness is the same one in a different shape.

---

### Say this in the interview

*"The data 1001101 has four ones, which is already even, so under even parity the bit has to contribute nothing and it is zero. Equivalently it is the XOR of the data bits, which is their sum modulo two. Transmitted block is 10011010, with four ones. Verification is that the receiver sums all eight bits modulo two and requires zero.*

*The framing I would lead with is that one check bit answers exactly one yes-or-no question, so it sorts every possible corrupted version of the block into exactly two buckets: odd count and even count. That is all the resolution one bit can buy, and both the strength and the blind spot follow from it.*

*For the two-bit case, the check is a sum modulo two, so an error of weight w changes it by w mod two. For w equals two that is zero, so the sum is provably unchanged. I would stress the word provably: a two-bit error is not usually missed or often missed, it is always missed, and so is every four-bit and six-bit error. The complete rule is that an error is detected if and only if its weight is odd. Concretely, 10011010 with bits three and four flipped becomes 10101010, which still has four ones, so it is accepted and it is wrong.*

*Counting it out over the eight-bit block, there are two hundred and fifty-five non-zero error patterns, of which two to the seventh, so a hundred and twenty-eight, have odd weight and are all caught, and a hundred and twenty-seven have even weight and are all missed. So parity covers exactly half the error space, and which half is fixed in advance rather than left to chance. It does not detect most errors; it detects precisely the odd-weight half.*

*And one bit can never tell you where the error is, which is a separate point worth making. A one-bit syndrome has two states, consistent or not. To locate one of n positions you need to distinguish n plus one outcomes, the positions plus nothing-wrong, which needs at least log base two of n plus one check bits. Detection and location are different purchases, and that bound is exactly what the Hamming code meets.*

*Two-dimensional parity gets location by asking more questions of the same kind. Arrange the data in a grid, put a parity bit on every row and every column. Now a single-bit error breaks exactly one row check and exactly one column check, and their intersection is the position, so 2D parity corrects single errors rather than just detecting them. It also detects all two-bit and three-bit errors, because no pair or triple of flips can leave every row and every column even.*

*But it has a specific hole, and I would draw it: four errors at the corners of a rectangle. Each affected row contains two flips and each affected column contains two flips, so every single check sees an even change and every one of them passes. Undetected. That is the same even-weight blindness as single parity, lifted into two dimensions, and the general lesson is that adding more parity bits of the same kind buys resolution, not a different kind of immunity.*

*On cost, for sixteen data bits 2D parity needs nine check bits and Hamming needs five, both correcting one error, and the scaling is what really separates them: 2D is order root n, Hamming is order log n, so at sixty-four bits it is seventeen against eight, which is why memory controllers use Hamming SECDED. Though I would not call 2D simply worse, because it has one honest advantage: on a multi-bit error it usually says detected but not locatable, whereas a bare Hamming code gets a non-zero syndrome, concludes a single error, and corrupts a third innocent bit. Resolution and humility are different properties, and SECDED exists to buy the humility back.*

*Two small details if there is room. Even versus odd parity makes no difference to detection strength, but under even parity an all-zeros block is valid, so a line stuck at zero looks like real data, which is a genuine argument for odd parity on a physical serial link. And single parity is still around: as the optional per-character bit on a UART, inherited from teletype practice, and inside hardware as a cheap check on internal buses. Parity RAM, one bit per byte, could report a fault but not repair it, and ECC displaced it for exactly the reason this problem demonstrates."*
