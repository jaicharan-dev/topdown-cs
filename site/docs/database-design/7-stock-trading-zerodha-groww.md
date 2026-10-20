---
id: 7-stock-trading-zerodha-groww
title: "Design Zerodha / Groww: Stock Trading & Ledger Accounting"
description: "A full schema-design interview for a broking platform, worked one decision at a time: why a balance column is not a ledger, why funds must be blocked before a trade rather than during it, why one order is not one trade, and why an average buy price cannot answer a tax question."
sidebar_position: 7
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

---

### How to read this page

The schema at the bottom of this page is not the answer. The answer is the order the
decisions were made in, and what each one cost.

> **If you are revising the night before**, read Steps 1, 4, 5, 7, 8 and 18, then the final
> schema in Step 17. That is the spine: scope it to the broker, discover that a balance
> column cannot be audited, replace it with a journal, discover that one order is not one
> trade, and discover that an average price cannot answer a tax question.
>
> **Say in the room** what Steps 1–8 cover — double-entry, blocked funds and lots is
> already a stronger answer than most. Steps 9–16 are depth for when an interviewer pushes
> on settlement, corporate actions or scale.

The previous three questions all allowed one liberty: when a derived value was expensive,
we cached it and defended the cache. [Splitwise](./4-expense-splitting-splitwise) cached
balances, [Swiggy](./5-food-delivery-swiggy-zomato) cached order status and ratings,
[Uber](./6-cab-booking-uber-ola) cached a rolling rating.

This domain withdraws that liberty. A broker has to answer, for any rupee, *where it came
from and where it went* — to the customer, to an auditor, and to a regulator, years later.
That is not a reporting requirement bolted on at the end; it decides the shape of the
schema on the first day. **You are not allowed to overwrite a number.**

So the spine here is: every movement is a pair of entries that sum to zero, balances are
*derived* from those entries, and the inevitable cached balance has to be something you can
**prove** rather than merely trust.

Conventions carried over: `BIGINT GENERATED ALWAYS AS IDENTITY` keys, `TIMESTAMPTZ`
everywhere, soft deletes for anything financial history references. Money is revisited in
Step 2, because this domain needs more than two decimal places.

---

### Step 1 — Scope: the broker, not the exchange

**Interviewer:** Design the database for a stock trading platform like Zerodha or Groww.
Users buy and sell stocks, prices move continuously, a wallet funds the trades, and the
portfolio shows holdings, average buy price and profit or loss. Execution must be atomic.

**Candidate:** The first question decides everything else: are we building the **exchange**
or the **broker**?

**Interviewer:** The broker. Assume the exchange matches orders.

**Candidate:** Good, and it is worth saying what that removes, because the two systems have
almost nothing in common.

An exchange maintains an order book — resting buy and sell orders sorted by price-time
priority, matched in microseconds. That is an in-memory data structure, not a database
table; no relational system can match at that latency, and the durable record is a sequenced
log replayed into memory on restart.

A broker does something entirely different. It takes customer intent, checks the customer
can afford it, routes it to the exchange, and then **records what came back** — which is a
bookkeeping problem, and bookkeeping is exactly what relational databases are for.

That reframing matters for a second reason. A broker does not get to decide what happened.
The exchange tells it, asynchronously, in fills that may arrive in pieces. Our schema's job
is to represent an outcome we did not control and cannot change.

Two more questions.

Partial fills — a limit order for 100 shares that fills 40 now and 60 later, possibly at
different prices?

**Interviewer:** Assume orders execute in full, to keep it focused.

**Candidate:** I will build that way, and I want to flag now that I expect it to break,
because partial fills are the normal case rather than an edge case. I will come back to it
in Step 7 rather than quietly designing around a simplification that does not survive
contact with a real exchange.

And settlement — do shares appear instantly, or on a settlement cycle?

**Interviewer:** What does it change?

**Candidate:** Whether "owning" is one state or two. Indian equity delivery settles on T+1:
buy today, and the shares reach your demat account tomorrow. Until then you own a claim,
not the asset, and whether you may sell it is a policy question with regulatory weight.
If the schema has a single `quantity` column, that distinction has nowhere to live.

---

### Step 2 — `instruments`, and why the symbol is not the key

**Interviewer:** Start with the instrument table. I would key it on the trading symbol —
`RELIANCE`, `TCS`. It reads well, and every market API you integrate with speaks it.

**Candidate:** It does read well, and I would argue against it for three separate reasons.
It is the most natural-looking choice on the page and it is a trap.

**Symbols are reused.** A ticker is a label on a listing, not a name for a company. When a
company is delisted, its symbol can be reassigned later to something unrelated. A primary
key that is reused silently re-points a decade of historical trades at the wrong company.

**Symbols change.** Companies rename and rebrand, and the exchange reissues the ticker. A
natural primary key that changes forces a cascading update across every table that
references it — on tables with billions of rows.

**The same company has several symbols.** Reliance trades on both NSE and BSE, with
different trading symbols and different prices at the same instant. "Which Reliance" is a
real question, and `stock_symbol` cannot express it.

**Interviewer:** So what would you key it on?

**Candidate:** A surrogate, with the real-world identity recorded as a constrained
attribute. The identifier that actually identifies a security is the **ISIN** — twelve
characters, globally unique, permanent for the life of the instrument.

```sql title="instruments and listings"
CREATE TABLE instruments (
    instrument_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    isin          CHAR(12)        NOT NULL UNIQUE,
    name          TEXT            NOT NULL,
    kind          instrument_kind NOT NULL,   -- equity, etf, bond, …
    face_value    NUMERIC(18,4),
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE listings (
    listing_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instrument_id  BIGINT      NOT NULL REFERENCES instruments(instrument_id),
    exchange       exchange_code NOT NULL,     -- NSE, BSE
    trading_symbol TEXT        NOT NULL,
    lot_size       INT         NOT NULL DEFAULT 1,
    listed_on      DATE        NOT NULL,
    delisted_on    DATE,
    UNIQUE (exchange, trading_symbol, listed_on)
);
```

