---
id: 2-factory-pattern
title: "Factories: Simple, Factory Method and Abstract Factory"
description: "All three answer the same question at three granularities, and in Python a dict of classes is already a factory, so the registry replaces the conditional"

sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the architectural difference between Simple Factory, Factory Method, and Abstract Factory? When would you use each, how do you eliminate hardcoded `if-elif` statements using a Dynamic Registry in Python, and what are the tradeoffs?"

---

### Picture it

A kitchen where the waiter is not allowed to know how anything is cooked.

The waiter takes "one soup" and hands back soup. **What the waiter must not do is decide which pan to use.** The moment a waiter contains the sentence "if it is soup, get the stockpot; if it is steak, get the griddle", two things have gone wrong at once: the waiter now has to be retrained whenever a dish is added, and the waiter now knows things that have nothing to do with waiting.

**Every factory pattern is one answer to that, and the question they all answer is the same:** how does code get an object without naming the object's class? Because naming the class is what welds the two together. Write `pan = Stockpot()` and the waiter now depends on `Stockpot` existing, being constructible, and being the right choice, forever.

The three patterns differ only in **how much is being varied**, and that is the whole taxonomy.

**Vary one dish.** You want soup or steak depending on a string that arrives at runtime. Something has to map the string to a class, and the only real question is whether that something is a chain of conditionals you edit by hand or a table that dishes add themselves to.

**Vary who decides, per kitchen.** The recipe for serving a meal is identical everywhere: plate it, garnish it, carry it. But the Italian kitchen makes pasta and the Japanese kitchen makes ramen. So you write the serving procedure once and leave a hole where the dish gets made, and **each kitchen fills the hole**. The procedure never names a dish.

**Vary a whole matched set.** Now the Italian kitchen must produce an Italian starter, an Italian main **and** an Italian dessert, and the one thing you must never do is serve an Italian starter with a Japanese dessert. The products are not independent; they have to match. So you hand out one object whose job is to produce the entire consistent family, and **the guarantee you are buying is compatibility between products**, not convenience in creating them.

That third one is the distinction people blur, and it is worth holding on to: **Factory Method is about who decides, and Abstract Factory is about keeping a set consistent.** If your products do not need to match each other, you do not want an Abstract Factory, however many of them there are.

And then the Python note, which changes what the answer should look like. **Classes in Python are ordinary objects.** You can put one in a dictionary, pass it to a function, return it. So a dictionary mapping a name to a class already does everything Simple Factory does, and the conditional chain the question asks about is not a pattern problem but a symptom of writing Java in Python.

---

### The proper terms

#### The common purpose

All three patterns move the choice of concrete class out of the code that uses the object. The vocabulary is shared:

A **product** is the thing being created; a **concrete product** is a particular class of it. A **creator** is whatever does the creating. The **client** is the code that wants a product and should not name its class.

Two principles are being served, and naming them correctly matters because they are different.

The **Open/Closed Principle** says you should be able to add behaviour without editing existing code. A conditional chain violates it directly: adding a product means editing the chain.

**Dependency inversion** says high-level code should depend on abstractions rather than concretions. A client that names `Stockpot` depends on a concretion; a client that receives something satisfying an interface does not.

#### Simple Factory

A single function or method that takes a parameter and returns a concrete product. **It is not a Gang of Four pattern**, which is worth saying because interviewers sometimes ask for "the three GoF factories" to see whether you know there are only two. It is an idiom, sometimes called a **parameterised factory**.

Its weakness in the naive form is the **conditional chain**: a cascade of `if-elif` that must be edited for every new product.

The fix is a **dynamic registry**: a mapping from key to class that products add themselves to, usually through a decorator evaluated at import time. The factory then performs a lookup and never changes.

#### Factory Method

The GoF pattern where **a class defers instantiation to its subclasses**. A base class contains an algorithm with a hole in it, declares an abstract creation method, and calls that method where a product is needed. Each subclass overrides it.

The key property: **the base class never names a concrete product**, and the decision of which product to make is bound to **which subclass you instantiated**. It is a compile-time decision expressed through inheritance, and the client chooses a product by choosing a creator.

