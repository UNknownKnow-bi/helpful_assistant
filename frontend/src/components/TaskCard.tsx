import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import TaskProcedurePopup from '@/components/TaskProcedurePopup'
import type { Task } from '@/types'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PlayCircle, Edit3, Trash2 } from 'lucide-react'

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
  pending: 'text-gray-600 bg-gray-100 text-gray-700',
  in_progress: 'text-blue-600 bg-blue-100 text-blue-700',
  completed: 'text-primary-600 bg-primary-100 text-primary-700'
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
  pending: '待办',
  in_progress: '进行中',
  completed: '已完成'
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange 
}) => {
  const [showProcedurePopup, setShowProcedurePopup] = useState(false)
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
    
    const statusOrder: Task['status'][] = ['pending', 'in_progress', 'completed']
    const currentIndex = statusOrder.indexOf(task.status)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
    onStatusChange(task.id, nextStatus)
  }

  return (
    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] transition-all">
      <h5 className="font-semibold mb-1">{task.title}</h5>
      <p className="text-sm text-neutral-600 mb-3">{task.content}</p>
      
      {/* Task metadata */}
      <div className="space-y-2 text-xs text-neutral-500 mb-3">
        {task.deadline && (
          <p>截止时间: <span className="text-neutral-900">{formatDate(task.deadline)}</span></p>
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
            title={task.status === 'completed' ? '重新开始' : '下一步'}
          >
            <span className="text-sm">{task.status === 'completed' ? '↻' : '→'}</span>
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