The unique constraint includes `listed_on` deliberately: it permits the same symbol on the
same exchange at two different times, which is the reuse case, while forbidding two live
listings with the same ticker.

**Interviewer:** Why two tables rather than one with an exchange column?

**Candidate:** Because different things reference each of them, and the split is what lets
the schema represent buying on one exchange and selling on another.

Orders reference a `listing_id` — you place an order on a specific exchange. Holdings
reference an `instrument_id` — shares are fungible once they reach your demat account,
regardless of where you bought them. Collapse the two and a position becomes
exchange-bound, which is simply not how ownership works.

:::decision

Surrogate `instrument_id` keyed by ISIN, with exchange listings as a separate relation.

A primary key must be stable and unique forever. Trading symbols are neither.

*Cost:* one join to render a symbol on screen, and a lookup when an order arrives carrying
a ticker. Both are against a table of a few thousand rows that lives permanently in cache.

:::

#### 2a. Money, revisited

The earlier questions used `NUMERIC(14,2)`, because a dinner bill and a cab fare have two
decimal places. Here that is not enough.

- **Prices are not always two decimals.** Bond prices, mutual fund NAVs and many derivative
  quotes carry four. A schema that truncates them loses money on every unit.
- **Quantity × price needs headroom.** An institutional order can be large; the product of
  a big quantity and a four-decimal price overflows a width chosen for a restaurant bill.

:::decision

`NUMERIC(18,4)` for prices and per-unit values; `NUMERIC(18,2)` for cash amounts.

Prices carry the precision the instrument quotes in. Cash is settled in rupees and paise,
and rounding to paise is a **deliberate step** that happens once, where it can be seen,
rather than implicitly at each multiplication.

*Still never `FLOAT`.* Binary floating point cannot represent a tenth. In a system whose
entire output is a set of books that must balance, that is disqualifying — the full
argument is in Step 5 of the Splitwise question.

:::

---

### Step 3 — `orders`: intent, and the double-click

**Interviewer:** Next, orders. Do you need a table separate from trades at all?

**Candidate:** Yes, and keeping them apart is the decision the rest of this schema rests
on. An order is **intent**; a trade is **outcome**.

Intent can sit unfilled for days, be cancelled, be rejected by a risk check, or expire at
the close — and in every one of those cases there is an order and no trade whatsoever. A
table that only exists once something executed cannot represent the resting limit order,
which is the main reason a broker needs a database at all.

```sql title="orders"
CREATE TABLE orders (
    order_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT        NOT NULL REFERENCES users(user_id),
    listing_id      BIGINT        NOT NULL REFERENCES listings(listing_id),
    side            order_side    NOT NULL,          -- buy | sell
    order_type      order_type    NOT NULL,          -- market | limit
    limit_price     NUMERIC(18,4),
    quantity        BIGINT        NOT NULL CHECK (quantity > 0),
    status          order_status  NOT NULL DEFAULT 'pending',
    client_order_id TEXT          NOT NULL,
    placed_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CHECK ((order_type = 'limit') = (limit_price IS NOT NULL))
);

CREATE UNIQUE INDEX orders_idempotency
    ON orders (user_id, client_order_id);
```

**Interviewer:** Anything in there that is not obvious?

**Candidate:** Two things, both of which look like detail and are not.

**The `CHECK` ties the type to the price.** A limit order without a price and a market order
with one are both nonsense, and the constraint makes both unrepresentable. Writing it as an
equality between two booleans says "these are true together or false together" in one line,
which is clearer than two implications.

**`client_order_id` is idempotency, and it is the right fix for the double-click.**

**Interviewer:** I would have handled the double-click by locking the wallet row.

**Candidate:** That is the usual answer, and it solves a different problem from the one the
user actually experiences. A lock on the wallet does prevent a negative balance — but look
at what it still permits: the user taps twice, two orders
are created, the first passes the balance check, and the second is *correctly* rejected for
insufficient funds. The user, who meant to buy once, sees a rejection they do not
understand, and the books now contain a spurious rejected order.

The lock protects the money. It does not prevent the duplicate. The client generating an id
per button press, with a unique index behind it, means the second request collides and the
server returns the original order. One tap, one order, one outcome, regardless of how many
times the request was sent or retried by a flaky mobile network.

:::decision

A client-supplied idempotency key with a unique index, *in addition to* concurrency control
on funds.

They solve different problems. Idempotency ensures one intent becomes one order;
concurrency control ensures the money is not spent twice. Neither substitutes for the
other.

:::

---

### Step 4 — Break #1: a `balance` column is not a ledger

:::broke

`wallets.balance` can tell a user what they have. It can never tell them why — and in this
domain "why" is a legal requirement, not a feature.

:::

**Interviewer:** The user's cash balance is ₹4,312.50 and they want to know why.

**Candidate:** With a `balance` column I cannot tell them. The column holds a number that
has been overwritten several thousand times, and every previous value is gone.

**Interviewer:** You have a `trades` table. Derive it from there.

**Candidate:** Only if every rupee movement is a trade, and most are not. Deposits,
withdrawals, brokerage, exchange transaction charges, STT, stamp duty, GST on brokerage,
dividend credits, a goodwill reversal by support, the auto-sweep into a liquid fund — each
is money moving, and none is a trade. They would each need their own table and their own
column on the wallet, and the sum of all of them would still have to equal the balance by
coincidence rather than by construction.

This is the problem accounting solved several centuries ago, and the solution is the one
thing this schema cannot do without.

**Every movement of value is recorded twice: once where it came from, once where it went,
with the two summing to zero.**

```sql title="Accounts, journal entries, journal lines"
CREATE TABLE accounts (
    account_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT      REFERENCES users(user_id),  -- NULL for broker accounts
    kind         account_kind NOT NULL,   -- cash_available, cash_blocked,
                                          -- brokerage_income, taxes_payable,
                                          -- exchange_settlement, suspense
    currency     CHAR(3)      NOT NULL DEFAULT 'INR',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (owner_user_id, kind, currency)
);

CREATE TABLE journal_entries (
    entry_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason       entry_reason NOT NULL,   -- deposit, order_block, trade_settlement,
                                          -- brokerage, tax, dividend, reversal
    order_id     BIGINT,
    trade_id     BIGINT,
    narration    TEXT        NOT NULL
);

CREATE TABLE journal_lines (
    entry_id   BIGINT        NOT NULL REFERENCES journal_entries(entry_id),
    line_no    SMALLINT      NOT NULL,
    account_id BIGINT        NOT NULL REFERENCES accounts(account_id),
    amount     NUMERIC(18,2) NOT NULL CHECK (amount <> 0),  -- signed
    PRIMARY KEY (entry_id, line_no)
);
```

