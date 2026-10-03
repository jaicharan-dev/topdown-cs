---
id: 6-parity-check
title: "Even Parity Check & 2-Bit Error Limitation"
description: "Compute even parity bit, validate received frames, analyze 2-bit blindspots, explore 2D matrix parity (LRC + VRC), and compare error detection schemes in Python."
sidebar_position: 6
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "A sender wants to transmit the data byte `1001101` using a single even parity bit. Determine the parity bit value, validate the received data, explain mathematically why a 2-bit error goes undetected, and describe how Two-Dimensional (2D) Parity solves this limitation."

---

A parity bit is the simplest form of error-detecting code. While computationally negligible (requiring a single XOR tree in hardware), single-dimensional parity provides weak error guarantees over physical channels prone to electromagnetic noise and burst interference.

Understanding why 1D parity fails, and how 2D matrix parity upgrades detection to single-bit correction, is a foundational computer networking interview topic.

---

### 1. Single Even Parity Computation & Verification

In an **even parity** scheme, the sender appends a bit such that the total count of `1`s across the data and the parity bit is an even number.

#### Sender Side:
- **Given Data:** `1001101` (7 bits)
- **Count of Set Bits (`1`s):** There are 4 set bits.
- **Parity Calculation:**
  $$P = b_1 \oplus b_2 \oplus b_3 \oplus b_4 \oplus b_5 \oplus b_6 \oplus b_7$$
  $$P = 1 \oplus 0 \oplus 0 \oplus 1 \oplus 1 \oplus 0 \oplus 1 = 0$$
- Since 4 is already even, the even parity bit is **$P = 0$**.
- **Transmitted Byte:** Data $\parallel$ Parity = **`10011010`** (8 bits).

#### Receiver Side Validation:
The receiver collects all 8 bits and evaluates the parity function:
$$\text{Parity Check} = \left(\sum_{i=1}^{8} b_i\right) \bmod 2 = 4 \bmod 2 = 0$$

Because the modulo-2 sum is zero (even), the frame passes verification.

---

### 2. Mathematical Proof: The 2-Bit Error Blindspot

1D parity evaluates only the **aggregate population count modulo 2**, completely ignoring positional information.

Let the total count of `1`s in the valid transmitted byte be $N_{\text{orig}}$ (which is even). Suppose channel interference flips $k$ bits:

1. **Single-Bit Error ($k = 1$):**
   - A bit changes from $0 \to 1$ ($+1$) or from $1 \to 0$ ($-1$).
   - Net change $\Delta N \in \{+1, -1\}$, which is odd.
   - New count $N' = N_{\text{orig}} \pm 1 \implies N' \bmod 2 = 1 \implies$ **100% Detected**.
   - By induction, **any odd number of bit errors ($k = 1, 3, 5, \dots$) is always detected**.

2. **Double-Bit Error ($k = 2$):**
   When two bits flip simultaneously, exactly three scenarios can occur:
   - **Both bits flip $0 \to 1$:** $\Delta N = +2 \implies N' = N_{\text{orig}} + 2 \implies N' \bmod 2 = 0$.
   - **Both bits flip $1 \to 0$:** $\Delta N = -2 \implies N' = N_{\text{orig}} - 2 \implies N' \bmod 2 = 0$.
   - **One bit flips $0 \to 1$ and one flips $1 \to 0$:** $\Delta N = 0 \implies N' = N_{\text{orig}} \implies N' \bmod 2 = 0$.

In every single case, $\Delta N \equiv 0 \pmod 2$. The total number of `1`s remains even, and the receiver **blindly accepts the corrupted byte as valid**.

---

### 3. Two-Dimensional (2D) Parity: Matrix LRC + VRC

To overcome the 1D limitation without the algebraic complexity of CRC, networks historically used **2D Parity** (also known as Longitudinal Redundancy Check [LRC] combined with Vertical Redundancy Check [VRC]).

Data is organized into a 2D matrix of $M$ rows and $N$ columns. Parity is computed along both dimensions:
- **Row Parity (VRC):** Appended to the right of each row byte.
- **Column Parity (LRC):** Appended as an entire extra byte at the bottom.
- **Corner Bit:** Parity of the parities.

