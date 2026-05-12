'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CheckSquare,
  CalendarDays,
  ShoppingCart,
  MessageSquare,
  Users,
  AlertCircle,
  Check,
  Trash2,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useNotificationStore } from '@/stores/notification-store'
import { useNotificationPreferencesStore } from '@/stores/notification-preferences-store'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { playNotificationSound, initAudioContext } from '@/lib/notification-sound'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const typeIcons: Record<Notification['type'], React.ElementType> = {
  task: CheckSquare,
  calendar: CalendarDays,
  grocery: ShoppingCart,
  chat: MessageSquare,
  family: Users,
  system: AlertCircle,
}

const typeColors: Record<Notification['type'], string> = {
  task: 'text-[#22C55E] bg-[#22C55E]/10',
  calendar: 'text-[#E50914] bg-[#E50914]/10',
  grocery: 'text-amber-400 bg-amber-500/10',
  chat: 'text-[#E50914] bg-[#E50914]/10',
  family: 'text-pink-400 bg-pink-500/10',
  system: 'text-[--text-muted] bg-gray-500/10',
}

function formatTimeAgo(dateStr: string, isRTL: boolean): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return isRTL ? 'الآن' : 'Just now'
  if (diffMin < 60) return isRTL ? `منذ ${diffMin} د` : `${diffMin}m ago`
  if (diffHr < 24) return isRTL ? `منذ ${diffHr} س` : `${diffHr}h ago`
  if (diffDay < 7) return isRTL ? `منذ ${diffDay} ي` : `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

/** Categorize notifications into Today / Yesterday / Earlier */
function categorizeNotifications(notifications: Notification[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  const todayNotifs: Notification[] = []
  const yesterdayNotifs: Notification[] = []
  const earlierNotifs: Notification[] = []

  for (const n of notifications) {
    const notifDate = new Date(n.created_at)
    const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate())

    if (notifDay.getTime() >= today.getTime()) {
      todayNotifs.push(n)
    } else if (notifDay.getTime() >= yesterday.getTime()) {
      yesterdayNotifs.push(n)
    } else {
      earlierNotifs.push(n)
    }
  }

  return { today: todayNotifs, yesterday: yesterdayNotifs, earlier: earlierNotifs }
}

/** Single notification item component */
function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
  isRTL,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
  onRemove: (id: string) => void
  isRTL: boolean
}) {
  const Icon = typeIcons[notification.type]
  const colorClass = typeColors[notification.type]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <div
        className={`
          group flex gap-3 px-4 py-3 transition-colors cursor-pointer
          hover:bg-[--border-subtle]
          ${!notification.read ? 'bg-[--border-subtle]' : ''}
        `}
        onClick={() => onMarkRead(notification.id)}
      >
        {/* Icon */}
        <div
          className={`shrink-0 flex size-8 items-center justify-center rounded-lg ${colorClass}`}
        >
          <Icon className="size-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm leading-tight ${
                !notification.read
                  ? 'font-semibold text-[--text-primary]'
                  : 'font-medium text-[--text-secondary]'
              }`}
            >
              {notification.title}
            </p>
            {!notification.read && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="shrink-0 size-2 rounded-full bg-[#E50914] mt-1.5"
              />
            )}
          </div>
          <p className="text-xs text-[--text-muted] mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-[10px] text-[--text-muted] mt-1">
            {formatTimeAgo(notification.created_at, isRTL)}
          </p>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 size-6 text-[--text-muted] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(notification.id)
          }}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      <Separator className="bg-[--border-subtle] last:hidden" />
    </motion.div>
  )
}

