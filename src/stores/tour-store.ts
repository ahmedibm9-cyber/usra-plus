'use client'

import { create } from 'zustand'

interface TourState {
  isActive: boolean
  currentStep: number
  completedTour: boolean
  welcomeDismissed: boolean
  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  skipTour: () => void
  dismissWelcome: () => void
}

function getInitialCompletedTour(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('usra-tour-completed') === 'true'
  } catch {
    return false
  }
}

function setCompletedTourPersist(value: boolean) {
  try {
    localStorage.setItem('usra-tour-completed', value ? 'true' : 'false')
  } catch {
    // localStorage not available
  }
}

export const useTourStore = create<TourState>((set, get) => ({
  isActive: false,
  currentStep: 0,
  completedTour: getInitialCompletedTour(),
  welcomeDismissed: false,
  startTour: () => set({ isActive: true, currentStep: 0, welcomeDismissed: false }),
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
    set({ isActive: false, completedTour: true, welcomeDismissed: false })
    setCompletedTourPersist(true)
  },
  skipTour: () => {
    set({ isActive: false, welcomeDismissed: false })
  },
  dismissWelcome: () => {
    set({ welcomeDismissed: true })
  },
}))
