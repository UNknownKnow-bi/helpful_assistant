import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { tasksApi } from '@/services/api'
import type { Task } from '@/types'

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
  const [dragOver, setDragOver] = useState(false)
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

  // Handle final task generation
  const handleGenerate = async () => {
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
      let tasks: Task[]
      if (inputMode === 'text') {
        tasks = await tasksApi.generateFromText(inputText.trim())
      } else {
        // Use extracted text for AI task generation
        tasks = await tasksApi.generateFromText(extractedText.trim())
      }
      
      onTaskGenerated?.(Array.isArray(tasks) ? tasks : [tasks])
      
      // Reset form
      resetForm()
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '生成任务失败，请重试'
      onError?.(errorMessage)
    } finally {
      setIsGenerating(false)
    }
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
      handleGenerate()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI 任务生成器</CardTitle>
        <p className="text-sm text-gray-600">
          输入文字描述或上传图片，AI将自动解析并生成结构化任务卡片
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Input Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <Button
              variant={inputMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSwitch('text')}
              disabled={isGenerating || isExtracting}
              className="flex-1"
            >
              📝 文字输入
            </Button>
            <Button
              variant={inputMode === 'image' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSwitch('image')}
              disabled={isGenerating || isExtracting}
              className="flex-1"
            >
              🖼️ 图片识别
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
                disabled={isGenerating}
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
                      disabled={isExtracting || isGenerating}
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
                        disabled={isExtracting || isGenerating}
                        className="flex-1"
                      >
                        {isExtracting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
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
                        disabled={isExtracting || isGenerating}
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
                      disabled={isGenerating}
                      placeholder="识别出的文字将显示在这里，您可以编辑修改..."
                    />
                    <p className="text-xs text-yellow-700 mt-2">
                      ✅ 文字识别完成！请检查内容是否正确，可以手动编辑修改后再生成任务卡片。
                    </p>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={handleGenerate}
                      disabled={isGenerating || !extractedText.trim()}
                      className="flex-1"
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          AI正在生成任务...
                        </>
                      ) : (
                        '✨ 生成任务卡片'
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setImageStep('upload')
                        setExtractedText('')
                      }}
                      disabled={isGenerating}
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
                onClick={handleGenerate}
                disabled={isGenerating || !inputText.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    AI正在解析...
                  </>
                ) : (
                  '生成任务卡片'
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setInputText('')}
                disabled={isGenerating}
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
          
          <div className="bg-blue-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              {inputMode === 'text' ? 'AI能识别的信息：' : 'AI图片识别功能：'}
            </h4>
            {inputMode === 'text' ? (
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 任务标题和详细描述</li>
                <li>• 截止时间（如"明天下午3点"、"本周五"、"12月15日"）</li>
                <li>• 提出人/分配人姓名</li>
                <li>• 紧迫性（是否有时间限制，需要立即关注）</li>
                <li>• 重要性（是否对长期目标有重要贡献）</li>
                <li>• 难度描述（"简单"、"复杂"、"困难"等）</li>
              </ul>
            ) : (
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>步骤 1</strong>：上传图片，AI 识别中英文文字内容</li>
                <li>• <strong>步骤 2</strong>：预览识别结果，可手动编辑修改</li>
                <li>• <strong>步骤 3</strong>：确认后 AI 自动生成任务卡片</li>
                <li>• 支持手写文字、打印文档、屏幕截图、会议白板等</li>
                <li>• 推荐上传清晰度较高的图片以获得更好的识别效果</li>
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TaskGenerationForm