This is the pattern behind the template method relationship: the invariant algorithm lives in the base, the varying step is the factory method.

#### Abstract Factory

The GoF pattern where **one object creates a family of related products**. The interface declares a creation method per product type, and each concrete factory implements all of them consistently.

The guarantee is product compatibility: because one factory makes all of them, you cannot accidentally combine a widget from one family with a widget from another. That guarantee, not the creation convenience, is the reason to use it.

Its documented cost is the rigidity of the product set: adding a new product type means adding a method to the abstract factory interface and therefore editing every concrete factory. Abstract Factory is open to new **families** and closed to new **product types**, which is exactly the opposite of what people usually assume.

#### The axis that separates them

| | Varies | Mechanism | Decided by |
| :--- | :--- | :--- | :--- |
| **Simple Factory** | which product | a lookup or conditional | a runtime argument |
| **Factory Method** | which product | **inheritance** | which subclass exists |
| **Abstract Factory** | a whole family | **composition** | which factory object you hold |

**Factory Method uses inheritance and Abstract Factory uses composition.** That one line is the cleanest way to separate them, and it also explains the costs: inheritance binds the choice at class-definition time, composition lets you swap the factory at runtime.

---

### In code

#### The problem: a conditional chain

```python
class ParserFactory:
    def create(self, kind: str):
        if kind == "json":
            return JsonParser()
        elif kind == "xml":
            return XmlParser()
        elif kind == "csv":
            return CsvParser()
        raise ValueError(f"unknown parser: {kind}")
```

This already does the main job: the client says `factory.create("json")` and never names `JsonParser`. The remaining fault is narrower than it is usually described. **It is not that conditionals are bad; it is that this one is in the wrong place.** Adding a parser requires editing a file that has nothing to do with the new parser, and that file is in a different package, probably owned by a different team, and every edit to it risks everything that already worked.

#### The fix: a dynamic registry

```python
from typing import Callable, Dict, Type

_REGISTRY: Dict[str, Type["Parser"]] = {}


def register(name: str) -> Callable[[type], type]:
    """Class decorator: records the class under a key at import time."""
    def decorate(cls: type) -> type:
        if name in _REGISTRY:
            raise ValueError(f"parser {name!r} already registered")
        _REGISTRY[name] = cls
        return cls
    return decorate


def create_parser(kind: str) -> "Parser":
    try:
        return _REGISTRY[kind]()
    except KeyError:
        raise ValueError(
            f"unknown parser {kind!r}; known: {sorted(_REGISTRY)}"
        ) from None


# --- in some other module, which the factory has never heard of ---

@register("json")
class JsonParser:
    def parse(self, text: str) -> dict:
        ...


@register("xml")
class XmlParser:
    def parse(self, text: str) -> dict:
        ...
```

**The factory function is now finished forever.** Adding a parser means writing a class in its own file with one decorator on it, and the registry fills in at import time. Nothing in the factory's file changes, which is the Open/Closed Principle satisfied rather than discussed.

Three details that distinguish a real registry from a sketch.

**Reject duplicate keys.** Without the check, two modules registering `"json"` silently produce whichever imported last, which is an order-dependent bug of the worst kind.

**List the known keys in the error.** `unknown parser 'jsn'; known: ['csv', 'json', 'xml']` saves the next person a grep.

**Be aware of the import-time dependency**, which is the registry's one genuine weakness. A class only registers itself if its module is imported, so a plug-in that nobody imports is invisible. Real systems solve this with explicit imports in a package `__init__`, or with **entry points** via `importlib.metadata` so that installed packages advertise themselves.

#### Factory Method: the subclass decides

```python
from abc import ABC, abstractmethod


class Report(ABC):
    """The invariant algorithm, with a hole where the renderer goes."""

    def publish(self, rows: list) -> bytes:
        renderer = self.make_renderer()        # <- the factory method
        body = renderer.render(rows)
        return self.sign(body)

    @abstractmethod
    def make_renderer(self) -> "Renderer":
        ...

    def sign(self, body: bytes) -> bytes:
        return body + b"\n-- generated by reporting service"


class PdfReport(Report):
    def make_renderer(self):
        return PdfRenderer(dpi=300)


class CsvReport(Report):
    def make_renderer(self):
        return CsvRenderer(delimiter=",")
```

