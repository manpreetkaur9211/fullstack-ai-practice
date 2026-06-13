import { HealthInsight,Notification } from "../types/health-insight";
import { MetricWindow } from "../types/metric-window";


export function createNotifications(
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