---
title: "OOP & design principles"
subtitle: "Code that bends instead of breaking."
description: "SOLID with real examples, composition vs inheritance, the patterns you'll actually use, dependency injection, interfaces vs abstract classes, immutability, and spotting bad design."
date: 2026-11-11
track: fundamentals
weight: 1
---

Design-principle questions are rarely about definitions. Anyone can recite SOLID. What interviewers want is the moment where a principle *saved you*: a change that stayed in one file because the code was shaped right. Each section below starts with the 30-second answer, then the details you'll need for the follow-ups.

> [!TIP] The short version
> - **SOLID** keeps change local. SRP and DIP matter most in practice.
> - **Prefer composition**; inherit only for a true *is-a* that honours the parent's contract.
> - Name patterns **inside a story**, not as a list.
> - **Constructor injection** makes dependencies explicit and tests easy.
> - **Immutable** objects are thread-safe for free.
> - Good design: **high cohesion, low coupling**.

## SOLID, with examples you'd actually see

**30-second answer:** five principles that keep object-oriented code easy to change. They cut coupling, so a change in one place doesn't ripple through the system.

| Principle | In one line | Smells like | Fix |
|---|---|---|---|
| **S**ingle responsibility | One reason to change | `OrderService` validates, prices, saves *and* sends SMS | `OrderValidator`, `PricingService`, `OrderRepository`, `Notifier` |
| **O**pen/closed | Extend, don't modify | A `switch (paymentType)` you edit for every new method | A `PaymentProcessor` interface; new method = new class |
| **L**iskov substitution | Subtypes work wherever the parent does | `Square extends Rectangle` breaks `setWidth` | Model by behaviour; separate types |
| **I**nterface segregation | Don't force unused methods | `Worker` with `work()` and `eat()` that `Robot` must implement | Small role interfaces |
| **D**ependency inversion | Depend on abstractions | `new MySqlOrderRepo()` inside the service | Inject an `OrderRepository` |

Open/closed and dependency inversion together look like this:

```java
interface PaymentProcessor {
    PaymentResult pay(Order o);
    boolean supports(PaymentMode m);
}

class CheckoutService {
    private final List<PaymentProcessor> processors;   // injected

    CheckoutService(List<PaymentProcessor> processors) { this.processors = processors; }

    PaymentResult pay(Order o) {
        return processors.stream()
            .filter(p -> p.supports(o.mode()))
            .findFirst().orElseThrow()
            .pay(o);                                   // new method = new class, not a new branch
    }
}
```

> [!NOTE] Follow-up: can SOLID be overdone?
> Yes. A dozen tiny classes and single-implementation interfaces add indirection with no benefit. Apply the principles where change is actually likely.

## Composition vs inheritance

**30-second answer:** inherit only for a true *is-a* relationship that honours the parent's contract. Otherwise compose (*has-a*): it's more flexible, swappable at runtime, and avoids fragile base classes.

Why inheritance bites:

- **Fragile base class:** a change in the parent silently breaks children.
- **Class explosion:** one class per combination of features.
- **One axis only:** single inheritance forces you to pick a single dimension of reuse.

```java
// Inheritance: one class per combination      // Composition: combine small parts
class ExpressFragileShipment extends ...       class Shipment {
class ExpressStandardShipment extends ...          DeliveryPolicy delivery;   // Express | Standard
class EconomyFragileShipment extends ...           PackagingPolicy packaging; // Fragile | Standard
                                               }
```

**When inheritance is genuinely right:** framework template methods, sealed type hierarchies for domain modelling (`sealed interface PaymentEvent permits ...`), and genuinely shared invariants. Naming one of these is what turns "favour composition" from a slogan into an answer.

## Patterns you'll actually use

**30-second answer:** Strategy for swappable algorithms, Factory to pick an implementation, Builder for complex immutable objects, Observer for domain events, Decorator to add retries, caching or metrics around a client, Adapter to wrap third-party SDKs.

| Family | Pattern | Typical use |
|---|---|---|
| Creational | Factory | Pick a `NotificationSender` (SMS, push, email) by channel |
| Creational | Builder | Request DTOs, test fixtures |
| Structural | Adapter | Hide a payment provider's SDK behind your own `PaymentGateway` |
| Structural | Decorator | `CachingCatalogClient` wraps `CatalogClient` |
| Structural | Facade | One `CheckoutFacade` over cart, pricing and payment |
| Behavioural | Strategy | Discount, ETA or matching algorithms |
| Behavioural | Observer | `OrderPlaced` → notifications, analytics, loyalty |
| Behavioural | State | Order lifecycle: `CREATED → CONFIRMED → SHIPPED → DELIVERED` |
| Behavioural | Chain of responsibility | Validation pipelines, middleware |

