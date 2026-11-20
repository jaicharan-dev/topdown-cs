---
id: 6-observer-pattern
title: "Observer: Event Notification and the Lapsed Listener Leak"
description: "Subscribing hands the subject a reference, so the subject keeps your object alive forever; and weakref.ref on a bound method dies instantly, which is the trap"

sidebar_position: 6
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "What is the Observer pattern, why would you use it, and how does it fundamentally differ from Publish-Subscribe? How do you prevent the notorious 'Lapsed Listener' memory leak in Python, and what are the tradeoffs between Push and Pull notification models?"

---

### Picture it

A noticeboard, and the question of who has to know about whom.

**Without the pattern, the thing that changes has to know everyone who cares.** The stock price updates, so it calls the chart, then the alert service, then the audit log. Which means the stock price object imports all three, and adding a fourth interested party means editing the stock price. The thing with the data is now coupled to every consumer of the data, and consumers are exactly the part of a system that multiplies.

**The pattern inverts the direction of knowing.** The noticeboard does not know who reads it. Interested parties come and attach themselves, and the board's only job is to tell whoever is currently attached that something changed. **One object now knows about a list of interfaces instead of a list of concrete classes**, so adding a reader touches only the reader.

That is the whole idea, and the part worth dwelling on is what the subscription step actually does, because it is where this pattern earns its reputation.

**To be notified, you must hand the noticeboard a way to reach you.** There is no other mechanism; notification means someone calls you, and for someone to call you they must hold a reference to you. **So subscribing means giving the subject a reference to yourself.**

Now consider a reader who leaves. The chart is closed, the window is destroyed, every part of the application forgets it. Except one: **the noticeboard is still holding the reference it was given.** Nothing collects the chart, because something still points at it. Worse than the memory, the chart is still being **notified**, so it keeps doing work for a window nobody is looking at, and it may raise when it touches resources that were torn down.

This is the leak, and the shape of it is worth naming precisely: **the subscription outlives the subscriber, because the subscription is what is keeping the subscriber alive.** Unsubscribing fixes it, and relying on every subscriber to unsubscribe correctly on every exit path, including exceptions, is exactly the kind of discipline that fails in a large codebase.

The structural fix is to make the noticeboard's grip weak: hold a reference that does not prevent collection, and drop it when the object goes. **And in Python there is a specific trap waiting there**, which is that the obvious way to do it fails silently in the most natural usage. Hand a weak reference to an object and it works; hand a weak reference to one of that object's **methods** and it is dead before you have finished the line, because the bound method you created to pass in was a temporary that nothing else holds.

---

### The proper terms

#### The pattern

The **subject**, or observable, holds a list of observers and notifies them when its state changes. Its interface is **attach**, **detach** and **notify**.

An **observer** exposes an update method and registers itself with the subject. The subject knows observers only through that interface, never as concrete classes, which is where the decoupling lives.

The call is **synchronous and in-process**: `notify` is a loop of ordinary method calls on the subject's own thread. That single fact drives most of the consequences below.

#### Push against pull

In the push model, the subject sends the changed data as arguments: `observer.update(price=101.5)`. Observers need no reference back to the subject and get exactly what they were given.

In the pull model, the subject sends only a signal, and each observer queries the subject for what it needs: `observer.update(subject)` followed by `subject.get_price()`.

| | Push | Pull |
| :--- | :--- | :--- |
| Coupling to the subject | none needed | observer must know the subject's interface |
| Data transferred | everything, whether wanted or not | only what each observer asks for |
| Consistency | a snapshot, as at notification time | whatever is current when the observer asks |
| Suits | few fields, many observers wanting the same thing | large state, observers wanting different slices |

The consistency row is the one that matters in practice and is usually left out. **Pull can read state that has changed again since the notification**, especially if an earlier observer in the loop mutated the subject, so observers can disagree about what the event was. Push hands out a fixed snapshot and cannot have that problem.

#### Observer against publish-subscribe

These are routinely conflated, and the distinction is structural rather than a matter of scale.

| | Observer | Publish-Subscribe |
| :--- | :--- | :--- |
| Do the parties know each other? | yes, the subject holds the observers | no, both know only a broker |
| Delivery | synchronous, in-process | usually asynchronous, often cross-process |
| Coupling | direct references | via a **topic** or channel |
| If a subscriber is slow | the subject blocks | the broker buffers |
| If a subscriber is absent | nothing to notify | the broker may queue or persist |

