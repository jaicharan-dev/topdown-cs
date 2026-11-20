---
id: 1-subnetting
title: "Subnetting: Network, Broadcast and Host Range"
description: "A mask is a boundary, not a filter, and the magic number is not a trick: it is the block size, which is why the arithmetic works at all"

sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Given the IP address `192.168.10.75` with subnet mask `255.255.255.192` (`/26`), determine the network address, broadcast address, range of valid host addresses, and total usable hosts. Show both the formal binary breakdown and the rapid 'Magic Number' interview shortcut."

---

### Picture it

A street address written as one long number, where nobody has told you which digits are the street and which are the house.

Take `192.168.10.75`. On its own that is just four numbers. **It does not tell you what network it is on**, because the same address could be a house on a street of 254 houses, or a house on a street of 62, or a street all of its own. The address carries no punctuation.

**The mask is the punctuation.** That is the whole of it, and it is worth resisting the instinct that a mask filters or blocks something. It marks a boundary. Written out in binary, `255.255.255.192` is twenty-six ones followed by six zeros, and the position where the ones stop is the position where "which street" stops and "which house" begins. Nothing is being excluded; a line is being drawn.

Once the line is drawn, two things follow immediately and both are just counting.

**The houses are numbered by a plain binary counter**, six bits wide here, so a street holds sixty-four numbers and streets therefore start at multiples of sixty-four: 0, 64, 128, 192. Not because anyone chose those, but because a six-bit counter rolls over every sixty-four. Address 75 lies in the block that starts at 64, and it does so for the same reason that page 75 of a book is in the chapter that starts at page 64 when chapters are sixty-four pages long.

**Two of those sixty-four numbers are not houses.** The all-zeros number means "this street" in the abstract, which is how a router writes a destination it wants to forward toward rather than a machine it wants to reach. The all-ones number means "everyone on this street at once". Both are reserved by the same logic, and it is the only reason the count is 62 rather than 64.

And then the shortcut, which is presented in textbooks as a trick and is not one. **Two hundred and fifty six minus one hundred and ninety two is sixty four, and sixty four is the block size.** It is not a coincidence or a mnemonic: an octet holds 256 values, the mask value tells you how many of the high ones are fixed, and the gap between the mask value and 256 is exactly how many values the counter can run through before it rolls over into the next block. The trick is just the arithmetic read from the other end.

---

### The proper terms

#### The address and the boundary

An **IPv4 address** is 32 bits, conventionally written as four **octets** in dotted decimal. `192.168.10.75` is `11000000.10101000.00001010.01001011`.

A **subnet mask** is 32 bits whose high bits are 1 and whose low bits are 0, with no mixing. The ones mark the **network portion**, the zeros mark the **host portion**. A mask like `255.255.0.255` is not a mask at all; contiguity is part of the definition, because the boundary has to be a single position.

The **prefix length**, written `/26`, is simply the number of ones. It is the same information as the dotted-decimal mask, in a notation that cannot express an invalid one. The style is called **CIDR**, classless inter-domain routing, and the word classless matters: before CIDR, the boundary was implied by the first octet under the old **classful** scheme, where a leading 192 meant a fixed `/24`. CIDR made the boundary explicit, which is why a mask must now always be quoted alongside an address.

**Host bits**, written `h`, are the zeros: `h = 32 - prefix`. Everything else on the page is derived from that one number.

#### The three derived addresses

The **network address** has all host bits zero. It names the subnet rather than any machine on it, and it is what appears in a routing table.

The **broadcast address** has all host bits one. A frame sent to it is delivered to every host on that subnet.

The **usable host range** is everything strictly between them, which is why the count is:

$$\text{usable hosts} = 2^h - 2$$

**The minus two is not a convention to be memorised.** It is the two patterns the host counter produces that already mean something else, and if you can say that, the formula stops needing to be recalled.

#### The shortcut, stated as arithmetic

The **block size**, also called the increment or the magic number, is how many addresses each subnet spans:

$$\text{block size} = 2^h = 256 - (\text{the interesting octet of the mask})$$

The **interesting octet** is the last one that is neither 255 nor 0, since that is where the boundary falls. Here it is the fourth, with value 192, so the block size is 64.

Both expressions give the same number because the interesting octet's mask value is `256` minus the number of host values within that octet. The two forms are the same statement, which is why the shortcut is exact rather than approximate.

Subnet boundaries are then the multiples of the block size: 0, 64, 128, 192. **An address belongs to the block whose start is the largest multiple not exceeding it**, which is integer division.

#### Where the formula has exceptions

