---
id: 6-address-translation-paging-page-table-size
title: "Address Translation: Offset Bits, Frames and Page Table Size"
description: "Four bit-splits, one 4 MB page table, and the exact number of processes it takes to fill all of physical memory with nothing but bookkeeping"

sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A system has a 32-bit virtual address space, a 28-bit physical address space, a 4 KB page size, and a 4-byte Page Table Entry (PTE). Calculate: (1) page offset bits, (2) virtual pages and physical frames, (3) single-level page table size, and (4) explain the bit breakdown and memory savings of a 2-level hierarchical page table."

---

### Picture it

A hotel that prints four billion keycard numbers and has 65,536 rooms.

The number on your card is not a room. It is a claim, and the concierge's job is to turn it into a room. So the desk keeps a book: card number on the left, room number on the right, and every lookup is a line in that book.

The first thing to notice is the asymmetry, because it is the reason the whole system exists. **There are vastly more card numbers than rooms.** Every guest gets the full range of numbers to use as they like, and most of them use a handful. The hotel is not pretending to have four billion rooms; it is decoupling the name of a thing from where the thing is, so that guests can be given generous, identical, private numbering while the hotel quietly moves people around, double-books nothing, and keeps rooms empty until someone actually walks in.

The second thing is where the savings come from, and it is not the book. **Cards are issued in blocks.** You do not get keycard 4,721 on its own; you get a block of a thousand consecutive numbers, and the concierge records one entry for the block rather than a thousand entries for the cards. That is the page: a 4 KB unit of address space that moves as one piece. Translation happens per block, and the position within the block is carried through untouched.

The third thing is the problem the question is really about. **The book has a row for every possible card number, not for every issued one.** A million rows, four bytes each, four megabytes of book, per guest, whether that guest has used three blocks or a million. And the hotel has 256 megabytes of space in total. Work out how many guests it takes before the books fill the building and there is nowhere left to put anybody, and you have the actual motivation for everything that follows.

The fix is the obvious one once stated plainly: **split the book into chapters, and only print the chapters you need.** A thin table of contents with a thousand rows, each pointing at a chapter that covers a thousand card numbers, and chapters you never issue cards in are simply absent. A guest using two regions of the number space needs the contents page and two chapters.

But be careful about what that buys, because this is where most explanations go wrong. **If a guest really did use every card number, the chapters plus the contents page would be slightly bigger than the original book**, not smaller. The saving is not in the structure. It is entirely in the fact that **you are allowed to not materialise the parts nobody uses**, and real address spaces are almost entirely holes.

---

### The proper terms

#### The address split

A **virtual address** is what the program computes with, and a **physical address** is where the data actually is. Here the virtual address is 32 bits, so the **virtual address space** is 4 GB, and the physical address is 28 bits, so the installed memory is 256 MB. The virtual space is 16 times larger than the physical one, which is the normal situation and the reason paging exists rather than a mistake in the question.

A **page** is a fixed-size block of the virtual address space; a **frame** is the same-sized block of physical memory. Here both are 4 KB, and they are always the same size, because a page is placed into a frame whole.

Every address divides into two parts with completely different fates:

The **page offset** is the position within the page. It is not translated; it is copied straight from the virtual address to the physical address. Its width is fixed entirely by the page size.

The **virtual page number**, or **VPN**, is the part that gets looked up. The lookup yields a **page frame number**, or **PFN**, and the physical address is the PFN concatenated with the original offset.

$$\text{virtual address} = \underbrace{\text{VPN}}_{\text{translated}} \,\|\, \underbrace{\text{offset}}_{\text{copied}}$$

#### The table

A **page table** is the per-process array mapping VPN to PFN. It is indexed by VPN, which is why its size is driven by the size of the virtual address space, not by how much memory the process actually uses. That single sentence is the source of the problem in part 3.

