---
title: "Notification service"
subtitle: "Every system sends them. Few send them well."
description: "Templates instead of raw text, per-channel senders with provider failover, retries with backoff and jitter, preference filters, idempotency by request ID, and the path to an async pipeline."
date: 2026-11-12
track: lld
weight: 9
---

"Design a service other teams call to notify users by SMS, email or push" is a very practical SDE2 question, because every product needs it and most get it slightly wrong. The design is a handful of small patterns working together: a strategy per channel, an adapter per vendor, a chain of filters, and retries wrapped around the providers.

> [!TIP] The short version
> - **Callers send a template ID + parameters,** never raw text.
> - **Filters as a list:** opt-outs, quiet hours, frequency caps. Critical messages always go.
> - **Retry only retryable errors,** with exponential backoff and jitter, then fail over to the next provider.
> - **Idempotent by request ID,** so upstream retries never spam the user.

## Requirements

1. `send(NotificationRequest)`: recipient user, **template ID + parameters**, channels (SMS, EMAIL, PUSH, WHATSAPP), priority.
2. **Templates** are rendered with parameters, e.g. "Your order {{orderId}} is out for delivery".
3. Respect **user preferences** (opted out of promotional SMS) and **quiet hours** for low-priority messages.
4. **Retries** with backoff on provider failure; **fallback** to another provider.
5. **Idempotent:** the same request ID is never sent twice.
6. Track delivery status per channel.

## Design

```text
NotificationService
  send(NotificationRequest): NotificationResult

NotificationRequest
  String requestId
  String userId
  String templateId
  Map params
  Set<Channel> channels
  Priority priority

ChannelSender (interface)
  channel(): Channel
  send(Recipient, RenderedMessage): DeliveryResult

SmsSender

EmailSender

PushSender

Provider (interface)
  deliver(...)

TemplateEngine
  render(templateId, Channel, params): RenderedMessage

PreferenceFilter (interface)
  allowed(userId, Channel, Priority): bool

RetryPolicy
  execute(Supplier)

How they connect:
  SmsSender implements ChannelSender
  EmailSender implements ChannelSender
  PushSender implements ChannelSender
  SmsSender uses Provider (primary + fallback)
  NotificationService uses ChannelSender
  NotificationService uses TemplateEngine
  NotificationService uses PreferenceFilter
```

**Patterns:**
- **Strategy:** a `ChannelSender` per channel.
- **Adapter:** a `Provider` per vendor (Twilio, Gupshup, SES, FCM).
- **Chain of Responsibility:** the filters (opt-out, quiet hours, frequency cap).
- **Decorator:** retry and fallback wrapped around providers.

## Core code

