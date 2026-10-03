---
id: 5-hamming-code
title: "Hamming Code: Error Detection & Correction"
description: "Calculate required parity bits with 2^r >= m + r + 1, encode (7, 4) Hamming code, decode error syndromes, analyze SECDED ECC RAM, and implement in Python."
sidebar_position: 5
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "A sender wants to transmit the 4-bit data `1011` using Hamming code. Determine the parity bits needed, compute their values, walk through how the receiver identifies a single-bit error, and explain how enterprise ECC RAM uses SECDED to prevent miscorrection on 2-bit flips."

---

Hamming codes, invented by Richard Hamming in 1950, are linear error-correcting codes capable of detecting up to two simultaneous bit errors or correcting a single-bit error without retransmission. They form the foundational architecture of server ECC (Error-Correcting Code) DRAM, RAID 2, and satellite communication telemetry.

---

### 1. Parity Bit Calculation: The Hamming Bound

To protect $m$ data bits, we insert $r$ redundant parity bits, resulting in an encoded codeword of length $n = m + r$.

Each of the $n$ bit positions can experience a single-bit flip, yielding $n$ distinct single-error states. In addition, we must represent the state of **zero errors**. Therefore, $r$ parity bits must produce at least $n + 1$ unique binary states:

$$2^r \ge m + r + 1$$

Given $m = 4$ data bits:
- Try $r = 2$: $2^2 = 4 \ge 4 + 2 + 1 = 7$ (False)
- Try $r = 3$: $2^3 = 8 \ge 4 + 3 + 1 = 8$ (True: **exact match!**)

We require **$r = 3$ parity bits**, resulting in a **Hamming $(7, 4)$** block code of length $n = 7$. Because $2^3 = 8 = 7 + 1$, the $(7, 4)$ code is a **perfect code**: every single vector in the 7-dimensional space is either a valid codeword or within Hamming distance 1 of exactly one valid codeword.

---

### 2. Codeword Structure & Parity Bit Mapping

Parity bits are positioned at powers of 2 (indices $1, 2, 4, 8, \dots, 2^k$) because their binary indices contain exactly one set bit (`001`, `010`, `100`). The remaining positions are filled by data bits:

| Bit Position | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Binary Index** | 001 | 010 | 011 | 100 | 101 | 110 | 111 |
| **Bit Type** | P1 | P2 | D1 | P4 | D2 | D3 | D4 |
| **Bit Value** | P1 | P2 | 1 | P4 | 0 | 1 | 1 |

#### Coverage Logic via Bitmasks:
A parity bit $P_k$ (at index $2^k$) covers every position whose binary representation has a `1` at the $(k+1)$-th bit from the right:
- **$P_1$ (Index 1 = `001_2`):** Checks all positions with bit 0 set $\implies$ **Positions 1, 3, 5, 7**
- **$P_2$ (Index 2 = `010_2`):** Checks all positions with bit 1 set $\implies$ **Positions 2, 3, 6, 7**
- **$P_4$ (Index 4 = `100_2`):** Checks all positions with bit 2 set $\implies$ **Positions 4, 5, 6, 7**

#### Parity Calculation (Even Parity):
For even parity, the sum (modulo 2) of all covered bits must equal 0:
- **$P_1 \oplus D_1 \oplus D_2 \oplus D_4 = 0 \implies P_1 = 1 \oplus 0 \oplus 1 = \mathbf{0}$**
- **$P_2 \oplus D_1 \oplus D_3 \oplus D_4 = 0 \implies P_2 = 1 \oplus 1 \oplus 1 = \mathbf{1}$**
- **$P_4 \oplus D_2 \oplus D_3 \oplus D_4 = 0 \implies P_4 = 0 \oplus 1 \oplus 1 = \mathbf{0}$**

Substituting parity bits into their positions gives the transmitted 7-bit codeword:
$$\mathbf{T = 0110011}$$

```text
Position:   1   2   3   4   5   6   7
Bit:        0   1   1   0   0   1   1
            ^   ^   |   ^   |   |   |
           P1  P2  D1  P4  D2  D3  D4
```

---

### 3. Receiver Syndrome Decoding

Suppose bit position 6 flips during transmission ($1 \to 0$):
$$\text{Received Codeword } R = \mathbf{0110001} \quad (\text{Bit 6 corrupted})$$

The receiver evaluates the parity checks across the received bits $b_1 b_2 b_3 b_4 b_5 b_6 b_7$:
- **Syndrome Bit $S_1$ (Checks 1, 3, 5, 7):**
  $$S_1 = b_1 \oplus b_3 \oplus b_5 \oplus b_7 = 0 \oplus 1 \oplus 0 \oplus 1 = 0 \quad (\text{Pass})$$
- **Syndrome Bit $S_2$ (Checks 2, 3, 6, 7):**
  $$S_2 = b_2 \oplus b_3 \oplus b_6 \oplus b_7 = 1 \oplus 1 \oplus 0 \oplus 1 = 1 \quad (\text{Fail})$$
