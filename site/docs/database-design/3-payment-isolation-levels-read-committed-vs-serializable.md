---
id: 3-payment-isolation-levels-read-committed-vs-serializable
title: "Isolation Levels: Read Committed vs Serializable"
description: "Compare Read Committed vs. Serializable isolation levels in payment systems: preventing non-repeatable reads, phantom reads, and write skew under high load."
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

**Interviewer:** Let's dive deeper into the database side of our wallet system. I know you've set up the tables and a basic transactional flow. But in a high-traffic payment system where thousands of users are transferring money at the same time, isolation levels become critical. Which isolation level would you actually use in production, and why? What are the tradeoffs between Read Committed and Serializable?

**Candidate:** This is a crucial decision, and honestly, it's where textbook theory often clashes with production reality. Textbooks usually say, "always use Serializable for financial data because it prevents all anomalies." But in the real world of high-traffic payment systems, you almost never use Serializable.

Instead, I would use **Read Committed**, paired with explicit row-level locking—specifically, `SELECT ... FOR UPDATE`.

**Interviewer:** That's an interesting take. Serializable guarantees correctness. Why step down to Read Committed? Let's break down the "why." 

**Candidate:** The best way to explain it is with an analogy. Imagine a busy bank branch with 100 tellers helping 100 different customers. 

If we use **Read Committed with row locks**, it's like a teller taking your specific account file folder from the cabinet and putting a "currently in use" sticky note on it. The other 99 tellers can keep serving their customers completely seamlessly because they are looking at different folders.

If we use **Serializable**, it's like the bank manager freezing time for the entire building. Everyone must stand perfectly still, stop whatever they are doing, and wait while your single transaction finishes. It is perfectly safe, but the line out the door will quickly wrap around the block.

**Interviewer:** I like that analogy. So it's heavily about performance and concurrency. Can you explicitly compare the trade-offs between the two approaches for our wallet?

**Candidate:** Absolutely. There are four main dimensions we need to look at: Performance, Concurrency, Safety Responsibility, and Error Rates.

With **Read Committed plus `FOR UPDATE`**:
- **Performance:** It's extremely fast. 
- **Concurrency:** Extremely high. Thousands of users can transact simultaneously, as long as they are touching completely different accounts.
- **Safety:** The responsibility falls on the developer. I have to remember to explicitly read with `SELECT ... FOR UPDATE` in my backend code. If I forget, concurrent transactions could overwrite each other, and money could be lost.
- **Error Rate:** Low. If there's a conflict (two requests trying to deduct from the same account at the exact same millisecond), the database simply makes the second transaction wait its turn in a queue for the row lock to release.

On the other hand, with **Serializable**:
- **Performance:** Extremely slow.
- **Concurrency:** Very low. The database engine forces transactions to run sequentially if there is even a hint of overlap or conflict.
- **Safety:** The responsibility falls on the database. The engine automatically detects and blocks any concurrency anomalies without the developer needing to manage locks manually.
- **Error Rate:** Very high. This is the killer. Instead of making conflicting transactions wait gracefully, a Serializable database frequently aborts competing transactions to maintain safety. It throws a "serialization failure" error. 

**Interviewer:** Those serialization failures sound painful. How does that impact the system architecture?

**Candidate:** It creates a massive bottleneck! If you use Serializable isolation on a table handling thousands of payments a minute, the database engine becomes overly paranoid. It spends huge amounts of CPU power constantly checking if Transaction A might possibly interfere with Transaction B. 

If it suspects any conflict, it doesn't just queue them up; it simply kills one of the transactions. Your backend Node.js server now has to catch that specific database error, pause, and attempt the entire payment process again from scratch. It leads to cascading retries, latency spikes, and a terrible user experience under load.

**Interviewer:** So, how exactly does Read Committed with explicit locking give us the "best of both worlds"?

**Candidate:** Read Committed is the default isolation level in most modern databases, like PostgreSQL. It assumes things will generally be fine, but ensures you only read data that is permanently saved and committed.

By combining it with a pessimistic lock (`SELECT ... FOR UPDATE`), we achieve blazing speed because the database isn't wasting CPU checking for complex global transaction conflicts. At the same time, we get targeted safety. We are manually telling the database, "I am touching User A and User B right now. Lock only their two rows until I'm done."

**Interviewer:** That makes perfect sense. To summarize, how would you finalize your architecture decision for the wallet system's concurrency?

**Candidate:** I would configure the database to use the Read Committed isolation level. While Serializable provides automatic mathematical safety against all concurrency anomalies, the performance penalty and high rate of transaction rollbacks make it unscalable for a high-traffic payment system.

Instead, I will handle the concurrency safety at the application layer. By initiating a Read Committed transaction in the backend and immediately executing a `SELECT ... FOR UPDATE` on the specific rows, I create a pessimistic lock. This guarantees we never double-spend, while allowing the rest of the database to process thousands of other independent user transactions concurrently without blocking.
