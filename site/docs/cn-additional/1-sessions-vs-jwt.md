---
id: 1-sessions-vs-jwt
title: "Cookie Sessions vs JWT Authentication"
description: "Who holds the state, what you give up to stop holding it, and why most production JWT systems quietly take it back"

sidebar_position: 1
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "Compare cookie-based session authentication with token-based authentication (JWT). Where is state stored in each approach, what is the architectural tradeoff between horizontal scalability and instantaneous revocation, and how do production systems mitigate JWT revocation and XSS vulnerabilities?"

---

### Picture it

Two ways of letting people back into a building without checking their documents every time.

**A cloakroom ticket.** You check in at the desk, they write your details in a book and hand you a numbered tag. The tag says nothing except "4471". Every time you pass a door, the guard reads the tag, **telephones the desk**, and the desk looks you up in the book.

**A signed pass.** They write your name, your access level and an expiry time on a card, and **sign it**. Every guard knows the signature. Now the guard reads the card and checks the signature, and **never telephones anybody**.

The pass is obviously better until you ask one question: **how do you cancel it?**

With the tag, you cross out line 4471 in the book and the next telephone call reveals it. Instant, everywhere.

With the pass, you cannot. The card is in their pocket, the signature is still valid, and no guard is calling anyone. The only honest answers are **wait for it to expire**, or **give every guard a list of cancelled cards to check**, which means they are telephoning the desk again, and you have rebuilt the thing you were avoiding.

That is the entire trade, and it is not really "scalable versus not scalable". It is **where the state lives**. The tag puts it at the desk; the pass puts it in the holder's pocket. Everything else follows.

**And one last thing about the card.** It is **signed**, not sealed. Anybody who picks it up can read every word on it. Signing proves it was not forged; it does nothing to keep it private.

---

### The proper terms

#### Cookie sessions

The server generates an **opaque session identifier**, a long random string with **no meaning of its own**, stores the actual session state **server-side**, and returns the identifier in a **cookie**.

The browser sends the cookie automatically on every request. The server looks the identifier up in its session store, which is memory, **Redis**, or a database, and loads the associated user.

**State lives on the server.** The cookie is only a pointer.

Consequences:

**Revocation is instantaneous.** Deleting the session row logs the user out on the very next request, with no delay.

**Data stays private**, because the client holds a meaningless identifier and never sees the claims.

**The identifier is small**, typically 32 bytes, so per-request overhead is negligible.

**Every request costs a lookup**, which is usually a sub-millisecond Redis read, but it is a dependency on the path of every authenticated request.

**Horizontal scaling needs shared state.** Any server handling the request must reach the same session store, so you need a shared store, or **sticky sessions**, which unbalance load and lose sessions when a node dies.

#### JWT

A **JWT**, JSON Web Token, is a **self-contained signed token**. Three base64url-encoded parts separated by dots: a **header** naming the algorithm, a **payload** of **claims**, and a **signature**.

Standard claims are worth naming: **`sub`** the subject, **`exp`** expiry, **`iat`** issued at, **`iss`** issuer, **`aud`** audience and **`jti`** a unique token identifier.

The signature is either an **HMAC** with a shared secret, **HS256**, or an **asymmetric signature** with a private key, **RS256** or **ES256**. Asymmetric is the right choice when several services must verify but only one should issue, since verifiers need only the public key.

**State lives in the token, held by the client.** The server verifies the signature and trusts the claims, **with no lookup at all**.

The point that must be stated, because it is the most common misunderstanding: **a JWT is signed, not encrypted.** The payload is plainly readable by anyone holding the token. Signing provides **integrity and authenticity**, never **confidentiality**. Encrypting a token requires **JWE**, which is a different thing. So you never put anything secret in a JWT.

Consequences:

**No per-request lookup**, so verification is pure CPU and any server can do it independently.

**Horizontal scaling is trivial**, with no shared session store and no sticky sessions, which is the main reason people reach for it.

**Revocation is impossible before expiry**, because nothing is consulted.

**Claims go stale.** A role or permission change does not take effect until the token expires, so a demoted user keeps their old access for the remaining lifetime.

**Every request carries the whole payload**, so a fat token costs bandwidth on every call.

#### The real trade-off

The clean framing: **cookie sessions trade a lookup for control; JWTs trade control for the absence of a lookup.**