- **Syndrome Bit $S_3$ (Checks 4, 5, 6, 7):**
  $$S_3 = b_4 \oplus b_5 \oplus b_6 \oplus b_7 = 0 \oplus 0 \oplus 0 \oplus 1 = 1 \quad (\text{Fail})$$

The syndrome vector $S = (S_3 S_2 S_1)_2$ directly encodes the 1-based decimal index of the faulty bit:
$$S = (110)_2 = 1 \cdot 2^2 + 1 \cdot 2^1 + 0 \cdot 2^0 = \mathbf{6_{10}}$$

The receiver instantly pinpoints **position 6** as corrupted, inverts bit 6 ($0 \to 1$), restores the original word `0110011`, and extracts data bits $(D_1, D_2, D_3, D_4) = \mathbf{1011}$.

---

### 4. Hamming Distance Theorems & The 2-Bit Miscorrection Trap

Let $d_{\text{min}}$ be the minimum Hamming distance between any two valid codewords in a code:

1. **Error Detection Capability ($d$):**
   $$d_{\text{min}} \ge d + 1 \implies d = d_{\text{min}} - 1$$
2. **Error Correction Capability ($t$):**
   $$d_{\text{min}} \ge 2t + 1 \implies t = \left\lfloor \frac{d_{\text{min}} - 1}{2} \right\rfloor$$

For standard Hamming $(7, 4)$, $d_{\text{min}} = 3$:
- It can correct $t = \lfloor (3 - 1) / 2 \rfloor = \mathbf{1}$ single-bit error.
- If **two bits flip simultaneously**, the corrupted vector is now at distance 1 from a *different valid codeword*. The receiver calculates a valid, non-zero syndrome pointing to a third, uncorrupted bit, flips it, and **silently corrupts the data**!

```text
Valid Codeword A --------- (dist = 1) --------> Single Bit Flip (Corrected to A)
      |
      +------------------- (dist = 2) --------> 2-Bit Flip (Mistakenly corrected to B!)
      |
Valid Codeword B <-------- (dist = 1) ---------+
```

---

### 5. SECDED: Hamming (8, 4) in Enterprise ECC DRAM

To eliminate the 2-bit miscorrection trap, enterprise server ECC memory implements **SECDED (Single Error Correction, Double Error Detection)** by appending an overall parity bit $P_0$ (covering all bits $1$ through $7$). This increases the minimum distance from $d_{\text{min}} = 3$ to **$d_{\text{min}} = 4$**.

Let $S = (S_3, S_2, S_1)$ be the Hamming syndrome, and let $P_{\text{overall}} = \bigoplus_{i=1}^{8} b_i$ be the overall parity:

| Syndrome S | Overall Parity Check | Diagnosis | Action Taken |
| :--- | :--- | :--- | :--- |
| S = 0 | Even (Valid, 0) | No error | Accept data as clean |
| S != 0 | Odd (Invalid, 1) | Single-bit error | Flip bit at position S (Corrected) |
| S != 0 | Even (Valid, 0) | Double-bit error | Do NOT correct! Raise Uncorrectable MCE (Kernel Panic) |
| S = 0 | Odd (Invalid, 1) | Parity bit P0 corrupted | Ignore, data bits are intact |

By checking overall parity, the hardware instantly distinguishes between a single correctable bit flip and a dangerous two-bit flip that would otherwise trigger silent data corruption.

---

### 6. Runnable Python Implementation

This standalone script encodes data using $(7, 4)$ Hamming Code, demonstrates syndrome correction, and simulates ECC RAM SECDED $(8, 4)$ behavior.

