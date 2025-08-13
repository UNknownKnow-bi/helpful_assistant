import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { WorkRelationship, WorkRelationshipCreate } from '@/types'

interface WorkRelationshipCardsProps {
  relationships: WorkRelationship[]
  onCreate: (data: WorkRelationshipCreate) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

const relationshipTypes = [
  { value: '下属', label: '下属', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: '同级', label: '同级', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: '上级', label: '上级', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: '团队负责人', label: '团队负责人', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: '公司老板', label: '公司老板', color: 'bg-red-100 text-red-800 border-red-200' }
] as const

const AddRelationshipForm: React.FC<{
  onAdd: (data: WorkRelationshipCreate) => Promise<void>
}> = ({ onAdd }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState<WorkRelationshipCreate>({
    coworker_name: '',
    relationship_type: '同级'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.coworker_name.trim()) return

    setIsSubmitting(true)
    try {
      await onAdd(formData)
      setFormData({ coworker_name: '', relationship_type: '同级' })
      setIsAdding(false)
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
            </div>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-2 border-blue-200 bg-blue-50">
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
              setIsAdding(false)
              setFormData({ coworker_name: '', relationship_type: '同级' })
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
  onDelete: (id: number) => Promise<void>
}> = ({ relationship, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  
  const typeInfo = relationshipTypes.find(t => t.value === relationship.relationship_type)
  const colorClass = typeInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200'

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {relationship.coworker_name}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
              {relationship.relationship_type}
            </span>
          </div>
          
          <div className="text-sm text-gray-500">
            添加时间：{formatDate(relationship.created_at)}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      <div className="mt-3 pt-3 border-t border-gray-100">
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