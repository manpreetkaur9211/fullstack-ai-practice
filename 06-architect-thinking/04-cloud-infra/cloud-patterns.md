# Cloud & Infrastructure Patterns for Full-Stack Engineers

**Difficulty: ⭐⭐ theory + ⭐⭐⭐ applying to your systems | No code to run — this is design practice**

## How to Use This File

1. Read each section once to understand the pattern.
2. For each pattern, write one sentence: "At [Chalo/Daffodil/Exly], we [did/could have] used this for [specific problem]."
3. Do the architecture exercises at the bottom — these simulate interview whiteboarding.

---

## 1. The Twelve-Factor App (Baseline for Everything)

Every cloud application should follow these principles. Interviewers expect you to know them.

| Factor | What it means | Why it matters |
|--------|--------------|----------------|
| 1. Codebase | One repo, many deploys (dev/staging/prod) | Consistency across environments |
| 2. Dependencies | Declare all dependencies (package.json, Gemfile) | No "works on my machine" |
| 3. Config | Config in environment variables, not in code | Security + environment portability |
| 4. Backing services | DB, cache, queue accessed via URL/env var | Swap Redis for Memcached with no code change |
| 5. Build/release/run | Strictly separate build, release, run stages | Immutable releases, safe rollbacks |
| 6. Processes | Stateless processes, nothing stored locally | Horizontal scaling just works |
| 7. Port binding | App exports HTTP via a port (not Apache/nginx embedded) | Process is self-contained |
| 8. Concurrency | Scale out via processes (not threads) | Kubernetes-friendly |
| 9. Disposability | Fast startup, graceful shutdown | Rolling deploys, autoscaling |
| 10. Dev/prod parity | Environments as similar as possible | "Works in staging, broken in prod" → eliminated |
| 11. Logs | Treat logs as event streams (stdout) | Aggregation handled by infrastructure |
| 12. Admin processes | Run admin tasks (migrations, cleanup) as one-off processes | Safe, auditable operations |

**Your connection:** At Daffodil, Factor 6 (stateless processes) would have been critical for horizontal scaling. Did the apps store session state in memory (violating Factor 6) or in Redis? This is a common conversation starter in interviews.

---

## 2. Deployment Patterns

### Blue/Green Deployment

```
                    ┌──────────────────────────────────┐
                    │          Load Balancer            │
                    └──────────┬───────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼ (current: 100% traffic)         ▼ (new version: 0% traffic)
    ┌──────────────────────┐          ┌──────────────────────┐
    │   Blue Environment   │          │  Green Environment   │
    │   (current v1.2.3)   │          │   (new v1.3.0)       │
    └──────────────────────┘          └──────────────────────┘
```

1. Deploy new version to Green (no traffic yet)
2. Run smoke tests on Green
3. Switch load balancer: Green gets 100% traffic
4. Blue stays live for instant rollback
5. After confidence: decommission Blue

**Trade-off:** Doubles infrastructure cost during deployment window. For AWS ECS, use task definition revisions — rollback is one CLI command.

### Canary Release (Safer for Large User Bases)

```
   All users ─────────────── 95% → Blue (v1.2.3)
                           └──  5% → Canary (v1.3.0)
```

Gradually increase canary traffic: 5% → 10% → 25% → 50% → 100%. Monitor error rate and latency at each step. If error rate spikes: immediately route back to 100% Blue.

**Use when:** you can't afford 2x infrastructure (Blue/Green) or when you want to test the new version on a small % of real traffic before full rollout.

### Feature Flags (Decouple Deploy from Release)

```typescript
// Pseudocode — deploy the feature, then turn it on via flag
if (await featureFlag.isEnabled('new-health-dashboard', userId)) {
  return <NewHealthDashboard />;
} else {
  return <OldHealthDashboard />;
}
```

Benefits:
- Code is in production but hidden → smaller, safer PRs
- Instant rollback without re-deploy
- A/B testing built-in (enable for 50% of users, measure metrics)
- Beta access (enable for specific users/tenants)

Tools: LaunchDarkly (paid, powerful), Flagsmith (open-source), or a simple DB table.

---

## 3. Infrastructure as Code (IaC)

Never click buttons in the AWS console to create production infrastructure. Use code.

### Why IaC Matters

