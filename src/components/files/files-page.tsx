'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Upload,
  Search,
  File,
  ImageIcon,
  FileText,
  Film,
  Music,
  Archive,
  Trash2,
  Grid3X3,
  List,
  Download,
  Eye,
  X,
  Cloud,
  HardDrive,
  MoreVertical,
  FolderOpen,
  AlertTriangle,
  Video,
  FileType2,
  Table,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { UpgradeModal } from '@/components/shared/upgrade-modal'
import { useI18n } from '@/i18n/use-translation'
import type { FamilyFile } from '@/types'
import { EmptyState } from '@/components/shared/empty-state'
import { FileCardSkeleton } from '@/components/shared/skeleton-patterns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

function getFileIcon(fileType: string, fileName?: string) {
  const ext = fileName ? getFileExtension(fileName) : ''
  // Specific extension-based icons
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon
  if (['pdf'].includes(ext) || fileType.includes('pdf')) return FileText
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext) || fileType.startsWith('video/')) return Video
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext) || fileType.startsWith('audio/')) return Music
  if (['doc', 'docx'].includes(ext) || fileType.includes('word') || fileType.includes('document'))
    return FileType2
  if (['xls', 'xlsx', 'csv'].includes(ext) || fileType.includes('spreadsheet') || fileType.includes('excel'))
    return Table
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || fileType.includes('zip') || fileType.includes('rar'))
    return Archive
  // Fallback to MIME type
  if (fileType.startsWith('image/')) return ImageIcon
  if (fileType.startsWith('video/')) return Film
  if (fileType.startsWith('audio/')) return Music
  return File
}

function getFileIconColor(fileType: string, fileName?: string) {
  const ext = fileName ? getFileExtension(fileName) : ''
  // Specific extension-based colors
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || fileType.startsWith('image/'))
    return 'bg-pink-500/15 text-pink-400'
  if (['pdf'].includes(ext) || fileType.includes('pdf'))
    return 'bg-red-500/15 text-red-400'
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext) || fileType.startsWith('video/'))
    return 'bg-purple-500/15 text-purple-400'
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext) || fileType.startsWith('audio/'))
    return 'bg-amber-500/15 text-amber-400'
  if (['doc', 'docx'].includes(ext) || fileType.includes('word') || fileType.includes('document'))
    return 'bg-blue-500/15 text-blue-400'
  if (['xls', 'xlsx', 'csv'].includes(ext) || fileType.includes('spreadsheet') || fileType.includes('excel'))
    return 'bg-green-500/15 text-green-400'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || fileType.includes('zip') || fileType.includes('rar'))
    return 'bg-orange-500/15 text-orange-400'
  return 'bg-gray-500/15 text-gray-400'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatFileType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'image/svg+xml': 'SVG',
    'video/mp4': 'MP4',
    'video/webm': 'WebM',
    'audio/mpeg': 'MP3',
    'audio/wav': 'WAV',
    'audio/ogg': 'OGG',
    'application/pdf': 'PDF',
    'application/zip': 'ZIP',
    'application/x-rar-compressed': 'RAR',
  }
  return map[mimeType] ?? mimeType.split('/').pop()?.toUpperCase() ?? 'FILE'
}

