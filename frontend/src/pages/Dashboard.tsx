import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import TaskCard from '@/components/TaskCard'
import TaskGenerationForm from '@/components/TaskGenerationForm'
import { tasksApi } from '@/services/api'
import { Plus, Search, Sparkles, WandIcon as Wand2 } from 'lucide-react'
import type { Task, TaskCreate, TaskUpdate } from '@/types'

export default function Dashboard() {
  const [searchText, setSearchText] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [visibleTaskCounts, setVisibleTaskCounts] = useState<{
    urgent_important: number
    important_not_urgent: number
    urgent_not_important: number
    not_urgent_not_important: number
  }>({
    urgent_important: 2,
    important_not_urgent: 2,
    urgent_not_important: 2,
    not_urgent_not_important: 2
  })

  const [isScrolledToBottom, setIsScrolledToBottom] = useState<{
    urgent_important: boolean
    important_not_urgent: boolean
    urgent_not_important: boolean
    not_urgent_not_important: boolean
  }>({
    urgent_important: true,
    important_not_urgent: true,
    urgent_not_important: true,
    not_urgent_not_important: true
  })
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
      setShowEditForm(false)
      setEditingTask(null)
      alert('任务更新成功！')
    },
    onError: (error: any) => {
      console.error('Task update failed:', error)
      alert('任务更新失败：' + (error.response?.data?.detail || '请稍后重试'))
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

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowEditForm(true)
  }

  const handleEditSubmit = (formData: FormData) => {
    if (!editingTask) return
    
    const deadline = formData.get('deadline') as string
    const updateData: TaskUpdate = {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      deadline: deadline || undefined,
      assignee: (formData.get('assignee') as string) || undefined,
      participant: formData.get('participant') as string,
      urgency: formData.get('urgency') as 'low' | 'high',
      importance: formData.get('importance') as 'low' | 'high',
      difficulty: parseInt(formData.get('difficulty') as string)
    }
    
    updateTaskMutation.mutate({
      id: editingTask.id,
      update: updateData
    })
  }

  const filteredTasks = tasks.filter(task =>
    task.content.toLowerCase().includes(searchText.toLowerCase()) ||
    (task.assignee && task.assignee.toLowerCase().includes(searchText.toLowerCase()))
  )

  // Categorize tasks into Eisenhower Matrix quadrants
  const categorizedTasks = {
    urgent_important: filteredTasks.filter(t => t.urgency === 'high' && t.importance === 'high'),
    important_not_urgent: filteredTasks.filter(t => t.urgency === 'low' && t.importance === 'high'),
    urgent_not_important: filteredTasks.filter(t => t.urgency === 'high' && t.importance === 'low'),
    not_urgent_not_important: filteredTasks.filter(t => t.urgency === 'low' && t.importance === 'low'),
  }

  // Handle scroll to load more tasks
  const handleScroll = (quadrant: keyof typeof categorizedTasks, e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    // Check if scrolled to bottom (with small threshold)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5
    
    // Update bottom state for shadow visibility
    setIsScrolledToBottom(prev => ({
      ...prev,
      [quadrant]: isAtBottom
    }))
    
    // Load more tasks if at bottom
    if (isAtBottom) {
      const currentCount = visibleTaskCounts[quadrant]
      const totalTasks = categorizedTasks[quadrant].length
      
      // Load 5 more tasks if available
      if (currentCount < totalTasks) {
        setVisibleTaskCounts(prev => ({
          ...prev,
          [quadrant]: Math.min(currentCount + 5, totalTasks)
        }))
      }
    }
  }

  // Get display tasks for each quadrant (based on visible count)
  const getDisplayTasks = (quadrant: keyof typeof categorizedTasks) => {
    const tasks = categorizedTasks[quadrant]
    const visibleCount = visibleTaskCounts[quadrant]
    return tasks.slice(0, visibleCount)
  }

  // Check if there are more tasks to load
  const hasMoreTasks = (quadrant: keyof typeof categorizedTasks) => {
    const totalTasks = categorizedTasks[quadrant].length
    const visibleCount = visibleTaskCounts[quadrant]
    return visibleCount < totalTasks
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <header className="flex items-center space-x-4">
        <div className="relative w-72">
          <Search className="absolute w-5 h-5 top-1/2 left-3 -translate-y-1/2 text-neutral-500" />
          <Input
            type="text"
            placeholder="搜索任务..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-300 outline-none transition"
          />
        </div>
        <Button
          onClick={() => setShowManualForm(true)}
          className="flex items-center justify-center bg-primary-500 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          创建任务
        </Button>
      </header>

      {/* AI Task Generator */}
      <section>
        <div className="bg-white p-6 rounded-xl border border-neutral-200">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-primary-500" />
            <h3 className="text-lg font-semibold">AI 任务生成器</h3>
          </div>
          <p className="text-neutral-500 text-sm mt-1 mb-4">输入一段自然语言描述，AI 将自动为你解析并生成结构化的任务卡片。</p>
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
        </div>
      </section>

      {/* Eisenhower Matrix - Four Quadrants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quadrant 1: Urgent & Important */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 relative">
          <div className="flex items-center mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-3"></span>
            <h4 className="font-semibold text-lg">重要且紧急</h4>
            <span className="ml-auto text-sm font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {categorizedTasks.urgent_important.length}
            </span>
          </div>
          <div 
            className="space-y-4 max-h-96 overflow-y-auto scrollbar-hide"
            onScroll={(e) => handleScroll('urgent_important', e)}
          >
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-neutral-500">加载中...</p>
              </div>
            ) : categorizedTasks.urgent_important.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-neutral-500">暂无任务</p>
              </div>
            ) : (
              getDisplayTasks('urgent_important').map((task) => (
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
                  onEdit={handleEditTask}
                />
              ))
            )}
          </div>
          {/* Gradient shadow when more content is available */}
          {hasMoreTasks('urgent_important') && !isScrolledToBottom.urgent_important && (
            <div className="absolute bottom-5 left-5 right-5 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-xl"></div>
          )}
        </div>

        {/* Quadrant 2: Important, Not Urgent */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 relative">
          <div className="flex items-center mb-4">
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-3"></span>
            <h4 className="font-semibold text-lg">重要不紧急</h4>
            <span className="ml-auto text-sm font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {categorizedTasks.important_not_urgent.length}
            </span>
          </div>
          <div 
            className="space-y-4 max-h-96 overflow-y-auto scrollbar-hide"
            onScroll={(e) => handleScroll('important_not_urgent', e)}
          >
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-neutral-500">加载中...</p>
              </div>
            ) : categorizedTasks.important_not_urgent.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-neutral-500">暂无任务</p>
              </div>
            ) : (
              getDisplayTasks('important_not_urgent').map((task) => (
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
                  onEdit={handleEditTask}
                />
              ))
            )}
          </div>
          {/* Gradient shadow when more content is available */}
          {hasMoreTasks('important_not_urgent') && !isScrolledToBottom.important_not_urgent && (
            <div className="absolute bottom-5 left-5 right-5 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-xl"></div>
          )}
        </div>

        {/* Quadrant 3: Urgent, Not Important */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 relative">
          <div className="flex items-center mb-4">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-3"></span>
            <h4 className="font-semibold text-lg">紧急不重要</h4>
            <span className="ml-auto text-sm font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {categorizedTasks.urgent_not_important.length}
            </span>
          </div>
          <div 
            className="space-y-4 max-h-96 overflow-y-auto scrollbar-hide"
            onScroll={(e) => handleScroll('urgent_not_important', e)}
          >
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-neutral-500">加载中...</p>
              </div>
            ) : categorizedTasks.urgent_not_important.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-neutral-500">暂无任务</p>
              </div>
            ) : (
              getDisplayTasks('urgent_not_important').map((task) => (
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
                  onEdit={handleEditTask}
                />
              ))
            )}
          </div>
          {/* Gradient shadow when more content is available */}
          {hasMoreTasks('urgent_not_important') && !isScrolledToBottom.urgent_not_important && (
            <div className="absolute bottom-5 left-5 right-5 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-xl"></div>
          )}
        </div>

        {/* Quadrant 4: Not Urgent & Not Important */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 relative">
          <div className="flex items-center mb-4">
            <span className="w-3 h-3 rounded-full bg-gray-400 mr-3"></span>
            <h4 className="font-semibold text-lg">不重要不紧急</h4>
            <span className="ml-auto text-sm font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
              {categorizedTasks.not_urgent_not_important.length}
            </span>
          </div>
          <div 
            className="space-y-4 max-h-96 overflow-y-auto scrollbar-hide"
            onScroll={(e) => handleScroll('not_urgent_not_important', e)}
          >
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-neutral-500">加载中...</p>
              </div>
            ) : categorizedTasks.not_urgent_not_important.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-neutral-500">暂无任务</p>
              </div>
            ) : (
              getDisplayTasks('not_urgent_not_important').map((task) => (
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
                  onEdit={handleEditTask}
                />
              ))
            )}
          </div>
          {/* Gradient shadow when more content is available */}
          {hasMoreTasks('not_urgent_not_important') && !isScrolledToBottom.not_urgent_not_important && (
            <div className="absolute bottom-5 left-5 right-5 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-xl"></div>
          )}
        </div>
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

      {/* Edit Task Form Modal */}
      {showEditForm && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>编辑任务</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                handleEditSubmit(formData)
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">任务标题</label>
                  <Input name="title" required defaultValue={editingTask.title} placeholder="输入任务标题..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">任务内容</label>
                  <textarea 
                    name="content" 
                    required 
                    defaultValue={editingTask.content}
                    placeholder="输入任务描述..." 
                    className="w-full p-2 border border-input bg-background rounded-md text-sm resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">截止时间</label>
                  <Input 
                    name="deadline" 
                    type="datetime-local" 
                    defaultValue={editingTask.deadline ? new Date(editingTask.deadline).toISOString().slice(0, 16) : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">提出人</label>
                  <Input name="assignee" defaultValue={editingTask.assignee || ''} placeholder="可选" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">参与人</label>
                  <Input name="participant" defaultValue={editingTask.participant} placeholder="参与人" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">紧迫性</label>
                    <select name="urgency" defaultValue={editingTask.urgency} className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                      <option value="low">不紧急</option>
                      <option value="high">紧急</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">重要性</label>
                    <select name="importance" defaultValue={editingTask.importance} className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md">
                      <option value="low">不重要</option>
                      <option value="high">重要</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">难度 (1-10)</label>
                  <Input name="difficulty" type="number" min="1" max="10" defaultValue={editingTask.difficulty} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowEditForm(false)
                    setEditingTask(null)
                  }}>
                    取消
                  </Button>
                  <Button type="submit" disabled={updateTaskMutation.isPending}>
                    {updateTaskMutation.isPending ? '更新中...' : '更新'}
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