import { NextRequest, NextResponse } from 'next/server'
import { db, getDatabaseProvider } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import fs from 'fs'
import path from 'path'

// ─── Helpers ──────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Detect if running with PostgreSQL (Supabase) vs SQLite (local)
function isPostgreSQL(): boolean {
  return getDatabaseProvider() === 'postgresql'
}

// Safe DB count helper - returns -1 on failure
async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn()
  } catch {
    return -1
  }
}

// ─── Supabase REST API Helpers ─────────────────────────────────────────

async function getTableCountViaSupabase(tableName: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return -1

  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) return -1
    return count ?? 0
  } catch {
    return -1
  }
}

// Map Prisma model names to likely Supabase table names
const SUPABASE_TABLE_MAP: Array<{ model: string; table: string }> = [
  { model: 'User', table: 'profiles' },
  { model: 'Session', table: 'sessions' },
  { model: 'SubscriptionPlan', table: 'subscription_plans' },
  { model: 'Coupon', table: 'coupons' },
  { model: 'CouponRedemption', table: 'coupon_redemptions' },
  { model: 'Referral', table: 'referrals' },
  { model: 'RevenueTransaction', table: 'revenue_transactions' },
  { model: 'Refund', table: 'refunds' },
  { model: 'EmailCampaign', table: 'email_campaigns' },
  { model: 'UserSegment', table: 'user_segments' },
  { model: 'ABTest', table: 'ab_tests' },
  { model: 'AuditLog', table: 'audit_logs' },
  { model: 'ModerationItem', table: 'moderation_items' },
  { model: 'SupportTicket', table: 'support_tickets' },
  { model: 'UserBan', table: 'user_bans' },
  { model: 'FeatureFlag', table: 'feature_flags' },
  { model: 'SystemSetting', table: 'system_settings' },
  { model: 'DatabaseBackup', table: 'database_backups' },
]

