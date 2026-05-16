'use client'

import React, { useState, useCallback } from 'react'
import { KeyRound, Loader2, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { useAuthStore } from '@/stores/auth-store'
import type { SubscriptionPlan } from '@/types'

// ─── OtpActivation Component ────────────────────────────────────────

export function OtpActivation() {
  const [otpCode, setOtpCode] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    plan?: string
    startDate?: string
    endDate?: string
    error?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const { setPlan, fetchPlanFromServer } = useSubscriptionStore()
  const { user } = useAuthStore()

  const handleActivate = useCallback(async () => {
    if (!otpCode.trim()) {
      toast.error('Please enter an OTP code')
      return
    }

    setIsActivating(true)
    setResult(null)

    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ otpCode: otpCode.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResult({
          success: true,
          plan: data.subscription?.plan,
          startDate: data.subscription?.startDate,
          endDate: data.subscription?.endDate,
        })

        // Update the subscription store
        if (data.subscription?.plan) {
          setPlan(data.subscription.plan as SubscriptionPlan)
          // Refresh from server after a short delay
          if (user?.id) {
            setTimeout(() => fetchPlanFromServer(user.id), 1000)
          }
        }

        toast.success('Subscription activated successfully!')
        setOtpCode('')
      } else {
        setResult({
          success: false,
          error: data.error || 'Activation failed',
        })
        toast.error(data.error || 'Failed to activate subscription')
      }
    } catch {
      setResult({
        success: false,
        error: 'Network error. Please try again.',
      })
      toast.error('Network error. Please try again.')
    } finally {
      setIsActivating(false)
    }
  }, [otpCode, setPlan, fetchPlanFromServer, user?.id])

  const handleCopyPlan = () => {
    if (!result?.plan) return
    navigator.clipboard.writeText(result.plan)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* OTP Input Section */}
      <div className="bg-card border border-outline-variant rounded-2xl p-6 shadow-[var(--elevation-1)]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-foreground text-base font-semibold">Activate Subscription</h3>
            <p className="text-muted-foreground text-xs">Enter the OTP code provided by your administrator</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-foreground text-xs mb-1.5 block font-medium">OTP Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={otpCode}
                onChange={e => {
                  setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                  setResult(null)
                }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="flex-1 bg-muted border border-border text-foreground rounded-lg px-4 py-3 text-lg font-mono tracking-[0.5em] text-center focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:tracking-normal placeholder:text-sm"
                disabled={isActivating}
              />
              <button
                onClick={handleActivate}
                disabled={isActivating || otpCode.length !== 6}
                className="px-5 py-3 rounded-lg bg-primary hover:bg-primary/80 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result Section */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.success ? 'success' : 'error'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {result.success ? (
              <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-base font-semibold">Subscription Activated!</h3>
                    <p className="text-muted-foreground text-xs">Your plan has been upgraded successfully</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plan</p>
                    <p className="text-foreground text-sm font-semibold mt-0.5 flex items-center gap-2">
                      {result.plan === 'family_plus' ? 'Family+' : result.plan?.charAt(0).toUpperCase() + result.plan?.slice(1)}
                      <button onClick={handleCopyPlan} className="text-muted-foreground hover:text-accent">
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Start Date</p>
                    <p className="text-foreground text-sm font-semibold mt-0.5">
                      {result.startDate ? new Date(result.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">End Date</p>
                    <p className="text-foreground text-sm font-semibold mt-0.5">
                      {result.endDate ? new Date(result.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-base font-semibold">Activation Failed</h3>
                    <p className="text-muted-foreground text-xs">{result.error || 'Please check your OTP code and try again.'}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Text */}
      <div className="bg-muted/30 border border-outline-variant/50 rounded-xl p-4">
        <p className="text-muted-foreground text-xs leading-relaxed">
          <strong className="text-foreground">How to get an OTP code:</strong> Contact your administrator to receive a subscription activation code.
          Each code is valid for 7 days and can only be used once. The code is tied to your account and cannot be transferred.
        </p>
      </div>
    </div>
  )
}
