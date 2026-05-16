/**
 * Rate Limiting Utility for USRA PLUS API Routes
 * 
 * Dual-backend rate limiter: tries Upstash Redis first (for distributed,
 * serverless-friendly rate limiting), falls back to in-memory sliding
 * window when Redis is not configured.
 */

import { isRedisConfigured, checkRedisRateLimit } from './redis-rate-limit'

export interface RateLimitEntry {
  count: number
  resetTime: number
}

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Unique identifier for this rate limit bucket */
  key: string
}

// Pre-configured rate limit profiles
export const RATE_LIMITS = {
  // Auth endpoints - strict (prevent brute force)
  AUTH_LOGIN: { maxRequests: 5, windowMs: 60 * 1000, key: 'auth:login' },           // 5/min
  AUTH_SIGNUP: { maxRequests: 3, windowMs: 60 * 60 * 1000, key: 'auth:signup' },    // 3/hour
  AUTH_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000, key: 'auth:reset' },      // 3/hour
  AUTH_VERIFY: { maxRequests: 10, windowMs: 60 * 60 * 1000, key: 'auth:verify' },    // 10/hour
  
  // Admin endpoints - very strict
  ADMIN_LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000, key: 'admin:login' },    // 5/15min
  ADMIN_API: { maxRequests: 60, windowMs: 60 * 1000, key: 'admin:api' },            // 60/min
  
  // User actions - moderate
  FAMILY_INVITE: { maxRequests: 10, windowMs: 60 * 60 * 1000, key: 'family:invite' }, // 10/hour
  FILE_UPLOAD: { maxRequests: 20, windowMs: 60 * 60 * 1000, key: 'file:upload' },     // 20/hour
  MESSAGE_SEND: { maxRequests: 60, windowMs: 60 * 1000, key: 'message:send' },        // 60/min
  SUBSCRIPTION: { maxRequests: 10, windowMs: 60 * 60 * 1000, key: 'subscription' },   // 10/hour
  
  // General API - permissive
  API_READ: { maxRequests: 120, windowMs: 60 * 1000, key: 'api:read' },             // 120/min
  API_WRITE: { maxRequests: 30, windowMs: 60 * 1000, key: 'api:write' },            // 30/min
} as const

// In-memory store — entries auto-expire after windowMs
const store = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Get client identifier from request.
 * Uses X-Forwarded-For header (set by Caddy gateway) or falls back to connection info.
 */
function getClientId(request: Request): string {
  // Caddy sets X-Forwarded-For
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the first IP in the chain
    return forwarded.split(',')[0].trim()
  }
  
  // Fallback — use user-agent hash as a rough identifier
  const ua = request.headers.get('user-agent') || 'unknown'
  return `ua-${hashString(ua)}`
}

/** Simple string hash for generating IDs */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfterMs: number
}

/**
 * Check if a request is within rate limits.
 * Tries Redis first, falls back to in-memory.
 * 
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkRateLimit(request: Request, config: RateLimitConfig): Promise<RateLimitResult> {
  // ─── Try Redis first ──────────────────────────────────────────────
  if (isRedisConfigured()) {
    const redisResult = await checkRedisRateLimit(request, config)
    if (redisResult !== null) {
      return redisResult
    }
    // Redis check failed — fall through to in-memory
  }

  // ─── In-memory fallback ───────────────────────────────────────────
  return checkInMemoryRateLimit(request, config)
}

/**
 * In-memory sliding window rate limit check.
 */
function checkInMemoryRateLimit(request: Request, config: RateLimitConfig): RateLimitResult {
  const clientId = getClientId(request)
  const storeKey = `${config.key}:${clientId}`
  const now = Date.now()
  
  const entry = store.get(storeKey)
  
  // No existing entry or expired window — start fresh
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs
    store.set(storeKey, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
      retryAfterMs: 0,
    }
  }
  
  // Within current window
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfterMs: entry.resetTime - now,
    }
  }
  
  // Increment counter
  entry.count++
  store.set(storeKey, entry)
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    retryAfterMs: 0,
  }
}

/**
 * Apply rate limit to a request and return appropriate response if limited.
 * Returns null if the request is allowed (pass-through).
 * Now async to support Redis-backed rate limiting.
 */
export async function applyRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  const result = await checkRateLimit(request, config)
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(result.retryAfterMs / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(result.retryAfterMs / 1000).toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        },
      }
    )
  }
  
  return null
}
