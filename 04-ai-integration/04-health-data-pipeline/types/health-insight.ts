
// AI-generated insight
export interface HealthInsight {
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
export interface Notification {
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
export interface PipelineResult {
  userId: string;
  processedAt: Date;
  metricsProcessed: number;
  anomaliesDetected: number;
  insight: HealthInsight | null;
  notifications: Notification[];
  errors: PipelineError[];
  durationMs: number;
}
export interface PipelineError {
  stage: "validation" | "aggregation" | "ai_insight" | "notification";
  message: string;
  data?: unknown;
}