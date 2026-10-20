---
id: 3-cors-preflight
title: "CORS & Preflight Requests"
description: "Understand CORS, why browsers enforce it, how HTTP OPTIONS preflight requests work, and how to configure backend headers properly."
sidebar_position: 3
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Arrow, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is CORS, and why does it exist as a browser security mechanism? Explain what triggers an HTTP `OPTIONS` preflight request, how preflight caching works, and why `Access-Control-Allow-Origin: *` fails when credentials are included."

Browsers have a rule: a page from `site-a.com` isn't allowed to read responses from `site-b.com` unless `site-b.com` explicitly says it's okay. That's the **Same-Origin Policy**, and **CORS (Cross-Origin Resource Sharing)** is the mechanism a server uses to grant that permission.

The part people get wrong: the Same-Origin Policy doesn't stop the browser from *sending* a cross-origin request — it stops the page's JavaScript from *reading the response*, unless the server says it's fine.

---

### What counts as the "same" origin

Two URLs are the same origin only if the scheme, host, and port all match exactly:

$$\text{Origin} = \text{Protocol} + \text{Domain/Host} + \text{Port}$$

```
Comparing with: https://example.com:443/app/index.html
├── https://example.com/api/data        -> SAME ORIGIN (443 is the default HTTPS port)
├── http://example.com/api/data         -> different (http vs https)
├── https://api.example.com/data        -> different (subdomain)
└── https://example.com:8443/data       -> different (port)
```

---

### Two kinds of cross-origin requests: simple, and "ask first"

Not every cross-origin request gets interrogated. Browsers only ask for permission upfront when the request is capable of doing something risky — using a non-standard method, or custom headers a plain HTML form could never send:

- **"Simple" requests** — `GET`/`HEAD`/`POST` with a content type of `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`. These go straight to the server, no questions asked.
- **"Preflighted" requests** — anything else: `PUT`/`DELETE`/`PATCH`, a custom header like `Authorization`, or `Content-Type: application/json`. The browser pauses and checks with the server first.

That second bucket covers almost every modern API call. Old HTML forms could only ever send the three content types above — so the instant you send JSON or an auth header, which is basically every REST/GraphQL request today, you trigger a preflight.

---

### The preflight handshake itself

Before sending something like `DELETE /orders/99`, the browser quietly sends an `OPTIONS` request first, asking "am I allowed to do this?" Only if the server says yes does the real request go out.

<Diagram>
<Row>
<Box title="Browser" accent="#60a5fa">
<Field icon="📤" code="OPTIONS /orders/99" hint="asks before the real request" variant="neutral" />
</Box>
<Arrow label="1. asks first" />
<Box title="Server" accent="#34d399">
<Field icon="✅" code="204 + Allow-Origin, Allow-Methods" hint="says what's permitted" variant="neutral" />
</Box>
<Arrow label="2. then" />
<Box title="Browser" accent="#60a5fa">
<Field icon="📤" code="DELETE /orders/99" hint="the real request, now sent" variant="neutral" />
</Box>
</Row>
</Diagram>

1. Browser sends `OPTIONS /orders/99` with the `Origin` header and what it's about to do (`Access-Control-Request-Method`, `Access-Control-Request-Headers`).
2. Server checks the origin, method, and headers, and replies `204 No Content` with `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.
3. Only now does the browser send the actual `DELETE` request.

---

### Avoiding a round-trip on every call: `Access-Control-Max-Age`

Doing two round-trips (`OPTIONS` then the real request) for every single API call would roughly double your latency — an extra 100-300ms on everything. The fix is a header the server sends back on the preflight response:

```http
Access-Control-Max-Age: 86400
```

This tells the browser "remember this answer for 86,400 seconds (24 hours)" — so for that whole day, matching requests skip the preflight and go straight through.

---

### The trap: wildcard origins + credentials don't mix

This one bites almost everyone at least once: sending cookies or an `Authorization` header cross-origin (`credentials: 'include'`) while the server allows any origin.

```http
// REJECTED BY EVERY BROWSER:
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**Why it's blocked:** if this combination worked, any random site on the internet could quietly fetch `api.bank.com` in the background, your browser would attach your real banking cookies to that request automatically, and the malicious site would get to read your balance back. So browsers simply refuse to honor `*` the moment credentials are involved.

