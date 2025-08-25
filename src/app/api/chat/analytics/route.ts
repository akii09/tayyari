import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { aiRequestService } from '@/lib/ai/services/AIRequestService';

/**
 * Get chat analytics for user
 * 
 * GET /api/chat/analytics?days=30&conceptId=uuid&provider=openai
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    const days = parseInt(searchParams.get('days') || '30', 10);
    const conceptId = searchParams.get('conceptId') || undefined;
    const provider = searchParams.get('provider') || undefined;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get comprehensive analytics
    const analytics = await aiRequestService.getRequestAnalytics({
      userId: user.id,
      startDate,
      provider: provider as any,
    });
    
    // Get user usage stats
    const usageStats = await aiRequestService.getUserUsageStats(user.id, days);
    
    // Get cost alerts
    const costAlerts = await aiRequestService.getCostAlerts({
      userId: user.id,
      dailyLimit: 10, // $10 daily limit
      monthlyLimit: 100, // $100 monthly limit
      providerLimits: {
        openai: 5,
        claude: 5,
        gemini: 3,
      },
    });
    
    return NextResponse.json({
      success: true,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      analytics: {
        totalRequests: analytics.totalRequests,
        successfulRequests: analytics.successfulRequests,
        failedRequests: analytics.failedRequests,
        totalCost: analytics.totalCost,
        totalTokens: analytics.totalTokens,
        averageResponseTime: analytics.averageResponseTime,
        providerBreakdown: analytics.providerBreakdown,
        modelBreakdown: analytics.modelBreakdown,
        dailyUsage: analytics.dailyUsage,
      },
      usageStats: {
        totalRequests: usageStats.totalRequests,
        totalCost: usageStats.totalCost,
        totalTokens: usageStats.totalTokens,
        averageRequestsPerDay: usageStats.averageRequestsPerDay,
        averageCostPerDay: usageStats.averageCostPerDay,
        favoriteProvider: usageStats.favoriteProvider,
        favoriteModel: usageStats.favoriteModel,
      },
      costAlerts,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.error('Get chat analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat analytics' },
      { status: 500 }
    );
  }
}