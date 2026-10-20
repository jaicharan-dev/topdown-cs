---
id: 6-cab-booking-uber-ola
title: "Design Uber / Ola: Ride-Hailing & Geospatial Matching"
description: "A full schema-design interview for ride-hailing, worked one decision at a time: why a trip is a path rather than two points, how one ride is offered to many drivers without double-booking, why a single fare column cannot survive a dispute, and how matching, quoting, ratings, partitioning and sharding fall out of the access patterns."
sidebar_position: 6
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

---

### How to read this page

The schema at the bottom of this page is not the answer. The answer is the order the
decisions were made in, and what each one cost.

> **If you are revising the night before**, read Steps 1, 4, 7, 8 and 19, then the final
> schema in Step 18. That is the spine: clarify, draft something wrong, discover that one
> fare column cannot explain a charge, and understand what a quote actually is.
>
> **Say in the room** what Steps 1–10 cover. Steps 11–17 are depth for when an interviewer
> pushes on ratings, matching or scale. Nobody is expected to volunteer H3 cell indexing
> unprompted — but being able to say *why* the matching index cannot live in Postgres is
> worth more than naming the library that does it.

This is the third schema question on the site, and the method is now familiar: clarify
until options disappear, draft a deliberately wrong V1, break it in public, fix it. What
changes is the thing the domain is fundamentally *about*.

[Splitwise](./4-expense-splitting-splitwise) is about arithmetic — a column of numbers that
has to sum to zero. [Swiggy](./5-food-delivery-swiggy-zomato) is about time — an order
moving through states while several parties push on it. Ride-hailing is about **committing
to a price before you know what you are selling**. You quote a fare for a trip that has not
happened, over a route nobody has driven yet, at a surge multiplier that expires in two
minutes. Then you have to defend that number in a dispute eight months later. Almost every
hard decision on this page follows from that.

Conventions carried over without re-deriving them: `BIGINT GENERATED ALWAYS AS IDENTITY`
keys, `NUMERIC` for money, `TIMESTAMPTZ` for every timestamp, soft deletes for anything
financial history references. The arguments are in Step 2 of the Splitwise question.

---

### Step 1 — Pin down what we are building

**Interviewer:** Design the database for a ride-hailing app like Uber or Ola. Riders
request a ride between two points, the system matches a nearby driver, the ride moves
through a set of statuses, and the fare depends on distance, time and a surge multiplier.
Riders and drivers rate each other. Riders save payment methods. I care about tables,
relationships, and resolving fare disputes.

**Candidate:** Five questions first, each of which deletes work if the answer goes one way.

Vehicle tiers — one fleet, or Go/XL/Premier?

**Interviewer:** Tiers, yes.

**Candidate:** Then pricing is per-tier and the tier has to be frozen onto the ride, because
rate cards change. One column, but it has to be the right column.

Shared rides — pooling?

**Interviewer:** Point-to-point only.

**Candidate:** That removes a great deal. Pooling means one vehicle holding several
concurrent trips with interleaved pickups, a fare split across riders who joined at
different times, and a route that is recomputed every time someone new is matched. Ruling
it out keeps one driver on one ride and keeps the fare attributable to one rider.

Payment details — raw cards, or gateway tokens?

**Interviewer:** Tokens. There is a payment gateway.

**Candidate:** Good, and I would push back if the answer were otherwise. Storing card
numbers drags the entire database into PCI-DSS scope. Tokens keep the sensitive data at the
gateway and leave us storing an opaque string.

Does the rider get a guaranteed upfront price, or an estimate that is trued up at the end?

**Interviewer:** An estimate. They are billed the actual calculation when the trip ends.

**Candidate:** That is the most consequential answer so far, and I want to flag why now
rather than later. An *estimate* and a *guaranteed price* are completely different
objects. A guarantee is a liability — a promise the company must honour even if the trip
takes twice as long, which means storing it, expiring it, and reconciling it against the
actual. An estimate is a display value. I will design for the estimate, and in Step 8 I
will show the one extra table that upgrades it to a guarantee, because products move in
that direction and it is a question worth having an answer to.

Last one: is the matching engine — finding nearby drivers in real time — inside this
database?

**Interviewer:** No. A separate service handles matching. You store the result.

**Candidate:** Then the most important thing I can do is be precise about the boundary. I
will design the contract between the two in Step 14, because "a separate service handles
it" is where a lot of these designs quietly lose the double-booking guarantee — the service
decides, but only the database can *enforce* that one driver is not promised to two riders.

---

### Step 2 — One person, two roles

**Interviewer:** Start with the tables.

**Candidate:** With a modelling decision that is easy to get wrong on the first try: are
riders and drivers the same kind of thing?

The reflex is two tables, `users` and `drivers`, and it is defensible. But look at what
both need: a phone number as login identity, a display name, a rating, a notification
token, an account status, a soft-delete column. Every one of those gets written twice, and
every feature that touches "a person" gets written twice after it.

The decisive fact is that a driver is frequently also a rider. They take a cab home when
their shift ends. With two tables that person has two accounts, two phone numbers that
collide in two unique indexes, and two rating histories.

:::decision

One `users` table for identity, plus a `driver_profiles` table for the role.

Identity is shared; being a driver is an extra thing a user can be, with its own licence,
onboarding state and payout account. A driver profile without a user is meaningless, which
is exactly what a one-to-one extension table means.

*Cost:* a join on the driver path. It is a primary-key join on a table that is a small
fraction of `users`, and it buys one phone number per human being.

*Would change if:* drivers were onboarded by fleet operators as entities in their own
right, with no consumer account at all. Then they are genuinely a different noun.

:::

```sql title="users and driver_profiles"
CREATE TABLE users (
    user_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone        VARCHAR(16)  NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    display_name TEXT         NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_phone_uniq ON users (phone) WHERE deleted_at IS NULL;

CREATE TABLE driver_profiles (
    user_id         BIGINT PRIMARY KEY REFERENCES users(user_id),
    licence_number  TEXT          NOT NULL,
    onboarded_at    TIMESTAMPTZ,
    account_status  driver_status NOT NULL DEFAULT 'pending',
    home_region_id  INT           NOT NULL REFERENCES regions(region_id),
    deactivated_at  TIMESTAMPTZ
);
```

`deactivated_at` rather than a hard delete, for the reason that recurs in every one of
these questions: `rides` reference drivers, and those rows are financial history.

---

### Step 3 — `vehicles`, and what the ride has to remember

A driver may register several vehicles over the years. The ride has to record **which car
actually turned up**, not which car the driver drives today.

