---
id: 5-food-delivery-swiggy-zomato
title: "Design Swiggy / Zomato: Food Delivery & Order State Machine"
description: "A full schema-design interview for a food delivery app, worked one decision at a time: why a receipt must outlive the menu, why a status column cannot answer 'when', how a WHERE clause does the job of a lock, and how dispatch, geospatial search, ratings, indexing and sharding fall out of the access patterns."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

---

### How to read this page

The schema at the bottom of this page is not the answer. The answer is the order the
decisions were made in, and what each one cost.

> **If you are revising the night before**, read Steps 1, 5, 7, 8 and 20, then the final
> schema in Step 19. That is the spine: clarify, draft something wrong, discover that a
> status column throws away history, discover that the `WHERE` clause is your lock.
> Everything else is depth you can add once the spine is solid.
>
> **Say in the room** what Steps 1–11 cover — it is already a strong answer. Steps 12–18
> are mostly *know it exists*: material for when an interviewer pushes on dispatch,
> geospatial search or scale. Nobody is expected to volunteer `SKIP LOCKED` unprompted.

Splitwise is a question about arithmetic — a column of numbers that has to sum to zero.
This one is not. Food delivery is a question about **time**: an order is a thing that moves
through states, several parties try to move it at once, and almost every interesting query
is "how long did that take" or "what is happening right now". Schemas that model the order
as a row with a `status` column look fine for ten minutes and then cannot answer the
questions the business actually asks.

So this page moves one decision at a time. Every table and almost every column gets a short
"why this and not that".

A note on repetition: this page assumes you have read
[the Splitwise question](./4-expense-splitting-splitwise), which argues at length for
`BIGINT` identity keys over random UUIDs, `NUMERIC` over `FLOAT`, and `TIMESTAMPTZ` over
`TIMESTAMP`. Those decisions carry over unchanged and are stated here rather than
re-derived.

---

### Step 1 — Pin down what we are building

**Interviewer:** Design the database for a food delivery app like Swiggy or Zomato. Users
browse restaurants and place orders containing several items from one restaurant. Menu
prices change. Orders move through a set of statuses. Users can review a restaurant only
after a delivered order. Delivery partners are assigned to orders and their live location
is tracked. Where do you start?

**Candidate:** With the questions whose answers remove design options, before anything gets
drawn. Five of them.

First: can one order contain items from more than one restaurant?

**Interviewer:** No. One order, one restaurant.

**Candidate:** That is worth a great deal. A multi-restaurant order forces a sub-order
layer — each restaurant preparing independently, each with its own state, the parent order
"delivered" only when all children are — and it changes the dispatch problem from one
pickup to several. Ruling it out keeps `restaurant_id` on the order itself and keeps the
state machine flat.

Second: do items have customisations — "extra cheese, no onion, half portion"?

**Interviewer:** Base items only.

**Candidate:** Good. Customisations are an options tree hanging off every line item, with
their own prices that also have to be snapshotted. That is a substantial amount of schema
that we now do not write.

Third: for live partner location, do we need the route history, or only the current
position to draw a dot on a map?

**Interviewer:** Current position only.

**Candidate:** Then the hottest write in the entire system leaves the relational database
entirely. I will come back to why in Step 13, because it is the single biggest thing that
kills these designs.

Fourth: is payment in scope — cards, wallets, refunds?

**Interviewer:** Out of scope. Assume a payments service exists.

**Candidate:** Then the order carries a `payment_reference` and a coarse payment status,
and the money's own lifecycle lives somewhere else. That deletes an entire subsystem.

Fifth: carts. Do we persist a cart that a user builds over an hour, or only finalised
orders?

**Interviewer:** Finalised orders only.

**Candidate:** Carts are high-write, low-value, frequently abandoned data with completely
different retention rules from orders. Keeping them out means the `orders` table only ever
contains things that actually happened.

**Interviewer:** That is five. What did they buy you?

**Candidate:** Four tables we will not write and one subsystem we will not host. The
remaining problem is sharp: model an order's movement through time, keep its receipt
accurate forever, and let several parties act on it concurrently without corrupting it.

---

### Step 2 — `users`, and why the phone number is the hard part

The obvious table, with one column that is less obvious than it looks.

#### 2a. `user_id`

`BIGINT GENERATED ALWAYS AS IDENTITY`. Eight bytes rather than sixteen in every foreign
key and every index, and it appends to the right edge of the B-tree so the hot pages stay
hot. The full argument is in Step 2 of the Splitwise question.

#### 2b. `phone`

In India this app is phone-first: you log in with an OTP, and the phone number *is* the
account. That makes it the natural unique key, and it brings a problem that email does not.

Email uniqueness needs case folding — `Alice@x.com` and `alice@x.com` are one mailbox.
Phone uniqueness needs **normalisation**, which is a harder problem, because all of these
are the same number:

```text
+91 98765 43210
09876543210
9876543210
+919876543210
```

If you store what the user typed, the unique index is decoration: the same person signs up
four times and the database is satisfied every time. The number has to be normalised to a
single canonical form — E.164, `+919876543210` — *before* it reaches the column, and the
unique index has to be on that canonical form.

`VARCHAR(16)` is the right width: E.164 caps at 15 digits plus the leading `+`.

:::decision

Store E.164 only, normalised in the application, with a `CHECK` that rejects anything else.

`CHECK (phone ~ '^\+[1-9][0-9]{7,14}$')` will not catch a wrongly-normalised number, but it
catches every *un*-normalised one — the spaces, the leading zero, the missing country code.
That is the class of bug that actually happens.

*Why not normalise in the database:* parsing a national number into E.164 needs a country
context the database does not have. A number starting `0` is Indian if the user is in
India and something else entirely if they are not.

:::

#### 2c. `email`

Nullable here, unlike Splitwise. A phone-first signup may never collect one, and a `NOT
NULL` column that the application fills with `''` to satisfy it is worse than a nullable
one — it breaks uniqueness and it lies.

#### 2d. `deleted_at`

Soft delete, for the same reason as Splitwise: `orders` reference users, and those rows
are financial history. Hard-deleting a user either destroys the record of an order or
breaks the foreign key.

```sql title="users"
CREATE TABLE users (
    user_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone         VARCHAR(16)  NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    email         VARCHAR(320),
    display_name  TEXT         NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

-- Partial: a deleted account must not hold its phone number hostage forever.
CREATE UNIQUE INDEX users_phone_uniq ON users (phone) WHERE deleted_at IS NULL;
```

