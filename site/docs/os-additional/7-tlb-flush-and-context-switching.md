---
id: 7-tlb-flush-and-context-switching
title: "TLB Flush & Context Switching (PCID / ASID)"
description: "The same address means something different in the next process, and the cheapest fix used to be throwing everything away"

sidebar_position: 7
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Why does a context switch between processes typically require a TLB flush? What performance impact does this have, and how do modern CPUs mitigate it using PCID/ASID?"

---

### Picture it

A hotel with a desk clerk who remembers room numbers.

Guests ask for "the manager's office" or "the laundry", and the clerk, rather than consulting the floor plan every time, **remembers the answers**. Ask for the laundry twice and the second answer is instant.

Now the hotel is taken over by a different company overnight. Same building, same room numbers, **completely different floor plan**. "The laundry" is now room 312, not room 107.

The clerk's memory is now **actively dangerous**. Not slow, not stale: **wrong in a way that sends someone into the wrong room**. If a guest asks for the laundry and is sent to 107, they walk into whatever the new company put there.

So the simplest safe response at handover is to **wipe the clerk's memory completely**. Correct, instant, and brutally expensive: the clerk now consults the floor plan for **every single question**, and the floor plan is in a filing cabinet down the corridor. The first few hundred guests after a handover all wait.

Worse, the handovers happen **thousands of times a second**, and the hotel keeps switching back to companies it was running ten milliseconds ago. Every time, the clerk is wiped, and every time they laboriously relearn the same answers they knew a moment earlier.

**The fix is obvious once stated.** Do not wipe anything. Have the clerk write the **company name** next to each remembered answer, and only use an answer whose company matches the one currently running. Now both companies' answers sit side by side, nothing is wrong, nothing is thrown away, and switching back finds everything still remembered.

A few notes stay useful regardless of which company is in charge, like where the fire exits are. Those are marked as **universal** and never wiped at all.

---

### The proper terms

#### Why the flush is needed

The **TLB**, translation lookaside buffer, is a small, very fast cache of virtual to physical address translations. Without it, every memory access would need a **page table walk**, which on x86-64 means up to four memory accesses to traverse PML4, PDPT, PD and PT, or five under **LA57**.

A context switch between **processes** changes the address space by loading a new page table base into **`CR3`**.

The problem is that **virtual addresses are not unique across processes**. Address `0x400000` is a perfectly ordinary code address in **every** process, mapping to a **different physical page** in each. So the moment `CR3` changes, every cached translation becomes a statement about the **wrong** address space.

This is not a performance concern, it is a **correctness and security** one. Using a stale entry would let process B read process A's physical memory, which is a complete failure of isolation.

The traditional remedy is brutal and simple: **writing to `CR3` flushes the entire TLB**, on x86 automatically for all non-global entries.

Note what does **not** need this. **Threads of the same process share an address space**, so `CR3` is unchanged and the TLB stays entirely valid. That is one of the main reasons a thread switch is much cheaper than a process switch.

#### What the flush costs

The flush itself is nearly free. **The cost is everything that happens afterwards.**

**Every subsequent memory access may miss**, because no translation is cached. The TLB is small, typically a few hundred to a couple of thousand entries across levels.

**Each miss costs a page table walk**, up to four or five dependent memory accesses. If the page table entries themselves are not in the data cache, each of those is a further cache miss, making a single walk cost **well over a hundred cycles**.

**Re-warming takes thousands of misses.** A process with a 100 MB working set touches tens of thousands of distinct 4 KB pages, and every one of them must be walked again after the flush.

**It compounds with the cold data caches**, which were also polluted by the other process, so the walk itself is slow because the page tables are not cached either.

This is why **TLB re-warming is one of the dominant components of context switch cost**, and why it is **invisible to a benchmark that times the switch**: the expense is spread across the next few milliseconds of execution, not inside `switch_to`.

The pathological pattern is **frequent switching between a small set of processes**. Two processes alternating every millisecond each flush the other's translations away, then painstakingly rebuild exactly the translations they had moments earlier. Nothing changed, and all the work was repeated.

#### Global pages, the partial mitigation

The kernel is mapped at the **same virtual addresses in every process**, so its translations are valid regardless of which process is running.

