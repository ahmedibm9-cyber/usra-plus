'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Task, CalendarEvent, GroceryItem, ChatMessage, FamilyFile, Notification } from '@/types'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useChatStore } from '@/stores/chat-store'
import { useFilesStore } from '@/stores/files-store'
import { useNotificationStore } from '@/stores/notification-store'
import { useMilestoneStore } from '@/stores/milestone-store'
import { useChoreStore } from '@/stores/chore-store'
import { useBudgetStore } from '@/stores/budget-store'
import { useMealStore } from '@/stores/meal-store'
import { useActivityStore } from '@/stores/activity-store'
import { isDemoMode } from '@/lib/supabase/client'

/**
 * Fetches all family-scoped data from Supabase and populates Zustand stores.
 * Called once when a user logs in and has a selected family.
 *
 * - Stores with built-in fetchFromSupabase (milestone, chore, budget, meal)
 *   use their own methods which handle snake_case→camelCase mapping.
 * - Stores without Supabase methods (task, grocery, chat, calendar, files, notification)
 *   are populated directly here since their types match the DB schema.
 * - All queries run in parallel for maximum performance.
 * - If any query fails, the others still succeed — graceful degradation.
 */
export async function fetchFamilyData(
  supabase: SupabaseClient,
  familyId: string,
  userId: string
): Promise<void> {
  if (isDemoMode()) return // Skip in demo mode — no real data to fetch

  // Parallel queries for stores WITHOUT their own fetchFromSupabase
  const [
    tasksResult,
    eventsResult,
    groceriesResult,
    messagesResult,
    filesResult,
    notificationsResult,
  ] = await Promise.allSettled([
    supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assigned_to_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false }),

    supabase
      .from('calendar_events')
      .select('*, creator:profiles!calendar_events_created_by_fkey(*)')
      .eq('family_id', familyId)
      .order('start_time', { ascending: true }),

    supabase
      .from('grocery_items')
      .select('*, adder:profiles!grocery_items_added_by_fkey(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false }),

    supabase
      .from('chat_messages')
      .select('*, sender:profiles!chat_messages_sender_id_fkey(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })
      .limit(200),

    supabase
      .from('family_files')
      .select('*, uploader:profiles!family_files_uploaded_by_fkey(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false }),

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Populate direct-access stores
  if (tasksResult.status === 'fulfilled' && tasksResult.value.data) {
    useTaskStore.getState().setTasks(tasksResult.value.data as Task[])
  }
  if (eventsResult.status === 'fulfilled' && eventsResult.value.data) {
    useCalendarStore.getState().setEvents(eventsResult.value.data as CalendarEvent[])
  }
  if (groceriesResult.status === 'fulfilled' && groceriesResult.value.data) {
    useGroceryStore.getState().setItems(groceriesResult.value.data as GroceryItem[])
  }
  if (messagesResult.status === 'fulfilled' && messagesResult.value.data) {
    useChatStore.getState().setMessages(messagesResult.value.data as ChatMessage[])
  }
  if (filesResult.status === 'fulfilled' && filesResult.value.data) {
    useFilesStore.getState().setFiles(filesResult.value.data as FamilyFile[])
  }
  if (notificationsResult.status === 'fulfilled' && notificationsResult.value.data) {
    useNotificationStore.getState().setNotifications(notificationsResult.value.data as Notification[])
  }

  // Stores with their own fetchFromSupabase (handle snake_case→camelCase mapping internally)
  await Promise.allSettled([
    useMilestoneStore.getState().fetchFromSupabase(familyId, userId),
    useChoreStore.getState().fetchFromSupabase(familyId, userId),
    useBudgetStore.getState().fetchFromSupabase(familyId, userId),
    useMealStore.getState().fetchFromSupabase(familyId, userId),
  ])

  // Build activity timeline from completed tasks
  if (tasksResult.status === 'fulfilled' && tasksResult.value.data) {
    const tasks = tasksResult.value.data as Task[]
    const activityItems = tasks
      .filter(t => t.status === 'done' && t.completed_at)
      .slice(0, 20)
      .map(t => ({
        id: `act-${t.id}`,
        type: 'task_completed' as const,
        actor: { id: t.assigned_to || t.created_by, name: t.assignee?.first_name || t.creator?.first_name || 'User', avatar_url: t.assignee?.avatar_url || t.creator?.avatar_url || null },
        description: `Completed "${t.title}"`,
        created_at: t.completed_at!,
      }))
    useActivityStore.getState().setActivities(activityItems)
  }
}

/**
 * Sets up Supabase Realtime subscriptions for live data updates.
 * Returns cleanup function to unsubscribe all channels.
 */
export function subscribeToRealtimeUpdates(
  supabase: SupabaseClient,
  familyId: string,
  userId: string
): () => void {
  if (isDemoMode()) return () => {} // No subscriptions in demo mode

  const channels: ReturnType<typeof supabase.channel>[] = []

  // NOTE: Chat channel is NOT created here — the chat page manages its own
  // subscription via `chat-${familyId}`. Creating it here would cause the
  // "cannot add postgres_changes callbacks after subscribe()" error because
  // Supabase returns the same channel object for duplicate names.

  // ─── Notifications: real-time new notifications ───────────────
  const notifChannel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        useNotificationStore.getState().addNotification(payload.new as Notification)
      }
    )
    .subscribe()
  channels.push(notifChannel)

  // ─── Tasks: real-time status changes ──────────────────────────
  const taskChannel = supabase
    .channel(`tasks-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const task = payload.new as Task
          if (task.created_by !== userId) useTaskStore.getState().addTask(task)
        } else if (payload.eventType === 'UPDATE') {
          useTaskStore.getState().updateTask(payload.new as Task)
        } else if (payload.eventType === 'DELETE') {
          useTaskStore.getState().removeTask((payload.old as { id: string }).id)
        }
      }
    )
    .subscribe()
  channels.push(taskChannel)

  // ─── Grocery: real-time item changes ──────────────────────────
  const groceryChannel = supabase
    .channel(`grocery-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'grocery_items',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = payload.new as GroceryItem
          if (item.added_by !== userId) useGroceryStore.getState().addItem(item)
        } else if (payload.eventType === 'UPDATE') {
          useGroceryStore.getState().updateItem(payload.new as GroceryItem)
        } else if (payload.eventType === 'DELETE') {
          useGroceryStore.getState().removeItem((payload.old as { id: string }).id)
        }
      }
    )
    .subscribe()
  channels.push(groceryChannel)

  // ─── Calendar: real-time event changes ────────────────────────
  const calendarChannel = supabase
    .channel(`calendar-${familyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'calendar_events',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          useCalendarStore.getState().addEvent(payload.new as CalendarEvent)
        } else if (payload.eventType === 'UPDATE') {
          useCalendarStore.getState().updateEvent(payload.new as CalendarEvent)
        } else if (payload.eventType === 'DELETE') {
          useCalendarStore.getState().removeEvent((payload.old as { id: string }).id)
        }
      }
    )
    .subscribe()
  channels.push(calendarChannel)

  // Return cleanup function
  return () => {
    channels.forEach(channel => {
      supabase.removeChannel(channel)
    })
  }
}

/**
 * Clears all Zustand stores — called on logout or family switch.
 */
export function clearAllStores(): void {
  useTaskStore.getState().setTasks([])
  useCalendarStore.getState().setEvents([])
  useGroceryStore.getState().setItems([])
  useChatStore.getState().setMessages([])
  useFilesStore.getState().setFiles([])
  useNotificationStore.getState().setNotifications([])
  useMilestoneStore.getState().setMilestones([])
  useChoreStore.getState().setChores([])
  useBudgetStore.getState().setExpenses([])
  useMealStore.getState().setMeals([])
  useActivityStore.getState().setActivities([])
  useActivityStore.getState().setTimelineItems([])
}