---

### Step 3 — `restaurants`: three different kinds of "closed"

**Interviewer:** A restaurant goes out of business. We still need its past orders. How do
you handle deletion?

**Candidate:** Soft delete — but the more useful observation is that "closed" is three
different things that people routinely cram into one column, and conflating them produces
bugs that are very hard to see.

- **Closed right now.** It is 3am, or Tuesday, and the restaurant is not taking orders.
  This is a function of the clock and the opening hours, not a stored state at all.
- **Paused.** The kitchen is swamped and has tapped "stop taking orders" for forty
  minutes. Temporary, restaurant-controlled, reverses itself.
- **Gone.** Out of business, delisted, contract terminated. Permanent, platform-controlled,
  and must never reappear in search.

If all three collapse into one `status` column, then a kitchen pausing during a dinner rush
is indistinguishable in the data from a restaurant going bankrupt — and "how many of our
restaurants churned last month" becomes unanswerable.

:::decision

Three separate mechanisms: `deleted_at` for gone, `accepting_orders_until` for paused,
and an `opening_hours` relation for the clock.

Each has a different owner, a different lifetime and a different query. A timestamp for
the pause rather than a boolean means the pause expires on its own — nobody has to
remember to flip it back, and a restaurant that forgets does not silently disappear for a
week.

*Cost:* three columns to reason about instead of one. The alternative is a `status` enum
whose values quietly acquire time semantics nobody wrote down.

:::

Opening hours themselves are a small relation, not a text field — `(restaurant_id,
day_of_week, opens_at, closes_at)` — because "is this restaurant open now" has to be a
query, and because kitchens close after midnight, which a single `opens_at < now <
closes_at` comparison gets wrong.

```sql title="restaurants"
CREATE TABLE restaurants (
    restaurant_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    city_id                INT          NOT NULL REFERENCES cities(city_id),
    name                   TEXT         NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
    address_line           TEXT         NOT NULL,
    location               geography(Point, 4326) NOT NULL,
    accepting_orders_until TIMESTAMPTZ,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ
);
```

`city_id` is here from the first draft on purpose. It is the shard key in Step 18, and
retrofitting a shard key onto a live table is one of the genuinely painful migrations. It
costs four bytes now.

---

### Step 4 — `menu_items`

The same distinction, one level down. An item can be **unavailable** (sold out today) or
**removed** (no longer on the menu). Those are not the same, and only one of them is
reversible by the kitchen at 8pm.

```sql title="menu_items"
CREATE TABLE menu_items (
    item_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id BIGINT       NOT NULL REFERENCES restaurants(restaurant_id),
    name          TEXT         NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
    price         NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    is_available  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);
```

`NUMERIC(14,2)`, never `FLOAT`. Binary floating point cannot represent a tenth —
`0.1 + 0.2` evaluates to `0.30000000000000004` — and a receipt that does not add up is a
support ticket. The full comparison against integer minor units is in Step 5 of Splitwise;
the conclusion carries over.

`price` is the **current** price, and it is the only price this table will ever hold. That
turns out to matter a lot, which is the next step.

---

### Step 5 — `orders`, first cut

Here is the obvious table. It is wrong in three ways, and we are going to find all three.

```sql title="orders — first cut"
CREATE TABLE orders (
    order_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(user_id),
    restaurant_id BIGINT       NOT NULL REFERENCES restaurants(restaurant_id),
    partner_id    BIGINT       REFERENCES delivery_partners(partner_id),
    status        TEXT         NOT NULL,
    total_amount  NUMERIC(14,2) NOT NULL,
    placed_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    delivered_at  TIMESTAMPTZ
);

CREATE TABLE order_items (
    order_id BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id  BIGINT NOT NULL REFERENCES menu_items(item_id),
    quantity INT    NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, item_id)
);
```

`partner_id` is nullable because an order exists before a driver is assigned. `total_amount`
is stored rather than derived — a deliberate denormalisation, justified below.

**Interviewer:** Before I push on this — why store `total_amount` at all? You can sum the
line items.

**Candidate:** Because the total is not only a sum, it is a **statement**. By the time the
order is confirmed it includes delivery fee, packaging, taxes and any promotion, and the
rules behind each of those change over time. If I recompute it, the receipt for an order
placed last March is rendered using this March's tax rules. Storing it freezes what the
user actually agreed to pay.

That is the general principle this whole page turns on: **store facts, derive meanings**.
A total that the user saw and accepted is a fact.

---

### Step 6 — Break #1: the receipt outlives the menu

:::broke

An `order_items` row that points at `menu_items` does not record what was ordered. It
records a pointer to something the restaurant is free to change tomorrow.

:::

**Interviewer:** The restaurant raises the price of Paneer Tikka from ₹240 to ₹280. What
does last week's receipt now say?

**Candidate:** ₹280, which is a fabrication. The fix people reach for first is to copy the
price into the order line — a `locked_price` or `unit_price` column — and that is correct
as far as it goes. But it does not go far enough, and the gap is the interesting part.

**Interviewer:** Go on.

**Candidate:** Price is not the only thing the restaurant can change. Suppose they rename
"Paneer Tikka" to "Paneer Tikka Masala", or soft-delete the item entirely when it leaves
the menu. Now the receipt either shows a dish the user never ordered, or — if we join to
`menu_items` and filter out deleted rows, as every listing query does — shows nothing at
all. A receipt is a historical document. It has to be readable without consulting any
table that is still being edited.

So the snapshot is of the whole line, not just the number:

```sql title="order_items — Break #1" {5,6}
CREATE TABLE order_items (
    order_id   BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    line_no    SMALLINT NOT NULL,
    item_id    BIGINT NOT NULL REFERENCES menu_items(item_id),
    item_name  TEXT   NOT NULL,          -- snapshot: what it was called that day
    unit_price NUMERIC(14,2) NOT NULL,   -- snapshot: what it cost that day
    quantity   INT    NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, line_no)
);
```

**Interviewer:** You changed the primary key as well.

**Candidate:** Deliberately. `(order_id, item_id)` says an item can appear on an order at
most once, which sounds reasonable and is not. The moment anything distinguishes two lines
of the same dish — a note on one of them, a promotion applied to one of them, or simply
the way the client assembled the cart — that key forbids a legitimate order. `line_no`
makes the line itself the thing with identity, which is what a receipt line actually is.