The invariant that makes it a ledger rather than a log is that **each entry's lines sum to
zero**:

```sql title="The rule that makes it double-entry" {5}
CREATE OR REPLACE FUNCTION assert_entry_balances() RETURNS TRIGGER AS $fn$
DECLARE total NUMERIC(18,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total
      FROM journal_lines WHERE entry_id = NEW.entry_id;
    IF total <> 0 THEN
        RAISE EXCEPTION 'journal entry % does not balance: %', NEW.entry_id, total;
    END IF;
    RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER journal_balances
    AFTER INSERT ON journal_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION assert_entry_balances();
```

`DEFERRABLE INITIALLY DEFERRED` is load-bearing. The lines of an entry are inserted one at
a time, and after the first one the entry does not balance. Checking immediately would
reject every entry ever written; checking at commit asks the only question that matters —
*did this transaction leave the books balanced?*

:::decision

A double-entry journal as the source of truth for all value; no mutable balance column.

A balance becomes `SUM(amount)` over an account's lines — derived, explainable line by
line, and impossible to disagree with its own history.

*Cost:* two or more rows per movement instead of one update, and a balance that is a
`SUM` rather than a read. Step 11 addresses the second; the first is the price of being
auditable and is not negotiable in this domain.

*The property you are buying:* at any instant, `SUM(amount)` across **every** line in the
system is zero. One query proves the entire platform's books balance. No schema built on
mutable balance columns can offer that at any price.

:::

---

### Step 5 — What double-entry actually buys you

**Interviewer:** Make that concrete. A user buys 10 shares at ₹2,500 with ₹18 of charges.

**Candidate:** One entry, four lines, summing to zero:

| account | amount |
|---|---|
| user cash (available) | −25,018.00 |
| exchange settlement | +25,000.00 |
| brokerage income | +15.00 |
| taxes payable | +3.00 |

Read it in either direction. The user's cash fell by ₹25,018. That money went to three
places, and they add up exactly. Nothing can be moved without something receiving it,
because the trigger will not allow the transaction to commit.

Now the questions that were impossible a page ago:

- *Why is my balance what it is?* — select this user's lines, newest first. Every one has a
  reason and a narration.
- *How much brokerage did we earn in March?* — sum the brokerage income account over a date
  range. Not an estimate from trades; the actual recorded revenue.
- *Did we lose a rupee anywhere last night?* — sum every line in the system. If it is not
  exactly zero, something is broken, and the entry that fails to balance names itself.

That last one is the real prize. A reconciliation that is **structural** rather than
procedural. In a schema with balance columns, "do the books balance" is a question you
answer by writing a careful script and hoping it covers every table. Here it is one
aggregate over one column, and it cannot be out of date.

---

### Step 6 — Break #2: the money has to be blocked before the trade

:::broke

A limit order can rest for days before it fills. Checking the balance only at execution lets
the same rupee be committed to several orders at once.

:::

**Interviewer:** A user with ₹50,000 places three limit orders, each for ₹40,000 of stock.
All three rest below the market. What happens?

**Candidate:** With a balance checked at execution, all three are accepted — none has spent
anything yet. Then the market moves and two of them fill. The second fill has no money
behind it, and the broker has just extended credit it never agreed to. In a margin product
that is a regulatory problem, not a bug.

Funds must be committed when the order is **placed**, not when it fills. The usual
implementation is a `reserved_amount` column alongside the balance — and the ledger gives
us something much better, with no new mechanism at all.

A block is just a movement between two accounts the user already has:

```sql title="Placing a buy limit order — an entry like any other"
-- entry: reason = 'order_block', order_id = 1234
--   user cash_available   −40,000.00
--   user cash_blocked     +40,000.00
```

It balances. It is auditable. It appears in the user's statement as "blocked for order
#1234", which is exactly what they want to see when they wonder where their money went.
Cancelling the order is the same entry reversed; filling it moves the money out of
`cash_blocked` to the exchange, and returns any unused remainder to `cash_available`.

**Interviewer:** Unused remainder?

**Candidate:** A buy limit at ₹2,500 blocks ₹2,500 per share, but the exchange may fill at
₹2,480 — price improvement is real and it is always in the customer's favour on a limit
order. The difference goes back. Without a blocked-funds account that money has nowhere to
return *from*, and it quietly stays spent.

So **available balance** — the number that decides whether an order may be placed — is the
`cash_available` account's balance, and `cash_blocked` is visible separately. Two numbers,
both derived, both explainable, and the invariant that neither may go negative is a single
rule applied to accounts rather than a special case for wallets.

:::decision

Blocked funds as a second account per user, moved by ordinary journal entries.

No new table, no new column, no new concurrency story. A reservation is a movement of value,
and this schema already knows how to record one of those correctly.

*Cost:* two accounts per user instead of one, and every order placement writes an entry.
Entries are cheap appends, and the alternative — a `reserved` column — reintroduces exactly
the mutable, unexplainable number Step 4 removed.

:::

---

### Step 7 — Break #3: one order is not one trade

:::broke

Step 1 assumed an order executes in full. Real exchanges fill in pieces, at different
prices, over an unbounded period, and a one-to-one order-to-trade mapping cannot represent
it.

:::

**Interviewer:** A limit order for 100 shares fills 40 at ₹2,500, then 35 at ₹2,499, then
25 at ₹2,498.

**Candidate:** Three fills, three prices, one order. The simplification from Step 1 is now
actively harmful: `execution_price` on the order is a single column that no single number
can correctly occupy.

The relationship is one-to-many, and each fill is its own immutable fact:

