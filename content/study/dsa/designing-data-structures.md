---
title: "Designing data structures"
subtitle: "Two structures that each do one thing well."
description: "LRU cache, union-find, tries, min stack, a time-based store, a hit counter, bit tricks and the advanced structures worth naming, each with the SDE2 follow-ups (P48–P55)."
date: 2026-11-12
track: dsa
weight: 6
---

"Design a data structure" questions sit between DSA and LLD, and SDE2 interviews love them. The trick is nearly always to combine two structures that each meet half of the complexity target, like a hash map for lookup plus a linked list for order. They usually end with a follow-up about concurrency or scale, so the follow-ups are included here too.

> [!TIP] The short version
> - **LRU:** hash map + doubly linked list, O(1) everything. Shard it to scale.
> - **Union-Find:** path compression + union by rank ≈ O(1) per operation.
> - **Trie:** O(L) prefix search; precompute top-K at each node for autocomplete.
> - **"Now it's 10 billion items"** is your cue for Bloom filters, sketches, sharding and streaming.

## P48. LRU Cache (O(1) get and put)

**Idea:** a **HashMap** gives O(1) lookup, and a **doubly linked list** gives O(1) reordering and eviction. The most recently used node sits at the head, and the least recently used at the tail.

```java
class LRUCache {
    private static class Node { int key, val; Node prev, next; Node(int k, int v) { key = k; val = v; } }

    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels

    LRUCache(int capacity) { this.capacity = capacity; head.next = tail; tail.prev = head; }

    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        moveToFront(n);
        return n.val;
    }

    public void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) { n.val = value; moveToFront(n); return; }
        if (map.size() == capacity) {
            Node lru = tail.prev;
            unlink(lru);
            map.remove(lru.key);
        }
        n = new Node(key, value);
        map.put(key, n);
        addFront(n);
    }

    private void moveToFront(Node n) { unlink(n); addFront(n); }
    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addFront(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
}
```
**Shortcut (mention it, but be ready to write the version above):** `LinkedHashMap` with `accessOrder = true`, overriding `removeEldestEntry`.

**SDE2 follow-ups:**
- *Thread safety?* The simplest answer is one lock around every operation (note that `get` also mutates the list). For higher throughput, **shard** into N independent LRU segments by key hash, each with its own lock. That's how Caffeine and Guava scale. Caffeine also buffers reads and replays them asynchronously.
- *TTL?* Store an expiry time in each node. Check it lazily on `get`, and run a background sweeper (or a min-heap ordered by expiry).
- *LFU instead?* Keep a `key → node` map, a `freq → doubly linked list` map, and track `minFreq`. Each operation is O(1).
- *Distributed?* Partition keys with consistent hashing across nodes, i.e. how Redis Cluster or Memcached is used.


## P49. Union-Find (Disjoint Set Union)

**Use for:** connected components, cycle detection in undirected graphs, Kruskal's MST, "accounts merge", and grouping things that are equivalent (e.g. merging duplicate restaurant listings).

```java
class UnionFind {
    private final int[] parent, rank;
    private int components;

    UnionFind(int n) {
        parent = new int[n]; rank = new int[n]; components = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);   // path compression
        return parent[x];
    }
    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;                        // already connected → would form a cycle
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;                                   // union by rank
        if (rank[ra] == rank[rb]) rank[ra]++;
        components--;
        return true;
    }
    int components() { return components; }
}
```
**Complexity:** O(α(n)) amortised per operation, which is effectively constant.

**Example problems:** number of connected components, redundant connection (the first edge where `union` returns false), number of provinces, accounts merge.


## P50. Trie (prefix tree)

**Use for:** autocomplete, prefix search, word dictionaries, IP routing (longest prefix match).

```java
class Trie {
    private static class Node { Node[] next = new Node[26]; boolean isWord; }
    private final Node root = new Node();

    void insert(String word) {
        Node cur = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (cur.next[i] == null) cur.next[i] = new Node();
            cur = cur.next[i];
        }
        cur.isWord = true;
    }
    boolean search(String word) { Node n = walk(word); return n != null && n.isWord; }
    boolean startsWith(String prefix) { return walk(prefix) != null; }

    private Node walk(String s) {
        Node cur = root;
        for (char c : s.toCharArray()) {
            cur = cur.next[c - 'a'];
            if (cur == null) return null;
        }
        return cur;
    }
}
```
**Complexity:** O(L) per operation.

**Autocomplete follow-up ("top 5 suggestions for a prefix"):** store the top-K popular completions at each node. Lookups are O(L), but updates cost more. At scale this is done offline: build the trie or suggestion index in a batch job and serve it from memory, sharded by prefix.

