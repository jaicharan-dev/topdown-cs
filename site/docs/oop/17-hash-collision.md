---
id: 17-hash-collision
title: "Hash Collisions: The Pigeonhole Principle in Practice"
description: "Learn how hash collisions occur via the pigeonhole principle and the strategies used to resolve them."

sidebar_position: 17
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What exactly is a hash collision? Since they are mathematically inevitable, how do modern data structures actually handle them when they occur?"

### ELI5: The Coat Check
Imagine a restaurant coat check with exactly 100 hooks. The attendant (the hash function) has a mathematical trick to instantly decide which hook to use based on your name.

A hash collision happens when the attendant applies the trick to your name and gets hook #42, but someone else's coat is already hanging there. Because two different names resulted in the exact same hook number, the attendant now needs a backup plan - like chaining your coat onto the one that is already there, or simply walking down the line to find the next empty hook.

### The Proper Answer: The Pigeonhole Principle
A hash collision occurs when a hash function maps two distinct keys to the exact same output value (or memory index).

Because a hash function compresses an infinite universe of possible inputs (like every possible string) into a finite number of outputs (like the fixed size of an array), collisions are mathematically inevitable. This is known as the Pigeonhole Principle: if you have N items and M slots, and N>M, at least one slot must contain more than one item.

In data structures like Hash Maps, collisions are problematic because they degrade performance. A perfect hash map retrieves data in O(1) time. If a collision occurs and is poorly managed, lookup times can degrade to O(N).

### How Collisions are Resolved
When a collision happens, the system must handle it using one of two primary strategies:

*   **Separate Chaining:** Instead of storing the actual value at the hash index, the index holds a pointer to a linked list (or a balanced tree). When a collision occurs, the new key-value pair is simply appended to that list. During a lookup, the system hashes the key to find the bucket, and then traverses the list to find the exact match.
*   **Open Addressing:** The hash table stores everything directly in the array. If a collision occurs, a probing algorithm (like linear probing or quadratic probing) is triggered to search for the very next available empty slot in the array.

Note for context: In cybersecurity, hash collisions have different implications. If an attacker can intentionally generate a file or payload that produces the exact same cryptographic hash (like MD5 or SHA-1) as a legitimate file, they can bypass integrity checks and digital signatures.

### Interview Summary
To deliver a concise, high-impact answer, focus on the "what," "why," and "how":
1.  **The Definition:** A collision happens when a hash function assigns the exact same output index to two completely different inputs.
2.  **The Cause:** It is driven by the Pigeonhole Principle - mapping an infinite set of potential keys into a finite number of buckets guarantees overlaps.
3.  **The Resolution:** They are typically resolved through Separate Chaining (storing colliding items in a linked list at the same index) or Open Addressing (probing the array for the next empty slot).
4.  **The Impact:** In Hash Maps, unmitigated collisions ruin the O(1) time complexity, potentially degrading search operations to O(N).

---

### Crucial Nuance: The Java 8 `Treeify` Optimization

While the classic academic answer states that hash collisions degrade performance to `O(N)` via a linked list, this is no longer true in modern Java. Starting in Java 8, `HashMap` introduced a massive optimization to defend against catastrophic collisions (often caused by malicious Denial-of-Service attacks deliberately feeding inputs with identical hashes). 

If a single bucket's linked list grows beyond a certain threshold (specifically, `TREEIFY_THRESHOLD = 8`), Java dynamically rips out the linked list and replaces it with a **Red-Black Tree**. Because Red-Black Trees are balanced search trees, this guarantees that even if a million items collide into the exact same bucket, the worst-case lookup time is strictly capped at `O(log N)`. If the bucket later shrinks below `UNTREEIFY_THRESHOLD = 6`, it converts back to a linked list to save memory overhead.
