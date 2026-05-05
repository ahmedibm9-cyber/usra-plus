'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { io as socketIo, Socket } from 'socket.io-client'
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
    return { Icon: FileText, color: 'bg-blue-500/15 text-blue-400' }
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
  durationLabel: string
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
    <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-2xl p-3 min-w-[200px]">
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 bg-[#6366F1] rounded-full flex items-center justify-center text-white flex-shrink-0 hover:bg-[#5558E6] transition-colors"
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
                  isFilled ? 'bg-[#6366F1]' : isOwn ? 'bg-[--border-medium]' : 'bg-[#6366F1]/30'
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
        <Mic className="w-3 h-3 text-[#6366F1]/60" />
        <span className="text-[10px] text-[#6366F1]/60">
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
          className="rounded-full w-[3px] bg-[#6366F1]"
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

export default function ChatPage() {
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

  // Socket.io connection state
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const socketRef = useRef<Socket | null>(null)
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
        first_name: user.user_metadata?.first_name ?? null,
        last_name: user.user_metadata?.last_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        phone: null,
        country_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } : undefined,
    }

    addMessage(voiceMessage)

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    try {
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

      // For demo mode, use the object URL as the file_url
      const fileUrl = pending.preview || URL.createObjectURL(pending.file)

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
          first_name: user.user_metadata?.first_name ?? null,
          last_name: user.user_metadata?.last_name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          phone: null,
          country_code: null,
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

  // Socket.io real-time connection
  useEffect(() => {
    if (!familyId || !userId) return

    const userName = user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name}${user.user_metadata.last_name ? ` ${user.user_metadata.last_name}` : ''}`
      : 'User'

    let socket: Socket | null = null

    try {
      socket = socketIo('/?XTransformPort=3030', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      })

      socket.on('connect', () => {
        setSocketStatus('connected')
        socket?.emit('join-family', { familyId, userId, userName })
      })

      socket.on('disconnect', () => {
        setSocketStatus('disconnected')
      })

      socket.on('reconnect_attempt', () => {
        setSocketStatus('reconnecting')
      })

      socket.on('reconnect', () => {
        setSocketStatus('connected')
        socket?.emit('join-family', { familyId, userId, userName })
      })

      // Listen for new messages from other users
      socket.on('new-message', (message: Record<string, unknown>) => {
        // Don't add our own messages - we already add them optimistically
        if ((message as { sender_id?: string }).sender_id === userId) return

        const chatMsg: ChatMessage = {
          id: (message as { id: string }).id,
          family_id: (message as { family_id: string }).family_id,
          content: (message as { content: string }).content,
          sender_id: (message as { sender_id: string }).sender_id,
          message_type: (message as { message_type: string }).message_type as ChatMessage['message_type'],
          file_url: (message as { file_url?: string | null }).file_url ?? null,
          file_name: (message as { file_name?: string | null }).file_name ?? null,
          file_size: (message as { file_size?: number | null }).file_size ?? null,
          voice_duration: (message as { voice_duration?: number | null }).voice_duration ?? null,
          reply_to: (message as { reply_to?: string | null }).reply_to ?? null,
          created_at: (message as { created_at: string }).created_at,
          sender: undefined,
        }

        // Try to find sender from family members
        const senderMember = familyMembers.find(
          (m) => m.user_id === chatMsg.sender_id
        )
        if (senderMember?.profiles) {
          chatMsg.sender = {
            id: senderMember.user_id,
            email: '',
            first_name: senderMember.profiles.first_name ?? null,
            last_name: senderMember.profiles.last_name ?? null,
            avatar_url: senderMember.profiles.avatar_url ?? null,
            phone: null,
            country_code: null,
            created_at: '',
            updated_at: '',
          }
        }

        addMessage(chatMsg)

        if (scrollRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
          if (scrollHeight - scrollTop - clientHeight < 200) {
            setTimeout(() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          }
        }
      })

      // Listen for typing indicators
      socket.on('user-typing', (data: { userId: string; userName: string }) => {
        setTyping(data.userId, data.userName)
      })

      socket.on('user-stopped-typing', (data: { userId: string }) => {
        clearTyping(data.userId)
      })

      // Listen for presence updates
      socket.on('presence-update', (data: { userId: string; status: 'online' | 'offline' }) => {
        if (data.status === 'online') {
          setOnline(data.userId)
        } else {
          setOffline(data.userId)
        }
      })

      // Listen for reaction updates
      socket.on('reaction-update', (data: { messageId: string; userId: string; emoji: string }) => {
        toggleReaction(data.messageId, data.emoji, data.userId)
      })

      socketRef.current = socket
    } catch {
      // Socket service not available - fall back to local-only mode
      setSocketStatus('disconnected')
    }

    return () => {
      if (socket) {
        socket.emit('leave-family', { familyId })
        socket.disconnect()
      }
      socketRef.current = null
    }
  }, [familyId, userId, user, familyMembers, addMessage, setTyping, clearTyping, setOnline, setOffline, toggleReaction])

  // Emit typing start/stop via socket
  useEffect(() => {
    if (!socketRef.current || socketStatus !== 'connected' || !familyId || !userId) return

    const socket = socketRef.current
    const currentMsg = newMessage.trim()
    const prevMsg = prevNewMessageRef.current.trim()

    if (currentMsg.length > 0 && prevMsg.length === 0) {
      // Started typing
      const userName = user?.user_metadata?.first_name ?? 'User'
      socket.emit('typing-start', { familyId, userId, userName })
    } else if (currentMsg.length === 0 && prevMsg.length > 0) {
      // Stopped typing
      socket.emit('typing-stop', { familyId, userId })
    }

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (currentMsg.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { familyId, userId })
      }, 3000)
    }

    prevNewMessageRef.current = newMessage

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [newMessage, socketStatus, familyId, userId, user])

  // Demo typing indicator
  useEffect(() => {
    // Only run demo typing if socket is not connected
    if (socketStatus === 'connected') return
    if (familyMembers.length > 0 && !showDemoTyping) {
      const timer1 = setTimeout(() => {
        const nouraMember = familyMembers.find((m) => m.user_id === 'demo-user-002')
        if (nouraMember) {
          const name = nouraMember.profiles?.first_name ?? (isRTL ? 'نورة' : 'Noura')
          setTyping('demo-user-002', name)
          setShowDemoTyping(true)

          setTimeout(() => {
            clearTyping('demo-user-002')
            setShowDemoTyping(false)
          }, 3000)
        }
      }, 1500)

      return () => clearTimeout(timer1)
    }
  }, [familyMembers, isRTL, setTyping, clearTyping, showDemoTyping, socketStatus])

  // Demo presence (only when socket is not connected)
  useEffect(() => {
    if (familyMembers.length === 0) return
    if (socketStatus === 'connected') return

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

  // Realtime subscription
  useEffect(() => {
    if (!familyId) return
    const supabase = createClient()

    fetchMessages()

    const channel = supabase
      .channel('chat-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `family_id=eq.${familyId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage
          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single()

          addMessage({
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
  }, [familyId, fetchMessages, addMessage])

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
    const content = newMessage.trim()
    setIsSending(true)
    setNewMessage('')

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const timestamp = new Date().toISOString()
    const senderName = user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name}${user.user_metadata.last_name ? ` ${user.user_metadata.last_name}` : ''}`
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
        first_name: user.user_metadata?.first_name ?? null,
        last_name: user.user_metadata?.last_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        phone: null,
        country_code: null,
        created_at: timestamp,
        updated_at: timestamp,
      } : undefined,
    }

    addMessage(optimisticMsg)

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    // Emit via socket.io
    if (socketRef.current && socketStatus === 'connected') {
      socketRef.current.emit('send-message', {
        familyId,
        id: messageId,
        senderId: userId,
        senderName,
        text: content,
        timestamp,
        messageType: 'text',
      })
    }

    // Also try Supabase persistence
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
    // Emit reaction via socket
    if (socketRef.current && socketStatus === 'connected' && familyId) {
      socketRef.current.emit('message-reaction', {
        familyId,
        messageId,
        userId,
        emoji,
      })
    }
  }, [userId, toggleReaction, socketStatus, familyId])

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

  // Cleanup pending files on unmount
  useEffect(() => {
    return () => {
      setPendingFiles((prev) => {
        prev.forEach((p) => {
          if (p.preview) URL.revokeObjectURL(p.preview)
        })
        return prev
      })
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
            <div className={`px-3 py-2 ${isOwn ? 'bg-[#6366F1]' : 'bg-[--bg-surface] border-t border-[--border-subtle]'}`}>
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
          <div className={`bg-[--border-subtle] border border-[--border-subtle] rounded-xl p-3 flex items-center gap-3 min-w-[200px]`}>
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
            <div className={`px-3 py-1.5 ${isOwn ? 'bg-[#6366F1]' : 'bg-[--bg-surface] border-t border-[--border-subtle] rounded-b-xl'}`}>
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
          durationLabel={t.chat.duration}
        />
      )
    }

    // Text message
    return (
      <div
        className={`
          rounded-2xl px-4 py-2.5 inline-block
          ${
            isOwn
              ? 'bg-[#6366F1] text-white rounded-br-md'
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
            className="absolute inset-0 z-50 bg-[#6366F1]/5 border-2 border-dashed border-[#6366F1]/30 rounded-xl flex items-center justify-center backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-2xl bg-[#6366F1]/10">
                <Upload className="w-8 h-8 text-[#6366F1]" />
              </div>
              <p className="text-sm font-medium text-[#6366F1]">
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
            <div className="p-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20">
              <MessageCircle className="w-5 h-5 text-[#6366F1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[--text-primary]">
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
            className="flex items-center gap-2 mt-3"
          >
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {onlineMembers.slice(0, 5).map((member) => (
                <div key={member.user_id} className="relative">
                  <Avatar className="h-7 w-7 border-2 border-[--bg-primary]">
                    <AvatarImage
                      src={member.profiles?.avatar_url ?? undefined}
                      alt={member.profiles?.first_name ?? ''}
                    />
                    <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-[10px] font-medium">
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
                  className="pl-10 bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
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
                                    <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-xs font-medium">
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
                                <p className="text-xs font-medium text-[#A78BFA]">
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
                                          ? 'bg-[#6366F1]/10 border-[#6366F1]/30 hover:bg-[#6366F1]/20'
                                          : 'bg-[--border-subtle] border-[--border-subtle] hover:bg-[--border-subtle]'
                                      }`}
                                      aria-label={`${reaction.emoji} ${reaction.users.length}`}
                                    >
                                      <span className="text-sm">{reaction.emoji}</span>
                                      <span className={`${isActive ? 'text-[#A78BFA]' : 'text-[--text-muted]'}`}>
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
                                  <span className={`inline-flex ${readStatus === 'read' ? 'text-[#6366F1]' : 'text-[--text-muted]'}`}>
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
                                <span className={`inline-flex ${readStatus === 'read' ? 'text-[#6366F1]' : 'text-[--text-muted]'}`}>
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
                            <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-xs font-medium">
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
                      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          <span className="typing-dot-1 size-1.5 rounded-full bg-[#6B7280]" />
                          <span className="typing-dot-2 size-1.5 rounded-full bg-[#6B7280]" />
                          <span className="typing-dot-3 size-1.5 rounded-full bg-[#6B7280]" />
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
                  <div key={index} className="flex items-start gap-2 bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-2">
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
                        className="flex-1 h-7 bg-transparent border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] text-xs rounded-lg focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
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
                  className="bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg text-xs h-8 gap-1.5"
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
              <div className="bg-[--bg-surface] border border-[#6366F1]/20 rounded-2xl px-4 py-3">
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
                    className="h-9 w-9 p-0 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-full flex-shrink-0 transition-colors"
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
              <div className="flex items-center gap-2 bg-[--bg-surface] border border-[--border-subtle] rounded-2xl px-4 py-2 focus-within:border-[#6366F1]/30 transition-colors">
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
                  className="h-8 w-8 text-[--text-muted] hover:text-[--text-primary] hover:bg-transparent rounded-lg flex-shrink-0"
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
                        className="h-8 w-8 p-0 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg flex-shrink-0 disabled:opacity-50"
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
                        className="h-8 w-8 p-0 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg flex-shrink-0"
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
