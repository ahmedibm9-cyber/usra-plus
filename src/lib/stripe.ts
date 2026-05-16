/**
 * Stripe Server Library for USRA PLUS
 *
 * Handles all Stripe operations: customer management, checkout sessions,
 * billing portal, and subscription lifecycle management.
 *
 * IMPORTANT: This module MUST only be used on the server side.
 */

import Stripe from 'stripe'
import { db } from '@/lib/db'

// ─── Stripe Initialization ────────────────────────────────────────────────────

/**
 * Check if Stripe is properly configured (has a secret key).
 * Use this in API routes to return a graceful error when Stripe is not set up.
 */
export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_'))
}

/**
 * Lazy-initialized Stripe client.
 * Only creates the Stripe instance when first accessed, so that routes that
 * don't use Stripe don't crash when STRIPE_SECRET_KEY is not set.
 */
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-04-30.basil',
      typescript: true,
    })
  }
  return _stripe
}

/**
 * Convenience alias for getStripe().
 * Use getStripe() for explicit lazy initialization, or stripe for brevity
 * in code that is only called when Stripe is configured.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as Record<string, unknown>)[prop as string]
  },
})

// ─── Plan Configuration ───────────────────────────────────────────────────────

export const PLAN_CONFIG = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    name: 'Pro',
    monthlyPrice: 4.99,
    currency: 'usd',
  },
  family_plus: {
    priceId: process.env.STRIPE_FAMILY_PLUS_PRICE_ID || '',
    name: 'Family+',
    monthlyPrice: 9.99,
    currency: 'usd',
  },
} as const

export type StripePlanId = keyof typeof PLAN_CONFIG

// ─── Trial Configuration ──────────────────────────────────────────────────────

const TRIAL_DAYS = 7

// ─── Helper: Map Stripe price ID to plan ──────────────────────────────────────

export function mapStripePriceToPlan(priceId: string): StripePlanId | null {
  for (const [planId, config] of Object.entries(PLAN_CONFIG)) {
    if (config.priceId === priceId) {
      return planId as StripePlanId
    }
  }
  return null
}

// ─── Get or Create Stripe Customer ────────────────────────────────────────────

/**
 * Find an existing Stripe customer for the given user, or create a new one.
 * Stores the stripeCustomerId on the UserSubscription record.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  // Check if user already has a Stripe customer ID in our DB
  const existingSub = await db.userSubscription.findFirst({
    where: { userId, stripeCustomerId: { not: null } },
  })

  if (existingSub?.stripeCustomerId) {
    return existingSub.stripeCustomerId
  }

  // Check if a Stripe customer already exists with this email
  const existingCustomers = await getStripe().customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    const customerId = existingCustomers.data[0].id

    // Update our DB with the found customer ID
    if (existingSub) {
      await db.userSubscription.update({
        where: { id: existingSub.id },
        data: { stripeCustomerId: customerId },
      })
    }

    return customerId
  }

  // Create a new Stripe customer
  const customer = await getStripe().customers.create({
    email,
    metadata: {
      userId,
    },
  })

  // Update our DB with the new customer ID
  if (existingSub) {
    await db.userSubscription.update({
      where: { id: existingSub.id },
      data: { stripeCustomerId: customer.id },
    })
  }

  return customer.id
}

// ─── Create Checkout Session ──────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session for subscription creation.
 * Includes a trial period for first-time subscribers.
 */
export async function createCheckoutSession(params: {
  customerId: string
  planId: StripePlanId
  userId: string
  baseUrl: string
}): Promise<{ url: string; sessionId: string }> {
  const { customerId, planId, userId, baseUrl } = params
  const planConfig = PLAN_CONFIG[planId]

  if (!planConfig || !planConfig.priceId) {
    throw new Error(`Invalid plan ID or missing price configuration: ${planId}`)
  }

  // Check if the user has ever had a subscription (for trial eligibility)
  const hasHadSubscription = await db.userSubscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing', 'cancelled', 'past_due'] },
    },
  })

  const trialDays = hasHadSubscription ? 0 : TRIAL_DAYS

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    ...(trialDays > 0 && {
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          userId,
          planId,
        },
      },
    }),
    success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
    metadata: {
      userId,
      planId,
    },
    allow_promotion_codes: true,
  })

  return {
    url: session.url || '',
    sessionId: session.id,
  }
}