```sql title="trades — one row per fill" {4,9}
CREATE TABLE trades (
    trade_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id        BIGINT        NOT NULL REFERENCES orders(order_id),
    user_id         BIGINT        NOT NULL,   -- denormalised; see below
    instrument_id   BIGINT        NOT NULL,   -- denormalised; see below
    side            order_side    NOT NULL,
    quantity        BIGINT        NOT NULL CHECK (quantity > 0),
    price           NUMERIC(18,4) NOT NULL CHECK (price > 0),
    exchange_trade_id TEXT        NOT NULL,
    executed_at     TIMESTAMPTZ   NOT NULL,
    UNIQUE (exchange_trade_id)
);
```

`UNIQUE (exchange_trade_id)` is the important one and it is easy to miss. Fills arrive from
the exchange over a connection that drops and replays. Without that constraint, a replayed
message books the same fill twice: the user is charged twice and receives shares twice, and
the error is discovered at settlement when the numbers do not match the depository. The
exchange's own identifier for the fill is the natural idempotency key, and the database
should refuse the duplicate rather than trusting the consumer to notice.

The order then carries progress rather than an outcome:

```sql title="The order tracks how much of it is done"
ALTER TABLE orders
    ADD COLUMN filled_quantity BIGINT NOT NULL DEFAULT 0
        CHECK (filled_quantity >= 0),
    ADD CHECK (filled_quantity <= quantity);
```

`status` becomes `pending`, `partially_filled`, `filled`, `cancelled`, `rejected` — and
`partially_filled` is a state a cancelled order can also have been in, which is why the
filled quantity is a number rather than something inferred from the status.

**On the two denormalised columns.** `user_id` and `instrument_id` are derivable by joining
through `orders` and `listings`. They are copied onto `trades` anyway, and the earlier draft
justified this by join cost. That is true but it is the weaker half of the argument.

The stronger half: `trades` is the **immutable record**, and a record that depends on a
join to a mutable table is not immutable. `orders` can be amended; a listing can be
reassigned. The tax statement for 2019 must read the same in 2031, and it does so only if
every fact it needs is on the row itself.

Which is the same principle as the receipt in the Swiggy question and the measured distance
in the Uber one, arriving a third time: **a historical record has to be readable without
consulting anything that is still being edited.**

---

### Step 8 — Lots, because an average cannot answer a tax question

**Interviewer:** The requirement says show the average buy price. You have what you need.

**Candidate:** For *displaying* unrealised profit, yes — a weighted average is exactly
right, and the earlier draft's arithmetic was correct: buy 10 at ₹100 and 5 at ₹130, and
the running average is ₹110.

But the moment the user **sells**, the average cannot answer the question that actually
matters, and the question is a legal one.

**Interviewer:** Which is?

**Candidate:** *Which shares did they sell?*

Capital gains on Indian equity delivery are computed **FIFO** — first in, first out — and
the holding period decides the tax rate. Shares held more than twelve months are taxed as
long-term, below that as short-term, at a materially different rate.

So consider a user who bought 10 shares in 2019 at ₹100, and 5 shares last month at ₹130.
They sell 10 today at ₹200. With a single `average_buy_price` of ₹110, the computed gain is
`(200 − 110) × 10 = ₹900`, as one undifferentiated number with no acquisition date.

The correct answer is that they sold the 2019 lot: a gain of `(200 − 100) × 10 = ₹1,000`,
all of it long-term. Different number, different tax rate, and the schema cannot produce it
because the moment the average was computed, the acquisition dates were thrown away.

A weighted average is a **derivation**, and Step 4's lesson applies again: we stored the
derivation and lost the facts.

```sql title="holding_lots — one row per acquisition"
CREATE TABLE holding_lots (
    lot_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT        NOT NULL REFERENCES users(user_id),
    instrument_id  BIGINT        NOT NULL REFERENCES instruments(instrument_id),
    buy_trade_id   BIGINT        NOT NULL REFERENCES trades(trade_id),
    acquired_on    DATE          NOT NULL,
    cost_per_share NUMERIC(18,4) NOT NULL CHECK (cost_per_share >= 0),
    quantity_total BIGINT        NOT NULL CHECK (quantity_total > 0),
    quantity_open  BIGINT        NOT NULL CHECK (quantity_open >= 0),
    settled_on     DATE,
    CHECK (quantity_open <= quantity_total)
);

CREATE TABLE lot_consumptions (
    sell_trade_id  BIGINT        NOT NULL REFERENCES trades(trade_id),
    lot_id         BIGINT        NOT NULL REFERENCES holding_lots(lot_id),
    quantity       BIGINT        NOT NULL CHECK (quantity > 0),
    cost_per_share NUMERIC(18,4) NOT NULL,   -- snapshot of the lot's cost
    proceeds_per_share NUMERIC(18,4) NOT NULL,
    PRIMARY KEY (sell_trade_id, lot_id)
);
```

A sale walks the open lots oldest-first, consuming them, and writes one `lot_consumptions`
row per lot it touches. Realised gain is then a sum over those rows, each carrying its own
acquisition date and therefore its own tax treatment — and it is *auditable*, because the
rows say precisely which purchase funded which sale.

:::decision

Lots as the stored fact; average buy price as a derived display value.

FIFO is a legal requirement in this jurisdiction, and FIFO is unimplementable without
acquisition dates. Storing only the average destroys them irreversibly on the first buy.

*Cost:* one row per buy fill rather than one per holding, so the table grows with activity
instead of with portfolio size. For a retail broker that is still small, and it is the only
representation that can produce a defensible tax statement.

*Would change if:* the jurisdiction mandated average-cost basis, as some do. Then the
average is the legally correct answer — but lots still reconstruct it, while the reverse is
impossible. Keeping lots costs little and preserves the option.

*Note:* `quantity_open` is a maintained counter rather than a derivation from
`lot_consumptions`, because lot selection runs inside the trade-booking transaction and
needs an indexed predicate to find open lots. It is reconciled nightly against the
consumption rows.

:::

---

<details>
<summary><b>Schema checkpoint — everything as it stands after Step 8</b></summary>

