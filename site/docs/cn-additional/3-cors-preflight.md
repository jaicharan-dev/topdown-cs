---
id: 3-cors-preflight
title: "CORS & Preflight Requests"
description: "A rule enforced entirely by the browser, the permission request that happens before the real one, and why a wildcard stops working the moment cookies appear"

sidebar_position: 3
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "What is CORS, and why does it exist as a browser security mechanism? Explain what triggers an HTTP `OPTIONS` preflight request, how preflight caching works, and why `Access-Control-Allow-Origin: *` fails when credentials are included."

---

### Picture it

Your browser carries your keys everywhere, and hands them over without asking you.

That is the uncomfortable fact underneath this entire topic. When any page makes a request to your bank, **the browser attaches your bank cookies automatically**, because it has no idea which page asked. So if a malicious site could simply script a request to your bank and **read the reply**, it would read your balance, your statements and your account numbers, from any tab, with no exploit of any kind.

So the browser has a blanket rule: **a page may send a request to another site, but it may not read what comes back.** Notice the shape of that. The request is not blocked. The **answer is withheld from the script**. That distinction explains almost everything that confuses people here.

But that blanket rule is too strict, because plenty of sites genuinely want to let others read their data. So there is an opt-in: **the site being asked can say who is allowed to read its replies.** The browser carries out the request, looks at that permission, and either hands the response to the script or refuses.

**Two refinements, and they are the rest of the question.**

If the request is something unusual, such as deleting a record, the browser does not want to **do** it and then discover it was not allowed. So first it sends a short note asking "**would** you accept a delete from this site, with these headers?" and only proceeds if the answer is yes. Asking before every single request would be absurd, so the answer comes with a "this reply is good for the next two hours".

And the dangerous combination. "Anyone may read my replies" is a reasonable thing for a public noticeboard to say. But the moment the replies depend on **whose keys were attached**, that sentence means "**any website on the internet may read this visitor's private data**", which is exactly the disaster the blanket rule existed to prevent. So the browser simply refuses to accept a blanket "anyone" from a site that is also using your keys. It forces the site to **name** who it trusts.

---

### The proper terms

#### The same-origin policy, which CORS exists to relax

The **same-origin policy**, or SOP, is the browser's foundational isolation rule: a document from one **origin** may not **read** responses from another.

An **origin** is the triple **scheme, host and port**, and all three must match exactly. `https://a.com` and `http://a.com` differ, as do `https://a.com` and `https://api.a.com`, and `https://a.com` and `https://a.com:8443`.

Why it must exist: the browser **attaches cookies automatically** based on the destination, not on who asked. Without the SOP, any page could issue a request to your bank with your session cookie attached and **read the response**.

The crucial precision, and the thing most candidates state wrongly: **the SOP does not stop the request being sent.** It stops the **response being exposed to the script**. The server may well have processed it, which is why **CSRF is a separate problem requiring separate defences**, and why `SameSite` cookies and CSRF tokens exist alongside CORS rather than being made redundant by it.

#### What CORS is

**CORS**, cross-origin resource sharing, is a controlled relaxation of the same-origin policy. The **server** opts in by returning headers that tell the browser which origins may read its responses.

The framing that matters more than the mechanics: **CORS is enforced entirely by the browser, and it is not a server-side security control.** `curl`, a mobile app, a script or any non-browser client ignores it completely. It protects **a user's data from a malicious page**; it does not protect **your server from an attacker**. Treating CORS headers as access control is a genuine and common security mistake, and authentication and authorisation still have to be enforced server-side.

#### Simple requests

A request avoids preflight entirely when it is a **simple request**, meaning **all** of the following hold:

The method is **GET**, **HEAD** or **POST**.

Only CORS-safelisted request headers are set: `Accept`, `Accept-Language`, `Content-Language`, `Content-Type` and a few others.

The `Content-Type`, if present, is one of exactly three values: `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`.

The request is sent immediately, and the browser checks **`Access-Control-Allow-Origin`** on the response before exposing it to the script.

Note the consequence: for a simple request, **the server has already acted** by the time the browser decides to hide the response. The safelist is exactly the set of requests an HTML `<form>` could already make without JavaScript, so CORS deliberately adds no new capability there, and the side effects were always possible.

#### What triggers a preflight

A **preflight** is an automatic `OPTIONS` request the browser sends before the real one, to ask permission. It is triggered by anything outside the simple-request rules:

