'use client'

import { Skeleton } from '@/components/ui/skeleton'

// Task Card Skeleton
export function TaskCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#111117] p-4 skeleton-shimmer">
          <Skeleton className="w-5 h-5 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Grocery Item Skeleton
export function GroceryItemSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#111117] p-4 skeleton-shimmer">
          <Skeleton className="w-5 h-5 rounded-md shrink-0" />
          <Skeleton className="w-4 h-4 rounded shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-8 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      ))}
    </div>
  )
}

// Event Card Skeleton
export function EventCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 skeleton-shimmer">
          <Skeleton className="w-3 h-3 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Message Skeleton
export function MessageSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex gap-2.5 ${i % 2 === 0 ? '' : 'flex-row-reverse'} skeleton-shimmer`}>
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="max-w-[65%] space-y-1">
            <Skeleton className="h-4 w-3/4 rounded-2xl" />
            <Skeleton className="h-4 w-1/2 rounded-2xl" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// File Card Skeleton
export function FileCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/[0.06] bg-[#111117] overflow-hidden skeleton-shimmer">
          <Skeleton className="w-full aspect-square" />
          <div className="p-3 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Stat Card Skeleton
export function StatCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 ${count > 2 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl border border-white/[0.08] bg-[#111117] p-5 skeleton-shimmer">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Full Page Skeleton
export function PageSkeleton({ type = 'tasks' }: { type?: 'tasks' | 'grocery' | 'chat' | 'files' | 'calendar' | 'dashboard' }) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      {/* Filter/search bar */}
      <Skeleton className="h-10 w-full rounded-xl" />
      {/* Content */}
      {type === 'dashboard' && <StatCardSkeleton count={4} />}
      {type === 'tasks' && <TaskCardSkeleton count={5} />}
      {type === 'grocery' && <GroceryItemSkeleton count={4} />}
      {type === 'chat' && <MessageSkeleton count={4} />}
      {type === 'files' && <FileCardSkeleton count={6} />}
      {type === 'calendar' && <EventCardSkeleton count={3} />}
    </div>
  )
}
