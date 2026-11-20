---
id: 4-builder-pattern-implementation
title: "Builder: Staged Construction and Atomic Validation"
description: "The real problem is not too many parameters, it is that you cannot check a rule across fields until you have them all, and a frozen dataclass already solves most of it"

sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Builder pattern, why would you use it over telescoping constructors, and how does it guarantee immutability? Demonstrate a fluent Python implementation building an immutable User profile with atomic validation at build() time, and contrast it with Python dataclasses and the GoF Director pattern."

---

### Picture it

Filling in a form that cannot be submitted until it is complete, and cannot be altered once it is.

**The form is the interesting part, not the pen.** A naive constructor is a single question asked once: give me everything, now, in the right order. That works when there are three things and fails in two distinct ways when there are twelve, and the two failures are usually run together when they should be separated.

**The first failure is about reading.** `User("Ada", "ada@x.com", 36, True, False, None, "en-GB", True)` tells a reader nothing. Which boolean is which? What is the `None` for? The language with the problem is the one where arguments are positional, and the fix is to name them.

**The second failure is about timing, and it is the one the pattern is really for.** Suppose the rule is "a user with a postal address must have a country, and a user in the EU must have consented to data processing". **You cannot check that rule when the country arrives, because consent has not arrived yet.** You cannot check it when consent arrives either, because you do not know whether this is the last field. The rule is about the whole form, so it can only be checked when the form is declared finished.

That gives you the shape of the problem. You need somewhere to put partial, not-yet-valid data; you need a moment that means "I am done"; and you need the finished object to be unalterable afterwards, so nobody can route around the check by assigning to a field later. **Three requirements, and a constructor satisfies none of them**, because it has no concept of partial and no moment of completion separate from existence.

So the Builder is a mutable thing that becomes an immutable thing. The mutable half collects, the transition validates, the immutable half is safe to hand out.

And now the part worth being honest about in Python, because most treatments skip it. **Python has keyword arguments, so the reading problem does not exist here.** It has frozen dataclasses, so immutability is one decorator. It has `__post_init__`, so whole-object validation happens at construction. Between them those three features cover most of what a Builder is usually introduced to provide, and **the Builder earns its place only when construction genuinely happens in stages across different call sites** or when the partial object has to be passed around before it is complete. If everything is known at one call site, a frozen dataclass is the better answer and saying so is the stronger response.

---

### The proper terms

#### The problem being named

The **telescoping constructor** anti-pattern is a family of overloads of increasing length, `User(name)`, `User(name, email)`, `User(name, email, age)`, each delegating to the next. It is a Java workaround for the absence of default and keyword arguments, and Python does not have it, because one signature with defaults covers every case.

What Python does still have is the positional argument readability problem, where a long call becomes a row of unlabelled literals, and the cross-field validation problem, which no amount of argument syntax solves.

#### The pattern's parts

The **builder** is a mutable object that accumulates configuration. The **product** is the immutable object it produces. The build method is the transition between them, and it is where validation belongs.

A **fluent interface** has each setter return `self`, so calls chain. That is a convenience rather than part of the pattern; the alternative is plain setters with the same semantics.

The **Director**, in the GoF formulation, is a separate object that knows a **construction recipe**: it drives a builder through a fixed sequence of steps to produce a standard configuration. The builder knows **how** to set each field, the director knows **which** fields a particular kind of product needs. It is the part of the pattern most often dropped, and dropping it is usually right.

#### What immutability requires

**Atomic validation** means the object is either fully valid or does not exist. The build method validates everything and then constructs, so there is no window in which a half-checked object is reachable.

For that guarantee to hold the product must actually be immutable, and in Python that means more than convention:

**`@dataclass(frozen=True)`** makes `__setattr__` raise `FrozenInstanceError`. It also makes the class hashable by default, since it can rely on its fields not changing.

**`__post_init__`** runs after the generated `__init__` has assigned the fields, which is the only place a frozen dataclass can validate across them.

**`frozen=True` already blocks new attributes too**, which is worth knowing because it is usually described as only protecting declared fields. Its generated `__setattr__` rejects *every* assignment, so `user.nickname = "A"` raises `FrozenInstanceError` just as `user.age = 37` does.

