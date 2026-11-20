---
id: 5-decorator-pattern-ocp
title: "Decorator: Wrapping Instead of Subclassing"
description: "Features combine, so subclasses grow as 2^n while wrappers grow as n; and Python's @ syntax is a different mechanism that happens to share the name"

sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Decorator pattern, how does it uphold the Open/Closed Principle (OCP) without subclass explosion, and how does it differ from Python's `@decorator` syntax? Show both the classic beverage example and an enterprise database repository decorator with transparent delegation."

---

### Picture it

A coffee shop menu, and the moment you realise you cannot write it down.

Start with coffee. Add milk, and you have two items. Add sugar, and you have four: plain, milk, sugar, milk and sugar. Add syrup, and you have eight. **The menu is not growing by one row per option; it is doubling.** Ten options and you are printing a thousand and twenty-three drinks, which is a menu nobody can read and nobody can maintain.

And then someone asks for a double-milk latte, and you discover something worse than the size: **the menu cannot express it at all.** You listed "coffee with milk" as a single item, so there is no row for having milk twice. The combinations were enumerated in advance, and anything not enumerated does not exist.

The fault is a mismatch between the structure of the problem and the structure of the solution. **The options combine freely, so any approach that names each combination has to name a number of things that grows exponentially.** A subclass per combination is exactly that approach.

**Now describe the same menu the other way.** One coffee, and a set of things each of which takes a drink and gives you back a drink. Milk is not a kind of coffee; it is a function from drink to drink. Sugar is another. **Ten options is ten things, not a thousand**, because you have stopped describing the results and started describing the operations, and the operations compose.

Double milk is now obviously expressible: apply milk twice. It needed no planning, because you never enumerated the outcomes.

Two further consequences fall out of this, and they are the reason the pattern matters beyond arithmetic.

**The order can matter and is now visible.** Milk-then-sugar and sugar-then-milk are different expressions, and you can see which you wrote. In the subclass world, `MilkSugarCoffee` has baked in an order that nobody chose deliberately.

**The combination is chosen at the till, not at the printers.** Subclasses are fixed when the code is written. Wrappers are applied to an object at runtime, so you can read the customer's order out of a request, a config file or a database row and assemble the drink accordingly.

And then the Python-specific trap, which the question is pointing at. **Python has a feature called a decorator, written with an `@`, and it is a different thing that shares the name.** The `@` syntax wraps a function or class once, at definition time, for every caller forever. The pattern wraps an object, at runtime, per instance, composably. Same word, genuinely different mechanism, and the distinction is the most common thing to get wrong here.

---

### The proper terms

#### The pattern

The **Decorator** pattern attaches responsibilities to an individual object by wrapping it in another object with the same interface.

The **component** is the interface. The concrete component is the plain thing being wrapped, the coffee. A **decorator** holds a reference to a component and implements the same interface, delegating to the wrapped object and adding behaviour around that call. Because a decorator is itself a component, decorators wrap decorators, which is what makes them compose.

**Transparent delegation** is the property that a client cannot tell a wrapped object from an unwrapped one: the type is the same interface, so no call site needs to change. In Python this is where `__getattr__` earns its keep, forwarding anything the decorator does not explicitly override so that a wrapper does not have to re-declare the entire interface.

#### The arithmetic being avoided

**Subclass explosion** is the combinatorial growth of classes when features combine. With `n` independent optional features, enumerating every combination needs `2^n - 1` subclasses; wrapping needs `n` decorators.

| Features | Subclasses | Decorators |
| :---: | :---: | :---: |
| 3 | 7 | 3 |
| 5 | 31 | 5 |
| 10 | 1,023 | 10 |

The **Open/Closed Principle** is satisfied in the precise sense that a new feature is a new class, with no edit to the component, to the existing decorators, or to any call site.

Two properties subclassing cannot provide at all, which matter more than the count:

**Repetition.** Applying the same decorator twice is meaningful and trivial; there is no `DoubleMilkCoffee` unless someone wrote one.

