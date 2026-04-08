/**
 * API DESIGN PATTERNS
 * Difficulty: ⭐⭐⭐ | Run: npx ts-node api-design-patterns.ts
 *
 * Topics covered:
 * 1. Consistent response envelope (data + meta + errors)
 * 2. Standardised error hierarchy with HTTP status codes
 * 3. Rate limiter implementations (Token Bucket + Sliding Window)
 * 4. Idempotency key middleware
 * 5. Cursor-based pagination
 * 6. API versioning middleware pattern
 */

// ─── 1. RESPONSE ENVELOPE ───────────────────────────────────────────────────
/**
 * Every API response follows the same shape.
 * Clients can always destructure { data, meta, errors } without checking the endpoint.
 */
interface ApiResponse<T> {
  data: T | null;
  meta: ResponseMeta;
  errors: ApiError[];
}

interface ResponseMeta {
  requestId: string;       // unique per request, used for log correlation
  timestamp: string;       // ISO 8601
  version: string;         // API version that handled this request
  pagination?: PaginationMeta;
}

interface PaginationMeta {
  cursor: string | null;   // pass this as ?cursor= in the next request
  hasMore: boolean;
  total: number | null;    // null when expensive to count (large datasets)
  pageSize: number;
}

interface ApiError {
  code: string;            // machine-readable: "VALIDATION_ERROR", "NOT_FOUND"
  message: string;         // human-readable, safe to display
  field?: string;          // for validation errors — which field failed
  details?: unknown;       // additional context (never include stack traces in production)
}

// Factory functions for consistent response creation
const createSuccessResponse = <T>(
  data: T,
  meta: Partial<ResponseMeta> & { pagination?: PaginationMeta } = {}
): ApiResponse<T> => ({
  data,
  errors: [],
  meta: {
    requestId: meta.requestId ?? generateRequestId(),
    timestamp: new Date().toISOString(),
    version: meta.version ?? 'v1',
    pagination: meta.pagination,
  },
});

const createErrorResponse = (
  errors: ApiError[],
  meta: Partial<ResponseMeta> = {}
): ApiResponse<null> => ({
  data: null,
  errors,
  meta: {
    requestId: meta.requestId ?? generateRequestId(),
    timestamp: new Date().toISOString(),
    version: meta.version ?? 'v1',
  },
});

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Test envelope creation
const successRes = createSuccessResponse({ userId: 'u123', name: 'Manpreet' });
const errorRes = createErrorResponse([
  { code: 'VALIDATION_ERROR', message: 'Heart rate must be a positive number', field: 'heartRate' }
]);
console.log('Success response:', JSON.stringify(successRes, null, 2));
console.log('\nError response:', JSON.stringify(errorRes, null, 2));

// ─── 2. RATE LIMITER: TOKEN BUCKET ─────────────────────────────────────────
/**
 * Token Bucket algorithm:
 * - Bucket holds up to `capacity` tokens
 * - Refills at `refillRate` tokens per second
 * - Each request consumes 1 token
 * - If empty: reject with 429 and Retry-After header
 *
 * In production: state stored in Redis with atomic Lua scripts.
 * Here: simulated in-memory for learning.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number; // ms timestamp

  constructor(
    private readonly capacity: number,    // max tokens
    private readonly refillRate: number,  // tokens added per second
    private readonly userId: string,
  ) {
    this.tokens = capacity;  // start full
    this.lastRefill = Date.now();
  }

  /** Returns null if allowed, or { retryAfterMs } if rate limited */
  consume(): { retryAfterMs: number } | null {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return null; // allowed
    }

    // Calculate how long until 1 token is available
    const msPerToken = 1000 / this.refillRate;
    return { retryAfterMs: Math.ceil(msPerToken) };
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getStatus(): { tokens: number; capacity: number } {
    this.refill();
    return { tokens: Math.floor(this.tokens), capacity: this.capacity };
  }
}

// Simulate a user making 12 rapid requests against a bucket of 10
console.log('\n--- Token Bucket Rate Limiter ---');
const bucket = new TokenBucket(10, 2, 'user-123'); // 10 capacity, refills 2/sec

for (let i = 1; i <= 12; i++) {
  const result = bucket.consume();
  const status = bucket.getStatus();
  if (result === null) {
    console.log(`Request ${i}: ✅ ALLOWED  (${status.tokens} tokens remaining)`);
  } else {
    console.log(`Request ${i}: ❌ RATE LIMITED  (retry in ${result.retryAfterMs}ms)`);
  }
}

