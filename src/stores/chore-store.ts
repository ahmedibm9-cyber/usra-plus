'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export interface Chore {
  id: string
  title: string
  description?: string
  icon: string
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  assignedTo: string[]
  rotationOrder: string[]
  currentAssigneeIndex: number
  lastRotatedAt?: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedMinutes: number
  isPaused: boolean
  createdAt: string
}

export interface ChoreLog {
  id: string
  choreId: string
  completedBy: string
  completedAt: string
  note?: string
}

interface ChoreState {
  chores: Chore[]
  choreLogs: ChoreLog[]
  isLoading: boolean
  supabaseAvailable: boolean
  setChores: (chores: Chore[]) => void
  addChore: (chore: Chore) => void
  updateChore: (chore: Chore) => void
  removeChore: (id: string) => void
  logCompletion: (log: ChoreLog) => void
  rotateChore: (choreId: string) => void
  rotateAllDue: () => void
  pauseChore: (choreId: string) => void
  resumeChore: (choreId: string) => void
  getChoresForPerson: (personId: string) => Chore[]
  getOverdueChores: () => Chore[]
  getCompletionRate: () => number
  getLeaderboard: () => { personId: string; count: number }[]
  // Supabase-backed operations
  fetchFromSupabase: (familyId: string, userId: string) => Promise<void>
  addChoreToSupabase: (chore: Chore, familyId: string, userId: string) => Promise<void>
  updateChoreInSupabase: (id: string, updates: Partial<Chore>, familyId: string) => Promise<void>
  removeChoreFromSupabase: (id: string) => Promise<void>
  logCompletionToSupabase: (log: ChoreLog) => Promise<void>
}

/** Check if a Supabase error indicates the table doesn't exist (PGRST205) */
function isTableNotFoundError(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST205' || (error.message?.includes('PGRST205') ?? false)
}

