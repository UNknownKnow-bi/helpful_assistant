import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { BigFivePersonality } from '@/types'

interface BigFivePersonalityProps {
  personality?: BigFivePersonality
  onUpdate: (dimension: string, tags: string[]) => Promise<void>
}

interface PersonalityDimension {
  key: string
  title: string
  description: string
  color: string
  examples: string[]
}

const dimensions: PersonalityDimension[] = [
  {
    key: 'openness',
    title: '经验开放性 (Openness)',
    description: '对新事物、新想法的好奇心和想象力',
    color: 'blue',
    examples: ['好奇心强', '富有想象力', '喜欢创新', '乐于尝试']
  },
  {
    key: 'conscientiousness',
    title: '尽责性 (Conscientiousness)',
    description: '自律、有条理、可靠的程度',
    color: 'green',
    examples: ['有条理', '自律', '可靠', '计划性强']
  },
  {
    key: 'extraversion',
    title: '外向性 (Extraversion)',
    description: '从社交中获取能量的程度，热情、健谈',
    color: 'orange',
    examples: ['健谈', '热情', '喜欢社交', '活跃']
  },
  {
    key: 'agreeableness',
    title: '宜人性 (Agreeableness)',
    description: '对他人友好、合作、有同情心的程度',
    color: 'purple',
    examples: ['友好', '合作', '有同情心', '乐于助人']
  },
  {
    key: 'neuroticism',
    title: '神经质 (Neuroticism)',
    description: '情绪的稳定性，感受负面情绪的倾向',
    color: 'red',
    examples: ['情绪稳定', '焦虑倾向', '压力敏感', '情绪波动']
  }
]

const PersonalityDimensionCard: React.FC<{
  dimension: PersonalityDimension
  tags: string[]
  onUpdate: (tags: string[]) => void
}> = ({ dimension, tags, onUpdate }) => {
  const [inputValue, setInputValue] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const addTag = async () => {
    if (!inputValue.trim() || tags.includes(inputValue.trim())) return
    
    const newTags = [...tags, inputValue.trim()]
    setIsUpdating(true)
    
    try {
      await onUpdate(newTags)
      setInputValue('')
    } catch (error) {
      console.error('Error adding tag:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const removeTag = async (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    setIsUpdating(true)
    
    try {
      await onUpdate(newTags)
    } catch (error) {
      console.error('Error removing tag:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'border-blue-200 bg-blue-50 text-blue-700',
      green: 'border-green-200 bg-green-50 text-green-700',
      orange: 'border-orange-200 bg-orange-50 text-orange-700',
      purple: 'border-purple-200 bg-purple-50 text-purple-700',
      red: 'border-red-200 bg-red-50 text-red-700'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  return (
    <Card className={`p-4 border-2 ${getColorClasses(dimension.color)}`}>
      <div className="mb-3">
        <h3 className="font-semibold text-lg mb-1">{dimension.title}</h3>
        <p className="text-sm opacity-80 mb-2">{dimension.description}</p>
        <div className="text-xs opacity-70">
          <span className="font-medium">示例标签：</span>
          {dimension.examples.join('、')}
        </div>
      </div>

      {/* Current Tags */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-sm border shadow-sm"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                disabled={isUpdating}
                className="ml-1 text-red-500 hover:text-red-700 text-xs"
              >
                ✕
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-sm opacity-60 italic">暂无标签</span>
          )}
        </div>
      </div>

      {/* Add New Tag */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入新标签并按回车"
          className="flex-1 text-sm bg-white"
          disabled={isUpdating}
        />
        <Button
          onClick={addTag}
          disabled={!inputValue.trim() || isUpdating}
          size="sm"
          className="px-3"
        >
          {isUpdating ? '...' : '添加'}
        </Button>
      </div>
    </Card>
  )
}

const BigFivePersonality: React.FC<BigFivePersonalityProps> = ({ 
  personality, 
  onUpdate 
}) => {
  const handleDimensionUpdate = async (dimension: string, tags: string[]) => {
    await onUpdate(dimension, tags)
  }

  const getCurrentTags = (dimensionKey: string): string[] => {
    if (!personality) return []
    return personality[dimensionKey as keyof BigFivePersonality] || []
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <p className="mb-2">
          <strong>使用说明：</strong>为每个人格维度添加描述你的标签词汇。
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>在输入框中输入标签，按回车键或点击"添加"按钮</li>
          <li>点击标签右侧的 ✕ 可以删除标签</li>
          <li>参考示例标签，但不限于示例内容</li>
          <li>这些标签将帮助AI更好地理解你的性格特点</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dimensions.map((dimension) => (
          <PersonalityDimensionCard
            key={dimension.key}
            dimension={dimension}
            tags={getCurrentTags(dimension.key)}
            onUpdate={(tags) => handleDimensionUpdate(dimension.key, tags)}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">当前标签统计</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          {dimensions.map((dim) => {
            const tagCount = getCurrentTags(dim.key).length
            return (
              <div key={dim.key} className="text-center">
                <div className="font-medium">{dim.title.split(' ')[0]}</div>
                <div className="text-gray-600">{tagCount} 个标签</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default BigFivePersonality