---
id: 7-tlb-flush-and-context-switching
title: "Context Switching & TLB Invalidation: ASID & Performance Costs"
description: "Why switching between processes invalidates the TLB's virtual-to-physical mappings, and how ASID/PCID tagging avoids the flush."
sidebar_position: 7
sidebar_class_name: sidebar-hard
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Why does a context switch between processes typically require a TLB flush? What performance impact does this have, and how do modern CPUs mitigate it using PCID/ASID?"

The TLB caches recent virtual-address-to-physical-address translations right on the CPU. Since every process has its own separate address space, switching to a different process can make those cached translations wrong — so by default, the CPU throws them all away.

---

### The analogy: the receptionist's notepad

An office building is leased by two companies on different shifts. The receptionist keeps a sticky notepad (the TLB) of recent lookups:

- During Company A's shift, "Office 101" means Alice, on Floor 4. The receptionist writes that down.
- At 6pm, Company A leaves and Company B moves in (a context switch). Now "Office 101" means Bob, on Floor 2.
- If the receptionist doesn't throw out the old notepad, the next visitor asking for Bob in Office 101 gets sent to Alice's floor instead — straight into another company's private files. So the receptionist has to shred the notepad every time the shift changes.

---

### Why this happens: the same virtual address, two different meanings

Every process gets the illusion that it owns the whole address space. So two completely unrelated processes can both use the exact same virtual address, pointing at completely different physical RAM:

```
Process A virtual address 0x00400000  -->  physical frame 0x1A2000
Process B virtual address 0x00400000  -->  physical frame 0x9B8000
```

A plain TLB entry only stores `virtual page -> physical frame` — it has no idea which process that mapping belongs to. So if Process A is swapped out for Process B and the TLB isn't flushed:

1. The kernel points the CPU's page-table-base register (`CR3` on x86-64) at Process B's page tables.
2. Process B reads virtual address `0x00400000`.
3. The stale TLB entry reports a hit and returns Process A's physical frame.
4. Process B just read (or wrote) Process A's private memory. That's a correctness and security disaster.

---

### The classic fix: flush on every switch

Historically, on x86, reloading `CR3` automatically invalidates every non-global TLB entry on that core:

```nasm
mov cr3, rax   ; loading a new page table physical address...
               ; ...automatically wipes the TLB in hardware
```

One exception: kernel pages are mapped identically into every process, and are marked with the **Global bit**. Those survive a `CR3` reload, so the kernel's own code stays cached across switches.

<Diagram>
<Row>
<Box title="TLB hit" accent="#34d399"><Field icon="⚡" code="0.5 - 1 ns" hint="cached translation, single lookup" variant="neutral" /></Box>
<Box title="TLB miss (4-level walk)" accent="#fb7185"><Field icon="🐢" code="150 - 250 ns" hint="four sequential RAM accesses" variant="neutral" /></Box>
</Row>
</Diagram>

### Why this makes process switches expensive

Right after a switch, the new process starts with a cold TLB — almost every memory access misses, and each miss means walking the 4-level page table (PML4 → PDPT → PD → PT) in RAM:

$$\text{EMAT} = \text{HitRate} \times T_{\text{TLB}} + (1 - \text{HitRate}) \times (T_{\text{TLB}} + 4 \times T_{\text{DRAM}})$$

Hundreds of CPU cycles get wasted re-warming the cache before the process is running at full speed again.

This is also why **thread** switches stay cheap: threads in the same process share one page table, so `CR3` never gets reloaded, and the TLB stays warm the whole time.

---

### The modern fix: tag entries instead of flushing them

Rather than wipe the TLB on every switch, modern CPUs tag each entry with an ID for the address space it belongs to, and only match entries tagged with the currently active ID:

```
[ Address Space Tag | Virtual Page Number ] ---> [ Physical Frame Number ]
```

<Diagram>
<Row>
<Box title="Tagged entry: PCID 1" accent="#60a5fa"><Field icon="🏷️" code="VPN 0x4000 -> PFN 0x1A2000" hint="Process A" variant="neutral" /></Box>
<Box title="Tagged entry: PCID 2" accent="#f59e0b"><Field icon="🏷️" code="VPN 0x4000 -> PFN 0x9B8000" hint="Process B" variant="neutral" /></Box>
</Row>
</Diagram>

Both entries can sit in the TLB at the same time without colliding, because the CPU only matches the one tagged with the process currently running.

#### x86: Process Context Identifiers (PCID)

- Bits 0–11 of `CR3` hold a 12-bit PCID — up to 4,096 distinct address spaces.
- Setting bit 63 of the new `CR3` value (the `NOFLUSH` bit) tells the CPU to switch address spaces *without* wiping the TLB:
  ```nasm
  mov rax, [new_cr3_value]
  bts rax, 63             ; keep existing TLB entries
  mov cr3, rax            ; switch without flushing
  ```
- Process A's entries just sit there while B runs. Switch back to A, and its translations are still cached.

#### ARM: Address Space Identifiers (ASID)

ARM's `TTBR0_EL1` register carries an 8- or 16-bit ASID, letting multiple processes' translations coexist in the TLB the same way.

---

### Say this in the interview

*"A context switch between processes normally flushes the TLB because the mappings are only valid for one address space — without a flush, a process could read another process's stale, incorrectly-cached physical memory. That flush is expensive: the new process starts with a cold TLB and pays for 4-level page table walks on nearly every access. Modern CPUs avoid this with tagged TLBs — x86 PCID and ARM ASID — which tag entries with a process ID so multiple address spaces' translations can live in the TLB at once, with no flush needed. Thread switches never pay this cost at all, since threads share one page table."*

