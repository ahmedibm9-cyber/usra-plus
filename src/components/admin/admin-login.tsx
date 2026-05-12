'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, EyeOff, AlertTriangle, Lock, ArrowLeft, Fingerprint, Users } from 'lucide-react'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AdminRole } from '@/types/admin'

const ROLE_OPTIONS: { value: AdminRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Full Access' },
  { value: 'support_admin', label: 'Support Admin', description: 'Tickets & Users' },
  { value: 'analytics_admin', label: 'Analytics Admin', description: 'Read-only Analytics' },
  { value: 'billing_admin', label: 'Billing Admin', description: 'Revenue & Billing' },
]

export function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<AdminRole>('super_admin')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const { loginAdmin, setShowAdminLogin, addAuditLog } = useAdminAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (attempts >= 5) {
      setError('Too many attempts. Access temporarily locked.')
      setIsLoading(false)
      addAuditLog('rate_limited', 'admin_auth', null, { email, attempts })
      return
    }

    try {
      const success = await loginAdmin(email, password, selectedRole)
      if (!success) {
        setAttempts(prev => prev + 1)
        setError('Invalid credentials or unauthorized access.')
        toast.error('Access denied', { description: 'Authentication failed.' })
      } else {
        toast.success('Access granted', { description: 'Welcome to the control center.' })
      }
    } catch {
      setError('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const remainingAttempts = 5 - attempts

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-[--bg-primary] flex items-center justify-center"
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Dot-grid background with yellow tones */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(244,196,48,0.05) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F4C430]/[0.04] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#F4C430]/[0.03] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md mx-4"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-[#F4C430] flex items-center justify-center shadow-lg shadow-[#F4C430]/20"
            >
              <Shield className="w-10 h-10 text-black" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight font-['Space_Grotesk',sans-serif]">Internal Control Center</h1>
            <p className="text-sm text-[--text-muted] mt-2 font-['Inter',sans-serif]">Authorized personnel only. All access is monitored and logged.</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onSubmit={handleSubmit}
            className="bg-[--bg-surface] rounded-2xl border border-[--border-subtle] p-8 space-y-5 shadow-xl"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-3 p-3 rounded-lg bg-[--status-danger-bg] border border-[--status-danger-border]"
              >
                <AlertTriangle className="w-4 h-4 text-[--status-danger] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-[--status-danger]">{error}</p>
                  {attempts > 0 && attempts < 5 && (
                    <p className="text-xs text-[--status-danger] mt-1">{remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before lockout</p>
                  )}
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-2 font-['Inter',sans-serif]">Admin Email</label>
              <div className="relative">
                <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@usraplus.com"
                  required
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-[--bg-primary] border border-[--border-subtle] rounded-xl text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/50 focus:ring-1 focus:ring-[#F4C430]/20 transition-all text-sm font-['Inter',sans-serif]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-2 font-['Inter',sans-serif]">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="off"
                  className="w-full pl-10 pr-12 py-3 bg-[--bg-primary] border border-[--border-subtle] rounded-xl text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/50 focus:ring-1 focus:ring-[#F4C430]/20 transition-all text-sm font-['Inter',sans-serif]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-secondary] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-2 font-['Inter',sans-serif]">Access Role</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 pointer-events-none" />
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as AdminRole)}
                >
                  <SelectTrigger className="w-full pl-10 py-3 bg-[--bg-primary] border border-[--border-subtle] rounded-xl text-[--text-primary] text-sm focus:outline-none focus:border-[#F4C430]/50 focus:ring-1 focus:ring-[#F4C430]/20 h-auto min-h-[44px] [&>svg]:text-[--text-muted] font-['Inter',sans-serif]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[--bg-surface] border-[--border-subtle] rounded-xl">
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-[--text-primary] focus:bg-[#F4C430]/10 focus:text-[#F4C430] rounded-lg cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-[11px] text-[--text-muted]">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || attempts >= 5}
              className="w-full py-3 bg-[#F4C430] hover:bg-[#E0B52E] text-black rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#F4C430]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden font-['Space_Grotesk',sans-serif]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <span>Access Control Center</span>
              )}
            </button>

            <div className="text-center">
              <p className="text-[10px] text-[--text-muted] leading-relaxed font-['Inter',sans-serif]">
                All login attempts are monitored, logged, and audited.<br />
                Unauthorized access is strictly prohibited and may result in legal action.
              </p>
            </div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-6"
          >
            <button
              onClick={() => setShowAdminLogin(false)}
              className="inline-flex items-center gap-2 text-sm text-[--text-muted] hover:text-[--text-secondary] transition-colors font-['Inter',sans-serif]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to USRA PLUS
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