The `2^h - 2` rule has two documented exceptions worth knowing, because an interviewer who asks about them is checking whether you learned the rule or the reason.

A `/31` has `h = 1`, so the formula yields zero usable hosts. **RFC 3021** permits `/31` on point-to-point links precisely because a link with exactly two endpoints has no need of a broadcast address, so both addresses are usable. It is standard practice on router-to-router links and halves the address consumption against the `/30` it replaced.

A `/32` is a single address with no host field at all, used for loopback interfaces, host routes, and anycast addresses.

---

### Work it out

#### Given

| Quantity | Value |
| :--- | :--- |
| IP address | `192.168.10.75` |
| Subnet mask | `255.255.255.192` |
| Prefix | `/26` |

Check the prefix against the mask before anything else: `255` is eight ones three times over, and `192` is `11000000`, two ones. That is 24 + 2 = **26**, so the `/26` and the dotted mask agree. If they disagree, the question has a typo and saying so is better than silently picking one.

#### Part 1: the binary breakdown

```
            11000000 . 10101000 . 00001010 . 01001011     192.168.10.75
mask        11111111 . 11111111 . 11111111 . 11000000     255.255.255.192
            |------------ network, 26 bits -----|-host-|
                                                  6 bits

AND         11000000 . 10101000 . 00001010 . 01000000     192.168.10.64
                                                            network address

OR ~mask    11000000 . 10101000 . 00001010 . 01111111     192.168.10.127
                                                            broadcast address
```

**The network address** is the address AND the mask, which forces every host bit to zero.

**The broadcast address** is the address OR the inverted mask, which forces every host bit to one.

Only the fourth octet does any work, because the first three mask bytes are all ones and leave their octets untouched. Zooming in on it:

```
  75  =  0 1 0 0 1 0 1 1
         ^^^ ^^^^^^^^^^^
       network    host
       bits       bits
       = 01       = 001011 = 11

  network bits 01 at the top of an 8-bit octet  ->  01000000 = 64
  host offset within the block                  ->  11
  check:  64 + 11 = 75
```

That last line is the part worth saying aloud, because it shows the structure rather than the procedure: **the address is the block start plus the offset within the block**, and the mask is what tells you where to cut between the two.

#### Part 2: the magic number shortcut

Three steps, no binary.

**Step 1. Find the interesting octet and compute the block size.**

The mask is `255.255.255.192`, so the interesting octet is the fourth, value 192.

`block size = 256 - 192 = ` **64**

**Step 2. Find which block the address falls in.**

The fourth octet of the address is 75.

`75 / 64 = 1 remainder 11`, so the address sits in block **1**, which starts at `1 x 64 = ` **64**

Equivalently, list the boundaries and pick the one below: 0, **64**, 128, 192, and 75 falls between 64 and 128.

**Step 3. Read off all four answers.**

| Quantity | Derivation | Value |
| :--- | :--- | :--- |
| **Network address** | the block start | `192.168.10.64` |
| **Broadcast address** | next block start minus 1, 128 - 1 | `192.168.10.127` |
| **First usable host** | network + 1 | `192.168.10.65` |
| **Last usable host** | broadcast - 1 | `192.168.10.126` |
| **Usable hosts** | `2^6 - 2 = 64 - 2` | **62** |

Both methods agree, which they must, because the shortcut is the binary arithmetic rearranged rather than a different procedure.

#### Part 3: the whole subnet map

With a `/26` the last octet splits into exactly four blocks, which is worth drawing because interviewers often follow up with "and what if the host were .200 instead".

| Subnet | Network | First host | Last host | Broadcast |
| :---: | :--- | :--- | :--- | :--- |
| 0 | `192.168.10.0` | `.1` | `.62` | `192.168.10.63` |
| **1** | **`192.168.10.64`** | **`.65`** | **`.126`** | **`192.168.10.127`** |
| 2 | `192.168.10.128` | `.129` | `.190` | `192.168.10.191` |
| 3 | `192.168.10.192` | `.193` | `.254` | `192.168.10.255` |

Four subnets of 64 addresses, 62 usable each, so 248 usable out of 256 raw. **The eight lost addresses are the price of the split**: two per subnet, and splitting a `/24` into four `/26`s costs six usable addresses against leaving it whole.

That is the general trade and it is worth stating as a formula. Splitting a block into `2^b` subnets costs `2 x (2^b - 1)` usable addresses, because you gain `2^b - 1` extra pairs of reserved addresses. Split a `/24` into 64 `/30`s and you lose 126 of 254 addresses, **half the block, to bookkeeping.**

#### Part 4: sanity checks worth doing out loud

