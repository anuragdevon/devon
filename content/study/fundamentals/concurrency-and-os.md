---
title: "Concurrency & the OS"
subtitle: "Two things at once is where the bugs live."
description: "Processes, threads and virtual threads, race conditions, deadlocks, locks and semaphores, event loops and non-blocking I/O, garbage collection, and stack vs heap vs virtual memory."
date: 2026-11-11
track: fundamentals
weight: 5
---

Concurrency bugs are the ones that pass every test, ship, and then appear once a week at peak traffic. Interviewers ask about them to see whether you can *reason* about interleavings, and whether you know that most real races today happen between machines, not between threads.

> [!TIP] The short version
> - Processes isolate, threads share memory, **virtual threads** are cheap enough for millions.
> - A race is **read-modify-write without protection**. `volatile` gives visibility, **not atomicity**.
> - Deadlock needs four conditions; **lock in a consistent order** to break one.
> - Event loops scale I/O, **as long as you never block them**.
> - GC leaks show up as a **rising floor** in heap usage.

## Process vs thread vs virtual thread

**30-second answer:** a process is an isolated program with its own memory. A thread runs inside a process and shares its memory, so it's cheaper but needs synchronisation. Goroutines, coroutines and Java virtual threads are scheduled in user space onto a few OS threads, so you can have millions: ideal for I/O-heavy work without callback-style code.

| | Process | OS thread | Virtual thread / goroutine |
|---|---|---|---|
| Memory | Separate | Shared | Shared |
| Creation cost | High | Medium (~1 MB stack) | Tiny (KB, growable) |
| Scheduled by | OS | OS (kernel switch) | Runtime (user space) |
| Typical count | Tens to hundreds | Hundreds to thousands | Hundreds of thousands+ |
| Failure isolation | Strong | Weak | Weak |

> [!NOTE] Follow-ups
> **What does a context switch cost?** Saving registers, a kernel transition and cache/TLB pollution: microseconds. That's why thousands of blocked OS threads are wasteful.
>
> **Virtual-thread caveats?** On older JVMs, blocking inside `synchronized` pins the carrier thread. Don't pool virtual threads, and be careful with heavy `ThreadLocal` use.

## Race conditions

**30-second answer:** a result depends on the timing of concurrent operations on shared state. The classic is `count++`, which is really read, add, write. Prevent it by avoiding shared mutable state, making the operation atomic, guarding the critical section, or using concurrent data structures.

```java
// Broken: count++ is three steps
class Counter { int count; void inc() { count++; } }

// Fixes
AtomicInteger count = new AtomicInteger(); count.incrementAndGet();  // compare-and-swap
synchronized void inc() { count++; }                                  // mutual exclusion
LongAdder adder = new LongAdder();                                    // best under heavy contention
```

- **Visibility:** without a happens-before edge (`volatile`, locks, safe publication), one thread may never see another's write. `volatile` fixes visibility and ordering, not atomicity.
- **Check-then-act:** `if (!map.containsKey(k)) map.put(k, v)` is racy. Use `putIfAbsent` or `computeIfAbsent`.
- **Across machines:** two pods processing the same order is the same bug at a bigger scale, and JVM locks don't help. Use database constraints, conditional updates, idempotency keys or a distributed lock.

> A duplicate-refund race is fixed with a unique constraint on `(order_id, refund_type)` plus an idempotency key. The database is the referee.

## Deadlocks

**30-second answer:** two or more threads each hold something the other needs, so none can move. It requires all four **Coffman conditions**: mutual exclusion, hold-and-wait, no preemption, circular wait. Break any one: **lock in a consistent global order**, use timeouts (`tryLock`), hold locks briefly, and never call unknown code while holding one.

```java
// T1 locks A then B; T2 locks B then A → deadlock.
// Fix: always lock in the same order, e.g. by account id.
void transfer(Account a, Account b, long amount) {
    Account first = a.id() < b.id() ? a : b;
    Account second = first == a ? b : a;
    synchronized (first) {
        synchronized (second) {
            a.debit(amount);
            b.credit(amount);
        }
    }
}
```