**Runtime composition.** The stack is built when the object is created, so it can be assembled from configuration or from a request, where a subclass choice is fixed in the source.

#### Where it sits among its neighbours

All four of these wrap one object in another, and they are told apart by **intent**, which is a real answer rather than an evasion.

| Pattern | Interface of the wrapper | Purpose |
| :--- | :--- | :--- |
| **Decorator** | **same** as the wrapped object | add behaviour, stay substitutable |
| **Adapter** | **different** | make an incompatible interface usable |
| **Proxy** | same | control *access*: lazy loading, permissions, remoting |
| Facade | new and simpler | hide a complicated subsystem |

Decorator and Proxy are the closest pair. A Decorator **adds** to what the object does; a Proxy **governs whether and when** the call happens at all. A caching wrapper sits exactly on that line, which is why it gets called both.

#### Python's `@` syntax, which is not this pattern

A function decorator is syntax: `@logged` above `def f` is exactly `f = logged(f)`. It is applied **once, at definition time**, and every caller of `f` thereafter gets the wrapped version. **There is no per-instance choice and nothing to compose at runtime.**

The two mechanisms overlap in spirit, since both are "wrap a thing in a thing", and they differ in what is wrapped and when:

| | Python `@` syntax | GoF Decorator |
| :--- | :--- | :--- |
| Wraps | a function or class | an **object** |
| When | definition time, once | **runtime**, per instance |
| Scope | all callers | that one object |
| Composed by | stacking `@` lines in source | nesting constructor calls in data |

**`functools.wraps`** exists for the syntax form: without it, the wrapper replaces the wrapped function's `__name__`, `__doc__` and signature, which breaks introspection, documentation tools and debuggers.

---

### In code

#### The explosion, stated concretely

```python
# the approach that does not scale
class Coffee: ...
class CoffeeWithMilk(Coffee): ...
class CoffeeWithSugar(Coffee): ...
class CoffeeWithMilkAndSugar(Coffee): ...
class CoffeeWithSyrup(Coffee): ...
class CoffeeWithMilkAndSyrup(Coffee): ...
class CoffeeWithSugarAndSyrup(Coffee): ...
class CoffeeWithMilkAndSugarAndSyrup(Coffee): ...
# three options, seven classes. ten options, 1023 classes.
# and no class for double milk, because nobody enumerated it.
```

#### The pattern

```python
from typing import Protocol


class Beverage(Protocol):
    def cost(self) -> float: ...
    def describe(self) -> str: ...


class Coffee:
    def cost(self) -> float:
        return 2.00

    def describe(self) -> str:
        return "coffee"


class Condiment:
    """Base decorator: holds a component and forwards everything by default."""

    def __init__(self, drink: Beverage):
        self._drink = drink

    def __getattr__(self, name):
        # transparent delegation: anything not overridden reaches the inner
        # object, so a decorator need not re-declare the whole interface
        return getattr(self._drink, name)


class Milk(Condiment):
    def cost(self) -> float:
        return self._drink.cost() + 0.50

    def describe(self) -> str:
        return f"{self._drink.describe()} + milk"


class Sugar(Condiment):
    def cost(self) -> float:
        return self._drink.cost() + 0.20

    def describe(self) -> str:
        return f"{self._drink.describe()} + sugar"


drink = Sugar(Milk(Milk(Coffee())))
drink.describe()      # 'coffee + milk + milk + sugar'
drink.cost()          # 3.20
```

**Note the double milk.** `Milk(Milk(Coffee()))` needed no planning and no new class, and there is no subclass arrangement that expresses it without someone having anticipated it.

Note also `__getattr__`. A real `Beverage` might have `calories`, `temperature` and `allergens`; the decorators override only what they change and everything else forwards automatically. Without it, every decorator would have to re-declare the entire interface, and adding a method to the component would break every wrapper.

