'use client'

import { create } from 'zustand'

const COMPLETED_TOURS_KEY = 'usra-tours-completed'

interface TourState {
  activeTourId: string | null
  isActive: boolean
  currentStep: number
  completedTours: Record<string, boolean>
  welcomeDismissed: boolean
  isCompleting: boolean
  startTour: (tourId?: string) => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  skipTour: () => void
  dismissWelcome: () => void
  setCompleting: (v: boolean) => void
  isTourCompleted: (tourId: string) => boolean
  hydrate: () => void
}

function getInitialCompletedTours(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(COMPLETED_TOURS_KEY)
    if (raw) {
      return JSON.parse(raw) as Record<string, boolean>
    }
    // Migrate legacy single-key format
    if (localStorage.getItem('usra-tour-completed') === 'true') {
      const tours: Record<string, boolean> = { 'usra-plus-main': true }
      persistCompletedTours(tours)
      return tours
    }
  } catch {
    // localStorage not available or corrupt JSON
  }
  return {}
}

function persistCompletedTours(tours: Record<string, boolean>) {
  try {
    localStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(tours))
  } catch {
    // localStorage not available
  }
}

export const useTourStore = create<TourState>((set, get) => ({
  activeTourId: null,
  isActive: false,
  currentStep: 0,
  completedTours: getInitialCompletedTours(),
  welcomeDismissed: false,
  isCompleting: false,

  startTour: (tourId = 'usra-plus-main') => {
    set({
      isActive: true,
      activeTourId: tourId,
      currentStep: 0,
      welcomeDismissed: false,
      isCompleting: false,
    })
  },

  nextStep: () => {
    const { currentStep } = get()
    set({ currentStep: currentStep + 1 })
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  endTour: () => {
    const { activeTourId, completedTours } = get()
    const updated = { ...completedTours }
    if (activeTourId) {
      updated[activeTourId] = true
    }
    persistCompletedTours(updated)
    set({
      isActive: true,   // keep active for celebration
      isCompleting: true,
      completedTours: updated,
    })
  },

  skipTour: () => {
    set({
      isActive: false,
      activeTourId: null,
      welcomeDismissed: false,
      isCompleting: false,
    })
  },

  dismissWelcome: () => {
    set({ welcomeDismissed: true })
  },

  setCompleting: (v: boolean) => {
    if (!v) {
      // Done with celebration — fully deactivate
      set({ isCompleting: false, isActive: false, activeTourId: null })
    } else {
      set({ isCompleting: true })
    }
  },

  isTourCompleted: (tourId: string) => {
    return get().completedTours[tourId] === true
  },

  hydrate: () => {
    const tours = getInitialCompletedTours()
    set({ completedTours: tours })
  },
}))