```python
"""
Hamming Code (7, 4) and SECDED (8, 4) Simulator
Demonstrates bit encoding, syndrome error localization, single-bit correction,
and double-bit error detection.
"""


def encode_hamming_7_4(data: list[int]) -> list[int]:
    """Encodes 4 data bits into a 7-bit Hamming codeword."""
    assert len(data) == 4, "Data must be exactly 4 bits"
    d1, d2, d3, d4 = data

    # Parity calculations (Even Parity)
    p1 = d1 ^ d2 ^ d4
    p2 = d1 ^ d3 ^ d4
    p4 = d2 ^ d3 ^ d4

    # Codeword layout: [P1, P2, D1, P4, D2, D3, D4]
    return [p1, p2, d1, p4, d2, d3, d4]


def decode_hamming_7_4(codeword: list[int]) -> tuple[list[int], int]:
    """
    Decodes a 7-bit Hamming codeword.
    Returns: (corrected_data_bits, error_position)
    """
    b = [0] + codeword  # 1-indexed helper

    s1 = b[1] ^ b[3] ^ b[5] ^ b[7]
    s2 = b[2] ^ b[3] ^ b[6] ^ b[7]
    s4 = b[4] ^ b[5] ^ b[6] ^ b[7]

    syndrome = (s4 << 2) | (s2 << 1) | s1

    corrected = list(codeword)
    if syndrome != 0:
        # Flip the faulty bit (1-indexed to 0-indexed)
        corrected[syndrome - 1] ^= 1

    extracted_data = [corrected[2], corrected[4], corrected[5], corrected[6]]
    return extracted_data, syndrome


def encode_secded_8_4(data: list[int]) -> list[int]:
    """Encodes 4 data bits into an 8-bit SECDED codeword."""
    h7 = encode_hamming_7_4(data)
    # Overall parity bit across all 7 bits
    p0 = 0
    for bit in h7:
        p0 ^= bit
    return h7 + [p0]


def decode_secded_8_4(codeword: list[int]) -> str:
    """Evaluates 8-bit SECDED codeword for SEC and DED."""
    h7 = codeword[:7]
    p0 = codeword[7]

    # Calculate overall parity across all 8 bits
    overall_parity = 0
    for bit in codeword:
        overall_parity ^= bit

    # Calculate 7-bit syndrome
    b = [0] + h7
    s1 = b[1] ^ b[3] ^ b[5] ^ b[7]
    s2 = b[2] ^ b[3] ^ b[6] ^ b[7]
    s4 = b[4] ^ b[5] ^ b[6] ^ b[7]
    syndrome = (s4 << 2) | (s2 << 1) | s1

    if syndrome == 0 and overall_parity == 0:
        return "NO_ERROR: Clean transmission."
    elif syndrome != 0 and overall_parity == 1:
        return f"SINGLE_ERROR_CORRECTED: Bit {syndrome} corrected."
    elif syndrome != 0 and overall_parity == 0:
        return "DOUBLE_ERROR_DETECTED: Uncorrectable 2-bit error! Abort."
    else:
        return "PARITY_BIT_ERROR: Error in overall parity bit P0 only."


if __name__ == "__main__":
    data_in = [1, 0, 1, 1]
    print(f"Original Data: {data_in}")

    # 1. Hamming (7, 4) Encoding
    cw = encode_hamming_7_4(data_in)
    print(f"Encoded (7, 4) Codeword: {cw}")
    assert cw == [0, 1, 1, 0, 0, 1, 1]

    # 2. Simulate Single-Bit Error at Position 6
    corrupted_cw = list(cw)
    corrupted_cw[5] ^= 1  # 0-indexed position 5 is bit position 6
    print(f"Corrupted Codeword (Bit 6 flipped): {corrupted_cw}")

    # 3. Decode & Correct
    recovered_data, faulty_pos = decode_hamming_7_4(corrupted_cw)
    print(f"Identified Error Position: {faulty_pos}")
    print(f"Recovered Data:            {recovered_data}")
    assert faulty_pos == 6
    assert recovered_data == data_in

    # 4. SECDED ECC Demonstration
    print("\n--- SECDED (8, 4) ECC Memory Demonstration ---")
    secded_cw = encode_secded_8_4(data_in)
    print(f"SECDED Codeword: {secded_cw}")

    # Single bit error
    single_err = list(secded_cw)
    single_err[2] ^= 1
    print(f"1-Bit Error Test: {decode_secded_8_4(single_err)}")

    # Double bit error
    double_err = list(secded_cw)
    double_err[2] ^= 1
    double_err[5] ^= 1
    print(f"2-Bit Error Test: {decode_secded_8_4(double_err)}")
```

---

### 7. Concise Staff-Level Interview Answer

> "To protect the 4-bit data `1011`, we apply the Hamming bound $2^r \ge m + r + 1$. For $m = 4$, $r = 3$ satisfies $2^3 \ge 4 + 3 + 1 = 8$, forming a $(7, 4)$ code.
>
> We place parity bits at power-of-two indices ($1, 2, 4$) and data bits in the remaining slots ($3, 5, 6, 7$). Using even parity, $P_1$ covers indices with bit 0 set ($1, 3, 5, 7 \implies P_1 = 0$), $P_2$ covers bit 1 set ($2, 3, 6, 7 \implies P_2 = 1$), and $P_4$ covers bit 2 set ($4, 5, 6, 7 \implies P_4 = 0$), yielding the codeword `0110011`.
>
> At the receiver, each parity group is rechecked. If bit 6 flips (`0110001`), checks $P_2$ and $P_4$ fail while $P_1$ passes. Reading the checks in reverse order gives the binary syndrome $(110)_2 = 6_{10}$, directly indexing the flipped bit for immediate correction.
>
> Crucially, standard $(7, 4)$ has a minimum distance $d_{\text{min}} = 3$. If two bits flip, the syndrome erroneously points to an innocent third bit, causing silent data corruption. Enterprise ECC memory solves this with SECDED ($8, 4$) by appending an overall parity bit $P_0$. When the syndrome is non-zero and overall parity is odd, it is a single-bit error that can be safely corrected; when the syndrome is non-zero and overall parity is even, it flags an uncorrectable double-bit error and halts execution."
