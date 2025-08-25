/**
 * AI Request Service
 * Handles logging, cost tracking, and analytics for all AI interactions
 */

import { eq, desc, and, gte, lte, sum, count, avg } from 'drizzle-orm';
import { db } from '../../database/config';
import { aiRequestLogs, type AIRequestLog, type NewAIRequestLog } from '../../database/schema';
import type { AIProviderType } from '../types';

export interface RequestLogData {
  userId?: string;
  conversationId?: string;
  conceptId?: string;
  provider: AIProviderType;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  responseTime?: number;
  success: boolean;
  errorMessage?: string;
}

export interface RequestAnalytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  totalTokens: number;
  averageResponseTime: number;
  providerBreakdown: Record<string, {
    requests: number;
    cost: number;
    successRate: number;
    averageResponseTime: number;
  }>;
  modelBreakdown: Record<string, {
    requests: number;
    cost: number;
    successRate: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    cost: number;
    tokens: number;
  }>;
}

export interface CostAlert {
  type: 'daily_limit' | 'monthly_limit' | 'provider_limit' | 'unusual_spike';
  message: string;
  currentAmount: number;
  threshold: number;
  provider?: string;
  severity: 'warning' | 'critical';
}

export class AIRequestService {
  /**
   * Log an AI request/response
   */
  async logRequest(data: RequestLogData): Promise<string> {
    const logEntry: NewAIRequestLog = {
      userId: data.userId,
      conversationId: data.conversationId,
      conceptId: data.conceptId,
      provider: data.provider,
      model: data.model,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      cost: data.cost,
      responseTime: data.responseTime,
      success: data.success,
      errorMessage: data.errorMessage,
    };

    const [created] = await db.insert(aiRequestLogs).values(logEntry).returning();
    return created.id;
  }

