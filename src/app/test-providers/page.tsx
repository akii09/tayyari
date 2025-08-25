"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/base/Button';
import { GlassCard } from '@/components/base/GlassCard';

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  models: string[];
  hasApiKey: boolean;
}

export default function TestProvidersPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ai/providers');
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.providers);
      } else {
        console.error('Failed to fetch providers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const seedProviders = async () => {
    try {
      setIsSeeding(true);
      const response = await fetch('/api/ai/providers/seed', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully seeded ${data.providers.length} providers!`);
        fetchProviders();
      } else {
        alert(`Failed to seed providers: ${data.error}`);
      }
    } catch (error) {
      console.error('Error seeding providers:', error);
      alert('Error seeding providers');
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            AI Providers Test Page
          </h1>
          <p className="text-text-secondary">
            Test and configure AI providers for the multi-AI context system
          </p>
        </div>

        <div className="flex justify-center mb-6 space-x-4">
          <Button onClick={fetchProviders} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh Providers'}
          </Button>
          <Button onClick={seedProviders} disabled={isSeeding} variant="secondary">
            {isSeeding ? 'Seeding...' : 'Seed Default Providers'}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-text-secondary">Loading providers...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  No Providers Found
                </h3>
                <p className="text-text-secondary mb-6">
                  Click "Seed Default Providers" to set up the initial AI providers.
                </p>
              </div>
            ) : (
              providers.map((provider) => (
                <GlassCard key={provider.id} className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl">{getProviderIcon(provider.type)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-text-secondary capitalize">
                        {provider.type}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Status:</span>
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
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Models:</span>
                      <span className="text-sm text-text-primary">
                        {provider.models.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-text-secondary font-medium mb-1">Available Models:</p>
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
                    
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/ai/providers/test-health', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ providerId: provider.id }),
                          });
                          const result = await response.json();
                          
                          if (result.success) {
                            alert(`Health Check Result:\nStatus: ${result.healthStatus.status}\nResponse Time: ${result.healthStatus.responseTime}ms\n${result.healthStatus.errorMessage || 'All good!'}`);
                          } else {
                            alert(`Health Check Failed:\n${result.error}\n${result.details || ''}`);
                          }
                        } catch (error) {
                          alert(`Error testing health: ${error}`);
                        }
                      }}
                      className="w-full"
                    >
                      Test Health
                    </Button>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-text-secondary">
            Total providers: {providers.length} | 
            Active: {providers.filter(p => p.enabled && p.hasApiKey).length} | 
            Configured: {providers.filter(p => p.hasApiKey).length}
          </p>
        </div>
      </div>
    </div>
  );
}