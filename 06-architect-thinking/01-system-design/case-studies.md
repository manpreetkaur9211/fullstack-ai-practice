# System Design Case Studies

**Difficulty: ⭐⭐⭐ | Time: 45 minutes per case (timed)**

## How to Use This File

1. Set a timer for **45 minutes**.
2. Read the prompt only. Do NOT read the hints yet.
3. Draw your architecture on paper or Excalidraw (excalidraw.com).
4. Narrate out loud — explaining to an imaginary interviewer.
5. After the timer, review the hints. Note what you missed.
6. Write a short ADR (see `design-framework.md` template) for one key decision.

---

## Case Study 1: Real-Time Health Monitoring Platform

> **Prompt:** Design a system that ingests health metrics from 5 million users (steps, heart rate, blood glucose, sleep) every 30 seconds and generates real-time alerts when values cross configurable thresholds (e.g., heart rate > 150 for > 5 minutes). Users also need to view historical trends (last 30 days, with daily/weekly aggregates).

**Scale to clarify:**
- 5M daily active users, metrics every 30 seconds when active
- Peak: 2M concurrent users = ~67,000 metric batches/second
- Storage: 5M users × 2 readings/min × 1KB × 86,400 min/day = ~864 GB/day raw
- Alert latency requirement: < 2 seconds end-to-end

**Your edge:** You built a version of this in `04-ai-integration/04-health-data-pipeline/health-pipeline.ts`. What would change at 5M users?

<details>
<summary>💡 Hints (open after your 45 minutes)</summary>

**Key architecture decisions:**

**Ingestion layer:** A single REST API cannot handle 67K/sec writes. Use a dedicated ingestion service (horizontally scaled) that immediately publishes to Kafka. No synchronous DB write on the hot path. The API returns `202 Accepted` immediately — processing is async.

**Storage split:** Raw metrics → Apache Kafka (buffer + replay). Processed/aggregated → TimescaleDB (PostgreSQL extension for time-series, with automatic partitioning by time range). Historical aggregates → pre-compute daily/weekly rollups via a scheduled job, store in regular PostgreSQL for fast dashboard queries.

**Alert path:** Kafka consumer reads metric events → stateful windowing (Redis SORTED SET stores rolling 5-minute windows per user) → threshold check → if triggered, publish to `alerts-pending` Kafka topic → alert delivery service deduplicates (Redis SET per user+alert-type, TTL = alert cooldown period) → push notification via FCM/APNs.

**Why not write directly to DB?** At 67K writes/sec, PostgreSQL would be overwhelmed. Kafka acts as a durable buffer. Consumers can scale independently and retry on failure.

**Trade-off to articulate:** TimescaleDB vs InfluxDB vs Cassandra for time-series. TimescaleDB: SQL interface (your team knows it), automatic downsampling, ACID. InfluxDB: purpose-built, higher write throughput, different query language. Cassandra: massive scale, AP (eventual consistency), complex to operate. For 5M users I'd choose TimescaleDB first — migrate to Cassandra if we hit write limits.

**ADR to write:** "Use Kafka + async processing over synchronous REST writes for metric ingestion"

</details>

---

## Case Study 2: Ride-Sharing Location & ETA System

> **Prompt:** Design the GPS tracking and ETA prediction system for a bus network operating in 37 cities, with 15,000 buses updating their location every 10 seconds. Mobile app users expect to see bus locations refresh in under 1 second. The system must also provide accurate ETA (estimated time of arrival) at each upcoming stop.

**Scale to clarify:**
- 15,000 location updates every 10 seconds = **1,500 writes/second**
- During rush hour (8–9 AM), may spike to 3x: 4,500 writes/sec
- Mobile clients: 3M active during peak, each subscribed to 2–3 bus routes
- ETA accuracy target: ± 2 minutes

**Your edge:** You shipped parts of this at Chalo. This is your most powerful case study. Use real decisions you made or observed.

<details>
<summary>💡 Hints (open after your 45 minutes)</summary>

**Key architecture decisions:**

**Location ingestion:** Bus devices/apps POST to a Location Ingestion Service (dedicated, horizontally scaled). Write to Redis immediately (low latency store for current position), then async to PostgreSQL with PostGIS for historical tracks and geo-queries ("which buses are within 500m of this stop?").

**Real-time push to clients:** The polling approach fails at scale (you know this from Chalo). Architecture: Location Ingestion Service publishes to Redis Pub/Sub, channel per city/route. WebSocket servers (one cluster per city) subscribe to relevant channels and push to connected clients. Mobile clients connect to the nearest WebSocket cluster (routed by CDN or regional DNS).

**Why Redis Pub/Sub over Kafka here?** Pub/Sub is ephemeral (not persisted) — we don't need replay for real-time location. Clients that reconnect just get the next update. Kafka would add unnecessary complexity and storage cost.

**ETA calculation:** Not a pure algorithmic problem. Use ML model trained on historical arrival times (time-of-day, day-of-week, weather, traffic). Model serves predictions via a dedicated ETA Service with a REST API. Cache ETA results in Redis (TTL = 30 seconds, recompute on bus location update). Fall back to schedule-based ETA if ML service is unavailable.