And the honest observation that distinguishes a good answer: **the stateless benefit is frequently illusory.** The moment you need "log out everywhere", "ban this user now" or "revoke on password change", you add a denylist or a version check, and that is a lookup on every request. You have reintroduced the state and kept the inability to update claims.

So the sensible rule: sessions for first-party web applications, where a shared Redis is easy and immediate revocation matters; JWTs for service-to-service and distributed authorisation, where there is no shared store and short lifetimes are acceptable.

#### Mitigating JWT revocation

**Short-lived access tokens plus a long-lived refresh token.** The standard pattern and the one to lead with. The access token lives 5 to 15 minutes and is never checked against a store; the **refresh token is long-lived and stored server-side**, so it **is** revocable. Revoking the refresh token means the user is locked out once the access token expires, bounding the damage to the access token's lifetime. You accept a window rather than eliminating it.

**A denylist of revoked `jti` values**, held until each token's natural expiry so the list stays bounded. This genuinely revokes immediately and costs a lookup per request, which is the state you were avoiding.

**Token versioning.** Store a `token_version` per user, include it as a claim, and increment it on logout, password change or permission change. Verification compares the claim against the user's current version, which is one cheap, highly cacheable read and invalidates **every** token for that user at once.

**Rotating refresh tokens with reuse detection.** Each refresh issues a new refresh token and invalidates the old one. If an already-used refresh token is presented, that indicates theft, so the entire **token family** is revoked. This turns theft into something detectable rather than silent.

**Short signing-key rotation**, so that even a leaked key has a bounded blast radius.

#### Storage and XSS

Where the token is kept decides what an attacker can do with it.

**`localStorage` is readable by any JavaScript on the page.** A single **XSS** flaw exfiltrates the token in one line, and the attacker then has it **off** your site, usable from anywhere until expiry. This is why storing tokens there is discouraged.

**An `httpOnly` cookie is not readable by JavaScript at all**, so XSS cannot exfiltrate it. Combined with **`Secure`**, which restricts it to HTTPS, and **`SameSite`**, this is the recommended storage **for JWTs as well as session identifiers**. The token being a JWT does not oblige you to keep it somewhere dangerous.

**Cookies are sent automatically, which creates CSRF.** The mitigations are `SameSite=Lax` or `Strict`, which stops the cookie being sent on cross-site requests, and a **CSRF token**, commonly the double-submit pattern, for cases `SameSite` does not cover.

The nuance that shows real understanding: **`httpOnly` prevents exfiltration, not abuse.** With an XSS foothold the attacker can simply make requests from the victim's page, and the cookie is attached automatically. They cannot steal the credential, but they can use it for as long as the page is open. So `httpOnly` limits the blast radius, and the actual fix for XSS is **output encoding and a strict Content Security Policy**.

Two token-specific attacks also belong in the answer. The `alg: none` attack, where a library is tricked into accepting an unsigned token, and **algorithm confusion**, where a token signed with HMAC using the public key as the secret is accepted by a server expecting RS256. Both are defeated the same way: **pin the expected algorithm on the server** rather than trusting the token's own header.

---

### In code

```text
Where the state lives, which is the whole question:

  COOKIE SESSION                      JWT
  --------------                      ---
  client holds: "s=a9f3c1..."         client holds: the whole payload
                an opaque pointer                   plus a signature

  server holds: the session row       server holds: NOTHING
                {user: 42, role: ...}               just a verifying key

  per request:  look it up            per request:  verify the signature
                (Redis, ~0.3 ms)                    (CPU only, no I/O)

  to revoke:    DELETE the row        to revoke:    ...you cannot.
                effective instantly                 wait for exp, or add
                                                    a lookup back in
```

```text
A JWT, decoded. Note that you can read it without any key:

  eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9      <- header
  .eyJzdWIiOiI0MiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTczMH0
                                             <- payload, PLAINLY READABLE
  .MEUCIQDf8s...                             <- signature

  header   { "alg": "RS256", "typ": "JWT" }
  payload  { "sub": "42", "role": "admin", "exp": 1730000000,
             "iat": ..., "iss": ..., "aud": ..., "jti": "..." }

  SIGNED, NOT ENCRYPTED. Anyone holding the token reads every claim.
  Signing gives integrity and authenticity, never confidentiality.
  For confidentiality you need JWE, which is a different mechanism.
  So: never put anything secret in a JWT.
```

