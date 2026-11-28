---
id: 3-rate-limiting
title: "Rate Limiting"
description: "Four algorithms, the boundary bug that lets through twice the limit, and why the counter cannot live in your app server"

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Limit each API key to 100 requests a minute. Which algorithm, and why? Now you have twenty app servers behind a load balancer: where does the counter live, and what happens when that store is slow?"

---

### Picture it

A nightclub with a capacity of a hundred.

**The simplest door policy** is to count people in, and reset the count on the hour. It works, and it has one famous hole: a hundred people walk in at 10:59 and another hundred at 11:00. Two hundred people arrived inside two minutes, and the door never broke its own rule.

**A better policy** is a bouncer with a stack of a hundred tokens who hands one out per entry and gets a new token every thirty-six seconds. A queue that arrives all at once can spend the whole stack at the door, which is deliberate: a club that lets nobody in faster than one person every thirty-six seconds would be a strange club. Once the stack is empty, entry is paced by the refill.

**The strictest policy** is a turnstile that physically admits one person every thirty-six seconds, no stack, no burst. Smooth, fair, and it will annoy anyone who wanted to walk in with five friends.

Those are a fixed window, a token bucket and a leaky bucket, and the choice between them is entirely a question of **whether bursts are a feature or a problem**.

---

### The proper terms

#### Fixed window counter

Keep a count per key per time window. Increment on each request, reject above the limit, and the counter resets when the window rolls over.

It is one integer and one `INCR`, which is as cheap as this gets, and it is easy to explain to users: "100 per minute, resets on the minute".

**The boundary problem** is the reason it is rarely the final answer. A client can send the full limit at the end of one window and the full limit at the start of the next, so **twice the limit passes in a span shorter than one window**. For a limit of 100 a minute, that is 200 requests inside a couple of seconds. If the limit exists to protect a downstream service, the protection has a hole exactly the size of the thing you were defending against.

#### Sliding window log

Store the timestamp of every request in a sorted set per key. On each request, drop everything older than the window and count what remains.

**Perfectly accurate.** There is no boundary, because the window moves with the request rather than with the clock.

The cost is memory and it is not subtle: you store one entry per request per key for the length of the window. A limit of 10,000 an hour is 10,000 timestamps per key held for an hour, and a million keys makes that ten billion entries. It is the right answer for low limits on expensive operations, such as five password resets an hour, and the wrong answer for anything high volume.

#### Sliding window counter

The compromise, and the one most production systems actually run.

Keep a fixed-window counter, but on each request take a weighted blend of the current window and the previous one, in proportion to how far into the current window you are.

```text
estimate = current_count + previous_count * (1 - elapsed_fraction)
```

Thirty seconds into a minute-long window, with 80 requests in the previous window and 30 so far in this one, the estimate is `30 + 80 * 0.5 = 70`.

This is **two integers per key** rather than one entry per request, and it removes the boundary spike almost entirely. It is an approximation: it assumes the previous window's requests were spread evenly across it, which they were not. In practice the error is small and in both directions, and the memory saving is several orders of magnitude.

#### Token bucket

A bucket holds up to `capacity` tokens and refills at `rate` tokens per second. A request takes one token, or is rejected if the bucket is empty.

It is the most used algorithm in real systems, because the two parameters say two genuinely different things. **Capacity is the burst you will tolerate.** **Rate is the sustained throughput you will allow.** Most APIs want exactly that shape: a client may fire twenty requests at once when a page loads, but may not sustain twenty a second forever.

It is also cheap to store, because you do not need a timer. You keep the token count and the timestamp of the last refill, and compute the refill lazily on the next request:

```text
tokens = min(capacity, tokens + (now - last_refill) * rate)
```

That is two values per key and no background job.

#### Leaky bucket

Requests enter a queue and leave at a fixed rate. If the queue is full, the request is rejected.

The output is perfectly smooth, which is its purpose: it is the right choice when the thing downstream has a hard rate limit of its own, such as a third-party API that charges per call, or a modem, or anything with a physical throughput.

