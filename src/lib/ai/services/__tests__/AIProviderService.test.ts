/**
 * AIProviderService Tests
 * Unit tests for AI provider CRUD operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIProviderService } from '../AIProviderService';
import type { ProviderConfig } from '../../types';

// Mock the database
vi.mock('../../../database/config', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../database/schema', () => ({
  aiProviders: {
    id: 'id',
    name: 'name',
    type: 'type',
    enabled: 'enabled',
    priority: 'priority',
    config: 'config',
    healthStatus: 'healthStatus',
    totalRequests: 'totalRequests',
    totalCost: 'totalCost',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}));

describe('AIProviderService', () => {
  let service: AIProviderService;
  let mockDb: any;

  beforeEach(() => {
    service = new AIProviderService();
    mockDb = require('../../../database/config').db;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProvider', () => {
    it('should create a new provider configuration', async () => {
      const providerData: Omit<ProviderConfig, 'id'> = {
        name: 'Test OpenAI',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        apiKey: 'test-key',
        healthCheckInterval: 300000,
      };

      const mockCreated = {
        id: 'test-id',
        name: 'Test OpenAI',
        type: 'openai',
        enabled: true,
        priority: 1,
        config: JSON.stringify({
          maxRequestsPerMinute: 60,
          maxCostPerDay: 10,
          models: ['gpt-4o'],
          apiKey: 'test-key',
          healthCheckInterval: 300000,
        }),
        healthStatus: 'unknown',
        totalRequests: 0,
        totalCost: 0,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreated]),
        }),
      });

      const result = await service.createProvider(providerData);

      expect(result).toEqual({
        id: 'test-id',
        name: 'Test OpenAI',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        apiKey: 'test-key',
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getAllProviders', () => {
    it('should return all providers sorted by priority', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          name: 'OpenAI',
          type: 'openai',
          enabled: true,
          priority: 2,
          config: JSON.stringify({ models: ['gpt-4o'] }),
        },
        {
          id: 'provider-2',
          name: 'Claude',
          type: 'anthropic',
          enabled: true,
          priority: 1,
          config: JSON.stringify({ models: ['claude-3-5-sonnet-20241022'] }),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockProviders),
        }),
      });

      const result = await service.getAllProviders();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('OpenAI');
      expect(result[1].name).toBe('Claude');
    });
  });

  describe('getEnabledProviders', () => {
    it('should return only enabled providers', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          name: 'OpenAI',
          type: 'openai',
          enabled: true,
          priority: 1,
          config: JSON.stringify({ models: ['gpt-4o'] }),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockProviders),
          }),
        }),
      });

      const result = await service.getEnabledProviders();

      expect(result).toHaveLength(1);
      expect(result[0].enabled).toBe(true);
    });
  });

  describe('getProviderById', () => {
    it('should return a specific provider by ID', async () => {
      const mockProvider = {
        id: 'test-id',
        name: 'Test Provider',
        type: 'openai',
        enabled: true,
        priority: 1,
        config: JSON.stringify({ models: ['gpt-4o'] }),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProvider]),
          }),
        }),
      });

      const result = await service.getProviderById('test-id');

      expect(result).toBeTruthy();
      expect(result?.id).toBe('test-id');
      expect(result?.name).toBe('Test Provider');
    });

    it('should return null if provider not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getProviderById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateProvider', () => {
    it('should update provider configuration', async () => {
      const existingProvider = {
        id: 'test-id',
        name: 'Old Name',
        type: 'openai',
        enabled: true,
        priority: 1,
        config: JSON.stringify({ models: ['gpt-4o'] }),
      };

      const updatedProvider = {
        ...existingProvider,
        name: 'New Name',
        priority: 2,
      };

      // Mock getProviderById
      vi.spyOn(service, 'getProviderById').mockResolvedValue({
        id: 'test-id',
        name: 'Old Name',
        type: 'openai',
        enabled: true,
        priority: 1,
        maxRequestsPerMinute: 60,
        maxCostPerDay: 10,
        models: ['gpt-4o'],
        healthCheckInterval: 300000,
        timeout: 30000,
        retryAttempts: 3,
        config: JSON.stringify({ models: ['gpt-4o'] }),
      } as any);

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedProvider]),
          }),
        }),
      });

      const result = await service.updateProvider('test-id', {
        name: 'New Name',
        priority: 2,
      });

      expect(result).toBeTruthy();
      expect(result?.name).toBe('New Name');
      expect(result?.priority).toBe(2);
    });
  });

  describe('deleteProvider', () => {
    it('should delete a provider', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ changes: 1 }),
      });

      const result = await service.deleteProvider('test-id');

      expect(result).toBe(true);
    });

    it('should return false if provider not found', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ changes: 0 }),
      });

      const result = await service.deleteProvider('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('updateProviderHealth', () => {
    it('should update provider health status', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      await service.updateProviderHealth('test-id', 'healthy');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateProviderMetrics', () => {
    it('should update provider metrics', async () => {
      const mockProvider = {
        totalRequests: 10,
        totalCost: 5.0,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProvider]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      await service.updateProviderMetrics('test-id', 5, 2.5);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('toggleProvider', () => {
    it('should enable/disable a provider', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ changes: 1 }),
        }),
      });

      const result = await service.toggleProvider('test-id', false);

      expect(result).toBe(true);
    });
  });

  describe('seedDefaultProviders', () => {
    it('should not seed if providers already exist', async () => {
      vi.spyOn(service, 'getAllProviders').mockResolvedValue([
        {
          id: 'existing',
          name: 'Existing Provider',
          type: 'openai',
          enabled: true,
          priority: 1,
          maxRequestsPerMinute: 60,
          maxCostPerDay: 10,
          models: ['gpt-4o'],
          healthCheckInterval: 300000,
          timeout: 30000,
          retryAttempts: 3,
        },
      ]);

      await service.seedDefaultProviders();

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should seed default providers if none exist', async () => {
      vi.spyOn(service, 'getAllProviders').mockResolvedValue([]);
      vi.spyOn(service, 'createProvider').mockResolvedValue({} as any);

      await service.seedDefaultProviders();

      expect(service.createProvider).toHaveBeenCalledTimes(5); // 5 default providers
    });
  });
});