---
id: 24-shallow-vs-deep-copy
title: "Shallow Copy vs. Deep Copy"
description: "Learn the critical differences between shallow copies and deep copies when cloning objects, and how to avoid the circular reference trap."

sidebar_position: 19
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Can you explain the difference between a shallow copy and a deep copy? If I modify a nested object in a shallow copy, what happens to the original, and how do you handle circular references during deep copies?"

### The Quick Answer

"A **shallow copy** creates a new outer object, but copies references to any nested objects; both the original and the clone point to the exact same child objects in memory. A **deep copy** creates a new outer object and recursively clones all nested objects, ensuring the clone shares zero references with the original and can be modified without side-effects."

---

### The ELI5 Analogy: The Briefcase and the House

Imagine you have a briefcase (the top-level object). Inside is a gold coin (a primitive integer) and a piece of paper with an address to a house (a reference to a nested object).

* **Shallow Copy:** You buy a new briefcase and forge a copy of the gold coin. But for the address, you simply copy the same text onto a new slip of paper. Both briefcases point to the **exact same physical house**. If you go to the house and repaint the walls, whoever opens the original briefcase will also see the painted walls.
* **Deep Copy:** You buy a new briefcase, forge the coin, but then **hire a construction crew to build an exact twin of the house** on a new street. You write the new address in the new briefcase. The two houses are entirely independent.

---

### Technical Comparison

| Dimension | Shallow Copy | Deep Copy |
|---|---|---|
| **Outer Container** | New object instance allocated. | New object instance allocated. |
| **Nested Objects** | **Shared references** pointing to original memory. | **Independent clones** recursively allocated. |
| **Mutation Risk** | Mutating nested fields **corrupts the original**. | Mutating nested fields is **100% isolated**. |
| **Performance** | $O(1)$ fast, negligible memory. | Slower, requires traversing object graph and allocating memory. |

---

### The Interview Trap: The Circular Reference Problem

When asked to implement a custom `deepCopy()` function, interviewers check if you account for cyclic object graphs:

* **The Problem:** If `Object A` references `Object B`, and `Object B` references `Object A`, a naive recursive deep copy will loop infinitely between them, resulting in a fatal **`StackOverflowError`**.
* **The Solution:** Maintain a **visited identity map** (e.g., `IdentityHashMap` in Java, or a dictionary keyed by `id()` in Python). Before cloning any reference, check if its memory address already exists in the visited map. If it does, return the cached clone instead of recurring.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how shallow and deep copies are implemented across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
class Address {
    String city;
    Address(String city) { this.city = city; }
}

class User {
    String name;
    Address address;

    // Shallow Copy Constructor: Shares Address reference
    User(User other, boolean isDeep) {
        this.name = other.name;
        if (isDeep) {
            // DEEP COPY: Allocates a new Address object
            this.address = new Address(other.address.city);
        } else {
            // SHALLOW COPY: Shares the same Address pointer
            this.address = other.address;
        }
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <string>

class User {
public:
    std::string name;
    int* data; // Pointer to heap resource

    // Deep Copy Constructor: Allocates distinct heap memory
    User(const User& other) : name(other.name) {
        data = new int(*other.data); // New allocation
    }

    ~User() { delete data; }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
import copy

original = {
    "name": "Alice",
    "details": {"city": "New York"}
}

# 1. SHALLOW COPY: copy.copy()
shallow = copy.copy(original)
shallow["details"]["city"] = "London"
print(original["details"]["city"]) # "London" (Original mutated!)

# 2. DEEP COPY: copy.deepcopy() (Handles circular references automatically)
deep = copy.deepcopy(original)
deep["details"]["city"] = "Paris"
print(original["details"]["city"]) # "London" (Original untouched!)
```

</TabItem>
</Tabs>
