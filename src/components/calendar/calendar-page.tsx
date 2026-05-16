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
  addHours,
} from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { useI18n } from '@/i18n/use-translation'
import { toast } from 'sonner'
import type { CalendarEvent, UserProfile, FamilyMember } from '@/types'
import {
  Container,
  Stack,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormControlLabel,
  Checkbox,
  Switch,
  Divider,
  Avatar,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
  useMediaQuery,
  Fab,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Add,
  CalendarMonth,
  ViewWeek,
  ViewDay,
  ViewAgenda,
  AccessTime,
  Delete,
  LocationOn,
  Repeat,
  Person,
  CalendarToday,
} from '@mui/icons-material'

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_PALETTE_KEYS = ['primary', 'success', 'secondary', 'error', 'warning', 'info', 'primary', 'primary'] as const
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
  color: '',
  location: '',
  repeat: 'none',
  assignTo: '',
}

// ─── Helper: Get event color from theme palette ──────────────────────────────
function getEventColor(theme: ReturnType<typeof useTheme> extends () => infer T ? T : never, index?: number): string {
  const idx = index ?? 0
  const key = EVENT_PALETTE_KEYS[idx % EVENT_PALETTE_KEYS.length]
  return theme.palette[key]?.main ?? theme.palette.primary.main
}

