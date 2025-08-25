/**
 * AI Usage Monitoring API
 * GET /api/ai/monitoring/usage - Get detailed usage statistics and patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiRequestService } from '@/lib/ai/services/AIRequestService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const userId = searchParams.get('userId') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const days = parseInt(searchParams.get('days') || '30');
    const granularity = searchParams.get('granularity') || 'daily'; // daily, hourly
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get comprehensive analytics
    const analytics = await aiRequestService.getRequestAnalytics({
      userId,
      provider: provider as any,
      startDate,
      endDate,
    });

    // Get user-specific usage stats if userId provided
    let userStats = null;
    if (userId) {
      userStats = await aiRequestService.getUserUsageStats(userId, days);
    }

    // Get recent request logs for pattern analysis
    const recentLogs = await aiRequestService.getRequestLogs({
      userId,
      provider: provider as any,
      startDate,
      endDate,
      limit: 1000,
    });

    // Analyze usage patterns
    const patterns = analyzeUsagePatterns(recentLogs);
    
    // Calculate performance metrics
    const performance = calculatePerformanceMetrics(analytics, recentLogs);
    
    // Generate usage insights
    const insights = generateUsageInsights(analytics, patterns, performance);

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        userStats,
        patterns,
        performance,
        insights,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
          granularity,
        },
        summary: {
          totalRequests: analytics.totalRequests,
          successRate: analytics.totalRequests > 0 
            ? (analytics.successfulRequests / analytics.totalRequests * 100).toFixed(2) + '%'
            : '0%',
          totalCost: analytics.totalCost,
          averageResponseTime: analytics.averageResponseTime,
          mostUsedProvider: Object.entries(analytics.providerBreakdown)
            .sort(([,a], [,b]) => b.requests - a.requests)[0]?.[0] || 'none',
          mostUsedModel: Object.entries(analytics.modelBreakdown)
            .sort(([,a], [,b]) => b.requests - a.requests)[0]?.[0] || 'none',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching usage monitoring data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch usage monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function analyzeUsagePatterns(logs: any[]): {
  hourlyDistribution: Array<{ hour: number; requests: number; cost: number }>;
  dayOfWeekDistribution: Array<{ day: string; requests: number; cost: number }>;
  errorPatterns: Array<{ error: string; count: number; percentage: number }>;
  modelUsagePatterns: Array<{ model: string; requests: number; avgResponseTime: number; successRate: number }>;
} {
  // Hourly distribution
  const hourlyMap = new Map<number, { requests: number; cost: number }>();
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, { requests: 0, cost: 0 });
  }

  // Day of week distribution
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekMap = new Map<string, { requests: number; cost: number }>();
  dayNames.forEach(day => dayOfWeekMap.set(day, { requests: 0, cost: 0 }));

  // Error patterns
  const errorMap = new Map<string, number>();
  
  // Model usage patterns
  const modelMap = new Map<string, { requests: number; totalResponseTime: number; successes: number }>();

  // Process logs
  for (const log of logs) {
    const date = new Date(log.createdAt!);
    const hour = date.getHours();
    const dayOfWeek = dayNames[date.getDay()];
    const cost = log.cost || 0;

    // Update hourly distribution
    const hourlyData = hourlyMap.get(hour)!;
    hourlyData.requests++;
    hourlyData.cost += cost;

    // Update day of week distribution
    const dayData = dayOfWeekMap.get(dayOfWeek)!;
    dayData.requests++;
    dayData.cost += cost;

    // Update error patterns
    if (!log.success && log.errorMessage) {
      const errorKey = log.errorMessage.substring(0, 100); // Truncate long errors
      errorMap.set(errorKey, (errorMap.get(errorKey) || 0) + 1);
    }

    // Update model usage patterns
    if (!modelMap.has(log.model)) {
      modelMap.set(log.model, { requests: 0, totalResponseTime: 0, successes: 0 });
    }
    const modelData = modelMap.get(log.model)!;
    modelData.requests++;
    modelData.totalResponseTime += log.responseTime || 0;
    if (log.success) modelData.successes++;
  }

  // Convert to arrays and calculate percentages
  const totalRequests = logs.length;
  const totalErrors = logs.filter(log => !log.success).length;

  return {
    hourlyDistribution: Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour - b.hour),
    
    dayOfWeekDistribution: Array.from(dayOfWeekMap.entries())
      .map(([day, data]) => ({ day, ...data }))
      .sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day)),
    
    errorPatterns: Array.from(errorMap.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10), // Top 10 errors
    
    modelUsagePatterns: Array.from(modelMap.entries())
      .map(([model, data]) => ({
        model,
        requests: data.requests,
        avgResponseTime: data.requests > 0 ? data.totalResponseTime / data.requests : 0,
        successRate: data.requests > 0 ? (data.successes / data.requests) * 100 : 0,
      }))
      .sort((a, b) => b.requests - a.requests),
  };
}

function calculatePerformanceMetrics(analytics: any, logs: any[]): {
  responseTimePercentiles: { p50: number; p90: number; p95: number; p99: number };
  throughput: { requestsPerHour: number; requestsPerMinute: number };
  reliability: { uptime: number; errorRate: number; timeoutRate: number };
  efficiency: { costPerRequest: number; costPerToken: number; tokensPerRequest: number };
} {
  // Calculate response time percentiles
  const responseTimes = logs
    .filter(log => log.responseTime && log.responseTime > 0)
    .map(log => log.responseTime)
    .sort((a, b) => a - b);

  const getPercentile = (arr: number[], percentile: number): number => {
    if (arr.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * arr.length) - 1;
    return arr[Math.max(0, Math.min(index, arr.length - 1))];
  };

  const responseTimePercentiles = {
    p50: getPercentile(responseTimes, 50),
    p90: getPercentile(responseTimes, 90),
    p95: getPercentile(responseTimes, 95),
    p99: getPercentile(responseTimes, 99),
  };

  // Calculate throughput
  const timeSpanHours = logs.length > 0 
    ? (new Date(logs[0].createdAt!).getTime() - new Date(logs[logs.length - 1].createdAt!).getTime()) / (1000 * 60 * 60)
    : 1;
  
  const throughput = {
    requestsPerHour: timeSpanHours > 0 ? logs.length / timeSpanHours : 0,
    requestsPerMinute: timeSpanHours > 0 ? logs.length / (timeSpanHours * 60) : 0,
  };

  // Calculate reliability metrics
  const totalRequests = logs.length;
  const failedRequests = logs.filter(log => !log.success).length;
  const timeoutRequests = logs.filter(log => 
    !log.success && log.errorMessage?.toLowerCase().includes('timeout')
  ).length;

  const reliability = {
    uptime: totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests) * 100 : 100,
    errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
    timeoutRate: totalRequests > 0 ? (timeoutRequests / totalRequests) * 100 : 0,
  };

  // Calculate efficiency metrics
  const efficiency = {
    costPerRequest: analytics.totalRequests > 0 ? analytics.totalCost / analytics.totalRequests : 0,
    costPerToken: analytics.totalTokens > 0 ? analytics.totalCost / analytics.totalTokens : 0,
    tokensPerRequest: analytics.totalRequests > 0 ? analytics.totalTokens / analytics.totalRequests : 0,
  };

  return {
    responseTimePercentiles,
    throughput,
    reliability,
    efficiency,
  };
}

function generateUsageInsights(analytics: any, patterns: any, performance: any): Array<{
  type: 'performance' | 'cost' | 'usage' | 'reliability';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
}> {
  const insights = [];

  // Performance insights
  if (performance.responseTimePercentiles.p95 > 30000) { // 30 seconds
    insights.push({
      type: 'performance' as const,
      severity: 'warning' as const,
      title: 'High response times detected',
      description: `95th percentile response time is ${(performance.responseTimePercentiles.p95 / 1000).toFixed(1)} seconds`,
      recommendation: 'Consider using faster models or implementing request timeouts',
    });
  }

  // Reliability insights
  if (performance.reliability.errorRate > 5) {
    insights.push({
      type: 'reliability' as const,
      severity: performance.reliability.errorRate > 15 ? 'critical' as const : 'warning' as const,
      title: 'High error rate detected',
      description: `Current error rate is ${performance.reliability.errorRate.toFixed(1)}%`,
      recommendation: 'Review error patterns and implement better error handling',
    });
  }

  // Usage pattern insights
  const peakHour = patterns.hourlyDistribution.reduce((max, current) => 
    current.requests > max.requests ? current : max
  );
  
  if (peakHour.requests > analytics.totalRequests * 0.3) {
    insights.push({
      type: 'usage' as const,
      severity: 'info' as const,
      title: 'Peak usage hour identified',
      description: `${peakHour.requests} requests (${((peakHour.requests / analytics.totalRequests) * 100).toFixed(1)}%) occur at ${peakHour.hour}:00`,
      recommendation: 'Consider load balancing or scaling during peak hours',
    });
  }

  // Cost efficiency insights
  if (performance.efficiency.costPerRequest > 0.1) { // $0.10 per request
    insights.push({
      type: 'cost' as const,
      severity: 'warning' as const,
      title: 'High cost per request',
      description: `Average cost per request is $${performance.efficiency.costPerRequest.toFixed(4)}`,
      recommendation: 'Consider using more cost-effective models for routine tasks',
    });
  }

  // Model performance insights
  const inefficientModels = patterns.modelUsagePatterns.filter(model => 
    model.successRate < 95 && model.requests > 10
  );
  
  if (inefficientModels.length > 0) {
    insights.push({
      type: 'reliability' as const,
      severity: 'warning' as const,
      title: 'Underperforming models detected',
      description: `${inefficientModels.length} models have success rates below 95%`,
      recommendation: 'Review model configurations and consider alternatives',
    });
  }

  return insights.slice(0, 8); // Limit to top 8 insights
}