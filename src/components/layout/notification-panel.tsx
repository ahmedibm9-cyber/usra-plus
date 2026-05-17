'use client'

import { useState, useEffect, useCallback, useRef, type ElementType } from 'react'
import {
  Popover,
  IconButton,
  Badge,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Divider,
  Box,
  Chip,
  Paper,
  Tooltip,
} from '@mui/material'
import { Notifications as BellIcon, CheckBox, CalendarMonth, ShoppingCart, Chat, Group, Error as ErrorIcon, Check, Delete, Wifi, WifiOff, VolumeUp, VolumeOff } from '@mui/icons-material'
import { toast } from 'sonner'
import { useNotificationStore } from '@/stores/notification-store'
import { useNotificationPreferencesStore } from '@/stores/notification-preferences-store'
import { useCurrentUser, useCurrentFamily } from '@/stores/selectors'
import { useI18n } from '@/i18n/use-translation'
import { playNotificationSound, initAudioContext } from '@/lib/notification-sound'
import { createClient } from '@/lib/supabase/client'
import { MuiLayoutProvider } from './mui-layout-provider'
import type { Notification } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const typeIcons: Record<Notification['type'], ElementType> = {
  task: CheckBox,
  calendar: CalendarMonth,
  grocery: ShoppingCart,
  chat: Chat,
  family: Group,
  system: ErrorIcon,
}

const typeColors: Record<Notification['type'], string> = {
  task: 'var(--accent)',
  calendar: '#0D6B58',
  grocery: '#047857',
  chat: 'var(--secondary)',
  family: 'var(--accent)',
  system: '#79747E',
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
  const iconColor = typeColors[notification.type]

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(notification.id)
            }}
            sx={{
              opacity: 0,
              transition: 'opacity 0.15s',
              '.MuiListItem-root:hover &': { opacity: 1 },
              color: 'text.secondary',
              '&:hover': { color: 'error.main', bgcolor: 'error.light' },
            }}
          >
            <Delete sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      }
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        bgcolor: notification.read ? 'transparent' : 'action.hover',
        '&:hover': { bgcolor: 'action.hover' },
        transition: 'background-color 0.15s',
      }}
      onClick={() => onMarkRead(notification.id)}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: `${iconColor}14`,
          color: iconColor,
        }}
      >
        <Icon sx={{ fontSize: 16 }} />
      </Box>

      {/* Content */}
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: notification.read ? 500 : 600,
                color: notification.read ? 'text.secondary' : 'text.primary',
                lineHeight: 1.3,
                flex: 1,
              }}
            >
              {notification.title}
            </Typography>
            {!notification.read && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  mt: 0.5,
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
        }
        secondary={
          <>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4, mt: 0.25 }} component="span">
              {notification.message}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5, fontSize: '0.625rem' }} component="span">
              {formatTimeAgo(notification.created_at, isRTL)}
            </Typography>
          </>
        }
        sx={{ m: 0 }}
      />
    </ListItem>
  )
}

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
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6875rem' }}>
          {title}
        </Typography>
        <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.625rem', bgcolor: 'action.hover', color: 'text.secondary' }} />
      </Box>
      <List disablePadding>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            onRemove={onRemove}
            isRTL={isRTL}
          />
        ))}
      </List>
    </Box>
  )
}

const seenNotifIds = new Set<string>()

