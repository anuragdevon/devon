---
title: "The LLD framework"
subtitle: "A complete simple design beats an elegant half-design."
description: "What an LLD round grades, a seven-step plan for the 45–60 minutes, which design pattern fits which situation, and the concurrency toolbox that keeps designs correct."
date: 2026-11-12
track: lld
weight: 1
---

Low-level design rounds check whether you can turn a fuzzy requirement into clean, extensible, working code: classes, interfaces, relationships, patterns and concurrency. It's the round where everyday product engineering, turning business rules into code that survives the next change, is a direct advantage. The worked designs in this track all follow the framework below.

> [!TIP] The short version
> - **Clarify first:** agree on three to six functional requirements and name what's out of scope.
> - **Interfaces only where variation is likely:** pricing, payment, assignment, notification.
> - **Get the core flow working** before polishing anything.
> - **Find the race** (double booking, double assignment) and fix it properly.

## What the interviewer evaluates

| Area | What "strong SDE2" looks like |
|------|-------------------------------|
| **Requirements** | Asks clarifying questions, writes down functional requirements, agrees on scope, names what's out of scope |
| **Modelling** | Entities with clear responsibilities; it's obvious which class owns what state and behaviour |
| **Abstractions** | Interfaces where variation is *likely* (pricing, payment, assignment, notification). Concrete classes elsewhere |
| **Principles** | SOLID, composition over inheritance, no god classes, immutability for value objects |
| **Patterns** | Used naturally to solve a real need, not forced in |
| **Code** | Compiles in your head: clear names, enums for fixed sets, exceptions or result types for errors |
| **Concurrency** | Spots the race (double booking, double assignment) and fixes it correctly |
| **Extensibility** | When the interviewer adds a requirement, the change fits without rewriting everything |
| **Testability** | Dependencies are injected, so you can explain how you'd unit test it |

## The 7-step framework (45–60 minutes)

| Step | Time | What to do |
|------|------|------------|
| 1. Clarify requirements | 5–7 min | Users and actors, core use cases, constraints, scale. Write **3 to 6 functional requirements** and agree on them |
| 2. Identify entities | 3–5 min | Nouns → classes; verbs → methods. Spot **value objects** (Money, Location, TimeSlot) |
| 3. Relationships | 3–5 min | has-a or is-a, cardinality, and who owns the lifecycle |
| 4. Class diagram / interfaces | 5–8 min | Key interfaces, enums, state machines. Mark the extension points |
| 5. Core code | 15–20 min | Write the **main flow** end to end. Skip trivial getters and setters |
| 6. Concurrency and edge cases | 5 min | Locks, idempotency, invalid states, failures |
| 7. Extensions | Remainder | Answer "what if…" by showing which class changes |

> [!IMPORTANT] Golden rule
> Get a working core flow before polishing. A complete, simple design beats an elegant half-design.

## Pattern map: when to use which

| Situation in the problem | Pattern |
|--------------------------|---------|
| Several interchangeable algorithms (pricing, slot allocation, assignment, splitting) | **Strategy** |
| An entity with a lifecycle and rules about which actions are allowed in which state (order, vending machine, elevator) | **State** (or an enum state machine plus a transition table) |
| Notify many listeners when something happens | **Observer** / pub-sub |
| Creating the right subtype from input | **Factory** |
| Many optional parameters in a constructor | **Builder** |
| Adding behaviour (caching, logging, retries) without changing a class | **Decorator** |
| Wrapping a third-party API | **Adapter** |
| One shared instance (a registry, or a controller in the interview) | **Singleton** (prefer DI in real code) |
| A request passing through handlers (validation, approval, logging levels) | **Chain of Responsibility** |
| Encapsulating actions as undoable objects | **Command** |
| A simplified entry point over subsystems | **Facade** |

## Concurrency toolbox for LLD

| Need | Tool |
|------|------|
| Prevent double booking or allocation of one resource | A lock per resource (`ReentrantLock` in a `ConcurrentHashMap`), or an atomic compare-and-set on its state |
| A shared counter | `AtomicInteger` / `LongAdder` |
| A thread-safe map | `ConcurrentHashMap` with `compute`/`putIfAbsent` (atomic per key) |
| Producer–consumer | `BlockingQueue` |
| Many readers, few writers | `ReadWriteLock` |
| A temporary hold (a seat held for 10 minutes) | A hold with an expiry timestamp, plus lazy cleanup or a `ScheduledExecutorService` |
| Across multiple servers | A DB unique constraint, `SELECT … FOR UPDATE`, optimistic versioning, or a Redis lock with a fencing token |

## The designs in this track

| # | Problem | Main patterns and skills tested |
|---|---------|------------------------------|
| 01 | [Parking Lot](/study/lld/parking-lot/) | Strategy, Factory, concurrency on slot allocation |
| 02 | [Food delivery system](/study/lld/food-delivery/) | State machine, Strategy (pricing, assignment), Observer, idempotency |
| 03 | [Splitwise (expense sharing)](/study/lld/splitwise/) | Strategy (split types), validation, debt simplification |
| 04 | [Movie Ticket Booking (BookMyShow)](/study/lld/movie-ticket-booking/) | Seat locking with expiry, concurrency, idempotent payment |
| 05 | [Rate Limiter](/study/lld/rate-limiter/) | Strategy (algorithms), thread safety, distributed extension |
| 06 | [Elevator System](/study/lld/elevator/) | State, Strategy (scheduling), event loop |
| 07 | [Vending Machine](/study/lld/vending-machine/) | State pattern (the classic example) |
| 08 | [Notification Service](/study/lld/notification-service/) | Strategy, Template Method, retries, Observer |
| 09 | [Tic-Tac-Toe / Board Games](/study/lld/tic-tac-toe/) | Clean modelling, O(1) win check, extensibility |
| 10 | [In-Memory Key-Value Store with TTL](/study/lld/kv-store-with-ttl/) | Concurrency, expiry, eviction, transactions |

## How to practise

1. Take one problem a day. **Close the file** and spend 45 minutes designing and coding it yourself on paper or in an IDE, without AI.
2. Then compare with the reference here. Note what you missed: requirements, an abstraction, a race condition.
3. Do it again 3 days later from scratch. LLD is pattern muscle memory, just like DSA.
4. Practise the **extension questions** out loud. That's where SDE2 candidates stand out.

> [!NOTE] More to practise the same way
> library management, hotel booking, ride hailing (Uber), chess, Snake & Ladder, ATM, logging framework, cab fare calculator, Instagram feed (LLD level), meeting scheduler, inventory management, coupon engine, file system (`mkdir`, `ls`), and an in-memory search/autocomplete.
