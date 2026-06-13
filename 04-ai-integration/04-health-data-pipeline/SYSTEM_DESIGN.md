# Health Data Pipeline — System Design Document

**Author:** Manpreet Kaur
**Date:** June 2026
**Status:** Living document — updated as the system evolves

---

## 1. What This System Does

A real-time health data pipeline that ingests wearable device data, validates and aggregates it, enriches it with AI-generated insights, and delivers actionable notifications to users. This is not a tutorial — it mirrors the production architecture of health tech platforms like Yeyro, where raw biometric data must be processed reliably, enriched intelligently, and delivered with appropriate urgency.

The pipeline handles the full journey of a single health metric:

```
Wearable device generates heart rate reading
  → transmitted to our server as a raw event
    → validated (is this a real reading? is the device trustworthy?)
      → aggregated with other readings into a time window
        → AI analyzes the window and generates an insight
          → notifications dispatched based on risk level
            → user sees "Your heart rate has been elevated today"
```

Every stage can fail independently. Every stage has different performance characteristics. Every stage has different scaling needs. The architecture is designed around these realities.

---

## 2. Architectural Pattern — Strict Layered Architecture

The system uses a **Strict Layered Architecture** with a unidirectional dependency rule: each layer only imports from layers below it, never upward or sideways.

### Why This Pattern

The alternative — a single file or a loosely organized codebase — works for prototypes. It fails the moment two concerns need to change independently. In this system, the validator changes when new device types are added (weekly), the AI prompt changes when insight quality is tuned (monthly), and the concurrency strategy changes when user count grows (quarterly). If these live in the same file or depend on each other, every change risks breaking unrelated functionality.

The layered approach means: changes to *what the pipeline does* (domain logic) never require changes to *how the pipeline runs* (orchestration), and vice versa.

