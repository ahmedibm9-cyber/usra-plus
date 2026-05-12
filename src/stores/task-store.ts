'use client'

import { create } from 'zustand'
import type { Task, TaskPriority, TaskStatus } from '@/types'

interface TaskState {
  tasks: Task[]
  isLoading: boolean
  searchQuery: string
  filterStatus: TaskStatus | 'all'
  filterPriority: TaskPriority | 'all'
  sortBy: 'due_date' | 'priority' | 'created_at' | 'status' | 'manual'
  showAddTask: boolean
  editingTask: Task | null
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  removeTask: (id: string) => void
  setIsLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setFilterStatus: (status: TaskStatus | 'all') => void
  setFilterPriority: (priority: TaskPriority | 'all') => void
  setSortBy: (sort: 'due_date' | 'priority' | 'created_at' | 'status' | 'manual') => void
  setShowAddTask: (show: boolean) => void
  setEditingTask: (task: Task | null) => void
  getFilteredTasks: () => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  searchQuery: '',
  filterStatus: 'all',
  filterPriority: 'all',
  sortBy: 'created_at',
  showAddTask: false,
  editingTask: null,
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (task) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setShowAddTask: (show) => set({ showAddTask: show }),
  setEditingTask: (task) => set({ editingTask: task }),
  getFilteredTasks: () => {
    const { tasks, searchQuery, filterStatus, filterPriority, sortBy } = get()
    let filtered = [...tasks]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      )
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) => t.status === filterStatus)
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter((t) => t.priority === filterPriority)
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        case 'priority': {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        case 'status': {
          const statusOrder = { todo: 0, in_progress: 1, done: 2 }
          return statusOrder[a.status] - statusOrder[b.status]
        }
        case 'manual':
          return 0
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    return filtered
  },
}))
