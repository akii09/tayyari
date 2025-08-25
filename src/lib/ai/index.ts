/**
 * AI Provider Integration - Main Export
 * Exports all AI-related functionality for the multi-AI context system
 */

// Types and interfaces
export type {
  AIProviderType,
  AIProviderStatus,
  ProviderConfig,
  ProviderHealthStatus,
  AIRequest,
  AIResponse,
  ProviderError,
  ProviderMetrics,
  AIProviderInstance,
} from './types';

// Configuration utilities
export {
  DEFAULT_PROVIDER_CONFIGS,
  createProviderConfig,
  validateProviderConfig,
  getEnvironmentConfig,
} from './config';

// Health checking
export {
  ProviderHealthChecker,
  healthChecker,
} from './health';

// Provider factory and utilities
export {
  AIProviderFactory,
  canProviderHandleRequest,
} from './providers';