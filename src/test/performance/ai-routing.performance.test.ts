/**
 * AI Provider Routing Performance Tests
 * Tests for AI provider routing, fallback mechanisms, and load balancing performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { AIProviderRouter } from '../../lib/ai/services/AIProviderRouter';
import { aiProviderService } from '../../lib/ai/services/AIProviderService';
import { aiRequestService } from '../../lib/ai/services/AIRequestService';
import { healthChecker } from '../../lib/ai/health';
import type { AIRequest, ProviderConfig, AIResponse, ProviderError } from '../../lib/ai/types';

// Mock dependencies
vi.mock('../../lib/ai/services/AIProviderService');
vi.mock('../../lib/ai/services/AIRequestService');
vi.mock('../../lib/ai/health');
vi.mock('../../lib/ai/providers');

describe('AI Provider Routing Performance', () => {
  let router: AIProviderRouter;
  let mockProviders: ProviderConfig[];

  const createMockProvider = (id: string, name: string, type: string, priority: number): ProviderConfig => ({
    id,
    name,
    type,
    enabled: true,
    priority,
    maxRequestsPerMinute: 60,
    maxCostPerDay: 10,
    models: [`${type}-model`],
    healthCheckInterval: 300000,
    timeout: 30000,
    retryAttempts: 3,
  });

  const createMockRequest = (userId: string = 'test-user'): AIRequest => ({
    userId,
    messages: [{ role: 'user', content: 'Test message' }],
    maxTokens: 100,
    temperature: 0.7,
  });

  const createMockResponse = (provider: string, model: string): AIResponse => ({
    content: `Response from ${provider}`,
    provider,
    model,
    tokens: { prompt: 20, completion: 30, total: 50 },
    cost: 0.001,
    processingTime: 1000,
    requestId: `req-${Date.now()}`,
  });

  beforeEach(() => {
    router = new AIProviderRouter();
    
    mockProviders = [
      createMockProvider('openai-1', 'OpenAI Primary', 'openai', 1),
      createMockProvider('openai-2', 'OpenAI Secondary', 'openai', 2),
      createMockProvider('claude-1', 'Claude Primary', 'anthropic', 3),
      createMockProvider('gemini-1', 'Gemini Primary', 'google', 4),
      createMockProvider('ollama-1', 'Ollama Local', 'ollama', 5),
    ];

    // Setup default mocks
    vi.mocked(aiProviderService.getEnabledProviders).mockResolvedValue(mockProviders);
    vi.mocked(healthChecker.isProviderHealthy).mockReturnValue(true);
    vi.mocked(aiRequestService.logRequest).mockResolvedValue('log-id');
    vi.mocked(aiProviderService.updateProviderMetrics).mockResolvedValue(undefined);

    // Mock AI provider factory
    const mockAIProviderFactory = require('../../lib/ai/providers').AIProviderFactory;
    vi.mocked(mockAIProviderFactory.generateResponse).mockImplementation(
      async (provider: ProviderConfig) => {
        // Simulate realistic response times
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return createMockResponse(provider.type, provider.models[0]);
      }
    );

    vi.clearAllMocks();
    router.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Single Request Performance', () => {
    it('should route single request efficiently', async () => {
      const request = createMockRequest();
      
      const startTime = performance.now();
      const result = await router.route(request);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result.provider).toBeDefined();
      expect(result.response).toBeDefined();
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      
      console.log(`Single request routing took ${duration.toFixed(2)}ms`);
    });

    it('should handle provider selection efficiently', async () => {
      const request = createMockRequest();
      const iterations = 100;
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: iterations }, () => router.route(request));
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / iterations;
      
      expect(results).toHaveLength(iterations);
      expect(avgDuration).toBeLessThan(100); // Average should be under 100ms
      
      console.log(`${iterations} requests took ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms average`);
    });

    it('should handle preferred provider selection quickly', async () => {
      const request = createMockRequest();
      const preferredProvider = 'claude-1';
      
      const startTime = performance.now();
      
      const result = await router.route(request, {
        userId: 'test-user',
        preferredProvider,
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(result.provider.id).toBe(preferredProvider);
      expect(duration).toBeLessThan(200); // Should be faster with preferred provider
      
      console.log(`Preferred provider routing took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        createMockRequest(`user-${i}`)
      );
      
      const startTime = performance.now();
      
      const promises = requests.map(request => router.route(request));
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / concurrentRequests;
      
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.provider).toBeDefined();
        expect(result.response).toBeDefined();
      });
      
      expect(avgDuration).toBeLessThan(200); // Average should be under 200ms
      
      console.log(`${concurrentRequests} concurrent requests took ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms average`);
    });

    it('should distribute load across providers', async () => {
      const requestCount = 100;
      const requests = Array.from({ length: requestCount }, (_, i) => 
        createMockRequest(`user-${i}`)
      );
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        requests.map(request => router.route(request))
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Analyze provider distribution
      const providerCounts = results.reduce((acc, result) => {
        acc[result.provider.id] = (acc[result.provider.id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(Object.keys(providerCounts).length).toBeGreaterThan(1); // Should use multiple providers
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`Load distribution across providers:`, providerCounts);
      console.log(`${requestCount} requests distributed in ${duration.toFixed(2)}ms`);
    });

    it('should handle rate limiting efficiently', async () => {
      // Simulate rate limiting by reducing max requests per minute
      const limitedProviders = mockProviders.map(p => ({
        ...p,
        maxRequestsPerMinute: 10, // Very low limit
      }));
      
      vi.mocked(aiProviderService.getEnabledProviders).mockResolvedValue(limitedProviders);
      
      const requestCount = 30; // Exceed rate limit
      const requests = Array.from({ length: requestCount }, (_, i) => 
        createMockRequest(`rate-limit-user-${i}`)
      );
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        requests.map(request => 
          router.route(request).catch(error => ({ error: error.message }))
        )
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const successfulRequests = results.filter(r => !('error' in r));
      const failedRequests = results.filter(r => 'error' in r);
      
      expect(successfulRequests.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(15000); // Should handle gracefully within 15 seconds
      
      console.log(`Rate limiting test: ${successfulRequests.length} successful, ${failedRequests.length} failed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Fallback Performance', () => {
    it('should handle provider failures with minimal delay', async () => {
      const mockAIProviderFactory = require('../../lib/ai/providers').AIProviderFactory;
      
      // Mock first provider to fail, second to succeed
      vi.mocked(mockAIProviderFactory.generateResponse)
        .mockRejectedValueOnce(new Error('Provider 1 failed'))
        .mockResolvedValueOnce(createMockResponse('anthropic', 'claude-model'));
      
      const request = createMockRequest();
      
      const startTime = performance.now();
      const result = await router.route(request);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result.provider.type).toBe('anthropic'); // Should fallback to Claude
      expect(result.attempts).toBe(2);
      expect(result.fallbacksUsed).toHaveLength(1);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Fallback routing took ${duration.toFixed(2)}ms with ${result.attempts} attempts`);
    });

    it('should handle multiple provider failures efficiently', async () => {
      const mockAIProviderFactory = require('../../lib/ai/providers').AIProviderFactory;
      
      // Mock first 3 providers to fail, 4th to succeed
      vi.mocked(mockAIProviderFactory.generateResponse)
        .mockRejectedValueOnce(new Error('Provider 1 failed'))
        .mockRejectedValueOnce(new Error('Provider 2 failed'))
        .mockRejectedValueOnce(new Error('Provider 3 failed'))
        .mockResolvedValueOnce(createMockResponse('google', 'gemini-model'));
      
      const request = createMockRequest();
      
      const startTime = performance.now();
      const result = await router.route(request);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result.provider.type).toBe('google'); // Should fallback to Gemini
      expect(result.attempts).toBe(4);
      expect(result.fallbacksUsed).toHaveLength(3);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      console.log(`Multiple fallback routing took ${duration.toFixed(2)}ms with ${result.attempts} attempts`);
    });

    it('should handle concurrent failures efficiently', async () => {
      const mockAIProviderFactory = require('../../lib/ai/providers').AIProviderFactory;
      
      // Mock intermittent failures
      let callCount = 0;
      vi.mocked(mockAIProviderFactory.generateResponse).mockImplementation(
        async (provider: ProviderConfig) => {
          callCount++;
          // Fail every 3rd call
          if (callCount % 3 === 0) {
            throw new Error(`Intermittent failure for ${provider.name}`);
          }
          await new Promise(resolve => setTimeout(resolve, 50));
          return createMockResponse(provider.type, provider.models[0]);
        }
      );
      
      const requestCount = 20;
      const requests = Array.from({ length: requestCount }, (_, i) => 
        createMockRequest(`failure-test-user-${i}`)
      );
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        requests.map(request => 
          router.route(request).catch(error => ({ error: error.message }))
        )
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const successfulRequests = results.filter(r => !('error' in r));
      const failedRequests = results.filter(r => 'error' in r);
      
      expect(successfulRequests.length).toBeGreaterThan(failedRequests.length);
      expect(duration).toBeLessThan(5000); // Should handle within 5 seconds
      
      console.log(`Concurrent failure handling: ${successfulRequests.length} successful, ${failedRequests.length} failed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Circuit Breaker Performance', () => {
    it('should activate circuit breaker efficiently', async () => {
      const mockAIProviderFactory = require('../../lib/ai/providers').AIProviderFactory;
      
      // Mock consistent failures to trigger circuit breaker
      vi.mocked(mockAIProviderFactory.generateResponse).mockRejectedValue(
        new Error('Consistent failure')
      );
      
      const requestCount = 10;
      const requests = Array.from({ length: requestCount }, (_, i) => 
        createMockRequest(`circuit-test-user-${i}`)
      );
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        requests.map(request => 
          router.route(request).catch(error => ({ error: error.message }))
        )
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Later requests should fail faster due to circuit breaker
      const avgDuration = duration / requestCount;
      expect(avgDuration).toBeLessThan(500); // Should fail fast
      
      const stats = router.getRoutingStats();
      const circuitBreakerStates = Object.values(stats.circuitBreakers);
      const openCircuitBreakers = circuitBreakerStates.filter(cb => cb.isOpen);
      
      expect(openCircuitBreakers.length).toBeGreaterThan(0);
      
      console.log(`Circuit breaker activation: ${duration.toFixed(2)}ms for ${requestCount} requests, ${avgDuration.toFixed(2)}ms average`);
      console.log(`Open circuit breakers: ${openCircuitBreakers.length}/${circuitBreakerStates.length}`);
    });

    it('should recover from circuit breaker efficiently', async () => {
      const mockAIProviderFactory = require('../../lib/ai/providers').AIProviderFactory;
      
      // First, trigger circuit breaker
      vi.mocked(mockAIProviderFactory.generateResponse).mockRejectedValue(
        new Error('Initial failure')
      );
      
      // Make requests to trigger circuit breaker
      const failureRequests = Array.from({ length: 5 }, (_, i) => 
        createMockRequest(`failure-user-${i}`)
      );
      
      await Promise.all(
        failureRequests.map(request => 
          router.route(request).catch(() => ({ error: 'failed' }))
        )
      );
      
      // Now mock recovery
      vi.mocked(mockAIProviderFactory.generateResponse).mockResolvedValue(
        createMockResponse('openai', 'gpt-4')
      );
      
      // Wait for circuit breaker timeout (simulate)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const recoveryRequest = createMockRequest('recovery-user');
      
      const startTime = performance.now();
      const result = await router.route(recoveryRequest);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(result.provider).toBeDefined();
      expect(result.response).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should recover quickly
      
      console.log(`Circuit breaker recovery took ${duration.toFixed(2)}ms`);
    });
  });

  describe('Health Check Performance', () => {
    it('should perform health checks efficiently', async () => {
      const startTime = performance.now();
      
      const healthStatuses = await router.getProviderHealth();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(healthStatuses).toBeDefined();
      expect(Array.isArray(healthStatuses)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Health check took ${duration.toFixed(2)}ms for ${healthStatuses.length} providers`);
    });

    it('should handle concurrent health checks', async () => {
      const checkCount = 10;
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: checkCount }, () => 
        router.getProviderHealth()
      );
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / checkCount;
      
      expect(results).toHaveLength(checkCount);
      expect(avgDuration).toBeLessThan(200); // Average should be under 200ms
      
      console.log(`${checkCount} concurrent health checks took ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms average`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate significant load
      const requestCount = 200;
      const requests = Array.from({ length: requestCount }, (_, i) => 
        createMockRequest(`memory-test-user-${i}`)
      );
      
      const startTime = performance.now();
      
      // Process in batches to simulate real usage
      const batchSize = 20;
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        await Promise.all(batch.map(request => router.route(request)));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerRequest = memoryIncrease / requestCount;
      
      expect(memoryIncreasePerRequest).toBeLessThan(1024 * 10); // Less than 10KB per request
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase for ${requestCount} requests`);
      console.log(`Average memory per request: ${(memoryIncreasePerRequest / 1024).toFixed(2)}KB`);
      console.log(`Total processing time: ${duration.toFixed(2)}ms`);
    });

    it('should clean up resources properly', async () => {
      const initialStats = router.getRoutingStats();
      
      // Generate some activity
      const requests = Array.from({ length: 50 }, (_, i) => 
        createMockRequest(`cleanup-test-user-${i}`)
      );
      
      await Promise.all(requests.map(request => router.route(request)));
      
      const afterActivityStats = router.getRoutingStats();
      expect(Object.keys(afterActivityStats.requestCounts).length).toBeGreaterThan(0);
      
      // Reset and verify cleanup
      router.reset();
      
      const afterResetStats = router.getRoutingStats();
      expect(Object.keys(afterResetStats.requestCounts).length).toBe(0);
      expect(Object.keys(afterResetStats.circuitBreakers).length).toBe(0);
      
      console.log('Resource cleanup verified successfully');
    });
  });
});