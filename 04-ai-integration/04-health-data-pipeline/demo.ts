import { runPipeline } from "./pipeline/run-pipeline";
import { RawMetricEvent } from "./types/raw-event";

const sampleRawEvents: RawMetricEvent[] = [
  // Heart rate samples (slightly elevated — should trigger insight)
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: "94",  timestamp: "2026-06-11T06:00:00Z", battery_level: 85, signal_quality: 90 },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: 89,   timestamp: "2026-06-11T09:00:00Z", battery_level: 80, signal_quality: 88 },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: 102,  timestamp: "2026-06-11T12:00:00Z", battery_level: 70, signal_quality: 75 },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: "98", timestamp: "2026-06-11T15:00:00Z", battery_level: 60, signal_quality: 70 },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: 91,   timestamp: "2026-06-11T20:00:00Z", battery_level: 50, signal_quality: 85 },

  // Low step count (should be flagged as lifestyle recommendation)
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "steps", value: 3200, timestamp: "2026-06-11T23:00:00Z", battery_level: 30, signal_quality: 80 },

  // Poor sleep (should trigger recommendation)
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "sleep_hours", value: "5.5", timestamp: "2026-06-11T07:30:00Z", battery_level: 85, signal_quality: 92 },

  // Calories
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "calories", value: 1850, timestamp: "2026-06-11T23:59:00Z" },

  // Invalid data — should be caught by validator
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "invalid_type", value: 50, timestamp: "2026-06-11T10:00:00Z" },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: "not_a_number", timestamp: "2026-06-11T11:00:00Z" },
  { device_id: "fitbit_001", user_id: "user_001", metric_type: "heart_rate", value: 250, timestamp: "2026-06-11T14:00:00Z" }, // Anomalous!
];

// Run the pipeline
runPipeline(sampleRawEvents, "user_001").then(result => {
  console.log("\n📋 PIPELINE RESULT SUMMARY:");
  console.log(`  Processed: ${result.metricsProcessed} metrics`);
  console.log(`  Anomalies: ${result.anomaliesDetected}`);
  console.log(`  Notifications: ${result.notifications.length}`);
  console.log(`  Errors: ${result.errors.length}`);
}).catch(console.error);