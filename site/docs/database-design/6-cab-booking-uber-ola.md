---
id: 6-cab-booking-uber-ola
title: "Design Uber / Ola: Ride-Hailing & Geospatial Matching"
description: "Design a ride-hailing backend like Uber/Ola: geospatial indexing with H3/Geohash, matching drivers to riders, distributed locking, and ETA estimation."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

**Interviewer:** Let's move on to the next design question. I'd like you to design the database schema for a ride-booking application like Uber or Ola. 

Users can book a ride by specifying a pickup and drop location, and the system matches them to an available nearby driver. Drivers have an associated vehicle and can be active or inactive. A ride goes through multiple statuses—requested, driver assigned, en route, started, completed, or cancelled. Pricing is dynamic, meaning the fare is calculated at the end of the trip based on distance, time taken, and a surge multiplier. 

Users and drivers can rate each other after a completed trip. Users should also be able to save multiple payment methods and choose one at the time of booking. Let's focus on the tables, relationships, and how you would ensure that fare disputes can be resolved easily.

**Candidate:** This sounds like an interesting problem! An Uber clone introduces massive concurrency, geospatial data, and dynamic financial calculations. Before we define any tables, I’d like to clarify a few boundaries of the system. 

First, about ride types: do we need to support different vehicle tiers like UberGo or UberXL, or are we assuming a single standard fleet? Second, do we need to support shared rides like UberPool, or strictly point-to-point private rides? 

**Interviewer:** Let's stick to point-to-point private rides for now, but we do need to support different vehicle tiers. 

**Candidate:** Got it. And what about the matching engine? Does this specific database need to handle real-time spatial queries to find cars within a radius, or is that matching handled by a separate fast-cache service like Redis, meaning we only store the final matched result here?

**Interviewer:** Good catch. Real-time matching is handled by a separate service. Your database only needs to store the final matched trip. 

**Candidate:** That makes sense. For pricing, does the user get a guaranteed upfront price before booking, or just an estimate, and they are billed the exact final math when the trip ends? And for saved payment methods, are we storing actual credit card details or secure tokens provided by a gateway like Stripe?

**Interviewer:** The user gets an estimate, but they are billed the exact calculation at the end. For payments, we use a third-party gateway, so just store the secure tokens. 

**Candidate:** Perfect. With those requirements clarified, let's identify the core entities of the system. 

We clearly have a `User` (or rider) and a `Driver`. We'll also need a `Vehicle` entity, as a driver needs a physical car to accept rides. To handle payments, we need a `PaymentMethod` entity to store the saved tokens. 

The core operational entity will be the `Ride` (or trip), which connects the rider, the driver, the vehicle, the route, and the timestamps. 

However, for the financial aspect, I would separate the fare calculation into its own `FareReceipt` entity. While some might merge the receipt into the `Ride` table, separating the physical trip (locations and timestamps) from the financial ledger (distance, time, surge, and total) is crucial for fintech and billing audits. 

Lastly, we need a `Review` entity since users and drivers can rate each other.

**Interviewer:** Separating the physical ride from the financial receipt is a smart move. How do these entities relate to one another?

**Candidate:** Let's trace the cardinality. 

A `User` `<->` `Ride` is a one-to-many relationship, as a user takes many rides, but a specific ride is requested by exactly one user. 
Similarly, `Driver` `<->` `Ride` is one-to-many. 

For vehicles, `Driver` `<->` `Vehicle` is one-to-many. A driver might register multiple vehicles over time (like upgrading from a sedan to an SUV), but a specific vehicle record belongs to one driver. 

For payments, `User` `<->` `PaymentMethod` is one-to-many, since a user can save multiple cards or a UPI ID. 

Now, the `Ride` `<->` `FareReceipt` relationship is strictly one-to-one. One completed ride generates exactly one financial receipt, isolating the financial math. 

Finally, for `Ride` `<->` `Review`, it's a one-to-many relationship, specifically up to two reviews per ride: one from the user and one from the driver.