`item_id` stays as a foreign key, because "how many times was this dish ordered" is a real
question and matching on a snapshotted name would be fragile. It is a reference for
analytics; the snapshot is the record.

:::decision

Snapshot the name and the price onto the order line; keep `item_id` as a reference.

A receipt must be reconstructible from the order's own rows, with no join to any table
that is still being edited.

*Cost:* the item name is duplicated across millions of rows. Compression handles most of
it, and the alternative — a fully versioned `menu_item_versions` table with validity ranges
— adds a join to the hottest read path in the app for a fidelity nobody asked for.

*Would change if:* customisations come into scope. Then lines acquire child rows, and a
versioned menu starts paying for itself.

:::

---

### Step 7 — Break #2: a status column cannot answer "when"

:::broke

`status` holds where the order is. Every question the business actually asks is about how
long it took to get there, and that information was overwritten.

:::

**Interviewer:** What is our average time from the restaurant accepting an order to the
food being ready?

**Candidate:** With this schema, unanswerable. `status` is a single cell that gets
overwritten on every transition; by the time an order is delivered, the fact that it was
`accepted` at 19:42 and `preparing` at 19:44 has been erased. I have `placed_at` and
`delivered_at`, which is two points on a line with four interesting segments.

**Interviewer:** So add the timestamps.

**Candidate:** That is the instinct, and it is where the design quietly goes wrong. It
starts as `accepted_at`, then `prepared_at`, `picked_up_at`, `cancelled_at`,
`refunded_at` — and each new state in the business adds a column to the hottest table in
the system. Worse, the columns cannot express things the event actually had: *who* cancelled
(user, restaurant, or an automatic timeout), and *why*.

The real shape of this data is a log. An order's history is a sequence of events, and the
current status is a *derivation* of that sequence.

```sql title="order_status_events"
CREATE TYPE order_status AS ENUM (
    'placed', 'accepted', 'preparing', 'ready',
    'picked_up', 'delivered', 'cancelled'
);

CREATE TYPE actor_type AS ENUM ('user', 'restaurant', 'partner', 'system');

CREATE TABLE order_status_events (
    event_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id    BIGINT       NOT NULL REFERENCES orders(order_id),
    status      order_status NOT NULL,
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actor       actor_type   NOT NULL,
    actor_id    BIGINT,
    reason      TEXT
);

-- The state machine is forward-only: an order reaches each state at most once.
CREATE UNIQUE INDEX order_status_events_once
    ON order_status_events (order_id, status);
```

Now "average accept-to-ready time" is a self-join on this table, "which orders sat
unaccepted for more than five minutes last Friday" is answerable, and "who cancelled this
and why" has a column instead of a support ticket.

**Interviewer:** If the events are the truth, do you still keep `status` on `orders`?

**Candidate:** Yes, and I want to be explicit that this is a denormalisation rather than an
oversight.

Deriving the current status means, for each order, finding the event with the latest
`occurred_at`. For one order that is trivial. For the "my orders" screen, or the
restaurant's live queue, it is a lateral join or a window function over the event table on
every page load — on the most frequently hit query in the product.

:::decision

`orders.status` is a cached projection of `order_status_events`; the event log is the
source of truth.

Both are written in the **same transaction**. If they can diverge, they will, and the one
the user sees will be the wrong one.

*Cost:* the invariant "`orders.status` equals the latest event" is not enforceable by a
simple `CHECK`. It is enforced by funnelling every transition through one code path, and
verified by a reconciliation job that recomputes the projection and alerts on mismatches.

*Would change if:* the read volume on the list screens were low enough that the window
function were free. It is not — it is the single hottest query in the app.

:::

---

### Step 8 — Break #3: cancel and accept, at the same millisecond

:::broke

Two parties act on the same order at the same instant. Last write wins, and the business
loses.

:::

**Interviewer:** A user taps "Cancel" at the exact moment the restaurant taps "Accept".
What happens?

**Candidate:** With a plain `UPDATE orders SET status = ...`, both succeed, and which one
survives is decided by whichever transaction commits last. The outcomes are a cancelled
order whose food is being cooked, or an accepted order the user believes is cancelled.
Both end in a refund argument.

The usual answer is optimistic locking — add a `version` column, read it, and update only
if it has not moved. That works. But it is heavier than this problem needs, and it says the
wrong thing.

**Interviewer:** Wrong how?

**Candidate:** A `version` column detects that *something* changed. The rule we actually
want to enforce is specific: *you may only cancel an order that is still in `placed`.* And
we already store the thing that expresses it.

```sql title="The guard is the WHERE clause" {4}
UPDATE orders
   SET status = 'cancelled'
 WHERE order_id = $1
   AND status   = 'placed'     -- the guard
RETURNING order_id;
```

If this returns a row, the cancel won and the caller may write the matching event. If it
returns zero rows, the restaurant got there first — and the user sees "this order has
already been accepted", which is the truthful message. The check and the write are a single
atomic statement; there is no window between them for anyone to slip through.

The same statement is the one the restaurant runs, with its own guard:

```sql title="…and the other side of the race"
UPDATE orders
   SET status = 'accepted'
 WHERE order_id = $1
   AND status   = 'placed'
RETURNING order_id;
```

Exactly one of the two can return a row. The database decides, in one statement, with no
extra column.

:::decision

A guarded conditional `UPDATE`, over a `version` column.

The status column already *is* the version for this purpose, and the guard states the
business rule where a reader will find it, rather than encoding it as "nothing changed".

*Would change if:* an order could be mutated along several independent axes at once — say
the address and the status edited by different parties — where "did anything change"
becomes the right question and a single status guard stops being sufficient.

*Note on isolation:* this is safe under `READ COMMITTED`. An `UPDATE` re-evaluates its
`WHERE` clause against the latest committed row after taking the row lock, so the loser
sees the winner's value and matches zero rows. This is the one place where Postgres's
default isolation level does exactly what you want without a `SERIALIZABLE` penalty.

:::

**Interviewer:** And if the rule is more complicated than one previous state?

**Candidate:** Then the guard becomes a set — `AND status IN ('placed', 'accepted')` — and
once the sets get interesting, the transitions themselves should become data. Which is the
next step.

---

<details>
<summary><b>Schema checkpoint — everything as it stands after Step 8</b></summary>

