/**
 * FRONTEND ARCHITECTURE PATTERNS
 * Difficulty: ⭐⭐⭐ | Run: npx ts-node frontend-patterns.ts
 *
 * Topics covered:
 * 1. Feature-based folder structure (as TypeScript module interfaces)
 * 2. State management architecture (three-category model)
 * 3. Component architecture patterns (compound components, composition)
 * 4. Performance patterns (virtual scrolling simulation, memoisation)
 * 5. Error boundary design (typed error hierarchy)
 * 6. Module federation design (host/remote contract types)
 *
 * Note: Some patterns reference React/Next.js APIs by type only.
 * This file runs in plain Node.js — focus is on the architectural thinking,
 * not rendering. The types and patterns here map directly to real React code.
 */

// ─── 1. FEATURE-BASED ARCHITECTURE ──────────────────────────────────────────
/**
 * CONCEPT: Structure your application by FEATURE (vertical slices),
 * not by TYPE (components/, hooks/, utils/ at the root).
 *
 * Why: When a feature changes, all the files you need to touch are co-located.
 * You don't hunt across 6 top-level folders to change one user story.
 *
 * Structure:
 *   src/
 *     features/
 *       health-dashboard/
 *         components/       ← only used by this feature
 *         hooks/            ← only used by this feature
 *         api.ts            ← server calls for this feature
 *         types.ts          ← feature-specific types
 *         index.ts          ← public API (what other features can import)
 *       user-profile/
 *         ...
 *     shared/
 *       components/         ← design system, used by 2+ features
 *       hooks/              ← generic hooks (useDebounce, useLocalStorage)
 *       utils/              ← pure functions (formatDate, classNames)
 *       types/              ← global domain types
 */

// Public API of the health-dashboard feature (what index.ts would export)
export interface HealthDashboardAPI {
  // Only export what other features NEED. Keep internals private.
  HealthDashboard: React.ComponentType<{ userId: string }>;
  useLatestMetrics: (userId: string) => { data: HealthMetric[] | undefined; isLoading: boolean };
  HealthMetric: unknown; // re-export the type
}

// Architectural rule: other features NEVER import from inside a feature's folder:
// ✅  import { HealthDashboard } from '@/features/health-dashboard'
// ❌  import { MetricCard } from '@/features/health-dashboard/components/MetricCard'

// ─── Types needed throughout ────────────────────────────────────────────────
interface HealthMetric {
  id: string;
  userId: string;
  type: 'heart_rate' | 'steps' | 'glucose' | 'sleep_hours';
  value: number;
  unit: string;
  recordedAt: Date;
}

// Stub React type so this compiles without the full React package
declare namespace React {
  type ComponentType<P> = (props: P) => unknown;
}

// ─── 2. STATE MANAGEMENT ARCHITECTURE ───────────────────────────────────────
/**
 * CONCEPT: Three categories of state — never mix them.
 *
 * Category 1: SERVER STATE
 *   What: data that lives on the server (user profiles, metrics, posts)
 *   Tool: TanStack Query (React Query)
 *   Why: automatically handles caching, background refetch, stale-while-revalidate,
 *        optimistic mutations, and error/loading states
 *   Anti-pattern: DO NOT store server data in Zustand/Redux
 *
 * Category 2: GLOBAL UI STATE
 *   What: shared client-side state that affects multiple components
 *         (modal open/close, selected theme, sidebar collapsed)
 *   Tool: Zustand (lightweight, typed, no boilerplate)
 *   Rule: tiny slice — if it's only used in one feature, keep it local
 *
 * Category 3: URL STATE
 *   What: state that should survive page refresh and be shareable by URL
 *         (filters, search query, selected tab, page number)
 *   Tool: useSearchParams (Next.js App Router)
 *   Why: free persistence, bookmarkable, shareable, back-button works correctly
 */

