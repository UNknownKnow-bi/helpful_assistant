import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import NotificationSettings from '@/components/NotificationSettings'
import FeishuWebhookSettings from '@/components/FeishuWebhookSettings'
import { useNotifications } from '@/hooks/useNotifications'
import { useFeishuWebhook } from '@/hooks/useFeishuWebhook'
import { Settings as SettingsIcon, Bell, User, Shield, MessageSquare } from 'lucide-react'

export default function Settings() {
  const { isEnabled: notificationsEnabled } = useNotifications()
  const { isEnabled: webhookEnabled } = useFeishuWebhook()

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center space-x-3 mb-8">
        <SettingsIcon className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-600 mt-1">管理应用偏好设置和通知配置</p>
        </div>
      </header>

      {/* Settings Grid */}
      <div className="grid gap-6">
        {/* Notification Settings Section */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Bell className={`w-5 h-5 ${notificationsEnabled ? 'text-green-600' : 'text-gray-500'}`} />
              <span>截止日期提醒</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                notificationsEnabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {notificationsEnabled ? '已启用' : '未启用'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>

        {/* Feishu Webhook Settings Section */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <MessageSquare className={`w-5 h-5 ${webhookEnabled ? 'text-green-600' : 'text-gray-500'}`} />
              <span>飞书 Webhook 通知</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                webhookEnabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {webhookEnabled ? '已启用' : '未启用'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FeishuWebhookSettings />
          </CardContent>
        </Card>

        {/* Future Settings Sections */}
        <Card className="border-l-4 border-l-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-500" />
              <span>用户偏好</span>
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                即将推出
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">
              用户界面主题、语言设置、默认视图等个性化配置
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-gray-500" />
              <span>隐私与安全</span>
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                即将推出
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">
              数据导出、隐私设置、安全选项等配置
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}