```sql
CREATE TABLE users (
    user_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone         VARCHAR(16)  NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    email         VARCHAR(320),
    display_name  TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE restaurants (
    restaurant_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    city_id                INT          NOT NULL REFERENCES cities(city_id),
    name                   TEXT         NOT NULL,
    address_line           TEXT         NOT NULL,
    location               geography(Point, 4326) NOT NULL,
    accepting_orders_until TIMESTAMPTZ,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ
);

CREATE TABLE menu_items (
    item_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id BIGINT        NOT NULL REFERENCES restaurants(restaurant_id),
    name          TEXT          NOT NULL,
    price         NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    is_available  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE orders (
    order_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT        NOT NULL REFERENCES users(user_id),
    restaurant_id BIGINT        NOT NULL REFERENCES restaurants(restaurant_id),
    partner_id    BIGINT        REFERENCES delivery_partners(partner_id),
    status        order_status  NOT NULL DEFAULT 'placed',
    total_amount  NUMERIC(14,2) NOT NULL,
    placed_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    order_id   BIGINT   NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    line_no    SMALLINT NOT NULL,
    item_id    BIGINT   NOT NULL REFERENCES menu_items(item_id),
    item_name  TEXT     NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL,
    quantity   INT      NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, line_no)
);

CREATE TABLE order_status_events (
    event_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id    BIGINT       NOT NULL REFERENCES orders(order_id),
    status      order_status NOT NULL,
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actor       actor_type   NOT NULL,
    actor_id    BIGINT,
    reason      TEXT
);
```

`delivered_at` has gone from `orders` — it lives in the event log now, and Step 16 shows
how to get it back cheaply for the one query that needs it in bulk.

</details>

---

### Step 9 — The state machine, as data

**Interviewer:** You hinted that transitions should be a table. Why not just write the
rules in the application?

**Candidate:** You can, and plenty of good systems do. The argument for putting them in the
database is that there is never exactly one application. There is the user app, the
restaurant tablet, the partner app, an internal support console, and a batch job that
times out stale orders. Five code paths, each capable of moving an order, each with its
own copy of the rules, and the fifth one written eighteen months later by someone who has
never read the first.

```sql title="order_status_transitions"
CREATE TABLE order_status_transitions (
    from_status order_status NOT NULL,
    to_status   order_status NOT NULL,
    allowed_to  actor_type   NOT NULL,
    PRIMARY KEY (from_status, to_status, allowed_to)
);

INSERT INTO order_status_transitions VALUES
    ('placed',    'accepted',  'restaurant'),
    ('placed',    'cancelled', 'user'),
    ('placed',    'cancelled', 'restaurant'),
    ('placed',    'cancelled', 'system'),     -- nobody accepted in time
    ('accepted',  'preparing', 'restaurant'),
    ('accepted',  'cancelled', 'restaurant'),
    ('preparing', 'ready',     'restaurant'),
    ('ready',     'picked_up', 'partner'),
    ('picked_up', 'delivered', 'partner');
```

Read that insert from top to bottom and you have the product's rules in nine lines. Note
what it encodes that prose would not: a user can cancel from `placed` but not from
`accepted`, and once a partner has picked the food up, nobody can cancel at all.

The transition table is then enforced by a trigger on `order_status_events`, and — more
usefully day to day — it is *queryable*. "What can happen to this order next, given who I
am" becomes a `SELECT` the UI can run to decide which buttons to show, instead of a
condition duplicated in five clients.

:::decision

Transitions as a lookup table plus a trigger, over rules scattered across the services.

One definition, enforced for every writer including the ones written later, and readable by
the UI so the buttons and the database never disagree.

*Cost:* a trigger on a high-write table, and a join for anyone who wants to reason about
the machine. Both are cheap; the table is tiny and permanently cached.

*Would change if:* there were genuinely one service with one owner. Then this is
ceremony, and a `CHECK` plus good tests is enough.

:::

---

### Step 10 — Reviews, and a foreign key that enforces a business rule

**Interviewer:** Users can review only after a delivered order. One review per order. How
do you enforce it?

**Candidate:** The "one per order" half is a unique constraint and needs no discussion. The
interesting half is "only after delivered", because the obvious answer is a trigger and
there is something better available.

A foreign key normally references a primary key. It can reference any unique constraint —
and that gives us a way to make the database check a *condition* on the parent row, not
just its existence.

```sql title="reviews — the delivered-only rule, as a foreign key" {11,12,13,14}
-- A unique constraint on the pair makes it a legal FK target.
ALTER TABLE orders
    ADD CONSTRAINT orders_id_status_uniq UNIQUE (order_id, status);

CREATE TABLE reviews (
    review_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id      BIGINT       NOT NULL UNIQUE,
    order_status  order_status NOT NULL CHECK (order_status = 'delivered'),
    rating        SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    FOREIGN KEY (order_id, order_status)
        REFERENCES orders (order_id, status)
);
```

The `CHECK` pins `order_status` to `'delivered'` for every review row. The composite
foreign key then requires that `(order_id, 'delivered')` exists in `orders`. An order that
is still `preparing` has no such row, so the insert fails. A review for an undelivered
order is now *unrepresentable*, with no trigger and no application check.

**Interviewer:** What breaks this?

**Candidate:** One thing, and it is worth saying out loud because it is the limit of the
technique: it only works when the target status is **terminal**. If an order could move on
from `delivered` — to `refunded`, say — the parent row would change and the foreign key
would block the transition or cascade strangely. In this state machine `delivered` is an
end state, so the trick is sound. The day someone adds `refunded` after it, this constraint
is the thing that will tell them, loudly, at 3am.

:::decision

A composite foreign key against `(order_id, status)`, over a trigger.

The rule becomes structural rather than procedural: the database rejects the row without
anyone having written code to check it, and it cannot be bypassed by a bulk insert or a
migration script.

*Known limitation:* requires the referenced status to be terminal. Documented in the
migration, because it is a landmine for whoever adds a post-delivery state.

:::

#### 10a. The denormalised `restaurant_id`, made safe

Computing a restaurant's average rating by joining `reviews` to `orders` means touching the
largest table in the system for a number shown on every listing card. The usual fix is to
copy `restaurant_id` onto `reviews` — and the usual cost is that the copy can drift.

Here it does not have to. The same technique extends:

