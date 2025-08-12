import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { MessageSquare, CheckSquare, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const navItems = [
    { path: '/dashboard', label: '任务管理', icon: CheckSquare },
    { path: '/chat', label: 'AI问答', icon: MessageSquare },
    { path: '/ai-config', label: 'AI配置', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                智时助手
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-sm h-[calc(100vh-64px)] transition-all duration-300 relative`}>
          {/* Toggle Button */}
          <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="sm"
            className="absolute -right-3 top-4 z-10 h-6 w-6 p-0 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>

          <div className="p-4">
            <div className="space-y-2">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={sidebarCollapsed ? label : ''}
                  >
                    <Icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && label}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  )
}