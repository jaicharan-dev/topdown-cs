---
id: 38-observer-pattern
title: "Observer Pattern"
sidebar_position: 52
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** What is the Observer pattern, why would you use it, and show me a Python implementation  -  use a stock price alert system as your example.

The Observer pattern is a behavioral design pattern that defines a one-to-many relationship between objects. When one object (the Subject/Publisher) changes state, all of its dependents (the Observers/Subscribers) are automatically notified and updated. It is used to build reactive, event-driven systems while maintaining loose coupling.

### Why would you use it?

**The ELI5 Analogy:** Imagine waiting for a highly anticipated video game to restock online.
* **The Bad Way (Polling):** You sit at your computer and refresh the page every 5 seconds, asking, "Is it here yet?" This wastes your energy and overloads the store's servers.
* **The Observer Way (Pushing):** You click a button that says "Email me when available" (You subscribe). You go about your day. The moment the game arrives, the store sends an email to you and 1,000 other people automatically.

**The Technical Reality:** In a financial system, if the price of Bitcoin changes, you need to update a mobile app, trigger an automated trading bot, and send an SMS alert. If you tightly couple these, the Bitcoin tracker has to know the intimate details of the app, the bot, and the SMS service. With the Observer pattern, the Bitcoin tracker just shouts, "My price changed to $60,000!" into a megaphone, and any system that signed up to listen reacts on its own.

### The Python Implementation

To keep the code clean and avoid the confusion of Python's magic methods, we will just use a standard list to manage the subscriptions.

```python
from abc import ABC, abstractmethod

# ==========================================
# 1. THE OBSERVER (The Listeners)
# ==========================================
class Observer(ABC):
    @abstractmethod
    def update(self, stock_name: str, price: float):
        """This is the method the Subject will call to notify the Observer."""
        pass

# Concrete Listeners
class MobileAppAlert(Observer):
    def update(self, stock_name: str, price: float):
        print(f"📱 MOBILE ALERT: {stock_name} just jumped to ${price}!")

class TradingBot(Observer):
    def update(self, stock_name: str, price: float):
        if price < 150:
            print(f"🤖 TRADING BOT: {stock_name} is cheap at ${price}. Executing BUY order!")
        else:
            print(f"🤖 TRADING BOT: {stock_name} is ${price}. Holding position.")


# ==========================================
# 2. THE SUBJECT (The Publisher)
# ==========================================
class StockTicker:
    def __init__(self, name: str, price: float):
        self.name = name
        self._price = price
        # This list holds everyone who wants to be notified
        self._subscribers = [] 

    # --- Subscription Management ---
    def subscribe(self, observer: Observer):
        if observer not in self._subscribers:
            self._subscribers.append(observer)

    def unsubscribe(self, observer: Observer):
        if observer in self._subscribers:
            self._subscribers.remove(observer)

    # --- The Core Logic ---
    def notify_all(self):
        # Loop through the list and call the update() method on every subscriber
        for subscriber in self._subscribers:
            subscriber.update(self.name, self._price)

    # We use a property to trigger notifications automatically when the price changes
    def set_price(self, new_price: float):
        print(f"\n--- Market Update: {self.name} changes to ${new_price} ---")
        self._price = new_price
        # The magic happens here: automatically notify everyone!
        self.notify_all()


# ==========================================
# 3. THE EXECUTION TRACE
# ==========================================

# 1. Create the stock
apple_stock = StockTicker("AAPL", 145.00)

# 2. Create our listeners
my_phone = MobileAppAlert()
algo_bot = TradingBot()

# 3. Subscribe them to the stock
apple_stock.subscribe(my_phone)
apple_stock.subscribe(algo_bot)

# 4. Change the price! (Watch the observers react automatically)
apple_stock.set_price(148.50)

# 5. Change it again!
apple_stock.set_price(155.00)
```

### The Code Breakdown

The `StockTicker` doesn't care what is listening to it. It just has a list of generic `Observer` objects. When `set_price` is called, it updates its own internal state, and then iterates through that list, calling `.update()` on everything inside it. Because the `TradingBot` and `MobileAppAlert` both signed the Observer contract (via the ABC), the stock guarantees they both have an `.update()` method it can trigger.

### Tying it to SOLID for the Interview

The Observer pattern is a masterclass in the Open/Closed Principle. If you are asked to add a new `EmailAlert` system tomorrow, you simply write the new class and subscribe it. You do not have to touch a single line of code inside the `StockTicker` class to support this brand new feature.

---

### Crucial Nuance: The Lapsed Listener Problem

The most common real-world bug introduced by the Observer pattern is a memory leak known as the "Lapsed Listener Problem." Because the Subject (`StockTicker`) holds a strong reference to every subscribed Observer in its list, the Garbage Collector cannot clean up an Observer even if the client application is completely done with it. You must explicitly unsubscribe Observers, or implement the list using weak references (e.g., `weakref` in Python) to prevent the application from bloating out of memory.