```sql title="A denormalisation the database verifies"
ALTER TABLE orders
    ADD CONSTRAINT orders_id_restaurant_uniq UNIQUE (order_id, restaurant_id);

ALTER TABLE reviews
    ADD COLUMN restaurant_id BIGINT NOT NULL,
    ADD FOREIGN KEY (order_id, restaurant_id)
        REFERENCES orders (order_id, restaurant_id);
```

A review whose `restaurant_id` does not match its order's is now rejected. This is a
redundant column that **cannot** go stale — which is the thing that makes most
denormalisation frightening.

---

### Step 11 — Limited stock, and the `WHERE` clause as a lock

**Interviewer:** The kitchen has twenty portions of biryani for the evening. Fifty people
order at once. What happens?

**Candidate:** First, a modelling point: most menu items are made to order and have no
limit at all. Only some have a daily cap. So the column is nullable, and `NULL` means
unlimited — not `-1`, and not a separate `is_limited` boolean that can contradict it.

```sql title="Daily caps on menu_items"
ALTER TABLE menu_items
    ADD COLUMN stock_remaining INT CHECK (stock_remaining >= 0);
```

Now the decrement. The version that loses money:

```sql title="Wrong: a race with extra steps"
SELECT stock_remaining FROM menu_items WHERE item_id = $1;
-- application checks it is >= quantity
UPDATE menu_items SET stock_remaining = stock_remaining - $2 WHERE item_id = $1;
```

Fifty requests read `20` in the same millisecond, all fifty pass the check, and the kitchen
is now committed to fifty biryanis. The `CHECK` constraint will catch it eventually — by
raising errors on whichever transactions happen to commit after the count goes negative,
which is a lottery, not a policy.

The version that works is the same primitive as Step 8:

```sql title="Right: check and write in one statement" {4}
UPDATE menu_items
   SET stock_remaining = stock_remaining - $2
 WHERE item_id = $1
   AND (stock_remaining IS NULL OR stock_remaining >= $2)
RETURNING stock_remaining;
```

Zero rows means sold out, and the user is told so before the order is created rather than
after it is paid for.

**Interviewer:** That is the second time you have used that shape.

**Candidate:** It is the shape worth taking away from this page. **The `WHERE` clause of an
`UPDATE` is a lock you already have.** Postgres takes a row lock before re-evaluating the
predicate against the latest committed version, so "check the condition and write if it
holds" is a single atomic operation. Most application-level locking exists because people
split that into a `SELECT` and an `UPDATE` and then had to invent something to bridge the
gap.

---

### Step 12 — Claiming a delivery partner

**Interviewer:** Assign a partner to a ready order. A thousand orders become ready at 8pm
and several dispatchers are running. Two orders must not get the same partner.

**Candidate:** This is the same family of problem, with a twist: we are not updating a row
we already know about, we are *selecting* one and claiming it, and that is where the naive
version falls over.

```sql title="Wrong: everyone picks the same partner"
SELECT partner_id FROM delivery_partners
 WHERE state = 'idle' AND city_id = $1
 ORDER BY last_assigned_at
 LIMIT 1;
-- …then UPDATE that partner
```

Every concurrent dispatcher reads the same top row and fights over it. All but one fail and
retry, read the same new top row, and fight again — a thundering herd that gets worse as
load increases.

Postgres has a purpose-built answer:

```sql title="Right: claim with SKIP LOCKED" {6}
WITH claimed AS (
    SELECT partner_id
      FROM delivery_partners
     WHERE state = 'idle' AND city_id = $1
     ORDER BY last_assigned_at
     LIMIT 1
    FOR UPDATE SKIP LOCKED
)
UPDATE delivery_partners d
   SET state = 'assigned',
       current_order_id = $2,
       last_assigned_at = now()
  FROM claimed c
 WHERE d.partner_id = c.partner_id
RETURNING d.partner_id;
```

`FOR UPDATE` locks the row it selects. `SKIP LOCKED` tells concurrent dispatchers to step
over rows that are already locked and take the next one instead of blocking. Ten dispatchers
running this simultaneously claim ten *different* partners, in one round trip each, with no
retries and no contention.

:::decision

`SELECT … FOR UPDATE SKIP LOCKED` for partner assignment.

It is the standard Postgres work-claiming pattern and it turns a contended queue into a
parallel one. The alternative — an external distributed lock — adds a dependency that can
fail independently of the database that holds the truth.

*Cost:* `SKIP LOCKED` sacrifices strict ordering. Under heavy contention a partner slightly
further down the list may be claimed first. For fairness-by-wait-time that is an acceptable
approximation; for a strict FIFO it would not be.

:::

**Interviewer:** Is the *choice* of partner really a database query, though? Real dispatch
considers distance, traffic, the partner's direction of travel, batching.

**Candidate:** No, and that is the right boundary to draw. The dispatch *decision* belongs
to a service with live locations and a routing model in memory — it is an optimisation
problem, not a query. What belongs in Postgres is the **record** of the assignment and its
exclusivity: whatever clever thing the dispatcher decided, the database is what guarantees
one partner is not promised to two orders. The query above is the commit of a decision made
elsewhere.

---

### Step 13 — Live location does not belong in Postgres

**Interviewer:** Partners ping their GPS every few seconds. Where does that go?

**Candidate:** Not here, and it is worth being precise about why, because "it is a lot of
writes" is the hand-wave answer and the real reason is more specific.

Take 100,000 active partners pinging every 4 seconds: **25,000 writes per second**, all of
them updates to the same small table. In Postgres an `UPDATE` does not overwrite a row. It
writes a new version of it and marks the old one dead — that is how MVCC gives readers a
consistent snapshot without blocking. So those 25,000 updates per second produce:

- 25,000 new row versions per second, plus WAL records for every one;
- a new index entry per update for any index on the table, each leaving a dead pointer
  behind;
- a table that bloats continuously, kept in check only by autovacuum, which now has to
  reclaim 25,000 dead tuples a second on top of its normal work.

The database does not fall over because the data is large — it is a few megabytes of actual
state. It falls over because the *churn* overwhelms vacuum, the table and its indexes bloat
faster than they can be cleaned, and the degradation lands on every other query sharing the
instance. Your orders get slow because of a column nobody ordering food is reading.

And the data does not justify any of it. A location ping is worthless four seconds later.
It is cache-shaped data: small, hot, replaced constantly, and **tolerable to lose**.

:::decision

Live locations in Redis, keyed by partner, with a TTL. Nothing in Postgres.