One caveat worth knowing, since it is a genuine sharp edge: **`__getattr__` is only consulted when normal attribute lookup fails**, so it forwards instance attributes but not dunder methods looked up on the type. `len(wrapped)` will not reach an inner `__len__`, and `isinstance(wrapped, Coffee)` is false. If you need those, implement them explicitly or use `__class_getitem__`-style delegation; this is why transparent delegation in Python is *nearly* transparent rather than completely so.

#### Composing from data, which subclassing cannot do

```python
CONDIMENTS = {"milk": Milk, "sugar": Sugar}


def build_drink(order: list[str]) -> Beverage:
    """order might be ['milk', 'milk', 'sugar'] read from a request."""
    drink: Beverage = Coffee()
    for item in order:
        drink = CONDIMENTS[item](drink)
    return drink


build_drink(["milk", "milk", "sugar"]).cost()     # 3.20
```

**The loop is the argument for the pattern.** It builds a drink from a list of strings that arrived at runtime, and there is no equivalent with subclasses because you cannot iterate over class names you did not enumerate.

#### The version you would actually ship

Beverages make the arithmetic clear; this is where the pattern earns money. The interface is a repository, and each concern is a wrapper.

```python
import time
from typing import Protocol, Optional


class UserRepository(Protocol):
    def get(self, user_id: int) -> Optional[dict]: ...
    def save(self, user: dict) -> None: ...


class PostgresUserRepository:
    """The only class that knows about the database."""

    def get(self, user_id):
        return {"id": user_id, "name": "Ada"}       # pretend query

    def save(self, user):
        ...


class CachingRepository:
    """Adds caching. Knows nothing about Postgres."""

    def __init__(self, inner: UserRepository, ttl: float = 30.0):
        self._inner, self._ttl = inner, ttl
        self._cache: dict[int, tuple[float, dict]] = {}
        self.hits = self.misses = 0

    def get(self, user_id):
        entry = self._cache.get(user_id)
        if entry and time.monotonic() - entry[0] < self._ttl:
            self.hits += 1
            return entry[1]
        self.misses += 1
        value = self._inner.get(user_id)
        self._cache[user_id] = (time.monotonic(), value)
        return value

    def save(self, user):
        self._inner.save(user)
        self._cache.pop(user["id"], None)           # invalidate on write

    def __getattr__(self, name):
        return getattr(self._inner, name)


class LoggingRepository:
    def __init__(self, inner: UserRepository):
        self._inner = inner
        self.calls: list[str] = []

    def get(self, user_id):
        self.calls.append(f"get({user_id})")
        return self._inner.get(user_id)

    def save(self, user):
        self.calls.append(f"save({user['id']})")
        self._inner.save(user)

    def __getattr__(self, name):
        return getattr(self._inner, name)


# wired once, at the edge of the application
repo: UserRepository = LoggingRepository(
    CachingRepository(PostgresUserRepository(), ttl=30.0)
)
```

**Three concerns, three classes, each independently testable**, and the business code that receives `repo` cannot tell the difference and has no reason to.

The wiring order is a design decision made visible, which is the point worth making. `Logging(Caching(Postgres()))` logs **every** call including cache hits, which is what you want for request auditing. `Caching(Logging(Postgres()))` logs only the calls that reach the database, which is what you want for query profiling. **Both are one line and the line says which you chose**, where a `CachingLoggingPostgresRepository` would have buried the decision.

#### Python's `@` syntax, side by side

```python
import functools


def logged(fn):
    @functools.wraps(fn)          # keep __name__, __doc__, signature
    def wrapper(*args, **kwargs):
        print(f"calling {fn.__name__}")
        return fn(*args, **kwargs)
    return wrapper


@logged
def charge(amount):
    """Charge the customer."""
    return amount


charge(100)            # prints 'calling charge', returns 100
charge.__name__        # 'charge', thanks to functools.wraps
```

`@logged` is exactly `charge = logged(charge)`. **It happened once, at import, and every caller of `charge` is affected.** You cannot have a logged `charge` for one request and an unlogged one for another, because there is only one `charge`.

That is the whole distinction:

