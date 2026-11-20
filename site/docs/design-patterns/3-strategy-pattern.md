---
id: 3-strategy-pattern
title: "Strategy: Swapping Algorithms, and When a Function Will Do"
description: "It replaces a conditional with a lookup, and in Python a strategy is usually just a function; the class hierarchy is a workaround for languages without function values"

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Strategy pattern, why would you use it, and how does it uphold the Open/Closed and Dependency Inversion principles? Demonstrate a production payment gateway with runtime algorithm swapping in Python, and contrast Strategy with the State and Template Method patterns."

---

### Picture it

A sat-nav with a setting for "fastest", "shortest" and "avoid tolls".

**The route changes completely and the interface does not.** You still type a destination and press go. Something inside picks a different procedure, and nothing about how you use the device reflects that.

Now imagine building it the other way, with the three procedures inlined into one function behind a conditional. It works, and it accumulates three specific problems that are worth naming separately because they are often blurred into "it is ugly".

**The function grows without bound and you must read all of it to change any of it.** The avoid-tolls logic sits in the same body as the fastest-route logic, so a change to one is made in a file where the other lives.

**Adding a fourth option means editing code that already works.** Not extending it, editing it. Every release that adds a routing mode risks the modes that shipped last year, and the test suite that has to be re-run is the whole thing.

**The choice is frozen into the code rather than being data.** You cannot let a user configure a new mode, cannot pick one per request, cannot fall back from one to another when the first fails, because the alternatives are not things, they are branches.

That third point is the one worth leading with, because it says what the pattern actually does. **Strategy turns a branch into an object**, and once an algorithm is a thing rather than a branch, you can put it in a variable, store it in a dictionary, pass it as a parameter, choose it from a config file, and replace it at half past three on a Tuesday when the primary payment rail goes down. **The conditional became a lookup**, and lookups accept data where conditionals accept only code.

And then the part that matters in Python specifically. **The sat-nav does not need three classes; it needs three procedures.** A class whose only job is to hold one method is a function wearing a hat, and Python has had function values since the beginning. The Gang of Four wrote the class hierarchy because Java had no way to pass a procedure around, and reproducing it unexamined in Python is the single most common mistake with this pattern.

So the honest shape of the answer is: **Strategy is a good idea whose canonical implementation is a workaround for a language feature Python already has.** Keep the idea, drop the ceremony, and escalate back to classes only when a strategy needs state, configuration or a name.

---

### The proper terms

#### The parts

The **context** is the object that holds a strategy and delegates to it. It knows the interface and nothing about which implementation it has.

A **strategy** is one interchangeable algorithm. The **strategy interface** is the shared signature all of them satisfy, whether that is an abstract base class or merely a convention about what is callable with what.

The defining property: **the strategies do not know about each other and do not know about the context**. That is what makes them substitutable, and it is also what distinguishes Strategy from State.

#### The principles, precisely

The **Open/Closed Principle**: adding a strategy is a new class or function, with no edit to the context or to the existing strategies. The conditional version violates this because the chain must be edited.

**Dependency inversion**: the context depends on the strategy interface rather than on any concrete algorithm, and the concrete algorithms depend on the same interface. Both sides point at the abstraction, which is what "inversion" names: the high-level policy no longer depends on the low-level detail.

It is worth being exact about which problem each principle solves, because interviewers probe this. **Dependency inversion is about the direction of coupling; Open/Closed is about what you have to edit.** A conditional chain inside a context already achieves neither, and extracting the branches into objects achieves both at once.

#### The Python-specific point

A **callable** in Python is anything invocable: a function, a lambda, a bound method, a class with `__call__`, a `functools.partial`. Since functions are first-class values, a strategy can be a function, and the strategy interface becomes a type annotation such as `Callable[[Decimal], Receipt]`.

**`typing.Protocol`** gives you the middle ground: structural typing, so a strategy satisfies the interface by having the right method rather than by inheriting from anything. That keeps static checking without forcing an inheritance relationship, which is usually what you want in Python.

Escalate from a function to a class when the strategy needs construction parameters such as an API key or a timeout, **mutable state across calls** such as a retry counter or a cache, or **more than one method** such as pay and refund. Those are real reasons; "patterns say so" is not.

#### The three patterns that get confused

All three vary behaviour, and they are distinguished by who decides, and when.

