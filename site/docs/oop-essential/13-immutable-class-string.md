---
id: 13-immutable-class-string
title: "Immutability in Java: Designing Safe Classes and the String Pool"
description: "Explore the mechanics of immutability in Java, including defensive copying, modern Records, and the String Pool."

sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk me through how you design a strictly immutable class in Java. Why is String immutable, how do you handle defensive copying properly, and how do Java 14+ Records fit in?"

### The Quick Answer

"An immutable class is one whose internal state cannot be modified after instantiation. In Java, you achieve this by marking the class `final`, all fields `private final`, providing no mutating methods, and performing **defensive copies** on all mutable references. `String` is immutable for four primary reasons: memory optimization (the String Pool), security, multithreaded safety, and hashcode caching."

---

### The 5 Rules for Handcrafting an Immutable Class

1. **Mark the class `final`:** Prevents subclasses from overriding methods or exposing mutable state.
2. **Make all fields `private`:** Enforces encapsulation by hiding state from direct external access.
3. **Make all fields `final`:** Guarantees single assignment and triggers the Java Memory Model's "freeze action" for safe publication across threads without synchronization.
4. **Provide no setter methods:** Never expose methods that mutate internal state.
5. **Enforce Defensive Copying (The Interview Trap):**
   * **In the constructor:** Always clone incoming mutable objects (like `ArrayList`, `Date`, or custom objects) **before** storing them. *(Senior Tip: Copy before parameter validation to prevent Time-of-Check to Time-of-Use [TOCTOU] attacks).*
   * **In getters:** Never return a direct reference to a mutable internal field. Return an unmodifiable view (e.g., `Collections.unmodifiableList()`) or `List.copyOf()` (Java 10+).

---

### Modern Java: What About Records (Java 14+)?

Interviewers will ask: *"Why manually write immutable classes when modern Java has `record`?"*

A `record` (introduced in Java 14/16) automatically provides:
* An implicitly `final` class.
* `private final` fields.
* Canonical constructor, getters, `equals()`, `hashCode()`, and `toString()`.

**The Record Trap:** Records **do not** automatically defensively copy mutable fields!
If you declare `record Portfolio(String name, List<String> stocks) {}`, client code can pass an `ArrayList` and mutate it externally. You must define a **compact constructor** to enforce defensive copying:
```java
public record Portfolio(String name, List<String> stocks) {
    public Portfolio {
        stocks = List.copyOf(stocks); // Defensively copies and enforces immutability
    }
}
```

---

### Why is `String` Immutable in Java?

1. **The String Pool (Heap Optimization):** Reuses identical string literals. If strings were mutable, changing a string through one reference would silently corrupt all other references pointing to that literal.
2. **Security:** Strings hold sensitive arguments (database credentials, socket URLs, file paths). If mutable, a background thread could alter a file path between authentication check and file opening (race condition).
3. **Thread Safety:** Immutable objects can be shared freely across concurrent threads without locks or synchronization.
4. **HashCode Caching:** `String` caches its hash code during the first `hashCode()` call. Because its characters can never change, the hash is computed once and reused for instant $O(1)$ lookups in `HashMap` and `HashSet`.

---

### Crucial Nuance: The Reflection Backdoor

Can an immutable string ever be changed? **Yes, via reflection.**
Using `Field.setAccessible(true)` on `java.lang.reflect.Field`, code with sufficient JVM security permissions can access the internal `byte[] value` of a `String` and alter it directly in heap memory. Immutability in Java is a language and type safety contract, not hardware-level memory protection.

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
