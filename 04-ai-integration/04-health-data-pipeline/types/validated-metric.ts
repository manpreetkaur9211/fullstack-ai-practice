// Validated + normalised metric
export interface ValidatedMetric {
  deviceId: string;
  userId: string;
  type: "heart_rate" | "steps" | "sleep_hours" | "calories" | "blood_pressure";
  value: number;
  unit: string;
  timestamp: Date;
  isAnomalous: boolean;
  qualityScore: number; // 0-1 based on signal quality, battery, etc.
}

export const METRIC_THRESHOLDS: Record<
  ValidatedMetric["type"],
  { min: number; max: number; unit: string }
> = {
  heart_rate:     { min: 30, max: 220,  unit: "bpm"   },
  steps:          { min: 0,  max: 80000, unit: "steps" },
  sleep_hours:    { min: 0,  max: 24,   unit: "hours"  },
  calories:       { min: 0,  max: 10000, unit: "kcal"  },
  blood_pressure: { min: 40, max: 200,  unit: "mmHg"  },
};

export const VALID_METRIC_TYPES = new Set([
  "heart_rate", "steps", "sleep_hours", "calories", "blood_pressure"
]);