| | What varies | Who chooses | When | Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Strategy** | a whole algorithm | the **client** | runtime, freely | composition |
| **State** | behaviour per state | the object itself | runtime, as a consequence of operations | composition |
| **Template Method** | one step of an algorithm | the subclass author | class-definition time | inheritance |

**Strategy and State are structurally almost identical** and differ in intent, which is a real answer rather than a dodge. In Strategy the client sets the strategy and the strategies are mutually ignorant. In State the object transitions itself, and the states know which state comes next, so they are coupled to each other by design. **If your strategies decide what replaces them, you have written a State machine.**

**Template Method** is the inheritance-based sibling: the algorithm's skeleton is fixed in a base class and subclasses fill in steps. The choice is made by instantiating a particular subclass, so it cannot change for a given object. Strategy can be swapped mid-life; Template Method cannot.

---

### In code

#### The version to move away from

```python
class NaiveCheckout:
    def process(self, method: str, amount: float):
        if method == "UPI":
            # VPA validation, NPCI routing, QR fallback
            ...
        elif method == "CARD":
            # PCI-DSS encryption, CVV check, 3D Secure challenge
            ...
        elif method == "CRYPTO":
            # gas estimation, wallet signature, confirmation polling
            ...
        else:
            raise ValueError(method)
```

Three separate faults, worth separating:

**One class now has three responsibilities** that change for unrelated reasons and are maintained by different people.

**Adding a rail edits working code**, so the blast radius of a new payment method is every existing payment method.

**The choice is code, not data.** No per-request selection, no config-driven ordering, no falling back to the next rail when one is down, because the alternatives are branches rather than values.

#### Strategy with a protocol

```python
from decimal import Decimal
from typing import Protocol, runtime_checkable


@runtime_checkable
class PaymentStrategy(Protocol):
    """Structural: satisfied by having the method, not by inheriting."""

    name: str

    def pay(self, amount: Decimal) -> str: ...


class UpiPayment:
    name = "upi"

    def __init__(self, vpa: str):
        self._vpa = vpa

    def pay(self, amount: Decimal) -> str:
        return f"{amount} via UPI to {self._vpa}"


class CardPayment:
    name = "card"

    def __init__(self, token: str, three_ds: bool = True):
        self._token = token
        self._three_ds = three_ds

    def pay(self, amount: Decimal) -> str:
        extra = " with 3DS" if self._three_ds else ""
        return f"{amount} via card {self._token[-4:]}{extra}"


class Checkout:
    """The context. Knows the interface, never the implementation."""

    def __init__(self, strategy: PaymentStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: PaymentStrategy) -> None:
        self._strategy = strategy          # swappable mid-life

    def charge(self, amount: Decimal) -> str:
        return self._strategy.pay(amount)
```

**`Checkout` contains no conditional and names no payment method.** Adding ApplePay is a new class in its own file, and nothing here changes. That is Open/Closed; and `Checkout` depending on `PaymentStrategy` rather than on `UpiPayment` is dependency inversion.

Note the choice of `Protocol` over an abstract base class. **A strategy satisfies the interface by having the right method**, so you can pass in a third-party object, a test double, or a class you cannot modify, without arranging an inheritance relationship. `ABC` would require every strategy to import and subclass yours.

#### What becomes possible once an algorithm is a value

This is the part the conditional version cannot do at all, and it is the strongest argument for the pattern.

```python
RAILS = {s.name: s for s in (UpiPayment("ada@bank"), CardPayment("4242424242424242"))}

# selected by data, from a config file or a request field
checkout = Checkout(RAILS[request.preferred_rail])

# swapped at runtime when a rail fails
def charge_with_fallback(amount, order):
    for name in order:                       # order is configuration
        checkout.set_strategy(RAILS[name])
        try:
            return checkout.charge(amount)
        except RailUnavailable:
            continue
    raise AllRailsDown(order)
```

**The fallback loop is the point.** It iterates over a list of algorithm names that came from configuration, and no equivalent exists in the conditional version, because you cannot iterate over branches.

#### The Pythonic form