### Layer Definitions

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 5 — ENTRY POINTS                                │
│  index.ts, demo.ts                                      │
│  "How the outside world starts the system"              │
│  Depends on: pipeline/                                  │
├─────────────────────────────────────────────────────────┤
│  LAYER 4 — PIPELINE (Orchestration)                     │
│  run-pipeline.ts, run-batch-pipeline.ts,                │
│  stream-processor.ts                                    │
│  "Wires stages together, controls concurrency + flow"   │
│  Depends on: stages/, lib/                              │
├─────────────────────────────────────────────────────────┤
│  LAYER 3 — STAGES (Domain Logic)                        │
│  validator.ts, aggregator.ts, ai-insight.ts,            │
│  notification.ts, dead-letter-queue.ts,                 │
│  group-by-user.ts                                       │
│  "Pure functions — input type in, output type out"      │
│  Depends on: types/, lib/                               │
├─────────────────────────────────────────────────────────┤
│  LAYER 2 — LIB (Infrastructure Utilities)               │
│  ai-client.ts, batch.ts, logger.ts, insight-cache.ts    │
│  "Reusable across any domain — not health-specific"     │
│  Depends on: types/ (minimally)                         │
├─────────────────────────────────────────────────────────┤
│  LAYER 1 — TYPES (Domain Model)                         │
│  raw-event.ts, validated-metric.ts, insight.ts          │
│  "Zero logic, zero imports, zero dependencies"          │
│  Depends on: nothing                                    │
└─────────────────────────────────────────────────────────┘
```

### The Dependency Rule Test

Before placing any function in a layer, apply this test:

- **Can I use this function in a completely different project?** → It belongs in `lib/` (e.g., `processBatch`, `logger`).
- **Does this function transform health data from one shape to another?** → It belongs in `stages/` (e.g., `validateAndNormalise`, `aggregateMetrics`).
- **Does this function decide *when*, *how many*, or *in what order* to call other functions?** → It belongs in `pipeline/` (e.g., `runBatchPipeline`, `StreamProcessor`).
- **Is this just a type definition with no behavior?** → It belongs in `types/`.

### The Swap Test

Clean separation is confirmed when you can swap any component without touching adjacent layers:

| Swap | Files changed | Files NOT changed |
|------|--------------|-------------------|
| Claude → OpenAI | `lib/ai-client.ts` only | All stages, all pipeline files |
| In-memory queue → Redis/BullMQ | `lib/queue.ts` + `pipeline/` | All stages, all types |
| Add blood oxygen metric | `types/` + `stages/validator.ts` | Pipeline orchestration, lib |
| Concurrency 3 → 10 | `pipeline/run-batch-pipeline.ts` only | All stages, all lib |
| Blocking AI → streaming AI | One import in `pipeline/run-pipeline.ts` | Other stages, lib, types |

If a change forces edits across multiple layers, the boundary is wrong.

---

## 3. Folder Structure

```
health-data-pipeline/
│
├── types/
│   ├── raw-event.ts              # RawMetricEvent — what devices send
│   ├── validated-metric.ts       # ValidatedMetric, MetricWindow, thresholds
│   └── insight.ts                # HealthInsight, Notification, PipelineResult, PipelineError
│
├── stages/
│   ├── validator.ts              # validateAndNormalise(), calculateQualityScore()
│   ├── aggregator.ts             # aggregateMetrics() — window summarisation
│   ├── group-by-user.ts          # groupEventsByUser() — Map<userId, events[]>
│   ├── ai-insight.ts             # generateAIInsight(), InsightSchema (Zod)
│   ├── ai-insight-streaming.ts   # generateAIInsightStreaming() — streaming variant
│   ├── notification.ts           # createNotifications() — push/email/sms routing
│   └── dead-letter-queue.ts      # DeadLetterQueue class — store, retry, expire
│
├── pipeline/
│   ├── run-pipeline.ts           # runPipeline() — single user, calls stages in order
│   ├── run-batch-pipeline.ts     # runBatchPipeline() — multi-user, concurrency control
│   └── stream-processor.ts       # DataStreamSimulator + StreamProcessor — real-time mode
│
├── lib/
│   ├── ai-client.ts              # Anthropic client singleton + model config
│   ├── batch.ts                  # processBatch<T,R>() — generic concurrency utility
│   ├── insight-cache.ts          # Hash-based caching for AI insights
│   └── logger.ts                 # Structured logging with stage context
│
├── index.ts                      # Barrel exports
├── demo.ts                       # Sample data + pipeline execution
├── SYSTEM_DESIGN.md              # This document
└── CLAUDE.md                     # Architecture rules for AI-assisted development
```

### Why `group-by-user.ts` Is a Stage, Not a Utility

It's tempting to put `groupEventsByUser` in `lib/` because it's a generic grouping operation. But it operates on `RawMetricEvent` (a domain type) and produces groups that only make sense in the health pipeline context. A truly generic `groupBy<T, K>` utility would belong in `lib/`. A function that knows about `user_id` on health events belongs in `stages/`.

### Why `processBatch` Is a Utility, Not Pipeline Logic

`processBatch<T, R>(items, processor, concurrency)` knows nothing about health data, users, or pipelines. It takes items, a processor function, and a concurrency limit. You could use it to batch image uploads, email sends, or database migrations. It's domain-agnostic infrastructure — `lib/`.

---

## 4. Full System Architecture

### End-to-End Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│   Wearable SDK          Mobile App           Web Dashboard       │
│   (Fitbit/Apple)        (React Native)       (Next.js 15)        │
└──────┬──────────────────────┬──────────────────────┬─────────────┘
       │                      │                      │
       ▼                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Express/Fastify)                 │
│   Auth (JWT) · Rate Limiting · Schema Validation · Routing       │
│                                                                   │
│   POST /events/batch    GET /insights/:userId    WS /live         │
└──────┬─────────────────────────────────────────────┬─────────────┘
       │                                             │
       ▼                                             │
┌──────────────────┐     ┌─────────────────────┐     │
│  Event Receiver  │────▶│   Message Queue      │     │
│  (validates      │     │   (in-memory now,    │     │
│   shape only)    │     │    BullMQ later)     │     │
└──────────────────┘     └──────────┬──────────┘     │
                                    │                 │
                                    ▼                 │
┌──────────────────────────────────────────────────┐  │
│              PIPELINE LAYER                       │  │
│                                                   │  │
│  ┌───────┐   ┌──────────┐   ┌──────────┐         │  │
│  │Validat├──▶│Aggregator├──▶│AI Insight │         │  │
│  │  or   │   │          │   │          │         │  │
│  └───┬───┘   └──────────┘   └────┬─────┘         │  │
│      │                           │                │  │
│      ▼                           ▼                │  │
│  ┌───────┐               ┌──────────┐             │  │
│  │  DLQ  │               │ Notifier │             │  │
│  └───────┘               └────┬─────┘             │  │
└───────────────────────────────┼───────────────────┘  │
                                │                      │
                ┌───────────────┼───────────────┐      │
                ▼               ▼               ▼      │
        ┌────────────┐  ┌────────────┐  ┌──────────┐   │
        │ Push (FCM)  │  │ Email (SES)│  │ SMS      │   │
        └────────────┘  └────────────┘  └──────────┘   │
                                                        │
┌──────────────────────────────────────────────────────┐│
│                     DATA LAYER                        ││
│  PostgreSQL           Redis              S3           ││
│  (metrics, users,     (cache, sessions,  (reports,   ││
│   history)             queue state)       exports)   ││
└──────────────────────────────────────────────────────┘│
                                                        │
┌──────────────────────────────────────────────────────┐│
│                 EXTERNAL AI SERVICES                  ││
│  Claude API (Anthropic)        Embeddings (future)   ││
│  insights, classification      similarity, anomaly   ││
│  — accessed via lib/ai-client.ts only                ││
└──────────────────────────────────────────────────────┘│
                                                        │
              WebSocket pushes live insights ◄──────────┘
```

