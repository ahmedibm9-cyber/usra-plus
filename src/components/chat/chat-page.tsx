'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
// Socket.IO removed — Supabase Realtime is the ONLY realtime system
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'
import {
  Send,
  Search,
  MessageCircle,
  X,
  Smile,
  Paperclip,
  ArrowDown,
  Check,
  CheckCheck,
  Mic,
  Play,
  Pause,
  Plus,
  ImageIcon,
  FileText,
  File,
  Download,
  Upload,
  XCircle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useChatStore } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/auth-store'
import { usePresenceStore } from '@/stores/presence-store'
import { useI18n } from '@/i18n/use-translation'
import type { ChatMessage } from '@/types'
import { EmptyState } from '@/components/shared/empty-state'
import { MessageSkeleton } from '@/components/shared/skeleton-patterns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '😢', '🙏']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = 'image/*,.pdf,.doc,.docx'

interface PendingFile {
  file: File
  preview: string | null
  caption: string
}

interface MessageGroup {
  label: string
  messages: ChatMessage[]
}

function groupMessagesByDate(messages: ChatMessage[]): MessageGroup[] {
  if (messages.length === 0) return []

  const groups: MessageGroup[] = []
  let currentGroup: MessageGroup | null = null

  for (const msg of messages) {
    const msgDate = new Date(msg.created_at)
    let label: string

    if (isToday(msgDate)) {
      label = 'Today'
    } else if (isYesterday(msgDate)) {
      label = 'Yesterday'
    } else {
      label = format(msgDate, 'MMMM d, yyyy')
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, messages: [msg] }
      groups.push(currentGroup)
    } else {
      currentGroup.messages.push(msg)
    }
  }

  return groups
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const f = firstName?.charAt(0)?.toUpperCase() ?? ''
  const l = lastName?.charAt(0)?.toUpperCase() ?? ''
  return f + l || '?'
}

function formatMessageTime(dateStr: string): string {
  return format(new Date(dateStr), 'h:mm a')
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIconAndColor(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return { Icon: ImageIcon, color: 'bg-pink-500/15 text-pink-400' }
  if (['pdf'].includes(ext))
    return { Icon: FileText, color: 'bg-red-500/15 text-red-400' }
  if (['doc', 'docx'].includes(ext))
    return { Icon: FileText, color: 'bg-[#E50914]/15 text-[#E50914]' }
  return { Icon: File, color: 'bg-gray-500/15 text-[--text-muted]' }
}

// Read receipt type for demo purposes
type ReadStatus = 'sent' | 'delivered' | 'read'

// Demo read receipts: assign random read statuses to own messages
function getDemoReadStatus(messageId: string): ReadStatus {
  const hash = messageId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const mod = hash % 3
  if (mod === 0) return 'read'
  if (mod === 1) return 'delivered'
  return 'sent'
}

// Voice message bubble component
function VoiceMessageBubble({
  msg,
  isOwn,
  isRTL,
  voiceMessageLabel,
}: {
  msg: ChatMessage
  isOwn: boolean
  isRTL: boolean
  voiceMessageLabel: string
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playProgress, setPlayProgress] = useState(0)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const duration = msg.voice_duration ?? 0

  const barHeights = useMemo(() => {
    const seed = msg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const heights: number[] = []
    for (let i = 0; i < 7; i++) {
      const h = ((seed * (i + 1) * 7) % 14) + 2
      heights.push(h)
    }
    return heights
  }, [msg.id])

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false)
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    } else {
      setIsPlaying(true)
      setPlayProgress(0)
      const totalSteps = duration > 0 ? duration * 10 : 30
      let step = 0
      playIntervalRef.current = setInterval(() => {
        step++
        setPlayProgress(step / totalSteps)
        if (step >= totalSteps) {
          setIsPlaying(false)
          setPlayProgress(0)
          if (playIntervalRef.current) {
            clearInterval(playIntervalRef.current)
            playIntervalRef.current = null
          }
        }
      }, 100)
    }
  }

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="bg-[--accent-primary]/10 border border-[--accent-primary]/20 rounded-2xl p-3 min-w-[200px]">
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 bg-[--accent-primary] rounded-full flex items-center justify-center text-white flex-shrink-0 hover:bg-[--accent-primary]/90 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        <div className={`flex-1 flex items-center gap-[1px] h-8 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {barHeights.map((h, i) => {
            const progressIndex = playProgress * barHeights.length
            const isFilled = i < progressIndex
            return (
              <motion.div
                key={i}
                className={`rounded-full w-[3px] transition-colors duration-150 ${
                  isFilled ? 'bg-[--accent-primary]' : isOwn ? 'bg-[--border-medium]' : 'bg-[--accent-primary]/30'
                }`}
                style={{ height: `${h}px` }}
                initial={false}
                animate={{ height: isPlaying ? `${h + Math.sin(Date.now() / 200 + i) * 2}px` : `${h}px` }}
                transition={{ duration: 0.15 }}
              />
            )
          })}
        </div>

        <span className="text-xs text-[--text-muted] flex-shrink-0 min-w-[32px] text-center">
          {formatDuration(duration)}
        </span>
      </div>

      <div className={`flex items-center gap-1 mt-1.5 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <Mic className="w-3 h-3 text-[--accent-primary]/60" />
        <span className="text-[10px] text-[--accent-primary]/60">
          {voiceMessageLabel}
        </span>
      </div>
    </div>
  )
}

// Recording waveform bars component
function RecordingWaveform() {
  const [bars, setBars] = useState<number[]>([4, 8, 12, 6, 14, 10, 8, 12])

  useEffect(() => {
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map(() => Math.floor(Math.random() * 14) + 2)
      )
    }, 200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-[1px] h-8">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="rounded-full w-[3px] bg-[--accent-primary]"
          animate={{ height: `${h}px` }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

// Image Lightbox Component
function ImageLightbox({
  imageUrl,
  altText,
  onClose,
}: {
  imageUrl: string
  altText: string
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-[--border-subtle] hover:bg-[--border-medium] text-white transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X className="w-5 h-5" />
      </button>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={altText}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      </motion.div>
    </motion.div>
  )
}

export function ChatPage() {
  const { currentFamily, familyMembers } = useAppStore()
  const { user } = useAuthStore()
  const { t, isRTL } = useI18n()
  const {
    messages,
    isLoading,
    searchQuery,
    newMessage,
    setMessages,
    addMessage,
    setIsLoading,
    setSearchQuery,
    setNewMessage,
    getFilteredMessages,
    toggleReaction,
  } = useChatStore()

  const {
    setOnline,
    setOffline,
    setTyping,
    clearTyping,
    isUserOnline,
    getOnlineCount,
    getOnlineUserIds,
    getTypingUsers,
  } = usePresenceStore()

  const [isSending, setIsSending] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [showDemoTyping, setShowDemoTyping] = useState(false)
  const [activePickerMsgId, setActivePickerMsgId] = useState<string | null>(null)

  // Socket.IO removed — using Supabase Realtime Presence for typing/presence
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // File upload state
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const dragCounterRef = useRef(0)
  const prevNewMessageRef = useRef('')
  const nonPreviewObjectUrlsRef = useRef<string[]>([])

  const familyId = currentFamily?.id
  const userId = user?.id

  // Start recording
  const handleStartRecording = useCallback(() => {
    setIsRecording(true)
    setRecordingTime(0)
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1)
    }, 1000)
  }, [])

  // Cancel recording
  const handleCancelRecording = useCallback(() => {
    setIsRecording(false)
    setRecordingTime(0)
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    inputRef.current?.focus()
  }, [])

  // Send voice message (demo - adds mock voice message to chat)
  const handleSendVoiceMessage = useCallback(async () => {
    if (!familyId || !userId) return
    try {
    const duration = recordingTime

    setIsRecording(false)
    setRecordingTime(0)
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }

    const voiceMessage: ChatMessage = {
      id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      family_id: familyId,
      content: t.chat.voiceMessage,
      sender_id: userId,
      message_type: 'voice',
      voice_duration: duration,
      reply_to: null,
      created_at: new Date().toISOString(),
      sender: user ? {
        id: user.id,
        email: user.email ?? '',
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        avatar_url: user.avatar_url ?? null,
        phone: null,
        country_code: null,
        language: user.language ?? 'en',
        theme: user.theme ?? 'dark',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } : undefined,
    }

    addMessage(voiceMessage)

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

      const supabase = createClient()
      await supabase.from('chat_messages').insert({
        family_id: familyId,
        content: t.chat.voiceMessage,
        sender_id: userId,
        message_type: 'voice',
      })
    } catch {
      // Silent fail in demo mode
    }
  }, [familyId, userId, recordingTime, addMessage, user, t])

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const newPending: PendingFile[] = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t.chat.fileTooLarge)
        continue
      }

      const isImage = file.type.startsWith('image/')
      const preview = isImage ? URL.createObjectURL(file) : null
      newPending.push({ file, preview, caption: '' })
    }

    if (newPending.length > 0) {
      setPendingFiles((prev) => [...prev, ...newPending])
    }
  }, [t])

  // Remove a pending file
  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => {
      const item = prev[index]
      if (item.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // Send file/image messages
  const handleSendFiles = useCallback(async () => {
    if (!familyId || !userId || pendingFiles.length === 0) return

    for (const pending of pendingFiles) {
      const isImage = pending.file.type.startsWith('image/')
      const messageType: 'image' | 'file' = isImage ? 'image' : 'file'
      const content = pending.caption || (isImage ? t.chat.imageSent : t.chat.fileSent)

      // Try to upload to Supabase Storage first for persistent URL
      let fileUrl: string = pending.preview || URL.createObjectURL(pending.file)
      try {
        const supabase = createClient()
        const filePath = `${familyId}/${Date.now()}-${pending.file.name}`
        const { error: uploadError } = await supabase.storage
          .from('family-files')
          .upload(filePath, pending.file)

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('family-files')
            .getPublicUrl(filePath)
          if (urlData?.publicUrl) {
            fileUrl = urlData.publicUrl
          }
        } else {
          // Storage bucket might not exist — fall back to blob URL
          console.warn('[Chat] Supabase Storage upload failed, using blob URL:', uploadError.message)
          fileUrl = pending.preview || URL.createObjectURL(pending.file)
          if (!pending.preview) {
            nonPreviewObjectUrlsRef.current.push(fileUrl)
          }
        }
      } catch {
        // Storage not available — use blob URL
        fileUrl = pending.preview || URL.createObjectURL(pending.file)
        if (!pending.preview) {
          nonPreviewObjectUrlsRef.current.push(fileUrl)
        }
      }

      const fileMessage: ChatMessage = {
        id: `${messageType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        family_id: familyId,
        content,
        sender_id: userId,
        message_type: messageType,
        file_url: fileUrl,
        file_name: pending.file.name,
        file_size: pending.file.size,
        thumbnail_url: isImage ? fileUrl : undefined,
        reply_to: null,
        created_at: new Date().toISOString(),
        sender: user ? {
          id: user.id,
          email: user.email ?? '',
          first_name: user.first_name ?? null,
          last_name: user.last_name ?? null,
          avatar_url: user.avatar_url ?? null,
          phone: null,
          country_code: null,
          language: user.language ?? 'en',
          theme: user.theme ?? 'dark',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } : undefined,
      }

      addMessage(fileMessage)

      // Try to send to Supabase (will fail gracefully if tables don't exist)
      try {
        const supabase = createClient()
        await supabase.from('chat_messages').insert({
          family_id: familyId,
          content,
          sender_id: userId,
          message_type: messageType,
          file_url: fileUrl,
          file_name: pending.file.name,
          file_size: pending.file.size,
        })
      } catch {
        // Silent fail in demo mode
      }
    }

    // Clear pending files
    setPendingFiles((prev) => {
      prev.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview)
      })
      return []
    })

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [familyId, userId, pendingFiles, addMessage, user, t])

  // Cancel all pending files
  const cancelPendingFiles = useCallback(() => {
    setPendingFiles((prev) => {
      prev.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview)
      })
      return []
    })
  }, [])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    dragCounterRef.current = 0

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  // Socket.IO REMOVED — Supabase Realtime handles all message/presence delivery
  // Presence and typing are handled via Supabase Realtime Presence below

  // Typing indicator via Supabase Realtime Presence
  useEffect(() => {
    if (!familyId || !userId) return
    const currentMsg = newMessage.trim()
    const prevMsg = prevNewMessageRef.current.trim()

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (currentMsg.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        // Could emit typing-stop via Supabase Presence if needed
      }, 3000)
    }

    prevNewMessageRef.current = newMessage

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [newMessage, familyId, userId])

  // Demo typing indicator
  useEffect(() => {
    // Only run demo typing if socket is not connected
    if (socketStatus === 'connected') return () => {}
    let innerTimer: ReturnType<typeof setTimeout> | null = null
    if (familyMembers.length > 0 && !showDemoTyping) {
      const timer1 = setTimeout(() => {
        const nouraMember = familyMembers.find((m) => m.user_id === 'demo-user-002')
        if (nouraMember) {
          const name = nouraMember.profiles?.first_name ?? (isRTL ? 'نورة' : 'Noura')
          setTyping('demo-user-002', name)
          setShowDemoTyping(true)

          innerTimer = setTimeout(() => {
            clearTyping('demo-user-002')
            setShowDemoTyping(false)
          }, 3000)
        }
      }, 1500)

      return () => {
        clearTimeout(timer1)
        if (innerTimer) clearTimeout(innerTimer)
      }
    }
  }, [familyMembers, isRTL, setTyping, clearTyping, showDemoTyping, socketStatus])

  // Demo presence (only when socket is not connected)
  useEffect(() => {
    if (familyMembers.length === 0) return
    if (socketStatus === 'connected') return () => {}

    if (userId) {
      setOnline(userId)
    }

    familyMembers.forEach((member) => {
      if (member.user_id !== userId) {
        const isOnline = Math.random() > 0.3
        if (isOnline) {
          setOnline(member.user_id)
        }
      }
    })

    const interval = setInterval(() => {
      familyMembers.forEach((member) => {
        if (member.user_id !== userId) {
          const currentlyOnline = isUserOnline(member.user_id)
          if (Math.random() < 0.1) {
            if (currentlyOnline) {
              setOffline(member.user_id)
            } else {
              setOnline(member.user_id)
            }
          }
        }
      })
    }, 8000)

    return () => clearInterval(interval)
  }, [familyMembers, userId, setOnline, setOffline, isUserOnline, socketStatus])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!familyId) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles(*)')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (data) setMessages(data as ChatMessage[])
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }, [familyId, setMessages, setIsLoading, t])

  // Store stable references in refs to avoid re-subscribing on callback identity changes
  const fetchMessagesRef = useRef(fetchMessages)
  const addMessageRef = useRef(addMessage)
  fetchMessagesRef.current = fetchMessages
  addMessageRef.current = addMessage

  // Realtime subscription — ONLY depends on familyId so we don't re-subscribe
  // every time fetchMessages/addMessage change identity
  useEffect(() => {
    if (!familyId) return
    const supabase = createClient()

    fetchMessagesRef.current()

    const channel = supabase
      .channel(`chat-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `family_id=eq.${familyId}`,
        },
        async (payload) => {
          if (!payload.new) return
          const newMsg = payload.new as ChatMessage

          // Deduplicate: skip if we already have this message (optimistic add)
          const exists = useChatStore.getState().messages.some(m => m.id === newMsg.id)
          if (exists) return

          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single()

          addMessageRef.current({
            ...newMsg,
            sender: senderData ?? undefined,
          })

          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
            if (scrollHeight - scrollTop - clientHeight < 200) {
              setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [familyId])

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      }, 100)
    }
  }, [isLoading, messages.length])

  // Track scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300)
  }, [])

  // Send text message
  const handleSendMessage = async () => {
    if (!familyId || !userId || !newMessage.trim()) return
    try {
    const content = newMessage.trim()
    setIsSending(true)
    setNewMessage('')

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const timestamp = new Date().toISOString()
    const senderName = user?.first_name
      ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
      : 'User'

    // Optimistically add message locally
    const optimisticMsg: ChatMessage = {
      id: messageId,
      family_id: familyId,
      content,
      sender_id: userId,
      message_type: 'text',
      reply_to: null,
      created_at: timestamp,
      sender: user ? {
        id: user.id,
        email: user.email ?? '',
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        avatar_url: user.avatar_url ?? null,
        phone: null,
        country_code: null,
        language: user.language ?? 'en',
        theme: user.theme ?? 'dark',
        created_at: timestamp,
        updated_at: timestamp,
      } : undefined,
    }

    addMessage(optimisticMsg)

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    // Socket.IO removed — Supabase Realtime will broadcast the INSERT to other clients
    // Supabase persistence:
    try {
      const supabase = createClient()
      const { error } = await supabase.from('chat_messages').insert({
        family_id: familyId,
        content,
        sender_id: userId,
        message_type: 'text',
      })

      if (error) throw error
    } catch {
      // Silent fail in demo mode - message is already shown locally
    }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const filteredMessages = getFilteredMessages()
  const messageGroups = groupMessagesByDate(filteredMessages)

  const getSenderAvatar = (senderId: string) => {
    const member = familyMembers.find((m) => m.user_id === senderId)
    return member?.profiles?.avatar_url ?? null
  }

  const getSenderName = (senderId: string) => {
    const member = familyMembers.find((m) => m.user_id === senderId)
    if (member?.profiles?.first_name) {
      return `${member.profiles.first_name}${member.profiles.last_name ? ` ${member.profiles.last_name}` : ''}`
    }
    return member?.nickname ?? 'Unknown'
  }

  const onlineUserIds = getOnlineUserIds()
  const onlineCount = getOnlineCount()
  const onlineMembers = familyMembers.filter((m) => onlineUserIds.includes(m.user_id))
  const typingUsers = getTypingUsers().filter((u) => u.userId !== userId)

  const showSendButton = newMessage.trim().length > 0 || pendingFiles.length > 0

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (!userId) return
    toggleReaction(messageId, emoji, userId)
    setActivePickerMsgId(null)
    // Socket.IO removed — reactions stored in Supabase only
  }, [userId, toggleReaction, familyId])

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!activePickerMsgId) return
    const handleClickOutside = () => setActivePickerMsgId(null)
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [activePickerMsgId])

  // Cleanup pending files and non-preview Object URLs on unmount
  useEffect(() => {
    return () => {
      setPendingFiles((prev) => {
        prev.forEach((p) => {
          if (p.preview) URL.revokeObjectURL(p.preview)
        })
        return prev
      })
      // Revoke Object URLs created for non-image file messages
      nonPreviewObjectUrlsRef.current.forEach(URL.revokeObjectURL)
      nonPreviewObjectUrlsRef.current = []
    }
  }, [])

  // Render message bubble content based on type
  const renderMessageContent = (msg: ChatMessage, isOwn: boolean) => {
    const isImage = msg.message_type === 'image'
    const isFile = msg.message_type === 'file'
    const isVoice = msg.message_type === 'voice'

    if (isImage && msg.file_url) {
      return (
        <div className={`
          rounded-2xl overflow-hidden max-w-[300px] cursor-pointer hover:opacity-95 transition-opacity
          ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}
        `}>
          <img
            src={msg.thumbnail_url || msg.file_url}
            alt={msg.file_name || 'Image'}
            className="w-full object-cover"
            onClick={() => setLightboxImage({ url: msg.file_url!, alt: msg.file_name || 'Image' })}
          />
          {msg.content && msg.content !== t.chat.imageSent && (
            <div className={`px-3 py-2 ${isOwn ? 'bg-[--accent-primary]' : 'bg-[--bg-surface] border-t border-[--border-subtle]'}`}>
              <p className="text-xs leading-relaxed break-words whitespace-pre-wrap text-[--text-primary]">
                {msg.content}
              </p>
            </div>
          )}
        </div>
      )
    }

    if (isFile && msg.file_name) {
      const { Icon, color } = getFileIconAndColor(msg.file_name)
      return (
        <div className={`
          rounded-2xl inline-block
          ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}
        `}>
          <div className={`bg-[--border-subtle] border border-[--border-subtle] rounded-2xl p-3 flex items-center gap-3 min-w-[200px]`}>
            <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[--text-primary] truncate">{msg.file_name}</p>
              <p className="text-[10px] text-[--text-muted]">{msg.file_size ? formatFileSize(msg.file_size) : ''}</p>
            </div>
            {msg.file_url && (
              <a
                href={msg.file_url}
                download={msg.file_name}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg hover:bg-[--border-subtle] text-[--text-muted] hover:text-[--text-primary] transition-colors flex-shrink-0"
                aria-label={t.chat.download}
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
          {msg.content && msg.content !== t.chat.fileSent && (
            <div className={`px-3 py-1.5 ${isOwn ? 'bg-[--accent-primary]' : 'bg-[--bg-surface] border-t border-[--border-subtle] rounded-b-xl'}`}>
              <p className="text-xs leading-relaxed break-words whitespace-pre-wrap text-[--text-primary]">
                {msg.content}
              </p>
            </div>
          )}
        </div>
      )
    }

    if (isVoice) {
      return (
        <VoiceMessageBubble
          msg={msg}
          isOwn={isOwn}
          isRTL={isRTL}
          voiceMessageLabel={t.chat.voiceMessage}
        />
      )
    }

    // Text message
    return (
      <div
        className={`
          rounded-2xl px-4 py-2.5 inline-block shadow-sm
          ${
            isOwn
              ? 'bg-[--accent-primary] text-white rounded-br-md shadow-[--accent-primary]/20'
              : 'bg-[--bg-surface] border border-[--border-subtle] text-[--text-primary] rounded-bl-md'
          }
        `}
      >
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {msg.content}
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full w-full bg-[--bg-primary] relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 bg-[--accent-primary]/5 border-2 border-dashed border-[--accent-primary]/30 rounded-2xl flex items-center justify-center backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-2xl bg-[--accent-primary]/10">
                <Upload className="w-8 h-8 text-[--accent-primary]" />
              </div>
              <p className="text-sm font-medium text-[--accent-primary]">
                {t.chat.dropFilesHere}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox
            imageUrl={lightboxImage.url}
            altText={lightboxImage.alt}
            onClose={() => setLightboxImage(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[--accent-primary]/10 border border-[--accent-primary]/20">
              <MessageCircle className="w-5 h-5 text-[--accent-primary]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-display text-[--text-primary]">
                  {t.chat.title}
                </h1>
                {/* Connection Status Indicator */}
                <div className="group/conn relative flex items-center" title={
                  socketStatus === 'connected' ? t.chat.connected
                    : socketStatus === 'reconnecting' ? t.chat.reconnecting
                    : t.chat.disconnected
                }>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    socketStatus === 'connected'
                      ? 'bg-green-500/10 text-green-400'
                      : socketStatus === 'reconnecting'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-red-500/10 text-red-400'
                  }`}>
                    <span className={`size-1.5 rounded-full ${
                      socketStatus === 'connected'
                        ? 'bg-green-400 online-dot-pulse'
                        : socketStatus === 'reconnecting'
                          ? 'bg-yellow-400 animate-pulse'
                          : 'bg-red-400'
                    }`} />
                    {socketStatus === 'connected'
                      ? t.chat.realTimeEnabled
                      : t.chat.localMode}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[--text-muted]">
                {familyMembers.length} {isRTL ? 'أعضاء' : 'members'} · {onlineCount} {t.chat.membersOnline}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="h-9 w-9 text-[--text-muted] hover:text-[--text-primary] hover:bg-[--border-subtle] rounded-xl"
          >
            {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Online Members Avatars Bar */}
        {onlineMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-3 bg-[--bg-surface] border border-[--border-subtle] rounded-2xl px-3 py-2 shadow-lg"
          >
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {onlineMembers.slice(0, 5).map((member) => (
                <div key={member.user_id} className="relative">
                  <Avatar className="h-7 w-7 border-2 border-[--bg-primary]">
                    <AvatarImage
                      src={member.profiles?.avatar_url ?? undefined}
                      alt={member.profiles?.first_name ?? ''}
                    />
                    <AvatarFallback className="bg-[--accent-primary]/20 text-[--accent-secondary] text-[10px] font-medium">
                      {getInitials(member.profiles?.first_name ?? null, member.profiles?.last_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 size-2 rounded-full bg-green-400 ring-2 ring-[--bg-surface] online-dot-pulse" />
                </div>
              ))}
              {onlineMembers.length > 5 && (
                <div className="h-7 w-7 rounded-full bg-[--bg-surface] border-2 border-[--bg-primary] flex items-center justify-center">
                  <span className="text-[10px] text-[--text-muted] font-medium">
                    +{onlineMembers.length - 5}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-[--text-muted] ml-1 rtl:mr-1 rtl:ml-0">
              {onlineCount} {t.chat.membersOnline}
            </span>
          </motion.div>
        )}

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.chat.search}
                  autoFocus
                  className="pl-10 bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl h-10 focus-visible:ring-[#E50914]/20 focus-visible:border-[#E50914]/50 focus-visible:ring-offset-0"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="px-4 sm:px-6 py-6">
            <MessageSkeleton count={4} />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Start the conversation with your family"
            action={{ label: 'Send Message', onClick: () => inputRef.current?.focus() }}
          />
        ) : (
          <>
            <ScrollArea
              className="h-full px-4 sm:px-6"
              onScroll={handleScroll}
              ref={scrollRef}
            >
              <div role="log" aria-label="Chat messages" className="space-y-1 pb-4">
                {messageGroups.map((group) => (
                  <div key={group.label}>
                    {/* Date separator */}
                    <div className="flex items-center justify-center my-6">
                      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-full px-4 py-1">
                        <span className="text-xs font-medium text-[--text-muted]">
                          {group.label}
                        </span>
                      </div>
                    </div>

                    {/* Messages */}
                    {group.messages.map((msg, index) => {
                      const isOwn = msg.sender_id === userId
                      const isSystem = msg.message_type === 'system'
                      const isImage = msg.message_type === 'image'
                      const isFile = msg.message_type === 'file'
                      const prevMsg = index > 0 ? group.messages[index - 1] : null
                      const isConsecutive =
                        prevMsg && prevMsg.sender_id === msg.sender_id && !isSystem

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-3">
                            <div className="bg-[--bg-surface]/60 border border-[--border-subtle] rounded-full px-4 py-1.5 max-w-[85%]">
                              <span className="text-xs text-[--text-muted] text-center">
                                {msg.content}
                              </span>
                            </div>
                          </div>
                        )
                      }

                      const readStatus = isOwn ? getDemoReadStatus(msg.id) : null

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, x: isOwn ? 20 : -20, y: 4 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 24,
                            delay: index * 0.05,
                          }}
                          className={`group relative flex gap-2.5 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
                            isConsecutive ? 'mt-0.5' : 'mt-3'
                          }`}
                        >
                          {/* Avatar */}
                          {!isOwn && (
                            <div className="flex-shrink-0 w-8">
                              {!isConsecutive ? (
                                <div className="relative">
                                  <Avatar className="h-8 w-8 border border-[--border-subtle]">
                                    <AvatarImage
                                      src={getSenderAvatar(msg.sender_id) ?? undefined}
                                    />
                                    <AvatarFallback className="bg-[--accent-primary]/20 text-[--accent-secondary] text-xs font-medium">
                                      {getSenderName(msg.sender_id)
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {isUserOnline(msg.sender_id) && (
                                    <span className="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 size-2.5 rounded-full bg-green-400 ring-2 ring-[--bg-surface] online-dot-pulse" />
                                  )}
                                </div>
                              ) : (
                                <div className="w-8" />
                              )}
                            </div>
                          )}

                          {/* Message bubble */}
                          <div
                            className={`max-w-[75%] sm:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}
                          >
                            {/* Sender name */}
                            {!isOwn && !isConsecutive && (
                              <div className="flex items-center gap-1.5 mb-1 ml-1">
                                <p className="text-xs font-medium text-[--accent-secondary]">
                                  {getSenderName(msg.sender_id)}
                                </p>
                                {isUserOnline(msg.sender_id) && (
                                  <span className="size-1.5 rounded-full bg-green-400 online-dot-pulse" />
                                )}
                              </div>
                            )}

                            {/* Message content + add reaction button */}
                            <div className="relative">
                              {renderMessageContent(msg, isOwn)}

                              {/* Add reaction button */}
                              {!(isImage || isFile) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActivePickerMsgId(
                                      activePickerMsgId === msg.id ? null : msg.id
                                    )
                                  }}
                                  className={`opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-[--border-subtle] hover:bg-[--border-subtle] flex items-center justify-center text-[--text-muted] absolute top-1/2 -translate-y-1/2 z-10 ${
                                    isOwn ? '-left-8 rtl:-right-8 rtl:left-auto' : '-right-8 rtl:-left-8 rtl:right-auto'
                                  }`}
                                  aria-label={t.chat.addReaction}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}

                              {/* Emoji picker */}
                              <AnimatePresence>
                                {activePickerMsgId === msg.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 4 }}
                                    transition={{ duration: 0.15 }}
                                    className={`absolute z-20 top-full mt-1 ${
                                      isOwn ? 'right-0 rtl:right-auto rtl:left-0' : 'left-0 rtl:left-auto rtl:right-0'
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="bg-[var(--bg-surface,#111117)] border border-[--border-subtle] rounded-xl p-1.5 shadow-xl flex items-center gap-0.5">
                                      {QUICK_EMOJIS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReaction(msg.id, emoji)}
                                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[--border-subtle] transition-colors text-base"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Reaction pills */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                                {msg.reactions.map((reaction) => {
                                  const isActive = userId ? reaction.users.includes(userId) : false
                                  return (
                                    <motion.button
                                      key={reaction.emoji}
                                      initial={{ scale: 0.6, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 25, duration: 0.2 }}
                                      onClick={() => handleReaction(msg.id, reaction.emoji)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer ${
                                        isActive
                                          ? 'bg-[--accent-primary]/10 border-[--accent-primary]/30 hover:bg-[--accent-primary]/20'
                                          : 'bg-[--border-subtle] border-[--border-subtle] hover:bg-[--border-subtle]'
                                      }`}
                                      aria-label={`${reaction.emoji} ${reaction.users.length}`}
                                    >
                                      <span className="text-sm">{reaction.emoji}</span>
                                      <span className={`${isActive ? 'text-[--accent-secondary]' : 'text-[--text-muted]'}`}>
                                        {reaction.users.length}
                                      </span>
                                    </motion.button>
                                  )
                                })}
                              </div>
                            )}

                            {/* Timestamp + Read Receipts */}
                            {!isConsecutive && (
                              <div
                                className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}
                              >
                                <p className="text-[10px] text-[--text-muted]">
                                  {formatMessageTime(msg.created_at)}
                                </p>
                                {isOwn && readStatus && (
                                  <span className={`inline-flex ${readStatus === 'read' ? 'text-[--accent-primary]' : 'text-[--text-muted]'}`}>
                                    {readStatus === 'sent' ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <CheckCheck className="w-3 h-3" />
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                            {isConsecutive && isOwn && readStatus && (
                              <div className="flex justify-end mr-1 -mt-0.5">
                                <span className={`inline-flex ${readStatus === 'read' ? 'text-[--accent-primary]' : 'text-[--text-muted]'}`}>
                                  {readStatus === 'sent' ? (
                                    <Check className="w-2.5 h-2.5" />
                                  ) : (
                                    <CheckCheck className="w-2.5 h-2.5" />
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ))}

                {/* Typing indicator */}
                <AnimatePresence>
                  {typingUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5 mt-3 px-1"
                      aria-live="polite"
                    >
                      <div className="flex-shrink-0 w-8">
                        <div className="relative">
                          <Avatar className="h-8 w-8 border border-[--border-subtle]">
                            <AvatarFallback className="bg-[--accent-primary]/20 text-[--accent-secondary] text-xs font-medium">
                              {typingUsers[0].userName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 size-2.5 rounded-full bg-green-400 ring-2 ring-[--bg-surface] online-dot-pulse" />
                        </div>
                      </div>
                      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2 shadow-sm">
                        <div className="flex items-center gap-1">
                          <motion.span
                            className="size-1.5 rounded-full bg-[--accent-primary]"
                            animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.1, 0.85] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                          />
                          <motion.span
                            className="size-1.5 rounded-full bg-[--accent-primary]"
                            animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.1, 0.85] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.span
                            className="size-1.5 rounded-full bg-[--accent-primary]"
                            animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.1, 0.85] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                        <span className="text-xs text-[--text-muted]">
                          {typingUsers[0].userName} {t.chat.isTyping}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollBottom && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-4 right-4 sm:right-6"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={scrollToBottom}
                    className="h-10 w-10 rounded-full bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface] shadow-lg"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Pending Files Preview */}
      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 px-4 sm:px-6 border-t border-[--border-subtle]"
          >
            <div className="py-3 space-y-2">
              {pendingFiles.map((pending, index) => {
                const isImage = pending.file.type.startsWith('image/')
                return (
                  <div key={index} className="flex items-start gap-2 bg-[--bg-surface] border border-[--border-subtle] rounded-2xl p-2 card-hover">
                    {/* Preview */}
                    {isImage && pending.preview ? (
                      <img
                        src={pending.preview}
                        alt={pending.file.name}
                        className="max-h-32 rounded-lg object-cover border border-[--border-subtle]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2">
                        {(() => {
                          const { Icon, color } = getFileIconAndColor(pending.file.name)
                          return (
                            <div className={`p-2 rounded-lg ${color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                          )
                        })()}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[--text-primary] truncate max-w-[150px]">{pending.file.name}</p>
                          <p className="text-[10px] text-[--text-muted]">{formatFileSize(pending.file.size)}</p>
                        </div>
                      </div>
                    )}

                    {/* Caption input + actions */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <Input
                        value={pending.caption}
                        onChange={(e) => {
                          setPendingFiles((prev) =>
                            prev.map((p, i) => i === index ? { ...p, caption: e.target.value } : p)
                          )
                        }}
                        placeholder={t.chat.addCaption}
                        className="flex-1 h-7 bg-transparent border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] text-xs rounded-lg focus-visible:ring-[#E50914]/20 focus-visible:border-[#E50914]/50 focus-visible:ring-offset-0"
                      />
                      <button
                        onClick={() => removePendingFile(index)}
                        className="p-1 rounded-lg hover:bg-[--border-subtle] text-[--text-muted] hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Send/Cancel buttons */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelPendingFiles}
                  className="text-[--text-muted] hover:text-[--text-primary] rounded-lg text-xs h-8"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendFiles}
                  className="bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white rounded-xl text-xs h-8 gap-1.5 btn-press"
                >
                  <Send className="w-3 h-3" />
                  {pendingFiles.some((p) => p.file.type.startsWith('image/'))
                    ? t.chat.sendImage
                    : t.chat.sendFile}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input / Recording Panel */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-[--border-subtle]">
        <AnimatePresence mode="wait">
          {isRecording ? (
            /* Recording Panel */
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="bg-[--bg-surface] border border-[--accent-primary]/20 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Cancel button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelRecording}
                    className="h-9 w-9 text-[--text-muted] hover:text-red-400 hover:bg-red-400/10 rounded-full flex-shrink-0 transition-colors"
                    aria-label={t.chat.cancelRecording}
                  >
                    <X className="w-5 h-5" />
                  </Button>

                  {/* Recording indicator */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-[--text-primary] font-medium">
                      {t.chat.recording}
                    </span>
                  </div>

                  {/* Elapsed time */}
                  <span className="text-sm text-[--text-muted] font-mono tabular-nums flex-shrink-0">
                    {formatDuration(recordingTime)}
                  </span>

                  {/* Waveform visualization */}
                  <div className="flex-1 flex justify-center">
                    <RecordingWaveform />
                  </div>

                  {/* Send voice button */}
                  <Button
                    onClick={handleSendVoiceMessage}
                    className="h-9 w-9 p-0 bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white rounded-full flex-shrink-0 transition-colors"
                    aria-label={t.chat.sendVoice}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Normal Input */
            <motion.div
              key="input"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 bg-[--bg-surface] border border-[--border-subtle] rounded-2xl px-4 py-2 focus-within:border-[--accent-primary]/30 transition-colors">
                {/* Paperclip button - opens file picker */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full hover:bg-[--border-subtle] flex items-center justify-center text-[var(--text-muted,#6B7280)] hover:text-[var(--text-primary,#E5E7EB)] transition-colors"
                  aria-label={t.chat.attachFile}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files)
                      e.target.value = ''
                    }
                  }}
                />
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t.chat.placeholder}
                  className="flex-1 border-0 bg-transparent text-[--text-primary] placeholder:text-[--text-muted] focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[--text-muted] hover:text-[--text-primary] hover:bg-transparent rounded-xl flex-shrink-0"
                >
                  <Smile className="w-4 h-4" />
                </Button>

                {/* Multi-function button: Send when text typed, Mic when empty */}
                <AnimatePresence mode="wait">
                  {showSendButton ? (
                    <motion.div
                      key="send"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Button
                        onClick={handleSendMessage}
                        disabled={isSending}
                        aria-label="Send message"
                        className="h-8 w-8 p-0 bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white rounded-xl flex-shrink-0 disabled:opacity-50 btn-press"
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-[--border-medium] border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="mic"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Button
                        onClick={handleStartRecording}
                        className="h-8 w-8 p-0 bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white rounded-lg flex-shrink-0"
                        aria-label="Record voice message"
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
