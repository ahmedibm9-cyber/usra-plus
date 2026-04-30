'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { LanguageSelector } from './language-selector'
import { TermsModal } from './terms-modal'
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Rocket,
} from 'lucide-react'
import { toast } from 'sonner'

export function LoginForm() {
  const { setAuthView, setShowTermsModal, setUser, setIsAuthenticated } = useAuthStore()
  const appStore = useAppStore()
  const { t, isRTL } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = t.auth.requiredField
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        newErrors.email = t.auth.invalidEmail
      }
    }

    if (!password) {
      newErrors.password = t.auth.requiredField
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (supabaseError) {
        const message = supabaseError.message === 'Invalid login credentials'
          ? (isRTL ? 'بيانات الدخول غير صحيحة' : 'Invalid login credentials')
          : supabaseError.message
        toast.error(message)
        return
      }

      if (data.user) {
        toast.success(t.auth.loginSuccess)
      }
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)

    try {
      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (supabaseError) {
        toast.error(supabaseError.message)
      }
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto glass-strong rounded-3xl p-8 relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Language selector */}
        <motion.div
          className="flex justify-end"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
        >
          <LanguageSelector />
        </motion.div>

        {/* Header */}
        <motion.div
          className="space-y-2 text-center mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse-glow">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-sm" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
            {t.app.name}
          </h1>
          <p className="text-[--text-muted] text-sm">
            {t.app.tagline}
          </p>
        </motion.div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Email */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Label htmlFor="login-email" className="text-[--text-secondary] text-sm font-medium">
              {t.auth.email}
            </Label>
            <div className="auth-input-wrapper">
              <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                id="login-email"
                type="email"
                placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                }}
                className={`h-11 bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.email ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {errors.email}
              </p>
            )}
          </motion.div>

          {/* Password */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-[--text-secondary] text-sm font-medium">
                {t.auth.password}
              </Label>
              <button
                type="button"
                onClick={() => setAuthView('forgot-password')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
              >
                {t.auth.forgotPassword}
              </button>
            </div>
            <div className="auth-input-wrapper">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                }}
                className={`h-11 bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.password ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-secondary] transition-colors z-10 ${isRTL ? 'left-3' : 'right-3'}`}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {errors.password}
              </p>
            )}
          </motion.div>

          {/* Login Button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl h-11 font-medium transition-all duration-200 disabled:opacity-50 shadow-lg shadow-indigo-500/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-indigo-500/30 btn-ripple"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t.auth.login
              )}
            </Button>
          </motion.div>
        </form>

        {/* Divider */}
        <motion.div
          className="relative mt-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Separator className="bg-[--border-subtle]" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[--bg-surface]/80 backdrop-blur-sm px-3 text-xs text-[--text-muted]">
            {t.auth.orContinueWith}
          </span>
        </motion.div>

        {/* Google OAuth */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] hover:border-[--border-medium] hover:scale-[1.01] rounded-2xl h-11 font-medium transition-all duration-200"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {t.auth.googleLogin}
          </Button>
        </motion.div>

        {/* Terms */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <p className="text-center text-xs text-[--text-muted] leading-relaxed">
            {t.auth.termsAgreement}{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors duration-200"
            >
              {t.auth.termsOfService}
            </button>{' '}
            {t.auth.and}{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors duration-200"
            >
              {t.auth.privacyPolicy}
            </button>
          </p>
        </motion.div>

        {/* Demo Mode */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="relative">
            <Separator className="bg-[--border-subtle]" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[--bg-surface]/80 backdrop-blur-sm px-3 text-xs text-[--text-muted]">
              {isRTL ? 'أو' : 'or'}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              const demoUser = {
                id: 'demo-user-001',
                email: 'demo@usraplus.app',
                first_name: isRTL ? 'أحمد' : 'Ahmed',
                last_name: isRTL ? 'العائلي' : 'AlFamily',
                phone: '+966501234567',
                country_code: '+966',
                avatar_url: null,
                language: isRTL ? 'ar' as const : 'en' as const,
                theme: 'dark' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              setUser(demoUser)
              setIsAuthenticated(true)
              // Set demo family
              const demoFamily = {
                id: 'demo-family-001',
                name: isRTL ? 'عائلة الأحمد' : 'The Ahmed Family',
                description: isRTL ? 'عائلتنا الرائعة' : 'Our wonderful family',
                invite_code: 'DEMO2025',
                avatar_url: null,
                created_by: 'demo-user-001',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              appStore.setCurrentFamily(demoFamily)
              appStore.setFamilies([demoFamily])
              appStore.setFamilyMembers([
                { id: 'fm-1', family_id: 'demo-family-001', user_id: 'demo-user-001', role: 'owner' as const, nickname: null, joined_at: new Date().toISOString(), profiles: demoUser },
                { id: 'fm-2', family_id: 'demo-family-001', user_id: 'demo-user-002', role: 'member' as const, nickname: isRTL ? 'نورة' : 'Noura', joined_at: new Date().toISOString(), profiles: { id: 'demo-user-002', email: 'noura@usraplus.app', first_name: isRTL ? 'نورة' : 'Noura', last_name: isRTL ? 'الأحمد' : 'AlAhmed', phone: null, country_code: '+966', avatar_url: null, language: 'en' as const, theme: 'dark' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } },
                { id: 'fm-3', family_id: 'demo-family-001', user_id: 'demo-user-003', role: 'admin' as const, nickname: isRTL ? 'خالد' : 'Khalid', joined_at: new Date().toISOString(), profiles: { id: 'demo-user-003', email: 'khalid@usraplus.app', first_name: isRTL ? 'خالد' : 'Khalid', last_name: isRTL ? 'الأحمد' : 'AlAhmed', phone: null, country_code: '+966', avatar_url: null, language: 'en' as const, theme: 'dark' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } },
              ])

              // Seed demo tasks into task store
              const { useTaskStore } = await import('@/stores/task-store')
              useTaskStore.getState().setTasks([
                { id: 'task-1', family_id: 'demo-family-001', title: isRTL ? 'شراء الهدايا لعيد الفطر' : 'Buy Eid gifts', description: isRTL ? 'شراء هدايا لأفراد العائلة' : 'Gifts for family members', status: 'todo', priority: 'high', assigned_to: 'demo-user-002', created_by: 'demo-user-001', due_date: new Date(Date.now() + 3*86400000).toISOString(), completed_at: null, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
                { id: 'task-2', family_id: 'demo-family-001', title: isRTL ? 'تنظيف المنزل' : 'Clean the house', description: null, status: 'in_progress', priority: 'medium', assigned_to: 'demo-user-001', created_by: 'demo-user-001', due_date: new Date(Date.now() + 86400000).toISOString(), completed_at: null, created_at: new Date(Date.now() - 2*86400000).toISOString(), updated_at: new Date().toISOString() },
                { id: 'task-3', family_id: 'demo-family-001', title: isRTL ? 'حجز طاولة العشاء' : 'Book dinner table', description: isRTL ? 'في المطعم الإيطالي' : 'At the Italian restaurant', status: 'done', priority: 'low', assigned_to: 'demo-user-003', created_by: 'demo-user-003', due_date: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 5*86400000).toISOString(), updated_at: new Date().toISOString() },
                { id: 'task-4', family_id: 'demo-family-001', title: isRTL ? 'تحضير واجبات المدرسة' : 'Help with homework', description: null, status: 'todo', priority: 'urgent', assigned_to: 'demo-user-001', created_by: 'demo-user-002', due_date: new Date().toISOString(), completed_at: null, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
                { id: 'task-5', family_id: 'demo-family-001', title: isRTL ? 'شراء مستلزمات المطبخ' : 'Buy kitchen supplies', description: null, status: 'todo', priority: 'medium', assigned_to: null, created_by: 'demo-user-001', due_date: new Date(Date.now() + 7*86400000).toISOString(), completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              ])

              // Seed demo grocery items
              const { useGroceryStore } = await import('@/stores/grocery-store')
              useGroceryStore.getState().setItems([
                { id: 'grocery-1', family_id: 'demo-family-001', name: isRTL ? 'حليب طازج' : 'Fresh Milk', category: 'dairy', quantity: 2, checked: true, added_by: 'demo-user-001', created_at: new Date(Date.now() - 2*86400000).toISOString(), updated_at: new Date().toISOString() },
                { id: 'grocery-2', family_id: 'demo-family-001', name: isRTL ? 'خبز تمر' : 'Date Bread', category: 'bakery', quantity: 1, checked: false, added_by: 'demo-user-002', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
                { id: 'grocery-3', family_id: 'demo-family-001', name: isRTL ? 'تمر المدينة' : 'Medina Dates', category: 'fruits', quantity: 3, checked: true, added_by: 'demo-user-003', created_at: new Date(Date.now() - 3*86400000).toISOString(), updated_at: new Date().toISOString() },
                { id: 'grocery-4', family_id: 'demo-family-001', name: isRTL ? 'أرز بسمتي' : 'Basmati Rice', category: 'other', quantity: 2, checked: false, added_by: 'demo-user-001', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: 'grocery-5', family_id: 'demo-family-001', name: isRTL ? 'دجاج طازج' : 'Fresh Chicken', category: 'meat', quantity: 1, checked: false, added_by: 'demo-user-002', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                { id: 'grocery-6', family_id: 'demo-family-001', name: isRTL ? 'عصير برتقال' : 'Orange Juice', category: 'beverages', quantity: 2, checked: true, added_by: 'demo-user-003', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
              ])

              // Seed demo notifications
              const { useNotificationStore } = await import('@/stores/notification-store')
              useNotificationStore.getState().setNotifications([
                { id: 'notif-1', user_id: 'demo-user-001', family_id: 'demo-family-001', title: isRTL ? 'مهمة جديدة' : 'New Task Assigned', message: isRTL ? 'تم تعيين مهمة "شراء الهدايا" لك' : 'You were assigned "Buy Eid gifts"', type: 'task', read: false, action_url: null, created_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 'notif-2', user_id: 'demo-user-001', family_id: 'demo-family-001', title: isRTL ? 'انضمام عضو جديد' : 'New Member Joined', message: isRTL ? 'انضم خالد إلى العائلة' : 'Khalid joined the family', type: 'family', read: false, action_url: null, created_at: new Date(Date.now() - 7200000).toISOString() },
                { id: 'notif-3', user_id: 'demo-user-001', family_id: 'demo-family-001', title: isRTL ? 'تذكير بالبقالة' : 'Grocery Reminder', message: isRTL ? '5 عناصر لم يتم شراؤها بعد' : '5 items still unchecked', type: 'grocery', read: true, action_url: null, created_at: new Date(Date.now() - 86400000).toISOString() },
              ])

              // Seed demo presence - mark current user and some family members as online
              const { usePresenceStore } = await import('@/stores/presence-store')
              const presenceStore = usePresenceStore.getState()
              presenceStore.setOnline('demo-user-001') // Ahmed (current user)
              presenceStore.setOnline('demo-user-002') // Noura
              presenceStore.setOnline('demo-user-003') // Khalid

              // Seed demo activity feed
              const { useActivityStore } = await import('@/stores/activity-store')
              const activityStore = useActivityStore.getState()
              const actNow = Date.now()
              const hour = 3600000
              const day = 86400000
              activityStore.setActivities([
                {
                  id: 'act-1',
                  type: 'message_sent',
                  actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null },
                  description: isRTL ? 'أرسل رسالة في المحادثة' : 'sent a message in the chat',
                  created_at: new Date(actNow - 2 * 60000).toISOString(),
                },
                {
                  id: 'act-2',
                  type: 'task_completed',
                  actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null },
                  description: isRTL ? 'أكمل مهمة "حجز طاولة العشاء"' : 'completed task "Book dinner table"',
                  created_at: new Date(actNow - 15 * 60000).toISOString(),
                },
                {
                  id: 'act-3',
                  type: 'grocery_added',
                  actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null },
                  description: isRTL ? 'أضاف "أرز بسمتي" إلى قائمة البقالة' : 'added "Basmati Rice" to grocery list',
                  created_at: new Date(actNow - 45 * 60000).toISOString(),
                },
                {
                  id: 'act-4',
                  type: 'event_created',
                  actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null },
                  description: isRTL ? 'أضاف حدث "عشاء العائلة"' : 'added event "Family Dinner"',
                  created_at: new Date(actNow - 2 * hour).toISOString(),
                },
                {
                  id: 'act-5',
                  type: 'task_created',
                  actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null },
                  description: isRTL ? 'أنشأ مهمة "تحضير واجبات المدرسة"' : 'created task "Help with homework"',
                  created_at: new Date(actNow - 4 * hour).toISOString(),
                },
                {
                  id: 'act-6',
                  type: 'grocery_checked',
                  actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null },
                  description: isRTL ? 'أزال "عصير برتقال" من القائمة' : 'checked off "Orange Juice"',
                  created_at: new Date(actNow - 6 * hour).toISOString(),
                },
                {
                  id: 'act-7',
                  type: 'member_joined',
                  actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null },
                  description: isRTL ? 'انضم إلى العائلة' : 'joined the family',
                  created_at: new Date(actNow - 12 * hour).toISOString(),
                },
                {
                  id: 'act-8',
                  type: 'task_created',
                  actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null },
                  description: isRTL ? 'أنشأ مهمة "شراء الهدايا لعيد الفطر"' : 'created task "Buy Eid gifts"',
                  created_at: new Date(actNow - day).toISOString(),
                },
                {
                  id: 'act-9',
                  type: 'message_sent',
                  actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null },
                  description: isRTL ? 'أرسل رسالة في المحادثة' : 'sent a message in the chat',
                  created_at: new Date(actNow - day - 3 * hour).toISOString(),
                },
                {
                  id: 'act-10',
                  type: 'grocery_added',
                  actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null },
                  description: isRTL ? 'أضاف "خبز تمر" إلى قائمة البقالة' : 'added "Date Bread" to grocery list',
                  created_at: new Date(actNow - 2 * day).toISOString(),
                },
              ])

              // Seed demo calendar events
              const calNow = new Date()
              const today = new Date(calNow.getFullYear(), calNow.getMonth(), calNow.getDate())
              const tomorrow = new Date(today.getTime() + 86400000)
              // Find next Saturday (day 6)
              const daysUntilSat = (6 - today.getDay() + 7) % 7 || 7
              const nextSat = new Date(today.getTime() + daysUntilSat * 86400000)
              // Find next Monday (day 1)
              const daysUntilMon = (1 - today.getDay() + 7) % 7 || 7
              const nextMon = new Date(today.getTime() + daysUntilMon * 86400000)

              const { useCalendarStore } = await import('@/stores/calendar-store')
              useCalendarStore.getState().setEvents([
                { id: 'event-1', family_id: 'demo-family-001', title: isRTL ? 'عشاء العائلة' : 'Family Dinner', description: isRTL ? 'في المنزل' : 'At home', start_time: new Date(today.getTime() + 19 * 3600000).toISOString(), end_time: new Date(today.getTime() + 21 * 3600000).toISOString(), all_day: false, color: '#6366F1', created_by: 'demo-user-001', created_at: calNow.toISOString(), updated_at: calNow.toISOString() },
                { id: 'event-2', family_id: 'demo-family-001', title: isRTL ? 'موعد الطبيب' : 'Doctor Appointment', description: isRTL ? 'فحص سنوي' : 'Annual checkup', start_time: new Date(tomorrow.getTime() + 10 * 3600000).toISOString(), end_time: new Date(tomorrow.getTime() + 11 * 3600000).toISOString(), all_day: false, color: '#22C55E', created_by: 'demo-user-002', created_at: calNow.toISOString(), updated_at: calNow.toISOString() },
                { id: 'event-3', family_id: 'demo-family-001', title: isRTL ? 'يوم عائلي' : 'Family Day Out', description: null, start_time: nextSat.toISOString(), end_time: null, all_day: true, color: '#F59E0B', created_by: 'demo-user-001', created_at: calNow.toISOString(), updated_at: calNow.toISOString() },
                { id: 'event-4', family_id: 'demo-family-001', title: isRTL ? 'اجتماع المدرسة' : 'School Meeting', description: null, start_time: new Date(nextMon.getTime() + 15 * 3600000).toISOString(), end_time: new Date(nextMon.getTime() + 16 * 3600000).toISOString(), all_day: false, color: '#A78BFA', created_by: 'demo-user-003', created_at: calNow.toISOString(), updated_at: calNow.toISOString() },
              ])

              // Seed demo files
              const { useFilesStore } = await import('@/stores/files-store')
              useFilesStore.getState().setFiles([
                { id: 'file-1', family_id: 'demo-family-001', name: isRTL ? 'خطة_العائلة.pdf' : 'Family_Plan.pdf', file_type: 'application/pdf', file_size: 1024000, storage_path: '', url: null, uploaded_by: 'demo-user-001', created_at: new Date(Date.now() - 3*86400000).toISOString(), uploader: undefined },
                { id: 'file-2', family_id: 'demo-family-001', name: isRTL ? 'قائمة_التسوق.jpg' : 'Shopping_List.jpg', file_type: 'image/jpeg', file_size: 512000, storage_path: '', url: null, uploaded_by: 'demo-user-002', created_at: new Date(Date.now() - 2*86400000).toISOString(), uploader: undefined },
                { id: 'file-3', family_id: 'demo-family-001', name: isRTL ? 'ميزانية_الشهر.xlsx' : 'Monthly_Budget.xlsx', file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', file_size: 256000, storage_path: '', url: null, uploaded_by: 'demo-user-003', created_at: new Date(Date.now() - 86400000).toISOString(), uploader: undefined },
              ])

              // Seed demo comments
              const { useCommentStore } = await import('@/stores/comment-store')
              useCommentStore.getState().setComments([
                // Comments on task-1 (Buy Eid gifts)
                { id: 'comment-1', task_id: 'task-1', parent_id: null, author_id: 'demo-user-001', author_name: isRTL ? 'أحمد' : 'Ahmed', author_avatar: null, content: isRTL ? 'يجب أن نبدأ بالتسوق قريبًا' : 'We should start shopping soon', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 'comment-2', task_id: 'task-1', parent_id: 'comment-1', author_id: 'demo-user-002', author_name: isRTL ? 'نورة' : 'Noura', author_avatar: null, content: isRTL ? 'أنا سأشتري الهدايا للأطفال' : "I'll get the gifts for the kids", created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date(Date.now() - 1800000).toISOString() },
                { id: 'comment-3', task_id: 'task-1', parent_id: null, author_id: 'demo-user-003', author_name: isRTL ? 'خالد' : 'Khalid', author_avatar: null, content: isRTL ? 'لا تنسوا بطاقات التهنئة!' : "Don't forget greeting cards!", created_at: new Date(Date.now() - 900000).toISOString(), updated_at: new Date(Date.now() - 900000).toISOString() },
                // Comments on task-4 (Help with homework)
                { id: 'comment-4', task_id: 'task-4', parent_id: null, author_id: 'demo-user-002', author_name: isRTL ? 'نورة' : 'Noura', author_avatar: null, content: isRTL ? 'الواجب في الرياضيات هذا الأسبوع' : 'Math homework this week', created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString() },
                { id: 'comment-5', task_id: 'task-4', parent_id: 'comment-4', author_id: 'demo-user-001', author_name: isRTL ? 'أحمد' : 'Ahmed', author_avatar: null, content: isRTL ? 'سأساعد بعد صلاة العصر' : "I'll help after Asr prayer", created_at: new Date(Date.now() - 5400000).toISOString(), updated_at: new Date(Date.now() - 5400000).toISOString() },
                // Comment on task-2 (Clean the house)
                { id: 'comment-6', task_id: 'task-2', parent_id: null, author_id: 'demo-user-003', author_name: isRTL ? 'خالد' : 'Khalid', author_avatar: null, content: isRTL ? 'سأنظف المطبخ والصالة' : "I'll clean the kitchen and living room", created_at: new Date(Date.now() - 10800000).toISOString(), updated_at: new Date(Date.now() - 10800000).toISOString() },
              ])

              // Seed demo chat messages with reactions
              const { useChatStore } = await import('@/stores/chat-store')
              useChatStore.getState().setMessages([
                {
                  id: 'chat-1',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'صباح الخير يا عائلة! 🌞' : 'Good morning family! 🌞',
                  sender_id: 'demo-user-001',
                  message_type: 'text',
                  reply_to: null,
                  created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
                  reactions: [
                    { emoji: '👍', users: ['demo-user-002', 'demo-user-001'] },
                    { emoji: '❤️', users: ['demo-user-003'] },
                  ],
                },
                {
                  id: 'chat-2',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'صباح النور أحمد! هل نحتاج لشراء شيء اليوم؟' : 'Good morning Ahmed! Do we need to buy anything today?',
                  sender_id: 'demo-user-002',
                  message_type: 'text',
                  reply_to: null,
                  created_at: new Date(Date.now() - 3.9 * 3600000).toISOString(),
                  reactions: [],
                },
                {
                  id: 'chat-3',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'نعم، نحتاج حليب وخبز من المتجر' : 'Yes, we need milk and bread from the store',
                  sender_id: 'demo-user-001',
                  message_type: 'text',
                  reply_to: null,
                  created_at: new Date(Date.now() - 3.8 * 3600000).toISOString(),
                  reactions: [
                    { emoji: '👍', users: ['demo-user-002'] },
                  ],
                },
                {
                  id: 'chat-4',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'سأمر بالمتجر بعد صلاة الظهر إن شاء الله' : "I'll pass by the store after Dhuhr prayer insha'Allah",
                  sender_id: 'demo-user-003',
                  message_type: 'text',
                  reply_to: null,
                  created_at: new Date(Date.now() - 3.5 * 3600000).toISOString(),
                  reactions: [
                    { emoji: '❤️', users: ['demo-user-001'] },
                  ],
                },
                {
                  id: 'chat-5',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'شكرًا خالد! 👏' : 'Thanks Khalid! 👏',
                  sender_id: 'demo-user-002',
                  message_type: 'text',
                  reply_to: null,
                  created_at: new Date(Date.now() - 3.4 * 3600000).toISOString(),
                  reactions: [
                    { emoji: '🎉', users: ['demo-user-001', 'demo-user-003'] },
                  ],
                },
                {
                  id: 'chat-6',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'لا تنسوا عشاء العائلة اليوم الساعة ٧ 🍽️' : "Don't forget family dinner tonight at 7! 🍽️",
                  sender_id: 'demo-user-001',
                  message_type: 'text',
                  reply_to: null,
                  created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
                  reactions: [
                    { emoji: '❤️', users: ['demo-user-002', 'demo-user-003'] },
                  ],
                },
                {
                  id: 'chat-7',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'صورة من نزهتنا الأسبوع الماضي 🏞️' : 'From our outing last week 🏞️',
                  sender_id: 'demo-user-001',
                  message_type: 'image' as const,
                  file_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
                  file_name: 'family-outing.jpg',
                  file_size: 245760,
                  thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=60',
                  reply_to: null,
                  created_at: new Date(Date.now() - 1.8 * 3600000).toISOString(),
                  reactions: [
                    { emoji: '❤️', users: ['demo-user-002', 'demo-user-003'] },
                    { emoji: '🎉', users: ['demo-user-002'] },
                  ],
                },
                {
                  id: 'chat-8',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'مستعدة! 😄' : "I'm ready! 😄",
                  sender_id: 'demo-user-002',
                  message_type: 'text',
                  reply_to: null,
                  created_at: new Date(Date.now() - 1.5 * 3600000).toISOString(),
                  reactions: [],
                },
                {
                  id: 'chat-9',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'وصفة الكبسة التي تحبوها! 🍚' : 'The kabsa recipe you all love! 🍚',
                  sender_id: 'demo-user-002',
                  message_type: 'image' as const,
                  file_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
                  file_name: 'kabsa-recipe.jpg',
                  file_size: 189440,
                  thumbnail_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=60',
                  reply_to: null,
                  created_at: new Date(Date.now() - 1.2 * 3600000).toISOString(),
                  reactions: [
                    { emoji: '❤️', users: ['demo-user-001', 'demo-user-003'] },
                    { emoji: '🙏', users: ['demo-user-003'] },
                  ],
                },
                {
                  id: 'chat-10',
                  family_id: 'demo-family-001',
                  content: isRTL ? 'أنا أيضًا! هل نحتاج أن أحضر شيئًا؟' : 'Me too! Should I bring anything?',
                  sender_id: 'demo-user-003',
                  message_type: 'text',
                  reply_to: null,
                  created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
                  reactions: [
                    { emoji: '🙏', users: ['demo-user-001'] },
                  ],
                },
              ])

              toast.success(isRTL ? 'مرحبًا بك في النسخة التجريبية!' : 'Welcome to the demo!')
            }}
            className="w-full border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200 hover:border-violet-500/40 rounded-2xl h-11 font-medium transition-all duration-200 gap-2 demo-btn-pulse mt-3"
          >
            <Rocket className="w-4 h-4" />
            {isRTL ? 'جرّب النسخة التجريبية' : 'Try Demo Mode'}
          </Button>
        </motion.div>

        {/* Sign up link */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <p className="text-sm text-[--text-muted]">
            {t.auth.noAccount}{' '}
            <button
              type="button"
              onClick={() => setAuthView('signup')}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200"
            >
              {t.auth.signUpInstead}
            </button>
          </p>
        </motion.div>
      </div>

      <TermsModal />
    </>
  )
}
