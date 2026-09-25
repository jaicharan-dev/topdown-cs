---
id: 5-effective-memory-access-time-emat-tlb
title: "Effective Memory Access Time (EMAT) Problem: TLB Hit Ratios & Multi-Level Tables"
description: "Calculate Effective Memory Access Time (EMAT) given TLB lookup times, main memory latency, 80% and 95% hit ratios, multi-level page tables, and page fault rates."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A system uses virtual memory with paging and a Translation Lookaside Buffer (TLB). TLB access latency is 20 ns and main memory access latency is 100 ns. Calculate the Effective Memory Access Time (EMAT) for an 80% TLB hit ratio, a 95% TLB hit ratio, and for a 2-level page table system at an 80% hit ratio. How does page fault probability change this equation?"

---

## 1. Executive Summary & Hardware Context

In a virtual memory system, the CPU generates virtual addresses that must be translated into physical addresses before data can be fetched from RAM. 

Because page tables themselves reside in main memory:
- **Without a TLB:** Every memory dereference requires **two RAM accesses** (one to read the Page Table Entry, one to read the actual data), doubling memory latency to 200 ns.
- **With a TLB:** The CPU includes a fast, on-chip associative cache called the **Translation Lookaside Buffer (TLB)**. On a TLB hit, the physical frame is resolved in hardware in 20 ns, avoiding an extra trip to RAM.

```
       CPU Virtual Address (VPN | Offset)
                     │
                     ▼
           ┌───────────────────┐
           │   TLB Lookup      │ (20 ns)
           └─────────┬─────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
       TLB Hit               TLB Miss
     (Prob: h)            (Prob: 1 - h)
          │                     │
          ▼                     ▼
┌──────────────────┐  ┌─────────────────────────┐
│ Fetch Data RAM   │  │ Page Table Walk in RAM  │ (k * 100 ns)
│ (100 ns)         │  └────────────┬────────────┘
└──────────────────┘               │
                                   ▼
                      ┌─────────────────────────┐
                      │ Fetch Actual Data RAM   │ (100 ns)
                      └─────────────────────────┘
```

---

## 2. Part 1: EMAT with Single-Level Page Table (80% Hit Ratio)

### Problem Parameters:
- TLB Access Time ($t_{\text{TLB}}$): 20 ns
- Main Memory Access Time ($t_{\text{mem}}$): 100 ns
- TLB Hit Ratio ($h$): 0.80 (Miss Ratio $1 - h = 0.20$)

### Access Latencies:
1. **On TLB Hit:** Check TLB + Fetch data from memory:
   $$\text{Cost}_{\text{hit}} = t_{\text{TLB}} + t_{\text{mem}} = 20\text{ ns} + 100\text{ ns} = 120\text{ ns}$$
2. **On TLB Miss:** Check TLB + Read Page Table from RAM + Fetch data from RAM:
   $$\text{Cost}_{\text{miss}} = t_{\text{TLB}} + 2 \cdot t_{\text{mem}} = 20\text{ ns} + 100\text{ ns} + 100\text{ ns} = 220\text{ ns}$$

### Mathematical Calculation:
$$\text{EMAT} = h \cdot \text{Cost}_{\text{hit}} + (1 - h) \cdot \text{Cost}_{\text{miss}}$$

$$\text{EMAT} = (0.80 \times 120\text{ ns}) + (0.20 \times 220\text{ ns})$$

$$\text{EMAT} = 96\text{ ns} + 44\text{ ns} = \mathbf{140\text{ ns}}$$

- **Verdict:** An 80% TLB hit ratio yields an EMAT of **140 ns**, saving 60 ns compared to a TLB-less system (200 ns).

---

## 3. Part 2: Sensitivity Analysis with 95% Hit Ratio

Now assume software exhibits better spatial and temporal locality, raising the TLB hit ratio to $h = 0.95$ ($1 - h = 0.05$).

### Mathematical Calculation:
$$\text{EMAT} = (0.95 \times 120\text{ ns}) + (0.05 \times 220\text{ ns})$$

$$\text{EMAT} = 114\text{ ns} + 11\text{ ns} = \mathbf{125\text{ ns}}$$

