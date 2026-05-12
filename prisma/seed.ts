/**
 * Seed script for USRA PLUS
 *
 * Creates default subscription plans and sample data if they don't already exist.
 * Run with: bun run db:seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedPlan {
  slug: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number | null
  lifetimePrice: number | null
  currency: string
  features: string[]
  limits: Record<string, number>
  trialDays: number
  isActive: boolean
  isPopular: boolean
  sortOrder: number
  ctaText: string
}

const DEFAULT_PLANS: SeedPlan[] = [
  {
    slug: 'free',
    name: 'Free',
    description: 'Get started with the essentials for your family',
    monthlyPrice: 0,
    yearlyPrice: null,
    lifetimePrice: null,
    currency: 'USD',
    features: [
      'Up to 1 family',
      'Basic grocery lists',
      'Task management',
      'Calendar view',
    ],
    limits: { families: 1, members: 5, storage: 100 },
    trialDays: 0,
    isActive: true,
    isPopular: false,
    sortOrder: 1,
    ctaText: 'Get Started',
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'Unlock powerful features for organized families',
    monthlyPrice: 4.99,
    yearlyPrice: null,
    lifetimePrice: null,
    currency: 'USD',
    features: [
      'Up to 3 families',
      'Unlimited grocery lists',
      'AI suggestions',
      'Calendar sync',
      'Priority support',
    ],
    limits: { families: 3, members: 15, storage: 1000 },
    trialDays: 7,
    isActive: true,
    isPopular: true,
    sortOrder: 2,
    ctaText: 'Start Free Trial',
  },
  {
    slug: 'family_plus',
    name: 'Family+',
    description: 'The ultimate family management experience',
    monthlyPrice: 9.99,
    yearlyPrice: null,
    lifetimePrice: null,
    currency: 'USD',
    features: [
      'Unlimited families',
      'Unlimited members',
      'AI assistant',
      'Budget tracking',
      'Meal planning',
      'Family analytics',
      'Dedicated support',
    ],
    limits: { families: -1, members: -1, storage: 10000 },
    trialDays: 14,
    isActive: true,
    isPopular: false,
    sortOrder: 3,
    ctaText: 'Start Free Trial',
  },
]

async function main() {
  console.log('🌱 Seeding subscription plans...')

  for (const plan of DEFAULT_PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { slug: plan.slug },
    })

    if (existing) {
      console.log(`  ⏭️  Plan "${plan.slug}" already exists (id: ${existing.id}), skipping`)
      continue
    }

    const created = await prisma.subscriptionPlan.create({
      data: {
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        lifetimePrice: plan.lifetimePrice,
        currency: plan.currency,
        features: JSON.stringify(plan.features),
        limits: JSON.stringify(plan.limits),
        trialDays: plan.trialDays,
        isActive: plan.isActive,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder,
        ctaText: plan.ctaText,
      },
    })

    console.log(`  ✅ Created plan "${plan.slug}" (id: ${created.id})`)
  }

  // ─── Seed System Health entries ─────────────────────────────────
  const existingHealth = await prisma.systemHealth.count()
  if (existingHealth === 0) {
    const now = new Date()
    const services = [
      { service: 'database', status: 'operational', responseTime: 12, uptime: 99.98 },
      { service: 'auth', status: 'operational', responseTime: 45, uptime: 99.95 },
      { service: 'api', status: 'operational', responseTime: 28, uptime: 99.97 },
      { service: 'storage', status: 'degraded', responseTime: 150, uptime: 98.5 },
      { service: 'email', status: 'operational', responseTime: 120, uptime: 99.9 },
      { service: 'push', status: 'operational', responseTime: 35, uptime: 99.92 },
    ]
    for (const s of services) {
      await prisma.systemHealth.create({ data: s })
    }
    console.log(`  ✅ Created ${services.length} system health entries`)
  }

  // ─── Seed Bug Reports ────────────────────────────────────────────
  const existingBugs = await prisma.bugReport.count()
  if (existingBugs === 0) {
    const bugReports = [
      { title: 'Push notifications delayed on Android 14', description: 'Users on Android 14 report push notifications arriving 5-15 minutes late.', severity: 'high', status: 'investigating', source: 'user_report' },
      { title: 'Screen time tracking inaccurate after DST change', description: 'Daylight saving time transition caused screen time calculations to be off by 1 hour.', severity: 'medium', status: 'fixing', source: 'auto' },
      { title: 'Geofence alerts not triggering for some iOS devices', description: 'Geofence breach alerts fail to trigger on iOS 17.4 when Low Power Mode is enabled.', severity: 'high', status: 'open', source: 'user_report' },
      { title: 'Content filter bypass via VPN apps', description: 'Children can bypass content filtering by using VPN applications.', severity: 'critical', status: 'investigating', source: 'manual' },
      { title: 'Dashboard loading slow with >10 devices', description: 'Admin dashboard takes >5s to load when parent account has more than 10 linked devices.', severity: 'medium', status: 'fixing', source: 'auto' },
      { title: 'Email verification link expires too quickly', description: 'Email verification links expire after 1 hour, but some users report not receiving the email in time.', severity: 'low', status: 'open', source: 'user_report' },
    ]
    for (const bug of bugReports) {
      await prisma.bugReport.create({ data: bug })
    }
    console.log(`  ✅ Created ${bugReports.length} bug reports`)
  }

  // ─── Seed Platform Stats ─────────────────────────────────────────
  const existingStats = await prisma.platformStats.count()
  if (existingStats === 0) {
    const now = new Date()
    const subDays = (d: Date, days: number) => { const r = new Date(d); r.setDate(r.getDate() - days); return r }
    const statsEntries = [
      { totalUsers: 8450, activeUsers: 3210, totalDevices: 15200, totalAlerts: 456, revenue: 48500.0, timestamp: subDays(now, 7) },
      { totalUsers: 8520, activeUsers: 3150, totalDevices: 15350, totalAlerts: 430, revenue: 51200.0, timestamp: subDays(now, 6) },
      { totalUsers: 8610, activeUsers: 3380, totalDevices: 15480, totalAlerts: 520, revenue: 49800.0, timestamp: subDays(now, 5) },
      { totalUsers: 8700, activeUsers: 3450, totalDevices: 15620, totalAlerts: 490, revenue: 53100.0, timestamp: subDays(now, 4) },
      { totalUsers: 8780, activeUsers: 3320, totalDevices: 15750, totalAlerts: 470, revenue: 50400.0, timestamp: subDays(now, 3) },
    ]
    for (const stat of statsEntries) {
      await prisma.platformStats.create({ data: stat })
    }
    console.log(`  ✅ Created ${statsEntries.length} platform stats entries`)
  }

  console.log('🌱 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
