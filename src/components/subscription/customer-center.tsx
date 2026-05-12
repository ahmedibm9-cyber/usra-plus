'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n/use-translation'
import { useEntitlements, type UseEntitlementsReturn } from '@/hooks/use-entitlements'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import {
  Crown,
  Check,
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Shield,
  Zap,
  ChevronRight,
  Clock,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerCenterProps {
  /** Whether the customer center is visible */
  open: boolean
  /** Close the customer center */
  onClose: () => void
}

// ─── Status Badge (outside render) ─────────────────────────────────────────

function SubscriptionStatusBadge({
  isConfigured,
  isTrial,
  isActive,
  isCancelled,
  isExpired,
  labels,
}: {
  isConfigured: boolean
  isTrial: boolean
  isActive: boolean
  isCancelled: boolean
  isExpired: boolean
  labels: {
    expired: string
    trial: string
    active: string
    cancelled: string
  }
}) {
  if (!isConfigured) {
    return (
      <Badge className="bg-white/10 text-white/40 border-none">
        {labels.expired}
      </Badge>
    )
  }

  if (isTrial) {
    return (
      <Badge className="bg-[#F4C430]/20 text-[#F4C430] border-none">
        <Clock className="w-3 h-3 me-1" />
        {labels.trial}
      </Badge>
    )
  }

  if (isActive && !isCancelled) {
    return (
      <Badge className="bg-[#22C55E]/20 text-[#22C55E] border-none">
        <Check className="w-3 h-3 me-1" />
        {labels.active}
      </Badge>
    )
  }

  if (isCancelled) {
    return (
      <Badge className="bg-[#F4C430]/20 text-[#F4C430] border-none">
        <Ban className="w-3 h-3 me-1" />
        {labels.cancelled}
      </Badge>
    )
  }

  if (isExpired) {
    return (
      <Badge className="bg-red-500/20 text-red-400 border-none">
        <X className="w-3 h-3 me-1" />
        {labels.expired}
      </Badge>
    )
  }

  return (
    <Badge className="bg-white/10 text-white/40 border-none">—</Badge>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CustomerCenter({ open, onClose }: CustomerCenterProps) {
  const { t, isRTL } = useI18n()
  const { user } = useAuthStore()
  const { plan } = useSubscriptionStore()
  const {
    isPro,
    loading,
    error,
    entitlements,
    managementURL,
    isConfigured,
    refresh,
    init,
  } = useEntitlements()

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Get the active entitlement info
  const proEntitlement = entitlements['USRA PRO+']

  // Determine subscription status
  const isActive = isPro && proEntitlement?.isActive
  const isCancelled = isPro && !proEntitlement?.willRenew
  const isExpired = !isPro
  const isTrial = proEntitlement?.periodType === 'trial'

  // Format dates
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '—'
    return new Intl.DateTimeFormat(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  }

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!proEntitlement?.expirationDate) return null
    const now = new Date()
    const expiry = new Date(proEntitlement.expirationDate)
    const diff = expiry.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const daysRemaining = getDaysRemaining()

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    const currentUserId = useAuthStore.getState().user?.id
    if (!currentUserId) return
    setRefreshing(true)
    await init(currentUserId)
    setRefreshing(false)
  }, [init])

  // Handle manage subscription (external link)
  const handleManageSubscription = useCallback(() => {
    if (managementURL) {
      window.open(managementURL, '_blank', 'noopener,noreferrer')
    }
  }, [managementURL])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 end-4 z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label={t.common.close}
            >
              <X className="w-5 h-5 text-white/60" />
            </button>

            {/* Header */}
            <div className="text-center pt-8 pb-4 px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                style={{
                  background: isPro
                    ? 'linear-gradient(135deg, #E50914, #C40812)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                }}
              >
                <Crown className={`w-7 h-7 ${isPro ? 'text-white' : 'text-white/40'}`} />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-1">
                {t.subscription.customerCenter}
              </h2>
              <SubscriptionStatusBadge
                isConfigured={isConfigured}
                isTrial={isTrial}
                isActive={isActive}
                isCancelled={isCancelled}
                isExpired={isExpired}
                labels={{
                  expired: t.subscription.subscriptionExpired,
                  trial: t.subscription.subscriptionTrial,
                  active: t.subscription.subscriptionActive,
                  cancelled: t.subscription.subscriptionCancelled,
                }}
              />
            </div>

            {/* Error State */}
            {error && (
              <div className="mx-6 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#F4C430] animate-spin" />
              </div>
            )}

            {/* Main Content */}
            {!loading && (
              <div className="px-6 pb-6 space-y-4">
                {/* Current Plan Card */}
                <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: isPro
                              ? 'linear-gradient(135deg, rgba(244,196,48,0.2), rgba(229,9,20,0.1))'
                              : 'rgba(255,255,255,0.05)',
                          }}
                        >
                          {isPro ? (
                            <Crown className="w-5 h-5 text-[#F4C430]" />
                          ) : (
                            <Shield className="w-5 h-5 text-white/30" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">
                            {isPro ? t.subscription.proPlusTitle : t.subscription.freePlan}
                          </h3>
                          <p className="text-white/40 text-xs">
                            {isPro ? t.subscription.proPlanFeatures : t.subscription.freePlanFeatures}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="text-white/40 hover:text-white/60"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    <Separator className="bg-white/5 mb-3" />

                    {/* Subscription Details */}
                    {isPro && proEntitlement && (
                      <div className="space-y-2">
                        {/* Auto-renew status */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/40">
                            {proEntitlement.willRenew ? t.subscription.autoRenewOn : t.subscription.autoRenewOff}
                          </span>
                          {proEntitlement.willRenew ? (
                            <Check className="w-4 h-4 text-[#22C55E]" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-[#F4C430]" />
                          )}
                        </div>

                        {/* Renewal / Expiration date */}
                        {proEntitlement.expirationDate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/40">
                              {proEntitlement.willRenew ? t.subscription.renewalDate : t.subscription.expirationDate}
                            </span>
                            <span className="text-white/70">
                              {formatDate(proEntitlement.expirationDate)}
                            </span>
                          </div>
                        )}

                        {/* Product identifier */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/40">{t.subscription.currentPlan}</span>
                          <span className="text-white/70 font-mono text-xs">
                            {proEntitlement.productIdentifier}
                          </span>
                        </div>

                        {/* Store */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/40">Store</span>
                          <span className="text-white/70">
                            {proEntitlement.store}
                          </span>
                        </div>

                        {/* Sandbox indicator */}
                        {proEntitlement.isSandbox && (
                          <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-[#F4C430]/20">
                            <p className="text-[#F4C430] text-xs font-medium">
                              🧪 Sandbox Environment
                            </p>
                          </div>
                        )}

                        {/* Days remaining (for cancelled) */}
                        {isCancelled && daysRemaining !== null && (
                          <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-[#F4C430]/20">
                            <p className="text-[#F4C430] text-xs font-medium">
                              {t.subscription.willNotRenew} • {daysRemaining} {t.subscription.daysRemaining.replace('{n}', String(daysRemaining))}
                            </p>
                          </div>
                        )}

                        {/* Trial badge */}
                        {isTrial && (
                          <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-[#F4C430]/20">
                            <p className="text-[#F4C430] text-xs font-medium">
                              {t.subscription.subscriptionTrial}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Free plan info */}
                    {!isPro && (
                      <div className="text-center py-2">
                        <p className="text-white/40 text-sm">
                          {t.subscription.upgradeForUnlimited}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Manage Subscription (external) */}
                  {managementURL && isPro && (
                    <Button
                      variant="outline"
                      className="w-full justify-between text-white/70 border-white/10 hover:bg-white/5"
                      onClick={handleManageSubscription}
                    >
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        {t.subscription.manageSubscription}
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </Button>
                  )}

                  {/* Change Plan */}
                  {isPro && (
                    <Button
                      variant="outline"
                      className="w-full justify-between text-white/70 border-white/10 hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        {t.subscription.changePlan}
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </Button>
                  )}

                  {/* Cancel Subscription */}
                  {isPro && proEntitlement?.willRenew && !showCancelConfirm && (
                    <Button
                      variant="ghost"
                      className="w-full text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      <Ban className="w-4 h-4 me-2" />
                      {t.subscription.cancelSubscription}
                    </Button>
                  )}

                  {/* Cancel Confirmation */}
                  <AnimatePresence>
                    {showCancelConfirm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <Card style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <CardContent className="p-4">
                            <p className="text-white/70 text-sm mb-4">
                              {t.subscription.cancelSubscriptionConfirm}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                className="flex-1 text-white/60"
                                onClick={() => setShowCancelConfirm(false)}
                              >
                                {t.subscription.keepSubscription}
                              </Button>
                              <Button
                                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none"
                                onClick={handleManageSubscription}
                              >
                                {t.subscription.cancelSubscription}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Upgrade (for free users) */}
                  {!isPro && (
                    <Button
                      className="w-full font-semibold text-sm"
                      style={{
                        background: 'linear-gradient(135deg, #E50914, #C40812)',
                        color: 'white',
                        border: 'none',
                      }}
                      onClick={onClose}
                    >
                      <Crown className="w-4 h-4 me-2" />
                      {t.subscription.upgradeToPro}
                    </Button>
                  )}

                  {/* Restore Purchases */}
                  {!isPro && (
                    <Button
                      variant="ghost"
                      className="w-full text-white/40 hover:text-white/60"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`w-4 h-4 me-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {t.subscription.restorePurchases}
                    </Button>
                  )}
                </div>

                {/* Contact Support */}
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-white/30 hover:text-white/50"
                  >
                    {t.subscription.contactSupport}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CustomerCenter
