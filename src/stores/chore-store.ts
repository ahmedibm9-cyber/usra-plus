'use client'

import { create } from 'zustand'

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
}

export const useChoreStore = create<ChoreState>((set, get) => ({
  chores: [],
  choreLogs: [],

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
}))
