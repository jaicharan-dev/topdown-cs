---
id: 8-ecommerce-amazon-flipkart
title: "Design Amazon / Flipkart: E-Commerce Inventory & Checkout"
description: "Design an e-commerce checkout backend like Amazon/Flipkart: flash-sale flash cart inventory reservation, distributed transactions, and two-phase commits."
sidebar_position: 8
sidebar_class_name: sidebar-medium
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

**Interviewer:** Today we're going to design the database schema for an e-commerce platform like Amazon or Flipkart. Users need to be able to browse products, add them to a cart, and place orders containing multiple products from multiple sellers. Each product can be listed by multiple sellers at different prices, and each has its own inventory count. I want to see how you'd handle atomicity—if two users order the last unit, only one should succeed. We'll also need coupons, order statuses, and reviews, but reviewers must have a confirmed delivery of that product. How would you start?

**Candidate:** An e-commerce platform combines the strict financial ledgers of a payment system with the chaotic logistics of the physical world. Before defining tables, I have a few clarifying questions about the boundaries of our design:
1. **Order Splitting:** If I buy a laptop from Seller A and a mouse from Seller B in a single checkout, do we create one monolithic "Order", or do we split them immediately?
2. **The Shopping Cart:** Does the active cart live in this relational database, or can we assume it lives in a fast cache like Redis and only hits our SQL database at checkout?
3. **Coupons:** Are they applied as a flat currency amount or a percentage, and do they apply to the final cart total or specific products?

**Interviewer:** Good questions. Let's assume a single checkout creates one parent Order containing multiple items. The shopping cart lives in a Redis cache—we only touch SQL at checkout. Coupons are a percentage off the total cart, but have a maximum usage limit across all users and an expiry date. 

**Candidate:** Perfect. I'll use a "Catalog vs. Listing" model to handle multiple sellers selling the same product. Let's outline the core entities:
- **User:** The customer buying the items.
- **Seller:** The merchant fulfilling the items. 
- **Product:** The global catalog item (e.g., "iPhone 15, Black"). It holds the title and description, but *no* price or inventory.
- **Inventory Listing:** This bridges the Product and the Seller. It represents a specific seller's physical stock of a specific product, holding the price and quantity.
- **Coupon:** The promotional code.
- **Order:** The parent checkout transaction.
- **Order Item:** A snapshot capturing exactly which seller provided the item, the quantity, and the exact price paid at the second of checkout.
- **Review:** The user's feedback on the product.

**Interviewer:** Walk me through the relationships and cardinality between these. 

**Candidate:** The secret to a multi-vendor marketplace is separating the catalog from the inventory. 
- **Product `<->` Inventory Listing `<->` Seller:** A Product has a one-to-many relationship with Inventory Listings. A Seller also has a one-to-many relationship with Inventory Listings. The `Inventory_Listings` table acts as the junction. Seller A's listing for an iPhone is completely distinct from Seller B's listing.
- **User `<->` Order:** One-to-many. A user places many orders.
- **Order `<->` Order Item:** One-to-many. A single checkout contains multiple items.
- **Inventory Listing `<->` Order Item:** One-to-many. A seller's stock will be purchased across thousands of checkouts over time.
- **Coupon `<->` Order:** One-to-many. A code can be applied to many orders until it hits its usage limit.
- **User `<->` Review `<->` Product:** Users write many reviews, and products receive many. To enforce the requirement that a user can only review a purchased product, we tie the Review directly to the `Order_Item`.

**Interviewer:** How would you design the schema for this? I'm particularly interested in how you handle prices changing over time, and what happens when a seller is removed from the platform. 

**Candidate:** We'll use `DECIMAL(10,2)` for all pricing to ensure financial precision. 

For the **Users** and **Products** tables, we'd have basic standard columns with UUID primary keys. Products would just have `title` and `description`. 

For **Sellers**, to handle your requirement about removed sellers, we never run a hard `DELETE`. If we did, it would break historical order records. Instead, we include a `status` column (enum: active, deleted) for soft deletion. 

The magic happens in **Inventory Listings**. It has a `listing_id`, foreign keys to `product_id` and `seller_id`, a `price` set by the seller, and a `stock_count` representing available warehouse units.

When a checkout happens, we create an **Order** with `order_id`, `user_id`, a nullable `coupon_code`, an overarching `status`, the `total_amount` paid, and a `placed_at` timestamp. 

