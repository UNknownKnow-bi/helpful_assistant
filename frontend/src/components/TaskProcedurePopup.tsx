import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { tasksApi } from '@/services/api'
import type { Task, ExecutionProcedure, SocialAdvice, ProcedureMemorandum } from '@/types'
import { Edit3, Trash2, Save, X, ChevronDown, ChevronUp, StickyNote, FileText } from 'lucide-react'

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
  const [regeneratingProcedures, setRegeneratingProcedures] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editKeyResult, setEditKeyResult] = useState('')
  const [foldedProcedures, setFoldedProcedures] = useState<Set<number>>(new Set())
  const [memorandums, setMemorandums] = useState<Map<number, ProcedureMemorandum>>(new Map())
  const [hoveredProcedure, setHoveredProcedure] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })

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
      const fetchedProcedures = data.execution_procedures || []
      setProcedures(fetchedProcedures)
      
      // Auto-fold completed procedures when loading
      const completedProcedureNumbers = fetchedProcedures
        .filter(procedure => procedure.completed)
        .map(procedure => procedure.procedure_number)
      
      if (completedProcedureNumbers.length > 0) {
        setFoldedProcedures(prev => {
          const newSet = new Set(prev)
          completedProcedureNumbers.forEach(num => newSet.add(num))
          return newSet
        })
      }
      
      // Fetch memorandums after procedures are loaded
      if (fetchedProcedures.length > 0) {
        await fetchMemorandumsForProcedures(fetchedProcedures)
      }
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
    } catch (error: any) {
      console.error('Failed to generate social advice:', error)
      const errorMessage = error?.response?.data?.detail || '生成社会化建议失败，请稍后重试'
      alert(`生成失败: ${errorMessage}`)
    } finally {
      setGenerating(false)
    }
  }

  const regenerateExecutionProcedures = async () => {
    if (!confirm('确定要重新生成执行步骤吗？现有的执行步骤将被替换。')) {
      return
    }

    setRegeneratingProcedures(true)
    try {
      const data = await tasksApi.regenerateExecutionProcedures(task.id)
      setProcedures(data.execution_procedures || [])
      // Clear social advice since procedures changed
      setSocialAdvice([])
      alert('执行步骤已重新生成')
    } catch (error: any) {
      console.error('Failed to regenerate execution procedures:', error)
      const errorMessage = error?.response?.data?.detail || '重新生成执行步骤失败，请稍后重试'
      alert(`生成失败: ${errorMessage}`)
    } finally {
      setRegeneratingProcedures(false)
    }
  }

  // Handle procedure completion toggle
  const handleCompletionToggle = async (procedureNumber: number, currentCompleted: boolean) => {
    try {
      await tasksApi.updateExecutionProcedure(task.id, procedureNumber, {
        completed: !currentCompleted
      })
      
      // Update local state
      setProcedures(prev => prev.map(p => 
        p.procedure_number === procedureNumber 
          ? { ...p, completed: !currentCompleted }
          : p
      ))
      
      // Auto-fold when marked as completed, unfold when marked as incomplete
      if (!currentCompleted) {
        // Just completed, so fold it
        setFoldedProcedures(prev => new Set(prev).add(procedureNumber))
      } else {
        // Just marked as incomplete, so unfold it
        setFoldedProcedures(prev => {
          const newSet = new Set(prev)
          newSet.delete(procedureNumber)
          return newSet
        })
      }
    } catch (error) {
      console.error('Failed to update procedure completion:', error)
      alert('更新完成状态失败')
    }
  }

  // Start editing a procedure
  const startEditing = (procedure: ExecutionProcedure) => {
    setEditingProcedure(procedure.procedure_number)
    setEditContent(procedure.procedure_content)
    setEditKeyResult(procedure.key_result)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingProcedure(null)
    setEditContent('')
    setEditKeyResult('')
  }

  // Save edited procedure
  const saveEditing = async () => {
    if (!editingProcedure) return

    try {
      await tasksApi.updateExecutionProcedure(task.id, editingProcedure, {
        procedure_content: editContent,
        key_result: editKeyResult
      })
      
      // Update local state
      setProcedures(prev => prev.map(p => 
        p.procedure_number === editingProcedure 
          ? { ...p, procedure_content: editContent, key_result: editKeyResult }
          : p
      ))
      
      cancelEditing()
    } catch (error) {
      console.error('Failed to update procedure:', error)
      alert('保存失败')
    }
  }

  // Delete a procedure
  const deleteProcedure = async (procedureNumber: number) => {
    if (!confirm('确定要删除这个步骤吗？')) return

    try {
      await tasksApi.deleteExecutionProcedure(task.id, procedureNumber)
      
      // Refresh procedures to get updated numbering
      await fetchProcedures()
    } catch (error) {
      console.error('Failed to delete procedure:', error)
      alert('删除失败')
    }
  }

  // Toggle fold/expand for a procedure
  const toggleFold = (procedureNumber: number) => {
    setFoldedProcedures(prev => {
      const newSet = new Set(prev)
      if (newSet.has(procedureNumber)) {
        newSet.delete(procedureNumber)
      } else {
        newSet.add(procedureNumber)
      }
      return newSet
    })
  }

  // Fetch all memorandums for given procedures
  const fetchMemorandumsForProcedures = async (procedureList: ExecutionProcedure[]) => {
    if (!procedureList.length) return
    
    const memorandumMap = new Map<number, ProcedureMemorandum>()
    
    for (const procedure of procedureList) {
      try {
        const memorandum = await tasksApi.getProcedureMemorandum(task.id, procedure.procedure_number)
        memorandumMap.set(procedure.procedure_number, memorandum)
      } catch (error) {
        // Memorandum doesn't exist, which is fine
      }
    }
    
    setMemorandums(memorandumMap)
  }

  // Handle procedure step hover
  const handleProcedureHover = (procedureNumber: number, event: React.MouseEvent) => {
    setHoveredProcedure(procedureNumber)
    const rect = event.currentTarget.getBoundingClientRect()
    
    // Calculate position with screen boundary checks
    let x = rect.right + 15 // Position to the right of the card with some spacing
    let y = rect.top + 20   // Position slightly below the top of the card
    
    // Check if the hover box would go off-screen (assuming 320px width for the box)
    if (x + 320 > window.innerWidth) {
      x = rect.left - 335 // Position to the left instead with spacing
    }
    
    // Ensure the box doesn't go above the viewport
    if (y < 50) {
      y = 50
    }
    
    // Ensure the box doesn't go below the viewport (assuming 220px height for the box)
    if (y + 220 > window.innerHeight) {
      y = window.innerHeight - 240
    }
    
    setHoverPosition({ x, y })
  }

  // Delete memorandum
  const deleteMemorandum = async (procedureNumber: number) => {
    if (!confirm('确定要删除这个备忘录吗？')) return
    
    try {
      await tasksApi.deleteProcedureMemorandum(task.id, procedureNumber)
      setMemorandums(prev => {
        const newMap = new Map(prev)
        newMap.delete(procedureNumber)
        return newMap
      })
      // Close the hover box after deletion
      setHoveredProcedure(null)
    } catch (error) {
      console.error('Failed to delete memorandum:', error)
      alert('删除备忘录失败')
    }
  }

  // Auto-save memorandum when leaving hover box
  const handleMemorandumAutoSave = async (procedureNumber: number, text: string) => {
    if (!text.trim()) {
      // If empty, delete existing memorandum
      if (memorandums.has(procedureNumber)) {
        try {
          await tasksApi.deleteProcedureMemorandum(task.id, procedureNumber)
          setMemorandums(prev => {
            const newMap = new Map(prev)
            newMap.delete(procedureNumber)
            return newMap
          })
        } catch (error) {
          console.error('Failed to delete memorandum:', error)
        }
      }
    } else {
      // Save or update memorandum
      try {
        const memorandum = await tasksApi.createProcedureMemorandum(task.id, procedureNumber, text)
        setMemorandums(prev => new Map(prev).set(procedureNumber, memorandum))
      } catch (error) {
        console.error('Failed to auto-save memorandum:', error)
      }
    }
  }

  // Hover box component
  const HoverMemorandumBox = ({ procedureNumber }: { procedureNumber: number }) => {
    const memorandum = memorandums.get(procedureNumber)
    const [currentText, setCurrentText] = React.useState(memorandum?.memorandum_text || '')
    const [hasChanged, setHasChanged] = React.useState(false)
    const saveTimeoutRef = React.useRef<NodeJS.Timeout>()

    // Initialize text when memorandum changes
    React.useEffect(() => {
      setCurrentText(memorandum?.memorandum_text || '')
      setHasChanged(false)
    }, [memorandum?.memorandum_text])

    if (!hoveredProcedure || hoveredProcedure !== procedureNumber) return null

    const handleTextChange = (newText: string) => {
      setCurrentText(newText)
      const existingText = memorandum?.memorandum_text || ''
      setHasChanged(newText.trim() !== existingText)
    }

    const handleMouseLeave = () => {
      // Auto-save before closing if text has changed
      if (hasChanged) {
        const textToSave = currentText.trim()
        handleMemorandumAutoSave(procedureNumber, textToSave)
      }
      
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      setHoveredProcedure(null)
    }

    return (
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80"
        style={{
          left: hoverPosition.x,
          top: hoverPosition.y,
          transform: hoverPosition.y > window.innerHeight / 2 ? 'translateY(-100%)' : 'translateY(0%)'
        }}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => {
          // Keep the box open when mouse enters it
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
          }
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <StickyNote className="w-4 h-4 text-yellow-600" />
            <h4 className="font-medium text-sm text-gray-900">步骤 {procedureNumber} 备忘录</h4>
          </div>
          {memorandum && (
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteMemorandum(procedureNumber)}
                className="text-red-600 hover:text-red-700 p-1 h-6 w-6"
                title="删除备忘录"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Always show textarea for immediate editing */}
        <div className="space-y-3">
          <textarea
            value={currentText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50"
            rows={4}
            placeholder="在此记录备忘录..."
            autoFocus
          />
          <div className="text-xs text-gray-500 text-center">
            {memorandum ? (
              <>更新于: {new Date(memorandum.updated_at).toLocaleString()}</>
            ) : (
              <>输入内容，移出鼠标自动保存</>
            )}
          </div>
        </div>
      </div>
    )
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

        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Regenerate Controls */}
          {procedures.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">完整任务指导</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    包含执行步骤、关键结果和社会化建议的完整指导方案
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button 
                    onClick={regenerateExecutionProcedures}
                    disabled={regeneratingProcedures}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {regeneratingProcedures ? '重新生成中...' : '重新生成执行步骤'}
                  </Button>
                  <Button 
                    onClick={generateSocialAdvice}
                    disabled={generating}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {generating ? '生成中...' : socialAdvice.length > 0 ? '重新生成社会化建议' : '生成社会化建议'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              加载完整指导中...
            </div>
          ) : procedures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无执行指导
            </div>
          ) : (
            <div className="space-y-4">
              {procedures.map((procedure) => {
                // Find corresponding social advice for this procedure
                const correspondingSocialAdvice = socialAdvice.find(
                  advice => advice.procedure_number === procedure.procedure_number
                )
                
                const isEditing = editingProcedure === procedure.procedure_number
                const isCompleted = procedure.completed || false
                const isFolded = foldedProcedures.has(procedure.procedure_number)
                
                return (
                  <Card 
                    key={procedure.procedure_number} 
                    className={`border-l-4 ${isCompleted ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500'} transition-colors cursor-pointer hover:shadow-md`}
                    onMouseEnter={(e) => handleProcedureHover(procedure.procedure_number, e)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Completion Checkbox */}
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleCompletionToggle(procedure.procedure_number, isCompleted)}
                            className="w-5 h-5 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                          />
                          <div className="flex items-center space-x-2">
                            <CardTitle 
                              className={`text-lg font-medium px-2 py-1 rounded transition-colors relative ${isCompleted ? 'text-green-700 line-through' : 'text-blue-700'}`}
                            >
                              步骤 {procedure.procedure_number}
                            </CardTitle>
                          </div>
                          {isCompleted && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">已完成</span>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          {/* Fold/Expand Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleFold(procedure.procedure_number)}
                            className="text-gray-600 hover:text-gray-700"
                            title={isFolded ? '展开' : '收起'}
                          >
                            {isFolded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </Button>
                          
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={saveEditing}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                className="text-gray-600 hover:text-gray-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(procedure)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteProcedure(procedure.procedure_number)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {!isFolded && (
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">执行内容:</h4>
                            {isEditing ? (
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                rows={3}
                              />
                            ) : (
                              <p className={`text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md ${isCompleted ? 'opacity-70' : ''}`}>
                                {procedure.procedure_content}
                              </p>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">关键结果:</h4>
                            {isEditing ? (
                              <textarea
                                value={editKeyResult}
                                onChange={(e) => setEditKeyResult(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                rows={2}
                              />
                            ) : (
                              <p className={`text-gray-700 leading-relaxed bg-blue-50 p-3 rounded-md ${isCompleted ? 'opacity-70' : ''}`}>
                                {procedure.key_result}
                              </p>
                            )}
                          </div>
                          {correspondingSocialAdvice && correspondingSocialAdvice.social_advice && correspondingSocialAdvice.social_advice !== 'null' ? (
                            <div>
                              <h4 className="font-medium text-purple-700 mb-2">社会化建议:</h4>
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
                                    {correspondingSocialAdvice.social_advice}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-medium text-gray-500 mb-2">社会化建议:</h4>
                              <div className="bg-gray-100 p-3 rounded-md">
                                <p className="text-sm text-gray-500 italic">
                                  {socialAdvice.length === 0 ? '点击上方按钮生成社会化建议' : '此步骤无特殊社交建议'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
              
              {/* Render hover boxes for all procedures */}
              {procedures.map((procedure) => (
                <HoverMemorandumBox key={`hover-${procedure.procedure_number}`} procedureNumber={procedure.procedure_number} />
              ))}
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