### Integration Boundaries

Every arrow in the diagram above crosses a boundary where data format, trust level, or failure mode changes. These boundaries drive the architecture:

| Boundary | Trust Level | Failure Mode | Design Response |
|----------|-------------|-------------|-----------------|
| Wearable → API | Untrusted | Malformed data, missing fields | Schema validation at gateway |
| API → Queue | Trusted internally | Queue full, process crash | Backpressure, persistence |
| Queue → Pipeline | Trusted internally | Stage failure | Per-stage error handling, DLQ |
| Pipeline → Claude API | External dependency | Rate limit, timeout, bad response | Retry with backoff, fallback template |
| Pipeline → Notification | External dependency | Delivery failure | Async dispatch, delivery log |
| Pipeline → Database | Internal | Connection failure, slow writes | Connection pool, write batching |

---

## 5. Key Architectural Decisions

### Decision 1: Two-Layer Validation

**Context:** Raw events from wearable devices can fail in two ways — structurally invalid (missing fields, wrong types) or semantically invalid (heart rate of 500 bpm).

**Decision:** Validate in two places. Schema validation (structural) at the API gateway. Business validation (semantic) in the pipeline's validator stage.

**Why not validate everything in one place?**

- Gateway validation gives the client an immediate 400 response. They can fix and resend. If validation only happens in the pipeline (async), the client gets a 200, thinks everything is fine, and the event silently enters the DLQ.
- Pipeline validation applies business rules that the API gateway shouldn't know about. Thresholds change, new metric types are added — the gateway shouldn't need redeployment for domain logic changes.

**Trade-off:** Two validation layers means maintaining two sets of rules. Mitigated by keeping the gateway validation minimal (shape only) and the pipeline validation comprehensive (thresholds, anomaly detection, quality scoring).

### Decision 2: AI Calls Only for Elevated Users

**Context:** At 100 users, 100 Claude API calls per processing cycle is feasible but expensive. At 1,000 users, it's unsustainable. More importantly, 70–80% of users have normal readings on any given day — their insights are predictable and don't need AI.

**Decision:** After aggregation, a pure-function risk classifier categorizes each user's window as normal, elevated, or anomalous. Normal users get a template-based insight (zero API cost, instant delivery). Only elevated and anomalous users trigger Claude API calls.

```
Aggregator output
    │
    ▼
Risk Classifier (pure function — no AI)
    ├── normal (70-80%)    → template insight → immediate notification
    └── elevated/anomalous → Claude API call  → AI-generated insight → notification
```

**Why this matters:** This is not just a cost optimization. It's a better user experience. Normal users get instant results. Elevated users get personalized AI analysis where it actually adds value. The system is faster *and* smarter.

**Trade-off:** Template insights are less personalized. Mitigated by making templates specific to the metric combination (e.g., "good sleep + normal heart rate" has a different template than "good sleep + low steps").

### Decision 3: In-Memory Queue Now, Message Broker Later

**Context:** The pipeline needs a queue between ingestion and processing. Options range from an in-memory array to Redis/BullMQ to Kafka.

**Decision:** Start with an in-memory queue (a simple array with push/shift). Design the interface so the queue consumer doesn't know the implementation.