**A method other than GET, HEAD or POST.** So every `PUT`, `PATCH` and `DELETE` preflights.

**Any non-safelisted header.** `Authorization`, `X-API-Key`, `X-Requested-With` or any custom header.

**`Content-Type: application/json`.** This is the one that matters in practice, and the reason nearly every real API preflights: JSON is not one of the three permitted content types.

**A `ReadableStream` body**, or event listeners registered on an `XMLHttpRequestUpload`.

The preflight carries **`Origin`**, **`Access-Control-Request-Method`** and **`Access-Control-Request-Headers`**, and has **no body**. The server answers, conventionally with **204**, giving **`Access-Control-Allow-Origin`**, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` and optionally **`Access-Control-Max-Age`**.

If the preflight fails, **the real request is never sent at all**, which is the one case where CORS does prevent the server from acting.

#### Preflight caching

Preflighting every request would **double the round trips** for an entire API, so the result is cacheable.

**`Access-Control-Max-Age`** gives a number of seconds for which the browser may reuse the preflight result, keyed by **origin, URL and method**. Within that window the real request goes straight out.

Browsers cap it, and the caps are low enough to be worth knowing: **Chromium allows up to 7200 seconds, two hours**, and Firefox up to 86400, twenty-four hours. A value above the cap is silently reduced, not rejected.

Setting it is one of the cheapest latency wins available on a cross-origin API, because it removes an entire round trip from most requests. The trade is that a change to your allowed methods or headers takes up to that long to reach clients that have cached the old answer.

#### Why the wildcard fails with credentials

**Credentials** means cookies, HTTP authentication, and TLS client certificates. For a cross-origin request to **send** them and for the script to **read** the response, two things are required:

The client must opt in, with `fetch(..., { credentials: 'include' })` or `xhr.withCredentials = true`.

The server must return `Access-Control-Allow-Credentials: true`.

And then the rule: **`Access-Control-Allow-Origin` must be an explicit origin, never `*`.** The browser rejects the combination outright.

The reasoning is the whole point of the question. `Access-Control-Allow-Origin: *` means "**any origin may read my responses**". That is harmless for genuinely public data. But credentials mean the response is **specific to the logged-in visitor**. Permitting both at once would mean **any website on the internet could read any logged-in visitor's private responses from your server**, which is a complete defeat of the same-origin policy and precisely the attack it was built to prevent. The specification therefore forbids the combination, forcing the server to name the origins it actually trusts.

Two related details that follow:

**`Access-Control-Allow-Headers: *` and `Access-Control-Allow-Methods: *` are also not wildcards when credentials are included**, and must be enumerated.

**You must echo the request's `Origin` back after validating it against an allowlist**, and send **`Vary: Origin`**. Without `Vary`, a shared cache can store the response generated for one allowed origin and serve it to another, which turns a caching layer into a cross-origin data leak. Echoing `Origin` back **without** checking it against an allowlist is equivalent to a wildcard that also works with credentials, which is a serious misconfiguration.

Finally, **`Access-Control-Expose-Headers`** controls which **response** headers the script may read. By default only a safelist is visible, `Cache-Control`, `Content-Language`, `Content-Type`, `Expires`, `Last-Modified` and `Pragma`, so a custom header such as `X-Total-Count` is invisible to JavaScript until it is explicitly exposed. This is a frequent cause of "the header is in DevTools but my code cannot see it".

---

### In code

```text
What the same-origin policy actually does:

  page at https://evil.com runs:
      fetch('https://bank.com/balance')

  the browser:
      1. SENDS the request          <- it is NOT blocked
      2. ATTACHES bank.com cookies  <- automatically, as always
      3. receives the response
      4. checks Access-Control-Allow-Origin
      5. no permission -> HIDES the response from the script

  so the server MAY HAVE ACTED. The SOP withholds the ANSWER,
  it does not prevent the REQUEST.

  that is why CSRF is a separate problem needing separate defences:
  SameSite cookies and CSRF tokens, alongside CORS, not replaced by it.
```

```text
An origin is scheme + host + port, and all three must match:

  https://a.com        vs  http://a.com        DIFFERENT (scheme)
  https://a.com        vs  https://api.a.com   DIFFERENT (host)
  https://a.com        vs  https://a.com:8443  DIFFERENT (port)
  https://a.com/x      vs  https://a.com/y     SAME (path is irrelevant)
