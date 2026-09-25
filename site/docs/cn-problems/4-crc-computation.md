---
id: 4-crc-computation
title: "CRC: Cyclic Redundancy Check Computation"
description: "Calculate CRC redundant bits, perform modulo-2 XOR binary polynomial division step-by-step, explore mathematical detection guarantees, and implement in Python."
sidebar_position: 4
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "A sender wants to transmit the data bits `1101011011` using CRC with the generator polynomial $x^4 + x + 1$. Determine the redundant bits, perform the binary division to compute the CRC remainder, and explain receiver validation."

---

Cyclic Redundancy Check (CRC) is an error-detecting code based on polynomial division in Galois Field GF(2) arithmetic. CRC is ubiquitously implemented in hardware across Ethernet (IEEE 802.3), Wi-Fi (802.11), SATA, USB, and storage formats (gzip, PNG).

In technical interviews, CRC questions evaluate two things: whether you can accurately execute binary modulo-2 (XOR) long division without arithmetic errors, and whether you understand the mathematical properties that make CRC vastly superior to additive checksums.

---

### 1. Mathematical Foundation: Polynomials in GF(2)

In modulo-2 arithmetic, coefficients exist exclusively in $\{0, 1\}$. 
- **Addition and Subtraction are Identical:** Both operations are equivalent to bitwise **XOR** ($\oplus$).
  ```text
  0 ⊕ 0 = 0
  0 ⊕ 1 = 1
  1 ⊕ 0 = 1
  1 ⊕ 1 = 0  (No carry, no borrow!)
  ```
- **Polynomial Representation:**
  A bit sequence $b_k b_{k-1} \dots b_1 b_0$ represents the polynomial:
  $$P(x) = \sum_{i=0}^{k} b_i x^i$$
  For generator polynomial $G(x) = x^4 + x + 1$:
  - $1 \cdot x^4 + 0 \cdot x^3 + 0 \cdot x^2 + 1 \cdot x^1 + 1 \cdot x^0 \implies \mathbf{10011_2}$
  - The degree of $G(x)$ is $r = 4$.
  - The divisor bit length is $r + 1 = 5$ bits.

#### How Many Redundant Bits to Append?
The remainder of polynomial division by a degree-$r$ divisor has a maximum degree of $r - 1$. Therefore:
- Generator degree $r = 4 \implies$ Append exactly **$r = 4$ zero bits** to the data.
- Given data bits $D = 1101011011$ (10 bits), the padded dividend becomes:
  $$D \cdot 2^r = 1101011011\mathbf{0000} \quad \text{(14 bits)}$$

---

### 2. Complete Step-by-Step XOR Long Division

We divide the 14-bit padded dividend `11010110110000` by the 5-bit divisor `10011`. 

In modulo-2 division:
1. Align the 5-bit divisor beneath the current 5-bit segment starting with a leading `1`.
2. Perform bitwise XOR.
3. Bring down subsequent bits until the next segment has 5 bits and starts with `1`. (Each bit brought down without an XOR adds a `0` to the quotient).

```text
Divisor: 10011 ) Dividend: 11010110110000 ( Quotient: 1100001010
                 ^ 10011
                 -------
                   10011   <-- [Step 1] Remainder 1001, bring down '1'
                 ^ 10011
                 -------
                   00000   <-- [Step 2] Remainder 0000, bring down '1011'
                               (Bring down next 4 data bits: 1, 0, 1, 1)
                               Segment is now 001011 -> leading 1 is at pos 5
                               Bring down '0' from padding -> segment: 10110
                   10110   <-- [Step 3] 5 bits with leading 1
                 ^ 10011
                 -------
                   00101   <-- Remainder 101, bring down next 2 padded '00'
                   10100   <-- [Step 4] Segment: 10100
                 ^ 10011
                 -------
                   00111   <-- Remainder 111, bring down last padded '0'
                    1110   <-- [Final Remainder] 4 bits remaining!
```

#### Detailed Step Tracing:
1. **First 5 bits:** `11010` $\oplus$ `10011` = `01001`. Drop leading zero $\implies$ `1001`.
2. **Bring down 6th bit (`1`):** Window is `10011`. 
   `10011` $\oplus$ `10011` = `00000`.
3. **Bring down bits until leading `1` forms 5 bits:**
   - Bring down 7th bit (`0`): `0`
   - Bring down 8th bit (`1`): `01`
   - Bring down 9th bit (`1`): `011`
   - Bring down 10th bit (`0` from padding): `0110` (only 4 bits)
   - Bring down 11th bit (`0` from padding): Window is now `10110` (5 bits, starts with `1`).
