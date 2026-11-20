---
id: 5-code-trace-class-vs-instance-attribute-shadowing
title: "Code Trace: Class Attribute against Instance Attribute"
description: "Reading walks a chain and writing never does, so self.count += 1 reads the class and writes the instance, leaving the class untouched"

sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What does each print statement output, and why? Explain how Python resolves attribute lookups through `__dict__`, why assigning to `self` creates variable shadowing, and what happens when using the in-place `+=` operator on class attributes."

```python
class Counter:
    count = 0

    def __init__(self):
        Counter.count += 1

    def reset(self):
        self.count = 0

c1 = Counter()
c2 = Counter()
print(Counter.count)
c1.reset()
print(c1.count)
print(Counter.count)
print(c2.count)
```

**Before you scroll.** Four numbers print. The first is easy. The interesting part is what `reset()` does: it assigns through `self`, and there is a real question about whether that changes the shared value, `c1`'s view of it, or both. Commit to all four numbers, then check `c2`, which never had `reset()` called on it.

<details>
<summary><b>The output, once you have committed to an answer</b></summary>

```text
2
0
2
2
```

`c1.reset()` set `c1.count` to zero and left `Counter.count` at two, so `c2.count` still reads two. One name, two different storage locations, and `reset()` quietly created the second one.

</details>

---

### Picture it

A noticeboard in a shared kitchen, and a sticky note someone puts on their own locker.

**Reading is a search and writing is not.** When you want to know the value, you look at your own locker first, and if there is nothing there you look at the noticeboard. When you want to set the value, you put a note on your own locker. Nobody writes to the noticeboard by accident, because writing has no search step at all.

That asymmetry is the whole question. The two operations look symmetrical in the source, `self.count` on the left of an assignment and `self.count` on the right, and they do completely different things. **One consults a chain of two places; the other always targets the first.**

So `reset()` reads as though it sets the shared counter to zero, and what it actually does is put a note on `c1`'s locker saying zero. The noticeboard is untouched. Anyone who has no note of their own still reads the noticeboard and sees two, which is why `c2` is unaffected and why the bug is invisible until a second object exists.

And now the part that makes this more than a pedantic distinction. **`+=` is a read and a write in one expression.** So `self.count += 1` searches, finds the noticeboard value, adds one, and then writes the result to the locker. The noticeboard never changes, no matter how many times you run it, and every object ends up with its own private note one greater than the shared value. The code in this question dodges that by writing `Counter.count += 1` explicitly, naming the noticeboard on both sides, and the fact that the author had to be explicit is the clue that the shorthand does something else.

A last detail worth holding onto: once a note is on your locker, it hides the noticeboard for you **permanently**, until someone removes the note. There is no automatic reconnection. The shared value can change afterwards and `c1` will never see it.

---

### The proper terms

#### Where attributes live

Every object has a **`__dict__`**, a mapping of its own attribute names to values. A class has one too, holding its methods and its class attributes. An **instance attribute** lives in the instance's `__dict__`; a class attribute lives in the class's.

In this code, `count = 0` written in the class body puts `count` in `Counter.__dict__`, shared by every instance because it is stored once, on the class.

#### How a read resolves

`obj.attr` triggers **`__getattribute__`**, which searches in a defined order:

1. **type data descriptors**, meaning entries in the MRO that define both `__get__` and `__set__`, such as a `property`
2. the **instance `__dict__`**
3. the rest of the **MRO**, that is the class and its bases
4. failing all of that, **`__getattr__`** if the class defines one, otherwise `AttributeError`

Steps 2 and 3 are the ones that matter here: **the instance is consulted before the class**, so an instance attribute shadows a class attribute of the same name.

#### How a write resolves

`obj.attr = value` triggers **`__setattr__`**, and the default implementation does something much simpler: if the type has a **data descriptor** for that name it delegates to the descriptor's `__set__`, and otherwise it writes straight into the **instance `__dict__`**.

**There is no search.** It does not look to see whether a class attribute of that name exists, and finding one would not change anything. That asymmetry between `__getattribute__` and `__setattr__` is the mechanism behind every surprise on this page.

#### Shadowing

**Shadowing** is the condition where an instance attribute hides a class attribute of the same name for that one object. Three properties are worth being precise about:

It is **created by the first write**, not declared anywhere.

It is permanent for that object until the instance attribute is removed with `del obj.attr`, at which point lookups fall through to the class again.

It is **per object**, so one instance shadowing a name tells you nothing about any other instance.

#### Why `+=` is the trap

An augmented assignment is not an atomic mutation. `self.count += 1` compiles to a load, an add and a store, and the load and the store use different rules:

```
LOAD_FAST    self
DUP_TOP
LOAD_ATTR    count      # __getattribute__: searches instance, then class
LOAD_CONST   1
INPLACE_ADD
ROT_TWO
STORE_ATTR   count      # __setattr__: writes the INSTANCE dict
```

So on the first call it reads the **class** attribute and writes an **instance** attribute. The class attribute is never modified, and the instance now shadows it.