The costs are that it **adds latency by design**, since a request may wait in the queue, and that it allows no burst at all. For a user-facing API that is usually the wrong trade, because a slow success is often worse than a fast rejection the client can retry.

| Algorithm | Memory per key | Bursts | Accuracy |
| --- | --- | --- | --- |
| Fixed window | 1 counter | Allowed, plus the boundary hole | Poor at boundaries |
| Sliding log | 1 entry per request | Allowed | Exact |
| Sliding counter | 2 counters | Allowed | Very close |
| Token bucket | 2 values | Allowed, bounded by capacity | Exact |
| Leaky bucket | Queue | None | Exact, smoothed |

#### The counter cannot live in the app server

This is the part the question is really about.

With twenty app servers behind a load balancer, a counter in each process means the effective limit is twenty times what you configured, and it moves around depending on how the load balancer distributes traffic. **A per-process counter is not a rate limit, it is twenty rate limits.**

So the state goes in a shared store, nearly always Redis, and three new problems arrive with it.

**It must be atomic.** Read-then-write from twenty servers races, and two requests can both read 99 and both write 100. Use `INCR`, which is atomic by itself, or put the whole check in a **Lua script**, which Redis runs atomically. Never read and write as two round trips.

**It costs a network hop on every request.** Half a millisecond on a request that might only take two is a real tax. The usual mitigation is to only consult the shared store for keys near their limit, or to let each server take a **lease** of N tokens from the shared bucket and spend them locally, refreshing when low. That trades a little accuracy for a lot of latency.

**It is a new dependency on the hot path.** Which leads directly to the next question.

#### Fail open or fail closed

When Redis is unreachable, you choose between rejecting every request and allowing every request. There is no third option, and the right answer depends entirely on what the limiter is for.

**Fail open** for ordinary API quotas. The limiter exists to enforce fairness and billing, and a limiter outage becoming a total outage is a far worse failure than a few minutes of unmetered usage.

**Fail closed** when the limiter is the protection, not the policy. A login endpoint's limiter exists to stop credential stuffing, and failing open there turns a cache outage into an open door.

Say which one you are choosing and why. Candidates who have thought about this say it unprompted, and it is one of the clearest signals in the whole question.

#### What the client gets back

The status code is **429 Too Many Requests**, and it should carry **`Retry-After`** with the number of seconds to wait.

Alongside it, the conventional headers are `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`, sent on **every** response rather than only on rejections, so a well-behaved client can slow down before it is cut off rather than after.

And the rejection has to be cheaper than the work it prevents. A limiter that does a database lookup to decide whether to reject is a denial-of-service amplifier, because the attacker has made you do work by sending traffic you then throw away.

---

### In code

Token bucket in a Lua script, so the read, the refill and the spend are one atomic operation.

```lua
-- KEYS[1]  the bucket, a hash of { tokens, last_refill }
-- ARGV[1]  capacity        maximum burst
-- ARGV[2]  rate            tokens added per second
-- ARGV[3]  now             caller's clock, in seconds
-- ARGV[4]  cost            tokens this request wants, usually 1

local bucket   = redis.call('HMGET', KEYS[1], 'tokens', 'last_refill')
local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])
local now      = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])

-- A key that has expired or never existed starts full, which is what
-- makes a first-time caller's burst work.
local tokens = tonumber(bucket[1]) or capacity
local last   = tonumber(bucket[2]) or now

-- Refill lazily. No background job, no timer: the tokens that would have
-- accrued since the last request are added at the moment they are needed.
tokens = math.min(capacity, tokens + (now - last) * rate)

local allowed = tokens >= cost
if allowed then
  tokens = tokens - cost
end

redis.call('HMSET', KEYS[1], 'tokens', tokens, 'last_refill', now)
-- Expire an idle bucket. Without this, every key a system has ever seen
-- stays in memory forever, and the limiter becomes the memory leak.
redis.call('EXPIRE', KEYS[1], math.ceil(capacity / rate) * 2)

return { allowed and 1 or 0, tokens }
```

