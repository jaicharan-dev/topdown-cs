---
id: 2-caching-strategies
title: "Caching Strategies and Invalidation"
description: "Where the cache sits, who writes to it, and the three failure modes that take the database down with them"

sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "You put Redis in front of your database. Walk me through what happens on a read and on a write. What goes wrong when a popular key expires, and what goes wrong when the cache and the database disagree?"

---

### Picture it

A library with a reading desk by the door.

The books people ask for most sit on the desk. Somebody asks for one, the librarian checks the desk first, hands it over, and nobody walks into the stacks. That is the whole idea, and it works because asking is far more common than changing.

Three things go wrong with the desk, and they are the three things that go wrong with every cache.

**The desk is full.** Something has to go back to the stacks to make room, and choosing badly means the next person waits.

**A book on the desk is out of date.** Someone edited the real copy in the stacks and the desk still has last week's. Every reader now gets the wrong answer, confidently and quickly.

**The one book everyone wants goes back to the stacks at closing time.** At opening, four hundred people ask for it at once, and all four hundred are sent into the stacks together, because the desk is empty and nobody has put it back yet.

The third one is the one that takes systems down, and it is the one candidates forget.

---

### The proper terms

#### Where the cache sits

Caching is not one thing. The same request may pass four of them.

**Client cache.** The browser, keyed by URL, governed by `Cache-Control` and validated with `ETag`. Free, closest to the user, and the one you control least.

**CDN.** A reverse proxy cache near the user. Right for anything static or public, and for the bandwidth problem rather than the database problem.

**Application cache.** Redis or Memcached, shared by every app server. This is what people mean by "adding a cache", and it is what the rest of this page is about.

**Database cache.** The buffer pool. Already there, already tuned, not something you design.

The rule of thumb is **cache as close to the reader as the correctness allows**. A public product page can be cached in a CDN. A user's own balance cannot be cached anywhere shared, and arguably cannot be cached at all.

#### Cache-aside: the one you will describe

Also called lazy loading. The application owns the cache, and the cache knows nothing about the database.

**On read:** look in the cache. On a hit, return it. On a miss, read the database, write it into the cache with a TTL, and return it.

**On write:** write the database, then **delete** the key.

It is the default for good reasons. Only requested data is ever cached, so a cold cache costs memory proportional to what is actually read. A cache outage is a latency problem rather than a correctness problem, because every miss falls through to the database. And the application is free to cache a shape that is not a row: the assembled object, the joined result, the rendered fragment.

The costs are real too. Every miss pays database latency plus cache latency. And the first request for anything is always a miss, which is why a cold start after a deploy or a Redis restart is the dangerous moment.

#### Delete, do not update

This is the single most commonly failed detail.

On a write, the instinct is to write the database and then write the new value into the cache. **Do not.** Delete the key instead and let the next read repopulate it.

Two writers racing make the reason concrete. A sets the value to 1, B sets it to 2. The database ends at 2 because B's transaction committed last. But if each also writes the cache, the ordering of those two cache writes is independent of the ordering of the two commits, and the cache can perfectly well end up holding 1. Nothing will ever correct it, because nothing knows it is wrong, and it will survive until the TTL expires.

Deleting is **idempotent and order-independent**. Two concurrent deletes leave the same state as one. The worst outcome is an extra miss.

#### Write-through, write-behind, read-through

**Write-through.** Every write goes to the cache, and the cache synchronously writes to the database. The cache is never stale. The price is write latency on every write, and a cache full of data nobody has asked for. Pairs naturally with read-through.

**Write-behind, or write-back.** The write lands in the cache and is flushed to the database later, in batches. Very fast writes, excellent for high-volume counters and metrics. It can also lose data: an acknowledged write that only exists in memory is gone if that node dies. Use it where losing a few seconds of counter increments is survivable, and never for money.

**Read-through.** The cache itself fetches from the database on a miss, so the application only ever talks to the cache. Tidier application code, at the price of a cache that now needs to know your schema and that becomes a hard dependency rather than an optimisation.

| Strategy | Stale risk | Write cost | Loses data |
| --- | --- | --- | --- |
| Cache-aside | Window between commit and delete | One delete | No |
| Write-through | None | Two synchronous writes | No |
| Write-behind | None in cache, lag in database | One write | Yes, on node loss |

