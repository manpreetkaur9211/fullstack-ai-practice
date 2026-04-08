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
import { z } from "zod";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// =============================================================================
// STAGE 1: DATA TYPES & SCHEMAS
// =============================================================================

// Raw data coming from wearable devices — messy, unvalidated
interface RawMetricEvent {
  device_id: string;
  user_id: string;
  metric_type: string;        // Could be anything — needs validation
  value: string | number;     // Devices sometimes send strings
  timestamp: string | number; // ISO string or Unix timestamp
  firmware_version?: string;
  battery_level?: number;
  signal_quality?: number;
}

// Validated + normalised metric
interface ValidatedMetric {
  deviceId: string;
  userId: string;
  type: "heart_rate" | "steps" | "sleep_hours" | "calories" | "blood_pressure";
  value: number;
  unit: string;
  timestamp: Date;
  isAnomalous: boolean;
  qualityScore: number; // 0-1 based on signal quality, battery, etc.
}

// Aggregated window (e.g., last hour, last day)
interface MetricWindow {
  userId: string;
  windowStart: Date;
  windowEnd: Date;
  metrics: {
    heart_rate?:    { avg: number; min: number; max: number; samples: number };
    steps?:         { total: number };
    sleep_hours?:   { total: number; quality: "poor" | "fair" | "good" };
    calories?:      { total: number };
    blood_pressure?: { systolicAvg: number; diastolicAvg: number };
  };
  anomalyCount: number;
  dataQuality: "low" | "medium" | "high";
}

// AI-generated insight
interface HealthInsight {
  userId: string;
  generatedAt: Date;
  summary: string;
  keyObservations: string[];
  recommendations: Array<{
    text: string;
    priority: "low" | "medium" | "high";
    category: "lifestyle" | "medical" | "nutrition" | "exercise";
  }>;
  riskLevel: "low" | "moderate" | "elevated" | "high";
  requiresAttention: boolean;
}

// Outbound notification
interface Notification {
  userId: string;
  type: "insight" | "alert" | "summary";
  title: string;
  body: string;
  priority: "low" | "medium" | "high" | "urgent";
  deliveryChannel: "push" | "email" | "sms";
  scheduledFor: Date;
  metadata: Record<string, unknown>;
}

// Pipeline result
interface PipelineResult {
  userId: string;
  processedAt: Date;
  metricsProcessed: number;
  anomaliesDetected: number;
  insight: HealthInsight | null;
  notifications: Notification[];
  errors: PipelineError[];
  durationMs: number;
}

interface PipelineError {
  stage: "validation" | "aggregation" | "ai_insight" | "notification";
  message: string;
  data?: unknown;
}

// =============================================================================
// STAGE 2: VALIDATION ENGINE
// =============================================================================

const METRIC_THRESHOLDS: Record<
  ValidatedMetric["type"],
  { min: number; max: number; unit: string }
> = {
  heart_rate:     { min: 30, max: 220,  unit: "bpm"   },
  steps:          { min: 0,  max: 80000, unit: "steps" },
  sleep_hours:    { min: 0,  max: 24,   unit: "hours"  },
  calories:       { min: 0,  max: 10000, unit: "kcal"  },
  blood_pressure: { min: 40, max: 200,  unit: "mmHg"  },
};

const VALID_METRIC_TYPES = new Set([
  "heart_rate", "steps", "sleep_hours", "calories", "blood_pressure"
]);

function validateAndNormalise(raw: RawMetricEvent): ValidatedMetric | null {
  // Validate metric type
  if (!VALID_METRIC_TYPES.has(raw.metric_type)) {
    console.warn(`[VALIDATION] Unknown metric type: ${raw.metric_type}`);
    return null;
  }

  // Normalise value to number
  const value = typeof raw.value === "string" ? parseFloat(raw.value) : raw.value;
  if (isNaN(value)) {
    console.warn(`[VALIDATION] Non-numeric value: ${raw.value}`);
    return null;
  }

  // Normalise timestamp
  let timestamp: Date;
  if (typeof raw.timestamp === "number") {
    timestamp = new Date(raw.timestamp * 1000); // Unix → Date
  } else {
    timestamp = new Date(raw.timestamp);
  }
  if (isNaN(timestamp.getTime())) {
    console.warn(`[VALIDATION] Invalid timestamp: ${raw.timestamp}`);
    return null;
  }

  const metricType = raw.metric_type as ValidatedMetric["type"];
  const thresholds = METRIC_THRESHOLDS[metricType];
  const isAnomalous = value < thresholds.min || value > thresholds.max;

  // Quality score based on available metadata
  const qualityScore = calculateQualityScore(raw);

  return {
    deviceId: raw.device_id,
    userId: raw.user_id,
    type: metricType,
    value,
    unit: thresholds.unit,
    timestamp,
    isAnomalous,
    qualityScore,
  };
}

