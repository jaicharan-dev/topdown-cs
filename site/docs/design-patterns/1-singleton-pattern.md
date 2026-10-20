---
id: 1-singleton-pattern
title: "Singleton Pattern: Thread Safety, Metaclasses & Python Gotchas"
description: "Master the Singleton design pattern in Python: thread safety with double-checked locking, the __init__ re-execution trap, metaclasses, and Borg monostate."
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field, Tree } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Singleton pattern, why is it considered an anti-pattern in modern architecture, and how do you implement a concurrency-safe Singleton in Python? Explain the hidden `__init__` re-execution trap and how a Metaclass solves it."

There's one database connection, shared by the whole app. Everyone who asks for "the connection" gets routed to that same object — nobody can accidentally open a second one. **Singleton** does that in code: a class that guarantees only one instance ever exists, and hands out that same instance to anyone who asks. We'll use that database connection as the running example for the rest of this page.

<Diagram>
<Tree root={
<Box title="Something calls DatabaseConnection()" accent="#818cf8">
<Field icon="❓" code="does an instance already exist?" variant="neutral" />
</Box>
}>
<Box title="Yes" accent="#34d399"><Field icon="↩️" code="return the existing one" hint="no new memory allocated" variant="neutral" /></Box>
<Box title="No" accent="#f59e0b"><Field icon="🆕" code="create it, cache it, return it" hint="one-time allocation" variant="neutral" /></Box>
</Tree>
</Diagram>

#### Where it's actually the right call:
1. **Database connection pools** — one pool managing a finite set of real TCP sockets.
2. **Hardware device controllers** — a shared serial port, GPU handle, or printer buffer.
3. **App config** — parse `.env`/YAML once, cache it.
4. **Centralized logging** — all modules write through one synchronized file handle.

---

### Why Singletons Are Controversial

Despite being useful, Singletons get called an anti-pattern constantly — and interviewers expect you to bring this up before they ask:

1. **It's global mutable state in disguise.** One component silently changing the singleton can break a completely unrelated component that also depends on it.
2. **It wrecks unit tests.** The singleton persists across test runs — state from Test 1 leaks into Test 2, and now your tests only pass in a specific order.
3. **It breaks Single Responsibility.** The class ends up doing its actual job *and* managing its own lifecycle and access control.
4. **It becomes a concurrency bottleneck.** One global object, hundreds of threads, one lock — that's a traffic jam waiting to happen.

> **The usual fix:** Dependency Injection. Create one instance at startup, and pass it into whatever needs it through the constructor — instead of letting every class reach out and grab it globally.

---

### How Python Actually Builds an Object

To implement this correctly, you need to know Python builds every object in two separate steps:

<Diagram>
<Row>
<Box title="__new__(cls)" accent="#60a5fa"><Field icon="🏗️" code="allocates the raw memory" hint="the actual constructor" variant="neutral" /></Box>
<Arrow label="hands back the instance" />
<Box title="__init__(self)" accent="#34d399"><Field icon="🛋️" code="fills in the attributes" hint="can't return a value" variant="neutral" /></Box>
</Row>
</Diagram>

Think of `__new__` as the contractor who secures the plot and builds the frame, and `__init__` as the interior decorator who walks into the already-built house and arranges the furniture. This matters for Singleton specifically: if you try to block duplicate instances inside `__init__`, it's too late — `__new__` already allocated the memory. **The check has to happen in `__new__`.**

---

### The Trap: `__init__` Runs Every Time, Even on a "Cached" Instance

Here's the bug nearly everyone writes the first time: Python calls `__init__` on *every* `ClassName()` call, even when `__new__` just handed back the same cached object.

```python
class NaiveDatabase:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        print("Connecting to DB...")
        self.connection = "Socket#123"

db1 = NaiveDatabase()  # Prints: "Connecting to DB..."
db2 = NaiveDatabase()  # Prints: "Connecting to DB..." AGAIN!
```

`db1 is db2` is `True` — it really is the same object — but the constructor logic reran anyway, which could mean resetting state or opening a second network socket you didn't want.

**The fix: a guard flag that `__init__` checks first.**

```python
class SafeDatabase:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        print("Connecting to DB exactly once...")
        self.connection = "Socket#123"
        self._initialized = True
```

---

### Making It Thread-Safe: Double-Checked Locking

With multiple threads, `if cls._instance is None:` has a race condition — two threads can both see `None` at the same instant and each create their own instance. The fix is **double-checked locking (DCL)**:

```python
import threading

class ThreadSafeDatabase:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        # First check (no lock): skip locking entirely once it's already built
        if cls._instance is None:
            with cls._lock:
                # Second check (inside the lock): catch threads that raced past check 1
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, endpoint: str = "localhost:5432"):
        if getattr(self, "_initialized", False):
            return
        with self._lock:
            if getattr(self, "_initialized", False):
                return
            self.endpoint = endpoint
            self._initialized = True
```

Why check twice? If every call grabbed the lock, every thread touching this singleton would serialize behind it — you'd kill your multi-core throughput for no reason. Checking once *before* the lock skips that cost once the instance exists; checking again *inside* the lock is what actually prevents the race.

---

### Three Ways to Actually Build One in Python

**1. Metaclass Singleton** — the cleanest option. Classes in Python are themselves instances of `type`; override `__call__` on a metaclass and you control instantiation without touching the business class at all:

```python
import threading

class SingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    instance = super().__call__(*args, **kwargs)
                    cls._instances[cls] = instance
        return cls._instances[cls]

class DatabaseService(metaclass=SingletonMeta):
    def __init__(self, url: str):
        # __init__ only runs once — __call__ is what controls invocation now
        self.url = url
```

**2. Module-Level Singleton** — the "just use Python" option. A module only ever executes once per process (Python caches it in `sys.modules`), so a plain module-level object is already a thread-safe singleton:

```python
# config_service.py
class _ConfigService:
    def __init__(self):
        self.api_key = "secret_123"

config = _ConfigService()
```
```python
# anywhere else
from config_service import config  # everyone gets the same object
```

**3. Borg (Monostate)** — Alex Martelli's trick: don't bother enforcing one instance at all. Let Python create as many objects as it wants, but force them all to share the same `__dict__` — so they're different objects (`is` says `False`), yet behave identically because every attribute read/write hits the same underlying state. That's the "mono-state" in the name: many instances, one state.

<Diagram>
<Row>
<Box title="Instance A" accent="#60a5fa"><Field icon="📦" code="different object" variant="neutral" /></Box>
<Box title="Instance B" accent="#34d399"><Field icon="📦" code="different object" variant="neutral" /></Box>
</Row>
<Row>
<Box title="Shared __dict__" accent="#818cf8"><Field icon="🔗" code="both point here" hint="change one, the other sees it instantly" variant="neutral" /></Box>
</Row>
</Diagram>

```python
class Borg:
    _shared_state = {}

    def __init__(self):
        self.__dict__ = self._shared_state

class AppConfig(Borg):
    def __init__(self, mode="production"):
        super().__init__()
        if not hasattr(self, "mode"):
            self.mode = mode
```

---

### Two Ways a "Solid" Singleton Still Gets Broken

`pickle` and `copy.deepcopy()` both bypass `__new__` entirely, so even a correct Singleton can end up duplicated:

```python
import copy

class HardenedSingleton(metaclass=SingletonMeta):
    def __copy__(self):
        return self

    def __deepcopy__(self, memo):
        return self

    def __reduce__(self):
        # tells pickle to call the class again instead of rebuilding raw state
        return (self.__class__, ())
```

---

### Comparing the Approaches

| Approach | Thread-Safe? | Blocks Duplicate `__init__`? | Works with Inheritance? | Best For |
| :--- | :---: | :---: | :---: | :--- |
| **Naive `__new__`** | No | No (needs a guard flag) | Yes | Quick prototypes, single-threaded scripts |
| **DCL `__new__`** | Yes | Yes, with the guard flag | Yes | Production code needing explicit control |
| **Metaclass** | Yes | **Yes, naturally** | Yes | Clean architecture, frameworks |
| **Module-Level** | **Yes, by default** | **Yes** | No | Config objects, small services |
| **Borg** | Yes | Yes | Yes | When separate objects sharing state is fine |

---

### Say this in the interview

*"Singleton guarantees one instance and a global access point to it — it's controversial because that's global mutable state, so Dependency Injection is usually preferred instead. In Python, the hard part is that `__init__` reruns on every call even when `__new__` returns a cached object, so you need a guard flag — or better, a metaclass overriding `__call__`, which prevents the rerun naturally."*

---

### Python: Verification Script

This script spins up 10 threads racing to instantiate the same Singleton, then proves they all got the identical object and `__init__` ran exactly once:

```python
"""
Thread-Safe Singleton and Metaclass Verification Test Suite
"""
import threading
import time
from typing import List


class SingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    instance = super().__call__(*args, **kwargs)
                    cls._instances[cls] = instance
        return cls._instances[cls]


class ConnectionPool(metaclass=SingletonMeta):
    init_count = 0

    def __init__(self, pool_size: int = 10):
        ConnectionPool.init_count += 1
        self.pool_size = pool_size
        # Simulate expensive connection setup
        time.sleep(0.05)


def worker(results: List[ConnectionPool], thread_id: int):
    # Concurrent worker requesting connection pool
    pool = ConnectionPool(pool_size=20)
    results.append(pool)


if __name__ == "__main__":
    print("=" * 65)
    print("THREAD-SAFE SINGLETON (METACLASS) VERIFICATION")
    print("=" * 65)

    # 1. Spawn 10 concurrent threads racing to instantiate the Singleton
    threads: List[threading.Thread] = []
    pool_instances: List[ConnectionPool] = []

    for i in range(10):
        t = threading.Thread(target=worker, args=(pool_instances, i))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    # 2. Verify all references point to the exact same memory address
    first_pool = pool_instances[0]
    all_identical = all(p is first_pool for p in pool_instances)
    all_same_id = all(id(p) == id(first_pool) for p in pool_instances)

    print(f"Total Threads Executed:         {len(pool_instances)}")
    print(f"All References Identical (`is`): {all_identical}")
    print(f"All Memory Addresses Equal:     {all_same_id} (Address: 0x{id(first_pool):X})")
    print(f"Total `__init__` Invocations:   {ConnectionPool.init_count} (Must be exactly 1)")

    assert all_identical, "Error: Multiple distinct instances created under concurrent load!"
    assert ConnectionPool.init_count == 1, "Error: __init__ executed multiple times!"
    print("\nSUCCESS: Concurrency safety and single-execution guarantees verified.")
```