A **page table entry**, or **PTE**, is one row. It must hold the PFN plus the control bits: **valid**, **dirty**, **accessed** or referenced, protection bits for read, write and execute, a user or supervisor bit, and caching hints. A 4-byte PTE is only viable here because the PFN is 16 bits, leaving 16 bits for flags. On x86-64, where physical addresses reach 52 bits, the PTE has to be 8 bytes.

#### The hierarchy

A **multi-level** or **hierarchical page table** splits the VPN into several indices, each selecting an entry in a table that locates the next table down. The top level is usually called the **page directory**.

The key constraint, and the thing that makes the bit split a derivation rather than a choice: **each table must fit in exactly one page**, so that the allocator can hand them out like any other page and the tables themselves can be paged. The number of entries per table is therefore fixed:

`entries per table = page size / PTE size`

Here that is 4096 / 4 = 1024 entries, which is 10 bits of index. The VPN is 20 bits, so it splits 10 and 10, and **the number of levels is forced too**: 20 bits of VPN divided by 10 bits per level is exactly two levels. Nobody picked those numbers.

A **sparse address space** is one where most of the virtual range is unmapped, which is the ordinary case: a process has code low down, a heap above it, a stack at the top, and gigabytes of nothing in between. Hierarchical paging is valuable exactly in proportion to how much of that nothing there is, because **an absent second-level table costs nothing but a zero in the directory.**

#### The alternative worth naming

An **inverted page table** is indexed by physical frame rather than by virtual page, holding one entry per frame with the process and virtual page it currently contains. Its size scales with **physical memory**, so there is one table for the whole machine rather than one per process, and here it would be 65,536 entries rather than a million per process. The price is that forward translation now needs a search, so it requires a hash table and a hardware TLB to be usable at all, which is why it appears on architectures like PowerPC and IA-64 rather than on x86.

---

### Work it out

#### Given

| Quantity | Value | In bits |
| :--- | :---: | :---: |
| Virtual address space | 4 GB | 32 bits |
| Physical address space | 256 MB | 28 bits |
| Page and frame size | 4 KB | 12 bits |
| Page table entry | 4 bytes | |

#### Part 1: the page offset

The offset must address every byte within one page, and nothing more.

`page size = 4 KB = 4,096 bytes = 2^12 bytes`

$$\text{offset bits} = \log_2(\text{page size}) = \log_2(2^{12}) = \mathbf{12 \text{ bits}}$$

Two things follow that are worth stating because they are the commonest misunderstandings.

**The offset width depends only on the page size.** Not on the virtual address width, not on the physical address width, not on the PTE size. Change the address space to 64 bits and the offset is still 12 bits.

**The offset is identical in the virtual and physical address.** It is wired through, not translated. This is precisely why the page size and the frame size must be equal, and it is also why translation is cheap: only the top of the address is looked up.

#### Part 2: how many pages, how many frames

**Virtual side.** 32-bit address, 12 bits of offset:

`VPN bits = 32 - 12 = 20`

`virtual pages = 2^20 = 1,048,576`

**Physical side.** 28-bit address, 12 bits of offset:

`PFN bits = 28 - 12 = 16`

`physical frames = 2^16 = 65,536`

Check it against the capacities: 65,536 frames times 4 KB is 256 MB, which is `2^28`. Good.

| | Bits | Count | Capacity |
| :--- | :---: | :---: | :---: |
| Virtual pages | 20 | 1,048,576 | 4 GB |
| Physical frames | 16 | 65,536 | 256 MB |

**The ratio is 16 to 1.** There are sixteen virtual pages for every physical frame, so at most one page in sixteen can be resident, and the valid bit in the PTE is doing real work: most entries in a full page table describe pages that are not in memory, or do not exist at all.

The address layouts:

