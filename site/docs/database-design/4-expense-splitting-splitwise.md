---
id: 4-expense-splitting-splitwise
title: "Design Splitwise: Expense Splitting & Debt Simplification"
description: "Design an expense splitting system like Splitwise: modeling users, groups, multi-currency splits, debt simplification algorithms, and ledger reconciliation."
sidebar_position: 4
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

---

### Phase 1: Clarifying the Requirements

**Interviewer:** Let's design the database for an expense-sharing app like Splitwise. Users should be able to create groups, add expenses, and settle debts with each other. Where would you start?

**Candidate:** Before writing down any tables, I like to make sure I truly understand how the app should behave. First, if two people just want to split a quick coffee, do they have to create a formal "group", or can they just log the expense directly?

**Interviewer:** To keep our database rules simple, let's assume two friends splitting a coffee is just treated as a "group of two" under the hood. That way, every single expense is always attached to a group.

**Candidate:** That makes it much easier to model! What about split types? Users can split by exact amounts, percentages, or shares. Does the database need to calculate those fractions, or does the frontend app figure that out for us?

**Interviewer:** The app's frontend or API will do the math. By the time the data reaches the database, it should just be final, exact dollar amounts. 

**Candidate:** Got it. Next, can multiple people pay for a single bill together? For example, if a dinner costs \$100, can Alice pay \$60 in cash while Bob puts \$40 on his credit card?

**Interviewer:** Yes, definitely. People frequently co-pay for big expenses, so your design must support multiple payers on a single receipt.

**Candidate:** And when someone pays another person back to settle up, do we treat that repayment as an expense, or as something entirely different?

**Interviewer:** That's a great question. I'd like to hear your thoughts on how we should model that when we get to it. 

**Candidate:** Sounds good. What about simplifying debts? If Alice owes Bob \$10, and Bob owes Charlie \$10, it's annoying for everyone to send money around. Should the system be smart enough to tell Alice to just pay Charlie \$10 directly?

**Interviewer:** Yes, the app should absolutely support debt simplification to minimize the number of payments people have to make.

**Candidate:** Lastly, how big is this app? And are people mostly checking their balances or adding new expenses?

**Interviewer:** We're designing for about 50 million active users. And it's very read-heavy: people open the app to check their balances or look at past bills about ten times more often than they actually log a new expense.

---

### Phase 2: Starting with a Simple Baseline (V1)

**Candidate:** Great! Instead of trying to build the perfect final schema right away, let's start with a simple first version. We'll cover the basics: users, groups, and an expense where one person pays and everyone splits it equally.

We'll start with these two tables:

#### 1. `Users`
- `user_id` (Primary Key, UUID)
- `name` (VARCHAR)
- `email` (VARCHAR, Unique)

#### 2. `Groups`
- `group_id` (Primary Key, UUID)
- `name` (VARCHAR)
- `created_by` (Foreign Key `Users.user_id`)

**Interviewer:** How do you connect users to their groups?

**Candidate:** Since one user can join many groups (like a House group and a Vacation group), and a group has many members, we need a bridge between them. We'll use a middle table called `Group_Members`:

#### 3. `Group_Members`
- `group_id` (Foreign Key `Groups.group_id`)
- `user_id` (Foreign Key `Users.user_id`)
- Composite Primary Key: `(group_id, user_id)`

**Interviewer:** Why create a whole separate table for that? Why not just save a list of user IDs directly inside the `Groups` table?

**Candidate:** In a relational database, putting a list or array inside a single column is generally a bad idea. If you want to answer a simple question like, "Which groups does Bob belong to?", the database would have to crack open every single group row and search through the lists one by one. With a `Group_Members` table, the database can instantly find all rows belonging to Bob.

**Interviewer:** Makes perfect sense. Now, how would you store an actual expense?

**Candidate:** For our first draft, we can create an `Expenses` table that looks like a basic receipt:

#### 4. `Expenses` (First Version)
- `expense_id` (Primary Key, UUID)
- `group_id` (Foreign Key `Groups.group_id`)
- `paid_by_user_id` (Foreign Key `Users.user_id`)
- `total_amount` (DECIMAL)
- `description` (VARCHAR)

