---
id: 8-ecommerce-amazon-flipkart
title: "Design Amazon / Flipkart: E-Commerce Inventory & Checkout"
description: "A full schema-design interview for a marketplace, worked one decision at a time: why availability is a derivation rather than a column, what happens in the seconds between placing an order and the payment clearing, why one checkout is many outcomes, and why a coupon counter is not a coupon."
sidebar_position: 8
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

---

### How to read this page

The schema at the bottom of this page is not the answer. The answer is the order the
decisions were made in, and what each one cost.

> **If you are revising the night before**, read Steps 1, 2, 5, 6 and 18, then the final
> schema in Step 17. That is the spine: separate the catalog from the listing, discover
> that a stock column cannot survive the payment window, and replace it with reservations
> plus a derived availability.
>
> **Say in the room** what Steps 1–8 cover. Steps 9–16 are depth for when an interviewer
> pushes on flash sales, search or analytics — and Step 10 is the one that most often
> separates candidates, because "use two-phase commit" is a trap and saying why is worth
> more than naming the pattern.

This is the last of the five worked schema questions, and each one has turned on a
different property of its domain. [Splitwise](./4-expense-splitting-splitwise) is about
arithmetic that must sum to zero. [Swiggy](./5-food-delivery-swiggy-zomato) is about time.
[Uber](./6-cab-booking-uber-ola) is about committing to a price before you know what you
are selling. [Zerodha](./7-stock-trading-zerodha-groww) is about never overwriting a
number.

A marketplace is about **a promise you make before you can keep it**. A customer clicks
buy; the money has not arrived, the warehouse has not picked anything, and the seller may
not even have the item. Everything hard here lives in the gap between saying "yours" and
it being true. The single most expensive bug in e-commerce — overselling — lives entirely
inside that gap, and it is invisible to any schema that stores availability as a number.

Conventions carried over: `BIGINT GENERATED ALWAYS AS IDENTITY` keys, `NUMERIC(14,2)` for
money, `TIMESTAMPTZ` everywhere, soft deletes for anything financial history references.

---

### Step 1 — Pin down what we are building

**Interviewer:** Design the database for a marketplace like Amazon or Flipkart. Customers
browse, add to a cart, and place orders containing products from several sellers. The same
product can be listed by many sellers at different prices with their own stock. If two
customers order the last unit, exactly one should succeed. There are coupons, order
statuses, and reviews — and a reviewer must have actually received the item.

**Candidate:** Four questions, each of which removes work.

Does one checkout across three sellers create one order or three?

**Interviewer:** One parent order containing many items.

**Candidate:** Good — and I will argue in Step 7 that this is right for the *customer* and
insufficient for the *system*, because three sellers means three independent outcomes.
Accepting it now keeps the customer-facing object simple.

Does the live cart live in this database?

**Interviewer:** No. It is in Redis. SQL sees it at checkout.

**Candidate:** That removes the highest-write, lowest-value table in the whole design.
Carts are edited constantly, abandoned about seventy percent of the time, and nothing
downstream audits them.

Coupons — flat or percentage, and what limits?

**Interviewer:** Percentage off the cart total, with an expiry and a maximum number of uses
across all customers.

**Candidate:** A global cap is a contended counter, which is a concurrency problem rather
than a schema problem, and I will come back to it in Step 8 because the obvious counter is
wrong in a way that costs real money.

Last: is payment synchronous? Does `place order` return after the money has cleared?

**Interviewer:** Why does that matter?

**Candidate:** Because it decides whether there is a *window*. UPI, netbanking and 3-D
Secure all redirect the customer away and call back seconds — sometimes minutes — later.
If the order exists before the money arrives, then something must hold that stock in the
meantime, and that something is the hardest object in this schema. If payment were
synchronous and instant, half of this design would not be needed.

**Interviewer:** Assume it is asynchronous. A gateway calls you back.

**Candidate:** Then I would like to design for that window explicitly rather than discover
it, because it is where overselling happens.

---

### Step 2 — Catalog: product, variant, listing

**Interviewer:** Start with products.

**Candidate:** With three tables rather than one, because "product" is three different
things that the word hides.

**The product** is the thing a customer thinks about and searches for: "iPhone 15". It owns
the title, the description, the brand and the category. It has **no price and no stock**,
and that is the whole point.

**The variant** is what actually ships: "iPhone 15, Black, 256 GB". It owns the attributes
that distinguish it and it is the unit of inventory. Customers compare at the product level
and buy at the variant level.

**The listing** is one seller's offer of one variant: their price, their stock, their
fulfilment promise. Twelve sellers offering the same phone is twelve listings against one
variant.

```sql title="catalog"
CREATE TABLE products (
    product_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       TEXT        NOT NULL,
    description TEXT,
    brand_id    BIGINT      REFERENCES brands(brand_id),
    category_id BIGINT      NOT NULL REFERENCES categories(category_id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE variants (
    variant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT      NOT NULL REFERENCES products(product_id),
    sku        TEXT        NOT NULL UNIQUE,
    attributes JSONB       NOT NULL DEFAULT '{}',   -- {"colour":"black","storage":"256GB"}
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE listings (
    listing_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    variant_id BIGINT        NOT NULL REFERENCES variants(variant_id),
    seller_id  BIGINT        NOT NULL REFERENCES sellers(seller_id),
    price      NUMERIC(14,2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (variant_id, seller_id)
);
```

