/**
 * Webhook Notification Service
 * Handles webhook notifications for task deadlines
 */

import { feishuWebhookApi } from './api'
import type { Task } from '@/types'
import type { DeadlineCheckResult } from './deadlineChecker'

export interface WebhookNotificationData {
  task_title: string
  task_content: string
  deadline: string
  deadline_category: string
}

class WebhookNotificationService {
  
  /**
   * Send webhook notification for task deadline
   */
  async sendDeadlineNotification(
    task: Task,
    deadlineCategory: string
  ): Promise<boolean> {
    try {
      const notificationData: WebhookNotificationData = {
        task_title: task.title,
        task_content: task.content,
        deadline: task.deadline || '',
        deadline_category: deadlineCategory
      }

      await feishuWebhookApi.sendNotification(notificationData)
      return true
    } catch (error) {
      console.error('Failed to send webhook notification:', error)
      return false
    }
  }

  /**
   * Process deadline check results and send webhook notifications
   */
  async processDeadlineNotifications(
    checkResults: DeadlineCheckResult[],
    tasks: Task[]
  ): Promise<void> {
    if (checkResults.length === 0) {
      return
    }

    console.log(`Processing ${checkResults.length} webhook notifications`)

    for (const result of checkResults) {
      const task = tasks.find(t => t.id === result.taskId)
      if (!task) {
        console.warn(`Task not found for notification: ${result.taskId}`)
        continue
      }

      try {
        // Map notification type to Chinese category
        const categoryMap = {
          'deadline-2days': '仅剩2天',
          'deadline-24hours': '仅剩24小时',
          'deadline-arrived': '已过期'
        }

        const category = categoryMap[result.type as keyof typeof categoryMap] || '截止提醒'
        
        const success = await this.sendDeadlineNotification(task, category)
        
        if (success) {
          console.log(`Sent webhook notification for task: ${task.title} (${category})`)
        } else {
          console.error(`Failed to send webhook notification for task: ${task.title}`)
        }
      } catch (error) {
        console.error(`Error processing webhook notification for task ${result.taskId}:`, error)
      }
    }
  }

  /**
   * Check if webhook notifications are enabled for current user
   */
  async isWebhookEnabled(): Promise<boolean> {
    try {
      const settings = await feishuWebhookApi.getSettings()
      return settings?.is_enabled ?? false
    } catch (error) {
      // If no settings found, webhook is not enabled
      return false
    }
  }
}

// Export singleton instance
export const webhookNotificationService = new WebhookNotificationService()