The **`G` bit** in a page table entry marks a page **global**, and with **`CR4.PGE`** enabled, global entries **survive a `CR3` write**. Kernel mappings are marked global, so system calls and interrupt handling do not pay the re-walk cost after every switch.

The complication worth mentioning: **KPTI**, the Meltdown mitigation, **unmaps most of the kernel from the user page tables**, giving each process two page tables and switching between them on kernel entry and exit. That both reduced the usefulness of global pages and **greatly increased the frequency of `CR3` writes**, which is precisely why PCID support became so important.

#### PCID and ASID

The real fix is to stop flushing at all, by **tagging** each TLB entry with the address space it belongs to.

**PCID**, process context identifier, on x86, is a **12-bit** field giving **4096** identifiers, carried in the low bits of `CR3`. **ASID**, address space identifier, is the equivalent on **ARM** and **MIPS**.

Each TLB entry stores the PCID that was current when it was created. The CPU **only matches an entry if its tag equals the current PCID**, so entries belonging to different processes **coexist harmlessly**.

Then, when writing `CR3`, setting **bit 63** means **do not flush**. Switching address spaces becomes a tag change rather than a mass invalidation, and switching **back** to a recently-run process finds its translations **still present**.

The gain is largest for exactly the pathological pattern above: alternating between a few processes, server workloads, and anything doing frequent switches.

#### The limits

Not a free win, and knowing the limits is what separates a thorough answer.

**Only 4096 identifiers exist**, and a real system has far more processes. They must be **recycled**, and recycling requires invalidating the previous owner's entries. Linux is more conservative still, maintaining a small per-CPU set of PCIDs, around six, and assigning them dynamically, because tracking thousands across many cores costs more than it saves.

**TLB shootdowns are unaffected.** When a page mapping genuinely changes, for example on `munmap` or a copy-on-write break, other cores may hold stale entries, and they must be invalidated by sending **inter-processor interrupts**. PCIDs do not help with this and arguably complicate it, since entries for several address spaces may need invalidating on each core.

**It costs silicon**, in comparator width on every TLB entry.

**KPTI consumes them in pairs**, since each process needs one identifier for its user page table and one for its kernel page table.

On the balance: **PCID support reduced the cost of KPTI dramatically**. Without it, Meltdown mitigation on system-call-heavy workloads cost tens of percent, because every kernel entry and exit flushed the TLB. With PCID, the two page tables keep their own tagged entries and the mitigation's cost falls to a few percent.

---

### In code

```text
Why the flush is a CORRECTNESS issue, not a performance one:

  process A                         process B
    0x400000 -> physical 0x1A000      0x400000 -> physical 0x7F000
    0x401000 -> physical 0x1B000      0x401000 -> physical 0x93000

  the SAME virtual address means a DIFFERENT physical page.

  so after loading B's CR3, a cached entry saying
      "0x400000 -> 0x1A000"
  would send B's load into A's PHYSICAL MEMORY.

  that is a total failure of isolation, not a stale cache.
  hence: writing CR3 flushes the whole TLB (non-global entries).

  NOTE: threads of the same process share an address space, so CR3
  is unchanged and the TLB stays entirely valid. That is a large
  part of why a thread switch is so much cheaper.
```

```text
What the flush actually costs, which is all AFTER the switch:

  the flush itself      ~free

  afterwards, per memory access that misses:
      a PAGE TABLE WALK
      x86-64 4-level:   PML4 -> PDPT -> PD -> PT   = 4 dependent
                                                     memory accesses
      LA57 5-level:     5 of them
      and if the page table entries are not in the data cache,
      each access is ITSELF a cache miss
      -> well over 100 cycles for one translation

  re-warming:
      a 100 MB working set touches tens of thousands of distinct
      4 KB pages, and EVERY ONE must be walked again

  and it compounds: the data caches were polluted too, so the walk
  is slow because the PAGE TABLES are not cached either.

  timeline:
     |-switch-|--------- thousands of TLB misses ---------|--normal--|
        ~free           this is the real cost
                        and NO benchmark of switch latency sees it
```

```text
The pathological pattern, which is also the common one:

  process A runs 1 ms  -> builds up its translations
  switch, FLUSH        -> all of A's work thrown away
  process B runs 1 ms  -> builds up its translations
  switch, FLUSH        -> all of B's work thrown away
  process A runs 1 ms  -> rebuilds EXACTLY what it had 2 ms ago
  ...

  nothing about A's mappings changed. The entries were correct.
  They were discarded only because there was no way to tell them
  apart from B's.
```

