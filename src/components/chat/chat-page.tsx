'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import {
  Send,
  Search,
  MessageCircle,
  X,
  Smile,
  Paperclip,
  ArrowDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useChatStore } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import type { ChatMessage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

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

export function ChatPage() {
  const { currentFamily, familyMembers } = useAppStore()
  const { user } = useAuthStore()
  const { t } = useI18n()
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

  const [isSending, setIsSending] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const familyId = currentFamily?.id
  const userId = user?.id

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
                {familyMembers.length} members
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
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6B7280]">{t.common.loading}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-6"
          >
            <div className="p-5 rounded-2xl bg-[#111117] border border-white/[0.08] mb-4">
              <MessageCircle className="w-12 h-12 text-[#6B7280]" />
            </div>
            <h3 className="text-lg font-semibold text-[#E5E7EB] mb-1">
              {t.chat.noMessages}
            </h3>
            <p className="text-sm text-[#6B7280] max-w-[250px]">
              {t.chat.noMessagesDesc}
            </p>
          </motion.div>
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
                              <p className="text-xs font-medium text-[#A78BFA] mb-1 ml-1">
                                {getSenderName(msg.sender_id)}
                              </p>
                            )}

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

                            {/* Timestamp */}
                            {!isConsecutive && (
                              <p
                                className={`text-[10px] text-[#6B7280] mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}
                              >
                                {formatMessageTime(msg.created_at)}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ))}
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

      {/* Message Input */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-white/[0.06]">
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
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="h-8 w-8 p-0 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg flex-shrink-0 disabled:opacity-50"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