```
virtual address, 32 bits
 31                        12 11                 0
+----------------------------+--------------------+
|        VPN, 20 bits        |   offset, 12 bits  |
+----------------------------+--------------------+
              |                        |
       page table lookup          copied through
              |                        |
              v                        v
+------------------------+--------------------+
|      PFN, 16 bits      |   offset, 12 bits  |
+------------------------+--------------------+
 27                    12 11                 0
physical address, 28 bits
```

#### Part 3: the single-level page table, and why it is unusable

The table is indexed by VPN, so it needs one entry per possible virtual page whether that page exists or not.

`page table size = virtual pages * PTE size`
`                = 1,048,576 * 4 bytes`
`                = 4,194,304 bytes = ` **4 MB per process**

Now put that number next to the machine it has to run on, which is the step people skip.

**Physical memory is 256 MB. The page table is 4 MB. Per process.**

`256 MB / 4 MB = ` **64 processes**

At sixty-four processes, **one hundred percent of physical memory is page tables** and there is not one frame left for code, data or stacks. The system is not slow at that point, it cannot run at all. In practice it collapses long before: at 20 processes the tables consume 80 MB, which is 31% of all memory, spent entirely on bookkeeping for pages that mostly do not exist.

Three further objections, any one of which is fatal on its own:

**Contiguity.** A 4 MB flat table must occupy 1,024 physically contiguous frames, because it is indexed by arithmetic on the VPN. After the machine has been up for a while and memory is fragmented, the allocator may simply be unable to find a contiguous run that size, so **process creation fails for reasons unrelated to how much free memory there is.**

**The waste is near total.** A process using 16 MB of address space occupies 4,096 pages, so 4,096 of its 1,048,576 entries are valid. That is **0.39% occupancy**: 99.6% of the 4 MB is zeroes that must still be allocated, because the index arithmetic requires every slot to be present.

**It cannot be paged out.** The table is needed to translate addresses, so paging it to disk is circular. A flat table must be resident, permanently, all 4 MB of it.

#### Part 4: deriving the two-level split

The split is not a design choice, it is forced by one requirement: **each table must fit in exactly one page**, so tables can be allocated like any other page and can themselves be paged out.

`entries per table = page size / PTE size = 4,096 / 4 = 1,024 = 2^10`

So one page of table consumes exactly **10 bits** of index. The VPN is 20 bits. Therefore:

`20 bits of VPN / 10 bits per level = ` **2 levels, of 10 bits each**

```
 31              22 21              12 11                 0
+------------------+------------------+--------------------+
|   P1, 10 bits    |   P2, 10 bits    |   offset, 12 bits  |
+------------------+------------------+--------------------+
   page directory      page table          within the page
   index, 1024         index, 1024
   entries             entries

   P1 -> selects one of 1024 second-level tables
   P2 -> selects one of 1024 entries inside that table
   each second-level table covers 1024 * 4 KB = 4 MB of address space
```

Sanity check: 10 + 10 + 12 = 32 bits. And coverage: 1,024 directory entries, each covering 4 MB, is 4 GB. Both agree.

The same derivation on x86-64 gives the architecture you actually use. PTEs are 8 bytes, so entries per table is 4,096 / 8 = 512, which is 9 bits. The virtual address is 48 bits with 12 of offset, leaving 36 bits of VPN, and 36 / 9 is exactly **four levels**. The five-level variant extends the virtual address to 57 bits, adding 9 more. **The level count was never chosen; it fell out of page size divided by PTE size.**

#### Part 5: the savings, honestly computed

Here is the part that most worked solutions get wrong, so take the worst case first.

**Fully mapped, every page valid:**

| Structure | Size |
| :--- | :---: |
| Page directory | 1,024 entries x 4 B = 4 KB |
| Second-level tables | 1,024 tables x 4 KB = 4 MB |
| **Two-level total** | **4 MB + 4 KB** |
| Single-level total | 4 MB |

**The two-level table is 4 KB bigger.** If a process genuinely used all 4 GB of its address space, the hierarchy would cost slightly more and buy nothing except pageability. So the saving is not structural, and claiming the hierarchy is inherently smaller is simply false.