// ── Server State (TanStack Query pattern) ────────────────────────────────────
// This is what your React hook would look like. Run-time logic in the type is illustrative.
interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Usage pattern for server state
const ServerStatePattern = {
  // ✅ Correct: server state stays in React Query
  useHealthMetrics: (userId: string): QueryResult<HealthMetric[]> => {
    // In real code: return useQuery({ queryKey: ['metrics', userId], queryFn: () => fetchMetrics(userId) })
    return { data: undefined, isLoading: false, isError: false, error: null, refetch: async () => {} };
  },

  useCreateMetric: (): MutationResult<HealthMetric, Omit<HealthMetric, 'id'>> => {
    // In real code: return useMutation({ mutationFn: createMetric, onSuccess: () => queryClient.invalidateQueries({queryKey: ['metrics']}) })
    return { mutate: () => {}, mutateAsync: async () => ({} as HealthMetric), isPending: false, isSuccess: false, isError: false };
  },
};

// ── Global UI State (Zustand pattern) ─────────────────────────────────────────
// Type-safe store slice — this is the shape Zustand would create
interface UIStore {
  // State
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  activeAlertIds: Set<string>;

  // Actions (co-located with state — this is the Zustand way)
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  dismissAlert: (id: string) => void;
  addAlert: (id: string) => void;
}

// The Zustand create() call would look like this:
const createUIStore = (): UIStore => ({
  theme: 'light',
  sidebarCollapsed: false,
  activeAlertIds: new Set(),
  setTheme: function(theme) { this.theme = theme; },
  toggleSidebar: function() { this.sidebarCollapsed = !this.sidebarCollapsed; },
  dismissAlert: function(id) { this.activeAlertIds.delete(id); },
  addAlert: function(id) { this.activeAlertIds.add(id); },
});

// ── URL State pattern ─────────────────────────────────────────────────────────
// This is the type contract for URL-controlled filter state
interface MetricFilters {
  type?: HealthMetric['type'];   // ?type=heart_rate
  from?: string;                  // ?from=2024-01-01
  to?: string;                    // ?to=2024-03-31
  page?: number;                  // ?page=2
}

function parseMetricFilters(searchParams: URLSearchParams): MetricFilters {
  return {
    type: (searchParams.get('type') as HealthMetric['type']) || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
  };
}

console.log('URL state parser test:', parseMetricFilters(new URLSearchParams('type=heart_rate&page=2')));

// ─── 3. COMPONENT ARCHITECTURE PATTERNS ────────────────────────────────────
/**
 * CONCEPT: Compound Components Pattern
 * Use when a component has multiple sub-parts that need to share state
 * without prop drilling.
 *
 * Classic example: <Select> → <Option>
 * Health example: <MetricCard> → <MetricCard.Header> + <MetricCard.Chart> + <MetricCard.Alert>
 *
 * How it works: parent creates a Context, children consume it
 */

interface MetricCardContext {
  metric: HealthMetric;
  isExpanded: boolean;
  toggle: () => void;
}

// In real React, you'd use createContext + useContext. Here we model the contract:
interface MetricCardComponent {
  // The parent — provides context
  (props: { metric: HealthMetric; children: unknown }): unknown;

  // Sub-components — consume context
  Header: (props: { showUnit?: boolean }) => unknown;
  Chart: (props: { days: number }) => unknown;
  AlertBadge: (props: { threshold: number }) => unknown;
}

// Usage (shows why this is better than a mega-component with many props):
// ✅ Compound — clear, composable
// <MetricCard metric={heartRate}>
//   <MetricCard.Header showUnit />
//   <MetricCard.Chart days={30} />
//   {isDoctor && <MetricCard.AlertBadge threshold={150} />}
// </MetricCard>
//
// ❌ Mega-props — hard to extend, unclear which props interact
// <MetricCard metric={heartRate} showUnit chartDays={30} showAlert={isDoctor} alertThreshold={150} />

// ─── 4. PERFORMANCE PATTERNS ────────────────────────────────────────────────
/**
 * CONCEPT: Virtual Scrolling
 * Render only the items visible in the viewport, not all 100,000.
 * Uses @tanstack/virtual in production.
 *
 * Core algorithm: calculate which items overlap the scroll viewport.
 */