**The defining difference is the broker.** In Observer the subject holds the observers, so the leak in this question is possible. In pub-sub a publisher holds no reference to any subscriber, which removes that failure mode and introduces others: delivery guarantees, ordering, duplicates and the broker's own availability.

A good one-line version: **Observer is a method call to a list; pub-sub is a message to an address.**

#### The leak, named

The lapsed listener problem is that a subject holding strong references keeps observers alive after everything else has released them. The consequences are a memory leak, wasted work notifying objects nobody can see, and errors when those objects touch resources that have been torn down.

Python's weak reference machinery is the structural fix:

**`weakref.ref(obj)`** is a reference that does not keep `obj` alive. Calling it returns the object, or `None` once it has been collected.

**`weakref.WeakMethod(obj.method)`** is the one for bound methods, and it exists for a specific reason. **`obj.method` creates a new bound-method object each time it is evaluated**, so `weakref.ref(obj.method)` takes a weak reference to a temporary that nothing else holds, and it is dead immediately. `WeakMethod` keeps a weak reference to the instance and the function separately and reassembles the bound method on demand.

**`weakref.WeakSet`** and `WeakValueDictionary` are container versions that drop entries automatically, which avoids hand-written pruning.

Two caveats on weak references worth having ready. Not everything is weak-referenceable: a class using `__slots__` without `'__weakref__'` cannot be, and neither can some built-in types. And **a lambda closing over `self` defeats the whole thing**, because the closure is a strong reference, so `subject.attach(lambda: self.redraw())` keeps `self` alive no matter how weakly the subject holds the lambda.

#### What synchronous notification implies

Four consequences of `notify` being a plain loop, each of which turns into an interview question:

**One slow observer delays everything.** Notification cost is the sum over all observers on the subject's thread.

**One raising observer can abort the loop**, so observers after it are never told. Either isolate each call in a try/except or document that a raising observer is a programming error.

**Notification order is the list order**, which is an accident of subscription sequence that observers must not depend on.

**Re-entrancy is possible**: an observer may cause another notification, or attach or detach during the loop, so iterate over a copy of the list.

---

### In code

#### The leak, demonstrated

```python
import gc


class Subject:
    def __init__(self):
        self._observers = []            # strong references

    def attach(self, observer):
        self._observers.append(observer)

    def notify(self, price):
        for o in self._observers:
            o.update(price)


class Chart:
    instances = 0

    def __init__(self):
        Chart.instances += 1

    def __del__(self):
        Chart.instances -= 1

    def update(self, price):
        ...


subject = Subject()
for _ in range(3):
    subject.attach(Chart())             # no local reference kept at all

gc.collect()
print(Chart.instances)      # 3  -- all still alive, and still being notified
```

**Three charts that nothing in the program refers to, and they are alive.** The only thing pointing at them is the subject's list, and that list is why they cannot be collected. They will also be called on every `notify`, doing work for windows that no longer exist.

#### The weak-reference fix

```python
import weakref


class WeakSubject:
    def __init__(self):
        self._observers: list[weakref.ref] = []

    def attach(self, observer) -> None:
        self._observers.append(weakref.ref(observer))

    def notify(self, price) -> None:
        live = []
        for ref in self._observers:
            observer = ref()
            if observer is not None:
                observer.update(price)
                live.append(ref)
        self._observers = live          # prune the dead refs as we go
```

Now dropping the last real reference collects the observer, and the next `notify` quietly forgets it. Note the pruning: without it the list grows forever with dead references, which is a smaller leak of the same shape.

`weakref.WeakSet` does the pruning for you and is usually the better choice:

```python
class WeakSetSubject:
    def __init__(self):
        self._observers = weakref.WeakSet()

    def attach(self, observer):
        self._observers.add(observer)

    def notify(self, price):
        for o in list(self._observers):     # copy: re-entrancy safety
            o.update(price)
```

#### The trap that catches people

The natural thing to subscribe is a method, not an object, and this is where `weakref.ref` fails silently.

```python
import weakref, gc


class Chart:
    def redraw(self, price):
        ...


chart = Chart()                         # a real, live reference

bad = weakref.ref(chart.redraw)         # weak ref to a bound method
gc.collect()
print(bad())                            # None  -- already dead!

good = weakref.WeakMethod(chart.redraw)
print(good() is not None)               # True

del chart
gc.collect()
print(good())                           # None  -- correct, the object went
```