**`Report.publish` names no renderer**, and it never will. The sequence of steps is written once; the one varying step is delegated upward to whoever subclassed. The client chooses a renderer by choosing `PdfReport` over `CsvReport`, which is the characteristic shape: **you select a product by selecting a creator.**

Note what this buys over the registry. The registry varies *one* product by key. Factory Method varies the product **together with an algorithm that surrounds it**, so the subclass can also override `sign`, add validation, or change the order. That is the reason to prefer it over a lookup: there is more varying than just the class name.

#### Abstract Factory: keeping a family consistent

```python
from abc import ABC, abstractmethod


class WidgetFactory(ABC):
    """One factory per look-and-feel, producing a matched set."""

    @abstractmethod
    def button(self) -> "Button": ...

    @abstractmethod
    def checkbox(self) -> "Checkbox": ...

    @abstractmethod
    def scrollbar(self) -> "Scrollbar": ...


class MacFactory(WidgetFactory):
    def button(self):    return MacButton()
    def checkbox(self):  return MacCheckbox()
    def scrollbar(self): return MacScrollbar()


class WindowsFactory(WidgetFactory):
    def button(self):    return WinButton()
    def checkbox(self):  return WinCheckbox()
    def scrollbar(self): return WinScrollbar()


def build_dialog(factory: WidgetFactory) -> "Dialog":
    """Cannot produce a mismatched dialog: one factory makes all three."""
    return Dialog(factory.button(), factory.checkbox(), factory.scrollbar())
```

**The guarantee is that `build_dialog` cannot mix families.** It holds one factory, so all three widgets come from the same place, and a Mac button beside a Windows scrollbar is not merely discouraged, it is unexpressible. If the widgets did not need to match, this would be three unrelated registries and an Abstract Factory would be overhead.

And the cost, which is the follow-up question. Adding a **new family**, say `GtkFactory`, is one new class and nothing else changes: open for extension. Adding a **new product type**, say `slider()`, means adding an abstract method and then implementing it in `MacFactory`, `WindowsFactory` and every other concrete factory: **closed for extension in that direction, and every existing factory breaks until updated.** Abstract Factory is open to families and closed to product types, which is the reverse of the usual assumption.

#### The Python version of all three

```python
# Simple Factory: a dict IS a factory. Classes are first-class objects.
PARSERS = {"json": JsonParser, "xml": XmlParser}
parser = PARSERS[kind]()

# Factory Method: pass the callable instead of subclassing for it.
class Report:
    def __init__(self, make_renderer):
        self._make_renderer = make_renderer

    def publish(self, rows):
        return self.sign(self._make_renderer().render(rows))

report = Report(make_renderer=lambda: PdfRenderer(dpi=300))

# Abstract Factory: when the family is fixed, a namespace or module is enough.
import mac_widgets, windows_widgets
theme = mac_widgets if on_mac else windows_widgets
dialog = Dialog(theme.Button(), theme.Checkbox(), theme.Scrollbar())
```

**A module is a perfectly good Abstract Factory**, since it is a namespace of related constructors and swapping the module swaps the whole family consistently. Whether that is better than a class depends on whether the family needs to be chosen per instance or once per process.

The judgement to state out loud: **the class hierarchies exist because Java cannot put a class in a variable.** Python can, so reach for the lightweight form first, and escalate to a class when you need per-instance state, inheritance of surrounding behaviour, or a type the checker can verify.

#### Verify it

