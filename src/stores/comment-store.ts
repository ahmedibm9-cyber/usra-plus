'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export interface TaskComment {
  id: string
  task_id: string
  parent_id: string | null // null for top-level, id for replies
  author_id: string
  author_name: string
  author_avatar: string | null
  content: string
  created_at: string
  updated_at: string
}

interface CommentState {
  comments: TaskComment[]
  isLoading: boolean
  supabaseAvailable: boolean
  setComments: (comments: TaskComment[]) => void
  addComment: (comment: TaskComment) => void
  updateComment: (comment: TaskComment) => void
  removeComment: (id: string) => void
  setIsLoading: (loading: boolean) => void
  getCommentsForTask: (taskId: string) => TaskComment[]
  getRepliesForComment: (commentId: string) => TaskComment[]
  getCommentCountForTask: (taskId: string) => number
  // Supabase operations
  fetchFromSupabase: (taskId: string) => Promise<void>
  addCommentToSupabase: (comment: TaskComment, userId: string) => Promise<void>
  removeCommentFromSupabase: (id: string) => Promise<void>
}

function isTableNotFoundError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { code?: string; message?: string }
    if (err.code === 'PGRST205' || (err.message && err.message.includes('PGRST205'))) return true
    if (err.message && err.message.includes('does not exist')) return true
  }
  return false
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  isLoading: false,
  supabaseAvailable: true,
  setComments: (comments) => set({ comments }),
  addComment: (comment) => set((s) => ({ comments: [...s.comments, comment] })),
  updateComment: (comment) =>
    set((s) => ({
      comments: s.comments.map((c) => (c.id === comment.id ? comment : c)),
    })),
  removeComment: (id) =>
    set((s) => ({
      comments: s.comments.filter((c) => c.id !== id && c.parent_id !== id),
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  getCommentsForTask: (taskId) => {
    const { comments } = get()
    return comments
      .filter((c) => c.task_id === taskId && c.parent_id === null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  },
  getRepliesForComment: (commentId) => {
    const { comments } = get()
    return comments
      .filter((c) => c.parent_id === commentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  },
  getCommentCountForTask: (taskId) => {
    const { comments } = get()
    return comments.filter((c) => c.task_id === taskId).length
  },

  // ─── Supabase CRUD Operations ────────────────────────────────────────

  fetchFromSupabase: async (taskId: string) => {
    const { supabaseAvailable } = get()
    if (!supabaseAvailable) return
    set({ isLoading: true })
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('task_comments')
        .select('*, author:profiles(id, first_name, last_name, avatar_url)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) {
        if (isTableNotFoundError(error)) {
          set({ supabaseAvailable: false, isLoading: false })
          console.warn('[CommentStore] task_comments table not found, using local-only mode')
          return
        }
        throw error
      }

      if (data) {
        const mapped: TaskComment[] = data.map((row: Record<string, unknown>) => {
          const author = row.author as Record<string, unknown> | null
          const firstName = (author?.first_name as string) ?? ''
          const lastName = (author?.last_name as string) ?? ''
          const nameParts = [firstName, lastName].filter(Boolean)
          return {
            id: row.id as string,
            task_id: row.task_id as string,
            parent_id: (row.parent_id as string) ?? null,
            author_id: row.author_id as string,
            author_name: nameParts.length > 0 ? nameParts.join(' ') : 'User',
            author_avatar: (author?.avatar_url as string) ?? null,
            content: row.content as string,
            created_at: row.created_at as string,
            updated_at: (row.created_at as string), // task_comments doesn't have updated_at
          }
        })

        // Replace only comments for this task, keep others
        const otherComments = get().comments.filter((c) => c.task_id !== taskId)
        set({ comments: [...otherComments, ...mapped], isLoading: false })
      }
    } catch (err) {
      if (isTableNotFoundError(err)) {
        set({ supabaseAvailable: false })
        console.warn('[CommentStore] task_comments table not found, using local-only mode')
      } else {
        console.error('[CommentStore] fetchFromSupabase error:', err)
      }
    } finally {
      set({ isLoading: false })
    }
  },

  addCommentToSupabase: async (comment: TaskComment, userId: string) => {
    // Optimistically add to local state
    get().addComment(comment)

    const { supabaseAvailable } = get()
    if (!supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('task_comments').insert({
        id: comment.id,
        task_id: comment.task_id,
        author_id: userId,
        content: comment.content,
        parent_id: comment.parent_id,
      })

      if (error) {
        if (isTableNotFoundError(error)) {
          set({ supabaseAvailable: false })
          console.warn('[CommentStore] task_comments table not found, using local-only mode')
          return
        }
        throw error
      }
    } catch (err) {
      if (isTableNotFoundError(err)) {
        set({ supabaseAvailable: false })
      } else {
        console.error('[CommentStore] addCommentToSupabase error:', err)
      }
      // Comment is already in local state as fallback
    }
  },

  removeCommentFromSupabase: async (id: string) => {
    // Optimistically remove from local state
    get().removeComment(id)

    const { supabaseAvailable } = get()
    if (!supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('task_comments').delete().eq('id', id)

      if (error) {
        if (isTableNotFoundError(error)) {
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      if (isTableNotFoundError(err)) {
        set({ supabaseAvailable: false })
      } else {
        console.error('[CommentStore] removeCommentFromSupabase error:', err)
      }
    }
  },
}))