```sql title="vehicles"
CREATE TABLE vehicles (
    vehicle_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT       NOT NULL REFERENCES users(user_id),
    plate_number  TEXT         NOT NULL,
    model         TEXT         NOT NULL,
    tier          vehicle_tier NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    retired_at    TIMESTAMPTZ
);
```

**Interviewer:** You are going to put `vehicle_id` on the ride. Is that not a transitive
dependency — ride to driver to vehicle?

**Candidate:** It would be, if the driver-to-vehicle link were a fact about the ride. It is
not; it is a fact about *now*. Joining through the driver to find the vehicle for a trip in
2023 returns whatever they drive in 2026. Storing `vehicle_id` on the ride freezes the
physical car that picked that rider up, which is what a dispute, an insurance claim or a
lost-property report actually needs.

The same argument puts `tier` on the ride as well, even though the vehicle has one. The
tier determines the rate card, a vehicle can be reclassified, and a reclassification must
not restate what past trips cost.

That is the general rule, and it is the same one from the previous two questions: **a
record of something that happened must be readable without consulting a table that is still
being edited.**

---

### Step 4 — `rides`, first cut

```sql title="rides — first cut"
CREATE TABLE rides (
    ride_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rider_id     BIGINT       NOT NULL REFERENCES users(user_id),
    driver_id    BIGINT       REFERENCES users(user_id),
    vehicle_id   BIGINT       REFERENCES vehicles(vehicle_id),
    tier         vehicle_tier NOT NULL,
    status       ride_status  NOT NULL DEFAULT 'requested',
    pickup       geography(Point, 4326) NOT NULL,
    dropoff      geography(Point, 4326) NOT NULL,
    requested_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    final_amount NUMERIC(14,2)
);
```

Two things are already settled by earlier questions and I will not re-derive them.

**Locations are `geography(Point, 4326)`, not a pair of `DECIMAL` columns.** Two decimals
cannot be indexed for proximity, and distance between them is a trigonometric calculation
the database cannot help with. This is the same argument as Step 14 of the Swiggy question.

**Status transitions get an event log.** `rides.status` is a cursor; the questions the
business asks — time to pickup, time from accept to start, how long riders wait in the rain
— are all about *when*, and a single mutable cell throws that away. The design is exactly
the `order_status_events` pattern from Step 7 of the Swiggy question: an append-only
`ride_events` table as the source of truth, with `rides.status` as a projection written in
the same transaction.

```sql title="ride_events — carried over, not re-derived"
CREATE TABLE ride_events (
    event_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ride_id     BIGINT      NOT NULL REFERENCES rides(ride_id),
    status      ride_status NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor       actor_type  NOT NULL,
    actor_id    BIGINT,
    reason      TEXT
);
CREATE UNIQUE INDEX ride_events_once ON ride_events (ride_id, status);
```

What is left is the part this domain does differently, and `final_amount` is where it goes
wrong. Three times.

---

### Step 5 — Break #1: a trip is a path, not two points

:::broke

The schema stores where the trip started and where it ended. The fare depends on the route
actually driven, which is neither of those and cannot be derived from them.

:::

**Interviewer:** A rider disputes a ₹480 fare for a trip they say should have been ₹300.
Settle it.

**Candidate:** With this schema I cannot. I have two points and a number. The straight-line
distance between the points is perhaps six kilometres; the fare was computed from fourteen,
because the driver was routed around a closed flyover. Both numbers are plausible and the
database holds no evidence for either.

**Interviewer:** So store the distance.

**Candidate:** Yes — and the crucial word is *store*, not *derive*. The distance travelled
is a **measured fact**, produced by the driver's device and the routing service during the
trip. It is not recomputable afterwards: by the time support opens the ticket, traffic has
cleared, the flyover has reopened, and the routing engine that would "recheck" it returns a
different answer than the one the trip was priced on.

So the ride records what was measured:

```sql title="The measured facts of the trip" {3,4,5}
ALTER TABLE rides
    ADD COLUMN started_at      TIMESTAMPTZ,
    ADD COLUMN ended_at        TIMESTAMPTZ,
    ADD COLUMN distance_metres INT    CHECK (distance_metres >= 0),
    ADD COLUMN duration_seconds INT   CHECK (duration_seconds >= 0),
    ADD COLUMN route           geography(LineString, 4326);
```

`distance_metres` as an integer, not a `NUMERIC` of kilometres. Distance arrives from a
device in metres; storing it in its natural unit removes a conversion, and a conversion is
somewhere a rounding error can hide in a number that ends up on an invoice.

**Interviewer:** Do you really need the whole route geometry?

**Candidate:** It is the single most effective dispute-resolution artefact there is — you
can show the rider the line their trip actually traced. But it is heavy: a polyline for a
long trip is kilobytes, on the busiest table in the system, and almost no query reads it.

:::decision

`distance_metres` and `duration_seconds` on the ride; the full `route` geometry stored
separately and cold.

The two scalars are what pricing and analytics read constantly and they are small. The
geometry is read by support, rarely, and would otherwise bloat every page of a table that
is scanned for everything else.

*Shape:* a `ride_routes` table keyed one-to-one on `ride_id`, or an object-store reference
with an encoded polyline. Either way it is off the hot table.

*Cost:* a join for the one screen that draws a map. That screen is opened by support staff,
not by millions of riders.

:::

---

### Step 6 — Break #2: one ride, many drivers, one winner

:::broke

`driver_id` nullable until assigned assumes an assignment happens. What actually happens is
an auction, and the schema has nowhere to record that it took place.

:::

**Interviewer:** A rider requests a car at the airport. How does a driver end up on that
ride?

**Candidate:** The V1 implies the system picks a driver and writes the id. In reality the
driver has to *accept*, and they very often do not — they are about to go off shift, they
do not like the destination, their phone is in their pocket. So the system offers the ride
and waits.

Offering to one driver at a time is the obvious approach and it is unusable. Each offer
needs ten to fifteen seconds to time out. Five declines in a row is over a minute of a
rider watching a spinner, which is where they close the app.

So offers go out to several drivers at once — and that creates the problem the single
`driver_id` column cannot express: **two drivers accept the same ride.**

**Interviewer:** Is this not the same race you solved for me in the last question?

**Candidate:** It is the same *primitive* with the shape inverted, and the difference is
worth naming.

In food delivery, many dispatchers each claimed a *different* idle partner — N workers
competing over N resources, where the goal is for everyone to succeed on something
different. That is what `FOR UPDATE SKIP LOCKED` is for: step over what is taken and grab
the next one.

Here, N drivers compete over **one** ride, and the goal is for exactly one to succeed and
the rest to be told no. Skipping is wrong; losing is the correct outcome for four of the
five. So the primitive is the guarded `UPDATE`:

