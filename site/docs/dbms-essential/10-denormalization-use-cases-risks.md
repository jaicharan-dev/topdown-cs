---
id: 10-denormalization-use-cases-risks
title: "Denormalization: When, Why & Architectural Risks"
description: "When to deliberately break normalization for read performance, and the risks that come with it: stale copies, hot-row contention, write amplification."
sidebar_position: 9
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is denormalization, when would you deliberately do it in production, and what are the severe risks involved?"

Think about a kitchen. A normalized schema is like keeping flour, sugar, and eggs in separate labeled bins — no waste, nothing duplicated. But if a customer orders a pancake, the chef has to measure and combine ingredients from four different bins every single time. A denormalized schema is like pre-mixing a big batch of pancake batter every morning: pouring it onto the griddle takes three seconds instead of four steps. The catch — if the batch is made wrong, every pancake made from it is wrong too.

**Denormalization** means deliberately duplicating data, or grouping it together, so reads are faster and you avoid expensive joins. It's a trade: you accept messier writes and some risk of staleness, in exchange for much faster reads.

This doesn't mean skipping normalization altogether. The usual rule in production is: **normalize to 3NF first**, so you clearly understand your entities and their rules, and only then **selectively denormalize** the specific hot paths that need it.

---

### When you'd actually do this

#### 1. You read way more than you write
On social feeds, product catalogs, or blogs, data gets written once and read millions of times. Running a 5-table `JOIN` on every page load burns CPU and disk I/O for no reason. If you duplicate the author's username directly onto the `posts` table, a single index lookup is enough.

#### 2. An aggregate gets computed over and over
Recomputing an expensive aggregate on every request is wasteful:
- *Example:* instead of running `SELECT COUNT(*) FROM comments WHERE post_id = 99` every time someone scrolls the feed, just store `comment_count INT DEFAULT 0` directly on the `posts` row and keep it updated.

#### 3. You need to freeze a snapshot in time
In billing and e-commerce, duplication isn't just an optimization — it's required:
- *Example:* `order_items` should store `unit_price_at_purchase`, and `orders` should store `shipping_address_at_checkout`. If the merchant raises prices or the user changes their address next week, old invoices must stay exactly as they were.

---

### The risks you're signing up for

| Risk | What goes wrong | How to deal with it |
| :--- | :--- | :--- |
| **Stale copies** | The duplicated value drifts out of sync when the source changes | Update it via a background job/event pipeline (Kafka, RabbitMQ) or a DB trigger |
| **Write amplification** | One logical change now means updating rows in several tables | Accept slower writes, push the extra updates to a background queue |
| **Hot-row lock contention** | Many transactions try to update the same pre-aggregated counter at once | **Counter sharding** (spread increments across N sub-rows) or a Redis write-back buffer |
| **Cache thrashing** | Wider duplicated columns mean fewer rows fit in the buffer pool's RAM | Only denormalize small, frequently-read columns — never duplicate big text/JSON blobs |

---

### The one risk worth drilling into: hot-row contention

Denormalizing a counter sounds harmless — until it isn't:

```sql
-- 1,000 concurrent "likes" all hit this exact row
UPDATE posts SET like_count = like_count + 1 WHERE post_id = 42;
```

Every `UPDATE` takes an exclusive lock on that row. If 1,000 people like a viral post in the same second, 999 of them queue up and wait for the lock to free. That queue causes latency spikes and timeouts.

Two common fixes:
1. **Write-back buffering:** increment the counter in Redis (`INCR`), and flush the batched total to Postgres every 30 seconds or so.
2. **Counter sharding:** split the counter into, say, 10 rows in a `post_counter_shards` table. Each increment picks a random shard, so the load spreads out — then you sum the shards when reading.

---

### A safer alternative: materialized views

Instead of manually duplicating columns and writing sync logic by hand, PostgreSQL and Oracle let you cache the result of an expensive join on disk, and refresh it on a schedule:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY post_summaries;
```

You get the fast reads of denormalization, while the underlying tables stay fully normalized.

---

### Code: normalized vs. denormalized vs. materialized view

```sql
-- -------------------------------------------------------------
-- 1. Normalized read: needs 2 joins and a GROUP BY
-- -------------------------------------------------------------
SELECT 
    p.post_id,
    p.title,
    u.username AS author_name,
    COUNT(c.comment_id) AS comment_count
FROM posts p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN comments c ON p.post_id = c.post_id
WHERE p.post_id = 101
GROUP BY p.post_id, p.title, u.username;

-- -------------------------------------------------------------
-- 2. Denormalized read: single-row lookup, sub-millisecond
-- -------------------------------------------------------------
-- Precondition: author_name and comment_count are stored directly on posts
SELECT 
    post_id,
    title,
    author_name,
    comment_count
FROM posts
WHERE post_id = 101;

-- -------------------------------------------------------------
-- 3. Materialized view: denormalized speed, normalized source of truth
-- -------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_post_summaries AS
SELECT 
    p.post_id,
    p.title,
    u.username AS author_name,
    COUNT(c.comment_id) AS comment_count
FROM posts p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN comments c ON p.post_id = c.post_id
GROUP BY p.post_id, p.title, u.username;

-- Unique index lets the refresh run CONCURRENTLY (non-blocking)
CREATE UNIQUE INDEX idx_mv_post_summaries_id ON mv_post_summaries (post_id);

-- Run this on a cron job — readers are never blocked
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_post_summaries;
```

---

### Say this in the interview

*"Denormalization trades write complexity and storage for faster, join-free reads. The main danger in high-concurrency systems is hot-row lock contention on shared counters, which you fix with counter sharding or a write-back buffer."*
