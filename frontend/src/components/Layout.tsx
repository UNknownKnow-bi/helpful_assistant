import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { MessageSquare, CheckSquare, Settings, User, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, MessageCircle, SlidersHorizontal, UserCircle } from 'lucide-react'

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
    { path: '/dashboard', label: '任务管理', icon: LayoutDashboard },
    { path: '/chat', label: 'AI问答', icon: MessageCircle },
    { path: '/ai-config', label: 'AI配置', icon: SlidersHorizontal },
    { path: '/profile', label: '个人资料', icon: UserCircle },
  ]

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="px-6 py-4 flex items-center space-x-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 7L12 12M22 7L12 12M12 22V12" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 4.5L7 9.5" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">智时助手</h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  isActive
                    ? 'text-white bg-primary-500 shadow-sm'
                    : 'text-neutral-500 hover:bg-primary-100 hover:text-primary-600'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {label}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center space-x-3">
            <img className="w-10 h-10 rounded-full" src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User avatar" />
            <div>
              <p className="text-sm font-semibold">用户</p>
              <p className="text-xs text-neutral-500">user@example.com</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="ml-auto text-neutral-500 hover:text-neutral-900 p-1"
              title="退出"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}