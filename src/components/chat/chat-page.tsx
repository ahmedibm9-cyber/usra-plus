'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

// Read receipt type for demo purposes
type ReadStatus = 'sent' | 'delivered' | 'read'

// Demo read receipts: assign random read statuses to own messages
function getDemoReadStatus(messageId: string): ReadStatus {
  // Use a simple hash to deterministically assign status
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
  durationLabel,
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

  // Generate deterministic waveform bar heights based on message id
  const barHeights = useMemo(() => {
    const seed = msg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const heights: number[] = []
    for (let i = 0; i < 7; i++) {
      const h = ((seed * (i + 1) * 7) % 14) + 2 // range 2-16px
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
      const totalSteps = duration > 0 ? duration * 10 : 30 // 100ms steps
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
        {/* Play button */}
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

        {/* Waveform */}
        <div className={`flex-1 flex items-center gap-[1px] h-8 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {barHeights.map((h, i) => {
            const progressIndex = playProgress * barHeights.length
            const isFilled = i < progressIndex
            return (
              <motion.div
                key={i}
                className={`rounded-full w-[3px] transition-colors duration-150 ${
                  isFilled ? 'bg-[#6366F1]' : isOwn ? 'bg-white/30' : 'bg-[#6366F1]/30'
                }`}
                style={{ height: `${h}px` }}
                initial={false}
                animate={{ height: isPlaying ? `${h + Math.sin(Date.now() / 200 + i) * 2}px` : `${h}px` }}
                transition={{ duration: 0.15 }}
              />
            )
          })}
        </div>

        {/* Duration */}
        <span className="text-xs text-[#6B7280] flex-shrink-0 min-w-[32px] text-center">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Voice message label */}
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

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

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

    // Stop recording timer
    setIsRecording(false)
    setRecordingTime(0)
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }

    // Create mock voice message
    const voiceMessage: ChatMessage = {
      id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      family_id: familyId,
      content: isRTL ? t.chat.voiceMessage : t.chat.voiceMessage,
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

    // Auto-scroll to bottom
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    // Try to send to Supabase (will fail gracefully if tables don't exist)
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
  }, [familyId, userId, recordingTime, addMessage, user, isRTL, t])

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  // Demo typing indicator: show "Noura is typing..." for 3 seconds on load
  useEffect(() => {
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
  }, [familyMembers, isRTL, setTyping, clearTyping, showDemoTyping])

  // Demo presence: randomly toggle online status for other users
  useEffect(() => {
    if (familyMembers.length === 0) return

    // Mark current user as online
    if (userId) {
      setOnline(userId)
    }

    // Mark demo users as online initially (randomly)
    familyMembers.forEach((member) => {
      if (member.user_id !== userId) {
        // Randomly set some as online
        const isOnline = Math.random() > 0.3 // 70% chance online
        if (isOnline) {
          setOnline(member.user_id)
        }
      }
    })

    // Randomly toggle other users' presence for demo
    const interval = setInterval(() => {
      familyMembers.forEach((member) => {
        if (member.user_id !== userId) {
          const currentlyOnline = isUserOnline(member.user_id)
          // 10% chance to toggle status
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
  }, [familyMembers, userId, setOnline, setOffline, isUserOnline])

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
          // Fetch sender profile
          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single()

          addMessage({
            ...newMsg,
            sender: senderData ?? undefined,
          })

          // Auto-scroll to bottom if near bottom
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

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300)
  }, [])

  // Send message
  const handleSendMessage = async () => {
    if (!familyId || !userId || !newMessage.trim()) return
    const content = newMessage.trim()
    setIsSending(true)
    setNewMessage('')

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
      toast.error(t.common.error)
      setNewMessage(content)
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

  // Find sender member details
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

  // Get online members for avatars bar
  const onlineUserIds = getOnlineUserIds()
  const onlineCount = getOnlineCount()
  const onlineMembers = familyMembers.filter((m) => onlineUserIds.includes(m.user_id))

  // Get typing users (excluding current user)
  const typingUsers = getTypingUsers().filter((u) => u.userId !== userId)

  // Determine if send button or mic button should show
  const showSendButton = newMessage.trim().length > 0

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0B0F]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20">
              <MessageCircle className="w-5 h-5 text-[#6366F1]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#E5E7EB]">
                {t.chat.title}
              </h1>
              <p className="text-sm text-[#6B7280]">
                {familyMembers.length} {isRTL ? 'أعضاء' : 'members'} · {onlineCount} {t.chat.membersOnline}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="h-9 w-9 text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.06] rounded-xl"
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
                  <Avatar className="h-7 w-7 border-2 border-[#0B0B0F]">
                    <AvatarImage
                      src={member.profiles?.avatar_url ?? undefined}
                      alt={member.profiles?.first_name ?? ''}
                    />
                    <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-[10px] font-medium">
                      {getInitials(member.profiles?.first_name ?? null, member.profiles?.last_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 size-2 rounded-full bg-green-400 ring-2 ring-[#111117] online-dot-pulse" />
                </div>
              ))}
              {onlineMembers.length > 5 && (
                <div className="h-7 w-7 rounded-full bg-[#111117] border-2 border-[#0B0B0F] flex items-center justify-center">
                  <span className="text-[10px] text-[#6B7280] font-medium">
                    +{onlineMembers.length - 5}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-[#6B7280] ml-1 rtl:mr-1 rtl:ml-0">
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.chat.search}
                  autoFocus
                  className="pl-10 bg-[#111117] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
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
              <div className="space-y-1 pb-4">
                {messageGroups.map((group) => (
                  <div key={group.label}>
                    {/* Date separator */}
                    <div className="flex items-center justify-center my-6">
                      <div className="bg-[#111117] border border-white/[0.06] rounded-full px-4 py-1">
                        <span className="text-xs font-medium text-[#6B7280]">
                          {group.label}
                        </span>
                      </div>
                    </div>

                    {/* Messages */}
                    {group.messages.map((msg, index) => {
                      const isOwn = msg.sender_id === userId
                      const isSystem = msg.message_type === 'system'
                      const isVoice = msg.message_type === 'voice'
                      const prevMsg = index > 0 ? group.messages[index - 1] : null
                      const isConsecutive =
                        prevMsg && prevMsg.sender_id === msg.sender_id && !isSystem

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-3">
                            <div className="bg-[#111117]/60 border border-white/[0.04] rounded-full px-4 py-1.5 max-w-[85%]">
                              <span className="text-xs text-[#6B7280] text-center">
                                {msg.content}
                              </span>
                            </div>
                          </div>
                        )
                      }

                      // Read receipt status for own messages
                      const readStatus = isOwn ? getDemoReadStatus(msg.id) : null

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex gap-2.5 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
                            isConsecutive ? 'mt-0.5' : 'mt-3'
                          }`}
                        >
                          {/* Avatar */}
                          {!isOwn && (
                            <div className="flex-shrink-0 w-8">
                              {!isConsecutive ? (
                                <div className="relative">
                                  <Avatar className="h-8 w-8 border border-white/[0.08]">
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
                                  {/* Online dot on avatar */}
                                  {isUserOnline(msg.sender_id) && (
                                    <span className="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 size-2.5 rounded-full bg-green-400 ring-2 ring-[#111117] online-dot-pulse" />
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
                            {/* Sender name (show for first message in group) */}
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

                            {/* Voice message bubble */}
                            {isVoice ? (
                              <div
                                className={`
                                  rounded-2xl inline-block
                                  ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}
                                `}
                              >
                                <VoiceMessageBubble
                                  msg={msg}
                                  isOwn={isOwn}
                                  isRTL={isRTL}
                                  voiceMessageLabel={t.chat.voiceMessage}
                                  durationLabel={t.chat.duration}
                                />
                              </div>
                            ) : (
                              /* Text message bubble */
                              <div
                                className={`
                                  rounded-2xl px-4 py-2.5 inline-block
                                  ${
                                    isOwn
                                      ? 'bg-[#6366F1] text-white rounded-br-md'
                                      : 'bg-[#111117] border border-white/[0.08] text-[#E5E7EB] rounded-bl-md'
                                  }
                                `}
                              >
                                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                              </div>
                            )}

                            {/* Timestamp + Read Receipts */}
                            {!isConsecutive && (
                              <div
                                className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}
                              >
                                <p className="text-[10px] text-[#6B7280]">
                                  {formatMessageTime(msg.created_at)}
                                </p>
                                {isOwn && readStatus && (
                                  <span className={`inline-flex ${readStatus === 'read' ? 'text-[#6366F1]' : 'text-[#6B7280]'}`}>
                                    {readStatus === 'sent' ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <CheckCheck className="w-3 h-3" />
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Show read receipt on consecutive own messages too (subtle) */}
                            {isConsecutive && isOwn && readStatus && (
                              <div className="flex justify-end mr-1 -mt-0.5">
                                <span className={`inline-flex ${readStatus === 'read' ? 'text-[#6366F1]' : 'text-[#6B7280]'}`}>
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
                    >
                      <div className="flex-shrink-0 w-8">
                        <div className="relative">
                          <Avatar className="h-8 w-8 border border-white/[0.08]">
                            <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-xs font-medium">
                              {typingUsers[0].userName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 size-2.5 rounded-full bg-green-400 ring-2 ring-[#111117] online-dot-pulse" />
                        </div>
                      </div>
                      <div className="bg-[#111117] border border-white/[0.08] rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          <span className="typing-dot-1 size-1.5 rounded-full bg-[#6B7280]" />
                          <span className="typing-dot-2 size-1.5 rounded-full bg-[#6B7280]" />
                          <span className="typing-dot-3 size-1.5 rounded-full bg-[#6B7280]" />
                        </div>
                        <span className="text-xs text-[#6B7280]">
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
                    className="h-10 w-10 rounded-full bg-[#111117] border border-white/[0.08] text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#111117] shadow-lg"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Message Input / Recording Panel */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-white/[0.06]">
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
              <div className="bg-[#111117] border border-[#6366F1]/20 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Cancel button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelRecording}
                    className="h-9 w-9 text-[#6B7280] hover:text-red-400 hover:bg-red-400/10 rounded-full flex-shrink-0 transition-colors"
                    aria-label={t.chat.cancelRecording}
                  >
                    <X className="w-5 h-5" />
                  </Button>

                  {/* Recording indicator */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-[#E5E7EB] font-medium">
                      {t.chat.recording}
                    </span>
                  </div>

                  {/* Elapsed time */}
                  <span className="text-sm text-[#6B7280] font-mono tabular-nums flex-shrink-0">
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
              <div className="flex items-center gap-2 bg-[#111117] border border-white/[0.08] rounded-2xl px-4 py-2 focus-within:border-[#6366F1]/30 transition-colors">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#6B7280] hover:text-[#E5E7EB] hover:bg-transparent rounded-lg flex-shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t.chat.placeholder}
                  className="flex-1 border-0 bg-transparent text-[#E5E7EB] placeholder:text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0 text-sm"
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
                  className="h-8 w-8 text-[#6B7280] hover:text-[#E5E7EB] hover:bg-transparent rounded-lg flex-shrink-0"
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
                        className="h-8 w-8 p-0 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg flex-shrink-0 disabled:opacity-50"
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                        aria-label={t.chat.tapToRecord}
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