**`slots=True`** is therefore about memory and typo-catching on *mutable* classes, not about safety on frozen ones. And combining the two has a sharp edge: on CPython 3.10, `@dataclass(frozen=True, slots=True)` turns an assignment to an undeclared attribute into a confusing `TypeError: super(type, obj): obj must be an instance or subtype of type`, because adding slots rebuilds the class while the frozen `__setattr__` still closes over the original. The behaviour is version-dependent, so **prefer `frozen=True` on its own unless you have measured a memory problem.**

Two honest limits worth stating because an interviewer may probe them. **Frozen is shallow**: a frozen dataclass holding a list still allows `user.tags.append("x")`, so immutable containers such as a tuple or `frozenset` are needed for a real guarantee. And **frozen is not security**: `object.__setattr__(user, "age", 99)` still works, so this prevents mistakes rather than attacks.

#### The alternatives in Python

**Keyword-only arguments**, via `def __init__(self, *, name, email)` or `@dataclass(kw_only=True)`, force every call to label its arguments and remove the readability problem entirely.

**`dataclasses.replace`** produces a modified copy of a frozen instance, which is how you "change" an immutable object: you do not, you derive a new one.

**`classmethod` constructors** such as `User.from_json` cover the "several ways to make one" case that factories and builders are sometimes stretched to serve.

---

### In code

#### What the problem actually looks like

```python
# unreadable, and in Java you would also have six overloads of this
user = User("Ada", "ada@example.com", 36, True, False, None, "en-GB", True)
```

Python fixes the reading half immediately, and this is the first thing to say:

```python
user = User(
    name="Ada",
    email="ada@example.com",
    age=36,
    newsletter=True,
    beta_optin=False,
    referrer=None,
    locale="en-GB",
    gdpr_consent=True,
)
```

**That is the telescoping constructor problem solved by the language.** What it does not solve is the rule that spans fields: a user with a postal address needs a country, and an EU user needs consent. No argument syntax can check that, because the check needs all the arguments at once.

#### The frozen dataclass, which is the right default

```python
from dataclasses import dataclass, field, replace


@dataclass(frozen=True, kw_only=True)
class User:
    name: str
    email: str
    age: int = 0
    locale: str = "en-GB"
    address: str | None = None
    country: str | None = None
    gdpr_consent: bool = False
    tags: tuple[str, ...] = ()          # tuple, not list: frozen is shallow

    def __post_init__(self) -> None:
        """Runs after every field is assigned: the only place to check
        a rule that spans fields."""
        errors = []
        if "@" not in self.email:
            errors.append("email must contain @")
        if self.age < 0:
            errors.append("age must not be negative")
        if self.address and not self.country:
            errors.append("an address requires a country")
        if self.country in {"DE", "FR", "IE"} and not self.gdpr_consent:
            errors.append(f"{self.country} requires gdpr_consent")
        if errors:
            raise ValueError("; ".join(errors))
```

**All three requirements are met and there is no builder.** `kw_only` forces labelled arguments, `frozen` makes every assignment raise, including to attributes that were never declared, and `__post_init__` validates across fields atomically: the object either exists fully valid or does not exist at all.

Note the absence of `slots=True`. It would save memory, and on CPython 3.10 it also replaces a clear `FrozenInstanceError` with a confusing `TypeError` when someone assigns an undeclared attribute, so it is not free.

Note the collected `errors` list rather than raising on the first problem. **Reporting every violation at once is a real usability difference** when a caller is fixing a config file, and it costs three lines.

And to "modify" one:

```python
older = replace(user, age=37)      # a new instance, re-validated
user is older                      # False
```

`dataclasses.replace` re-runs `__init__` and therefore `__post_init__`, so a derived object cannot skip validation either.

#### When a builder does earn its place

The frozen dataclass requires every field at one call site. A builder is for when they arrive in stages, from different places, and the partial thing must be passed around:

