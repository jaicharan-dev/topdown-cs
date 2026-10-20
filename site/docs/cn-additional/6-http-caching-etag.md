---
id: 6-http-caching-etag
title: "HTTP Caching, ETags & 304 Not Modified"
description: "Understand HTTP caching mechanics, how Cache-Control and ETag headers validate freshness, and when a 304 Not Modified response is used."
sidebar_position: 6
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is HTTP caching, and how do `Cache-Control` directives and ETags work together to eliminate redundant data transfer? What is the critical difference between `no-cache` and `no-store`, and what does an HTTP `304 Not Modified` response signify?"

Think of a student with a 1,000-page textbook:

- **Freshness** (`Cache-Control: max-age=30 days`) — the professor says "this edition is good for 30 days, don't bother asking me, just read your copy." The student opens their own book instantly, no trip to the bookstore needed.
- **Validation** (`ETag: "v4.2-rev8"`) — after 30 days, the book is "stale." The student doesn't want to haul home a brand-new copy if nothing actually changed, so they send a quick note: "is `v4.2-rev8` still current?" That's `If-None-Match`.
- **`304 Not Modified`** — the professor replies with a one-line note: "yep, no changes, reset your 30-day timer." The student saved the trip entirely.

That's the whole idea behind **HTTP caching**: browsers, CDNs, and proxies keep local copies of responses so they don't have to re-download something that hasn't changed. It's the single biggest reason the web feels fast.

---

### The caching pipeline

<Diagram>
<Row>
<Box title="Client" accent="#60a5fa">
<Field icon="📤" code={'If-None-Match: "33a64df5"'} hint="stale copy — asks the server to check" variant="neutral" />
</Box>
<Arrow label="server compares ETag" />
<Box title="Unchanged" accent="#34d399">
<Field icon="✅" code="304 Not Modified" hint="empty body — keep using your cached copy" variant="neutral" />
</Box>
</Row>
<Row>
<Box title="Changed" accent="#fb7185">
<Field icon="🔄" code="200 OK + new body + new ETag" hint="old copy is replaced" variant="neutral" />
</Box>
</Row>
</Diagram>

There are really only two checks involved:

1. **Is my cached copy still within its freshness window?** (`Cache-Control: max-age`) If yes, use it — zero network calls.
2. **If it's stale, has the content actually changed?** (`ETag` / `If-None-Match`) If no, the server says so cheaply with a `304` and an empty body. If yes, it sends the new file along with a `200`.

---

### `no-cache` vs. `no-store` — the detail interviewers love to probe

These sound almost identical but mean very different things:

| Directive | Does it get cached? | What happens on the next request | Typical use |
| :--- | :--- | :--- | :--- |
| **`no-cache`** | **Yes** — the file is still saved to disk/RAM. | The browser **must check with the server first** (via `ETag` or `Last-Modified`) before using it — it just can't skip that check. | `index.html`, API responses that change often. |
| **`no-store`** | **No** — never written to disk or memory, anywhere. | Every single request re-downloads the full payload from scratch. | Bank balances, health records, checkout pages — anything that shouldn't sit on disk at all. |

---

### The `Cache-Control` directives worth knowing

- **`max-age=<seconds>`** — how long a response stays fresh. Inside this window, the browser serves the local copy without even contacting the server.
- **`s-maxage=<seconds>`** — same idea, but only for shared caches like CDNs (Cloudflare, Fastly). Lets a CDN cache something for an hour at the edge while browsers only hold it for 5 minutes.
- **`public` vs. `private`** — `private` means only the end user's own browser may cache it; proxies and CDNs can't. `public` means any intermediate cache can store it for multiple users.
- **`immutable`** — used for content-hashed files (`bundle.a8f2c.js`). It tells the browser "this exact URL will never change its contents," so it skips revalidation entirely — even on a hard refresh.
- **`must-revalidate`** — once something goes stale, caches must never serve the stale copy anyway, not even if the origin server is temporarily down.

---

### Validating a stale copy: ETag vs. Last-Modified

Once `max-age` runs out, the client has to check with the server before reusing its copy.

**ETags** are an opaque fingerprint of the content — usually a hash:
- Server's first response: `ETag: "33a64df5"`
- Client's next request: `If-None-Match: "33a64df5"`

There's also a **strong vs. weak** distinction: `ETag: "xyz123"` means byte-for-byte identical content; `ETag: W/"xyz123"` means "equivalent" — the content is effectively the same even if whitespace or compression differs.

