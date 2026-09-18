---
id: 28-comparable-vs-comparator
title: "Comparable vs. Comparator"
sidebar_position: 28
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "If you need to sort a collection of custom objects, how do you decide whether to use `Comparable` or `Comparator`? What's the architectural difference between the two?"

### ELI5: The Self-Organizer vs. The Event Coordinator
Imagine a classroom of students trying to line up.

Comparable is when the students inherently know how to line up by themselves. The teacher just yells "Line up!" and because every student knows their own alphabetical order, they sort themselves out automatically. It is their natural way of ordering.

Comparator is when a third party (the event coordinator) steps in with a clipboard. The students don't change, but the coordinator says, "Today, we are lining up by height," or "Now, line up by test score." The coordinator looks at two students side-by-side, compares them, and places them in order.

### The Proper Answer: Internal vs. External Sorting Logic
This is a classic Java/OOP question that tests your understanding of interface design and separation of concerns.

### Comparable (The Natural Order)
*   **Where it lives:** You implement java.lang.Comparable directly on the class you want to sort (e.g., class Employee implements Comparable&lt;Employee&gt;).
*   **The Method:** It forces you to override compareTo(Object obj).
*   **How it works:** It compares "this" object (the current instance) against the object passed in as an argument.
*   **The Limitation:** Because you are modifying the actual class, you can only define one sorting sequence. If you make Employee sort by employeeId, you cannot easily use Comparable to sort by lastName later.

### Comparator (The Custom Order)
*   **Where it lives:** You create a completely separate, standalone class or lambda expression that implements java.util.Comparator. The original object class (Employee) remains untouched.
*   **The Method:** It forces you to override compare(Object obj1, Object obj2).
*   **How it works:** It takes two distinct objects, evaluates them, and decides which one comes first.
*   **The Advantage:** You can create infinite sorting strategies. You can have an AgeComparator, a SalaryComparator, or chain them together (e.g., sort by department, then by salary).

### See It In Action
Use this widget to toggle between the internal code of Comparable and the external, flexible logic of Comparator.

### Interview Summary
If you want to nail this question quickly, contrast them across three dimensions: modifications, methods, and cardinality.
1.  **Modification:** Comparable requires modifying the source code of the class you are sorting. Comparator does not; it is an external sorting strategy.
2.  **Method Signature:** Comparable uses compareTo(Object obj) (1 argument). Comparator uses compare(Object obj1, Object obj2) (2 arguments).
3.  **Flexibility:** Comparable defines a single "natural" order (like ID). Comparator allows for multiple, interchangeable sorting sequences (like sorting by Name, then Date, then Salary).

---

### Crucial Nuance: When to use `Comparator.comparing()` and Java 8 features

While the classic `compare(obj1, obj2)` logic is universally understood, modern Java interviews often expect you to utilize Java 8's functional programming features. Instead of writing verbose custom classes or anonymous inner classes for every sorting strategy, you can use `Comparator.comparing()`. 

For example, `students.sort(Comparator.comparing(Student::getLastName).thenComparing(Student::getFirstName))` allows for incredibly elegant, readable, and chainable sorting logic. Pointing this out in an interview demonstrates that your Java knowledge is up-to-date and that you understand how to write clean, maintainable code rather than just legacy boilerplates.