```python
# syntax: one wrapped function, all callers, decided at definition time
@logged
def charge(amount): ...

# pattern: this object is wrapped, that one is not, decided at runtime
audited_repo = LoggingRepository(repo)       # for admin requests
plain_repo = repo                            # for everything else
```

Without `functools.wraps` the wrapper's `__name__` becomes `'wrapper'`, which breaks tracebacks, `help()`, documentation generators and anything doing introspection. It is a one-line habit with a disproportionate payoff.

#### Verify it

```python
"""
Decorator: the combinatorial argument, repetition and runtime composition,
transparent delegation with __getattr__ and its limits, and the difference
from Python's @ syntax.
"""
import functools
import time
from typing import Optional, Protocol


class Coffee:
    def cost(self):
        return 2.00

    def describe(self):
        return "coffee"

    def calories(self):            # never overridden; must still forward
        return 5


class Condiment:
    def __init__(self, drink):
        self._drink = drink

    def __getattr__(self, name):
        return getattr(self._drink, name)


class Milk(Condiment):
    def cost(self):
        return self._drink.cost() + 0.50

    def describe(self):
        return self._drink.describe() + " + milk"


class Sugar(Condiment):
    def cost(self):
        return self._drink.cost() + 0.20

    def describe(self):
        return self._drink.describe() + " + sugar"


# ----------------------------------------------------------- repositories
class PostgresUserRepository:
    def __init__(self):
        self.queries = 0

    def get(self, user_id):
        self.queries += 1
        return {"id": user_id, "name": "Ada"}

    def save(self, user):
        self.queries += 1


class CachingRepository:
    def __init__(self, inner, ttl=30.0):
        self._inner, self._ttl = inner, ttl
        self._cache = {}
        self.hits = self.misses = 0

    def get(self, user_id):
        entry = self._cache.get(user_id)
        if entry and time.monotonic() - entry[0] < self._ttl:
            self.hits += 1
            return entry[1]
        self.misses += 1
        value = self._inner.get(user_id)
        self._cache[user_id] = (time.monotonic(), value)
        return value

    def save(self, user):
        self._inner.save(user)
        self._cache.pop(user["id"], None)

    def __getattr__(self, name):
        return getattr(self._inner, name)


class LoggingRepository:
    def __init__(self, inner):
        self._inner = inner
        self.calls = []

    def get(self, user_id):
        self.calls.append(f"get({user_id})")
        return self._inner.get(user_id)

    def save(self, user):
        self.calls.append(f"save({user['id']})")
        self._inner.save(user)

    def __getattr__(self, name):
        return getattr(self._inner, name)


def logged(fn):
    @functools.wraps(fn)
    def wrapper(*a, **k):
        wrapper.count += 1
        return fn(*a, **k)
    wrapper.count = 0
    return wrapper


def unwrapped_logged(fn):
    def wrapper(*a, **k):          # no functools.wraps
        return fn(*a, **k)
    return wrapper


@logged
def charge(amount):
    """Charge the customer."""
    return amount


@unwrapped_logged
def refund(amount):
    """Refund the customer."""
    return amount


if __name__ == "__main__":
    print("-- the arithmetic: features combine, so subclasses double")
    print(f"   {'features':>9}{'subclasses (2^n - 1)':>24}{'decorators (n)':>17}")
    for n in (1, 2, 3, 5, 10):
        print(f"   {n:>9}{2**n - 1:>24}{n:>17}")

    print("\n-- wrapping, including the case subclassing cannot express")
    drink = Sugar(Milk(Milk(Coffee())))
    print(f"   Sugar(Milk(Milk(Coffee()))) -> {drink.describe()!r}")
    print(f"   cost = {drink.cost():.2f}")
    assert abs(drink.cost() - 3.20) < 1e-9
    print("   DOUBLE milk needed no new class and no planning; there is no")
    print("   subclass for it unless somebody enumerated it in advance")

    print("\n-- order is visible, and it matters")
    for stack, label in ((Sugar(Milk(Coffee())), "Sugar(Milk(Coffee()))"),
                         (Milk(Sugar(Coffee())), "Milk(Sugar(Coffee()))")):
        print(f"   {label:<24} -> {stack.describe()!r}")
    print("   MilkSugarCoffee would have baked in an order nobody chose")

    print("\n-- transparent delegation via __getattr__")
    print(f"   drink.calories() = {drink.calories()}  "
          f"<- never overridden, forwarded through 3 wrappers")
    print("   so a decorator overrides only what it changes; adding a")
    print("   method to the component does not break every wrapper")

    print("\n-- and its limits, which are worth knowing")
    print(f"   isinstance(drink, Coffee) = {isinstance(drink, Coffee)}  "
          f"<- wrappers are not subclasses")
    print("   __getattr__ runs only when normal lookup FAILS, and dunder")
    print("   methods are looked up on the type, so len(wrapped) would not")
    print("   reach an inner __len__. Transparent delegation is NEARLY")
    print("   transparent, not completely.")

    print("\n-- composing from data, which subclassing cannot do")
    CONDIMENTS = {"milk": Milk, "sugar": Sugar}

    def build_drink(order):
        d = Coffee()
        for item in order:
            d = CONDIMENTS[item](d)
        return d

    order = ["milk", "milk", "sugar"]          # from a request
    built = build_drink(order)
    print(f"   build_drink({order}) -> {built.describe()!r} "
          f"= {built.cost():.2f}")
    print("   you cannot iterate over class names you never enumerated")

    print("\n-- the shippable version: one concern per wrapper")
    db = PostgresUserRepository()
    repo = LoggingRepository(CachingRepository(db, ttl=30.0))
    for _ in range(3):
        repo.get(1)
    repo.save({"id": 1})
    repo.get(1)
    cache = repo._inner
    print(f"   3 reads, 1 write, 1 read after the write")
    print(f"   logged calls   : {repo.calls}")
    print(f"   cache hits     : {cache.hits}, misses: {cache.misses}")
    print(f"   db queries     : {db.queries}  "
          f"<- the write invalidated the entry")
    print("   business code holding `repo` cannot tell the difference")

    print("\n-- wiring order is a decision the code now states")
    print("   Logging(Caching(db)) logs EVERY call, including cache hits")
    print("     -> what you want for request auditing")
    print("   Caching(Logging(db)) logs only calls reaching the database")
    print("     -> what you want for query profiling")
    print("   both are one line; a CachingLoggingPostgresRepository would")
    print("   have buried the choice")

    print("\n-- Python's @ syntax is a different mechanism")
    charge(10)
    charge(20)
    print(f"   charge(10); charge(20) -> wrapper count {charge.count}")
    print(f"   @logged is exactly: charge = logged(charge)")
    print(f"   applied ONCE at definition time, affecting ALL callers;")
    print(f"   there is only one `charge`, so you cannot have a logged one")
    print(f"   for this request and a plain one for that request")
    print(f"   the pattern instead wraps an OBJECT: LoggingRepository(repo)")
    print(f"   for admin requests, plain repo for the rest")

    print("\n-- functools.wraps, and what breaks without it")
    print(f"   with wraps    : charge.__name__ = {charge.__name__!r}, "
          f"doc = {charge.__doc__!r}")
    print(f"   without wraps : refund.__name__ = {refund.__name__!r}, "
          f"doc = {refund.__doc__!r}")
    assert charge.__name__ == "charge" and refund.__name__ == "wrapper"
    print("   losing __name__ and __doc__ breaks tracebacks, help(),")
    print("   documentation tools and anything doing introspection")
```