- **Reproducibility:** `terraform apply` creates identical infrastructure in 5 minutes
- **Auditability:** infrastructure changes go through code review and Git history
- **Disaster recovery:** can recreate your entire environment from code
- **Environment parity:** dev and prod infrastructure described by the same code (with different variable values)

### Terraform Basics (Most Common in Melbourne)

```hcl
# This is what you'd describe in an interview — no need to memorise syntax
# "I'd use Terraform to define: VPC, subnets, ECS cluster, RDS instance,
#  Redis cluster, ALB, and IAM roles. All version-controlled."

resource "aws_ecs_service" "api" {
  name            = "health-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3  # 3 instances, behind the load balancer

  deployment_circuit_breaker {
    enable   = true
    rollback = true  # auto-rollback if new deploy fails health checks
  }
}
```

**Interview answer:** "I use Terraform to manage all cloud infrastructure. The state file lives in an S3 bucket with DynamoDB locking to prevent concurrent applies. All changes go through `terraform plan` in CI before `terraform apply` on merge to main. This gives us a full audit trail of infrastructure changes."

---

## 4. Observability: The Three Pillars

```
Logs + Metrics + Traces = Observability
(what happened + how much + why it happened)
```

### Logs — Structured JSON

```json
{
  "level": "info",
  "timestamp": "2024-03-15T10:23:45.123Z",
  "requestId": "req_abc123",
  "userId": "user-456",
  "tenantId": "tenant-acme",
  "action": "metric.ingest",
  "metricType": "heart_rate",
  "value": 72,
  "duration_ms": 45,
  "service": "ingestion-api",
  "version": "1.3.2"
}
```

Why structured (JSON) over plain text:
- Queryable: `level:error AND service:ingestion-api AND duration_ms:>500`
- Alertable: log-based metrics from CloudWatch Insights
- Parseable: no regex needed to extract fields

### Metrics — What to Measure

```
SLI (Service Level Indicator) — what you measure:
  - Request latency (p50, p95, p99)
  - Error rate (5xx responses / total requests)
  - Throughput (requests per second)
  - Saturation (CPU %, memory %, queue depth)

SLO (Service Level Objective) — your target:
  - p99 latency < 500ms
  - Error rate < 0.1% over 30-day rolling window
  - Uptime > 99.9%

SLA (Service Level Agreement) — what you promise customers:
  - Usually 10–20% less strict than your internal SLO
```

**Alert on SLOs, not raw metrics.** Don't alert on CPU > 80% (noisy, doesn't mean users are affected). Alert on "p99 latency > 500ms for 5 consecutive minutes" — that means users are experiencing slowness.

### Traces — Distributed Request Tracing

```
User Request → API Gateway (5ms) → Auth Service (12ms) → Metrics API (45ms) → DB (38ms)
                                                                ↓
                                                         Kafka publish (3ms)
                                                                ↓
                                                   Alert Service (8ms) → Push notification (15ms)

Total: 126ms — but without tracing you'd only see "API responded in 126ms"
```

Use OpenTelemetry SDK (vendor-neutral). Backends: Jaeger (open-source), Datadog APM, AWS X-Ray.

---

## 5. Container & Kubernetes Fundamentals

You don't need to be a K8s operator. But you need to understand the concepts.

```
Pod: the smallest deployable unit — one or more containers sharing network/storage
     Analogy: a single server process

Deployment: desired state declaration ("I want 3 replicas of this pod always running")
     Handles: rolling updates, rollbacks, self-healing (restarts crashed pods)

Service: stable DNS name + load balancing across pod replicas
     Without it: you'd have to track pod IP addresses (they change on restart)

Ingress: routes external HTTP traffic to Services
     Rule: "requests to api.yourdomain.com/v1/* → go to the api Service"

ConfigMap & Secret: inject config/secrets into containers as env vars
     Never bake config or secrets into the container image
```

**For interviews:** "At the scale I was working at, we used ECS (AWS Elastic Container Service) rather than Kubernetes — it has lower operational overhead for teams that don't have dedicated DevOps. ECS Fargate is serverless containers — you define the task (memory/CPU), AWS runs it. You don't manage EC2 instances."

---

## 6. Database Migrations in Production: The Expand-Contract Pattern

**Never** run a migration that both removes the old column AND deploys new code in a single step. If anything goes wrong and you need to roll back the deploy, the old code will try to use a column that no longer exists.