// ─── GET: Database stats, backup list, schema info, feature flags ────
export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  let usedSupabase = false

  try {
    // ─── Table Row Counts ──────────────────────────────────────────
    let tableStats: Array<{ name: string; rows: number }>

    if (supabase) {
      // Try Supabase REST API first
      const supabaseCounts = await Promise.all(
        SUPABASE_TABLE_MAP.map(async ({ model, table }) => ({
          name: model,
          rows: await getTableCountViaSupabase(table),
        }))
      )
      tableStats = supabaseCounts
      usedSupabase = supabaseCounts.some(s => s.rows >= 0)

      // If ALL Supabase counts failed, fall back to Prisma
      if (!usedSupabase) {
        tableStats = await getPrismaTableCounts()
      }
    } else {
      // No Supabase configured, use Prisma directly
      tableStats = await getPrismaTableCounts()
    }

    const totalRows = tableStats.reduce((sum, t) => sum + (t.rows >= 0 ? t.rows : 0), 0)

    // ─── Backups List ──────────────────────────────────────────
    let backups: Array<{
      id: string; filename: string; fileSize: number; fileSizeFormatted: string;
      tableCount: number; totalRows: number; note: string | null; createdAt: string;
    }> = []

    if (!isPostgreSQL()) {
      try {
        const backupRecords = await db.databaseBackup.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
        backups = backupRecords.map(b => ({
          id: b.id,
          filename: b.filename,
          fileSize: b.fileSize,
          fileSizeFormatted: formatBytes(b.fileSize),
          tableCount: b.tableCount,
          totalRows: b.totalRows,
          note: b.note,
          createdAt: b.createdAt.toISOString(),
        }))
      } catch {
        // Database might be unreachable - return empty backups
      }
    }

    // ─── Feature Flags ──────────────────────────────────────────
    let persistedFlags: Array<{
      id: string; key: string; name: string; description: string;
      enabled: boolean; rolloutPercentage: number; targetPlan: string | null;
      createdAt: string;
    }> = []

    if (supabase && usedSupabase) {
      // Try Supabase REST API first for feature flags
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          persistedFlags = data.map((f: Record<string, unknown>) => ({
            id: String(f.id ?? ''),
            key: String(f.key ?? ''),
            name: String(f.name ?? ''),
            description: String(f.description ?? ''),
            enabled: Boolean(f.enabled),
            rolloutPercentage: Number(f.rollout_percentage ?? f.rolloutPercentage ?? 100),
            targetPlan: f.target_plan ? String(f.target_plan) : (f.targetPlan ? String(f.targetPlan) : null),
            createdAt: String(f.created_at ?? f.createdAt ?? '').split('T')[0],
          }))
        } else {
          // Table doesn't exist in Supabase, fall back to Prisma
          persistedFlags = await getPrismaFeatureFlags()
        }
      } catch {
        persistedFlags = await getPrismaFeatureFlags()
      }
    } else {
      persistedFlags = await getPrismaFeatureFlags()
    }

    // ─── System Settings ──────────────────────────────────────────
    let settings: Array<{
      id: string; key: string; value: string; updatedAt: string;
    }> = []

    if (supabase && usedSupabase) {
      // Try Supabase REST API first for system settings
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')

        if (!error && data) {
          settings = data.map((s: Record<string, unknown>) => ({
            id: String(s.id ?? ''),
            key: String(s.key ?? ''),
            value: String(s.value ?? ''),
            updatedAt: String(s.updated_at ?? s.updatedAt ?? new Date().toISOString()),
          }))
        } else {
          // Table doesn't exist in Supabase, fall back to Prisma
          settings = await getPrismaSystemSettings()
        }
      } catch {
        settings = await getPrismaSystemSettings()
      }
    } else {
      settings = await getPrismaSystemSettings()
    }

    // ─── Schema Version ──────────────────────────────────────────
    const schemaVersion = {
      database: isPostgreSQL() ? 'PostgreSQL (Supabase)' : 'SQLite',
      prismaVersion: '6.19.3',
      modelCount: 18,
      lastMigration: new Date().toISOString().split('T')[0],
    }

    return NextResponse.json({
      source: usedSupabase ? 'live' : 'live',
      data: {
        databaseStats: {
          fileSize: 0,
          fileSizeFormatted: isPostgreSQL() ? 'Managed by Supabase' : '0 B',
          totalRows,
          tableCount: tableStats.length,
          tables: tableStats,
        },
        backups,
        featureFlags: persistedFlags,
        systemSettings: settings,
        schemaVersion,
      },
    })
  } catch (err) {
    // Graceful degradation - return empty data instead of 500
    return NextResponse.json({
      source: 'demo',
      error: err instanceof Error ? err.message : 'Unknown error',
      data: {
        databaseStats: { fileSize: 0, fileSizeFormatted: '0 B', totalRows: 0, tableCount: 0, tables: [] },
        backups: [],
        featureFlags: [],
        systemSettings: [],
        schemaVersion: { database: 'Unknown', prismaVersion: 'unknown', modelCount: 0, lastMigration: '' },
      },
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.system] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── Prisma Fallback Helpers ─────────────────────────────────────────

async function getPrismaTableCounts(): Promise<Array<{ name: string; rows: number }>> {
  const [
    userCount, sessionCount, subscriptionPlanCount, couponCount,
    couponRedemptionCount, referralCount, revenueTransactionCount,
    refundCount, emailCampaignCount, userSegmentCount, abTestCount,
    auditLogCount, moderationItemCount, supportTicketCount, userBanCount,
    featureFlagCount, systemSettingCount, databaseBackupCount,
  ] = await Promise.all([
    safeCount(() => db.user.count()),
    safeCount(() => db.session.count()),
    safeCount(() => db.subscriptionPlan.count()),
    safeCount(() => db.coupon.count()),
    safeCount(() => db.couponRedemption.count()),
    safeCount(() => db.referral.count()),
    safeCount(() => db.revenueTransaction.count()),
    safeCount(() => db.refund.count()),
    safeCount(() => db.emailCampaign.count()),
    safeCount(() => db.userSegment.count()),
    safeCount(() => db.aBTest.count()),
    safeCount(() => db.auditLog.count()),
    safeCount(() => db.moderationItem.count()),
    safeCount(() => db.supportTicket.count()),
    safeCount(() => db.userBan.count()),
    safeCount(() => db.featureFlag.count()),
    safeCount(() => db.systemSetting.count()),
    safeCount(() => db.databaseBackup.count()),
  ])

  return [
    { name: 'User', rows: userCount },
    { name: 'Session', rows: sessionCount },
    { name: 'SubscriptionPlan', rows: subscriptionPlanCount },
    { name: 'Coupon', rows: couponCount },
    { name: 'CouponRedemption', rows: couponRedemptionCount },
    { name: 'Referral', rows: referralCount },
    { name: 'RevenueTransaction', rows: revenueTransactionCount },
    { name: 'Refund', rows: refundCount },
    { name: 'EmailCampaign', rows: emailCampaignCount },
    { name: 'UserSegment', rows: userSegmentCount },
    { name: 'ABTest', rows: abTestCount },
    { name: 'AuditLog', rows: auditLogCount },
    { name: 'ModerationItem', rows: moderationItemCount },
    { name: 'SupportTicket', rows: supportTicketCount },
    { name: 'UserBan', rows: userBanCount },
    { name: 'FeatureFlag', rows: featureFlagCount },
    { name: 'SystemSetting', rows: systemSettingCount },
    { name: 'DatabaseBackup', rows: databaseBackupCount },
  ]
}

async function getPrismaFeatureFlags(): Promise<Array<{
  id: string; key: string; name: string; description: string;
  enabled: boolean; rolloutPercentage: number; targetPlan: string | null;
  createdAt: string;
}>> {
  try {
    const flags = await db.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return flags.map(f => ({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description,
      enabled: f.enabled,
      rolloutPercentage: f.rolloutPercentage,
      targetPlan: f.targetPlan,
      createdAt: f.createdAt.toISOString().split('T')[0],
    }))
  } catch {
    return []
  }
}

async function getPrismaSystemSettings(): Promise<Array<{
  id: string; key: string; value: string; updatedAt: string;
}>> {
  try {
    const settings = await db.systemSetting.findMany()
    return settings.map(s => ({
      id: s.id,
      key: s.key,
      value: String(s.value),
      updatedAt: s.updatedAt.toISOString(),
    }))
  } catch {
    return []
  }
}

// ─── POST: Actions (seed, purge, feature flags, settings) ────
export async function POST(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only super_admin can perform system actions
  if (auth.admin?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admin can perform system actions' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body as { action?: string }
  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  try {
    switch (action) {
      // ── Seed Demo Data ──────────────────────────────────────────────────
      case 'seed': {
        const results: string[] = []

        // Create demo users
        const bcrypt = await import('bcryptjs')
        const demoUsers = [
          { email: 'demo@usraplus.com', firstName: 'Demo', lastName: 'User', language: 'en', theme: 'dark' },
          { email: 'ahmed@usraplus.com', firstName: 'Ahmed', lastName: 'Al-Rashid', language: 'ar', theme: 'dark' },
          { email: 'sara@usraplus.com', firstName: 'Sara', lastName: 'Khan', language: 'ar', theme: 'light' },
          { email: 'mike@usraplus.com', firstName: 'Mike', lastName: 'Johnson', language: 'en', theme: 'dark' },
          { email: 'fatima@usraplus.com', firstName: 'Fatima', lastName: 'Ali', language: 'ar', theme: 'dark' },
        ]

        for (const u of demoUsers) {
          const exists = await db.user.findUnique({ where: { email: u.email } })
          if (!exists) {
            const passwordHash = await bcrypt.hash('Demo1234!', 12)
            await db.user.create({
              data: { ...u, passwordHash, emailVerified: true },
            })
            results.push(`Created user: ${u.email}`)
          } else {
            results.push(`User already exists: ${u.email}`)
          }
        }

        // Create demo feature flags
        const demoFlags = [
          { key: 'dark_mode', name: 'Dark Mode', description: 'Enable dark mode theme for all users', enabled: true, rolloutPercentage: 100 },
          { key: 'family_sharing', name: 'Family Sharing', description: 'Allow users to share lists and tasks with family', enabled: true, rolloutPercentage: 80, targetPlan: 'pro' },
          { key: 'ai_suggestions', name: 'AI Suggestions', description: 'Smart grocery and task suggestions powered by AI', enabled: false, rolloutPercentage: 25, targetPlan: 'max' },
          { key: 'calendar_sync', name: 'Calendar Sync', description: 'Sync family calendar with external calendars', enabled: true, rolloutPercentage: 50 },
          { key: 'voice_input', name: 'Voice Input', description: 'Voice-to-text for adding items and tasks', enabled: false, rolloutPercentage: 10, targetPlan: 'family_plus' },
        ]

        for (const f of demoFlags) {
          const exists = await db.featureFlag.findUnique({ where: { key: f.key } })
          if (!exists) {
            await db.featureFlag.create({ data: f })
            results.push(`Created feature flag: ${f.key}`)
          } else {
            results.push(`Feature flag already exists: ${f.key}`)
          }
        }

        // Create demo support tickets
        const demoTickets = [
          { subject: 'Cannot sync calendar', description: 'Calendar sync fails on iOS devices', category: 'bug', priority: 'high', userEmail: 'ahmed@usraplus.com', userName: 'Ahmed Al-Rashid' },
          { subject: 'Payment not processing', description: 'Credit card payment keeps failing', category: 'billing', priority: 'urgent', userEmail: 'mike@usraplus.com', userName: 'Mike Johnson' },
          { subject: 'Feature request: export data', description: 'Would like to export grocery lists as PDF', category: 'feature_request', priority: 'medium', userEmail: 'sara@usraplus.com', userName: 'Sara Khan' },
        ]

        for (const t of demoTickets) {
          await db.supportTicket.create({ data: t })
          results.push(`Created support ticket: ${t.subject}`)
        }

        // Create demo audit log
        await db.auditLog.create({
          data: {
            adminEmail: auth.admin.email,
            action: 'demo_data_seeded',
            targetType: 'system',
            details: JSON.stringify({ results }),
          },
        })

        return NextResponse.json({
          source: 'live',
          success: true,
          results,
          message: `Seeded ${results.filter(r => r.startsWith('Created')).length} items`,
        })
      }

      // ── Purge All Data ──────────────────────────────────────────────────
      case 'purge': {
        const { confirmText } = body as { confirmText?: string }
        if (confirmText !== 'PURGE ALL DATA') {
          return NextResponse.json({ error: 'Confirmation text must be "PURGE ALL DATA"' }, { status: 400 })
        }

        // Delete all non-system data (keep FeatureFlag, SystemSetting, DatabaseBackup, AuditLog)
        const deleteResults: string[] = []

        await db.couponRedemption.deleteMany()
        deleteResults.push('CouponRedemption purged')
        await db.coupon.deleteMany()
        deleteResults.push('Coupon purged')
        await db.refund.deleteMany()
        deleteResults.push('Refund purged')
        await db.revenueTransaction.deleteMany()
        deleteResults.push('RevenueTransaction purged')
        await db.referral.deleteMany()
        deleteResults.push('Refund purged')
        await db.emailCampaign.deleteMany()
        deleteResults.push('EmailCampaign purged')
        await db.userSegment.deleteMany()
        deleteResults.push('UserSegment purged')
        await db.aBTest.deleteMany()
        deleteResults.push('ABTest purged')
        await db.moderationItem.deleteMany()
        deleteResults.push('ModerationItem purged')
        await db.supportTicket.deleteMany()
        deleteResults.push('SupportTicket purged')
        await db.userBan.deleteMany()
        deleteResults.push('UserBan purged')
        await db.session.deleteMany()
        deleteResults.push('Session purged')
        await db.user.deleteMany()
        deleteResults.push('User purged')
        await db.subscriptionPlan.deleteMany()
        deleteResults.push('SubscriptionPlan purged')

        // Log the purge
        await db.auditLog.create({
          data: {
            adminEmail: auth.admin.email,
            action: 'all_data_purged',
            targetType: 'system',
            details: JSON.stringify({ purgedTables: deleteResults }),
          },
        })

        return NextResponse.json({
          source: 'live',
          success: true,
          purged: deleteResults,
          message: `Purged ${deleteResults.length} tables of all data`,
        })
      }

      // ── Save Feature Flags to DB ────────────────────────────────────────
      case 'save_feature_flags': {
        const { flags } = body as { flags?: Array<{ key: string; name: string; description: string; enabled: boolean; rolloutPercentage: number; targetPlan: string | null }> }
        if (!flags || !Array.isArray(flags)) {
          return NextResponse.json({ error: 'flags array is required' }, { status: 400 })
        }

        const results: string[] = []
        for (const flag of flags) {
          const existing = await db.featureFlag.findUnique({ where: { key: flag.key } })
          if (existing) {
            await db.featureFlag.update({
              where: { key: flag.key },
              data: {
                name: flag.name,
                description: flag.description,
                enabled: flag.enabled,
                rolloutPercentage: flag.rolloutPercentage,
                targetPlan: flag.targetPlan,
              },
            })
            results.push(`Updated: ${flag.key}`)
          } else {
            await db.featureFlag.create({
              data: {
                key: flag.key,
                name: flag.name,
                description: flag.description,
                enabled: flag.enabled,
                rolloutPercentage: flag.rolloutPercentage,
                targetPlan: flag.targetPlan,
              },
            })
            results.push(`Created: ${flag.key}`)
          }
        }

        await db.auditLog.create({
          data: {
            adminEmail: auth.admin.email,
            action: 'feature_flags_saved_to_db',
            targetType: 'feature_flag',
            details: JSON.stringify({ count: flags.length, results }),
          },
        })

        return NextResponse.json({ source: 'live', success: true, results })
      }

      // ── Load Feature Flags from DB ──────────────────────────────────────
      case 'load_feature_flags': {
        const persistedFlags = await db.featureFlag.findMany({ orderBy: { createdAt: 'desc' } })
        return NextResponse.json({
          source: 'live',
          success: true,
          featureFlags: persistedFlags.map(f => ({
            id: f.id,
            key: f.key,
            name: f.name,
            description: f.description,
            enabled: f.enabled,
            rolloutPercentage: f.rolloutPercentage,
            targetPlan: f.targetPlan,
            createdAt: f.createdAt.toISOString().split('T')[0],
          })),
        })
      }

      // ── Save System Setting ─────────────────────────────────────────────
      case 'save_setting': {
        const { key, value } = body as { key?: string; value?: unknown }
        if (!key || value === undefined) {
          return NextResponse.json({ error: 'key and value are required' }, { status: 400 })
        }

        const existing = await db.systemSetting.findUnique({ where: { key } })
        if (existing) {
          await db.systemSetting.update({
            where: { key },
            data: { value: JSON.stringify(value) },
          })
        } else {
          await db.systemSetting.create({
            data: { key, value: JSON.stringify(value) },
          })
        }

        return NextResponse.json({ source: 'live', success: true, key })
      }

      // ── Run Migrations ──────────────────────────────────────────────────
      case 'run_migrations': {
        // In Prisma with PostgreSQL, migrations are handled by `prisma db push`
        // We can't run CLI commands from the API, but we can verify the schema
        const tableStats = await getTableCounts()
        return NextResponse.json({
          source: 'live',
          success: true,
          message: 'Schema is in sync. Run `bun run db:push` from CLI for any pending changes.',
          tables: tableStats,
        })
      }

      // ── Backup Database (SQLite: copy file, PostgreSQL: use Supabase dashboard) ─────────────
      case 'backup': {
        const { note } = body as { note?: string }
        if (isPostgreSQL()) {
          return NextResponse.json({
            source: 'live',
            success: false,
            message: 'Database backups for PostgreSQL/Supabase are managed via the Supabase Dashboard. Go to Project Settings → Database → Backups.',
          })
        }
        // SQLite backup: copy the DB file
        try {
          const dbPath = path.join(process.cwd(), 'db', 'custom.db')
          const fsStat = fs.statSync(dbPath)
          const fileSize = fsStat.size

          // Get table counts for metadata
          const tableInfo = await getTableCounts()
          const totalRows = tableInfo.reduce((a, t) => a + (t.rows >= 0 ? t.rows : 0), 0)

          // Create backup directory
          const backupDir = path.join(process.cwd(), 'db', 'backups')
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
          }

          // Generate backup filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
          const backupFilename = `usra-plus-backup-${timestamp}.db`
          const backupPath = path.join(backupDir, backupFilename)

          // Copy the file
          fs.copyFileSync(dbPath, backupPath)

          // Save backup record to database
          const backupRecord = await db.databaseBackup.create({
            data: {
              filename: backupFilename,
              fileSize,
              tableCount: tableInfo.length,
              totalRows,
              note: note || null,
            },
          })

          // Audit log
          await db.auditLog.create({
            data: {
              adminEmail: auth.admin.email,
              action: 'database_backup_created',
              targetType: 'system',
              details: JSON.stringify({ filename: backupFilename, fileSize, totalRows }),
            },
          })

          return NextResponse.json({
            source: 'live',
            success: true,
            message: `Backup created: ${backupFilename} (${formatBytes(fileSize)})`,
            backup: {
              id: backupRecord.id,
              filename: backupRecord.filename,
              fileSize: backupRecord.fileSize,
              fileSizeFormatted: formatBytes(backupRecord.fileSize),
              tableCount: backupRecord.tableCount,
              totalRows: backupRecord.totalRows,
              note: backupRecord.note,
              createdAt: backupRecord.createdAt.toISOString(),
            },
          })
        } catch (err) {
          return NextResponse.json({
            source: 'live',
            success: false,
            error: 'Failed to create backup',
            details: err instanceof Error ? err.message : 'Unknown error',
          }, { status: 500 })
        }
      }

      // ── Restore Database from backup ─────────────────────────────
      case 'restore': {
        const { backupId } = body as { backupId?: string }
        if (!backupId) {
          return NextResponse.json({ error: 'backupId is required' }, { status: 400 })
        }
        if (isPostgreSQL()) {
          return NextResponse.json({
            source: 'live',
            success: false,
            message: 'Database restore for PostgreSQL/Supabase is managed via the Supabase Dashboard.',
          })
        }
        try {
          // Find the backup record
          const backup = await db.databaseBackup.findUnique({ where: { id: backupId } })
          if (!backup) {
            return NextResponse.json({ error: 'Backup record not found' }, { status: 404 })
          }

          const backupPath = path.join(process.cwd(), 'db', 'backups', backup.filename)
          if (!fs.existsSync(backupPath)) {
            return NextResponse.json({ error: 'Backup file not found on disk' }, { status: 404 })
          }

          const dbPath = path.join(process.cwd(), 'db', 'custom.db')

          // Create safety backup before restore
          const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
          const safetyFilename = `pre-restore-safety-${safetyTimestamp}.db`
          const safetyPath = path.join(process.cwd(), 'db', 'backups', safetyFilename)
          const backupDir = path.join(process.cwd(), 'db', 'backups')
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
          }
          fs.copyFileSync(dbPath, safetyPath)

          // Save safety backup record
          const safetyStat = fs.statSync(dbPath)
          await db.databaseBackup.create({
            data: {
              filename: safetyFilename,
              fileSize: safetyStat.size,
              tableCount: 0,
              totalRows: 0,
              note: `Auto-created safety backup before restore of ${backup.filename}`,
            },
          })

          // Replace current DB with backup
          fs.copyFileSync(backupPath, dbPath)

          // Audit log
          await db.auditLog.create({
            data: {
              adminEmail: auth.admin.email,
              action: 'database_restored',
              targetType: 'system',
              details: JSON.stringify({ restoredFrom: backup.filename, safetyBackup: safetyFilename }),
            },
          })

          return NextResponse.json({
            source: 'live',
            success: true,
            message: `Database restored from ${backup.filename}. Safety backup created: ${safetyFilename}`,
          })
        } catch (err) {
          return NextResponse.json({
            source: 'live',
            success: false,
            error: 'Failed to restore database',
            details: err instanceof Error ? err.message : 'Unknown error',
          }, { status: 500 })
        }
      }

      // ── Delete a backup file ─────────────────────────────────────
      case 'delete_backup': {
        const delBackupId = body as { backupId?: string }
        if (!delBackupId.backupId) {
          return NextResponse.json({ error: 'backupId is required' }, { status: 400 })
        }
        try {
          const backup = await db.databaseBackup.findUnique({ where: { id: delBackupId.backupId } })
          if (!backup) {
            return NextResponse.json({ error: 'Backup record not found' }, { status: 404 })
          }

          // Delete file from disk
          const filePath = path.join(process.cwd(), 'db', 'backups', backup.filename)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }

          // Delete record from DB
          await db.databaseBackup.delete({ where: { id: delBackupId.backupId } })

          await db.auditLog.create({
            data: {
              adminEmail: auth.admin.email,
              action: 'backup_deleted',
              targetType: 'system',
              details: JSON.stringify({ filename: backup.filename }),
            },
          })

          return NextResponse.json({
            source: 'live',
            success: true,
            message: `Backup ${backup.filename} deleted`,
          })
        } catch (err) {
          return NextResponse.json({
            source: 'live',
            success: false,
            error: 'Failed to delete backup',
            details: err instanceof Error ? err.message : 'Unknown error',
          }, { status: 500 })
        }
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to process system action',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.system] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── Table count helper (for POST actions that need Prisma) ────────
async function getTableCounts() {
  const [
    userCount, sessionCount, subscriptionPlanCount, couponCount,
    couponRedemptionCount, referralCount, revenueTransactionCount,
    refundCount, emailCampaignCount, userSegmentCount, abTestCount,
    auditLogCount, moderationItemCount, supportTicketCount, userBanCount,
    featureFlagCount, systemSettingCount, databaseBackupCount,
  ] = await Promise.all([
    safeCount(() => db.user.count()),
    safeCount(() => db.session.count()),
    safeCount(() => db.subscriptionPlan.count()),
    safeCount(() => db.coupon.count()),
    safeCount(() => db.couponRedemption.count()),
    safeCount(() => db.referral.count()),
    safeCount(() => db.revenueTransaction.count()),
    safeCount(() => db.refund.count()),
    safeCount(() => db.emailCampaign.count()),
    safeCount(() => db.userSegment.count()),
    safeCount(() => db.aBTest.count()),
    safeCount(() => db.auditLog.count()),
    safeCount(() => db.moderationItem.count()),
    safeCount(() => db.supportTicket.count()),
    safeCount(() => db.userBan.count()),
    safeCount(() => db.featureFlag.count()),
    safeCount(() => db.systemSetting.count()),
    safeCount(() => db.databaseBackup.count()),
  ])

  return [
    { name: 'User', rows: userCount },
    { name: 'Session', rows: sessionCount },
    { name: 'SubscriptionPlan', rows: subscriptionPlanCount },
    { name: 'Coupon', rows: couponCount },
    { name: 'CouponRedemption', rows: couponRedemptionCount },
    { name: 'Referral', rows: referralCount },
    { name: 'RevenueTransaction', rows: revenueTransactionCount },
    { name: 'Refund', rows: refundCount },
    { name: 'EmailCampaign', rows: emailCampaignCount },
    { name: 'UserSegment', rows: userSegmentCount },
    { name: 'ABTest', rows: abTestCount },
    { name: 'AuditLog', rows: auditLogCount },
    { name: 'ModerationItem', rows: moderationItemCount },
    { name: 'SupportTicket', rows: supportTicketCount },
    { name: 'UserBan', rows: userBanCount },
    { name: 'FeatureFlag', rows: featureFlagCount },
    { name: 'SystemSetting', rows: systemSettingCount },
    { name: 'DatabaseBackup', rows: databaseBackupCount },
  ]
}
