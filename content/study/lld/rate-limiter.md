---
title: "Rate limiter"
subtitle: "Pick the algorithm by what you can afford to get wrong."
description: "Token bucket, sliding-window log and fixed window behind one interface, per-key locking, tiers from config, and the fail-open versus fail-closed decision once it's distributed."
date: 2026-11-12
track: lld
weight: 6
---

A rate limiter is small enough to code completely in an interview and deep enough to fill the follow-ups. Put each algorithm behind one interface, keep state per client so clients never contend, and be ready to compare the algorithms honestly: each one is wrong in a different way.

> [!TIP] The short version
> - **Token bucket** is the default for APIs: O(1) memory, bursts up to capacity.
> - **Per-key synchronisation,** never one global lock.
> - **Return 429** with `Retry-After` and remaining-quota headers.
> - **Distributed:** a Redis Lua script per key, and decide up front whether to fail open or closed.

## Requirements

1. `allowRequest(clientId)` → true or false.
2. **Configurable rules** per client or tier, e.g. FREE: 10 requests per second, PREMIUM: 100 requests per second, with an optional burst.
3. **Pluggable algorithms:** token bucket, sliding-window log, fixed window.
4. **Thread-safe** under high concurrency; low latency (O(1) per call).
5. *(Follow-up)* Work across multiple servers.

## Design

```text
RateLimiter (interface)
  allow(String key): boolean

TokenBucketLimiter

SlidingWindowLogLimiter

FixedWindowLimiter

RateLimiterRegistry
  Map<Tier, RateLimiterFactory> factories
  limiterFor(clientId): RateLimiter

RateLimitRule
  int capacity
  double refillPerSec
  Duration window

How they connect:
  TokenBucketLimiter implements RateLimiter
  SlidingWindowLogLimiter implements RateLimiter
  FixedWindowLimiter implements RateLimiter
  RateLimiterRegistry uses RateLimiter
```

- **Strategy:** each algorithm implements `RateLimiter`.
- **State per key:** a `ConcurrentHashMap<String, Bucket>`. Each bucket is synchronised on its own, so different clients never contend.
- **Rules from config,** chosen per tier (Factory/Registry).
- **`Clock`/`nanoTime` injected** for testability.

## Core code

```java
interface RateLimiter { boolean allow(String key); }

/** Token bucket: refill continuously at `ratePerSec`, up to `capacity`. Allows bursts up to `capacity`. */
class TokenBucketLimiter implements RateLimiter {
    private static final class Bucket {
        double tokens; long lastRefillNanos;
        Bucket(double tokens, long now) { this.tokens = tokens; this.lastRefillNanos = now; }
    }
    private final double capacity, ratePerNano;
    private final LongSupplier nanoClock;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    TokenBucketLimiter(int capacity, double ratePerSec, LongSupplier nanoClock) {
        this.capacity = capacity; this.ratePerNano = ratePerSec / 1_000_000_000.0; this.nanoClock = nanoClock;
    }

    public boolean allow(String key) {
        long now = nanoClock.getAsLong();
        Bucket b = buckets.computeIfAbsent(key, k -> new Bucket(capacity, now));
        synchronized (b) {                                         // per-key lock
            double refill = (now - b.lastRefillNanos) * ratePerNano;
            b.tokens = Math.min(capacity, b.tokens + refill);
            b.lastRefillNanos = now;
            if (b.tokens >= 1) { b.tokens -= 1; return true; }
            return false;
        }
    }
}

/** Sliding window log: exact; memory is O(limit) per key. */
class SlidingWindowLogLimiter implements RateLimiter {
    private final int limit; private final long windowNanos; private final LongSupplier nanoClock;
    private final ConcurrentHashMap<String, Deque<Long>> logs = new ConcurrentHashMap<>();

    SlidingWindowLogLimiter(int limit, Duration window, LongSupplier nanoClock) {
        this.limit = limit; this.windowNanos = window.toNanos(); this.nanoClock = nanoClock;
    }
    public boolean allow(String key) {
        long now = nanoClock.getAsLong();
        Deque<Long> log = logs.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (log) {
            while (!log.isEmpty() && now - log.peekFirst() >= windowNanos) log.pollFirst();
            if (log.size() < limit) { log.addLast(now); return true; }
            return false;
        }
    }
}

/** Fixed window: cheapest; allows up to 2x the limit across a window boundary. */
class FixedWindowLimiter implements RateLimiter {
    private record Window(long id, AtomicInteger count) {}
    private final int limit; private final long windowNanos; private final LongSupplier nanoClock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    FixedWindowLimiter(int limit, Duration window, LongSupplier nanoClock) {
        this.limit = limit; this.windowNanos = window.toNanos(); this.nanoClock = nanoClock;
    }
    public boolean allow(String key) {
        long windowId = nanoClock.getAsLong() / windowNanos;
        Window w = windows.compute(key, (k, cur) ->
                (cur == null || cur.id() != windowId) ? new Window(windowId, new AtomicInteger()) : cur);
        return w.count().incrementAndGet() <= limit;
    }
}

enum Tier { FREE, PREMIUM, INTERNAL }

class RateLimiterRegistry {
    private final Map<Tier, RateLimiter> limiters;
    private final Function<String, Tier> tierResolver;            // clientId → tier (from config / DB)
    RateLimiterRegistry(Map<Tier, RateLimiter> limiters, Function<String, Tier> tierResolver) {
        this.limiters = limiters; this.tierResolver = tierResolver;
    }
    public boolean allow(String clientId) {
        return limiters.get(tierResolver.apply(clientId)).allow(clientId);
    }
}

// Usage
var registry = new RateLimiterRegistry(Map.of(
        Tier.FREE,     new TokenBucketLimiter(10, 10, System::nanoTime),
        Tier.PREMIUM,  new TokenBucketLimiter(200, 100, System::nanoTime),
        Tier.INTERNAL, key -> true),                               // no limit
    clientId -> lookupTier(clientId));
```

## Design decisions to explain

| Algorithm | Accuracy | Memory per key | Bursts | Choose when |
|-----------|----------|----------------|--------|-------------|
| Token bucket | Good | O(1) | Allowed up to the capacity | Default for APIs |
| Sliding window log | Exact | O(limit) | No | Low limits, strict fairness |
| Sliding window counter | Approximate | O(1) | Smoothed | High scale, good enough |
| Fixed window | Edge bursts (2x) | O(1) | At window edges | Simplest, internal quotas |

- **Per-key synchronisation** rather than one global lock, so throughput scales with the number of clients.
- **Memory growth:** idle keys pile up in the map. Evict them with a Caffeine cache using `expireAfterAccess`, or with a periodic sweep.
- **What the caller sees:** HTTP 429 with `Retry-After` and `X-RateLimit-Remaining` headers.

## Distributed extension

- **Centralised counters in Redis:** a Lua script performs refill-and-take atomically per key. It adds about 1 ms per request. Shard the keys across a Redis Cluster.
- **Local plus global:** each node enforces `limit / N` locally (no network call), with periodic sync. Fast but approximate.
- **Failure mode decision:** if Redis is down, do you **fail open** (allow traffic, which protects availability) or **fail closed** (block it, which protects the backend)? The usual choice: fail open for user-facing APIs, closed for expensive or abuse-prone endpoints such as OTP sending.
- **Where it runs:** at the API gateway (per client), in each service (self-protection), and as client-side throttles in front of third-party APIs.
