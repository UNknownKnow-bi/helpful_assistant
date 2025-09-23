/**
 * Notification Hook
 * Manages notification permissions and integration with app
 */

import { useEffect, useState } from 'react'
import { notificationService } from '@/services/notificationService'

export const useNotifications = () => {
  const [isEnabled, setIsEnabled] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    // Check initial permission status
    updateStatus()
    
    // Auto-request permission when app loads (non-intrusive)
    const autoRequestPermission = async () => {
      if (permission === 'default') {
        // Only auto-request if user hasn't explicitly denied before
        const hasUserDenied = localStorage.getItem('notifications-denied')
        if (!hasUserDenied) {
          const newPermission = await notificationService.requestPermission()
          if (newPermission === 'denied') {
            localStorage.setItem('notifications-denied', 'true')
          }
          updateStatus()
        }
      }
    }

    // Delay auto-request to avoid immediately showing permission dialog
    const timer = setTimeout(autoRequestPermission, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  const updateStatus = () => {
    setIsEnabled(notificationService.isEnabled())
    setPermission(Notification.permission)
  }

  const requestPermission = async () => {
    const newPermission = await notificationService.requestPermission()
    updateStatus()
    return newPermission
  }

  const testNotification = async () => {
    await notificationService.testNotification()
  }

  return {
    isEnabled,
    permission,
    requestPermission,
    testNotification,
    updateStatus
  }
}