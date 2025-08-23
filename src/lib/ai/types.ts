/**
 * AI Provider Types and Interfaces
 * Defines the core types for multi-AI provider integration
 */

export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama';

export type AIProviderStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  enabled: boolean;
  priority: number;
  maxRequestsPerMinute: number;
  maxCostPerDay: number;
  models: string[];
  apiKey?: string;
  baseUrl?: string;
  healthCheckInterval: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface ProviderHealthStatus {
  providerId: string;
  status: AIProviderStatus;
  lastChecked: Date;
  responseTime?: number;
  errorMessage?: string;
  availableModels?: string[];
}

export interface AIRequest {
  userId: string;
  conceptId?: string;
  conversationId?: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  preferredProvider?: string;
  model?: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  processingTime: number;
  requestId: string;
}

export interface ProviderError extends Error {
  type: 'RATE_LIMIT' | 'API_KEY_INVALID' | 'MODEL_UNAVAILABLE' | 'TIMEOUT' | 'NETWORK_ERROR' | 'UNKNOWN';
  provider: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface ProviderMetrics {
  providerId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  lastRequestAt?: Date;
}

export interface AIProviderInstance {
  config: ProviderConfig;
  healthStatus: ProviderHealthStatus;
  metrics: ProviderMetrics;
  
  // Core methods
  generateResponse(request: AIRequest): Promise<AIResponse>;
  checkHealth(): Promise<ProviderHealthStatus>;
  updateConfig(config: Partial<ProviderConfig>): void;
  
  // Utility methods
  isHealthy(): boolean;
  canHandleRequest(request: AIRequest): boolean;
  estimateCost(request: AIRequest): number;
}