```text
The trade, stated plainly:

  COOKIE SESSION                      JWT
  revocation      INSTANT             impossible before exp
  claims          always current      STALE until exp
                                      (a demoted user keeps access)
  per-request I/O one lookup          none
  scaling         needs shared store  any server verifies alone
                  or sticky sessions
  payload size    ~32 bytes           the whole claim set, every request
  privacy         claims never leave  claims readable by the holder
                  the server

  sessions trade a LOOKUP for CONTROL
  JWTs     trade CONTROL for the absence of a lookup

  and the honest part: the moment you need "log out everywhere" or
  "ban this user now", you add a denylist, which IS a lookup. You have
  reintroduced the state AND kept the stale-claims problem.
```

```text
Mitigating revocation, in the order you would actually reach for them:

  1. SHORT ACCESS + SERVER-SIDE REFRESH        (the standard pattern)
        access token   5-15 min, never looked up
        refresh token  long-lived, STORED SERVER-SIDE, so revocable
        revoke the refresh -> locked out once the access token expires
        -> you accept a WINDOW rather than eliminating it

  2. DENYLIST OF jti                           (real revocation, with a cost)
        keep revoked jti until its own exp, so the list stays bounded
        -> immediate, and it is a lookup per request

  3. TOKEN VERSIONING                          (cheap and broad)
        store token_version per user, include it as a claim
        bump it on logout / password change / permission change
        -> one cheap cacheable read, invalidates ALL that user's tokens

  4. ROTATING REFRESH + REUSE DETECTION        (theft becomes visible)
        each refresh issues a new one and invalidates the old
        an already-used refresh presented again => theft
        -> revoke the whole token FAMILY

  5. SHORT SIGNING-KEY ROTATION                (bounded key blast radius)
```

```text
Storage, and what an XSS can actually do:

  localStorage.setItem('token', jwt)
      readable by ANY script on the page
      -> one XSS exfiltrates it in a line
      -> the attacker now has it OFF your site, usable anywhere
         until it expires

  Set-Cookie: token=...; HttpOnly; Secure; SameSite=Lax
      HttpOnly  -> JavaScript cannot read it, so XSS cannot STEAL it
      Secure    -> HTTPS only
      SameSite  -> not sent on cross-site requests, which is the CSRF fix
      (plus a CSRF token for what SameSite does not cover)

      this is the right storage for a JWT TOO. Choosing JWT does not
      oblige you to keep it somewhere dangerous.

  the nuance: HttpOnly prevents EXFILTRATION, not ABUSE.
      with an XSS foothold the attacker just makes requests FROM the
      victim's page, and the cookie is attached automatically.
      They cannot steal the credential; they can use it while the
      page is open.
      -> the real fix for XSS is output encoding and a strict CSP.
```

```text
Two JWT-specific attacks, both defeated the same way:

  alg: none
      { "alg": "none" }  with an empty signature
      a careless library accepts it as "validly unsigned"

  algorithm confusion
      server expects RS256 (verify with the PUBLIC key)
      attacker signs with HS256 using THAT PUBLIC KEY as the HMAC secret
      a careless library reads alg from the token and verifies with the
      public key as a shared secret -> it matches

  fix for both: PIN THE EXPECTED ALGORITHM SERVER-SIDE.
  Never let the token's own header choose how it is verified.
```

---

### What they ask next

**"Is a JWT encrypted?"**
No. It is signed. The payload is base64url, not ciphertext, and anyone holding the token can read every claim. Signing gives integrity and authenticity; confidentiality needs JWE. This is the single most common misconception about JWTs.

**"Can you revoke a JWT?"**
Not without adding state. Short expiry plus a revocable server-side refresh token bounds the damage, a `jti` denylist or a per-user token version revokes properly, and all of those put a lookup back on the request path. Claiming JWTs are revocable **and** stateless is the contradiction interviewers listen for.

**"Where should the token be stored?"**
In an `httpOnly`, `Secure`, `SameSite` cookie, including when it is a JWT. `localStorage` exposes it to any XSS, and the token then leaves your origin entirely.

**"If httpOnly stops XSS theft, is XSS solved?"**
No. The attacker can still act as the user by making requests from the compromised page, where the cookie is attached automatically. `httpOnly` stops them taking the credential away; only output encoding and a strict Content Security Policy stop the XSS itself.