4. **XOR:** `10110` $\oplus$ `10011` = `00101`. Drop leading zeros $\implies$ `101`.
5. **Bring down 12th bit (`0` from padding):** `1010` (4 bits).
6. **Bring down 13th bit (`0` from padding):** Window is now `10100`.
7. **XOR:** `10100` $\oplus$ `10011` = `00111`. Drop leading zeros $\implies$ `111`.
8. **Bring down 14th bit (`0` from padding):** Remainder is `1110`. No more bits left in dividend.

The final CRC remainder $R = \mathbf{1110}$.

#### Final Transmitted Codeword:
Replace the 4 appended zeros with the 4-bit CRC remainder:
$$\text{Codeword } T = \text{Data} \parallel \text{CRC} = \mathbf{11010110111110}$$

---

### 3. Receiver Verification Mechanism

Let the transmitted codeword be $T(x) = D(x) \cdot x^r + R(x)$.

By definition of division:
$$D(x) \cdot x^r = Q(x) \cdot G(x) + R(x)$$

Adding $R(x)$ in GF(2) (where addition is XOR and $-R(x) = +R(x)$):
$$T(x) = D(x) \cdot x^r + R(x) = Q(x) \cdot G(x)$$

This proves that **$T(x)$ is an exact multiple of the generator $G(x)$**.