```sql
instruments      (instrument_id PK, isin UNIQUE, name, kind, face_value)
listings         (listing_id PK, instrument_id FK, exchange, trading_symbol,
                  lot_size, listed_on, delisted_on)

users            (user_id PK, phone, display_name, created_at, deleted_at)

accounts         (account_id PK, owner_user_id FK, kind, currency,
                  UNIQUE (owner_user_id, kind, currency))
journal_entries  (entry_id PK, occurred_at, reason, order_id, trade_id, narration)
journal_lines    (entry_id FK, line_no, account_id FK, amount signed,
                  PK (entry_id, line_no))
                 -- deferred constraint trigger: lines of an entry sum to zero

orders           (order_id PK, user_id FK, listing_id FK, side, order_type,
                  limit_price, quantity, filled_quantity, status,
                  client_order_id, placed_at,
                  UNIQUE (user_id, client_order_id))

trades           (trade_id PK, order_id FK, user_id, instrument_id, side,
                  quantity, price, exchange_trade_id UNIQUE, executed_at)

holding_lots     (lot_id PK, user_id FK, instrument_id FK, buy_trade_id FK,
                  acquired_on, cost_per_share, quantity_total, quantity_open,
                  settled_on)
lot_consumptions (sell_trade_id FK, lot_id FK, quantity, cost_per_share,
                  proceeds_per_share, PK (sell_trade_id, lot_id))
```

Note what is **not** here: no `wallets.balance`, no `holdings.average_buy_price`. Both were
in the first draft, and both were derivations stored in place of the facts that produce
them.

</details>

---

### Step 9 — Settlement: what you own and what you can sell

**Interviewer:** Back to T+1.

**Candidate:** Buy today and the shares credit to the demat account tomorrow. Until then
the customer has an entitlement, not the asset. The lot already has the column for it —
`settled_on`, null until the settlement file confirms it.

That makes two different quantities, and conflating them is a real operational failure:

```sql title="Owned versus deliverable"
-- everything the customer owns, settled or not
SELECT SUM(quantity_open) FROM holding_lots
 WHERE user_id = $1 AND instrument_id = $2;

-- what can be delivered against a sale today
SELECT SUM(quantity_open) FROM holding_lots
 WHERE user_id = $1 AND instrument_id = $2
   AND settled_on IS NOT NULL;
```

Selling unsettled stock is **buy-today-sell-tomorrow**, and whether it is permitted is a
policy that varies by broker, segment and regulation. The schema's job is not to encode the
policy — it is to make the distinction *representable*, so the risk layer has something to
check. A single `holdings.quantity` column cannot express it, and a broker that cannot
express it eventually delivers shares it does not have, which is a settlement failure with
a penalty attached.

This is the same division as the fee policy in the Uber question: **the rule lives in
application code; the facts the rule needs live in the database.**

---

### Step 10 — Corporate actions, and why lots pay for themselves again

**Interviewer:** A company declares a 1:5 stock split.

**Candidate:** Every holder's quantity multiplies by five and each share's cost basis
divides by five. The position's value is unchanged; its representation is not.

A corporate action is itself a fact that must be recorded, not a migration someone runs:

```sql title="corporate_actions"
CREATE TABLE corporate_actions (
    action_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instrument_id BIGINT       NOT NULL REFERENCES instruments(instrument_id),
    kind          action_kind  NOT NULL,   -- split, bonus, dividend, merger
    ex_date       DATE         NOT NULL,
    ratio_from    INT,                     -- 1:5 split → from 1, to 5
    ratio_to      INT,
    amount_per_share NUMERIC(18,4),        -- for dividends
    applied_at    TIMESTAMPTZ
);
```

Applying a split rewrites the open lots — and here is the point. **The acquisition dates
survive.** A share acquired in 2019 and split in 2026 is still long-term; the holding period
runs from the original purchase, not from the split. With lots, the adjustment is an update
to `quantity_total`, `quantity_open` and `cost_per_share`, leaving `acquired_on` untouched,
and FIFO continues to work.

With a single `average_buy_price`, you can divide the number and get a plausible-looking
result — and you have no way to compute the holding period for the shares you later sell,
because the schema never knew it.

Dividends need no lot changes at all. They are a cash movement, which means they are a
journal entry — user cash up, dividend income up, TDS to taxes payable — and the ledger
already handles them with no new mechanism. That is what a good core abstraction feels
like: the fourth unanticipated requirement arrives and costs nothing.

---

### Step 11 — The balance cache, made provable

**Interviewer:** You have made every balance a `SUM` over a billion-row table. The
dashboard will be unusable.

**Candidate:** Correct, and this is the one place the ledger needs help. But the cache is
built differently from the ones in the earlier questions, because here it has to be
*provable* rather than merely reconciled.

```sql title="account_balances"
CREATE TABLE account_balances (
    account_id     BIGINT PRIMARY KEY REFERENCES accounts(account_id),
    balance        NUMERIC(18,2) NOT NULL DEFAULT 0,
    last_entry_id  BIGINT        NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CHECK (balance >= 0)
);
```

Updated in the same transaction as the journal lines — never by a job, never
asynchronously. If the transaction commits, both are true; if it aborts, neither is.

Three things make this different from a plain cached number.

**`CHECK (balance >= 0)`** turns "a customer may not go overdrawn" into a database rule. It
is the backstop behind every application check, and unlike the application it cannot be
bypassed by a new code path.

**`last_entry_id`** makes verification incremental. The nightly reconciliation does not sum
a billion rows; it sums the lines added since each account's watermark and compares. The
proof is cheap enough to run continuously rather than monthly.

**The journal remains the truth.** If the cache and the sum ever disagree, the cache is
wrong by definition and is rebuilt from the journal. There is never an argument about which
one is right — a question that, in a system of mutable balances, has no answer at all.

:::decision

A materialised balance per account, written in the same transaction as the lines, with a
non-negative `CHECK` and a watermark for incremental proof.

*Contrast with the earlier questions, deliberately:* Swiggy's cached rating and Splitwise's
cached balances were reconciled by a job and a mismatch was a bug to investigate. Here a
mismatch is **impossible to leave undetected**, because the authoritative value is still
derivable at any moment and the comparison is cheap.

