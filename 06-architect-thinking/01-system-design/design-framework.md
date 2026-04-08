# System Design Framework

**Difficulty: ⭐⭐⭐ | Time: Study 60 min, then practice per case study**

## The SACRED Framework (Use in Every Interview)

When an interviewer says "design X", use these six steps in order. Don't skip steps — interviewers are watching for structure.

```
S — Scope the requirements
A — Architecture overview (the boxes)
C — Core components deep-dive
R — Reliability & Resilience
E — Efficiency at Scale
D — Decision trade-offs (explicitly state what you gave up)
```

---

## Step 1: S — Scope the Requirements (5 minutes)

Ask these before drawing anything. Write down the answers.

**Functional requirements** — what the system must DO:
- What are the core user flows? (e.g., user uploads a photo, user searches for a job)
- What are the secondary features? (notifications, analytics, exports)
- What is out of scope for this design?

**Non-functional requirements** — quality attributes:
- Scale: how many users? requests per second? data stored?
- Latency: is this real-time (< 100ms)? or is a few seconds acceptable?
- Availability: 99.9% (8 hours/year downtime) or 99.99% (1 hour/year)?
- Consistency: must data always be up-to-date, or is eventual consistency OK?
- Geographic: single region or global?

**Back-of-envelope estimation** — do this out loud:
```
10M daily active users
→ 10M / 86,400 seconds = ~115 requests/second average
→ Peak is usually 3–5x average = ~400–600 req/sec
→ At 1KB per request = 600 KB/sec = ~50 GB/day of data
```

> **Practice**: For each case study, spend 5 minutes writing down requirements before looking at the hints.

---

## Step 2: A — Architecture Overview (10 minutes)

Draw these boxes in order:
```
[Clients] → [CDN / Load Balancer] → [API Gateway] → [Services] → [Databases / Cache / Queue]
```

Narrate as you draw:
- "I'll start with a CDN to serve static assets globally"
- "Behind that, a load balancer distributes traffic across stateless API servers"
- "The API gateway handles auth, rate limiting, and routing"
- "For the write path, I'll use a message queue to decouple ingestion from processing"

**Common components and when to use them:**

| Component | Use When |
|-----------|----------|
| CDN | Static assets, globally distributed users, reduce origin load |
| Load Balancer | Multiple API server instances, zero-downtime deploys |
| API Gateway | Rate limiting, auth, routing to multiple services |
| Redis Cache | Session storage, frequently-read data, leaderboards, pub/sub |
| Message Queue | Async processing, decouple producers from consumers, retry-able work |
| Object Storage (S3) | Files, images, video, backups, any binary blob |
| Search Engine (Elasticsearch) | Full-text search, faceted filtering, log analysis |
| CDN for API | For user-agnostic API responses with longer TTL |

---

## Step 3: C — Core Components Deep-Dive (15 minutes)

Pick **2–3 critical paths** and explain them in detail. Don't explain everything — go deep on what matters.

**Example critical paths:**
- Write path: how does data get into the system?
- Read path: how does data get out efficiently?
- The hardest part: real-time sync, payment processing, ML inference

For each path, explain:
1. Data flow step by step
2. Error handling and retries
3. Any async processing

**Example: Write path for a health metrics ingestion system**
```
1. Client sends POST /metrics (batch of 50 readings)
2. API gateway validates auth token, applies rate limit
3. Request validated with Zod schema (reject malformed data early)
4. Validated events published to Kafka topic: health-metrics-raw
5. Consumer service reads from Kafka, aggregates, detects anomalies
6. Anomalies published to: alerts-pending topic
7. Alert service consumes, deduplicates (Redis), sends push notification
8. Raw metrics written to TimescaleDB (time-series PostgreSQL extension)
```

---

## Step 4: R — Reliability & Resilience (5 minutes)

Interviewers always probe failure modes. Have answers ready:

**"What happens if the database goes down?"**
→ Read replica takes over reads. Writes queue in Redis or message queue. Write ahead log ensures no data loss. Application shows "read-only mode" to users.

**"What happens if a downstream service is slow?"**
→ Circuit breaker (closed → open after 50% error rate over 30 seconds → half-open after timeout). Timeout + fallback (serve cached data or graceful error message). Async processing where possible.

