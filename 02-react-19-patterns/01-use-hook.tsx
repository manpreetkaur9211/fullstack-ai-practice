// =============================================================================
// REACT 19 — The use() Hook + New Data Fetching Patterns
// =============================================================================
//
// ── CONCEPT ──────────────────────────────────────────────────────────────────
//
// React 19 introduced the `use()` hook — one of the biggest changes to data
// fetching in React's history. It fundamentally changes how you handle async
// data and Context in components.
//
// WHY THIS MATTERS IN INTERVIEWS:
//   "What's new in React 19?" — you need a substantive answer, not just a list
//   "How does use() differ from useEffect + useState for data fetching?"
//   "What are React Server Components and how does use() work with them?"
//
// ── REACT 18 WAY (what everyone knows) vs REACT 19 WAY ──────────────────────
//
// BEFORE React 19: useEffect + useState pattern
// ─────────────────────────────────────────────

/*
// React 18 — the "old way" — problems: waterfall requests, loading boilerplate
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <div>{user?.name}</div>;
}
// Problems:
//   1. Loading state scattered across component
//   2. Race conditions if userId changes quickly
//   3. No built-in deduplication — each component fetches independently
//   4. Can't use this in a Server Component
*/

// REACT 19 WAY — use() hook
// ─────────────────────────

// The `use()` hook accepts a Promise and suspends the component until resolved.
// The Suspense boundary above it handles the loading state.
// An ErrorBoundary above handles errors.
// This moves loading/error state OUT of the component.

// Note: These examples show the pattern — in a real Next.js project
// you'd be in a .tsx file with React imports. The patterns below
// show the structural difference.

/*
// React 19 — the new way
// In a Server Component or with Next.js fetching:

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspends here until promise resolves
  // If promise rejects, nearest ErrorBoundary catches it
  return <div>{user.name}</div>;
}

// In the parent (Server Component):
function Page({ params }: { params: { userId: string } }) {
  const userPromise = fetchUser(params.userId); // Start fetch immediately
  // Don't await! Pass the promise to use() below.
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}

// WHY THIS IS BETTER:
// 1. userPromise starts fetching as soon as Page renders (no waterfall)
// 2. Loading state is handled by Suspense — not scattered in components
// 3. Components are simpler — just describe what to render
// 4. Works naturally with React Server Components
*/

// ── USE() WITH CONTEXT ────────────────────────────────────────────────────────
//
// React 19's use() can also read Context — like useContext, but with a key
// difference: use() can be called CONDITIONALLY (inside if statements).
// useContext cannot be called conditionally (React rules of hooks).

/*
const ThemeContext = createContext<"light" | "dark">("light");

function ConditionalThemeUser({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext); // ✅ use() can be inside conditionals!
    return <div className={theme}>Themed content</div>;
  }
  return <div>No theme</div>;
}
// With useContext, this would violate the Rules of Hooks.
*/

// ── NEW IN REACT 19: ACTIONS + useActionState ─────────────────────────────────
//
// React 19 introduces "Actions" — async functions that handle form submissions.
// useActionState replaces the old useState + event handler pattern for forms.

/*
// React 18 form pattern (lots of boilerplate):
function OldForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await submitForm(new FormData(e.target as HTMLFormElement));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={handleSubmit}>...</form>;
}

// React 19 with useActionState — clean and built-in:
import { useActionState } from "react";

function NewForm() {
  const [state, submitAction, isPending] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      try {
        await submitHealthMetric(formData);
        return { success: true, error: null };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    { success: false, error: null } // initial state
  );

  return (
    <form action={submitAction}>  // action prop (not onSubmit!)
      <input name="userId" />
      <input name="heartRate" type="number" />
      {state.error && <p>{state.error}</p>}
      <button disabled={isPending}>
        {isPending ? "Saving..." : "Save Metric"}
      </button>
    </form>
  );
}
*/

// ── useOptimistic — INSTANT UI UPDATES ───────────────────────────────────────
//
// Shows an optimistic (assumed-successful) value while async work happens.
// If the server call fails, it automatically reverts.

