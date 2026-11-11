---
title: "Building AI features"
subtitle: "An LLM is one unreliable component in a well-engineered system."
description: "LLM fundamentals for backend engineers: tokens and context, RAG vs fine-tuning, tool calling and agents, evals for non-deterministic output, the main risks, cost control, and a worked design example."
date: 2026-11-11
track: ai-era
weight: 3
---

You don't need to be an ML engineer to ship an LLM feature. You need to treat the model the way you'd treat any external dependency, with one extra rule: its output is **probabilistic**. Everything in this note follows from that.

> [!TIP] The short version
> - Cost and latency scale with **tokens**; the model **remembers nothing** between calls.
> - **RAG** for your changing facts; **tools** for live data and actions; **fine-tuning** for style or narrow tasks.
> - Agents are loops: **bound them**, and authorise tools **as the user**.
> - Test with **evals**: a prompt change is a code change.
> - Keep hard rules (prices, refunds, permissions) **in code, not in the prompt**.

## What a backend engineer needs to know about LLMs

- **Everything is tokens.** Cost and latency scale with input plus output tokens. A token is roughly three-quarters of an English word.
- **Context window:** the maximum tokens per request (instructions, history, documents and output together). There's no memory beyond what you send.
- **Non-deterministic:** the same input can produce different outputs. Temperature controls randomness, and even at zero, don't assume exact repeats.
- **Knowledge cutoff and hallucination:** the model doesn't know your data or recent events, and it confidently makes things up. **Ground it** with real data.
- **Structured output:** APIs can force JSON that matches a schema. **Validate it anyway.**
- **Latency is seconds**, not milliseconds. Stream user-facing text and do work asynchronously where you can.
- **Model tiers:** bigger is smarter, slower and pricier. Route easy tasks to small, fast models.

## RAG, fine-tuning, or just a prompt?

**RAG (retrieval-augmented generation):** at query time, fetch relevant documents from *your* data and put them in the prompt, so the model answers from your facts.

```text
User question
  → embed the query → vector search (+ keyword/BM25) over chunked docs
  → re-rank the top results → put the best chunks in the prompt:
    "Answer only from the context. Cite sources. Otherwise say you don't know."
  → answer → validate and attach citations → user
```

Design choices that matter: chunk size and overlap, the embedding model, **hybrid search** (vectors + keywords), re-ranking, metadata filters, keeping the index fresh when sources change, and **access control at retrieval**: never fetch a document the user isn't allowed to see.

| Use | When |
|---|---|
| A prompt alone | Instructions and a few examples are enough |
| **RAG** | Answers depend on your **changing, factual** data: policies, catalogue, tickets, docs. Easy to update, gives citations |
| **Fine-tuning** | You need a consistent **style or format**, or a narrow task done cheaply at volume. Not for injecting facts that change |
| **Tools** | You need **live data or actions**: order status, a refund API |

## Tool calling and agents

**Tool calling:** you describe functions (name, description, JSON schema); the model asks to call one with arguments; your code runs it and returns the result. An **agent** is that in a loop (model → tools → results → model…) until the task is done.

Where engineering judgement shows:

- **Tools are your API surface.** Validate arguments, **authorise as the end user** (never with an all-powerful service account), make them idempotent, and rate-limit them.
- **Human in the loop** for consequential actions: refunds above a limit, account changes.
- **Bound the loop:** maximum steps, timeouts, a cost budget per task.
- **Observability:** log every step (prompt, tool calls, results, tokens, latency) under one trace ID.
- **Prefer a deterministic workflow when it works.** If the steps are known, code them, and use the model only for the fuzzy parts: classifying, extracting, summarising.

## Testing something non-deterministic: evals

Evals are the test suite for probabilistic systems.

- **A golden dataset:** realistic inputs, including messy and adversarial ones, with expected outcomes or grading criteria. Start with 50–200 cases drawn from real traffic.
- **Graders:**
  - *Deterministic checks:* valid JSON, schema conformance, required fields, "did it call the right tool?"
  - *Reference comparison:* exact match for classification and extraction.
  - *LLM-as-judge:* a model grades against a rubric. Calibrate it against human labels.
  - *Humans* reviewing samples.