**Interviewer:** Why is `attributes` a `JSONB` blob? That is not very relational of you.

**Candidate:** It is the one place I would reach for it, and the reason is that the
attribute *set* varies by category rather than by row. A phone has colour and storage; a
shirt has size and fit; a book has none of those and has a page count. Modelling that
relationally gives you either a table per category — unmanageable at tens of thousands of
categories — or an entity-attribute-value table, which is a relational database pretending
to be a key-value store, and performs like one.

What keeps it honest is that nothing *transactional* reads it. Price, stock, orders and
money are all proper columns with proper constraints. `attributes` drives display and
faceted search, and search is leaving this database anyway in Step 12. A `JSONB` column
whose contents never participate in a financial decision is a reasonable place to be
flexible.

:::decision

Three levels — product, variant, listing — with `JSONB` only for display attributes.

Separating the catalog from the offer is what makes a marketplace a marketplace. Fold
price and stock into `products` and you have a shop, not a platform, and no migration later
recovers the distinction cheaply.

*Cost:* two joins to render a product page. Both are on small, heavily cached tables, and
the page is served from a read replica or a cache in any case.

:::

---

### Step 3 — Where stock actually lives

**Interviewer:** Put a `stock_count` on the listing and move on.

**Candidate:** That is the version I want to write first and then take apart, because it is
wrong in two independent ways and only one of them is obvious.

The non-obvious one: **stock has a location.** The same seller's units sit in Bangalore and
in Delhi, and that decides whether the customer is promised delivery tomorrow or on
Thursday. One integer on the listing cannot express it, and "available" is not even a
single answer — it depends on who is asking and where they live.

```sql title="stock, by listing and location"
CREATE TABLE stock (
    listing_id  BIGINT NOT NULL REFERENCES listings(listing_id),
    location_id BIGINT NOT NULL REFERENCES locations(location_id),
    on_hand     INT    NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
    PRIMARY KEY (listing_id, location_id)
);
```

The obvious way it is wrong is the subject of Step 5.

---

### Step 4 — `orders`, first cut

```sql title="orders — first cut"
CREATE TABLE orders (
    order_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT        NOT NULL REFERENCES users(user_id),
    status       order_status  NOT NULL DEFAULT 'placed',
    coupon_id    BIGINT        REFERENCES coupons(coupon_id),
    total_amount NUMERIC(14,2) NOT NULL,
    placed_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    order_id     BIGINT        NOT NULL REFERENCES orders(order_id),
    line_no      SMALLINT      NOT NULL,
    listing_id   BIGINT        NOT NULL REFERENCES listings(listing_id),
    variant_id   BIGINT        NOT NULL,
    seller_id    BIGINT        NOT NULL,
    title_snapshot TEXT        NOT NULL,
    unit_price   NUMERIC(14,2) NOT NULL,
    quantity     INT           NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, line_no)
);
```

The snapshotting is settled by now and I will not re-derive it: `unit_price` and
`title_snapshot` are copied onto the line because a receipt must be readable without
consulting a table the seller is still editing. The argument is in Step 6 of the Swiggy
question; `line_no` rather than `listing_id` as the key is from the same place.

`total_amount` is stored for the same reason: change the "DIWALI50" coupon from 10% to 15%
tomorrow and a recomputed total would restate what somebody already paid.

What is not settled is everything that happens next.

---

### Step 5 — Break #1: the payment window

:::broke

Decrementing stock when payment succeeds oversells for the length of the payment window.
Decrementing when the order is placed loses every sale where payment fails. There is no
third moment, and the schema has no way to represent "spoken for".

:::

**Interviewer:** Two customers order the last unit. How do you stop both succeeding?

**Candidate:** The decrement itself is the easy half, and it is the same primitive as the
previous three questions — check and write in one statement, so there is no window between
reading and acting:

```sql title="The decrement is not the hard part" {4}
UPDATE stock
   SET on_hand = on_hand - $3
 WHERE listing_id = $1 AND location_id = $2
   AND on_hand >= $3
RETURNING on_hand;
```

Zero rows means somebody else got it. The database arbitrates, with no application lock.

The hard part is **when** to run it, and the honest answer is that both available moments
are wrong.

**Interviewer:** Explain.

**Candidate:** Run it when payment succeeds, and look at the window. The customer places
the order at 10:00:00 and is redirected to their bank. The gateway calls back at 10:00:40.
For forty seconds that unit is still "available" to everyone else, and the site will
cheerfully take another nine orders for it. Nine customers get a confirmation email and
then an apology, which in most jurisdictions is a contract you have broken, and in all of
them is a customer you have lost.

Run it when the order is placed, and the opposite happens. Payment fails — and it fails
often, perhaps a fifth of the time on netbanking — and that unit is now permanently
decremented with nothing to show for it. Within a day the warehouse holds stock the site
says it does not have.

**Interviewer:** So what is the third option?

**Candidate:** There is no third *moment*. There is a third **state**.

The unit is not available and it is not sold. It is **held** — committed to an order that
has not completed, for a bounded period, after which the hold evaporates. That is a fact
with a lifetime, and facts with lifetimes are rows, not integers.

