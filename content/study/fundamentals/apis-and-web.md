---
title: "APIs & the web"
subtitle: "From the address bar to your database and back."
description: "What happens when you hit Enter, REST design, HTTP semantics and idempotency keys, REST vs gRPC vs GraphQL, auth with sessions, JWT and OAuth2, pagination, versioning and rate limiting."
date: 2026-11-11
track: fundamentals
weight: 2
---

APIs are where your system meets everyone else's, so interviewers probe them hard. The good news: the same handful of ideas (statelessness, idempotency, compatibility, limits) answer most of the questions. Learn those properly and the follow-ups stop being scary.

> [!TIP] The short version
> - A page load is **DNS → TCP → TLS → HTTP → edge → app → render**.
> - REST: **nouns, standard methods, stateless**, consistent errors.
> - **POST isn't idempotent**, so money-moving POSTs need an idempotency key.
> - Sessions are easy to revoke; **JWTs** are easy to verify. OAuth2 is *delegation*.
> - Use **cursor pagination** for big or changing lists.
> - Evolve APIs **additively**; rate-limit with a **token bucket**.

## What happens when you type a URL and press Enter?

**30-second answer:** DNS resolves the name, the browser opens a TCP connection (or QUIC for HTTP/3), does a TLS handshake, and sends an HTTP request. It goes through a CDN or load balancer to an app server that may call caches, databases and other services. The browser then parses the HTML, fetches CSS, JS and images, builds the DOM and CSSOM, and paints.

1. **Parse the URL** and check HSTS (force HTTPS?).
2. **DNS:** browser cache → OS → resolver → root → `.com` → authoritative server. TTLs control caching.
3. **TCP handshake:** SYN → SYN-ACK → ACK (one round trip).
4. **TLS 1.3:** one round trip (zero on resumption). Verify the certificate chain, derive keys with ECDHE.
5. **HTTP request:** method, path, headers, body.
6. **Edge:** CDN cache hit, or WAF → load balancer / API gateway (TLS termination, routing, rate limits).
7. **App server:** middleware (auth, logging, tracing) → handler → cache/DB/downstream calls.
8. **Response:** status, headers (`Cache-Control`, `Set-Cookie`), compressed body.
9. **Render:** DOM + CSSOM → layout → paint → composite. Blocking scripts stall parsing, hence `defer`.

> [!NOTE] Follow-up: HTTP/1.1 vs 2 vs 3
> HTTP/1.1 sends one request at a time per connection. HTTP/2 multiplexes streams over one TCP connection, but a lost packet still stalls them all. HTTP/3 runs on QUIC over UDP: independent streams, faster handshakes, and connections that survive a network change.

## What makes an API RESTful?

**30-second answer:** resources (nouns) identified by URLs, manipulated with standard HTTP methods, stateless requests, standard status codes, and cacheable responses where it makes sense.

A practical checklist:

- **Nouns, not verbs:** `POST /orders`, not `POST /createOrder`. Keep nesting shallow: `/orders/{id}/items`.
- **Opaque IDs** (UUIDs), not auto-increment numbers that leak business volume.
- **Filter and sort with query params:** `GET /orders?status=DELIVERED&sort=-createdAt`.
- **One error shape** everywhere, e.g. `{type, title, status, detail, traceId}`.
- **`Idempotency-Key`** on POSTs that create money or orders.
- **`ETag` / `If-None-Match`** for caching, **`If-Match`** for optimistic concurrency.
- **Additive changes only**: never remove or rename a field in place.
- Document it with **OpenAPI**.

**Non-CRUD actions** like cancelling: `POST /orders/{id}/cancel`, or `PATCH` the status. Just be consistent.

## HTTP methods, idempotency and status codes

**30-second answer:** *safe* methods don't change state. *Idempotent* ones have the same effect whether called once or ten times. POST is neither, which is why payments need idempotency keys.

| Method | Safe | Idempotent | Use |
|---|---|---|---|
| GET | ✅ | ✅ | Read |
| POST | ❌ | ❌ | Create, actions |
| PUT | ❌ | ✅ | Replace a resource |
| PATCH | ❌ | Not guaranteed | Partial update |
| DELETE | ❌ | ✅ | Remove (a second call may 404, but the state is the same) |

