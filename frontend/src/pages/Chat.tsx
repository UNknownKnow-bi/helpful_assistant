import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { chatApi, aiProvidersApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { Send, Plus, MessageSquare, ChevronDown, ChevronRight, Trash2, Edit3, MoreVertical, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { formatDate } from '@/lib/utils'
import type { ChatSession, ChatMessage, AIProvider } from '@/types'

export default function Chat() {
  const [currentSession, setCurrentSession] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const [renamingSession, setRenamingSession] = useState<number | null>(null)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [showContextMenu, setShowContextMenu] = useState<{ sessionId: number; x: number; y: number } | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  // Fetch chat sessions
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: chatApi.getSessions,
  })

  // Fetch available text models
  const { data: textModels = [] } = useQuery({
    queryKey: ['text-models'],
    queryFn: aiProvidersApi.getTextModels,
  })

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (session) => {
      setCurrentSession(session.id)
      setMessages([])
      refetchSessions()
    },
  })

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: chatApi.deleteSession,
    onSuccess: (_, deletedSessionId) => {
      refetchSessions()
      // If deleted session was current, clear it
      if (currentSession === deletedSessionId) {
        const remainingSessions = sessions.filter(s => s.id !== deletedSessionId)
        if (remainingSessions.length > 0) {
          setCurrentSession(remainingSessions[0].id)
        } else {
          setCurrentSession(null)
          setMessages([])
        }
      }
    },
  })

  // Generate title mutation
  const generateTitleMutation = useMutation({
    mutationFn: ({ sessionId, firstMessage }: { sessionId: number; firstMessage: string }) => 
      chatApi.generateTitle(sessionId, firstMessage),
    onSuccess: () => {
      refetchSessions()
    },
  })

  // Rename session mutation
  const renameSessionMutation = useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: number; title: string }) => 
      chatApi.renameSession(sessionId, title),
    onSuccess: () => {
      refetchSessions()
      setRenamingSession(null)
      setNewSessionTitle('')
    },
  })

  // Stop chat stream mutation
  const stopStreamMutation = useMutation({
    mutationFn: (sessionId: number) => chatApi.stopChatStream(sessionId),
    onSuccess: () => {
      console.log('Stop stream request successful')
      setIsStreaming(false)
      // Update the last streaming message to interrupted status
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.streaming_status === 'streaming') {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              streaming_status: 'interrupted'
            }
          ]
        }
        return prev
      })
    },
    onError: (error) => {
      console.error('Stop stream request failed:', error)
      // Still set streaming to false on error
      setIsStreaming(false)
    },
  })

  // Fetch messages for current session
  const { data: sessionMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', currentSession],
    queryFn: () => currentSession ? chatApi.getMessages(currentSession) : Promise.resolve([]),
    enabled: !!currentSession,
  })
  
  // Check session status when connecting
  const { data: sessionStatus } = useQuery({
    queryKey: ['chat-session-status', currentSession],
    queryFn: () => currentSession ? chatApi.getSessionStatus(currentSession) : Promise.resolve(null),
    enabled: !!currentSession,
    refetchInterval: 2000, // Check every 2 seconds for background updates
  })

  useEffect(() => {
    if (sessionMessages.length > 0) {
      setMessages(sessionMessages)
      // Check if this session has messages (not first message)
      setIsFirstMessage(sessionMessages.filter(m => m.role === 'user').length === 0)
    } else {
      setIsFirstMessage(true)
    }
  }, [sessionMessages])
  
  // Handle session status changes (background task completion)
  useEffect(() => {
    if (sessionStatus && currentSession) {
      // If there was a streaming task that completed, refresh messages
      if (sessionStatus.has_streaming === false && sessionStatus.has_interrupted === false) {
        // Task completed in background, refresh to get latest data
        refetchMessages()
      }
    }
  }, [sessionStatus, currentSession, refetchMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(null)
    }
    
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showContextMenu])

  // WebSocket connection
  useEffect(() => {
    console.log('WebSocket useEffect triggered:', { currentSession, user: !!user })
    if (!currentSession || !user) {
      console.log('WebSocket connection skipped - missing session or user')
      return
    }

    const wsUrl = `ws://localhost:8000/api/chat/ws/${currentSession}`
    console.log('Creating WebSocket connection to:', wsUrl)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected successfully')
      setIsConnected(true)
    }

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      setIsConnected(false)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket received:', data)
      
      if (data.type === 'streaming_interrupted') {
        // Handle interrupted streaming message recovery
        console.log('Recovered interrupted streaming message:', data.message_id)
        setMessages(prev => {
          // Check if this message already exists in the UI
          const existingIndex = prev.findIndex(msg => msg.id === data.message_id)
          if (existingIndex >= 0) {
            // Update existing message with recovered content
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              content: data.content || '',
              thinking: data.thinking || null,
              streaming_status: 'interrupted'
            }
            return updated
          } else {
            // Add recovered message to the UI
            return [
              ...prev,
              {
                id: data.message_id,
                role: 'assistant',
                content: data.content || '',
                thinking: data.thinking || null,
                timestamp: new Date().toISOString(),
                streaming_status: 'interrupted'
              } as ChatMessage
            ]
          }
        })
      } else if (data.type === 'streaming_resumed') {
        // Handle resumed streaming message (ongoing background task)
        console.log('Resumed ongoing streaming message:', data.message_id)
        setMessages(prev => {
          // Check if this message already exists in the UI
          const existingIndex = prev.findIndex(msg => msg.id === data.message_id)
          if (existingIndex >= 0) {
            // Update existing message with current content
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              content: data.content || '',
              thinking: data.thinking || null,
              streaming_status: 'streaming'
            }
            return updated
          } else {
            // Add ongoing message to the UI
            return [
              ...prev,
              {
                id: data.message_id,
                role: 'assistant',
                content: data.content || '',
                thinking: data.thinking || null,
                timestamp: new Date().toISOString(),
                streaming_status: 'streaming'
              } as ChatMessage
            ]
          }
        })
      } else if (data.type === 'streaming_start') {
        // Start a new streaming message
        console.log('Starting new streaming message:', data.message_id)
        setIsStreaming(true)
        setMessages(prev => [
          ...prev,
          {
            id: data.message_id,
            role: 'assistant',
            content: '',
            thinking: null,
            timestamp: new Date().toISOString(),
            streaming_status: 'streaming'
          } as ChatMessage
        ])
      } else if (data.type === 'content') {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.streaming_status === 'streaming') {
            // Update streaming message
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: lastMessage.content + (data.content || ''),
                thinking: data.thinking ? 
                  (lastMessage.thinking || '') + data.thinking : 
                  lastMessage.thinking || null
              }
            ]
          }
          return prev
        })
      } else if (data.type === 'done') {
        // Finalize the streaming message
        setIsStreaming(false)
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.streaming_status === 'streaming') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                streaming_status: 'completed'
              }
            ]
          }
          return prev
        })
      } else if (data.type === 'stopped') {
        // Handle manual stop by user
        console.log('Chat stream stopped by user')
        setIsStreaming(false)
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.streaming_status === 'streaming') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                streaming_status: 'interrupted'
              }
            ]
          }
          return prev
        })
      } else if (data.type === 'error') {
        console.error('Chat error:', data.content)
        setIsStreaming(false)
        // Mark any streaming message as interrupted on error
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.streaming_status === 'streaming') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                streaming_status: 'interrupted'
              }
            ]
          }
          return prev
        })
        alert('聊天出错：' + data.content)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error occurred:', error)
      console.error('WebSocket state:', ws.readyState)
      console.error('WebSocket URL:', wsUrl)
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [currentSession, user])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !currentSession || !wsRef.current || !user) return

    const messageContent = newMessage.trim()
    
    // Add user message to UI
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    
    // Generate title if this is the first user message
    if (isFirstMessage) {
      generateTitleMutation.mutate({ 
        sessionId: currentSession, 
        firstMessage: messageContent 
      })
      setIsFirstMessage(false)
    }
    
    // Send message via WebSocket
    wsRef.current.send(JSON.stringify({
      message: messageContent,
      user_id: user.id,
      model_id: selectedModelId
    }))
    
    setNewMessage('')
  }

  const handleNewSession = () => {
    createSessionMutation.mutate()
  }

  const handleStopStream = () => {
    console.log('Stop button clicked', { currentSession, isStreaming })
    if (currentSession && isStreaming) {
      console.log('Calling stop API for session:', currentSession)
      stopStreamMutation.mutate(currentSession)
    } else {
      console.log('Cannot stop - no current session or not streaming')
    }
  }

  const handleSessionSelect = (sessionId: number) => {
    setCurrentSession(sessionId)
    setMessages([])
    setIsFirstMessage(true) // Reset first message flag when switching sessions
  }

  const handleDeleteSession = (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent session selection when clicking delete
    
    if (confirm('确定要删除这个对话吗？此操作不可撤销。')) {
      deleteSessionMutation.mutate(sessionId)
    }
  }

  const toggleThinking = (messageId: string) => {
    setExpandedThinking(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const handleRightClick = (sessionId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowContextMenu({
      sessionId,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleRename = (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setRenamingSession(sessionId)
      setNewSessionTitle(session.title)
    }
    setShowContextMenu(null)
  }

  const handleRenameSubmit = () => {
    if (renamingSession && newSessionTitle.trim()) {
      renameSessionMutation.mutate({
        sessionId: renamingSession,
        title: newSessionTitle.trim()
      })
    }
  }

  const handleRenameCancel = () => {
    setRenamingSession(null)
    setNewSessionTitle('')
  }

  return (
    <div className="h-[calc(100vh-88px)] flex">
      {/* Sessions Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={handleNewSession} className="w-full" disabled={createSessionMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            新对话
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                  currentSession === session.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => handleSessionSelect(session.id)}
                onContextMenu={(e) => handleRightClick(session.id, e)}
              >
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    {renamingSession === session.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(); }} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={newSessionTitle}
                          onChange={(e) => setNewSessionTitle(e.target.value)}
                          className="h-6 text-sm py-0"
                          autoFocus
                          onBlur={handleRenameCancel}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') handleRenameCancel()
                          }}
                        />
                      </form>
                    ) : (
                      <>
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(session.updated_at)}</p>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-6 h-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    disabled={deleteSessionMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border shadow-sm'
                    }`}
                  >
                    {/* Thinking Section */}
                    {message.role === 'assistant' && message.thinking && message.thinking.trim() && (
                      <div className="mb-3">
                        <button
                          onClick={() => toggleThinking(message.id)}
                          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
                        >
                          {expandedThinking.has(message.id) ? (
                            <ChevronDown className="w-4 h-4 mr-1" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mr-1" />
                          )}
                          思考过程
                        </button>
                        {expandedThinking.has(message.id) && (
                          <div className="bg-gray-100 rounded p-2 text-sm text-gray-600">
                            <ReactMarkdown>{message.thinking}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={message.role === 'user' ? 'text-white' : 'text-gray-900'}>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          code: ({ children, className }) => {
                            const isInline = !className
                            return isInline ? (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                                {children}
                              </code>
                            ) : (
                              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                                <code>{children}</code>
                              </pre>
                            )
                          }
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                      
                      {/* Streaming Status Indicator */}
                      {message.role === 'assistant' && message.streaming_status === 'streaming' && (
                        <div className="mt-2 flex items-center text-sm text-blue-500">
                          <div className="animate-pulse flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                            <span>正在回复中...</span>
                          </div>
                        </div>
                      )}
                      
                      {message.role === 'assistant' && message.streaming_status === 'interrupted' && (
                        <div className="mt-2 flex items-center text-sm text-orange-500">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                          <span>响应已中断</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatDate(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
              {/* Model Selection */}
              {textModels.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">选择AI模型</label>
                  <select
                    value={selectedModelId || ''}
                    onChange={(e) => setSelectedModelId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">使用默认模型</option>
                    {textModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.config.model})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isStreaming ? "AI正在回复中..." : "输入您的问题..."}
                  disabled={!isConnected || isStreaming}
                  className="flex-1"
                />
                {isStreaming ? (
                  <Button 
                    type="button" 
                    onClick={handleStopStream}
                    disabled={stopStreamMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={!newMessage.trim() || !isConnected}>
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </form>
              {!isConnected && currentSession && (
                <p className="text-sm text-orange-600 mt-2">正在连接...</p>
              )}
              {isStreaming && (
                <p className="text-sm text-blue-600 mt-2">AI正在回复中，点击停止按钮可中断响应</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg mb-2">欢迎使用AI问答</p>
              <p className="text-sm">选择已有对话或创建新对话开始聊天</p>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
          style={{
            left: showContextMenu.x,
            top: showContextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
            onClick={() => handleRename(showContextMenu.sessionId)}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            重命名
          </button>
        </div>
      )}
    </div>
  )
}