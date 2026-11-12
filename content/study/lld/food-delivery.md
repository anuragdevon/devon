---
title: "Food delivery system"
subtitle: "Keep the scope tight. The trap is designing everything."
description: "Cart to doorstep: an order state machine as a transition table, pricing as a chain of rules, delivery-partner assignment as a strategy, and idempotent order placement."
date: 2026-11-12
track: lld
weight: 3
---

Food delivery is a favourite because everyone understands the domain, which also makes it easy to wander off into search ranking and maps. Don't. Agree on a tight core: cart, checkout, the order lifecycle, assigning a delivery partner, notifications, and placing an order exactly once.

> [!TIP] The short version
> - **State machine:** one transition table, enforced in one place (`Order.transitionTo`).
> - **Pricing:** an ordered list of rules. A new fee is a new class.
> - **Assignment:** a strategy, with an atomic reservation so a partner gets one order at a time.
> - **Idempotency:** the same key returns the same order; the order ID doubles as the payment key.

## Clarify requirements

**Agreed core scope:**
1. Customers browse restaurants and menu items, and add items to a **cart** (from one restaurant only).
2. **Checkout:** compute the bill (item total, packaging, delivery fee, taxes, **coupon** discount), then place the order.
3. **Order lifecycle:** `PLACED → ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED`, plus `CANCELLED` from allowed states and `REJECTED` by the restaurant.
4. **Assign a delivery partner** when the order is accepted (the strategy can change).
5. **Notify** the customer, restaurant and partner on status changes.
6. Placing an order must be **idempotent**: a double tap or retry must not create two orders.

**Out of scope:** search ranking, real payment gateway integration (an interface only), real maps or ETA (an interface only).

## Entities

| Entity | Responsibility |
|--------|----------------|
| `Customer`, `Restaurant`, `MenuItem`, `DeliveryPartner` | Domain actors and catalogue |
| `Cart`, `CartItem` | A mutable selection, restricted to one restaurant |
| `Order`, `OrderItem` | An immutable snapshot of items and prices, with a **state machine** |
| `Bill` / `PriceBreakup` | A value object holding each line of the bill |
| `PricingEngine` + `PricingRule`s | Builds the bill (a chain of rules) |
| `Coupon` + `CouponValidator` | Discount rules |
| `AssignmentStrategy` | Chooses a delivery partner |
| `OrderService` | Orchestrates the flow (an application service) |
| `OrderEventPublisher` / `OrderObserver` | Notifications and analytics hooks |
| `PaymentGateway` | Adapter interface |

## Class diagram

```text
OrderService
  placeOrder(cartId, couponCode, idemKey): Order
  updateStatus(orderId, OrderStatus, Actor)

Order
  String id
  OrderStatus status
  List<OrderItem> items
  Bill bill
  transitionTo(OrderStatus)

OrderStatus (enum)
  PLACED ACCEPTED PREPARING READY_FOR_PICKUP PICKED_UP DELIVERED CANCELLED REJECTED

PricingEngine
  List<PricingRule> rules
  price(Cart, Coupon): Bill

PricingRule (interface)
  apply(PricingContext)

AssignmentStrategy (interface)
  assign(Order, List<DeliveryPartner>): Optional<DeliveryPartner>

OrderObserver (interface)
  onStatusChanged(Order, OrderStatus from, OrderStatus to)

How they connect:
  OrderService uses PricingEngine
  OrderService uses AssignmentStrategy
  OrderService uses OrderObserver
  OrderService uses Order
  Order uses OrderStatus
  PricingEngine uses PricingRule
```

## Core code

### Order state machine (explicit transition table)
```java
enum OrderStatus {
    PLACED, ACCEPTED, PREPARING, READY_FOR_PICKUP, PICKED_UP, DELIVERED, CANCELLED, REJECTED;

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
        PLACED,           Set.of(ACCEPTED, REJECTED, CANCELLED),
        ACCEPTED,         Set.of(PREPARING, CANCELLED),
        PREPARING,        Set.of(READY_FOR_PICKUP, CANCELLED),     // cancellation may carry a fee
        READY_FOR_PICKUP, Set.of(PICKED_UP),
        PICKED_UP,        Set.of(DELIVERED),
        DELIVERED,        Set.of(),
        CANCELLED,        Set.of(),
        REJECTED,         Set.of());

    boolean canTransitionTo(OrderStatus next) { return ALLOWED.get(this).contains(next); }
    boolean isTerminal() { return ALLOWED.get(this).isEmpty(); }
}

class Order {
    private final String id, customerId, restaurantId;
    private final List<OrderItem> items;          // snapshot: name and price at order time
    private final Bill bill;
    private OrderStatus status = OrderStatus.PLACED;
    private String partnerId;
    private long version;                          // for optimistic locking when persisted

    Order(String id, String customerId, String restaurantId, List<OrderItem> items, Bill bill) {
        this.id = id; this.customerId = customerId; this.restaurantId = restaurantId;
        this.items = List.copyOf(items); this.bill = bill;
    }

    synchronized OrderStatus transitionTo(OrderStatus next) {
        if (!status.canTransitionTo(next))
            throw new IllegalStateException("Cannot move order " + id + " from " + status + " to " + next);
        OrderStatus prev = status;
        status = next; version++;
        return prev;
    }
    synchronized void assignPartner(String partnerId) { this.partnerId = partnerId; }
    // getters omitted
}
```
**Why a table rather than the full State pattern?** The behaviour per state is mostly *which transitions are allowed*, so a declarative table is simpler and easy to audit. Switch to State-pattern classes if each state gets rich behaviour of its own.

