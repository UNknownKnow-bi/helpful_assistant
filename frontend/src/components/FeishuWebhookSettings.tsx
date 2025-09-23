/**
 * Feishu Webhook Settings Component
 * Provides UI for configuring Feishu webhook notifications
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { AlertCircle, CheckCircle, Send, Trash2, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react'
import { useFeishuWebhook } from '@/hooks/useFeishuWebhook'

const FeishuWebhookSettings: React.FC = () => {
  const {
    settings,
    isEnabled,
    hasSettings,
    webhookUrl,
    isLoading,
    isSaving,
    isTesting,
    isDeleting,
    saveError,
    testError,
    testResult,
    saveSettings,
    toggleEnabled,
    deleteSettings,
    testWebhook,
    isValidWebhookUrl,
    getExampleWebhookUrl,
    getFormattedExamplePayload,
    resetTestResult,
    resetSaveError
  } = useFeishuWebhook()

  // Local state for form
  const [formData, setFormData] = useState({
    webhook_url: '',
    is_enabled: true
  })
  const [showExamplePayload, setShowExamplePayload] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        webhook_url: settings.webhook_url,
        is_enabled: settings.is_enabled
      })
    }
  }, [settings])

  // Handle form changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setFormData(prev => ({ ...prev, webhook_url: url }))
    
    // Real-time validation
    if (url && !isValidWebhookUrl(url)) {
      setValidationError('请输入有效的飞书 Webhook URL')
    } else {
      setValidationError('')
    }
    
    // Clear previous errors
    resetSaveError()
    resetTestResult()
  }

  const handleEnabledChange = (enabled: boolean) => {
    setFormData(prev => ({ ...prev, is_enabled: enabled }))
  }

  // Handle save
  const handleSave = async () => {
    if (!formData.webhook_url) {
      setValidationError('请输入 Webhook URL')
      return
    }

    if (!isValidWebhookUrl(formData.webhook_url)) {
      setValidationError('请输入有效的飞书 Webhook URL')
      return
    }

    try {
      await saveSettings(formData)
      setValidationError('')
    } catch (error) {
      console.error('Failed to save webhook settings:', error)
    }
  }

  // Handle test
  const handleTest = async () => {
    if (!formData.webhook_url) {
      setValidationError('请输入 Webhook URL')
      return
    }

    if (!isValidWebhookUrl(formData.webhook_url)) {
      setValidationError('请输入有效的飞书 Webhook URL')
      return
    }

    try {
      await testWebhook(formData.webhook_url)
      setValidationError('')
    } catch (error) {
      console.error('Failed to test webhook:', error)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (window.confirm('确定要删除飞书 Webhook 配置吗？')) {
      try {
        await deleteSettings()
        setFormData({ webhook_url: '', is_enabled: true })
      } catch (error) {
        console.error('Failed to delete webhook settings:', error)
      }
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>飞书 Webhook 配置</span>
            {hasSettings && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                isEnabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {isEnabled ? '已启用' : '已禁用'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URL Input */}
          <div>
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="mt-1 space-y-2">
              <Input
                id="webhook-url"
                type="url"
                placeholder={getExampleWebhookUrl()}
                value={formData.webhook_url}
                onChange={handleUrlChange}
                className={validationError ? 'border-red-500' : ''}
              />
              {validationError && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="webhook-enabled">启用飞书通知</Label>
              <p className="text-sm text-gray-500">开启后，任务截止日期提醒将通过飞书 Webhook 发送</p>
            </div>
            <Switch
              id="webhook-enabled"
              checked={formData.is_enabled}
              onCheckedChange={handleEnabledChange}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.webhook_url || !!validationError}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? '保存中...' : hasSettings ? '更新配置' : '保存配置'}</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !formData.webhook_url || !!validationError}
              className="flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{isTesting ? '测试中...' : '发送测试消息'}</span>
            </Button>

            {hasSettings && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? '删除中...' : '删除配置'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => window.open('https://www.feishu.cn/hc/zh-CN/articles/360040566373', '_blank')}
              className="flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>查看飞书文档</span>
            </Button>
          </div>

          {/* Error Messages */}
          {saveError && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 rounded-md">
              <AlertCircle className="w-5 h-5" />
              <span>保存失败：{(saveError as any)?.response?.data?.detail || '未知错误'}</span>
            </div>
          )}

          {testError && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 rounded-md">
              <AlertCircle className="w-5 h-5" />
              <span>测试失败：{(testError as any)?.response?.data?.detail || '未知错误'}</span>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`flex items-center space-x-2 p-3 rounded-md ${
              testResult.success 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Example Payload Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>参数说明</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExamplePayload(!showExamplePayload)}
              className="flex items-center space-x-1"
            >
              {showExamplePayload ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showExamplePayload ? '隐藏' : '查看'}</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              当任务到达截止日期提醒时间时，智时助手将向您的飞书 Webhook 发送 JSON 数据。请按照以下规则在飞书流程中配置参数：
            </p>

            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h4 className="font-medium text-blue-900 mb-2">📋 飞书 Webhook 参数配置 (复制到飞书)</h4>
              <p className="text-sm text-blue-700 mb-3">
                请将以下 JSON 配置复制到飞书流程的"Webhook 推送的 JSON 数据格式"中：
              </p>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">配置 JSON：</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('{\n  "message_type": "text",\n  "task_title": "示例任务标题",\n  "task_content": "示例任务内容",\n  "deadline": "2024-01-15T14:00:00Z",\n  "deadline_category": "仅剩2天"\n}')}
                    className="flex items-center space-x-1 text-blue-700"
                  >
                    <Copy className="w-4 h-4" />
                    <span>复制配置</span>
                  </Button>
                </div>
                <pre className="bg-white p-3 rounded border text-sm font-mono overflow-x-auto">
{`{
  "message_type": "text",
  "task_title": "示例任务标题",
  "task_content": "示例任务内容",
  "deadline": "2024-01-15T14:00:00Z",
  "deadline_category": "仅剩2天"
}`}
                </pre>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>task_title</strong>
                <p className="text-gray-600">任务标题 (字符串类型)</p>
                <code className="text-xs bg-gray-100 px-1 rounded">"task_title": "项目启动会议"</code>
              </div>
              <div>
                <strong>task_content</strong>
                <p className="text-gray-600">任务内容描述 (字符串类型)</p>
                <code className="text-xs bg-gray-100 px-1 rounded">"task_content": "组织团队讨论..."</code>
              </div>
              <div>
                <strong>deadline</strong>
                <p className="text-gray-600">任务截止时间 (字符串类型，ISO格式)</p>
                <code className="text-xs bg-gray-100 px-1 rounded">"deadline": "2024-01-15T14:00:00Z"</code>
              </div>
              <div>
                <strong>deadline_category</strong>
                <p className="text-gray-600">截止状态 (字符串类型)</p>
                <code className="text-xs bg-gray-100 px-1 rounded">"deadline_category": "仅剩2天"</code>
              </div>
            </div>

            {showExamplePayload && (
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">示例 JSON 数据</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(getFormattedExamplePayload())}
                    className="flex items-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span>复制</span>
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={getFormattedExamplePayload()}
                  rows={8}
                  className="font-mono text-sm bg-gray-50"
                />
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-md">
              <h4 className="font-medium text-green-900 mb-2">💡 飞书配置步骤</h4>
              <ol className="text-sm text-green-700 space-y-1">
                <li>1. 在飞书中创建自动化流程，选择"接收 Webhook 推送"作为触发条件</li>
                <li>2. 复制生成的 Webhook URL 到智时助手中</li>
                <li>3. <strong>将上方蓝色框中的 JSON 配置完整复制到飞书的"Webhook 推送的 JSON 数据格式"</strong></li>
                <li>4. 在智时助手中点击"发送测试消息"验证连接</li>
                <li>5. 在后续流程节点中使用 task_title、task_content、deadline、deadline_category 参数</li>
                <li>6. 启用后，任务截止提醒将自动发送到飞书流程</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FeishuWebhookSettings