---
id: 5-api-idempotency
title: "API Idempotency & Idempotency Keys"
description: "Understand API idempotency, why it is critical for payment endpoints, and how idempotency keys prevent duplicate operations on network retries."
sidebar_position: 5
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is API idempotency, and why is it critical for financial transactions? How do production idempotency keys handle concurrent in-flight retries, and what must the server do if a client reuses an idempotency key with a mutated payload?"

Imagine calling a restaurant to order food, and the call drops right after you finish talking. Did they get your order or not? You call back and repeat it — if the kitchen already started cooking, you don't want a second plate showing up. An API needs the same guarantee: calling it once, or calling it five times because the network glitched, should leave things in exactly the same state.

That's **idempotency**: making the same request multiple times has the same effect as making it once.

$$f(f(x)) = f(x)$$

Reads are naturally idempotent — reading a value twice doesn't change it. Writes aren't, by default. Charging a card, booking a flight, transferring money — do each of those twice and you get two charges, two bookings, two transfers, unless the API is specifically built to prevent it.

<Diagram>
<Row>
<Box title="PUT /account/balance" accent="#34d399">
<Field icon="✅" code="idempotent" hint="retry-safe — sets an absolute value, same end state every time" variant="neutral" />
</Box>
<Box title="POST /charge" accent="#fb7185">
<Field icon="⚠️" code="not idempotent" hint="retry without protection = double charge" variant="neutral" />
</Box>
</Row>
</Diagram>

---

### Why this actually breaks things: the retry window

A single API call isn't instant — it has three phases, and the dangerous part is what happens if something fails between the last two:

<Diagram>
<Row>
<Box title="Request sent" accent="#60a5fa">
<Field icon="📤" code="Client → Server" variant="neutral" />
</Box>
<Arrow label="reaches server" />
<Box title="Server executes" accent="#f59e0b">
<Field icon="💳" code="Charge $100 — succeeds" variant="neutral" />
</Box>
<Arrow label="response lost" />
<Box title="Client times out" accent="#fb7185">
<Field icon="❓" code="No idea if it worked" variant="neutral" />
</Box>
</Row>
</Diagram>

Walk through what happens:

1. The server runs the charge. It succeeds — \$100 is deducted.
2. On the way back, the connection drops, or the gateway times out.
3. The client just sees a timeout (`ECONNRESET`). It genuinely doesn't know whether the charge went through.
4. Most retry logic (in payment SDKs, in message queues) just tries again automatically.
5. If the endpoint isn't idempotent, step 1 runs a second time — the customer gets charged twice.

The server did its job correctly both times. The problem is entirely about what happens when the *response* gets lost, not the request.

---

### Which HTTP methods are safe by default

| HTTP Method | Idempotent? | Safe (read-only)? | Why |
| :--- | :--- | :--- | :--- |
| **`GET` / `HEAD`** | Yes | Yes | Reading doesn't change anything, no matter how many times you do it. |
| **`PUT`** | Yes | No | It replaces the whole resource. `PUT /users/42` with `{"name": "Alice"}` ten times leaves the same end state as once. |
| **`DELETE`** | Yes | No | Delete it once, it's gone. Delete it again, it's still gone (you'll get a `404` instead of `200`, but the data state didn't change further). |
| **`POST`** | **No** | No | Usually creates a new record — call it twice, you typically get two records. |
| **`PATCH`** | **No**, usually | No | Depends what it does. `PATCH /counter` with `{"$increment": 1}` changes the result every single time you call it. |

---

### The fix: idempotency keys

To make `POST` safe to retry, APIs like Stripe's and Adyen's let the client attach a unique token to the request — an **idempotency key**, usually a UUID:

```http
POST /v1/charges HTTP/1.1
Host: api.stripe.com
Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
Content-Type: application/json

{ "amount": 1000, "currency": "usd" }
```

The client generates this key once per *logical* operation. If the request has to be retried, it sends the exact same key — telling the server "this is the same attempt, not a new charge."

