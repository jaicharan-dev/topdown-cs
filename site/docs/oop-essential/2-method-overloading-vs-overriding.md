---
id: 2-method-overloading-vs-overriding
title: "Method Overloading vs. Overriding"
description: "Master the differences between compile-time overloading and runtime overriding in object-oriented programming."

sidebar_position: 2
sidebar_class_name: sidebar-medium
---

import {
  BindingTimeFigure,
  ReturnTypeFigure,
  DispatchFigure,
} from '@site/src/components/Figures/OverloadingOverriding';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Walk me through method overloading versus overriding. What's 'dynamic method dispatch,' and how does the runtime actually resolve it?"

### The short version

"Overloading" and "overriding" both fall under polymorphism, but they get resolved at opposite times:

1. **Overloading (compile-time):** Same method name, different parameter list, same class. The compiler picks the right version while compiling - it just looks at what you passed in.
2. **Overriding (runtime):** A subclass replaces a method it inherited from its parent, keeping the exact same name and parameters. Which version actually runs is decided at runtime, based on the real object - not the type of the variable pointing to it.

### Two quick pictures

**Overloading is like a multi-tool.** You tell a friend "paint." Hand them a roller, they paint a wall. Hand them a brush and a tiny canvas, they paint a miniature portrait. Same word, different tool handed over, different result.

**Overriding is like a local branch following its own version of a policy.** Head office defines a default `processRefund()`. Your local branch has its own regional rules, so it overrides `processRefund()` with its own version. When a customer asks for a refund at your branch, your local version runs - not head office's.

<BindingTimeFigure />

---

### Side by side

| Feature | Method Overloading | Method Overriding |
|---|---|---|
| **Polymorphism type** | Compile-time (static binding) | Runtime (dynamic binding) |
| **Where it happens** | Same class (or inherited into it) | Between a parent and a child class |
| **Signature** | Parameters must differ | Name and parameters must match exactly |
| **Return type** | Can differ, but can't be the *only* thing that differs | Must match, or be a subtype (covariant) |
| **Access modifiers** | Free to change | Can't become more restrictive than the parent's |
| **How it's resolved** | The compiler binds the call directly | The JVM looks it up at runtime (vtable) |

---

### Traps interviewers like to test

#### Can return type alone overload a method?
No. If two methods have the same name and the same parameters but different return types, that's a compile error - not an overload:
```java
// Compile Error: calculate() is already defined
int calculate(int x) { return x * 2; }
double calculate(int x) { return x * 2.0; }

// If caller runs: calculate(5); -> compiler has no way to know which one you meant
```

<ReturnTypeFigure />

The compiler can't tell which one you meant just by looking at the call - it would have to guess based on what you do with the result, which it won't do.

#### The three rules overriding has to follow
* **Covariant return types:** the child's return type doesn't need to match exactly - it can return a *more specific* type. If the parent returns `Number`, the child can return `Integer`.
* **Access can only get wider, never narrower:** if the parent method is `protected`, the child can make it `protected` or `public`, but never `private`.
* **Checked exceptions can only shrink:** the child can throw fewer checked exceptions than the parent, or narrower ones, or any unchecked (`RuntimeException`) exceptions - but never new or broader checked ones.

#### Can static, final, or private methods be overridden?
No, for three different reasons:
* **Static methods** get "hidden," not overridden. If a child defines a static method with the same signature as the parent's, Java picks which one runs based on the *declared* type of the variable, decided at compile time - not the real object.
* **Final methods** can't be touched - that's the entire point of `final`.
* **Private methods** aren't visible to subclasses at all. A method with the same name in a child class is just a separate, unrelated method.

---

### How dynamic dispatch actually works

```java
PaymentProcessor processor = new CryptoProcessor();
processor.processPayment();
```

With overloading, the compiler already knows which method to call before the program runs - it just reads the argument types at the call site. That's **early binding**.

