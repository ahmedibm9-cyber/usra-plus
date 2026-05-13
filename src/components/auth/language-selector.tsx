'use client'

import { Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/i18n/use-translation'
import type { Language } from '@/types'

const languages: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
]

export function LanguageSelector() {
  const { language, setLanguage, isRTL } = useI18n()

  const currentLang = languages.find((l) => l.value === language) ?? languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-card/50 hover:bg-secondary hover:border-[#B8860B]/15 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          aria-label="Select language"
        >
          <Globe className="w-4 h-4" />
          <span className="text-base leading-none">{currentLang.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isRTL ? 'start' : 'end'}
        className="rounded-xl border-border bg-card text-card-foreground shadow-warm-lg min-w-[140px]"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
            onClick={() => setLanguage(lang.value as Language)}
            className={`rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              language === lang.value
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-primary/5'
            }`}
          >
            <span className="text-base">{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
