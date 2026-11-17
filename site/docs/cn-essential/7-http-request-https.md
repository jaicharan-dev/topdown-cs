---
id: 7-http-request-https
title: "HTTP Request Components, HTTPS & TLS"
description: "What is actually in a request, which requests are safe to repeat, and how one round trip was removed from every connection"

sidebar_position: 7
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What are the main components of an HTTP request? Compare HTTP method idempotency vs safety. How does HTTPS secure traffic, what are the critical differences between TLS 1.2 and TLS 1.3, and what do common status codes like 301 vs 302 and 401 vs 403 signify?"

---

### Picture it

**A request is a filled-in form.** The top line says what you want done and to what: "collect parcel, locker 14". Below it are the boxes: who you are, what formats you can accept, how long the attachment is. Then a blank line, which is the form saying "the boxes are finished". Then the attachment itself, if there is one. The blank line matters more than it looks: without it, nobody knows where the boxes end and the attachment begins.

**Safe and idempotent are two different questions about the same form.** "Read me the meter" changes nothing, so you can submit it as often as you like and even submit it speculatively, before anyone asks. "Set the meter to 50" **does** change something, but submitting it five times leaves the meter at 50 just the same. "Add 10 to the meter" is different again: submit it twice and you have added 20. So "does it change anything" and "does repeating it change anything more" are separate questions, and the second one is what decides whether a request can be safely retried after a timeout.

**Now the envelope.** HTTPS is sending that form in a tamper-evident sealed envelope to a recipient whose identity you checked first, in that order: you verify who you are talking to, then you agree a seal only the two of you can open, then you send the form. Checking identity first is the part people skip when explaining it, and it is the part that makes the rest worth anything, because a perfectly encrypted conversation with an impostor is of no use at all.

---

### The proper terms

#### The components of an HTTP request

Four parts, in this order.

**The request line.** The **method**, the **request target**, and the HTTP version: `GET /search?q=tcp HTTP/1.1`. The target carries the path and the **query string**.

**The headers.** Key and value pairs of **metadata**. `Host` is mandatory in HTTP/1.1, because one IP address serves many sites and the server needs to know which was asked for. Others in constant use are `User-Agent`, `Accept`, `Authorization`, `Cookie`, `Content-Type` and `Content-Length`.

**An empty line.** A bare **CRLF** marking the end of the headers. It is structurally necessary: it is what tells the parser the body begins.

**The body.** Optional, and present on POST, PUT and PATCH but normally absent on GET. Its length is given by `Content-Length`, or its end is signalled by **chunked transfer encoding**.

#### Safe versus idempotent

Two properties that are often conflated, and the distinction is the point of the question.

**Safe** means the method is **read-only**: it is not intended to change server state. `GET`, `HEAD`, `OPTIONS` and `TRACE` are safe.

**Idempotent** means that making the request **many times has the same effect as making it once**. `GET`, `HEAD`, `OPTIONS`, `TRACE`, `PUT` and `DELETE` are idempotent.

| Method | Safe | Idempotent |
| --- | --- | --- |
| GET, HEAD, OPTIONS | yes | yes |
| PUT | no | yes |
| DELETE | no | yes |
| POST | no | no |
| PATCH | no | not necessarily |

Every safe method is idempotent. The reverse is false, and `PUT` and `DELETE` are the cases that prove it: both change state, but `PUT /users/7` with the same body twice leaves exactly one user 7 with that content, and deleting twice leaves the resource equally absent.

Why it matters in practice:

**Safety governs caching and prefetching.** A browser, proxy or CDN may cache a safe response and may fetch it speculatively, which it could never do for a POST.

**Idempotency governs retries.** When a request times out, the client does not know whether the server acted. An idempotent request can simply be resent. A `POST` cannot, which is why payment APIs require an **idempotency key**: a client-supplied identifier that lets the server recognise a repeat and return the original result instead of charging twice.

`DELETE` is the usual trap. It is idempotent by **effect**, not by **response**: the first call returns 204 and the second 404, and that difference does not make it non-idempotent, because the resource's state is identical either way.

#### How HTTPS secures traffic

**HTTPS** is HTTP carried over **TLS**, on port **443**. It provides three things, and naming all three is the complete answer.

**Confidentiality**, so the network cannot read the traffic.

**Integrity**, so tampering is detected rather than silently accepted.

**Authentication**, so the client knows which server it reached.

The design is **hybrid cryptography**, because the two kinds of cryptography are good at different things.

**Asymmetric cryptography** handles **authentication and key exchange**. The server holds a private key and presents a **certificate** containing its public key and identity, signed by a **certificate authority**. The client validates the **chain of trust** up to a root it already holds, checks the hostname matches, checks the validity dates, and checks revocation.

**Symmetric cryptography** handles the **bulk data**, with **AES-GCM** or **ChaCha20-Poly1305**, because it is orders of magnitude faster. These are **AEAD** ciphers, which provide confidentiality and integrity in one operation.