**Interviewer:** How would this version calculate who owes what?

**Candidate:** If Alice pays \$100 for a group of 4 people (Alice, Bob, Charlie, David), the app looks at the `Group_Members` table, counts 4 people, divides \$100 by 4 to get \$25 each, and knows that Bob, Charlie, and David each owe Alice \$25.

---

### Phase 3: Challenging the Design (One Requirement at a Time)

**Interviewer:** Okay, let's see how your V1 design holds up in the real world. Here is the first problem: What if all 4 roommates are in the group, but only Alice, Bob, and Charlie go out for pizza (\$60)? In your design, David wasn't there, but your formula divides by 4 and charges him \$15 for food he never ate. How do you fix that?

**Candidate:** Ah, good catch. My first design assumed that everyone in the group is always part of every single bill. To fix this, we need to explicitly track who actually participated in each specific expense. 

I'll add a new table called `Expense_Participants` linking the `expense_id` and the `user_id`. Now, when an expense is created, we only insert rows for the people who were actually there. For the pizza, we only insert Alice, Bob, and Charlie. The app divides \$60 by 3, so each of them owes \$20, and David is left alone.

**Interviewer:** That works well. Now here is the second problem: What if they didn't split it equally? What if Charlie ordered an expensive steak and owes \$30, while Alice and Bob only owe \$15 each?

**Candidate:** Then simply listing the participants isn't enough. We also need to record exactly how much of the bill each person consumed. I'll add an `amount_owed` column to the `Expense_Participants` table so we can store custom amounts.

**Interviewer:** Good. Now here is the third problem: Remember how we said multiple people can pay? What if Alice paid \$60 in cash and Bob paid \$40 on his card for that \$100 dinner? Your `Expenses` table only has one `paid_by_user_id` column!

**Candidate:** Right, a single column can only store one payer. If multiple people can pay, we have to pull the payer information out of the `Expenses` table entirely.

**Interviewer:** So where does the payment information go?

**Candidate:** We can put it right into our participants table! Let's rename it to `Expense_Splits`. Each row will represent one person on that bill and store two different dollar amounts:
- `amount_paid`: how much physical cash they put down at the restaurant.
- `amount_owed`: the value of the food or service they actually consumed.

---

### Phase 4: Understanding the Numbers

**Interviewer:** I like that. Walk me through how the numbers look with that dual-column design for the dinner where Alice paid \$60, Bob paid \$40, and their personal shares were Alice \$20, Bob \$50, Charlie \$30.

**Candidate:** Every participant gets exactly one row in `Expense_Splits`. Let's look at the math for each person:

- **Alice:** She paid \$60.00, but she only owed \$20.00. 
  $\rightarrow$ Her net balance is **+\$40.00** (she is owed \$40).
- **Bob:** He paid \$40.00, but he owed \$50.00. 
  $\rightarrow$ His net balance is **-\$10.00** (he owes \$10).
- **Charlie:** He paid \$0.00, but he owed \$30.00. 
  $\rightarrow$ His net balance is **-\$30.00** (he owes \$30).

Notice how intuitive the math becomes: `Net Balance = amount_paid - amount_owed`. And if you sum up everyone's net balances:
`(+40.00) + (-10.00) + (-30.00) = 0.00`
An expense will always balance out to exactly zero!

**Interviewer:** Why put both `amount_paid` and `amount_owed` in the same table? Why not create two separate tables: one table for who paid, and another table for who owes?

**Candidate:** Because in real life, the same person is usually doing both! Alice paid \$60, but she also ate \$20 of food. 

If we used two separate tables, calculating someone's balance would mean the database has to stitch (or "join") both tables together every single time. By putting both numbers on the same row, finding someone's net contribution to a bill is as simple as subtracting two columns that are sitting right next to each other. 

> **Note for the Reader:** In accounting and ledger design, this pattern is incredibly common. Having both the credit (cash put in) and the debit (value consumed) on the same split record keeps financial balance verification extremely simple and fast.

---