```python
"""
Factories: a registry that removes the conditional, Factory Method by
inheritance, Abstract Factory enforcing a consistent family, and the
asymmetry in what each one is open to.
"""
from abc import ABC, abstractmethod
from typing import Dict, Type

# ---------------------------------------------------------------- registry
_REGISTRY: Dict[str, type] = {}


def register(name: str):
    def decorate(cls):
        if name in _REGISTRY:
            raise ValueError(f"{name!r} already registered")
        _REGISTRY[name] = cls
        return cls
    return decorate


def create_parser(kind: str):
    try:
        return _REGISTRY[kind]()
    except KeyError:
        raise ValueError(f"unknown parser {kind!r}; "
                         f"known: {sorted(_REGISTRY)}") from None


@register("json")
class JsonParser:
    def parse(self):
        return "json"


@register("xml")
class XmlParser:
    def parse(self):
        return "xml"


# ------------------------------------------------------------ factory method
class Report(ABC):
    def publish(self, rows):
        return self.sign(self.make_renderer().render(rows))

    @abstractmethod
    def make_renderer(self):
        ...

    def sign(self, body):
        return body + " [signed]"


class PdfRenderer:
    def render(self, rows):
        return f"PDF({len(rows)} rows)"


class CsvRenderer:
    def render(self, rows):
        return f"CSV({len(rows)} rows)"


class PdfReport(Report):
    def make_renderer(self):
        return PdfRenderer()


class CsvReport(Report):
    def make_renderer(self):
        return CsvRenderer()
    def sign(self, body):                 # subclasses vary more than the product
        return body                       # csv is unsigned


# ---------------------------------------------------------- abstract factory
class WidgetFactory(ABC):
    @abstractmethod
    def button(self): ...
    @abstractmethod
    def checkbox(self): ...


def make(family, kind):
    return type(f"{family}{kind}", (), {"family": family, "kind": kind,
                                        "__repr__": lambda s:
                                        f"{s.family}{s.kind}"})


MacButton, MacCheckbox = make("Mac", "Button"), make("Mac", "Checkbox")
WinButton, WinCheckbox = make("Win", "Button"), make("Win", "Checkbox")


class MacFactory(WidgetFactory):
    def button(self):   return MacButton()
    def checkbox(self): return MacCheckbox()


class WinFactory(WidgetFactory):
    def button(self):   return WinButton()
    def checkbox(self): return WinCheckbox()


def build_dialog(factory: WidgetFactory):
    return [factory.button(), factory.checkbox()]


if __name__ == "__main__":
    print("-- Simple Factory as a registry: no conditional, never edited")
    print(f"   registry: { {k: v.__name__ for k, v in _REGISTRY.items()} }")
    print(f"   create_parser('xml').parse() -> "
          f"{create_parser('xml').parse()!r}")
    try:
        create_parser("jsn")
    except ValueError as e:
        print(f"   unknown key lists what IS known: {e}")
    try:
        @register("json")
        class Dup:
            pass
    except ValueError as e:
        print(f"   duplicate key rejected: {e}")
    print("   adding a parser = one class + one decorator, in its own file;")
    print("   the factory function never changes. That is OCP satisfied.")
    print("   the one weakness: a class registers only if its module is")
    print("   imported, so plug-ins need explicit imports or entry points")

    print("\n-- Factory Method: the subclass decides, by inheritance")
    rows = [1, 2, 3]
    for cls in (PdfReport, CsvReport):
        r = cls()
        print(f"   {cls.__name__:<10} publish -> {r.publish(rows)!r}")
    print("   Report.publish names no renderer and never will")
    print("   note CsvReport also overrode sign(): the subclass varies the")
    print("   product AND the algorithm around it, which is why you would")
    print("   choose this over a plain lookup")

    print("\n-- Abstract Factory: the guarantee is a consistent family")
    for f in (MacFactory(), WinFactory()):
        widgets = build_dialog(f)
        fams = {w.family for w in widgets}
        print(f"   {type(f).__name__:<12} -> {widgets}, "
              f"families present: {fams}  "
              f"{'consistent' if len(fams) == 1 else 'MIXED'}")
        assert len(fams) == 1
    print("   build_dialog holds ONE factory, so a mixed dialog is not")
    print("   discouraged, it is unexpressible")

    print("\n-- the asymmetry nobody expects")
    print(f"   {'change':<26}{'Abstract Factory':>18}{'registry':>12}")
    print(f"   {'add a new FAMILY':<26}{'1 new class':>18}"
          f"{'n/a':>12}")
    print(f"   {'add a new PRODUCT TYPE':<26}"
          f"{'edit EVERY factory':>18}{'1 new key':>12}")
    print("   Abstract Factory is open to families, closed to product types,")
    print("   which is the reverse of what people assume")

    print("\n-- and in Python a class is just an object")
    print(f"   type(JsonParser)            = {type(JsonParser).__name__}")
    PARSERS = {"json": JsonParser, "xml": XmlParser}
    print(f"   PARSERS['json']().parse()   = "
          f"{PARSERS['json']().parse()!r}")
    print(f"   callable(JsonParser)        = {callable(JsonParser)}")
    print("   so a dict of classes already is a Simple Factory, and the")
    print("   class hierarchies exist because Java cannot put a class in a")
    print("   variable")
```

