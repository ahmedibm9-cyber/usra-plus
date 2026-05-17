'use client'

import React, { useCallback } from 'react'
import {
  Crown,
  Check,
  X,
  Sparkles,
  Zap,
  BarChart3,
  Settings,
  Loader2,
  Infinity,
} from 'lucide-react'
import { toast } from 'sonner'

import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'

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
      if (targetPlan === 'free') {
        try {
          await useSubscriptionStore.getState().openBillingPortal()
        } catch {
          toast.error(isRTL ? 'فشل فتح بوابة الفوترة' : 'Failed to open billing portal')
        }
        return
      }
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
    <Stack spacing={3}>
      {/* Current Plan */}
      <SectionCard>
        <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between">
          <Box>
            <SectionTitle>
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                <Crown size={16} /> {t.settings.currentPlan}
              </Stack>
            </SectionTitle>
            <SectionDescription>{isRTL ? 'تفاصيل اشتراكك' : 'Your subscription details'}</SectionDescription>
          </Box>
          <PlanBadge />
        </Stack>
      </SectionCard>

      {/* Manage Subscription Button */}
      {subscriptionPlan !== 'free' && (
        <SectionCard>
          <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between">
            <Box>
              <SectionTitle>{isRTL ? 'إدارة الاشتراك' : 'Manage Subscription'}</SectionTitle>
              <SectionDescription>{isRTL ? 'تحديث خطة الدفع أو إلغاؤها' : 'Update your plan or cancel subscription'}</SectionDescription>
            </Box>
            <Button
              variant="outlined"
              onClick={handleManageBilling}
              disabled={isPortalLoading}
              startIcon={isPortalLoading ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
            >
              {isRTL ? 'إدارة الفوترة' : 'Manage Billing'}
            </Button>
          </Stack>
        </SectionCard>
      )}

      {/* Plan Comparison */}
      <Grid container spacing={2}>
        {plans.map((plan) => {
          const isCurrentPlan = subscriptionPlan === plan.id
          const buttonContent = isCheckoutLoading
            ? (isRTL ? 'جارٍ التحميل...' : 'Loading...')
            : plan.cta
          const buttonIcon = isCheckoutLoading
            ? <Loader2 size={16} className="animate-spin" />
            : <Zap size={16} />

          return (
            <Grid key={plan.id} size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  p: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 4,
                  position: 'relative',
                  borderColor: plan.popular ? 'primary.main' : 'divider',
                  boxShadow: plan.popular ? '0 0 24px -4px rgba(13,148,136,0.15)' : 'none',
                  height: '100%',
                }}
              >
                {plan.popular && (
                  <Box sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                    <Chip
                      icon={<Sparkles size={12} />}
                      label={isRTL ? 'موصى به' : 'Popular'}
                      sx={{ color: 'primary.main' }}
                      size="small"
                    />
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}>{plan.name}</Typography>
                  <Stack sx={{ flexDirection: 'row', alignItems: 'baseline', gap: 0.5 }} sx={{ mt: 0.5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{plan.price}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{plan.period}</Typography>
                  </Stack>
                </Box>

                <Stack spacing={1} sx={{ flex: 1, mb: 2 }}>
                  {plan.features.map((feature) => (
                    <Stack key={feature.label} direction="row" alignItems="center" gap={1}>
                      {feature.included ? (
                        <Check size={14} sx={{ color: 'success.main' }} />
                      ) : (
                        <X size={14} color="disabled" />
                      )}
                      <Typography
                        variant="caption"
                        color={feature.included ? 'text.primary' : 'text.disabled'}
                      >
                        {feature.label}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                {isCurrentPlan ? (
                  <Button variant="outlined" disabled fullWidth>
                    {isRTL ? 'الخطة الحالية' : 'Current Plan'}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCheckoutLoading}
                    variant={plan.popular ? 'contained' : 'outlined'}
                    startIcon={buttonIcon}
                  >
                    {buttonContent}
                  </Button>
                )}
              </Paper>
            </Grid>
          )
        })}
      </Grid>

      {/* Feature Highlights */}
      <SectionCard>
        <SectionTitle>{isRTL ? 'ميزات مميزة' : 'Feature Highlights'}</SectionTitle>
        <SectionDescription>{isRTL ? 'ما تحصل عليه مع الخطط المميزة' : 'What you get with premium plans'}</SectionDescription>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Infinity size={24} sx={{ color: 'primary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 1 }}>{isRTL ? 'مهام غير محدودة' : 'Unlimited Tasks'}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{isRTL ? 'بدون حدود على إنشاء المهام' : 'No limits on task creation'}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Zap size={24} sx={{ color: 'secondary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 1 }}>{isRTL ? 'مزامنة فورية' : 'Real-time Sync'}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{isRTL ? 'تحديثات فورية عبر الأجهزة' : 'Instant updates across devices'}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <BarChart3 size={24} sx={{ color: 'secondary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 1 }}>{isRTL ? 'التحليلات' : 'Analytics'}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{isRTL ? 'رؤى إنتاجية العائلة' : 'Family productivity insights'}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </SectionCard>
    </Stack>
  )
}
