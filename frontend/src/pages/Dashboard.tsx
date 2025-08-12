import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import TaskCard from '@/components/TaskCard'
import TaskGenerationForm from '@/components/TaskGenerationForm'
import { tasksApi } from '@/services/api'
import { Plus, Search } from 'lucide-react'
import type { Task, TaskCreate, TaskUpdate } from '@/types'

export default function Dashboard() {
  const [searchText, setSearchText] = useState('')
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
    mutationFn: ({ id, update }: { id: number; update: TaskUpdate }) => 
      tasksApi.update(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // Delete task
  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })


  const handleDeleteTask = (id: number) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteTaskMutation.mutate(id)
    }
  }

  const filteredTasks = tasks.filter(task =>
    task.content.toLowerCase().includes(searchText.toLowerCase()) ||
    (task.assignee && task.assignee.toLowerCase().includes(searchText.toLowerCase()))
  )


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
      <TaskGenerationForm 
        onTaskGenerated={(tasks) => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          const count = Array.isArray(tasks) ? tasks.length : 1
          alert(`成功生成${count}个任务！`)
        }}
        onError={(error) => {
          alert('任务生成失败：' + error)
        }}
      />

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
            <TaskCard 
              key={task.id}
              task={task}
              onStatusChange={(taskId, status) => {
                updateTaskMutation.mutate({
                  id: taskId,
                  update: { status }
                })
              }}
              onDelete={handleDeleteTask}
              onEdit={(task) => {
                // TODO: Implement edit functionality
                console.log('Edit task:', task)
              }}
            />
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