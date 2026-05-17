import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyRateLimit, RATE_LIMITS, type RateLimitConfig } from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow requests within rate limit', async () => {
    const mockRequest = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })

    const config: RateLimitConfig = {
      maxRequests: 10,
      windowMs: 60000,
      key: 'test:limit',
    }

    const result = await applyRateLimit(mockRequest, config)
    expect(result).toBeNull()
  })

  it('should have predefined rate limits for auth endpoints', () => {
    expect(RATE_LIMITS.AUTH_LOGIN.maxRequests).toBe(5)
    expect(RATE_LIMITS.AUTH_LOGIN.windowMs).toBe(60000)
    expect(RATE_LIMITS.AUTH_SIGNUP.maxRequests).toBe(3)
    expect(RATE_LIMITS.ADMIN_LOGIN.maxRequests).toBe(5)
  })

  it('should block requests exceeding rate limit', async () => {
    const config: RateLimitConfig = {
      maxRequests: 1,
      windowMs: 60000,
      key: 'test:block',
    }

    const mockRequest1 = new Request('http://localhost/api/test1', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    const mockRequest2 = new Request('http://localhost/api/test2', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })

    const result1 = await applyRateLimit(mockRequest1, config)
    expect(result1).toBeNull()

    const result2 = await applyRateLimit(mockRequest2, config)
    expect(result2).not.toBeNull()
    expect(result2?.status).toBe(429)
  })
})