---

### Code: simulating the stale-hit bug, the flush cost, and tagging

```python
"""
TLB Context Switch & ASID/PCID Simulator
Demonstrates:
  1. Untagged TLB stale read hazard (memory corruption)
  2. Full TLB flush cold-miss penalty
  3. Tagged TLB (PCID/ASID) performance & correctness
"""

from typing import Dict, Optional, Tuple

class SimulatedTLB:
    def __init__(self, tagged_mode: bool = False):
        self.tagged_mode = tagged_mode
        # Untagged: vpn -> pfn
        # Tagged:   (pcid, vpn) -> pfn
        self.cache: Dict = {}
        self.hits = 0
        self.misses = 0

    def flush(self):
        """Simulates full TLB invalidation on CR3 reload."""
        self.cache.clear()

    def translate(self, pcid: int, vpn: int, page_table: Dict[int, int]) -> Tuple[int, str]:
        """Translates virtual page number to physical frame number."""
        key = (pcid, vpn) if self.tagged_mode else vpn

        if key in self.cache:
            self.hits += 1
            return self.cache[key], "TLB HIT (0.5 ns)"

        # TLB Miss: Perform 4-level Page Table walk in DRAM
        self.misses += 1
        pfn = page_table[vpn]
        self.cache[key] = pfn
        return pfn, "TLB MISS -> Page Table Walk (200 ns)"


def main():
    print("=== TLB Context Switching & ASID Simulation ===\n")

    # Define two processes with overlapping virtual addresses but distinct physical frames
    PAGE_TABLE_A = {0x0040: 0x1A20, 0x0080: 0x1B30}  # Process A (PCID 1)
    PAGE_TABLE_B = {0x0040: 0x9B80, 0x0080: 0x9C90}  # Process B (PCID 2)

    # -------------------------------------------------------------
    # Case 1: Untagged TLB WITHOUT Flush (The Bug / Security Hole)
    # -------------------------------------------------------------
    print("--- Case 1: Untagged TLB Without Flush (Memory Corruption Hazard) ---")
    tlb_buggy = SimulatedTLB(tagged_mode=False)
    # Process A runs and accesses 0x0040
    pfn, status = tlb_buggy.translate(pcid=1, vpn=0x0040, page_table=PAGE_TABLE_A)
    print(f"Process A accesses VPN 0x0040: -> PFN {hex(pfn)} [{status}]")

    # Context switch to Process B WITHOUT flushing TLB
    pfn_b, status_b = tlb_buggy.translate(pcid=2, vpn=0x0040, page_table=PAGE_TABLE_B)
    print(f"Process B accesses VPN 0x0040: -> PFN {hex(pfn_b)} [{status_b}]")
    if pfn_b == PAGE_TABLE_A[0x0040]:
        print("  CRITICAL ERROR: Process B accessed Process A's private memory frame!")

    # -------------------------------------------------------------
    # Case 2: Untagged TLB WITH Flush (The Classic Performance Hit)
    # -------------------------------------------------------------
    print("\n--- Case 2: Untagged TLB With Flush (Cold Miss Overhead) ---")
    tlb_classic = SimulatedTLB(tagged_mode=False)
    tlb_classic.translate(pcid=1, vpn=0x0040, page_table=PAGE_TABLE_A)

    # Context Switch: OS flushes TLB
    tlb_classic.flush()
    print("Context Switch: CR3 reloaded -> TLB completely flushed!")

    pfn_b, status_b = tlb_classic.translate(pcid=2, vpn=0x0040, page_table=PAGE_TABLE_B)
    print(f"Process B accesses VPN 0x0040: -> PFN {hex(pfn_b)} [{status_b}]")
    print(f"Stats: Hits = {tlb_classic.hits}, Misses = {tlb_classic.misses} (Cold start penalty)")

    # -------------------------------------------------------------
    # Case 3: Modern Tagged TLB (PCID / ASID Enabled)
    # -------------------------------------------------------------
    print("\n--- Case 3: Tagged TLB with PCID/ASID (High Performance) ---")
    tlb_tagged = SimulatedTLB(tagged_mode=True)

    # Process A runs
    pfn_a, s1 = tlb_tagged.translate(pcid=1, vpn=0x0040, page_table=PAGE_TABLE_A)
    print(f"Process A (PCID 1) accesses VPN 0x0040: -> PFN {hex(pfn_a)} [{s1}]")

    # Context Switch to Process B (NO FLUSH!)
    pfn_b, s2 = tlb_tagged.translate(pcid=2, vpn=0x0040, page_table=PAGE_TABLE_B)
    print(f"Process B (PCID 2) accesses VPN 0x0040: -> PFN {hex(pfn_b)} [{s2}]")

    # Context Switch back to Process A -> Instant TLB HIT!
    pfn_a2, s3 = tlb_tagged.translate(pcid=1, vpn=0x0040, page_table=PAGE_TABLE_A)
    print(f"Process A (PCID 1) resumes & accesses 0x0040: -> PFN {hex(pfn_a2)} [{s3}]")
    print(f"Stats: Hits = {tlb_tagged.hits}, Misses = {tlb_tagged.misses}")
    print("Result: No cross-talk corruption, and Process A enjoyed zero cold-miss penalty!")

if __name__ == "__main__":
    main()
```