### Pricing: a chain of rules (Open/Closed)
```java
record Money(BigDecimal amount) {
    static final Money ZERO = new Money(BigDecimal.ZERO);
    Money plus(Money o) { return new Money(amount.add(o.amount)); }
    Money minus(Money o) { return new Money(amount.subtract(o.amount)); }
    Money min(Money o) { return amount.compareTo(o.amount) <= 0 ? this : o; }
    Money percent(int p) { return new Money(amount.multiply(BigDecimal.valueOf(p)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)); }
}

class PricingContext {
    final Cart cart; final Coupon coupon;                  // the coupon may be null
    final Map<String, Money> lines = new LinkedHashMap<>(); // "Item total", "Delivery fee", "Discount"...
    PricingContext(Cart cart, Coupon coupon) { this.cart = cart; this.coupon = coupon; }
    Money itemTotal() { return lines.getOrDefault("Item total", Money.ZERO); }
}

interface PricingRule { void apply(PricingContext ctx); }

class ItemTotalRule implements PricingRule {
    public void apply(PricingContext ctx) {
        Money total = ctx.cart.items().stream()
            .map(i -> new Money(i.unitPrice().amount().multiply(BigDecimal.valueOf(i.qty()))))
            .reduce(Money.ZERO, Money::plus);
        ctx.lines.put("Item total", total);
    }
}

class DeliveryFeeRule implements PricingRule {          // e.g. free above a threshold
    private final Money fee, freeAbove;
    DeliveryFeeRule(Money fee, Money freeAbove) { this.fee = fee; this.freeAbove = freeAbove; }
    public void apply(PricingContext ctx) {
        boolean free = ctx.itemTotal().amount().compareTo(freeAbove.amount()) >= 0;
        ctx.lines.put("Delivery fee", free ? Money.ZERO : fee);
    }
}

class CouponRule implements PricingRule {
    private final CouponValidator validator;
    CouponRule(CouponValidator validator) { this.validator = validator; }
    public void apply(PricingContext ctx) {
        if (ctx.coupon == null) return;
        validator.validate(ctx.coupon, ctx.cart);            // throws InvalidCouponException with a reason
        Money discount = ctx.itemTotal().percent(ctx.coupon.percentOff()).min(ctx.coupon.maxDiscount());
        ctx.lines.put("Discount", new Money(discount.amount().negate()));
    }
}

class PricingEngine {
    private final List<PricingRule> rules;                 // order matters: item total → fees → discount → tax
    PricingEngine(List<PricingRule> rules) { this.rules = rules; }
    Bill price(Cart cart, Coupon coupon) {
        PricingContext ctx = new PricingContext(cart, coupon);
        rules.forEach(r -> r.apply(ctx));
        Money total = ctx.lines.values().stream().reduce(Money.ZERO, Money::plus);
        return new Bill(Map.copyOf(ctx.lines), total);
    }
}
```

### Delivery partner assignment (Strategy)
```java
interface AssignmentStrategy {
    Optional<DeliveryPartner> assign(Order order, Location pickup, List<DeliveryPartner> candidates);
}

class NearestAvailablePartnerStrategy implements AssignmentStrategy {
    public Optional<DeliveryPartner> assign(Order order, Location pickup, List<DeliveryPartner> candidates) {
        return candidates.stream()
            .filter(DeliveryPartner::isAvailable)
            .sorted(Comparator.comparingDouble(p -> p.location().distanceTo(pickup)))
            .filter(p -> p.tryReserve(order.id()))           // atomic: a partner gets one order at a time
            .findFirst();
    }
}

class DeliveryPartner {
    private final String id; private volatile Location location;
    private final AtomicReference<String> currentOrder = new AtomicReference<>();
    boolean isAvailable() { return currentOrder.get() == null; }
    boolean tryReserve(String orderId) { return currentOrder.compareAndSet(null, orderId); }
    void release() { currentOrder.set(null); }
    // ...
}
```
Alternative strategies: `BatchingStrategy` (two orders from the same restaurant, going the same direction), `RatingWeightedStrategy`, or an ML-scored strategy. All of them sit behind the same interface.