---

### What they ask next

**"Are all three Gang of Four patterns?"**
No. **Only Factory Method and Abstract Factory are GoF.** "Simple Factory" is a widely used idiom, sometimes called a parameterised factory, and it is not in the book. Interviewers occasionally ask for "the three GoF factories" precisely to see whether you notice.

**"What is the cleanest way to separate Factory Method from Abstract Factory?"**
**Factory Method uses inheritance; Abstract Factory uses composition.** With Factory Method, the product is decided by which subclass you instantiated, so the choice is bound at class-definition time. With Abstract Factory, the product family is decided by which factory **object** you are holding, so it can be swapped at runtime. The second distinction is what they vary: Factory Method varies **one** product, Abstract Factory varies a **matched set**.

**"When is Abstract Factory actually the right choice?"**
When the products must be **compatible with each other**, not merely when there are several of them. The guarantee you are buying is that a Mac button cannot appear beside a Windows scrollbar, because one factory produced both. If your products are independent, several registries are simpler and an Abstract Factory is pure overhead.

**"What is Abstract Factory's weakness?"**
It is **open to new families and closed to new product types**, which is the reverse of what people assume. A new family is one new class and nothing else changes. A new product type means adding a method to the abstract interface and implementing it in every existing concrete factory, all of which break until updated. So it suits a product set that is stable and a family set that grows.

**"How does a dynamic registry remove the conditional?"**
Products register themselves under a key, usually with a class decorator evaluated at import time, and the factory becomes a dictionary lookup. **Adding a product is a new file with one decorator; the factory's own code never changes again.** That is the Open/Closed Principle satisfied rather than merely cited, and it matters most because the conditional chain usually lives in a different package owned by a different team.

**"What goes wrong with registries?"**
The **import-time dependency**, which is their one real weakness: a class registers only if its module is actually imported, so a plug-in nobody imports is invisible and the failure is a confusing "unknown key" rather than an import error. Real systems fix it with explicit imports in a package `__init__` or with **entry points** via `importlib.metadata`, so installed packages advertise themselves. Two smaller ones: reject duplicate keys, or two modules registering the same name silently resolve by import order, and list the known keys in the error message.

**"If a registry is better, why ever use Factory Method?"**
Because a registry varies only the class, and Factory Method varies the product **together with the algorithm around it**. The base class owns a fixed sequence of steps with a hole in it, and the subclass can fill the hole and also override neighbouring steps. In the example `CsvReport` overrides both `make_renderer` and `sign`. **If the only thing varying is which class to instantiate, a lookup is better; if a surrounding algorithm varies too, inheritance is carrying its weight.**

**"What does Python change about all this?"**
**Classes are ordinary objects**, so a dictionary mapping names to classes already is a Simple Factory, a callable passed into a constructor already is a Factory Method, and a **module is a perfectly good Abstract Factory** since it is a namespace of related constructors. The class hierarchies in the GoF book exist because Java cannot put a class in a variable. Reach for the lightweight form first and escalate when you need per-instance state, inheritance of surrounding behaviour, or a type a checker can verify.

**"Which principle is each one serving?"**
**Open/Closed**, because you add products without editing existing code, and **dependency inversion**, because the client depends on an interface rather than on concrete classes. Worth distinguishing them: a conditional chain in a factory already satisfies dependency inversion for the client, since the client never names a concrete class, and still violates Open/Closed because the chain must be edited. The registry fixes the second without changing the first.

**"Is it worth it for two products?"**
Usually not. A factory is indirection, and indirection costs a reader one hop to find out what is actually constructed. With two products that never change, `JsonParser()` at the call site is clearer than any of this. The patterns earn their keep when the product set grows, when it is extended by code you do not own, or when the choice genuinely arrives at runtime as data.

