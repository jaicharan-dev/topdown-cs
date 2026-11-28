---
id: 4-queues-and-async
title: "Queues and Asynchronous Work"
description: "Why exactly-once delivery does not exist, what to do instead, and the dual-write that quietly loses half your events"

sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Placing an order sends a confirmation email, updates inventory and notifies the warehouse. Do that synchronously or through a queue? If a queue, how do you guarantee the message is sent exactly once, and what happens when a consumer crashes halfway through?"

---

### Picture it

A restaurant kitchen.

A waiter takes your order and clips the ticket to a rail. They do not stand at the pass waiting for the food before going to the next table. The rail is the queue: it lets the dining room run at the speed of taking orders rather than at the speed of cooking, and it absorbs the moment when nine tables sit down at once.

Three things about that rail are the whole topic.

**The rail smooths, it does not accelerate.** The kitchen cooks at the same rate it always did. What the rail buys is that the waiter is not blocked and the rush does not turn people away. If orders arrive faster than the kitchen cooks for an entire evening, the rail just gets longer, and a very long rail is worse than a short one because the food at the far end is for people who left.

**A ticket can be cooked twice.** The chef takes a ticket, cooks it, and is knocked out before they can take it off the rail. The next chef sees a ticket that looks untouched. The usual answer is not a cleverer rail; it is that the pass checks whether table nine already has its food.

**The ticket and the till are two different things.** If the waiter rings up the order and then clips the ticket, and the clip misses, the customer is charged for food nobody is cooking. That is the dual-write problem, and it is the one that quietly breaks systems in production.

---

### The proper terms

#### What goes in the queue

The test is: **does the caller need the result to answer?**

Synchronous for anything the response depends on. Charging the card, reserving the stock, writing the order. If the user needs to be told it worked, it happens before you reply.

Asynchronous for anything that follows from the result. Emails, search indexing, analytics, warehouse notifications, thumbnails, recommendations. Work that is slow, that calls a third party, or that may fail and be retried without the user caring.

The order example splits straight down that line. Writing the order and reserving stock are synchronous, because "your order is placed" is a lie otherwise. The confirmation email and the warehouse notification are asynchronous, because an email provider being slow must not make checkout slow, and an email provider being down must not make checkout fail.

That last point is the real argument for the queue, and it is worth saying plainly: **a queue converts a dependency's downtime into a delay instead of an outage.**

#### Queue or log

They look similar on a diagram and behave differently.

**A message queue** (RabbitMQ, SQS) deletes a message once it is acknowledged. Work is distributed across consumers, each message goes to one of them, and the queue's depth is the backlog. Right for task distribution.

**A log** (Kafka, Kinesis) keeps messages for a retention period and tracks each consumer group's **offset**. Messages are not consumed so much as read past, so ten different consumer groups can each read the same events independently, and a new consumer can start from the beginning. Right for event streams with multiple interested parties, and for replay.

The question that decides it: **does more than one thing need these events, and might you want to replay them?** Order events almost always qualify, because analytics, search indexing and the warehouse all want them, and because "replay last Tuesday into the new service" is a request that will arrive eventually.

#### Exactly-once delivery does not exist

This is the heart of the question and the answer is counter-intuitive, so say it directly.

A consumer must process a message and acknowledge it. Those are two separate actions over a network, and there is no ordering of them that is safe.

**Acknowledge first, then process:** crash in between and the message is gone. That is **at-most-once**.

**Process first, then acknowledge:** crash in between and the message is redelivered. That is **at-least-once**.

There is no third ordering, and the impossibility is not an implementation gap. It is the Two Generals problem: no finite exchange of messages over an unreliable channel can make two parties certain about each other's state.

So the real design is: **at-least-once delivery, plus idempotent consumers.** Delivery may duplicate; processing must not. The duplicate is handled at the point of effect rather than prevented in transit.

When a broker advertises "exactly-once", it means exactly-once **processing** within a boundary it controls, by doing precisely this: Kafka's transactions tie the consumer's offset commit and the producer's output writes into one atomic unit. It is genuinely useful and it is strictly scoped. The moment your consumer calls an external email API, you are back to at-least-once, because the broker cannot roll back an email.

#### Making a consumer idempotent

Three ways, in increasing order of strength.

**A natural key with a unique constraint.** The best option when it fits. Insert the payment with the order id as a unique key, and the second delivery fails the constraint, which you catch and treat as success. The database enforces it, so there is no window.

**A processed-messages table.** Record each message id as handled, inside the same transaction as the work. The second delivery sees the row and returns. This works for anything with a database, and the critical detail is **the same transaction**: recording it separately recreates the dual-write problem one layer down.

**A deduplication cache.** Redis with a TTL, for effects that have no database to transact with. Weaker, because the TTL bounds how long you remember, and a redelivery after the TTL is processed again. Acceptable for an email where a duplicate is an annoyance rather than a loss.