```python
from decimal import Decimal
from typing import Callable

PaymentFn = Callable[[Decimal], str]


def upi(amount: Decimal) -> str:
    return f"{amount} via UPI"


def card(amount: Decimal) -> str:
    return f"{amount} via card"


class Checkout:
    def __init__(self, pay: PaymentFn):
        self._pay = pay

    def charge(self, amount: Decimal) -> str:
        return self._pay(amount)


Checkout(upi).charge(Decimal("100"))      # '100 via UPI'
Checkout(card).charge(Decimal("100"))     # '100 via card'
```

**No ABC, no Protocol, no subclasses, and the pattern is fully present**: the context delegates to an injected algorithm, both sides depend on `Callable[[Decimal], str]`, and adding a rail is a new function.

When a strategy needs configuration, `functools.partial` or a closure carries it without reintroducing a class:

```python
from functools import partial


def card_with(token: str, three_ds: bool, amount: Decimal) -> str:
    extra = " with 3DS" if three_ds else ""
    return f"{amount} via card {token[-4:]}{extra}"


visa = partial(card_with, "4242424242424242", True)
Checkout(visa).charge(Decimal("100"))
```

And the escalation point, stated plainly: **go back to a class when the strategy needs more than one method**, such as `pay` and `refund`, because at that point you are describing an object with behaviour rather than a procedure. That is the criterion, not a stylistic preference.

#### Strategy against State

Structurally the same, and the difference is visible in one line of code.

```python
# STRATEGY: the client sets it; strategies are mutually ignorant
checkout.set_strategy(CardPayment(token))


# STATE: the object transitions itself; states know their successors
class PendingOrder:
    def pay(self, order):
        order.state = PaidOrder()        # <-- the state names another state
        return "paid"


class PaidOrder:
    def pay(self, order):
        raise InvalidTransition("already paid")

    def ship(self, order):
        order.state = ShippedOrder()
        return "shipped"
```

**`PendingOrder` names `PaidOrder`.** That single fact is the distinction: the algorithms are coupled to each other because the transitions are part of the design, and the object replaces its own behaviour as a consequence of operations rather than at a client's request. A `UpiPayment` that assigned `CardPayment` to the context would be a State machine wearing Strategy's clothes.

#### Strategy against Template Method

```python
from abc import ABC, abstractmethod


class Report(ABC):
    """TEMPLATE METHOD: the skeleton is fixed, one step is abstract."""

    def generate(self, rows):            # the template
        return self.header() + self.body(rows) + "\n-- end"

    def header(self):
        return "REPORT\n"

    @abstractmethod
    def body(self, rows): ...


class CsvReport(Report):
    def body(self, rows):
        return "\n".join(",".join(map(str, r)) for r in rows)
```

**The difference is when the choice is made and whether it can change.** A `CsvReport` is a CSV report for its whole life; you choose by instantiating that subclass. A `Checkout` can change rails between two calls. Template Method uses inheritance so the binding is at class-definition time; Strategy uses composition so the binding is per object and mutable.

The practical consequence: **Template Method when the variation is known at design time and the skeleton genuinely must be shared; Strategy when the variation is selected at runtime or comes from data.** And in Python, Template Method's single abstract step is often better expressed as a function parameter with a default, which is Strategy again.

#### Verify it