```sql title="First accept wins" {4}
UPDATE rides
   SET driver_id  = $2,
       vehicle_id = $3,
       status     = 'accepted'
 WHERE ride_id    = $1
   AND status     = 'requested'    -- the guard: nobody has accepted yet
   AND driver_id IS NULL
RETURNING ride_id;
```

Zero rows means another driver got there first, and that driver's app says "this ride has
been taken" — which is true, and is a much better experience than a double assignment
discovered when two cars arrive.

The offers themselves need to be rows, because an offer is a fact with a lifetime:

```sql title="ride_offers"
CREATE TABLE ride_offers (
    ride_id      BIGINT      NOT NULL REFERENCES rides(ride_id),
    driver_id    BIGINT      NOT NULL REFERENCES users(user_id),
    offered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    outcome      offer_outcome NOT NULL DEFAULT 'pending',
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (ride_id, driver_id)
);

-- A driver holds at most one pending offer at a time.
CREATE UNIQUE INDEX one_pending_offer_per_driver
    ON ride_offers (driver_id) WHERE outcome = 'pending';
```

That partial unique index is doing real work. Without it a driver sitting at an airport
receives three simultaneous offers, accepts two, and wins one — a terrible experience, and
a wasted matching cycle for the rider who lost.

And the guarantee that matters most is structural rather than procedural:

```sql title="A driver is on at most one live ride, ever"
CREATE UNIQUE INDEX one_live_ride_per_driver
    ON rides (driver_id)
    WHERE status IN ('accepted', 'arriving', 'in_progress');
```

:::decision

Offers as rows with an expiry, a guarded `UPDATE` to decide the winner, and a partial
unique index as the backstop.

The guarded update is the fast path and the index is the proof. Even if the accept endpoint
were rewritten badly tomorrow, the database still refuses to put one driver on two live
rides.

*Why a partial index rather than a `CHECK`:* this is a rule *across* rows, and a `CHECK`
only sees one. A partial unique index is the cheapest cross-row constraint Postgres offers,
and it stays small because completed rides leave it.

:::

---

### Step 7 — Break #3: one `final_amount` cannot survive a dispute

:::broke

The question asked for fare disputes to be easy to resolve. A single total is the one
artefact that makes them impossible.

:::

**Interviewer:** The rider is charged ₹480 and wants it itemised.

**Candidate:** `final_amount = 480.00` can say nothing. And the usual patch — a fixed set
of columns, `base_fare`, `distance_fare`, `time_fare`, `surge_multiplier` — survives
exactly until the first thing that does not fit, which arrives almost immediately:

- an airport pickup levy that exists in two cities,
- a toll the driver paid and is reimbursed for,
- waiting time after the first five free minutes,
- a promo code taking ₹75 off,
- a tip added after the trip ended,
- a cleaning fee charged three hours later.

Each one adds a nullable column to the busiest table in the system, and six months later
nobody can tell which combinations are legal. Worse, the earlier draft of this answer did
something I want to call out specifically: it handled a cancellation fee by putting ₹5 in
`base_fare` with `distance = 0`. That makes the number come out right and corrupts the
meaning of the column — every analytics query over `base_fare` is now silently wrong,
because some of those rows are not base fares at all.

A fare is not a number. It is a **list of lines that sum to a number.**

```sql title="fare_components"
CREATE TABLE fare_components (
    ride_id   BIGINT         NOT NULL REFERENCES rides(ride_id) ON DELETE RESTRICT,
    line_no   SMALLINT       NOT NULL,
    kind      fare_kind      NOT NULL,   -- base, distance, time, surge, toll,
                                         -- wait, airport_fee, promo, tip,
                                         -- cancellation_fee, adjustment
    amount    NUMERIC(14,2)  NOT NULL,   -- signed: promos are negative
    note      TEXT,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (ride_id, line_no)
);
```

Now the itemisation is a `SELECT`, a new charge type is a new enum value rather than a
migration on the hot table, and a cancellation fee is a line that says
`cancellation_fee` — which is what it is.

**Interviewer:** You still have `final_amount` on the ride.

**Candidate:** Yes, and deliberately, for the same reason `total_amount` stayed on an order
in the previous question: it is what the rider was actually charged, frozen. Recomputing it
from the components is almost always identical and occasionally is not — a gateway rounds,
a partial refund lands, a currency conversion applies — and at that point the stored value
is the truth about what left the rider's account.

The two must not silently diverge, so the relationship between them is asserted:

```sql title="The invariant worth enforcing" {6}
CREATE OR REPLACE FUNCTION check_fare_sums() RETURNS TRIGGER AS $fn$
BEGIN
    IF (SELECT COALESCE(SUM(amount), 0) FROM fare_components
         WHERE ride_id = NEW.ride_id) <> NEW.final_amount THEN
        RAISE EXCEPTION 'fare components do not sum to final_amount for ride %',
            NEW.ride_id;
    END IF;
    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;
```

Attached as a `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`, so it fires at commit
rather than after each statement — otherwise inserting the components one at a time fails
on the first one, before the rest exist.

:::decision

A `fare_components` ledger as the itemisation, with `final_amount` on the ride as the
charged total, reconciled by a deferred constraint trigger.

Every charge type is data rather than schema, disputes are answerable by selecting rows,
and the redundancy between the lines and the total is checked by the database at commit
rather than hoped for.

*Cost:* a trigger on the financial write path, and components are immutable — a correction
is a new `adjustment` line, never an edit. That is standard ledger discipline and it is
what makes the history defensible.

:::

---

<details>
<summary><b>Schema checkpoint — everything as it stands after Step 7</b></summary>

