---
id: 4-code-trace-diamond-shaped-multiple-inheritance
title: "Code Trace: Diamond Inheritance and the MRO"
description: "super() does not mean my parent, it means the next class in the MRO of the actual object, which is why B hands sideways to C and A runs once"

sidebar_position: 4
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the exact output of this Python code, in order? Explain why `super()` inside class `B` jumps 'sideways' to class `C`, manually derive the MRO using the C3 Linearization merge algorithm, and explain how to safely pass arguments in cooperative multiple inheritance."

```python
class A:
    def __init__(self):
        print("A")

class B(A):
    def __init__(self):
        print("B")
        super().__init__()

class C(A):
    def __init__(self):
        print("C")
        super().__init__()

class D(B, C):
    def __init__(self):
        print("D")
        super().__init__()

d = D()
```

**Before you scroll.** Four lines print, one per class, so the only question is the order, and there are two plausible wrong answers. `B` inherits from `A`, so `super()` inside `B` looks like it should reach `A`. Decide whether it does, and decide whether `A` prints once or twice given that there are two paths to it.

<details>
<summary><b>The output, once you have committed to an answer</b></summary>

```text
D
B
C
A
```

`A` prints **once**, not twice, and `super()` inside `B` reaches **`C`**, which is not `B`'s parent and is not even on `B`'s own inheritance path. The same diamond in C++ prints `A B A C D`.

</details>

---

### Picture it

A chain of people passing a parcel, where none of them chose who is next.

The natural reading of `super()` is "my parent", and it is worth saying plainly that **this reading is wrong and is the entire difficulty of the question.** If `super()` inside `B` meant "`B`'s parent", it would reach `A`, `A` would print, and then control would return. Then nothing would ever reach `C`, which is impossible to square with `C` appearing in the output at all.

The correct reading is that **each class is handed a list, and `super()` means the next name on the list after mine.** The list is built once, for the type of the object that actually exists, and the same list is used by every class in the chain. So `B` does not look at its own family tree when it calls `super()`. It looks at `D`'s list, finds itself, and passes to whoever is next, which happens to be `C`.

That is why the hop is "sideways": `C` is not above `B` in any inheritance sense. `B` and `C` are siblings. **The list is not a tree walk, it is an ordering of every class involved**, and `B`'s only job is to hand on rather than to know who receives.

Two consequences fall out of this, and they are the reason the design is what it is.

**Nobody appears twice.** The list is a list, so `A` has one position on it however many paths lead there, and the parcel reaches it once. A naive depth-first tree walk would reach `A` through `B` and then again through `C`.

**No class can be built to know its own successor.** `B`'s successor is `C` when the object is a `D`, and would be `A` if the object were a plain `B`. So `B` must be written to hand on without knowing to whom, which is exactly what calling `super()` with no arguments achieves. **This is cooperative inheritance**, and the cooperation is compulsory: one class in the chain that forgets to call `super()` silently truncates everything after it.

And the ordering of the output is worth one more look, because it reverses what people expect. Each class prints **before** handing on, so the output reads top-down, `D` first. Had each printed after handing on, the output would read bottom-up. C++ gives the opposite order for exactly this reason: its base constructors run before the derived body, so the base prints first.

---

### The proper terms

#### The method resolution order

The **MRO** is the linear sequence of classes Python searches for an attribute, available as `D.__mro__` or `D.mro()`. It is computed **once per class, at class creation time**, not per call.

Every lookup on an instance consults the MRO of **`type(self)`**, which is the fact that makes the sideways hop possible. `B`'s own MRO is `[B, A, object]`, and it is never used when the object is a `D`.

#### What `super()` actually does

**`super()`** with no arguments is shorthand that the compiler fills in as `super(__class__, self)`, where `__class__` is the class whose body the call appears in. It returns a proxy that resolves attributes by searching the MRO of `type(self)` starting at the position after `__class__`.

So the two inputs are: where am I in the list, which comes from the lexical class, and which list, which comes from the runtime type of the object. Saying it that way makes the behaviour obvious rather than surprising:

