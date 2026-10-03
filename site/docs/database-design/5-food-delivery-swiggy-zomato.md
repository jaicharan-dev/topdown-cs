---
id: 5-food-delivery-swiggy-zomato
title: "Design Swiggy / Zomato: Food Delivery & Order State Machine"
description: "Design a food delivery backend like Swiggy/Zomato: order state machines, real-time driver dispatch, surge pricing, and inventory decrement concurrency."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

**Interviewer:** Welcome! Today I'd like you to design the database schema for a food delivery app like Swiggy or Zomato. The requirements are: Users can browse restaurants and place orders containing multiple items from a single restaurant. Each menu item has a name, price, and availability status (restaurants can update their menu at any time). Once an order is placed, the price of items must be preserved even if the restaurant later changes the menu price. Orders go through multiple statuses. Users can rate and review a restaurant only after a confirmed delivered order. Delivery partners are assigned to orders and their live location is tracked. 

I'd like you to define the core tables, explain how you'd preserve item prices, handle soft-deletions of restaurants, and ensure we can query average delivery times efficiently.

**Candidate:** This is a great system to design! Just like any complex application, I'd like to start by clarifying the scope. A food delivery app introduces massive real-time components, so setting the boundaries early is crucial. 

First, do we need to support complex item customizations like "Extra Cheese (+$1)" or just base items? Second, for the live location of delivery partners, do we need to store the entire historical path of the driver, or do we only care about broadcasting their current location to the user? Finally, for the cart, do we need to support a saved "Cart" state, or just the finalized "Order" state?

**Interviewer:** Good questions. Let's stick to base menu items without complex customizations. For the live location, we only care about the current real-time location. And let's focus only on finalized orders.

**Candidate:** Perfect. I'll focus on the standard behavior and track timestamps closely to calculate the average delivery time.

Let's move to **Step 2: Identifying the core entities**.
Before designing tables, I'll extract the core nouns from your requirements:
- **User**: The customer browsing the app and paying.
- **Restaurant**: The business preparing the food.
- **Menu Item**: The individual dishes offered.
- **Delivery Partner**: The driver handling the food.
- **Order**: The overarching transaction for a delivery event.
- **Order Item**: This is a crucial junction entity. Because prices can change tomorrow, we need a "snapshot" of the item, quantity, and exact price at the second the order was placed.
- **Review**: The rating left by a user.

**Interviewer:** Makes sense. How do these entities relate to each other?

**Candidate:** That brings us to **Step 3: Relationships and Cardinality**. Let's map out how they connect.

- **User `<->` Order**: One-to-Many. A user places many orders, but an order belongs to exactly one user.
- **Restaurant `<->` Order**: One-to-Many. A restaurant receives many orders. As per your requirements, an order contains items from a single restaurant.
- **Restaurant `<->` Menu Item**: One-to-Many.
- **Order `<->` Menu Item**: This is naturally a Many-to-Many relationship. An order has multiple items, and a popular item appears in multiple orders. We'll resolve this using `Order Item` as the junction table, resulting in two One-to-Many relationships.
- **Delivery Partner `<->` Order**: One-to-Many.
- **Order `<->` Review**: One-to-One. To enforce your requirement that users can review *only* after a confirmed delivered order, every review must be tied to a specific order ID. One order yields a maximum of one review.

**Interviewer:** Spot on with the one-to-one mapping for reviews. Let's dive into **Step 4: The Schema**. I'm particularly interested in how you handle the item price snapshot and the restaurant deletion.

**Candidate:** I'll outline the core tables and attributes, focusing on the *why* behind the choices. I'll use `DECIMAL(10,2)` for all currency values to ensure precision.

For **Users**, we'd have a `user_id` UUID, `name`, `phone` (unique), and a `created_at` timestamp.

For **Restaurants**, you asked about handling permanent deletion while keeping historical orders visible. We should never run a hard `DELETE` on this table. Instead, we use a `status` flag (e.g., `active`, `deleted`). If a restaurant goes out of business, we soft-delete it by setting the status to `deleted`. This hides it from search results but safely preserves the foreign keys for all past orders. 
The table would have `restaurant_id`, `name`, `address`, and `status`.

For **Menu Items**, we need `item_id`, `restaurant_id` (FK), `name`, `current_price` (the live price today), and a boolean `is_available` to toggle out-of-stock items.

**Interviewer:** What about the orders and the snapshot you mentioned?

**Candidate:** The **Orders** table tracks the lifecycle of the delivery. It needs foreign keys for `user_id`, `restaurant_id`, and `partner_id` (which is nullable until a driver is assigned). It also needs a `status` enum (placed, preparing, delivered, canceled), a `total_amount`, and crucial timestamps: `placed_at` and `delivered_at`.

To solve the pricing issue, we use the **Order Items** table. This is our historical snapshot. 
It has a composite primary key of `(order_id, item_id)`. We store the `quantity` and a `locked_price` column. 
When a user places an order, the backend reads `current_price` from the Menu Items table and copies it into `locked_price` in Order Items. If the restaurant doubles its prices tomorrow, this historical receipt remains completely unaffected.

Finally, the **Reviews** table has a `review_id`, `order_id` (unique FK to enforce the 1:1 rule), `restaurant_id`, `user_id`, a `rating` (1 to 5), and an optional `comment`.

**Interviewer:** I notice you put `restaurant_id` and `user_id` in the Reviews table, but you already have `order_id` which points back to the order. Doesn't that violate database normalization principles?

