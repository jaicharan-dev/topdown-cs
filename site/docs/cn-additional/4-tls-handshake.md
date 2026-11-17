---
id: 4-tls-handshake
title: "TLS Handshake: Encryption, Certificates & MITM Prevention"
description: "Proving who you are, agreeing a key nobody else can reconstruct, and why the old way let an attacker decrypt years of recordings"

sidebar_position: 4
sidebar_class_name: sidebar-hard
---

<span className="badge badge--danger margin-bottom--md">Hard</span>

> **Interview Question:** "Walk through the TLS handshake from TCP establishment to encrypted data transmission. Why does TLS use hybrid encryption, how does TLS 1.3 achieve a 1-RTT handshake compared to TLS 1.2's 2-RTT, why was RSA key exchange banned in TLS 1.3, and how does OCSP stapling prevent MITM attacks?"

---

### Picture it

You want to speak privately to a stranger, in a room full of people who can hear everything, and you have never met.

**First problem: which stranger?** Anybody could claim to be the person you want. So they produce a letter of introduction from someone **you already trust**, naming them and carrying a sample of their handwriting. That alone is not enough, because the letter could have been stolen, so you ask them to **write something new**, right now, in that handwriting. Only the real person can do that.

**Second problem: agreeing a secret, out loud.** There is a trick for this. You each shout out a number derived from a private one you never say. From what you hear plus what you kept, each of you can compute the **same** final number, and nobody listening can, even having heard both halves. You now share a secret you never spoke.

**Third problem: speed.** The trick is slow and clumsy, and you have hours of conversation ahead. So you use it **once**, to agree the secret, and then switch to a simple, fast cipher that uses it. Slow mechanism for the handshake, fast mechanism for the talking.

**And now the historical mistake, which is the heart of the question.**

There used to be a simpler way to agree the secret: you **pick** a number yourself and send it locked in a box that only their key opens. Simpler, and it works.

Except that the box key is **the same key they use for every conversation, for years**. So someone recording every conversation in the room, for a decade, who eventually obtains that one key, by a court order, a break-in, or a bug in the lock, can go back and **open every box they ever recorded**. Ten years of conversations, retrospectively.

The shouting trick does not have this problem, because the private halves were **invented for that one conversation and thrown away**. There is no key to steal afterwards. That is why the simpler way was banned.

**One last thing.** The letter of introduction might have been **withdrawn** since it was written. Asking the issuer about it means telling the issuer everyone you talk to, waiting while they answer, and, worst of all, agreeing to proceed anyway if they do not reply, which means anyone who can intercept the question simply **blocks it**. So instead the stranger is made to carry a **recent, signed note from the issuer** saying the letter is still good. No third party is contacted, and the note's freshness is the stranger's problem.

---

### The proper terms

#### Where the handshake starts

TLS runs **over an established TCP connection**, so the three-way handshake has already cost 1 RTT before TLS begins. In HTTP/3 this is different: **QUIC merges the transport and cryptographic handshakes**, which is the main reason it reaches first byte sooner.

#### The TLS 1.2 handshake, and why it is two round trips

**1. ClientHello.** The client sends a **client random**, its supported TLS versions and **cipher suites**, and extensions including **SNI**, the hostname it wants, **ALPN**, the application protocol, supported_groups and signature_algorithms.

**2. ServerHello and friends.** The server picks a version and cipher suite and sends a **server random**, then its **Certificate** chain, then **ServerKeyExchange** carrying its **ephemeral ECDHE public key** plus a **signature over the two randoms and the key exchange parameters**, then **ServerHelloDone**.

That signature is doing the critical work. It proves the server **holds the private key matching the certificate**, and it binds that proof to **this specific handshake**, so a recorded one cannot be replayed.

**3. The client responds.** It validates the certificate chain, sends **ClientKeyExchange** with its own ephemeral public key, then **ChangeCipherSpec**, then **Finished**, which is a MAC over the entire handshake transcript so any tampering is detected.

**4. The server** sends **ChangeCipherSpec** and its own **Finished**.

**5. Application data flows.**

Count the round trips: ClientHello out and ServerHello back is one; ClientKeyExchange out and the server's Finished back is two. 2 RTT, on top of TCP's one.

The reason it needs two is that the client **cannot guess** which group the server will choose, so it must wait to be told before it can send its key share.

