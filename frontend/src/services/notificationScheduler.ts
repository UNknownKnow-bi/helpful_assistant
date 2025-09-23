/**
 * Notification Scheduler Service
 * Manages periodic deadline checking and notification scheduling
 */

import { tasksApi } from './api'
import { deadlineChecker } from './deadlineChecker'
import { notificationService } from './notificationService'
import { webhookNotificationService } from './webhookNotificationService'
import type { Task } from '@/types'

class NotificationScheduler {
  private checkInterval: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private lastCheck: Date | null = null
  
  // Check every 5 minutes by default
  private readonly CHECK_INTERVAL = 5 * 60 * 1000
  
  // Faster check when deadlines are approaching
  private readonly URGENT_CHECK_INTERVAL = 1 * 60 * 1000

  /**
   * Start the notification scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Notification scheduler is already running')
      return
    }

    // Request notification permission first
    const permission = await notificationService.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied, scheduler will not start')
      return
    }

    this.isRunning = true
    console.log('Starting deadline notification scheduler')

    // Run initial check
    await this.checkDeadlines()

    // Set up periodic checks
    this.scheduleNextCheck()
  }

  /**
   * Stop the notification scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearTimeout(this.checkInterval)
      this.checkInterval = null
    }
    this.isRunning = false
    console.log('Stopped deadline notification scheduler')
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Get last check timestamp
   */
  getLastCheck(): Date | null {
    return this.lastCheck
  }

  /**
   * Manual deadline check (can be triggered by user)
   */
  async checkDeadlines(): Promise<void> {
    if (!notificationService.isEnabled()) {
      console.log('Notifications not enabled, skipping deadline check')
      return
    }

    try {
      // Fetch current tasks
      const tasks = await this.fetchActiveTasks()
      
      // Check for deadline alerts
      const alertResults = deadlineChecker.checkTaskDeadlines(tasks)
      
      if (alertResults.length > 0) {
        console.log(`Found ${alertResults.length} deadline alerts to process`)
        
        // Process browser notifications
        await deadlineChecker.processDeadlineAlerts(alertResults)
        
        // Process webhook notifications
        await webhookNotificationService.processDeadlineNotifications(alertResults, tasks)
      }

      this.lastCheck = new Date()
      
      // Determine next check interval based on urgency
      const nextInterval = this.getOptimalCheckInterval(tasks)
      this.scheduleNextCheck(nextInterval)

    } catch (error) {
      console.error('Error checking deadlines:', error)
      // Retry with default interval on error
      this.scheduleNextCheck()
    }
  }

  /**
   * Fetch active tasks from API
   */
  private async fetchActiveTasks(): Promise<Task[]> {
    try {
      const tasks = await tasksApi.getTasks()
      // Filter to only undone tasks with deadlines
      return tasks.filter(task => 
        task.status === 'undo' && 
        task.deadline && 
        new Date(task.deadline) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Not more than 1 day overdue
      )
    } catch (error) {
      console.error('Failed to fetch tasks for deadline check:', error)
      return []
    }
  }

  /**
   * Determine optimal check interval based on task urgency
   */
  private getOptimalCheckInterval(tasks: Task[]): number {
    const now = new Date()
    let hasUrgentTasks = false

    for (const task of tasks) {
      if (!task.deadline) continue
      
      const deadline = new Date(task.deadline)
      const timeRemaining = deadline.getTime() - now.getTime()
      
      // If any task has less than 2 hours remaining, use urgent interval
      if (timeRemaining <= 2 * 60 * 60 * 1000 && timeRemaining > 0) {
        hasUrgentTasks = true
        break
      }
    }

    return hasUrgentTasks ? this.URGENT_CHECK_INTERVAL : this.CHECK_INTERVAL
  }

  /**
   * Schedule the next deadline check
   */
  private scheduleNextCheck(interval: number = this.CHECK_INTERVAL): void {
    if (!this.isRunning) return

    if (this.checkInterval) {
      clearTimeout(this.checkInterval)
    }

    this.checkInterval = setTimeout(() => {
      this.checkDeadlines()
    }, interval)

    console.log(`Next deadline check scheduled in ${Math.round(interval / 1000 / 60)} minutes`)
  }

  /**
   * Force refresh - useful when tasks are updated
   */
  async refresh(): Promise<void> {
    if (!this.isRunning) return
    
    console.log('Forcing deadline check refresh')
    await this.checkDeadlines()
  }

  /**
   * Reset notification tracking for a specific task
   */
  resetTaskNotifications(taskId: number): void {
    deadlineChecker.resetTaskNotifications(taskId)
  }

  /**
   * Get scheduler status information
   */
  getStatus(): {
    isRunning: boolean
    lastCheck: Date | null
    isEnabled: boolean
    nextCheckIn: number | null
  } {
    let nextCheckIn: number | null = null
    
    if (this.checkInterval && this.lastCheck) {
      const nextCheck = new Date(this.lastCheck.getTime() + this.CHECK_INTERVAL)
      nextCheckIn = Math.max(0, nextCheck.getTime() - Date.now())
    }

    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      isEnabled: notificationService.isEnabled(),
      nextCheckIn
    }
  }

  /**
   * Test the notification system
   */
  async testNotifications(): Promise<void> {
    console.log('Testing notification system...')
    
    // Test permission
    const permission = await notificationService.requestPermission()
    if (permission !== 'granted') {
      alert('请允许浏览器通知权限以测试提醒功能')
      return
    }

    // Test notification display
    await notificationService.testNotification()
    
    alert('测试通知已发送！如果您看到了浏览器通知，说明提醒系统正常工作。')
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler()