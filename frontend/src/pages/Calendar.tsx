import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Calendar as CalendarIcon, Clock, Users, Target, Wand2, RefreshCw } from 'lucide-react'
import { calendarApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import CalendarEventDetailPopup from '@/components/CalendarEventDetailPopup'
import type { Task, CalendarEvent, TaskScheduleRequest, CalendarEventUpdate, CalendarSettings } from '@/types'

// FullCalendar imports
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, DateSelectArg, EventClickArg, EventDropArg, EventResizeArg } from '@fullcalendar/core'

export default function Calendar() {
  const { isAuthenticated } = useAuthStore()
  
  const [dateRangeStart, setDateRangeStart] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  
  const [dateRangeEnd, setDateRangeEnd] = useState(() => {
    const oneWeekLater = new Date()
    oneWeekLater.setDate(oneWeekLater.getDate() + 7)
    return oneWeekLater.toISOString().split('T')[0]
  })
  
  const [workHoursStart, setWorkHoursStart] = useState('09:00')
  const [workHoursEnd, setWorkHoursEnd] = useState('18:00')
  const [breakDuration, setBreakDuration] = useState(15)
  const [includeWeekends, setIncludeWeekends] = useState(false)
  
  // Event detail popup state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false)
  
  const queryClient = useQueryClient()

  // Fetch calendar settings
  const { data: settings } = useQuery({
    queryKey: ['calendar-settings'],
    queryFn: calendarApi.getSettings,
    enabled: isAuthenticated,
  })

  // Update state when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setWorkHoursStart(settings.work_hours_start)
      setWorkHoursEnd(settings.work_hours_end)
      setBreakDuration(settings.break_duration_minutes)
      setIncludeWeekends(settings.include_weekends)
    }
  }, [settings])

  // Fetch calendar events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['calendar-events', dateRangeStart, dateRangeEnd],
    queryFn: () => calendarApi.getEvents(
      new Date(dateRangeStart).toISOString(),
      new Date(dateRangeEnd).toISOString()
    ),
    enabled: isAuthenticated, // Only fetch when authenticated
  })

  // AI task scheduling mutation
  const scheduleTasksMutation = useMutation({
    mutationFn: calendarApi.scheduleTasksWithAI,
    onSuccess: (data) => {
      alert(`成功为 ${data.events.length} 个任务生成智能时间安排`)
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    onError: (error: any) => {
      alert(error.message || '智能排程失败')
    }
  })

  // Clear events mutation
  const clearEventsMutation = useMutation({
    mutationFn: () => calendarApi.clearEvents(
      new Date(dateRangeStart).toISOString(),
      new Date(dateRangeEnd).toISOString()
    ),
    onSuccess: () => {
      alert('日程已清空')
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    onError: (error: any) => {
      alert(error.message || '清空日程失败')
    }
  })

  // Settings update mutation (silent)
  const updateSettingsMutation = useMutation({
    mutationFn: calendarApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-settings'] })
    },
    onError: (error: any) => {
      console.error('Settings update failed:', error)
    }
  })

  // Debounced settings update function
  const updateSettingsDebounced = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout
      return (settingsUpdate: Partial<CalendarSettings>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          updateSettingsMutation.mutate(settingsUpdate)
        }, 500) // 500ms debounce
      }
    }, [updateSettingsMutation]),
    [updateSettingsMutation]
  )

  const handleScheduleTasks = () => {
    // Get current timezone and time information
    const now = new Date()
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    const request: TaskScheduleRequest = {
      date_range_start: new Date(dateRangeStart).toISOString(),
      date_range_end: new Date(dateRangeEnd).toISOString(),
      work_hours_start: workHoursStart,
      work_hours_end: workHoursEnd,
      break_duration_minutes: breakDuration,
      include_weekends: includeWeekends,
      current_timezone: timezone,
      current_time: now.toISOString()
    }
    
    scheduleTasksMutation.mutate(request)
  }

  const getPriorityColor = useCallback((urgency?: string, importance?: string) => {
    if (urgency === 'high' && importance === 'high') {
      return '#ef4444' // red-500 - 高紧急性 + 高重要性
    } else if (urgency === 'low' && importance === 'high') {
      return '#fb923c' // orange-400 - 低紧急性 + 高重要性
    } else if (urgency === 'high' && importance === 'low') {
      return '#3b82f6' // blue-500 - 高紧急性 + 低重要性
    } else {
      return '#9ca3af' // gray-400 - 低紧急性 + 低重要性
    }
  }, [])

  const getTextColor = useCallback(() => {
    // Use black text for better readability on transparent background
    return '#000000'
  }, [])

  const truncateTitle = useCallback((title: string, maxLength: number = 12) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength)
  }, [])

  // Convert calendar events to FullCalendar format
  const calendarEvents: EventInput[] = useMemo(() => {
    return events.map((event: CalendarEvent) => {
      const priorityColor = getPriorityColor(event.task?.urgency, event.task?.importance)
      return {
        id: event.id.toString(),
        title: event.task?.title || '任务',
        start: event.scheduled_start_time,
        end: event.scheduled_end_time,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: getTextColor(),
        classNames: ['custom-event-transparent'],
        extendedProps: {
          task: event.task,
          aiReasoning: event.ai_reasoning,
          eventId: event.id,
          priorityColor: priorityColor
        }
      }
    })
  }, [events, getPriorityColor, getTextColor])

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = parseInt(clickInfo.event.id)
    const calendarEvent = events.find(e => e.id === eventId)
    
    if (calendarEvent) {
      setSelectedEvent(calendarEvent)
      setIsEventPopupOpen(true)
    }
  }

  // Handle date selection (for future drag & drop functionality)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // Future: Allow creating/moving events
    console.log('Date selected:', selectInfo)
  }

  // Handle event drop (drag and drop)
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const eventId = parseInt(dropInfo.event.id)
    const newStart = dropInfo.event.start
    const newEnd = dropInfo.event.end
    
    if (!newStart || !newEnd) {
      dropInfo.revert()
      return
    }
    
    try {
      // Call API to update the event
      const updateData: CalendarEventUpdate = {
        scheduled_start_time: newStart.toISOString(),
        scheduled_end_time: newEnd.toISOString()
      }
      await calendarApi.updateEvent(eventId, updateData)
      
      // Refresh events
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    } catch (error) {
      console.error('Failed to update event:', error)
      dropInfo.revert()
      alert('更新事件失败，请重试')
    }
  }

  // Handle event resize
  const handleEventResize = async (resizeInfo: EventResizeArg) => {
    const eventId = parseInt(resizeInfo.event.id)
    const newStart = resizeInfo.event.start
    const newEnd = resizeInfo.event.end
    
    if (!newStart || !newEnd) {
      resizeInfo.revert()
      return
    }
    
    try {
      // Call API to update the event
      const updateData: CalendarEventUpdate = {
        scheduled_start_time: newStart.toISOString(),
        scheduled_end_time: newEnd.toISOString()
      }
      await calendarApi.updateEvent(eventId, updateData)
      
      // Refresh events
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    } catch (error) {
      console.error('Failed to resize event:', error)
      resizeInfo.revert()
      alert('调整事件大小失败，请重试')
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-8 w-8 text-primary-500" />
          <h1 className="text-3xl font-bold text-slate-900">智能日程安排</h1>
        </div>
      </div>

      {/* Scheduling Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>排程设置</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">开始日期</label>
              <Input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">结束日期</label>
              <Input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">工作开始时间</label>
              <Input
                type="time"
                value={workHoursStart}
                onChange={(e) => {
                  const newValue = e.target.value
                  setWorkHoursStart(newValue)
                  updateSettingsDebounced({ work_hours_start: newValue })
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">工作结束时间</label>
              <Input
                type="time"
                value={workHoursEnd}
                onChange={(e) => {
                  const newValue = e.target.value
                  setWorkHoursEnd(newValue)
                  updateSettingsDebounced({ work_hours_end: newValue })
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">任务间休息时间 (分钟)</label>
              <Input
                type="number"
                min="5"
                max="60"
                value={breakDuration}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value) || 15
                  setBreakDuration(newValue)
                  updateSettingsDebounced({ break_duration_minutes: newValue })
                }}
              />
            </div>
            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id="includeWeekends"
                checked={includeWeekends}
                onChange={(e) => {
                  const newValue = e.target.checked
                  setIncludeWeekends(newValue)
                  updateSettingsDebounced({ include_weekends: newValue })
                }}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="includeWeekends" className="text-sm font-medium text-slate-700">
                包含周末
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleScheduleTasks}
              disabled={scheduleTasksMutation.isPending}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {scheduleTasksMutation.isPending ? '生成中...' : 'AI智能排程'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => clearEventsMutation.mutate()}
              disabled={clearEventsMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {clearEventsMutation.isPending ? '清空中...' : '清空日程'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FullCalendar Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>日程安排</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-slate-500 mt-2">加载日程中...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">暂无日程安排</p>
              <p className="text-slate-400 text-sm">点击"AI智能排程"为您的待办任务生成时间安排</p>
            </div>
          ) : (
            <div className="fullcalendar-container">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                buttonText={{
                  today: '今天',
                  month: '月',
                  week: '周',
                  day: '日'
                }}
                initialView='timeGridWeek'
                locale='zh-cn'
                events={calendarEvents}
                eventClick={handleEventClick}
                selectable={true}
                selectMirror={true}
                select={handleDateSelect}
                editable={true}
                droppable={true}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                dayMaxEvents={true}
                weekends={true}
                height="auto"
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                allDaySlot={false}
                eventContent={(eventInfo) => {
                  const task = eventInfo.event.extendedProps.task as Task
                  const priorityColor = eventInfo.event.extendedProps.priorityColor as string
                  const aiReasoning = eventInfo.event.extendedProps.aiReasoning as string
                  const title = eventInfo.event.title
                  
                  // Extract chunk information from AI reasoning (supports both 块 and 部分)
                  const chunkMatch = aiReasoning?.match(/第(\d+)\/(\d+)[块部分]/)
                  const chunkInfo = chunkMatch ? `${chunkMatch[1]}/${chunkMatch[2]}` : null
                  
                  const truncatedTitle = truncateTitle(title, chunkInfo ? 8 : 12)
                  
                  return (
                    <div className="flex items-start text-xs p-1">
                      <div 
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: priorityColor }}
                      />
                      <div className="ml-2 font-medium text-black leading-tight">
                        <div>{truncatedTitle}</div>
                        {chunkInfo && (
                          <div className="text-xs text-gray-600 font-normal">
                            第{chunkInfo}部分
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Event Detail Popup */}
      <CalendarEventDetailPopup
        event={selectedEvent}
        isOpen={isEventPopupOpen}
        onClose={() => {
          setIsEventPopupOpen(false)
          setSelectedEvent(null)
        }}
      />
    </div>
  )
}