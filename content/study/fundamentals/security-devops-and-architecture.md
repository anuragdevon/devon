---
title: "Security, DevOps & architecture"
subtitle: "Shipping safely is part of shipping."
description: "The web vulnerabilities every backend engineer must stop, containers vs VMs, Kubernetes essentials, safe deployment strategies, monolith vs microservices, observability, and what 'five nines' really costs."
date: 2026-11-11
track: fundamentals
weight: 7
---

This is the "everything after `git push`" note. None of it is glamorous, and all of it decides whether your code survives contact with production: whether it leaks data, whether it can be rolled back in a minute, whether you can tell what it's doing at 3 AM.

> [!TIP] The short version
> - Parameterise queries, **check object ownership on every access**, never trust input.
> - Containers share the kernel; VMs don't.
> - Kubernetes is a **reconciliation loop** over desired state.
> - Separate **deploy** from **release** with flags; migrate with **expand → contract**.
> - Start with a **modular monolith**; split for a reason.
> - Metrics say *what*, traces say *where*, logs say *why*.
> - Every extra nine costs roughly **ten times more**.

## The vulnerabilities you must prevent

| Vulnerability | What it is | Prevention |
|---|---|---|
| SQL injection | Input concatenated into SQL | **Parameterised queries**, ORMs, least-privilege DB users |
| Broken object-level auth (IDOR) | `GET /orders/123` returns someone else's order | **Ownership check on every access**, opaque IDs, authz tests |
| XSS | Injected script runs in a victim's browser | Output escaping, framework auto-escaping, **Content-Security-Policy**, `httpOnly` cookies |
| CSRF | Another site triggers authenticated requests | `SameSite` cookies, CSRF tokens, Origin checks |
| SSRF | Server tricked into fetching internal URLs (e.g. cloud metadata) | Allow-list destinations, block internal ranges, egress proxy |
| Mass assignment | Client sets `isAdmin=true` | Explicit request DTOs with allow-listed fields |
| Secrets exposure | Keys in code, logs or repos | A secrets manager, log redaction, **secret scanning in CI** |
| Vulnerable dependencies | Known CVEs (think Log4Shell) | Dependency scanning, fast patching, an SBOM |

**Basics that come up:** hash passwords with **bcrypt, scrypt or Argon2** (never bare SHA-256); TLS everywhere and encryption at rest; minimise and mask personal data; rate-limit login and OTP endpoints.

> [!TIP] The review habit
> In every code review, ask one question: does this endpoint check that the resource belongs to the caller?

## Containers vs virtual machines

**30-second answer:** VMs virtualise hardware, each running a full guest OS: strong isolation, but heavy. Containers virtualise the OS: they share the host kernel and isolate processes with **namespaces** (what a process can *see*) and **cgroups** (what it can *use*). They're light and start in seconds, with weaker isolation.

Docker essentials:

- An **image** is stacked, cached, read-only layers. Order Dockerfile steps from least to most frequently changing.
- **Multi-stage builds** for small runtime images; minimal or distroless bases; run as **non-root**; pin versions; `.dockerignore`.
- One process per container, config from environment or mounted secrets, logs to stdout.
- **JVMs in containers:** size the heap from the container limit (`-XX:MaxRAMPercentage`) and leave headroom for off-heap memory.

## Kubernetes in one table

**30-second answer:** you declare the desired state; controllers continuously reconcile reality toward it, handling scheduling, scaling, self-healing, rolling updates and service discovery.

| Concept | Purpose |
|---|---|
| Pod | Smallest unit: containers sharing network and storage |
| Deployment | N stateless replicas, rolling updates, rollbacks |
| StatefulSet | Stable identity and storage (databases, brokers) |
| DaemonSet | One pod per node (log and metrics agents) |
| Service | A stable name and virtual IP in front of pods |
| Ingress / Gateway | HTTP routing from outside |
| ConfigMap / Secret | Configuration and sensitive values |
| HPA | Autoscale on CPU, memory or custom metrics |
| Probes | Liveness (restart), readiness (take out of rotation), startup |
| Requests / limits | Scheduling vs caps. Over the CPU limit → throttled; over memory → OOM-killed |
| PodDisruptionBudget | Keep enough replicas up during maintenance |

> [!WARNING] Classic mistakes
> A liveness probe that checks the database, so one DB blip restarts every pod. No readiness probe, so cold pods get traffic. Tight CPU limits causing throttling that looks like random latency. No graceful shutdown: handle SIGTERM and drain in-flight requests.

