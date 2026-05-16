/**
 * USRA PLUS Redis Rate Limiting
 * 
 * Upstash Redis-backed rate limiter with seamless fallback to in-memory.
 * When Redis is configured, uses distributed sliding window rate limiting
 * that works across serverless instances (Vercel, etc.).
 * When Redis is NOT configured, falls back gracefully.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { RateLimitConfig, RateLimitResult } from './rate-limit'

/**
 * Check if Upstash Redis is configured.
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// Lazy-initialize Redis and rate limiters
let _redis: Redis | null = null
let _redisInitialized = false

function getRedis(): Redis | null {
  if (_redisInitialized) return _redis
  _redisInitialized = true

  if (!isRedisConfigured()) return null

  try {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  } catch (err) {
    console.error('[Redis Rate Limit] Failed to initialize Redis:', err)
    _redis = null
  }

  return _redis
}

// Cache rate limiter instances per key
const ratelimiters = new Map<string, Ratelimit>()

/**
 * Get or create a Ratelimit instance for the given config.
 */
function getRatelimiter(config: RateLimitConfig): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null

  const cacheKey = `${config.key}:${config.maxRequests}:${config.windowMs}`
  let limiter = ratelimiters.get(cacheKey)

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
      prefix: `usra-plus:ratelimit:${config.key}`,
      analytics: true,
    })
    ratelimiters.set(cacheKey, limiter)
  }

  return limiter
}

/**
 * Get client identifier from request (same logic as in-memory rate limiter).
 */
function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const ua = request.headers.get('user-agent') || 'unknown'
  return `ua-${hashString(ua)}`
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

/**
 * Check rate limit using Upstash Redis.
 * Returns null if Redis is not configured (caller should fall back to in-memory).
 * Returns RateLimitResult if Redis check succeeded.
 */
export async function checkRedisRateLimit(
  request: Request,
  config: RateLimitConfig,
): Promise<RateLimitResult | null> {
  const limiter = getRatelimiter(config)
  if (!limiter) return null

  const clientId = getClientId(request)

  try {
    const result = await limiter.limit(clientId)

    const now = Date.now()
    const resetTime = result.reset
      ? new Date(result.reset).getTime()
      : now + config.windowMs

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime,
      retryAfterMs: result.success ? 0 : (resetTime - now),
    }
  } catch (err) {
    console.error('[Redis Rate Limit] Check failed, falling back to in-memory:', err)
    return null // Fall back to in-memory
  }
}