Redis `GEOADD` / `GEOSEARCH` gives the proximity query as well, at in-memory speed, and a
TTL means a partner who goes offline disappears on their own rather than needing a cleanup
job.

*What stays relational:* the partner's identity, their shift state, and which order they
are currently carrying — low-write facts that other tables reference.

*If route history is needed later* — for disputes or for ETA models — pings are batched and
appended to a store built for it: a time-series or wide-column database, written in bulk,
read rarely. Never the OLTP instance.

:::

```sql title="delivery_partners — what the relational side keeps"
CREATE TABLE delivery_partners (
    partner_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    city_id          INT         NOT NULL REFERENCES cities(city_id),
    phone            VARCHAR(16) NOT NULL,
    display_name     TEXT        NOT NULL,
    state            partner_state NOT NULL DEFAULT 'offline',
    current_order_id BIGINT      REFERENCES orders(order_id),
    last_assigned_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);

-- A partner carries at most one order at a time.
CREATE UNIQUE INDEX partner_one_live_order
    ON delivery_partners (current_order_id)
    WHERE current_order_id IS NOT NULL;
```

That partial unique index is the structural guarantee behind Step 12: even if the claim
query were written wrongly, the database still refuses to put one partner on two orders.

---

### Step 14 — Finding restaurants near me

**Interviewer:** The home screen shows restaurants within five kilometres. How?

**Candidate:** Latitude and longitude as two `NUMERIC` columns is the answer that looks
reasonable and performs terribly, because there is no index that can serve "within 5km of
this point". A B-tree on `(lat, lon)` can narrow a latitude band and then has to scan it
all; the result is a sequential scan over the city dressed up as an index scan.

This is what spatial types exist for.

```sql title="Proximity, with an index that can serve it"
CREATE INDEX restaurants_location_gix
    ON restaurants USING GIST (location);

SELECT restaurant_id, name
  FROM restaurants
 WHERE city_id = $1
   AND deleted_at IS NULL
   AND ST_DWithin(location, ST_MakePoint($2, $3)::geography, 5000)
 ORDER BY location <-> ST_MakePoint($2, $3)::geography
 LIMIT 20;
```

Two details carry most of the value here:

- **`ST_DWithin`, not `ST_Distance`.** `ST_DWithin(a, b, 5000)` is index-aware: the planner
  turns it into a bounding-box lookup on the GiST index and then refines. Writing
  `ST_Distance(a, b) < 5000` computes a distance for every row in the table first. Same
  result, utterly different plan. This is the single most common PostGIS mistake.
- **`geography`, not `geometry`.** `geography` works in metres on a spheroid, so `5000` means
  five kilometres. `geometry` with SRID 4326 works in *degrees*, where `5000` is nonsense
  and a "working" query silently returns the whole planet.

The `<->` operator in the `ORDER BY` is an indexed nearest-neighbour sort, so "closest
twenty" does not sort the whole candidate set.

:::decision

PostGIS `geography(Point, 4326)` with a GiST index, while the data is in one database.

*Would change if:* the restaurant table is sharded across regions, where a spatial index
per shard cannot answer a query spanning two. Then geohash or S2 cell IDs — a plain
indexable string or integer that a sharded key-value store can route on — and proximity
becomes a prefix scan. Less precise at cell boundaries, but it survives partitioning, which
PostGIS does not.

:::

---

### Step 15 — Ratings without a cron job

**Interviewer:** Every listing card shows an average rating. Computing `AVG(rating)` across
millions of reviews on every page load will not work.

**Candidate:** No. The usual fix is a `cached_average_rating` column refreshed by a job
every fifteen minutes, and I want to argue against it, because there is a version with no
job at all.

An average is not an incrementally maintainable quantity — given the old average and one
new rating you cannot produce the new average without also knowing the count. But its two
components are. So store those instead:

```sql title="Store the summands, generate the average"
ALTER TABLE restaurants
    ADD COLUMN rating_sum   BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN rating_count INT    NOT NULL DEFAULT 0,
    ADD COLUMN rating_avg   NUMERIC(3,2)
        GENERATED ALWAYS AS (
            CASE WHEN rating_count = 0 THEN NULL
                 ELSE ROUND(rating_sum::NUMERIC / rating_count, 2)
            END
        ) STORED;
```

A new review is then one statement, inside the same transaction that inserts it:

```sql title="O(1), exact, no job"
UPDATE restaurants
   SET rating_sum   = rating_sum + $2,
       rating_count = rating_count + 1
 WHERE restaurant_id = $1;
```

:::decision

`rating_sum` and `rating_count`, with the average as a generated column — over a cached
average refreshed on a schedule.

The value is **exact and immediate**, not eventually consistent within fifteen minutes, and
there is no job to monitor, no staleness window, and no thundering recompute across every
restaurant at the top of the hour. Edits and deletions are handled by the same statement
with the delta reversed.

*Cost:* every review write touches the restaurant row, which makes it a contention point for
a restaurant receiving reviews rapidly. At food-delivery review volumes — a handful per
restaurant per hour — that is far from a problem. For something like a viral product page
it would be, and the answer there is a sharded counter.

*The honest caveat:* this is still a denormalisation and it can drift if anything writes
reviews outside the sanctioned path. The same nightly reconciliation that checks
`orders.status` recomputes these two columns and alerts on a mismatch.

:::

---

### Step 16 — Average delivery time, and a myth about `NULL`

**Interviewer:** Average delivery time per restaurant over the last thirty days.

**Candidate:** The query people write first:

```sql title="The naive version"
SELECT AVG(delivered_at - placed_at)
  FROM orders
 WHERE restaurant_id = $1
   AND placed_at >= now() - INTERVAL '30 days';
```

And the usual explanation of what is wrong with it is itself wrong, so it is worth being
careful.

**Interviewer:** Go on.

**Candidate:** The common claim is that cancelled orders have a `NULL` `delivered_at`, and
that this "breaks" the aggregate. It does not. SQL aggregates **ignore** `NULL` inputs —
`delivered_at - placed_at` is `NULL` for a cancelled order, `AVG` skips it, and the
arithmetic you get back is in fact the average over delivered orders only. The number is
correct.

There are three real problems, and none of them is arithmetic:

1. **The planner reads rows it will throw away.** Without a predicate on status, the index
   on `placed_at` hands back every order in thirty days — cancelled, in-flight, delivered —
   and the `NULL`s are discarded after the fact. On a busy restaurant that is several times
   the I/O the query needs.