```python
from dataclasses import dataclass
from typing import Self


class UserBuilder:
    """Mutable while incomplete; produces an immutable, validated product."""

    def __init__(self) -> None:
        self._fields: dict = {}

    # each setter returns self, so calls chain: a fluent interface
    def named(self, name: str) -> Self:
        self._fields["name"] = name
        return self

    def emailed(self, email: str) -> Self:
        self._fields["email"] = email
        return self

    def living_at(self, address: str, country: str) -> Self:
        self._fields["address"] = address
        self._fields["country"] = country
        return self

    def consented(self, consent: bool = True) -> Self:
        self._fields["gdpr_consent"] = consent
        return self

    def build(self) -> User:
        """The transition. Validation lives in User.__post_init__, so it
        cannot be bypassed by constructing a User directly."""
        missing = {"name", "email"} - self._fields.keys()
        if missing:
            raise ValueError(f"missing required fields: {sorted(missing)}")
        return User(**self._fields)


# the staged case the pattern is actually for
builder = UserBuilder().named("Ada").emailed("ada@example.com")

# ... passed to another layer, which knows about addresses
builder.living_at("1 Rue de Rivoli", "FR")

# ... and another, which knows about consent
builder.consented(True)

user = builder.build()
```

Two design points that are easy to get wrong.

**The validation lives in the product, not the builder.** If `build()` did the checking, anyone calling `User(...)` directly would bypass it, and the guarantee would be a convention rather than a property. The builder checks only that required fields are *present*; the product checks that the values are *coherent*.

**`build()` can be called more than once**, and you have to decide what that means. Here each call constructs a fresh product from the current fields, which is usually what you want. The alternative, invalidating the builder after one build, prevents a caller accidentally sharing mutable builder state between two products, and is worth doing if the builder is long-lived.

#### The Director, and why it is usually dropped

```python
class UserDirector:
    """Knows recipes. The builder knows HOW to set a field; the director
    knows WHICH fields a particular kind of user needs."""

    @staticmethod
    def eu_trial_user(builder: UserBuilder, name: str, email: str) -> User:
        return (builder
                .named(name)
                .emailed(email)
                .living_at("unknown", "DE")
                .consented(True)
                .build())
```

**In Python this is a function**, and calling it a Director adds a word rather than a capability. The GoF needed an object because Java had no module-level functions, and the useful idea underneath, that standard configurations should be named and reusable, is better expressed as a `classmethod` on the product:

```python
@dataclass(frozen=True, kw_only=True)
class User:
    ...

    @classmethod
    def eu_trial(cls, *, name: str, email: str) -> "User":
        return cls(name=name, email=email, country="DE", gdpr_consent=True)
```

`User.eu_trial(name=..., email=...)` reads better than a director, is discoverable from the class, and still cannot skip validation.

#### Verify it

