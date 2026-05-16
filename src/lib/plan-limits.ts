/**
 * Server-side plan limits and feature gating.
 *
 * All subscription plan enforcement MUST go through these utilities on the
 * server side.  Client-side checks (subscription-store.ts) are for UX only
 * and can be bypassed by modifying Zustand state in the browser.
 *
 * Usage in API routes:
 *
 *   const plan = await getUserPlan(request)
 *   const { allowed, limit } = checkPlanLimit(plan, 'families', currentCount)
 *   if (!allowed) return NextResponse.json({ error: 'Plan limit reached' }, { status: 403 })
 */

import { db } from '@/lib/db'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'

// ─── Plan Limits ─────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  free: { families: 1, members: 4, tasks: 50, storage: 100 * 1024 * 1024, aiCalls: 5, mealPlans: 0 },
  pro: { families: 3, members: 8, tasks: 500, storage: 5 * 1024 * 1024 * 1024, aiCalls: 100, mealPlans: 4 },
  family_plus: { families: 5, members: 20, tasks: Infinity, storage: 20 * 1024 * 1024 * 1024, aiCalls: Infinity, mealPlans: Infinity },
} as const

export type PlanTier = keyof typeof PLAN_LIMITS

export type PlanResource = keyof typeof PLAN_LIMITS.free

// ─── Tier Ordering ───────────────────────────────────────────────────────

const TIER_ORDER: PlanTier[] = ['free', 'pro', 'family_plus']

// ─── getUserPlan ─────────────────────────────────────────────────────────

/**
 * Resolve the user's current plan tier from the server-side database.
 * Falls back to 'free' when unauthenticated, when no subscription exists,
 * or when the subscription has expired.
 */
export async function getUserPlan(request: NextRequest): Promise<PlanTier> {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return 'free'

  try {
    const sub = await db.userSubscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing'] } },
      orderBy: { createdAt: 'desc' },
    })
    if (!sub) return 'free'
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) return 'free'
    return (sub.plan as PlanTier) || 'free'
  } catch {
    return 'free'
  }
}

// ─── checkPlanLimit ──────────────────────────────────────────────────────

/**
 * Check whether a user on the given plan is allowed to create one more
 * instance of `resource` given the `currentCount`.
 */
export function checkPlanLimit(
  plan: PlanTier,
  resource: PlanResource,
  currentCount: number,
): { allowed: boolean; limit: number } {
  const limits = PLAN_LIMITS[plan]
  const limit = limits[resource]
  return { allowed: currentCount < limit, limit }
}

// ─── requirePlanAccess ───────────────────────────────────────────────────

/**
 * Require that the user's plan meets or exceeds `minPlan`.
 * Returns `{ ok: true, plan }` when allowed, or `{ ok: false, error }`
 * with a 403 NextResponse when denied.
 */
export async function requirePlanAccess(
  request: NextRequest,
  minPlan: PlanTier,
): Promise<{ ok: true; plan: PlanTier } | { ok: false; error: NextResponse }> {
  const plan = await getUserPlan(request)
  if (TIER_ORDER.indexOf(plan) >= TIER_ORDER.indexOf(minPlan)) {
    return { ok: true, plan }
  }
  return {
    ok: false,
    error: NextResponse.json(
      { error: 'This feature requires a higher plan', requiredPlan: minPlan, currentPlan: plan },
      { status: 403 },
    ),
  }
}

// ─── getCurrentFamilyCount ───────────────────────────────────────────────

/** Count how many families the user currently owns or belongs to. */
export async function getCurrentFamilyCount(userId: string): Promise<number> {
  try {
    return await db.familyMember.count({ where: { userId } })
  } catch {
    return 0
  }
}

// ─── getCurrentTaskCount ─────────────────────────────────────────────────

/**
 * Count the user's current tasks.  Because tasks live in Zustand on the
 * client, the caller must pass in the current count from the request body.
 * This function exists purely for API-route convenience when the count is
 * already known.
 */
// (no DB query needed — the count comes from the client request body)

// ─── getCurrentStorageUsage ──────────────────────────────────────────────

/**
 * Calculate the user's current storage usage.  Because files are tracked
 * client-side, the caller must pass in the current usage in bytes from
 * the request body.
 */
// (no DB query needed — the usage comes from the client request body)
