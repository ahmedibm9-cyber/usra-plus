'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Crown, Sparkles, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/use-translation'
import { useSubscriptionStore } from '@/stores/subscription-store'

interface CheckoutSuccessModalProps {
  onClose: () => void
}

export function CheckoutSuccessModal({ onClose }: CheckoutSuccessModalProps) {
  const { isRTL } = useI18n()
  const plan = useSubscriptionStore((s) => s.plan)
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const planLabel = plan === 'family_plus'
    ? (isRTL ? 'العائلة بلس' : 'Family Plus')
    : plan === 'pro'
      ? (isRTL ? 'الاحترافي' : 'Pro')
      : plan === 'max'
        ? (isRTL ? 'الأقصى' : 'Max')
        : (isRTL ? 'الأساسي' : 'Free')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md rounded-2xl border border-border bg-card p-0 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={isRTL ? 'إغلاق' : 'Close'}
          >
            <X className="size-4" />
          </button>

          {/* Top gradient banner */}
          <div className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 px-6 pt-8 pb-6 text-center overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/10 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/10 translate-x-1/3 translate-y-1/3" />

            {/* Confetti sparkle effect */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      x: (Math.random() - 0.5) * 200,
                      y: (Math.random() - 0.5) * 100,
                    }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    className="absolute top-1/2 left-1/2"
                  >
                    <Sparkles className="size-3 text-white/80" />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Check icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
              className="relative mx-auto mb-3"
            >
              <div className="size-16 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="size-10 text-white" />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-white"
            >
              {isRTL ? 'مرحبًا بك في خطتك الجديدة!' : 'Welcome to your new plan!'}
            </motion.h2>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-teal-600/10 border border-teal-600/20"
            >
              <div className="size-10 rounded-lg bg-teal-600/15 flex items-center justify-center shrink-0">
                <Crown className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-semibold">
                  {isRTL ? 'تم تفعيل الخطة' : 'Plan Activated'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isRTL ? `خطة ${planLabel} نشطة الآن` : `${planLabel} plan is now active`}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <p className="text-foreground text-sm font-medium">
                {isRTL ? 'ما الجديد:' : "What's new:"}
              </p>
              <ul className="space-y-1.5">
                {(plan === 'pro' || plan === 'family_plus' || plan === 'max'
                  ? [
                      isRTL ? 'ميزات محسنة للعائلة' : 'Enhanced family features',
                      isRTL ? 'تخزين موسع' : 'Expanded storage',
                      isRTL ? 'دعم بالأولوية' : 'Priority support',
                    ]
                  : [
                      isRTL ? 'إدارة المهام الأساسية' : 'Basic task management',
                      isRTL ? 'مجموعة عائلية واحدة' : 'One family group',
                      isRTL ? 'تخزين محدود' : 'Limited storage',
                    ]
                ).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground text-xs">
                    <CheckCircle2 className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={onClose}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-10"
              >
                {isRTL ? 'ابدأ الاستخدام' : 'Start Using'}
                <ArrowRight className={`size-4 ${isRTL ? 'rotate-180' : ''} ml-2`} />
              </Button>
            </motion.div>

            <p className="text-muted-foreground text-[10px] text-center">
              {isRTL
                ? 'يمكنك إدارة اشتراكك من الإعدادات > الاشتراك'
                : 'You can manage your subscription from Settings > Subscription'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
