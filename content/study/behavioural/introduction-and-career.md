---
title: "Introduction & career"
subtitle: "The first ten minutes decide the next fifty."
description: "Tell me about yourself, why you're moving, why this company, and what changes at SDE2: the opening questions, what they're really testing, and answers you can adapt."
date: 2026-11-11
track: behavioural
weight: 1
---

Every interview loop opens the same way, and it's tempting to treat these questions as small talk. They aren't. In the first ten minutes the interviewer decides what kind of engineer you are, and then spends the rest of the hour looking for evidence that they were right.

> [!TIP] The short version
> - **Tell me about yourself** is a trailer, not an autobiography: present → past → future, under two minutes.
> - **Why are you moving?** Run *toward* something, never away from someone.
> - **Why us?** Prove you did the homework: product, engineering, and how your experience maps onto their problems.
> - **SDE1 vs SDE2:** the shift is from *execution* to *ownership*. Show you already work that way.

The example answers below are illustrative. Swap in your own story and your own numbers; an answer only works if every line of it is true.

## "Tell me about yourself"

**What they're checking:** can you give a crisp, relevant summary that sets up the rest of the conversation?

Use **Present → Past → Future** in 90 to 120 seconds:

1. **Present:** your role, years of experience, domain and stack.
2. **Past:** two or three highlights, each with an impact number.
3. **Future:** why this role is the obvious next step.

> I'm a backend engineer with five years of experience, most recently on the order-management team at an e-commerce company, where we handle a few million orders a day under tight latency targets. I work mostly in Java with Kafka, Redis and Postgres on AWS.
> Two things I'm proud of: I led the redesign of our checkout pricing path, which cut p99 latency from about 800 ms to 250 ms, and I owned a database migration we finished with zero downtime.
> I also ran on-call for a tier-1 service and mentored two new engineers. I'm looking for a role where I own bigger problems end to end, which is why this SDE2 role interests me.

> [!WARNING] Traps
> - Starting from college.
> - A list of technologies with no impact attached.
> - Going past two minutes, or sounding memorised. Know the bullet points, not a script.

## "Why are you looking for a change?"

**What they're checking:** are you running *away* from something (a risk) or *toward* something (motivated)? And will you leave them in a year?

- Keep it **positive and forward-looking**. Never criticise a previous employer, manager or team.
- Make it about **growth, scope or domain**, and connect it to *this* company.
- If there was a layoff or a reorg, say so plainly in one line and move on. It carries no stigma.

> I learnt a lot about running systems at scale, especially around peak-traffic events. After a few years I'd become very comfortable in my area, and I want broader ownership: driving design decisions across services rather than mostly inside one. Your work on real-time inventory lines up with exactly that.

> [!WARNING] Traps
> Leading with salary, complaining about on-call or management, or the vague "I just wanted a change".

## "What do you know about us, and why do you want to join?"

**What they're checking:** did you do your homework, or are you mass-applying?

Cover three layers:

| Layer | What to know |
|---|---|
| Product & business | What they sell, to whom, how they make money, recent launches |
| Engineering | Their tech blog, open-source work, stack and scale problems |
| Fit | How *your* experience maps onto *their* problems |

> I read your post on moving order processing to an event-driven design. The problems you describe, consistency across services and safe retries, are close to what I worked on with order state transitions. I'd bring that, and I'd like to learn from how you run ML in production, which I haven't done yet.

The giveaway of a weak answer is generic praise ("great culture, great brand") and not knowing what the team you're interviewing for actually builds.

## "What does an SDE2 do differently from an SDE1?"

**What they're checking:** do you understand the level you're being hired at, and are you already operating at it?

| Dimension | SDE1 | SDE2 |
|---|---|---|
| Scope | Tasks and small features | A feature, component or service, end to end |
| Ambiguity | Receives clear specs | Turns vague problems into specs and designs |
| Design | Implements the design | Writes the design doc and weighs trade-offs |
| Quality | Writes tests | Owns the test strategy, observability and rollout plan |
| Influence | Self | The team: reviews, mentoring, raising the bar |
| Operations | Fixes bugs when assigned | On-call, RCAs, preventing repeats |
| Communication | Status updates | Flags risks early, aligns stakeholders |

> The biggest shift is from execution to ownership. An SDE2 is handed something ambiguous, like "reduce failed payments", and is expected to break it down, propose a design, align the PM and other teams, deliver it with others, and own it in production. Over the last year I've already been doing that on…

Finish with one or two concrete examples of your own. The table proves you know the bar; the examples prove you clear it.

## "Where do you see yourself in three to five years?"

**What they're checking:** ambition with realism. Will you stay and grow here?

Talk about the **problems and responsibility** you want, not titles. Mention that both the senior IC track and the management track exist, say which way you lean, and stay open.

> In three to five years I want to be operating as a senior engineer: owning the technical direction of a meaningful area, leading multi-quarter projects, and being the person the team pulls in for design reviews and hard production problems. I lean toward the IC track, but I want to grow in mentoring and influencing without authority too.

> [!WARNING] Traps
> "Your job", "running my own startup", or "I don't know".

## "What are your strengths and weaknesses?"

**What they're checking:** self-awareness. Can you back a strength with evidence, and are you actively working on a weakness?

- **Strength:** pick one or two that matter at SDE2, and **prove each with a short story**.
- **Weakness:** pick something *real* but not disqualifying, then show the steps you're taking and the progress so far.

> **Strength:** I stay methodical in production incidents. During one peak-hour incident, order errors spiked; I correlated it with a deploy that had shrunk a connection pool, rolled back within ten minutes, and wrote the RCA that added pool-saturation alerts.
>
> **Weakness:** I used to take on too much myself because it felt faster, and on one project that made me the bottleneck. Now I break work into well-defined tickets early and pair with newer engineers on the first one. On my last project three of us shipped in parallel.

> [!WARNING] Traps
> Disguised strengths ("I'm a perfectionist", "I work too hard"), or a weakness that's core to the job ("I don't like writing tests").

## "What are you looking for in your next role?"

**What they're checking:** will you be happy here, and do your expectations match reality?

Cover four things:

- **Ownership:** meaningful problems you can drive.
- **Engineering culture:** design reviews, code quality, blameless postmortems.
- **Growth:** clear expectations for the next level, and real feedback.
- **Manager:** direct feedback, context instead of micromanagement, and someone who advocates for the team.

> I want a team where engineers own outcomes, not tickets, and we talk about *why* we're building something, not just what. I value written design docs and blameless postmortems, because that's where I've learnt the most. From a manager, I want regular, direct feedback and a clear picture of what the next level looks like.

## Cheat sheet

- **Intro:** present → past → future, two highlights with numbers, under two minutes.
- **Why move:** toward growth and scope; one positive line about the past.
- **Why us:** product + engineering + fit. Name something specific you read.
- **SDE2:** execution → ownership. Back it with your own example.
- **3–5 years:** problems and responsibility, not titles.
- **Strength / weakness:** each with a story; the weakness has a fix in progress.