With overriding, it's different. At compile time, Java only checks that `PaymentProcessor` has *some* `processPayment()` method - it doesn't know yet which version will run. At runtime:
1. The JVM checks what `processor` actually points to - a `CryptoProcessor`, not just a generic `PaymentProcessor`.
2. It looks up `CryptoProcessor`'s method table (its vtable) to find where that class's own `processPayment()` lives.
3. It runs that version.

<DispatchFigure />

That's **late binding** - the decision gets made based on the real object, not the variable's declared type.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how overloading and overriding are implemented across different languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// 1. OVERLOADING (Compile-Time / Early Binding)
class MathUtils {
    public int calculateArea(int side) {
        return side * side;
    }

    public int calculateArea(int length, int width) {
        return length * width;
    }
}

// 2. OVERRIDING & DYNAMIC DISPATCH (Run-Time / Late Binding)
class PaymentProcessor {
    public void processPayment() {
        System.out.println("Processing standard bank transfer.");
    }
}

class CryptoProcessor extends PaymentProcessor {
    @Override
    public void processPayment() {
        System.out.println("Processing Bitcoin transaction via blockchain.");
    }
}

public class Main {
    public static void main(String[] args) {
        // Reference type = Parent, Actual Object = Child
        PaymentProcessor myProcessor = new CryptoProcessor();

        // Outputs: "Processing Bitcoin transaction via blockchain."
        // Resolved at runtime via Dynamic Method Dispatch (vtable)
        myProcessor.processPayment(); 
    }
}
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <memory>

// 1. OVERLOADING (Compile-Time)
class MathUtils {
public:
    int calculateArea(int side) { return side * side; }
    int calculateArea(int length, int width) { return length * width; }
};

// 2. OVERRIDING & DYNAMIC DISPATCH (Run-Time via vtable)
class PaymentProcessor {
public:
    virtual ~PaymentProcessor() = default;

    // virtual keyword enables dynamic dispatch via vtable
    virtual void processPayment() {
        std::cout << "Processing standard bank transfer." << std::endl;
    }
};

class CryptoProcessor : public PaymentProcessor {
public:
    // override keyword allows compiler to verify matching signature
    void processPayment() override {
        std::cout << "Processing Bitcoin transaction via blockchain." << std::endl;
    }
};

int main() {
    // Base pointer pointing to derived instance
    std::unique_ptr<PaymentProcessor> myProcessor = std::make_unique<CryptoProcessor>();

    // Dynamically dispatched via vtable to CryptoProcessor::processPayment
    myProcessor->processPayment();
    return 0;
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
# 1. OVERLOADING: Python does NOT support method overloading by signature natively.
# Defining the same method twice simply overwrites the first.
# The Pythonic way is using default arguments or *args:
class MathUtils:
    def calculate_area(self, length: int, width: int = None) -> int:
        if width is None:
            return length * length  # Square
        return length * width       # Rectangle

# 2. OVERRIDING & DYNAMIC DISPATCH (Python resolves methods dynamically via MRO)
class PaymentProcessor:
    def process_payment(self) -> None:
        print("Processing standard bank transfer.")

class CryptoProcessor(PaymentProcessor):
    def process_payment(self) -> None:
        print("Processing Bitcoin transaction via blockchain.")

# Usage:
# Reference variable holding child object
my_processor: PaymentProcessor = CryptoProcessor()

# Outputs: "Processing Bitcoin transaction via blockchain."
my_processor.process_payment()
```

</TabItem>
</Tabs>

---

### One more edge case: overloading with varargs

Say you overload a method where one version takes a fixed type and another takes varargs - `print(int x)` vs `print(int... x)`.

When you call `print(5)`, Java prefers the most specific, fixed-argument match first. Varargs is the last resort, used only when nothing else fits. But if you have two *competing* varargs overloads - say `print(Integer... x)` and `print(Long... x)` - calling `print()` with no arguments at all is ambiguous. The compiler has no way to know which empty array you meant, so it refuses to compile.