```text
Global pages: the partial mitigation

  the kernel is mapped at the SAME virtual addresses in every process,
  so its translations are valid whoever is running.

  the G bit in a PTE marks a page GLOBAL
  with CR4.PGE enabled, global entries SURVIVE a CR3 write

  -> system calls and interrupt handling do not pay the re-walk
     after every switch

  the complication: KPTI (the Meltdown mitigation) unmaps most of the
  kernel from the USER page tables, giving each process two page
  tables and switching between them on kernel entry and exit.
  That reduced the usefulness of global pages AND greatly increased
  how often CR3 is written, which is exactly why PCID mattered so much.
```

```text
PCID / ASID: tag the entries instead of throwing them away

  WITHOUT PCID                      WITH PCID
  TLB after switching to B:         TLB after switching to B:
     (empty)                           [PCID 1] 0x400000 -> 0x1A000
                                       [PCID 1] 0x401000 -> 0x1B000
     everything A had is gone          [PCID 2] 0x400000 -> 0x7F000
                                       [PCID 2] 0x401000 -> 0x93000

                                    current PCID = 2
                                    -> only PCID 2 entries MATCH
                                    -> A's entries sit there harmlessly
                                    -> switching BACK to A finds them
                                       STILL PRESENT

  x86:  PCID, 12 bits  -> 4096 identifiers, in the low bits of CR3
  ARM / MIPS: ASID, the same idea

  writing CR3 with BIT 63 SET = "do not flush"
  -> switching address spaces becomes a TAG CHANGE, not a mass
     invalidation
```

```text
The limits, which is what a thorough answer adds:

  ONLY 4096 IDENTIFIERS
      real systems have far more processes, so PCIDs must be RECYCLED,
      and recycling means invalidating the previous owner's entries.
      Linux is more conservative still: a small per-CPU set of about
      SIX PCIDs, assigned dynamically, because tracking thousands
      across many cores costs more than it saves.

  TLB SHOOTDOWNS ARE UNAFFECTED
      when a mapping genuinely CHANGES (munmap, a COW break), other
      cores may hold stale entries and must be invalidated by
      INTER-PROCESSOR INTERRUPTS.
      PCIDs do not help, and arguably complicate it, since several
      address spaces' entries may need invalidating per core.

  IT COSTS SILICON
      comparator width on every TLB entry

  KPTI CONSUMES THEM IN PAIRS
      one identifier for the user page table, one for the kernel's

  the balance: PCID reduced KPTI's cost DRAMATICALLY. Without it,
  Meltdown mitigation cost tens of percent on syscall-heavy workloads,
  because every kernel entry and exit flushed the TLB. With it, the
  two page tables keep their own tagged entries and the cost falls
  to a few percent.
```

```bash
# Checking what your CPU and kernel are doing
grep -o 'pcid\|invpcid' /proc/cpuinfo | sort -u
# pcid     the CPU supports process context identifiers
# invpcid  it supports targeted invalidation of a single PCID

dmesg | grep -i 'pti\|pcid'
# e.g. "Kernel/User page tables isolation: enabled"

perf stat -e dTLB-load-misses,iTLB-load-misses,context-switches ./app
# TLB misses rising in step with context switches is the signature
# of exactly this problem
```

---

### What they ask next

**"Why is a stale TLB entry a security problem and not just a bug?"**
Because the same virtual address maps to different physical pages in different processes. A stale entry does not produce a wrong value from the right page; it produces the **right value from another process's page**, which is a direct breach of memory isolation.

**"Do thread switches flush the TLB?"**
No. Threads of one process share an address space, so `CR3` is unchanged and every entry stays valid. This is one of the main reasons a thread switch costs a fraction of a process switch.

**"What are global pages for?"**
Kernel mappings, which are identical in every address space. Marking them global with the `G` bit and enabling `CR4.PGE` lets them survive a `CR3` write, so system calls do not re-walk kernel translations after every switch. KPTI complicated this by splitting the kernel out of the user page tables.

**"If there are 4096 PCIDs, why does Linux use about six?"**
Because tracking thousands of identifiers across many cores, including the invalidation bookkeeping when one is recycled, costs more than it recovers. A small per-CPU set captures nearly all the benefit, since the processes being switched between in any short window are few.