- in `B`, with a `D` instance, the list is `[D, B, C, A, object]` and the position after `B` is `C`
- in `B`, with a plain `B` instance, the list is `[B, A, object]` and the position after `B` is `A`

**The same line of code reaches a different class depending on the object.** That is not a quirk; it is the mechanism that makes a class reusable in several hierarchies.

#### C3 linearization

The MRO is computed by **C3 linearization**, which produces an order satisfying three constraints:

1. a class precedes all of its ancestors, called local precedence
2. the order of base classes in the `class` statement is preserved, called monotonicity
3. the result is consistent for every class in the hierarchy

The rule is a **merge**:

$$L[C] = C + \text{merge}(L[B_1], \ldots, L[B_n], [B_1, \ldots, B_n])$$

and `merge` repeatedly takes the **head of the first list whose head does not appear in the tail of any other list**, where the tail is everything after the head.

When no such head exists the hierarchy is inconsistent and Python raises `TypeError: Cannot create a consistent method resolution order (MRO)` at class-definition time. `class X(A, B)` alongside `class Y(B, A)` and then `class Z(X, Y)` is the classic rejected case.

#### Cooperative multiple inheritance

A hierarchy is **cooperative** when every class in it calls `super()` for the shared methods, so the chain reaches every participant. The requirements that make it work in practice:

**Every class must call `super()`**, including the ones that feel like leaves, because a missing call truncates the chain silently with no error.

**Signatures must be compatible**, which in practice means accepting and forwarding `**kwargs`, because a class cannot know what the classes after it on the list need.

**Exactly one class must stop forwarding**, and it is `object`, whose `__init__` accepts no extra arguments. A class that passes unknown keywords to `object.__init__` gets a `TypeError`, which is why the top of a cooperative hierarchy consumes what it needs and forwards the rest.

---

### Why it does that, step by step

#### Deriving the MRO by hand

Start from the top. `object` has the trivial linearization, and `A` inherits only from it:

```
L[A] = [A, object]
L[B] = B + merge(L[A], [A])
     = B + merge([A, object], [A])
     = [B, A, object]
L[C] = [C, A, object]
```

Now `D`, which is the interesting one:

```
L[D] = D + merge(L[B], L[C], [B, C])
     = D + merge([B, A, object], [C, A, object], [B, C])
```

Work the merge one candidate at a time, always trying the head of the first list first:

| Round | Lists remaining | Candidate | In the tail of another list? | Taken |
| :---: | :--- | :---: | :--- | :---: |
| 1 | `[B,A,object]` `[C,A,object]` `[B,C]` | `B` | no, `B` heads list 3 and is in no tail | **B** |
| 2 | `[A,object]` `[C,A,object]` `[C]` | `A` | **yes**, `A` is in the tail of `[C,A,object]` | skip |
| 2 | | `C` | no, the tails are `[object]` and `[]` | **C** |
| 3 | `[A,object]` `[A,object]` `[]` | `A` | no, `A` is the head of both, not a tail | **A** |
| 4 | `[object]` `[object]` | `object` | no | **object** |

$$L[D] = [D, B, C, A, \text{object}]$$

**Round 2 is the whole algorithm.** `A` is rejected as a candidate because something that must come before it, namely `C`, has not been placed yet. That single rule is what stops `A` from being visited twice and what forces the sideways hop, and it is the reason the constraint is stated as "not in the tail of any other list".

Verified against the interpreter: `[c.__name__ for c in D.__mro__]` gives `['D', 'B', 'C', 'A', 'object']`.

#### The trace

| Step | Running in | `super()` resolves to | Why | Output |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `D.__init__` | | | `D` |
| 2 | `D.__init__` calls `super()` | **`B`** | position after `D` in `[D,B,C,A,object]` | |
| 3 | `B.__init__` | | | `B` |
| 4 | `B.__init__` calls `super()` | **`C`** | position after `B` in the **same** list | |
| 5 | `C.__init__` | | | `C` |
| 6 | `C.__init__` calls `super()` | **`A`** | position after `C` | |
| 7 | `A.__init__` | | | `A` |
| 8 | `A.__init__` returns, no `super()` call | | the chain ends | |