  /**
   * Get request logs with filtering and pagination
   */
  async getRequestLogs(options: {
    userId?: string;
    conversationId?: string;
    conceptId?: string;
    provider?: AIProviderType;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<AIRequestLog[]> {
    let query = db.select().from(aiRequestLogs);

    // Apply filters
    const conditions = [];
    if (options.userId) conditions.push(eq(aiRequestLogs.userId, options.userId));
    if (options.conversationId) conditions.push(eq(aiRequestLogs.conversationId, options.conversationId));
    if (options.conceptId) conditions.push(eq(aiRequestLogs.conceptId, options.conceptId));
    if (options.provider) conditions.push(eq(aiRequestLogs.provider, options.provider));
    if (options.success !== undefined) conditions.push(eq(aiRequestLogs.success, options.success));
    if (options.startDate) conditions.push(gte(aiRequestLogs.createdAt, options.startDate.toISOString()));
    if (options.endDate) conditions.push(lte(aiRequestLogs.createdAt, options.endDate.toISOString()));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering, limit, and offset
    query = query.orderBy(desc(aiRequestLogs.createdAt));
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  /**
   * Get comprehensive analytics for AI requests
   */
  async getRequestAnalytics(options: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    provider?: AIProviderType;
  } = {}): Promise<RequestAnalytics> {
    const conditions = [];
    if (options.userId) conditions.push(eq(aiRequestLogs.userId, options.userId));
    if (options.provider) conditions.push(eq(aiRequestLogs.provider, options.provider));
    if (options.startDate) conditions.push(gte(aiRequestLogs.createdAt, options.startDate.toISOString()));
    if (options.endDate) conditions.push(lte(aiRequestLogs.createdAt, options.endDate.toISOString()));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get overall statistics
    const [overallStats] = await db
      .select({
        totalRequests: count(),
        successfulRequests: sum(aiRequestLogs.success),
        totalCost: sum(aiRequestLogs.cost),
        totalTokens: sum(aiRequestLogs.totalTokens),
        averageResponseTime: avg(aiRequestLogs.responseTime),
      })
      .from(aiRequestLogs)
      .where(whereClause);

    // Get provider breakdown
    const providerStats = await db
      .select({
        provider: aiRequestLogs.provider,
        requests: count(),
        cost: sum(aiRequestLogs.cost),
        successfulRequests: sum(aiRequestLogs.success),
        averageResponseTime: avg(aiRequestLogs.responseTime),
      })
      .from(aiRequestLogs)
      .where(whereClause)
      .groupBy(aiRequestLogs.provider);

    // Get model breakdown
    const modelStats = await db
      .select({
        model: aiRequestLogs.model,
        requests: count(),
        cost: sum(aiRequestLogs.cost),
        successfulRequests: sum(aiRequestLogs.success),
      })
      .from(aiRequestLogs)
      .where(whereClause)
      .groupBy(aiRequestLogs.model);

    // Get daily usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyUsageConditions = [...conditions];
    if (!options.startDate) {
      dailyUsageConditions.push(gte(aiRequestLogs.createdAt, thirtyDaysAgo.toISOString()));
    }

    const dailyUsage = await db
      .select({
        date: aiRequestLogs.createdAt,
        requests: count(),
        cost: sum(aiRequestLogs.cost),
        tokens: sum(aiRequestLogs.totalTokens),
      })
      .from(aiRequestLogs)
      .where(dailyUsageConditions.length > 0 ? and(...dailyUsageConditions) : undefined)
      .groupBy(aiRequestLogs.createdAt);

    // Process daily usage data
    const dailyUsageMap = new Map<string, { requests: number; cost: number; tokens: number }>();
    
    for (const usage of dailyUsage) {
      const date = new Date(usage.date!).toISOString().split('T')[0];
      const existing = dailyUsageMap.get(date) || { requests: 0, cost: 0, tokens: 0 };
      
      dailyUsageMap.set(date, {
        requests: existing.requests + (usage.requests || 0),
        cost: existing.cost + (usage.cost || 0),
        tokens: existing.tokens + (usage.tokens || 0),
      });
    }

    const sortedDailyUsage = Array.from(dailyUsageMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build provider breakdown
    const providerBreakdown: Record<string, any> = {};
    for (const stat of providerStats) {
      providerBreakdown[stat.provider] = {
        requests: stat.requests || 0,
        cost: stat.cost || 0,
        successRate: stat.requests ? (stat.successfulRequests || 0) / stat.requests : 0,
        averageResponseTime: stat.averageResponseTime || 0,
      };
    }

    // Build model breakdown
    const modelBreakdown: Record<string, any> = {};
    for (const stat of modelStats) {
      modelBreakdown[stat.model] = {
        requests: stat.requests || 0,
        cost: stat.cost || 0,
        successRate: stat.requests ? (stat.successfulRequests || 0) / stat.requests : 0,
      };
    }

    return {
      totalRequests: overallStats.totalRequests || 0,
      successfulRequests: overallStats.successfulRequests || 0,
      failedRequests: (overallStats.totalRequests || 0) - (overallStats.successfulRequests || 0),
      totalCost: overallStats.totalCost || 0,
      totalTokens: overallStats.totalTokens || 0,
      averageResponseTime: overallStats.averageResponseTime || 0,
      providerBreakdown,
      modelBreakdown,
      dailyUsage: sortedDailyUsage,
    };
  }

  /**
   * Get cost tracking and alerts
   */
  async getCostAlerts(options: {
    userId?: string;
    dailyLimit?: number;
    monthlyLimit?: number;
    providerLimits?: Record<string, number>;
  } = {}): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];
    const now = new Date();
    
    // Daily cost check
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCost = await this.getCostForPeriod(todayStart, now, options.userId);
    
    if (options.dailyLimit && todayCost >= options.dailyLimit * 0.8) {
      alerts.push({
        type: 'daily_limit',
        message: `Daily cost is ${((todayCost / options.dailyLimit) * 100).toFixed(1)}% of limit`,
        currentAmount: todayCost,
        threshold: options.dailyLimit,
        severity: todayCost >= options.dailyLimit ? 'critical' : 'warning',
      });
    }

    // Monthly cost check
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCost = await this.getCostForPeriod(monthStart, now, options.userId);
    
    if (options.monthlyLimit && monthlyCost >= options.monthlyLimit * 0.8) {
      alerts.push({
        type: 'monthly_limit',
        message: `Monthly cost is ${((monthlyCost / options.monthlyLimit) * 100).toFixed(1)}% of limit`,
        currentAmount: monthlyCost,
        threshold: options.monthlyLimit,
        severity: monthlyCost >= options.monthlyLimit ? 'critical' : 'warning',
      });
    }

    // Provider-specific limits
    if (options.providerLimits) {
      for (const [provider, limit] of Object.entries(options.providerLimits)) {
        const providerCost = await this.getCostForPeriod(
          todayStart, 
          now, 
          options.userId, 
          provider as AIProviderType
        );
        
        if (providerCost >= limit * 0.8) {
          alerts.push({
            type: 'provider_limit',
            message: `${provider} daily cost is ${((providerCost / limit) * 100).toFixed(1)}% of limit`,
            currentAmount: providerCost,
            threshold: limit,
            provider,
            severity: providerCost >= limit ? 'critical' : 'warning',
          });
        }
      }
    }

    // Unusual spike detection (cost > 3x average of last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyAverage = await this.getAverageDailyCost(weekAgo, todayStart, options.userId);
    
    if (weeklyAverage > 0 && todayCost > weeklyAverage * 3) {
      alerts.push({
        type: 'unusual_spike',
        message: `Today's cost is ${(todayCost / weeklyAverage).toFixed(1)}x higher than recent average`,
        currentAmount: todayCost,
        threshold: weeklyAverage * 3,
        severity: 'warning',
      });
    }

    return alerts;
  }

  /**
   * Get total cost for a specific period
   */
  private async getCostForPeriod(
    startDate: Date, 
    endDate: Date, 
    userId?: string, 
    provider?: AIProviderType
  ): Promise<number> {
    const conditions = [
      gte(aiRequestLogs.createdAt, startDate.toISOString()),
      lte(aiRequestLogs.createdAt, endDate.toISOString()),
    ];
    
    if (userId) conditions.push(eq(aiRequestLogs.userId, userId));
    if (provider) conditions.push(eq(aiRequestLogs.provider, provider));

    const [result] = await db
      .select({ totalCost: sum(aiRequestLogs.cost) })
      .from(aiRequestLogs)
      .where(and(...conditions));

    return result.totalCost || 0;
  }

  /**
   * Get average daily cost for a period
   */
  private async getAverageDailyCost(
    startDate: Date, 
    endDate: Date, 
    userId?: string
  ): Promise<number> {
    const totalCost = await this.getCostForPeriod(startDate, endDate, userId);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    return days > 0 ? totalCost / days : 0;
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsageStats(userId: string, days: number = 30): Promise<{
    totalRequests: number;
    totalCost: number;
    totalTokens: number;
    averageRequestsPerDay: number;
    averageCostPerDay: number;
    favoriteProvider: string;
    favoriteModel: string;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.getRequestAnalytics({
      userId,
      startDate,
    });

    // Find favorite provider and model
    let favoriteProvider = 'none';
    let maxProviderRequests = 0;
    for (const [provider, stats] of Object.entries(analytics.providerBreakdown)) {
      if (stats.requests > maxProviderRequests) {
        maxProviderRequests = stats.requests;
        favoriteProvider = provider;
      }
    }

    let favoriteModel = 'none';
    let maxModelRequests = 0;
    for (const [model, stats] of Object.entries(analytics.modelBreakdown)) {
      if (stats.requests > maxModelRequests) {
        maxModelRequests = stats.requests;
        favoriteModel = model;
      }
    }

    return {
      totalRequests: analytics.totalRequests,
      totalCost: analytics.totalCost,
      totalTokens: analytics.totalTokens,
      averageRequestsPerDay: analytics.totalRequests / days,
      averageCostPerDay: analytics.totalCost / days,
      favoriteProvider,
      favoriteModel,
    };
  }

  /**
   * Clean up old request logs (for data retention)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db
      .delete(aiRequestLogs)
      .where(lte(aiRequestLogs.createdAt, cutoffDate.toISOString()));

    return result.changes;
  }

  /**
   * Export request logs as CSV
   */
  async exportRequestLogs(options: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    format?: 'csv' | 'json';
  } = {}): Promise<string> {
    const logs = await this.getRequestLogs({
      userId: options.userId,
      startDate: options.startDate,
      endDate: options.endDate,
      limit: 10000, // Reasonable limit for exports
    });

    if (options.format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // Default to CSV
    const headers = [
      'ID', 'User ID', 'Conversation ID', 'Concept ID', 'Provider', 'Model',
      'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 'Cost',
      'Response Time', 'Success', 'Error Message', 'Created At'
    ];

    const csvRows = [headers.join(',')];
    
    for (const log of logs) {
      const row = [
        log.id,
        log.userId || '',
        log.conversationId || '',
        log.conceptId || '',
        log.provider,
        log.model,
        log.promptTokens || 0,
        log.completionTokens || 0,
        log.totalTokens || 0,
        log.cost || 0,
        log.responseTime || 0,
        log.success ? 'true' : 'false',
        (log.errorMessage || '').replace(/,/g, ';'), // Escape commas
        log.createdAt || '',
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
}

// Singleton instance
export const aiRequestService = new AIRequestService();