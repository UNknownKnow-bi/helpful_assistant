import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { tasksApi } from '@/services/api'
import TaskPreviewPopup from '@/components/TaskPreviewPopup'
import type { Task, TaskPreview, TaskCreate } from '@/types'

interface TaskGenerationFormProps {
  onTaskGenerated?: (tasks: Task[]) => void
  onError?: (error: string) => void
}

const TaskGenerationForm: React.FC<TaskGenerationFormProps> = ({ 
  onTaskGenerated, 
  onError 
}) => {
  const [inputText, setInputText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [ocrMethod, setOcrMethod] = useState<string>('')
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text')
  const [imageStep, setImageStep] = useState<'upload' | 'preview' | 'confirmed'>('upload')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  
  // Task preview state
  const [showPreviewPopup, setShowPreviewPopup] = useState(false)
  const [previewTasks, setPreviewTasks] = useState<TaskPreview[]>([])
  const [previewMessage, setPreviewMessage] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle OCR text extraction from image
  const handleExtractText = async () => {
    if (!selectedFile) {
      onError?.('请选择一张图片')
      return
    }

    setIsExtracting(true)
    try {
      const result = await tasksApi.extractTextFromImage(selectedFile)
      
      if (result.success) {
        setExtractedText(result.extracted_text)
        setOcrMethod(result.ocr_method || 'Unknown OCR')
        setImageStep('preview')
      } else {
        onError?.(result.message)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'OCR文本提取失败，请重试'
      onError?.(errorMessage)
    } finally {
      setIsExtracting(false)
    }
  }

  // Handle task preview generation (Step 1: Generate preview)
  const handleGeneratePreview = async () => {
    if (inputMode === 'text') {
      if (!inputText.trim()) {
        onError?.('请输入任务描述')
        return
      }
    } else {
      if (imageStep !== 'preview' || !extractedText.trim()) {
        onError?.('请先提取并确认图片中的文字')
        return
      }
    }

    setIsGenerating(true)
    try {
      const textToProcess = inputMode === 'text' ? inputText.trim() : extractedText.trim()
      const response = await tasksApi.generatePreview(textToProcess)
      
      setPreviewTasks(response.tasks)
      setPreviewMessage(response.message)
      setShowPreviewPopup(true)
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '生成任务预览失败，请重试'
      onError?.(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle task confirmation (Step 2: Save to database)
  const handleConfirmTasks = async (tasksToCreate: TaskCreate[]) => {
    setIsConfirming(true)
    try {
      const savedTasks = await tasksApi.confirmTasks(tasksToCreate)
      
      onTaskGenerated?.(Array.isArray(savedTasks) ? savedTasks : [savedTasks])
      
      // Close popup and reset form
      setShowPreviewPopup(false)
      resetForm()
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '保存任务失败，请重试'
      onError?.(errorMessage)
    } finally {
      setIsConfirming(false)
    }
  }

  // Handle preview popup close
  const handlePreviewClose = () => {
    setShowPreviewPopup(false)
    setPreviewTasks([])
    setPreviewMessage('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        onError?.('图片大小不能超过10MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        onError?.('请选择图片文件')
        return
      }
      setSelectedFile(file)
      setImageStep('upload') // Reset to upload step
      setExtractedText('') // Clear previous extracted text
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        onError?.('图片大小不能超过10MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        onError?.('请选择图片文件')
        return
      }
      setSelectedFile(file)
      setInputMode('image')
      setImageStep('upload') // Reset to upload step
      setExtractedText('') // Clear previous extracted text
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const resetForm = () => {
    setInputText('')
    setSelectedFile(null)
    setExtractedText('')
    setInputMode('text')
    setImageStep('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleModeSwitch = (mode: 'text' | 'image') => {
    if (mode !== inputMode) {
      resetForm()
      setInputMode(mode)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleGeneratePreview()
    }
  }

  return (
    <div className="space-y-4">
          {/* Input Mode Toggle */}
          <div className="flex gap-2 p-1 bg-orange-50 rounded-lg">
            <Button
              variant={inputMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSwitch('text')}
              disabled={isGenerating || isExtracting || isConfirming}
              className={`flex-1 ${inputMode === 'text' ? 'bg-orange-200 text-orange-900 hover:bg-orange-300' : ''}`}
            >
              文字输入
            </Button>
            <Button
              variant={inputMode === 'image' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSwitch('image')}
              disabled={isGenerating || isExtracting || isConfirming}
              className={`flex-1 ${inputMode === 'image' ? 'bg-orange-200 text-orange-900 hover:bg-orange-300' : ''}`}
            >
              图片识别
            </Button>
          </div>

          {/* Text Input Mode */}
          {inputMode === 'text' && (
            <div className="space-y-2">
              <label htmlFor="task-input" className="text-sm font-medium">
                任务描述
              </label>
              <textarea
                id="task-input"
                placeholder="例如：明天下午3点前完成产品需求文档，负责人是张三，这个任务比较复杂..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating || isConfirming}
              />
              <p className="text-xs text-gray-500">
                提示：可以包含截止时间、负责人、优先级等信息。按 Ctrl/Cmd + Enter 快速生成
              </p>
            </div>
          )}

          {/* Image Input Mode */}
          {inputMode === 'image' && (
            <div className="space-y-4">
              {/* Step 1: Upload Image */}
              {imageStep === 'upload' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    步骤 1: 上传图片或拖拽到此处
                  </label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : selectedFile 
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isExtracting || isGenerating || isConfirming}
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="text-2xl">✅</div>
                        <p className="text-sm font-medium text-green-700">
                          已选择: {selectedFile.name}
                        </p>
                        <p className="text-xs text-green-600">
                          大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-3xl">📷</div>
                        <p className="text-sm font-medium">
                          点击选择图片或拖拽到此处
                        </p>
                        <p className="text-xs text-gray-500">
                          支持 PNG、JPG、JPEG 格式，最大 10MB
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {selectedFile && (
                    <div className="flex gap-2 mt-3">
                      <Button 
                        onClick={handleExtractText}
                        disabled={isExtracting || isGenerating || isConfirming}
                        className="flex-1"
                      >
                        {isExtracting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                            正在识别图片中的文字...
                          </>
                        ) : (
                          '🔍 识别图片文字'
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedFile(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                        disabled={isExtracting || isGenerating || isConfirming}
                      >
                        重选
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Preview Extracted Text */}
              {imageStep === 'preview' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    步骤 2: 确认识别出的文字内容
                  </label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-yellow-800">
                        📝 从图片中识别出的文字：
                      </p>
                      {ocrMethod && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {ocrMethod}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      rows={6}
                      className="w-full p-3 border border-yellow-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      disabled={isGenerating || isConfirming}
                      placeholder="识别出的文字将显示在这里，您可以编辑修改..."
                    />
                    <p className="text-xs text-yellow-700 mt-2">
                      ✅ 文字识别完成！请检查内容是否正确，可以手动编辑修改后再生成任务卡片。
                    </p>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={handleGeneratePreview}
                      disabled={isGenerating || !extractedText.trim()}
                      className="flex-1"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                          AI正在生成任务...
                        </>
                      ) : (
                        '✨ 生成任务预览'
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setImageStep('upload')
                        setExtractedText('')
                      }}
                      disabled={isGenerating || isConfirming}
                    >
                      重新上传
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Text mode buttons */}
          {inputMode === 'text' && (
            <div className="flex gap-2">
              <Button 
                onClick={handleGeneratePreview}
                disabled={isGenerating || !inputText.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    AI正在解析...
                  </>
                ) : (
                  '预览任务卡片'
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setInputText('')}
                disabled={isGenerating || isConfirming}
              >
                清空
              </Button>
            </div>
          )}
          
          {/* Universal reset button */}
          {(inputMode === 'image' && imageStep === 'upload' && !selectedFile) && (
            <div className="flex justify-end">
              <Button 
                variant="outline"
                onClick={resetForm}
                disabled={isExtracting || isGenerating}
                size="sm"
              >
                重置表单
              </Button>
            </div>
          )}
      {/* Task Preview Popup */}
      <TaskPreviewPopup
        isOpen={showPreviewPopup}
        tasks={previewTasks}
        message={previewMessage}
        onClose={handlePreviewClose}
        onConfirm={handleConfirmTasks}
        isConfirming={isConfirming}
      />
    </div>
  )
}

export default TaskGenerationForm