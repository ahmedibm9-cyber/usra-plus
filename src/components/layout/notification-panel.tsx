'use client'

import { useCallback } from 'react'
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
} from 'lucide-react'
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

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function NotificationPanel() {
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const removeNotification = useNotificationStore((s) => s.removeNotification)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 relative text-[--text-muted] hover:text-white hover:bg-[--border-subtle]"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-0.5 -right-0.5 min-w-4 size-4 p-0 flex items-center justify-center bg-violet-500 text-white text-[9px] font-bold border-0 rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 bg-[--bg-surface] border-[--border-subtle] rounded-2xl shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 h-7 px-2"
              onClick={markAllAsRead}
            >
              <Check className="size-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <Separator className="bg-[--border-subtle]" />

        {/* Notification List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="size-8 text-gray-600 mb-2" />
            <p className="text-sm text-[--text-muted]">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {notifications.map((notification) => {
                  const Icon = typeIcons[notification.type]
                  const colorClass = typeColors[notification.type]

                  return (
                    <motion.div
                      key={notification.id}
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
                        onClick={() => markAsRead(notification.id)}
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
                                  ? 'font-semibold text-white'
                                  : 'font-medium text-[--text-secondary]'
                              }`}
                            >
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="shrink-0 size-2 rounded-full bg-violet-500 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-[--text-muted] mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 size-6 text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notification.id)
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                      <Separator className="bg-[--border-subtle] last:hidden" />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
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
                className="w-full text-xs text-[--text-muted] hover:text-white hover:bg-[--border-subtle]"
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
