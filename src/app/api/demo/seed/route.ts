import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { syncSupabaseUserToPrisma } from '@/lib/sync-user'
import bcrypt from 'bcryptjs'

const DEMO_EMAIL = 'demo@usra.plus'
const DEMO_PASSWORD = 'Demo2024!'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const secret = body.secret || ''
    const expectedSecret = process.env.DEMO_SEED_SECRET || 'usra-demo-2024'

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }

    const results: string[] = []

    // Step 1: Ensure demo user exists
    let userId: string
    const existingPrismaUser = await db.user.findUnique({ where: { email: DEMO_EMAIL } })

    if (existingPrismaUser) {
      userId = existingPrismaUser.id
      results.push(`Prisma user exists: ${userId}`)
      if (!existingPrismaUser.emailVerified) {
        await db.user.update({
          where: { id: userId },
          data: { emailVerified: true, firstName: 'Demo', lastName: 'User' },
        })
        results.push('Updated: emailVerified=true')
      }
    } else {
      const supabase = getSupabaseAdmin()
      let supabaseUserId: string | null = null

      if (supabase) {
        try {
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const demoUser = users.find(u => u.email === DEMO_EMAIL)
          if (demoUser) {
            supabaseUserId = demoUser.id
            results.push(`Found Supabase user: ${supabaseUserId}`)
          }
        } catch (e) {
          results.push(`Supabase listUsers failed: ${e}`)
        }

        if (!supabaseUserId) {
          try {
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: DEMO_EMAIL,
              password: DEMO_PASSWORD,
              email_confirm: true,
              user_metadata: { first_name: 'Demo', last_name: 'User', country_code: '+966' },
            })
            if (authError) {
              results.push(`Supabase create error: ${authError.message}`)
            } else {
              supabaseUserId = authData.user.id
              results.push(`Created Supabase user: ${supabaseUserId}`)
              await supabase.from('profiles').insert({
                id: supabaseUserId, email: DEMO_EMAIL,
                first_name: 'Demo', last_name: 'User',
                country_code: '+966', language: 'en', theme: 'dark',
              }).then(({ error }) => {
                if (error) results.push(`Profile error: ${error.message}`)
              })
            }
          } catch (e) {
            results.push(`Supabase createUser error: ${e}`)
          }
        }

        if (supabaseUserId) {
          userId = await syncSupabaseUserToPrisma({
            id: supabaseUserId, email: DEMO_EMAIL,
            user_metadata: { first_name: 'Demo', last_name: 'User', country_code: '+966' },
          })
          results.push(`Synced to Prisma: ${userId}`)
        } else {
          const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
          const newUser = await db.user.create({
            data: { email: DEMO_EMAIL, passwordHash, firstName: 'Demo', lastName: 'User', countryCode: '+966', emailVerified: true },
          })
          userId = newUser.id
          results.push(`Created Prisma user: ${userId}`)
        }
      } else {
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
        const newUser = await db.user.create({
          data: { email: DEMO_EMAIL, passwordHash, firstName: 'Demo', lastName: 'User', countryCode: '+966', emailVerified: true },
        })
        userId = newUser.id
        results.push(`Created Prisma user (no Supabase): ${userId}`)
      }
    }

    // Step 2: Create Family
    const existingMembership = await db.familyMember.findFirst({ where: { userId } })
    let familyId: string

    if (existingMembership) {
      familyId = existingMembership.familyId
      results.push(`Already in family: ${familyId}`)
    } else {
      let inviteCode = generateInviteCode()
      let attempts = 0
      while (attempts < 10) {
        const existing = await db.family.findUnique({ where: { inviteCode } })
        if (!existing) break
        inviteCode = generateInviteCode()
        attempts++
      }

      const family = await db.family.create({
        data: {
          name: 'Al-Rashid Family',
          description: 'A loving Saudi family using USRA PLUS to stay connected and safe.',
          inviteCode, color: 'signal', createdBy: userId,
        },
      })
      familyId = family.id
      results.push(`Created family: ${family.name}`)

      await db.familyMember.create({
        data: { familyId, userId, role: 'owner', nickname: 'Dad' },
      })
      results.push('Added as family owner (Dad)')

      // Create family members
      const members = [
        { nickname: 'Mom', role: 'member' },
        { nickname: 'Ahmed', role: 'member' },
        { nickname: 'Sara', role: 'member' },
        { nickname: 'Omar', role: 'member' },
      ]

      for (const member of members) {
        try {
          const memberEmail = `${member.nickname.toLowerCase()}.alrashid@demo.usra.plus`
          const memberPasswordHash = await bcrypt.hash('DemoMember2024!', 12)
          let memberUserId: string
          const existingMemberUser = await db.user.findUnique({ where: { email: memberEmail } })
          if (existingMemberUser) {
            memberUserId = existingMemberUser.id
          } else {
            const newMemberUser = await db.user.create({
              data: { email: memberEmail, passwordHash: memberPasswordHash, firstName: member.nickname, lastName: 'Al-Rashid', countryCode: '+966', emailVerified: true },
            })
            memberUserId = newMemberUser.id
          }

          const existingFM = await db.familyMember.findUnique({
            where: { familyId_userId: { familyId, userId: memberUserId } },
          })
          if (!existingFM) {
            await db.familyMember.create({
              data: { familyId, userId: memberUserId, role: member.role, nickname: member.nickname },
            })
            results.push(`Added member: ${member.nickname}`)
          }
        } catch (e) {
          results.push(`Error creating ${member.nickname}: ${e}`)
        }
      }

      // Sync family to Supabase
      const supabase = getSupabaseAdmin()
      if (supabase) {
        try {
          await supabase.from('families').insert({
            id: familyId, name: 'Al-Rashid Family',
            description: 'A loving Saudi family using USRA PLUS to stay connected and safe.',
            invite_code: inviteCode, color: 'signal', created_by: userId,
          })
          await supabase.from('family_members').insert({
            family_id: familyId, user_id: userId, role: 'owner', nickname: 'Dad',
          })
          results.push('Synced family to Supabase')
        } catch (e) {
          results.push(`Supabase sync error: ${e}`)
        }
      }
    }

    // Step 3: Create demo subscription
    const existingSub = await db.userSubscription.findFirst({ where: { userId } })
    if (!existingSub) {
      await db.userSubscription.create({
        data: {
          userId, plan: 'family_plus', status: 'active', store: 'app_store',
          periodType: 'yearly', autoRenew: true, price: 9.99, currency: 'USD',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })
      results.push('Created Family+ subscription')
    } else {
      results.push(`Subscription exists: ${existingSub.plan}`)
    }

    return NextResponse.json({ success: true, message: 'Demo data seeded', results, demoCredentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD } })
  } catch (error) {
    console.error('[Demo Seed] Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret') || ''
  const expectedSecret = process.env.DEMO_SEED_SECRET || 'usra-demo-2024'
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret. Use ?secret=usra-demo-2024' }, { status: 403 })
  }
  const postReq = new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret }),
  })
  return POST(postReq)
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
