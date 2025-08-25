/**
 * AI Budget Alerts API
 * GET /api/ai/monitoring/alerts - Get current budget alerts
 * POST /api/ai/monitoring/alerts - Configure alert thresholds
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
    
    // Parse provider limits
    const providerLimitsParam = searchParams.get('providerLimits');
    let providerLimits: Record<string, number> | undefined;
    
    if (providerLimitsParam) {
      try {
        providerLimits = JSON.parse(providerLimitsParam);
      } catch {
        // Try parsing as comma-separated format: provider1:limit1,provider2:limit2
        providerLimits = {};
        const pairs = providerLimitsParam.split(',');
        for (const pair of pairs) {
          const [provider, limit] = pair.split(':');
          if (provider && limit) {
            providerLimits[provider] = parseFloat(limit);
          }
        }
      }
    }

    // Get alerts
    const alerts = await aiRequestService.getCostAlerts({
      userId,
      dailyLimit,
      monthlyLimit,
      providerLimits,
    });

    // Categorize alerts by severity
    const categorizedAlerts = {
      critical: alerts.filter(alert => alert.severity === 'critical'),
      warning: alerts.filter(alert => alert.severity === 'warning'),
    };

    // Get current spending for context
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

    // Calculate alert status summary
    const alertSummary = {
      totalAlerts: alerts.length,
      criticalAlerts: categorizedAlerts.critical.length,
      warningAlerts: categorizedAlerts.warning.length,
      hasActiveBudgetViolations: categorizedAlerts.critical.some(alert => 
        alert.type === 'daily_limit' || alert.type === 'monthly_limit'
      ),
      currentSpending: {
        today: todayAnalytics.totalCost,
        month: monthAnalytics.totalCost,
      },
      thresholds: {
        daily: dailyLimit,
        monthly: monthlyLimit,
        providers: providerLimits,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        alerts: categorizedAlerts,
        summary: alertSummary,
        recommendations: generateAlertRecommendations(alerts, alertSummary),
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching budget alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch budget alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate alert configuration
    const config = {
      userId: body.userId,
      dailyLimit: body.dailyLimit ? parseFloat(body.dailyLimit) : undefined,
      monthlyLimit: body.monthlyLimit ? parseFloat(body.monthlyLimit) : undefined,
      providerLimits: body.providerLimits || {},
      alertThresholds: {
        warningPercentage: body.warningPercentage || 80,
        criticalPercentage: body.criticalPercentage || 100,
      },
      notificationSettings: {
        email: body.enableEmailAlerts || false,
        webhook: body.webhookUrl || null,
        slackChannel: body.slackChannel || null,
      },
    };

    // Validate limits
    if (config.dailyLimit && config.dailyLimit <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Daily limit must be greater than 0',
        },
        { status: 400 }
      );
    }

    if (config.monthlyLimit && config.monthlyLimit <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Monthly limit must be greater than 0',
        },
        { status: 400 }
      );
    }

    if (config.monthlyLimit && config.dailyLimit && config.monthlyLimit < config.dailyLimit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Monthly limit cannot be less than daily limit',
        },
        { status: 400 }
      );
    }

    // Validate provider limits
    for (const [provider, limit] of Object.entries(config.providerLimits)) {
      if (typeof limit !== 'number' || limit <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid limit for provider ${provider}. Must be a positive number.`,
          },
          { status: 400 }
        );
      }
    }

    // In a real implementation, you would save this configuration to the database
    // For now, we'll just return the configuration and test the alerts
    const testAlerts = await aiRequestService.getCostAlerts({
      userId: config.userId,
      dailyLimit: config.dailyLimit,
      monthlyLimit: config.monthlyLimit,
      providerLimits: config.providerLimits,
    });

    return NextResponse.json({
      success: true,
      data: {
        configuration: config,
        testAlerts,
        message: 'Alert configuration updated successfully',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error configuring budget alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to configure budget alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateAlertRecommendations(alerts: any[], summary: any): Array<{
  priority: 'high' | 'medium' | 'low';
  action: string;
  description: string;
}> {
  const recommendations = [];

  // Critical budget violations
  if (summary.hasActiveBudgetViolations) {
    recommendations.push({
      priority: 'high' as const,
      action: 'Immediate cost control required',
      description: 'Budget limits have been exceeded. Consider disabling non-essential providers or implementing request quotas.',
    });
  }

  // High number of warnings
  if (summary.warningAlerts >= 3) {
    recommendations.push({
      priority: 'medium' as const,
      action: 'Review spending patterns',
      description: 'Multiple warning alerts detected. Analyze usage patterns and consider adjusting budgets or optimizing costs.',
    });
  }

  // Unusual spike alerts
  const spikeAlerts = alerts.filter(alert => alert.type === 'unusual_spike');
  if (spikeAlerts.length > 0) {
    recommendations.push({
      priority: 'medium' as const,
      action: 'Investigate usage spike',
      description: 'Unusual spending patterns detected. Review recent activity and ensure no unauthorized usage.',
    });
  }

  // Provider-specific issues
  const providerAlerts = alerts.filter(alert => alert.type === 'provider_limit');
  if (providerAlerts.length > 0) {
    recommendations.push({
      priority: 'medium' as const,
      action: 'Optimize provider usage',
      description: `${providerAlerts.length} provider(s) approaching limits. Consider load balancing or switching to more cost-effective alternatives.`,
    });
  }

  // No alerts - suggest proactive monitoring
  if (alerts.length === 0) {
    recommendations.push({
      priority: 'low' as const,
      action: 'Set up proactive monitoring',
      description: 'No current alerts. Consider setting up budget limits and monitoring thresholds for better cost control.',
    });
  }

  return recommendations;
}