// ─── 3. RATE LIMITER: SLIDING WINDOW COUNTER ──────────────────────────────
/**
 * Sliding Window:
 * - Track timestamps of all requests in a rolling window
 * - Count requests in [now - windowMs, now]
 * - If count >= limit: reject
 *
 * More accurate than Fixed Window (no double-burst at boundary).
 * In production: Redis SORTED SET (score = timestamp, member = requestId).
 * Cleanup: remove entries older than windowMs.
 */
class SlidingWindowRateLimiter {
  // In production this is a Redis SORTED SET. Here: Map<userId, timestamp[]>
  private readonly store = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,   // e.g., 60_000 for 1 minute
    private readonly maxRequests: number // e.g., 100
  ) {}

  /**
   * Returns null if allowed, or { retryAfterMs, requestsInWindow } if limited.
   */
  consume(userId: string): { retryAfterMs: number; requestsInWindow: number } | null {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing timestamps, remove expired ones
    const timestamps = (this.store.get(userId) ?? []).filter(t => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      // Find when the oldest request in the window will expire
      const oldestInWindow = timestamps[0]; // sorted ascending
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return { retryAfterMs: Math.max(0, retryAfterMs), requestsInWindow: timestamps.length };
    }

    // Allow: add current timestamp
    timestamps.push(now);
    this.store.set(userId, timestamps);
    return null;
  }

  getWindowCount(userId: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    return (this.store.get(userId) ?? []).filter(t => t > windowStart).length;
  }
}

console.log('\n--- Sliding Window Rate Limiter ---');
const slidingLimiter = new SlidingWindowRateLimiter(1000, 5); // 5 requests per second

for (let i = 1; i <= 7; i++) {
  const result = slidingLimiter.consume('user-456');
  const count = slidingLimiter.getWindowCount('user-456');
  if (result === null) {
    console.log(`Request ${i}: ✅ ALLOWED  (${count} in window)`);
  } else {
    console.log(`Request ${i}: ❌ LIMITED  (${result.requestsInWindow} in window, retry in ${result.retryAfterMs}ms)`);
  }
}

// ─── 4. IDEMPOTENCY KEY MIDDLEWARE ─────────────────────────────────────────
/**
 * Idempotency: calling the same operation multiple times = same result as once.
 * Critical for: payments, order creation, email sending.
 *
 * Flow:
 * 1. Client includes header: Idempotency-Key: <UUID>
 * 2. Server checks Redis: has this key been processed?
 *    - Yes: return stored response (no reprocessing)
 *    - No: process, store result in Redis (TTL = 24h), return result
 *
 * In production: use Redis SET with NX flag (atomic "set if not exists") +
 * a lock to handle concurrent requests with the same key.
 */
interface StoredIdempotencyResult {
  statusCode: number;
  body: unknown;
  processedAt: string;
}

class IdempotencyStore {
  // In production: Redis with TTL. Here: in-memory Map.
  private readonly store = new Map<string, StoredIdempotencyResult>();
  private readonly ttlMs: number;
  private readonly expiresAt = new Map<string, number>();

