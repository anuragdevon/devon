---
title: "Networking & distributed systems"
subtitle: "The network is not reliable. Design like you mean it."
description: "TCP vs UDP, load balancers, CAP and PACELC, consistency models, Kafka vs queues, delivery guarantees and the outbox pattern, sagas, and resilience with timeouts, retries, breakers and bulkheads."
date: 2026-11-11
track: fundamentals
weight: 6
---

The moment a system spans two machines, every call can be slow, fail, or succeed without you finding out. Distributed-systems questions test whether you design for that reality or hope it away. The vocabulary is big, but it compresses into a few ideas: choose your consistency per feature, make everything idempotent, and put a timeout on everything.

> [!TIP] The short version
> - **TCP** for correctness, **UDP** for real-time (and QUIC builds reliability on top).
> - CAP only bites **during a partition**; PACELC adds **latency vs consistency** the rest of the time.
> - **At-least-once delivery + idempotent consumers = effectively once.**
> - Write to the database and publish an event? Use the **outbox pattern**.
> - Cross-service transactions are **sagas with compensations**, not 2PC.
> - **Timeouts, retries with jitter, breakers, bulkheads.**

## TCP vs UDP

**30-second answer:** TCP gives reliable, ordered, congestion-controlled byte streams (handshake, ACKs, retransmission). Use it for HTTP, databases, payments. UDP sends independent datagrams with no delivery or ordering guarantees, but less overhead and no head-of-line blocking. Use it for real-time media, games, DNS and metrics, and as the base of QUIC/HTTP3.

> [!NOTE] Follow-ups
> **Head-of-line blocking:** one lost TCP packet stalls everything behind it. QUIC's independent streams avoid it.
>
> **TIME_WAIT:** the side that closes first holds the socket for a while. Lots of short outbound connections can exhaust ephemeral ports, so pool and keep connections alive.
>
> **Handshakes:** SYN, SYN-ACK, ACK to open; FIN/ACK each way to close.

## Load balancers

**30-second answer:** a load balancer spreads traffic over healthy backends. **L4** routes on IP and port without reading content, so it's very fast. **L7** understands HTTP: it routes by path, header or cookie, terminates TLS, retries, and applies auth and rate limits, at the cost of more CPU.

**Algorithms:** round robin (weighted or not), least connections / least outstanding requests (good when request times vary), power of two random choices (cheap and surprisingly good), and consistent hashing for affinity.

- **Health checks:** active probes plus passive outlier ejection. Separate **liveness** (is it alive?) from **readiness** (can it serve yet?).
- **Sticky sessions** hurt balance and failover; prefer stateless services with external session storage.
- **Connection draining** during deploys lets in-flight requests finish.
- **Client-side load balancing** (gRPC, service mesh) skips a network hop.

## CAP and PACELC

**30-second answer:** during a **network partition**, a system must choose **consistency** (every read sees the latest write, or errors) or **availability** (every request gets an answer, possibly stale). Partitions are unavoidable, so the real choice is CP or AP *while partitioned*. **PACELC** adds: *else*, in normal operation, you trade **latency against consistency**, and that's the trade-off you make every day.

| System | During a partition | Normally |
|---|---|---|
| Cassandra / DynamoDB (default) | AP | Latency (tunable) |
| ZooKeeper, etcd, HBase | CP | Consistency |
| Spanner | CP | Consistency (pays latency for synchronised clocks) |

> [!TIP] Choose per feature, not per company
> A payment ledger is CP: refuse rather than double-spend. Ratings can be AP; stale is fine. A shopping cart is often AP with merge-on-conflict. An "in stock" badge tolerates seconds of staleness because stock is re-checked at checkout.

## Consistency models

From strongest to weakest:

- **Linearizable:** behaves like a single copy updated atomically in real time.
- **Sequential:** everyone sees the same order, not necessarily real-time order.
- **Causal:** cause comes before effect for everyone (a reply never appears before its question).
- **Eventual:** stop writing and replicas converge.

Client-side guarantees worth naming: **read-your-writes**, **monotonic reads**, **monotonic writes**, **consistent prefix**.

- **Quorums:** with N replicas, write W and read R. If `R + W > N`, every read overlaps the latest write (e.g. N=3, W=2, R=2).
- **Resolving conflicts:** last-write-wins (simple, loses data, trusts clocks), vector clocks (detect concurrency), **CRDTs** (merge automatically), or app-level merge.
- **Clocks lie.** Don't order events across machines by wall-clock time; use logical or hybrid clocks, or a single sequencer.

## Message queues: Kafka vs RabbitMQ/SQS

