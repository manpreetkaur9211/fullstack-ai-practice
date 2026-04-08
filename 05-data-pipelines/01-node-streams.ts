// =============================================================================
// NODE.JS STREAMS + EVENT-DRIVEN ARCHITECTURE — Concept + Challenges
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// Node.js streams let you process data piece by piece instead of loading
// everything into memory at once. This is critical for:
//   - Processing large files or large datasets
//   - Real-time data from sensors/devices (exactly what Yeyro does)
//   - HTTP request/response bodies
//   - Database cursors for bulk exports
//
// WHY THIS COMES UP IN SENIOR INTERVIEWS:
//   "How would you process a 10GB CSV file on a 512MB server?"
//   "How does your notification system handle bursts of data?"
//   "What's the difference between stream.pipe() and async iteration?"
//
// STREAM TYPES:
//   Readable  → data source   (file read, HTTP response, database cursor)
//   Writable  → data sink     (file write, HTTP request, database write)
//   Transform → in/out        (compression, encryption, parsing, enrichment)
//   Duplex    → read + write  (TCP socket, WebSocket)
//
// ── HOW IT WORKS ─────────────────────────────────────────────────────────────

import { Readable, Transform, Writable, pipeline } from "stream";
import { promisify } from "util";
import { EventEmitter } from "events";

const pipelineAsync = promisify(pipeline);

// ── EXAMPLE 1: Transform stream — parse raw events line by line ───────────────

class JSONLineParser extends Transform {
  private buffer = "";

  constructor() {
    super({ objectMode: true }); // objectMode: output objects, not Buffers
  }

  _transform(chunk: Buffer, _encoding: string, callback: () => void): void {
    // Accumulate chunks — network packets may split lines
    this.buffer += chunk.toString();
    const lines = this.buffer.split("\n");

    // Keep the last (potentially incomplete) line in the buffer
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line.trim());
          this.push(parsed); // Pass the parsed object to next stage
        } catch {
          this.emit("parseError", line); // Don't crash — emit an error event
        }
      }
    }
    callback();
  }

  _flush(callback: () => void): void {
    // Process any remaining data when stream ends
    if (this.buffer.trim()) {
      try {
        this.push(JSON.parse(this.buffer.trim()));
      } catch {
        this.emit("parseError", this.buffer);
      }
    }
    callback();
  }
}

// ── EXAMPLE 2: Transform stream — validate and enrich data ────────────────────

interface RawEvent {
  userId: string;
  type: string;
  value: number;
  timestamp: string;
}

interface EnrichedEvent extends RawEvent {
  processedAt: Date;
  isValid: boolean;
  validationErrors: string[];
}

class EventValidator extends Transform {
  private validCount = 0;
  private invalidCount = 0;

  constructor() {
    super({ objectMode: true });
  }

  _transform(event: RawEvent, _encoding: string, callback: () => void): void {
    const errors: string[] = [];

    if (!event.userId) errors.push("Missing userId");
    if (typeof event.value !== "number") errors.push("value must be number");
    if (!event.timestamp) errors.push("Missing timestamp");

    const enriched: EnrichedEvent = {
      ...event,
      processedAt: new Date(),
      isValid: errors.length === 0,
      validationErrors: errors,
    };

    if (enriched.isValid) this.validCount++;
    else this.invalidCount++;

    this.push(enriched);
    callback();
  }

  getStats() {
    return { valid: this.validCount, invalid: this.invalidCount };
  }
}

// ── EXAMPLE 3: Aggregating transform — batch events ──────────────────────────

class BatchAggregator extends Transform {
  private batch: EnrichedEvent[] = [];
  private readonly batchSize: number;

  constructor(batchSize: number) {
    super({ objectMode: true });
    this.batchSize = batchSize;
  }

  _transform(event: EnrichedEvent, _encoding: string, callback: () => void): void {
    this.batch.push(event);

    if (this.batch.length >= this.batchSize) {
      this.push([...this.batch]); // Emit a full batch
      this.batch = [];
    }
    callback();
  }

