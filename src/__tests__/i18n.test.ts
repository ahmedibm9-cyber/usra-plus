import { describe, it, expect, beforeEach } from 'vitest'
import { useI18n } from '@/i18n/use-translation'
import { en } from '@/i18n/en'
import { ar } from '@/i18n/ar'

describe('i18n', () => {
  beforeEach(() => {
    useI18n.getState().setLanguage('en')
  })

  it('should have English translations', () => {
    expect(en).toBeDefined()
    expect(typeof en).toBe('object')
  })

  it('should have Arabic translations', () => {
    expect(ar).toBeDefined()
    expect(typeof ar).toBe('object')
  })

  it('should return correct language', () => {
    expect(useI18n.getState().language).toBe('en')
    useI18n.getState().setLanguage('ar')
    expect(useI18n.getState().language).toBe('ar')
  })

  it('should detect RTL for Arabic', () => {
    useI18n.getState().setLanguage('ar')
    expect(useI18n.getState().isRTL).toBe(true)
  })

  it('should detect LTR for English', () => {
    useI18n.getState().setLanguage('en')
    expect(useI18n.getState().isRTL).toBe(false)
  })

  it('should translate keys', () => {
    const { t } = useI18n.getState()
    expect(typeof t).toBe('function')
  })
})