**`bad()` returns `None` while `chart` is still perfectly alive.** The reason is that `chart.redraw` is not a stored attribute; **evaluating it constructs a new bound-method object**, which is a temporary. `weakref.ref` takes a weak reference to that temporary, the expression ends, nothing holds it, and it is collected immediately. The weak reference is dead and the subscription silently never fires again.

This is a particularly unpleasant bug because it is the opposite of the leak: instead of an observer that never goes away, you get one that **never gets called**, with no error anywhere. `weakref.WeakMethod` is the fix, keeping weak references to the instance and the function separately and rebuilding the bound method when asked.

And the related trap, which no amount of weak referencing fixes:

```python
# this keeps `self` alive forever, however weakly the subject holds it
subject.attach(lambda price: self.redraw(price))
```

**The closure holds a strong reference to `self`.** Weakly referencing the lambda is useless, because the lambda is the only thing holding it and the subject is the only thing holding the lambda. The fix is to subscribe the bound method via `WeakMethod`, or to keep the subscription's lifetime explicit with a handle the subscriber owns.

#### A subject worth shipping

```python
import weakref
from typing import Callable


class Signal:
    """Synchronous, weakly-held, re-entrancy-safe, isolates failures."""

    def __init__(self, name: str = ""):
        self._name = name
        self._refs: list = []

    def connect(self, callback: Callable) -> Callable[[], None]:
        """Returns a disconnect handle, so a caller can be explicit."""
        if hasattr(callback, "__self__"):          # a bound method
            ref = weakref.WeakMethod(callback)
        else:
            ref = weakref.ref(callback)
        self._refs.append(ref)

        def disconnect() -> None:
            try:
                self._refs.remove(ref)
            except ValueError:
                pass
        return disconnect

    def emit(self, *args, **kwargs) -> list:
        errors = []
        live = []
        for ref in list(self._refs):               # copy: observers may edit
            cb = ref()
            if cb is None:
                continue                            # collected; drop it
            live.append(ref)
            try:
                cb(*args, **kwargs)
            except Exception as exc:               # one failure must not
                errors.append((cb, exc))           # silence the others
        self._refs = live
        return errors
```

Four decisions in that class, each answering a question the pattern raises:

**`WeakMethod` for bound methods and `ref` otherwise**, detected by `hasattr(callback, "__self__")`, which is what makes subscribing `chart.redraw` work rather than silently never firing.

**A returned `disconnect` handle.** Weak references cover the case where the subscriber is forgotten; an explicit handle covers the case where it is still alive and no longer interested, which weak references cannot detect.

**Iterating over a copy.** An observer may attach or detach during `emit`, and mutating a list while iterating it skips entries.

**Collecting errors rather than propagating.** One raising observer must not prevent the rest from being told. Returning them beats swallowing them, because the caller can log or re-raise.

#### Verify it

