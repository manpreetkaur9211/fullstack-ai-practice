// =============================================================================
// TYPESCRIPT UTILITY TYPES — Concept + Challenges
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// TypeScript ships with built-in "utility types" that transform existing types
// into new ones. They are used constantly in professional codebases.
//
// Senior engineers are expected to:
//   1. Know all the common utility types by heart
//   2. Know WHEN to reach for each one
//   3. Be able to build CUSTOM utility types using mapped types + conditionals
//
// ── BUILT-IN UTILITY TYPES ───────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user" | "guest";
  createdAt: Date;
  updatedAt: Date;
}

// ── Partial<T> ───────────────────────────────────────────────────────────────
// Makes ALL fields optional. Use for: PATCH requests, update payloads,
// form state that is partially filled.

type UserUpdatePayload = Partial<User>;
// { id?: string; name?: string; email?: string; ... }

function updateUser(id: string, changes: Partial<User>): User {
  // Only the fields you pass will be updated. TypeScript enforces this.
  return {} as User; // placeholder
}
updateUser("123", { name: "New Name" });       // ✅ Only updating name
updateUser("123", { role: "admin" });          // ✅ Only updating role
// updateUser("123", { unknown: "field" });    // ❌ TypeScript error

// ── Required<T> ──────────────────────────────────────────────────────────────
// Makes ALL fields required (removes ?). Use when you've validated
// all optional fields and know they exist.

interface DraftPost {
  title?: string;
  body?: string;
  authorId?: string;
  publishedAt?: Date;
}

type PublishedPost = Required<DraftPost>;
// { title: string; body: string; authorId: string; publishedAt: Date }

// ── Readonly<T> ──────────────────────────────────────────────────────────────
// Makes all fields readonly. Use for: config objects, constants,
// Redux state (should never be mutated directly).

const CONFIG: Readonly<{ apiUrl: string; timeout: number }> = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
};
// CONFIG.apiUrl = "other"; // ❌ TypeScript error: Cannot assign to read-only property

// ── Pick<T, K> ───────────────────────────────────────────────────────────────
// Creates a new type with ONLY the specified keys.
// Use for: public-facing types, response shaping, DTO patterns.

type UserPublicProfile = Pick<User, "id" | "name" | "role">;
// { id: string; name: string; role: "admin" | "user" | "guest" }
// No password, no email exposed ✅

// ── Omit<T, K> ───────────────────────────────────────────────────────────────
// Creates a new type with specified keys REMOVED.
// Use for: removing auto-generated fields before creation, removing sensitive data.

type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;
// { name: string; email: string; password: string; role: ... }
// You don't provide id/createdAt when creating — the DB generates them ✅

// ── Record<K, V> ─────────────────────────────────────────────────────────────
// Creates a type with keys K and values V. Use for: maps, lookup tables,
// typed dictionaries, grouped data.

type UserById = Record<string, User>;
// { [userId: string]: User }

type PermissionMap = Record<User["role"], string[]>;
// { admin: string[]; user: string[]; guest: string[] }

const permissions: PermissionMap = {
  admin: ["read", "write", "delete"],
  user:  ["read", "write"],
  guest: ["read"],
};

// ── Exclude<T, U> and Extract<T, U> ─────────────────────────────────────────
// Exclude: remove types from a union
// Extract: keep only types from a union

type AllRoles   = "admin" | "user" | "guest" | "banned";
type ActiveRole = Exclude<AllRoles, "banned">;
// "admin" | "user" | "guest"

type AdminOnly = Extract<AllRoles, "admin" | "super-admin">;
// "admin" (only what's in BOTH unions)

// ── NonNullable<T> ───────────────────────────────────────────────────────────
// Removes null and undefined from a type.

type MaybeString  = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>; // string

// ── ReturnType<T> ────────────────────────────────────────────────────────────
// Extracts the return type of a function. Critical for typing the OUTPUT
// of functions without duplicating types.

async function fetchUserById(id: string) {
  return { id, name: "Alice", email: "alice@example.com", role: "user" as const };
}

type FetchedUser = Awaited<ReturnType<typeof fetchUserById>>;
// { id: string; name: string; email: string; role: "user" }
// You get perfect typing without writing the type manually ✅

// ── Parameters<T> ────────────────────────────────────────────────────────────
// Extracts the parameter types of a function as a tuple.

function createNotification(userId: string, message: string, priority: 1 | 2 | 3): void {
  console.log(`[P${priority}] ${userId}: ${message}`);
}

type NotificationParams = Parameters<typeof createNotification>;
// [string, string, 1 | 2 | 3]

// Useful for: wrapping functions, middleware, logging
function withLogging<T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T): T {
  return ((...args: Parameters<T>) => {
    console.log("Calling with:", args);
    return fn(...args);
  }) as T;
}

// =============================================================================
// CHALLENGES
// =============================================================================

// ── Supporting types ─────────────────────────────────────────────────────────

interface HealthMetric {
  id: string;
  userId: string;
  type: "heart_rate" | "steps" | "sleep_hours" | "calories" | "blood_pressure";
  value: number;
  unit: string;
  recordedAt: Date;
  deviceId: string;
  isAnomalous: boolean;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "alert" | "info" | "reminder" | "achievement";
  read: boolean;
  sentAt: Date;
  readAt: Date | null;
  metadata: Record<string, unknown>;
}

