import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { aiProvidersApi } from '@/services/api'
import { Plus, Settings, CheckCircle, AlertCircle, Loader, Edit, Trash2, MoreVertical } from 'lucide-react'
import type { AIProvider, AIProviderCreate } from '@/types'

export default function AIConfig() {
  const [showForm, setShowForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null)
  const queryClient = useQueryClient()

  // Fetch AI providers
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: aiProvidersApi.getAll,
  })

  // Create provider mutation
  const createProviderMutation = useMutation({
    mutationFn: (provider: AIProviderCreate) => aiProvidersApi.create(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
      queryClient.invalidateQueries({ queryKey: ['text-models'] })
      handleCloseForm()
      alert('AI提供商添加成功！')
    },
    onError: (error: any) => {
      console.error('Provider creation failed:', error)
      alert('添加失败：' + (error.response?.data?.detail || '请稍后重试'))
    },
  })

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AIProvider> }) => 
      aiProvidersApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
      queryClient.invalidateQueries({ queryKey: ['text-models'] })
      // If this was from the form, close it and show success
      if (editingProvider && variables.data.name) {
        handleCloseForm()
        alert('AI提供商更新成功！')
      }
    },
    onError: (error: any) => {
      alert('更新失败：' + (error.response?.data?.detail || '请稍后重试'))
    },
  })

  // Delete provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: (id: number) => aiProvidersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
      queryClient.invalidateQueries({ queryKey: ['text-models'] })
      alert('AI提供商删除成功！')
    },
    onError: (error: any) => {
      alert('删除失败：' + (error.response?.data?.detail || '请稍后重试'))
    },
  })

  // Test provider mutation
  const testProviderMutation = useMutation({
    mutationFn: (id: string) => aiProvidersApi.test(id),
    onSuccess: (result, id) => {
      if (result.success) {
        alert('连接测试成功！')
      } else {
        alert('连接测试失败：' + result.message)
      }
    },
    onError: (error: any) => {
      alert('测试失败：' + (error.response?.data?.detail || '请稍后重试'))
    },
  })

  const handleSetActive = (id: string) => {
    updateProviderMutation.mutate({
      id,
      data: { is_active: true }
    })
  }

  const handleTestProvider = (id: string) => {
    testProviderMutation.mutate(id)
  }

  const handleEditProvider = (provider: AIProvider) => {
    setEditingProvider(provider)
    setShowForm(true)
  }

  const handleDeleteProvider = (id: number) => {
    if (confirm('确定要删除这个AI提供商吗？此操作无法撤销。')) {
      deleteProviderMutation.mutate(id)
    }
  }

  const handleSubmitProvider = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    const config = {
      api_key: formData.get('api_key') as string,
      base_url: formData.get('base_url') as string,
      model: formData.get('model') as string,
      temperature: parseFloat(formData.get('temperature') as string) || 0.7,
      max_tokens: parseInt(formData.get('max_tokens') as string) || 1000,
      stream: true,
    }

    const providerData = {
      name: formData.get('name') as string,
      provider_type: formData.get('provider_type') as string,
      category: formData.get('category') as string,
      config,
    }

    if (editingProvider) {
      // Edit existing provider
      updateProviderMutation.mutate({
        id: editingProvider.id.toString(),
        data: providerData
      })
    } else {
      // Create new provider
      createProviderMutation.mutate(providerData)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingProvider(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI配置</h1>
          <p className="text-gray-600 mt-1">配置和管理您的AI服务提供商</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加提供商
        </Button>
      </div>

      {/* Providers List */}
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-8">
          <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg mb-2">还没有配置AI提供商</p>
          <p className="text-gray-400 text-sm">添加一个AI提供商开始使用智能功能</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Text Models */}
          {providers.filter(p => p.category === 'text').length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                文本模型
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({providers.filter(p => p.category === 'text').length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.filter(p => p.category === 'text').map((provider) => (
                  <Card key={provider.id} className={`${provider.is_active ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    {provider.name}
                    {provider.is_active && (
                      <CheckCircle className="w-5 h-5 ml-2 text-green-500" />
                    )}
                  </CardTitle>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {provider.provider_type}
                  </span>
                </div>
                <CardDescription>
                  模型: {provider.config.model || 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">温度:</span>
                      <span className="ml-2">{provider.config.temperature || 0.7}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">最大令牌:</span>
                      <span className="ml-2">{provider.config.max_tokens || 1000}</span>
                    </div>
                  </div>
                  
                  {provider.last_tested && (
                    <div className="text-sm text-gray-500">
                      最后测试: {new Date(provider.last_tested).toLocaleString('zh-CN')}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex space-x-2">
                      {!provider.is_active ? (
                        <Button
                          size="sm"
                          onClick={() => handleSetActive(provider.id)}
                          disabled={updateProviderMutation.isPending}
                        >
                          启用
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateProviderMutation.mutate({
                            id: provider.id.toString(),
                            data: { is_active: false }
                          })}
                          disabled={updateProviderMutation.isPending}
                        >
                          停用
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestProvider(provider.id)}
                        disabled={testProviderMutation.isPending}
                      >
                        {testProviderMutation.isPending && testProviderMutation.variables === provider.id ? (
                          <Loader className="w-4 h-4 animate-spin mr-1" />
                        ) : null}
                        测试连接
                      </Button>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditProvider(provider)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteProvider(provider.id)}
                        disabled={deleteProviderMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
                ))}
              </div>
            </div>
          )}

          {/* Image Models */}
          {providers.filter(p => p.category === 'image').length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                图像模型
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({providers.filter(p => p.category === 'image').length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.filter(p => p.category === 'image').map((provider) => (
                  <Card key={provider.id} className={`${provider.is_active ? 'ring-2 ring-green-500' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center">
                          {provider.name}
                          {provider.is_active && (
                            <CheckCircle className="w-5 h-5 ml-2 text-green-500" />
                          )}
                        </CardTitle>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {provider.provider_type}
                        </span>
                      </div>
                      <CardDescription>
                        模型: {provider.config.model || 'N/A'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">温度:</span>
                            <span className="ml-2">{provider.config.temperature || 0.7}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">最大令牌:</span>
                            <span className="ml-2">{provider.config.max_tokens || 1000}</span>
                          </div>
                        </div>
                        
                        {provider.last_tested && (
                          <div className="text-sm text-gray-500">
                            最后测试: {new Date(provider.last_tested).toLocaleString('zh-CN')}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <div className="flex space-x-2">
                            {!provider.is_active ? (
                              <Button
                                size="sm"
                                onClick={() => handleSetActive(provider.id)}
                                disabled={updateProviderMutation.isPending}
                              >
                                启用
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateProviderMutation.mutate({
                                  id: provider.id.toString(),
                                  data: { is_active: false }
                                })}
                                disabled={updateProviderMutation.isPending}
                              >
                                停用
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestProvider(provider.id)}
                              disabled={testProviderMutation.isPending}
                            >
                              {testProviderMutation.isPending && testProviderMutation.variables === provider.id ? (
                                <Loader className="w-4 h-4 animate-spin mr-1" />
                              ) : null}
                              测试连接
                            </Button>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProvider(provider)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteProvider(provider.id)}
                              disabled={deleteProviderMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Provider Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingProvider ? '编辑AI提供商' : '添加AI提供商'}</CardTitle>
              <CardDescription>
                {editingProvider ? '修改您的AI服务提供商信息' : '配置您的AI服务提供商信息'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProvider} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">提供商名称</label>
                    <Input 
                      name="name" 
                      required 
                      placeholder="例如: 我的DeepSeek" 
                      defaultValue={editingProvider?.name || ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">提供商类型</label>
                    <select 
                      name="provider_type" 
                      required
                      className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                      defaultValue={editingProvider?.provider_type || ''}
                    >
                      <option value="">选择类型</option>
                      <option value="openai">OpenAI</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="imageOCR">图像OCR识别</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">模型分类</label>
                    <select 
                      name="category" 
                      required
                      className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
                      defaultValue={editingProvider?.category || 'text'}
                    >
                      <option value="text">文本模型</option>
                      <option value="image">图像模型</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">API密钥</label>
                  <Input 
                    name="api_key" 
                    type="password"
                    required 
                    placeholder="输入您的API密钥" 
                    defaultValue={editingProvider?.config?.api_key || ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">API基础URL</label>
                  <Input 
                    name="base_url" 
                    placeholder="例如: https://api.deepseek.com" 
                    defaultValue={editingProvider?.config?.base_url || ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">模型名称</label>
                  <Input 
                    name="model" 
                    required
                    placeholder="例如: deepseek-chat, gpt-3.5-turbo, qwen-vl-max (OCR)" 
                    defaultValue={editingProvider?.config?.model || ''}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">温度 (0-2)</label>
                    <Input 
                      name="temperature" 
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      defaultValue={editingProvider?.config?.temperature?.toString() || '0.7'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">最大令牌数</label>
                    <Input 
                      name="max_tokens" 
                      type="number"
                      min="1"
                      defaultValue={editingProvider?.config?.max_tokens?.toString() || '1000'}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseForm}>
                    取消
                  </Button>
                  <Button type="submit" disabled={createProviderMutation.isPending || updateProviderMutation.isPending}>
                    {editingProvider 
                      ? (updateProviderMutation.isPending ? '更新中...' : '更新')
                      : (createProviderMutation.isPending ? '添加中...' : '添加')
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}