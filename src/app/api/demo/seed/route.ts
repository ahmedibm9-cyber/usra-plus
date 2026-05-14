import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'

const DEMO_EMAIL = 'demo@usra.plus'
const DEMO_PASSWORD = 'Demo2024!'

// ─── Helpers ───────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(crypto.randomInt(chars.length))
  }
  return code
}

/** Find user by email — Supabase first, Prisma fallback */
async function findUserByEmail(email: string): Promise<{ id: string; source: string } | null> {
  const supabase = getSupabaseAdmin()
  if (supabase) {
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const user = users.find(u => u.email === email)
      if (user) return { id: user.id, source: 'supabase-auth' }
    } catch {
      // Supabase auth failed
    }
    try {
      const { data } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
      if (data) return { id: data.id, source: 'supabase-profiles' }
    } catch {
      // profiles lookup failed
    }
  }
  try {
    const user = await db.user.findUnique({ where: { email } })
    if (user) return { id: user.id, source: 'prisma' }
  } catch {
    // Prisma failed
  }
  return null
}

/** Check if user already has a family membership — Supabase first, Prisma fallback */
async function findUserFamily(userId: string): Promise<{ familyId: string; source: string } | null> {
  const supabase = getSupabaseAdmin()
  if (supabase) {
    try {
      const { data } = await supabase.from('family_members').select('family_id').eq('user_id', userId).maybeSingle()
      if (data) return { familyId: data.family_id as string, source: 'supabase' }
    } catch {
      // Supabase failed
    }
  }
  try {
    const membership = await db.familyMember.findFirst({ where: { userId } })
    if (membership) return { familyId: membership.familyId, source: 'prisma' }
  } catch {
    // Prisma failed
  }
  return null
}

/** Check if user already has a subscription — Supabase first, Prisma fallback */
async function findSubscription(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  if (supabase) {
    try {
      const { data } = await supabase.from('user_subscriptions').select('plan').eq('user_id', userId).maybeSingle()
      if (data) return data.plan as string
    } catch {
      // Supabase failed
    }
  }
  try {
    const sub = await db.userSubscription.findFirst({ where: { userId } })
    if (sub) return sub.plan
  } catch {
    // Prisma failed
  }
  return null
}