```python
"""
Strategy: the context holds no conditional, a function is a strategy,
runtime swapping and fallback, and the line that separates Strategy
from State and from Template Method.
"""
from abc import ABC, abstractmethod
from functools import partial
from typing import Callable, Protocol, runtime_checkable


# ------------------------------------------------------------- class form
@runtime_checkable
class PaymentStrategy(Protocol):
    name: str

    def pay(self, amount: float) -> str: ...


class UpiPayment:
    name = "upi"

    def __init__(self, vpa):
        self._vpa = vpa

    def pay(self, amount):
        return f"{amount} via UPI to {self._vpa}"


class CardPayment:
    name = "card"

    def __init__(self, token, three_ds=True):
        self._token, self._three_ds = token, three_ds

    def pay(self, amount):
        return (f"{amount} via card {self._token[-4:]}"
                + (" with 3DS" if self._three_ds else ""))


class FlakyRail:
    name = "flaky"

    def pay(self, amount):
        raise RuntimeError("rail unavailable")


class Checkout:
    def __init__(self, strategy):
        self._strategy = strategy

    def set_strategy(self, strategy):
        self._strategy = strategy

    def charge(self, amount):
        return self._strategy.pay(amount)


# -------------------------------------------------------- functional form
PaymentFn = Callable[[float], str]


def upi_fn(amount):
    return f"{amount} via UPI"


def card_with(token, three_ds, amount):
    return (f"{amount} via card {token[-4:]}"
            + (" with 3DS" if three_ds else ""))


class FnCheckout:
    def __init__(self, pay: PaymentFn):
        self._pay = pay

    def charge(self, amount):
        return self._pay(amount)


# --------------------------------------------------------------- vs State
class PendingOrder:
    def pay(self, order):
        order.state = PaidOrder()          # a state names another state
        return "paid"

    def ship(self, order):
        raise RuntimeError("cannot ship an unpaid order")


class PaidOrder:
    def pay(self, order):
        raise RuntimeError("already paid")

    def ship(self, order):
        order.state = ShippedOrder()
        return "shipped"


class ShippedOrder:
    def pay(self, order):
        raise RuntimeError("already paid")

    def ship(self, order):
        raise RuntimeError("already shipped")


class Order:
    def __init__(self):
        self.state = PendingOrder()

    def pay(self):
        return self.state.pay(self)

    def ship(self):
        return self.state.ship(self)


# ----------------------------------------------------- vs Template Method
class Report(ABC):
    def generate(self, rows):
        return self.header() + self.body(rows) + " [end]"

    def header(self):
        return "REPORT: "

    @abstractmethod
    def body(self, rows): ...


class CsvReport(Report):
    def body(self, rows):
        return ";".join(",".join(map(str, r)) for r in rows)


if __name__ == "__main__":
    print("-- the context holds no conditional and names no rail")
    import inspect
    src = inspect.getsource(Checkout)
    print(f"   'if' in Checkout's source? {'if ' in src}")
    print(f"   'Upi' or 'Card' named in Checkout? "
          f"{'Upi' in src or 'Card' in src}")

    print("\n-- swapping at runtime")
    ck = Checkout(UpiPayment("ada@bank"))
    print(f"   {ck.charge(100)}")
    ck.set_strategy(CardPayment("4242424242424242"))
    print(f"   {ck.charge(100)}")

    print("\n-- Protocol is structural: no inheritance needed")
    for s in (UpiPayment("x"), CardPayment("1234"), FlakyRail()):
        print(f"   {type(s).__name__:<12} isinstance of PaymentStrategy: "
              f"{isinstance(s, PaymentStrategy)}, "
              f"bases: {[b.__name__ for b in type(s).__bases__]}")

    print("\n-- what a conditional cannot do: iterate over the alternatives")
    RAILS = {s.name: s for s in (FlakyRail(), UpiPayment("ada@bank"),
                                 CardPayment("4242424242424242"))}
    order = ["flaky", "upi", "card"]        # from configuration

    def charge_with_fallback(amount, order):
        tried = []
        for name in order:
            ck.set_strategy(RAILS[name])
            try:
                return ck.charge(amount), tried
            except RuntimeError:
                tried.append(name)
        raise RuntimeError(f"all rails down: {order}")

    result, tried = charge_with_fallback(100, order)
    print(f"   tried and failed: {tried}")
    print(f"   succeeded with  : {result}")
    print("   the loop iterates over algorithm NAMES from config; there is")
    print("   no equivalent for branches")

    print("\n-- a function is a strategy, no ABC required")
    print(f"   FnCheckout(upi_fn).charge(100) -> "
          f"{FnCheckout(upi_fn).charge(100)!r}")
    visa = partial(card_with, "4242424242424242", True)
    print(f"   partial carries configuration  -> "
          f"{FnCheckout(visa).charge(100)!r}")
    print(f"   callable(upi_fn) = {callable(upi_fn)}, "
          f"callable(visa) = {callable(visa)}")
    print("   escalate back to a class when the strategy needs MORE THAN ONE")
    print("   method, e.g. pay and refund: that is an object, not a procedure")

    print("\n-- Strategy against State: who decides the replacement")
    o = Order()
    print(f"   initial state      : {type(o.state).__name__}")
    print(f"   o.pay()            : {o.pay()!r} -> "
          f"{type(o.state).__name__}")
    print(f"   o.ship()           : {o.ship()!r} -> "
          f"{type(o.state).__name__}")
    try:
        o.pay()
    except RuntimeError as e:
        print(f"   o.pay() again      : rejected, {e}")
    pending_src = inspect.getsource(PendingOrder)
    print(f"   does PendingOrder name another state? "
          f"{'PaidOrder' in pending_src}  <- THE distinction")
    upi_src = inspect.getsource(UpiPayment)
    print(f"   does UpiPayment name another strategy? "
          f"{'CardPayment' in upi_src}")
    print("   in Strategy the client sets it and strategies are mutually")
    print("   ignorant; in State the object transitions itself and the")
    print("   states are coupled to each other on purpose")

    print("\n-- Strategy against Template Method: when the choice is bound")
    r = CsvReport()
    print(f"   CsvReport().generate([[1,2],[3,4]]) -> "
          f"{r.generate([[1, 2], [3, 4]])!r}")
    print(f"   can a CsvReport become a PdfReport later? No: the choice was")
    print(f"   made by instantiating the subclass")
    print(f"   can a Checkout change rails between calls? Yes, shown above")
    print(f"   Template Method binds by inheritance at class-definition")
    print(f"   time; Strategy binds by composition, per object, mutably")
```

