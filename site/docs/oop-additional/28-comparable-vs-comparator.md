---
id: 28-comparable-vs-comparator
title: "Comparable vs. Comparator: Internal vs. External Ordering"
description: "Learn Comparable natural ordering vs Comparator external strategies, the integer subtraction overflow bug, and consistency with equals."
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "How do you decide between `Comparable` and `Comparator`? What is the strict return contract, what catastrophic bug occurs when subtracting integers inside `compare()`, and how does `compareTo()` interact with `TreeSet` and `equals()`?"

Both exist to answer the same question — "which of these two things comes first?" — just from different places:

- **`Comparable`** is written *inside* the class. It gives the class exactly one "natural" way to be sorted — think `String`'s alphabetical order, or `Integer`'s numeric order.
- **`Comparator`** is written *outside* the class, as its own little object. You can write as many of these as you want: sort employees by salary, or by hire date, or by department — without ever touching the `Employee` class itself.

### Core distinction

- **`Comparable<T>`** — `java.lang`, one method: `compareTo(T other)`. Built into the class. Exactly one ordering allowed.
- **`Comparator<T>`** — `java.util`, one method: `compare(T o1, T o2)`. Lives outside the class, as a lambda, a separate class, or an anonymous one. As many orderings as you want.

### Comparison

| Feature | `Comparable<T>` | `Comparator<T>` |
| :--- | :--- | :--- |
| **Package** | `java.lang` (Core language). | `java.util` (Collections framework). |
| **Method Signature** | `int compareTo(T o)` (Takes 1 argument). | `int compare(T o1, T o2)` (Takes 2 arguments). |
| **Class Modification** | Requires modifying the target class source code. | Does not modify target class (Open-Closed Principle). |
| **Orderings Allowed** | **Exactly one** (The natural ordering). | **Infinite** independent ordering strategies. |
| **Standard Collection Use** | `Collections.sort(list);` | `Collections.sort(list, comparator);` |
| **Modern Java Support** | Natural sorting in Stream `.sorted()`. | Fluent chaining via `Comparator.comparing()`. |

---

### The return contract

Both `compareTo()` and `compare()` return a signed integer:

- **Negative** → the first object comes **before** the second.
- **Zero** → they're considered **equal in order**.
- **Positive** → the first object comes **after** the second.

---

### The bug that quietly corrupts your sort order

A lot of people write comparisons as a one-liner subtraction, because it looks clean:

```java
public int compare(Employee a, Employee b) {
    return a.getSalary() - b.getSalary(); // looks fine. isn't.
}
```

The problem is integer overflow. If `a.getSalary()` is a huge negative number and `b.getSalary()` is a huge positive number, the subtraction can wrap around past the limits of a 32-bit int and flip the sign — so the method reports that the negative number is *larger* than the positive one. Your sort order silently corrupts, with no exception thrown anywhere.

```text
a = -2,000,000,000
b =  2,000,000,000
a - b should be -4,000,000,000, but that overflows a 32-bit int
and wraps around to +294,967,296 — a positive number!
```

The fix is to never subtract manually. Use the built-in helpers, which are immune to overflow:

```java
return Integer.compare(a.getSalary(), b.getSalary());
return Double.compare(a.getRating(), b.getRating());
```

---

### The other trap: `TreeSet` doesn't use `equals()`

The docs recommend — though don't require — that your ordering agree with `equals()`:

```text
(x.compareTo(y) == 0) should match x.equals(y)
```

Here's why that matters. `TreeSet` and `TreeMap` decide whether two elements are "the same" using `compareTo()`/`compare()` — **not** `equals()`. So if your comparator only looks at salary, and two different employees (different IDs, different names) both earn \$100,000:

1. `emp1.equals(emp2)` → `false` — they're clearly different people.
2. `comparator.compare(emp1, emp2)` → `0` — same salary, so "equal" by this ordering.
3. `treeSet.add(emp2)` **silently fails.** The set thinks `emp2` is a duplicate of `emp1` and just drops it — no exception, no warning.

---

### Modern comparator chaining (Java 8+)

```java
Comparator<Employee> staffComparator = Comparator
    .comparing(Employee::getDepartment)
    .thenComparing(Employee::getSalary, Comparator.reverseOrder())
    .thenComparing(Employee::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
```

---

### Say this in the interview

*"`Comparable` is implemented inside the class via `compareTo()` and gives it exactly one natural ordering. `Comparator` is implemented outside the class via `compare()` and lets you define as many sorting strategies as you want, without touching the class itself. A classic bug is subtracting two ints directly in `compare()` — that can overflow and flip the sign, so always use `Integer.compare()` instead. And comparisons should stay consistent with `equals()`, because `TreeSet` and `TreeMap` use `compareTo() == 0` to detect duplicates — if two unequal objects compare as equal, the second one gets silently dropped."*

---

### Code: the overflow bug, chaining, and the `TreeSet` drop trap

<Tabs>
<TabItem value="java" label="ComparableComparatorDemo.java" default>

```java
import java.util.*;

public class ComparableComparatorDemo {

    // Domain entity implementing Comparable (Natural Order by ID)
    static class Employee implements Comparable<Employee> {
        public final int id;
        public final String name;
        public final int salary;

        public Employee(int id, String name, int salary) {
            this.id = id;
            this.name = name;
            this.salary = salary;
        }

        @Override
        public int compareTo(Employee o) {
            // SAFE natural ordering using Integer.compare
            return Integer.compare(this.id, o.id);
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Employee emp = (Employee) o;
            return id == emp.id && salary == emp.salary && Objects.equals(name, emp.name);
        }

        @Override
        public int hashCode() {
            return Objects.hash(id, name, salary);
        }

        @Override
        public String toString() {
            return "Emp(id=" + id + ", name='" + name + "', salary=" + salary + ")";
        }
    }

    public static void main(String[] args) {
        System.out.println("--- 1. Proving the Integer Subtraction Overflow Bug ---");
        int smallScore = -2_000_000_000;
        int largeScore = 1_000_000_000;

        // Subtraction approach
        int overflowResult = smallScore - largeScore;
        System.out.println("Subtraction (small - large): " + overflowResult + " (INCORRECT: Positive means small > large!)");

        // Integer.compare approach
        int correctResult = Integer.compare(smallScore, largeScore);
        System.out.println("Integer.compare(small, large): " + correctResult + " (CORRECT: Negative means small < large)");

        System.out.println("\n--- 2. Modern Comparator Chaining ---");
        List<Employee> list = new ArrayList<>(List.of(
            new Employee(3, "Bob", 80_000),
            new Employee(1, "Alice", 120_000),
            new Employee(2, "Charlie", 80_000)
        ));

        // Sort by salary descending, then by name ascending
        list.sort(Comparator.comparingInt((Employee e) -> e.salary).reversed()
                            .thenComparing(e -> e.name));
        list.forEach(System.out::println);

        System.out.println("\n--- 3. TreeSet Duplicate Drop Trap ---");
        // Comparator checking ONLY salary
        TreeSet<Employee> salarySet = new TreeSet<>((a, b) -> Integer.compare(a.salary, b.salary));
        Employee e1 = new Employee(10, "Alice", 90_000);
        Employee e2 = new Employee(20, "Bob", 90_000);

        salarySet.add(e1);
        boolean addedE2 = salarySet.add(e2); // Attempt to add e2 with same salary!

        System.out.println("Was e2 added to TreeSet? " + addedE2);
        System.out.println("TreeSet size: " + salarySet.size() + " (e2 was silently dropped because compare returned 0!)");
    }
}
```

</TabItem>
</Tabs>