// ─── POST: Seed demo data ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Block in production — demo seed is for development/staging only
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Demo seed endpoint is disabled in production' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const secret = body.secret || ''
    const expectedSecret = process.env.DEMO_SEED_SECRET

    if (!expectedSecret) {
      console.error('[Demo Seed] DEMO_SEED_SECRET env var is not set — endpoint disabled')
      return NextResponse.json({ error: 'Demo seed secret not configured' }, { status: 500 })
    }

    // Use timing-safe comparison to prevent timing attacks
    const secretBuf = Buffer.from(String(secret))
    const expectedBuf = Buffer.from(expectedSecret)
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }

    const results: string[] = []
    const supabase = getSupabaseAdmin()

    // ── Step 1: Ensure demo user exists ──────────────────────────────
    let userId: string
    const existingUser = await findUserByEmail(DEMO_EMAIL)

    if (existingUser) {
      userId = existingUser.id
      results.push(`User exists (${existingUser.source}): ${userId}`)
    } else if (supabase) {
      // Create via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Demo', last_name: 'User', country_code: '+966' },
      })

      if (authError) {
        results.push(`Supabase create error: ${authError.message}`)
        return NextResponse.json({ error: 'Failed to create demo user', results }, { status: 500 })
      }

      userId = authData.user.id
      results.push(`Created Supabase Auth user: ${userId}`)

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        email: DEMO_EMAIL,
        first_name: 'Demo',
        last_name: 'User',
        country_code: '+966',
        language: 'en',
        theme: 'dark',
      })
      if (profileError) {
        results.push(`Profile insert warning: ${profileError.message}`)
      } else {
        results.push('Created Supabase profile')
      }

      // Best-effort sync to Prisma
      try {
        const bcrypt = await import('bcryptjs')
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
        await db.user.create({
          data: {
            id: userId, email: DEMO_EMAIL, passwordHash,
            firstName: 'Demo', lastName: 'User', countryCode: '+966', emailVerified: true,
          },
        })
        results.push('Synced to Prisma')
      } catch {
        results.push('Prisma sync skipped (unavailable)')
      }
    } else {
      // No Supabase — create via Prisma only
      const bcrypt = await import('bcryptjs')
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
      const newUser = await db.user.create({
        data: {
          email: DEMO_EMAIL, passwordHash,
          firstName: 'Demo', lastName: 'User', countryCode: '+966', emailVerified: true,
        },
      })
      userId = newUser.id
      results.push(`Created Prisma user: ${userId}`)
    }

    // ── Step 2: Create Family ────────────────────────────────────────
    const existingFamily = await findUserFamily(userId)
    let familyId: string
    let inviteCode = ''

    if (existingFamily) {
      familyId = existingFamily.familyId
      results.push(`Already in family (${existingFamily.source}): ${familyId}`)
    } else {
      inviteCode = generateInviteCode()

      if (supabase) {
        // Create family via Supabase REST API
        const { data: familyData, error: familyError } = await supabase.from('families').insert({
          name: 'Al-Rashid Family',
          description: 'A loving Saudi family using USRA PLUS to stay connected and safe.',
          invite_code: inviteCode,
          color: 'signal',
          created_by: userId,
        }).select('id').single()

        if (familyError || !familyData) {
          results.push(`Supabase family error: ${familyError?.message}`)
          return NextResponse.json({ error: 'Failed to create family', results }, { status: 500 })
        }

        familyId = familyData.id
        results.push(`Created family (Supabase): Al-Rashid Family`)

        // Add owner
        const { error: memberError } = await supabase.from('family_members').insert({
          family_id: familyId,
          user_id: userId,
          role: 'owner',
          nickname: 'Dad',
        })
        if (memberError) {
          results.push(`Owner insert warning: ${memberError.message}`)
        } else {
          results.push('Added as family owner (Dad)')
        }

        // Create family members via Supabase
        const members = [
          { nickname: 'Mom', role: 'member' },
          { nickname: 'Ahmed', role: 'member' },
          { nickname: 'Sara', role: 'member' },
          { nickname: 'Omar', role: 'member' },
        ]

        for (const member of members) {
          try {
            const memberEmail = `${member.nickname.toLowerCase()}.alrashid@demo.usra.plus`
            // Check if member user exists
            const { data: { users } } = await supabase.auth.admin.listUsers()
            let memberUserId: string | null = null
            const existingMember = users.find(u => u.email === memberEmail)

            if (existingMember) {
              memberUserId = existingMember.id
              results.push(`Member ${member.nickname}: existing user ${memberUserId}`)
            } else {
              const { data: memberAuthData, error: memberAuthError } = await supabase.auth.admin.createUser({
                email: memberEmail,
                password: 'DemoMember2024!',
                email_confirm: true,
                user_metadata: { first_name: member.nickname, last_name: 'Al-Rashid', country_code: '+966' },
              })
              if (memberAuthError) {
                results.push(`Member ${member.nickname} create error: ${memberAuthError.message}`)
                continue
              }
              memberUserId = memberAuthData.user.id
              results.push(`Member ${member.nickname}: created user ${memberUserId}`)

              // Create profile
              await supabase.from('profiles').insert({
                id: memberUserId, email: memberEmail,
                first_name: member.nickname, last_name: 'Al-Rashid',
                country_code: '+966', language: 'en', theme: 'dark',
              }).then(({ error }) => {
                if (error) results.push(`  Profile warning: ${error.message}`)
              })
            }

            // Add to family
            const { error: fmError } = await supabase.from('family_members').insert({
              family_id: familyId,
              user_id: memberUserId,
              role: member.role,
              nickname: member.nickname,
            })
            if (fmError) {
              if (fmError.code === '23505') {
                results.push(`Member ${member.nickname}: already in family`)
              } else {
                results.push(`Member ${member.nickname} insert warning: ${fmError.message}`)
              }
            } else {
              results.push(`Added member: ${member.nickname}`)
            }
          } catch (e) {
            results.push(`Error creating ${member.nickname}: ${e instanceof Error ? e.message : String(e)}`)
          }
        }

        // Best-effort sync to Prisma
        try {
          const bcrypt = await import('bcryptjs')
          const passwordHash = await bcrypt.hash('DemoMember2024!', 12)
          await db.family.create({
            data: {
              id: familyId, name: 'Al-Rashid Family',
              description: 'A loving Saudi family using USRA PLUS to stay connected and safe.',
              inviteCode, color: 'signal', createdBy: userId,
            },
          })
          await db.familyMember.create({
            data: { familyId, userId, role: 'owner', nickname: 'Dad' },
          })
          for (const member of members) {
            const memberEmail = `${member.nickname.toLowerCase()}.alrashid@demo.usra.plus`
            const existingMemberUser = await db.user.findUnique({ where: { email: memberEmail } })
            if (existingMemberUser) {
              await db.familyMember.create({
                data: { familyId, userId: existingMemberUser.id, role: member.role, nickname: member.nickname },
              }).catch(() => {})
            }
          }
          results.push('Synced family to Prisma')
        } catch {
          results.push('Prisma family sync skipped (unavailable)')
        }
      } else {
        // No Supabase — create via Prisma only
        const family = await db.family.create({
          data: {
            name: 'Al-Rashid Family',
            description: 'A loving Saudi family using USRA PLUS to stay connected and safe.',
            inviteCode, color: 'signal', createdBy: userId,
          },
        })
        familyId = family.id
        results.push(`Created family (Prisma): ${family.name}`)

        await db.familyMember.create({
          data: { familyId, userId, role: 'owner', nickname: 'Dad' },
        })
        results.push('Added as family owner (Dad)')

        const members = [
          { nickname: 'Mom', role: 'member' },
          { nickname: 'Ahmed', role: 'member' },
          { nickname: 'Sara', role: 'member' },
          { nickname: 'Omar', role: 'member' },
        ]

        const bcrypt = await import('bcryptjs')
        for (const member of members) {
          try {
            const memberEmail = `${member.nickname.toLowerCase()}.alrashid@demo.usra.plus`
            const passwordHash = await bcrypt.hash('DemoMember2024!', 12)
            let memberUserId: string
            const existingMemberUser = await db.user.findUnique({ where: { email: memberEmail } })
            if (existingMemberUser) {
              memberUserId = existingMemberUser.id
            } else {
              const newMemberUser = await db.user.create({
                data: {
                  email: memberEmail, passwordHash,
                  firstName: member.nickname, lastName: 'Al-Rashid',
                  countryCode: '+966', emailVerified: true,
                },
              })
              memberUserId = newMemberUser.id
            }
            await db.familyMember.create({
              data: { familyId, userId: memberUserId, role: member.role, nickname: member.nickname },
            }).catch(() => {})
            results.push(`Added member: ${member.nickname}`)
          } catch (e) {
            results.push(`Error creating ${member.nickname}: ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }
    }

    // ── Step 3: Create demo subscription ─────────────────────────────
    const existingSub = await findSubscription(userId)
    if (existingSub) {
      results.push(`Subscription exists: ${existingSub}`)
    } else if (supabase) {
      const { error: subError } = await supabase.from('user_subscriptions').insert({
        user_id: userId,
        plan: 'family_plus',
        status: 'active',
        store: 'app_store',
        period_type: 'yearly',
        auto_renew: true,
        price: 9.99,
        currency: 'USD',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      if (subError) {
        results.push(`Subscription warning: ${subError.message}`)
        // Try Prisma fallback
        try {
          await db.userSubscription.create({
            data: {
              userId, plan: 'family_plus', status: 'active', store: 'app_store',
              periodType: 'yearly', autoRenew: true, price: 9.99, currency: 'USD',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          })
          results.push('Created subscription (Prisma fallback)')
        } catch {
          results.push('Subscription creation skipped (both sources failed)')
        }
      } else {
        results.push('Created Family+ subscription (Supabase)')
      }
    } else {
      try {
        await db.userSubscription.create({
          data: {
            userId, plan: 'family_plus', status: 'active', store: 'app_store',
            periodType: 'yearly', autoRenew: true, price: 9.99, currency: 'USD',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        })
        results.push('Created Family+ subscription (Prisma)')
      } catch {
        results.push('Subscription creation skipped')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded',
      results,
    })
  } catch (error) {
    console.error('[Demo Seed] Error:', error)
    // Don't leak error details to client
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
}

// ─── GET: Seed via query param ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Demo seed endpoint is disabled in production' }, { status: 403 })
  }

  const secret = new URL(req.url).searchParams.get('secret') || ''
  const expectedSecret = process.env.DEMO_SEED_SECRET
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Demo seed secret not configured' }, { status: 500 })
  }
  // Use timing-safe comparison
  const secretBuf = Buffer.from(String(secret))
  const expectedBuf = Buffer.from(expectedSecret)
  if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
  }
  const postReq = new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret }),
  })
  return POST(postReq)
}