This is the same realisation as blocked funds in the trading question, and the same as the
ride quote in the Uber one. A promise that may or may not be kept is an object. The
recurring mistake is trying to encode it as an adjustment to a number.

---

### Step 6 — Reservations, and availability as a derivation

```sql title="stock_reservations"
CREATE TABLE stock_reservations (
    reservation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    listing_id     BIGINT            NOT NULL,
    location_id    BIGINT            NOT NULL,
    order_id       BIGINT            NOT NULL REFERENCES orders(order_id),
    quantity       INT               NOT NULL CHECK (quantity > 0),
    state          reservation_state NOT NULL DEFAULT 'held',
    expires_at     TIMESTAMPTZ       NOT NULL,
    created_at     TIMESTAMPTZ       NOT NULL DEFAULT now(),
    FOREIGN KEY (listing_id, location_id) REFERENCES stock (listing_id, location_id)
);
```

A reservation is `held`, then either `committed` when payment clears or `released` when it
fails or expires. Availability is then not a column at all:

> **available = on_hand − (sum of held reservations)**

**Interviewer:** You have just made the most frequently read number in the entire site into
an aggregate.

**Candidate:** I have, and that is not sustainable — the product page asks "is this in
stock" millions of times an hour. So the sum gets materialised, in exactly the shape the
trading question used for account balances:

```sql title="The counter is a cache; the rows are the truth" {5}
ALTER TABLE stock
    ADD COLUMN reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    ADD CHECK (reserved <= on_hand);

-- Reserve: guarded on derived availability, in one statement.
UPDATE stock
   SET reserved = reserved + $3
 WHERE listing_id = $1 AND location_id = $2
   AND on_hand - reserved >= $3
RETURNING on_hand - reserved AS now_available;
```

Written in the same transaction as the reservation row, never by a job. The `CHECK
(reserved <= on_hand)` is the backstop: even a buggy future code path cannot drive the
system into a state where more units are promised than exist.

That shape — **facts in rows, a counter as a provable cache, a `CHECK` encoding the
business rule, reconciliation against the rows** — is the fourth time it has appeared
across these five questions. It is worth recognising as a pattern rather than rediscovering
it each time.

**Interviewer:** What expires a hold?

**Candidate:** A sweeper, and it needs an index that contains only the rows it looks at:

```sql title="Releasing expired holds"
CREATE INDEX reservations_expiring
    ON stock_reservations (expires_at)
    WHERE state = 'held';
```

A few thousand rows at any instant out of billions, because a reservation leaves the index
the moment it is committed or released. The sweeper releases the hold and decrements
`reserved` in one transaction.

**Interviewer:** And if the gateway's callback arrives after the hold expired?

**Candidate:** That is the case worth designing for rather than hoping about, because it
*will* happen — gateways retry, and networks stall.

The payment succeeded, so the money is real. The hold is gone, and the stock may have been
sold to somebody else. The order cannot be silently failed, because the customer has paid.

So the commit step is itself a guarded update against live stock, and if it fails the order
moves to a `payment_received_unfulfillable` state that triggers a refund. That is a real
business outcome, not an error — and naming it in the schema is what stops it becoming a
support ticket discovered three days later. The alternative, quietly committing a
reservation that no longer exists, oversells and is invisible.

:::decision

Reservations as rows with an expiry; availability derived; a materialised `reserved`
counter as a provable cache.

The window between intent and payment is a real interval, and the only designs that survive
it are the ones that give it a representation.

*Cost:* a row per order line at checkout, a sweeper, and a counter to keep honest. The
sweeper is a partial-index scan over a few thousand rows.

*Would change if:* payment were synchronous and instant. Then intent and completion
coincide, there is no window, and a single guarded decrement is genuinely enough. Worth
saying, because it shows the reservation is paying for something specific rather than being
ceremony.

:::

---

### Step 7 — Break #2: one order, many sellers, many outcomes

:::broke

`orders.status` assumes a checkout has one outcome. A cart spanning three sellers has
three, and they diverge within hours.

:::

**Interviewer:** A customer buys a laptop from one seller and a mouse from another. The
laptop ships. The mouse is cancelled because the seller has none.

**Candidate:** And `orders.status` must now be a single value describing a laptop in transit
and a cancelled mouse. There isn't one. Teams invariably invent `partially_shipped`, then
`partially_cancelled`, then `partially_delivered_partially_returned`, and the enum becomes
a cross-product of states that nobody can reason about.

The error is that status was attached to the wrong object. **Fulfilment is per seller, not
per checkout.**

```sql title="Status moves down a level" {3}
ALTER TABLE order_items
    ADD COLUMN status      order_item_status NOT NULL DEFAULT 'placed',
    ADD COLUMN delivered_at TIMESTAMPTZ;
```

The order keeps a status too, but it becomes a **summary** — derived from its items for
display — rather than the authoritative state of anything. One line cancelled does not make
the order cancelled; it makes the order "partially fulfilled", which is a rendering
decision, not a fact.

**Interviewer:** Does that not just move the cross-product problem?

**Candidate:** No, because at the item level the states are genuinely linear: placed,
confirmed, packed, shipped, delivered, or cancelled or returned. There is no combination to
represent, because an item is one physical thing with one history.