### Sensitivity & Engineering Insights:
- A **15% increase** in TLB hit ratio (80% to 95%) cuts EMAT from 140 ns to 125 ns (a **10.7% speedup**).
- Because a TLB miss costs 220 ns (nearly double a hit), system throughput is hyper-sensitive to memory access patterns. Sequential array iteration and tight loop structures preserve TLB cache lines, while random pointer chasing thrashing the TLB causes CPU stalls.

---

## 4. Part 3: Multi-Level Page Table (2-Level System, 80% Hit Ratio)

Modern operating systems use multi-level (hierarchical) page tables to avoid allocating megabytes of contiguous page tables for sparse address spaces. However, every additional level adds a memory access on a TLB miss.

### Problem Parameters:
- Number of Page Table Levels ($k$): 2 (Outer Page Directory + Inner Page Table)
- TLB Hit Ratio ($h$): 0.80

### Access Latencies:
1. **On TLB Hit:** Remains identical:
   $$\text{Cost}_{\text{hit}} = t_{\text{TLB}} + t_{\text{mem}} = 20\text{ ns} + 100\text{ ns} = 120\text{ ns}$$
2. **On TLB Miss:** Check TLB + Read Outer Directory + Read Inner Table + Fetch data:
   $$\text{Cost}_{\text{miss}} = t_{\text{TLB}} + (k + 1) \cdot t_{\text{mem}} = 20\text{ ns} + (2 + 1) \cdot 100\text{ ns} = 320\text{ ns}$$

### Mathematical Calculation:
$$\text{EMAT} = (0.80 \times 120\text{ ns}) + (0.20 \times 320\text{ ns})$$

$$\text{EMAT} = 96\text{ ns} + 64\text{ ns} = \mathbf{160\text{ ns}}$$

- **Verdict:** In a 2-level system at an 80% hit ratio, EMAT rises to **160 ns**. Without the TLB, every access would require 3 RAM accesses (300 ns).

---

## 5. Generalized Formula for k-Level Page Tables

For an arbitrary $k$-level page table configuration with serial TLB lookup:

$$\text{EMAT} = h \cdot (t_{\text{TLB}} + t_{\text{mem}}) + (1 - h) \cdot \Big[ t_{\text{TLB}} + (k + 1) \cdot t_{\text{mem}} \Big]$$

Simplifying algebraically:
$$\text{EMAT} = t_{\text{TLB}} + t_{\text{mem}} + (1 - h) \cdot k \cdot t_{\text{mem}}$$

| Architecture Configuration | Levels (k) | Hit Latency | Miss Latency | EMAT at 80% Hit | EMAT at 95% Hit | EMAT at 99% Hit |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1-Level Paging (32-bit flat)** | 1 | 120 ns | 220 ns | 140.0 ns | 125.0 ns | 121.0 ns |
| **2-Level Paging (x86-32 PAE)** | 2 | 120 ns | 320 ns | 160.0 ns | 130.0 ns | 122.0 ns |
| **4-Level Paging (x86-64 PML4)** | 4 | 120 ns | 520 ns | 200.0 ns | 140.0 ns | 124.0 ns |
| **5-Level Paging (x86-64 PML5)** | 5 | 120 ns | 620 ns | 220.0 ns | 145.0 ns | 125.0 ns |

> **Key Observation:** In modern 64-bit systems with 4-level or 5-level paging, an un-cached memory walk costs 500 ns to 600 ns. This makes hardware TLB hit rates of 98%+ mandatory for high performance.

---

## 6. Advanced Interview Trap: Incorporating Page Fault Rate

Interviewers frequently combine TLB access with the **Page Fault Rate ($p$)**. If the requested page is not present in physical RAM at all, a page fault interrupt is triggered, requiring disk I/O.

### The Full Memory Hierarchy Equation:
$$\text{EMAT}_{\text{total}} = (1 - p) \cdot \text{EMAT}_{\text{RAM}} + p \cdot t_{\text{fault}}$$