**The saving is entirely in sparsity.** Take a realistic process: 4 MB of code and data at the bottom of the address space, and 64 KB of stack at the top.

| Structure | Needed | Size |
| :--- | :--- | :---: |
| Page directory | always, 1 page | 4 KB |
| Second-level table for the low 4 MB | 1 table | 4 KB |
| Second-level table for the stack region | 1 table | 4 KB |
| **Two-level total** | | **12 KB** |
| Single-level total | | 4 MB |

`4 MB / 12 KB = ` **a 341-fold reduction**, or 99.7% of the table eliminated.

The mechanism is worth saying precisely: **1,022 of the 1,024 directory entries are marked invalid, and an invalid directory entry costs four bytes rather than a 4 KB table.** The address range it would have described is simply absent, and a reference into it faults at the directory level without any second-level table ever existing.

Scale it back to the machine. At 12 KB per process, the same 256 MB of physical memory supports **over 21,000 processes' worth of page tables** instead of 64, and the contiguity problem vanishes because nothing larger than a single 4 KB page is ever allocated. The tables can also be paged out, since a second-level table is an ordinary page.

| | Single-level | Two-level, sparse process |
| :--- | :---: | :---: |
| Table size per process | 4 MB | 12 KB |
| Processes before memory is exhausted | 64 | ~21,800 |
| Largest contiguous allocation needed | 4 MB | 4 KB |
| Can the table be paged out? | no | yes |
| Cost of a TLB miss | 2 memory accesses | 3 memory accesses |

That last row is the price, and it is the right note to end on: **the hierarchy trades time for space.** A TLB miss now walks two levels instead of one, so the miss path costs one extra memory access. That is an entirely acceptable trade because the TLB hit ratio is high, which is the hinge the whole design rests on.

#### Verify it

