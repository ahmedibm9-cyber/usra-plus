/**
 * Zustand Selector Hooks — Performance-optimized store access
 *
 * Using these selector hooks instead of full-store destructuring prevents
 * cascade re-renders. When you destructure the entire store
 * (e.g., `const { x, y } = useAppStore()`), the component re-renders
 * whenever ANY property in the store changes. With selectors
 * (e.g., `const x = useCurrentPage()`), the component only re-renders
 * when the specific selected value changes.
 *
 * IMPORTANT: Action functions (setCurrentPage, setUser, etc.) are stable
 * references and do not cause re-renders on their own. They can be safely
 * extracted via selectors or directly.
 */

import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { useTaskStore } from '@/stores/task-store'
import { useNotificationStore } from '@/stores/notification-store'

import type { AppPage, Family, FamilyMember, Theme, SubscriptionPlan, UserProfile, Task, Notification } from '@/types'

// ─── App Store Selectors ────────────────────────────────────────────────────

/** Select currentPage — re-renders only when the active page changes */
export function useCurrentPage(): AppPage {
  return useAppStore((state) => state.currentPage)
}

/** Select currentFamily — re-renders only when the family object changes */
export function useCurrentFamily(): Family | null {
  return useAppStore((state) => state.currentFamily)
}

/** Select theme — re-renders only when theme toggles */
export function useIsDarkMode(): boolean {
  return useAppStore((state) => state.theme === 'dark')
}

/** Select showOnboarding — re-renders only when onboarding visibility changes */
export function useShowOnboarding(): boolean {
  return useAppStore((state) => state.showOnboarding)
}

/** Select demoDataReady — re-renders only when demo data readiness changes */
export function useDemoDataReady(): boolean {
  return useAppStore((state) => state.demoDataReady)
}

/** Select sidebarCollapsed — re-renders only when sidebar collapse state changes */
export function useSidebarCollapsed(): boolean {
  return useAppStore((state) => state.sidebarCollapsed)
}

/** Select familyColor — re-renders only when family color changes */
export function useFamilyColor(): string {
  return useAppStore((state) => state.familyColor)
}

/** Select familyAvatar — re-renders only when family avatar changes */
export function useFamilyName(): string {
  const family = useAppStore((state) => state.currentFamily)
  return family?.name ?? ''
}

// ─── Auth Store Selectors ───────────────────────────────────────────────────

/** Select isAuthenticated — re-renders only when auth status changes */
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.isAuthenticated)
}

/** Select currentUser — re-renders only when the user profile changes */
export function useCurrentUser(): UserProfile | null {
  return useAuthStore((state) => state.user)
}

/** Select authLoading — re-renders only when loading state changes */
export function useAuthLoading(): boolean {
  return useAuthStore((state) => state.isLoading)
}

// ─── Subscription Store Selectors ───────────────────────────────────────────

/** Select currentPlan — re-renders only when the plan changes */
export function useCurrentPlan(): SubscriptionPlan {
  return useSubscriptionStore((state) => state.plan)
}

/** Select plan features (via getFeatureLimit) — stable action reference, no re-renders from this alone */
export function usePlanFeatures() {
  return useSubscriptionStore((state) => ({
    canCreateTask: state.canCreateTask,
    canCreateFamily: state.canCreateFamily,
    canUploadFile: state.canUploadFile,
    getFeatureLimit: state.getFeatureLimit,
    canUseAISuggestion: state.canUseAISuggestion,
    canAccessMealPlan: state.canAccessMealPlan,
    canCustomizeAvatar: state.canCustomizeAvatar,
  }))
}

/** Select isPro — re-renders only when pro status changes */
export function useIsPro(): boolean {
  return useSubscriptionStore((state) => state.isPro())
}

/** Select isFree — re-renders only when plan is free */
export function useIsFree(): boolean {
  return useSubscriptionStore((state) => state.plan === 'free')
}

// ─── Task Store Selectors ───────────────────────────────────────────────────

/** Select tasks array — re-renders only when tasks change */
export function useTasks(): Task[] {
  return useTaskStore((state) => state.tasks)
}

/** Select taskLoading — re-renders only when loading state changes */
export function useTaskLoading(): boolean {
  return useTaskStore((state) => state.isLoading)
}

// ─── Notification Store Selectors ───────────────────────────────────────────

/** Select notifications array — re-renders only when notifications change */
export function useNotifications(): Notification[] {
  return useNotificationStore((state) => state.notifications)
}

/** Select unreadCount — re-renders only when unread count changes */
export function useUnreadCount(): number {
  return useNotificationStore((state) => state.unreadCount)
}