interface VirtualItem {
  index: number;
  start: number;   // y offset from list top (pixels)
  end: number;     // y + height
  size: number;    // item height
}

function calculateVirtualItems(
  scrollTop: number,
  viewportHeight: number,
  totalItems: number,
  itemHeight: number,  // fixed height (variable requires pre-measurement)
  overscan: number = 3 // extra items above/below viewport to prevent flicker
): VirtualItem[] {
  const firstVisible = Math.floor(scrollTop / itemHeight);
  const lastVisible  = Math.ceil((scrollTop + viewportHeight) / itemHeight);

  const start = Math.max(0, firstVisible - overscan);
  const end   = Math.min(totalItems - 1, lastVisible + overscan);

  const items: VirtualItem[] = [];
  for (let i = start; i <= end; i++) {
    items.push({ index: i, start: i * itemHeight, end: (i + 1) * itemHeight, size: itemHeight });
  }
  return items;
}

// Simulate: 100,000 items, each 48px high, viewport 600px, user scrolled 10,000px
const virtualItems = calculateVirtualItems(10_000, 600, 100_000, 48);
console.log(`\nVirtual scrolling: rendered ${virtualItems.length} of 100,000 items`);
console.log(`First rendered: item #${virtualItems[0].index}, Last: item #${virtualItems[virtualItems.length - 1].index}`);
// Without virtual scrolling: 100,000 DOM nodes. With: ~17 nodes.

// ─── 5. ERROR BOUNDARY DESIGN ────────────────────────────────────────────────
/**
 * CONCEPT: Typed error hierarchy for consistent error handling
 * Real errors in production apps need to be categorised so you can:
 *   - Show the right UI (network error vs auth error vs validation error)
 *   - Log the right severity (network = warning, auth = error, crash = critical)
 *   - Decide whether to retry automatically
 */

class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isRetryable: boolean = false,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class NetworkError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, 'NETWORK_ERROR', statusCode, true); // network errors are retryable
    this.name = 'NetworkError';
  }
}

class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401, false); // auth errors should not auto-retry
    this.name = 'AuthError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, public readonly fields: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 422, false);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, false);
    this.name = 'NotFoundError';
  }
}

// Error boundary decision logic (what you'd use in your React error boundary's fallback)
function getErrorBoundaryAction(error: unknown): {
  displayMessage: string;
  shouldRetry: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  if (error instanceof AuthError) {
    return { displayMessage: 'Your session has expired. Please sign in again.', shouldRetry: false, severity: 'medium' };
  }
  if (error instanceof NetworkError && error.statusCode >= 500) {
    return { displayMessage: 'Something went wrong on our end. Retrying...', shouldRetry: true, severity: 'high' };
  }
  if (error instanceof NotFoundError) {
    return { displayMessage: 'This content no longer exists.', shouldRetry: false, severity: 'low' };
  }
  if (error instanceof ValidationError) {
    return { displayMessage: 'Please check your inputs and try again.', shouldRetry: false, severity: 'low' };
  }
  // Unknown error — treat as critical
  return { displayMessage: 'An unexpected error occurred. Our team has been notified.', shouldRetry: false, severity: 'critical' };
}

// Test the error boundary logic
const errors = [
  new AuthError('Token expired'),
  new NetworkError('Service unavailable', 503),
  new NotFoundError('Metric'),
  new ValidationError('Invalid input', { value: 'Must be a number' }),
  new Error('Something completely unexpected'),
];

console.log('\n--- Error Boundary Decision Logic ---');
errors.forEach(err => {
  const action = getErrorBoundaryAction(err);
  console.log(`${err.constructor.name}: severity=${action.severity}, retry=${action.shouldRetry}`);
  console.log(`  → "${action.displayMessage}"`);
});

