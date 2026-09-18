---
id: 13-immutable-class-string
title: "Immutability in Java: Designing Safe Classes and the String Pool"
sidebar_position: 13
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk me through how you'd design a strictly immutable class in Java. Also, String is famously immutable—what are the actual architectural benefits of that decision?"

Here is the top-down breakdown for immutability. This is a foundational concept in Java, and interviewers use this question to test your knowledge of thread safety, memory management, and secure class design.

### The Interview Quick-Hit

"An immutable class is one whose state cannot be modified after it is created. You create one by making the class `final`, making all fields `private` and `final`, providing no setters, and using defensive copying for any mutable object references. `String` is immutable in Java primarily for memory efficiency (the String Pool), security, and thread safety."

### 1. What is an Immutable Class?

An immutable class is simply a class where, once an object is instantiated and its memory is allocated, its internal data cannot be changed. Any operation that seems to "modify" the object will actually create and return a brand new object with the new state, leaving the original untouched.

### 2. How to Create an Immutable Class

Interviewers are looking for a specific checklist of rules. If you miss the last rule (defensive copying), they will trap you on it.

### The 5 Rules of Immutability:
1. **Make the class final:** This prevents a subclass from extending it and overriding methods to alter behavior.
2. **Make all fields private:** This ensures direct access is blocked.
3. **Make all fields final:** This ensures the variables can only be assigned once.
4. **No Setter Methods:** Do not provide any methods that modify the fields.
5. **Defensive Copying (The Trap):** If your class holds a reference to a mutable object (like an `ArrayList` or `Date`), you cannot just return the reference in your getter, or assign it directly in your constructor. You must create "clones" or deep copies.

### Code Example:
```java
import java.util.ArrayList;
import java.util.List;

// 1. Class is final
public final class ImmutablePortfolio {
    
    // 2 & 3. Fields are private and final
    private final String investorName;
    private final List<String> stocks; 

    public ImmutablePortfolio(String investorName, List<String> stocks) {
        this.investorName = investorName;
        // 5. Defensive copy in constructor
        this.stocks = new ArrayList<>(stocks); 
    }

    public String getInvestorName() {
        return investorName;
    }

    // 4. No setters provided

    public List<String> getStocks() {
        // 5. Defensive copy in getter
        return new ArrayList<>(stocks); 
    }
}
```

Why the defensive copy? If you just returned `this.stocks` in the getter, another developer could call `portfolio.getStocks().add("PennyStock")`. Even though your class is "immutable," they just modified your internal list! Returning a copy prevents this.

### 3. Why is String Immutable in Java?

This is a classic follow-up. Java designers made `String` immutable for four critical reasons:

### A. Memory Efficiency (The String Pool)
Because Strings are used everywhere, Java optimizes memory by storing string literals in a special area of the heap called the String Pool. If you write `String a = "Java"` and `String b = "Java"`, both variables point to the exact same object in memory.
*Why immutability matters here:* If `String` were mutable, changing `a` to `"Python"` would instantly change `b` to `"Python"` as well, breaking the entire application.

### B. Security
Strings are used to pass highly sensitive information: database URLs, network connections, file paths, and passwords.
*Why immutability matters here:* Imagine passing a file path to a security validator. It passes the check. But if `String` were mutable, a malicious thread could change the file path string after the security check but before the file is actually opened. Immutability guarantees the string you validate is the string you use.

### C. Thread Safety
Immutable objects are inherently thread-safe.
*Why immutability matters here:* You do not need to write complex synchronized blocks when multiple threads are reading the same `String`. Since the state can never change, there is no risk of a race condition.

### D. Hashcode Caching
Strings are the most popular keys used in `HashMap` and `HashSet`.
*Why immutability matters here:* A `HashMap` relies on the key's `hashCode()` remaining exactly the same forever (as discussed in the equals/hashCode contract). Because a `String` never changes, Java calculates its hashcode once and caches it. If Strings were mutable, their hashcodes would change when their text changed, causing them to get permanently lost inside the `HashMap`.

---

### Crucial Nuance: The Reflection Loophole

If an interviewer asks you, "Is it completely impossible to change an immutable string in Java?", the senior answer is **No, you can break it.**

While the compiler strictly enforces immutability, the JVM has a backdoor: **Java Reflection**. By using `Field.setAccessible(true)`, a developer can reach deep into the `String` class, grab the internal `byte[]` array that actually holds the characters, and manually rewrite the memory at runtime. Because of the String Pool, if you use reflection to maliciously alter the literal `"Hello"` to `"Satan"`, every other completely unrelated string in the application that used `"Hello"` will suddenly print `"Satan"`. 

Immutability in Java is a structural API guarantee, not a cryptographically secure memory lock.
