---
id: 7-http-request-https
title: "HTTP Request Components, HTTPS & TLS"
description: "The anatomy of an HTTP request, safe vs idempotent methods, how HTTPS/TLS secures traffic, TLS 1.2 vs TLS 1.3, and the status codes that come up most."
sidebar_position: 7
sidebar_class_name: sidebar-easy
---

import { Diagram, Row, Box } from '@site/src/components/SimpleDiagram';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the main components of an HTTP request? Compare HTTP method idempotency vs safety. How does HTTPS secure traffic, what are the critical differences between TLS 1.2 and TLS 1.3, and what do common status codes like 301 vs 302 and 401 vs 403 signify?"

---

### Anatomy of an HTTP request

Think of an HTTP request like a letter: an address line on the envelope, some notes on the outside, and a letter inside. An HTTP/1.1 request is literally a text message with three parts:

```http
POST /api/v1/orders HTTP/1.1
Host: api.example.com
User-Agent: Mozilla/5.0
Content-Type: application/json
Content-Length: 42
Authorization: Bearer eyJhbGciOi...

{"item_id": 1042, "quantity": 2, "price": 49.99}
```

1. **The request line** — what you want to do (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, ...), what resource you want (`/api/v1/orders?status=active`), and which HTTP version.
2. **Headers** — key-value metadata. `Host` says which site you mean (needed because one server can host many domains), `Content-Type` says what format the body is in, `Authorization` carries credentials, `Accept-Encoding` says what compression you can handle.
3. **The body** — the actual payload, separated from the headers by a blank line. Present for `POST`/`PUT`/`PATCH`, usually absent for `GET`/`HEAD`/`DELETE`.

---

### Safe vs. idempotent — a distinction interviewers love

- **Safe** means the method doesn't change anything on the server — it's read-only. That's why `GET` requests can be cached, prefetched, and crawled freely.
- **Idempotent** means doing it once and doing it five times leave the server in the exact same state. The response codes might differ (a second `DELETE` might return `404` instead of `200`), but the underlying data ends up identical either way.

| HTTP Method | Safe? | Idempotent? | What it does |
| :--- | :---: | :---: | :--- |
| **`GET`** | Yes | Yes | Read a resource, no side effects. |
| **`HEAD`** | Yes | Yes | Like `GET` but headers only, no body. |
| **`OPTIONS`** | Yes | Yes | Lists supported options / CORS preflight. |
| **`PUT`** | No | Yes | Fully replaces a resource — doing it 5 times gives the same end state as once. |
| **`DELETE`** | No | Yes | Removes a resource — once gone, repeating it changes nothing further. |
| **`POST`** | No | No | Creates something new — each call typically adds another record. |
| **`PATCH`** | No | Usually not | Partial update — repeating "append to array" keeps growing the array. |

---

### HTTPS: HTTP wrapped in a lock

Plain HTTP sends everything as readable text — anyone on the network path can see it. HTTPS fixes that by routing HTTP through **TLS** before anything leaves the machine. TLS gives you three guarantees:

1. **Confidentiality** — the data is encrypted (AES-256-GCM, ChaCha20-Poly1305), so eavesdroppers see gibberish.
2. **Integrity** — any tampering in transit breaks the decryption, so modified data gets caught, not silently delivered.
3. **Authentication** — the server proves who it is with an X.509 certificate, which your browser verifies against a trusted Certificate Authority.

---

### TLS 1.2 vs. TLS 1.3: one round trip instead of two

Before any encrypted data can flow, client and server have to agree on keys. TLS 1.2 needed two full round trips to do that; TLS 1.3 does it in one.

<Diagram>
<Row>
<Box label="TLS 1.2" sub="2 round trips" />
<Box label="TLS 1.3" sub="1 round trip" />
</Row>
</Diagram>

Why TLS 1.3 wins:

1. **Faster handshake (1-RTT):** instead of waiting to agree on an algorithm first, the client just guesses the common case (X25519) and sends its key share in the very first message. Returning visitors can even get **0-RTT** — sending encrypted data on the first packet using a saved key — though that's only safe for non-state-changing requests like `GET`, since 0-RTT data can be replayed by an attacker.
2. **Forward secrecy is now mandatory:** TLS 1.2 allowed a mode where, if an attacker ever stole the server's private key, they could decrypt *all* previously recorded traffic. TLS 1.3 bans that outright and requires fresh, temporary keys (ECDHE/DHE) for every session — stealing the server's long-term key later doesn't unlock old conversations.
3. **Dead weight removed:** RC4, CBC-mode ciphers, SHA-1, MD5 — all the algorithms with known weaknesses are gone. The cipher suite list went from hundreds of options down to 5.

