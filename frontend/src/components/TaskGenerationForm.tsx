import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { tasksApi } from '@/services/api'
import type { Task } from '@/types'

interface TaskGenerationFormProps {
  onTaskGenerated?: (tasks: Task[]) => void
  onError?: (error: string) => void
}

const TaskGenerationForm: React.FC<TaskGenerationFormProps> = ({ 
  onTaskGenerated, 
  onError 
}) => {
  const [inputText, setInputText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      onError?.('请输入任务描述')
      return
    }

    setIsGenerating(true)
    try {
      const tasks = await tasksApi.generateFromText(inputText.trim())
      onTaskGenerated?.(Array.isArray(tasks) ? tasks : [tasks])
      setInputText('')
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '生成任务失败，请重试'
      onError?.(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI 任务生成器</CardTitle>
        <p className="text-sm text-gray-600">
          输入中文描述，AI将自动解析并生成结构化任务卡片
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="task-input" className="text-sm font-medium">
              任务描述
            </label>
            <textarea
              id="task-input"
              placeholder="例如：明天下午3点前完成产品需求文档，负责人是张三，这个任务比较复杂..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500">
              提示：可以包含截止时间、负责人、优先级等信息。按 Ctrl/Cmd + Enter 快速生成
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !inputText.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  AI正在解析...
                </>
              ) : (
                '生成任务卡片'
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setInputText('')}
              disabled={isGenerating}
            >
              清空
            </Button>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">AI能识别的信息：</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 任务标题和详细描述</li>
              <li>• 截止时间（如"明天下午3点"、"本周五"、"12月15日"）</li>
              <li>• 提出人/分配人姓名</li>
              <li>• 紧迫性（是否有时间限制，需要立即关注）</li>
              <li>• 重要性（是否对长期目标有重要贡献）</li>
              <li>• 难度描述（"简单"、"复杂"、"困难"等）</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TaskGenerationForm