*Cost:* the balance row is a contention point — every movement on an account updates it.
Which is the next step, and it turns out to be exactly what we want.

:::

---

### Step 12 — The one place to take a lock, and a myth about `SERIALIZABLE`

**Interviewer:** Two trades settle against the same account at once. What stops a lost
update?

**Candidate:** The balance row, and the primitive is the same guarded `UPDATE` used
throughout these questions:

```sql title="Debit, with the check built in" {4}
UPDATE account_balances
   SET balance       = balance - $2,
       last_entry_id = $3
 WHERE account_id    = $1
   AND balance      >= $2          -- the guard
RETURNING balance;
```

Zero rows means insufficient funds, atomically, with no read-then-write window. Concurrent
debits serialise on the row lock the `UPDATE` takes, each sees the previous one's committed
value, and the `CHECK` constraint stands behind both.

**Interviewer:** The earlier version of this answer used `SELECT … FOR UPDATE`. Is that
wrong?

**Candidate:** Not wrong, and it is necessary when you must *read* a value, compute
something non-trivial, and then write — explicit locking is the right tool for that. For a
simple debit the guarded update is one statement instead of two and expresses the rule in
the predicate.

What I would push back on is the *reason* that draft gave for rejecting `SERIALIZABLE`. It
said serialisable isolation forces transactions to run sequentially and would make the
platform painfully slow. That is a widespread misconception and worth correcting.

Postgres implements `SERIALIZABLE` as **Serialisable Snapshot Isolation** — an optimistic
scheme. Transactions run concurrently, at full speed, with no extra blocking. The database
tracks read/write dependencies between them and, when it detects a cycle that could produce
a non-serialisable outcome, **aborts one of them** with a serialisation failure. Nothing
queues; it is not two-phase locking and it is not single-threaded.

So the real cost of `SERIALIZABLE` is not latency — it is that **every transaction needs a
retry loop**, because any of them can fail at commit through no fault of its own. That is an
application-architecture cost, and a very reasonable thing to decline. But decline it for
the right reason, because "serialisable means serial" leads people to reject it in systems
where it would have been both correct and cheap.

:::decision

`READ COMMITTED` with guarded updates on the balance row, plus `CHECK (balance >= 0)`.

The invariants here are single-row and expressible as predicates, which is exactly where
guarded updates are strongest and where `SERIALIZABLE` buys nothing.

*Would change if:* an invariant spanned rows in a way a predicate cannot express — a
portfolio-level margin rule reading many positions to decide one write. That is the shape
`SERIALIZABLE` exists for, and the retry loop is what it costs.

:::

---

### Step 13 — Live prices do not belong here

**Interviewer:** The portfolio shows current value. Where does the price come from?

**Candidate:** Not from a `current_price` column on the instrument, which is what the first
draft had.

At market open, thousands of instruments tick several times a second. Writing those into
Postgres is the same failure as driver locations in the Uber question, for the same
mechanical reason: every `UPDATE` writes a new row version and marks the old one dead, so
sustained high-frequency updates bloat the table and its indexes faster than autovacuum can
reclaim them, and the degradation lands on every other query sharing the instance.

And the data does not want to be there. A price from four seconds ago is worthless, nobody
audits a tick, and losing the entire set costs one refresh.

:::decision

Live prices stream from the exchange feed to clients over WebSockets, with the latest tick
cached in memory. Postgres holds only the **official daily close**, which is a fact.

Closing prices are written once per instrument per day, are referenced by statements and
tax reports, and must be reproducible years later. That is a database row. A tick is not.

*What this costs:* the portfolio screen is assembled by the application from a database
read for positions and a cache read for prices, rather than by one join. That is the right
boundary — one side is a system of record, the other is a system of now.

:::

```sql title="Closing prices — a fact worth storing"
CREATE TABLE daily_closes (
    instrument_id BIGINT        NOT NULL REFERENCES instruments(instrument_id),
    trade_date    DATE          NOT NULL,
    close_price   NUMERIC(18,4) NOT NULL,
    PRIMARY KEY (instrument_id, trade_date)
);
```

---

### Step 14 — P&L: realised and unrealised are different questions

**Interviewer:** Last thing on the dashboard — total profit and loss.

**Candidate:** There are two questions hiding in that phrase, with different sources,
different audiences, and very different consequences for getting them wrong. Answering both
with one query — which is what the first draft of this answer did — conflates a display
number with a tax number.

**Unrealised** — what the open position would make if sold now. Needs a live price, so it
is assembled outside the database:

```sql title="Open positions and their cost basis"
SELECT instrument_id,
       SUM(quantity_open)                        AS quantity,
       SUM(quantity_open * cost_per_share)       AS cost_basis
  FROM holding_lots
 WHERE user_id = $1 AND quantity_open > 0
 GROUP BY instrument_id;
```

The application multiplies by the live price. The database is not asked for a number it
cannot know.

**Realised** — what was actually made on sales, which is the number the tax authority wants.
It comes from the consumption rows, and it is fully derivable because each one records both
sides:

```sql title="Realised gains, split by holding period" {6,7}
SELECT CASE WHEN t.executed_at::date - l.acquired_on > 365
            THEN 'long_term' ELSE 'short_term' END           AS treatment,
       SUM(c.quantity * (c.proceeds_per_share - c.cost_per_share)) AS realised_gain
  FROM lot_consumptions c
  JOIN trades       t ON t.trade_id = c.sell_trade_id
  JOIN holding_lots l ON l.lot_id   = c.lot_id
 WHERE t.user_id = $1
   AND t.executed_at >= $2
 GROUP BY 1;
```

**Interviewer:** And if I had kept an average buy price instead of lots?

**Candidate:** Then that query is not merely harder, it is *impossible*. The `CASE` on
holding period needs an acquisition date per parcel of shares, and a weighted average
destroyed that at write time. No index and no rewrite recovers it. The only repair is to
replay every trade the customer has ever made and rebuild the lots retrospectively — a
project, not a query, and one that runs while the tax deadline approaches.

---

