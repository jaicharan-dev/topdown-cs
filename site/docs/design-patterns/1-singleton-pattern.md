---
id: 1-singleton-pattern
title: "Singleton: Thread Safety and the __init__ Trap"
description: "Two promises wrapped in one pattern, and only the second one causes damage: the hidden cost is that dependencies stop appearing in signatures"

sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Singleton pattern, why is it considered an anti-pattern in modern architecture, and how do you implement a concurrency-safe Singleton in Python? Explain the hidden `__init__` re-execution trap and how a Metaclass solves it."

---

### Picture it

A town with one post office.

**That is a perfectly reasonable arrangement**, and it is worth separating from the thing that goes wrong, because the pattern bundles two promises together and only one of them is the problem.

**The first promise is "there is only one".** One post office, one connection pool, one configuration object. Sometimes this is a real constraint of the world: there is one physical printer, one licence key, one file on disk. Nothing is wrong with wanting it.

**The second promise is "anyone can reach it from anywhere, without arranging it in advance".** Every citizen can walk into the post office whenever they like, and nobody records that they went. This is the convenience the pattern is usually adopted for, and it is the one that causes the damage.

Here is the damage, stated in the way that makes it concrete rather than a matter of taste. **A function's parameters are a declaration of what it needs.** Read `def charge(amount)` and you know what it takes: a number. Except that inside, it reaches out to the payment gateway, the logger, and the audit database, none of which appear anywhere in the signature. **So the signature is now a lie**, and three consequences follow immediately.

**You cannot substitute any of them.** To test `charge` without taking real money you must somehow reach inside and replace a global, which means your test has to know about the function's internals.

**You cannot tell what a change affects.** Alter the configuration object and the set of things that might break is "anything that imported it", which is everything.

**Tests stop being independent.** One instance means one piece of state, shared across every test in the run, so the order they execute in starts to matter and a failure in one shows up in another.

Notice that all three come from the second promise, not the first. **If you want one instance, have one instance and pass it to the things that need it.** The object is still unique; the dependency is now visible. That is the whole of the modern objection, and the fix is not a cleverer Singleton.

And then the Python-specific punchline, which is worth getting to early because it makes most of the machinery below unnecessary. **A module in Python is already a singleton.** It is executed once, cached, and every later import hands back the same object. So the elaborate `__new__` overriding and metaclass work exists to solve a problem that Java has and Python largely does not.

---

### The proper terms

#### What the pattern actually specifies

The **Singleton** pattern, from the Gang of Four, ensures a class has exactly one instance and provides a global access point to it. Those are two separate guarantees, usually called **instance control** and **global access**, and conflating them is the root of the criticism.

**Global state** is mutable data reachable from anywhere without being passed. A Singleton holding mutable fields is global state with better manners, and attracts all the same objections.

**Dependency injection** is the alternative: construct the one instance at the top of the program and hand it to whatever needs it as a parameter. The object is still unique, but the dependency appears in the signature, so it can be substituted, traced and reasoned about.

#### The Python construction machinery

**`__new__`** is the allocator. It runs first, receives the class, and returns an instance. Overriding it is the classic way to return a cached object instead of a fresh one.

**`__init__`** is the initialiser. It runs on whatever `__new__` returned, and this is the trap: **Python calls `__init__` whenever the construction expression is evaluated, regardless of whether `__new__` created anything new.** So a Singleton built by overriding `__new__` alone re-initialises its shared state on every apparent construction.

**`__call__` on the metaclass** is what actually runs when you write `MyClass(...)`. Since a class is an instance of its metaclass, `MyClass(args)` invokes `type(MyClass).__call__`, which then calls `__new__` and `__init__`. **Intercepting at the metaclass is therefore strictly earlier**, which is why it fixes the trap rather than working around it.

A **metaclass** is the class of a class. Using one for a Singleton makes the behaviour reusable across many classes and keeps the instance registry out of the class itself.

#### Thread safety

A **race condition** arises when two threads both find no instance and both construct one. The window is between the check and the assignment, and it is wide enough to matter in practice.

**Double-checked locking** checks without the lock, acquires the lock only if the check failed, and checks again inside it. The first check keeps the common path lock-free; the second closes the race. In Python the GIL does not remove the need, because the interpreter can switch threads between the check and the store.

