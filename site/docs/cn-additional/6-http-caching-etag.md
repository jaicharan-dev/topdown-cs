---
id: 6-http-caching-etag
title: "HTTP Caching, ETags & 304 Not Modified"
description: "Two separate savings, one that skips the network entirely and one that skips only the body"

sidebar_position: 6
sidebar_class_name: sidebar-easy
---

<span className="badge badge--success margin-bottom--md">Easy</span>

> **Interview Question:** "What is HTTP caching, and how do `Cache-Control` directives and ETags work together to eliminate redundant data transfer? What is the critical difference between `no-cache` and `no-store`, and what does an HTTP `304 Not Modified` response signify?"

---

### Picture it

You keep a copy of the price list on your desk so you do not have to telephone the supplier every time somebody asks.

**The best outcome is not telephoning at all.** The supplier told you "this list is good until Friday", so until Friday you simply read your copy. No call, no waiting. This is the big saving, and it is the one people forget to design for.

**The second-best outcome is a very short call.** It is Saturday now, so your copy is out of date. You telephone and say "**I have the version marked 7c3f**, is that still current?" and they say "**yes**" and hang up. You did make a call, so you waited, but **they did not read you the whole price list**. You keep using the copy on your desk.

That one-word answer is worth noticing. It did not give you anything. It gave you **permission to keep using what you already had**, which is the entire point.

**And then there is the thing people get wrong.** There are two very different instructions you might be given about the list.

"**Check with me before each use**" means keep your copy, just ring first. You still save the reading-out, which is almost all of the cost.

"**Do not write this down at all**" means something else entirely: this is confidential, there must be no copy on your desk, in your drawer, or in the shared filing cabinet down the hall.

These sound similar and mean opposite things, and the first one is **named in a way that sounds like the second**. People reach for "do not keep" and actually say "check first", and a copy of someone's bank statement sits on disk in a shared cache, perfectly retrievable.

---

### The proper terms

#### Two different savings

HTTP caching has **two mechanisms**, and conflating them is the usual source of confusion. They save different things.

**Freshness avoids the network entirely.** While a cached response is **fresh**, the cache serves it with **zero round trips**. This is the large win.

**Validation avoids the body only.** Once a response is **stale**, the cache makes a **conditional request** asking whether anything changed. A round trip is still paid, but if nothing changed no body is transferred.

So the hierarchy is: **fresh is free, validated is cheap, a full fetch is expensive.** A well-designed system pushes as much traffic as possible into the first category.

#### Cache-Control, for freshness

**`Cache-Control`** is the modern directive header, superseding **`Expires`**, which used an absolute date and was vulnerable to clock skew.

The directives worth knowing:

**`max-age=N`.** Fresh for N seconds from the response. The primary freshness control.

**`s-maxage=N`.** Overrides `max-age` **for shared caches** only, letting a CDN hold something longer than a browser does.

**`public`** and **`private`.** `private` means **only a browser may store it**, not a CDN or proxy. This is how you mark user-specific responses so they are never served to the wrong person.

**`no-cache`.** The cache **may store** the response but must revalidate before each reuse.

**`no-store`.** The response must not be written down anywhere.

**`must-revalidate`.** Once stale, the cache may not serve it even if the origin is unreachable, where normally stale-on-error is allowed.

**`immutable`.** The content will never change at this URL, so do not revalidate even on a reload. Used with content-hashed filenames.

**`stale-while-revalidate=N`.** Serve the stale copy **immediately** and refresh in the background, so the user never waits for the revalidation.

#### no-cache versus no-store

This is the difference the question singles out, and the names are genuinely misleading.

**`no-cache` does not mean "do not cache".** It means **store it, but revalidate before every use**. You keep the copy and send a conditional request each time, so you still get `304` responses and save the entire body transfer. It is the right directive for content that changes unpredictably and must always be current, such as an HTML page whose contents depend on deployment.

**`no-store` means do not store it anywhere**: not on disk, not in memory, not in a proxy, not in a CDN. It is for genuinely sensitive responses, such as banking details, personal data, or authentication responses.

