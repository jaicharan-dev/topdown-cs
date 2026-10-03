---
id: 7-stock-trading-zerodha-groww
title: "Design Zerodha / Groww: Stock Trading & Ledger Accounting"
description: "Design a stock trading backend like Zerodha/Groww: order matching engines, ledger transactions, price-time priority queues, and atomic balance deductions."
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

**Interviewer:** Let's discuss a core fintech problem. Can you design the database schema for a stock trading platform like Zerodha or Groww? 

Here are the requirements:
- Users can buy and sell stocks.
- Stock prices change continuously: the current market price is separate from the execution price.
- Users have a wallet balance to fund trades (buying debits, selling credits).
- Transactions must be highly atomic; if the wallet debit succeeds but the portfolio update fails, the entire transaction rolls back.
- Users can place both market orders and limit orders.
- Users need a dashboard to view their portfolio: current holdings, average buy price, and total profit/loss.

**Candidate:** This is an exciting challenge. Before building the ledger, I'd like to scope the financial boundaries. 
First, are we building the actual Exchange matching engine (like the NSE or BSE that matches buyers to sellers), or the Broker platform (like Zerodha) that routes orders and records the results? Second, do we need to support partial fills for limit orders and fractional shares, or just standard whole shares? 

**Interviewer:** Great questions. Let's assume we are building the Broker ledger, not the exchange matching engine. We are dealing with whole shares, standard long-term delivery trades, and assume orders execute in full (no partial fills) to keep the schema focused on transaction integrity.

**Candidate:** Understood. In a financial system, separating intent from execution and separating events from current state is the secret to a robust architecture. 

Our core entities would be:
1. **User (Investor):** The person making trades.
2. **Stock (Instrument):** The company shares, which tracks the live market price.
3. **Wallet (Funds):** The user's available cash balance.
4. **Order (The Intent):** A request to buy or sell, which might sit pending for days (like a limit order).
5. **Trade (The Immutable Event):** The actual historical receipt generated when an order executes.
6. **Holding (The Current State):** A summarized snapshot of what the user currently owns.

**Interviewer:** How would you map the relationships between these entities?

**Candidate:** The flow of data moves from Intent (Order) to Event (Trade) to State (Holding and Wallet).
- **User `<->` Wallet:** One-to-One. Every user has exactly one cash wallet.
- **User `<->` Order** and **Stock `<->` Order:** One-to-Many. A user places thousands of orders, and a stock has millions of orders.
- **Order `<->` Trade:** One-to-One. Since we assumed no partial fills, an executed order generates exactly one trade receipt.
- **User `<->` Stock:** Many-to-Many. A user holds many stocks, and a stock is held by many users. We resolve this using our **Holding** junction table. This creates a One-to-Many from User to Holding, and Stock to Holding.

**Interviewer:** Walk me through the schema design and attributes. I'm especially interested in how you handle money, delisted stocks, and that average buy price calculation.

**Candidate:** First, a strict rule for any fintech database: we never use floating-point numbers (`FLOAT` or `DOUBLE`) because of binary rounding errors. We strictly use `DECIMAL(15,2)` to guarantee exact precision for currency.

- **Wallets:** Uses a UUID primary key, links to `user_id`, and has a `balance` of `DECIMAL(15,2)`.
- **Stocks:** Uses `stock_symbol` as the primary key. It holds the `current_price`. To handle delisted stocks where users might still hold the asset, we use a `status` enum (`active` or `delisted`). This is a soft deletion; we never actually delete the row, ensuring historical trades remain intact.
- **Orders:** Tracks `transaction_type` (`buy`/`sell`), `order_type` (`market`/`limit`), nullable `target_price`, `quantity`, and `status`.
- **Trades:** The single most important table in a fintech schema. Once written, a row can never be updated or deleted. It logs the `execution_price`, `quantity`, and the exact `executed_at` timestamp.
- **Holdings:** Our junction table tracking real-time portfolio state. It uses a composite unique key of `(user_id, stock_symbol)`. It holds the current `quantity` and the `average_buy_price`.

For the average buy price, we use a weighted average upon every successful buy trade. 
If a user owns 10 shares at an average of ₹100 (₹1000 total invested), and they buy 5 more shares at an execution price of ₹130 (₹650 new investment), we calculate: `(1000 + 650) / 15 = ₹110`. The backend mathematically calculates this and simply updates the `average_buy_price` to ₹110.

**Interviewer:** Let's look at Third Normal Form (3NF). Technically, the `Trades` table has an `order_id`, so we can join `Orders` to find the user and the stock. Why would you place `user_id` and `stock_symbol` directly on the `Trades` table? And for that matter, why have a `Holdings` table at all when the portfolio can just be derived by summing all historical trades?

**Candidate:** You caught my deliberate 3NF violations! These denormalizations are entirely intentional for a high-scale trading platform.

First, duplicating `user_id` and `stock_symbol` onto `Trades` prevents disastrous JOINs. If I need to generate an end-of-year tax report of every trade a user made, joining millions of executed trades against an `Orders` table, which is flooded with cancelled or expired intents, would be incredibly slow. By denormalizing those columns onto `Trades`, I can index them and query the immutable ledger in milliseconds.