#### The TLS 1.3 handshake, and how it reaches one round trip

**1. ClientHello**, now carrying a **`key_share`**: the client picks a group and sends its ephemeral public key **immediately**, without waiting.

**2. ServerHello** with the server's own `key_share`. Both sides can now derive the shared secret, so everything after this point is encrypted: **EncryptedExtensions**, the **Certificate**, **CertificateVerify**, which is the signature over the transcript, and **Finished**.

**3. The client** sends **Finished** and **may send application data in the same flight**.

1 RTT, and the saving comes from a single design decision: **TLS 1.3 reduced the permitted key exchange groups to a handful**, so a client guessing X25519 or P-256 is almost always right. When the guess is wrong the server sends a **HelloRetryRequest** and the handshake costs 2 RTT, which is the old behaviour as a fallback rather than the norm.

Two further gains worth naming: the certificate is now encrypted, so a passive observer no longer learns which certificate was served, and the transcript is signed, which prevents downgrade attacks. SNI remains in the clear, which is what **ECH**, encrypted client hello, addresses.

**0-RTT resumption** goes further, letting a returning client send application data in its very first flight using a **pre-shared key**. The data is **replayable**, because the server has no fresh randomness to bind it to, so it must be restricted to safe, idempotent requests.

#### Why hybrid encryption

TLS uses **asymmetric cryptography for authentication and key agreement** and symmetric cryptography for the data, because each is good at something the other is not.

**Asymmetric cryptography solves the introduction problem.** You can verify an identity and agree a key with someone you have never met, which symmetric cryptography cannot do, since it requires a key you already share.

**Asymmetric cryptography is far too slow for bulk data**, by roughly two to three orders of magnitude, and it can only operate on small inputs. Encrypting a video stream with RSA is not merely slow, it is structurally wrong.

**Symmetric cryptography is extremely fast**, especially with **AES-NI** hardware instructions, and modern suites are **AEAD**, **AES-GCM** or **ChaCha20-Poly1305**, providing confidentiality and integrity in one pass.

So: pay the expensive mechanism **once**, during the handshake, to establish a key; use the cheap mechanism for **everything afterwards**. The handshake is where identity and agreement happen; the record layer is where the work happens.

#### Why RSA key exchange was banned

Note the distinction first, because candidates conflate them: **RSA as a signature algorithm is still permitted** in TLS 1.3. What was removed is RSA as a key exchange mechanism.

Under static RSA key exchange, the client generated the **premaster secret**, encrypted it with the **server's long-term RSA public key** from the certificate, and sent it. The server decrypted it with its long-term private key.

**The decisive reason: there is no forward secrecy.** The session key is recoverable from the server's long-term private key. So an adversary who records encrypted traffic for years and later obtains that key, through a breach, a legal order, or a vulnerability like **Heartbleed**, can decrypt everything they ever recorded, retroactively. One key compromise undoes a decade of sessions.

With **ephemeral Diffie-Hellman**, **ECDHE**, the key pairs are generated for that single handshake and discarded. The session key was never transmitted and cannot be reconstructed from the long-term key, so recorded sessions stay unreadable. That property is **forward secrecy**, and TLS 1.3 makes ephemeral key exchange **mandatory**, so every TLS 1.3 connection has it.

**The second reason: a twenty-year history of padding oracles.** RSA key exchange used **PKCS#1 v1.5** padding, which is vulnerable to **Bleichenbacher's attack**, where an oracle revealing whether padding is valid lets an attacker recover the premaster secret. Countermeasures were devised repeatedly and defeated repeatedly, culminating in **ROBOT** in 2017, which found major vendors still vulnerable **nineteen years** after the original paper. The construction proved unfixable in practice, and removing it was simpler than defending it.

#### Certificates and how MITM is prevented

A **certificate** binds a **public key** to an **identity**, signed by a **certificate authority**. The client validates a **chain of trust** from the server's certificate up to a **root** already in its **trust store**.

Validation is several checks, and all of them matter:

**Signature chain** up to a trusted root.

**Hostname match** against the **Subject Alternative Name**, not the deprecated Common Name.

**Validity dates**.

**Key usage and extended key usage**.

**Revocation status**.

Now the attack. A man in the middle intercepts the connection and must present **some** certificate. Three cases:

**Their own self-signed certificate** fails the chain check.