/*
import { useOptimistic } from "react";

function MetricList({ metrics }: { metrics: Metric[] }) {
  const [optimisticMetrics, addOptimistic] = useOptimistic(
    metrics,
    (currentMetrics, newMetric: Metric) => [...currentMetrics, newMetric]
  );

  async function addMetric(formData: FormData) {
    const newMetric = { id: Date.now().toString(), value: Number(formData.get("value")) };
    addOptimistic(newMetric);       // Immediately add to UI
    await saveMetricToServer(newMetric); // Actually save in background
    // If this fails, optimisticMetrics reverts to original
  }

  return (
    <ul>
      {optimisticMetrics.map(m => <li key={m.id}>{m.value}</li>)}
    </ul>
  );
}
*/

// =============================================================================
// CHALLENGES
// =============================================================================
//
// For these challenges you need a Next.js 15 project.
// Create one: npx create-next-app@latest react-19-practice --typescript --app
//
// Or run: npx create-next-app@latest --example with-app-router react-19-practice
//
// =============================================================================

// 🟢 CHALLENGE 1 — Replace useEffect with use() (30 min)
// ─────────────────────────────────────────────────────────
// In your Next.js project, create this component using the OLD pattern
// (useState + useEffect for data fetching), then REWRITE it using React 19's
// use() hook with Suspense.
//
// Component to build: MetricsDashboard
//   - Fetches a list of health metrics from a mock API
//   - Shows a loading spinner while fetching
//   - Shows an error message if fetch fails
//   - Renders a list of metrics when loaded
//
// OLD way: in /app/metrics/page-old.tsx — use useState + useEffect
// NEW way: in /app/metrics/page.tsx — use Server Component + use() + Suspense
//
// Notice what disappears in the new version (state variables, effects, loading booleans).
//
// Mock API function to use:
//   async function fetchMetrics(userId: string): Promise<Metric[]> {
//     await new Promise(r => setTimeout(r, 1000)); // Simulate latency
//     return [{ id: "1", type: "heart_rate", value: 72, recordedAt: new Date() }];
//   }

// 🟢 CHALLENGE 2 — Form with useActionState (30 min)
// ─────────────────────────────────────────────────────
// Build a "Log Health Metric" form using useActionState.
//
// Requirements:
//   - Fields: userId, metricType (dropdown), value (number), notes
//   - Server Action that validates input and "saves" it (console.log is fine)
//   - While pending: disable the submit button, show "Saving..."
//   - On success: show a green success message with the saved metric details
//   - On error (e.g., value out of range): show a red error message
//   - Form should RESET after successful submission
//
// Do NOT use useState for loading/error/success state.
// Let useActionState handle all of it.

// 🟡 CHALLENGE 3 — Optimistic metric deletion (40 min)
// ─────────────────────────────────────────────────────
// Build a MetricList component where:
//   - Metrics display with a "Delete" button each
//   - Clicking Delete immediately removes it from the UI (optimistic)
//   - The actual delete runs in the background (2-second delay to simulate)
//   - If delete fails (add a 20% random failure rate), the metric reappears
//   - Show a toast notification on failure: "Failed to delete metric"
//
// Use useOptimistic for the list, useActionState or startTransition for the action.
// This is a real pattern used in any list-with-actions UI.

// 🔴 CHALLENGE 4 — Parallel data fetching (45 min)
// ────────────────────────────────────────────────────
// Build a UserHealthDashboard that fetches 3 data sources in PARALLEL:
//   - User profile
//   - Today's metrics
//   - AI-generated insight (slow — 2 seconds)
//
// Requirements:
//   - All 3 fetches start simultaneously (no waterfall)
//   - Profile and metrics show as soon as they load
//   - Insight has its own Suspense boundary with a skeleton loader
//   - If insight fetch fails, show "Unable to generate insight" (not a crash)
//   - Add a "Refresh Insight" button that refetches only the AI insight
//
// Compare the Network tab: with parallel fetching, total time = slowest fetch.
// Without parallel fetching, total time = sum of all fetches.
// Document the timing difference in a comment.

export {};