#### Eviction

When memory fills, something leaves.

**LRU**, least recently used, is the sane default and what Redis means by `allkeys-lru`. **LFU**, least frequently used, is better when a small set is popular over a long period and a burst of one-off reads would otherwise evict it. **TTL-only** eviction, where nothing is evicted early and keys only expire, is right when the working set genuinely fits in memory.

The one to watch is the interaction with TTL. A key with no TTL in an LRU cache will sit there until pressure removes it, which can be days, which means **a bug that writes a wrong value with no TTL is a bug with no end date**. Give everything a TTL, even the things that should never change, because the TTL is the backstop for every invalidation you forget to write.

#### The three failure modes

These are the ones interviewers are actually probing for.

**Cache stampede, or the thundering herd.** A popular key expires. In the microsecond before anything repopulates it, every concurrent request for it misses, and all of them hit the database at once. One key with a thousand readers a second becomes a thousand simultaneous identical queries. The database is sized for the cache's miss rate, not for this, and it falls over.

Three defences, usually combined. **A lock, or single flight**: the first miss takes a short-lived lock and recomputes, everyone else waits briefly or serves the stale value. **Probabilistic early expiry**: as a key approaches its TTL, each reader has a small and rising chance of refreshing it early, so the refresh is spread out and the key is rarely allowed to actually expire. **Jittered TTLs**: never set the same TTL on keys written together, or they expire together.

**Cache penetration.** Requests for a key that does not exist in the database either. Every one is a miss, every one hits the database, and the cache never helps because there is nothing to store. Malicious traffic does this deliberately with random ids. The fix is to **cache the absence**, with a short TTL, and for high volumes a **Bloom filter** in front that can say "definitely not present" without touching anything.

**Cache avalanche.** A large number of keys expire at the same moment, or the cache itself restarts, and the whole working set misses at once. This is the stampede at the scale of the entire cache, and it is how a Redis failover takes the database down three seconds later. Jitter every TTL, and make sure the database tier has enough headroom, or a circuit breaker, to survive a cold cache.

#### The consistency window nobody can close

Cache-aside writes the database and then deletes the key. Those are two operations and there is no transaction across them.

If the delete fails, the cache is stale until the TTL. If the process dies between the two, the same. And there is a genuine race even when both succeed: a reader can miss, read the old value from the database, be paused by the scheduler, have a writer commit and delete in the meantime, and then write its stale read into the cache after the delete.

That race is real, rare, and not fully solvable with a cache-aside design. **The honest answer is that a TTL is the bound on the damage**, and the design question is what window the product can tolerate. If the answer is "none", the data should not be in a cache.

For the failed-delete case specifically, the practical fix is to stop relying on the application to do the deleting: tail the database's replication log with **change data capture** and invalidate from there. The log is the same thing that already guarantees the write, so the invalidation inherits its durability.

---

### In code

Cache-aside with the three defences, written out.

```python
import random, time

TTL = 300           # five minutes
LOCK_TTL = 5        # how long one refresher may hold the key
EARLY_BETA = 1.0    # how aggressively to refresh before expiry


def get_user(user_id):
    key = f"user:{user_id}"
    cached = redis.get(key)

    if cached is not None:
        entry = decode(cached)

        # Probabilistic early expiry. The closer to the TTL, and the more
        # expensive the recompute was, the more likely this reader is the
        # one that refreshes it. The key is rarely allowed to actually
        # expire, so there is rarely a moment when everyone misses at once.
        age = time.time() - entry["written_at"]
        if age + entry["cost"] * EARLY_BETA * -math.log(random.random()) < TTL:
            return entry["value"]

    # A miss, or an early refresh. Exactly one caller gets the lock and
    # queries the database; the rest serve the stale value if they have
    # one, which is nearly always better than queueing behind a database.
    if not redis.set(f"lock:{key}", "1", nx=True, ex=LOCK_TTL):
        if cached is not None:
            return decode(cached)["value"]
        time.sleep(0.05)
        return get_user(user_id)

    try:
        started = time.time()
        value = db.query("SELECT * FROM users WHERE id = %s", user_id)
        cost = time.time() - started

        # Cache the absence too, briefly. Without this, a flood of
        # requests for ids that do not exist bypasses the cache entirely
        # and every one of them reaches the database.
        ttl = TTL if value else 30

        # Jitter, so keys written together do not expire together.
        ttl = int(ttl * random.uniform(0.9, 1.1))

        redis.set(key, encode({
            "value": value,
            "written_at": time.time(),
            "cost": cost,
        }), ex=ttl)
        return value
    finally:
        redis.delete(f"lock:{key}")


def update_user(user_id, patch):
    db.update("users", user_id, patch)
    # Delete, never write. Two writers racing can commit in one order and
    # write the cache in the other, and the wrong value would then outlive
    # both of them.
    redis.delete(f"user:{user_id}")
```

