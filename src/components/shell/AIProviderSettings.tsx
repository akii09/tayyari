"use client";

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/base/GlassCard';
import { Button } from '@/components/base/Button';

interface ProviderConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  models: string[];
  hasApiKey: boolean;
  apiKey?: string;
  baseUrl?: string;
  maxRequestsPerMinute: number;
  maxCostPerDay: number;
}

interface AIProviderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderUpdated: () => void;
}

export function AIProviderSettings({ isOpen, onClose, onProviderUpdated }: AIProviderSettingsProps) {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [formData, setFormData] = useState<Record<string, Partial<ProviderConfig>>>({});

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
    }
  }, [isOpen]);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ai/providers');
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.providers);
        
        // Initialize form data
        const initialFormData: Record<string, Partial<ProviderConfig>> = {};
        data.providers.forEach((provider: ProviderConfig) => {
          initialFormData[provider.id] = {
            apiKey: '',
            baseUrl: provider.baseUrl || '',
            enabled: provider.enabled,
          };
        });
        setFormData(initialFormData);
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (providerId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value,
      },
    }));
  };

  const saveProvider = async (providerId: string) => {
    try {
      setIsSaving(true);
      const providerFormData = formData[providerId];
      
      const updateData: any = {
        id: providerId,
        enabled: providerFormData?.enabled,
      };

      // Only include API key if it's not empty
      if (providerFormData?.apiKey && providerFormData.apiKey.trim()) {
        updateData.apiKey = providerFormData.apiKey.trim();
      }

      // Only include base URL if it's not empty (for Ollama)
      if (providerFormData?.baseUrl && providerFormData.baseUrl.trim()) {
        updateData.baseUrl = providerFormData.baseUrl.trim();
      }

      const response = await fetch('/api/ai/providers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setProviders(prev => 
          prev.map(p => 
            p.id === providerId 
              ? { ...p, ...result.provider }
              : p
          )
        );
        
        // Clear the API key field after successful save
        updateFormData(providerId, 'apiKey', '');
        
        // Notify parent component
        onProviderUpdated();
      } else {
        alert(`Failed to save: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to save provider:', error);
      alert('Failed to save provider configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (providerId: string) => {
    try {
      setTestingProvider(providerId);
      
      const response = await fetch('/api/ai/providers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: providerId }),
      });

      // Check if response is ok first
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response has content before parsing JSON
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }

      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      if (result.success) {
        const status = result.healthStatus.status;
        const message = status === 'healthy' 
          ? 'Connection successful!' 
          : `Connection failed: ${result.healthStatus.errorMessage}`;
        
        alert(message);
      } else {
        alert(`Test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to test connection: ${errorMessage}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const seedProviders = async () => {
    try {
      setIsSeeding(true);
      
      const response = await fetch('/api/ai/providers/seed', {
        method: 'POST',
      });

      // Check if response is ok first
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response has content before parsing JSON
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }

      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      if (result.success) {
        alert('Successfully seeded default providers!');
        fetchProviders(); // Refresh the list
      } else {
        alert(`Failed to seed providers: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to seed providers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to seed providers: ${errorMessage}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'google': return '🔍';
      case 'mistral': return '🌪️';
      case 'ollama': return '🦙';
      case 'groq': return '⚡';
      case 'perplexity': return '🔮';
      default: return '⚡';
    }
  };

  const getProviderDescription = (type: string) => {
    switch (type) {
      case 'openai': return 'GPT models from OpenAI';
      case 'anthropic': return 'Claude models from Anthropic';
      case 'google': return 'Gemini models from Google';
      case 'mistral': return 'Mistral AI models';
      case 'ollama': return 'Local models via Ollama';
      case 'groq': return 'Fast inference with Groq';
      case 'perplexity': return 'Search-augmented models';
      default: return 'AI provider';
    }
  };

  const getApiKeyPlaceholder = (type: string) => {
    switch (type) {
      case 'openai': return 'sk-...';
      case 'anthropic': return 'sk-ant-...';
      case 'google': return 'AIza...';
      case 'mistral': return 'api_key...';
      case 'ollama': return 'Not required for local Ollama';
      case 'groq': return 'gsk_...';
      case 'perplexity': return 'pplx-...';
      default: return 'Enter API key...';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">AI Provider Settings</h2>
            <p className="text-sm text-text-secondary mt-1">
              Configure API keys and settings for AI providers
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Close settings"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-text-secondary">Loading providers...</span>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No AI Providers Found</h3>
              <p className="text-text-secondary mb-6">
                It looks like no AI providers have been configured yet. Click the button below to set up the default providers.
              </p>
              <Button
                onClick={seedProviders}
                disabled={isSeeding}
                className="mx-auto"
              >
                {isSeeding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                    Setting up providers...
                  </>
                ) : (
                  'Set Up Default Providers'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {providers.map((provider) => (
                <div key={provider.id} className="border border-white/10 rounded-lg p-6">
                  {/* Provider Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getProviderIcon(provider.type)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">
                          {provider.name}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {getProviderDescription(provider.type)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        provider.enabled && provider.hasApiKey 
                          ? 'text-green-400' 
                          : provider.enabled 
                          ? 'text-yellow-400' 
                          : 'text-gray-500'
                      }`}>
                        {provider.enabled && provider.hasApiKey 
                          ? 'Active' 
                          : provider.enabled 
                          ? 'No API Key' 
                          : 'Disabled'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Configuration Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* API Key */}
                    {provider.type !== 'ollama' && (
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          API Key
                          {provider.hasApiKey && (
                            <span className="ml-2 text-xs text-green-400">✓ Configured</span>
                          )}
                        </label>
                        <input
                          type="password"
                          placeholder={getApiKeyPlaceholder(provider.type)}
                          value={formData[provider.id]?.apiKey || ''}
                          onChange={(e) => updateFormData(provider.id, 'apiKey', e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-electric-blue focus:outline-none text-sm"
                        />
                        <p className="text-xs text-text-secondary mt-1">
                          Leave empty to keep existing key
                        </p>
                      </div>
                    )}

                    {/* Base URL (for Ollama) */}
                    {provider.type === 'ollama' && (
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Base URL
                        </label>
                        <input
                          type="url"
                          placeholder="http://localhost:11434"
                          value={formData[provider.id]?.baseUrl || ''}
                          onChange={(e) => updateFormData(provider.id, 'baseUrl', e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-electric-blue focus:outline-none text-sm"
                        />
                      </div>
                    )}

                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData[provider.id]?.enabled || false}
                          onChange={(e) => updateFormData(provider.id, 'enabled', e.target.checked)}
                          className="rounded border-white/10 bg-white/5 text-electric-blue focus:ring-electric-blue"
                        />
                        <span className="text-sm text-text-primary">Enable this provider</span>
                      </label>
                    </div>
                  </div>

                  {/* Models */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-text-primary mb-2">
                      Available Models ({provider.models.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {provider.models.map((model) => (
                        <span
                          key={model}
                          className="px-2 py-1 bg-white/5 rounded text-xs text-text-secondary"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => testConnection(provider.id)}
                      disabled={testingProvider === provider.id || !provider.enabled}
                    >
                      {testingProvider === provider.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => saveProvider(provider.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <div className="flex items-center space-x-4">
            <p className="text-xs text-text-secondary">
              Changes are saved immediately. Test connections to verify configuration.
            </p>
            {providers.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={seedProviders}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
                    Refreshing...
                  </>
                ) : (
                  'Refresh Providers'
                )}
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}