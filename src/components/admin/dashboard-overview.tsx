'use client'

import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users,
  UserCheck,
  Smartphone,
  AlertTriangle,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Circle,
} from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts'

interface StatsData {
  totalUsers: number
  activeUsers: number
  totalDevices: number
  alertsToday: number
  monthlyRevenue: number
  systemUptime: number
  trends: {
    totalUsers: { value: number; direction: 'up' | 'down' }
    activeUsers: { value: number; direction: 'up' | 'down' }
    totalDevices: { value: number; direction: 'up' | 'down' }
    alertsToday: { value: number; direction: 'up' | 'down' }
    monthlyRevenue: { value: number; direction: 'up' | 'down' }
    systemUptime: { value: number; direction: 'up' | 'down' }
  }
  chartData: { date: string; count: number }[]
  recentActivity: {
    id: string
    user: string
    action: string
    category: string
    severity: string
    device: string | null
    time: string
  }[]
  services: { service: string; status: string }[]
}

const chartConfig = {
  count: {
    label: 'Activity',
    color: '#10b981',
  },
} satisfies ChartConfig

const metricCards = [
  {
    key: 'totalUsers' as const,
    title: 'Total Users',
    icon: Users,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'activeUsers' as const,
    title: 'Active Users',
    icon: UserCheck,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'totalDevices' as const,
    title: 'Total Devices',
    icon: Smartphone,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'alertsToday' as const,
    title: 'Alerts Today',
    icon: AlertTriangle,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'monthlyRevenue' as const,
    title: 'Monthly Revenue',
    icon: DollarSign,
    format: (v: number) => `$${v.toLocaleString()}`,
  },
  {
    key: 'systemUptime' as const,
    title: 'System Uptime',
    icon: Activity,
    format: (v: number) => `${v}%`,
  },
]

function getStatusColor(status: string) {
  switch (status) {
    case 'operational':
      return 'bg-emerald-500'
    case 'degraded':
      return 'bg-yellow-500'
    case 'down':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return 'destructive'
    case 'error':
      return 'destructive'
    case 'warning':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function DashboardOverview() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          <CardDescription>{error || 'No data available'}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((card) => {
          const trend = data.trends[card.key]
          const isUp = trend?.direction === 'up'
          const Icon = card.icon
          return (
            <Card key={card.key} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardDescription>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <Icon className="size-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {card.format(data[card.key])}
                </div>
                {trend && (
                  <div className="flex items-center gap-1 mt-1">
                    {isUp ? (
                      <TrendingUp className="size-3.5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="size-3.5 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        isUp ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {trend.value}%
                    </span>
                    <span className="text-xs text-gray-500">vs last month</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Activity (Last 7 Days)</CardTitle>
            <CardDescription>Daily activity count across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={data.chartData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const d = new Date(value)
                    return d.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="count"
                  type="monotone"
                  fill="var(--color-count)"
                  fillOpacity={0.2}
                  stroke="var(--color-count)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Activity</CardTitle>
            <CardDescription>Latest 10 events on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-72">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="mt-0.5">
                        <Badge variant={getSeverityColor(activity.severity) as "destructive" | "secondary" | "outline"}>
                          {activity.severity}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.user}
                          {activity.device && ` · ${activity.device}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                        <Clock className="size-3" />
                        {new Date(activity.time).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Service Health</CardTitle>
          <CardDescription>Current status of platform services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {data.services.length === 0 ? (
              <p className="text-sm text-gray-500">No service data available</p>
            ) : (
              data.services.map((service) => (
                <div
                  key={service.service}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50"
                >
                  <Circle
                    className={`size-2.5 fill-current ${getStatusColor(service.status)}`}
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {service.service}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {service.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
