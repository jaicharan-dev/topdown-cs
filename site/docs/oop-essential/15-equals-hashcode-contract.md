---
id: 15-equals-hashcode-contract
title: "The equals() and hashCode() Contract"
description: "Understand the crucial contract between equals() and hashCode() to prevent silent bugs in collections."

sidebar_position: 15
sidebar_class_name: sidebar-medium
---

import { EqualsContractFigure } from '@site/src/components/Figures/EqualsHashCode';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What exactly is the contract between equals() and hashCode()? If you override equals() without hashCode(), what silently breaks in a HashMap? Also, why is 31 used in standard hash algorithms?"

`==` asks "are these the exact same object in memory?" `.equals()` asks "do these two objects represent the same value?" Two different `User` objects holding the same id and name are `==`-unequal but should be `.equals()`-equal.

### The quick answer

The contract is simple to state and easy to violate: **if two objects are equal according to `equals()`, they must produce the same `hashCode()`.** Override one without the other and you break it: two logically identical objects can end up with different hash codes, and a `HashMap` will never manage to find one using the other.

### The 5 rules `equals()` must follow

Java requires `equals()` to behave like a proper equivalence relation:
1. **Reflexive:** `x.equals(x)` is always `true`.
2. **Symmetric:** `x.equals(y)` is `true` exactly when `y.equals(x)` is `true`.
3. **Transitive:** if `x.equals(y)` and `y.equals(z)` are both `true`, then `x.equals(z)` must be `true` too.
4. **Consistent:** calling it repeatedly gives the same answer, as long as nothing changed.
5. **Never true for null:** `x.equals(null)` must return `false`, never throw.

### The classic bug: overloading instead of overriding

```java
public class User {
    private int id;

    // THE BUG: this overloads equals, it doesn't override it!
    public boolean equals(User other) { 
        return other != null && this.id == other.id;
    }
}
```

`Object` declares `equals(Object obj)`. Writing `equals(User other)` creates a second, unrelated method with a different signature, it doesn't replace the original. A `HashSet` or `HashMap` always calls `equals(Object)`, so it ends up calling `Object`'s version, which just checks `==`, and silently ignores the method you wrote. Always add `@Override`, the compiler will catch this immediately, because there's nothing in the parent to override.

### Why both methods matter together

A `HashMap` finds a value in two steps:

<EqualsContractFigure />

If you override `equals()` but leave the default `hashCode()` in place, two logically-equal objects can still get different hash codes: because the default hash is based on memory address, and `equals()` no longer cares about that. So `u1` lands in one bucket and `u2`, equal by your own definition, hashes into a different, empty bucket. Call `map.get(u2)`, and the map checks the wrong bucket, finds nothing, and returns `null`: it never even gets to step 2.

### Why is 31 used in hash functions?

Tools like `Objects.hash()` and IDE-generated code multiply fields by 31 for two reasons:
1. It's an odd prime, which spreads values out and minimizes collisions when combining multiple fields.
2. The JVM can optimize `31 * i` into a bit-shift and subtraction - `(i << 5) - i` - which is faster than a real multiplication.

### One more trap: mutable fields in `hashCode()`

Never compute a hash from a field that can change after the object is created. If you put an object in a `HashSet` and then mutate a field used in its hash, its hash code changes - but the set still has it filed under the *old* bucket. Call `set.contains(obj)` afterward and it checks the new bucket, finds nothing, and returns `false`. The object is still in the set - just unreachable. That's a quiet memory leak.

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
