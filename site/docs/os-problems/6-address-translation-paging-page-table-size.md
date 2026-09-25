---
id: 6-address-translation-paging-page-table-size
title: "Address Translation Problem: Page Offset, Frame Number & Page Table Size"
description: "Calculate page offset bits, page and frame numbers, total virtual pages, physical frames, page table sizes, and multi-level page table memory savings."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A system has a 32-bit virtual address space, a 28-bit physical address space, a 4 KB page size, and a 4-byte Page Table Entry (PTE). Calculate: (1) page offset bits, (2) virtual pages and physical frames, (3) single-level page table size, and (4) explain the bit breakdown and memory savings of a 2-level hierarchical page table."

---

## 1. Executive Summary & Address Bitfield Architecture

Virtual memory decouples an application's logical address space from physical RAM chips. The Memory Management Unit (MMU) uses page tables to translate the virtual page number (VPN) into a physical frame number (PFN) while keeping the byte offset identical.

```
32-Bit Virtual Address Space (4 GB):
┌──────────────────────────────────────┬─────────────────────────┐
│     Virtual Page Number (VPN)        │    Page Offset (d)      │
│               20 Bits                │         12 Bits         │
└──────────────────────────────────────┴─────────────────────────┘
                   │
                   ▼ (MMU Page Table Translation)
28-Bit Physical Address Space (256 MB):
┌───────────────────────────────┬────────────────────────────────┐
│   Physical Frame Number (PFN) │        Page Offset (d)         │
│            16 Bits            │            12 Bits             │
└───────────────────────────────┴────────────────────────────────┘
```

---

## 2. Part 1: Calculating the Page Offset Bits

The page offset uniquely identifies a specific byte within a page. Because a virtual page and a physical page frame are identical in size, the offset field is identical in both addresses.

$$\text{Page Size} = 4\text{ KB} = 4 \times 1024\text{ Bytes} = 4,096\text{ Bytes} = 2^{12}\text{ Bytes}$$

$$\text{Offset Bits} = \log_2(4096) = \mathbf{12\text{ Bits}}$$

- The lower **12 bits** (bits 0 to 11) of every address represent the byte offset inside the page.

---

## 3. Part 2: Virtual Pages vs. Physical Frames

### 1. Virtual Address Space Breakdown:
- Total Virtual Address: 32 bits
- Virtual Page Number (VPN) bits:
  $$\text{VPN Bits} = \text{Total Virtual Bits} - \text{Offset Bits} = 32 - 12 = \mathbf{20\text{ Bits}}$$
- Total Virtual Pages:
  $$2^{20} = \mathbf{1,048,576\text{ Pages}}\quad (1\text{ M Pages})$$
- Maximum Virtual Address Space per process:
  $$2^{32}\text{ Bytes} = \mathbf{4\text{ GB}}$$

### 2. Physical Address Space Breakdown:
- Total Physical Address: 28 bits
- Physical Frame Number (PFN) bits:
  $$\text{PFN Bits} = \text{Total Physical Bits} - \text{Offset Bits} = 28 - 12 = \mathbf{16\text{ Bits}}$$
- Total Physical Frames:
  $$2^{16} = \mathbf{65,536\text{ Frames}}\quad (64\text{ K Frames})$$
- Total Physical RAM Capacity:
  $$2^{28}\text{ Bytes} = \mathbf{256\text{ MB}}$$

| Parameter | Virtual Memory (Process View) | Physical Memory (Hardware RAM) |
| :--- | :--- | :--- |
| **Address Width** | 32 Bits | 28 Bits |
| **Total Addressable Memory** | 4 GB ($2^{32}$ Bytes) | 256 MB ($2^{28}$ Bytes) |
| **Offset Width** | 12 Bits (4 KB page) | 12 Bits (4 KB frame) |
| **Identifier Width** | 20 Bits (VPN) | 16 Bits (PFN) |
| **Total Units** | 1,048,576 Pages ($2^{20}$) | 65,536 Frames ($2^{16}$) |

---

## 4. Part 3: Single-Level Page Table Size & Inefficiency

A flat (single-level) page table requires one entry (PTE) for every single page in the virtual address space, regardless of whether that page is allocated or empty.

$$\text{Page Table Size} = \text{Total Virtual Pages} \times \text{PTE Size}$$

$$\text{Page Table Size} = 2^{20}\text{ entries} \times 4\text{ Bytes} = 4,194,304\text{ Bytes} = \mathbf{4\text{ MB per process}}$$

### Why Single-Level Paging Fails in Production:
1. **Per-Process Overhead:** Every single process requires its own 4 MB page table. If the system runs 100 active processes, the page tables alone consume:
   $$100 \times 4\text{ MB} = \mathbf{400\text{ MB of RAM}}$$
   This exceeds the system's total physical RAM capacity (256 MB) before running any application code!
