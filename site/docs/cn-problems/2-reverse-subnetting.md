---
id: 2-reverse-subnetting
title: "Reverse Subnetting: Designing the Mask, FLSM and VLSM"
description: "One department's requirement setting everyone's mask, 2% utilisation at the bottom, and the alignment proof that explains why you allocate largest first"

sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A company is allocated the private network block `172.16.0.0/16` and must divide it to accommodate 6 departments, where the largest department requires up to 1,000 hosts. (1) Determine the optimal fixed subnet mask (FLSM), (2) calculate total subnets generated and evaluate address space waste, and (3) design an efficient Variable-Length Subnet Mask (VLSM) allocation for varied department sizes."

---

### Picture it

A warehouse you have to partition into rooms, where the only walls available come in widths of 32, 64, 128, 256 feet and so on, doubling.

**That constraint is the entire problem.** A department needing 1,000 feet of floor cannot have 1,000; it gets 1,024, because there is no 1,000-foot wall. Every requirement is rounded up to the next power of two, and the gap between what was asked for and what was installed is waste you cannot recover by being cleverer. It is the floor on how well you can possibly do.

Now the question is how you choose the walls, and there are two answers that differ enormously.

**The first is to pick one width and use it everywhere.** It is appealing because every room is identical, so anyone navigating the building needs to learn one rule. But the width has to accommodate the biggest department, so **the biggest department sets everyone's room size.** The team of twenty gets a room built for a thousand. They do not use more of it; they simply occupy 2% of a room nobody else can have. Repeat that five times and most of your floor is sitting inside rooms, unused and unavailable.

**The second is to size each room to its department.** Obviously better, and the interesting part is not that it is better but that it has a rule attached: **build the biggest room first.** Textbooks state this and move on, which leaves it looking like a heuristic. It is not; it is forced, and the reason is worth more than the rule.

Every room has to start at a multiple of its own width. A 1,024-foot room cannot begin at foot 128, because the room's address is defined by having all its internal position bits at zero, and 128 does not have ten zero bits at the bottom. So if you build the 128-foot room first and then go to build the 1,024-foot one, the big room cannot start until foot 1,024, and **the 896 feet in between are stranded**: too narrow for anything large, and nobody small is queued to take them.

Go in decreasing order and that never happens, for a reason you can see on your fingers. After you have placed rooms of 1,024 and 512, you are standing at foot 1,536, and the next room is 256 wide. Is 1,536 a multiple of 256? It must be, because 1,024 and 512 are both multiples of 256 and a sum of multiples is a multiple. **Every width you have already used is a multiple of every width still to come**, so the position you are standing at is always already aligned, and no gap is ever created. Not a heuristic. A proof.

---

### The proper terms

#### The two directions

**Forward subnetting** gives you an address and a mask and asks for the boundaries, which is reading punctuation someone else wrote. **Reverse subnetting** gives you requirements and asks for the mask, which is deciding where the punctuation goes. The arithmetic is the same; the direction of inference is not, and the second one has design judgement in it.

#### The host requirement, and which way to size

Everything starts from the number of **host bits**, `h`, the smallest value satisfying:

$$2^h - 2 \ge \text{required hosts}$$

The minus two is the network and broadcast addresses, as always. The **prefix** is then `32 - h`.

**Size for the host requirement, not the subnet count.** If you size by "I need 6 subnets, so borrow 3 bits", you have let the easy constraint drive the hard one, and you may land on a mask whose host capacity is below what a department actually needs, which is unfixable without renumbering. Host counts are a hard floor; subnet counts are usually satisfied comfortably as a side effect.

#### FLSM and VLSM

**Fixed-length subnet masking**, FLSM, applies one prefix to every subnet. Simple, uniform, and **the largest department's requirement is imposed on every department.**

**Variable-length subnet masking**, VLSM, gives each subnet its own prefix. Standardised in the CIDR era and described in **RFC 1878**, it requires **classless routing protocols** that carry a mask with every route, which is why RIPv2, OSPF, EIGRP and BGP support it and RIPv1 and IGRP could not. That compatibility gap, not any technical merit, is why FLSM designs persisted as long as they did.

#### Natural alignment

A subnet's **network address must have all host bits zero**, so a block of size `2^h` can only begin at an address that is a multiple of `2^h`. This is **natural alignment**, and it is the only structural constraint in VLSM design. Every rule you have heard about allocation order is a consequence of it.