function resolveEventColor(color: string | null | undefined, theme: ReturnType<typeof useTheme> extends () => infer T ? T : never, fallbackIndex?: number): string {
  if (color && color.startsWith('#')) return color
  if (color && color.startsWith('var(')) return getEventColor(theme, fallbackIndex)
  if (color) return color
  return getEventColor(theme, fallbackIndex)
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

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

// ─── Event Card ──────────────────────────────────────────────────────────────

function EventCard({
  event,
  compact = false,
  onClick,
  colorIndex,
}: {
  event: CalendarEvent
  compact?: boolean
  onClick?: () => void
  colorIndex?: number
}) {
  const theme = useTheme()
  const color = resolveEventColor(event.color, theme, colorIndex)
  const creatorName = formatCreatorName(event.creator)

  if (compact) {
    return (
      <Box
        onClick={onClick}
        sx={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
        <Typography variant="caption" noWrap>{event.title}</Typography>
      </Box>
    )
  }

  return (
    <Paper
      onClick={onClick}
      variant="outlined"
      sx={{
        cursor: 'pointer',
        p: 1.5,
        borderLeftColor: color,
        borderLeftWidth: 3,
        transition: 'all 0.2s',
        '&:hover': { bgcolor: 'action.hover', boxShadow: theme.shadows[2] },
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="body2" fontWeight={500} noWrap>{event.title}</Typography>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <AccessTime sx={{ fontSize: 12 }} color="action" />
          <Typography variant="caption" color="text.secondary">{formatEventTime(event)}</Typography>
        </Stack>
        {creatorName && (
          <Typography variant="caption" color="text.secondary">by {creatorName}</Typography>
        )}
      </Stack>
    </Paper>
  )
}

// ─── Memoized Day Cell Component ─────────────────────────────────────────────

const MAX_EVENTS_PER_CELL = 3

const MonthDayCell = React.memo(function MonthDayCell({
  day,
  events,
  inMonth,
  onEventClick,
  onDayClick,
  moreEventsLabel,
}: {
  day: Date
  events: CalendarEvent[]
  inMonth: boolean
  onEventClick: (event: CalendarEvent) => void
  onDayClick: (day: Date) => void
  moreEventsLabel: string
}) {
  const theme = useTheme()
  const today = isToday(day)
  const pillsToShow = events.slice(0, MAX_EVENTS_PER_CELL)
  const moreCount = events.length > MAX_EVENTS_PER_CELL ? events.length - MAX_EVENTS_PER_CELL : 0

  return (
    <Box
      onClick={() => onDayClick(day)}
      role="gridcell"
      aria-label={format(day, 'EEEE, MMMM d, yyyy')}
      sx={{
        position: 'relative',
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        p: 0.5,
        minHeight: { xs: 80, sm: 100 },
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'action.hover' },
        opacity: inMonth ? 1 : 0.4,
        ...(today && { boxShadow: `inset 0 0 0 1px ${theme.palette.primary.main}60` }),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            fontSize: 14,
            borderRadius: '50%',
            ...(today
              ? { bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600 }
              : { color: 'text.primary' }),
          }}
        >
          {format(day, 'd')}
        </Box>
      </Stack>

      <Stack spacing={0.25} sx={{ mt: 0.25, overflow: 'hidden' }}>
        {pillsToShow.map((event, idx) => {
          const eColor = resolveEventColor(event.color, theme, idx)
          return (
            <Box
              key={event.id}
              onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
              sx={{
                width: '100%',
                textAlign: 'left',
                fontSize: 10,
                lineHeight: 1.3,
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                bgcolor: `${eColor}18`,
                color: eColor,
                borderLeft: `2px solid ${eColor}`,
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.8 },
              }}
            >
              {event.title}
            </Box>
          )
        })}
        {moreCount > 0 && (
          <Typography variant="caption" sx={{ fontSize: 10, px: 0.5 }} color="text.secondary">
            +{moreCount} {moreEventsLabel}
          </Typography>
        )}
      </Stack>
    </Box>
  )
})

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  moreEventsLabel,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick: (day: Date) => void
  moreEventsLabel: string
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd')
      const dayEvts = getEventsForDay(events, day)
      if (dayEvts.length > 0) map.set(key, dayEvts)
    }
    return map
  }, [days, events])

  return (
    <Box role="grid" aria-label="Calendar" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Day headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid', borderColor: 'divider' }}>
        {WEEK_DAYS.map((day, i) => (
          <Typography key={i} variant="overline" sx={{ py: 1.5, textAlign: 'center', letterSpacing: 1 }}>
            {day}
          </Typography>
        ))}
      </Box>

      {/* Day cells */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }} role="row">
        {days.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay.get(key) || []
          const inMonth = isSameMonth(day, currentDate)
          return (
            <MonthDayCell
              key={i}
              day={day}
              events={dayEvents}
              inMonth={inMonth}
              onEventClick={onEventClick}
              onDayClick={onDayClick}
              moreEventsLabel={moreEventsLabel}
            />
          )
        })}
      </Box>
    </Box>
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
  const theme = useTheme()
  const weekStart = startOfWeek(currentDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  return (
    <Stack sx={{ height: '100%', overflow: 'hidden' }}>
      {/* Day headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ py: 1.5 }} />
        {weekDays.map((day, i) => {
          const today = isToday(day)
          return (
            <Box
              key={i}
              onClick={() => onDayClick(day)}
              sx={{ py: 1.5, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 0.2s' }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 1 }}>{format(day, 'EEE')}</Typography>
              <Box
                sx={{
                  mt: 0.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  fontSize: 14,
                  borderRadius: '50%',
                  ...(today
                    ? { bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600 }
                    : { color: 'text.primary' }),
                }}
              >
                {format(day, 'd')}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Time grid */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', position: 'relative' }}>
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <Box sx={{ height: 64, borderBottom: '1px solid', borderColor: 'divider', pr: 1, textAlign: 'right', display: 'flex', alignItems: 'flex-start', pt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{formatHour(hour)}</Typography>
              </Box>
              {weekDays.map((day, di) => {
                const hourEvents = getEventsForDay(events, day).filter((event) => {
                  if (event.all_day) return false
                  const start = parseISO(event.start_time)
                  return getHours(start) === hour && isSameDay(start, day)
                })
                return (
                  <Box key={di} sx={{ height: 64, borderBottom: '1px solid', borderRight: '1px solid', borderColor: 'divider', position: 'relative' }}>
                    {hourEvents.map((event, idx) => {
                      const pos = getEventPosition(event, day)
                      const eColor = resolveEventColor(event.color, theme, idx)
                      return (
                        <Box
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          sx={{
                            position: 'absolute',
                            left: 2,
                            right: 2,
                            borderRadius: 0.5,
                            px: 0.5,
                            py: 0.25,
                            fontSize: 10,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            zIndex: 10,
                            top: `${((pos.top % (100 / 24)) / (100 / 24)) * 100}%`,
                            height: `${Math.max(pos.height * 24, 20)}%`,
                            bgcolor: `${eColor}30`,
                            color: eColor,
                            borderLeft: `2px solid ${eColor}`,
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 0.8 },
                          }}
                        >
                          {event.title}
                        </Box>
                      )
                    })}
                  </Box>
                )
              })}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    </Stack>
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
  const theme = useTheme()
  const dayEvents = getEventsForDay(events, currentDate)
  const timedEvents = dayEvents.filter((e) => !e.all_day)
  const allDayEvents = dayEvents.filter((e) => e.all_day)
  const today = isToday(currentDate)

  return (
    <Stack sx={{ height: '100%', overflow: 'hidden' }}>
      {/* Day header */}
      <Box sx={{ py: 2, px: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              fontSize: 20,
              fontWeight: 600,
              borderRadius: '50%',
              ...(today
                ? { bgcolor: 'primary.main', color: 'primary.contrastText' }
                : { color: 'text.primary' }),
            }}
          >
            {format(currentDate, 'd')}
          </Box>
          <Stack>
            <Typography variant="body2" color="text.secondary">{format(currentDate, 'EEEE')}</Typography>
            <Typography variant="h6">{format(currentDate, 'MMMM yyyy')}</Typography>
          </Stack>
        </Stack>
        {allDayEvents.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {allDayEvents.map((event, idx) => {
              const eColor = resolveEventColor(event.color, theme, idx)
              return (
                <Chip
                  key={event.id}
                  label={event.title}
                  onClick={() => onEventClick(event)}
                  sx={{
                    bgcolor: `${eColor}25`,
                    color: eColor,
                    borderLeft: `3px solid ${eColor}`,
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8 },
                  }}
                />
              )
            })}
          </Stack>
        )}
      </Box>

      {/* Timeline */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ position: 'relative' }}>
          {HOURS.map((hour) => (
            <Stack key={hour} direction="row" sx={{ minHeight: 60, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ width: 64, flexShrink: 0, pr: 1, textAlign: 'right', pt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{formatHour(hour)}</Typography>
              </Box>
              <Box sx={{ flex: 1, position: 'relative', borderLeft: '1px solid', borderColor: 'divider' }}>
                {timedEvents
                  .filter((event) => getHours(parseISO(event.start_time)) === hour)
                  .map((event, idx) => {
                    const startMin = getMinutes(parseISO(event.start_time))
                    const durationMin = event.end_time
                      ? differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
                      : 60
                    const eColor = resolveEventColor(event.color, theme, idx)
                    return (
                      <Box
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        sx={{
                          position: 'absolute',
                          left: 8,
                          right: 8,
                          borderRadius: 2,
                          px: 1.5,
                          py: 1,
                          cursor: 'pointer',
                          zIndex: 10,
                          top: `${(startMin / 60) * 100}%`,
                          height: `${Math.max((durationMin / 60) * 100, 30)}%`,
                          minHeight: 30,
                          bgcolor: `${eColor}20`,
                          borderLeft: `3px solid ${eColor}`,
                          transition: 'opacity 0.2s',
                          '&:hover': { opacity: 0.8 },
                        }}
                      >
                        <Typography variant="caption" fontWeight={500} noWrap sx={{ color: eColor }}>{event.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: 10 }}>
                          {formatEventTime(event)}
                        </Typography>
                      </Box>
                    )
                  })}
              </Box>
            </Stack>
          ))}
          {/* Current time indicator */}
          {today && (
            <Box
              sx={{
                position: 'absolute',
                left: 64,
                right: 0,
                height: 2,
                bgcolor: 'primary.main',
                zIndex: 20,
                pointerEvents: 'none',
                top: `${((getHours(new Date()) * 60 + getMinutes(new Date())) / 1440) * 100}%`,
              }}
            >
              <Box sx={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
            </Box>
          )}
        </Box>
      </Box>
    </Stack>
  )
}

// ─── Agenda View ─────────────────────────────────────────────────────────────

function AgendaView({
  currentDate,
  events,
  onEventClick,
  noEventsLabel,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  noEventsLabel: string
}) {
  const theme = useTheme()

  const upcomingDays = eachDayOfInterval({
    start: startOfDay(currentDate),
    end: addDays(currentDate, 30),
  })

  const groupedEvents = upcomingDays
    .map((day) => ({ date: day, events: getEventsForDay(events, day) }))
    .filter((group) => group.events.length > 0)

  if (groupedEvents.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 12 }}>
        <CalendarMonth sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">{noEventsLabel}</Typography>
      </Stack>
    )
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto' }}>
      <Stack spacing={3} sx={{ p: 2 }}>
        {groupedEvents.map((group) => {
          const today = isToday(group.date)
          return (
            <Box key={group.date.toISOString()}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: '50%',
                    flexShrink: 0,
                    ...(today
                      ? { bgcolor: 'primary.main', color: 'primary.contrastText' }
                      : { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', color: 'text.primary' }),
                  }}
                >
                  {format(group.date, 'd')}
                </Box>
                <Stack>
                  <Typography variant="body2" fontWeight={500}>{format(group.date, 'EEEE')}</Typography>
                  <Typography variant="caption" color="text.secondary">{format(group.date, 'MMMM yyyy')}</Typography>
                </Stack>
                {today && <Chip label="Today" size="small" color="primary" sx={{ ml: 'auto !important', fontSize: 10, height: 20 }} />}
              </Stack>
              <Stack spacing={1} sx={{ pl: 0.5 }}>
                {group.events.map((event, idx) => (
                  <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} colorIndex={idx} />
                ))}
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

// ─── Description helpers for location/repeat ──────────────────────────────

function buildDescriptionWithMetadata(description: string, location: string, repeat: RepeatOption): string | null {
  const parts: string[] = []
  if (location.trim()) parts.push(`📍 ${location.trim()}`)
  if (repeat !== 'none') parts.push(`🔁 Repeat: ${repeat}`)
  if (description.trim()) parts.push(description.trim())
  return parts.length > 0 ? parts.join('\n\n') : null
}

function parseDescriptionMetadata(rawDesc: string | null): { description: string; location: string; repeat: RepeatOption } {
  const result: { description: string; location: string; repeat: RepeatOption } = {
    description: '',
    location: '',
    repeat: 'none',
  }
  if (!rawDesc) return result
  const lines = rawDesc.split('\n')
  const descLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('📍 ')) {
      result.location = trimmed.slice(2)
    } else if (trimmed.startsWith('🔁 Repeat: ')) {
      const val = trimmed.slice('🔁 Repeat: '.length)
      if (['daily', 'weekly', 'monthly', 'yearly'].includes(val)) {
        result.repeat = val as RepeatOption
      }
    } else if (trimmed === '' && descLines.length === 0) {
      continue
    } else {
      descLines.push(line)
    }
  }
  result.description = descLines.join('\n').trim()
  return result
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
  const { t, isRTL } = useI18n()
  const theme = useTheme()
  const [form, setForm] = useState<EventFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const isEditing = !!event

  useEffect(() => {
    if (open) {
      if (event) {
        const start = parseISO(event.start_time)
        const end = event.end_time ? parseISO(event.end_time) : addHours(start, 1)
        const parsed = parseDescriptionMetadata(event.description)
        setForm({
          title: event.title,
          description: parsed.description,
          startDate: format(start, 'yyyy-MM-dd'),
          startTime: format(start, 'HH:mm'),
          endDate: format(end, 'yyyy-MM-dd'),
          endTime: format(end, 'HH:mm'),
          allDay: event.all_day,
          color: event.color || '',
          location: parsed.location,
          repeat: parsed.repeat,
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

    const combinedDescription = buildDescriptionWithMetadata(form.description, form.location, form.repeat)
    const startDateTime = form.allDay
      ? `${form.startDate}T00:00:00`
      : `${form.startDate}T${form.startTime}:00`
    const endDateTime = form.allDay
      ? `${form.endDate || form.startDate}T23:59:59`
      : `${form.endDate || form.startDate}T${form.endTime}:00`

    setSaving(true)
    try {
      const supabase = createClient()

      if (isEditing) {
        if (!event) { toast.error('No event selected'); return }
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: form.title.trim(),
            description: combinedDescription,
            start_time: startDateTime,
            end_time: endDateTime,
            all_day: form.allDay,
            color: form.color,
          })
          .eq('id', event.id)
        if (error) throw error
        toast.success('Event updated')
      } else {
        const { error } = await supabase.from('calendar_events').insert({
          family_id: familyId,
          title: form.title.trim(),
          description: combinedDescription,
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: form.allDay,
          color: form.color,
          created_by: form.assignTo || userId,
        })
        if (error) throw error
        toast.success('Event created')
      }

      const calendarStoreModule = await import('@/stores/calendar-store')
      const store = calendarStoreModule.useCalendarStore.getState()
      if (!isEditing) {
        store.addEvent({
          id: `event-${Date.now()}`,
          family_id: familyId,
          title: form.title.trim(),
          description: combinedDescription,
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
          description: combinedDescription,
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: form.allDay,
          color: form.color,
        })
      }

      onSave()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    try {
      const supabase = createClient()
      await supabase.from('calendar_events').delete().eq('id', event.id)
      const calendarStoreModule = await import('@/stores/calendar-store')
      const store = calendarStoreModule.useCalendarStore.getState()
      store.deleteEvent(event.id)
      toast.success('Event deleted')
      onOpenChange(false)
    } catch {
      toast.error('Failed to delete event')
    }
  }

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>{isEditing ? 'Edit Event' : 'New Event'}</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Event title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Enter event title..."
            size="small"
            fullWidth
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Add a description (optional)..."
            multiline
            rows={2}
            size="small"
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            {!form.allDay && (
              <TextField
                label="Start time"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            {!form.allDay && (
              <TextField
                label="End time"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Stack>

          <FormControlLabel
            control={<Switch checked={form.allDay} onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))} />}
            label="All day"
          />

          <TextField
            label="Location"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Add location (optional)"
            size="small"
            fullWidth
            InputProps={{ startAdornment: <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} /> }}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Repeat</InputLabel>
            <Select
              value={form.repeat}
              label="Repeat"
              onChange={(e) => setForm((f) => ({ ...f, repeat: e.target.value as RepeatOption }))}
            >
              <MenuItem value="none">No repeat</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>

          {members.length > 0 && (
            <FormControl size="small" fullWidth>
              <InputLabel>Assign to</InputLabel>
              <Select
                value={form.assignTo || '__none__'}
                label="Assign to"
                onChange={(e) => setForm((f) => ({ ...f, assignTo: e.target.value === '__none__' ? '' : e.target.value }))}
              >
                <MenuItem value="__none__">Unassigned</MenuItem>
                {members.map((member) => (
                  <MenuItem key={member.user_id} value={member.user_id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                        {getMemberInitials(member)}
                      </Avatar>
                      <Typography variant="body2">{getMemberName(member)}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {isEditing && (
          <Button onClick={handleDelete} color="error" startIcon={<Delete sx={{ fontSize: 16 }} />}>Delete</Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={() => onOpenChange(false)} color="inherit">{t.common.cancel}</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.title.trim()}>
          {saving ? t.common.loading : t.common.save}
        </Button>
      </DialogActions>
    </Dialog>
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
  const theme = useTheme()
  const [miniMonth, setMiniMonth] = useState(currentDate)

  useEffect(() => {
    setMiniMonth(currentDate)
  }, [currentDate])

  const monthStart = startOfMonth(miniMonth)
  const monthEnd = endOfMonth(miniMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventDays = useMemo(() => {
    const daySet = new Set<string>()
    events.forEach((event) => {
      const start = format(startOfDay(parseISO(event.start_time)), 'yyyy-MM-dd')
      daySet.add(start)
      if (event.end_time) {
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
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="caption" fontWeight={600}>{t.calendar.miniCalendar}</Typography>
        <Stack direction="row" spacing={0}>
          <IconButton size="small" onClick={() => setMiniMonth((d) => subMonths(d, 1))} sx={{ p: 0.25 }}>
            <ChevronLeft sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton size="small" onClick={() => setMiniMonth((d) => addMonths(d, 1))} sx={{ p: 0.25 }}>
            <ChevronRight sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: 'block', mb: 1 }}>
        {format(miniMonth, 'MMMM yyyy')}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {DAY_LABELS_SHORT.map((d, i) => (
          <Typography key={i} variant="caption" color="text.secondary" sx={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500 }}>
            {d}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => {
          const today = isToday(day)
          const selected = isSameDay(day, currentDate)
          const inMonth = isSameMonth(day, miniMonth)
          const hasEvents = eventDays.has(format(day, 'yyyy-MM-dd'))

          return (
            <IconButton
              key={i}
              size="small"
              onClick={() => onDateSelect(day)}
              sx={{
                height: 28,
                width: '100%',
                borderRadius: 1,
                position: 'relative',
                opacity: inMonth ? 1 : 0.3,
                ...(selected && !today && { bgcolor: `${theme.palette.primary.main}15`, boxShadow: `inset 0 0 0 1px ${theme.palette.primary.main}60` }),
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  lineHeight: 1,
                  ...(today
                    ? { bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }
                    : selected
                    ? { color: 'primary.main', fontWeight: 500 }
                    : { color: 'text.primary' }),
                }}
              >
                {format(day, 'd')}
              </Typography>
              {hasEvents && !today && (
                <Box sx={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
              )}
            </IconButton>
          )
        })}
      </Box>
    </Paper>
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
  const theme = useTheme()

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
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="caption" fontWeight={600}>{t.calendar.upcomingEvents}</Typography>
        <Button size="small" onClick={onViewAll} sx={{ fontSize: 10, minWidth: 0, p: 0 }}>{t.calendar.viewAll}</Button>
      </Stack>

      {upcomingEvents.length === 0 ? (
        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ display: 'block', py: 2 }}>{t.calendar.noEvents}</Typography>
      ) : (
        <Stack spacing={0}>
          {upcomingEvents.map((event, idx) => {
            const member = getMemberForEvent(event)
            const eColor = resolveEventColor(event.color, theme, idx)
            return (
              <Box
                key={event.id}
                onClick={() => onEventClick(event)}
                sx={{
                  width: '100%',
                  textAlign: 'left',
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  borderRadius: 1,
                  transition: 'background-color 0.2s',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: eColor, flexShrink: 0 }} />
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={500} noWrap>{event.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    {event.all_day
                      ? format(parseISO(event.start_time), 'MMM d')
                      : format(parseISO(event.start_time), 'MMM d, h:mm a')}
                  </Typography>
                </Stack>
                {member && (
                  <Tooltip title={getMemberName(member)}>
                    <Avatar sx={{ width: 20, height: 20, fontSize: 9, bgcolor: `${theme.palette.primary.main}20`, color: 'primary.main', fontWeight: 600 }}>
                      {getMemberInitials(member)}
                    </Avatar>
                  </Tooltip>
                )}
              </Box>
            )
          })}
        </Stack>
      )}
    </Paper>
  )
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────

export default function CalendarPage() {
  const { t, isRTL } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))

  const { currentFamily, familyMembers } = useAppStore()
  const {
    events,
    selectedDate,
    view,
    setSelectedDate,
    setView,
    fetchEvents,
  } = useCalendarStore()
  const { user } = useAppStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (currentFamily?.id && user?.id) {
      fetchEvents(currentFamily.id, user.id).catch(() => {})
    }
  }, [currentFamily?.id, user?.id, fetchEvents])

  const familyId = currentFamily?.id || 'demo-family-001'
  const userId = user?.id || 'demo-user-001'
  const members = familyMembers

  const navigatePrev = useCallback(() => {
    setCurrentDate((d) => {
      switch (view) {
        case 'month': return subMonths(d, 1)
        case 'week': return subWeeks(d, 1)
        case 'day': return subDays(d, 1)
        case 'agenda': return subDays(d, 1)
        default: return subMonths(d, 1)
      }
    })
  }, [view])

  const navigateNext = useCallback(() => {
    setCurrentDate((d) => {
      switch (view) {
        case 'month': return addMonths(d, 1)
        case 'week': return addWeeks(d, 1)
        case 'day': return addDays(d, 1)
        case 'agenda': return addDays(d, 1)
        default: return addMonths(d, 1)
      }
    })
  }, [view])

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setModalOpen(true)
  }, [])

  const handleDayClick = useCallback((day: Date) => {
    setCurrentDate(day)
    setView('day')
  }, [setView])

  const handleAddEvent = useCallback(() => {
    setSelectedEvent(null)
    setModalOpen(true)
  }, [])

  const handleViewAll = useCallback(() => {
    setView('agenda')
    setCurrentDate(new Date())
  }, [setView])

  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent) return
    try {
      const supabase = createClient()
      await supabase.from('calendar_events').delete().eq('id', selectedEvent.id)
      const store = useCalendarStore.getState()
      store.deleteEvent(selectedEvent.id)
      toast.success('Event deleted')
    } catch {
      toast.error('Failed to delete event')
    }
    setDeleteConfirmOpen(false)
    setModalOpen(false)
    setSelectedEvent(null)
  }, [selectedEvent])

  // Header label
  const headerLabel = useMemo(() => {
    switch (view) {
      case 'month': return format(currentDate, 'MMMM yyyy')
      case 'week': {
        const ws = startOfWeek(currentDate)
        const we = addDays(ws, 6)
        return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
      }
      case 'day': return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'agenda': return format(currentDate, 'MMMM yyyy')
      default: return format(currentDate, 'MMMM yyyy')
    }
  }, [currentDate, view])

  const viewIcons: Record<CalendarView, React.ReactNode> = {
    month: <CalendarMonth sx={{ fontSize: 18 }} />,
    week: <ViewWeek sx={{ fontSize: 18 }} />,
    day: <ViewDay sx={{ fontSize: 18 }} />,
    agenda: <ViewAgenda sx={{ fontSize: 18 }} />,
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.palette.primary.main}15`, border: `1px solid ${theme.palette.primary.main}30`, display: 'flex' }}>
              <CalendarToday sx={{ color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>{headerLabel}</Typography>
              <Typography variant="body2" color="text.secondary">{events.length} events</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={navigatePrev} size="small"><ChevronLeft /></IconButton>
            <Button size="small" variant="outlined" onClick={navigateToday}>Today</Button>
            <IconButton onClick={navigateNext} size="small"><ChevronRight /></IconButton>

            <Paper variant="outlined" sx={{ display: 'flex', p: 0.25, borderRadius: 2 }}>
              <ToggleButtonGroup
                value={view}
                exclusive
                onChange={(_, v) => { if (v) setView(v as CalendarView) }}
                size="small"
                sx={{ gap: 0.25 }}
              >
                {([
                  ['month', 'Month', <CalendarMonth key="m" sx={{ fontSize: 16 }} />],
                  ['week', 'Week', <ViewWeek key="w" sx={{ fontSize: 16 }} />],
                  ['day', 'Day', <ViewDay key="d" sx={{ fontSize: 16 }} />],
                  ['agenda', 'Agenda', <ViewAgenda key="a" sx={{ fontSize: 16 }} />],
                ] as const).map(([val, label, icon]) => (
                  <ToggleButton
                    key={val}
                    value={val}
                    sx={{ px: 1.5, py: 0.25, borderRadius: 1.5, textTransform: 'none', fontSize: 12, border: 'none' }}
                  >
                    {icon}
                    {!isSmall && <Typography variant="caption" sx={{ ml: 0.5 }}>{label}</Typography>}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Paper>

            <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: 16 }} />} onClick={handleAddEvent}>
              {!isSmall && 'Add Event'}
            </Button>
          </Stack>
        </Stack>

        {/* Main content area */}
        <Stack direction="row" spacing={2}>
          {/* Calendar view */}
          <Paper variant="outlined" sx={{ flex: 1, minHeight: { xs: 400, md: 600 }, overflow: 'hidden', borderRadius: 2 }}>
            {view === 'month' && (
              <MonthView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
                moreEventsLabel={t.calendar.moreEvents}
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
                noEventsLabel={t.calendar.noEvents}
              />
            )}
          </Paper>

          {/* Sidebar — hidden on mobile */}
          {!isMobile && (
            <Stack spacing={2} sx={{ width: 280, flexShrink: 0 }}>
              <MiniCalendar
                currentDate={currentDate}
                onDateSelect={(date) => { setCurrentDate(date) }}
                events={events}
              />
              <UpcomingEventsPanel
                events={events}
                members={members}
                onEventClick={handleEventClick}
                onViewAll={handleViewAll}
              />
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* Event Modal */}
      <EventModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setSelectedEvent(null) }}
        event={selectedEvent}
        familyId={familyId}
        userId={userId}
        onSave={() => { if (currentFamily?.id && user?.id) fetchEvents(currentFamily.id, user.id) }}
        members={members}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to delete this event? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleDeleteEvent} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* FAB for mobile */}
      {isMobile && (
        <Fab
          color="primary"
          onClick={handleAddEvent}
          sx={{ position: 'fixed', bottom: 80, right: 16 }}
        >
          <Add />
        </Fab>
      )}
    </Container>
  )
}