#### The variants worth naming

A **module-level singleton** is the idiomatic Python answer: define the object at module scope and import it. The import system guarantees uniqueness via the `sys.modules` cache, with no code required.

The **Borg pattern**, or **monostate**, shares state rather than identity: many instances, one `__dict__`. It satisfies "one set of values" without "one object", which is occasionally what you actually wanted.

**`functools.lru_cache`** on a factory function is a quietly effective way to get one instance per argument set, which generalises the idea rather than hard-coding it.

---

### In code

#### The naive version, and the trap it hides

```python
class NaiveSingleton:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, value):
        print(f"__init__ ran with value={value}")
        self.value = value


a = NaiveSingleton("first")       # __init__ ran with value=first
b = NaiveSingleton("second")      # __init__ ran with value=second

print(a is b)        # True   -- the identity guarantee works
print(a.value)       # 'second' -- and the state was silently destroyed
```

**One object, as promised, and the state of it is wrong.** `__new__` correctly returned the cached instance, and then Python called `__init__` on it anyway, because `__init__` runs whenever the construction expression is evaluated. The second call was not a construction at all from the object's point of view, but it still overwrote every field.

This is the worst kind of bug: the identity check passes, the type is right, nothing raises, and somewhere else in the program a configuration value has quietly changed because an unrelated module wrote `Config("other")`.

The usual patch is a guard flag:

```python
class GuardedSingleton:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, value):
        if getattr(self, "_initialised", False):
            return                      # silently ignore later calls
        self._initialised = True
        self.value = value
```

It works, and it is worth being honest about what it is: **every constructor call after the first now does nothing, silently.** A caller passing different arguments gets no error and no effect, which trades a state bug for a confusing API.

#### The metaclass version

```python
import threading


class SingletonMeta(type):
    """Intercepts MyClass(...) before __new__ or __init__ can run."""
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:            # fast path, no lock
            with cls._lock:
                if cls not in cls._instances:    # re-check under the lock
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Config(metaclass=SingletonMeta):
    def __init__(self, value):
        print(f"Config.__init__ ran with value={value}")
        self.value = value


c = Config("first")      # Config.__init__ ran with value=first
d = Config("second")     # nothing printed: __init__ was never reached

print(c is d)      # True
print(c.value)     # 'first' -- preserved
```

**The trap is gone because the interception is earlier.** Writing `Config("second")` calls `type(Config).__call__`, which finds the instance in the registry and returns it without ever descending into `__new__` or `__init__`. Overriding `__new__` could not do this, because by the time `__new__` has returned, Python is already committed to calling `__init__`.

The metaclass also keeps the registry out of the class, so one metaclass serves any number of singleton classes, each with its own slot.

#### Why double-checked locking, demonstrated

```python
import threading, time


class Unsafe:
    _instance = None
    constructions = 0

    def __new__(cls):
        if cls._instance is None:
            time.sleep(0.001)          # widen the window the GIL leaves open
            cls._instance = super().__new__(cls)
            Unsafe.constructions += 1
        return cls._instance


objects = []
threads = [threading.Thread(target=lambda: objects.append(Unsafe()))
           for _ in range(50)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(Unsafe.constructions)            # 11, or 21, or 34 ...
print(len({id(o) for o in objects}))   # the same number of distinct objects
```

**Fifty threads, dozens of instances.** The exact count varies from run to run, which is the signature of a race rather than a bug with a fixed value: every thread that passed the `is None` check before any thread finished assigning got its own object. The `sleep` widens the window to make it reproducible, but the window exists without it, because **the GIL guarantees that bytecode operations do not interleave, not that a check and a store happen together.** The interpreter can and does switch threads between them.

The same test against the metaclass version yields one instance and one distinct object. And note the shape of the fix: the lock is acquired only when the fast check fails, which after startup is never, so the steady-state cost is one dictionary lookup.

#### The Pythonic answers

**A module.** Python's import system already provides exactly one of everything:

```python
# config.py
class _Config:
    def __init__(self):
        self.debug = False

config = _Config()          # constructed once, when the module first loads

# anywhere else
from config import config   # the same object, every time, guaranteed
```

