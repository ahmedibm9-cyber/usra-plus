import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/subscription
 *
 * Check the current user's subscription status.
 * This endpoint consolidates data from both the local Prisma database
 * and RevenueCat (if configured).
 *
 * Returns:
 * - plan: The subscription plan (free, pro, family_plus, max, ultimate)
 * - status: The subscription status (active, expired, cancelled, etc.)
 * - source: Where the data came from (database, revenuecat, fallback)
 * - entitlements: RevenueCat entitlements (if configured)
 * - isRevenueCatPro: Whether RevenueCat reports the user as pro
 */
export async function GET(request: NextRequest) {
  // Rate limit
  const rateLimitResult = checkRateLimit(request, RATE_LIMITS.API_READ)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000) },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() },
      }
    )
  }

  try {
    // Verify authentication
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch subscription from local database
    const { db } = await import('@/lib/db')
    const subscription = await db.userSubscription.findFirst({
      where: { userId },
    })

    let plan = 'free'
    let status = 'none'
    let source = 'fallback'
    let expirationDate: string | null = null
    let isTrial = false
    let trialEnd: string | null = null

    if (subscription) {
      plan = subscription.plan || 'free'
      status = subscription.status || 'none'
      source = 'database'
      expirationDate = subscription.expirationDate?.toISOString() || null
      isTrial = subscription.periodType === 'trial'
      trialEnd = subscription.currentPeriodEnd?.toISOString() || null

      // Check if subscription is expired
      if (
        subscription.status === 'expired' ||
        (subscription.expirationDate && subscription.expirationDate < new Date())
      ) {
        plan = 'free'
        status = 'expired'
      }
    }

    // If RevenueCat is configured, also check there
    let isRevenueCatPro = false
    let revenuecatEntitlements: Record<string, { isActive: boolean; willRenew: boolean; productIdentifier: string }> = {}
    let revenuecatSource = false

    const revenuecatApiKey = process.env.REVENUECAT_API_KEY
    if (revenuecatApiKey) {
      try {
        const projectId = process.env.REVENUECAT_PROJECT_ID
        if (projectId) {
          // Use RevenueCat REST API to check subscriber status
          const rcResponse = await fetch(
            `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
            {
              headers: {
                'Authorization': `Bearer ${revenuecatApiKey}`,
                'Content-Type': 'application/json',
                'X-Platform': 'web',
              },
            }
          )

          if (rcResponse.ok) {
            const rcData = await rcResponse.json()
            const subscriber = rcData.subscriber

            if (subscriber?.entitlements) {
              for (const [key, value] of Object.entries(subscriber.entitlements as Record<string, unknown>)) {
                const entitlement = value as { expires_date?: string; product_identifier?: string; purchase_date?: string }
                const isActive = !entitlement.expires_date || new Date(entitlement.expires_date) > new Date()

                revenuecatEntitlements[key] = {
                  isActive,
                  willRenew: isActive,
                  productIdentifier: entitlement.product_identifier || '',
                }

                if (isActive) {
                  isRevenueCatPro = true
                  // If RevenueCat says user is pro, override the local plan
                  if (plan === 'free') {
                    plan = 'pro'
                    source = 'revenuecat'
                  }
                }
              }
            }

            revenuecatSource = true
          }
        }
      } catch (err) {
        console.warn('[SubscriptionAPI] RevenueCat check failed:', err)
        // Non-critical — continue with local data
      }
    }

    return NextResponse.json({
      plan,
      status,
      source,
      expirationDate,
      isTrial,
      trialEnd,
      // RevenueCat integration data
      isRevenueCatPro,
      revenuecatEntitlements,
      revenuecatSource,
    })
  } catch (error) {
    console.error('[SubscriptionAPI] Error:', error)
    return NextResponse.json(
      { plan: 'free', source: 'error', error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscription
 *
 * Sync subscription status from RevenueCat to the local database.
 * Also handles RevenueCat webhook events when the body contains
 * an `api_version` field.
 *
 * Body for sync:
 * { action: 'sync', userId: string }
 *
 * Body for webhook:
 * { api_version: string, event: { type: string, ... } }
 */
export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResult = checkRateLimit(request, RATE_LIMITS.API_WRITE)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000) },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() },
      }
    )
  }

  try {
    const rawBody = await request.text()
    let body: Record<string, unknown>

    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // Check if this is a RevenueCat webhook
    if (body.api_version && body.event) {
      return await handleWebhook(rawBody, request)
    }

    // Handle subscription sync
    if (body.action === 'sync') {
      return await handleSync(request, body)
    }

    return NextResponse.json({ error: 'Unknown action. Use "sync" or send a webhook event.' }, { status: 400 })
  } catch (error) {
    console.error('[SubscriptionAPI] POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Sync Handler ───────────────────────────────────────────────────────────

async function handleSync(request: NextRequest, body: Record<string, unknown>) {
  // Verify authentication
  const userId = await getAuthenticatedUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // If a specific userId is provided, verify it matches the authenticated user
  const targetUserId = (body.userId as string) || userId
  if (targetUserId !== userId) {
    return NextResponse.json({ error: 'Cannot sync subscription for another user' }, { status: 403 })
  }

  const revenuecatApiKey = process.env.REVENUECAT_API_KEY
  const projectId = process.env.REVENUECAT_PROJECT_ID

  if (!revenuecatApiKey || !projectId) {
    return NextResponse.json({
      synced: false,
      message: 'RevenueCat is not configured — cannot sync',
      plan: 'free',
    })
  }

  try {
    // Fetch subscriber data from RevenueCat
    const rcResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: {
          'Authorization': `Bearer ${revenuecatApiKey}`,
          'Content-Type': 'application/json',
          'X-Platform': 'web',
        },
      }
    )

    if (!rcResponse.ok) {
      console.warn('[SubscriptionAPI] RevenueCat sync failed:', rcResponse.status)
      return NextResponse.json({
        synced: false,
        message: 'Failed to fetch data from RevenueCat',
      })
    }

    const rcData = await rcResponse.json()
    const subscriber = rcData.subscriber

    // Determine plan from entitlements
    let plan = 'free'
    let status = 'active'
    let productIdentifier: string | null = null
    let store: string | null = null
    let expirationDate: Date | null = null
    let isSandbox = false

    if (subscriber?.entitlements) {
      const entitlements = subscriber.entitlements as Record<string, { expires_date?: string; product_identifier?: string; purchase_date?: string; store?: string; is_sandbox?: boolean }>
      for (const [_key, value] of Object.entries(entitlements)) {
        const isActive = !value.expires_date || new Date(value.expires_date) > new Date()
        if (isActive) {
          productIdentifier = value.product_identifier || null
          store = value.store || null
          isSandbox = value.is_sandbox || false
          if (value.expires_date) {
            expirationDate = new Date(value.expires_date)
          }

          // Map product to plan
          plan = mapProductToPlan(productIdentifier || 'free')
          status = 'active'
          break
        }
      }
    }

    // If no active entitlements, check if there's a subscription that expired
    if (plan === 'free' && subscriber?.subscriptions) {
      const subscriptions = subscriber.subscriptions as Record<string, { expires_date?: string; unsubscribe_detected_at?: string; billing_issue_detected_at?: string }>
      for (const [_key, sub] of Object.entries(subscriptions)) {
        if (sub.expires_date && new Date(sub.expires_date) < new Date()) {
          status = 'expired'
          plan = 'free'
          expirationDate = new Date(sub.expires_date)
        }
        if (sub.unsubscribe_detected_at) {
          status = 'cancelled'
        }
        if (sub.billing_issue_detected_at) {
          status = 'billing_issue'
        }
      }
    }

    // Update local database
    const { db } = await import('@/lib/db')
    const existing = await db.userSubscription.findFirst({
      where: { userId },
    })

    const subscriptionData = {
      plan,
      status,
      productIdentifier,
      store,
      expirationDate,
      isSandbox,
      autoRenew: status === 'active',
      lastRevenuecatEvent: 'SYNC',
      lastEventAt: new Date(),
      updatedAt: new Date(),
    }

    if (existing) {
      await db.userSubscription.update({
        where: { id: existing.id },
        data: subscriptionData,
      })
    } else {
      await db.userSubscription.create({
        data: {
          userId,
          ...subscriptionData,
        },
      })
    }

    return NextResponse.json({
      synced: true,
      plan,
      status,
      source: 'revenuecat',
      productIdentifier,
      expirationDate: expirationDate?.toISOString() || null,
    })
  } catch (err) {
    console.error('[SubscriptionAPI] Sync error:', err)
    return NextResponse.json({
      synced: false,
      message: 'Failed to sync subscription with RevenueCat',
    }, { status: 500 })
  }
}

// ─── Webhook Handler ────────────────────────────────────────────────────────

async function handleWebhook(rawBody: string, request: NextRequest) {
  // Verify webhook signature
  const signature = request.headers.get('x-revenuecat-signature')
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET

  if (secret) {
    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 })
    }

    try {
      const expectedSignature = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

      if (expectedSignature.length !== signature.length) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }

      let mismatch = 0
      for (let i = 0; i < expectedSignature.length; i++) {
        mismatch |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i)
      }

      if (mismatch !== 0) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }
  }

  let webhookData: { event: { type: string; app_user_id: string; product_id: string; store: string; price: number | null; currency: string | null; purchased_at_ms: number | null; expiration_at_ms: number | null; is_sandbox: boolean | null; cancellation_reason: string | null; period_type: string | null; new_product_id: string | null; transaction_id: string | null } }
  try {
    webhookData = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const event = webhookData.event
  if (!event?.type || !event?.app_user_id) {
    return NextResponse.json({ error: 'Missing event data' }, { status: 400 })
  }

  console.info(`[SubscriptionAPI] Webhook: ${event.type} for user: ${event.app_user_id}`)

  // Map event type to subscription status
  let plan = mapProductToPlan(event.product_id)
  let status = 'active'

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'SUBSCRIPTION_RESUMED':
    case 'TRANSFER':
      status = 'active'
      break
    case 'CANCELLATION':
      status = 'cancelled'
      break
    case 'EXPIRATION':
      plan = 'free'
      status = 'expired'
      break
    case 'BILLING_ISSUE':
      status = 'active' // Grace period
      break
    case 'PRODUCT_CHANGE':
      if (event.new_product_id) {
        plan = mapProductToPlan(event.new_product_id)
      }
      status = 'active'
      break
    case 'SUBSCRIPTION_PAUSED':
      status = 'paused'
      break
    default:
      console.info(`[SubscriptionAPI] Unhandled webhook event: ${event.type}`)
      break
  }

  // Update local database
  try {
    const { db } = await import('@/lib/db')
    const existing = await db.userSubscription.findFirst({
      where: { userId: event.app_user_id },
    })

    const subscriptionData = {
      plan,
      status,
      productIdentifier: event.new_product_id || event.product_id,
      store: mapStore(event.store),
      periodType: event.period_type || 'normal',
      currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date(),
      currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
      expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
      autoRenew: status === 'active',
      isSandbox: event.is_sandbox ?? false,
      cancellationReason: event.cancellation_reason,
      price: event.price,
      currency: event.currency,
      lastRevenuecatEvent: event.type,
      lastEventAt: new Date(),
    }

    if (existing) {
      await db.userSubscription.update({
        where: { id: existing.id },
        data: subscriptionData,
      })
    } else {
      await db.userSubscription.create({
        data: {
          userId: event.app_user_id,
          revenuecatId: event.transaction_id,
          ...subscriptionData,
        },
      })
    }
  } catch (err) {
    console.error('[SubscriptionAPI] Webhook DB update error:', err)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }

  return NextResponse.json({ received: true, eventType: event.type })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapProductToPlan(productId: string): string {
  const id = productId.toLowerCase()
  if (id.includes('ultimate')) return 'ultimate'
  if (id.includes('family') || id.includes('family_plus')) return 'family_plus'
  if (id.includes('max')) return 'max'
  if (id.includes('pro')) return 'pro'
  return 'pro'
}

function mapStore(store: string): string {
  const normalized = store.toLowerCase()
  if (normalized.includes('stripe') || normalized.includes('web')) return 'stripe'
  if (normalized.includes('app_store') || normalized.includes('apple')) return 'app_store'
  if (normalized.includes('play_store') || normalized.includes('google')) return 'play_store'
  if (normalized.includes('promo')) return 'promo'
  return store
}