Four defences in forty lines: early expiry, single flight, negative caching and jitter. Mentioning the lock alone is a decent answer. Mentioning why you delete rather than write, and why TTLs are jittered, is the one that lands.

---

### What they ask next

**"What hit rate should you expect, and what does a bad one mean?"**
For a read-heavy product with a sane working set, **above 90%** is normal and above 95% is common. A low hit rate means one of three things: the working set does not fit in memory, so size up or shard; the TTL is shorter than the re-read interval, so nothing survives to be used twice; or the key is too specific, which is what happens when a user id or a timestamp sneaks into a key that did not need one.

**"Where do you put the TTL if the data must never be stale?"**
Then you do not cache it, or you cache it behind a version. The usual trick is to put a version or a content hash in the key itself, so a write creates a **new key** rather than invalidating an old one. Nothing is ever stale because nothing is ever overwritten, and the old entries fall out by eviction. It costs memory, and it is how CDNs solve the same problem with versioned filenames.

**"Your cache is a single Redis. What happens when it fails?"**
With cache-aside, every read becomes a database read, so the question is whether the database survives the full read load. Usually it does not, which means the cache stopped being an optimisation and became a dependency without anyone deciding that. The mitigations are a replica with automatic failover, a small in-process cache on each app server to blunt the first seconds, and a circuit breaker that sheds load rather than letting the database queue to death.

**"How do you cache something that is per-user?"**
Carefully, because the cardinality is the user count rather than the content count, and the hit rate collapses. Usually the right move is to split it: cache the shared, expensive part once, and compose the per-user part on read. A feed is the classic example, where the posts are shared and only the ordering and the read-state are personal.

**The common wrong answer** is describing cache-aside and stopping. Every candidate knows the happy path. The interview is in the three failure modes, and the single sharpest detail you can offer is **delete the key, do not update it**, with the two-writers race to explain why.

---

### Say this in the interview

*"The default is cache-aside. On a read I check Redis, and on a miss I read the database, write the value back with a TTL and return it. On a write I write the database and then delete the key. I delete rather than update, which matters: if two writers race, the order their cache writes land in is independent of the order their transactions committed, so the cache can end up holding the value that lost, and nothing will ever correct it. Deleting is idempotent and order-independent, and the worst case is one extra miss.*

*Cache-aside is the default because only requested data is cached, and because a cache outage is a latency problem rather than a correctness problem. Write-through keeps the cache always fresh at the cost of latency on every write and a cache full of things nobody asked for. Write-behind is very fast and can lose acknowledged writes, so it suits counters and metrics and never money.*

*The three things I would design against are stampede, penetration and avalanche. Stampede is a popular key expiring and every concurrent reader missing at once, so one key becomes a thousand identical queries. I would use a short lock so one caller recomputes while the rest serve stale, probabilistic early expiry so the key is refreshed before it ever actually expires, and jittered TTLs so keys written together do not die together. Penetration is requests for ids that do not exist, where the cache can never help, so I cache the absence with a short TTL and put a Bloom filter in front if the volume justifies it. Avalanche is the whole working set expiring at once or Redis restarting, which is how a cache failover takes the database down a few seconds later, so I want jitter everywhere and enough database headroom or a circuit breaker to survive a cold cache.*

*The part I would be honest about is that cache-aside has a consistency window I cannot fully close. A reader can miss, read the old value, get descheduled, and write it back after a writer has already deleted the key. It is rare and it is real, and the TTL is the bound on how long it lasts. If the product can tolerate no staleness at all, the answer is not a better invalidation scheme, it is not caching that value. If the worry is the delete failing rather than the race, I would invalidate from the database's replication log with change data capture, so the invalidation is as durable as the write itself."*