The `sys.modules` cache makes this a genuine singleton with no pattern, no lock and no metaclass. **This is the right default in Python**, and the honest answer to "how do you implement a Singleton in Python" usually starts here.

**A cached factory**, when you want one instance per distinct argument rather than one overall:

```python
from functools import lru_cache


@lru_cache(maxsize=None)
def get_pool(dsn: str) -> "ConnectionPool":
    return ConnectionPool(dsn)


get_pool("postgres://a") is get_pool("postgres://a")   # True
get_pool("postgres://a") is get_pool("postgres://b")   # False
```

**And dependency injection**, when the thing holds mutable state that tests will need to control:

```python
# instead of Config() reaching for a global inside charge()
def charge(amount: float, gateway: PaymentGateway, audit: AuditLog) -> None:
    ...

# wired once, at the top of the program
gateway = StripeGateway(api_key)
audit = AuditLog(db)
charge(100.0, gateway, audit)
```

**One instance still exists.** It is created once at the entry point and passed down. What changed is that `charge`'s signature now tells the truth about what it needs, so a test can hand it a fake gateway without reaching inside anything.

#### Verify it

```python
"""
Singleton: the __init__ re-execution trap, the metaclass fix, the
thread-safety race, and the Python alternatives.
"""
import sys
import threading
import time
from functools import lru_cache


class NaiveSingleton:
    """Overrides __new__ only: identity is right, state is not."""
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, value):
        self.value = value


class SingletonMeta(type):
    """Intercepts the construction expression itself."""
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Config(metaclass=SingletonMeta):
    init_calls = 0

    def __init__(self, value):
        Config.init_calls += 1
        self.value = value


def race(cls, n=50, factory=None):
    """Hand n threads the same constructor and count what comes back."""
    made = []
    make = factory or cls
    threads = [threading.Thread(target=lambda: made.append(make()))
               for _ in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return len({id(o) for o in made})


if __name__ == "__main__":
    print("-- the __init__ re-execution trap")
    a = NaiveSingleton("first")
    b = NaiveSingleton("second")
    print(f"   a is b           : {a is b}")
    print(f"   a.value          : {a.value!r}  "
          f"<- 'first' was overwritten")
    assert a is b and a.value == "second"
    print("   __new__ returned the cached object, then Python called")
    print("   __init__ on it anyway, because __init__ runs whenever the")
    print("   construction expression is evaluated")

    print("\n-- the metaclass fix")
    Config.init_calls = 0
    SingletonMeta._instances.clear()
    c = Config("first")
    d = Config("second")
    print(f"   c is d           : {c is d}")
    print(f"   c.value          : {c.value!r}  <- preserved")
    print(f"   __init__ calls   : {Config.init_calls}  "
          f"<- ran once, not twice")
    assert c is d and c.value == "first" and Config.init_calls == 1
    print("   MyClass(...) invokes type(MyClass).__call__, which is strictly")
    print("   earlier than __new__, so __init__ is never reached")

    print("\n-- thread safety")

    class Unsafe:
        _instance = None

        def __new__(cls):
            if cls._instance is None:
                time.sleep(0.001)
                cls._instance = super().__new__(cls)
            return cls._instance

    class Safe(metaclass=SingletonMeta):
        def __init__(self):
            time.sleep(0.001)

    unsafe_count = race(Unsafe)
    SingletonMeta._instances.clear()
    safe_count = race(Safe)
    print(f"   50 threads, unsafe check-then-set : "
          f"{unsafe_count} distinct instances")
    print(f"   50 threads, double-checked lock   : "
          f"{safe_count} distinct instance(s)")
    assert safe_count == 1
    print("   the GIL stops bytecode interleaving, not a check and a store")
    print("   from being separated by a thread switch")

    print("\n-- a module is already a singleton")
    import sys as sys_again
    print(f"   two imports of sys give the same object: "
          f"{sys is sys_again}")
    print(f"   because the import machinery caches in sys.modules: "
          f"{'sys' in sys.modules}")

    print("\n-- lru_cache gives one instance per argument set")

    class Pool:
        def __init__(self, dsn):
            self.dsn = dsn

    @lru_cache(maxsize=None)
    def get_pool(dsn):
        return Pool(dsn)

    print(f"   same dsn  -> same object: "
          f"{get_pool('a') is get_pool('a')}")
    print(f"   other dsn -> new object : "
          f"{get_pool('a') is get_pool('b')}")

    print("\n-- why the global access half is the problem")
    print("   a Singleton lets a function depend on something that does not")
    print("   appear in its signature, so the signature stops being a")
    print("   declaration of what it needs. Injection keeps one instance")
    print("   and makes the dependency visible.")
```

