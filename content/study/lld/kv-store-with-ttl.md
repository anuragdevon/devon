---
title: "Key-value store with TTL"
subtitle: "A mini Redis in forty minutes."
description: "Lazy plus active expiry, LRU eviction, the conditional remove that avoids a subtle race, and the follow-ups: transactions, persistence and distribution."
date: 2026-11-12
track: lld
weight: 11
---

An in-memory key-value store with expiry is a favourite for backend roles because it tests concurrency, expiry, eviction and API design at once. The core is small; the marks come from the details: never returning an expired key, never deleting a value a concurrent write just stored, and keeping the locks narrow.

> [!TIP] The short version
> - **Lazy expiry** guarantees correctness; **active expiry** bounds memory. Redis does both.
> - **`map.remove(key, entry)`** only removes the exact entry you checked.
> - **Only the LRU bookkeeping is locked;** shard into segments to scale.
> - **Follow-ups:** a stack of write buffers for transactions, AOF + snapshots for persistence.

## Requirements

1. `put(key, value)`, `put(key, value, ttl)`, `get(key)`, `delete(key)`.
2. Expired keys must **never be returned**, and must eventually be removed from memory.
3. **Thread-safe** for many concurrent readers and writers.
4. Optional **max capacity** with an eviction policy (LRU).
5. *(Follow-ups)* Transactions (`begin/commit/rollback`), persistence, distribution.

## Design

- **Storage:** a `ConcurrentHashMap<K, Entry<V>>`, where each `Entry` has its value and `expiresAtMillis` (or `Long.MAX_VALUE` for no expiry).
- **Expiry, two mechanisms (what Redis does too):**
  1. **Lazy:** `get` checks the expiry and removes the entry if it's stale. This alone guarantees correctness.
  2. **Active:** a background sweeper frees memory for keys that are never read again, using a `DelayQueue` or a periodic sample.
- **Eviction:** an `EvictionPolicy` strategy (LRU, LFU, none).
- **Clock injected** so tests are deterministic.

```text
KeyValueStore<K,V>
  put(K, V)
  put(K, V, Duration)
  get(K): Optional<V>
  delete(K)
  close()

Entry<V>
  V value
  long expiresAt
  isExpired(now): bool

EvictionPolicy<K> (interface)
  onAccess(K)
  onPut(K)
  onRemove(K)
  victim(): K

LruEvictionPolicy<K>

ExpirySweeper
  DelayQueue<ExpiryTask> queue
  schedule(K, long expiresAt)
  run()

How they connect:
  KeyValueStore uses Entry
  KeyValueStore uses EvictionPolicy
  KeyValueStore uses ExpirySweeper
  LruEvictionPolicy implements EvictionPolicy
```

## Core code

