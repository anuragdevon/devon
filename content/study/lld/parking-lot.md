---
title: "Parking lot"
subtitle: "The warm-up that's really about concurrency."
description: "Spot allocation and pricing as strategies, a lock-free compare-and-set so two gates never hand out the same spot, and the follow-ups: EV spots, peak pricing, reservations."
date: 2026-11-12
track: lld
weight: 2
---

The parking lot is the most common LLD warm-up, and it's easy to over-model. Keep the entities small, make allocation and pricing pluggable, and spend your energy on the one hard part: several gates working at once must never assign the same spot.

> [!TIP] The short version
> - **Strategies:** spot allocation and pricing, because the business will change both.
> - **Concurrency:** each spot claims itself with an atomic compare-and-set. No global lock.
> - **Testability:** inject the `Clock`; use `BigDecimal` for money.
> - **Scale-out:** a conditional `UPDATE … WHERE vehicle IS NULL` does the same job in a database.

## Clarify requirements

**Questions to ask:** How many floors? What vehicle types? Can a bike use a car spot? How is the fee calculated? Is there more than one entry and exit gate (i.e. concurrency)? Do we need payments or reservations?

**Agreed functional requirements:**
1. Multiple floors, each with spots of type `SMALL` (bike), `MEDIUM` (car), `LARGE` (truck).
2. A vehicle gets the **nearest available compatible spot**. A smaller vehicle may use a larger spot.
3. On entry, issue a **ticket**. On exit, calculate the **fee** (by duration and vehicle type), take payment, and free the spot.
4. Multiple entry and exit gates work **concurrently**. Two vehicles must never get the same spot.
5. Show availability per floor and type.

**Out of scope:** reservations, EV charging (discussed as an extension), physical hardware.

## Entities

`ParkingLot`, `Floor`, `ParkingSpot`, `SpotType`, `Vehicle` (+ `VehicleType`), `Ticket`, `EntryGate`/`ExitGate`, `SpotAllocationStrategy`, `PricingStrategy`, `Payment`.

## Class diagram

```text
ParkingLot
  List<Floor> floors
  park(Vehicle): Ticket
  unpark(ticketId): Receipt

Floor
  int number
  Map<SpotType, List<ParkingSpot>> spots

ParkingSpot
  String id
  SpotType type
  AtomicReference<Vehicle> occupant
  tryOccupy(Vehicle): bool
  release()

Vehicle
  String plate
  VehicleType type

Ticket
  String id
  Vehicle vehicle
  ParkingSpot spot
  Instant entryTime

SpotAllocationStrategy (interface)
  allocate(List<Floor>, Vehicle): Optional<ParkingSpot>

PricingStrategy (interface)
  calculate(Ticket, Instant exit): Money

How they connect:
  ParkingLot owns Floor (1 to many)
  Floor owns ParkingSpot (1 to many)
  ParkingLot uses SpotAllocationStrategy
  ParkingLot uses PricingStrategy
  Ticket uses ParkingSpot
  Ticket uses Vehicle
```

## Core code