Two details in there are worth saying out loud.

**The clock comes from the caller, not from Redis.** That is a deliberate choice and a trade: it keeps the script deterministic, which matters for replication, but it means clock skew between app servers slightly affects refill. Using Redis's own `TIME` makes it skew-proof and makes the script non-deterministic, which older Redis replication modes disliked. Either is defensible; knowing there is a choice is the point.

**The key expires.** A rate limiter keyed by API key, or worse by IP, accumulates one key per distinct caller forever. The TTL is what stops the limiter from being the thing that runs out of memory.

---

### What they ask next

**"What do you key on?"**
Whatever identifies the party you are limiting, and usually several at once: per API key for quota, per user for fairness, per IP for anonymous abuse, and a global limit as a backstop for the service itself. They are checked together and the strictest one wins. Keying on IP alone is weak, because a corporate NAT shares one address across thousands of people and a determined attacker has thousands of addresses.

**"Should every endpoint have the same limit?"**
No, and saying so is the better answer. A read that hits a cache and a report that runs for ten seconds are not the same cost. Either give expensive endpoints their own lower limits, or make the limiter take a **cost** per request, which the token bucket supports directly, since a request can spend five tokens instead of one.

**"Where in the stack does it go?"**
As far forward as possible, because the whole point is to spend as little as possible on rejected traffic. An API gateway or a reverse proxy is the usual home, which also means one implementation rather than one per service. Volumetric attacks belong even further out, at the CDN or the network edge, since traffic that reaches your gateway has already cost you bandwidth.

**"How do you test it?"**
The interesting cases are not the happy path. Fire exactly the limit and check nothing is rejected; fire the limit plus one and check the rejection carries `Retry-After`; fire from several servers at once and check the shared counter actually holds the global limit rather than a multiple of it; and kill Redis mid-test to confirm the fail-open or fail-closed behaviour is the one you intended rather than whatever the exception handler happened to do.

**The common wrong answer** is naming token bucket and stopping. The algorithm is the easy half. The half that separates answers is **where the state lives once there is more than one server**, and that it has to be atomic, that it adds a hop to every request, and that you have made a deliberate choice about what happens when it is down.

---

### Say this in the interview

*"For a general API limit I would use a token bucket, because its two parameters map onto the two things I actually want to say. Capacity is the burst I will tolerate, rate is the sustained throughput I will allow, and most clients legitimately fire a handful of requests when a page loads and should not be sustaining that forever. It is also cheap to store: the token count and the last refill time, with the refill computed lazily on the next request, so there is no background job.*

*I would not use a fixed window, because of the boundary. A client sends the full limit at the end of one window and the full limit at the start of the next, so twice the limit gets through in a couple of seconds, which is exactly the thing the limit was protecting against. A sliding window log fixes that exactly, but it stores one timestamp per request per key, so it only suits low limits on expensive operations like password resets. The sliding window counter is the usual compromise: two integers, and a weighted blend of the current and previous windows, which removes the boundary spike for a small approximation error.*

*With twenty app servers, a counter inside each process is not one limit, it is twenty, so the state goes in Redis. That brings three things. It has to be atomic, so either a plain INCR or the whole check in a Lua script, never a read and a write as two round trips. It costs a network hop on every request, which I would mitigate by letting each server lease a block of tokens and spend them locally, trading a little accuracy for latency. And it is a new dependency on the hot path.*

*So I would decide up front whether to fail open or fail closed when Redis is down. For ordinary API quotas I fail open, because a limiter outage turning into a total outage is far worse than a few minutes of unmetered traffic. For a login endpoint I fail closed, because there the limiter is the protection against credential stuffing rather than a billing policy, and failing open leaves the door wide open.*

*Rejections return 429 with Retry-After, and I would send the limit, remaining and reset headers on every response rather than only on failures, so a good client can slow down before it gets cut off. I would also put the limiter at the gateway rather than in each service, because the entire point is to spend as little as possible on traffic you are about to throw away."*
