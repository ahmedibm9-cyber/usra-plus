'use client'

import { create } from 'zustand'
import type { CalendarEvent } from '@/types'

interface CalendarState {
  events: CalendarEvent[]
  isLoading: boolean
  searchQuery: string
  setEvents: (events: CalendarEvent[]) => void
  addEvent: (event: CalendarEvent) => void
  updateEvent: (event: CalendarEvent) => void
  removeEvent: (id: string) => void
  setIsLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  isLoading: false,
  searchQuery: '',
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((s) => ({ events: [event, ...s.events] })),
  updateEvent: (event) =>
    set((s) => ({
      events: s.events.map((e) => (e.id === event.id ? event : e)),
    })),
  removeEvent: (id) =>
    set((s) => ({
      events: s.events.filter((e) => e.id !== id),
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