```python
"""
Address translation arithmetic: offset bits, page and frame counts,
flat page table size, the forced multi-level split, and the real saving.
"""

VA_BITS = 32
PA_BITS = 28
PAGE_SIZE = 4 * 1024          # bytes
PTE_SIZE = 4                  # bytes


def log2_exact(n):
    assert n > 0 and (n & (n - 1)) == 0, f"{n} is not a power of two"
    return n.bit_length() - 1


def human(n):
    for unit, size in (("GB", 1 << 30), ("MB", 1 << 20), ("KB", 1 << 10)):
        if n >= size and n % size == 0:
            return f"{n // size} {unit}"
    return f"{n} B"


if __name__ == "__main__":
    offset = log2_exact(PAGE_SIZE)
    vpn_bits = VA_BITS - offset
    pfn_bits = PA_BITS - offset
    v_pages = 1 << vpn_bits
    p_frames = 1 << pfn_bits

    print("-- Part 1: the offset depends only on the page size")
    print(f"  page size {human(PAGE_SIZE)} -> offset = {offset} bits")

    print("\n-- Part 2: pages and frames")
    print(f"  VPN {vpn_bits} bits -> {v_pages:,} virtual pages, "
          f"{human(v_pages * PAGE_SIZE)} of address space")
    print(f"  PFN {pfn_bits} bits -> {p_frames:,} physical frames, "
          f"{human(p_frames * PAGE_SIZE)} of memory")
    assert p_frames * PAGE_SIZE == 1 << PA_BITS
    print(f"  ratio: {v_pages // p_frames} virtual pages per physical frame")

    print("\n-- Part 3: the flat table, and the machine it has to live on")
    flat = v_pages * PTE_SIZE
    phys = 1 << PA_BITS
    print(f"  flat page table = {v_pages:,} x {PTE_SIZE} B = {human(flat)} "
          f"per process")
    print(f"  physical memory = {human(phys)}")
    print(f"  processes until memory is 100% page tables: {phys // flat}")
    used_mb = 16
    used_pages = used_mb * (1 << 20) // PAGE_SIZE
    print(f"  a process using {used_mb} MB has {used_pages:,} valid entries "
          f"of {v_pages:,} -> {100 * used_pages / v_pages:.2f}% occupancy")

    print("\n-- Part 4: the split is forced, not chosen")
    per_table = PAGE_SIZE // PTE_SIZE
    idx_bits = log2_exact(per_table)
    print(f"  entries per table = {PAGE_SIZE} / {PTE_SIZE} = {per_table} "
          f"= {idx_bits} bits of index")
    assert vpn_bits % idx_bits == 0
    levels = vpn_bits // idx_bits
    print(f"  VPN {vpn_bits} bits / {idx_bits} bits per level = {levels} levels")
    print(f"  check: {' + '.join([str(idx_bits)] * levels)} + {offset} = "
          f"{idx_bits * levels + offset} bits")
    print(f"  each level-2 table covers {human(per_table * PAGE_SIZE)} "
          f"of address space")

    print("\n  the same derivation on x86-64:")
    for name, va, pte in (("4-level", 48, 8), ("5-level LA57", 57, 8)):
        per = PAGE_SIZE // pte
        ib = log2_exact(per)
        vb = va - offset
        print(f"    {name:<13} PTE {pte} B -> {per} entries = {ib} bits; "
              f"VPN {vb} bits -> {vb / ib:.3g} levels")

    print("\n-- Part 5: fully mapped, the hierarchy is BIGGER")
    two_full = PAGE_SIZE + per_table * PAGE_SIZE
    print(f"  directory {human(PAGE_SIZE)} + {per_table} tables x "
          f"{human(PAGE_SIZE)} = {two_full:,} B")
    print(f"  flat = {flat:,} B, so the hierarchy costs "
          f"{two_full - flat:,} B more")

    print("\n-- Part 5: sparse, which is the real case")
    covered = per_table * PAGE_SIZE               # 4 MB per level-2 table
    regions = [("code and data, 4 MB low", 4 * (1 << 20)),
               ("stack, 64 KB high", 64 * (1 << 10))]
    tables = 0
    for label, span in regions:
        need = max(1, -(-span // covered))        # ceiling division
        tables += need
        print(f"  {label:<26} -> {need} level-2 table(s)")
    two_sparse = PAGE_SIZE + tables * PAGE_SIZE
    print(f"  total = directory + {tables} tables = {human(two_sparse)}")
    print(f"  against {human(flat)} flat -> {flat / two_sparse:.0f}x smaller, "
          f"{100 * (1 - two_sparse / flat):.1f}% eliminated")
    print(f"  invalid directory entries: {per_table - tables} of {per_table}, "
          f"each costing {PTE_SIZE} B instead of {human(PAGE_SIZE)}")
    print(f"  processes supported by {human(phys)}: "
          f"{phys // two_sparse:,} instead of {phys // flat}")
```

---

### What they ask next

**"What decides the number of offset bits?"**
The page size alone. `log2(4096)` is 12, and nothing else enters into it: not the virtual address width, not the physical address width, not the PTE size. The **page offset** is also copied unchanged from the virtual address into the physical address rather than being translated, which is exactly why a **page** and a **frame** must be the same size.

**"Why is the page table 4 MB when the process only uses a few megabytes?"**
Because a flat **page table** is **indexed by the virtual page number**, so a slot must exist for every possible VPN whether or not that page is mapped. The index is computed arithmetically, so the array cannot be sparse. A process using 16 MB has 4,096 valid entries out of 1,048,576, which is 0.39% occupancy, and the other 99.6% is zeroes you are obliged to allocate.

**"Put that 4 MB in context."**
Physical memory is 256 MB and the table is 4 MB per process, so at **64 processes the entire machine is page tables** with nothing left for code, data or stacks. That is the number that makes the argument, because it is exact and it comes from the question's own figures. It also fails earlier for other reasons: the table needs 1,024 **physically contiguous** frames, so process creation can fail from fragmentation alone, and it cannot be paged out because it is needed to translate addresses.

