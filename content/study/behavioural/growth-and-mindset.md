---
title: "Growth & mindset"
subtitle: "Coachable beats flawless."
description: "Critical feedback, your biggest mistake, learning on your own, pressure, motivation and the questions you ask at the end, plus a checklist before any behavioural round."
date: 2026-11-11
track: behavioural
weight: 7
---

The last questions of a loop are about trajectory. Nobody expects a flawless engineer; they expect one who gets better every quarter. The strongest answers here are honest about a real weakness and specific about what changed because of it.

> [!TIP] The short version
> - **Feedback:** ask for examples, act on it, show the change.
> - **Mistakes:** own it fully, fix it, then fix the *system* that allowed it.
> - **Learning:** what, how, and where you applied it.
> - **Pressure:** cut scope, not correctness.
> - **Your questions:** always ask two or three good ones.

## "Tell me about critical feedback you received"

**What they're checking:** coachability. Do you get defensive or do you act?

> My manager told me my design docs were technically solid but stakeholders found them hard to follow: too low-level, with the decision buried. My first instinct was to defend them, but I asked for specific examples, and the point was fair. I started opening every doc with a one-paragraph summary (the problem, the recommendation, the decision needed) and moved the detail to appendices. I also asked a PM to review my next doc purely for clarity. The next design review finished in one meeting instead of two.

> [!WARNING] Traps
> Feedback that's secretly praise, or no concrete change in behaviour afterwards.

## "What's your biggest mistake?"

**What they're checking:** ownership, honesty and learning. Everyone fails; the red flag is not owning it.

Pick a **real** mistake with **real** but not catastrophic impact. Own it with no "but", explain the fix, and then the **systemic** change.

> I shipped a change to an order-status consumer that didn't handle a new optional field being null. A small batch of messages failed into the dead-letter queue, and some customers missed status notifications for about 40 minutes. That was my miss: I'd tested the happy path but not old-format messages. I fixed it, replayed the queue and confirmed every notification went out. Then I added contract tests using recorded real message samples for all our consumers, and proposed a schema registry with compatibility checks, which the team adopted.

## "What did you learn recently, and how?"

**What they're checking:** curiosity and a habit of teaching yourself.

Pick something technical and relevant. Explain **how** you learnt it and **where you applied it**.

> I went deep on how Postgres MVCC and vacuum work, prompted by table bloat on a high-update table. I read the docs and the relevant chapters of *Designing Data-Intensive Applications*, then reproduced the bloat locally with pgbench. At work we tuned autovacuum for that table and switched an update-heavy pattern to append-plus-compaction. The table shrank by about 60% and latency stabilised.

## Handling pressure and tight deadlines

- **Structure the problem:** what's the minimum that must ship, and what can wait?
- **Communicate early** if the date is at risk.
- **Protect quality on critical paths:** cut scope, not correctness.
- **Keep the pace sustainable:** an occasional crunch is normal; a permanent one is a planning problem worth raising.

> A regulatory change to payment flows gave us ten days for four weeks of work. I split it into compliance must-haves and nice-to-haves, agreed the cut with the PM, parallelised across three engineers using pre-agreed API contracts, and ran 15-minute daily syncs. The compliant flow shipped on day nine behind a flag, with full test coverage on the payment state machine. The rest followed two sprints later.

## "What motivates you?"

**What they're checking:** culture and role fit.

> I'm most energised when engineering visibly moves a user or business metric, especially reliability and performance at scale. Seeing a latency improvement show up as a conversion bump is very satisfying. I also love the moment a junior engineer I've worked with solves something hard on their own. What drains me is unclear ownership, where nobody knows who decides, which is why I tend to step in and make ownership explicit.

## "Do you have any questions for us?"

**What they're checking:** curiosity, priorities, and how seriously you're evaluating them. **Always ask two or three.** "No questions" reads as low interest.

| Who you're talking to | Good questions |
|---|---|
| An engineer | What does a typical week look like for an SDE2: building vs reviews vs operations? What's the most interesting technical problem from the last six months? How are design decisions made? What does on-call look like? |
| The hiring manager | What would a great first six months look like? What's the team's biggest challenge right now? How do engineers grow from SDE2 to senior here, and who did it recently? How do you give feedback? |
| A senior leader | What engineering bets is the org making for the next year or two? What distinguishes the best engineers here? |

> [!WARNING] Avoid
> Anything answered on their website, compensation questions in a technical round, and anything that sounds like you're already planning your exit.

## Checklist before any behavioural round

- Six to eight **STAR stories** written down, each with numbers. Most of the 50 common questions can be answered from them.
- "Tell me about yourself" practised **out loud**, under two minutes.
- A clean, positive **"why I'm moving"** line.
- **Research** on the company and team: product, recent launches, engineering blog.
- **One project** you can whiteboard in depth: architecture, scale, trade-offs.
- **Three questions** ready for the interviewer.
- **"I" for your actions, "we" for team results**, and honesty about what you didn't do.

> [!NOTE] STAR(+L), the format behind every story
> **Situation** (~10%): context, team, scale. **Task** (~10%): your responsibility. **Action** (~50%): what *you* did and why. **Result** (~20%): a number. **Learning** (~10%): what you'd do differently.