```sql
CREATE TABLE users (
    user_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone        VARCHAR(16) NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    display_name TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE driver_profiles (
    user_id        BIGINT PRIMARY KEY REFERENCES users(user_id),
    licence_number TEXT          NOT NULL,
    account_status driver_status NOT NULL DEFAULT 'pending',
    home_region_id INT           NOT NULL REFERENCES regions(region_id),
    deactivated_at TIMESTAMPTZ
);

CREATE TABLE vehicles (
    vehicle_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT       NOT NULL REFERENCES users(user_id),
    plate_number  TEXT         NOT NULL,
    model         TEXT         NOT NULL,
    tier          vehicle_tier NOT NULL,
    retired_at    TIMESTAMPTZ
);

CREATE TABLE rides (
    ride_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rider_id         BIGINT       NOT NULL REFERENCES users(user_id),
    driver_id        BIGINT       REFERENCES users(user_id),
    vehicle_id       BIGINT       REFERENCES vehicles(vehicle_id),
    tier             vehicle_tier NOT NULL,
    status           ride_status  NOT NULL DEFAULT 'requested',
    pickup           geography(Point, 4326) NOT NULL,
    dropoff          geography(Point, 4326) NOT NULL,
    requested_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    started_at       TIMESTAMPTZ,
    ended_at         TIMESTAMPTZ,
    distance_metres  INT  CHECK (distance_metres  >= 0),
    duration_seconds INT  CHECK (duration_seconds >= 0),
    final_amount     NUMERIC(14,2)
);

CREATE TABLE ride_routes (
    ride_id BIGINT PRIMARY KEY REFERENCES rides(ride_id),
    route   geography(LineString, 4326) NOT NULL
);

CREATE TABLE ride_events ( ... );        -- as Step 4
CREATE TABLE ride_offers ( ... );        -- as Step 6
CREATE TABLE fare_components ( ... );    -- as Step 7
```

</details>

---

### Step 8 — The quote, and the price you promise before you know it

**Interviewer:** You said earlier you would come back to upfront pricing.

**Candidate:** This is the part of ride-hailing that has no analogue in the previous two
questions, so it is worth doing properly.

Surge is the clearest case. A rider opens the app during a storm and sees 1.8×. They stare
at it for four minutes while deciding. By the time they tap, the multiplier is 2.3×. What
do you charge them?

Charging 2.3× is defensible and infuriating. Charging 1.8× means you made a **promise**,
and a promise is a row, not a calculation. It has a value, a moment it was made, a window
in which it is valid, and a need to be matched against the trip that eventually used it.

```sql title="fare_quotes"
CREATE TABLE fare_quotes (
    quote_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rider_id         BIGINT       NOT NULL REFERENCES users(user_id),
    tier             vehicle_tier NOT NULL,
    pickup           geography(Point, 4326) NOT NULL,
    dropoff          geography(Point, 4326) NOT NULL,
    rate_card_id     BIGINT       NOT NULL REFERENCES rate_cards(rate_card_id),
    surge_multiplier NUMERIC(4,2) NOT NULL CHECK (surge_multiplier >= 1),
    estimated_amount NUMERIC(14,2) NOT NULL,
    quoted_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ  NOT NULL,
    CHECK (expires_at > quoted_at)
);

ALTER TABLE rides
    ADD COLUMN quote_id BIGINT REFERENCES fare_quotes(quote_id);
```

Three things fall out of that table that a `surge_multiplier` column on the ride would not
give you.

**The rate card is referenced, not copied.** Rates change — a city regulator caps the
per-kilometre charge, a tier is repriced — and a ride must be reconstructible against the
card that was in force when it was quoted. `rate_card_id` makes that a foreign key to an
immutable, versioned row rather than a set of numbers duplicated onto every trip. This is
the same reasoning as the menu-price snapshot in the last question, arriving at the
opposite implementation, and the difference is worth understanding: a menu item's name and
price are two small values and copying them is cheaper than versioning. A rate card is
thirty values shared by millions of rides, so it is versioned and referenced.

**Expiry is data.** `expires_at` means a stale quote is rejected by a comparison rather
than by someone remembering to check.

**Quotes without rides are the product's most valuable dataset.** Every quote that never
became a ride is a rider who looked at your price and walked away. Keeping quotes in their
own table, including the abandoned ones, makes "what is our conversion at 2× surge"
answerable. Had surge been a column on `rides`, that evidence would never have existed.

:::decision

Quotes are their own table with an expiry, referenced by the ride.

A promise has a lifetime and must be storable without a trip attached. A column on `rides`
can represent neither.

*Cost:* a table with far more rows than `rides` — most quotes are abandoned — and its own
retention policy. Ninety days is plenty; nothing downstream needs a two-year-old estimate.

*This is also the upgrade path to guaranteed pricing:* with the promise already stored, the
difference between estimate and guarantee becomes a policy decision about which number
wins, not a schema change.

:::

---

### Step 9 — Two sides of one trip: charged is not paid

**Interviewer:** The fare is ₹480. What does the driver earn?

**Candidate:** Not ₹480, and this is the modelling point most versions of this answer miss
entirely. There is a commission, perhaps 20%. There may be a driver incentive that the
rider never sees and does not fund — "complete 12 trips today, earn ₹500" — paid by the
platform. There is a toll the rider was charged and the driver is reimbursed for, which
passes straight through at 100%.

So the rider's invoice and the driver's payout are two different documents that happen to
share a trip. Collapsing them into one number makes the driver's earnings unexplainable,
which is the single most common source of driver support tickets in this industry.

```sql title="driver_earnings"
CREATE TABLE driver_earnings (
    ride_id    BIGINT        NOT NULL REFERENCES rides(ride_id),
    line_no    SMALLINT      NOT NULL,
    kind       earning_kind  NOT NULL,   -- fare_share, toll_reimbursement,
                                         -- incentive, commission, adjustment
    amount     NUMERIC(14,2) NOT NULL,   -- signed: commission is negative
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (ride_id, line_no)
);
```

Deliberately the same shape as `fare_components`. Two ledgers hanging off one ride, summing
to two different totals, each itemisable on demand. The platform's margin on a trip is the
difference between them — which is now a query rather than a number nobody can derive.

**Interviewer:** Why not one table with a `party` column?

**Candidate:** Because the two have different lifecycles. Rider charges settle when the
trip ends; driver earnings are aggregated into a weekly payout, can include lines that
reference no rider charge at all, and are corrected on a different schedule by a different
team. One table would need a `party` discriminator on every row, every query would filter
on it, and the first person to forget that filter produces a number that is the sum of two
unrelated ledgers.

---

### Step 10 — Cancellation, where money meets the state machine

**Interviewer:** The driver arrives, waits ten minutes, the rider never appears. The driver
cancels. We still owe them a fee, and the trip covered zero kilometres.

**Candidate:** With the schema as it now stands there is almost nothing to do, which is the
sign the earlier decisions were right.

The ride is `cancelled`. A `fare_components` row of kind `cancellation_fee` is written for
the rider, and a `driver_earnings` row of kind `fare_share` for the driver. `distance_metres`
is 0 and stays 0, because that is true. No column is repurposed and no analytics query is
poisoned.

What is worth drawing out is where the *policy* lives. Whether a fee applies at all depends
on who cancelled and how long after what:

| cancelled by | after | fee |
|---|---|---|
| rider | within 2 min of accept | none |
| rider | after driver has arrived | rider charged |
| driver | before arriving | none |
| driver | after waiting past the grace period | rider charged |
| system | no driver found | none |

