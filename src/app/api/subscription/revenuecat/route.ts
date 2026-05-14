import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

/**
 * RevenueCat Webhook Handler
 *
 * POST /api/subscription/revenuecat
 *
 * Receives webhook events from RevenueCat and updates the
 * UserSubscription table in the database accordingly.
 *
 * Events handled:
 * - TRANSFER
 * - INITIAL_PURCHASE
 * - RENEWAL
 * - CANCELLATION
 * - EXPIRATION
 * - BILLING_ISSUE
 * - PRODUCT_CHANGE
 * - SUBSCRIPTION_PAUSED
 * - SUBSCRIPTION_RESUMED
 *
 * Security: Webhook signatures are verified using REVENUECAT_WEBHOOK_SECRET
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface RevenueCatWebhookEvent {
  api_version: string
  event: {
    type: string
    store: string
    app_user_id: string
    product_id: string
    price: number | null
    currency: string | null
    purchased_at_ms: number | null
    expiration_at_ms: number | null
    is_trial_conversion: boolean | null
    is_sandbox: boolean | null
    cancellation_reason: string | null
    new_product_id: string | null
    period_type: string | null
    transaction_id: string | null
    original_app_user_id: string | null
    aliases: string[] | null
    entitlement_ids: string[] | null
    presented_offering_id: string | null
    environment: string | null
    store_transaction_id: string | null
  }
}

// ─── Signature Verification ─────────────────────────────────────────────────

/**
 * Verify the webhook signature using the shared secret.
 * RevenueCat sends an X-RevenueCat-Signature header with each webhook.
 */
function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET

  // If no secret configured, reject the webhook — secret must be set in production
  if (!secret) {
    console.error('[RevenueCat Webhook] No REVENUECAT_WEBHOOK_SECRET configured — rejecting webhook')
    return false
  }

  if (!signature) {
    console.error('[RevenueCat Webhook] Missing signature header')
    return false
  }

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    if (expectedSignature.length !== signature.length) {
      return false
    }

    let mismatch = 0
    for (let i = 0; i < expectedSignature.length; i++) {
      mismatch |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i)
    }

    return mismatch === 0
  } catch (err) {
    console.error('[RevenueCat Webhook] Signature verification error:', err)
    return false
  }
}

// ─── Plan Mapping ───────────────────────────────────────────────────────────

/**
 * Map a RevenueCat product identifier to a USRA PLUS subscription plan.
 */
function mapProductToPlan(productId: string): string {
  const id = productId.toLowerCase()
  if (id.includes('ultimate')) return 'ultimate'
  if (id.includes('family') || id.includes('family_plus')) return 'family_plus'
  if (id.includes('max')) return 'max'
  if (id.includes('pro')) return 'pro'
  // Unknown products default to 'free' — prevents privilege escalation via unknown product IDs
  return 'free'
}

/**
 * Map a RevenueCat store to our store format.
 */
function mapStore(store: string): string {
  const normalized = store.toLowerCase()
  if (normalized.includes('stripe') || normalized.includes('web')) return 'stripe'
  if (normalized.includes('app_store') || normalized.includes('apple')) return 'app_store'
  if (normalized.includes('play_store') || normalized.includes('google')) return 'play_store'
  if (normalized.includes('promo')) return 'promo'
  return store
}

// ─── Database Operations ────────────────────────────────────────────────────

/**
 * Upsert a UserSubscription record based on the webhook event.
 * Uses Supabase admin client for server-side operations.
 */
