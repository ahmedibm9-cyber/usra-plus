/**
 * Server-side plan limits and feature gating.
 *
 * All subscription plan enforcement MUST go through these utilities on the
 * server side.  Client-side checks (subscription-store.ts) are for UX only
 * and can be bypassed by modifying Zustand state in the browser.
 *
 * Usage in API routes:
 *
 *   const result = await checkPlanLimitServerSide(request, 'tasks')
 *   if (!result.allowed) return NextResponse.json({ error: 'Plan limit reached' }, { status: 403 })
 */

import { db } from '@/lib/db'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
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

// ─── Server-Side Resource Counting ───────────────────────────────────────

/**
 * Helper: Get the family IDs the user belongs to.
 * Tries Prisma first (local dev / SQLite), then falls back to Supabase.
 * Returns an empty array if neither database is available.
 */
async function getUserFamilyIds(userId: string): Promise<string[]> {
  // Try Prisma first
  try {
    const memberships = await db.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    })
    return memberships.map((m) => m.familyId)
  } catch {
    // Prisma unavailable — try Supabase
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return []

  try {
    const { data } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)

    return (data || []).map((m: { family_id: string }) => m.family_id)
  } catch {
    return []
  }
}

// ─── getCurrentFamilyCount ───────────────────────────────────────────────

/** Count how many families the user currently owns or belongs to. */
export async function getCurrentFamilyCount(userId: string): Promise<number> {
  try {
    return await db.familyMember.count({ where: { userId } })
  } catch {
    // Prisma unavailable — try Supabase
    const supabase = getSupabaseAdmin()
    if (!supabase) return 0

    try {
      const { count, error } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (error) return 0
      return count ?? 0
    } catch {
      return 0
    }
  }
}

// ─── getCurrentMemberCount ───────────────────────────────────────────────

/**
 * Count the total number of members across all families the user belongs to.
 * Uses Prisma FamilyMember (available in both SQLite and PostgreSQL modes).
 * Falls back to Supabase when Prisma is unavailable.
 */
export async function getCurrentMemberCount(userId: string): Promise<number> {
  const familyIds = await getUserFamilyIds(userId)
  if (familyIds.length === 0) return 0

  // Try Prisma first
  try {
    return await db.familyMember.count({
      where: { familyId: { in: familyIds } },
    })
  } catch {
    // Prisma unavailable — try Supabase
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return Infinity

  try {
    const { count, error } = await supabase
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .in('family_id', familyIds)

    if (error) return Infinity
    return count ?? 0
  } catch {
    return Infinity
  }
}

// ─── getCurrentTaskCount ─────────────────────────────────────────────────

/**
 * Count the user's current tasks from the server side.
 *
 * Tasks exist in the Supabase `tasks` table (created_by, family_id) but
 * there is NO Task model in Prisma.  We query Supabase for an authoritative
 * count.  If Supabase is unavailable (e.g., local dev with SQLite only),
 * we return Infinity to indicate the limit cannot be enforced server-side,
 * rather than returning 0 which would be misleading and allow bypass.
 *
 * SECURITY: The previous implementation accepted currentTaskCount from the
 * client request body, which allowed trivial bypass by sending { currentTaskCount: 0 }.
 *
 * TODO: Add a Task model to Prisma to enable server-side plan limit
 * enforcement for tasks in all environments, not just Supabase-backed ones.
 */
export async function getCurrentTaskCount(userId: string): Promise<number> {
  const familyIds = await getUserFamilyIds(userId)
  if (familyIds.length === 0) return 0

  // No Task model in Prisma — must use Supabase
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    // Cannot verify task count server-side without Supabase.
    // Return Infinity to indicate the limit cannot be enforced,
    // rather than 0 which would be misleading.
    return Infinity
  }

  try {
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('family_id', familyIds)

    if (error) {
      // Table might not exist yet in this Supabase project
      return Infinity
    }

    return count ?? 0
  } catch {
    return Infinity
  }
}

// ─── getCurrentStorageUsage ──────────────────────────────────────────────

/**
 * Calculate the user's current storage usage in bytes from the server side.
 *
 * Files exist in the Supabase `family_files` table (file_size, family_id)
 * but there is NO File model in Prisma.  We query Supabase for an
 * authoritative sum.  If Supabase is unavailable, we return Infinity to
 * indicate the limit cannot be enforced server-side.
 *
 * SECURITY: The previous implementation accepted currentStorageBytes from the
 * client request body, which allowed trivial bypass by sending { currentStorageBytes: 0 }.
 *
 * TODO: Add a File model to Prisma to enable server-side storage limit
 * enforcement in all environments.
 */
