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
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Database,
  Shield,
  Server,
  HardDrive,
  Mail,
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Cpu,
  Info,
} from 'lucide-react'

interface ServiceInfo {
  name: string
  status: string
  responseTime: number | null
  uptime: number | null
  lastCheckedAt: string
}

interface SystemInfo {
  dbProvider: string
  dbType: string
  connectionStatus: string
  schemaVersion: string
  lastMigration?: string
  nodeVersion?: string
  platform?: string
  uptime?: number
}

interface InfrastructureData {
  services: ServiceInfo[]
  system: SystemInfo
}

function getServiceIcon(name: string) {
  switch (name.toLowerCase()) {
    case 'database':
      return Database
    case 'auth':
      return Shield
    case 'api':
      return Server
    case 'storage':
      return HardDrive
    case 'email':
      return Mail
    case 'push notifications':
      return Bell
    default:
      return Server
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'operational':
      return {
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        badgeClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
        dotColor: 'bg-emerald-500',
        label: 'Operational',
      }
    case 'degraded':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        badgeClass: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        dotColor: 'bg-yellow-500',
        label: 'Degraded',
      }
    case 'down':
      return {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        badgeClass: 'bg-red-100 text-red-800 hover:bg-red-100',
        dotColor: 'bg-red-500',
        label: 'Down',
      }
    case 'maintenance':
      return {
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeClass: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        dotColor: 'bg-blue-500',
        label: 'Maintenance',
      }
    default:
      return {
        icon: Info,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeClass: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
        dotColor: 'bg-gray-500',
        label: status,
      }
  }
}

export function Infrastructure() {
  const [data, setData] = useState<InfrastructureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/infrastructure')
        if (!res.ok) throw new Error('Failed to fetch infrastructure data')
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
              <CardHeader>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <XCircle className="size-4" />
        <AlertTitle>Failed to Load Infrastructure</AlertTitle>
        <AlertDescription>
          {error || 'Unable to retrieve infrastructure data. Please try again later.'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Service Health Cards */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.services.map((service) => {
            const StatusIcon = getServiceIcon(service.name)
            const statusConfig = getStatusConfig(service.status)
            const StatusBadgeIcon = statusConfig.icon

            return (
              <Card
                key={service.name}
                className={`border ${statusConfig.borderColor} hover:shadow-md transition-shadow`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-2 ${statusConfig.bgColor}`}>
                      <StatusIcon className={`size-5 ${statusConfig.color}`} />
                    </div>
                    <CardTitle className="text-base text-gray-900">
                      {service.name}
                    </CardTitle>
                  </div>
                  <Badge className={statusConfig.badgeClass}>
                    <div className={`size-1.5 rounded-full ${statusConfig.dotColor} mr-1`} />
                    {statusConfig.label}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Response Time</span>
                    <span className="font-medium text-gray-900">
                      {service.responseTime ?? '—'}ms
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Uptime</span>
                      <span className="font-medium text-gray-900">
                        {service.uptime ? `${service.uptime}%` : '—'}
                      </span>
                    </div>
                    {service.uptime && (
                      <Progress
                        value={service.uptime}
                        className="h-1.5"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Last Checked</span>
                    <span className="text-xs text-gray-400">
                      {new Date(service.lastCheckedAt).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* System Info Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="size-5 text-emerald-600" />
            <CardTitle className="text-gray-900">System Information</CardTitle>
          </div>
          <CardDescription>Database and system configuration details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Database Provider</p>
              <div className="flex items-center gap-2">
                <Database className="size-4 text-emerald-600" />
                <span className="font-medium text-gray-900">
                  Connected to {data.system.dbProvider}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Connection Status</p>
              <div className="flex items-center gap-2">
                {data.system.connectionStatus === 'connected' ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="font-medium text-emerald-600">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-red-500" />
                    <span className="font-medium text-red-500 capitalize">
                      {data.system.connectionStatus}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Schema Version</p>
              <span className="font-medium text-gray-900">
                v{data.system.schemaVersion}
              </span>
            </div>
            {data.system.nodeVersion && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Node Version</p>
                <span className="font-medium text-gray-900">
                  {data.system.nodeVersion}
                </span>
              </div>
            )}
            {data.system.platform && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Platform</p>
                <span className="font-medium text-gray-900 capitalize">
                  {data.system.platform}
                </span>
              </div>
            )}
            {data.system.uptime !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Process Uptime</p>
                <span className="font-medium text-gray-900">
                  {Math.floor(data.system.uptime / 3600)}h {Math.floor((data.system.uptime % 3600) / 60)}m
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
