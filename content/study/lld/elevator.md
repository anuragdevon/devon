---
title: "Elevator system"
subtitle: "Keep going while there's somewhere to go."
description: "Cars that follow the LOOK algorithm with two sorted sets of stops, a pluggable dispatcher, a tick-driven simulation you can test, and maintenance and peak-hour modes."
date: 2026-11-12
track: lld
weight: 7
---

The elevator question is about state and scheduling. Each car keeps moving in its direction while it has stops ahead, then turns around. A dispatcher decides which car answers a hall call, and that decision is the part the business will want to change, so it's a strategy.

> [!TIP] The short version
> - **Two `TreeSet`s per car** (stops above, stops below) make LOOK almost free.
> - **Dispatch is a strategy:** nearest car, least loaded, zones, destination dispatch.
> - **A `tick()` loop** keeps the simulation deterministic and testable.
> - **Button presses come from many threads,** so the car's methods are synchronised.

## Requirements

1. A building with N floors and M elevators.
2. **External requests:** a hall button on a floor, with a direction (UP or DOWN).
3. **Internal requests:** a car button, with a destination floor.
4. A **dispatcher** chooses which elevator serves each hall request. The algorithm must be pluggable.
5. Each elevator moves using the **SCAN/LOOK** approach: it keeps going in its current direction while there are stops ahead, then reverses.
6. Elevator states: `IDLE`, `MOVING_UP`, `MOVING_DOWN`, `DOORS_OPEN`, `MAINTENANCE`.
7. Capacity and weight limits (a soft requirement).

## Entities

`Building`, `ElevatorCar` (id, currentFloor, direction, state, stops), `Request` (floor, direction, type), `Direction`, `ElevatorState`, `Dispatcher` + `DispatchStrategy`, `ElevatorController` (runs the simulation loop), `Door`, `Display` (Observer).

```text
ElevatorController
  List<ElevatorCar> cars
  DispatchStrategy strategy
  onHallCall(floor, dir)
  onCarCall(carId, floor)
  tick()

ElevatorCar
  int floor
  Direction dir
  ElevatorState state
  TreeSet<Integer> upStops
  TreeSet<Integer> downStops
  addStop(int)
  step()

DispatchStrategy (interface)
  select(List<ElevatorCar>, HallCall): ElevatorCar

NearestCarStrategy

LeastLoadedStrategy

How they connect:
  NearestCarStrategy implements DispatchStrategy
  LeastLoadedStrategy implements DispatchStrategy
  ElevatorController uses DispatchStrategy
  ElevatorController owns ElevatorCar (1 to many)
```

## Core code

