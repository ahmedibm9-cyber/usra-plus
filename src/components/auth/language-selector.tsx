'use client'

import { Globe } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/i18n/use-translation'
import type { Language } from '@/types'

const languages: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
]

export function LanguageSelector() {
  const { language, setLanguage, isRTL } = useI18n()

  return (
    <Select
      value={language}
      onValueChange={(val) => setLanguage(val as Language)}
    >
      <SelectTrigger
        className="w-auto gap-1.5 border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] focus:ring-[#E50914]/30 h-9 rounded-xl px-3 text-sm"
      >
        <Globe className="size-4 text-[--text-muted]" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="border-[--border-subtle] bg-[--bg-surface] text-[--text-primary] rounded-xl"
        position="popper"
        align={isRTL ? 'start' : 'end'}
      >
        {languages.map((lang) => (
          <SelectItem
            key={lang.value}
            value={lang.value}
            className="focus:bg-[#E50914]/10 focus:text-[#E50914] cursor-pointer rounded-lg"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