2. **Contiguity Requirement:** A flat page table is an array. The OS kernel must find a single, unbroken **4 MB contiguous block of physical RAM** for each process. In a fragmented system, contiguous allocation of this scale is virtually impossible.

---

## 5. Part 4: Two-Level Hierarchical Page Table

To eliminate contiguous allocation and avoid storing empty entries, operating systems convert the flat array into a tree structure.

```
32-Bit Logical Address (Two-Level):
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│  Outer Directory (P1)   │    Page Table (P2)      │     Page Offset (d)     │
│         10 Bits         │         10 Bits         │         12 Bits         │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Derivation: Why Exactly 10 Bits for P1 and 10 Bits for P2?
The design requirement of hierarchical paging is that **each page table itself must fit perfectly inside a single physical page frame (4 KB)**:

$$\text{Entries per 4 KB frame} = \frac{\text{Page Size}}{\text{PTE Size}} = \frac{4096\text{ Bytes}}{4\text{ Bytes}} = 1024 = 2^{10}\text{ entries}$$

1. Since an Inner Page Table holds $2^{10}$ entries, indexing into it requires **10 bits** ($\mathbf{P_2 = 10\text{ bits}}$).
2. The remaining VPN bits form the Outer Page Directory:
   $$\text{Outer Directory Bits } (P_1) = \text{Total VPN Bits} - P_2 = 20 - 10 = \mathbf{10\text{ bits}}$$
3. The Outer Page Directory also holds $2^{10} = 1024$ entries, each pointing to the physical base address of an inner page table. Thus, the outer directory also fits perfectly inside one 4 KB page frame.

---

## 6. Part 5: Numerical Proof of Multi-Level Memory Savings

Consider a typical 32-bit user process that uses only **12 MB** of total virtual address space (e.g., 4 MB code, 4 MB heap, 4 MB stack), leaving the remaining 4,084 MB untouched:

### Single-Level Page Table Footprint:
- Allocates all 1,048,576 PTEs upfront:
  $$\text{Memory} = 4\text{ MB}$$

### Two-Level Page Table Footprint:
- Total virtual pages used by application:
  $$\text{Pages Used} = \frac{12\text{ MB}}{4\text{ KB}} = 3,072\text{ Pages}$$
- Each inner page table covers:
  $$1,024\text{ entries} \times 4\text{ KB} = 4\text{ MB of virtual address space}$$
- To cover 12 MB of address space, the OS only creates **3 Inner Page Tables**:
  $$\text{Inner Tables} = \frac{12\text{ MB}}{4\text{ MB}} = 3\text{ Tables}$$
- Total Two-Level Memory Footprint:
  - 1 Outer Page Directory: $1 \times 4\text{ KB} = 4\text{ KB}$
  - 3 Inner Page Tables: $3 \times 4\text{ KB} = 12\text{ KB}$
  - Total Page Table RAM Consumed: $4\text{ KB} + 12\text{ KB} = \mathbf{16\text{ KB}}$

$$\text{Memory Savings} = \frac{4,096\text{ KB} - 16\text{ KB}}{4,096\text{ KB}} \times 100\% = \mathbf{99.61\%\text{ Reduction!}}$$

The remaining 1,021 pointers in the Outer Page Directory sit as `NULL`. The OS never allocates inner tables for unused address space.

---

## 7. Alternative Architectures: Inverted Page Tables & x86-64

| Architecture | Sizing Basis | Key Advantage | Key Disadvantage |
| :--- | :--- | :--- | :--- |
| **Single-Level Paging** | Total Virtual Pages ($2^{\text{VPN}}$) | $O(1)$ direct array index lookup. | Prohibitive RAM overhead (4 MB/proc); requires contiguous memory. |
| **Multi-Level Paging (x86)** | Sparse Virtual Pages actually allocated | Allocates on demand; 99%+ memory savings; non-contiguous. | Higher TLB miss penalty (walks 2 to 4 levels). |
| **Inverted Page Table (PowerPC)** | Total Physical Frames ($2^{\text{PFN}}$) | Fixed memory overhead tied to physical RAM, not virtual address space. | Slower lookup; requires hash table and chaining for address translation. |

> **Modern 64-Bit Reality (x86-64 PML4):** In a 64-bit OS, a flat page table would require $2^{52} \times 8\text{ B} = 36\text{ Petabytes}$ per process. Modern x86-64 uses a **4-level tree** (PML4 $\to$ PDPT $\to$ PD $\to$ PT) with 9 bits per level ($9 + 9 + 9 + 9 = 36$ bits VPN + 12 bits offset = 48-bit canonical addressing).

---

## 8. Python Verification: Address Translator & Sizer

The following executable Python script implements the bit-masking arithmetic to translate virtual addresses to physical addresses and compares single-level vs. two-level memory overhead:

```python
"""
Paging Address Translation and Page Table Sizing Simulator
"""
from typing import Tuple


