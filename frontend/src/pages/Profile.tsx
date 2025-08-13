import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { userProfileApi, workRelationshipsApi } from '@/services/api'
import type { 
  UserProfile, 
  UserProfileCreate, 
  WorkRelationship, 
  WorkRelationshipCreate,
  UserProfileSummary 
} from '@/types'
import BasicInfoForm from '@/components/BasicInfoForm'
import BigFivePersonality from '@/components/BigFivePersonality'
import WorkRelationshipCards from '@/components/WorkRelationshipCards'

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [summary, setSummary] = useState<UserProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'basic' | 'personality' | 'relationships'>('basic')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const [profileData, summaryData] = await Promise.all([
        userProfileApi.get().catch(() => null), // Handle case where profile doesn't exist
        userProfileApi.getSummary()
      ])
      
      setProfile(profileData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('加载个人资料失败')
    } finally {
      setLoading(false)
    }
  }

  const handleBasicInfoUpdate = async (data: UserProfileCreate) => {
    try {
      const updatedProfile = profile 
        ? await userProfileApi.update(data)
        : await userProfileApi.createOrUpdate(data)
      
      setProfile(updatedProfile)
      await loadProfile() // Refresh summary
    } catch (err) {
      console.error('Error updating basic info:', err)
      setError('更新基本信息失败')
    }
  }

  const handlePersonalityUpdate = async (dimension: string, tags: string[]) => {
    try {
      const updatedProfile = await userProfileApi.updatePersonalityDimension(dimension, tags)
      setProfile(updatedProfile)
      await loadProfile() // Refresh summary
    } catch (err) {
      console.error('Error updating personality:', err)
      setError('更新性格标签失败')
    }
  }

  const handleWorkRelationshipCreate = async (data: WorkRelationshipCreate) => {
    try {
      await workRelationshipsApi.create(data)
      await loadProfile() // Refresh to get updated relationships
    } catch (err) {
      console.error('Error creating work relationship:', err)
      setError('添加同事关系失败')
    }
  }

  const handleWorkRelationshipDelete = async (id: number) => {
    try {
      await workRelationshipsApi.delete(id)
      await loadProfile() // Refresh to get updated relationships
    } catch (err) {
      console.error('Error deleting work relationship:', err)
      setError('删除同事关系失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">个人资料</h1>
        <p className="text-gray-600">
          管理你的个人信息、工作关系和性格特征，帮助AI更好地了解你
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={() => setError('')} 
            className="mt-2 text-sm"
            variant="outline"
          >
            关闭
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <Button
          onClick={() => setActiveTab('basic')}
          variant={activeTab === 'basic' ? 'default' : 'ghost'}
          className="flex-1"
        >
          基本信息
        </Button>
        <Button
          onClick={() => setActiveTab('personality')}
          variant={activeTab === 'personality' ? 'default' : 'ghost'}
          className="flex-1"
        >
          性格特征
        </Button>
        <Button
          onClick={() => setActiveTab('relationships')}
          variant={activeTab === 'relationships' ? 'default' : 'ghost'}
          className="flex-1"
        >
          工作关系
        </Button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'basic' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">基本信息</h2>
            <BasicInfoForm 
              profile={profile} 
              onUpdate={handleBasicInfoUpdate}
            />
          </Card>
        )}

        {activeTab === 'personality' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">大五人格特征</h2>
            <p className="text-gray-600 mb-6">
              为每个人格维度添加描述标签，帮助AI更好地理解你的性格特点
            </p>
            <BigFivePersonality 
              personality={summary?.big_five_personality} 
              onUpdate={handlePersonalityUpdate}
            />
          </Card>
        )}

        {activeTab === 'relationships' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">工作关系</h2>
            <p className="text-gray-600 mb-6">
              管理你的同事关系，每个同事将显示为独立的卡片
            </p>
            <WorkRelationshipCards 
              relationships={summary?.work_relationships || []}
              onCreate={handleWorkRelationshipCreate}
              onDelete={handleWorkRelationshipDelete}
            />
          </Card>
        )}
      </div>

      {/* Profile Summary (if available) */}
      {summary && (
        <Card className="mt-8 p-6">
          <h2 className="text-xl font-semibold mb-4">个人资料摘要</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">基本信息</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {summary.basic_info.name && <p>姓名: {summary.basic_info.name}</p>}
                {summary.basic_info.work_nickname && <p>工作昵称: {summary.basic_info.work_nickname}</p>}
                {summary.basic_info.job_type && <p>职位: {summary.basic_info.job_type}</p>}
                {summary.basic_info.job_level && <p>级别: {summary.basic_info.job_level}</p>}
                {summary.basic_info.is_manager !== undefined && (
                  <p>管理职责: {summary.basic_info.is_manager ? '是' : '否'}</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">团队关系</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {summary.work_relationships.length === 0 ? (
                  <p>暂无工作关系</p>
                ) : (
                  summary.work_relationships.map(rel => (
                    <p key={rel.id}>
                      {rel.coworker_name} ({rel.relationship_type})
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default Profile