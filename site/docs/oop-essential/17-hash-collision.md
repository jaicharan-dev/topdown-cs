---
id: 17-hash-collision
title: "Hash Collisions: The Pigeonhole Principle in Practice"
description: "Learn how hash collisions occur via the pigeonhole principle and compare separate chaining against open addressing strategies."

sidebar_position: 17
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What causes hash collisions, and how do separate chaining and open addressing resolve them? What are primary clustering and the tombstone problem in open addressing?"

### The Quick Answer

"A hash collision occurs when two distinct keys produce the exact same array index. By the **Pigeonhole Principle**, mapping an infinite universe of potential inputs into a finite number of array slots makes collisions mathematically inevitable. Data structures resolve them using either **Separate Chaining** (storing colliding items in linked lists or trees per bucket) or **Open Addressing** (probing for the next open slot in the array)."

---

### Collision Resolution Strategies: Chaining vs. Open Addressing

| Dimension | Separate Chaining | Open Addressing |
|---|---|---|
| **Storage Model** | Elements stored outside the array in linked nodes or trees. | All elements stored directly inside the main array. |
| **Max Load Factor** | Can exceed $1.0$ (buckets hold multiple elements). | Must remain strictly below $1.0$ (typically resizes at $0.5$–$0.7$). |
| **Cache Locality** | Poor (following pointer references causes CPU cache misses). | Excellent (sequential array access maximizes CPU cache hits). |
| **Language Usage** | **Java `HashMap`**, **C++ `std::unordered_map`**. | **Python `dict`**, **Ruby `Hash`**. |

---

### Open Addressing Probing Techniques & Pitfalls

When using open addressing, finding an alternate slot when index $h(k)$ is occupied relies on a probing sequence $h(k, i)$:

1. **Linear Probing ($h(k) + i$):**
   * Checks sequential slots ($+1, +2, +3 \dots$).
   * **The Flaw (Primary Clustering):** Occupied slots clump together into long contiguous blocks. Any key hashing into a cluster must traverse to the end of the cluster, severely degrading performance.
2. **Quadratic Probing ($h(k) + c_1 i + c_2 i^2$):**
   * Probes at quadratic intervals ($+1, +4, +9 \dots$).
   * Solves primary clustering, but keys that hash to the exact same initial index follow the identical probe path (**Secondary Clustering**).
3. **Double Hashing ($h_1(k) + i \cdot h_2(k)$):**
   * Uses a second independent hash function $h_2(k)$ as the step size. Produces the most uniform distribution with virtually zero clustering.

---

### The Interview Trap: The Tombstone Deletion Problem

In open addressing, you **cannot simply write `null` to delete a key**.

* **Why?** Consider key $B$ that collided with key $A$ and was placed into slot 5 via probing. If key $A$ at slot 4 is later deleted and set to `null`, a subsequent search for key $B$ will hash to slot 4, encounter `null`, conclude that key $B$ never existed, and abort early!
* **The Fix (Tombstones):** Deleted slots are marked with a special sentinel value: **`DELETED`** (or tombstone). During searches, the algorithm continues probing past `DELETED` markers, but during insertions, it can overwrite `DELETED` slots with new data.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how collision strategies are utilized in standard language collections:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
import java.util.HashMap;

// Java uses SEPARATE CHAINING (LinkedList -> Red-Black Tree)
public class CollisionDemo {
    public static void main(String[] args) {
        // Strings "Aa" and "BB" famously produce the identical Java hashCode: 2112
        String key1 = "Aa";
        String key2 = "BB";

        System.out.println(key1.hashCode()); // 2112
        System.out.println(key2.hashCode()); // 2112

        HashMap<String, String> map = new HashMap<>();
        map.put(key1, "First Value");
        map.put(key2, "Second Value"); // Stored in the same bucket via separate chaining

        System.out.println(map.get(key1)); // "First Value"
        System.out.println(map.get(key2)); // "Second Value"
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <unordered_map>
#include <string>

// C++ std::unordered_map is mandated by the standard to use SEPARATE CHAINING
int main() {
    std::unordered_map<std::string, int> map;
    map["alpha"] = 1;
    map["beta"] = 2;

    // Check bucket allocation
    size_t b1 = map.bucket("alpha");
    size_t b2 = map.bucket("beta");

    std::cout << "Alpha Bucket: " << b1 << ", Beta Bucket: " << b2 << std::endl;
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
# Python dictionaries use OPEN ADDRESSING with pseudo-random perturbation,
# rather than separate chaining. All key-value entries reside in a compact array.

d = {}
d["key1"] = "val1"
d["key2"] = "val2"

# Python's dict resolves collisions by probing internally,
# keeping lookup time O(1) without linked list pointer indirection.
print(d["key1"]) # "val1"
```

</TabItem>
</Tabs>
