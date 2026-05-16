'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'
import {
  Send,
  Search,
  Chat as ChatIcon,
  Close,
  EmojiEmotions,
  AttachFile,
  KeyboardArrowDown,
  Check,
  DoneAll,
  Mic,
  PlayArrow,
  Pause,
  Add,
  Image as ImageIcon,
  Description as FileText,
  InsertDriveFile as FileIcon,
  Download,
  Upload,
  Cancel,
  Wifi,
  WifiOff,
} from '@mui/icons-material'
import {
  Stack,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  TextField,
  Avatar,
  Chip,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material'
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

function getFileIconAndColor(fileName: string): { Icon: React.ElementType; sxColor: object; sxBg: object } {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return { Icon: ImageIcon, sxColor: { color: 'secondary.main' }, sxBg: { bgcolor: 'secondary.main', opacity: 0.1 } }
  if (['pdf'].includes(ext))
    return { Icon: FileText, sxColor: { color: 'error.main' }, sxBg: { bgcolor: 'error.main', opacity: 0.1 } }
  if (['doc', 'docx'].includes(ext))
    return { Icon: FileText, sxColor: { color: 'primary.main' }, sxBg: { bgcolor: 'primary.main', opacity: 0.1 } }
  return { Icon: FileIcon, sxColor: { color: 'text.secondary' }, sxBg: { bgcolor: 'action.hover' } }
}

type ReadStatus = 'sent' | 'delivered' | 'read'

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
  const theme = useTheme()
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
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        minWidth: 200,
        bgcolor: `${theme.palette.primary.main}10`,
        borderColor: `${theme.palette.primary.main}30`,
        borderRadius: 4,
      }}
    >
      <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" spacing={1.5}>
        <IconButton
          onClick={handlePlayPause}
          sx={{
            width: 32, height: 32, bgcolor: 'primary.main', color: 'white', flexShrink: 0,
            '&:hover': { bgcolor: 'primary.dark' },
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause sx={{ fontSize: 14 }} /> : <PlayArrow sx={{ fontSize: 14 }} />}
        </IconButton>

        <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" spacing={0.125} sx={{ flex: 1, height: 32 }}>
          {barHeights.map((h, i) => {
            const progressIndex = playProgress * barHeights.length
            const isFilled = i < progressIndex
            return (
              <Box
                key={i}
                sx={{
                  width: 3,
                  height: `${h}px`,
                  borderRadius: 5,
                  bgcolor: isFilled ? 'primary.main' : isOwn ? 'action.selected' : `${theme.palette.primary.main}50`,
                  transition: 'background-color 0.15s',
                }}
              />
            )
          })}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 32, textAlign: 'center' }}>
          {formatDuration(duration)}
        </Typography>
      </Stack>

      <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
        <Mic sx={{ fontSize: 12, color: 'primary.main', opacity: 0.6 }} />
        <Typography variant="caption" sx={{ fontSize: 10, color: 'primary.main', opacity: 0.6 }}>
          {voiceMessageLabel}
        </Typography>
      </Stack>
    </Paper>
  )
}

