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
  WorkRelationshipUpdate
} from '@/types'
import BasicInfoForm from '@/components/BasicInfoForm'
import BigFivePersonality from '@/components/BigFivePersonality'
import WorkRelationshipCards from '@/components/WorkRelationshipCards'

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [relationships, setRelationships] = useState<WorkRelationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'basic' | 'personality' | 'relationships'>('basic')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const [profileData, relationshipsData] = await Promise.all([
        userProfileApi.get().catch(() => null), // Handle case where profile doesn't exist
        workRelationshipsApi.getAll().catch(() => [])
      ])
      
      setProfile(profileData)
      setRelationships(relationshipsData)
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
      await loadProfile() // Refresh data
    } catch (err) {
      console.error('Error updating basic info:', err)
      setError('更新基本信息失败')
    }
  }

  const handlePersonalityUpdate = async (dimension: string, tags: string[]) => {
    try {
      const updatedProfile = await userProfileApi.updatePersonalityDimension(dimension, tags)
      setProfile(updatedProfile)
      await loadProfile() // Refresh data
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

  const handleWorkRelationshipUpdate = async (id: number, data: WorkRelationshipUpdate) => {
    try {
      const updatedRelationship = await workRelationshipsApi.update(id, data)
      setRelationships(prev => prev.map(rel => rel.id === id ? updatedRelationship : rel))
    } catch (err) {
      console.error('Error updating work relationship:', err)
      setError('更新同事关系失败')
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
              personality={{
                openness: profile?.personality_openness || [],
                conscientiousness: profile?.personality_conscientiousness || [],
                extraversion: profile?.personality_extraversion || [],
                agreeableness: profile?.personality_agreeableness || [],
                neuroticism: profile?.personality_neuroticism || []
              }} 
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
              relationships={relationships}
              onCreate={handleWorkRelationshipCreate}
              onUpdate={handleWorkRelationshipUpdate}
              onDelete={handleWorkRelationshipDelete}
            />
          </Card>
        )}
      </div>

    </div>
  )
}

export default Profile