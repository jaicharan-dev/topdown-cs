---
id: 4-builder-pattern-implementation
title: "Builder Pattern: Telescoping Constructors, Immutability & Validation"
description: "Master the Builder pattern in Python: solve the telescoping constructor problem, implement atomic validation gates, GoF Directors, and frozen dataclass tradeoffs."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is the Builder pattern, why would you use it over telescoping constructors, and how does it guarantee immutability? Demonstrate a fluent Python implementation building an immutable User profile with atomic validation at build() time, and contrast it with Python dataclasses and the GoF Director pattern."

Look at this constructor call and try to guess what any of these arguments mean without checking the signature:

```python
# Unmaintainable "telescoping" constructor
user = User("Alice", None, None, "555-0192", True, None, "Engineering", None, False)
```

Swap two of those booleans by accident and it still compiles — it just silently corrupts the object. Adding setters instead doesn't fix it either: `user.set_email(...)` leaves the object in a half-built, inconsistent state the whole time it's being configured, which is exactly what you don't want under concurrency.

**Builder** fixes this: build the object on separate, mutable scaffolding, validate everything in one place, and only then hand back something that's permanently locked.

<Diagram>
<Row>
<Box title="UserBuilder (mutable scaffolding)" accent="#60a5fa">
<Field icon="⛓️" code="set_email() / set_phone() / set_role()" hint="each returns self — that's what makes chaining work" variant="neutral" />
<Field icon="🚦" code="build()" hint="validates everything at once, atomically" variant="neutral" />
</Box>
<Arrow label="build()" />
<Box title="User (immutable)" accent="#34d399">
<Field icon="🔒" code="read-only properties" hint="no setters — frozen for good" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### A Real Implementation: Fluent Builder for an Immutable User

Method chaining, read-only properties, and one **atomic validation gate** at `build()`:

```python
import re
from typing import Optional


class User:
    """Immutable Domain Entity - initialized only via UserBuilder."""

    def __init__(self, builder: "UserBuilder"):
        self._name = builder.name
        self._email = builder.email
        self._phone = builder.phone
        self._role = builder.role
        self._is_active = builder.is_active

    # Read-only properties (No setters ensures immutability)
    @property
    def name(self) -> str: return self._name

    @property
    def email(self) -> Optional[str]: return self._email

    @property
    def phone(self) -> Optional[str]: return self._phone

    @property
    def role(self) -> str: return self._role

    @property
    def is_active(self) -> bool: return self._is_active

    def __repr__(self) -> str:
        return f"User(name='{self._name}', email='{self._email}', role='{self._role}', active={self._is_active})"


class UserBuilder:
    """Fluent Builder with Atomic Invariant Validation."""

    def __init__(self, name: str):
        # Mandatory field enforced in constructor
        if not name or not name.strip():
            raise ValueError("User 'name' is mandatory.")
        self.name = name.strip()
        self.email: Optional[str] = None
        self.phone: Optional[str] = None
        self.role: str = "Viewer"  # Default value
        self.is_active: bool = True

    def set_email(self, email: str) -> "UserBuilder":
        self.email = email.strip()
        return self  # Return self enables fluent chaining

    def set_phone(self, phone: str) -> "UserBuilder":
        self.phone = phone.strip()
        return self

    def set_role(self, role: str) -> "UserBuilder":
        self.role = role.strip()
        return self

    def set_active(self, active: bool) -> "UserBuilder":
        self.is_active = active
        return self

    def build(self) -> User:
        """Atomic Validation Gate: Enforces all business rules before creation."""
        # 1. Email format check if provided
        if self.email and not re.match(r"[^@]+@[^@]+\.[^@]+", self.email):
            raise ValueError(f"Invalid email address format: '{self.email}'")

        # 2. Cross-field business rule: Admins MUST have a verified corporate email
        if self.role == "Admin" and not self.email:
            raise ValueError("Administrative users must possess a valid registered email.")

        # 3. Construct and return immutable final product
        return User(self)
```

---

### The GoF Director: Presets for Common Builds

If you find yourself writing the same chain of `.set_x()` calls over and over, that's what a **Director** is for — it hardcodes a known recipe on top of the builder. The builder still decides *how* each piece gets assembled; the director just decides *which* steps to call, for a given preset:

```python
class UserDirector:
    """Automates standard construction recipes using a UserBuilder."""

    @staticmethod
    def construct_admin(name: str, email: str) -> User:
        return (UserBuilder(name)
                .set_email(email)
                .set_role("Admin")
                .set_active(True)
                .build())

    @staticmethod
    def construct_guest(temp_id: str) -> User:
        return (UserBuilder(f"Guest_{temp_id}")
                .set_role("Guest")
                .set_active(False)
                .build())
```

- **Client Benefit:** Common instances can be generated via a single call (`UserDirector.construct_admin(...)`), while ad-hoc configurations still use the fluent builder directly.

---

### Modern Python Alternatives: When to Reach for Something Else