Then we create **Order Items**. This is our historical snapshot. It links to the parent `order_id` and the specific `listing_id`. Crucially, it copies the exact price at checkout into a `locked_price` column. If the seller changes the price tomorrow, our financial receipt remains untouched. 

Finally, **Reviews** will have a unique foreign key to `item_id`. By tying it to the order item rather than just the product, we cryptographically prove it's a verified purchase. We also denormalize `product_id` into this table to quickly load reviews.

**Interviewer:** Let's pause on that denormalization. If we audit this schema for Normalization up to Third Normal Form (3NF), it looks like you've made some intentional violations. Can you defend them?

**Candidate:** You caught that! There are two deliberate 3NF violations here for the sake of scale and safety. 

First, the `total_amount` in the **Orders** table. Strictly speaking, it's a derived value—I could calculate it by summing the quantities and locked prices in `Order_Items` and subtracting the coupon discount. But I intentionally store this derived value to freeze the financial receipt. If marketing later changes the "DIWALI50" coupon from 10% to 15% off, dynamically calculating the total would retroactively change the price of past orders. Ledgers must be immutable.

Second, the `product_id` in the **Reviews** table. I already have `item_id`, so I could join `Reviews -> Order_Items -> Inventory_Listings -> Products`. But that's a transitive dependency. However, this is a massive read-optimization. In e-commerce, the most frequent query is loading a product page and showing its reviews. Adhering strictly to 3NF would require a computationally expensive 4-table join on every page load. Denormalizing `product_id` lets me fetch all reviews instantly with a single query.

**Interviewer:** Good reasoning. Now let's tackle the concurrency requirement. How do you prevent two users from simultaneously buying the last iPhone in stock? 

**Candidate:** This is the classic "overselling" race condition. If User A and User B both hit checkout at the same millisecond and read the stock count as 1, a naive "read-then-update" approach would let both succeed, dropping the stock to -1. 

We completely abandon "read-then-update" in the application layer. Instead, we use an atomic database decrement:

```sql
UPDATE Inventory_Listings 
SET stock_count = stock_count - 1 
WHERE listing_id = 'target_uuid' 
  AND stock_count >= 1;
```

PostgreSQL's internal row-locking guarantees one of these concurrent queries executes first. It decrements the stock to 0. When the second query executes, the `stock_count >= 1` condition is false, so it updates 0 rows. Our backend sees that 0, rolls back the checkout transaction, and throws an "Out of Stock" error to the second user.

**Interviewer:** And when exactly do you run that decrement? When they add it to the cart, or when they pay?

**Candidate:** Strictly during payment! We never lock inventory on "Add to Cart". If we did, malicious bots could add all our inventory to their carts, never check out, and paralyze our sales. 

**Interviewer:** Would you use the `SERIALIZABLE` isolation level for this checkout transaction?

**Candidate:** No, setting the entire database to `SERIALIZABLE` would make Amazon too slow to function. We'd experience massive lock contention and retry storms. Instead, I'd use the default `READ COMMITTED` isolation level. Combined with our atomic `UPDATE` query (or a `SELECT ... FOR UPDATE` row-level lock), it perfectly prevents the "Lost Update" anomaly for the exact inventory row, while keeping the rest of the database unlocked and blazing fast for people just browsing. 

We use the exact same atomic concurrency control for the coupon limits—we increment the `times_used` counter with a `WHERE times_used < max_usage` condition. 

**Interviewer:** Perfect. The prompt also asked how you would answer: "what are the top 5 best selling products in the last 7 days by units sold". How do you query this efficiently? 

**Candidate:** At scale, read queries outnumber checkouts 100 to 1. To answer that analytics query, we have to join Orders, Order Items, and Inventory Listings. 

To keep it fast, I would create a composite index on `Orders(placed_at, status)`. This instantly isolates the valid orders from the last 7 days without a full table scan. Then, because PostgreSQL doesn't automatically index foreign keys, I'd create single-column indexes on `Order_Items(order_id)` and `Order_Items(listing_id)`. 

**Interviewer:** What if Amazon wants to highlight the "Buy Box" winner? The cheapest active seller who actually has the item in stock. 

**Candidate:** I'd create a composite index on `Inventory_Listings(product_id, stock_count, price ASC)`. This is highly optimized: it instantly isolates the product, skips sellers with zero stock (because we can range-filter `stock_count > 0`), and serves up the cheapest price immediately without sorting the remaining rows.

