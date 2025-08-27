import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { WorkRelationship, WorkRelationshipCreate, WorkRelationshipUpdate } from '@/types'

interface WorkRelationshipCardsProps {
  relationships: WorkRelationship[]
  onCreate: (data: WorkRelationshipCreate) => Promise<void>
  onUpdate: (id: number, data: WorkRelationshipUpdate) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

const relationshipTypes = [
  { value: '下属', label: '下属', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: '同级', label: '同级', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: '上级', label: '上级', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: '团队负责人', label: '团队负责人', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: '公司老板', label: '公司老板', color: 'bg-red-100 text-red-800 border-red-200' }
] as const

const jobLevels = ['实习', '初级', '中级', '高级'] as const

const personalityDimensions = [
  { key: 'personality_openness', label: '开放性', color: 'bg-blue-100 text-blue-800' },
  { key: 'personality_conscientiousness', label: '尽责性', color: 'bg-green-100 text-green-800' },
  { key: 'personality_extraversion', label: '外向性', color: 'bg-orange-100 text-orange-800' },
  { key: 'personality_agreeableness', label: '宜人性', color: 'bg-purple-100 text-purple-800' },
  { key: 'personality_neuroticism', label: '神经质', color: 'bg-red-100 text-red-800' }
] as const

// LocalStorage keys for form persistence
const STORAGE_KEYS = {
  NEW_COLLEAGUE_DRAFT: 'colleague_draft_new',
  EDIT_COLLEAGUE_DRAFT: 'colleague_draft_edit_',
  NEW_COLLEAGUE_TAGS: 'colleague_tags_new',
  EDIT_COLLEAGUE_TAGS: 'colleague_tags_edit_'
} as const

// Helper functions for localStorage management
const saveFormDraft = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save form draft:', error)
  }
}

const loadFormDraft = (key: string) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.warn('Failed to load form draft:', error)
    return null
  }
}

const clearFormDraft = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn('Failed to clear form draft:', error)
  }
}

