---
id: 1-singleton-pattern
title: "Singleton Pattern: Thread Safety, Metaclasses & Python Gotchas"
description: "Master the Singleton design pattern in Python: thread safety with double-checked locking, the __init__ re-execution trap, metaclasses, and Borg monostate."
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Singleton pattern, why is it considered an anti-pattern in modern architecture, and how do you implement a concurrency-safe Singleton in Python? Explain the hidden `__init__` re-execution trap and how a Metaclass solves it."

---

### 1. Executive Summary & Core Intent

The **Singleton Pattern** is a creational design pattern that guarantees a class has **only one instance** throughout the entire application lifecycle and provides a global access point to that instance.

```
                  ┌───────────────────────────────┐
                  │       Client Request          │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                     Does Instance Exist?
                    /                    \
                  YES                     NO
                  /                         \
                 ▼                           ▼
       Return Existing Pointer        Allocate Memory in RAM
          (No allocation)             Store in _instance Cache
                 │                           │
                 └──────────────┬────────────┘
                                │
                                ▼
                  Return Identical Object Reference
```

#### Legitimate Real-World Use Cases:
1. **Database Connection Pools:** Maintaining a single pool managing a finite set of physical TCP sockets to MongoDB, PostgreSQL, or Redis.
2. **Hardware Device Controllers:** Managing physical I/O resources (e.g., a shared serial port, GPU device handle, or printer buffer).
3. **Application Configuration Registry:** Parsing and caching environment variables (`.env` or YAML config) into a single immutable dictionary on boot.
4. **Centralized Logging Service:** Routing all module logs to a synchronized file descriptor.

---

### 2. Why Singletons Are Controversial: The Anti-Pattern Critique

In modern software engineering, Singletons are frequently labeled an **anti-pattern**. Staff interviewers expect you to proactively critique the pattern before writing code:

1. **Global Mutable State:** Singletons introduce hidden dependencies. When Component A modifies an attribute inside the Singleton, Component B may fail unpredictably, creating tight coupling across unrelated modules.
2. **Unit Testing Nightmare (State Leakage):** Singletons persist across test suite runs. Test 1 mutating a singleton leaks dirty state into Test 2, causing order-dependent test failures. Resetting requires writing awkward tear-down hooks.
3. **Violation of Single Responsibility Principle (SRP):** The class manages its business logic (e.g., querying databases) *and* controls its own lifecycle and access permissions.
4. **Concurrency Bottlenecks:** A global singleton accessed by hundreds of worker threads becomes a synchronization bottleneck if critical sections require locking.

> **Modern Alternative:** Use **Dependency Injection (DI)**. Create a single instance at application startup and inject it via constructors into classes that require it.

---

### 3. Python Object Creation: __new__() vs. __init__()

To implement a Singleton in Python, one must understand Python's internal two-phase instantiation model:

```
Python Object Instantiation Flow:
Step 1: __new__(cls)   ──[ Allocates raw memory block ]──►  Returns new instance
                                                                   │
Step 2: __init__(self) ◄──[ Receives instance as self ]────────────┘
                           Initialises attributes & state
```

* **`__new__(cls, *args, **kwargs)`:** A static method responsible for **allocating memory** and returning a raw instance of `cls`. It is the actual constructor.
* **`__init__(self, *args, **kwargs)`:** An instance method that receives the already-allocated object as `self` and **mutates/initializes attributes**. It cannot return values.

#### The Construction Analogy:
- `__new__` is the **Construction Contractor**: Secures the physical plot of land in RAM and builds the physical frame.
- `__init__` is the **Interior Decorator**: Enters the already-built house and arranges the furniture.

If you attempt to enforce the Singleton constraint inside `__init__`, `__new__` has already allocated a redundant block of RAM. The interception **must happen in `__new__`**.

---

### 4. The Critical Python Trap: The __init__() Re-execution Bug

