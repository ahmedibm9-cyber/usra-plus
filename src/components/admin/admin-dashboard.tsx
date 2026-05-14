'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Activity,
  Server,
  Bug,
  Settings,
  Bell,
  Shield,
  Menu,
  X,
} from 'lucide-react'
import { DashboardOverview } from './dashboard-overview'
import { ActivityMonitor } from './activity-monitor'
import { ErrorBoundary } from './error-boundary'
import { Infrastructure } from './infrastructure'
import { BugDetection } from './bug-detection'
import { SystemSettings } from './system-settings'

type TabKey = 'dashboard' | 'activity' | 'infrastructure' | 'bugs' | 'settings'

interface TabConfig {
  key: TabKey
  label: string
  icon: React.ElementType
}

const tabs: TabConfig[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'activity', label: 'Activity Monitor', icon: Activity },
  { key: 'infrastructure', label: 'Infrastructure', icon: Server },
  { key: 'bugs', label: 'Bug Detection', icon: Bug },
  { key: 'settings', label: 'System Settings', icon: Settings },
]

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </Button>

            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600">
                <Shield className="size-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-none">
                  USRA PLUS
                </h1>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5">
                  Super Admin Dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5 text-gray-600" />
              <span className="absolute top-1.5 right-1.5 flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
            </Button>

            {/* User Avatar */}
            <div className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  SA
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 leading-none">
                  Super Admin
                </p>
                <p className="text-xs text-gray-500 leading-none mt-0.5">
                  admin@usraplus.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <nav
        className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white border-r shadow-lg transform transition-transform duration-200 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  setMobileMenuOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r p-4 shrink-0">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="mt-auto pt-4 border-t">
            <div className="px-3 py-2">
              <p className="text-xs text-gray-500">Platform Version</p>
              <p className="text-sm font-medium text-gray-900">v1.0.0</p>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {/* Breadcrumb / Page Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'dashboard' && 'Overview of platform metrics and health'}
              {activeTab === 'activity' && 'Monitor real-time user activity and events'}
              {activeTab === 'infrastructure' && 'Service health and system configuration'}
              {activeTab === 'bugs' && 'Bug reports, detection, and service health'}
              {activeTab === 'settings' && 'Manage platform configuration and preferences'}
            </p>
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <ErrorBoundary>
              <DashboardOverview />
            </ErrorBoundary>
          )}
          {activeTab === 'activity' && (
            <ErrorBoundary>
              <ActivityMonitor />
            </ErrorBoundary>
          )}
          {activeTab === 'infrastructure' && (
            <ErrorBoundary>
              <Infrastructure />
            </ErrorBoundary>
          )}
          {activeTab === 'bugs' && (
            <ErrorBoundary>
              <BugDetection />
            </ErrorBoundary>
          )}
          {activeTab === 'settings' && (
            <ErrorBoundary>
              <SystemSettings />
            </ErrorBoundary>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t py-4 px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            © 2024 USRA PLUS. Family Digital Safety Platform.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>All systems operational</span>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 mr-1" />
              Healthy
            </Badge>
          </div>
        </div>
      </footer>
    </div>
  )
}