async function upsertSubscription(data: {
  userId: string
  plan: string
  status: string
  productIdentifier: string
  store: string
  periodType: string | null
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  expirationDate: Date | null
  autoRenew: boolean
  isSandbox: boolean
  cancellationReason: string | null
  price: number | null
  currency: string | null
  revenuecatEvent: string
  transactionId: string | null
}) {
  // Use Supabase admin for server-side operations
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    // Fallback: try Prisma if Supabase is not available
    try {
      const { db } = await import('@/lib/db')
      const existing = await db.userSubscription.findFirst({
        where: { userId: data.userId },
      })

      if (existing) {
        await db.userSubscription.update({
          where: { id: existing.id },
          data: {
            plan: data.plan,
            status: data.status,
            productIdentifier: data.productIdentifier,
            store: data.store,
            periodType: data.periodType,
            currentPeriodStart: data.currentPeriodStart,
            currentPeriodEnd: data.currentPeriodEnd,
            expirationDate: data.expirationDate,
            autoRenew: data.autoRenew,
            isSandbox: data.isSandbox,
            cancellationReason: data.cancellationReason,
            price: data.price,
            currency: data.currency,
            lastRevenuecatEvent: data.revenuecatEvent,
            lastEventAt: new Date(),
          },
        })
      } else {
        await db.userSubscription.create({
          data: {
            userId: data.userId,
            plan: data.plan,
            status: data.status,
            productIdentifier: data.productIdentifier,
            store: data.store,
            periodType: data.periodType,
            currentPeriodStart: data.currentPeriodStart,
            currentPeriodEnd: data.currentPeriodEnd,
            expirationDate: data.expirationDate,
            autoRenew: data.autoRenew,
            isSandbox: data.isSandbox,
            cancellationReason: data.cancellationReason,
            price: data.price,
            currency: data.currency,
            revenuecatId: data.transactionId,
            lastRevenuecatEvent: data.revenuecatEvent,
            lastEventAt: new Date(),
          },
        })
      }
      console.info('[RevenueCat Webhook] Subscription upserted via Prisma for user:', data.userId)
    } catch (err) {
      console.error('[RevenueCat Webhook] Failed to upsert subscription via Prisma:', err)
      throw err
    }
    return
  }

  // Supabase path — upsert into subscriptions table
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: data.userId,
      plan: data.plan,
      status: data.status,
      revenuecat_id: data.transactionId,
      current_period_start: data.currentPeriodStart?.toISOString(),
      current_period_end: data.currentPeriodEnd?.toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  if (error) {
    console.error('[RevenueCat Webhook] Supabase upsert error:', error)
    throw error
  }

  console.info('[RevenueCat Webhook] Subscription upserted via Supabase for user:', data.userId)
}

// ─── Event Handlers ─────────────────────────────────────────────────────────

async function handleInitialPurchase(event: RevenueCatWebhookEvent['event']) {
  await upsertSubscription({
    userId: event.app_user_id,
    plan: mapProductToPlan(event.product_id),
    status: 'active',
    productIdentifier: event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date(),
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    autoRenew: true,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: null,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'INITIAL_PURCHASE',
    transactionId: event.transaction_id,
  })
}

async function handleRenewal(event: RevenueCatWebhookEvent['event']) {
  await upsertSubscription({
    userId: event.app_user_id,
    plan: mapProductToPlan(event.product_id),
    status: 'active',
    productIdentifier: event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date(),
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    autoRenew: true,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: null,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'RENEWAL',
    transactionId: event.transaction_id,
  })
}

async function handleCancellation(event: RevenueCatWebhookEvent['event']) {
  await upsertSubscription({
    userId: event.app_user_id,
    plan: mapProductToPlan(event.product_id),
    status: 'cancelled',
    productIdentifier: event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : null,
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    autoRenew: false,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: event.cancellation_reason,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'CANCELLATION',
    transactionId: event.transaction_id,
  })
}

async function handleExpiration(event: RevenueCatWebhookEvent['event']) {
  await upsertSubscription({
    userId: event.app_user_id,
    plan: 'free',
    status: 'expired',
    productIdentifier: event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : null,
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : new Date(),
    autoRenew: false,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: event.cancellation_reason,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'EXPIRATION',
    transactionId: event.transaction_id,
  })
}

