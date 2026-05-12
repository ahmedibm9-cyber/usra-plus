'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export type MilestoneType = 'birthday' | 'anniversary' | 'graduation' | 'achievement' | 'custom'

export interface Milestone {
  id: string
  title: string
  date: string // ISO date string
  type: MilestoneType
  description?: string
  personId?: string
  personName?: string
  emoji?: string
  isRecurring: boolean
  notifyDaysBefore: number
  createdAt: string
}

interface MilestoneState {
  milestones: Milestone[]
  isLoading: boolean
  supabaseAvailable: boolean
  setMilestones: (milestones: Milestone[]) => void
  addMilestone: (milestone: Milestone) => void
  updateMilestone: (milestone: Milestone) => void
  removeMilestone: (id: string) => void
  setIsLoading: (loading: boolean) => void
  getUpcoming: (count: number) => Milestone[]
  getByType: (type: MilestoneType) => Milestone[]
  getThisMonth: () => Milestone[]
  getDaysUntil: (id: string) => number | null
  // Supabase-backed operations
  fetchFromSupabase: (familyId: string, userId: string) => Promise<void>
  addMilestoneToSupabase: (milestone: Milestone, familyId: string, userId: string) => Promise<void>
  updateMilestoneInSupabase: (id: string, updates: Partial<Milestone>, familyId: string) => Promise<void>
  removeMilestoneFromSupabase: (id: string) => Promise<void>
}

/** Check if a Supabase error indicates the table doesn't exist (PGRST205) */
function isTableNotFoundError(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST205' || (error.message?.includes('PGRST205') ?? false)
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  milestones: [],
  isLoading: false,
  supabaseAvailable: true,

  setMilestones: (milestones) => set({ milestones }),
  addMilestone: (milestone) => set((state) => ({ milestones: [...state.milestones, milestone] })),
  updateMilestone: (milestone) =>
    set((state) => ({
      milestones: state.milestones.map((m) => (m.id === milestone.id ? milestone : m)),
    })),
  removeMilestone: (id) =>
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
    })),
  setIsLoading: (isLoading) => set({ isLoading }),

  getUpcoming: (count) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysLater = new Date(today.getTime() + 30 * 86400000)

    return get()
      .milestones.filter((m) => {
        const milestoneDate = new Date(m.date)
        // For recurring, compare month/day in current year
        const thisYearDate = new Date(today.getFullYear(), milestoneDate.getMonth(), milestoneDate.getDate())
        return thisYearDate >= today && thisYearDate <= thirtyDaysLater
      })
      .sort((a, b) => {
        const aDate = new Date(a.date)
        const bDate = new Date(b.date)
        const aThisYear = new Date(today.getFullYear(), aDate.getMonth(), aDate.getDate())
        const bThisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate())
        return aThisYear.getTime() - bThisYear.getTime()
      })
      .slice(0, count)
  },

  getByType: (type) => get().milestones.filter((m) => m.type === type),

  getThisMonth: () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    return get().milestones.filter((m) => {
      const d = new Date(m.date)
      return d.getMonth() === currentMonth
    })
  },

  getDaysUntil: (id) => {
    const milestone = get().milestones.find((m) => m.id === id)
    if (!milestone) return null
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const milestoneDate = new Date(milestone.date)
    const thisYearDate = new Date(today.getFullYear(), milestoneDate.getMonth(), milestoneDate.getDate())
    // If already passed this year, check next year
    if (thisYearDate < today) {
      thisYearDate.setFullYear(today.getFullYear() + 1)
    }
    const diffMs = thisYearDate.getTime() - today.getTime()
    return Math.ceil(diffMs / 86400000)
  },

  // ─── Supabase-backed CRUD ──────────────────────────────────────────

  fetchFromSupabase: async (familyId: string, _userId: string) => {
    set({ isLoading: true })
    try {
      const supabase = createClient()

      // Fetch milestones, joining with profiles for personName
      const { data, error } = await supabase
        .from('milestones')
        .select('id, family_id, title, milestone_date, type, description, person_id, emoji, is_recurring, notify_days_before, created_by, created_at, updated_at, profiles!milestones_person_id_fkey(first_name, last_name)')
        .eq('family_id', familyId)
        .order('milestone_date', { ascending: true })

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[MilestoneStore] milestones table does not exist yet — falling back to local-only mode')
          set({ supabaseAvailable: false, isLoading: false })
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        const milestones: Milestone[] = (data as Record<string, unknown>[]).map((row) => {
          const profile = row.profiles as Record<string, string | null> | null
          const personName = profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined
            : undefined

          return {
            id: row.id as string,
            title: row.title as string,
            date: row.milestone_date as string,
            type: (row.type as MilestoneType) || 'custom',
            description: (row.description as string) || undefined,
            personId: (row.person_id as string) || undefined,
            personName,
            emoji: (row.emoji as string) || undefined,
            isRecurring: (row.is_recurring as boolean) || false,
            notifyDaysBefore: (row.notify_days_before as number) || 7,
            createdAt: row.created_at as string,
          }
        })
        set({ milestones })
      } else {
        set({ milestones: [] })
      }

      set({ supabaseAvailable: true })
    } catch (err) {
      console.warn('[MilestoneStore] fetchFromSupabase failed, using local-only mode:', err)
      set({ supabaseAvailable: false })
    } finally {
      set({ isLoading: false })
    }
  },

  addMilestoneToSupabase: async (milestone: Milestone, familyId: string, _userId: string) => {
    // Always update local state immediately for responsive UI
    get().addMilestone(milestone)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('milestones').insert({
        id: milestone.id,
        family_id: familyId,
        title: milestone.title,
        milestone_date: milestone.date,
        type: milestone.type,
        description: milestone.description || null,
        person_id: milestone.personId || null,
        emoji: milestone.emoji || null,
        is_recurring: milestone.isRecurring,
        notify_days_before: milestone.notifyDaysBefore,
        created_by: _userId,
      })

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[MilestoneStore] milestones table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[MilestoneStore] addMilestoneToSupabase failed:', err)
    }
  },

  updateMilestoneInSupabase: async (id: string, updates: Partial<Milestone>, _familyId: string) => {
    // Always update local state immediately for responsive UI
    const currentMilestone = get().milestones.find((m) => m.id === id)
    if (currentMilestone) {
      get().updateMilestone({ ...currentMilestone, ...updates })
    }

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      // Map store field names to DB column names
      const dbUpdates: Record<string, unknown> = {}
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.date !== undefined) dbUpdates.milestone_date = updates.date
      if (updates.type !== undefined) dbUpdates.type = updates.type
      if (updates.description !== undefined) dbUpdates.description = updates.description || null
      if (updates.personId !== undefined) dbUpdates.person_id = updates.personId || null
      if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji || null
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring
      if (updates.notifyDaysBefore !== undefined) dbUpdates.notify_days_before = updates.notifyDaysBefore

      const { error } = await supabase.from('milestones').update(dbUpdates).eq('id', id)

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[MilestoneStore] milestones table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[MilestoneStore] updateMilestoneInSupabase failed:', err)
    }
  },

  removeMilestoneFromSupabase: async (id: string) => {
    // Always update local state immediately for responsive UI
    get().removeMilestone(id)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('milestones').delete().eq('id', id)

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[MilestoneStore] milestones table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[MilestoneStore] removeMilestoneFromSupabase failed:', err)
    }
  },
}))