---

### Status codes worth knowing cold

**Redirects — `301` vs `302` vs `307` vs `308`:**
- `301 Moved Permanently` — resource moved for good; search engines transfer ranking to the new URL; browsers cache it aggressively. Historically browsers would wrongly turn a `POST` into a `GET` when following it.
- `302 Found` — temporary move, not cached long-term. Same historical `POST`→`GET` quirk.
- `307 Temporary Redirect` — like 302, but guarantees the method doesn't change.
- `308 Permanent Redirect` — like 301, but guarantees the method doesn't change.

**Auth — `401` vs `403`:**
- `401 Unauthorized` — really means "unauthenticated": you haven't proven who you are. The server should send a `WWW-Authenticate` header saying how to log in.
- `403 Forbidden` — you *are* authenticated, the server knows who you are, but you're not allowed to do this. Logging in again with the same account won't help.

**`429 Too Many Requests`** — you've hit a rate limit. Usually comes with `Retry-After` and `X-RateLimit-*` headers telling you when to try again.

**Gateway errors — `502` vs `504`:**
- `502 Bad Gateway` — the proxy reached the backend, but the backend crashed or sent garbage back.
- `504 Gateway Timeout` — the proxy reached the backend, but it took too long to answer.

---

### Say this in the interview

*"An HTTP request has three parts: a request line (method, path, version), headers (metadata like Host and Authorization), and an optional body. Safe methods like GET don't change server state; idempotent methods like PUT and DELETE leave the server the same whether you call them once or five times; POST is neither. HTTPS wraps HTTP in TLS for confidentiality, integrity, and server authentication. TLS 1.3 cut the handshake from 2 round trips to 1, made forward secrecy mandatory so a leaked server key can't decrypt old traffic, and dropped weak ciphers like RC4 and CBC. For status codes: 401 means not authenticated, 403 means authenticated but not allowed; 301/302 may silently flip POST to GET on redirect, but 307/308 guarantee the method stays the same."*

---

### Code: inspecting an HTTPS/TLS connection

```python
import socket
import ssl

def inspect_https_connection(hostname: str, port: int = 443):
    print(f"[*] Connecting to {hostname}:{port}...")

    # 1. Create a secure default SSL/TLS context
    context = ssl.create_default_context()

    # 2. Open a standard TCP socket (Layer 4)
    raw_socket = socket.create_connection((hostname, port), timeout=5.0)

    # 3. Wrap socket with TLS Handshake (Layer 5/6/7)
    with context.wrap_socket(raw_socket, server_hostname=hostname) as tls_socket:
        print("[+] TLS Handshake Successful!")
        print(f"    - Protocol Version: {tls_socket.version()}")
        cipher_name, proto_version, secret_bits = tls_socket.cipher()
        print(f"    - Negotiated Cipher Suite: {cipher_name}")
        print(f"    - Encryption Bits: {secret_bits}")
        
        # Verify Perfect Forward Secrecy
        is_pfs = "ECDHE" in cipher_name or "DHE" in cipher_name or "TLS_AES" in cipher_name
        print(f"    - Perfect Forward Secrecy (PFS): {'YES' if is_pfs else 'NO'}")

        # 4. Inspect Server Certificate
        cert = tls_socket.getpeercert()
        subject = dict(item[0] for item in cert.get('subject', ()))
        issuer = dict(item[0] for item in cert.get('issuer', ()))
        print(f"    - Certificate Subject: {subject.get('commonName')}")
        print(f"    - Certificate Issuer (CA): {issuer.get('organizationName', issuer.get('commonName'))}")

        # 5. Send a raw HTTP/1.1 GET request over the encrypted tunnel
        http_request = (
            f"GET / HTTP/1.1\r\n"
            f"Host: {hostname}\r\n"
            f"User-Agent: AntigravityTLSInspector/1.0\r\n"
            f"Connection: close\r\n\r\n"
        )
        tls_socket.sendall(http_request.encode('utf-8'))

        # 6. Read and parse the HTTP status line and headers
        response = tls_socket.recv(4096).decode('utf-8', errors='replace')
        status_line = response.split('\r\n')[0]
        print(f"\n[+] HTTP Response Status Line: {status_line}")

if __name__ == "__main__":
    inspect_https_connection("www.cloudflare.com")
```
