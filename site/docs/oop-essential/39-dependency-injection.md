---
id: 39-dependency-injection
title: "Dependency Injection vs. Dependency Inversion"
description: "A principle, a technique and a pattern that get used as synonyms and are not"

sidebar_position: 22
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Everyone throws around the terms Dependency Injection, Dependency Inversion, and Inversion of Control. Are they the same thing? What are the three types of DI, and why is field injection considered an anti-pattern?"

---

### Picture it

Think of a chef who needs an oven.

**The usual arrangement is that the chef buys their own oven.** They walk into the shop, choose a specific model, and install it. Now the kitchen is stuck with that model. Testing the chef's recipes means buying that oven. Switching to a different one means editing the chef.

**The better arrangement is that the oven is installed for them.** The chef's job description says "there will be an oven". Who installs it, and which model, is somebody else's decision. The chef can be tested against a pretend oven, and the real one can be swapped without touching the chef.

Three separate ideas hide in that change, and interviewers ask because people blur them.

The **rule** that the chef should depend on "an oven" rather than a specific model is one thing. The **act** of handing them one when the kitchen is assembled is another. And the fact that the kitchen assembles the chef, rather than the chef assembling the kitchen, is a third and broader one.

---

### The proper terms

#### The three, separated

The **Dependency Inversion Principle** is a **principle**, the D in SOLID. High-level modules should not depend on low-level modules; both should depend on **abstractions**. The "inversion" is the direction of the dependency arrow: normally policy points at detail, and here both point at an interface, which is usually owned by the policy side.

**Dependency Injection** is a **technique**. An object receives its collaborators from outside rather than constructing them. It is one way, and the usual way, to satisfy the principle.

**Inversion of Control** is a broad **pattern** in which a framework drives the flow and calls your code, rather than your code calling a library. It is sometimes called the **Hollywood Principle**, "don't call us, we'll call you". Dependency injection is one specific form of it; template methods, callbacks and event loops are others.

In one line: DIP says what to depend on, DI is how the dependency arrives, and IoC is the wider shift in who is in charge. You can satisfy DIP without a framework, and you can use an IoC container that performs DI for you.

#### The three types of injection

**Constructor injection** passes dependencies as constructor parameters. This is the recommended form because the object cannot be created in an invalid state, the fields can be **`final`**, and the dependencies are visible in the signature. Since Spring 4.3, a single constructor needs no `@Autowired`.

**Setter injection** supplies them through setters after construction. It suits genuinely **optional** dependencies and allows reconfiguration, at the cost of the object existing briefly in an incomplete state.

**Field injection** places the annotation directly on the field, and the container sets it reflectively.

#### Why field injection is an anti-pattern

**It hides dependencies.** They are invisible in the public API, so nothing in the constructor signature reveals what the class needs.

It prevents `final` fields, since the field is assigned by reflection after construction, so immutability is lost.

**It makes testing awkward.** Without a container, a plain `new` leaves every dependency null. Tests must use reflection or start a context, where constructor injection would simply pass test doubles in.

**It hides design problems.** Adding a tenth dependency to a constructor is visibly uncomfortable and prompts a rethink. Adding a tenth annotated field is painless, so classes quietly grow beyond a single responsibility.

**It couples you to the container.** The class can only be constructed properly by a framework that understands the annotation.

#### Related ideas

A circular dependency, where two beans require each other, is detectable at construction time with constructor injection and fails fast, whereas field injection can mask it.

The Service Locator pattern is the common alternative, where a class asks a registry for its dependencies. It is generally considered inferior because dependencies remain hidden and the locator becomes a global coupling point.

---

### In code

```java
interface PaymentGateway { void charge(double amount); }

// Worst: constructs its own dependency, so it cannot be swapped or tested
class OrderServiceWorst {
    private final PaymentGateway gateway = new StripeGateway();   // welded in
}

// Field injection: hidden dependency, cannot be final, hard to test
class OrderServiceField {
    @Autowired
    private PaymentGateway gateway;        // invisible in the API, null under `new`
}

// Constructor injection: dependencies explicit, fields final, trivially testable
class OrderService {
    private final PaymentGateway gateway;

    OrderService(PaymentGateway gateway) {        // the signature states the need
        this.gateway = gateway;
    }

    void checkout(double total) {
        gateway.charge(total);
    }
}

// Testing needs no framework at all
class OrderServiceTest {
    void chargesTheTotal() {
        var charged = new double[1];
        var fake = (PaymentGateway) amount -> charged[0] = amount;

        new OrderService(fake).checkout(42.0);    // no container, no reflection

        assert charged[0] == 42.0;
    }
}
```

The test is the argument. With constructor injection it is three lines and no framework. With field injection the same test needs reflection or a running context.

---

### What they ask next

**"Can you have DI without a framework?"**
Yes, and the example above is it. Passing a collaborator into a constructor by hand is dependency injection. Spring and Guice automate wiring; they did not invent the technique.

**"Can you satisfy DIP without DI?"**
Yes, though less commonly. A factory or service locator can supply an abstraction without injecting it. DIP is about what you depend on, not how you obtain it.

**"Is Spring's `@Autowired` on a constructor still required?"**
Not since Spring 4.3 for a class with a single constructor. The container uses it automatically, which is partly why constructor injection became the default recommendation.

**"How do you handle a circular dependency?"**
Treat it as a design signal. Extract the shared behaviour into a third component, or break the cycle with an event. Setter injection or `@Lazy` can paper over it, but the cycle usually indicates muddled responsibilities.

**"When is setter injection appropriate?"**
When a dependency is genuinely optional, or must be reconfigurable at runtime. Those cases are rarer than their usage suggests.

**The common wrong answer** is treating the three terms as synonyms, or saying "DI means using Spring". Naming them as a principle, a technique and a pattern is what the question is testing.

---

### Say this in the interview

*"They are three different things. The Dependency Inversion Principle is a principle, the D in SOLID: high-level and low-level modules should both depend on abstractions, and the inversion refers to the dependency arrow pointing at an interface rather than from policy to detail. Dependency Injection is a technique for achieving it, where an object receives its collaborators from outside instead of constructing them. Inversion of Control is the broader pattern where a framework calls your code rather than the reverse, sometimes called the Hollywood Principle, and dependency injection is one form of it.*

*There are three types of injection. Constructor injection passes dependencies as parameters and is preferred, because the object can never exist in an invalid state, the fields can be final, and the dependencies are visible in the signature. Setter injection supplies them afterwards and suits genuinely optional dependencies. Field injection annotates the field and lets the container set it reflectively.*

*Field injection is considered an anti-pattern because it hides dependencies from the public API, prevents final fields and therefore immutability, makes testing awkward since a plain new leaves everything null, and masks design problems, as adding a tenth annotated field is painless where a tenth constructor parameter would prompt a rethink. It also couples the class to the container. A further benefit of constructor injection is that circular dependencies fail fast at construction rather than being masked."*