```python
"""
Builder: what a frozen dataclass already gives you, where a builder
still earns its place, and the two honest limits of frozen.
"""
from dataclasses import dataclass, replace, FrozenInstanceError, fields
from typing import Optional


@dataclass(frozen=True, kw_only=True)
class User:
    name: str
    email: str
    age: int = 0
    address: Optional[str] = None
    country: Optional[str] = None
    gdpr_consent: bool = False
    tags: tuple = ()

    def __post_init__(self):
        errors = []
        if "@" not in self.email:
            errors.append("email must contain @")
        if self.age < 0:
            errors.append("age must not be negative")
        if self.address and not self.country:
            errors.append("an address requires a country")
        if self.country in {"DE", "FR", "IE"} and not self.gdpr_consent:
            errors.append(f"{self.country} requires gdpr_consent")
        if errors:
            raise ValueError("; ".join(errors))

    @classmethod
    def eu_trial(cls, *, name, email):
        return cls(name=name, email=email, country="DE", gdpr_consent=True)


class UserBuilder:
    def __init__(self):
        self._fields = {}

    def named(self, name):
        self._fields["name"] = name
        return self

    def emailed(self, email):
        self._fields["email"] = email
        return self

    def living_at(self, address, country):
        self._fields.update(address=address, country=country)
        return self

    def consented(self, consent=True):
        self._fields["gdpr_consent"] = consent
        return self

    def build(self):
        missing = {"name", "email"} - self._fields.keys()
        if missing:
            raise ValueError(f"missing required fields: {sorted(missing)}")
        return User(**self._fields)          # product validates coherence


if __name__ == "__main__":
    print("-- keyword arguments already solve the readability problem")
    u = User(name="Ada", email="ada@example.com", age=36)
    print(f"   {u}")
    print(f"   kw_only, so positional calls are rejected:")
    try:
        User("Ada", "ada@example.com")
    except TypeError as e:
        print(f"     TypeError: {str(e)[:60]}")

    print("\n-- frozen gives immutability")
    try:
        u.age = 37
    except FrozenInstanceError:
        print("   u.age = 37 -> FrozenInstanceError")
    print(f"   hashable, because the fields cannot change: {hash(u) != 0}")

    print("\n-- frozen blocks UNDECLARED attributes too, not just fields")
    try:
        u.nickname = "A"
    except FrozenInstanceError:
        print("   u.nickname = 'A' -> FrozenInstanceError")
    print("   so frozen alone is enough; slots is about memory, not safety")

    print("\n-- and frozen + slots has a sharp edge worth knowing")
    for label, kw in (("frozen only", dict(frozen=True)),
                      ("slots only", dict(slots=True)),
                      ("frozen + slots", dict(frozen=True, slots=True))):
        @dataclass(**kw)
        class Probe:
            x: int = 1

        pr = Probe()
        try:
            pr.undeclared = 1
            got = "allowed"
        except Exception as exc:
            got = f"{type(exc).__name__}"
        print(f"   {label:<16} undeclared attr -> {got}")
    print("   on CPython 3.10 the combination degrades a clear")
    print("   FrozenInstanceError into a confusing TypeError from super(),")
    print("   because adding slots rebuilds the class while the frozen")
    print("   __setattr__ still closes over the original. Version-dependent,")
    print("   so prefer frozen alone unless memory has been measured.")

    print("\n-- __post_init__ validates ACROSS fields, atomically")
    cases = [
        ("bad email", dict(name="X", email="nope")),
        ("negative age", dict(name="X", email="x@y.z", age=-1)),
        ("address without country",
         dict(name="X", email="x@y.z", address="1 Main St")),
        ("EU without consent",
         dict(name="X", email="x@y.z", address="1 Rue", country="FR")),
        ("several at once", dict(name="X", email="nope", age=-1)),
    ]
    for label, kw in cases:
        try:
            User(**kw)
            print(f"   {label:<26} -> accepted (unexpected)")
        except ValueError as e:
            print(f"   {label:<26} -> rejected: {e}")
    print("   note the last one reports BOTH problems: collecting errors")
    print("   costs three lines and saves a caller a round trip")
    print("   and the object never exists in a half-checked state")

    print("\n-- replace() derives a new object and re-validates")
    older = replace(u, age=37)
    print(f"   replace(u, age=37) -> age {older.age}, "
          f"same object? {u is older}")
    try:
        replace(u, age=-5)
    except ValueError as e:
        print(f"   replace(u, age=-5) -> rejected: {e}")
    print("   so a derived object cannot skip validation either")

    print("\n-- the two honest limits of frozen")
    boxed = User(name="X", email="x@y.z", tags=("a",))
    print(f"   frozen is SHALLOW: tags is a tuple here, so immutable.")
    print(f"     had it been a list, user.tags.append('x') would work")
    object.__setattr__(u, "age", 99)
    print(f"   frozen is NOT security: object.__setattr__ set age to "
          f"{u.age}")
    object.__setattr__(u, "age", 36)
    print("     it prevents mistakes, not attacks")

    print("\n-- where a builder still earns its place: STAGED construction")
    b = UserBuilder().named("Ada").emailed("ada@example.com")
    print(f"   layer 1 set name and email")
    b.living_at("1 Rue de Rivoli", "FR")
    print(f"   layer 2 added an address, in another call site")
    b.consented(True)
    print(f"   layer 3 added consent, in a third")
    built = b.build()
    print(f"   build() -> {built.name}, {built.country}, "
          f"consent={built.gdpr_consent}")
    print("   no single call site knew every field, which is the case a")
    print("   frozen dataclass cannot express")

    print("\n-- the builder checks PRESENCE, the product checks COHERENCE")
    try:
        UserBuilder().named("Ada").build()
    except ValueError as e:
        print(f"   missing field caught by builder : {e}")
    try:
        UserBuilder().named("Ada").emailed("nope").build()
    except ValueError as e:
        print(f"   bad value caught by the product : {e}")
    print("   validation lives in the product, so constructing a User")
    print("   directly cannot bypass it. If build() did the checking, the")
    print("   guarantee would be a convention rather than a property.")

    print("\n-- the Director is a classmethod in Python")
    trial = User.eu_trial(name="Ada", email="ada@example.com")
    print(f"   User.eu_trial(...) -> country={trial.country}, "
          f"consent={trial.gdpr_consent}")
    print(f"   named recipe, discoverable on the class, still validated")
    print(f"   fields on the product: "
          f"{[f.name for f in fields(User)]}")
```

