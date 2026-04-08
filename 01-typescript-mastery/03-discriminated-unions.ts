// =============================================================================
// DISCRIMINATED UNIONS + TYPE NARROWING — Concept + Challenges
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// A discriminated union is a union of types that share a common "discriminant"
// field — usually a literal type like `type: "loading"` or `status: "error"`.
//
// TypeScript uses this discriminant to NARROW the type inside conditionals.
// This means: no more `as User` type assertions, no more optional chaining
// on fields that should always exist in a given state.
//
// WHY THIS IS CRITICAL FOR SENIOR ROLES:
//   - Used in Redux reducers, event handling, state machines, API responses
//   - Interviewers love: "How do you model loading/error/success state in TS?"
//   - Prevents an entire class of runtime bugs: accessing .data before it loads
//   - The "exhaustive check" pattern proves you've handled every case
//
// ── THE PROBLEM WITHOUT DISCRIMINATED UNIONS ─────────────────────────────────

// ❌ BAD — all fields optional, TypeScript can't help you
interface BadLoadingState {
  loading?: boolean;
  data?: User[];
  error?: string;
}
// You have to check EVERY field manually
// TypeScript doesn't know that when error exists, data won't

// ── THE SOLUTION — Discriminated Union ───────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
}

// ✅ GOOD — each state is a separate type, discriminated by `status`
type LoadingState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error";   error: string; retryCount: number };

// TypeScript NARROWS based on the discriminant:
function renderState(state: LoadingState<User[]>): string {
  switch (state.status) {
    case "idle":
      return "Waiting...";
    case "loading":
      return "Loading...";
    case "success":
      return `Loaded ${state.data.length} users`; // TypeScript knows .data exists here ✅
    case "error":
      return `Error: ${state.error} (retry ${state.retryCount})`; // TypeScript knows .error exists ✅
  }
}

// ── EXHAUSTIVE CHECKS ─────────────────────────────────────────────────────────
//
// This pattern ensures you handle every case. If you add a new status type
// later and forget to handle it, TypeScript will give you a COMPILE ERROR.

function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

function renderStateExhaustive(state: LoadingState<User[]>): string {
  switch (state.status) {
    case "idle":    return "Waiting...";
    case "loading": return "Loading...";
    case "success": return `${state.data.length} users`;
    case "error":   return state.error;
    default:        return assertNever(state); // TypeScript errors if any case is unhandled
  }
}

// ── REAL-WORLD PATTERN — Action/Event types ──────────────────────────────────
//
// This is exactly how Redux actions work. Each action type has a specific payload.

type HealthDataAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: HealthMetric[] }
  | { type: "FETCH_ERROR";   error: string }
  | { type: "ADD_METRIC";    metric: HealthMetric }
  | { type: "DELETE_METRIC"; metricId: string }
  | { type: "CLEAR_ALL" };

interface HealthMetric {
  id: string;
  userId: string;
  type: "heart_rate" | "steps" | "sleep_hours" | "calories";
  value: number;
  recordedAt: Date;
}

interface HealthDataState {
  metrics: HealthMetric[];
  loadingState: LoadingState<HealthMetric[]>;
}

// A reducer with full type safety — TypeScript knows the payload shape per action:
function healthDataReducer(
  state: HealthDataState,
  action: HealthDataAction
): HealthDataState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loadingState: { status: "loading" } };

    case "FETCH_SUCCESS":
      // TypeScript knows action.payload is HealthMetric[] here ✅
      return {
        ...state,
        metrics: action.payload,
        loadingState: { status: "success", data: action.payload }
      };

    case "FETCH_ERROR":
      return {
        ...state,
        loadingState: { status: "error", error: action.error, retryCount: 0 }
      };

    case "ADD_METRIC":
      return { ...state, metrics: [...state.metrics, action.metric] };

    case "DELETE_METRIC":
      return {
        ...state,
        metrics: state.metrics.filter(m => m.id !== action.metricId)
      };

    case "CLEAR_ALL":
      return { ...state, metrics: [] };

    default:
      return assertNever(action); // Ensures we handle every action ✅
  }
}

// ── TYPE NARROWING TECHNIQUES ─────────────────────────────────────────────────

type StringOrNumber = string | number;

// 1. typeof narrowing
function processValue(val: StringOrNumber) {
  if (typeof val === "string") {
    console.log(val.toUpperCase()); // TypeScript knows it's string here
  } else {
    console.log(val.toFixed(2));    // TypeScript knows it's number here
  }
}

// 2. instanceof narrowing
function handleError(error: Error | string) {
  if (error instanceof Error) {
    console.log(error.stack); // Has .stack property ✅
  } else {
    console.log(error);       // It's a string ✅
  }
}

