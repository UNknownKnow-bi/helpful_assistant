import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Calendar, Clock, Save, Edit3, Trash2 } from 'lucide-react'
import { calendarApi } from '@/services/api'
import type { CalendarEvent, CalendarEventUpdate } from '@/types'

interface CalendarEventDetailPopupProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
}

export default function CalendarEventDetailPopup({ 
  event, 
  isOpen, 
  onClose 
}: CalendarEventDetailPopupProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  
  const queryClient = useQueryClient()

  // Update local state when event changes
  useEffect(() => {
    if (event) {
      // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
      const formatForDateTimeLocal = (isoString: string) => {
        const date = new Date(isoString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      setStartTime(formatForDateTimeLocal(event.scheduled_start_time))
      setEndTime(formatForDateTimeLocal(event.scheduled_end_time))
    }
  }, [event])

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, updateData }: { eventId: number, updateData: CalendarEventUpdate }) =>
      calendarApi.updateEvent(eventId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setIsEditing(false)
      onClose()
    },
    onError: (error: any) => {
      alert(error.message || '更新事件失败')
    }
  })

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => calendarApi.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      onClose()
    },
    onError: (error: any) => {
      alert(error.message || '删除事件失败')
    }
  })

  const handleSave = () => {
    if (!event || !startTime || !endTime) return

    // Convert datetime-local format back to ISO string
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (endDate <= startDate) {
      alert('结束时间必须晚于开始时间')
      return
    }

    const updateData: CalendarEventUpdate = {
      scheduled_start_time: startDate.toISOString(),
      scheduled_end_time: endDate.toISOString()
    }

    updateEventMutation.mutate({ eventId: event.id, updateData })
  }

  const handleCancel = () => {
    if (event) {
      // Reset to original values
      const formatForDateTimeLocal = (isoString: string) => {
        const date = new Date(isoString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }
      
      setStartTime(formatForDateTimeLocal(event.scheduled_start_time))
      setEndTime(formatForDateTimeLocal(event.scheduled_end_time))
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (!event) return
    
    if (window.confirm('确定要删除这个日程事件吗？')) {
      deleteEventMutation.mutate(event.id)
    }
  }

  const formatDisplayTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const getPriorityLabel = (urgency?: string, importance?: string) => {
    if (urgency === 'high' && importance === 'high') {
      return { label: '高优先级', color: 'bg-red-100 text-red-700' }
    } else if (urgency === 'low' && importance === 'high') {
      return { label: '重要', color: 'bg-orange-100 text-orange-700' }
    } else if (urgency === 'high' && importance === 'low') {
      return { label: '紧急', color: 'bg-blue-100 text-blue-700' }
    } else {
      return { label: '低优先级', color: 'bg-gray-100 text-gray-700' }
    }
  }

  if (!isOpen || !event) return null

  const priority = getPriorityLabel(event.task?.urgency, event.task?.importance)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary-500" />
              <span>日程事件详情</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleteEventMutation.isPending}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="删除事件"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Task Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">任务信息</h3>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">任务标题</label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-md">
                    {event.task?.title || '未知任务'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700">任务内容</label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-md">
                    {event.task?.content || '无描述'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">优先级</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${priority.color}`}>
                        {priority.label}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700">难度等级</label>
                    <div className="mt-1 p-2 bg-slate-50 rounded-md text-sm">
                      {'★'.repeat(Math.min(event.task?.difficulty || 1, 10))} ({event.task?.difficulty || 1}/10)
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700">预估工时</label>
                  <div className="mt-1 p-2 bg-slate-50 rounded-md text-sm">
                    {event.task?.cost_time_hours || 0} 小时
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">时间安排</h3>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>编辑时间</span>
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      开始时间
                    </label>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      结束时间
                    </label>
                    <Input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateEventMutation.isPending}
                      className="bg-primary-500 hover:bg-primary-600 text-white flex items-center space-x-1"
                    >
                      <Save className="h-4 w-4" />
                      <span>{updateEventMutation.isPending ? '保存中...' : '保存'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={updateEventMutation.isPending}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">开始时间</label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-md flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span>{formatDisplayTime(event.scheduled_start_time)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700">结束时间</label>
                    <div className="mt-1 p-3 bg-slate-50 rounded-md flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span>{formatDisplayTime(event.scheduled_end_time)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Reasoning */}
            {event.ai_reasoning && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900">AI 排程分析</h3>
                <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                  {/* Show chunk information prominently if exists */}
                  {(() => {
                    const chunkMatch = event.ai_reasoning.match(/第(\d+)\/(\d+)[块部分]/)
                    if (chunkMatch) {
                      return (
                        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-amber-400 rounded-full flex-shrink-0"></div>
                            <span className="font-medium text-amber-800">
                              大任务分块：第 {chunkMatch[1]} 部分 / 共 {chunkMatch[2]} 部分
                            </span>
                          </div>
                          <p className="text-xs text-amber-700 mt-1">
                            这是一个大任务的其中一个时间块，其他部分可能分布在不同时间
                          </p>
                        </div>
                      )
                    }
                    return null
                  })()}
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {event.ai_reasoning}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}