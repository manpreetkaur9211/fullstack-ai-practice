// app/api/live-metrics/route.ts
export async function GET() {
  const now = new Date();
  return Response.json({
    heartRate: 60 + Math.floor(Math.random() * 60),  // 60–120 bpm
    steps: Math.floor(Math.random() * 1000) + 5000,
    measuredAt: now.toISOString(),
    serverTimestamp: now.toISOString(),               // ← changes every call
  });
}