**Does the host fall inside the range you computed?** 75 is between 65 and 126. If it is not, you have the wrong block.

**Is the network address a multiple of the block size?** 64 is a multiple of 64. Network addresses always are, and this catches most arithmetic slips immediately.

**Does broadcast minus network plus one equal the block size?** `127 - 64 + 1 = 64`. Yes.

**Is the broadcast address one below the next network?** The next is 128, and 127 is one below it. **Every address in the block is accounted for**: 1 network, 62 hosts, 1 broadcast, 64 total.

#### Verify it

```python
"""
IPv4 subnetting from first principles: no ipaddress module, so every step
is the arithmetic an interviewer wants to see.
"""


def to_int(dotted):
    a, b, c, d = (int(x) for x in dotted.split('.'))
    return (a << 24) | (b << 16) | (c << 8) | d


def to_dotted(n):
    return '.'.join(str((n >> s) & 0xFF) for s in (24, 16, 8, 0))


def to_binary(n):
    return '.'.join(f"{(n >> s) & 0xFF:08b}" for s in (24, 16, 8, 0))


def prefix_of(mask_int):
    bits = f"{mask_int:032b}"
    ones = bits.rstrip('0')
    assert '0' not in ones, "a mask must be contiguous ones then zeros"
    return len(ones)


def subnet(ip, mask):
    ip_i, mask_i = to_int(ip), to_int(mask)
    prefix = prefix_of(mask_i)
    host_bits = 32 - prefix
    network = ip_i & mask_i
    broadcast = network | (~mask_i & 0xFFFFFFFF)
    size = 1 << host_bits

    if host_bits == 0:                      # /32, a single host route
        usable = (None, None, 1)
    elif host_bits == 1:                    # /31, RFC 3021 point-to-point
        usable = (to_dotted(network), to_dotted(broadcast), 2)
    else:
        usable = (to_dotted(network + 1), to_dotted(broadcast - 1), size - 2)

    return {
        "prefix": prefix, "host_bits": host_bits, "block_size": size,
        "network": to_dotted(network), "broadcast": to_dotted(broadcast),
        "first": usable[0], "last": usable[1], "usable": usable[2],
    }


def magic_number(mask):
    """The shortcut, which is the same arithmetic read from the other end."""
    octets = [int(x) for x in mask.split('.')]
    idx = max(i for i, o in enumerate(octets) if o not in (0,)) \
        if any(o not in (0, 255) for o in octets) \
        else max(i for i, o in enumerate(octets) if o == 255)
    interesting = next((i for i, o in enumerate(octets) if o not in (0, 255)),
                       idx)
    return interesting, 256 - octets[interesting]


if __name__ == "__main__":
    IP, MASK = "192.168.10.75", "255.255.255.192"
    r = subnet(IP, MASK)

    print("-- binary breakdown")
    print(f"  address  {to_binary(to_int(IP))}   {IP}")
    print(f"  mask     {to_binary(to_int(MASK))}   {MASK}")
    print(f"  network  {to_binary(to_int(r['network']))}   {r['network']}")
    print(f"  bcast    {to_binary(to_int(r['broadcast']))}   {r['broadcast']}")

    print(f"\n-- prefix /{r['prefix']} agrees with the dotted mask: "
          f"{sum(bin(int(o)).count('1') for o in MASK.split('.'))} ones")

    print("\n-- magic number shortcut")
    oct_idx, block = magic_number(MASK)
    last = int(IP.split('.')[oct_idx])
    print(f"  interesting octet is #{oct_idx + 1}, value "
          f"{MASK.split('.')[oct_idx]}")
    print(f"  block size = 256 - {MASK.split('.')[oct_idx]} = {block}")
    print(f"  {last} // {block} = {last // block}, so the block starts at "
          f"{(last // block) * block}")
    assert block == r["block_size"]
    assert (last // block) * block == int(r["network"].split('.')[oct_idx])
    print("  agrees with the binary method")

    print("\n-- answers")
    print(f"  network    {r['network']}")
    print(f"  broadcast  {r['broadcast']}")
    print(f"  hosts      {r['first']} to {r['last']}")
    print(f"  usable     2^{r['host_bits']} - 2 = {r['usable']}")

    print("\n-- sanity checks")
    net_i, bc_i = to_int(r["network"]), to_int(r["broadcast"])
    print(f"  host inside the range?            "
          f"{net_i < to_int(IP) < bc_i}")
    print(f"  network a multiple of block size? "
          f"{net_i % r['block_size'] == 0}")
    print(f"  bcast - net + 1 == block size?    "
          f"{bc_i - net_i + 1 == r['block_size']}")

    print("\n-- the whole /26 map of 192.168.10.0")
    for i in range(0, 256, block):
        tag = " <-- contains .75" if i <= last < i + block else ""
        print(f"  192.168.10.{i:<4} hosts .{i+1} to .{i+block-2:<4} "
              f"bcast .{i+block-1}{tag}")

    print("\n-- the cost of splitting, 2 reserved addresses per subnet")
    print(f"  {'split':<10}{'subnets':>9}{'usable each':>13}{'total':>8}"
          f"{'lost vs /24':>13}")
    for p in (24, 25, 26, 27, 28, 29, 30):
        subs, each = 1 << (p - 24), (1 << (32 - p)) - 2
        print(f"  /{p:<9}{subs:>9}{each:>13}{subs*each:>8}"
              f"{254 - subs*each:>13}")

    print("\n-- where 2^h - 2 does not apply")
    for pfx in (31, 32):
        m = to_dotted((0xFFFFFFFF << (32 - pfx)) & 0xFFFFFFFF)
        rr = subnet("10.0.0.0", m)
        print(f"  /{pfx} ({m}): formula says "
              f"{(1 << (32 - pfx)) - 2}, reality is {rr['usable']}"
              + ("  RFC 3021 point-to-point" if pfx == 31 else "  host route"))
```