### Orchestration with idempotency and observers
```java
class OrderService {
    private final CartRepository carts; private final OrderRepository orders;
    private final PricingEngine pricing; private final CouponRepository coupons;
    private final PaymentGateway payments; private final AssignmentStrategy assignment;
    private final PartnerLocator partnerLocator;
    private final List<OrderObserver> observers;
    private final ConcurrentHashMap<String, String> idempotencyKeys = new ConcurrentHashMap<>(); // key → orderId (a DB table in prod)

    public Order placeOrder(String customerId, String cartId, String couponCode, String idempotencyKey) {
        // 1. Idempotency: the same key returns the same order
        String existing = idempotencyKeys.get(idempotencyKey);
        if (existing != null) return orders.get(existing);

        Cart cart = carts.get(cartId);
        if (cart.isEmpty()) throw new IllegalStateException("Cart is empty");
        Coupon coupon = couponCode == null ? null : coupons.byCode(couponCode);

        // 2. Price on the server (never trust a client-sent total)
        Bill bill = pricing.price(cart, coupon);

        Order order = new Order(UUID.randomUUID().toString(), customerId, cart.restaurantId(),
                                cart.snapshotItems(), bill);

        // 3. Claim the key atomically; a concurrent duplicate loses here
        String winner = idempotencyKeys.putIfAbsent(idempotencyKey, order.id());
        if (winner != null) return orders.get(winner);

        payments.charge(customerId, bill.total(), order.id());   // order.id doubles as the payment idempotency key
        orders.save(order);
        carts.clear(cartId);
        notify(order, null, OrderStatus.PLACED);
        return order;
    }

    public void updateStatus(String orderId, OrderStatus next) {
        Order order = orders.get(orderId);
        OrderStatus prev = order.transitionTo(next);              // validates the transition
        orders.save(order);
        if (next == OrderStatus.ACCEPTED) assignPartner(order);
        notify(order, prev, next);
    }

    private void assignPartner(Order order) {
        Location pickup = partnerLocator.restaurantLocation(order.restaurantId());
        assignment.assign(order, pickup, partnerLocator.nearby(pickup))
            .ifPresentOrElse(p -> order.assignPartner(p.id()),
                             () -> { /* enqueue for retry with backoff; alert if unassigned > N min */ });
    }

    private void notify(Order o, OrderStatus from, OrderStatus to) {
        observers.forEach(obs -> obs.onStatusChanged(o, from, to));  // push, SMS, analytics, ETA updater
    }
}
```

## Design decisions to explain

- **Order items are a snapshot.** The menu price can change later, but the bill must not (deliberate denormalisation).
- **The server recomputes the price.** The client's displayed total is only for display.
- **Pricing as an ordered list of rules** means a new fee (small-cart fee, surge fee, platform fee) is just a new class. Each rule can be unit-tested on its own.
- **The state machine is enforced in one place** (`Order.transitionTo`), so no service can set an illegal status.
- **Idempotency key** for placing the order, and the order ID as the payment idempotency key, so a retry never double-charges.
- **Atomic partner reservation** prevents assigning one partner to two orders at the same time.
- **Observers** decouple side effects. In production these become domain events on Kafka, published with the **outbox pattern**.

## Extensions

| Follow-up | Change |
|-----------|--------|
| Cancellation fee depending on state | A `CancellationPolicy` strategy: free in `PLACED`, partial in `PREPARING` |
| Coupon types (flat, %, BOGO, first order, city-specific) | A `Coupon` interface with `DiscountCalculator` implementations; `CouponValidator` as a chain of checks |
| Scheduled orders | A `SCHEDULED` state before `PLACED`, with a scheduler that triggers placement |
| Multi-restaurant cart | Split into sub-orders per restaurant under a parent order; the bill is aggregated |
| Partner rejects the order | A `PartnerAssignment` entity with its own states (`OFFERED → ACCEPTED/REJECTED/TIMED_OUT`); re-run the strategy, excluding partners who rejected it |
| Real persistence and concurrency | Optimistic locking with `version` on the order row; idempotency keys in a table with a unique constraint |
