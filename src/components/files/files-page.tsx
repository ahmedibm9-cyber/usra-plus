'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import type { FamilyFile } from '@/types'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return ImageIcon
  if (fileType.startsWith('video/')) return Film
  if (fileType.startsWith('audio/')) return Music
  if (
    fileType.includes('pdf') ||
    fileType.includes('document') ||
    fileType.includes('text') ||
    fileType.includes('word') ||
    fileType.includes('spreadsheet')
  )
    return FileText
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z'))
    return Archive
  return File
}

function getFileIconColor(fileType: string) {
  if (fileType.startsWith('image/')) return 'text-pink-400 bg-pink-500/10'
  if (fileType.startsWith('video/')) return 'text-purple-400 bg-purple-500/10'
  if (fileType.startsWith('audio/')) return 'text-amber-400 bg-amber-500/10'
  if (fileType.includes('pdf')) return 'text-red-400 bg-red-500/10'
  if (fileType.includes('word') || fileType.includes('document'))
    return 'text-blue-400 bg-blue-500/10'
  if (fileType.includes('spreadsheet') || fileType.includes('excel'))
    return 'text-green-400 bg-green-500/10'
  if (fileType.includes('zip') || fileType.includes('rar')) return 'text-orange-400 bg-orange-500/10'
  return 'text-gray-400 bg-gray-500/10'
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
  const { t } = useI18n()

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

  // Storage calculation (simulated)
  const totalStorage = 1024 * 1024 * 1024 // 1 GB in bytes
  const usedStorage = files.reduce((acc, f) => acc + f.file_size, 0)
  const storagePercentage = Math.min(Math.round((usedStorage / totalStorage) * 100), 100)

  const getUploaderName = (uploaderId: string) => {
    const member = familyMembers.find((m) => m.user_id === uploaderId)
    if (member?.profiles?.first_name) {
      return member.profiles.first_name
    }
    return member?.nickname ?? 'Unknown'
  }

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
              onClick={() => setShowUpload(true)}
              className="bg-[#6366F1] hover:bg-[#5558E6] text-white gap-2 rounded-xl h-9 px-4"
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
              {formatFileSize(usedStorage)} of 1 GB
            </span>
          </div>
          <Progress
            value={storagePercentage}
            className="h-2 bg-white/[0.06] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-[#6366F1] [&>[data-slot=indicator]]:to-[#A78BFA]"
          />
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
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6B7280]">{t.common.loading}</p>
            </div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className="p-5 rounded-2xl bg-[#111117] border border-white/[0.08] mb-4">
              <Cloud className="w-12 h-12 text-[#6B7280]" />
            </div>
            <h3 className="text-lg font-semibold text-[#E5E7EB] mb-1">{t.files.noFiles}</h3>
            <p className="text-sm text-[#6B7280] max-w-[250px]">{t.files.noFilesDesc}</p>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredFiles.map((file, index) => {
                  const Icon = getFileIcon(file.file_type)
                  const iconColor = getFileIconColor(file.file_type)
                  const isImage = file.file_type.startsWith('image/')

                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.03 }}
                      className="group bg-[#111117] border border-white/[0.08] rounded-2xl p-4 hover:border-white/[0.12] transition-all duration-200 cursor-pointer"
                      onClick={() => isImage && setPreviewFile(file)}
                    >
                      {/* File icon / preview */}
                      <div className="flex items-center justify-center h-20 mb-3">
                        {isImage && file.url ? (
                          <div className="w-full h-full rounded-lg overflow-hidden bg-white/[0.02]">
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={`p-3 rounded-xl ${iconColor}`}>
                            <Icon className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      {/* File info */}
                      <p className="text-xs font-medium text-[#E5E7EB] truncate mb-1">
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#6B7280]">
                          {formatFileSize(file.file_size)}
                        </span>
                        <span className="text-[10px] text-[#6B7280]">
                          {format(new Date(file.created_at), 'MMM d')}
                        </span>
                      </div>

                      {/* Hover actions */}
                      <div className="mt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-[#A78BFA]">
                          {getUploaderName(file.uploaded_by)}
                        </span>
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
                  const Icon = getFileIcon(file.file_type)
                  const iconColor = getFileIconColor(file.file_type)
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

      {/* Image Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] sm:max-w-[700px] rounded-2xl p-0 overflow-hidden">
          {previewFile && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span className="text-sm font-medium text-[#E5E7EB] truncate max-w-[300px]">
                    {previewFile.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#6B7280] mr-2">
                    {formatFileSize(previewFile.file_size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#6B7280] hover:text-red-400"
                    onClick={() => handleDeleteFile(previewFile)}
                    disabled={deletingId === previewFile.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#6B7280] hover:text-[#E5E7EB]"
                    onClick={() => setPreviewFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center bg-black/40 p-4 min-h-[300px] max-h-[70vh]">
                {previewFile.url && (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                )}
              </div>
              <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-[10px]">
                      {getUploaderName(previewFile.uploaded_by)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-[#6B7280]">
                    {getUploaderName(previewFile.uploaded_by)} ·{' '}
                    {format(new Date(previewFile.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                {previewFile.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#A78BFA] hover:text-[#A78BFA] hover:bg-[#A78BFA]/10 rounded-lg text-xs"
                    onClick={() => window.open(previewFile.url!, '_blank')}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
