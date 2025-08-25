/**
 * AIRequestService Tests
 * Unit tests for request logging, cost tracking, and analytics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIRequestService } from '../AIRequestService';
import type { RequestLogData } from '../AIRequestService';

// Mock the database
vi.mock('../../../database/config', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../database/schema', () => ({
  aiRequestLogs: {
    id: 'id',
    userId: 'userId',
    conversationId: 'conversationId',
    conceptId: 'conceptId',
    provider: 'provider',
    model: 'model',
    promptTokens: 'promptTokens',
    completionTokens: 'completionTokens',
    totalTokens: 'totalTokens',
    cost: 'cost',
    responseTime: 'responseTime',
    success: 'success',
    errorMessage: 'errorMessage',
    createdAt: 'createdAt',
  },
}));

describe('AIRequestService', () => {
  let service: AIRequestService;
  let mockDb: any;

  beforeEach(() => {
    service = new AIRequestService();
    mockDb = require('../../../database/config').db;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logRequest', () => {
    it('should log a successful request', async () => {
      const requestData: RequestLogData = {
        userId: 'user-1',
        conversationId: 'conv-1',
        conceptId: 'concept-1',
        provider: 'openai',
        model: 'gpt-4o',
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        cost: 0.001,
        responseTime: 1500,
        success: true,
      };

      const mockCreated = {
        id: 'log-123',
        ...requestData,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreated]),
        }),
      });

      const result = await service.logRequest(requestData);

      expect(result).toBe('log-123');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should log a failed request', async () => {
      const requestData: RequestLogData = {
        userId: 'user-1',
        provider: 'openai',
        model: 'gpt-4o',
        success: false,
        errorMessage: 'API key invalid',
      };

      const mockCreated = {
        id: 'log-456',
        ...requestData,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreated]),
        }),
      });

      const result = await service.logRequest(requestData);

      expect(result).toBe('log-456');
    });
  });

  describe('getRequestLogs', () => {
    it('should return filtered request logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          provider: 'openai',
          model: 'gpt-4o',
          success: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'log-2',
          userId: 'user-1',
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          success: true,
          createdAt: '2024-01-01T01:00:00Z',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockLogs),
              }),
            }),
          }),
        }),
      });

      const result = await service.getRequestLogs({
        userId: 'user-1',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockLogs);
    });

    it('should return logs without filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          provider: 'openai',
          success: true,
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockLogs),
        }),
      });

      const result = await service.getRequestLogs();

      expect(result).toEqual(mockLogs);
    });
  });

  describe('getRequestAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      // Mock overall stats
      const mockOverallStats = {
        totalRequests: 100,
        successfulRequests: 95,
        totalCost: 5.0,
        totalTokens: 10000,
        averageResponseTime: 1200,
      };

      // Mock provider stats
      const mockProviderStats = [
        {
          provider: 'openai',
          requests: 60,
          cost: 3.0,
          successfulRequests: 58,
          averageResponseTime: 1100,
        },
        {
          provider: 'anthropic',
          requests: 40,
          cost: 2.0,
          successfulRequests: 37,
          averageResponseTime: 1300,
        },
      ];

      // Mock model stats
      const mockModelStats = [
        {
          model: 'gpt-4o',
          requests: 60,
          cost: 3.0,
          successfulRequests: 58,
        },
        {
          model: 'claude-3-5-sonnet-20241022',
          requests: 40,
          cost: 2.0,
          successfulRequests: 37,
        },
      ];

      // Mock daily usage
      const mockDailyUsage = [
        {
          date: '2024-01-01T00:00:00Z',
          requests: 50,
          cost: 2.5,
          tokens: 5000,
        },
        {
          date: '2024-01-02T00:00:00Z',
          requests: 50,
          cost: 2.5,
          tokens: 5000,
        },
      ];

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOverallStats]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(mockProviderStats),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(mockModelStats),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(mockDailyUsage),
            }),
          }),
        });

      const result = await service.getRequestAnalytics({
        userId: 'user-1',
      });

      expect(result.totalRequests).toBe(100);
      expect(result.successfulRequests).toBe(95);
      expect(result.failedRequests).toBe(5);
      expect(result.totalCost).toBe(5.0);
      expect(result.providerBreakdown).toHaveProperty('openai');
      expect(result.providerBreakdown.openai.requests).toBe(60);
      expect(result.modelBreakdown).toHaveProperty('gpt-4o');
      expect(result.dailyUsage).toHaveLength(2);
    });
  });

  describe('getCostAlerts', () => {
    it('should return cost alerts when limits are exceeded', async () => {
      // Mock cost queries
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalCost: 9.0 }]), // Daily cost
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalCost: 80.0 }]), // Monthly cost
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalCost: 4.5 }]), // Provider cost
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalCost: 1.0 }]), // Weekly average
          }),
        });

      const alerts = await service.getCostAlerts({
        userId: 'user-1',
        dailyLimit: 10,
        monthlyLimit: 100,
        providerLimits: { openai: 5 },
      });

      expect(alerts).toHaveLength(2); // Daily warning and provider warning
      expect(alerts[0].type).toBe('daily_limit');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[1].type).toBe('provider_limit');
      expect(alerts[1].severity).toBe('warning');
    });

    it('should detect unusual cost spikes', async () => {
      // Mock cost queries for spike detection
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalCost: 15.0 }]), // Today's cost
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalCost: 50.0 }]), // Monthly cost
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ totalCost: 35.0 }]), // Weekly total for average
          }),
        });

      const alerts = await service.getCostAlerts({
        userId: 'user-1',
        dailyLimit: 20,
        monthlyLimit: 100,
      });

      expect(alerts.some(alert => alert.type === 'unusual_spike')).toBe(true);
    });
  });

  describe('getUserUsageStats', () => {
    it('should return user usage statistics', async () => {
      // Mock the getRequestAnalytics method
      vi.spyOn(service, 'getRequestAnalytics').mockResolvedValue({
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        totalCost: 10.0,
        totalTokens: 20000,
        averageResponseTime: 1200,
        providerBreakdown: {
          openai: { requests: 60, cost: 6.0, successRate: 0.97, averageResponseTime: 1100 },
          anthropic: { requests: 40, cost: 4.0, successRate: 0.925, averageResponseTime: 1300 },
        },
        modelBreakdown: {
          'gpt-4o': { requests: 60, cost: 6.0, successRate: 0.97 },
          'claude-3-5-sonnet-20241022': { requests: 40, cost: 4.0, successRate: 0.925 },
        },
        dailyUsage: [],
      });

      const stats = await service.getUserUsageStats('user-1', 30);

      expect(stats.totalRequests).toBe(100);
      expect(stats.totalCost).toBe(10.0);
      expect(stats.totalTokens).toBe(20000);
      expect(stats.averageRequestsPerDay).toBe(100 / 30);
      expect(stats.averageCostPerDay).toBe(10.0 / 30);
      expect(stats.favoriteProvider).toBe('openai');
      expect(stats.favoriteModel).toBe('gpt-4o');
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ changes: 50 }),
      });

      const result = await service.cleanupOldLogs(90);

      expect(result).toBe(50);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('exportRequestLogs', () => {
    it('should export logs as CSV', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          conversationId: 'conv-1',
          conceptId: 'concept-1',
          provider: 'openai',
          model: 'gpt-4o',
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
          cost: 0.001,
          responseTime: 1500,
          success: true,
          errorMessage: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.spyOn(service, 'getRequestLogs').mockResolvedValue(mockLogs);

      const csv = await service.exportRequestLogs({ format: 'csv' });

      expect(csv).toContain('ID,User ID,Conversation ID');
      expect(csv).toContain('log-1,user-1,conv-1');
    });

    it('should export logs as JSON', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          provider: 'openai',
          success: true,
        },
      ];

      vi.spyOn(service, 'getRequestLogs').mockResolvedValue(mockLogs);

      const json = await service.exportRequestLogs({ format: 'json' });

      expect(JSON.parse(json)).toEqual(mockLogs);
    });
  });
});