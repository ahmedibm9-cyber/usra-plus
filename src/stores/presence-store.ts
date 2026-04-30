'use client'

import { create } from 'zustand'

interface PresenceState {
  onlineUsers: Record<string, boolean>
  typingUsers: Record<string, string> // userId -> userName (who is typing)
  setOnline: (userId: string) => void
  setOffline: (userId: string) => void
  setTyping: (userId: string, userName: string) => void
  clearTyping: (userId: string) => void
  isUserOnline: (userId: string) => boolean
  getOnlineCount: () => number
  getOnlineUserIds: () => string[]
  getTypingUsers: () => { userId: string; userName: string }[]
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: {},
  typingUsers: {},

  setOnline: (userId) =>
    set((state) => ({
      onlineUsers: { ...state.onlineUsers, [userId]: true },
    })),

  setOffline: (userId) =>
    set((state) => {
      const { [userId]: _, ...rest } = state.onlineUsers
      return { onlineUsers: rest }
    }),

  setTyping: (userId, userName) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: userName },
    })),

  clearTyping: (userId) =>
    set((state) => {
      const { [userId]: _, ...rest } = state.typingUsers
      return { typingUsers: rest }
    }),

  isUserOnline: (userId) => !!get().onlineUsers[userId],

  getOnlineCount: () => Object.keys(get().onlineUsers).length,

  getOnlineUserIds: () => Object.keys(get().onlineUsers).filter((id) => get().onlineUsers[id]),

  getTypingUsers: () =>
    Object.entries(get().typingUsers).map(([userId, userName]) => ({
      userId,
      userName,
    })),
}))