  _flush(callback: () => void): void {
    if (this.batch.length > 0) {
      this.push([...this.batch]); // Emit the final partial batch
    }
    callback();
  }
}

// ── EXAMPLE 4: Full pipeline using stream.pipeline ────────────────────────────

async function processEventStream(rawNDJSONData: string): Promise<void> {
  const results: EnrichedEvent[][] = [];

  const source = Readable.from(rawNDJSONData);
  const parser = new JSONLineParser();
  const validator = new EventValidator();
  const batcher = new BatchAggregator(3);
  const sink = new Writable({
    objectMode: true,
    write(batch: EnrichedEvent[], _encoding, callback) {
      console.log(`Processing batch of ${batch.length} events`);
      results.push(batch);
      callback();
    }
  });

  // Handle parse errors without crashing the pipeline
  parser.on("parseError", (line: string) => {
    console.warn("Failed to parse:", line);
  });

  await pipelineAsync(source, parser, validator, batcher, sink);

  const stats = validator.getStats();
  console.log(`\nStream complete: ${stats.valid} valid, ${stats.invalid} invalid`);
}

// ── EXAMPLE 5: EventEmitter — the backbone of Node.js async architecture ──────
//
// EventEmitter is how Node.js decouples producers from consumers.
// It's the pattern behind streams, HTTP servers, WebSockets — everything.

type MetricType = "heart_rate" | "steps" | "sleep" | "anomaly";

interface MetricEvent {
  userId: string;
  type: MetricType;
  value: number;
  timestamp: Date;
}

// Typed EventEmitter using TypeScript's declaration merging
interface MetricEventBus {
  on(event: "metric", listener: (data: MetricEvent) => void): this;
  on(event: "anomaly", listener: (data: MetricEvent) => void): this;
  on(event: "batch:ready", listener: (batch: MetricEvent[]) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  emit(event: "metric", data: MetricEvent): boolean;
  emit(event: "anomaly", data: MetricEvent): boolean;
  emit(event: "batch:ready", batch: MetricEvent[]): boolean;
  emit(event: "error", err: Error): boolean;
}

class MetricEventBus extends EventEmitter {
  private buffer: MetricEvent[] = [];
  private readonly flushInterval: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(flushIntervalMs = 5000) {
    super();
    this.flushInterval = flushIntervalMs;
  }

