---
id: 1-wallet-payment-system
title: "Design a Digital Wallet System"
description: "Design a digital wallet backend: handling network drops with idempotency keys, preventing double withdrawals, and concurrency control with row-level locks."
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

**Interviewer:** Let's design a digital wallet system. Imagine a scenario where a user on a spotty 4G connection taps the "Send Money" button on their phone. The connection drops, they don't see a success message, and in a panic, they tap the button again. At the exact same millisecond, they share a joint account with someone who goes to an ATM and attempts to withdraw cash. How would you design the backend API to prevent double charges and race conditions?

**Candidate:** That's a great real-world scenario. When dealing with payments, ensuring nobody accidentally loses or duplicates their money is paramount. To build a robust fintech backend, we essentially need two lines of defense: a network shield and a database shield. For the network retries, we use an Idempotency Key, and for the database race conditions, we use row-level locking, commonly implemented via `SELECT ... FOR UPDATE` in SQL.

**Interviewer:** Let's break those down. What exactly is an Idempotency Key, and how does it protect the network?

**Candidate:** The word "idempotent" means that performing an action multiple times yields the exact same result as performing it once, like multiplying a number by 1. 

In the real world, networks are completely unreliable. To explain this like you're five: imagine you buy a coffee on a laggy card machine. You swipe, the screen freezes, and you panic. Did it go through? You swipe again. An Idempotency Key is like a unique token generated *before* you swipe. If the machine receives two swipes with the exact same token, it realizes, "I already charged you for this exact transaction," and ignores the second swipe, saving you from a double charge. 

**Interviewer:** So how would you implement that technically between the frontend and the backend?

**Candidate:** The flow works like this: when the user opens the checkout or transfer screen, the frontend generates a unique string, usually a UUID. When the user hits send, the frontend attaches that UUID in the HTTP headers of the API request, like `Idempotency-Key: 9b1deb4d-3b7d`. 

When our backend receives the request, it checks a database table or a fast cache like Redis. If it's a completely new key, it proceeds with moving the money. But if the exact same request comes in again with a key we already processed, the backend recognizes it and simply returns the cached success message, without moving any money again.

**Interviewer:** That handles the network retry issue. Now, what about the database shield? How do we handle the spouse at the ATM withdrawing cash at the exact same time our server is processing the app transfer?

**Candidate:** That brings us to `SELECT ... FOR UPDATE`. This is our database shield. 

Imagine you and your friend both have debit cards for a joint bank account with $50. You both go to different ATMs and try to withdraw $50 at the exact same millisecond. `SELECT ... FOR UPDATE` is essentially the database slapping a "Do Not Disturb" sign on your account the instant the first ATM looks at it. The second ATM is forced to wait in line until the first transaction is entirely finished.

**Interviewer:** Why can't we just do a standard read, check the balance in our application logic, and then issue an update command? Why do we specifically need the `FOR UPDATE` lock?

**Candidate:** Because of race conditions. If you just write standard backend logic using a normal `SELECT balance FROM users WHERE user_id = 1`, another transaction can sneak in and change that balance a millisecond later. 

If transaction A reads the balance as $50, and transaction B reads the balance as $50 at the same time, they both think it's safe to withdraw $50. They both deduct the money, and suddenly the account has a negative balance, which shouldn't be allowed. 

By wrapping our logic in a database transaction and appending `FOR UPDATE` to the read query, we create a **Row-Level Lock**. The database locks that specific user's row so no other process can read or write to it until our transaction completes.

**Interviewer:** Could you walk me through the exact sequence of a bulletproof payment flow, combining both of these concepts?

**Candidate:** Absolutely. Here is the exact sequence to safely transfer $50:

1. **Check Idempotency (Network Shield):** The API receives the request and immediately checks our `Idempotency_Keys` table. If the key exists, we abort the payment and return the cached success message. If the key is new, we proceed.
2. **Begin Database Transaction:** The database starts the transaction and runs `SELECT ... FOR UPDATE` on both the sender's and receiver's rows. Any other API requests trying to touch these specific accounts are placed in a queue.
3. **Validate Balance:** Our backend verifies that the sender's locked balance is greater than or equal to $50. If it isn't, the transaction fails for insufficient funds.
4. **Execute Transfers:** The database runs the `UPDATE` commands to subtract $50 from the sender, add $50 to the receiver, and logs the receipt in a `Transactions` ledger.
5. **Save Idempotency Key:** We save the unique Idempotency Key alongside the transaction result to ensure this exact request can never be processed again.
6. **Commit Transaction (Release Locks):** The database commits all the changes atomically. The row locks are released, allowing any other pending transactions on those accounts to finally proceed.

**Interviewer:** That’s a very solid and robust design. You've effectively guaranteed that neither network hiccups nor concurrent requests can corrupt the user balances.
