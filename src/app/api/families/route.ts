import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getUserPlan, checkPlanLimit, getCurrentFamilyCount } from '@/lib/plan-limits'
import type { PlanResource } from '@/lib/plan-limits'

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Generate a random 8-character alphanumeric uppercase invite code */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/** Convert a Prisma Family object to snake_case for client compatibility */
function serializeFamily(family: {
  id: string
  name: string
  description: string | null
  inviteCode: string
  avatarUrl: string | null
  color: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: family.id,
    name: family.name,
    description: family.description,
    invite_code: family.inviteCode,
    avatar_url: family.avatarUrl,
    color: family.color,
    created_by: family.createdBy,
    created_at: family.createdAt.toISOString(),
    updated_at: family.updatedAt.toISOString(),
  }
}

/** Convert a Supabase family row to snake_case for client compatibility */
function serializeSupabaseFamily(family: Record<string, unknown>) {
  return {
    id: family.id as string,
    name: family.name as string,
    description: (family.description as string) || null,
    invite_code: (family.invite_code as string) || '',
    avatar_url: (family.avatar_url as string) || null,
    color: (family.color as string) || 'signal',
    created_by: (family.created_by as string) || '',
    created_at: (family.created_at as string) || new Date().toISOString(),
    updated_at: (family.updated_at as string) || new Date().toISOString(),
  }
}

