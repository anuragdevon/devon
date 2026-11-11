---
title: "Projects & ownership"
subtitle: "Where they find out what you actually did."
description: "The project deep dive, measuring impact, defending trade-offs, and owning things nobody assigned you: how to prepare the stories that carry an SDE2 loop."
date: 2026-11-11
track: behavioural
weight: 2
---

Behavioural rounds sound soft, but the project questions are where an interviewer goes deepest. Expect ten to fifteen minutes of follow-ups on a single project: why this queue, why that database, what broke, what you'd change. Vague answers fall apart by the second "why?".

> [!TIP] The short version
> - Prepare **one project as a mini system-design talk**: context, architecture, your part, hard parts, results, hindsight.
> - Speak in **metrics**: baseline, target, guardrail, result.
> - Every decision had **options and a cost**. Say what you gave up.
> - Ownership stories beat heroics: find a problem nobody owned, fix it, make it stick.

## "Walk me through your most challenging project"

**What they're checking:** depth, how much you actually owned, technical judgement, and whether you can explain a complex system clearly.

Prepare it in six beats:

1. **Business context:** what problem, for whom, and why it mattered.
2. **Architecture:** draw it. Services, stores, queues, the request flow.
3. **Your role:** exactly which parts you designed and built.
4. **Hard parts:** two or three challenges and the trade-offs you weighed.
5. **Result:** metrics before and after.
6. **Hindsight:** what you'd do differently now.

> **Context:** driver assignment at a ride-hailing company was a synchronous call chain. At peak, timeouts in the ETA service cascaded into assignment delays.
>
> **What I did:** moved assignment to events. The trip service publishes `TripRequested`; the assignment service consumes it, calls ETA with a timeout, a circuit breaker and a cached fallback, and publishes `DriverAssigned`.
>
> **Hard parts:** Kafka is at-least-once, so the trip ID became an idempotency key with a conditional write. Partitioning by trip ID kept each trip's events in order. We dual-ran both flows behind a flag and ramped 1% → 10% → 50% → 100%.
>
> **Result:** assignment-delay incidents fell from about six a month to one.
>
> **Hindsight:** I'd build the dead-letter replay tool up front, not after the first incident.

> [!WARNING] Traps
> Saying "we" for everything, not knowing your own numbers (QPS, data size, latency), picking a project where you were peripheral, or being unable to say why you chose Kafka over SQS.

## "How do you measure the impact of your work?"

**What they're checking:** do you think in outcomes, or in output ("I closed 40 tickets")?

| Kind | Examples |
|---|---|
| Business | Conversion, success rate, revenue, retention, cost |
| Engineering | p50/p95/p99 latency, error rate, availability, infra cost |
| Team | Build time, deploy frequency, pages per week, onboarding time |

The habit that separates SDE2 answers: **set the baseline before you start**, pick one **success metric** and a couple of **guardrails** (things that must not get worse), and **measure after launch**, ideally with an A/B test.

> For a checkout optimisation, p99 latency was the primary metric, conversion was the business metric, and error rate was the guardrail. A week-long A/B test took p99 from 600 to 220 ms and nudged conversion up 0.3%. That baseline is what got the next phase funded.

## "Tell me about a trade-off you made"

**What they're checking:** judgement. SDE2s choose between imperfect options and can explain why.

Give the **options** (two or three), the **criteria** (latency, consistency, cost, team familiarity, time to market, operational load), the **decision**, and **what you gave up**.

> We had to store live driver locations, around 50K writes a second at peak, but only needed the latest position plus a day of history. Options: partitioned Postgres, Redis with TTLs, or Cassandra. We chose Redis geo-indexes for the latest position and batched history to object storage. We gave up durability on live data: losing a few seconds of pings in a failover was fine because a new ping arrives every few seconds. We wrote that down in the design doc so it was a decision, not an accident.

> [!WARNING] Trap
> Presenting your choice as having no downside. Every choice has one, and the interviewer knows it.

## "Tell me about a time you improved performance or cut cost"

**What they're checking:** can you find a bottleneck with data instead of guessing, and quantify the win?

The loop is **Measure → Profile → Hypothesise → Fix → Verify**.

> The catalogue API's p99 was about 900 ms at peak. Traces showed 60% of the time in N+1 queries for product variants, plus serialising huge payloads. We batched the queries into one `IN`, added a read-through cache with a 5-minute TTL and event-based invalidation, and trimmed unused response fields. p99 dropped to about 180 ms, database reads fell 70%, we shrank the read replicas, and a latency SLO alert now guards against regressions.

## "Tell me about owning something outside your job"

**What they're checking:** the core SDE2 trait. Do you act like an owner, or say "not my job"?

> Builds took 25 minutes and nobody owned that, so everyone lived with it. I spent a few hours profiling: tests ran serially and Docker layers weren't cached. I wrote a one-page proposal, got a sprint from my manager, parallelised the suites and fixed the caching. Builds dropped to 8 minutes for twelve engineers, and two other teams copied the setup.

> [!WARNING] Trap
> A story where you quietly took over someone else's work. That's a collaboration red flag, not ownership.

## "How do you approach a new project from scratch?"

**What they're checking:** do you think before you code?

The SDE2 playbook:

1. **Understand the problem:** the user, the goal, how success is measured.
2. **Requirements:** functional and non-functional (scale, latency, availability, compliance).
3. **Explore what exists:** what can be reused, who owns the dependencies.
4. **Design doc:** options, trade-offs, API contracts, data model, failure modes, rollout and rollback.
5. **Review** with the team, senior engineers and dependent teams.
6. **Break it down:** milestones, tickets, a thin end-to-end slice first.
7. **Build** with tests, metrics, logs and feature flags.
8. **Roll out gradually** while watching dashboards.
9. **Retro.**

> [!NOTE] The line worth remembering
> Ship a thin end-to-end slice behind a flag first. It flushes out integration problems early and gives stakeholders something real to react to.

## "Tell me about a project that didn't go to plan"

**What they're checking:** honesty, accountability, and whether you course-correct.

> I estimated a promotions-engine refactor at three weeks without spotting undocumented legacy rules, like region-specific discount stacking. By week two I could see we'd slip, so I told my manager and PM immediately with two options: ship for 80% of rule types and keep the legacy path for the rest, or slip two weeks. We shipped on time with the first option and migrated the long tail the next sprint. Now I spike legacy code for a day or two before I commit to an estimate.

## "What are you most proud of building?"

**What they're checking:** what motivates you, and where your quality bar sits.

It doesn't have to be the biggest project. Pick one where your **craft or judgement** showed: an abstraction others adopted, a tool that killed a pain point, a reliability fix.

> Services were each implementing retries their own way, which occasionally caused duplicate refunds. I built a small shared library with idempotency keys, exponential backoff with jitter and metrics built in, wrote clear docs, and migrated the first three services myself. It's now used by more than ten services, and that class of bug essentially disappeared. I'm proud of it because the impact multiplied across teams.

## Cheat sheet

- **Deep dive:** context → architecture → your part → hard parts → results → hindsight.
- **Impact:** baseline, success metric, guardrails, measured result.
- **Trade-offs:** options, criteria, decision, cost.
- **Performance:** measure, profile, hypothesise, fix, verify, then alert on regressions.
- **Ownership:** an unowned problem, fixed with buy-in, made permanent.
- **Failures:** flag early, bring options, change your process.
