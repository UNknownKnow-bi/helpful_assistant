/**
 * Notification Settings Component
 * Allows users to manage deadline notification preferences
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { notificationService } from '@/services/notificationService'
import { notificationScheduler } from '@/services/notificationScheduler'
import { deadlineChecker } from '@/services/deadlineChecker'
import { Bell, BellOff, Settings, TestTube2, RotateCcw } from 'lucide-react'

interface NotificationSettingsProps {
  className?: string
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className = '' }) => {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    updateStatus()
    
    // Check status every 30 seconds
    const interval = setInterval(updateStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const updateStatus = () => {
    setIsEnabled(notificationService.isEnabled())
    setIsSchedulerRunning(notificationScheduler.isActive())
    setPermission(Notification.permission)
    setLastCheck(notificationScheduler.getLastCheck())
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    try {
      const newPermission = await notificationService.requestPermission()
      setPermission(newPermission)
      
      if (newPermission === 'granted') {
        await notificationScheduler.start()
        setIsSchedulerRunning(true)
        setIsEnabled(true)
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      alert('启用通知失败，请检查浏览器设置')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = () => {
    notificationScheduler.stop()
    setIsSchedulerRunning(false)
    updateStatus()
  }

  const handleTestNotification = async () => {
    setIsLoading(true)
    try {
      await notificationScheduler.testNotifications()
    } catch (error) {
      console.error('Test notification failed:', error)
      alert('测试通知失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetNotifications = () => {
    if (confirm('确定要重置所有通知记录吗？这将允许系统重新发送之前已发送的提醒。')) {
      deadlineChecker.resetAllNotifications()
      alert('通知记录已重置')
    }
  }

  const handleForceCheck = async () => {
    setIsLoading(true)
    try {
      await notificationScheduler.checkDeadlines()
      updateStatus()
      alert('已完成手动检查')
    } catch (error) {
      console.error('Manual check failed:', error)
      alert('手动检查失败')
    } finally {
      setIsLoading(false)
    }
  }

  const getPermissionText = () => {
    switch (permission) {
      case 'granted':
        return '已授权'
      case 'denied':
        return '已拒绝'
      default:
        return '未设置'
    }
  }

  const getStatusColor = () => {
    if (!isEnabled) return 'text-gray-500'
    return isSchedulerRunning ? 'text-green-600' : 'text-orange-500'
  }

  const getStatusIcon = () => {
    if (!isEnabled) return <BellOff className="w-5 h-5 text-gray-500" />
    return isSchedulerRunning ? 
      <Bell className="w-5 h-5 text-green-600" /> : 
      <BellOff className="w-5 h-5 text-orange-500" />
  }

  return (
    <div className={`space-y-4 ${className}`}>
        {/* Status Display */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">通知权限:</span>
            <span className={`ml-2 ${permission === 'granted' ? 'text-green-600' : 'text-red-500'}`}>
              {getPermissionText()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">提醒状态:</span>
            <span className={`ml-2 ${getStatusColor()}`}>
              {isSchedulerRunning ? '运行中' : '已停止'}
            </span>
          </div>
          {lastCheck && (
            <div className="col-span-2">
              <span className="font-medium text-gray-700">上次检查:</span>
              <span className="ml-2 text-gray-600">
                {lastCheck.toLocaleString('zh-CN')}
              </span>
            </div>
          )}
        </div>


        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isEnabled || !isSchedulerRunning ? (
            <Button 
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Bell className="w-4 h-4" />
              <span>{isLoading ? '启用中...' : '启用提醒'}</span>
            </Button>
          ) : (
            <Button 
              onClick={handleDisableNotifications}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <BellOff className="w-4 h-4" />
              <span>停止提醒</span>
            </Button>
          )}

          <Button 
            onClick={handleTestNotification}
            disabled={isLoading || !isEnabled}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <TestTube2 className="w-4 h-4" />
            <span>测试通知</span>
          </Button>

          <Button 
            onClick={handleForceCheck}
            disabled={isLoading || !isSchedulerRunning}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>立即检查</span>
          </Button>

          <Button 
            onClick={handleResetNotifications}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 text-orange-600 hover:text-orange-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置记录</span>
          </Button>
        </div>

        {/* Help Text */}
        {permission === 'denied' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>注意:</strong> 浏览器通知权限已被拒绝。请在浏览器设置中手动允许通知权限，然后刷新页面。
            </p>
          </div>
        )}

        {!('Notification' in window) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>不支持:</strong> 您的浏览器不支持桌面通知功能。
            </p>
          </div>
        )}
    </div>
  )
}

export default NotificationSettings