---

### What they ask next

**"Why is it called an anti-pattern? One instance seems reasonable."**
Because the pattern bundles two guarantees and only the second is objectionable. **Instance control**, having one of something, is often a real constraint. **Global access**, reaching it from anywhere without it being passed, is what causes harm: a function can depend on it without the dependency appearing in its signature, so you cannot substitute it in tests, cannot tell what a change affects, and tests stop being independent because they share its state. **Keep the one instance and inject it**, and every objection evaporates while the uniqueness remains.

**"Explain the `__init__` re-execution trap."**
Overriding `__new__` to return a cached instance gives correct identity and incorrect state, because **Python calls `__init__` whenever the construction expression is evaluated**, regardless of whether `__new__` created anything. So `NaiveSingleton("first")` then `NaiveSingleton("second")` yields one object whose `value` is `'second'`: the first initialisation was silently destroyed. It is a nasty bug because the identity check passes and nothing raises.

**"Why does a metaclass fix it rather than patching around it?"**
Because `MyClass(args)` actually invokes `type(MyClass).__call__`, and a class is an instance of its metaclass, so **intercepting there is strictly earlier than `__new__`.** The metaclass finds the instance in its registry and returns it without descending into `__new__` or `__init__` at all. Overriding `__new__` cannot achieve this, because once `__new__` returns, Python is already committed to calling `__init__`.

**"What about a guard flag in `__init__`?"**
It works and it has a cost worth stating. Every constructor call after the first does nothing, **silently**, so a caller passing different arguments gets neither an error nor an effect. You have traded a state-corruption bug for a confusing API, which is an improvement but not a clean one. The metaclass has the same outward behaviour with the logic in one reusable place.

**"Does the GIL make Python singletons thread-safe?"**
No, and the distinction is the point. The GIL guarantees that **bytecode operations do not interleave**, not that a check and a subsequent store happen atomically. The interpreter can switch threads between `if cls._instance is None` and the assignment. Demonstrated: fifty threads against a naive check-then-set produce **dozens of distinct instances**, and the count varies between runs, which is itself the tell that it is a race.

**"Why double-check rather than just locking?"**
Because the lock is only needed once, at startup, and after that it is pure overhead on a path that every caller takes. **Double-checked locking** checks without the lock, acquires it only if the check failed, and re-checks inside it. The steady-state cost falls to one dictionary lookup, and the second check is what actually closes the race, since another thread may have constructed the instance while this one waited.

**"What is the idiomatic Python answer?"**
**A module.** Define the object at module scope and import it: the `sys.modules` cache guarantees it is created once and that every import returns the same object, with no pattern, no lock and no metaclass. Two imports of `sys` give the identical object. All the machinery above exists to solve a Java problem, where there is no module-level object and a class is the only container.

**"When would you still reach for the explicit pattern?"**
When uniqueness must be enforced against callers rather than merely provided, so that a stray `Config()` elsewhere cannot create a second one; when the construction is expensive and lazy, so you want it on first use rather than at import; and when you need one instance per key rather than one overall, where **`functools.lru_cache`** on a factory expresses it more clearly than a Singleton does.

**"What is the Borg or monostate variant?"**
It shares **state** rather than identity: many instances, all pointing at the same `__dict__`. `a is b` is false while `a.x is b.x` is true. It is occasionally what you actually wanted, since callers can construct freely and subclasses behave more predictably, and it still carries the global-state objection because the shared mutable data is the problem rather than the object count.

**"How does this interact with testing specifically?"**
Badly, in a way that compounds. One instance means one piece of state for the whole test run, so tests leak into each other and execution order starts to matter. You end up writing reset hooks, which is state management the production code never has, and those hooks have to know the Singleton's internals. **Injection removes the problem rather than managing it**, because each test constructs its own.