2. **The denominator is a trap waiting for the next person.** The moment someone adds
   `COUNT(*)` beside the average to show "orders in the last month", the two numbers are
   over different populations — one counts everything, the other averages only delivered —
   and the dashboard quietly lies. `COUNT(delivered_at)` and `COUNT(*)` differing is the
   bug, and it is invisible.
3. **It is a biased statistic.** Averaging only completed deliveries hides exactly the
   worst experiences. An order cancelled after forty minutes because no partner ever
   accepted it was a catastrophe for that customer and contributes nothing to the number
   that is supposed to measure customer experience.

So the filter goes in — for the index and for the next reader, not to protect `AVG`:

```sql title="Explicit about its population" {5}
SELECT AVG(e.occurred_at - o.placed_at) AS avg_delivery_time,
       COUNT(*)                          AS delivered_orders
  FROM orders o
  JOIN order_status_events e ON e.order_id = o.order_id
                            AND e.status   = 'delivered'
 WHERE o.restaurant_id = $1
   AND o.placed_at >= now() - INTERVAL '30 days';
```

And the cancellation rate is reported *next to it*, from the same window, because the two
numbers are only meaningful together.

**Interviewer:** You are joining to the event log on a hot path now.

**Candidate:** Which is the cost of Step 7, and it is worth paying back for this one query.
`delivered_at` comes back to `orders` as a second cached projection, written in the same
transaction as the `delivered` event:

```sql title="The one timestamp worth projecting back"
ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
```

One column, not six. It earns its place because it is the only event timestamp that both
appears in aggregate queries over millions of rows *and* can be range-scanned. Every other
"when did X happen" question is per-order and reads the event log directly, which is what
the event log is for.

---

### Step 17 — Indexing, derived from the queries

Indexes are not chosen from the schema. They are chosen from the queries the product
actually runs, so here are the six that matter.

```sql title="Q1 — the restaurant's menu, the most-run query in the app"
CREATE INDEX menu_items_by_restaurant
    ON menu_items (restaurant_id)
    INCLUDE (name, price, is_available)
    WHERE deleted_at IS NULL;
```

Partial, because deleted items are never listed and do not belong in the index at all.
`INCLUDE` carries the display columns in the leaf pages, so rendering a menu is an
index-only scan that never touches the heap.

```sql title="Q2 — my orders, newest first"
CREATE INDEX orders_by_user
    ON orders (user_id, placed_at DESC);
```

The `DESC` matters: it stores the rows in the order the screen wants them, so "most recent
twenty" is a bounded walk from one end instead of a sort.

```sql title="Q3 — the restaurant's live queue"
CREATE INDEX orders_live_queue
    ON orders (restaurant_id, placed_at)
    WHERE status IN ('placed', 'accepted', 'preparing', 'ready');
```

The best index on this page. A restaurant's live queue is perhaps twenty rows; its order
history is millions. A partial index on the live states is tiny, permanently in cache, and
stops costing anything the moment an order is delivered — the row leaves the index entirely.
A full index on `(restaurant_id, status)` would be hundreds of times larger and mostly
composed of rows no live query ever wants.

```sql title="Q4 — average delivery time"
CREATE INDEX orders_delivered_by_restaurant
    ON orders (restaurant_id, placed_at)
    INCLUDE (delivered_at)
    WHERE delivered_at IS NOT NULL;
```

Column order is the point. `restaurant_id` is an equality test and goes first; `placed_at`
is a range test and goes last. A B-tree can only range-scan after it has pinned the
equality columns — reverse them and the index stops being useful for this query. This is
the leftmost-prefix rule, and it is the single most common composite-index mistake.

```sql title="Q5 — restaurants near me"
CREATE INDEX restaurants_location_gix
    ON restaurants USING GIST (location)
    WHERE deleted_at IS NULL;
```

```sql title="Q6 — an order's history"
CREATE INDEX order_events_by_order
    ON order_status_events (order_id, occurred_at);
```

One more thing about Q2. Order history is paginated, and `OFFSET` degrades linearly —
page 500 makes the database walk and discard 10,000 rows before returning anything. Keyset
pagination reads the same twenty rows regardless of depth:

```sql title="Keyset pagination, not OFFSET"
SELECT order_id, placed_at, total_amount
  FROM orders
 WHERE user_id = $1
   AND (placed_at, order_id) < ($2, $3)   -- last row of the previous page
 ORDER BY placed_at DESC, order_id DESC
 LIMIT 20;
```

The row comparison breaks ties on `order_id`, which matters because two orders can share a
timestamp and a naive `placed_at <` either skips rows or repeats them.

---

### Step 18 — Sharding by city

**Interviewer:** One database will not hold a national launch. How do you split it?

**Candidate:** The shard key is chosen by asking which key makes the **transactional path
local**, and food delivery has an unusually clean answer.

Follow a single order: a user in Bangalore opens the app, sees restaurants in Bangalore,
orders from one of them, and a partner in Bangalore picks it up. Every row that
transaction touches shares a `city_id`. Nothing in the hot path crosses a city boundary.
That is a rare luxury — most systems have to choose which query to make expensive, and
here the natural boundary of the business is also the natural boundary of the data.

:::decision

Shard on `city_id`.

Every write path and every latency-sensitive read stays inside one shard. Cross-shard work
is pushed onto analytics, which is asynchronous and tolerant of it.

*Cost:* national aggregates become scatter-gather — "today's revenue" asks every shard and
sums in the application. The honest answer is that those queries should not run against the
operational database at all; they belong in a warehouse fed by change capture, where the
question is cheap and nobody's dinner order is waiting behind it.

*The uncomfortable part:* cities are wildly unequal, and shards sized by city will be too.
Bangalore at 8pm is several times Indore at 3pm. Large cities get their own shard or get
sub-split by `hash(restaurant_id)`; small ones share. The mapping lives in a routing table,
not in a modulo, so a city can be moved without rewriting the hashing scheme.

:::

**Interviewer:** What about the user who travels?

**Candidate:** They order in Mumbai on Monday and Delhi on Friday, so their orders are on
two shards and "my order history" is the one user-facing query that goes cross-shard.

Two things make it survivable. `users` is small, slow-changing and global — replicated to
every shard rather than partitioned, so no lookup ever has to be routed. And order history
is read far less often than the live-order screen, is naturally paginated, and tolerates a
scatter-gather across the two or three cities a user has actually ordered in. A small
`user_order_cities` table records which shards a given user has ever touched, so the fan-out
is two shards rather than all of them.

