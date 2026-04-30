'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTaskStore } from '@/stores/task-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { UpgradeModal } from '@/components/shared/upgrade-modal'
import { UpgradePrompt } from '@/components/shared/plan-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { TaskCardSkeleton } from '@/components/shared/skeleton-patterns'
import { useI18n } from '@/i18n/use-translation'
import type { Task, TaskPriority, TaskStatus, FamilyMember, UserProfile } from '@/types'
import { format, isToday, isTomorrow, isPast, isThisWeek, formatDistanceToNow, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
  Trash2,
  ClipboardList,
  AlertTriangle,
  MoreHorizontal,
  X,
  User,
  GripVertical,
  MessageCircle,
  Send,
  CornerDownRight,
  LayoutList,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  useDndContext,
} from '@dnd-kit/core'
import type {
  DragStartEvent,
  DragEndEvent,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { triggerConfetti } from '@/lib/confetti'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { useCommentStore } from '@/stores/comment-store'
import type { TaskComment } from '@/stores/comment-store'

// ─── Priority Config ────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; border: string; label: string }> = {
  urgent: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', label: 'Urgent' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', label: 'High' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', label: 'Medium' },
  low: { color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30', label: 'Low' },
}

const STATUS_CONFIG: Record<TaskStatus, { dot: string; label: string; icon: React.ReactNode }> = {
  todo: {
    dot: 'bg-gray-400',
    label: 'To Do',
    icon: <Circle className="size-3.5 text-gray-400" />,
  },
  in_progress: {
    dot: 'bg-blue-400',
    label: 'In Progress',
    icon: <Clock className="size-3.5 text-blue-400" />,
  },
  done: {
    dot: 'bg-green-400',
    label: 'Done',
    icon: <CheckCircle2 className="size-3.5 text-green-400" />,
  },
}

// ─── Date Grouping ──────────────────────────────────────────────────
type DateGroup = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'no_date'

function getDateGroup(task: Task): DateGroup {
  if (!task.due_date) return 'no_date'
  const date = parseISO(task.due_date)
  if (task.status !== 'done' && isPast(date) && !isToday(date)) return 'overdue'
  if (isToday(date)) return 'today'
  if (isTomorrow(date)) return 'tomorrow'
  if (isThisWeek(date)) return 'this_week'
  return 'later'
}

const DATE_GROUP_ORDER: DateGroup[] = ['overdue', 'today', 'tomorrow', 'this_week', 'later', 'no_date']

const DATE_GROUP_LABELS: Record<DateGroup, { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: 'text-red-400' },
  today: { label: 'Today', color: 'text-blue-400' },
  tomorrow: { label: 'Tomorrow', color: 'text-purple-400' },
  this_week: { label: 'This Week', color: 'text-yellow-400' },
  later: { label: 'Later', color: 'text-gray-400' },
  no_date: { label: 'No Due Date', color: 'text-gray-500' },
}

// ─── Task Form Type ─────────────────────────────────────────────────
interface TaskFormData {
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string
  due_date: Date | undefined
}

const EMPTY_FORM: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  assigned_to: '',
  due_date: undefined,
}