**The common wrong answer** is implementing the pattern by overriding `__new__` and stopping there, which gives one object with repeatedly reinitialised state. Next is claiming the GIL makes it thread-safe, when a naive implementation demonstrably produces dozens of instances under 50 threads. Third is defending Singleton purely on "there should only be one", which concedes nothing, since injection also gives exactly one and the objection was never about the count. And last is not mentioning that a Python module already is a singleton, which is the answer an interviewer expecting Python fluency is listening for.

---

### Say this in the interview

*"The Singleton guarantees two separate things, and I would split them first because only one of them is the problem. It guarantees instance control, that there is exactly one, and global access, that anyone can reach it without it being passed to them. The first is often a genuine constraint, like one connection pool or one physical printer. The second is what makes it an anti-pattern.*

*The concrete harm is that a function's parameters are supposed to be a declaration of what it needs. If I read `def charge(amount)` and inside it reaches for a payment gateway, a logger and an audit database through globals, then the signature is a lie. Three things follow: I cannot substitute those dependencies in a test without reaching into the function's internals, I cannot tell what a change to the configuration object affects because the answer is anything that imported it, and my tests stop being independent because they all share one piece of mutable state, so execution order starts to matter. All three come from the global access half. If I want one instance, I construct one at the top of the program and pass it down. The object is still unique and the dependency is now visible, which is the whole of the modern objection.*

*On the implementation trap. The classic approach overrides `__new__` to return a cached instance. That gives correct identity and incorrect state, because Python calls `__init__` whenever the construction expression is evaluated, whether or not `__new__` created anything. So if I write NaiveSingleton of "first" and then NaiveSingleton of "second", I get one object whose value is "second": the first initialisation was silently destroyed. That is a nasty class of bug, because the identity check passes, the type is right, nothing raises, and somewhere else a config value has quietly changed.*

*People patch that with a guard flag in `__init__`, and I would be honest that it works but trades one problem for another: every constructor call after the first now does nothing, silently, so a caller passing different arguments gets neither an error nor an effect.*

*The clean fix is a metaclass, and the reason it works is that it intercepts earlier. Writing MyClass of args actually invokes `type(MyClass).__call__`, because a class is an instance of its metaclass. So the metaclass `__call__` can find the instance in a registry and return it without ever descending into `__new__` or `__init__`. Overriding `__new__` cannot do that, because once `__new__` returns, Python is already committed to calling `__init__`. The metaclass also keeps the registry out of the class, so one metaclass serves any number of singleton classes.*

*For thread safety I would use double-checked locking inside that `__call__`, since otherwise there is a race condition between the check and the store: check without the lock, acquire it only if the check failed, then check again inside. And I would be clear that the GIL does not make this unnecessary. The GIL stops bytecode operations interleaving; it does not make a check and a subsequent store atomic, and the interpreter can switch threads between them. If you want the demonstration, fifty threads racing a naive check-then-set produces dozens of distinct instances, and the number differs every run, which is itself the signature of a race. The double-check matters because another thread may have constructed the instance while this one was waiting for the lock, and the reason to check without the lock first is that the lock is only needed at startup, so the steady-state cost drops to one dictionary lookup.*

*But the answer I would actually give for Python is: use a module. A module is already a singleton. It is executed once, cached in sys.modules, and every later import hands back the same object, so a module-level singleton needs no pattern, no lock and no metaclass. Two imports of sys give the identical object. All that `__new__` and metaclass machinery exists to solve a Java problem, where there is no module-level object and a class is the only container available.*

*Where I would still reach for something explicit: if uniqueness has to be enforced against callers rather than just provided, so a stray Config() elsewhere cannot make a second one; if construction is expensive and I want it lazily on first use rather than at import time; or if I want one instance per key rather than one overall, where `functools.lru_cache` on a factory function says that far more clearly than a Singleton does. And if what I really wanted was shared values rather than a shared object, the Borg pattern, also called monostate, shares `__dict__` across many instances, though it keeps the global-state objection, because the shared mutable data was always the problem rather than the object count."*