**Cousins:** *livelock* (everyone keeps politely stepping aside), *starvation* (one thread never gets a turn), and *thread-pool deadlock* (tasks in a bounded pool waiting on tasks queued in the same pool). Diagnose with a thread dump (`jstack` reports deadlocks) or the database's deadlock log.

## Mutex, semaphore, read-write lock, condition variable

- **Mutex / lock:** one thread at a time in the critical section, with an owner.
- **Semaphore:** N permits. Perfect for "at most 20 concurrent calls to this dependency".
- **Read-write lock:** many readers *or* one writer, for read-heavy data.
- **Condition variable:** wait until some state is true. Always re-check in a loop, because of spurious wake-ups.

In Java, reach for the higher-level tools first: `ExecutorService`, `CompletableFuture`, `ConcurrentHashMap`, `BlockingQueue`, `CountDownLatch`, `StampedLock`.

> [!NOTE] Follow-up: how does ConcurrentHashMap work?
> CAS to fill empty bins, a lock on the bin head for collisions, lock-free reads, and bins that turn into trees under heavy collisions. No null keys or values.

## Blocking, non-blocking, and the event loop

**30-second answer:** blocking I/O parks the thread until data arrives (thread-per-request). Non-blocking I/O returns immediately and the OS signals readiness (`epoll`, `kqueue`). An event loop (Node.js, Netty, Nginx) uses a few threads to poll for events and run callbacks, handling thousands of connections, **as long as nothing blocks the loop**. CPU-heavy or blocking work goes to a separate pool.

- **Thread-per-request:** easy to write and debug; memory limits concurrency. Virtual threads give you this style with event-loop-like scale.
- **Reactive / async:** scales well, but stack traces are harder, back-pressure is complex, and a blocking call inside it is a classic bug.
- **Concurrency vs parallelism:** concurrency is *structuring* many tasks; parallelism is *running* them at once on many cores.

**Sizing a pool:** `threads ≈ cores × (1 + wait time / compute time)`. Always use **bounded queues** with an explicit rejection policy. An unbounded queue hides overload until memory runs out.

## Garbage collection

**30-second answer:** the GC frees objects no longer reachable from roots (stacks, statics). The JVM is **generational** because most objects die young: new objects go to a small, frequently collected young generation; survivors are promoted to an old generation that's collected less often. G1 is the default; ZGC and Shenandoah keep pauses under a millisecond for big heaps.

Production problems you can name:

- **Long pauses** → latency spikes, timeouts, even lost leader leases.
- **Leaks in a managed language:** unbounded static maps or caches, listeners never removed, `ThreadLocal` in pools, unclosed resources. The tell is a heap whose **floor keeps rising** after each full GC.
- **Allocation pressure** from temporary objects in hot paths.
- **Containers:** a heap too close to the container limit gets the process OOM-killed. Size with `-XX:MaxRAMPercentage` and leave room for off-heap memory.

> A service had p99 spikes every few minutes. GC logs showed long collections caused by a huge unbounded in-memory cache. Switching to a size-bounded cache (Caffeine) made the spikes disappear.

## Stack, heap and virtual memory

**30-second answer:** the **stack** is per thread, last-in-first-out, holds call frames and locals, is very fast, and is freed when a function returns, but it's small (deep recursion overflows it). The **heap** is shared, holds objects, and is where leaks and fragmentation happen. **Virtual memory** gives each process a private address space; the OS maps virtual pages to physical frames through page tables (cached in the TLB), and touching an unmapped page causes a page fault.

> [!NOTE] Follow-ups
> **Thrashing:** constant paging because the working set exceeds RAM. Servers minimise swap for this reason.
>
> **mmap:** map a file into memory and let the OS page cache do the I/O. Kafka leans on the page cache and zero-copy `sendfile`.
>
> **Escape analysis:** the JIT can skip heap allocation for objects that never leave a method.

## Cheat sheet

- Process = isolation; thread = shared memory; virtual thread = cheap concurrency.
- `count++` is three steps; `volatile` ≠ atomic; distributed races need the database.
- Deadlock: lock in a consistent order; prefer `tryLock` with timeouts.
- Semaphores limit concurrency; bounded queues expose overload.
- Never block an event loop.
- Rising heap floor = leak; leave container headroom.