Every input to that table is already stored. *Who* is `ride_events.actor`. *When* is
`ride_events.occurred_at`, including the exact moment the driver was marked as arrived. The
elapsed time is a subtraction between two rows in the event log.

This is the payoff from Step 4 arriving two steps later than the decision. Had status been a
single mutable column, "how long after the driver arrived did the rider cancel" would be
unanswerable, and the fee policy would have to be evaluated live at cancellation time and
its inputs thrown away — leaving nothing to show a rider who disputes the charge.

:::decision

The fee *policy* lives in application code; its *inputs and its outcome* live in the
database.

A policy with five branches that changes by city and by regulator is not a `CHECK`
constraint. But every fact it consumes is an event row, and its decision is a ledger line,
so the charge is reproducible after the fact even when the policy has since changed.

:::

---

### Step 11 — Blind two-sided ratings

**Interviewer:** Riders and drivers rate each other.

**Candidate:** The obvious table is one row per rating with a `rater_role` discriminator,
and that is fine. The interesting requirement is one the product has but the question did
not state: **ratings must be blind.**

If a driver can see a rider's one-star rating before submitting their own, the second
rating is retaliation rather than an assessment. So neither party sees the other's until
both have submitted, or a window — typically a few days — expires.

That is a visibility rule, and the mistake is to implement it in the application's `SELECT`
statements. There are several readers: the rider app, the driver app, a support console,
the rating aggregation job. Each needs the rule, and only one of them needs to forget it.

```sql title="ride_ratings"
CREATE TABLE ride_ratings (
    ride_id      BIGINT      NOT NULL REFERENCES rides(ride_id),
    rater_role   party_role  NOT NULL,          -- 'rider' | 'driver'
    rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (ride_id, rater_role)
);
```

The primary key gives "one rating per party per ride" for free, and the role is part of the
key rather than a column, so a second rider rating is rejected structurally.

The blindness rule then becomes a view that every reader goes through:

```sql title="Visibility as a view, not as five SELECT statements" {6,7}
CREATE VIEW visible_ratings AS
SELECT r.*
  FROM ride_ratings r
  JOIN rides ride ON ride.ride_id = r.ride_id
 WHERE (SELECT count(*) FROM ride_ratings x WHERE x.ride_id = r.ride_id) = 2
    OR r.submitted_at < now() - INTERVAL '3 days';
```

Applications read `visible_ratings`; only the aggregation job and support read the base
table. The rule is written once, and revoking `SELECT` on `ride_ratings` from the
application role makes it unbypassable.

:::decision

Ratings stored immediately, visibility enforced by a view with restricted grants.

Storing late — holding a rating in a queue until the other arrives — loses data if the
queue does, and makes "has this user rated yet" a question about a message broker.

*Cost:* the view's correlated count is work on every read. In practice it is two index
lookups on a primary key, and the result is cached in the aggregate columns anyway, so very
few reads go through it.

:::

---

### Step 12 — The rolling rating, and a `LIMIT` that does nothing

**Interviewer:** Show a driver's average rating over their last 100 trips.

**Candidate:** The query people write first is wrong in a way that returns a plausible
number, which is the worst kind of wrong:

```sql title="Wrong, and it will not look wrong"
SELECT AVG(rating)
  FROM ride_ratings r
  JOIN rides ride ON ride.ride_id = r.ride_id
 WHERE ride.driver_id = $1 AND r.rater_role = 'rider'
 ORDER BY ride.ended_at DESC
 LIMIT 100;
```

`AVG` collapses the whole matching set to a single row *before* `LIMIT` is applied. The
`LIMIT 100` then truncates a one-row result to one row, which does nothing at all. The
answer returned is the driver's lifetime average — over four years of trips, not a hundred.

The fix is to make the limiting happen first, in a subquery, so the aggregate sees only the
rows you meant:

```sql title="Right: limit the set, then aggregate" {8}
SELECT AVG(rating) AS rolling_rating
  FROM (
    SELECT r.rating
      FROM ride_ratings r
      JOIN rides ride ON ride.ride_id = r.ride_id
     WHERE ride.driver_id = $1
       AND r.rater_role   = 'rider'
     ORDER BY ride.ended_at DESC
     LIMIT 100
  ) recent;
```

This is a general trap, not a ride-hailing one. **Any aggregate in the same `SELECT` as a
`LIMIT` is aggregating the whole set.** It catches people with `SUM`, `COUNT` and
`MAX` just as reliably.

**Interviewer:** And running that during matching?

**Candidate:** Not during matching — the rating is read in the two seconds where a rider is
waiting, and it must be a column read.

The usual answer is a cached column refreshed by a background job. There is a better one
here, and it is worth contrasting with the ratings cache in the previous question. There I
kept `rating_sum` and `rating_count` and the average was exact and incrementally
maintainable, because a lifetime average only ever grows.

A *rolling window* is not incrementally maintainable the same way: when the 101st rating
arrives, the 1st leaves, and maintaining the sum requires knowing the value that dropped
out. You can track it, but the bookkeeping is fiddly and it drifts if anything is ever
backfilled.

:::decision

Recompute the rolling rating from the last 100 rows, on trip completion, into a column on
`driver_profiles`.

The recompute is bounded — exactly 100 rows, served by the `(driver_id, ended_at DESC)`
index — so it is a few hundred microseconds on an event that happens once per trip. That is
genuinely cheaper than maintaining a sliding sum, and it cannot drift, because it is derived
fresh from the source rows every time.

*Why not a job:* a job introduces a staleness window for no benefit, since the natural
trigger — a trip ending — is exactly when the value changes.

*Cost:* one extra small query per completed trip, on a path that is already writing several
rows in a transaction.

:::

---

### Step 13 — Why matching cannot be a database query

**Interviewer:** I said matching is someone else's problem, but tell me why.

**Candidate:** Because the index you would need is the one thing you cannot maintain in a
transactional database.

The query itself looks harmless — the nearest idle drivers to a point:

```sql title="The query you cannot afford to serve"
SELECT user_id
  FROM driver_locations
 WHERE state = 'idle'
   AND ST_DWithin(location, ST_MakePoint($1, $2)::geography, 3000)
 ORDER BY location <-> ST_MakePoint($1, $2)::geography
 LIMIT 10;
```

With a GiST index that is a perfectly good query, and in the previous question I used
exactly this shape for restaurants. The difference is that **restaurants do not move.**

