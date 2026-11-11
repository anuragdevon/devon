---
title: "Caching & performance"
subtitle: "Fast is a feature. Stale is a bug."
description: "Cache-aside and friends, invalidation that actually works, stampedes, penetration and avalanches, what belongs on a CDN, the latency numbers to know, and a method for any performance problem."
date: 2026-11-11
track: fundamentals
weight: 4
---

A cache is the cheapest performance win you'll ever ship, and the most common source of "but I just changed it, why is it still showing the old value?". Good answers here always come with a **staleness budget**: how out-of-date each piece of data is allowed to be.

> [!TIP] The short version
> - **Cache-aside** is the default: read-through on miss, **delete** on write.
> - Invalidate with **TTL as a safety net** plus **events for freshness**.
> - Stampede → **single-flight**; penetration → **negative caching**; avalanche → **TTL jitter**.
> - CDN: cache static assets forever with **hashed filenames**; never cache personal data at a shared edge.
> - Memory is roughly **1000× faster than the network**.

## The caching strategies

**30-second answer:** **cache-aside** (most common): check the cache, on a miss read the database and fill the cache; on a write, update the database and *delete* the key. **Read-through:** the cache loads from the database itself. **Write-through:** write cache and database together. **Write-back:** write the cache, flush to the database later. **Write-around:** write only the database; the cache fills on reads.

| Strategy | Reads | Writes | Consistency | Risk |
|---|---|---|---|---|
| Cache-aside | Fast once warm | Database speed | Small stale window | Stale if a delete is missed |
| Read-through | Fast | n/a | As cache-aside | Coupled to the cache library |
| Write-through | Fast | Slower | Strong | Caches data nobody reads |
| Write-back | Fast | Fastest | Weak | Data loss if the cache dies |
| Write-around | First read misses | Database speed | Good | Cold reads |

```java
Product getProduct(String id) {
    Product p = redis.get(key(id));
    if (p != null) return p;
    p = db.loadProduct(id);
    redis.set(key(id), p, Duration.ofMinutes(5).plusSeconds(rand(0, 60)));  // TTL + jitter
    return p;
}

void updateProduct(Product p) {
    db.save(p);
    redis.delete(key(p.id()));   // delete, don't set
}
```

> [!NOTE] Follow-up: why delete instead of updating the cache?
> Two concurrent writers can update the cache in a different order from the database, leaving it permanently wrong. A delete is safe; the next read repopulates it. A rare race remains (a slow reader writes an old value back after the delete), so keep a short TTL as a backstop, or invalidate from database change events.

## Cache invalidation that works

**30-second answer:** combine a **TTL as a safety net** with **event-driven invalidation** for freshness, and choose the staleness budget per kind of data. For correctness-critical reads (a balance at payment time), skip the cache.

- **TTL with jitter**, so keys don't all expire together.
- **Delete on write** (cache-aside).
- **Change-data-capture invalidation:** database log → stream → invalidator. It catches *every* write path, including scripts and other services.
- **Versioned keys:** `product:{id}:v{n}`. A write bumps the version; old keys are never read again and just age out.
- **Pub/sub** to invalidate in-process caches across many nodes.
- **Two levels:** in-process (L1) → Redis (L2) → database. L1 needs a short TTL or a broadcast.

> The catalogue can be 30 seconds stale and nobody minds. "Out of stock" must show within a couple of seconds, so it's invalidated by events. And the price is always re-checked against the source of truth at checkout.

## Stampede, penetration and avalanche

| Problem | What happens | Fixes |
|---|---|---|
| **Stampede** (thundering herd) | A hot key expires and thousands of requests hit the database at once | **Single-flight** (one loader per key, the rest wait), a rebuild lock, **stale-while-revalidate**, early probabilistic refresh, pre-warming |
| **Penetration** | Requests for keys that don't exist always miss, sometimes maliciously | **Cache the "not found"** with a short TTL, a **Bloom filter** of valid IDs, input validation, rate limits |
| **Avalanche** | Many keys expire together, or the cache dies, and the database is flooded | **TTL jitter**, a replicated cache cluster, circuit breakers in front of the database, warm-up after restarts |

> [!NOTE] Follow-up: hot keys
> One key getting extreme traffic (a viral product, a celebrity's profile). Put an in-process cache in front, or replicate the key as `key#1…N` and read a random copy.

## What belongs on a CDN

**30-second answer:** a CDN caches content on servers close to users, cutting latency and origin load, and adds DDoS protection, TLS and a WAF. Cache static assets aggressively with content-hashed filenames and `max-age` + `immutable`. Cache public, non-personal API responses briefly. Never cache personal or authenticated responses at a shared edge.

**Headers to know:**

- `Cache-Control`: `public` / `private`, `max-age`, `s-maxage` (shared caches), `no-store`, `stale-while-revalidate`.
- `ETag` for revalidation; `Vary` for responses that differ by encoding or language.
- Invalidate with purge APIs, or better, with **versioned URLs** so you never need to purge.

> [!TIP] Images are the easy win
> Resize on the fly through the CDN (width in the URL) so every device gets the size it needs. On mobile networks that's often the single biggest speed-up.

## Latency numbers worth knowing

| Operation | Roughly |
|---|---|
| L1 cache reference | 1 ns |
| Main memory reference | 100 ns |
| Read 1 MB from memory | 10–50 µs |
| SSD random read | 16–100 µs |
| Round trip in the same datacenter | 0.5 ms |
| Redis GET over the network | 0.5–1 ms |
| Simple indexed DB query | 1–5 ms |
| Read 1 MB from SSD | 1 ms |
| Disk seek (HDD) | 10 ms |
| Cross-continent round trip | 150–250 ms |

**Takeaways:** memory is about a thousand times faster than the network. Avoid chatty calls and N+1 patterns; batch, cache and parallelise. A cross-region call in the request path is very expensive.

## A method for any performance problem

1. **Define the goal:** which metric (p99 latency? throughput?) and what target.
2. **Measure:** percentiles, not averages, with a baseline under realistic load.
3. **Find the bottleneck:** traces (where does time go?), profilers and flame graphs, slow-query logs and `EXPLAIN`, GC logs, thread dumps.
4. **Fix the biggest contributor first.** Shaving a small step barely matters (Amdahl's law).
5. **Verify** with a load test and production metrics, then add a regression alert.

> [!NOTE] Little's Law
> `concurrency = throughput × latency`. 1,000 requests a second at 200 ms means about 200 requests in flight. Use it to size thread and connection pools.

## Cheat sheet

- Cache-aside; delete on write; TTL + jitter.
- Staleness budget per data type; bypass the cache for money.
- Single-flight for stampedes, negative caching for penetration, jitter for avalanches.
- CDN: hashed static files cached forever; nothing personal at the edge.
- Memory ≪ network; batch and cache.
- Measure → profile → fix the biggest thing → verify → alert.