// ─── Create Billing Portal Session ────────────────────────────────────────────

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 * Allows cancellation, payment method updates, and invoice history.
 */
export async function createBillingPortalSession(params: {
  customerId: string
  baseUrl: string
}): Promise<{ url: string }> {
  const { customerId, baseUrl } = params

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: baseUrl,
  })

  return { url: session.url }
}

// ─── Create/Configure Customer Portal Configuration ───────────────────────────

/**
 * Ensure a portal configuration exists that allows:
 * - Subscription cancellation
 * - Payment method updates
 * - Invoice history
 * - Plan upgrades/downgrades
 */
let _portalConfigId: string | null = null

export async function getPortalConfigurationId(): Promise<string> {
  if (_portalConfigId) return _portalConfigId

  // List existing configurations
  const configs = await getStripe().billingPortal.configurations.list({
    active: true,
    limit: 10,
  })

  // Look for one created by us (identified by metadata)
  const existingConfig = configs.data.find(
    (c) => c.metadata?.app === 'usra-plus',
  )

  if (existingConfig) {
    _portalConfigId = existingConfig.id
    return _portalConfigId
  }

  // Get all active prices for the features
  const prices = Object.values(PLAN_CONFIG)
    .filter((p) => p.priceId)
    .map((p) => p.priceId)

  // Create a new configuration
  const config = await getStripe().billingPortal.configurations.create({
    metadata: { app: 'usra-plus' },
    features: {
      payment_method_update: {
        enabled: true,
      },
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'address'],
      },
      invoice_history: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: [
            'too_expensive',
            'missing_features',
            'switched_service',
            'unused',
            'other',
          ],
        },
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price', 'promotion_code'],
        prices: prices.map((price) => ({ price })),
      },
    },
  })

  _portalConfigId = config.id
  return _portalConfigId
}

/**
 * Create a billing portal session with full configuration for
 * cancellation, upgrades, and downgrades.
 */
export async function createCustomerPortalSession(params: {
  customerId: string
  baseUrl: string
}): Promise<{ url: string }> {
  const { customerId, baseUrl } = params
  const configurationId = await getPortalConfigurationId()

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: baseUrl,
    configuration: configurationId,
  })

  return { url: session.url }
}

// ─── Subscription Lifecycle Handlers ──────────────────────────────────────────