---

### What they ask next

**"Does Python have the telescoping constructor problem?"**
No, and saying so is the right opening. **Telescoping constructors are a Java workaround for the absence of default and keyword arguments**, and one Python signature with defaults covers every case. What Python still has is the readability problem of a long positional call, which `kw_only=True` or `*` in the signature removes by forcing every argument to be labelled.

**"Then what is the Builder actually for?"**
**Cross-field validation and staged construction.** A rule like "an address requires a country, and an EU country requires consent" cannot be checked as each field arrives, because you do not know which field is last. The rule is about the whole object, so it can only be checked at a declared moment of completion, and a constructor has no concept of partial state or of completion separate from existence.

**"How much of that does a frozen dataclass give you?"**
Nearly all of it, for the single-call-site case. `kw_only` forces labelled arguments, `frozen=True` makes mutation raise `FrozenInstanceError`, `slots=True` stops new attributes appearing, and **`__post_init__` runs after every field is assigned**, which is exactly the whole-object validation point. The object either exists fully valid or does not exist, which is atomic validation with no builder involved.

**"So when does a builder still earn its place?"**
When construction is genuinely **staged across call sites**: one layer knows the name, another adds the address, a third adds consent, and the partial object must be passed between them. A frozen dataclass cannot express that, because it needs every field at once. Also when the same partial configuration is reused to produce several variants.

**"Where should the validation live, in `build()` or in the product?"**
**In the product.** If `build()` validates, anyone calling `User(...)` directly bypasses it and the guarantee becomes a convention rather than a property. The clean division is that the builder checks **presence** of required fields and the product checks **coherence** of values, which also means `dataclasses.replace` cannot produce an invalid derived object.

**"Is `frozen=True` real immutability?"**
It is enough to prevent mistakes and not enough to prevent determined circumvention, and both limits are worth naming. First, a detail usually got wrong: **frozen blocks undeclared attributes too**, not just declared fields, because its `__setattr__` rejects every assignment, so `user.nickname = "A"` raises as well. **Frozen is shallow**: a frozen dataclass holding a list still permits `user.tags.append("x")`, so you need a tuple or `frozenset` for a genuine guarantee. And **frozen is not security**: `object.__setattr__(user, "age", 99)` still works, because `frozen` is implemented as a `__setattr__` that raises.

**"How do you change an immutable object?"**
You do not; you derive a new one with **`dataclasses.replace`**, which re-runs `__init__` and therefore `__post_init__`, so the derived object is re-validated. That is the general shape of working with immutable values: mutation becomes a function from old value to new value.

**"What is the Director and do you need it?"**
The Director is a separate object holding a **construction recipe**: it drives the builder through a fixed sequence to produce a standard configuration. The builder knows **how** to set fields, the director knows **which** fields a given kind of product needs. **In Python it is a function**, and the better expression is a `classmethod` on the product, such as `User.eu_trial(...)`: it names the recipe, is discoverable from the class, and cannot skip validation. The GoF needed an object because Java had no module-level functions.

**"Should `build()` be callable twice?"**
It is a design decision you should state rather than leave implicit. Returning a fresh product each time is usually what callers expect and is fine. Invalidating the builder after one build prevents a caller accidentally sharing mutable builder state between two products, which matters if the builder is long-lived or handed between layers.

**"Why collect errors instead of raising on the first one?"**
Because a caller fixing a configuration file wants every violation at once rather than discovering them one run at a time. It costs about three lines, and it is one of those small choices that separates code written for a user from code written for a validator.

**"What about attrs or Pydantic?"**
Both do this better than hand-written code in a real project. **Pydantic** gives validation, coercion and error aggregation with field-level and model-level validators, which is exactly the shape of this problem, and `attrs` gives frozen classes with validators and converters. The reason to know the manual version is to understand what they are doing and to be able to justify the dependency.

