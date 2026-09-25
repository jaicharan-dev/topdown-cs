---
id: 15-equals-hashcode-contract
title: "The equals() and hashCode() Contract"
description: "Understand the crucial contract between equals() and hashCode() to prevent silent bugs in collections."

sidebar_position: 15
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What exactly is the contract between equals() and hashCode()? If you override equals() without hashCode(), what silently breaks in a HashMap? Also, why is 31 used in standard hash algorithms?"

### The Quick Answer

"`==` tests reference identity (whether two pointers point to the exact same heap address), while `.equals()` tests logical state equality. The **contract** dictates: **If two objects are equal according to `equals()`, they MUST produce the exact same `hashCode()`.** If you override `equals()` without overriding `hashCode()`, logically identical objects will hash into different buckets in a `HashMap`, making retrieval impossible."

---

### The 5 Mathematical Axioms of `equals()`

The Java SE specification requires that any implementation of `equals()` forms an equivalence relation:
1. **Reflexive:** `x.equals(x)` must return `true`.
2. **Symmetric:** `x.equals(y)` must return `true` if and only if `y.equals(x)` returns `true`.
3. **Transitive:** If `x.equals(y)` is `true` and `y.equals(z)` is `true`, then `x.equals(z)` must be `true`.
4. **Consistent:** Multiple invocations return the same result unless state is mutated.
5. **Non-Nullity:** `x.equals(null)` must return `false` (never throw a `NullPointerException`).

---

### The Interview Trap: The Accidental Overload Bug

One of the most famous junior-to-mid interview bugs:

```java
public class User {
    private int id;

    // ❌ THE BUG: Overloading instead of Overriding!
    public boolean equals(User other) { 
        return other != null && this.id == other.id;
    }
}
```
* **Why it breaks:** The method signature in `java.lang.Object` is `equals(Object obj)`. By declaring `equals(User other)`, you have **overloaded** the method rather than overriding it.
* When collections like `HashSet` or `HashMap` invoke equality checks, they invoke `equals(Object)`. Because you didn't override it, the JVM executes `Object.equals(Object)` (which compares references via `==`), completely ignoring your custom method!
* **The Rule:** Always use `@Override` so the compiler flags signature mismatches.

---

### Why You Must Override Both (The HashMap Trap)

A `HashMap` locates values in two steps:
1. **Step 1:** Calls `key.hashCode()` to determine the **bucket array index**.
2. **Step 2:** Iterates through that specific bucket using `key.equals(otherKey)` to find the exact match.

```
Key: u2 ───> hashCode() ───> Bucket 7 (Empty!) ───> Returns NULL!
                      (u1 sits in Bucket 3 because default memory hashes differed)
```

If you override `equals()` but not `hashCode()`, two logically equal objects (`u1` and `u2`) will generate different hash codes based on their default memory addresses. When you search for `map.get(u2)`, the map checks the wrong bucket, finds nothing, and returns `null` without ever calling `.equals()`.

---

### Why is 31 Used in Hash Functions?

Standard implementations (such as `Objects.hash()` and IDE generators) multiply fields by 31:
1. **Odd Prime:** Using a prime number minimizes hash collisions when hashing sequences of values.
2. **Compiler Optimization:** Multiplying by 31 can be optimized by the JVM into an ultra-fast hardware bit-shift and subtraction:
   $$31 \times i = (i \ll 5) - i$$

---

### Crucial Nuance: The Mutable HashCode Trap

Never compute `hashCode()` using fields that can be modified after object creation.
* If you insert an object into a `HashSet` and later mutate its fields, its hashcode recalculates to a different bucket.
* The `HashSet` still holds the object in its original bucket. When you call `set.contains(obj)`, it checks the *new* bucket, fails to find it, and returns `false`. The object is now permanently trapped in the collection, creating a memory leak.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how equality and hash contracts are properly implemented across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
import java.util.Objects;

public final class User {
    private final int id;
    private final String name;

    public User(int id, String name) {
        this.id = id;
        this.name = name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true; // 1. Reflexivity / Reference check
        if (o == null || getClass() != o.getClass()) return false; // 2. Type check
        User user = (User) o;
        return id == user.id && Objects.equals(name, user.name);
    }

    @Override
    public int hashCode() {
        // Generates hash using 31-multiplier formula
        return Objects.hash(id, name);
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <string>
#include <unordered_set>

class User {
public:
    int id;
    std::string name;

    User(int id, std::string name) : id(id), name(name) {}

    // 1. Equality Operator
    bool operator==(const User& other) const {
        return id == other.id && name == other.name;
    }
};

// 2. Hash Specialization for std::unordered_set / std::unordered_map
namespace std {
    template <>
    struct hash<User> {
        size_t operator()(const User& u) const {
            return hash<int>()(u.id) ^ (hash<string>()(u.name) << 1);
        }
    };
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
class User:
    def __init__(self, user_id: int, name: str):
        self.user_id = user_id
        self.name = name

    # 1. Equality check
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, User):
            return False
        return self.user_id == other.user_id and self.name == other.name

    # 2. Hash contract: In Python, overriding __eq__ automatically sets __hash__ = None
    # to prevent bugs, unless __hash__ is explicitly defined:
    def __hash__(self) -> int:
        return hash((self.user_id, self.name))

# Usage:
u1 = User(1, "Alice")
u2 = User(1, "Alice")
user_set = {u1}
print(u2 in user_set)  # True
```

</TabItem>
</Tabs>