**Step 4 is the answer to the question as posed.** `B.__init__` contains the literal text `super().__init__()`, and which class that reaches is decided by `type(self)`, which is `D`. `B`'s own MRO never enters into it.

Each class prints **before** calling `super()`, which is why the output is top-down. Reverse those two statements inside every class and the output becomes `A C B D`, with the same MRO.

#### The same diamond in C++

C++ has no MRO, and what it does instead is worth knowing because it is a genuinely different model.

```cpp
struct A { A() { std::cout << "A" << std::endl; } };
struct B : A { B() { std::cout << "B" << std::endl; } };
struct C : A { C() { std::cout << "C" << std::endl; } };
struct D : B, C { D() { std::cout << "D" << std::endl; } };
int main() { D d; }
```

Compiled and run, this prints:

```text
A
B
A
C
D
```

**`A` is constructed twice**, because `D` contains two complete `A` subobjects, one reached through `B` and one through `C`. `sizeof(D)` confirms it: with an empty `A` of size 1, `sizeof(D)` is 2. A `D` genuinely has two `A`s, and an unqualified reference to an inherited `A` member is ambiguous and fails to compile.

Adding `virtual` to the inheritance fixes the duplication:

```cpp
struct B : virtual A { ... };
struct C : virtual A { ... };
struct D : B, C { ... };
```

which prints:

```text
A
B
C
D
```

One shared `A`, constructed once, by the most-derived class rather than by `B` or `C`.

#### Three answers to one diamond

| | Order | Times `A` runs | Mechanism |
| :--- | :--- | :---: | :--- |
| **Python** | `D B C A` | **1** | one MRO, each class handed on via `super()` |
| **C++, plain inheritance** | `A B A C D` | **2** | two separate `A` subobjects |
| **C++, virtual inheritance** | `A B C D` | **1** | one shared `A`, built by the most-derived class |

Two differences account for all of it. **Python's order is top-down and C++'s is bottom-up**, because Python's classes print before delegating while C++ constructs bases before running the derived body. And **Python shares the base by default while C++ duplicates it unless told otherwise**, which is why C++ needs a keyword for the case Python treats as the only sensible one.

#### Passing arguments safely

Add parameters and the naive version breaks immediately, because `B` cannot know what `C` needs:

```python
class A:
    def __init__(self, **kwargs):
        super().__init__(**kwargs)        # reaches object, which takes none

class B(A):
    def __init__(self, b_arg=None, **kwargs):
        self.b_arg = b_arg
        super().__init__(**kwargs)        # forward the rest, untouched

class C(A):
    def __init__(self, c_arg=None, **kwargs):
        self.c_arg = c_arg
        super().__init__(**kwargs)

class D(B, C):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

d = D(b_arg=1, c_arg=2)        # both arrive, by different hops
```

Three rules make that work, and each corresponds to a way it commonly fails.

**Accept `**kwargs` and forward it.** `D(b_arg=1, c_arg=2)` enters `B`, which consumes `b_arg` and forwards `c_arg` to `C`. Fixed positional signatures are not impossible, they are brittle: they work only while every class in the chain happens to accept what the previous one forwards. Give `C` a second required parameter and `B`, which cannot know about it, fails with `TypeError: C.__init__() missing 1 required positional argument: 'd'`. Keywords are what let a class forward arguments it has never heard of.

**Consume what you own and pass the rest.** `B` must not forward `b_arg`, or `object.__init__` will eventually receive it and raise `TypeError`.

**Let the chain end at `object`.** `A` here forwards to `object.__init__`, which accepts nothing extra, so by that point `kwargs` must be empty. If a keyword survives, you get `TypeError: object.__init__() takes exactly one argument (the instance to initialize)`, which tells you the chain leaked without naming the culprit, so the debugging move is to print `kwargs` at each hop.

---