## Deploying safely

- **Rolling update:** replace instances gradually. Old and new run side by side.
- **Blue-green:** a full parallel environment; switch all traffic at once, switch back instantly.
- **Canary:** send a small slice of traffic to the new version, compare metrics, ramp up. Ideally automated.
- **Feature flags:** separate *deploy* from *release*; turn things on per user, region or percentage, and off in a second.
- **Shadow traffic:** mirror real requests to the new version and discard its answers.

**The safe-deploy checklist:** small, frequent changes; tests in CI; **backward-compatible migrations**; canaries with automatic checks; one-click rollback; deploy at low traffic; freeze before big events; and the person who deploys watches the dashboards.

> [!NOTE] Expand → contract: renaming a column safely
> 1. Add the new column. 2. Write to both. 3. Backfill. 4. Read from the new one. 5. Stop writing the old one. 6. Drop it. Every step is its own deploy, and every step can be rolled back.

## Monolith vs microservices

**30-second answer:** microservices buy **independent deploys and scaling, team autonomy and fault isolation**, and charge you **distributed-systems complexity**: network failures, eventual consistency, harder debugging and more operations. A well-structured **modular monolith** is usually the better start. Split when there's a clear driver: team growth, very different scaling or reliability needs, or a different release cadence.

- **Good boundaries** follow business capabilities (orders, payments, catalogue, delivery). Each service **owns its data**; no shared databases.
- **The distributed monolith** (services that deploy together, chatty synchronous chains, a shared database) is the worst of both worlds.
- **Prerequisites:** per-service CI/CD, tracing, service discovery, a gateway, contract tests, clear ownership.
- **Migrating:** the **strangler fig**: a facade in front, carve out one capability at a time.
- **Talking:** synchronous calls for queries that need an answer now; events for workflows.

> My rule of thumb: split by business capability and team ownership, not by noun. If one user action fans out to fifteen synchronous calls, the services are too fine.

## Observability: logs, metrics, traces

**30-second answer:** observability is being able to answer *questions you didn't anticipate* from a system's outputs. **Metrics** (cheap numeric time series) tell you *what* and *when*. **Logs** (structured events) tell you *why*. **Traces** follow one request across services and tell you *where*.

- **Logs:** structured JSON with a trace ID; deliberate levels; never personal data or secrets.
- **Metrics:** RED/USE, and **histograms** for latency (you can't average percentiles). Keep label cardinality low: no user IDs as labels.
- **Traces:** OpenTelemetry, with context propagated through HTTP headers *and* message headers; keep the slow and failed traces.
- **Connect them:** a metric spike → example traces → logs for that trace ID.
- **SLOs and error budgets** on top drive alerting and release decisions.

## High availability and the nines

| Availability | Downtime per year | Per month |
|---|---|---|
| 99% | 3.65 days | 7.3 hours |
| 99.9% | 8.8 hours | 43.8 minutes |
| 99.95% | 4.4 hours | 21.9 minutes |
| 99.99% | 52.6 minutes | 4.4 minutes |
| 99.999% | 5.3 minutes | 26 seconds |

- **Series multiplies:** five services at 99.9% each give about 99.5%. Fewer synchronous dependencies on the critical path is better.
- **Parallel adds nines:** two *independent* 99% replicas give about 99.99%. Correlated failures (same zone, same bad deploy) defeat redundancy.
- **Stateless app tier** behind a load balancer; **replicated data** with automatic failover; **multi-AZ** by default.
- **Multi-region:** active-passive is simpler; active-active is hard. Know your **RPO** (data you can lose) and **RTO** (time to recover).
- **Most outages come from change**, so canaries, flags and fast rollback matter as much as architecture.
- **A backup isn't real until you've restored it.**

> Each extra nine costs far more, so the target follows the business. Checkout and payments deserve 99.99%; an internal reporting tool is fine at 99.5%. Set SLOs per user journey and spend effort where the error budget is actually burning.

## Cheat sheet

- Parameterise, check ownership, escape output, scan for secrets and CVEs.
- Containers = namespaces + cgroups on a shared kernel.
- Readiness ≠ liveness; handle SIGTERM.
- Canary + flags + expand/contract migrations.
- Modular monolith first; split by capability and ownership.
- Metrics what, traces where, logs why. 99.99% ≈ 4.4 minutes a month.