#### Two kinds of waste, which should not be added together

**Internal waste** is addresses inside an allocated subnet that no host will ever use. A `/22` given to a 20-host department wastes 1,002 addresses, and those addresses are genuinely unavailable: they belong to a subnet that has been assigned.

**External space** is subnets that were created but not handed out. Under FLSM here that is 58 unused `/22` blocks, and **calling this waste is a mistake.** Those blocks are contiguous, unassigned and available for the next department, branch or data centre. They are inventory, not loss, and an answer that adds them to the waste figure to make FLSM look worse has misunderstood what the number means.

**Stranded space** is the third category and the one the allocation order controls: addresses left in gaps between allocated blocks, too small or badly positioned to be used by what remains. Largest-first allocation reduces this to zero.

#### What contiguity buys you afterwards

Allocating largest-first and contiguously means the whole design occupies one compact range, which permits **route summarisation**, also called aggregation: a single prefix advertised upstream in place of six. That shrinks routing tables and, more importantly, hides internal renumbering from the rest of the network. It is a real operational benefit of tidy allocation and a good thing to mention unprompted.

---

### Work it out

#### Given

| Quantity | Value |
| :--- | :--- |
| Allocated block | `172.16.0.0/16`, 65,536 addresses |
| Departments | 6 |
| Largest department | 1,000 hosts |

#### Part 1: the FLSM mask

**Step 1: host bits.**

| `h` | `2^h - 2` | Enough for 1,000? |
| :---: | :---: | :--- |
| 9 | 510 | no |
| **10** | **1,022** | **yes** |

So `h = 10`.

**Step 2: prefix and mask.**

`prefix = 32 - 10 = ` **/22**

```
/22  =  11111111.11111111.11111100.00000000  =  255.255.252.0
        |--------- 22 network ------|- 10 -|
```

**Step 3: how many subnets that creates.**

`borrowed bits = 22 - 16 = 6`, so `2^6 = ` **64 subnets** of 1,022 usable hosts each.

The requirement was 6 subnets and 64 are available, so the constraint is satisfied with room to spare. Note the asymmetry worth pointing out: **the host requirement was tight and the subnet requirement was not.** 1,022 against 1,000 is 97.8% utilised; 6 of 64 subnets is 9.4% consumed. That is the normal shape of these problems and it is why you size on hosts.

#### Part 2: where the FLSM waste actually is

Every department gets a `/22`, 1,024 addresses, 1,022 usable, regardless of size. Take the six departments from part 3:

| Dept | Hosts needed | Usable in a `/22` | Wasted | Utilisation |
| :--- | :---: | :---: | :---: | :---: |
| A Engineering | 1,000 | 1,022 | 22 | **97.8%** |
| B Sales | 500 | 1,022 | 522 | 48.9% |
| C Operations | 200 | 1,022 | 822 | 19.6% |
| D Marketing | 100 | 1,022 | 922 | 9.8% |
| E Finance | 50 | 1,022 | 972 | 4.9% |
| F Executive | 20 | 1,022 | 1,002 | **2.0%** |

**That table is the answer to part 2.** The design is efficient for exactly one department, the one that set the mask, and collapses to 2% utilisation for the smallest. Total consumption is `6 x 1,024 = ` **6,144 addresses** to serve 1,870 hosts.

Now the part that candidates get wrong. The 58 subnets that were created but not assigned total `58 x 1,024 = 59,392` addresses, and **those are not waste.** They are contiguous, unassigned, and immediately available for the seventh department. Adding them to the waste figure inflates it fifteenfold and misrepresents the situation. **The waste is internal, it is 4,262 addresses of usable-but-unused capacity, and it is inside subnets that have already been handed out.**

#### Part 3: the VLSM design

Requirements, sorted largest first, which part 4 justifies:

| Dept | Hosts | `h` | Capacity `2^h - 2` | Prefix | Size |
| :--- | :---: | :---: | :---: | :---: | :---: |
| A Engineering | 1,000 | 10 | 1,022 | `/22` | 1,024 |
| B Sales | 500 | 9 | 510 | `/23` | 512 |
| C Operations | 200 | 8 | 254 | `/24` | 256 |
| D Marketing | 100 | 7 | 126 | `/25` | 128 |
| E Finance | 50 | 6 | 62 | `/26` | 64 |
| F Executive | 20 | 5 | 30 | `/27` | 32 |

