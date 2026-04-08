# Next.js 15 — Server vs Client Components

## The Single Most Important Concept in Next.js App Router

The biggest mental shift in Next.js 15 is understanding **where your code runs**.

---

## The Rule (memorise this)

```
By default: ALL components are Server Components
To make a Client Component: add "use client" at the top of the file
```

That's it. The hard part is knowing *when* to add `"use client"`.

---

## What Each Type Can Do

| Feature | Server Component | Client Component |
|---------|-----------------|-----------------|
| `async/await` directly in component | ✅ | ❌ |
| Access database, file system, env vars | ✅ | ❌ |
| `useState`, `useEffect`, hooks | ❌ | ✅ |
| Event handlers (`onClick`, `onChange`) | ❌ | ✅ |
| Browser APIs (`window`, `localStorage`) | ❌ | ✅ |
| Stream/suspend with `use()` | ✅ | ✅ (limited) |
| Reduce bundle size (runs on server) | ✅ | ❌ |

---

## Decision Tree — "Should this be a Server or Client Component?"

```
Does it need useState or useEffect?         → Client
Does it need event handlers?                → Client
Does it need browser APIs?                  → Client
Does it use third-party library with hooks? → Client

Does it fetch data from a database?         → Server
Does it use secrets/env vars?               → Server
Does it need SEO (rendered HTML)?           → Server
Is it pure presentation with no interactivity? → Server
```

**Default to Server Components. Only add `"use client"` when you need to.**

---

## Pattern: Push Client Boundaries Down

**WRONG — unnecessarily client-side:**
```tsx
"use client"; // ❌ This makes the ENTIRE page a client component

export default async function MetricsPage() {
  const metrics = await fetchMetrics(); // This now runs on client, needs API call
  return (
    <div>
      <h1>My Metrics</h1>
      <MetricChart data={metrics} /> {/* Chart needs onClick handlers */}
    </div>
  );
}
```

**CORRECT — push the boundary to the interactive part only:**
```tsx
// page.tsx — Server Component (no "use client")
export default async function MetricsPage() {
  const metrics = await fetchMetrics(); // ✅ Runs on server, can access DB directly
  return (
    <div>
      <h1>My Metrics</h1>
      <MetricChart data={metrics} /> {/* Pass server data to client component */}
    </div>
  );
}

// MetricChart.tsx — Client Component
"use client";
export function MetricChart({ data }: { data: Metric[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <InteractiveChart data={data} onSelect={setSelected} />;
}
```

The Server Component fetches the data. Only the chart (which needs `useState`) is a Client Component. **Most of your code stays on the server.**

---

## Pattern: Server Actions

Server Actions are async functions that run on the server but are called from the client. They replace API Route Handlers for form submissions and mutations.

```tsx
// actions.ts — these run on the SERVER
"use server";

export async function saveMetric(formData: FormData) {
  const value = formData.get("value");
  // Direct database access — no HTTP request needed!
  await db.metrics.create({ data: { value: Number(value) } });
  revalidatePath("/metrics"); // Revalidate Next.js cache
}
```

```tsx
// MetricForm.tsx — Client Component
"use client";
import { saveMetric } from "./actions";
import { useActionState } from "react";

export function MetricForm() {
  const [state, action, pending] = useActionState(saveMetric, null);
  return (
    <form action={action}>
      <input name="value" type="number" />
      <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>
    </form>
  );
}
```

**Key insight:** `saveMetric` is called from the client but runs on the server. No API route needed. The form data crosses the network boundary automatically.

---

## Data Fetching Patterns in App Router

### Pattern 1: Fetch in Server Component (most common)
```tsx
// app/metrics/page.tsx
export default async function MetricsPage() {
  const metrics = await db.metrics.findMany(); // Direct DB access!
  return <MetricList metrics={metrics} />;
}
```

### Pattern 2: Parallel fetching (avoids waterfall)
```tsx
export default async function Dashboard() {
  // Start ALL fetches simultaneously — not sequential
  const [user, metrics, insights] = await Promise.all([
    fetchUser(),
    fetchMetrics(),
    fetchInsights(), // Even if this is slow, the others don't wait
  ]);
  return <DashboardLayout user={user} metrics={metrics} insights={insights} />;
}
```

### Pattern 3: Streaming with Suspense (progressive loading)
```tsx
export default async function Dashboard() {
  const userPromise = fetchUser();       // Start fetch, don't await
  const metricsPromise = fetchMetrics(); // Start fetch, don't await

  return (
    <div>
      {/* User loads fast — shows first */}
      <Suspense fallback={<UserSkeleton />}>
        <UserCard promise={userPromise} />
      </Suspense>

      {/* Metrics may be slower — shows independently */}
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsList promise={metricsPromise} />
      </Suspense>
    </div>
  );
}
```

---

## Challenges

### 🟢 Challenge 1 — Identify the mistake (15 min)
Look at this component. Find all the problems and explain why each is wrong:

```tsx
"use client";

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      {isEditing ? (
        <EditForm user={user} />
      ) : (
        <button onClick={() => setIsEditing(true)}>Edit</button>
      )}
    </div>
  );
}
```

Write out 3 problems and how you'd fix each.

---

### 🟢 Challenge 2 — Refactor to proper Server/Client split (30 min)
Take the broken component above and refactor it into:
- `UserPage` — Server Component that fetches the user from database
- `UserDisplay` — Server Component showing the user data
- `EditButton` — Client Component with the toggle behaviour
- `EditForm` — Client Component for editing

Draw the component tree showing what runs where.

---

### 🟡 Challenge 3 — Build a metrics dashboard with streaming (45 min)
Build `app/dashboard/page.tsx` that:
1. Fetches user profile (fast — 100ms mock)
2. Fetches today's metrics (medium — 500ms mock)
3. Fetches AI insight (slow — 2000ms mock)

Requirements:
- Use Suspense so profile shows first, then metrics, then insight
- Each section has a skeleton loader while waiting
- AI insight section has an independent error boundary
- The page should be fully visible within 200ms (profile shows immediately)
- Use `Promise.all` for profile + metrics (they don't depend on each other)
- Start the AI insight fetch in parallel with everything else

Measure: open Network tab and verify no waterfall (all 3 fetches start at the same time).

---

### 🔴 Challenge 4 — Cache + Revalidation strategy (45 min)
Next.js 15 has a built-in cache. By default, fetch() is NOT cached in Next.js 15.
You opt IN to caching. This is the opposite of Next.js 13/14.

Build a metrics page that demonstrates 3 caching strategies:

```tsx
// No cache (always fresh) — for real-time data
const liveData = await fetch("/api/live-metrics", { cache: "no-store" });

// Cache for 60 seconds (ISR-style) — for semi-static data
const recentData = await fetch("/api/daily-summary", {
  next: { revalidate: 60 }
});

// Cache until explicitly revalidated — for slow-changing data
const profileData = await fetch("/api/user-profile", {
  next: { tags: ["user-profile"] }
});
```

Then add a "Refresh Profile" button that calls `revalidateTag("user-profile")` via a Server Action.

Document in comments: which strategy would you use for each type of data in your Yeyro project, and why?
