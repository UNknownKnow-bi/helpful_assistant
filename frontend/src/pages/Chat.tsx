import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { chatApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { Send, Plus, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { formatDate } from '@/lib/utils'
import type { ChatSession, ChatMessage } from '@/types'

export default function Chat() {
  const [currentSession, setCurrentSession] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  // Fetch chat sessions
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: chatApi.getSessions,
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

  // Fetch messages for current session
  const { data: sessionMessages = [] } = useQuery({
    queryKey: ['chat-messages', currentSession],
    queryFn: () => currentSession ? chatApi.getMessages(currentSession) : Promise.resolve([]),
    enabled: !!currentSession,
  })

  useEffect(() => {
    if (sessionMessages.length > 0) {
      setMessages(sessionMessages)
    }
  }, [sessionMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      
      if (data.type === 'content') {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.id === 'streaming') {
            // Update streaming message
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: lastMessage.content + (data.content || ''),
                thinking: data.thinking ? 
                  (lastMessage.thinking || '') + data.thinking : 
                  lastMessage.thinking
              }
            ]
          } else {
            // Create new streaming message
            return [
              ...prev,
              {
                id: 'streaming',
                role: 'assistant',
                content: data.content || '',
                thinking: data.thinking || null,
                timestamp: new Date().toISOString()
              } as ChatMessage
            ]
          }
        })
      } else if (data.type === 'done') {
        // Finalize the streaming message
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.id === 'streaming') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                id: Date.now().toString(), // Replace with actual ID if available
              }
            ]
          }
          return prev
        })
      } else if (data.type === 'error') {
        console.error('Chat error:', data.content)
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

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    
    // Send message via WebSocket
    wsRef.current.send(JSON.stringify({
      message: newMessage.trim(),
      user_id: user.id
    }))
    
    setNewMessage('')
  }

  const handleNewSession = () => {
    createSessionMutation.mutate()
  }

  const handleSessionSelect = (sessionId: number) => {
    setCurrentSession(sessionId)
    setMessages([])
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
              >
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(session.updated_at)}</p>
                  </div>
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
                    {message.role === 'assistant' && message.thinking && (
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
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="输入您的问题..."
                  disabled={!isConnected}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim() || !isConnected}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              {!isConnected && currentSession && (
                <p className="text-sm text-orange-600 mt-2">正在连接...</p>
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
    </div>
  )
}