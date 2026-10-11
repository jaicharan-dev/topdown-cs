---
id: 24-shallow-vs-deep-copy
title: "Shallow Copy vs. Deep Copy"
description: "Learn the critical differences between shallow copies and deep copies when cloning objects, and how to avoid the circular reference trap."

sidebar_position: 19
sidebar_class_name: sidebar-easy
---

import { ShallowVsDeepFigure } from '@site/src/components/Figures/ShallowDeepCopy';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "Can you explain the difference between a shallow copy and a deep copy? If I modify a nested object in a shallow copy, what happens to the original, and how do you handle circular references during deep copies?"

Picture a briefcase holding a gold coin and a slip of paper with a house's address written on it.

- **Shallow copy:** you get a new briefcase, and a freshly minted coin inside it - but the address slip is just copied word for word. Both briefcases now point to the *same* house. Repaint that house, and whoever opens either briefcase sees the new paint.
- **Deep copy:** you get a new briefcase, a new coin, and - instead of copying the address - a whole new house is built from scratch on a different street, and that new address goes in the slip. The two houses have nothing to do with each other anymore.

That's the whole idea. A shallow copy duplicates the outer object but still points at the same nested objects as the original. A deep copy duplicates the outer object *and* recursively rebuilds every nested object too, so the copy and the original share nothing.

<ShallowVsDeepFigure />

### Comparing the two

| Dimension | Shallow Copy | Deep Copy |
|---|---|---|
| **Outer Container** | A new object is allocated. | A new object is allocated. |
| **Nested Objects** | Shared - both point at the same memory. | Independent - each one is freshly cloned. |
| **Mutation Risk** | Changing a nested field also changes the original. | Changing a nested field never touches the original. |
| **Performance** | Fast, O(1), barely any extra memory. | Slower - has to walk the whole object graph and allocate as it goes. |

### The trap: objects that reference each other

If you're asked to write `deepCopy()` by hand, watch out for cycles: `Object A` points at `Object B`, and `Object B` points right back at `A`. A naive recursive copy bounces between them forever and blows the stack with a `StackOverflowError`.

The fix is to remember what you've already copied. Keep a map from each original object's identity to its already-made clone (Java's `IdentityHashMap`, or a dict keyed by `id()` in Python). Before cloning a reference, check that map first - if it's already there, reuse the clone instead of recursing again.

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