**A valid certificate for a different hostname**, one they legitimately control, fails the hostname check.

**The real server's certificate**, which they can copy freely since it is public, fails at the **proof of possession**. In TLS 1.3 the server must send **CertificateVerify**, a signature over the handshake transcript using the **private key**; in TLS 1.2 the ServerKeyExchange signature does the same. The attacker does not have that private key, so they cannot produce it, and the handshake fails.

So interception requires either **a trusted CA issuing a certificate they should not have** or **a stolen private key**. Both have happened: **DigiNotar in 2011** was compromised and issued a fraudulent certificate for Google, and corporate interception works by installing a root certificate on managed machines, which is the same mechanism with the user's organisation as the attacker.

The defences above the chain itself:

**Certificate Transparency.** Every issued certificate is logged in public append-only logs, and Chrome requires **SCTs**, signed certificate timestamps, proving inclusion. Mis-issuance becomes publicly detectable rather than silent, which is the main structural answer to the DigiNotar class of attack.

**CAA records**, DNS records naming which CAs may issue for a domain.

**HSTS**, which removes the initial plaintext request an attacker would otherwise downgrade and intercept.

#### OCSP and OCSP stapling

A certificate may need to be revoked before expiry, typically because the private key was compromised. **CRLs**, certificate revocation lists, are large and stale, so **OCSP**, the Online Certificate Status Protocol, was introduced: the client asks the CA's **responder** whether a specific serial number is still valid.

Client-side OCSP has three serious problems:

**Privacy.** The client tells the CA **every site it visits**, since it must name the certificate it is checking.

**Latency.** An extra DNS lookup, TCP connection and HTTP request to a **third party**, on the path of every new connection.

**Soft-fail, which is fatal.** If the responder is unreachable, browsers **proceed anyway**, because failing hard would make any CA outage break large parts of the web. But that means **an attacker who can intercept the connection can simply block the OCSP request**, and the browser continues. Against exactly the adversary revocation was meant to stop, client-side OCSP is **close to worthless**.

**OCSP stapling** inverts the direction. The **server** periodically fetches a **signed, timestamped OCSP response** from the CA and **attaches it to its own handshake**, through the **`status_request`** extension, as CertificateStatus in TLS 1.2 or an extension to the Certificate message in TLS 1.3.

This fixes all three problems:

**No privacy leak**, because the client never contacts the CA.

**No extra round trip**, since the proof arrives inside the handshake already happening.

**Freshness becomes the server's responsibility**, and the response is signed by the CA, so the server cannot forge it.

But stapling alone is **still not a defence**, and this is the part worth getting right: an attacker with a revoked certificate simply does not staple anything, and the client, seeing no staple, falls back to its usual soft-fail behaviour.

**OCSP Must-Staple** closes that hole. It is an extension **inside the certificate** declaring that this certificate **must** be presented with a valid staple. A missing staple then becomes a **hard failure** rather than a shrug. Only with Must-Staple does stapling genuinely prevent the attack, because it converts a silent omission into a refusal to connect.

The modern direction is to reduce reliance on revocation altogether: **short-lived certificates**, now down to months and heading shorter, limit the window a compromised key is useful, and browsers ship curated revocation sets, Chrome's **CRLSets** and Firefox's **CRLite**, pushed with the browser so no live query is needed.

---

### In code

```text
TLS 1.2, two round trips before any data:

  (TCP 3-way handshake already cost 1 RTT)

  client --- ClientHello ----------------------------->
             client random, versions, cipher suites,
             SNI, ALPN, supported_groups
                                                        RTT 1
         <-- ServerHello ------------------------------
             server random, chosen suite
             Certificate (the chain)
             ServerKeyExchange  <- ephemeral ECDHE public key
                                   + SIGNATURE over both randoms
                                     and the parameters
             ServerHelloDone

  client validates the chain, then:
  client --- ClientKeyExchange ----------------------->
             ChangeCipherSpec
             Finished  <- MAC over the WHOLE transcript
                                                        RTT 2
         <-- ChangeCipherSpec, Finished ---------------

  client --- application data ----------------------->

  why TWO: the client cannot guess which group the server will pick,
  so it must WAIT to be told before sending its key share.
```