function calculateQualityScore(raw: RawMetricEvent): number {
  let score = 1.0;
  if (raw.battery_level !== undefined && raw.battery_level < 20) score -= 0.2;
  if (raw.signal_quality !== undefined && raw.signal_quality < 50) score -= 0.3;
  return Math.max(0, score);
}

// =============================================================================
// STAGE 3: AGGREGATION ENGINE
// =============================================================================

function aggregateMetrics(
  metrics: ValidatedMetric[],
  userId: string,
  windowStart: Date,
  windowEnd: Date
): MetricWindow {
  const userMetrics = metrics.filter(m =>
    m.userId === userId &&
    m.timestamp >= windowStart &&
    m.timestamp <= windowEnd
  );

  const heartRateMetrics = userMetrics.filter(m => m.type === "heart_rate");
  const stepsMetrics     = userMetrics.filter(m => m.type === "steps");
  const sleepMetrics     = userMetrics.filter(m => m.type === "sleep_hours");
  const caloriesMetrics  = userMetrics.filter(m => m.type === "calories");

  const avgQuality = userMetrics.length > 0
    ? userMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / userMetrics.length
    : 0;

  const result: MetricWindow = {
    userId,
    windowStart,
    windowEnd,
    metrics: {},
    anomalyCount: userMetrics.filter(m => m.isAnomalous).length,
    dataQuality: avgQuality > 0.8 ? "high" : avgQuality > 0.5 ? "medium" : "low",
  };

  if (heartRateMetrics.length > 0) {
    const values = heartRateMetrics.map(m => m.value);
    result.metrics.heart_rate = {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      samples: values.length,
    };
  }

  if (stepsMetrics.length > 0) {
    result.metrics.steps = {
      total: stepsMetrics.reduce((sum, m) => sum + m.value, 0),
    };
  }

  if (sleepMetrics.length > 0) {
    const totalSleep = sleepMetrics.reduce((sum, m) => sum + m.value, 0);
    result.metrics.sleep_hours = {
      total: totalSleep,
      quality: totalSleep >= 7 ? "good" : totalSleep >= 5 ? "fair" : "poor",
    };
  }

  if (caloriesMetrics.length > 0) {
    result.metrics.calories = {
      total: caloriesMetrics.reduce((sum, m) => sum + m.value, 0),
    };
  }

  return result;
}

// =============================================================================
// STAGE 4: AI INSIGHT ENGINE
// =============================================================================

const InsightSchema = z.object({
  summary: z.string().max(200),
  keyObservations: z.array(z.string()).max(5),
  recommendations: z.array(z.object({
    text: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    category: z.enum(["lifestyle", "medical", "nutrition", "exercise"]),
  })).max(4),
  riskLevel: z.enum(["low", "moderate", "elevated", "high"]),
  requiresAttention: z.boolean(),
});

