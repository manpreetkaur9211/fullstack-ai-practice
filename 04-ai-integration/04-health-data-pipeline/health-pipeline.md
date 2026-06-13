// =============================================================================
// AI HEALTH DATA PIPELINE — Full Portfolio Project
// =============================================================================
//
// ── WHAT THIS IS ─────────────────────────────────────────────────────────────
//
// A complete, production-pattern data pipeline that:
//   1. INGESTS raw wearable health data (simulated WebSocket/batch input)
//   2. VALIDATES and cleans the data (type safety + business rules)
//   3. AGGREGATES into meaningful time-window summaries
//   4. ENRICHES with AI-generated insights using Claude
//   5. OUTPUTS structured notifications + reports
//   6. HANDLES errors at every stage with proper logging
//
// This directly mirrors what you built at Yeyro and is your #1 portfolio piece.
// When asked in interviews: "Walk me through a data pipeline you've built"
// — you open this file.
//
// ARCHITECTURE:
//   RawData → Validator → Aggregator → AISummariser → NotificationEngine → Output
//       ↕           ↕            ↕              ↕                ↕
//   DeadLetterQ  ErrorLog   MetricsStore    InsightStore    DeliveryLog
//
// ── SETUP ─────────────────────────────────────────────────────────────────────
//   npm install @anthropic-ai/sdk zod dotenv
//   echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
//   npx ts-node 04-ai-integration/04-health-data-pipeline/health-pipeline.ts

import Anthropic from "@anthropic-ai/sdk";

//LAYER 1 — TYPES (no logic, no imports)
// =============================================================================
// STAGE 1: DATA TYPES & SCHEMAS
// =============================================================================


//@types folder contains:
// - health-insight.ts (HealthInsight, Notification, PipelineResult, PipelineError)
// - raw-event.ts (RawMetricEvent)
// - validated-metric.ts (ValidatedMetric)
// - metric-window.ts (MetricWindow)


//LAYER 2 — STAGES (pure functions, each file = one pipeline stage)
// =============================================================================
// STAGE 2: VALIDATION ENGINE
// =============================================================================

//@stages/validator.ts contains:
// validateAndNormalise(raw: RawMetricEvent): ValidatedMetric | null
// - Validates metric type, value, timestamp
// - Normalises value to number, timestamp to Date
// - Flags anomalies based on thresholds
// - Calculates quality score from metadata (battery, signal)
// - Returns null if invalid (goes to Dead Letter Queue) 

// =============================================================================
// STAGE 3: AGGREGATION ENGINE
// =============================================================================
//@stages/aggregator.ts contains:
// aggregateMetrics(metrics: ValidatedMetric[], userId: string, start: Date, end: Date): MetricWindow
// - Groups metrics into a time window (e.g., last 24 hours)
// - Calculates aggregates (avg heart rate, total steps, sleep quality)
// - Counts anomalies and assesses data quality
// - Returns a structured MetricWindow object for AI processing
// =============================================================================
// STAGE 4: AI INSIGHT ENGINE
// =============================================================================
//@stages/ai-insight.ts contains:
// generateAIInsight(window: MetricWindow): Promise<HealthInsight | null>
// - Takes aggregated metrics and generates a health insight using Anthropic's Bedrock Mantle API
// - Prompts the model with specific instructions to produce structured output
// - Parses and validates the response against the HealthInsight schema
// - Returns null if insight can't be generated (e.g., insufficient data)
// =============================================================================
// STAGE 5: NOTIFICATION ENGINE
// =============================================================================

//@stages/notification.ts contains:
// createNotifications(insight: HealthInsight, window: MetricWindow): Notification[]
// - Creates user-facing notifications based on the AI insight and metric data
// - Prioritises recommendations (e.g., urgent for high risk, low for lifestyle tips)
// - Determines delivery channel (push, email, sms) based on priority and user preferences  

// =============================================================================
// THE PIPELINE ORCHESTRATOR
// =============================================================================



// =============================================================================
// SAMPLE DATA — Run this to see the pipeline in action
// =============================================================================

//demo.ts

// =============================================================================
// CHALLENGES — Extend this pipeline
// =============================================================================

// 🟢 CHALLENGE 1 — Multi-user batch processing (20 min)
// ──────────────────────────────────────────────────────
// Extend the pipeline to process multiple users concurrently (max 3 at a time).
// Write: runBatchPipeline(events: RawMetricEvent[]): Promise<PipelineResult[]>
//   - Group events by userId automatically
//   - Process max 3 users at a time (rate limiting)
//   - Return all results when complete
//   - Print a summary table at the end showing each user's risk level

// TODO: Implement runBatchPipeline
//check @pipeline/run-batch-pipeline.ts for code



// 🟡 CHALLENGE 2 — Add streaming progress (25 min)
// ─────────────────────────────────────────────────
// Instead of waiting for the full AI insight, stream it to the console.
// Modify generateAIInsight to use streamText instead of messages.create.
// Print tokens as they arrive, then parse the full JSON at the end.
// This is exactly how your Yeyro notification system would work in production.

// TODO: Create generateAIInsightStreaming(window: MetricWindow): Promise<HealthInsight | null>
// check @stages/ai-insight-streaming.ts for code

// 🟡 CHALLENGE 3 — Dead letter queue + retry logic (25 min)
// ──────────────────────────────────────────────────────────
// In production, failed events shouldn't be lost.
// Add a DeadLetterQueue class that:
//   - Stores failed RawMetricEvents with their error and timestamp
//   - Has a retry() method that re-runs failed events through validation
//   - Has a maxAge (reject events older than N minutes)
//   - Reports stats: totalFailed, retried, stillFailing
// Integrate it into the pipeline so rejected events go to the DLQ.

// TODO: Implement DeadLetterQueue class
// TODO: Integrate into runPipeline
// check @stages/dead-letter-queue.ts for code

// 🔴 CHALLENGE 4 — Real-time WebSocket simulation (40 min)
// ──────────────────────────────────────────────────────────
// In production, wearable data arrives continuously via WebSocket.
// Simulate this with Node.js EventEmitter + setInterval.
//
// Build:
//   - A DataStreamSimulator that emits fake metric events every 2 seconds
//   - A StreamProcessor that:
//       * Buffers incoming events
//       * Every 30 seconds, flushes the buffer and runs the pipeline
//       * If anomalies are detected, immediately triggers an urgent pipeline run
//   - The whole system should run for 2 minutes, then print a final report
//
// This demonstrates event-driven architecture — exactly what you built at Yeyro.

// TODO: Implement DataStreamSimulator
// TODO: Implement StreamProcessor with windowing logic
// TODO: Run the simulation for 2 minutes
// check @streaming-simulation/ for code

