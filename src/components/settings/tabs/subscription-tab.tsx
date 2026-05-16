'use client'

import React, { useCallback } from 'react'
import {
  Crown,
  Check,
  X,
  Sparkles,
  Zap,
  BarChart3,
  KeyRound,
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

import { useSubscriptionStore } from '@/stores/subscription-store'
import { PlanBadge } from '@/components/shared/plan-badge'
import { useI18n } from '@/i18n/use-translation'
import type { SubscriptionPlan } from '@/types'

import { SectionCard, SectionTitle, SectionDescription } from '../settings-helpers'

export function SubscriptionTab() {
  const { t, isRTL } = useI18n()
  const { plan: subscriptionPlan } = useSubscriptionStore()

  // OTP-based subscription: no checkout/portal needed
  // Users activate via the OTP tab in Settings
  const handleUpgrade = useCallback(
    (_targetPlan: SubscriptionPlan) => {
      // Redirect user to OTP activation tab
      toast.info(isRTL ? 'انتقل إلى علامة تبويب OTP لتفعيل اشتراكك' : 'Go to the OTP tab to activate your subscription')
    },
    [isRTL]
  )

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
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <SectionTitle>
              <Stack direction="row" alignItems="center" gap={1}>
                <Crown size={16} /> {t.settings.currentPlan}
              </Stack>
            </SectionTitle>
            <SectionDescription>{isRTL ? 'تفاصيل اشتراكك' : 'Your subscription details'}</SectionDescription>
          </Box>
          <PlanBadge />
        </Stack>
      </SectionCard>

      {/* OTP Activation Notice */}
      {subscriptionPlan === 'free' && (
        <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 4, borderColor: 'primary.light' }}>
          <Stack direction="row" alignItems="center" gap={2}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', opacity: 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={20} color="primary" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{isRTL ? 'ترقية خطتك' : 'Upgrade Your Plan'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {isRTL ? 'انتقل إلى علامة تبويب OTP في الإعدادات وأدخل الرمز الذي قدمه المسؤول' : 'Go to the OTP tab in Settings and enter the code provided by your administrator'}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Plan Comparison */}
      <Grid container spacing={2}>
        {plans.map((plan) => {
          const isCurrentPlan = subscriptionPlan === plan.id

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
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}>{plan.name}</Typography>
                  <Stack direction="row" alignItems="baseline" gap={0.5} sx={{ mt: 0.5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{plan.price}</Typography>
                    <Typography variant="body2" color="text.secondary">{plan.period}</Typography>
                  </Stack>
                </Box>

                <Stack spacing={1} sx={{ flex: 1, mb: 2 }}>
                  {plan.features.map((feature) => (
                    <Stack key={feature.label} direction="row" alignItems="center" gap={1}>
                      {feature.included ? (
                        <Check size={14} color="success" />
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
                    variant={plan.popular ? 'contained' : 'outlined'}
                    startIcon={<KeyRound size={16} />}
                  >
                    {isRTL ? 'تفعيل عبر OTP' : 'Activate via OTP'}
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
              <Infinity size={24} color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 1 }}>{isRTL ? 'مهام غير محدودة' : 'Unlimited Tasks'}</Typography>
              <Typography variant="caption" color="text.secondary">{isRTL ? 'بدون حدود على إنشاء المهام' : 'No limits on task creation'}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Zap size={24} color="secondary" />
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 1 }}>{isRTL ? 'مزامنة فورية' : 'Real-time Sync'}</Typography>
              <Typography variant="caption" color="text.secondary">{isRTL ? 'تحديثات فورية عبر الأجهزة' : 'Instant updates across devices'}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <BarChart3 size={24} color="secondary" />
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 1 }}>{isRTL ? 'التحليلات' : 'Analytics'}</Typography>
              <Typography variant="caption" color="text.secondary">{isRTL ? 'رؤى إنتاجية العائلة' : 'Family productivity insights'}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </SectionCard>
    </Stack>
  )
}