**The correct pattern** is to check the incoming `Origin` against a whitelist, and echo back that exact origin instead of a wildcard:

```http
Access-Control-Allow-Origin: https://frontend.com
Access-Control-Allow-Credentials: true
Vary: Origin
```

`Vary: Origin` matters here too — it tells CDNs and caching proxies not to serve a response meant for one origin to a different one.

---

### Say this in the interview

*"CORS is how a server grants permission for another origin to read its responses — the Same-Origin Policy was already blocking the read, not the send. Anything beyond a plain form request — JSON bodies, custom headers like Authorization, non-GET/POST methods — makes the browser send an OPTIONS preflight first to check it's allowed, and Access-Control-Max-Age lets the browser cache that answer so it doesn't repeat the round trip on every call. The one hard rule: you can never combine a wildcard origin with credentials — if credentials are involved, the server has to validate and echo back the exact origin instead."*

---

### Python: a CORS preflight server

```python
"""
CORS Preflight & Security Validation Server
Demonstrates:
  1. Automated handling of HTTP OPTIONS preflight requests
  2. Verification of Origin, Methods, and Allowed Headers
  3. Preflight caching via Access-Control-Max-Age
  4. Proper credential handling without illegal wildcard origins
"""

from typing import Dict, Tuple

class CORSService:
    def __init__(self, allowed_origins: list):
        self.allowed_origins = set(allowed_origins)

    def handle_request(self, method: str, headers: Dict[str, str]) -> Tuple[int, Dict[str, str], str]:
        origin = headers.get("Origin")

        # 1. Reject unapproved origins
        if origin not in self.allowed_origins:
            return 403, {}, "CORS Policy Violation: Origin unauthorized"

        # 2. Handle HTTP OPTIONS Preflight Probe
        if method == "OPTIONS":
            req_method = headers.get("Access-Control-Request-Method", "")
            req_headers = headers.get("Access-Control-Request-Headers", "")

            response_headers = {
                "Access-Control-Allow-Origin": origin,  # Explicit origin (NOT wildcard *)
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
                "Access-Control-Max-Age": "86400",       # Cache preflight for 24 hours
                "Vary": "Origin"                         # Prevent CDN cache poisoning
            }
            return 204, response_headers, ""

        # 3. Handle Actual Request (e.g., DELETE /api/resource)
        response_headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Content-Type": "application/json"
        }
        return 200, response_headers, '{"status": "success", "message": "Resource mutated"}'


def main():
    print("=== CORS Preflight & Security Verification ===\n")
    service = CORSService(allowed_origins=["https://dashboard.example.com"])

    # Test Case 1: Preflight OPTIONS Request from Authorized Origin
    print("--- 1. Handling Preflight OPTIONS Request ---")
    preflight_headers = {
        "Origin": "https://dashboard.example.com",
        "Access-Control-Request-Method": "DELETE",
        "Access-Control-Request-Headers": "authorization, content-type"
    }
    status, res_headers, _ = service.handle_request("OPTIONS", preflight_headers)
    print(f"Response Status: {status} (Expected 204 No Content)")
    for k, v in res_headers.items():
        print(f"  {k}: {v}")

    # Test Case 2: Actual DELETE Request following preflight
    print("\n--- 2. Handling Actual DELETE Request ---")
    actual_headers = {
        "Origin": "https://dashboard.example.com",
        "Authorization": "Bearer secret_token_123"
    }
    status, res_headers, body = service.handle_request("DELETE", actual_headers)
    print(f"Response Status: {status} OK")
    print(f"Body: {body}")

    # Test Case 3: Malicious Origin Blocked
    print("\n--- 3. Handling Request from Malicious Origin ---")
    bad_headers = {"Origin": "https://evil-hacker.com"}
    status, _, body = service.handle_request("POST", bad_headers)
    print(f"Response Status: {status} Forbidden | {body}")

if __name__ == "__main__":
    main()
```