**30-second answer:** queues decouple producers from consumers, absorb spikes, move slow work off the request path and fan events out. **Kafka** is a partitioned, *replayable log*: very high throughput, order per partition, retention so consumers can re-read. **RabbitMQ/SQS** are *task queues*: a message is gone once acknowledged, with per-message acks, routing, delays and visibility timeouts.

| | Kafka | RabbitMQ | SQS |
|---|---|---|---|
| Model | Retained log, pull | Broker queue, push | Managed queue, pull |
| Ordering | Per partition | Per queue (caveats) | FIFO queues only |
| Replay | ✅ | ❌ | ❌ |
| Consumer parallelism | ≤ number of partitions | Competing consumers | Automatic |
| Ops burden | High (or managed) | Medium | None |

**Kafka in one breath:** topic → partitions (the unit of order and parallelism) → the message key picks the partition. Each partition goes to one consumer in a group; consumers commit offsets. `acks=all` with `min.insync.replicas` for durability. Rebalances cause pauses and duplicates.

> [!NOTE] What owners talk about
> Consumer **lag** alerts, poison messages → **dead-letter queue** + replay tool, choosing partition counts carefully (changing them remaps keys), and **schema evolution** with a registry.

## Delivery semantics and the outbox pattern

- **At-most-once:** commit, then process. Can lose messages, never duplicates.
- **At-least-once:** process, then commit. No loss, but duplicates. The practical default.
- **Exactly-once:** end-to-end across arbitrary systems is effectively impossible. In practice it's **at-least-once + idempotent processing = effectively once**. Kafka's transactions give exactly-once *inside Kafka*; side effects outside still need idempotency.

**Making consumers idempotent:**

- A **processed-events table** keyed by event ID, written in the *same transaction* as the business change.
- **Naturally idempotent writes:** `SET status = 'DELIVERED'`, not `count = count + 1`. Upserts.
- **Versioned writes:** apply only if `event.version > current.version`. This also handles out-of-order events.

**The dual-write problem:** writing to the database *and* publishing to Kafka are two operations, and a crash between them leaves them out of sync. The **transactional outbox** fixes it: write the business row and an `outbox` row in one transaction, and let a relay (a poller or CDC) publish outbox rows to Kafka.

## Transactions across microservices: sagas

**30-second answer:** draw service boundaries around consistency boundaries where you can. When a workflow must span services, use a **saga**: a chain of local transactions where a failure triggers **compensating** steps that semantically undo earlier ones. Two-phase commit blocks if the coordinator dies and couples everyone's availability, so it's rare between microservices.

- **Choreography:** services react to each other's events. Decoupled, but the flow is implicit and hard to follow.
- **Orchestration:** a central state machine tells each service what to do. Explicit, easier to monitor, time out and compensate.

```text
Place-order saga (orchestrated)
1. Order:     create PENDING
2. Payment:   authorise        ── fails → Order: CANCELLED
3. Inventory: reserve          ── fails → Payment: void → Order: CANCELLED
4. Shipping:  book courier     ── times out → retry, escalate or compensate
5. Order:     CONFIRMED
```

Compensations must be idempotent and retryable; put irreversible steps (like sending an SMS) last; show intermediate states honestly (a `PENDING` status); and time out every step.

## Resilience: timeouts, retries, breakers, bulkheads

**30-second answer:** assume every call can be slow or fail. **Timeouts** on every call. **Retry** only transient failures on idempotent operations, with **exponential backoff, jitter and a retry budget**. **Circuit breakers** stop calling a failing dependency. **Bulkheads** give each dependency its own pool so one slow service can't eat every thread. Add **fallbacks** and **shed load** under overload.

- **Deadline propagation:** pass the remaining time budget downstream; a downstream timeout must be shorter than the upstream one. Base timeouts on the dependency's p99, not a round 30 seconds.
- **Retry storms:** three layers × three attempts = 27× load. Retry at one layer, and cap retries at about 10% of traffic.
- **Breaker states:** CLOSED → OPEN (fail fast) → HALF-OPEN (one trial request) → CLOSED or OPEN again.
- **Cascading failure:** a slow dependency ties up threads, callers slow down, *their* callers retry, everything falls over. Timeouts, bulkheads and shedding break the chain.
- **Prove it:** inject latency and failures on purpose (chaos testing, game days).

> When a payment provider degrades, its circuit breaker opens and routing shifts traffic to a secondary provider. Customers see slightly slower payments instead of failed ones.

## Cheat sheet

- TCP for correctness; UDP/QUIC for real time.
- L4 is fast; L7 is smart. Readiness ≠ liveness.
- CAP during partitions; PACELC always. Choose per feature.
- `R + W > N`; clocks lie.
- At-least-once + idempotency; outbox for dual writes.
- Sagas with compensations; timeouts, jittered retries, breakers, bulkheads.
