"use client";

import { useState, useRef, useEffect } from "react";
import { GlassCard } from "@/components/base/GlassCard";
import { Button } from "@/components/base/Button";
import { 
  ChevronDownIcon, 
  CheckIcon, 
  AlertTriangleIcon,
  ZapIcon,
  DollarSignIcon,
  ClockIcon,
  WifiIcon,
  WifiOffIcon,
  SettingsIcon
} from "@/components/icons/Icons";

interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama';
  enabled: boolean;
  priority: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  models: string[];
  currentModel?: string;
  metrics: {
    responseTime: number;
    successRate: number;
    totalRequests: number;
    totalCost: number;
  };
  lastChecked: Date;
}

interface AIProviderSelectorProps {
  providers: AIProvider[];
  selectedProvider: AIProvider | null;
  onProviderChange: (provider: AIProvider) => void;
  onModelChange: (model: string) => void;
  onOpenSettings: () => void;
  isLoading?: boolean;
  autoSelect?: boolean;
}

const providerIcons: Record<string, string> = {
  openai: "🤖",
  anthropic: "🧠",
  google: "🔍",
  mistral: "🌪️",
  ollama: "🦙",
};

const statusColors = {
  healthy: "text-green-400 bg-green-400/10",
  degraded: "text-yellow-400 bg-yellow-400/10",
  unhealthy: "text-red-400 bg-red-400/10",
  unknown: "text-gray-400 bg-gray-400/10",
};

const statusIcons = {
  healthy: WifiIcon,
  degraded: AlertTriangleIcon,
  unhealthy: WifiOffIcon,
  unknown: AlertTriangleIcon,
};