// ─── Relative Time Helper ──────────────────────────────────────────
function getRelativeTime(dateStr: string, isRTL: boolean): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (isRTL) {
    if (diffMin < 1) return 'الآن'
    if (diffMin < 60) return `${diffMin}د`
    if (diffHr < 24) return `${diffHr}س`
    if (diffDay < 7) return `${diffDay}ي`
    return format(date, 'MMM d')
  }
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}h`
  if (diffDay < 7) return `${diffDay}d`
  return format(date, 'MMM d')
}

// ─── Comments Panel Component ────────────────────────────────────────
function CommentsPanel({ taskId }: { taskId: string }) {
  const { t, isRTL } = useI18n()
  const { comments, addComment, removeComment, getCommentsForTask, getRepliesForComment, getCommentCountForTask } = useCommentStore()
  const { user } = useAuthStore()
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expanded, setExpanded] = useState(true)

  // Force re-render when comments change
  const _comments = comments
  void _comments

  const topLevelComments = getCommentsForTask(taskId)
  const commentCount = getCommentCountForTask(taskId)

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return
    const comment: TaskComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      task_id: taskId,
      parent_id: null,
      author_id: user.id,
      author_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email.split('@')[0],
      author_avatar: user.avatar_url,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    addComment(comment)
    setNewComment('')
  }

  const handleAddReply = (parentId: string) => {
    if (!replyContent.trim() || !user) return
    const reply: TaskComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      task_id: taskId,
      parent_id: parentId,
      author_id: user.id,
      author_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email.split('@')[0],
      author_avatar: user.avatar_url,
      content: replyContent.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    addComment(reply)
    setReplyContent('')
    setReplyingTo(null)
  }

  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target
    target.style.height = 'auto'
    target.style.height = `${Math.min(target.scrollHeight, 4 * 24)}px`
  }

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        <MessageCircle className="size-4 text-[#6366F1]" />
        <span className="text-sm font-medium text-[#E5E7EB]">{t.comments.comments}</span>
        {commentCount > 0 && (
          <span className="text-xs text-[#6B7280] bg-white/[0.04] px-1.5 py-0.5 rounded-full">
            {commentCount}
          </span>
        )}
        <span className="ml-auto text-[#6B7280] text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <>
          {/* Comments List */}
          <div className="max-h-64 overflow-y-auto space-y-3 mb-3 custom-scrollbar">
            {topLevelComments.length === 0 ? (
              <div className="text-center py-4">
                <MessageCircle className="size-8 text-[#6B7280]/40 mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">{t.comments.noComments}</p>
                <p className="text-xs text-[#6B7280]/60">{t.comments.startConversation}</p>
              </div>
            ) : (
              topLevelComments.map((comment) => {
                const replies = getRepliesForComment(comment.id)
                return (
                  <div key={comment.id}>
                    {/* Top-level comment */}
                    <div className="flex gap-2.5">
                      <Avatar className="h-7 w-7 rounded-full border border-white/[0.08] flex-shrink-0">
                        {comment.author_avatar && <AvatarImage src={comment.author_avatar} alt="" />}
                        <AvatarFallback className="text-[10px] bg-[#6366F1]/20 text-[#6366F1]">
                          {comment.author_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#E5E7EB]">{comment.author_name}</span>
                          <span className="text-[11px] text-[#6B7280]">{getRelativeTime(comment.created_at, isRTL)}</span>
                        </div>
                        <p className="text-sm text-[#9CA3AF] mt-0.5 break-words">{comment.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => {
                              setReplyingTo(replyingTo === comment.id ? null : comment.id)
                              setReplyContent('')
                            }}
                            className="text-xs text-[#6B7280] hover:text-[#6366F1] transition-colors"
                          >
                            <CornerDownRight className="size-3 inline mr-1" />
                            {t.comments.reply}
                          </button>
                          {comment.author_id === user?.id && (
                            <button
                              onClick={() => removeComment(comment.id)}
                              className="text-xs text-[#6B7280] hover:text-red-400 transition-colors"
                            >
                              {t.comments.delete}
                            </button>
                          )}
                        </div>

                        {/* Inline Reply Input */}
                        {replyingTo === comment.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex gap-2"
                          >
                            <textarea
                              value={replyContent}
                              onChange={(e) => {
                                setReplyContent(e.target.value)
                                handleTextareaResize(e)
                              }}
                              placeholder={`${t.comments.replyTo} ${comment.author_name}...`}
                              rows={1}
                              className="flex-1 bg-[#0B0B0F] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#E5E7EB] placeholder:text-[#6B7280] focus:outline-none focus:border-[#6366F1]/50 resize-none overflow-hidden min-h-[32px]"
                            />
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                onClick={() => handleAddReply(comment.id)}
                                disabled={!replyContent.trim()}
                                className="h-7 px-2 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white text-xs"
                              >
                                <Send className="size-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setReplyingTo(null); setReplyContent('') }}
                                className="h-7 px-2 text-[#6B7280] hover:text-[#E5E7EB] text-xs"
                              >
                                {t.comments.cancel}
                              </Button>
                            </div>
                          </motion.div>
                        )}

                        {/* Replies */}
                        {replies.length > 0 && (
                          <div className="ml-8 border-l-2 border-[#6366F1]/20 pl-3 mt-2 space-y-2">
                            {replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2">
                                <Avatar className="h-5 w-5 rounded-full border border-white/[0.08] flex-shrink-0">
                                  {reply.author_avatar && <AvatarImage src={reply.author_avatar} alt="" />}
                                  <AvatarFallback className="text-[8px] bg-[#6366F1]/20 text-[#6366F1]">
                                    {reply.author_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[#E5E7EB]">{reply.author_name}</span>
                                    <span className="text-[10px] text-[#6B7280]">{getRelativeTime(reply.created_at, isRTL)}</span>
                                  </div>
                                  <p className="text-xs text-[#9CA3AF] mt-0.5 break-words">{reply.content}</p>
                                  {reply.author_id === user?.id && (
                                    <button
                                      onClick={() => removeComment(reply.id)}
                                      className="text-[10px] text-[#6B7280] hover:text-red-400 transition-colors mt-0.5"
                                    >
                                      {t.comments.delete}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Comment Input */}
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value)
                handleTextareaResize(e)
              }}
              placeholder={t.comments.addComment}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddComment()
                }
              }}
              className="flex-1 bg-[#0B0B0F] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#E5E7EB] placeholder:text-[#6B7280] focus:outline-none focus:border-[#6366F1]/50 resize-none overflow-hidden min-h-[36px]"
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="h-9 px-3 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Task Card Component ────────────────────────────────────────────
function TaskCard({
  task,
  onToggleDone,
  onEdit,
  onDelete,
  dragHandleProps,
  isDragOverlay,
}: {
  task: Task
  onToggleDone: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  dragHandleProps?: DraggableSyntheticListeners
  isDragOverlay?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const priority = PRIORITY_CONFIG[task.priority]
  const status = STATUS_CONFIG[task.status]
  const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
  const commentCount = useCommentStore((s) => s.getCommentCountForTask(task.id))

  const dueDateLabel = useMemo(() => {
    if (!task.due_date) return null
    const date = parseISO(task.due_date)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isPast(date) && !isToday(date)) return formatDistanceToNow(date, { addSuffix: true })
    return format(date, 'MMM d')
  }, [task.due_date])

  const assigneeInitials = useMemo(() => {
    if (!task.assignee) return '?'
    const first = task.assignee.first_name?.[0] || ''
    const last = task.assignee.last_name?.[0] || ''
    return (first + last).toUpperCase() || '?'
  }, [task.assignee])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#111117] p-4 transition-all duration-200',
        hovered && 'border-white/[0.12] bg-[#14141b] shadow-lg shadow-black/20 -translate-y-px',
        task.status === 'done' && 'opacity-60',
        isDragOverlay && 'shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/20 scale-[1.03]'
      )}
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className="w-5 h-5 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-[#6B7280] hover:text-[#E5E7EB]"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-5" />
        </button>
      )}

      {/* Checkbox */}
      <motion.button
        onClick={() => onToggleDone(task)}
        className="mt-0.5 flex-shrink-0 transition-transform duration-150 hover:scale-110"
        whileTap={{ scale: 0.8 }}
        aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
      >
        <AnimatePresence mode="wait">
          {task.status === 'done' ? (
            <motion.div
              key="done"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <CheckCircle2 className="size-5 text-green-400" />
            </motion.div>
          ) : (
            <motion.div
              key="undone"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <Circle className="size-5 text-gray-500 transition-colors hover:text-[#6366F1]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h3
            className={cn(
              'text-sm font-medium leading-snug text-[#E5E7EB]',
              task.status === 'done' && 'line-through text-[#6B7280]'
            )}
          >
            {task.title}
          </h3>
          <Badge
            variant="outline"
            className={cn(
              'h-5 text-[10px] font-medium px-1.5 border-0 rounded-md',
              priority.bg,
              priority.color
            )}
          >
            {priority.label}
          </Badge>
          {/* Comment count badge */}
          {commentCount > 0 && (
            <span className="text-xs text-[var(--text-muted)] bg-white/[0.04] px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <MessageCircle className="size-3" />
              {commentCount}
            </span>
          )}
        </div>

        {task.description && (
          <p className="mt-1 text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            {status.icon}
            <span className="text-[11px] text-[#6B7280]">{status.label}</span>
          </div>

          {/* Due date */}
          {task.due_date && (
            <div className={cn('flex items-center gap-1.5', isOverdue && 'text-red-400')}>
              <CalendarIcon className="size-3" />
              <span className="text-[11px]">
                {dueDateLabel}
              </span>
              {isOverdue && (
                <AlertTriangle className="size-3 text-red-400" />
              )}
            </div>
          )}

          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Avatar className="size-5 border border-white/[0.08]">
                {task.assignee.avatar_url && <AvatarImage src={task.assignee.avatar_url} alt="" />}
                <AvatarFallback className="text-[9px] bg-[#6366F1]/20 text-[#6366F1]">
                  {assigneeInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] text-[#6B7280]">
                {task.assignee.first_name || task.assignee.email?.split('@')[0]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 flex-shrink-0"
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.06]"
              onClick={() => onEdit(task)}
              aria-label="Edit task"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-[#6B7280] hover:text-red-400 hover:bg-red-500/10"
              onClick={() => onDelete(task.id)}
              aria-label="Delete task"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Sortable Task Card (DnD wrapper) ───────────────────────────────
function SortableTaskCard({
  task,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  task: Task
  onToggleDone: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const { over, active } = useDndContext()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const isOver = over?.id === task.id && active?.id !== task.id

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn('relative', isDragging && 'opacity-40 z-0')}
    >
      {/* Drop indicator line */}
      {isOver && (
        <div className="absolute -top-[1px] left-4 right-4 h-0.5 bg-indigo-500 rounded-full z-10" />
      )}
      <TaskCard
        task={task}
        onToggleDone={onToggleDone}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={listeners}
      />
    </div>
  )
}

// ─── Task Modal (Add/Edit) ──────────────────────────────────────────
function TaskModal({
  open,
  onOpenChange,
  editingTask,
  familyMembers,
  onSave,
  familyId,
  userId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTask: Task | null
  familyMembers: FamilyMember[]
  onSave: (data: TaskFormData) => Promise<void>
  familyId: string
  userId: string
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    if (open) {
      if (editingTask) {
        setForm({
          title: editingTask.title,
          description: editingTask.description || '',
          priority: editingTask.priority,
          status: editingTask.status,
          assigned_to: editingTask.assigned_to || '',
          due_date: editingTask.due_date ? parseISO(editingTask.due_date) : undefined,
        })
      } else {
        setForm(EMPTY_FORM)
      }
    }
  }, [open, editingTask])

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Task title is required')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      onOpenChange(false)
    } catch {
      toast.error('Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] sm:max-w-[520px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[#E5E7EB]">
            {editingTask ? t.tasks.editTask : t.tasks.addTask}
          </DialogTitle>
          <DialogDescription className="text-[#6B7280]">
            {editingTask ? 'Update the task details below.' : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 overflow-y-auto flex-1 min-h-0">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[#E5E7EB] text-sm">{t.tasks.taskTitle}</Label>
            <Input
              placeholder="Enter task title..."
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] focus-visible:ring-[#6366F1]/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[#E5E7EB] text-sm">{t.tasks.description}</Label>
            <Textarea
              placeholder="Add a description (optional)..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] focus-visible:ring-[#6366F1]/50 min-h-[80px] resize-none"
            />
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#E5E7EB] text-sm">{t.tasks.priority}</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}
              >
                <SelectTrigger className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111117] border-white/[0.08]">
                  {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p} className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">
                      <span className="flex items-center gap-2">
                        <span className={cn('size-2 rounded-full', PRIORITY_CONFIG[p].bg.replace('/15', ''), {
                          'bg-red-500': p === 'urgent',
                          'bg-orange-500': p === 'high',
                          'bg-yellow-500': p === 'medium',
                          'bg-green-500': p === 'low',
                        })} />
                        {PRIORITY_CONFIG[p].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#E5E7EB] text-sm">{t.tasks.status}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}
              >
                <SelectTrigger className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111117] border-white/[0.08]">
                  {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">
                      <span className="flex items-center gap-2">
                        {STATUS_CONFIG[s].icon}
                        {STATUS_CONFIG[s].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assign To & Due Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#E5E7EB] text-sm">{t.tasks.assignTo}</Label>
              <Select
                value={form.assigned_to}
                onValueChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))}
              >
                <SelectTrigger className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="bg-[#111117] border-white/[0.08]">
                  <SelectItem value="__none__" className="text-[#6B7280] focus:bg-white/[0.06]">
                    <span className="flex items-center gap-2">
                      <User className="size-3.5" />
                      Unassigned
                    </span>
                  </SelectItem>
                  {familyMembers.map((member) => (
                    <SelectItem
                      key={member.user_id}
                      value={member.user_id}
                      className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]"
                    >
                      <span className="flex items-center gap-2">
                        <Avatar className="size-5 border border-white/[0.08]">
                          {member.profiles?.avatar_url && (
                            <AvatarImage src={member.profiles.avatar_url} alt="" />
                          )}
                          <AvatarFallback className="text-[8px] bg-[#6366F1]/20 text-[#6366F1]">
                            {(
                              (member.profiles?.first_name?.[0] || '') +
                              (member.profiles?.last_name?.[0] || '')
                            ).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {member.profiles?.first_name || member.nickname || member.profiles?.email?.split('@')[0]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#E5E7EB] text-sm">{t.tasks.dueDate}</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] hover:bg-[#0B0B0F] hover:border-white/[0.12]',
                      !form.due_date && 'text-[#6B7280]'
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {form.due_date ? format(form.due_date, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#111117] border-white/[0.08]" align="start">
                  <Calendar
                    mode="single"
                    selected={form.due_date}
                    onSelect={(date) => {
                      setForm((f) => ({ ...f, due_date: date }))
                      setCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Clear Due Date */}
          {form.due_date && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, due_date: undefined }))}
              className="text-[11px] text-[#6B7280] hover:text-[#E5E7EB] transition-colors flex items-center gap-1"
            >
              <X className="size-3" />
              Clear due date
            </button>
          )}
        </div>

        {/* Comments section - only for existing tasks */}
        {editingTask && <CommentsPanel taskId={editingTask.id} />}

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.06]"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white btn-glow btn-press"
          >
            {saving ? t.common.loading : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// EmptyState is now imported from shared component

// ─── Date Section Header ────────────────────────────────────────────
function DateSectionHeader({ group, count }: { group: DateGroup; count: number }) {
  const config = DATE_GROUP_LABELS[group]
  return (
    <div className="flex items-center gap-3 mt-6 mb-3 first:mt-0">
      <span className={cn('text-xs font-semibold uppercase tracking-wider', config.color)}>
        {config.label}
      </span>
      <span className="text-[10px] text-[#6B7280] bg-white/[0.04] rounded-full px-2 py-0.5">
        {count}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  )
}

// ─── Status Section Header ──────────────────────────────────────────
function StatusSectionHeader({ status, count }: { status: TaskStatus; count: number }) {
  const config = STATUS_CONFIG[status]
  return (
    <div className="flex items-center gap-3 mt-6 mb-3 first:mt-0">
      {config.icon}
      <span className="text-xs font-semibold uppercase tracking-wider text-[#E5E7EB]">
        {config.label}
      </span>
      <span className="text-[10px] text-[#6B7280] bg-white/[0.04] rounded-full px-2 py-0.5">
        {count}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  )
}

// ─── Main Tasks Page ────────────────────────────────────────────────
export default function TasksPage() {
  const { t } = useI18n()
  const supabase = createClient()
  const { currentFamily, familyMembers } = useAppStore()
  const { user } = useAuthStore()
  const {
    tasks,
    isLoading,
    searchQuery,
    filterStatus,
    filterPriority,
    sortBy,
    showAddTask,
    editingTask,
    setTasks,
    addTask,
    updateTask,
    removeTask,
    setIsLoading,
    setSearchQuery,
    setFilterStatus,
    setFilterPriority,
    setSortBy,
    setShowAddTask,
    setEditingTask,
    getFilteredTasks,
  } = useTaskStore()

  const [pageView, setPageView] = useState<'list' | 'board'>('list')
  const [viewMode, setViewMode] = useState<'status' | 'date'>('status')
  const [members, setMembers] = useState<FamilyMember[]>(familyMembers)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  const { canCreateTask, plan, getFeatureLimit } = useSubscriptionStore()
  const taskLimit = getFeatureLimit('tasks')

  const handleAddTask = useCallback(() => {
    if (!canCreateTask(tasks.length)) {
      setUpgradeModalOpen(true)
      return
    }
    setEditingTask(null)
    setShowAddTask(true)
  }, [canCreateTask, tasks.length, setEditingTask, setShowAddTask])

  // ─── DnD State & Handlers ────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeTask = tasks.find((t) => t.id === active.id)
    const overTask = tasks.find((t) => t.id === over.id)
    if (!activeTask || !overTask) return

    // Only reorder within the same group
    if (viewMode === 'status' && activeTask.status !== overTask.status) return
    if (viewMode === 'date' && getDateGroup(activeTask) !== getDateGroup(overTask)) return

    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    const reorderedTasks = arrayMove(tasks, oldIndex, newIndex)

    useTaskStore.getState().setTasks(reorderedTasks)
    useTaskStore.getState().setSortBy('manual')
  }, [tasks, viewMode])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    if (!currentFamily) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assigned_to_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
        .eq('family_id', currentFamily.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setTasks(data as Task[])
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      toast.error('Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }, [currentFamily, supabase, setTasks, setIsLoading])

  // Fetch family members
  const fetchMembers = useCallback(async () => {
    if (!currentFamily) return
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*, profiles(*)')
        .eq('family_id', currentFamily.id)

      if (error) throw error
      if (data) {
        setMembers(data as FamilyMember[])
        useAppStore.getState().setFamilyMembers(data as FamilyMember[])
      }
    } catch (err) {
      console.error('Failed to fetch family members:', err)
    }
  }, [currentFamily, supabase])

  useEffect(() => {
    fetchTasks()
    fetchMembers()
  }, [fetchTasks, fetchMembers])

  // Toggle task done
  const handleToggleDone = useCallback(
    async (task: Task) => {
      const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
      const completedAt = newStatus === 'done' ? new Date().toISOString() : null
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus, completed_at: completedAt })
          .eq('id', task.id)

        if (error) throw error
        updateTask({ ...task, status: newStatus, completed_at: completedAt })
        if (newStatus === 'done') {
          triggerConfetti()
          toast.success('🎉 Task completed!')
        } else {
          toast.success('Task reopened')
        }
      } catch {
        toast.error('Failed to update task')
      }
    },
    [supabase, updateTask]
  )

  // Save task (create or update)
  const handleSaveTask = useCallback(
    async (formData: TaskFormData) => {
      if (!currentFamily || !user) return

      const assignedTo = formData.assigned_to === '__none__' ? null : formData.assigned_to || null
      const dueDate = formData.due_date ? formData.due_date.toISOString() : null

      if (editingTask) {
        // Update existing task
        const { data, error } = await supabase
          .from('tasks')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            priority: formData.priority,
            status: formData.status,
            assigned_to: assignedTo,
            due_date: dueDate,
            completed_at: formData.status === 'done' ? new Date().toISOString() : null,
          })
          .eq('id', editingTask.id)
          .select('*, assignee:profiles!tasks_assigned_to_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
          .single()

        if (error) throw error
        if (data) {
          updateTask(data as Task)
          toast.success('Task updated!')
        }
      } else {
        // Create new task
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            family_id: currentFamily.id,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            priority: formData.priority,
            status: formData.status,
            assigned_to: assignedTo,
            due_date: dueDate,
            created_by: user.id,
          })
          .select('*, assignee:profiles!tasks_assigned_to_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
          .single()

        if (error) throw error
        if (data) {
          addTask(data as Task)
          toast.success('Task created!')
        }
      }
    },
    [currentFamily, user, editingTask, supabase, addTask, updateTask]
  )

  // Delete task
  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', taskId)
        if (error) throw error
        removeTask(taskId)
        toast.success('Task deleted')
      } catch {
        toast.error('Failed to delete task')
      }
    },
    [supabase, removeTask]
  )

  // Handle kanban status change (drag between columns)
  const handleKanbanStatusChange = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task || task.status === newStatus) return
      const completedAt = newStatus === 'done' ? new Date().toISOString() : null
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus, completed_at: completedAt })
          .eq('id', taskId)
        if (error) throw error
        updateTask({ ...task, status: newStatus, completed_at: completedAt })
        if (newStatus === 'done') {
          triggerConfetti()
          toast.success('🎉 Task completed!')
        } else {
          toast.success(t.tasks.moveToStatus.replace('{status}', STATUS_CONFIG[newStatus].label))
        }
      } catch {
        toast.error('Failed to update task')
      }
    },
    [supabase, tasks, updateTask, t]
  )

  // Handle add task from kanban column
  const handleKanbanAddTask = useCallback((status: TaskStatus) => {
    if (!canCreateTask(tasks.length)) {
      setUpgradeModalOpen(true)
      return
    }
    setEditingTask(null)
    // Set default status when adding from kanban column
    setShowAddTask(true)
  }, [canCreateTask, tasks.length, setEditingTask, setShowAddTask])

  // Filtered tasks
  const filteredTasks = useMemo(() => getFilteredTasks(), [tasks, searchQuery, filterStatus, filterPriority, sortBy, getFilteredTasks])

  // Grouped tasks by status
  const groupedByStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] }
    filteredTasks.forEach((task) => {
      groups[task.status].push(task)
    })
    return groups
  }, [filteredTasks])

  // Grouped tasks by date
  const groupedByDate = useMemo(() => {
    const groups: Record<DateGroup, Task[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      this_week: [],
      later: [],
      no_date: [],
    }
    filteredTasks.forEach((task) => {
      const group = getDateGroup(task)
      groups[group].push(task)
    })
    return groups
  }, [filteredTasks])

  // Task counts for filter badges
  const taskCounts = useMemo(() => {
    const counts = { all: tasks.length, todo: 0, in_progress: 0, done: 0, low: 0, medium: 0, high: 0, urgent: 0 }
    tasks.forEach((task) => {
      counts[task.status]++
      counts[task.priority]++
    })
    return counts
  }, [tasks])

  // Modal open state
  const modalOpen = showAddTask || !!editingTask

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#E5E7EB] tracking-tight">{t.tasks.title}</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} &middot; {taskCounts.done} completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            {plan === 'free' && taskLimit !== null && (
              <UpgradePrompt
                feature="tasks"
                currentCount={tasks.length}
                limit={taskLimit}
              />
            )}
            <Button
              onClick={handleAddTask}
              className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white gap-2 rounded-xl btn-glow btn-press"
            >
              <Plus className="size-4" />
              {t.tasks.addTask}
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#6B7280]" />
          <Input
            placeholder={t.tasks.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#111117] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] focus-visible:ring-[#6366F1]/50 h-10 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E5E7EB] transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-[#111117] border border-white/[0.06] rounded-lg p-0.5">
            {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => {
              const isActive = filterStatus === status
              const label = status === 'all' ? 'All' : STATUS_CONFIG[status as TaskStatus].label
              const count = status === 'all' ? taskCounts.all : taskCounts[status as TaskStatus]
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]'
                  )}
                >
                  {label}
                  <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Priority filter */}
          <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as TaskPriority | 'all')}>
            <SelectTrigger className="h-8 text-xs bg-[#111117] border-white/[0.06] text-[#E5E7EB] w-[130px] rounded-lg">
              <Filter className="size-3 mr-1 text-[#6B7280]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111117] border-white/[0.08]">
              <SelectItem value="all" className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">All Priorities</SelectItem>
              {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                <SelectItem key={p} value={p} className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">
                  <span className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', {
                      'bg-red-500': p === 'urgent',
                      'bg-orange-500': p === 'high',
                      'bg-yellow-500': p === 'medium',
                      'bg-green-500': p === 'low',
                    })} />
                    {PRIORITY_CONFIG[p].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 text-xs bg-[#111117] border-white/[0.06] text-[#E5E7EB] w-[150px] rounded-lg">
              <ArrowUpDown className="size-3 mr-1 text-[#6B7280]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111117] border-white/[0.08]">
              <SelectItem value="created_at" className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">Created Date</SelectItem>
              <SelectItem value="due_date" className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">Due Date</SelectItem>
              <SelectItem value="priority" className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">Priority</SelectItem>
              <SelectItem value="status" className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">Status</SelectItem>
              <SelectItem value="manual" className="text-[#E5E7EB] focus:bg-white/[0.06] focus:text-[#E5E7EB]">Manual Order</SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle: List / Board */}
          <div className="flex items-center gap-1 bg-[#111117] border border-white/[0.06] rounded-lg p-0.5 ml-auto">
            <button
              onClick={() => setPageView('list')}
              title={t.tasks.listView}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5',
                pageView === 'list'
                  ? 'bg-[#6366F1]/20 text-[#6366F1]'
                  : 'text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]'
              )}
            >
              <LayoutList className="size-3.5" />
              <span className="hidden sm:inline">{t.tasks.listView}</span>
            </button>
            <button
              onClick={() => setPageView('board')}
              title={t.tasks.boardView}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5',
                pageView === 'board'
                  ? 'bg-[#6366F1]/20 text-[#6366F1]'
                  : 'text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]'
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">{t.tasks.boardView}</span>
            </button>
          </div>
        </div>

        {/* Sub-toggle: By Status / By Date (only in list view) */}
        {pageView === 'list' && (
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={() => setViewMode('status')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all duration-150',
                viewMode === 'status'
                  ? 'bg-white/[0.08] text-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]'
              )}
            >
              By Status
            </button>
            <button
              onClick={() => setViewMode('date')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all duration-150',
                viewMode === 'date'
                  ? 'bg-white/[0.08] text-[#E5E7EB]'
                  : 'text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.04]'
              )}
            >
              By Date
            </button>
          </div>
        )}
      </div>

      {/* ─── Task Content: List or Board ─────────────────────── */}
      {pageView === 'board' ? (
        /* ─── Board View ────────────────────────────────────── */
        <div className="flex-1 min-h-0 px-4 sm:px-6 pb-6">
          {isLoading ? (
            <div className="space-y-2">
              <TaskCardSkeleton count={5} />
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No tasks yet"
              description="Create your first task to get started"
              action={{ label: 'Add Task', onClick: handleAddTask }}
            />
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              onStatusChange={handleKanbanStatusChange}
              onAddTask={handleKanbanAddTask}
            />
          )}
        </div>
      ) : (
        /* ─── List View ─────────────────────────────────────── */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
        <div className="flex-1 min-h-0 px-4 sm:px-6 pb-6">
          {isLoading ? (
            <div className="space-y-2">
              <TaskCardSkeleton count={5} />
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No tasks yet"
              description="Create your first task to get started"
              action={{ label: 'Add Task', onClick: handleAddTask }}
            />
          ) : (
            <ScrollArea className="h-full">
              <AnimatePresence mode="popLayout">
                {viewMode === 'status' ? (
                  // Group by status
                  (['todo', 'in_progress', 'done'] as TaskStatus[]).map((status) => {
                    const group = groupedByStatus[status]
                    if (group.length === 0) return null
                    return (
                      <div key={status}>
                        <StatusSectionHeader status={status} count={group.length} />
                        <SortableContext items={group.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {group.map((task) => (
                              <SortableTaskCard
                                key={task.id}
                                task={task}
                                onToggleDone={handleToggleDone}
                                onEdit={(task) => setEditingTask(task)}
                                onDelete={handleDeleteTask}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </div>
                    )
                  })
                ) : (
                  // Group by date
                  DATE_GROUP_ORDER.map((group) => {
                    const tasksInGroup = groupedByDate[group]
                    if (tasksInGroup.length === 0) return null
                    return (
                      <div key={group}>
                        <DateSectionHeader group={group} count={tasksInGroup.length} />
                        <SortableContext items={tasksInGroup.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {tasksInGroup.map((task) => (
                              <SortableTaskCard
                                key={task.id}
                                task={task}
                                onToggleDone={handleToggleDone}
                                onEdit={(task) => setEditingTask(task)}
                                onDelete={handleDeleteTask}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </div>
                    )
                  })
                )}
              </AnimatePresence>
            </ScrollArea>
          )}
        </div>

        {/* ─── Drag Overlay ───────────────────────────────────── */}
        <DragOverlay>
          {activeId ? (
            <TaskCard
              task={filteredTasks.find((t) => t.id === activeId)!}
              onToggleDone={handleToggleDone}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
        </DndContext>
      )}

      {/* ─── Upgrade Modal ─────────────────────────────────────── */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature="tasks"
        currentCount={tasks.length}
        limit={taskLimit ?? 10}
      />

      {/* ─── Add/Edit Task Modal ────────────────────────────────── */}
      <TaskModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddTask(false)
            setEditingTask(null)
          }
        }}
        editingTask={editingTask}
        familyMembers={members}
        onSave={handleSaveTask}
        familyId={currentFamily?.id || ''}
        userId={user?.id || ''}
      />
    </div>
  )
}
