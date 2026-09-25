---
id: 3-internet-checksum
title: "Internet Checksum: 1's Complement, End-Around Carry & Vulnerabilities"
description: "Step-by-step computation of the Internet checksum with end-around carry, receiver-side verification, compensating bit flip exploits, and CRC-32 comparisons."
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A sender transmits two 8-bit data words using the Internet Checksum method: `10101001` and `11001010`. Compute the checksum with end-around carry, demonstrate receiver-side verification, explain why compensating bit flips evade detection, and contrast with CRC-32."

---

### 1. Executive Summary & RFC 1071 Context

The **Internet Checksum** (defined in **RFC 1071**) is an error-detection code utilized across the core TCP/IP protocol suite (IPv4 header checksum, TCP checksum, and UDP checksum).

```
   ┌─────────────────────────────────────────────────────────────┐
   │                   Internet Checksum Core Intent             │
   ├─────────────────────────────────────────────────────────────┤
   │ Designed for Software Processing Speed:                     │
   │ Built around simple 16-bit integer addition directly        │
   │ executed by standard CPU Arithmetic Logic Units (ALUs).     │
   │ Trades mathematical error resilience for wire-speed routing.│
   └─────────────────────────────────────────────────────────────┘
```

#### One's Complement Arithmetic:
In standard Two's complement systems, arithmetic addition discards the overflow carry bit. In **One's complement arithmetic**, any carry-out bit generated beyond the word size must be **wrapped around and added to the least significant bit (LSB)**. This is known as the **End-Around Carry**.

---

### 2. Step-by-Step Checksum Computation (Sender Side)

#### Input Data Words (8-bit demonstration):
- **Word 1:** `1010 1001` (169 in decimal)
- **Word 2:** `1100 1010` (202 in decimal)

#### Step 1: Raw Binary Addition
Add Word 1 and Word 2 using standard binary addition:

```text
       1  1            (Carries)
       1 0 1 0 1 0 0 1  (Word 1 = 169)
    +  1 1 0 0 1 0 1 0  (Word 2 = 202)
    ------------------
     1 0 1 1 1 0 0 1 1  (Sum = 371 decimal, 9 bits wide!)
     ▲
     └── Carry-out bit generated!
```

#### Step 2: The End-Around Carry
Because our word size is 8 bits, the 9th bit represents an overflow carry. In 1's complement arithmetic, we strip this bit and add it back to the least significant bit:

```text
       0 1 1 1 0 0 1 1  (Lower 8 bits)
    +                1  (Wrapped carry-out bit)
    ------------------
       0 1 1 1 0 1 0 0  (= 116 in decimal)
```

#### Step 3: Take the One's Complement (Bitwise Inversion)
The checksum is the bitwise NOT (inversion) of the accumulated sum:

```text
Sum:            0 1 1 1 0 1 0 0
Checksum (~Sum): 1 0 0 0 1 0 1 1  (= 139 in decimal, 0x8B)
```

$$\mathbf{\text{Calculated Checksum: } 10001011_2 \quad (\text{0x8B})}$$

The sender appends this checksum word and transmits all three 8-bit words across the wire: `[Word 1, Word 2, Checksum]`.

---

### 3. Receiver-Side Verification Protocol

The beauty of the 1's complement checksum lies in its receiver-side simplicity. The receiver does not need to subtract or recalculate from scratch—it simply **sums all received data words PLUS the checksum word**.

```text
       0 1 1 1 0 1 0 0  (Sum of Word 1 and Word 2 after carry wrap)
    +  1 0 0 0 1 0 1 1  (Received Checksum Word)
    ------------------
       1 1 1 1 1 1 1 1  (All 1s in binary)
```

#### The Zero Check:
The receiver takes the 1's complement of this final sum:

$$\sim(11111111_2) = \mathbf{00000000_2} \quad (\text{All Zeros})$$

- **Validation Rule:**
  - If the inverted result is **all zeros (`0x00`)**, the packet passes verification and is accepted.
  - If any bit is **1**, bit corruption occurred during transit, and the packet is silently dropped.

---

### 4. Vulnerabilities & Architectural Limitations

While the Internet Checksum is exceptionally fast to compute in software, it is **mathematically weak** compared to polynomial codes like CRC:

```
        Vulnerability 1: Compensating Bit Flips
        Word 1:  ... 0 ...  ──[ Flips to 1 (+1) ]──► ... 1 ...
        Word 2:  ... 1 ...  ──[ Flips to 0 (-1) ]──► ... 0 ...
        ───────────────────────────────────────────────────────
        Column Sum Remains Identical! Checksum Still Passes!
```

1. **Compensating Bit Flips:** If bit position 3 flips from `0` to `1` in Word 1, and bit position 3 simultaneously flips from `1` to `0` in Word 2, the arithmetic column sum does not change. The checksum validates as completely clean, failing to detect corruption.
2. **Byte Order / Permutation Blindness:** Addition is commutative ($A + B = B + A$). If an intervening network switch swaps Word 1 and Word 2, the checksum remains 100% identical.
3. **Zero Insertion Blindness:** Inserting blocks of all zeros (`0x0000`) into the payload does not alter the checksum.

