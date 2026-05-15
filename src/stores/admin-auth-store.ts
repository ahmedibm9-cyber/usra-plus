'use client'

import { create } from 'zustand'
import type { AdminRole, AdminUser, AdminAuditLog } from '@/types/admin'
import { safeJsonResponse } from '@/lib/safe-fetch'

// ─── Session Management ────────────────────────────────────────────────────
// Admin session uses httpOnly cookies set by the server.
// Client-side only tracks in-memory state for UX purposes.

interface AdminAuthState {
  isAdminAuthenticated: boolean
  adminUser: AdminUser | null
  adminRole: AdminRole | null
  adminLogs: AdminAuditLog[]
  logoClickCount: number
  logoClickStartTime: number | null
  showAdminLogin: boolean
  sessionExpiry: number | null
  stealthCooldownUntil: number | null

  // Actions
  loginAdmin: (email: string, password: string, role?: AdminRole) => Promise<boolean>
  logoutAdmin: () => void
  incrementLogoClick: () => boolean
  resetLogoClick: () => void
  setShowAdminLogin: (show: boolean) => void
  addAuditLog: (action: string, targetType: string, targetId: string | null, details?: Record<string, unknown>) => void
  hasPermission: (requiredRole: AdminRole[]) => boolean
  isSessionValid: () => boolean
  checkAndExtendSession: () => boolean
}

// Single admin credential — role selected at login
const FOUNDER_EMAILS = [
  'admin@usraplus.com',
]

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 4,
  billing_admin: 3,
  support_admin: 2,
  analytics_admin: 1,
}

const SESSION_DURATION = 4 * 60 * 60 * 1000 // 4 hours
const STEALTH_CLICK_WINDOW = 2000 // 2 seconds for 7 clicks
const STEALTH_REQUIRED_CLICKS = 7
const STEALTH_COOLDOWN = 30000 // 30-second cooldown after 3 failed stealth attempts
const STEALTH_MAX_ATTEMPTS = 3 // Failed attempts before cooldown

let logoClickTimerId: ReturnType<typeof setTimeout> | null = null
let stealthAttemptCount = 0