**Interviewer:** That mapping makes sense. Let's discuss the actual attributes and schema. How are you designing the tables, especially to handle cases where a driver is permanently deactivated, but their history must remain?

**Candidate:** For all financial figures and coordinates, I'll use `DECIMAL` types. 

The `Users` table will have a UUID as the primary key, along with name and phone number. 

The `Vehicles` table will store the license plate, vehicle type (to determine pricing tiers), and model. 

For `Drivers`, to handle the deactivation requirement, we should never hard-delete a row. Instead, we use a soft-deactivation column (e.g., `account_status` as an enum of `active` or `deactivated`). A deactivated driver can't log into the matching engine, but old `driver_id` foreign keys in the `Rides` table remain completely valid. The `Drivers` table will also have a foreign key to the `Vehicles` table representing their currently assigned vehicle.

The `PaymentMethods` table will link to the `user_id` and store the `gateway_token` and `provider_type`.

**Interviewer:** And what about the `Rides` and `FareReceipts` tables?

**Candidate:** The `Rides` table will be the busiest. It will have its own `ride_id` UUID, foreign keys for `user_id`, `driver_id` (which is nullable until assigned), and importantly, `vehicle_id`. 

It will also store `pickup_lat`, `pickup_lng`, `drop_lat`, `drop_lng`, the current `status` (requested, completed, cancelled), and timestamps for `requested_at` and `completed_at`.

The `FareReceipts` table acts as our immutable financial ledger. It will have a `receipt_id`, a unique `ride_id` foreign key, and columns for `distance_km`, `time_minutes`, `surge_multiplier`, `base_fare`, and `final_amount`. By keeping this separate, we ensure that distance, time, and surge are fully traceable for dispute resolution.

For the `Reviews` table, we'll store the `ride_id`, the `rating` (1 to 5), and a `rater_role` enum (`rider` or `driver`) to distinguish who left the review.

**Interviewer:** Let's look closely at your schema from a normalization perspective. Do you see any potential violations?

**Candidate:** Yes, there are two specific choices I made that might look like normalization violations, but they are intentional.

The first is `final_amount` in the `FareReceipts` table. Technically, `final_amount` is a derived attribute calculated by a pricing formula: `(base_fare + (distance_km * rate_per_km) + (time_minutes * rate_per_min)) * surge_multiplier`. Storing a derived column usually violates Third Normal Form (3NF). However, we must store it here because pricing formulas change dynamically over time. If we don't hardcode the `final_amount` into the database the moment the trip ends, a ride taken two years ago might suddenly show a different price when queried today because the base rates changed. Financial ledgers must be immutable snapshots.

The second is storing `vehicle_id` directly in the `Rides` table. You might argue this is a transitive dependency since we can join `Rides -> Drivers -> Vehicles` to find the car. But this is actually a historical snapshot. A driver might drive a sedan today and upgrade to an SUV next year. If we rely on the `Drivers` table to tell us what vehicle was used three years ago, the data will be incorrect. Storing `vehicle_id` on the `Ride` freezes exactly which physical car picked up the user on that specific day.

**Interviewer:** Very solid defense. Let's talk about some edge cases. The product team wants to display the "average rating of a driver over their last 100 trips." How would you calculate that?

**Candidate:** A common mistake here would be to run a simple `SELECT AVG(rating)` with a `LIMIT 100`. But SQL evaluates aggregate functions before applying the limit, so that would return the wrong math. 

Uber does this rolling average because a driver who made a mistake three years ago shouldn't be penalized forever. To solve this, we must use a subquery or a Common Table Expression (CTE) to isolate the 100 trips first, and then average them. We would select the ratings from the `Reviews` table where the `driver_id` matches and the `rater_role` is 'rider', order them by the ride's `completed_at` descending, limit to 100, and wrap that in an `AVG()` function.

**Interviewer:** Good. What happens if a driver is waiting at an airport, and due to network lag, the matching engine sends them two separate ride requests simultaneously? The driver taps "Accept" on both. 

