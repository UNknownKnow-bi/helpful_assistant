/**
 * Feishu Webhook Hook
 * React hook for managing Feishu webhook settings and operations
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  feishuWebhookService,
  type FeishuWebhookSettings,
  type FeishuWebhookSettingsCreate,
  type FeishuWebhookSettingsUpdate,
  type FeishuWebhookTestRequest,
  type FeishuWebhookTestResponse
} from '@/services/feishuWebhookService'

export function useFeishuWebhook() {
  const queryClient = useQueryClient()
  
  // Query for webhook settings
  const {
    data: settings,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['feishu-webhook-settings'],
    queryFn: () => feishuWebhookService.getSettings(),
    retry: 1,
    refetchOnWindowFocus: false
  })

  // Create/Update settings mutation
  const createSettingsMutation = useMutation({
    mutationFn: (data: FeishuWebhookSettingsCreate) => feishuWebhookService.createSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feishu-webhook-settings'] })
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (data: FeishuWebhookSettingsUpdate) => feishuWebhookService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feishu-webhook-settings'] })
    }
  })

  // Delete settings mutation
  const deleteSettingsMutation = useMutation({
    mutationFn: () => feishuWebhookService.deleteSettings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feishu-webhook-settings'] })
    }
  })

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: (data?: FeishuWebhookTestRequest) => feishuWebhookService.testWebhook(data)
  })

  // Computed properties
  const isEnabled = settings?.is_enabled ?? false
  const hasSettings = !!settings
  const webhookUrl = settings?.webhook_url ?? ''

  // Methods
  const saveSettings = async (data: FeishuWebhookSettingsCreate | FeishuWebhookSettingsUpdate) => {
    if (hasSettings) {
      return await updateSettingsMutation.mutateAsync(data as FeishuWebhookSettingsUpdate)
    } else {
      return await createSettingsMutation.mutateAsync(data as FeishuWebhookSettingsCreate)
    }
  }

  const toggleEnabled = async () => {
    if (hasSettings) {
      await updateSettingsMutation.mutateAsync({
        is_enabled: !isEnabled
      })
    }
  }

  const deleteSettings = async () => {
    await deleteSettingsMutation.mutateAsync()
  }

  const testWebhook = async (testUrl?: string): Promise<FeishuWebhookTestResponse> => {
    const testData = testUrl ? { webhook_url: testUrl } : undefined
    return await testWebhookMutation.mutateAsync(testData)
  }

  // Validation
  const isValidWebhookUrl = (url: string): boolean => {
    return feishuWebhookService.isValidWebhookUrl(url)
  }

  // Example data
  const getExampleWebhookUrl = (): string => {
    return feishuWebhookService.getExampleWebhookUrl()
  }

  const getFormattedExamplePayload = (): string => {
    return feishuWebhookService.getFormattedExamplePayload()
  }

  return {
    // Data
    settings,
    isEnabled,
    hasSettings,
    webhookUrl,
    
    // Loading states
    isLoading,
    isSaving: createSettingsMutation.isPending || updateSettingsMutation.isPending,
    isTesting: testWebhookMutation.isPending,
    isDeleting: deleteSettingsMutation.isPending,
    
    // Error states
    error,
    saveError: createSettingsMutation.error || updateSettingsMutation.error,
    testError: testWebhookMutation.error,
    deleteError: deleteSettingsMutation.error,
    
    // Methods
    saveSettings,
    toggleEnabled,
    deleteSettings,
    testWebhook,
    refetch,
    
    // Test results
    testResult: testWebhookMutation.data,
    
    // Utilities
    isValidWebhookUrl,
    getExampleWebhookUrl,
    getFormattedExamplePayload,
    
    // Reset states
    resetTestResult: () => testWebhookMutation.reset(),
    resetSaveError: () => {
      createSettingsMutation.reset()
      updateSettingsMutation.reset()
    }
  }
}