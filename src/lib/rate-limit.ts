/**
 * Rate Limiting Utility for USRA PLUS API Routes
 * 
 * Redis-backed rate limiter using Upstash Redis for distributed,
 * serverless-friendly rate limiting.
 * 
 * In development without Redis, rate limiting is gracefully disabled
 * (all requests allowed) rather than using an unreliable in-memory fallback.
 */

import { isRedisConfigured, checkRedisRateLimit } from './redis-rate-limit'
import { logger } from '@/lib/logger'

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
  AUTH_LOGIN: { maxRequests: 5, windowMs: 60 * 1000, key: 'auth:login' },
  AUTH_SIGNUP: { maxRequests: 3, windowMs: 60 * 60 * 1000, key: 'auth:signup' },
  AUTH_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000, key: 'auth:reset' },
  AUTH_VERIFY: { maxRequests: 10, windowMs: 60 * 60 * 1000, key: 'auth:verify' },
  
  // Admin endpoints - very strict
  ADMIN_LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000, key: 'admin:login' },
  ADMIN_API: { maxRequests: 60, windowMs: 60 * 1000, key: 'admin:api' },
  
  // User actions - moderate
  FAMILY_INVITE: { maxRequests: 10, windowMs: 60 * 60 * 1000, key: 'family:invite' },
  FILE_UPLOAD: { maxRequests: 20, windowMs: 60 * 60 * 1000, key: 'file:upload' },
  MESSAGE_SEND: { maxRequests: 60, windowMs: 60 * 1000, key: 'message:send' },
  SUBSCRIPTION: { maxRequests: 10, windowMs: 60 * 60 * 1000, key: 'subscription' },
  
  // General API - permissive
  API_READ: { maxRequests: 120, windowMs: 60 * 1000, key: 'api:read' },
  API_WRITE: { maxRequests: 30, windowMs: 60 * 1000, key: 'api:write' },
} as const

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfterMs: number
}

/**
 * Check if a request is within rate limits.
 * Uses Redis for production. In development without Redis, rate limiting
 * is disabled (all requests allowed) to avoid false positives.
 */
export async function checkRateLimit(request: Request, config: RateLimitConfig): Promise<RateLimitResult> {
  if (!isRedisConfigured()) {
    // Development mode without Redis: allow all requests
    // Log a warning once per startup
    if (process.env.NODE_ENV === 'production') {
      logger.warn('[Rate Limit]', 'Redis not configured - rate limiting disabled in production')
    }
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
      retryAfterMs: 0,
    }
  }

  const redisResult = await checkRedisRateLimit(request, config)
  if (redisResult !== null) {
    return redisResult
  }

  // Redis check failed - allow request but log warning
  logger.error('[Rate Limit]', 'Redis check failed - allowing request')
  return {
    allowed: true,
    remaining: config.maxRequests,
    resetTime: Date.now() + config.windowMs,
    retryAfterMs: 0,
  }
}

/**
 * Apply rate limit to a request and return appropriate response if limited.
 * Returns null if the request is allowed (pass-through).
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