**The common wrong answer** is motivating the Builder with the telescoping constructor, which Python does not have, instead of with cross-field validation and staged construction. Next is putting the validation in `build()`, which leaves the product constructible in an invalid state. Third is claiming `frozen=True` is deep immutability, when a contained list is still mutable. And last is reproducing the Director as a class in Python, when a `classmethod` on the product says the same thing with less apparatus.

---

### Say this in the interview

*"I would start by separating two problems that usually get run together, because Python solves one of them and not the other.*

*The first is readability: User of a name, an email, an age and four unlabelled booleans tells a reader nothing. That is the telescoping constructor problem, and I would point out that Python does not really have it. Telescoping constructors are a Java workaround for not having default and keyword arguments. One Python signature with defaults covers every case, and kw_only equals True, or a bare star in the signature, forces every call to label its arguments and removes the readability problem entirely.*

*The second problem is the one the Builder is actually for, and it is about timing. Suppose the rule is that a user with a postal address must have a country, and a user in the EU must have consented to data processing. I cannot check that when the country arrives, because consent has not arrived yet, and I cannot check it when consent arrives either, because I do not know whether that is the last field. The rule is about the whole object, so it can only be checked at a declared moment of completion. So I need somewhere to hold partial, not-yet-valid data, a moment that means I am done, and an unalterable result afterwards so nobody routes around the check by assigning to a field later. A constructor satisfies none of those, because it has no concept of partial state and no moment of completion separate from existence.*

*But before reaching for a builder I would say how much a frozen dataclass already gives me. kw_only forces labelled arguments, frozen equals True makes every assignment raise FrozenInstanceError, including to attributes that were never declared, which is worth knowing because frozen is usually described as only protecting declared fields, and `__post_init__` runs after every field has been assigned, which is exactly where a rule spanning fields belongs. So the object either exists fully valid or does not exist at all, which is atomic validation with no builder in sight. I would also collect the errors into a list rather than raising on the first, because a caller fixing a config file wants all the violations at once, and that costs three lines. And to change one, `dataclasses.replace` derives a new instance and re-runs `__post_init__`, so a derived object cannot skip validation either.*

*Where a builder does earn its place is staged construction: when one layer knows the name and email, another adds the address, a third adds consent, and the partial thing has to be passed between them. A frozen dataclass cannot express that because it needs every field at one call site. A fluent interface, where each setter returns self so calls chain, is a convenience on top of that rather than part of the pattern.*

*Two design points I would make about the builder. The validation belongs in the product, not in build(). If build() did the checking, anyone constructing a User directly would bypass it and the guarantee would be a convention rather than a property. The clean division is that the builder checks presence of required fields and the product checks coherence of values. And whether build() can be called twice is a decision to state rather than leave implicit: returning a fresh product each time is usually what callers expect, while invalidating the builder afterwards stops someone accidentally sharing mutable builder state between two products.*

*On immutability I would give both honest limits. Frozen is shallow: a frozen dataclass holding a list still allows tags.append, so I would use a tuple or a frozenset for a real guarantee. And frozen is not security, because it is implemented as a `__setattr__` that raises, so object dot `__setattr__` still gets through. It prevents mistakes, not attacks.*

*One implementation detail I would mention if we got that far: I would not reach for slots equals True on a frozen dataclass by reflex. Frozen already rejects undeclared attributes, so slots adds nothing to safety, and on CPython 3.10 the combination turns that clear FrozenInstanceError into a confusing TypeError from super, because adding slots rebuilds the class while the frozen `__setattr__` still closes over the original. It is version-dependent, so slots is for when memory has actually been measured.*

*On the Director: in the GoF formulation it is a separate object that knows a construction recipe, driving the builder through a fixed sequence for a standard configuration, so the builder knows how to set a field and the director knows which fields a kind of product needs. In Python that is a function, and the better expression is a classmethod on the product, like User.eu_trial. It names the recipe, it is discoverable from the class, and it still cannot skip validation. The GoF needed an object because Java had no module-level functions.*

*And in a real project I would reach for Pydantic or attrs rather than hand-rolling this, since field-level and model-level validators with error aggregation are precisely the shape of this problem. The reason to know the manual version is to understand what those libraries are doing and to be able to justify the dependency."*