async function handleBillingIssue(event: RevenueCatWebhookEvent['event']) {
  // Billing issues don't necessarily change the subscription status
  // but we record the event. The subscription may still be active
  // for a grace period.
  await upsertSubscription({
    userId: event.app_user_id,
    plan: mapProductToPlan(event.product_id),
    status: 'active', // Keep active during grace period
    productIdentifier: event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : null,
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    autoRenew: true,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: null,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'BILLING_ISSUE',
    transactionId: event.transaction_id,
  })
}

async function handleProductChange(event: RevenueCatWebhookEvent['event']) {
  await upsertSubscription({
    userId: event.app_user_id,
    plan: mapProductToPlan(event.new_product_id || event.product_id),
    status: 'active',
    productIdentifier: event.new_product_id || event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date(),
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    autoRenew: true,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: null,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'PRODUCT_CHANGE',
    transactionId: event.transaction_id,
  })
}

async function handleTransfer(event: RevenueCatWebhookEvent['event']) {
  // Transfer events mean the user's purchases have been transferred
  // from one RevenueCat user ID to another.
  await upsertSubscription({
    userId: event.app_user_id,
    plan: mapProductToPlan(event.product_id),
    status: 'active',
    productIdentifier: event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : null,
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    autoRenew: true,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: null,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'TRANSFER',
    transactionId: event.transaction_id,
  })
}

async function handleSubscriptionPaused(event: RevenueCatWebhookEvent['event']) {
  await upsertSubscription({
    userId: event.app_user_id,
    plan: mapProductToPlan(event.product_id),
    status: 'paused',
    productIdentifier: event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : null,
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    autoRenew: false,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: null,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'SUBSCRIPTION_PAUSED',
    transactionId: event.transaction_id,
  })
}

async function handleSubscriptionResumed(event: RevenueCatWebhookEvent['event']) {
  await upsertSubscription({
    userId: event.app_user_id,
    plan: mapProductToPlan(event.product_id),
    status: 'active',
    productIdentifier: event.product_id,
    store: mapStore(event.store),
    periodType: event.period_type || 'normal',
    currentPeriodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date(),
    currentPeriodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    expirationDate: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    autoRenew: true,
    isSandbox: event.is_sandbox ?? false,
    cancellationReason: null,
    price: event.price,
    currency: event.currency,
    revenuecatEvent: 'SUBSCRIPTION_RESUMED',
    transactionId: event.transaction_id,
  })
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text()
  const signature = request.headers.get('x-revenuecat-signature')

  // Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    )
  }

  let webhookData: RevenueCatWebhookEvent
  try {
    webhookData = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  const eventType = webhookData.event?.type
  const event = webhookData.event

  if (!eventType || !event) {
    return NextResponse.json(
      { error: 'Missing event type or event data' },
      { status: 400 }
    )
  }

  console.info(`[RevenueCat Webhook] Received event: ${eventType} for user: ${event.app_user_id}`)

  try {
    switch (eventType) {
      case 'TRANSFER':
        await handleTransfer(event)
        break
      case 'INITIAL_PURCHASE':
        await handleInitialPurchase(event)
        break
      case 'RENEWAL':
        await handleRenewal(event)
        break
      case 'CANCELLATION':
        await handleCancellation(event)
        break
      case 'EXPIRATION':
        await handleExpiration(event)
        break
      case 'BILLING_ISSUE':
        await handleBillingIssue(event)
        break
      case 'PRODUCT_CHANGE':
        await handleProductChange(event)
        break
      case 'SUBSCRIPTION_PAUSED':
        await handleSubscriptionPaused(event)
        break
      case 'SUBSCRIPTION_RESUMED':
        await handleSubscriptionResumed(event)
        break
      default:
        console.info(`[RevenueCat Webhook] Unhandled event type: ${eventType}`)
        // Return 200 anyway so RevenueCat doesn't retry
        break
    }

    return NextResponse.json({ received: true, eventType })
  } catch (err) {
    console.error(`[RevenueCat Webhook] Error handling ${eventType}:`, err)
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    )
  }
}

// Reject other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
