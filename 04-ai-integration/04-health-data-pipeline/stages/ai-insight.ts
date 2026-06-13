import { z } from "zod";
import { client, model } from "../lib/claude-client";
import { HealthInsight } from "../types/health-insight";
import { MetricWindow } from "../types/metric-window";


const InsightSchema = z.object({
  summary: z.string().max(200),
  keyObservations: z.array(z.string()).max(5),
  recommendations: z
    .array(
      z.object({
        text: z.string(),
        priority: z.enum(["low", "medium", "high"]),
        category: z.enum(["lifestyle", "medical", "nutrition", "exercise"]),
      }),
    )
    .max(4),
  riskLevel: z.enum(["low", "moderate", "elevated", "high"]),
  requiresAttention: z.boolean(),
});

export async function generateAIInsight(
  window: MetricWindow,
): Promise<HealthInsight | null> {
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
      model: model,
      max_tokens: 800,
      system: `You are a health data analyst. Analyze health metrics and provide
               concise, actionable insights. Be specific to the numbers provided.
               Never give alarming medical advice — recommend seeing a doctor
               for concerning readings rather than diagnosing.
               Respond ONLY with a valid JSON object matching this schema exactly:
               { summary, keyObservations[], recommendations[{text, priority, category}], riskLevel, requiresAttention }`,
      messages: [
        {
          role: "user",
          content: `Analyze these health metrics for the past 24 hours:
${metricsText}
Anomalies detected: ${window.anomalyCount}
Data quality: ${window.dataQuality}

Provide a concise health insight in JSON format.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

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
    console.error(
      `[AI_INSIGHT] Failed for user ${window.userId}:`,
      (error as Error).message,
    );
    return null;
  }
}