class PagingSystem:
    def __init__(
        self,
        virtual_bits: int = 32,
        physical_bits: int = 28,
        page_size_bytes: int = 4096,
        pte_size_bytes: int = 4
    ):
        self.virtual_bits = virtual_bits
        self.physical_bits = physical_bits
        self.page_size = page_size_bytes
        self.pte_size = pte_size_bytes

        # Offset calculation
        self.offset_bits = (page_size_bytes).bit_length() - 1
        self.offset_mask = (1 << self.offset_bits) - 1

        # Virtual page numbers
        self.vpn_bits = virtual_bits - self.offset_bits
        self.total_virtual_pages = 1 << self.vpn_bits

        # Physical frame numbers
        self.pfn_bits = physical_bits - self.offset_bits
        self.total_physical_frames = 1 << self.pfn_bits

        # Two-level decomposition (each table fits in 1 page frame)
        self.entries_per_page = page_size_bytes // pte_size_bytes
        self.p2_bits = (self.entries_per_page).bit_length() - 1
        self.p1_bits = self.vpn_bits - self.p2_bits

    def decompose_virtual_address(self, vaddr: int) -> Tuple[int, int, int]:
        """Decomposes a 32-bit virtual address into (P1, P2, Offset)."""
        offset = vaddr & self.offset_mask
        vpn = vaddr >> self.offset_bits
        p2 = vpn & ((1 << self.p2_bits) - 1)
        p1 = vpn >> self.p2_bits
        return p1, p2, offset

    def calculate_memory_savings(self, allocated_mb: float) -> dict:
        flat_size_bytes = self.total_virtual_pages * self.pte_size
        allocated_bytes = int(allocated_mb * 1024 * 1024)
        pages_needed = (allocated_bytes + self.page_size - 1) // self.page_size

        # Number of inner tables needed
        inner_tables = (pages_needed + self.entries_per_page - 1) // self.entries_per_page
        # 1 outer directory + N inner tables
        hierarchical_size_bytes = (1 + inner_tables) * self.page_size

        savings_pct = ((flat_size_bytes - hierarchical_size_bytes) / flat_size_bytes) * 100
        return {
            "flat_bytes": flat_size_bytes,
            "hierarchical_bytes": hierarchical_size_bytes,
            "inner_tables": inner_tables,
            "savings_pct": savings_pct
        }


if __name__ == "__main__":
    sys = PagingSystem(32, 28, 4096, 4)

    print("=" * 65)
    print("VIRTUAL MEMORY ADDRESS TRANSLATION & SIZING SPECIFICATION")
    print("=" * 65)
    print(f"Virtual Address Bits:     {sys.virtual_bits} bits (4 GB)")
    print(f"Physical Address Bits:    {sys.physical_bits} bits (256 MB)")
    print(f"Page Offset Bits:         {sys.offset_bits} bits (4 KB page size)")
    print(f"Virtual Page Number:      {sys.vpn_bits} bits (Total Pages: {sys.total_virtual_pages:,})")
    print(f"Physical Frame Number:    {sys.pfn_bits} bits (Total Frames: {sys.total_physical_frames:,})")
    print(f"Two-Level Breakdown:      P1 = {sys.p1_bits} bits, P2 = {sys.p2_bits} bits, Offset = {sys.offset_bits} bits")

    # Sample Address Translation
    sample_vaddr = 0x004031A4  # Typical text/code section virtual address
    p1, p2, off = sys.decompose_virtual_address(sample_vaddr)
    print(f"\nAddress Decomposition for 0x{sample_vaddr:08X}:")
    print(f"  Outer Directory Index (P1): {p1} (0x{p1:X})")
    print(f"  Inner Page Table Index (P2): {p2} (0x{p2:X})")
    print(f"  Page Offset (d):            {off} (0x{off:X})")

    # Memory Savings Comparison for a 12 MB process
    res = sys.calculate_memory_savings(12.0)
    print("\n--- Memory Overhead Comparison for a 12 MB Process ---")
    print(f"Flat Single-Level Page Table: {res['flat_bytes'] / (1024*1024):.2f} MB")
    print(f"Hierarchical Two-Level Table: {res['hierarchical_bytes'] / 1024:.2f} KB (1 Directory + {res['inner_tables']} Inner Tables)")
    print(f"Net Memory Reduction:        {res['savings_pct']:.2f}%")
```