Allocating from `172.16.0.0` with a running cursor:

| Dept | Prefix | Mask | Network | Host range | Broadcast |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **A** | `/22` | 255.255.252.0 | `172.16.0.0` | `172.16.0.1` to `172.16.3.254` | `172.16.3.255` |
| **B** | `/23` | 255.255.254.0 | `172.16.4.0` | `172.16.4.1` to `172.16.5.254` | `172.16.5.255` |
| **C** | `/24` | 255.255.255.0 | `172.16.6.0` | `172.16.6.1` to `172.16.6.254` | `172.16.6.255` |
| **D** | `/25` | 255.255.255.128 | `172.16.7.0` | `172.16.7.1` to `172.16.7.126` | `172.16.7.127` |
| **E** | `/26` | 255.255.255.192 | `172.16.7.128` | `172.16.7.129` to `172.16.7.190` | `172.16.7.191` |
| **F** | `/27` | 255.255.255.224 | `172.16.7.192` | `172.16.7.193` to `172.16.7.222` | `172.16.7.223` |

```
172.16.0.0                                                   172.16.7.224
|                                                                       |
|<-------- A /22 -------->|<-- B /23 -->|<-C /24->|<D /25>|<E>|<F>|
 1024 addresses            512           256       128     64  32
                                                                  ^
                                            everything above here is free
```

**The complete accounting**, which is a strong way to present the result because every address is categorised:

| Category | Addresses |
| :--- | :---: |
| Hosts actually required | 1,870 |
| Power-of-two rounding overshoot | 134 |
| Network and broadcast reserves, 2 per subnet | 12 |
| **Total consumed** | **2,016** |

Against FLSM's 6,144, VLSM consumes 2,016, a saving of **4,128 addresses, or 67.2%**, and the entire saving is internal waste eliminated.

Note what is left over in that accounting: **134 addresses of rounding and 12 of reserves, 146 in total, is the irreducible floor.** No allocation scheme does better, because you can only buy powers of two and every subnet needs its two reserved patterns. Quoting that figure shows you know where the remaining inefficiency comes from rather than implying VLSM is perfect.

#### Part 4: why largest first, with the proof

The constraint is **natural alignment**: a block of size `2^h` must start at a multiple of `2^h`, because the network address needs all host bits zero.

**The claim.** If blocks are allocated in non-increasing order of size, and all sizes are powers of two, then every block lands already aligned and no address is ever stranded.

**The proof.** Sizes are powers of two in non-increasing order, so each earlier size is a multiple of every later size. The cursor after placing the first `i` blocks is the sum of their sizes, which is a sum of multiples of `S(i+1)` and therefore itself a multiple of `S(i+1)`. So the cursor is already a multiple of the next block's size, no padding is needed, and the next block starts exactly where the last one ended.

Checking it against the allocation above:

| Before | Cursor | Next size | `cursor mod size` |
| :---: | :---: | :---: | :---: |
| A | 0 | 1,024 | 0 |
| B | 1,024 | 512 | 0 |
| C | 1,536 | 256 | 0 |
| D | 1,792 | 128 | 0 |
| E | 1,920 | 64 | 0 |
| F | 1,984 | 32 | 0 |

Zero every time, so the footprint is exactly `1024 + 512 + 256 + 128 + 64 + 32 = 2,016` with no gaps.

**Now break the rule, to see what it costs.** Allocate D's `/25` first and then A's `/22`:

| Dept | Size | Cursor before | Padding needed | Network |
| :--- | :---: | :---: | :---: | :--- |
| D | 128 | 0 | 0 | `172.16.0.0` |
| **A** | 1,024 | 128 | **896** | `172.16.4.0` |
| B | 512 | 1,152 | 0 | `172.16.8.0` |
| C | 256 | 1,664 | 0 | `172.16.10.0` |
| E | 64 | 1,920 | 0 | `172.16.11.0` |
| F | 32 | 1,984 | 0 | `172.16.11.64` |

A's `/22` cannot start at 128, so it waits for 1,024, and **896 addresses are stranded**: 44% more than the `/22` A actually needed, sitting in a hole too narrow for a `/22` and with nothing small left to fill it. The footprint grows from 2,016 to 2,912, and across all 720 possible orderings the worst strands 1,568.