Second, dynamically calculating a user's portfolio from scratch by summing up 10 years of historical trades every time they open the app is computationally impossible at Zerodha's scale. We use an architecture pattern similar to CQRS (Command Query Responsibility Segregation). The `Trades` table acts as the immutable Event Log, and the `Holdings` table acts as a materialized view of the Current State. We gladly sacrifice storage space and strict normalization to guarantee instantaneous dashboard read speeds.

**Interviewer:** Makes perfect sense. Now, let's talk about execution. In fintech, dropped packets can mean lost funds. How do you guarantee atomic trades and prevent anomalies when money and shares change hands?

**Candidate:** We wrap the entire execution in a strict SQL Transaction (`BEGIN`, update wallet, insert trade, upsert holdings, `COMMIT`). If any step fails, we issue a `ROLLBACK` and nothing is saved.

But the real threat is the Lost Update Anomaly. What if a user double-clicks the "Buy" button, triggering two separate execution requests at the exact same millisecond, but they only have enough wallet balance for one? If both transactions read the wallet simultaneously, they both see enough funds and execute, pushing the wallet into a negative balance.

We can't set the database isolation level to `SERIALIZABLE`: forcing all transactions sequentially would make the platform painfully slow. Instead, I would use the `READ COMMITTED` isolation level combined with a pessimistic Row-Level Lock. 

Before the wallet deduction, we run: `SELECT balance FROM Wallets WHERE wallet_id = X FOR UPDATE;`
This physically locks that specific user's wallet row. The second simultaneous click is forced to wait in line. By the time the second transaction gets the lock, the balance has been updated, is now too low, and the trade is safely rejected.

**Interviewer:** Very elegant. How would you ensure the schema can quickly answer: "What is the total profit or loss of a user across their entire portfolio as of today?"

**Candidate:** Because we decoupled the current state into the `Holdings` table and track the `average_buy_price`, we can calculate their Unrealized P&L in a single fast query:

```sql
SELECT 
    SUM((s.current_price - h.average_buy_price) * h.quantity) AS total_unrealized_pnl
FROM Holdings h
JOIN Stocks s ON h.stock_symbol = s.stock_symbol
WHERE h.user_id = 'target_uuid';
```

**Interviewer:** At 9:15 AM on a Monday, millions of users open the app to check their portfolios and place orders. How do you index this database to survive the morning spike?

**Candidate:** We must index our tables to match our exact query patterns:
1. **The Portfolio Dashboard:** Users query `WHERE user_id = X` on the `Holdings` table. Because we set a Composite Unique Constraint on `Holdings(user_id, stock_symbol)`, PostgreSQL automatically creates a B-Tree index for it. Since B-Trees read left-to-right, this handles our `user_id` queries perfectly without wasting memory on a redundant standalone index.
2. **Tax Reports / Trade History:** Users want trades sorted by time: `WHERE user_id = X AND executed_at >= Y ORDER BY executed_at DESC`. Sorting on the fly is a database killer. We use a Composite Index on `Trades(user_id, executed_at DESC)`. The database simply jumps to the user's section on disk and reads pre-sorted rows from the top down.
3. **The Order Execution Engine:** When Reliance drops to ₹2500, a worker checks for limit orders: `WHERE stock_symbol = 'RELIANCE' AND status = 'pending' AND target_price >= 2500`. We use a Composite Index on `Orders(stock_symbol, status, target_price)`. Order matters here! We put the strict equality matches (`=`) first, and the range check (`>=`) last, allowing the database to instantly filter out millions of executed orders.

**Interviewer:** Excellent. Finally, let's zoom out. What are the major architectural trade-offs you'd make to handle millions of trades per second?

**Candidate:** In high-frequency trading, you constantly balance strict ACID compliance against extreme throughput. I'd make three core trade-offs:

1. **Live Ticker Prices (SQL vs. WebSockets/Redis):** Querying PostgreSQL every second for live stock prices would melt the database. We decouple the live price ticker entirely, pushing prices from the exchange directly to the user's phone via WebSockets and Redis. The core SQL `Stocks` table is just updated periodically as a fallback. We trade strict synchronization in the main DB for extreme frontend performance.
2. **Write-Heavy Ledger vs. Read-Heavy Dashboards:** At 9:15 AM, the primary database is hammered with write locks from executing trades. Simultaneously, users are continuously refreshing their portfolios. We use Read Replicas (CQRS). The primary database only handles writes, then replicates to read-only clones. We accept a tiny bit of replication lag (a user might execute a trade and not see it in their portfolio for 50 milliseconds) to keep the system from locking up.
3. **Infinite Ledger Growth (Table Partitioning):** The `Trades` ledger is immutable and will quickly reach billions of rows, slowing down indexes. We can't just archive this to cold storage because financial regulations require fast access for tax audits. Instead, we use PostgreSQL Table Partitioning by time (e.g., `Trades_Jan_2026`). The trade-off is added backend complexity, and cross-year queries become slightly slower as they scan multiple partitions, but it prevents the core indexes from suffocating. 

**Interviewer:** Fantastic breakdown. You've balanced strict data integrity with practical scaling techniques perfectly.
