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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Settings,
  Shield,
  Bell,
  Gauge,
  Server,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface SettingItem {
  id: string
  key: string
  value: string
  category: string
  isPublic: boolean
  updatedAt: string
}

type SettingsGroup = Record<string, SettingItem[]>

interface SettingsData {
  settings: SettingsGroup
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'general':
      return Settings
    case 'security':
      return Shield
    case 'notifications':
      return Bell
    case 'limits':
      return Gauge
    case 'api':
      return Server
    default:
      return Settings
  }
}

function getCategoryDescription(category: string) {
  switch (category) {
    case 'general':
      return 'General application settings and configuration'
    case 'security':
      return 'Security policies and authentication settings'
    case 'notifications':
      return 'Notification preferences and delivery settings'
    case 'limits':
      return 'Platform limits and resource constraints'
    case 'api':
      return 'API configuration and integration settings'
    default:
      return 'System settings'
  }
}

function isBooleanValue(value: string) {
  return value === 'true' || value === 'false'
}

export function SystemSettings() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [savingCategory, setSavingCategory] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/settings')
        if (!res.ok) throw new Error('Failed to fetch settings')
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

  const handleEdit = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (category: string, items: SettingItem[]) => {
    setSavingCategory(category)
    try {
      const settingsToSave = items
        .filter((item) => editedSettings[item.key] !== undefined)
        .map((item) => ({
          key: item.key,
          value: editedSettings[item.key] ?? item.value,
        }))

      if (settingsToSave.length === 0) {
        toast.info('No changes to save')
        setSavingCategory(null)
        return
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, settings: settingsToSave }),
      })

      if (!res.ok) throw new Error('Failed to save settings')

      const result = await res.json()

      if (result.success) {
        toast.success('Settings saved successfully', {
          description: `${category} settings have been updated.`,
        })
        // Clear edited settings for this category
        setEditedSettings((prev) => {
          const next = { ...prev }
          items.forEach((item) => delete next[item.key])
          return next
        })
        // Refresh data
        const freshRes = await fetch('/api/admin/settings')
        if (freshRes.ok) {
          const freshData = await freshRes.json()
          setData(freshData)
        }
      } else {
        throw new Error(result.error || 'Failed to save')
      }
    } catch (err) {
      toast.error('Failed to save settings', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setSavingCategory(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <XCircle className="size-4" />
        <AlertTitle>Failed to Load Settings</AlertTitle>
        <AlertDescription>
          {error || 'Unable to retrieve settings data.'}
        </AlertDescription>
      </Alert>
    )
  }

  const categories = Object.keys(data.settings).sort()

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const items = data.settings[category]
        const CategoryIcon = getCategoryIcon(category)
        const hasEdits = items.some((item) => editedSettings[item.key] !== undefined)

        return (
          <Card key={category} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <CategoryIcon className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900 capitalize">
                      {category}
                    </CardTitle>
                    <CardDescription>
                      {getCategoryDescription(category)}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSave(category, items)}
                  disabled={savingCategory === category || !hasEdits}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {savingCategory === category ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {items.map((item, idx) => {
                  const currentValue = editedSettings[item.key] ?? item.value
                  const isBoolean = isBooleanValue(item.value)
                  const isEdited = editedSettings[item.key] !== undefined

                  return (
                    <React.Fragment key={item.id}>
                      {idx > 0 && <Separator className="my-3" />}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.isPublic && (
                                <Badge variant="outline" className="text-xs">
                                  Public
                                </Badge>
                              )}
                              {isEdited && (
                                <Badge className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                  Unsaved
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isBoolean ? (
                            <Switch
                              checked={currentValue === 'true'}
                              onCheckedChange={(checked) =>
                                handleEdit(item.key, checked ? 'true' : 'false')
                              }
                            />
                          ) : (
                            <Input
                              value={currentValue}
                              onChange={(e) => handleEdit(item.key, e.target.value)}
                              className="w-48 h-8 text-sm"
                            />
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
