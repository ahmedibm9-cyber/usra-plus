'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
 Dialog,
 DialogContent,
 DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
 Check,
 X,
 Sparkles,
 Crown,
 Zap,
 Infinity,
 HardDrive,
 Users,
 ShieldCheck,
 BarChart3,
 MessageSquare,
} from 'lucide-react'
import { useI18n } from '@/i18n/use-translation'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { toast } from 'sonner'
import type { SubscriptionPlan } from '@/types'

interface UpgradeModalProps {
 open: boolean
 onOpenChange: (open: boolean) => void
 feature: 'tasks' | 'storage' | 'families' | 'members'
 currentCount: number
 limit: number
}

const PLAN_FEATURES = [
 { key: 'tasks', icon: Check, freeVal: '10', proVal: '∞', familyVal: '∞' },
 { key: 'storage', icon: HardDrive, freeVal: '100 MB', proVal: '1 GB', familyVal: '10 GB' },
 { key: 'families', icon: Users, freeVal: '1', proVal: '1', familyVal: '∞' },
 { key: 'members', icon: Users, freeVal: '5', proVal: '15', familyVal: '∞' },
 { key: 'realtime', icon: MessageSquare, freeVal: false, proVal: true, familyVal: true },
 { key: 'assignments', icon: ShieldCheck, freeVal: false, proVal: true, familyVal: true },
 { key: 'analytics', icon: BarChart3, freeVal: false, proVal: false, familyVal: true },
 { key: 'permissions', icon: ShieldCheck, freeVal: false, proVal: false, familyVal: true },
]