This also explains why mutable class attributes behave differently. `self.items.append(x)` is a read followed by a method call, with no store, so it mutates the shared list and every instance sees the change. A mutable class attribute is a well-known trap for exactly the opposite reason to an immutable one: with `+=` on an `int` nothing shared changes, and with `append` on a list everything shared changes.

---

### Why it does that, step by step

| Step | Statement | What happens | `Counter.__dict__` | `c1.__dict__` | `c2.__dict__` | Output |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| 0 | `class Counter` | `count = 0` is stored on the class | `count: 0` | | | |
| 1 | `c1 = Counter()` | `Counter.count += 1` reads and writes the **class** | `count: 1` | `{}` | | |
| 2 | `c2 = Counter()` | same again | `count: 2` | `{}` | `{}` | |
| 3 | `print(Counter.count)` | reads the class directly | `count: 2` | `{}` | `{}` | **2** |
| 4 | `c1.reset()` | `self.count = 0` **writes `c1`'s dict** | `count: 2` | `count: 0` | `{}` | |
| 5 | `print(c1.count)` | instance dict hit, class never consulted | `count: 2` | `count: 0` | `{}` | **0** |
| 6 | `print(Counter.count)` | the class was never touched by step 4 | `count: 2` | `count: 0` | `{}` | **2** |
| 7 | `print(c2.count)` | `c2` has no `count`, so it falls through to the class | `count: 2` | `count: 0` | `{}` | **2** |

**Step 4 is the one that matters.** It reads as "reset the counter" and it means "give this one object a private counter of its own". The class attribute is untouched, which steps 6 and 7 then demonstrate from two directions: reading through the class, and reading through an instance that has no shadow.

Verified against the interpreter at step 7: `c1.__dict__` is `{'count': 0}`, `c2.__dict__` is `{}`, and `Counter.__dict__['count']` is `2`.

#### Why the constructor had to say `Counter.count`

The author wrote `Counter.count += 1` rather than `self.count += 1`, and that is not a style choice. Running the shorthand version:

```python
class K:
    count = 0
    def bump_self(self):
        self.count += 1          # reads the class, writes the instance

a, b = K(), K()
a.bump_self()
```

gives `K.count == 0`, unchanged by the bump, with `a.__dict__ == {'count': 1}`. It read the class value of 0, added one, and stored 1 on the instance. Meanwhile `b.count` still reads 0 from the class, because `b` has no shadow.

**A counter written that way counts nothing**, and it fails silently: every instance reports a plausible number and the shared total never moves.

#### Reconnecting a shadowed attribute

The shadow is permanent until removed, and `del` removes it:

```python
c1.count            # 0, from the instance
del c1.count        # remove the shadow
c1.count            # 2, the class attribute again
del c1.count        # AttributeError: there is nothing left to delete
```

Note the last line: `del` operates on the instance dict only, so deleting twice raises rather than reaching into the class. That is the same read-searches-write-does-not asymmetry seen from a third angle.

#### The mutable mirror image

```python
class Basket:
    items = []                       # shared by every instance

b1, b2 = Basket(), Basket()
b1.items.append("apple")             # a read, then a method call: no store
b2.items                             # ['apple'] -- b2 sees it too
```

Nothing is shadowed here, because there was no assignment. `b1.items` resolves to the class's list and `append` mutates that object in place. **The immutable case surprises you by not sharing and the mutable case surprises you by sharing**, and both come from the same rule. The fix for the mutable case is to assign in `__init__`, `self.items = []`, which creates a genuine per-instance list.

---

### What they ask next

**"Why does `c1.count` print 0 while `Counter.count` prints 2?"**
Because `self.count = 0` inside `reset()` **wrote to `c1`'s own `__dict__`** and never touched the class. Reading `c1.count` then finds the instance entry first and stops, while reading `Counter.count` goes straight to the class, which still holds 2. One name, two storage locations.

**"Why is `c2.count` 2 when `c1.count` is 0?"**
Because shadowing is **per object**. `c2.__dict__` is empty, so its lookup falls through to the class attribute. `c1` has a shadow and `c2` does not, which is also why this class of bug stays hidden until a second instance exists.

**"What is the exact asymmetry between reading and writing?"**
`__getattribute__` **searches**: type data descriptors, then the instance `__dict__`, then the MRO, then `__getattr__`. `__setattr__` **does not search**: unless the type has a data descriptor for the name, it writes straight into the instance `__dict__`. So a read can see a class attribute and a write can never modify one. **Every surprise on this page is that one asymmetry.**

**"Why is `self.count += 1` different from `Counter.count += 1`?"**
Because `+=` compiles to a load, an add and a store, and the two ends obey different rules. `self.count += 1` **reads the class attribute and writes an instance attribute**, so the class value never changes and the object gains a private shadow. `Counter.count += 1` names the class on both sides, so it reads and writes the same location. A counter written the first way counts nothing and does so silently.

