---
title: "Engineering practices"
subtitle: "Your values, as seen through your pull requests."
description: "Good code, code reviews, testing strategy, tech debt, estimates and adopting new tech: how SDE2s answer the 'how do you work?' questions without sounding dogmatic."
date: 2026-11-11
track: behavioural
weight: 3
---

These questions sound like opinions, and that's the trap: there's no right opinion, but there is a right *shape* of answer. Interviewers listen for pragmatism. Rules applied blindly sound junior; trade-offs weighed out loud sound senior.

> [!TIP] The short version
> - Good code is code the next person can **change safely at 2 AM**.
> - Reviews: **correctness first, style last**, and review fast.
> - Test effort should be **proportional to blast radius**.
> - Tech debt is fine when it's **deliberate, documented and paid back**.
> - Pick **boring technology** for the core; experiment at the edges.

## What does "good code" mean to you?

**What they're checking:** your engineering values, and whether they're practical.

- **Correct:** edge cases, failure paths and concurrency handled.
- **Readable:** code is read far more often than it's written. Clear names, small functions, no surprises.
- **Testable:** dependencies injected, side effects isolated.
- **Simple:** the simplest thing that solves today's problem. No speculative abstractions.
- **Observable:** useful logs, metrics and traces.
- **Consistent:** follows the codebase's conventions, even where you'd personally choose differently.

> Good code is code the next engineer can change confidently at 2 AM during an incident. That means readable, well tested, and with its failure behaviour made explicit.

## How do you give and receive code reviews?

**What they're checking:** do you raise the team's bar, and are you easy to work with?

**Giving a review**

- Look at **design and correctness** first (logic, edge cases, concurrency, security, backward compatibility), then readability, then style. Style belongs to the linter.
- Ask rather than order: *"What happens if this call times out?"*
- Label severity: `blocking:`, `suggestion:`, `nit:`.
- Praise good work out loud.
- Review within hours. Slow reviews quietly kill a team's speed.
- When a thread passes a few comments, **move to a call**.

**Receiving a review**

- Keep PRs small (a few hundred lines) with a clear description: what, why, how it was tested.
- Review the code, not the person, and expect the same in return.
- Disagree once with reasons; if it's still open, fall back to team conventions or escalate the *design question*.

## How do you decide what to test?

**What they're checking:** do you have a strategy, or just a coverage number?

| Layer | How many | What for |
|---|---|---|
| Unit | Many | Business logic and edge cases. Fast and deterministic |
| Integration | Some | Real DB queries, consumers, external clients (e.g. Testcontainers) |
| Contract | Per service boundary | Stop API-breaking changes between services |
| End-to-end | Few | Critical journeys only: place order → pay → confirm |
| Load / chaos | Before big events | Capacity and failure behaviour |

Test **behaviour, not implementation**, and spend effort by **risk**: money, data loss and hot paths get the most.

> A payments change gets unit tests on every state transition, integration tests against a real database to prove idempotency under concurrent requests, and a contract test with the gateway client. An internal admin screen gets a few unit tests. Test effort should match the blast radius.

## How do you handle technical debt?

**What they're checking:** can you balance shipping with long-term health, and win buy-in for the cleanup?

- Not all debt is bad. **Deliberate, documented** debt taken for a deadline is a valid business decision.
- **Track it** in a visible backlog with the impact of each item.
- **Quantify it in business terms:** "this module causes about three incidents a quarter and doubles the estimate of every feature that touches it."
- **Pay it down in increments:** leave code better than you found it, reserve a slice of each sprint, or bundle cleanup with feature work in the same area.
- Prefer the **strangler-fig** pattern to a big-bang rewrite.

> A pricing class had grown to 3,000 lines that everyone feared. Instead of asking for a rewrite, I showed the PM that the last four pricing features had each taken twice their estimate because of it. We refactored alongside upcoming features, one strategy at a time, each with tests. Over two quarters, lead time in that area roughly halved.

## Walk me through ticket-to-production

1. Clarify acceptance criteria and edge cases.
2. For anything non-trivial, a short design note, reviewed.
3. Code with tests in small commits.
4. Local checks: tests, linters, static analysis.
5. A PR with a clear description.
6. CI: tests, security scans, build.
7. Merge, auto-deploy to staging, smoke tests.
8. Production via **canary or blue-green**, behind a **feature flag** if risky.
9. Watch errors, latency and business metrics, with the **rollback plan known before you deploy**.
10. Ramp the flag, then delete it and the dead code.

> [!WARNING] Trap
> Stopping at "merge". An SDE2 owns the change in production, not just until the PR closes.

## How do you estimate?

- **Break it down** to tasks of a day or less.
- Count the invisible work: design, review rounds, testing, deploys, dependencies, on-call interruptions.
- **Spike the unknowns** with a time-box before committing.
- Give **ranges with confidence**: "three to five days, 70% sure; the risk is the partner API."
- **Re-estimate early** when you learn something, and say so.
- Compare actuals to estimates to calibrate yourself.

## How do you keep a growing codebase maintainable?

- Clear module and service **boundaries** with versioned contracts.
- **Docs that live with the code:** READMEs, ADRs, runbooks.
- **Automated gates:** formatters, linters, static analysis, required reviews.
- **Shared libraries** for cross-cutting concerns (logging, auth, retries).
- **Clear ownership** for every module (e.g. a CODEOWNERS file).
- **Observability as standard:** every service ships with dashboards and alerts.

## When would you skip tests or cut corners?

**What they're checking:** pragmatism versus dogma. It's a trick question.

> For a throwaway prototype, a spike, or a one-off migration script I'll run once with a dry-run mode and then delete, I'll lower the bar, and still verify the output carefully. I won't cut corners on money, user data, auth or hot paths. If we take a shortcut for a deadline, it becomes a ticket with an agreed payback date.

## How do you decide whether to adopt a new technology?

Staying current is easy (engineering blogs, papers, talks, side projects). The interesting part is **adoption criteria**:

- Does it solve a **problem we have now**?
- **Maturity:** community, support, production track record.
- **Operating cost:** who runs it, and who gets paged at 3 AM?
- **Team familiarity** and the hiring market.
- **Exit cost** if it doesn't work out.
- Prove it with a **small, reversible pilot**.

> I prefer boring technology on the core path and experiment at the edges. Every new piece of infrastructure is something we'll operate for years.

## Cheat sheet

- **Good code:** correct, readable, testable, simple, observable, consistent.
- **Reviews:** correctness → readability → style; label severity; review within hours.
- **Testing:** pyramid + contracts; effort by risk.
- **Debt:** deliberate, tracked, priced in business terms, paid incrementally.
- **Workflow:** ends with dashboards and a known rollback, not a merge.
- **New tech:** real problem, mature, operable, reversible pilot.