Interestingly, allocating strictly **smallest** first strands only 32 addresses here, because a run of doubling sizes happens to pack neatly upward. **That is luck, not a principle**, and the honest statement is that largest-first is the only order guaranteed to strand nothing for any set of requirements.

#### Part 5: what the tidy allocation buys afterwards

The whole design occupies `172.16.0.0` through `172.16.7.223`, which fits inside a single `/21` block (`172.16.0.0/21`, covering `172.16.0.0` to `172.16.7.255`).

That permits **route summarisation**: the site advertises one `/21` upstream instead of six separate prefixes. Six routing table entries become one, and subsequent internal renumbering is invisible outside the site. **This is a genuine benefit of allocating contiguously from one end**, and it would have been impossible with the fragmented layout from part 4, where the footprint sprawls to `172.16.11.95` and no single prefix covers it tightly.

#### Part 6: the case VLSM was invented for

Nothing above accounts for router-to-router links, which need exactly two addresses each. Under FLSM:

| Prefix for a 2-host link | Usable | Wasted |
| :---: | :---: | :---: |
| `/22` | 1,022 | **1,020** |
| `/30` | 2 | 0 |
| `/31`, per RFC 3021 | 2 | 0 |

A `/22` for a two-address link wastes 1,020 addresses on a single cable. **This is the clearest illustration of why VLSM exists**, and in a real design the point-to-point links would take `/30` or `/31` blocks carved from the tail of the allocation, below department F.

#### Verify it