Take 500,000 active drivers pinging every 4 seconds: 125,000 location updates per second.
In Postgres an `UPDATE` writes a new row version and marks the old one dead — that is how
MVCC serves consistent snapshots without blocking readers. So those updates produce 125,000
dead tuples per second, each one also churning the GiST index, which is more expensive to
maintain than a B-tree. Autovacuum cannot keep pace; the table and its index bloat, every
query against them slows down, and the degradation spreads to everything else on the
instance.

The data is not large — it is a few hundred megabytes of current positions. It is the
**churn** that is impossible, and the churn is intrinsic: the whole point of the dataset is
that it is replaced continuously.

**Interviewer:** So how is it done?

**Candidate:** The supply index lives in memory, and the usual trick is to stop treating
position as a continuous coordinate and start treating it as a **cell**.

A hierarchical grid — Uber's H3, or Google's S2 — tiles the earth with cells, each
identified by a single integer. A driver's position becomes the cell they are in. Finding
nearby drivers becomes: compute the rider's cell, take its neighbouring cells, and look up
the drivers in each. That is a hash lookup on an integer key, not a geometric search.

What this buys, and why it is worth the loss of precision:

- **Lookups become O(1) hash operations** on a handful of integer keys.
- **A moving driver is usually a no-op.** Most pings land in the cell the driver was already
  in, so there is nothing to update — at a 400-metre cell edge and city traffic, the vast
  majority of 4-second pings do not cross a boundary. The write volume collapses.
- **It shards naturally.** Cell IDs partition cleanly across machines, with geographic
  locality, because neighbouring cells have related IDs.
- **It is cheap to make durable-enough.** Positions are reconstructed within one ping
  interval after a restart, so the store does not need durability at all.

:::decision

An in-memory, cell-indexed supply store for matching. Nothing about live position in
Postgres.

*Contrast with the previous question, deliberately:* there, PostGIS with a GiST index was
the right answer for finding restaurants, because restaurants are static and the index is
written rarely and read constantly. Here the same structure is wrong for the same reason
reversed. **The question is never "is PostGIS good" — it is "what is the read-to-write
ratio of this index".**

*What stays relational:* the driver's identity, their onboarding and account state, the
vehicle they are driving, and every committed ride. Facts, not positions.

:::

---

### Step 14 — The contract with the matching service

**Interviewer:** Good. So what does the database owe that service?

**Candidate:** This is where these designs usually go wrong, and the failure is subtle:
having correctly moved matching out, people conclude the database has no role in it. It has
exactly one, and it is the important one.

The matching service **decides**. It knows where everyone is, which driver is heading
north, who is about to finish a trip two streets away. It is an optimisation problem over
volatile data, and it belongs in memory.

The database **adjudicates**. Whatever the service decided, the ride is only real when a row
says so, and that row is subject to constraints the service cannot enforce — because the
service is multiple processes, and a few of them are always running stale state.

So the contract is narrow:

1. The service picks candidate drivers and writes `ride_offers` rows with an expiry.
2. A driver accepts; the guarded `UPDATE` from Step 6 decides the winner atomically.
3. `one_live_ride_per_driver` is the backstop. If two matching processes were ever to
   disagree, the second insert fails and the system degrades to a retry rather than to two
   cars at one kerb.

The thing to say out loud in an interview is that **the fast path and the correctness
guarantee are different mechanisms**. The guarded update makes the common case a single
round trip. The partial unique index means that even if that code is wrong, the invariant
holds. Designs that rely only on the service being careful have no second line.

---

### Step 15 — Indexing, derived from the queries

```sql title="Q1 — app reopens: am I on a ride right now?"
CREATE INDEX rides_live_by_rider
    ON rides (rider_id)
    WHERE status IN ('requested', 'accepted', 'arriving', 'in_progress');

CREATE INDEX rides_live_by_driver
    ON rides (driver_id)
    WHERE status IN ('requested', 'accepted', 'arriving', 'in_progress');
```

Both partial, because a live ride is one row out of a user's lifetime history and the index
should contain only that. A completed ride leaves the index entirely, so these stay tiny
forever regardless of how large `rides` grows.

A note on something the earlier draft of this answer claimed: these lookups are not
`O(1)`. A B-tree lookup is `O(log n)` — a descent of a few levels. The distinction matters
here because the whole argument for a *partial* index is that it keeps `n` small, and that
argument only makes sense if the cost depends on `n` in the first place.

```sql title="Q2 — my trip history, newest first"
CREATE INDEX rides_history_by_rider ON rides (rider_id, requested_at DESC);
```

Paginated by keyset, not `OFFSET`, on `(requested_at, ride_id)` — the same reasoning as the
order history in the previous question.

```sql title="Q3 — the rolling-100 rating"
CREATE INDEX rides_by_driver_ended ON rides (driver_id, ended_at DESC)
    WHERE ended_at IS NOT NULL;
```

Equality column first, range or sort column second. Reverse them and the index cannot serve
the query — the leftmost-prefix rule.

```sql title="Q4 — a support agent opening a dispute"
CREATE INDEX fare_components_by_ride ON fare_components (ride_id);
```

The primary key is `(ride_id, line_no)`, so `ride_id` is already the leftmost column and
this index is redundant — worth saying rather than adding it reflexively. What *is* worth
adding is the foreign-key index Postgres does not create for you:

```sql title="Postgres does not index foreign keys automatically"
CREATE INDEX ride_offers_by_driver ON ride_offers (driver_id);
```

Without it, deleting or updating a referenced row forces a sequential scan of the
referencing table to check the constraint. This is one of the most common sources of
mysterious slow deletes in Postgres.

```sql title="Q5 — expiring stale offers"
CREATE INDEX ride_offers_pending ON ride_offers (expires_at)
    WHERE outcome = 'pending';
```

The sweeper looks only at pending offers, so the index holds only pending offers. It is a
few thousand rows at any moment, out of billions.

---

### Step 16 — Partitioning before sharding

**Interviewer:** `rides` grows forever. What do you do?

**Candidate:** The reflex answer is to shard, and it is usually premature. The first problem
with an ever-growing table is not that it exceeds one machine — it is that its **indexes
stop fitting in memory**, and a B-tree that no longer fits turns every lookup into disk
I/O.

Partitioning fixes that without distributing anything:

```sql title="Range partitioning by month"
CREATE TABLE rides (
    ride_id      BIGINT GENERATED ALWAYS AS IDENTITY,
    requested_at TIMESTAMPTZ NOT NULL,
    ...
) PARTITION BY RANGE (requested_at);

CREATE TABLE rides_2026_10 PARTITION OF rides
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
```

Rides are overwhelmingly accessed by recency: the live ones, this week's, this month's
receipts. With monthly partitions, the hot partition is small, its indexes are small, and
they stay resident in memory permanently. Old partitions exist, are queryable, and are never
touched.

