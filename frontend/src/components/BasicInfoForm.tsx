import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { UserProfile, UserProfileCreate } from '@/types'

interface BasicInfoFormProps {
  profile: UserProfile | null
  onUpdate: (data: UserProfileCreate) => Promise<void>
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState<UserProfileCreate>({
    name: '',
    work_nickname: '',
    gender: undefined,
    job_type: '',
    job_level: undefined,
    is_manager: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        work_nickname: profile.work_nickname || '',
        gender: profile.gender,
        job_type: profile.job_type || '',
        job_level: profile.job_level,
        is_manager: profile.is_manager || false
      })
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onUpdate(formData)
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof UserProfileCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            姓名
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="请输入你的姓名"
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工作昵称
          </label>
          <Input
            type="text"
            value={formData.work_nickname}
            onChange={(e) => handleInputChange('work_nickname', e.target.value)}
            placeholder="同事们如何称呼你"
            className="w-full"
          />
        </div>
      </div>

      {/* Gender Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          性别
        </label>
        <Input
          type="text"
          value={formData.gender || ''}
          onChange={(e) => handleInputChange('gender', e.target.value || undefined)}
          placeholder="男/女/无性别或不填写，只为了让AI更好理解你"
          className="w-full"
        />
      </div>

      {/* Job Information */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          职位类型 <span className="text-gray-500">(自由填写)</span>
        </label>
        <Input
          type="text"
          value={formData.job_type}
          onChange={(e) => handleInputChange('job_type', e.target.value)}
          placeholder="如：产品运营、数据分析师、前端工程师"
          className="w-full"
        />
      </div>

      {/* Job Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          职业级别
        </label>
        <div className="flex flex-wrap gap-2">
          {['实习', '初级', '中级', '高级'].map((levelOption) => (
            <button
              key={levelOption}
              type="button"
              onClick={() => handleInputChange('job_level', levelOption as any)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                formData.job_level === levelOption
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {levelOption}
            </button>
          ))}
        </div>
      </div>

      {/* Management Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          管理职责
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleInputChange('is_manager', true)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              formData.is_manager
                ? 'bg-purple-500 text-white border-purple-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            是管理者
          </button>
          <button
            type="button"
            onClick={() => handleInputChange('is_manager', false)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              !formData.is_manager
                ? 'bg-purple-500 text-white border-purple-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            非管理者
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2"
        >
          {isSubmitting ? '保存中...' : '保存基本信息'}
        </Button>
      </div>
    </form>
  )
}

export default BasicInfoForm