export async function getCurrentStorageUsage(userId: string): Promise<number> {
  const familyIds = await getUserFamilyIds(userId)
  if (familyIds.length === 0) return 0

  // No File model in Prisma — must use Supabase
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    // Cannot verify storage usage server-side without Supabase.
    return Infinity
  }

  try {
    // Fetch file_size for all files in the user's families
    const { data, error } = await supabase
      .from('family_files')
      .select('file_size')
      .in('family_id', familyIds)

    if (error) {
      // Table might not exist yet
      return Infinity
    }

    // Sum all file sizes (file_size is stored as integer bytes)
    const totalBytes = (data || []).reduce(
      (sum: number, file: { file_size: number | null }) => sum + (file.file_size || 0),
      0,
    )

    return totalBytes
  } catch {
    return Infinity
  }
}

// ─── getCurrentAICallCount ───────────────────────────────────────────────

/**
 * Count the user's AI API calls for rate limiting.
 *
 * SECURITY NOTE: There is currently no AI call log table in either Prisma
 * or Supabase.  We return Infinity to indicate the limit cannot be enforced
 * server-side.  This is more honest than returning 0, which would imply
 * the user has made 0 AI calls and is always allowed.
 *
 * TODO: Add an AICallLog model/table to track AI API usage per user,
 * then implement proper server-side counting here.
 */
export async function getCurrentAICallCount(_userId: string): Promise<number> {
  // No AI call log table exists — cannot verify server-side.
  // Return Infinity (limit cannot be enforced) rather than 0 (misleading).
  return Infinity
}

// ─── getCurrentMealPlanCount ─────────────────────────────────────────────

/**
 * Count the user's meal plans from the server side.
 *
 * Meal plans exist in the Supabase `meal_plans` table (family_id, created_by)
 * but there is NO MealPlan model in Prisma.  We query Supabase for an
 * authoritative count.  If Supabase is unavailable, we return Infinity.
 *
 * TODO: Add a MealPlan model to Prisma to enable server-side meal plan
 * limit enforcement in all environments.
 */
export async function getCurrentMealPlanCount(userId: string): Promise<number> {
  const familyIds = await getUserFamilyIds(userId)
  if (familyIds.length === 0) return 0

  // No MealPlan model in Prisma — must use Supabase
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    // Cannot verify meal plan count server-side without Supabase.
    return Infinity
  }

  try {
    const { count, error } = await supabase
      .from('meal_plans')
      .select('*', { count: 'exact', head: true })
      .in('family_id', familyIds)

    if (error) {
      // Table might not exist yet
      return Infinity
    }

    return count ?? 0
  } catch {
    return Infinity
  }
}

// ─── checkPlanLimitServerSide ────────────────────────────────────────────

/**
 * Perform a full server-side plan limit check for the given resource.
 *
 * This is the RECOMMENDED way to enforce plan limits in API routes.
 * It resolves the user's identity, plan, and current resource count
 * entirely on the server — no client-provided values are trusted.
 *
 * Returns:
 *   - `{ allowed: true, limit, current }` when the user is under the limit
 *   - `{ allowed: false, limit, current }` when the limit is reached
 *   - `{ allowed: false, limit: 0, current: 0 }` when unauthenticated
 *
 * Example usage:
 *
 *   const result = await checkPlanLimitServerSide(request, 'tasks')
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: 'Plan limit reached', ...result }, { status: 403 })
 *   }
 */
export async function checkPlanLimitServerSide(
  request: NextRequest,
  resource: PlanResource,
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return { allowed: false, limit: 0, current: 0 }

  const plan = await getUserPlan(request)
  const limits = PLAN_LIMITS[plan]
  const limit = limits[resource]

  let current = 0
  switch (resource) {
    case 'families':
      current = await getCurrentFamilyCount(userId)
      break
    case 'members':
      current = await getCurrentMemberCount(userId)
      break
    case 'tasks':
      current = await getCurrentTaskCount(userId)
      break
    case 'storage':
      current = await getCurrentStorageUsage(userId)
      break
    case 'aiCalls':
      current = await getCurrentAICallCount(userId)
      break
    case 'mealPlans':
      current = await getCurrentMealPlanCount(userId)
      break
  }

  return { allowed: current < limit, limit, current }
}