### Phase 5: Settlements (Paying Each Other Back)

**Interviewer:** Now Bob owes Alice \$10. He opens Venmo, sends her \$10, and wants to record it in the app to clear his debt. How do we record that repayment in the database?

**Candidate:** We could just add another row to the `Expenses` table, call it "Repayment", and say Bob paid \$10 and Alice owed \$10.

**Interviewer:** What's the problem with treating a repayment as a regular expense?

**Candidate:** It completely ruins the group's spending statistics! If the roommates look at their monthly chart to see "How much did our apartment spend on groceries and utilities?", repayments aren't real spending. If you record settlements as expenses, you double-count the money. You'd make the group look like they are spending twice as much as they actually are.

**Interviewer:** Exactly. So how would you store repayments to keep the data clean?

**Candidate:** I'd create a dedicated `Settlements` table:
- `settlement_id` (Primary Key, UUID)
- `group_id` (Foreign Key `Groups.group_id`)
- `payer_id` (Foreign Key `Users.user_id`, Bob)
- `payee_id` (Foreign Key `Users.user_id`, Alice)
- `amount` (DECIMAL - \$10.00)
- `created_at` (TIMESTAMP)

This keeps peer-to-peer cash repayments completely separated from real-world spending on things like food or rent.

---

### Phase 6: Handling Edge Cases (Leaving Groups and Lost Pennies)

**Interviewer:** Let's look at some tricky real-world scenarios. What happens if Charlie moves out and wants to leave the group? Can we just run a database command like `DELETE FROM Group_Members WHERE user_id = charlie`?

**Candidate:** That would cause serious issues. If the database deletes his membership record, it also has to deal with his history on old bills. Depending on how the database is configured, it might completely wipe out his past expenses, which means the old bills wouldn't add up correctly anymore. Or, the database might throw an error and refuse to delete him because old receipts still point to his ID.

**Interviewer:** So how do you handle someone leaving a group without breaking history?

**Candidate:** We use a "soft delete". Instead of actually erasing the row, we add a `status` column to `Group_Members` that can be set to `'active'` or `'left'`. When Charlie leaves, we just update his status to `'left'`. That way, his name and historical splits remain in the database so past records stay perfectly balanced.

**Interviewer:** But what if Charlie owes \$200 to the group and tries to hit the "Leave Group" button to run away from his debt?

**Candidate:** The application's code has to catch that! Before updating his status to `'left'`, the backend calculates his total net balance in that group. If his balance is not exactly \$0.00, the app blocks him and shows an error: *"You cannot leave this group until your balance is settled."*

**Interviewer:** Here's another common problem: rounding. Suppose 3 friends split a \$10 lunch equally. \$10 divided by 3 is \$3.3333... How do you store that in the database?

**Candidate:** We shouldn't use regular floating-point numbers (`FLOAT`). Computers struggle to represent repeating fractions perfectly. If you store \$3.33 for each person, \$3.33 $\times$ 3 equals \$9.99. A penny disappears into thin air! Over millions of transactions, those missing pennies add up to a major accounting disaster.

**Interviewer:** How do you solve the missing penny problem?

**Candidate:** First, we use the `DECIMAL(15, 2)` data type, which stores exact numbers down to the cent, just like a bank. Second, the app itself has to allocate the extra penny *before* saving to the database. For example:
- Alice owes \$3.34
- Bob owes \$3.33
- Charlie owes \$3.33
- Total: **\$10.00** exactly.

The database never does the division; it only stores the exact, perfectly balanced numbers the app gives it.

---

### Phase 7: Debt Simplification & Querying Balances

**Interviewer:** How does the app answer a question like, "How much does Alice owe Bob across all groups?" And how do you simplify debts, for example, if Alice owes Bob \$10, and Bob owes Charlie \$10, the app should just tell Alice to pay Charlie \$10 directly?

**Candidate:** The key thing to realize is that the database doesn't actually store a record that says "Alice owes Bob \$10". Instead, for any given group, the database just tracks each person's overall position in the pool:
- Alice is net **+\$50** (the group owes her \$50).
- Bob is net **-\$30** (he owes the group \$30).
- Charlie is net **-\$20** (he owes the group \$20).