```java
enum Channel { SMS, EMAIL, PUSH, WHATSAPP }
enum Priority { CRITICAL, TRANSACTIONAL, PROMOTIONAL }
enum DeliveryStatus { SENT, FAILED, SKIPPED }

record NotificationRequest(String requestId, String userId, String templateId,
                           Map<String, String> params, Set<Channel> channels, Priority priority) {}
record RenderedMessage(String subject, String body) {}
record DeliveryResult(Channel channel, DeliveryStatus status, String detail) {}

interface Provider { void deliver(String address, RenderedMessage msg) throws ProviderException; String name(); }

interface ChannelSender {
    Channel channel();
    DeliveryResult send(User user, RenderedMessage msg);
}

/** Wraps providers in priority order and tries each with retries: Decorator/fallback. */
class FailoverChannelSender implements ChannelSender {
    private final Channel channel; private final List<Provider> providers; private final RetryPolicy retry;
    private final Function<User, String> addressOf;               // user → phone / email / device token

    FailoverChannelSender(Channel channel, List<Provider> providers, RetryPolicy retry, Function<User, String> addressOf) {
        this.channel = channel; this.providers = providers; this.retry = retry; this.addressOf = addressOf;
    }
    public Channel channel() { return channel; }
    public DeliveryResult send(User user, RenderedMessage msg) {
        String address = addressOf.apply(user);
        if (address == null) return new DeliveryResult(channel, DeliveryStatus.SKIPPED, "no address");
        for (Provider p : providers) {
            try {
                retry.run(() -> p.deliver(address, msg));
                return new DeliveryResult(channel, DeliveryStatus.SENT, p.name());
            } catch (ProviderException e) { /* log, try the next provider */ }
        }
        return new DeliveryResult(channel, DeliveryStatus.FAILED, "all providers failed");
    }
}

class RetryPolicy {
    private final int maxAttempts; private final Duration baseDelay;
    RetryPolicy(int maxAttempts, Duration baseDelay) { this.maxAttempts = maxAttempts; this.baseDelay = baseDelay; }

    void run(ThrowingRunnable action) throws ProviderException {
        for (int attempt = 1; ; attempt++) {
            try { action.run(); return; }
            catch (ProviderException e) {
                if (!e.isRetryable() || attempt == maxAttempts) throw e;
                long backoff = baseDelay.toMillis() * (1L << (attempt - 1));
                sleep(ThreadLocalRandom.current().nextLong(backoff / 2, backoff + 1));   // exponential backoff + jitter
            }
        }
    }
    private void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); } }
}
interface ThrowingRunnable { void run() throws ProviderException; }

interface PreferenceFilter { boolean allowed(User user, Channel channel, Priority priority); }

class OptOutFilter implements PreferenceFilter {
    public boolean allowed(User u, Channel c, Priority p) {
        return p == Priority.CRITICAL || !u.optedOut(c, p);        // critical (OTP, security) always goes out
    }
}
class QuietHoursFilter implements PreferenceFilter {
    private final Clock clock;
    QuietHoursFilter(Clock clock) { this.clock = clock; }
    public boolean allowed(User u, Channel c, Priority p) {
        if (p != Priority.PROMOTIONAL) return true;
        LocalTime t = LocalTime.now(clock.withZone(u.zone()));
        return !(t.isAfter(LocalTime.of(22, 0)) || t.isBefore(LocalTime.of(8, 0)));
    }
}

class NotificationService {
    private final Map<Channel, ChannelSender> senders;
    private final List<PreferenceFilter> filters;
    private final TemplateEngine templates; private final UserRepository users;
    private final Map<String, List<DeliveryResult>> processed = new ConcurrentHashMap<>();   // a DB table in prod

    NotificationService(List<ChannelSender> senders, List<PreferenceFilter> filters,
                        TemplateEngine templates, UserRepository users) {
        this.senders = senders.stream().collect(Collectors.toMap(ChannelSender::channel, s -> s));
        this.filters = filters; this.templates = templates; this.users = users;
    }

    public List<DeliveryResult> send(NotificationRequest req) {
        // computeIfAbsent: atomic per requestId, so a duplicate concurrent call returns the first result
        return processed.computeIfAbsent(req.requestId(), id -> doSend(req));
    }

    private List<DeliveryResult> doSend(NotificationRequest req) {
        User user = users.get(req.userId());
        List<DeliveryResult> results = new ArrayList<>();
        for (Channel ch : req.channels()) {
            if (!filters.stream().allMatch(f -> f.allowed(user, ch, req.priority()))) {
                results.add(new DeliveryResult(ch, DeliveryStatus.SKIPPED, "preference/quiet hours"));
                continue;
            }
            RenderedMessage msg = templates.render(req.templateId(), ch, req.params());
            results.add(senders.get(ch).send(user, msg));
        }
        return results;
    }
}
```

## Design decisions to explain

- **Callers send a template ID and parameters, not raw text.** That keeps content consistent, makes localisation (per-language templates) possible, and lets the content be reviewed for compliance.
- **Filters as a list:** adding a frequency cap ("no more than 3 promotional pushes a day") is one new class.
- **Separate provider adapters** make vendor fallback and cost-based routing possible.
- **Retries only on retryable errors** (timeouts, 5xx). Never retry on "invalid number".
- **Idempotency by `requestId`:** the producer (e.g. the order service) uses `orderId + status` as the request ID, so retries upstream don't spam the user.

## Scaling it (bridge to HLD)

- Make it **asynchronous**: the API validates and enqueues to Kafka/SQS **per priority** (OTPs on a separate fast lane, so a promotional campaign can't delay them). Workers per channel consume and send.
- **Rate limits per provider** (vendor TPS limits) using a token bucket (see [LLD 05](/study/lld/rate-limiter/)).
- **Delivery receipts:** provider webhooks update the status (`DELIVERED`, `READ`). Store them for analytics.
- **A DLQ** for permanently failed messages, with a replay tool.
- **Campaign fan-out** (10 million users): a batch job builds the audience, sends in chunks, and throttles so as not to overload providers or your own app servers when users tap through.
