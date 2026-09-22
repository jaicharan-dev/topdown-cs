---
id: 2-financial-crash-recovery-and-idempotency
title: "Financial Crash Recovery & Idempotency"
description: "Interview conversation on how to handle system crashes mid-transaction to ensure no money is lost or duplicated."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

**Interviewer:** Let's talk about fault tolerance. How would you ensure no money is lost or duplicated if the system crashes mid-transaction?

**Candidate:** This is really the ultimate test of a robust backend architecture. In a real-world system, servers crash constantly—power goes out, AWS regions go down, or memory limits are exceeded. We have to design for failure from the ground up.

To survive a mid-transaction crash without losing a single cent, we need to address failures across three different layers: the database, the application server, and external third-party services.

**Interviewer:** Let's start with the database layer. If the actual database server, like PostgreSQL or MySQL, loses power right in the middle of executing your `UPDATE` statements, how do we guarantee we don't end up in an inconsistent state?

**Candidate:** The database relies on a mechanism called the Write-Ahead Log (WAL) to guarantee the Atomicity and Durability properties of ACID.

If I were to explain it simply: Imagine you are a bank teller. Before you hand $50 in cash to a customer, you write down in a thick, permanent notebook: "I am about to give John $50." Only after the ink dries do you actually reach into the drawer and hand over the cash.

If the fire alarm goes off—which represents our system crash—while your hand is in the drawer, you drop everything and run outside. When the fire is out and you return to your desk, you check the notebook. You see "I am about to give John $50," but there is no checkmark next to it. You know instantly the transaction didn't finish, so you cross it out and tell John to start over.

**Interviewer:** That's a great analogy. So how does that map to the actual database internals?

**Candidate:** Exactly like the notebook, a database does not immediately overwrite the old balance on the hard drive. Instead, it writes a detailed record of what it intends to do to a secure, append-only log file—the WAL. 

When the database server reboots after a crash, before it allows any user to connect, it reads the WAL. If it finds a transaction that started but never logged a `COMMIT` command, it performs a Rollback. It undoes any partial changes, returning the balances exactly to where they were before the crash. No money is lost or duplicated; it simply acts like the transaction never happened.

**Interviewer:** That makes sense for the database. But what happens if the database successfully commits the transaction, but your Node.js or backend server crashes a millisecond before it can send the `200 Success` response back to the user's phone?

**Candidate:** That's a classic problem. The money moved safely in the database, but the user's app says "Network Error." The natural reaction is for the user to panic and hit the "Send" button a second time.

**Interviewer:** Exactly. How do you prevent that second tap from moving the money again?

**Candidate:** This is exactly where the Idempotency Key saves us. When the user initiates a transfer, the client app generates a unique Idempotency Key (like a UUID) and sends it with the request. We store this key in our database alongside the transaction.

When the user hits "Send" a second time, the app sends the exact same key to a newly spun-up backend server. The server checks the database, sees that the key is already tied to a successful transaction, and instantly replies "Success!" without executing the transfer logic again. The transaction becomes safe to retry safely as many times as needed.

**Interviewer:** Perfect. Now let's look at the third layer. What if our app is interacting with the real world, like Stripe, a credit card network, or another bank? The crash might happen on their end, or they might time out before answering. Your transaction is now stuck in a `pending` state.

**Candidate:** Right, we can't just leave it pending forever. If we sent the money but don't know the outcome, we need a Reconciliation mechanism.

We would build a background sweeping process, like a Cron Job or a worker queue. Let's say every 5 minutes, this worker queries our `Transactions` table for any records stuck in `pending` for more than 10 minutes.

**Interviewer:** And what does the worker do with those stuck transactions?

**Candidate:** The worker takes the transaction ID and queries the third-party bank's API, asking, "Hey, did this specific transaction ever go through?"

If the bank replies "Yes," our worker updates our database status to `success`.
If the bank replies "No record of that transaction," the worker safely rolls our database status back to `failed`, allowing the user to try again.

**Interviewer:** So to summarize, how would you describe your overall architecture for crash recovery?

**Candidate:** To guarantee zero money is lost or duplicated, I would build a three-layered safety net:

1. **ACID Transactions + WAL:** Protect the physical database files from corruption during hardware or power failures.
2. **Idempotency Keys:** Protect the network and system state from duplicate user retries when the app server crashes.
3. **Background Reconciliation Workers:** Clean up any requests that get permanently stuck in "limbo" between our server and the outside world.
