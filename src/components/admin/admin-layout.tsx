'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminStore } from '@/stores/admin-store'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import {
  LayoutDashboard, Users, Home, BarChart3, CreditCard,
  Server, LifeBuoy, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Activity, Search, Bell
} from 'lucide-react'
import type { AdminPage } from '@/types/admin'
import { AdminOverview } from './pages/admin-overview'
import { AdminUsers } from './pages/admin-users'
import { AdminFamilies } from './pages/admin-families'
import { AdminFeatures } from './pages/admin-features'
import { AdminSubscriptions } from './pages/admin-subscriptions'
import { AdminInfrastructure } from './pages/admin-infrastructure'
import { AdminSupport } from './pages/admin-support'
import { AdminSettings } from './pages/admin-settings'

const NAV_ITEMS: { id: AdminPage; label: string; icon: React.ReactNode; group: string }[] = [
  { id: 'overview', label: 'Platform Overview', icon: <LayoutDashboard className="w-4 h-4" />, group: 'Analytics' },
  { id: 'users', label: 'User Analytics', icon: <Users className="w-4 h-4" />, group: 'Analytics' },
  { id: 'families', label: 'Family Analytics', icon: <Home className="w-4 h-4" />, group: 'Analytics' },
  { id: 'features', label: 'Feature Usage', icon: <BarChart3 className="w-4 h-4" />, group: 'Analytics' },
  { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="w-4 h-4" />, group: 'Business' },
  { id: 'infrastructure', label: 'Infrastructure', icon: <Server className="w-4 h-4" />, group: 'Operations' },
  { id: 'support', label: 'Support Center', icon: <LifeBuoy className="w-4 h-4" />, group: 'Operations' },
  { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" />, group: 'Operations' },
]

export function AdminLayout() {
  const { currentPage, setCurrentPage, sidebarCollapsed, setSidebarCollapsed } = useAdminStore()
  const { adminUser, adminRole, logoutAdmin, checkAndExtendSession, hasPermission } = useAdminAuthStore()

  // Session check interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!checkAndExtendSession()) {
        logoutAdmin()
      }
    }, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [checkAndExtendSession, logoutAdmin])

  const handleNavClick = useCallback((page: AdminPage) => {
    setCurrentPage(page)
  }, [setCurrentPage])

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return <AdminOverview />
      case 'users': return <AdminUsers />
      case 'families': return <AdminFamilies />
      case 'features': return <AdminFeatures />
      case 'subscriptions': return <AdminSubscriptions />
      case 'infrastructure': return <AdminInfrastructure />
      case 'support': return <AdminSupport />
      case 'settings': return <AdminSettings />
      default: return <AdminOverview />
    }
  }

  const groupedNav = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof NAV_ITEMS>)

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 bottom-0 z-50 bg-[#0D0D12] border-r border-white/[0.06] flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
              >
                <h1 className="text-sm font-bold text-white whitespace-nowrap">USRA PLUS</h1>
                <p className="text-[10px] text-white/30 whitespace-nowrap">Control Center</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {Object.entries(groupedNav).map(([group, items]) => (
            <div key={group} className="mb-4">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-medium text-white/20 uppercase tracking-wider px-4 mb-2">{group}</p>
              )}
              <div className="space-y-0.5 px-2">
                {items.map((item) => {
                  const isActive = currentPage === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-indigo-500/10 text-indigo-400'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <span className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-white/40'}`}>
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {isActive && !sidebarCollapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-white/[0.06] p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
      >
        {/* Top Bar */}
        <header className="h-16 bg-[#0D0D12]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">
              {NAV_ITEMS.find(i => i.id === currentPage)?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30 w-48"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Role Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium capitalize">{adminRole?.replace('_', ' ')}</span>
            </div>

            {/* User */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-medium">
                {adminUser?.name?.charAt(0) || 'A'}
              </div>
              {!sidebarCollapsed && (
                <span className="text-sm text-white/70 hidden lg:block">{adminUser?.name}</span>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logoutAdmin}
              className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
