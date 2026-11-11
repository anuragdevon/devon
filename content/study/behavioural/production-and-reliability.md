---
title: "Production & reliability"
subtitle: "Mitigate first. Understand second. Prevent third."
description: "Incidents, debugging what you can't reproduce, postmortems, alerting, peak-traffic prep, designing for failure and sustainable on-call, explained the way an owner thinks."
date: 2026-11-11
track: behavioural
weight: 4
---

Nothing reveals seniority faster than how someone talks about an outage. Juniors describe the bug. SDE2s describe the *response*: how it was noticed, how quickly users stopped hurting, how everyone was kept informed, and what changed so it can't happen the same way again.

> [!TIP] The short version
> - Incidents: **Detect → Mitigate → Communicate → Root-cause → Prevent.**
> - Mitigation comes **before** understanding. Roll back first, debug after.
> - Alert on **symptoms users feel**, diagnose with causes on dashboards.
> - Postmortems are **blameless** and end in **owned action items**.
> - Every network call gets a **timeout**; every retry gets **backoff, jitter and a budget**.

## "Tell me about an incident you handled"

**What they're checking:** composure, method, communication, and whether you stop it recurring.

Tell it in five beats:

> **Detect:** on a Friday-night peak, an alert fired: checkout success dropped from 99.5% to 93%.
>
> **Mitigate:** the deploy timeline showed a connection-pool config change 20 minutes earlier. I rolled it back and success recovered within about eight minutes.
>
> **Communicate:** updates in the incident channel every ten minutes, and support kept in the loop so they could handle customers.
>
> **Root cause:** the new config shrank the pool. Under peak load requests queued for connections, timed out, and client retries amplified the load.
>
> **Prevent:** a blameless postmortem added config validation, a canary stage for config changes, an alert on pool wait time, and client retries with jitter and a retry budget.

> [!WARNING] Traps
> Blaming a person, skipping the prevention part, or debugging for an hour before mitigating.

## Debugging what you can't reproduce locally

A systematic method beats a clever guess:

1. **Scope it:** which users, regions, endpoints or versions? Since when?
2. **Correlate with change:** deploys, config, flags, traffic spikes, dependency incidents.
3. **Use the three pillars:** metrics tell you *what and when*, traces tell you *where*, logs tell you *why*. Trace IDs tie them together.
4. **Hypothesise and test** one idea at a time, cheapest check first.
5. **Bisect:** compare a healthy pod, region or version with a failing one.
6. **Add targeted logging** behind a flag, or reproduce in staging with production-like data.
7. After the fix, add a **regression test and the alert** that would have caught it.

> [!NOTE] The usual suspects
> Timeouts and retries, clock skew, stale caches, race conditions, partial deploys, data edge cases (nulls, unicode, huge payloads), exhausted thread or connection pools, GC pauses, noisy neighbours.

## What makes a good postmortem?

- **Blameless:** ask "why did the system allow this?", not "who did this?".
- **Timeline** with timestamps: detection, response, mitigation, resolution.
- **Impact:** users affected, revenue lost, duration, error budget burned.
- **Root cause via the 5 whys:** go past the trigger ("bad deploy") to the conditions that allowed it ("no canary, no test for this path, alert threshold too loose").
- **What went well and badly** in the response itself.
- **Action items:** specific, owned, dated, and tracked to done.

## What do you monitor, and how do you design alerts?

| Framework | Measures |
|---|---|
| Golden signals | Latency (p50/p95/p99), traffic, errors, saturation |
| RED (services) | Rate, Errors, Duration |
| USE (resources) | Utilisation, Saturation, Errors |
| Business | Orders per minute, payment success rate |
| Dependencies | Downstream latency/errors, consumer lag, replication lag |

Set **SLOs** and alert on **error-budget burn rate** rather than raw thresholds. Every page must be **actionable** and link to a **runbook**; anything that isn't urgent for users becomes a ticket. Alert fatigue is itself a reliability risk.

> I alert on symptoms, like the checkout error rate, rather than causes, like high CPU, because users feel symptoms. Cause metrics live on dashboards for diagnosis.

## Preparing for a huge traffic spike

1. **Forecast** from past peaks and the business plan; target 2–3× headroom.
2. **Load-test** critical paths at the target rate and find the first bottleneck.
3. **Scale ahead:** pre-warm autoscaling, caches and load balancers; raise database capacity, connection limits and cloud quotas.
4. **Protect:** rate limits, circuit breakers, timeouts, bulkheads, load shedding, queues.
5. **Degrade gracefully:** flags to switch off non-critical features (recommendations, ratings) to protect the core flow.
6. **Freeze changes** around the event.
7. **War room:** dashboards, on-call roster, runbooks, contacts for every dependency.
8. **Review** afterwards.

> Before a big sale, we load-tested at three times forecast peak and found the cache cluster's network would saturate first, so we re-sharded it. We also wired a flag to turn off personalised recommendations if latency crossed a threshold. On the day we used it for fifteen minutes, and checkout never noticed.

## Designing for failure in a distributed system

| Pattern | Why |
|---|---|
| Timeouts everywhere | Never wait forever |
| Retries with backoff + jitter + budget | Recover from blips without a retry storm. Only for idempotent operations |
| Idempotency keys | Retries don't double-charge or double-create |
| Circuit breakers | Fail fast when a dependency is down |
| Bulkheads | One slow dependency can't eat every thread |
| Fallbacks | Cached or default responses; graceful degradation |
| Queues + dead-letter queues | Absorb bursts; park poison messages |
| Redundancy | Multi-AZ, replicas, no single point of failure |
| Outbox / sagas | Consistency across services |

## How do you make on-call sustainable?

**What they're checking:** do you accept "you build it, you run it", and do you *improve* on-call rather than just survive it?

> On-call is part of owning a service: it's the fastest feedback on how well we built it. To keep it sustainable, every page must be actionable and have a runbook, noisy alerts get fixed or deleted, we review on-call load weekly and prioritise the top recurring causes, and handovers are written down.

## Cheat sheet

- **Incident story:** detect, mitigate, communicate, root-cause, prevent.
- **Debugging:** scope, correlate, metrics → traces → logs, bisect, then add the alert.
- **Postmortem:** blameless, timeline, impact, 5 whys, owned actions.
- **Alerts:** symptoms + SLO burn rate; every page actionable.
- **Peaks:** forecast, load-test, pre-scale, protect, degrade, freeze, war room.
- **Resilience:** timeouts, retries with budget, idempotency, breakers, bulkheads.
