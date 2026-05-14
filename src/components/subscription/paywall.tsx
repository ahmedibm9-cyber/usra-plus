'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/i18n/use-translation'
import type { TranslationKeys } from '@/i18n/en'
import { useEntitlements } from '@/hooks/use-entitlements'
import { useAuthStore } from '@/stores/auth-store'
import { presentPaywall } from '@/lib/revenuecat'
import {
  Crown,
  Zap,
  Shield,
  Sparkles,
  Check,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
  Infinity,
  Users,
  MessageSquare,
  Calendar,
  Utensils,
  FileText,
  Brain,
  Headphones,
  Palette,
  ChevronRight,
  X,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaywallProps {
  /** Whether the paywall is visible */
  open: boolean
  /** Close the paywall */
  onClose: () => void
  /** Optional context for why the paywall was shown */
  context?: 'limit_reached' | 'upgrade_cta' | 'settings' | 'general'
}

// ─── Feature Data ───────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Infinity, featureKey: 'featureTasks', free: '10', pro: 'unlimited' },
  { icon: Users, featureKey: 'featureFamilies', free: '1', pro: 'unlimited' },
  { icon: FileText, featureKey: 'featureStorage', free: '100MB', pro: '10GB+' },
  { icon: MessageSquare, featureKey: 'featureChat', free: 'included', pro: 'included' },
  { icon: Calendar, featureKey: 'featureCalendar', free: 'included', pro: 'included' },
  { icon: Utensils, featureKey: 'featureMealPlan', free: 'limited', pro: 'included' },
  { icon: Brain, featureKey: 'featureAISuggestions', free: 'limited', pro: 'unlimited' },
  { icon: Headphones, featureKey: 'featurePrioritySupport', free: 'no', pro: 'included' },
  { icon: Palette, featureKey: 'featureCustomAvatars', free: 'limited', pro: 'unlimited' },
]

// ─── Component ──────────────────────────────────────────────────────────────