**Why ETags replaced `Last-Modified`:** `Last-Modified` relies on `If-Modified-Since`, which only has 1-second resolution — if a file changes twice in the same second, it can't tell. It's also vulnerable to clock drift across a cluster of servers. ETags are based on content hashes, so neither problem applies.

---

### What `304 Not Modified` actually looks like on the wire

When the client sends `If-None-Match: "33a64df5"` and the server's current ETag still matches:

```http
HTTP/1.1 304 Not Modified
ETag: "33a64df5"
Cache-Control: max-age=3600
```

The body is completely empty — zero bytes transferred. The client just resets its freshness timer and keeps using the copy it already has.

---

### Say this in the interview

*"HTTP caching has two layers: freshness, which lets a client skip the network entirely while max-age hasn't expired, and validation, which kicks in once it has. Validation uses ETag — a content hash the client sends back as If-None-Match — and if nothing changed, the server replies 304 Not Modified with an empty body instead of re-sending the file. The easy trip-up is no-cache vs. no-store: no-cache still stores the file but forces a check before reuse, while no-store never stores it at all, which is why you'd use it for anything sensitive like a bank balance."*

---

### Python Verification: HTTP Caching & ETag Revalidation Server

The following executable Python script implements an HTTP caching simulator demonstrating content-based ETag generation, conditional `If-None-Match` validation, and `304 Not Modified` empty-body responses:

```python
"""
HTTP Caching & ETag Revalidation Simulator
Demonstrates:
  1. Content-based Strong and Weak ETag generation
  2. Conditional HTTP requests via If-None-Match
  3. 304 Not Modified empty-body response optimization
"""

import hashlib
from typing import Dict, Any, Tuple

class CachingOriginServer:
    def __init__(self):
        # Simulated backend resource
        self.resource_content = "<html><body><h1>Welcome to CSF Website</h1></body></html>"
        self.max_age = 3600  # 1 hour

    def _compute_etag(self, content: str, weak: bool = False) -> str:
        content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()[:8]
        return f'W/"{content_hash}"' if weak else f'"{content_hash}"'

    def update_content(self, new_content: str):
        self.resource_content = new_content
        print(f"\n[SERVER UPDATE] Resource mutated on disk! New length: {len(new_content)} bytes")

    def handle_get(self, request_headers: Dict[str, str]) -> Tuple[int, Dict[str, str], str]:
        current_etag = self._compute_etag(self.resource_content)
        client_etag = request_headers.get("If-None-Match")

        # Conditional Check: Has the content changed?
        if client_etag == current_etag:
            # 304 Not Modified: ZERO body payload sent across wire!
            response_headers = {
                "ETag": current_etag,
                "Cache-Control": f"public, max-age={self.max_age}",
            }
            return 304, response_headers, ""

        # Content changed or initial fetch: Send full 200 OK with payload
        response_headers = {
            "ETag": current_etag,
            "Cache-Control": f"public, max-age={self.max_age}",
            "Content-Length": str(len(self.resource_content)),
            "Content-Type": "text/html"
        }
        return 200, response_headers, self.resource_content


def main():
    print("=== HTTP Caching, ETags & 304 Not Modified Simulation ===\n")
    server = CachingOriginServer()

    # 1. Initial Request (Cold Client Cache)
    print("--- 1. Initial Fetch (Cold Cache) ---")
    status, headers, body = server.handle_get(request_headers={})
    print(f"Status: {status} OK")
    print(f"ETag:   {headers['ETag']}")
    print(f"Body:   {body[:40]}... (Full {len(body)} bytes downloaded)")

    saved_etag = headers["ETag"]

    # 2. Subsequent Request after max-age expiration (Revalidation)
    print("\n--- 2. Conditional Revalidation (If-None-Match) ---")
    cond_headers = {"If-None-Match": saved_etag}
    status_reval, headers_reval, body_reval = server.handle_get(cond_headers)
    print(f"Status: {status_reval} Not Modified (Zero body transfer!)")
    print(f"Body:   '{body_reval}' (Bytes transferred: {len(body_reval)})")
    print("Result: Client refreshed max-age timer without wasting bandwidth!")

    # 3. Content updates on server
    server.update_content("<html><body><h1>Updated Version 2.0</h1></body></html>")

    # 4. Subsequent Request with old ETag
    print("--- 3. Conditional Request after Content Modification ---")
    status_updated, headers_updated, body_updated = server.handle_get(cond_headers)
    print(f"Status: {status_updated} OK (New payload downloaded)")
    print(f"New ETag: {headers_updated['ETag']}")
    print(f"New Body: {body_updated}")

if __name__ == "__main__":
    main()
```
