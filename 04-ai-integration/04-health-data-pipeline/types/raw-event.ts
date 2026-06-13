
// Raw data coming from wearable devices — messy, unvalidated

export interface RawMetricEvent {
  device_id: string;
  user_id: string;
  metric_type: string;        // Could be anything — needs validation
  value: string | number;     // Devices sometimes send strings
  timestamp: string | number; // ISO string or Unix timestamp
  firmware_version?: string;
  battery_level?: number;
  signal_quality?: number;
}