### Step 15 — Indexing, derived from the queries

```sql title="Q1 — the portfolio screen"
CREATE INDEX lots_open_by_user
    ON holding_lots (user_id, instrument_id)
    WHERE quantity_open > 0;
```

Partial, and it matters more here than anywhere else on this page. A ten-year-old account
has thousands of fully-consumed lots and perhaps forty open ones. The partial index holds
only the forty, and a lot leaves the index the moment it is exhausted.

```sql title="Q2 — FIFO lot selection, inside the trade transaction"
CREATE INDEX lots_fifo
    ON holding_lots (user_id, instrument_id, acquired_on)
    WHERE quantity_open > 0;
```

This runs while booking a trade, so it is on the latency-critical path. Equality columns
first, the ordering column last, so the oldest open lot is the first row read.

```sql title="Q3 — the account statement"
CREATE INDEX journal_lines_by_account
    ON journal_lines (account_id, entry_id DESC);
```

Statements are paginated by keyset on `entry_id`, not `OFFSET` — the same reasoning as the
order history in the Swiggy question.

```sql title="Q4 — the limit-order sweep"
CREATE INDEX orders_restable
    ON orders (listing_id, side, limit_price)
    WHERE status IN ('pending', 'partially_filled');
```

Equality columns before the range column — reverse them and the index cannot serve the
query. Partial, because filled and cancelled orders are the overwhelming majority of the
table and no sweep ever wants them.

```sql title="Q5 — the tax statement"
CREATE INDEX trades_by_user_time ON trades (user_id, executed_at DESC);
```

One thing worth saying about what is **absent**: there is no index on
`journal_lines (entry_id)`, because the primary key is `(entry_id, line_no)` and `entry_id`
is already its leftmost column. Adding it would duplicate an existing structure. Reaching
for an index on every foreign key is a habit worth examining — though the inverse mistake is
just as common, and Postgres genuinely does **not** index foreign keys for you, so
`trades (order_id)` does need one.

---

### Step 16 — Partitioning the journal

`journal_lines` and `trades` grow forever and are never updated. Regulation requires them
to remain queryable for years, so deletion is not available.

Range partitioning by month, for the reason set out in the Uber question: the first problem
with an enormous table is not disk, it is that its **indexes stop fitting in memory**.

```sql title="Partition the two tables that only grow"
CREATE TABLE journal_lines (
    entry_id   BIGINT        NOT NULL,
    line_no    SMALLINT      NOT NULL,
    account_id BIGINT        NOT NULL,
    amount     NUMERIC(18,2) NOT NULL CHECK (amount <> 0),
    booked_on  DATE          NOT NULL,
    PRIMARY KEY (booked_on, entry_id, line_no)
) PARTITION BY RANGE (booked_on);
```

`booked_on` is denormalised onto the line from its entry specifically so it can be the
partition key — the partition key must be in the primary key, and partitioning on a column
reachable only by a join is not possible.

Two consequences worth stating rather than discovering later, both the same ones the Uber
question ran into:

- **Foreign keys into a partitioned table are no longer declarable**, because a foreign key
  must reference a complete unique constraint and the primary key now leads with the date.
  Referential integrity moves into the write path.
- **The deferred balance trigger must stay correct across partitions.** It queries by
  `entry_id`, which no longer leads the key, so it needs its own index — or, better, the
  entries of one transaction all carry the same `booked_on` and the trigger passes it,
  letting partition pruning do the work.

:::decision

Partition by month on a denormalised `booked_on`; keep every partition online.

Financial records must stay queryable, so this is about index locality rather than
archival. Old partitions can move to cheaper storage while remaining attached.

*Cost:* declared foreign keys on the largest tables, and a date carried onto every line.
Both are the standard price of partitioning and both are worth naming before adopting it.

:::

---

### Step 17 — The final schema