```

```text
Simple request vs preflighted, by what triggers each:

  SIMPLE (no preflight) requires ALL of:
      method    GET, HEAD or POST
      headers   only CORS-safelisted ones (Accept, Accept-Language,
                Content-Language, Content-Type)
      C-Type    exactly one of:
                  application/x-www-form-urlencoded
                  multipart/form-data
                  text/plain

      ^ this is precisely what an HTML <form> could already send
        without JavaScript, which is why it adds no new capability

  PREFLIGHTED, triggered by ANY of:
      method    PUT, PATCH, DELETE, or anything else
      headers   Authorization, X-API-Key, X-Requested-With, any custom
      C-Type    application/json         <- the one that matters:
                                            nearly every real API
      body      a ReadableStream, or XMLHttpRequestUpload listeners
```

```http
# The preflight, and the answer

OPTIONS /api/orders/42 HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: authorization, content-type
# no body

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 7200
Vary: Origin

# only now does the real DELETE go out.
# if the preflight fails, the real request is NEVER SENT, which is the
# one case where CORS actually stops the server from acting.
```

```text
Preflight caching, and why it is worth setting:

  WITHOUT Access-Control-Max-Age
      every request:  OPTIONS ... 204     <- a whole round trip
                      DELETE  ... 200
      -> you have doubled the round trips of the entire API

  WITH Access-Control-Max-Age: 7200
      first request:  OPTIONS ... 204
                      DELETE  ... 200
      next 2 hours:   DELETE  ... 200     <- preflight skipped

  cached per (origin, URL, method). Browser caps:
      Chromium  7200 s  (2 hours)
      Firefox  86400 s  (24 hours)
  a larger value is silently reduced to the cap, not rejected.

  trade: changing your allowed methods or headers takes up to that
  long to reach clients holding the old answer.
```

```text
Why * and credentials cannot coexist:

  Access-Control-Allow-Origin: *
      = "ANY origin may read my responses"
      fine for genuinely public data

  Access-Control-Allow-Credentials: true
      = "attach this visitor's cookies, and let the script read the
         result"
      so the response is SPECIFIC TO THE LOGGED-IN VISITOR

  both at once would mean:
      ANY WEBSITE ON THE INTERNET may read ANY logged-in visitor's
      private responses from your server

  that is a total defeat of the same-origin policy, and exactly the
  attack it exists to prevent. So the browser REJECTS the combination
  and forces you to NAME the origins you trust.

  the same applies to:
      Access-Control-Allow-Headers: *     not a wildcard with credentials
      Access-Control-Allow-Methods: *     not a wildcard with credentials
```

```javascript
// The correct server-side pattern: validate, echo, and Vary
const ALLOWED = new Set([
  'https://app.example.com',
  'https://admin.example.com',
]);

