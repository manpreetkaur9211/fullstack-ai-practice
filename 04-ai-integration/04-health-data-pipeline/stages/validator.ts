import { RawMetricEvent } from "../types/raw-event";
import { METRIC_THRESHOLDS, VALID_METRIC_TYPES, ValidatedMetric } from "../types/validated-metric";

export function validateAndNormalise(raw: RawMetricEvent): ValidatedMetric | null {
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