**Interviewer:** Okay, but how does the app figure out who should pay whom? Can we write a clever SQL query to simplify the debts?

**Candidate:** I wouldn't do the debt simplification inside the database. Finding the most efficient way to clear debts between a web of people is an algorithmic graph puzzle. Writing complex, recursive loops inside SQL is slow, incredibly hard to read, and puts a heavy load on the database server.

**Interviewer:** Where should that puzzle be solved instead?

**Candidate:** In the backend application server! The database just runs a fast, simple query to calculate each user's net balance:
`User Balance = SUM(amount_paid - amount_owed) + SUM(settlements_received) - SUM(settlements_paid)`

Then the backend code takes those numbers and runs a matching algorithm in memory. It lines up everyone who owes money (debtors) and everyone who is owed money (creditors). It pairs the person who owes the most (Bob with -\$30) with the person who is owed the most (Alice with +\$50), tells Bob to pay Alice, and repeats until everyone is settled. It's lightning fast and keeps the database focused on what it does best: storing and summing data.

> **Note for the Reader:** Debt simplification is a version of the "Minimum Cash Flow" problem. Because it requires reducing a graph of connections, running a "Greedy solver" in application memory (like in Node.js, Python, or Go) is far more scalable than attempting to write complex recursive queries in SQL.

---

### Phase 8: Performance, Normalization, and Caching

**Interviewer:** Let's look at your `Expenses` table. You have a `total_amount` column. But you could also calculate that total at any time just by adding up the `amount_paid` from `Expense_Splits`. Doesn't storing `total_amount` violate database normalization rules since it's redundant data?

**Candidate:** Yes, technically it is redundant, which violates Third Normal Form (3NF). In a textbook, you'd remove it. But in the real world, I would intentionally keep it.

**Interviewer:** Why break the rule?

**Candidate:** For two very practical reasons:
1. **Speed:** When someone opens a group, they want to see a feed of the last 50 expenses with their totals. If we didn't store `total_amount`, the database would have to stitch together and sum up hundreds of individual split rows just to display a simple list of 50 bills.
2. **Safety Check:** The receipt total acts as a sanity check. When an expense is created, the app verifies that the individual splits add up to `total_amount` before saving. If something goes wrong, we have the original receipt total to compare against.

**Interviewer:** That makes sense. Now, let's talk about our 50 million users. You mentioned the app is very read-heavy. If Alice has been using the app for 5 years and has thousands of splits, calculating her balance from scratch every time she opens the app will take a long time. How do you fix that?

**Candidate:** We can cache her balance directly on the `Group_Members` table by adding a `cached_balance` column.

**Interviewer:** What's the trade-off of doing that?

**Candidate:** Reading her balance becomes instant: the database just looks at a single row and shows it on her screen. But writing becomes slightly slower, because every single time a new expense or settlement is added, the database has to lock her row and update that cached balance. Since users open the app to check balances far more often than they add expenses, sacrificing a tiny bit of write speed to gain lightning-fast reads is well worth it.

---

### Phase 9: Indexing Strategy

**Interviewer:** Let's talk about indexes. What indexes would you add to make common queries fast?

**Candidate:** First, when a user opens the app, we need to quickly load all their active groups:
```sql
CREATE INDEX idx_group_members_user_active 
ON Group_Members (user_id, status);
```

**Interviewer:** Why do we need that index? Doesn't `Group_Members` already have a primary key on `(group_id, user_id)`?

**Candidate:** A composite index on `(group_id, user_id)` is sorted by `group_id` first, and then `user_id`. 

Think of it like a phone book sorted by Last Name, then First Name. If you only know the first name (the `user_id`), the phone book doesn't help you at all, because you would have to read every single page to find them. That's why we need a separate index that starts with `user_id`.

**Interviewer:** That's a great analogy. What about loading the expense feed for a group?

