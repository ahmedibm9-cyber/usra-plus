'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  FileText, Paintbrush, Globe, Save, Loader2, RefreshCw,
  Plus, Trash2, ChevronUp, ChevronDown, Palette, Type,
  Image, Settings, Mail, Languages, Check, AlertCircle,
  Download, Upload, Copy, Send, Bell, Shield, Clock,
  Zap, RotateCcw, Eye, Smartphone, Monitor, Share2,
  Gauge, Timer, Lock, MessageSquare, FileDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminAuthStore } from '@/stores/admin-auth-store'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContentSection {
  heading: string
  body: string
}

interface LegalContent {
  title: string
  lastUpdated: string
  sections: ContentSection[]
}

interface AppBranding {
  appName: string
  tagline: string
  taglineAr: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string
  faviconUrl: string
  darkModeDefault: boolean
  fontFamily: string
  borderRadius: string
  animationSpeed: string
}

interface AppConfig {
  registrationEnabled: boolean
  googleOAuthEnabled: boolean
  maintenanceMode: boolean
  maintenanceMessageEn: string
  maintenanceMessageAr: string
  maxFamilyMembers: number
  maxFamiliesPerUser: number
  defaultLanguage: string
  supportedLanguages: string[]
  maxFileUploadMB: number
  pushNotificationsEnabled: boolean
  emailNotificationsEnabled: boolean
  inAppNotificationsEnabled: boolean
  apiRateLimitPerMin: number
  sessionTimeoutHours: number
  maxLoginAttempts: number
  autoModerationEnabled: boolean
  profanityFilterEnabled: boolean
  gdprDataExportEnabled: boolean
}

interface EmailTemplates {
  welcomeSubject: string
  welcomeBody: string
  passwordResetSubject: string
  passwordResetBody: string
  invitationSubject: string
  invitationBody: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', style: 'font-family: Inter, sans-serif' },
  { value: 'Space Grotesk', label: 'Space Grotesk', style: 'font-family: "Space Grotesk", sans-serif' },
  { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic', style: 'font-family: "IBM Plex Sans Arabic", sans-serif' },
  { value: 'system-ui', label: 'System UI', style: 'font-family: system-ui, sans-serif' },
  { value: 'Georgia', label: 'Georgia', style: 'font-family: Georgia, serif' },
  { value: 'monospace', label: 'Monospace', style: 'font-family: monospace' },
]

const BORDER_RADIUS_OPTIONS = [
  { value: '0', label: 'None', tw: 'rounded-none' },
  { value: '0.125rem', label: 'SM', tw: 'rounded-sm' },
  { value: '0.25rem', label: 'MD', tw: 'rounded-md' },
  { value: '0.5rem', label: 'LG', tw: 'rounded-lg' },
  { value: '0.75rem', label: 'XL', tw: 'rounded-xl' },
  { value: '1rem', label: '2XL', tw: 'rounded-2xl' },
  { value: '9999px', label: 'Full', tw: 'rounded-full' },
]

const ANIMATION_SPEED_OPTIONS = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
]

const TEMPLATE_VARIABLES = [
  { key: '{{name}}', description: 'Recipient display name', templates: ['welcome', 'passwordReset'] },
  { key: '{{email}}', description: 'Recipient email address', templates: ['welcome', 'passwordReset', 'invitation'] },
  { key: '{{resetLink}}', description: 'Password reset link', templates: ['passwordReset'] },
  { key: '{{inviterName}}', description: 'Name of person who invited', templates: ['invitation'] },
  { key: '{{inviteLink}}', description: 'Invitation acceptance link', templates: ['invitation'] },
  { key: '{{appName}}', description: 'Application name from branding', templates: ['welcome', 'passwordReset', 'invitation'] },
]

const DEFAULT_BRANDING: AppBranding = {
  appName: 'USRA PLUS',
  tagline: 'Your Family, Organized',
  taglineAr: 'عائلتك، منظمة',
  primaryColor: '#E50914',
  secondaryColor: '#F4C430',
  logoUrl: '',
  faviconUrl: '',
  darkModeDefault: true,
  fontFamily: 'Space Grotesk',
  borderRadius: '0.75rem',
  animationSpeed: 'normal',
}

const DEFAULT_CONFIG: AppConfig = {
  registrationEnabled: true,
  googleOAuthEnabled: false,
  maintenanceMode: false,
  maintenanceMessageEn: '',
  maintenanceMessageAr: '',
  maxFamilyMembers: 10,
  maxFamiliesPerUser: 3,
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ar'],
  maxFileUploadMB: 25,
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  apiRateLimitPerMin: 60,
  sessionTimeoutHours: 24,
  maxLoginAttempts: 5,
  autoModerationEnabled: false,
  profanityFilterEnabled: false,
  gdprDataExportEnabled: true,
}

const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  welcomeSubject: 'Welcome to USRA PLUS!',
  welcomeBody: 'Hello {{name}},\n\nWelcome to USRA PLUS! We\'re excited to have you on board.\n\nBest regards,\nThe USRA PLUS Team',
  passwordResetSubject: 'Reset Your USRA PLUS Password',
  passwordResetBody: 'Hello {{name}},\n\nClick the link below to reset your password:\n{{resetLink}}\n\nIf you didn\'t request this, please ignore this email.',
  invitationSubject: 'You\'re Invited to Join a Family on USRA PLUS',
  invitationBody: 'Hello,\n\n{{inviterName}} has invited you to join their family on USRA PLUS.\n\nClick the link below to accept:\n{{inviteLink}}',
}

// ─── Card Wrapper ────────────────────────────────────────────────────────────

function ContentCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[--bg-surface] border border-[--border-subtle] rounded-xl ${className}`}>
      {children}
    </div>
  )
}

// ─── Config Toggle Row ───────────────────────────────────────────────────────

function ConfigToggle({
  label,
  description,
  checked,
  onCheckedChange,
  accentColor = '#E50914',
  badge,
}: {
  label: React.ReactNode
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  accentColor?: string
  badge?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-[--bg-primary] rounded-lg">
      <div className="flex-1 mr-4">
        <p className="text-sm text-[--text-secondary] flex items-center gap-1.5">
          {label}
          {badge}
        </p>
        <p className="text-[10px] text-[--text-muted]">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-[--accent-color]"
        style={{ '--accent-color': accentColor } as React.CSSProperties}
      />
    </div>
  )
}

// ─── Legal Editor Component ──────────────────────────────────────────────────

function LegalEditor({
  title,
  content,
  onChange,
  languageLabel,
  onReset,
}: {
  title: string
  content: LegalContent
  onChange: (updated: LegalContent) => void
  languageLabel: string
  onReset?: () => void
}) {
  const addSection = () => {
    const newSection: ContentSection = {
      heading: `${content.sections.length + 1}. New Section`,
      body: '',
    }
    onChange({ ...content, sections: [...content.sections, newSection] })
  }

  const removeSection = (index: number) => {
    const newSections = content.sections.filter((_, i) => i !== index)
    onChange({ ...content, sections: newSections })
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...content.sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSections.length) return
    ;[newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]
    onChange({ ...content, sections: newSections })
  }

  const updateSection = (index: number, field: keyof ContentSection, value: string) => {
    const newSections = [...content.sections]
    newSections[index] = { ...newSections[index], [field]: value }
    onChange({ ...content, sections: newSections })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="text-[10px] bg-[#E50914]/10 text-[#E50914] border-[#E50914]/20">
            {languageLabel}
          </Badge>
          <span className="text-xs text-[--text-muted] font-metric">
            {content.sections.length} section{content.sections.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onReset && (
            <Button
              onClick={onReset}
              className="bg-[--bg-surface-2] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary] h-8 text-[10px] px-2"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          )}
          <Button
            onClick={addSection}
            className="bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 hover:bg-[#E50914]/20 h-8 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Section
          </Button>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-[--text-muted] mb-1 block">Document Title</label>
        <Input
          value={content.title}
          onChange={e => onChange({ ...content, title: e.target.value })}
          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
        />
      </div>

      {/* Last Updated */}
      <div>
        <label className="text-xs text-[--text-muted] mb-1 block">Last Updated</label>
        <Input
          type="date"
          value={content.lastUpdated}
          onChange={e => onChange({ ...content, lastUpdated: e.target.value })}
          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
        />
      </div>

      {/* Sections */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
        {content.sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <ContentCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[--text-muted] font-metric">Section {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSection(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface-2] disabled:opacity-20 transition-all"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSection(index, 'down')}
                    disabled={index === content.sections.length - 1}
                    className="p-1 rounded text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface-2] disabled:opacity-20 transition-all"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeSection(index)}
                    className="p-1 rounded text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[--text-muted] mb-1 block">Heading</label>
                  <Input
                    value={section.heading}
                    onChange={e => updateSection(index, 'heading', e.target.value)}
                    className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                    placeholder="Section heading..."
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] mb-1 block">Body</label>
                  <textarea
                    value={section.body}
                    onChange={e => updateSection(index, 'body', e.target.value)}
                    rows={3}
                    className="w-full bg-[--bg-primary] border border-[--border-subtle] rounded-lg px-3 py-2 text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#E50914]/30 resize-y"
                    placeholder="Section content..."
                  />
                </div>
              </div>
            </ContentCard>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Email Preview Component ─────────────────────────────────────────────────

function EmailPreview({
  subject,
  body,
  branding,
}: {
  subject: string
  body: string
  branding: AppBranding
}) {
  const renderedSubject = (subject || 'No subject')
    .replace(/\{\{name\}\}/g, 'Ahmed')
    .replace(/\{\{email\}\}/g, 'ahmed@example.com')
    .replace(/\{\{resetLink\}\}/g, 'https://usraplus.com/reset?token=abc123')
    .replace(/\{\{inviterName\}\}/g, 'Sara')
    .replace(/\{\{inviteLink\}\}/g, 'https://usraplus.com/invite?code=xyz789')
    .replace(/\{\{appName\}\}/g, branding.appName || 'USRA PLUS')

  const renderedBody = (body || 'No content')
    .replace(/\{\{name\}\}/g, 'Ahmed')
    .replace(/\{\{email\}\}/g, 'ahmed@example.com')
    .replace(/\{\{resetLink\}\}/g, 'https://usraplus.com/reset?token=abc123')
    .replace(/\{\{inviterName\}\}/g, 'Sara')
    .replace(/\{\{inviteLink\}\}/g, 'https://usraplus.com/invite?code=xyz789')
    .replace(/\{\{appName\}\}/g, branding.appName || 'USRA PLUS')

  return (
    <div className="rounded-xl border border-[--border-subtle] overflow-hidden">
      {/* Email client chrome */}
      <div className="bg-[--bg-surface-2] px-4 py-2 border-b border-[--border-subtle] flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[--status-danger]/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[--status-warning]/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[--status-success]/60" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[10px] text-[--text-muted] font-metric">Email Preview</span>
        </div>
      </div>
      {/* Email header */}
      <div className="bg-[--bg-primary] px-4 py-3 border-b border-[--border-subtle]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: branding.primaryColor + '20' }}>
            <span className="text-[10px] font-bold" style={{ color: branding.primaryColor }}>{(branding.appName || 'U').charAt(0)}</span>
          </div>
          <div>
            <p className="text-[10px] text-[--text-secondary] font-medium">{branding.appName || 'USRA PLUS'}</p>
            <p className="text-[9px] text-[--text-muted]">noreply@usraplus.com</p>
          </div>
        </div>
        <p className="text-xs text-[--text-primary] font-medium mt-2">{renderedSubject}</p>
        <p className="text-[9px] text-[--text-muted]">To: ahmed@example.com</p>
      </div>
      {/* Email body */}
      <div className="bg-[--bg-primary] px-4 py-4">
        <div
          className="text-xs text-[--text-secondary] whitespace-pre-wrap leading-relaxed"
          style={{ fontFamily: branding.fontFamily || 'Inter, sans-serif' }}
        >
          {renderedBody}
        </div>
      </div>
      {/* Email footer */}
      <div className="bg-[--bg-surface-2] px-4 py-2 border-t border-[--border-subtle]">
        <p className="text-[9px] text-[--text-muted] text-center">
          Sent by {branding.appName || 'USRA PLUS'} &middot; <span style={{ color: branding.primaryColor }}>usraplus.com</span>
        </p>
      </div>
    </div>
  )
}

// ─── Template Variables Panel ────────────────────────────────────────────────

function TemplateVariablesPanel({ forTemplate }: { forTemplate?: string }) {
  const vars = forTemplate
    ? TEMPLATE_VARIABLES.filter(v => v.templates.includes(forTemplate))
    : TEMPLATE_VARIABLES

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Copied ${text} to clipboard`)
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs text-[--text-muted] uppercase tracking-wider flex items-center gap-1.5">
        <Copy className="w-3 h-3 text-[#E50914]" /> Available Variables
      </h4>
      <div className="grid grid-cols-1 gap-1.5">
        {vars.map(v => (
          <button
            key={v.key}
            onClick={() => copyToClipboard(v.key)}
            className="flex items-center justify-between p-2 bg-[--bg-primary] rounded-lg border border-[--border-subtle] hover:border-[#E50914]/30 transition-colors text-left group"
          >
            <div>
              <code className="text-xs text-[#E50914] font-metric">{v.key}</code>
              <p className="text-[9px] text-[--text-muted] mt-0.5">{v.description}</p>
            </div>
            <Copy className="w-3 h-3 text-[--text-muted] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Social Media Preview ────────────────────────────────────────────────────

function SocialMediaPreview({ branding }: { branding: AppBranding }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs text-[--text-muted] uppercase tracking-wider flex items-center gap-1.5">
        <Share2 className="w-3 h-3 text-[#E50914]" /> Social Media Preview
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Twitter/X Card */}
        <ContentCard className="overflow-hidden">
          <div
            className="h-24 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${branding.primaryColor}20, ${branding.secondaryColor}20)` }}
          >
            <div
              className="w-14 h-14 flex items-center justify-center"
              style={{
                backgroundColor: branding.primaryColor,
                borderRadius: branding.borderRadius || '0.75rem',
              }}
            >
              <span className="text-[--text-primary] font-bold text-xl" style={{ fontFamily: branding.fontFamily || 'Space Grotesk, sans-serif' }}>
                {(branding.appName || 'U').charAt(0)}
              </span>
            </div>
          </div>
          <div className="p-3">
            <p className="text-xs text-[--text-muted]">usraplus.com</p>
            <p className="text-sm text-[--text-primary] font-medium truncate" style={{ fontFamily: branding.fontFamily || 'Space Grotesk, sans-serif' }}>
              {branding.appName || 'USRA PLUS'} — {branding.tagline || 'Your Family, Organized'}
            </p>
            <p className="text-[10px] text-[--text-muted] mt-0.5 line-clamp-2">
              The family management app that keeps everyone organized, connected, and in sync.
            </p>
          </div>
          <div className="px-3 pb-2">
            <span className="text-[9px] text-[--text-muted] flex items-center gap-1">
              <Smartphone className="w-2.5 h-2.5" /> Twitter/X Card
            </span>
          </div>
        </ContentCard>

        {/* Open Graph / Slack / Discord Card */}
        <ContentCard className="overflow-hidden">
          <div className="flex">
            <div
              className="w-20 h-24 flex items-center justify-center shrink-0"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <span className="text-[--text-primary] font-bold text-2xl" style={{ fontFamily: branding.fontFamily || 'Space Grotesk, sans-serif' }}>
                {(branding.appName || 'U').charAt(0)}
              </span>
            </div>
            <div className="p-3 flex-1 min-w-0">
              <p className="text-[9px] text-[--text-muted] uppercase tracking-wider">usraplus.com</p>
              <p className="text-sm text-[--text-primary] font-medium truncate" style={{ fontFamily: branding.fontFamily || 'Space Grotesk, sans-serif' }}>
                {branding.appName || 'USRA PLUS'}
              </p>
              <p className="text-[10px] text-[--text-muted] mt-0.5 line-clamp-2">
                {branding.tagline || 'Your Family, Organized'}
              </p>
            </div>
          </div>
          <div className="px-3 pb-2 pt-1 border-t border-[--border-subtle]">
            <span className="text-[9px] text-[--text-muted] flex items-center gap-1">
              <Monitor className="w-2.5 h-2.5" /> Open Graph / Slack
            </span>
          </div>
        </ContentCard>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminContent() {
  const { addAuditLog } = useAdminAuthStore()
  const importInputRef = useRef<HTMLInputElement>(null)

  // Content state
  const [termsEn, setTermsEn] = useState<LegalContent>({
    title: 'Terms of Service',
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: [],
  })
  const [termsAr, setTermsAr] = useState<LegalContent>({
    title: 'شروط الخدمة',
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: [],
  })
  const [privacyEn, setPrivacyEn] = useState<LegalContent>({
    title: 'Privacy Policy',
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: [],
  })
  const [privacyAr, setPrivacyAr] = useState<LegalContent>({
    title: 'سياسة الخصوصية',
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: [],
  })
  const [branding, setBranding] = useState<AppBranding>({ ...DEFAULT_BRANDING })
  const [appConfig, setAppConfig] = useState<AppConfig>({ ...DEFAULT_CONFIG })
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplates>({ ...DEFAULT_EMAIL_TEMPLATES })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('terms')

  // ─── Fetch content ─────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/content', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await res.json()
        const c = json.content || {}

        if (c.terms_of_service_en) setTermsEn(c.terms_of_service_en)
        if (c.terms_of_service_ar) setTermsAr(c.terms_of_service_ar)
        if (c.privacy_policy_en) setPrivacyEn(c.privacy_policy_en)
        if (c.privacy_policy_ar) setPrivacyAr(c.privacy_policy_ar)
        if (c.app_branding) setBranding({ ...DEFAULT_BRANDING, ...c.app_branding })
        if (c.app_config) setAppConfig({ ...DEFAULT_CONFIG, ...c.app_config })
        if (c.email_templates) setEmailTemplates({ ...DEFAULT_EMAIL_TEMPLATES, ...c.email_templates })
      }
    } catch {
      toast.error('Failed to load content')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  // ─── Save content ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms_of_service_en: termsEn,
          terms_of_service_ar: termsAr,
          privacy_policy_en: privacyEn,
          privacy_policy_ar: privacyAr,
          app_branding: branding,
          app_config: appConfig,
          email_templates: emailTemplates,
        }),
      })

      if (res.ok) {
        toast.success('All content saved successfully')
        setHasChanges(false)
        setLastSavedAt(new Date().toLocaleTimeString())
        addAuditLog('content_saved', 'content', null, { keys: 7 })
      } else {
        const json = await res.json()
        toast.error(json.error || 'Failed to save content')
      }
    } catch {
      toast.error('Failed to save — check your connection')
    } finally {
      setIsSaving(false)
    }
  }, [termsEn, termsAr, privacyEn, privacyAr, branding, appConfig, emailTemplates, addAuditLog])

  // Mark changes
  const markChanged = useCallback(() => setHasChanges(true), [])

  // ─── Export/Import Branding ─────────────────────────────────────────
  const handleExportBranding = () => {
    const data = JSON.stringify(branding, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `branding-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Branding config exported')
  }

  const handleImportBranding = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        setBranding({ ...DEFAULT_BRANDING, ...data })
        markChanged()
        toast.success('Branding config imported')
      } catch {
        toast.error('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ─── Send Test Email ────────────────────────────────────────────────
  const handleSendTestEmail = async (templateType: string) => {
    try {
      console.log(`[Test Email] Would send ${templateType} email to admin@usraplus.com`)
      toast.success(`Test ${templateType} email logged to console (email service not configured)`)
      addAuditLog('test_email_sent', 'email', null, { templateType })
    } catch {
      toast.error('Failed to send test email')
    }
  }

  // ─── Quick Stats ────────────────────────────────────────────────────
  const activeConfigToggles = [
    appConfig.registrationEnabled,
    appConfig.googleOAuthEnabled,
    appConfig.pushNotificationsEnabled,
    appConfig.emailNotificationsEnabled,
    appConfig.inAppNotificationsEnabled,
    appConfig.autoModerationEnabled,
    appConfig.profanityFilterEnabled,
    appConfig.gdprDataExportEnabled,
  ].filter(Boolean).length

  // ─── Tab items ──────────────────────────────────────────────────────
  const tabItems = [
    { value: 'terms', label: 'Terms of Service', icon: <FileText className="w-3.5 h-3.5" /> },
    { value: 'privacy', label: 'Privacy Policy', icon: <Globe className="w-3.5 h-3.5" /> },
    { value: 'branding', label: 'App Branding', icon: <Paintbrush className="w-3.5 h-3.5" /> },
    { value: 'config', label: 'App Config', icon: <Settings className="w-3.5 h-3.5" /> },
    { value: 'email', label: 'Email Templates', icon: <Mail className="w-3.5 h-3.5" /> },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[--bg-surface] rounded-xl border border-[--border-subtle] p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="bg-[--bg-surface] rounded-xl border border-[--border-subtle] p-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  // Helper for border radius preview
  const borderRadiusLabel = BORDER_RADIUS_OPTIONS.find(o => o.value === branding.borderRadius)?.label || 'XL'
  const animationSpeedLabel = ANIMATION_SPEED_OPTIONS.find(o => o.value === branding.animationSpeed)?.label || 'Normal'

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[--text-primary]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Content & Branding</h1>
            <p className="text-[--text-muted] text-sm mt-1">Edit Terms of Service, Privacy Policy, app branding, and configuration</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[--status-warning-bg] border border-[--status-warning-border]"
              >
                <AlertCircle className="w-3 h-3 text-[--status-warning]" />
                <span className="text-xs text-[--status-warning]">Unsaved changes</span>
              </motion.div>
            )}
            <Button
              onClick={fetchContent}
              className="bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] h-9"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 hover:bg-[#E50914]/20 h-9"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save All
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ContentCard className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E50914]/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-[#E50914]" />
              </div>
              <div>
                <p className="text-[10px] text-[--text-muted]">Terms Sections</p>
                <p className="text-sm font-bold text-[--text-primary] font-metric">{termsEn.sections.length}</p>
              </div>
            </div>
          </ContentCard>
          <ContentCard className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#F4C430]/10 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-[#F4C430]" />
              </div>
              <div>
                <p className="text-[10px] text-[--text-muted]">Privacy Sections</p>
                <p className="text-sm font-bold text-[--text-primary] font-metric">{privacyEn.sections.length}</p>
              </div>
            </div>
          </ContentCard>
          <ContentCard className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[--status-success-bg] flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-[--status-success]" />
              </div>
              <div>
                <p className="text-[10px] text-[--text-muted]">Last Saved</p>
                <p className="text-sm font-bold text-[--text-primary] font-metric">{lastSavedAt || '—'}</p>
              </div>
            </div>
          </ContentCard>
          <ContentCard className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E50914]/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-[#E50914]" />
              </div>
              <div>
                <p className="text-[10px] text-[--text-muted]">Active Toggles</p>
                <p className="text-sm font-bold text-[--text-primary] font-metric">{activeConfigToggles}</p>
              </div>
            </div>
          </ContentCard>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="relative">
          <TabsList className="bg-[--bg-surface] border border-[--border-subtle] p-1 h-auto flex-wrap gap-1 w-full">
            {tabItems.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-[--text-muted] hover:text-[--text-secondary] px-3 py-1.5 text-xs sm:text-sm gap-1.5 rounded-lg relative data-[state=active]:bg-[#E50914]/10 data-[state=active]:text-[#E50914] data-[state=active]:shadow-none transition-all"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.value && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #E50914, #F4C430)' }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Tab 1: Terms of Service ────────────────────────────── */}
          {activeTab === 'terms' && (
            <TabsContent value="terms" forceMount>
              <motion.div
                key="terms"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <ContentCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Type className="w-4 h-4 text-[#E50914]" />
                      <h3 className="text-sm font-semibold text-[--text-primary]">English (EN)</h3>
                    </div>
                    <LegalEditor
                      title="Terms of Service (EN)"
                      content={termsEn}
                      onChange={c => { setTermsEn(c); markChanged() }}
                      languageLabel="EN"
                      onReset={() => { setTermsEn({ title: 'Terms of Service', lastUpdated: new Date().toISOString().split('T')[0], sections: [] }); markChanged() }}
                    />
                  </ContentCard>

                  <ContentCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Languages className="w-4 h-4 text-[#E50914]" />
                      <h3 className="text-sm font-semibold text-[--text-primary]">العربية (AR)</h3>
                    </div>
                    <LegalEditor
                      title="شروط الخدمة (AR)"
                      content={termsAr}
                      onChange={c => { setTermsAr(c); markChanged() }}
                      languageLabel="AR"
                      onReset={() => { setTermsAr({ title: 'شروط الخدمة', lastUpdated: new Date().toISOString().split('T')[0], sections: [] }); markChanged() }}
                    />
                  </ContentCard>
                </div>
              </motion.div>
            </TabsContent>
          )}

          {/* ── Tab 2: Privacy Policy ──────────────────────────────── */}
          {activeTab === 'privacy' && (
            <TabsContent value="privacy" forceMount>
              <motion.div
                key="privacy"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <ContentCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Type className="w-4 h-4 text-[#E50914]" />
                      <h3 className="text-sm font-semibold text-[--text-primary]">English (EN)</h3>
                    </div>
                    <LegalEditor
                      title="Privacy Policy (EN)"
                      content={privacyEn}
                      onChange={c => { setPrivacyEn(c); markChanged() }}
                      languageLabel="EN"
                      onReset={() => { setPrivacyEn({ title: 'Privacy Policy', lastUpdated: new Date().toISOString().split('T')[0], sections: [] }); markChanged() }}
                    />
                  </ContentCard>

                  <ContentCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Languages className="w-4 h-4 text-[#E50914]" />
                      <h3 className="text-sm font-semibold text-[--text-primary]">العربية (AR)</h3>
                    </div>
                    <LegalEditor
                      title="سياسة الخصوصية (AR)"
                      content={privacyAr}
                      onChange={c => { setPrivacyAr(c); markChanged() }}
                      languageLabel="AR"
                      onReset={() => { setPrivacyAr({ title: 'سياسة الخصوصية', lastUpdated: new Date().toISOString().split('T')[0], sections: [] }); markChanged() }}
                    />
                  </ContentCard>
                </div>
              </motion.div>
            </TabsContent>
          )}

          {/* ── Tab 3: App Branding ────────────────────────────────── */}
          {activeTab === 'branding' && (
            <TabsContent value="branding" forceMount>
              <motion.div
                key="branding"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="space-y-6">
                  <ContentCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-[#E50914]" />
                        <h3 className="text-sm font-semibold text-[--text-primary]">App Branding</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => { setBranding({ ...DEFAULT_BRANDING }); markChanged() }}
                          className="bg-[--bg-surface-2] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary] h-8 text-[10px] px-2"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                        <Button
                          onClick={handleExportBranding}
                          className="bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 hover:bg-[#E50914]/20 h-8 text-[10px] px-2"
                        >
                          <Download className="w-3 h-3 mr-1" /> Export
                        </Button>
                        <Button
                          onClick={() => importInputRef.current?.click()}
                          className="bg-[#F4C430]/10 text-[#F4C430] border border-[#F4C430]/20 hover:bg-[#F4C430]/20 h-8 text-[10px] px-2"
                        >
                          <Upload className="w-3 h-3 mr-1" /> Import
                        </Button>
                        <input
                          ref={importInputRef}
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleImportBranding}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* App Name */}
                      <div>
                        <label className="text-xs text-[--text-muted] mb-1.5 block">App Name</label>
                        <Input
                          value={branding.appName}
                          onChange={e => { setBranding({ ...branding, appName: e.target.value }); markChanged() }}
                          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                        />
                      </div>

                      {/* Tagline (EN) */}
                      <div>
                        <label className="text-xs text-[--text-muted] mb-1.5 block">Tagline (English)</label>
                        <Input
                          value={branding.tagline}
                          onChange={e => { setBranding({ ...branding, tagline: e.target.value }); markChanged() }}
                          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                        />
                      </div>

                      {/* Tagline (AR) */}
                      <div>
                        <label className="text-xs text-[--text-muted] mb-1.5 block">Tagline (العربية)</label>
                        <Input
                          value={branding.taglineAr}
                          onChange={e => { setBranding({ ...branding, taglineAr: e.target.value }); markChanged() }}
                          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                          dir="rtl"
                        />
                      </div>

                      {/* Dark Mode Default */}
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={branding.darkModeDefault}
                          onCheckedChange={v => { setBranding({ ...branding, darkModeDefault: v }); markChanged() }}
                          className="data-[state=checked]:bg-[#E50914]"
                        />
                        <div>
                          <p className="text-sm text-[--text-secondary]">Dark Mode Default</p>
                          <p className="text-[10px] text-[--text-muted]">New users start in dark mode</p>
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="mt-6 pt-6 border-t border-[--border-subtle]">
                      <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4">Brand Colors</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-[--text-muted] mb-1.5 block">Primary Color</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={branding.primaryColor}
                              onChange={e => { setBranding({ ...branding, primaryColor: e.target.value }); markChanged() }}
                              className="w-10 h-10 rounded-lg border border-[--border-subtle] cursor-pointer bg-transparent"
                            />
                            <Input
                              value={branding.primaryColor}
                              onChange={e => { setBranding({ ...branding, primaryColor: e.target.value }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30 flex-1"
                            />
                            <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: branding.primaryColor }} />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-[--text-muted] mb-1.5 block">Secondary Color</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={branding.secondaryColor}
                              onChange={e => { setBranding({ ...branding, secondaryColor: e.target.value }); markChanged() }}
                              className="w-10 h-10 rounded-lg border border-[--border-subtle] cursor-pointer bg-transparent"
                            />
                            <Input
                              value={branding.secondaryColor}
                              onChange={e => { setBranding({ ...branding, secondaryColor: e.target.value }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30 flex-1"
                            />
                            <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: branding.secondaryColor }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logo URLs */}
                    <div className="mt-6 pt-6 border-t border-[--border-subtle]">
                      <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4">Logo & Icons</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-[--text-muted] mb-1.5 block flex items-center gap-1.5">
                            <Image className="w-3 h-3" /> Logo URL
                          </label>
                          <Input
                            value={branding.logoUrl}
                            onChange={e => { setBranding({ ...branding, logoUrl: e.target.value }); markChanged() }}
                            className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[--text-muted] mb-1.5 block flex items-center gap-1.5">
                            <Image className="w-3 h-3" /> Favicon URL
                          </label>
                          <Input
                            value={branding.faviconUrl}
                            onChange={e => { setBranding({ ...branding, faviconUrl: e.target.value }); markChanged() }}
                            className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Font, Border Radius, Animation Speed */}
                    <div className="mt-6 pt-6 border-t border-[--border-subtle]">
                      <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4">Typography & Style</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* Font Selection */}
                        <div>
                          <label className="text-xs text-[--text-muted] mb-1.5 block flex items-center gap-1.5">
                            <Type className="w-3 h-3" /> Font Family
                          </label>
                          <select
                            value={branding.fontFamily}
                            onChange={e => { setBranding({ ...branding, fontFamily: e.target.value }); markChanged() }}
                            className="w-full bg-[--bg-primary] border border-[--border-subtle] rounded-lg px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[#E50914]/30"
                          >
                            {FONT_OPTIONS.map(font => (
                              <option key={font.value} value={font.value} style={{ fontFamily: font.style }}>
                                {font.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Border Radius */}
                        <div>
                          <label className="text-xs text-[--text-muted] mb-1.5 block flex items-center gap-1.5">
                            <Palette className="w-3 h-3" /> Border Radius
                          </label>
                          <div className="space-y-2">
                            <input
                              type="range"
                              min={0}
                              max={BORDER_RADIUS_OPTIONS.length - 1}
                              value={BORDER_RADIUS_OPTIONS.findIndex(o => o.value === branding.borderRadius)}
                              onChange={e => {
                                const idx = parseInt(e.target.value)
                                if (idx >= 0 && idx < BORDER_RADIUS_OPTIONS.length) {
                                  setBranding({ ...branding, borderRadius: BORDER_RADIUS_OPTIONS[idx].value })
                                  markChanged()
                                }
                              }}
                              className="w-full accent-[#E50914] h-2"
                            />
                            <div className="flex justify-between">
                              {BORDER_RADIUS_OPTIONS.map((opt, i) => (
                                <button
                                  key={opt.value}
                                  onClick={() => { setBranding({ ...branding, borderRadius: opt.value }); markChanged() }}
                                  className={`text-[9px] transition-colors ${branding.borderRadius === opt.value ? 'text-[#E50914] font-bold' : 'text-[--text-muted] hover:text-[--text-secondary]'}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Animation Speed */}
                        <div>
                          <label className="text-xs text-[--text-muted] mb-1.5 block flex items-center gap-1.5">
                            <Zap className="w-3 h-3" /> Animation Speed
                          </label>
                          <div className="flex gap-1.5 mt-1">
                            {ANIMATION_SPEED_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => { setBranding({ ...branding, animationSpeed: opt.value }); markChanged() }}
                                className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                                  branding.animationSpeed === opt.value
                                    ? 'bg-[#E50914]/10 text-[#E50914] border-[#E50914]/30 font-medium'
                                    : 'bg-[--bg-primary] text-[--text-muted] border-[--border-subtle] hover:text-[--text-secondary]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ContentCard>

                  {/* Live Preview Section */}
                  <ContentCard className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="w-4 h-4 text-[#E50914]" />
                      <h3 className="text-sm font-semibold text-[--text-primary]">Live Preview</h3>
                      <Badge className="text-[9px] bg-[#F4C430]/10 text-[#F4C430] border-[#F4C430]/20 ml-2">Real-time</Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* App Preview */}
                      <div>
                        <h4 className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-3">App Interface</h4>
                        <div
                          className="bg-[--bg-primary] p-6 border border-[--border-subtle]"
                          style={{ borderRadius: branding.borderRadius || '0.75rem' }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className="w-10 h-10 flex items-center justify-center"
                              style={{
                                backgroundColor: branding.primaryColor + '20',
                                borderRadius: branding.borderRadius || '0.75rem',
                              }}
                            >
                              <span className="font-bold text-lg" style={{ color: branding.primaryColor, fontFamily: branding.fontFamily || 'Space Grotesk, sans-serif' }}>
                                {branding.appName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-[--text-primary]" style={{ fontFamily: branding.fontFamily || 'Space Grotesk, sans-serif' }}>{branding.appName}</h3>
                              <p className="text-xs text-[--text-muted]">{branding.tagline}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mb-3">
                            <button
                              className="px-4 py-2 text-sm font-medium text-[--text-primary]"
                              style={{
                                backgroundColor: branding.primaryColor,
                                borderRadius: branding.borderRadius || '0.5rem',
                                fontFamily: branding.fontFamily || 'Inter, sans-serif',
                              }}
                            >
                              Primary Button
                            </button>
                            <button
                              className="px-4 py-2 text-sm font-medium border"
                              style={{
                                color: branding.secondaryColor,
                                borderColor: branding.secondaryColor + '40',
                                borderRadius: branding.borderRadius || '0.5rem',
                                fontFamily: branding.fontFamily || 'Inter, sans-serif',
                              }}
                            >
                              Secondary
                            </button>
                          </div>
                          {/* Card example */}
                          <div
                            className="p-3 bg-[--bg-surface-2] border border-[--border-subtle]"
                            style={{ borderRadius: branding.borderRadius || '0.5rem' }}
                          >
                            <p className="text-[10px] text-[--text-muted] mb-1">Sample Card</p>
                            <div className="h-1.5 bg-[--bg-primary] rounded-full overflow-hidden">
                              <div className="h-full w-3/4" style={{ backgroundColor: branding.primaryColor, borderRadius: '9999px' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Social Media Preview */}
                      <div>
                        <SocialMediaPreview branding={branding} />
                      </div>
                    </div>

                    {/* Style Summary */}
                    <div className="mt-4 pt-4 border-t border-[--border-subtle]">
                      <div className="flex flex-wrap gap-3">
                        <Badge className="text-[9px] bg-[--bg-surface-2] text-[--text-secondary] border-[--border-subtle]">
                          <Type className="w-2.5 h-2.5 mr-1" /> {branding.fontFamily}
                        </Badge>
                        <Badge className="text-[9px] bg-[--bg-surface-2] text-[--text-secondary] border-[--border-subtle]">
                          <Palette className="w-2.5 h-2.5 mr-1" /> Radius: {borderRadiusLabel}
                        </Badge>
                        <Badge className="text-[9px] bg-[--bg-surface-2] text-[--text-secondary] border-[--border-subtle]">
                          <Zap className="w-2.5 h-2.5 mr-1" /> Speed: {animationSpeedLabel}
                        </Badge>
                        <Badge className="text-[9px] bg-[--bg-surface-2] text-[--text-secondary] border-[--border-subtle]">
                          <div className="w-2.5 h-2.5 rounded-sm mr-1" style={{ backgroundColor: branding.primaryColor }} />
                          {branding.primaryColor}
                        </Badge>
                        <Badge className="text-[9px] bg-[--bg-surface-2] text-[--text-secondary] border-[--border-subtle]">
                          <div className="w-2.5 h-2.5 rounded-sm mr-1" style={{ backgroundColor: branding.secondaryColor }} />
                          {branding.secondaryColor}
                        </Badge>
                      </div>
                    </div>
                  </ContentCard>
                </div>
              </motion.div>
            </TabsContent>
          )}

          {/* ── Tab 4: App Config ──────────────────────────────────── */}
          {activeTab === 'config' && (
            <TabsContent value="config" forceMount>
              <motion.div
                key="config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="space-y-6">
                  <ContentCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-[#E50914]" />
                        <h3 className="text-sm font-semibold text-[--text-primary]">Application Configuration</h3>
                      </div>
                      <Button
                        onClick={() => { setAppConfig({ ...DEFAULT_CONFIG }); markChanged() }}
                        className="bg-[--bg-surface-2] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary] h-8 text-[10px] px-2"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Reset to Defaults
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {/* Feature Toggles */}
                      <div>
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4">Feature Toggles</h4>
                        <div className="space-y-3">
                          <ConfigToggle
                            label="User Registration"
                            description="Allow new users to sign up"
                            checked={appConfig.registrationEnabled}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, registrationEnabled: v }); markChanged() }}
                          />
                          <ConfigToggle
                            label="Google OAuth"
                            description="Enable Google sign-in"
                            checked={appConfig.googleOAuthEnabled}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, googleOAuthEnabled: v }); markChanged() }}
                          />
                          <ConfigToggle
                            label={
                              <>
                                Maintenance Mode
                                {appConfig.maintenanceMode && (
                                  <Badge className="text-[9px] bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border] ml-1">ACTIVE</Badge>
                                )}
                              </>
                            }
                            description="Show maintenance page to users"
                            checked={appConfig.maintenanceMode}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, maintenanceMode: v }); markChanged() }}
                            accentColor="#EF4444"
                          />
                        </div>
                      </div>

                      {/* Maintenance Messages */}
                      {appConfig.maintenanceMode && (
                        <div className="p-4 bg-[--status-danger-bg] border border-[--status-danger-border] rounded-lg space-y-3">
                          <h4 className="text-xs text-[--status-danger] uppercase tracking-wider">Maintenance Messages</h4>
                          <div>
                            <label className="text-[10px] text-[--text-muted] mb-1 block">Message (EN)</label>
                            <Input
                              value={appConfig.maintenanceMessageEn}
                              onChange={e => { setAppConfig({ ...appConfig, maintenanceMessageEn: e.target.value }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[--text-muted] mb-1 block">Message (AR)</label>
                            <Input
                              value={appConfig.maintenanceMessageAr}
                              onChange={e => { setAppConfig({ ...appConfig, maintenanceMessageAr: e.target.value }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                              dir="rtl"
                            />
                          </div>
                        </div>
                      )}

                      {/* Notification Settings */}
                      <div className="pt-4 border-t border-[--border-subtle]">
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <Bell className="w-3 h-3 text-[#F4C430]" /> Notification Settings
                        </h4>
                        <div className="space-y-3">
                          <ConfigToggle
                            label="Push Notifications"
                            description="Send push notifications to user devices"
                            checked={appConfig.pushNotificationsEnabled}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, pushNotificationsEnabled: v }); markChanged() }}
                            accentColor="#F4C430"
                          />
                          <ConfigToggle
                            label="Email Notifications"
                            description="Send notification emails to users"
                            checked={appConfig.emailNotificationsEnabled}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, emailNotificationsEnabled: v }); markChanged() }}
                            accentColor="#F4C430"
                          />
                          <ConfigToggle
                            label="In-App Notifications"
                            description="Show notifications inside the app"
                            checked={appConfig.inAppNotificationsEnabled}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, inAppNotificationsEnabled: v }); markChanged() }}
                            accentColor="#F4C430"
                          />
                        </div>
                      </div>

                      {/* Security & Rate Limiting */}
                      <div className="pt-4 border-t border-[--border-subtle]">
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-[#E50914]" /> Security & Rate Limiting
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-[--text-muted] mb-1.5 block flex items-center gap-1.5">
                              <Gauge className="w-3 h-3" /> API Rate Limit (per min)
                            </label>
                            <Input
                              type="number"
                              value={appConfig.apiRateLimitPerMin}
                              onChange={e => { setAppConfig({ ...appConfig, apiRateLimitPerMin: parseInt(e.target.value) || 60 }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30 font-metric"
                              min={10}
                              max={1000}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[--text-muted] mb-1.5 block flex items-center gap-1.5">
                              <Timer className="w-3 h-3" /> Session Timeout (hours)
                            </label>
                            <Input
                              type="number"
                              value={appConfig.sessionTimeoutHours}
                              onChange={e => { setAppConfig({ ...appConfig, sessionTimeoutHours: parseInt(e.target.value) || 24 }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30 font-metric"
                              min={1}
                              max={720}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[--text-muted] mb-1.5 block flex items-center gap-1.5">
                              <Lock className="w-3 h-3" /> Max Login Attempts
                            </label>
                            <Input
                              type="number"
                              value={appConfig.maxLoginAttempts}
                              onChange={e => { setAppConfig({ ...appConfig, maxLoginAttempts: parseInt(e.target.value) || 5 }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30 font-metric"
                              min={3}
                              max={20}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Content Moderation */}
                      <div className="pt-4 border-t border-[--border-subtle]">
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 text-[#F4C430]" /> Content Moderation
                        </h4>
                        <div className="space-y-3">
                          <ConfigToggle
                            label="Auto-Moderation"
                            description="Automatically flag inappropriate content"
                            checked={appConfig.autoModerationEnabled}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, autoModerationEnabled: v }); markChanged() }}
                            accentColor="#F4C430"
                          />
                          <ConfigToggle
                            label="Profanity Filter"
                            description="Block profanity in user-generated content"
                            checked={appConfig.profanityFilterEnabled}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, profanityFilterEnabled: v }); markChanged() }}
                            accentColor="#F4C430"
                          />
                        </div>
                      </div>

                      {/* GDPR & Privacy */}
                      <div className="pt-4 border-t border-[--border-subtle]">
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <FileDown className="w-3 h-3 text-[#E50914]" /> Data & Privacy
                        </h4>
                        <div className="space-y-3">
                          <ConfigToggle
                            label={
                              <>
                                GDPR Data Export
                                <Badge className="text-[9px] bg-[#F4C430]/10 text-[#F4C430] border-[#F4C430]/20 ml-1">COMPLIANCE</Badge>
                              </>
                            }
                            description="Allow users to export their personal data"
                            checked={appConfig.gdprDataExportEnabled}
                            onCheckedChange={v => { setAppConfig({ ...appConfig, gdprDataExportEnabled: v }); markChanged() }}
                          />
                        </div>
                      </div>

                      {/* Limits */}
                      <div className="pt-4 border-t border-[--border-subtle]">
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider mb-4">Limits & Defaults</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-[--text-muted] mb-1.5 block">Max Family Members</label>
                            <Input
                              type="number"
                              value={appConfig.maxFamilyMembers}
                              onChange={e => { setAppConfig({ ...appConfig, maxFamilyMembers: parseInt(e.target.value) || 10 }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30 font-metric"
                              min={2}
                              max={50}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[--text-muted] mb-1.5 block">Max Families Per User</label>
                            <Input
                              type="number"
                              value={appConfig.maxFamiliesPerUser}
                              onChange={e => { setAppConfig({ ...appConfig, maxFamiliesPerUser: parseInt(e.target.value) || 3 }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30 font-metric"
                              min={1}
                              max={20}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[--text-muted] mb-1.5 block">Max File Upload (MB)</label>
                            <Input
                              type="number"
                              value={appConfig.maxFileUploadMB}
                              onChange={e => { setAppConfig({ ...appConfig, maxFileUploadMB: parseInt(e.target.value) || 25 }); markChanged() }}
                              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30 font-metric"
                              min={1}
                              max={100}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-[--text-muted] mb-1.5 block">Default Language</label>
                            <select
                              value={appConfig.defaultLanguage}
                              onChange={e => { setAppConfig({ ...appConfig, defaultLanguage: e.target.value }); markChanged() }}
                              className="w-full bg-[--bg-primary] border border-[--border-subtle] rounded-lg px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:border-[#E50914]/30"
                            >
                              <option value="en">English</option>
                              <option value="ar">العربية</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ContentCard>
                </div>
              </motion.div>
            </TabsContent>
          )}

          {/* ── Tab 5: Email Templates ─────────────────────────────── */}
          {activeTab === 'email' && (
            <TabsContent value="email" forceMount>
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <ContentCard className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#E50914]" />
                      <h3 className="text-sm font-semibold text-[--text-primary]">Email Templates</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => { setEmailTemplates({ ...DEFAULT_EMAIL_TEMPLATES }); markChanged() }}
                        className="bg-[--bg-surface-2] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary] h-8 text-[10px] px-2"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Reset
                      </Button>
                      <Badge className="text-[10px] bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]">
                        <AlertCircle className="w-3 h-3 mr-1" /> Use {'{{name}}'}, {'{{resetLink}}'}, etc.
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Welcome Email */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider flex items-center gap-2">
                          <Check className="w-3 h-3 text-[#F4C430]" /> Welcome Email
                        </h4>
                        <Button
                          onClick={() => handleSendTestEmail('welcome')}
                          className="bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 hover:bg-[#E50914]/20 h-7 text-[10px] px-2"
                        >
                          <Send className="w-3 h-3 mr-1" /> Send Test
                        </Button>
                      </div>
                      <div>
                        <label className="text-[10px] text-[--text-muted] mb-1 block">Subject</label>
                        <Input
                          value={emailTemplates.welcomeSubject}
                          onChange={e => { setEmailTemplates({ ...emailTemplates, welcomeSubject: e.target.value }); markChanged() }}
                          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[--text-muted] mb-1 block">Body</label>
                        <textarea
                          value={emailTemplates.welcomeBody}
                          onChange={e => { setEmailTemplates({ ...emailTemplates, welcomeBody: e.target.value }); markChanged() }}
                          rows={5}
                          className="w-full bg-[--bg-primary] border border-[--border-subtle] rounded-lg px-3 py-2 text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#E50914]/30 resize-y font-mono"
                        />
                      </div>
                      <EmailPreview
                        subject={emailTemplates.welcomeSubject}
                        body={emailTemplates.welcomeBody}
                        branding={branding}
                      />
                    </div>

                    {/* Password Reset Email */}
                    <div className="space-y-3 pt-4 border-t border-[--border-subtle]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 text-[--status-warning]" /> Password Reset Email
                        </h4>
                        <Button
                          onClick={() => handleSendTestEmail('passwordReset')}
                          className="bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 hover:bg-[#E50914]/20 h-7 text-[10px] px-2"
                        >
                          <Send className="w-3 h-3 mr-1" /> Send Test
                        </Button>
                      </div>
                      <div>
                        <label className="text-[10px] text-[--text-muted] mb-1 block">Subject</label>
                        <Input
                          value={emailTemplates.passwordResetSubject}
                          onChange={e => { setEmailTemplates({ ...emailTemplates, passwordResetSubject: e.target.value }); markChanged() }}
                          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[--text-muted] mb-1 block">Body</label>
                        <textarea
                          value={emailTemplates.passwordResetBody}
                          onChange={e => { setEmailTemplates({ ...emailTemplates, passwordResetBody: e.target.value }); markChanged() }}
                          rows={5}
                          className="w-full bg-[--bg-primary] border border-[--border-subtle] rounded-lg px-3 py-2 text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#E50914]/30 resize-y font-mono"
                        />
                      </div>
                      <EmailPreview
                        subject={emailTemplates.passwordResetSubject}
                        body={emailTemplates.passwordResetBody}
                        branding={branding}
                      />
                    </div>

                    {/* Invitation Email */}
                    <div className="space-y-3 pt-4 border-t border-[--border-subtle]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs text-[--text-muted] uppercase tracking-wider flex items-center gap-2">
                          <Mail className="w-3 h-3 text-[#E50914]" /> Family Invitation Email
                        </h4>
                        <Button
                          onClick={() => handleSendTestEmail('invitation')}
                          className="bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20 hover:bg-[#E50914]/20 h-7 text-[10px] px-2"
                        >
                          <Send className="w-3 h-3 mr-1" /> Send Test
                        </Button>
                      </div>
                      <div>
                        <label className="text-[10px] text-[--text-muted] mb-1 block">Subject</label>
                        <Input
                          value={emailTemplates.invitationSubject}
                          onChange={e => { setEmailTemplates({ ...emailTemplates, invitationSubject: e.target.value }); markChanged() }}
                          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-sm focus:border-[#E50914]/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[--text-muted] mb-1 block">Body</label>
                        <textarea
                          value={emailTemplates.invitationBody}
                          onChange={e => { setEmailTemplates({ ...emailTemplates, invitationBody: e.target.value }); markChanged() }}
                          rows={5}
                          className="w-full bg-[--bg-primary] border border-[--border-subtle] rounded-lg px-3 py-2 text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#E50914]/30 resize-y font-mono"
                        />
                      </div>
                      <EmailPreview
                        subject={emailTemplates.invitationSubject}
                        body={emailTemplates.invitationBody}
                        branding={branding}
                      />
                    </div>

                    {/* Template Variables */}
                    <div className="pt-4 border-t border-[--border-subtle]">
                      <TemplateVariablesPanel />
                    </div>
                  </div>
                </ContentCard>
              </motion.div>
            </TabsContent>
          )}
        </AnimatePresence>
      </Tabs>
    </div>
  )
}
