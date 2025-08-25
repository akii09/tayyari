/**
 * Integration tests for AI Provider Configuration and Monitoring APIs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';
import { aiRequestService } from '@/lib/ai/services/AIRequestService';

// Import API handlers
import { GET as getProviders, POST as createProvider } from '../providers/route';
import { GET as getProvider, PUT as updateProvider, DELETE as deleteProvider } from '../providers/[id]/route';
import { POST as toggleProvider } from '../providers/[id]/toggle/route';
import { POST as updatePriority } from '../providers/[id]/priority/route';
import { GET as getHealth, POST as updateHealth } from '../providers/[id]/health/route';
import { GET as getAnalytics } from '../monitoring/analytics/route';
import { GET as getCosts } from '../monitoring/costs/route';
import { GET as getUsage } from '../monitoring/usage/route';
import { GET as getLogs, DELETE as cleanupLogs } from '../monitoring/logs/route';
import { GET as getAlerts, POST as configureAlerts } from '../monitoring/alerts/route';
import { GET as getConfig, POST as updateConfig } from '../config/route';
import { POST as reloadConfig } from '../config/reload/route';

describe('AI Provider Configuration and Monitoring APIs', () => {
  let testProviderId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    const providers = await aiProviderService.getAllProviders();
    for (const provider of providers) {
      if (provider.name.includes('Test')) {
        await aiProviderService.deleteProvider(provider.id);
      }
    }

    testUserId = 'test-user-' + Date.now();
    
    // Create test user in database to avoid foreign key constraints
    try {
      const { userService } = await import('@/lib/database/services/userService');
      await userService.createUser({
        id: testUserId,
        name: 'Test User',
        role: 'Software Engineer',
        experienceLevel: 'mid',
        hoursPerWeek: 10,
      });
    } catch (error) {
      // User might already exist or service might not be available
      console.log('Could not create test user:', error);
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (testProviderId) {
      try {
        await aiProviderService.deleteProvider(testProviderId);
      } catch (error) {
        // Provider might already be deleted
      }
    }
  });

  describe('Provider CRUD Operations', () => {
    it('should create a new AI provider', async () => {
      const request = new NextRequest('http://localhost/api/ai/providers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test OpenAI Provider',
          type: 'openai',
          enabled: true,
          priority: 1,
          maxRequestsPerMinute: 60,
          maxCostPerDay: 10,
          models: ['gpt-4o', 'gpt-4o-mini'],
          apiKey: 'test-api-key',
          timeout: 30000,
          retryAttempts: 3,
        }),
      });

      const response = await createProvider(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test OpenAI Provider');
      expect(data.data.type).toBe('openai');
      expect(data.data.enabled).toBe(true);

      testProviderId = data.data.id;
    });

    it('should validate required fields when creating provider', async () => {
      const request = new NextRequest('http://localhost/api/ai/providers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Provider',
          // Missing type and priority
        }),
      });

      const response = await createProvider(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required field');
    });

    it('should get all providers', async () => {
      // First create a test provider
      const provider = await aiProviderService.createProvider({
        name: 'Test Provider for List',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        timeout: 30000,
        retryAttempts: 3,
      });
      testProviderId = provider.id;

      const request = new NextRequest('http://localhost/api/ai/providers');
      const response = await getProviders(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.count).toBeGreaterThan(0);
    });

    it('should get enabled providers only', async () => {
      // Create enabled and disabled providers
      const enabledProvider = await aiProviderService.createProvider({
        name: 'Test Enabled Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        timeout: 30000,
        retryAttempts: 3,
      });

      const disabledProvider = await aiProviderService.createProvider({
        name: 'Test Disabled Provider',
        type: 'anthropic',
        enabled: false,
        priority: 2,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['claude-3-5-sonnet-20241022'],
        timeout: 30000,
        retryAttempts: 3,
      });

      const request = new NextRequest('http://localhost/api/ai/providers?enabled=true');
      const response = await getProviders(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.every((p: any) => p.enabled)).toBe(true);

      // Cleanup
      await aiProviderService.deleteProvider(enabledProvider.id);
      await aiProviderService.deleteProvider(disabledProvider.id);
    });

    it('should get specific provider by ID', async () => {
      const provider = await aiProviderService.createProvider({
        name: 'Test Specific Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        timeout: 30000,
        retryAttempts: 3,
      });
      testProviderId = provider.id;

      const request = new NextRequest(`http://localhost/api/ai/providers/${provider.id}`);
      const response = await getProvider(request, { params: { id: provider.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(provider.id);
      expect(data.data.name).toBe('Test Specific Provider');
    });

    it('should return 404 for non-existent provider', async () => {
      const request = new NextRequest('http://localhost/api/ai/providers/non-existent-id');
      const response = await getProvider(request, { params: { id: 'non-existent-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Provider not found');
    });

    it('should update provider configuration', async () => {
      const provider = await aiProviderService.createProvider({
        name: 'Test Update Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        timeout: 30000,
        retryAttempts: 3,
      });
      testProviderId = provider.id;

      const request = new NextRequest(`http://localhost/api/ai/providers/${provider.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Test Provider',
          maxRequestsPerMinute: 120,
          maxCostPerDay: 20,
        }),
      });

      const response = await updateProvider(request, { params: { id: provider.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Test Provider');
      expect(data.data.maxRequestsPerMinute).toBe(120);
      expect(data.data.maxCostPerDay).toBe(20);
    });

    it('should delete provider', async () => {
      const provider = await aiProviderService.createProvider({
        name: 'Test Delete Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        timeout: 30000,
        retryAttempts: 3,
      });

      const request = new NextRequest(`http://localhost/api/ai/providers/${provider.id}`);
      const response = await deleteProvider(request, { params: { id: provider.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('AI provider deleted successfully');

      // Verify deletion
      const deletedProvider = await aiProviderService.getProviderById(provider.id);
      expect(deletedProvider).toBeNull();
    });
  });

  describe('Provider Management Operations', () => {
    beforeEach(async () => {
      const provider = await aiProviderService.createProvider({
        name: 'Test Management Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        timeout: 30000,
        retryAttempts: 3,
      });
      testProviderId = provider.id;
    });

    it('should toggle provider enabled status', async () => {
      const request = new NextRequest(`http://localhost/api/ai/providers/${testProviderId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled: false }),
      });

      const response = await toggleProvider(request, { params: { id: testProviderId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.enabled).toBe(false);
      expect(data.message).toBe('Provider disabled successfully');
    });

    it('should update provider priority', async () => {
      const request = new NextRequest(`http://localhost/api/ai/providers/${testProviderId}/priority`, {
        method: 'POST',
        body: JSON.stringify({ priority: 5 }),
      });

      const response = await updatePriority(request, { params: { id: testProviderId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.priority).toBe(5);
    });

    it('should validate priority value', async () => {
      const request = new NextRequest(`http://localhost/api/ai/providers/${testProviderId}/priority`, {
        method: 'POST',
        body: JSON.stringify({ priority: -1 }),
      });

      const response = await updatePriority(request, { params: { id: testProviderId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('priority must be a positive number');
    });

    it('should get provider health status', async () => {
      const request = new NextRequest(`http://localhost/api/ai/providers/${testProviderId}/health`);
      const response = await getHealth(request, { params: { id: testProviderId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.providerId).toBe(testProviderId);
      expect(data.data).toHaveProperty('healthStatus');
      expect(data.data).toHaveProperty('metrics');
    });

    it('should update provider health status', async () => {
      const request = new NextRequest(`http://localhost/api/ai/providers/${testProviderId}/health`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'unhealthy',
          errorMessage: 'Test error message',
        }),
      });

      const response = await updateHealth(request, { params: { id: testProviderId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Provider health status updated successfully');
    });
  });

  describe('Monitoring and Analytics APIs', () => {
    beforeEach(async () => {
      // Create test provider
      const provider = await aiProviderService.createProvider({
        name: 'Test Analytics Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        timeout: 30000,
        retryAttempts: 3,
      });
      testProviderId = provider.id;

      // Log some test requests without userId to avoid foreign key constraints
      try {
        await aiRequestService.logRequest({
          provider: 'openai',
          model: 'gpt-4o',
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          cost: 0.01,
          responseTime: 1500,
          success: true,
        });

        await aiRequestService.logRequest({
          provider: 'openai',
          model: 'gpt-4o',
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300,
          cost: 0.02,
          responseTime: 2000,
          success: false,
          errorMessage: 'Test error',
        });
      } catch (error) {
        // If logging fails due to constraints, continue with tests
        console.log('Could not log test requests:', error);
      }
    });

    it('should get comprehensive analytics', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/analytics?days=7');
      const response = await getAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('analytics');
      expect(data.data).toHaveProperty('providerMetrics');
      expect(data.data).toHaveProperty('insights');
      expect(typeof data.data.analytics.totalRequests).toBe('number');
    });

    it('should get cost monitoring data', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/costs?dailyLimit=1&monthlyLimit=30');
      const response = await getCosts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('alerts');
      expect(data.data).toHaveProperty('currentCosts');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data.currentCosts).toHaveProperty('today');
      expect(data.data.currentCosts).toHaveProperty('month');
    });

    it('should get usage monitoring data', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/usage?days=7');
      const response = await getUsage(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('analytics');
      expect(data.data).toHaveProperty('patterns');
      expect(data.data).toHaveProperty('performance');
      expect(data.data).toHaveProperty('insights');
      expect(data.data.patterns).toHaveProperty('hourlyDistribution');
      expect(data.data.patterns).toHaveProperty('dayOfWeekDistribution');
    });

    it('should get request logs with filtering', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/logs?limit=10');
      const response = await getLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('logs');
      expect(data.data).toHaveProperty('summary');
      expect(data.data).toHaveProperty('providerStats');
      expect(Array.isArray(data.data.logs)).toBe(true);
    });

    it('should export logs as CSV', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/logs?format=csv');
      const response = await getLogs(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/csv');
      expect(response.headers.get('content-disposition')).toContain('attachment');
    });

    it('should get budget alerts', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/alerts?dailyLimit=0.005&monthlyLimit=0.1');
      const response = await getAlerts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('alerts');
      expect(data.data).toHaveProperty('summary');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data.alerts).toHaveProperty('critical');
      expect(data.data.alerts).toHaveProperty('warning');
    });

    it('should configure budget alerts', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/alerts', {
        method: 'POST',
        body: JSON.stringify({
          dailyLimit: 5,
          monthlyLimit: 100,
          providerLimits: {
            openai: 3,
            anthropic: 2,
          },
          warningPercentage: 80,
          criticalPercentage: 100,
          enableEmailAlerts: true,
        }),
      });

      const response = await configureAlerts(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('configuration');
      expect(data.data).toHaveProperty('testAlerts');
      expect(data.data.configuration.dailyLimit).toBe(5);
      expect(data.data.configuration.monthlyLimit).toBe(100);
    });
  });

  describe('Configuration Management APIs', () => {
    beforeEach(async () => {
      const provider = await aiProviderService.createProvider({
        name: 'Test Config Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        timeout: 30000,
        retryAttempts: 3,
      });
      testProviderId = provider.id;
    });

    it('should get current AI configuration', async () => {
      const request = new NextRequest('http://localhost/api/ai/config');
      const response = await getConfig(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('providers');
      expect(data.data).toHaveProperty('systemConfig');
      expect(data.data).toHaveProperty('summary');
      expect(Array.isArray(data.data.providers)).toBe(true);
    });

    it('should update AI configuration', async () => {
      const request = new NextRequest('http://localhost/api/ai/config', {
        method: 'POST',
        body: JSON.stringify({
          systemConfig: {
            requestTimeout: 45000,
            maxRetries: 5,
          },
          providerUpdates: [
            {
              id: testProviderId,
              maxRequestsPerMinute: 120,
            },
          ],
        }),
      });

      const response = await updateConfig(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('results');
      expect(data.data.results.providersUpdated).toBe(1);
      expect(data.data.results.systemConfigUpdated).toBe(true);
    });

    it('should validate configuration updates', async () => {
      const request = new NextRequest('http://localhost/api/ai/config', {
        method: 'POST',
        body: JSON.stringify({
          systemConfig: {
            requestTimeout: 500, // Too low
            maxRetries: 15, // Too high
          },
        }),
      });

      const response = await updateConfig(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.errors).toBeDefined();
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('should reload configuration', async () => {
      const request = new NextRequest('http://localhost/api/ai/config/reload', {
        method: 'POST',
        body: JSON.stringify({
          force: false,
          validateOnly: false,
        }),
      });

      const response = await reloadConfig(request);
      const data = await response.json();

      expect([200, 207]).toContain(response.status); // 207 for partial success
      expect(data.data).toHaveProperty('results');
      expect(data.data).toHaveProperty('summary');
      expect(data.data.results.providersValidated).toBeGreaterThan(0);
    });

    it('should validate configuration only', async () => {
      const request = new NextRequest('http://localhost/api/ai/config/reload', {
        method: 'POST',
        body: JSON.stringify({
          validateOnly: true,
        }),
      });

      const response = await reloadConfig(request);
      const data = await response.json();

      expect([200, 207]).toContain(response.status); // 207 for partial success
      expect(data.data.results.providersValidated).toBeGreaterThan(0);
      expect(data.data.results.providersReloaded).toBe(0);
      expect(data.data.message).toContain('validation completed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid provider type', async () => {
      const request = new NextRequest('http://localhost/api/ai/providers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Invalid Provider',
          type: 'invalid-type',
          priority: 1,
        }),
      });

      const response = await createProvider(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid provider type');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/ai/providers', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await createProvider(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle large limit values', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/logs?limit=2000');
      const response = await getLogs(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Limit cannot exceed 1000');
    });

    it('should handle invalid date ranges', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/analytics?startDate=invalid-date');
      const response = await getAnalytics(request);
      
      // Should handle gracefully and use defaults
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should clean up old logs', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/logs?retentionDays=1', {
        method: 'DELETE',
      });

      const response = await cleanupLogs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('deletedRecords');
      expect(data.data.retentionDays).toBe(1);
    });

    it('should validate retention days for cleanup', async () => {
      const request = new NextRequest('http://localhost/api/ai/monitoring/logs?retentionDays=400', {
        method: 'DELETE',
      });

      const response = await cleanupLogs(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Retention days must be between 1 and 365');
    });
  });
});