  constructor(ttlHours: number = 24) {
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  get(key: string): StoredIdempotencyResult | null {
    const expiry = this.expiresAt.get(key);
    if (!expiry || Date.now() > expiry) {
      this.store.delete(key);
      this.expiresAt.delete(key);
      return null;
    }
    return this.store.get(key) ?? null;
  }

  set(key: string, result: StoredIdempotencyResult): void {
    this.store.set(key, result);
    this.expiresAt.set(key, Date.now() + this.ttlMs);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Middleware function (Express-style handler wrapper)
type RequestHandler = (req: MockRequest, res: MockResponse) => Promise<void>;

interface MockRequest {
  headers: Record<string, string>;
  body: unknown;
  method: string;
  path: string;
}

interface MockResponse {
  status: (code: number) => MockResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  statusCode: number;
  body: unknown;
}

const idempotencyStore = new IdempotencyStore(24);

function withIdempotency(handler: RequestHandler): RequestHandler {
  return async (req, res) => {
    const key = req.headers['idempotency-key'];

    if (!key) {
      // No idempotency key: just run the handler
      return handler(req, res);
    }

    // Check for existing result
    const existing = idempotencyStore.get(key);
    if (existing) {
      console.log(`  [Idempotency] Cache HIT for key: ${key}`);
      res.status(existing.statusCode).json(existing.body);
      return;
    }

    // Process the request
    console.log(`  [Idempotency] Cache MISS for key: ${key} — processing`);

    // Capture the response so we can store it
    let capturedStatus = 200;
    let capturedBody: unknown;

    const capturingRes: MockResponse = {
      statusCode: 200,
      body: null,
      status(code) { capturedStatus = code; this.statusCode = code; return this; },
      json(body) { capturedBody = body; this.body = body; },
      setHeader: res.setHeader.bind(res),
    };

    await handler(req, capturingRes);

    // Store result
    idempotencyStore.set(key, {
      statusCode: capturedStatus,
      body: capturedBody,
      processedAt: new Date().toISOString(),
    });

    // Forward to real response
    res.status(capturedStatus).json(capturedBody);
  };
}

// Test idempotency middleware
console.log('\n--- Idempotency Key Middleware ---');
const mockPurchaseHandler: RequestHandler = async (req, res) => {
  const orderNumber = `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  console.log(`  [Handler] Creating order ${orderNumber}`);
  res.status(201).json({ orderId: orderNumber, status: 'created' });
};

const idempotentPurchase = withIdempotency(mockPurchaseHandler);

const mockReq = (idempotencyKey?: string): MockRequest => ({
  method: 'POST', path: '/purchases',
  headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
  body: { amount: 99.00, currency: 'AUD' },
});
const mockRes = (): MockResponse => {
  const res: MockResponse = {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; console.log(`  Response: ${this.statusCode}`, JSON.stringify(body)); },
    setHeader() {},
  };
  return res;
};

(async () => {
  console.log('Request 1 (first attempt):');
  await idempotentPurchase(mockReq('idem-key-abc123'), mockRes());

  console.log('Request 2 (retry with same key — should NOT create another order):');
  await idempotentPurchase(mockReq('idem-key-abc123'), mockRes());

  console.log('Request 3 (different key — creates new order):');
  await idempotentPurchase(mockReq('idem-key-xyz789'), mockRes());
})();

// ─── 5. CURSOR-BASED PAGINATION ─────────────────────────────────────────────
/**
 * Cursor-based pagination:
 * - Cursor = opaque reference to a position in the dataset (usually base64-encoded ID + timestamp)
 * - Stable between pages: inserting new items doesn't shift pages like offset pagination
 * - Best for: real-time feeds, large datasets, any list that can change between requests
 *
 * Offset pagination weakness: if you're on page 5 and 10 new items are added to page 1,
 * page 5 now shows items you already saw on page 4. Cursor pagination avoids this.
 */
interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;  // pass as ?cursor= in next request
  hasMore: boolean;
  total: number | null;
}

interface CursorPayload {
  id: string;
  timestamp: number;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function decodeCursor(cursor: string): CursorPayload {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
}

// Simulated DB query with cursor
async function fetchMetrics(
  userId: string,
  cursor: string | null,
  pageSize: number = 20
): Promise<PaginatedResult<{ id: string; value: number; recordedAt: Date }>> {
  // Simulate 55 total metrics for this user
  const allMetrics = Array.from({ length: 55 }, (_, i) => ({
    id: `metric-${i + 1}`,
    value: Math.floor(Math.random() * 100) + 60,
    recordedAt: new Date(Date.now() - i * 30_000), // 30 sec apart
  }));

  // Decode cursor to find starting position
  let startIndex = 0;
  if (cursor) {
    const { id } = decodeCursor(cursor);
    const idx = allMetrics.findIndex(m => m.id === id);
    startIndex = idx === -1 ? 0 : idx + 1; // start AFTER the cursor item
  }

  const pageItems = allMetrics.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < allMetrics.length;

  const lastItem = pageItems[pageItems.length - 1];
  const nextCursor = hasMore && lastItem
    ? encodeCursor({ id: lastItem.id, timestamp: lastItem.recordedAt.getTime() })
    : null;

  return { items: pageItems, nextCursor, hasMore, total: null }; // total=null (expensive count)
}

console.log('\n--- Cursor-Based Pagination ---');
(async () => {
  let cursor: string | null = null;
  let page = 1;

  do {
    const result = await fetchMetrics('user-123', cursor, 20);
    console.log(`Page ${page}: ${result.items.length} items | hasMore: ${result.hasMore} | cursor: ${result.nextCursor?.slice(0, 20)}...`);
    cursor = result.nextCursor;
    page++;
  } while (cursor !== null);
})();

// ─── 6. API VERSIONING MIDDLEWARE ──────────────────────────────────────────
/**
 * URL path versioning: /v1/metrics, /v2/metrics
 * Each version has its own handler map.
 * The middleware extracts the version from the path and routes accordingly.
 */
type VersionedHandler = Record<string, RequestHandler>;

interface VersionedRouter {
  [version: string]: VersionedHandler; // e.g., v1: { '/metrics': handler }
}

function createVersionedRouter(routes: VersionedRouter) {
  return async (req: MockRequest, res: MockResponse): Promise<void> => {
    const versionMatch = req.path.match(/^\/v(\d+)\//);
    if (!versionMatch) {
      res.status(400).json(createErrorResponse([{ code: 'MISSING_VERSION', message: 'API version required in path (e.g., /v1/...)' }]));
      return;
    }

    const requestedVersion = `v${versionMatch[1]}`;
    const normalizedPath = req.path.replace(/^\/v\d+/, '');

    // Find the handler: try exact version, then fall back to nearest older version
    const versions = Object.keys(routes).sort().reverse(); // ['v2', 'v1']
    const matchedVersion = versions.find(v => v <= requestedVersion && routes[v][normalizedPath]);

    if (!matchedVersion) {
      res.status(404).json(createErrorResponse([{
        code: 'UNSUPPORTED_VERSION',
        message: `Version ${requestedVersion} is not supported. Latest: ${versions[0]}`
      }]));
      return;
    }

    if (matchedVersion !== requestedVersion) {
      res.setHeader('X-API-Version-Used', matchedVersion);
      console.log(`  [Versioning] ${requestedVersion} not found, falling back to ${matchedVersion}`);
    }

    await routes[matchedVersion][normalizedPath](req, res);
  };
}

// Test versioned routing
console.log('\n--- API Versioning Middleware ---');

const router = createVersionedRouter({
  v1: {
    '/metrics': async (req, res) => res.status(200).json({ version: 'v1', data: [{ value: 75, unit: 'bpm' }] }),
  },
  v2: {
    '/metrics': async (req, res) => res.status(200).json({ version: 'v2', data: [{ value: 75, unit: 'bpm', quality: 0.98, trend: 'stable' }] }),
  },
});

(async () => {
  console.log('Request to /v2/metrics:');
  await router({ ...mockReq(), path: '/v2/metrics' }, mockRes());

  console.log('Request to /v1/metrics:');
  await router({ ...mockReq(), path: '/v1/metrics' }, mockRes());

  console.log('Request to /v3/metrics (falls back to v2):');
  await router({ ...mockReq(), path: '/v3/metrics' }, mockRes());

  console.log('Request without version:');
  await router({ ...mockReq(), path: '/metrics' }, mockRes());
})();

// ─── CHALLENGES ─────────────────────────────────────────────────────────────
/**
 * CHALLENGE 1 ⭐⭐
 * Extend the TokenBucket to support TIERED rate limits:
 * - Free tier: 60 requests/minute, burst of 10
 * - Pro tier:  600 requests/minute, burst of 100
 * - Enterprise: 6000 requests/minute, burst of 1000
 * Create a RateLimiterService class that manages multiple users
 * and accepts a UserTier enum to configure the right bucket.
 *
 * CHALLENGE 2 ⭐⭐
 * Implement a Fixed Window rate limiter and compare it to Sliding Window.
 * Show the "double burst" problem: at the window boundary (e.g., 00:59 → 01:00),
 * a user can make maxRequests in the last second + maxRequests in the first second
 * of the new window = 2x burst. Prove this with a test.
 *
 * CHALLENGE 3 ⭐⭐⭐
 * Build a request deduplication system for health metric ingestion:
 * - Client sends POST /metrics with a batch of up to 50 readings
 * - Each reading has a clientGeneratedId (UUID from the device)
 * - The server must deduplicate: if the same clientGeneratedId has been seen
 *   in the last 24 hours, skip that reading (don't insert to DB)
 * - Return: { inserted: number, duplicates: number, errors: number }
 * Use the IdempotencyStore as inspiration, but deduplicate at the metric level, not request level.
 *
 * CHALLENGE 4 ⭐⭐⭐ (Architecture)
 * You are designing the API for Chalo's public partner API (3rd party apps can
 * integrate bus data). Design the complete API contract (TypeScript types only,
 * no implementation) for:
 * - Authentication: API key in header
 * - GET /v1/cities — list supported cities
 * - GET /v1/cities/{cityId}/buses — list buses with optional ?lat&lng&radius filter
 * - GET /v1/buses/{busId}/eta — ETA for next stop
 * - Webhooks: partners can register a URL to receive real-time location updates
 * Include: response types, error types, webhook event types, and rate limit headers.
 */