async function generateAIInsight(window: MetricWindow): Promise<HealthInsight | null> {
  const metricsText = Object.entries(window.metrics)
    .map(([type, data]) => {
      if (type === "heart_rate" && data) {
        const hr = data as MetricWindow["metrics"]["heart_rate"];
        return `Heart Rate: avg ${hr!.avg} bpm, range ${hr!.min}-${hr!.max}, ${hr!.samples} samples`;
      }
      if (type === "steps" && data) {
        return `Steps: ${(data as MetricWindow["metrics"]["steps"])!.total} total`;
      }
      if (type === "sleep_hours" && data) {
        const sl = data as MetricWindow["metrics"]["sleep_hours"];
        return `Sleep: ${sl!.total} hours (${sl!.quality} quality)`;
      }
      if (type === "calories" && data) {
        return `Calories burned: ${(data as MetricWindow["metrics"]["calories"])!.total}`;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n");

  if (!metricsText) return null;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      system: `You are a health data analyst. Analyze health metrics and provide
               concise, actionable insights. Be specific to the numbers provided.
               Never give alarming medical advice — recommend seeing a doctor
               for concerning readings rather than diagnosing.
               Respond ONLY with a valid JSON object matching this schema exactly:
               { summary, keyObservations[], recommendations[{text, priority, category}], riskLevel, requiresAttention }`,
      messages: [{
        role: "user",
        content: `Analyze these health metrics for the past 24 hours:
${metricsText}
Anomalies detected: ${window.anomalyCount}
Data quality: ${window.dataQuality}

Provide a concise health insight in JSON format.`
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Clean JSON — sometimes Claude adds markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = InsightSchema.parse(JSON.parse(jsonMatch[0]));

    return {
      userId: window.userId,
      generatedAt: new Date(),
      ...parsed,
    };
  } catch (error) {
    console.error(`[AI_INSIGHT] Failed for user ${window.userId}:`, (error as Error).message);
    return null;
  }
}

// =============================================================================
// STAGE 5: NOTIFICATION ENGINE
// =============================================================================

function createNotifications(
  insight: HealthInsight,
  window: MetricWindow
): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();

  // Always send daily insight summary
  notifications.push({
    userId: insight.userId,
    type: "insight",
    title: "Your Daily Health Summary",
    body: insight.summary,
    priority: insight.riskLevel === "high" ? "urgent" :
              insight.riskLevel === "elevated" ? "high" : "low",
    deliveryChannel: "push",
    scheduledFor: now,
    metadata: {
      riskLevel: insight.riskLevel,
      anomalyCount: window.anomalyCount,
      recommendations: insight.recommendations.length,
    },
  });

  // Create alert if attention needed
  if (insight.requiresAttention) {
    notifications.push({
      userId: insight.userId,
      type: "alert",
      title: "Health Alert — Review Recommended",
      body: `Your health metrics show some areas that may need attention. ${
        insight.recommendations.find(r => r.priority === "high")?.text ?? "Please review your health data."
      }`,
      priority: "high",
      deliveryChannel: "push",
      scheduledFor: now,
      metadata: { keyObservations: insight.keyObservations },
    });
  }

  // Email summary for elevated risk
  if (insight.riskLevel === "elevated" || insight.riskLevel === "high") {
    notifications.push({
      userId: insight.userId,
      type: "summary",
      title: "Weekly Health Report — Attention Needed",
      body: insight.keyObservations.join(" | "),
      priority: "medium",
      deliveryChannel: "email",
      scheduledFor: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour later
      metadata: { fullInsight: insight },
    });
  }

  return notifications;
}

// =============================================================================
// THE PIPELINE ORCHESTRATOR
// =============================================================================

async function runPipeline(
  rawEvents: RawMetricEvent[],
  userId: string
): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: PipelineError[] = [];
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000); // 24hr window

  console.log(`\n${"=".repeat(60)}`);
  console.log(`PIPELINE START — User: ${userId}`);
  console.log(`Processing ${rawEvents.length} raw events`);
  console.log(`${"=".repeat(60)}\n`);

  // STAGE 1: VALIDATION
  console.log("[1/4] Validating and normalising metrics...");
  const validatedMetrics: ValidatedMetric[] = [];
  let rejectedCount = 0;

  for (const raw of rawEvents) {
    const validated = validateAndNormalise(raw);
    if (validated) {
      validatedMetrics.push(validated);
    } else {
      rejectedCount++;
      errors.push({
        stage: "validation",
        message: `Rejected metric: type=${raw.metric_type}, value=${raw.value}`,
        data: raw,
      });
    }
  }
  console.log(`   ✓ Validated: ${validatedMetrics.length}, Rejected: ${rejectedCount}`);
  console.log(`   ✓ Anomalies: ${validatedMetrics.filter(m => m.isAnomalous).length}`);

  // STAGE 2: AGGREGATION
  console.log("\n[2/4] Aggregating metrics into time window...");
  let window: MetricWindow;
  try {
    window = aggregateMetrics(validatedMetrics, userId, windowStart, windowEnd);
    console.log(`   ✓ Window: ${windowStart.toISOString()} → ${windowEnd.toISOString()}`);
    console.log(`   ✓ Data quality: ${window.dataQuality}`);
    console.log(`   ✓ Metrics available: ${Object.keys(window.metrics).join(", ")}`);
  } catch (err) {
    errors.push({ stage: "aggregation", message: (err as Error).message });
    console.error("   ✗ Aggregation failed:", (err as Error).message);
    return {
      userId, processedAt: new Date(), metricsProcessed: 0,
      anomaliesDetected: 0, insight: null, notifications: [],
      errors, durationMs: Date.now() - startTime,
    };
  }

  // STAGE 3: AI INSIGHT
  console.log("\n[3/4] Generating AI health insight...");
  let insight: HealthInsight | null = null;
  try {
    insight = await generateAIInsight(window);
    if (insight) {
      console.log(`   ✓ Risk level: ${insight.riskLevel}`);
      console.log(`   ✓ Requires attention: ${insight.requiresAttention}`);
      console.log(`   ✓ Recommendations: ${insight.recommendations.length}`);
    } else {
      console.log("   ⚠ No insight generated (insufficient data)");
    }
  } catch (err) {
    errors.push({ stage: "ai_insight", message: (err as Error).message });
    console.error("   ✗ AI insight failed:", (err as Error).message);
  }

  // STAGE 4: NOTIFICATIONS
  console.log("\n[4/4] Creating notifications...");
  let notifications: Notification[] = [];
  if (insight) {
    try {
      notifications = createNotifications(insight, window);
      console.log(`   ✓ Notifications created: ${notifications.length}`);
      notifications.forEach(n =>
        console.log(`      → [${n.priority.toUpperCase()}] ${n.type}: "${n.title}"`)
      );
    } catch (err) {
      errors.push({ stage: "notification", message: (err as Error).message });
    }
  }

  const result: PipelineResult = {
    userId,
    processedAt: new Date(),
    metricsProcessed: validatedMetrics.length,
    anomaliesDetected: validatedMetrics.filter(m => m.isAnomalous).length,
    insight,
    notifications,
    errors,
    durationMs: Date.now() - startTime,
  };

  console.log(`\n${"=".repeat(60)}`);
  console.log("PIPELINE COMPLETE");
  console.log(`Duration: ${result.durationMs}ms`);
  console.log(`Errors: ${errors.length}`);
  console.log(`${"=".repeat(60)}\n`);

  if (insight) {
    console.log("📊 INSIGHT SUMMARY:");
    console.log(insight.summary);
    console.log("\n🔍 Key Observations:");
    insight.keyObservations.forEach(o => console.log(`  • ${o}`));
    console.log("\n💡 Recommendations:");
    insight.recommendations.forEach(r =>
      console.log(`  [${r.priority.toUpperCase()}] ${r.text}`)
    );
  }

  return result;
}

// =============================================================================
// SAMPLE DATA — Run this to see the pipeline in action
// =============================================================================

const sampleRawEvents: RawMetricEvent[] = [
  // Heart rate samples (slightly elevated — should trigger insight)
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: "94",  timestamp: "2026-04-07T06:00:00Z", battery_level: 85, signal_quality: 90 },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: 89,   timestamp: "2026-04-07T09:00:00Z", battery_level: 80, signal_quality: 88 },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: 102,  timestamp: "2026-04-07T12:00:00Z", battery_level: 70, signal_quality: 75 },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: "98", timestamp: "2026-04-07T15:00:00Z", battery_level: 60, signal_quality: 70 },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: 91,   timestamp: "2026-04-07T20:00:00Z", battery_level: 50, signal_quality: 85 },

  // Low step count (should be flagged as lifestyle recommendation)
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "steps", value: 3200, timestamp: "2026-04-07T23:00:00Z", battery_level: 30, signal_quality: 80 },

  // Poor sleep (should trigger recommendation)
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "sleep_hours", value: "5.5", timestamp: "2026-04-07T07:30:00Z", battery_level: 85, signal_quality: 92 },

  // Calories
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "calories", value: 1850, timestamp: "2026-04-07T23:59:00Z" },

  // Invalid data — should be caught by validator
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "invalid_type", value: 50, timestamp: "2026-04-07T10:00:00Z" },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: "not_a_number", timestamp: "2026-04-07T11:00:00Z" },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: 250, timestamp: "2026-04-07T14:00:00Z" }, // Anomalous!
];

// Run the pipeline
runPipeline(sampleRawEvents, "user_001").then(result => {
  console.log("\n📋 PIPELINE RESULT SUMMARY:");
  console.log(`  Processed: ${result.metricsProcessed} metrics`);
  console.log(`  Anomalies: ${result.anomaliesDetected}`);
  console.log(`  Notifications: ${result.notifications.length}`);
  console.log(`  Errors: ${result.errors.length}`);
}).catch(console.error);

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


// 🟡 CHALLENGE 2 — Add streaming progress (25 min)
// ─────────────────────────────────────────────────
// Instead of waiting for the full AI insight, stream it to the console.
// Modify generateAIInsight to use streamText instead of messages.create.
// Print tokens as they arrive, then parse the full JSON at the end.
// This is exactly how your Yeyro notification system would work in production.

// TODO: Create generateAIInsightStreaming(window: MetricWindow): Promise<HealthInsight | null>


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

export { runPipeline, validateAndNormalise, aggregateMetrics, generateAIInsight };
