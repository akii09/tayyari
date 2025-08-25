/**
 * AIProviderRouter Tests
 * Unit tests for request routing logic and fallback mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIProviderRouter } from '../AIProviderRouter';
import type { AIRequest, ProviderConfig, AIResponse, ProviderError } from '../../types';

// Mock dependencies
vi.mock('../AIProviderService', () => ({
  aiProviderService: {
    getEnabledProviders: vi.fn(),
    getProviderById: vi.fn(),
    updateProviderHealth: vi.fn(),
    updateProviderMetrics: vi.fn(),
  },
}));

vi.mock('../AIRequestService', () => ({
  aiRequestService: {
    logRequest: vi.fn(),
  },
}));

vi.mock('../../providers', () => ({
  AIProviderFactory: {
    generateResponse: vi.fn(),
  },
}));

vi.mock('../../health', () => ({
  healthChecker: {
    isProviderHealthy: vi.fn(),
    checkProviderHealth: vi.fn(),
  },
}));

describe('AIProviderRouter', () => {
  let router: AIProviderRouter;
  let mockAIProviderService: any;
  let mockAIRequestService: any;
  let mockAIProviderFactory: any;
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

  const mockResponse: AIResponse = {
    content: 'Hello! How can I help you?',
    provider: 'openai',
    model: 'gpt-4o',
    tokens: { prompt: 10, completion: 20, total: 30 },
    cost: 0.001,
    processingTime: 1500,
    requestId: 'req-123',
  };

  beforeEach(() => {
    router = new AIProviderRouter();
    
    mockAIProviderService = require('../AIProviderService').aiProviderService;
    mockAIRequestService = require('../AIRequestService').aiRequestService;
    mockAIProviderFactory = require('../../providers').AIProviderFactory;
    mockHealthChecker = require('../../health').healthChecker;

    // Reset all mocks
    vi.clearAllMocks();
    router.reset();

    // Default mock implementations
    mockAIProviderService.getEnabledProviders.mockResolvedValue([mockProvider1, mockProvider2]);
    mockHealthChecker.isProviderHealthy.mockReturnValue(true);
    mockAIProviderFactory.generateResponse.mockResolvedValue(mockResponse);
    mockAIRequestService.logRequest.mockResolvedValue('log-id');
    mockAIProviderService.updateProviderMetrics.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('route', () => {
    it('should successfully route request to first available provider', async () => {
      const result = await router.route(mockRequest);

      expect(result.provider).toEqual(mockProvider1);
      expect(result.response).toEqual(mockResponse);
      expect(result.attempts).toBe(1);
      expect(result.fallbacksUsed).toHaveLength(0);
      expect(mockAIProviderFactory.generateResponse).toHaveBeenCalledWith(mockProvider1, mockRequest);
      expect(mockAIRequestService.logRequest).toHaveBeenCalledWith({
        userId: mockRequest.userId,
        conversationId: mockRequest.conversationId,
        conceptId: mockRequest.conceptId,
        provider: mockProvider1.type,
        model: mockResponse.model,
        promptTokens: mockResponse.tokens.prompt,
        completionTokens: mockResponse.tokens.completion,
        totalTokens: mockResponse.tokens.total,
        cost: mockResponse.cost,
        responseTime: mockResponse.processingTime,
        success: true,
      });
    });

    it('should use preferred provider when specified', async () => {
      const result = await router.route(mockRequest, { 
        userId: 'user-1',
        preferredProvider: 'provider-2' 
      });

      expect(result.provider.id).toBe('provider-2');
    });

    it('should fallback to next provider on failure', async () => {
      const error: ProviderError = {
        name: 'ProviderError',
        message: 'API Error',
        type: 'API_KEY_INVALID',
        provider: 'openai',
        retryable: false,
      };

      mockAIProviderFactory.generateResponse
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse);

      const result = await router.route(mockRequest);

      expect(result.provider).toEqual(mockProvider2);
      expect(result.attempts).toBe(2);
      expect(result.fallbacksUsed).toContain('OpenAI (API_KEY_INVALID)');
      expect(mockAIProviderFactory.generateResponse).toHaveBeenCalledTimes(2);
    });

    it('should respect rate limits', async () => {
      // Simulate rate limit by making many requests quickly
      const promises = [];
      for (let i = 0; i < 65; i++) { // Exceed the 60 requests per minute limit
        promises.push(router.route(mockRequest));
      }

      const results = await Promise.all(promises);
      
      // Some requests should have used fallback due to rate limiting
      const fallbackUsed = results.some(result => 
        result.fallbacksUsed.some(fallback => fallback.includes('rate limited'))
      );
      
      expect(fallbackUsed).toBe(true);
    });

    it('should handle circuit breaker logic', async () => {
      const error: ProviderError = {
        name: 'ProviderError',
        message: 'Service Unavailable',
        type: 'NETWORK_ERROR',
        provider: 'openai',
        retryable: true,
      };

      // Simulate multiple failures to trigger circuit breaker
      mockAIProviderFactory.generateResponse.mockRejectedValue(error);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          router.route(mockRequest).catch(err => ({ error: err.message }))
        );
      }

      await Promise.all(promises);

      // Circuit breaker should be open now
      const stats = router.getRoutingStats();
      expect(stats.circuitBreakers['provider-1']?.isOpen).toBe(true);
    });

    it('should throw error when no providers available', async () => {
      mockAIProviderService.getEnabledProviders.mockResolvedValue([]);

      await expect(router.route(mockRequest)).rejects.toThrow('No available AI providers');
    });

    it('should throw error when all providers fail', async () => {
      const error: ProviderError = {
        name: 'ProviderError',
        message: 'All failed',
        type: 'UNKNOWN',
        provider: 'openai',
        retryable: false,
      };

      mockAIProviderFactory.generateResponse.mockRejectedValue(error);

      await expect(router.route(mockRequest)).rejects.toThrow('All AI providers failed');
    });

    it('should exclude specified providers', async () => {
      const result = await router.route(mockRequest, {
        userId: 'user-1',
        excludeProviders: ['provider-1'],
      });

      expect(result.provider.id).toBe('provider-2');
    });

    it('should handle timeout errors', async () => {
      const timeoutError: ProviderError = {
        name: 'ProviderError',
        message: 'Request timeout',
        type: 'TIMEOUT',
        provider: 'openai',
        retryable: true,
      };

      mockAIProviderFactory.generateResponse
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(mockResponse);

      const result = await router.route(mockRequest);

      expect(result.provider).toEqual(mockProvider2);
      expect(result.fallbacksUsed).toContain('OpenAI (TIMEOUT)');
    });
  });

  describe('getProviderHealth', () => {
    it('should return health status for all providers', async () => {
      const mockHealthStatuses = [
        {
          providerId: 'provider-1',
          status: 'healthy' as const,
          lastChecked: new Date(),
          responseTime: 100,
        },
      ];

      mockHealthChecker.getAllHealthStatuses.mockReturnValue(mockHealthStatuses);

      const result = await router.getProviderHealth();

      expect(result).toEqual(mockHealthStatuses);
    });
  });

  describe('handleFailure', () => {
    it('should record failure and update provider health', async () => {
      const error: ProviderError = {
        name: 'ProviderError',
        message: 'Service Error',
        type: 'NETWORK_ERROR',
        provider: 'openai',
        retryable: true,
      };

      mockAIProviderService.getProviderById.mockResolvedValue(mockProvider1);

      await router.handleFailure('provider-1', error);

      expect(mockAIProviderService.updateProviderHealth).toHaveBeenCalledWith(
        'provider-1',
        'unhealthy',
        'Service Error'
      );
      expect(mockHealthChecker.checkProviderHealth).toHaveBeenCalledWith(mockProvider1);
    });
  });

  describe('updateProviderConfig', () => {
    it('should update provider config and restart health monitoring', async () => {
      const updatedProvider = { ...mockProvider1, name: 'Updated OpenAI' };
      
      mockAIProviderService.updateProvider.mockResolvedValue(updatedProvider);
      mockHealthChecker.stopHealthMonitoring = vi.fn();
      mockHealthChecker.startHealthMonitoring = vi.fn();

      await router.updateProviderConfig('provider-1', { name: 'Updated OpenAI' });

      expect(mockAIProviderService.updateProvider).toHaveBeenCalledWith('provider-1', { name: 'Updated OpenAI' });
      expect(mockHealthChecker.stopHealthMonitoring).toHaveBeenCalledWith('provider-1');
      expect(mockHealthChecker.startHealthMonitoring).toHaveBeenCalledWith(updatedProvider);
    });
  });

  describe('getRoutingStats', () => {
    it('should return routing statistics', async () => {
      // Make some requests to generate stats
      await router.route(mockRequest);
      await router.route(mockRequest);

      const stats = router.getRoutingStats();

      expect(stats).toHaveProperty('requestCounts');
      expect(stats).toHaveProperty('circuitBreakers');
      expect(stats.requestCounts['provider-1']).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset all routing state', async () => {
      // Generate some state
      await router.route(mockRequest);
      
      let stats = router.getRoutingStats();
      expect(Object.keys(stats.requestCounts)).toHaveLength(1);

      // Reset
      router.reset();
      
      stats = router.getRoutingStats();
      expect(Object.keys(stats.requestCounts)).toHaveLength(0);
      expect(Object.keys(stats.circuitBreakers)).toHaveLength(0);
    });
  });
});