---

### What they ask next

**"Why not just subclass?"**
Because features **combine**, so naming every combination means naming a number of classes that grows exponentially: `2^n - 1` for `n` independent options, which is 1,023 at ten options against 10 decorators. The count is the headline, and two other properties matter more. **Repetition**: `Milk(Milk(coffee))` needs no new class, where no subclass expresses double milk unless someone anticipated it. And **runtime composition**: the stack is built when the object is created, so it can come from a request or a config file.

**"How does it uphold the Open/Closed Principle?"**
A new feature is a new class that wraps, with **no edit to the component, to the existing decorators, or to any call site.** The reason call sites are unaffected is that a decorator implements the same interface, so a wrapped object is substitutable for an unwrapped one, which is also Liskov substitution doing useful work.

**"What is transparent delegation and how do you get it in Python?"**
It is the property that a client cannot distinguish a wrapped object from an unwrapped one. In Python, **`__getattr__` on the decorator forwards anything it does not override**, so a wrapper declares only the methods it changes. Without it, every decorator would have to re-declare the whole interface, and adding a method to the component would break every wrapper.

**"What are the limits of `__getattr__` delegation?"**
Two worth knowing. **`__getattr__` runs only when normal attribute lookup fails**, and **dunder methods are looked up on the type, not the instance**, so `len(wrapped)` will not reach an inner `__len__` and nor will `wrapped[0]` or `with wrapped:`. And `isinstance(wrapped, Coffee)` is false, because a decorator is not a subclass. So delegation in Python is *nearly* transparent, and protocol methods have to be forwarded explicitly if you need them.