```python
"""
Reverse subnetting: FLSM sizing, the internal waste it causes, a VLSM
allocation, and a proof by construction that largest-first strands nothing.
"""

PARENT = "172.16.0.0"
PARENT_PREFIX = 16
DEPTS = [("A Engineering", 1000), ("B Sales", 500), ("C Operations", 200),
         ("D Marketing", 100), ("E Finance", 50), ("F Executive", 20)]


def to_int(dotted):
    a, b, c, d = (int(x) for x in dotted.split('.'))
    return (a << 24) | (b << 16) | (c << 8) | d


def to_dotted(n):
    return '.'.join(str((n >> s) & 0xFF) for s in (24, 16, 8, 0))


def size_for(hosts):
    """Smallest power-of-two block with 2^h - 2 >= hosts."""
    h = next(x for x in range(1, 17) if 2**x - 2 >= hosts)
    return h, 1 << h, 32 - h


def allocate(order, base=to_int(PARENT)):
    """Place each block naturally aligned; report any padding as stranded."""
    cursor, rows, stranded = base, [], 0
    for name, hosts in order:
        h, size, prefix = size_for(hosts)
        pad = (-cursor) % size              # align up to a multiple of size
        stranded += pad
        cursor += pad
        rows.append({"name": name, "hosts": hosts, "prefix": prefix,
                     "size": size, "net": cursor, "bcast": cursor + size - 1,
                     "pad": pad})
        cursor += size
    return rows, cursor - base, stranded


if __name__ == "__main__":
    print("-- Part 1: FLSM sizing from the largest department")
    largest = max(h for _, h in DEPTS)
    for h in range(8, 12):
        ok = "yes" if 2**h - 2 >= largest else "no"
        print(f"   h = {h:<3} 2^h - 2 = {2**h - 2:>6}   enough for "
              f"{largest}? {ok}")
    h, size, prefix = size_for(largest)
    borrowed = prefix - PARENT_PREFIX
    print(f"   h = {h}, prefix /{prefix}, mask "
          f"{to_dotted((0xFFFFFFFF << h) & 0xFFFFFFFF)}")
    print(f"   borrowed {borrowed} bits -> {2**borrowed} subnets of "
          f"{size - 2} usable hosts")
    print(f"   host side {100*largest/(size-2):.1f}% utilised, "
          f"subnet side {100*len(DEPTS)/2**borrowed:.1f}% consumed")

    print("\n-- Part 2: FLSM internal waste, per department")
    flsm_total = len(DEPTS) * size
    internal = 0
    for name, hosts in DEPTS:
        w = (size - 2) - hosts
        internal += w
        print(f"   {name:<15} needs {hosts:>5}, has {size-2:>5}, "
              f"wastes {w:>5}  ({100*hosts/(size-2):5.1f}% utilised)")
    print(f"   consumed {flsm_total} addresses to serve "
          f"{sum(h for _, h in DEPTS)} hosts")
    print(f"   internal waste {internal}")
    spare = 2**borrowed - len(DEPTS)
    print(f"   {spare} subnets ({spare * size} addresses) unassigned: "
          f"that is RESERVE, not waste")

    print("\n-- Part 3: VLSM, largest first")
    order = sorted(DEPTS, key=lambda d: -d[1])
    rows, consumed, stranded = allocate(order)
    for r in rows:
        print(f"   {r['name']:<15} /{r['prefix']}  {to_dotted(r['net']):<14} "
              f"hosts {to_dotted(r['net']+1)} to {to_dotted(r['bcast']-1)}  "
              f"bcast {to_dotted(r['bcast'])}")
    need = sum(h for _, h in DEPTS)
    reserves = 2 * len(DEPTS)
    overshoot = consumed - need - reserves
    print(f"\n   hosts required            {need:>6}")
    print(f"   power-of-two overshoot    {overshoot:>6}")
    print(f"   network/broadcast pairs   {reserves:>6}")
    print(f"   total consumed            {consumed:>6}")
    assert need + overshoot + reserves == consumed
    print(f"   against FLSM's {flsm_total}: saves {flsm_total - consumed} "
          f"({100*(flsm_total-consumed)/flsm_total:.1f}%)")
    print(f"   stranded by misalignment: {stranded}")
    print(f"   irreducible floor (overshoot + reserves): "
          f"{overshoot + reserves}")

    print("\n-- Part 4: why largest first; the cursor is always pre-aligned")
    cursor = to_int(PARENT)
    for name, hosts in order:
        _, sz, _ = size_for(hosts)
        print(f"   before {name:<15} cursor offset "
              f"{cursor - to_int(PARENT):>5}, size {sz:>5}, "
              f"cursor mod size = {(cursor - to_int(PARENT)) % sz}")
        assert (cursor - to_int(PARENT)) % sz == 0, "alignment proof failed"
        cursor += sz

    print("\n   break the rule: D's /25 before A's /22")
    bad = [("D Marketing", 100), ("A Engineering", 1000), ("B Sales", 500),
           ("C Operations", 200), ("E Finance", 50), ("F Executive", 20)]
    brows, bconsumed, bstranded = allocate(bad)
    for r in brows:
        note = f"   <-- {r['pad']} stranded" if r["pad"] else ""
        print(f"     {r['name']:<15} /{r['prefix']}  "
              f"{to_dotted(r['net']):<14}{note}")
    print(f"     footprint {bconsumed} against {consumed}, "
          f"{bstranded} stranded")

    print("\n   every ordering, for completeness:")
    from itertools import permutations
    worst = max(permutations(DEPTS), key=lambda o: allocate(list(o))[2])
    best = min(permutations(DEPTS), key=lambda o: allocate(list(o))[2])
    print(f"     best  stranded {allocate(list(best))[2]:>4}: "
          f"{[n.split()[0] for n, _ in best]}")
    print(f"     worst stranded {allocate(list(worst))[2]:>4}: "
          f"{[n.split()[0] for n, _ in worst]}")
    assert allocate(list(order))[2] == 0

    print("\n-- Part 5: the footprint fits one summary prefix")
    end = to_int(PARENT) + consumed - 1
    for p in range(22, 16, -1):
        blk = 1 << (32 - p)
        if to_int(PARENT) % blk == 0 and consumed <= blk:
            print(f"   {to_dotted(to_int(PARENT))}/{p} covers "
                  f"{to_dotted(to_int(PARENT))} to "
                  f"{to_dotted(to_int(PARENT) + blk - 1)}")
            print(f"   the design ends at {to_dotted(end)}, so one /{p} "
                  f"summarises all {len(DEPTS)} departments")
            break

    print("\n-- Part 6: a 2-host router link under each prefix")
    for p in (22, 30, 31):
        usable = 2 if p == 31 else (1 << (32 - p)) - 2
        print(f"   /{p:<3} {usable:>5} usable for 2 needed, "
              f"{usable - 2:>5} wasted"
              + ("   RFC 3021" if p == 31 else ""))
```

---

### What they ask next

**"Why size on hosts rather than on the number of subnets?"**
Because the host count is a hard floor and the subnet count usually is not. Sizing by "I need 6 subnets so I borrow 3 bits" gives a `/19` with 8,190 hosts, which happens to work here but in general can land on a mask whose host capacity is below what a department needs, and that is unfixable without renumbering. Here the host side came out 97.8% utilised and the subnet side 9.4% consumed, **which is the normal shape: the host constraint binds and the subnet constraint does not.**

