// Aggregated window (e.g., last hour, last day)
export interface MetricWindow {
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