const AddRelationshipForm: React.FC<{
  onAdd: (data: WorkRelationshipCreate) => Promise<void>
}> = ({ onAdd }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState<WorkRelationshipCreate>({
    coworker_name: '',
    relationship_type: '同级',
    work_nickname: '',
    job_type: '',
    job_level: undefined,
    personality_openness: [],
    personality_conscientiousness: [],
    personality_extraversion: [],
    personality_agreeableness: [],
    personality_neuroticism: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTags, setNewTags] = useState<Record<string, string>>({
    personality_openness: '',
    personality_conscientiousness: '',
    personality_extraversion: '',
    personality_agreeableness: '',
    personality_neuroticism: ''
  })
  const [hasDraft, setHasDraft] = useState(false)

  // Load draft on component mount
  useEffect(() => {
    const savedFormData = loadFormDraft(STORAGE_KEYS.NEW_COLLEAGUE_DRAFT)
    const savedTags = loadFormDraft(STORAGE_KEYS.NEW_COLLEAGUE_TAGS)
    
    if (savedFormData) {
      setFormData(savedFormData)
      setHasDraft(true)
    }
    
    if (savedTags) {
      setNewTags(savedTags)
    }
  }, [])

  // Auto-save form data when it changes
  useEffect(() => {
    if (isAdding) {
      saveFormDraft(STORAGE_KEYS.NEW_COLLEAGUE_DRAFT, formData)
      saveFormDraft(STORAGE_KEYS.NEW_COLLEAGUE_TAGS, newTags)
    }
  }, [formData, newTags, isAdding])

  const clearDraft = useCallback(() => {
    clearFormDraft(STORAGE_KEYS.NEW_COLLEAGUE_DRAFT)
    clearFormDraft(STORAGE_KEYS.NEW_COLLEAGUE_TAGS)
    setHasDraft(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.coworker_name.trim()) return

    setIsSubmitting(true)
    try {
      await onAdd(formData)
      
      // Clear form and draft after successful submission
      const emptyFormData = {
        coworker_name: '',
        relationship_type: '同级' as const,
        work_nickname: '',
        job_type: '',
        job_level: undefined,
        personality_openness: [],
        personality_conscientiousness: [],
        personality_extraversion: [],
        personality_agreeableness: [],
        personality_neuroticism: []
      }
      const emptyTags = {
        personality_openness: '',
        personality_conscientiousness: '',
        personality_extraversion: '',
        personality_agreeableness: '',
        personality_neuroticism: ''
      }
      
      setFormData(emptyFormData)
      setNewTags(emptyTags)
      setIsAdding(false)
      clearDraft()
    } catch (error) {
      console.error('Error adding relationship:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAdding) {
    return (
      <Card className="p-4 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <div className="flex items-center justify-center">
          <Button
            onClick={() => setIsAdding(true)}
            variant="ghost"
            className="w-full h-24 text-gray-500 hover:text-gray-700"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">+</div>
              <div>添加同事关系</div>
              {hasDraft && (
                <div className="text-xs text-blue-600 mt-1">
                  📝 检测到草稿
                </div>
              )}
            </div>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-2 border-blue-200 bg-blue-50">
      {hasDraft && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <span>📝</span>
            <span className="text-sm font-medium">草稿已恢复</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            已恢复您之前填写的内容，可以继续编辑。
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            同事姓名
          </label>
          <Input
            type="text"
            value={formData.coworker_name}
            onChange={(e) => setFormData(prev => ({ ...prev, coworker_name: e.target.value }))}
            placeholder="请输入同事姓名"
            className="w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            关系类型
          </label>
          <div className="flex flex-wrap gap-2">
            {relationshipTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, relationship_type: type.value }))}
                className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${
                  formData.relationship_type === type.value
                    ? type.color
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Extended Colleague Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              工作昵称 (选填)
            </label>
            <Input
              type="text"
              value={formData.work_nickname || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, work_nickname: e.target.value }))}
              placeholder="如：小王、技术小哥"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              职位类型 (选填)
            </label>
            <Input
              type="text"
              value={formData.job_type || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, job_type: e.target.value }))}
              placeholder="如：产品经理、前端开发"
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            职位级别 (选填)
          </label>
          <div className="flex flex-wrap gap-2">
            {jobLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  job_level: prev.job_level === level ? undefined : level 
                }))}
                className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${
                  formData.job_level === level
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Big Five Personality Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            性格特征标签 (选填)
          </label>
          <div className="space-y-3">
            {personalityDimensions.map((dimension) => {
              const currentTags = formData[dimension.key as keyof WorkRelationshipCreate] as string[] || []
              
              const addPersonalityTag = (dimensionKey: string, tag: string) => {
                if (!tag.trim() || currentTags.includes(tag.trim())) return
                
                const newTagsArray = [...currentTags, tag.trim()]
                setFormData(prev => ({ ...prev, [dimensionKey]: newTagsArray }))
                setNewTags(prev => ({ ...prev, [dimensionKey]: '' }))
              }

              const removePersonalityTag = (dimensionKey: string, tagToRemove: string) => {
                const newTags = currentTags.filter(tag => tag !== tagToRemove)
                setFormData(prev => ({ ...prev, [dimensionKey]: newTags }))
              }

              return (
                <div key={dimension.key} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${dimension.color}`}>
                      {dimension.label}
                    </span>
                    <span className="text-xs text-gray-500">({currentTags.length}个标签)</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {currentTags.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs border">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removePersonalityTag(dimension.key, tag)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newTags[dimension.key] || ''}
                      onChange={(e) => setNewTags(prev => ({ ...prev, [dimension.key]: e.target.value }))}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addPersonalityTag(dimension.key, newTags[dimension.key] || '')
                        }
                      }}
                      placeholder={`添加${dimension.label}标签`}
                      className="flex-1 text-xs"
                      size="sm"
                    />
                    <Button
                      type="button"
                      onClick={() => addPersonalityTag(dimension.key, newTags[dimension.key] || '')}
                      disabled={!(newTags[dimension.key] || '').trim()}
                      size="sm"
                      variant="outline"
                      className="px-2 text-xs"
                    >
                      +
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!formData.coworker_name.trim() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? '添加中...' : '确认添加'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const shouldClearDraft = hasDraft 
                ? window.confirm('是否要保存当前输入内容作为草稿？点击"取消"保存草稿，点击"确定"清除草稿。')
                : false
                
              if (shouldClearDraft) {
                clearDraft()
                setFormData({
                  coworker_name: '',
                  relationship_type: '同级',
                  work_nickname: '',
                  job_type: '',
                  job_level: undefined,
                  personality_openness: [],
                  personality_conscientiousness: [],
                  personality_extraversion: [],
                  personality_agreeableness: [],
                  personality_neuroticism: []
                })
                setNewTags({
                  personality_openness: '',
                  personality_conscientiousness: '',
                  personality_extraversion: '',
                  personality_agreeableness: '',
                  personality_neuroticism: ''
                })
              }
              
              setIsAdding(false)
            }}
            className="flex-1"
          >
            取消
          </Button>
        </div>
      </form>
    </Card>
  )
}

const RelationshipCard: React.FC<{
  relationship: WorkRelationship
  onUpdate: (id: number, data: WorkRelationshipUpdate) => Promise<void>
  onDelete: (id: number) => Promise<void>
}> = ({ relationship, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editData, setEditData] = useState<WorkRelationshipUpdate>({
    coworker_name: relationship.coworker_name,
    relationship_type: relationship.relationship_type,
    work_nickname: relationship.work_nickname || '',
    job_type: relationship.job_type || '',
    job_level: relationship.job_level,
    personality_openness: relationship.personality_openness || [],
    personality_conscientiousness: relationship.personality_conscientiousness || [],
    personality_extraversion: relationship.personality_extraversion || [],
    personality_agreeableness: relationship.personality_agreeableness || [],
    personality_neuroticism: relationship.personality_neuroticism || []
  })
  const [newTags, setNewTags] = useState<Record<string, string>>({
    personality_openness: '',
    personality_conscientiousness: '',
    personality_extraversion: '',
    personality_agreeableness: '',
    personality_neuroticism: ''
  })

  const editDraftKey = `${STORAGE_KEYS.EDIT_COLLEAGUE_DRAFT}${relationship.id}`
  const editTagsKey = `${STORAGE_KEYS.EDIT_COLLEAGUE_TAGS}${relationship.id}`

  // Load edit draft on entering edit mode
  useEffect(() => {
    if (isEditing) {
      const savedEditData = loadFormDraft(editDraftKey)
      const savedEditTags = loadFormDraft(editTagsKey)
      
      if (savedEditData) {
        setEditData(savedEditData)
      }
      
      if (savedEditTags) {
        setNewTags(savedEditTags)
      }
    }
  }, [isEditing, editDraftKey, editTagsKey])

  // Auto-save edit data when it changes
  useEffect(() => {
    if (isEditing) {
      saveFormDraft(editDraftKey, editData)
      saveFormDraft(editTagsKey, newTags)
    }
  }, [editData, newTags, isEditing, editDraftKey, editTagsKey])

  const clearEditDraft = useCallback(() => {
    clearFormDraft(editDraftKey)
    clearFormDraft(editTagsKey)
  }, [editDraftKey, editTagsKey])
  
  const typeInfo = relationshipTypes.find(t => t.value === relationship.relationship_type)
  const colorClass = typeInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200'

  const handleUpdate = async () => {
    if (!editData.coworker_name?.trim()) return
    
    setIsUpdating(true)
    try {
      await onUpdate(relationship.id, editData)
      setIsEditing(false)
      clearEditDraft() // Clear draft after successful update
    } catch (error) {
      console.error('Error updating relationship:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除与"${relationship.coworker_name}"的工作关系吗？`)) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(relationship.id)
    } catch (error) {
      console.error('Error deleting relationship:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelEdit = () => {
    const hasDraft = loadFormDraft(editDraftKey) !== null
    
    if (hasDraft) {
      const shouldClearDraft = window.confirm('是否要保存当前编辑内容作为草稿？点击"取消"保存草稿，点击"确定"清除草稿。')
      if (shouldClearDraft) {
        clearEditDraft()
      }
    }
    
    setIsEditing(false)
    setEditData({
      coworker_name: relationship.coworker_name,
      relationship_type: relationship.relationship_type,
      work_nickname: relationship.work_nickname || '',
      job_type: relationship.job_type || '',
      job_level: relationship.job_level,
      personality_openness: relationship.personality_openness || [],
      personality_conscientiousness: relationship.personality_conscientiousness || [],
      personality_extraversion: relationship.personality_extraversion || [],
      personality_agreeableness: relationship.personality_agreeableness || [],
      personality_neuroticism: relationship.personality_neuroticism || []
    })
    setNewTags({
      personality_openness: '',
      personality_conscientiousness: '',
      personality_extraversion: '',
      personality_agreeableness: '',
      personality_neuroticism: ''
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isEditing) {
    return (
      <Card className="p-4 border-2 border-blue-200 bg-blue-50">
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">同事姓名</label>
              <Input
                type="text"
                value={editData.coworker_name || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, coworker_name: e.target.value }))}
                className="w-full text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工作昵称</label>
              <Input
                type="text"
                value={editData.work_nickname || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, work_nickname: e.target.value }))}
                className="w-full text-sm"
                placeholder="如：小王、技术小哥"
              />
            </div>
          </div>

          {/* Job Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">职位类型</label>
              <Input
                type="text"
                value={editData.job_type || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, job_type: e.target.value }))}
                className="w-full text-sm"
                placeholder="如：产品经理、前端开发"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">职位级别</label>
              <div className="flex flex-wrap gap-1">
                {jobLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEditData(prev => ({ 
                      ...prev, 
                      job_level: prev.job_level === level ? undefined : level 
                    }))}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      editData.job_level === level
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Relationship Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关系类型</label>
            <div className="flex flex-wrap gap-2">
              {relationshipTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEditData(prev => ({ ...prev, relationship_type: type.value }))}
                  className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${
                    editData.relationship_type === type.value
                      ? type.color
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Personality Tags - Simplified Edit Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性格特征标签</label>
            <div className="space-y-2">
              {personalityDimensions.map((dimension) => {
                const currentTags = editData[dimension.key as keyof WorkRelationshipUpdate] as string[] || []
                
                const addPersonalityTag = (dimensionKey: string, tag: string) => {
                  if (!tag.trim() || currentTags.includes(tag.trim())) return
                  const newTagsArray = [...currentTags, tag.trim()]
                  setEditData(prev => ({ ...prev, [dimensionKey]: newTagsArray }))
                  setNewTags(prev => ({ ...prev, [dimensionKey]: '' }))
                }

                const removePersonalityTag = (dimensionKey: string, tagToRemove: string) => {
                  const newTags = currentTags.filter(tag => tag !== tagToRemove)
                  setEditData(prev => ({ ...prev, [dimensionKey]: newTags }))
                }

                return (
                  <div key={dimension.key} className="border rounded p-2 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${dimension.color}`}>
                        {dimension.label}
                      </span>
                      <span className="text-xs text-gray-500">({currentTags.length})</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {currentTags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removePersonalityTag(dimension.key, tag)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex gap-1">
                      <Input
                        type="text"
                        value={newTags[dimension.key] || ''}
                        onChange={(e) => setNewTags(prev => ({ ...prev, [dimension.key]: e.target.value }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addPersonalityTag(dimension.key, newTags[dimension.key] || '')
                          }
                        }}
                        placeholder="添加标签"
                        className="flex-1 text-xs h-7"
                      />
                      <Button
                        type="button"
                        onClick={() => addPersonalityTag(dimension.key, newTags[dimension.key] || '')}
                        disabled={!(newTags[dimension.key] || '').trim()}
                        size="sm"
                        variant="outline"
                        className="px-2 h-7 text-xs"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={handleUpdate}
              disabled={!editData.coworker_name?.trim() || isUpdating}
              className="flex-1"
              size="sm"
            >
              {isUpdating ? '保存中...' : '保存更改'}
            </Button>
            <Button
              onClick={cancelEdit}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              取消
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {relationship.coworker_name}
              {relationship.work_nickname && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({relationship.work_nickname})
                </span>
              )}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
              {relationship.relationship_type}
            </span>
          </div>
          
          {/* Job Information */}
          {(relationship.job_type || relationship.job_level) && (
            <div className="flex items-center gap-2 mb-2">
              {relationship.job_type && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {relationship.job_type}
                </span>
              )}
              {relationship.job_level && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {relationship.job_level}
                </span>
              )}
            </div>
          )}
          
          {/* Personality Tags */}
          {personalityDimensions.some(dim => {
            const tags = relationship[dim.key as keyof WorkRelationship] as string[] || []
            return tags.length > 0
          }) && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                {personalityDimensions.map(dim => {
                  const tags = relationship[dim.key as keyof WorkRelationship] as string[] || []
                  return tags.map(tag => (
                    <span key={`${dim.key}-${tag}`} className={`px-2 py-1 rounded text-xs font-medium ${dim.color}`}>
                      {tag}
                    </span>
                  ))
                })}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            添加时间：{formatDate(relationship.created_at)}
            {relationship.updated_at !== relationship.created_at && (
              <span className="ml-2">
                · 更新：{formatDate(relationship.updated_at)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="text-blue-600 hover:text-blue-800 hover:border-blue-300"
          >
            编辑
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-800 hover:border-red-300"
          >
            {isDeleting ? '删除中...' : '删除'}
          </Button>
        </div>
      </div>

      {/* Relationship Icon */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-500">
          <span>👥</span>
          <span className="ml-1">工作关系</span>
        </div>
      </div>
    </Card>
  )
}

const WorkRelationshipCards: React.FC<WorkRelationshipCardsProps> = ({
  relationships,
  onCreate,
  onUpdate,
  onDelete
}) => {
  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <p className="mb-2">
          <strong>工作关系管理：</strong>添加你的同事信息，每个同事将显示为独立的卡片。
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="font-medium">关系类型说明：</span>
          {relationshipTypes.map((type) => (
            <span key={type.value} className={`px-2 py-1 rounded border ${type.color}`}>
              {type.label}
            </span>
          ))}
        </div>
      </div>

      {/* Relationship Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {relationships.map((relationship) => (
          <RelationshipCard
            key={relationship.id}
            relationship={relationship}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
        
        {/* Add New Relationship Card */}
        <AddRelationshipForm onAdd={onCreate} />
      </div>

      {/* Summary */}
      {relationships.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">团队关系统计</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            {relationshipTypes.map((type) => {
              const count = relationships.filter(r => r.relationship_type === type.value).length
              return (
                <div key={type.value} className="text-center">
                  <div className="font-medium">{type.label}</div>
                  <div className="text-gray-600">{count} 位</div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 text-center text-gray-600 font-medium border-t pt-2">
            总计：{relationships.length} 位同事
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkRelationshipCards