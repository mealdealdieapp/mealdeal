/**
 * Client-Side Rate Limiter for MealDeal
 *
 * Implements the Token Bucket algorithm in-memory (no localStorage/AsyncStorage).
 * Tracks requests per endpoint to prevent:
 * - DOS attacks
 * - Excessive API calls
 * - Server overload
 *
 * Token Bucket Algorithm (Deutsch: Token-Eimer-Algorithmus):
 * - Each endpoint has a bucket with a max token capacity
 * - Tokens are refilled at a constant rate (capacity per minute)
 * - Each request consumes 1 token
 * - If no tokens available: request is rate-limited
 *
 * Example: maxTokens=30, refillRate=30/60000ms = 0.5 tokens per ms
 * After 1 minute, bucket is full again
 */

/**
 * Token bucket state for a single endpoint
 * Deutsch: Token-Eimer-Status für einen Endpunkt
 */
interface TokenBucket {
  tokens: number; // Current token count
  maxTokens: number; // Bucket capacity
  refillRate: number; // Tokens per millisecond
  lastRefillTime: number; // Timestamp of last refill
}

/**
 * Rate limiter configuration per endpoint type
 * Deutsch: Rate-Limiter-Konfiguration pro Endpunkttyp
 */
interface RateLimitConfig {
  maxTokens: number; // Max requests per minute
  defaultMaxTokens?: number; // Fallback max
}

/**
 * Request tracking result
 * Deutsch: Anfrage-Tracking-Ergebnis
 */
interface RateLimitResult {
  allowed: boolean; // Is request allowed?
  remainingRequests: number; // Tokens left in bucket
  resetIn?: number; // ms until next token available (if denied)
}

