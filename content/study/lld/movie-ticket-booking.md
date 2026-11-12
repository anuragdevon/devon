---
title: "Movie ticket booking"
subtitle: "Two people, one seat, the same millisecond."
description: "Seat holds that are all-or-nothing, expire on their own and never deadlock, an idempotent payment flow with automatic refunds, and how to do it across many servers."
date: 2026-11-12
track: lld
weight: 5
---

This is *the* concurrency question. The browsing part takes five minutes; the interviewer will spend the rest of the round on two users selecting the same seat at the same moment. Model a seat's state per show, hold seats atomically with an expiry, and handle the late payment that arrives after the hold has gone.

> [!TIP] The short version
> - **Seat vs ShowSeat:** the seat is physical; the per-show state is what you lock.
> - **Holds are all-or-nothing:** check every seat, then hold every seat, under one per-show lock.
> - **Expiry:** lazy for correctness, active for a fresh seat map. Use both.
> - **Late payment on an expired hold:** detect the mismatch and refund automatically.

## Requirements

1. Browse cities → theatres → screens → shows (a movie + a screen + a time).
2. View the seat map for a show, with each seat's status and price by seat category.
3. **Select seats → hold them for N minutes → pay → confirm the booking.**
4. **No double booking**, even under concurrent requests.
5. Holds that aren't paid within the time limit are **released automatically**.
6. Cancel a booking, with a refund policy.

## Entities

`Movie`, `Theatre`, `Screen`, `Seat` (row, number, `SeatCategory`), `Show` (movie, screen, start time, price per category), `ShowSeat` (per-show seat state: `AVAILABLE / HELD / BOOKED`), `SeatHold` (holdId, userId, seats, expiresAt), `Booking` (`PENDING_PAYMENT / CONFIRMED / CANCELLED / EXPIRED`), `Payment`, `SeatLockManager`, `BookingService`.

**Key modelling point:** a `Seat` is physical and static. A `ShowSeat` is the seat's **state for one show**. Concurrency control happens on `ShowSeat`.

```text
Show
  String id
  Movie movie
  Screen screen
  Instant start
  Map<SeatCategory, Money> prices

ShowSeat
  String seatId
  SeatStatus status
  String holdId
  Instant holdExpiry

SeatLockManager
  hold(showId, seatIds, userId): SeatHold
  release(holdId)
  confirm(holdId)

BookingService
  holdSeats()
  confirmBooking(holdId, paymentRef): Booking
  cancel(bookingId)

Booking
  String id
  List<String> seatIds
  BookingStatus status
  Money amount

How they connect:
  Show owns ShowSeat (1 to many)
  BookingService uses SeatLockManager
  BookingService uses Booking
```

## Core code: holding seats atomically

**The critical requirement:** a hold for seats {A1, A2, A3} is **all-or-nothing**, and two overlapping requests must not both succeed or deadlock.

```java
enum SeatStatus { AVAILABLE, HELD, BOOKED }

class ShowSeat {
    final String seatId;
    SeatStatus status = SeatStatus.AVAILABLE;
    String holdId; Instant holdExpiry;
    ShowSeat(String seatId) { this.seatId = seatId; }

    boolean isAvailable(Instant now) {
        return status == SeatStatus.AVAILABLE
            || (status == SeatStatus.HELD && holdExpiry.isBefore(now));   // lazily treat expired holds as free
    }
}

record SeatHold(String holdId, String showId, String userId, List<String> seatIds, Instant expiresAt) {}

class SeatLockManager {
    private final Map<String, Map<String, ShowSeat>> seatsByShow;         // showId → seatId → ShowSeat
    private final Map<String, ReentrantLock> showLocks = new ConcurrentHashMap<>();
    private final Map<String, SeatHold> holds = new ConcurrentHashMap<>();
    private final Duration holdTtl; private final Clock clock;

    SeatLockManager(Map<String, Map<String, ShowSeat>> seatsByShow, Duration holdTtl, Clock clock) {
        this.seatsByShow = seatsByShow; this.holdTtl = holdTtl; this.clock = clock;
    }

    public SeatHold hold(String showId, List<String> seatIds, String userId) {
        ReentrantLock lock = showLocks.computeIfAbsent(showId, k -> new ReentrantLock());
        lock.lock();                                                      // a lock per show: shows don't contend
        try {
            Instant now = clock.instant();
            Map<String, ShowSeat> seats = seatsByShow.get(showId);
            for (String id : seatIds) {                                   // 1. check ALL seats first
                ShowSeat s = seats.get(id);
                if (s == null || !s.isAvailable(now))
                    throw new SeatUnavailableException(id);
            }
            String holdId = UUID.randomUUID().toString();
            Instant expiry = now.plus(holdTtl);
            for (String id : seatIds) {                                   // 2. then hold ALL of them
                ShowSeat s = seats.get(id);
                s.status = SeatStatus.HELD; s.holdId = holdId; s.holdExpiry = expiry;
            }
            SeatHold hold = new SeatHold(holdId, showId, userId, List.copyOf(seatIds), expiry);
            holds.put(holdId, hold);
            return hold;
        } finally {
            lock.unlock();
        }
    }

    /** Called after successful payment. Fails if the hold expired and the seats were taken. */
    public void confirm(String holdId) {
        SeatHold h = holds.get(holdId);
        if (h == null) throw new IllegalStateException("Unknown hold");
        ReentrantLock lock = showLocks.get(h.showId());
        lock.lock();
        try {
            Map<String, ShowSeat> seats = seatsByShow.get(h.showId());
            for (String id : h.seatIds()) {
                ShowSeat s = seats.get(id);
                if (s.status != SeatStatus.HELD || !holdId.equals(s.holdId))
                    throw new HoldExpiredException(holdId);               // the caller must refund
            }
            h.seatIds().forEach(id -> { ShowSeat s = seats.get(id); s.status = SeatStatus.BOOKED; s.holdExpiry = null; });
            holds.remove(holdId);
        } finally { lock.unlock(); }
    }

    public void release(String holdId) {
        SeatHold h = holds.remove(holdId);
        if (h == null) return;                                            // idempotent
        ReentrantLock lock = showLocks.get(h.showId());
        lock.lock();
        try {
            Map<String, ShowSeat> seats = seatsByShow.get(h.showId());
            for (String id : h.seatIds()) {
                ShowSeat s = seats.get(id);
                if (holdId.equals(s.holdId) && s.status == SeatStatus.HELD) {
                    s.status = SeatStatus.AVAILABLE; s.holdId = null; s.holdExpiry = null;
                }
            }
        } finally { lock.unlock(); }
    }
}
```

