---
id: 39-dependency-injection
title: "Dependency Injection vs. Dependency Inversion"
description: "Learn how Dependency Injection practically implements the Dependency Inversion principle for looser coupling."

sidebar_position: 22
sidebar_class_name: sidebar-hard
---

import { DependencyInjectionFigure } from '@site/src/components/Figures/DependencyInjection';

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Everyone throws around the terms Dependency Injection, Dependency Inversion, and Inversion of Control. Are they the same thing? What are the three types of DI, and why is field injection considered an anti-pattern?"

Picture an F1 driver who's hardcoded to build their own car: welds the chassis, bolts on the tires, before every race. If it starts raining, they're stuck: they already built dry-weather tires with their own hands, and that's all they know how to make.

Now picture a driver who just says "I need a `Vehicle`." The pit crew hands them one: dry tires on a sunny day, rain tires if it's wet. The driver never touches tire manufacturing. They just race with whatever `Vehicle` shows up.

That's the difference dependency injection makes: a class stops building its own dependencies and instead just declares what it needs, letting something outside hand it over.

<DependencyInjectionFigure />

### The three ways to inject a dependency

| Injection Type | How It Works | Verdict |
|---|---|---|
| **1. Constructor Injection** | The dependency is passed in as a constructor parameter. | **Best practice.** The object can't exist in a half-built state, fields can be `final`/immutable, and you can unit test with a plain object - no framework needed. |
| **2. Setter Injection** | The dependency is handed over through a public setter method, after construction. | **Use with caution.** Fine for optional dependencies, but if something calls a method before the setter runs, you get a `NullPointerException`. |
| **3. Field Injection** | A private field is annotated (like `@Autowired`) and the framework fills it in via reflection. | **Anti-pattern.** The dependency is invisible from the constructor, it's hard to unit test without the framework, and circular dependencies don't surface until runtime. |

### Three terms people mix up

- **Dependency Inversion (DIP)** is the *principle*: high-level code should depend on interfaces, not concrete classes. This is the goal.
- **Dependency Injection (DI)** is the *technique*: pass dependencies in from outside instead of constructing them internally. This is how you actually achieve DIP.
- **Inversion of Control (IoC)** is the *framework* that does the wiring for you automatically - Spring's `ApplicationContext`, NestJS's injector - deciding what to construct, in what order, and handing it to whoever asked.

In short: DIP says what the code should look like, DI is how you write it that way, and IoC is the machinery that does it for you at scale.

---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Clean Code Example

Here is how constructor dependency injection enables flexible swapping and easy unit testing across languages:

<Tabs groupId="programming-language">
<TabItem value="java" label="Java" default>

```java
// 1. Abstraction (DIP)
interface Database {
    void save(String data);
}

class PostgresDatabase implements Database {
    @Override
    public void save(String data) {
        System.out.println("Saved to Postgres: " + data);
    }
}

// 2. Class depends on interface; receives it via Constructor Injection
class PaymentProcessor {
    private final Database database; // Immutability guaranteed

    public PaymentProcessor(Database database) {
        this.database = database; // Injected from outside
    }

    public void process(String transaction) {
        database.save(transaction);
    }
}

// Usage in tests: easy to inject a MockDatabase without a framework
```

</TabItem>
<TabItem value="cpp" label="C++">

```cpp
#include <iostream>
#include <memory>
#include <string>

// 1. Interface
class Database {
public:
    virtual ~Database() = default;
    virtual void save(const std::string& data) = 0;
};

class PostgresDatabase : public Database {
public:
    void save(const std::string& data) override {
        std::cout << "Saved to Postgres: " << data << std::endl;
    }
};

// 2. Constructor Dependency Injection
class PaymentProcessor {
private:
    std::shared_ptr<Database> database;

public:
    PaymentProcessor(std::shared_ptr<Database> db) : database(db) {}

    void process(const std::string& transaction) {
        database->save(transaction);
    }
};
```

</TabItem>
<TabItem value="python" label="Python">

```python
from abc import ABC, abstractmethod

# 1. Interface
class Database(ABC):
    @abstractmethod
    def save(self, data: str) -> None:
        pass

class PostgresDatabase(Database):
    def save(self, data: str) -> None:
        print(f"Saved to Postgres: {data}")

# 2. Constructor Dependency Injection
class PaymentProcessor:
    def __init__(self, database: Database):
        self._database = database # Injected dependency

    def process(self, transaction: str) -> None:
        self._database.save(transaction)

# In unit tests, simply pass a MockDatabase() to PaymentProcessor
```

</TabItem>
</Tabs>
