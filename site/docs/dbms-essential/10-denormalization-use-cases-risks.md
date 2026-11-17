---
id: 10-denormalization-use-cases-risks
title: "Denormalization: When, Why & Architectural Risks"
description: "Buying read speed with redundancy, and taking on the job of keeping the copies honest"

sidebar_position: 10
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is denormalization, when would you deliberately do it in production, and what are the severe risks involved?"

---

### Picture it

A library keeps one card per book and one card per author, and the book card points at the author card. Nothing is written twice, so nothing can ever disagree.

But every enquiry about a book now needs two cards fetched instead of one, and the enquiry desk handles ten thousand a day. So the librarian writes the author's name **onto the book cards too**.

Enquiries get faster immediately. And the librarian has just taken on a job she did not have before: **whenever an author's name changes, she must find and correct every book card by that author.** If she misses one, the library now says two different things, and there is nothing on either card indicating which is right.

Three things about this are the whole answer.

**She did it on purpose, and only after measuring.** She did not start out with messy cards; she had a clean system and chose to spend some of its cleanliness on speed. That is denormalization. Starting with messy cards is not denormalization, it is just a bad filing system.

**She took on a duty the filing system used to handle for her.** Before, the author's name was in one place, so it was impossible for it to be inconsistent. Now consistency depends on her remembering, every time, forever. The guarantee moved from the structure into a person.

**It can make things slower, which nobody expects.** The book cards are now wider, so fewer fit in each drawer, so a search through all of them pulls open more drawers. The query she optimised got faster and a different one got worse.

And the worst version: if some book cards live in another building, she **cannot** correct them in the same moment as the local ones. There will always be a window in which the two buildings disagree, and she has to decide what to do about that.

---

### The proper terms

#### What denormalization is

**Denormalization** is the deliberate introduction of **redundancy** into an already-normalised schema to improve **read performance**, accepting the anomalies that normalization existed to remove.

The framing matters, and it is the first thing to say: denormalization is **not** the absence of normalization. It is **normalising first, then selectively and knowingly reversing specific decisions**, with a plan for keeping the copies in step. A schema that was never normalised is not denormalised; it is unanalysed.

What is being traded is explicit: **you buy read speed with write cost and the risk of divergence.**

#### When to do it deliberately

**A measured join bottleneck on a read-heavy path.** The word doing the work is **measured**. If a query plan shows the join is the cost, and the workload is overwhelmingly reads, duplicating a column to avoid it is reasonable. Denormalising on a guess is how schemas acquire redundancy that buys nothing.

**Expensive aggregates computed on demand.** A `comment_count` on a post, a `total` on an order. Counting a million child rows on every page view is far worse than maintaining a counter, and the aggregate is recomputable, so drift is detectable and repairable by a reconciliation job.

**Analytical workloads.** This is where denormalization is the **default**, not the exception. A **star schema** has a wide **fact** table joined to deliberately denormalised **dimension** tables, and a snowflake schema normalises those dimensions back. Analytical queries scan huge ranges and aggregate, so pre-joined wide tables and columnar storage win, and the data is typically written once by a pipeline, which removes the update risk almost entirely.

**Avoiding a join that is impossible rather than slow.** This is the strongest modern justification. If the data lives in **different shards**, different services or different databases, there is no join to optimise. Duplicating the fields a service needs into its own store is the standard pattern, and the alternative is a synchronous call to another service on every read.

**Enabling an index.** A **derived column** that exists so it can be indexed, such as a lowercased email or a concatenated full name. Most engines now offer generated columns or expression indexes, which do this with the engine maintaining the value, which is strictly better than doing it in application code.

**Document data models.** In a document store, embedding related data so a document can be read in a single operation is the idiomatic design rather than a compromise, because there is no join to fall back on.

One important distinction to draw, because interviewers like it: **storing a historical value is not denormalization.** An order that records the price and delivery address **as they were at purchase** is not duplicating the product's current price; it is recording a **different fact**, which happened to have the same value once. It must never be updated when the product changes. Treating it as redundancy and "fixing" it is a real bug.

#### The risks

**Write amplification.** One logical change becomes many physical writes. Renaming an author updates every book row. The write path gets slower and longer, and it now touches more rows, which interacts badly with everything below.

**The update anomaly comes back, and the guarantee moves into application code.** This is the serious one. In a normalised schema it was **structurally impossible** for the two copies to disagree, because there was one copy. Now consistency depends on every code path remembering, including the ones written next year by someone who has not read this discussion. Within one database a transaction can at least make the updates atomic; **across services or shards it cannot**, so there is a window of inconsistency by construction and you must decide what is acceptable during it.

**Reads can get slower.** Wider rows mean **fewer rows per page**, so a scan reads more pages, the **buffer cache holds less useful data**, and the hit ratio falls. You can optimise one query and regress every full scan and every other query competing for the same cache. This is the risk people consistently fail to anticipate.

