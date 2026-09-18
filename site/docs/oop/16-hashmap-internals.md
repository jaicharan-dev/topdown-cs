---
id: 16-hashmap-internals
title: "HashMap Internals: Buckets, Collisions, and Red-Black Trees"
sidebar_position: 16
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Explain to me how a HashMap works under the hood. Specifically, how does it handle collisions, and what major optimization was introduced in Java 8 to prevent performance degradation?"

## The ELI5: The Library Filing System

Imagine a massive library with exactly 16 shelves (buckets). When a new book arrives, the librarian runs the book's title through a formula that spits out a shelf number (the hash function). The book goes on that shelf.

**The collision problem:** Two books with completely different titles might hash to the same shelf number. When that happens, the librarian doesn't throw one away  -  they chain the books together on the same shelf using a linked list. To find a specific book later, the librarian goes to the correct shelf, then walks through the chain one by one, checking each title.

**The Java 8 upgrade:** If a single shelf accumulates too many chained books (more than 8), the librarian replaces the slow chain with a sorted tree structure (a red-black tree), making lookups dramatically faster even on crowded shelves.

---

## The Proper Answer

### How HashMap Stores Data

A `HashMap` is backed by an **array of buckets** (called `Node[] table`). Each bucket can hold a linked list (or tree) of key-value pairs.

When you call `map.put(key, value)`:

1. **Hash Computation:** The key's `hashCode()` is called, then the result is further scrambled via a bit-spreading function to distribute entries evenly across buckets.
2. **Bucket Index:** The index is calculated as `(n - 1) & hash`, where `n` is the array length (always a power of 2).
3. **Insertion:** If the bucket is empty, the node is placed directly. If not, Java walks the existing chain/tree at that bucket, checking each key via `.equals()`.

### How Collisions Are Resolved

When two different keys hash to the same bucket index, a **collision** occurs. HashMap resolves this through **chaining**:

- **Pre-Java 8:** Collisions create a singly linked list at that bucket. Worst-case lookup degrades to **O(n)** if many keys land in the same bucket.
- **Post-Java 8 (Treeification):** When a single bucket's chain grows beyond **8 nodes** (the `TREEIFY_THRESHOLD`), HashMap automatically converts that chain into a **red-black tree**, improving worst-case lookup from O(n) to **O(log n)**.

```java
// Simplified internal constants
static final int TREEIFY_THRESHOLD = 8;    // Chain -> Tree
static final int UNTREEIFY_THRESHOLD = 6;  // Tree -> Chain (on resize)
static final int MIN_TREEIFY_CAPACITY = 64; // Min table size for treeification
```

### Load Factor and Resizing

- **Default capacity:** 16 buckets.
- **Default load factor:** 0.75 &mdash; when 75% of buckets are occupied, the entire array is **doubled** in size and all entries are rehashed into new positions.
- **Why 0.75?** It is a tuned tradeoff between space waste (too many empty buckets) and collision frequency (too many entries per bucket).

---

## The Senior-Level Pivot

### Why Keys Must Override Both `hashCode()` and `equals()`

This ties directly to Question 22. If you override `equals()` but not `hashCode()`, two logically equal keys will land in **different buckets**. The map will contain duplicate entries it cannot find, silently corrupting your data.

### Why HashMap Is Not Thread-Safe

In a multi-threaded environment, concurrent `put()` calls can cause infinite loops during resize (pre-Java 8) or lost updates. Use `ConcurrentHashMap` instead, which uses **bucket-level locking** (or CAS operations in Java 8+) rather than locking the entire map.

---

## Interview Summary

1. **Structure:** HashMap is an array of buckets. Each bucket holds a linked list (or red-black tree post-Java 8) of key-value pairs.
2. **Collision Handling:** Chaining. Pre-Java 8: linked list (O(n) worst case). Post-Java 8: treeifies at 8 nodes (O(log n) worst case).
3. **Resizing:** When load factor (default 0.75) is exceeded, the table doubles and all entries are rehashed.
4. **Critical Contract:** Keys must correctly implement both `hashCode()` (for bucket placement) and `equals()` (for key matching within a bucket).

---

### Crucial Nuance: The "Power of 2" Bitwise Optimization

Why does HashMap rigidly force its capacity to always be a power of two (16, 32, 64, etc.)? 

Because of the index calculation formula: `(n - 1) & hash`. 

To find which bucket an item belongs in, you mathematically need the modulo operator: `hash % n`. However, modulo operations are computationally expensive at the CPU level. The creators of Java realized a mathematical trick: when `n` is exactly a power of 2, `hash % n` is mathematically perfectly identical to `hash & (n - 1)`. 

A bitwise AND operation (`&`) executes in a single CPU cycle. By forcing the array size to be a power of two, HashMap bypasses the slow modulo math and uses a lightning-fast bitwise operation to find the bucket index, saving millions of CPU cycles in high-throughput applications.
