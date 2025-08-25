"use client";

import { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/base/GlassCard';
import { useAIModel } from '@/lib/ai/AIModelContext';
import { AIProviderSettings } from './AIProviderSettings';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  providerType: string;
  isActive: boolean;
  isHealthy: boolean;
  priority: number;
  lastChecked?: Date;
  errorMessage?: string;
}

interface ModelSummary {
  total: number;
  active: number;
  healthy: number;
}

export function AIModelSwitcher() {
  const { 
    selectedModel, 
    setSelectedModel, 
    availableModels, 
    isLoading, 
    refreshModels,
    getSelectedModelInfo 
  } = useAIModel();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate summary from available models
  const summary: ModelSummary = {
    total: availableModels.length,
    active: availableModels.filter(m => m.isActive).length,
    healthy: availableModels.filter(m => m.isHealthy).length,
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update last updated time when models change
  useEffect(() => {
    if (availableModels.length > 0) {
      setLastUpdated(new Date());
    }
  }, [availableModels]);

  const triggerHealthCheck = async () => {
    try {
      await fetch('/api/ai/models/health-check', { method: 'POST' });
      // Refresh models after health check
      setTimeout(refreshModels, 1000);
    } catch (error) {
      console.error('Failed to trigger health check:', error);
    }
  };

  const refreshOllamaModels = async () => {
    setIsRefreshingOllama(true);
    try {
      const response = await fetch('/api/ai/providers/ollama/refresh', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Ollama models refreshed:', data);
        // Refresh the main models list
        setTimeout(refreshModels, 1000);
        setLastUpdated(new Date());
      } else {
        console.error('Failed to refresh Ollama models');
      }
    } catch (error) {
      console.error('Error refreshing Ollama models:', error);
    } finally {
      setIsRefreshingOllama(false);
    }
  };

  const getProviderIcon = (providerType: string) => {
    switch (providerType) {
      case 'openai':
        return '🤖';
      case 'anthropic':
        return '🧠';
      case 'google':
        return '🔍';
      case 'mistral':
        return '🌪️';
      case 'ollama':
        return '🦙';
      case 'groq':
        return '⚡';
      case 'perplexity':
        return '🔮';
      default:
        return '⚡';
    }
  };

  const getStatusColor = (model: ModelInfo) => {
    if (!model.isActive) return 'text-gray-500';
    if (model.isHealthy) return 'text-green-400';
    return 'text-red-400';
  };

  const getStatusDot = (model: ModelInfo) => {
    if (!model.isActive) return 'bg-gray-500';
    if (model.isHealthy) return 'bg-green-400';
    return 'bg-red-400';
  };

  const selectedModelInfo = getSelectedModelInfo();

  if (isLoading && availableModels.length === 0) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <div className="flex items-center space-x-2 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
          <div className="w-4 h-4 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-text-secondary">Loading models...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-40" ref={dropdownRef}>
      {/* Main Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200 group"
        title={selectedModelInfo ? `${selectedModelInfo.name} (${selectedModelInfo.provider})` : 'Select AI Model'}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">
            {selectedModelInfo ? getProviderIcon(selectedModelInfo.providerType) : '🤖'}
          </span>
          <div className="flex flex-col items-start">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-text-primary">
                {selectedModelInfo ? selectedModelInfo.name : 'No Model'}
              </span>
              <div className={`w-2 h-2 rounded-full ${selectedModelInfo ? getStatusDot(selectedModelInfo) : 'bg-gray-500'}`}></div>
            </div>
            <span className="text-xs text-text-secondary">
              {summary.healthy}/{summary.active} active
            </span>
          </div>
        </div>
        <svg 
          className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80">
          <GlassCard className="p-4 max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-text-primary">AI Models</h3>
                <p className="text-xs text-text-secondary">
                  {summary.healthy} healthy • {summary.active} active • {summary.total} total
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  title="Configure AI providers"
                >
                  <svg 
                    className="w-4 h-4 text-text-secondary"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={triggerHealthCheck}
                  disabled={isLoading}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50"
                  title="Refresh health status"
                >
                  <svg 
                    className={`w-4 h-4 text-text-secondary ${isLoading ? 'animate-spin' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {/* Ollama Models Refresh Button */}
                {availableModels.some(m => m.providerType === 'ollama') && (
                  <button
                    onClick={refreshOllamaModels}
                    disabled={isRefreshingOllama}
                    className="p-1.5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50"
                    title="Refresh Ollama models from local instance"
                  >
                    <span className={`text-sm ${isRefreshingOllama ? 'animate-spin' : ''}`}>🦙</span>
                  </button>
                )}
              </div>
            </div>

            {/* Model List */}
            <div className="space-y-2">
              {availableModels.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-sm text-text-primary font-medium mb-1">No AI models available</p>
                  <p className="text-xs text-text-secondary mb-4">
                    Configure AI providers to get started
                  </p>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 bg-electric-blue/20 hover:bg-electric-blue/30 border border-electric-blue/30 rounded-md text-xs text-electric-blue transition-colors"
                  >
                    Configure Providers
                  </button>
                </div>
              ) : (
                availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                      selectedModel === model.id
                        ? 'bg-electric-blue/20 border border-electric-blue/30'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getProviderIcon(model.providerType)}</span>
                      <div className="flex flex-col items-start">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-text-primary">
                            {model.name}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${getStatusDot(model)}`}></div>
                        </div>
                        <span className="text-xs text-text-secondary">
                          {model.provider}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className={`text-xs font-medium ${getStatusColor(model)}`}>
                        {!model.isActive ? 'Inactive' : model.isHealthy ? 'Healthy' : 'Unhealthy'}
                      </span>
                      {model.lastChecked && (
                        <span className="text-xs text-text-secondary">
                          {new Date(model.lastChecked).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {lastUpdated && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-xs text-text-secondary text-center">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            )}

            {/* Error Message for Selected Model */}
            {selectedModelInfo?.errorMessage && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-400">
                  {selectedModelInfo.errorMessage}
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Settings Modal */}
      <AIProviderSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onProviderUpdated={() => {
          refreshModels();
          setLastUpdated(new Date());
        }}
      />
    </div>
  );
}