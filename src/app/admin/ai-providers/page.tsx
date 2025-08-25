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
  apiKey?: string;
  baseUrl?: string;
}

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      // This would be a real API call to get providers
      // For now, we'll simulate with the models API
      const response = await fetch('/api/ai/models');
      const data = await response.json();
      
      if (data.success) {
        // Group models by provider
        const providerMap = new Map<string, ProviderConfig>();
        
        data.models.forEach((model: any) => {
          if (!providerMap.has(model.provider)) {
            providerMap.set(model.provider, {
              id: `${model.providerType}-provider`,
              name: model.provider,
              type: model.providerType,
              enabled: model.isActive,
              priority: model.priority,
              models: [model.name],
              apiKey: model.isActive ? '••••••••' : undefined,
            });
          } else {
            const existing = providerMap.get(model.provider)!;
            existing.models.push(model.name);
          }
        });
        
        setProviders(Array.from(providerMap.values()));
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'google': return '🔍';
      case 'mistral': return '🌪️';
      case 'ollama': return '🦙';
      default: return '⚡';
    }
  };

  const getStatusColor = (enabled: boolean, hasApiKey: boolean) => {
    if (!enabled) return 'text-gray-500';
    if (hasApiKey) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getStatusText = (enabled: boolean, hasApiKey: boolean) => {
    if (!enabled) return 'Disabled';
    if (hasApiKey) return 'Active';
    return 'No API Key';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-text-secondary">Loading AI providers...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">AI Providers</h1>
          <p className="text-text-secondary">
            Configure and manage AI model providers for the system
          </p>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <GlassCard key={provider.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getProviderIcon(provider.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-text-secondary capitalize">
                      {provider.type}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(provider.enabled, !!provider.apiKey)}`}>
                  {getStatusText(provider.enabled, !!provider.apiKey)}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-primary mb-2">
                  Available Models ({provider.models.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {provider.models.slice(0, 3).map((model) => (
                    <span
                      key={model}
                      className="px-2 py-1 bg-white/5 rounded text-xs text-text-secondary"
                    >
                      {model}
                    </span>
                  ))}
                  {provider.models.length > 3 && (
                    <span className="px-2 py-1 bg-white/5 rounded text-xs text-text-secondary">
                      +{provider.models.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Priority: {provider.priority}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingProvider(provider)}
                >
                  Configure
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Empty State */}
        {providers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No AI Providers Configured
            </h3>
            <p className="text-text-secondary mb-6">
              Add AI providers to start using the system
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        )}

        {/* Configuration Modal */}
        {editingProvider && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Configure {editingProvider.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    placeholder="Enter API key..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-electric-blue focus:outline-none"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Required to activate this provider
                  </p>
                </div>

                {editingProvider.type === 'ollama' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Base URL
                    </label>
                    <input
                      type="url"
                      placeholder="http://localhost:11434"
                      defaultValue={editingProvider.baseUrl}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-electric-blue focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    defaultChecked={editingProvider.enabled}
                    className="rounded border-white/10 bg-white/5 text-electric-blue focus:ring-electric-blue"
                  />
                  <label htmlFor="enabled" className="text-sm text-text-primary">
                    Enable this provider
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditingProvider(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    // Here you would save the configuration
                    setEditingProvider(null);
                    fetchProviders();
                  }}
                >
                  Save
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}