---

### Step 19 — The final schema

```sql title="The complete schema"
CREATE TYPE order_status  AS ENUM ('placed','accepted','preparing','ready',
                                   'picked_up','delivered','cancelled');
CREATE TYPE actor_type    AS ENUM ('user','restaurant','partner','system');
CREATE TYPE partner_state AS ENUM ('offline','idle','assigned');

CREATE TABLE cities (
    city_id   INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      TEXT NOT NULL,
    time_zone TEXT NOT NULL
);

CREATE TABLE users (
    user_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone         VARCHAR(16)  NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    email         VARCHAR(320),
    display_name  TEXT         NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_phone_uniq ON users (phone) WHERE deleted_at IS NULL;

CREATE TABLE restaurants (
    restaurant_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    city_id                INT           NOT NULL REFERENCES cities(city_id),
    name                   TEXT          NOT NULL,
    address_line           TEXT          NOT NULL,
    location               geography(Point, 4326) NOT NULL,
    accepting_orders_until TIMESTAMPTZ,
    rating_sum             BIGINT        NOT NULL DEFAULT 0,
    rating_count           INT           NOT NULL DEFAULT 0,
    rating_avg             NUMERIC(3,2)  GENERATED ALWAYS AS (
        CASE WHEN rating_count = 0 THEN NULL
             ELSE ROUND(rating_sum::NUMERIC / rating_count, 2) END) STORED,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at             TIMESTAMPTZ,
    UNIQUE (restaurant_id, city_id)
);

CREATE TABLE restaurant_hours (
    restaurant_id BIGINT   NOT NULL REFERENCES restaurants(restaurant_id),
    day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at      TIME     NOT NULL,
    closes_at     TIME     NOT NULL,
    PRIMARY KEY (restaurant_id, day_of_week, opens_at)
);

CREATE TABLE menu_items (
    item_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id   BIGINT        NOT NULL REFERENCES restaurants(restaurant_id),
    name            TEXT          NOT NULL,
    price           NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    is_available    BOOLEAN       NOT NULL DEFAULT TRUE,
    stock_remaining INT           CHECK (stock_remaining >= 0),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE delivery_partners (
    partner_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    city_id          INT           NOT NULL REFERENCES cities(city_id),
    phone            VARCHAR(16)   NOT NULL,
    display_name     TEXT          NOT NULL,
    state            partner_state NOT NULL DEFAULT 'offline',
    current_order_id BIGINT,
    last_assigned_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);
CREATE UNIQUE INDEX partner_one_live_order
    ON delivery_partners (current_order_id) WHERE current_order_id IS NOT NULL;

CREATE TABLE orders (
    order_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT        NOT NULL REFERENCES users(user_id),
    restaurant_id BIGINT        NOT NULL REFERENCES restaurants(restaurant_id),
    partner_id    BIGINT        REFERENCES delivery_partners(partner_id),
    status        order_status  NOT NULL DEFAULT 'placed',
    total_amount  NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    placed_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    delivered_at  TIMESTAMPTZ,          -- projection of the 'delivered' event
    UNIQUE (order_id, status),          -- FK target for reviews
    UNIQUE (order_id, restaurant_id)    -- FK target for the denormalised copy
);

CREATE TABLE order_items (
    order_id   BIGINT        NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    line_no    SMALLINT      NOT NULL,
    item_id    BIGINT        NOT NULL REFERENCES menu_items(item_id),
    item_name  TEXT          NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    quantity   INT           NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, line_no)
);

CREATE TABLE order_status_events (
    event_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id    BIGINT       NOT NULL REFERENCES orders(order_id),
    status      order_status NOT NULL,
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actor       actor_type   NOT NULL,
    actor_id    BIGINT,
    reason      TEXT
);
CREATE UNIQUE INDEX order_status_events_once
    ON order_status_events (order_id, status);

CREATE TABLE order_status_transitions (
    from_status order_status NOT NULL,
    to_status   order_status NOT NULL,
    allowed_to  actor_type   NOT NULL,
    PRIMARY KEY (from_status, to_status, allowed_to)
);

CREATE TABLE reviews (
    review_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id      BIGINT       NOT NULL UNIQUE,
    order_status  order_status NOT NULL CHECK (order_status = 'delivered'),
    restaurant_id BIGINT       NOT NULL,
    rating        SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    FOREIGN KEY (order_id, order_status) REFERENCES orders (order_id, status),
    FOREIGN KEY (order_id, restaurant_id) REFERENCES orders (order_id, restaurant_id)
);
```

Nine tables. Three of them — `order_status_events`, `order_status_transitions` and the two
composite foreign keys on `reviews` — are doing work that most versions of this answer
leave to application code.

---

### Step 20 — The mental model

Strip away food delivery and what is left is a method that transfers:

1. **Ask the questions whose answers delete work.** Five clarifications in Step 1 removed
   four tables and an entire subsystem before anything was drawn.
2. **A status column is a cursor, not a history.** The moment anyone asks "how long did
   that take", a single mutable cell has already thrown the answer away. Events are the
   facts; the current state is a projection of them.
3. **Store facts, derive meanings.** The receipt, the total, the snapshotted item name —
   all facts, frozen. The average rating, the current status, the delivery time — all
   derived, and cached only with a stated cost and a reconciliation job.
4. **The `WHERE` clause is a lock you already have.** Cancel-versus-accept, stock
   decrement, partner claiming — three different problems, one primitive: check and write
   in a single statement and let the database arbitrate.
5. **Constraints beat triggers, and triggers beat application checks.** A composite foreign
   key made "reviews only after delivery" structurally impossible to violate, and made a
   denormalised column impossible to drift.
6. **Know what does not belong in the database.** Live GPS is cache-shaped data, and the
   reason is MVCC churn overwhelming vacuum, not a vague sense that it is "a lot of writes".
   Being able to say *why* is the difference between a rule of thumb and an argument.
7. **Derive indexes from queries, and prefer partial ones.** The live-queue index is small
   forever because rows leave it when they stop being live. That is a property of the
   predicate, not of the table.
8. **Let the access pattern pick the shard key.** City works here because the entire
   transactional path is local to one. Say what it costs — national aggregates — and where
   that cost should actually be paid.
