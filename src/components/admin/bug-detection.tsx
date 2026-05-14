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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bug,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Circle,
  Flame,
  XCircle,
  Wrench,
} from 'lucide-react'

interface BugItem {
  id: string
  title: string
  description: string | null
  severity: string
  status: string
  source: string
  stackTrace: string | null
  createdAt: string
  updatedAt: string
}

interface BugStats {
  openBugs: number
  criticalIssues: number
  resolvedToday: number
  avgResolutionTime: number
}

interface ServiceHealthItem {
  service: string
  status: string
}

interface BugsData {
  bugs: BugItem[]
  stats: BugStats
  serviceHealth: ServiceHealthItem[]
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        badgeClass: 'bg-red-100 text-red-800 hover:bg-red-100',
        icon: Flame,
        iconClass: 'text-red-600',
      }
    case 'high':
      return {
        badgeClass: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
        icon: AlertTriangle,
        iconClass: 'text-orange-600',
      }
    case 'medium':
      return {
        badgeClass: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        icon: AlertTriangle,
        iconClass: 'text-yellow-600',
      }
    case 'low':
      return {
        badgeClass: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        icon: Bug,
        iconClass: 'text-blue-600',
      }
    default:
      return {
        badgeClass: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
        icon: Bug,
        iconClass: 'text-gray-600',
      }
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'open':
      return { badgeClass: 'bg-gray-100 text-gray-800 hover:bg-gray-100', icon: Bug, label: 'Open' }
    case 'investigating':
      return { badgeClass: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', icon: Clock, label: 'Investigating' }
    case 'fixing':
      return { badgeClass: 'bg-blue-100 text-blue-800 hover:bg-blue-100', icon: Wrench, label: 'Fixing' }
    case 'resolved':
      return { badgeClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100', icon: CheckCircle2, label: 'Resolved' }
    case 'wont_fix':
      return { badgeClass: 'bg-gray-100 text-gray-600 hover:bg-gray-100', icon: XCircle, label: "Won't Fix" }
    default:
      return { badgeClass: 'bg-gray-100 text-gray-800 hover:bg-gray-100', icon: Bug, label: status }
  }
}

function getServiceDotColor(status: string) {
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

export function BugDetection() {
  const [data, setData] = useState<BugsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedBug, setExpandedBug] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams()
        if (severityFilter !== 'all') params.set('severity', severityFilter)
        if (statusFilter !== 'all') params.set('status', statusFilter)

        const res = await fetch(`/api/admin/bugs?${params}`)
        if (!res.ok) throw new Error('Failed to fetch bugs')
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch bugs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [severityFilter, statusFilter])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const statCards = [
    {
      title: 'Open Bugs',
      value: data.stats.openBugs,
      icon: Bug,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Critical Issues',
      value: data.stats.criticalIssues,
      icon: Flame,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Resolved Today',
      value: data.stats.resolvedToday,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Avg Resolution',
      value: `${data.stats.avgResolutionTime}h`,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Bug Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium text-gray-600">
                {card.title}
              </CardDescription>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`size-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-gray-900">Bug Reports</CardTitle>
              <CardDescription>Track and manage reported issues</CardDescription>
            </div>
            <div className="flex gap-3">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="fixing">Fixing</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="wont_fix">Won&apos;t Fix</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            {data.bugs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Bug className="size-12 mb-3 text-gray-300" />
                <p className="text-sm">No bugs found matching your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.bugs.map((bug) => {
                  const severityConfig = getSeverityConfig(bug.severity)
                  const statusConfig = getStatusConfig(bug.status)
                  const isExpanded = expandedBug === bug.id

                  return (
                    <div key={bug.id} className="border rounded-lg hover:border-gray-300 transition-colors">
                      <button
                        onClick={() => setExpandedBug(isExpanded ? null : bug.id)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div className={`rounded-lg p-1.5 ${severityConfig.badgeClass.split(' ')[0]}`}>
                          {React.createElement(severityConfig.icon, {
                            className: `size-4 ${severityConfig.iconClass}`,
                          })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 truncate">
                              {bug.title}
                            </p>
                            <Badge className={severityConfig.badgeClass}>
                              {bug.severity}
                            </Badge>
                            <Badge className={statusConfig.badgeClass}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Source: {bug.source} · Created: {new Date(bug.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronDown className="size-4 text-gray-400 shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t bg-gray-50/50">
                          <div className="mt-3 space-y-3">
                            {bug.description && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                  Description
                                </p>
                                <p className="text-sm text-gray-600">
                                  {bug.description}
                                </p>
                              </div>
                            )}
                            {bug.stackTrace && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                  Stack Trace
                                </p>
                                <pre className="text-xs text-gray-600 bg-gray-900 text-gray-100 rounded-md p-3 overflow-x-auto max-h-48">
                                  {bug.stackTrace}
                                </pre>
                              </div>
                            )}
                            <div className="flex gap-4 text-xs text-gray-500">
                              <span>Created: {new Date(bug.createdAt).toLocaleString()}</span>
                              <span>Updated: {new Date(bug.updatedAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Service Health Check */}
      {data.serviceHealth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Service Health Check</CardTitle>
            <CardDescription>Current status of platform services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {data.serviceHealth.map((service) => (
                <div
                  key={service.service}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 border"
                >
                  <Circle
                    className={`size-2.5 fill-current ${getServiceDotColor(service.status)}`}
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {service.service}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
