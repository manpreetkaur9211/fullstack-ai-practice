import { MetricWindow } from "../types/metric-window";
import { ValidatedMetric } from "../types/validated-metric";

export function aggregateMetrics(
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
