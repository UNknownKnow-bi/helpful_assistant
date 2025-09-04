import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import TaskProcedurePopup from '@/components/TaskProcedurePopup'
import type { Task } from '@/types'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (taskId: number) => void
  onStatusChange?: (taskId: number, status: Task['status']) => void
}

const urgencyColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  high: 'text-red-600 bg-red-50 border-red-200'
}

const importanceColors = {
  low: 'text-blue-600 bg-blue-50 border-blue-200',
  high: 'text-purple-600 bg-purple-50 border-purple-200'
}

const statusColors = {
  pending: 'text-gray-600 bg-gray-50 border-gray-200',
  in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
  completed: 'text-green-600 bg-green-50 border-green-200'
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
    <Card className="w-full max-w-md hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold leading-tight mb-2">
              {task.title}
            </CardTitle>
            <p className="text-sm text-gray-600 leading-relaxed">
              {task.content}
            </p>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${urgencyColors[task.urgency]}`}>
              {urgencyLabels[task.urgency]}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${importanceColors[task.importance]}`}>
              {importanceLabels[task.importance]}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[task.status]}`}>
              {statusLabels[task.status]}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3 text-sm text-gray-600">
          {task.deadline && (
            <div className="flex items-center gap-2">
              <span className="font-medium">截止时间:</span>
              <span className="text-gray-800">{formatDate(task.deadline)}</span>
            </div>
          )}
          
          {task.assignee && (
            <div className="flex items-center gap-2">
              <span className="font-medium">提出人:</span>
              <span className="text-gray-800">{task.assignee}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="font-medium">参与人:</span>
            <span className="text-gray-800">{task.participant}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-medium">难度:</span>
            <div className="flex items-center gap-1">
              {getDifficultyStars(task.difficulty)}
              <span className="ml-1 text-gray-800">({task.difficulty}/10)</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">来源:</span>
            <span>
              {task.source === 'manual' 
                ? '手动创建' 
                : task.source === 'ai_generated' 
                ? 'AI生成' 
                : '浏览器扩展'}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleStatusChange}
          className="flex-1"
        >
          {task.status === 'completed' ? '重新开始' : '下一步'}
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowProcedurePopup(true)}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100"
        >
          执行指导
        </Button>
        
        {onEdit && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(task)}
          >
            编辑
          </Button>
        )}
        
        {onDelete && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDelete(task.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            删除
          </Button>
        )}
      </CardFooter>

      {/* Task Procedure Popup */}
      <TaskProcedurePopup 
        task={task}
        isOpen={showProcedurePopup}
        onClose={() => setShowProcedurePopup(false)}
      />
    </Card>
  )
}

export default TaskCard