---
title: "Collaboration & communication"
subtitle: "Disagree with data. Commit with grace."
description: "Disagreements with peers and PMs, difficult people, ambiguity, bad news, influence across teams and explaining tech to non-engineers: the people questions, with the patterns behind good answers."
date: 2026-11-11
track: behavioural
weight: 5
---

Every one of these questions is secretly the same question: *will this person make the team around them better or worse?* Interviewers aren't looking for a story where you were right. They're looking for a story where the *outcome* was right, and everyone still wanted to work with you afterwards.

> [!TIP] The short version
> - **Disagreements:** understand their view, bring data or a prototype, decide, then commit.
> - **With PMs:** never a bare "no". Offer options with costs.
> - **Ambiguity:** don't wait for clarity. Write down assumptions and get them confirmed.
> - **Bad news:** early, with options attached.
> - **No authority?** Make it easy for the other team to say yes.

## "Tell me about a disagreement with a teammate"

**What they're checking:** can you disagree constructively, with data and respect, and commit once it's decided?

Show that you **understood their view**, brought **evidence** rather than opinion, **reached a decision**, and **committed** even if it went the other way.

> A senior engineer proposed a new microservice for notification preferences. I thought it was operational overhead for a small domain. Rather than argue in PR comments, I wrote a one-page comparison (latency, deploy complexity, ownership, expected change rate) and we discussed it in a design review. They raised something I'd missed: another team would own preferences next quarter. That made a separate service reasonable, so we agreed on one, with a shared client library to cut the overhead. I learnt to ask about org context early, not just the technical side.

> [!WARNING] Traps
> A story where you "won" and they were simply wrong; one where you gave in without reasoning; or anything negative about the other person.

## Disagreeing with a PM on scope or deadlines

- Understand the **why**: the business goal, customer commitment, market timing.
- Make **trade-offs visible**: "We can do A by the date, or A + B two weeks later. Here are the risks of each."
- Propose **phasing**: an MVP first, the rest iteratively.
- Translate **engineering risk** (quality, on-call load, debt) into business terms.
- Once decided, **disagree and commit**, and write it down.

> The PM wanted a new cancellation-reason flow before a holiday weekend, but doing it properly meant a schema migration on a hot table right before peak. I proposed shipping the UI and capturing the reasons as events, with no migration, so analytics still got the data, and running the migration after the freeze. The PM got the outcome on time and we avoided a risky change at peak.

## Working with a difficult person

Assume good intent. Talk about **behaviour and impact**, not personality. Show a direct but empathetic conversation and what changed.

> An engineer on a partner team kept missing agreed API dates, which blocked us. Before escalating, I set up a 1:1 to understand why: their team was being pulled into incidents and our work wasn't on their board. We agreed I'd write the API contract and a mock server so we could unblock ourselves, and they'd only implement against the contract. I also asked their manager to make the dependency visible in sprint planning. Delivery became predictable.

## Handling ambiguous or changing requirements

**What they're checking:** a core SDE2 trait. Do you wait for clarity or create it?

- **Ask:** who's the user, what does success look like, what's out of scope?
- **Write down your assumptions** and get them confirmed. A single page is enough.
- **Build reversibly:** flags, a thin slice first, extension points where change is likely.
- **Separate stable from volatile:** if business rules change often, make them config.
- When requirements change, **re-estimate and say what it costs**.

> When the ask was "improve delivery ETA accuracy", I first agreed with the PM what *accurate* meant: the share of orders arriving within five minutes of the promised time. Then we measured the baseline and split the problem into preparation time and travel time. Turning a vague goal into a measurable one is half the work.

## Communicating status, especially bad news

- **Early and proactive.** Bad news doesn't improve with age.
- **Bring options, not just the problem:** "We'll slip a week. We can cut feature X, add someone to the integration, or move the date."
- **Tailor it:** leaders want impact and the decision needed; engineers want the details.
- **Regular written updates:** green/amber/red, progress, risks, asks.

## Influencing teams you have no authority over

- **Write first:** clear docs, async decisions, recorded meetings (especially across time zones).
- **Find the shared goal:** frame your ask in terms of *their* priorities and metrics.
- **Make yes easy:** write the contract, offer to make the PR in their codebase, supply the test cases.
- **Build relationships before you need them.**
- **Escalate transparently**, as a shared prioritisation problem, never as blame.

## Explaining tech to a non-technical stakeholder

- Start with **business impact**, not mechanism.
- Use **analogies**: a cache is keeping frequently used things on your desk instead of in the store room.
- Drop jargon, or define it in one line.
- Frame decisions as **options with costs and benefits**, and check understanding.

> I needed support for a database migration, so I skipped replication lag entirely: "At dinner peak, about one in 200 customers sees an error at checkout because the database is overloaded. This migration gives us three times the headroom. It takes two engineers four weeks, and we can switch back instantly if anything goes wrong." It was approved in that meeting.

## Cheat sheet

- **Disagree:** understand → evidence → decide → commit.
- **PMs:** options with costs; phase it; document the decision.
- **Difficult people:** good intent, behaviour not personality, a concrete fix.
- **Ambiguity:** define success, write assumptions, build reversibly.
- **Bad news:** early, with options, in writing.
- **No authority:** shared goals, make yes easy, escalate as a shared problem.