export const useChoreStore = create<ChoreState>((set, get) => ({
  chores: [],
  choreLogs: [],
  isLoading: false,
  supabaseAvailable: true,

  setChores: (chores) => set({ chores }),
  addChore: (chore) => set((s) => ({ chores: [...s.chores, chore] })),
  updateChore: (chore) =>
    set((s) => ({ chores: s.chores.map((c) => (c.id === chore.id ? chore : c)) })),
  removeChore: (id) =>
    set((s) => ({ chores: s.chores.filter((c) => c.id !== id) })),

  logCompletion: (log) => set((s) => ({ choreLogs: [...s.choreLogs, log] })),

  rotateChore: (choreId) =>
    set((s) => ({
      chores: s.chores.map((c) => {
        if (c.id !== choreId || c.rotationOrder.length === 0) return c
        const nextIndex = (c.currentAssigneeIndex + 1) % c.rotationOrder.length
        return { ...c, currentAssigneeIndex: nextIndex, lastRotatedAt: new Date().toISOString() }
      }),
    })),

  rotateAllDue: () => {
    const now = new Date()
    set((s) => ({
      chores: s.chores.map((c) => {
        if (c.isPaused || c.rotationOrder.length <= 1) return c
        if (!c.lastRotatedAt) return { ...c, lastRotatedAt: now.toISOString() }
        const lastRotated = new Date(c.lastRotatedAt)
        const diffMs = now.getTime() - lastRotated.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        const shouldRotate =
          (c.frequency === 'daily' && diffDays >= 1) ||
          (c.frequency === 'weekly' && diffDays >= 7) ||
          (c.frequency === 'biweekly' && diffDays >= 14) ||
          (c.frequency === 'monthly' && diffDays >= 30)
        if (shouldRotate) {
          const nextIndex = (c.currentAssigneeIndex + 1) % c.rotationOrder.length
          return { ...c, currentAssigneeIndex: nextIndex, lastRotatedAt: now.toISOString() }
        }
        return c
      }),
    }))
  },

  pauseChore: (choreId) =>
    set((s) => ({
      chores: s.chores.map((c) => (c.id === choreId ? { ...c, isPaused: true } : c)),
    })),

  resumeChore: (choreId) =>
    set((s) => ({
      chores: s.chores.map((c) => (c.id === choreId ? { ...c, isPaused: false } : c)),
    })),

  getChoresForPerson: (personId) => {
    const { chores } = get()
    return chores.filter((c) => c.assignedTo.includes(personId))
  },

  getOverdueChores: () => {
    const { chores } = get()
    const now = new Date()
    return chores.filter((c) => {
      if (c.isPaused) return false
      if (!c.lastRotatedAt) return false
      const last = new Date(c.lastRotatedAt)
      const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      return (
        (c.frequency === 'daily' && diffDays > 1.5) ||
        (c.frequency === 'weekly' && diffDays > 8) ||
        (c.frequency === 'biweekly' && diffDays > 15) ||
        (c.frequency === 'monthly' && diffDays > 32)
      )
    })
  },

  getCompletionRate: () => {
    const { chores, choreLogs } = get()
    if (chores.length === 0) return 0
    const today = new Date().toISOString().split('T')[0]
    const todayLogs = choreLogs.filter((l) => l.completedAt.startsWith(today))
    const activeChores = chores.filter((c) => !c.isPaused)
    if (activeChores.length === 0) return 0
    return Math.round((todayLogs.length / activeChores.length) * 100)
  },

  getLeaderboard: () => {
    const { choreLogs } = get()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const weekLogs = choreLogs.filter((l) => l.completedAt >= weekAgo)
    const counts: Record<string, number> = {}
    weekLogs.forEach((l) => {
      counts[l.completedBy] = (counts[l.completedBy] || 0) + 1
    })
    return Object.entries(counts)
      .map(([personId, count]) => ({ personId, count }))
      .sort((a, b) => b.count - a.count)
  },

  // ─── Supabase-backed CRUD ──────────────────────────────────────────

  fetchFromSupabase: async (familyId: string, _userId: string) => {
    set({ isLoading: true })
    try {
      const supabase = createClient()

      // Fetch chores
      const { data: choreData, error: choreError } = await supabase
        .from('chores')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true })

      if (choreError) {
        if (isTableNotFoundError(choreError)) {
          console.warn('[ChoreStore] chores table does not exist yet — falling back to local-only mode')
          set({ supabaseAvailable: false, isLoading: false })
          return
        }
        throw choreError
      }

      if (choreData && choreData.length > 0) {
        const chores: Chore[] = (choreData as Record<string, unknown>[]).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          description: (row.description as string) || undefined,
          icon: (row.icon as string) || '📋',
          frequency: (row.frequency as Chore['frequency']) || 'weekly',
          assignedTo: (row.assigned_to as string[]) || [],
          rotationOrder: (row.rotation_order as string[]) || [],
          currentAssigneeIndex: (row.current_assignee_index as number) || 0,
          lastRotatedAt: (row.last_rotated_at as string) || undefined,
          difficulty: (row.difficulty as Chore['difficulty']) || 'medium',
          estimatedMinutes: (row.estimated_minutes as number) || 15,
          isPaused: (row.is_paused as boolean) || false,
          createdAt: row.created_at as string,
        }))
        set({ chores })
      } else {
        set({ chores: [] })
      }

      // Fetch chore_logs
      const { data: logData, error: logError } = await supabase
        .from('chore_logs')
        .select('*')
        .order('completed_at', { ascending: false })

      if (logError) {
        if (isTableNotFoundError(logError)) {
          console.warn('[ChoreStore] chore_logs table does not exist yet — falling back to local-only mode')
          set({ supabaseAvailable: false, isLoading: false })
          return
        }
        throw logError
      }

      if (logData && logData.length > 0) {
        const choreLogs: ChoreLog[] = (logData as Record<string, unknown>[]).map((row) => ({
          id: row.id as string,
          choreId: row.chore_id as string,
          completedBy: row.completed_by as string,
          completedAt: row.completed_at as string,
          note: (row.note as string) || undefined,
        }))
        set({ choreLogs })
      } else {
        set({ choreLogs: [] })
      }

      set({ supabaseAvailable: true })
    } catch (err) {
      console.warn('[ChoreStore] fetchFromSupabase failed, using local-only mode:', err)
      set({ supabaseAvailable: false })
    } finally {
      set({ isLoading: false })
    }
  },

  addChoreToSupabase: async (chore: Chore, familyId: string, _userId: string) => {
    // Always update local state immediately for responsive UI
    get().addChore(chore)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('chores').insert({
        id: chore.id,
        family_id: familyId,
        title: chore.title,
        description: chore.description || null,
        icon: chore.icon,
        frequency: chore.frequency,
        assigned_to: chore.assignedTo,
        rotation_order: chore.rotationOrder,
        current_assignee_index: chore.currentAssigneeIndex,
        last_rotated_at: chore.lastRotatedAt || null,
        difficulty: chore.difficulty,
        estimated_minutes: chore.estimatedMinutes,
        is_paused: chore.isPaused,
        created_by: _userId,
      })

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[ChoreStore] chores table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[ChoreStore] addChoreToSupabase failed:', err)
    }
  },

  updateChoreInSupabase: async (id: string, updates: Partial<Chore>, _familyId: string) => {
    // Always update local state immediately for responsive UI
    const currentChore = get().chores.find((c) => c.id === id)
    if (currentChore) {
      get().updateChore({ ...currentChore, ...updates })
    }

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      // Map store field names to DB column names
      const dbUpdates: Record<string, unknown> = {}
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.description !== undefined) dbUpdates.description = updates.description || null
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon
      if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency
      if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo
      if (updates.rotationOrder !== undefined) dbUpdates.rotation_order = updates.rotationOrder
      if (updates.currentAssigneeIndex !== undefined) dbUpdates.current_assignee_index = updates.currentAssigneeIndex
      if (updates.lastRotatedAt !== undefined) dbUpdates.last_rotated_at = updates.lastRotatedAt
      if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty
      if (updates.estimatedMinutes !== undefined) dbUpdates.estimated_minutes = updates.estimatedMinutes
      if (updates.isPaused !== undefined) dbUpdates.is_paused = updates.isPaused

      const { error } = await supabase.from('chores').update(dbUpdates).eq('id', id)

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[ChoreStore] chores table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[ChoreStore] updateChoreInSupabase failed:', err)
    }
  },

  removeChoreFromSupabase: async (id: string) => {
    // Always update local state immediately for responsive UI
    get().removeChore(id)
    // Also remove associated logs from local state
    set((s) => ({ choreLogs: s.choreLogs.filter((l) => l.choreId !== id) }))

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      // Delete chore (cascades to chore_logs via FK)
      const { error } = await supabase.from('chores').delete().eq('id', id)

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[ChoreStore] chores table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[ChoreStore] removeChoreFromSupabase failed:', err)
    }
  },

  logCompletionToSupabase: async (log: ChoreLog) => {
    // Always update local state immediately for responsive UI
    get().logCompletion(log)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('chore_logs').insert({
        id: log.id,
        chore_id: log.choreId,
        completed_by: log.completedBy,
        note: log.note || null,
        completed_at: log.completedAt,
      })

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[ChoreStore] chore_logs table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[ChoreStore] logCompletionToSupabase failed:', err)
    }
  },
}))