export function AIProviderSelector({
  providers,
  selectedProvider,
  onProviderChange,
  onModelChange,
  onOpenSettings,
  isLoading = false,
  autoSelect = true,
}: AIProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowModels(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-select best provider if none selected
  useEffect(() => {
    if (autoSelect && !selectedProvider && providers.length > 0) {
      const healthyProviders = providers
        .filter(p => p.enabled && p.status === 'healthy')
        .sort((a, b) => a.priority - b.priority);
      
      if (healthyProviders.length > 0) {
        onProviderChange(healthyProviders[0]);
      }
    }
  }, [providers, selectedProvider, autoSelect, onProviderChange]);

  const enabledProviders = providers.filter(p => p.enabled);
  const healthyProviders = enabledProviders.filter(p => p.status === 'healthy');
  const degradedProviders = enabledProviders.filter(p => p.status === 'degraded');
  const unhealthyProviders = enabledProviders.filter(p => p.status === 'unhealthy');

  const handleProviderSelect = (provider: AIProvider) => {
    onProviderChange(provider);
    setIsOpen(false);
    setShowModels(false);
  };

  const handleModelSelect = (model: string) => {
    onModelChange(model);
    setShowModels(false);
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Provider Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          w-full flex items-center justify-between p-3 rounded-lg transition-all
          ${selectedProvider 
            ? 'glass-card hover:bg-white/10' 
            : 'border-2 border-dashed border-white/20 hover:border-white/40'
          }
          ${isLoading ? 'animate-pulse cursor-not-allowed' : ''}
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          {selectedProvider ? (
            <>
              <div className="text-xl">
                {providerIcons[selectedProvider.type] || "🤖"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary truncate">
                    {selectedProvider.name}
                  </span>
                  <StatusIndicator provider={selectedProvider} />
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span>{selectedProvider.currentModel || selectedProvider.models[0]}</span>
                  <span>•</span>
                  <span>{formatResponseTime(selectedProvider.metrics.responseTime)}</span>
                  <span>•</span>
                  <span>{Math.round(selectedProvider.metrics.successRate)}% success</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <ZapIcon size={20} className="text-text-muted" />
              <div className="text-left">
                <div className="font-medium text-text-secondary">Select AI Provider</div>
                <div className="text-xs text-text-muted">Choose your AI assistant</div>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedProvider && selectedProvider.models.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModels(!showModels);
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Change model"
            >
              <SettingsIcon size={14} className="text-text-secondary" />
            </button>
          )}
          <ChevronDownIcon 
            size={16} 
            className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Model Selector */}
      {showModels && selectedProvider && selectedProvider.models.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <GlassCard className="p-2">
            <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
              Available Models
            </div>
            <div className="space-y-1">
              {selectedProvider.models.map(model => (
                <button
                  key={model}
                  onClick={() => handleModelSelect(model)}
                  className={`
                    w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left
                    ${(selectedProvider.currentModel || selectedProvider.models[0]) === model
                      ? 'bg-electric-blue/20 text-electric-blue'
                      : 'hover:bg-white/5 text-text-primary'
                    }
                  `}
                >
                  <span className="font-medium">{model}</span>
                  {(selectedProvider.currentModel || selectedProvider.models[0]) === model && (
                    <CheckIcon size={14} />
                  )}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Provider Dropdown */}
      {isOpen && !showModels && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <GlassCard className="p-2 max-h-96 overflow-y-auto">
            {/* Healthy Providers */}
            {healthyProviders.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-green-400 uppercase tracking-wide">
                  Available ({healthyProviders.length})
                </div>
                <div className="space-y-1">
                  {healthyProviders.map(provider => (
                    <ProviderOption
                      key={provider.id}
                      provider={provider}
                      isSelected={selectedProvider?.id === provider.id}
                      onClick={() => handleProviderSelect(provider)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Degraded Providers */}
            {degradedProviders.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-yellow-400 uppercase tracking-wide">
                  Degraded ({degradedProviders.length})
                </div>
                <div className="space-y-1">
                  {degradedProviders.map(provider => (
                    <ProviderOption
                      key={provider.id}
                      provider={provider}
                      isSelected={selectedProvider?.id === provider.id}
                      onClick={() => handleProviderSelect(provider)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unhealthy Providers */}
            {unhealthyProviders.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-red-400 uppercase tracking-wide">
                  Unavailable ({unhealthyProviders.length})
                </div>
                <div className="space-y-1">
                  {unhealthyProviders.map(provider => (
                    <ProviderOption
                      key={provider.id}
                      provider={provider}
                      isSelected={selectedProvider?.id === provider.id}
                      onClick={() => handleProviderSelect(provider)}
                      disabled
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            <div className="border-t border-white/10 pt-2">
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-electric-blue/20 rounded-lg flex items-center justify-center">
                  <SettingsIcon size={16} className="text-electric-blue" />
                </div>
                <div>
                  <div className="font-medium text-text-primary">Provider Settings</div>
                  <div className="text-xs text-text-secondary">Configure AI providers</div>
                </div>
              </button>
            </div>

            {/* No Providers */}
            {enabledProviders.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                <ZapIcon size={32} className="mx-auto mb-3 text-text-muted" />
                <p className="font-medium">No AI providers available</p>
                <p className="text-sm text-text-muted mt-1">Configure providers to get started</p>
                <Button
                  onClick={() => {
                    onOpenSettings();
                    setIsOpen(false);
                  }}
                  className="mt-3"
                  size="sm"
                >
                  Open Settings
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

interface StatusIndicatorProps {
  provider: AIProvider;
}

function StatusIndicator({ provider }: StatusIndicatorProps) {
  const StatusIcon = statusIcons[provider.status];
  
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusColors[provider.status]}`}>
      <StatusIcon size={10} />
      <span className="capitalize">{provider.status}</span>
    </div>
  );
}

interface ProviderOptionProps {
  provider: AIProvider;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ProviderOption({ provider, isSelected, onClick, disabled }: ProviderOptionProps) {
  const formatLastChecked = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${(cost * 1000).toFixed(1)}m`;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
        ${isSelected 
          ? 'bg-electric-blue/20 ring-1 ring-electric-blue' 
          : disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-white/5'
        }
      `}
    >
      <div className="flex-shrink-0">
        <div className="text-lg">
          {providerIcons[provider.type] || "🤖"}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-text-primary truncate">
            {provider.name}
          </span>
          {isSelected && <CheckIcon size={14} className="text-electric-blue" />}
          <StatusIndicator provider={provider} />
        </div>

        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <ClockIcon size={12} />
            <span>{formatResponseTime(provider.metrics.responseTime)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <ZapIcon size={12} />
            <span>{Math.round(provider.metrics.successRate)}%</span>
          </div>
          
          <div className="flex items-center gap-1">
            <DollarSignIcon size={12} />
            <span>{formatCost(provider.metrics.totalCost)}</span>
          </div>
          
          <span className="text-text-muted">
            {formatLastChecked(provider.lastChecked)}
          </span>
        </div>

        <div className="text-xs text-text-muted mt-1">
          {provider.models.length} model{provider.models.length > 1 ? 's' : ''} • 
          Priority {provider.priority} • 
          {provider.metrics.totalRequests} requests
        </div>
      </div>
    </button>
  );
}