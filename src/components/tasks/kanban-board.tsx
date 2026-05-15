'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useI18n } from '@/i18n/use-translation'
import type { Task, TaskPriority, TaskStatus } from '@/types'
import { isPast, isToday, parseISO, format, isTomorrow, formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, CalendarIcon, GripVertical, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core'
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Priority Config ────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bg: string; dot: string; label: string }> = {
  urgent: { color: 'text-red-400', bg: 'bg-red-500/15', dot: 'bg-red-500', label: 'Urgent' },
  high: { color: 'text-[#0D9488]', bg: 'bg-[#0D9488]/15', dot: 'bg-[#0D9488]', label: 'High' },
  medium: { color: 'text-[#10B981]', bg: 'bg-[#10B981]/15', dot: 'bg-[#10B981]', label: 'Medium' },
  low: { color: 'text-green-400', bg: 'bg-green-500/15', dot: 'bg-green-500', label: 'Low' },
}

// ─── Column Config ──────────────────────────────────────────────────
type KanbanColumnId = 'todo' | 'in_progress' | 'done' | 'backlog'

interface KanbanColumnConfig {
  id: KanbanColumnId
  titleKey: 'toDo' | 'inProgress' | 'done' | 'backlog'
  dotColor: string
  borderColor: string
  status: TaskStatus | 'backlog'
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: 'todo', titleKey: 'toDo', dotColor: 'bg-emerald-400', borderColor: 'border-l-emerald-400', status: 'todo' },
  { id: 'in_progress', titleKey: 'inProgress', dotColor: 'bg-[#0D9488]', borderColor: 'border-l-[#0D9488]', status: 'in_progress' },
  { id: 'done', titleKey: 'done', dotColor: 'bg-green-400', borderColor: 'border-l-green-400', status: 'done' },
  { id: 'backlog', titleKey: 'backlog', dotColor: 'bg-gray-500', borderColor: 'border-l-gray-500', status: 'backlog' },
]