```python
"""
Observer: the lapsed listener leak, the weak-reference fix, the
WeakMethod trap, and the consequences of synchronous notification.
"""
import gc
import weakref
from typing import Callable


class StrongSubject:
    def __init__(self):
        self._observers = []

    def attach(self, o):
        self._observers.append(o)

    def notify(self, value):
        for o in self._observers:
            o.update(value)


class WeakSubject:
    def __init__(self):
        self._refs = []

    def attach(self, o):
        self._refs.append(weakref.ref(o))

    def notify(self, value):
        live = []
        for ref in self._refs:
            o = ref()
            if o is not None:
                o.update(value)
                live.append(ref)
        self._refs = live
        return len(live)


class Chart:
    alive = 0

    def __init__(self, name):
        self.name = name
        self.seen = []
        Chart.alive += 1

    def __del__(self):
        Chart.alive -= 1

    def update(self, value):
        self.seen.append(value)

    def redraw(self, value):
        self.seen.append(value)


class Signal:
    def __init__(self):
        self._refs = []

    def connect(self, callback):
        if hasattr(callback, "__self__"):
            ref = weakref.WeakMethod(callback)
        else:
            ref = weakref.ref(callback)
        self._refs.append(ref)

        def disconnect():
            try:
                self._refs.remove(ref)
            except ValueError:
                pass
        return disconnect

    def emit(self, *a, **k):
        errors, live = [], []
        for ref in list(self._refs):
            cb = ref()
            if cb is None:
                continue
            live.append(ref)
            try:
                cb(*a, **k)
            except Exception as exc:
                errors.append((getattr(cb, "__name__", repr(cb)), exc))
        self._refs = live
        return errors


if __name__ == "__main__":
    print("-- the lapsed listener leak")
    Chart.alive = 0
    s = StrongSubject()
    for i in range(3):
        s.attach(Chart(f"c{i}"))        # no local reference kept
    gc.collect()
    print(f"   created 3 charts, kept no references of our own")
    print(f"   still alive: {Chart.alive}  <- LEAKED")
    s.notify(1)
    print(f"   and still being notified: they did work for windows that")
    print(f"   no longer exist")
    assert Chart.alive == 3
    s._observers.clear()
    gc.collect()
    print(f"   after the subject forgets them: {Chart.alive}")
    print("   the subscription outlived the subscriber BECAUSE the")
    print("   subscription was what kept it alive")

    print("\n-- the weak-reference fix")
    Chart.alive = 0
    w = WeakSubject()
    kept = Chart("kept")                # one we do keep
    for i in range(3):
        w.attach(Chart(f"t{i}"))        # three we do not
    w.attach(kept)
    gc.collect()
    print(f"   4 attached, 1 reference kept -> alive: {Chart.alive}")
    reached = w.notify(1)
    print(f"   notify reached {reached} observer(s), and pruned the rest")
    assert Chart.alive == 1 and reached == 1

    print("\n-- the trap: weakref.ref on a BOUND METHOD is dead on arrival")
    chart = Chart("live")
    bad = weakref.ref(chart.redraw)
    gc.collect()
    print(f"   chart is alive            : {chart.name!r}")
    print(f"   weakref.ref(chart.redraw)(): {bad()}  <- already None")
    print("   because chart.redraw is not a stored attribute: evaluating")
    print("   it CONSTRUCTS a bound method, which is a temporary that")
    print("   nothing else holds, so it is collected immediately")
    good = weakref.WeakMethod(chart.redraw)
    print(f"   WeakMethod(chart.redraw)()  : "
          f"{'a live bound method' if good() is not None else None}")
    assert bad() is None and good() is not None
    print("   this bug is the OPPOSITE of the leak: instead of an observer")
    print("   that never goes away, you get one that never fires, silently")

    print("\n-- and a lambda closing over self defeats weak refs entirely")
    Chart.alive = 0
    holder = Chart("holder")
    sig_leak = Signal()
    sig_leak.connect(lambda v: holder.update(v))
    print(f"   the closure holds a STRONG reference to the object, and the")
    print(f"   signal is the only thing holding the closure, so weakly")
    print(f"   referencing the lambda achieves nothing")

    print("\n-- a subject worth shipping")
    sig = Signal()
    c1, c2 = Chart("c1"), Chart("c2")
    off1 = sig.connect(c1.redraw)        # bound methods, via WeakMethod
    sig.connect(c2.redraw)

    def boom(v):
        raise RuntimeError("observer failed")

    sig.connect(boom)
    errs = sig.emit(42)
    print(f"   emit(42): c1.seen={c1.seen}, c2.seen={c2.seen}")
    print(f"   one observer raised, the others were still told: "
          f"{[name for name, _ in errs]}")
    assert c1.seen == [42] and c2.seen == [42] and len(errs) == 1

    print("\n   the disconnect handle covers what weak refs cannot:")
    off1()
    sig.emit(43)
    print(f"   after off1(): c1.seen={c1.seen}, c2.seen={c2.seen}")
    assert c1.seen == [42] and c2.seen == [42, 43]
    print("   c1 is still alive and simply no longer interested, which a")
    print("   weak reference has no way to detect")

    print("\n-- push against pull")

    class PushSubject:
        def __init__(self):
            self.price = 100
            self._obs = []

        def set_price(self, p):
            self.price = p
            for o in self._obs:
                o(price=p)               # a snapshot, fixed at this instant

    class PullSubject:
        def __init__(self):
            self.price = 100
            self._obs = []

        def set_price(self, p):
            self.price = p
            for o in self._obs:
                o(self)                  # a signal; the observer queries

    pull = PullSubject()
    seen = []

    def greedy(subj):
        subj.price = 999                 # an earlier observer mutates
        seen.append(("greedy", subj.price))

    def innocent(subj):
        seen.append(("innocent", subj.price))

    pull._obs = [greedy, innocent]
    pull.set_price(101)
    print(f"   pull: {seen}")
    print("   the second observer read 999, not the 101 the event was")
    print("   about: pull can observe state that changed AFTER the")
    print("   notification. Push hands out a fixed snapshot instead.")

    print("\n-- what synchronous notification implies")
    print("   notify is a plain loop on the subject's thread, so:")
    print("     one slow observer delays every later one")
    print("     one raising observer can abort the loop (hence isolation)")
    print("     order is subscription order, an accident to not depend on")
    print("     observers may attach or detach mid-loop, hence the copy")
    print("   none of these apply to pub-sub, because a broker sits")
    print("   between publisher and subscriber and nobody holds anybody")
```

