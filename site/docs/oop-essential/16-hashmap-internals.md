---
id: 16-hashmap-internals
title: "HashMap Internals: Buckets, Collisions, and Red-Black Trees"
description: "A deep dive into HashMap internals, covering bucket arrays, hash collisions, and the transition to red-black trees."

sidebar_position: 16
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Explain how a HashMap works under the hood. Specifically, how are bucket indices calculated, why is the bit-spreading function needed, how does treeification work, and why isn't HashMap thread-safe?"

### The Quick Answer

"A `HashMap` is backed by an array of buckets (`Node<K,V>[] table`). When inserting a key-value pair, Java hashes the key, mixes its bits using a bit-spreading function, and computes the bucket index using `(n - 1) & hash`. Collisions are handled via **separate chaining**. In Java 8, when a bucket exceeds 8 nodes and total capacity reaches 64, the linked list converts to a **Red-Black Tree**, improving worst-case search from $O(n)$ to $O(\log n)$."

---

### Step-by-Step: What Happens on `map.put(key, value)`

#### 1. The Hash Perturbation Function
```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```
* **The Interview Trap:** Why does Java XOR the hash code with its unsigned right shift by 16 bits?
* **The Reason:** Table length $n$ is always a small power of 2. For an initial capacity of 16, $n - 1 = 15$ (`00001111` in binary). The index formula only considers the **lowest 4 bits**! Any set of keys with identical lower bits but differing upper bits would catastrophically collide in the same bucket. Shifting by 16 bits folds the high-order bits into the low-order bits, ensuring all bits influence bucket distribution.

#### 2. The Power-of-Two Index Optimization
```java
index = (n - 1) & hash;
```
* Mathematically, mapping a hash to a bucket requires modulo: `hash % n`.
* However, integer modulo is computationally expensive at the hardware CPU level. Because the array capacity $n$ is strictly maintained as a power of two ($2^k$), `hash % n` is mathematically identical to the bitwise operation `hash & (n - 1)`, which executes in a single clock cycle.

#### 3. Collision Handling & Treeification
* **Pre-Java 8:** Collisions chained entries into a singly linked list via head-insertion.
* **Java 8+ (Treeification):**
  * **`TREEIFY_THRESHOLD = 8`:** If a bucket reaches 8 nodes, it converts to a Red-Black Tree.
  * **`MIN_TREEIFY_CAPACITY = 64`:** If the table size is under 64, Java resizes the array instead of treeifying to save memory overhead.
  * **`UNTREEIFY_THRESHOLD = 6`:** During resizing, if a tree bucket drops to 6 nodes or fewer, it converts back to a linked list.

---

### Load Factor & Resizing

* **Default Initial Capacity:** 16 buckets.
* **Default Load Factor:** `0.75` (When $16 \times 0.75 = 12$ buckets are filled, the array doubles to 32).
* **Why 0.75?** It represents the optimal Poisson distribution trade-off between space utilization (too many empty buckets) and time efficiency (preventing high collision density).

---

### Why HashMap Is Not Thread-Safe

1. **Race Conditions & Lost Updates:** Concurrent `put()` operations can simultaneously calculate the same empty bucket slot and overwrite each other's nodes.
2. **The Java 7 Infinite Loop Bug:** Java 7 used head-insertion during resizing. Two concurrent threads rehashing the same bucket could invert the list pointers and form a circular linked list ($A \to B \to A$), trapping subsequent `get()` calls in a 100% CPU infinite loop. Java 8 switched to **tail-insertion** to preserve node order, eliminating circular loops (though concurrent corruption still occurs).
* **The Fix:** In multi-threaded systems, always use **`ConcurrentHashMap`**, which uses non-blocking Compare-And-Swap (CAS) operations and bucket-level synchronized locks.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how custom keys are defined with proper hash contracts across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
import java.util.HashMap;
import java.util.Objects;

final class AccountKey {
    private final String accountId;

    public AccountKey(String accountId) {
        this.accountId = accountId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AccountKey)) return false;
        return Objects.equals(accountId, ((AccountKey) o).accountId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(accountId);
    }
}

public class Main {
    public static void main(String[] args) {
        HashMap<AccountKey, Double> accounts = new HashMap<>();
        accounts.put(new AccountKey("ACC-101"), 5400.0);

        // O(1) lookup: hash matches bucket, equals matches exact key
        System.out.println(accounts.get(new AccountKey("ACC-101"))); // 5400.0
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <string>
#include <unordered_map>

struct AccountKey {
    std::string accountId;

    bool operator==(const AccountKey& other) const {
        return accountId == other.accountId;
    }
};

// C++ requires specializing std::hash for unordered_map
namespace std {
    template <>
    struct hash<AccountKey> {
        size_t operator()(const AccountKey& k) const {
            return hash<string>()(k.accountId);
        }
    };
}

int main() {
    std::unordered_map<AccountKey, double> accounts;
    accounts[{ "ACC-101" }] = 5400.0;

    std::cout << accounts[{ "ACC-101" }] << std::endl; // 5400.0
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
class AccountKey:
    def __init__(self, account_id: str):
        self.account_id = account_id

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, AccountKey):
            return False
        return self.account_id == other.account_id

    def __hash__(self) -> int:
        return hash(self.account_id)

accounts: dict[AccountKey, float] = {}
accounts[AccountKey("ACC-101")] = 5400.0

# O(1) average lookup in Python dict
print(accounts[AccountKey("ACC-101")])  # 5400.0
```

</TabItem>
</Tabs>
