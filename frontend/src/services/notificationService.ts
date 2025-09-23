/**
 * Browser Notification Service for Task Deadline Alerts
 * Handles Web Push notifications for deadline reminders
 */

export type NotificationType = 'deadline-2days' | 'deadline-24hours' | 'deadline-arrived'

export interface NotificationData {
  taskId: number
  taskTitle: string
  deadline: string
  type: NotificationType
}

class NotificationService {
  private isSupported: boolean = false
  private permission: NotificationPermission = 'default'

  constructor() {
    this.isSupported = 'Notification' in window
    if (this.isSupported) {
      this.permission = Notification.permission
    }
  }

  /**
   * Request permission for browser notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Browser notifications are not supported')
      return 'denied'
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.isSupported && this.permission === 'granted'
  }

  /**
   * Show a task deadline notification
   */
  async showDeadlineNotification(data: NotificationData): Promise<void> {
    if (!this.isEnabled()) {
      console.warn('Notifications are not enabled')
      return
    }

    const { title, body, icon } = this.getNotificationContent(data)

    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: '/icons/icon-72x72.png',
        tag: `task-${data.taskId}-${data.type}`, // Prevent duplicate notifications
        requireInteraction: data.type === 'deadline-arrived', // Keep arrived notifications visible
        timestamp: Date.now(),
        data: {
          taskId: data.taskId,
          type: data.type,
          url: `/dashboard?task=${data.taskId}`
        }
      })

      // Handle notification click - focus app and navigate to task
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        // You can add navigation logic here if needed
        notification.close()
      }

      // Auto-close notification after 5 seconds (except for arrived deadlines)
      if (data.type !== 'deadline-arrived') {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

    } catch (error) {
      console.error('Error showing notification:', error)
    }
  }

  /**
   * Generate notification content based on deadline type
   */
  private getNotificationContent(data: NotificationData): {
    title: string
    body: string
    icon: string
  } {
    const deadlineDate = new Date(data.deadline)
    const formattedDate = deadlineDate.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    switch (data.type) {
      case 'deadline-2days':
        return {
          title: '📅 任务提醒 - 还有2天',
          body: `任务「${data.taskTitle}」将在 ${formattedDate} 到期`,
          icon: '/icons/icon-72x72.png'
        }

      case 'deadline-24hours':
        return {
          title: '⏰ 紧急任务提醒 - 还有24小时',
          body: `任务「${data.taskTitle}」将在 ${formattedDate} 到期，请尽快完成！`,
          icon: '/icons/icon-72x72.png'
        }

      case 'deadline-arrived':
        return {
          title: '🚨 任务截止提醒',
          body: `任务「${data.taskTitle}」现在已到期！`,
          icon: '/icons/icon-72x72.png'
        }

      default:
        return {
          title: '📋 任务提醒',
          body: `任务「${data.taskTitle}」需要您的关注`,
          icon: '/icons/icon-72x72.png'
        }
    }
  }

  /**
   * Test notification functionality
   */
  async testNotification(): Promise<void> {
    const testData: NotificationData = {
      taskId: 999,
      taskTitle: '测试任务通知',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      type: 'deadline-24hours'
    }

    await this.showDeadlineNotification(testData)
  }
}

// Export singleton instance
export const notificationService = new NotificationService()