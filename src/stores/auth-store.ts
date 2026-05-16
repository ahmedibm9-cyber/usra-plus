'use client'

import { create } from 'zustand'
import type { AuthView, UserProfile, Language } from '@/types'
import { setUserContext, clearUserContext } from '@/lib/error-reporting'

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
  logout: () => Promise<void>
}

/**
 * Clear auth-related items from localStorage to prevent data leakage.
 */
function clearAuthLocalStorage() {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove = [
      'usra-auth-token',
      'usra-user',
      'usra-session',
      'usra-last-email',
    ]
    keysToRemove.forEach(key => {
      try { localStorage.removeItem(key) } catch { /* ignore */ }
    })
    // Also clear any keys that start with 'usra-auth' or 'usra-session'
    const allKeys = Object.keys(localStorage)
    allKeys.forEach(key => {
      if (key.startsWith('usra-auth') || key.startsWith('usra-session')) {
        try { localStorage.removeItem(key) } catch { /* ignore */ }
      }
    })
  } catch { /* localStorage not available */ }
}

/**
 * Reset all domain stores on logout to prevent data leakage between sessions.
 * Each import is explicit (not dynamic variable-based) so that the bundler
 * can resolve them statically. This avoids Turbopack "Can't resolve <dynamic>" errors.
 */
async function resetAllStores() {
  // Reset data stores in parallel — each import is static for bundler resolution
  await Promise.allSettled([
    import('@/stores/task-store').then(m => { if (m.useTaskStore?.getState()?.setTasks) m.useTaskStore.getState().setTasks([]) }),
    import('@/stores/chat-store').then(m => { if (m.useChatStore?.getState()?.setMessages) m.useChatStore.getState().setMessages([]) }),
    import('@/stores/grocery-store').then(m => { if (m.useGroceryStore?.getState()?.setItems) m.useGroceryStore.getState().setItems([]) }),
    import('@/stores/calendar-store').then(m => { if (m.useCalendarStore?.getState()?.setEvents) m.useCalendarStore.getState().setEvents([]) }),
    import('@/stores/budget-store').then(m => { if (m.useBudgetStore?.getState()?.setExpenses) m.useBudgetStore.getState().setExpenses([]) }),
    import('@/stores/chore-store').then(m => { if (m.useChoreStore?.getState()?.setChores) m.useChoreStore.getState().setChores([]) }),
    import('@/stores/meal-store').then(m => { if (m.useMealStore?.getState()?.setMeals) m.useMealStore.getState().setMeals([]) }),
    import('@/stores/milestone-store').then(m => { if (m.useMilestoneStore?.getState()?.setMilestones) m.useMilestoneStore.getState().setMilestones([]) }),
    import('@/stores/comment-store').then(m => { if (m.useCommentStore?.getState()?.setComments) m.useCommentStore.getState().setComments([]) }),
    import('@/stores/files-store').then(m => { if (m.useFilesStore?.getState()?.setFiles) m.useFilesStore.getState().setFiles([]) }),
    import('@/stores/notification-store').then(m => { if (m.useNotificationStore?.getState()?.setNotifications) m.useNotificationStore.getState().setNotifications([]) }),
  ])

  // Reset admin auth on user logout
  try {
    const { useAdminAuthStore } = await import('@/stores/admin-auth-store')
    useAdminAuthStore.getState().logoutAdmin()
  } catch { /* store may not be loaded */ }

  // Reset app store
  try {
    const { useAppStore } = await import('@/stores/app-store')
    useAppStore.getState().setCurrentFamily(null)
    useAppStore.getState().setFamilies([])
    useAppStore.getState().setFamilyMembers([])
  } catch { /* store may not be loaded */ }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authView: 'login',
  showTermsModal: false,
  setUser: (user) => {
   if (user) {
    setUserContext(user.id, user.email)
   }
   set({ user, isAuthenticated: !!user })
  },
  setIsAuthenticated: (value) => set({ isAuthenticated: value }),
  setIsLoading: (value) => set({ isLoading: value }),
  setAuthView: (view) => set({ authView: view }),
  setShowTermsModal: (show) => set({ showTermsModal: show }),
  logout: async () => {
    // Step 1: Call logout API FIRST to clear the httpOnly cookie before re-render
    try {
      const { localLogout } = await import('@/lib/local-auth')
      await localLogout()
    } catch (err) {
      console.error('[AuthStore] Local logout API error:', err)
    }

    // Step 2: Also sign out from Supabase if available
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut()
      }
    } catch { /* Supabase not available or already signed out */ }

    // Step 3: Clear auth-related localStorage items
    clearAuthLocalStorage()

    // Step 4: Reset all domain stores to prevent data leakage
    await resetAllStores()

    // Step 5: Clear Sentry user context
    clearUserContext()

    // Step 6: Finally set auth state to logged out
    set({ user: null, isAuthenticated: false, authView: 'login' })
  },
}))