The bridge between them is the key exchange, and modern TLS uses **ECDHE**, ephemeral elliptic-curve Diffie-Hellman. Both sides derive the same session key without it ever crossing the wire, and because the key pair is **ephemeral**, it is discarded afterwards. That gives **forward secrecy**: an attacker who records the traffic and later obtains the server's private key still cannot decrypt the old sessions. Under the old static RSA exchange, they could decrypt everything they had ever recorded.

#### TLS 1.2 versus TLS 1.3

The headline is **one round trip instead of two**, but the security changes matter as much.

**Handshake latency.** TLS 1.2 needs two round trips before application data flows, because the client cannot guess the server's chosen key exchange parameters and must wait to be told. TLS 1.3 needs one: the client **guesses** the key share in its first message, and since there are now few enough supported groups to guess correctly almost always, the server can reply with everything needed. On top of TCP's own handshake, that is three round trips reduced to two.

**0-RTT resumption.** On a repeat visit, TLS 1.3 can send application data in the very first message using a **pre-shared key** from the previous session. The caveat is serious: 0-RTT data is **replayable**, because the server has no fresh randomness to bind it to, so it must be restricted to **safe, idempotent requests**.

**Forward secrecy is mandatory.** Static RSA key exchange is **removed**, so every TLS 1.3 connection is forward secret. This is the single most important change.

**Weak cryptography is removed.** No **RC4**, no **3DES**, no **CBC-mode** ciphers and their padding-oracle family of attacks, no **MD5** or **SHA-1** signatures, no custom Diffie-Hellman groups, and no **compression**, which killed the CRIME attack. Only AEAD ciphers remain, and the cipher suite list shrank from hundreds to five.

**More of the handshake is encrypted.** In TLS 1.3 the certificate is encrypted, so a passive observer no longer learns which certificate was served. Only the ClientHello and ServerHello remain in the clear, and the handshake **transcript is signed** to prevent downgrade attacks. The **SNI** field, which names the host being requested, is still visible, which is what encrypted client hello, or **ECH**, addresses.

**Renegotiation is gone**, replaced by a clean key update, removing a long-standing class of attack.

#### The status codes they ask about

**301 versus 302.** `301 Moved Permanently` says the resource has a new home and the client should update its records. Browsers cache it aggressively and often indefinitely, so a mistaken 301 is extremely hard to retract from users' browsers. `302 Found` is temporary and not cached by default.

There is a second, subtler difference. Historically both **changed the method to GET** when following a redirect of a POST, which clients did in violation of the specification and which became the de facto behaviour. That is why **307 Temporary Redirect** and **308 Permanent Redirect** were added: they are the same as 302 and 301 but preserve the method and body. If you are redirecting a POST, you want 307 or 308.

**401 versus 403.** `401 Unauthorized` is misnamed; it means **unauthenticated**. The server does not know who you are, and the response must include a **WWW-Authenticate** header saying how to authenticate. Retrying with credentials may succeed.

`403 Forbidden` means the server knows who you are and you are not permitted. Retrying with the same credentials will never succeed. A deliberate variation is answering `404` instead of `403` for resources whose existence should not be disclosed.

The one-line discriminator: **401 is "who are you?", 403 is "I know who you are, and no".**

---

### In code

```text
The four parts of a request, with the blank line that matters:

  POST /api/orders?notify=1 HTTP/1.1      <- request line
  Host: shop.example.com                  <- headers begin
  Content-Type: application/json
  Content-Length: 27
  Authorization: Bearer eyJhbGci...
                                          <- EMPTY LINE ends the headers
  {"sku":"A12","quantity":3}              <- body

  Host is mandatory in HTTP/1.1: one IP serves many sites.
  Remove the empty line and the parser cannot find the body.
```

```text
Safe and idempotent, and why each one is useful:

                safe?   idempotent?   so you may...
  GET            yes       yes        cache it, prefetch it, retry it
  HEAD           yes       yes        same, without the body
  PUT            no        yes        retry it after a timeout
  DELETE         no        yes        retry it after a timeout
  POST           no        no         NOT retry it blindly
  PATCH          no        maybe      depends on the patch itself

  safe      -> may be cached and prefetched
  idempotent -> may be retried automatically

  POST is why payment APIs want an idempotency key: the client
  supplies an id, and a repeat returns the original result
  instead of charging the card twice.
```

```text
TLS 1.2 vs TLS 1.3 handshakes:

  TLS 1.2, two round trips before any data

    client --- ClientHello ------------------>
           <-- ServerHello, Certificate, ------
               ServerKeyExchange, Done
    client --- ClientKeyExchange, Finished -->
           <-- Finished -----------------------
    client --- application data ------------->

  TLS 1.3, one round trip

    client --- ClientHello + key share ------>
           <-- ServerHello + key share, -------
               {Certificate, Finished}          <- encrypted
    client --- Finished + application data -->

  The client guesses the key share up front. Few enough groups
  are supported that the guess is almost always right.

  TLS 1.3 0-RTT, on a return visit

    client --- ClientHello + PSK + data ----->   data in message one
               but it is replayable, so only for
               safe, idempotent requests
```