The natural-key version is the one to reach for, because it has no window at all. Every other approach has a moment between checking and acting.

#### The dual-write problem, and the outbox

Here is the bug that is almost never mentioned and almost always present.

```python
def place_order(cart):
    with db.transaction():
        order = db.insert("orders", cart)       # 1
    queue.publish("order.placed", order.id)     # 2
```

Two systems, no transaction across them. If the process dies between 1 and 2, there is an order in the database that the warehouse will never hear about. Moving the publish inside the transaction only inverts the bug: the message goes out, the transaction rolls back, and the warehouse ships an order that does not exist.

**There is no two-phase commit here**, and reaching for one is the wrong instinct even where it is available, because it couples availability: the database and the broker must both be up for either to work.

The standard fix is the **transactional outbox**. Write the event into a table in the same database, inside the same transaction as the business change. One transaction, one system, atomic by construction. A separate process then reads unpublished rows and publishes them, marking them sent.

```python
def place_order(cart):
    with db.transaction():
        order = db.insert("orders", cart)
        db.insert("outbox", {
            "topic": "order.placed",
            "payload": {"order_id": order.id},
            "created_at": now(),
        })
    # Both rows commit together or neither does. The relay publishes
    # afterwards, and may publish twice, which is why consumers are
    # idempotent anyway.
```

The relay is either a poller (`SELECT ... WHERE published_at IS NULL`, publish, mark) or **change data capture** reading the database's replication log, which avoids the polling entirely. Either way the relay can crash after publishing and before marking, so it is itself at-least-once, which is fine: the consumers already handle duplicates.

#### Ordering, and why it costs you parallelism

Most brokers guarantee order only within a **partition** or a single queue. Spread across ten partitions, messages are parallel and unordered.

The lever is the **partition key**. Key on the entity whose order matters, usually an aggregate id: all events for order 123 go to the same partition and are strictly ordered relative to one another, while order 124 proceeds in parallel elsewhere. You get ordering where it matters and parallelism everywhere else.

Two costs follow. A **hot key** puts one entity's traffic on one partition, and that partition becomes the bottleneck. And **you cannot repartition freely**, because changing the partition count moves keys to different partitions and the ordering guarantee breaks across the change.

The better question is often whether you need ordering at all. If consumers are idempotent and events carry versions or timestamps, a consumer can discard anything older than what it has already applied, and out-of-order delivery stops mattering. **Commutative handlers beat ordered delivery**, because they cost nothing in parallelism.

#### Retries, backoff and the dead letter queue

A failed message is retried, and a naive retry loop is how one bad message takes down a consumer group.

**Exponential backoff with jitter.** Doubling the wait stops a struggling downstream being hammered; the jitter stops every retrying consumer waking at the same instant and recreating the spike they were backing off from.

**A retry limit, then a dead letter queue.** After N attempts the message moves to a DLQ, where it stops blocking the partition and waits for a human. Without a limit, a message that can never succeed, because it is malformed or references a deleted row, is retried forever. This is the **poison message**, and in an ordered partition it blocks every message behind it indefinitely.

**Monitor the DLQ.** A DLQ nobody looks at is a data loss mechanism with extra steps. The alert on it is part of the design, not an operational afterthought.

**Distinguish retryable from not.** A timeout is retryable. A validation failure is not, and retrying it twenty times just delays the inevitable while consuming capacity. Route the permanent failures to the DLQ immediately.

#### Backpressure, and the lie of the unbounded queue

A queue absorbs a spike. It does not absorb a sustained rate above what consumers can handle, and its depth is the clearest signal in the system.

**Depth flat and low:** healthy. **Depth spiking and draining:** working as designed. **Depth rising steadily:** consumers are under-provisioned and the queue is converting a throughput problem into a latency problem, quietly, until the messages at the back are too stale to be worth processing.

So the thing to alert on is not depth, it is **consumer lag in time**: how old is the oldest unprocessed message. "Four hundred thousand messages" means nothing without the drain rate. "Nine minutes behind" is immediately actionable.

And queues should be bounded. An unbounded queue does not prevent failure, it relocates it: instead of rejecting a request the client can retry, you accept it, hold it until it is worthless, and run out of memory or disk at an unpredictable moment. Rejecting early, with a 429 or a 503, is kinder than accepting work you will not do in time.

---

### In code

An idempotent consumer, with the dedup record in the same transaction as the work.