When the receiver divides the entire received frame $T'(x)$ by $G(x)$:
- If no bit errors occurred ($T'(x) = T(x)$):
  $$\frac{T(x)}{G(x)} \implies \text{Remainder } = \mathbf{0000}$$
- If channel noise injected an error pattern $E(x)$, then $T'(x) = T(x) \oplus E(x)$:
  $$\frac{T'(x)}{G(x)} = \frac{T(x) \oplus E(x)}{G(x)} = \frac{Q(x) \cdot G(x) \oplus E(x)}{G(x)} \implies \text{Remainder } = \frac{E(x)}{G(x)}$$

An error goes **undetected if and only if $E(x)$ is perfectly divisible by $G(x)$**.

---

### 4. Mathematical Error Detection Guarantees

A carefully engineered generator polynomial $G(x)$ provides guaranteed detection boundaries:

1. **Single-Bit Errors ($E(x) = x^i$):**
   $x^i$ is only divisible by polynomials of the form $x^k$. If $G(x)$ contains at least two non-zero terms (specifically including the constant term $x^0 = 1$), $G(x)$ can never divide $x^i$.
   - **Guarantee:** 100% of single-bit errors are detected.

2. **Double-Bit Errors ($E(x) = x^i + x^j = x^j(x^{i-j} + 1)$ with $i > j$):**
   Since $G(x)$ does not divide $x^j$, an undetected error requires $G(x)$ to divide $(x^{i-j} + 1)$. By choosing $G(x)$ such that it does not divide $x^k + 1$ for any $k$ up to the maximum frame length, double-bit errors are detected.
   - **Guarantee:** 100% of double-bit errors within frame length limits.

3. **Odd Number of Inverted Bits:**
   If $(x + 1)$ is a factor of $G(x)$, then any polynomial with an odd number of terms is mathematically indivisible by $(x + 1)$.
   - **Guarantee:** 100% of odd-numbered bit flips are detected.

4. **Burst Errors (a contiguous sequence of inverted bits of length $L$):**
   - **$L \le r$ (burst length $\le$ CRC degree):** Guaranteed **100% detection**.
   - **$L = r + 1$:** Undetected probability is $\frac{1}{2^{r-1}}$ (e.g., $1 - 2^{-31} \approx 99.99999995\%$ detected for CRC-32).
   - **$L > r + 1$:** Undetected probability is $\frac{1}{2^r}$ (random chance of matching the remainder).

---

### 5. Industry Standard Polynomials

| Standard | Degree | Divisor Polynomial | Hex Representation | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| CRC-8-ATM | 8 | x^8 + x^2 + x + 1 | 0x07 | ATM header error control, SMBus |
| CRC-16-CCITT | 16 | x^16 + x^12 + x^5 + 1 | 0x1021 | X.25, HDLC, Bluetooth, SD cards |
| CRC-32 (IEEE 802.3) | 32 | x^32 + x^26 + x^23 + ... + 1 | 0x04C11DB7 | Ethernet, Wi-Fi 802.11, gzip, PNG, SATA |
| CRC-64-ECMA | 64 | x^64 + x^4 + x^3 + x + 1 | 0x42F0E1EBA9EA3693 | ZFS filesystem, ISO 9660, Redis |

---

### 6. Runnable Python Implementation

This production-grade script simulates bitwise modulo-2 division, computes the CRC, verifies reception, and demonstrates burst error detection.

```python
"""
CRC Simulator in Python
Demonstrates bitwise Modulo-2 division, codeword transmission,
channel corruption, and receiver-side validation.
"""


def xor_operation(a: str, b: str) -> str:
    """Performs bitwise XOR between two equal-length binary strings."""
    return "".join("0" if bit_a == bit_b else "1" for bit_a, bit_b in zip(a, b))


def modulo2_divide(dividend: str, divisor: str) -> tuple[str, str]:
    """
    Performs modulo-2 binary long division.
    Returns: (quotient, remainder)
    """
    divisor_len = len(divisor)
    current_window = list(dividend[:divisor_len])
    quotient = []
    
    for i in range(divisor_len, len(dividend) + 1):
        if current_window[0] == "1":
            quotient.append("1")
            # XOR current window with divisor
            xor_result = xor_operation("".join(current_window), divisor)
            current_window = list(xor_result[1:])
        else:
            quotient.append("0")
            # XOR with all zeros (equivalent to shifting)
            current_window = current_window[1:]
        
        # Bring down the next bit if available
        if i < len(dividend):
            current_window.append(dividend[i])
            
    remainder = "".join(current_window)
    return "".join(quotient), remainder


def compute_crc(data: str, generator: str) -> str:
    """Appends degree zeros to data and computes the CRC remainder."""
    degree = len(generator) - 1
    padded_data = data + ("0" * degree)
    _, remainder = modulo2_divide(padded_data, generator)
    return remainder


def verify_codeword(codeword: str, generator: str) -> bool:
    """Returns True if the received codeword has a remainder of zero."""
    degree = len(generator) - 1
    expected_zero = "0" * degree
    _, remainder = modulo2_divide(codeword, generator)
    return remainder == expected_zero


# Verification against interview problem
if __name__ == "__main__":
    data = "1101011011"
    generator = "10011"  # x^4 + x + 1
    degree = len(generator) - 1

    print(f"Data:      {data}")
    print(f"Generator: {generator} (Degree: {degree})")

    # 1. Sender Computes CRC
    crc = compute_crc(data, generator)
    codeword = data + crc
    print(f"CRC Remainder:        {crc}")
    print(f"Transmitted Codeword: {codeword}")
    assert crc == "1110", f"Expected 1110, got {crc}"

    # 2. Receiver Validates Clean Frame
    is_clean_valid = verify_codeword(codeword, generator)
    print(f"Clean Frame Verification: {'PASSED (Zero Remainder)' if is_clean_valid else 'FAILED'}")
    assert is_clean_valid is True

    # 3. Simulate Single-Bit Transmission Error (flip bit 4)
    corrupted_list = list(codeword)
    corrupted_list[4] = "0" if corrupted_list[4] == "1" else "1"
    corrupted_frame = "".join(corrupted_list)
    is_corrupted_valid = verify_codeword(corrupted_frame, generator)
    print(f"Corrupted Frame (Bit 4 flipped): {corrupted_frame}")
    print(f"Corrupted Frame Detection:       {'DETECTED ERROR' if not is_corrupted_valid else 'MISSED'}")
    assert is_corrupted_valid is False

    # 4. Simulate Burst Error of length <= degree (e.g., 3 consecutive bits flipped)
    burst_list = list(codeword)
    burst_list[7] = "0" if burst_list[7] == "1" else "1"
    burst_list[8] = "0" if burst_list[8] == "1" else "1"
    burst_list[9] = "0" if burst_list[9] == "1" else "1"
    burst_frame = "".join(burst_list)
    is_burst_valid = verify_codeword(burst_frame, generator)
    print(f"Burst Error (Bits 7,8,9 flipped): {burst_frame}")
    print(f"Burst Error Detection:            {'DETECTED ERROR' if not is_burst_valid else 'MISSED'}")
    assert is_burst_valid is False
```

---

### 7. Concise Staff-Level Interview Answer

> "To compute the CRC for data `1101011011` with polynomial $x^4 + x + 1$, we represent the generator as binary `10011`. Since the polynomial degree is $r = 4$, we append 4 zeros to the data, producing the 14-bit dividend `11010110110000`.
>
> We then execute binary modulo-2 long division using bitwise XOR without carries or borrows. Shifting through the dividend and XORing whenever the leading bit of the 5-bit window is 1 yields a final 4-bit remainder of `1110`. Replacing the padded zeros gives the transmitted codeword `11010110111110`.
>
> At the receiver, the entire frame is divided by `10011`. Because modulo-2 subtraction equals addition, appending the remainder guarantees the codeword is an exact multiple of the generator; thus, an uncorrupted frame yields a remainder of `0000`. If channel noise introduces an error polynomial $E(x)$, the remainder equals $E(x) \bmod G(x)$. CRC guarantees 100% detection of all single-bit errors, all double-bit errors within frame boundaries, all odd-numbered bit flips when $(x+1)$ divides $G(x)$, and all burst errors of length up to the degree $r$."
