/**
 * AI Monitoring Analytics API
 * GET /api/ai/monitoring/analytics - Get comprehensive AI usage analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiRequestService } from '@/lib/ai/services/AIRequestService';
import { aiProviderService } from '@/lib/ai/services/AIProviderService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const userId = searchParams.get('userId') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined;
    const days = parseInt(searchParams.get('days') || '30');

    // Set default date range if not provided
    const defaultEndDate = endDate && !isNaN(endDate.getTime()) ? endDate : new Date();
    const defaultStartDate = startDate && !isNaN(startDate.getTime()) 
      ? startDate 
      : new Date(defaultEndDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get request analytics
    const analytics = await aiRequestService.getRequestAnalytics({
      userId,
      provider: provider as any,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    });

    // Get all provider metrics
    const providerMetrics = await aiProviderService.getAllProviderMetrics();

    // Get provider configurations for context
    const providers = await aiProviderService.getAllProviders();

    // Calculate additional insights
    const insights = {
      mostUsedProvider: Object.entries(analytics.providerBreakdown)
        .sort(([,a], [,b]) => b.requests - a.requests)[0]?.[0] || 'none',
      mostUsedModel: Object.entries(analytics.modelBreakdown)
        .sort(([,a], [,b]) => b.requests - a.requests)[0]?.[0] || 'none',
      averageCostPerRequest: analytics.totalRequests > 0 
        ? analytics.totalCost / analytics.totalRequests 
        : 0,
      averageTokensPerRequest: analytics.totalRequests > 0 
        ? analytics.totalTokens / analytics.totalRequests 
        : 0,
      successRate: analytics.totalRequests > 0 
        ? analytics.successfulRequests / analytics.totalRequests 
        : 0,
      costTrend: calculateCostTrend(analytics.dailyUsage),
      requestTrend: calculateRequestTrend(analytics.dailyUsage),
    };

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        providerMetrics,
        providers: providers.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          enabled: p.enabled,
          priority: p.priority,
        })),
        insights,
        period: {
          startDate: defaultStartDate.toISOString(),
          endDate: defaultEndDate.toISOString(),
          days: Math.ceil((defaultEndDate.getTime() - defaultStartDate.getTime()) / (24 * 60 * 60 * 1000)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch AI analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function calculateCostTrend(dailyUsage: Array<{ date: string; cost: number }>): 'increasing' | 'decreasing' | 'stable' {
  if (dailyUsage.length < 2) return 'stable';
  
  const recent = dailyUsage.slice(-7); // Last 7 days
  const earlier = dailyUsage.slice(-14, -7); // Previous 7 days
  
  const recentAvg = recent.reduce((sum, day) => sum + day.cost, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, day) => sum + day.cost, 0) / earlier.length;
  
  const change = (recentAvg - earlierAvg) / earlierAvg;
  
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

function calculateRequestTrend(dailyUsage: Array<{ date: string; requests: number }>): 'increasing' | 'decreasing' | 'stable' {
  if (dailyUsage.length < 2) return 'stable';
  
  const recent = dailyUsage.slice(-7); // Last 7 days
  const earlier = dailyUsage.slice(-14, -7); // Previous 7 days
  
  const recentAvg = recent.reduce((sum, day) => sum + day.requests, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, day) => sum + day.requests, 0) / earlier.length;
  
  const change = (recentAvg - earlierAvg) / earlierAvg;
  
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}