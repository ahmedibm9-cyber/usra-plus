/**
 * Audit Logger for USRA PLUS
 *
 * Records administrative actions and security-relevant events
 * to the AuditLog table for compliance and security monitoring.
 */

import { db } from './db'

export type AuditAction =
  | 'admin_login'
  | 'admin_logout'
  | 'user_delete'
  | 'user_export'
  | 'subscription_change'
  | 'payment_processed'
  | 'refund_issued'
  | 'coupon_created'
  | 'settings_updated'
  | 'data_cleanup'
  | 'consent_change'
  | 'role_change'
  | 'security_event'
  | 'system_config'

interface AuditLogParams {
  action: AuditAction | string
  actorEmail?: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit event.
 * Never throws — errors are caught and logged to console.
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        adminEmail: params.actorEmail || 'system',
        action: params.action,
        targetType: params.targetType || 'system',
        targetId: params.targetId,
        details: JSON.stringify(params.details || {}),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (error) {
    console.error('[AuditLogger] Failed to log event:', error)
  }
}

/**
 * Log an admin action with request context.
 */
export async function logAdminAction(
  request: Request,
  action: AuditAction | string,
  actorEmail: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const forwarded = request.headers.get('x-forwarded-for')
  const ipAddress = forwarded?.split(',')[0]?.trim()
  const userAgent = request.headers.get('user-agent') || undefined

  await logAuditEvent({
    action,
    actorEmail,
    targetType: 'admin',
    details,
    ipAddress,
    userAgent,
  })
}
