---
id: 5-decorator-pattern-ocp
title: "Decorator Pattern: Open/Closed Principle & Enterprise Wrapping"
description: "Master the Decorator pattern in Python: solve subclass explosion, uphold OCP, implement caching repository decorators, and contrast GoF with Python @syntax."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import { Diagram, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Decorator pattern, how does it uphold the Open/Closed Principle (OCP) without subclass explosion, and how does it differ from Python's `@decorator` syntax? Show both the classic beverage example and an enterprise database repository decorator with transparent delegation."

Start with `Coffee`. Now customers want Milk, Sugar, Caramel, Whipped Cream — in any combination. If you try to handle this with subclasses, you need `CoffeeWithMilk`, `CoffeeWithMilkAndSugar`, `CoffeeWithMilkSugarAndCaramel`... for N toppings, that's up to **2^N subclasses**, and changing the base price means touching every single one.

**Decorator** fixes this with nesting instead of subclassing — literally like Russian nesting dolls. Each wrapper has the exact same interface as what it wraps, forwards the call inward, and adds its own bit on the way back out:

<Diagram>
<Box title="WhippedCream" accent="#f59e0b">
<Field icon="🍦" code="+ $0.75" variant="neutral" />
<Box title="Milk" accent="#60a5fa">
<Field icon="🥛" code="+ $0.50" variant="neutral" />
<Box title="Espresso (the core)" accent="#34d399">
<Field icon="☕" code="$2.50" variant="neutral" />
</Box>
</Box>
</Box>
</Diagram>

`WhippedCream(Milk(Espresso())).get_cost()` resolves from the inside out: `2.50 → +0.50 → +0.75 = $3.75`.

---

### Building It: Dynamic Beverage Wrapper

```python
from abc import ABC, abstractmethod


# 1. Base Component Interface
class Coffee(ABC):
    @abstractmethod
    def get_cost(self) -> float: pass

    @abstractmethod
    def get_description(self) -> str: pass


# 2. Concrete Component (The innermost core)
class Espresso(Coffee):
    def get_cost(self) -> float: return 2.50
    def get_description(self) -> str: return "Espresso"


# 3. Base Decorator (Implements interface & wraps an existing instance)
class CoffeeDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        self._coffee = coffee

    def get_cost(self) -> float:
        return self._coffee.get_cost()

    def get_description(self) -> str:
        return self._coffee.get_description()


# 4. Concrete Decorators
class Milk(CoffeeDecorator):
    def get_cost(self) -> float:
        return self._coffee.get_cost() + 0.50

    def get_description(self) -> str:
        return f"{self._coffee.get_description()}, Steamed Milk"


class WhippedCream(CoffeeDecorator):
    def get_cost(self) -> float:
        return self._coffee.get_cost() + 0.75

    def get_description(self) -> str:
        return f"{self._coffee.get_description()}, Whipped Cream"
```

---

### A Second Example: Repository Caching & Logging

The same trick works for infrastructure concerns, not just toppings — wrapping a database repository with caching, latency logging, or retries, without touching the repository's own SQL:

```python
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


# 1. Domain Repository Interface
class UserRepository(ABC):
    @abstractmethod
    def get_by_id(self, user_id: int) -> Dict[str, Any]: pass


# 2. Concrete Implementation (Simulates slow physical SQL database)
class PostgresUserRepository(UserRepository):
    def get_by_id(self, user_id: int) -> Dict[str, Any]:
        time.sleep(0.1)  # Simulate 100ms database I/O latency
        return {"id": user_id, "name": f"User_{user_id}", "source": "Postgres_DB"}


# 3. Decorator: In-Memory Redis Caching
class CachedUserRepository(UserRepository):
    def __init__(self, repo: UserRepository):
        self._repo = repo
        self._cache: Dict[int, Dict[str, Any]] = {}

    def get_by_id(self, user_id: int) -> Dict[str, Any]:
        if user_id in self._cache:
            data = dict(self._cache[user_id])
            data["source"] = "Cache_Hit"
            return data

        data = self._repo.get_by_id(user_id)
        self._cache[user_id] = data
        return data


# 4. Decorator: Latency Audit Logging
class LoggingUserRepository(UserRepository):
    def __init__(self, repo: UserRepository):
        self._repo = repo

    def get_by_id(self, user_id: int) -> Dict[str, Any]:
        start = time.perf_counter()
        result = self._repo.get_by_id(user_id)
        elapsed_ms = (time.perf_counter() - start) * 1000
        print(f"[AUDIT LOG] Query for User ID {user_id} took {elapsed_ms:.2f} ms")
        return result
```

- **Composability:** You can combine them arbitrarily without modifying a single line of SQL logic:
  ```python
  repo = LoggingUserRepository(CachedUserRepository(PostgresUserRepository()))
  ```

---

### Don't Confuse This With Python's `@decorator` Syntax

Same name, genuinely different mechanism — this trips people up constantly:

| Dimension | GoF Structural Decorator (OOP) | Python `@decorator` (Functional) |
| :--- | :--- | :--- |
| **Mechanism** | Object composition (wraps an object instance). | Higher-order function (takes a function, returns a closure). |
| **Instantiation Time** | Dynamic at runtime on individual object instances. | Static at module load time when the function is defined. |
| **Target** | Whole objects conforming to a shared class interface. | Individual functions, class methods, or classes. |
| **Interface Requirement** | Must implement the exact same interface as the wrapped object. | Does not require interfaces; relies on callable duck-typing. |
| **Common Use Cases** | Stream filtering (`BufferedReader`), repository caching. | Auth checks (`@login_required`), routing (`@app.get`), timing. |

---

### The Gotcha: Wrapping Hides Methods the Interface Didn't Declare

If the wrapped object has extra methods that aren't part of the shared interface, the decorator hides them — callers only see what the interface promises. Python's `__getattr__` fixes this by forwarding anything unhandled straight through to the inner object:

```python
class TransparentDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        self._coffee = coffee

    def __getattr__(self, name: str):
        """Forward any attribute or method not explicitly handled down to the inner object."""
        return getattr(self._coffee, name)
```

---

### Say this in the interview

*"Decorator wraps an object in another object implementing the same interface, letting you add behavior without subclassing — it solves the 2^N subclass explosion you'd get from combining optional features through inheritance. Each layer forwards the call inward and adds its own bit on the way back out, so you can stack caching, logging, or retries around a repository without touching its code. Don't conflate it with Python's `@decorator` syntax — that's a function wrapper resolved at module load time, while GoF Decorator wraps whole object instances at runtime."*

---

### Python: Verification Script

The following standalone script demonstrates beverage order composition and enterprise repository caching with execution latency measurements:

```python
"""
Decorator Pattern Verification Test Suite
Verifies:
  1. Classic coffee order composition and cost accumulation
  2. Enterprise repository caching and audit logging
"""
import time
from abc import ABC, abstractmethod
from typing import Dict, Any


# --- 1. BEVERAGE ORDER TEST ---
class Coffee(ABC):
    @abstractmethod
    def get_cost(self) -> float: pass
    @abstractmethod
    def get_description(self) -> str: pass

class Espresso(Coffee):
    def get_cost(self) -> float: return 2.50
    def get_description(self) -> str: return "Espresso"

class Milk(Coffee):
    def __init__(self, inner: Coffee): self.inner = inner
    def get_cost(self) -> float: return self.inner.get_cost() + 0.50
    def get_description(self) -> str: return f"{self.inner.get_description()}, Milk"

class Sugar(Coffee):
    def __init__(self, inner: Coffee): self.inner = inner
    def get_cost(self) -> float: return self.inner.get_cost() + 0.25
    def get_description(self) -> str: return f"{self.inner.get_description()}, Sugar"


# --- 2. REPOSITORY CACHING TEST ---
class UserRepository(ABC):
    @abstractmethod
    def fetch(self, uid: int) -> Dict[str, Any]: pass

class DatabaseRepo(UserRepository):
    def fetch(self, uid: int) -> Dict[str, Any]:
        time.sleep(0.05)  # Simulate DB latency
        return {"id": uid, "source": "Database"}

class CachedRepo(UserRepository):
    def __init__(self, repo: UserRepository):
        self.repo = repo
        self.cache = {}

    def fetch(self, uid: int) -> Dict[str, Any]:
        if uid in self.cache:
            return {"id": uid, "source": "Cache"}
        data = self.repo.fetch(uid)
        self.cache[uid] = data
        return data


if __name__ == "__main__":
    print("=" * 65)
    print("DECORATOR PATTERN VERIFICATION TEST SUITE")
    print("=" * 65)

    # 1. Test Coffee Wrapping
    my_coffee = Sugar(Milk(Espresso()))
    print(f"Order: {my_coffee.get_description()}")
    print(f"Cost:  ${my_coffee.get_cost():.2f}")
    assert my_coffee.get_cost() == 3.25
    assert my_coffee.get_description() == "Espresso, Milk, Sugar"

    # 2. Test Enterprise Caching Decorator
    print("\n--- Testing Enterprise Repository Decorator ---")
    repo = CachedRepo(DatabaseRepo())

    t0 = time.perf_counter()
    r1 = repo.fetch(101)
    ms1 = (time.perf_counter() - t0) * 1000
    print(f"First Query (Cold): {r1} -> Latency: {ms1:.2f} ms")

    t0 = time.perf_counter()
    r2 = repo.fetch(101)
    ms2 = (time.perf_counter() - t0) * 1000
    print(f"Second Query (Hot): {r2} -> Latency: {ms2:.2f} ms")

    assert r1["source"] == "Database"
    assert r2["source"] == "Cache"
    assert ms2 < ms1 / 5, "Cached access should be dramatically faster"

    print("\nSUCCESS: All Decorator pattern behaviors verified.")
```
