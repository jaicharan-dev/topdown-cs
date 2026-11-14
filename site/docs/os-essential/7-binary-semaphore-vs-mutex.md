---
id: 7-binary-semaphore-vs-mutex
title: "Binary Semaphore vs. Mutex: Ownership & Signaling Differences"
description: "Both allow one holder, and only one of them knows who that holder is"

sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Is a binary semaphore just a mutex? Why or why not? What is a recursive/reentrant mutex, and how do condition variables relate to binary semaphores?"

---

### Picture it

Both let exactly one person through at a time, so from the outside they look identical. Watch what each is actually for.

**A mutex is the key to the room.** You take it, you go in, you come out, you put it back. Nobody else can put it back for you, because it was in your pocket. The question it answers is "is anyone inside?"

**A binary semaphore is a single token in a bowl.** Take the token and you may proceed; the bowl is now empty and the next person waits. Anyone can drop a token into the bowl, including someone who never took one. The question it answers is "is there a token available?"

That difference sounds academic until you want a **signal**. The chef finishes a dish and drops a token in the bowl; the waiter has been waiting at the bowl and takes it. The chef never waited and the waiter never took a token first. With a key, that exchange is nonsense: the waiter would be returning a key they never borrowed.

So one is for keeping others out of something you are using. The other is for telling someone that something has happened.

---

### The proper terms

#### The answer to the question

No, a binary semaphore is not a mutex, even though both permit one holder. The differences follow from **ownership**.

**A mutex has an owner.** It records which thread locked it, and only that thread may unlock it. Unlocking from another thread is an error.

**A binary semaphore has no owner.** It is a counter capped at 1. Any thread may **signal** it regardless of whether it ever **waited** on it.

Three consequences follow.

**Signalling.** Because the signaller need not be the waiter, a semaphore can hand off between threads. A mutex cannot express that.

**Priority inheritance.** Boosting the holder's priority to avoid **priority inversion** requires knowing who the holder is. Only the mutex does, so only the mutex can implement it.

**Error detection.** A mutex can report unlocking from the wrong thread or a double unlock. A semaphore cannot, because both are legitimate uses: signalling twice simply raises the count, which for a binary semaphore is usually a bug it cannot detect.

There is also an initialisation difference. A mutex starts unlocked, available. A binary semaphore used for signalling starts at 0, unavailable, so the first waiter blocks until something signals.

#### Recursive mutexes

A **recursive**, or **reentrant**, mutex may be locked repeatedly by the thread that already owns it without deadlocking. It keeps a **recursion count**, incremented on each lock and decremented on each unlock, and is released only when the count returns to zero.

It exists for the case where a function holding the lock calls another function that also locks it. With a normal mutex that self-deadlocks: the thread waits for a lock it holds itself.

Recursion is only definable because of ownership. A semaphore cannot offer it, since it cannot tell whether the waiter is the current holder.

The usual advice is to avoid recursive mutexes where possible. Needing one often indicates unclear boundaries about which functions assume the lock is already held.

#### Condition variables

A **condition variable** lets a thread wait until a **predicate** about shared state becomes true. Its operations are **wait**, **signal** and broadcast.

It is always used **with a mutex**, and that pairing is the point. `wait` atomically releases the mutex and blocks, then reacquires it before returning. Without that atomicity there is a window between testing the condition and sleeping in which the signal could arrive and be missed, which is the **lost wakeup** problem.

A condition variable is **stateless**, which is the key contrast with a binary semaphore. Signalling one when nobody is waiting does nothing at all; the signal is lost. A semaphore **remembers**, since the count rises and a later waiter proceeds immediately.

That difference dictates usage. Use a condition variable when waiting on a **state** you can re-check, which is why the wait always sits inside a **while** loop rather than an `if`: the thread must re-test the predicate on waking, because of **spurious wakeups** and because another thread may have changed the state first. Use a semaphore when counting **events** that must not be missed.

---

### In code

