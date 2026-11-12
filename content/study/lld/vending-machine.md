---
title: "Vending machine"
subtitle: "The State pattern's home ground."
description: "Behaviour that depends on state without an if-ladder in every method, change-making that rolls back cleanly, and the extensions: card payments, maintenance mode, low-stock alerts."
date: 2026-11-12
track: lld
weight: 8
---

This is the classic State-pattern question. The interviewer wants to see that what a button does depends on the machine's state, and that you got there without a giant `if (state == …)` block in every method. Draw the states and transitions first; the code then writes itself.

> [!TIP] The short version
> - **One class per state;** invalid actions fail through the interface's default methods.
> - **States hold no data;** the machine does, so states could be singletons.
> - **Change-making:** greedy works for canonical coin systems; use DP otherwise.
> - **Atomicity:** if change can't be made, refund before releasing the product.

## Requirements

1. The machine holds products in slots, with a price and quantity for each.
2. The user **selects a product**, **inserts coins or notes**, and receives the **product and change**.
3. The user can **cancel** and get a refund at any time before dispensing.
4. Handle: product sold out, insufficient money, the machine can't make change.
5. An admin can restock products and collect cash.

## States and transitions

```
IDLE ──selectProduct──▶ PRODUCT_SELECTED ──insertMoney (enough)──▶ DISPENSING ──▶ IDLE
  ▲                         │    ▲ insertMoney (not enough; stay)
  │                         │    └──────────┘
  └──────── cancel (refund) ┘
```

| Action \ State | Idle | ProductSelected | Dispensing |
|----------------|------|-----------------|------------|
| selectProduct | ✅ → ProductSelected | ❌ "already selected" | ❌ busy |
| insertMoney | ❌ "select first" | ✅ accumulate; if enough → Dispensing | ❌ busy |
| cancel | no-op | ✅ refund → Idle | ❌ too late |
| dispense | ❌ | ❌ | ✅ give the product and change → Idle |

## Core code

```java
enum Coin {
    ONE(1), TWO(2), FIVE(5), TEN(10), TWENTY(20);
    final int value; Coin(int v) { value = v; }
}

record Product(String code, String name, int price) {}

class Inventory {
    private final Map<String, Product> products = new HashMap<>();
    private final Map<String, Integer> stock = new HashMap<>();
    void restock(Product p, int qty) { products.put(p.code(), p); stock.merge(p.code(), qty, Integer::sum); }
    Product get(String code) { return products.get(code); }
    boolean available(String code) { return stock.getOrDefault(code, 0) > 0; }
    void decrement(String code) { stock.merge(code, -1, Integer::sum); }
}

class CashBox {
    private final EnumMap<Coin, Integer> coins = new EnumMap<>(Coin.class);
    void add(List<Coin> in) { in.forEach(c -> coins.merge(c, 1, Integer::sum)); }

    /** Greedy change-making (works for canonical coin systems); returns empty if exact change is impossible. */
    Optional<List<Coin>> makeChange(int amount) {
        List<Coin> result = new ArrayList<>();
        EnumMap<Coin, Integer> temp = new EnumMap<>(coins);
        Coin[] desc = Coin.values(); Arrays.sort(desc, Comparator.comparingInt((Coin c) -> c.value).reversed());
        for (Coin c : desc) {
            while (amount >= c.value && temp.getOrDefault(c, 0) > 0) {
                amount -= c.value; temp.merge(c, -1, Integer::sum); result.add(c);
            }
        }
        if (amount != 0) return Optional.empty();
        coins.clear(); coins.putAll(temp);                           // commit
        return Optional.of(result);
    }
}

interface State {
    default void selectProduct(VendingMachine m, String code) { throw new IllegalStateException("Cannot select now"); }
    default void insertMoney(VendingMachine m, Coin coin)     { throw new IllegalStateException("Cannot insert money now"); }
    default void cancel(VendingMachine m)                     { /* no-op by default */ }
    default void dispense(VendingMachine m)                   { throw new IllegalStateException("Cannot dispense now"); }
}

class IdleState implements State {
    public void selectProduct(VendingMachine m, String code) {
        if (!m.inventory().available(code)) throw new IllegalStateException("Sold out: " + code);
        m.setSelected(m.inventory().get(code));
        m.setState(new ProductSelectedState());
    }
}

class ProductSelectedState implements State {
    public void insertMoney(VendingMachine m, Coin coin) {
        m.addInserted(coin);
        if (m.insertedTotal() >= m.selected().price()) {
            m.setState(new DispensingState());
            m.dispense();
        }
    }
    public void cancel(VendingMachine m) {
        m.returnCoins(m.clearInserted());
        m.reset();
    }
}

class DispensingState implements State {
    public void dispense(VendingMachine m) {
        int change = m.insertedTotal() - m.selected().price();
        m.cashBox().add(m.insertedCoins());                          // put the coins in the box first: they can be used for change
        Optional<List<Coin>> changeCoins = m.cashBox().makeChange(change);
        if (changeCoins.isEmpty()) {                                 // can't give change → refund, abort
            m.cashBox().makeChange(m.insertedTotal()).ifPresent(m::returnCoins);
            m.clearInserted(); m.reset();
            throw new IllegalStateException("Cannot make change, money refunded");
        }
        m.inventory().decrement(m.selected().code());
        m.release(m.selected());
        m.returnCoins(changeCoins.get());
        m.clearInserted(); m.reset();
    }
}

class VendingMachine {
    private State state = new IdleState();
    private final Inventory inventory = new Inventory();
    private final CashBox cashBox = new CashBox();
    private Product selected;
    private final List<Coin> inserted = new ArrayList<>();

    // Public API: delegate to the current state (synchronised: one physical user at a time)
    public synchronized void selectProduct(String code) { state.selectProduct(this, code); }
    public synchronized void insertMoney(Coin coin)     { state.insertMoney(this, coin); }
    public synchronized void cancel()                   { state.cancel(this); }
    synchronized void dispense()                        { state.dispense(this); }

    // Package-private helpers used by the states
    void setState(State s) { state = s; }
    void setSelected(Product p) { selected = p; }
    Product selected() { return selected; }
    void addInserted(Coin c) { inserted.add(c); }
    int insertedTotal() { return inserted.stream().mapToInt(c -> c.value).sum(); }
    List<Coin> insertedCoins() { return List.copyOf(inserted); }
    List<Coin> clearInserted() { List<Coin> c = List.copyOf(inserted); inserted.clear(); return c; }
    void reset() { selected = null; state = new IdleState(); }
    Inventory inventory() { return inventory; } CashBox cashBox() { return cashBox; }
    void release(Product p) { System.out.println("Dispensed " + p.name()); }
    void returnCoins(List<Coin> coins) { System.out.println("Returned " + coins); }
}
```

## Design decisions to explain

- **State pattern:** each state handles only the actions that are valid in it. Invalid actions fail through the interface's **default methods**. Adding a `MaintenanceState` doesn't touch the other states.
- **States are stateless objects.** The data lives in `VendingMachine`, so they could be singletons.
- **Change-making:** greedy is correct for canonical coin systems (such as most real-world currencies). For arbitrary denominations, use DP (coin change, DSA P35) with limited counts.
- **Atomicity:** if change can't be made, the whole transaction is rolled back (refund) before the product is released.

## Extensions
- **Card or wallet payments:** a `PaymentMethod` strategy (`CashPayment`, `WalletPayment`); the `ProductSelected` state accepts a payment confirmation.
- **Admin mode:** a `MaintenanceState` (restock, collect cash), entered with an admin PIN.
- **Telemetry:** an Observer for low-stock alerts sent to the operator.