```sql title="The complete schema"
CREATE TYPE instrument_kind AS ENUM ('equity','etf','bond','mutual_fund');
CREATE TYPE exchange_code   AS ENUM ('NSE','BSE');
CREATE TYPE order_side      AS ENUM ('buy','sell');
CREATE TYPE order_type      AS ENUM ('market','limit');
CREATE TYPE order_status    AS ENUM ('pending','partially_filled','filled',
                                     'cancelled','rejected');
CREATE TYPE account_kind    AS ENUM ('cash_available','cash_blocked',
                                     'brokerage_income','taxes_payable',
                                     'exchange_settlement','dividend_income',
                                     'suspense');
CREATE TYPE entry_reason    AS ENUM ('deposit','withdrawal','order_block',
                                     'order_release','trade_settlement',
                                     'brokerage','tax','dividend','reversal');
CREATE TYPE action_kind     AS ENUM ('split','bonus','dividend','merger');

CREATE TABLE users (
    user_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone        VARCHAR(16) NOT NULL,
    display_name TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE instruments (
    instrument_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    isin          CHAR(12)        NOT NULL UNIQUE,
    name          TEXT            NOT NULL,
    kind          instrument_kind NOT NULL,
    face_value    NUMERIC(18,4),
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE listings (
    listing_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instrument_id  BIGINT        NOT NULL REFERENCES instruments(instrument_id),
    exchange       exchange_code NOT NULL,
    trading_symbol TEXT          NOT NULL,
    lot_size       INT           NOT NULL DEFAULT 1,
    listed_on      DATE          NOT NULL,
    delisted_on    DATE,
    UNIQUE (exchange, trading_symbol, listed_on)
);

CREATE TABLE daily_closes (
    instrument_id BIGINT        NOT NULL REFERENCES instruments(instrument_id),
    trade_date    DATE          NOT NULL,
    close_price   NUMERIC(18,4) NOT NULL,
    PRIMARY KEY (instrument_id, trade_date)
);

-- ---------- the ledger ----------

CREATE TABLE accounts (
    account_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT       REFERENCES users(user_id),
    kind          account_kind NOT NULL,
    currency      CHAR(3)      NOT NULL DEFAULT 'INR',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (owner_user_id, kind, currency)
);

CREATE TABLE account_balances (
    account_id    BIGINT PRIMARY KEY REFERENCES accounts(account_id),
    balance       NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    last_entry_id BIGINT        NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE journal_entries (
    entry_id    BIGINT GENERATED ALWAYS AS IDENTITY,
    booked_on   DATE         NOT NULL,
    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reason      entry_reason NOT NULL,
    order_id    BIGINT,
    trade_id    BIGINT,
    narration   TEXT         NOT NULL,
    PRIMARY KEY (booked_on, entry_id)
) PARTITION BY RANGE (booked_on);

CREATE TABLE journal_lines (
    entry_id   BIGINT        NOT NULL,
    line_no    SMALLINT      NOT NULL,
    booked_on  DATE          NOT NULL,
    account_id BIGINT        NOT NULL,
    amount     NUMERIC(18,2) NOT NULL CHECK (amount <> 0),
    PRIMARY KEY (booked_on, entry_id, line_no)
) PARTITION BY RANGE (booked_on);
-- deferred constraint trigger: the lines of one entry sum to zero

-- ---------- intent and execution ----------

CREATE TABLE orders (
    order_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT        NOT NULL REFERENCES users(user_id),
    listing_id      BIGINT        NOT NULL REFERENCES listings(listing_id),
    side            order_side    NOT NULL,
    order_type      order_type    NOT NULL,
    limit_price     NUMERIC(18,4),
    quantity        BIGINT        NOT NULL CHECK (quantity > 0),
    filled_quantity BIGINT        NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
    status          order_status  NOT NULL DEFAULT 'pending',
    client_order_id TEXT          NOT NULL,
    placed_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CHECK ((order_type = 'limit') = (limit_price IS NOT NULL)),
    CHECK (filled_quantity <= quantity),
    UNIQUE (user_id, client_order_id)
);

CREATE TABLE trades (
    trade_id          BIGINT GENERATED ALWAYS AS IDENTITY,
    order_id          BIGINT        NOT NULL,
    user_id           BIGINT        NOT NULL,
    instrument_id     BIGINT        NOT NULL,
    side              order_side    NOT NULL,
    quantity          BIGINT        NOT NULL CHECK (quantity > 0),
    price             NUMERIC(18,4) NOT NULL CHECK (price > 0),
    exchange_trade_id TEXT          NOT NULL,
    executed_on       DATE          NOT NULL,
    executed_at       TIMESTAMPTZ   NOT NULL,
    PRIMARY KEY (executed_on, trade_id),
    UNIQUE (executed_on, exchange_trade_id)
) PARTITION BY RANGE (executed_on);

-- ---------- positions ----------

CREATE TABLE holding_lots (
    lot_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT        NOT NULL REFERENCES users(user_id),
    instrument_id  BIGINT        NOT NULL REFERENCES instruments(instrument_id),
    buy_trade_id   BIGINT        NOT NULL,
    acquired_on    DATE          NOT NULL,
    cost_per_share NUMERIC(18,4) NOT NULL CHECK (cost_per_share >= 0),
    quantity_total BIGINT        NOT NULL CHECK (quantity_total > 0),
    quantity_open  BIGINT        NOT NULL CHECK (quantity_open >= 0),
    settled_on     DATE,
    CHECK (quantity_open <= quantity_total)
);

CREATE TABLE lot_consumptions (
    sell_trade_id      BIGINT        NOT NULL,
    lot_id             BIGINT        NOT NULL REFERENCES holding_lots(lot_id),
    quantity           BIGINT        NOT NULL CHECK (quantity > 0),
    cost_per_share     NUMERIC(18,4) NOT NULL,
    proceeds_per_share NUMERIC(18,4) NOT NULL,
    PRIMARY KEY (sell_trade_id, lot_id)
);

CREATE TABLE corporate_actions (
    action_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instrument_id    BIGINT      NOT NULL REFERENCES instruments(instrument_id),
    kind             action_kind NOT NULL,
    ex_date          DATE        NOT NULL,
    ratio_from       INT,
    ratio_to         INT,
    amount_per_share NUMERIC(18,4),
    applied_at       TIMESTAMPTZ
);
```

Fourteen tables, and the two that most versions of this answer do not have —
`journal_lines` and `holding_lots` — are the two that make the platform auditable and its
tax statements defensible.

Note also what is gone from the first draft: `wallets.balance` and
`holdings.average_buy_price`. Both were **derivations stored in place of the facts that
produce them**, and both are now computed — one from the journal, one from the lots.

---

### Step 18 — The mental model

Strip away broking and what is left is a method that transfers:

1. **Ask which side of the boundary you are on.** Exchange and broker share a vocabulary
   and almost no design. One is an in-memory matching problem; the other is bookkeeping.
2. **A natural key must be stable and unique forever.** Trading symbols are reused,
   renamed, and duplicated across exchanges. ISIN is the identifier; the ticker is a label.
3. **Never store a derivation in place of its inputs.** A weighted average destroys
   acquisition dates, and no amount of later cleverness gets them back. This is the same
   mistake as deriving participants from group membership in Splitwise, with a tax bill
   attached.
4. **Record movements, not balances.** Two entries that sum to zero make "why is my balance
   this" answerable line by line, and make "do the books balance" a single aggregate over
   one column rather than a script someone has to maintain.
5. **A good core abstraction absorbs requirements you did not anticipate.** Blocked funds,
   brokerage, taxes and dividends all turned out to be journal entries. Nothing new had to
   be invented for any of them.
6. **Commit resources at the moment of intent.** A resting limit order holds money. Checking
   affordability at execution lets the same rupee back several orders at once.
7. **Cache derived values, but make the cache provable.** Same transaction, a `CHECK` that
   encodes the business rule, and a watermark so verification is incremental rather than a
   monthly full scan.
8. **Know what your isolation level actually does.** Postgres's `SERIALIZABLE` is
   optimistic — it does not serialise execution, it aborts conflicts. Its cost is retry
   logic, not latency. Rejecting it for the wrong reason means rejecting it in the cases
   where it would have been right.
9. **Idempotency and concurrency control are different tools.** A unique key makes one
   intent produce one order; a guarded update makes one rupee get spent once. Neither does
   the other's job.
