'use client'

import { create } from 'zustand'

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
  setComments: (comments: TaskComment[]) => void
  addComment: (comment: TaskComment) => void
  updateComment: (comment: TaskComment) => void
  removeComment: (id: string) => void
  setIsLoading: (loading: boolean) => void
  getCommentsForTask: (taskId: string) => TaskComment[]
  getRepliesForComment: (commentId: string) => TaskComment[]
  getCommentCountForTask: (taskId: string) => number
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  isLoading: false,
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
}))