**Candidate:** We need the latest 50 expenses for a group, sorted by newest first. I'd add this index:
```sql
CREATE INDEX idx_expenses_group_created 
ON Expenses (group_id, created_at DESC);
```
This physically pre-sorts the expenses on disk. When the app asks for the latest 50, the database can jump straight to that group and grab the top 50 rows immediately, without having to load thousands of rows into memory just to sort them.

**Interviewer:** What about finding splits for a specific user?

**Candidate:** We'll add an index on `Expense_Splits(user_id)`:
```sql
CREATE INDEX idx_expense_splits_user 
ON Expense_Splits (user_id);
```

**Interviewer:** Isn't `user_id` a foreign key? Doesn't the database automatically index foreign keys?

**Candidate:** A lot of developers assume that, but most relational databases (like PostgreSQL) actually do not! Foreign keys ensure that the user exists, but they don't automatically create an index to make searching fast. You have to create the index manually.

---

### Phase 10: Scaling Over Time

**Interviewer:** After a few years, `Expense_Splits` grows to 2 billion rows. Searching it becomes like finding a needle in a massive haystack. How do you keep the database fast?

**Candidate:** We can apply two strategies to keep the active data small:
1. **Table Partitioning:** We can partition `Expenses` and `Expense_Splits` by date (for example, breaking it into monthly or quarterly buckets). When users look at recent bills, the database only searches the newest bucket and completely ignores the older ones.
2. **Cold Storage Archival:** Most users only care about expenses from the past few months. Expenses older than two years can be safely moved out of the main database into cheaper "cold storage" (like AWS S3 or a data warehouse). And because we keep the `cached_balance` on the `Group_Members` table, moving old bills out doesn't break anyone's current balance!

---

### Phase 11: Final Schema Review & Mental Model

**Interviewer:** Excellent walkthrough. Can you summarize the final schema?

**Candidate:** Here is our complete, production-ready schema:

```text
[ Users ]
  - user_id       : UUID (PK)
  - name          : VARCHAR
  - email         : VARCHAR (Unique)

[ Groups ]
  - group_id      : UUID (PK)
  - name          : VARCHAR
  - created_by    : UUID (FK -> Users.user_id)

[ Group_Members ]
  - group_id      : UUID (Composite PK, FK -> Groups.group_id)
  - user_id       : UUID (Composite PK, FK -> Users.user_id)
  - status        : ENUM ('active', 'left')   -- Soft deletion
  - cached_balance: DECIMAL(15, 2)            -- Instant balance lookups

[ Expenses ]
  - expense_id    : UUID (PK)
  - group_id      : UUID (FK -> Groups.group_id)
  - description   : VARCHAR
  - total_amount  : DECIMAL(15, 2)            -- Receipt total
  - created_by    : UUID (FK -> Users.user_id)
  - created_at    : TIMESTAMP

[ Expense_Splits ]
  - split_id      : UUID (PK)
  - expense_id    : UUID (FK -> Expenses.expense_id)
  - user_id       : UUID (FK -> Users.user_id)
  - amount_paid   : DECIMAL(15, 2)            -- Upfront cash put down
  - amount_owed   : DECIMAL(15, 2)            -- Consumed share of bill

[ Settlements ]
  - settlement_id : UUID (PK)
  - group_id      : UUID (FK -> Groups.group_id)
  - payer_id      : UUID (FK -> Users.user_id)
  - payee_id      : UUID (FK -> Users.user_id)
  - amount        : DECIMAL(15, 2)            -- Peer-to-peer repayment
  - created_at    : TIMESTAMP
```

#### How to Approach Any Database Design Problem:
1. **Start simple:** Propose a basic model first. Don't try to solve every tricky edge case in the first five minutes.
2. **Deconstruct events into splits:** An event often has two sides: who paid money in, and who took value out. Putting both in the split record makes math straightforward.
3. **Separate payments from spending:** Never mix debt repayments with actual expenses, or your spending analytics will be corrupted.
4. **Never hard-delete financial data:** Use soft deletes so historical balances and receipts remain safe and audit-proof.
5. **Know when to use SQL vs code:** Use SQL for storage, data integrity, and basic math; do complex algorithms (like debt simplification) in application code.
