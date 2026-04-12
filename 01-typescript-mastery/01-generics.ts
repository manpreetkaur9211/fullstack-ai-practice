// =============================================================================
// TYPESCRIPT GENERICS — Concept + Challenges
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// Generics let you write code that works with multiple types while keeping
// full type safety. Without generics, you'd have to either:
//   (a) Write the same function 10 times for 10 types, or
//   (b) Use `any` — which destroys all type safety
//
// Generics give you a "type variable" — a placeholder that TypeScript fills
// in based on how the function is called.
//
// WHY THIS COMES UP IN SENIOR INTERVIEWS:
//   - "Write a generic fetch function"
//   - "Type this API response wrapper"
//   - "Make this hook work with any data type"
//   - Generic hooks (useFetch<User>, useFetch<Product[]>) are everywhere
//
// ── HOW IT WORKS ─────────────────────────────────────────────────────────────

import { aggregateMetrics } from "../04-ai-integration/04-health-data-pipeline/health-pipeline";

// 1. Basic generic function
function identity<T>(value: T): T {
  return value;
}
const num = identity<number>(42); // T is explicitly number
const str = identity("hello"); // T is inferred as string
const arr = identity([1, 2, 3]); // T is inferred as number[]

// 2. Generic with constraint — T must have certain properties
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}
getLength("hello"); // ✅ string has .length
getLength([1, 2, 3]); // ✅ array has .length
// getLength(42);       // ❌ TypeScript error: number has no .length

// 3. Generic interface — the backbone of typed API responses
interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
  timestamp: string;
}

// Now you can type ANY API response:
type UserResponse = ApiResponse<User>;
type ProductResponse = ApiResponse<Product[]>;
type EmptyResponse = ApiResponse<null>;

// 4. Multiple type parameters
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 } as T & U;
}

const merged = merge({ name: "Manpreet" }, { role: "Engineer" });
// TypeScript knows merged has both .name and .role ✅

// 5. Generic class — a typed event emitter pattern
class EventBus<T> {
  private listeners: Array<(data: T) => void> = [];

  on(listener: (data: T) => void): void {
    this.listeners.push(listener);
  }

  emit(data: T): void {
    this.listeners.forEach((listener) => listener(data));
  }
}

// Usage — fully typed:
const userBus = new EventBus<{ userId: string; action: string }>();
userBus.on((event) => {
  console.log(event.userId); // TypeScript knows this exists ✅
});

// ── REAL-WORLD PATTERN — Generic useFetch hook ────────────────────────────
//
// This is the most common pattern you'll see in React codebases.
// The hook works with any data type — User, Product, HealthData, etc.

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// In a real React project this would use useState/useEffect.
// Shown here as pure TypeScript for the concept:
async function fetchData<T>(url: string): Promise<FetchState<T>> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: T | null = (await response.json()) as T | null;
    return { data, loading: false, error: null };
  } catch (err) {
    return { data: null, loading: false, error: (err as Error).message };
  }
}

// Consumer knows exactly what shape data will be:
// const { data } = await fetchData<User[]>("/api/users");
// data[0].name  ← TypeScript autocompletes this ✅

// ── SUPPORTING TYPES (used in challenges below) ───────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  createdAt: Date;
}

interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

// =============================================================================
// CHALLENGES
// =============================================================================
//
// Work through these in order. Each builds on the previous.
// Estimated time: 60–90 minutes total.
// Run with: npx ts-node 01-typescript-mastery/01-generics.ts
//
// =============================================================================

// 🟢 CHALLENGE 1 — Generic filter function (15 min)
// ─────────────────────────────────────────────────
// Write a generic function `filterBy` that:
//   - Takes an array of type T[]
//   - Takes a key of T (keyof T) and a value to match
//   - Returns T[] with only items where item[key] === value
//
// Usage should work like this:
//   filterBy(users, "role", "admin")    → User[]  (only admins)
//   filterBy(products, "inStock", true) → Product[] (only in-stock)
//
// Hint: The constraint is T[K] to ensure the value type matches the key type

function filterBy<T, K extends keyof T>(items: T[], key: K, value: T[K]): T[] {
  // TODO: implement this
  return items.filter((item) => item[key] === value);
}

// Test your implementation:
const users: User[] = [
  {
    id: "1",
    name: "Alice",
    email: "a@b.com",
    role: "admin",
    createdAt: new Date(),
  },
  {
    id: "2",
    name: "Bob",
    email: "b@b.com",
    role: "user",
    createdAt: new Date(),
  },
];
console.log(filterBy(users, "role", "admin")); // Should return [Alice]

