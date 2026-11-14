---
id: 17-hash-collision
title: "Hash Collisions: The Pigeonhole Principle in Practice"
description: "Collisions are unavoidable, and the two families of fix behave very differently"

sidebar_position: 17
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What causes hash collisions, and how do separate chaining and open addressing resolve them? What are primary clustering and the tombstone problem in open addressing?"

---

### Picture it

Put twenty letters into sixteen pigeonholes and at least one hole gets two letters. No cleverness avoids it: there are simply more letters than holes.

That is the whole cause. A hash function squeezes an unlimited set of possible keys into a fixed number of slots, so two different keys are guaranteed to share one eventually. Collisions are not a bug or a sign of a poor hash. They are arithmetic. A good hash only makes them **rare and evenly spread**, never absent.

Given that, there are two ways to cope.

**Hang a bag on each pigeonhole.** Two letters for hole 4 both go in hole 4's bag, and you look through the bag.

**Put the letter in the next free hole.** Hole 4 is taken, so try hole 5, then 6. Nothing hangs off the holes, but letters end up away from home, and finding one means retracing the same walk.

---

### The proper terms

#### Why collisions are inevitable

The **pigeonhole principle** says that placing more items than containers forces at least one container to hold two. Since the set of possible keys is effectively unbounded and the table is finite, collisions are unavoidable.

A good **hash function** therefore aims for **uniform distribution**, spreading keys evenly, and the **avalanche effect**, where a small change in the key changes many bits of the hash.

#### Separate chaining

**Separate chaining** gives each bucket a secondary structure, traditionally a **linked list**, holding every entry that hashed there. Lookup finds the bucket then walks it comparing with `equals`.

It degrades gracefully: with every key colliding, lookup is **O(n)** but the table still works. Java's HashMap converts long chains to a **red-black tree**, bounding that at **O(log n)**.

It can also hold more entries than it has buckets, so the **load factor** may exceed 1. The costs are the memory for node objects and poorer **cache locality**, since list nodes are scattered in memory.

#### Open addressing

**Open addressing** stores every entry inside the table itself. On a collision it **probes** for another slot by a fixed rule, and a lookup repeats the same sequence until it finds the key or an empty slot.

**Linear probing** tries the next slot, then the next. It has excellent cache locality, since the probe walks adjacent memory.

**Quadratic probing** tries offsets of 1, 4, 9 and so on, spreading probes further apart.

**Double hashing** computes the step size with a second hash function, so different keys follow different probe sequences.

Because everything lives in the table, the load factor can never exceed 1, and performance falls off sharply above roughly 0.7.

#### Primary clustering

**Primary clustering** is the specific weakness of linear probing. Once a run of occupied slots forms, any key hashing anywhere into that run must walk to its end, which extends the run, which makes future collisions more likely. Clusters grow by feeding on themselves, and long probe sequences follow.

Quadratic probing avoids it but suffers **secondary clustering**, where keys with the same initial hash follow identical probe paths. Double hashing avoids both, because the step size varies per key.

#### The tombstone problem

Deletion is the awkward part of open addressing. Clearing a slot outright breaks lookups for anything that probed **past** it, because the now-empty slot makes the search stop early and report the key as absent.

The fix is a **tombstone**, a marker meaning "occupied once, now deleted". Searches treat it as occupied and keep probing; insertions may reuse it.

The cost is that tombstones accumulate, lengthening probe sequences even when the table is nearly empty. Periodic rehashing clears them. Separate chaining has no equivalent problem, since removing a node from a list leaves nothing behind.

---

### In code

```java
// Separate chaining: each bucket holds a list
class ChainedMap {
    private final java.util.List<java.util.List<String>> buckets = new java.util.ArrayList<>();

    ChainedMap(int capacity) {
        for (int i = 0; i < capacity; i++) buckets.add(new java.util.ArrayList<>());
    }

    void put(String key) {
        buckets.get(index(key)).add(key);          // collisions simply pile up
    }

    boolean contains(String key) {
        return buckets.get(index(key)).contains(key);
    }

    private int index(String key) {
        return Math.abs(key.hashCode()) % buckets.size();
    }
}

// Open addressing with linear probing and tombstones
class ProbedMap {
    private static final String TOMBSTONE = new String("<deleted>");
    private final String[] slots;

    ProbedMap(int capacity) { slots = new String[capacity]; }

    void put(String key) {
        int i = index(key);
        while (slots[i] != null && slots[i] != TOMBSTONE) {
            i = (i + 1) % slots.length;            // linear probe
        }
        slots[i] = key;
    }

    boolean contains(String key) {
        int i = index(key);
        while (slots[i] != null) {                 // a tombstone keeps the walk going
            if (slots[i] != TOMBSTONE && slots[i].equals(key)) return true;
            i = (i + 1) % slots.length;
        }
        return false;                              // only a genuine null ends it
    }

    void remove(String key) {
        int i = index(key);
        while (slots[i] != null) {
            if (slots[i] != TOMBSTONE && slots[i].equals(key)) {
                slots[i] = TOMBSTONE;              // not null, or lookups break
                return;
            }
            i = (i + 1) % slots.length;
        }
    }

    private int index(String key) {
        return Math.abs(key.hashCode()) % slots.length;
    }
}
```

The single most important line is `slots[i] = TOMBSTONE`. Writing `null` there would make any key that probed past this slot suddenly unfindable.

---

### What they ask next

**"Which does Java use?"**
`HashMap` and `ConcurrentHashMap` use separate chaining with treeification. `IdentityHashMap` uses linear probing, and many high-performance third-party maps use open addressing for the cache locality.

**"Which performs better?"**
Open addressing is usually faster at low load factors because of cache locality. Separate chaining degrades more gracefully as the table fills and handles deletion cleanly. The deciding factors are the expected load factor and how often entries are removed.

**"Can you avoid collisions entirely?"**
Only with **perfect hashing**, which requires the complete key set in advance. For a fixed known set, such as language keywords, that is possible; for a general-purpose map it is not.

**"What is a hash DoS attack?"**
An attacker submits keys deliberately chosen to collide, turning every operation into a worst-case scan. Mitigations are randomised hash seeds and treeification, which caps the damage at logarithmic.

**The common wrong answer** is "a good hash function prevents collisions". It cannot. The pigeonhole principle rules it out, and saying so is the point of the question.

---

### Say this in the interview

*"Collisions are unavoidable by the pigeonhole principle: the key space is effectively unbounded and the table is finite, so two keys must eventually share a slot. A good hash function only makes them rare and evenly spread, aiming for uniform distribution and the avalanche effect.*

*Separate chaining gives each bucket a secondary structure, usually a linked list, so colliding entries accumulate there and lookup walks the bucket. It degrades gracefully to O(n), or O(log n) in Java once a chain is treeified into a red-black tree, and it allows a load factor above 1.*

*Open addressing stores entries in the table itself and probes for another slot on collision, using linear probing, quadratic probing or double hashing. It has better cache locality but the load factor cannot exceed 1 and performance drops sharply past about 0.7.*

*Primary clustering is linear probing's weakness: a run of occupied slots absorbs any key hashing into it, extending the run, so clusters grow on themselves. Quadratic probing avoids that but has secondary clustering; double hashing avoids both.*

*The tombstone problem is about deletion. Clearing a slot to null breaks lookups for keys that probed past it, since the search stops early, so deleted slots are marked with a tombstone that searches treat as occupied. Tombstones accumulate and lengthen probes, so the table is rehashed periodically. Chaining has no such issue."*