**"What happens if the message queue backs up?"**
→ Consumer auto-scales horizontally. Dead-letter queue for messages that fail 3+ times. Alert on consumer lag metric. Design idempotent consumers (same message processed twice = same result).

---

## Step 5: E — Efficiency at Scale (5 minutes)

Talk through the bottlenecks and how you'd remove them:

**Database bottlenecks:**
- Read-heavy: add read replicas, Redis cache for hot data
- Write-heavy: connection pooling, write batching, consider sharding (last resort)
- Large tables: partition by time (for time-series data) or by tenant (for multi-tenant)

**Caching strategy layers:**
```
Browser cache (0ms, hours TTL)
       ↓
CDN edge cache (< 50ms, minutes-hours TTL)
       ↓
API gateway cache (< 100ms, seconds-minutes TTL, for user-agnostic data)
       ↓
Redis application cache (< 5ms, seconds-minutes TTL, user-specific data)
       ↓
Database query cache (query result reuse)
       ↓
Database (the source of truth)
```

**Cache invalidation strategies:**
- TTL-only: simple, eventual consistency, data can be stale until TTL expires
- Event-driven: mutation fires event → cache keys invalidated → next read repopulates (Next.js `revalidateTag` does this)
- Write-through: write to cache and DB simultaneously (always consistent, slower writes)

---

## Step 6: D — Decision Trade-offs (5 minutes)

Explicitly state what you chose and what you gave up. This is what separates senior from mid-level.

**Trade-off template:**
> "I chose [X] over [Y] because [specific reason for this use case]. The trade-off is [what X makes harder], which I'd mitigate by [specific approach]."

**Common trade-offs to have ready:**

| Decision | Choose A when... | Choose B when... |
|----------|-----------------|-----------------|
| SQL vs NoSQL | ACID transactions, complex queries, well-defined schema | High write throughput, flexible schema, geo-distribution |
| Sync vs Async | User needs immediate response, simple operation | Long-running work, non-critical timing, decoupling needed |
| Microservices vs Monolith | Independent scaling needed, large teams, clear domain boundaries | Early stage, small team, domain boundaries still unclear |
| Consistency vs Availability | Financial transactions, inventory, anything where stale = wrong | Social features, recommendations, anything where stale = acceptable |
| Cache-aside vs Write-through | Read-heavy, can tolerate brief staleness | Write-heavy, cannot tolerate stale reads |

---

## Timing Guide for a 45-Minute Interview

```
0:00 – 0:05   Scope: ask clarifying questions, write down requirements
0:05 – 0:15   Architecture overview: draw and narrate the boxes
0:15 – 0:30   Core components: deep-dive on 2–3 critical paths
0:30 – 0:38   Reliability + Scale: failure modes and bottlenecks
0:38 – 0:45   Trade-offs + Q&A: interviewer digs into your decisions
```

> If you run out of time, it is always better to go wide first (cover all components shallowly) then deep on the interviewer's chosen area — than to go deep on one thing and never mention the rest.

---

## Key Numbers to Memorise

```
1 day = 86,400 seconds
1 month = 2.5M seconds
1 year = 31.5M seconds

Latency targets:
- In-memory (Redis): < 1ms
- Same datacenter (DB read): 1–5ms
- Cross-region: 100–300ms
- CDN edge to client: 20–80ms

Throughput rules of thumb:
- A single PostgreSQL primary: ~10,000 reads/sec, ~1,000 writes/sec
- A single Redis instance: ~100,000 ops/sec
- A single Kafka partition: ~1M messages/sec

Storage:
- 1KB per API request → 1M req/day = 1 GB/day
- 10MB per video minute → 1hr video = 600 MB
- 1B users × 10 posts/day × 1KB = 10 TB/day (Twitter-scale)
```

---

## Self-Evaluation Checklist

After each practice session, score yourself:

- [ ] Did I clarify requirements before drawing anything?
- [ ] Did I estimate scale numbers out loud?
- [ ] Did I draw an end-to-end architecture before going deep?
- [ ] Did I explain at least 2 critical paths in detail?
- [ ] Did I discuss at least 2 failure modes?
- [ ] Did I use specific trade-off language ("I chose X because... the trade-off is...")?
- [ ] Did I connect the answer to a real project I've worked on?
- [ ] Did I finish within 45 minutes?

Score 7–8: Interview-ready. Score 4–6: Keep practising. Score < 4: Re-read this framework.