**"Does PCID eliminate TLB shootdowns?"**
No, and the two are different problems. A shootdown is needed when a mapping actually **changes**, so other cores must drop stale entries, which requires inter-processor interrupts. PCID addresses switching between **unchanged** address spaces.

**"How does this relate to Meltdown?"**
KPTI gives each process separate user and kernel page tables and switches between them on every kernel entry and exit, which multiplies `CR3` writes enormously. Without PCID that meant a full TLB flush on every system call, costing tens of percent. PCID lets both tables keep tagged entries, reducing it to a few percent.

**"How would you detect this in production?"**
Correlate `dTLB-load-misses` and `iTLB-load-misses` with `context-switches` in `perf stat`. TLB misses climbing in proportion to switch count is the signature, and CPU pinning or reducing switch frequency is usually the remedy.

**The common wrong answer** is "the TLB is flushed because the mappings are stale". Stale implies merely out of date. The entries are **actively wrong in a dangerous direction**: they would resolve a valid address to **another process's physical memory**. Once that is stated, both the brutality of the old solution and the elegance of tagging follow naturally.

---

### Say this in the interview

*"The TLB caches virtual to physical translations, and without it every memory access would need a page table walk, which on x86-64 is up to four dependent memory accesses through PML4, PDPT, PD and PT, or five under LA57.*

*A context switch between processes loads a new page table base into CR3, and the problem is that virtual addresses are not unique across processes: 0x400000 is an ordinary code address in every process and maps to a different physical page in each. So once CR3 changes, every cached translation is a statement about the wrong address space. This is not a staleness or performance issue, it is correctness and security: using one would let a process read another's physical memory, which is a total failure of isolation. The traditional remedy is that writing CR3 flushes the whole TLB for non-global entries. Threads of the same process are exempt, because they share an address space, so CR3 does not change and the TLB stays valid, which is a large part of why thread switches are cheaper.*

*The flush itself is almost free; the cost is everything afterwards. Every subsequent access can miss, since nothing is cached, and each miss costs a page table walk of four or five dependent accesses, each of which may itself be a cache miss, so a single translation can cost well over a hundred cycles. A process with a hundred-megabyte working set touches tens of thousands of distinct pages, all of which must be walked again. And it compounds with cold data caches, because the page tables themselves are not cached either. That makes TLB re-warming one of the dominant components of context switch cost, and it is invisible to a benchmark that times the switch, because the expense is spread over the next few milliseconds rather than inside switch_to. The pathological pattern is frequent switching between a small set of processes, where each flush discards translations that were perfectly correct and will be rebuilt identically a millisecond later.*

*There is a partial mitigation in global pages. The kernel is mapped at the same virtual addresses in every process, so its translations are valid whoever is running, and the G bit with CR4.PGE enabled lets those entries survive a CR3 write, so system calls do not re-walk kernel mappings after every switch. KPTI complicated that by unmapping most of the kernel from the user page tables, which both reduced the benefit of global pages and greatly increased how often CR3 is written.*

*The real fix is tagging. PCID on x86 is a 12-bit process context identifier, giving 4096 values carried in the low bits of CR3, and ASID is the same idea on ARM and MIPS. Each TLB entry records the identifier current when it was created, and the CPU only matches an entry whose tag equals the current one, so entries from different processes coexist harmlessly. Writing CR3 with bit 63 set means do not flush, so switching address spaces becomes a tag change rather than a mass invalidation, and switching back to a recently-run process finds its translations still present. That is exactly the pathological case, so the gain is largest for server workloads that switch often between a few processes.*

*The limits matter too. There are only 4096 identifiers and far more processes, so they must be recycled, and recycling invalidates the previous owner's entries; Linux is more conservative still, keeping a small per-CPU set of about six and assigning them dynamically, because tracking thousands across many cores costs more than it saves. TLB shootdowns are unaffected, since a genuine mapping change still needs inter-processor interrupts to invalidate other cores. It costs silicon in comparator width. And KPTI consumes identifiers in pairs, one for the user page table and one for the kernel's. On balance, PCID reduced KPTI's cost dramatically: without it, Meltdown mitigation cost tens of percent on syscall-heavy workloads because every kernel entry and exit flushed the TLB, and with it the cost falls to a few percent."*