> [!IMPORTANT] A subtle point to mention
> With lazy expiry, an expired `HELD` seat can be re-held by user B, which overwrites its `holdId`. If user A's payment then succeeds late, `confirm` detects the `holdId` mismatch and fails, so A must be **refunded automatically**. Say this out loud. It shows end-to-end thinking.

### Booking flow
```java
class BookingService {
    private final SeatLockManager locks; private final PaymentGateway payments;
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();

    public Booking startBooking(String userId, String showId, List<String> seatIds) {
        SeatHold hold = locks.hold(showId, seatIds, userId);
        Booking b = new Booking(hold.holdId(), userId, showId, seatIds, BookingStatus.PENDING_PAYMENT, price(showId, seatIds));
        bookings.put(b.id(), b);
        return b;                                        // the client is redirected to payment with b.id() as the idempotency key
    }

    public Booking onPaymentSuccess(String bookingId, String paymentRef) {
        Booking b = bookings.get(bookingId);
        if (b.status() == BookingStatus.CONFIRMED) return b;            // idempotent webhook handling
        try {
            locks.confirm(bookingId);                                   // holdId == bookingId here
            b = b.withStatus(BookingStatus.CONFIRMED);
        } catch (HoldExpiredException e) {
            payments.refund(paymentRef);
            b = b.withStatus(BookingStatus.EXPIRED);
        }
        bookings.put(b.id(), b);
        return b;
    }
    // price(...) looks up the show's category prices
}
```

## Expiring holds

- **Lazy:** `isAvailable` treats expired holds as free (implemented above). It's simple and always correct.
- **Active:** a `ScheduledExecutorService` (or a delay queue) calls `release(holdId)` at the expiry time, so the seat map shows seats freed immediately.
- Use **both**: lazy for correctness, active for a fresh UI.

## Scaling it beyond one JVM (follow-up)

| Approach | How it works |
|----------|--------------|
| **DB conditional update** | `UPDATE show_seat SET status='HELD', hold_id=?, hold_expiry=? WHERE show_id=? AND seat_id IN (...) AND (status='AVAILABLE' OR (status='HELD' AND hold_expiry < now()))` inside a transaction. If the number of updated rows is less than requested, roll back. That's atomic all-or-nothing |
| **Pessimistic** | `SELECT ... FOR UPDATE` on the seat rows, **ordered by seat_id** to avoid deadlocks |
| **Redis** | `SET seat:{show}:{seat} holdId NX PX 600000` per seat (or a Lua script for multiple seats). Fast, but the DB stays the source of truth for `BOOKED` |
| **Hot shows** (a blockbuster opening) | A virtual waiting room/queue in front, rate limiting, and sharding by show |

## Other extensions

- **Pricing:** dynamic pricing by demand, a `PricingStrategy` per show, convenience fees.
- **Cancellation:** a `RefundPolicy` strategy based on the time before the show starts.
- **Notifications:** an Observer on booking-status changes sends the e-ticket.
- **Search:** out of scope for LLD. It's HLD material (an index of shows by city, movie and date).
