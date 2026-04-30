'use client'

import { useState, useCallback } from 'react'
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
import type { Notification } from '@/types'

// Temporary mock data - will be replaced with real data from API
const mockNotifications: Notification[] = [
  {
    id: '1',
    user_id: '1',
    family_id: '1',
    title: 'Task assigned to you',
    message: 'You have been assigned "Buy groceries" by Sarah',
    type: 'task',
    read: false,
    action_url: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    user_id: '1',
    family_id: '1',
    title: 'Upcoming event',
    message: 'Family dinner tomorrow at 7:00 PM',
    type: 'calendar',
    read: false,
    action_url: null,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    user_id: '1',
    family_id: '1',
    title: 'New message',
    message: 'Ahmed: Can someone pick up milk?',
    type: 'chat',
    read: true,
    action_url: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    user_id: '1',
    family_id: '1',
    title: 'Grocery list updated',
    message: '3 items were added to the weekly list',
    type: 'grocery',
    read: true,
    action_url: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    user_id: '1',
    family_id: '1',
    title: 'New family member',
    message: 'Fatima joined your family',
    type: 'family',
    read: true,
    action_url: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
]

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
  system: 'text-gray-400 bg-gray-500/10',
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
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 relative text-gray-400 hover:text-white hover:bg-white/[0.05]"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-0.5 -right-0.5 size-4 p-0 flex items-center justify-center bg-indigo-500 text-white text-[9px] font-bold border-0 rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 bg-[#111117] border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 h-7 px-2"
              onClick={markAllAsRead}
            >
              <Check className="size-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Notification List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="size-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No notifications</p>
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
                          flex gap-3 px-4 py-3 transition-colors cursor-pointer
                          hover:bg-white/[0.03]
                          ${!notification.read ? 'bg-white/[0.02]' : ''}
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
                                  : 'font-medium text-gray-300'
                              }`}
                            >
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="shrink-0 size-2 rounded-full bg-indigo-500 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
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
                            deleteNotification(notification.id)
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                      <Separator className="bg-white/[0.04] last:hidden" />
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
            <Separator className="bg-white/[0.06]" />
            <div className="px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-gray-400 hover:text-white hover:bg-white/[0.05]"
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