```
WRONG (single step, risky):
  Deploy: remove old_email column, code uses new_email_encrypted — if rollback needed, DB is broken

CORRECT (expand-contract, safe):
  Step 1 (Expand):    Add new_email_encrypted column (nullable)
                      Code still reads/writes old_email
  Step 2:             Backfill: UPDATE users SET new_email_encrypted = encrypt(old_email)
  Step 3:             Code writes to BOTH columns simultaneously
                      (old_email for old code instances still running during rolling deploy)
  Step 4:             Code reads from new_email_encrypted only
                      (old_email is still there as fallback)
  Step 5 (Contract):  Remove old_email column
                      (safe: no code references it anymore)
```

Each step is a separate deploy. Steps 1–4 are fully rollback-safe. Step 5 is irreversible — only run after 100% confidence.

---

## 7. Cost Optimisation Patterns

**Melbourne senior engineers are expected to care about cloud costs.** Enterprise and startup clients both track this.

| Pattern | Typical Saving | How |
|---------|---------------|-----|
| Right-sizing | 20–40% | Use AWS Compute Optimizer to find over-provisioned instances |
| Spot/Preemptible instances | 60–90% | For batch jobs, dev/test environments, non-critical workloads |
| Reserved Instances | 40–60% | Commit 1–3 years for predictable baseline production load |
| S3 lifecycle policies | 30–60% | Move objects to Infrequent Access (30 days), Glacier (90 days) |
| Unused resource cleanup | Varies | Idle load balancers ($18/month), orphaned EBS volumes, unused ECR images |
| CDN for static assets | Large | Reduces EC2/origin bandwidth; CDN egress is much cheaper than EC2 egress |

**Interview answer:** "At Daffodil, with enterprise clients, cloud cost was always on the agenda. I'd start with AWS Cost Explorer to break down cost by service and tag. Then use Compute Optimizer to right-size. For non-critical batch processing, Spot instances gave us 70–80% savings. We also set S3 lifecycle policies to move older audit logs to Glacier, which reduced storage cost significantly."

---

## Architecture Exercises

### Exercise 1: Deploy a Next.js + Node API to AWS (45 minutes, draw on paper)

Design the complete cloud infrastructure for a production Next.js frontend + Node.js API backend:
- Frontend: Next.js (SSR + static assets)
- Backend: REST API (Express/Fastify), PostgreSQL, Redis
- Requirements: CI/CD with GitHub Actions, zero-downtime deploys, HTTPS, monitoring

Draw: the AWS architecture diagram. Include: Route 53, CloudFront, S3, ALB, ECS Fargate, RDS, ElastiCache, CloudWatch.

**Check your diagram against:** Did you separate the VPC into public (ALB) and private (ECS, RDS) subnets? Did you put RDS in multi-AZ mode for HA? Did you add a NAT gateway for ECS to pull Docker images?

### Exercise 2: Design a CI/CD Pipeline (30 minutes)

Write out the stages of a GitHub Actions pipeline for the above system. For each stage, answer:
- What command runs?
- What's the failure behaviour? (block PR? notify? auto-revert?)
- Estimated time?

### Exercise 3: Postmortem Thinking (30 minutes)

Scenario: Your health metrics API goes down at 2 AM. Users can't see their data. You're on call.

Write a 5-step runbook:
1. Detect (how do you know it's down before users report it?)
2. Triage (what do you check first? Logs, metrics, traces?)
3. Mitigate (how do you restore service quickly — even if imperfectly?)
4. Fix (what changes fix the root cause?)
5. Prevent (what monitoring/alerting/process change prevents recurrence?)

This is what a "reliability mindset" looks like — something senior Melbourne engineers are expected to demonstrate.

---

## Power Phrases for Cloud Interviews

- "I'd define all infrastructure in Terraform so changes go through code review and we have full auditability."
- "For a new service, I'd start with ECS Fargate — less operational overhead than Kubernetes, and we can migrate if we outgrow it."
- "I'd alert on SLOs rather than raw metrics — CPU spikes don't matter if users aren't experiencing slowness."
- "The expand-contract pattern for DB migrations ensures every deploy is independently rollback-safe."
- "Spot instances for our data pipeline batch jobs saved around 70% on compute cost without affecting reliability."
- "Our observability setup follows the three pillars: structured JSON logs in CloudWatch Insights, latency metrics in Grafana, and distributed traces in Datadog APM."