- **Run evals in CI** whenever the prompt, model or retrieval changes. A drop in pass rate is a regression.
- **In production:** sample outputs for review, collect feedback (thumbs, edits, escalations), watch guardrail triggers, and A/B test against business metrics.

> [!TIP] The line to remember
> A prompt change is a code change. It goes through evals and review like any other deploy.

## The main risks, and what stops them

| Risk | Mitigation |
|---|---|
| **Hallucination** | Ground with RAG or tools, require citations, allow "I don't know", and never let the model state a fact you can fetch (like a price) |
| **Prompt injection** (instructions hidden in user input or retrieved text) | Treat every input as untrusted, separate instructions from data, least-privilege tools authorised server-side as the user, confirmation for sensitive actions |
| **Data leakage** | Minimise and redact what you send, use vendors with suitable retention terms, enforce access control at retrieval, don't log raw prompts with personal data |
| **Unsafe or off-brand output** | System instructions, moderation, output validation, a constrained format |
| **Cost blow-ups** | Token budgets, caching, smaller models for easy tasks, per-user rate limits |
| **Latency** | Streaming, async work, smaller models, prompt caching, parallel calls |
| **Vendor outage or model change** | Timeouts, fallbacks (another model or a non-AI path), pinned model versions, re-run evals before upgrading |

## Controlling cost and latency at scale

- **Right-size the model:** a small one classifies; only hard cases go to a big one.
- **Trim tokens:** tight prompts, fewer and better chunks, summarised history, capped output.
- **Cache:** exact-match response caching, and **prompt caching** for long, stable prefixes like system prompts and reference documents.
- **Batch APIs** for offline work (bulk tagging, generating descriptions): usually much cheaper.
- **Skip the LLM** when a rule, a regex, SQL or a classic model will do. They're faster, cheaper and deterministic.
- **Measure** cost per request, per feature and per user, and alert on anomalies.

> [!NOTE] Do the maths before building
> `requests per day × (input + output tokens) × price per token`. Put it in the design doc. A feature that costs more per order than the order earns has no business case.

## Worked example: an AI support assistant

The brief: handle "where is my order?" and "an item is missing" complaints automatically.

1. **Problem and metrics:** cut agent load and resolution time without raising wrong refunds. Track automated resolution rate, CSAT, refund leakage and escalation rate.
2. **Scope:** start with two or three high-volume intents; everything else goes to a human.
3. **Architecture:**
   - A small model classifies the intent.
   - Tools: `getOrder(orderId)` scoped to the signed-in user, `getTracking`, `getRefundPolicy`, and `proposeRefund` behind policy limits or approval.
   - **The policy engine is code, not prompt:** the model gathers facts and proposes; deterministic rules decide eligibility and amount.
   - The reply is generated from grounded facts; when unsure, it escalates to a human with a summary.
4. **Safety:** the model never invents order facts; refunds are capped; user messages are treated as potential injection; personal data is redacted.
5. **Evals:** a golden set from historical tickets with their correct resolutions, then a **shadow mode** where the AI proposes and a human decides.
6. **Rollout:** behind a flag, by region or percentage, with business-metric guardrails.
7. **Cost and latency:** streaming, a small model for most turns, tool results cached per session.

What interviewers want to hear is exactly that framing: one unreliable component, wrapped in hard rules, verification, evals and fallbacks.

## Building blocks you should be able to explain

| Concept | In one line |
|---|---|
| Embeddings | Vectors for meaning; similar text sits close together |
| Vector index | Approximate nearest-neighbour search (HNSW, IVF) |
| Hybrid search | Vectors + keywords; better for names, codes and IDs |
| Re-ranking | A second model reorders the top results |
| Structured output | Forced JSON matching a schema, still validated |
| Prompt caching | The provider reuses work for a repeated prefix |
| Guardrails | Input and output checks: moderation, PII, schema, policy |
| Evals | Test suites with graders for model behaviour |
| MCP | An open standard for exposing tools and data to AI agents |
| Fine-tuning / distillation | Adapting a model, or training a small one to imitate a big one |

## Cheat sheet

- Tokens drive cost and latency; no memory between calls; validate structured output.
- RAG for facts, tools for live data and actions, fine-tuning for style.
- Agents: bounded loops, tools authorised as the user, humans for big actions.
- Evals in CI; prompt changes are deploys.
- Hard rules in code; skip the LLM when a rule will do.
