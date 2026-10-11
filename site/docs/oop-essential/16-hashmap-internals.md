---
id: 16-hashmap-internals
title: "HashMap Internals: Buckets, Collisions, and Red-Black Trees"
description: "A deep dive into HashMap internals, covering bucket arrays, hash collisions, and the transition to red-black trees."

sidebar_position: 16
sidebar_class_name: sidebar-medium
---

import { HashMapStructureFigure } from '@site/src/components/Figures/HashMapInternals';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Explain how a HashMap works under the hood. Specifically, how are bucket indices calculated, why is the bit-spreading function needed, how does treeification work, and why isn't HashMap thread-safe?"

Think of a `HashMap` as a row of lockers (the `Node<K,V>[] table`). Every key gets turned into a number, a hash, and that number decides which locker it goes in. Put the same key in again, and the math sends you to the same locker, so lookups are fast: no scanning, just straight to the right slot.

<HashMapStructureFigure />

### What happens on `map.put(key, value)`

**1. Spreading the bits.** Java doesn't use the raw hash code as-is, it runs it through this first:

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

Here's why that matters. The table size is always a power of two, say 16. To turn a hash into a bucket index, Java only looks at the lowest 4 bits of the hash (more on that below). If two keys differ only in their *upper* bits, they'd land in the same bucket every time, even though their full hashes are different. XOR-ing the hash with its own top half folds those upper bits down into the lower bits, so they get a say in which bucket is picked too.

**2. Turning the hash into an index.**

```java
index = (n - 1) & hash;
```

The textbook way to map a hash into an array slot is `hash % n`. But division is slow on real hardware. Since the table size `n` is always a power of two, `hash % n` and `hash & (n - 1)` give the exact same answer, and the bitwise version runs in a single CPU cycle instead of using division.

**3. Handling collisions.** Two keys can hash to the same bucket. Before Java 8, that bucket just became a linked list: new entries got added to the front. Since Java 8, if a single bucket grows past 8 entries *and* the table has at least 64 buckets overall, that bucket converts into a **Red-Black Tree** instead. That turns worst-case lookup in that bucket from O(n) down to O(log n). If the bucket later shrinks back to 6 entries or fewer (usually after a resize), it converts back to a plain list; trees have more memory overhead, so Java only keeps one where it's worth it.

### Load factor and resizing

The table starts at 16 buckets. Once it's 75% full (12 of 16 buckets taken), Java doubles the array to 32 and re-buckets everything. That 0.75 number is a trade-off: too low, and you waste memory on empty buckets; too high, and collisions pile up and slow every lookup down.

### Why HashMap isn't thread-safe

Two threads calling `put()` at the same time can both decide the same bucket is empty and both write there, one update silently disappears.

It gets worse historically: in Java 7, resizing rebuilt each bucket's list by inserting at the head. If two threads resized the same bucket at once, they could end up pointing nodes at each other in a loop (`A → B → A`), and any later `get()` on that bucket would spin forever, pegging a CPU core at 100%. Java 8 fixed the looping bug by inserting at the tail during resize instead, but concurrent writes can still silently corrupt the map.

**The fix:** if more than one thread touches the map, use `ConcurrentHashMap`. It uses per-bucket locking and compare-and-swap operations instead of one big lock, so concurrent reads and writes don't trample each other.

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