// ─── POST: Create Family ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = auth.userId
    const body = await req.json()
    const { name, description } = body as { name?: string; description?: string }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Family name is required' },
        { status: 400 }
      )
    }

    // ─── Server-side plan limit check ────────────────────────────────────
    const plan = await getUserPlan(req)
    const currentFamilyCount = await getCurrentFamilyCount(userId)
    const { allowed, limit } = checkPlanLimit(plan, 'families', currentFamilyCount)
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Family limit reached for your plan',
          currentPlan: plan,
          limit,
          currentCount: currentFamilyCount,
          upgradeRequired: true,
        },
        { status: 403 },
      )
    }

    // Try Prisma first (local dev with SQLite)
    try {
      // Verify the user exists
      const user = await db.user.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Generate unique invite code
      let inviteCode = generateInviteCode()
      let attempts = 0
      while (attempts < 10) {
        const existing = await db.family.findUnique({ where: { inviteCode } })
        if (!existing) break
        inviteCode = generateInviteCode()
        attempts++
      }

      // Create the family and add the creator as owner in a transaction
      const family = await db.$transaction(async (tx) => {
        const newFamily = await tx.family.create({
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            inviteCode,
            createdBy: userId,
          },
        })

        await tx.familyMember.create({
          data: {
            familyId: newFamily.id,
            userId,
            role: 'owner',
          },
        })

        return newFamily
      })

      return NextResponse.json(
        { family: serializeFamily(family) },
        { status: 201 }
      )
    } catch (prismaError) {
      // Prisma unavailable (likely on Vercel) — use Supabase REST API
      console.log('[Families API] Prisma unavailable, using Supabase REST API')
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('No database available')
      }

      // Verify user exists in Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (!profile) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Generate unique invite code
      let inviteCode = generateInviteCode()
      let attempts = 0
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('families')
          .select('id')
          .eq('invite_code', inviteCode)
          .maybeSingle()
        if (!existing) break
        inviteCode = generateInviteCode()
        attempts++
      }

      // Create the family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          invite_code: inviteCode,
          created_by: userId,
        })
        .select()
        .single()

      if (familyError || !family) {
        console.error('[Families API] Supabase family creation error:', familyError)
        return NextResponse.json(
          { error: familyError?.message || 'Failed to create family' },
          { status: 500 }
        )
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          user_id: userId,
          role: 'owner',
        })

      if (memberError) {
        console.error('[Families API] Supabase member insert error:', memberError)
        // Try to clean up the family if member insert fails
        await supabase.from('families').delete().eq('id', family.id)
        return NextResponse.json(
          { error: memberError.message || 'Failed to add you as family owner' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { family: serializeSupabaseFamily(family) },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('[Families API] Create error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── PUT: Join Family ───────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = auth.userId
    const body = await req.json()
    const { inviteCode } = body as { inviteCode?: string }

    if (!inviteCode || typeof inviteCode !== 'string' || !inviteCode.trim()) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // ─── Server-side plan limit check (members) ──────────────────────────
    // We need to check the family owner's plan to enforce the member limit.
    // We do this after finding the family so we know who the owner is.

    // Try Prisma first
    try {
      // Find the family by invite code
      const family = await db.family.findUnique({
        where: { inviteCode: inviteCode.trim().toUpperCase() },
        include: { members: true },
      })

      if (!family) {
        return NextResponse.json(
          { error: 'Invalid invite code' },
          { status: 404 }
        )
      }

      // Check if already a member
      const existingMember = await db.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: family.id,
            userId,
          },
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'Already a member of this family' },
          { status: 409 }
        )
      }

      // ─── Check member limit for the family owner's plan ────────────────
      const ownerPlan = await getUserPlan(req)
      const memberLimit = checkPlanLimit(ownerPlan, 'members' as PlanResource, family.members.length)
      if (!memberLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Member limit reached for your plan',
            currentPlan: ownerPlan,
            limit: memberLimit.limit,
            currentCount: family.members.length,
            upgradeRequired: true,
          },
          { status: 403 },
        )
      }

      // Add as member (Prisma path)
      await db.familyMember.create({
        data: {
          familyId: family.id,
          userId,
          role: 'member',
        },
      })

      return NextResponse.json(
        { family: serializeFamily(family) },
        { status: 200 }
      )
    } catch (prismaError) {
      // Prisma unavailable — use Supabase REST API
      console.log('[Families API] Prisma unavailable, using Supabase REST API')
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('No database available')
      }

      // Find the family by invite code
      const { data: family } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .maybeSingle()

      if (!family) {
        return NextResponse.json(
          { error: 'Invalid invite code' },
          { status: 404 }
        )
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', family.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (existingMember) {
        return NextResponse.json(
          { error: 'Already a member of this family' },
          { status: 409 }
        )
      }

      // ─── Check member limit for the family (Supabase path) ─────────────
      const { count: supabaseMemberCount } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', family.id)

      const ownerPlan = await getUserPlan(req)
      const memberLimit = checkPlanLimit(ownerPlan, 'members' as PlanResource, supabaseMemberCount || 0)
      if (!memberLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Member limit reached for your plan',
            currentPlan: ownerPlan,
            limit: memberLimit.limit,
            currentCount: supabaseMemberCount || 0,
            upgradeRequired: true,
          },
          { status: 403 },
        )
      }

      // Add as member (Supabase path)
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          user_id: userId,
          role: 'member',
        })

      if (memberError) {
        console.error('[Families API] Supabase join error:', memberError)
        return NextResponse.json(
          { error: memberError.message || 'Failed to join family' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { family: serializeSupabaseFamily(family) },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('[Families API] Join error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── GET: List User's Families ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = auth.userId
    // Try Prisma first
    try {
      // Get all FamilyMember records for the user, including family data
      const memberships = await db.familyMember.findMany({
        where: { userId },
        include: { family: true },
        orderBy: { joinedAt: 'desc' },
      })

      const families = memberships.map(m => ({
        ...serializeFamily(m.family),
        role: m.role,
        nickname: m.nickname,
        joined_at: m.joinedAt.toISOString(),
      }))

      return NextResponse.json({ families })
    } catch (prismaError) {
      // Prisma unavailable — use Supabase REST API
      console.log('[Families API] Prisma unavailable, using Supabase REST API')
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('No database available')
      }

      // Get all family_members for this user, including family data
      const { data: memberships, error: memberError } = await supabase
        .from('family_members')
        .select('family_id, role, nickname, joined_at, families(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })

      if (memberError) {
        console.error('[Families API] Supabase list error:', memberError)
        return NextResponse.json(
          { error: memberError.message || 'Failed to list families' },
          { status: 500 }
        )
      }

      const families = (memberships || []).map((m: Record<string, unknown>) => {
        const family = m.families as Record<string, unknown>
        return {
          ...serializeSupabaseFamily(family || {}),
          role: m.role as string,
          nickname: (m.nickname as string) || null,
          joined_at: (m.joined_at as string) || new Date().toISOString(),
        }
      })

      return NextResponse.json({ families })
    }
  } catch (error) {
    console.error('[Families API] List error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