// 3. "in" operator narrowing
type Cat = { meow: () => void };
type Dog = { bark: () => void };

function makeNoise(animal: Cat | Dog) {
  if ("meow" in animal) {
    animal.meow(); // TypeScript knows it's a Cat ✅
  } else {
    animal.bark(); // TypeScript knows it's a Dog ✅
  }
}

// 4. Custom type guard — returns `value is T`
function isHealthMetric(value: unknown): value is HealthMetric {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "type" in value &&
    "value" in value
  );
}

// After calling isHealthMetric(x), TypeScript knows x is HealthMetric:
function processUnknownData(data: unknown) {
  if (isHealthMetric(data)) {
    console.log(data.type, data.value); // Fully typed ✅
  }
}

// =============================================================================
// CHALLENGES
// =============================================================================

// 🟢 CHALLENGE 1 — Notification state machine (15 min)
// ──────────────────────────────────────────────────────
// Model a notification as a discriminated union representing its lifecycle:
//   pending  → notification created, not yet sent
//   sent     → sent at a timestamp, delivery status unknown
//   delivered → confirmed delivered, at a specific time
//   read     → user has read it (includes readAt timestamp)
//   failed   → delivery failed with an error message and retry info
//
// Then write:
//   a) getNotificationStatusText(notification: NotificationState): string
//      Returns a human-readable status string
//
//   b) canRetry(notification: NotificationState): boolean
//      Returns true only if status is "failed" and retryCount < 3
//
//   c) getDeliveryTime(notification: NotificationState): Date | null
//      Returns the delivery timestamp if delivered, null otherwise

type NotificationState = /* TODO: define discriminated union here */
  never; // replace this

// TODO: Implement getNotificationStatusText
// TODO: Implement canRetry
// TODO: Implement getDeliveryTime


// 🟢 CHALLENGE 2 — Type guard library (15 min)
// ─────────────────────────────────────────────
// Write type guard functions (value is T pattern) for:
//   a) isString(value: unknown): value is string
//   b) isNumber(value: unknown): value is number
//   c) isUser(value: unknown): value is User
//   d) isHealthMetricArray(value: unknown): value is HealthMetric[]
//      (must check that it's an array AND every element is a valid HealthMetric)
//
// These are genuinely useful in production — e.g., validating API responses
// before using the data.

// TODO: Implement type guards


// 🟡 CHALLENGE 3 — Pipeline result type (25 min)
// ─────────────────────────────────────────────────
// Model the result of each stage in a data processing pipeline.
// Each stage either passes data forward or fails with an error.
//
// StageResult<T> should be a discriminated union:
//   success: { ok: true; data: T; processingMs: number }
//   failure: { ok: false; stage: string; error: string; partialData?: Partial<T> }
//   skipped: { ok: "skipped"; reason: string }  ← stage was intentionally skipped
//
// Then write:
//   a) chainStages<T, U>(
//        result: StageResult<T>,
//        nextStage: (data: T) => StageResult<U>
//      ): StageResult<U>
//      Chains two stages — if the first fails/skips, passes that through.
//      Only calls nextStage if the first stage succeeded.
//
//   b) collectResults<T>(results: StageResult<T>[]): {
//        succeeded: T[];
//        failed: { stage: string; error: string }[];
//        skipped: number;
//      }

type StageResult<T> = /* TODO */
  never;

// TODO: Implement chainStages
// TODO: Implement collectResults


// 🔴 CHALLENGE 4 — Full event-driven state machine (30 min)
// ──────────────────────────────────────────────────────────
// Build a typed state machine for a health data sync process.
// The machine has these states:
//   idle → connecting → syncing → processing → complete → idle (loops)
//   Any state can transition to: error (with retry)
//   error → retrying → (back to the failed state's previous state)
//
// Each state has specific data:
//   idle: { lastSyncAt: Date | null }
//   connecting: { deviceId: string; attempt: number }
//   syncing: { deviceId: string; progress: number; totalRecords: number }
//   processing: { records: HealthMetric[]; processedCount: number }
//   complete: { syncedAt: Date; count: number; insights: string[] }
//   error: { fromState: string; message: string; retryAt: Date }
//   retrying: { attempt: number; maxAttempts: number }
//
// Write:
//   a) The SyncMachineState discriminated union
//   b) A transition function that validates legal transitions
//      (e.g., you can't go from idle directly to processing)
//   c) A getSyncProgress(state: SyncMachineState): number (0–100)
//
// BONUS: Add a history array to track state transitions

// TODO: Implement the full state machine

export {};