```text
               Col 1  Col 2  Col 3  Col 4  Col 5  Col 6  Col 7 | Row Parity
Row 1:           1      0      0      1      1      0      1   |     1
Row 2:           0      1      1      0      1      0      0   |     1
Row 3:           1      1      0      1      0      1      1   |     1
Row 4:           0      0      1      1      1      1      0   |     0
----------------------------------------------------------------+-----------
Col Parity(LRC): 0      0      0      1      1      0      0   |     1 (Corner)
```

#### How 2D Parity Solves the Blindspot:
1. **Single-Bit Error Correction:**
   If a single bit flips at coordinates $(R_2, C_3)$, Row 2 parity will fail, and Column 3 parity will fail. The intersection of the failing row and failing column **uniquely pinpoints the flipped bit**, allowing the receiver to correct it without retransmission!
2. **Two-Bit Error Detection:**
   - If two bits flip in the same row: The row parity passes, but **two separate column parities fail**.
   - If two bits flip in different rows and different columns: **Two row parities fail and two column parities fail**.
   - In all 2-bit error configurations, 2D parity guarantees **100% detection**.
3. **Three-Bit Error Detection:**
   At least one row or column parity will always register an odd count $\implies$ **100% detection**.
4. **The 4-Bit Geometric Trap:**
   2D parity only fails if an even number of bits flip in a configuration that preserves parity across both dimensions simultaneously, namely **4 bits forming the vertices of a rectangle**.

---

### 4. Comparison of Error Detection & Correction Mechanisms