**Interviewer:** What major architectural trade-offs would you make to keep the site from crashing during a massive Black Friday flash sale? 

**Candidate:** Relational SQL is amazing, but it has limits at extreme scale. I would make three major trade-offs:
1. **Offloading Search:** Users search with typos ("blue sony hedphones"). Running SQL `LIKE` queries on 500 million products would kill the database. I'd stream catalog updates via Kafka to Elasticsearch. We trade strict consistency (there's a slight replication delay) for lightning-fast, typo-tolerant text search.
2. **Flash Sale Cache:** For a highly anticipated iPhone drop, 100,000 users checking out in a 5-second window will max out PostgreSQL connection pools. I'd pre-warm the inventory into a Redis cache and use Lua scripts for atomic decrements in RAM. The trade-off is durability—if Redis crashes before the background queue updates SQL, we temporarily lose the exact inventory state, but we gain the ability to process thousands of checkouts per millisecond. 
3. **OLTP vs OLAP:** Running that "Top 5 Products" analytics query on the primary database during a sale will block write queries. I'd stream completed orders into a data warehouse like Snowflake. We sacrifice real-time analytics dashboards for a highly performant checkout engine.

**Interviewer:** Let's pivot to a more foundational transaction problem. Design a basic database schema for a wallet or payment system where users send money to each other. Keep it lean.

**Candidate:** A minimum viable wallet only needs three tables:
- **Users:** Identifiers and emails.
- **Wallets:** A 1:1 relationship with the user, storing the `balance` as a `DECIMAL(15,2)` to prevent binary floating-point rounding errors.
- **Transactions (The Ledger):** The immutable receipt. It links `sender_wallet_id` and `receiver_wallet_id`, the `amount`, and the `status`. Once written, a row here is never updated or deleted. 

**Interviewer:** This schema works in a vacuum. But what happens if a user double-clicks the 'Send' button? How do you prevent race conditions and guarantee atomicity?

**Candidate:** Moving money requires strict ACID compliance. We wrap the entire operation in a single SQL transaction using pessimistic locking. 

First, we run `SELECT balance FROM Wallets WHERE wallet_id = 'sender_uuid' FOR UPDATE`. This physically locks the sender's row. If a second click hits the database, it gets stuck waiting. We do the same for the receiver's wallet. Then we `UPDATE` both balances and `INSERT` the transaction receipt. Finally, we `COMMIT` to release the locks. 

**Interviewer:** Are there any hidden traps with `FOR UPDATE`?

**Candidate:** Yes! Deadlocks. If User A sends money to User B at the exact millisecond User B sends money to User A, the database will cross-lock and crash both transfers. To prevent this, the backend must alphabetically sort the `wallet_ids` and always lock the smaller UUID first, regardless of who is sending or receiving.

**Interviewer:** Brilliant. What if the network drops on the client's phone right after hitting pay? They don't see the success message, so they try to retry the exact same payment. How do you prevent double-charging?

**Candidate:** We make the API idempotent. We add a unique `idempotency_key` column to the Transactions table. When the user taps send, their mobile app generates a UUID (e.g., `req_123`) and sends it in the HTTP headers. 

If the network drops and they retry, the app sends the exact same `req_123`. The backend tries to insert the transaction, but PostgreSQL rejects it due to the unique constraint. The Node.js server catches this error, realizes it's a retry, fetches the successful transaction data, and returns the original success receipt without moving any extra money.

**Interviewer:** How would you ensure no money is lost or duplicated if the system itself crashes mid-transaction? 

**Candidate:** It depends on *where* the crash happens:
1. **Database Crash:** If Postgres loses power after deducting Wallet A but before crediting Wallet B, we rely on the Write-Ahead Log (WAL). Upon reboot, the database sees a transaction started but never committed, and rolls back the partial changes perfectly.
2. **Application Server Crash:** If the DB commits, but the Node server dies before responding to the user, the idempotency key handles the inevitable retry. A background worker can clean up any "processing" state rows.
3. **Distributed Crash:** If we are crediting an external bank via API, we can't lock it. We use the Saga Pattern. If the bank API times out, our system automatically triggers a compensating transaction to refund the internal wallet.
4. **The Ultimate Safety Net:** We never trust the live database completely. Every night, an asynchronous Reconciliation Engine sums all user balances and compares them against the master bank account and the ledger. If it's off by a single cent, it triggers an alert. 