export function Paywall({ open, onClose, context = 'general' }: PaywallProps) {
  const { t, isRTL } = useI18n()
  const { user } = useAuthStore()
  const { offerings, loading, error, isPro, refresh, sdkState } = useEntitlements()
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)

  // Coupon state
  const [showCouponInput, setShowCouponInput] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null)
  const couponInputRef = useRef<HTMLInputElement>(null)

  // Get packages from offerings
  const packages = offerings?.current?.packages || []

  // Categorize packages
  const lifetimePackage = packages.find(
    (p) => p.packageType === 'lifetime' || p.identifier.toLowerCase().includes('lifetime')
  )
  const yearlyPackage = packages.find(
    (p) => p.packageType === 'annual' || p.identifier.toLowerCase().includes('yearly') || p.identifier.toLowerCase().includes('annual')
  )
  const monthlyPackage = packages.find(
    (p) => p.packageType === 'monthly' || p.identifier.toLowerCase().includes('monthly')
  )

  const handlePurchase = useCallback(async (pkg: typeof packages[0]) => {
    if (!user?.id) return
    setPurchasing(pkg.identifier)
    setPurchaseError(null)

    try {
      const result = await presentPaywall({
        offeringIdentifier: offerings?.current?.identifier,
        customerEmail: user.email,
        selectedLocale: isRTL ? 'ar' : 'en',
      })

      if (result?.success) {
        setPurchaseSuccess(true)
        await refresh()
        // Auto-close after success
        setTimeout(() => {
          setPurchaseSuccess(false)
          onClose()
        }, 2000)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purchase failed'
      setPurchaseError(msg)
    } finally {
      setPurchasing(null)
    }
  }, [user, offerings, isRTL, refresh, onClose])

  const handleRestore = useCallback(async () => {
    await refresh()
  }, [refresh])

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim() || !user?.id) return

    setCouponLoading(true)
    setCouponError(null)
    setCouponSuccess(null)

    try {
      const response = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), userId: user.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        setCouponError(data.error || 'Failed to apply coupon')
        return
      }

      if (data.success) {
        const discountLabel = data.coupon.discountType === 'percentage'
          ? `${data.coupon.discountValue}% off`
          : `$${data.coupon.discountValue} off`
        setCouponSuccess(`Coupon applied: ${discountLabel}`)
        setCouponCode('')
        // Refresh subscription state to pick up any plan changes
        await refresh()
      }
    } catch {
      setCouponError('Network error. Please try again.')
    } finally {
      setCouponLoading(false)
    }
  }, [couponCode, user, refresh])

  // ─── Render ─────────────────────────────────────────────────────────────

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
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
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
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                <Crown className="w-8 h-8 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {t.subscription.paywallTitle}
              </h2>
              <p className="text-white/60 text-sm max-w-md mx-auto">
                {t.subscription.paywallSubtitle}
              </p>
            </div>

            {/* Purchase Success State */}
            <AnimatePresence>
              {purchaseSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-6 mb-4 p-4 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-[#22C55E]" />
                    </div>
                    <div>
                      <p className="text-[#22C55E] font-semibold">{t.subscription.purchaseSuccess}</p>
                      <p className="text-[#22C55E]/60 text-xs">{t.subscription.purchaseSuccessDesc}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error State */}
            <AnimatePresence>
              {(purchaseError || error) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-6 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-red-400 text-sm">{purchaseError || error || t.subscription.purchaseError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading State */}
            {loading && sdkState.initializationState !== 'initialized' && (
              <div className="flex flex-col items-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-white/60 text-sm">{t.subscription.loadingOfferings}</p>
              </div>
            )}

            {/* SDK Not Configured */}
            {!loading && sdkState.initializationState === 'error' && (
              <div className="px-6 pb-6">
                <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                    <p className="text-white/80 font-medium mb-1">{t.subscription.noOfferings}</p>
                    <p className="text-white/40 text-sm mb-4">{t.subscription.noOfferingsDesc}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refresh}
                      className="text-white/60 border-white/10"
                    >
                      <RefreshCw className="w-4 h-4 me-2" />
                      {t.common.retry}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Plan Cards */}
            {!loading && (packages.length > 0 || sdkState.initializationState === 'initialized') && (
              <div className="px-6 pb-4 space-y-3">
                <h3 className="text-white/80 font-semibold text-sm mb-3">
                  {t.subscription.choosePlan}
                </h3>

                {/* Lifetime Plan */}
                {lifetimePackage && (
                  <PlanCard
                    title={t.subscription.lifetimePlan}
                    description={t.subscription.lifetimeDescription}
                    price={lifetimePackage.product.price.formattedPrice}
                    period={t.subscription.forever}
                    badge={t.subscription.bestValue}
                    badgeColor="amber"
                    icon={Crown}
                    features={[
                      t.subscription.featureTasks,
                      t.subscription.featureStorage,
                      t.subscription.featurePrioritySupport,
                    ]}
                    isPopular={false}
                    isPurchasing={purchasing === lifetimePackage.identifier}
                    onPurchase={() => handlePurchase(lifetimePackage)}
                    isRTL={isRTL}
                    t={t}
                  />
                )}

                {/* Yearly Plan */}
                {yearlyPackage && (
                  <PlanCard
                    title={t.subscription.yearlyPlan}
                    description={t.subscription.yearlyDescription}
                    price={yearlyPackage.product.price.formattedPrice}
                    period={t.subscription.perYear}
                    badge={t.subscription.mostPopular}
                    badgeColor="gold"
                    icon={Star}
                    features={[
                      t.subscription.featureTasks,
                      t.subscription.featureFamilies,
                      t.subscription.featureAISuggestions,
                    ]}
                    isPopular={true}
                    isPurchasing={purchasing === yearlyPackage.identifier}
                    onPurchase={() => handlePurchase(yearlyPackage)}
                    isRTL={isRTL}
                    t={t}
                    hasTrial={!!yearlyPackage.product.freeTrialPhase}
                    trialPrice={yearlyPackage.product.freeTrialPhase?.price?.formattedPrice}
                    trialPeriod={yearlyPackage.product.freeTrialPhase?.period
                      ? `${yearlyPackage.product.freeTrialPhase.period.number} ${yearlyPackage.product.freeTrialPhase.period.unit}`
                      : undefined}
                  />
                )}

                {/* Monthly Plan */}
                {monthlyPackage && (
                  <PlanCard
                    title={t.subscription.monthlyPlan}
                    description={t.subscription.monthlyDescription}
                    price={monthlyPackage.product.price.formattedPrice}
                    period={t.subscription.perMonth}
                    badge={undefined}
                    icon={Zap}
                    features={[
                      t.subscription.featureTasks,
                      t.subscription.featureMealPlan,
                      t.subscription.featureChores,
                    ]}
                    isPopular={false}
                    isPurchasing={purchasing === monthlyPackage.identifier}
                    onPurchase={() => handlePurchase(monthlyPackage)}
                    isRTL={isRTL}
                    t={t}
                    hasTrial={!!monthlyPackage.product.freeTrialPhase}
                    trialPrice={monthlyPackage.product.freeTrialPhase?.price?.formattedPrice}
                    trialPeriod={monthlyPackage.product.freeTrialPhase?.period
                      ? `${monthlyPackage.product.freeTrialPhase.period.number} ${monthlyPackage.product.freeTrialPhase.period.unit}`
                      : undefined}
                  />
                )}

                {/* No packages from RevenueCat — show fallback plans */}
                {packages.length === 0 && (
                  <>
                    <FallbackPlanCard
                      title={t.subscription.lifetimePlan}
                      description={t.subscription.lifetimeDescription}
                      price="$199.99"
                      period={t.subscription.forever}
                      badge={t.subscription.bestValue}
                      badgeColor="amber"
                      icon={Crown}
                      isRTL={isRTL}
                      t={t}
                    />
                    <FallbackPlanCard
                      title={t.subscription.yearlyPlan}
                      description={t.subscription.yearlyDescription}
                      price="$59.99"
                      period={t.subscription.perYear}
                      badge={t.subscription.mostPopular}
                      badgeColor="gold"
                      icon={Star}
                      isRTL={isRTL}
                      t={t}
                    />
                    <FallbackPlanCard
                      title={t.subscription.monthlyPlan}
                      description={t.subscription.monthlyDescription}
                      price="$9.99"
                      period={t.subscription.perMonth}
                      icon={Zap}
                      isRTL={isRTL}
                      t={t}
                    />
                  </>
                )}
              </div>
            )}

            {/* Feature Comparison Table */}
            <div className="px-6 pb-6">
              <h3 className="text-white/80 font-semibold text-sm mb-3">
                {t.subscription.featuresComparison}
              </h3>
              <Card style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div />
                    <div className="text-center text-white/40 text-xs font-medium">{t.subscription.freePlan}</div>
                    <div className="text-center text-xs font-semibold" style={{ color: '#F4C430' }}>{t.subscription.proPlusPlan}</div>
                  </div>
                  <Separator className="bg-white/5 mb-2" />

                  {/* Rows */}
                  {FEATURES.map((feat, i) => {
                    const Icon = feat.icon
                    return (
                      <div key={i} className="grid grid-cols-3 gap-2 py-2">
                        <div className="flex items-center gap-2 text-white/60 text-xs">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.subscription[feat.featureKey as keyof typeof t.subscription] || feat.featureKey}</span>
                        </div>
                        <div className="text-center text-white/30 text-xs">{feat.free}</div>
                        <div className="text-center text-xs" style={{ color: '#F4C430' }}>
                          {feat.pro === 'unlimited' ? '∞' : feat.pro === 'included' ? <Check className="w-3.5 h-3.5 mx-auto text-[#22C55E]" /> : feat.pro}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Promo Code Section */}
            <div className="px-6 pb-4">
              {/* "Have a promo code?" link */}
              {!showCouponInput && (
                <button
                  onClick={() => {
                    setShowCouponInput(true)
                    setTimeout(() => couponInputRef.current?.focus(), 100)
                  }}
                  className="flex items-center justify-center gap-1.5 w-full text-white/40 text-xs hover:text-white/60 transition-colors py-2"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Have a promo code?</span>
                </button>
              )}

              {/* Coupon input field */}
              <AnimatePresence>
                {showCouponInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        ref={couponInputRef}
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase())
                          setCouponError(null)
                          setCouponSuccess(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApplyCoupon()
                        }}
                        placeholder="Enter promo code"
                        maxLength={30}
                        className="flex-1 h-9 px-3 rounded-lg text-sm text-white placeholder-white/30 outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          direction: isRTL ? 'rtl' : 'ltr',
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="h-9 px-4 text-xs font-medium"
                        style={{
                          background: couponLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          color: 'white',
                          border: 'none',
                        }}
                      >
                        {couponLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                      <button
                        onClick={() => {
                          setShowCouponInput(false)
                          setCouponCode('')
                          setCouponError(null)
                          setCouponSuccess(null)
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Close coupon input"
                      >
                        <X className="w-4 h-4 text-white/40" />
                      </button>
                    </div>

                    {/* Coupon success message */}
                    {couponSuccess && (
                      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <Check className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                        <p className="text-[#22C55E] text-xs font-medium">{couponSuccess}</p>
                      </div>
                    )}

                    {/* Coupon error message */}
                    {couponError && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <p className="text-red-400 text-xs">{couponError}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 text-center space-y-3">
              {/* Restore purchases */}
              <button
                onClick={handleRestore}
                className="text-white/40 text-xs hover:text-white/60 transition-colors underline"
              >
                {t.subscription.restorePurchases}
              </button>

              {/* Legal links */}
              <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
                <span>{t.subscription.termsAndConditions}</span>
                <span>•</span>
                <span>{t.subscription.privacyPolicyLink}</span>
              </div>

              {/* Cancel button */}
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white/40 hover:text-white/60"
                >
                  {t.subscription.maybeLater}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Plan Card Sub-Component ────────────────────────────────────────────────

interface PlanCardProps {
  title: string
  description: string
  price: string
  period: string
  badge?: string
  badgeColor?: 'amber' | 'emerald' | 'gold'
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  isPopular: boolean
  isPurchasing: boolean
  onPurchase: () => void
  isRTL: boolean
  t: TranslationKeys
  hasTrial?: boolean
  trialPrice?: string | null
  trialPeriod?: string
}

function PlanCard({
  title,
  description,
  price,
  period,
  badge,
  badgeColor = 'amber',
  icon: Icon,
  features,
  isPopular,
  isPurchasing,
  onPurchase,
  isRTL,
  t,
  hasTrial,
  trialPrice,
  trialPeriod,
}: PlanCardProps) {
  const isAmber = badgeColor === 'amber' || badgeColor === 'gold'
  const gradientFrom = isAmber ? '#f59e0b' : '#F4C430'
  const gradientTo = isAmber ? '#ef4444' : '#E50914'

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative"
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Popular glow */}
      {isPopular && (
        <div
          className="absolute -inset-px rounded-xl blur-sm"
          style={{ background: `linear-gradient(135deg, ${gradientFrom}40, ${gradientTo}40)` }}
        />
      )}

      <Card
        className="relative cursor-pointer"
        style={{
          background: isPopular ? `linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.04))` : 'rgba(255,255,255,0.03)',
          border: isPopular ? `1px solid ${gradientFrom}40` : '1px solid rgba(255,255,255,0.06)',
        }}
        onClick={isPurchasing ? undefined : onPurchase}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${gradientFrom}30, ${gradientTo}20)` }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-semibold text-sm">{title}</h4>
                  {badge && (
                    <Badge
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      {badge}
                    </Badge>
                  )}
                </div>
                <p className="text-white/40 text-xs">{description}</p>
              </div>
            </div>
            <div className="text-end">
              <div className="text-white font-bold text-lg">{price}</div>
              <div className="text-white/40 text-xs">{period}</div>
            </div>
          </div>

          {/* Trial info */}
          {hasTrial && trialPeriod && (
            <div className="mb-3 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-[#22C55E] text-xs font-medium">
                {trialPrice === '$0.00' || trialPrice === 'Free' ? `${t.subscription.startFreeTrial} — ${trialPeriod}` : `${trialPrice} for ${trialPeriod}`}
              </p>
            </div>
          )}

          {/* Features */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {features.map((feat, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-white/50 text-[11px] px-2 py-0.5 rounded-full bg-white/5">
                <Check className="w-3 h-3 text-[#22C55E]" />
                {feat}
              </span>
            ))}
          </div>

          {/* CTA */}
          <Button
            className="w-full font-semibold text-sm"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
              color: 'white',
              border: 'none',
            }}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {t.common.loading}
              </>
            ) : hasTrial ? (
              <>
                {t.subscription.startFreeTrial}
                <ChevronRight className="w-4 h-4 ms-1" />
              </>
            ) : (
              <>
                {t.subscription.subscribeNow}
                <ChevronRight className="w-4 h-4 ms-1" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Fallback Plan Card (no RevenueCat data) ────────────────────────────────

interface FallbackPlanCardProps {
  title: string
  description: string
  price: string
  period: string
  badge?: string
  badgeColor?: 'amber' | 'emerald' | 'gold'
  icon: React.ComponentType<{ className?: string }>
  isRTL: boolean
  t: TranslationKeys
}

function FallbackPlanCard({
  title,
  description,
  price,
  period,
  badge,
  badgeColor = 'amber',
  icon: Icon,
  isRTL,
  t,
}: FallbackPlanCardProps) {
  const isAmber = badgeColor === 'amber' || badgeColor === 'gold'
  const gradientFrom = isAmber ? '#f59e0b' : '#F4C430'
  const gradientTo = isAmber ? '#ef4444' : '#E50914'

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <Card
        style={{
          background: `rgba(255,255,255,0.03)`,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${gradientFrom}30, ${gradientTo}20)` }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-semibold text-sm">{title}</h4>
                  {badge && (
                    <Badge
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      {badge}
                    </Badge>
                  )}
                </div>
                <p className="text-white/40 text-xs">{description}</p>
              </div>
            </div>
            <div className="text-end">
              <div className="text-white font-bold text-lg">{price}</div>
              <div className="text-white/40 text-xs">{period}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Paywall
