import { aggregateMetrics } from "../stages/aggregator";
import { generateAIInsight } from "../stages/ai-insight";
import { createNotifications } from "../stages/notification";
import { validateAndNormalise } from "../stages/validator";
import { HealthInsight, PipelineError, PipelineResult, Notification } from "../types/health-insight";
import { MetricWindow } from "../types/metric-window";
import { RawMetricEvent } from "../types/raw-event";
import { ValidatedMetric } from "../types/validated-metric";

// runPipeline() — single user, calls stages in order

export async function runPipeline(
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
    console.log(`   ✓ Anomalies in window: ${JSON.stringify(window)}`);
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