**Lock contention and hot rows.** A counter on a popular row **serialises** every writer touching it. A `like_count` on a viral post becomes a single-row bottleneck, since each increment needs an exclusive lock, and throughput collapses to one write at a time. Mitigations exist, such as **sharded counters** summing many rows, and they add their own complexity.

**Schema rigidity.** A denormalised shape encodes **today's** access patterns. A new access pattern means a migration plus a **backfill** over the whole table, which on a large table is an operational project with its own risk, rather than the new query a normalised schema would have allowed immediately.

**An ongoing reconciliation burden.** Because drift is now possible, you need to **detect** it: a periodic job recomputing the aggregate and comparing, with alerting and a repair path. Teams routinely add the denormalised column and never add this, so the drift is discovered by a customer.

**Ambiguous source of truth.** When a value exists in two places, every future reader has to know which one is authoritative. Without that written down, bug reports become archaeology.

#### How to take the risk safely

**Prefer a mechanism the database maintains.** A **materialised view**, a **generated column** or an **expression index** keeps the redundancy inside the engine, so the engine owns the consistency rather than your application. This should always be the first option considered.

**Designate one source of truth** and derive every copy from it, never the reverse.

**Write the copies in the same transaction** where the engine allows it, so they cannot diverge within a single database.

**Propagate asynchronously with idempotency** where it cannot: **change data capture** or an event stream, with handlers safe to replay, and explicit acceptance that the copy is eventually consistent.

**Build the reconciliation job at the same time as the denormalisation**, not after the first incident.

**Measure both directions.** Confirm the read you targeted improved **and** that write latency and full-scan performance did not regress unacceptably.

---

### In code

```sql
-- Normalised: the author's name exists exactly once
SELECT b.title, a.name
FROM   books b JOIN authors a ON a.id = b.author_id
WHERE  b.id = 42;
-- correct and impossible to make inconsistent, but it is a join
-- on every one of ten thousand reads a day

-- Denormalised: the name is copied onto every book row
ALTER TABLE books ADD COLUMN author_name TEXT;
SELECT title, author_name FROM books WHERE id = 42;   -- no join

-- and here is the duty you just took on:
UPDATE authors SET name = 'R. Narayan' WHERE id = 7;
UPDATE books   SET author_name = 'R. Narayan' WHERE author_id = 7;
--     ^ miss this second statement, or crash between them outside a
--       transaction, and the database now asserts two different names
--       with nothing to indicate which is right
```

```sql
-- Prefer a mechanism the ENGINE maintains, so the engine owns consistency

-- a generated column: derived, indexable, cannot drift
ALTER TABLE users
  ADD COLUMN email_lower TEXT GENERATED ALWAYS AS (lower(email)) STORED;
CREATE INDEX idx_users_email_lower ON users (email_lower);

-- a materialised view: the redundancy is declared, and refreshing it
-- is the database's job rather than scattered application code
CREATE MATERIALIZED VIEW post_stats AS
SELECT p.id, p.title, COUNT(c.id) AS comment_count
FROM   posts p LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id, p.title;

REFRESH MATERIALIZED VIEW CONCURRENTLY post_stats;
```

```text
What the trade actually costs, in both directions:

  READ you optimised
      books JOIN authors        -> two page reads
      books only                -> one page read          BETTER

  WRITE you did not think about
      rename one author         -> 1 row  (normalised)
                                -> 4,000 rows (denormalised)   WORSE

  EVERY OTHER READ, which is the one people miss
      books row width 120 bytes -> ~68 rows per 8 KB page
      plus author_name          -> ~48 rows per 8 KB page
      a full scan of 1M rows    -> 14,700 pages becomes 20,800
      and the buffer cache now holds FEWER useful rows,
      so the hit ratio falls for queries that never wanted the column

  You optimised one query and regressed every scan plus everything
  competing for the same cache.
```

```text
The hot row problem, which is a correctness-shaped performance bug:

  UPDATE posts SET like_count = like_count + 1 WHERE id = 42;

  post 42 goes viral:
      every increment needs an EXCLUSIVE row lock on the SAME row
      -> writers serialise, one at a time, however many cores you have
      -> throughput collapses and lock waits cascade into timeouts

  mitigation: a sharded counter
      INSERT INTO like_shards (post_id, shard, n) VALUES (42, random, 1)
      SELECT SUM(n) FROM like_shards WHERE post_id = 42;
      -> writes spread across many rows, reads pay a small aggregate
      -> and now you have two mechanisms to keep honest
```

```text
Where the guarantee goes when you denormalise across a boundary:

  ONE DATABASE
      BEGIN;
        UPDATE authors ...;
        UPDATE books   ...;
      COMMIT;             -> atomic. They cannot diverge.

  TWO SERVICES / TWO SHARDS
      service A: UPDATE authors ...       commits
      ...  window of inconsistency  ...   <- unavoidable, by construction
      service B: UPDATE books   ...       commits, or fails, or retries

      -> there is no transaction spanning both, so you must choose:
         change data capture or an event stream, handlers that are
         idempotent so they can be replayed, and an explicit statement
         that the copy is eventually consistent

      -> and a reconciliation job, built at the same time as the
         denormalisation and not after the first incident
```