function NotificationPanelInner() {
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const removeNotification = useNotificationStore((s) => s.removeNotification)

  const user = useCurrentUser()
  const currentFamily = useCurrentFamily()
  const { soundEnabled, setPreference } = useNotificationPreferencesStore()
  const { t, isRTL } = useI18n()

  const [isConnected, setIsConnected] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [newNotifArrived, setNewNotifArrived] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const isRTLRef = useRef(isRTL)
  const soundEnabledRef = useRef(soundEnabled)
  const panelOpenRef = useRef(!!anchorEl)
  const userIdRef = useRef(user?.id)
  const familyIdRef = useRef(currentFamily?.id)
  const mountedRef = useRef(true)

  useEffect(() => {
    isRTLRef.current = isRTL
    soundEnabledRef.current = soundEnabled
    panelOpenRef.current = !!anchorEl
    userIdRef.current = user?.id
    familyIdRef.current = currentFamily?.id
  })

  useEffect(() => {
    mountedRef.current = true
    const bellTimerIds: ReturnType<typeof setTimeout>[] = []

    const familyId = currentFamily?.id
    const userId = user?.id

    if (!familyId || !userId) {
      queueMicrotask(() => {
        if (mountedRef.current) setIsConnected(false)
      })
      return
    }

    const supabase = createClient()

    const channel = supabase.channel(`notifications-${familyId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    })

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

      if (seenNotifIds.has(data.id)) return
      seenNotifIds.add(data.id)
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

      setNewNotifArrived(true)
      const timerId = setTimeout(() => {
        if (mountedRef.current) setNewNotifArrived(false)
      }, 600)
      bellTimerIds.push(timerId)

      if (soundEnabledRef.current) {
        playNotificationSound('default', 0.5)
      }

      if (!panelOpenRef.current) {
        toast(useRTL ? 'إشعار جديد' : t.notifications.newNotification, {
          description: newNotif.title,
          duration: 4000,
        })
      }
    })

    channel.subscribe((status) => {
      if (!mountedRef.current) return
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
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

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id)
  }, [markAsRead])

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead()
  }, [markAllAsRead])

  const toggleSound = useCallback(() => {
    setPreference('soundEnabled', !soundEnabled)
    if (!soundEnabled) {
      initAudioContext()
    }
  }, [soundEnabled, setPreference])

  const { today, yesterday, earlier } = categorizeNotifications(notifications)

  const panelOpen = Boolean(anchorEl)

  return (
    <>
      <Tooltip title={t.notifications.notifications}>
        <IconButton
          onClick={(e) => {
            setAnchorEl(e.currentTarget)
            initAudioContext()
          }}
          sx={{
            position: 'relative',
            color: 'text.secondary',
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
            animation: newNotifArrived ? 'shake 0.5s ease-in-out' : 'none',
            '@keyframes shake': {
              '0%, 100%': { transform: 'rotate(0deg)' },
              '15%': { transform: 'rotate(-15deg)' },
              '30%': { transform: 'rotate(15deg)' },
              '45%': { transform: 'rotate(-10deg)' },
              '60%': { transform: 'rotate(10deg)' },
            },
          }}
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Badge
            badgeContent={unreadCount > 9 ? '9+' : unreadCount}
            sx={{ color: 'primary.main' }}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.5625rem',
                fontWeight: 700,
                minWidth: 16,
                height: 16,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                ...(unreadCount > 0 ? {
                  animation: 'notifPulse 2s ease-in-out infinite',
                  '@keyframes notifPulse': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(13, 107, 88, 0.4)' },
                    '50%': { boxShadow: '0 0 0 4px rgba(13, 107, 88, 0)' },
                  },
                } : {}),
              },
            }}
          >
            <BellIcon sx={{ fontSize: 20 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={panelOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 320, sm: 384 },
              mt: 1,
              borderRadius: 3,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {t.notifications.notifications}
            </Typography>
            {/* Live / Offline Indicator */}
            <Chip
              icon={isConnected ? <Wifi sx={{ fontSize: 10 }} /> : <WifiOff sx={{ fontSize: 10 }} />}
              label={isConnected ? t.notifications.live : t.notifications.offline}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.5625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                bgcolor: isConnected ? 'success.light' : 'action.hover',
                color: isConnected ? 'success.dark' : 'text.secondary',
                '& .MuiChip-icon': { color: 'inherit', fontSize: 10 },
                animation: isConnected ? 'pulse 2s ease-in-out infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                },
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Sound Toggle */}
            <Tooltip title={t.notifications.soundEnabled}>
              <IconButton size="small" onClick={toggleSound} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                {soundEnabled ? <VolumeUp sx={{ fontSize: 14 }} /> : <VolumeOff sx={{ fontSize: 14 }} />}
              </IconButton>
            </Tooltip>
            {/* Mark All Read */}
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                startIcon={<Check sx={{ fontSize: 12 }} />}
                sx={{
                  fontSize: '0.6875rem',
                  color: 'primary.main',
                  '&:hover': { color: 'primary.dark', bgcolor: 'primary.light' },
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 0,
                  px: 1,
                }}
              >
                {t.notifications.markAllRead}
              </Button>
            )}
          </Box>
        </Box>

        {/* Realtime status bar */}
        {isConnected && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography variant="caption" sx={{ color: 'success.main', opacity: 0.7, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.625rem' }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', animation: 'pulse 2s ease-in-out infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
              {t.notifications.realtimeConnected}
            </Typography>
          </Box>
        )}

        <Divider />

        {/* Notification List */}
        {notifications.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2 }}>
            <BellIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t.notifications.noNotifications}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: '28rem', overflowY: 'auto' }}>
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
          </Box>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Button
                fullWidth
                size="small"
                sx={{
                  fontSize: '0.6875rem',
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                  textTransform: 'none',
                }}
              >
                {isRTL ? 'عرض جميع الإشعارات' : 'View all notifications'}
              </Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  )
}

export function NotificationPanel() {
  return (
    <MuiLayoutProvider>
      <NotificationPanelInner />
    </MuiLayoutProvider>
  )
}
