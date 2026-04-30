'use client'

import { create } from 'zustand'
import type { AuthView, UserProfile, Language } from '@/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  authView: AuthView
  showTermsModal: boolean
  setUser: (user: UserProfile | null) => void
  setIsAuthenticated: (value: boolean) => void
  setIsLoading: (value: boolean) => void
  setAuthView: (view: AuthView) => void
  setShowTermsModal: (show: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authView: 'login',
  showTermsModal: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setIsAuthenticated: (value) => set({ isAuthenticated: value }),
  setIsLoading: (value) => set({ isLoading: value }),
  setAuthView: (view) => set({ authView: view }),
  setShowTermsModal: (show) => set({ showTermsModal: show }),
  logout: () => set({ user: null, isAuthenticated: false, authView: 'login' }),
}))