And as with the previous questions, those transitions get an event log rather than only a
column — the `order_status_events` design from Step 7 of the Swiggy question, applied per
item. "How long did this seller take to ship" is the metric the entire seller-performance
system is built on, and a mutable status column cannot answer it.

Money follows the same split. A refund for the cancelled mouse is not a refund of the
order; it is a refund of a line. The `fare_components` shape from the Uber question
transfers directly: a `payments` and `refunds` ledger keyed per item, where the order total
is the sum rather than the source.

---

### Step 8 — Break #3: a coupon counter is not a coupon

:::broke

`times_used < max_usage` on a counter answers the global cap and nothing else — not one per
customer, not what happens when the order is cancelled, and not the payment window all over
again.

:::

**Interviewer:** A coupon capped at 10,000 uses. Keep a counter and guard the increment.

**Candidate:** That is correct for exactly the stated requirement, and it is the version
the first draft of this answer gave:

```sql title="Correct, and not enough"
UPDATE coupons
   SET times_used = times_used + 1
 WHERE coupon_id = $1 AND times_used < max_usage
RETURNING times_used;
```

Three things it cannot do, and each one is a question a product manager asks within a
month.

**"One per customer."** A counter has no idea who incremented it. Answering needs rows.

**"The order was cancelled — does the coupon come back?"** With a counter you can decrement,
but you cannot tell a legitimate release from a double-decrement caused by a retry, because
there is nothing identifying *which* use you are reversing.

**And the payment window, again.** A coupon consumed at order placement is lost when payment
fails. One consumed at payment success lets the last coupon be handed to fifty people
during the window — the identical failure as Step 5, on a different resource.

So a redemption is a row, with the same lifecycle the reservation has:

```sql title="coupon_redemptions"
CREATE TABLE coupon_redemptions (
    coupon_id  BIGINT            NOT NULL REFERENCES coupons(coupon_id),
    order_id   BIGINT            NOT NULL REFERENCES orders(order_id),
    user_id    BIGINT            NOT NULL REFERENCES users(user_id),
    state      reservation_state NOT NULL DEFAULT 'held',
    expires_at TIMESTAMPTZ       NOT NULL,
    created_at TIMESTAMPTZ       NOT NULL DEFAULT now(),
    PRIMARY KEY (coupon_id, order_id)
);

-- "One per customer" becomes a constraint rather than a code path.
CREATE UNIQUE INDEX coupon_once_per_user
    ON coupon_redemptions (coupon_id, user_id)
    WHERE state <> 'released';
```

The counter stays — as a cache over the rows, guarded exactly as before, with the rows as
the truth. The partial unique index is doing the work that no counter can: a released
redemption stops blocking, so a cancelled order genuinely gives the customer their coupon
back, once, verifiably.

:::decision

Redemptions as rows with the same held/committed/released lifecycle as stock; the counter
demoted to a cache.

A coupon and a unit of stock are the same kind of object — a scarce resource, promised
before it is consumed, sometimes released. They should not have two different mechanisms.

*Cost:* a row per redemption and a second sweeper. The sweeper is the same code as the
stock one, over the same shape of partial index.

:::

---

<details>
<summary><b>Schema checkpoint — everything as it stands after Step 8</b></summary>

```sql
products            (product_id PK, title, description, brand_id, category_id, deleted_at)
variants            (variant_id PK, product_id FK, sku UNIQUE, attributes JSONB)
sellers             (seller_id PK, name, status, deleted_at)
locations           (location_id PK, seller_id FK, city, pincode)
listings            (listing_id PK, variant_id FK, seller_id FK, price,
                     UNIQUE (variant_id, seller_id))

stock               (listing_id, location_id, on_hand, reserved,
                     PK (listing_id, location_id),
                     CHECK (reserved <= on_hand))
stock_reservations  (reservation_id PK, listing_id, location_id, order_id FK,
                     quantity, state, expires_at)

orders              (order_id PK, user_id FK, status, coupon_id FK,
                     total_amount, placed_at)
order_items         (order_id FK, line_no, listing_id FK, variant_id, seller_id,
                     title_snapshot, unit_price, quantity, status, delivered_at,
                     PK (order_id, line_no))
order_item_events   (event_id PK, order_id, line_no, status, occurred_at, actor)

coupons             (coupon_id PK, code UNIQUE, percent_off, max_usage,
                     times_used, expires_at)
coupon_redemptions  (coupon_id FK, order_id FK, user_id FK, state, expires_at,
                     PK (coupon_id, order_id))
```

Two things to notice. `stock.on_hand` is never touched during checkout — only `reserved`
moves, and `on_hand` changes when the warehouse physically picks or receives. And the
reservation and the redemption share a state machine, deliberately.

</details>

---

### Step 9 — Flash sales: admission control, not a faster database

**Interviewer:** A phone launches at noon. A hundred thousand people check out in five
seconds. Does this survive?

**Candidate:** Not as written, and the usual answer — move the decrement into Redis with a
Lua script — is right in outline and dangerous in the detail the first draft of this answer
glossed over.