export const useAdminAuthStore = create<AdminAuthState>()(
  (set, get) => ({
    isAdminAuthenticated: false,
    adminUser: null,
    adminRole: null,
    adminLogs: [],
    logoClickCount: 0,
    logoClickStartTime: null,
    showAdminLogin: false,
    sessionExpiry: null,
    stealthCooldownUntil: null,

    loginAdmin: async (email: string, password: string, role?: AdminRole): Promise<boolean> => {
      const isAllowedEmail = FOUNDER_EMAILS.includes(email)
      
      if (!isAllowedEmail) {
        get().addAuditLog('unauthorized_login_attempt', 'admin_auth', null, { email })
        return false
      }

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: role || 'super_admin' }),
        })

        if (!response.ok) {
          get().addAuditLog('failed_login', 'admin_auth', null, { email, status: response.status })
          return false
        }

        const data = await safeJsonResponse<{ success: boolean; adminUser?: AdminUser }>(response)
        
        if (!data || !data.success || !data.adminUser) {
          get().addAuditLog('failed_login', 'admin_auth', null, { email })
          return false
        }

        const adminUser: AdminUser = data.adminUser
        const sessionExpiry = Date.now() + SESSION_DURATION

        set({
          isAdminAuthenticated: true,
          adminUser,
          adminRole: adminUser.role,
          sessionExpiry,
          showAdminLogin: false,
        })

        get().addAuditLog('admin_login', 'admin_auth', adminUser.id, { email, role: adminUser.role })
        return true
      } catch (error) {
        console.error('[AdminAuth] Login request failed:', error)
        get().addAuditLog('login_error', 'admin_auth', null, { email, error: String(error) })
        return false
      }
    },

    logoutAdmin: () => {
      const { adminUser } = get()
      if (adminUser) {
        get().addAuditLog('admin_logout', 'admin_auth', adminUser.id, { email: adminUser.email })
      }
      try {
        document.cookie = 'usra-admin-session=; path=/; max-age=0; SameSite=Strict'
      } catch { /* ignore */ }

      set({
        isAdminAuthenticated: false,
        adminUser: null,
        adminRole: null,
        sessionExpiry: null,
      })
    },

    // ─── Stealth Access: 7 clicks within 2 seconds ──────────────────────
    incrementLogoClick: (): boolean => {
      const now = Date.now()
      const { stealthCooldownUntil } = get()
      
      // Check cooldown
      if (stealthCooldownUntil && now < stealthCooldownUntil) {
        return false // Still in cooldown
      }

      const { logoClickStartTime, logoClickCount } = get()
      let newStartTime = logoClickStartTime
      
      // If this is the first click, start the timer
      if (logoClickCount === 0 || !logoClickStartTime) {
        newStartTime = now
      }
      
      const newCount = logoClickCount + 1
      
      // Check if clicks are within the 2-second window
      const elapsed = now - (newStartTime || now)
      
      if (elapsed > STEALTH_CLICK_WINDOW) {
        // Too slow — reset the sequence
        set({ logoClickCount: 1, logoClickStartTime: now })
        if (logoClickTimerId) { clearTimeout(logoClickTimerId); logoClickTimerId = null }
        return false
      }
      
      if (newCount >= STEALTH_REQUIRED_CLICKS) {
        // Success! Unlock admin login
        set({ showAdminLogin: true, logoClickCount: 0, logoClickStartTime: null })
        stealthAttemptCount = 0 // Reset attempts on success
        get().addAuditLog('stealth_access_triggered', 'admin_auth', null, { 
          method: '7_click_logo', 
          duration_ms: elapsed,
          success: true 
        })
        if (logoClickTimerId) { clearTimeout(logoClickTimerId); logoClickTimerId = null }
        return true
      }
      
      set({ logoClickCount: newCount, logoClickStartTime: newStartTime })
      
      // Auto-reset after window expires
      if (logoClickTimerId) clearTimeout(logoClickTimerId)
      logoClickTimerId = setTimeout(() => {
        const current = get().logoClickCount
        if (current === newCount) {
          // Failed attempt — sequence timed out
          stealthAttemptCount++
          
          if (stealthAttemptCount >= STEALTH_MAX_ATTEMPTS) {
            // Apply cooldown
            const cooldownUntil = Date.now() + STEALTH_COOLDOWN
            set({ logoClickCount: 0, logoClickStartTime: null, stealthCooldownUntil: cooldownUntil })
            get().addAuditLog('stealth_access_cooldown', 'admin_auth', null, { 
              attempts: stealthAttemptCount,
              cooldown_ms: STEALTH_COOLDOWN 
            })
            stealthAttemptCount = 0
          } else {
            set({ logoClickCount: 0, logoClickStartTime: null })
          }
        }
        logoClickTimerId = null
      }, STEALTH_CLICK_WINDOW)
      
      return false
    },

    resetLogoClick: () => set({ logoClickCount: 0, logoClickStartTime: null }),

    setShowAdminLogin: (show: boolean) => set({ showAdminLogin: show }),

    addAuditLog: (action: string, targetType: string, targetId: string | null, details?: Record<string, unknown>) => {
      const { adminUser, adminLogs } = get()
      const newLog: AdminAuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        admin_id: adminUser?.id || 'anonymous',
        admin_email: adminUser?.email || 'unknown',
        action,
        target_type: targetType,
        target_id: targetId,
        details: details || {},
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        created_at: new Date().toISOString(),
      }
      set({ adminLogs: [newLog, ...adminLogs].slice(0, 500) })
    },

    hasPermission: (requiredRoles: AdminRole[]): boolean => {
      const { adminRole } = get()
      if (!adminRole) return false
      if (adminRole === 'super_admin') return true
      return requiredRoles.includes(adminRole)
    },

    isSessionValid: (): boolean => {
      const { sessionExpiry, isAdminAuthenticated } = get()
      if (!isAdminAuthenticated || !sessionExpiry) return false
      return Date.now() < sessionExpiry
    },

    checkAndExtendSession: (): boolean => {
      const { sessionExpiry, isAdminAuthenticated } = get()
      if (!isAdminAuthenticated || !sessionExpiry) return false
      
      if (Date.now() > sessionExpiry) {
        try {
          document.cookie = 'usra-admin-session=; path=/; max-age=0; SameSite=Strict'
        } catch { /* ignore */ }
        set({ isAdminAuthenticated: false, adminUser: null, adminRole: null, sessionExpiry: null })
        return false
      }
      
      const newExpiry = Date.now() + SESSION_DURATION
      set({ sessionExpiry: newExpiry })
      return true
    },
  })
)

export function getAdminAuthHeaders(): Record<string, string> {
  return {}
}