```text
TLS 1.3, one round trip, because the client guesses:

  client --- ClientHello + key_share ----------------->
             supported_versions, signature_algorithms, SNI
             ^ the ephemeral public key is sent IMMEDIATELY
                                                        RTT 1
         <-- ServerHello + key_share -------------------
             ---- both sides derive the secret HERE ----
             { EncryptedExtensions }      <- everything from
             { Certificate }                 this point on is
             { CertificateVerify }           ENCRYPTED
             { Finished }

  client --- Finished + APPLICATION DATA ------------->

  it works because TLS 1.3 cut the permitted groups to a handful,
  so guessing X25519 or P-256 is almost always right.
  wrong guess -> HelloRetryRequest -> 2 RTT, the old cost as a
  fallback rather than the norm.

  also gained: the CERTIFICATE is encrypted (a passive observer no
  longer sees which one was served) and the TRANSCRIPT is signed
  (no downgrade attacks). SNI is still cleartext: that is what ECH
  addresses.

  0-RTT: a returning client sends data in its FIRST flight using a
  pre-shared key. It is REPLAYABLE, so only safe idempotent requests.
```

```text
Why hybrid, in one comparison:

  ASYMMETRIC (RSA, ECDHE, ECDSA)
    CAN     agree a key with a stranger you have never met
            prove an identity with a signature
    CANNOT  move bulk data: ~100-1000x slower, and it only
            operates on small inputs

  SYMMETRIC (AES-GCM, ChaCha20-Poly1305)
    CAN     encrypt gigabytes at near memory speed, with AES-NI
            hardware support, and AEAD gives confidentiality AND
            integrity in one pass
    CANNOT  be started with a stranger: it needs a key you already share

  so: pay the expensive mechanism ONCE, in the handshake, to establish
  a key; use the cheap mechanism for everything afterwards.
```

```text
Why RSA KEY EXCHANGE was banned (RSA signatures are still fine):

  STATIC RSA KEY EXCHANGE
     client picks the premaster secret
     encrypts it with the server's LONG-TERM RSA public key
     server decrypts with its LONG-TERM private key

     attacker records ALL traffic for 10 years ............ patiently
     attacker later obtains that one private key
        (breach, legal order, Heartbleed)
     -> decrypts EVERY SESSION EVER RECORDED, retroactively

     NO FORWARD SECRECY. One key compromise undoes a decade.

  EPHEMERAL DIFFIE-HELLMAN (ECDHE)
     key pairs generated for THIS HANDSHAKE ONLY, then discarded
     the session key was NEVER TRANSMITTED and cannot be derived
     from the long-term key
     -> recordings stay unreadable even after the key leaks
     -> FORWARD SECRECY, and TLS 1.3 makes it MANDATORY

  second reason: PKCS#1 v1.5 padding -> Bleichenbacher's attack,
  a padding oracle recovering the premaster secret. Patched and
  re-broken for two decades, culminating in ROBOT (2017), which found
  major vendors still vulnerable NINETEEN YEARS after the original
  paper. Unfixable in practice, so it was removed rather than defended.
```

```text
Why a man in the middle cannot succeed:

  attacker intercepts and must present SOME certificate:

   1. their own self-signed cert      -> fails the CHAIN check
   2. a valid cert for another host   -> fails the HOSTNAME check (SAN)
   3. the real server's certificate   -> they can copy it freely,
                                         it is public...
                                         ...but it fails PROOF OF
                                         POSSESSION

      TLS 1.3: the server must send CertificateVerify, a signature
               over the handshake transcript using the PRIVATE KEY
      TLS 1.2: the ServerKeyExchange signature does the same

      the attacker does not have that key, so the handshake fails.

  so interception needs a TRUSTED CA ISSUING WRONGLY (DigiNotar 2011,
  or a corporate root installed on a managed machine) or a STOLEN
  PRIVATE KEY.

  defences above the chain:
      Certificate Transparency  every cert logged publicly; Chrome
                                requires SCTs, so mis-issuance is
                                DETECTABLE rather than silent
      CAA records               which CAs may issue for this domain
      HSTS                      removes the plaintext first request
                                an attacker would downgrade
```