```text
Redirects and auth failures, chosen by what you want the client to do:

  301  permanent, method may become GET    cached hard, hard to undo
  308  permanent, method preserved         use this for a POST
  302  temporary, method may become GET    not cached by default
  307  temporary, method preserved         use this for a POST

  401  "who are you?"        must send WWW-Authenticate
                             retry WITH credentials may work
  403  "I know. No."         retry with the same credentials never works
                             (404 instead, if existence is a secret)
```

---

### What they ask next

**"Is GET guaranteed not to change anything?"**
No. Safety is a promise the **method** makes about intent, not something the protocol enforces. A server can be written so that GET deletes a record, and plenty have been, which then breaks badly when a crawler or prefetcher follows the link. The guarantee is contractual, and clients rely on it.

**"Why is 401 called Unauthorized if it means unauthenticated?"**
A naming mistake frozen by compatibility. The specification itself notes that 401 means authentication is required, and 403 is the one about authorization.

**"Why is a bad 301 so dangerous?"**
Because browsers may cache it permanently. Visitors keep being redirected long after the server stops sending it, and there is no way to reach into their caches. Use 302 or 307 unless the move really is permanent.

**"What does forward secrecy actually protect against?"**
An attacker recording traffic now and compromising the server's private key later. With ephemeral Diffie-Hellman the session keys were never transmitted and were discarded, so past sessions stay unreadable. With static RSA, one key compromise retroactively decrypts everything.

**"Why is 0-RTT risky?"**
Because the server cannot bind the data to fresh randomness, so an attacker who captures the first message can replay it. For a GET that is harmless; for anything that changes state it is not, so 0-RTT must be limited to idempotent requests.

**"Does HTTPS hide which site I am visiting?"**
Not fully. The IP address is visible, and the **SNI** field in the ClientHello names the hostname in cleartext so the server can select a certificate. TLS 1.3 encrypted the certificate but not SNI, which is what ECH is for.

**The common wrong answer** is that HTTPS "encrypts traffic", stopping there. Encryption without **authentication** is worthless: you would have a private conversation with whoever intercepted you. The certificate chain is what makes the encryption meaningful.

---

### Say this in the interview

*"An HTTP request has four parts. The request line with the method, the request target including any query string, and the version. The headers, which are metadata, where Host is mandatory in HTTP/1.1 because one IP address serves many sites. An empty CRLF line, which is structurally necessary because it marks where the headers end and the body begins. Then the optional body, with its length from Content-Length or delimited by chunked transfer encoding.*

*Safe means read-only, not intended to change server state: GET, HEAD, OPTIONS and TRACE. Idempotent means repeating the request has the same effect as making it once: those four plus PUT and DELETE. Every safe method is idempotent but not the reverse, and PUT and DELETE prove it, since they change state but repeating leaves the same end state. POST is neither, and PATCH is not necessarily idempotent. The practical consequence is that safety governs caching and prefetching, while idempotency governs automatic retries, which is why payment APIs need an idempotency key for POST. DELETE is idempotent by effect, not response: the first call returns 204 and the second 404, and the state is identical either way.*

*HTTPS is HTTP over TLS on port 443, and it provides confidentiality, integrity and authentication. It is hybrid cryptography: asymmetric for authentication and key exchange, where the server presents a certificate containing its public key signed by a certificate authority and the client validates the chain of trust, the hostname and the dates; and symmetric for the bulk data, with AEAD ciphers like AES-GCM or ChaCha20-Poly1305 because they are far faster. The key exchange is ephemeral elliptic-curve Diffie-Hellman, ECDHE, so the session key never crosses the wire and is discarded afterwards, which gives forward secrecy.*

*TLS 1.3's headline change is one round trip instead of two, because the client guesses the key share in its first message rather than waiting to be told, and there are few enough supported groups that the guess is almost always right. It can also do 0-RTT resumption with a pre-shared key, sending data in the first message, but that data is replayable so it must be limited to safe, idempotent requests. On security, static RSA key exchange is removed so forward secrecy is mandatory, which is the most important change. RC4, 3DES, CBC-mode ciphers, MD5 and SHA-1 signatures, custom Diffie-Hellman groups and compression are all gone, leaving only AEAD ciphers and about five cipher suites. More of the handshake is encrypted, including the certificate, the transcript is signed to prevent downgrades, and renegotiation is replaced by a clean key update. SNI is still cleartext, which is what encrypted client hello, ECH, addresses.*

*On status codes: 301 is a permanent move and browsers cache it aggressively, often indefinitely, so a mistake is very hard to retract, while 302 is temporary and not cached by default. Both historically changed the method to GET when redirecting a POST, which is why 307 Temporary Redirect and 308 Permanent Redirect exist, preserving the method and body. 401 is misnamed and means unauthenticated, so the response must carry WWW-Authenticate and retrying with credentials may work. 403 means the server knows who you are and refuses, so retrying with the same credentials never helps, and some servers answer 404 instead when even the resource's existence is sensitive. The short version is that 401 is who are you, and 403 is I know who you are, and no."*