---

### What they ask next

**"What problem does it actually solve?"**
It turns a branch into an object. Once an algorithm is a value you can put it in a dictionary, pass it as a parameter, read the choice from configuration, and replace it at runtime. **The conditional became a lookup, and lookups accept data where conditionals accept only code.** The fallback loop in the example is the sharpest demonstration: it iterates over a list of rail names that came from config, and there is no way to iterate over branches.

**"How does it satisfy Open/Closed and dependency inversion?"**
**Open/Closed**: adding a strategy is a new class or function with no edit to the context or to the existing strategies. **Dependency inversion**: the context depends on the strategy interface rather than on any concrete algorithm, and the concrete algorithms depend on the same interface, so both sides point at the abstraction. Worth being precise that these are different complaints: **dependency inversion is about the direction of coupling, Open/Closed is about what you have to edit**, and the conditional version fails both.

**"Why `Protocol` rather than an abstract base class?"**
Because `Protocol` is **structural**: a strategy satisfies the interface by having the right method, not by inheriting from yours. That lets you pass in a third-party object, a test double, or a class you cannot modify, with no inheritance arranged. An `ABC` would require every strategy to import and subclass your base, which couples them to you for no benefit. You keep static checking either way.

**"When should a strategy be a function rather than a class?"**
Almost always, in Python. A class whose only job is to hold one method is a function with extra ceremony, and **the GoF class hierarchy exists because Java cannot pass a procedure around.** Escalate to a class when the strategy needs construction parameters, mutable state across calls, or **more than one method**, such as `pay` and `refund`. That last one is the real criterion: at that point you are describing an object with behaviour, not a procedure. For parameters alone, `functools.partial` or a closure is enough.

**"How is Strategy different from State?"**
Structurally they are nearly identical, and the difference is in who decides the replacement. In **Strategy the client sets it**, and the strategies do not know about each other. In **State the object transitions itself**, and the states name their successors, so they are coupled by design. The one-line test: **does one algorithm name another?** `PendingOrder` assigning `PaidOrder()` is a State machine; a `UpiPayment` that assigned `CardPayment` to the context would be a State machine misfiled as Strategy.

**"And from Template Method?"**
Template Method fixes an algorithm's skeleton in a base class and lets subclasses fill in steps, so **the choice is bound at class-definition time by inheritance** and cannot change for a given object. Strategy composes, so the choice is per object and mutable. A `CsvReport` is a CSV report for life; a `Checkout` can change rails between two calls. In Python, Template Method's single abstract step is often better written as a function parameter with a default, which is Strategy again.

**"Does Strategy ever make things worse?"**
Yes, in two ways. With two algorithms that will never change, the indirection costs a reader one hop to find out what actually runs, and the conditional was clearer. And the pattern **multiplies objects**: every algorithm is now a class or function to find, name and test, and if they share substantial logic you end up either duplicating it or introducing a base class, which quietly reintroduces the coupling you removed.

**"How does the client choose a strategy without a conditional of its own?"**
Usually it does not need to, because the choice arrives as data: a registry keyed by name, with the key coming from a config file or a request field. If a conditional is genuinely unavoidable it belongs in one place, at the edge of the system where configuration is read, rather than in the context. **Pushing the single remaining branch to the boundary is the realistic goal**, not eliminating branching from the universe.