// ─── 6. MODULE FEDERATION DESIGN (Micro-Frontend Contract) ──────────────────
/**
 * CONCEPT: Module Federation (Webpack 5)
 * Each remote app exposes components/hooks through a typed contract.
 * The shell app loads these at runtime — no build-time dependency.
 *
 * Use only when: 4+ teams, independent deployment cycles are critical.
 * Otherwise: monorepo with Turborepo is simpler and more maintainable.
 */

// The contract between shell and a remote feature app
// This lives in a shared-types package, consumed by both shell and remote
interface RemoteModule {
  // The remote must expose these exact exports
  mount: (container: Element, props: RemoteMountProps) => RemoteInstance;
}

interface RemoteMountProps {
  userId: string;
  authToken: string;
  onNavigate: (path: string) => void;  // shell controls navigation
  theme: 'light' | 'dark';
}

interface RemoteInstance {
  unmount: () => void;
  updateProps: (props: Partial<RemoteMountProps>) => void;
}

// Shell's loader — loads a remote module with fallback
async function loadRemoteModule(
  remoteName: string,
  exposedModule: string,
  fallback: () => RemoteModule
): Promise<RemoteModule> {
  try {
    // In real Webpack 5 Module Federation:
    // await __webpack_init_sharing__('default');
    // const container = window[remoteName];
    // await container.init(__webpack_share_scopes__.default);
    // const factory = await container.get(exposedModule);
    // return factory();

    // Simulating the load
    console.log(`Loading remote: ${remoteName}/${exposedModule}`);
    return fallback(); // in tests, use the fallback
  } catch (err) {
    console.warn(`Failed to load remote ${remoteName}, using fallback`);
    return fallback();
  }
}

// Test the loader
const mockRemote: RemoteModule = {
  mount: (container, props) => ({
    unmount: () => console.log('  Remote unmounted'),
    updateProps: (p) => console.log('  Remote props updated:', Object.keys(p)),
  }),
};

console.log('\n--- Module Federation Loader ---');
loadRemoteModule('health-dashboard', './HealthDashboard', () => mockRemote)
  .then(module => {
    const instance = module.mount(document.createElement('div') as unknown as Element, {
      userId: 'user-123',
      authToken: 'token-xyz',
      onNavigate: (path) => console.log('  Navigate to:', path),
      theme: 'light',
    });
    instance.updateProps({ theme: 'dark' });
    instance.unmount();
  });

// ─── CHALLENGES ─────────────────────────────────────────────────────────────
/**
 * CHALLENGE 1 ⭐⭐
 * Design the TypeScript types for a Zustand store that manages:
 * - A notification panel (open/closed, unread count, list of notifications)
 * - Actions: openPanel, closePanel, markAsRead(id), markAllRead, addNotification
 * - Computed: unreadCount (derived from the notifications list, not stored separately)
 * Constraint: unreadCount must always be consistent — never store it as separate state.
 *
 * CHALLENGE 2 ⭐⭐
 * Extend the VirtualItem calculator to support VARIABLE height items.
 * Items have different heights based on their content.
 * You need: measureItem(index) => height (simulated), then build a virtual list.
 * Hint: you'll need to pre-calculate cumulative offsets.
 *
 * CHALLENGE 3 ⭐⭐⭐
 * Design the TypeScript interface for a React Query + Optimistic UI pattern:
 * - `useToggleMetricFavourite(metricId)` returns a mutate function
 * - On mutate: immediately toggle the `isFavourite` flag in the cache (optimistic)
 * - On error: roll back to the previous value
 * - On success: do nothing (server value already applied by onSuccess invalidation)
 * Type the onMutate, onError, and onSuccess callbacks correctly.
 *
 * CHALLENGE 4 ⭐⭐⭐ (Architecture)
 * You're the tech lead at a health platform. The team is debating:
 * "Should we move to micro-frontends? We have 3 features: Dashboard, Analytics, Settings."
 * Write a 200-word architectural recommendation (as a comment) covering:
 * - Current team size (assume 8 engineers)
 * - The trade-offs of micro-frontends at this scale
 * - Your recommendation and the decision criteria for when to revisit
 * This simulates the kind of written communication senior engineers do via ADRs and RFCs.
 */
