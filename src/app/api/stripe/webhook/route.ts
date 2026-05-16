/**
 * Stripe Webhook API Route
 *
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription lifecycle management.
 *
 * IMPORTANT: This route does NOT have CSRF protection because Stripe
 * does not send Origin headers. Instead, we verify the webhook
 * signature using STRIPE_WEBHOOK_SECRET.
 *
 * Email notifications are fired after each event handler completes.
 * All email sends are fire-and-forget — they never block webhook
 * processing or affect the response to Stripe.
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe, PLAN_CONFIG } from '@/lib/stripe'
import type { StripePlanId } from '@/lib/stripe'
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleTrialWillEnd,
  handleCustomerDeleted,
} from '@/lib/stripe'
import {
  sendSubscriptionConfirmation,
  sendPaymentFailed as sendPaymentFailedEmail,
  sendTrialEndingSoon,
  sendAdminAlert,
} from '@/lib/email'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Disable body parsing — we need the raw body for signature verification
export const runtime = 'nodejs'

// Processed event IDs — prevents duplicate processing on retry
const processedEvents = new Set<string>()
const MAX_PROCESSED_EVENTS = 1000

/**
 * Format a plan amount for display in email (e.g. "$4.99" or "9.99 SAR").
 */
function formatAmount(price: number, currency: string): string {
  const upperCurrency = currency.toUpperCase()
  if (upperCurrency === 'USD') {
    return `$${price.toFixed(2)}`
  }
  return `${price.toFixed(2)} ${upperCurrency}`
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()

  const signature = headersList.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    logger.error('[Stripe Webhook]', 'Missing signature or webhook secret')
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 },
    )
  }

  // Verify webhook signature
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Stripe Webhook]', 'Signature verification failed', err instanceof Error ? err : new Error(message))
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 },
    )
  }

  // Idempotency: skip already-processed events
  if (processedEvents.has(event.id)) {
    logger.info('[Stripe Webhook]', `Skipping duplicate event: ${event.type} (${event.id})`)
    return NextResponse.json({ received: true, skipped: true })
  }
  processedEvents.add(event.id)
  // Prevent memory leak — keep only last N events
  if (processedEvents.size > MAX_PROCESSED_EVENTS) {
    const iterator = processedEvents.values()
    iterator.next()
    processedEvents.delete(iterator.next().value)
  }

  // Process the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)

        // Send subscription confirmation email
        const userId = session.metadata?.userId
        const planId = session.metadata?.planId as StripePlanId | undefined
        if (userId && planId) {
          const planConfig = PLAN_CONFIG[planId]
          if (planConfig) {
            db.user.findUnique({ where: { id: userId } }).then((user) => {
              if (user?.email) {
                sendSubscriptionConfirmation(
                  user.email,
                  planConfig.name,
                  formatAmount(planConfig.monthlyPrice, planConfig.currency),
                  (user.language as 'en' | 'ar') || 'en',
                ).catch(() => {})
              }
            }).catch(() => {})
          }
        }
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)

        // Send payment failed email
        const customerId = invoice.customer as string
        db.userSubscription.findFirst({
          where: { stripeCustomerId: customerId },
        }).then((sub) => {
          if (sub?.userId) {
            db.user.findUnique({ where: { id: sub.userId } }).then((user) => {
              if (user?.email) {
                const planName = sub.plan === 'family_plus' ? 'Family+' : sub.plan === 'pro' ? 'Pro' : 'Free'
                sendPaymentFailedEmail(
                  user.email,
                  planName,
                  (user.language as 'en' | 'ar') || 'en',
                ).catch(() => {})
              }
            }).catch(() => {})
          }
        }).catch(() => {})
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        await handleTrialWillEnd(subscription)

        // Send trial ending soon email
        db.userSubscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        }).then((sub) => {
          if (sub?.userId) {
            db.user.findUnique({ where: { id: sub.userId } }).then((user) => {
              if (user?.email && subscription.trial_end) {
                const now = Math.floor(Date.now() / 1000)
                const daysLeft = Math.max(1, Math.ceil((subscription.trial_end - now) / 86400))
                const planName = sub.plan === 'family_plus' ? 'Family+' : sub.plan === 'pro' ? 'Pro' : 'Free'
                sendTrialEndingSoon(
                  user.email,
                  daysLeft,
                  planName,
                  (user.language as 'en' | 'ar') || 'en',
                ).catch(() => {})
              }
            }).catch(() => {})
          }
        }).catch(() => {})
        break
      }

      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer
        await handleCustomerDeleted(customer)
        break
      }

      default:
        logger.info('[Stripe Webhook]', `Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Stripe Webhook]', `Error processing event ${event.type}`, err instanceof Error ? err : new Error(errorMessage))

    // Send admin alert for webhook processing errors (fire-and-forget)
    sendAdminAlert(
      'stripe_webhook_error',
      `Event type: ${event.type}\nEvent ID: ${event.id}\nError: ${errorMessage}`,
    ).catch(() => {})

    // Return 500 so Stripe retries the webhook
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    )
  }

  // Return 200 to acknowledge receipt of the event
  return NextResponse.json({ received: true })
}
