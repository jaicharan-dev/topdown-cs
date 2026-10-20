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

### The filing cabinet analogy

Imagine organizing a huge filing cabinet for a growing company. Throw 1,000 loose papers into one drawer, and it's chaos — worse, if you have an *Invoice* from 2024 and another *Invoice* from 2025 in the same drawer, nobody knows which is which.

The fix is labeled folders: a `Billing` folder and an `HR` folder. Now an *Invoice* inside `Billing` (`com.app.billing.Invoice`) and a totally different *Invoice* inside `HR` (`com.app.hr.Invoice`) can coexist without confusion.

In Java, your `.java` files are the loose papers, and packages are the folders. A package is just a namespace that maps directly onto a real directory on disk — it groups related classes together and keeps names from colliding across the codebase.

### How access modifiers depend on those folders

| Modifier | Same Class | Same Package | Subclass (Different Package) | World (Different Package) |
| :--- | :---: | :---: | :---: | :---: |
| **`public`** | Yes | Yes | Yes | Yes |
| **`protected`** | Yes | Yes | Yes *(via inheritance only)* | No |
| **`default`** *(no modifier)* | Yes | Yes | No | No |
| **`private`** | Yes | No | No | No |

- **`default` (package-private):** visible only to classes physically sitting in the same folder.
- **`protected`:** visible in the same folder, plus to subclasses anywhere else, but only through inheritance.

### Same folder vs. different folder

- **Same package (neighbors):** if `User.java` and `UserValidator.java` both declare `package com.myapp.users;`, they sit in the same directory. They can freely use each other's default and `protected` members without needing public getters/setters.
- **Different package (a different city):** if `Payment.java` lives in `com.myapp.billing`, it can't touch `User.java`'s default-access fields, even though both are part of the same app.

### The `protected` subtlety across packages

A subclass in a *different* package can only reach an inherited `protected` member through its own instance (or `super`) — not through some other, unrelated instance of the parent class:

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

### Package declarations across languages

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

### Two things worth knowing

**Why you never `import` `String`, `Math`, or `System`.** Every Java file automatically imports everything public in `java.lang` — it's as if `import java.lang.*;` is silently written at the top of every file, per the Java Language Spec.

**Package-private as a design tool.** It's tempting to make every class `public`, but a lot of well-structured code deliberately doesn't. In Domain-Driven Design or hexagonal architecture, you might expose a `public interface PaymentGateway` while keeping its real implementation, `class StripePaymentGateway`, package-private — visible only inside that package. A public factory builds and hands back the interface type, so nothing outside the package can reach or depend on the concrete class directly.

---

### Say this in the interview

*"A package is a namespace mapped directly onto a folder on disk — it groups related classes and prevents naming collisions. That physical mapping is what drives Java's access rules: default (package-private) access is limited strictly to classes in the same folder, and `protected` extends that to subclasses in other packages, but only through inheritance — you can't reach a `protected` member on some unrelated instance of the parent. Beyond access control, package-private visibility is also a design tool: you can expose a public interface while keeping its implementation hidden inside the package, so nothing outside can depend on it directly."*