The status codes worth knowing cold: `201` (+ `Location`), `202` (accepted for async work), `204`, `304`, `400`, `401` (who are you?), `403` (you can't), `404`, `409` (conflict), `422` (validation), `429` (slow down), `500`, `502`, `503` (+ `Retry-After`), `504`.

How an idempotency key works:

```text
Client: POST /payments   Idempotency-Key: 7f3a…

Server looks the key up (unique constraint in Redis or the DB):
  not found      → insert IN_PROGRESS, process, store the response (TTL ~24h)
  found, done    → return the stored response: no double charge
  found, running → 409, or wait

Scope keys per client, and reject the same key with a different request body.
```

> [!TIP] Which errors are retryable?
> 5xx, 429 and timeouts usually are, with backoff. 4xx usually aren't. And only retry idempotent requests automatically.

## REST vs gRPC vs GraphQL vs WebSockets

| | REST | gRPC | GraphQL | WebSockets / SSE |
|---|---|---|---|---|
| Best for | Public APIs, CRUD | Internal service calls | Many clients needing different shapes | Real-time push |
| Payload | JSON text | Binary protobuf | JSON, fields chosen by client | Anything |
| Contract | OpenAPI (optional) | `.proto` (required) | Schema | Custom |
| Caching | Easy (HTTP) | Harder | Harder | n/a |
| Catch | Over/under-fetching | Not browser-native | N+1 resolvers, query cost | Stateful connections |

**30-second answer:** REST for public, cacheable APIs. gRPC for fast internal calls with strict contracts. GraphQL when web and mobile clients need different views of the same data. WebSockets for two-way real time (chat, live tracking); SSE for one-way server push.

> Live tracking is the classic case: the driver app posts locations over HTTP, and the customer app gets updates over a WebSocket from a connection gateway subscribed to a per-trip topic. The hard part isn't the protocol, it's scaling stateful connections and routing each event to the right gateway node.

## Authentication, authorization, sessions, JWT and OAuth2

**30-second answer:** authentication is *who you are*; authorization is *what you may do*. Sessions keep state on the server behind an opaque cookie, which makes revocation easy. A JWT is a signed, self-contained token any service can verify without a lookup, but revoking it is hard, so pair short expiry with refresh tokens. OAuth2 is *delegation* (an app acting on your behalf); OIDC adds login on top.

- **A JWT is signed, not encrypted.** Never put secrets in it. Prefer asymmetric signing (RS256/ES256) and validate `exp`, `iss`, `aud` and the algorithm (reject `none`).
- **Tokens:** a 5–15 minute access token, plus a rotated, revocable refresh token.
- **OAuth2 flows:** Authorization Code + PKCE for web and mobile; Client Credentials for service-to-service.
- **Authorization models:** RBAC (roles), ABAC (attributes), ReBAC (relationships).
- **Always check object ownership:** "does order 123 belong to this user?" Missing it (IDOR/BOLA) is the #1 API vulnerability.

> [!NOTE] Follow-up: where should a browser keep tokens?
> In an `httpOnly`, `Secure`, `SameSite` cookie. `localStorage` can be read by any injected script.

## Pagination: offset vs cursor

**30-second answer:** offset (`LIMIT 20 OFFSET 1000`) is simple and allows jumping to page N, but deep pages get slow and rows shift when data changes. Cursor (keyset) pagination seeks via an index, so it's fast at any depth and stable under inserts, at the cost of random page access.

```sql
-- The cursor is an opaque base64 of the last row's (created_at, id)
SELECT * FROM orders
WHERE user_id = ? AND (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 21;  -- one extra row tells you whether there's a next page
```

Always include a **unique tiebreaker** (`id`), keep the cursor **opaque** so you can change it later, and cap the page size.

## Versioning without breaking clients

**30-second answer:** prefer **additive, backward-compatible** changes (new optional fields, new endpoints) and make clients ignore unknown fields. For breaking changes, version explicitly (`/v2/`, a header, or a media type), run both, measure old-version traffic, and deprecate on a timeline (`Deprecation` / `Sunset` headers).

**Breaking changes hide in:** removed or renamed fields, changed types or meanings, optional → required, new enum values clients can't handle, changed error codes, and stricter validation.

> [!NOTE] Mobile is the hard case
> Old app versions stay installed for months. Treat a mobile contract as permanent, and use server-side flags plus a minimum-supported-version gate to force upgrades only when you truly must.

## Rate limiting

**30-second answer:** cap how many requests a client can make in a window, to stop abuse and overload. The **token bucket** is the usual choice because it allows controlled bursts. In a distributed system, keep counters in Redis and update them atomically, then return `429` with `Retry-After`.

| Algorithm | Good | Bad |
|---|---|---|
| Fixed window | Simple, cheap | 2× bursts at window edges |
| Sliding window log | Exact | Memory per request |
| Sliding window counter | Cheap, close enough | Approximate |
| Token bucket | Controlled bursts, cheap | Two knobs to tune |
| Leaky bucket | Smooth output | Bursts queue or drop |

```text
Per key (user / IP / API key), atomically in a Redis Lua script:
  tokens = min(capacity, tokens + (now - last_refill) * rate)
  if tokens >= 1: tokens -= 1 → allow
  else            → 429 Too Many Requests
```

Apply limits at the **gateway** (per client), in each **service** (to protect itself), and on the **client side** of each dependency. And don't confuse it with **load shedding**, which drops low-priority work when the whole system is overloaded.

## Cheat sheet

- URL → DNS → TCP → TLS → HTTP → CDN/LB → app → render.
- Idempotent: GET, PUT, DELETE. POST needs an idempotency key.
- 401 = not authenticated, 403 = not allowed, 429 = slow down, 503 = come back later.
- JWT: signed not encrypted; short-lived + refresh. Always check object ownership.
- Cursor pagination with a unique tiebreaker.
- Additive changes; version and sunset the rest. Token bucket + 429.