It also makes retention a metadata operation. Moving a year-old month to cold storage is
`DETACH PARTITION` — instant — instead of a `DELETE` of fifty million rows that generates
fifty million dead tuples and gives autovacuum a very bad night.

:::decision

Partition `rides` and `fare_components` by month before considering sharding.

It solves the actual first problem — index locality — with no application changes, no
cross-node queries and no distributed transactions.

*Cost:* the partition key has to be in the primary key, so it becomes
`(requested_at, ride_id)`. Queries that do not filter on time scan every partition, so
`ride_id`-only lookups need the timestamp carried alongside. That is a real constraint and
worth stating before adopting it.

:::

#### 16a. Partitioning costs you a constraint, and it is the one from Step 6

This is the part worth catching before it bites in production. A unique index on a
partitioned table **must contain every partition key column** — Postgres can only enforce
uniqueness within a partition, because that is the only place the index exists.

So this, from Step 6, stops being legal the moment `rides` is partitioned by
`requested_at`:

```sql title="No longer possible once rides is partitioned"
CREATE UNIQUE INDEX one_live_ride_per_driver
    ON rides (driver_id)
    WHERE status IN ('accepted', 'arriving', 'in_progress');
```

Adding `requested_at` to it would make it legal and useless: it would permit one live ride
per driver *per month*, which is not the rule.

The guarantee has to move to a table that is not partitioned, and there is an obvious one.
A driver has at most one live ride, so that fact belongs on the driver:

```sql title="The guarantee, relocated" {7}
ALTER TABLE driver_profiles
    ADD COLUMN current_ride_id BIGINT;

CREATE UNIQUE INDEX one_live_ride_per_driver
    ON driver_profiles (current_ride_id)
    WHERE current_ride_id IS NOT NULL;
```

Set in the same transaction as the guarded `UPDATE` that wins the ride, cleared when the
ride ends. `driver_profiles` has one row per driver and is never partitioned, so the index
is small and the constraint holds globally.

It is worth noticing that this is the same structure as the `delivery_partners` table in
the previous question, arrived at from the opposite direction — there because a partner is
a resource to be claimed, here because partitioning took the constraint away from the table
it naturally belonged on.

---

### Step 17 — Sharding, and the airport run

**Interviewer:** And when one machine genuinely is not enough?

**Candidate:** Shard by region, for the same reason the previous question shards by city:
the transactional path is local. A rider in Bangalore is matched to a driver in Bangalore
and the trip happens in Bangalore.

Except when it does not, and the exception here is sharper than in food delivery.

**Interviewer:** The airport run.

**Candidate:** A driver picks up in Bangalore and drops at a city two hundred kilometres
away. In food delivery that essentially never happens — nobody delivers a biryani across a
state line. Here it is a daily, high-value trip.

The ride itself is fine: it is created in the requesting region and stays there, because a
ride belongs to the shard that created it and nothing about finishing elsewhere changes
that. The problem is the **driver**, who is now physically in a region whose supply index
does not contain them, and who wants a return fare rather than an empty two-hour drive.

That is primarily a matching-service concern — the supply index is cell-based and global,
so the driver simply appears in cells belonging to another region. But it leaves one
relational question: `driver_profiles.home_region_id` says where a driver belongs, and
rides in another region reference a driver record on a different shard.

:::decision

`users` and `driver_profiles` are global — replicated to every shard, not partitioned.
`rides` and everything hanging off them are sharded by region.

People are small, slow-changing and referenced everywhere; trips are enormous, immutable
once complete, and almost always read within their own region. That asymmetry is what makes
the split work.

*Cost:* writes to `users` go through a single primary and replicate outward, so a profile
edit is visible everywhere within replication lag. For a display name that is entirely
acceptable. It would not be for a balance.

*Cross-shard reads that remain:* a driver's earnings across regions, and a rider's history
if they travel. Both are scatter-gather over the two or three regions the person has
actually operated in, recorded in a small `user_regions` table so the fan-out is bounded
rather than global.

:::

---

### Step 18 — The final schema