The practical consequence, and why interviewers ask: **people reach for `no-cache` intending `no-store`**, and sensitive responses end up written to disk and to any intermediary cache in the path, fully retrievable afterwards. The correct header for a page showing someone's account details is:

```text
Cache-Control: no-store
```

and for a page that must be current but is not sensitive:

```text
Cache-Control: no-cache
```

Only one of those is a privacy control.

#### ETags and validators

A **validator** lets the server answer "has this changed?" without sending the body. There are two.

**`Last-Modified`**, a timestamp, paired with the request header **`If-Modified-Since`**. Its weaknesses are real: it has **one-second granularity**, so two changes in the same second are invisible; a rebuild or a file restore changes the timestamp **without changing the content**, forcing a pointless full transfer; and dynamically generated content often has no meaningful modification time at all.

**`ETag`**, an **opaque validator** the server assigns to a specific representation, paired with the request header **`If-None-Match`**. It is usually a hash of the content or a version number, and because it is derived from the content rather than the clock it is strictly more precise.

ETags come in two strengths:

**Strong**, written `"abc123"`, meaning byte-for-byte identical.

**Weak**, written `W/"abc123"`, meaning semantically equivalent but possibly differing in bytes, for instance after a whitespace change. Weak validators cannot be used for **range requests**, since those need byte-level identity.

The two work together rather than as alternatives: `Cache-Control` decides **how long you can avoid asking**, and the ETag decides **how cheap it is when you do ask**.

#### 304 Not Modified

A **`304 Not Modified`** response means **your cached copy is still valid; reuse it**.

Its defining property: it carries a **status line and headers, and no body at all**. On a 200 KB response that is a saving of essentially the whole payload, reduced to a few hundred bytes.

What a 304 actually does:

**It transfers no body**, which is the saving.

**It still costs a round trip**, which is the limitation. Validation is cheaper than fetching, but it is not free, and on a high-latency mobile connection a page making forty validation requests is still slow.

**It refreshes the cache's freshness information** from the headers it carries, so a new `max-age` restarts the fresh period and subsequent requests skip the network entirely again.

The sequence is: the cache sends `If-None-Match: "abc123"`, and the server compares against the current representation. If it matches, **304** with no body. If not, **200** with the new body and a new `ETag`.

#### Getting the most out of it

The pattern that eliminates both costs, used by every modern build pipeline:

**Give static assets content-hashed URLs**, such as `app.4f2a9c.js`, and serve them with `max-age=31536000, immutable`. The content at that URL can never change, so the browser never revalidates. A deployment produces a **new filename**, which has no cache entry and is fetched fresh. There is nothing to invalidate, ever.

**Serve the HTML that references them with `no-cache`**, so the entry point is always revalidated and always points at the current asset names.

Two supporting headers:

**`Vary`** names the request headers the response depends on, such as `Accept-Encoding` or `Origin`, so a cache does not serve a gzip response to a client that did not ask for one.

**`If-Match`** is the ETag's other use: an **optimistic concurrency** check on writes. Sending `If-Match: "abc123"` on a `PUT` makes the server return **`412 Precondition Failed`** if the resource has changed since you read it, which is the lost-update fix expressed over HTTP.

---

### In code

```text
The three outcomes, cheapest first:

  FRESH          cache serves it directly
                 0 round trips, 0 bytes          <- the big win
                 Cache-Control: max-age=3600

  VALIDATED      conditional request -> 304
                 1 round trip, ~200 bytes        <- still cheap
                 no body transferred

  FULL FETCH     200 with the whole body
                 1 round trip, the entire payload

  a well-designed system pushes as much traffic as it can into
  the first row. Most people only design for the second.
```