**The common wrong answer** is describing Abstract Factory as "a factory that makes factories", which is not what it is: it makes a family of related products. Next is claiming the whole point is avoiding `if-elif`, when the real point is that the client stops naming concrete classes, and the conditional is a secondary symptom that a registry removes. Third is presenting Abstract Factory as open to extension in all directions, when adding a product type breaks every concrete factory. And last, in a Python interview, reproducing the Java class hierarchies without mentioning that a dict of classes, a callable or a module already does the job.

---

### Say this in the interview

*"All three answer the same question, which is how code gets an object without naming the object's class, because naming it is what welds the two together. They differ in how much is being varied, and that is the whole taxonomy.*

*Simple Factory varies which product, chosen by a runtime argument. I would note that it is not actually a Gang of Four pattern, only Factory Method and Abstract Factory are; Simple Factory is an idiom, sometimes called a parameterised factory.*

*Factory Method varies which product too, but the decision is bound to which subclass you instantiated, so the mechanism is inheritance. A base class holds an invariant algorithm with a hole in it, declares an abstract creation method, and calls it where a product is needed. The base class never names a concrete product, and the client selects a product by selecting a creator.*

*Abstract Factory varies a whole matched family, and the mechanism is composition: the decision is which factory object you are holding, so it can be swapped at runtime. The cleanest single line to separate the last two is that Factory Method uses inheritance and Abstract Factory uses composition, and the second difference is that one varies a single product where the other varies a consistent set.*

*That word consistent is the part people blur. The reason to use an Abstract Factory is not that there are several products, it is that the products must be compatible with each other. If build_dialog holds one factory, a Mac button beside a Windows scrollbar is not discouraged, it is unexpressible. If the products do not need to match, several registries are simpler and the Abstract Factory is pure overhead.*

*On the conditional chain, I would first be precise about what is wrong with it. The client already stops naming concrete classes, so dependency inversion is satisfied. What is violated is the Open/Closed Principle: adding a parser means editing a file that has nothing to do with the new parser, and in practice that file is in another package owned by another team. The fix is a dynamic registry. Products register themselves under a key with a class decorator evaluated at import time, and the factory becomes a dictionary lookup that never changes again. Adding a parser is one new file with one decorator on it.*

*Three details I would mention because they separate a real registry from a sketch. Reject duplicate keys, or two modules registering the same name silently resolve by import order, which is the worst sort of bug. Put the known keys in the error message, so an unknown key tells you what was available. And be aware of the import-time dependency, which is the registry's genuine weakness: a class only registers if its module is imported, so a plug-in nobody imports is invisible and you get a confusing unknown-key error rather than an import error. Real systems handle that with explicit imports in a package init, or with entry points through importlib.metadata so installed packages advertise themselves.*

*If a registry is that good, why ever use Factory Method? Because a registry varies only the class name. Factory Method varies the product together with the algorithm surrounding it, so the subclass can fill the hole and also override neighbouring steps, like a CSV report overriding both the renderer and whether the output gets signed. If the only thing varying is which class to construct, a lookup is better. If a surrounding algorithm varies too, the inheritance is earning its keep.*

*And Abstract Factory's weakness, which is the follow-up: it is open to new families and closed to new product types, which is the reverse of what people assume. A new family is one new class and nothing else changes. A new product type means adding a method to the abstract interface and implementing it in every existing concrete factory, all of which break until updated. So it suits a stable product set and a growing family set.*

*Finally, what Python changes, because I think this is the answer a Python interview is listening for. Classes are ordinary objects here. You can put a class in a dictionary, pass it to a function, return it. So a dict mapping names to classes already is a Simple Factory; a callable passed into a constructor already is a Factory Method; and a module is a perfectly good Abstract Factory, since it is a namespace of related constructors and swapping the module swaps the family consistently. The class hierarchies in the GoF book exist because Java cannot put a class in a variable. I would reach for the lightweight form first and escalate to classes when I need per-instance state, inheritance of surrounding behaviour, or a type a checker can verify. And with only two products that never change, I would not use any of this: a factory is indirection, and indirection costs the reader a hop to find out what is actually being constructed."*