```java
enum Direction { UP, DOWN, NONE }
enum ElevatorState { IDLE, MOVING, DOORS_OPEN, MAINTENANCE }
record HallCall(int floor, Direction direction) {}

class ElevatorCar {
    final int id;
    private int floor = 0;
    private Direction direction = Direction.NONE;
    private ElevatorState state = ElevatorState.IDLE;
    private final TreeSet<Integer> upStops = new TreeSet<>();     // stops above, in ascending order
    private final TreeSet<Integer> downStops = new TreeSet<>();   // stops below

    ElevatorCar(int id) { this.id = id; }

    synchronized void addStop(int target) {
        if (state == ElevatorState.MAINTENANCE) throw new IllegalStateException("Car " + id + " in maintenance");
        if (target > floor) upStops.add(target);
        else if (target < floor) downStops.add(target);
        else { state = ElevatorState.DOORS_OPEN; return; }       // already here
        if (direction == Direction.NONE) direction = target > floor ? Direction.UP : Direction.DOWN;
    }

    /** One simulation tick: move a floor, or open the doors at a stop (LOOK algorithm). */
    synchronized void step() {
        if (state == ElevatorState.MAINTENANCE) return;
        if (state == ElevatorState.DOORS_OPEN) { state = upStops.isEmpty() && downStops.isEmpty() ? ElevatorState.IDLE : ElevatorState.MOVING; return; }

        if (direction == Direction.UP && upStops.isEmpty()) direction = downStops.isEmpty() ? Direction.NONE : Direction.DOWN;
        if (direction == Direction.DOWN && downStops.isEmpty()) direction = upStops.isEmpty() ? Direction.NONE : Direction.UP;
        if (direction == Direction.NONE) { state = ElevatorState.IDLE; return; }

        floor += (direction == Direction.UP) ? 1 : -1;
        state = ElevatorState.MOVING;
        if (direction == Direction.UP && upStops.remove(floor)) state = ElevatorState.DOORS_OPEN;
        if (direction == Direction.DOWN && downStops.remove(floor)) state = ElevatorState.DOORS_OPEN;
    }

    synchronized int floor() { return floor; }
    synchronized Direction direction() { return direction; }
    synchronized ElevatorState state() { return state; }
    synchronized int pendingStops() { return upStops.size() + downStops.size(); }
}

interface DispatchStrategy { ElevatorCar select(List<ElevatorCar> cars, HallCall call); }

/** Prefer an idle car or one already heading toward the floor in the same direction; else the nearest. */
class NearestCarStrategy implements DispatchStrategy {
    private final int totalFloors;
    NearestCarStrategy(int totalFloors) { this.totalFloors = totalFloors; }

    public ElevatorCar select(List<ElevatorCar> cars, HallCall call) {
        return cars.stream()
            .filter(c -> c.state() != ElevatorState.MAINTENANCE)
            .min(Comparator.comparingInt(c -> cost(c, call)))
            .orElseThrow(() -> new IllegalStateException("No elevator available"));
    }
    private int cost(ElevatorCar c, HallCall call) {
        int distance = Math.abs(c.floor() - call.floor());
        boolean onTheWay = (c.direction() == Direction.UP && call.direction() == Direction.UP && c.floor() <= call.floor())
                        || (c.direction() == Direction.DOWN && call.direction() == Direction.DOWN && c.floor() >= call.floor());
        if (c.direction() == Direction.NONE || onTheWay) return distance;
        return distance + 2 * totalFloors;                       // heading away: it must finish its sweep first
    }
}

class ElevatorController {
    private final List<ElevatorCar> cars; private final DispatchStrategy strategy;
    ElevatorController(List<ElevatorCar> cars, DispatchStrategy strategy) { this.cars = cars; this.strategy = strategy; }

    public void onHallCall(int floor, Direction dir) { strategy.select(cars, new HallCall(floor, dir)).addStop(floor); }
    public void onCarCall(int carId, int floor)     { cars.get(carId).addStop(floor); }
    public void tick()                              { cars.forEach(ElevatorCar::step); }   // driven by a scheduler every ~1s
}
```

## Design decisions to explain

- **Two `TreeSet`s per car** (stops above and below) make the LOOK algorithm natural. You always know the next stop in the current direction.
- **Dispatch is a Strategy.** Nearest-car, least-loaded, zone-based (cars 1 and 2 serve floors 0–20), or destination dispatch (passengers enter their floor in the lobby).
- **A `tick()`-driven simulation** keeps it deterministic and testable. In real hardware, the controller is event-driven by floor sensors.
- **Thread safety:** button presses arrive from many threads, so the car's methods are synchronised. The tick runs on one scheduler thread.

## Extensions

| Follow-up | Change |
|-----------|--------|
| Maintenance / emergency | `MAINTENANCE` state; the dispatcher skips the car; in emergency mode, all cars go to the ground floor and stop accepting calls |
| Weight/capacity | Track the load; if full, skip new hall pickups (still serve car calls) |
| Peak-hour mode | Switch the strategy at runtime (a morning up-peak sends idle cars to the lobby) |
| Displays and logging | An Observer on `FloorChanged` and `DoorOpened` events |
| VIP / express elevators | Car capabilities (allowed floors); the strategy filters on them |
