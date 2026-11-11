---
title: "The AI-assisted workflow"
subtitle: "Faster, without lowering the bar."
description: "A spec-plan-slice-verify workflow for coding agents, writing prompts that produce correct code, a review checklist for generated code, keeping team quality high, and measuring whether AI is actually helping."
date: 2026-11-11
track: ai-era
weight: 2
---

Using a coding agent well is a skill, and like most skills it's mostly process. The engineers who get the most from these tools aren't the ones with clever prompts; they're the ones who decide precisely what they want before asking, and check precisely what they got afterwards.

> [!TIP] The short version
> - **Spec → plan → build in slices → verify → review.** You own the spec, the plan approval and the final review.
> - Brief the agent like a **capable new teammate** who knows nothing about your project.
> - Review generated code **more sceptically** than human code.
> - Encode standards in **tools and files**, not in people's memories.
> - Measure **lead time and change-failure rate**, not lines generated.

## A workflow that keeps quality high

1. **Understand the problem yourself.** Read the requirement, talk to the PM, list edge cases. The agent can help you explore ("where is cancellation handled? trace the flow").
2. **Write a short spec:** goal, acceptance criteria, domain rules, edge cases, non-goals, interfaces. These are the most valuable 30 minutes of the task.
3. **Plan with the agent** before any code. Review the plan as you'd review a junior's design: files touched, approach, risks. Fix the plan, not the code.
4. **Build in small slices:** one interface or module at a time, each compiled and tested before the next. Keep diffs reviewable.
5. **Tests are the contract.** Write, or carefully review, the tests for the key business rules yourself. Then check that they'd actually fail if the logic were wrong.
6. **Verify:** run it, read the logs, poke the edge cases, run static analysis and security scans.
7. **Self-review the whole diff** as if a stranger wrote it, then open a normal PR.

## Writing instructions a coding agent can't misread

Brief it the way you'd brief a strong new teammate:

- **Context:** which module, which existing pattern to copy ("structure it like `CancelOrderHandler`").
- **Requirements:** domain rules, invariants, inputs, outputs, error behaviour.
- **Constraints:** no new dependencies, backward compatible, public API unchanged.
- **Definition of done:** tests pass, including *these* cases.
- **Ask for a plan first** on anything non-trivial.

```text
Vague:
  Add coupon validation.

Precise:
  In pricing-service, add a CouponValidator used by CheckoutPricer.
  Rules: the coupon must be active; the minimum cart value applies to the
  item total before taxes; one coupon per order; region-restricted coupons
  must match the delivery region; the per-user usage limit is checked against
  CouponUsageRepository (cancelled orders don't count).
  Return a typed result (Valid | Invalid(reason)); no exceptions for business
  rejections. Follow the existing Validator interface. Unit-test every rule
  and the combinations. Don't change CheckoutPricer's public signature.
  Show me the plan first.
```

> [!NOTE] Persistent context is a team asset
> Most tools read a project instructions file (`CLAUDE.md`, `AGENTS.md`, editor rules files). Put conventions, build and test commands, architecture notes and "never do X" rules there. Setting this up well improves every teammate's results.

## Reviewing AI-generated code: the checklist

Generated code looks confident and consistent even when it's wrong, so review it harder than human code.

- **Requirement:** does it solve the real requirement, not a simplified version? Tick off each acceptance criterion.
- **Edge cases:** nulls, empty collections, duplicates, boundaries, time zones, currency rounding, unicode.
- **Errors:** surfaced or silently swallowed? Are retries safe?
- **Concurrency:** check-then-act races, shared mutable state, transaction boundaries.
- **Security:** authorization on every resource, parameterised queries, no secrets or personal data in logs, validated input.
- **Reality:** do the methods, config keys and library versions actually exist?
- **Conventions:** does it reuse existing utilities, or reinvent them?
- **Tests:** would they fail if the logic broke, or do they just mirror the implementation?
- **Scope:** did it change things you didn't ask for?
- **Simplicity:** generated code over-engineers. Is every abstraction earning its place?
- **Operability:** useful logs, metrics and error messages for on-call.

> [!TIP] A cheap second opinion
> Ask a separate session to review the diff for bugs and security issues. It catches some things, but you still make the call.

## Keeping a team's quality high when everyone uses AI

- **Automate the standards:** formatters, linters, static analysis, architecture tests (e.g. "controllers never call repositories"), coverage gates on critical modules. They apply equally to human and generated code.
- **Shared context files** describing architecture and anti-patterns, reviewed like code.
- **Small PRs.** It's now trivially easy to generate a 2,000-line diff. Insist on slicing.
- **Ownership:** the author is accountable for every line, whoever or whatever typed it.
- **Strong tests on business rules**, so a refactor can't silently change behaviour.
- **Watch for drift:** schedule clean-ups when duplicate helpers and inconsistent patterns appear.

## Where AI helps most, and least

| High leverage | Use with care | Low leverage or risky |
|---|---|---|
| Exploring an unfamiliar codebase | Core domain logic (money, state machines) | Decisions needing context it doesn't have |
| Boilerplate, DTOs, mappers, config | Concurrency and transactions | Security-sensitive code with no expert review |
| Test scaffolding and builders | Performance-critical hot paths | Big changes with no tests as a safety net |
| Refactors with good test coverage | Migrations on hot tables | Anything you can't verify |
| Scripts, one-off tools, analysis SQL | Infrastructure changes | Pasting production data or secrets into prompts |
| First drafts of docs and PR descriptions | | |
| Explaining a stack trace | | |

## AI for debugging and on-call

**Useful for:** explaining sanitised stack traces and logs, tracing a code path ("how can `status` be null here?"), writing log and metrics queries faster, drafting the incident timeline and RCA, and writing a reproduction test once you have a hypothesis.

> [!WARNING] Three rules
> **Mitigate first**: roll back or flip the flag, don't spend the incident chatting with a model. **Never paste secrets, tokens or customer data** into tools not approved for it. **Verify every hypothesis with real data**: models invent plausible root causes with total confidence.

## Is AI actually making you faster?

Not lines of code, and not "percent of code AI-written"; those reward the wrong thing. Look at:

- **Lead time** from ticket to production, and **deployment frequency**.
- **Change-failure rate** and incidents. Faster but buggier isn't a win.
- **Review time and PR size.** Is review becoming the bottleneck?
- **Time on toil** vs design and high-value work.
- Developer-experience surveys.

> It's a win if we ship more with the same or a lower change-failure rate. If incidents rise, we tighten review and testing; we don't throw the tools away.

## Cheat sheet

- Understand → spec → plan → slices → tests as contract → verify → self-review.
- Context, requirements, constraints, definition of done, plan first.
- Review for requirement, edges, errors, races, security, reality, conventions, tests, scope.
- Automate standards; keep PRs small; the author owns every line.
- Measure lead time and change-failure rate.