export function UpgradeModal({ open, onOpenChange, feature, currentCount, limit }: UpgradeModalProps) {
 const { t, isRTL } = useI18n()
 const { plan, setPlan } = useSubscriptionStore()

 const featureLabels: Record<string, { en: string; ar: string }> = {
  tasks: { en: 'Tasks', ar: 'المهام' },
  storage: { en: 'Storage', ar: 'التخزين' },
  families: { en: 'Families', ar: 'العائلات' },
  members: { en: 'Members', ar: 'الأعضاء' },
 }

 const featureLabel = featureLabels[feature]?.[isRTL ? 'ar' : 'en'] || feature

 const handleUpgrade = async (targetPlan: SubscriptionPlan) => {
  // TODO: Integrate payment provider (Stripe/RevenueCat) here.
  // For now, upgrade requests go through the server API.
  // Client-side setPlan is called only after server confirms the upgrade.
  try {
   const { useAuthStore } = await import('@/stores/auth-store')
   const userId = useAuthStore.getState()?.user?.id
   if (userId) {
    const { useSubscriptionStore } = await import('@/stores/subscription-store')
    await useSubscriptionStore.getState().fetchPlanFromServer(userId)
   }
   // If fetchPlanFromServer updated the plan (server confirmed), show success
   // If not (no payment yet), show"coming soon" message
   toast.info(
    isRTL
     ? 'سيتم تفعيل الدفع قريبًا'
     : 'Payment integration coming soon!',
    {
     description: isRTL
      ? 'سيتم تفعيل خطتك بعد إتمام عملية الدفع'
      : 'Your plan will be activated after payment is processed',
    }
   )
  } catch {
   toast.error(isRTL ? 'حدث خطأ' : 'Something went wrong')
  }
  onOpenChange(false)
 }

 return (
  <Dialog open={open} onOpenChange={onOpenChange}>
   <DialogContent className="bg-card border-border text-foreground sm:max-w-[640px] p-0 overflow-hidden rounded-2xl">
    <DialogTitle className="sr-only">
     {isRTL ? 'ترقية الخططة' : 'Upgrade Plan'}
    </DialogTitle>

    <AnimatePresence>
     {open && (
      <div className="relative">
       {/* Ambient glow */}
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />

       {/* Header */}
       <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative px-6 pt-6 pb-4 text-center"
       >
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary)] shadow-lg shadow-primary/20">
         <Sparkles className="size-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
         {isRTL ? 'لقد وصلت إلى الحد الأقصى' : 'You\'ve reached your limit'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
         {isRTL
          ? `${featureLabel}: ${currentCount} / ${limit} — قم بالترقية للمتابعة`
          : `${featureLabel}: ${currentCount}/${limit} — Upgrade to continue`}
        </p>

        {/* Current plan badge */}
        <div className="mt-3 flex items-center justify-center gap-2">
         <span className="text-xs text-muted-foreground">
          {isRTL ? 'خطتك الحالية:' : 'Current plan:'}
         </span>
         <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0 h-5 font-semibold ${
           plan === 'free'
            ? 'bg-gray-500/20 text-muted-foreground border-gray-500/30'
            : plan === 'pro'
             ? 'bg-accent/20 text-accent border-accent/30'
             : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          }`}
         >
          {plan === 'free' && <span>Free</span>}
          {plan === 'pro' && <><Zap className="w-3 h-3 mr-1" />Pro</>}
          {plan === 'family_plus' && <><Crown className="w-3 h-3 mr-1" />Family+</>}
         </Badge>
        </div>
       </motion.div>

       {/* Plan comparison cards */}
       <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="px-4 pb-4"
       >
        <div className="grid grid-cols-3 gap-2.5">
         {/* Free Plan */}
         <div className="relative bg-background border border-border rounded-xl p-3.5 flex flex-col">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
           {t.settings.free}
          </p>
          <p className="text-lg font-bold text-foreground">$0</p>
          <p className="text-[10px] text-muted-foreground mb-3">
           {isRTL ? 'مجانًا للأبد' : 'forever'}
          </p>

          <div className="flex-1 space-y-1.5">
           {PLAN_FEATURES.map((feat) => {
            const val = feat.freeVal
            const isIncluded = val !== false
            const displayVal = val === false ? '' : String(val)
            return (
             <div key={feat.key} className="flex items-center gap-1.5">
              {isIncluded ? (
               <Check className="size-3 text-green-400/60 shrink-0" />
              ) : (
               <X className="size-3 text-muted-foreground/40 shrink-0" />
              )}
              <span className={`text-[10px] leading-tight ${isIncluded ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
               {displayVal || (isRTL ? 'غير متاح' : 'Not available')}
              </span>
             </div>
            )
           })}
          </div>

          {plan === 'free' && (
           <Button
            variant="outline"
            disabled
            className="w-full mt-3 h-8 text-xs border-border text-muted-foreground"
           >
            {isRTL ? 'الخطة الحالية' : 'Current Plan'}
           </Button>
          )}
         </div>

         {/* Pro Plan - Recommended */}
         <div className="relative bg-background rounded-xl p-3.5 flex flex-col overflow-hidden">
          {/* Gradient border */}
          <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-b from-primary/60 via-primary/30 to-primary/10 pointer-events-none">
           <div className="w-full h-full rounded-xl bg-background" />
          </div>

          {/* Popular badge */}
          <div className="absolute -top-0 right-2">
           <Badge className="bg-primary text-white border-0 text-[9px] px-2 py-0 h-4">
            <Sparkles className="size-2.5 mr-0.5" />
            {isRTL ? 'موصى به' : 'Recommended'}
           </Badge>
          </div>

          <div className="relative z-10">
           <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            {t.settings.pro}
           </p>
           <p className="text-lg font-bold text-foreground">$4.99</p>
           <p className="text-[10px] text-muted-foreground mb-3">
            {isRTL ? '/شهريًا' : '/month'}
           </p>

           <div className="space-y-1.5">
            {PLAN_FEATURES.map((feat) => {
             const val = feat.proVal
             const isIncluded = val !== false
             const displayVal = val === true ? '' : String(val)
             return (
              <div key={feat.key} className="flex items-center gap-1.5">
               <Check className="size-3 text-primary shrink-0" />
               <span className="text-[10px] leading-tight text-foreground">
                {displayVal || (isRTL ? 'متاح' : 'Included')}
               </span>
              </div>
             )
            })}
           </div>

           <Button
            onClick={() => handleUpgrade('pro')}
            className="w-full mt-3 h-8 text-xs bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            disabled={plan === 'pro'}
           >
            {plan === 'pro'
             ? (isRTL ? 'الخطة الحالية' : 'Current Plan')
             : (isRTL ? 'الترقية إلى Pro' : 'Upgrade to Pro')
            }
           </Button>
          </div>
         </div>

         {/* Family+ Plan */}
         <div className="relative bg-background border border-border rounded-xl p-3.5 flex flex-col">
          <p className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-1">
           {t.settings.familyPlus}
          </p>
          <p className="text-lg font-bold text-foreground">$9.99</p>
          <p className="text-[10px] text-muted-foreground mb-3">
           {isRTL ? '/شهريًا' : '/month'}
          </p>

          <div className="flex-1 space-y-1.5">
           {PLAN_FEATURES.map((feat) => {
            const val = feat.familyVal
            const isIncluded = val !== false
            const displayVal = val === true ? '' : String(val)
            return (
             <div key={feat.key} className="flex items-center gap-1.5">
              {isIncluded ? (
               <Check className="size-3 text-amber-400/70 shrink-0" />
              ) : (
               <X className="size-3 text-muted-foreground/40 shrink-0" />
              )}
              <span className={`text-[10px] leading-tight ${isIncluded ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
               {displayVal || (isRTL ? 'متاح' : 'Included')}
              </span>
             </div>
            )
           })}
          </div>

          <Button
           onClick={() => handleUpgrade('family_plus')}
           variant="outline"
           className="w-full mt-3 h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
           disabled={plan === 'family_plus'}
          >
           {plan === 'family_plus'
            ? (isRTL ? 'الخطة الحالية' : 'Current Plan')
            : (isRTL ? 'الترقية إلى Family+' : 'Upgrade to Family+')
           }
          </Button>
         </div>
        </div>
       </motion.div>

       {/* Feature highlights row */}
       <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="px-6 pb-3"
       >
        <div className="grid grid-cols-3 gap-2">
         <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border border-border">
          <Infinity className="size-4 text-primary shrink-0" />
          <span className="text-[10px] text-muted-foreground">
           {isRTL ? 'مهام غير محدودة' : 'Unlimited Tasks'}
          </span>
         </div>
         <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border border-border">
          <Zap className="size-4 text-primary shrink-0" />
          <span className="text-[10px] text-muted-foreground">
           {isRTL ? 'مزامنة فورية' : 'Real-time Sync'}
          </span>
         </div>
         <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border border-border">
          <HardDrive className="size-4 text-amber-400 shrink-0" />
          <span className="text-[10px] text-muted-foreground">
           {isRTL ? 'مساحة أكبر' : 'More Storage'}
          </span>
         </div>
        </div>
       </motion.div>

       {/* Dismiss button */}
       <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="px-6 pb-5 text-center"
       >
        <button
         onClick={() => onOpenChange(false)}
         className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
        >
         {isRTL ? 'ربما لاحقًا' : 'Maybe Later'}
        </button>
       </motion.div>
      </div>
     )}
    </AnimatePresence>
   </DialogContent>
  </Dialog>
 )
}
