'use client'

import { Badge } from '@/components/ui/badge'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { Crown, Sparkles, Zap } from 'lucide-react'

export function PlanBadge() {
  const { plan } = useSubscriptionStore()
  
  const config = {
    free: { label: 'Free', className: 'bg-gray-500/20 text-[--text-muted] border-gray-500/30', icon: null },
    pro: { label: 'Pro', className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: Zap },
    family_plus: { label: 'Family+', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Crown },
  }
  
  const { label, className, icon: Icon } = config[plan]
  
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 font-semibold ${className}`}>
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  )
}

export function UpgradePrompt({ feature, currentCount, limit }: { feature: string; currentCount: number; limit: number }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
      <p className="text-xs text-[--text-secondary]">
        {currentCount}/{limit} {feature} on Free plan. <span className="text-indigo-400 font-medium cursor-pointer hover:text-indigo-300">Upgrade to Pro</span> for unlimited.
      </p>
    </div>
  )
}
