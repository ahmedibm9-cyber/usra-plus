/**
 * Sync a Supabase Auth user to the Prisma User table.
 *
 * When users sign up or log in via Supabase Auth (e.g. on Vercel/production),
 * they exist in Supabase's `auth.users` table but NOT in Prisma's `User` table.
 * This causes two problems:
 *   1. The admin dashboard (which queries Prisma) shows no users.
 *   2. We can't create Prisma Sessions for them, so we store the Supabase
 *      access_token (JWT) in the cookie, which expires after ~1 hour.
 *
 * By syncing the Supabase user to Prisma, we can:
 *   - Create a proper Prisma Session with a long-lived UUID token
 *   - Show the user in the admin dashboard
 *   - Make all Prisma-based features work (families, subscriptions, etc.)
 */

import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'

interface SupabaseAuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

/**
 * Ensure a Prisma User record exists for the given Supabase Auth user.
 * Returns the Prisma User ID.
 */
export async function syncSupabaseUserToPrisma(authUser: SupabaseAuthUser): Promise<string> {
  const email = (authUser.email || '').toLowerCase()
  const supabaseId = authUser.id
  const meta = authUser.user_metadata || {}

  // Try to fetch profile from Supabase profiles table for richer data
  let profile: Record<string, unknown> | null = null
  const supabase = getSupabaseAdmin()
  if (supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseId)
        .maybeSingle()
      profile = data
    } catch {
      // profiles table might not exist
    }
  }

  const firstName = (profile?.first_name as string) || (meta.first_name as string) || null
  const lastName = (profile?.last_name as string) || (meta.last_name as string) || null
  const phone = (profile?.phone as string) || (meta.phone as string) || null
  const countryCode = (profile?.country_code as string) || (meta.country_code as string) || '+966'
  const avatarUrl = (profile?.avatar_url as string) || (meta.avatar_url as string) || null
  const language = (profile?.language as string) || 'en'
  const theme = (profile?.theme as string) || 'dark'

  // Check if user already exists in Prisma by ID
  try {
    const existingById = await db.user.findUnique({ where: { id: supabaseId } })
    if (existingById) {
      await db.user.update({
        where: { id: supabaseId },
        data: {
          firstName: firstName || existingById.firstName,
          lastName: lastName || existingById.lastName,
          phone: phone || existingById.phone,
          countryCode: countryCode || existingById.countryCode,
          avatarUrl: avatarUrl || existingById.avatarUrl,
          language,
          theme,
          emailVerified: true,
          updatedAt: new Date(),
        },
      })
      return supabaseId
    }
  } catch {
    // Prisma might fail
  }

  // Check if user exists by email
  try {
    const existingByEmail = await db.user.findUnique({ where: { email } })
    if (existingByEmail) {
      await db.user.update({
        where: { id: existingByEmail.id },
        data: {
          firstName: firstName || existingByEmail.firstName,
          lastName: lastName || existingByEmail.lastName,
          phone: phone || existingByEmail.phone,
          countryCode: countryCode || existingByEmail.countryCode,
          avatarUrl: avatarUrl || existingByEmail.avatarUrl,
          language,
          theme,
          emailVerified: true,
          updatedAt: new Date(),
        },
      })
      return existingByEmail.id
    }
  } catch {
    // Prisma might fail
  }

  // User doesn't exist — create them
  const placeholderHash = await bcrypt.hash(`supabase-sync-${supabaseId}-${Date.now()}`, 4)

  try {
    await db.user.create({
      data: {
        id: supabaseId,
        email,
        passwordHash: placeholderHash,
        firstName,
        lastName,
        phone,
        countryCode,
        avatarUrl,
        language,
        theme,
        emailVerified: true,
      },
    })
    return supabaseId
  } catch (createError) {
    console.error('[Sync User] Failed to create with Supabase ID:', createError)
    try {
      const newUser = await db.user.create({
        data: {
          email,
          passwordHash: placeholderHash,
          firstName,
          lastName,
          phone,
          countryCode,
          avatarUrl,
          language,
          theme,
          emailVerified: true,
        },
      })
      return newUser.id
    } catch (secondError) {
      console.error('[Sync User] Failed completely:', secondError)
      return supabaseId
    }
  }
}

/**
 * Create a Prisma Session for the given user ID.
 * Returns the session token.
 */
export async function createPrismaSession(userId: string): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  try {
    await db.session.create({
      data: { userId, token, expiresAt },
    })

    // Clean up old expired sessions
    await db.session.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    }).catch(() => {})

    return token
  } catch (error) {
    console.error('[Sync User] Failed to create Prisma session:', error)
    return token
  }
}
