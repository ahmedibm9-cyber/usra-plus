'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  getHours,
  getMinutes,
  parseISO,
  differenceInMinutes,
  isBefore,
  isAfter,
} from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { useI18n } from '@/i18n/use-translation'
import { toast } from 'sonner'
import type { CalendarEvent, UserProfile, FamilyMember } from '@/types'
import { EmptyState } from '@/components/shared/empty-state'
import { EventCardSkeleton } from '@/components/shared/skeleton-patterns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  CalendarRange,
  LayoutList,
  Clock,
  Trash2,
  Calendar as CalendarIcon,
  CalendarClock,
  MapPin,
  Repeat,
  User,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#A78BFA', '#EC4899', '#06B6D4', '#F97316'] as const
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

type CalendarView = 'month' | 'week' | 'day' | 'agenda'
type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

interface EventFormData {
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
  color: string
  location: string
  repeat: RepeatOption
  assignTo: string
}

const EMPTY_FORM: EventFormData = {
  title: '',
  description: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  allDay: false,
  color: EVENT_COLORS[0],
  location: '',
  repeat: 'none',
  assignTo: '',
}

// ─── Helper: Get events for a specific day ───────────────────────────────────

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => {
    const start = startOfDay(parseISO(event.start_time))
    const end = event.end_time ? endOfDay(parseISO(event.end_time)) : start
    const target = startOfDay(day)
    return (
      (isBefore(start, target) || isSameDay(start, target)) &&
      (isAfter(end, target) || isSameDay(end, target))
    )
  })
}

function getEventPosition(event: CalendarEvent, day: Date) {
  const start = parseISO(event.start_time)
  const end = event.end_time ? parseISO(event.end_time) : addDays(start, 1)

  const dayStart = startOfDay(day)
  const eventStartInDay = isSameDay(start, day) ? start : dayStart
  const eventEndInDay = isSameDay(end, day) ? end : endOfDay(day)

  const topMinutes = differenceInMinutes(eventStartInDay, dayStart)
  const durationMinutes = differenceInMinutes(eventEndInDay, eventStartInDay)

  return {
    top: (topMinutes / 1440) * 100,
    height: Math.max((durationMinutes / 1440) * 100, 2),
  }
}

function formatEventTime(event: CalendarEvent): string {
  if (event.all_day) return 'All day'
  const start = parseISO(event.start_time)
  if (!event.end_time) return format(start, 'h:mm a')
  const end = parseISO(event.end_time)
  if (isSameDay(start, end)) {
    return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
  }
  return `${format(start, 'MMM d, h:mm a')} – ${format(end, 'MMM d, h:mm a')}`
}