/**
 * Handle checkout.session.completed — create or update UserSubscription.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId as StripePlanId | undefined

  if (!userId || !planId) {
    console.error('[Stripe] Missing userId or planId in checkout session metadata')
    return
  }

  const subscription = await getStripe().subscriptions.retrieve(
    session.subscription as string,
  )

  const planConfig = PLAN_CONFIG[planId]
  const trialStart = subscription.trial_start
    ? new Date(subscription.trial_start * 1000)
    : null
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null

  // Upsert the subscription record
  const existingSub = await db.userSubscription.findFirst({
    where: { userId },
  })

  if (existingSub) {
    await db.userSubscription.update({
      where: { id: existingSub.id },
      data: {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id || null,
        plan: planId,
        status: subscription.status === 'trialing' ? 'trialing' : 'active',
        productIdentifier: subscription.items.data[0]?.price.product as string,
        store: 'stripe',
        periodType: 'monthly',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart,
        trialEnd,
        autoRenew: !subscription.cancel_at_period_end,
        price: planConfig.monthlyPrice,
        currency: planConfig.currency.toUpperCase(),
        lastRevenuecatEvent: 'checkout_completed',
        lastEventAt: new Date(),
      },
    })
  } else {
    await db.userSubscription.create({
      data: {
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id || null,
        plan: planId,
        status: subscription.status === 'trialing' ? 'trialing' : 'active',
        productIdentifier: subscription.items.data[0]?.price.product as string,
        store: 'stripe',
        periodType: 'monthly',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart,
        trialEnd,
        autoRenew: !subscription.cancel_at_period_end,
        price: planConfig.monthlyPrice,
        currency: planConfig.currency.toUpperCase(),
        lastRevenuecatEvent: 'checkout_completed',
        lastEventAt: new Date(),
      },
    })
  }

  console.log(`[Stripe] Checkout completed: user=${userId}, plan=${planId}`)
}

/**
 * Handle customer.subscription.created — update subscription record.
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('[Stripe] Missing userId in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const planId = mapStripePriceToPlan(priceId || '') || 'free'
  const planConfig = PLAN_CONFIG[planId as StripePlanId]

  const existingSub = await db.userSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (existingSub) {
    await db.userSubscription.update({
      where: { id: existingSub.id },
      data: {
        plan: planId,
        status: subscription.status === 'trialing' ? 'trialing' : 'active',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        autoRenew: !subscription.cancel_at_period_end,
        lastRevenuecatEvent: 'subscription_created',
        lastEventAt: new Date(),
      },
    })
  } else {
    await db.userSubscription.create({
      data: {
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId || null,
        plan: planId,
        status: subscription.status === 'trialing' ? 'trialing' : 'active',
        productIdentifier: subscription.items.data[0]?.price.product as string || null,
        store: 'stripe',
        periodType: 'monthly',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        autoRenew: !subscription.cancel_at_period_end,
        price: planConfig?.monthlyPrice || null,
        currency: planConfig?.currency.toUpperCase() || 'USD',
        lastRevenuecatEvent: 'subscription_created',
        lastEventAt: new Date(),
      },
    })
  }

  console.log(`[Stripe] Subscription created: id=${subscription.id}, plan=${planId}`)
}

/**
 * Handle customer.subscription.updated — update plan if price changed, update status.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const existingSub = await db.userSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!existingSub) {
    // Might be a subscription created via Stripe Dashboard without metadata
    // Try to find by customer ID
    const byCustomer = await db.userSubscription.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
    })
    if (!byCustomer) {
      console.warn('[Stripe] Subscription updated but no matching record found:', subscription.id)
      return
    }
  }

  const priceId = subscription.items.data[0]?.price.id
  const planId = mapStripePriceToPlan(priceId || '')
  const planConfig = planId ? PLAN_CONFIG[planId] : null

  const updateData: Record<string, unknown> = {
    stripePriceId: priceId || null,
    status: mapStripeStatus(subscription.status),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    autoRenew: !subscription.cancel_at_period_end,
    lastRevenuecatEvent: 'subscription_updated',
    lastEventAt: new Date(),
  }

  // Update plan if price changed and we can map it
  if (planId) {
    updateData.plan = planId
    updateData.price = planConfig.monthlyPrice
    updateData.currency = planConfig.currency.toUpperCase()
  }

  const target = existingSub || await db.userSubscription.findFirst({
    where: { stripeCustomerId: subscription.customer as string },
  })

  if (target) {
    await db.userSubscription.update({
      where: { id: target.id },
      data: updateData,
    })
  }

  console.log(`[Stripe] Subscription updated: id=${subscription.id}, status=${subscription.status}`)
}

/**
 * Handle customer.subscription.deleted — set plan=free, status=cancelled.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const existingSub = await db.userSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!existingSub) {
    console.warn('[Stripe] Subscription deleted but no matching record found:', subscription.id)
    return
  }

  await db.userSubscription.update({
    where: { id: existingSub.id },
    data: {
      plan: 'free',
      status: 'cancelled',
      autoRenew: false,
      cancellationReason: subscription.cancellation_details?.reason || 'user_cancelled',
      lastRevenuecatEvent: 'subscription_deleted',
      lastEventAt: new Date(),
    },
  })

  console.log(`[Stripe] Subscription deleted: id=${subscription.id}, user=${existingSub.userId}`)
}

/**
 * Handle invoice.payment_succeeded — record RevenueTransaction.
 */