```sql title="The complete schema"
CREATE TYPE ride_status   AS ENUM ('requested','accepted','arriving','in_progress',
                                   'completed','cancelled');
CREATE TYPE offer_outcome AS ENUM ('pending','accepted','declined','expired');
CREATE TYPE actor_type    AS ENUM ('rider','driver','system');
CREATE TYPE party_role    AS ENUM ('rider','driver');
CREATE TYPE vehicle_tier  AS ENUM ('go','xl','premier');
CREATE TYPE driver_status AS ENUM ('pending','active','suspended','deactivated');
CREATE TYPE fare_kind     AS ENUM ('base','distance','time','surge','toll','wait',
                                   'airport_fee','promo','tip','cancellation_fee',
                                   'adjustment');
CREATE TYPE earning_kind  AS ENUM ('fare_share','toll_reimbursement','incentive',
                                   'commission','adjustment');

CREATE TABLE regions (
    region_id INT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      TEXT NOT NULL,
    time_zone TEXT NOT NULL
);

CREATE TABLE users (
    user_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone        VARCHAR(16) NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    display_name TEXT        NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_phone_uniq ON users (phone) WHERE deleted_at IS NULL;

CREATE TABLE driver_profiles (
    user_id         BIGINT PRIMARY KEY REFERENCES users(user_id),
    licence_number  TEXT          NOT NULL,
    account_status  driver_status NOT NULL DEFAULT 'pending',
    home_region_id  INT           NOT NULL REFERENCES regions(region_id),
    rolling_rating  NUMERIC(3,2),          -- last 100 trips; see Step 12
    current_ride_id BIGINT,                -- the live-ride guarantee; see Step 16a
    onboarded_at    TIMESTAMPTZ,
    deactivated_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX one_live_ride_per_driver
    ON driver_profiles (current_ride_id) WHERE current_ride_id IS NOT NULL;

CREATE TABLE vehicles (
    vehicle_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT       NOT NULL REFERENCES users(user_id),
    plate_number  TEXT         NOT NULL,
    model         TEXT         NOT NULL,
    tier          vehicle_tier NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    retired_at    TIMESTAMPTZ
);

CREATE TABLE payment_methods (
    payment_method_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id           BIGINT      NOT NULL REFERENCES users(user_id),
    gateway           TEXT        NOT NULL,
    gateway_token     TEXT        NOT NULL,   -- never card data
    label             TEXT        NOT NULL,   -- "HDFC ••4821"
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at        TIMESTAMPTZ
);

CREATE TABLE rate_cards (
    rate_card_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    region_id      INT          NOT NULL REFERENCES regions(region_id),
    tier           vehicle_tier NOT NULL,
    base_fare      NUMERIC(14,2) NOT NULL,
    per_km         NUMERIC(14,2) NOT NULL,
    per_minute     NUMERIC(14,2) NOT NULL,
    minimum_fare   NUMERIC(14,2) NOT NULL,
    effective_from TIMESTAMPTZ  NOT NULL,
    effective_to   TIMESTAMPTZ
);

CREATE TABLE fare_quotes (
    quote_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rider_id         BIGINT        NOT NULL REFERENCES users(user_id),
    tier             vehicle_tier  NOT NULL,
    pickup           geography(Point, 4326) NOT NULL,
    dropoff          geography(Point, 4326) NOT NULL,
    rate_card_id     BIGINT        NOT NULL REFERENCES rate_cards(rate_card_id),
    surge_multiplier NUMERIC(4,2)  NOT NULL CHECK (surge_multiplier >= 1),
    estimated_amount NUMERIC(14,2) NOT NULL,
    quoted_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ   NOT NULL,
    CHECK (expires_at > quoted_at)
);

CREATE TABLE rides (
    ride_id           BIGINT GENERATED ALWAYS AS IDENTITY,
    region_id         INT           NOT NULL REFERENCES regions(region_id),
    rider_id          BIGINT        NOT NULL REFERENCES users(user_id),
    driver_id         BIGINT        REFERENCES users(user_id),
    vehicle_id        BIGINT        REFERENCES vehicles(vehicle_id),
    quote_id          BIGINT        REFERENCES fare_quotes(quote_id),
    payment_method_id BIGINT        REFERENCES payment_methods(payment_method_id),
    tier              vehicle_tier  NOT NULL,
    status            ride_status   NOT NULL DEFAULT 'requested',
    pickup            geography(Point, 4326) NOT NULL,
    dropoff           geography(Point, 4326) NOT NULL,
    requested_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    started_at        TIMESTAMPTZ,
    ended_at          TIMESTAMPTZ,
    distance_metres   INT           CHECK (distance_metres  >= 0),
    duration_seconds  INT           CHECK (duration_seconds >= 0),
    final_amount      NUMERIC(14,2),
    PRIMARY KEY (requested_at, ride_id)      -- partition key leads
) PARTITION BY RANGE (requested_at);

CREATE TABLE ride_routes (
    ride_id BIGINT PRIMARY KEY,
    route   geography(LineString, 4326) NOT NULL
);

CREATE TABLE ride_events (
    event_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ride_id     BIGINT      NOT NULL,
    status      ride_status NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor       actor_type  NOT NULL,
    actor_id    BIGINT,
    reason      TEXT
);
CREATE UNIQUE INDEX ride_events_once ON ride_events (ride_id, status);

CREATE TABLE ride_offers (
    ride_id      BIGINT        NOT NULL,
    driver_id    BIGINT        NOT NULL REFERENCES users(user_id),
    offered_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ   NOT NULL,
    outcome      offer_outcome NOT NULL DEFAULT 'pending',
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (ride_id, driver_id)
);
CREATE UNIQUE INDEX one_pending_offer_per_driver
    ON ride_offers (driver_id) WHERE outcome = 'pending';

CREATE TABLE fare_components (
    ride_id    BIGINT        NOT NULL,
    line_no    SMALLINT      NOT NULL,
    kind       fare_kind     NOT NULL,
    amount     NUMERIC(14,2) NOT NULL,
    note       TEXT,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (ride_id, line_no)
);

CREATE TABLE driver_earnings (
    ride_id    BIGINT        NOT NULL,
    line_no    SMALLINT      NOT NULL,
    kind       earning_kind  NOT NULL,
    amount     NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (ride_id, line_no)
);

CREATE TABLE ride_ratings (
    ride_id      BIGINT      NOT NULL,
    rater_role   party_role  NOT NULL,
    rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (ride_id, rater_role)
);
```

Thirteen tables. The three that most versions of this answer do not have —
`fare_quotes`, `fare_components` and `driver_earnings` — are the three that make a fare
dispute answerable, which is what the question actually asked for.

One thing in that listing is deliberate and easy to misread as an omission: the tables
hanging off `rides` no longer declare `REFERENCES rides(ride_id)`. They cannot. Once
`rides` is partitioned its primary key is `(requested_at, ride_id)`, and a foreign key must
reference a complete unique constraint — so pointing at `ride_id` alone is no longer
possible. The options are to carry `requested_at` into every child table and reference the
pair, which doubles the key width everywhere for a column nobody queries, or to drop the
declared constraint and enforce it in the write path.

I would take the second, and say so rather than letting it look accidental. This is the
honest cost of partitioning: **you trade declared referential integrity for index
locality.** It is usually the right trade on the largest table in a system, and it is
always worth naming out loud, because an interviewer who spots a missing foreign key and
is not told why will reasonably assume you forgot.

---

### Step 19 — The mental model

Strip away ride-hailing and what is left is a method that transfers:

1. **Ask the questions whose answers delete work.** Ruling out pooling removed an entire
   dimension from the ride, the fare and the route before anything was drawn.
2. **One identity, many roles.** When two entities share a login, a name and a rating, they
   are one table with an extension — not two tables that will drift.
3. **Store what was measured, not what can be recomputed.** Distance travelled is evidence.
   Recomputing it next week against a different traffic model produces a different number
   and destroys the only defence you had in a dispute.
4. **A promise is a row.** A quoted price has a value, a moment and an expiry, and most of
   them never become trips — which is itself the data the pricing team most wants.
5. **A total is a conclusion; the lines are the facts.** One `final_amount` column cannot be
   itemised, so a cancellation fee gets crammed into `base_fare` and every analytics query
   over that column silently breaks.
6. **Two parties, two ledgers.** What the rider is charged and what the driver is paid are
   different documents that share a trip. Collapsing them hides the margin and makes
   earnings unexplainable.
7. **The same race has different shapes.** Many claimants over many resources wants
   `SKIP LOCKED`; many claimants over one resource wants a guarded `UPDATE` where losing is
   the correct outcome. Know which one you have.
8. **Fast path and guarantee are different mechanisms.** The guarded update makes the common
   case one round trip; the partial unique index means the invariant survives the code being
   wrong.
9. **Ask the read-to-write ratio before choosing an index, not the technology.** The same
   PostGIS GiST index that was right for restaurants is wrong for drivers, because
   restaurants do not move.
10. **Partition before you shard.** The first problem with an enormous table is that its
    indexes stop fitting in memory, and that is solved on one machine.