/**
 * RateLimiter class: Token bucket implementation
 * Deutsch: RateLimiter-Klasse: Token-Eimer-Implementierung
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private readLimitPerMinute: number;
  private writeLimitPerMinute: number;

  /**
   * Constructor
   * Deutsch: Konstruktor
   *
   * @param readLimitPerMinute - Default max read requests per minute (default: 30)
   * @param writeLimitPerMinute - Default max write requests per minute (default: 10)
   */
  constructor(readLimitPerMinute: number = 30, writeLimitPerMinute: number = 10) {
    this.readLimitPerMinute = readLimitPerMinute;
    this.writeLimitPerMinute = writeLimitPerMinute;
  }

  /**
   * Get or create token bucket for endpoint
   * Deutsch: Token-Eimer für Endpunkt abrufen oder erstellen
   *
   * @param endpoint - Endpoint identifier (e.g., "GET /offers", "POST /recipes")
   * @param maxTokens - Max tokens per minute for this endpoint
   * @returns TokenBucket
   */
  private getBucket(endpoint: string, maxTokens: number): TokenBucket {
    if (!this.buckets.has(endpoint)) {
      // Create new bucket with calculated refill rate
      // refillRate = tokens per millisecond
      const refillRate = maxTokens / 60000;

      this.buckets.set(endpoint, {
        tokens: maxTokens, // Start full
        maxTokens,
        refillRate,
        lastRefillTime: Date.now(),
      });
    }

    return this.buckets.get(endpoint)!;
  }

  /**
   * Refill bucket with tokens based on elapsed time
   * Deutsch: Eimer mit Token basierend auf verstrichener Zeit auffüllen
   *
   * @param bucket - TokenBucket to refill
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefillTime;

    // Calculate new tokens earned
    const newTokens = elapsedMs * bucket.refillRate;
    bucket.tokens = Math.min(bucket.tokens + newTokens, bucket.maxTokens);
    bucket.lastRefillTime = now;
  }

  /**
   * Check if a request can be made for the endpoint
   * Deutsch: Überprüfe, ob eine Anfrage für den Endpunkt möglich ist
   *
   * @param endpoint - Endpoint identifier
   * @param isWrite - True for write requests (POST/PUT/DELETE), false for reads
   * @returns RateLimitResult with allowed status and remaining requests
   */
  canMakeRequest(endpoint: string, isWrite: boolean = false): RateLimitResult {
    const maxTokens = isWrite ? this.writeLimitPerMinute : this.readLimitPerMinute;
    const bucket = this.getBucket(endpoint, maxTokens);

    // Refill bucket based on elapsed time
    this.refillBucket(bucket);

    const allowed = bucket.tokens >= 1;

    return {
      allowed,
      remainingRequests: Math.floor(bucket.tokens),
      resetIn: allowed ? undefined : Math.ceil((1 - bucket.tokens) / bucket.refillRate),
    };
  }

  /**
   * Track a request (consume 1 token)
   * Deutsch: Anfrage tracking (verbrauche 1 Token)
   *
   * @param endpoint - Endpoint identifier
   * @param isWrite - True for write requests
   * @returns RateLimitResult after consuming token
   */
  trackRequest(endpoint: string, isWrite: boolean = false): RateLimitResult {
    const maxTokens = isWrite ? this.writeLimitPerMinute : this.readLimitPerMinute;
    const bucket = this.getBucket(endpoint, maxTokens);

    // Refill first
    this.refillBucket(bucket);

    if (bucket.tokens >= 1) {
      // Request allowed: consume 1 token
      bucket.tokens -= 1;
      return {
        allowed: true,
        remainingRequests: Math.floor(bucket.tokens),
      };
    } else {
      // Request denied: calculate reset time
      return {
        allowed: false,
        remainingRequests: 0,
        resetIn: Math.ceil((1 - bucket.tokens) / bucket.refillRate),
      };
    }
  }

  /**
   * Get remaining requests for an endpoint
   * Deutsch: Verbleibende Anfragen für Endpunkt abrufen
   *
   * @param endpoint - Endpoint identifier
   * @param isWrite - True for write requests
   * @returns Number of requests remaining
   */
  getRemainingRequests(endpoint: string, isWrite: boolean = false): number {
    const maxTokens = isWrite ? this.writeLimitPerMinute : this.readLimitPerMinute;
    const bucket = this.getBucket(endpoint, maxTokens);

    // Refill to get current state
    this.refillBucket(bucket);

    return Math.floor(bucket.tokens);
  }

  /**
   * Reset all buckets (for testing or emergency)
   * Deutsch: Alle Eimer zurücksetzen
   */
  reset(): void {
    this.buckets.clear();
  }

  /**
   * Reset a single endpoint bucket
   * Deutsch: Einen Endpunkt-Eimer zurücksetzen
   *
   * @param endpoint - Endpoint identifier
   */
  resetEndpoint(endpoint: string): void {
    this.buckets.delete(endpoint);
  }

  /**
   * Get current state of a bucket (for debugging)
   * Deutsch: Aktuellen Status eines Eimers abrufen
   *
   * @param endpoint - Endpoint identifier
   * @returns Current bucket state or undefined
   */
  getBucketState(endpoint: string): TokenBucket | undefined {
    const maxTokens = this.readLimitPerMinute;
    const bucket = this.getBucket(endpoint, maxTokens);
    this.refillBucket(bucket);
    return { ...bucket };
  }
}

/**
 * Pre-configured rate limiter instance
 * Deutsch: Vorkonfigurierte Rate-Limiter-Instanz
 *
 * Defaults:
 * - Read requests: 30 per minute (2 requests per 4 seconds)
 * - Write requests: 10 per minute (1 request per 6 seconds)
 *
 * Usage:
 * const result = apiLimiter.canMakeRequest('GET /offers');
 * if (!result.allowed) {
 *   // Return 429 Too Many Requests
 *   console.log(`Retry after ${result.resetIn}ms`);
 * }
 */
export const apiLimiter = new RateLimiter(30, 10);

export type { RateLimitResult };
