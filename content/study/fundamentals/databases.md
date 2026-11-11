---
title: "Databases"
subtitle: "Where correctness actually lives."
description: "SQL vs NoSQL, how indexes work and when they hurt, ACID and isolation levels, optimistic vs pessimistic locking, N+1 queries, normalisation, replication and sharding."
date: 2026-11-11
track: fundamentals
weight: 3
---

Most "distributed systems" bugs turn out to be database bugs: a lost update, a stale replica, a missing index on a hot query. Interviewers know this, so database questions go deep fast. The trick is to always connect the theory to an access pattern: *which query*, *how often*, *how wrong can it afford to be*.

> [!TIP] The short version
> - Choose a database by **access pattern, consistency need and scale**, not hype.
> - Indexes are **B+ trees**: faster reads, slower writes. Mind the **leftmost prefix**.
> - Know your default isolation level; **snapshot isolation still allows write skew**.
> - Low contention → **optimistic** locking; high contention → **pessimistic**.
> - Replicas lag: plan for **read-your-writes**.
> - Shard **last**, and pick the key for the dominant query.

## SQL vs NoSQL

**30-second answer:** relational databases give you ACID transactions, joins, ad-hoc queries and integrity, so they're the default for orders and money. NoSQL stores trade some of that for horizontal scale and specialised access patterns.

| Need | Good fit |
|---|---|
| Money, orders, inventory, complex relations | Postgres / MySQL |
| Simple key lookups at huge scale | DynamoDB / Cassandra |
| Very high write rates, time-ordered data | Cassandra / ScyllaDB / time-series DB |
| Flexible document per entity | MongoDB / Postgres JSONB |
| Full-text and fuzzy search | Elasticsearch / OpenSearch |
| Caches, counters, leaderboards, rate limits | Redis |
| Relationship traversal | A graph database |

> [!NOTE] The key difference
> In NoSQL you **design the schema around your queries**, so you must know them up front. In SQL you normalise first and query flexibly later.

Real systems are usually **polyglot**: orders in Postgres, the catalogue in a document store plus a search index, live locations in Redis, analytics in a data lake, all kept in sync with change data capture (CDC).

## How indexes work, and when they hurt

**30-second answer:** most indexes are B+ trees: sorted, balanced, O(log n) lookups, with linked leaves for fast range scans. They trade write cost and storage for read speed, because every write must update every index.

- **Clustered vs secondary:** in InnoDB the table *is* the primary-key index, so secondary lookups take two hops. Postgres stores a heap and indexes point into it.
- **Composite `(a, b, c)`:** serves `a`, `a,b` and `a,b,c`, but not `b` alone (the **leftmost prefix rule**). Put equality columns first, ranges last.
- **Covering index:** everything the query needs is in the index, so the table is never touched.
- **Other kinds:** hash (equality), GIN (JSONB, arrays, full text), BRIN (huge naturally ordered tables), partial (`WHERE status = 'ACTIVE'`), expression (`lower(email)`).

**What stops an index being used:** a function on the column (`WHERE DATE(created_at) = …`), a leading wildcard (`LIKE '%abc'`), implicit casts, `OR` across columns, and low selectivity.

```sql
-- "A user's orders, newest first"
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);

EXPLAIN ANALYZE
SELECT id, status FROM orders
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

> [!TIP] Production habit
> Check `EXPLAIN ANALYZE` before and after. On big tables, build indexes online (`CREATE INDEX CONCURRENTLY` in Postgres, or an online schema tool for MySQL) so you don't lock a hot table.

## ACID and isolation levels

**30-second answer:** **A**tomic (all or nothing), **C**onsistent (constraints hold), **I**solated (concurrent transactions don't interfere beyond what the level allows), **D**urable (commits survive crashes, via the write-ahead log). Isolation levels trade correctness for concurrency.

| Level | Dirty read | Non-repeatable read | Phantom | Notes |
|---|---|---|---|---|
| Read uncommitted | Possible | Possible | Possible | Rarely used |
| Read committed | ✗ | Possible | Possible | Postgres default |
| Repeatable read | ✗ | ✗ | Mostly prevented | MySQL default; Postgres gives snapshot isolation |
| Serializable | ✗ | ✗ | ✗ | Conflicts abort; you need retry logic |

- **Dirty read:** you see another transaction's uncommitted data.
- **Non-repeatable read:** the same row read twice gives different values.
- **Phantom:** the same range query returns different rows.
- **Write skew:** two transactions each read, then write based on what they read. Snapshot isolation *doesn't* stop it. The classic example: two on-call doctors each see the other is still on call, and both sign off.

**MVCC** lets readers see a snapshot without blocking writers; old row versions are cleaned up later (Postgres vacuum, InnoDB purge).

> For a wallet deduction I wouldn't trust the default level. I'd use an atomic conditional update, `UPDATE wallet SET balance = balance - ? WHERE id = ? AND balance >= ?`, and check that exactly one row changed.

## Optimistic vs pessimistic locking

**30-second answer:** pessimistic locking takes a lock first (`SELECT … FOR UPDATE`), so others wait. Use it when contention is high and conflicts are expensive. Optimistic locking checks a version at write time and retries on conflict. Use it when contention is low; it has no lock waits and survives a user's think-time between read and write.

```sql
-- Optimistic: 0 rows updated means someone got there first → reload, retry or 409
UPDATE products SET price = 250, version = version + 1
WHERE id = 10 AND version = 7;

