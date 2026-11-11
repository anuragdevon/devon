---
title: "Leadership & mentorship"
subtitle: "SDE2s lead without the title."
description: "Mentoring, onboarding yourself fast, influence without authority, leading a multi-engineer project, deciding with incomplete information and prioritising: what 'multiplier' behaviour looks like in practice."
date: 2026-11-11
track: behavioural
weight: 6
---

At SDE2, nobody expects you to manage people. They do expect you to make the people around you faster. Interviewers call it *multiplier* behaviour: the team ships more, and better, because you're on it. These questions look for proof.

> [!TIP] The short version
> - **Mentoring** is teaching, not doing their work for them.
> - **Onboarding:** learn → contribute → own, over 30/60/90 days.
> - **Influence:** data → prototype → proof on your own turf → easy adoption → share.
> - **Uncertain decisions:** one-way door or two-way door?
> - **Priorities:** make trade-offs visible and let the right person decide.

## "Tell me about mentoring someone"

**What they're checking:** do you multiply the team, and are you a patient teacher?

> A new engineer was struggling with an event-driven codebase; their first PRs needed many review rounds and their confidence was dropping. For the first month I set up two pairing sessions a week, walked them through one order's lifecycle across services using traces, and gave them progressively larger tickets, starting with a well-scoped consumer bug. In reviews I explained the *why* and pointed to examples in the codebase. By month three they owned a small feature and were reviewing others' PRs. I turned the walkthrough into an onboarding doc, which shortened ramp-up for the next two hires.

> [!WARNING] Trap
> "I fixed their code for them." Show that you taught, not that you did the work.

## How do you onboard yourself onto a new team?

A **30-60-90** plan:

| Days | Goal | What it looks like |
|---|---|---|
| 1–30 | **Learn** | Set up the environment and ship a small fix in week one or two. Read architecture docs, ADRs, recent postmortems and runbooks. Trace a core request end to end. 1:1s with your manager, teammates, PM and partner teams. Shadow on-call |
| 31–60 | **Contribute** | Own a medium feature. Join design and code reviews. Fix one onboarding pain point and update the docs |
| 61–90 | **Own** | Lead a small project or design doc. Join the on-call rotation. Propose one data-backed improvement |

> [!NOTE] Two habits that pay off
> Postmortems are the fastest way to learn where a system is weak. And agree in writing with your manager what "successful in 90 days" means.

## Influencing without authority

> Every service logged in its own format, which made cross-service debugging slow. I had no authority over other teams, so I measured the cost first: in our last five incidents, about 30% of time-to-mitigate went into correlating logs. Then I built a small structured-logging library with automatic trace-ID propagation, migrated my own team's services as proof, and presented the before-and-after at the engineering guild. Four teams adopted it within a quarter and it became the recommended standard.

The pattern is reusable: **data → prototype → proof on your own turf → make adoption easy → share widely**.

## Leading a project with several engineers

- Write the **design doc** and get alignment first, so everyone builds toward the same picture.
- **Split along clean interfaces**: agree API contracts and mocks early so people work in parallel.
- Match tasks to **strengths and growth goals**.
- Set **milestones with something demo-able** at each.
- Track **risks and dependencies** explicitly, and unblock others before doing your own tickets.
- Plan **rollout, testing and on-call readiness** as part of the project.
- Close with a **retro**, and give credit publicly.

## Deciding without complete information

First classify it:

- **One-way door** (irreversible): slow down and gather more data.
- **Two-way door** (reversible): decide quickly and adjust.

Then gather what you can in the time you have, state your assumptions, make reversal cheap (flags, dual writes, small rollouts), and set a **checkpoint** to revisit.

> During an incident, a downstream availability service was returning stale data and we didn't yet know why. Blocking orders for affected stores would lose sales; serving stale data risked some cancellations. I chose to keep serving, added a banner and an automatic cancel-and-refund path, because that was reversible and capped the customer impact. We revisited after 30 minutes once the cause was found, and then wrote it into a runbook so the next on-call wouldn't have to decide from scratch.

## Prioritising competing requests

- Use **impact vs effort** and **urgent vs important**.
- A default order: **production issues > blocking others > committed sprint work > nice-to-haves**.
- **Make trade-offs visible:** "If I take this, X slips. Agreed?" When goals conflict, your manager or PM makes the call.
- **Protect focus time**: batch interruptions, and say no politely with a reason.
- Re-prioritise when facts change, and tell people.

> Three requests landed in one week: an urgent bug, a new feature from the PM, and an API a partner team needed for a launch. I listed impact and effort for each and shared it with my manager. We agreed: the bug first, then the partner API because it blocked their launch, and the feature next sprint. All three requesters heard the plan that day.

## Cheat sheet

- **Mentoring:** pairing, progressive tickets, explain the why, write it down.
- **Onboarding:** learn (30) → contribute (60) → own (90); read the postmortems.
- **Influence:** data, prototype, prove it locally, make adoption easy.
- **Leading:** design doc, clean interfaces, milestones, unblock first, credit others.
- **Uncertainty:** one-way vs two-way door; make reversal cheap; set a checkpoint.
- **Priorities:** visible trade-offs, the right decider, everyone told.
