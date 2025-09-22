import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { TaskPreview, TaskCreate } from '@/types'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TaskPreviewPopupProps {
  isOpen: boolean
  tasks: TaskPreview[]
  message: string
  onClose: () => void
  onConfirm: (tasks: TaskCreate[]) => void
  isConfirming?: boolean
}

const urgencyColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  high: 'text-red-600 bg-red-50 border-red-200'
}

const importanceColors = {
  low: 'text-blue-600 bg-blue-50 border-blue-200',
  high: 'text-purple-600 bg-purple-50 border-purple-200'
}

const urgencyLabels = {
  low: '不紧急',
  high: '紧急'
}

const importanceLabels = {
  low: '不重要',
  high: '重要'
}

const TaskPreviewPopup: React.FC<TaskPreviewPopupProps> = ({
  isOpen,
  tasks,
  message,
  onClose,
  onConfirm,
  isConfirming = false
}) => {
  const [editableTasks, setEditableTasks] = useState<TaskPreview[]>([])

  useEffect(() => {
    if (isOpen && tasks.length > 0) {
      setEditableTasks(tasks.map(task => ({ ...task })))
    }
  }, [isOpen, tasks])

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm')
    } catch {
      return dateString || ''
    }
  }

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 10 }, (_, i) => (
      <span 
        key={i} 
        className={`text-sm ${i < difficulty ? 'text-orange-400' : 'text-gray-300'}`}
      >
        ★
      </span>
    ))
  }

  const handleTaskChange = (index: number, field: keyof TaskPreview, value: any) => {
    const updatedTasks = [...editableTasks]
    updatedTasks[index] = { ...updatedTasks[index], [field]: value }
    setEditableTasks(updatedTasks)
  }

  const handleDateChange = (index: number, value: string) => {
    if (!value) {
      handleTaskChange(index, 'deadline', undefined)
      return
    }
    
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        handleTaskChange(index, 'deadline', undefined)
        return
      }
      handleTaskChange(index, 'deadline', date.toISOString())
    } catch {
      handleTaskChange(index, 'deadline', undefined)
    }
  }

  const handleConfirm = () => {
    const tasksToCreate: TaskCreate[] = editableTasks.map(task => ({
      title: task.title,
      content: task.content,
      deadline: task.deadline,
      assignee: task.assignee,
      participant: task.participant,
      urgency: task.urgency,
      importance: task.importance,
      difficulty: task.difficulty,
      cost_time_hours: task.cost_time_hours
    }))
    onConfirm(tasksToCreate)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">任务预览确认</h2>
              <p className="text-sm text-gray-600 mt-1">{message}</p>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConfirming}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {editableTasks.map((task, index) => (
              <Card key={index} className="border-2 border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-blue-900">
                      任务 {index + 1}
                    </CardTitle>
                    <div className="flex gap-2">
                      <select
                        value={task.urgency}
                        onChange={(e) => handleTaskChange(index, 'urgency', e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${urgencyColors[task.urgency]}`}
                        disabled={isConfirming}
                      >
                        <option value="low">不紧急</option>
                        <option value="high">紧急</option>
                      </select>
                      <select
                        value={task.importance}
                        onChange={(e) => handleTaskChange(index, 'importance', e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${importanceColors[task.importance]}`}
                        disabled={isConfirming}
                      >
                        <option value="low">不重要</option>
                        <option value="high">重要</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Task Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      任务标题
                    </label>
                    <Input
                      value={task.title}
                      onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                      disabled={isConfirming}
                      placeholder="任务标题..."
                      className="font-medium"
                    />
                  </div>

                  {/* Task Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      任务详情
                    </label>
                    <textarea
                      value={task.content}
                      onChange={(e) => handleTaskChange(index, 'content', e.target.value)}
                      disabled={isConfirming}
                      placeholder="任务详细描述..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Two column layout for remaining fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Deadline */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        截止时间
                      </label>
                      <input
                        type="datetime-local"
                        value={task.deadline ? formatDate(task.deadline).replace(' ', 'T').slice(0, 16) : ''}
                        onChange={(e) => handleDateChange(index, e.target.value)}
                        disabled={isConfirming}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        提出人
                      </label>
                      <Input
                        value={task.assignee || ''}
                        onChange={(e) => handleTaskChange(index, 'assignee', e.target.value || undefined)}
                        disabled={isConfirming}
                        placeholder="谁提出的这个任务..."
                      />
                    </div>

                    {/* Participant */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        参与人
                      </label>
                      <Input
                        value={task.participant}
                        onChange={(e) => handleTaskChange(index, 'participant', e.target.value)}
                        disabled={isConfirming}
                        placeholder="谁来执行这个任务..."
                      />
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        难度 ({task.difficulty}/10)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={task.difficulty}
                          onChange={(e) => handleTaskChange(index, 'difficulty', parseInt(e.target.value))}
                          disabled={isConfirming}
                          className="flex-1"
                        />
                        <div className="flex items-center">
                          {getDifficultyStars(task.difficulty)}
                        </div>
                      </div>
                    </div>

                    {/* Cost Time Hours */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        预估时间
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={task.cost_time_hours}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '') {
                              handleTaskChange(index, 'cost_time_hours', 0.1)
                            } else {
                              const parsed = parseFloat(value)
                              if (!isNaN(parsed) && parsed > 0) {
                                handleTaskChange(index, 'cost_time_hours', parsed)
                              }
                            }
                          }}
                          disabled={isConfirming}
                          className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <span className="text-sm text-gray-600">小时</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConfirming}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isConfirming || editableTasks.some(task => !task.title.trim() || !task.content.trim())}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  保存中...
                </>
              ) : (
                <>确认并保存 {editableTasks.length} 个任务</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskPreviewPopup