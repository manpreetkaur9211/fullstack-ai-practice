// =============================================================================
// ADVANCED TYPESCRIPT — Mapped Types, Conditional Types, Template Literals
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// These are the patterns that separate senior TypeScript engineers from mid-level.
// You don't need to use them every day, but you need to UNDERSTAND them because:
//   - You'll encounter them in large codebases
//   - Interviewers use them to distinguish senior candidates
//   - They're the foundation for complex utility types (like Zod, React's types)
//
// ── MAPPED TYPES ─────────────────────────────────────────────────────────────
//
// A mapped type transforms every property in an existing type.
// Syntax: { [K in keyof T]: NewType }


interface HealthMetric {
  id: string;
  userId: string;
  heartRate: number;
  steps: number;
  sleepHours: number;
  recordedAt: Date;
}

// Make every property a getter function instead of a value
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// Getters<HealthMetric> becomes:
// { getId: () => string; getUserId: () => string; getHeartRate: () => number; ... }

// Make every property an observable (with .subscribe/.getValue)
type Observable<T> = {
  [K in keyof T]: {
    getValue: () => T[K];
    subscribe: (listener: (value: T[K]) => void) => () => void;
  };
};

// Filter keys — keep only keys whose values extend a certain type
type OnlyStrings<T,V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};
// OnlyStrings<HealthMetric> → { id: string; userId: string }

// ── CONDITIONAL TYPES ────────────────────────────────────────────────────────
//
// TypeScript can make decisions at the TYPE level based on type relationships.
// Syntax: T extends U ? TrueType : FalseType

// Unwrap a Promise
type Awaited2<T> = T extends Promise<infer U> ? U : T;
// Awaited2<Promise<string>> → string
// Awaited2<string>          → string (not a promise, passes through)

// Unwrap array items
type UnpackArray<T> = T extends Array<infer U> ? U : T;
// UnpackArray<User[]>  → User
// UnpackArray<string>  → string

// Get the first element type of a tuple
type Head<T extends unknown[]> = T extends [infer First, ...unknown[]] ? First : never;
// Head<[string, number, boolean]> → string

// Distribute over union types
// TypeScript automatically distributes conditional types over unions:
type ToArray<T> = T extends unknown ? T[] : never;
// ToArray<string | number> = string[] | number[]  (NOT (string | number)[])

// ── TEMPLATE LITERAL TYPES ───────────────────────────────────────────────────
//
// TypeScript can construct string literal types at the type level.
// This is incredibly powerful for typed API routes, event names, CSS properties.

type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type APIRoute   = "/users" | "/metrics" | "/notifications" | "/auth";

// Create all valid API endpoint strings
type Endpoint = `${HTTPMethod} ${APIRoute}`;
// "GET /users" | "POST /users" | "PUT /users" | ... (20 combinations)

const validEndpoint: Endpoint = "GET /users";      // ✅
// const invalid: Endpoint = "FETCH /users";        // ❌ TypeScript error

// Typed CSS-in-JS property names
type CSSProperty = "margin" | "padding" | "border";
type Direction    = "top" | "right" | "bottom" | "left";
type CSSDirectional = `${CSSProperty}-${Direction}`;
// "margin-top" | "margin-right" | ... | "border-left" (12 combinations)

// Typed event names for a typed event emitter
type EventName<T extends string> = `on${Capitalize<T>}`;
// EventName<"click"> → "onClick"
// EventName<"change"> → "onChange"

// ── INFER KEYWORD ─────────────────────────────────────────────────────────────
// `infer` lets you capture a type from inside a conditional type

// Extract the resolved type from any async function
type AsyncReturnType<T > =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

async function fetchMetrics(): Promise<HealthMetric[]> {
  return [];
}
type MetricsResult = AsyncReturnType<typeof fetchMetrics>; // HealthMetric[]

// Extract parameter types from a function
type FirstParameter<T > =
  T extends (first: infer P, second : infer Q, ...rest: unknown[]) => unknown ? P&Q : never;

function saveMetric(metric: HealthMetric, userId: string): void {}
type SaveMetricFirstParam = FirstParameter<typeof saveMetric>; // HealthMetric


// =============================================================================
// CHALLENGES
// =============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  isActive: boolean;
  createdAt: Date;
}

interface APIConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  debug: boolean;
  apiKey: string;
}

// 🟢 CHALLENGE 1 — Mapped type transformations (20 min)
// ───────────────────────────────────────────────────────
// a) Write Mutable<T> — the opposite of Readonly. Removes readonly from all properties.
//    Test: Mutable<Readonly<User>> should equal User
//
// b) Write NullableValues<T> — makes every value T[K] | null
//    NullableValues<User> → { id: string | null; name: string | null; ... }
//
// c) Write EventHandlers<T> — for each key K in T, creates a handler:
//    `on${Capitalize<K>}Change: (newValue: T[K], oldValue: T[K]) => void`
//    EventHandlers<{ name: string; count: number }> →
//    { onNameChange: (n: string, o: string) => void; onCountChange: (n: number, o: number) => void }
//
// d) Write Stringify<T> — converts all primitive values to string, keeps objects as-is
//    Stringify<User> → { id: string; name: string; age: string; isActive: string; ... }