**"So why does `self.items.append(x)` affect every instance?"**
Because there is **no store**. It is a read, which resolves to the class's list, followed by a method call that mutates that object in place. No assignment happens, so no shadow is created. **The immutable case surprises by not sharing and the mutable case surprises by sharing**, from the same rule. The fix is `self.items = []` in `__init__`, which creates a real per-instance list.

**"Can you undo a shadow?"**
Yes, with `del c1.count`, after which lookups fall through to the class again. A second `del` raises `AttributeError`, because `del` works on the instance dict only and will not reach into the class. There is no automatic reconnection: while the shadow exists, later changes to the class attribute are invisible to that instance.

**"Where do properties fit in?"**
A `property` is a **data descriptor**, defining both `__get__` and `__set__`, and data descriptors on the type take priority over the instance `__dict__` in both directions. So a property cannot be shadowed by an instance attribute of the same name: the read goes to `__get__` even if the instance dict has an entry, and the write goes to `__set__`. **That is the mechanism for making an attribute behave consistently**, and it is why a read-only property raises `AttributeError` on assignment rather than quietly creating a shadow.

**"What if the class uses `__slots__`?"**
Then instances have no `__dict__` at all, so there is nowhere for a shadow to live. With `__slots__ = ()` and a class attribute `count`, reading `s.count` still works and `s.count = 5` raises `AttributeError: 'S' object attribute 'count' is read-only`. Declaring `__slots__` is therefore one way to turn this entire class of bug into an immediate error, which is a real argument for it beyond the memory saving.

**"What is the legitimate use of a class attribute then?"**
Values genuinely shared and not reassigned per instance: constants, configuration defaults that instances read and do not write, and counters updated explicitly through the class as this code does. **The rule that avoids all of it is that a class attribute an instance might assign should be an instance attribute initialised in `__init__` instead.**

**The common wrong answer** is `2 0 0 0`, from assuming `self.count = 0` resets the shared value. Next is `2 0 2 0`, which gets the class right and then forgets that shadowing is per object, so `c2` is wrongly assumed to be affected. Third is explaining `reset()` as a mistake in this code, when it is a correct demonstration of the rule and the genuinely dangerous version is `self.count += 1`. And last is describing the read and the write as symmetrical operations on one location, which is exactly the belief the output disproves.

---

### Say this in the interview

*"The output is two, zero, two, two.*

*The rule behind all of it is an asymmetry: reading an attribute searches a chain and writing one does not. A read goes through `__getattribute__`, which checks type data descriptors, then the instance `__dict__`, then the rest of the MRO, then `__getattr__`. A write goes through `__setattr__`, which unless the type has a data descriptor for that name writes straight into the instance `__dict__`, with no search at all. So a read can see a class attribute and a write can never modify one.*

*Applying that: count equals zero in the class body is one of the class attributes, stored in Counter's dict and shared because it is stored once on the class. Each constructor does Counter.count plus-equals one, naming the class on both sides, so after two instances the class attribute is two, and the first print gives two.*

*Then c1.reset does self.count equals zero. That reads as resetting the counter, and what it actually does is write a new entry into c1's own dict. The class is untouched. So printing c1.count finds the instance entry first and stops, giving zero; printing Counter.count still gives two; and printing c2.count gives two, because c2's dict is empty so the lookup falls through to the class. If you inspect the dicts at that point, c1's is count colon zero, c2's is empty, and the class still holds two.*

*The point I would emphasise is that an instance attribute shadows the class one, that this shadowing is per object, and that it is created by the first write, not declared anywhere, which is why this class of bug stays invisible until a second instance exists.*

*On the plus-equals question, which I think is the real content: an augmented assignment is not an atomic mutation, it compiles to a load, an add and a store, and the two ends obey different rules. So self.count plus-equals one reads the class attribute and writes an instance attribute. The class value never changes, and the object gains a private shadow one greater than the shared value. A counter written that way counts nothing, and it fails silently, because every instance reports a plausible number while the shared total never moves. That is exactly why the author of this code had to write Counter.count plus-equals one, naming the class on both sides, and the fact that the explicit form was necessary is the clue.*

*The mirror image is worth volunteering: self.items.append of x on a mutable class attribute affects every instance, because there is no store at all. It is a read, which resolves to the class's list, followed by a method call that mutates that object in place, so no shadow is created. So the immutable case surprises you by not sharing and the mutable case surprises you by sharing, from the same rule. The fix there is to assign self.items equals empty list in init, creating a real per-instance list.*

*Two more if they want them. A shadow is permanent until you remove it with del, after which lookups fall through to the class again, and a second del raises AttributeError because del works on the instance dict only. And a property is a data descriptor, defining both get and set, and data descriptors on the type take priority over the instance dict in both directions, so a property cannot be shadowed: the read goes to its getter even if the instance dict has an entry. That is precisely the mechanism for making an attribute behave consistently, and it is why assigning to a read-only property raises instead of quietly creating a shadow. Declaring slots has a similar effect, since instances then have no dict for a shadow to live in, so the bad assignment becomes an immediate AttributeError."*