// 🟢 CHALLENGE 2 — Generic paginated response (15 min)
// ──────────────────────────────────────────────────────
// Create a generic interface `PaginatedResponse<T>` that wraps a list of items
// with pagination metadata. Real APIs return this shape constantly.
//
// It should contain:
//   - items: T[]
//   - pagination: { page, pageSize, total, totalPages, hasNext, hasPrev }
//   - meta: { requestId: string; cachedAt: string | null }
//
// Then write a function `createPaginatedResponse<T>` that:
//   - Takes items: T[], page: number, pageSize: number, total: number
//   - Returns a PaginatedResponse<T> with all fields correctly calculated

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta: {
    requestId: string;
    cachedAt: string | null;
  };
}
function createPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    meta: {
      requestId: crypto.randomUUID(),
      cachedAt: null,
    },
  };
}

const products: Product[] = [
  { id: "p1", name: "Laptop", price: 999, inStock: true },
  { id: "p2", name: "Phone", price: 499, inStock: false },
  { id: "p3", name: "Tablet", price: 299, inStock: true },
];
// Test:
const result = createPaginatedResponse<Product>(products, 1, 10, 47);
// result.pagination.totalPages should be 5
console.log(result.pagination.totalPages); // Should log 5
//  result.pagination.hasNext should be true
console.log(result.pagination.hasNext === true); // Should be true

// 🟡 CHALLENGE 3 — Generic repository pattern (20 min)
// ──────────────────────────────────────────────────────
// In enterprise apps, data access is abstracted into a "repository" class.
// Create a generic `Repository<T>` class with these methods:
//   - findById(id: string): T | undefined
//   - findAll(): T[]
//   - findWhere(predicate: (item: T) => boolean): T[]
//   - save(item: T): void   (upsert by id)
//   - delete(id: string): boolean
//
// Constraint: T must have an `id: string` field.
// Use: T extends { id: string }
//
// After implementing, instantiate:
//   const userRepo = new Repository<User>();
//   const productRepo = new Repository<Product>();

// TODO: Implement Repository<T> class here
class Repository<T extends { id: string }> {
  private items: T[] = [];

  findById(id: string): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  findAll(): T[] {
    return this.items;
  }

  findWhere(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  save(item: T): void {
    const index = this.items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      this.items[index] = item; // Update existing
    } else {
      this.items.push(item); // Add new
    }
  }

  delete(id: string): boolean {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }
}

const userRepo = new Repository<User>();
const productRepo = new Repository<Product>();

// 🟡 CHALLENGE 4 — Type-safe event system (20 min)
// ─────────────────────────────────────────────────
// Build a type-safe event bus where each event name maps to a specific
// payload type. This is a real pattern in large React apps.
//
// Define an EventMap type that maps event names to payload types:
// type AppEventMap = {
//   "user:login":  { userId: string; timestamp: Date }
//   "user:logout": { userId: string }
//   "data:update": { resource: string; count: number }
//   "error":       { message: string; code: number }
// }
//
// Then create a TypedEventBus<T extends Record<string, unknown>> class where:
//   - on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void
//   - emit<K extends keyof T>(event: K, payload: T[K]): void
//   - off<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void
//
// When you call bus.emit("user:login", { userId: "123", timestamp: new Date() })
// TypeScript should autocomplete the payload and error on wrong fields.

// TODO: Define AppEventMap here
//this generic class will allow to create new appevents in the type AppEventMap in future and also support any other userEventMap as well.
// This way we can have a single event bus that can handle multiple types of events without having to create separate event buses for each type of event.
type SharedEventMap = {
  error: { message: string; code: number };
  "data:update": { resource: string; count: number };
};
type AppEventMap = {
  "user:login": { userId: string; timestamp: Date };
  "user:logout": { userId: string };
} & SharedEventMap; // Merging with SharedEventMap to include the "error" event in AppEventMap
type SessionEventMap = {
  "session:start": { sessionId: string; timestamp: Date };
  "session:end": { sessionId: string };
} & SharedEventMap;
// TODO: Implement TypedEventBus<T> class here
class TypedEventBus<T extends Record<string, unknown>> {
  private listeners: { [K in keyof T]?: Array<(payload: T[K]) => void> } = {};
  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event]!.push(handler);
  }
  emit<K extends keyof T>(event: K, payload: T[K]): void {
    this.listeners[event]?.forEach((handler) => handler(payload));
  }

  off<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event]!.filter(
        (h) => h !== handler,
      );
    }
  }
  //
}