**"How much does FLSM actually waste?"**
4,262 addresses of **internal waste**, spread across the five departments that did not set the mask. The per-department utilisation runs from 97.8% for Engineering down to **2.0% for the 20-host Executive department**, which holds a `/22` of 1,022 usable addresses. Total consumption is 6,144 addresses to serve 1,870 hosts.

**"And the 58 unused subnets?"**
**Not waste.** They are contiguous, unassigned and immediately available for the next department or branch, which makes them reserve rather than loss. Adding their 59,392 addresses to the waste figure inflates it about fifteenfold and misreads what the number is. The waste that matters is the kind sitting inside subnets that have already been handed out.

**"Give the VLSM accounting."**
1,024 + 512 + 256 + 128 + 64 + 32 = **2,016 addresses** against FLSM's 6,144, a saving of 4,128 or **67.2%**. The full breakdown is 1,870 addresses of actual requirement, 134 of power-of-two rounding overshoot, and 12 of network and broadcast reserves at two per subnet. **The 146 non-host addresses are the irreducible floor** that no scheme beats, because you can only buy powers of two and every subnet needs its reserved pair.

**"Why allocate largest first? Prove it."**
Because of **natural alignment**: a block of size `2^h` must start at a multiple of `2^h`, since the network address needs all host bits zero. If sizes are powers of two in non-increasing order, then every size already used is a multiple of every size still to come, so the cursor, being a sum of those sizes, is **always already a multiple of the next block's size**. No padding is ever needed and nothing is stranded. It is a proof rather than a heuristic, and that is the answer the question is fishing for.

**"What does breaking the rule cost?"**
Allocate the `/25` before the `/22` and the `/22` cannot start at offset 128, so it waits for 1,024 and **896 addresses are stranded** in a hole too narrow for a `/22` with nothing small left to fill it. The footprint grows from 2,016 to 2,912. Worth noting honestly that strictly smallest-first strands only 32 here, because this particular run of doubling sizes packs neatly; **that is luck, and largest-first is the only order guaranteed to strand nothing for arbitrary requirements.**

**"What does VLSM cost you?"**
Operational complexity, and historically compatibility. Each subnet has a different mask, so the routing protocol must carry a mask with every route, which requires a **classless** protocol: RIPv2, OSPF, EIGRP or BGP. RIPv1 and IGRP advertised networks without masks and could not support it, which is why FLSM designs survived long after VLSM was described in **RFC 1878**. Troubleshooting is also harder when no two subnets share a boundary rule.

**"Does the tidy allocation buy anything beyond the saved addresses?"**
Yes, **route summarisation**. The whole design occupies `172.16.0.0` to `172.16.7.223`, which fits inside one `/21`, so the site advertises a single prefix upstream instead of six. Six routing entries become one and internal renumbering becomes invisible outside the site. The fragmented layout from part 4 sprawls past `172.16.11.64` and no single prefix covers it tightly, so allocation order affects routing table size as well as address consumption.

**"What about the router-to-router links?"**
They need two addresses each and nothing above accounts for them. A `/22` for a two-address link wastes 1,020 addresses on one cable, which is the single clearest argument for VLSM. In practice they take `/30` blocks, or `/31` under **RFC 3021**, carved from the tail of the allocation below the smallest department, where they also preserve the summarisability of the whole range.

**The common wrong answer** is sizing from the subnet count instead of the host count, which works on this problem and fails on the next one. Next is reporting the 58 unassigned subnets as wasted address space, which confuses reserve with loss. Third is presenting largest-first as a convention rather than deriving it from natural alignment, since the derivation is short and is what distinguishes a designed answer from a remembered one. And last is quoting the 67.2% saving as though VLSM were lossless, when 146 addresses of rounding and reserves remain and saying so is more convincing than not.

---

### Say this in the interview

*"Reverse subnetting is the direction where I am handed requirements and have to choose the mask, rather than being handed a mask and reading off boundaries. And the constraint that shapes everything is that subnet sizes are powers of two, so every requirement gets rounded up. A department needing a thousand hosts cannot have a thousand; it gets a block of 1,024, and the gap is waste no cleverness recovers. That is the floor on how well any design can do.*

