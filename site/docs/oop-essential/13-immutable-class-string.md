---
id: 13-immutable-class-string
title: "Immutability in Java: Designing Safe Classes and the String Pool"
description: "Explore the mechanics of immutability in Java, including defensive copying, modern Records, and the String Pool."

sidebar_position: 13
sidebar_class_name: sidebar-medium
---

import { DefensiveCopyFigure } from '@site/src/components/Figures/ImmutableClass';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk me through how you design a strictly immutable class in Java. Why is String immutable, how do you handle defensive copying properly, and how do Java 14+ Records fit in?"

An immutable object is one that can't change after it's created. Once you build it, its state is frozen for its entire lifetime - no setter, no sneaky backdoor, can touch it.

### The quick answer

In Java, you build an immutable class by marking the class `final`, making every field `private final`, giving it no methods that mutate state, and making **defensive copies** of any mutable object it takes in or hands out. `String` itself is immutable for four reasons: it enables the String Pool (memory reuse), it's safer, it's thread-safe without any locking, and it lets the hash code be cached.

### The 5 rules for building an immutable class by hand

1. **Mark the class `final`.** Stops a subclass from overriding a method and sneaking in mutable behavior.
2. **Make every field `private`.** Nothing outside the class can reach in and touch the data directly.
3. **Make every field `final`.** Guarantees it's assigned exactly once, and lets the Java Memory Model safely publish the object across threads without needing synchronization.
4. **Write no setters.** If there's no method that can change state, state can't change.
5. **Defensively copy anything mutable - this is the one people forget:**
   * **In the constructor:** clone any mutable object passed in (a `List`, a `Date`, a custom object) *before* storing it. Copy it before you even validate it, so nobody can sneak in a change between your check and your copy (a TOCTOU attack).
   * **In getters:** never hand back a direct reference to a mutable internal field. Return an unmodifiable view (`Collections.unmodifiableList()`) or a real copy (`List.copyOf()`, Java 10+).

<DefensiveCopyFigure />

### What about Records (Java 14+)?

A `record` gives you most of this for free: an implicitly `final` class, `private final` fields, and a generated constructor, getters, `equals()`, `hashCode()`, and `toString()`.

**The catch:** records don't defensively copy mutable fields automatically. Declare `record Portfolio(String name, List<String> stocks) {}`, and a caller can hand you an `ArrayList`, keep a reference to it, and mutate it from outside - your "immutable" record just changed underneath you. Fix it with a compact constructor:

```java
public record Portfolio(String name, List<String> stocks) {
    public Portfolio {
        stocks = List.copyOf(stocks); // Defensively copies and enforces immutability
    }
}
```

### Why is `String` immutable?

1. **The String Pool.** Java reuses identical string literals to save memory. If strings could change, mutating one reference would corrupt every other variable silently pointing at that same literal.
2. **Security.** Strings often carry sensitive values - database credentials, file paths, URLs. If they were mutable, something could change a file path in the gap between a security check and the file actually being opened.
3. **Thread safety.** An object that can't change can be shared across threads freely, with no locks needed.
4. **Hash code caching.** `String` computes its hash code once, on the first `hashCode()` call, and reuses it forever - safe only because the characters can never change. That's what makes `HashMap` and `HashSet` lookups on strings so fast.

### One nuance: the reflection backdoor

Can an immutable string ever actually change? Yes - through reflection. With `Field.setAccessible(true)` and enough JVM permissions, code can reach into `String`'s internal `byte[]` and edit it directly in heap memory. Immutability in Java is a contract enforced by the language and the type system - not a hardware-level guarantee.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how immutable objects are created across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
import java.util.Collections;
import java.util.List;
import java.util.ArrayList;

public final class ImmutablePortfolio {
    private final String investor;
    private final List<String> stocks;

    public ImmutablePortfolio(String investor, List<String> stocks) {
        this.investor = investor;
        // Defensive copy in constructor to break external reference
        this.stocks = new ArrayList<>(stocks); 
    }

    public String getInvestor() {
        return investor;
    }

    // Defensive view in getter prevents external additions
    public List<String> getStocks() {
        return Collections.unmodifiableList(stocks);
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <string>
#include <vector>

// In C++, immutability is enforced via 'const' references and member qualifiers
class ImmutablePortfolio {
private:
    const std::string investor;
    const std::vector<std::string> stocks;

public:
    // Takes ownership by value or creates a copy via initializer list
    ImmutablePortfolio(std::string inv, std::vector<std::string> stk)
        : investor(inv), stocks(stk) {}

    std::string getInvestor() const { return investor; }

    // Returns a const reference to prevent external mutation
    const std::vector<std::string>& getStocks() const { return stocks; }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
from dataclasses import dataclass
from typing import Tuple

# In Python, @dataclass(frozen=True) creates an immutable class.
# Use immutable Tuple instead of mutable List to ensure deep immutability:
@dataclass(frozen=True)
class ImmutablePortfolio:
    investor: str
    stocks: Tuple[str, ...]  # Immutable collection

# Usage:
portfolio = ImmutablePortfolio("Alice", ("AAPL", "GOOGL"))
# portfolio.investor = "Bob" # Raises FrozenInstanceError!
```

</TabItem>
</Tabs>