Where:
- $p$ = Page Fault Probability (Miss rate in physical memory).
- $t_{\text{fault}}$ = Page Fault Service Time (Disk read + OS interrupt handling $\approx 8\text{ ms} = 8,000,000\text{ ns}$).

### Numerical Proof of Sensitivity:
Assume a 1-level system with $\text{EMAT}_{\text{RAM}} = 140\text{ ns}$, and a minor page fault rate of **0.1% ($p = 0.001$)**:

$$\text{EMAT}_{\text{total}} = (1 - 0.001) \cdot 140\text{ ns} + 0.001 \cdot 8,000,000\text{ ns}$$

$$\text{EMAT}_{\text{total}} \approx 140\text{ ns} + 8,000\text{ ns} = \mathbf{8,140\text{ ns}}$$

- **The Takeaway:** A tiny 0.1% page fault rate slows memory access down by **58x** (from 140 ns to 8,140 ns). 
- To keep memory degradation under 10% (EMAT $\le 154$ ns):
  $$p \cdot 8,000,000 \le 14 \implies p \le 0.00000175 \quad (p < 0.00017\%)$$
  Less than **1 in 570,000 accesses** can be allowed to fault.

---

## 7. Python Verification Script

The following standalone script calculates EMAT across variable hit ratios, page table depths, and page fault rates:

```python
"""
Effective Memory Access Time (EMAT) Simulator
Calculates memory latencies across TLB hit rates, multi-level tables, and page faults.
"""

def calculate_emat(
    t_tlb: float,
    t_mem: float,
    hit_ratio: float,
    levels: int = 1,
    page_fault_rate: float = 0.0,
    t_fault: float = 8_000_000.0  # 8 ms in nanoseconds
) -> float:
    # Serial lookup model
    cost_hit = t_tlb + t_mem
    cost_miss_ram = t_tlb + (levels + 1) * t_mem

    emat_ram = (hit_ratio * cost_hit) + ((1.0 - hit_ratio) * cost_miss_ram)

    # Full hierarchy including disk page faults
    total_emat = (1.0 - page_fault_rate) * emat_ram + (page_fault_rate * t_fault)
    return total_emat


if __name__ == "__main__":
    t_tlb = 20.0   # ns
    t_mem = 100.0  # ns

    print("=" * 65)
    print("EFFECTIVE MEMORY ACCESS TIME (EMAT) NUMERICAL VERIFICATION")
    print("=" * 65)

    # 1. Single-level at 80% and 95%
    emat_80 = calculate_emat(t_tlb, t_mem, 0.80, levels=1)
    emat_95 = calculate_emat(t_tlb, t_mem, 0.95, levels=1)
    print(f"1-Level Page Table (80% TLB Hit): {emat_80:.2f} ns")
    print(f"1-Level Page Table (95% TLB Hit): {emat_95:.2f} ns")

    # 2. Two-level at 80%
    emat_2lvl_80 = calculate_emat(t_tlb, t_mem, 0.80, levels=2)
    print(f"2-Level Page Table (80% TLB Hit): {emat_2lvl_80:.2f} ns")

    # 3. Multi-level scaling across architectures (80% vs 98%)
    print("\n--- Architecture Scaling (k = 1, 2, 4, 5 levels) ---")
    print(f"{'Levels (k)':<12} | {'EMAT (h=0.80)':<16} | {'EMAT (h=0.98)':<16}")
    print("-" * 50)
    for k in [1, 2, 4, 5]:
        e80 = calculate_emat(t_tlb, t_mem, 0.80, levels=k)
        e98 = calculate_emat(t_tlb, t_mem, 0.98, levels=k)
        print(f"{k:<12} | {e80:8.2f} ns      | {e98:8.2f} ns")

    # 4. Page Fault Penalty Demonstration
    print("\n--- Impact of Page Fault Probability (1-Level, h=0.80) ---")
    fault_rates = [0.0, 0.00001, 0.0001, 0.001]
    for p in fault_rates:
        emat_pf = calculate_emat(t_tlb, t_mem, 0.80, levels=1, page_fault_rate=p)
        print(f"Page Fault Rate: {p*100:6.3f}% -> Total EMAT: {emat_pf:10.2f} ns")
```