const appBus = new TypedEventBus<AppEventMap>();
const handleLogin = (payload: AppEventMap["user:login"]) => {
  console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
}
appBus.on("user:login", handleLogin); // ✅ Works
appBus.emit("user:login", { userId: "123", timestamp: new Date() }); // ✅ Works
appBus.off("user:login", handleLogin); // ✅ Works
appBus.emit("user:logout", { userId: "123" }); // ✅ no typescript error,Works but functionally doesn't work as no handler registred for user:logout event
appBus.emit("error", { message: "An error occurred", code: 500 }); // ✅ Works

const usersBus = new TypedEventBus<SessionEventMap>();
usersBus.on("session:start", (payload) => {
  console.log(payload.sessionId); // TypeScript knows this exists ✅
  console.log(payload.timestamp); // TypeScript knows this exists ✅
});
usersBus.emit("error", { message: "session error", code: 400 }); // ✅ Works

// 🔴 CHALLENGE 5 — Generic transform pipeline (30 min)
// ──────────────────────────────────────────────────────
// Build a Pipeline<TInput, TOutput> class that allows chaining transformations.
// This pattern is used in data processing and is directly relevant to your
// Yeyro health data pipeline work.
//
// const result = new Pipeline<HealthMetric[]>()
//   .pipe(validateMetrics)       // HealthMetric[] → HealthMetric[]
//   .pipe(aggregateByType)       // HealthMetric[] → AggregatedData
//   .pipe(generateInsights)      // AggregatedData → ProcessedInsight[]
//   .execute(rawHealthData);
//
// The challenge: each .pipe() step can CHANGE the output type.
// You'll need: pipe<TNext>(fn: (input: TCurrent) => TNext): Pipeline<TInput, TNext>
//
// Hint: You need to track the "current" output type as a third type parameter
// internally, and return a new Pipeline instance with the updated output type.

interface ProcessedInsight {
  type: string;
  message: string;
  severity: "info" | "warning" | "alert";
  value: number;
}
interface HealthMetric {
  userId: string;
  type: "heart_rate" | "steps" | "sleep_hours" | "calories";
  value: number;
  recordedAt: Date;
}
interface AggregatedData {
  [type: string]: {
    type: string;
    average: number;
    count: number;
  };
}

// TODO: Implement Pipeline<TInput, TOutput> class here
// TODO: Write the 3 transform functions: validateMetrics, aggregateByType, generateInsights
// TODO: Run the pipeline on sample HealthMetric data and log the result
class Pipeline<TInput, TOutput = TInput> {
  private steps: Array<(input: unknown) => unknown> = [];

  pipe<TNext>(fn: (input: TOutput) => TNext): Pipeline<TInput, TNext> {
    this.steps.push(fn as (input: unknown) => unknown);
    return this as unknown as Pipeline<TInput, TNext>;
  }

  execute(input: TInput): TOutput {
    return this.steps.reduce(
      (acc, step) => step(acc),
      input as unknown,
    ) as TOutput;
  }
}
function validateMetrics(data: HealthMetric[]): HealthMetric[] {
  // Simplified implementation for demonstration
  return data.filter((metric) => metric.value >= 0);
}
function aggregateByType(data: HealthMetric[]): AggregatedData {
  // Simplified implementation for demonstration
  return data.reduce((acc, metric) => {
    if (!acc[metric.type]) {
      acc[metric.type] = { type: metric.type, average: 0, count: 0 };
    }
    acc[metric.type].average += metric.value;
    acc[metric.type].count += 1;
    return acc;
  }, {} as AggregatedData);
}
function generateInsights(data: AggregatedData): ProcessedInsight[] {
  // Simplified implementation for demonstration
  return Object.values(data).map((agg) => ({
    type: agg.type,
    message: `Average ${agg.type} is ${agg.average / agg.count}`,
    severity: agg.average / agg.count > 100 ? "alert" : "info",
    value: agg.average / agg.count,
  }));
}

// Test the pipeline with sample data
const rawHealthData: HealthMetric[] = [
  { userId: "u1", type: "heart_rate", value: 80, recordedAt: new Date() },
  { userId: "u1", type: "steps", value: 10000, recordedAt: new Date() },
  { userId: "u2", type: "heart_rate", value: 120, recordedAt: new Date() },
  { userId: "u2", type: "sleep_hours", value: 6, recordedAt: new Date() },
];

const insights = new Pipeline<HealthMetric[]>()
  .pipe(validateMetrics)
  .pipe(aggregateByType)
  .pipe(generateInsights)
  .execute(rawHealthData);
export {};
console.log(insights); // Should log an array of ProcessedInsight objects with correct types