-- Pessimistic: other writers wait for the lock
BEGIN;
SELECT stock FROM inventory WHERE sku = 'X' FOR UPDATE;
UPDATE inventory SET stock = stock - 1 WHERE sku = 'X';
COMMIT;
```

> [!NOTE] Follow-ups
> **A flash-sale hot row?** Both struggle. Use an atomic conditional decrement, shard the counter, reserve stock in Redis and reconcile, or queue the requests.
>
> **Distributed locks?** Redis `SET NX PX`, or etcd/ZooKeeper. A GC pause can outlive the lock, so use **fencing tokens**.
>
> **Database deadlocks?** The database aborts one transaction. Prevent them by locking in a consistent order and keeping transactions short.

## The N+1 query problem

**30-second answer:** one query fetches N parents, then one more query runs *per parent*, so 1 + N round trips. ORMs hide it behind lazy loading. Fix it with batching (`IN (…)`), joins or fetch joins, or a DataLoader-style batcher.

```java
// N+1: lazy-loading items for each order
List<Order> orders = orderRepo.findByUserId(userId);
orders.forEach(o -> o.getItems().size());   // one query per order

// Fix: fetch them together
@Query("select o from Order o join fetch o.items where o.userId = :userId")
List<Order> findWithItems(Long userId);
```

**Spot it** with SQL logs in development or traces full of identical queries. Watch out: fetch-joining several collections makes a Cartesian product.

## Normalisation vs denormalisation

**30-second answer:** normalisation stores each fact once, so writes are simple and anomalies disappear. Denormalisation copies data to skip joins and speed up reads, at the cost of harder writes. Normalise transactional data first; denormalise proven hot reads with read models, materialised views or caches.

- **1NF:** atomic values, no repeating groups.
- **2NF:** no dependency on part of a composite key.
- **3NF:** non-key columns depend only on the key.

> [!TIP] Not all duplication is redundancy
> An order line snapshots the product name and price at purchase time. The catalogue price can change later; the receipt must not. That's historical truth, not denormalisation by accident.

## Replication and its trade-offs

**30-second answer:** copies of the data on several nodes give read scaling, availability and durability. Usually one leader takes writes and followers replicate. Async replication is fast but followers lag and a failover can lose writes; sync is safer but slower.

- **Read-your-writes:** after a user writes, read from the leader for a while, or track the replica's log position.
- **Monotonic reads:** pin a user to one replica so time never goes backwards for them.
- **Multi-leader** (multi-region, offline clients): needs conflict resolution (last-write-wins, CRDTs, app-level merge).
- **Leaderless** (Dynamo-style): quorum reads and writes with `R + W > N`.
- **Failover risks:** split brain, lost async writes, stale connection pools. Use consensus (Raft) and fencing.

## Sharding and choosing a shard key

**30-second answer:** sharding splits rows across databases so writes and storage scale past one machine. A good shard key **spreads load evenly**, **matches the main query** so most queries hit one shard, and **avoids hot spots**.

| Strategy | Good | Bad |
|---|---|---|
| Hash | Even spread | Range queries scatter |
| Range | Range queries | Hot spots |
| Directory | Flexible | An extra lookup |

- **Consistent hashing with virtual nodes** limits data movement when shards change.
- **New problems:** cross-shard queries and transactions, global IDs (Snowflake, ULID), rebalancing, hot keys (salt them or split the entity).
- **Try first:** a bigger machine, read replicas, caching, archiving cold data, table partitioning. Or a distributed SQL database.

> Sharding orders by `customer_id` makes "my orders" fast but turns a seller's dashboard into scatter-gather. The answer is a seller-oriented read model fed by CDC: pick the key for the dominant query, and serve the others from projections.

## Cheat sheet

- SQL for money and relations; NoSQL when the access pattern is known and huge.
- B+ tree, leftmost prefix, covering index; functions on columns kill indexes.
- Postgres: read committed; MySQL: repeatable read; snapshot ≠ serializable.
- Conditional updates for balances and stock; fencing tokens for distributed locks.
- Batch or fetch-join away N+1.
- Replicas lag; shard last, for the dominant query.
