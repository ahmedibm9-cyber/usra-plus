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
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  searchQuery: '',
  newMessage: '',
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setNewMessage: (message) => set({ newMessage: message }),
  getFilteredMessages: () => {
    const { messages, searchQuery } = get()
    if (!searchQuery) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  },
}))