#### 1. Python Frozen Dataclasses
```python
from dataclasses import dataclass

@dataclass(frozen=True, kw_only=True)
class FastUser:
    name: str
    email: str | None = None
    role: str = "Viewer"
```
- **Pros:** Native, highly concise, auto-generates equality and hashing methods.
- **Cons:** Limited cross-field validation; cannot execute complex multi-step construction logic or director presets.

#### 2. Pydantic Models
- **Pros:** Industry standard for JSON serialization and request payload validation in FastAPI/Django.
- **Cons:** Heavy external dependency; focused on runtime parsing rather than algorithmic step-by-step object assembly.

---

### Comparing the Approaches

| Approach | Immutability Enforced? | Readability with Optional Fields | Cross-Field Validation | Best Used When |
| :--- | :---: | :---: | :---: | :--- |
| **Telescoping Constructor** | Yes | Terrible (`None, None, True`) | Limited to `__init__` body | 1 to 3 mandatory parameters only. |
| **JavaBean (Setters)** | No (Mutable) | Moderate | Dangerous (partially initialized) | Simple mutable DTOs in legacy code. |
| **Builder Pattern** | **Yes** | **Excellent (Fluent chaining)** | **Atomic at `build()`** | Complex domain entities with invariants and presets. |
| **Frozen Dataclass** | Yes | High (`kw_only=True`) | Moderate (via `__post_init__`) | Lightweight value objects without construction pipelines. |

---

### Say this in the interview

*"Builder solves the telescoping-constructor problem: instead of a constructor with ten optional parameters, you configure a mutable builder step by step and validate everything atomically in `build()`, which returns a permanently immutable object. A Director sits on top for common presets you don't want to re-type every time. For simpler cases without multi-step validation, a frozen dataclass does the same immutability with less code — Builder earns its keep specifically when you need cross-field validation before the object can exist."*

---

### Python: Verification Script

The following standalone script verifies fluent method chaining, atomic validation enforcement, Director presets, and immutability guarantees:

```python
"""
Builder Pattern Verification Test Suite
Verifies:
  1. Fluent chaining and successful instantiation
  2. Director construction presets
  3. Atomic validation rejection
  4. Immutability enforcement
"""
import re
from typing import Optional


class User:
    def __init__(self, builder):
        self._name = builder.name
        self._email = builder.email
        self._role = builder.role

    @property
    def name(self) -> str: return self._name

    @property
    def email(self) -> Optional[str]: return self._email

    @property
    def role(self) -> str: return self._role

    def __repr__(self) -> str:
        return f"User(name='{self._name}', email='{self._email}', role='{self._role}')"


class UserBuilder:
    def __init__(self, name: str):
        if not name.strip():
            raise ValueError("Name cannot be empty.")
        self.name = name.strip()
        self.email: Optional[str] = None
        self.role: str = "Viewer"

    def set_email(self, email: str) -> "UserBuilder":
        self.email = email.strip()
        return self

    def set_role(self, role: str) -> "UserBuilder":
        self.role = role.strip()
        return self

    def build(self) -> User:
        if self.email and not re.match(r"[^@]+@[^@]+\.[^@]+", self.email):
            raise ValueError(f"Invalid email: {self.email}")
        if self.role == "Admin" and not self.email:
            raise ValueError("Admin role requires a valid email.")
        return User(self)


class UserDirector:
    @staticmethod
    def make_admin(name: str, email: str) -> User:
        return UserBuilder(name).set_email(email).set_role("Admin").build()


if __name__ == "__main__":
    print("=" * 65)
    print("BUILDER PATTERN VERIFICATION TEST SUITE")
    print("=" * 65)

    # 1. Test Fluent Chaining
    u1 = (UserBuilder("Alice")
          .set_email("alice@company.com")
          .set_role("Engineer")
          .build())
    print(f"Standard Build:  {u1}")
    assert u1.name == "Alice"
    assert u1.role == "Engineer"

    # 2. Test Director Preset
    admin = UserDirector.make_admin("Bob", "bob@admin.org")
    print(f"Director Build:  {admin}")
    assert admin.role == "Admin"

    # 3. Test Validation Gate (Invalid Email)
    try:
        UserBuilder("Charlie").set_email("not-an-email").build()
        assert False, "Should have thrown ValueError"
    except ValueError as e:
        print(f"Validation Pass: Caught invalid email -> '{e}'")

    # 4. Test Validation Gate (Admin without email)
    try:
        UserBuilder("Dave").set_role("Admin").build()
        assert False, "Should have thrown ValueError"
    except ValueError as e:
        print(f"Validation Pass: Caught missing admin email -> '{e}'")

    # 5. Verify Immutability (Attempting to modify property)
    try:
        u1.name = "MaliciousOverride"
        assert False, "Should have raised AttributeError"
    except AttributeError:
        print("Immutability:    Confirmed read-only. Cannot mutate attributes on User instance.")

    print("\nSUCCESS: All Builder pattern invariants verified.")
```