```java
enum VehicleType { BIKE, CAR, TRUCK }
enum SpotType {
    SMALL, MEDIUM, LARGE;
    boolean fits(VehicleType v) {
        return switch (v) {
            case BIKE -> true;                              // fits anywhere
            case CAR -> this != SMALL;
            case TRUCK -> this == LARGE;
        };
    }
}

record Vehicle(String plate, VehicleType type) {}

class ParkingSpot {
    private final String id; private final SpotType type; private final int floor;
    private final AtomicReference<Vehicle> occupant = new AtomicReference<>();

    ParkingSpot(String id, SpotType type, int floor) { this.id = id; this.type = type; this.floor = floor; }

    /** Lock-free claim: only one thread can win the CAS from null → vehicle. */
    boolean tryOccupy(Vehicle v) { return type.fits(v.type()) && occupant.compareAndSet(null, v); }
    void release() { occupant.set(null); }
    boolean isFree() { return occupant.get() == null; }
    SpotType type() { return type; } String id() { return id; } int floor() { return floor; }
}

class Floor {
    private final int number;
    private final List<ParkingSpot> spots;                  // ordered by distance from the gate
    Floor(int number, List<ParkingSpot> spots) { this.number = number; this.spots = spots; }
    List<ParkingSpot> spots() { return spots; }
    long available(SpotType t) { return spots.stream().filter(s -> s.type() == t && s.isFree()).count(); }
}

record Ticket(String id, Vehicle vehicle, ParkingSpot spot, Instant entryTime) {}
record Receipt(String ticketId, Duration duration, BigDecimal amount) {}

interface SpotAllocationStrategy {
    Optional<ParkingSpot> allocate(List<Floor> floors, Vehicle v);
}

/** Nearest first: lowest floor, then the order within the floor; smallest fitting spot type first. */
class NearestSpotStrategy implements SpotAllocationStrategy {
    public Optional<ParkingSpot> allocate(List<Floor> floors, Vehicle v) {
        for (SpotType type : SpotType.values()) {             // SMALL → LARGE: don't waste big spots
            if (!type.fits(v.type())) continue;
            for (Floor f : floors)
                for (ParkingSpot s : f.spots())
                    if (s.type() == type && s.tryOccupy(v)) return Optional.of(s);
        }
        return Optional.empty();
    }
}

interface PricingStrategy { BigDecimal calculate(Ticket t, Instant exit); }

class HourlyPricing implements PricingStrategy {
    private final Map<VehicleType, BigDecimal> ratePerHour;
    HourlyPricing(Map<VehicleType, BigDecimal> ratePerHour) { this.ratePerHour = ratePerHour; }
    public BigDecimal calculate(Ticket t, Instant exit) {
        long minutes = Duration.between(t.entryTime(), exit).toMinutes();
        long hours = Math.max(1, (minutes + 59) / 60);        // round up, minimum 1 hour
        return ratePerHour.get(t.vehicle().type()).multiply(BigDecimal.valueOf(hours));
    }
}

class ParkingLot {
    private final List<Floor> floors;
    private final SpotAllocationStrategy allocator;
    private final PricingStrategy pricing;
    private final Clock clock;
    private final Map<String, Ticket> activeTickets = new ConcurrentHashMap<>();

    ParkingLot(List<Floor> floors, SpotAllocationStrategy allocator, PricingStrategy pricing, Clock clock) {
        this.floors = floors; this.allocator = allocator; this.pricing = pricing; this.clock = clock;
    }

    public Ticket park(Vehicle v) {
        ParkingSpot spot = allocator.allocate(floors, v)
                .orElseThrow(() -> new IllegalStateException("Parking full for " + v.type()));
        Ticket t = new Ticket(UUID.randomUUID().toString(), v, spot, clock.instant());
        activeTickets.put(t.id(), t);
        return t;
    }

    public Receipt unpark(String ticketId) {
        Ticket t = activeTickets.remove(ticketId);            // atomic: a double exit returns null
        if (t == null) throw new IllegalArgumentException("Invalid or already used ticket");
        Instant exit = clock.instant();
        BigDecimal amount = pricing.calculate(t, exit);
        t.spot().release();
        return new Receipt(t.id(), Duration.between(t.entryTime(), exit), amount);
    }
}
```

## Design decisions to explain

- **Concurrency:** each spot claims itself with an `AtomicReference` CAS. Two gates scanning simultaneously can't both win the same spot. The loser just moves on to the next spot. There's no global lock, so gates don't block each other.
- **Strategy for allocation and pricing:** the business will change these (weekend pricing, VIP floors, EV spots), so they're the extension points.
- **`Clock` injected:** time-based pricing becomes unit-testable.
- **`BigDecimal` for money**, never `double`.
- **Scanning cost:** a linear scan is fine for a few thousand spots. For speed, keep a `ConcurrentLinkedQueue` / `PriorityBlockingQueue` of free spots per type, ordered by distance (still CAS-protected).

## Extensions (likely follow-ups)

| Follow-up | Change |
|-----------|--------|
| EV charging spots | A new `SpotType.EV` or a `features` set on each spot; the allocation strategy filters by required feature; the pricing decorator adds a charging fee |
| Weekend or peak pricing | `TimeOfDayPricing` wrapping a base `PricingStrategy` (Decorator), or a `CompositePricing` |
| Reservations | A `Reservation` with a time slot; spot state becomes `FREE / RESERVED / OCCUPIED`; the reserved spot is held for N minutes |
| Display boards | An Observer: spots publish `SpotOccupied`/`SpotFreed` events and the boards update their counts |
| Lost ticket | Look up by plate (`plate → ticket` index), charge the maximum daily fee |
| Multiple lots / a city-wide system | Persist state in a DB; a spot claim becomes a conditional update (`UPDATE spot SET vehicle=? WHERE id=? AND vehicle IS NULL`) |