```java
// Decorator: caching without touching the real client
class CachingCatalogClient implements CatalogClient {
    private final CatalogClient delegate;
    private final Cache<String, Product> cache;

    public Product get(String id) {
        return cache.get(id, delegate::get);
    }
}
```

> [!NOTE] Follow-ups
> **Why is Singleton called an anti-pattern?** Hidden global state, hard to mock, a concurrency risk. Let the DI container manage singleton scope instead.
>
> **State vs Strategy?** With State, the object moves *itself* between states. With Strategy, the *caller* picks the behaviour.

## Dependency injection

**30-second answer:** a class receives its collaborators from outside, usually through the constructor, instead of creating them. That decouples it from concrete implementations, makes unit tests trivial, and centralises wiring and lifetimes.

- **Prefer constructor injection:** dependencies are explicit, fields can be `final`, the object is never half-built. Avoid field injection; it hides dependencies.
- **Scopes:** singleton, prototype, request.
- **Warning sign:** a constructor with eight dependencies is a class doing too much.

```java
class OrderService {
    private final OrderRepository repo;
    private final EventPublisher events;

    OrderService(OrderRepository repo, EventPublisher events) {
        this.repo = repo;
        this.events = events;
    }
}
// In a test: new OrderService(new InMemoryOrderRepo(), new FakePublisher());
```

**Circular dependencies** (A needs B, B needs A) are usually a design smell. Extract a third component, or talk through events.

## Interface vs abstract class

**30-second answer:** an interface is a contract (*what* something can do), and a class can implement many. An abstract class shares state and partial implementation among close relatives, and you can extend only one. Since interfaces can have `default` methods, the real question is **state**: need shared fields or constructor logic? Abstract class. Otherwise, interface.

| | Interface | Abstract class |
|---|---|---|
| Multiple inheritance | Yes | No |
| Instance fields | No (constants only) | Yes |
| Constructors | No | Yes |
| Use for | Capabilities, API boundaries | Template method, shared base logic |

Program to interfaces at module boundaries (repositories, clients, gateways). That's what makes swapping implementations and testing cheap.

## Why immutability matters

**30-second answer:** immutable objects are thread-safe without locks, safe to share and cache, safe as map keys, and easy to reason about. Make the class `final`, fields `private final`, no setters, copy mutable inputs, and return new instances for "changes".

```java
public final class Money {
    private final BigDecimal amount;
    private final Currency currency;

    public Money(BigDecimal amount, Currency currency) {
        this.amount = amount;
        this.currency = currency;
    }

    public Money plus(Money other) {
        return new Money(amount.add(other.amount), currency);
    }
}
// Java 16+: record Money(BigDecimal amount, Currency currency) {}
// Records are shallowly immutable: still copy lists, e.g. List.copyOf(items)
```

> [!NOTE] Follow-ups
> **Cost?** More allocations, usually negligible with modern GCs.
>
> **Why must hash-map keys be immutable?** If a field in `hashCode` changes after insertion, the entry sits in the wrong bucket forever.
>
> **Why `BigDecimal` for money?** Binary floating point can't represent 0.1 exactly. Use `BigDecimal` or integer cents.

## Coupling, cohesion, and spotting bad design

**30-second answer:** cohesion is how related the things inside a module are (you want it high). Coupling is how much one module depends on another's internals (you want it low). Together they keep a change local.

Smells to name in a review:

- **Shotgun surgery:** one change touches many files or services.
- **God class:** thousands of lines, dozens of dependencies.
- **Feature envy:** a method that uses another class's data more than its own.
- **Leaky abstraction:** database entities returned straight from the API.
- **Distributed monolith:** services that must deploy together or share a database.

> When reviewing a design I ask two questions. If this requirement changes, how many places do we touch? And can I test this piece without spinning up the whole world?

## Cheat sheet

- **S** one reason to change · **O** extend, don't edit · **L** substitutable subtypes · **I** small interfaces · **D** depend on abstractions.
- Composition by default; inheritance for true *is-a* or sealed hierarchies.
- Strategy, Factory, Builder, Decorator, Adapter, Observer, State: always inside a story.
- Constructor injection; many dependencies = too many responsibilities.
- Interface unless you need shared state.
- Immutable value objects; `BigDecimal` or cents for money.
