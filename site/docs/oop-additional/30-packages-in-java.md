---
id: 30-packages-in-java
title: "Packages and Access Modifiers"
description: "A quick guide on how packages organize code and interact with access modifiers for encapsulation."
sidebar_position: 11
sidebar_class_name: sidebar-easy
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What exactly is a package in Java? More specifically, how does the concept of a package dictate how the 'default' and 'protected' access modifiers actually behave?"

### The Quick Answer

"A package in Java is a namespace mechanism physically mapped to a directory hierarchy on the filesystem. Its primary purposes are organizing related classes, preventing naming collisions across libraries, and enforcing encapsulation boundaries. Packages directly define Java's access control rules: **package-private** (the default with no modifier) restricts visibility strictly to classes residing in the exact same package folder, whereas **`protected`** extends that visibility to subclasses residing in different packages when accessed through inheritance."

---

### The ELI5 Analogy: The Filing Cabinet

Imagine you are organizing a massive physical filing cabinet for a growing company.

If you throw 1,000 loose papers into one giant drawer, it is pure chaos. Worse, if you have a paper labeled *Invoice* from 2024 and another paper labeled *Invoice* from 2025 in the same drawer, you have a naming conflict: nobody knows which one you are referring to.

To fix this, you create labeled manila folders to group related papers together:
- You create a folder named `Billing` and a folder named `HR`.
- Now, you can safely keep a paper called *Invoice* inside `Billing` (`com.app.billing.Invoice`) and a totally different paper called *Invoice* inside `HR` (`com.app.hr.Invoice`) without any confusion.

In Java:
- The loose papers are your `.java` class files.
- The manila folders are your packages.

---

### Access Modifiers vs. Package Boundaries: The Matrix

In Java, access modifiers dictate whether code inside one class is allowed to read fields or call methods in another class based on package boundaries:

| Modifier | Same Class | Same Package | Subclass (Different Package) | World (Different Package) |
| :--- | :---: | :---: | :---: | :---: |
| **`public`** | Yes | Yes | Yes | Yes |
| **`protected`** | Yes | Yes | Yes *(via inheritance only)* | No |
| **`default`** *(no modifier)* | Yes | Yes | No | No |
| **`private`** | Yes | No | No | No |

---

### The Physical Directory Mapping & The "Neighborhood" Model

When Java documentation states that an entity has package-level scope, it refers to a concrete physical layout:

- **Same Package (The Neighborhood):** The files sit in the exact same directory on your hard drive. If `User.java` and `UserValidator.java` both declare `package com.myapp.users;`, they are physical neighbors. They can freely share default (package-private) and `protected` fields and methods without public getters or setters.
- **Different Package (A Different City):** If `User.java` resides in `com.myapp.users` and `Payment.java` resides in `com.myapp.billing`, they live in separate directories. `Payment.java` cannot access `User.java`'s default fields, even if both packages are part of the same application.

#### The `protected` Subtlety Across Packages
When a subclass in a *different* package inherits a `protected` member, it can access that member **only through its own inherited instance** (or `super`). It cannot access the `protected` member on an arbitrary instance of the parent class:

```java
package com.myapp.billing;
import com.myapp.users.User;

public class PremiumUser extends User {
    public void inspect() {
        // Allowed: accessed via inheritance on 'this'
        System.out.println(this.protectedUserId);

        // Compilation Error! Cannot access protected member on a foreign parent instance
        User foreignUser = new User();
        // System.out.println(foreignUser.protectedUserId); 
    }
}
```

---

### Package Declarations Across Languages

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// File path must strictly match: src/main/java/com/myproject/models/User.java
package com.myproject.models;

public class User {
    private String id;
    String packagePrivateNote; // Accessible only to classes in com.myproject.models
    protected String role;      // Accessible to models package + subclasses everywhere
    public String email;        // Universally accessible
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
# In Python, a directory becomes a package if it contains an __init__.py file.
# Directory: myproject/models/user.py

from myproject.models.user import User

# Python uses naming conventions for encapsulation rather than strict keywords:
# _single_leading_underscore -> protected / internal convention
# __double_leading_underscore -> name mangling (private)
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
// In C++, namespaces are purely logical and decoupled from physical directory structure.
namespace company::models {
    class User {
    private:
        std::string id;
    protected:
        std::string role;
    public:
        std::string email;
    };
}
```

</TabItem>
</Tabs>

---

### Crucial Nuance: Implicit Imports & Package-Private Architecture

#### 1. Why `String` and `System` Never Require an `import`
A classic interview question is: *"Why don't you have to import `String`, `Math`, or `System` in Java?"*

Under section §7.3 of the Java Language Specification, every compilation unit automatically imports all public types declared in the package `java.lang`. The statement `import java.lang.*;` is implicitly evaluated at compile time.

#### 2. Package-Private as an Architectural Boundary (Clean Architecture)
Many developers default to making every class `public`. However, senior engineers use **package-private** classes to enforce modularity and loose coupling:
- In Domain-Driven Design (DDD) or Hexagonal Architecture, you can declare a `public interface PaymentGateway` and keep its concrete implementation `class StripePaymentGateway implements PaymentGateway` **package-private** (no modifier).
- A public factory (`PaymentGatewayFactory`) constructs and returns the instance as the interface type.
- This prevents external packages from bypassing architectural boundaries, preventing direct instantiation or coupling to implementation details.

---

### Concise Interview Answer

1. **Definition & Physical Mapping:** A Java package is a namespace mapped directly to the filesystem folder structure that prevents naming collisions and groups related classes.
2. **Access Control Matrix:** `default` (package-private) permits access strictly within the same folder; `protected` permits access within the same folder plus subclasses across different packages via inheritance.
3. **Inheritance Constraint:** When accessing a `protected` member from another package, access is restricted to the subclass's own inherited context; arbitrary instances of the parent class cannot be dereferenced.
4. **Architecture Value:** Package-private visibility provides strong encapsulation by hiding concrete implementation classes inside a package while exposing only public interface contracts.