function cors(req, res) {
  const origin = req.headers.origin;

  if (ALLOWED.has(origin)) {              // VALIDATE against an allowlist
    res.setHeader('Access-Control-Allow-Origin', origin);   // then echo
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  // Vary is NOT optional: without it a shared cache can store the
  // response made for one allowed origin and serve it to another,
  // turning your CDN into a cross-origin data leak.
  res.setHeader('Vary', 'Origin');

  // which response headers JavaScript may READ. By default only
  // Cache-Control, Content-Language, Content-Type, Expires,
  // Last-Modified and Pragma are visible.
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
}

// NEVER do this:
//   res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
// with no allowlist check. That is a wildcard that ALSO works with
// credentials, which is strictly worse than '*'.
```

---

### What they ask next

**"Does CORS protect my server?"**
No. It is enforced by the browser only, so `curl`, a mobile app or any script ignores it entirely. It protects a **user's data from a malicious page**. Authentication and authorisation must still be enforced server-side, and treating CORS headers as access control is a real security mistake.

**"Why does my `POST` work but my `PUT` fail?"**
Because `POST` with a form content type is a simple request and goes straight out, while `PUT` always preflights. The failure is usually that the server does not handle `OPTIONS`, or does not list `PUT` in `Access-Control-Allow-Methods`.

**"Why does sending JSON trigger a preflight?"**
Because `application/json` is not among the three safelisted content types, which are form-urlencoded, multipart and text/plain. Those three are exactly what an HTML form could send already, and JSON is not, so it needs permission.

**"If CORS blocks the response, was the request still made?"**
For a simple request, yes, and the server may have acted on it. Only a **failed preflight** prevents the real request from being sent. This is the precise reason CORS is not a CSRF defence.

**"Why do I need `Vary: Origin`?"**
Because the response differs depending on the request's `Origin`. Without `Vary`, a shared cache or CDN can serve the response generated for one permitted origin to a different one, leaking it. It is required whenever you echo the origin back.

**"Why can my code not read a response header that I can see in DevTools?"**
Because only a small safelist of response headers is exposed to scripts by default. Anything else, such as `X-Total-Count` or a pagination header, must be named in `Access-Control-Expose-Headers`.

**"What is the risk of echoing `Origin` back?"**
If you echo it without checking an allowlist, every origin is allowed **and** credentials work, which is strictly worse than `*`, since `*` at least cannot be combined with credentials. It is a common and severe misconfiguration.

**The common wrong answer** is "CORS blocks cross-origin requests". It does not block requests; it **withholds responses from scripts**, except when a preflight fails. Getting that backwards leads straight to believing CORS prevents CSRF, which it does not.

---

### Say this in the interview

*"CORS exists to relax the same-origin policy, so I would start with that. The same-origin policy says a document from one origin may not read responses from another, where an origin is scheme, host and port and all three must match. It exists because the browser attaches cookies automatically based on the destination rather than on who asked, so without it any page could request your bank with your session cookie attached and read the response. The precision that matters is that the same-origin policy does not stop the request being sent, it stops the response being exposed to the script, which is exactly why CSRF is a separate problem needing SameSite cookies and CSRF tokens.*

*CORS is a controlled opt-in where the server returns headers naming which origins may read its responses. The framing I would stress is that it is enforced entirely by the browser and is not a server-side security control: curl, a mobile app or any script ignores it completely. It protects a user's data from a malicious page, not your server from an attacker, so authentication and authorisation still have to be enforced server-side.*

*A request skips preflight when it is a simple request, which requires the method to be GET, HEAD or POST, only CORS-safelisted headers, and a Content-Type of form-urlencoded, multipart or text/plain. That set is precisely what an HTML form could already send without JavaScript, so it grants no new capability. Anything outside it preflights: any other method, so every PUT, PATCH and DELETE; any non-safelisted header like Authorization or a custom one; Content-Type application/json, which is the one that matters because nearly every real API uses it; and a streaming body or upload listeners.*

*The preflight is an automatic OPTIONS request carrying Origin, Access-Control-Request-Method and Access-Control-Request-Headers, with no body. The server answers, conventionally 204, with Access-Control-Allow-Origin, Allow-Methods, Allow-Headers and optionally Max-Age. If the preflight fails the real request is never sent, which is the one case where CORS actually stops the server acting; for a simple request the server has already acted by the time the browser hides the response.*

*Preflighting every request would double the round trips of an API, so Access-Control-Max-Age caches the result for a number of seconds, keyed by origin, URL and method. Browsers cap it, Chromium at 7200 seconds and Firefox at 86400, and a larger value is silently reduced rather than rejected. It is one of the cheapest latency wins on a cross-origin API, and the trade is that changing your allowed methods or headers takes that long to reach clients holding the cached answer.*

*On the wildcard: credentials means cookies, HTTP auth and TLS client certificates, and sending them cross-origin needs the client to opt in with credentials include or withCredentials, plus Access-Control-Allow-Credentials true from the server. With that, Access-Control-Allow-Origin must be an explicit origin and the browser rejects an asterisk outright. The reason is that the asterisk means any origin may read my responses, which is fine for public data, while credentials mean the response is specific to the logged-in visitor. Allowing both would mean any website on the internet could read any logged-in visitor's private responses from your server, which is a total defeat of the same-origin policy. So the spec forbids it and forces you to name the origins you trust. The same applies to Allow-Headers and Allow-Methods, which are not wildcards when credentials are included.*

*In practice that means validating the request's Origin against an allowlist and echoing it back, plus sending Vary: Origin, because without Vary a shared cache can serve the response made for one permitted origin to another and leak it. Echoing Origin back without an allowlist check is strictly worse than the asterisk, since it is a wildcard that also works with credentials. And separately, Access-Control-Expose-Headers controls which response headers JavaScript can read, since by default only a small safelist is visible, which is why a custom header shows in DevTools but is invisible to the code."*