**"How is this different from Python's `@decorator` syntax?"**
Different mechanism, same word. `@logged` above `def f` is exactly `f = logged(f)`: it wraps a **function**, **once, at definition time**, and every caller afterwards gets the wrapped version. The pattern wraps an **object**, **at runtime, per instance**, composably. The practical consequence is that there is only one `charge` function, so you cannot have a logged one for this request and a plain one for that request, whereas you can hold a `LoggingRepository(repo)` for admin requests and the bare `repo` for everything else.

**"Why does `functools.wraps` matter?"**
Because without it the wrapper's own `__name__`, `__doc__`, `__module__` and signature replace the wrapped function's. That breaks tracebacks, `help()`, documentation generators, and any framework that inspects signatures, which includes most dependency-injection and serialisation libraries. One line, disproportionate payoff.

**"How does Decorator differ from Proxy and Adapter?"**
All three wrap, and the difference is intent plus interface. **Adapter changes the interface** to make an incompatible object usable. **Decorator keeps the interface and adds behaviour.** **Proxy keeps the interface and controls access**: lazy instantiation, permission checks, remote calls. Decorator adds to what the object does; Proxy governs whether and when the call happens at all. A caching wrapper sits on that boundary, which is why it is legitimately called either.

**"Does the wiring order matter?"**
Yes, and making it visible is part of the value. `Logging(Caching(db))` logs every call including cache hits, which suits request auditing; `Caching(Logging(db))` logs only calls that reach the database, which suits query profiling. **Both are one line and the line states which you chose**, where a single `CachingLoggingRepository` would have buried the decision in its method bodies.

**"What are the costs?"**
Three. **Many small objects**, so a stack trace through five wrappers is harder to read and a debugger shows you layers rather than logic. **Identity breaks**: `isinstance` fails against the concrete class and `wrapped is original` is false, so code that keys on identity or type needs care. And **the stack is invisible at the call site**, so when something behaves oddly you have to find the wiring, which is why the wiring should live in one obvious place at the application edge.

**"When is subclassing the better answer?"**
When the features are **not independent**, so most combinations are meaningless or forbidden, and the real variation is a handful of fixed kinds. Enumerating four legitimate variants is clearer than a composition mechanism that could express forty invalid ones. The decorator's premise is free combination; if that premise is false, it is the wrong tool.

**The common wrong answer** is explaining the GoF Decorator and Python's `@` syntax as the same thing, which is what the question is testing. Next is implementing wrappers without delegation, so every decorator re-declares the whole interface and adding a method breaks them all. Third is claiming `__getattr__` makes a wrapper fully transparent, when dunder methods and `isinstance` both escape it. And last is reaching for the pattern when the features are not independent, where a few named subclasses are clearer.

---

### Say this in the interview