The failure mode is not throughput. It is that **every one of those hundred thousand
requests contends on the same row.** Postgres serialises writers on a row, so the
guarded update becomes a queue of a hundred thousand transactions deep, each waiting for a
lock, every one holding a connection. The pool exhausts, and the failure spreads to
customers buying something else entirely.

**Interviewer:** So Redis.

**Candidate:** Yes, but with the boundary drawn carefully, and I want to be precise because
the casual version of this advice is how real money gets lost.

The dangerous framing is "Redis is the inventory, SQL catches up later". If Redis loses its
state — a failover, an eviction, a restart — the system has no idea how many units it has
already sold, and the reconciliation finds it after the customers do.

The safe framing is that Redis is **admission control**. It holds a counter of *tickets*
for the sale, pre-loaded from the database. A request that cannot take a ticket is rejected
immediately, at the edge, without touching Postgres at all. A request that takes one
proceeds through the ordinary reservation path, which remains authoritative.

- Tickets are **at most** the real stock, so losing Redis cannot oversell — it can only
  under-admit, which costs a retry rather than an apology.
- The database still arbitrates every actual reservation, so the `CHECK (reserved <=
  on_hand)` guarantee is untouched.
- The hundred thousand becomes perhaps a thousand that reach the database, which one row
  can serialise comfortably.

:::decision

Redis as a rejection gate in front of the database, not as the inventory of record.

The expensive request is the one that is going to fail anyway, and it should fail in
microseconds at the edge rather than after waiting in a lock queue.

*The asymmetry that makes it safe:* losing the cache under-sells. Trusting the cache
oversells. One of those is a retry; the other is a broken contract with a customer who has
paid.

:::

---

### Step 10 — The outbox, because there is no two-phase commit here

**Interviewer:** When an order is placed you need to charge a card, email the customer,
notify the seller and update the search index. How do you make that atomic?

**Candidate:** You cannot, and recognising that is the answer.

The instinct is a distributed transaction — two-phase commit across the database and the
other systems. It does not apply, for a blunt reason: **the payment gateway is not a
participant.** XA requires every party to implement prepare-and-commit and to hold locks
while a coordinator decides. A third-party HTTPS API does none of that, and no amount of
willingness on your side changes it. The same is true of an email provider and of
Elasticsearch.

So the guarantee has to be built from what a single-database transaction *can* promise, and
the standard construction is the **outbox**.

```sql title="outbox"
CREATE TABLE outbox (
    outbox_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aggregate    TEXT        NOT NULL,     -- 'order'
    aggregate_id BIGINT      NOT NULL,
    event_type   TEXT        NOT NULL,     -- 'order_placed'
    payload      JSONB       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);

CREATE INDEX outbox_unpublished ON outbox (outbox_id)
    WHERE published_at IS NULL;
```

The order, its items, its reservations and the outbox row are written in **one local
transaction**. Either all of it happened or none of it did — that is ordinary ACID, with no
coordinator. A separate relay then reads unpublished rows and delivers them to the gateway,
the mailer and the indexer, marking them published as it goes.

What this buys is that **the database and the outside world can never disagree about
whether the order exists.** The relay may deliver a message twice if it crashes between
sending and marking, so every consumer must be idempotent — which is why the payment call
carries the idempotency key from
[the crash-recovery question](../dbms-additional/35-crash-recovery-and-idempotency).

That is the trade: at-least-once delivery with idempotent consumers, instead of exactly-once
delivery that is not available at any price.

:::decision

Transactional outbox with an idempotent relay, over any distributed-transaction scheme.

The participants that matter are third parties who will never join a 2PC. Designing as if
they might produces a system that is complex *and* still wrong at the boundary.

*Cost:* consumers must tolerate duplicates, and there is a relay to operate. Both are well
understood, and the duplicate-tolerance is needed regardless because networks retry.

:::

---

### Step 11 — Reviews, and who is allowed to write one

**Interviewer:** Only customers who received the item may review it.

**Candidate:** Two rules hide in that sentence, and the first draft of this answer got the
second one wrong.

The first is proof of delivery. The second is **one review per customer per product** — and
tying the review to an order item, as that draft did, silently permits a customer who buys
the same phone three times to post three reviews. For a marketplace with a ratings economy,
that is a vector, not an edge case.

So the uniqueness is on `(user_id, product_id)`, and the delivery proof is a reference to
the specific line that earns it. The composite-foreign-key technique from
[the Swiggy question](./5-food-delivery-swiggy-zomato) does the proof without a trigger:

```sql title="Proof of delivery, enforced structurally" {4,5,16,17}
ALTER TABLE order_items
    ADD COLUMN is_delivered BOOLEAN
        GENERATED ALWAYS AS (delivered_at IS NOT NULL) STORED;

ALTER TABLE order_items
    ADD CONSTRAINT order_items_delivered_uniq
        UNIQUE (order_id, line_no, is_delivered);

CREATE TABLE reviews (
    review_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT   NOT NULL REFERENCES users(user_id),
    product_id   BIGINT   NOT NULL REFERENCES products(product_id),
    order_id     BIGINT   NOT NULL,
    line_no      SMALLINT NOT NULL,
    is_delivered BOOLEAN  NOT NULL CHECK (is_delivered),
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id),
    FOREIGN KEY (order_id, line_no, is_delivered)
        REFERENCES order_items (order_id, line_no, is_delivered)
);
```