**"When is a JWT genuinely the better choice?"**
Service-to-service authorisation, where there is no shared session store and the verifier should not depend on the issuer being reachable; federated systems across organisations; and short-lived, narrowly scoped grants. These are cases where no central store exists to look up, which is the condition the design was actually built for.

**"What is the risk of a long-lived access token?"**
Its lifetime is the revocation window. A one-hour token means a compromised or demoted account retains access for up to an hour, with nothing you can do short of adding a denylist.

**"Why use RS256 rather than HS256?"**
Because HS256 requires every verifier to hold the signing secret, so any service that can verify can also **issue**. RS256 or ES256 lets one service hold the private key while every verifier needs only the public key, which is the correct split in a multi-service architecture.

**The common wrong answer** is "JWTs are stateless and therefore scale better". The real statement is that JWTs **move the state to the client**, and what you buy with that is the absence of a lookup, while what you pay is **revocation and claim freshness**. Most production systems then pay the lookup back to get revocation, which is why the supposed advantage so often evaporates.

---

### Say this in the interview

*"With cookie sessions the server generates an opaque session identifier with no meaning of its own, stores the real session state server-side in memory, Redis or a database, and returns the identifier in a cookie. The browser sends it automatically and the server looks it up on every request. So the state lives on the server and the cookie is just a pointer. That gives instantaneous revocation, since deleting the row logs the user out on the next request; the claims stay private because the client never sees them; and the cookie is tiny. The costs are a lookup on every authenticated request, and horizontal scaling needing a shared store or sticky sessions, which unbalance load and lose sessions when a node dies.*

*A JWT is a self-contained signed token: a base64url header naming the algorithm, a payload of claims like sub, exp, iat, iss, aud and jti, and a signature, which is either an HMAC with a shared secret for HS256 or an asymmetric signature for RS256 or ES256. The server verifies the signature and trusts the claims with no lookup at all, so the state lives in the token, held by the client. The thing I would stress is that a JWT is signed, not encrypted: the payload is plainly readable by anyone holding it, so signing gives integrity and authenticity and never confidentiality, and you would need JWE for that. So nothing secret goes in a JWT.*

*The trade is that sessions trade a lookup for control and JWTs trade control for the absence of a lookup. JWTs scale horizontally with no shared store, but revocation is impossible before expiry because nothing is consulted, and claims go stale, so a demoted user keeps their old permissions until the token expires. And the honest part is that the stateless benefit is often illusory: the moment you need log out everywhere or ban this user now, you add a denylist, which is a lookup on every request, so you have reintroduced the state and kept the stale-claims problem. My rule is sessions for first-party web apps where a shared Redis is easy and immediate revocation matters, and JWTs for service-to-service and federated authorisation where there is no shared store to consult.*

*To mitigate revocation: the standard pattern is short-lived access tokens of five to fifteen minutes plus a long-lived refresh token stored server-side, so the refresh token is revocable and revoking it locks the user out once the access token expires, which bounds the damage to the access token's lifetime rather than eliminating the window. Beyond that, a denylist of revoked jti values kept until each token's own expiry so the list stays bounded, which revokes properly at the cost of a lookup. Token versioning, storing a token_version per user as a claim and bumping it on logout or password change, which is one cheap cacheable read and invalidates every token for that user at once. Rotating refresh tokens with reuse detection, where presenting an already-used refresh token indicates theft and the whole token family is revoked. And short signing-key rotation to bound the blast radius of a leaked key.*

*On XSS, localStorage is readable by any script on the page, so a single XSS exfiltrates the token and the attacker then has it off your site, usable anywhere until expiry. An httpOnly cookie is not readable by JavaScript at all, so combined with Secure and SameSite it is the right storage for a JWT as well as a session identifier; choosing JWT does not oblige you to keep it somewhere dangerous. Cookies being sent automatically creates CSRF, which SameSite Lax or Strict plus a CSRF token addresses. The nuance is that httpOnly prevents exfiltration, not abuse: with an XSS foothold the attacker simply makes requests from the victim's page and the cookie is attached automatically, so they cannot steal the credential but can use it while the page is open, and the real fix for XSS is output encoding and a strict Content Security Policy. Finally, two token-specific attacks, alg none and algorithm confusion where a token is signed with HMAC using the RSA public key as the secret, are both defeated by pinning the expected algorithm server-side rather than trusting the token's own header."*