export function FilesPage() {
  const { currentFamily, familyMembers } = useAppStore()
  const { user } = useAuthStore()
  const { t, isRTL } = useI18n()
  const { canUploadFile, plan, getFeatureLimit } = useSubscriptionStore()
  const storageLimit = getFeatureLimit('storage')

  const [files, setFiles] = useState<FamilyFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [showUpload, setShowUpload] = useState(false)
  const [previewFile, setPreviewFile] = useState<FamilyFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const familyId = currentFamily?.id
  const userId = user?.id

  // Fetch files
  const fetchFiles = useCallback(async () => {
    if (!familyId) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('family_files')
        .select('*, uploader:profiles(*)')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setFiles(data as FamilyFile[])
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }, [familyId, t])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // Upload files
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (!familyId || !userId) return
    const filesToUpload = Array.from(fileList)
    if (filesToUpload.length === 0) return

    setIsUploading(true)
    try {
      const supabase = createClient()
      let successCount = 0

      for (const file of filesToUpload) {
        const filePath = `${familyId}/${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('family-files')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        if (uploadData) {
          const { data: urlData } = supabase.storage.from('family-files').getPublicUrl(filePath)

          const { error: insertError } = await supabase.from('family_files').insert({
            family_id: familyId,
            name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: filePath,
            url: urlData.publicUrl,
            uploaded_by: userId,
          })

          if (insertError) {
            console.error('Insert error:', insertError)
          } else {
            successCount++
          }
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded!`)
        fetchFiles()
      }
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsUploading(false)
      setShowUpload(false)
      setIsDragOver(false)
    }
  }

  // Delete file
  const handleDeleteFile = async (file: FamilyFile) => {
    setDeletingId(file.id)
    try {
      const supabase = createClient()

      // Delete from storage
      if (file.storage_path) {
        await supabase.storage.from('family-files').remove([file.storage_path])
      }

      // Delete from database
      const { error } = await supabase.from('family_files').delete().eq('id', file.id)
      if (error) throw error

      setFiles((prev) => prev.filter((f) => f.id !== file.id))
      toast.success(t.common.success)
      if (previewFile?.id === file.id) setPreviewFile(null)
    } catch {
      toast.error(t.common.error)
    } finally {
      setDeletingId(null)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      if (isStorageFull) {
        setUpgradeModalOpen(true)
        return
      }
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  // Filter and sort
  const filteredFiles = files
    .filter((f) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return f.name.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.file_size - a.file_size
        case 'type':
          return a.file_type.localeCompare(b.file_type)
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  // Storage calculation (simulated) - use plan-based limit
  const usedStorage = files.reduce((acc, f) => acc + f.file_size, 0)
  // For demo: simulate 72MB used storage for free plan users to show gating works
  const demoUsedStorage = plan === 'free' ? 72 * 1024 * 1024 : usedStorage
  const effectiveUsedStorage = usedStorage > 0 ? usedStorage : demoUsedStorage
  const totalStorage = storageLimit ?? 1024 * 1024 * 1024
  const storagePercentage = Math.min(Math.round((effectiveUsedStorage / totalStorage) * 100), 100)
  const isStorageFull = !canUploadFile(effectiveUsedStorage)

  const handleUploadClick = useCallback(() => {
    if (isStorageFull) {
      setUpgradeModalOpen(true)
      return
    }
    setShowUpload(true)
  }, [isStorageFull])

  const getUploaderName = (uploaderId: string) => {
    const member = familyMembers.find((m) => m.user_id === uploaderId)
    if (member?.profiles?.first_name) {
      return member.profiles.first_name
    }
    return member?.nickname ?? 'Unknown'
  }

  // Image files for lightbox navigation
  const imageFiles = useMemo(() => filteredFiles.filter((f) => f.file_type.startsWith('image/')), [filteredFiles])

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (!previewFile || imageFiles.length <= 1) return
    const currentIndex = imageFiles.findIndex((f) => f.id === previewFile.id)
    if (currentIndex === -1) return
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % imageFiles.length
      : (currentIndex - 1 + imageFiles.length) % imageFiles.length
    setPreviewFile(imageFiles[newIndex])
  }, [previewFile, imageFiles])

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewFile) return
      if (e.key === 'Escape') setPreviewFile(null)
      if (e.key === 'ArrowLeft') navigateLightbox('prev')
      if (e.key === 'ArrowRight') navigateLightbox('next')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewFile, navigateLightbox])

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0B0F]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20">
              <FolderOpen className="w-5 h-5 text-[#6366F1]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#E5E7EB]">
                {t.files.title}
              </h1>
              <p className="text-sm text-[#6B7280]">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-[#111117] border border-white/[0.08] rounded-xl p-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={`h-8 w-8 rounded-lg ${
                  viewMode === 'grid'
                    ? 'bg-[#6366F1]/10 text-[#6366F1]'
                    : 'text-[#6B7280] hover:text-[#E5E7EB]'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={`h-8 w-8 rounded-lg ${
                  viewMode === 'list'
                    ? 'bg-[#6366F1]/10 text-[#6366F1]'
                    : 'text-[#6B7280] hover:text-[#E5E7EB]'
                }`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-[120px] bg-[#111117] border-white/[0.08] text-[#E5E7EB] rounded-xl h-9 text-xs focus:ring-[#6366F1]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] rounded-xl">
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>

            {/* Upload button */}
            <Button
              onClick={handleUploadClick}
              className="bg-[#6366F1] hover:bg-[#5558E6] text-white gap-2 rounded-xl h-9 px-4 btn-glow btn-press"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{t.files.upload}</span>
            </Button>
          </div>
        </div>

        {/* Storage usage */}
        <div className="mt-5 bg-[#111117] border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#6B7280]" />
              <span className="text-sm font-medium text-[#E5E7EB]">{t.files.storageUsed}</span>
            </div>
            <span className="text-xs text-[#6B7280]">
              {formatFileSize(effectiveUsedStorage)} of {formatFileSize(totalStorage)}
            </span>
          </div>
          <Progress
            value={storagePercentage}
            className={`h-2 bg-white/[0.06] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-[#6366F1] [&>[data-slot=indicator]]:to-[#A78BFA] ${
              isStorageFull ? '[&>[data-slot=indicator]]:from-red-500 [&>[data-slot=indicator]]:to-red-400' : ''
            }`}
          />
          {isStorageFull && (
            <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-[11px] text-red-300">
                {isRTL ? 'مساحة التخزين ممتلئة! قم بالترقية لمزيد من المساحة.' : 'Storage full! Upgrade for more space.'}
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.files.search}
            className="pl-10 bg-[#111117] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Files Area */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <FileCardSkeleton count={6} />
          </div>
        ) : filteredFiles.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No files uploaded"
            description="Upload your first file to share with family"
            action={{ label: 'Upload File', onClick: handleUploadClick }}
          />
        ) : viewMode === 'grid' ? (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredFiles.map((file, index) => {
                  const Icon = getFileIcon(file.file_type, file.name)
                  const iconColor = getFileIconColor(file.file_type, file.name)
                  const isImage = file.file_type.startsWith('image/')

                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.03 }}
                      className="group bg-[#111117] border border-white/[0.08] rounded-2xl p-4 hover:border-white/[0.16] hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                      onClick={() => isImage && setPreviewFile(file)}
                    >
                      {/* File icon / preview */}
                      <div className="flex items-center justify-center h-20 mb-3">
                        {isImage ? (
                          <div className="w-full h-full rounded-lg overflow-hidden bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center">
                            {file.url ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-pink-400/60" />
                            )}
                          </div>
                        ) : (
                          <div className={`p-3 rounded-xl ${iconColor}`}>
                            <Icon className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* File info */}
                      <p className="text-xs font-medium text-[#E5E7EB] truncate mb-0.5">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-[#6B7280] mb-1">
                        {formatFileSize(file.file_size)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#6B7280]">
                          {format(new Date(file.created_at), 'MMM d')}
                        </span>
                        <span className="text-[10px] text-[#A78BFA]">
                          {getUploaderName(file.uploaded_by)}
                        </span>
                      </div>

                      {/* Hover actions */}
                      <div className="mt-2 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-[#6B7280] hover:text-[#E5E7EB]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] rounded-xl"
                          >
                            {isImage && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewFile(file)
                                }}
                                className="focus:bg-[#6366F1]/10 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                Preview
                              </DropdownMenuItem>
                            )}
                            {file.url && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(file.url!, '_blank')
                                }}
                                className="focus:bg-[#6366F1]/10 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 mr-2" />
                                Download
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteFile(file)
                              }}
                              disabled={deletingId === file.id}
                              className="focus:bg-red-500/10 text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        ) : (
          /* List View */
          <ScrollArea className="h-full">
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {filteredFiles.map((file, index) => {
                  const Icon = getFileIcon(file.file_type, file.name)
                  const iconColor = getFileIconColor(file.file_type, file.name)
                  const isImage = file.file_type.startsWith('image/')

                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className="group flex items-center gap-3 bg-[#111117] border border-white/[0.08] rounded-xl px-4 py-3 hover:border-white/[0.12] transition-all duration-200 cursor-pointer"
                      onClick={() => isImage && setPreviewFile(file)}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-lg flex-shrink-0 ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#E5E7EB] truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 border-white/[0.06] text-[#6B7280]"
                          >
                            {formatFileType(file.file_type)}
                          </Badge>
                          <span className="text-[10px] text-[#6B7280]">
                            {formatFileSize(file.file_size)}
                          </span>
                          <span className="text-[10px] text-[#6B7280]">·</span>
                          <span className="text-[10px] text-[#6B7280]">
                            {getUploaderName(file.uploaded_by)}
                          </span>
                        </div>
                      </div>

                      {/* Date */}
                      <span className="text-xs text-[#6B7280] flex-shrink-0 hidden sm:block">
                        {format(new Date(file.created_at), 'MMM d, yyyy')}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isImage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#6B7280] hover:text-[#E5E7EB]"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewFile(file)
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {file.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#6B7280] hover:text-[#E5E7EB]"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(file.url!, '_blank')
                            }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#6B7280] hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFile(file)
                          }}
                          disabled={deletingId === file.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature="storage"
        currentCount={Math.round(effectiveUsedStorage / (1024 * 1024))}
        limit={Math.round(totalStorage / (1024 * 1024))}
      />

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#E5E7EB] flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#6366F1]/10">
                <Upload className="w-4 h-4 text-[#6366F1]" />
              </div>
              {t.files.upload}
            </DialogTitle>
          </DialogHeader>
          <div
            className={`
              mt-4 border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
              ${
                isDragOver
                  ? 'border-[#6366F1] bg-[#6366F1]/5'
                  : 'border-white/[0.08] hover:border-white/[0.15]'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={`mx-auto p-4 rounded-2xl w-fit mb-4 ${isDragOver ? 'bg-[#6366F1]/10' : 'bg-white/[0.04]'}`}>
              <Cloud className={`w-8 h-8 ${isDragOver ? 'text-[#6366F1]' : 'text-[#6B7280]'}`} />
            </div>
            <p className="text-sm font-medium text-[#E5E7EB] mb-1">
              {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-[#6B7280] mb-4">
              or click to browse from your device
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="border-white/[0.08] text-[#E5E7EB] hover:bg-white/[0.06] hover:text-[#E5E7EB] rounded-xl"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </div>
              ) : (
                'Browse Files'
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUploadFiles(e.target.files)
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowUpload(false)}
              className="text-[#6B7280] hover:text-[#E5E7EB] rounded-xl"
            >
              {t.common.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Lightbox */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setPreviewFile(null)}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewFile(null)
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Navigation arrows */}
            {imageFiles.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateLightbox('prev')
                  }}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateLightbox('next')
                  }}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {previewFile.url && (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              )}
            </motion.div>

            {/* File info at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between max-w-3xl mx-auto">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <div>
                    <p className="text-sm font-medium text-white truncate max-w-[300px]">
                      {previewFile.name}
                    </p>
                    <p className="text-xs text-white/60">
                      {formatFileSize(previewFile.file_size)} · {format(new Date(previewFile.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (previewFile.url) window.open(previewFile.url!, '_blank')
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFile(previewFile)
                    }}
                    disabled={deletingId === previewFile.id}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