**Also know:** Word Search II (put all the words in a trie and DFS the grid once).


## P51. Min Stack (O(1) getMin)
```java
class MinStack {
    private final Deque<int[]> stack = new ArrayDeque<>();   // {value, minSoFar}
    void push(int x) { stack.push(new int[]{x, stack.isEmpty() ? x : Math.min(x, stack.peek()[1])}); }
    void pop() { stack.pop(); }
    int top() { return stack.peek()[0]; }
    int getMin() { return stack.peek()[1]; }
}
```


## P52. Time-Based Key-Value Store
`set(key, value, timestamp)`. `get(key, timestamp)` returns the value with the largest timestamp ≤ the given one.

```java
class TimeMap {
    private final Map<String, TreeMap<Integer, String>> store = new HashMap<>();
    void set(String key, String value, int ts) {
        store.computeIfAbsent(key, k -> new TreeMap<>()).put(ts, value);
    }
    String get(String key, int ts) {
        TreeMap<Integer, String> versions = store.get(key);
        if (versions == null) return "";
        Map.Entry<Integer, String> e = versions.floorEntry(ts);
        return e == null ? "" : e.getValue();
    }
}
```
**Complexity:** O(log n) per operation. If timestamps always arrive in increasing order, an `ArrayList` plus binary search uses less memory.

**Real-world version:** MVCC in databases, config versioning, "what was the menu price at the time this order was placed?".


## P53. Design a Hit Counter / Rate Limiter (hits in the last 300 seconds)
```java
class HitCounter {
    private final int[] times = new int[300], counts = new int[300];   // circular buckets

    void hit(int ts) {
        int i = ts % 300;
        if (times[i] != ts) { times[i] = ts; counts[i] = 1; }           // stale bucket → reset
        else counts[i]++;
    }
    int getHits(int ts) {
        int total = 0;
        for (int i = 0; i < 300; i++) if (ts - times[i] < 300) total += counts[i];
        return total;
    }
}
```
**Complexity:** O(1) per hit, O(300) per query, with fixed memory regardless of traffic.

**Follow-ups:** making it concurrent (`AtomicIntegerArray`, or a lock per bucket), and making it distributed (Redis `INCR` with expiry per bucket, or a sliding-window counter in Lua). See [LLD: Rate Limiter](/study/lld/rate-limiter/).


## P54. Bit Manipulation Essentials
```java
x & 1                      // is x odd?
x & (x - 1)                // clear the lowest set bit; (x & (x-1)) == 0 → power of two (for x > 0)
x & -x                     // isolate the lowest set bit
Integer.bitCount(x)        // number of set bits
a ^ a = 0, a ^ 0 = a       // XOR: find the single number among pairs
mask | (1 << i)            // set bit i;   mask & ~(1 << i) clear;  (mask >> i) & 1 test
for (int s = mask; s > 0; s = (s - 1) & mask) { }   // iterate over the submasks of a mask
```
**Classic problems:** single number (XOR of everything), counting bits (`dp[i] = dp[i >> 1] + (i & 1)`), subsets via bitmasks, missing number.


## P55. Advanced Structures to Know by Name (and when to mention them)

| Structure | What it gives | Where it shows up |
|-----------|---------------|-------------------|
| **Segment tree / Fenwick tree (BIT)** | Range queries and point updates in O(log n) | Range sum or minimum with updates, counting inversions |
| **TreeMap / balanced BST** | Ordered keys: floor, ceiling, range in O(log n) | Calendar booking, time-based stores, order books |
| **Skip list** | A probabilistic sorted structure, O(log n) on average | Redis sorted sets (`ZSET`), LSM memtables |
| **Bloom filter** | "Definitely not present" / "maybe present", using little memory | Avoiding DB lookups for missing keys, cache penetration |
| **Count-Min Sketch** | Approximate frequency counts for streams | Heavy hitters, trending items |
| **HyperLogLog** | Approximate distinct counts with a few KB | Unique visitors (Redis `PFCOUNT`) |
| **Consistent hashing ring** | Minimal key movement when nodes change | Distributed caches, sharding |
| **Geohash / quadtree / S2 / H3** | Spatial indexing for nearby search | Finding nearby restaurants or riders, surge zones |
| **Monotonic deque** | Window min or max in O(1) amortised | Sliding window maximum (P15) |

> [!TIP] The SDE2 move
> When a DSA follow-up says "now there are 10 billion items" or "now it's a stream", that's your cue to bring in these structures and distributed thinking: sharding, approximate algorithms, and batch versus streaming.