The `CHECK` pins `is_delivered` to true on every review row, and the composite foreign key
then demands that the referenced line is in fact delivered. A review of an undelivered item
is unrepresentable.

**Interviewer:** What about a return? The item was delivered and then sent back.

**Candidate:** Deliberately, the review survives — which is both the product behaviour every
marketplace has and the thing that makes the constraint sound. `is_delivered` is generated
from `delivered_at`, a timestamp of something that physically happened, not from a mutable
status. A return writes a different column. Had I keyed this on a `status` enum that moves
to `returned`, the foreign key would fire on the return and either block it or orphan the
review.

That is the same caveat as the Swiggy version, and the same resolution: **the referenced
fact has to be one that cannot be taken back.**

---

### Step 12 — Search does not belong here

**Interviewer:** Customers search "blue sony hedphones".

**Candidate:** Which contains a typo, needs stemming, has to rank by relevance blended with
popularity and availability, and must drive faceted filters. Postgres has full-text search
and it is genuinely good — but not for this. `LIKE '%...%'` cannot use a B-tree at all, and
even `tsvector` with a GIN index gives no fuzzy matching, no tunable relevance, no facet
counts.

The catalog streams to a search engine, and the outbox from Step 10 is already the
mechanism. The trade is a lag of seconds between a price change and the search index
reflecting it, which is invisible, because the product page reads from the database
anyway and search results are a navigation aid rather than a quotation.

The important boundary: **search returns identifiers, never prices or stock.** The moment a
search result carries a price, you have two sources for a number a customer might hold you
to, and they are seconds apart.

---

### Step 13 — "Top 5 best sellers this week" is an OLAP question

**Interviewer:** Top five products by units sold in the last seven days.

**Candidate:** The first draft of this answer reached for indexes —
`orders(placed_at, status)` plus foreign-key indexes on the item table — and that is the
right instinct applied to the wrong class of query.

Indexes make a query fast by letting it **avoid reading rows**. This query has to read
every order item in seven days — tens of millions — and aggregate them. There is no
predicate to narrow it, because the answer depends on all of it. An index can at best let
it scan a slightly narrower structure.

The shape that works is to pay the cost incrementally:

```sql title="A rollup maintained as orders complete"
CREATE TABLE daily_product_sales (
    sale_date  DATE   NOT NULL,
    product_id BIGINT NOT NULL,
    units      BIGINT NOT NULL DEFAULT 0,
    revenue    NUMERIC(18,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (sale_date, product_id)
);
```

Seven days of top-five is then a scan of a few hundred thousand small rows with an index on
`(sale_date)` — milliseconds, and it never touches the order tables, so the analytics load
cannot slow down checkout.

:::decision

An incrementally maintained rollup for merchandising queries; the order tables left alone.

*The general rule:* if a query's answer depends on every row in a range, no index will save
it. The only lever is to compute it before it is asked.

*Cost:* one more write per sold item, and a rollup that can drift. It is rebuilt nightly
from the orders, which is cheap because it is a single pass over one day.

*Anything deeper* — cohorts, attribution, seller analytics — leaves for a warehouse fed by
the same outbox. It does not belong on the instance taking orders.

:::

---

### Step 14 — The Buy Box

**Interviewer:** Twelve sellers list the phone. Which one does the page show?

**Candidate:** For our purposes, the cheapest seller who actually has stock — real Buy Box
logic also weighs delivery speed and seller rating, but the schema problem is identical.

The first draft proposed `listings(product_id, stock_count, price ASC)`, and the column
order is wrong in a way worth examining because it is a subtle version of a rule that has
come up in every one of these questions.

The query is: equality on the variant, a *range* on availability, and an *ordering* by
price. In a B-tree, once you use a column for a range scan, columns after it are no longer
sorted within the result — so putting availability before price means the index cannot
deliver rows in price order, and the planner sorts them anyway.

The fix is to make availability an equality condition instead of a range, by moving it into
a partial index:

```sql title="Availability in the predicate, price in the key" {4}
CREATE INDEX listings_buybox
    ON listings (variant_id, price)
    WHERE deleted_at IS NULL;
```

with the availability check applied against `stock` in the join. The index now yields
listings for a variant already in price order, and the first row with stock wins. The
partial predicate also keeps delisted sellers out of the index entirely.

That is the general form of the leftmost-prefix rule, stated more carefully than "equality
first, range last": **a range or sort column must come after every equality column and
before nothing you need ordered.** Conditions that can be pushed into a partial index stop
being range predicates at all, which is usually the cheapest fix available.

---

### Step 15 — Indexing, derived from the queries

```sql title="Q1 — product page: the listings for a variant"
CREATE INDEX listings_by_variant ON listings (variant_id, price)
    WHERE deleted_at IS NULL;
```

```sql title="Q2 — my orders, newest first"
CREATE INDEX orders_by_user ON orders (user_id, placed_at DESC);
```

Paginated by keyset on `(placed_at, order_id)`, not `OFFSET`.

```sql title="Q3 — the seller's queue of things to pack"
CREATE INDEX order_items_seller_open
    ON order_items (seller_id, order_id)
    WHERE status IN ('confirmed', 'packed');
```