interface APIError {
  code: string;
  message: string;
  details: string[];
  timestamp: Date;
}

// =============================================================================

// 🟢 CHALLENGE 1 — Type transformations (15 min)
// ────────────────────────────────────────────────
// Using ONLY built-in utility types (no manual interface writing), create:
//
// a) CreateMetricInput — what you'd send to POST /metrics
//    (no id, no recordedAt, no isAnomalous — those are server-generated)
//
// b) MetricSummary — a lightweight version for list views
//    (only: id, userId, type, value, unit, recordedAt)
//
// c) UpdateNotificationPayload — for PATCH /notifications/:id
//    (all fields optional EXCEPT id which must always be present)
//    Hint: Combine Pick and Partial
//
// d) ReadNotification — a notification that has definitely been read
//    (readAt should be Date, not Date | null)

// TODO: type CreateMetricInput = ...
// TODO: type MetricSummary = ...
// TODO: type UpdateNotificationPayload = ...
// TODO: type ReadNotification = ...


// 🟢 CHALLENGE 2 — Record-based lookup tables (15 min)
// ──────────────────────────────────────────────────────
// a) Create a MetricThresholds type using Record that maps each metric type
//    to an object with { min: number; max: number; unit: string }
//
// b) Create a const `METRIC_THRESHOLDS: MetricThresholds` with real health values:
//    heart_rate: 40–200 bpm
//    steps: 0–80000 steps
//    sleep_hours: 0–24 hours
//    calories: 0–10000 kcal
//    blood_pressure: 60–180 mmHg
//
// c) Write a function `isMetricAnomalous(metric: HealthMetric): boolean`
//    that uses METRIC_THRESHOLDS to check if the value is out of range

// TODO: type MetricThresholds = ...
// TODO: const METRIC_THRESHOLDS: MetricThresholds = ...
// TODO: function isMetricAnomalous(metric: HealthMetric): boolean


// 🟡 CHALLENGE 3 — Build your own utility types (25 min)
// ────────────────────────────────────────────────────────
// Implement these custom utility types using mapped types and conditionals.
// These come up in senior TypeScript interviews.
//
// a) DeepReadonly<T> — like Readonly but applies recursively to nested objects
//    const config: DeepReadonly<Config> = { db: { host: "localhost" } };
//    config.db.host = "other"; // ❌ TypeScript error (regular Readonly wouldn't catch this)
//
// b) Nullable<T> — makes all fields T | null
//    Useful for representing "loaded but empty" state
//
// c) KeysOfType<T, V> — returns a union of keys whose values extend type V
//    KeysOfType<User, string> → "id" | "name" | "email" | "password"
//    KeysOfType<User, Date>   → "createdAt" | "updatedAt"
//
// d) Optional<T, K extends keyof T> — makes ONLY specified keys optional,
//    leaving the rest required. (The opposite of what Pick+Partial does)
//    Optional<User, "role" | "updatedAt"> → User but role and updatedAt are optional

// TODO: type DeepReadonly<T> = ...
// TODO: type Nullable<T> = ...
// TODO: type KeysOfType<T, V> = ...
// TODO: type Optional<T, K extends keyof T> = ...


// 🟡 CHALLENGE 4 — API response type system (20 min)
// ─────────────────────────────────────────────────────
// Build a fully typed API response system for a health dashboard.
// Every endpoint returns one of these shapes:
//
//   Success<T>: { success: true; data: T; meta: { requestId: string; timing: number } }
//   Failure:    { success: false; error: APIError }
//   ApiResult<T> = Success<T> | Failure
//
// Then write these typed endpoint response types:
//   GetMetricsResponse      = ApiResult<HealthMetric[]>
//   GetNotificationsResponse = ApiResult<Notification[]>
//   CreateMetricResponse    = ApiResult<HealthMetric>
//
// Then write a type-safe handler:
//   function handleResponse<T>(result: ApiResult<T>,
//     onSuccess: (data: T) => void,
//     onError: (error: APIError) => void
//   ): void
//
// Inside handleResponse, TypeScript should NARROW the type — after checking
// result.success === true, TypeScript should know result is Success<T>

// TODO: Define Success<T>, Failure, ApiResult<T>
// TODO: Define the three response types
// TODO: Implement handleResponse


// 🔴 CHALLENGE 5 — Typed configuration builder (30 min)
// ──────────────────────────────────────────────────────
// Build a type-safe configuration system for the health data pipeline.
// This is a real pattern used in enterprise apps.
//
// Requirements:
//   1. A PipelineConfig interface with sections: input, processing, output, ai
//   2. A ConfigBuilder class with a fluent API:
//      const config = new ConfigBuilder()
//        .setInput({ source: "websocket", batchSize: 100 })
//        .setProcessing({ validateAnomalies: true, aggregateWindow: 60 })
//        .setAI({ model: "claude-3-5-sonnet-20241022", maxTokens: 1024 })
//        .setOutput({ destination: "database", format: "json" })
//        .build();
//
//   3. The .build() method should return a Readonly<Required<PipelineConfig>>
//      and throw if any required section is missing
//
//   4. Add a ValidatedConfig type that proves all sections are present —
//      use Required<PipelineConfig> and verify TypeScript catches missing sections

// TODO: Define PipelineConfig interface
// TODO: Implement ConfigBuilder class with fluent API
// TODO: Test that TypeScript errors when required fields are missing

export {};
