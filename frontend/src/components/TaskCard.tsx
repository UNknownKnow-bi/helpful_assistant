import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import TaskProcedurePopup from '@/components/TaskProcedurePopup'
import type { Task } from '@/types'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PlayCircle, Edit3, Trash2, Check } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (taskId: number) => void
  onStatusChange?: (taskId: number, status: Task['status']) => void
}

const urgencyColors = {
  low: 'text-green-600 bg-green-100 text-green-700',
  high: 'text-red-600 bg-red-100 text-red-700'
}

const importanceColors = {
  low: 'text-blue-600 bg-blue-100 text-blue-700',
  high: 'text-purple-600 bg-purple-100 text-purple-700'
}

const statusColors = {
  undo: 'text-gray-600 bg-gray-100 text-gray-700',
  done: 'text-green-600 bg-green-100 text-green-700'
}

const deadlineCategoryColors = {
  '进行中': 'text-blue-600 bg-blue-100',
  '完成': 'text-green-600 bg-green-100',
  '已过期': 'text-red-600 bg-red-100',
  '仅剩': 'text-orange-600 bg-orange-100'  // For "仅剩X天" or "仅剩X小时"
}

const urgencyLabels = {
  low: '不紧急',
  high: '紧急'
}

const importanceLabels = {
  low: '不重要',
  high: '重要'
}

const statusLabels = {
  undo: '待办',
  done: '已完成'
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange 
}) => {
  const [showProcedurePopup, setShowProcedurePopup] = useState(false)
  const [currentDeadlineCategory, setCurrentDeadlineCategory] = useState(task.deadline_category || '')

  // Real-time countdown calculation
  const calculateDeadlineCategory = (deadline?: string, status?: string): string => {
    if (status === 'done') {
      return '完成'
    }
    
    if (!deadline) {
      return '进行中'  // No deadline, assume in progress
    }
    
    try {
      // Parse deadline to datetime
      const deadlineDate = new Date(deadline)
      const now = new Date()
      
      // Calculate time difference
      const timeDiff = deadlineDate.getTime() - now.getTime()
      const totalHours = timeDiff / (1000 * 60 * 60)
      
      if (totalHours < 0) {
        return '已过期'
      } else if (totalHours <= 24) {
        const hours = Math.max(1, Math.floor(totalHours))
        return `仅剩${hours}小时`
      } else if (totalHours <= 120) {  // 5 days = 120 hours
        const days = Math.max(1, Math.floor(totalHours / 24))
        return `仅剩${days}天`
      } else {
        return '进行中'
      }
    } catch {
      return '进行中'  // Default to in progress if parsing fails
    }
  }

  // Update deadline category every minute
  useEffect(() => {
    const updateCategory = () => {
      const newCategory = calculateDeadlineCategory(task.deadline, task.status)
      setCurrentDeadlineCategory(newCategory)
    }

    // Update immediately
    updateCategory()
    
    // Update every minute (60000ms)
    const interval = setInterval(updateCategory, 60000)
    
    return () => clearInterval(interval)
  }, [task.deadline, task.status])
  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      return format(new Date(dateString), 'MM月dd日 HH:mm', { locale: zhCN })
    } catch {
      return dateString
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

  const handleStatusChange = () => {
    if (!onStatusChange) return
    
    // Simple toggle between undo and done
    const nextStatus = task.status === 'undo' ? 'done' : 'undo'
    onStatusChange(task.id, nextStatus)
  }

  const getDeadlineCategoryColor = (category: string) => {
    if (category.includes('仅剩')) {
      return deadlineCategoryColors['仅剩']
    }
    return deadlineCategoryColors[category as keyof typeof deadlineCategoryColors] || deadlineCategoryColors['进行中']
  }

  return (
    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] transition-all">
      <h5 className="font-semibold mb-1">{task.title}</h5>
      <p className="text-sm text-neutral-600 mb-3">{task.content}</p>
      
      {/* Task metadata */}
      <div className="space-y-2 text-xs text-neutral-500 mb-3">
        {task.deadline && (
          <div className="flex items-center gap-2">
            <span>截止:</span>
            <span className="text-neutral-900">{formatDate(task.deadline)}</span>
            {currentDeadlineCategory && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDeadlineCategoryColor(currentDeadlineCategory)}`}>
                {currentDeadlineCategory}
              </span>
            )}
          </div>
        )}
        {task.assignee && (
          <p>提出人: <span className="text-neutral-900">{task.assignee}</span></p>
        )}
        {task.participant && (
          <p>参与人: <span className="text-neutral-900">{task.participant}</span></p>
        )}
        <div className="flex items-center gap-2">
          <span>难度:</span>
          <div className="flex items-center">
            {getDifficultyStars(task.difficulty)}
            <span className="ml-1 text-neutral-900">({task.difficulty}/10)</span>
          </div>
        </div>
        {task.cost_time_hours && (
          <div className="flex items-center gap-2">
            <span>预估时间:</span>
            <span className="text-neutral-900">{task.cost_time_hours}小时</span>
          </div>
        )}
      </div>
      
      {/* Tags and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
            {statusLabels[task.status]}
          </span>
          {task.urgency === 'high' && task.importance === 'high' && (
            <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">高优先级</span>
          )}
          {task.urgency === 'low' && task.importance === 'high' && (
            <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">重要</span>
          )}
          {task.urgency === 'high' && task.importance === 'low' && (
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">紧急</span>
          )}
          {task.urgency === 'low' && task.importance === 'low' && (
            <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">低优先级</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button 
            className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
            onClick={() => setShowProcedurePopup(true)}
            title="执行指导"
          >
            <PlayCircle className="w-4 h-4" />
          </button>
          {onEdit && (
            <button 
              className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
              onClick={() => onEdit(task)}
              title="编辑"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button 
              className="p-1.5 rounded-md hover:bg-neutral-200 text-red-500"
              onClick={() => onDelete(task.id)}
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button 
            className="p-1.5 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
            onClick={handleStatusChange}
            title={task.status === 'done' ? '标记为待办' : '标记为完成'}
          >
            {task.status === 'done' ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <span className="text-sm">→</span>
            )}
          </button>
        </div>
      </div>

      
      {/* Task Procedure Popup */}
      <TaskProcedurePopup 
        task={task}
        isOpen={showProcedurePopup}
        onClose={() => setShowProcedurePopup(false)}
      />
    </div>
  )
}

export default TaskCard