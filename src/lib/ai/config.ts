/**
 * AI Provider Configuration
 * Default configurations and utilities for AI providers
 */

import type { ProviderConfig, AIProviderType } from './types';

export const DEFAULT_PROVIDER_CONFIGS: Record<AIProviderType, Omit<ProviderConfig, 'id' | 'apiKey'>> = {
  openai: {
    name: 'OpenAI',
    type: 'openai',
    enabled: true,
    priority: 1,
    maxRequestsPerMinute: 60,
    maxCostPerDay: 10.0,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    healthCheckInterval: 300000, // 5 minutes
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
  anthropic: {
    name: 'Anthropic Claude',
    type: 'anthropic',
    enabled: true,
    priority: 2,
    maxRequestsPerMinute: 50,
    maxCostPerDay: 10.0,
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    healthCheckInterval: 300000,
    timeout: 30000,
    retryAttempts: 3,
  },
  google: {
    name: 'Google Gemini',
    type: 'google',
    enabled: true,
    priority: 3,
    maxRequestsPerMinute: 60,
    maxCostPerDay: 10.0,
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    healthCheckInterval: 300000,
    timeout: 30000,
    retryAttempts: 3,
  },
  mistral: {
    name: 'Mistral AI',
    type: 'mistral',
    enabled: true,
    priority: 4,
    maxRequestsPerMinute: 60,
    maxCostPerDay: 10.0,
    models: ['mistral-large-latest', 'mistral-small-latest'],
    healthCheckInterval: 300000,
    timeout: 30000,
    retryAttempts: 3,
  },
  ollama: {
    name: 'Ollama Local',
    type: 'ollama',
    enabled: true,
    priority: 5,
    maxRequestsPerMinute: 100,
    maxCostPerDay: 0, // Local models have no API cost
    models: ['llama3.2', 'mistral', 'codellama'],
    baseUrl: 'http://localhost:11434',
    healthCheckInterval: 60000, // 1 minute for local
    timeout: 60000, // Longer timeout for local models
    retryAttempts: 2,
  },
};

export function createProviderConfig(
  type: AIProviderType,
  overrides: Partial<ProviderConfig> = {}
): ProviderConfig {
  const defaultConfig = DEFAULT_PROVIDER_CONFIGS[type];
  const id = overrides.id || `${type}-${Date.now()}`;
  
  return {
    id,
    ...defaultConfig,
    ...overrides,
  };
}

export function validateProviderConfig(config: ProviderConfig): string[] {
  const errors: string[] = [];
  
  if (!config.id) {
    errors.push('Provider ID is required');
  }
  
  if (!config.name) {
    errors.push('Provider name is required');
  }
  
  if (!config.type) {
    errors.push('Provider type is required');
  }
  
  if (config.priority < 1) {
    errors.push('Provider priority must be at least 1');
  }
  
  if (config.maxRequestsPerMinute < 1) {
    errors.push('Max requests per minute must be at least 1');
  }
  
  if (config.maxCostPerDay < 0) {
    errors.push('Max cost per day cannot be negative');
  }
  
  if (!config.models || config.models.length === 0) {
    errors.push('At least one model must be specified');
  }
  
  if (config.healthCheckInterval < 10000) {
    errors.push('Health check interval must be at least 10 seconds');
  }
  
  // Type-specific validations
  if (config.type !== 'ollama' && !config.apiKey) {
    errors.push(`API key is required for ${config.type} provider`);
  }
  
  if (config.type === 'ollama' && !config.baseUrl) {
    errors.push('Base URL is required for Ollama provider');
  }
  
  return errors;
}

export function getEnvironmentConfig(): Partial<Record<AIProviderType, { apiKey?: string; baseUrl?: string }>> {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY,
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    },
  };
}