```java
final class Entry<V> {
    final V value; final long expiresAt;
    Entry(V value, long expiresAt) { this.value = value; this.expiresAt = expiresAt; }
    boolean isExpired(long now) { return now >= expiresAt; }
}

class KeyValueStore<K, V> implements AutoCloseable {
    private final ConcurrentHashMap<K, Entry<V>> map = new ConcurrentHashMap<>();
    private final Clock clock;
    private final int maxSize;
    private final LinkedHashMap<K, Boolean> lru = new LinkedHashMap<>(16, 0.75f, true); // access order, guarded by `this`
    private final DelayQueue<ExpiryTask<K>> expiryQueue = new DelayQueue<>();
    private final Thread sweeper;

    KeyValueStore(int maxSize, Clock clock) {
        this.maxSize = maxSize; this.clock = clock;
        this.sweeper = Thread.ofVirtual().start(this::sweepLoop);
    }

    public void put(K key, V value) { put(key, value, null); }

    public void put(K key, V value, Duration ttl) {
        long expiresAt = ttl == null ? Long.MAX_VALUE : clock.millis() + ttl.toMillis();
        map.put(key, new Entry<>(value, expiresAt));
        if (ttl != null) expiryQueue.offer(new ExpiryTask<>(key, expiresAt, clock));
        synchronized (this) {
            lru.put(key, Boolean.TRUE);
            while (lru.size() > maxSize) {                       // evict the least recently used
                K victim = lru.keySet().iterator().next();
                lru.remove(victim);
                map.remove(victim);
            }
        }
    }

    public Optional<V> get(K key) {
        Entry<V> e = map.get(key);
        if (e == null) return Optional.empty();
        if (e.isExpired(clock.millis())) {                       // lazy expiry
            map.remove(key, e);                                  // remove only if it's still this exact entry
            synchronized (this) { lru.remove(key); }
            return Optional.empty();
        }
        synchronized (this) { lru.get(key); }                    // touch for LRU
        return Optional.of(e.value);
    }

    public boolean delete(K key) {
        synchronized (this) { lru.remove(key); }
        return map.remove(key) != null;
    }

    private void sweepLoop() {                                   // active expiry
        try {
            while (!Thread.currentThread().isInterrupted()) {
                ExpiryTask<K> t = expiryQueue.take();            // blocks until the earliest expiry is due
                Entry<V> e = map.get(t.key);
                if (e != null && e.expiresAt == t.expiresAt) {   // ignore if the key was overwritten with a new TTL
                    map.remove(t.key, e);
                    synchronized (this) { lru.remove(t.key); }
                }
            }
        } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }

    @Override public void close() { sweeper.interrupt(); }

    static final class ExpiryTask<K> implements Delayed {
        final K key; final long expiresAt; private final Clock clock;
        ExpiryTask(K key, long expiresAt, Clock clock) { this.key = key; this.expiresAt = expiresAt; this.clock = clock; }
        public long getDelay(TimeUnit unit) { return unit.convert(expiresAt - clock.millis(), TimeUnit.MILLISECONDS); }
        public int compareTo(Delayed o) { return Long.compare(expiresAt, ((ExpiryTask<?>) o).expiresAt); }
    }
}
```

## Design decisions to explain

- **Lazy plus active expiry:** lazy expiry guarantees correctness, and active expiry bounds memory. Redis does the same: lazy checks plus periodic random sampling of keys that have TTLs.
- **`map.remove(key, e)`** (a conditional remove) avoids deleting a value that a concurrent `put` just wrote. This is a subtle race that's worth mentioning.
- **Comparing `expiresAt` in the sweeper** handles a key that was re-put with a new TTL (the old task is stale).
- **Lock scope:** the map is a concurrent hash map (lock-free reads). Only the LRU bookkeeping takes a lock, which is a known bottleneck. To scale it, **shard** into N segments, each with its own map and LRU (`segment = hash(key) % N`), or use Caffeine-style buffered access recording.
- **`Thread.ofVirtual()`** (Java 21) for the sweeper. On older Java, use a daemon platform thread.

## Follow-ups

| Follow-up | Approach |
|-----------|----------|
| **Transactions** (`begin`, `set`, `commit`, `rollback`, nested) | A stack of write buffers (`Deque<Map<K, Optional<V>>>`). Reads check the buffers top-down, then the store. `commit` merges the top buffer into the one below (or into the store); `rollback` pops it. For isolation across clients, keep buffers per session and use optimistic version checks on commit |
| **Persistence** | An append-only log (AOF) of writes, fsynced per policy (every write, or every second), plus periodic snapshots (RDB) to keep restart time bounded. Replay on startup |
| **Distribution** | Consistent hashing across nodes; replication (leader-follower) per shard; the client or a proxy routes keys. See the CAP trade-offs in [Networking & distributed systems](/study/fundamentals/networking-and-distributed-systems/) |
| **Memory limit by bytes instead of count** | Estimate the entry size and evict until under the limit (a Caffeine `weigher`) |
| **Pub/sub on key changes** | An Observer: listeners registered per key or key pattern |
