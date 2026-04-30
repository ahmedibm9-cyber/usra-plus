'use client'

import { create } from 'zustand'
import { en, type TranslationKeys } from './en'
import { ar } from './ar'
import type { Language } from '@/types'

const translations: Record<Language, TranslationKeys> = {
  en,
  ar: ar as TranslationKeys,
}

interface I18nState {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
  isRTL: boolean
  dir: 'ltr' | 'rtl'
}

export const useI18n = create<I18nState>((set) => ({
  language: 'en',
  t: en,
  isRTL: false,
  dir: 'ltr',
  setLanguage: (lang: Language) => {
    const isRTL = lang === 'ar'
    set({
      language: lang,
      t: translations[lang],
      isRTL,
      dir: isRTL ? 'rtl' : 'ltr',
    })
    // Update document direction
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
      document.documentElement.lang = lang
    }
  },
}))
