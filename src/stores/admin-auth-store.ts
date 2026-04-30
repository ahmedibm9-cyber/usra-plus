'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminRole, AdminUser, AdminAuditLog } from '@/types/admin'

interface AdminAuthState {
  isAdminAuthenticated: boolean
  adminUser: AdminUser | null
  adminRole: AdminRole | null
  adminLogs: AdminAuditLog[]
  logoClickCount: number
  showAdminLogin: boolean
  sessionExpiry: number | null

  // Actions
  loginAdmin: (email: string, password: string) => Promise<boolean>
  logoutAdmin: () => void
  incrementLogoClick: () => boolean
  resetLogoClick: () => void
  setShowAdminLogin: (show: boolean) => void
  addAuditLog: (action: string, targetType: string, targetId: string | null, details?: Record<string, unknown>) => void
  hasPermission: (requiredRole: AdminRole[]) => boolean
  isSessionValid: () => boolean
  checkAndExtendSession: () => boolean
}

// Founder email allowlist
const FOUNDER_EMAILS = [
  'admin@usraplus.com',
  'founder@usraplus.com',
  'hello@usraplus.com',
]

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 4,
  billing_admin: 3,
  support_admin: 2,
  analytics_admin: 1,
}

// Demo admin credentials (in production, this would be Supabase auth)
const DEMO_ADMINS: Record<string, { password: string; role: AdminRole; name: string }> = {
  'admin@usraplus.com': { password: 'usra2024admin', role: 'super_admin', name: 'USRA Founder' },
  'support@usraplus.com': { password: 'support2024', role: 'support_admin', name: 'Support Admin' },
  'analytics@usraplus.com': { password: 'analytics2024', role: 'analytics_admin', name: 'Analytics Admin' },
  'billing@usraplus.com': { password: 'billing2024', role: 'billing_admin', name: 'Billing Admin' },
}

const SESSION_DURATION = 4 * 60 * 60 * 1000 // 4 hours

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      isAdminAuthenticated: false,
      adminUser: null,
      adminRole: null,
      adminLogs: [],
      logoClickCount: 0,
      showAdminLogin: false,
      sessionExpiry: null,

      loginAdmin: async (email: string, password: string): Promise<boolean> => {
        // Check founder email allowlist
        const isAllowedEmail = FOUNDER_EMAILS.includes(email) || DEMO_ADMINS[email]
        
        if (!isAllowedEmail) {
          // Log unauthorized access attempt
          get().addAuditLog('unauthorized_login_attempt', 'admin_auth', null, { email })
          return false
        }

        // Check demo credentials
        const adminConfig = DEMO_ADMINS[email]
        if (!adminConfig || adminConfig.password !== password) {
          get().addAuditLog('failed_login', 'admin_auth', null, { email })
          return false
        }

        const adminUser: AdminUser = {
          id: `admin-${email.split('@')[0]}`,
          email,
          role: adminConfig.role,
          name: adminConfig.name,
          avatar_url: null,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }

        const sessionExpiry = Date.now() + SESSION_DURATION

        set({
          isAdminAuthenticated: true,
          adminUser,
          adminRole: adminConfig.role,
          sessionExpiry,
          showAdminLogin: false,
        })

        get().addAuditLog('admin_login', 'admin_auth', adminUser.id, { email, role: adminConfig.role })
        return true
      },

      logoutAdmin: () => {
        const { adminUser } = get()
        if (adminUser) {
          get().addAuditLog('admin_logout', 'admin_auth', adminUser.id, { email: adminUser.email })
        }
        set({
          isAdminAuthenticated: false,
          adminUser: null,
          adminRole: null,
          sessionExpiry: null,
        })
      },

      incrementLogoClick: (): boolean => {
        const newCount = get().logoClickCount + 1
        set({ logoClickCount: newCount })
        
        if (newCount >= 7) {
          set({ showAdminLogin: true, logoClickCount: 0 })
          get().addAuditLog('stealth_access_triggered', 'admin_auth', null, { method: '7_click_logo' })
          return true
        }
        
        // Reset after 3 seconds of inactivity
        setTimeout(() => {
          const currentCount = get().logoClickCount
          if (currentCount === newCount) {
            set({ logoClickCount: 0 })
          }
        }, 3000)
        
        return false
      },

      resetLogoClick: () => set({ logoClickCount: 0 }),

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
        set({ adminLogs: [newLog, ...adminLogs].slice(0, 500) }) // Keep last 500 logs
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
          set({ isAdminAuthenticated: false, adminUser: null, adminRole: null, sessionExpiry: null })
          return false
        }
        
        // Extend session on activity
        set({ sessionExpiry: Date.now() + SESSION_DURATION })
        return true
      },
    }),
    {
      name: 'usra-admin-auth',
      partialize: (state) => ({
        isAdminAuthenticated: state.isAdminAuthenticated,
        adminUser: state.adminUser,
        adminRole: state.adminRole,
        sessionExpiry: state.sessionExpiry,
        adminLogs: state.adminLogs,
      }),
    }
  )
)
