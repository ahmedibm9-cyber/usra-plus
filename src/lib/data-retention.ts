/**
 * Data Retention Policy — USRA PLUS
 *
 * Defines retention periods for each data type and provides
 * a cleanup function that deletes data past its retention period.
 *
 * Callable from a cron job or admin endpoint.
 */

import { db } from '@/lib/db'

/**
 * Data retention periods (in days).
 * Each entry defines how long data of that type should be retained
 * before it becomes eligible for cleanup.
 */
export const DATA_RETENTION_PERIODS: Record<string, { days: number; description: string }> = {
  sessions: {
    days: 90,
    description: 'Session data is retained for 90 days after expiry for security auditing',
  },
  verificationCodes: {
    days: 30,
    description: 'Verification codes are retained for 30 days after use for rate limiting and abuse prevention',
  },
  consents: {
    days: 2555, // 7 years
    description: 'Consent records are retained for 7 years as a legal requirement under GDPR and PDPL',
  },
  revenueTransactions: {
    days: 2555, // 7 years
    description: 'Revenue transactions are retained for 7 years for tax compliance (Saudi VAT law)',
  },
  auditLogs: {
    days: 1095, // 3 years
    description: 'Audit logs are retained for 3 years for compliance and security review',
  },
  userSubscriptions: {
    days: 2555, // 7 years
    description: 'Subscription records are retained for 7 years after cancellation for tax and legal compliance',
  },
}

interface CleanupResult {
  model: string
  deletedCount: number
  error?: string
}

/**
 * Delete data that has exceeded its retention period.
 * Returns a summary of what was cleaned up.
 *
 * This should be called periodically (e.g., daily cron job).
 */
export async function cleanupExpiredData(): Promise<CleanupResult[]> {
  const now = new Date()
  const results: CleanupResult[] = []

  // ─── Sessions: Delete sessions expired more than 90 days ago ──
  try {
    const sessionCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.sessions.days * 24 * 60 * 60 * 1000)
    const deletedSessions = await db.session.deleteMany({
      where: {
        expiresAt: { lt: sessionCutoff },
      },
    })
    results.push({ model: 'Session', deletedCount: deletedSessions.count })
  } catch (err) {
    results.push({ model: 'Session', deletedCount: 0, error: String(err) })
  }

  // ─── Verification Codes: Delete codes used/created more than 30 days ago ──
  try {
    const verificationCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.verificationCodes.days * 24 * 60 * 60 * 1000)
    const deletedCodes = await db.verificationCode.deleteMany({
      where: {
        createdAt: { lt: verificationCutoff },
      },
    })
    results.push({ model: 'VerificationCode', deletedCount: deletedCodes.count })
  } catch (err) {
    results.push({ model: 'VerificationCode', deletedCount: 0, error: String(err) })
  }

  // ─── Audit Logs: Delete logs older than 3 years ──
  try {
    const auditCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.auditLogs.days * 24 * 60 * 60 * 1000)
    const deletedLogs = await db.auditLog.deleteMany({
      where: {
        createdAt: { lt: auditCutoff },
      },
    })
    results.push({ model: 'AuditLog', deletedCount: deletedLogs.count })
  } catch (err) {
    results.push({ model: 'AuditLog', deletedCount: 0, error: String(err) })
  }

  // Note: Consents, RevenueTransactions, and UserSubscriptions have 7-year retention
  // and are NOT auto-deleted. They require manual review or separate admin action.

  return results
}

/**
 * Get a summary of data counts by retention status.
 * Useful for admin dashboards and compliance reporting.
 */
export async function getRetentionStats(): Promise<Record<string, { total: number; expired: number; retentionDays: number }>> {
  const now = new Date()

  const sessionCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.sessions.days * 24 * 60 * 60 * 1000)
  const verificationCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.verificationCodes.days * 24 * 60 * 60 * 1000)
  const auditCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.auditLogs.days * 24 * 60 * 60 * 1000)

  const [
    totalSessions,
    expiredSessions,
    totalVerificationCodes,
    expiredVerificationCodes,
    totalAuditLogs,
    expiredAuditLogs,
    totalConsents,
    totalRevenueTransactions,
    totalUserSubscriptions,
  ] = await Promise.all([
    db.session.count(),
    db.session.count({ where: { expiresAt: { lt: sessionCutoff } } }),
    db.verificationCode.count(),
    db.verificationCode.count({ where: { createdAt: { lt: verificationCutoff } } }),
    db.auditLog.count(),
    db.auditLog.count({ where: { createdAt: { lt: auditCutoff } } }),
    db.consent.count(),
    db.revenueTransaction.count(),
    db.userSubscription.count(),
  ])

  return {
    sessions: {
      total: totalSessions,
      expired: expiredSessions,
      retentionDays: DATA_RETENTION_PERIODS.sessions.days,
    },
    verificationCodes: {
      total: totalVerificationCodes,
      expired: expiredVerificationCodes,
      retentionDays: DATA_RETENTION_PERIODS.verificationCodes.days,
    },
    auditLogs: {
      total: totalAuditLogs,
      expired: expiredAuditLogs,
      retentionDays: DATA_RETENTION_PERIODS.auditLogs.days,
    },
    consents: {
      total: totalConsents,
      expired: 0, // Never auto-expire
      retentionDays: DATA_RETENTION_PERIODS.consents.days,
    },
    revenueTransactions: {
      total: totalRevenueTransactions,
      expired: 0, // Never auto-expire
      retentionDays: DATA_RETENTION_PERIODS.revenueTransactions.days,
    },
    userSubscriptions: {
      total: totalUserSubscriptions,
      expired: 0, // Never auto-expire
      retentionDays: DATA_RETENTION_PERIODS.userSubscriptions.days,
    },
  }
}