---

### 5. Checksum vs. Cyclic Redundancy Check (CRC-32)

| Dimension | Internet Checksum (RFC 1071) | Cyclic Redundancy Check (CRC-32) |
| :--- | :--- | :--- |
| **Mathematical Basis** | 1's complement integer addition. | Polynomial division in Galois Field GF(2). |
| **Execution Domain** | Software-friendly (executed by CPU ALU). | Hardware-friendly (shift registers and XOR gates). |
| **Position Sensitivity** | **No** (commutative: $A+B = B+A$). | **Yes** (bit position dictates remainder polynomial). |
| **Burst Error Detection** | Weak; misses multi-bit compensating errors. | Catches all single-bit, double-bit, and burst errors $\le 32$ bits. |
| **OS / Protocol Layer** | Network & Transport Layer (IP, TCP, UDP). | Data Link & Physical Layer (Ethernet, Wi-Fi, SATA). |

> **Interview Insight:** *"The Internet Checksum is a lightweight transport/network layer compromise designed in the 1970s so routers could inspect headers without burning CPU cycles. Heavy-duty error detection is delegated to the Data Link Layer, where dedicated NIC hardware computes CRC-32 in real time."*

---

### 6. Python Verification Script

The following standalone script implements 1's complement checksum computation with end-around carry, tests receiver verification, and demonstrates the compensating bit-flip exploit:

```python
"""
Internet Checksum (RFC 1071) Verification Test Suite
Demonstrates:
  1. Checksum calculation with end-around carry
  2. Receiver verification protocol
  3. Compensating bit flip vulnerability proof
"""
from typing import List


def compute_ones_complement_sum(words: List[int], bit_width: int = 8) -> int:
    mask = (1 << bit_width) - 1
    total = 0

    for word in words:
        total += word
        # Handle end-around carry
        while total >> bit_width:
            carry = total >> bit_width
            total = (total & mask) + carry

    return total & mask


def generate_checksum(words: List[int], bit_width: int = 8) -> int:
    total_sum = compute_ones_complement_sum(words, bit_width)
    mask = (1 << bit_width) - 1
    # Checksum is bitwise NOT (1's complement) of sum
    return (~total_sum) & mask


def verify_receiver(words: List[int], checksum: int, bit_width: int = 8) -> bool:
    # Receiver sums all words PLUS the checksum
    all_words = words + [checksum]
    total_sum = compute_ones_complement_sum(all_words, bit_width)
    mask = (1 << bit_width) - 1
    # If all bits are 1, ~total_sum is 0
    inverted = (~total_sum) & mask
    return inverted == 0


if __name__ == "__main__":
    print("=" * 65)
    print("INTERNET CHECKSUM (RFC 1071) VERIFICATION TEST SUITE")
    print("=" * 65)

    # Word 1: 10101001 (169), Word 2: 11001010 (202)
    w1 = 0b10101001
    w2 = 0b11001010
    dataset = [w1, w2]

    # 1. Compute Checksum
    chk = generate_checksum(dataset, bit_width=8)
    print(f"Word 1:   0b{w1:08b} ({w1})")
    print(f"Word 2:   0b{w2:08b} ({w2})")
    print(f"Checksum: 0b{chk:08b} ({chk})")
    assert chk == 0b10001011, f"Expected 0b10001011, got 0b{chk:08b}"

    # 2. Verify Valid Transmission
    is_valid = verify_receiver(dataset, chk, bit_width=8)
    print(f"\nReceiver Verification (Clean Data): {is_valid}")
    assert is_valid is True

    # 3. Demonstrate Error Detection (Single Bit Flip in Word 1)
    corrupted_data = [w1 ^ 0b00000001, w2]  # Flip bit 0
    is_corrupt_detected = not verify_receiver(corrupted_data, chk, bit_width=8)
    print(f"Single-bit flip detected as corrupted? {is_corrupt_detected}")
    assert is_corrupt_detected is True

    # 4. Demonstrate Compensating Bit Flip Vulnerability
    # Flip bit 3 in Word 1 (0 -> 1) and bit 3 in Word 2 (1 -> 0)
    w1_exploited = w1 | (1 << 3)   # Set bit 3
    w2_exploited = w2 & ~(1 << 3)  # Clear bit 3
    exploited_data = [w1_exploited, w2_exploited]

    false_pass = verify_receiver(exploited_data, chk, bit_width=8)
    print(f"\n--- Compensating Bit Flip Vulnerability Test ---")
    print(f"Original Word 1: 0b{w1:08b} -> Corrupted: 0b{w1_exploited:08b}")
    print(f"Original Word 2: 0b{w2:08b} -> Corrupted: 0b{w2_exploited:08b}")
    print(f"Checksum Validation Passed Despite Dual Corruption? {false_pass}")
    assert false_pass is True, "Compensating bit flips should evade detection!"

    print("\nSUCCESS: Internet checksum mathematics and exploit verified.")
```