**"Why exactly 10 bits and 10 bits?"**
Because each table must fit in one page so it can be allocated and paged like any other, which fixes entries per table at `page size / PTE size` = 4,096 / 4 = 1,024, and 1,024 entries is 10 bits of index. The VPN is 20 bits, so 20 / 10 gives exactly **two levels of 10 bits**. **Nothing was chosen.** The same arithmetic on x86-64 gives 4,096 / 8 = 512 entries, 9 bits per level, and a 48-bit virtual address with 12 of offset leaves 36 bits, so 36 / 9 forces four levels.

**"How much memory does the two-level table actually save?"**
If every page is mapped, **none at all**: 4 KB of **page directory** plus 1,024 tables of 4 KB each is 4 MB plus 4 KB, slightly worse than flat. The saving comes entirely from the **sparse address space**. For a process with 4 MB of code and data plus a stack, you need the directory and two second-level tables, so 12 KB against 4 MB, a 341-fold reduction. The mechanism is that 1,022 directory entries are marked **invalid** and an invalid entry costs 4 bytes rather than a 4 KB table.

**"What does the hierarchy cost?"**
One extra memory access per TLB miss, because the walk now reads the directory and then the table rather than just the table. That is why this question is usually paired with an effective-access-time calculation: the trade is acceptable only because the TLB hit ratio is high, so the miss path is rare. It also solves the contiguity problem as a side effect, since nothing bigger than one 4 KB page is ever allocated, and it makes the second-level tables pageable.

**"What is in the 4 bytes of a PTE?"**
The 16-bit **PFN** plus flags, which leaves 16 bits for the rest: **valid**, **dirty**, **accessed**, read/write/execute protection, user or supervisor, and caching behaviour. The sizing is only possible because the physical address is 28 bits. On x86-64 with physical addresses up to 52 bits the PFN alone needs 40 bits, so the PTE must be 8 bytes, which is why that architecture gets 512 entries per table rather than 1,024.

**"Is there an alternative to a per-process table?"**
An **inverted page table**, indexed by physical frame rather than by virtual page, with one entry per frame recording which process and virtual page occupies it. Its size scales with physical memory, so there is one table for the whole system: 65,536 entries here instead of a million per process. The cost is that forward translation becomes a search rather than an index, so it needs a hash table and depends heavily on the TLB, which is why it appears on PowerPC and IA-64 rather than on x86.

**"The virtual space is 16 times the physical space. Is that a problem?"**
No, it is the point. There are 1,048,576 virtual pages and 65,536 frames, so at most one page in sixteen can be resident, and the **valid** bit is doing real work: most entries in a fully populated table describe pages that are not in memory or do not exist. That ratio is why demand paging and a replacement policy are needed at all, and in a modern 64-bit system the ratio is far more extreme.

**The common wrong answer** is claiming the two-level table is smaller by construction. Fully mapped it is 4 KB larger, and the entire saving comes from not materialising tables for unused ranges. The second is computing the flat table size and stopping, without putting 4 MB next to the 256 MB of installed memory, which is where the 64-process figure makes the argument land. The third is treating the 10 and 10 split as a design decision rather than deriving it from page size divided by PTE size, which is the question most likely to follow.

---

### Say this in the interview

*"A word on the shape first: the virtual address space here is thirty-two bits, so 4 GB, and the physical one is twenty-eight bits, so 256 MB, which means the virtual space is sixteen times the physical. That asymmetry is the normal case and the reason paging exists at all. The offset next, because it is the only part that depends on nothing else. A 4 KB page is two to the twelve bytes, so the page offset is twelve bits, and that figure comes from the page size alone, not from the virtual or physical address width. The offset is also copied straight through from the virtual address to the physical address rather than being translated, which is exactly why a page and a frame have to be the same size.*

