'use client'

import { create } from 'zustand'
import type { ChatMessage } from '@/types'

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  searchQuery: string
  newMessage: string
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setIsLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setNewMessage: (message: string) => void
  getFilteredMessages: () => ChatMessage[]
  toggleReaction: (messageId: string, emoji: string, userId: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  searchQuery: '',
  newMessage: '',
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => {
    // Deduplicate by message ID to prevent duplicates from socket + realtime
    if (s.messages.some(m => m.id === message.id)) return s
    return { messages: [...s.messages, message] }
  }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setNewMessage: (message) => set({ newMessage: message }),
  getFilteredMessages: () => {
    const { messages, searchQuery } = get()
    if (!searchQuery) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  },
  toggleReaction: (messageId, emoji, userId) => {
    set((s) => ({
      messages: s.messages.map((msg) => {
        if (msg.id !== messageId) return msg

        const reactions = [...(msg.reactions ?? [])]
        const existingIdx = reactions.findIndex((r) => r.emoji === emoji)

        if (existingIdx >= 0) {
          const existing = reactions[existingIdx]
          if (existing.users.includes(userId)) {
            // Remove user from this reaction
            const updatedUsers = existing.users.filter((u) => u !== userId)
            if (updatedUsers.length === 0) {
              // Remove the reaction entirely
              return { ...msg, reactions: reactions.filter((_, i) => i !== existingIdx) }
            }
            return {
              ...msg,
              reactions: reactions.map((r, i) =>
                i === existingIdx ? { ...r, users: updatedUsers } : r
              ),
            }
          } else {
            // Add user to this reaction
            return {
              ...msg,
              reactions: reactions.map((r, i) =>
                i === existingIdx ? { ...r, users: [...r.users, userId] } : r
              ),
            }
          }
        } else {
          // Create new reaction entry
          return {
            ...msg,
            reactions: [...reactions, { emoji, users: [userId] }],
          }
        }
      }),
    }))
  },
}))