### What they ask next

**"Why does `super()` inside `B` reach `C` rather than `A`?"**
Because `super()` does not mean "my parent". It means the next class after me in the MRO of `type(self)`, and `type(self)` is `D`, whose MRO is `[D, B, C, A, object]`. The position after `B` is `C`. `B`'s own MRO, `[B, A, object]`, is never consulted. The same line in `B` reaches `A` if the object is a plain `B`, which is the point: **the same code participates in different chains depending on the object.**

**"What does bare `super()` expand to?"**
`super(__class__, self)`, with `__class__` filled in by the compiler from the class body the call appears in. So it has two inputs: **the lexical class** gives the starting position, and **the runtime type of the object** gives which MRO to walk. Separating those two is what makes the behaviour predictable rather than magical.

**"Derive `D`'s MRO."**
`L[A] = [A, object]`, `L[B] = [B, A, object]`, `L[C] = [C, A, object]`, then `L[D] = D + merge([B,A,object], [C,A,object], [B,C])`. Take `B`, since it heads the first list and appears in no tail. Then `A` is **rejected** because it sits in the tail of `[C,A,object]`, so take `C` instead. Then `A`, then `object`. Result `[D, B, C, A, object]`. **The rejection of `A` in round two is the algorithm doing its job**: something that must precede `A` had not been placed yet.

**"Why does `A` print once rather than twice?"**
Because the MRO is a **list**, and `A` occupies one position on it regardless of how many paths lead there. A depth-first tree walk would reach `A` through `B` and again through `C`, which is what C++ does without virtual inheritance.

**"What happens if a class forgets to call `super()`?"**
The chain is **silently truncated** at that class, with no error. Remove the `super()` call from `B` and the output becomes `D B`, with `C` and `A` never running. This is the fragility of cooperative inheritance: correctness depends on every participant honouring the protocol, and the failure is a missing side effect rather than an exception.

**"When does Python refuse to build the MRO?"**
When no consistent order satisfies the constraints, which raises `TypeError: Cannot create a consistent method resolution order (MRO)` at class-definition time. The classic case is `class X(A, B)` and `class Y(B, A)` followed by `class Z(X, Y)`: `X` demands `A` before `B` and `Y` demands the reverse. **Catching it at definition time rather than at call time is a real advantage** of computing the MRO once per class.

**"How do you pass arguments through a cooperative hierarchy?"**
Every class accepts `**kwargs`, consumes the keywords it owns, and forwards the remainder with `super().__init__(**kwargs)`; the chain terminates at `object`, which accepts nothing extra. Fixed positional signatures are brittle rather than impossible: they survive only while every class happens to accept what the previous one forwards, and adding a required parameter to a class further along the MRO breaks the class before it, which cannot know about it. And a class that forwards a keyword it has already consumed reaches `object.__init__`, which reports `takes exactly one argument` without naming the keyword, so the fix is to print `kwargs` at each hop.

**"What does C++ do with the same diamond?"**
It prints `A B A C D` and constructs `A` **twice**, because a `D` contains two complete `A` subobjects, one via `B` and one via `C`; `sizeof(D)` is 2 for an empty `A` of size 1, and an unqualified reference to an inherited `A` member is ambiguous. Marking the inheritance `virtual` gives one shared `A`, printing `A B C D`, constructed by the most-derived class. **Python shares by default; C++ duplicates unless told not to.**

**"Why is Python's order top-down and C++'s bottom-up?"**
Because of where the print sits relative to the delegation. Python's classes print and then call `super()`, so the output reads `D B C A`. C++ constructs base subobjects **before** the derived constructor body runs, so bases print first. Swap the two statements in every Python class and the output becomes `A C B D` with the same MRO, which shows the order is about the code rather than about the MRO.

**"Is multiple inheritance worth it?"**
For mixins that each own one orthogonal concern and cooperate properly, yes, and that is how it is used in practice: a logging mixin, a serialisation mixin. For modelling a taxonomy, rarely, because the cooperation requirement propagates to every future subclass author and a missing `super()` call fails silently. **The rule of thumb is that multiple inheritance works when the classes do not need to know about each other and fails when they do.**