/** Notification section (Today / Yesterday / Earlier) */
function NotificationSection({
  title,
  count,
  notifications,
  onMarkRead,
  onRemove,
  isRTL,
}: {
  title: string
  count: number
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onRemove: (id: string) => void
  isRTL: boolean
}) {
  if (notifications.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider">
          {title}
        </span>
        <Badge
          variant="secondary"
          className="text-[10px] bg-[--bg-surface-2] text-[--text-muted] border-0 h-5 px-1.5"
        >
          {count}
        </Badge>
      </div>
      <AnimatePresence initial={false}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            onRemove={onRemove}
            isRTL={isRTL}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Deduplication set for Realtime events
const seenNotifIds = new Set<string>()

export function NotificationPanel() {
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const removeNotification = useNotificationStore((s) => s.removeNotification)

  const { user } = useAuthStore()
  const { currentFamily } = useAppStore()
  const { soundEnabled, setPreference } = useNotificationPreferencesStore()
  const { t, isRTL } = useI18n()

  const [isConnected, setIsConnected] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [newNotifArrived, setNewNotifArrived] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Use refs for values accessed inside realtime handlers to avoid stale closures
  const isRTLRef = useRef(isRTL)
  const soundEnabledRef = useRef(soundEnabled)
  const panelOpenRef = useRef(panelOpen)
  const userIdRef = useRef(user?.id)
  const familyIdRef = useRef(currentFamily?.id)
  const mountedRef = useRef(true)

  // Keep refs in sync with latest props/state
  useEffect(() => {
    isRTLRef.current = isRTL
    soundEnabledRef.current = soundEnabled
    panelOpenRef.current = panelOpen
    userIdRef.current = user?.id
    familyIdRef.current = currentFamily?.id
  })

  // Connect to Supabase Realtime for notifications
  useEffect(() => {
    mountedRef.current = true
    const bellTimerIds: ReturnType<typeof setTimeout>[] = []

    const familyId = currentFamily?.id
    const userId = user?.id

    if (!familyId || !userId) {
      // Use queueMicrotask to avoid synchronous setState in effect body
      queueMicrotask(() => {
        if (mountedRef.current) setIsConnected(false)
      })
      return
    }

    const supabase = createClient()

    // Subscribe to family-specific notification channel
    const channel = supabase.channel(`notifications-${familyId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    })

    // Listen for new notifications broadcast by other family members or server
    channel.on('broadcast', { event: 'new-notification' }, (payload) => {
      if (!mountedRef.current) return

      const data = payload.payload as {
        id: string
        type: string
        title: string
        titleAr?: string
        message: string
        messageAr?: string
        created_at: string
      }

      // Deduplicate by notification ID
      if (seenNotifIds.has(data.id)) return
      seenNotifIds.add(data.id)
      // Clean up dedup set after 5 minutes
      setTimeout(() => seenNotifIds.delete(data.id), 5 * 60 * 1000)

      const useRTL = isRTLRef.current
      const newNotif: Notification = {
        id: data.id,
        user_id: userIdRef.current || '',
        family_id: familyIdRef.current || null,
        title: useRTL && data.titleAr ? data.titleAr : data.title,
        message: useRTL && data.messageAr ? data.messageAr : data.message,
        type: (['task', 'calendar', 'grocery', 'chat', 'family', 'system'].includes(data.type)
          ? data.type
          : 'system') as Notification['type'],
        read: false,
        action_url: null,
        created_at: data.created_at,
      }

      addNotification(newNotif)

      // Trigger bell shake animation
      setNewNotifArrived(true)
      const timerId = setTimeout(() => {
        if (mountedRef.current) setNewNotifArrived(false)
      }, 600)
      bellTimerIds.push(timerId)

      // Play sound if enabled
      if (soundEnabledRef.current) {
        playNotificationSound('default', 0.5)
      }

      // Show toast when panel is closed
      if (!panelOpenRef.current) {
        toast(useRTL ? 'إشعار جديد' : t.notifications.newNotification, {
          description: newNotif.title,
          duration: 4000,
        })
      }
    })

    // Subscribe and track presence
    channel.subscribe((status) => {
      if (!mountedRef.current) return
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        // Track presence with user info
        channel.track({ userId, familyId, onlineAt: new Date().toISOString() })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setIsConnected(false)
      }
    })

    channelRef.current = channel

    return () => {
      mountedRef.current = false
      bellTimerIds.forEach(clearTimeout)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentFamily?.id, user?.id, addNotification, t.notifications.newNotification])

  // Mark as read — update via Supabase (client-side store handles UI)
  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id)
    // Server-side mark as read is handled by the notification store or API
  }, [markAsRead])

  // Mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead()
  }, [markAllAsRead])

  // Toggle sound
  const toggleSound = useCallback(() => {
    setPreference('soundEnabled', !soundEnabled)
    if (!soundEnabled) {
      // Init audio context on user gesture
      initAudioContext()
    }
  }, [soundEnabled, setPreference])

  // Categorize notifications
  const { today, yesterday, earlier } = categorizeNotifications(notifications)

  return (
    <Popover open={panelOpen} onOpenChange={setPanelOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 relative text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface-2]"
          aria-label={`Notifications, ${unreadCount} unread`}
          onClick={() => initAudioContext()}
        >
          <motion.div
            animate={newNotifArrived ? {
              rotate: [0, -15, 15, -10, 10, 0],
              transition: { duration: 0.5 }
            } : {}}
          >
            <Bell className="size-5" />
          </motion.div>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                key="notification-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Badge
                  className="absolute -top-0.5 -right-0.5 min-w-4 size-4 p-0 flex items-center justify-center bg-[#E50914] text-white text-[9px] font-bold border-0 rounded-full"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Pulse glow for new notifications */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[#E50914]/30 animate-ping" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 bg-[--bg-surface] border-[--border-subtle] rounded-2xl shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[--text-primary]">
              {t.notifications.notifications}
            </h3>
            {/* Live / Offline Indicator */}
            <motion.div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: isConnected ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                color: isConnected ? '#22c55e' : '#6b7280',
              }}
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isConnected ? (
                <Wifi className="size-2.5" />
              ) : (
                <WifiOff className="size-2.5" />
              )}
              {isConnected ? t.notifications.live : t.notifications.offline}
            </motion.div>
          </div>
          <div className="flex items-center gap-1">
            {/* Sound Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface-2]"
              onClick={toggleSound}
              aria-label={t.notifications.soundEnabled}
            >
              {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            </Button>
            {/* Mark All Read */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#E50914] hover:text-[#C40812] hover:bg-[#E50914]/10 h-7 px-2"
                onClick={handleMarkAllAsRead}
              >
                <Check className="size-3 mr-1" />
                {t.notifications.markAllRead}
              </Button>
            )}
          </div>
        </div>

        {/* Realtime status bar */}
        {isConnected && (
          <div className="px-4 pb-2">
            <p className="text-[10px] text-[#22C55E]/70 flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              {t.notifications.realtimeConnected}
            </p>
          </div>
        )}

        <Separator className="bg-[--border-subtle]" />

        {/* Notification List - Categorized */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="size-8 text-[--text-muted] mb-2" />
            <p className="text-sm text-[--text-muted]">{t.notifications.noNotifications}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[28rem]">
            <div className="flex flex-col">
              <NotificationSection
                title={t.notifications.today}
                count={today.length}
                notifications={today}
                onMarkRead={handleMarkAsRead}
                onRemove={removeNotification}
                isRTL={isRTL}
              />
              <NotificationSection
                title={t.notifications.yesterday}
                count={yesterday.length}
                notifications={yesterday}
                onMarkRead={handleMarkAsRead}
                onRemove={removeNotification}
                isRTL={isRTL}
              />
              <NotificationSection
                title={t.notifications.earlier}
                count={earlier.length}
                notifications={earlier}
                onMarkRead={handleMarkAsRead}
                onRemove={removeNotification}
                isRTL={isRTL}
              />
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator className="bg-[--border-subtle]" />
            <div className="px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface-2]"
              >
                {isRTL ? 'عرض جميع الإشعارات' : 'View all notifications'}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