**Why not start with Redis?** At 100 users, Redis is operational overhead with no benefit. The queue processes events in the same Node.js process — no network hop, no serialization cost, no Redis deployment to manage.

**Why not skip the queue entirely?** Without a queue, the API handler calls the pipeline synchronously. If the pipeline is slow (AI calls take 2–3 seconds), the API response is slow. The queue decouples ingestion speed from processing speed — the API returns 202 Accepted immediately.

**The scaling seam:** The queue is accessed through an interface:

```typescript
interface EventQueue {
  enqueue(events: RawMetricEvent[]): Promise<void>;
  dequeue(batchSize: number): Promise<RawMetricEvent[]>;
}
```

At 1,000 users, swap the in-memory implementation for a BullMQ implementation. The pipeline consumer code doesn't change — it still calls `dequeue()`.

### Decision 4: AI Client Behind a Singleton

**Context:** The pipeline calls Claude for AI insights. The model, API key, retry logic, and rate limiting are infrastructure concerns that should be configured once.

**Decision:** `lib/ai-client.ts` exports a configured Anthropic client singleton and a model constant. Every stage that needs AI imports from here — never instantiates its own client.

**Why this matters for swapping:** If the team decides to use a different model (Claude 4 vs Sonnet), or a different provider entirely, or a local model for classification with Claude only for complex insights — the change is one file. No stage code touches the Anthropic SDK directly.

### Decision 5: Cache AI Insights at the Window Level

**Context:** If a user's metrics haven't meaningfully changed since the last processing cycle, the AI insight will be nearly identical. Calling Claude for the same input is waste.

**Decision:** Hash the `MetricWindow` data. Before calling Claude, check if we've seen this hash before. Cache hit → serve the cached insight. Cache miss → call Claude, cache the result.

**Implementation:** `lib/insight-cache.ts` — a simple Map with TTL (time-to-live). At scale, swap for Redis with expiry.

**Why hash the window, not individual metrics?** Individual metrics change constantly (new heart rate readings every few seconds). But the *aggregated window* (average heart rate over 24 hours) changes slowly. Caching at the window level hits the sweet spot — high cache hit rate without serving stale data.

### Decision 6: Anomaly Score, Not Anomaly Flag

**Context:** The current implementation uses a boolean `isAnomalous` — above threshold or not. A heart rate of 95 bpm is flagged the same as 200 bpm.

**Decision:** Replace the boolean with a normalized score (0–1) based on deviation from the user's personal baseline, not just global thresholds.

**Why personal baselines?** A heart rate of 95 bpm is normal for someone who exercises intensely and averages 90. It's alarming for someone who averages 60. Global thresholds create false positives for active users and false negatives for sedentary users.

**Implementation:** Store a rolling average per user per metric type in Redis (a small hash). The anomaly score is the normalized distance from the personal average, weighted by the global threshold.

```
anomalyScore = min(1, abs(value - personalAvg) / (threshold.max - threshold.min))
```

This score feeds into the risk classifier (Decision 2), making the AI-call-or-not decision more accurate.

---

## 6. Scaling Strategy

The architecture is designed so that domain logic (stages) never changes when scaling. Only infrastructure and orchestration change.

### 100 Users — Current Target

```
Single Node.js process
├── Express API (handles ~10 req/sec comfortably)
├── In-memory event queue (array)
├── Pipeline runs in-process
├── Single PostgreSQL instance
├── Redis for sessions + cache (optional — can use in-memory)
└── Claude API calls: ~20-30/cycle (after risk classifier optimization)
```

**Cost:** Minimal. One $20/month VPS + Claude API usage.
**Ops:** Zero. Single deploy, single log stream.

### 1,000 Users — First Scaling Event

**What changes:**
- Replace in-memory queue with Redis + BullMQ
- Separate API server from pipeline worker (two deployments)
- Add PostgreSQL read replica for dashboard queries
- Add connection pooling (pgBouncer)

**What stays identical:** Every file in `types/`, `stages/`, and `lib/`.

**Why this is the first bottleneck:** The Claude API calls become the constraint. Even with the risk classifier, 200–300 elevated users generating AI calls will cause processing delays. Solution: increase BullMQ worker concurrency and add a second worker process.

### 10,000+ Users — Distributed Architecture