```text
OCSP, and why stapling alone is not enough:

  CLIENT-SIDE OCSP
      client --> CA responder: "is serial 0x4f2a still valid?"
      1. PRIVACY   the client tells the CA every site it visits
      2. LATENCY   extra DNS + TCP + HTTP to a THIRD PARTY, on every
                   new connection
      3. SOFT-FAIL if the responder is unreachable, browsers PROCEED
                   -> an attacker who can intercept simply BLOCKS the
                      OCSP request, and the browser carries on
                   -> against the very adversary it targets, it is
                      close to worthless

  OCSP STAPLING  (status_request extension)
      the SERVER periodically fetches a SIGNED, TIMESTAMPED response
      from the CA and attaches it to its own handshake

      no privacy leak      the client never contacts the CA
      no extra round trip  the proof rides in the existing handshake
      signed by the CA     the server cannot forge it
      freshness is the server's responsibility

  BUT: an attacker holding a revoked certificate just DOES NOT STAPLE,
       and the client falls back to soft-fail. Stapling alone is not
       a defence.

  OCSP MUST-STAPLE  (an extension INSIDE the certificate)
      "this certificate MUST arrive with a valid staple"
      -> a missing staple becomes a HARD FAILURE
      -> only now does stapling actually prevent the attack, because
         a silent omission becomes a refusal to connect

  modern direction: short-lived certificates reduce the need for
  revocation at all, and browsers ship curated sets (Chrome CRLSets,
  Firefox CRLite) so no live query is needed.
```

---

### What they ask next

**"Does TLS 1.3 remove RSA entirely?"**
No, and the distinction matters. RSA is still permitted as a **signature** algorithm for authenticating the server. What was removed is RSA as a **key exchange** mechanism, because that is what destroyed forward secrecy.

**"What exactly does forward secrecy protect against?"**
An adversary who records traffic now and compromises the server's long-term private key later. With ephemeral Diffie-Hellman the session keys were never transmitted and were discarded, so past sessions stay unreadable. With static RSA, one key compromise decrypts every recording retroactively.

**"Why can TLS 1.3 guess the key share when 1.2 could not?"**
Because 1.3 reduced the supported groups to a small set, so one guess is almost always correct. 1.2 supported a large and varied set, making a guess unreliable. When 1.3 does guess wrong, HelloRetryRequest restores the two-round-trip behaviour.

**"What stops an attacker replaying a recorded handshake?"**
The signature covers both randoms and the handshake transcript, and the randoms are fresh each time. A recorded ServerKeyExchange or CertificateVerify does not match the new transcript, so verification fails.

**"Why is soft-fail OCSP so criticised?"**
Because the adversary it is meant to stop is one who can already intercept your traffic, and such an adversary can trivially block the OCSP query. Soft-fail then means the browser proceeds, so the check provides no security against the only attacker that matters.

**"Does OCSP stapling by itself prevent MITM?"**
No. An attacker with a revoked certificate simply omits the staple and the client soft-fails. It requires **OCSP Must-Staple** in the certificate to turn a missing staple into a hard failure, and only then does it actually defend.

**"How does corporate TLS interception work if certificates prevent MITM?"**
By installing an organisation-controlled **root certificate** in the machine's trust store. The proxy then issues its own certificates on the fly, which chain to a root the browser trusts. It is the DigiNotar attack performed with permission, which is also why Certificate Transparency cannot see it: the root was never public.

**"Why is 0-RTT risky?"**
Because the server has no fresh randomness to bind the data to, so an attacker who captures that first flight can replay it. For a GET it is harmless; for anything that changes state it is not, so 0-RTT must be limited to idempotent requests.

**The common wrong answer** is "TLS encrypts the connection", with the certificate treated as a formality. Encryption without **authentication** is worthless, since you would have a perfectly private conversation with the attacker. The certificate chain plus **proof of possession of the private key** is what makes the encryption mean anything.

---

### Say this in the interview

*"TLS runs over an established TCP connection, so the three-way handshake has already cost a round trip, which is exactly what QUIC avoids by merging the transport and cryptographic handshakes.*

*In TLS 1.2 the client sends ClientHello with a client random, supported versions and cipher suites, and extensions including SNI, ALPN, supported_groups and signature_algorithms. The server replies with ServerHello carrying a server random and the chosen suite, the Certificate chain, ServerKeyExchange with its ephemeral ECDHE public key plus a signature over both randoms and the parameters, and ServerHelloDone. That signature is the critical part: it proves the server holds the private key matching the certificate and binds the proof to this specific handshake, so a recording cannot be replayed. The client validates the chain, sends ClientKeyExchange with its own ephemeral public key, then ChangeCipherSpec and Finished, which is a MAC over the whole transcript, and the server replies with ChangeCipherSpec and Finished. That is two round trips, and the reason is that the client cannot guess which group the server will choose, so it must wait to be told.*

