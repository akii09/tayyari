/**
 * AI Cost Monitoring API
 * GET /api/ai/monitoring/costs - Get cost tracking and alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiRequestService } from '@/lib/ai/services/AIRequestService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const userId = searchParams.get('userId') || undefined;
    const dailyLimit = parseFloat(searchParams.get('dailyLimit') || '0') || undefined;
    const monthlyLimit = parseFloat(searchParams.get('monthlyLimit') || '0') || undefined;
    
    // Parse provider limits from query string (format: provider1:limit1,provider2:limit2)
    const providerLimitsParam = searchParams.get('providerLimits');
    let providerLimits: Record<string, number> | undefined;
    
    if (providerLimitsParam) {
      providerLimits = {};
      const pairs = providerLimitsParam.split(',');
      for (const pair of pairs) {
        const [provider, limit] = pair.split(':');
        if (provider && limit) {
          providerLimits[provider] = parseFloat(limit);
        }
      }
    }

    // Get cost alerts
    const alerts = await aiRequestService.getCostAlerts({
      userId,
      dailyLimit,
      monthlyLimit,
      providerLimits,
    });

    // Get current period costs
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAnalytics, monthAnalytics] = await Promise.all([
      aiRequestService.getRequestAnalytics({
        userId,
        startDate: todayStart,
        endDate: now,
      }),
      aiRequestService.getRequestAnalytics({
        userId,
        startDate: monthStart,
        endDate: now,
      }),
    ]);

    // Calculate cost breakdown by provider for today and month
    const todayCostByProvider = Object.entries(todayAnalytics.providerBreakdown)
      .map(([provider, stats]) => ({
        provider,
        cost: stats.cost,
        requests: stats.requests,
        percentage: todayAnalytics.totalCost > 0 
          ? (stats.cost / todayAnalytics.totalCost) * 100 
          : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    const monthCostByProvider = Object.entries(monthAnalytics.providerBreakdown)
      .map(([provider, stats]) => ({
        provider,
        cost: stats.cost,
        requests: stats.requests,
        percentage: monthAnalytics.totalCost > 0 
          ? (stats.cost / monthAnalytics.totalCost) * 100 
          : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    // Calculate cost efficiency metrics
    const costEfficiency = {
      costPerRequest: todayAnalytics.totalRequests > 0 
        ? todayAnalytics.totalCost / todayAnalytics.totalRequests 
        : 0,
      costPerToken: todayAnalytics.totalTokens > 0 
        ? todayAnalytics.totalCost / todayAnalytics.totalTokens 
        : 0,
      averageResponseTime: todayAnalytics.averageResponseTime,
      successRate: todayAnalytics.totalRequests > 0 
        ? todayAnalytics.successfulRequests / todayAnalytics.totalRequests 
        : 0,
    };

    // Generate cost optimization recommendations
    const recommendations = generateCostOptimizationRecommendations(
      todayAnalytics,
      monthAnalytics,
      alerts
    );

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        currentCosts: {
          today: {
            total: todayAnalytics.totalCost,
            requests: todayAnalytics.totalRequests,
            tokens: todayAnalytics.totalTokens,
            byProvider: todayCostByProvider,
          },
          month: {
            total: monthAnalytics.totalCost,
            requests: monthAnalytics.totalRequests,
            tokens: monthAnalytics.totalTokens,
            byProvider: monthCostByProvider,
          },
        },
        limits: {
          daily: dailyLimit,
          monthly: monthlyLimit,
          providers: providerLimits,
        },
        efficiency: costEfficiency,
        recommendations,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching cost monitoring data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cost monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateCostOptimizationRecommendations(
  todayAnalytics: any,
  monthAnalytics: any,
  alerts: any[]
): Array<{
  type: 'cost_reduction' | 'efficiency' | 'provider_optimization' | 'usage_pattern';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings?: number;
}> {
  const recommendations = [];

  // High cost provider recommendation
  const highestCostProvider = Object.entries(todayAnalytics.providerBreakdown)
    .sort(([,a], [,b]) => (b as any).cost - (a as any).cost)[0];
  
  if (highestCostProvider && (highestCostProvider[1] as any).cost > todayAnalytics.totalCost * 0.6) {
    recommendations.push({
      type: 'provider_optimization' as const,
      priority: 'high' as const,
      title: 'High-cost provider dominance',
      description: `${highestCostProvider[0]} accounts for ${((highestCostProvider[1] as any).cost / todayAnalytics.totalCost * 100).toFixed(1)}% of today's costs. Consider using lower-cost alternatives for non-critical requests.`,
      potentialSavings: (highestCostProvider[1] as any).cost * 0.3,
    });
  }

  // Low success rate recommendation
  if (todayAnalytics.totalRequests > 0) {
    const successRate = todayAnalytics.successfulRequests / todayAnalytics.totalRequests;
    if (successRate < 0.95) {
      recommendations.push({
        type: 'efficiency' as const,
        priority: 'high' as const,
        title: 'Low success rate detected',
        description: `Current success rate is ${(successRate * 100).toFixed(1)}%. Failed requests still incur costs. Review error patterns and implement better retry logic.`,
        potentialSavings: todayAnalytics.totalCost * (1 - successRate),
      });
    }
  }

  // Cost trend recommendation
  const recentDays = todayAnalytics.dailyUsage.slice(-7);
  const earlierDays = todayAnalytics.dailyUsage.slice(-14, -7);
  
  if (recentDays.length > 0 && earlierDays.length > 0) {
    const recentAvg = recentDays.reduce((sum: number, day: any) => sum + day.cost, 0) / recentDays.length;
    const earlierAvg = earlierDays.reduce((sum: number, day: any) => sum + day.cost, 0) / earlierDays.length;
    
    if (recentAvg > earlierAvg * 1.5) {
      recommendations.push({
        type: 'usage_pattern' as const,
        priority: 'medium' as const,
        title: 'Increasing cost trend',
        description: `Daily costs have increased by ${((recentAvg - earlierAvg) / earlierAvg * 100).toFixed(1)}% over the past week. Monitor usage patterns and consider implementing cost controls.`,
      });
    }
  }

  // Token efficiency recommendation
  if (todayAnalytics.totalTokens > 0) {
    const costPerToken = todayAnalytics.totalCost / todayAnalytics.totalTokens;
    if (costPerToken > 0.001) { // Arbitrary threshold
      recommendations.push({
        type: 'efficiency' as const,
        priority: 'medium' as const,
        title: 'High cost per token',
        description: `Current cost per token is $${costPerToken.toFixed(6)}. Consider using more efficient models or optimizing prompt lengths.`,
      });
    }
  }

  // Alert-based recommendations
  for (const alert of alerts) {
    if (alert.severity === 'critical') {
      recommendations.push({
        type: 'cost_reduction' as const,
        priority: 'high' as const,
        title: 'Budget limit exceeded',
        description: alert.message + '. Immediate action required to control costs.',
      });
    }
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}