*For the fixed mask, I size on the host requirement, not the subnet count. Two to the nine minus two is 510, not enough for a thousand; two to the ten minus two is 1,022, which is. So ten host bits, a slash twenty-two, mask 255.255.252.0. From a slash sixteen that borrows six bits, giving sixty-four subnets of 1,022 usable hosts. I would point out the asymmetry: the host side is 97.8% utilised and the subnet side only 9.4% consumed, and that is the normal shape of these problems, which is exactly why you size on hosts. Sizing by subnet count lets the easy constraint drive the hard one, and you can land on a mask whose host capacity is below what a department needs, which is unfixable without renumbering.*

*On the waste, I want to separate two things that often get added together. The internal waste is real: every department gets 1,022 usable regardless of size, so Engineering at a thousand hosts is 97.8% utilised, Sales at five hundred is 48.9%, and the twenty-person Executive department sits at 2.0%, holding 1,022 addresses to use twenty. That is 4,262 addresses wasted inside subnets that have been handed out. But the fifty-eight subnets that were created and not assigned, which is fifty-nine thousand addresses, are not waste. They are contiguous, unassigned, and available for the next department or branch. They are reserve. Counting them as waste inflates the figure about fifteenfold and misreads what it means.*

*For the VLSM design I size each department separately: Engineering a slash twenty-two, Sales a slash twenty-three, Operations a slash twenty-four, Marketing a slash twenty-five, Finance a slash twenty-six, Executive a slash twenty-seven. Allocating from 172.16.0.0 in that order gives Engineering 172.16.0.0, Sales 172.16.4.0, Operations 172.16.6.0, Marketing 172.16.7.0, Finance 172.16.7.128 and Executive 172.16.7.192. Total consumed is 1,024 plus 512 plus 256 plus 128 plus 64 plus 32, which is 2,016, against FLSM's 6,144, so a saving of 4,128 addresses or 67.2%. And I would give the full accounting rather than just the saving: 1,870 addresses of actual requirement, 134 of power-of-two overshoot, and 12 of network and broadcast reserves at two per subnet. Those 146 non-host addresses are the irreducible floor; no scheme beats them.*

*The part I would make sure to get to is why you allocate largest first, because that is usually stated as a rule and it is actually a proof. The constraint is natural alignment: a block of size two to the h has to start at a multiple of two to the h, because the network address needs all host bits zero. Now, if the sizes are powers of two in non-increasing order, every size already used is a multiple of every size still to come. The cursor after placing some blocks is the sum of their sizes, which is a sum of multiples of the next size, so it is itself a multiple of the next size. The cursor is always already aligned, no padding is ever needed, and nothing is stranded. On this allocation the cursor goes zero, 1,024, 1,536, 1,792, 1,920, 1,984, and each one is exactly divisible by the next block's size.*

*To show what breaking it costs, allocate Marketing's slash twenty-five first and then Engineering's slash twenty-two. The slash twenty-two cannot start at offset 128, so it waits for 1,024, and 896 addresses are stranded in a hole too narrow for a slash twenty-two with nothing small left to fill it. The footprint grows from 2,016 to 2,912, and the worst of all 720 orderings strands 1,568. I would be honest that strictly smallest-first strands only thirty-two here, because this particular run of doubling sizes happens to pack neatly upward, but that is luck; largest-first is the only order guaranteed to strand nothing for arbitrary requirements.*

*Two things I would add if there is room. The tidy allocation buys route summarisation: the whole design sits between 172.16.0.0 and 172.16.7.223, which fits in a single slash twenty-one, so the site advertises one prefix upstream instead of six and internal renumbering becomes invisible outside. The fragmented version sprawls past 172.16.11 and no single prefix covers it tightly, so allocation order affects routing table size too. And the cost of VLSM is operational: each subnet has its own mask, so the routing protocol has to carry a mask with every route, which needs one of the classless routing protocols such as RIPv2, OSPF, EIGRP or BGP. RIPv1 and IGRP advertised networks without masks and could not do it, and that compatibility gap, not any technical merit, is why fixed-mask designs persisted long after RFC 1878 described VLSM. The case that makes the argument unanswerable is the router-to-router link: it needs two addresses, and a slash twenty-two for it wastes 1,020 on a single cable, which is why those take a slash thirty, or a slash thirty-one under RFC 3021."*