**What changes:**
- Replace BullMQ with Kafka for event streaming
- Horizontal pipeline workers (auto-scaled by queue depth)
- Switch to time-series database (TimescaleDB or InfluxDB) for metrics
- Add CDN for pre-generated report delivery
- Consider local ML model for classification, Claude only for complex insights

**What stays identical:** Every file in `types/` and `stages/`. The pipeline functions are called by different infrastructure, but their logic is unchanged.

### Scaling Decision Matrix

| Signal | Action | Layer Changed |
|--------|--------|---------------|
| API response time > 500ms | Add load balancer + API replicas | Infra only |
| Queue depth growing | Add pipeline worker replicas | Pipeline deployment |
| DB read latency > 100ms | Add read replica | Infra only |
| Claude API rate limited | Increase cache TTL, tune risk classifier threshold | `lib/` only |
| Metrics table > 100M rows | Add time-series partitioning | Database schema |
| Real-time latency matters | Add WebSocket push from pipeline | `pipeline/` + API |

---

## 7. Error Handling Philosophy

Every stage fails differently. The error handling strategy matches the failure mode.

| Stage | Failure Mode | Response | User Impact |
|-------|-------------|----------|-------------|
| Validator | Bad data from device | Reject to DLQ, log, continue | None — bad data was never useful |
| Aggregator | Insufficient data | Return empty window, skip AI | User sees "not enough data today" |
| AI Insight | API timeout/error | Retry once with backoff, then use template | Slightly less personalized insight |
| Notification | Delivery failure | Log to delivery table, retry async | Delayed notification (minutes) |

**Key principle:** A failure in one stage never stops the pipeline for other users. A failure in the AI stage never means no insight — it means a template insight. Graceful degradation, not catastrophic failure.

---

## 8. Interview Talking Points

### "Walk me through a data pipeline you've built"

> "I built a health data pipeline that ingests wearable device data — heart rate, steps, sleep — validates it against physiological thresholds, aggregates it into time windows, generates AI-powered insights using Claude, and dispatches notifications based on risk level. The architecture uses strict layered separation: types with zero dependencies, pure-function stages, and thin orchestration that controls concurrency. The key optimization was a risk classifier after aggregation — instead of calling Claude for every user, which would be 100 API calls per cycle, we classify 70% of users as normal and serve them template insights instantly. Only elevated users hit the AI, which cut API costs by 70% and actually improved latency for most users."

### "How did you handle errors in the pipeline?"

> "Each stage has its own failure mode and its own recovery strategy. Validation failures go to a dead letter queue with exponential backoff retry — the event isn't lost, but it also doesn't block the pipeline by retrying immediately. AI failures fall back to template-based insights — the user still gets a notification, just slightly less personalized. The key design decision was that no single stage failure stops processing for other users. If user A's AI insight times out, user B's pipeline continues unaffected."

### "How would you scale this to 10,000 users?"

> "The domain logic — validation, aggregation, insight generation, notifications — doesn't change at all. What changes is infrastructure: the in-memory queue becomes Kafka, the single pipeline process becomes horizontally scaled workers, and PostgreSQL gets time-series partitioning. I designed for this from the start — stages communicate through typed interfaces, not direct calls to infrastructure. The queue consumer calls `dequeue()` whether that's backed by an array or a Kafka consumer group. That separation is what makes scaling a deployment change, not a code rewrite."

### "Why did you choose this architecture over [alternative]?"

> "I considered a microservices approach — each stage as its own service. At 100 users, that's massive over-engineering: 5 services to deploy, monitor, and debug for a workload a single process handles easily. The layered monolith gives me the same separation of concerns without the operational overhead. But because the layers communicate through interfaces, extracting any stage into a separate service later is mechanical — the interface already exists, I just put a network call behind it instead of a function call."

---

## 9. What This Document Does NOT Cover (Future Work)

- **Authentication and authorization** — JWT validation, role-based access to insights
- **Multi-tenancy** — if this becomes a platform serving multiple healthcare providers
- **HIPAA/privacy compliance** — data encryption at rest, audit logging, data retention policies
- **Monitoring and observability** — metrics (Prometheus), tracing (OpenTelemetry), alerting
- **CI/CD pipeline** — testing strategy, deployment automation, feature flags
- **API versioning** — how to evolve the event schema without breaking existing devices

Each of these deserves its own design document when the scope demands it.
