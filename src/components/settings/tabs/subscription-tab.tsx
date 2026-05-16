'use client'

import React, { useCallback } from 'react'
import {
  Crown,
  Check,
  X,
  Sparkles,
  Infinity,
  Zap,
  BarChart3,
  Settings,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { PlanBadge } from '@/components/shared/plan-badge'
import { useI18n } from '@/i18n/use-translation'
import type { SubscriptionPlan } from '@/types'

import { SectionCard, SectionTitle, SectionDescription } from '../settings-helpers'

export function SubscriptionTab() {
  const { t, isRTL } = useI18n()
  const { user } = useAuthStore()
  const { plan: subscriptionPlan } = useSubscriptionStore()

  const isCheckoutLoading = useSubscriptionStore((s) => s.isCheckoutLoading)
  const isPortalLoading = useSubscriptionStore((s) => s.isPortalLoading)

  const handleUpgrade = useCallback(
    async (targetPlan: SubscriptionPlan) => {
      if (targetPlan === subscriptionPlan) return

      // If user wants to downgrade, open Stripe billing portal for cancellation
      if (targetPlan === 'free') {
        try {
          await useSubscriptionStore.getState().openBillingPortal()
        } catch {
          toast.error(isRTL ? 'فشل فتح بوابة الفوترة' : 'Failed to open billing portal')
        }
        return
      }

      // Upgrade — initiate Stripe checkout
      try {
        await useSubscriptionStore.getState().initiateCheckout(targetPlan)
      } catch {
        toast.error(isRTL ? 'فشل بدء عملية الدفع' : 'Failed to initiate checkout')
      }
    },
    [subscriptionPlan, isRTL]
  )

  const handleManageBilling = useCallback(async () => {
    try {
      await useSubscriptionStore.getState().openBillingPortal()
    } catch {
      toast.error(isRTL ? 'فشل فتح بوابة الفوترة' : 'Failed to open billing portal')
    }
  }, [isRTL])

  const plans: {
    id: SubscriptionPlan
    name: string
    price: string
    period: string
    features: { label: string; included: boolean }[]
    cta: string
    popular?: boolean
  }[] = [
    {
      id: 'free',
      name: t.settings.free,
      price: '$0',
      period: 'forever',
      features: [
        { label: '1 Family', included: true },
        { label: '50 Tasks', included: true },
        { label: 'Basic features', included: true },
        { label: 'Unlimited tasks', included: false },
        { label: 'Real-time updates', included: false },
        { label: 'Task assignments', included: false },
        { label: 'Multiple families', included: false },
        { label: 'Advanced permissions', included: false },
        { label: 'Analytics', included: false },
      ],
      cta: 'Current Plan',
    },
    {
      id: 'pro',
      name: t.settings.pro,
      price: '$4.99',
      period: '/month',
      features: [
        { label: '3 Families', included: true },
        { label: '500 Tasks', included: true },
        { label: 'All basic features', included: true },
        { label: 'Real-time updates', included: true },
        { label: 'Task assignments', included: true },
        { label: 'AI suggestions', included: true },
        { label: 'Multiple families', included: false },
        { label: 'Advanced permissions', included: false },
        { label: 'Analytics', included: false },
      ],
      cta: t.settings.upgradeToPro,
      popular: true,
    },
    {
      id: 'family_plus',
      name: t.settings.familyPlus,
      price: '$9.99',
      period: '/month',
      features: [
        { label: '5 Families', included: true },
        { label: 'Unlimited tasks', included: true },
        { label: 'All features', included: true },
        { label: 'Real-time updates', included: true },
        { label: 'Task assignments', included: true },
        { label: 'AI suggestions', included: true },
        { label: 'Multiple families', included: true },
        { label: 'Advanced permissions', included: true },
        { label: 'Analytics', included: true },
      ],
      cta: t.settings.upgradeToFamily,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Crown className="size-4 text-accent" /> {t.settings.currentPlan}
              </span>
            </SectionTitle>
            <SectionDescription>{isRTL ? 'تفاصيل اشتراكك' : 'Your subscription details'}</SectionDescription>
          </div>
          <PlanBadge />
        </div>
      </SectionCard>

      {/* Manage Subscription Button — visible for paid plans */}
      {subscriptionPlan !== 'free' && (
        <SectionCard>
          <div className="flex items-center justify-between">
            <div>
              <SectionTitle>{isRTL ? 'إدارة الاشتراك' : 'Manage Subscription'}</SectionTitle>
              <SectionDescription>{isRTL ? 'تحديث خطة الدفع أو إلغاؤها' : 'Update your plan or cancel subscription'}</SectionDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? <Loader2 className="size-4 animate-spin" /> : <Settings className="size-4" />}
              {isRTL ? 'إدارة الفوترة' : 'Manage Billing'}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrentPlan = subscriptionPlan === plan.id
          const buttonContent = isCheckoutLoading
            ? (isRTL ? 'جارٍ التحميل...' : 'Loading...')
            : plan.cta
          const buttonIcon = isCheckoutLoading
            ? <Loader2 className="size-4 animate-spin" />
            : <Zap className="size-4" />

          return (
            <motion.div
              key={plan.id}
              whileHover={{ y: -2 }}
              className={`relative bg-card border rounded-2xl p-5 flex flex-col ${
                plan.popular
                  ? 'border-primary/50 shadow-[0_0_24px_-4px_rgba(13,148,136,0.15)]'
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white border-0 text-xs px-3">
                    <Sparkles className="size-3 mr-1" /> {isRTL ? 'موصى به' : 'Popular'}
                  </Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-foreground text-lg font-semibold font-display">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 mb-5">
                {plan.features.map((feature) => (
                  <div key={feature.label} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="size-3.5 text-green-400 shrink-0" />
                    ) : (
                      <X className="size-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    <span
                      className={`text-xs ${
                        feature.included ? 'text-foreground' : 'text-muted-foreground/50'
                      }`}
                    >
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>

              {isCurrentPlan ? (
                <Button
                  variant="outline"
                  disabled
                  className="w-full border-border text-muted-foreground"
                >
                  {isRTL ? 'الخطة الحالية' : 'Current Plan'}
                </Button>
              ) : (
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCheckoutLoading}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-primary hover:bg-primary/80 text-white'
                      : 'bg-muted border border-border text-foreground hover:bg-border'
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {buttonIcon}
                  {buttonContent}
                </Button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Feature Highlights */}
      <SectionCard>
        <SectionTitle>{isRTL ? 'ميزات مميزة' : 'Feature Highlights'}</SectionTitle>
        <SectionDescription>{isRTL ? 'ما تحصل عليه مع الخطط المميزة' : 'What you get with premium plans'}</SectionDescription>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-muted border border-border">
            <Infinity className="size-6 text-primary mb-2" />
            <p className="text-foreground text-sm font-medium">{isRTL ? 'مهام غير محدودة' : 'Unlimited Tasks'}</p>
            <p className="text-muted-foreground text-xs">{isRTL ? 'بدون حدود على إنشاء المهام' : 'No limits on task creation'}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted border border-border">
            <Zap className="size-6 text-accent mb-2" />
            <p className="text-foreground text-sm font-medium">{isRTL ? 'مزامنة فورية' : 'Real-time Sync'}</p>
            <p className="text-muted-foreground text-xs">{isRTL ? 'تحديثات فورية عبر الأجهزة' : 'Instant updates across devices'}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted border border-border">
            <BarChart3 className="size-6 text-accent mb-2" />
            <p className="text-foreground text-sm font-medium">{isRTL ? 'التحليلات' : 'Analytics'}</p>
            <p className="text-muted-foreground text-xs">{isRTL ? 'رؤى إنتاجية العائلة' : 'Family productivity insights'}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