// ─── Kanban Task Card (Compact) ─────────────────────────────────────
function KanbanTaskCard({
  task,
  isDragOverlay,
}: {
  task: Task
  isDragOverlay?: boolean
}) {
  const priority = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))

  const dueDateLabel = useMemo(() => {
    if (!task.due_date) return null
    const date = parseISO(task.due_date)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isPast(date) && !isToday(date)) return formatDistanceToNow(date, { addSuffix: true })
    return format(date, 'MMM d')
  }, [task.due_date])

  const assigneeInitials = useMemo(() => {
    if (!task.assignee) return null
    const first = task.assignee.first_name?.[0] || ''
    const last = task.assignee.last_name?.[0] || ''
    return (first + last).toUpperCase() || '?'
  }, [task.assignee])

  return (
    <div
      className={cn(
        'bg-[--border-subtle] rounded-lg p-3 hover:bg-[--border-subtle] transition-colors cursor-grab active:cursor-grabbing border border-[--border-subtle]',
        isDragOverlay && 'shadow-2xl shadow-[#0D9488]/10 ring-1 ring-[#0D9488]/20 rotate-2',
        task.status === 'done' && 'opacity-60'
      )}
    >
      {/* Title + Priority */}
      <div className="flex items-start gap-2">
        <h4 className={cn(
          'text-sm font-medium text-[--text-primary] flex-1 min-w-0 leading-snug',
          task.status === 'done' && 'line-through text-[--text-muted]'
        )}>
          {task.title}
        </h4>
      </div>

      {/* Priority badge */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', priority.dot)} />
        <span className={cn('text-[11px] font-medium', priority.color)}>
          {priority.label}
        </span>
      </div>

      {/* Footer: Due date + Assignee */}
      <div className="mt-2 flex items-center gap-2 justify-between">
        {/* Due date */}
        {task.due_date ? (
          <div className={cn('flex items-center gap-1', isOverdue ? 'text-red-400' : 'text-[--text-muted]')}>
            <CalendarIcon className="size-3 flex-shrink-0" />
            <span className="text-xs">{dueDateLabel}</span>
          </div>
        ) : (
          <span />
        )}

        {/* Assignee avatar */}
        {task.assignee && assigneeInitials && (
          <Avatar className="h-5 w-5 border border-[--border-subtle] flex-shrink-0">
            {task.assignee.avatar_url && <AvatarImage src={task.assignee.avatar_url} alt="" />}
            <AvatarFallback className="text-[8px] bg-[#0D9488]/20 text-[#0D9488]">
              {assigneeInitials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

// ─── Sortable Kanban Card ───────────────────────────────────────────
function SortableKanbanCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(isDragging && 'opacity-40')}
    >
      <KanbanTaskCard task={task} />
    </div>
  )
}

// ─── Kanban Column ──────────────────────────────────────────────────
function KanbanColumn({
  column,
  tasks,
  onAddTask,
}: {
  column: KanbanColumnConfig
  tasks: Task[]
  onAddTask: (status: TaskStatus) => void
}) {
  const { t, isRTL } = useI18n()
  const title = t.tasks[column.titleKey]

  return (
    <div className={cn(
      'bg-[--border-subtle] rounded-xl p-3 min-w-[280px] flex flex-col border-l-2',
      column.borderColor
    )}>
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[--border-subtle]">
        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', column.dotColor)} />
        <h3 className="text-sm font-semibold text-[--text-primary] font-display">{title}</h3>
        <span className="ml-auto text-[10px] font-medium text-[--text-muted] bg-[--border-subtle] rounded-full px-2 py-0.5 font-metric">
          {tasks.length}
        </span>
      </div>

      {/* Scrollable card list */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-1 min-h-[80px]">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <SortableKanbanCard task={task} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Drop placeholder when empty */}
          {tasks.length === 0 && (
            <div className="border-2 border-dashed border-[--border-subtle] rounded-lg p-4 text-center">
              <p className="text-xs text-[--text-muted]">No tasks</p>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add Task button */}
      <button
        onClick={() => onAddTask(column.status as TaskStatus)}
        className="w-full border-dashed border border-[--border-subtle] text-[--text-muted] hover:bg-[--border-subtle] hover:text-[--text-primary] rounded-lg py-2 text-sm mt-2 transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus className="size-3.5" />
        {t.tasks.addTaskToColumn}
      </button>
    </div>
  )
}

// ─── Main Kanban Board ──────────────────────────────────────────────
interface KanbanBoardProps {
  tasks: Task[]
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onAddTask: (status: TaskStatus) => void
}

export function KanbanBoard({ tasks, onStatusChange, onAddTask }: KanbanBoardProps) {
  const { t, isRTL } = useI18n()
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

  // Group tasks into columns
  const columnTasks = useMemo(() => {
    const groups: Record<KanbanColumnId, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
      backlog: [],
    }

    tasks.forEach((task) => {
      // Low priority items that are 'todo' go to backlog column
      if (task.priority === 'low' && task.status === 'todo') {
        groups.backlog.push(task)
      } else {
        const columnId = task.status as KanbanColumnId
        if (columnId in groups) {
          groups[columnId].push(task)
        } else {
          groups.todo.push(task)
        }
      }
    })

    return groups
  }, [tasks])

  // Find which column a task belongs to
  const findColumnForTask = useCallback((taskId: string): KanbanColumnId | null => {
    for (const [columnId, columnTasksList] of Object.entries(columnTasks)) {
      if (columnTasksList.find((t) => t.id === taskId)) {
        return columnId as KanbanColumnId
      }
    }
    return null
  }, [columnTasks])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // This could be used for real-time visual updates during drag
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeTaskId = active.id as string
    const overId = over.id as string

    // Find source column
    const sourceColumn = findColumnForTask(activeTaskId)
    if (!sourceColumn) return

    // Check if dropping on another task or the same position
    const overTask = tasks.find((t) => t.id === overId)
    let targetColumn: KanbanColumnId | null = null

    if (overTask) {
      // Dropping on a task - determine its column
      targetColumn = findColumnForTask(overId)
    }

    if (!targetColumn) return

    // If the task moved to a different column, update status
    if (sourceColumn !== targetColumn) {
      const columnConfig = KANBAN_COLUMNS.find((c) => c.id === targetColumn)
      if (columnConfig && columnConfig.status !== 'backlog') {
        onStatusChange(activeTaskId, columnConfig.status as TaskStatus)
      } else if (columnConfig?.status === 'backlog') {
        // Moving to backlog means todo + low priority
        onStatusChange(activeTaskId, 'todo')
      }
    }
  }, [tasks, findColumnForTask, onStatusChange])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={cn(
        'flex gap-4 h-full overflow-x-auto pb-4 custom-scrollbar',
        'flex-col md:flex-row md:flex-wrap lg:flex-nowrap'
      )}>
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={columnTasks[column.id]}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <KanbanTaskCard task={activeTask} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
