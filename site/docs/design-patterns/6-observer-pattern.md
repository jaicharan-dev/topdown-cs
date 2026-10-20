---
id: 6-observer-pattern
title: "Observer Pattern: Event-Driven Systems & The Lapsed Listener Leak"
description: "Master the Observer pattern in Python: memory-safe subscriptions via weakref, push vs. pull models, and architectural distinctions from Pub-Sub brokers."
sidebar_position: 6
sidebar_class_name: sidebar-hard
---

import { Diagram, Tree, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the Observer pattern, why would you use it, and how does it fundamentally differ from Publish-Subscribe? How do you prevent the notorious 'Lapsed Listener' memory leak in Python, and what are the tradeoffs between Push and Pull notification models?"

A stock ticker has a price. A mobile alert, a trading bot, and who knows how many other things care the instant it changes — but the ticker shouldn't need to know anything about any of them. **Observer** is that: a one-to-many relationship where the subject just broadcasts "I changed," and whoever's listening reacts, without the subject needing to know who's out there. It replaces polling (constantly asking "did it change yet?") with a push.

<Diagram>
<Tree root={
<Box title="StockTicker (Subject)" accent="#818cf8">
<Field icon="📢" code="notify()" hint="calls update(symbol, price) on every subscriber" variant="neutral" />
</Box>
}>
<Box title="MobileAlert" accent="#34d399"><Field icon="↳" code="update() → sends SMS" variant="neutral" /></Box>
<Box title="HighFrequencyBot" accent="#34d399"><Field icon="↳" code="update() → buys if price < threshold" variant="neutral" /></Box>
</Tree>
</Diagram>

---

### The Critical Bug: The Lapsed Listener Memory Leak

The most prevalent production bug in Observer implementations is the **Lapsed Listener Problem**:

1. A Subject maintains a standard Python list of subscribers: `self._subscribers = []`.
2. Appending an observer to a list creates a **strong reference** in memory.
3. Even when the client application finishes using an observer and drops its local variable (`del observer_instance`), Python's Garbage Collector **cannot free the object** because the Subject's internal list still holds an active strong pointer.
4. Over days or weeks in long-running services, this creates a severe, invisible memory leak.

#### The Python Fix: Weak References via `weakref.WeakSet`
By storing subscribers in a `weakref.WeakSet`, the Subject holds **weak references**. When all other strong references to an Observer are dropped, Python reclaims its memory immediately, and `WeakSet` **automatically evicts the dead listener**:

```python
import weakref

class MemorySafeSubject:
    def __init__(self):
        # Automatically drops dead observers without explicit detach()
        self._subscribers = weakref.WeakSet()
```

---

### A Full Implementation: Memory-Safe Financial Ticker

```python
import weakref
from abc import ABC, abstractmethod
from typing import Dict, Any


# 1. Observer Interface
class StockObserver(ABC):
    @abstractmethod
    def update(self, symbol: str, price: float) -> None:
        """Called automatically by the Subject when price changes."""
        pass


# 2. Concrete Observers
class MobileAlert(StockObserver):
    def __init__(self, user_phone: str):
        self.phone = user_phone

    def update(self, symbol: str, price: float) -> None:
        print(f"[SMS -> {self.phone}] Alert: {symbol} shifted to ${price:.2f}")


class HighFrequencyBot(StockObserver):
    def __init__(self, buy_threshold: float):
        self.threshold = buy_threshold

    def update(self, symbol: str, price: float) -> None:
        if price < self.threshold:
            print(f"[ALGO BOT] {symbol} at ${price:.2f} is under ${self.threshold:.2f} -> EXECUTING BUY")
        else:
            print(f"[ALGO BOT] {symbol} at ${price:.2f} -> HOLDING")


# 3. Memory-Safe Subject
class StockTicker:
    def __init__(self, symbol: str, initial_price: float):
        self.symbol = symbol
        self._price = initial_price
        # WeakSet prevents memory leaks from forgotten detaches
        self._subscribers = weakref.WeakSet()

    def attach(self, observer: StockObserver) -> None:
        self._subscribers.add(observer)

    def detach(self, observer: StockObserver) -> None:
        self._subscribers.discard(observer)

    def set_price(self, new_price: float) -> None:
        if new_price != self._price:
            self._price = new_price
            self.notify()

    def notify(self) -> None:
        for observer in list(self._subscribers):
            observer.update(self.symbol, self._price)
```

---

### Push vs. Pull: Two Ways to Notify

Two options for what `update()` actually hands over:

| Dimension | Push Model | Pull Model |
| :--- | :--- | :--- |
| **Data Flow** | Subject passes all detailed event data as arguments to `update()`. | Subject sends only itself (`update(self)`), and the Observer queries what it needs. |
| **Coupling** | Low coupling: Observers only need basic data types (strings, floats). | Higher coupling: Observers must know the Subject's public getter API. |
| **Network Efficiency** | Can waste bandwidth if observers only care about 1 of 20 fields. | Highly efficient: Observers pull only necessary fields on demand. |
| **Best Used When** | Event payloads are small, standardized, and universally needed. | Complex domain events with massive state dictionaries. |

---

### Observer Is Not the Same Thing as Pub-Sub

These get conflated constantly, but they're architecturally quite different:

| Feature | Observer Pattern (GoF) | Publish-Subscribe (Pub-Sub) |
| :--- | :--- | :--- |
| **Component Awareness** | Subject and Observer **know each other's interfaces** directly. | Publishers and Subscribers are **completely decoupled** and mutually unaware. |
| **Intermediary Broker** | **None.** Direct in-memory method dispatch. | **Yes.** Requires an Event Bus or Message Broker (Kafka, RabbitMQ, Redis). |
| **Execution Boundary** | **In-Process only.** Runs synchronously inside a single memory space. | **Cross-Process & Distributed.** Crosses physical network nodes asynchronously. |
| **Failure Blast Radius** | If an observer raises an uncaught exception, it crashes the publisher. | A failing subscriber does not affect publishers or peer subscribers. |
| **Scaling Capability** | Limited to single CPU RAM and single-threaded execution. | Scalable horizontally across thousands of distributed server clusters. |

---

### The Slow-Observer Problem

In a plain synchronous Observer, one observer making a blocking HTTP call or disk write inside `update()` stalls **every other subscriber** behind it — they're all waiting on the same thread. Three ways out:
1. **Thread Pool Offloading:** The Subject dispatches notification tasks to an internal `concurrent.futures.ThreadPoolExecutor`.
2. **Asyncio Event Loop:** Declare `async def update(self)` and use `asyncio.gather(*[sub.update() for sub in self._subscribers])`.
3. **Queue Decoupling:** Observers place events into an internal thread-safe `queue.Queue` and process them asynchronously on background worker threads.

---

### Say this in the interview

*"Observer sets up a one-to-many relationship: a subject broadcasts state changes, and subscribers react, without the subject needing to know anything about who's listening. In Python, the real production trap is the Lapsed Listener leak — a plain list holds strong references, so a subscriber the client thinks it dropped never actually gets garbage collected; `weakref.WeakSet` fixes that by letting dead listeners evict themselves automatically. Don't confuse this with Pub-Sub: Observer is synchronous, in-process, and subject/observer know each other's interfaces directly, while Pub-Sub goes through a broker and the two sides are fully decoupled."*

---

### Python: Verification Script

The following standalone script demonstrates event broadcasting and provides mathematical proof of memory leak prevention using `weakref.WeakSet`:

```python
"""
Observer Pattern Verification Test Suite
Verifies:
  1. Multi-observer dynamic event dispatch
  2. Automatic memory reclamation via weakref (Lapsed Listener prevention)
"""
import weakref
from abc import ABC, abstractmethod


class StockObserver(ABC):
    @abstractmethod
    def update(self, symbol: str, price: float) -> None: pass


class MockListener(StockObserver):
    def __init__(self, name: str):
        self.name = name
        self.received_events = []

    def update(self, symbol: str, price: float) -> None:
        self.received_events.append((symbol, price))


class ObservableTicker:
    def __init__(self, symbol: str):
        self.symbol = symbol
        self._price = 0.0
        self._subscribers = weakref.WeakSet()

    def attach(self, obs: StockObserver):
        self._subscribers.add(obs)

    def set_price(self, price: float):
        self._price = price
        for sub in list(self._subscribers):
            sub.update(self.symbol, self._price)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)


if __name__ == "__main__":
    print("=" * 65)
    print("OBSERVER PATTERN & WEAKREF VERIFICATION TEST SUITE")
    print("=" * 65)

    ticker = ObservableTicker("GOOGL")

    # 1. Attach subscribers
    listener_a = MockListener("Listener_A")
    listener_b = MockListener("Listener_B")

    ticker.attach(listener_a)
    ticker.attach(listener_b)

    print(f"Active Subscribers after attach: {ticker.subscriber_count}")
    assert ticker.subscriber_count == 2

    # 2. Broadcast event
    ticker.set_price(180.50)
    print(f"Listener A Events: {listener_a.received_events}")
    print(f"Listener B Events: {listener_b.received_events}")
    assert listener_a.received_events == [("GOOGL", 180.50)]

    # 3. Simulate client dropping Listener B without calling detach()
    print("\n--- Testing Lapsed Listener Leak Prevention ---")
    del listener_b  # Strong reference destroyed

    # In a naive list, subscriber_count would stay 2 forever (memory leak).
    # With weakref.WeakSet, it automatically prunes to 1!
    print(f"Subscribers remaining after `del listener_b`: {ticker.subscriber_count}")
    assert ticker.subscriber_count == 1, "Dead listener should be automatically garbage collected!"

    # 4. Final broadcast only reaches surviving listener
    ticker.set_price(185.00)
    print(f"Listener A Final Event Count: {len(listener_a.received_events)}")
    assert len(listener_a.received_events) == 2

    print("\nSUCCESS: Event broadcast and automated weakref pruning verified.")
```