*TLS 1.3 gets to one round trip because the client sends a key_share in ClientHello immediately, guessing the group. The server replies with its own key_share, both sides derive the secret at that point, and everything after is encrypted, including EncryptedExtensions, the Certificate, CertificateVerify and Finished. The client then sends Finished and may send application data in the same flight. It works because 1.3 cut the permitted groups to a handful, so guessing X25519 or P-256 is almost always right, and a wrong guess costs a HelloRetryRequest and falls back to two round trips. It also encrypts the certificate so a passive observer cannot see which one was served, and signs the transcript to prevent downgrades, though SNI is still cleartext, which is what encrypted client hello addresses. 0-RTT resumption lets a returning client send data in its first flight with a pre-shared key, but that data is replayable so it must be limited to idempotent requests.*

*Hybrid encryption exists because the two kinds of cryptography are good at different things. Asymmetric solves the introduction problem, letting you verify an identity and agree a key with someone you have never met, which symmetric cannot do since it needs a key you already share. But asymmetric is two to three orders of magnitude too slow for bulk data and only works on small inputs. Symmetric is extremely fast, especially with AES-NI, and modern AEAD suites like AES-GCM and ChaCha20-Poly1305 give confidentiality and integrity in one pass. So you pay the expensive mechanism once in the handshake and use the cheap one for everything afterwards.*

*RSA key exchange was banned, though RSA signatures are still allowed. Under static RSA the client picked the premaster secret, encrypted it with the server's long-term RSA public key and sent it. The decisive problem is no forward secrecy: the session key is recoverable from the long-term private key, so an adversary recording traffic for years who later obtains that key through a breach, a legal order or Heartbleed can decrypt every session retroactively. With ephemeral Diffie-Hellman the key pairs are made for one handshake and discarded, so the session key was never transmitted and recordings stay unreadable, and TLS 1.3 makes ephemeral key exchange mandatory. The second reason is twenty years of padding oracles: PKCS#1 v1.5 enabled Bleichenbacher's attack, patched and re-broken repeatedly, with ROBOT in 2017 still finding major vendors vulnerable nineteen years on. It was unfixable in practice, so removing it was simpler than defending it.*

*On MITM, a certificate binds a public key to an identity, signed by a certificate authority, and the client validates the chain of trust up to a root already in its trust store, the hostname against the Subject Alternative Name, the validity dates, key usage and revocation. An attacker must present some certificate: their own fails the chain check, one for a different host fails the hostname check, and the real server's certificate, which they can freely copy since it is public, fails at proof of possession, because the server must sign the handshake transcript with the private key in CertificateVerify, or in ServerKeyExchange under 1.2. So interception needs a trusted CA issuing wrongly, as with DigiNotar in 2011 or a corporate root installed on a managed machine, or a stolen private key. Above the chain, Certificate Transparency logs every issued certificate publicly and Chrome requires SCTs, which makes mis-issuance detectable rather than silent; CAA records restrict which CAs may issue; and HSTS removes the plaintext first request an attacker would downgrade.*

*OCSP lets a client ask the CA's responder whether a serial is still valid, and client-side it has three problems: privacy, since the client tells the CA every site it visits; latency, since it is an extra DNS, TCP and HTTP round trip to a third party on every new connection; and soft-fail, which is fatal, because if the responder is unreachable browsers proceed anyway, so an attacker who can intercept simply blocks the query. Against the only adversary it targets, it is close to worthless.*

*OCSP stapling inverts it: the server periodically fetches a signed, timestamped OCSP response from the CA and attaches it to its own handshake through the status_request extension. That fixes all three, since the client never contacts the CA, the proof rides inside the handshake already happening, and the response is CA-signed so the server cannot forge it. But stapling alone is still not a defence, because an attacker with a revoked certificate simply does not staple and the client soft-fails. OCSP Must-Staple, an extension inside the certificate, declares that this certificate must arrive with a valid staple, turning a missing one into a hard failure, and only then does stapling actually prevent the attack. The modern direction is to lean less on revocation at all, with short-lived certificates and browser-shipped revocation sets like Chrome's CRLSets and Firefox's CRLite."*