```python
MAX_ATTEMPTS = 5


def handle(message):
    try:
        with db.transaction():
            # The dedup record and the work commit together. If this were
            # a separate write, a crash between the two would either
            # reprocess the message or skip it, which is the dual-write
            # problem moved one layer down.
            inserted = db.execute(
                "INSERT INTO processed_messages (message_id, handled_at) "
                "VALUES (%s, now()) ON CONFLICT DO NOTHING",
                message.id,
            )
            if inserted.rowcount == 0:
                message.ack()           # already done, by us, earlier
                return

            apply_effect(message.payload)

        message.ack()

    except PermanentError:
        # Malformed, or references something that no longer exists.
        # Retrying cannot help, so it goes straight to the DLQ rather
        # than consuming five attempts proving it.
        dead_letter(message, reason="permanent")
        message.ack()

    except TransientError:
        if message.attempt >= MAX_ATTEMPTS:
            # A poison message in an ordered partition blocks everything
            # behind it, so the limit is what keeps the rest moving.
            dead_letter(message, reason="attempts exhausted")
            message.ack()
        else:
            # Jitter matters as much as the backoff. Without it every
            # consumer that failed together wakes together and rebuilds
            # the spike they were backing off from.
            delay = min(2 ** message.attempt, 300)
            message.nack(retry_after=delay * random.uniform(0.5, 1.5))
```

Three decisions in that code are the ones worth defending out loud: the dedup insert shares the transaction, permanent failures skip the retries entirely, and the backoff is jittered.

---

### What they ask next

**"Why not just use a database table as a queue?"**
For modest volumes it is a perfectly good answer, and saying so is better than reflexively naming Kafka. `SELECT ... FOR UPDATE SKIP LOCKED` gives you safe concurrent consumers in one line, you keep transactional semantics with the rest of your data, and you have one less system to operate. It stops being the right answer at high throughput, where the polling and the row churn hurt, and when you want fan-out to several independent consumer groups.

**"The consumer is slow. Do you add consumers?"**
Only up to the partition count: in a partitioned log, consumers beyond the number of partitions sit idle, because a partition is assigned to exactly one consumer in a group. So the first question is whether the work is partitioned finely enough, and the second is whether a single message is slow because of its own work or because it is waiting on something, since the fix for those two is different, more consumers against more concurrency inside one.

**"How do you handle a message whose schema changed?"**
Version the payload and keep consumers tolerant: ignore unknown fields, and treat missing fields as defaults. In a log the old messages are still there during the retention window, so a consumer deployed today may legitimately read a message written a week ago under the old shape. Adding fields is safe, removing or repurposing one is not, which is the same discipline as any API.

**"What if the same event needs to go to five services?"**
That is the argument for a log over a queue. Each service is its own consumer group with its own offset, reading the same partitions independently, so a slow consumer does not hold up the others and a new service can start from any point in the retention window.

**The common wrong answer** is claiming exactly-once delivery, usually because a broker's marketing page says it. **At-least-once plus idempotent consumers** is the correct answer, and explaining why the alternative is impossible rather than merely difficult is what makes it convincing.

---

### Say this in the interview

*"I would split it on one question: does the response depend on it. Writing the order and reserving stock are synchronous, because saying the order is placed is a lie otherwise. The confirmation email and the warehouse notification go on a queue, because an email provider being slow must not make checkout slow, and an email provider being down must not make checkout fail. That is the real argument for the queue: it turns a dependency's downtime into a delay rather than an outage.*

*On exactly-once, I would say up front that it does not exist as a delivery guarantee. A consumer has to process and acknowledge, those are two actions over a network, and either order loses. Acknowledge first and a crash loses the message, process first and a crash redelivers it. It is the Two Generals problem, so it is impossible rather than merely hard. The design is therefore at-least-once delivery plus idempotent consumers, where the duplicate is handled at the point of effect instead of being prevented in transit.*

*To make the consumer idempotent I would prefer a natural key with a unique constraint, like inserting the payment keyed by order id, because the database enforces it and there is no window between checking and acting. Where that does not fit, a processed-messages table, with the dedup row written in the same transaction as the work, because writing it separately just recreates the problem one layer down.*

*The bug I would raise unprompted is the dual write. Writing the order and then publishing the event is two systems with no transaction across them, so a crash in between leaves an order the warehouse never hears about, and publishing inside the transaction just inverts it. I would use a transactional outbox: insert the event into a table in the same transaction as the order, then have a relay publish from that table, either by polling or by reading the replication log with change data capture. The relay can publish and crash before marking the row, so it is at-least-once too, which is fine because the consumers are already idempotent.*

*For ordering I would key partitions by order id, so events for one order are strictly ordered while different orders run in parallel. But I would rather avoid needing it: if events carry a version and consumers discard anything older than what they have applied, order stops mattering and I keep the parallelism.*

*And I would bound the retries. Exponential backoff with jitter, then a dead letter queue after a handful of attempts, because a poison message in an ordered partition blocks everything behind it forever. The DLQ needs an alert, or it is just data loss with extra steps. The metric I would actually watch is not queue depth, it is how old the oldest unprocessed message is, because four hundred thousand messages means nothing without the drain rate and nine minutes behind is immediately actionable."*