**Candidate:** That’s a classic double-booking race condition. If the database isn't protected, one driver could be assigned to pick up two different people in two different locations simultaneously. 

To fix this, we must guarantee at the database level that a driver can only have one active trip at a time. We can achieve this using a partial unique index: `CREATE UNIQUE INDEX one_active_ride ON Rides(driver_id) WHERE status NOT IN ('completed', 'cancelled')`. If a second active ride tries to save to the database for that driver, the database engine strictly blocks it, and the backend routes the second user to a different driver.

**Interviewer:** What if the driver arrives at the pickup location, waits 10 minutes, and the user never shows up? The driver cancels the trip, but we still need to pay them a cancellation fee, even though the distance was 0km.

**Candidate:** Our separated `FareReceipts` schema handles this perfectly. The `Rides` table status is marked as 'cancelled'. We still generate a `FareReceipt` where `distance_km` is 0, but we populate the `base_fare` with the cancellation penalty (e.g., $5), making the `final_amount` $5. The driver gets paid, the user is charged, and the audit trail is perfectly maintained.

**Interviewer:** Let's discuss query performance. When millions of users and drivers open their apps during a rainstorm, the app pings the backend to ask, "Is this person currently on a ride?" How do you index for that?

**Candidate:** State recovery is incredibly critical. When an app re-opens, it queries for rides belonging to the user where the status is not completed or cancelled. We need a composite index on `Rides(user_id, status)`. We also need its exact mirror for the driver: `Rides(driver_id, status)`. Without these, the database has to scan every ride you have ever taken. With them, the lookup is instantaneous, `O(1)`.

For the 100-trip rating calculation we discussed earlier, sorting millions of rows by timestamp on the fly will bottleneck the CPU. I would create a composite index on `Rides(driver_id, completed_at DESC)`. This way, the database reads the index tree directly, grabs the first 100 rows, and stops, without having to sort anything in memory.

Finally, for customer support resolving fare disputes, we need a single-column index on `FareReceipts(ride_id)`. PostgreSQL and many other SQL databases do not automatically index foreign keys. Even though it's a 1:1 relationship, we must explicitly index it to prevent full table scans when a support ticket is opened.

**Interviewer:** Excellent. To wrap up, what are some massive architectural trade-offs you would make to keep an app like this running globally?

**Candidate:** A ride-sharing app is fundamentally a battle between exact financial precision and massive geographical scale. I would make three major trade-offs.

First: Exact Math vs. Matching Speed. The SQL query to calculate a driver's exact average rating over their last 100 trips is precise, but running that heavy query during the critical 2-second window of matching will cause lag. I would denormalize the schema by adding a `current_rolling_rating` column directly to the `Drivers` table. We sacrifice strict real-time accuracy for `O(1)` read speed. An asynchronous background queue recalculates it later. A rider might see a 4.82 instead of a 4.81, but the matching engine stays lightning fast.

Second: ACID Compliance vs. Real-Time Geospatial Needs. Running bounding box queries across 50,000 moving cars updating their location every 3 seconds in a relational database like PostgreSQL (even with PostGIS) will crash it. I would offload live location tracking entirely to an in-memory datastore like Redis using Geohashes. We sacrifice durability since Redis uses RAM—if the server crashes, we momentarily lose car locations until they ping again 3 seconds later. For a transient GPS blip, losing data is an acceptable business sacrifice, unlike losing financial data.

Third: Infinite Data Growth vs. OLTP Speed. The `Rides` and `FareReceipts` tables will become too massive to index efficiently over time. I would implement an aggressive data archiving strategy. The main PostgreSQL database (the OLTP system) would only hold rides from the last 6 months. A nightly cron job moves older rides into a massive analytical data warehouse like Snowflake. We trade a slightly worse user experience—taking a few seconds to load a 2-year-old receipt—in exchange for keeping the live booking engine completely unobstructed.

**Interviewer:** Fantastic breakdown. You clearly understand when to stick to database normalization rules and when to strategically break them for scale.