*So the thirty-two bit virtual address splits into a twenty bit virtual page number, the VPN, and a twelve bit offset, giving two to the twenty, or 1,048,576 virtual pages covering 4 GB. The twenty-eight bit physical address splits into a sixteen bit page frame number, the PFN, and the same twelve bit offset, giving 65,536 frames covering 256 MB, which checks out as two to the twenty-eight. That is sixteen virtual pages per physical frame, so at most one page in sixteen can be resident and the valid bit in the page table entry is doing real work.*

*The flat page table is indexed by virtual page number, so it needs a slot for every possible page whether it is mapped or not, because the index is computed arithmetically and the array cannot be sparse. That is 1,048,576 entries times four bytes, which is 4 MB per process.*

*Now the step I think matters most, which is putting that next to the machine. Physical memory is 256 MB and the table is 4 MB per process, so at sixty-four processes one hundred percent of memory is page tables and there is not a single frame left for code, data or stacks. The system does not get slow, it cannot run. And it fails earlier for two other reasons: the table needs 1,024 physically contiguous frames because of the index arithmetic, so process creation can fail from fragmentation even when there is plenty of free memory, and it cannot be paged out because it is the thing you need in order to translate addresses. Also the waste is near total: a process using 16 MB has 4,096 valid entries out of a million, which is nought point three nine percent occupancy.*

*For the multi-level fix, which is to say a hierarchical page table, I would derive the split rather than assert it, because that is the likely follow-up. The requirement is that each table fits in exactly one page, so it can be allocated like any other page and can itself be paged out. That fixes entries per table at page size over PTE size, so 4,096 over 4 is 1,024 entries, which is ten bits of index. The virtual page number is twenty bits, so twenty over ten is exactly two levels of ten bits each, and ten plus ten plus twelve is thirty-two. Nothing was chosen. The same arithmetic on x86-64 has eight byte PTEs, so 4,096 over 8 is 512 entries, nine bits per level, and a forty-eight bit virtual address less twelve of offset leaves thirty-six, so thirty-six over nine forces four levels. Each second-level table here covers 1,024 pages times 4 KB, which is 4 MB of address space, and 1,024 directory entries times 4 MB is 4 GB, so the coverage agrees.*

*On the savings I would be careful, because this is where most answers overclaim. If every page were mapped, the hierarchy is 4 KB of page directory plus 1,024 tables of 4 KB, which is 4 MB plus 4 KB, so it is slightly bigger than flat and buys nothing but pageability. The saving is entirely in sparsity. Take a realistic process with 4 MB of code and data low down and a 64 KB stack at the top, which is what a sparse address space actually looks like: that needs the directory plus two second-level tables, so 12 KB against 4 MB, which is a 341-fold reduction. The mechanism is that 1,022 of the 1,024 directory entries are marked invalid, and an invalid directory entry costs four bytes rather than a 4 KB table, so the address range it would describe is simply absent and a reference into it faults at the directory level. Scaled back to the machine, 12 KB per process means 256 MB supports over twenty thousand processes' worth of tables instead of sixty-four, and the contiguity problem disappears because nothing bigger than one page is ever allocated.*

*The cost is one extra memory access per TLB miss, since the walk reads the directory and then the table. That is the trade, time for space, and it is only acceptable because the TLB hit ratio is high enough that the miss path is rare. If they want the alternative, an inverted page table is indexed by physical frame instead, so it scales with physical memory and there is one for the whole system, 65,536 entries rather than a million per process, but forward translation becomes a search, so it needs a hash table and leans hard on the TLB, which is why it turns up on PowerPC rather than x86. And on what is in the four bytes: the sixteen bit frame number plus flags, the valid bit, dirty, accessed, read, write and execute protection, user or supervisor, and caching, which fits only because the physical address is twenty-eight bits. On x86-64 the frame number alone needs forty bits, so the PTE has to be eight bytes."*