---

### What they ask next

**"Why does subscribing cause a leak at all?"**
Because notification requires a reference. For the subject to call you it must hold a way to reach you, so **subscribing means handing the subject a reference to yourself.** When everything else releases the observer, the subject's list is still pointing at it, so it cannot be collected and it keeps being notified. The shape to state is that **the subscription outlived the subscriber because the subscription was what kept it alive.**

**"Isn't the fix just to unsubscribe?"**
It is the correct fix and it is not a reliable one. It requires every subscriber to detach on every exit path including exceptions, which is exactly the discipline that fails at scale, and it is impossible when the subscriber has no well-defined teardown point. Weak references make the right thing happen by default, and **an explicit handle is still worth providing** for the different case where the observer is alive and simply no longer interested.

**"How do weak references fix it?"**
`weakref.ref(obj)` does not keep `obj` alive, and calling it returns `None` once the object has gone, so `notify` can skip and prune dead entries. **`weakref.WeakSet` is usually better** than a hand-rolled list because it prunes automatically; without pruning, the list of dead references grows forever, which is a smaller leak of the same shape.

**"What is the `WeakMethod` trap?"**
Subscribing a method rather than an object is the natural thing to do, and `weakref.ref(chart.redraw)` is **dead immediately, while `chart` is still alive.** The reason is that `chart.redraw` is not a stored attribute: evaluating it **constructs a new bound-method object**, which is a temporary, so the weak reference points at something nothing else holds and it is collected at once. **`weakref.WeakMethod` is the fix**, holding the instance and the function weakly and separately and rebuilding the bound method on demand.

**"Why is that trap worse than the leak?"**
Because it is the opposite failure and it is silent. The leak gives you an observer that never goes away, which shows up as growing memory. The `WeakMethod` trap gives you an observer that **never fires**, with no exception anywhere, so the symptom is a feature that quietly does not work.

**"Does weak referencing always work?"**
No, and three limits are worth knowing. **A lambda closing over `self` defeats it entirely**, because the closure is a strong reference and the subject is the only thing holding the closure, so `subject.attach(lambda: self.redraw())` keeps `self` alive however weakly the lambda is held. **Not everything is weak-referenceable**, including classes using `__slots__` without `'__weakref__'`. And weak references cannot express "alive but uninterested", which is what the disconnect handle is for.

**"Push or pull?"**
**Push** sends the changed data as arguments, so observers need no reference back to the subject and receive a **consistent snapshot** fixed at notification time. **Pull** sends a signal and each observer queries the subject, which transfers less when observers want different slices of a large state, at the cost of coupling them to the subject's interface. The consequence usually left out is the consistency one: **pull can read state that changed after the notification**, including changes made by an earlier observer in the same loop, so two observers can disagree about what the event was. The verifier demonstrates exactly that.

**"How does Observer differ from publish-subscribe?"**
**The broker.** In Observer the subject holds direct references to its observers, delivery is synchronous and in-process, and the leak in this question is therefore possible. In pub-sub, publisher and subscriber both know only a **topic** on a broker and never each other, delivery is usually asynchronous and often cross-process, and nobody holds a reference to anybody. One line: **Observer is a method call to a list; pub-sub is a message to an address.**

**"What does pub-sub cost you in exchange?"**
Everything that comes with a message system: delivery guarantees to reason about, ordering that may not be preserved, duplicates to make handlers idempotent against, and the broker as a new dependency that can fail. Observer's synchronous simplicity means you always know whether the handler ran and in what order; pub-sub buys decoupling with uncertainty.

**"What else follows from notification being synchronous?"**
Four things, each a defect if ignored. **A slow observer delays every later one**, since the cost is the sum on the subject's thread. **A raising observer can abort the loop**, so the rest are never told, which is why `emit` should isolate each call and collect failures rather than propagate the first. **Order is subscription order**, an accident that observers must not depend on. And **re-entrancy**: an observer may attach or detach during notification, so iterate over a copy of the list or you will skip entries.

**"Where does this appear in real code?"**
Qt's signals and slots, which hold weak references to receivers and auto-disconnect on destruction. Django's signal framework, which has a `weak=True` default for exactly this reason. GUI event handlers generally, `ResizeObserver` and friends in browsers, and property-change notification in anything doing data binding. The pattern is also the local, synchronous end of a spectrum whose other end is Kafka.