**"What about shared logic between strategies?"**
This is the practical wrinkle. If two strategies share a validation step, options are a module-level helper function, which is usually right; a mixin or base class, which reintroduces inheritance; or a decorator wrapping each strategy, which composes better. **Prefer the plain function**, because the strategies' independence from each other is the property you were buying.

**The common wrong answer** is reproducing the Java class hierarchy in Python without noticing that a function is already a strategy, which is the thing a Python interviewer is listening for. Next is explaining the motivation as "conditionals are bad", when the real gain is that algorithms become values selectable by data. Third is saying Strategy and State differ structurally, when they are nearly identical and differ in who controls the transition and whether the algorithms know each other. And last is claiming it always improves the design, when for two fixed alternatives it adds indirection and buys nothing.

---

### Say this in the interview

*"Strategy pulls each algorithm out into its own interchangeable object, and the context holds one and delegates to it. The way I would motivate it is that it turns a branch into an object. Once an algorithm is a value, you can put it in a dictionary, pass it as a parameter, read the choice from a config file and swap it at runtime, where a conditional only accepts code. The conditional became a lookup.*

*The sharpest demonstration is a fallback loop. In a payment gateway I can write a loop over a list of rail names that came from configuration, set the strategy to each in turn, and fall through to the next when one is unavailable. There is simply no equivalent of that in the conditional version, because you cannot iterate over branches.*

*On the principles, I would be exact about which complaint each one is. The Open/Closed Principle is about what you have to edit: adding a payment rail is a new class or function with no change to the context or to the existing rails, whereas the if-elif version means editing working code, so the blast radius of a new rail is every existing rail. Dependency inversion is about the direction of coupling: the context depends on the strategy interface rather than on UpiPayment, and the concrete rails depend on the same interface, so both sides point at the abstraction. The conditional version fails both, and extracting the branches fixes both at once.*

*For the interface I would use typing.Protocol rather than an abstract base class, because Protocol is structural: a strategy satisfies it by having a pay method, not by inheriting from mine. That means I can pass in a third-party object, a test double, or a class I cannot modify, without arranging an inheritance relationship, and I still get static checking. An ABC would force every rail to import and subclass my base for no benefit.*

*Now the thing I would most want to say in a Python interview. A class whose only job is to hold one method is a function wearing a hat. Python has had function values since the beginning, so a strategy can just be a function, and the strategy interface becomes a type annotation like Callable of Decimal to str. The Gang of Four wrote the class hierarchy because Java has no way to pass a procedure around, and reproducing it unexamined in Python is the commonest mistake with this pattern. If a strategy needs configuration, functools.partial or a closure carries it without bringing a class back. The criterion for escalating to a class is concrete: when the strategy needs more than one method, say pay and refund, or mutable state across calls. At that point you are describing an object with behaviour rather than a procedure.*

*For Strategy against State, they are structurally almost identical, and I think the honest answer is that they differ in who decides the replacement and whether the algorithms know each other. In Strategy the client sets the strategy and the strategies are mutually ignorant. In State the object transitions itself as a consequence of operations, and the states name their successors, so they are coupled to each other on purpose. The one-line test is whether one algorithm names another: if PendingOrder assigns PaidOrder, that is a State machine, and a UpiPayment that assigned CardPayment to the context would be a State machine misfiled as Strategy.*

*Template Method is the inheritance-based sibling. The skeleton of the algorithm is fixed in a base class and subclasses fill in individual steps, so the choice is bound at class-definition time and cannot change for a given object: a CsvReport is a CSV report for its whole life. Strategy composes instead, so the binding is per object and mutable, and a Checkout can change rails between two calls. Template Method when the variation is known at design time and the skeleton genuinely must be shared; Strategy when the variation is selected at runtime or comes from data. And in Python a Template Method with one abstract step is usually better written as a function parameter with a default, which is Strategy again.*

*Two honest caveats. With two algorithms that will never change, the indirection costs a reader a hop to find out what actually runs, and the conditional was clearer. And the pattern multiplies objects: every algorithm becomes something to name, find and test, and if they share substantial logic you either duplicate it or add a base class, which quietly reintroduces the coupling you removed. I would reach for a module-level helper function in that case, because the strategies' independence from each other is the property I was buying."*