function formatCreatorName(creator?: UserProfile): string {
  if (!creator) return ''
  const parts = [creator.first_name, creator.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : creator.email?.split('@')[0] ?? ''
}

function getMemberName(member: FamilyMember): string {
  if (member.nickname) return member.nickname
  if (member.profiles) return formatCreatorName(member.profiles as unknown as UserProfile)
  return 'Member'
}

function getMemberInitials(member: FamilyMember): string {
  if (member.nickname) return member.nickname.charAt(0).toUpperCase()
  if (member.profiles) {
    const profile = member.profiles as unknown as UserProfile
    const first = profile.first_name?.charAt(0) ?? ''
    const last = profile.last_name?.charAt(0) ?? ''
    return (first + last).toUpperCase() || '?'
  }
  return '?'
}

// ─── Event Card ──────────────────────────────────────────────────────────────

function EventCard({
  event,
  compact = false,
  onClick,
}: {
  event: CalendarEvent
  compact?: boolean
  onClick?: () => void
}) {
  const color = event.color || EVENT_COLORS[0]
  const creatorName = formatCreatorName(event.creator)

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left group rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04] flex items-center gap-2"
      >
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-[#E5E7EB] truncate">{event.title}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left group rounded-xl p-3 transition-colors hover:bg-white/[0.04] flex gap-3 border border-white/[0.06]"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#E5E7EB] truncate">{event.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock className="size-3 text-[#6B7280]" />
          <span className="text-xs text-[#6B7280]">{formatEventTime(event)}</span>
        </div>
        {creatorName && (
          <p className="text-xs text-[#6B7280] mt-1">by {creatorName}</p>
        )}
      </div>
    </button>
  )
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick: (day: Date) => void
}) {
  const { t } = useI18n()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {WEEK_DAYS.map((day, i) => (
          <div
            key={i}
            className="py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(events, day)
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)
          const pillsToShow = dayEvents.slice(0, 2)
          const moreCount = dayEvents.length > 2 ? dayEvents.length - 2 : 0

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`relative border-b border-r border-white/[0.06] p-1 min-h-[80px] sm:min-h-[100px] cursor-pointer transition-colors hover:bg-white/[0.03] ${
                !inMonth ? 'opacity-40' : ''
              } ${today ? 'ring-1 ring-inset ring-[#6366F1]/40' : ''}`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`inline-flex items-center justify-center size-7 text-sm rounded-full transition-colors ${
                    today
                      ? 'bg-[#6366F1] text-white font-semibold'
                      : 'text-[#E5E7EB]'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Event pills */}
              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {pillsToShow.map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                    className="w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate transition-opacity hover:opacity-80 border-l-2"
                    style={{
                      backgroundColor: `${event.color || EVENT_COLORS[0]}15`,
                      color: event.color || EVENT_COLORS[0],
                      borderLeftColor: event.color || EVENT_COLORS[0],
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {moreCount > 0 && (
                  <span className="text-[10px] text-[#6B7280] px-1.5">
                    +{moreCount} {t.calendar.moreEvents}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick: (day: Date) => void
}) {
  const weekStart = startOfWeek(currentDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.06] shrink-0">
        <div className="py-3" />
        {weekDays.map((day, i) => {
          const today = isToday(day)
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className="py-3 text-center cursor-pointer hover:bg-white/[0.03] transition-colors"
            >
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                {format(day, 'EEE')}
              </div>
              <div
                className={`mt-1 inline-flex items-center justify-center size-8 text-sm rounded-full ${
                  today
                    ? 'bg-[#6366F1] text-white font-semibold'
                    : 'text-[#E5E7EB]'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="h-16 border-b border-white/[0.04] pr-2 text-right flex items-start pt-1">
                <span className="text-[10px] text-[#6B7280]">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </span>
              </div>
              {/* Day cells for this hour */}
              {weekDays.map((day, di) => {
                const hourEvents = getEventsForDay(events, day).filter((event) => {
                  if (event.all_day) return false
                  const start = parseISO(event.start_time)
                  return getHours(start) === hour && isSameDay(start, day)
                })

                return (
                  <div
                    key={di}
                    className="h-16 border-b border-r border-white/[0.04] relative"
                  >
                    {hourEvents.map((event) => {
                      const pos = getEventPosition(event, day)
                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[10px] leading-tight truncate transition-opacity hover:opacity-80 z-10"
                          style={{
                            top: `${((pos.top % (100 / 24)) / (100 / 24)) * 100}%`,
                            height: `${Math.max(pos.height * 24, 20)}%`,
                            backgroundColor: `${event.color || EVENT_COLORS[0]}30`,
                            color: event.color || EVENT_COLORS[0],
                            borderLeft: `2px solid ${event.color || EVENT_COLORS[0]}`,
                          }}
                        >
                          {event.title}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
          {/* All-day events row */}
          {weekDays.some((day) => getEventsForDay(events, day).some((e) => e.all_day)) && (
            <div className="col-span-8 border-b border-white/[0.06] py-1 px-2 flex gap-1">
              <div className="w-[60px] shrink-0" />
              {weekDays.map((day, di) => {
                const allDay = getEventsForDay(events, day).filter((e) => e.all_day)
                return (
                  <div key={di} className="flex-1 flex flex-col gap-0.5">
                    {allDay.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="rounded px-1 py-0.5 text-[10px] truncate transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: `${event.color || EVENT_COLORS[0]}25`,
                          color: event.color || EVENT_COLORS[0],
                        }}
                      >
                        {event.title}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}) {
  const dayEvents = getEventsForDay(events, currentDate)
  const timedEvents = dayEvents.filter((e) => !e.all_day)
  const allDayEvents = dayEvents.filter((e) => e.all_day)
  const today = isToday(currentDate)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header */}
      <div className="py-4 px-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center justify-center size-12 text-xl font-semibold rounded-full ${
              today ? 'bg-[#6366F1] text-white' : 'text-[#E5E7EB]'
            }`}
          >
            {format(currentDate, 'd')}
          </div>
          <div>
            <p className="text-sm text-[#6B7280]">{format(currentDate, 'EEEE')}</p>
            <p className="text-lg font-medium text-[#E5E7EB]">{format(currentDate, 'MMMM yyyy')}</p>
          </div>
        </div>
        {allDayEvents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {allDayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: `${event.color || EVENT_COLORS[0]}25`,
                  color: event.color || EVENT_COLORS[0],
                  borderLeft: `3px solid ${event.color || EVENT_COLORS[0]}`,
                }}
              >
                {event.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="relative">
          {HOURS.map((hour) => (
            <div key={hour} className="flex min-h-[60px] border-b border-white/[0.04]">
              <div className="w-16 shrink-0 pr-2 text-right pt-1">
                <span className="text-[10px] text-[#6B7280]">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </span>
              </div>
              <div className="flex-1 relative border-l border-white/[0.06]">
                {timedEvents
                  .filter((event) => getHours(parseISO(event.start_time)) === hour)
                  .map((event) => {
                    const startMin = getMinutes(parseISO(event.start_time))
                    const durationMin = event.end_time
                      ? differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
                      : 60
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="absolute left-2 right-2 rounded-lg px-3 py-2 text-left transition-opacity hover:opacity-80 z-10"
                        style={{
                          top: `${(startMin / 60) * 100}%`,
                          height: `${Math.max((durationMin / 60) * 100, 30)}%`,
                          minHeight: '30px',
                          backgroundColor: `${event.color || EVENT_COLORS[0]}20`,
                          borderLeft: `3px solid ${event.color || EVENT_COLORS[0]}`,
                        }}
                      >
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: event.color || EVENT_COLORS[0] }}
                        >
                          {event.title}
                        </p>
                        <p className="text-[10px] text-[#6B7280] mt-0.5">
                          {formatEventTime(event)}
                        </p>
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
          {/* Current time indicator */}
          {today && (
            <div
              className="absolute left-16 right-0 h-0.5 bg-[#EF4444] z-20 pointer-events-none"
              style={{
                top: `${(getHours(new Date()) * 60 + getMinutes(new Date())) / 1440 * 100}%`,
              }}
            >
              <div className="absolute -left-1 -top-1 size-2.5 rounded-full bg-[#EF4444]" />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Agenda View ─────────────────────────────────────────────────────────────

function AgendaView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}) {
  const { t } = useI18n()

  // Group events by date, starting from current date
  const upcomingDays = eachDayOfInterval({
    start: startOfDay(currentDate),
    end: addDays(currentDate, 30),
  })

  const groupedEvents = upcomingDays
    .map((day) => ({
      date: day,
      events: getEventsForDay(events, day),
    }))
    .filter((group) => group.events.length > 0)

  if (groupedEvents.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <CalendarDays className="size-10 text-[#6B7280] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">{t.calendar.noEvents}</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {groupedEvents.map((group) => {
          const today = isToday(group.date)
          return (
            <div key={group.date.toISOString()}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`inline-flex items-center justify-center size-9 text-sm font-semibold rounded-full shrink-0 ${
                    today
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#111117] border border-white/[0.08] text-[#E5E7EB]'
                  }`}
                >
                  {format(group.date, 'd')}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#E5E7EB]">
                    {format(group.date, 'EEEE')}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {format(group.date, 'MMMM yyyy')}
                  </p>
                </div>
                {today && (
                  <Badge className="bg-[#6366F1]/20 text-[#6366F1] border-0 text-[10px] ml-auto">
                    Today
                  </Badge>
                )}
              </div>
              <div className="space-y-2 pl-1">
                {group.events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// ─── Day Events Popover ─────────────────────────────────────────────────────

function DayEventsPanel({
  day,
  events,
  onEventClick,
  onClose,
}: {
  day: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onClose: () => void
}) {
  const dayEvents = getEventsForDay(events, day)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#E5E7EB]">
          {format(day, 'EEEE, MMMM d, yyyy')}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 text-[#6B7280] hover:text-[#E5E7EB]">
          ×
        </Button>
      </div>
      {dayEvents.length === 0 ? (
        <p className="text-xs text-[#6B7280] py-4 text-center">No events on this day</p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => onEventClick(event)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Mini Calendar Sidebar ───────────────────────────────────────────────────

function MiniCalendar({
  currentDate,
  onDateSelect,
  events,
}: {
  currentDate: Date
  onDateSelect: (date: Date) => void
  events: CalendarEvent[]
}) {
  const { t } = useI18n()
  const [miniMonth, setMiniMonth] = useState(currentDate)

  // Sync mini calendar month with main calendar
  useEffect(() => {
    setMiniMonth(currentDate)
  }, [currentDate])

  const monthStart = startOfMonth(miniMonth)
  const monthEnd = endOfMonth(miniMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  // Pre-compute which days have events
  const eventDays = useMemo(() => {
    const daySet = new Set<string>()
    events.forEach((event) => {
      const start = format(startOfDay(parseISO(event.start_time)), 'yyyy-MM-dd')
      daySet.add(start)
      if (event.end_time) {
        const end = format(startOfDay(parseISO(event.end_time)), 'yyyy-MM-dd')
        // Add all days in between
        const dayIter = startOfDay(parseISO(event.start_time))
        const endDay = startOfDay(parseISO(event.end_time))
        let current = dayIter
        while (isBefore(current, endDay) || isSameDay(current, endDay)) {
          daySet.add(format(current, 'yyyy-MM-dd'))
          current = addDays(current, 1)
        }
      }
    })
    return daySet
  }, [events])

  return (
    <div className="bg-[#111117]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3">
      {/* Mini calendar header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-[#E5E7EB]">{t.calendar.miniCalendar}</h3>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMiniMonth((d) => subMonths(d, 1))}
            className="size-5 flex items-center justify-center rounded text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.06] transition-colors"
          >
            <ChevronLeft className="size-3" />
          </button>
          <button
            onClick={() => setMiniMonth((d) => addMonths(d, 1))}
            className="size-5 flex items-center justify-center rounded text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.06] transition-colors"
          >
            <ChevronRight className="size-3" />
          </button>
        </div>
      </div>

      {/* Month label */}
      <p className="text-[10px] text-[#6B7280] mb-2 text-center">
        {format(miniMonth, 'MMMM yyyy')}
      </p>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS_SHORT.map((d, i) => (
          <div key={i} className="h-[28px] flex items-center justify-center text-[10px] font-medium text-[#6B7280]">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const today = isToday(day)
          const selected = isSameDay(day, currentDate)
          const inMonth = isSameMonth(day, miniMonth)
          const hasEvents = eventDays.has(format(day, 'yyyy-MM-dd'))

          return (
            <button
              key={i}
              onClick={() => onDateSelect(day)}
              className={`h-[28px] flex flex-col items-center justify-center rounded-md transition-colors relative ${
                !inMonth ? 'opacity-30' : 'hover:bg-white/[0.06]'
              } ${selected && !today ? 'ring-1 ring-[#6366F1]/60 bg-[#6366F1]/10' : ''}`}
            >
              <span
                className={`text-[10px] leading-none ${
                  today
                    ? 'bg-[#6366F1] text-white rounded-full size-5 flex items-center justify-center font-semibold'
                    : selected
                    ? 'text-[#6366F1] font-medium'
                    : 'text-[#E5E7EB]'
                }`}
              >
                {format(day, 'd')}
              </span>
              {hasEvents && !today && (
                <div className="w-1 h-1 rounded-full bg-[#6366F1] absolute bottom-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Upcoming Events Panel ───────────────────────────────────────────────────

function UpcomingEventsPanel({
  events,
  members,
  onEventClick,
  onViewAll,
}: {
  events: CalendarEvent[]
  members: FamilyMember[]
  onEventClick: (event: CalendarEvent) => void
  onViewAll: () => void
}) {
  const { t } = useI18n()

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => isAfter(parseISO(event.start_time), now) || isToday(parseISO(event.start_time)))
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
      .slice(0, 5)
  }, [events])

  const getMemberForEvent = (event: CalendarEvent): FamilyMember | null => {
    if (!event.created_by) return null
    return members.find((m) => m.user_id === event.created_by) ?? null
  }

  return (
    <div className="bg-[#111117]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[#E5E7EB]">{t.calendar.upcomingEvents}</h3>
        <button
          onClick={onViewAll}
          className="text-[10px] text-[#6366F1] hover:text-[#6366F1]/80 transition-colors font-medium"
        >
          {t.calendar.viewAll}
        </button>
      </div>

      {upcomingEvents.length === 0 ? (
        <p className="text-[10px] text-[#6B7280] py-4 text-center">{t.calendar.noEvents}</p>
      ) : (
        <div className="space-y-0">
          {upcomingEvents.map((event, idx) => {
            const member = getMemberForEvent(event)
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left py-2 flex items-center gap-2 hover:bg-white/[0.04] -mx-1 px-1 rounded transition-colors"
              >
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: event.color || EVENT_COLORS[0] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#E5E7EB] truncate font-medium">{event.title}</p>
                  <p className="text-[10px] text-[#6B7280]">
                    {event.all_day
                      ? format(parseISO(event.start_time), 'MMM d')
                      : format(parseISO(event.start_time), 'MMM d, h:mm a')}
                  </p>
                </div>
                {member && (
                  <div
                    className="size-5 rounded-full bg-[#6366F1]/20 flex items-center justify-center text-[9px] text-[#6366F1] font-semibold shrink-0"
                    title={getMemberName(member)}
                  >
                    {getMemberInitials(member)}
                  </div>
                )}
                {idx < upcomingEvents.length - 1 && (
                  <div className="absolute bottom-0 left-6 right-2 h-px bg-white/[0.04]" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Event Modal ─────────────────────────────────────────────────────────────

function EventModal({
  open,
  onOpenChange,
  event,
  familyId,
  userId,
  onSave,
  members,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  familyId: string
  userId: string
  onSave: () => void
  members: FamilyMember[]
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<EventFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const isEditing = !!event

  useEffect(() => {
    if (open) {
      if (event) {
        const start = parseISO(event.start_time)
        const end = event.end_time ? parseISO(event.end_time) : addHours(start, 1)
        setForm({
          title: event.title,
          description: event.description || '',
          startDate: format(start, 'yyyy-MM-dd'),
          startTime: format(start, 'HH:mm'),
          endDate: format(end, 'yyyy-MM-dd'),
          endTime: format(end, 'HH:mm'),
          allDay: event.all_day,
          color: event.color || EVENT_COLORS[0],
          location: '',
          repeat: 'none',
          assignTo: event.created_by || '',
        })
      } else {
        const now = new Date()
        setForm({
          ...EMPTY_FORM,
          startDate: format(now, 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
        })
      }
    }
  }, [open, event])

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Event title is required')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const startDateTime = form.allDay
        ? `${form.startDate}T00:00:00`
        : `${form.startDate}T${form.startTime}:00`
      const endDateTime = form.allDay
        ? `${form.endDate || form.startDate}T23:59:59`
        : `${form.endDate || form.startDate}T${form.endTime}:00`

      if (isEditing) {
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: form.title.trim(),
            description: form.description || null,
            start_time: startDateTime,
            end_time: endDateTime,
            all_day: form.allDay,
            color: form.color,
          })
          .eq('id', event!.id)

        if (error) throw error
        toast.success('Event updated')
      } else {
        const { error } = await supabase.from('calendar_events').insert({
          family_id: familyId,
          title: form.title.trim(),
          description: form.description || null,
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: form.allDay,
          color: form.color,
          created_by: form.assignTo || userId,
        })

        if (error) throw error
        toast.success('Event created')
      }

      // Also add to store for demo mode fallback
      const calendarStoreModule = await import('@/stores/calendar-store')
      const store = calendarStoreModule.useCalendarStore.getState()
      if (!isEditing) {
        store.addEvent({
          id: `event-${Date.now()}`,
          family_id: familyId,
          title: form.title.trim(),
          description: form.description || null,
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: form.allDay,
          color: form.color,
          created_by: form.assignTo || userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else if (event) {
        store.updateEvent({
          ...event,
          title: form.title.trim(),
          description: form.description || null,
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: form.allDay,
          color: form.color,
        })
      }

      onSave()
      onOpenChange(false)
    } catch (err) {
      console.error('Save event error:', err)
      // Fallback for demo mode - add to store
      const calendarStoreModule = await import('@/stores/calendar-store')
      const store = calendarStoreModule.useCalendarStore.getState()
      if (!isEditing) {
        store.addEvent({
          id: `event-${Date.now()}`,
          family_id: familyId,
          title: form.title.trim(),
          description: form.description || null,
          start_time: form.allDay
            ? `${form.startDate}T00:00:00`
            : `${form.startDate}T${form.startTime}:00`,
          end_time: form.allDay
            ? `${form.endDate || form.startDate}T23:59:59`
            : `${form.endDate || form.startDate}T${form.endTime}:00`,
          all_day: form.allDay,
          color: form.color,
          created_by: form.assignTo || userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        toast.success('Event created')
      }
      onOpenChange(false)
      onSave()
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (updates: Partial<EventFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  const handleAllDayToggle = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      allDay: checked,
      endDate: checked && prev.endDate !== prev.startDate ? prev.endDate : prev.startDate,
    }))
  }

  const handleStartDateChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      startDate: value,
      endDate: prev.startDate === prev.endDate ? value : prev.endDate,
    }))
  }

  const repeatOptions: { value: RepeatOption; label: string }[] = [
    { value: 'none', label: t.calendar.repeatNone },
    { value: 'daily', label: t.calendar.repeatDaily },
    { value: 'weekly', label: t.calendar.repeatWeekly },
    { value: 'monthly', label: t.calendar.repeatMonthly },
    { value: 'yearly', label: t.calendar.repeatYearly },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#E5E7EB]">
            {isEditing ? t.calendar.editEvent : t.calendar.addEvent}
          </DialogTitle>
          <DialogDescription className="text-[#6B7280]">
            {isEditing ? 'Update event details' : 'Fill in the details to create a new event'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-[#E5E7EB] text-sm">
              {t.calendar.eventTitle}
            </Label>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => updateForm({ title: e.target.value })}
              placeholder="Enter event title"
              className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] focus-visible:ring-[#6366F1]/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="event-desc" className="text-[#E5E7EB] text-sm">
              {t.calendar.description}
            </Label>
            <Textarea
              id="event-desc"
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              placeholder="Add a description (optional)"
              rows={3}
              className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] resize-none focus-visible:ring-[#6366F1]/50"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-[#E5E7EB] text-sm">{t.calendar.allDay}</Label>
            <Switch
              checked={form.allDay}
              onCheckedChange={handleAllDayToggle}
            />
          </div>

          {/* Start Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#E5E7EB] text-sm">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus-visible:ring-[#6366F1]/50 [color-scheme:dark]"
              />
            </div>
            {!form.allDay && (
              <div className="space-y-2">
                <Label className="text-[#E5E7EB] text-sm">{t.calendar.startTime}</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => updateForm({ startTime: e.target.value })}
                  className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus-visible:ring-[#6366F1]/50 [color-scheme:dark]"
                />
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#E5E7EB] text-sm">End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => updateForm({ endDate: e.target.value })}
                className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus-visible:ring-[#6366F1]/50 [color-scheme:dark]"
              />
            </div>
            {!form.allDay && (
              <div className="space-y-2">
                <Label className="text-[#E5E7EB] text-sm">{t.calendar.endTime}</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => updateForm({ endTime: e.target.value })}
                  className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus-visible:ring-[#6366F1]/50 [color-scheme:dark]"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="event-location" className="text-[#E5E7EB] text-sm flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {t.calendar.location}
            </Label>
            <Input
              id="event-location"
              value={form.location}
              onChange={(e) => updateForm({ location: e.target.value })}
              placeholder="Add location (optional)"
              className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] focus-visible:ring-[#6366F1]/50"
            />
          </div>

          {/* Repeat */}
          <div className="space-y-2">
            <Label className="text-[#E5E7EB] text-sm flex items-center gap-1.5">
              <Repeat className="size-3.5" />
              {t.calendar.repeat}
            </Label>
            <Select
              value={form.repeat}
              onValueChange={(value) => updateForm({ repeat: value as RepeatOption })}
            >
              <SelectTrigger className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus:ring-[#6366F1]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111117] border-white/[0.08]">
                {repeatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-[#E5E7EB] focus:bg-[#6366F1]/20 focus:text-[#E5E7EB]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <Label className="text-[#E5E7EB] text-sm flex items-center gap-1.5">
              <User className="size-3.5" />
              {t.calendar.assignTo}
            </Label>
            <Select
              value={form.assignTo}
              onValueChange={(value) => updateForm({ assignTo: value })}
            >
              <SelectTrigger className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus:ring-[#6366F1]/50">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent className="bg-[#111117] border-white/[0.08]">
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id} className="text-[#E5E7EB] focus:bg-[#6366F1]/20 focus:text-[#E5E7EB]">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-full bg-[#6366F1]/20 flex items-center justify-center text-[9px] text-[#6366F1] font-semibold">
                        {getMemberInitials(member)}
                      </div>
                      {getMemberName(member)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-[#E5E7EB] text-sm">{t.calendar.color}</Label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateForm({ color })}
                  className={`size-7 rounded-full transition-all ${
                    form.color === color
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111117] scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white disabled:opacity-50"
          >
            {saving ? t.common.loading : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper for addHours
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

// ─── Event Detail Dialog ─────────────────────────────────────────────────────

function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()

  if (!event) return null

  const color = event.color || EVENT_COLORS[0]
  const creatorName = formatCreatorName(event.creator)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="size-4 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <DialogTitle className="text-[#E5E7EB] text-lg">
              {event.title}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Event details for {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="size-4 text-[#6B7280] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-[#E5E7EB]">{formatEventTime(event)}</p>
              {event.all_day && (
                <Badge className="mt-1 bg-[#6366F1]/20 text-[#6366F1] border-0 text-[10px]">
                  All Day
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <CalendarClock className="size-4 text-[#6B7280] mt-0.5 shrink-0" />
              <p className="text-sm text-[#E5E7EB] whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Creator */}
          {creatorName && (
            <div className="flex items-center gap-3">
              <CalendarIcon className="size-4 text-[#6B7280] shrink-0" />
              <p className="text-sm text-[#6B7280]">Created by {creatorName}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
          >
            <Trash2 className="size-4" />
            {t.common.delete}
          </Button>
          <Button
            onClick={onEdit}
            className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white"
          >
            {t.common.edit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────

export default function CalendarPage() {
  const { t } = useI18n()
  const { currentFamily, familyMembers } = useAppStore()
  const calendarStore = useCalendarStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [supabaseEvents, setSupabaseEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showEventDetail, setShowEventDetail] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const familyId = currentFamily?.id ?? ''

  // Merge Supabase events with calendar store events (store as fallback)
  const events = useMemo(() => {
    if (supabaseEvents.length > 0) return supabaseEvents
    if (calendarStore.events.length > 0) return calendarStore.events
    return []
  }, [supabaseEvents, calendarStore.events])

  // ─── Fetch Events ───────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    if (!familyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      let rangeStart: Date
      let rangeEnd: Date

      switch (view) {
        case 'month': {
          const monthStart = startOfMonth(currentDate)
          const monthEnd = endOfMonth(currentDate)
          rangeStart = startOfWeek(monthStart)
          rangeEnd = endOfWeek(monthEnd)
          break
        }
        case 'week': {
          rangeStart = startOfWeek(currentDate)
          rangeEnd = endOfWeek(currentDate)
          break
        }
        case 'day': {
          rangeStart = startOfDay(currentDate)
          rangeEnd = endOfDay(currentDate)
          break
        }
        case 'agenda': {
          rangeStart = startOfDay(currentDate)
          rangeEnd = addDays(currentDate, 31)
          break
        }
        default: {
          rangeStart = startOfMonth(currentDate)
          rangeEnd = endOfMonth(currentDate)
        }
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*, creator:profiles(*)')
        .eq('family_id', familyId)
        .gte('start_time', rangeStart.toISOString())
        .lte('start_time', rangeEnd.toISOString())
        .order('start_time', { ascending: true })

      if (error) throw error
      setSupabaseEvents((data as unknown as CalendarEvent[]) || [])
    } catch (err) {
      console.error('Fetch events error:', err)
      setSupabaseEvents([])
    } finally {
      setLoading(false)
    }
  }, [familyId, currentDate, view])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // ─── Navigation ─────────────────────────────────────────────────────────

  const navigatePrev = () => {
    switch (view) {
      case 'month':
        setCurrentDate((d) => subMonths(d, 1))
        break
      case 'week':
        setCurrentDate((d) => subWeeks(d, 1))
        break
      case 'day':
      case 'agenda':
        setCurrentDate((d) => subDays(d, 1))
        break
    }
  }

  const navigateNext = () => {
    switch (view) {
      case 'month':
        setCurrentDate((d) => addMonths(d, 1))
        break
      case 'week':
        setCurrentDate((d) => addWeeks(d, 1))
        break
      case 'day':
      case 'agenda':
        setCurrentDate((d) => addDays(d, 1))
        break
    }
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDetail(true)
  }

  const handleAddEvent = () => {
    setSelectedEvent(null)
    setShowEventModal(true)
  }

  const handleEditEvent = () => {
    setShowEventDetail(false)
    setShowEventModal(true)
  }

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return

    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', selectedEvent.id)

      if (error) throw error
      toast.success('Event deleted')
      setShowDeleteConfirm(false)
      setShowEventDetail(false)
      setSelectedEvent(null)
      fetchEvents()
    } catch (err) {
      console.error('Delete event error:', err)
      // Fallback for demo mode
      const calendarStoreModule = await import('@/stores/calendar-store')
      const store = calendarStoreModule.useCalendarStore.getState()
      store.removeEvent(selectedEvent.id)
      toast.success('Event deleted')
      setShowDeleteConfirm(false)
      setShowEventDetail(false)
      setSelectedEvent(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleMiniCalDateSelect = (date: Date) => {
    setCurrentDate(date)
  }

  const handleViewAll = () => {
    setView('agenda')
  }

  // ─── Date Display ───────────────────────────────────────────────────────

  const dateDisplay = useMemo(() => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      case 'week': {
        const weekStart = startOfWeek(currentDate)
        const weekEnd = endOfWeek(currentDate)
        if (isSameMonth(weekStart, weekEnd)) {
          return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`
        }
        return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
      }
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'agenda':
        return format(currentDate, 'MMMM yyyy')
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }, [view, currentDate])

  const viewIcons: Record<CalendarView, React.ReactNode> = {
    month: <CalendarDays className="size-4" />,
    week: <CalendarRange className="size-4" />,
    day: <CalendarIcon className="size-4" />,
    agenda: <LayoutList className="size-4" />,
  }

  const viewLabels: Record<CalendarView, string> = {
    month: t.calendar.month,
    week: t.calendar.week,
    day: t.calendar.day,
    agenda: t.calendar.agenda,
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!familyId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <CalendarDays className="size-10 text-[#6B7280] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">Select a family to view calendar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0B0B0F]">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.06] px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Title + Navigation */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-[#E5E7EB]">{t.calendar.title}</h1>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigatePrev}
                    className="size-8 text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous</TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                onClick={navigateToday}
                className="h-8 px-3 text-xs text-[#E5E7EB] hover:bg-white/[0.04]"
              >
                Today
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigateNext}
                    className="size-8 text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next</TooltipContent>
              </Tooltip>
            </div>

            <h2 className="text-sm font-medium text-[#E5E7EB] hidden sm:block">
              {dateDisplay}
            </h2>
          </div>

          {/* Right: View Toggles + Add Button */}
          <div className="flex items-center gap-2">
            {/* View toggles */}
            <div className="flex items-center bg-[#111117] border border-white/[0.08] rounded-lg p-0.5">
              {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((v) => (
                <Button
                  key={v}
                  variant="ghost"
                  size="sm"
                  onClick={() => setView(v)}
                  className={`h-7 px-2.5 text-xs rounded-md gap-1.5 transition-all ${
                    view === v
                      ? 'bg-[#6366F1] text-white hover:bg-[#6366F1]/90 shadow-sm'
                      : 'text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]'
                  }`}
                >
                  {viewIcons[v]}
                  <span className="hidden sm:inline">{viewLabels[v]}</span>
                </Button>
              ))}
            </div>

            {/* Add Event Button */}
            <Button
              onClick={handleAddEvent}
              size="sm"
              className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white gap-1.5"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t.calendar.addEvent}</span>
            </Button>
          </div>
        </div>

        {/* Mobile date display */}
        <h2 className="text-sm font-medium text-[#E5E7EB] mt-2 sm:hidden">
          {dateDisplay}
        </h2>
      </div>

      {/* Main content area with sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Mini Calendar Sidebar (desktop only) */}
        <div className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-white/[0.06] p-3 gap-3 overflow-y-auto">
          <MiniCalendar
            currentDate={currentDate}
            onDateSelect={handleMiniCalDateSelect}
            events={events}
          />
          <UpcomingEventsPanel
            events={events}
            members={familyMembers}
            onEventClick={(event) => {
              setSelectedDay(null)
              handleEventClick(event)
            }}
            onViewAll={handleViewAll}
          />
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full px-4">
              <div className="w-full max-w-md space-y-3">
                <EventCardSkeleton count={3} />
              </div>
            </div>
          ) : events.length === 0 && view === 'month' ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                icon={CalendarDays}
                title="No events scheduled"
                description="Add your first event to stay organized"
                action={{ label: 'Add Event', onClick: () => setShowEventModal(true) }}
              />
            </div>
          ) : (
            <>
              {view === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {view === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {view === 'day' && (
                <DayView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
              {view === 'agenda' && (
                <AgendaView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}

          {/* Day Events Slide-over (Month view) */}
          {selectedDay && view === 'month' && (
            <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#111117] border-l border-white/[0.08] shadow-xl z-20 animate-in slide-in-from-right duration-200">
              <DayEventsPanel
                day={selectedDay}
                events={events}
                onEventClick={(event) => {
                  setSelectedDay(null)
                  handleEventClick(event)
                }}
                onClose={() => setSelectedDay(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        event={selectedEvent}
        familyId={familyId}
        userId={''}
        onSave={fetchEvents}
        members={familyMembers}
      />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={showEventDetail}
        onOpenChange={setShowEventDetail}
        onEdit={handleEditEvent}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#111117] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E5E7EB]">
              Delete Event
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#6B7280]">
              Are you sure you want to delete &quot;{selectedEvent?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/[0.08] text-[#E5E7EB] hover:bg-white/[0.04]">
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={deleting}
              className="bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
            >
              {deleting ? t.common.loading : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