```c
// Signalling: legal with a semaphore, impossible with a mutex
sem_t ready;
sem_init(&ready, 0, 0);               // starts unavailable

void *producer(void *arg) { sem_post(&ready); return NULL; }   // never waited
void *consumer(void *arg) { sem_wait(&ready); return NULL; }   // different thread
```

```c
// Self-deadlock with a normal mutex
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;

void inner(void) { pthread_mutex_lock(&m); /* ... */ pthread_mutex_unlock(&m); }

void outer(void) {
    pthread_mutex_lock(&m);
    inner();                          // blocks forever: waiting on itself
    pthread_mutex_unlock(&m);
}

// A recursive mutex permits it, tracking a count
pthread_mutexattr_t attr;
pthread_mutexattr_init(&attr);
pthread_mutexattr_settype(&attr, PTHREAD_MUTEX_RECURSIVE);
pthread_mutex_init(&m, &attr);
```

```c
// Condition variable: always a mutex, always a while loop
pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  cv   = PTHREAD_COND_INITIALIZER;
int items = 0;

void consume(void) {
    pthread_mutex_lock(&lock);
    while (items == 0) {              // while, not if: re-test on waking
        pthread_cond_wait(&cv, &lock);  // releases lock and blocks, atomically
    }
    items--;
    pthread_mutex_unlock(&lock);
}

void produce(void) {
    pthread_mutex_lock(&lock);
    items++;
    pthread_cond_signal(&cv);         // lost entirely if nobody is waiting
    pthread_mutex_unlock(&lock);
}
```

---

### What they ask next

**"Why must the condition variable wait be in a `while` loop?"**
Because of spurious wakeups, which POSIX permits, and because another thread may consume the item between the signal and this thread reacquiring the lock. The predicate has to be re-tested.

**"What is the lost wakeup problem?"**
A thread tests a condition, finds it false, and is about to sleep when another thread signals. The signal is missed and the thread sleeps forever. Condition variables prevent it by releasing the mutex and blocking atomically.

**"When would you choose a semaphore over a condition variable?"**
When the event count matters and signals must not be lost, such as a producer-consumer queue with a bounded buffer. Condition variables suit waiting on a state you can re-check, like "the queue is non-empty".

**"Does Java have binary semaphores and mutexes separately?"**
Yes. `synchronized` and `ReentrantLock` are reentrant mutexes with ownership, `Semaphore` is a counting semaphore with an optional fairness setting, and `Condition` from a `ReentrantLock` is the condition variable.

**"Can you implement a mutex from a binary semaphore?"**
You can get mutual exclusion, but not ownership, so you lose recursive locking, priority inheritance and misuse detection. It is exclusion without the safety properties.

**The common wrong answer** is "a binary semaphore is a mutex with a count of one". Ownership is the difference, and the giveaway is that signalling from a thread that never waited is legal for one and an error for the other.

---

### Say this in the interview

*"No. Both allow one holder, but a mutex has ownership and a binary semaphore does not. A mutex records the locking thread and only that thread may unlock it. A binary semaphore is a counter capped at 1 that any thread may signal, whether or not it ever waited.*

*Three things follow. A semaphore can signal between threads, so it suits a handoff where the signaller is not the waiter, which a mutex cannot express. Priority inheritance, which fixes priority inversion by boosting the holder, requires knowing the holder, so only a mutex can implement it. And a mutex can detect misuse such as unlocking from the wrong thread, which a semaphore cannot. They also initialise differently: a mutex starts available, and a signalling semaphore starts at zero.*

*A recursive or reentrant mutex lets the owning thread lock it repeatedly, tracking a recursion count and releasing at zero. It exists so a locked function can call another that locks the same mutex, which would self-deadlock otherwise. It is only definable because of ownership.*

*A condition variable lets a thread wait for a predicate on shared state and is always paired with a mutex, because wait must release the mutex and block atomically to avoid the lost wakeup problem. Unlike a semaphore it is stateless: a signal with no waiter is lost, whereas a semaphore's count remembers. So condition variables suit waiting on re-checkable state, always inside a while loop because of spurious wakeups, and semaphores suit counting events that must not be missed."*