**The common wrong answer** is `D B A C A`, from treating `super()` as a parent pointer and walking the tree depth-first, which also visits `A` twice. Next is `D B A`, assuming the chain ends when it first reaches `A`. Third is deriving the MRO by breadth-first search, which happens to give the right answer here and the wrong one on hierarchies where C3's tail rule matters. And last is explaining the sideways hop as a special case for diamonds, when it is the ordinary behaviour of `super()` and the diamond merely makes it visible.

---

### Say this in the interview

*"The output is D, B, C, A. A prints once, and super inside B reaches C, which is not B's parent. The order comes from C3 linearization, which computes the MRO once per class at class-creation time.*

*The correction that makes all of it make sense is that super does not mean my parent. It means the next class after me in the method resolution order of `type(self)`. Bare super expands to super of double-underscore-class and self, so it has two inputs: the lexical class where the call is written gives the starting position, and the runtime type of the object decides which MRO to walk. So inside B, with a D instance, the list is D, B, C, A, object, and the position after B is C. B's own MRO, which is B, A, object, is never consulted. The same line in B would reach A if the object were a plain B, and that is the whole point: the same code participates in different chains depending on the object.*

*That also explains why the hop looks sideways. C is not above B in any inheritance sense, they are siblings. The MRO is not a tree walk, it is one ordering of every class involved, and B's only job is to hand on without knowing to whom.*

*Deriving the MRO: L of A is A, object. L of B is B, A, object, and L of C is C, A, object. Then L of D is D plus merge of those two plus the list of bases, B, C. The merge takes the head of the first list whose head is not in the tail of any other list. Round one: B heads the first list and appears in no tail, so take B. Round two: A is the next head, but A is in the tail of C, A, object, so reject it, and take C instead. Then A, then object. So D, B, C, A, object. Round two is the algorithm doing its work: A was rejected because something that must come before it, namely C, had not been placed yet. That single rule is what stops A being visited twice and what forces the sideways hop.*

*And A prints once because the MRO is a list, so A has one position on it however many paths lead there. A depth-first tree walk would reach A through B and again through C, which is exactly what C++ does without virtual inheritance.*

*Two fragilities worth volunteering. If any class forgets to call super, the chain is silently truncated with no error: drop the super call from B and the output becomes just D, B. Correctness depends on every participant honouring the protocol, and the failure is a missing side effect rather than an exception. And Python will refuse to build an MRO at all when no consistent order exists, raising a TypeError about a consistent method resolution order at class-definition time, the classic case being X of A, B alongside Y of B, A and then Z of X, Y, where each demands the opposite order. Catching that at definition time is a real advantage of computing the MRO once per class.*

*For arguments in cooperative inheritance, the pattern is that every class accepts kwargs, consumes the keywords it owns, and forwards the rest with super init of kwargs, and the chain terminates at object, which accepts nothing extra. Three ways it breaks. Fixed positional signatures are brittle rather than impossible: they work only while every class happens to accept what the previous one forwards, so adding a required parameter to a class further along the MRO breaks the class before it, which has no way to know about it. A class that forwards a keyword it has already consumed reaches object's init, which complains that it takes exactly one argument without naming the keyword, so the debugging move is to print kwargs at each hop. And any class that does not forward at all truncates the chain silently.*

*If they want the comparison, C++ prints A, B, A, C, D and constructs A twice, because a D contains two complete A subobjects, one through B and one through C. Sizeof D confirms it, and an unqualified reference to an inherited A member is ambiguous and will not compile. Marking the inheritance virtual gives one shared A, printing A, B, C, D, constructed by the most-derived class. So Python shares the base by default and C++ duplicates it unless told otherwise. The order is reversed too, and that is about where the print sits rather than about the MRO: Python's classes print and then delegate, while C++ constructs bases before the derived body runs. Swap the two statements in every Python class and you get A, C, B, D with exactly the same MRO."*
