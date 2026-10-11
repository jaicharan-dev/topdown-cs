---
id: 17-hash-collision
title: "Hash Collisions: The Pigeonhole Principle in Practice"
description: "Learn how hash collisions occur via the pigeonhole principle and compare separate chaining against open addressing strategies."

sidebar_position: 17
sidebar_class_name: sidebar-easy
---

import { CollisionFigure } from '@site/src/components/Figures/HashCollision';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What causes hash collisions, and how do separate chaining and open addressing resolve them? What are primary clustering and the tombstone problem in open addressing?"

A hash collision is when two different keys hash to the same array index. This isn't a bug - it's guaranteed to happen eventually. You have an unlimited number of possible keys but only a fixed number of slots in the array, so sooner or later two keys have to share a slot. That's just the pigeonhole principle: put more pigeons than holes, and some hole gets two.

The only question is what you do when it happens. There are two main answers: **separate chaining** (let a bucket hold more than one item, usually as a small list) and **open addressing** (if your slot is taken, go find another empty one in the array).

<CollisionFigure />

### Chaining vs. open addressing

| Dimension | Separate Chaining | Open Addressing |
|---|---|---|
| **Storage Model** | Colliding items live outside the array, linked together. | Everything lives directly inside the array - no separate nodes. |
| **Max Load Factor** | Can go above 1.0 - a bucket can hold many items. | Must stay below 1.0 (usually resizes around 0.5–0.7 full). |
| **Cache Locality** | Weaker - following links jumps around in memory. | Strong - scanning nearby array slots is cache-friendly. |
| **Who Uses It** | Java `HashMap`, C++ `std::unordered_map`. | Python `dict`, Ruby `Hash`. |

### How open addressing finds the next slot

When your target slot is taken, you need a rule for where to look next. There are three common ones:

1. **Linear probing** - just check the next slot, then the next, then the next (`+1, +2, +3...`). Simple, but occupied slots tend to clump into long runs (**primary clustering**), and any key landing in that run has to walk past the whole thing.
2. **Quadratic probing** - jump by increasing squared steps (`+1, +4, +9...`) instead of by one. This avoids primary clustering, but keys that start at the same slot still follow the exact same path after that (**secondary clustering**).
3. **Double hashing** - use a second, independent hash function to decide the step size. Because the step size itself varies by key, this spreads things out the most evenly, with almost no clustering.

### Why you can't just delete by writing null

In open addressing, deleting a key isn't as simple as clearing its slot. Say key A sits at slot 4, and key B collided with it and got probed into slot 5. Now delete A and set slot 4 back to empty. Later, you search for B: you hash to slot 4, find it empty, and conclude B was never inserted - even though it's sitting right there in slot 5. The search stopped too early.

The fix is a **tombstone**: instead of marking the slot truly empty, mark it `DELETED`. A search keeps probing past a `DELETED` marker (it might find what it's looking for further along), while a new insertion is free to overwrite a `DELETED` slot with fresh data.

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
