/**
 * Demo Data Seeding Utility
 *
 * Seeds all Zustand stores with realistic Saudi/Arabic demo data
 * when the app runs in demo mode (no Supabase configured).
 *
 * Strategy: Import all stores eagerly at module load time,
 * then set all data in one synchronous batch inside a single
 * React state update cycle (via zustand's built-in batching).
 */

import { useTaskStore } from '@/stores/task-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useNotificationStore } from '@/stores/notification-store'
import { usePresenceStore } from '@/stores/presence-store'
import { useActivityStore } from '@/stores/activity-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { useFilesStore } from '@/stores/files-store'
import { useCommentStore } from '@/stores/comment-store'
import { useChoreStore } from '@/stores/chore-store'
import { useBudgetStore } from '@/stores/budget-store'
import { useChatStore } from '@/stores/chat-store'
import { useMealStore } from '@/stores/meal-store'
import { useMilestoneStore } from '@/stores/milestone-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'

// ─── Time Helpers ─────────────────────────────────────────────────────

const HOUR = 3600000
const DAY = 86400000
const now = Date.now
const isoNow = () => new Date(now()).toISOString()
const isoAt = (ms: number) => new Date(ms).toISOString()
const isoDaysAgo = (d: number) => new Date(now() - d * DAY).toISOString()
const isoDaysFromNow = (d: number) => new Date(now() + d * DAY).toISOString()
const isoHoursAgo = (h: number) => new Date(now() - h * HOUR).toISOString()
const isoMinutesAgo = (m: number) => new Date(now() - m * 60000).toISOString()
const todayDate = () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

// ─── Seeding guard ──────────────────────────────────────────────────

let hasSeeded = false

// ─── Seed function ────────────────────────────────────────────────────