---

### What they ask next

**"Why is it `2^h - 2` rather than `2^h`?"**
Because two of the host patterns already mean something. All host bits zero is the **network address**, which names the subnet itself and is what a routing table carries; all host bits one is the **broadcast address**, delivered to every host on the subnet. Neither can be assigned to a machine, so 64 addresses give 62 hosts. **It is not a convention, it is two patterns already spoken for**, and saying that is the difference between knowing the formula and understanding it.

**"Why does the magic number work?"**
Because it is the same arithmetic from the other end. An octet holds 256 values; the mask value says how many high values are pinned; the gap `256 - 192 = 64` is how many values the host counter runs through before rolling into the next block, which is the **block size** `2^h`. So the shortcut is exact, not approximate, and the two methods must agree.

**"Which octet is the interesting one?"**
The last octet that is neither 255 nor 0, because that is where the boundary falls. For `/26` it is the fourth; for `/20` the mask is `255.255.240.0` and it is the third, with block size `256 - 240 = 16`, so the boundaries step in sixteens in the third octet. For an exact `/24`, `/16` or `/8` there is no partial octet and the block size is a whole octet.

**"What if the address were `192.168.10.200`?"**
Block size is still 64, and `200 / 64 = 3 remainder 8`, so the network is `192.168.10.192`, broadcast `192.168.10.255`, hosts `.193` to `.254`. **The mask did not change, so the map did not change**; only which of the four blocks you are in.

**"How many addresses does subnetting cost you?"**
Two per subnet, so splitting into `2^b` subnets costs `2 x (2^b - 1)` usable addresses beyond what the unsplit block cost. Splitting a `/24` into four `/26`s gives 248 usable against 254, losing six. Splitting it into 64 `/30`s gives 128 against 254, **losing half the block to bookkeeping**, which is the real argument for `/31` on point-to-point links.

**"Is a `/31` legal? The formula gives zero hosts."**
Yes, by **RFC 3021**, and it is standard on router-to-router links. A link with exactly two endpoints has no use for a broadcast address, so both addresses are assignable and the formula simply does not apply. It halves the consumption of the `/30` it replaced. A **/32** is similar: no host field at all, used for loopbacks, host routes and anycast.

**"What makes a mask invalid?"**
Non-contiguous ones, such as `255.255.0.255`. The mask marks a single boundary between network and host, so there must be exactly one transition from ones to zeros. **CIDR notation cannot express an invalid mask**, which is one of the reasons it replaced dotted-decimal masks in configuration.

**"How does this relate to classful addressing?"**
Before **CIDR**, the boundary was inferred from the leading bits: a first octet of 192 meant class C and a fixed `/24`. That wasted address space catastrophically, since an organisation needing 300 hosts had to take a whole class B of 65,534. CIDR made the boundary explicit and is why **an address without a mask is meaningless**; `192.168.10.75` on its own does not determine a network.

**"Can the network and broadcast addresses be used in practice?"**
The network address is genuinely unusable as a host address. The all-ones broadcast is deliverable but not assignable. Historically some stacks also treated the all-zeros host as a broadcast, which is why the restriction is firm. The exceptions above, `/31` and `/32`, are the documented cases where the reasoning does not apply.