  start(): void {
    this.timer = setInterval(() => this.flush(), this.flushInterval);
    console.log(`MetricEventBus started (flush every ${this.flushInterval}ms)`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.flush(); // Final flush
    console.log("MetricEventBus stopped");
  }

  ingest(event: MetricEvent): void {
    this.buffer.push(event);
    this.emit("metric", event);

    // Immediately emit anomalies — don't wait for batch flush
    if (this.isAnomalous(event)) {
      this.emit("anomaly", event);
    }
  }

  private flush(): void {
    if (this.buffer.length > 0) {
      this.emit("batch:ready", [...this.buffer]);
      this.buffer = [];
    }
  }

  private isAnomalous(event: MetricEvent): boolean {
    const thresholds: Record<MetricType, { min: number; max: number }> = {
      heart_rate: { min: 40, max: 180 },
      steps:      { min: 0, max: 80000 },
      sleep:      { min: 0, max: 24 },
      anomaly:    { min: 0, max: Infinity },
    };
    const t = thresholds[event.type];
    return event.value < t.min || event.value > t.max;
  }
}

// Usage demonstration:
function demonstrateEventBus(): void {
  const bus = new MetricEventBus(2000); // Flush every 2 seconds

  bus.on("anomaly", (event) => {
    console.log(`🚨 ANOMALY: ${event.userId} — ${event.type}: ${event.value}`);
  });

  bus.on("batch:ready", (batch) => {
    console.log(`📦 Batch ready: ${batch.length} events`);
    // Here you'd call your pipeline, save to DB, etc.
  });

  bus.start();

  // Simulate incoming data
  let count = 0;
  const dataTimer = setInterval(() => {
    bus.ingest({
      userId: "user_001",
      type: "heart_rate",
      value: 60 + Math.floor(Math.random() * 80), // 60-140
      timestamp: new Date(),
    });
    if (++count >= 10) {
      clearInterval(dataTimer);
      setTimeout(() => bus.stop(), 3000);
    }
  }, 500);
}

// =============================================================================
// CHALLENGES
// =============================================================================

// 🟢 CHALLENGE 1 — Metrics filter transform (20 min)
// ─────────────────────────────────────────────────────
// Create a MetricFilter Transform stream that:
//   - Passes through only valid events (from EventValidator)
//   - Emits a "filtered" event with a running count of how many were dropped
//   - Accepts a filter function in its constructor:
//     new MetricFilter(event => event.isValid && event.userId !== "test_user")
//
// Test it by inserting it between EventValidator and BatchAggregator
// in the processEventStream pipeline above.

// TODO: Implement MetricFilter class


// 🟢 CHALLENGE 2 — Backpressure simulation (20 min)
// ─────────────────────────────────────────────────────
// When your pipeline processes data slower than it arrives, you get backpressure.
// Node.js streams handle this automatically when you use .pipe() correctly,
// but you need to understand it.
//
// Create a SlowWriter — a Writable that simulates a slow database write:
//   - Each write takes 100ms (use setTimeout)
//   - Log: "Writing batch... [queue size: N]" showing how many batches are queued
//   - Count total batches written and total time
//
// Pipe a fast Readable (generates 50 batches instantly) to the SlowWriter.
// Observe how Node.js buffers the data automatically.
// Then try removing the await from the .pipe() call and see what happens.

// TODO: Implement SlowWriter
// TODO: Demonstrate backpressure handling


// 🟡 CHALLENGE 3 — Rebuild MetricEventBus with typed events (25 min)
// ────────────────────────────────────────────────────────────────────
// The MetricEventBus above uses interface declaration merging — this is a bit hacky.
// Rebuild it using a cleaner generic approach:
//
// class TypedEventEmitter<EventMap extends Record<string, unknown>> {
//   on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this
//   off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this
//   emit<K extends keyof EventMap>(event: K, data: EventMap[K]): boolean
//   once<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this
// }
//
// type MetricBusEvents = {
//   metric: MetricEvent
//   anomaly: MetricEvent
//   "batch:ready": MetricEvent[]
//   error: Error
// }
//
// class ImprovedMetricEventBus extends TypedEventEmitter<MetricBusEvents> { ... }

// TODO: Implement TypedEventEmitter<EventMap>
// TODO: Rebuild MetricEventBus using it


// 🔴 CHALLENGE 4 — Full streaming pipeline (40 min)
// ────────────────────────────────────────────────────
// Build a complete end-to-end streaming pipeline that could run in production.
//
// Pipeline stages:
//   1. DataSource (Readable) — generates NDJSON health events at 10/second
//   2. JSONLineParser (Transform) — parses each line as JSON
//   3. MetricFilter (Transform) — removes invalid/test data
//   4. EventValidator (Transform) — validates + enriches
//   5. MetricAggregator (Transform) — accumulates per-user, per-minute windows
//   6. MetricEventBus — handles anomaly detection + windowed batching
//   7. DatabaseWriter (Writable) — simulates saving aggregated data
//
// Requirements:
//   - The pipeline should handle 1000 events total
//   - Every 100 events, log pipeline throughput (events/sec)
//   - Anomalies should be immediately written to a separate "alerts" sink
//   - At the end, print: total processed, anomalies detected, time taken
//
// This is the kind of architecture you'd describe when interviewed about Yeyro.

// TODO: Implement the full pipeline
// TODO: Measure and log throughput

// Run the demonstration
demonstrateEventBus();

export { JSONLineParser, EventValidator, BatchAggregator, MetricEventBus };