export function seedDemoData() {
  // Prevent double-seeding (e.g., when useEffect re-runs due to user ID change)
  if (hasSeeded) return
  hasSeeded = true

  const isRTL = useI18n.getState().language === 'ar'

  // 1. Auth + family (synchronous — triggers the shell render)
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
    created_at: isoNow(),
    updated_at: isoNow(),
  }

  const nouraProfile = {
    id: 'demo-user-002',
    email: 'noura@usraplus.app',
    first_name: isRTL ? 'نورة' : 'Noura',
    last_name: isRTL ? 'الأحمد' : 'AlAhmed',
    phone: null,
    country_code: '+966',
    avatar_url: null,
    language: 'en' as const,
    theme: 'dark' as const,
    created_at: isoNow(),
    updated_at: isoNow(),
  }

  const khalidProfile = {
    id: 'demo-user-003',
    email: 'khalid@usraplus.app',
    first_name: isRTL ? 'خالد' : 'Khalid',
    last_name: isRTL ? 'الأحمد' : 'AlAhmed',
    phone: null,
    country_code: '+966',
    avatar_url: null,
    language: 'en' as const,
    theme: 'dark' as const,
    created_at: isoNow(),
    updated_at: isoNow(),
  }

  const demoFamily = {
    id: 'demo-family-001',
    name: isRTL ? 'عائلة الأحمد' : 'The Ahmed Family',
    description: isRTL ? 'عائلتنا الرائعة' : 'Our wonderful family',
    invite_code: 'DEMO2025',
    avatar_url: null,
    created_by: 'demo-user-001',
    created_at: isoNow(),
    updated_at: isoNow(),
  }

  // Set auth + family first so the app renders the shell
  useAuthStore.getState().setUser(demoUser)
  useAuthStore.getState().setIsAuthenticated(true)
  useAppStore.getState().setCurrentFamily(demoFamily)
  useAppStore.getState().setFamilies([demoFamily])
  useAppStore.getState().setFamilyMembers([
    { id: 'fm-1', family_id: 'demo-family-001', user_id: 'demo-user-001', role: 'owner' as const, nickname: null, joined_at: isoNow(), profiles: demoUser },
    { id: 'fm-2', family_id: 'demo-family-001', user_id: 'demo-user-002', role: 'member' as const, nickname: isRTL ? 'نورة' : 'Noura', joined_at: isoNow(), profiles: nouraProfile },
    { id: 'fm-3', family_id: 'demo-family-001', user_id: 'demo-user-003', role: 'admin' as const, nickname: isRTL ? 'خالد' : 'Khalid', joined_at: isoNow(), profiles: khalidProfile },
  ])

  // 2. Seed all data stores in a single synchronous batch
  //    Since each store.set() is synchronous and zustand batches
  //    updates within the same microtask, React will only re-render
  //    once after all stores are populated.

  // ─── Tasks (10 demo tasks) ─────────────────────────────────────────
  useTaskStore.getState().setTasks([
    { id: 'task-1', family_id: 'demo-family-001', title: isRTL ? 'شراء الهدايا لعيد الفطر' : 'Buy Eid gifts', description: isRTL ? 'شراء هدايا لأفراد العائلة' : 'Gifts for family members', status: 'todo', priority: 'high', assigned_to: 'demo-user-002', created_by: 'demo-user-001', due_date: isoDaysFromNow(3), completed_at: null, created_at: isoDaysAgo(1), updated_at: isoNow() },
    { id: 'task-2', family_id: 'demo-family-001', title: isRTL ? 'تنظيف المنزل' : 'Clean the house', description: null, status: 'in_progress', priority: 'medium', assigned_to: 'demo-user-001', created_by: 'demo-user-001', due_date: isoDaysFromNow(1), completed_at: null, created_at: isoDaysAgo(2), updated_at: isoNow() },
    { id: 'task-3', family_id: 'demo-family-001', title: isRTL ? 'حجز طاولة العشاء' : 'Book dinner table', description: isRTL ? 'في المطعم الإيطالي' : 'At the Italian restaurant', status: 'done', priority: 'low', assigned_to: 'demo-user-003', created_by: 'demo-user-003', due_date: isoDaysAgo(1), completed_at: isoDaysAgo(1), created_at: isoDaysAgo(5), updated_at: isoNow() },
    { id: 'task-4', family_id: 'demo-family-001', title: isRTL ? 'تحضير واجبات المدرسة' : 'Help with homework', description: null, status: 'todo', priority: 'urgent', assigned_to: 'demo-user-001', created_by: 'demo-user-002', due_date: isoNow(), completed_at: null, created_at: isoDaysAgo(1), updated_at: isoNow() },
    { id: 'task-5', family_id: 'demo-family-001', title: isRTL ? 'شراء مستلزمات المطبخ' : 'Buy kitchen supplies', description: null, status: 'todo', priority: 'medium', assigned_to: null, created_by: 'demo-user-001', due_date: isoDaysFromNow(7), completed_at: null, created_at: isoNow(), updated_at: isoNow() },
    { id: 'task-6', family_id: 'demo-family-001', title: isRTL ? 'صيانة السيارة' : 'Car maintenance', description: isRTL ? 'تغيير الزيت وفحص الإطارات' : 'Oil change and tire check', status: 'todo', priority: 'high', assigned_to: 'demo-user-003', created_by: 'demo-user-001', due_date: isoDaysFromNow(2), completed_at: null, created_at: isoDaysAgo(3), updated_at: isoNow() },
    { id: 'task-7', family_id: 'demo-family-001', title: isRTL ? 'تحضير وجبات الأسبوع' : 'Meal prep for the week', description: isRTL ? 'تحضير وجبات الفطور والغداء' : 'Prepare breakfast and lunch meals', status: 'done', priority: 'medium', assigned_to: 'demo-user-002', created_by: 'demo-user-002', due_date: isoDaysAgo(2), completed_at: isoDaysAgo(2), created_at: isoDaysAgo(4), updated_at: isoNow() },
    { id: 'task-8', family_id: 'demo-family-001', title: isRTL ? 'دفع فاتورة الكهرباء' : 'Pay electricity bill', description: null, status: 'in_progress', priority: 'urgent', assigned_to: 'demo-user-001', created_by: 'demo-user-001', due_date: isoNow(), completed_at: null, created_at: isoDaysAgo(1), updated_at: isoNow() },
    { id: 'task-9', family_id: 'demo-family-001', title: isRTL ? 'ترتيب غرفة الضيوف' : 'Organize guest room', description: isRTL ? 'لزيارة العائلة القادمة' : 'For upcoming family visit', status: 'todo', priority: 'low', assigned_to: 'demo-user-002', created_by: 'demo-user-003', due_date: isoDaysFromNow(5), completed_at: null, created_at: isoNow(), updated_at: isoNow() },
    { id: 'task-10', family_id: 'demo-family-001', title: isRTL ? 'حجز تذاكر السفر' : 'Book travel tickets', description: isRTL ? 'رحلة إلى جدة في الإجازة' : 'Trip to Jeddah for the holiday', status: 'done', priority: 'high', assigned_to: 'demo-user-001', created_by: 'demo-user-001', due_date: isoDaysAgo(3), completed_at: isoDaysAgo(3), created_at: isoDaysAgo(7), updated_at: isoNow() },
  ])

  // ─── Grocery (12 demo items) ───────────────────────────────────────
  useGroceryStore.getState().setItems([
    { id: 'grocery-1', family_id: 'demo-family-001', name: isRTL ? 'حليب طازج' : 'Fresh Milk', category: 'dairy', quantity: 2, checked: true, added_by: 'demo-user-001', created_at: isoDaysAgo(2), updated_at: isoNow() },
    { id: 'grocery-2', family_id: 'demo-family-001', name: isRTL ? 'خبز تمر' : 'Date Bread', category: 'bakery', quantity: 1, checked: false, added_by: 'demo-user-002', created_at: isoDaysAgo(1), updated_at: isoNow() },
    { id: 'grocery-3', family_id: 'demo-family-001', name: isRTL ? 'تمر المدينة' : 'Medina Dates', category: 'fruits', quantity: 3, checked: true, added_by: 'demo-user-003', created_at: isoDaysAgo(3), updated_at: isoNow() },
    { id: 'grocery-4', family_id: 'demo-family-001', name: isRTL ? 'أرز بسمتي' : 'Basmati Rice', category: 'other', quantity: 2, checked: false, added_by: 'demo-user-001', created_at: isoNow(), updated_at: isoNow() },
    { id: 'grocery-5', family_id: 'demo-family-001', name: isRTL ? 'دجاج طازج' : 'Fresh Chicken', category: 'meat', quantity: 1, checked: false, added_by: 'demo-user-002', created_at: isoNow(), updated_at: isoNow() },
    { id: 'grocery-6', family_id: 'demo-family-001', name: isRTL ? 'عصير برتقال' : 'Orange Juice', category: 'beverages', quantity: 2, checked: true, added_by: 'demo-user-003', created_at: isoDaysAgo(1), updated_at: isoNow() },
    { id: 'grocery-7', family_id: 'demo-family-001', name: isRTL ? 'جبنة كريمية' : 'Cream Cheese', category: 'dairy', quantity: 1, checked: false, added_by: 'demo-user-002', created_at: isoNow(), updated_at: isoNow() },
    { id: 'grocery-8', family_id: 'demo-family-001', name: isRTL ? 'طماطم طازجة' : 'Fresh Tomatoes', category: 'fruits', quantity: 4, checked: false, added_by: 'demo-user-001', created_at: isoNow(), updated_at: isoNow() },
    { id: 'grocery-9', family_id: 'demo-family-001', name: isRTL ? 'زيت زيتون' : 'Olive Oil', category: 'other', quantity: 1, checked: true, added_by: 'demo-user-003', created_at: isoDaysAgo(4), updated_at: isoNow() },
    { id: 'grocery-10', family_id: 'demo-family-001', name: isRTL ? 'خيار' : 'Cucumbers', category: 'fruits', quantity: 3, checked: false, added_by: 'demo-user-001', created_at: isoNow(), updated_at: isoNow() },
    { id: 'grocery-11', family_id: 'demo-family-001', name: isRTL ? 'لبن رايب' : 'Labneh', category: 'dairy', quantity: 2, checked: false, added_by: 'demo-user-002', created_at: isoNow(), updated_at: isoNow() },
    { id: 'grocery-12', family_id: 'demo-family-001', name: isRTL ? 'لحم مفروم' : 'Minced Meat', category: 'meat', quantity: 1, checked: false, added_by: 'demo-user-003', created_at: isoNow(), updated_at: isoNow() },
  ])

  // ─── Notifications ─────────────────────────────────────────────────
  useNotificationStore.getState().setNotifications([
    { id: 'notif-1', user_id: 'demo-user-001', family_id: 'demo-family-001', title: isRTL ? 'مهمة جديدة' : 'New Task Assigned', message: isRTL ? 'تم تعيين مهمة "شراء الهدايا" لك' : 'You were assigned "Buy Eid gifts"', type: 'task', read: false, action_url: null, created_at: isoHoursAgo(1) },
    { id: 'notif-2', user_id: 'demo-user-001', family_id: 'demo-family-001', title: isRTL ? 'انضمام عضو جديد' : 'New Member Joined', message: isRTL ? 'انضم خالد إلى العائلة' : 'Khalid joined the family', type: 'family', read: false, action_url: null, created_at: isoHoursAgo(2) },
    { id: 'notif-3', user_id: 'demo-user-001', family_id: 'demo-family-001', title: isRTL ? 'تذكير بالبقالة' : 'Grocery Reminder', message: isRTL ? '8 عناصر لم يتم شراؤها بعد' : '8 items still unchecked', type: 'grocery', read: true, action_url: null, created_at: isoDaysAgo(1) },
  ])

  // ─── Presence ──────────────────────────────────────────────────────
  const presence = usePresenceStore.getState()
  presence.setOnline('demo-user-001')
  presence.setOnline('demo-user-002')
  presence.setOnline('demo-user-003')

  // ─── Activity Feed ─────────────────────────────────────────────────
  const actNow = now()
  useActivityStore.getState().setActivities([
    { id: 'act-1', type: 'message_sent', actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null }, description: isRTL ? 'أرسل رسالة في المحادثة' : 'sent a message in the chat', created_at: isoAt(actNow - 2 * 60000) },
    { id: 'act-2', type: 'task_completed', actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null }, description: isRTL ? 'أكمل مهمة "حجز طاولة العشاء"' : 'completed task "Book dinner table"', created_at: isoAt(actNow - 15 * 60000) },
    { id: 'act-3', type: 'grocery_added', actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null }, description: isRTL ? 'أضاف "أرز بسمتي" إلى قائمة البقالة' : 'added "Basmati Rice" to grocery list', created_at: isoAt(actNow - 45 * 60000) },
    { id: 'act-4', type: 'event_created', actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null }, description: isRTL ? 'أضاف حدث "عشاء العائلة"' : 'added event "Family Dinner"', created_at: isoAt(actNow - 2 * HOUR) },
    { id: 'act-5', type: 'task_created', actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null }, description: isRTL ? 'أنشأ مهمة "تحضير واجبات المدرسة"' : 'created task "Help with homework"', created_at: isoAt(actNow - 4 * HOUR) },
    { id: 'act-6', type: 'grocery_checked', actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null }, description: isRTL ? 'أزال "عصير برتقال" من القائمة' : 'checked off "Orange Juice"', created_at: isoAt(actNow - 6 * HOUR) },
    { id: 'act-7', type: 'member_joined', actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null }, description: isRTL ? 'انضم إلى العائلة' : 'joined the family', created_at: isoAt(actNow - 12 * HOUR) },
    { id: 'act-8', type: 'task_created', actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null }, description: isRTL ? 'أنشأ مهمة "شراء الهدايا لعيد الفطر"' : 'created task "Buy Eid gifts"', created_at: isoAt(actNow - DAY) },
    { id: 'act-9', type: 'message_sent', actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null }, description: isRTL ? 'أرسل رسالة في المحادثة' : 'sent a message in the chat', created_at: isoAt(actNow - DAY - 3 * HOUR) },
    { id: 'act-10', type: 'grocery_added', actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null }, description: isRTL ? 'أضاف "خبز تمر" إلى قائمة البقالة' : 'added "Date Bread" to grocery list', created_at: isoAt(actNow - 2 * DAY) },
  ])

  // ─── Timeline Items ────────────────────────────────────────────────
  const tlNow = now()
  useActivityStore.getState().setTimelineItems([
    { id: 'tl-1', type: 'task_completed', actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null }, title: isRTL ? 'تنظيف المنزل' : 'Clean the house', description: isRTL ? 'أكمل مهمة' : 'completed a task', created_at: isoAt(tlNow - 5 * 60000) },
    { id: 'tl-2', type: 'event_added', actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null }, title: isRTL ? 'موعد الطبيب' : 'Doctor Appointment', description: isRTL ? 'أضاف حدثًا' : 'added an event', created_at: isoAt(tlNow - HOUR) },
    { id: 'tl-3', type: 'grocery_checked', actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null }, title: isRTL ? 'حليب طازج' : 'Fresh Milk', description: isRTL ? 'ألغى عنصرًا' : 'checked off an item', created_at: isoAt(tlNow - 2 * HOUR) },
    { id: 'tl-4', type: 'message_sent', actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null }, title: isRTL ? 'في المحادثة' : 'In family chat', description: isRTL ? 'أرسل رسالة' : 'sent a message', created_at: isoAt(tlNow - 3 * HOUR) },
    { id: 'tl-5', type: 'task_completed', actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null }, title: isRTL ? 'تحضير واجبات المدرسة' : 'Help with homework', description: isRTL ? 'أكمل مهمة' : 'completed a task', created_at: isoAt(tlNow - DAY - 2 * HOUR) },
    { id: 'tl-6', type: 'task_created', actor: { id: 'demo-user-001', name: isRTL ? 'أحمد' : 'Ahmed', avatar_url: null }, title: isRTL ? 'شراء الهدايا لعيد الفطر' : 'Buy Eid gifts', description: isRTL ? 'أنشأ مهمة' : 'created a task', created_at: isoAt(tlNow - DAY - 5 * HOUR) },
    { id: 'tl-7', type: 'member_joined', actor: { id: 'demo-user-003', name: isRTL ? 'خالد' : 'Khalid', avatar_url: null }, title: '', description: isRTL ? 'انضم إلى العائلة' : 'joined the family', created_at: isoAt(tlNow - 2 * DAY) },
    { id: 'tl-8', type: 'grocery_checked', actor: { id: 'demo-user-002', name: isRTL ? 'نورة' : 'Noura', avatar_url: null }, title: isRTL ? 'خبز تمر' : 'Date Bread', description: isRTL ? 'ألغى عنصرًا' : 'checked off an item', created_at: isoAt(tlNow - 3 * DAY) },
  ])

  // ─── Calendar Events (using teal/emerald brand palette) ────────────
  const calToday = todayDate()
  const calTomorrow = new Date(calToday.getTime() + DAY)
  const daysUntilSat = (6 - calToday.getDay() + 7) % 7 || 7
  const nextSat = new Date(calToday.getTime() + daysUntilSat * DAY)
  const daysUntilMon = (1 - calToday.getDay() + 7) % 7 || 7
  const nextMon = new Date(calToday.getTime() + daysUntilMon * DAY)
  const calNow = isoNow()

  useCalendarStore.getState().setEvents([
    { id: 'event-1', family_id: 'demo-family-001', title: isRTL ? 'عشاء العائلة' : 'Family Dinner', description: isRTL ? 'في المنزل' : 'At home', start_time: new Date(calToday.getTime() + 19 * HOUR).toISOString(), end_time: new Date(calToday.getTime() + 21 * HOUR).toISOString(), all_day: false, color: '#0D9488', created_by: 'demo-user-001', created_at: calNow, updated_at: calNow },
    { id: 'event-2', family_id: 'demo-family-001', title: isRTL ? 'موعد الطبيب' : 'Doctor Appointment', description: isRTL ? 'فحص سنوي' : 'Annual checkup', start_time: new Date(calTomorrow.getTime() + 10 * HOUR).toISOString(), end_time: new Date(calTomorrow.getTime() + 11 * HOUR).toISOString(), all_day: false, color: '#10B981', created_by: 'demo-user-002', created_at: calNow, updated_at: calNow },
    { id: 'event-3', family_id: 'demo-family-001', title: isRTL ? 'يوم عائلي' : 'Family Day Out', description: null, start_time: nextSat.toISOString(), end_time: null, all_day: true, color: '#059669', created_by: 'demo-user-001', created_at: calNow, updated_at: calNow },
    { id: 'event-4', family_id: 'demo-family-001', title: isRTL ? 'اجتماع المدرسة' : 'School Meeting', description: null, start_time: new Date(nextMon.getTime() + 15 * HOUR).toISOString(), end_time: new Date(nextMon.getTime() + 16 * HOUR).toISOString(), all_day: false, color: '#0D9488', created_by: 'demo-user-003', created_at: calNow, updated_at: calNow },
  ])

  // ─── Files ─────────────────────────────────────────────────────────
  useFilesStore.getState().setFiles([
    { id: 'file-1', family_id: 'demo-family-001', name: isRTL ? 'خطة_العائلة.pdf' : 'Family_Plan.pdf', file_type: 'application/pdf', file_size: 1024000, storage_path: '', url: null, uploaded_by: 'demo-user-001', created_at: isoDaysAgo(3), uploader: undefined },
    { id: 'file-2', family_id: 'demo-family-001', name: isRTL ? 'قائمة_التسوق.jpg' : 'Shopping_List.jpg', file_type: 'image/jpeg', file_size: 512000, storage_path: '', url: null, uploaded_by: 'demo-user-002', created_at: isoDaysAgo(2), uploader: undefined },
    { id: 'file-3', family_id: 'demo-family-001', name: isRTL ? 'ميزانية_الشهر.xlsx' : 'Monthly_Budget.xlsx', file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', file_size: 256000, storage_path: '', url: null, uploaded_by: 'demo-user-003', created_at: isoDaysAgo(1), uploader: undefined },
  ])

  // ─── Chores + Logs ────────────────────────────────────────────────
  useChoreStore.getState().setChores([
    { id: 'chore-1', title: isRTL ? 'غسل الأطباق' : 'Wash Dishes', description: isRTL ? 'غسل وتجفيف الأطباق يوميًا' : 'Wash and dry dishes daily', icon: '🧽', frequency: 'daily', assignedTo: ['demo-user-001', 'demo-user-002', 'demo-user-003'], rotationOrder: ['demo-user-001', 'demo-user-002', 'demo-user-003'], currentAssigneeIndex: 0, lastRotatedAt: isoHoursAgo(4), difficulty: 'easy', estimatedMinutes: 20, isPaused: false, createdAt: isoDaysAgo(7) },
    { id: 'chore-2', title: isRTL ? 'ترتيب الأسرّة' : 'Make Beds', description: isRTL ? 'ترتيب الأسرّة كل صباح' : 'Make beds every morning', icon: '🧹', frequency: 'daily', assignedTo: ['demo-user-001', 'demo-user-002', 'demo-user-003'], rotationOrder: ['demo-user-001', 'demo-user-002', 'demo-user-003'], currentAssigneeIndex: 1, lastRotatedAt: isoHoursAgo(8), difficulty: 'easy', estimatedMinutes: 10, isPaused: false, createdAt: isoDaysAgo(7) },
    { id: 'chore-3', title: isRTL ? 'تنظيف الصالة بالمكنسة' : 'Vacuum Living Room', description: isRTL ? 'تنظيف السجاد والأرضيات' : 'Vacuum carpets and floors', icon: '🧹', frequency: 'weekly', assignedTo: ['demo-user-001', 'demo-user-003'], rotationOrder: ['demo-user-001', 'demo-user-003'], currentAssigneeIndex: 0, lastRotatedAt: isoDaysAgo(2), difficulty: 'medium', estimatedMinutes: 30, isPaused: false, createdAt: isoDaysAgo(14) },
    { id: 'chore-4', title: isRTL ? 'الغسيل' : 'Laundry', description: isRTL ? 'غسل وتنظيف الملابس' : 'Wash and fold clothes', icon: '🧺', frequency: 'weekly', assignedTo: ['demo-user-002'], rotationOrder: ['demo-user-002'], currentAssigneeIndex: 0, lastRotatedAt: isoDaysAgo(3), difficulty: 'medium', estimatedMinutes: 60, isPaused: false, createdAt: isoDaysAgo(14) },
    { id: 'chore-5', title: isRTL ? 'تنظيف الحمّام' : 'Clean Bathroom', description: isRTL ? 'تنظيف وتطهير الحمامات' : 'Scrub and sanitize bathrooms', icon: '🚿', frequency: 'weekly', assignedTo: ['demo-user-001', 'demo-user-002', 'demo-user-003'], rotationOrder: ['demo-user-001', 'demo-user-002', 'demo-user-003'], currentAssigneeIndex: 2, lastRotatedAt: isoDaysAgo(5), difficulty: 'hard', estimatedMinutes: 45, isPaused: false, createdAt: isoDaysAgo(14) },
    { id: 'chore-6', title: isRTL ? 'تسوق البقالة' : 'Grocery Shopping', description: isRTL ? 'شراء المستلزمات الأسبوعية' : 'Buy weekly essentials', icon: '🍳', frequency: 'weekly', assignedTo: ['demo-user-001', 'demo-user-002'], rotationOrder: ['demo-user-001', 'demo-user-002'], currentAssigneeIndex: 1, lastRotatedAt: isoDaysAgo(1), difficulty: 'medium', estimatedMinutes: 90, isPaused: false, createdAt: isoDaysAgo(14) },
    { id: 'chore-7', title: isRTL ? 'تنظيف المطبخ العميق' : 'Deep Clean Kitchen', description: isRTL ? 'تنظيف شامل للمطبخ والأجهزة' : 'Thorough cleaning of kitchen and appliances', icon: '🧽', frequency: 'monthly', assignedTo: ['demo-user-001', 'demo-user-002', 'demo-user-003'], rotationOrder: ['demo-user-001', 'demo-user-002', 'demo-user-003'], currentAssigneeIndex: 0, lastRotatedAt: isoDaysAgo(10), difficulty: 'hard', estimatedMinutes: 120, isPaused: false, createdAt: isoDaysAgo(30) },
    { id: 'chore-8', title: isRTL ? 'ترتيب المرآب' : 'Organize Garage', description: isRTL ? 'ترتيب وتنظيم المرآب' : 'Sort and organize garage space', icon: '📦', frequency: 'monthly', assignedTo: ['demo-user-001', 'demo-user-003'], rotationOrder: ['demo-user-001', 'demo-user-003'], currentAssigneeIndex: 1, lastRotatedAt: isoDaysAgo(15), difficulty: 'hard', estimatedMinutes: 90, isPaused: true, createdAt: isoDaysAgo(30) },
  ])

  const choreStore = useChoreStore.getState()
  choreStore.logCompletion({ id: 'clog-1', choreId: 'chore-1', completedBy: 'demo-user-001', completedAt: isoHoursAgo(2) })
  choreStore.logCompletion({ id: 'clog-2', choreId: 'chore-2', completedBy: 'demo-user-002', completedAt: isoHoursAgo(4) })
  choreStore.logCompletion({ id: 'clog-3', choreId: 'chore-3', completedBy: 'demo-user-003', completedAt: isoDaysAgo(1) })
  choreStore.logCompletion({ id: 'clog-4', choreId: 'chore-5', completedBy: 'demo-user-001', completedAt: isoDaysAgo(3) })
  choreStore.logCompletion({ id: 'clog-5', choreId: 'chore-6', completedBy: 'demo-user-002', completedAt: isoDaysAgo(1) })

  // ─── Comments ──────────────────────────────────────────────────────
  useCommentStore.getState().setComments([
    { id: 'comment-1', task_id: 'task-1', parent_id: null, author_id: 'demo-user-001', author_name: isRTL ? 'أحمد' : 'Ahmed', author_avatar: null, content: isRTL ? 'يجب أن نبدأ بالتسوق قريبًا' : 'We should start shopping soon', created_at: isoHoursAgo(1), updated_at: isoHoursAgo(1) },
    { id: 'comment-2', task_id: 'task-1', parent_id: 'comment-1', author_id: 'demo-user-002', author_name: isRTL ? 'نورة' : 'Noura', author_avatar: null, content: isRTL ? 'أنا سأشتري الهدايا للأطفال' : "I'll get the gifts for the kids", created_at: isoMinutesAgo(30), updated_at: isoMinutesAgo(30) },
    { id: 'comment-3', task_id: 'task-1', parent_id: null, author_id: 'demo-user-003', author_name: isRTL ? 'خالد' : 'Khalid', author_avatar: null, content: isRTL ? 'لا تنسوا بطاقات التهنئة!' : "Don't forget greeting cards!", created_at: isoMinutesAgo(15), updated_at: isoMinutesAgo(15) },
    { id: 'comment-4', task_id: 'task-4', parent_id: null, author_id: 'demo-user-002', author_name: isRTL ? 'نورة' : 'Noura', author_avatar: null, content: isRTL ? 'الواجب في الرياضيات هذا الأسبوع' : 'Math homework this week', created_at: isoHoursAgo(2), updated_at: isoHoursAgo(2) },
    { id: 'comment-5', task_id: 'task-4', parent_id: 'comment-4', author_id: 'demo-user-001', author_name: isRTL ? 'أحمد' : 'Ahmed', author_avatar: null, content: isRTL ? 'سأساعد بعد صلاة العصر' : "I'll help after Asr prayer", created_at: isoMinutesAgo(90), updated_at: isoMinutesAgo(90) },
    { id: 'comment-6', task_id: 'task-2', parent_id: null, author_id: 'demo-user-003', author_name: isRTL ? 'خالد' : 'Khalid', author_avatar: null, content: isRTL ? 'سأنظف المطبخ والصالة' : "I'll clean the kitchen and living room", created_at: isoHoursAgo(3), updated_at: isoHoursAgo(3) },
  ])

  // ─── Budget ────────────────────────────────────────────────────────
  const budgetNow = new Date()
  const budgetMonthStr = `${budgetNow.getFullYear()}-${String(budgetNow.getMonth() + 1).padStart(2, '0')}`
  useBudgetStore.getState().setBudgetMonth({
    month: budgetMonthStr,
    totalBudget: 12000,
    categories: { food: 3000, housing: 3500, transport: 1500, education: 1000, health: 500, entertainment: 800, shopping: 700, utilities: 700, other: 300 },
  })
  useBudgetStore.getState().setExpenses([
    { id: 'exp-1', title: isRTL ? 'تسوق البقالة الأسبوعية' : 'Weekly grocery shopping', amount: 850, currency: 'SAR', category: 'food', date: isoDaysAgo(6).split('T')[0], paidBy: 'demo-user-001', paidByName: isRTL ? 'أحمد' : 'Ahmed', familyId: 'demo-family-001', notes: isRTL ? 'خضروات وفواكه ولحوم' : 'Vegetables, fruits, and meat', createdAt: isoDaysAgo(6) },
    { id: 'exp-2', title: isRTL ? 'إيجار الشهر' : 'Monthly rent', amount: 3200, currency: 'SAR', category: 'housing', date: isoDaysAgo(10).split('T')[0], paidBy: 'demo-user-001', paidByName: isRTL ? 'أحمد' : 'Ahmed', familyId: 'demo-family-001', createdAt: isoDaysAgo(10) },
    { id: 'exp-3', title: isRTL ? 'بنزين السيارة' : 'Car fuel', amount: 250, currency: 'SAR', category: 'transport', date: isoDaysAgo(3).split('T')[0], paidBy: 'demo-user-003', paidByName: isRTL ? 'خالد' : 'Khalid', familyId: 'demo-family-001', createdAt: isoDaysAgo(3) },
    { id: 'exp-4', title: isRTL ? 'دروس تعليمية' : 'Tutoring classes', amount: 600, currency: 'SAR', category: 'education', date: isoDaysAgo(5).split('T')[0], paidBy: 'demo-user-002', paidByName: isRTL ? 'نورة' : 'Noura', familyId: 'demo-family-001', notes: isRTL ? 'دروس رياضيات للأطفال' : 'Math classes for the kids', createdAt: isoDaysAgo(5) },
    { id: 'exp-5', title: isRTL ? 'فحص طبي' : 'Medical checkup', amount: 350, currency: 'SAR', category: 'health', date: isoDaysAgo(8).split('T')[0], paidBy: 'demo-user-002', paidByName: isRTL ? 'نورة' : 'Noura', familyId: 'demo-family-001', createdAt: isoDaysAgo(8) },
    { id: 'exp-6', title: isRTL ? 'اشتراك نتفليكس' : 'Netflix subscription', amount: 60, currency: 'SAR', category: 'entertainment', date: isoDaysAgo(2).split('T')[0], paidBy: 'demo-user-003', paidByName: isRTL ? 'خالد' : 'Khalid', familyId: 'demo-family-001', createdAt: isoDaysAgo(2) },
    { id: 'exp-7', title: isRTL ? 'ملابس جديدة' : 'New clothes', amount: 450, currency: 'SAR', category: 'shopping', date: isoDaysAgo(4).split('T')[0], paidBy: 'demo-user-001', paidByName: isRTL ? 'أحمد' : 'Ahmed', familyId: 'demo-family-001', notes: isRTL ? 'للعيد' : 'For Eid', createdAt: isoDaysAgo(4) },
    { id: 'exp-8', title: isRTL ? 'فاتورة الكهرباء' : 'Electricity bill', amount: 380, currency: 'SAR', category: 'utilities', date: isoDaysAgo(7).split('T')[0], paidBy: 'demo-user-001', paidByName: isRTL ? 'أحمد' : 'Ahmed', familyId: 'demo-family-001', createdAt: isoDaysAgo(7) },
    { id: 'exp-9', title: isRTL ? 'هدية عيد' : 'Eid gift', amount: 200, currency: 'SAR', category: 'other', date: isoDaysAgo(1).split('T')[0], paidBy: 'demo-user-003', paidByName: isRTL ? 'خالد' : 'Khalid', familyId: 'demo-family-001', createdAt: isoDaysAgo(1) },
    { id: 'exp-10', title: isRTL ? 'عشاء المطعم' : 'Restaurant dinner', amount: 320, currency: 'SAR', category: 'food', date: isoNow().split('T')[0], paidBy: 'demo-user-002', paidByName: isRTL ? 'نورة' : 'Noura', familyId: 'demo-family-001', notes: isRTL ? 'عشاء عائلي' : 'Family dinner out', createdAt: isoNow() },
  ])

  // ─── Chat ──────────────────────────────────────────────────────────
  useChatStore.getState().setMessages([
    { id: 'chat-1', family_id: 'demo-family-001', content: isRTL ? 'صباح الخير يا عائلة! 🌞' : 'Good morning family! 🌞', sender_id: 'demo-user-001', message_type: 'text', reply_to: null, created_at: isoHoursAgo(4), reactions: [{ emoji: '👍', users: ['demo-user-002', 'demo-user-001'] }, { emoji: '❤️', users: ['demo-user-003'] }] },
    { id: 'chat-2', family_id: 'demo-family-001', content: isRTL ? 'صباح النور أحمد! هل نحتاج لشراء شيء اليوم؟' : 'Good morning Ahmed! Do we need to buy anything today?', sender_id: 'demo-user-002', message_type: 'text', reply_to: null, created_at: isoAt(now() - 3.9 * HOUR), reactions: [] },
    { id: 'chat-3', family_id: 'demo-family-001', content: isRTL ? 'نعم، نحتاج حليب وخبز من المتجر' : 'Yes, we need milk and bread from the store', sender_id: 'demo-user-001', message_type: 'text', reply_to: null, created_at: isoAt(now() - 3.8 * HOUR), reactions: [{ emoji: '👍', users: ['demo-user-002'] }] },
    { id: 'chat-4', family_id: 'demo-family-001', content: isRTL ? 'سأمر بالمتجر بعد صلاة الظهر إن شاء الله' : "I'll pass by the store after Dhuhr prayer insha'Allah", sender_id: 'demo-user-003', message_type: 'text', reply_to: null, created_at: isoAt(now() - 3.5 * HOUR), reactions: [{ emoji: '❤️', users: ['demo-user-001'] }] },
    { id: 'chat-5', family_id: 'demo-family-001', content: isRTL ? 'شكرًا خالد! 👏' : 'Thanks Khalid! 👏', sender_id: 'demo-user-002', message_type: 'text', reply_to: null, created_at: isoAt(now() - 3.4 * HOUR), reactions: [{ emoji: '🎉', users: ['demo-user-001', 'demo-user-003'] }] },
    { id: 'chat-6', family_id: 'demo-family-001', content: isRTL ? 'لا تنسوا عشاء العائلة اليوم الساعة ٧ 🍽️' : "Don't forget family dinner tonight at 7! 🍽️", sender_id: 'demo-user-001', message_type: 'text', reply_to: null, created_at: isoHoursAgo(2), reactions: [{ emoji: '❤️', users: ['demo-user-002', 'demo-user-003'] }] },
    { id: 'chat-7', family_id: 'demo-family-001', content: isRTL ? 'صورة من نزهتنا الأسبوع الماضي 🏞️' : 'From our outing last week 🏞️', sender_id: 'demo-user-001', message_type: 'image' as const, file_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', file_name: 'family-outing.jpg', file_size: 245760, thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=60', reply_to: null, created_at: isoAt(now() - 1.8 * HOUR), reactions: [{ emoji: '❤️', users: ['demo-user-002', 'demo-user-003'] }, { emoji: '🎉', users: ['demo-user-002'] }] },
    { id: 'chat-8', family_id: 'demo-family-001', content: isRTL ? 'مستعدة! 😄' : "I'm ready! 😄", sender_id: 'demo-user-002', message_type: 'text', reply_to: null, created_at: isoAt(now() - 1.5 * HOUR), reactions: [] },
    { id: 'chat-9', family_id: 'demo-family-001', content: isRTL ? 'وصفة الكبسة التي تحبوها! 🍚' : 'The kabsa recipe you all love! 🍚', sender_id: 'demo-user-002', message_type: 'image' as const, file_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80', file_name: 'kabsa-recipe.jpg', file_size: 189440, thumbnail_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=60', reply_to: null, created_at: isoAt(now() - 1.2 * HOUR), reactions: [{ emoji: '❤️', users: ['demo-user-001', 'demo-user-003'] }, { emoji: '🙏', users: ['demo-user-003'] }] },
    { id: 'chat-10', family_id: 'demo-family-001', content: isRTL ? 'أنا أيضًا! هل نحتاج أن أحضر شيئًا؟' : 'Me too! Should I bring anything?', sender_id: 'demo-user-003', message_type: 'text', reply_to: null, created_at: isoHoursAgo(1), reactions: [{ emoji: '🙏', users: ['demo-user-001'] }] },
  ])

  // ─── Meal Plan ─────────────────────────────────────────────────────
  const mealToday = todayDate()
  const mealMonday = new Date(mealToday)
  mealMonday.setDate(mealMonday.getDate() - ((mealMonday.getDay() + 6) % 7))
  const mealDay = (offset: number) => {
    const d = new Date(mealMonday)
    d.setDate(d.getDate() + offset)
    return d.toISOString().split('T')[0]
  }
  useMealStore.getState().setMeals([
    { id: 'meal-1', title: isRTL ? 'بانكيك بالعسل' : 'Pancakes with Honey', description: isRTL ? 'بانكيك طازج مع العسل والزبدة' : 'Fresh pancakes with honey and butter', mealType: 'breakfast', date: mealDay(0), assignedTo: ['demo-user-001', 'demo-user-002'], ingredients: [isRTL ? 'دقيق' : 'Flour', isRTL ? 'حليب' : 'Milk', isRTL ? 'بيض' : 'Eggs', isRTL ? 'عسل' : 'Honey', isRTL ? 'زبدة' : 'Butter'], prepTime: 20, calories: 450, createdBy: 'demo-user-001', createdAt: isoNow() },
    { id: 'meal-2', title: isRTL ? 'كبسة دجاج' : 'Chicken Kabsa', description: isRTL ? 'كبسة دجاج تقليدية مع الأرز البسمتي' : 'Traditional chicken kabsa with basmati rice', mealType: 'lunch', date: mealDay(0), assignedTo: ['demo-user-001'], ingredients: [isRTL ? 'أرز بسمتي' : 'Basmati Rice', isRTL ? 'دجاج' : 'Chicken', isRTL ? 'بصل' : 'Onion', isRTL ? 'توابل' : 'Spices', isRTL ? 'طماطم' : 'Tomatoes'], prepTime: 60, calories: 650, createdBy: 'demo-user-001', createdAt: isoNow() },
    { id: 'meal-3', title: isRTL ? 'سمك مشوي' : 'Grilled Fish', description: isRTL ? 'سمك مشوي مع الأعشاب والخضروات' : 'Grilled fish with herbs and vegetables', mealType: 'dinner', date: mealDay(1), assignedTo: ['demo-user-002', 'demo-user-003'], ingredients: [isRTL ? 'سمك' : 'Fish', isRTL ? 'ليمون' : 'Lemon', isRTL ? 'أعشاب' : 'Herbs', isRTL ? 'زيت زيتون' : 'Olive Oil'], prepTime: 35, calories: 320, recipeUrl: 'https://example.com/grilled-fish', createdBy: 'demo-user-002', createdAt: isoNow() },
    { id: 'meal-4', title: isRTL ? 'مندي' : 'Mandi Rice', description: isRTL ? 'مندي لحم تقليدي' : 'Traditional lamb mandi', mealType: 'lunch', date: mealDay(2), assignedTo: ['demo-user-001', 'demo-user-003'], ingredients: [isRTL ? 'أرز بسمتي' : 'Basmati Rice', isRTL ? 'لحم' : 'Lamb', isRTL ? 'توابل مندي' : 'Mandi Spices', isRTL ? 'بصل' : 'Onion'], prepTime: 90, calories: 720, createdBy: 'demo-user-003', createdAt: isoNow() },
    { id: 'meal-5', title: isRTL ? 'فول مدمس' : 'Foul Medames', description: isRTL ? 'فول مدمس مع زيت الزيتون والليمون' : 'Foul medames with olive oil and lemon', mealType: 'breakfast', date: mealDay(3), assignedTo: ['demo-user-001', 'demo-user-002'], ingredients: [isRTL ? 'فول' : 'Fava Beans', isRTL ? 'زيت زيتون' : 'Olive Oil', isRTL ? 'ليمون' : 'Lemon', isRTL ? 'ثوم' : 'Garlic'], prepTime: 15, calories: 280, createdBy: 'demo-user-002', createdAt: isoNow() },
    { id: 'meal-6', title: isRTL ? 'مندي لحم' : 'Lamb Mandi', description: isRTL ? 'مندي لحم مع رز بسمتي' : 'Lamb mandi with basmati rice', mealType: 'dinner', date: mealDay(4), assignedTo: ['demo-user-001'], ingredients: [isRTL ? 'لحم' : 'Lamb', isRTL ? 'أرز' : 'Rice', isRTL ? 'توابل' : 'Spices', isRTL ? 'زبيب' : 'Raisins'], prepTime: 120, calories: 800, recipeUrl: 'https://example.com/lamb-mandi', createdBy: 'demo-user-001', createdAt: isoNow() },
  ])

  // ─── Milestones ────────────────────────────────────────────────────
  const msToday = todayDate()
  useMilestoneStore.getState().setMilestones([
    { id: 'ms-1', title: isRTL ? 'عيد ميلاد أحمد' : "Ahmed's Birthday", date: new Date(msToday.getTime() + 5 * DAY).toISOString(), type: 'birthday', description: isRTL ? 'عيد ميلاد أحمد الـ35' : "Ahmed's 35th birthday celebration", personId: 'demo-user-001', personName: isRTL ? 'أحمد' : 'Ahmed', emoji: '🎂', isRecurring: true, notifyDaysBefore: 7, createdAt: isoNow() },
    { id: 'ms-2', title: isRTL ? 'ذكرى زواج أحمد ونورة' : "Ahmed & Noura's Anniversary", date: new Date(msToday.getTime() + 12 * DAY).toISOString(), type: 'anniversary', description: isRTL ? 'الذكرى السنوية الخامسة' : '5th wedding anniversary', personId: 'demo-user-001', personName: isRTL ? 'أحمد ونورة' : 'Ahmed & Noura', emoji: '💍', isRecurring: true, notifyDaysBefore: 7, createdAt: isoNow() },
    { id: 'ms-3', title: isRTL ? 'تخرج خالد' : "Khalid's Graduation", date: new Date(msToday.getTime() + 20 * DAY).toISOString(), type: 'graduation', description: isRTL ? 'تخرج خالد من الجامعة' : "Khalid's university graduation", personId: 'demo-user-003', personName: isRTL ? 'خالد' : 'Khalid', emoji: '🎓', isRecurring: false, notifyDaysBefore: 3, createdAt: isoNow() },
    { id: 'ms-4', title: isRTL ? 'يوم تأسيس العائلة' : 'Family Foundation Day', date: new Date(msToday.getTime() + 3 * DAY).toISOString(), type: 'custom', description: isRTL ? 'الاحتفال بتأسيس عائلة الأحمد' : 'Celebrating the Ahmed family founding', personId: undefined, personName: undefined, emoji: '⭐', isRecurring: true, notifyDaysBefore: 3, createdAt: isoNow() },
    { id: 'ms-5', title: isRTL ? 'عيد ميلاد نورة' : "Noura's Birthday", date: new Date(msToday.getTime() + 25 * DAY).toISOString(), type: 'birthday', description: isRTL ? 'عيد ميلاد نورة الـ30' : "Noura's 30th birthday", personId: 'demo-user-002', personName: isRTL ? 'نورة' : 'Noura', emoji: '🎂', isRecurring: true, notifyDaysBefore: 7, createdAt: isoNow() },
    { id: 'ms-6', title: isRTL ? 'أول يوم دراسي' : 'First Day of School', date: new Date(msToday.getTime() + 45 * DAY).toISOString(), type: 'achievement', description: isRTL ? 'بداية العام الدراسي الجديد' : 'Start of the new school year', personId: 'demo-user-003', personName: isRTL ? 'خالد' : 'Khalid', emoji: '🏆', isRecurring: true, notifyDaysBefore: 7, createdAt: isoNow() },
  ])

  // ─── Subscription ──────────────────────────────────────────────────
  useSubscriptionStore.getState().setPlan('family_plus')

  // 3. Ensure onboarding is suppressed — a race condition can briefly
  //    set showOnboarding=true before the family data is populated,
  //    causing the OnboardingFlow to flash on screen.
  useAppStore.getState().setShowOnboarding(false)

  // 4. Mark demo data as ready — this signals to the UI that
  //    all stores are populated and it's safe to render content
  useAppStore.getState().setDemoDataReady(true)
}
