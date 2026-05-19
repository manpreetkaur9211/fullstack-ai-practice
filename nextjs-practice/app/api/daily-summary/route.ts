// app/api/daily-summary/route.ts
export async function GET() {
  return Response.json({
    averageHeartRate: 72,
    totalSteps: 8421,
    sleepHours: 7.4,
    summaryDate: new Date().toISOString().split("T")[0],
    serverTimestamp: new Date().toISOString(),        // ← changes every call
  });
}