// TODO: type Mutable<T> = ...
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
type User2=Mutable<Readonly<User>>; // should equal User
// true
// TODO: type NullableValues<T> = ...
type NullableValues<T> = {
  [K in keyof T]: T[K] | null;
};

type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (newValue: T[K], oldValue: T[K]) => void;
};


// TODO: type Stringify<T> = ...
type Stringify<T> = {
  [K in keyof T]: T[K] extends string | number | boolean ? string : T[K];
};


// 🟢 CHALLENGE 2 — Template literal routes (15 min)
// ───────────────────────────────────────────────────
// You're building a typed API client. Define a type system for routes.
//
// a) Create APIVersion = "v1" | "v2"
//    Create Resource = "users" | "metrics" | "notifications" | "insights"
//    Create VersionedRoute = `/api/${APIVersion}/${Resource}`
//    How many combinations are there?
//
// b) Create a RouteWithId type: adds "/:id" to a VersionedRoute
//    e.g., "/api/v1/users/:id"
//
// c) Create a function with correct typing:
//    function buildRoute(version: APIVersion, resource: Resource, id?: string): VersionedRoute | RouteWithId
//    When id is provided → RouteWithId, otherwise → VersionedRoute
//
// d) Write a typed HTTP client interface:
//    interface TypedClient {
//      get(route: VersionedRoute | RouteWithId): Promise<unknown>
//      post(route: VersionedRoute, body: unknown): Promise<unknown>
//      // etc.
//    }

// TODO: Implement all of the above
type APIVersion = "v1" | "v2";
type Resource = "users" | "metrics" | "notifications" | "insights";
type VersionedRoute = `/api/${APIVersion}/${Resource}`;
type RouteWithId = `${VersionedRoute}/${string}`;

function buildRoute(version: APIVersion, resource: Resource, id?: string): VersionedRoute | RouteWithId {
  return id ? `/api/${version}/${resource}/${id}` : `/api/${version}/${resource}`;
}

// 🟡 CHALLENGE 3 — Deep type utilities (25 min)
// ────────────────────────────────────────────────
// a) DeepPartial<T> — like Partial but applies recursively
//    DeepPartial<{ a: { b: { c: string } } }> → { a?: { b?: { c?: string } } }
//    Note: be careful with arrays and primitives — only recurse on plain objects




//
// b) FlattenObject<T> — flattens nested objects to dot-notation keys
//    FlattenObject<{ user: { id: string; name: string } }> →
//    { "user.id": string; "user.name": string }
//    Hint: use template literals + recursion + infer
//
// c) Write a type-level `Diff<A, B>` that returns keys present in A but not B:
//    Diff<User, { id: string; name: string }> → "email" | "age" | "isActive" | "createdAt"

type DeepPartial<T>={
  [K in keyof T ]?:T[K] extends object? DeepPartial<T[K]>: T[K]
}

// TODO: type FlattenObject<T, Prefix extends string = ""> = ...  (hint: use recursive conditionals)
type FlattenObject<T, Prefix extends string = ""> = {
  [K in keyof T &string]: T[K] extends object
    ? FlattenObject<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`
}[keyof T&string]
type FlattenedUser = FlattenObject<{ age:number,user: { id: string; name: string } }>;


// TODO: type Diff<A, B> = ...
type Diff<A, B> = Exclude<keyof A, keyof B>;
type UserDiff = Diff<User, { id: string; name: string }>; // "email" | "age" | "isActive" | "createdAt"       

// 🔴 CHALLENGE 4 — Type-safe query builder (35 min)
// ───────────────────────────────────────────────────
// Build a type-safe query builder that mirrors real ORM/query patterns.
// This is a real interview question for senior positions.

interface QueryBuilder<T> {
  select<K extends keyof T>(...fields: K[]): QueryBuilder<Pick<T, K>>
  where(predicate: Partial<T>): QueryBuilder<T>
  orderBy<K extends keyof T>(field: K, direction?: "asc" | "desc"): QueryBuilder<T>
  limit(n: number): QueryBuilder<T>
  execute(): Promise<T[]>
}
//
// The clever part: after calling .select("id", "name"), the returned QueryBuilder
// should be typed as QueryBuilder<Pick<User, "id" | "name">> — not QueryBuilder<User>.
// So .execute() returns Promise<{ id: string; name: string }[]>, not Promise<User[]>.
//
// Example:
//   const results = await createQuery<User>()
//     .select("id", "name", "email")
//     .where({ isActive: true })
//     .orderBy("name", "asc")
//     .limit(10)
//     .execute();
//   // results is { id: string; name: string; email: string }[]

// TODO: Implement QueryBuilder<T>
// TODO: Implement createQuery<T>(): QueryBuilder<T>
// TODO: Test with User and HealthMetric types

export {};