| Technique | Overhead (Bits) | Detection Capability | Correction Capability | Implementation Complexity | Primary Protocol / Layer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1D Simple Parity | 1 bit per byte (12.5%) | All odd-bit errors. 0% of 2-bit errors. | None (Detection only) | Minimal (single XOR gate tree) | UART serial ports, ASCII transmission |
| 2D Matrix Parity | M + N + 1 bits per block | All 1, 2, and 3-bit errors; bursts up to N | 1-bit error correction via (Row, Col) | Low (Shift registers + XOR counters) | Magnetic tape drives, early telecommunications |
| Internet Checksum | 16 bits per packet | All 1-bit errors, bursts up to 16 bits | None (Packet dropped) | Moderate (1's complement software addition) | IPv4, TCP, UDP (Network/Transport layer) |
| CRC-32 | 32 bits per frame | 100% 1, 2, odd, bursts &le; 32 bits | None (Link layer drops & requests ACK) | Moderate-High (LFSR hardware / SIMD tables) | Ethernet (802.3), Wi-Fi, SATA, gzip |
| Hamming (8, 4) SECDED | 4 bits per 4 bits (50%) | All 1-bit and 2-bit errors | 1-bit error correction (SEC) | Moderate (Matrix syndrome multiplier) | Server ECC DDR4/DDR5 DRAM, CPU caches |

---

### 5. Runnable Python Implementation

This script demonstrates 1D parity generation and verification, simulates the undetected 2-bit error, and showcases 2D matrix parity single-bit error localization and correction.

```python
"""
Parity Schemes Simulator
Demonstrates 1D Parity failure modes and 2D Matrix Parity error correction.
"""


def compute_1d_even_parity(data: str) -> int:
    """Computes single even parity bit for a binary string."""
    ones_count = data.count("1")
    return 0 if ones_count % 2 == 0 else 1


def verify_1d_even_parity(frame: str) -> bool:
    """Returns True if the frame satisfies even parity."""
    return frame.count("1") % 2 == 0


class TwoDimensionalParity:
    """Implements 2D Matrix Parity (LRC + VRC)."""

    def __init__(self, data_matrix: list[str]):
        self.rows = len(data_matrix)
        self.cols = len(data_matrix[0])
        self.matrix = [list(map(int, row)) for row in data_matrix]

    def encode(self) -> tuple[list[int], list[int], int]:
        """Calculates row parities, column parities, and corner parity."""
        row_parities = [sum(row) % 2 for row in self.matrix]
        col_parities = [sum(self.matrix[r][c] for r in range(self.rows)) % 2 for c in range(self.cols)]
        corner = sum(row_parities) % 2
        return row_parities, col_parities, corner

    @staticmethod
    def decode_and_correct(
        matrix: list[list[int]],
        row_parities: list[int],
        col_parities: list[int],
    ) -> tuple[list[list[int]], str]:
        """Validates 2D parity, locates and corrects a single-bit error."""
        failing_rows = []
        for r, row in enumerate(matrix):
            if sum(row) % 2 != row_parities[r]:
                failing_rows.append(r)

        failing_cols = []
        for c in range(len(matrix[0])):
            col_sum = sum(matrix[r][c] for r in range(len(matrix)))
            if col_sum % 2 != col_parities[c]:
                failing_cols.append(c)

        if not failing_rows and not failing_cols:
            return matrix, "CLEAN: No errors detected."

        if len(failing_rows) == 1 and len(failing_cols) == 1:
            err_r, err_c = failing_rows[0], failing_cols[0]
            matrix[err_r][err_c] ^= 1  # Correct bit
            return matrix, f"SINGLE_ERROR_CORRECTED: Flipped bit at ({err_r}, {err_c})."

        return matrix, f"MULTIPLE_ERRORS_DETECTED: Rows {failing_rows}, Cols {failing_cols}. Uncorrectable!"


if __name__ == "__main__":
    # 1. 1D Parity Demonstration
    data_bits = "1001101"
    parity_bit = compute_1d_even_parity(data_bits)
    frame = data_bits + str(parity_bit)
    print(f"Data: {data_bits} | Parity Bit: {parity_bit} | Transmitted: {frame}")
    assert parity_bit == 0
    assert verify_1d_even_parity(frame) is True

    # Simulate 2-bit error: flip bit 0 ('1' -> '0') and bit 1 ('0' -> '1')
    corrupted_2bit = "01011010"
    is_valid_detected = verify_1d_even_parity(corrupted_2bit)
    print(f"Corrupted 2-bit Frame: {corrupted_2bit}")
    print(f"1D Parity Check on 2-bit error: {'PASSED (Undetected Corruption!)' if is_valid_detected else 'CAUGHT'}")
    assert is_valid_detected is True  # Proof that 1D parity fails!

    # 2. 2D Parity Demonstration
    print("\n--- 2D Matrix Parity Demonstration ---")
    data_block = [
        "1001101",
        "0110100",
        "1101011",
        "0011110",
    ]
    parity_2d = TwoDimensionalParity(data_block)
    row_p, col_p, corner_p = parity_2d.encode()
    print(f"Row Parities: {row_p}")
    print(f"Col Parities: {col_p}")

    # Inject single bit flip at Row 1, Col 2 ('1' -> '0')
    import copy
    corrupted_matrix = copy.deepcopy(parity_2d.matrix)
    corrupted_matrix[1][2] ^= 1

    corrected_matrix, status = TwoDimensionalParity.decode_and_correct(corrupted_matrix, row_p, col_p)
    print(f"Status: {status}")
    assert corrected_matrix == parity_2d.matrix
    print("Matrix successfully restored to original clean state!")
```

---

### 6. Concise Staff-Level Interview Answer

> "For the 7-bit string `1001101`, there are exactly four 1s. Because 4 is already even, the sender sets the even parity bit to `0`, transmitting the 8-bit frame `10011010`. The receiver sums the 8 bits and computes $4 \bmod 2 = 0$, confirming the frame is valid.
>
> Mathematically, 1D parity tests only the aggregate population count modulo 2. Any single-bit flip changes the count of 1s by $\pm 1$, causing an odd-parity check failure. However, a 2-bit flip changes the count by $+2$ (two $0 \to 1$), $-2$ (two $1 \to 0$), or $0$ (one $0 \to 1$ and one $1 \to 0$). In all three cases, the change modulo 2 is $0$. The parity remains even, and the corrupted byte passes undetected.
>
> To resolve this, protocols employ **Two-Dimensional (2D) Parity**, arranging data into rows and columns with horizontal (VRC) and vertical (LRC) parity checks. A 2-bit error in the same row causes two column parity checks to fail, guaranteeing detection. Furthermore, a single-bit error triggers exactly one row failure and one column failure; their matrix intersection $(R_i, C_j)$ pinpoints the faulty bit for instant correction without retransmission."
