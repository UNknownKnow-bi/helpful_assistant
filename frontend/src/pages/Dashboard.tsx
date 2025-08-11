import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { tasksApi } from '@/services/api'
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils'
import { Plus, Search, Calendar, User, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { Task, TaskCreate, TaskUpdate } from '@/types'

export default function Dashboard() {
  const [searchText, setSearchText] = useState('')
  const [newTaskText, setNewTaskText] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const queryClient = useQueryClient()

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', selectedStatus, selectedPriority],
    queryFn: () => tasksApi.getAll({
      status: selectedStatus || undefined,
      priority: selectedPriority || undefined,
    }),
  })

  // Generate task from text
  const generateTaskMutation = useMutation({
    mutationFn: (text: string) => tasksApi.generateFromText(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setNewTaskText('')
      alert('任务生成成功！')
    },
    onError: (error: any) => {
      console.error('Task generation failed:', error)
      alert('任务生成失败：' + (error.response?.data?.detail || '请稍后重试'))
    },
  })

  // Create manual task
  const createTaskMutation = useMutation({
    mutationFn: (task: TaskCreate) => tasksApi.create(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowManualForm(false)
      alert('任务创建成功！')
    },
    onError: (error: any) => {
      console.error('Task creation failed:', error)
      alert('任务创建失败：' + (error.response?.data?.detail || '请稍后重试'))
    },
  })

  // Update task
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, update }: { id: string; update: TaskUpdate }) => 
      tasksApi.update(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // Delete task
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleGenerateTask = () => {
    if (newTaskText.trim()) {
      generateTaskMutation.mutate(newTaskText.trim())
    }
  }

  const handleUpdateTaskStatus = (task: Task, newStatus: 'pending' | 'in_progress' | 'completed') => {
    updateTaskMutation.mutate({
      id: task.id,
      update: { status: newStatus }
    })
  }

  const handleDeleteTask = (id: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteTaskMutation.mutate(id)
    }
  }

  const filteredTasks = tasks.filter(task =>
    task.content.toLowerCase().includes(searchText.toLowerCase()) ||
    (task.assignee && task.assignee.toLowerCase().includes(searchText.toLowerCase()))
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />
      case 'in_progress':
        return <Clock className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return priority
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'in_progress': return '进行中'
      case 'pending': return '待处理'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">任务管理</h1>
        <Button onClick={() => setShowManualForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          手动添加任务
        </Button>
      </div>

      {/* AI Task Generation */}
      <Card>
        <CardHeader>
          <CardTitle>AI任务生成</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="描述您的任务，AI将帮您自动解析并创建任务卡片..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleGenerateTask}
              disabled={!newTaskText.trim() || generateTaskMutation.isPending}
            >
              {generateTaskMutation.isPending ? '生成中...' : '生成任务'}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            例如：明天下午2点前完成产品需求文档的初稿，分配给小王
          </p>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="搜索任务..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-64"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border border-input bg-background px-3 py-2 text-sm rounded-md"
        >
          <option value="">所有状态</option>
          <option value="pending">待处理</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
        </select>
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="border border-input bg-background px-3 py-2 text-sm rounded-md"
        >
          <option value="">所有优先级</option>
          <option value="high">高优先级</option>
          <option value="medium">中优先级</option>
          <option value="low">低优先级</option>
        </select>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">暂无任务</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Task Content */}
                  <p className="font-medium text-gray-900 line-clamp-2">
                    {task.content}
                  </p>

                  {/* Task Meta */}
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                      {getPriorityText(task.priority)}
                    </span>
                    <span className="text-gray-500">难度: {task.difficulty}/10</span>
                  </div>

                  {/* Task Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {task.assignee && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {task.assignee}
                      </div>
                    )}
                    {task.deadline && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(task.deadline)}
                      </div>
                    )}
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className={`flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1">{getStatusText(task.status)}</span>
                    </span>
                    <div className="flex space-x-1">
                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateTaskStatus(
                            task, 
                            task.status === 'pending' ? 'in_progress' : 'completed'
                          )}
                        >
                          {task.status === 'pending' ? '开始' : '完成'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Manual Task Form Modal */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>手动创建任务</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                createTaskMutation.mutate({
                  content: formData.get('content') as string,
                  assignee: formData.get('assignee') as string || undefined,
                  priority: (formData.get('priority') as 'low' | 'medium' | 'high') || 'medium',
                  difficulty: parseInt(formData.get('difficulty') as string) || 5,
                })
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">任务内容</label>
                  <Input name="content" required placeholder="输入任务描述..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">负责人</label>
                  <Input name="assignee" placeholder="可选" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">优先级</label>
                  <select name="priority" className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                    <option value="low">低</option>
                    <option value="medium" defaultChecked>中</option>
                    <option value="high">高</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">难度 (1-10)</label>
                  <Input name="difficulty" type="number" min="1" max="10" defaultValue="5" />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowManualForm(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? '创建中...' : '创建'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}