---

### What the server actually has to do with that key

The naive assumption is "just check if the key exists in Redis and return whatever's cached." That breaks the moment a retry arrives *while the first attempt is still running* — before anything's been cached yet. A production idempotency engine needs three states for a key, not two:

<Diagram>
<Row>
<Box title="1st request arrives" accent="#60a5fa">
<Field icon="🔒" code="SET key IN_PROGRESS" hint="atomic lock in Redis" variant="neutral" />
</Box>
<Arrow label="retry arrives mid-flight" />
<Box title="Still IN_PROGRESS" accent="#f59e0b">
<Field icon="🚫" code="409 Conflict" hint="another attempt with this key is already running" variant="neutral" />
</Box>
</Row>
</Diagram>

<Diagram>
<Row>
<Box title="Original request finishes" accent="#34d399">
<Field icon="✅" code="status → COMPLETED" hint="cache the exact response" variant="public" />
</Box>
<Arrow label="later retry with same key" />
<Box title="Cached response replayed" accent="#34d399">
<Field icon="📋" code="200 OK (same charge_id)" hint="no business logic re-run" variant="public" />
</Box>
</Row>
</Diagram>

1. **`IN_PROGRESS` (a lease, not a cache hit):** the gateway does an atomic `SET key "IN_PROGRESS" NX EX 60` in Redis. If the key is already there and still `IN_PROGRESS`, something else with this exact key is mid-flight — the gateway returns `409 Conflict` rather than running the charge a second time in parallel.
2. **`COMPLETED` (cached forever, or close to it):** once the real operation finishes, the gateway stores the full response — status code, headers, body — for 24-72 hours. Any later retry with the same key skips the business logic entirely and just replays that stored response.
3. **`FAILED`:** if something breaks before the charge actually happens (a database timeout, say), the key gets deleted so the client is free to safely try again from scratch.

---

### What if the retry doesn't match the original request?

Here's the attack (or bug) this has to catch: someone reuses the same idempotency key but changes the amount —

```http
// Request 1:
Idempotency-Key: 9b1deb4d...
{ "amount": 1000 }

// Request 2 (tampered, or just a buggy retry):
Idempotency-Key: 9b1deb4d...
{ "amount": 500000 }
```

The fix is to hash the request alongside the key, not just trust the key alone:

$$\text{Payload\_Hash} = \text{SHA-256}(\text{HTTP\_Method} + \text{Path} + \text{Request\_Body})$$

Every time that key shows up again, the server recomputes the hash of the incoming request and compares it to the hash it stored the first time. If they don't match, it refuses outright — `422 Unprocessable Entity` or `400 Bad Request` — instead of either re-running the charge or silently replaying the wrong cached response:

```json
{
  "error": "Idempotency-Key reused with modified parameters or different payload."
}
```

---

### Say this in the interview

*"Idempotency means repeating a request has the same effect as making it once. GET, PUT, and DELETE are idempotent by nature; POST isn't, which matters because a client that times out waiting for a response has no way to know if the operation actually succeeded, and its retry logic will fire again. The fix is a client-generated idempotency key: the server tracks it through IN_PROGRESS, COMPLETED, and FAILED states in something like Redis, returning 409 for a concurrent retry and replaying the cached response for a later one. To stop the key from being reused with a different payload, the server also hashes the request body and rejects a mismatch."*

---

### Python Verification: Production-Grade Idempotency Engine Simulation

The following executable Python script implements an atomic Idempotency Gateway with in-progress concurrency locking, payload hash validation, and cached response replay:

