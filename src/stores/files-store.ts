'use client'

import { create } from 'zustand'
import type { FamilyFile } from '@/types'

interface FilesState {
  files: FamilyFile[]
  isLoading: boolean
  searchQuery: string
  setFiles: (files: FamilyFile[]) => void
  addFile: (file: FamilyFile) => void
  removeFile: (id: string) => void
  setIsLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
}

export const useFilesStore = create<FilesState>((set) => ({
  files: [],
  isLoading: false,
  searchQuery: '',
  setFiles: (files) => set({ files }),
  addFile: (file) => set((s) => ({ files: [file, ...s.files] })),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
