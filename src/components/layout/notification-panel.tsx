'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io as socketIO, Socket } from 'socket.io-client'
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
import type { Notification } from '@/types'

const typeIcons: Record<Notification['type'], React.ElementType> = {
  task: CheckSquare,
  calendar: CalendarDays,
  grocery: ShoppingCart,
  chat: MessageSquare,
  family: Users,
  system: AlertCircle,
}

const typeColors: Record<Notification['type'], string> = {
  task: 'text-emerald-400 bg-emerald-500/10',
  calendar: 'text-blue-400 bg-blue-500/10',
  grocery: 'text-amber-400 bg-amber-500/10',
  chat: 'text-violet-400 bg-violet-500/10',
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
                className="shrink-0 size-2 rounded-full bg-violet-500 mt-1.5"
              />
            )}
          </div>
          <p className="text-xs text-[--text-muted] mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            {formatTimeAgo(notification.created_at, isRTL)}
          </p>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 size-6 text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
  const socketRef = useRef<Socket | null>(null)

  // Connect to notification service on mount
  useEffect(() => {
    let socket: Socket | null = null

    try {
      socket = socketIO('/?XTransformPort=3031', {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
      })

      socket.on('connect', () => {
        setIsConnected(true)
        console.log('[NotificationPanel] Connected to notification service')

        // Join family room if available
        if (currentFamily?.id && user?.id) {
          socket?.emit('join-family', {
            familyId: currentFamily.id,
            userId: user.id,
          })
        }
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
        console.log('[NotificationPanel] Disconnected from notification service')
      })

      socket.on('connect_error', () => {
        setIsConnected(false)
      })

      // Listen for new notifications
      socket.on('new-notification', (data: {
        id: string
        type: string
        title: string
        titleAr?: string
        message: string
        messageAr?: string
        data?: Record<string, unknown>
        created_at: string
      }) => {
        const newNotif: Notification = {
          id: data.id,
          user_id: user?.id || '',
          family_id: currentFamily?.id || null,
          title: isRTL && data.titleAr ? data.titleAr : data.title,
          message: isRTL && data.messageAr ? data.messageAr : data.message,
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
        setTimeout(() => setNewNotifArrived(false), 600)

        // Play sound if enabled
        if (soundEnabled) {
          playNotificationSound('default', 0.5)
        }

        // Show toast when panel is closed
        if (!panelOpen) {
          toast(isRTL ? 'إشعار جديد' : t.notifications.newNotification, {
            description: newNotif.title,
            duration: 4000,
          })
        }
      })

      // Handle read acknowledgements
      socket.on('notification-read', () => {
        // Server confirmed read
      })

      socket.on('all-notifications-read', () => {
        // Server confirmed all read
      })

      socketRef.current = socket
    } catch {
      // Graceful fallback - notification service not available
      console.warn('[NotificationPanel] Could not connect to notification service, using local store only')
      // Use a microtask to avoid setting state synchronously in the effect body
      queueMicrotask(() => setIsConnected(false))
    }

    return () => {
      if (socket) {
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [currentFamily?.id, user?.id])

  // Join family room when family changes
  useEffect(() => {
    if (socketRef.current?.connected && currentFamily?.id && user?.id) {
      socketRef.current.emit('join-family', {
        familyId: currentFamily.id,
        userId: user.id,
      })
    }
  }, [currentFamily?.id, user?.id])

  // Mark as read via socket event
  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id)
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark-read', {
        notificationId: id,
        userId: user?.id,
      })
    }
  }, [markAsRead, user?.id])

  // Mark all as read via socket event
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead()
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark-all-read', {
        userId: user?.id,
      })
    }
  }, [markAllAsRead, user?.id])

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
          aria-label="Notifications"
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
                  className="absolute -top-0.5 -right-0.5 min-w-4 size-4 p-0 flex items-center justify-center bg-violet-500 text-white text-[9px] font-bold border-0 rounded-full"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Pulse glow for new notifications */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-violet-500/30 animate-ping" />
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
                className="text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 h-7 px-2"
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
            <p className="text-[10px] text-emerald-500/70 flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t.notifications.realtimeConnected}
            </p>
          </div>
        )}

        <Separator className="bg-[--border-subtle]" />

        {/* Notification List - Categorized */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="size-8 text-gray-600 mb-2" />
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
