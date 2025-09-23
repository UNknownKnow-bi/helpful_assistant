/**
 * Feishu Webhook Service
 * Manages Feishu webhook settings and notifications
 */

import { feishuWebhookApi } from './api'

export interface FeishuWebhookSettings {
  id: number
  user_id: number
  webhook_url: string
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface FeishuWebhookSettingsCreate {
  webhook_url: string
  is_enabled: boolean
}

export interface FeishuWebhookSettingsUpdate {
  webhook_url?: string
  is_enabled?: boolean
}

export interface FeishuWebhookTestRequest {
  webhook_url?: string
}

export interface FeishuWebhookTestResponse {
  success: boolean
  message: string
  response_data?: any
}

class FeishuWebhookService {
  
  /**
   * Get current user's Feishu webhook settings
   */
  async getSettings(): Promise<FeishuWebhookSettings | null> {
    try {
      return await feishuWebhookApi.getSettings()
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null // No settings found
      }
      throw error
    }
  }

  /**
   * Create or update Feishu webhook settings
   */
  async createSettings(settings: FeishuWebhookSettingsCreate): Promise<FeishuWebhookSettings> {
    return await feishuWebhookApi.createSettings(settings)
  }

  /**
   * Update existing Feishu webhook settings
   */
  async updateSettings(settings: FeishuWebhookSettingsUpdate): Promise<FeishuWebhookSettings> {
    return await feishuWebhookApi.updateSettings(settings)
  }

  /**
   * Delete Feishu webhook settings
   */
  async deleteSettings(): Promise<void> {
    await feishuWebhookApi.deleteSettings()
  }

  /**
   * Test Feishu webhook by sending a test notification
   */
  async testWebhook(testRequest?: FeishuWebhookTestRequest): Promise<FeishuWebhookTestResponse> {
    return await feishuWebhookApi.testWebhook(testRequest)
  }

  /**
   * Validate webhook URL format
   */
  isValidWebhookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname === 'www.feishu.cn' && 
             urlObj.pathname.includes('/flow/api/trigger-webhook/')
    } catch {
      return false
    }
  }

  /**
   * Get example webhook URL
   */
  getExampleWebhookUrl(): string {
    return 'https://www.feishu.cn/flow/api/trigger-webhook/56cf97862e3209e11175acef94902120'
  }

  /**
   * Get example JSON payload that will be sent to webhook
   */
  getExamplePayload(): object {
    return {
      task_title: "项目启动会议",
      task_content: "组织团队成员参加项目启动会议，讨论项目目标和时间安排",
      deadline: "2024-01-15T14:00:00Z",
      deadline_category: "仅剩2天"
    }
  }

  /**
   * Format example JSON for display
   */
  getFormattedExamplePayload(): string {
    return JSON.stringify(this.getExamplePayload(), null, 2)
  }
}

// Export singleton instance
export const feishuWebhookService = new FeishuWebhookService()