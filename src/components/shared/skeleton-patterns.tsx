'use client'

import { Skeleton } from '@/components/ui/skeleton'

// ─── Shimmer enhanced skeleton wrapper ──────────────────────────────
// Adds a gradient shimmer animation on top of animate-pulse

function ShimmerWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`skeleton-shimmer animate-pulse ${className}`}>
      {children}
    </div>
  )
}

// ─── Task Card Skeleton ─────────────────────────────────────────────
export function TaskCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerWrapper key={i}>
          <div className="flex items-start gap-3 rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4">
            <Skeleton className="w-5 h-5 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-5 w-14 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          </div>
        </ShimmerWrapper>
      ))}
    </div>
  )
}

// ─── Grocery Item Skeleton ──────────────────────────────────────────
export function GroceryItemSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerWrapper key={i}>
          <div className="flex items-center gap-3 rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4">
            <Skeleton className="w-5 h-5 rounded-md shrink-0" />
            <Skeleton className="w-4 h-4 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-8 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        </ShimmerWrapper>
      ))}
    </div>
  )
}

// ─── Event Card Skeleton ────────────────────────────────────────────
export function EventCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerWrapper key={i}>
          <div className="flex items-center gap-3 rounded-lg border border-[--border-subtle] bg-[--border-subtle] p-3">
            <Skeleton className="w-3 h-3 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        </ShimmerWrapper>
      ))}
    </div>
  )
}

// ─── Message Skeleton (alternating left/right bubbles) ──────────────
export function MessageSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => {
        const isRight = i % 2 === 1
        return (
          <ShimmerWrapper key={i}>
            <div className={`flex gap-2.5 ${isRight ? 'flex-row-reverse' : ''}`}>
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className={`max-w-[65%] space-y-1.5 ${isRight ? 'items-end' : 'items-start'}`}>
                {!isRight && <Skeleton className="h-3 w-16" />}
                <div className={`space-y-1 ${isRight ? 'flex flex-col items-end' : ''}`}>
                  <Skeleton className={`h-4 rounded-2xl ${isRight ? 'w-4/5 ml-auto' : 'w-3/4'}`} />
                  <Skeleton className={`h-4 rounded-2xl ${isRight ? 'w-3/5 ml-auto' : 'w-1/2'}`} />
                </div>
                <Skeleton className={`h-3 w-12 ${isRight ? 'ml-auto' : ''}`} />
              </div>
            </div>
          </ShimmerWrapper>
        )
      })}
    </div>
  )
}

// ─── File Card Skeleton ─────────────────────────────────────────────
export function FileCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerWrapper key={i}>
          <div className="rounded-xl border border-[--border-subtle] bg-[--bg-surface] overflow-hidden">
            <Skeleton className="w-full aspect-square" />
            <div className="p-3 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </ShimmerWrapper>
      ))}
    </div>
  )
}

// ─── Stat Card Skeleton ─────────────────────────────────────────────
export function StatCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 ${count > 2 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerWrapper key={i}>
          <div className="glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </ShimmerWrapper>
      ))}
    </div>
  )
}

// ─── Chart Skeleton ─────────────────────────────────────────────────
export function ChartSkeleton() {
  return (
    <ShimmerWrapper>
      <div className="glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="h-[200px] flex items-end gap-2 px-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <Skeleton
                className="w-full rounded-t-md"
                style={{ height: `${30 + Math.random() * 70}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-6" />
          ))}
        </div>
      </div>
    </ShimmerWrapper>
  )
}

// ─── Prayer Times Skeleton ──────────────────────────────────────────
export function PrayerTimesSkeleton() {
  return (
    <ShimmerWrapper>
      <div className="glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-[--border-subtle] p-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-12" />
                {i === 0 && <Skeleton className="h-4 w-10 rounded-full" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ShimmerWrapper>
  )
}

// ─── Productivity Score Skeleton ─────────────────────────────────────
export function ProductivityScoreSkeleton() {
  return (
    <ShimmerWrapper>
      <div className="glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-6 flex flex-col items-center">
        <Skeleton className="h-[140px] w-[140px] rounded-full" />
        <Skeleton className="mt-4 h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>
    </ShimmerWrapper>
  )
}

// ─── Quick Actions Skeleton ─────────────────────────────────────────
export function QuickActionsSkeleton() {
  return (
    <ShimmerWrapper>
      <div className="glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-6">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </ShimmerWrapper>
  )
}

// ─── Dashboard Welcome Skeleton ─────────────────────────────────────
export function DashboardWelcomeSkeleton() {
  return (
    <ShimmerWrapper>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between px-2 py-3">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </ShimmerWrapper>
  )
}

// ─── Full Page Skeleton (Enhanced) ──────────────────────────────────
export function PageSkeleton({ type = 'tasks' }: { type?: 'tasks' | 'grocery' | 'chat' | 'files' | 'calendar' | 'dashboard' }) {
  return (
    <div className="space-y-4">
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
      {type === 'dashboard' && (
        <>
          <DashboardWelcomeSkeleton />
          <StatCardSkeleton count={4} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ChartSkeleton />
            <PrayerTimesSkeleton />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ProductivityScoreSkeleton />
            <QuickActionsSkeleton />
          </div>
          <TaskCardSkeleton count={5} />
        </>
      )}
      {type === 'tasks' && <TaskCardSkeleton count={5} />}
      {type === 'grocery' && <GroceryItemSkeleton count={4} />}
      {type === 'chat' && <MessageSkeleton count={4} />}
      {type === 'files' && <FileCardSkeleton count={6} />}
      {type === 'calendar' && <EventCardSkeleton count={3} />}
    </div>
  )
}

// ─── Content Skeleton for Full-Page Loading ─────────────────────────
export function ContentSkeleton({ type = 'dashboard' }: { type?: 'dashboard' | 'tasks' | 'calendar' | 'grocery' | 'chat' | 'files' }) {
  return (
    <div className="min-h-screen bg-[--bg-primary] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header bar skeleton */}
        <ShimmerWrapper>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </ShimmerWrapper>

        {/* Content blocks */}
        {type === 'dashboard' && (
          <>
            {/* Stats row */}
            <StatCardSkeleton count={4} />
            {/* Chart + Prayer row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <ChartSkeleton />
              <PrayerTimesSkeleton />
            </div>
            {/* Bottom row */}
            <div className="grid gap-4 lg:grid-cols-3">
              <ProductivityScoreSkeleton />
              <QuickActionsSkeleton />
            </div>
            <TaskCardSkeleton count={3} />
          </>
        )}

        {type === 'tasks' && (
          <>
            {/* Filter tabs */}
            <ShimmerWrapper>
              <div className="flex items-center gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-lg" />
                ))}
              </div>
            </ShimmerWrapper>
            <TaskCardSkeleton count={5} />
          </>
        )}

        {type === 'calendar' && (
          <>
            <ShimmerWrapper>
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </ShimmerWrapper>
            <EventCardSkeleton count={5} />
          </>
        )}

        {type === 'grocery' && (
          <>
            {/* Progress bar skeleton */}
            <ShimmerWrapper>
              <div className="glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            </ShimmerWrapper>
            <GroceryItemSkeleton count={5} />
          </>
        )}

        {type === 'chat' && <MessageSkeleton count={6} />}

        {type === 'files' && (
          <>
            <ShimmerWrapper>
              <div className="glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            </ShimmerWrapper>
            <FileCardSkeleton count={6} />
          </>
        )}
      </div>
    </div>
  )
}
