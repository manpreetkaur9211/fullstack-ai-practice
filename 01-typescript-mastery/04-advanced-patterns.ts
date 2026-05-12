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

import { int } from "zod";


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


type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
type User2=Mutable<Readonly<User>>; // should equal User
// true

type NullableValues<T> = {
  [K in keyof T]: T[K] | null;
};

type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (newValue: T[K], oldValue: T[K]) => void;
};



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


type APIVersion = "v1" | "v2";
type Resource = "users" | "metrics" | "notifications" | "insights";
type VersionedRoute = `/api/${APIVersion}/${Resource}`;
type RouteWithId = `${VersionedRoute}/${string}`;

function buildRoute(version: APIVersion, resource: Resource, id?: string): VersionedRoute | RouteWithId {
  return id ? `/api/${version}/${resource}/${id}` : `/api/${version}/${resource}`;
}

interface TypedClient {
  get(route: VersionedRoute | RouteWithId): Promise<unknown>;
  post(route: VersionedRoute, body: unknown): Promise<unknown>;
  // etc.
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


// ─── WHAT I WROTE (WRONG) ────────────────────────────────────────────────────
//
// type FlattenObject<T, Prefix extends string = ""> = {
//   [K in keyof T & string]: T[K] extends object
//     ? FlattenObject<T[K], `${Prefix}${K}.`>
//     : `${Prefix}${K}`        // ← BUG: this emits the KEY NAME as a string literal,
// }[keyof T & string]          //   not the actual type T[K].
//
// The `[keyof T & string]` at the end indexes INTO the mapped type, turning it
// into a union of its VALUES. For leaf nodes the value is `\`${Prefix}${K}\`` —
// a string literal like "age" or "user.id" — not the property type (number, string).
// So FlattenedUser resolves to "age" | "user.id" | "user.name" — a string union,
// not the object { age: number; "user.id": string; "user.name": string }.
//
// ─── WHY IT'S WRONG ─────────────────────────────────────────────────────────
//
// A mapped type maps ONE input key to ONE output key. You can't fan out
// (turn one key into multiple keys). And indexing `[keyof T & string]` at the
// end distributes the mapped type into a UNION OF VALUES — losing the types.
//
// ─── THE FIX ────────────────────────────────────────────────────────────────
//
// Split into two separate mapped types and INTERSECT them:
//
//   Part 1 — Leaves:
//     Use key remapping (`as ... ? never : prefixedKey`) to emit only primitive
//     properties, renamed to their dot-notation key, with the real type T[K].
//
//   Part 2 — Nested objects:
//     For each object key K, recurse into FlattenObject<T[K], "K."> to get its
//     flat representation. Collect all results as a union, then use
//     UnionToIntersection to merge them back into a single flat object.
//
//   Part 1 & Part 2 are unioned together, then UnionToIntersection folds
//   everything into one intersection: { age: number } & { "user.id": string; "user.name": string }
//   = { age: number; "user.id": string; "user.name": string } ✅
//
// ─── UnionToIntersection EXPLAINED ──────────────────────────────────────────
//
// This exploits TypeScript's function parameter CONTRAVARIANCE.
// If TypeScript sees: (x: A) => void | (x: B) => void
// and must infer a single I for: (x: I) => void
// then I must satisfy BOTH — so I = A & B.
//
// (U extends unknown ? (x: U) => void : never)  ← distributes U into function params
//   extends (x: infer I) => void                ← infer the single param type
//   ? I : never                                 ← that inferred I is A & B

type UnionToIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type FlattenObject<T, Prefix extends string = ""> = UnionToIntersection<
  // Part 1: emit leaf properties with their prefixed key and correct type
  | { [K in keyof T & string as T[K] extends Record<string, unknown> ? never : `${Prefix}${K}`]: T[K] }
  // Part 2: for each nested object key, recurse — collect as union, then intersect
  | { [K in keyof T & string]: T[K] extends Record<string, unknown>
        ? FlattenObject<T[K], `${Prefix}${K}.`>
        : never
    }[keyof T & string]
>;

// Result: { age: number; "user.id": string; "user.name": string } ✅
type FlattenedUser = FlattenObject<{ age: number; user: { id: string; name: string } }>;



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

// ─── WHAT I WROTE (WRONG) ────────────────────────────────────────────────────
//
// async function createQuery<T>(): Promise<QueryBuilder<T>> {
//   return {};   ← empty object — doesn't satisfy the interface at all
// }
//
// const results = await createQuery<User>()  ← WRONG: can't chain here.
//   .select("id", "name", "email")           //   await gives QueryBuilder<User>,
//   .where({ isActive: true })               //   but you'd need to await FIRST,
//   ...                                      //   then chain. Won't compile.
//
// Also: .where({ isActive: true }) called AFTER .select("id","name","email")
//   After select(), T narrows to Pick<User,"id"|"name"|"email">.
//   isActive is no longer in T, so TypeScript correctly rejects this.
//
// ─── WHY IT'S WRONG ─────────────────────────────────────────────────────────
//
// 1. async factory breaks the fluent chain.
//    `await createQuery<User>()` returns `QueryBuilder<User>` — fine.
//    But you can't write `await createQuery<User>().select(...)` because
//    `createQuery<User>()` returns a Promise, and Promise has no `.select()`.
//    You'd have to: `const qb = await createQuery<User>(); const r = await qb.select(...).execute();`
//    That's ugly and not how fluent builders work.
//
// 2. Empty `{}` body doesn't implement QueryBuilder<T>.
//    TypeScript would error: missing properties select, where, orderBy, limit, execute.
//
// 3. .where() after .select() is correctly rejected.
//    This is actually the FEATURE working as designed — the type narrows.
//    The fix is to call .where() BEFORE .select() while T is still the full type.
//
// ─── THE FIX ────────────────────────────────────────────────────────────────
//
// createQuery is SYNCHRONOUS — only execute() is async.
// The factory holds an internal _data array. Each method returns a NEW
// createQuery() call wrapping the transformed data (immutable chain pattern).
// select() is the clever one: it projects each item to Pick<T, K> at runtime,
// and the return type QueryBuilder<Pick<T,K>> narrows what downstream methods accept.
// orderBy() uses `as any` — type safety is at the interface level (K extends keyof T),
// not at the runtime comparison level.
function createQuery<T>(initialData: T[] = []): QueryBuilder<T> {
  const _data: T[] = [...initialData];

  return {
    select<K extends keyof T>(...fields: K[]): QueryBuilder<Pick<T, K>> {
      const projected = _data.map(item => {
        const result = {} as Pick<T, K>;
        for (const field of fields) {
          result[field] = item[field];
        }
        return result;
      });
      return createQuery<Pick<T, K>>(projected);
    },

    where(predicate: Partial<T>): QueryBuilder<T> {
      const filtered = _data.filter(item =>
        (Object.keys(predicate) as Array<keyof T>).every(
          key => item[key] === predicate[key]
        )
      );
      return createQuery<T>(filtered);
    },

    orderBy<K extends keyof T>(field: K, direction: "asc" | "desc" = "asc"): QueryBuilder<T> {
      const sorted = [..._data].sort((a, b) => {
        // Type safety is at the interface level (K extends keyof T).
        // The actual comparison needs `as any` since T[K] is unknown at runtime.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aVal = a[field] as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bVal = b[field] as any;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === "asc" ? cmp : -cmp;
      });
      return createQuery<T>(sorted);
    },

    limit(n: number): QueryBuilder<T> {
      return createQuery<T>(_data.slice(0, n));
    },

    async execute(): Promise<T[]> {
      return [..._data];
    },
  };
}

// ─── CORRECT USAGE ───────────────────────────────────────────────────────────
// .where() BEFORE .select() — isActive exists on full User, not on the narrowed Pick.
// Async IIFE instead of top-level await — required for NodeNext CommonJS modules.
void (async () => {
  const results = await createQuery<User>()
    .where({ isActive: true })       // ✅ full User — isActive exists here
    .select("id", "name", "email")   // narrows T to Pick<User,"id"|"name"|"email">
    .orderBy("name", "asc")          // ✅ "name" is in the narrowed Pick
    .limit(10)
    .execute();                      // returns { id: string; name: string; email: string }[]
  console.log(results);
})();

export {};
