//runBatchPipeline() — multi-user, concurrency=3 — Ch 1

import { processBatch } from "../lib/batch";
import { groupEventsByUser } from "../stages/group-by-user";
import { RawMetricEvent } from "../types/raw-event";
import { runPipeline } from "./run-pipeline";


export async function runBatchPipeline(rawEvents: RawMetricEvent[]) {
  const eventsByUser = groupEventsByUser(rawEvents);
const userEvents: RawMetricEvent[][] = Object.values(eventsByUser); // Array of RawMetricEvent[] for each user
const processBatchResults = await processBatch(
  userEvents,
  async (events: RawMetricEvent[]) => {
    console.log(`\n=== Starting pipeline for user ${events[0].user_id} with ${events.length} events ===`);
    const result = await runPipeline(events, events[0].user_id);
    console.log(`User ${events[0].user_id} — Insight: ${result.insight ? "Generated" : "None"}, Errors: ${result.errors.length}`);
    return result;
  },
  { concurrency: 3, delayMs: 1000 },
);

console.log("\nBatch processing complete. Summary:");
return processBatchResults;
}