```python
"""
API Idempotency Gateway Simulator
Demonstrates:
  1. Safe response caching and replay for identical retries
  2. Prevention of concurrent execution on in-flight requests (409 Conflict)
  3. Rejection of payload tampering / mismatch on reused keys (422 Unprocessable)
"""

import hashlib
import json
import time
from typing import Dict, Any, Tuple

class IdempotencyGateway:
    def __init__(self):
        # Simulated centralized Redis key store:
        # key -> {"status": "IN_PROGRESS" | "COMPLETED", "payload_hash": str, "response": dict}
        self.store: Dict[str, Dict[str, Any]] = {}

    def _hash_request(self, endpoint: str, body: Dict[str, Any]) -> str:
        serialized = f"{endpoint}:{json.dumps(body, sort_keys=True)}"
        return hashlib.sha256(serialized.encode('utf-8')).hexdigest()

    def process_charge(self, idempotency_key: str, endpoint: str, body: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        current_hash = self._hash_request(endpoint, body)

        # Step 1: Check existing idempotency record
        if idempotency_key in self.store:
            record = self.store[idempotency_key]

            # Security Guard: Verify payload hasn't mutated!
            if record["payload_hash"] != current_hash:
                return 422, {"error": "Idempotency key reused with different request payload!"}

            # Concurrency Guard: Is another thread currently processing this?
            if record["status"] == "IN_PROGRESS":
                return 409, {"error": "A concurrent request with this idempotency key is already in progress. Please retry later."}

            # State COMPLETED: Replay cached HTTP response!
            print(f"  [Idempotency Replay] Key '{idempotency_key}' found! Returning cached response.")
            return record["response"]["status"], record["response"]["body"]

        # Step 2: Atomic Lock acquisition (Simulating Redis SETNX key IN_PROGRESS)
        self.store[idempotency_key] = {
            "status": "IN_PROGRESS",
            "payload_hash": current_hash,
            "response": None,
            "created_at": time.time()
        }
        print(f"  [Lock Acquired] Key '{idempotency_key}' set to IN_PROGRESS.")

        # Step 3: Execute core banking business logic (Simulated mutation)
        charge_id = f"ch_{int(time.time() * 1000)}"
        response_body = {
            "charge_id": charge_id,
            "amount": body.get("amount"),
            "currency": body.get("currency"),
            "status": "succeeded"
        }
        status_code = 200

        # Step 4: Transition to COMPLETED and persist response
        self.store[idempotency_key]["status"] = "COMPLETED"
        self.store[idempotency_key]["response"] = {
            "status": status_code,
            "body": response_body
        }
        print(f"  [Execution Complete] Charge {charge_id} processed; response cached.")

        return status_code, response_body


def main():
    print("=== API Idempotency Key Gateway Simulation ===\n")
    gateway = IdempotencyGateway()
    KEY = "req_uuid_9921_alpha"
    ENDPOINT = "/v1/charges"
    PAYLOAD = {"amount": 2500, "currency": "USD", "customer": "cust_101"}

    # 1. First Request: Successfully processed
    print("--- 1. First Request (Fresh Idempotency Key) ---")
    status, body = gateway.process_charge(KEY, ENDPOINT, PAYLOAD)
    print(f"HTTP Status: {status} | Body: {body}\n")

    # 2. Simulated Network Timeout & Client Retry (Identical Payload)
    print("--- 2. Client Retry after Timeout (Identical Payload) ---")
    status_retry, body_retry = gateway.process_charge(KEY, ENDPOINT, PAYLOAD)
    print(f"HTTP Status: {status_retry} | Body: {body_retry}")
    assert body["charge_id"] == body_retry["charge_id"], "Charge ID must match cached result!"
    print("Verification: Zero duplicate charges created; identical response replayed.\n")

    # 3. Malicious / Buggy Request: Reusing same key with altered amount ($99,000)
    print("--- 3. Reusing Key with Modified Payload ($99,000) ---")
    tampered_payload = {"amount": 99000, "currency": "USD", "customer": "cust_101"}
    status_tamper, body_tamper = gateway.process_charge(KEY, ENDPOINT, tampered_payload)
    print(f"HTTP Status: {status_tamper} | Body: {body_tamper}")
    assert status_tamper == 422
    print("Verification: Gateway correctly blocked payload mutation on reused idempotency key!")

if __name__ == "__main__":
    main()
```
