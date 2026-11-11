---
title: "Mindset & expectations"
subtitle: "Typing got cheap. Judgement didn't."
description: "What an SDE2 is paid for when AI writes much of the code, why design skill matters more not less, how the bar moved, which skills to double down on, and the biggest mistake engineers make with AI."
date: 2026-11-11
track: ai-era
weight: 1
---

AI made typing code cheap. It did **not** make knowing *what* to build, *how* to structure it, or *whether it's correct* cheap. Those three things are now most of the job. This note is about that shift and what it means for how you work and how you talk about your work.

> [!TIP] The short version
> - You've moved from **author** to **tech lead of a very fast, very confident junior** who never tires and is sometimes confidently wrong.
> - Design and clean-code skill matter **more**: AI amplifies whatever structure it finds.
> - The bar moved toward **scope, review volume, tests as specs, and product sense**.
> - The biggest mistake: **accepting plausible output without verifying it**.

## What does an SDE2 get paid for now?

**Outcomes and judgement, not keystrokes.** Concretely:

1. **Deciding what to build:** turning "reduce failed deliveries" into a specific, measurable, scoped change.
2. **Designing how it fits:** domain model, interfaces, data ownership, failure handling. AI is good at filling in a well-defined shape and poor at choosing the shape inside a large existing system.
3. **Verifying it's correct:** AI output is *plausible by construction*, so its bugs are subtle: a wrong edge case, a race, a swallowed error, an API that doesn't exist.
4. **Owning it in production:** on-call, incidents, metrics, cost.
5. **Multiplying the team:** reviews, standards, shared prompts and tooling, and mentoring juniors who now ship a lot of generated code.

| Got cheaper | Got more valuable |
|---|---|
| Boilerplate, CRUD, DTOs, mappers | Framing the problem: what and why |
| First-draft tests | Domain modelling: boundaries, invariants, state machines |
| Translating between languages | Specs: acceptance criteria, edge cases, failure modes |
| Explaining unfamiliar code | Review and verification |
| Routine fixes and refactors | System judgement: consistency, cost, operability |
| Looking up syntax | Taste: saying no to complexity |

## Is design and clean-code skill obsolete?

No. It's **more** relevant, for three reasons.

- **AI amplifies the existing structure.** In a codebase with clear interfaces and consistent patterns, generated code fits. In a tangled one, AI reproduces the tangle five times faster.
- **The spec is the design.** "Add a refund flow" produces generic code. This produces correct code:

```text
Implement RefundPolicy as a strategy.
Refunds are idempotent on (orderId, reason).
States: REQUESTED → APPROVED → PROCESSED | FAILED.
A partial refund can never exceed the captured amount.
```

Writing that second prompt *is* low-level design.

- **Reviewing at volume needs taste.** When most of a diff is generated, the reviewer's value is spotting "this crosses our boundary", "this should be a state machine, not three booleans", "this duplicates the pricing service".

What changes is the medium: less time *typing* the design, more time *expressing it precisely* (types, interfaces, tests, docs) so humans and tools both follow it.

## How has the bar moved?

| Dimension | A few years ago | Now |
|---|---|---|
| Throughput | A medium feature per sprint | Noticeably more, or a bigger scope |
| Scope | Own a feature | Own it *and* its edges: UI touch-ups, infra config, scripts. "Not my stack" holds less weight |
| Code review | Peers' code | Far more volume, including generated code |
| Testing | Write tests | Tests are the **specification and safety net** for generated code |
| Docs | Nice to have | Essential: they're also context for the tools |
| Product sense | PM defines, eng builds | Engineers shape the problem, because building got faster than deciding |
| AI literacy | n/a | Fluent with the tools; can build basic LLM features; knows their limits |

> [!NOTE] It varies a lot
> Some companies mandate AI tools and measure adoption; others are cautious for regulatory or IP reasons. Ask about it in interviews.

## Which skills are at risk, and which should you double down on?

**At risk of becoming commodities:** writing standard code from memory, knowing framework APIs by heart, and pure ticket-execution with no design or ownership.

**Durable, so double down:**

- Domain modelling and low-level design.
- System design and distributed-systems fundamentals: AI suggests designs, but someone must weigh them against *this* system's constraints.
- Debugging production from metrics, traces and logs. AI helps, but it can't see your production.
- Reading code critically and fast.
- Communication: specs, design docs, explaining trade-offs.
- Product and business sense.

**New, so add them:** a disciplined AI-assisted workflow, and the basics of building on LLMs (both covered in the next two notes).

## Will you lose your coding skills?

It's a real risk, so manage it on purpose:

- **Keep fundamentals sharp.** Many interviews still have unassisted DSA and design rounds, so practise some problems without AI.
- **Understand every line you merge.** If you couldn't have written it, at least make sure you can explain and debug it. "The AI wrote it" is never an answer during an incident.
- **Use AI as a sparring partner, not an oracle:** ask for alternatives and critiques, then decide yourself.
- **Write the hard parts yourself** when it helps you think (core domain logic, concurrency, money), and let the tools scaffold around them.

## The biggest mistake engineers make with AI

**Accepting plausible output without verification.** It shows up as:

- Code that passes the AI-written tests because the tests assert the same wrong assumption.
- Library methods and config flags that don't exist.
- Silent error handling, like `catch (Exception e) { log.warn(…) }`.
- Code that works but ignores the codebase's conventions, so three styles of the same thing appear.
- Security holes: missing authorization checks, SQL by string concatenation, secrets in logs.
- Giant diffs nobody can review.

The second-biggest mistake is the opposite: refusing the tools and falling behind.

> [!TIP] The stance to take
> "I use AI heavily, and I'm accountable for every line it writes."

## Cheat sheet

- Paid for: what to build, how it fits, whether it's right, running it, multiplying others.
- Design skill matters more: the spec *is* the design.
- The bar moved: scope, review volume, tests as specs, docs as context.
- Keep fundamentals sharp; understand every merged line.
- Never accept plausible output unverified.
