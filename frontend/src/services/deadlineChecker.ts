/**
 * Deadline Checker Service
 * Analyzes task deadlines and triggers appropriate notifications
 */

import type { Task } from '@/types'
import { notificationService, type NotificationData, type NotificationType } from './notificationService'

export interface DeadlineCheckResult {
  taskId: number
  taskTitle: string
  deadline: string
  type: NotificationType
  timeRemaining: number // milliseconds
}

class DeadlineChecker {
  private notifiedTasks: Map<string, Set<NotificationType>> = new Map()

  /**
   * Check all tasks for deadline alerts
   */
  checkTaskDeadlines(tasks: Task[]): DeadlineCheckResult[] {
    const now = new Date()
    const results: DeadlineCheckResult[] = []

    for (const task of tasks) {
      // Skip completed tasks
      if (task.status === 'done') continue
      
      // Skip tasks without deadlines
      if (!task.deadline) continue

      const deadline = new Date(task.deadline)
      const timeRemaining = deadline.getTime() - now.getTime()

      // Skip past deadlines that we've already processed
      if (timeRemaining < -24 * 60 * 60 * 1000) continue // 1 day past deadline

      const checkResult = this.analyzeDeadline(task, timeRemaining)
      if (checkResult) {
        results.push(checkResult)
      }
    }

    return results
  }

  /**
   * Analyze a single task's deadline and determine notification type
   */
  private analyzeDeadline(task: Task, timeRemaining: number): DeadlineCheckResult | null {
    const taskKey = `task-${task.id}`
    const notifiedTypes = this.notifiedTasks.get(taskKey) || new Set()

    // Define time thresholds
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000 // 2 days in milliseconds
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    const DEADLINE_ARRIVED = 0

    let notificationType: NotificationType | null = null

    if (timeRemaining <= DEADLINE_ARRIVED && timeRemaining > -60 * 60 * 1000) {
      // Deadline has arrived (within 1 hour grace period)
      if (!notifiedTypes.has('deadline-arrived')) {
        notificationType = 'deadline-arrived'
      }
    } else if (timeRemaining <= TWENTY_FOUR_HOURS && timeRemaining > DEADLINE_ARRIVED) {
      // 24 hours remaining
      if (!notifiedTypes.has('deadline-24hours')) {
        notificationType = 'deadline-24hours'
      }
    } else if (timeRemaining <= TWO_DAYS && timeRemaining > TWENTY_FOUR_HOURS) {
      // 2 days remaining
      if (!notifiedTypes.has('deadline-2days')) {
        notificationType = 'deadline-2days'
      }
    }

    if (notificationType) {
      // Mark this notification as sent
      notifiedTypes.add(notificationType)
      this.notifiedTasks.set(taskKey, notifiedTypes)

      return {
        taskId: task.id,
        taskTitle: task.title,
        deadline: task.deadline!,
        type: notificationType,
        timeRemaining
      }
    }

    return null
  }

  /**
   * Process deadline check results and send notifications
   */
  async processDeadlineAlerts(checkResults: DeadlineCheckResult[]): Promise<void> {
    if (!notificationService.isEnabled()) {
      console.log('Notifications not enabled, skipping deadline alerts')
      return
    }

    for (const result of checkResults) {
      const notificationData: NotificationData = {
        taskId: result.taskId,
        taskTitle: result.taskTitle,
        deadline: result.deadline,
        type: result.type
      }

      try {
        await notificationService.showDeadlineNotification(notificationData)
        console.log(`Sent ${result.type} notification for task: ${result.taskTitle}`)
      } catch (error) {
        console.error('Failed to send deadline notification:', error)
      }
    }
  }

  /**
   * Reset notification tracking for a specific task
   * Useful when task deadline is updated or task is completed
   */
  resetTaskNotifications(taskId: number): void {
    const taskKey = `task-${taskId}`
    this.notifiedTasks.delete(taskKey)
  }

  /**
   * Reset all notification tracking
   * Useful for testing or when user settings change
   */
  resetAllNotifications(): void {
    this.notifiedTasks.clear()
  }

  /**
   * Get notification status for a task
   */
  getTaskNotificationStatus(taskId: number): NotificationType[] {
    const taskKey = `task-${taskId}`
    const notifiedTypes = this.notifiedTasks.get(taskKey) || new Set()
    return Array.from(notifiedTypes)
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(timeRemaining: number): string {
    if (timeRemaining <= 0) {
      return '已到期'
    }

    const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))

    if (days > 0) {
      return `${days}天${hours}小时`
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else {
      return `${minutes}分钟`
    }
  }

  /**
   * Get summary of upcoming deadlines
   */
  getDeadlineSummary(tasks: Task[]): {
    total: number
    twoDays: number
    twentyFourHours: number
    overdue: number
  } {
    const now = new Date()
    const summary = {
      total: 0,
      twoDays: 0,
      twentyFourHours: 0,
      overdue: 0
    }

    for (const task of tasks) {
      if (task.status === 'done' || !task.deadline) continue

      const deadline = new Date(task.deadline)
      const timeRemaining = deadline.getTime() - now.getTime()

      summary.total++

      if (timeRemaining <= 0) {
        summary.overdue++
      } else if (timeRemaining <= 24 * 60 * 60 * 1000) {
        summary.twentyFourHours++
      } else if (timeRemaining <= 2 * 24 * 60 * 60 * 1000) {
        summary.twoDays++
      }
    }

    return summary
  }
}

// Export singleton instance
export const deadlineChecker = new DeadlineChecker()