// Recording waveform bars component
function RecordingWaveform() {
  const theme = useTheme()
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
    <Stack direction="row" alignItems="center" spacing={0.125} sx={{ height: 32 }}>
      {bars.map((h, i) => (
        <Box
          key={i}
          sx={{
            width: 3,
            height: `${h}px`,
            borderRadius: 5,
            bgcolor: 'primary.main',
            transition: 'height 0.15s ease-out',
          }}
        />
      ))}
    </Stack>
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
    <Box
      sx={{
        position: 'fixed', inset: 0, zIndex: 50,
        bgcolor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <IconButton
        sx={{ position: 'absolute', top: 16, right: 16, zIndex: 50, color: 'white', bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
        onClick={(e) => { e.stopPropagation(); onClose() }}
      >
        <Close />
      </IconButton>

      <Box
        sx={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={altText}
          sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 2 }}
        />
      </Box>
    </Box>
  )
}

export function ChatPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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

  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
  const dir = isRTL ? 'rtl' : 'ltr'

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

  // Send voice message
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
          id: user.id, email: user.email ?? '', first_name: user.first_name ?? null,
          last_name: user.last_name ?? null, avatar_url: user.avatar_url ?? null,
          phone: null, country_code: null, language: user.language ?? 'en',
          theme: user.theme ?? 'dark', created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } : undefined,
      }

      addMessage(voiceMessage)
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)

      const supabase = createClient()
      await supabase.from('chat_messages').insert({
        family_id: familyId, content: t.chat.voiceMessage, sender_id: userId, message_type: 'voice',
      })
    } catch {
      // Silent fail in demo mode
    }
  }, [familyId, userId, recordingTime, addMessage, user, t])

  // Cleanup recording on unmount
  useEffect(() => {
    return () => { if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current) }
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const newPending: PendingFile[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { toast.error(t.chat.fileTooLarge); continue }
      const isImage = file.type.startsWith('image/')
      const preview = isImage ? URL.createObjectURL(file) : null
      newPending.push({ file, preview, caption: '' })
    }
    if (newPending.length > 0) setPendingFiles((prev) => [...prev, ...newPending])
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
      let fileUrl: string = pending.preview || URL.createObjectURL(pending.file)
      try {
        const supabase = createClient()
        const filePath = `${familyId}/${Date.now()}-${pending.file.name}`
        const { error: uploadError } = await supabase.storage.from('family-files').upload(filePath, pending.file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('family-files').getPublicUrl(filePath)
          if (urlData?.publicUrl) fileUrl = urlData.publicUrl
        } else {
          console.warn('[Chat] Supabase Storage upload failed, using blob URL:', uploadError.message)
          fileUrl = pending.preview || URL.createObjectURL(pending.file)
          if (!pending.preview) nonPreviewObjectUrlsRef.current.push(fileUrl)
        }
      } catch {
        fileUrl = pending.preview || URL.createObjectURL(pending.file)
        if (!pending.preview) nonPreviewObjectUrlsRef.current.push(fileUrl)
      }

      const fileMessage: ChatMessage = {
        id: `${messageType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        family_id: familyId, content, sender_id: userId, message_type: messageType,
        file_url: fileUrl, file_name: pending.file.name, file_size: pending.file.size,
        thumbnail_url: isImage ? fileUrl : undefined, reply_to: null,
        created_at: new Date().toISOString(),
        sender: user ? {
          id: user.id, email: user.email ?? '', first_name: user.first_name ?? null,
          last_name: user.last_name ?? null, avatar_url: user.avatar_url ?? null,
          phone: null, country_code: null, language: user.language ?? 'en',
          theme: user.theme ?? 'dark', created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } : undefined,
      }
      addMessage(fileMessage)
      try {
        const supabase = createClient()
        await supabase.from('chat_messages').insert({
          family_id: familyId, content, sender_id: userId, message_type: messageType,
          file_url: fileUrl, file_name: pending.file.name, file_size: pending.file.size,
        })
      } catch { /* silent */ }
    }
    setPendingFiles((prev) => { prev.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview) }); return [] })
    setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
  }, [familyId, userId, pendingFiles, addMessage, user, t])

  const cancelPendingFiles = useCallback(() => {
    setPendingFiles((prev) => { prev.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview) }); return [] })
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragOver(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDragOver(false) }, [])
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }, [])
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); dragCounterRef.current = 0; if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files) }, [handleFileSelect])

  // Typing indicator
  useEffect(() => {
    if (!familyId || !userId) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (newMessage.trim().length > 0) {
      typingTimeoutRef.current = setTimeout(() => {}, 3000)
    }
    prevNewMessageRef.current = newMessage
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current) }
  }, [newMessage, familyId, userId])

  // Demo typing indicator
  useEffect(() => {
    if (socketStatus === 'connected') return () => {}
    let innerTimer: ReturnType<typeof setTimeout> | null = null
    if (familyMembers.length > 0 && !showDemoTyping) {
      const timer1 = setTimeout(() => {
        const nouraMember = familyMembers.find((m) => m.user_id === 'demo-user-002')
        if (nouraMember) {
          const name = nouraMember.profiles?.first_name ?? (isRTL ? 'نورة' : 'Noura')
          setTyping('demo-user-002', name)
          setShowDemoTyping(true)
          innerTimer = setTimeout(() => { clearTyping('demo-user-002'); setShowDemoTyping(false) }, 3000)
        }
      }, 1500)
      return () => { clearTimeout(timer1); if (innerTimer) clearTimeout(innerTimer) }
    }
  }, [familyMembers, isRTL, setTyping, clearTyping, showDemoTyping, socketStatus])

  // Demo presence
  useEffect(() => {
    if (familyMembers.length === 0) return
    if (socketStatus === 'connected') return () => {}
    if (userId) setOnline(userId)
    familyMembers.forEach((member) => { if (member.user_id !== userId) { if (Math.random() > 0.3) setOnline(member.user_id) } })
    const interval = setInterval(() => {
      familyMembers.forEach((member) => {
        if (member.user_id !== userId) {
          const currentlyOnline = isUserOnline(member.user_id)
          if (Math.random() < 0.1) { if (currentlyOnline) setOffline(member.user_id); else setOnline(member.user_id) }
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
      const { data, error } = await supabase.from('chat_messages').select('*, sender:profiles(*)').eq('family_id', familyId).order('created_at', { ascending: true })
      if (error) throw error
      if (data) setMessages(data as ChatMessage[])
    } catch { toast.error(t.common.error) } finally { setIsLoading(false) }
  }, [familyId, setMessages, setIsLoading, t])

  const fetchMessagesRef = useRef(fetchMessages)
  const addMessageRef = useRef(addMessage)
  fetchMessagesRef.current = fetchMessages
  addMessageRef.current = addMessage

  // Realtime subscription
  useEffect(() => {
    if (!familyId) return
    const supabase = createClient()
    fetchMessagesRef.current()
    const channel = supabase
      .channel(`chat-${familyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `family_id=eq.${familyId}` },
        async (payload) => {
          if (!payload.new) return
          const newMsg = payload.new as ChatMessage
          const exists = useChatStore.getState().messages.some(m => m.id === newMsg.id)
          if (exists) return
          const { data: senderData } = await supabase.from('profiles').select('*').eq('id', newMsg.sender_id).single()
          addMessageRef.current({ ...newMsg, sender: senderData ?? undefined })
          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
            if (scrollHeight - scrollTop - clientHeight < 200) setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
          }
        })
      .subscribe()
    channelRef.current = channel
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null } }
  }, [familyId])

  // Auto-scroll on load
  useEffect(() => {
    if (!isLoading && messages.length > 0) setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'instant' }) }, 100)
  }, [isLoading, messages.length])

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
      const optimisticMsg: ChatMessage = {
        id: messageId, family_id: familyId, content, sender_id: userId, message_type: 'text',
        reply_to: null, created_at: timestamp,
        sender: user ? {
          id: user.id, email: user.email ?? '', first_name: user.first_name ?? null,
          last_name: user.last_name ?? null, avatar_url: user.avatar_url ?? null,
          phone: null, country_code: null, language: user.language ?? 'en',
          theme: user.theme ?? 'dark', created_at: timestamp, updated_at: timestamp,
        } : undefined,
      }
      addMessage(optimisticMsg)
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
      try {
        const supabase = createClient()
        const { error } = await supabase.from('chat_messages').insert({ family_id: familyId, content, sender_id: userId, message_type: 'text' })
        if (error) throw error
      } catch { /* silent */ }
    } catch (error) { console.error('Error sending message:', error) } finally { setIsSending(false); inputRef.current?.focus() }
  }

  const scrollToBottom = () => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }

  const filteredMessages = getFilteredMessages()
  const messageGroups = groupMessagesByDate(filteredMessages)

  const getSenderAvatar = (senderId: string) => { const member = familyMembers.find((m) => m.user_id === senderId); return member?.profiles?.avatar_url ?? null }
  const getSenderName = (senderId: string) => {
    const member = familyMembers.find((m) => m.user_id === senderId)
    if (member?.profiles?.first_name) return `${member.profiles.first_name}${member.profiles.last_name ? ` ${member.profiles.last_name}` : ''}`
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
  }, [userId, toggleReaction, familyId])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!activePickerMsgId) return
    const handleClickOutside = () => setActivePickerMsgId(null)
    const timer = setTimeout(() => { document.addEventListener('click', handleClickOutside) }, 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClickOutside) }
  }, [activePickerMsgId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPendingFiles((prev) => { prev.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview) }); return prev })
      nonPreviewObjectUrlsRef.current.forEach(URL.revokeObjectURL)
      nonPreviewObjectUrlsRef.current = []
    }
  }, [])

  // Render message content
  const renderMessageContent = (msg: ChatMessage, isOwn: boolean) => {
    const isImage = msg.message_type === 'image'
    const isFile = msg.message_type === 'file'
    const isVoice = msg.message_type === 'voice'

    if (isImage && msg.file_url) {
      return (
        <Paper
          sx={{
            borderRadius: 4, overflow: 'hidden', maxWidth: 300, cursor: 'pointer',
            '&:hover': { opacity: 0.95 },
            borderBottomRightRadius: isOwn ? 1 : undefined,
            borderBottomLeftRadius: isOwn ? undefined : 1,
          }}
          onClick={() => setLightboxImage({ url: msg.file_url!, alt: msg.file_name || 'Image' })}
        >
          <Box component="img" src={msg.thumbnail_url || msg.file_url} alt={msg.file_name || 'Image'} sx={{ width: '100%', objectFit: 'cover' }} />
          {msg.content && msg.content !== t.chat.imageSent && (
            <Box sx={{ px: 1.5, py: 1, bgcolor: isOwn ? 'primary.main' : 'background.paper', borderTop: isOwn ? 0 : 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: isOwn ? 'primary.contrastText' : 'text.primary', lineHeight: 1.4 }}>
                {msg.content}
              </Typography>
            </Box>
          )}
        </Paper>
      )
    }

    if (isFile && msg.file_name) {
      const { Icon, sxColor, sxBg } = getFileIconAndColor(msg.file_name)
      return (
        <Box sx={{ borderRadius: 4, display: 'inline-block', borderBottomRightRadius: isOwn ? 1 : undefined, borderBottomLeftRadius: isOwn ? undefined : 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 4, p: 1.5, minWidth: 200 }}>
            <Box sx={{ p: 1, borderRadius: 2, flexShrink: 0, ...sxBg }}><Icon sx={{ fontSize: 20, ...sxColor }} /></Box>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500} noWrap>{msg.file_name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{msg.file_size ? formatFileSize(msg.file_size) : ''}</Typography>
            </Stack>
            {msg.file_url && (
              <IconButton size="small" component="a" href={msg.file_url} download={msg.file_name} onClick={(e) => e.stopPropagation()} aria-label={t.chat.download}>
                <Download sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Stack>
          {msg.content && msg.content !== t.chat.fileSent && (
            <Box sx={{ px: 1.5, py: 0.75, bgcolor: isOwn ? 'primary.main' : 'background.paper', borderTop: 1, borderColor: 'divider', borderBottomLeftRadius: isOwn ? undefined : 12, borderBottomRightRadius: isOwn ? 12 : undefined }}>
              <Typography variant="caption" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: isOwn ? 'primary.contrastText' : 'text.primary', lineHeight: 1.4 }}>
                {msg.content}
              </Typography>
            </Box>
          )}
        </Box>
      )
    }

    if (isVoice) {
      return <VoiceMessageBubble msg={msg} isOwn={isOwn} isRTL={isRTL} voiceMessageLabel={t.chat.voiceMessage} />
    }

    // Text message
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4, px: 2, py: 1.25, display: 'inline-block', boxShadow: 1,
          bgcolor: isOwn ? 'primary.main' : 'background.paper',
          color: isOwn ? 'primary.contrastText' : 'text.primary',
          borderBottomRightRadius: isOwn ? 1 : undefined,
          borderBottomLeftRadius: isOwn ? undefined : 1,
          border: isOwn ? 0 : 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" sx={{ lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {msg.content}
        </Typography>
      </Paper>
    )
  }

  return (
    <Stack
      sx={{ height: '100%', width: '100%', bgcolor: 'background.default', position: 'relative' }}
      dir={dir}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 50, bgcolor: `${theme.palette.primary.main}08`, border: 2, borderStyle: 'dashed', borderColor: `${theme.palette.primary.main}50`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <Stack alignItems="center" spacing={1.5}>
            <Box sx={{ p: 2, borderRadius: 4, bgcolor: `${theme.palette.primary.main}15` }}><Upload sx={{ fontSize: 32, color: 'primary.main' }} /></Box>
            <Typography variant="body2" fontWeight={500} color="primary.main">{t.chat.dropFilesHere}</Typography>
          </Stack>
        </Box>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox imageUrl={lightboxImage.url} altText={lightboxImage.alt} onClose={() => setLightboxImage(null)} />
      )}

      {/* Header */}
      <Box sx={{ flexShrink: 0, px: isMobile ? 2 : 3, pt: 3, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ p: 1, borderRadius: 3, bgcolor: `${theme.palette.primary.main}15`, border: `1px solid ${theme.palette.primary.main}30` }}>
              <ChatIcon sx={{ color: 'primary.main' }} />
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700}>{t.chat.title}</Typography>
                {/* Connection Status */}
                <Chip
                  size="small"
                  icon={
                    <Box sx={{
                      width: 6, height: 6, borderRadius: '50%',
                      bgcolor: socketStatus === 'connected' ? 'success.main' : socketStatus === 'reconnecting' ? 'warning.main' : 'error.main',
                    }} />
                  }
                  label={socketStatus === 'connected' ? t.chat.realTimeEnabled : t.chat.localMode}
                  sx={{
                    height: 20, fontSize: 10, fontWeight: 500,
                    bgcolor: socketStatus === 'connected' ? 'success.main' : socketStatus === 'reconnecting' ? 'warning.main' : 'error.main',
                    color: 'white', opacity: 0.9,
                    '& .MuiChip-icon': { ml: 0.5 },
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {familyMembers.length} {isRTL ? 'أعضاء' : 'members'} · {onlineCount} {t.chat.membersOnline}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setShowSearch(!showSearch)} sx={{ color: 'text.secondary' }}>
            {showSearch ? <Close /> : <Search />}
          </IconButton>
        </Stack>

        {/* Online Members Bar */}
        {onlineMembers.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
            <Stack direction="row" sx={{ '& > :not(:first-of-type)': { ml: -0.5 } }}>
              {onlineMembers.slice(0, 5).map((member) => (
                <Box key={member.user_id} sx={{ position: 'relative' }}>
                  <Avatar sx={{ width: 28, height: 28, border: 2, borderColor: 'background.paper' }} src={member.profiles?.avatar_url ?? undefined}>
                    {getInitials(member.profiles?.first_name ?? null, member.profiles?.last_name ?? null)}
                  </Avatar>
                  <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', border: 2, borderColor: 'background.paper' }} />
                </Box>
              ))}
              {onlineMembers.length > 5 && (
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'background.paper', border: 2, borderColor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>+{onlineMembers.length - 5}</Typography>
                </Avatar>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {onlineCount} {t.chat.membersOnline}
            </Typography>
          </Stack>
        )}

        {/* Search bar */}
        {showSearch && (
          <TextField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.chat.search}
            autoFocus
            size="small"
            fullWidth
            sx={{ mt: 1.5 }}
            InputProps={{ startAdornment: <Search sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} /> }}
          />
        )}
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isLoading ? (
          <Box sx={{ px: isMobile ? 2 : 3, py: 3 }}><MessageSkeleton count={4} /></Box>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={ChatIcon}
            title="No messages yet"
            description="Start the conversation with your family"
            action={{ label: 'Send Message', onClick: () => inputRef.current?.focus() }}
          />
        ) : (
          <Box
            ref={scrollRef}
            onScroll={handleScroll}
            sx={{ height: '100%', overflow: 'auto', px: isMobile ? 2 : 3 }}
          >
            <Stack spacing={0.5} sx={{ pb: 2 }} role="log" aria-label="Chat messages">
              {messageGroups.map((group) => (
                <Box key={group.label}>
                  {/* Date separator */}
                  <Stack alignItems="center" sx={{ my: 3 }}>
                    <Chip
                      label={group.label}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500, fontSize: 12 }}
                    />
                  </Stack>

                  {/* Messages */}
                  {group.messages.map((msg, index) => {
                    const isOwn = msg.sender_id === userId
                    const isSystem = msg.message_type === 'system'
                    const isImageMsg = msg.message_type === 'image'
                    const isFileMsg = msg.message_type === 'file'
                    const prevMsg = index > 0 ? group.messages[index - 1] : null
                    const isConsecutive = prevMsg && prevMsg.sender_id === msg.sender_id && !isSystem

                    if (isSystem) {
                      return (
                        <Stack alignItems="center" key={msg.id} sx={{ my: 1.5 }}>
                          <Chip label={msg.content} size="small" variant="outlined" sx={{ maxWidth: '85%', fontSize: 12 }} />
                        </Stack>
                      )
                    }

                    const readStatus = isOwn ? getDemoReadStatus(msg.id) : null

                    return (
                      <Stack
                        key={msg.id}
                        direction={isOwn ? 'row-reverse' : 'row'}
                        spacing={1}
                        sx={{ mb: isConsecutive ? 0.25 : 1.5, position: 'relative', '&:hover .reaction-btn': { opacity: 1 } }}
                      >
                        {/* Avatar */}
                        {!isOwn && (
                          <Box sx={{ flexShrink: 0, width: 32 }}>
                            {!isConsecutive ? (
                              <Box sx={{ position: 'relative' }}>
                                <Avatar sx={{ width: 32, height: 32, border: 1, borderColor: 'divider' }} src={getSenderAvatar(msg.sender_id) ?? undefined}>
                                  {getSenderName(msg.sender_id).split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </Avatar>
                                {isUserOnline(msg.sender_id) && (
                                  <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', border: 2, borderColor: 'background.paper' }} />
                                )}
                              </Box>
                            ) : (
                              <Box sx={{ width: 32 }} />
                            )}
                          </Box>
                        )}

                        {/* Message bubble */}
                        <Stack sx={{ maxWidth: isMobile ? '75%' : '65%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                          {/* Sender name */}
                          {!isOwn && !isConsecutive && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5, ml: 0.5 }}>
                              <Typography variant="caption" fontWeight={500} color="secondary.main">
                                {getSenderName(msg.sender_id)}
                              </Typography>
                              {isUserOnline(msg.sender_id) && (
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                              )}
                            </Stack>
                          )}

                          {/* Message content + reaction button */}
                          <Box sx={{ position: 'relative' }}>
                            {renderMessageContent(msg, isOwn)}

                            {/* Add reaction button */}
                            {!(isImageMsg || isFileMsg) && (
                              <IconButton
                                className="reaction-btn"
                                size="small"
                                onClick={(e) => { e.stopPropagation(); setActivePickerMsgId(activePickerMsgId === msg.id ? null : msg.id) }}
                                aria-label={t.chat.addReaction}
                                sx={{
                                  position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                                  opacity: 0, width: 24, height: 24, bgcolor: 'action.hover',
                                  [isOwn ? 'left' : 'right']: -32,
                                  '&:hover': { bgcolor: 'action.selected' },
                                }}
                              >
                                <Add sx={{ fontSize: 12 }} />
                              </IconButton>
                            )}

                            {/* Emoji picker */}
                            {activePickerMsgId === msg.id && (
                              <Box
                                sx={{
                                  position: 'absolute', zIndex: 20, top: '100%', mt: 0.5,
                                  ...(isOwn ? { right: 0 } : { left: 0 }),
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Paper elevation={8} sx={{ p: 0.75, display: 'flex', gap: 0.25, borderRadius: 3 }}>
                                  {QUICK_EMOJIS.map((emoji) => (
                                    <IconButton key={emoji} size="small" onClick={() => handleReaction(msg.id, emoji)} sx={{ width: 32, height: 32, fontSize: 16 }}>
                                      {emoji}
                                    </IconButton>
                                  ))}
                                </Paper>
                              </Box>
                            )}
                          </Box>

                          {/* Reaction pills */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', ...(isOwn ? { justifyContent: 'flex-end', mr: 0.5 } : { justifyContent: 'flex-start', ml: 0.5 }) }}>
                              {msg.reactions.map((reaction) => {
                                const isActive = userId ? reaction.users.includes(userId) : false
                                return (
                                  <Chip
                                    key={reaction.emoji}
                                    size="small"
                                    label={<Stack direction="row" spacing={0.25} alignItems="center"><span style={{ fontSize: 14 }}>{reaction.emoji}</span><Typography variant="caption" color={isActive ? 'secondary.main' : 'text.secondary'}>{reaction.users.length}</Typography></Stack>}
                                    variant={isActive ? 'filled' : 'outlined'}
                                    color={isActive ? 'primary' : 'default'}
                                    onClick={() => handleReaction(msg.id, reaction.emoji)}
                                    sx={{ cursor: 'pointer', height: 22, '& .MuiChip-label': { px: 0.75 } }}
                                  />
                                )
                              })}
                            </Stack>
                          )}

                          {/* Timestamp + Read Receipts */}
                          {!isConsecutive && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, ...(isOwn ? { justifyContent: 'flex-end', mr: 0.5 } : { justifyContent: 'flex-start', ml: 0.5 }) }}>
                              <Typography variant="caption" sx={{ fontSize: 10 }} color="text.secondary">
                                {formatMessageTime(msg.created_at)}
                              </Typography>
                              {isOwn && readStatus && (
                                <Box sx={{ color: readStatus === 'read' ? 'primary.main' : 'text.secondary', display: 'flex' }}>
                                  {readStatus === 'sent' ? <Check sx={{ fontSize: 12 }} /> : <DoneAll sx={{ fontSize: 12 }} />}
                                </Box>
                              )}
                            </Stack>
                          )}
                          {isConsecutive && isOwn && readStatus && (
                            <Stack direction="row" justifyContent="flex-end" sx={{ mr: 0.5, mt: -0.25 }}>
                              <Box sx={{ color: readStatus === 'read' ? 'primary.main' : 'text.secondary', display: 'flex' }}>
                                {readStatus === 'sent' ? <Check sx={{ fontSize: 10 }} /> : <DoneAll sx={{ fontSize: 10 }} />}
                              </Box>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                    )
                  })}
                </Box>
              ))}

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5, px: 0.5 }} aria-live="polite">
                  <Box sx={{ flexShrink: 0, width: 32, position: 'relative' }}>
                    <Avatar sx={{ width: 32, height: 32, border: 1, borderColor: 'divider' }}>
                      {typingUsers[0].userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </Avatar>
                    <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', border: 2, borderColor: 'background.paper' }} />
                  </Box>
                  <Paper variant="outlined" sx={{ px: 2, py: 1, borderRadius: 4, borderBottomLeftRadius: 1, display: 'flex', alignItems: 'center', gap: 1, boxShadow: 1 }}>
                    <Stack direction="row" spacing={0.5}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 1.2s infinite' }} />
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 1.2s infinite 0.2s' }} />
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 1.2s infinite 0.4s' }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {typingUsers[0].userName} {t.chat.isTyping}
                    </Typography>
                  </Paper>
                </Stack>
              )}

              <Box ref={bottomRef} />
            </Stack>
          </Box>
        )}

        {/* Scroll to bottom button */}
        {showScrollBottom && (
          <Box sx={{ position: 'absolute', bottom: 16, right: isMobile ? 16 : 24 }}>
            <IconButton
              onClick={scrollToBottom}
              sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'background.paper', border: 1, borderColor: 'divider', boxShadow: 3, color: 'text.secondary' }}
            >
              <KeyboardArrowDown />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && (
        <Box sx={{ flexShrink: 0, px: isMobile ? 2 : 3, borderTop: 1, borderColor: 'divider' }}>
          <Stack spacing={1} sx={{ py: 1.5 }}>
            {pendingFiles.map((pending, index) => {
              const isImage = pending.file.type.startsWith('image/')
              return (
                <Stack key={index} direction="row" alignItems="flex-start" spacing={1} component={Paper} variant="outlined" sx={{ p: 1.5, borderRadius: 4 }}>
                  {isImage && pending.preview ? (
                    <Box component="img" src={pending.preview} alt={pending.file.name} sx={{ maxHeight: 128, borderRadius: 2, objectFit: 'cover', border: 1, borderColor: 'divider' }} />
                  ) : (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1 }}>
                      {(() => {
                        const { Icon, sxColor, sxBg } = getFileIconAndColor(pending.file.name)
                        return <Box sx={{ p: 1, borderRadius: 2, ...sxBg }}><Icon sx={{ fontSize: 20, ...sxColor }} /></Box>
                      })()}
                      <Stack sx={{ minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={500} noWrap sx={{ maxWidth: 150 }}>{pending.file.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{formatFileSize(pending.file.size)}</Typography>
                      </Stack>
                    </Stack>
                  )}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    <TextField
                      value={pending.caption}
                      onChange={(e) => setPendingFiles((prev) => prev.map((p, i) => i === index ? { ...p, caption: e.target.value } : p))}
                      placeholder={t.chat.addCaption}
                      size="small"
                      fullWidth
                      sx={{ '& .MuiInputBase-input': { fontSize: 12, py: 0.5 } }}
                    />
                    <IconButton size="small" onClick={() => removePendingFile(index)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' }, flexShrink: 0 }}>
                      <Cancel sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                </Stack>
              )
            })}
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button size="small" color="inherit" onClick={cancelPendingFiles}>{t.common.cancel}</Button>
              <Button size="small" variant="contained" startIcon={<Send sx={{ fontSize: 12 }} />} onClick={handleSendFiles}>
                {pendingFiles.some((p) => p.file.type.startsWith('image/')) ? t.chat.sendImage : t.chat.sendFile}
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Message Input / Recording Panel */}
      <Box sx={{ flexShrink: 0, px: isMobile ? 2 : 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        {isRecording ? (
          <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderColor: `${theme.palette.primary.main}30` }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconButton onClick={handleCancelRecording} aria-label={t.chat.cancelRecording} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'error.main' + '15' } }}>
                <Close />
              </IconButton>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', animation: 'pulse 1.5s infinite' }} />
                <Typography variant="body2" fontWeight={500}>{t.chat.recording}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {formatDuration(recordingTime)}
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <RecordingWaveform />
              </Box>
              <IconButton onClick={handleSendVoiceMessage} aria-label={t.chat.sendVoice} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                <Send />
              </IconButton>
            </Stack>
          </Paper>
        ) : (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 4, px: 2, py: 1, '&:focus-within': { borderColor: `${theme.palette.primary.main}50` } }}>
            <IconButton size="small" onClick={() => fileInputRef.current?.click()} aria-label={t.chat.attachFile} sx={{ color: 'text.secondary' }}>
              <AttachFile sx={{ fontSize: 16 }} />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files && e.target.files.length > 0) { handleFileSelect(e.target.files); e.target.value = '' } }}
            />
            <TextField
              inputRef={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t.chat.placeholder}
              variant="standard"
              fullWidth
              InputProps={{ disableUnderline: true, sx: { fontSize: 14 } }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
            />
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              <EmojiEmotions sx={{ fontSize: 16 }} />
            </IconButton>
            {showSendButton ? (
              <IconButton onClick={handleSendMessage} disabled={isSending} aria-label="Send message" size="small" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { opacity: 0.5 } }}>
                {isSending ? <Box sx={{ width: 16, height: 16, border: 2, borderColor: 'divider', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Send sx={{ fontSize: 16 }} />}
              </IconButton>
            ) : (
              <IconButton onClick={handleStartRecording} aria-label="Record voice message" size="small" sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 2, '&:hover': { bgcolor: 'primary.dark' } }}>
                <Mic sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Stack>
        )}
      </Box>

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Stack>
  )
}