Partial, and it is the most valuable index on the page. A seller's open queue is dozens of
rows; their history is millions. Rows leave the index when they ship, so it stays small
permanently.

```sql title="Q4 — reviews on a product page"
CREATE INDEX reviews_by_product ON reviews (product_id, created_at DESC);
```

```sql title="Q5 — the two sweepers"
CREATE INDEX reservations_expiring ON stock_reservations (expires_at)
    WHERE state = 'held';
CREATE INDEX redemptions_expiring  ON coupon_redemptions (expires_at)
    WHERE state = 'held';
```

And the foreign-key indexes Postgres does **not** create for you — without them, updating
or deleting a referenced row sequentially scans the referencing table to check the
constraint:

```sql title="Foreign keys are not indexed automatically"
CREATE INDEX order_items_by_listing ON order_items (listing_id);
CREATE INDEX reservations_by_order  ON stock_reservations (order_id);
```

Worth the symmetric caution from the trading question: not every foreign key needs one.
`order_items(order_id)` is already the leftmost column of its primary key, and adding it
would duplicate an existing structure.

---

### Step 16 — Partitioning and sharding

`orders` and `order_items` only grow, and the reasoning from the previous two questions
applies unchanged: partition by month, because the first problem with an enormous table is
that its **indexes stop fitting in memory**, and that is solved on one machine.

The costs are the same ones, and they are worth restating because they catch people:
foreign keys into a partitioned table stop being declarable, and the partition key must be
carried into every child table's primary key.

Sharding is where this domain differs from the previous two, and it is worth being explicit
about why.

**Interviewer:** Shard by what? Customer, or seller?

**Candidate:** That is exactly the tension, and unlike food delivery there is no key that
makes everything local.

Shard by **customer** and "my orders" is a single-shard read, which is the most common query
in the product. But a seller's queue of items to pack is scattered across every shard, and
that is the query their entire business runs on.

Shard by **seller** and the reverse is true.

There is no city here to save us. A marketplace is genuinely many-to-many between customers
and sellers, so one of the two paths must be remote.

:::decision

Shard by customer; give sellers a separate read model fed by the outbox.

The customer path is latency-critical and user-facing; the seller path is a tool used by
far fewer people who tolerate a second of lag. The outbox already publishes every item
transition, so the seller view is a consumer of a stream that exists.

*The catalog — products, variants, listings, sellers — is global*, replicated to every
shard. It is small, slow-changing and read everywhere.

*Cost:* seller-facing data is eventually consistent, and a seller may see an order a second
after the customer does. Saying this out loud is the point: when no shard key makes both
paths local, you are choosing which one to make remote, and the honest answer names the
loser.

:::

---

### Step 17 — The final schema