export async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = invoice.customer as string

  // Find the user subscription by Stripe customer ID
  const sub = await db.userSubscription.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!sub) {
    console.warn('[Stripe] Payment succeeded but no subscription found for customer:', customerId)
    return
  }

  // Record the revenue transaction
  await db.revenueTransaction.create({
    data: {
      userId: sub.userId,
      subscriptionId: sub.id,
      type: 'payment',
      amount: (invoice.amount_paid || 0) / 100, // Stripe amounts are in cents
      currency: invoice.currency?.toUpperCase() || 'USD',
      originalAmount: (invoice.subtotal || 0) / 100,
      discountAmount: (invoice.total_discount_amounts?.reduce(
        (sum, d) => sum + d.amount,
        0,
      ) || 0) / 100,
      paymentProvider: 'stripe',
      status: 'completed',
      description: `Stripe invoice ${invoice.number || invoice.id}`,
    },
  })

  console.log(`[Stripe] Payment succeeded: invoice=${invoice.id}, amount=${invoice.amount_paid}`)
}

/**
 * Handle invoice.payment_failed — mark subscription as past_due.
 */
export async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = invoice.customer as string

  const sub = await db.userSubscription.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!sub) {
    console.warn('[Stripe] Payment failed but no subscription found for customer:', customerId)
    return
  }

  await db.userSubscription.update({
    where: { id: sub.id },
    data: {
      status: 'past_due',
      lastRevenuecatEvent: 'payment_failed',
      lastEventAt: new Date(),
    },
  })

  // Record the failed payment
  await db.revenueTransaction.create({
    data: {
      userId: sub.userId,
      subscriptionId: sub.id,
      type: 'payment',
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency?.toUpperCase() || 'USD',
      paymentProvider: 'stripe',
      status: 'failed',
      description: `Failed payment — Stripe invoice ${invoice.number || invoice.id}`,
    },
  })

  console.log(`[Stripe] Payment failed: invoice=${invoice.id}, customer=${customerId}`)
}

/**
 * Handle customer.subscription.trial_will_end — log trial ending.
 */
export async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
): Promise<void> {
  const existingSub = await db.userSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!existingSub) return

  await db.userSubscription.update({
    where: { id: existingSub.id },
    data: {
      lastRevenuecatEvent: 'trial_will_end',
      lastEventAt: new Date(),
    },
  })

  console.log(`[Stripe] Trial will end: subscription=${subscription.id}, user=${existingSub.userId}`)
}

/**
 * Handle customer.deleted — clean up subscription records.
 */
export async function handleCustomerDeleted(
  customer: Stripe.Customer,
): Promise<void> {
  const customerId = customer.id

  const sub = await db.userSubscription.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!sub) return

  await db.userSubscription.update({
    where: { id: sub.id },
    data: {
      plan: 'free',
      status: 'cancelled',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      autoRenew: false,
      lastRevenuecatEvent: 'customer_deleted',
      lastEventAt: new Date(),
    },
  })

  console.log(`[Stripe] Customer deleted: id=${customerId}, user=${sub.userId}`)
}

// ─── Helper: Map Stripe Status to Our Status ──────────────────────────────────

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
): string {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'cancelled'
    case 'unpaid':
      return 'unpaid'
    case 'paused':
      return 'paused'
    case 'incomplete':
      return 'incomplete'
    case 'incomplete_expired':
      return 'expired'
    default:
      return stripeStatus
  }
}

// ─── Get Subscription Details from Stripe ─────────────────────────────────────

/**
 * Retrieve full subscription details from Stripe API.
 * Used by the /api/stripe/subscription endpoint.
 */
export async function getStripeSubscriptionDetails(
  stripeSubscriptionId: string,
): Promise<{
  plan: string
  status: string
  currentPeriodEnd: Date | null
  currentPeriodStart: Date | null
  cancelAtPeriodEnd: boolean
  trialEnd: Date | null
  priceId: string | null
}> {
  try {
    const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId)

    const priceId = subscription.items.data[0]?.price.id || null
    const planId = mapStripePriceToPlan(priceId || '')

    return {
      plan: planId || 'free',
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      priceId,
    }
  } catch {
    return {
      plan: 'free',
      status: 'unknown',
      currentPeriodEnd: null,
      currentPeriodStart: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      priceId: null,
    }
  }
}