**Candidate:** Exactly. That brings us to **Step 5: Normalization**. 

In a strict 3NF (Third Normal Form) design, non-key columns must depend on the primary key, and nothing but the primary key. Our design has two deliberate 3NF violations for the sake of read performance.

The first violation is `total_amount` in the Orders table. It's a derived attribute that could dynamically be calculated by querying `SUM(quantity * locked_price)` from Order Items. However, we store it to enforce financial integrity as a hardcoded receipt total, and to quickly render the user's "Order History" without having to execute costly JOINs on the fly.

The second violation is what you caught: `restaurant_id` in the Reviews table. Because calculating a restaurant's average rating is one of the most frequent queries in the entire app, strictly following 3NF would require a `JOIN` with the Orders table every single time. By deliberately duplicating `restaurant_id` in the Reviews table, we eliminate the JOIN completely, massively speeding up the read time.

**Interviewer:** I like that practical tradeoff. Let's talk about **Step 6: Edge Cases**. How would you handle the query for the average delivery time over the last 30 days?

**Candidate:** If we blindly write `AVG(delivered_at - placed_at)`, our math will be completely ruined by canceled orders. Canceled orders never receive a `delivered_at` timestamp, it remains NULL, which breaks aggregate SQL functions. 
The fix is to strictly filter by the order state in the query:
`SELECT AVG(delivered_at - placed_at) FROM Orders WHERE restaurant_id = X AND status = 'delivered' AND placed_at >= NOW() - INTERVAL '30 days';`

**Interviewer:** Makes sense. What if a user hits the "Cancel Order" button at the exact millisecond a restaurant taps "Start Preparing"?

**Candidate:** Ah, a classic race condition. We'd solve this using **Optimistic Locking**. We add a `version` column to the Orders table. Both the user and the restaurant read the order at version 1. The restaurant attempts to update the status to "preparing" and version to 2. The user simultaneously tries to update the status to "canceled" where version = 1. The database ensures only the first update succeeds. The loser gets an error, preventing the company from refunding already-cooked food.

**Interviewer:** Nice. And what about the live location tracking? You have a Delivery Partners table, but how are you storing the GPS pings?

**Candidate:** I explicitly wouldn't store live GPS tracking in the core SQL database! If 100,000 drivers ping their location every 3 seconds, trying to `UPDATE` our PostgreSQL database would instantly crash it from OLTP write exhaustion. 

For real-time viewing on the user's phone, I'd route the GPS pings through a fast, in-memory cache like Redis or a WebSocket Pub/Sub system. If we need to save historical paths for dispute resolution, we'd batch those pings and write them to a highly scalable NoSQL database like Cassandra. We must keep heavy GPS traffic completely away from our precious relational order data.

**Interviewer:** Excellent architectural boundary. Let's move to **Step 7: Indexes**. How do you ensure the system stays fast during the Friday 7:00 PM dinner rush?

**Candidate:** We need to anticipate our exact backend query patterns to build targeted indexes.

For loading a restaurant menu (our most common query), we'd use a composite index on `Menu_Items(restaurant_id, is_available)`. This allows the engine to jump directly to a restaurant's items with out-of-stock items already filtered out.

For calculating that average delivery time, we'd use a composite index on `Orders(restaurant_id, status, placed_at)`. Order matters heavily in a composite index! B-Trees filter from left to right. We put `restaurant_id` and `status` first because they are strict equality checks, and `placed_at` last because it's a range check (`>=`). If we put the range check first, the index stops working efficiently.

For the user's "Where is my food?" screen, a composite index on `Orders(user_id, placed_at DESC)` ensures the data is pre-sorted on the disk. Sorting is highly CPU-intensive, so this lets the database grab the top 10 most recent rows in milliseconds.

Finally, an index on `Reviews(restaurant_id)` supports our denormalized rating query, letting us calculate averages without ever touching the heavy Orders table.

**Interviewer:** Those indexes are well thought out. For **Step 8: Trade-offs**, what sacrifices are you making to scale this to a pan-India launch?

**Candidate:** Recognizing the limits of a traditional relational database is key here. There are three major trade-offs in this architecture:

1. **Perfect Consistency vs. High Availability (The Rating Problem):** Running `AVG(rating)` across millions of rows every time a user opens a restaurant page will eventually bottleneck. We'd introduce Eventual Consistency by adding a `cached_average_rating` directly to the Restaurants table. A background cron job recalculates the averages every 15 minutes. We sacrifice real-time accuracy to keep the app lightning fast.
2. **Storage Space vs. Financial Immutability:** By copying the `current_price` into a new `locked_price` column, we violate the DRY principle and use more hard drive space. The trade-off is sacrificing storage efficiency to guarantee strict historical accuracy. Storage is cheap; legal disputes over altered financial receipts are expensive.
3. **Global Queries vs. Sharding:** A single database simply cannot handle the write load of an entire country at 8:00 PM. Because food delivery is inherently localized (a user in Delhi doesn't care about inventory in Mangaluru), we would shard the database using a geographic partition key like `city_id`. The sacrifice is losing the ability to run simple global SQL queries. To get total national revenue, the backend must perform a Scatter-Gather query (asking every city's shard for their totals) and combine the math in memory.

**Interviewer:** That is a fantastic, production-ready blueprint. You've navigated the real-world complexities of a massive delivery app exceptionally well. Great job!