```sql title="The complete schema"
CREATE TYPE order_status       AS ENUM ('placed','payment_pending','confirmed',
                                        'partially_fulfilled','completed','cancelled',
                                        'payment_received_unfulfillable');
CREATE TYPE order_item_status  AS ENUM ('placed','confirmed','packed','shipped',
                                        'delivered','cancelled','returned');
CREATE TYPE reservation_state  AS ENUM ('held','committed','released');

CREATE TABLE users (
    user_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone      VARCHAR(16) NOT NULL,
    email      VARCHAR(320),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE sellers (
    seller_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE locations (
    location_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    seller_id   BIGINT NOT NULL REFERENCES sellers(seller_id),
    city        TEXT   NOT NULL,
    pincode     TEXT   NOT NULL
);

CREATE TABLE products (
    product_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       TEXT        NOT NULL,
    description TEXT,
    brand_id    BIGINT,
    category_id BIGINT      NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE variants (
    variant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT      NOT NULL REFERENCES products(product_id),
    sku        TEXT        NOT NULL UNIQUE,
    attributes JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE listings (
    listing_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    variant_id BIGINT        NOT NULL REFERENCES variants(variant_id),
    seller_id  BIGINT        NOT NULL REFERENCES sellers(seller_id),
    price      NUMERIC(14,2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (variant_id, seller_id)
);

CREATE TABLE stock (
    listing_id  BIGINT NOT NULL REFERENCES listings(listing_id),
    location_id BIGINT NOT NULL REFERENCES locations(location_id),
    on_hand     INT    NOT NULL DEFAULT 0 CHECK (on_hand  >= 0),
    reserved    INT    NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    PRIMARY KEY (listing_id, location_id),
    CHECK (reserved <= on_hand)
);

CREATE TABLE orders (
    order_id     BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id      BIGINT        NOT NULL REFERENCES users(user_id),
    status       order_status  NOT NULL DEFAULT 'placed',
    coupon_id    BIGINT,
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    placed_on    DATE          NOT NULL,
    placed_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (placed_on, order_id)
) PARTITION BY RANGE (placed_on);

CREATE TABLE order_items (
    order_id       BIGINT            NOT NULL,
    line_no        SMALLINT          NOT NULL,
    placed_on      DATE              NOT NULL,
    listing_id     BIGINT            NOT NULL REFERENCES listings(listing_id),
    variant_id     BIGINT            NOT NULL,
    seller_id      BIGINT            NOT NULL,
    title_snapshot TEXT              NOT NULL,
    unit_price     NUMERIC(14,2)     NOT NULL CHECK (unit_price >= 0),
    quantity       INT               NOT NULL CHECK (quantity > 0),
    status         order_item_status NOT NULL DEFAULT 'placed',
    delivered_at   TIMESTAMPTZ,
    is_delivered   BOOLEAN GENERATED ALWAYS AS (delivered_at IS NOT NULL) STORED,
    PRIMARY KEY (placed_on, order_id, line_no),
    UNIQUE (order_id, line_no, is_delivered)
) PARTITION BY RANGE (placed_on);

CREATE TABLE order_item_events (
    event_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id    BIGINT            NOT NULL,
    line_no     SMALLINT          NOT NULL,
    status      order_item_status NOT NULL,
    occurred_at TIMESTAMPTZ       NOT NULL DEFAULT now(),
    actor       TEXT              NOT NULL,
    reason      TEXT
);

CREATE TABLE stock_reservations (
    reservation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    listing_id     BIGINT            NOT NULL,
    location_id    BIGINT            NOT NULL,
    order_id       BIGINT            NOT NULL,
    quantity       INT               NOT NULL CHECK (quantity > 0),
    state          reservation_state NOT NULL DEFAULT 'held',
    expires_at     TIMESTAMPTZ       NOT NULL,
    created_at     TIMESTAMPTZ       NOT NULL DEFAULT now(),
    FOREIGN KEY (listing_id, location_id) REFERENCES stock (listing_id, location_id)
);

CREATE TABLE coupons (
    coupon_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        TEXT         NOT NULL UNIQUE,
    percent_off NUMERIC(5,2) NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
    max_usage   INT          NOT NULL CHECK (max_usage > 0),
    times_used  INT          NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ  NOT NULL,
    CHECK (times_used <= max_usage)
);

CREATE TABLE coupon_redemptions (
    coupon_id  BIGINT            NOT NULL REFERENCES coupons(coupon_id),
    order_id   BIGINT            NOT NULL,
    user_id    BIGINT            NOT NULL REFERENCES users(user_id),
    state      reservation_state NOT NULL DEFAULT 'held',
    expires_at TIMESTAMPTZ       NOT NULL,
    created_at TIMESTAMPTZ       NOT NULL DEFAULT now(),
    PRIMARY KEY (coupon_id, order_id)
);
CREATE UNIQUE INDEX coupon_once_per_user
    ON coupon_redemptions (coupon_id, user_id) WHERE state <> 'released';

CREATE TABLE reviews (
    review_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(user_id),
    product_id   BIGINT      NOT NULL REFERENCES products(product_id),
    order_id     BIGINT      NOT NULL,
    line_no      SMALLINT    NOT NULL,
    is_delivered BOOLEAN     NOT NULL CHECK (is_delivered),
    rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_id),
    FOREIGN KEY (order_id, line_no, is_delivered)
        REFERENCES order_items (order_id, line_no, is_delivered)
);

CREATE TABLE outbox (
    outbox_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aggregate    TEXT        NOT NULL,
    aggregate_id BIGINT      NOT NULL,
    event_type   TEXT        NOT NULL,
    payload      JSONB       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);

CREATE TABLE daily_product_sales (
    sale_date  DATE          NOT NULL,
    product_id BIGINT        NOT NULL,
    units      BIGINT        NOT NULL DEFAULT 0,
    revenue    NUMERIC(18,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (sale_date, product_id)
);
```

Sixteen tables. The three that most versions of this answer do not have —
`stock_reservations`, `coupon_redemptions` and `outbox` — are the three that make the gap
between clicking buy and the money arriving survivable.

---

### Step 18 — The mental model

Strip away the marketplace and what is left is the method, now visible across all five
questions:

1. **Ask the questions whose answers delete work.** The cart living in Redis removed the
   highest-write table in the design before anything was drawn.
2. **Separate the thing from the offer.** Catalog and listing are different objects. Fold
   price into the product and you have built a shop that can never become a platform.
3. **A promise that may not be kept is an object, not an adjustment to a number.** Held
   stock, a blocked trading balance, a quoted fare — the same realisation three times, and
   the mistake is always trying to encode it as arithmetic on a counter.
4. **Facts in rows; counters as provable caches.** The counter is written in the same
   transaction, guarded by a predicate, bounded by a `CHECK` that states the business rule,
   and reconciled against the rows. This has now been the answer in four of five questions.
5. **Status belongs to the thing that has one outcome.** Three sellers means three
   fulfilments. Attaching status to the checkout produces an enum that is a cross-product
   nobody can reason about.
6. **Scarce resources deserve one mechanism.** Stock and coupons are the same kind of
   object. Two different mechanisms means two different sets of bugs.
7. **Make the doomed request fail at the edge.** Flash-sale admission control works because
   losing the cache under-sells while trusting it oversells — and only one of those is a
   retry.
8. **Exactly-once does not exist across systems you do not control.** An outbox plus
   idempotent consumers is the construction that does, and recognising that two-phase
   commit is unavailable is worth more than naming it.
9. **If a query's answer depends on every row in a range, no index saves it.** Compute it
   before it is asked.
10. **When no shard key makes both paths local, say which one you are making remote.** The
    honest answer names the loser rather than implying there was none.