**Geographic queries:** PostGIS for "buses near me" queries. Index: spatial index (GiST) on the location column. Query: `ST_DWithin(location, $userLocation, 500)`. For hot queries (user's app polls this every 30s), cache in Redis by grid cell (geohash).

**Trade-off to articulate:** Redis Pub/Sub vs WebSocket with server-side SSE vs long-polling. Pub/Sub: low latency, lightweight. WebSockets: bidirectional (overkill for location push). SSE: one-directional, simpler, browser-native. Long-polling: worst — high overhead, no real-time feel.

**ADR to write:** "Use Redis Pub/Sub + WebSocket over client polling for real-time bus location delivery" (this is the one in the docx example — rewrite it in your own words from memory)

</details>

---

## Case Study 3: Creator Education Platform

> **Prompt:** Design a platform where 100,000 creators can upload, publish, and live-stream courses to 10 million learners. Features include: video upload and playback, live streaming, course purchases, AI-powered recommendations, and learner progress tracking.

**Scale to clarify:**
- 100K creators, 10M learners
- Video uploads: 10K videos/day, average 30 minutes each = 300K minutes/day = 150 TB/day raw video
- Live streams: up to 1,000 concurrent at peak
- Purchases: 50K/day (payment idempotency critical)

**Your edge:** You built on Exly's platform. Frame your answers around what problems platforms like Exly face.

<details>
<summary>💡 Hints (open after your 45 minutes)</summary>

**Key architecture decisions:**

**Video upload pipeline:** Client gets a pre-signed S3 URL from the API (never route large file uploads through your API servers). Client uploads directly to S3. S3 event triggers Lambda → publishes to `video-encoding-jobs` queue → Encoding Service (EC2 with FFmpeg or AWS Elastic Transcoder) processes video to multiple resolutions (360p, 720p, 1080p) + thumbnail generation → writes metadata to PostgreSQL → sets `status: published` → invalidates CDN cache for this creator's content.

**Video delivery:** Serve via CloudFront CDN with HLS (HTTP Live Streaming). HLS: video split into small chunks (2–10 seconds), client downloads the right resolution based on bandwidth. Adaptive bitrate switching: if client connection degrades, switch to lower resolution without buffering.

**Live streaming:** Use a dedicated streaming protocol (RTMP for ingest from creator's broadcasting software). RTMP → Transcoding Service → HLS segments → CDN edge nodes → viewers. Latency: HLS has 5–30 seconds latency. For interactive live (Q&A), use WebRTC instead (< 1 second, but harder to scale to 10K viewers).

**Payments:** Stripe with idempotency keys. POST /purchases with Idempotency-Key header. Store (key → result) in Redis for 24 hours. This prevents duplicate charges if client retries after timeout.

**Recommendations:** Collaborative filtering (users who bought X also bought Y) + content-based (course embeddings via text/video AI). Pre-compute recommendations nightly (batch job → store in Redis keyed by userId). Real-time: "because you watched X" shown immediately using the lightweight content-based model.

**Trade-off:** AWS Elastic Transcoder vs FFmpeg on EC2 vs AWS MediaConvert. Transcoder: fully managed, higher cost per minute. FFmpeg on EC2: cheapest, more control, but you manage infrastructure. MediaConvert: middle ground, professional features (subtitles, DRM), pay-per-use.

</details>

---

## Case Study 4: Multi-Tenant Enterprise SaaS

> **Prompt:** Design a multi-tenant SaaS platform for 500 enterprise customers, each with strict data isolation requirements (no cross-tenant data leakage), SSO integration (SAML/OIDC), role-based access control, full audit logging for compliance, and the ability to export all their data on request.

**Scale to clarify:**
- 500 enterprise tenants, 100K total users
- Largest tenant: 10,000 users
- Audit logs: every user action logged → 10M events/day
- Data export: up to 5 GB per tenant, requested monthly

**Your edge:** You built enterprise software at Daffodil for global clients. This is the most directly relevant case study for enterprise roles.

<details>
<summary>💡 Hints (open after your 45 minutes)</summary>

**Key architecture decisions:**

**Data isolation strategies (the core decision):**
1. **Shared DB, shared schema, row-level security (RLS):** Every table has `tenant_id`. PostgreSQL RLS policies enforce isolation at the DB level. Pros: simple, cheap, easy to query across tenants for analytics. Cons: RLS misconfiguration = data breach, noisy neighbour problem (one tenant's heavy query affects others).
2. **Shared DB, separate schemas:** Each tenant gets their own PostgreSQL schema (`tenant_acme.users`). Pros: strong isolation, easy backup per tenant, no RLS risk. Cons: 500 schemas, migration complexity (run migrations against each schema), cross-tenant analytics require UNION queries.
3. **Separate databases per tenant:** Maximum isolation. Pros: complete isolation, compliance-friendly (can host in tenant's region). Cons: 500 databases to manage, expensive, complex connection pooling.

**My recommendation for 500 tenants:** Separate schemas. Strong isolation without the operational overhead of 500 separate databases. Use a migration tool that runs against all schemas (Flyway multi-tenant, or custom script).

**SSO integration:** Support SAML 2.0 and OIDC. Each tenant configures their IdP (Okta, Azure AD, Google Workspace) in their admin portal. Store per-tenant SSO config in the DB. On login, redirect to tenant's IdP. Use a library (passport-saml, openid-client in Node.js). Never build your own SAML parser.

**RBAC:** Three levels: tenant-level roles (Admin, Member, Viewer), resource-level permissions (can edit this specific project), and system-level roles (your internal support team). Store in a dedicated permissions table. Check at the API gateway level using a middleware that loads the user's permissions and attaches to the request context.

**Audit logging:** Write-only append log. Never update or delete audit records. Store in a separate database (PostgreSQL with `REVOKE DELETE, UPDATE` on the audit schema). Index by `(tenant_id, timestamp, user_id, action)`. Expose a query API for compliance officers. Export: stream to CSV/JSON and upload to tenant's S3 bucket (presigned URL sent to admin).

**Trade-off:** RLS vs separate schemas vs separate DBs. The right answer depends on your compliance requirements. For SOC 2 Type II or ISO 27001: separate schemas give you clear data boundaries and easier audit evidence. For GDPR right-to-erasure: separate schemas make it easier to prove a full data deletion.

</details>

---

## Case Study 5: RAG-Powered AI Search API

> **Prompt:** Design an API that allows users to search 100 million technical documents (documentation, code, articles) using natural language queries. The system uses retrieval-augmented generation (RAG): semantic search finds relevant chunks, then a large language model (Claude/GPT-4) generates a cited answer. Target: < 3 second end-to-end response time, streaming output.

**Scale to clarify:**
- 100M documents, average 5KB each = 500 GB of text
- Documents chunked at 512 tokens → ~200M chunks to embed and index
- Query volume: 100K queries/day at launch, 10M at scale
- LLM cost: ~$0.01 per query (must be managed)

**Your edge:** Your `04-ai-integration/` practice modules directly prepare you for this. Connect the dots.

<details>
<summary>💡 Hints (open after your 45 minutes)</summary>

**Key architecture decisions:**

**Embedding pipeline (offline):** Documents ingested → chunked (512 token windows, 50 token overlap for context continuity) → embedding model generates 1536-dimension vectors (text-embedding-3-small via OpenAI API) → stored in a vector database (pgvector in PostgreSQL for < 10M chunks, Pinecone/Weaviate for 200M+). This pipeline runs as a batch job on new/updated documents.

**Query path:**
1. User query → embed query (same embedding model, same dimension)
2. Vector similarity search in vector DB (cosine similarity, top-k = 10 chunks)
3. Optional: keyword search (Elasticsearch BM25) + combine with vector results (hybrid search, higher accuracy)
4. Top chunks → assembled into LLM context window with citations
5. LLM (Claude/GPT-4) streams response with citations → Server-Sent Events to client
6. Stream token by token → client displays progressively

**Caching strategy for LLM cost control:**
- Exact query cache: Redis (key = hash of query, TTL = 1 hour). ~30% of queries are identical.
- Semantic cache: vector search for "similar" queries that already have answers (e.g., "how do I do X in Python" ≈ "what is the Python syntax for X"). Use a cache-first lookup with threshold cosine similarity ≥ 0.95.
- Result: 50–60% cache hit rate → 50–60% cost reduction.

**Rate limiting for LLM API:** LLM providers have their own rate limits. Implement a token bucket rate limiter per user tier. Queue requests if rate limit approached — return 202 Accepted + SSE stream that first sends waiting state. This prevents 429 errors to end users.

**Streaming to the client:** Server-Sent Events (SSE) are ideal — one-directional, works through proxies, auto-reconnect. Vercel AI SDK `streamText` or direct `Anthropic SDK` stream. Your `04-ai-integration/03-streaming/streaming-patterns.ts` file is directly relevant here.

**Trade-off:** pgvector vs Pinecone vs Weaviate. pgvector: stays in your existing PostgreSQL, no new infrastructure, good to 5M vectors. Pinecone: purpose-built, 1B+ vectors, managed, cost per query. Weaviate: open-source, self-hosted option, built-in hybrid search. Recommendation: pgvector to start → migrate to Pinecone at 50M+ chunks.

**ADR to write:** "Use pgvector over a dedicated vector database for initial launch of RAG search"

</details>

---

## After All Five Case Studies

Once you have worked through all five, do this:

1. **Draw all five architectures from memory** in one session. No hints. 30 minutes for all five.
2. **Write one ADR per case study** (5 ADRs total). Each should be 150–200 words.
3. **Record yourself** explaining Case Study 2 (Ride-Sharing) as if to a real interviewer. Watch it back. Note filler words, hesitations, missed components.
4. **Connect each case study to your CV:** which Chalo/Daffodil/Exly experience is most relevant to each case? Have a 30-second "at my last job we faced a similar problem" ready for each.