```http
# First request
GET /api/products HTTP/1.1

HTTP/1.1 200 OK
Cache-Control: max-age=60
ETag: "a7f3c1d9"
Content-Length: 204800

[...200 KB of body...]

# Within 60 seconds: NO REQUEST IS MADE AT ALL. Served from cache.

# After 60 seconds, the cache revalidates:
GET /api/products HTTP/1.1
If-None-Match: "a7f3c1d9"

HTTP/1.1 304 Not Modified
Cache-Control: max-age=60
ETag: "a7f3c1d9"
# NO BODY.

# 200 KB -> a couple of hundred bytes, and the max-age restarts,
# so the next 60 seconds skip the network entirely again.
```

```text
no-cache vs no-store, which sound alike and mean opposite things:

  Cache-Control: no-cache
      MAY be stored, MUST be revalidated before every use
      -> you keep the copy, you just ask first
      -> you still get 304s and still save the whole body
      -> right for content that must be current but is not secret

  Cache-Control: no-store
      MUST NOT be written anywhere:
          not to disk, not to memory, not to a proxy, not to a CDN
      -> right for bank details, personal data, auth responses

  the trap: people reach for no-cache INTENDING no-store, and a
  bank statement ends up on disk and in every intermediary cache
  along the path, fully retrievable afterwards.

  only ONE of these is a privacy control.
```

```text
Why ETags beat Last-Modified:

  Last-Modified / If-Modified-Since
     1-second granularity    two changes in one second are invisible
     a rebuild or restore    changes the timestamp WITHOUT changing
                             the content -> a pointless full transfer
     generated content       often has no meaningful mtime at all

  ETag / If-None-Match
     derived from the CONTENT (a hash or a version), not the clock
     "a7f3c1d9"      STRONG: byte-for-byte identical
     W/"a7f3c1d9"    WEAK:   semantically equivalent, bytes may differ
                             (cannot be used for range requests, which
                              need byte-level identity)

  and they are not alternatives to Cache-Control, they are partners:
     Cache-Control -> how long you can avoid asking
     ETag          -> how cheap it is when you do ask
```

```text
The pattern that removes BOTH costs:

  STATIC ASSETS, content-hashed filenames
      GET /static/app.4f2a9c.js
      Cache-Control: max-age=31536000, immutable
      -> never revalidated, not even on a reload
      -> a deploy produces app.9b1e77.js, a NEW URL with no cache
         entry, fetched fresh
      -> there is NOTHING TO INVALIDATE, ever

  THE HTML THAT REFERENCES THEM
      GET /index.html
      Cache-Control: no-cache
      -> always revalidated (a cheap 304 when unchanged)
      -> so it always points at the current asset names

  entry point revalidated, everything it references free.
```

```http
# ETags also do optimistic concurrency on WRITES
GET /api/orders/42 HTTP/1.1

HTTP/1.1 200 OK
ETag: "v11"

# ... the user edits ...

PUT /api/orders/42 HTTP/1.1
If-Match: "v11"

HTTP/1.1 412 Precondition Failed
# somebody else changed it since you read it.
# This is the lost-update fix, expressed over HTTP.
```

```http
# Vary: what the cached response actually depends on
HTTP/1.1 200 OK
Cache-Control: max-age=600
Vary: Accept-Encoding, Origin
# without this, a cache can serve a gzip body to a client that did
# not ask for one, or one origin's CORS response to another origin
```

---

### What they ask next

**"Does a 304 save a round trip?"**
No, and this is the point people miss. It saves the **body**, not the request. Only **freshness** saves the round trip. A page making forty validation requests is still slow on a high-latency connection, however small each 304 is.

**"Which is more efficient, ETag or Last-Modified?"**
ETag, because it is derived from the content rather than the clock. `Last-Modified` has one-second granularity and changes when a file is rebuilt or restored without its content changing, which forces a full transfer for nothing.

**"What is the difference between a strong and a weak ETag?"**
A strong ETag asserts byte-for-byte identity; a weak one, prefixed `W/`, asserts semantic equivalence only. Range requests need a strong validator, since they depend on exact byte offsets.

**"How do you invalidate a cached asset?"**
Ideally you never have to. Change the **URL** by content-hashing the filename, so the new version has no cache entry at all and the old one simply ages out. Purging a CDN is slower, propagates unevenly, and only exists for cases where the URL cannot change.