A classic flaw in naive `__new__` Singletons is that **Python unconditionally invokes `__init__` every time `ClassName()` is called**, even if `__new__` returns an existing instance:

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

Although `db1 is db2` evaluates to `True`, the constructor logic **re-executed**, resetting state or opening duplicate network sockets!

#### The Fix: Initialization Guard Flag
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

### 5. Concurrency & Thread-Safe Double-Checked Locking (DCL)

In multi-threaded environments, a naive `if cls._instance is None` check suffers from a **race condition**. If Thread 1 and Thread 2 check `_instance` at the same microsecond, both see `None` and allocate two distinct objects.

To make it thread-safe without sacrificing performance, use **Double-Checked Locking (DCL)**:

```python
import threading

class ThreadSafeDatabase:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        # First Check (Unsynchronized): Avoid lock overhead once initialized
        if cls._instance is None:
            with cls._lock:
                # Second Check (Synchronized): Protect against concurrent threads
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

#### Why Double-Check?
- If we lock on every single access, every thread querying the database pool would synchronize, destroying multi-core throughput.
- The **first check** avoids the lock once the instance exists.
- The **second check** guarantees that only one thread creates the instance if multiple threads raced through the first check before initialization.

---

### 6. The Three Idiomatic Python Implementations

#### Approach 1: The Metaclass Singleton (Recommended for Clean Architecture)
In Python, classes are themselves instances of metaclasses (`type`). Overriding `__call__` on a metaclass controls class instantiation cleanly without polluting the business class:

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
        # __init__ runs ONLY ONCE naturally because __call__ controls invocation!
        self.url = url
```

#### Approach 2: The Module-Level Singleton (The "Pythonic" Default)
Because Python executes module files once upon first import and caches them in `sys.modules`, a module is inherently a thread-safe Singleton:

```python
# config_service.py
class _ConfigService:
    def __init__(self):
        self.api_key = "secret_123"

# Instantiate directly at module scope
config = _ConfigService()
```
```python
# Any other file
from config_service import config
# Every importer gets the identical cached instance
```

#### Approach 3: The Borg Pattern (Monostate)
Invented by Alex Martelli, Borg allows multiple instances to exist, but forces them all to share the **exact same internal state dictionary (`__dict__`)**:

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

### 7. Serialization & Deepcopy Vulnerabilities

Even a solid Singleton can be broken by serialization libraries (`pickle`) or `copy.deepcopy()`:

1. **Pickling Attack:** Deserializing a pickled Singleton creates a brand new instance in memory without calling `__new__`.
2. **Deepcopy Attack:** `copy.deepcopy(instance)` bypasses `__new__` and allocates a fresh copy.

#### How to Immunize:
```python
import copy

class HardenedSingleton(metaclass=SingletonMeta):
    def __copy__(self):
        return self

    def __deepcopy__(self, memo):
        return self

    def __reduce__(self):
        # Instructs pickle to invoke the class rather than deserializing raw state
        return (self.__class__, ())
```

---

### 8. Comparative Evaluation Matrix

| Pattern / Approach | Thread-Safe? | Prevents Duplicate __init__? | Preserves OOP Inheritance? | Best For |
| :--- | :---: | :---: | :---: | :--- |
| **Naive __new__** | No | No (requires guard flag) | Yes | Quick prototypes; single-threaded scripts. |
| **DCL __new__** | Yes | Yes (with guard flag) | Yes | Production systems needing explicit class-level control. |
| **Metaclass** | Yes | **Yes (Naturally)** | Yes | Enterprise frameworks; cleanest separation of concerns. |
| **Module-Level** | **Yes (Built into Python)** | **Yes** | No | Standard configuration objects and small services. |
| **Borg (Monostate)** | Yes | Yes | Yes | When multiple distinct instances sharing state are acceptable. |

---

### 9. Python Verification Script

The following standalone script verifies thread safety across 10 concurrent threads, proves object identity, and verifies that `__init__` executes exactly once:

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
