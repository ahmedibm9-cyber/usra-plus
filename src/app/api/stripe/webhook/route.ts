/**
 * Stripe Webhook API Route
 *
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription lifecycle management.
 *
 * IMPORTANT: This route does NOT have CSRF protection because Stripe
 * does not send Origin headers. Instead, we verify the webhook
 * signature using STRIPE_WEBHOOK_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
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

// Disable body parsing — we need the raw body for signature verification
export const runtime = 'nodejs'

// Processed event IDs — prevents duplicate processing on retry
const processedEvents = new Set<string>()
const MAX_PROCESSED_EVENTS = 1000

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()

  const signature = headersList.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    console.error('[Stripe Webhook] Missing signature or webhook secret')
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
    console.error('[Stripe Webhook] Signature verification failed:', message)
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 },
    )
  }

  // Idempotency: skip already-processed events
  if (processedEvents.has(event.id)) {
    console.log(`[Stripe Webhook] Skipping duplicate event: ${event.type} (${event.id})`)
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
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        await handleTrialWillEnd(subscription)
        break
      }

      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer
        await handleCustomerDeleted(customer)
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(
      `[Stripe Webhook] Error processing event ${event.type}:`,
      err,
    )
    // Return 500 so Stripe retries the webhook
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    )
  }

  // Return 200 to acknowledge receipt of the event
  return NextResponse.json({ received: true })
}
