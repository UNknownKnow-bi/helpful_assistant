import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { tasksApi } from '@/services/api'
import type { Task, ExecutionProcedure, SocialAdvice } from '@/types'

interface TaskProcedurePopupProps {
  task: Task
  isOpen: boolean
  onClose: () => void
}

const TaskProcedurePopup: React.FC<TaskProcedurePopupProps> = ({ 
  task, 
  isOpen, 
  onClose 
}) => {
  const [procedures, setProcedures] = useState<ExecutionProcedure[]>([])
  const [socialAdvice, setSocialAdvice] = useState<SocialAdvice[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'procedures' | 'social'>('procedures')

  // Fetch execution procedures when popup opens
  useEffect(() => {
    if (isOpen && task.id) {
      fetchProcedures()
      fetchSocialAdvice()
    }
  }, [isOpen, task.id])

  const fetchProcedures = async () => {
    setLoading(true)
    try {
      const data = await tasksApi.getExecutionProcedures(task.id)
      setProcedures(data.execution_procedures || [])
    } catch (error) {
      console.error('Failed to fetch procedures:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSocialAdvice = async () => {
    try {
      const data = await tasksApi.getSocialAdvice(task.id)
      setSocialAdvice(data.social_advice || [])
    } catch (error) {
      console.error('Failed to fetch social advice:', error)
    }
  }

  const generateSocialAdvice = async () => {
    if (procedures.length === 0) {
      alert('需要先有执行步骤才能生成社会化建议')
      return
    }

    setGenerating(true)
    try {
      const data = await tasksApi.generateSocialAdvice(task.id)
      setSocialAdvice(data.social_advice || [])
      setActiveTab('social')
    } catch (error: any) {
      console.error('Failed to generate social advice:', error)
      const errorMessage = error?.response?.data?.detail || '生成社会化建议失败，请稍后重试'
      alert(`生成失败: ${errorMessage}`)
    } finally {
      setGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {task.title}
              </h2>
              <p className="text-sm text-gray-600">
                {task.content}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose}
              className="shrink-0"
            >
              关闭
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('procedures')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'procedures'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              执行步骤 ({procedures.length})
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'social'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              社会化建议 ({socialAdvice.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'procedures' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  加载执行步骤中...
                </div>
              ) : procedures.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无执行步骤
                </div>
              ) : (
                <div className="space-y-4">
                  {procedures.map((procedure) => (
                    <Card key={procedure.procedure_number} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-medium text-blue-700">
                          步骤 {procedure.procedure_number}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">执行内容:</h4>
                            <p className="text-gray-700 leading-relaxed">
                              {procedure.procedure_content}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">关键结果:</h4>
                            <p className="text-gray-700 leading-relaxed">
                              {procedure.key_result}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'social' && (
            <div>
              {/* Generate Button */}
              {socialAdvice.length === 0 && procedures.length > 0 && (
                <div className="text-center py-6">
                  <Button 
                    onClick={generateSocialAdvice}
                    disabled={generating}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {generating ? '生成中...' : '生成社会化建议'}
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    基于执行步骤和同事性格分析生成社交沟通建议
                  </p>
                </div>
              )}

              {socialAdvice.length === 0 && procedures.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  需要先有执行步骤才能生成社会化建议
                </div>
              )}

              {socialAdvice.length > 0 && (
                <div className="space-y-4">
                  {socialAdvice.map((advice) => (
                    <Card key={advice.procedure_number} className="border-l-4 border-l-purple-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-medium text-purple-700">
                          步骤 {advice.procedure_number}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">执行内容:</h4>
                            <p className="text-gray-700 leading-relaxed">
                              {advice.procedure_content}
                            </p>
                          </div>
                          {advice.social_advice && advice.social_advice !== 'null' && (
                            <div>
                              <h4 className="font-medium text-purple-700 mb-1">💡 社会化建议:</h4>
                              <div className="bg-purple-50 p-3 rounded-md">
                                <div className="text-gray-800 leading-relaxed markdown-content">
                                  <ReactMarkdown 
                                    components={{
                                      h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-purple-800">{children}</h1>,
                                      h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-purple-700">{children}</h2>,
                                      h3: ({children}) => <h3 className="text-sm font-medium mb-1 text-purple-600">{children}</h3>,
                                      p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                      strong: ({children}) => <strong className="font-semibold text-purple-800">{children}</strong>,
                                      em: ({children}) => <em className="italic text-purple-700">{children}</em>,
                                      ul: ({children}) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                                      ol: ({children}) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                                      li: ({children}) => <li className="text-sm">{children}</li>,
                                      code: ({children}) => <code className="bg-purple-100 px-1 py-0.5 rounded text-xs text-purple-900">{children}</code>
                                    }}
                                  >
                                    {advice.social_advice}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          )}
                          {(!advice.social_advice || advice.social_advice === 'null') && (
                            <div className="text-sm text-gray-500 italic">
                              此步骤无特殊社交建议
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <Button onClick={onClose} variant="outline">
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TaskProcedurePopup