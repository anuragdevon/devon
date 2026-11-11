---
title: "Interviews & positioning"
subtitle: "Show the speed, and show the judgement."
description: "How to answer 'how do you use AI?', how to reframe a design-and-hand-written-code background as a strength, what to ask the interviewer about AI, and a practical 90-day plan to close the gap."
date: 2026-11-11
track: ai-era
weight: 4
---

"How do you use AI?" is now a standard interview question, and both extreme answers fail. "I don't really use it" says you've fallen behind. "It writes everything" says nobody's checking. The answer interviewers want sits in between: heavy use, inside a disciplined process, with you accountable for the result.

> [!TIP] The short version
> - Describe a **structured workflow**, then give **one speed-up and one bug you caught**.
> - A background in **design and hand-written code** is the hard part of the new job. Say so.
> - Ask the interviewer how **their** team uses AI; the answer tells you a lot.
> - Close any gap with a **90-day plan**: tool fluency → one LLM project → lead and multiply.

## "How do you use AI in your workflow?"

**What they're checking:** are you productive with modern tools, *and* do you keep your judgement and quality bar?

> I use it a lot, but in a structured way. For a new feature I write a short spec myself first: the business rules, edge cases and interfaces. Then the agent proposes a plan, I correct it, and we build in small slices with tests. I write the tests for the critical business rules myself, because that's where a tool is most likely to encode a wrong assumption. Before a PR I review the whole diff with a checklist: edge cases, error handling, authorization, idempotency, and whether it follows our patterns. Boilerplate and tests go much faster, and I spend the saved time on design and review. I'm accountable for every line I merge, whoever typed it.

Then make it concrete with **two short examples**: a feature that went noticeably faster with AI, *and* a bug you caught in generated code.

> [!NOTE] A good "caught it" story is specific
> "It applied the coupon discount to the post-tax total; our rule is pre-tax." One sentence like that proves you actually read what it wrote.

## Turning a design-and-craft background into a strength

If your experience is mostly low-level design, hand-written code, and turning business ideas into code, that's not a liability. Reframe each part:

| What you did | How to say it now |
|---|---|
| "Mostly low-level design" | "I'm strong at **domain modelling and designing interfaces**, the part that decides whether generated code fits or becomes a mess." |
| "Mostly hand-written code" | "I understand the code I ship deeply, so I can **verify** generated code critically. I know what correct looks like and where bugs hide." |
| "Business ideas → code" | "I turn **ambiguous requirements into precise specs**, and the spec now drives humans and tools alike." |
| "High-quality code" | "I bring a **quality bar and review discipline**, which matters more as code volume goes up." |

Then show you've adapted: the tools you use daily, and something small you've built with an LLM. **Only say it if it's true**, so do the work first (see the plan below).

> [!WARNING] Don't say
> "I haven't really used AI tools." If that's true today, fix it before your interviews. A few weeks of deliberate practice is enough.

## What to ask the interviewer about AI

- "How does the team use AI coding tools today? Are there standards for reviewing and testing generated code?"
- "Has AI changed what you expect from an SDE2, on scope or throughput?"
- "Are there LLM-powered features on this team's roadmap?"
- "What are the policies on which code or data can go into AI tools?"

The answers tell you about the culture, how mature the team is with these tools, and how you'll be measured.

## A 90-day plan to close the gap

**Days 1–30: tool fluency, on real work**

- Pick one agentic coding tool and one editor assistant your company allows, and use them on **every** task for a month.
- Set up a project instructions file for your main repo: conventions, build and test commands, architecture notes.
- Practise the spec → plan → slices → verify workflow.
- Keep a log of where AI saved time and where it was wrong. It becomes your interview story bank.

**Days 31–60: one small LLM project, end to end**

- Build something small and real, for example a Q&A over your team's runbooks with citations, or a product tagger that extracts structured attributes with schema-validated JSON.
- Add an **eval set** of 50+ cases and run it whenever the prompt changes.
- Track cost and latency per request.
- Write a short README on the design trade-offs. That turns it into a portfolio piece.

**Days 61–90: lead and multiply**

- Propose one AI improvement for your team: a review checklist for generated code, a shared prompt library, an internal tool, or automating some toil.
- Mentor someone on the workflow.
- Add three or four AI-era stories to your interview story bank.

> [!TIP] Keep practising without AI too
> Many rounds are still unassisted DSA and design. Some companies now run AI-assisted coding rounds, and those test exactly this track: specs, decomposition, verification and judgement.

## Cheat sheet

- "How do you use AI?" → workflow + one speed-up + one caught bug.
- Design, craft and spec-writing are the hard parts of the new job.
- Ask how *their* team uses AI and measures engineers.
- 30 days of tools → 30 days building one LLM project with evals → 30 days leading.
- Never claim experience you haven't built yet.
