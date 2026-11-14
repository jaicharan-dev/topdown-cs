---
id: 16-hashmap-internals
title: "HashMap Internals: Buckets, Collisions, and Red-Black Trees"
description: "How a key becomes a bucket index, why the hash gets stirred first, and what happens when a bucket fills up"

sidebar_position: 16
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Explain how a HashMap works under the hood. Specifically, how are bucket indices calculated, why is the bit-spreading function needed, how does treeification work, and why isn't HashMap thread-safe?"

---

### Picture it

Go back to the cloakroom, this time looking at how the attendant picks a rack.

**There is a fixed row of racks.** Say sixteen. A coat's rack is decided by a quick calculation from the coat itself, and because the number must land between 0 and 15, only the last part of the calculation can matter.

That last point causes a problem worth seeing. If the calculation produces numbers that always differ in their **upper** digits but agree in their lower ones, every coat lands on the same rack, even though the numbers were all different. So before using it, the attendant **stirs** the number so that its upper digits influence the lower ones.

**Several coats can share a rack**, so each rack holds a small list, searched one by one.

**If a rack gets crowded**, searching it stops being quick, so the attendant reorganises that one rack into a sorted structure that can be searched by halving instead of scanning.

**If the whole row gets crowded**, they add more racks and redistribute everything.

That is a HashMap: a table of buckets, an index derived from a stirred hash, chains inside buckets, treeification of long chains, and resizing of the whole table.

---

### The proper terms

#### From key to bucket

A HashMap holds an **array of buckets**, often called the **table**, whose length is always a **power of two**.

Finding the index takes three steps. The key's **`hashCode`** is called. That value is passed through a **spreading function**, also called hash spreading or perturbation. Then the result is reduced to the table range.

The reduction uses `index = (n - 1) & hash`, a bitwise AND rather than a modulo. This works only because `n` is a power of two, where `(n - 1)` is a mask of all ones in the low bits, making the AND equivalent to `hash % n` but much faster.

#### Why spreading is needed

Because the index uses only the **low bits**, any hash whose variation lives in the high bits collapses to a single bucket. Keys that are genuinely different would then all collide, and lookups would degrade to scanning a list.

The fix in Java 8 is `h ^ (h >>> 16)`: take the hash, shift it right by sixteen so the top half moves into the bottom half, and **XOR** them. Now the high bits influence the low ones, and the AND sees that mixture. It is deliberately cheap, one shift and one XOR, because this runs on every operation.

#### Collisions and treeification

Two keys landing in the same bucket is a **collision**, resolved by **separate chaining**: the bucket holds a linked list and `get` walks it comparing with `equals`.

A long chain makes lookup **O(n)** in that bucket. Since Java 8, when a bucket's chain reaches the `TREEIFY_THRESHOLD` of 8 **and** the table is at least 64 entries, the chain is converted into a **red-black tree**, giving **O(log n)** within the bucket. If the table is smaller than 64, it resizes instead, since a small table is the more likely cause.

Shrinking back is the `UNTREEIFY_THRESHOLD` of 6. The gap between 8 and 6 provides **hysteresis**, so a bucket hovering at the boundary does not convert back and forth.

#### Resizing

The **load factor** defaults to **0.75**. When the number of entries exceeds capacity times load factor, the table **resizes** to double its length and entries are rehashed into the new table. The 0.75 default is a compromise between wasted space and collision frequency.

Doubling has a neat consequence: since the table length is a power of two, an entry's new index is either the same as before or the old index plus the old capacity, decided by a single extra bit. Java 8 exploits this to split each bucket in two without recomputing hashes.

#### Why it is not thread-safe

A HashMap performs read-modify-write sequences with no synchronisation. Two threads inserting at once can lose an update, and a resize running concurrently with another operation can leave the table inconsistent.

In Java 7 concurrent resizing could create a **circular reference** in a bucket's chain, making a later `get` spin forever at 100% CPU. Java 8's resize preserves order and no longer forms that cycle, but the class is still unsafe: entries can be lost, and iteration during modification throws **ConcurrentModificationException** via the fail-fast `modCount` check.

The thread-safe option is **ConcurrentHashMap**, which locks per bin rather than the whole map, not `Hashtable` or `Collections.synchronizedMap`, both of which serialise every operation.

---

### In code

```java
// The index calculation, in essence
static int spread(int h) {
    return h ^ (h >>> 16);              // high bits mixed into the low ones
}

static int indexFor(int hash, int tableLength) {
    return (tableLength - 1) & hash;    // works because the length is a power of two
}

public class Demo {
    public static void main(String[] args) {
        int capacity = 16;

        // Two hashes differing only above bit 16
        int a = 0b0000_0000_0000_0001__0000_0000_0000_0101;
        int b = 0b0000_0000_0000_0010__0000_0000_0000_0101;

        System.out.println(indexFor(a, capacity));          // 5
        System.out.println(indexFor(b, capacity));          // 5: collision

        System.out.println(indexFor(spread(a), capacity));  // 4
        System.out.println(indexFor(spread(b), capacity));  // 7: separated
    }
}
```

Without spreading, two keys that differ only in their high bits share a bucket. One shift and one XOR pull them apart.

---

### What they ask next

**"Why is the capacity always a power of two?"**
So the index can be computed with a bitwise AND instead of a modulo, and so a resize splits each bucket cleanly using one extra bit rather than rehashing everything.

**"What happens if `hashCode` always returns the same value?"**
Everything lands in one bucket. Lookups become linear, or logarithmic after treeification. It is still correct, just slow, which is the degradation an attacker exploits in a hash collision denial-of-service.

**"Why 8 for treeification?"**
With a reasonable hash, bucket occupancy follows a Poisson distribution and a chain of 8 is vanishingly unlikely, roughly one in ten million. So the threshold is effectively never reached by chance, and tree nodes, which are larger, are only paid for when something is genuinely wrong.

**"Can null be a key?"**
Yes, exactly one, and it is stored in bucket 0 without calling `hashCode`. `ConcurrentHashMap` forbids null keys and values, because a null return would be ambiguous between absent and present-with-null.

**"What is the difference from `ConcurrentHashMap`?"**
It locks only the bin being written, allows concurrent reads without locking, and provides atomic operations like `computeIfAbsent`. It is not merely a synchronised wrapper.

**The common wrong answer** is "the index is hashCode modulo capacity". It is an AND against the mask, on a spread hash, and both details are what the question is after.

---

### Say this in the interview

*"A HashMap is an array of buckets whose length is always a power of two. To place a key it calls hashCode, passes it through a spreading function, then computes the index as (n - 1) AND hash. The AND works as a modulo only because the length is a power of two, and it is much cheaper.*

*The spreading function exists because the index uses only the low bits, so keys differing only in their high bits would all collide. Java 8 uses h XOR (h unsigned-shifted right by 16), which folds the high half into the low half for the cost of one shift and one XOR.*

*Collisions are handled by separate chaining. Since Java 8, a chain reaching the treeify threshold of 8 while the table is at least 64 becomes a red-black tree, taking that bucket from O(n) to O(log n); below 64 it resizes instead. It untreeifies at 6, and the gap gives hysteresis. The load factor is 0.75, and exceeding it doubles the table and rehashes.*

*It is not thread-safe because its read-modify-write operations are unsynchronised, so concurrent writes can lose updates, and iteration during modification fails fast with a ConcurrentModificationException. In Java 7 a concurrent resize could even create a circular reference and spin forever. For concurrency I would use ConcurrentHashMap, which locks per bin rather than the whole map."*