*"The motivation is arithmetic. If features combine freely, then naming every combination means naming a number of classes that doubles with each feature: two to the n minus one for n independent options, so ten options is a thousand and twenty-three subclasses against ten decorators. The reason is a structural mismatch, because the options compose and the subclasses enumerate results.*

*But I would not stop at the count, because two other properties matter more. First, repetition. Milk wrapping Milk wrapping Coffee needs no new class and no planning, and there is no subclass for a double-milk coffee unless somebody enumerated it in advance. Second, runtime composition: the stack is assembled when the object is created, so I can read a list of condiment names out of a request or a config file and build the drink in a loop. You cannot iterate over class names you never enumerated.*

*Mechanically, a decorator holds a reference to a component, implements the same interface, and delegates to the wrapped object while adding behaviour around the call. Open/Closed Principle aside for a second, the key structural point is that a decorator is itself a component. Because a decorator is itself a component, decorators wrap decorators, which is what makes them compose. Open/Closed is satisfied in a precise sense: a new feature is a new class, with no edit to the component, to the existing decorators, or to any call site, and call sites are unaffected because a wrapped object is substitutable for an unwrapped one.*

*In Python I would use `__getattr__` on the decorator for transparent delegation, so a wrapper overrides only the methods it changes and everything else forwards to the inner object. Without that, every decorator has to re-declare the whole interface, and adding a method to the component breaks every wrapper. I would also be honest about its limits, because they are real: `__getattr__` only runs when normal attribute lookup fails, and dunder methods are looked up on the type rather than the instance, so len of a wrapped object will not reach an inner `__len__`, and isinstance against the concrete class is false because a decorator is not a subclass. So delegation here is nearly transparent, not completely.*

*For the version I would actually ship, beverages make the arithmetic clear but repositories make the money. One class that knows about Postgres, one that adds caching and knows nothing about Postgres, one that adds logging. Three concerns, three independently testable classes, and the business code receiving the repository cannot tell the difference. And the wiring order becomes a decision the code states out loud: Logging wrapping Caching logs every call including cache hits, which is what you want for request auditing, while Caching wrapping Logging logs only the calls that reach the database, which is what you want for query profiling. Both are one line, where a CachingLoggingPostgresRepository would have buried that choice in its method bodies.*

*On the Python `@` syntax, which I think is the real point of the question: it is a different mechanism that happens to share the name. The at-sign form is exactly f equals logged of f. It wraps a function, once, at definition time, and every caller afterwards gets the wrapped version. The pattern wraps an object, at runtime, per instance. The practical consequence is that there is only one charge function, so you cannot have a logged charge for this request and a plain one for that request, whereas with the pattern I can hold a LoggingRepository around the repo for admin requests and the bare repo for everything else. And on the syntax form I would always use functools.wraps, because otherwise the wrapper's own `__name__` and `__doc__` and signature replace the wrapped function's, which breaks tracebacks, help, documentation tools and anything that inspects signatures.*

*If they want the neighbours: all of Adapter, Decorator and Proxy wrap one object in another, and they differ by interface and intent. Adapter changes the interface to make an incompatible object usable. Decorator keeps the interface and adds behaviour. Proxy keeps the interface and controls access, so lazy loading, permissions, remoting. Decorator adds to what the object does; Proxy governs whether and when the call happens at all. A caching wrapper sits right on that boundary, which is why it gets called both.*

*And the costs, which I would volunteer. Many small objects, so a stack trace through five wrappers is harder to read. Identity breaks, since isinstance against the concrete class fails and the wrapped object is not the original, so anything keying on type or identity needs care. And the stack is invisible at the call site, so when behaviour surprises you, you have to go and find the wiring, which is why the wiring belongs in one obvious place at the edge of the application. The one case where I would prefer subclassing is when the features are not independent, so most combinations are meaningless: enumerating four legitimate variants is clearer than a mechanism that can express forty invalid ones. Free combination is the decorator's premise, and if that premise is false it is the wrong tool."*
