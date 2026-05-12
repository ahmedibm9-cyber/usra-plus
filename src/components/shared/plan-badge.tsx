'use client'

import { Badge } from '@/components/ui/badge'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { Crown, Sparkles, Zap } from 'lucide-react'

export function PlanBadge() {
  const { plan } = useSubscriptionStore()
  
  const config = {
    free: { label: 'Free', className: 'bg-white/10 text-[#F5F5F0]/40 border-white/10', icon: null },
    pro: { label: 'Pro', className: 'bg-[#F4C430]/15 text-[#F4C430] border-[#F4C430]/30', icon: Zap },
    family_plus: { label: 'Family+', className: 'bg-[#F4C430]/15 text-[#F4C430] border-[#F4C430]/30', icon: Crown },
  }
  
  const { label, className, icon: Icon } = config[plan]
  
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 font-semibold font-['Space_Grotesk',sans-serif] ${className}`}>
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  )
}

export function UpgradePrompt({ feature, currentCount, limit }: { feature: string; currentCount: number; limit: number }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#E50914]/10 to-[#F4C430]/10 border border-[#F4C430]/20">
      <Sparkles className="w-4 h-4 text-[#F4C430] shrink-0" />
      <p className="text-xs text-[#F5F5F0]/70 font-['Inter',sans-serif]">
        {currentCount}/{limit} {feature} on Free plan. <span className="text-[#F4C430] font-medium cursor-pointer hover:text-[#E0B52E] font-['Space_Grotesk',sans-serif]">Upgrade to Pro</span> for unlimited.
      </p>
    </div>
  )
}