**"Why do I need `Vary`?"**
Because the response depends on request headers. Without `Vary: Accept-Encoding` a cache can hand a gzip body to a client that cannot decode it, and without `Vary: Origin` it can serve one origin's CORS response to another, which is a cross-origin leak.

**"What does `stale-while-revalidate` do?"**
It lets the cache serve the stale copy **immediately** while fetching a fresh one in the background, so the user never waits for the revalidation. It trades a brief window of slightly stale content for the removal of the latency spike at expiry.

**"What should a page showing a user's account details send?"**
`Cache-Control: no-store`, and `private` is not enough on its own. `no-cache` would still permit the response to be written to disk and to intermediary caches, which is exactly what you are trying to prevent.

**The common wrong answer** is explaining ETags and 304s and stopping there, as though caching **is** validation. Validation is the consolation prize. The real win is **freshness**, where no request happens at all, and a design that revalidates everything has left most of the benefit on the table.

---

### Say this in the interview

*"HTTP caching has two mechanisms that save different things, and conflating them is where the confusion comes from. Freshness avoids the network entirely: while a response is fresh the cache serves it with zero round trips, which is the large win. Validation avoids only the body: once stale, the cache makes a conditional request, so a round trip is still paid but nothing is transferred if nothing changed. So fresh is free, validated is cheap, and a full fetch is expensive, and a good design pushes as much traffic as possible into the first category.*

*Cache-Control governs freshness and supersedes Expires, which used an absolute date and suffered from clock skew. max-age gives the freshness lifetime in seconds. s-maxage overrides it for shared caches, so a CDN can hold something longer than a browser. private means only a browser may store it, never a CDN or proxy, which is how you mark user-specific responses. must-revalidate forbids serving stale even when the origin is unreachable. immutable means never revalidate, used with content-hashed filenames. And stale-while-revalidate serves the stale copy immediately while refreshing in the background, so the user never waits.*

*The difference between no-cache and no-store is that no-cache does not mean do not cache: it means store it but revalidate before every use, so you keep the copy and just ask first, and you still get 304s and still save the whole body. no-store means do not write it anywhere, not to disk, memory, a proxy or a CDN. The practical trap is that people reach for no-cache intending no-store, and a bank statement ends up written to disk and to every intermediary cache in the path, fully retrievable. Only one of them is a privacy control, so an account details page needs no-store.*

*Validators let the server answer has this changed without sending the body. Last-Modified with If-Modified-Since is a timestamp, and its weaknesses are real: one-second granularity hides two changes in the same second, a rebuild or restore changes the timestamp without changing the content and forces a pointless full transfer, and generated content often has no meaningful modification time. An ETag with If-None-Match is an opaque validator derived from the content, usually a hash or version, so it is strictly more precise. A strong ETag asserts byte-for-byte identity and a weak one, written with a W slash prefix, asserts only semantic equivalence and cannot be used for range requests, which need exact byte offsets. The two headers are partners rather than alternatives: Cache-Control decides how long you can avoid asking, and the ETag decides how cheap it is when you do ask.*

*A 304 Not Modified means your cached copy is still valid, reuse it. It carries a status line and headers and no body at all, so a 200 kilobyte response becomes a couple of hundred bytes. But it still costs a round trip, which is the limitation: validation is cheaper than fetching but not free, so a page making forty validation requests is still slow on a high-latency link. It also refreshes the cache's freshness from the headers it carries, so a new max-age restarts the fresh period and later requests skip the network again.*

*The pattern that removes both costs is content-hashed asset URLs served with max-age of a year and immutable, so they are never revalidated and a deploy produces a new filename with no cache entry, meaning there is nothing to invalidate ever, with the HTML that references them served no-cache so the entry point is always current. Two supporting headers: Vary names the request headers the response depends on, so a cache does not serve a gzip body to a client that did not ask or one origin's CORS response to another; and If-Match is the ETag's other use, an optimistic concurrency check on writes that returns 412 Precondition Failed if the resource changed since you read it, which is the lost-update fix over HTTP."*