---

### What they ask next

**"Is denormalization just bad design?"**
No, but it is a **decision with a bill attached**. Done after measurement, with a single source of truth, an engine-maintained mechanism where possible and a reconciliation job, it is sound engineering. Done pre-emptively on a guess, it is redundancy with no benefit and all of the cost.

**"Which risk surprises people most?"**
That reads can get slower. A wider row means fewer rows per page, so scans read more pages and the buffer cache holds less useful data. The targeted query improves and unrelated queries regress, because they are competing for the same cache.

**"How is a materialised view different from denormalising by hand?"**
The redundancy is **declared** and the engine maintains it, so refreshing is an operation you schedule rather than a rule every code path must remember. You still choose when it refreshes, and therefore how stale it may be, but you cannot forget to update it in one branch of one service.

**"How do you keep copies consistent across services?"**
You cannot do it atomically, so you accept **eventual consistency** and engineer for it: one authoritative writer, propagation by change data capture or events, idempotent handlers so replays are safe, and a reconciliation job that detects and repairs drift. Anything claiming to be strongly consistent across services without a distributed transaction is wrong.

**"Is storing the price on the order denormalization?"**
No, and this is a good distinction to draw. The order records the price **at the time of purchase**, which is a different fact from the product's current price. It must not be updated when the product changes, so there is no redundancy and no drift, only two facts that briefly agreed.

**"When is denormalization the default rather than the exception?"**
In analytics. Star schemas and wide columnar tables exist because analytical queries scan and aggregate rather than look up, and the data is written once by a pipeline, so the update risk that makes denormalization dangerous in a transactional system barely applies.

**The common wrong answer** is "denormalization trades space for speed". Space is cheap and almost never the point. The real trade is **giving up a structural guarantee** that two values cannot disagree, and taking on the duty of maintaining that agreement in code, forever, including across boundaries where no transaction can help you.

---

### Say this in the interview

*"Denormalization is deliberately introducing redundancy into an already-normalised schema to improve read performance, accepting the anomalies normalization removed. The framing matters: it is not the absence of normalization, it is normalising first and then knowingly reversing specific decisions with a plan for keeping the copies in step. A schema that was never normalised is not denormalised, it is unanalysed. And what you are trading is read speed for write cost and the risk of divergence.*

*I would do it deliberately in a few cases. A measured join bottleneck on a read-heavy path, where the plan actually shows the join is the cost. Expensive aggregates computed on demand, like a comment count on a post, where counting a million child rows per page view is far worse than maintaining a counter and the value is recomputable so drift is detectable. Analytical workloads, where it is the default rather than the exception, since a star schema joins a fact table to deliberately denormalised dimensions, queries scan and aggregate, and the data is written once by a pipeline so the update risk barely applies. Avoiding a join that is impossible rather than slow, which is the strongest modern case, because if the data is in different shards or services there is no join to optimise and the alternative is a synchronous call on every read. And enabling an index through a derived column, though I would use a generated column or an expression index so the engine maintains it.*

*One distinction worth drawing: storing a historical value is not denormalization. An order recording the price and address as they were at purchase is a different fact from the product's current price, it must never be updated when the product changes, so there is no redundancy and treating it as such is a real bug.*

*The risks are serious. Write amplification: one logical change becomes many physical writes. The update anomaly returns, and critically the guarantee moves from the structure into application code, because in a normalised schema it was structurally impossible for two copies to disagree, and now it depends on every code path remembering, including ones written later by someone who has not read this discussion. Within one database a transaction makes the updates atomic, but across services or shards it cannot, so there is a window of inconsistency by construction.*

*Reads can also get slower, which is the risk people fail to anticipate: wider rows mean fewer rows per page, so scans read more pages and the buffer cache holds less useful data, and you can optimise one query while regressing every scan and everything competing for the same cache. Then lock contention, where a counter on a popular row serialises every writer and a viral post becomes a single-row bottleneck, mitigated by sharded counters at the cost of more complexity. Schema rigidity, because the shape encodes today's access patterns and a new one needs a migration and a backfill. An ongoing reconciliation burden, since drift is now possible and you need a job that detects and repairs it. And an ambiguous source of truth once a value exists in two places.*

*So to take the risk safely: prefer a mechanism the database maintains, like a materialised view, a generated column or an expression index, so the engine owns consistency. Designate one source of truth and always derive copies from it. Write the copies in the same transaction where you can, and where you cannot, propagate with change data capture or events using idempotent handlers and an explicit acceptance of eventual consistency. Build the reconciliation job at the same time, not after the first incident. And measure both directions, confirming the read improved and that write latency and scan performance did not regress unacceptably."*
