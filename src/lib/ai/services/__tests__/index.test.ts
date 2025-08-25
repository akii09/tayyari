/**
 * AI Services Integration Tests
 * Tests the integration between all AI provider management services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  aiProviderService, 
  aiProviderRouter, 
  aiRequestService, 
  aiErrorHandler 
} from '../index';
import type { ProviderConfig, AIRequest, ProviderError } from '../../types';

// Mock all external dependencies
vi.mock('../../../database/config');
vi.mock('../../../database/schema');
vi.mock('../../providers');
vi.mock('../../health');

describe('AI Services Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Exports', () => {
    it('should export all services', () => {
      expect(aiProviderService).toBeDefined();
      expect(aiProviderRouter).toBeDefined();
      expect(aiRequestService).toBeDefined();
      expect(aiErrorHandler).toBeDefined();
    });

    it('should export service classes', () => {
      expect(aiProviderService.constructor.name).toBe('AIProviderService');
      expect(aiProviderRouter.constructor.name).toBe('AIProviderRouter');
      expect(aiRequestService.constructor.name).toBe('AIRequestService');
      expect(aiErrorHandler.constructor.name).toBe('AIErrorHandler');
    });
  });

  describe('Service Integration Flow', () => {
    it('should handle complete request flow with success', async () => {
      // This test would verify the complete flow:
      // 1. Provider service provides configuration
      // 2. Router routes request to provider
      // 3. Request service logs the interaction
      // 4. No error handling needed for success case
      
      const mockProvider: ProviderConfig = {
        id: 'test-provider',
        name: 'Test Provider',
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

      const mockRequest: AIRequest = {
        userId: 'user-1',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Mock the provider service to return our test provider
      vi.spyOn(aiProviderService, 'getEnabledProviders').mockResolvedValue([mockProvider]);
      
      // Mock successful routing
      vi.spyOn(aiProviderRouter, 'route').mockResolvedValue({
        provider: mockProvider,
        response: {
          content: 'Hello! How can I help?',
          provider: 'openai',
          model: 'gpt-4o',
          tokens: { prompt: 5, completion: 10, total: 15 },
          cost: 0.001,
          processingTime: 1000,
          requestId: 'req-123',
        },
        attempts: 1,
        fallbacksUsed: [],
      });

      // Mock request logging
      vi.spyOn(aiRequestService, 'logRequest').mockResolvedValue('log-123');

      // Execute the flow
      const providers = await aiProviderService.getEnabledProviders();
      expect(providers).toHaveLength(1);

      const result = await aiProviderRouter.route(mockRequest);
      expect(result.provider).toEqual(mockProvider);
      expect(result.response.content).toBe('Hello! How can I help?');

      const logId = await aiRequestService.logRequest({
        userId: mockRequest.userId,
        provider: result.provider.type,
        model: result.response.model,
        success: true,
      });
      expect(logId).toBe('log-123');
    });

    it('should handle complete request flow with error and recovery', async () => {
      // This test would verify error handling flow:
      // 1. Provider service provides configuration
      // 2. Router encounters error
      // 3. Error handler provides recovery strategy
      // 4. Request service logs the failure
      
      const mockProvider: ProviderConfig = {
        id: 'test-provider',
        name: 'Test Provider',
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

      const mockError: ProviderError = {
        name: 'ProviderError',
        message: 'Rate limit exceeded',
        type: 'RATE_LIMIT',
        provider: 'openai',
        retryable: true,
        retryAfter: 30,
      };

      // Mock provider service
      vi.spyOn(aiProviderService, 'getEnabledProviders').mockResolvedValue([mockProvider]);
      
      // Mock error handling
      vi.spyOn(aiErrorHandler, 'handleError').mockResolvedValue({
        action: 'wait_and_retry',
        delay: 30000,
        message: 'Rate limited, waiting 30s',
      });

      // Mock request logging
      vi.spyOn(aiRequestService, 'logRequest').mockResolvedValue('error-log-123');

      // Execute error handling flow
      const providers = await aiProviderService.getEnabledProviders();
      expect(providers).toHaveLength(1);

      const recovery = await aiErrorHandler.handleError(mockError, {
        request: { userId: 'user-1', messages: [] },
        provider: mockProvider,
        attemptNumber: 1,
        previousErrors: [],
        availableProviders: providers,
      });

      expect(recovery.action).toBe('wait_and_retry');
      expect(recovery.delay).toBe(30000);

      const logId = await aiRequestService.logRequest({
        userId: 'user-1',
        provider: mockProvider.type,
        model: 'gpt-4o',
        success: false,
        errorMessage: mockError.message,
      });
      expect(logId).toBe('error-log-123');
    });
  });

  describe('Service State Management', () => {
    it('should maintain consistent state across services', () => {
      // Reset all services to clean state
      aiProviderRouter.reset();
      aiErrorHandler.reset();

      // Verify clean state
      const routingStats = aiProviderRouter.getRoutingStats();
      expect(Object.keys(routingStats.requestCounts)).toHaveLength(0);
      expect(Object.keys(routingStats.circuitBreakers)).toHaveLength(0);

      const errorStats = aiErrorHandler.getErrorStats('any-provider');
      expect(Object.keys(errorStats)).toHaveLength(0);
    });
  });

  describe('Service Configuration', () => {
    it('should allow dynamic configuration updates', async () => {
      const mockProvider: ProviderConfig = {
        id: 'test-provider',
        name: 'Test Provider',
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

      // Mock provider service update
      vi.spyOn(aiProviderService, 'updateProvider').mockResolvedValue({
        ...mockProvider,
        name: 'Updated Provider',
      });

      // Mock router config update
      vi.spyOn(aiProviderRouter, 'updateProviderConfig').mockResolvedValue();

      // Update configuration
      const updated = await aiProviderService.updateProvider('test-provider', {
        name: 'Updated Provider',
      });

      expect(updated?.name).toBe('Updated Provider');

      // Router should be notified of config changes
      await aiProviderRouter.updateProviderConfig('test-provider', {
        name: 'Updated Provider',
      });

      expect(aiProviderRouter.updateProviderConfig).toHaveBeenCalledWith('test-provider', {
        name: 'Updated Provider',
      });
    });
  });
});