**The common wrong answer** is dividing 75 by 64 and reporting the quotient as the answer, giving a network of `192.168.10.1`, when the network is the quotient **times** the block size. Next is forgetting which octet is interesting and computing `256 - 255 = 1` from the third octet. Third is quoting 64 usable hosts, which misses the two reserved patterns, or quoting 62 while being unable to say which two are gone. And last is treating the magic number as an unrelated trick, when it is the binary arithmetic rearranged, which is the follow-up most likely to be asked.

---

### Say this in the interview

*"An IPv4 address is thirty-two bits written as four octets in dotted decimal, and the first thing I would check is that the two forms of the mask agree. 255 is eight ones three times, and 192 is 11000000, which is two more, so twenty-six ones, and the slash twenty-six matches.*

*The framing I would start from is that a subnet mask is a boundary, not a filter: the ones mark the network portion, the zeros mark the host portion, and the prefix length is just how many ones there are. Written in binary it is twenty-six ones then six zeros, and the place where the ones stop is where "which network" stops and "which host" begins. Nothing is being blocked; a line is being drawn. Six host bits means the host portion is a six-bit counter, so a subnet spans sixty-four addresses and subnets therefore start at multiples of sixty-four, which is zero, sixty-four, one twenty-eight and one ninety-two. Not by choice, just because a six-bit counter rolls over every sixty-four.*

*Formally: the network address is the address ANDed with the mask, which forces every host bit to zero, giving 192.168.10.64. The broadcast address is the address ORed with the inverted mask, which forces every host bit to one, giving 192.168.10.127. Only the fourth octet does any work, because the first three mask bytes are all ones. Zooming in, seventy-five is 01001011; the top two bits, 01, are network and the bottom six, 001011, are host, which is eleven. So the block starts at 01000000, which is sixty-four, and the address is sixty-four plus eleven. That is the structure worth saying: an address is the block start plus the offset inside the block, and the mask tells you where to cut.*

*The usable host range is everything strictly between, so .65 to .126, and the count is two to the six minus two, which is sixty-two. I would be explicit about the minus two rather than reciting it: all host bits zero is the network address, which names the subnet and is what a routing table carries, and all host bits one is the broadcast address. Those two patterns already mean something, so they cannot be assigned. It is not a convention.*

*For the shortcut, I find the interesting octet, which is the last one that is neither 255 nor 0, here the fourth. The magic number is then two hundred and fifty six minus one ninety two, which is sixty four, and I would point out that this is not a trick: an octet holds 256 values, the mask value says how many high ones are pinned, and the gap to 256 is exactly how many values the host counter runs through before rolling into the next block. So the magic number is the block size, and the shortcut is the same arithmetic read from the other end, which is why the two methods have to agree. Then seventy-five over sixty-four is one remainder eleven, so I am in block one, which starts at sixty-four. Network 192.168.10.64, broadcast is the next block start minus one, so one twenty-seven, hosts .65 to .126, sixty-two of them.*

*I would run three checks out loud. Is seventy-five inside .65 to .126? Yes. Is the network a multiple of the block size? Sixty-four is, and network addresses always are, which catches most slips. Does broadcast minus network plus one equal sixty-four? One twenty-seven minus sixty-four plus one is sixty-four, so every address is accounted for: one network, sixty-two hosts, one broadcast.*

*If they want the whole picture, a slash twenty-six splits the last octet into four blocks: zero, sixty-four, one twenty-eight and one ninety-two, each with sixty-two usable, so two hundred and forty-eight usable out of two hundred and fifty-six. That is the general trade: splitting into two to the b subnets costs two times two to the b minus one usable addresses, because each subnet needs its own reserved pair. Splitting a slash twenty-four into four slash twenty-sixes loses six addresses, but splitting it into sixty-four slash thirties loses a hundred and twenty-six of two hundred and fifty-four, half the block to bookkeeping. Which is exactly why RFC 3021 allows a slash thirty-one on point-to-point links: the formula says zero usable hosts, but a link with two endpoints has no need of a broadcast address, so both addresses are assignable and it halves what the slash thirty cost. A slash thirty-two is the related case, no host field at all, for loopbacks and host routes.*

*One last thing I would mention if there is room: an address without a mask is meaningless. Under classful addressing a leading 192 implied a fixed slash twenty-four, and that wasted space catastrophically, since an organisation needing three hundred hosts had to take a whole class B of sixty-five thousand. CIDR made the boundary explicit, and a side benefit is that the notation cannot express an invalid mask, where dotted decimal lets you write something like 255.255.0.255, which is not a mask at all because the ones have to be contiguous."*