**The common wrong answer** is describing Observer and publish-subscribe as the same thing with different names, when the presence of a broker changes the coupling, the delivery model and whether this leak is even possible. Next is fixing the leak with `weakref.ref(obj.method)`, which produces an observer that silently never fires. Third is explaining push against pull purely as a data-volume trade and omitting that pull can observe state that has already changed again. And last is writing `notify` as a bare loop over the live list, which breaks on a raising observer and on any observer that subscribes or unsubscribes during notification.

---

### Say this in the interview

*"The pattern inverts who knows whom. Without it, the thing that changes has to know every interested party: the stock price calls the chart, the alerts and the audit log, so it imports all three and adding a fourth means editing the price object. With it, interested parties attach themselves and the subject knows only a list of observers through one interface, so adding a reader touches only the reader.*

*The part I would dwell on is what subscribing actually does, because that is where the leak comes from. For the subject to notify me it has to be able to call me, and to call me it has to hold a reference to me. So subscribing means handing the subject a reference to myself. Now suppose the chart is closed and every other part of the application forgets it. The subject's list is still pointing at it, so it cannot be collected, and worse, it is still being notified, so it keeps doing work for a window nobody is looking at and may raise when it touches torn-down resources. The way I would phrase the leak is that the subscription outlived the subscriber because the subscription was what kept it alive.*

*Unsubscribing is the correct fix and not a reliable one, because it needs every subscriber to detach on every exit path including exceptions, which is exactly the discipline that fails at scale. So the structural fix is to make the subject's grip weak: weakref.ref does not keep the object alive and returns None once it has gone, so notify can skip and prune dead entries. I would use weakref.WeakSet rather than a hand-rolled list, because otherwise the list of dead references grows forever, which is a smaller leak of the same shape.*

*And then the trap, which is the thing I would most want to get across. The natural thing to subscribe is a method, not an object, and weakref.ref of chart.redraw is dead immediately, while chart is still perfectly alive. The reason is that chart.redraw is not a stored attribute: evaluating it constructs a new bound-method object, which is a temporary, so the weak reference points at something nothing else holds and it is collected at once. The fix is weakref.WeakMethod, which holds the instance and the function weakly and separately and reassembles the bound method on demand. I would stress that this bug is worse than the leak in one sense, because it is the opposite failure and it is silent: instead of an observer that never goes away you get one that never fires, with no exception anywhere.*

*Two related limits. A lambda closing over self defeats weak references entirely, because the closure is a strong reference and the subject is the only thing holding the closure, so attaching a lambda that calls self.redraw keeps self alive however weakly the lambda is held. And weak references cannot express alive-but-uninterested, so I would still return a disconnect handle from connect, because that is a genuinely different case that no amount of weak referencing detects.*

*On push against pull: push sends the changed data as arguments, so observers need no reference back to the subject and receive a snapshot fixed at notification time. Pull sends only a signal and each observer queries the subject, which transfers less when observers want different slices of a large state, at the cost of coupling them to the subject's interface. The consequence usually left out is consistency: under pull an observer can read state that changed after the notification, including changes made by an earlier observer in the same loop, so two observers can disagree about what the event even was. Push cannot have that problem because the snapshot is fixed.*

*For Observer against publish-subscribe, the defining difference is the broker. In Observer the subject holds direct references to the observers, delivery is synchronous and in-process, and that is exactly why this leak is possible. In pub-sub, the publisher and the subscriber both know only a topic on a broker and never each other, delivery is usually asynchronous and often cross-process, and nobody holds a reference to anybody. The line I would use is that Observer is a method call to a list and pub-sub is a message to an address. And pub-sub is not free: it buys decoupling with uncertainty, so now I have delivery guarantees to reason about, ordering that may not hold, duplicates to make handlers idempotent against, and a broker that can fail.*

*Last, four things that follow from notify being a plain loop, because each is a defect if you ignore it. A slow observer delays every later one, since the cost is the sum on the subject's thread. A raising observer can abort the loop so the rest are never told, which is why emit should isolate each call and collect the failures rather than propagate the first. Order is subscription order, which is an accident that observers must not depend on. And re-entrancy: an observer may attach or detach during notification, so I would iterate over a copy of the list. For what it is worth, this is all visible in real frameworks: Qt holds weak references to receivers and auto-disconnects on destruction, and Django's signals have weak equals True as the default for exactly this reason."*
