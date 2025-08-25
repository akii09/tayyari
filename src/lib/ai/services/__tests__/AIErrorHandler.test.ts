/**
 * AIErrorHandler Tests
 * Unit tests for error handling and recovery systems
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIErrorHandler } from '../AIErrorHandler';
import type { ProviderError, ProviderConfig, AIRequest, ErrorContext } from '../../types';

// Mock dependencies
vi.mock('../AIProviderService', () => ({
  aiProviderService: {
    toggleProvider: vi.fn(),
  },
}));

vi.mock('../AIRequestService', () => ({
  aiRequestService: {
    logRequest: vi.fn(),
  },
}));

vi.mock('../../health', () => ({
  healthChecker: {
    isProviderHealthy: vi.fn(),
  },
}));

describe('AIErrorHandler', () => {
  let errorHandler: AIErrorHandler;
  let mockAIProviderService: any;
  let mockAIRequestService: any;
  let mockHealthChecker: any;

  const mockProvider1: ProviderConfig = {
    id: 'provider-1',
    name: 'OpenAI',
    type: 'openai',
    enabled: true,
    priority: 1,
    maxRequestsPerMinute: 60,
    maxCostPerDay: 10,
    models: ['gpt-4o'],
    healthCheckInterval: 300000,
    timeout: 30000,
    retryAttempts: 3,
  };

  const mockProvider2: ProviderConfig = {
    id: 'provider-2',
    name: 'Claude',
    type: 'anthropic',
    enabled: true,
    priority: 2,
    maxRequestsPerMinute: 60,
    maxCostPerDay: 10,
    models: ['claude-3-5-sonnet-20241022'],
    healthCheckInterval: 300000,
    timeout: 30000,
    retryAttempts: 3,
  };

  const mockRequest: AIRequest = {
    userId: 'user-1',
    messages: [{ role: 'user', content: 'Hello' }],
    maxTokens: 100,
  };

  const mockContext: ErrorContext = {
    request: mockRequest,
    provider: mockProvider1,
    attemptNumber: 1,
    previousErrors: [],
    availableProviders: [mockProvider1, mockProvider2],
  };

  beforeEach(() => {
    errorHandler = new AIErrorHandler();
    
    mockAIProviderService = require('../AIProviderService').aiProviderService;
    mockAIRequestService = require('../AIRequestService').aiRequestService;
    mockHealthChecker = require('../../health').healthChecker;

    // Reset all mocks
    vi.clearAllMocks();
    errorHandler.reset();

    // Default mock implementations
    mockAIRequestService.logRequest.mockResolvedValue('log-id');
    mockHealthChecker.isProviderHealthy.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleError', () => {
    it('should handle rate limit errors with backoff', async () => {
      const rateLimitError: ProviderError = {
        name: 'ProviderError',
        message: 'Rate limit exceeded',
        type: 'RATE_LIMIT',
        provider: 'openai',
        retryable: true,
        retryAfter: 30,
      };

      const result = await errorHandler.handleError(rateLimitError, mockContext);

      expect(result.action).toBe('wait_and_retry');
      expect(result.delay).toBe(30000); // 30 seconds in milliseconds
      expect(result.message).toContain('Rate limited');
    });

    it('should fallback to another provider for long rate limit delays', async () => {
      const rateLimitError: ProviderError = {
        name: 'ProviderError',
        message: 'Rate limit exceeded',
        type: 'RATE_LIMIT',
        provider: 'openai',
        retryable: true,
        retryAfter: 120, // 2 minutes - too long
      };

      const result = await errorHandler.handleError(rateLimitError, mockContext);

      expect(result.action).toBe('fallback');
      expect(result.fallbackProvider).toEqual(mockProvider2);
      expect(result.message).toContain('switching to Claude');
    });

    it('should handle API key errors by disabling provider and falling back', async () => {
      const apiKeyError: ProviderError = {
        name: 'ProviderError',
        message: 'Invalid API key',
        type: 'API_KEY_INVALID',
        provider: 'openai',
        retryable: false,
      };

      const result = await errorHandler.handleError(apiKeyError, mockContext);

      expect(result.action).toBe('fallback');
      expect(result.fallbackProvider).toEqual(mockProvider2);
      expect(mockAIProviderService.toggleProvider).toHaveBeenCalledWith('provider-1', false);
    });

    it('should try alternative models for model unavailable errors', async () => {
      const modelError: ProviderError = {
        name: 'ProviderError',
        message: 'Model not available',
        type: 'MODEL_UNAVAILABLE',
        provider: 'openai',
        retryable: false,
      };

      const providerWithMultipleModels = {
        ...mockProvider1,
        models: ['gpt-4o', 'gpt-4o-mini'],
      };

      const contextWithMultipleModels = {
        ...mockContext,
        provider: providerWithMultipleModels,
        request: { ...mockRequest, model: 'gpt-4o' },
      };

      const result = await errorHandler.handleError(modelError, contextWithMultipleModels);

      expect(result.action).toBe('retry');
      expect(result.modifiedRequest?.model).toBe('gpt-4o-mini');
    });

    it('should handle timeout errors with reduced token limit', async () => {
      const timeoutError: ProviderError = {
        name: 'ProviderError',
        message: 'Request timeout',
        type: 'TIMEOUT',
        provider: 'openai',
        retryable: true,
      };

      const result = await errorHandler.handleError(timeoutError, mockContext);

      expect(result.action).toBe('retry');
      expect(result.modifiedRequest?.maxTokens).toBe(500); // Reduced from 1000
      expect(result.delay).toBeGreaterThan(0);
    });

    it('should fallback after multiple timeout attempts', async () => {
      const timeoutError: ProviderError = {
        name: 'ProviderError',
        message: 'Request timeout',
        type: 'TIMEOUT',
        provider: 'openai',
        retryable: true,
      };

      const contextWithMultipleAttempts = {
        ...mockContext,
        attemptNumber: 3,
      };

      const result = await errorHandler.handleError(timeoutError, contextWithMultipleAttempts);

      expect(result.action).toBe('fallback');
      expect(result.fallbackProvider).toEqual(mockProvider2);
    });

    it('should handle network errors with exponential backoff', async () => {
      const networkError: ProviderError = {
        name: 'ProviderError',
        message: 'Network connection failed',
        type: 'NETWORK_ERROR',
        provider: 'openai',
        retryable: true,
      };

      const result = await errorHandler.handleError(networkError, mockContext);

      expect(result.action).toBe('wait_and_retry');
      expect(result.delay).toBeGreaterThan(0);
    });

    it('should fallback after multiple network errors', async () => {
      const networkError: ProviderError = {
        name: 'ProviderError',
        message: 'Network connection failed',
        type: 'NETWORK_ERROR',
        provider: 'openai',
        retryable: true,
      };

      const contextWithMultipleAttempts = {
        ...mockContext,
        attemptNumber: 4,
      };

      const result = await errorHandler.handleError(networkError, contextWithMultipleAttempts);

      expect(result.action).toBe('fallback');
      expect(result.fallbackProvider).toEqual(mockProvider2);
    });

    it('should handle unknown errors with generic fallback', async () => {
      const unknownError: ProviderError = {
        name: 'ProviderError',
        message: 'Something went wrong',
        type: 'UNKNOWN',
        provider: 'openai',
        retryable: false,
      };

      const result = await errorHandler.handleError(unknownError, mockContext);

      expect(result.action).toBe('wait_and_retry');
      expect(result.message).toContain('Unknown error, retrying');
    });

    it('should fail when no recovery strategy works', async () => {
      const unknownError: ProviderError = {
        name: 'ProviderError',
        message: 'Unrecoverable error',
        type: 'UNKNOWN',
        provider: 'openai',
        retryable: false,
      };

      const contextWithNoFallback = {
        ...mockContext,
        availableProviders: [mockProvider1], // Only current provider
        attemptNumber: 3,
      };

      const result = await errorHandler.handleError(unknownError, contextWithNoFallback);

      expect(result.action).toBe('fail');
      expect(result.message).toContain('no recovery options');
    });
  });

  describe('addRecoveryStrategy', () => {
    it('should add custom recovery strategy', async () => {
      const customStrategy = {
        name: 'custom_strategy',
        priority: 15,
        canHandle: (error: ProviderError) => error.type === 'UNKNOWN',
        handle: async () => ({
          action: 'retry' as const,
          message: 'Custom recovery',
        }),
      };

      errorHandler.addRecoveryStrategy(customStrategy);

      const strategies = errorHandler.getRecoveryStrategies();
      expect(strategies.some(s => s.name === 'custom_strategy')).toBe(true);
    });
  });

  describe('removeRecoveryStrategy', () => {
    it('should remove recovery strategy', () => {
      const result = errorHandler.removeRecoveryStrategy('rate_limit_backoff');
      expect(result).toBe(true);

      const strategies = errorHandler.getRecoveryStrategies();
      expect(strategies.some(s => s.name === 'rate_limit_backoff')).toBe(false);
    });

    it('should return false for non-existent strategy', () => {
      const result = errorHandler.removeRecoveryStrategy('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('getErrorStats', () => {
    it('should track error statistics', async () => {
      const error: ProviderError = {
        name: 'ProviderError',
        message: 'Rate limit',
        type: 'RATE_LIMIT',
        provider: 'openai',
        retryable: true,
      };

      await errorHandler.handleError(error, mockContext);
      await errorHandler.handleError(error, mockContext);

      const stats = errorHandler.getErrorStats('provider-1');
      expect(stats.RATE_LIMIT).toBe(2);
    });
  });

  describe('isProviderUnstable', () => {
    it('should detect unstable providers', async () => {
      const error: ProviderError = {
        name: 'ProviderError',
        message: 'Error',
        type: 'NETWORK_ERROR',
        provider: 'openai',
        retryable: true,
      };

      // Generate multiple errors
      for (let i = 0; i < 12; i++) {
        await errorHandler.handleError(error, mockContext);
      }

      const isUnstable = errorHandler.isProviderUnstable('provider-1', 10);
      expect(isUnstable).toBe(true);
    });

    it('should not flag stable providers as unstable', async () => {
      const error: ProviderError = {
        name: 'ProviderError',
        message: 'Error',
        type: 'NETWORK_ERROR',
        provider: 'openai',
        retryable: true,
      };

      // Generate few errors
      for (let i = 0; i < 5; i++) {
        await errorHandler.handleError(error, mockContext);
      }

      const isUnstable = errorHandler.isProviderUnstable('provider-1', 10);
      expect(isUnstable).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset error tracking', async () => {
      const error: ProviderError = {
        name: 'ProviderError',
        message: 'Error',
        type: 'RATE_LIMIT',
        provider: 'openai',
        retryable: true,
      };

      await errorHandler.handleError(error, mockContext);
      
      let stats = errorHandler.getErrorStats('provider-1');
      expect(stats.RATE_LIMIT).toBe(1);

      errorHandler.reset();
      
      stats = errorHandler.getErrorStats('provider-1');
      expect(stats.RATE_LIMIT).toBeUndefined();
    });
  });

  describe('getRecoveryStrategies', () => {
    it('should return all recovery strategies', () => {
      const strategies = errorHandler.getRecoveryStrategies();
      
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.name === 'rate_limit_backoff')).toBe(true);
      expect(strategies.some(s => s.name === 'api_key_fallback')).toBe(true);
      expect(strategies.some(s => s.name === 'model_fallback')).toBe(true);
      expect(strategies.some(s => s.name === 'timeout_retry')).toBe(true);
      expect(strategies.some(s => s.name === 'network_retry')).toBe(true);
      expect(strategies.some(s => s.name === 'generic_fallback')).toBe(true);
    });

    it('should return strategies sorted by priority', () => {
      const strategies = errorHandler.getRecoveryStrategies();
      
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].priority).toBeGreaterThanOrEqual(strategies[i].priority);
      }
    });
  });
});